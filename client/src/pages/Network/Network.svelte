<script>
    import { onMount } from 'svelte';
    import { toast } from 'svelte-sonner';
    import { currentHyggesnak, hyggesnakke } from '../../lib/stores/hyggesnakStore.js';
    import { sanitizeDisplayName, sanitizeHyggesnakName } from '../../lib/utils/sanitize.js';
    import { useSocket } from '../../lib/composables/useSocket.js';
    import { apiGet, apiPost, apiPut, apiDelete } from '../../lib/api/api.js';
    import { API_ENDPOINTS } from '../../lib/utils/constants.js';
    import {
        fetchAllInvitations,
        networkInvitationsIncoming,
        networkInvitationsOutgoing,
        hyggesnakInvitations,
        removeNetworkInvitationIncoming,
        removeNetworkInvitationOutgoing,
        removeHyggesnakInvitation
    } from '../../lib/stores/invitationsStore.js';
    import NetworkList from '../../lib/components/Network/NetworkList.svelte';
    import NetworkCodes from '../../lib/components/Network/NetworkCodes.svelte';
    import NetworkInvitations from '../../lib/components/Network/NetworkInvitations.svelte';
    import HyggesnakInvitations from '../../lib/components/Network/HyggesnakInvitations.svelte';
    import './Network.css';

    //==== State ====//
    let myCode = $state(null);
    let generatingCode = $state(false);
    let loadingCode = $state(false);

    let connections = $state([]);
    let loadingConnections = $state(false);

    //==== Helper Functions ====//
    function handleApiError(err, context = '') {
        console.error(`API Error ${context}:`, err);
        toast.error(err.message || 'Der opstod en fejl');
    }

    //==== Socket Setup ====//
    const socket = useSocket({});

    function handleNetworkInvitationAccepted(data) {
        const displayName = sanitizeDisplayName(data.acceptedBy.displayName || data.acceptedBy.username);
        toast.success(`${displayName} accepterede din netværksanmodning!`);
    }

    function handleNewConnection() {
        loadConnections();
        toast.success('Ny forbindelse oprettet!');
    }

    function handleConnectionRemoved() {
        loadConnections();
    }

    function handleHyggesnakInvitationAccepted(data) {
        const userName = sanitizeDisplayName(data.acceptedBy.displayName || data.acceptedBy.username);
        const hyggesnakName = sanitizeHyggesnakName(data.hyggesnak.displayName);
        toast.success(`${userName} er nu medlem af ${hyggesnakName}!`);
    }

    function setupSocketListeners() {
        socket.on('network:invitation:accepted', handleNetworkInvitationAccepted);
        socket.on('network:connection:new', handleNewConnection);
        socket.on('network:connection:removed', handleConnectionRemoved);
        socket.on('hyggesnak:invitation:accepted', handleHyggesnakInvitationAccepted);
    }

    onMount(async () => {
        await Promise.all([
            loadMyCode(),
            fetchAllInvitations(),
            loadConnections()
        ]);

        socket.connect();
        setupSocketListeners();
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
            handleApiError(err, 'revoking code');
        }
    }

    async function connectWithCode(code) {
        try {
            const result = await apiPost(API_ENDPOINTS.NETWORK_CONNECT, { code });
            toast.success(result.message);
        } catch (err) {
            handleApiError(err, 'connecting with code');
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
            handleApiError(err, 'accepting invitation');
        }
    }

    async function rejectInvitation(invitationId) {
        try {
            const result = await apiPut(API_ENDPOINTS.NETWORK_INVITATION_REJECT(invitationId));
            removeNetworkInvitationIncoming(invitationId);
            toast.success(result.message);
        } catch (err) {
            handleApiError(err, 'rejecting invitation');
        }
    }

    async function cancelInvitation(invitationId) {
        if (!confirm('Er du sikker på, at du vil annullere denne invitation?')) return;

        try {
            const result = await apiDelete(API_ENDPOINTS.NETWORK_INVITATION_CANCEL(invitationId));
            removeNetworkInvitationOutgoing(invitationId);
            toast.success(result.message);
        } catch (err) {
            handleApiError(err, 'canceling invitation');
        }
    }

    //==== Hyggesnak Invitations Functions ====//
    function addHyggesnakToStores(hyggesnakData) {
        const hyggesnak = {
            id: hyggesnakData.id,
            name: hyggesnakData.name,
            display_name: hyggesnakData.displayName
        };

        hyggesnakke.add({ ...hyggesnak, role: 'MEMBER' });
        currentHyggesnak.select(hyggesnak);
    }

    async function acceptHyggesnakInvitation(invitationId, hyggesnakName) {
        try {
            const result = await apiPut(API_ENDPOINTS.HYGGESNAK_INVITATION_ACCEPT(invitationId));
            removeHyggesnakInvitation(invitationId);
            addHyggesnakToStores(result.data.hyggesnak);
            toast.success(`Du er nu medlem af ${sanitizeHyggesnakName(hyggesnakName)}!`);
        } catch (err) {
            handleApiError(err, 'accepting hyggesnak invitation');
        }
    }

    async function rejectHyggesnakInvitation(invitationId) {
        try {
            const result = await apiPut(API_ENDPOINTS.HYGGESNAK_INVITATION_REJECT(invitationId));
            removeHyggesnakInvitation(invitationId);
            toast.success(result.message);
        } catch (err) {
            handleApiError(err, 'rejecting hyggesnak invitation');
        }
    }

    //==== Connections Functions ====//
    async function loadConnections() {
        loadingConnections = true;
        try {
            const result = await apiGet(API_ENDPOINTS.NETWORK_CONNECTIONS);
            connections = result.data || [];
        } catch (err) {
            handleApiError(err, 'loading connections');
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
            handleApiError(err, 'removing connection');
        }
    }
</script>

<div class="content-page">
    <div class="page-header">
        <h1>Dit netværk</h1>
        <p class="subtitle">Administrer dine kontakter</p>
    </div>

    <div class="page-content">
        <NetworkList
            connections={connections}
            loading={loadingConnections}
            onRemove={removeConnection}
        />

        <NetworkCodes
            myCode={myCode}
            loadingCode={loadingCode}
            generatingCode={generatingCode}
            onGenerate={generateCode}
            onRevoke={revokeCode}
            onConnect={connectWithCode}
        />

        <section class="invitations-section">
            <h2>Anmodninger</h2>

            <NetworkInvitations
                incoming={$networkInvitationsIncoming}
                outgoing={$networkInvitationsOutgoing}
                onAccept={acceptInvitation}
                onReject={rejectInvitation}
                onCancel={cancelInvitation}
            />

            <div class="divider"></div>

            <HyggesnakInvitations
                invitations={$hyggesnakInvitations}
                onAccept={acceptHyggesnakInvitation}
                onReject={rejectHyggesnakInvitation}
            />
        </section>
    </div>
</div>