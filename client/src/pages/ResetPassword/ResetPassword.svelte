<script>
    import { apiPost } from '../../lib/api.js';
    import { API_ENDPOINTS } from '../../lib/constants.js';
    import { toast } from 'svelte-sonner';
    import { navigate, Link } from 'svelte-routing';
    import { onMount } from 'svelte';
    import { validatePassword } from '../../lib/validators.js';

    let newPassword = $state('');
    let confirmPassword = $state('');
    let loading = $state(false);
    let token = $state('');

    onMount(() => {
        // Hent token fra URL query parameter
        const params = new URLSearchParams(window.location.search);
        token = params.get('token') || '';

        if (!token) {
            toast.error('Ingen reset token fundet');
            navigate('/login');
        }
    });

    async function handleSubmit(event) {
        event.preventDefault();

        if (newPassword !== confirmPassword) {
            toast.error('Passwords matcher ikke');
            return;
        }

        // Validate password strength on client side
        const passwordValidation = validatePassword(newPassword);
        if (!passwordValidation.valid) {
            toast.error(passwordValidation.message);
            return;
        }

        loading = true;

        try {
            await apiPost(API_ENDPOINTS.RESET_PASSWORD, { token, newPassword }, { skipAuthRedirect: true });
            toast.success('Password nulstillet! Du kan nu logge ind.');
            navigate('/login');

        } catch (err) {
            toast.error(err.message || 'Reset fejlede');
        } finally {
            loading = false;
        }
    }
</script>

<h1>Nulstil password</h1>

<p>Indtast dit nye password nedenfor.</p>

<form onsubmit={handleSubmit}>
    <div>
        <label for="newPassword">Nyt password:</label>
        <input
            type="password"
            id="newPassword"
            bind:value={newPassword}
            required
            minlength="8"
            placeholder="Min 8 tegn, inkl. stort bogstav, lille bogstav og tal"
        />
    </div>

    <div>
        <label for="confirmPassword">Bekræft password:</label>
        <input
            type="password"
            id="confirmPassword"
            bind:value={confirmPassword}
            required
            minlength="8"
            placeholder="Gentag password"
        />
    </div>

    <button type="submit" disabled={loading}>
        {loading ? 'Nulstiller...' : 'Nulstil password'}
    </button>
</form>

<p>
    <Link to="/login">Tilbage til login</Link>
</p>
