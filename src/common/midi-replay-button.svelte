<script>
    import { onDestroy } from 'svelte';
    import NumberInput from './number-input.svelte';
    import * as d3 from 'd3';
    import { playIcon, stopIcon } from '../lib/icons';

    export let notes = [];
    export let speed = 1;
    export let callback = () => {};

    let timeouts = [];
    let oldNotes;
    let isPlaying = false;
    // progress indicator circle
    let circle;
    const circleSize = 20;
    const circleRadius = (circleSize - 4) / 2;
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
        <!-- show either progress or play button -->
        {#if isPlaying}
            {stopIcon}
        {:else}
            {playIcon}
        {/if}
        <svg
            width="{circleSize}px"
            height="{circleSize}px"
            visibility="{isPlaying ? 'visible' : 'hidden'}"
        >
            <circle
                bind:this="{circle}"
                cx="{circleSize / 2}"
                cy="{circleSize / 2}"
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
        disabled="{notes.length === 0}"
        style="border-radius: 0 8px 8px 0;"
    />
</main>

<style>
    main {
        display: inline-block;
    }

    button {
        width: 80px;
        display: inline-flex;
        align-items: center;
        justify-items: stretch;
        margin-right: -25px;
        border-radius: 8px 0 0 8px;
    }

    svg {
        display: inline-block;
        margin-left: 8px;
    }

    svg circle {
        stroke: #888;
        stroke-width: 2px;
        fill: transparent;
        /* fill: black; */
    }
</style>
