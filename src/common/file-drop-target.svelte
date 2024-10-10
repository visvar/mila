<script>
    import { parseJsonFile } from '../lib/json';

    export let loadData = (json) => {};

    let container;

    const dropped = async (evt) => {
        evt.preventDefault();
        const file = evt.dataTransfer.files[0];
        const json = await parseJsonFile(file);
        loadData(json);
        container.style = 'background: none';
    };
    const dragOver = (evt) => {
        evt.preventDefault();
        container.style = 'background: var(--accent)';
    };

    const mouseLeave = () => {
        container.style = 'background: none';
    };
</script>

<main
    bind:this="{container}"
    on:drop="{dropped}"
    on:dragover="{dragOver}"
    on:mouseleave="{mouseLeave}"
    on:dragend="{mouseLeave}"
    on:dragleave="{mouseLeave}"
>
    <slot></slot>
</main>

<style>
    main {
        width: fit-content;
        margin: auto;
        transition: all 250ms;
        border-radius: 4px;
        padding: 5px 0 10px;
    }
</style>
