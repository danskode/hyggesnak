import { Router } from 'express';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { hyggesnakContextMiddleware } from '../middleware/hyggesnakContextMiddleware.js';
import db from '../database/db.js';
import { sanitizeString } from '../utils/validators.js';

const router = Router();

//==== GET /api/hyggesnakke/:hyggesnakId/messages - Get messages for hyggesnak ====//

router.get('/hyggesnakke/:hyggesnakId/messages', authenticateToken, hyggesnakContextMiddleware, (req, res) => {
    const { limit = 50, before_id, after_id } = req.query;
    const hyggesnakId = req.params.hyggesnakId;

    // Validate limit
    const maxLimit = 100;
    const parsedLimit = Math.min(parseInt(limit) || 50, maxLimit);

    let query = `
        SELECT
            m.id,
            m.content,
            m.created_at,
            m.edited_at,
            m.is_deleted,
            m.user_id,
            u.username,
            u.display_name
        FROM messages m
        INNER JOIN users u ON m.user_id = u.id
        WHERE m.hyggesnak_id = ?
    `;

    const params = [hyggesnakId];

    // Cursor pagination
    if (before_id) {
        query += ` AND m.id < ?`;
        params.push(parseInt(before_id));
    } else if (after_id) {
        query += ` AND m.id > ?`;
        params.push(parseInt(after_id));
    }

    query += ` ORDER BY m.created_at DESC, m.id DESC LIMIT ?`;
    params.push(parsedLimit + 1); // Fetch one extra to check if there's more

    db.all(query, params, (err, messages) => {
        if (err) {
            console.error('Database error fetching messages:', err);
            return res.status(500).send({ message: "Serverfejl ved hentning af beskeder" });
        }

        // Check if there are more messages
        const hasMore = messages.length > parsedLimit;
        if (hasMore) {
            messages.pop(); // Remove the extra message
        }

        // If fetching after_id, reverse to get chronological order
        if (after_id) {
            messages.reverse();
        }

        res.send({
            data: messages,
            hasMore: hasMore
        });
    });
});

//==== POST /api/hyggesnakke/:hyggesnakId/messages - Send new message ====//

router.post('/hyggesnakke/:hyggesnakId/messages', authenticateToken, hyggesnakContextMiddleware, (req, res) => {
    let { content } = req.body;

    // Validate content first (before sanitization to check real length)
    if (!content || content.trim().length === 0) {
        return res.status(400).send({
            message: "Beskeden må ikke være tom"
        });
    }

    if (content.length > 2000) {
        return res.status(400).send({
            message: "Beskeden må højst være 2000 tegn"
        });
    }

    // Sanitize content to prevent XSS (removes < > and control characters)
    content = sanitizeString(content.trim());

    const hyggesnakId = req.params.hyggesnakId;
    const userId = req.user.id;

    const query = `
        INSERT INTO messages (hyggesnak_id, user_id, content)
        VALUES (?, ?, ?)
    `;

    db.run(query, [hyggesnakId, userId, content.trim()], function(err) {
        if (err) {
            console.error('Database error creating message:', err);
            return res.status(500).send({ message: "Serverfejl ved oprettelse af besked" });
        }

        const messageId = this.lastID;

        // Fetch the created message with user info
        const fetchQuery = `
            SELECT
                m.id,
                m.content,
                m.created_at,
                m.edited_at,
                m.is_deleted,
                m.user_id,
                u.username,
                u.display_name
            FROM messages m
            INNER JOIN users u ON m.user_id = u.id
            WHERE m.id = ?
        `;

        db.get(fetchQuery, [messageId], (err, message) => {
            if (err) {
                console.error('Error fetching created message:', err);
                return res.status(500).send({ message: "Serverfejl" });
            }

            // Respond to HTTP request FIRST (ensures client gets confirmation)
            res.status(201).send({ data: message });

            // Then broadcast asynchronously (don't wait for completion)
            setImmediate(() => {
                try {
                    const io = req.app.get('io');
                    if (io) {
                        io.to(`hyggesnak-${hyggesnakId}`).emit('new-message', message);
                    }
                } catch (broadcastErr) {
                    // Log but don't fail - message is saved and client was notified
                    console.error('Socket.IO broadcast error:', broadcastErr);
                }
            });
        });
    });
});

//==== PUT /api/messages/:messageId - Edit own message ====//

router.put('/messages/:messageId', authenticateToken, (req, res) => {
    let { content } = req.body;
    const messageId = req.params.messageId;
    const userId = req.user.id;

    // Validate content first (before sanitization to check real length)
    if (!content || content.trim().length === 0) {
        return res.status(400).send({
            message: "Beskeden må ikke være tom"
        });
    }

    if (content.length > 2000) {
        return res.status(400).send({
            message: "Beskeden må højst være 2000 tegn"
        });
    }

    // Sanitize content to prevent XSS (removes < > and control characters)
    content = sanitizeString(content.trim());

    // First, check if message exists and belongs to user
    db.get(
        'SELECT id, user_id, hyggesnak_id FROM messages WHERE id = ? AND is_deleted = 0',
        [messageId],
        (err, message) => {
            if (err) {
                console.error('Database error:', err);
                return res.status(500).send({ message: "Serverfejl" });
            }

            if (!message) {
                return res.status(404).send({ message: "Besked ikke fundet" });
            }

            if (message.user_id !== userId) {
                return res.status(403).send({ message: "Du kan kun redigere dine egne beskeder" });
            }

            // Update the message
            const updateQuery = `
                UPDATE messages
                SET content = ?, edited_at = CURRENT_TIMESTAMP
                WHERE id = ?
            `;

            db.run(updateQuery, [content.trim(), messageId], function(err) {
                if (err) {
                    console.error('Database error updating message:', err);
                    return res.status(500).send({ message: "Serverfejl ved opdatering af besked" });
                }

                // Fetch updated message with user info
                const fetchQuery = `
                    SELECT
                        m.id,
                        m.content,
                        m.created_at,
                        m.edited_at,
                        m.is_deleted,
                        m.user_id,
                        u.username,
                        u.display_name
                    FROM messages m
                    INNER JOIN users u ON m.user_id = u.id
                    WHERE m.id = ?
                `;

                db.get(fetchQuery, [messageId], (err, updatedMessage) => {
                    if (err) {
                        console.error('Error fetching updated message:', err);
                        return res.status(500).send({ message: "Serverfejl" });
                    }

                    // Respond to HTTP request FIRST
                    res.send({ data: updatedMessage });

                    // Then broadcast asynchronously
                    setImmediate(() => {
                        try {
                            const io = req.app.get('io');
                            if (io) {
                                io.to(`hyggesnak-${message.hyggesnak_id}`).emit('message-edited', updatedMessage);
                            }
                        } catch (broadcastErr) {
                            console.error('Socket.IO broadcast error:', broadcastErr);
                        }
                    });
                });
            });
        }
    );
});

//==== DELETE /api/messages/:messageId - Delete own message (soft delete) ====//

router.delete('/messages/:messageId', authenticateToken, (req, res) => {
    const messageId = req.params.messageId;
    const userId = req.user.id;

    // First, check if message exists and belongs to user
    db.get(
        'SELECT id, user_id, hyggesnak_id FROM messages WHERE id = ? AND is_deleted = 0',
        [messageId],
        (err, message) => {
            if (err) {
                console.error('Database error:', err);
                return res.status(500).send({ message: "Serverfejl" });
            }

            if (!message) {
                return res.status(404).send({ message: "Besked ikke fundet" });
            }

            if (message.user_id !== userId) {
                return res.status(403).send({ message: "Du kan kun slette dine egne beskeder" });
            }

            // Soft delete the message
            db.run(
                'UPDATE messages SET is_deleted = 1 WHERE id = ?',
                [messageId],
                function(err) {
                    if (err) {
                        console.error('Database error deleting message:', err);
                        return res.status(500).send({ message: "Serverfejl ved sletning af besked" });
                    }

                    // Respond to HTTP request FIRST
                    res.send({ message: "Besked slettet" });

                    // Then broadcast asynchronously
                    setImmediate(() => {
                        try {
                            const io = req.app.get('io');
                            if (io) {
                                console.log(`Broadcasting message-deleted event: messageId=${messageId} to room hyggesnak-${message.hyggesnak_id}`);
                                io.to(`hyggesnak-${message.hyggesnak_id}`).emit('message-deleted', parseInt(messageId, 10));
                                console.log('message-deleted event emitted successfully');
                            } else {
                                console.error('Socket.IO instance not found on app');
                            }
                        } catch (broadcastErr) {
                            console.error('Socket.IO broadcast error:', broadcastErr);
                        }
                    });
                }
            );
        }
    );
});

export default router;
