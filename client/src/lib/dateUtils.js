//==== Date Formatting Utilities ====//

/**
 * Format date in Danish locale
 * @param {string|Date} dateString - Date to format
 * @param {Object} options - Intl.DateTimeFormat options
 * @returns {string} Formatted date
 */
export function formatDate(dateString, options = {}) {
    if (!dateString) return '';

    const defaultOptions = {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        ...options
    };

    return new Date(dateString).toLocaleDateString('da-DK', defaultOptions);
}

/**
 * Format date and time in Danish locale
 * @param {string|Date} dateString - Date to format
 * @returns {string} Formatted date and time
 */
export function formatDateTime(dateString) {
    if (!dateString) return '';

    return new Date(dateString).toLocaleString('da-DK', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

/**
 * Format time only in Danish locale
 * @param {string|Date} dateString - Date to format
 * @returns {string} Formatted time
 */
export function formatTime(dateString) {
    if (!dateString) return '';

    return new Date(dateString).toLocaleTimeString('da-DK', {
        hour: '2-digit',
        minute: '2-digit'
    });
}

/**
 * Format relative time (e.g., "2 timer siden", "i går")
 * @param {string|Date} dateString - Date to format
 * @returns {string} Relative time string
 */
export function formatRelativeTime(dateString) {
    if (!dateString) return '';

    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'lige nu';
    if (diffMins < 60) return `${diffMins} minut${diffMins !== 1 ? 'ter' : ''} siden`;
    if (diffHours < 24) return `${diffHours} time${diffHours !== 1 ? 'r' : ''} siden`;
    if (diffDays === 1) return 'i går';
    if (diffDays < 7) return `${diffDays} dage siden`;

    return formatDate(dateString);
}

/**
 * Check if date is today
 * @param {string|Date} dateString - Date to check
 * @returns {boolean} True if date is today
 */
export function isToday(dateString) {
    if (!dateString) return false;

    const date = new Date(dateString);
    const today = new Date();

    return date.getDate() === today.getDate() &&
           date.getMonth() === today.getMonth() &&
           date.getFullYear() === today.getFullYear();
}

/**
 * Check if date is within last N days
 * @param {string|Date} dateString - Date to check
 * @param {number} days - Number of days
 * @returns {boolean} True if within last N days
 */
export function isWithinDays(dateString, days) {
    if (!dateString) return false;

    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffDays = diffMs / 86400000;

    return diffDays <= days && diffDays >= 0;
}
