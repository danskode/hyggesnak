//================= Client-side validation utilities (matches server-side validation) ===============//
import { MESSAGE_MAX_LENGTH, NETWORK_CODE_LENGTH, DISPLAY_NAME_MAX_LENGTH } from './constants.js';

// Password validation
export const PASSWORD_MIN_LENGTH = 8;

export function validatePassword(password) {
    const errors = [];

    if (!password || typeof password !== 'string') {
        return {
            valid: false,
            message: 'Password er påkrævet'
        };
    }

    if (password.length < PASSWORD_MIN_LENGTH) {
        errors.push(`mindst ${PASSWORD_MIN_LENGTH} tegn`);
    }

    if (!/[A-Z]/.test(password)) {
        errors.push('minimum ét stort bogstav');
    }

    if (!/[a-z]/.test(password)) {
        errors.push('minimum ét lille bogstav');
    }

    if (!/[0-9]/.test(password)) {
        errors.push('minimum ét tal');
    }

    return {
        valid: errors.length === 0,
        message: errors.length > 0
            ? `Password skal indeholde: ${errors.join(', ')}`
            : 'Password er gyldigt'
    };
}

// Email validation
export function validateEmail(email) {
    if (!email || typeof email !== 'string') {
        return { valid: false, message: 'Email er påkrævet' };
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(email)) {
        return { valid: false, message: 'Ugyldig email format' };
    }

    return { valid: true, message: 'Email er gyldig' };
}

// Username validation (login name - stricter)
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

// Display name validation (shown in chat - allows Danish chars and emojis)
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

    if (trimmedDisplayName.length > DISPLAY_NAME_MAX_LENGTH) {
        return {
            valid: false,
            message: `Visningsnavn må højst være ${DISPLAY_NAME_MAX_LENGTH} tegn`
        };
    }

    // Check for disallowed characters: no < > for XSS prevention
    if (/<|>/.test(trimmedDisplayName)) {
        return {
            valid: false,
            message: 'Visningsnavn må ikke indeholde < eller >'
        };
    }

    return { valid: true, message: 'Visningsnavn er gyldigt' };
}

// Hyggesnak name validation (URL-safe identifier)
export function validateHyggesnakName(name) {
    if (!name || typeof name !== 'string') {
        return {
            valid: false,
            message: 'Hyggesnak navn er påkrævet'
        };
    }

    const trimmedName = name.trim();

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

    // URL-safe: only lowercase letters, numbers, underscore, hyphen
    if (!/^[a-z0-9_-]+$/.test(trimmedName)) {
        return {
            valid: false,
            message: 'Hyggesnak navn må kun indeholde små bogstaver, tal, _ og -'
        };
    }

    return { valid: true, message: 'Hyggesnak navn er gyldigt' };
}

// Hyggesnak display name validation (shown in UI - allows Danish chars and emojis)
export function validateHyggesnakDisplayName(displayName) {
    if (!displayName || typeof displayName !== 'string') {
        return {
            valid: false,
            message: 'Hyggesnak visningsnavn er påkrævet'
        };
    }

    const trimmedDisplayName = displayName.trim();

    if (trimmedDisplayName.length < 1) {
        return {
            valid: false,
            message: 'Hyggesnak visningsnavn skal være mindst 1 tegn'
        };
    }

    if (trimmedDisplayName.length > DISPLAY_NAME_MAX_LENGTH) {
        return {
            valid: false,
            message: `Hyggesnak visningsnavn må højst være ${DISPLAY_NAME_MAX_LENGTH} tegn`
        };
    }

    // Check for disallowed characters
    if (/<|>/.test(trimmedDisplayName)) {
        return {
            valid: false,
            message: 'Hyggesnak visningsnavn må ikke indeholde < eller >'
        };
    }

    return { valid: true, message: 'Hyggesnak visningsnavn er gyldigt' };
}

// Message validation
export function validateMessage(content) {
    if (!content || typeof content !== 'string') {
        return {
            valid: false,
            message: 'Besked er påkrævet'
        };
    }

    const trimmedContent = content.trim();

    if (trimmedContent.length === 0) {
        return {
            valid: false,
            message: 'Besked må ikke være tom'
        };
    }

    if (trimmedContent.length > MESSAGE_MAX_LENGTH) {
        return {
            valid: false,
            message: `Besked må højst være ${MESSAGE_MAX_LENGTH} tegn`
        };
    }

    return { valid: true, message: 'Besked er gyldig' };
}

// Network code validation
export function validateNetworkCode(code) {
    if (!code || typeof code !== 'string') {
        return {
            valid: false,
            message: 'Netværkskode er påkrævet'
        };
    }

    const trimmedCode = code.trim();

    if (trimmedCode.length !== NETWORK_CODE_LENGTH) {
        return {
            valid: false,
            message: `Netværkskode skal være ${NETWORK_CODE_LENGTH} cifre`
        };
    }

    // Only digits
    if (!/^\d{6}$/.test(trimmedCode)) {
        return {
            valid: false,
            message: 'Netværkskode må kun indeholde tal'
        };
    }

    return { valid: true, message: 'Netværkskode er gyldig' };
}

// Generic helper: check if string is not empty after trim
export function isNotEmpty(value) {
    return value && typeof value === 'string' && value.trim().length > 0;
}

// Generic helper: check string length range
export function isLengthInRange(value, min, max) {
    if (!value || typeof value !== 'string') return false;
    const len = value.trim().length;
    return len >= min && len <= max;
}
