<script>
    export let heading = '';

    let shown = false;
</script>

<main>
    <button on:click="{() => (shown = !shown)}">
        <h3>
            {heading}
        </h3>
    </button>
    <div style="display: {shown ? 'block' : 'none'};">
        <slot></slot>
    </div>
</main>

<style>
    button {
        margin-top: 20px;
    }

    h3 {
        margin: 0;
        padding: 0;
    }
</style>
