<script>
    import { onMount } from 'svelte';
    import { navigate } from 'svelte-routing';
    import { toast } from 'svelte-sonner';
    import { auth } from '../../stores/authStore.svelte.js';
    import { currentHyggesnak } from '../../stores/hyggesnakStore.svelte.js';
    import { useSocket } from '../../lib/useSocket.svelte.js';
    import { apiGet, apiPost, apiPut, apiDelete } from '../../lib/api.js';
    import { API_ENDPOINTS } from '../../lib/constants.js';
    import MessageList from '../../components/MessageList.svelte';
    import MessageInput from '../../components/MessageInput.svelte';
    import MemberSidebar from '../../components/MemberSidebar.svelte';

    // Get hyggesnakId from store
    let hyggesnakId = $derived($currentHyggesnak?.id);

    // State
    let hyggesnak = $state(null);
    let members = $state([]);
    let messages = $state([]);
    let loading = $state(true);
    let sending = $state(false);
    let messagesContainer = $state(null);
    let typingUsers = $state([]);
    let typingTimeouts = $state(new Map());

    // Socket setup with callbacks
    const socket = useSocket({
        onNewMessage: (message) => {
            // Don't add duplicate if it's from current user (already added optimistically)
            if (message.user_id !== $auth.id) {
                messages = [...messages, message];
                scrollToBottom();
            }
        },
        onMessageEdited: (editedMessage) => {
            messages = messages.map(msg =>
                msg.id === editedMessage.id ? editedMessage : msg
            );
        },
        onMessageDeleted: (messageId) => {
            const numericMessageId = parseInt(messageId, 10);
            messages = messages.map(msg => {
                if (msg.id === numericMessageId) {
                    return { ...msg, is_deleted: true, content: '[Slettet]' };
                }
                return msg;
            });
        },
        onUserTyping: ({ username }) => {
            if (username !== $auth.username) {
                // Clear existing timeout for this user
                if (typingTimeouts.has(username)) {
                    clearTimeout(typingTimeouts.get(username));
                }

                // Add user to typing array
                if (!typingUsers.includes(username)) {
                    typingUsers = [...typingUsers, username];
                }

                // Set new timeout for this user
                const timeout = setTimeout(() => {
                    typingUsers = typingUsers.filter(u => u !== username);
                    typingTimeouts.delete(username);
                }, 4000);

                typingTimeouts.set(username, timeout);
            }
        },
        onUserStoppedTyping: ({ username }) => {
            // Clear any existing timeout
            if (typingTimeouts.has(username)) {
                clearTimeout(typingTimeouts.get(username));
                typingTimeouts.delete(username);
            }

            typingUsers = typingUsers.filter(u => u !== username);
        }
    });

    onMount(async () => {
        if (!hyggesnakId) {
            toast.error('Ingen hyggesnak valgt');
            navigate('/hyggesnakke');
            return;
        }

        await loadHyggesnak();
        await loadMembers();
        await loadMessages();
        scrollToBottom();

        // Connect socket and join room
        socket.connect();
        socket.joinRoom(hyggesnakId);
    });

    async function loadHyggesnak() {
        try {
            const result = await apiGet(`${API_ENDPOINTS.HYGGESNAKKE}/${hyggesnakId}`);
            hyggesnak = result.data;
        } catch (err) {
            console.error(err);
            if (err.status === 403) {
                toast.error('Du har ikke adgang til denne hyggesnak');
                navigate('/hyggesnakke');
            }
        }
    }

    async function loadMembers() {
        try {
            const result = await apiGet(`${API_ENDPOINTS.HYGGESNAKKE}/${hyggesnakId}/members`);
            members = result.data;
        } catch (err) {
            console.error(err);
        }
    }

    async function loadMessages() {
        try {
            const result = await apiGet(`${API_ENDPOINTS.HYGGESNAKKE}/${hyggesnakId}/messages?limit=50`);
            // Process messages to show [Slettet] for deleted messages
            messages = result.data.map(msg => {
                if (msg.is_deleted) {
                    return { ...msg, content: '[Slettet]' };
                }
                return msg;
            }).reverse(); // Reverse to show oldest first
        } catch (err) {
            console.error(err);
        } finally {
            loading = false;
        }
    }

    async function sendMessage(content) {
        if (sending) return;

        sending = true;

        try {
            const result = await apiPost(
                `${API_ENDPOINTS.HYGGESNAKKE}/${hyggesnakId}/messages`,
                { content }
            );

            // Add message optimistically
            messages = [...messages, result.data];
            scrollToBottom();
        } catch (err) {
            console.error(err);
        } finally {
            sending = false;
        }
    }

    async function editMessage(messageId, content) {
        try {
            const result = await apiPut(
                `/api/messages/${messageId}`,
                { content }
            );

            // Update message locally
            messages = messages.map(msg =>
                msg.id === messageId ? result.data : msg
            );

            toast.success('Besked redigeret');
        } catch (err) {
            console.error(err);
        }
    }

    async function deleteMessage(messageId) {
        try {
            await apiDelete(`/api/messages/${messageId}`);

            // Update message locally (soft delete)
            messages = messages.map(msg =>
                msg.id === messageId ? { ...msg, is_deleted: true, content: '[Slettet]' } : msg
            );

            toast.success('Beskeden er slettet');
        } catch (err) {
            console.error(err);
        }
    }

    function scrollToBottom() {
        if (messagesContainer) {
            setTimeout(() => {
                messagesContainer.scrollTop = messagesContainer.scrollHeight;
            }, 50);
        }
    }

    async function removeMember(memberId) {
        try {
            await apiDelete(`${API_ENDPOINTS.HYGGESNAKKE}/${hyggesnakId}/members/${memberId}`);

            // Remove from local state
            members = members.filter(m => m.id !== memberId);
            toast.success('Medlem fjernet fra chatten');
        } catch (err) {
            console.error(err);
        }
    }

    // Cleanup typing timeouts on unmount
    $effect(() => {
        return () => {
            // Clear all typing timeouts when component unmounts
            typingTimeouts.forEach(timeout => clearTimeout(timeout));
            typingTimeouts.clear();
        };
    });

    function handleTyping() {
        socket.emitTyping();
    }

    function handleStopTyping() {
        socket.emitStoppedTyping();
    }
</script>

<div class="chat-page">
    {#if loading}
        <div class="loading">Indlæser chat...</div>
    {:else if !hyggesnak}
        <div class="error">Hmm, hyggesnakken er væk?!</div>
    {:else}
        <div class="chat-header">
            <button class="back-button" onclick={() => navigate('/hyggesnakke')}>
                ← Tilbage
            </button>
            <h2>{hyggesnak.display_name}</h2>
        </div>

        <div class="chat-container">
            <!-- Messages Area -->
            <MessageList
                {messages}
                currentUserId={$auth.id}
                onEditMessage={editMessage}
                onDeleteMessage={deleteMessage}
                bind:messagesContainerRef={messagesContainer}
            />

            <!-- Members Sidebar -->
            <MemberSidebar
                {members}
                currentUserId={$auth.id}
                currentUserRole={hyggesnak?.user_role}
                {hyggesnakId}
                onRemoveMember={removeMember}
                onInviteSent={loadMembers}
            />
        </div>

        <!-- Message Input -->
        <MessageInput
            onSend={sendMessage}
            onTyping={handleTyping}
            onStopTyping={handleStopTyping}
            {sending}
            disabled={!socket.isConnected}
            {typingUsers}
        />

        <!-- Connection status indicator -->
        {#if !socket.isConnected}
            <div class="connection-status">
                Ingen forbindelse til serveren...
            </div>
        {/if}
    {/if}
</div>

<style>
    .chat-page {
        display: flex;
        flex-direction: column;
        height: calc(90vh - 120px);
        max-width: 1400px;
        margin: 0 auto;
        background: white;
        border-radius: 12px;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        overflow: hidden;
    }

    .loading,
    .error {
        display: flex;
        align-items: center;
        justify-content: center;
        height: 100%;
        font-size: 1.125rem;
        color: var(--color-text-secondary);
    }

    .chat-header {
        display: flex;
        align-items: center;
        gap: var(--space-4);
        padding: var(--space-4) var(--space-6);
        background: var(--gradient-primary);
        color: white;
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    }

    .back-button {
        background: rgba(255, 255, 255, 0.2);
        border: none;
        color: white;
        font-size: 1rem;
        cursor: pointer;
        padding: var(--space-2) var(--space-4);
        border-radius: var(--radius-lg);
        transition: all var(--transition-base);
        font-weight: 500;
    }

    .back-button:hover {
        background: rgba(255, 255, 255, 0.3);
        transform: translateX(-2px);
    }

    h2 {
        margin: 0;
        font-size: 1.5rem;
        font-weight: 600;
    }

    .chat-container {
        display: flex;
        flex: 1;
        overflow: hidden;
    }

    /* Invite functionality integrated into MembersSidebar.svelte */

    .connection-status {
        padding: var(--space-2) var(--space-4);
        background: #fff3cd;
        color: #856404;
        text-align: center;
        font-size: 0.875rem;
        font-weight: 500;
        border-top: 1px solid #ffc107;
    }

    @media (max-width: 768px) {
        .chat-page {
            height: 70vh;
            border-radius: 0;
            max-width: 100%;
        }
    }
</style>
