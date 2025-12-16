import { writable, get } from 'svelte/store';
import { toast } from 'svelte-sonner';
import { createSocket, disconnectSocket } from '../api/socket.js';
import { SOCKET_EVENTS } from '../utils/constants.js';

//============= Composable hook for managing Socket.IO connections in Svelte components =============//

export function useSocket(callbacks = {}) {
    const socket = writable(null);
    const isConnected = writable(false);
    const currentRoom = writable(null);

    // Initialize socket connection and set up event listeners
    function connect() {
        if (get(socket)) return;

        const s = createSocket();
        socket.set(s);
        isConnected.set(s.connected);

        // Connection events
        s.on('connect', () => {
            isConnected.set(true);
            if (get(currentRoom)) joinRoom(get(currentRoom));
        });

        s.on('connect_error', (err) => {
            isConnected.set(false);
            if (err.message.includes('Authentication')) {
                toast.error('Autentificeringsfejl - log venligst ind igen');
            } else {
                toast.error(`Forbindelsesfejl: ${err.message}`);
            }
        });

        s.on('disconnect', (reason) => {
            isConnected.set(false);
            if (reason === 'io server disconnect') {
                toast.error('Forbindelsen blev afbrudt af serveren');
            }
        });

        s.on('error', (error) => {
            toast.error(error.message || 'En fejl opstod i chatten');
        });

        s.on('reconnect', () => {
            isConnected.set(true);
            toast.success('Forbindelse genoprettet');
        });

        s.on('reconnect_failed', () => {
            isConnected.set(false);
            toast.error('Kunne ikke genoprette forbindelse. Genindlæs siden.');
        });

        // Message events
        if (callbacks.onNewMessage) s.on(SOCKET_EVENTS.NEW_MESSAGE, callbacks.onNewMessage);
        if (callbacks.onMessageEdited) s.on(SOCKET_EVENTS.MESSAGE_EDITED, callbacks.onMessageEdited);
        if (callbacks.onMessageDeleted) s.on(SOCKET_EVENTS.MESSAGE_DELETED, callbacks.onMessageDeleted);

        // Typing events
        if (callbacks.onUserTyping) s.on(SOCKET_EVENTS.USER_TYPING, callbacks.onUserTyping);
        if (callbacks.onUserStoppedTyping) s.on(SOCKET_EVENTS.USER_STOPPED_TYPING, callbacks.onUserStoppedTyping);
    }

    function joinRoom(hyggesnakId) {
        currentRoom.set(hyggesnakId);
        const s = get(socket);
        if (!s || !s.connected) return;
        s.emit(SOCKET_EVENTS.JOIN_HYGGESNAK, hyggesnakId);
    }

    function leaveRoom() {
        const s = get(socket);
        const room = get(currentRoom);
        if (!s || !s.connected || !room) return;
        s.emit(SOCKET_EVENTS.LEAVE_HYGGESNAK, room);
        currentRoom.set(null);
    }

    function emitTyping() {
        const s = get(socket);
        const room = get(currentRoom);
        if (!s || !s.connected || !room) return;
        s.emit(SOCKET_EVENTS.TYPING, { hyggesnakId: room });
    }

    function emitStoppedTyping() {
        const s = get(socket);
        const room = get(currentRoom);
        if (!s || !s.connected || !room) return;
        s.emit(SOCKET_EVENTS.STOP_TYPING, { hyggesnakId: room });
    }

    function emit(event, data, callback) {
        const s = get(socket);
        if (!s || !s.connected) {
            console.error('Cannot emit event: socket not connected');
            if (callback) callback({ error: 'Socket not connected' });
            return;
        }
        s.emit(event, data, callback);
    }

    function on(event, handler) {
        const s = get(socket);
        if (!s) {
            console.warn('Cannot add event listener: socket not initialized');
            return;
        }
        s.on(event, handler);
    }

    function off(event, handler) {
        const s = get(socket);
        if (!s) return;
        s.off(event, handler);
    }

    function destroy() {
        leaveRoom();
        const s = get(socket);
        if (s) disconnectSocket(s);
        socket.set(null);
        isConnected.set(false);
        currentRoom.set(null);
    }

    return {
        socket,
        isConnected,
        currentRoom,
        connect,
        joinRoom,
        leaveRoom,
        emitTyping,
        emitStoppedTyping,
        emit,
        on,
        off,
        destroy
    };
}