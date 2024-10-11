<script>
    export let onclick = () => {};
</script>

<button on:click="{onclick}">
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
