import db from '../database/db.js';
import { areUsersConnected } from './networkService.js';

//================ Hyggesnak Invitation Service - Handles hyggesnak invitation workflow (send, accept, reject) =============//

// Send a hyggesnak invitation to a network connection
export async function sendHyggesnakInvitation(hyggesnakId, invitedUserId, invitedByUserId) {
    // Verify inviter is owner of the hyggesnak
    const membership = await new Promise((resolve, reject) => {
        db.get(
            'SELECT role FROM hyggesnak_memberships WHERE user_id = ? AND hyggesnak_id = ?',
            [invitedByUserId, hyggesnakId],
            (err, row) => {
                if (err) reject(err);
                else resolve(row);
            }
        );
    });

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
        const previousAcceptedInvitation = await new Promise((resolve, reject) => {
            db.get(
                'SELECT id FROM hyggesnak_invitations WHERE hyggesnak_id = ? AND invited_user_id = ? AND status = \'ACCEPTED\'',
                [hyggesnakId, invitedUserId],
                (err, row) => {
                    if (err) reject(err);
                    else resolve(row);
                }
            );
        });

        if (!previousAcceptedInvitation) {
            throw new Error('Du kan kun invitere brugere fra dit netværk');
        }
    }

    // Check if user is already a member
    const existingMembership = await new Promise((resolve, reject) => {
        db.get(
            'SELECT id FROM hyggesnak_memberships WHERE user_id = ? AND hyggesnak_id = ?',
            [invitedUserId, hyggesnakId],
            (err, row) => {
                if (err) reject(err);
                else resolve(row);
            }
        );
    });

    if (existingMembership) {
        throw new Error('Denne bruger er allerede medlem');
    }

    // Check if any invitation already exists
    const existingInvitation = await new Promise((resolve, reject) => {
        db.get(
            'SELECT id, status FROM hyggesnak_invitations WHERE hyggesnak_id = ? AND invited_user_id = ?',
            [hyggesnakId, invitedUserId],
            (err, row) => {
                if (err) reject(err);
                else resolve(row);
            }
        );
    });

    if (existingInvitation?.status === 'PENDING') {
        throw new Error('Der er allerede en afventende invitation til denne bruger');
    }

    let invitationId;

    if (existingInvitation) {
        // Update existing invitation to PENDING (re-invitation after accept/reject)
        await new Promise((resolve, reject) => {
            db.run(
                `UPDATE hyggesnak_invitations
                 SET status = 'PENDING',
                     invited_by_user_id = ?,
                     created_at = datetime('now'),
                     responded_at = NULL
                 WHERE id = ?`,
                [invitedByUserId, existingInvitation.id],
                (err) => {
                    if (err) reject(err);
                    else resolve();
                }
            );
        });
        invitationId = existingInvitation.id;
    } else {
        // Create new invitation
        invitationId = await new Promise((resolve, reject) => {
            db.run(
                `INSERT INTO hyggesnak_invitations (hyggesnak_id, invited_user_id, invited_by_user_id)
                 VALUES (?, ?, ?)`,
                [hyggesnakId, invitedUserId, invitedByUserId],
                function (err) {
                    if (err) reject(err);
                    else resolve(this.lastID);
                }
            );
        });
    }

    // Get hyggesnak info
    const hyggesnak = await new Promise((resolve, reject) => {
        db.get(
            'SELECT id, name, display_name FROM hyggesnakke WHERE id = ?',
            [hyggesnakId],
            (err, row) => {
                if (err) reject(err);
                else resolve(row);
            }
        );
    });

    // Get invited user info
    const invitedUser = await new Promise((resolve, reject) => {
        db.get(
            'SELECT id, username, display_name FROM users WHERE id = ?',
            [invitedUserId],
            (err, row) => {
                if (err) reject(err);
                else resolve(row);
            }
        );
    });

    return { invitationId, hyggesnak, invitedUser };
}

// Get pending hyggesnak invitations for a user
export async function getPendingInvitations(userId) {
    return new Promise((resolve, reject) => {
        db.all(
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
            [userId],
            (err, rows) => {
                if (err) reject(err);
                else resolve(rows || []);
            }
        );
    });
}

// Get pending invitations for a specific hyggesnak (OWNER only)
export async function getHyggesnakPendingInvitations(hyggesnakId) {
    return new Promise((resolve, reject) => {
        db.all(
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
            [hyggesnakId],
            (err, rows) => {
                if (err) reject(err);
                else resolve(rows || []);
            }
        );
    });
}

// Accept a hyggesnak invitation
export async function acceptHyggesnakInvitation(invitationId, userId) {
    // Get invitation
    const invitation = await new Promise((resolve, reject) => {
        db.get(
            `SELECT id, hyggesnak_id, invited_user_id, invited_by_user_id, status
             FROM hyggesnak_invitations
             WHERE id = ?`,
            [invitationId],
            (err, row) => {
                if (err) reject(err);
                else resolve(row);
            }
        );
    });

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
    const alreadyMember = await new Promise((resolve, reject) => {
        db.get(
            'SELECT id FROM hyggesnak_memberships WHERE user_id = ? AND hyggesnak_id = ?',
            [userId, invitation.hyggesnak_id],
            (err, row) => {
                if (err) reject(err);
                else resolve(!!row);
            }
        );
    });

    if (alreadyMember) {
        throw new Error('Du er allerede medlem af denne hyggesnak');
    }

    // Use transaction for atomicity
    return new Promise((resolve, reject) => {
        db.serialize(() => {
            db.run('BEGIN TRANSACTION', (err) => {
                if (err) return reject(err);

                // Add user as member
                db.run(
                    `INSERT INTO hyggesnak_memberships (user_id, hyggesnak_id, role)
                     VALUES (?, ?, 'MEMBER')`,
                    [userId, invitation.hyggesnak_id],
                    (err) => {
                        if (err) {
                            db.run('ROLLBACK');
                            return reject(err);
                        }

                        // Mark invitation as accepted
                        db.run(
                            `UPDATE hyggesnak_invitations
                             SET status = 'ACCEPTED', responded_at = datetime('now')
                             WHERE id = ?`,
                            [invitationId],
                            (err) => {
                                if (err) {
                                    db.run('ROLLBACK');
                                    return reject(err);
                                }

                                // Get hyggesnak info
                                db.get(
                                    'SELECT id, name, display_name FROM hyggesnakke WHERE id = ?',
                                    [invitation.hyggesnak_id],
                                    (err, hyggesnak) => {
                                        if (err) {
                                            db.run('ROLLBACK');
                                            return reject(err);
                                        }

                                        db.run('COMMIT', (err) => {
                                            if (err) {
                                                db.run('ROLLBACK');
                                                return reject(err);
                                            }
                                            resolve({
                                                hyggesnak,
                                                ownerId: invitation.invited_by_user_id
                                            });
                                        });
                                    }
                                );
                            }
                        );
                    }
                );
            });
        });
    });
}

// Reject a hyggesnak invitation
export async function rejectHyggesnakInvitation(invitationId, userId) {
    const invitation = await new Promise((resolve, reject) => {
        db.get(
            'SELECT id, invited_user_id, invited_by_user_id, status FROM hyggesnak_invitations WHERE id = ?',
            [invitationId],
            (err, row) => {
                if (err) reject(err);
                else resolve(row);
            }
        );
    });

    if (!invitation) {
        throw new Error('Invitation ikke fundet');
    }

    if (invitation.invited_user_id !== userId) {
        throw new Error('Denne invitation er ikke til dig');
    }

    if (invitation.status !== 'PENDING') {
        throw new Error('Denne invitation er allerede behandlet');
    }

    return new Promise((resolve, reject) => {
        db.run(
            `UPDATE hyggesnak_invitations
             SET status = 'REJECTED', responded_at = datetime('now')
             WHERE id = ?`,
            [invitationId],
            (err) => {
                if (err) reject(err);
                else resolve({ ownerId: invitation.invited_by_user_id });
            }
        );
    });
}

// Cancel a pending hyggesnak invitation (OWNER only)
export async function cancelHyggesnakInvitation(invitationId, hyggesnakId, userId) {
    // Verify user is owner
    const membership = await new Promise((resolve, reject) => {
        db.get(
            'SELECT role FROM hyggesnak_memberships WHERE user_id = ? AND hyggesnak_id = ?',
            [userId, hyggesnakId],
            (err, row) => {
                if (err) reject(err);
                else resolve(row);
            }
        );
    });

    if (!membership || membership.role !== 'OWNER') {
        throw new Error('Kun ejere kan annullere invitationer');
    }

    // Get invitation
    const invitation = await new Promise((resolve, reject) => {
        db.get(
            'SELECT id, hyggesnak_id, status FROM hyggesnak_invitations WHERE id = ?',
            [invitationId],
            (err, row) => {
                if (err) reject(err);
                else resolve(row);
            }
        );
    });

    if (!invitation) {
        throw new Error('Invitation ikke fundet');
    }

    if (invitation.hyggesnak_id !== hyggesnakId) {
        throw new Error('Hmm, den invitation kan du ikke bruge her ...');
    }

    if (invitation.status !== 'PENDING') {
        throw new Error('Kun afventende invitationer kan annulleres');
    }

    return new Promise((resolve, reject) => {
        db.run('DELETE FROM hyggesnak_invitations WHERE id = ?', [invitationId], (err) => {
            if (err) reject(err);
            else resolve();
        });
    });
}
