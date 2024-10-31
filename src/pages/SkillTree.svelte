<script>
    import { caretDownIcon, caretUpIcon } from '../lib/icons';
    import { SKILL_TREE } from '../lib/skills';

    export let currentSkills = new Set();

    let skillTree = SKILL_TREE;

    const toggleNode = (node) => {
        const shown = !node.shown;
        if (shown) {
            // hide others when this is shown
            skillTree.flat(Infinity).forEach((d) => (d.shown = false));
        }
        node.shown = shown;
        // trigger re-render
        skillTree = [...skillTree];
    };
</script>

<main>
    <h2>skills</h2>
    {#each skillTree as node}
        <button class="node" on:click="{() => toggleNode(node)}">
            📁
            {node.shown ? caretUpIcon : caretDownIcon}
            {node.title}
        </button>
        {#if node.shown}
            {#each node.children as skill}
                <button
                    class="skill"
                    on:click="{() => (currentSkills = new Set([skill.id]))}"
                >
                    {skill.title}
                </button>
            {/each}
        {/if}
    {/each}
</main>

<style>
    main {
        text-align: left;
    }

    .skill {
        margin: 0 0 0 20px;
        border: none;
        border-left: 1px solid #888;
        border-radius: 0;
    }

    button.skill {
        background: none;
        font-weight: normal;
        text-align: left;
    }

    button.node,
    button.skill {
        display: block;
        width: 180px;
        text-align: left;
    }
</style>
