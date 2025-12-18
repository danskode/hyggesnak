<script>
    import UserManagement from './UserManagement/UserManagement.svelte';
    import HyggesnakManagement from './HyggesnakManagement/HyggesnakManagement.svelte';
    import Statistics from './Statistics/Statistics.svelte';
    import './AdminPanel.css';

    let activeTab = $state('users');

    const tabs = [
        { id: 'users', label: 'Brugere', icon: '👥' },
        { id: 'hyggesnakke', label: 'Hyggesnakke', icon: '💬' },
        { id: 'stats', label: 'Statistik', icon: '📊' }
    ];
</script>

<div class="content-page admin-page">
    <div class="page-header">
        <div>
            <h1>🔧 Admin Panel</h1>
            <p class="subtitle">System administration</p>
        </div>
    </div>

    <section>
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
    </section>
</div>
