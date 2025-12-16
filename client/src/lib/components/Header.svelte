<script>
  import { onDestroy } from 'svelte';
  import { Link, navigate } from 'svelte-routing';
  import { auth } from '../stores/authStore.js';
  import { toast } from 'svelte-sonner';
  import { useSocket } from '../composables/useSocket.js';
  import {
    fetchAllInvitations,
    totalPendingInvitations,
    addNetworkInvitationIncoming,
    removeNetworkInvitationOutgoing,
    addHyggesnakInvitation,
    removeHyggesnakInvitation,
    clearAllInvitations
  } from '../stores/invitationsStore.js';
  import { onlineUsers } from '../stores/onlineUsersStore.js';

  let isDarkMode = $state(false);
  let socket = null;
  let socketInitialized = $state(false);

  $effect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    isDarkMode = mediaQuery.matches;

    const handleChange = (e) => {
      isDarkMode = e.matches;
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  });

  $effect(() => {
    if ($auth && $auth.role !== 'SUPER_ADMIN' && !socketInitialized) {
      socketInitialized = true;

      fetchAllInvitations();

      socket = useSocket({});
      socket.connect();

      socket.on('network:invitation:received', (invitation) => {
        addNetworkInvitationIncoming(invitation);
        toast.info('Du har modtaget en ny netværksanmodning');
      });

      socket.on('network:invitation:accepted', ({ invitationId }) => {
        removeNetworkInvitationOutgoing(invitationId);
      });

      socket.on('network:invitation:rejected', ({ invitationId }) => {
        removeNetworkInvitationOutgoing(invitationId);
      });

      socket.on('network:connection:new', () => {
        fetchAllInvitations();
      });

      socket.on('hyggesnak:invitation:received', (invitation) => {
        addHyggesnakInvitation(invitation);
        toast.info('Du har modtaget en invitation til en hyggesnak');
      });

      socket.on('hyggesnak:invitation:accepted', ({ invitationId }) => {
        removeHyggesnakInvitation(invitationId);
      });

      socket.on('hyggesnak:invitation:rejected', ({ invitationId }) => {
        removeHyggesnakInvitation(invitationId);
      });

      socket.on('users:online', (userIds) => {
        onlineUsers.set(userIds);
      });

      socket.on('user:online', ({ userId }) => {
        onlineUsers.add(userId);
      });

      socket.on('user:offline', ({ userId }) => {
        onlineUsers.remove(userId);
      });
    }
  });

  onDestroy(() => {
    if (socket) {
      socket.destroy();
      socket = null;
      socketInitialized = false;
    }
  });

  function handleLogout() {
    clearAllInvitations();
    onlineUsers.clear();
    auth.logout();
    toast.success('Du er nu logget ud');
    navigate('/');
  }

  const logoSrc = $derived(isDarkMode ? '/images/favicons/favicon-darkmode.png' : '/images/favicons/favicon-lightmode.png');
</script>

<header>
  <div class="site-header">
    <img
      src={logoSrc}
      alt="Hyggesnakke Logo"
      class="site-logo"
    />
    <h1 class="site-title">Hyggesnakke</h1>
  </div>

  <nav>
    {#if $auth}
      {#if $auth.role === 'SUPER_ADMIN'}
        <Link to="/admin">🔧 Admin</Link>
      {:else}
        <Link to="/hyggesnakke">Hyggesnakke</Link>
        <Link to="/network" class="nav-link-with-badge">
          Netværk
          {#if $totalPendingInvitations > 0}
            <span class="nav-badge">{$totalPendingInvitations}</span>
          {/if}
        </Link>
      {/if}
      <button class="btn btn-ghost" onclick={handleLogout}>Log ud</button>
    {:else}
      <Link to="/">Home</Link>
      <Link to="/login">Login</Link>
    {/if}
  </nav>
</header>

<style>
  header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem 2rem;
  }

  .site-header {
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  .site-logo {
    height: 48px;
    width: 48px;
    object-fit: contain;
  }

  .site-title {
    margin: 0;
    font-size: 1.75rem;
    font-weight: 700;
    letter-spacing: -0.025em;
  }

  nav {
    display: flex;
    gap: 1.5rem;
    align-items: center;
  }

  :global(nav a) {
    color: --text-primary;
    text-decoration: none;
    font-weight: 500;
    transition: all 0.2s;
    padding: 0.5rem 1rem;
    border-radius: 0.375rem;
  }

  :global(nav a:hover) {
    background: rgba(255, 255, 255, 0.1);
  }

  :global(nav a[aria-current='page']) {
    background: rgba(255, 255, 255, 0.2);
    font-weight: 600;
  }

  :global(.nav-link-with-badge) {
    position: relative;
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
  }

  .nav-badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 1.25rem;
    height: 1.25rem;
    padding: 0 0.35rem;
    background: #ef4444;
    color: --text-on-danger;
    border-radius: 10px;
    font-size: 0.7rem;
    font-weight: 700;
    line-height: 1;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
  }

  /* Global .btn-ghost styles apply */

  @media (max-width: 768px) {
    header {
      flex-direction: column;
      gap: 1rem;
      padding: 1rem;
    }

    nav {
      flex-wrap: wrap;
      justify-content: center;
      gap: 0.75rem;
    }

    .site-title {
      font-size: 1.5rem;
    }

    .site-logo {
      height: 40px;
      width: 40px;
    }
  }
</style>
