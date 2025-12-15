import { dbGet, dbAll, dbRun, transaction } from '../../database/queryHelpers.js';
import { validateNetworkCode } from './codeService.js';
import { areUsersConnected } from './connectionService.js';

//==== Network Invitation Management ====//

/**
 * Create a network invitation using an invite code
 * @param {number} fromUserId - User sending the invitation
 * @param {string} code - 6-digit invite code
 * @returns {Promise<{invitationId: number, toUser: object}>}
 */
export async function createNetworkInvitation(fromUserId, code) {
    // Validate code
    const validation = await validateNetworkCode(code);
    if (!validation.valid) {
        throw new Error(validation.error);
    }

    const codeData = validation.codeData;
    const toUserId = codeData.createdBy;

    // Check if trying to connect to self
    if (fromUserId === toUserId) {
        throw new Error('Du kan ikke forbinde til dig selv');
    }

    // Check if already connected
    const existingConnection = await areUsersConnected(fromUserId, toUserId);
    if (existingConnection) {
        throw new Error('I er allerede forbundet');
    }

    // Check if PENDING invitation already exists
    const existingPendingInvitation = await dbGet(
        `SELECT id FROM network_invitations
         WHERE from_user_id = ? AND to_user_id = ? AND status = 'PENDING'`,
        [fromUserId, toUserId]
    );

    if (existingPendingInvitation) {
        throw new Error('Du har allerede sendt en anmodning til denne bruger');
    }

    // Create invitation and mark code as used in transaction
    const result = await transaction(async ({ dbRun, dbGet }) => {
        // Create invitation
        const { lastID } = await dbRun(
            `INSERT INTO network_invitations (from_user_id, to_user_id)
             VALUES (?, ?)`,
            [fromUserId, toUserId]
        );

        // Mark code as used (deactivate it)
        await dbRun(
            `UPDATE network_invite_codes
             SET is_active = 0
             WHERE id = ?`,
            [codeData.id]
        );

        // Get recipient user info
        const toUser = await dbGet(
            'SELECT id, username, display_name FROM users WHERE id = ?',
            [toUserId]
        );

        return { invitationId: lastID, toUser };
    });

    return result;
}

/**
 * Get incoming network invitations for a user
 * @param {number} userId
 * @returns {Promise<Array>}
 */
export async function getIncomingInvitations(userId) {
    return await dbAll(
        `SELECT
            ni.id,
            ni.created_at,
            u.id as from_user_id,
            u.username as from_username,
            u.display_name as from_display_name
         FROM network_invitations ni
         JOIN users u ON u.id = ni.from_user_id
         WHERE ni.to_user_id = ? AND ni.status = 'PENDING'
         ORDER BY ni.created_at DESC`,
        [userId]
    );
}

/**
 * Get outgoing network invitations for a user
 * @param {number} userId
 * @returns {Promise<Array>}
 */
export async function getOutgoingInvitations(userId) {
    return await dbAll(
        `SELECT
            ni.id,
            ni.created_at,
            u.id as to_user_id,
            u.username as to_username,
            u.display_name as to_display_name
         FROM network_invitations ni
         JOIN users u ON u.id = ni.to_user_id
         WHERE ni.from_user_id = ? AND ni.status = 'PENDING'
         ORDER BY ni.created_at DESC`,
        [userId]
    );
}

/**
 * Accept a network invitation
 * Creates bidirectional network connection and marks invitation as accepted
 * @param {number} invitationId
 * @param {number} userId - User accepting (must be the recipient)
 * @returns {Promise<{connectionId: number, user: object}>}
 */
export async function acceptNetworkInvitation(invitationId, userId) {
    // Get invitation
    const invitation = await dbGet(
        `SELECT id, from_user_id, to_user_id, status
         FROM network_invitations
         WHERE id = ?`,
        [invitationId]
    );

    if (!invitation) {
        throw new Error('Invitation ikke fundet');
    }

    if (invitation.to_user_id !== userId) {
        throw new Error('Du kan kun acceptere invitationer sendt til dig');
    }

    if (invitation.status !== 'PENDING') {
        throw new Error('Denne invitation er allerede behandlet');
    }

    // Check if already connected (race condition protection)
    const alreadyConnected = await areUsersConnected(invitation.from_user_id, invitation.to_user_id);
    if (alreadyConnected) {
        throw new Error('I er allerede forbundet');
    }

    // Use transaction for atomicity
    const result = await transaction(async ({ dbRun, dbGet }) => {
        // Create network connection (ensure user_id_1 < user_id_2)
        const user1 = Math.min(invitation.from_user_id, invitation.to_user_id);
        const user2 = Math.max(invitation.from_user_id, invitation.to_user_id);

        const { lastID } = await dbRun(
            `INSERT INTO network_connections (user_id_1, user_id_2)
             VALUES (?, ?)`,
            [user1, user2]
        );

        // Mark invitation as accepted
        await dbRun(
            `UPDATE network_invitations
             SET status = 'ACCEPTED', responded_at = datetime('now')
             WHERE id = ?`,
            [invitationId]
        );

        // Get the other user's info
        const user = await dbGet(
            'SELECT id, username, display_name FROM users WHERE id = ?',
            [invitation.from_user_id]
        );

        return { connectionId: lastID, user };
    });

    return result;
}

/**
 * Reject a network invitation
 * @param {number} invitationId
 * @param {number} userId - User rejecting (must be the recipient)
 * @returns {Promise<{fromUserId: number}>}
 */
export async function rejectNetworkInvitation(invitationId, userId) {
    const invitation = await dbGet(
        'SELECT id, from_user_id, to_user_id, status FROM network_invitations WHERE id = ?',
        [invitationId]
    );

    if (!invitation) {
        throw new Error('Invitation ikke fundet');
    }

    if (invitation.to_user_id !== userId) {
        throw new Error('Du kan kun afvise invitationer sendt til dig');
    }

    if (invitation.status !== 'PENDING') {
        throw new Error('Denne invitation er allerede behandlet');
    }

    await dbRun(
        `UPDATE network_invitations
         SET status = 'REJECTED', responded_at = datetime('now')
         WHERE id = ?`,
        [invitationId]
    );

    return { fromUserId: invitation.from_user_id };
}

/**
 * Cancel an outgoing network invitation
 * @param {number} invitationId
 * @param {number} userId - User canceling (must be the sender)
 * @returns {Promise<void>}
 */
export async function cancelNetworkInvitation(invitationId, userId) {
    const invitation = await dbGet(
        'SELECT id, from_user_id, to_user_id, status FROM network_invitations WHERE id = ?',
        [invitationId]
    );

    if (!invitation) {
        throw new Error('Invitation ikke fundet');
    }

    if (invitation.from_user_id !== userId) {
        throw new Error('Du kan kun annullere invitationer du har sendt');
    }

    if (invitation.status !== 'PENDING') {
        throw new Error('Denne invitation kan ikke annulleres');
    }

    await dbRun('DELETE FROM network_invitations WHERE id = ?', [invitationId]);
}
