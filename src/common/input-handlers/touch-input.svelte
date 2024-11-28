<script>
    /**
     * This component handles touch input and takes care of setting up and destroying event listeners
     */
    import { onDestroy } from 'svelte';

    // The HTML element to attach the touch listeners to
    export let element;
    export let touchStart = () => {};
    export let touchEnd = () => {};
    export let disabled = false;

    const touchStartFn = (e) => {
        if (!disabled) {
            touchStart();
        }
    };

    const touchEndFn = (e) => {
        if (!disabled) {
            touchEnd();
        }
    };

    const attach = () => {
        element.addEventListener('touchstart', touchStartFn);
        element.addEventListener('touchend', touchEndFn);
    };

    const remove = () => {
        element.removeEventListener('touchstart', touchStartFn);
        element.removeEventListener('touchend', touchEndFn);
    };

    // if element changes attach to new
    $: {
        if (element) {
            attach();
        }
    }

    onDestroy(remove);
</script>
