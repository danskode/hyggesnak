<script>
  import { onMount } from 'svelte';
  import { navigate, Link } from 'svelte-routing';
  import { auth } from '../../lib/stores/authStore.js';
  import { hyggesnakke, currentHyggesnak } from '../../lib/stores/hyggesnakStore.js';
  import { unreadCounts } from '../../lib/stores/unreadStore.js';
  import { toast } from 'svelte-sonner';
  import { sanitizeHyggesnakName } from '../../lib/utils/sanitize.js';
  import { apiGet, apiDelete } from '../../lib/api/api.js';
  import { API_ENDPOINTS } from '../../lib/utils/constants.js';
  import { useSocket } from '../../lib/composables/useSocket.js';
  import Avatar from '../../lib/components/Avatar.svelte';
  import './HyggesnakList.css';

  let loading = $state(true);
  let error = $state(null);
  let leaving = $state(null);

  const socket = useSocket({});

  async function loadHyggesnakke() {
    loading = true;
    error = null;

    try {
      const result = await apiGet(API_ENDPOINTS.HYGGESNAKKE);
      hyggesnakke.set(result.data);

      if (!$currentHyggesnak && result.data.length > 0) {
        currentHyggesnak.select(result.data[0]);
      }
    } catch (err) {
      error = err.message;
      toast.error('Kunne ikke hente hyggesnakke');
    } finally {
      loading = false;
    }
  }

  function handleNavigationAfterLeave(hyggesnakId) {
      navigate('/hyggesnakke');
  }

  async function handleLeaveHyggesnak(hyggesnak) {
    const isOwnerAndLast = hyggesnak.user_role === 'OWNER' && hyggesnak.member_count === 1;
    const confirmMessage = isOwnerAndLast
      ? `Er du sikker på at du vil forlade "${hyggesnak.display_name}"?\n\nDu er den sidste, så hyggesnakken vil blive slettet permanent.`
      : `Er du sikker på at du vil forlade "${hyggesnak.display_name}"?\n\nDu mister adgang til denne hyggesnak.`;

    if (!confirm(confirmMessage)) return;

    leaving = hyggesnak.id;

    try {
      const result = await apiDelete(`${API_ENDPOINTS.HYGGESNAKKE}/${hyggesnak.id}/members/${$auth.id}`);
      toast.success(result.message || `Du har forladt ${hyggesnak.display_name}`);

      hyggesnakke.remove(hyggesnak.id);
      handleNavigationAfterLeave(hyggesnak.id);
    } catch (err) {
      toast.error(err.message || 'Kunne ikke forlade hyggesnak');
    } finally {
      leaving = null;
    }
  }

  function selectAndNavigate(hyggesnak) {
    currentHyggesnak.select(hyggesnak);
    navigate(`/h/${hyggesnak.id}/chat`);
  }

  onMount(async () => {
    await loadHyggesnakke();

    socket.connect();

    socket.on('network:connection:removed', async () => {
      await loadHyggesnakke();
    });
  });

</script>

<div class="content-page">
  <div class="page-header">
    <h1>Dine hyggesnakke</h1>
    <Link to="/hyggesnakke/create">
      <button class="btn btn-primary">+ Opret ny hyggesnak</button>
    </Link>
  </div>

  <section>
    {#if loading}
      <div class="empty-state">Indlæser hyggesnakke...</div>
    {:else if error}
      <p class="error">Fejl: {error}</p>
    {:else if $hyggesnakke && $hyggesnakke.length > 0}
      <div class="card-list">
        {#each $hyggesnakke as hyggesnak}
          <div
            class="hyggesnak-card list-item"
            role="button"
            tabindex="0"
            onclick={() => selectAndNavigate(hyggesnak)}
            onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); selectAndNavigate(hyggesnak); } }}
          >
            <div class="hyggesnak-info">
              <Avatar
                name={hyggesnak.display_name}
                size="medium"
              />
              <div class="info-details">
                <div class="name-row">
                  <h3>{sanitizeHyggesnakName(hyggesnak.display_name)}</h3>
                  {#if $unreadCounts.byHyggesnak[hyggesnak.id] > 0}
                    <span class="unread-badge">{$unreadCounts.byHyggesnak[hyggesnak.id]}</span>
                  {/if}
                  <span class="role-badge {hyggesnak.user_role.toLowerCase()}">
                    {hyggesnak.user_role === 'OWNER' ? 'Du er ejer' : 'Du er medlem'}
                  </span>
                </div>
                <div class="meta-info">
                  <span>{hyggesnak.member_count} {hyggesnak.member_count === 1 ? 'medlem' : 'medlemmer'}</span>
                  <span>•</span>
                  <span>Oprettet {new Date(hyggesnak.created_at).toLocaleDateString('da-DK')}</span>
                </div>
              </div>
            </div>
            <div class="hyggesnak-actions">
              <button
                class="btn btn-danger btn-sm"
                onclick={(e) => { e.stopPropagation(); handleLeaveHyggesnak(hyggesnak); }}
                disabled={leaving === hyggesnak.id}
              >
                {leaving === hyggesnak.id ? 'Forlader...' : 'Forlad'}
              </button>
            </div>
          </div>
        {/each}
      </div>
    {:else}
      <div class="empty-state">
        <p>Du er ikke medlem af nogen hyggesnakke endnu.</p>
        <Link to="/hyggesnakke/create">
          <button class="btn btn-primary">Opret din første hyggesnak</button>
        </Link>
      </div>
    {/if}
  </section>
</div>
