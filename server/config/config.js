// Centralized server configuration

export const config = {
    port: Number(process.env.PORT) || 8081,
    clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',

    // Database
    dbPath: './database/hyggesnak.db',

    // Email
    resendApiKey: process.env.RESEND_API_KEY,
    resendAllowedEmail: process.env.RESEND_ALLOWED_EMAIL,

    // GIF API — vælg leverandør via GIF_PROVIDER ('giphy' eller 'heypster')
    gifProvider: process.env.GIF_PROVIDER || 'giphy',
    giphyApiKey: process.env.GIPHY_API_KEY,
    heypsterApiKey: process.env.HEYPSTER_API_KEY,

    // Web Push (VAPID)
    vapidPublicKey: process.env.VAPID_PUBLIC_KEY,
    vapidPrivateKey: process.env.VAPID_PRIVATE_KEY,
    vapidSubject: process.env.VAPID_SUBJECT || 'mailto:admin@example.com',

    // Bcrypt
    saltRounds: 10,

    // Password reset
    resetTokenExpiryHours: 1
};
