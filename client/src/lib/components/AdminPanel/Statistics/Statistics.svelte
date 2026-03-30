<script>
    import { onMount } from 'svelte';
    import { apiGet } from '../../../api/api.js';
    import { API_ENDPOINTS } from '../../../utils/constants.js';
    import './Statistics.css';

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
        <button class="btn btn-secondary" onclick={loadStatistics} disabled={loading}>
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

        <div class="info-section">
            <h3>ℹ️ System Information</h3>
            <div class="info-grid">
                <div class="info-item">
                    <span class="label">Database:</span>
                    <span class="value">SQLite</span>
                </div>
                <div class="info-item">
                    <span class="label">Environment:</span>
                    <span class="value">{import.meta.env.MODE}</span>
                </div>
                <div class="info-item">
                    <span class="label">Server Status:</span>
                    <span class="value status-active">🟢 Online</span>
                </div>
            </div>
        </div>
    {/if}
</div>
