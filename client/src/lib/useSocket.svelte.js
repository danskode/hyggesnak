import { onDestroy } from 'svelte';
import { toast } from 'svelte-sonner';
import { createSocket, disconnectSocket } from './socket.js';
import { SOCKET_EVENTS } from './constants.js';

//============= Composable hook for managing Socket.IO connections in Svelte components =============//

export function useSocket(callbacks = {}) {
    let socket = $state(null);
    let isConnected = $state(false);
    let currentRoom = $state(null);

    // Initialize socket connection and set up event listeners
    function connect() {
        if (socket) {
            return;
        }

        socket = createSocket();

        // Set initial connection state
        isConnected = socket.connected;

        // Connection events
        socket.on('connect', () => {
            isConnected = true;

            // Rejoin room if we were in one
            if (currentRoom) {
                joinRoom(currentRoom);
            }
        });

        socket.on('connect_error', (err) => {
            isConnected = false;

            if (err.message.includes('Authentication')) {
                toast.error('Autentificeringsfejl - log venligst ind igen');
            } else {
                toast.error(`Forbindelsesfejl: ${err.message}`);
            }
        });

        socket.on('disconnect', (reason) => {
            isConnected = false;

            if (reason === 'io server disconnect') {
                toast.error('Forbindelsen blev afbrudt af serveren');
            }
        });

        socket.on('error', (error) => {
            toast.error(error.message || 'En fejl opstod i chatten');
        });

        socket.on('reconnect', (attemptNumber) => {
            isConnected = true;
            toast.success('Forbindelse genoprettet');
        });

        socket.on('reconnect_failed', () => {
            isConnected = false;
            toast.error('Kunne ikke genoprette forbindelse. Genindlæs siden.');
        });

        // Message events
        if (callbacks.onNewMessage) {
            socket.on(SOCKET_EVENTS.NEW_MESSAGE, callbacks.onNewMessage);
        }

        if (callbacks.onMessageEdited) {
            socket.on(SOCKET_EVENTS.MESSAGE_EDITED, callbacks.onMessageEdited);
        }

        if (callbacks.onMessageDeleted) {
            socket.on(SOCKET_EVENTS.MESSAGE_DELETED, callbacks.onMessageDeleted);
        }

        // Typing events
        if (callbacks.onUserTyping) {
            socket.on(SOCKET_EVENTS.USER_TYPING, callbacks.onUserTyping);
        }

        if (callbacks.onUserStoppedTyping) {
            socket.on(SOCKET_EVENTS.USER_STOPPED_TYPING, callbacks.onUserStoppedTyping);
        }
    }

    // Join a hyggesnak chatroom

    function joinRoom(hyggesnakId) {
        // Always set the current room, even if not connected yet
        currentRoom = hyggesnakId;

        if (!socket || !socket.connected) {
            return;
        }

        socket.emit(SOCKET_EVENTS.JOIN_HYGGESNAK, hyggesnakId);
    }

    // Leave current hyggesnak chatroom
    function leaveRoom() {
        if (!socket || !socket.connected || !currentRoom) {
            return;
        }

        socket.emit(SOCKET_EVENTS.LEAVE_HYGGESNAK, currentRoom);
        currentRoom = null;
    }

    // Emit typing indicator
    function emitTyping() {
        if (!socket || !socket.connected || !currentRoom) {
            return;
        }

        socket.emit(SOCKET_EVENTS.TYPING, { hyggesnakId: currentRoom });
    }

    // Emit stopped typing indicator
    function emitStoppedTyping() {
        if (!socket || !socket.connected || !currentRoom) {
            return;
        }

        socket.emit(SOCKET_EVENTS.STOP_TYPING, { hyggesnakId: currentRoom });
    }

    // Emit a custom event
    function emit(event, data, callback) {
        if (!socket || !socket.connected) {
            console.error('Cannot emit event: socket not connected');
            if (callback) callback({ error: 'Socket not connected' });
            return;
        }

        socket.emit(event, data, callback);
    }

    // Listen to a custom event
    function on(event, handler) {
        if (!socket) {
            console.warn('Cannot add event listener: socket not initialized');
            return;
        }

        socket.on(event, handler);
    }

    //Remove event listener
    function off(event, handler) {
        if (!socket) return;
        socket.off(event, handler);
    }

    // Cleanup method to be called by the Svelte component
    function destroy() {
        leaveRoom();
        disconnectSocket(socket);
        socket = null;
        isConnected = false;
        currentRoom = null;
    }

    return {
        // State
        get isConnected() { return isConnected; },
        get currentRoom() { return currentRoom; },

        // Methods
        connect,
        joinRoom,
        leaveRoom,
        emitTyping,
        emitStoppedTyping,
        emit,
        on,
        off,
        destroy // Expose destroy for manual cleanup
    };
}