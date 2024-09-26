<script>
    import { onMount } from 'svelte';

    export let shown = false;

    let container;

    const setStyle = () => {
        container.style = shown ? 'display: inline-block' : 'display: none';
    };

    const toggle = () => {
        shown = !shown;
        setStyle();
    };

    onMount(setStyle);
</script>

<div class="exercise-grid">
    <button on:click="{toggle}">{shown ? 'Hide' : 'Show'} exercise</button>
    <div bind:this="{container}" class="exercise-content">
        <slot></slot>
    </div>
</div>

<style>
    button {
        width: 140px;
    }

    div.exercise-grid {
        margin: 5px auto;
        max-width: 850px;
        display: grid;
        grid-template-columns: max-content auto;
        gap: 5px;
    }

    div.exercise-content {
        display: inline-block;
        padding: 0 10px;
        border: 2px solid #eee;
        border-radius: 6px;
        transition: all 500ms;
        text-align: left;
    }
</style>
