<script>
    import { onMount } from 'svelte';
    import { toast } from 'svelte-sonner';
    import { auth } from '../../lib/stores/authStore.js';
    import { apiGet, apiPost, apiDelete } from '../../lib/api/api.js';
    import { API_ENDPOINTS } from '../../lib/utils/constants.js';
    import { validateUsername, validateEmail, validatePassword, validateDisplayName } from '../../lib/utils/validators.js';

    let users = $state([]);
    let loading = $state(true);
    let page = $state(1);
    let totalPages = $state(1);
    let searchQuery = $state('');
    let showCreateModal = $state(false);
    let editingUser = $state(null);

    // Create/Edit user form
    let formData = $state({
        username: '',
        display_name: '',
        email: '',
        password: '',
        role: 'USER'
    });
    let saving = $state(false);
    let deleting = $state(null);

    async function loadUsers() {
        loading = true;
        try {
            const params = new URLSearchParams({
                page: page.toString(),
                limit: '20'
            });
            if (searchQuery) {
                params.append('search', searchQuery);
            }

            const result = await apiGet(`${API_ENDPOINTS.ADMIN_USERS}?${params}`);
            users = result.data;
            totalPages = result.pagination.pages;
        } catch (err) {
            // Error is handled by apiGet - toast already shown
        } finally {
            loading = false;
        }
    }

    async function handleCreateUser(event) {
        event.preventDefault();

        // Validate
        const usernameValidation = validateUsername(formData.username);
        if (!usernameValidation.valid) {
            toast.error(usernameValidation.message);
            return;
        }

        if (formData.display_name) {
            const displayNameValidation = validateDisplayName(formData.display_name);
            if (!displayNameValidation.valid) {
                toast.error(displayNameValidation.message);
                return;
            }
        }

        const emailValidation = validateEmail(formData.email);
        if (!emailValidation.valid) {
            toast.error(emailValidation.message);
            return;
        }

        const passwordValidation = validatePassword(formData.password);
        if (!passwordValidation.valid) {
            toast.error(passwordValidation.message);
            return;
        }

        saving = true;
        try {
            await apiPost(API_ENDPOINTS.ADMIN_USERS, formData);

            toast.success('Bruger oprettet!');
            showCreateModal = false;
            resetForm();
            await loadUsers();
        } catch (err) {
            // Error is handled by apiPost - toast already shown
        } finally {
            saving = false;
        }
    }

    async function handleUpdateUser(userId, updates) {
        try {
            await apiDelete(`${API_ENDPOINTS.ADMIN_USERS}/${userId}`);

            toast.success('Bruger opdateret!');
            editingUser = null;
            await loadUsers();
        } catch (err) {
            // Error is handled by apiDelete - toast already shown
        }
    }

    async function handleDeleteUser(userId, username) {
        const confirmed = window.confirm(
            `Er du sikker på at du vil slette brugeren "${username}"?\n\nDette kan ikke fortrydes.`
        );
        if (!confirmed) return;

        deleting = userId;
        try {
            await apiDelete(`${API_ENDPOINTS.ADMIN_USERS}/${userId}`);

            toast.success(`Bruger ${username} slettet`);
            await loadUsers();
        } catch (err) {
            // Error is handled by apiDelete - toast already shown
        } finally {
            deleting = null;
        }
    }

    function openCreateModal() {
        resetForm();
        showCreateModal = true;
    }

    function resetForm() {
        formData = {
            username: '',
            display_name: '',
            email: '',
            password: '',
            role: 'USER'
        };
    }

    function handleSearch() {
        page = 1;
        loadUsers();
    }

    function formatDate(dateString) {
        return new Date(dateString).toLocaleDateString('da-DK', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }

    onMount(() => {
        loadUsers();
    });
</script>

<div class="user-management">
    <div class="header">
        <h2>Bruger Administration</h2>
        <button class="primary" onclick={openCreateModal}>
            + Opret Bruger
        </button>
    </div>

    <div class="search-bar">
        <input
            type="text"
            bind:value={searchQuery}
            onkeydown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="Søg efter brugernavn eller email..."
        />
        <button onclick={handleSearch}>Søg</button>
    </div>

    {#if loading}
        <p class="loading">Indlæser brugere...</p>
    {:else if users.length === 0}
        <p class="no-data">Ingen brugere fundet</p>
    {:else}
        <div class="users-table">
            <table>
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Brugernavn</th>
                        <th>Visningsnavn</th>
                        <th>Email</th>
                        <th>Rolle</th>
                        <th>Oprettet</th>
                        <th>Handlinger</th>
                    </tr>
                </thead>
                <tbody>
                    {#each users as user}
                        <tr>
                            <td>{user.id}</td>
                            <td>
                                <strong>{user.username}</strong>
                                {#if user.id === $auth.id}
                                    <span class="badge you">Dig</span>
                                {/if}
                            </td>
                            <td>{user.display_name || '-'}</td>
                            <td>{user.email}</td>
                            <td>
                                <span class="role-badge" class:super={user.role === 'SUPER_ADMIN'}>
                                    {user.role === 'SUPER_ADMIN' ? 'Super Admin' : 'Bruger'}
                                </span>
                            </td>
                            <td>{formatDate(user.created_at)}</td>
                            <td class="actions">
                                <button
                                    class="small danger"
                                    onclick={() => handleDeleteUser(user.id, user.username)}
                                    disabled={deleting === user.id || user.id === $auth.id}
                                >
                                    {deleting === user.id ? '...' : 'Slet'}
                                </button>
                            </td>
                        </tr>
                    {/each}
                </tbody>
            </table>
        </div>

        {#if totalPages > 1}
            <div class="pagination">
                <button
                    disabled={page === 1}
                    onclick={() => { page--; loadUsers(); }}
                >
                    ← Forrige
                </button>
                <span>Side {page} af {totalPages}</span>
                <button
                    disabled={page === totalPages}
                    onclick={() => { page++; loadUsers(); }}
                >
                    Næste →
                </button>
            </div>
        {/if}
    {/if}
</div>

{#if showCreateModal}
    <div
        class="modal-overlay"
        role="button"
        tabindex="0"
        onclick={() => showCreateModal = false}
        onkeydown={(e) => e.key === 'Escape' && (showCreateModal = false)}
    >
        <div
            class="modal"
            role="dialog"
            aria-modal="true"
            onclick={(e) => e.stopPropagation()}
            onkeydown={(e) => e.stopPropagation()}
        >
            <div class="modal-header">
                <h3>Opret Ny Bruger</h3>
                <button class="close" onclick={() => showCreateModal = false}>×</button>
            </div>

            <form onsubmit={handleCreateUser}>
                <div class="form-group">
                    <label for="username">Brugernavn *</label>
                    <input
                        type="text"
                        id="username"
                        bind:value={formData.username}
                        required
                    />
                </div>

                <div class="form-group">
                    <label for="display_name">Visningsnavn</label>
                    <input
                        type="text"
                        id="display_name"
                        bind:value={formData.display_name}
                    />
                </div>

                <div class="form-group">
                    <label for="email">Email *</label>
                    <input
                        type="email"
                        id="email"
                        bind:value={formData.email}
                        required
                    />
                </div>

                <div class="form-group">
                    <label for="password">Password *</label>
                    <input
                        type="password"
                        id="password"
                        bind:value={formData.password}
                        required
                        minlength="8"
                    />
                    <small>Min 8 tegn, inkl. stort bogstav, lille bogstav og tal</small>
                </div>

                <div class="form-group">
                    <label for="role">Rolle *</label>
                    <select id="role" bind:value={formData.role} required>
                        <option value="USER">Bruger</option>
                        <option value="SUPER_ADMIN">Super Admin</option>
                    </select>
                </div>

                <div class="modal-actions">
                    <button type="button" onclick={() => showCreateModal = false}>
                        Annuller
                    </button>
                    <button type="submit" class="primary" disabled={saving}>
                        {saving ? 'Opretter...' : 'Opret Bruger'}
                    </button>
                </div>
            </form>
        </div>
    </div>
{/if}

<style>
    .user-management {
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

    .search-bar {
        display: flex;
        gap: 0.5rem;
        margin-bottom: 1.5rem;
    }

    .search-bar input {
        flex: 1;
        padding: 0.75rem;
        border: 1px solid var(--border);
        border-radius: 6px;
    }

    .loading, .no-data {
        text-align: center;
        padding: 3rem;
        color: var(--text-secondary);
    }

    .users-table {
        overflow-x: auto;
        border: 1px solid var(--border);
        border-radius: 8px;
    }

    table {
        width: 100%;
        border-collapse: collapse;
    }

    th {
        background: var(--card-bg);
        padding: 1rem;
        text-align: left;
        font-weight: 600;
        border-bottom: 2px solid var(--border);
    }

    td {
        padding: 1rem;
        border-bottom: 1px solid var(--border);
    }

    tr:hover {
        background: var(--hover-bg);
    }

    .badge {
        display: inline-block;
        padding: 0.25rem 0.5rem;
        border-radius: 4px;
        font-size: 0.75rem;
        font-weight: 600;
    }

    .badge.you {
        background: var(--primary-bg);
        color: var(--primary);
    }

    .role-badge {
        display: inline-block;
        padding: 0.25rem 0.75rem;
        border-radius: 12px;
        font-size: 0.75rem;
        font-weight: 600;
        background: var(--bg);
        color: var(--text-secondary);
    }

    .role-badge.super {
        background: var(--warning-bg);
        color: var(--warning-dark);
    }

    .actions {
        white-space: nowrap;
    }

    button.small {
        padding: 0.375rem 0.75rem;
        font-size: 0.875rem;
    }

    .pagination {
        display: flex;
        justify-content: center;
        align-items: center;
        gap: 1rem;
        margin-top: 2rem;
    }

    /* Modal styles */
    .modal-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1000;
    }

    .modal {
        background: var(--card-bg);
        border-radius: 12px;
        max-width: 500px;
        width: 90%;
        max-height: 90vh;
        overflow-y: auto;
    }

    .modal-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 1.5rem;
        border-bottom: 1px solid var(--border);
    }

    .modal-header h3 {
        margin: 0;
    }

    .close {
        background: none;
        border: none;
        font-size: 2rem;
        line-height: 1;
        cursor: pointer;
        color: var(--text-secondary);
    }

    form {
        padding: 1.5rem;
    }

    .form-group {
        margin-bottom: 1rem;
    }

    label {
        display: block;
        margin-bottom: 0.5rem;
        font-weight: 600;
    }

    input, select {
        width: 100%;
        padding: 0.75rem;
        border: 1px solid var(--border);
        border-radius: 6px;
    }

    small {
        display: block;
        margin-top: 0.25rem;
        color: var(--text-secondary);
        font-size: 0.875rem;
    }

    .modal-actions {
        display: flex;
        gap: 0.5rem;
        justify-content: flex-end;
        margin-top: 1.5rem;
    }
</style>
