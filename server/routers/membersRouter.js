import { Router } from 'express';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { requireHyggesnakContext, requireHyggesnakOwner } from '../middleware/hyggesnakContextMiddleware.js';
import { membersReadLimiter, membersCreateLimiter, membersDeleteLimiter } from '../middleware/rateLimitersMiddleware.js';
import db from '../database/db.js';
import { sanitizeString, validateDisplayName, sanitizeDisplayName } from '../utils/validators.js';

const router = Router();

//==== GET /api/hyggesnakke/:hyggesnakId/members - List hyggesnak members ====//

router.get('/hyggesnakke/:hyggesnakId/members', authenticateToken, requireHyggesnakContext, membersReadLimiter, (req, res) => {
    const query = `
        SELECT
            u.id,
            u.username,
            u.display_name,
            u.email,
            u.created_at,
            hm.role,
            hm.joined_at
        FROM users u
        INNER JOIN hyggesnak_memberships hm ON u.id = hm.user_id
        WHERE hm.hyggesnak_id = ?
        ORDER BY hm.joined_at DESC
    `;

    db.all(query, [req.params.hyggesnakId], (err, users) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).send({ message: "Serverfejl" });
        }
        res.send({ data: users });
    });
});

//==== PUT /api/hyggesnakke/:hyggesnakId/members/me/display-name - Update own display name ====//

router.put('/hyggesnakke/:hyggesnakId/members/me/display-name', authenticateToken, requireHyggesnakContext, membersCreateLimiter, (req, res) => {
    let { display_name } = req.body;

    // Sanitize display name
    display_name = sanitizeDisplayName(display_name);

    // Validate display name
    const displayNameValidation = validateDisplayName(display_name);
    if (!displayNameValidation.valid) {
        return res.status(400).send({
            message: displayNameValidation.message
        });
    }

    // Update the user's display name
    db.run(
        'UPDATE users SET display_name = ? WHERE id = ?',
        [display_name, req.user.id],
        function (err) {
            if (err) {
                console.error('Database error:', err);
                return res.status(500).send({ message: "Serverfejl" });
            }

            if (this.changes === 0) {
                return res.status(404).send({
                    message: "Bruger ikke fundet"
                });
            }

            // Get the updated user details
            db.get(
                `SELECT u.id, u.username, u.display_name, u.email, u.created_at, hm.role, hm.joined_at
                 FROM users u
                 INNER JOIN hyggesnak_memberships hm ON u.id = hm.user_id
                 WHERE u.id = ? AND hm.hyggesnak_id = ?`,
                [req.user.id, req.params.hyggesnakId],
                (err, user) => {
                    if (err) {
                        console.error('Database error:', err);
                        return res.status(500).send({ message: "Serverfejl" });
                    }

                    res.status(200).send({
                        message: "Visningsnavn opdateret",
                        data: user
                    });
                }
            );
        }
    );
});

//==== PUT /api/hyggesnakke/:hyggesnakId/members/:userId/role - Change member role (owner only) ====//

router.put('/hyggesnakke/:hyggesnakId/members/:userId/role', authenticateToken, requireHyggesnakContext, requireHyggesnakOwner, membersCreateLimiter, (req, res) => {
    const userId = parseInt(req.params.userId, 10);
    let { role } = req.body;

    if (isNaN(userId) || userId <= 0) {
        return res.status(400).send({
            message: "Ugyldigt bruger ID"
        });
    }

    // Validate role
    role = sanitizeString(role);
    const validRoles = ['OWNER', 'MEMBER'];
    if (!role || !validRoles.includes(role)) {
        return res.status(400).send({
            message: "Ugyldig rolle. Vælg mellem: OWNER, MEMBER"
        });
    }

    // If demoting from OWNER to MEMBER, check if this is the last owner
    if (role === 'MEMBER') {
        db.get(
            'SELECT COUNT(*) as owner_count FROM hyggesnak_memberships WHERE hyggesnak_id = ? AND role = "OWNER"',
            [req.params.hyggesnakId],
            (err, result) => {
                if (err) {
                    console.error('Database error:', err);
                    return res.status(500).send({ message: "Serverfejl" });
                }

                if (result.owner_count <= 1) {
                    return res.status(403).send({
                        message: "Kan ikke fjerne sidste ejer"
                    });
                }

                // Safe to change role
                updateRole(userId, req.params.hyggesnakId, role, res);
            }
        );
    } else {
        // Promoting to OWNER - always allowed
        updateRole(userId, req.params.hyggesnakId, role, res);
    }
});

function updateRole(userId, hyggesnakId, role, res) {
    db.run(
        'UPDATE hyggesnak_memberships SET role = ? WHERE user_id = ? AND hyggesnak_id = ?',
        [role, userId, hyggesnakId],
        function (err) {
            if (err) {
                console.error('Database error:', err);
                return res.status(500).send({ message: "Serverfejl" });
            }

            if (this.changes === 0) {
                return res.status(404).send({
                    message: "Medlem ikke fundet i denne hyggesnak"
                });
            }

            // Get updated member details
            db.get(
                `SELECT u.id, u.username, u.display_name, u.email, u.created_at, hm.role, hm.joined_at
                 FROM users u
                 INNER JOIN hyggesnak_memberships hm ON u.id = hm.user_id
                 WHERE u.id = ? AND hm.hyggesnak_id = ?`,
                [userId, hyggesnakId],
                (err, user) => {
                    if (err) {
                        console.error('Database error:', err);
                        return res.status(500).send({ message: "Serverfejl" });
                    }

                    res.status(200).send({
                        message: "Rolle opdateret",
                        data: user
                    });
                }
            );
        }
    );
}

//==== DELETE /api/hyggesnakke/:hyggesnakId/members/:userId - Remove member from hyggesnak ====//

router.delete('/hyggesnakke/:hyggesnakId/members/:userId', authenticateToken, requireHyggesnakContext, membersDeleteLimiter, (req, res) => {
    const userId = parseInt(req.params.userId, 10);
    const hyggesnakId = parseInt(req.params.hyggesnakId, 10);

    if (isNaN(userId) || userId <= 0) {
        return res.status(400).send({
            message: "Ugyldigt bruger ID"
        });
    }

    // Check if user is removing themselves or someone else
    const isSelfRemoval = req.user.id === userId;

    // If removing someone else, require owner role
    if (!isSelfRemoval && req.hyggesnak.userRole !== 'OWNER') {
        return res.status(403).send({
            message: "Kun ejere kan fjerne andre medlemmer"
        });
    }

    // Get member to remove
    db.get(
        'SELECT user_id, role FROM hyggesnak_memberships WHERE user_id = ? AND hyggesnak_id = ?',
        [userId, hyggesnakId],
        (err, membership) => {
            if (err) {
                console.error('Database error:', err);
                return res.status(500).send({ message: "Serverfejl" });
            }

            if (!membership) {
                return res.status(404).send({
                    message: "Medlem ikke fundet i denne hyggesnak"
                });
            }

            // If removing an owner, check if this is the last owner
            if (membership.role === 'OWNER') {
                db.get(
                    'SELECT COUNT(*) as owner_count FROM hyggesnak_memberships WHERE hyggesnak_id = ? AND role = "OWNER"',
                    [hyggesnakId],
                    (err, result) => {
                        if (err) {
                            console.error('Database error:', err);
                            return res.status(500).send({ message: "Serverfejl" });
                        }

                        if (result.owner_count <= 1) {
                            // Check total member count - if owner is also the last member, delete hyggesnak
                            db.get(
                                'SELECT COUNT(*) as member_count FROM hyggesnak_memberships WHERE hyggesnak_id = ?',
                                [hyggesnakId],
                                (err, memberResult) => {
                                    if (err) {
                                        console.error('Database error:', err);
                                        return res.status(500).send({ message: "Serverfejl" });
                                    }

                                    if (memberResult.member_count === 1 && isSelfRemoval) {
                                        // Owner is alone - delete the entire hyggesnak
                                        deleteHyggesnak(hyggesnakId, res);
                                    } else {
                                        // There are other members - cannot remove last owner
                                        return res.status(403).send({
                                            message: "Kan ikke fjerne sidste ejer når der er andre medlemmer"
                                        });
                                    }
                                }
                            );
                            return;
                        }

                        // Safe to remove - proceed
                        performMembershipRemoval(userId, hyggesnakId, res);
                    }
                );
            } else {
                // Safe to remove - proceed
                performMembershipRemoval(userId, hyggesnakId, res);
            }
        }
    );
});

// Helper function for membership removal with auto-delete empty hyggesnak
function performMembershipRemoval(userId, hyggesnakId, res) {
    // Get username before deletion
    db.get('SELECT username FROM users WHERE id = ?', [userId], (err, user) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).send({ message: "Serverfejl" });
        }

        // Remove membership
        db.run(
            'DELETE FROM hyggesnak_memberships WHERE user_id = ? AND hyggesnak_id = ?',
            [userId, hyggesnakId],
            function (err) {
                if (err) {
                    console.error('Database error:', err);
                    return res.status(500).send({ message: "Serverfejl" });
                }

                if (this.changes === 0) {
                    return res.status(404).send({
                        message: "Medlem ikke fundet i denne hyggesnak"
                    });
                }

                // Check if hyggesnak is now empty
                db.get(
                    'SELECT COUNT(*) as member_count FROM hyggesnak_memberships WHERE hyggesnak_id = ?',
                    [hyggesnakId],
                    (err, result) => {
                        if (err) {
                            console.error('Database error:', err);
                            // Don't fail the request - member was removed successfully
                        }

                        // Auto-delete empty hyggesnak
                        if (result && result.member_count === 0) {
                            db.run('DELETE FROM hyggesnakke WHERE id = ?', [hyggesnakId], (err) => {
                                if (err) {
                                    console.error('Error auto-deleting empty hyggesnak:', err);
                                }
                            });
                        }

                        res.status(200).send({
                            message: `${user ? user.username : 'Medlem'} blev fjernet fra hyggesnak`,
                            data: { id: userId, hyggesnak_id: hyggesnakId }
                        });
                    }
                );
            }
        );
    });
}

// Helper function to delete hyggesnak when owner leaves as last member
function deleteHyggesnak(hyggesnakId, res) {
    // Get hyggesnak details before deletion
    db.get(
        'SELECT name, display_name FROM hyggesnakke WHERE id = ?',
        [hyggesnakId],
        (err, hyggesnak) => {
            if (err) {
                console.error('Database error:', err);
                return res.status(500).send({ message: "Serverfejl" });
            }

            if (!hyggesnak) {
                return res.status(404).send({
                    message: "Hyggesnak ikke fundet"
                });
            }

            // Delete hyggesnak (CASCADE will delete memberships and messages)
            db.run('DELETE FROM hyggesnakke WHERE id = ?', [hyggesnakId], function (err) {
                if (err) {
                    console.error('Database error:', err);
                    return res.status(500).send({ message: "Serverfejl" });
                }

                if (this.changes === 0) {
                    return res.status(404).send({
                        message: "Hyggesnak ikke fundet"
                    });
                }

                res.status(200).send({
                    message: `Du har forladt og slettet "${hyggesnak.display_name}"`,
                    data: { id: hyggesnakId, name: hyggesnak.name, deleted: true }
                });
            });
        }
    );
}

export default router;
