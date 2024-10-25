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
    import {
        NOTE_TO_CHROMA_MAP,
        SCALE_DEGREES_MAJOR,
        SCALE_DEGREES_MINOR,
    } from '../lib/music';
    import example from '../example-recordings/improvisation-note-colors.json';
    import FileDropTarget from '../common/file-drop-target.svelte';
    import MidiReplayButton from '../common/input-elements/midi-replay-button.svelte';
    import ScaleSelect from '../common/input-elements/scale-select.svelte';

    /**
     * contains the app meta information defined in App.js
     */
    export let appInfo;

    let width = 900;
    let height = 300;
    let container;
    const noteNames = Midi.NOTE_NAMES;
    // settings
    // let root = 'A';
    let root = 'C';
    let scaleType = 'major';
    let pastNoteCount = 50;
    let showDuration = false;
    // data
    let firstTimeStamp;
    let notes = [];
    let openNoteMap = new Map();
    $: scaleNotes = Scale.get(`${root} ${scaleType}`).notes.map(
        (d) => noteNames[NOTE_TO_CHROMA_MAP.get(d)],
    );
    $: scaleDegrees = [
        ...(scaleType === 'major'
            ? SCALE_DEGREES_MAJOR
            : SCALE_DEGREES_MINOR
        ).values(),
    ];
    let colorMap = ['#eee', ...d3.schemeObservable10];

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
        notes = [...notes, note];
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
        const limited = notes.slice(-pastNoteCount);
        const durationLimit = 1;
        const plot = Plot.plot({
            width,
            height,
            marginLeft: 50,
            marginBottom: 50,
            padding: 0,
            x: {
                axis: false,
            },
            y: {
                axis: showDuration,
                domain: [0, durationLimit],
                label: 'duration in seconds',
                labelAnchor: 'center',
            },
            color: {
                domain: d3.range(-1, 7),
                range: colorMap,
                legend: true,
                tickFormat: (d) => (d === -1 ? 'non-scale' : scaleNotes[d]),
                marginLeft: 190,
            },
            marks: [
                Plot.ruleY([0], {
                    stroke: '#ddd',
                }),
                // data
                Plot.barY(limited, {
                    x: (d, i) => i,
                    y: (d) => {
                        // if bar height is duration, show currently held notes in full height
                        if (showDuration) {
                            return d.duration > 0 ? d.duration : durationLimit;
                        }
                        return durationLimit;
                    },
                    fill: (d) => scaleNotes.indexOf(d.name),
                    stroke: (d) => scaleNotes.indexOf(d.name),
                    fillOpacity: (d) =>
                        // if bar height is duration, show currently held notes without fill, only stroke
                        showDuration && d.duration === 0 ? 0 : 1,
                    inset: 1.5,
                    rx: 4,
                    // tip: true,
                }),
                Plot.text(limited, {
                    x: (d, i) => i,
                    y: 0,
                    text: (d) => d.name.split('').join('\n'),
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
            scaleType,
            pastNoteCount,
            showDuration,
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
        scaleType = json.scaleType;
        pastNoteCount = json.pastNoteCount;
        showDuration = json.showDuration;
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
            This app helps practicing improvising in a scale by coloring the
            different scale degrees to show you which you play when. Notes that
            you play are shown as bars. Optionally, the bars' height encodes the
            notes' durations. You can change the colors if you like.
        </p>
        <div class="control">
            <ScaleSelect
                bind:scaleRoot="{root}"
                bind:scaleType
                callback="{draw}"
                allowedScales="{['major', 'minor']}"
            />
            <NoteCountInput bind:value="{pastNoteCount}" callback="{draw}" />
            <ToggleButton
                bind:checked="{showDuration}"
                label="show duration"
                title="Show duration in the bar's height?"
                callback="{draw}"
            />
        </div>
        <div class="legend">
            {#each scaleDegrees as degree, index}
                <label title="change color">
                    <input
                        on:change="{(evt) => {
                            colorMap[index + 1] = evt.target.value;
                            colorMap = [...colorMap];
                            draw();
                        }}"
                        type="color"
                        value="{colorMap[index + 1]}"
                    />
                    {degree.name}
                </label>
            {/each}
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
            <MidiReplayButton bind:notes callback="{draw}" />
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

<style>
    .legend label {
        display: inline-flex;
        align-items: center;
        font-size: 11px;
        margin: 0 5px;
        padding: 0 5px;
        text-align: center;
        cursor: pointer;
    }

    .legend input[type='color'] {
        padding: 0;
        width: 20px;
        height: 22px;
        border: none;
        outline: none;
    }
</style>
