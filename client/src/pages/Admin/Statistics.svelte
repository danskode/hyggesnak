<script>
    import { onMount } from 'svelte';
    import { apiGet } from '../../lib/api/api.js';
    import { API_ENDPOINTS } from '../../lib/utils/constants.js';

    let stats = $state(null);
    let loading = $state(true);

    async function loadStatistics() {
        loading = true;
        try {
            const result = await apiGet(API_ENDPOINTS.ADMIN_STATS);
            stats = result.data;
        } catch (err) {
            // Error is handled by apiGet - toast already shown
        } finally {
            loading = false;
        }
    }

    onMount(() => {
        loadStatistics();
    });
</script>

<div class="statistics">
    <div class="header">
        <h2>System Statistik</h2>
        <button onclick={loadStatistics} disabled={loading}>
            {loading ? '...' : '🔄 Opdater'}
        </button>
    </div>

    {#if loading}
        <p class="loading">Indlæser statistik...</p>
    {:else if !stats}
        <p class="error">Kunne ikke hente statistik</p>
    {:else}
        <div class="stats-grid">
            <div class="stat-card primary">
                <div class="icon">👥</div>
                <div class="content">
                    <h3>{stats.totalUsers}</h3>
                    <p>Totale Brugere</p>
                </div>
            </div>

            <div class="stat-card success">
                <div class="icon">💬</div>
                <div class="content">
                    <h3>{stats.totalHyggesnakke}</h3>
                    <p>Totale Hyggesnakke</p>
                </div>
            </div>

            <div class="stat-card warning">
                <div class="icon">✨</div>
                <div class="content">
                    <h3>{stats.newUsersThisWeek}</h3>
                    <p>Nye Brugere (7 dage)</p>
                </div>
            </div>
        </div>

        <div class="section">
            <h3>Brugere pr. Rolle</h3>
            <div class="role-breakdown">
                {#each stats.usersByRole as roleData}
                    <div class="role-item">
                        <div class="role-info">
                            <span class="role-name">
                                {roleData.role === 'SUPER_ADMIN' ? 'Super Admin' : 'Bruger'}
                            </span>
                            <span class="role-count">{roleData.count} {roleData.count === 1 ? 'person' : 'personer'}</span>
                        </div>
                        <div class="role-bar">
                            <div
                                class="role-fill"
                                class:admin={roleData.role === 'SUPER_ADMIN'}
                                style="width: {(roleData.count / stats.totalUsers) * 100}%"
                            ></div>
                        </div>
                    </div>
                {/each}
            </div>
        </div>

        <div class="info-section">
            <h3>ℹ️ System Information</h3>
            <div class="info-grid">
                <div class="info-item">
                    <span class="label">Database:</span>
                    <span class="value">SQLite</span>
                </div>
                <div class="info-item">
                    <span class="label">Environment:</span>
                    <span class="value">Development</span>
                </div>
                <div class="info-item">
                    <span class="label">Server Status:</span>
                    <span class="value status-active">🟢 Online</span>
                </div>
            </div>
        </div>
    {/if}
</div>

<style>
    .statistics {
        padding: 1rem;
    }

    .header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 2rem;
    }

    h2 {
        margin: 0;
    }

    .loading, .error {
        text-align: center;
        padding: 3rem;
        color: var(--text-secondary);
    }

    .error {
        color: var(--error);
    }

    .stats-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
        gap: 1.5rem;
        margin-bottom: 2rem;
    }

    .stat-card {
        display: flex;
        align-items: center;
        gap: 1.5rem;
        padding: 2rem;
        border-radius: 12px;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }

    .stat-card.primary {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
    }

    .stat-card.success {
        background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);
        color: white;
    }

    .stat-card.warning {
        background: linear-gradient(135deg, #fa709a 0%, #fee140 100%);
        color: white;
    }

    .stat-card .icon {
        font-size: 3rem;
        opacity: 0.9;
    }

    .stat-card .content h3 {
        margin: 0 0 0.25rem 0;
        font-size: 2.5rem;
        font-weight: 700;
    }

    .stat-card .content p {
        margin: 0;
        opacity: 0.9;
        font-size: 0.875rem;
        font-weight: 500;
    }

    .section {
        background: var(--card-bg);
        padding: 1.5rem;
        border-radius: 12px;
        border: 1px solid var(--border);
        margin-bottom: 2rem;
    }

    .section h3 {
        margin: 0 0 1.5rem 0;
    }

    .role-breakdown {
        display: flex;
        flex-direction: column;
        gap: 1rem;
    }

    .role-item {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
    }

    .role-info {
        display: flex;
        justify-content: space-between;
        font-size: 0.875rem;
    }

    .role-name {
        font-weight: 600;
    }

    .role-count {
        color: var(--text-secondary);
    }

    .role-bar {
        height: 24px;
        background: var(--bg);
        border-radius: 12px;
        overflow: hidden;
    }

    .role-fill {
        height: 100%;
        background: var(--primary);
        border-radius: 12px;
        transition: width 0.3s ease;
    }

    .role-fill.admin {
        background: var(--warning);
    }

    .info-section {
        background: var(--card-bg);
        padding: 1.5rem;
        border-radius: 12px;
        border: 1px solid var(--border);
    }

    .info-section h3 {
        margin: 0 0 1rem 0;
    }

    .info-grid {
        display: grid;
        gap: 0.75rem;
    }

    .info-item {
        display: flex;
        justify-content: space-between;
        padding: 0.75rem;
        background: var(--bg);
        border-radius: 6px;
    }

    .label {
        font-weight: 600;
    }

    .value {
        color: var(--text-secondary);
    }

    .status-active {
        color: var(--success);
        font-weight: 600;
    }
</style>
