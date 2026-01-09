<script>
    import { MESSAGE_MAX_LENGTH } from '../utils/constants';

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
                class="btn btn-primary btn-wide"
                class:btn-loading={sending}
                disabled={sending || disabled || !value.trim() || isOverLimit}
            >
                Send
            </button>
        </div>
    </form>
</div>

<style>
    @import './MessageInput.css';
</style>
