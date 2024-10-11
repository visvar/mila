<script>
    import { onDestroy, onMount } from 'svelte';
    import * as d3 from 'd3';
    import * as Plot from '@observablehq/plot';
    import { Scale } from '@tonaljs/tonal';
    import { clamp } from '../lib/lib';
    import { Midi } from 'musicvis-lib';
    import NoteCountInput from '../common/input-elements/note-count-input.svelte';
    import MidiInput from '../common/input-handlers/midi-input.svelte';
    import ImportExportButton from '../common/input-elements/import-export-share-button.svelte';
    import { localStorageAddRecording } from '../lib/localstorage';
    import HistoryButton from '../common/input-elements/history-button.svelte';
    import ResetNotesButton from '../common/input-elements/reset-notes-button.svelte';
    import ExerciseDrawer from '../common/exercise-drawer.svelte';
    import RatingButton from '../common/input-elements/rating-button.svelte';
    import ToggleButton from '../common/input-elements/toggle-button.svelte';
    import { NOTE_TO_CHROMA_MAP } from '../lib/music';
    import example from '../example-recordings/improvisation-note-colors.json';
    import FileDropTarget from '../common/file-drop-target.svelte';

    /**
     * contains the app meta information defined in App.js
     */
    export let appInfo;

    let width = 900;
    let height = 300;
    let container;
    const noteNames = Midi.NOTE_NAMES_FLAT;
    const rootColor = '#1B5E20';
    const scale1Color = '#D4E157';
    const scale2Color = '#689F38';
    const restColor = 'lightgray';
    // settings
    // let root = 'A';
    let root = 'C';
    let scaleType1 = 'major';
    let scaleType2 = 'major pentatonic';
    let pastNoteCount = 50;
    let showDuration = false;
    let showLoudness = false;
    // data
    let firstTimeStamp;
    let notes = [];
    let openNoteMap = new Map();

    const noteOn = (e) => {
        if (notes.length === 0) {
            firstTimeStamp = e.timestamp;
        }
        const noteInSeconds = (e.timestamp - firstTimeStamp) / 1000;
        const note = {
            name: e.note.name + (e.note.accidental ?? ''),
            number: e.note.number,
            velocity: e.velocity,
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
        const scale1 = new Set(
            Scale.get(`${root} ${scaleType1}`).notes.map(
                (d) => noteNames[NOTE_TO_CHROMA_MAP.get(d)],
            ),
        );
        const scale2 = new Set(
            Scale.get(`${root} ${scaleType2}`).notes.map(
                (d) => noteNames[NOTE_TO_CHROMA_MAP.get(d)],
            ),
        );
        const colorMap = noteNames.map((note) => {
            if (note === root) {
                return rootColor;
            } else if (scale2.has(note)) {
                return scale2Color;
            } else if (scale1.has(note)) {
                return scale1Color;
            } else {
                return restColor;
            }
        });
        const limited = notes.slice(-pastNoteCount);
        const plot = Plot.plot({
            width,
            height: showDuration ? height : height * 0.7,
            marginLeft: 50,
            marginBottom: 50,
            padding: 0,
            x: {
                axis: false,
            },
            y: {
                axis: showDuration,
                domain: [0, 1],
                label: 'duration in seconds',
                labelAnchor: 'center',
            },
            color: {
                legend: true,
                domain: d3.range(12),
                range: colorMap,
                tickFormat: (d) => Midi.NOTE_NAMES[d],
                marginLeft: 190,
            },
            opacity: {
                domain: [0, 127],
                range: [0.3, 1],
            },
            marks: [
                Plot.ruleY([0], {
                    stroke: '#ddd',
                }),
                // data
                Plot.barY(limited, {
                    x: (d, i) => i,
                    y: showDuration ? 'duration' : 1,
                    fill: (d) => d.number % 12,
                    opacity: showLoudness ? (d) => d.velocity : 1,
                    inset: 0.5,
                    rx: 4,
                    tip: true,
                }),
                Plot.text(limited, {
                    x: (d, i) => i,
                    y: 0,
                    text: 'name',
                    fontSize: 12,
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
        saveToStorage();
        root = json.root;
        pastNoteCount = json.pastNoteCount;
        // data
        notes = json.notes;
        draw();
    };

    const saveToStorage = () => {
        if (
            notes.length > 0 &&
            JSON.stringify(notes) !== JSON.stringify(example.notes)
        ) {
            localStorageAddRecording(appInfo.id, getExportData());
        }
    };

    onDestroy(saveToStorage);
</script>

<FileDropTarget {loadData}>
    <main class="app">
        <h2>{appInfo.title}</h2>
        <p class="explanation">
            This app helps practicing improvising in a scale that is a sub-set
            of another scale. Notes that you play are shown as bars. The color
            shows which scale subset a note belongs to. For example, when
            improvising in C major pentatonic, the note C would be the darkest,
            followed by the notes of the pentatonic in a brighter color, the
            rest of the major scale even brighter, and all remaining notes of
            the chromatic scale in gray. The bars' height encodes the notes'
            durations.
        </p>
        <div class="control">
            <label>
                scale type 1
                <select
                    bind:value="{scaleType1}"
                    on:change="{draw}"
                    style="background-color: {scale1Color};"
                >
                    {#each ['major', 'minor'] as s}
                        <option value="{s}">{s}</option>
                    {/each}
                </select>
            </label>
            <label>
                scale type 2
                <select
                    bind:value="{scaleType2}"
                    on:change="{draw}"
                    style="background-color: {scale2Color};"
                >
                    {#each ['pentatonic', 'blues'].map((d) => `${scaleType1} ${d}`) as s}
                        <option value="{s}">{s}</option>
                    {/each}
                </select>
            </label>
            <label>
                root note
                <select
                    bind:value="{root}"
                    on:change="{draw}"
                    style="background-color: {rootColor};"
                >
                    {#each Midi.NOTE_NAMES as n}
                        <option value="{n}">{n}</option>
                    {/each}
                </select>
            </label>
        </div>
        <div class="control">
            <NoteCountInput bind:value="{pastNoteCount}" callback="{draw}" />
            <ToggleButton
                bind:checked="{showDuration}"
                label="show duration"
                title="Show duration in the bar's height?"
                callback="{draw}"
            />
            <ToggleButton
                bind:checked="{showLoudness}"
                label="show loudness"
                title="Show loudness in the bar's opacity?"
                callback="{draw}"
            />
        </div>
        <div class="visualization" bind:this="{container}"></div>
        <div class="control">
            <ResetNotesButton
                bind:notes
                {saveToStorage}
                callback="{() => {
                    openNoteMap = new Map();
                    draw();
                }}"
            />
            <button on:click="{() => loadData(example)}"> example </button>
            <HistoryButton appId="{appInfo.id}" {loadData} />
            <ImportExportButton
                {loadData}
                {getExportData}
                appId="{appInfo.id}"
            />
        </div>
        <ExerciseDrawer>
            <p>
                1) Improvise something in the scale of C major pentatonic. Check
                if you only used this scale's notes using the colors.
            </p>
            <p>
                2) Improvise something in A minor pentatonic. Check if you only
                used this scale's notes using the colors and how often and when
                you used the tonic A.
            </p>
            <p>
                3) Improvise in A minor blues, see how often and when you used
                the blue note (D#).
            </p>
            <p>4) Improvise in a scale you do not know yet.</p>
        </ExerciseDrawer>
        <RatingButton appId="{appInfo.id}" />
        <MidiInput {noteOn} {noteOff} {controlChange} />
    </main>
</FileDropTarget>
