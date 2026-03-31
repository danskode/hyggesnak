<script>
  import { onMount, onDestroy } from 'svelte';
  import { navigate, Link } from 'svelte-routing';
  import { auth } from '../../lib/stores/authStore.js';
  import { hyggesnakke, currentHyggesnak } from '../../lib/stores/hyggesnakStore.js';
  import { unreadCounts } from '../../lib/stores/unreadStore.js';
  import { toast } from 'svelte-sonner';
  import { sanitizeHyggesnakName, sanitizeDisplayName } from '../../lib/utils/sanitize.js';
  import { apiGet, apiDelete } from '../../lib/api/api.js';
  import { API_ENDPOINTS } from '../../lib/utils/constants.js';
  import { useSocket } from '../../lib/composables/useSocket.js';
  import { pageActions } from '../../lib/stores/pageContextStore.js';
  import Avatar from '../../lib/components/Avatar.svelte';
  import './HyggesnakList.css';

  let loading = $state(true);
  let error = $state(null);
  let leaving = $state(null);
  let swipedId = $state(null);
  let touchStartX = 0;

  //==== Reorder state ====//
  let reorderMode = $state(false);
  let orderedList = $state([]);
  let dragIndex = $state(null);
  let dragOverIndex = $state(null);

  function storageKey() {
    return `hyggesnak-order-${$auth.id}`;
  }

  function loadOrder(items) {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey()) || '[]');
      return [...items].sort((a, b) => {
        const ai = saved.indexOf(a.id);
        const bi = saved.indexOf(b.id);
        if (ai === -1 && bi === -1) return 0;
        if (ai === -1) return 1;
        if (bi === -1) return -1;
        return ai - bi;
      });
    } catch {
      return items;
    }
  }

  function saveOrder() {
    localStorage.setItem(storageKey(), JSON.stringify(orderedList.map(h => h.id)));
  }

  // Rebuild orderedList whenever the store changes, preserving custom order
  $effect(() => {
    const items = $hyggesnakke || [];
    orderedList = loadOrder(items);
  });

  //==== Desktop drag-and-drop ====//
  function handleDragStart(e, index) {
    dragIndex = index;
    e.dataTransfer.effectAllowed = 'move';
  }

  function handleDragOver(e, index) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    dragOverIndex = index;
  }

  function handleDrop(e, index) {
    e.preventDefault();
    if (dragIndex === null || dragIndex === index) {
      dragIndex = null;
      dragOverIndex = null;
      return;
    }
    const list = [...orderedList];
    const [moved] = list.splice(dragIndex, 1);
    list.splice(index, 0, moved);
    orderedList = list;
    saveOrder();
    dragIndex = null;
    dragOverIndex = null;
  }

  function handleDragEnd() {
    dragIndex = null;
    dragOverIndex = null;
  }

  //==== Mobile reorder ====//
  function moveUp(index) {
    if (index === 0) return;
    const list = [...orderedList];
    [list[index - 1], list[index]] = [list[index], list[index - 1]];
    orderedList = list;
    saveOrder();
  }

  function moveDown(index) {
    if (index === orderedList.length - 1) return;
    const list = [...orderedList];
    [list[index], list[index + 1]] = [list[index + 1], list[index]];
    orderedList = list;
    saveOrder();
  }

  //==== Swipe to leave (disabled in reorder mode) ====//
  function handleTouchStart(e, hyggesnakId) {
    if (reorderMode) return;
    touchStartX = e.touches[0].clientX;
    if (swipedId !== null && swipedId !== hyggesnakId) {
      swipedId = null;
    }
  }

  function handleTouchEnd(e, hyggesnakId) {
    if (reorderMode) return;
    const delta = e.changedTouches[0].clientX - touchStartX;
    if (delta < -50) {
      swipedId = hyggesnakId;
    } else if (delta > 20) {
      swipedId = null;
    }
  }

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

  onDestroy(() => {
    pageActions.set([]);
  });

  onMount(async () => {
    pageActions.set([{ label: '+ Opret ny hyggesnak', path: '/hyggesnakke/create' }]);

    await loadHyggesnakke();

    socket.connect();

    socket.on('network:connection:removed', async () => {
      await loadHyggesnakke();
    });
  });
</script>

<div class="content-page">
  <div class="page-header">
    <h1>{sanitizeDisplayName($auth.display_name || $auth.username)}, her er dine hyggesnakke</h1>
    <div class="header-actions">
      {#if orderedList.length > 1}
        <button
          class="btn btn-secondary"
          class:btn-active={reorderMode}
          onclick={() => { reorderMode = !reorderMode; swipedId = null; }}
        >
          {reorderMode ? 'Færdig' : '⇅ Tilpas rækkefølge'}
        </button>
      {/if}
      <span class="create-link">
        <Link to="/hyggesnakke/create">
          <button class="btn btn-primary">+ Opret ny hyggesnak</button>
        </Link>
      </span>
    </div>
  </div>

  <section>
    {#if loading}
      <div class="empty-state">Indlæser hyggesnakke...</div>
    {:else if error}
      <p class="error">Fejl: {error}</p>
    {:else if orderedList.length > 0}
      <div class="card-list" class:reorder-list={reorderMode}>
        {#each orderedList as hyggesnak, index (hyggesnak.id)}
          <div
            class="swipe-wrapper"
            class:swiped={swipedId === hyggesnak.id}
            class:drag-over={dragOverIndex === index && dragIndex !== index}
            class:dragging={dragIndex === index}
            class:reorder-mode={reorderMode}
            draggable={reorderMode}
            ondragstart={reorderMode ? (e) => handleDragStart(e, index) : null}
            ondragover={reorderMode ? (e) => handleDragOver(e, index) : null}
            ondrop={reorderMode ? (e) => handleDrop(e, index) : null}
            ondragend={reorderMode ? handleDragEnd : null}
            ontouchstart={(e) => handleTouchStart(e, hyggesnak.id)}
            ontouchend={(e) => handleTouchEnd(e, hyggesnak.id)}
          >
            {#if reorderMode}
              <div class="mobile-reorder-buttons">
                <button
                  class="btn btn-icon btn-sm"
                  onclick={() => moveUp(index)}
                  disabled={index === 0}
                  aria-label="Flyt op"
                >↑</button>
                <button
                  class="btn btn-icon btn-sm"
                  onclick={() => moveDown(index)}
                  disabled={index === orderedList.length - 1}
                  aria-label="Flyt ned"
                >↓</button>
              </div>
            {/if}

            <div
              class="hyggesnak-card list-item swipe-content"
              role="button"
              tabindex="0"
              onclick={() => {
                if (reorderMode) return;
                if (swipedId === hyggesnak.id) { swipedId = null; return; }
                selectAndNavigate(hyggesnak);
              }}
              onkeydown={(e) => { if (!reorderMode && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); selectAndNavigate(hyggesnak); } }}
            >
              {#if reorderMode}
                <div class="drag-handle" aria-hidden="true">⠿</div>
              {/if}

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

              {#if !reorderMode}
                <div class="hyggesnak-actions">
                  <button
                    class="btn btn-danger btn-sm"
                    onclick={(e) => { e.stopPropagation(); handleLeaveHyggesnak(hyggesnak); }}
                    disabled={leaving === hyggesnak.id}
                  >
                    {leaving === hyggesnak.id ? 'Forlader...' : 'Forlad'}
                  </button>
                </div>
              {/if}
            </div>

            {#if !reorderMode}
              <div class="swipe-action">
                <button
                  onclick={(e) => { e.stopPropagation(); swipedId = null; handleLeaveHyggesnak(hyggesnak); }}
                  disabled={leaving === hyggesnak.id}
                >
                  {leaving === hyggesnak.id ? '...' : 'Forlad'}
                </button>
              </div>
            {/if}
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
