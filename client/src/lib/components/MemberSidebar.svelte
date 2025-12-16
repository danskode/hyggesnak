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
        onInviteSent = () => {}
    } = $props();

    // Invite section state
    let showInviteSection = $state(false);
    let networkConnections = $state([]);
    let loadingConnections = $state(false);
    let sendingInvites = $state(new Set());

    // Toggle invite section and load connections if needed
    function toggleInviteSection() {
        showInviteSection = !showInviteSection;

        if (showInviteSection && networkConnections.length === 0) {
            loadEligibleConnections();
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
        if (!confirm(`Er du sikker på, at du vil fjerne ${memberName} fra chatten?`)) {
            return;
        }

        await onRemoveMember(memberId);
    }
</script>

<div class="members-sidebar">
    <div class="members-header">
        <h3>Medlemmer ({members.length})</h3>

        {#if currentUserRole === ROLES.OWNER}
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
                {#if currentUserRole === ROLES.OWNER && member.id !== currentUserId}
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
    .members-sidebar {
        width: 280px;
        border-left: 1px solid var(--color-border);
        background: var(--color-card-bg);
        display: flex;
        flex-direction: column;
        max-height: 100%;
    }

    .members-header {
        padding: var(--space-6) var(--space-4);
        border-bottom: 1px solid var(--color-border);
        background: var(--gradient-secondary);
        display: flex;
        justify-content: space-between;
        align-items: center;
        flex-shrink: 0;
    }

    .members-header h3 {
        margin: 0;
        font-size: 1.1rem;
        font-weight: 600;
        color: var(--color-text);
    }

    /* Global .btn-success and .btn-active styles apply */

    .members-list {
        flex: 1;
        overflow-y: auto;
        padding: var(--space-4);
        display: flex;
        flex-direction: column;
        gap: var(--space-3);
        min-height: 0; /* Allow flex scrolling */
    }

    /* Global .custom-scrollbar styles apply to .members-list */

    .member-card {
        /* Similar to .list-item but with custom structure */
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: var(--space-3);
        background: var(--color-bg-secondary);
        border-radius: var(--radius-lg);
        transition: all var(--transition-base);
    }

    .member-card:hover {
        background: #e9ecef;
        transform: translateX(-2px);
    }

    .member-info {
        display: flex;
        align-items: center;
        gap: var(--space-3);
        flex: 1;
        min-width: 0;
    }

    /* Avatar styling now handled by Avatar component */

    .member-details {
        flex: 1;
        min-width: 0;
    }

    .member-name {
        font-weight: 500;
        font-size: 0.875rem;
        color: var(--color-text);
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    .member-role {
        font-size: 0.75rem;
        color: var(--color-text-secondary);
        margin-top: var(--space-1);
    }

    /* Global .btn-icon and .btn-danger-hover styles apply */

    .invite-section {
        border-top: 2px solid var(--color-border);
        background: var(--color-bg-secondary);
        display: flex;
        flex-direction: column;
        max-height: 50%;
        flex-shrink: 0;
        animation: slideDown 0.3s ease-out;
    }

    .invite-header {
        padding: var(--space-4);
        border-bottom: 1px solid var(--color-border);
    }

    .invite-header h4 {
        margin: 0;
        font-size: 1rem;
        font-weight: 600;
        color: var(--color-text);
    }

    .invite-body {
        padding: var(--space-4);
        overflow-y: auto;
        flex: 1;
        min-height: 0;
    }

    .invite-loading {
        /* Global .empty-state styles apply */
        text-align: center;
        padding: var(--space-6);
        color: var(--color-text-secondary);
    }

    .invite-empty {
        /* Global .empty-state styles apply */
        font-size: 0.875rem;
    }

    .invite-list {
        display: flex;
        flex-direction: column;
        gap: var(--space-2);
    }

    .invite-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: var(--space-2);
        border: 1px solid var(--color-border);
        border-radius: var(--radius-md);
        background: var(--color-card-bg);
        transition: background-color var(--transition-base);
    }

    .invite-item:hover {
        background-color: var(--color-bg-secondary);
    }

    .invite-user {
        display: flex;
        align-items: center;
        gap: var(--space-2);
        flex: 1;
        min-width: 0;
    }

    .invite-name {
        font-weight: 500;
        font-size: 0.875rem;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    @media (max-width: 768px) {
        .members-sidebar {
            max-width: 20%;
        }
        .member-details {
            display: none;
        }
    }
</style>
