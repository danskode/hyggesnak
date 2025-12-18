<script>
    import { sanitizeDisplayName, sanitizeHyggesnakName } from '../../utils/sanitize.js';

    let {
        invitations = [],
        onAccept = () => {},
        onReject = () => {}
    } = $props();

    function getUserDisplayName(user) {
        return user.displayName || user.username;
    }
</script>

<div class="invitation-group">
    <h3>
        Invitationer til nye hyggesnakke
        {#if invitations.length > 0}
            <span class="badge">{invitations.length}</span>
        {/if}
    </h3>

    {#if invitations.length === 0}
        <div class="empty-state">
            <p>Ingen hyggesnak invitationer</p>
        </div>
    {:else}
        <div class="invitation-list">
            {#each invitations as invitation}
                <div class="hyggesnak-invitation-card list-item">
                    <div class="invitation-content">
                        <div class="hyggesnak-info">
                            <h3>{sanitizeHyggesnakName(invitation.hyggesnak.displayName)}</h3>
                            <p>Inviteret af: {sanitizeDisplayName(getUserDisplayName(invitation.invitedBy))}</p>
                        </div>
                    </div>
                    <div class="invitation-actions">
                        <button
                            class="btn btn-success btn-sm"
                            onclick={() => onAccept(invitation.id, invitation.hyggesnak.displayName)}>
                            ✓ Acceptér
                        </button>
                        <button class="btn btn-danger btn-sm" onclick={() => onReject(invitation.id)}>
                            ✕ Afvis
                        </button>
                    </div>
                </div>
            {/each}
        </div>
    {/if}
</div>
