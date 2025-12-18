<script>
    import { onlineUsers } from '../../stores/onlineUsersStore.js';
    import { sanitizeDisplayName } from '../../utils/sanitize.js';
    import Avatar from '../Avatar.svelte';

    let {
        connections = [],
        loading = false,
        onRemove = () => {}
    } = $props();

    let searchQuery = $state('');

    let filteredConnections = $derived(
        connections.filter(contact => {
            const query = searchQuery.toLowerCase();
            const username = contact.username?.toLowerCase() || '';
            const displayName = contact.displayName?.toLowerCase() || '';
            return username.includes(query) || displayName.includes(query);
        })
    );

    function getUserDisplayName(user) {
        return user.displayName || user.username;
    }
</script>

<section class="connections-section">
    <div class="section-header">
        <h2>Dine kontakter ({connections.length})</h2>
        <input
            type="text"
            bind:value={searchQuery}
            placeholder="Søg efter kontakter..."
            class="search-input"
        />
    </div>

    {#if loading}
        <div class="empty-state">Henter kontakter...</div>
    {:else if filteredConnections.length === 0}
        <div class="empty-state">
            <p>{searchQuery ? 'Ingen kontakter matcher din søgning' : 'Du har ingen kontakter endnu'}</p>
            {#if !searchQuery}
                <p>Generer en kode eller indtast en anden brugers kode nedenfor for at udvidde dit netværk!</p>
            {/if}
        </div>
    {:else}
        <div class="connections-list">
            {#each filteredConnections as connection}
                <div class="connection-card list-item">
                    <div class="connection-user">
                        <Avatar
                            name={getUserDisplayName(connection)}
                            size="medium"
                            isOnline={$onlineUsers.has(connection.userId)}
                        />
                        <div class="user-info">
                            <h3>{sanitizeDisplayName(getUserDisplayName(connection))}</h3>
                            <p class="username">@{sanitizeDisplayName(connection.username)}</p>
                            <p class="connected-since">
                                Forbundet siden {new Date(connection.connectedAt).toLocaleDateString('da-DK')}
                            </p>
                        </div>
                    </div>
                    <button
                        class="btn btn-danger btn-sm"
                        onclick={() => onRemove(connection.userId, getUserDisplayName(connection))}>
                        Fjern
                    </button>
                </div>
            {/each}
        </div>
    {/if}
</section>
