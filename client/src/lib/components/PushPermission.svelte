<script>
  import { onMount } from 'svelte';
  import { isPushSupported, isPushSubscribed, subscribeToPush } from '../stores/pushStore.js';

  const DISMISSED_KEY = 'push_prompt_dismissed';

  let visible = $state(false);

  onMount(async () => {
    if (!isPushSupported()) return;
    if (localStorage.getItem(DISMISSED_KEY)) return;

    const already = await isPushSubscribed();
    if (!already) visible = true;
  });

  async function enable() {
    visible = false;
    await subscribeToPush();
  }

  function dismiss() {
    localStorage.setItem(DISMISSED_KEY, '1');
    visible = false;
  }
</script>

{#if visible}
  <div class="push-prompt">
    <p>Vil du modtage notifikationer for nye beskeder og invitationer?</p>
    <div class="push-prompt-actions">
      <button class="btn-primary" onclick={enable}>Ja tak</button>
      <button class="btn-ghost" onclick={dismiss}>Nej tak</button>
    </div>
  </div>
{/if}

<style>
  .push-prompt {
    position: fixed;
    bottom: var(--space-6);
    left: 50%;
    transform: translateX(-50%);
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-lg);
    padding: var(--space-4) var(--space-5);
    max-width: 360px;
    width: calc(100% - var(--space-8));
    z-index: 100;
    text-align: center;
  }

  .push-prompt p {
    margin: 0 0 var(--space-3);
    font-size: var(--font-size-sm);
    color: var(--color-text);
  }

  .push-prompt-actions {
    display: flex;
    gap: var(--space-2);
    justify-content: center;
  }
</style>
