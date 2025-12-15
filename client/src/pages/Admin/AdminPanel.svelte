<script>
    import UserManagement from './UserManagement.svelte';
    import HyggesnakManagement from './HyggesnakManagement.svelte';
    import Statistics from './Statistics.svelte';

    let activeTab = $state('users');

    const tabs = [
        { id: 'users', label: 'Brugere', icon: '👥' },
        { id: 'hyggesnakke', label: 'Hyggesnakke', icon: '💬' },
        { id: 'stats', label: 'Statistik', icon: '📊' }
    ];
</script>

<div class="admin-panel">
    <div class="admin-header">
        <h1>🔧 Admin Panel</h1>
        <p class="subtitle">System administration</p>
    </div>

    <div class="tabs">
        {#each tabs as tab}
            <button
                class="tab"
                class:active={activeTab === tab.id}
                onclick={() => activeTab = tab.id}
            >
                <span class="icon">{tab.icon}</span>
                <span class="label">{tab.label}</span>
            </button>
        {/each}
    </div>

    <div class="tab-content">
        {#if activeTab === 'users'}
            <UserManagement />
        {:else if activeTab === 'hyggesnakke'}
            <HyggesnakManagement />
        {:else if activeTab === 'stats'}
            <Statistics />
        {/if}
    </div>
</div>

<style>
    .admin-panel {
        max-width: 1200px;
        margin: 0 auto;
        padding: 2rem;
    }

    .admin-header {
        text-align: center;
        margin-bottom: 2rem;
        padding: 2rem;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        border-radius: 12px;
    }

    .admin-header h1 {
        margin: 0 0 0.5rem 0;
        font-size: 2rem;
    }

    .subtitle {
        margin: 0;
        opacity: 0.9;
        font-size: 1rem;
    }

    .tabs {
        display: flex;
        gap: 0.5rem;
        margin-bottom: 2rem;
        border-bottom: 2px solid var(--border);
    }

    .tab {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        padding: 1rem 1.5rem;
        background: transparent;
        border: none;
        border-bottom: 3px solid transparent;
        cursor: pointer;
        font-size: 1rem;
        font-weight: 500;
        color: var(--text-secondary);
        transition: all 0.2s;
    }

    .tab:hover {
        color: var(--text);
        background: var(--hover-bg);
    }

    .tab.active {
        color: var(--primary);
        border-bottom-color: var(--primary);
        background: var(--primary-bg);
    }

    .tab .icon {
        font-size: 1.25rem;
    }

    .tab-content {
        min-height: 400px;
    }

    @media (max-width: 768px) {
        .admin-panel {
            padding: 1rem;
        }

        .tabs {
            flex-direction: column;
            border-bottom: none;
        }

        .tab {
            border-bottom: 1px solid var(--border);
            border-left: 3px solid transparent;
        }

        .tab.active {
            border-bottom-color: var(--border);
            border-left-color: var(--primary);
        }
    }
</style>
