<script>
    import { onDestroy } from 'svelte';
    import RhythmPlayer from '../../lib/RhythmPlayer.js';
    import { Note } from 'musicvis-lib';

    /**
     * notes: object with {number, time, [duration]}
     */
    export let notes = [];
    export let startAt = 0;
    export let endAt = -1;
    export let speed = 1;
    export let loop = false;

    const player = new RhythmPlayer();

    $: noteObjs = notes.map((d) => {
        return {
            pitch: d.number,
            start: d.time,
            duration: d.duration ?? 0.075,
            velocity: 127,
        };
    });

    onDestroy(() => {
        // turn off player
        player.stop();
    });
</script>

<button
    title="Play the current rhythm grid"
    on:click="{() => {
        // console.log(noteObjs);
        player.toggle(noteObjs, startAt, endAt, speed, loop);
    }}"
>
    play rhythm
</button>
