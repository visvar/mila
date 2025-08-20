<script>
    import { onDestroy, onMount } from 'svelte';
    import * as d3 from 'd3';
    import * as Plot from '@observablehq/plot';
    import { Midi } from 'musicvis-lib';
    import { getCs } from '../lib/lib';
    import MidiInput from '../common/input-handlers/midi-input.svelte';
    import ToggleButton from '../common/input-elements/toggle-button.svelte';

    export let toolInfo;
    let width = 900;
    let height = 500;
    let container;
    // settings
    let pastSeconds = 30;
    let colorMap = 'velocity';
    let onlyChroma = true;
    // data
    let firstTimeStamp = 0;
    let notes = [];
    const openNoteMap = new Map();
    let currentAniFrame = null;
    let realTime = true;

    const noteOn = (e) => {
        const noteInSeconds = (e.timestamp - firstTimeStamp) / 1000;
        const note = {
            // ...e.note,
            number: e.note.number,
            velocity: e.rawVelocity,
            time: noteInSeconds,
            channel: e.message.channel,
        };
        // fix old note if its end was missed
        if (openNoteMap.has(e.note.number)) {
            const oldNote = openNoteMap.get(e.note.number);
            if (oldNote.end === undefined) {
                oldNote.end = noteInSeconds;
            }
        }
        notes.push(note);
        openNoteMap.set(e.note.number, note);
    };

    const noteOff = (e) => {
        if (openNoteMap.has(e.note.number)) {
            const note = openNoteMap.get(e.note.number);
            const noteInSeconds = (e.timestamp - firstTimeStamp) / 1000;
            note.end = noteInSeconds;
        }
        draw();
    };

    const draw = () => {
        const maxTime = (performance.now() - firstTimeStamp) / 1000;
        const minTime = maxTime - pastSeconds;
        // only handle recent notes
        const filtered = notes.filter(
            (d) => d.end > minTime || d.end === undefined,
        );
        const pitchExtent = onlyChroma
            ? [0, 11]
            : d3.extent(filtered, (d) => d.number);
        // color
        let color;
        let fill;
        if (colorMap === 'velocity') {
            color = {
                label: 'Note velocity',
                scheme: 'blues',
                domain: [0, 127],
            };
            fill = 'velocity';
        } else if (colorMap === 'piano') {
            color = {
                label: 'Piano key color',
                domain: ['black', 'white'],
                range: ['black', '#f8f8f8'],
            };
            fill = (d) => (Midi.isSharp(d.number) ? 'black' : 'white');
        } else if (colorMap === 'channel') {
            color = {
                type: 'categorical',
                label: 'MIDI channel',
                scheme: 'tableau10',
            };
            fill = (d) => d.channel;
        } else if (colorMap === 'none') {
            fill = '#ddd';
        }
        // plot
        const plot = Plot.plot({
            insetRight: 10,
            width,
            height,
            marginBottom: 40,
            padding: 0,
            x: {
                label: 'Time in seconds',
                domain: [minTime, maxTime],
            },
            y: {
                label: 'MIDI Pitch',
                grid: true,
                reverse: true,
                domain: d3.range(pitchExtent[0] - 1, pitchExtent[1] + 2),
                // type: 'linear',
                tickFormat: onlyChroma
                    ? (d) => Midi.MIDI_NOTES[d]?.name ?? ''
                    : (d) => Midi.MIDI_NOTES[d]?.label ?? '',
            },
            color: {
                ...color,
                legend: colorMap !== 'none',
                marginLeft: 100,
                width: 300,
            },
            marks: [
                Plot.ruleY(getCs(pitchExtent[0] - 1, pitchExtent[1] + 2)),
                // current time
                Plot.ruleX([maxTime], { stroke: '#888' }),
                Plot.barX(filtered, {
                    clip: true,
                    x1: 'time',
                    // drum notes have duration 0 and would be invisible
                    x2: (d) => {
                        if (d.end === undefined) {
                            return maxTime;
                        }
                        return Math.max(d.end, d.time + 0.025);
                    },
                    y: onlyChroma ? (d) => d.number % 12 : (d) => d.number,
                    fill,
                    stroke: '#ccc',
                    rx: 5,
                }),
            ],
        });
        try {
            container.textContent = '';
            container.appendChild(plot);
        } catch (e) {}
        if (realTime) {
            currentAniFrame = requestAnimationFrame(draw);
        }
    };

    const toggleRealtime = (realTime) => {
        // realTime = !realTime;
        if (realTime) {
            console.log('start');

            cancelAnimationFrame(currentAniFrame);
            currentAniFrame = requestAnimationFrame(draw);
        } else {
            console.log('stop');
            cancelAnimationFrame(currentAniFrame);
        }
    };
    $: toggleRealtime(realTime);

    onMount(() => {
        firstTimeStamp = performance.now();
        currentAniFrame = requestAnimationFrame(draw);
    });

    onDestroy(() => {
        cancelAnimationFrame(currentAniFrame);
    });
</script>

<main class="app">
    <h2>{toolInfo.title}</h2>
    <p class="explanation">
        The piano roll below shows incoming MIDI notes as rectangles with their
        pitch (y position) and start and end times (x left and right side of the
        rectangle). The color encodes the MIDI velocity, which tells how
        hard/loud a note was played.
    </p>
    <div class="control">
        <ToggleButton
            bind:checked="{onlyChroma}"
            label="ignore octave"
            title="If active, only the note's chroma will be considered which reduces the y axis to the twelve notes"
        />
        <label>
            color
            <select bind:value="{colorMap}">
                {#each ['velocity', 'piano', 'channel', 'none'] as d}
                    <option value="{d}">{d}</option>
                {/each}
            </select>
        </label>
        <label title="time in seconds for past notes to be shown">
            time
            <input
                type="number"
                bind:value="{pastSeconds}"
                min="10"
                max="300"
                step="10"
            />
        </label>
        <ToggleButton
            bind:checked="{realTime}"
            label="live"
            title="Update plot in real-time or only when a note ends"
        />
    </div>
    <div class="visualization" bind:this="{container}"></div>
    <div class="control">
        <button
            title="Clear all played notes"
            on:click="{() => {
                if (confirm('Reset played notes?')) {
                    notes = [];
                    firstTimeStamp = performance.now();
                }
            }}"
        >
            reset
        </button>
    </div>
    <MidiInput {noteOn} {noteOff} />
</main>
