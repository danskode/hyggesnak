<script>
    import { sanitizeMessage, sanitizeDisplayName } from '../utils/sanitize.js';
    import { MESSAGE_MAX_LENGTH } from '../utils/constants.js';

    let {
        messages = [],
        currentUserId = null,
        onEditMessage = () => {},
        onDeleteMessage = () => {},
        messagesContainerRef = $bindable(null)
    } = $props();

    let editingMessageId = $state(null);
    let editContent = $state('');

    // Memoize formatted times to avoid recalculating on every render
    let formattedMessages = $derived(
        messages.map(msg => ({
            ...msg,
            formattedTime: formatTime(msg.created_at),
            isOwn: msg.user_id === currentUserId,
            sanitizedDisplayName: sanitizeDisplayName(msg.display_name || msg.username),
            sanitizedContent: sanitizeMessage(msg.content)
        }))
    );

    function formatTime(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diffInHours = (now - date) / (1000 * 60 * 60);

        if (diffInHours < 24) {
            return date.toLocaleTimeString('da-DK', {
                hour: '2-digit',
                minute: '2-digit'
            });
        } else {
            return date.toLocaleDateString('da-DK', {
                day: '2-digit',
                month: '2-digit',
                year: '2-digit'
            }) + ' ' + date.toLocaleTimeString('da-DK', {
                hour: '2-digit',
                minute: '2-digit'
            });
        }
    }

    function startEditMessage(message) {
        editingMessageId = message.id;
        editContent = message.content;
    }

    function cancelEditMessage() {
        editingMessageId = null;
        editContent = '';
    }

    async function saveEditMessage(messageId) {
        if (!editContent.trim()) {
            return;
        }

        if (editContent.length > MESSAGE_MAX_LENGTH) {
            return;
        }

        await onEditMessage(messageId, editContent.trim());
        cancelEditMessage();
    }

    async function handleDeleteMessage(messageId) {
        if (!confirm('Er du sikker på, at du vil slette denne besked?')) {
            return;
        }

        await onDeleteMessage(messageId);
    }
</script>

<div class="messages" bind:this={messagesContainerRef}>
    {#if formattedMessages.length === 0}
        <div class="empty-state">
            <p>Ingen beskeder endnu</p>
            <p>Vær den første til at skrive!</p>
        </div>
    {:else}
        {#each formattedMessages as message (message.id)}
            <div class="message" class:own={message.isOwn} class:deleted={message.is_deleted}>
                <div class="message-content">
                    <div class="message-header">
                        <strong>{message.sanitizedDisplayName}</strong>
                        <span class="time">{message.formattedTime}</span>
                    </div>

                    {#if editingMessageId === message.id}
                        <!-- Edit Mode -->
                        <div class="edit-mode">
                            <textarea
                                bind:value={editContent}
                                maxlength={MESSAGE_MAX_LENGTH}
                                placeholder="Redigér din besked..."
                            ></textarea>
                            <div class="edit-actions">
                                <button
                                    type="button"
                                    class="btn btn-success btn-sm"
                                    onclick={() => saveEditMessage(message.id)}
                                >
                                    Gem
                                </button>
                                <button
                                    type="button"
                                    class="btn btn-secondary btn-sm"
                                    onclick={cancelEditMessage}
                                >
                                    Annullér
                                </button>
                            </div>
                        </div>
                    {:else}
                        <!-- View Mode -->
                        <div class="message-text" class:deleted-text={message.is_deleted}>
                            {message.sanitizedContent}
                        </div>

                        {#if message.edited_at && !message.is_deleted}
                            <div class="edited-indicator">
                                (redigeret)
                            </div>
                        {/if}
                    {/if}
                </div>

                <!-- Edit/Delete buttons for own messages -->
                {#if message.isOwn && !message.is_deleted && editingMessageId !== message.id}
                    <div class="message-actions">
                        <button
                            class="btn btn-icon btn-scale"
                            onclick={() => startEditMessage(message)}
                            title="Redigér besked"
                        >
                            ✏️
                        </button>
                        <button
                            class="btn btn-icon btn-scale"
                            onclick={() => handleDeleteMessage(message.id)}
                            title="Slet besked"
                        >
                            🗑️
                        </button>
                    </div>
                {/if}
            </div>
        {/each}
    {/if}
</div>

<style>
    @import './MessageList.css';
</style>
