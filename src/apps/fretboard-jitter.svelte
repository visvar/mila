<script>
    import { afterUpdate, onDestroy, onMount } from 'svelte';
    import * as d3 from 'd3';
    import * as Plot from '@observablehq/plot';
    import { Note } from 'tonal';
    import NoteCountInput from '../common/input-elements/note-count-input.svelte';
    import ResetNotesButton from '../common/input-elements/reset-notes-button.svelte';
    import MidiInput from '../common/input-handlers/midi-input.svelte';
    import ImportExportButton from '../common/input-elements/import-export-share-button.svelte';
    import { localStorageAddRecording } from '../lib/localstorage';
    import HistoryButton from '../common/input-elements/history-button.svelte';
    import ExerciseDrawer from '../common/exercise-drawer.svelte';
    import RatingButton from '../common/input-elements/rating-button.svelte';
    import exampleStaying from '../example-recordings/fretboard-jitter/fretboard-jitter-staying-in-default.json';
    import exampleHopping from '../example-recordings/fretboard-jitter/fretboard-jitter-hopping-between-positions.json';
    import exampleVaried from '../example-recordings/fretboard-jitter/fretboard-jitter-strongly-varied.json';
    import { VELOCITIES_LOGIC } from '../lib/music';
    import MidiReplayButton from '../common/input-elements/midi-replay-button.svelte';
    import FileDropTarget from '../common/file-drop-target.svelte';
    import NumberInput from '../common/input-elements/number-input.svelte';
    import TempoInput from '../common/input-elements/tempo-input.svelte';
    import MetronomeButton from '../common/input-elements/metronome-button.svelte';
    import { Utils } from 'musicvis-lib';
    import { NOTE_COLORS } from '../lib/colors';
    import ToggleButton from '../common/input-elements/toggle-button.svelte';
    import InsideTextButton from '../common/input-elements/inside-text-button.svelte';

    /**
     * contains the app meta information defined in App.js
     */
    export let appInfo;

    // width of main vis
    let widthMain = 900;
    // width of facetted vis
    let windowWidth = window.innerWidth;
    $: width = windowWidth < 1200 ? 900 : Math.floor(windowWidth - 200);
    const random = () => (Math.random() - 0.5) * 0.4;
    let stringCount = 6;
    let fretCount = 24;
    // E standard tuning, strings start at high E
    let tuningPitches = [64, 59, 55, 50, 45, 40];
    const tuningNotes = tuningPitches.map(Note.fromMidiSharps);
    let containerMain;
    let containerFacets;
    // settings
    let pastNoteCount = 200;
    let tempo = 90;
    let barsPerFacet = 1;
    let facetColumns = 4;
    let colorFacetsByFret = true;
    // data
    let firstTimeStamp = 0;
    let notes = [];
    // app state
    let isPlaying;
    let isDataLoaded = false;

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
    };

    const draw = () => {
        const fretTicks = [0, 3, 5, 7, 9, 12, 15, 17, 19, 21, 24];
        const data = notes.slice(-pastNoteCount);
        const plot = Plot.plot({
            width: widthMain,
            // height,
            aspectRatio: 1,
            marginLeft: 30,
            marginBottom: 40,
            padding: 0,
            x: {
                // domain: d3.range(0, fretCount + 1),
                domain: [-1, fretCount + 1.5],
                ticks: fretTicks,
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
                scheme: 'viridis',
                reverse: true,
                domain: [0, pastNoteCount],
            },
            r: {
                domain: [0, 127],
                range: [0, 5],
            },
            marks: [
                // frets
                Plot.ruleX(d3.range(0, fretCount + 1), {
                    x: (d) => d + 0.5,
                    stroke: '#ddd',
                }),
                // strings
                Plot.ruleY(d3.range(0, stringCount), {
                    stroke: '#ddd',
                    strokeWidth: (d) => Math.sqrt(d + 1),
                }),
                // inlay dots
                Plot.dot([3, 5, 7, 9, 15, 17, 19, 21], {
                    x: (d) => d,
                    y: 2.5,
                    fill: '#ddd',
                    r: 8,
                }),
                Plot.dot([12, 12, 24, 24], {
                    x: (d) => d,
                    y: (d, i) => (i % 2 === 0 ? 1.5 : 3.5),
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

        const colorLegend = Plot.plot({
            width: widthMain,
            height: 0,
            marginLeft: 30,
            marginBottom: 0,
            padding: 0,
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
            marks: [],
        });

        // area legend
        const legendTicks = [...VELOCITIES_LOGIC.keys()].map((d) => d / 127);
        const legend = Plot.plot({
            // subtitle: 'loudness',
            width: widthMain,
            height: 47,
            marginTop: 0,
            marginLeft: widthMain * 0.35,
            marginRight: widthMain * 0.35,
            marginBottom: 30,
            x: {
                label: 'loudness',
                labelAnchor: 'center',
                ticks: legendTicks,
                tickSize: 0,
                tickPadding: 3,
                tickFormat: (d, i) => [...VELOCITIES_LOGIC.values()][i],
            },
            y: {
                labelAnchor: 'center',
            },
            marks: [
                Plot.dotX(legendTicks, {
                    x: (d, i) => d,
                    fill: '#888',
                    r: (d) => d,
                }),
            ],
        });

        containerMain.textContent = '';
        containerMain.appendChild(colorLegend);
        containerMain.appendChild(legend);
        containerMain.appendChild(plot);

        // small multiples
        const facetDuration =
            Utils.bpmToSecondsPerBeat(tempo) * 4 * barsPerFacet;
        let color;
        if (colorFacetsByFret) {
            // color encodes fret, repeats at 12
            color = {
                domain: d3.range(0, 25),
                range: [
                    ...NOTE_COLORS.noteColormap,
                    ...NOTE_COLORS.noteColormap,
                ],
                // legend: true,
            };
        } else {
            // same as main plot
            color = {
                scheme: 'viridis',
                reverse: true,
                domain: [0, facetDuration],
            };
        }
        const inlayRadius = ((8 / facetColumns) * width) / widthMain;
        const plotMultiples = Plot.plot({
            width,
            aspectRatio: 1,
            // marginLeft: 50,
            // marginBottom: 40,
            // padding: 10,
            x: {
                domain: [-1, fretCount + 1.5],
                // ticks: d3.range(0, fretCount + 1),
                ticks: fretTicks,
                tickSize: 0,
                label: 'fret',
            },
            y: {
                domain: [stringCount - 0.5, -0.5],
                ticks: d3.range(stringCount),
                tickFormat: (d) => tuningNotes[d],
                tickSize: 0,
                label: 'string',
            },
            color,
            r: {
                domain: [0, 127],
                // range: [0, 2.5],
                range: [0, facetColumns === 1 ? 5 : 3],
            },
            fx: { ticks: [] },
            fy: {
                tickFormat: (d) =>
                    `bar\n${d * facetColumns * barsPerFacet + 1} - ${(d + 1) * facetColumns * barsPerFacet}`,
            },
            marks: [
                // frets
                Plot.ruleX(d3.range(0, fretCount + 1), {
                    x: (d) => d + 0.5,
                    stroke: '#ddd',
                }),
                // strings
                Plot.ruleY(d3.range(0, stringCount), {
                    stroke: '#ddd',
                }),
                // inlay dots
                Plot.dot([3, 5, 7, 9, 15, 17, 19, 21], {
                    x: (d) => d,
                    y: 2.5,
                    fill: '#ddd',
                    r: inlayRadius,
                }),
                Plot.dot([12, 12, 24, 24], {
                    x: (d) => d,
                    y: (d, i) => (i % 2 === 0 ? 1.5 : 3.5),
                    fill: '#ddd',
                    r: inlayRadius,
                }),
                // note scatterplot
                Plot.dot(notes, {
                    // 2xN grid, ie two-columns
                    fy: (d) =>
                        Math.floor(d.time / facetDuration / facetColumns),
                    fx: (d) =>
                        Math.floor(d.time / facetDuration) % facetColumns,
                    x: 'fretJitter',
                    y: 'stringJitter',
                    fill: colorFacetsByFret
                        ? (d) => d.fret
                        : (d, i) => d.time % facetDuration,
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
        containerFacets.textContent = '';
        containerFacets.appendChild(plotMultiples);
    };

    afterUpdate(draw);

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
        // app state
        isDataLoaded = true;
    };

    const saveToStorage = () => {
        if (!isDataLoaded && !isPlaying && notes.length > 0) {
            localStorageAddRecording(appInfo.id, getExportData());
        }
    };

    onDestroy(saveToStorage);
</script>

<svelte:window bind:innerWidth="{windowWidth}" />

<FileDropTarget {loadData} disabled="{isPlaying}">
    <main class="app">
        <h2>{appInfo.title}</h2>
        <p class="explanation">
            This app helps practicing improvisation on a guitar. The fretboard
            below shows you where you played notes. Each note is a dot that is
            moved a little bit from its exact position to avoid overlap. A
            note's color indicates how recently you played it and its area tells
            how loud it was played. Below, facets show each bar you played in a
            separate plot. Here, the color shows which fret the note was played
            at, so you can see whether you cling to the same few positions too
            much.
        </p>
        <div class="control">
            <NoteCountInput bind:value="{pastNoteCount}" max="{1000}" />
            <TempoInput
                label="tempo"
                title="If you set the correct tempo, each facet of the lower chart will show N bars you played"
                bind:value="{tempo}"
                disabled="{isPlaying}"
            />
        </div>
        <div class="control">
            <NumberInput
                title="Set the number of bars contained within each facet of the lower chart"
                label="bars per facet"
                bind:value="{barsPerFacet}"
                min="{1}"
                max="{20}"
                step="{1}"
                defaultValue="{1}"
            />
            <NumberInput
                title="Set the number of columns for the small multiples"
                label="columns"
                bind:value="{facetColumns}"
                min="{1}"
                max="{8}"
                step="{1}"
                defaultValue="{2}"
            />
            <ToggleButton
                label="color by fret"
                title="Color small multiples below by fret instead of time"
                bind:checked="{colorFacetsByFret}"
            />
        </div>
        <div
            class="visualization"
            bind:this="{containerMain}"
            style="{`width: ${widthMain}px; margin: auto;`}"
        ></div>
        <div class="visualization" bind:this="{containerFacets}"></div>
        <div class="control">
            <MetronomeButton
                {tempo}
                accent="{4}"
                beepCount="{0}"
                showBeepCountInput
                disabled="{isPlaying}"
            />
            <ResetNotesButton
                bind:notes
                bind:isDataLoaded
                disabled="{isPlaying}"
                {saveToStorage}
            />
            <HistoryButton
                appId="{appInfo.id}"
                {loadData}
                disabled="{isPlaying}"
            />
            <MidiReplayButton bind:notes bind:isPlaying callback="{draw}" />
            <ImportExportButton
                {loadData}
                {getExportData}
                appId="{appInfo.id}"
                disabled="{isPlaying}"
            />
        </div>
        <ExerciseDrawer>
            <p>
                1) Improvise in one position (avoid this when more advanced).
                <InsideTextButton
                    onclick="{() => loadData(exampleStaying)}"
                    disabled="{isPlaying}"
                >
                    example
                </InsideTextButton>
            </p>
            <p>
                2) Change between positions.
                <InsideTextButton
                    onclick="{() => loadData(exampleHopping)}"
                    disabled="{isPlaying}"
                >
                    example
                </InsideTextButton>
            </p>
            <p>
                3) Switch between more horizontal and vertical playing.
                <InsideTextButton
                    onclick="{() => loadData(exampleVaried)}"
                    disabled="{isPlaying}"
                >
                    example
                </InsideTextButton>
            </p>
        </ExerciseDrawer>
        <RatingButton appId="{appInfo.id}" />
        <MidiInput {noteOn} disabled="{isDataLoaded || isPlaying}" />
    </main>
</FileDropTarget>
