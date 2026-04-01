<script>
    import './GifPicker.css';
    import { apiGet } from '../api/api.js';
    import { API_ENDPOINTS } from '../utils/constants.js';

    let {
        onSelectGif = () => {},
        disabled = false
    } = $props();

    let isOpen = $state(false);
    let searchQuery = $state('');
    let gifs = $state([]);
    let loading = $state(false);
    let error = $state(null);
    let debounceTimer = null;
    let wrapperEl = $state(null);

    async function fetchTrending() {
        loading = true;
        error = null;
        try {
            const result = await apiGet(API_ENDPOINTS.GIF_TRENDING);
            gifs = result.data || [];
        } catch (err) {
            error = 'Kunne ikke hente GIFs';
        } finally {
            loading = false;
        }
    }

    async function fetchSearch(q) {
        loading = true;
        error = null;
        try {
            const result = await apiGet(API_ENDPOINTS.GIF_SEARCH(q));
            gifs = result.data || [];
        } catch (err) {
            error = 'Søgning fejlede';
        } finally {
            loading = false;
        }
    }

    function handleSearchInput() {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            if (searchQuery.trim().length > 0) {
                fetchSearch(searchQuery.trim());
            } else {
                fetchTrending();
            }
        }, 400);
    }

    function toggle() {
        isOpen = !isOpen;
        if (isOpen) {
            searchQuery = '';
            fetchTrending();
        }
    }

    function selectGif(gif) {
        onSelectGif(gif.url);
        isOpen = false;
        searchQuery = '';
    }

    function handleKeydown(e) {
        if (e.key === 'Escape' && isOpen) {
            isOpen = false;
        }
    }

    function handleOutsideClick(e) {
        if (wrapperEl && !wrapperEl.contains(e.target)) {
            isOpen = false;
        }
    }

    $effect(() => {
        if (isOpen) {
            document.addEventListener('keydown', handleKeydown);
            document.addEventListener('click', handleOutsideClick);
        }
        return () => {
            document.removeEventListener('keydown', handleKeydown);
            document.removeEventListener('click', handleOutsideClick);
        };
    });

    $effect(() => {
        return () => clearTimeout(debounceTimer);
    });
</script>

<div class="gif-picker-wrapper" bind:this={wrapperEl}>
    <button
        type="button"
        class="btn btn-secondary"
        class:active={isOpen}
        onclick={toggle}
        {disabled}
        title="Send GIF"
    >
        GIF
    </button>

    {#if isOpen}
        <div class="gif-panel">
            <div class="gif-search">
                <input
                    type="search"
                    placeholder="Søg GIFs..."
                    bind:value={searchQuery}
                    oninput={handleSearchInput}
                />
            </div>

            {#if loading}
                <div class="gif-status">Indlæser...</div>
            {:else if error}
                <div class="gif-status">{error}</div>
            {:else if gifs.length === 0}
                <div class="gif-status">Ingen GIFs fundet</div>
            {:else}
                <div class="gif-grid">
                    {#each gifs as gif (gif.id)}
                        <button
                            type="button"
                            class="gif-item"
                            onclick={() => selectGif(gif)}
                            title={gif.description}
                        >
                            <img src={gif.preview_url} alt={gif.description} loading="lazy" />
                        </button>
                    {/each}
                </div>
            {/if}

            <div class="gif-attribution">GIFs fra heypster</div>
        </div>
    {/if}
</div>
