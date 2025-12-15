import crypto from 'crypto';
import { dbGet, dbRun } from '../../database/queryHelpers.js';

//==== Network Invite Code Management ====//

/**
 * Generate a new 6-digit network invite code
 * Automatically revokes any existing active codes for the user
 * @param {number} userId - User ID generating the code
 * @returns {Promise<{code: string, expiresAt: Date}>}
 */
export async function generateNetworkCode(userId) {
    // Revoke any existing active codes
    await revokeUserCodes(userId);

    // Generate unique 6-digit code
    let code;
    let attempts = 0;
    const maxAttempts = 10;

    while (attempts < maxAttempts) {
        // Generate random 6-digit number (000000-999999)
        code = crypto.randomInt(0, 1000000).toString().padStart(6, '0');

        // Check if code already exists
        const existing = await dbGet(
            'SELECT id FROM network_invite_codes WHERE code = ? AND is_active = 1',
            [code]
        );

        if (!existing) break;
        attempts++;
    }

    if (attempts >= maxAttempts) {
        throw new Error('Kunne ikke generere unik kode. Prøv igen.');
    }

    // Calculate expiry (24 hours from now)
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    // Insert code
    await dbRun(
        `INSERT INTO network_invite_codes (code, created_by, expires_at)
         VALUES (?, ?, ?)`,
        [code, userId, expiresAt.toISOString()]
    );

    return { code, expiresAt };
}

/**
 * Get user's current active network code
 * @param {number} userId
 * @returns {Promise<{code: string, created_at: Date, expires_at: Date} | null>}
 */
export async function getUserActiveCode(userId) {
    return await dbGet(
        `SELECT code, created_at, expires_at
         FROM network_invite_codes
         WHERE created_by = ? AND is_active = 1
         AND datetime(expires_at) > datetime('now')
         ORDER BY created_at DESC
         LIMIT 1`,
        [userId]
    );
}

/**
 * Revoke all active codes for a user
 * @param {number} userId
 * @returns {Promise<void>}
 */
export async function revokeUserCodes(userId) {
    await dbRun(
        'UPDATE network_invite_codes SET is_active = 0 WHERE created_by = ? AND is_active = 1',
        [userId]
    );
}

/**
 * Validate a network invite code
 * @param {string} code
 * @returns {Promise<{valid: boolean, codeData?: object, error?: string}>}
 */
export async function validateNetworkCode(code) {
    // Validate format
    if (!/^[0-9]{6}$/.test(code)) {
        return { valid: false, error: 'Ugyldig kode format. Koden skal være 6 cifre.' };
    }

    // Get code data
    const codeData = await dbGet(
        `SELECT id, code, created_by, expires_at, is_active
         FROM network_invite_codes
         WHERE code = ?`,
        [code]
    );

    if (!codeData) {
        return { valid: false, error: 'Koden findes ikke' };
    }

    if (!codeData.is_active) {
        return { valid: false, error: 'Koden er deaktiveret' };
    }

    // Check expiry
    const now = new Date();
    const expiresAt = new Date(codeData.expires_at);

    if (now > expiresAt) {
        return { valid: false, error: 'Koden er udløbet' };
    }

    return {
        valid: true,
        codeData: {
            id: codeData.id,
            code: codeData.code,
            createdBy: codeData.created_by,
            expiresAt: codeData.expires_at
        }
    };
}
