<script>
    import PcKeyboardInput from '../input-handlers/pc-keyboard-input.svelte';

    export let notes = [];
    export let isDataLoaded = false;
    export let saveToStorage;
    export let callback = () => {};
    export let title = 'Clear all played notes (shortcut: r)';
    export let disabled = false;

    const reset = () => {
        if (disabled) {
            return;
        }
        if (notes.length === 0 || confirm('Reset played notes?')) {
            saveToStorage();
            notes = [];
            isDataLoaded = false;
            callback();
        }
    };
</script>

<button {title} {disabled} on:click="{reset}"> <span>r</span>eset </button>
<PcKeyboardInput key="r" keyDown="{reset}" {disabled} />

<style>
    span {
        text-decoration: underline;
    }
</style>
