import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../config/auth.js';
import { dbGet } from '../database/queryHelpers.js';
import { validateHyggesnakId, validateTypingEvent } from './socketValidators.js';
import { socketRateLimiter } from './socketRateLimiter.js';

// Helper function to emit invitation events to specific user
export function emitToUser(io, userId, eventName, data) {
    const sockets = io.sockets.sockets;
    for (const [socketId, socket] of sockets) {
        if (socket.userId === userId) {
            socket.emit(eventName, data);
        }
    }
}

function getOnlineUsers(io) {
    const onlineUserIds = new Set();
    const sockets = io.sockets.sockets;
    for (const [socketId, socket] of sockets) {
        if (socket.userId && socket.userRole !== 'SUPER_ADMIN') {
            onlineUserIds.add(socket.userId);
        }
    }
    return Array.from(onlineUserIds);
}

export function setupSocketHandlers(io) {
    // Authentication middleware for Socket.IO
    io.use(async (socket, next) => {
        const token = socket.handshake.auth.token;

        if (!token) {
            return next(new Error('Authentication error: No token provided'));
        }

        try {
            const decoded = jwt.verify(token, JWT_SECRET);

            // Verify user still exists and get fresh role data
            const user = await dbGet(
                'SELECT id, username, role FROM users WHERE id = ?',
                [decoded.id]
            );

            if (!user) {
                return next(new Error('Authentication error: User not found'));
            }

            socket.userId = user.id;
            socket.userRole = user.role;
            socket.username = user.username;
            next();
        } catch (err) {
            if (err.name === 'TokenExpiredError') {
                return next(new Error('Authentication error: Token expired'));
            }
            return next(new Error('Authentication error: Invalid token'));
        }
    });

    io.on('connection', (socket) => {
        if (socket.userRole !== 'SUPER_ADMIN') {
            socket.emit('users:online', getOnlineUsers(io));
            socket.broadcast.emit('user:online', { userId: socket.userId });
        }

        socket.on('join-hyggesnak', async (hyggesnakId) => {
            // Check rate limit first
            const rateLimitCheck = socketRateLimiter.check(socket.id, 'join-hyggesnak');
            if (!rateLimitCheck.allowed) {
                socket.emit('error', { message: rateLimitCheck.message });
                return;
            }

            try {
                // Validate input
                const validation = validateHyggesnakId(hyggesnakId);
                if (!validation.valid) {
                    socket.emit('error', { message: validation.error });
                    return;
                }
                const parsedId = validation.value;

                // Verify user is member of this hyggesnak
                const membership = await dbGet(
                    `SELECT * FROM hyggesnak_memberships
                     WHERE user_id = ? AND hyggesnak_id = ?`,
                    [socket.userId, parsedId]
                );

                if (!membership) {
                    socket.emit('error', { message: 'Du har ikke adgang til denne hyggesnak' });
                    return;
                }

                // Join the room
                socket.join(`hyggesnak-${parsedId}`);
                socket.currentHyggesnakId = parsedId;
            } catch (err) {
                console.error('Error joining hyggesnak:', err);
                socket.emit('error', { message: 'Kunne ikke tilslutte til hyggesnak' });
            }
        });

        // Leave hyggesnak room
        socket.on('leave-hyggesnak', (hyggesnakId) => {
            const parsedId = parseInt(hyggesnakId, 10);
            if (!isNaN(parsedId) && parsedId > 0) {
                socket.leave(`hyggesnak-${parsedId}`);
            }
        });

        // Handle typing indicator
        socket.on('typing', async (payload) => {
            // Check rate limit
            const rateLimitCheck = socketRateLimiter.check(socket.id, 'typing');
            if (!rateLimitCheck.allowed) {
                return; // Silently ignore rate-limited typing events
            }

            try {
                // Validate payload
                const validation = validateTypingEvent(payload);
                if (!validation.valid) {
                    return; // Silently ignore invalid typing events
                }
                const parsedId = validation.value;

                // Verify membership before broadcasting
                const membership = await dbGet(
                    `SELECT * FROM hyggesnak_memberships
                     WHERE user_id = ? AND hyggesnak_id = ?`,
                    [socket.userId, parsedId]
                );

                if (membership) {
                    // Broadcast to others in the room
                    socket.to(`hyggesnak-${parsedId}`).emit('user-typing', {
                        userId: socket.userId,
                        username: socket.username
                    });
                }
            } catch (err) {
                console.error('Error handling typing event:', err);
            }
        });

        // Handle stop typing
        socket.on('stop-typing', async (payload) => {
            // Check rate limit
            const rateLimitCheck = socketRateLimiter.check(socket.id, 'stop-typing');
            if (!rateLimitCheck.allowed) {
                return; // Silently ignore rate-limited events
            }

            try {
                // Validate payload
                const validation = validateTypingEvent(payload);
                if (!validation.valid) {
                    return; // Silently ignore invalid events
                }
                const parsedId = validation.value;

                // Verify membership before broadcasting
                const membership = await dbGet(
                    `SELECT * FROM hyggesnak_memberships
                     WHERE user_id = ? AND hyggesnak_id = ?`,
                    [socket.userId, parsedId]
                );

                if (membership) {
                    // Broadcast to others in the room
                    socket.to(`hyggesnak-${parsedId}`).emit('user-stopped-typing', {
                        userId: socket.userId,
                        username: socket.username
                    });
                }
            } catch (err) {
                console.error('Error handling stop-typing event:', err);
            }
        });

        socket.on('disconnect', (reason) => {
            // Cleanup rate limiter data
            socketRateLimiter.remove(socket.id);

            if (socket.currentHyggesnakId) {
                socket.leave(`hyggesnak-${socket.currentHyggesnakId}`);
            }

            socket.rooms.forEach(room => {
                if (room !== socket.id) {
                    socket.leave(room);
                }
            });

            if (socket.userRole !== 'SUPER_ADMIN') {
                const stillOnline = Array.from(io.sockets.sockets.values()).some(
                    s => s.userId === socket.userId && s.id !== socket.id
                );

                if (!stillOnline) {
                    socket.broadcast.emit('user:offline', { userId: socket.userId });
                }
            }
        });
    });
}
