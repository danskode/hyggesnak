<script>
    import { onMount } from 'svelte';
    import { toast } from 'svelte-sonner';
    import { auth } from '../../../stores/authStore.js';
    import { apiGet, apiPost, apiDelete } from '../../../api/api.js';
    import { API_ENDPOINTS } from '../../../utils/constants.js';
    import { validateUsername, validateEmail, validatePassword, validateDisplayName } from '../../../utils/validators.js';
    import { formatDate } from '../../../utils/dateUtils.js';
    import './UserManagement.css';
  
    // State
    let users = $state([]);
    let loading = $state(true);
    let page = $state(1);
    let totalPages = $state(1);
    let searchQuery = $state('');
  
    // Form state
    let formData = $state({
      username: '',
      display_name: '',
      email: '',
      password: '',
      role: 'USER'
    });
    let saving = $state(false);
    let deleting = $state(null);
    let showCreateForm = $state(false);
  
    // Load users
    async function loadUsers() {
      loading = true;
      try {
        const params = new URLSearchParams({ page: page.toString(), limit: '20' });
        if (searchQuery) params.append('search', searchQuery);
  
        const result = await apiGet(`${API_ENDPOINTS.ADMIN_USERS}?${params}`);
        users = result.data;
        totalPages = result.pagination.pages;
      } catch (err) {
        // handled in apiGet
      } finally {
        loading = false;
      }
    }
  
    // Handle form submit
    async function handleCreateUser(event) {
      event.preventDefault();
  
      // Validation
      const usernameValidation = validateUsername(formData.username);
      if (!usernameValidation.valid) return toast.error(usernameValidation.message);
  
      if (formData.display_name) {
        const displayNameValidation = validateDisplayName(formData.display_name);
        if (!displayNameValidation.valid) return toast.error(displayNameValidation.message);
      }
  
      const emailValidation = validateEmail(formData.email);
      if (!emailValidation.valid) return toast.error(emailValidation.message);
  
      const passwordValidation = validatePassword(formData.password);
      if (!passwordValidation.valid) return toast.error(passwordValidation.message);
  
      saving = true;
      try {
        await apiPost(API_ENDPOINTS.ADMIN_USERS, formData);
        toast.success('Bruger oprettet!');
        resetForm();
        await loadUsers();
      } catch (err) {
        // handled in apiPost
      } finally {
        saving = false;
      }
    }
  
    async function handleDeleteUser(userId, username) {
      const confirmed = window.confirm(`Er du sikker på at du vil slette brugeren "${username}"? Dette kan ikke fortrydes.`);
      if (!confirmed) return;
  
      deleting = userId;
      try {
        await apiDelete(`${API_ENDPOINTS.ADMIN_USERS}/${userId}`);
        toast.success(`Bruger ${username} slettet`);
        await loadUsers();
      } catch (err) {
        // handled in apiDelete
      } finally {
        deleting = null;
      }
    }
  
    function resetForm() {
      formData = { username: '', display_name: '', email: '', password: '', role: 'USER' };
    }
  
    function handleSearch() {
      page = 1;
      loadUsers();
    }

    onMount(() => {
      loadUsers();
    });
  </script>
  
  <div class="user-management">
    <h2>Bruger Administration</h2>

    <!-- Expandable create user form -->
    <div class="create-user-section">
      <button
        class="expand-toggle"
        onclick={() => showCreateForm = !showCreateForm}
        aria-expanded={showCreateForm}
      >
        <span class="toggle-icon">{showCreateForm ? '▼' : '▶'}</span>
        <span>Opret Ny Bruger</span>
      </button>

      {#if showCreateForm}
        <div class="form-container">
          <form onsubmit={handleCreateUser}>
        <div class="form-group">
          <label for="username">Brugernavn *</label>
          <input type="text" id="username" bind:value={formData.username} required />
        </div>
  
        <div class="form-group">
          <label for="display_name">Visningsnavn</label>
          <input type="text" id="display_name" bind:value={formData.display_name} />
        </div>
  
        <div class="form-group">
          <label for="email">Email *</label>
          <input type="email" id="email" bind:value={formData.email} required />
        </div>
  
        <div class="form-group">
          <label for="password">Password *</label>
          <input type="password" id="password" bind:value={formData.password} required minlength="8" />
          <small>Min 8 tegn, inkl. stort bogstav, lille bogstav og tal</small>
        </div>
  
        <div class="form-group">
          <label for="role">Rolle *</label>
          <select id="role" bind:value={formData.role} required>
            <option value="USER">Bruger</option>
            <option value="SUPER_ADMIN">Super Admin</option>
          </select>
        </div>
  
            <div class="form-actions">
              <button type="submit" class="btn btn-primary" disabled={saving}>
                {saving ? 'Opretter...' : 'Opret Bruger'}
              </button>
              <button type="button" class="btn btn-secondary" onclick={resetForm}>Ryd Formular</button>
            </div>
          </form>
        </div>
      {/if}
    </div>
  
    <!-- Search bar -->
    <div class="search-bar">
      <input
        type="text"
        bind:value={searchQuery}
        onkeydown={(e) => e.key === 'Enter' && handleSearch()}
        placeholder="Søg efter brugernavn eller email..."
      />
      <button class="btn btn-secondary" onclick={handleSearch}>Søg</button>
    </div>
  
    <!-- Users table -->
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
                    class="btn btn-danger btn-sm"
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
  
      <!-- Pagination -->
      {#if totalPages > 1}
        <div class="pagination">
          <button class="btn btn-secondary" disabled={page === 1} onclick={() => { page--; loadUsers(); }}>← Forrige</button>
          <span>Side {page} af {totalPages}</span>
          <button class="btn btn-secondary" disabled={page === totalPages} onclick={() => { page++; loadUsers(); }}>Næste →</button>
        </div>
      {/if}
    {/if}
  </div>  