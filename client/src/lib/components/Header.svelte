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
  import { chatContext } from '../stores/chatContextStore.js';
  import { pageActions } from '../stores/pageContextStore.js';
  import MemberSidebar from './MemberSidebar.svelte';

  let isDarkMode = $state(false);
  let socket = null;
  let socketInitialized = $state(false);
  let navOpen = $state(false);
  let touchStartX = 0;
  let navDragOffset = $state(0);
  let isDraggingNav = $state(false);

  function handleEdgeTouchStart(e) {
    touchStartX = e.touches[0].clientX;
  }

  function handleEdgeTouchEnd(e) {
    const deltaX = e.changedTouches[0].clientX - touchStartX;
    if (deltaX < -40) {
      navOpen = true;
    }
  }

  function handleNavTouchStart(e) {
    touchStartX = e.touches[0].clientX;
    isDraggingNav = true;
    navDragOffset = 0;
  }

  function handleNavTouchMove(e) {
    if (!isDraggingNav || !navOpen) return;
    const delta = e.touches[0].clientX - touchStartX;
    if (delta > 0) {
      navDragOffset = delta;
    }
  }

  function handleNavTouchEnd(e) {
    isDraggingNav = false;
    const deltaX = e.changedTouches[0].clientX - touchStartX;
    navDragOffset = 0;
    if (deltaX > 50) {
      navOpen = false;
    }
  }

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
    navOpen = false;
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

  <button class="nav-toggle" onclick={() => navOpen = !navOpen} aria-label="Menu">
    ☰
  </button>

  {#if navOpen}
    <div class="nav-overlay" onclick={() => navOpen = false}></div>
  {/if}

  <div
    class="swipe-edge-zone"
    ontouchstart={handleEdgeTouchStart}
    ontouchend={handleEdgeTouchEnd}
  ></div>

  <nav
    class:open={navOpen}
    style={isDraggingNav && navDragOffset > 0 ? `transform: translateX(${navDragOffset}px); transition: none;` : ''}
    ontouchstart={handleNavTouchStart}
    ontouchmove={handleNavTouchMove}
    ontouchend={handleNavTouchEnd}
  >
    <button class="nav-close" onclick={() => navOpen = false}>✕</button>
    {#if $auth}
      {#if $auth.role === 'SUPER_ADMIN'}
        <Link to="/admin" onclick={() => navOpen = false}>🔧 Admin</Link>
      {:else}
        <Link to="/hyggesnakke" class="nav-link-with-badge" onclick={() => navOpen = false}>
          Hyggesnakke
          {#if $totalUnread > 0}
            <span class="nav-badge">{$totalUnread}</span>
          {/if}
        </Link>
        <Link to="/network" class="nav-link-with-badge" onclick={() => navOpen = false}>
          Netværk
          {#if $totalPendingInvitations > 0}
            <span class="nav-badge">{$totalPendingInvitations}</span>
          {/if}
        </Link>
      {/if}
      <button class="btn btn-ghost" onclick={handleLogout}>Log ud</button>
    {:else}
      <Link to="/" onclick={() => navOpen = false}>Home</Link>
      <Link to="/login" onclick={() => navOpen = false}>Login</Link>
    {/if}

    <div class="nav-drawer-context">
      {#if $pageActions.length > 0}
        <div class="nav-members-divider"></div>
        {#each $pageActions as action}
          <button
            class="btn btn-primary"
            onclick={() => { navOpen = false; navigate(action.path); }}
          >
            {action.label}
          </button>
        {/each}
      {/if}

      {#if $chatContext}
        <div class="nav-members-divider"></div>
        <MemberSidebar
          members={$chatContext.members}
          currentUserId={$auth?.id}
          currentUserRole={$chatContext.userRole}
          hyggesnakId={$chatContext.hyggesnakId}
          onRemoveMember={$chatContext.onRemoveMember}
          onInviteSent={$chatContext.onInviteSent}
          onDeleteHyggesnak={$chatContext.onDeleteHyggesnak}
          inHeader={true}
        />
      {/if}
    </div>
  </nav>
</header>

<style>
  @import './Header.css';
</style>
