<script>
    import { onMount } from "svelte";
    import { auth } from "../../stores/authStore.svelte.js";
    import { currentHyggesnak } from "../../stores/hyggesnakStore.svelte.js";
    import { navigate } from 'svelte-routing';
    import { toast } from 'svelte-sonner';
    import { validatePassword, validateEmail, validateUsername, validateDisplayName } from '../../lib/validators.js';
    import { apiGet, apiPost, apiPut, apiDelete } from '../../lib/api.js';
    import { API_ENDPOINTS } from '../../lib/constants.js';

    // Get hyggesnakId from current hyggesnak (reactive - updates when currentHyggesnak changes)
    let hyggesnakId = $derived($currentHyggesnak?.id);

    let members = $state([]);
    let loading = $state(true);
    let error = $state(null);

    // Admin form state variables
    let showCreateForm = $state(false);
    let creating = $state(false);
    let deleting = $state(null); // ID of member being deleted
    let newMember = $state({
        username: '',
        display_name: '',
        email: '',
        password: '',
        role: 'USER'
    });

    // Display name editing state
    let editingDisplayName = $state(null); // ID of member whose display name is being edited
    let newDisplayName = $state('');
    let updatingDisplayName = $state(false);

    async function loadMembers() {
        if (!hyggesnakId) {
            error = "Ingen hyggesnak valgt";
            loading = false;
            return;
        }

        loading = true;
        error = null;
        try {
            const result = await apiGet(`${API_ENDPOINTS.MEMBERS(hyggesnakId)}`);
            members = result.data;
        } catch (err) {
            error = err.message;
        } finally {
            loading = false;
        }
    }

    async function handleCreateMember(event) {
        event.preventDefault();

        // Validate username on client
        const usernameValidation = validateUsername(newMember.username);
        if (!usernameValidation.valid) {
            toast.error(usernameValidation.message);
            return;
        }

        // Validate display name on client
        const displayNameValidation = validateDisplayName(newMember.display_name);
        if (!displayNameValidation.valid) {
            toast.error(displayNameValidation.message);
            return;
        }

        // Validate email on client
        const emailValidation = validateEmail(newMember.email);
        if (!emailValidation.valid) {
            toast.error(emailValidation.message);
            return;
        }

        // Validate password on client
        const passwordValidation = validatePassword(newMember.password);
        if (!passwordValidation.valid) {
            toast.error(passwordValidation.message);
            return;
        }

        creating = true;

        try {
            await apiPost(`${API_ENDPOINTS.MEMBERS(hyggesnakId)}`, newMember);

            toast.success(`Medlem ${newMember.username} oprettet succesfuldt!`);

            // Reset form
            newMember = {
                username: '',
                display_name: '',
                email: '',
                password: '',
                role: 'USER'
            };
            showCreateForm = false;

            // Reload members list
            await loadMembers();

        } catch (err) {
            toast.error(err.message || 'Kunne ikke oprette medlem');
        } finally {
            creating = false;
        }
    }

    async function handleDeleteMember(member) {
        const isSelfRemoval = member.id === $auth.id;

        // Confirmation dialog
        const confirmed = window.confirm(
            isSelfRemoval
                ? `Er du sikker på at du vil forlade denne hyggesnak?\n\nDu mister adgang til denne hyggesnak.`
                : `Er du sikker på at du vil fjerne "${member.username}" fra denne hyggesnak?\n\nDe mister adgang til denne hyggesnak.`
        );

        if (!confirmed) {
            return;
        }

        deleting = member.id;

        try {
            await apiDelete(`${API_ENDPOINTS.MEMBERS(hyggesnakId)}/${member.id}`);

            // If self-removal, redirect to hyggesnak list
            if (isSelfRemoval) {
                toast.success('Du har forladt denne hyggesnak');
                navigate('/hyggesnakke');
            } else {
                toast.success(`${member.username} blev fjernet fra hyggesnak`);
                await loadMembers();
            }

        } catch (err) {
            toast.error(err.message || 'Kunne ikke slette medlem');
        } finally {
            deleting = null;
        }
    }

    function startEditingDisplayName(member) {
        editingDisplayName = member.id;
        newDisplayName = member.display_name || member.username;
    }

    function cancelEditingDisplayName() {
        editingDisplayName = null;
        newDisplayName = '';
    }

    async function handleUpdateDisplayName() {
        // Validate display name on client
        const displayNameValidation = validateDisplayName(newDisplayName);
        if (!displayNameValidation.valid) {
            toast.error(displayNameValidation.message);
            return;
        }

        updatingDisplayName = true;

        try {
            await apiPut(`${API_ENDPOINTS.HYGGESNAKKE}/${hyggesnakId}/members/me/display-name`, { display_name: newDisplayName });

            toast.success('Visningsnavn opdateret!');
            editingDisplayName = null;
            newDisplayName = '';

            // Reload members list
            await loadMembers();

        } catch (err) {
            toast.error(err.message || 'Kunne ikke opdatere visningsnavn');
        } finally {
            updatingDisplayName = false;
        }
    }

    // Check if current user is owner of THIS hyggesnak
    let isOwner = $derived($currentHyggesnak && $currentHyggesnak.user_role === 'OWNER');

    // Reload members when hyggesnak changes
    $effect(() => {
        if (hyggesnakId) {
            loadMembers();
        }
    });
</script>

<h1>Medlemmer af denne hyggesnak</h1>

{#if isOwner}
    <div class="admin-section">
        <button onclick={() => showCreateForm = !showCreateForm}>
            {showCreateForm ? 'Annuller' : '+ Opret nyt medlem'}
        </button>

        {#if showCreateForm}
            <form onsubmit={handleCreateMember} class="create-member-form">
                <h3>Opret nyt medlem</h3>

                <div>
                    <label for="username">Brugernavn:</label>
                    <input
                        type="text"
                        id="username"
                        bind:value={newMember.username}
                        required
                        placeholder="fx: mormor"
                    />
                </div>

                <div>
                    <label for="display_name">Navn i chatten:</label>
                    <input
                        type="text"
                        id="display_name"
                        bind:value={newMember.display_name}
                        required
                        placeholder="fx: Mormor 👵🏼"
                    />
                </div>

                <div>
                    <label for="email">Email:</label>
                    <input
                        type="email"
                        id="email"
                        bind:value={newMember.email}
                        required
                        placeholder="fx: mormor@hyggesnak.dk"
                    />
                </div>

                <div>
                    <label for="password">Password:</label>
                    <input
                        type="password"
                        id="password"
                        bind:value={newMember.password}
                        required
                        minlength="8"
                        placeholder="Min 8 tegn, inkl. stort bogstav, lille bogstav og tal"
                    />
                </div>

                <div>
                    <label for="role">Rolle:</label>
                    <select id="role" bind:value={newMember.role} required>
                        <option value="USER">Medlem</option>
                        <option value="ADMIN">Admin</option>
                    </select>
                </div>

                <button type="submit" disabled={creating}>
                    {creating ? 'Opretter...' : 'Opret medlem'}
                </button>
            </form>
        {/if}
    </div>
{/if}

{#if loading}
    <p>Loading members...</p>
{:else if error}
    <p>Error: {error}</p>
{:else if members && members.length > 0}
    <div class="members-list">
        {#each members as member}
            <div class="member-card">
                {#if editingDisplayName === member.id && member.id === $auth.id}
                    <!-- Editing display name form -->
                    <div class="edit-display-name-form">
                        <h3>Rediger visningsnavn</h3>
                        <input
                            type="text"
                            bind:value={newDisplayName}
                            placeholder="Indtast nyt visningsnavn"
                            maxlength="100"
                        />
                        <div class="button-group">
                            <button
                                onclick={handleUpdateDisplayName}
                                disabled={updatingDisplayName}
                            >
                                {updatingDisplayName ? 'Gemmer...' : 'Gem'}
                            </button>
                            <button
                                onclick={cancelEditingDisplayName}
                                disabled={updatingDisplayName}
                            >
                                Annuller
                            </button>
                        </div>
                    </div>
                {:else}
                    <!-- Normal display -->
                    <h3>{member.display_name || member.username}</h3>
                    <p class="username">@{member.username}</p>

                    {#if member.id === $auth.id}
                        <button
                            class="edit-display-name-btn"
                            onclick={() => startEditingDisplayName(member)}
                        >
                            Rediger visningsnavn
                        </button>
                    {/if}

                    <p>Rolle: <strong>{member.role === 'OWNER' ? 'Ejer' : 'Medlem'}</strong></p>
                    {#if isOwner && member.email}
                        <p>Email: {member.email}</p>
                    {/if}

                    <p class="created-at">Medlem siden: {new Date(member.created_at).toLocaleDateString('da-DK')}</p>

                    <!-- Owners can remove others, all users can leave hyggesnak -->
                    {#if (isOwner && member.id !== $auth.id) || member.id === $auth.id}
                        <button
                            class="danger delete-btn"
                            onclick={() => handleDeleteMember(member)}
                            disabled={deleting === member.id}
                        >
                            {deleting === member.id ? 'Fjerner...' : (member.id === $auth.id ? 'Forlad hyggesnak' : 'Fjern medlem')}
                        </button>
                    {/if}
                {/if}
            </div>
        {/each}
    </div>
{:else}
    <p>No members found.</p>
{/if}