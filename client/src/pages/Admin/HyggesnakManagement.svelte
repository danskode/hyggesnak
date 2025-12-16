<script>
    import { onMount } from 'svelte';
    import { toast } from 'svelte-sonner';
    import { apiGet, apiDelete } from '../../lib/api/api.js';
    import { API_ENDPOINTS } from '../../lib/utils/constants.js';

    let hyggesnakke = $state([]);
    let loading = $state(true);
    let page = $state(1);
    let totalPages = $state(1);
    let searchQuery = $state('');
    let selectedHyggesnak = $state(null);
    let loadingDetails = $state(false);
    let deleting = $state(null);

    async function loadHyggesnakke() {
        loading = true;
        try {
            const params = new URLSearchParams({
                page: page.toString(),
                limit: '20'
            });
            if (searchQuery) {
                params.append('search', searchQuery);
            }

            const result = await apiGet(`${API_ENDPOINTS.ADMIN_HYGGESNAKKE}?${params}`);
            hyggesnakke = result.data;
            totalPages = result.pagination.pages;
        } catch (err) {
            // Error is handled by apiGet - toast already shown
        } finally {
            loading = false;
        }
    }

    async function loadHyggesnakDetails(hyggesnakId) {
        loadingDetails = true;
        try {
            const result = await apiGet(`${API_ENDPOINTS.ADMIN_HYGGESNAKKE}/${hyggesnakId}`);
            selectedHyggesnak = result.data;
        } catch (err) {
            // Error is handled by apiGet - toast already shown
            selectedHyggesnak = null;
        } finally {
            loadingDetails = false;
        }
    }

    async function handleDeleteHyggesnak(hyggesnakId, displayName) {
        const confirmed = window.confirm(
            `Er du sikker på at du vil slette hyggesnak "${displayName}"?\n\nAlle medlemmer og data vil blive slettet. Dette kan ikke fortrydes.`
        );
        if (!confirmed) return;

        deleting = hyggesnakId;
        try {
            await apiDelete(`${API_ENDPOINTS.ADMIN_HYGGESNAKKE}/${hyggesnakId}`);

            toast.success(`Hyggesnak ${displayName} slettet`);
            if (selectedHyggesnak?.id === hyggesnakId) {
                selectedHyggesnak = null;
            }
            await loadHyggesnakke();
        } catch (err) {
            // Error is handled by apiDelete - toast already shown
        } finally {
            deleting = null;
        }
    }

    function handleSearch() {
        page = 1;
        loadHyggesnakke();
    }

    function formatDate(dateString) {
        return new Date(dateString).toLocaleDateString('da-DK', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    onMount(() => {
        loadHyggesnakke();
    });
</script>

<div class="hyggesnak-management">
    <div class="header">
        <h2>Hyggesnak Administration</h2>
    </div>

    <div class="search-bar">
        <input
            type="text"
            bind:value={searchQuery}
            onkeydown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="Søg efter hyggesnak navn..."
        />
        <button onclick={handleSearch}>Søg</button>
    </div>

    <div class="layout">
        <div class="list-panel">
            {#if loading}
                <p class="loading">Indlæser hyggesnakke...</p>
            {:else if hyggesnakke.length === 0}
                <p class="no-data">Ingen hyggesnakke fundet</p>
            {:else}
                <div class="hyggesnakke-list">
                    {#each hyggesnakke as hyggesnak}
                        <div
                            class="hyggesnak-card"
                            class:active={selectedHyggesnak?.id === hyggesnak.id}
                            role="button"
                            tabindex="0"
                            onclick={() => loadHyggesnakDetails(hyggesnak.id)}
                            onkeydown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault();
                                    loadHyggesnakDetails(hyggesnak.id);
                                }
                            }}
                        >
                            <div class="hyggesnak-info">
                                <h3>{hyggesnak.display_name}</h3>
                                <p class="name">@{hyggesnak.name}</p>
                                <p class="meta">
                                    {hyggesnak.member_count} medlemmer • Oprettet {formatDate(hyggesnak.created_at)}
                                </p>
                            </div>
                            <button
                                class="danger-icon"
                                onclick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteHyggesnak(hyggesnak.id, hyggesnak.display_name);
                                }}
                                disabled={deleting === hyggesnak.id}
                            >
                                {deleting === hyggesnak.id ? '...' : '🗑️'}
                            </button>
                        </div>
                    {/each}
                </div>

                {#if totalPages > 1}
                    <div class="pagination">
                        <button
                            disabled={page === 1}
                            onclick={() => { page--; loadHyggesnakke(); }}
                        >
                            ← Forrige
                        </button>
                        <span>Side {page} af {totalPages}</span>
                        <button
                            disabled={page === totalPages}
                            onclick={() => { page++; loadHyggesnakke(); }}
                        >
                            Næste →
                        </button>
                    </div>
                {/if}
            {/if}
        </div>

        <div class="details-panel">
            {#if !selectedHyggesnak}
                <p class="no-selection">Vælg en hyggesnak for at se detaljer</p>
            {:else if loadingDetails}
                <p class="loading">Indlæser detaljer...</p>
            {:else}
                <div class="details">
                    <h3>{selectedHyggesnak.display_name}</h3>
                    <p class="name">@{selectedHyggesnak.name}</p>
                    <p class="created">Oprettet: {formatDate(selectedHyggesnak.created_at)}</p>

                    <h4>Medlemmer ({selectedHyggesnak.members.length})</h4>
                    <div class="members-list">
                        {#each selectedHyggesnak.members as member}
                            <div class="member-item">
                                <div>
                                    <strong>{member.display_name || member.username}</strong>
                                    <span class="username">@{member.username}</span>
                                </div>
                                <span class="role-badge" class:owner={member.role === 'OWNER'}>
                                    {member.role === 'OWNER' ? 'Ejer' : 'Medlem'}
                                </span>
                            </div>
                        {/each}
                    </div>
                </div>
            {/if}
        </div>
    </div>
</div>

<style>
    .hyggesnak-management {
        padding: 1rem;
    }

    .header {
        margin-bottom: 2rem;
    }

    h2 {
        margin: 0;
    }

    .search-bar {
        display: flex;
        gap: 0.5rem;
        margin-bottom: 1.5rem;
    }

    .search-bar input {
        flex: 1;
        padding: 0.75rem;
        border: 1px solid var(--border);
        border-radius: 6px;
    }

    .layout {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 1.5rem;
    }

    .list-panel, .details-panel {
        border: 1px solid var(--border);
        border-radius: 8px;
        padding: 1rem;
        background: var(--card-bg);
    }

    .loading, .no-data, .no-selection {
        text-align: center;
        padding: 3rem;
        color: var(--text-secondary);
    }

    .hyggesnakke-list {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
    }

    .hyggesnak-card {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 1rem;
        border: 1px solid var(--border);
        border-radius: 8px;
        cursor: pointer;
        transition: all 0.2s;
    }

    .hyggesnak-card:hover {
        background: var(--hover-bg);
        border-color: var(--primary);
    }

    .hyggesnak-card.active {
        background: var(--primary-bg);
        border-color: var(--primary);
    }

    .hyggesnak-info {
        flex: 1;
    }

    .hyggesnak-info h3 {
        margin: 0 0 0.25rem 0;
        font-size: 1.125rem;
    }

    .name {
        margin: 0;
        color: var(--text-secondary);
        font-size: 0.875rem;
    }

    .meta {
        margin: 0.5rem 0 0 0;
        font-size: 0.75rem;
        color: var(--text-secondary);
    }

    button.danger-icon {
        padding: 0.5rem;
        background: transparent;
        border: none;
        font-size: 1.25rem;
        cursor: pointer;
        transition: transform 0.2s;
    }

    button.danger-icon:hover:not(:disabled) {
        transform: scale(1.2);
    }

    .details h3 {
        margin: 0 0 0.5rem 0;
    }

    .created {
        margin: 0.5rem 0 1.5rem 0;
        color: var(--text-secondary);
        font-size: 0.875rem;
    }

    h4 {
        margin: 1.5rem 0 1rem 0;
        padding-bottom: 0.5rem;
        border-bottom: 2px solid var(--border);
    }

    .members-list {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
    }

    .member-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 0.75rem;
        background: var(--bg);
        border-radius: 6px;
    }

    .member-item .username {
        margin-left: 0.5rem;
        color: var(--text-secondary);
        font-size: 0.875rem;
    }

    .role-badge {
        padding: 0.25rem 0.75rem;
        border-radius: 12px;
        font-size: 0.75rem;
        font-weight: 600;
        background: var(--bg);
        color: var(--text-secondary);
    }

    .role-badge.owner {
        background: var(--primary-bg);
        color: var(--primary);
    }

    .pagination {
        display: flex;
        justify-content: center;
        align-items: center;
        gap: 1rem;
        margin-top: 1rem;
        padding-top: 1rem;
        border-top: 1px solid var(--border);
    }

    @media (max-width: 1024px) {
        .layout {
            grid-template-columns: 1fr;
        }
    }
</style>
