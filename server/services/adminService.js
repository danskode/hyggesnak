import bcrypt from 'bcrypt';
import { dbGet, dbAll, dbRun } from '../database/queryHelpers.js';
import { config } from '../config/config.js';
import {
    validateUsername,
    validateEmail,
    validatePassword,
    validateDisplayName,
    sanitizeString
} from '../utils/validators.js';
import { ValidationError, NotFoundError, ConflictError } from '../utils/errors.js';

//==== User Management Functions ====//

// Get paginated list of users with optional search
export async function getUsers({ page = 1, limit = 50, search = '' }) {
    const offset = (page - 1) * limit;

    // Sanitize search input to prevent SQL injection
    let sanitizedSearch = search ? sanitizeString(search, { maxLength: 100 }) : '';

    // Escape LIKE wildcards to prevent LIKE injection attacks
    sanitizedSearch = sanitizedSearch.replace(/[%_]/g, '\\$&');

    // Build search condition with ESCAPE clause
    const searchCondition = sanitizedSearch
        ? `WHERE username LIKE ? ESCAPE '\\' OR email LIKE ? ESCAPE '\\'`
        : '';
    const searchParams = sanitizedSearch
        ? [`%${sanitizedSearch}%`, `%${sanitizedSearch}%`]
        : [];

    // Get total count
    const countQuery = `SELECT COUNT(*) as total FROM users ${searchCondition}`;
    const { total } = await dbGet(countQuery, searchParams);

    // Get users
    const usersQuery = `
        SELECT id, username, display_name, email, role, created_at
        FROM users
        ${searchCondition}
        ORDER BY created_at DESC
        LIMIT ? OFFSET ?
    `;
    const users = await dbAll(usersQuery, [...searchParams, limit, offset]);

    const totalPages = Math.ceil(total / limit);

    return {
        users,
        pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: totalPages
        }
    };
}

// Create a new user
export async function createUser({ username, display_name, email, password, role = 'USER' }) {
    // Validate username
    const usernameValidation = validateUsername(username);
    if (!usernameValidation.valid) {
        throw new ValidationError(usernameValidation.message);
    }

    // Validate display name
    if (display_name) {
        const displayNameValidation = validateDisplayName(display_name);
        if (!displayNameValidation.valid) {
            throw new ValidationError(displayNameValidation.message);
        }
    }

    // Validate email
    const emailValidation = validateEmail(email);
    if (!emailValidation.valid) {
        throw new ValidationError(emailValidation.message);
    }

    // Validate password
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
        throw new ValidationError(passwordValidation.message);
    }

    // Validate role
    if (!['USER', 'SUPER_ADMIN'].includes(role)) {
        throw new ValidationError('Ugyldig rolle');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, config.saltRounds);

    // Insert user
    try {
        const { lastID } = await dbRun(
            `INSERT INTO users (username, display_name, email, password, role)
             VALUES (?, ?, ?, ?, ?)`,
            [username, display_name || null, email, hashedPassword, role]
        );

        // Get created user
        const user = await dbGet(
            'SELECT id, username, display_name, email, role, created_at FROM users WHERE id = ?',
            [lastID]
        );

        return user;
    } catch (err) {
        if (err.message.includes('UNIQUE constraint failed: users.username')) {
            throw new ConflictError('Brugernavnet er allerede i brug');
        } else if (err.message.includes('UNIQUE constraint failed: users.email')) {
            throw new ConflictError('Email er allerede i brug');
        }
        throw err;
    }
}

// Update user details
export async function updateUser(userId, updates) {
    // Verify user exists
    const user = await dbGet('SELECT id FROM users WHERE id = ?', [userId]);

    if (!user) {
        throw new NotFoundError('Bruger ikke fundet');
    }

    // Build update query dynamically
    const updateFields = [];
    const params = [];

    if (updates.display_name !== undefined) {
        if (updates.display_name) {
            const validation = validateDisplayName(updates.display_name);
            if (!validation.valid) {
                throw new ValidationError(validation.message);
            }
        }
        updateFields.push('display_name = ?');
        params.push(updates.display_name || null);
    }

    if (updates.email !== undefined) {
        const validation = validateEmail(updates.email);
        if (!validation.valid) {
            throw new ValidationError(validation.message);
        }
        updateFields.push('email = ?');
        params.push(updates.email);
    }

    if (updates.role !== undefined) {
        if (!['USER', 'SUPER_ADMIN'].includes(updates.role)) {
            throw new ValidationError('Ugyldig rolle');
        }
        updateFields.push('role = ?');
        params.push(updates.role);
    }

    if (updateFields.length === 0) {
        throw new ValidationError('Ingen opdateringer angivet');
    }

    params.push(userId);

    // Update user
    try {
        await dbRun(
            `UPDATE users SET ${updateFields.join(', ')} WHERE id = ?`,
            params
        );
    } catch (err) {
        if (err.message.includes('UNIQUE constraint failed: users.email')) {
            throw new ConflictError('Email er allerede i brug');
        }
        throw err;
    }

    // Get updated user
    const updatedUser = await dbGet(
        'SELECT id, username, display_name, email, role, created_at FROM users WHERE id = ?',
        [userId]
    );

    return updatedUser;
}

// Delete a user
export async function deleteUser(userId, currentUserId) {
    // Verify user exists
    const user = await dbGet('SELECT id, username FROM users WHERE id = ?', [userId]);

    if (!user) {
        throw new NotFoundError('Bruger ikke fundet');
    }

    // Prevent admin from deleting themselves
    if (parseInt(userId) === currentUserId) {
        throw new ValidationError('Du kan ikke slette din egen konto');
    }

    // Delete user (CASCADE will delete memberships)
    await dbRun('DELETE FROM users WHERE id = ?', [userId]);

    return user;
}

//==== Hyggesnak Management Functions ====//

// Get paginated list of hyggesnakke with optional search
export async function getHyggesnakke({ page = 1, limit = 50, search = '' }) {
    const offset = (page - 1) * limit;

    // Build search condition
    const searchCondition = search
        ? `WHERE h.name LIKE ? OR h.display_name LIKE ?`
        : '';
    const searchParams = search
        ? [`%${search}%`, `%${search}%`]
        : [];

    // Get total count
    const countQuery = `SELECT COUNT(*) as total FROM hyggesnakke h ${searchCondition}`;
    const { total } = await dbGet(countQuery, searchParams);

    // Get hyggesnakke with member count
    const hyggesnakkeQuery = `
        SELECT
            h.id,
            h.name,
            h.display_name,
            h.created_at,
            COUNT(hm.id) as member_count
        FROM hyggesnakke h
        LEFT JOIN hyggesnak_memberships hm ON h.id = hm.hyggesnak_id
        ${searchCondition}
        GROUP BY h.id
        ORDER BY h.created_at DESC
        LIMIT ? OFFSET ?
    `;
    const hyggesnakke = await dbAll(hyggesnakkeQuery, [...searchParams, limit, offset]);

    const totalPages = Math.ceil(total / limit);

    return {
        hyggesnakke,
        pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: totalPages
        }
    };
}

// Get hyggesnak details with members
export async function getHyggesnakDetails(hyggesnakId) {
    // Get hyggesnak details
    const hyggesnak = await dbGet(
        'SELECT id, name, display_name, created_at FROM hyggesnakke WHERE id = ?',
        [hyggesnakId]
    );

    if (!hyggesnak) {
        throw new NotFoundError('Hyggesnak ikke fundet');
    }

    // Get all members
    const members = await dbAll(
        `SELECT
            u.id,
            u.username,
            u.display_name,
            u.email,
            hm.role,
            hm.joined_at
         FROM hyggesnak_memberships hm
         JOIN users u ON u.id = hm.user_id
         WHERE hm.hyggesnak_id = ?
         ORDER BY hm.joined_at ASC`,
        [hyggesnakId]
    );

    return {
        ...hyggesnak,
        members
    };
}

// Delete a hyggesnak
export async function deleteHyggesnak(hyggesnakId) {
    // Verify hyggesnak exists
    const hyggesnak = await dbGet(
        'SELECT id, name, display_name FROM hyggesnakke WHERE id = ?',
        [hyggesnakId]
    );

    if (!hyggesnak) {
        throw new NotFoundError('Hyggesnak ikke fundet');
    }

    // Delete hyggesnak (CASCADE will delete memberships)
    await dbRun('DELETE FROM hyggesnakke WHERE id = ?', [hyggesnakId]);

    return hyggesnak;
}

//==== System Statistics Functions ====//

// Get system statistics
export async function getSystemStats() {
    // Get total users
    const { totalUsers } = await dbGet('SELECT COUNT(*) as totalUsers FROM users');

    // Get total hyggesnakke
    const { totalHyggesnakke } = await dbGet('SELECT COUNT(*) as totalHyggesnakke FROM hyggesnakke');

    // Get new users this week
    const { newUsersThisWeek } = await dbGet(
        `SELECT COUNT(*) as newUsersThisWeek
         FROM users
         WHERE created_at >= datetime('now', '-7 days')`
    );

    // Get users by role
    const usersByRole = await dbAll(
        'SELECT role, COUNT(*) as count FROM users GROUP BY role'
    );

    return {
        totalUsers,
        totalHyggesnakke,
        newUsersThisWeek,
        usersByRole
    };
}
