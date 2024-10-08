<script>
    import { onDestroy, onMount } from 'svelte';
    import * as d3 from 'd3';
    import * as Plot from '@observablehq/plot';
    import { Note } from '@tonaljs/tonal';
    import { clamp } from '../lib/lib';
    import { Midi } from 'musicvis-lib';
    import NoteCountInput from '../common/note-count-input.svelte';
    import ResetNotesButton from '../common/reset-notes-button.svelte';
    import MidiInput from '../common/midi-input.svelte';
    import ImportExportButton from '../common/import-export-button.svelte';
    import { localStorageAddRecording } from '../lib/localstorage';
    import HistoryButton from '../common/history-button.svelte';
    import ExerciseDrawer from '../common/exercise-drawer.svelte';
    import RatingButton from '../common/rating-button.svelte';
    import { NOTE_TO_CHROMA_MAP } from '../lib/music';
    import ScaleSelect from '../common/scale-select.svelte';
    import ToggleButton from '../common/toggle-button.svelte';
    import ShareConfigButton from '../common/share-config-button.svelte';
    import example from '../example-recordings/keyboard-histogram.json';
    import FileDropTarget from '../common/file-drop-target.svelte';

    /**
     * contains the app meta information defined in App.js
     */
    export let appInfo;

    let width = 900;
    // let height = 500;
    let height = 300;
    const minPitch = 21;
    const maxPitch = 108;
    let container;
    let scaleInfo;
    $: scaleChromaSet = new Set(
        scaleInfo ? scaleInfo.notes.map((d) => NOTE_TO_CHROMA_MAP.get(d)) : [],
    );
    // settings
    let pastNoteCount = 500;
    let scaleRoot = 'C';
    let scaleType = 'major';
    let showScale = true;
    // data
    let firstTimeStamp;
    let notes = [];

    const noteOn = (e) => {
        if (notes.length === 0) {
            firstTimeStamp = e.timestamp;
        }
        const noteInSeconds = (e.timestamp - firstTimeStamp) / 1000;
        const note = {
            number: e.note.number,
            velocity: e.rawVelocity,
            time: noteInSeconds,
            channel: e.message.channel,
        };
        notes.push(note);
        draw();
    };

    const controlChange = (e) => {
        const clamped = clamp(e.rawValue * 2, 20, 250);
        pastNoteCount = clamped;
        draw();
    };

    const draw = () => {
        const limited = notes.slice(-pastNoteCount);
        const counts = d3.groups(limited, (d) => d.number);
        const maxCount = d3.max(counts, (d) => d[1].length);
        container.textContent = '';
        const plot = Plot.plot({
            width,
            height,
            marginLeft: 30,
            marginBottom: 28,
            marginRight: 5,
            padding: 0,
            x: {
                label: '',
                domain: d3.range(minPitch, maxPitch + 1),
                tickFormat: (d) => {
                    if (Midi.isSharp(d)) {
                        return '';
                    } else if (d % 12 === 0) {
                        return '\n' + Note.fromMidiSharps(d);
                    } else {
                        return Note.fromMidiSharps(d).slice(0, -1);
                    }
                },
            },
            y: {
                label: 'count',
                interval: 1,
                nice: true,
            },
            color: {
                legend: showScale,
                domain: ['in scale', 'not in scale'],
                range: d3.schemeTableau10,
                marginLeft: 380,
            },
            marks: [
                Plot.ruleY([0], {
                    stroke: '#ddd',
                }),
                // background bars
                Plot.barY(
                    d3
                        .range(minPitch, maxPitch + 1)
                        .filter((d) => Midi.isSharp(d)),
                    {
                        x: (d) => d,
                        y: () => maxCount,
                        fill: '#f8f8f8',
                        inset: 0.5,
                    },
                ),
                // data
                Plot.waffleY(
                    limited,
                    Plot.groupX(
                        { y: 'count' },
                        {
                            x: 'number',
                            fill: showScale
                                ? (d) =>
                                      scaleChromaSet.has(d.number % 12)
                                          ? 'in scale'
                                          : 'not in scale'
                                : (d) =>
                                      Midi.isSharp(d.number) ? '#444' : '#ccc',
                            inset: 0.5,
                            rx: 4,
                            tip: true,
                        },
                    ),
                ),
            ],
        });
        container.appendChild(plot);
        // mini keyboard for
        const plot2 = Plot.plot({
            width,
            height: 60,
            marginLeft: showScale ? 65 : 30,
            marginRight: showScale ? 40 : 5,
            marginBottom: 10,
            padding: 0,
            x: { axis: false, interval: 1 },
            y: {
                axis: false,
            },
            marks: [
                Plot.rectY(d3.range(minPitch, maxPitch + 1), {
                    x: (d) => d,
                    y1: (d) => (Midi.isSharp(d) ? 2 : 1.5),
                    y2: (d) => (Midi.isSharp(d) ? 0.5 : 0),
                    fill: (d) => (Midi.isSharp(d) ? '#333' : 'white'),
                    stroke: '#bbb',
                    inset: 1,
                    rx: 2.5,
                    clip: false,
                }),
            ],
        });
        container.appendChild(plot2);
    };

    onMount(draw);

    /**
     * Used for exporting and for automatics saving
     */
    const getExportData = () => {
        return {
            pastNoteCount,
            scaleRoot,
            scaleType,
            // data
            notes,
        };
    };

    /**
     * Import data from file or example
     */
    const loadData = (json) => {
        saveToStorage();
        pastNoteCount = json.pastNoteCount;
        scaleRoot = json.scaleRoot;
        scaleType = json.scaleType;
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
            This app helps practicing scales on a keyboard. The heatmap below
            shows how often you played each keyboard key. You can color notes
            depending on whether they belong to the chosen scale or not, so you
            can see how often you played one outside the scale (on purpose or by
            accident).
        </p>
        <ExerciseDrawer>
            <p>
                1) Improvise something while trying to use the whole range of
                the keyboard.
            </p>
            <p>
                2) Improvise something while trying to use both hands (far
                enough apart) for the same amount of notes.
            </p>
        </ExerciseDrawer>
        <div class="control">
            <NoteCountInput bind:value="{pastNoteCount}" callback="{draw}" />
            <ToggleButton
                bind:checked="{showScale}"
                label="show scale"
                title="If active, the color hue will show whether notes are in the selected scale or not"
                callback="{draw}"
            />
            <ScaleSelect
                bind:scaleInfo
                bind:scaleRoot
                bind:scaleType
                disabled="{!showScale}"
                callback="{draw}"
            />
        </div>
        <div class="visualization" bind:this="{container}"></div>
        <div class="control">
            <ResetNotesButton bind:notes {saveToStorage} callback="{draw}" />
            <ImportExportButton
                {loadData}
                {getExportData}
                appId="{appInfo.id}"
            />
            <button on:click="{() => loadData(example)}"> example </button>
            <HistoryButton appId="{appInfo.id}" {loadData} />
            <!-- <MidiReplayButton bind:notes callback="{draw}" /> -->
            <ShareConfigButton
                {getExportData}
                {loadData}
                appId="{appInfo.id}"
            />
        </div>
        <RatingButton appId="{appInfo.id}" />
        <MidiInput {noteOn} {controlChange} />
    </main>
</FileDropTarget>
