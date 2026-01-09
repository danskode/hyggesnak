import { Router } from 'express';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { requireHyggesnakContext, requireHyggesnakOwner } from '../middleware/hyggesnakContextMiddleware.js';
import { hyggesnakInviteLimiter, invitationResponseLimiter } from '../middleware/rateLimitersMiddleware.js';
import * as hyggesnakInvitationService from '../services/hyggesnakInvitationService.js';
import { emitToUser } from '../socket/socketHandlers.js';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

// ======= Hyggesnak Invitation Management (OWNER) ============//

// POST /api/hyggesnakke/:hyggesnakId/invite
router.post('/hyggesnakke/:hyggesnakId/invite',
    hyggesnakInviteLimiter,
    requireHyggesnakContext,
    requireHyggesnakOwner,
    async (req, res, next) => {
        try {
            const { userId } = req.body;
            const hyggesnakId = parseInt(req.params.hyggesnakId, 10);

            if (!userId || isNaN(userId) || userId <= 0) {
                const error = new Error('Ugyldigt bruger ID');
                error.status = 400;
                return next(error);
            }

            const result = await hyggesnakInvitationService.sendHyggesnakInvitation(
                hyggesnakId,
                userId,
                req.user.id
            );

            // Emit socket event to invited user
            const io = req.app.get('io');
            if (io) {
                emitToUser(io, userId, 'hyggesnak:invitation:received', {
                    id: result.invitationId,
                    hyggesnak: {
                        id: result.hyggesnak.id,
                        name: result.hyggesnak.name,
                        displayName: result.hyggesnak.display_name
                    },
                    invitedBy: {
                        id: req.user.id,
                        username: req.user.username,
                        displayName: req.user.display_name
                    }
                });
            }

            res.status(201).send({
                message: `Invitation sendt til ${result.invitedUser.display_name || result.invitedUser.username}`,
                data: {
                    invitationId: result.invitationId,
                    hyggesnak: {
                        id: result.hyggesnak.id,
                        name: result.hyggesnak.name,
                        displayName: result.hyggesnak.display_name
                    },
                    invitedUser: {
                        id: result.invitedUser.id,
                        username: result.invitedUser.username,
                        displayName: result.invitedUser.display_name
                    }
                }
            });
        } catch (error) {
            error.status = error.status || 500;
            error.message = error.message || 'Kunne ikke sende invitation';
            next(error);
        }
    }
);

// GET /api/hyggesnakke/:hyggesnakId/invitations
router.get('/hyggesnakke/:hyggesnakId/invitations',
    requireHyggesnakContext,
    requireHyggesnakOwner,
    async (req, res, next) => {
        try {
            const hyggesnakId = parseInt(req.params.hyggesnakId, 10);

            const invitations = await hyggesnakInvitationService.getHyggesnakPendingInvitations(hyggesnakId);

            // Format response
            const formattedInvitations = invitations.map(inv => ({
                id: inv.id,
                invitedUser: {
                    id: inv.user_id,
                    username: inv.username,
                    displayName: inv.display_name
                },
                createdAt: inv.created_at,
                status: inv.status
            }));

            res.send({
                data: formattedInvitations
            });
        } catch (error) {
            error.status = 500;
            error.message = 'Kunne ikke hente invitationer';
            next(error);
        }
    }
);

// DELETE /api/hyggesnakke/:hyggesnakId/invitations/:invitationId
router.delete('/hyggesnakke/:hyggesnakId/invitations/:invitationId',
    requireHyggesnakContext,
    requireHyggesnakOwner,
    async (req, res, next) => {
        try {
            const hyggesnakId = parseInt(req.params.hyggesnakId, 10);
            const invitationId = parseInt(req.params.invitationId, 10);

            if (isNaN(invitationId) || invitationId <= 0) {
                const error = new Error('Ugyldigt invitation ID');
                error.status = 400;
                return next(error);
            }

            await hyggesnakInvitationService.cancelHyggesnakInvitation(
                invitationId,
                hyggesnakId,
                req.user.id
            );

            res.send({
                message: 'Invitation annulleret'
            });
        } catch (error) {
            error.status = error.status || 500;
            error.message = error.message || 'Kunne ikke annullere invitation';
            next(error);
        }
    }
);

// ============= User's Hyggesnak Invitations ======================//

// GET /api/hyggesnak-invitations
router.get('/hyggesnak-invitations', async (req, res, next) => {
    try {
        const invitations = await hyggesnakInvitationService.getPendingInvitations(req.user.id);

        // Format response
        const formattedInvitations = invitations.map(inv => ({
            id: inv.id,
            hyggesnak: {
                id: inv.hyggesnak_id,
                name: inv.hyggesnak_name,
                displayName: inv.hyggesnak_display_name,
                memberCount: inv.member_count
            },
            invitedBy: {
                id: inv.invited_by_id,
                username: inv.invited_by_username,
                displayName: inv.invited_by_display_name
            },
            createdAt: inv.created_at
        }));

        res.send({
            data: formattedInvitations
        });
    } catch (error) {
        error.status = 500;
        error.message = 'Kunne ikke hente hyggesnak invitationer';
        next(error);
    }
});

// PUT /api/hyggesnak-invitations/:id/accept
router.put('/hyggesnak-invitations/:id/accept', invitationResponseLimiter, async (req, res, next) => {
    try {
        const invitationId = parseInt(req.params.id, 10);

        if (isNaN(invitationId) || invitationId <= 0) {
            const error = new Error('Ugyldigt invitation ID');
            error.status = 400;
            return next(error);
        }

        const result = await hyggesnakInvitationService.acceptHyggesnakInvitation(
            invitationId,
            req.user.id
        );

        // Emit socket event to owner about accepted invitation
        const io = req.app.get('io');
        if (io && result.ownerId) {
            emitToUser(io, result.ownerId, 'hyggesnak:invitation:accepted', {
                invitationId,
                acceptedBy: {
                    id: req.user.id,
                    username: req.user.username,
                    displayName: req.user.display_name
                },
                hyggesnak: {
                    id: result.hyggesnak.id,
                    name: result.hyggesnak.name,
                    displayName: result.hyggesnak.display_name
                }
            });
        }

        res.send({
            message: `Du er nu medlem af ${result.hyggesnak.display_name}!`,
            data: {
                hyggesnak: {
                    id: result.hyggesnak.id,
                    name: result.hyggesnak.name,
                    displayName: result.hyggesnak.display_name
                }
            }
        });
    } catch (error) {
        error.status = error.status || 500;
        error.message = error.message || 'Kunne ikke acceptere invitation';
        next(error);
    }
});

// PUT /api/hyggesnak-invitations/:id/reject
router.put('/hyggesnak-invitations/:id/reject', invitationResponseLimiter, async (req, res, next) => {
    try {
        const invitationId = parseInt(req.params.id, 10);

        if (isNaN(invitationId) || invitationId <= 0) {
            const error = new Error('Ugyldigt invitation ID');
            error.status = 400;
            return next(error);
        }

        const result = await hyggesnakInvitationService.rejectHyggesnakInvitation(
            invitationId,
            req.user.id
        );

        // Emit socket event to owner about rejected invitation
        const io = req.app.get('io');
        if (io && result.ownerId) {
            emitToUser(io, result.ownerId, 'hyggesnak:invitation:rejected', {
                invitationId,
                rejectedBy: {
                    id: req.user.id,
                    username: req.user.username,
                    displayName: req.user.display_name
                }
            });
        }

        res.send({
            message: 'Invitation afvist'
        });
    } catch (error) {
        error.status = error.status || 500;
        error.message = error.message || 'Kunne ikke afvise invitation';
        next(error);
    }
});

export default router;
