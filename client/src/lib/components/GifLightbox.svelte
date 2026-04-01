<script>
    import './GifLightbox.css';

    let {
        src = null,
        onClose = () => {}
    } = $props();

    let dialog = $state(null);
    let touchStartY = 0;

    $effect(() => {
        if (src && dialog) {
            dialog.showModal();
        } else if (!src && dialog && dialog.open) {
            dialog.close();
        }
    });

    function handleBackdropClick(e) {
        if (e.target === dialog) {
            dialog.close();
        }
    }

    function handleTouchStart(e) {
        touchStartY = e.touches[0].clientY;
    }

    function handleTouchEnd(e) {
        const delta = e.changedTouches[0].clientY - touchStartY;
        if (delta > 80) {
            dialog.close();
        }
    }
</script>

<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<dialog
    class="gif-lightbox-dialog"
    bind:this={dialog}
    onclose={onClose}
    onclick={handleBackdropClick}
    ontouchstart={handleTouchStart}
    ontouchend={handleTouchEnd}
>
    {#if src}
        <img {src} alt="GIF" class="lightbox-gif" />
    {/if}
</dialog>
