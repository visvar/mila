<script>
    import { onDestroy, onMount } from 'svelte';
    import * as d3 from 'd3';
    import * as Plot from '@observablehq/plot';
    import { Note } from 'tonal';
    import NoteCountInput from '../common/input-elements/note-count-input.svelte';
    import ResetNotesButton from '../common/input-elements/reset-notes-button.svelte';
    import { clamp } from '../lib/lib';
    import MidiInput from '../common/input-handlers/midi-input.svelte';
    import ImportExportButton from '../common/input-elements/import-export-share-button.svelte';
    import { localStorageAddRecording } from '../lib/localstorage';
    import HistoryButton from '../common/input-elements/history-button.svelte';
    import ExerciseDrawer from '../common/exercise-drawer.svelte';
    import RatingButton from '../common/input-elements/rating-button.svelte';
    import example from '../example-recordings/fretboard-jitter.json';
    import { VELOCITIES_LOGIC } from '../lib/music';
    import MidiReplayButton from '../common/input-elements/midi-replay-button.svelte';
    import FileDropTarget from '../common/file-drop-target.svelte';
    import NumberInput from '../common/input-elements/number-input.svelte';
    import TempoInput from '../common/input-elements/tempo-input.svelte';
    import MetronomeButton from '../common/input-elements/metronome-button.svelte';
    import { Utils } from 'musicvis-lib';

    /**
     * contains the app meta information defined in App.js
     */
    export let appInfo;

    let width = 900;
    const random = () => (Math.random() - 0.5) * 0.4;
    let stringCount = 6;
    let fretCount = 24;
    // E standard tuning, strings start at high E
    let tuningPitches = [64, 59, 55, 50, 45, 40];
    const tuningNotes = tuningPitches.map(Note.fromMidiSharps);
    let container;
    // settings
    let pastNoteCount = 200;
    let tempo = 90;
    let barsPerFacet = 1;
    // data
    let firstTimeStamp = 0;
    let notes = [];

    const noteOn = (e) => {
        if (notes.length === 0) {
            firstTimeStamp = e.timestamp;
        }
        const string = e.message.channel - 1;
        const fret = e.note.number - tuningPitches[string];
        // filter noise
        if (fret < 0 || fret > fretCount) {
            return;
        }
        const noteInSeconds = (e.timestamp - firstTimeStamp) / 1000;
        const note = {
            number: e.note.number,
            velocity: e.rawVelocity,
            time: noteInSeconds,
            channel: e.message.channel,
            string,
            fret,
            // add a little jitter
            stringJitter: string + random(),
            fretJitter: fret + random(),
        };
        notes = [...notes, note];
        draw();
    };

    const draw = () => {
        const data = notes.slice(-pastNoteCount);
        const cellSize = (width - 100) / 25;
        const plot = Plot.plot({
            width,
            // height,
            aspectRatio: 1,
            marginLeft: 50,
            marginBottom: 40,
            padding: 0,
            x: {
                // domain: d3.range(0, fretCount + 1),
                domain: [-1, fretCount + 1.5],
                ticks: d3.range(0, fretCount + 1),
                tickSize: 0,
                label: 'fret',
            },
            y: {
                // domain: d3.range(0, stringCount),
                domain: [stringCount - 0.5, -0.5],
                tickFormat: (d) => tuningNotes[d],
                tickSize: 0,
                label: 'string',
            },
            color: {
                legend: true,
                marginLeft: 300,
                width: 550,
                scheme: 'viridis',
                reverse: true,
                domain: [0, pastNoteCount],
                label: 'note index: old (yellow) to new (purple)',
            },
            r: {
                domain: [0, 127],
                range: [0, 5],
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
                // note scatterplot
                Plot.dot(data, {
                    x: 'fretJitter',
                    y: 'stringJitter',
                    // dy: cellSize / 2,
                    fill: (d, i) => i,
                    stroke: '#888',
                    strokeWidth: 0.5,
                    r: 'velocity',
                    opacity: 0.5,
                    tip: true,
                    title: (d) =>
                        `string: ${tuningNotes[d.string]}\nfret: ${d.fret}\nloudness: ${(d.velocity / 127).toFixed(2)}\ntime: ${d.time.toFixed(1)} s`,
                }),
            ],
        });

        // area legend
        const legendTicks = [...VELOCITIES_LOGIC.keys()].map((d) => d / 127);
        const legend = Plot.plot({
            // subtitle: 'loudness',
            width: width,
            height: 47,
            marginTop: 0,
            marginLeft: width * 0.35,
            marginRight: width * 0.35,
            marginBottom: 30,
            x: {
                label: 'loudness',
                labelAnchor: 'center',
                ticks: legendTicks,
                tickSize: 0,
                tickPadding: 3,
                tickFormat: (d, i) => [...VELOCITIES_LOGIC.values()][i],
            },
            marks: [
                Plot.dotX(legendTicks, {
                    x: (d, i) => d,
                    fill: '#888',
                    r: (d) => d,
                }),
            ],
        });

        container.textContent = '';
        container.appendChild(plot);
        container.appendChild(legend);

        // TODO: small multiples
        const facetDuration =
            Utils.bpmToSecondsPerBeat(tempo) * 4 * barsPerFacet;
        const plotMultiples = Plot.plot({
            width,
            aspectRatio: 1,
            // marginLeft: 50,
            // marginBottom: 40,
            // padding: 10,
            x: {
                domain: [-1, fretCount + 1.5],
                // ticks: d3.range(0, fretCount + 1),
                ticks: [0, 3, 5, 7, 9, 12, 15, 17, 19, 21],
                tickSize: 0,
                label: 'fret',
            },
            y: {
                // domain: d3.range(0, stringCount),
                domain: [stringCount - 0.5, -0.5],
                ticks: d3.range(stringCount),
                tickFormat: (d) => tuningNotes[d],
                tickSize: 0,
                label: 'string',
            },
            color: {
                scheme: 'viridis',
                reverse: true,
                domain: [0, facetDuration],
                label: 'note index: old (yellow) to new (purple)',
            },
            r: {
                domain: [0, 127],
                range: [0, 2.5],
            },
            fx: { ticks: [] },
            fy: {
                tickFormat: (d) =>
                    `bar\n${d * 2 * barsPerFacet + 1} - ${(d + 1) * 2 * barsPerFacet}`,
            },
            marks: [
                // frets
                Plot.ruleX(d3.range(0, fretCount + 1), {
                    stroke: '#ddd',
                    dx: cellSize / 4,
                }),
                // strings
                Plot.ruleY(d3.range(0, stringCount), {
                    stroke: '#ddd',
                }),
                // inlay dots
                Plot.dot([3, 5, 7, 9, 15, 17, 19, 21], {
                    x: (d) => d,
                    y: 2,
                    dy: cellSize / 4,
                    fill: '#ddd',
                    r: 4,
                }),
                Plot.dot([12, 12, 24, 24], {
                    x: (d) => d,
                    y: (d, i) => (i % 2 === 0 ? 1 : 3),
                    dy: cellSize / 4,
                    fill: '#ddd',
                    r: 4,
                }),
                // note scatterplot
                Plot.dot(notes, {
                    // 2xN grid, ie two-columns
                    fy: (d) => Math.floor(d.time / facetDuration / 2),
                    fx: (d) => Math.floor(d.time / facetDuration) % 2,
                    x: 'fretJitter',
                    y: 'stringJitter',
                    fill: (d, i) => d.time % facetDuration,
                    // fill: '#000000bb',
                    stroke: '#888',
                    strokeWidth: 0.5,
                    r: 'velocity',
                    opacity: 0.8,
                    tip: true,
                    title: (d) =>
                        `string: ${tuningNotes[d.string]}\nfret: ${d.fret}\nloudness: ${(d.velocity / 127).toFixed(2)}\ntime: ${d.time.toFixed(1)} s`,
                }),
            ],
        });
        container.appendChild(plotMultiples);
    };

    onMount(draw);

    /**
     * Used for exporting and for automatics saving
     */
    const getExportData = () => {
        return {
            pastNoteCount,
            tempo,
            barsPerFacet,
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
        tempo = json.tempo ?? 120;
        barsPerFacet = json.barsPerFacet ?? 1;
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
            This app helps practicing improvisation on a guitar. The fretboard
            below shows you where you played notes. Each note is a dot that is
            moved a little bit from its exact position to avoid overlap. A
            note's color indicates how recently you played it and its area tells
            how loud it was played.
        </p>
        <div class="control">
            <NoteCountInput bind:value="{pastNoteCount}" callback="{draw}" />
            <TempoInput
                label="tempo"
                title="If you set the correct tempo, each facet of the lower chart will show N bars you played"
                bind:value="{tempo}"
                callback="{draw}"
            />
            <NumberInput
                title="Set the number of bars contained within each facet of the lower chart"
                label="bars per facet"
                bind:value="{barsPerFacet}"
                callback="{draw}"
                min="{1}"
                max="{20}"
                step="{1}"
            />
            <button
                on:click="{() =>
                    noteOn({
                        note: { number: 82 },
                        timestamp: performance.now(),
                        rawVelocity: 127,
                        message: { channel: 1 },
                    })}">add note</button
            >
        </div>
        <div class="visualization" bind:this="{container}"></div>
        <div class="control">
            <MetronomeButton
                {tempo}
                accent="{4}"
                beepCount="{8}"
                showBeepCountInput
            />
            <ResetNotesButton bind:notes {saveToStorage} callback="{draw}" />
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
        <RatingButton appId="{appInfo.id}" />
        <MidiInput {noteOn} />
    </main>
</FileDropTarget>
