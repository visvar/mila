<script>
    import { onDestroy, onMount } from 'svelte';
    import * as d3 from 'd3';
    import * as Plot from '@observablehq/plot';
    import { Midi, Utils } from 'musicvis-lib';
    import MidiInput from '../common/midi-input.svelte';
    import { detectChords } from '../lib/chords';
    import ResetNotesButton from '../common/reset-notes-button.svelte';
    import ImportExportButton from '../common/import-export-button.svelte';
    import { localStorageAddRecording } from '../lib/localstorage';
    import HistoryButton from '../common/history-button.svelte';
    import example from '../example-recordings/chord-arpeggio-timing.json';
    import ExerciseDrawer from '../common/exercise-drawer.svelte';
    import RatingButton from '../common/rating-button.svelte';
    import ShareConfigButton from '../common/share-config-button.svelte';
    import MetronomeButton from '../common/metronome-button.svelte';
    import TempoInput from '../common/tempo-input.svelte';
    import FileDropTarget from '../common/file-drop-target.svelte';
    import NumberInput from '../common/number-input.svelte';

    /**
     * contains the app meta information defined in App.js
     */
    export let appInfo;

    let width = 900;
    let height = 350;
    let container;
    // settings
    let pastBeats = 10;
    let maxNoteDistance = 0.2;
    let tempo = 90;
    // data
    let firstTimeStamp = 0;
    let notes = [];

    const noteOn = (e) => {
        if (notes.length === 0) {
            firstTimeStamp = e.timestamp;
        }
        const noteInSeconds = (e.timestamp - firstTimeStamp) / 1000;
        const note = {
            // ...e.note,
            number: e.note.number,
            velocity: e.rawVelocity,
            time: noteInSeconds,
            channel: e.message.channel,
        };
        notes.push(note);
        draw();
    };

    const draw = () => {
        const quarter = Utils.bpmToSecondsPerBeat(tempo);

        const maxTime = d3.max(notes, (d) => d.time) / quarter + 0.5;
        const minTime = maxTime - pastBeats;
        // only handle recent notes
        const filtered = notes
            .filter((d) => d.time / quarter > minTime)
            .map((d) => {
                // convert time to beats
                return { ...d, time: d.time / quarter };
            });

        // clustering to chords
        const chords = detectChords(filtered, maxNoteDistance);

        // get extends and gaps
        const chordExtents = chords.map((c) => d3.extent(c, (d) => d.time));
        const chordGaps = chordExtents
            .slice(1)
            .map((d, i) => [chordExtents[i][0], d[0]]);

        // plot
        const plot = Plot.plot({
            insetRight: 10,
            width,
            height,
            marginLeft: 60,
            marginBottom: 0,
            padding: 0,
            x: {
                label: null,
                domain: [minTime, maxTime],
                grid: true,
            },
            y: {
                label: 'MIDI Pitch',
                grid: true,
                reverse: true,
                // domain: d3.range(pitchExtent[0] - 1, pitchExtent[1] + 2),
                // type: 'linear',
                tickFormat: (d) => Midi.MIDI_NOTES[d].label,
            },
            marks: [
                Plot.tickX(filtered, {
                    clip: true,
                    x: 'time',
                    y: 'number',
                    fill: '#ddd',
                    stroke: '#ccc',
                    strokeWidth: 2.5,
                    inset: 4,
                }),
            ],
        });
        // chord durations
        const plot2 = Plot.plot({
            insetRight: 10,
            width,
            height: 40,
            marginLeft: 60,
            marginTop: 0,
            marginBottom: 0,
            padding: 0,
            x: {
                label: null,
                domain: [minTime, maxTime],
                // axis: false,
                grid: true,
            },
            y: {
                ticks: [],
                label: 'durations',
            },
            marks: [
                Plot.link(chordExtents, {
                    clip: true,
                    x1: (d) => d[0],
                    x2: (d) => d[1],
                    y: 0,
                }),
                Plot.text(chordExtents, {
                    clip: true,
                    x: (d) => d[0],
                    y: 0,
                    text: (d, i) => (d[1] - d[0]).toFixed(1),
                    dy: 10,
                    textAnchor: 'start',
                }),
            ],
        });
        // chord gaps
        const plot3 = Plot.plot({
            insetRight: 10,
            width,
            height: 75,
            marginLeft: 60,
            // marginRight: -10,
            marginTop: 0,
            marginBottom: 40,
            padding: 0,
            x: {
                label: 'Time in beats',
                domain: [minTime, maxTime],
                tickSize: 10,
                grid: true,
            },
            y: {
                ticks: [],
                label: 'gaps',
            },
            marks: [
                Plot.link(chordGaps, {
                    clip: true,
                    x1: (d) => d[0],
                    x2: (d) => d[1],
                    y: 0,
                    marker: 'dot',
                }),
                // Plot.tickX(chordGaps, {
                //     clip: true,
                //     x: (d) => d[0],
                //     inset: 4,
                // }),
                Plot.text(chordGaps, {
                    clip: true,
                    x: (d) => (d[0] + d[1]) / 2,
                    y: 0,
                    text: (d, i) => (d[1] - d[0]).toFixed(1),
                    dx: 2,
                    dy: 10,
                    textAnchor: 'middle',
                }),
            ],
        });
        container.textContent = '';
        container.appendChild(plot);
        container.appendChild(plot2);
        container.appendChild(plot3);
    };

    onMount(draw);

    /**
     * Used for exporting and for automatics saving
     */
    const getExportData = () => {
        return {
            pastBeats,
            maxNoteDistance,
            tempo,
            // data
            notes,
        };
    };

    /**
     * Import data from file or example
     */
    const loadData = (json) => {
        saveToStorage();
        pastBeats = json.pastBeats;
        maxNoteDistance = json.maxNoteDistance;
        tempo = json.tempo;
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
            This app helps practicing the timing between chords and between the
            notes in them. Play chords or short arpeggios with pauses inbetween.
            In the visualization below, you can then see how long the time
            between the first and last note of each chord/arpeggio was and how
            much time lies between consecutive chords/arpeggios.
        </p>
        <ExerciseDrawer>
            <p>
                1) Play a chord progression that is tricky for you. Make sure
                the time between each chord and the previous is always roughly
                the same.
            </p>
            <p>
                2) Play an arpeggio of this chord progression (with a pause
                after each).
            </p>
        </ExerciseDrawer>
        <div class="control">
            <TempoInput bind:value="{tempo}" callback="{draw}" />
            <NumberInput
                title="maximum distance between notes such that they still count as beloning to the same chord/arpeggio (in beats)"
                label="max note distance"
                bind:value="{maxNoteDistance}"
                callback="{draw}"
                min="{0.05}"
                max="{5}"
                step="{0.05}"
            />
            <NumberInput
                title="The time in beats that is shown"
                label="beats shown"
                bind:value="{pastBeats}"
                callback="{draw}"
                min="{10}"
                max="{300}"
                step="{10}"
            />
        </div>
        <div class="visualization" bind:this="{container}"></div>
        <div class="control">
            <MetronomeButton {tempo} accent="{4}" />
            <ResetNotesButton bind:notes {saveToStorage} callback="{draw}" />
            <ImportExportButton
                {loadData}
                {getExportData}
                appId="{appInfo.id}"
            />
            <button on:click="{() => loadData(example)}"> example </button>
            <HistoryButton appId="{appInfo.id}" {loadData} />
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
