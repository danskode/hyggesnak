<script>
    import { apiPost } from '../../lib/api/api.js';
    import { API_ENDPOINTS } from '../../lib/utils/constants.js';
    import { toast } from 'svelte-sonner';
    import { Link } from 'svelte-routing';
    import '../Login/Login.css';

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

<div class="content-page auth-page">
    <section>
        <h1>Glemt password</h1>

        {#if emailSent}
            <div class="success-message">
                <p>Et reset link er blevet sendt til din email!</p>
                <p class="auth-link">
                    <Link to="/login">Tilbage til login</Link>
                </p>
            </div>
        {:else}
            <p style="text-align: center; margin-bottom: var(--space-6); color: var(--color-text-secondary);">
                Indtast din email for at modtage et password reset link.
            </p>

            <form onsubmit={handleSubmit}>
                <div class="form-group">
                    <label for="email">Email:</label>
                    <input
                        type="email"
                        id="email"
                        bind:value={email}
                        required
                        placeholder="din@email.dk"
                    />
                </div>

                <button class="btn btn-primary btn-lg" type="submit" disabled={loading}>
                    {loading ? 'Sender...' : 'Send reset link'}
                </button>
            </form>

            <p class="auth-link">
                <Link to="/login">Tilbage til login</Link>
            </p>
        {/if}
    </section>
</div>
