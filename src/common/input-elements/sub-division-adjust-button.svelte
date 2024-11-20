<script>
    import * as d3 from 'd3';
    import { Utils } from 'musicvis-lib';

    export let adjustTime;
    export let notes;
    export let grid;
    export let tempo;
    export let draw = () => {};

    const min = -2;
    const max = 2;
    const step = 0.01;

    const autoAdjust = () => {
        if (!notes || notes.length === 0) {
            adjustTime = 0;
            return;
        }
        // get times of grid
        const [grid1, grid2] = grid.split(':').map((d) => +d);
        const circleSeconds = Utils.bpmToSecondsPerBeat(tempo) * grid1;
        const step = circleSeconds / (grid1 * grid2);
        const gridTimes = d3.range(0, circleSeconds + step, step);
        // calculate directed error
        const errors = notes.map((note) => {
            const time = note % circleSeconds;
            let minError = Infinity;
            for (const gridTime of gridTimes) {
                const error = gridTime - time;
                if (Math.abs(error) < Math.abs(minError)) {
                    minError = error;
                }
            }
            return minError;
        });
        const meanError = d3.mean(errors);
        const adjustValue = Math.round(meanError * 100) / 100;
        // animate
        const animate = () => {
            adjustTime = adjustTime + (adjustValue - adjustTime) / 20;
            if (Math.abs(adjustTime - adjustValue) > 0.001) {
                setTimeout(animate, 1000 / 60);
            } else {
                adjustTime = adjustValue;
            }
            draw();
        };
        setTimeout(animate, 1000 / 60);
    };
</script>

<label title="Shift all notes by an amount in seconds">
    adjust
    <input
        type="number"
        bind:value="{adjustTime}"
        on:change="{draw}"
        on:wheel="{(evt) => {
            evt.preventDefault();
            const add = evt.deltaY < 0 ? step : -step;
            const clamped = Math.min(max, Math.max(min, adjustTime + add));
            // round to step
            adjustTime = +clamped.toFixed(12);
            draw();
        }}"
        {step}
        {min}
        {max}
        style="width: 55px"
    />
</label>
<button on:click="{autoAdjust}">auto</button>

<style>
    input {
        border-radius: 8px 0 0 8px;
    }
    button {
        margin-left: -8px;
        border-radius: 0 8px 8px 0;
    }
</style>
