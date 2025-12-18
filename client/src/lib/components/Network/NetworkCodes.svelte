<script>
    const CODE_LENGTH = 6;

    let {
        myCode = null,
        loadingCode = false,
        generatingCode = false,
        onGenerate = () => {},
        onRevoke = () => {},
        onConnect = () => {}
    } = $props();

    let connectCode = $state('');
    let connectingWithCode = $state(false);

    function isValidCode(code) {
        return code.trim().length === CODE_LENGTH;
    }

    async function handleConnect() {
        connectingWithCode = true;
        try {
            await onConnect(connectCode.trim());
            connectCode = '';
        } finally {
            connectingWithCode = false;
        }
    }
</script>

<section class="codes-section">
    <h2>Udvid dit netværk</h2>

    <div class="code-subsection">
        <h3>Din hemmelige kode</h3>
        <p class="description">Del denne kode med personer du vil tilføje til dit netværk</p>

        {#if loadingCode}
            <div class="empty-state">Henter kode...</div>
        {:else if myCode}
            <div class="code-display">
                <div class="code-value">{myCode.code}</div>
                <div class="code-info">
                    <p>Udløber: {new Date(myCode.expiresAt).toLocaleString('da-DK')}</p>
                </div>
                <button class="btn btn-danger btn-sm" onclick={onRevoke}>
                    Slet kode
                </button>
            </div>
        {:else}
            <div class="no-code">
                <p>Du har ingen aktiv kode</p>
                <button class="btn btn-primary" onclick={onGenerate} disabled={generatingCode}>
                    {generatingCode ? 'Genererer...' : 'Generer kode'}
                </button>
            </div>
        {/if}
    </div>

    <div class="divider"></div>

    <div class="code-subsection">
        <h3>Forbind med en andens hemmelige kode</h3>
        <p class="description">Har en anden bruger givet dig sin hemmelige kode? Indtast den for at sende en netværksanmodning</p>

        <div class="connect-form">
            <input
                type="text"
                bind:value={connectCode}
                placeholder="_ _ _ _ _ _"
                maxlength={CODE_LENGTH}
                pattern="[0-9]{6}"
                class="code-input"
            />
            <button
                class="btn btn-primary"
                onclick={handleConnect}
                disabled={connectingWithCode || !isValidCode(connectCode)}>
                {connectingWithCode ? 'Forbinder...' : 'Send anmodning'}
            </button>
        </div>
    </div>
</section>
