<script>
    //==== Reusable Avatar Component ====//

    import { getInitials } from '../utils/avatar.js';
    import { sanitizeDisplayName } from '../utils/sanitize.js';

    let {
        name = '',
        showCrown = false,
        size = 'medium', // 'small', 'medium', 'large'
        color = null, // Optional custom color, otherwise generated from name or online status
        isOnline = false // Online status indicator
    } = $props();

    // Size mapping
    const sizeMap = {
        small: { width: '32px', fontSize: '0.875rem' },
        medium: { width: '40px', fontSize: '1rem' },
        large: { width: '50px', fontSize: '1.25rem' }
    };

    // Get sanitized initials
    const initials = $derived(getInitials(sanitizeDisplayName(name)));

    // Determine avatar color based on custom color, online status, or generated from name
    const avatarColor = $derived(
        color
            ? color
            : isOnline
                ? 'var(--color-success)'
                : 'var(--color-text-muted)'
    );

    // Get size styles
    const sizeStyle = $derived(sizeMap[size] || sizeMap.medium);
</script>

<div
    class="avatar"
    class:online={isOnline}
    style="
        width: {sizeStyle.width};
        height: {sizeStyle.width};
        font-size: {sizeStyle.fontSize};
        background-color: {avatarColor};
    "
    title={sanitizeDisplayName(name)}
>
    {initials}
    {#if showCrown}
        <span class="crown" title="Ejer">👑</span>
    {/if}
</div>

<style>
    .avatar {
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 50%;
        color: white;
        font-weight: 600;
        text-transform: uppercase;
        position: relative;
        flex-shrink: 0;
        user-select: none;
    }

    .crown {
        position: absolute;
        top: -4px;
        right: -4px;
        font-size: 1rem;
        filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.2));
        pointer-events: none;
    }
</style>
