<script>
    import { onDestroy, onMount } from 'svelte';
    import * as d3 from 'd3';
    import * as Plot from '@observablehq/plot';
    import { Note } from '@tonaljs/tonal';
    import NoteCountInput from '../common/note-count-input.svelte';
    import ResetNotesButton from '../common/reset-notes-button.svelte';
    import MidiInput from '../common/midi-input.svelte';
    import ImportExportButton from '../common/import-export-button.svelte';
    import { localStorageAddRecording } from '../lib/localstorage';
    import HistoryButton from '../common/history-button.svelte';
    import ExerciseDrawer from '../common/exercise-drawer.svelte';
    import RatingButton from '../common/rating-button.svelte';
    import ScaleSelect from '../common/scale-select.svelte';
    import ToggleButton from '../common/toggle-button.svelte';
    import { NOTE_TO_CHROMA_MAP } from '../lib/music';
    import example from '../example-recordings/fretboard-heatmap.json';
    import ShareConfigButton from '../common/share-config-button.svelte';
    import MidiReplayButton from '../common/midi-replay-button.svelte';
    import FileDropTarget from '../common/file-drop-target.svelte';

    /**
     * contains the app meta information defined in App.js
     */
    export let appInfo;

    let width = 900;
    let stringCount = 6;
    let fretCount = 24;
    // E standard tuning, strings start at high E
    let tuningPitches = [64, 59, 55, 50, 45, 40];
    const tuningNotes = tuningPitches.map(Note.fromMidiSharps);
    let container;
    let scaleInfo;
    $: scaleChromaSet = new Set(
        scaleInfo ? scaleInfo.notes.map((d) => NOTE_TO_CHROMA_MAP.get(d)) : [],
    );
    // settings
    let pastNoteCount = 200;
    let showScale = true;
    let scaleRoot = 'A';
    let scaleType = 'minor pentatonic';
    // data
    let firstTimeStamp = 0;
    let notes = [];

    const isInScale = (string, fret, tuningPitches, scaleInfo) => {
        if (!scaleInfo) {
            return false;
        }
        const chroma = (tuningPitches[string] + fret) % 12;
        return scaleChromaSet.has(chroma);
    };

    const noteOn = (e) => {
        if (notes.length === 0) {
            firstTimeStamp = e.timestamp;
        }
        const noteInSeconds = (e.timestamp - firstTimeStamp) / 1000;
        const string = e.message.channel - 1;
        const note = {
            time: noteInSeconds,
            number: e.note.number,
            velocity: e.rawVelocity,
            string,
            fret: e.note.number - tuningPitches[string],
            channel: e.message.channel,
        };
        notes.push(note);
        draw();
    };

    const draw = () => {
        // TODO: filter notes which are too close together
        // TODO: filter notes with low velocity
        const data = notes.slice(-pastNoteCount);
        const cellSize = (width - 100) / 25;

        // count notes for each string, fret position
        const aggregated = d3
            .groups(
                data,
                (d) => d.string,
                (d) => d.fret,
            )
            .flatMap(([string, grp]) =>
                grp.map(([fret, grp2]) => {
                    return { string, fret, count: grp2.length };
                }),
            );

        const plot = Plot.plot({
            width,
            // height,
            aspectRatio: 1,
            marginLeft: 50,
            marginBottom: 40,
            padding: 0,
            x: {
                domain: d3.range(0, fretCount + 1),
                ticks: d3.range(0, fretCount + 1),
                tickSize: 0,
            },
            y: {
                domain: d3.range(0, stringCount),
                tickFormat: (d) => tuningNotes[d],
                tickSize: 0,
            },
            color: {
                legend: showScale,
                marginLeft: 100,
                width: 400,
                scheme: 'tableau10',
                domain: ['in scale', 'not in scale'],
            },
            marks: [
                // frets
                Plot.ruleX(d3.range(0, fretCount + 1), {
                    stroke: '#ddd',
                    dx: cellSize / 2,
                }),
                // strings
                Plot.ruleY(d3.range(0, stringCount), {
                    stroke: '#ddd',
                    strokeWidth: (d) => Math.sqrt(d + 1),
                }),
                // inlay dots
                Plot.dot([3, 5, 7, 9, 15, 17, 19, 21], {
                    x: (d) => d,
                    y: 2,
                    dy: cellSize / 2,
                    fill: '#ddd',
                    r: 8,
                }),
                Plot.dot([12, 12, 24, 24], {
                    x: (d) => d,
                    y: (d, i) => (i % 2 === 0 ? 1 : 3),
                    dy: cellSize / 2,
                    fill: '#ddd',
                    r: 8,
                }),
                // heatmap
                Plot.cell(aggregated, {
                    x: 'fret',
                    y: 'string',
                    fill: (d) =>
                        showScale
                            ? isInScale(
                                  d.string,
                                  d.fret,
                                  tuningPitches,
                                  scaleInfo,
                              )
                                ? 'in scale'
                                : 'not in scale'
                            : '#222',
                    opacity: 'count',
                    inset: 5,
                    rx: 10,
                    tip: true,
                }),
                Plot.text(aggregated, {
                    text: (d) => d.count,
                    x: 'fret',
                    y: 'string',
                    fill: 'black',
                    stroke: 'white',
                    strokeWidth: 3,
                    paintOrder: 'stroke',
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
            pastNoteCount,
            showScale,
            scaleRoot,
            scaleType,
            notes,
        };
    };

    /**
     * Import data from file or example
     */
    const loadData = (json) => {
        saveToStorage();
        pastNoteCount = json.pastNoteCount;
        showScale = json.showScale;
        scaleRoot = json.scaleRoot;
        scaleType = json.scaleType;
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
            This app helps practicing scales and improvisation on a guitar. The
            heatmap below shows how often you played each fretboard position. If
            a scale is shown, the color hue will tell you whether a note you
            played belongs to the scale or not.
        </p>
        <ExerciseDrawer>
            <p>1) Play the note A over the whole fretboard.</p>
            <p>
                2) Play the A minor pentatonic scale over the whole fretboard,
                string by string. Check if you played wrong notes.
            </p>
            <p>3) Improvise in A minor pentatonic over the whole fretboard.</p>
            <p>
                4) Improvise in a scale you do not know yet over the whole
                fretboard.
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
                bind:scaleRoot
                bind:scaleType
                callback="{draw}"
                bind:scaleInfo
                disabled="{!showScale}"
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
            <MidiReplayButton bind:notes callback="{draw}" />
            <ShareConfigButton
                {getExportData}
                {loadData}
                appId="{appInfo.id}"
            />
        </div>
        <RatingButton appId="{appInfo.id}" />
        <MidiInput {noteOn} />
    </main>
</FileDropTarget>
