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
  import { unreadCounts, totalUnread } from '../stores/unreadStore.js';

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
      unreadCounts.load();

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

      socket.on('unread-message', ({ hyggesnakId }) => {
        unreadCounts.increment(hyggesnakId);
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
    unreadCounts.clear();
    onlineUsers.clear();
    auth.logout();
    if(socket){
      socket.destroy();
      socket = null;
      socketInitialized = false;
    }
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
        <Link to="/hyggesnakke" class="nav-link-with-badge">
          Hyggesnakke
          {#if $totalUnread > 0}
            <span class="nav-badge">{$totalUnread}</span>
          {/if}
        </Link>
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
  @import './Header.css';
</style>
