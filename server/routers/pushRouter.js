import { Router } from 'express';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { pushSubscribeLimiter } from '../middleware/rateLimitersMiddleware.js';
import { config } from '../config/config.js';
import { dbGet, dbRun } from '../database/queryHelpers.js';
import { isValidEndpoint } from '../services/pushService.js';

const router = Router();

// All push routes require authentication
router.use(authenticateToken);

//==== GET /api/push/public-key — return VAPID public key ====//
// The client needs this to call pushManager.subscribe().
// Only the public key is returned — private key never leaves the server.

router.get('/push/public-key', (req, res) => {
    if (!config.vapidPublicKey) {
        return res.status(503).send({ message: 'Push notifikationer er ikke konfigureret' });
    }
    res.send({ data: { publicKey: config.vapidPublicKey } });
});

//==== POST /api/push/subscribe — save a push subscription ====//
// Input validation: endpoint must be a whitelisted HTTPS push service URL,
// and keys must be present. Rate limited to prevent subscription spam.

router.post('/push/subscribe', pushSubscribeLimiter, async (req, res, next) => {
    try {
        const { endpoint, keys } = req.body;
        const userId = req.user.id;

        // Validate required fields are present and correct types
        if (
            !endpoint || typeof endpoint !== 'string' ||
            !keys || typeof keys !== 'object' ||
            !keys.p256dh || typeof keys.p256dh !== 'string' ||
            !keys.auth || typeof keys.auth !== 'string'
        ) {
            return res.status(400).send({ message: 'Ugyldig subscription: mangler påkrævede felter' });
        }

        // SSRF prevention: reject endpoints not from a known push service
        if (!isValidEndpoint(endpoint)) {
            return res.status(400).send({ message: 'Ugyldig subscription endpoint' });
        }

        // Upsert: if this device already has a subscription, update it
        await dbRun(
            `INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth)
             VALUES (?, ?, ?, ?)
             ON CONFLICT(endpoint) DO UPDATE SET
               user_id = excluded.user_id,
               p256dh  = excluded.p256dh,
               auth    = excluded.auth`,
            [userId, endpoint, keys.p256dh, keys.auth]
        );

        res.status(201).send({ message: 'Push subscription gemt' });
    } catch (error) {
        next(error);
    }
});

//==== DELETE /api/push/subscribe — remove a push subscription ====//
// Authorization: users may only remove their own subscriptions.
// Returns 404 for both "not found" and "belongs to another user" to
// avoid disclosing the existence of other users' subscriptions.

router.delete('/push/subscribe', async (req, res, next) => {
    try {
        const { endpoint } = req.body;
        const userId = req.user.id;

        if (!endpoint || typeof endpoint !== 'string') {
            return res.status(400).send({ message: 'Endpoint påkrævet' });
        }

        const existing = await dbGet(
            'SELECT id, user_id FROM push_subscriptions WHERE endpoint = ?',
            [endpoint]
        );

        // Unified 404 response: don't reveal whether endpoint belongs to someone else
        if (!existing || existing.user_id !== userId) {
            return res.status(404).send({ message: 'Subscription ikke fundet' });
        }

        await dbRun('DELETE FROM push_subscriptions WHERE id = ?', [existing.id]);

        res.send({ message: 'Push subscription fjernet' });
    } catch (error) {
        next(error);
    }
});

export default router;
