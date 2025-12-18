<script>
    import { onMount } from 'svelte';
    import { toast } from 'svelte-sonner';
    import { apiGet, apiDelete } from '../../../api/api.js';
    import { API_ENDPOINTS } from '../../../utils/constants.js';
    import { formatDateTime } from '../../../utils/dateUtils.js';
    import './HyggesnakManagement.css';

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
        <button class="btn btn-secondary" onclick={handleSearch}>Søg</button>
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
                                    {hyggesnak.member_count} medlemmer • Oprettet {formatDateTime(hyggesnak.created_at)}
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
                            class="btn btn-secondary"
                            disabled={page === 1}
                            onclick={() => { page--; loadHyggesnakke(); }}
                        >
                            ← Forrige
                        </button>
                        <span>Side {page} af {totalPages}</span>
                        <button
                            class="btn btn-secondary"
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
                    <p class="created">Oprettet: {formatDateTime(selectedHyggesnak.created_at)}</p>

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
