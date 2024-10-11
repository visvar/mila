<script>
    /**
     * This component handles page resize events and calls a function
     */
    import { onDestroy, onMount } from 'svelte';

    export let callback = () => {};
    export let element = document.body;

    const resizeObserver = new ResizeObserver(callback);

    onMount(() => {
        // console.log('mount');
        document.addEventListener('resize', callback);
        resizeObserver.observe(element);
    });

    onDestroy(() => {
        document.removeEventListener('resize', callback);
        resizeObserver.unobserve(element);
    });
</script>
