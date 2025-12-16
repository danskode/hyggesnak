<script>
    import { auth } from "../../lib/stores/authStore.js";
    import { toast } from 'svelte-sonner';
    import { navigate, Link } from 'svelte-routing';
    import { apiPost } from '../../lib/api/api.js';
    import { API_ENDPOINTS } from '../../lib/utils/constants.js';

    let username = $state('');
    let password = $state('');
    let loading = $state(false);

    async function handleSubmit(event) {
        event.preventDefault();
        loading = true;

        try {
            const result = await apiPost(API_ENDPOINTS.LOGIN, { username, password }, {
                skipAuthRedirect: true // Don't redirect on auth error during login
            });

            // Save user data and token in authStore
            auth.login(result.data);

            toast.success(`Velkommen, ${result.data.username}!`);

            // Redirect to admin for super admins
            if ($auth.role === "SUPER_ADMIN") {
                return navigate('/admin');
            }

            // Redirect to HyggesnakkeList for all others
            setTimeout (() => {
                navigate('/hyggesnakke');
            }, 3000);

        } catch (err) {
            toast.error(err.message || 'Login fejlede - prøv igen senere');
        } finally {
            loading = false;
        }
    }
</script>

<h1>Log ind for at hyggesnakke</h1>

<form onsubmit={handleSubmit}>
    <div>
        <label for="username">Navn:</label>
        <input type="text" id="username" bind:value={username} required />
    </div>

    <div>
        <label for="password">Adgangskode:</label>
        <input type="password" id="password" bind:value={password} required />
    </div>

    <button class="btn btn-primary btn-lg" type="submit" disabled={loading}>
        {loading ? 'Logger ind...' : 'Log ind for at hyggesnakke'}
    </button>
</form>

<p>
    <Link to="/forgot-password">Har du glemt dit password?</Link>
</p>