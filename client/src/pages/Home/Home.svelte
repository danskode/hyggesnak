<script>
    import { auth } from '../../lib/stores/authStore.js';
    import { Link } from 'svelte-routing';
    import './Home.css';
</script>

<div class="content-page home-page">
    <section class="hero-section">
        <h1>Her kan du trygt hyggesnakke ❤️</h1>

        {#if $auth}
            <div class="welcome-message">
                <p>Velkommen tilbage, {$auth.display_name || $auth.username}!</p>
                <div class="action-buttons">
                    <Link to="/hyggesnakke">
                        <button class="btn btn-primary btn-lg">Gå til dine hyggesnakke</button>
                    </Link>
                    <Link to="/network">
                        <button class="btn btn-secondary btn-lg">Administrer netværk</button>
                    </Link>
                </div>
            </div>
        {:else}
            <div class="login-prompt">
                <p>Har du en bruger, så <Link to="/login">log ind!</Link></p>
                <div class="hero-image">
                    <img src="/images/content/hyggesnak.png" alt="Billede af en familie, der rigtig hygger med mobilen" />
                </div>
            </div>
        {/if}
    </section>
</div>