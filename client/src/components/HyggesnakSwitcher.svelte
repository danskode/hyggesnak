<script>
  import { navigate } from 'svelte-routing';
  import { hyggesnakke, currentHyggesnak } from '../stores/hyggesnakStore.svelte.js';
  import { toast } from 'svelte-sonner';

  let showDropdown = $state(false);

  function toggleDropdown() {
    showDropdown = !showDropdown;
  }

  function selectHyggesnak(hyggesnak) {
    currentHyggesnak.select(hyggesnak);
    showDropdown = false;
    navigate(`/h/${hyggesnak.id}/members`);
    toast.success(`Skiftede til ${hyggesnak.display_name}`);
  }

  function createNew() {
    showDropdown = false;
    navigate('/hyggesnakke/create');
  }

  // Close dropdown when clicking outside
  $effect(() => {
    function handleClickOutside(event) {
      if (showDropdown && !event.target.closest('.hyggesnak-switcher')) {
        showDropdown = false;
      }
    }

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  });
</script>

{#if $currentHyggesnak}
  <div class="hyggesnak-switcher">
    <button class="switcher-button" onclick={toggleDropdown}>
      <span class="hyggesnak-name">{$currentHyggesnak.display_name}</span>
      <span class="dropdown-arrow">{showDropdown ? '▲' : '▼'}</span>
    </button>

    {#if showDropdown}
      <div class="dropdown-menu">
        <div class="dropdown-header">Dine hyggesnakke</div>

        {#each $hyggesnakke as hyggesnak}
          <button
            class="dropdown-item {hyggesnak.id === $currentHyggesnak.id ? 'active' : ''}"
            onclick={() => selectHyggesnak(hyggesnak)}
          >
            <div class="hyggesnak-info">
              <span class="hyggesnak-display-name">{hyggesnak.display_name}</span>
              <span class="hyggesnak-role {hyggesnak.user_role.toLowerCase()}">{hyggesnak.user_role === 'ADMIN' ? 'Admin' : 'Medlem'}</span>
            </div>
          </button>
        {/each}

        <div class="dropdown-divider"></div>

        <button class="dropdown-item create-new" onclick={createNew}>
          + Opret ny hyggesnak
        </button>
      </div>
    {/if}
  </div>
{/if}

<style>
  .hyggesnak-switcher {
    position: relative;
    display: inline-block;
  }

  .switcher-button {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 1rem;
    background: var(--color-bg-secondary, #f5f5f5);
    border: 1px solid var(--color-border, #ddd);
    border-radius: 8px;
    cursor: pointer;
    font-size: 1rem;
    transition: background 0.2s;
  }

  .switcher-button:hover {
    background: var(--color-bg-hover, #e5e5e5);
  }

  .hyggesnak-name {
    font-weight: 500;
  }

  .dropdown-arrow {
    font-size: 0.75rem;
    color: var(--color-text-secondary, #666);
  }

  .dropdown-menu {
    position: absolute;
    top: calc(100% + 0.5rem);
    left: 0;
    min-width: 250px;
    background: var(--color-bg, white);
    border: 1px solid var(--color-border, #ddd);
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    z-index: 1000;
    overflow: hidden;
  }

  .dropdown-header {
    padding: 0.75rem 1rem;
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--color-text-secondary, #666);
    background: var(--color-bg-secondary, #f9f9f9);
    border-bottom: 1px solid var(--color-border, #eee);
  }

  .dropdown-item {
    width: 100%;
    padding: 0.75rem 1rem;
    background: none;
    border: none;
    text-align: left;
    cursor: pointer;
    transition: background 0.2s;
  }

  .dropdown-item:hover {
    background: var(--color-bg-hover, #f5f5f5);
  }

  .dropdown-item.active {
    background: var(--color-primary-light, #e3f2fd);
  }

  .hyggesnak-info {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
  }

  .hyggesnak-display-name {
    font-weight: 500;
  }

  .hyggesnak-role {
    font-size: 0.75rem;
    padding: 0.25rem 0.5rem;
    border-radius: 4px;
    font-weight: 600;
  }

  .hyggesnak-role.admin {
    background: var(--color-admin, #ffeaa7);
    color: var(--color-admin-text, #d63031);
  }

  .hyggesnak-role.member {
    background: var(--color-member, #dfe6e9);
    color: var(--color-member-text, #2d3436);
  }

  .dropdown-divider {
    height: 1px;
    background: var(--color-border, #eee);
    margin: 0.5rem 0;
  }

  .create-new {
    color: var(--color-primary, #0066cc);
    font-weight: 500;
  }

  @media (prefers-color-scheme: dark) {
    .switcher-button {
      background: var(--color-bg-secondary, #2a2a2a);
      border-color: var(--color-border, #444);
    }

    .switcher-button:hover {
      background: var(--color-bg-hover, #333);
    }

    .dropdown-menu {
      background: var(--color-bg, #1e1e1e);
      border-color: var(--color-border, #444);
    }

    .dropdown-header {
      background: var(--color-bg-secondary, #2a2a2a);
      border-color: var(--color-border, #333);
    }

    .dropdown-item:hover {
      background: var(--color-bg-hover, #2a2a2a);
    }

    .dropdown-item.active {
      background: var(--color-primary-dark, #1565c0);
    }
  }
</style>
