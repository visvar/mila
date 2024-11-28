<script>
    import * as d3 from 'd3';
    import NumberInput from '../input-elements/number-input.svelte';

    export let notes;
    export let tempo = 120;
    export let adjustTime = 0;
    export let grid = '4:4';
    export let bars = 1;
    export let pastBars = 8;
    export let callback = () => {};
    export let disabled = false;

    let seed = 0.4895640932857489;
    let deviation = 0;
    let bias = 0;

    const simulate = () => {
        if (disabled) {
            return;
        }
        // see https://d3js.org/d3-random
        const rand = d3.randomNormal.source(d3.randomLcg(seed))(
            bias,
            deviation,
        );
        adjustTime = 0;
        let [grid1, grid2] = grid.split(':').map((d) => +d);
        const beats = grid1 * bars;
        const fineGrid = [...d3.range(0, beats, 1 / grid2)];
        notes = d3.range(pastBars).flatMap((rep) =>
            fineGrid.map((d) => {
                const time = d + rep * beats + rand();
                return {
                    time: (time / tempo) * 60,
                    velocity: 0.5,
                };
            }),
        );
        callback();
    };
</script>

<main>
    <button on:click="{simulate}"> simulate </button>
    <NumberInput
        label="deviation"
        bind:value="{deviation}"
        step="{0.001}"
        min="{0}"
        max="{1}"
        defaultValue="{0}"
        callback="{simulate}"
    />
    <NumberInput
        label="bias"
        bind:value="{bias}"
        step="{0.01}"
        min="{-1}"
        max="{1}"
        defaultValue="{0}"
        callback="{simulate}"
    />
    <button
        on:click="{() => {
            seed = Math.random();
            simulate();
        }}"
    >
        change seed
    </button>
</main>

<style>
    main {
        margin: 20px auto;
        width: 700px;
        padding: 15px 20px;
        border: 3px solid #f4f4f4;
        border-radius: 8px;
        transition: all 500ms;
    }
</style>
