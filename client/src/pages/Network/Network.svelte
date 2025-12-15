<script>
    import { onMount } from 'svelte';
    import { toast } from 'svelte-sonner';
    import { currentHyggesnak, hyggesnakke } from '../../stores/hyggesnakStore.svelte.js';
    import { sanitizeDisplayName, sanitizeHyggesnakName } from '../../lib/sanitize.js';
    import { useSocket } from '../../lib/useSocket.svelte.js';
    import { apiGet, apiPost, apiPut, apiDelete } from '../../lib/api.js';
    import { API_ENDPOINTS } from '../../lib/constants.js';
    import {
        fetchAllInvitations,
        networkInvitationsIncoming,
        networkInvitationsOutgoing,
        hyggesnakInvitations,
        addNetworkInvitationIncoming,
        removeNetworkInvitationIncoming,
        removeNetworkInvitationOutgoing,
        addHyggesnakInvitation,
        removeHyggesnakInvitation
    } from '../../stores/invitationsStore.svelte.js';
    import { onlineUsers } from '../../stores/onlineUsersStore.svelte.js';
    import Avatar from '../../components/Avatar.svelte';

    //==== State ====//
    let myCode = $state(null);
    let generatingCode = $state(false);
    let loadingCode = $state(false);

    let connectCode = $state('');
    let connectingWithCode = $state(false);

    let connections = $state([]);
    let loadingConnections = $state(false);
    let searchQuery = $state('');

    let filteredConnections = $derived(
        connections.filter(contact => {
            const query = searchQuery.toLowerCase();
            const username = contact.username?.toLowerCase() || '';
            const displayName = contact.displayName?.toLowerCase() || '';
            return username.includes(query) || displayName.includes(query);
        })
    );

    //==== Socket Setup ====//
    const socket = useSocket({});

    onMount(async () => {
        await Promise.all([
            loadMyCode(),
            fetchAllInvitations(),
            loadConnections()
        ]);

        socket.connect();

        socket.on('network:invitation:received', (data) => {
            addNetworkInvitationIncoming({
                id: data.id,
                fromUser: data.fromUser,
                createdAt: new Date().toISOString()
            });
        });

        socket.on('network:invitation:accepted', (data) => {
            removeNetworkInvitationOutgoing(data.invitationId);
            toast.success(`${sanitizeDisplayName(data.acceptedBy.displayName || data.acceptedBy.username)} accepterede din netværksanmodning!`);
        });

        socket.on('network:invitation:rejected', (data) => {
            removeNetworkInvitationOutgoing(data.invitationId);
        });

        socket.on('network:connection:new', (data) => {
            loadConnections();
            toast.success('Ny forbindelse oprettet!');
        });

        socket.on('network:connection:removed', () => {
            loadConnections();
        });

        socket.on('hyggesnak:invitation:received', (data) => {
            addHyggesnakInvitation({
                id: data.id,
                hyggesnak: data.hyggesnak,
                invitedBy: data.invitedBy,
                createdAt: new Date().toISOString()
            });
        });

        socket.on('hyggesnak:invitation:accepted', (data) => {
            toast.success(`${sanitizeDisplayName(data.acceptedBy.displayName || data.acceptedBy.username)} er nu medlem af ${sanitizeHyggesnakName(data.hyggesnak.displayName)}!`);
        });

        socket.on('hyggesnak:invitation:rejected', (data) => {
            // Silent rejection
        });
    });

    //==== Network Code Functions ====//
    async function loadMyCode() {
        loadingCode = true;
        try {
            const result = await apiGet(API_ENDPOINTS.NETWORK_MY_CODE);
            myCode = result.data;
        } catch (err) {
            myCode = null;
        } finally {
            loadingCode = false;
        }
    }

    async function generateCode() {
        generatingCode = true;
        try {
            const result = await apiPost(API_ENDPOINTS.NETWORK_GENERATE_CODE);
            myCode = result.data;
            toast.success('Kode genereret! Del den med dine venner.');
        } catch (err) {
            console.error(err);
        } finally {
            generatingCode = false;
        }
    }

    async function revokeCode() {
        if (!confirm('Er du sikker på, at du vil slette din aktive kode?')) return;

        try {
            await apiDelete(API_ENDPOINTS.NETWORK_MY_CODE);
            myCode = null;
            toast.success('Kode slettet');
        } catch (err) {
            console.error(err);
        }
    }

    async function connectWithCode() {
        if (!connectCode.trim() || connectCode.length !== 6) {
            toast.error('Indtast en gyldig 6-cifret kode');
            return;
        }

        connectingWithCode = true;
        try {
            const result = await apiPost(API_ENDPOINTS.NETWORK_CONNECT, {
                code: connectCode.trim()
            });
            toast.success(result.message);
            connectCode = '';
        } catch (err) {
            console.error(err);
        } finally {
            connectingWithCode = false;
        }
    }

    //==== Network Invitations Functions ====//
    async function acceptInvitation(invitationId) {
        try {
            const result = await apiPut(API_ENDPOINTS.NETWORK_INVITATION_ACCEPT(invitationId));
            removeNetworkInvitationIncoming(invitationId);
            toast.success(result.message);
            await loadConnections();
        } catch (err) {
            console.error(err);
        }
    }

    async function rejectInvitation(invitationId) {
        try {
            const result = await apiPut(API_ENDPOINTS.NETWORK_INVITATION_REJECT(invitationId));
            removeNetworkInvitationIncoming(invitationId);
            toast.success(result.message);
        } catch (err) {
            console.error(err);
        }
    }

    async function cancelInvitation(invitationId) {
        if (!confirm('Er du sikker på, at du vil annullere denne invitation?')) return;

        try {
            const result = await apiDelete(API_ENDPOINTS.NETWORK_INVITATION_CANCEL(invitationId));
            removeNetworkInvitationOutgoing(invitationId);
            toast.success(result.message);
        } catch (err) {
            console.error(err);
        }
    }

    //==== Hyggesnak Invitations Functions ====//
    async function acceptHyggesnakInvitation(invitationId, hyggesnakName) {
        try {
            const result = await apiPut(API_ENDPOINTS.HYGGESNAK_INVITATION_ACCEPT(invitationId));
            removeHyggesnakInvitation(invitationId);

            hyggesnakke.add({
                id: result.data.hyggesnak.id,
                name: result.data.hyggesnak.name,
                display_name: result.data.hyggesnak.displayName,
                role: 'MEMBER'
            });

            currentHyggesnak.select({
                id: result.data.hyggesnak.id,
                name: result.data.hyggesnak.name,
                display_name: result.data.hyggesnak.displayName
            });

            toast.success(`Du er nu medlem af ${sanitizeHyggesnakName(hyggesnakName)}!`);
        } catch (err) {
            console.error(err);
        }
    }

    async function rejectHyggesnakInvitation(invitationId) {
        try {
            const result = await apiPut(API_ENDPOINTS.HYGGESNAK_INVITATION_REJECT(invitationId));
            removeHyggesnakInvitation(invitationId);
            toast.success(result.message);
        } catch (err) {
            console.error(err);
        }
    }

    //==== Connections Functions ====//
    async function loadConnections() {
        loadingConnections = true;
        try {
            const result = await apiGet(API_ENDPOINTS.NETWORK_CONNECTIONS);
            connections = result.data || [];
        } catch (err) {
            console.error(err);
        } finally {
            loadingConnections = false;
        }
    }

    async function removeConnection(userId, displayName) {
        if (!confirm(`Er du sikker på, at du vil fjerne ${displayName} fra dit netværk?`)) return;

        try {
            await apiDelete(`${API_ENDPOINTS.NETWORK_CONNECTIONS}/${userId}`);
            toast.success('Forbindelse fjernet');
            await loadConnections();
        } catch (err) {
            console.error(err);
        }
    }
</script>

<div class="network-page">
    <div class="page-header">
        <h1>Mit netværk</h1>
        <p class="subtitle">Administrer dine netværksforbindelser</p>
    </div>

    <div class="page-content">
        <!-- Section 1: Mine forbindelser -->
        <section class="connections-section">
            <div class="section-header">
                <h2>Mine forbindelser ({connections.length})</h2>
                <input
                    type="text"
                    bind:value={searchQuery}
                    placeholder="Søg efter forbindelser..."
                    class="search-input"
                />
            </div>

            {#if loadingConnections}
                <div class="empty-state">Henter forbindelser...</div>
            {:else if filteredConnections.length === 0}
                <div class="empty-state">
                    <p>{searchQuery ? 'Ingen forbindelser matcher din søgning' : 'Du har ingen forbindelser endnu'}</p>
                    {#if !searchQuery}
                        <p>Generer en kode eller forbind med andres kode for at starte!</p>
                    {/if}
                </div>
            {:else}
                <div class="connections-list">
                    {#each filteredConnections as connection}
                        <div class="connection-card list-item">
                            <div class="connection-user">
                                <Avatar
                                    name={connection.displayName || connection.username}
                                    size="medium"
                                    isOnline={$onlineUsers.has(connection.userId)}
                                />
                                <div class="user-info">
                                    <h3>{sanitizeDisplayName(connection.displayName || connection.username)}</h3>
                                    <p class="username">@{sanitizeDisplayName(connection.username)}</p>
                                    <p class="connected-since">
                                        Forbundet siden {new Date(connection.connectedAt).toLocaleDateString('da-DK')}
                                    </p>
                                </div>
                            </div>
                            <button
                                class="btn-danger btn-sm"
                                onclick={() => removeConnection(connection.userId, connection.displayName || connection.username)}>
                                Fjern
                            </button>
                        </div>
                    {/each}
                </div>
            {/if}
        </section>

        <!-- Section 2: Netværkskoder -->
        <section class="codes-section">
            <h2>Netværkskoder</h2>

            <div class="code-subsection">
                <h3>Din kode</h3>
                <p class="description">Del denne kode med personer du vil tilføje til dit netværk</p>

                {#if loadingCode}
                    <div class="empty-state">Henter kode...</div>
                {:else if myCode}
                    <div class="code-display">
                        <div class="code-value">{myCode.code}</div>
                        <div class="code-info">
                            <p>Udløber: {new Date(myCode.expiresAt).toLocaleString('da-DK')}</p>
                        </div>
                        <button class="btn-secondary btn-sm" onclick={revokeCode}>
                            Slet kode
                        </button>
                    </div>
                {:else}
                    <div class="no-code">
                        <p>Du har ingen aktiv kode</p>
                        <button class="btn-primary" onclick={generateCode} disabled={generatingCode}>
                            {generatingCode ? 'Genererer...' : 'Generer kode'}
                        </button>
                    </div>
                {/if}
            </div>

            <div class="divider"></div>

            <div class="code-subsection">
                <h3>Forbind med kode</h3>
                <p class="description">Indtast en kode for at sende en netværksanmodning</p>

                <div class="connect-form">
                    <input
                        type="text"
                        bind:value={connectCode}
                        placeholder="Indtast 6-cifret kode"
                        maxlength="6"
                        pattern="[0-9]{6}"
                        class="code-input"
                    />
                    <button
                        class="btn-primary"
                        onclick={connectWithCode}
                        disabled={connectingWithCode || connectCode.length !== 6}>
                        {connectingWithCode ? 'Forbinder...' : 'Send anmodning'}
                    </button>
                </div>
            </div>
        </section>

        <!-- Section 3: Invitationer -->
        <section class="invitations-section">
            <h2>Invitationer</h2>

            <div class="invitation-group">
                <h3>
                    Netværksanmodninger
                    {#if $networkInvitationsIncoming.length > 0}
                        <span class="badge">{$networkInvitationsIncoming.length}</span>
                    {/if}
                </h3>

                {#if $networkInvitationsIncoming.length === 0 && $networkInvitationsOutgoing.length === 0}
                    <div class="empty-state">
                        <p>Ingen netværksanmodninger</p>
                    </div>
                {:else}
                    {#if $networkInvitationsIncoming.length > 0}
                        <div class="invitations-subgroup">
                            <h4>Indgående anmodninger</h4>
                            <div class="invitation-list">
                                {#each $networkInvitationsIncoming as invitation}
                                    <div class="invitation-card list-item">
                                        <div class="invitation-user">
                                            <Avatar
                                                name={invitation.fromUser.displayName || invitation.fromUser.username}
                                                size="medium"
                                                isOnline={$onlineUsers.has(invitation.fromUser.id)}
                                            />
                                            <div class="user-info">
                                                <h3>{sanitizeDisplayName(invitation.fromUser.displayName || invitation.fromUser.username)}</h3>
                                                <p class="username">@{sanitizeDisplayName(invitation.fromUser.username)}</p>
                                            </div>
                                        </div>
                                        <div class="invitation-actions">
                                            <button class="btn-success btn-sm" onclick={() => acceptInvitation(invitation.id)}>
                                                ✓ Acceptér
                                            </button>
                                            <button class="btn-danger btn-sm" onclick={() => rejectInvitation(invitation.id)}>
                                                ✕ Afvis
                                            </button>
                                        </div>
                                    </div>
                                {/each}
                            </div>
                        </div>
                    {/if}

                    {#if $networkInvitationsOutgoing.length > 0}
                        <div class="invitations-subgroup">
                            <h4>Udgående anmodninger</h4>
                            <div class="invitation-list">
                                {#each $networkInvitationsOutgoing as invitation}
                                    <div class="invitation-card list-item">
                                        <div class="invitation-user">
                                            <Avatar
                                                name={invitation.toUser.displayName || invitation.toUser.username}
                                                size="medium"
                                                isOnline={$onlineUsers.has(invitation.toUser.id)}
                                            />
                                            <div class="user-info">
                                                <h3>{sanitizeDisplayName(invitation.toUser.displayName || invitation.toUser.username)}</h3>
                                                <p class="username">@{sanitizeDisplayName(invitation.toUser.username)}</p>
                                                <p class="status">Afventer svar...</p>
                                            </div>
                                        </div>
                                        <button class="btn-secondary btn-sm" onclick={() => cancelInvitation(invitation.id)}>
                                            Annullér
                                        </button>
                                    </div>
                                {/each}
                            </div>
                        </div>
                    {/if}
                {/if}
            </div>

            <div class="divider"></div>

            <div class="invitation-group">
                <h3>
                    Hyggesnak invitationer
                    {#if $hyggesnakInvitations.length > 0}
                        <span class="badge">{$hyggesnakInvitations.length}</span>
                    {/if}
                </h3>

                {#if $hyggesnakInvitations.length === 0}
                    <div class="empty-state">
                        <p>Ingen hyggesnak invitationer</p>
                    </div>
                {:else}
                    <div class="invitation-list">
                        {#each $hyggesnakInvitations as invitation}
                            <div class="hyggesnak-invitation-card list-item">
                                <div class="invitation-content">
                                    <div class="hyggesnak-info">
                                        <h3>{sanitizeHyggesnakName(invitation.hyggesnak.displayName)}</h3>
                                        <p>Inviteret af: {sanitizeDisplayName(invitation.invitedBy.displayName || invitation.invitedBy.username)}</p>
                                    </div>
                                </div>
                                <div class="invitation-actions">
                                    <button
                                        class="btn-success btn-sm"
                                        onclick={() => acceptHyggesnakInvitation(invitation.id, invitation.hyggesnak.displayName)}>
                                        ✓ Acceptér
                                    </button>
                                    <button class="btn-danger btn-sm" onclick={() => rejectHyggesnakInvitation(invitation.id)}>
                                        ✕ Afvis
                                    </button>
                                </div>
                            </div>
                        {/each}
                    </div>
                {/if}
            </div>
        </section>
    </div>
</div>

<style>
    .network-page {
        max-width: 1000px;
        margin: 0 auto;
        padding: var(--space-6);
    }

    .page-header {
        margin-bottom: var(--space-6);
    }

    .page-header h1 {
        margin: 0 0 var(--space-2) 0;
        font-size: 2rem;
        font-weight: 700;
        color: var(--color-text);
    }

    .subtitle {
        margin: 0;
        color: var(--color-text-secondary);
        font-size: 1rem;
    }

    .page-content {
        display: flex;
        flex-direction: column;
        gap: var(--space-8);
    }

    section {
        background: var(--color-card-bg);
        border-radius: var(--radius-lg);
        padding: var(--space-6);
        box-shadow: var(--shadow-sm);
    }

    section h2 {
        margin: 0 0 var(--space-4) 0;
        font-size: 1.5rem;
        font-weight: 600;
        color: var(--color-text);
    }

    .section-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: var(--space-4);
        gap: var(--space-4);
    }

    .section-header h2 {
        margin: 0;
    }

    .search-input {
        width: 100%;
        max-width: 400px;
        padding: var(--space-3);
        border: 1px solid var(--color-border);
        border-radius: var(--radius-md);
        font-size: 1rem;
    }

    .search-input:focus {
        outline: none;
        border-color: var(--color-primary);
        box-shadow: 0 0 0 3px rgba(143, 176, 142, 0.1);
    }

    .connections-list,
    .invitation-list {
        display: flex;
        flex-direction: column;
        gap: var(--space-3);
    }

    .connection-card,
    .invitation-card,
    .hyggesnak-invitation-card {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: var(--space-4);
    }

    .connection-user,
    .invitation-user {
        display: flex;
        align-items: center;
        gap: var(--space-3);
        flex: 1;
    }

    .user-info h3 {
        margin: 0 0 var(--space-1) 0;
        font-size: 1.125rem;
        font-weight: 600;
        color: var(--color-text);
    }

    .username {
        margin: 0;
        color: var(--color-text-secondary);
        font-size: 0.875rem;
    }

    .status,
    .connected-since {
        margin: var(--space-1) 0 0 0;
        color: var(--color-text-secondary);
        font-size: 0.875rem;
        font-style: italic;
    }

    .invitation-actions {
        display: flex;
        gap: var(--space-2);
    }

    .code-subsection {
        margin-bottom: var(--space-4);
    }

    .code-subsection h3 {
        margin: 0 0 var(--space-2) 0;
        font-size: 1.25rem;
        font-weight: 600;
        color: var(--color-text);
    }

    .description {
        margin: 0 0 var(--space-4) 0;
        color: var(--color-text-secondary);
    }

    .code-display {
        text-align: center;
        padding: var(--space-6);
        background: var(--gradient-primary);
        border-radius: var(--radius-lg);
        color: white;
    }

    .code-value {
        font-size: 3rem;
        font-weight: 700;
        letter-spacing: 0.5rem;
        margin-bottom: var(--space-4);
    }

    .code-info {
        margin-bottom: var(--space-4);
        opacity: 0.9;
    }

    .no-code {
        text-align: center;
        padding: var(--space-8) var(--space-6);
        background: var(--color-bg-secondary);
        border-radius: var(--radius-lg);
    }

    .no-code p {
        margin-bottom: var(--space-4);
        color: var(--color-text-secondary);
    }

    .divider {
        height: 1px;
        background: var(--color-border);
        margin: var(--space-6) 0;
    }

    .connect-form {
        display: flex;
        gap: var(--space-3);
        max-width: 500px;
    }

    .code-input {
        flex: 1;
        padding: var(--space-3);
        border: 1px solid var(--color-border);
        border-radius: var(--radius-md);
        font-size: 1.5rem;
        text-align: center;
        letter-spacing: 0.5rem;
        font-weight: 600;
    }

    .code-input:focus {
        outline: none;
        border-color: var(--color-primary);
        box-shadow: 0 0 0 3px rgba(143, 176, 142, 0.1);
    }

    .invitation-group {
        margin-bottom: var(--space-6);
    }

    .invitation-group:last-child {
        margin-bottom: 0;
    }

    .invitation-group h3 {
        margin: 0 0 var(--space-4) 0;
        font-size: 1.25rem;
        font-weight: 600;
        color: var(--color-text);
        display: flex;
        align-items: center;
        gap: var(--space-2);
    }

    .invitations-subgroup {
        margin-bottom: var(--space-4);
    }

    .invitations-subgroup:last-child {
        margin-bottom: 0;
    }

    .invitations-subgroup h4 {
        margin: 0 0 var(--space-3) 0;
        font-size: 1rem;
        font-weight: 500;
        color: var(--color-text-secondary);
    }

    .badge {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-width: 1.5rem;
        height: 1.5rem;
        padding: 0 var(--space-2);
        background: var(--color-danger);
        color: white;
        border-radius: var(--radius-full);
        font-size: 0.75rem;
        font-weight: 700;
    }

    .hyggesnak-info h3 {
        margin: 0 0 var(--space-2) 0;
        font-size: 1.125rem;
        font-weight: 600;
        color: var(--color-text);
    }

    .hyggesnak-info p {
        margin: 0;
        color: var(--color-text-secondary);
        font-size: 0.875rem;
    }

    @media (max-width: 768px) {
        .network-page {
            padding: var(--space-4);
        }

        .section-header {
            flex-direction: column;
            align-items: stretch;
        }

        .search-input {
            max-width: 100%;
        }

        .code-value {
            font-size: 2rem;
            letter-spacing: 0.25rem;
        }

        .connection-card,
        .invitation-card,
        .hyggesnak-invitation-card {
            flex-direction: column;
            align-items: stretch;
            gap: var(--space-3);
        }

        .invitation-actions {
            width: 100%;
        }

        .invitation-actions button {
            flex: 1;
        }

        .connect-form {
            flex-direction: column;
            max-width: 100%;
        }
    }
</style>
