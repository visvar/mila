<script>
    import { onDestroy, onMount } from 'svelte';
    import * as d3 from 'd3';
    import * as Plot from '@observablehq/plot';
    import { Midi } from 'musicvis-lib';
    import { Note } from '@tonaljs/tonal';
    import MidiInput from '../common/midi-input.svelte';

    export let toolInfo;
    let width = 900;
    let height = 500;
    let stringCount = 6;
    // E standard tuning, strings start at high E
    let tuningPitches = [64, 59, 55, 50, 45, 40];
    let container;
    // settings
    let pastSeconds = 30;
    let colorMap = 'velocity';

    // data
    let firstTimeStamp = 0;
    let notes = [];
    let openNoteMap = new Map();
    let currentAniFrame = null;

    const noteOn = (e) => {
        const noteInSeconds = (e.timestamp - firstTimeStamp) / 1000;
        const string = e.message.channel - 1;
        const note = {
            // ...e.note,
            number: e.note.number,
            velocity: e.rawVelocity,
            time: noteInSeconds,
            channel: e.message.channel,
            string,
            fret: e.note.number - tuningPitches[string],
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
    };

    const draw = () => {
        const maxTime = (performance.now() - firstTimeStamp) / 1000;
        const minTime = maxTime - pastSeconds;
        // only handle recent notes
        const filtered = notes.filter(
            (d) => d.end > minTime || d.end === undefined,
        );
        const pitchExtent = d3.extent(filtered, (d) => d.number);

        const tuningNotes = tuningPitches.map(Note.fromMidiSharps);
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
                range: ['black', 'white'],
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
            marginLeft: 60,
            marginBottom: 40,
            padding: 0,
            x: {
                label: 'Time in seconds',
                domain: [minTime, maxTime],
            },
            y: {
                label: 'String',
                grid: true,
                domain: d3.range(0, stringCount),
                tickFormat: (d) => tuningNotes[d],
            },
            color: {
                ...color,
                legend: colorMap !== 'none',
                marginLeft: 100,
                width: 300,
            },
            marks: [
                Plot.ruleY(
                    d3.range(
                        Math.ceil((pitchExtent[0] - 1) / 12) * 12,
                        pitchExtent[1] + 2,
                        12,
                    ),
                ),
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
                    y: 'string',
                    fill,
                    stroke: '#ccc',
                    rx: 5,
                }),
                // fret numbers
                Plot.text(filtered, {
                    clip: true,
                    x: 'time',
                    y: 'string',
                    fill: 'black',
                    stroke: 'white',
                    text: 'fret',
                    textAnchor: 'start',
                    dx: 2,
                }),
            ],
        });
        container.textContent = '';
        container.appendChild(plot);
        currentAniFrame = requestAnimationFrame(draw);
    };

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
        The guitar tab below shows incoming MIDI notes as rectangles with their
        string (y position) and start and end times (x left and right side of
        the rectangle). The color encodes the MIDI velocity, which tells how
        hard/loud a note was played.
    </p>
    <div class="control">
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
    </div>
    <div class="visualization" bind:this="{container}"></div>
    <div class="control">
        <button
            title="Clear all played notes"
            on:click="{() => {
                if (confirm('Reset played notes?')) {
                    notes = [];
                    openNoteMap = new Map();
                    firstTimeStamp = performance.now();
                }
            }}"
        >
            reset
        </button>
    </div>
    <MidiInput {noteOn} {noteOff} />
</main>
