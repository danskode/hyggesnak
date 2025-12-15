<script>
    import { auth } from '../stores/authStore.svelte.js';
    import { navigate } from 'svelte-routing';
    import { onMount } from 'svelte';
    import { toast } from 'svelte-sonner';

    let { children } = $props();
    let hasChecked = $state(false);

    onMount(() => {
        checkAuth();

        // Watch for auth changes
        const unsubscribe = auth.subscribe(value => {
            if (hasChecked && !value) {
                navigate('/', { replace: true });
            }
        });

        return unsubscribe;
    });

    function checkAuth() {
        const unsubscribe = auth.subscribe(value => {
            if (!value) {
                toast.error('Du skal være logget ind for at se denne side');
                navigate('/login', { replace: true });
            }
            hasChecked = true;
        });
        unsubscribe();
    }
</script>

{#if $auth}
    {@render children()}
{/if}
