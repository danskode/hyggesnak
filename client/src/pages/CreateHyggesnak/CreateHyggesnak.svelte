<script>
  import { navigate } from 'svelte-routing';
  import { hyggesnakke, currentHyggesnak } from '../../lib/stores/hyggesnakStore.js';
  import { toast } from 'svelte-sonner';
  import { apiPost } from '../../lib/api/api.js';
  import { API_ENDPOINTS } from '../../lib/utils/constants.js';
  import { validateHyggesnakName, validateHyggesnakDisplayName } from '../../lib/utils/validators.js';
  import './CreateHyggesnak.css';

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

<div class="content-page create-page">
  <h1>Opret ny hyggesnak</h1>

  <section>
    <form onsubmit={handleSubmit}>
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
        <button type="submit" class="btn btn-primary" disabled={creating}>
          {creating ? 'Opretter...' : 'Opret hyggesnak'}
        </button>
        <button type="button" class="btn btn-secondary" onclick={handleCancel} disabled={creating}>
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
  </section>
</div>