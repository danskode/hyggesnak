<script>
    import { auth } from '../stores/authStore.svelte.js';
    import { navigate } from 'svelte-routing';
    import { onMount } from 'svelte';
    import { toast } from 'svelte-sonner';

    let { children } = $props();
    let hasChecked = $state(false);

    onMount(() => {
        if (!$auth) {
            toast.error('Du skal være logget ind');
            navigate('/login', { replace: true });
        } else if ($auth.role !== 'SUPER_ADMIN') {
            toast.error('Kun system administratorer har adgang');
            navigate('/', { replace: true });
        } else {
            hasChecked = true;
        }
    });
</script>

{#if $auth && $auth.role === 'SUPER_ADMIN' && hasChecked}
    {@render children()}
{/if}
