import db from '../database/db.js';

// Hyggesnak Context Middleware: Validates that the authenticated user is a member of the requested hyggesnak.
// Must be used AFTER authenticateToken middleware.
export const requireHyggesnakContext = (req, res, next) => {

    const hyggesnakId = parseInt(req.params.hyggesnakId, 10);

    if (isNaN(hyggesnakId) || hyggesnakId <= 0) {
        return res.status(400).send({
            message: "Ugyldigt hyggesnak ID"
        });
    }

    if (!req.user || !req.user.id) {
        return res.status(401).send({
            message: "Du skal være logget ind"
        });
    }

    const membershipQuery = `
        SELECT
            h.id,
            h.name,
            h.display_name,
            hm.role as user_role
        FROM hyggesnakke h
        INNER JOIN hyggesnak_memberships hm ON h.id = hm.hyggesnak_id
        WHERE h.id = ? AND hm.user_id = ?
    `;

    db.get(membershipQuery, [hyggesnakId, req.user.id], (err, result) => {
        if (err) {
            return res.status(500).send({
                message: "Serverfejl ved verifikation af hyggesnak medlemskab"
            });
        }

        if (!result) {
            return res.status(403).send({
                message: "Du er ikke medlem af denne hyggesnak"
            });
        }

        const networkQuery = `
            SELECT 1
            FROM hyggesnak_memberships hm
            WHERE hm.hyggesnak_id = ?
            AND hm.user_id != ?
            AND NOT EXISTS (
                SELECT 1
                FROM network_connections nc
                WHERE (nc.user_id_1 = ? AND nc.user_id_2 = hm.user_id)
                   OR (nc.user_id_2 = ? AND nc.user_id_1 = hm.user_id)
            )
            LIMIT 1
        `;

        db.get(networkQuery, [hyggesnakId, req.user.id, req.user.id, req.user.id], (err, notConnected) => {
            if (err) {
                return res.status(500).send({
                    message: "Serverfejl ved verifikation af netværksforbindelser"
                });
            }

            if (notConnected) {
                return res.status(403).send({
                    message: "Du har ikke adgang til denne hyggesnak, da du ikke er forbundet med alle medlemmer"
                });
            }

            // 4. Attach hyggesnak context to request
            req.hyggesnak = {
                id: result.id,
                name: result.name,
                display_name: result.display_name,
                userRole: result.user_role
            };

            next();
        });
    });
};

// Hyggesnak Owner Middleware - Must be used AFTER requireHyggesnakContext.
export const requireHyggesnakOwner = (req, res, next) => {
    if (!req.hyggesnak || req.hyggesnak.userRole !== 'OWNER') {
        return res.status(403).send({
            message: "Kun ejeren af denne hyggesnak har adgang"
        });
    }

    next();
};
