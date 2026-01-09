<script>
    import { onMount } from 'svelte';
    import { navigate } from 'svelte-routing';
    import { toast } from 'svelte-sonner';
    import { auth } from '../../lib/stores/authStore.js';
    import { currentHyggesnak, hyggesnakke } from '../../lib/stores/hyggesnakStore.js';
    import { unreadCounts } from '../../lib/stores/unreadStore.js';
    import { useSocket } from '../../lib/composables/useSocket.js';
    import { apiGet, apiPost, apiPut, apiDelete } from '../../lib/api/api.js';
    import { API_ENDPOINTS } from '../../lib/utils/constants.js';
    import MessageList from '../../lib/components/MessageList.svelte';
    import MessageInput from '../../lib/components/MessageInput.svelte';
    import MemberSidebar from '../../lib/components/MemberSidebar.svelte';
    import './Chat.css';

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
                // Mark as read immediately since user is actively viewing this chat
                markAsRead();
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
                    return { ...msg, is_deleted: true, content: '(Beskeden er slettet)' };
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

    async function markAsRead() {
        if (!hyggesnakId) return;

        try {
            await apiPost(API_ENDPOINTS.MARK_READ(hyggesnakId), {});
            unreadCounts.reset(hyggesnakId);
        } catch (err) {
            console.error('Error marking as read:', err);
        }
    }

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

        // Mark messages as read when entering chat
        await markAsRead();

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
                    return { ...msg, content: '(Beskeden er slettet)' };
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

            // Add message
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

        } catch (err) {
            console.error(err);
        }
    }

    async function deleteMessage(messageId) {
        try {
            await apiDelete(`/api/messages/${messageId}`);

            // Update message locally (soft delete)
            messages = messages.map(msg =>
                msg.id === messageId ? { ...msg, is_deleted: true, content: '(slettet besked)' } : msg
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

    async function deleteHyggesnak() {
        const confirmed = window.confirm(
            `Er du sikker på at du vil slette "${hyggesnak.display_name}"?\n\nAlle beskeder vil blive slettet. Dette kan ikke fortrydes.`
        );
        if (!confirmed) return;

        try {
            await apiDelete(`${API_ENDPOINTS.HYGGESNAKKE}/${hyggesnakId}`);

            // Remove from store
            hyggesnakke.remove(hyggesnakId);
            currentHyggesnak.clear();

            // Navigate to hyggesnak list
            toast.success('Hyggesnak slettet');
            navigate('/hyggesnakke');
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
                onDeleteHyggesnak={deleteHyggesnak}
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
