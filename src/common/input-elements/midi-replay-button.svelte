<script>
    import { onDestroy } from 'svelte';
    import NumberInput from './number-input.svelte';
    import * as d3 from 'd3';
    import Player from '../../lib/Player';
    import { Note } from 'musicvis-lib';
    import SelectScollable from './select-scollable.svelte';
    import { drumIcon, guitarIcon, muteIcon, pianoIcon } from '../../lib/icons';

    export let notes = [];
    export let speed = 1;
    /**
     * Called when the player starts
     */
    export let onStart = () => {};
    /**
     * Called when the player starts
     */
    export let onStop = () => {};
    /**
     * Called for each played note and when the player stops
     */
    export let callback = () => {};
    /**
     * If true, all notes will be shifted such that the first starts at 0
     */
    export let startAtFirstNote = true;
    // export let allowSound = false;
    export let allowSound = true;

    /**
     * @type {'silent'|'percussion'|'acoustic_grand_piano'}
     */
    export let sound = 'silent';

    let timeouts = [];
    let oldNotes;
    let isPlaying = false;
    // progress indicator circle
    let circle;
    const iconSize = 24;
    const circleRadius = 4.5;
    let circleRaf;
    let startTime = 0;
    const player = new Player();
    // player.preloadInstrument('acoustic_grand_piano')
    $: player.preloadInstrument(sound);

    /**
     * plays notes
     */
    const replay = () => {
        onStart();
        isPlaying = true;
        const timeFactor = 1000 / speed;
        oldNotes = [...notes];
        notes = [];
        timeouts = [];
        let [minTime, maxTime] = d3.extent(oldNotes, (d) => d.time ?? d);
        if (!startAtFirstNote) {
            // optionally shift all notes so the first one starts at 0
            // setting minTime to 0 prevents this
            minTime = 0;
        }
        maxTime = maxTime - minTime;
        // timeouts for notes
        for (const n of oldNotes) {
            const time = (n.time ?? n) - minTime;
            timeouts.push(
                setTimeout(() => {
                    notes = [...notes, n];
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
        // start soundfont player
        if (sound !== 'silent') {
            const notes2 = oldNotes.map((n) => {
                const time = (n.time ?? n) - minTime;
                const duration = n.duration ?? 0.2;
                let velocity = n.velocityRaw ?? n.velocity ?? 1;
                velocity = velocity <= 1 ? velocity : velocity / 127;
                return Note.from({
                    // pitch: 31, // sticks
                    pitch: n.number ?? 33, // metro click
                    start: time,
                    end: time + duration,
                    duration,
                    velocity,
                    channel: 0,
                });
            });
            player.playNotes(notes2, sound, 0, undefined, speed);
        }
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
        player.stop();
        onStop();
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
            <!-- play/stop button. morphs from one to the other -->
            <path
                x="{0}"
                y="{0}"
                d="{`M4,4 L4,${iconSize - 4} L${iconSize - 4},${isPlaying ? iconSize - 4 : iconSize / 2} L${isPlaying ? iconSize - 4 : 4},4 Z`}"
                fill="#444"
                stroke="#444"
                stroke-width="3"
                stroke-linejoin="round"
                rx="3"
            ></path>
            <!-- circle for full time -->
            <circle
                cx="{iconSize / 2}"
                cy="{iconSize / 2}"
                r="{circleRadius}"
                stroke="#888"
                visibility="{isPlaying ? 'visible' : 'hidden'}"
            ></circle>
            <!-- circle for current time -->
            <circle
                bind:this="{circle}"
                cx="{iconSize / 2}"
                cy="{iconSize / 2}"
                r="{circleRadius}"
                stroke="white"
                visibility="{isPlaying ? 'visible' : 'hidden'}"
            ></circle>
        </svg>
    </button>
    {#if allowSound}
        <SelectScollable
            title="sound"
            bind:value="{sound}"
            style="margin: 0 -12.5px 0 -0.5px; border-radius: 0"
            disabled="{notes.length === 0 || isPlaying}"
        >
            <option value="silent">{muteIcon}</option>
            <option value="acoustic_grand_piano">{pianoIcon}</option>
            <option value="percussion">{drumIcon}</option>
            <option value="acoustic_guitar_nylon">{guitarIcon}</option>
        </SelectScollable>
    {/if}
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
        gap: 0;
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
        stroke-width: 4px;
        fill: transparent;
        /* fill: black; */
    }
</style>
