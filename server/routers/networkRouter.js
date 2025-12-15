import { Router } from 'express';
import { authenticateToken } from '../middleware/authMiddleware.js';
import {
    networkCodeGenerateLimiter,
    networkConnectLimiter,
    invitationResponseLimiter
} from '../middleware/rateLimitersMiddleware.js';
import * as networkService from '../services/networkService.js';
import { emitToUser } from '../socket/socketHandlers.js';

const router = Router();

// All network routes require authentication
router.use(authenticateToken);

// ============================================
// Network Invite Code Endpoints
// ============================================

// POST /api/network/generate-code - Generate a new 6-digit network invite code
router.post('/generate-code', networkCodeGenerateLimiter, async (req, res, next) => {
    try {
        const result = await networkService.generateNetworkCode(req.user.id);

        res.status(201).send({
            message: 'Netværkskode oprettet',
            data: {
                code: result.code,
                expiresAt: result.expiresAt,
                shareText: `Min netværkskode er: ${result.code}`
            }
        });
    } catch (error) {
        error.status = 500;
        error.message = error.message || 'Kunne ikke generere netværkskode';
        next(error);
    }
});

// GET /api/network/my-code
router.get('/my-code', async (req, res, next) => {
    try {
        const code = await networkService.getUserActiveCode(req.user.id);

        // Return null if no code exists (not an error condition)
        if (!code) {
            return res.send({ data: null });
        }

        res.send({
            data: {
                code: code.code,
                createdAt: code.created_at,
                expiresAt: code.expires_at
            }
        });
    } catch (error) {
        error.status = 500;
        error.message = 'Kunne ikke hente netværkskode';
        next(error);
    }
});

// DELETE /api/network/my-code
router.delete('/my-code', async (req, res, next) => {
    try {
        await networkService.revokeUserCodes(req.user.id);

        res.send({
            message: 'Netværkskode deaktiveret'
        });
    } catch (error) {
        error.status = 500;
        error.message = 'Kunne ikke deaktivere netværkskode';
        next(error);
    }
});

// ============================================
// Network Connection Endpoints
// ============================================

// POST /api/network/connect
router.post('/connect', networkConnectLimiter, async (req, res, next) => {
    try {
        const { code } = req.body;

        if (!code || typeof code !== 'string') {
            const error = new Error('Netværkskode er påkrævet');
            error.status = 400;
            return next(error);
        }

        const trimmedCode = code.trim();

        const result = await networkService.createNetworkInvitation(req.user.id, trimmedCode);

        // Emit socket event to recipient
        const io = req.app.get('io');
        if (io) {
            emitToUser(io, result.toUser.id, 'network:invitation:received', {
                id: result.invitationId,
                fromUser: {
                    id: req.user.id,
                    username: req.user.username,
                    displayName: req.user.display_name
                }
            });
        }

        res.status(201).send({
            message: `Netværksanmodning sendt til ${result.toUser.display_name || result.toUser.username}`,
            data: {
                invitationId: result.invitationId,
                toUser: {
                    id: result.toUser.id,
                    username: result.toUser.username,
                    displayName: result.toUser.display_name
                }
            }
        });
    } catch (error) {
        error.status = error.status || 400;
        next(error);
    }
});

// GET /api/network/connections
router.get('/connections', async (req, res, next) => {
    try {
        const connections = await networkService.getNetworkConnections(req.user.id);

        // Format response
        const formattedConnections = connections.map(conn => ({
            userId: conn.user_id,
            username: conn.username,
            displayName: conn.display_name,
            connectedAt: conn.connected_at
        }));

        res.send({
            data: formattedConnections
        });
    } catch (error) {
        error.status = 500;
        error.message = 'Kunne ikke hente netværksforbindelser';
        next(error);
    }
});

// DELETE /api/network/connections/:userId
router.delete('/connections/:userId', async (req, res, next) => {
    try {
        const targetUserId = parseInt(req.params.userId, 10);

        if (isNaN(targetUserId) || targetUserId <= 0) {
            const error = new Error('Ugyldigt bruger ID');
            error.status = 400;
            return next(error);
        }

        await networkService.removeNetworkConnection(req.user.id, targetUserId);

        const io = req.app.get('io');
        emitToUser(io, req.user.id, 'network:connection:removed', { removedUserId: targetUserId });
        emitToUser(io, targetUserId, 'network:connection:removed', { removedUserId: req.user.id });

        res.send({
            message: 'Netværksforbindelse fjernet'
        });
    } catch (error) {
        error.status = error.status || 500;
        error.message = error.message || 'Kunne ikke fjerne netværksforbindelse';
        next(error);
    }
});

// ============================================
// Network Invitation Endpoints
// ============================================

// GET /api/network/invitations/incoming
router.get('/invitations/incoming', async (req, res, next) => {
    try {
        const invitations = await networkService.getIncomingInvitations(req.user.id);

        // Format response
        const formattedInvitations = invitations.map(inv => ({
            id: inv.id,
            fromUser: {
                id: inv.from_user_id,
                username: inv.from_username,
                displayName: inv.from_display_name
            },
            createdAt: inv.created_at
        }));

        res.send({
            data: formattedInvitations
        });
    } catch (error) {
        error.status = 500;
        error.message = 'Kunne ikke hente netværksinvitationer';
        next(error);
    }
});

// GET /api/network/invitations/outgoing
router.get('/invitations/outgoing', async (req, res, next) => {
    try {
        const invitations = await networkService.getOutgoingInvitations(req.user.id);

        // Format response
        const formattedInvitations = invitations.map(inv => ({
            id: inv.id,
            toUser: {
                id: inv.to_user_id,
                username: inv.to_username,
                displayName: inv.to_display_name
            },
            createdAt: inv.created_at
        }));

        res.send({
            data: formattedInvitations
        });
    } catch (error) {
        error.status = 500;
        error.message = 'Kunne ikke hente udgående invitationer';
        next(error);
    }
});

// PUT /api/network/invitations/:id/accept
router.put('/invitations/:id/accept', invitationResponseLimiter, async (req, res, next) => {
    try {
        const invitationId = parseInt(req.params.id, 10);

        if (isNaN(invitationId) || invitationId <= 0) {
            const error = new Error('Ugyldigt invitation ID');
            error.status = 400;
            return next(error);
        }

        const result = await networkService.acceptNetworkInvitation(invitationId, req.user.id);

        // Emit socket events to both users
        const io = req.app.get('io');
        if (io) {
            // Notify the user who sent the invitation that it was accepted
            emitToUser(io, result.user.id, 'network:invitation:accepted', {
                invitationId,
                acceptedBy: {
                    id: req.user.id,
                    username: req.user.username,
                    displayName: req.user.display_name
                },
                connectionId: result.connectionId
            });

            // Notify the accepting user about the new connection
            emitToUser(io, req.user.id, 'network:connection:new', {
                user: {
                    id: result.user.id,
                    username: result.user.username,
                    displayName: result.user.display_name
                },
                connectionId: result.connectionId
            });

            // Also notify the other user about the new connection
            emitToUser(io, result.user.id, 'network:connection:new', {
                user: {
                    id: req.user.id,
                    username: req.user.username,
                    displayName: req.user.display_name
                },
                connectionId: result.connectionId
            });
        }

        res.send({
            message: `Du er nu forbundet med ${result.user.display_name || result.user.username}!`,
            data: {
                connectionId: result.connectionId,
                user: {
                    id: result.user.id,
                    username: result.user.username,
                    displayName: result.user.display_name
                }
            }
        });
    } catch (error) {
        error.status = error.status || 500;
        error.message = error.message || 'Kunne ikke acceptere invitation';
        next(error);
    }
});

// PUT /api/network/invitations/:id/reject
router.put('/invitations/:id/reject', invitationResponseLimiter, async (req, res, next) => {
    try {
        const invitationId = parseInt(req.params.id, 10);

        if (isNaN(invitationId) || invitationId <= 0) {
            const error = new Error('Ugyldigt invitation ID');
            error.status = 400;
            return next(error);
        }

        const result = await networkService.rejectNetworkInvitation(invitationId, req.user.id);

        // Emit socket event to the sender
        const io = req.app.get('io');
        if (io && result.fromUserId) {
            emitToUser(io, result.fromUserId, 'network:invitation:rejected', {
                invitationId,
                rejectedBy: {
                    id: req.user.id,
                    username: req.user.username,
                    displayName: req.user.display_name
                }
            });
        }

        res.send({
            message: 'Netværksanmodning afvist'
        });
    } catch (error) {
        error.status = error.status || 500;
        error.message = error.message || 'Kunne ikke afvise invitation';
        next(error);
    }
});

// DELETE /api/network/invitations/:id/cancel
router.delete('/invitations/:id/cancel', async (req, res, next) => {
    try {
        const invitationId = parseInt(req.params.id, 10);

        if (isNaN(invitationId) || invitationId <= 0) {
            const error = new Error('Ugyldigt invitation ID');
            error.status = 400;
            return next(error);
        }

        await networkService.cancelNetworkInvitation(invitationId, req.user.id);

        res.send({
            message: 'Netværksanmodning annulleret'
        });
    } catch (error) {
        error.status = error.status || 500;
        error.message = error.message || 'Kunne ikke annullere invitation';
        next(error);
    }
});

export default router;
