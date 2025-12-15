<script>
    import { sanitizeMessage, sanitizeDisplayName } from '../lib/sanitize.js';
    import { MESSAGE_MAX_LENGTH } from '../lib/constants.js';

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
                                autofocus
                            ></textarea>
                            <div class="edit-actions">
                                <button
                                    type="button"
                                    class="save-btn"
                                    onclick={() => saveEditMessage(message.id)}
                                >
                                    Gem
                                </button>
                                <button
                                    type="button"
                                    class="cancel-btn"
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
                            class="action-btn edit-btn"
                            onclick={() => startEditMessage(message)}
                            title="Redigér besked"
                        >
                            ✏️
                        </button>
                        <button
                            class="action-btn delete-btn"
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
    .messages {
        flex: 1;
        overflow-y: auto;
        padding: var(--space-6);
        display: flex;
        flex-direction: column;
        gap: var(--space-4);
        background: var(--gradient-secondary);
    }

    .empty-state {
        /* Global .empty-state styles apply */
        text-align: center;
        color: var(--color-text-secondary);
        padding: var(--space-8);
    }

    .empty-state p:first-child {
        font-size: 1.2rem;
        font-weight: 600;
        margin-bottom: var(--space-2);
    }

    .empty-state p:last-child {
        font-size: 1rem;
        opacity: 0.8;
    }

    .message {
        display: flex;
        gap: var(--space-2);
        align-items: flex-start;
        max-width: 70%;
        animation: slideUp var(--transition-base) ease-out;
    }

    /* fadeIn animation now global in app.css, using slideUp for variation */

    .message.own {
        align-self: flex-end;
        flex-direction: row-reverse;
    }

    .message-content {
        background: var(--color-card-bg);
        padding: var(--space-3) var(--space-4);
        border-radius: 1rem;
        box-shadow: var(--shadow-sm);
        min-width: 120px;
    }

    .message.own .message-content {
        background: var(--gradient-primary);
        color: white;
    }

    .message.deleted .message-content {
        background: var(--color-bg-secondary);
        color: var(--color-text-secondary);
        font-style: italic;
        opacity: 0.7;
    }

    .message-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 0.25rem;
        gap: 1rem;
    }

    .message-header strong {
        font-size: 0.875rem;
        font-weight: 600;
    }

    .message.own .message-header strong {
        color: rgba(255, 255, 255, 0.9);
    }

    .time {
        font-size: 0.75rem;
        color: var(--color-text-secondary);
    }

    .message.own .time {
        color: rgba(255, 255, 255, 0.8);
    }

    .message-text {
        word-wrap: break-word;
        white-space: pre-wrap;
        line-height: 1.5;
        font-size: 0.95rem;
    }

    .deleted-text {
        font-style: italic;
        opacity: 0.7;
    }

    .edited-indicator {
        font-size: 0.75rem;
        color: var(--color-text-secondary);
        margin-top: var(--space-1);
        font-style: italic;
    }

    .message.own .edited-indicator {
        color: rgba(255, 255, 255, 0.7);
    }

    .message-actions {
        display: flex;
        flex-direction: column;
        gap: var(--space-1);
        opacity: 0;
        transition: opacity var(--transition-base);
    }

    .message:hover .message-actions {
        opacity: 1;
    }

    .action-btn {
        /* Similar to global .btn-icon */
        background: var(--color-card-bg);
        border: 1px solid var(--color-border);
        border-radius: var(--radius-lg);
        padding: var(--space-1) var(--space-2);
        cursor: pointer;
        font-size: 0.875rem;
        transition: all var(--transition-base);
    }

    .action-btn:hover {
        background: var(--color-bg-secondary);
        transform: scale(1.1);
    }

    .edit-mode {
        margin-top: var(--space-2);
    }

    .edit-mode textarea {
        /* Global textarea styles apply */
        width: 100%;
        min-height: 80px;
        resize: vertical;
    }

    .edit-actions {
        display: flex;
        gap: var(--space-2);
        margin-top: var(--space-2);
    }

    .save-btn,
    .cancel-btn {
        padding: var(--space-2) var(--space-3);
        border: none;
        border-radius: var(--radius-md);
        cursor: pointer;
        font-size: 0.875rem;
        font-weight: 500;
        transition: all var(--transition-base);
    }

    .save-btn {
        background: var(--color-success);
        color: white;
    }

    .save-btn:hover {
        background: var(--color-success-hover);
    }

    .cancel-btn {
        background: var(--color-text-secondary);
        color: white;
    }

    .cancel-btn:hover {
        opacity: 0.8;
    }
</style>
