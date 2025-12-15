<script>
  import { navigate } from 'svelte-routing';
  import { hyggesnakke, currentHyggesnak } from '../../stores/hyggesnakStore.svelte.js';
  import { toast } from 'svelte-sonner';
  import { apiPost } from '../../lib/api.js';
  import { API_ENDPOINTS } from '../../lib/constants.js';
  import { validateHyggesnakName, validateHyggesnakDisplayName } from '../../lib/validators.js';

  let name = $state('');
  let display_name = $state('');
  let creating = $state(false);

  async function handleSubmit(event) {
    event.preventDefault();

    // Validate inputs using centralized validators
    const nameValidation = validateHyggesnakName(name);
    if (!nameValidation.valid) {
      toast.error(nameValidation.message);
      return;
    }

    const displayNameValidation = validateHyggesnakDisplayName(display_name);
    if (!displayNameValidation.valid) {
      toast.error(displayNameValidation.message);
      return;
    }

    creating = true;

    try {
      const result = await apiPost(API_ENDPOINTS.HYGGESNAKKE, {
        name: name.toLowerCase().trim(),
        display_name: display_name.trim()
      });

      const newHyggesnak = result.data;

      toast.success(`Hyggesnak "${newHyggesnak.display_name}" oprettet!`);

      // Add to list and select
      hyggesnakke.add(newHyggesnak);
      currentHyggesnak.select(newHyggesnak);

      // Navigate to chat page
      navigate(`/h/${newHyggesnak.id}/chat`);

    } catch (err) {
      toast.error(err.message || 'Kunne ikke oprette hyggesnak');
    } finally {
      creating = false;
    }
  }

  function handleCancel() {
    navigate('/hyggesnakke');
  }
</script>

<div class="create-hyggesnak-container">
  <h1>Opret ny hyggesnak</h1>

  <form onsubmit={handleSubmit} class="create-form">
    <div class="form-group">
      <label for="name">
        Unikt navn (URL-venligt)
        <span class="hint">Bruges i web-adresser - kun små bogstaver, tal, _ og -</span>
      </label>
      <input
        type="text"
        id="name"
        bind:value={name}
        required
        minlength="3"
        maxlength="30"
        pattern="[a-z0-9_-]+"
        placeholder="fx: familien-hansen"
      />
    </div>

    <div class="form-group">
      <label for="display_name">
        Visningsnavn (offentligt)
        <span class="hint">Navnet som vises - må indeholde danske tegn, mellemrum og emojis</span>
      </label>
      <input
        type="text"
        id="display_name"
        bind:value={display_name}
        required
        minlength="1"
        maxlength="100"
        placeholder="fx: Familien Hansen 👨‍👩‍👧‍👦"
      />
    </div>

    <div class="form-actions">
      <button type="submit" class="primary" disabled={creating}>
        {creating ? 'Opretter...' : 'Opret hyggesnak'}
      </button>
      <button type="button" onclick={handleCancel} disabled={creating}>
        Annuller
      </button>
    </div>
  </form>

  <div class="info-box">
    <h3>Om hyggesnakke</h3>
    <ul>
      <li>Du bliver automatisk ejer af den nye hyggesnak</li>
      <li>Som ejer kan du tilføje andre medlemmer</li>
      <li>Det unikke navn kan ikke ændres senere</li>
      <li>Visningsnavnet kan ændres når som helst</li>
    </ul>
  </div>
</div>

<style>
  .create-hyggesnak-container {
    max-width: 600px;
    margin: 0 auto;
    padding: 2rem 1rem;
  }

  h1 {
    margin-bottom: 2rem;
  }

  .create-form {
    background: var(--color-bg, white);
    border: 1px solid var(--color-border, #ddd);
    border-radius: 12px;
    padding: 2rem;
    margin-bottom: 2rem;
  }

  .form-group {
    margin-bottom: 1.5rem;
  }

  label {
    display: block;
    font-weight: 500;
    margin-bottom: 0.5rem;
  }

  .hint {
    display: block;
    font-size: 0.875rem;
    font-weight: 400;
    color: var(--color-text-secondary, #666);
    margin-top: 0.25rem;
  }

  input {
    width: 100%;
    padding: 0.75rem;
    border: 1px solid var(--color-border, #ddd);
    border-radius: 8px;
    font-size: 1rem;
    transition: border-color 0.2s;
  }

  input:focus {
    outline: none;
    border-color: var(--color-primary, #0066cc);
  }

  .form-actions {
    display: flex;
    gap: 1rem;
    margin-top: 2rem;
  }

  .form-actions button {
    flex: 1;
  }

  .info-box {
    background: var(--color-bg-secondary, #f9f9f9);
    border: 1px solid var(--color-border, #ddd);
    border-radius: 12px;
    padding: 1.5rem;
  }

  .info-box h3 {
    margin: 0 0 1rem 0;
    font-size: 1rem;
  }

  .info-box ul {
    margin: 0;
    padding-left: 1.5rem;
  }

  .info-box li {
    margin: 0.5rem 0;
    color: var(--color-text-secondary, #666);
  }

  @media (prefers-color-scheme: dark) {
    .create-form {
      background: var(--color-bg, #1e1e1e);
      border-color: var(--color-border, #444);
    }

    input {
      background: var(--color-bg, #2a2a2a);
      border-color: var(--color-border, #444);
      color: var(--color-text, #fff);
    }

    .info-box {
      background: var(--color-bg-secondary, #2a2a2a);
      border-color: var(--color-border, #444);
    }
  }
</style>