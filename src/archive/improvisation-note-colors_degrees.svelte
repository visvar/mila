<script>
    import { onDestroy, onMount } from 'svelte';
    import * as d3 from 'd3';
    import * as Plot from '@observablehq/plot';
    import { Scale } from '@tonaljs/tonal';
    import { clamp } from '../lib/lib';
    import { Midi } from 'musicvis-lib';
    import NoteCountInput from '../common/note-count-input.svelte';
    import MidiInput from '../common/midi-input.svelte';
    import ExportButton2 from '../common/export-button2.svelte';
    import ImportExportButton from '../common/import-export-button.svelte';
    import { localStorageAddRecording } from '../lib/localstorage';
    import HistoryButton from '../common/history-button.svelte';

    /**
     * TODO: support minor, see https://en.wikipedia.org/wiki/Degree_(music)
     *
     */

    /**
     * contains the app meta information defined in App.js
     */
    export let appInfo;

    let width = 1200;
    let height = 400;
    let container;
    // settings
    let root = 'C';
    let pastNoteCount = 50;
    // data
    let notes = [];
    let firstTimeStamp;
    let openNoteMap = new Map();

    const noteOn = (e) => {
        if (notes.length === 0) {
            firstTimeStamp = e.timestamp;
        }
        const noteInSeconds = (e.timestamp - firstTimeStamp) / 1000;
        const note = {
            name: e.note.name + (e.note.accidental ?? ''),
            number: e.note.number,
            velocity: e.rawVelocity,
            time: noteInSeconds,
            channel: e.message.channel,
            duration: 0,
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
        draw();
    };

    const noteOff = (e) => {
        if (openNoteMap.has(e.note.number)) {
            const note = openNoteMap.get(e.note.number);
            const noteInSeconds = (e.timestamp - firstTimeStamp) / 1000;
            note.end = noteInSeconds;
            note.duration = note.end - note.time;
        }
        draw();
    };

    const controlChange = (e) => {
        const clamped = clamp(e.rawValue * 2, 20, 250);
        pastNoteCount = clamped;
        draw();
    };

    const draw = () => {
        const colors = [
            // tonic
            '#2B6E30',
            // supertonic
            'lightgreen',
            // mediant
            'lightgreen',
            // subdominant
            'lightblue',
            // dominant
            '#8888ff',
            // submediant
            'lightgreen',
            // leading tone
            'lightgreen',
        ];
        const scale1 = Scale.get(`${root} major`).notes;
        const colorMap = Midi.NOTE_NAMES_FLAT.map((note) => {
            const indexInScale = scale1.indexOf(note);
            if (indexInScale === -1) {
                return 'lightgray';
            }
            return colors[indexInScale];
        });
        const limited = notes.slice(-pastNoteCount);
        const plot = Plot.plot({
            width,
            height,
            marginLeft: 80,
            marginBottom: 50,
            padding: 0,
            x: {
                axis: false,
            },
            y: {
                domain: [0, 2],
                label: 'duration in seconds',
            },
            color: {
                legend: true,
                domain: d3.range(12),
                range: colorMap,
                tickFormat: (d) => Midi.NOTE_NAMES[d],
                marginLeft: 290,
            },
            marks: [
                Plot.ruleY([0], {
                    stroke: '#ddd',
                }),
                // data
                Plot.barY(limited, {
                    x: (d, i) => i,
                    y: 'duration',
                    fill: (d) => d.number % 12,
                    inset: 0.5,
                    rx: 4,
                    tip: true,
                }),
                Plot.text(limited, {
                    x: (d, i) => i,
                    y: 0,
                    text: 'name',
                    fontSize: 14,
                    dy: 16,
                }),
            ],
        });
        container.textContent = '';
        container.appendChild(plot);
    };

    onMount(draw);

    /**
     * Used for exporting and for automatics saving
     */
    const getExportData = () => {
        return {
            root,
            pastNoteCount,
            // data
            notes,
        };
    };

    /**
     * Import data from file or example
     */
    const loadData = (json) => {
        if (
            notes.length === 0 ||
            confirm('Import data and overwrite currently unsaved data?')
        ) {
            if (notes.length > 0) {
                saveToStorage();
            }
            root = json.root;
            pastNoteCount = json.pastNoteCount;
            // data
            notes = json.notes;
            draw();
        }
    };

    const saveToStorage = () => {
        if (notes.length > 0) {
            localStorageAddRecording(appInfo.id, getExportData());
        }
    };

    onDestroy(saveToStorage);
</script>

<main class="app">
    <h2>{appInfo.title}</h2>
    <p class="explanation">
        Improvise in the major scale. Notes that you play are shown as bars. The
        color shows which scale degree a note belongs to. The bars' height
        encodes the notes' durations.
    </p>
    <div class="control">
        <label>
            root note
            <select bind:value="{root}" on:change="{draw}">
                {#each Midi.NOTE_NAMES as n}
                    <option value="{n}">{n}</option>
                {/each}
            </select>
        </label>
        <NoteCountInput bind:value="{pastNoteCount}" callback="{draw}" />
    </div>
    <div class="visualization" bind:this="{container}"></div>
    <div class="control">
        <button
            title="Clear all played notes"
            on:click="{() => {
                if (confirm('Reset played notes?')) {
                    saveToStorage();
                    notes = [];
                    openNoteMap = new Map();
                    draw();
                }
            }}"
        >
            reset
        </button>
        <ExportButton2 {getExportData} appId="{appInfo.id}" />
        <ImportExportButton {loadData} />
        <HistoryButton appId="{appInfo.id}" {loadData} />
    </div>
    <MidiInput {noteOn} {noteOff} {controlChange} />
</main>
