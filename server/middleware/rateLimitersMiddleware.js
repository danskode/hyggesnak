// Rate limiters for brute force protection
import rateLimit from 'express-rate-limit';

const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 15, // 15 attempts per window
    message: { message: "For mange login forsøg. Prøv igen om 15 minutter." },
    standardHeaders: true,
    legacyHeaders: false
});

const forgotPasswordLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 5, // 5 attempts per window
    message: { message: "For mange password reset forsøg. Prøv igen om 1 time." },
    standardHeaders: true,
    legacyHeaders: false
});

const resetPasswordLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 5, // 5 attempts per window
    message: { message: "For mange password reset forsøg. Prøv igen om 1 time." },
    standardHeaders: true,
    legacyHeaders: false
});

const membersReadLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 30, // 30 requests per minute
    message: { message: "For mange forespørgsler. Prøv igen om 1 minut." },
    standardHeaders: true,
    legacyHeaders: false
});

const membersCreateLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10, // Max 10 member creations per hour
    message: { message: "For mange medlemsoprettelser. Prøv igen senere." },
    standardHeaders: true,
    legacyHeaders: false
});

const membersDeleteLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10, // Max 10 deletions per hour
    message: { message: "For mange sletninger. Prøv igen senere." },
    standardHeaders: true,
    legacyHeaders: false
});

const inviteCodeCreateLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 5, // Max 5 invite codes per hour
    message: { message: "For mange forsøg på at oprette invite koder. Prøv igen om 1 time." },
    standardHeaders: true,
    legacyHeaders: false
});

const joinRequestLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10, // Max 10 join requests per hour
    message: { message: "For mange join requests. Prøv igen om 1 time." },
    standardHeaders: true,
    legacyHeaders: false
});

// ============================================
// Network System Rate Limiters
// ============================================

const networkCodeGenerateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // Max 10 code generations per 15 minutes
    message: { message: "For mange forsøg på at generere netværkskoder. Prøv igen om 15 minutter." },
    standardHeaders: true,
    legacyHeaders: false
});

const networkConnectLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 20, // Max 20 connection attempts per hour
    message: { message: "For mange forbindelsesforsøg. Prøv igen om 1 time." },
    standardHeaders: true,
    legacyHeaders: false
});

const hyggesnakInviteLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 30, // Max 30 hyggesnak invitations per hour
    message: { message: "For mange invitations sendt. Prøv igen om 1 time." },
    standardHeaders: true,
    legacyHeaders: false
});

const invitationResponseLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 60, // Max 60 invitation responses per hour (accept/reject)
    message: { message: "For mange invitation svar. Prøv igen om 1 time." },
    standardHeaders: true,
    legacyHeaders: false
});

export {
    loginLimiter,
    forgotPasswordLimiter,
    resetPasswordLimiter,
    membersReadLimiter,
    membersCreateLimiter,
    membersDeleteLimiter,
    inviteCodeCreateLimiter,
    joinRequestLimiter,
    networkCodeGenerateLimiter,
    networkConnectLimiter,
    hyggesnakInviteLimiter,
    invitationResponseLimiter
};
