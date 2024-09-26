<script>
    /**
     * This component handles keyboard input and takes care of setting up and destroying event listeners
     */
    import { onDestroy, onMount } from 'svelte';

    export let key = ' ';
    export let keyDown = () => {};
    export let keyUp = () => {};
    export let ctrlKey = false;

    const keyDownFn = (e) => {
        // console.log(e);
        if (e.key === key && (!ctrlKey || e.ctrlKey)) {
            e.preventDefault();
            keyDown();
        }
    };

    const keyUpFn = (e) => {
        if (e.key === key) {
            e.preventDefault();
            keyUp();
        }
    };

    onMount(() => {
        document.addEventListener('keydown', keyDownFn);
        document.addEventListener('keyup', keyUpFn);
    });

    onDestroy(() => {
        document.removeEventListener('keydown', keyDownFn);
        document.removeEventListener('keyup', keyUpFn);
    });
</script>
