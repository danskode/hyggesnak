import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../config/auth.js';
import db from '../database/db.js';

// Helper function to emit invitation events to specific user
export function emitToUser(io, userId, eventName, data) {
    // Find all sockets for this user and emit the event
    const sockets = io.sockets.sockets;
    for (const [socketId, socket] of sockets) {
        if (socket.userId === userId) {
            socket.emit(eventName, data);
        }
    }
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
            const user = await new Promise((resolve, reject) => {
                db.get(
                    'SELECT id, username, role FROM users WHERE id = ?',
                    [decoded.id],
                    (err, row) => {
                        if (err) reject(err);
                        else resolve(row);
                    }
                );
            });

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

        // Join hyggesnak room
        socket.on('join-hyggesnak', async (hyggesnakId) => {
            try {
                // Validate input
                const parsedId = parseInt(hyggesnakId, 10);
                if (isNaN(parsedId) || parsedId <= 0) {
                    socket.emit('error', { message: 'Ugyldigt hyggesnak ID' });
                    return;
                }

                // Verify user is member of this hyggesnak
                const membership = await new Promise((resolve, reject) => {
                    db.get(
                        `SELECT * FROM hyggesnak_memberships
                         WHERE user_id = ? AND hyggesnak_id = ?`,
                        [socket.userId, parsedId],
                        (err, row) => {
                            if (err) reject(err);
                            else resolve(row);
                        }
                    );
                });

                if (!membership) {
                    socket.emit('error', { message: 'Du har ikke adgang til denne hyggesnak' });
                    return;
                }

                // Join the room
                socket.join(`hyggesnak-${parsedId}`);
                socket.currentHyggesnakId = parsedId;
                console.log(`User ${socket.userId} joined hyggesnak-${parsedId}`);

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
        socket.on('typing', async ({ hyggesnakId }) => {
            try {
                const parsedId = parseInt(hyggesnakId, 10);
                if (isNaN(parsedId) || parsedId <= 0) {
                    return;
                }

                // Verify membership before broadcasting
                const membership = await new Promise((resolve, reject) => {
                    db.get(
                        `SELECT * FROM hyggesnak_memberships
                         WHERE user_id = ? AND hyggesnak_id = ?`,
                        [socket.userId, parsedId],
                        (err, row) => {
                            if (err) reject(err);
                            else resolve(row);
                        }
                    );
                });

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
        socket.on('stop-typing', async ({ hyggesnakId }) => {
            try {
                const parsedId = parseInt(hyggesnakId, 10);
                if (isNaN(parsedId) || parsedId <= 0) {
                    return;
                }

                // Verify membership before broadcasting
                const membership = await new Promise((resolve, reject) => {
                    db.get(
                        `SELECT * FROM hyggesnak_memberships
                         WHERE user_id = ? AND hyggesnak_id = ?`,
                        [socket.userId, parsedId],
                        (err, row) => {
                            if (err) reject(err);
                            else resolve(row);
                        }
                    );
                });

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

        // Handle disconnect
        socket.on('disconnect', (reason) => {

            // Clean up all rooms for this socket
            if (socket.currentHyggesnakId) {
                socket.leave(`hyggesnak-${socket.currentHyggesnakId}`);
            }

            // Force leave all rooms (safety measure)
            socket.rooms.forEach(room => {
                if (room !== socket.id) {
                    socket.leave(room);
                }
            });
        });
    });
}
