<script>
    import './MessageList.css';
    import { sanitizeMessage, sanitizeDisplayName } from '../utils/sanitize.js';
    import { MESSAGE_MAX_LENGTH } from '../utils/constants.js';
    import GifLightbox from './GifLightbox.svelte';

    let lightboxSrc = $state(null);

    function openLightbox(src) {
        lightboxSrc = src;
    }

    let {
        messages = [],
        currentUserId = null,
        onEditMessage = () => {},
        onDeleteMessage = () => {},
        messagesContainerRef = $bindable(null)
    } = $props();

    let editingMessageId = $state(null);
    let editContent = $state('');
    let swipedMessageId = $state(null);
    let swipeTouchStartX = 0;

    function handleMsgTouchStart(e, msgId) {
        swipeTouchStartX = e.touches[0].clientX;
    }

    function handleMsgTouchEnd(e, msgId) {
        const delta = e.changedTouches[0].clientX - swipeTouchStartX;
        if (delta < -40) {
            swipedMessageId = msgId;
        } else if (delta > 20) {
            swipedMessageId = null;
        }
    }

    // Memoize formatted times to avoid recalculating on every render
    let formattedMessages = $derived(
        messages.map(msg => ({
            ...msg,
            formattedTime: formatTime(msg.created_at),
            isOwn: msg.user_id === currentUserId,
            sanitizedDisplayName: sanitizeDisplayName(msg.display_name || msg.username),
            sanitizedContent: msg.message_type === 'gif' ? msg.content : sanitizeMessage(msg.content),
            isGif: msg.message_type === 'gif'
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

<GifLightbox src={lightboxSrc} onClose={() => lightboxSrc = null} />

<div class="messages" bind:this={messagesContainerRef} onclick={() => swipedMessageId = null}>
    {#if formattedMessages.length === 0}
        <div class="empty-state">
            <p>Ingen beskeder endnu</p>
            <p>Vær den første til at skrive!</p>
        </div>
    {:else}
        {#each formattedMessages as message (message.id)}
            {#if message.isOwn && !message.is_deleted && editingMessageId !== message.id}
                <div
                    class="message-swipe-wrapper"
                    class:swiped-left={swipedMessageId === message.id}
                    ontouchstart={(e) => handleMsgTouchStart(e, message.id)}
                    ontouchend={(e) => handleMsgTouchEnd(e, message.id)}
                >
                    <div class="message own">
                        <div class="message-content">
                            <div class="message-header">
                                <strong>{message.sanitizedDisplayName}</strong>
                                <span class="time">{message.formattedTime}</span>
                            </div>
                            {#if message.isGif}
                                <div class="message-gif">
                                    <button
                                        type="button"
                                        class="gif-message-btn"
                                        onclick={() => openLightbox(message.sanitizedContent)}
                                        title="Klik for at se GIF"
                                    >
                                        <img src={message.sanitizedContent} alt="GIF" loading="lazy" />
                                    </button>
                                </div>
                            {:else}
                                <div class="message-text">
                                    {message.sanitizedContent}
                                </div>
                                {#if message.edited_at}
                                    <div class="edited-indicator">(redigeret)</div>
                                {/if}
                            {/if}
                        </div>
                        <div class="message-actions">
                            {#if !message.isGif}
                                <button
                                    class="btn btn-icon btn-scale"
                                    onclick={() => startEditMessage(message)}
                                    title="Redigér besked"
                                >
                                    ✏️
                                </button>
                            {/if}
                            <button
                                class="btn btn-icon btn-scale"
                                onclick={() => handleDeleteMessage(message.id)}
                                title="Slet besked"
                            >
                                🗑️
                            </button>
                        </div>
                    </div>
                    <div class="swipe-action-reveal">
                        {#if !message.isGif}
                            <button
                                class="btn btn-icon"
                                onclick={() => { swipedMessageId = null; startEditMessage(message); }}
                                title="Redigér besked"
                            >
                                ✏️
                            </button>
                        {/if}
                        <button
                            class="btn btn-icon btn-danger"
                            onclick={() => { swipedMessageId = null; handleDeleteMessage(message.id); }}
                            title="Slet besked"
                        >
                            🗑️
                        </button>
                    </div>
                </div>
            {:else}
                <div class="message" class:own={message.isOwn} class:deleted={message.is_deleted}>
                    <div class="message-content">
                        <div class="message-header">
                            <strong>{message.sanitizedDisplayName}</strong>
                            <span class="time">{message.formattedTime}</span>
                        </div>

                        {#if editingMessageId === message.id}
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
                        {:else if message.isGif && !message.is_deleted}
                            <div class="message-gif">
                                <button
                                    type="button"
                                    class="gif-message-btn"
                                    onclick={() => openLightbox(message.sanitizedContent)}
                                    title="Klik for at se GIF"
                                >
                                    <img src={message.sanitizedContent} alt="GIF" loading="lazy" />
                                </button>
                            </div>
                        {:else}
                            <div class="message-text" class:deleted-text={message.is_deleted}>
                                {message.sanitizedContent}
                            </div>
                            {#if message.edited_at && !message.is_deleted}
                                <div class="edited-indicator">(redigeret)</div>
                            {/if}
                        {/if}
                    </div>
                </div>
            {/if}
        {/each}
    {/if}
</div>

