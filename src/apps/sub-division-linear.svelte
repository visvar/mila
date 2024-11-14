<script>
    import { onDestroy, onMount } from 'svelte';
    import { Utils } from 'musicvis-lib';
    import * as Plot from '@observablehq/plot';
    import * as kde from 'fast-kde';
    import * as d3 from 'd3';
    import MetronomeButton from '../common/input-elements/metronome-button.svelte';
    import TempoInput from '../common/input-elements/tempo-input.svelte';
    import ResetNotesButton from '../common/input-elements/reset-notes-button.svelte';
    import { clamp, computeSubdivisionOkScore } from '../lib/lib';
    import { BIN_NOTES, GRIDS } from '../lib/music';
    import PcKeyboardInput from '../common/input-handlers/pc-keyboard-input.svelte';
    import MidiInput from '../common/input-handlers/midi-input.svelte';
    import example from '../example-recordings/sub-division-linear.json';
    import ImportExportButton from '../common/input-elements/import-export-share-button.svelte';
    import { localStorageAddRecording } from '../lib/localstorage';
    import HistoryButton from '../common/input-elements/history-button.svelte';
    import TouchInput from '../common/input-handlers/touch-input.svelte';
    import ExerciseDrawer from '../common/exercise-drawer.svelte';
    import { COLORS } from '../lib/colors';
    import RatingButton from '../common/input-elements/rating-button.svelte';
    import SubDivisionAdjustButton from '../common/input-elements/sub-division-adjust-button.svelte';
    import UndoRedoButton from '../common/input-elements/undo-redo-button.svelte';
    import NumberInput from '../common/input-elements/number-input.svelte';
    import SelectScollable from '../common/input-elements/select-scollable.svelte';
    import MidiReplayButton from '../common/input-elements/midi-replay-button.svelte';
    import ToggleButton from '../common/input-elements/toggle-button.svelte';
    import FileDropTarget from '../common/file-drop-target.svelte';
    import InsideTextButton from '../common/input-elements/inside-text-button.svelte';
    import Accents from './accents.svelte';

    /**
     * contains the app meta information defined in App.js
     */
    export let appInfo;

    $: width =
        window.innerWidth < 1200 ? 900 : Math.floor(window.innerWidth - 200);
    let container;
    // settings
    let tempo = 120;
    let grid = GRIDS[0].divisions;
    let binNote = 64;
    let adjustTime = 0;
    let pastBars = 8;
    let showLoudness = false;
    let showBarScores = false;
    // data
    let firstTimeStamp = 0;
    let notes = [];
    let okScore = '';

    const noteOn = (e) => {
        if (notes.length === 0) {
            firstTimeStamp = e.timestamp;
        }
        const noteInSeconds = (e.timestamp - firstTimeStamp) / 1000;
        const note = {
            time: noteInSeconds,
            velocity: e.velocity,
        };
        notes = [...notes, note];
        draw();
    };

    /**
     * Allow controlling vis with a MIDI knob
     * @param e MIDI controllchange event
     */
    const controlChange = (e) => {
        const c = e.controller.number;
        if (c === 14) {
            // tempo
            tempo = clamp(e.rawValue, 0, 120) + 60;
        } else if (c === 15) {
            // grid
            grid =
                GRIDS[clamp(Math.floor(e.rawValue / 5), 0, GRIDS.length - 1)];
        } else if (c === 16) {
            // binning
            binNote =
                BIN_NOTES[
                    clamp(Math.floor(e.rawValue / 5), 0, BIN_NOTES.length - 1)
                ];
        } else if (c === 17) {
            // adjust
            adjustTime = (clamp(e.rawValue, 0, 100) - 50) / 100;
        }
        draw();
    };

    const draw = () => {
        const [grid1, grid2] = grid.split(':').map((d) => +d);
        const quarter = Utils.bpmToSecondsPerBeat(tempo);
        const notesInBeats = notes.map((d) => {
            const time = (d.time + adjustTime) / quarter;
            return { ...d, time };
        });
        const maxBar = Math.ceil((notesInBeats.at(-1)?.time ?? 0) / grid1);
        const clamped = notesInBeats.map((d) => {
            return { ...d, time: d.time % grid1 };
        });

        // KDE
        let kdePoints = [];
        if (clamped.length > 0) {
            let bandwidth = 4 / binNote;
            let pad = 1;
            let bins = Math.floor(width / 2);
            const density1d = kde.density1d(
                clamped.map((d) => d.time),
                {
                    bandwidth,
                    pad,
                    bins,
                    extent: [0, grid1],
                },
            );
            kdePoints = density1d.bandwidth(bandwidth);
        }

        const coarseGrid = d3.range(0, grid1 + 1, 1);
        const fineGrid = d3.range(0, grid1, 1 / grid2);
        const gridLines = [
            Plot.tickX(fineGrid, {
                stroke: '#888',
            }),
            Plot.tickX(coarseGrid, {
                stroke: '#888',
                strokeWidth: 3,
            }),
        ];

        const plotOptions = {
            width,
            height: 100,
            marginTop: 0,
            marginLeft: 40,
            marginBottom: 10,
            padding: 0,
            x: {
                label: null,
                domain: [0, grid1],
                ticks: [],
            },
            y: {
                axis: false,
            },
        };

        const histoPlot = Plot.plot({
            ...plotOptions,
            marks: [
                Plot.rectY(
                    clamped,
                    Plot.binX(
                        { y: 'count' },
                        {
                            x: 'time',
                            fill: '#ccc',
                            thresholds: d3.range(0, grid1 + 1, 4 / binNote),
                        },
                    ),
                ),
                Plot.ruleY([0]),
                ...gridLines,
            ],
        });
        const kdePlot = Plot.plot({
            ...plotOptions,
            marks: [
                Plot.areaY(kdePoints, {
                    x: 'x',
                    y: 'y',
                    fill: (d) => COLORS.accent,
                    clip: true,
                }),
                Plot.ruleY([0]),
                ...gridLines,
            ],
        });

        const tickPlotSum = Plot.plot({
            ...plotOptions,
            height: 50,
            marginBottom: 30,
            x: {
                ticks: [...fineGrid, grid1],
                label: 'time in beats',
                domain: [0, grid1],
            },
            marks: [
                // ticks
                Plot.tickX(clamped, {
                    x: 'time',
                    stroke: '#0002',
                    clip: true,
                }),
            ],
        });

        const tickPlotRows = Plot.plot({
            ...plotOptions,
            height: 180,
            marginBottom: 30,
            x: {
                ticks: [...fineGrid, grid1],
                label: 'time in beats',
                domain: [0, grid1],
            },
            y: {
                domain: d3.range(maxBar - pastBars, maxBar),
                tickFormat: (d) => d + 1,
                label: 'recent bars',
            },
            marks: [
                // ticks
                Plot.tickX(notesInBeats, {
                    x: (d) => d.time % grid1,
                    y: (d, i) => Math.floor(d.time / grid1),
                    // stroke: '#0002',
                    strokeWidth: showLoudness ? (d) => d.velocity * 4 : 1,
                    clip: true,
                }),
                // OK areas
                Plot.tickX([...fineGrid, grid1], {
                    x: (d) => d,
                    stroke: '#ccc',
                    opacity: 0.7,
                    clip: true,
                    strokeWidth: (width / binNote) * 2,
                }),
            ],
        });

        container.textContent = '';
        container.appendChild(histoPlot);
        container.appendChild(kdePlot);
        container.appendChild(tickPlotSum);
        container.appendChild(tickPlotRows);

        // show how many notes are within the OK areas
        if (notes.length > 0) {
            const score = computeSubdivisionOkScore(
                notes.map((d) => d.time),
                grid,
                tempo,
                binNote,
                adjustTime,
            );
            const percent = ((score / notes.length) * 100).toFixed();
            okScore = `${percent}% of notes are within the gray areas`;
        }

        // percentage over bars
        if (showBarScores) {
            const byBar = d3.groups(notes, (d) => Math.floor(d.time / grid1));
            const scores = byBar.map(([bar, barNotes]) => {
                const score = computeSubdivisionOkScore(
                    barNotes.map((d) => d.time),
                    grid,
                    tempo,
                    binNote,
                    adjustTime,
                );
                return (score / barNotes.length) * 100;
            });
            const scorePlot = Plot.plot({
                width,
                height: 110,
                x: {
                    label: 'bar',
                    domain: d3.range(maxBar - pastBars, maxBar),
                    tickFormat: (d) => d + 1,
                },
                y: {
                    label: 'percent of notes in gray areas, per bar',
                    domain: [0, 100],
                },
                marks: [
                    Plot.rectY(scores, {
                        y: Plot.identity,
                        x: (d, i) => i,
                        fill: 'var(--accent)',
                    }),
                    Plot.ruleY([0]),
                    Plot.ruleY([100]),
                ],
            });
            container.appendChild(scorePlot);
        }
    };

    onMount(draw);

    /**
     * Used for exporting and for automatics saving
     */
    const getExportData = () => {
        return {
            tempo,
            grid,
            binNote,
            adjustTime,
            pastBars,
            showLoudness,
            showBarScores,
            // data
            notes,
        };
    };

    const loadData = (json) => {
        saveToStorage();
        tempo = json.tempo;
        grid = json.grid;
        binNote = json.binNote;
        adjustTime = json.adjustTime;
        pastBars = json.pastBars;
        showLoudness = json.showLoudness ?? false;
        showBarScores = json.showBarScores ?? false;
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
            This app helps practicing beat sub-divisions such as eighths or
            triplets. Choose your tempo and subdivision, and start playing. The
            bar and area charts will show you a summary of when you played
            notes. Use the integrated metronome. All notes will be timed
            relative to the first one, but you can adjust all notes to make them
            earlier or later in case you messed up the first. The last few bars
            you play will be shown in a row below.<br />
            <i>
                Try playing without looking and focus on the metronome. Try to
                play all notes such that they are within a gray area!
            </i>
        </p>
        <div class="control">
            <TempoInput bind:value="{tempo}" callback="{draw}" />
            <SelectScollable
                label="grid"
                title="The whole width is one bar, you can choose to divide it by 3 or 4 quarter notes and then further sub-divide it into, for example, triplets"
                bind:value="{grid}"
                callback="{draw}"
            >
                {#each GRIDS as g}
                    <option value="{g.divisions}">{g.label}</option>
                {/each}
            </SelectScollable>
            <SelectScollable
                label="binning"
                title="The width of each bar in rhythmic units. For example, each bin could be a 32nd note wide."
                bind:value="{binNote}"
                callback="{draw}"
            >
                {#each BIN_NOTES as g}
                    <option value="{g}">1/{g} note</option>
                {/each}
            </SelectScollable>
        </div>
        <div class="control">
            <SubDivisionAdjustButton
                bind:adjustTime
                {tempo}
                {grid}
                notes="{notes.map((d) => d.time)}"
                {draw}
            />
            <NumberInput
                title="The number of most recent bars that are shown in the rows at the bottom."
                label="past bars"
                bind:value="{pastBars}"
                callback="{draw}"
                step="{1}"
                min="{8}"
                max="{32}"
            />
            <ToggleButton
                label="bar scores"
                title="Show scores (percentage of notes within gray areas) per bar"
                bind:checked="{showBarScores}"
                callback="{draw}"
            />
            <ToggleButton
                label="loudness"
                title="Show loudness in the note tick width, for example to see if you set accents correctly"
                bind:checked="{showLoudness}"
                callback="{draw}"
            />
        </div>
        <div class="visualization" bind:this="{container}"></div>
        <div>{okScore}</div>
        <div class="control">
            <MetronomeButton {tempo} accent="{+grid.split(':')[0]}" />
            <UndoRedoButton bind:data="{notes}" callback="{draw}" />
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
            <p>
                1) Play triplets.
                <InsideTextButton onclick="{() => loadData(example)}">
                    example
                </InsideTextButton>
            </p>
            <p>
                2) Switch back and forth between a half bar of eighths and a
                half bar of triplets.
            </p>
            <p>
                3) Play a swing feel, where you shift every second note a bit
                late. Try to do this consistently!
            </p>
        </ExerciseDrawer>
        <RatingButton appId="{appInfo.id}" />
        <PcKeyboardInput
            key=" "
            keyDown="{() =>
                noteOn({ timestamp: performance.now(), velocity: 0.5 })}"
        />
        <TouchInput
            element="{container}"
            touchStart="{() =>
                noteOn({ timestamp: performance.now(), velocity: 0.5 })}"
        />
        <MidiInput {noteOn} {controlChange} />
    </main>
</FileDropTarget>
