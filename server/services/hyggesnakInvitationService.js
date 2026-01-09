import { dbGet, dbAll, dbRun, transaction } from '../database/queryHelpers.js';
import { areUsersConnected } from './networkService.js';

//================ Hyggesnak Invitation Service - Handles hyggesnak invitation workflow (send, accept, reject) =============//

// Send a hyggesnak invitation to a network connection
export async function sendHyggesnakInvitation(hyggesnakId, invitedUserId, invitedByUserId) {
    // Verify inviter is owner of the hyggesnak
    const membership = await dbGet(
        'SELECT role FROM hyggesnak_memberships WHERE user_id = ? AND hyggesnak_id = ?',
        [invitedByUserId, hyggesnakId]
    );

    if (!membership) {
        throw new Error('Du er ikke medlem af denne hyggesnak');
    }

    if (membership.role !== 'OWNER') {
        throw new Error('Kun ejere kan invitere medlemmer');
    }

    // Verify users are connected in network OR had previous accepted invitation
    const connected = await areUsersConnected(invitedByUserId, invitedUserId);
    if (!connected) {
        // Allow re-invitation if there was a previous accepted invitation (user was previously member)
        const previousAcceptedInvitation = await dbGet(
            'SELECT id FROM hyggesnak_invitations WHERE hyggesnak_id = ? AND invited_user_id = ? AND status = \'ACCEPTED\'',
            [hyggesnakId, invitedUserId]
        );

        if (!previousAcceptedInvitation) {
            throw new Error('Du kan kun invitere brugere fra dit netværk');
        }
    }

    // Check if user is already a member
    const existingMembership = await dbGet(
        'SELECT id FROM hyggesnak_memberships WHERE user_id = ? AND hyggesnak_id = ?',
        [invitedUserId, hyggesnakId]
    );

    if (existingMembership) {
        throw new Error('Denne bruger er allerede medlem');
    }

    // Check if any invitation already exists
    const existingInvitation = await dbGet(
        'SELECT id, status FROM hyggesnak_invitations WHERE hyggesnak_id = ? AND invited_user_id = ?',
        [hyggesnakId, invitedUserId]
    );

    if (existingInvitation?.status === 'PENDING') {
        throw new Error('Der er allerede en afventende invitation til denne bruger');
    }

    let invitationId;

    if (existingInvitation) {
        // Update existing invitation to PENDING (re-invitation after accept/reject)
        await dbRun(
            `UPDATE hyggesnak_invitations
             SET status = 'PENDING',
                 invited_by_user_id = ?,
                 created_at = datetime('now'),
                 responded_at = NULL
             WHERE id = ?`,
            [invitedByUserId, existingInvitation.id]
        );
        invitationId = existingInvitation.id;
    } else {
        // Create new invitation
        const result = await dbRun(
            `INSERT INTO hyggesnak_invitations (hyggesnak_id, invited_user_id, invited_by_user_id)
             VALUES (?, ?, ?)`,
            [hyggesnakId, invitedUserId, invitedByUserId]
        );
        invitationId = result.lastID;
    }

    // Get hyggesnak info
    const hyggesnak = await dbGet(
        'SELECT id, name, display_name FROM hyggesnakke WHERE id = ?',
        [hyggesnakId]
    );

    // Get invited user info
    const invitedUser = await dbGet(
        'SELECT id, username, display_name FROM users WHERE id = ?',
        [invitedUserId]
    );

    return { invitationId, hyggesnak, invitedUser };
}

// Get pending hyggesnak invitations for a user
export async function getPendingInvitations(userId) {
    return await dbAll(
        `SELECT
            hi.id,
            hi.created_at,
            h.id as hyggesnak_id,
            h.name as hyggesnak_name,
            h.display_name as hyggesnak_display_name,
            u.id as invited_by_id,
            u.username as invited_by_username,
            u.display_name as invited_by_display_name,
            (SELECT COUNT(*) FROM hyggesnak_memberships WHERE hyggesnak_id = h.id) as member_count
         FROM hyggesnak_invitations hi
         JOIN hyggesnakke h ON h.id = hi.hyggesnak_id
         JOIN users u ON u.id = hi.invited_by_user_id
         WHERE hi.invited_user_id = ? AND hi.status = 'PENDING'
         ORDER BY hi.created_at DESC`,
        [userId]
    );
}

// Get pending invitations for a specific hyggesnak (OWNER only)
export async function getHyggesnakPendingInvitations(hyggesnakId) {
    return await dbAll(
        `SELECT
            hi.id,
            hi.created_at,
            hi.status,
            u.id as user_id,
            u.username,
            u.display_name
         FROM hyggesnak_invitations hi
         JOIN users u ON u.id = hi.invited_user_id
         WHERE hi.hyggesnak_id = ? AND hi.status = 'PENDING'
         ORDER BY hi.created_at DESC`,
        [hyggesnakId]
    );
}

// Accept a hyggesnak invitation
export async function acceptHyggesnakInvitation(invitationId, userId) {
    // Get invitation
    const invitation = await dbGet(
        `SELECT id, hyggesnak_id, invited_user_id, invited_by_user_id, status
         FROM hyggesnak_invitations
         WHERE id = ?`,
        [invitationId]
    );

    if (!invitation) {
        throw new Error('Invitation ikke fundet');
    }

    if (invitation.invited_user_id !== userId) {
        throw new Error('Denne invitation er ikke til dig');
    }

    if (invitation.status !== 'PENDING') {
        throw new Error('Denne invitation er allerede behandlet');
    }

    // Check if user is already a member (race condition protection)
    const alreadyMember = await dbGet(
        'SELECT id FROM hyggesnak_memberships WHERE user_id = ? AND hyggesnak_id = ?',
        [userId, invitation.hyggesnak_id]
    );

    if (alreadyMember) {
        throw new Error('Du er allerede medlem af denne hyggesnak');
    }

    // Use transaction for atomicity
    const result = await transaction(async ({ dbRun, dbGet }) => {
        // Add user as member
        await dbRun(
            `INSERT INTO hyggesnak_memberships (user_id, hyggesnak_id, role)
             VALUES (?, ?, 'MEMBER')`,
            [userId, invitation.hyggesnak_id]
        );

        // Mark invitation as accepted
        await dbRun(
            `UPDATE hyggesnak_invitations
             SET status = 'ACCEPTED', responded_at = datetime('now')
             WHERE id = ?`,
            [invitationId]
        );

        // Get hyggesnak info
        const hyggesnak = await dbGet(
            'SELECT id, name, display_name FROM hyggesnakke WHERE id = ?',
            [invitation.hyggesnak_id]
        );

        return {
            hyggesnak,
            ownerId: invitation.invited_by_user_id
        };
    });

    return result;
}

// Reject a hyggesnak invitation
export async function rejectHyggesnakInvitation(invitationId, userId) {
    const invitation = await dbGet(
        'SELECT id, invited_user_id, invited_by_user_id, status FROM hyggesnak_invitations WHERE id = ?',
        [invitationId]
    );

    if (!invitation) {
        throw new Error('Invitation ikke fundet');
    }

    if (invitation.invited_user_id !== userId) {
        throw new Error('Denne invitation er ikke til dig');
    }

    if (invitation.status !== 'PENDING') {
        throw new Error('Denne invitation er allerede behandlet');
    }

    await dbRun(
        `UPDATE hyggesnak_invitations
         SET status = 'REJECTED', responded_at = datetime('now')
         WHERE id = ?`,
        [invitationId]
    );

    return { ownerId: invitation.invited_by_user_id };
}

// Cancel a pending hyggesnak invitation (OWNER only)
export async function cancelHyggesnakInvitation(invitationId, hyggesnakId, userId) {
    // Verify user is owner
    const membership = await dbGet(
        'SELECT role FROM hyggesnak_memberships WHERE user_id = ? AND hyggesnak_id = ?',
        [userId, hyggesnakId]
    );

    if (!membership || membership.role !== 'OWNER') {
        throw new Error('Kun ejere kan annullere invitationer');
    }

    // Get invitation
    const invitation = await dbGet(
        'SELECT id, hyggesnak_id, status FROM hyggesnak_invitations WHERE id = ?',
        [invitationId]
    );

    if (!invitation) {
        throw new Error('Invitation ikke fundet');
    }

    if (invitation.hyggesnak_id !== hyggesnakId) {
        throw new Error('Hmm, den invitation kan du ikke bruge her ...');
    }

    if (invitation.status !== 'PENDING') {
        throw new Error('Kun afventende invitationer kan annulleres');
    }

    await dbRun('DELETE FROM hyggesnak_invitations WHERE id = ?', [invitationId]);
}
