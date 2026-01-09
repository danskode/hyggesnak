import { Router } from 'express';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { requireHyggesnakContext, requireHyggesnakOwner } from '../middleware/hyggesnakContextMiddleware.js';
import { membersReadLimiter, membersCreateLimiter, membersDeleteLimiter } from '../middleware/rateLimitersMiddleware.js';
import db from '../database/db.js';
import { transaction } from '../database/queryHelpers.js';
import { validateHyggesnakName, validateDisplayName, sanitizeString, sanitizeDisplayName } from '../utils/validators.js';

const router = Router();

//==== GET /api/hyggesnakke - List user's hyggesnakke ====//

router.get('/hyggesnakke', authenticateToken, membersReadLimiter, (req, res) => {
    const query = `
        SELECT
            h.id,
            h.name,
            h.display_name,
            h.created_at,
            hm.role as user_role,
            hm.joined_at,
            (SELECT COUNT(*) FROM hyggesnak_memberships WHERE hyggesnak_id = h.id) as member_count
        FROM hyggesnakke h
        INNER JOIN hyggesnak_memberships hm ON h.id = hm.hyggesnak_id
        WHERE hm.user_id = ?
        ORDER BY h.created_at DESC
    `;

    db.all(query, [req.user.id], (err, hyggesnakke) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).send({ message: "Serverfejl" });
        }
        res.send({ data: hyggesnakke });
    });
});

//==== POST /api/hyggesnakke - Create new hyggesnak ====//

router.post('/hyggesnakke', authenticateToken, membersCreateLimiter, async (req, res) => {
    try {
        let { name, display_name } = req.body;

        // Sanitize inputs
        name = sanitizeString(name);
        display_name = sanitizeDisplayName(display_name);

        // Validate hyggesnak name (URL-safe identifier)
        const nameValidation = validateHyggesnakName(name);
        if (!nameValidation.valid) {
            return res.status(400).send({
                message: nameValidation.message
            });
        }

        // Validate display name (public name with Danish chars, emojis)
        const displayNameValidation = validateDisplayName(display_name);
        if (!displayNameValidation.valid) {
            return res.status(400).send({
                message: displayNameValidation.message
            });
        }

        // Normalize name to lowercase for case-insensitive uniqueness
        const normalizedName = name.toLowerCase();

        // Use transaction helper for atomic operation
        const hyggesnak = await transaction(async ({ dbRun, dbGet }) => {
            let hyggesnakId;
            try {
                const result = await dbRun(
                    'INSERT INTO hyggesnakke (name, display_name) VALUES (?, ?)',
                    [normalizedName, display_name]
                );
                hyggesnakId = result.lastID;
            } catch (err) {
                if (err.message.includes('UNIQUE constraint failed')) {
                    throw { status: 400, message: "Dette hyggesnak navn er allerede i brug" };
                }
                throw err;
            }

            // Add creator as OWNER member
            await dbRun(
                'INSERT INTO hyggesnak_memberships (user_id, hyggesnak_id, role) VALUES (?, ?, ?)',
                [req.user.id, hyggesnakId, 'OWNER']
            );

            // Get the created hyggesnak with full details
            return await dbGet(
                `SELECT
                    h.id,
                    h.name,
                    h.display_name,
                    h.created_at,
                    'OWNER' as user_role,
                    1 as member_count
                FROM hyggesnakke h
                WHERE h.id = ?`,
                [hyggesnakId]
            );
        });

        res.status(201).send({
            message: "Hyggesnak oprettet",
            data: hyggesnak
        });
    } catch (error) {
        if (error.status) {
            return res.status(error.status).send({ message: error.message });
        }
        console.error('Database error:', error);
        res.status(500).send({ message: "Serverfejl" });
    }
});

//==== GET /api/hyggesnakke/:id - Get hyggesnak details ====//

router.get('/hyggesnakke/:hyggesnakId', authenticateToken, requireHyggesnakContext, membersReadLimiter, (req, res) => {
    // Context middleware already verified membership, so we can use req.hyggesnak
    const query = `
        SELECT
            h.id,
            h.name,
            h.display_name,
            h.created_at,
            (SELECT COUNT(*) FROM hyggesnak_memberships WHERE hyggesnak_id = h.id) as member_count,
            (SELECT COUNT(*) FROM hyggesnak_memberships WHERE hyggesnak_id = h.id AND role = 'ADMIN') as admin_count
        FROM hyggesnakke h
        WHERE h.id = ?
    `;

    db.get(query, [req.params.hyggesnakId], (err, hyggesnak) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).send({ message: "Serverfejl" });
        }

        if (!hyggesnak) {
            return res.status(404).send({
                message: "Hyggesnak ikke fundet"
            });
        }

        // Add user's role from context
        hyggesnak.user_role = req.hyggesnak.userRole;

        res.send({ data: hyggesnak });
    });
});

//==== PUT /api/hyggesnakke/:id - Update hyggesnak display_name (admin only) ====//

router.put('/hyggesnakke/:hyggesnakId', authenticateToken, requireHyggesnakContext, requireHyggesnakOwner, membersCreateLimiter, (req, res) => {
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

    // Update hyggesnak display name
    db.run(
        'UPDATE hyggesnakke SET display_name = ? WHERE id = ?',
        [display_name, req.params.hyggesnakId],
        function (err) {
            if (err) {
                console.error('Database error:', err);
                return res.status(500).send({ message: "Serverfejl" });
            }

            if (this.changes === 0) {
                return res.status(404).send({
                    message: "Hyggesnak ikke fundet"
                });
            }

            // Get updated hyggesnak
            db.get(
                'SELECT id, name, display_name, created_at FROM hyggesnakke WHERE id = ?',
                [req.params.hyggesnakId],
                (err, hyggesnak) => {
                    if (err) {
                        console.error('Database error:', err);
                        return res.status(500).send({ message: "Serverfejl" });
                    }

                    res.status(200).send({
                        message: "Hyggesnak opdateret",
                        data: hyggesnak
                    });
                }
            );
        }
    );
});

//==== DELETE /api/hyggesnakke/:id - Delete hyggesnak (Owner only, only when alone) ====//

router.delete('/hyggesnakke/:hyggesnakId', authenticateToken, requireHyggesnakContext, requireHyggesnakOwner, membersDeleteLimiter, (req, res) => {
    const hyggesnakId = parseInt(req.params.hyggesnakId, 10);

    // Check member count - only allow deletion if owner is alone
    db.get(
        'SELECT COUNT(*) as member_count FROM hyggesnak_memberships WHERE hyggesnak_id = ?',
        [hyggesnakId],
        (err, result) => {
            if (err) {
                console.error('Database error:', err);
                return res.status(500).send({ message: "Serverfejl" });
            }

            if (result.member_count > 1) {
                return res.status(400).send({
                    message: "Du kan kun slette hyggesnak når du er det eneste medlem. Fjern først alle andre medlemmer."
                });
            }

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

                    // Delete hyggesnak (CASCADE will delete memberships)
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
                            message: `Hyggesnak "${hyggesnak.display_name}" blev slettet`,
                            data: { id: hyggesnakId, name: hyggesnak.name }
                        });
                    });
                }
            );
        }
    );
});

export default router;
