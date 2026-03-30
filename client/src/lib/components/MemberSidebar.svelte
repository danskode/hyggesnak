<script>
    import { toast } from 'svelte-sonner';
    import { sanitizeDisplayName } from '../utils/sanitize.js';
    import { ROLES, API_ENDPOINTS } from '../utils/constants.js';
    import { apiGet, apiPost } from '../api/api.js';
    import { onlineUsers } from '../stores/onlineUsersStore.js';
    import Avatar from './Avatar.svelte';

    let {
        members = [],
        currentUserId = null,
        currentUserRole = null,
        hyggesnakId = null,
        onRemoveMember = () => {},
        onInviteSent = () => {},
        onDeleteHyggesnak = () => {},
        inHeader = false
    } = $props();

    // Invite section state
    let showInviteSection = $state(false);
    let showRemoveButtons = $state(false);
    let networkConnections = $state([]);
    let loadingConnections = $state(false);
    let sendingInvites = $state(new Set());

    function toggleInviteSection() {
        showInviteSection = !showInviteSection;
        if (showInviteSection) {
            showRemoveButtons = false;
            if (networkConnections.length === 0) {
                loadEligibleConnections();
            }
        }
    }

    function toggleRemoveButtons() {
        showRemoveButtons = !showRemoveButtons;
        if (showRemoveButtons) {
            showInviteSection = false;
        }
    }

    // Load network connections that aren't already members
    async function loadEligibleConnections() {
        loadingConnections = true;

        try {
            const result = await apiGet(API_ENDPOINTS.NETWORK_CONNECTIONS);
            const existingMemberIds = members.map(m => m.id);

            // Filter out users who are already members
            networkConnections = result.data.filter(
                conn => !existingMemberIds.includes(conn.userId)
            );
        } catch (err) {
            console.error('Error loading connections:', err);
            toast.error('Kunne ikke hente forbindelser');
        } finally {
            loadingConnections = false;
        }
    }

    // Send invitation to user
    async function sendInvitation(userId, displayName) {
        sendingInvites.add(userId);

        try {
            const result = await apiPost(
                `${API_ENDPOINTS.HYGGESNAKKE}/${hyggesnakId}/invite`,
                { userId }
            );

            toast.success(result.message);

            // Remove from available connections
            networkConnections = networkConnections.filter(
                conn => conn.userId !== userId
            );

            // Notify parent
            onInviteSent();
        } catch (err) {
            console.error('Error sending invitation:', err);
            toast.error(err.message || 'Kunne ikke sende invitation');
        } finally {
            sendingInvites.delete(userId);
        }
    }

    async function handleRemoveMember(memberId, memberName) {
        if (!confirm(`Er du sikker p��, at du vil fjerne ${memberName} fra chatten?`)) {
            return;
        }

        await onRemoveMember(memberId);
    }
</script>

<div class="members-sidebar" class:in-header={inHeader}>
    <div class="members-header">
        <h3>Medlemmer ({members.length})</h3>

        {#if currentUserRole === ROLES.OWNER && !inHeader}
            <button
                class="btn btn-success"
                class:btn-active={showInviteSection}
                onclick={toggleInviteSection}
                title="Invitér nye medlemmer"
            >
                {showInviteSection ? '✕' : '➕'} Invitér
            </button>
        {/if}
    </div>

    <div class="members-list custom-scrollbar">
        {#each members as member (member.id)}
            <div class="member-card" title="{sanitizeDisplayName(member.display_name || member.username)}">
                <div class="member-info">
                    <Avatar
                        name={sanitizeDisplayName(member.display_name || member.username)}
                        showCrown={member.role === ROLES.OWNER}
                        size="medium"
                        isOnline={$onlineUsers.has(member.id)}
                    />
                    <div class="member-details">
                        <div class="member-name">
                            @{sanitizeDisplayName(member.display_name || member.username)}
                        </div>
                        {#if member.role === ROLES.OWNER}
                            <div class="member-role">Ejer af chatten</div>
                        {/if}
                    </div>
                </div>

                <!-- Action buttons -->
                {#if currentUserRole === ROLES.OWNER && member.id !== currentUserId && (!inHeader || showRemoveButtons)}
                    <button
                        class="btn btn-icon btn-danger-hover"
                        onclick={() => handleRemoveMember(member.id, sanitizeDisplayName(member.display_name || member.username))}
                        title="Fjern medlem"
                    >
                        ✕
                    </button>
                {/if}
            </div>
        {/each}
    </div>

    <!-- Delete Hyggesnak Section (only when owner is alone) -->
    {#if currentUserRole === ROLES.OWNER && members.length === 1}
        <div class="delete-section">
            <p class="delete-info">Du er det eneste medlem tilbage</p>
            <button
                class="btn btn-danger"
                onclick={onDeleteHyggesnak}
                title="Slet hyggesnak permanent"
            >
                🗑️ Slet Hyggesnak
            </button>
        </div>
    {/if}

    <!-- Management actions (only in header drawer context) -->
    {#if inHeader && currentUserRole === ROLES.OWNER}
        <div class="management-actions">
            {#if members.some(m => m.id !== currentUserId)}
                <button
                    class="btn btn-sm btn-danger"
                    class:btn-active={showRemoveButtons}
                    onclick={toggleRemoveButtons}
                >
                    {showRemoveButtons ? '✕ Luk' : '✕ Fjern medlem'}
                </button>
            {/if}
            <button
                class="btn btn-sm btn-success"
                class:btn-active={showInviteSection}
                onclick={toggleInviteSection}
            >
                {showInviteSection ? '✕ Luk' : '➕ Tilføj medlem'}
            </button>
        </div>
    {/if}

    <!-- Invite Section -->
    {#if showInviteSection && currentUserRole === ROLES.OWNER}
        <div class="invite-section">
            <div class="invite-header">
                <h4>Invitér til hyggesnak</h4>
            </div>

            <div class="invite-body">
                {#if loadingConnections}
                    <div class="invite-loading">Henter forbindelser...</div>
                {:else if networkConnections.length === 0}
                    <div class="invite-empty empty-state">
                        <p>Ingen tilgængelige forbindelser</p>
                        <p>Alle dine venner er allerede medlemmer</p>
                    </div>
                {:else}
                    <div class="invite-list">
                        {#each networkConnections as connection}
                            <div class="invite-item">
                                <div class="invite-user">
                                    <Avatar
                                        name={connection.displayName || connection.username}
                                        size="small"
                                        isOnline={$onlineUsers.has(connection.userId)}
                                    />
                                    <div class="invite-name">
                                        {connection.displayName || connection.username}
                                    </div>
                                </div>
                                <button
                                    class="btn btn-success btn-sm"
                                    onclick={() => sendInvitation(connection.userId, connection.displayName || connection.username)}
                                    disabled={sendingInvites.has(connection.userId)}
                                >
                                    {sendingInvites.has(connection.userId) ? '...' : '➕'}
                                </button>
                            </div>
                        {/each}
                    </div>
                {/if}
            </div>
        </div>
    {/if}
</div>

<style>
    @import './MemberSidebar.css';
</style>
