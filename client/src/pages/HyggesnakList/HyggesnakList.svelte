<script>
  import { onMount } from 'svelte';
  import { navigate, Link } from 'svelte-routing';
  import { auth } from '../../stores/authStore.svelte.js';
  import { hyggesnakke, currentHyggesnak } from '../../stores/hyggesnakStore.svelte.js';
  import { toast } from 'svelte-sonner';
  import { sanitizeHyggesnakName } from '../../lib/sanitize.js';
  import { apiGet, apiDelete } from '../../lib/api.js';
  import { API_ENDPOINTS } from '../../lib/constants.js';
  import { useSocket } from '../../lib/useSocket.svelte.js';

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

      // Auto-select first hyggesnak if none selected
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

  async function handleLeaveHyggesnak(hyggesnak) {
    const confirmed = window.confirm(
      `Er du sikker på at du vil forlade "${hyggesnak.display_name}"?\n\nDu mister adgang til denne hyggesnak.`
    );

    if (!confirmed) return;

    leaving = hyggesnak.id;

    try {
      const result = await apiDelete(`${API_ENDPOINTS.HYGGESNAKKE}/${hyggesnak.id}/members/${$auth.id}`);
      toast.success(`Du har forladt ${hyggesnak.display_name}`);

      // Remove from list
      hyggesnakke.remove(hyggesnak.id);

      // If leaving current hyggesnak, switch to first remaining
      if ($currentHyggesnak && $currentHyggesnak.id === hyggesnak.id) {
        const remaining = $hyggesnakke.filter(h => h.id !== hyggesnak.id);
        if (remaining.length > 0) {
          currentHyggesnak.select(remaining[0]);
          navigate(`/h/${remaining[0].id}/chat`);
        } else {
          currentHyggesnak.clear();
          navigate('/hyggesnakke');
        }
      }

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

<h1>Dine hyggesnakke</h1>

<div class="actions">
  <Link to="/hyggesnakke/create">
    <button class="btn btn-primary btn-lg">+ Opret ny hyggesnak</button>
  </Link>
</div>

{#if loading}
  <p>Indlæser hyggesnakke...</p>
{:else if error}
  <p class="error">Fejl: {error}</p>
{:else if $hyggesnakke && $hyggesnakke.length > 0}
  <div class="hyggesnak-grid">
    {#each $hyggesnakke as hyggesnak}
      <div class="hyggesnak-card">
        <div class="card-header">
          <h3>{sanitizeHyggesnakName(hyggesnak.display_name)}</h3>
          <span class="role-badge {hyggesnak.user_role.toLowerCase()}">
            {hyggesnak.user_role === 'OWNER' ? 'Du er ejer' : 'Du er medlem'}
          </span>
        </div>

        <div class="card-info">
          <p><strong>Navn:</strong> {hyggesnak.name}</p>
          <p><strong>Medlemmer:</strong> {hyggesnak.member_count}</p>
          <p><strong>Oprettet:</strong> {new Date(hyggesnak.created_at).toLocaleDateString('da-DK')}</p>
        </div>

        <div class="card-actions">
          <button
            class="btn btn-primary btn-lg"
            onclick={() => selectAndNavigate(hyggesnak)}
          >
            Fortsæt hyggesnakken
          </button>

          <button
            class="btn btn-danger btn-sm"
            onclick={() => handleLeaveHyggesnak(hyggesnak)}
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

<style>
  .actions {
    margin: 2rem 0;
  }

  .hyggesnak-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 1.5rem;
    margin-top: 2rem;
  }

  .hyggesnak-card {
    border: 0px solid var(--color-border, #ddd);
    border-radius: 12px;
    padding: 1.5rem;
    background: var(--color-card-bg, white);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
    transition: box-shadow 0.2s;
  }

  .hyggesnak-card:hover {
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
  }

  .card-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 1rem;
    gap: 0.5rem;
  }

  .card-header h3 {
    margin: 0;
    font-size: 1.25rem;
  }

  .role-badge {
    font-size: 0.75rem;
    padding: 0.25rem 0.5rem;
    border-radius: 4px;
    font-weight: 600;
    white-space: nowrap;
  }

  .role-badge.owner {
    background: var(--color-admin, #dfe6e9);
    color: var(--color-admin-text, #d63031);
  }

  .role-badge.member {
    background: var(--color-member, #dfe6e9);
    color: var(--color-member-text, #2d3436);
  }

  .card-info {
    margin: 1rem 0;
    color: var(--color-text-secondary, #666);
  }

  .card-info p {
    margin: 0.5rem 0;
  }

  .card-actions {
    display: flex;
    gap: 0.5rem;
    margin-top: 1.5rem;
  }

  .card-actions button {
    flex: 1;
  }

  .empty-state {
    text-align: center;
    padding: 3rem 1rem;
    color: var(--color-text-secondary, #666);
  }

  .empty-state p {
    margin-bottom: 1.5rem;
  }

  @media (max-width: 768px) {
    .hyggesnak-grid {
      grid-template-columns: 1fr;
    }
  }
</style>
