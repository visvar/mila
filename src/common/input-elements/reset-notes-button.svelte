<script>
    import PcKeyboardInput from '../input-handlers/pc-keyboard-input.svelte';

    export let notes = [];
    export let saveToStorage;
    export let callback = () => {};
    export let title = 'Clear all played notes (shortcut: r)';
    export let disabled = false;

    const reset = () => {
        if (notes.length === 0 || confirm('Reset played notes?')) {
            saveToStorage();
            notes = [];
            callback();
        }
    };
</script>

<button {title} {disabled} on:click="{reset}"> reset </button>
<PcKeyboardInput key="r" keyDown="{reset}" />
