//============= Sanitization utilities using DOMPurify - Protects against XSS attacks in user-generated content =================//

import DOMPurify from 'dompurify';

// Sanitize message content - removes all HTML tags

export function sanitizeMessage(content) {
    if (!content || typeof content !== 'string') return '';

    return DOMPurify.sanitize(content, {
        ALLOWED_TAGS: [], // No HTML tags allowed, text only
        KEEP_CONTENT: true // Keep the text content
    });
}

// Sanitize display name - removes HTML but allows safe characters

export function sanitizeDisplayName(name) {
    if (!name || typeof name !== 'string') return '?';

    const sanitized = DOMPurify.sanitize(name, {
        ALLOWED_TAGS: [], // No HTML tags
        KEEP_CONTENT: true
    }).trim();

    return sanitized || '?';
}

// Sanitize hyggesnak display name

export function sanitizeHyggesnakName(name) {
    if (!name || typeof name !== 'string') return 'Unavngivet';

    const sanitized = DOMPurify.sanitize(name, {
        ALLOWED_TAGS: [],
        KEEP_CONTENT: true
    }).trim();

    return sanitized || 'Unavngivet';
}

// Get safe initials from a name
export function getInitials(name) {
    const sanitized = sanitizeDisplayName(name);
    if (sanitized === '?') return '?';

    const parts = sanitized.split(' ');
    if (parts.length >= 2) {
        return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return sanitized[0].toUpperCase();
}
