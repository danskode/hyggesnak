/**
 * Application-wide constants
 * Centralized magic numbers and strings for consistency
 */

// API Base URL
export const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8081';

// Message constraints
export const MESSAGE_MAX_LENGTH = 2000;

// Network code constraints
export const NETWORK_CODE_LENGTH = 6;

// Name constraints
export const DISPLAY_NAME_MAX_LENGTH = 100;
export const HYGGESNAK_NAME_MIN_LENGTH = 3;
export const HYGGESNAK_NAME_MAX_LENGTH = 30;
export const USERNAME_MIN_LENGTH = 3;
export const USERNAME_MAX_LENGTH = 30;

// Password constraints
export const PASSWORD_MIN_LENGTH = 8;

// User roles
export const ROLES = {
    SUPER_ADMIN: 'SUPER_ADMIN',
    OWNER: 'OWNER',
    MEMBER: 'MEMBER',
    USER: 'USER'
};

// Socket.IO configuration
export const SOCKET_CONFIG = {
    TRANSPORTS: ['polling', 'websocket'],
    RECONNECTION: true,
    RECONNECTION_DELAY: 1000,
    RECONNECTION_DELAY_MAX: 5000,
    RECONNECTION_ATTEMPTS: 5,
    TIMEOUT: 10000
};

// API endpoints (relative to BASE_URL)
export const API_ENDPOINTS = {
    // Auth
    LOGIN: '/api/login',
    FORGOT_PASSWORD: '/api/forgot-password',
    RESET_PASSWORD: '/api/reset-password',

    // Hyggesnakke
    HYGGESNAKKE: '/api/hyggesnakke',
    HYGGESNAK_BY_ID: (id) => `/api/hyggesnakke/${id}`,
    HYGGESNAK_MESSAGES: (id) => `/api/hyggesnakke/${id}/messages`,
    HYGGESNAK_INVITE: (id) => `/api/hyggesnakke/${id}/invite`,
    HYGGESNAK_MANAGE_INVITATIONS: (id) => `/api/hyggesnakke/${id}/invitations`,

    // Messages
    MESSAGE_BY_ID: (id) => `/api/messages/${id}`,
    MARK_READ: (id) => `/api/hyggesnakke/${id}/mark-read`,
    UNREAD_COUNTS: '/api/unread-counts',

    // Network
    NETWORK_GENERATE_CODE: '/api/network/generate-code',
    NETWORK_MY_CODE: '/api/network/my-code',
    NETWORK_CONNECT: '/api/network/connect',
    NETWORK_CONNECTIONS: '/api/network/connections',
    NETWORK_CONNECTION_BY_ID: (userId) => `/api/network/connections/${userId}`,
    NETWORK_INVITATIONS_INCOMING: '/api/network/invitations/incoming',
    NETWORK_INVITATIONS_OUTGOING: '/api/network/invitations/outgoing',
    NETWORK_INVITATION_ACCEPT: (id) => `/api/network/invitations/${id}/accept`,
    NETWORK_INVITATION_REJECT: (id) => `/api/network/invitations/${id}/reject`,
    NETWORK_INVITATION_CANCEL: (id) => `/api/network/invitations/${id}/cancel`,

    // Hyggesnak invitations (user's incoming invitations)
    HYGGESNAK_INVITATIONS: '/api/hyggesnak-invitations',
    HYGGESNAK_INVITATION_ACCEPT: (id) => `/api/hyggesnak-invitations/${id}/accept`,
    HYGGESNAK_INVITATION_REJECT: (id) => `/api/hyggesnak-invitations/${id}/reject`,

    // Members
    MEMBERS: (hyggesnakId) => `/api/hyggesnakke/${hyggesnakId}/members`,

    // Admin
    ADMIN_USERS: '/api/admin/users',
    ADMIN_HYGGESNAKKE: '/api/admin/hyggesnakke',
    ADMIN_STATS: '/api/admin/stats'
};

// Socket events
export const SOCKET_EVENTS = {
    // Chat events
    JOIN_HYGGESNAK: 'join-hyggesnak',
    LEAVE_HYGGESNAK: 'leave-hyggesnak',
    NEW_MESSAGE: 'new-message',
    MESSAGE_EDITED: 'message-edited',
    MESSAGE_DELETED: 'message-deleted',
    TYPING: 'typing',
    STOP_TYPING: 'stop-typing',
    USER_TYPING: 'user-typing',
    USER_STOPPED_TYPING: 'user-stopped-typing',
    UNREAD_MESSAGE: 'unread-message',

    // Network invitation events
    NETWORK_INVITATION_RECEIVED: 'network:invitation:received',
    NETWORK_INVITATION_ACCEPTED: 'network:invitation:accepted',
    NETWORK_INVITATION_REJECTED: 'network:invitation:rejected',
    NETWORK_CONNECTION_NEW: 'network:connection:new',

    // Hyggesnak invitation events
    HYGGESNAK_INVITATION_RECEIVED: 'hyggesnak:invitation:received',
    HYGGESNAK_INVITATION_ACCEPTED: 'hyggesnak:invitation:accepted',
    HYGGESNAK_INVITATION_REJECTED: 'hyggesnak:invitation:rejected',

    // Connection events
    CONNECT: 'connect',
    DISCONNECT: 'disconnect',
    CONNECT_ERROR: 'connect_error',
    RECONNECT: 'reconnect',
    RECONNECT_ATTEMPT: 'reconnect_attempt',
    RECONNECT_ERROR: 'reconnect_error',
    RECONNECT_FAILED: 'reconnect_failed',
    ERROR: 'error'
};

// UI constants
export const TYPING_TIMEOUT = 3000; // 3 seconds
export const TYPING_INDICATOR_TIMEOUT = 3000; // 3 seconds
export const TOAST_DURATION = 3000; // 3 seconds
export const DEBOUNCE_DELAY = 300; // 300ms

// Pagination
export const MESSAGES_PER_PAGE = 50;
export const INITIAL_MESSAGES_LOAD = 50;