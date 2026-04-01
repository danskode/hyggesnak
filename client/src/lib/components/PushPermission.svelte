<script>
  import { onMount } from 'svelte';
  import { isPushSupported, isPushSubscribed, subscribeToPush } from '../stores/pushStore.js';
  import { auth } from '../stores/authStore.js';
  import { get } from 'svelte/store';

  let visible = $state(false);
  let blocked = $state(false);

  function dismissedKey() {
    const userId = get(auth)?.id;
    return `push_prompt_dismissed_${userId}`;
  }

  onMount(async () => {
    if (!isPushSupported()) return;
    if (localStorage.getItem(dismissedKey())) return;

    if (Notification.permission === 'denied') {
      blocked = true;
      return;
    }

    const already = await isPushSubscribed();
    if (!already) visible = true;
  });

  async function enable() {
    visible = false;
    const result = await subscribeToPush();
    if (result.reason === 'denied') {
      blocked = true;
    }
  }

  function dismiss() {
    localStorage.setItem(dismissedKey(), '1');
    visible = false;
    blocked = false;
  }
</script>

{#if visible}
  <div class="push-prompt card">
    <p>Vil du modtage notifikationer for nye beskeder og invitationer?</p>
    <div class="push-prompt-actions">
      <button class="btn btn-primary btn-sm" onclick={enable}>Ja tak</button>
      <button class="btn btn-ghost btn-sm" onclick={dismiss}>Nej tak</button>
    </div>
  </div>
{:else if blocked}
  <div class="push-prompt card">
    <p>Notifikationer er blokeret i din browser. Tillad dem i browserindstillingerne for at modtage beskeder.</p>
    <div class="push-prompt-actions">
      <button class="btn btn-ghost btn-sm" onclick={dismiss}>Luk</button>
    </div>
  </div>
{/if}

<style>
  .push-prompt {
    position: fixed;
    bottom: var(--space-6);
    left: 50%;
    transform: translateX(-50%);
    max-width: 340px;
    width: calc(100% - var(--space-8));
    z-index: 100;
    text-align: center;
    padding: var(--space-5);
  }

  .push-prompt p {
    margin: 0 0 var(--space-4);
    color: var(--color-text);
    font-size: var(--font-size-sm);
    line-height: 1.5;
  }

  .push-prompt-actions {
    display: flex;
    gap: var(--space-2);
    justify-content: center;
  }
</style>
