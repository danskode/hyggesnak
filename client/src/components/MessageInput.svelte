<script>
    import { MESSAGE_MAX_LENGTH } from '../lib/constants.js';

    let {
        value = '',
        onSend = () => {},
        onTyping = () => {},
        onStopTyping = () => {},
        sending = false,
        disabled = false,
        typingUsers = []
    } = $props();

    let isTyping = $state(false);
    let lastTypingEmit = $state(0);
    let typingTimeout = $state(null);

    function handleInput(event) {
        value = event.target.value;

        const now = Date.now();

        // Emit typing event if:
        // 1. Not already typing (first keypress), OR
        // 2. More than 2 seconds since last emit (keep indicator alive)
        if (!isTyping || (now - lastTypingEmit) > 2000) {
            onTyping();
            isTyping = true;
            lastTypingEmit = now;
        }

        // Clear existing timeout
        if (typingTimeout) {
            clearTimeout(typingTimeout);
        }

        // Stop typing after 3 seconds of inactivity
        typingTimeout = setTimeout(() => {
            onStopTyping();
            isTyping = false;
        }, 3000);
    }

    function handleFocus() {
        if (!isTyping) {
            onTyping();
            isTyping = true;
            lastTypingEmit = Date.now();
        }
    }

    function handleBlur() {
        if (typingTimeout) {
            clearTimeout(typingTimeout);
        }
        if (isTyping) {
            onStopTyping();
            isTyping = false;
        }
    }

    async function handleSubmit(event) {
        event.preventDefault();

        if (!value.trim() || sending) return;

        // Stop typing indicator before sending
        if (isTyping) {
            onStopTyping();
            isTyping = false;
        }

        await onSend(value.trim());
        value = ''; // Clear input after sending
    }

    $effect(() => {
        return () => {
            // Cleanup on destroy
            if (typingTimeout) {
                clearTimeout(typingTimeout);
            }
        };
    });

    let charCount = $derived(value.length);
    let isNearLimit = $derived(charCount > MESSAGE_MAX_LENGTH * 0.9);
    let isOverLimit = $derived(charCount > MESSAGE_MAX_LENGTH);
</script>

<div class="message-input-container">
    {#if typingUsers.length > 0}
        <div class="typing-indicator">
            {#if typingUsers.length === 1}
                <span class="typing-text">{typingUsers[0]} skriver...</span>
            {:else if typingUsers.length === 2}
                <span class="typing-text">{typingUsers[0]} og {typingUsers[1]} skriver...</span>
            {:else}
                <span class="typing-text">{typingUsers.length} personer skriver...</span>
            {/if}
            <span class="typing-dots">
                <span class="dot"></span>
                <span class="dot"></span>
                <span class="dot"></span>
            </span>
        </div>
    {/if}

    <form class="message-input" onsubmit={handleSubmit}>
        <input
            type="text"
            bind:value
            oninput={handleInput}
            onfocus={handleFocus}
            onblur={handleBlur}
            placeholder="Skriv en besked..."
            maxlength={MESSAGE_MAX_LENGTH}
            {disabled}
        />

        <div class="input-footer">
            <span class="char-count" class:warning={isNearLimit} class:error={isOverLimit}>
                {charCount} / {MESSAGE_MAX_LENGTH}
            </span>

            <button
                type="submit"
                disabled={sending || disabled || !value.trim() || isOverLimit}
                class="send-btn"
            >
                {#if sending}
                    Sender...
                {:else}
                    Send
                {/if}
            </button>
        </div>
    </form>
</div>

<style>
    .message-input-container {
        border-top: 1px solid var(--color-border);
        background: var(--color-card-bg);
    }

    .typing-indicator {
        padding: var(--space-2) var(--space-4);
        background: var(--color-bg-secondary);
        border-bottom: 1px solid var(--color-border);
        display: flex;
        align-items: center;
        gap: var(--space-2);
        font-size: 0.875rem;
        color: var(--color-text-secondary);
    }

    .typing-text {
        font-style: italic;
    }

    .typing-dots {
        display: inline-flex;
        gap: var(--space-1);
    }

    .dot {
        width: 4px;
        height: 4px;
        background: var(--color-text-secondary);
        border-radius: var(--radius-full);
        animation: bounce 1.4s infinite ease-in-out both;
    }

    .dot:nth-child(1) {
        animation-delay: -0.32s;
    }

    .dot:nth-child(2) {
        animation-delay: -0.16s;
    }

    /* Animation is now global in app.css */

    .message-input {
        padding: var(--space-4);
        display: flex;
        flex-direction: column;
        gap: var(--space-2);
    }

    .message-input input {
        flex: 1;
        /* Global input styles from app.css apply */
    }

    .message-input input:disabled {
        background: var(--color-bg-secondary);
        cursor: not-allowed;
    }

    .input-footer {
        display: flex;
        justify-content: space-between;
        align-items: center;
    }

    .char-count {
        font-size: 0.75rem;
        color: var(--color-text-secondary);
        transition: color var(--transition-base);
    }

    .char-count.warning {
        color: #ffc107;
        font-weight: 600;
    }

    .char-count.error {
        color: var(--color-error);
        font-weight: 700;
    }

    .send-btn {
        padding: var(--space-2) var(--space-6);
        background: var(--gradient-primary);
        color: white;
        border: none;
        border-radius: var(--radius-lg);
        font-size: 1rem;
        font-weight: 600;
        cursor: pointer;
        transition: all var(--transition-base);
        box-shadow: var(--shadow-md);
    }

    .send-btn:hover:not(:disabled) {
        transform: translateY(-1px);
        box-shadow: var(--shadow-lg);
    }

    .send-btn:active:not(:disabled) {
        transform: translateY(0);
    }

    .send-btn:disabled {
        background: var(--color-text-secondary);
        cursor: not-allowed;
        opacity: 0.6;
        box-shadow: none;
    }
</style>
