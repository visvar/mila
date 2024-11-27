<script>
    export let onclick = () => {};
    export let disabled = false;
</script>

<button on:click="{onclick}" {disabled}>
    <slot></slot>
</button>

<style>
    button {
        margin: 0;
        padding: 0px 4px;
        font-size: inherit;
        color: currentColor;
    }
</style>
