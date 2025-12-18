<script>
    import { onlineUsers } from '../../stores/onlineUsersStore.js';
    import { sanitizeDisplayName } from '../../utils/sanitize.js';
    import Avatar from '../Avatar.svelte';

    let {
        incoming = [],
        outgoing = [],
        onAccept = () => {},
        onReject = () => {},
        onCancel = () => {}
    } = $props();

    function getUserDisplayName(user) {
        return user.displayName || user.username;
    }
</script>

<div class="invitation-group">
    <h3>
        Venneanmodninger
        {#if incoming.length > 0}
            <span class="badge">{incoming.length}</span>
        {/if}
    </h3>

    {#if incoming.length === 0 && outgoing.length === 0}
        <div class="empty-state">
            <p>Ingen ventende venneanmodninger</p>
        </div>
    {:else}
        {#if incoming.length > 0}
            <div class="invitations-subgroup">
                <h4>Modtagede anmodninger</h4>
                <div class="invitation-list">
                    {#each incoming as invitation}
                        <div class="invitation-card list-item">
                            <div class="invitation-user">
                                <Avatar
                                    name={getUserDisplayName(invitation.fromUser)}
                                    size="medium"
                                    isOnline={$onlineUsers.has(invitation.fromUser.id)}
                                />
                                <div class="user-info">
                                    <h3>{sanitizeDisplayName(getUserDisplayName(invitation.fromUser))}</h3>
                                    <p class="username">@{sanitizeDisplayName(invitation.fromUser.username)}</p>
                                </div>
                            </div>
                            <div class="invitation-actions">
                                <button class="btn btn-success btn-sm" onclick={() => onAccept(invitation.id)}>
                                    ✓ Acceptér
                                </button>
                                <button class="btn btn-danger btn-sm" onclick={() => onReject(invitation.id)}>
                                    ✕ Afvis
                                </button>
                            </div>
                        </div>
                    {/each}
                </div>
            </div>
        {/if}

        {#if outgoing.length > 0}
            <div class="invitations-subgroup">
                <h4>Udgående anmodninger</h4>
                <div class="invitation-list">
                    {#each outgoing as invitation}
                        <div class="invitation-card list-item">
                            <div class="invitation-user">
                                <Avatar
                                    name={getUserDisplayName(invitation.toUser)}
                                    size="medium"
                                    isOnline={$onlineUsers.has(invitation.toUser.id)}
                                />
                                <div class="user-info">
                                    <h3>{sanitizeDisplayName(getUserDisplayName(invitation.toUser))}</h3>
                                    <p class="username">@{sanitizeDisplayName(invitation.toUser.username)}</p>
                                    <p class="status">Afventer svar...</p>
                                </div>
                            </div>
                            <button class="btn btn-secondary btn-sm" onclick={() => onCancel(invitation.id)}>
                                Annullér
                            </button>
                        </div>
                    {/each}
                </div>
            </div>
        {/if}
    {/if}
</div>
