<script>
    import { onDestroy } from 'svelte';
    import NumberInput from './number-input.svelte';
    import * as d3 from 'd3';
    import { playIcon, stopIcon } from '../../lib/icons';

    export let notes = [];
    export let speed = 1;
    export let callback = () => {};

    let timeouts = [];
    let oldNotes;
    let isPlaying = false;
    // progress indicator circle
    let circle;
    const iconSize = 24;
    const circleRadius = (iconSize - 4) / 2;
    let circleRaf;
    let startTime = 0;

    /**
     * plays notes
     */
    const replay = () => {
        isPlaying = true;
        const timeFactor = 1000 / speed;
        oldNotes = [...notes];
        notes = [];
        timeouts = [];
        let [minTime, maxTime] = d3.extent(oldNotes, (d) => d.time ?? d);
        maxTime = maxTime - minTime;
        // timeouts for notes
        for (const note of oldNotes) {
            const time = (note.time ?? note) - minTime;
            timeouts.push(
                setTimeout(() => {
                    notes = [...notes, note];
                    // stop when finished
                    if (notes.length === oldNotes.length) {
                        stop();
                    } else {
                        callback();
                    }
                }, time * timeFactor),
            );
        }
        // interval for progress
        const update = () => {
            const seconds = ((performance.now() - startTime) / 1000) * speed;
            showProgress(seconds / maxTime);
            circleRaf = requestAnimationFrame(update);
        };
        startTime = performance.now();
        circleRaf = requestAnimationFrame(update);
    };

    const reset = () => {
        isPlaying = false;
        // reset notes
        notes = oldNotes;
        // clear all timeouts
        for (const to of timeouts) {
            clearTimeout(to);
        }
        cancelAnimationFrame(circleRaf);
        timeouts = [];
    };

    /**
     * stops replay and shows full data
     */
    const stop = () => {
        reset();
        callback();
    };

    const handleClick = () => {
        !isPlaying ? replay() : stop();
    };

    onDestroy(reset);

    /**
     * updates the circle that indicates replay progress
     * @param {number} progress between 0 and 1
     */
    const showProgress = (progress) => {
        // see https://codepen.io/mjurczyk/pen/wvBKOvP
        const circumference = 2 * Math.PI * circleRadius;
        const strokeDasharray = progress * circumference;
        // First has the length of visible portion. Second, the remaining part.
        circle.setAttribute('stroke-dasharray', [
            strokeDasharray,
            circumference - strokeDasharray,
        ]);
        // Rotate circle to start from the top.
        circle.setAttribute('stroke-dashoffset', (1 / 4) * circumference);
    };
</script>

<main>
    <button
        title="replay the current notes, click again to stop"
        on:click="{handleClick}"
        disabled="{notes.length === 0}"
    >
        <svg
            width="{iconSize}px"
            height="{iconSize}px"
            style="width: {iconSize}px; height: {iconSize}px;"
        >
            <path
                x="{0}"
                y="{0}"
                d="{`M4,4 L4,${iconSize - 4} L${iconSize - 4},${isPlaying ? iconSize - 4 : iconSize / 2} L${isPlaying ? iconSize - 4 : 4},4 Z`}"
                fill="#444"
            ></path>
        </svg>
        <svg
            width="{iconSize}"
            height="{iconSize}"
            style="width: {iconSize}px; height: {iconSize}px;"
            visibility="{isPlaying ? 'visible' : 'hidden'}"
        >
            <circle
                bind:this="{circle}"
                cx="{iconSize / 2}"
                cy="{iconSize / 2}"
                r="{circleRadius}"
            ></circle>
        </svg>
    </button>
    <NumberInput
        title="replay speed (2 means twice as fast, 0.5 half as fast)"
        bind:value="{speed}"
        min="{0.5}"
        max="{10}"
        step="{0.5}"
        width="40px"
        disabled="{notes.length === 0 || isPlaying}"
        style="border-radius: 0 8px 8px 0; margin: 0;"
    />
</main>

<style>
    main {
        margin: 0px 6px;
        display: inline-flex;
        align-items: center;
        padding: 0;
        position: relative;
        top: 5px;
    }

    button {
        margin: 0;
        padding-bottom: 0;
        margin-right: -12px;
        display: inline-block;
        align-items: center;
        /* justify-items: stretch; */
        border-radius: 8px 0 0 8px;
    }

    svg {
        display: inline-block;
    }

    svg path {
        transition: all 300ms;
    }

    svg circle {
        stroke: #888;
        stroke-width: 2px;
        fill: transparent;
        /* fill: black; */
    }
</style>
