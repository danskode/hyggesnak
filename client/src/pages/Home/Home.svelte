<script>
    import { auth } from '../../stores/authStore.svelte.js';
    import { Link } from 'svelte-routing';
</script>

<h1>Her kan du trygt hyggesnakke ❤️</h1>

{#if $auth}
    <p>Velkommen, {$auth.display_name || $auth.username}!</p>
{:else}
    <p>Har du en bruger, så <Link to="/login">log ind!</Link></p>
    <img src="/images/content/hyggesnak.png" alt="Billede af en familie, der rigtig hygger med mobilen" width="600" />
{/if}