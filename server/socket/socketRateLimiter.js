//==== Socket.IO Rate Limiter ====//

class SocketRateLimiter {
    constructor() {
        // Store: Map<socketId, Map<eventName, { count, resetTime }>>
        this.limits = new Map();

        // Rate limit configs (requests per window)
        this.configs = {
            'join-hyggesnak': { max: 10, window: 60000 },
            'leave-hyggesnak': { max: 20, window: 60000 },
            'typing': { max: 30, window: 60000 },
            'stop-typing': { max: 30, window: 60000 }
        };

        // Cleanup old entries every 5 minutes
        setInterval(() => this.cleanup(), 5 * 60 * 1000);
    }

    check(socketId, eventName) {
        const config = this.configs[eventName];
        if (!config) {
            return { allowed: true }; // No limit configured
        }

        const now = Date.now();

        if (!this.limits.has(socketId)) {
            this.limits.set(socketId, new Map());
        }

        const socketLimits = this.limits.get(socketId);
        const eventLimit = socketLimits.get(eventName);

        // First request or window expired
        if (!eventLimit || now > eventLimit.resetTime) {
            socketLimits.set(eventName, {
                count: 1,
                resetTime: now + config.window
            });
            return { allowed: true };
        }

        // Within window
        if (eventLimit.count < config.max) {
            eventLimit.count++;
            return { allowed: true };
        }

        // Rate limit exceeded
        const retryAfter = Math.ceil((eventLimit.resetTime - now) / 1000);
        return {
            allowed: false,
            retryAfter,
            message: `For mange ${eventName} events. Prøv igen om ${retryAfter} sekunder.`
        };
    }

    // Remove socket data when disconnected
    remove(socketId) {
        this.limits.delete(socketId);
    }

    // Cleanup expired entries
    cleanup() {
        const now = Date.now();
        for (const [socketId, eventLimits] of this.limits.entries()) {
            for (const [eventName, limit] of eventLimits.entries()) {
                if (now > limit.resetTime) {
                    eventLimits.delete(eventName);
                }
            }
            // Remove socket if no events tracked
            if (eventLimits.size === 0) {
                this.limits.delete(socketId);
            }
        }
    }
}

// Singleton instance
export const socketRateLimiter = new SocketRateLimiter();
