import webpush from 'web-push';
import { config } from '../config/config.js';
import { dbAll, dbRun } from '../database/queryHelpers.js';

//==== SSRF prevention: only send to known, legitimate push service domains ====//
// Any endpoint not on this list is rejected before a network request is made.
const ALLOWED_PUSH_DOMAINS = new Set([
    'fcm.googleapis.com',               // Chrome (Google FCM)
    'updates.push.services.mozilla.com', // Firefox
    'push.services.mozilla.com',         // Firefox (alternate)
    'web.push.apple.com',                // Safari / iOS PWA (iOS 16.4+)
    'notify.windows.com',                // Edge
    'push.windows.com'                   // Edge (alternate)
]);

// Initialize VAPID once — will no-op if keys are not configured
if (config.vapidPublicKey && config.vapidPrivateKey) {
    webpush.setVapidDetails(
        config.vapidSubject,
        config.vapidPublicKey,
        config.vapidPrivateKey
    );
}

// Validate that an endpoint URL belongs to a known push service.
// Exported so pushRouter can reuse the same check on incoming subscriptions.
export function isValidEndpoint(endpoint) {
    if (typeof endpoint !== 'string') return false;
    try {
        const url = new URL(endpoint);
        if (url.protocol !== 'https:') return false;
        return ALLOWED_PUSH_DOMAINS.has(url.hostname);
    } catch {
        return false;
    }
}

// Sanitize notification fields — never forward raw user content to external services
function sanitizePayload(title, body, data) {
    return {
        title: String(title || '').replace(/[<>]/g, '').slice(0, 100),
        body: String(body || '').replace(/[<>]/g, '').slice(0, 200),
        // Only accept a URL string from data — nothing else reaches the push service
        data: { url: typeof data?.url === 'string' ? data.url.slice(0, 200) : '/' }
    };
}

// Send one notification, with a 5-second timeout and up to maxRetries retries.
// Returns { success } or { success: false, expired: true } or { success: false, error }.
async function sendNotificationWithTimeout(sub, payloadStr, maxRetries = 2) {
    const pushSub = {
        endpoint: sub.endpoint,
        keys: { p256dh: sub.p256dh, auth: sub.auth }
    };

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            const sendPromise = webpush.sendNotification(pushSub, payloadStr, { TTL: 3600 });
            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Push timeout after 5s')), 5000)
            );
            await Promise.race([sendPromise, timeoutPromise]);
            return { success: true };
        } catch (err) {
            // 410 Gone / 404 Not Found = subscription no longer valid, do not retry
            if (err.statusCode === 410 || err.statusCode === 404) {
                return { success: false, expired: true };
            }
            if (attempt === maxRetries) {
                return { success: false, error: err.message };
            }
            // Short backoff before retry (300ms, 600ms)
            await new Promise(resolve => setTimeout(resolve, 300 * (attempt + 1)));
        }
    }
}

//==== In-memory push queue — fire-and-forget, never blocks the request cycle ====//

const pushQueue = [];
let isProcessing = false;

async function processPushQueue() {
    if (isProcessing) return;
    isProcessing = true;
    while (pushQueue.length > 0) {
        const job = pushQueue.shift();
        try {
            await job();
        } catch (err) {
            console.error('[push] Unhandled queue job error:', err.message);
        }
    }
    isProcessing = false;
}

function enqueuePush(job) {
    pushQueue.push(job);
    setImmediate(processPushQueue);
}

//==== Public API ====//

// Queue a push notification to all subscriptions for a user.
// Returns immediately — actual sending happens in the background.
export function sendPushToUser(userId, title, body, data = {}) {
    if (!config.vapidPublicKey || !config.vapidPrivateKey) return;

    const payload = sanitizePayload(title, body, data);
    const payloadStr = JSON.stringify(payload);

    // RFC 8291: max encrypted payload is ~4096 bytes, safe plaintext limit ~3000
    if (Buffer.byteLength(payloadStr, 'utf8') > 3000) {
        console.warn(`[push] Payload too large for userId=${userId}, skipping`);
        return;
    }

    enqueuePush(async () => {
        let subscriptions;
        try {
            subscriptions = await dbAll(
                'SELECT id, endpoint, p256dh, auth FROM push_subscriptions WHERE user_id = ?',
                [userId]
            );
        } catch (err) {
            console.error(`[push] DB error fetching subscriptions for userId=${userId}:`, err.message);
            return;
        }

        for (const sub of subscriptions) {
            // Re-validate endpoint from DB before use (defense-in-depth against stale data)
            if (!isValidEndpoint(sub.endpoint)) {
                console.warn(`[push] Stored endpoint failed domain validation for userId=${userId}, removing`);
                await dbRun('DELETE FROM push_subscriptions WHERE id = ?', [sub.id]).catch(() => {});
                continue;
            }

            // Log attempt — endpoint itself is not logged to avoid leaking subscription metadata
            console.log(`[push] Sending notification to userId=${userId}`);

            const result = await sendNotificationWithTimeout(sub, payloadStr);

            if (result?.expired) {
                console.log(`[push] Subscription expired for userId=${userId}, removing`);
                await dbRun('DELETE FROM push_subscriptions WHERE id = ?', [sub.id]).catch(() => {});
            } else if (result && !result.success) {
                console.error(`[push] Send failed for userId=${userId}: ${result.error}`);
            }
        }
    });
}

// Check if a user has at least one active Socket.IO connection
export function isUserConnected(io, userId) {
    for (const [, socket] of io.sockets.sockets) {
        if (socket.userId === userId) return true;
    }
    return false;
}
