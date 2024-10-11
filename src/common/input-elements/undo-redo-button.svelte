<script>
    import PcKeyboardInput from '../input-handlers/pc-keyboard-input.svelte';

    export let data = [];
    export let callback = () => {};

    let undone = [];

    const undo = () => {
        if (!data || data.length === 0) {
            return;
        }
        undone.push(data.at(-1));
        data = [...data.slice(0, -1)];
        callback();
    };

    const redo = () => {
        if (!data || undone.length === 0) {
            return;
        }
        data = [...data, undone.at(-1)];
        undone = undone.slice(0, -1);
        callback();
    };
</script>

<button
    title="undo the last note (shortcut: CTRL+Z)"
    disabled="{!data || data.length === 0}"
    on:click="{undo}"
    class="left"
>
    ↺
</button>
<button
    title="redo the last undone note (shortcut: CTRL+Y)"
    disabled="{!data || undone.length === 0}"
    on:click="{redo}"
    class="right"
>
    ↻
</button>

<PcKeyboardInput key="z" ctrlKey="{true}" keyDown="{undo}" />
<PcKeyboardInput key="y" ctrlKey="{true}" keyDown="{redo}" />

<style>
    button.left {
        border-radius: 8px 0 0 8px;
    }

    button.right {
        border-radius: 0 8px 8px 0;
        margin-left: -8px;
    }
</style>
