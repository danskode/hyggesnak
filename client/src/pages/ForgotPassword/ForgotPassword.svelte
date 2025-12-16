<script>
    import { apiPost } from '../../lib/api/api.js';
    import { API_ENDPOINTS } from '../../lib/utils/constants.js';
    import { toast } from 'svelte-sonner';
    import { Link } from 'svelte-routing';

    let email = $state('');
    let loading = $state(false);
    let emailSent = $state(false);

    async function handleSubmit(event) {
        event.preventDefault();
        loading = true;

        try {
            await apiPost(API_ENDPOINTS.FORGOT_PASSWORD, { email }, { skipAuthRedirect: true });
            emailSent = true;
            toast.success('Reset link sendt! Tjek din email.');

        } catch (err) {
            toast.error(err.message || 'Der skete en fejl');
        } finally {
            loading = false;
        }
    }
</script>

<h1>Glemt password</h1>

{#if emailSent}
    <div class="success-message">
        <p>Et reset link er blevet sendt til din email!</p>
        <Link to="/login">Tilbage til login</Link>
    </div>
{:else}
    <p>Indtast din email for at modtage et password reset link.</p>

    <form onsubmit={handleSubmit}>
        <div>
            <label for="email">Email:</label>
            <input
                type="email"
                id="email"
                bind:value={email}
                required
                placeholder="din@email.dk"
            />
        </div>

        <button type="submit" disabled={loading}>
            {loading ? 'Sender...' : 'Send reset link'}
        </button>
    </form>

    <p>
        <Link to="/login">Tilbage til login</Link>
    </p>
{/if}
