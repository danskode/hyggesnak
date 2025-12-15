// Validation utilities to check input from users

// Password requirements
export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_REQUIREMENTS = {
    minLength: PASSWORD_MIN_LENGTH,
    requireUppercase: true,
    requireLowercase: true,
    requireNumber: true
};

export function validatePassword(password) {
    if (!password || typeof password !== 'string') {
        return {
            valid: false,
            message: 'Password er påkrævet'
        };
    }

    if (password.length < PASSWORD_MIN_LENGTH) {
        return {
            valid: false,
            message: `Password skal være mindst ${PASSWORD_MIN_LENGTH} tegn`
        };
    }

    if (PASSWORD_REQUIREMENTS.requireUppercase && !/[A-Z]/.test(password)) {
        return {
            valid: false,
            message: 'Password skal indeholde mininum et stort bogstav'
        };
    }

    if (PASSWORD_REQUIREMENTS.requireLowercase && !/[a-z]/.test(password)) {
        return {
            valid: false,
            message: 'Password skal indeholde mindst et lille bogstav'
        };
    }

    if (PASSWORD_REQUIREMENTS.requireNumber && !/[0-9]/.test(password)) {
        return {
            valid: false,
            message: 'Password skal indeholde minimum et tal'
        };
    }

    return { valid: true, message: 'Password er gyldigt' };
}

export function validateEmail(email) {
    if (!email || typeof email !== 'string') {
        return {
            valid: false,
            message: 'Email er påkrævet'
        };
    }

    // Basic email regex - checks for basic email structure
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(email)) {
        return {
            valid: false,
            message: 'Ugyldig email format'
        };
    }

    return { valid: true, message: 'Email er gyldig' };
}

export function validateUsername(username) {
    if (!username || typeof username !== 'string') {
        return {
            valid: false,
            message: 'Brugernavn er påkrævet'
        };
    }

    const trimmedUsername = username.trim();

    if (trimmedUsername.length < 3) {
        return {
            valid: false,
            message: 'Brugernavn skal være mindst 3 tegn'
        };
    }

    if (trimmedUsername.length > 30) {
        return {
            valid: false,
            message: 'Brugernavn må højst være 30 tegn'
        };
    }

    // Only allow alphanumeric characters, underscore, and hyphen
    if (!/^[a-zA-Z0-9_-]+$/.test(trimmedUsername)) {
        return {
            valid: false,
            message: 'Brugernavn må kun indeholde bogstaver, tal, _ og -'
        };
    }

    return { valid: true, message: 'Brugernavn er gyldigt' };
}

export function validateDisplayName(displayName) {
    if (!displayName || typeof displayName !== 'string') {
        return {
            valid: false,
            message: 'Visningsnavn er påkrævet'
        };
    }

    const trimmedDisplayName = displayName.trim();

    if (trimmedDisplayName.length < 1) {
        return {
            valid: false,
            message: 'Visningsnavn skal være mindst 1 tegn'
        };
    }

    if (trimmedDisplayName.length > 100) {
        return {
            valid: false,
            message: 'Visningsnavn må højst være 100 tegn'
        };
    }

    // Allow letters (including Danish æ, ø, å), numbers, spaces, and emojis
    // We check for disallowed characters instead: no < > for XSS prevention
    if (/<|>/.test(trimmedDisplayName)) {
        return {
            valid: false,
            message: 'Visningsnavn må ikke indeholde < eller >'
        };
    }

    return { valid: true, message: 'Visningsnavn er gyldigt' };
}

// Reserved hyggesnak names (URL conflicts)
const RESERVED_HYGGESNAK_NAMES = [
    'api', 'admin', 'create', 'new', 'h', 'delete', 'edit',
    'login', 'logout', 'register', 'settings', 'profile'
];

export function validateHyggesnakName(name) {
    if (!name || typeof name !== 'string') {
        return {
            valid: false,
            message: 'Hyggesnak navn er påkrævet'
        };
    }

    const trimmedName = name.trim().toLowerCase();

    if (trimmedName.length < 3) {
        return {
            valid: false,
            message: 'Hyggesnak navn skal være mindst 3 tegn'
        };
    }

    if (trimmedName.length > 30) {
        return {
            valid: false,
            message: 'Hyggesnak navn må højst være 30 tegn'
        };
    }

    // Only allow lowercase letters, numbers, underscore, and hyphen (URL-safe)
    if (!/^[a-z0-9_-]+$/.test(trimmedName)) {
        return {
            valid: false,
            message: 'Hyggesnak navn må kun indeholde små bogstaver, tal, _ og -'
        };
    }

    // Check for reserved names
    if (RESERVED_HYGGESNAK_NAMES.includes(trimmedName)) {
        return {
            valid: false,
            message: 'Dette navn er reserveret. Vælg et andet navn.'
        };
    }

    return { valid: true, message: 'Hyggesnak navn er gyldigt' };
}

// Sanitize string input to prevent XSS
// Note: SQL injection is prevented via parameterized queries, not sanitization
export function sanitizeString(input, options = {}) {
    if (!input || typeof input !== 'string') {
        return '';
    }

    const maxLength = options.maxLength || 1000;

    let sanitized = input.trim();

    // Only remove XSS characters (< > for HTML tags)
    // Do NOT remove SQL characters like quotes - parameterized queries handle that
    // This allows legitimate input like "O'Brien" or "L'Amour"
    sanitized = sanitized.replace(/[<>]/g, '');

    // Remove control characters (null bytes, etc.) that could cause issues
    sanitized = sanitized.replace(/[\x00-\x1F\x7F]/g, '');

    return sanitized.substring(0, maxLength);
}

// Sanitize display name - allows Danish chars, spaces, emojis but prevents XSS
export function sanitizeDisplayName(input) {
    if (!input || typeof input !== 'string') {
        return '';
    }

    let sanitized = input.trim();

    // Remove only XSS characters (< > and script-related chars)
    sanitized = sanitized.replace(/[<>]/g, '');

    return sanitized.substring(0, 100);
}