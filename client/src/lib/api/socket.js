import { io } from 'socket.io-client';
import { get } from 'svelte/store';
import { auth } from '../stores/authStore.js';
import { BASE_URL, SOCKET_CONFIG } from '../utils/constants.js';

// Singleton socket instance
let socketInstance = null;

// Creates a Socket.IO connection with automatic authentication (singleton)
export function createSocket(options = {}) {
    // Return existing instance if already created
    if (socketInstance) {
        return socketInstance;
    }

    const authData = get(auth);
    const token = authData?.token;

    socketInstance = io(BASE_URL, {
        transports: SOCKET_CONFIG.TRANSPORTS,
        reconnection: SOCKET_CONFIG.RECONNECTION,
        reconnectionDelay: SOCKET_CONFIG.RECONNECTION_DELAY,
        reconnectionDelayMax: SOCKET_CONFIG.RECONNECTION_DELAY_MAX,
        reconnectionAttempts: SOCKET_CONFIG.RECONNECTION_ATTEMPTS,
        timeout: SOCKET_CONFIG.TIMEOUT,
        auth: {
            token: token
        },
        ...options
    });

    return socketInstance;
}

// Safely disconnects and cleans up a socket connection
export function disconnectSocket(socket) {
    if (!socket) return;

    try {
        socket.removeAllListeners();
        if (socket.connected) {
            socket.disconnect();
        }
        // Clear singleton instance
        if (socket === socketInstance) {
            socketInstance = null;
        }
    } catch (error) {
        console.error('Error disconnecting socket:', error);
    }
}

// Emit an event with error handling
export function emitEvent(socket, event, data, callback) {
    if (!socket || !socket.connected) {
        if (callback) callback({ error: 'Socket not connected' });
        return;
    }

    try {
        socket.emit(event, data, callback);
    } catch (error) {
        if (callback) callback({ error: error.message });
    }
}