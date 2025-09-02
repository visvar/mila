<script>
    import { afterUpdate, onDestroy } from 'svelte';
    import { Utils } from 'musicvis-lib';
    import * as Plot from '@observablehq/plot';
    import * as kde from 'fast-kde';
    import * as d3 from 'd3';
    import MetronomeButton from '../common/input-elements/metronome-button.svelte';
    import TempoInput from '../common/input-elements/tempo-input.svelte';
    import ResetNotesButton from '../common/input-elements/reset-notes-button.svelte';
    import { computeSubdivisionOkScoreBeats, roundToStep } from '../lib/lib';
    import { BIN_NOTES, GRIDS } from '../lib/music';
    import PcKeyboardInput from '../common/input-handlers/pc-keyboard-input.svelte';
    import MidiInput from '../common/input-handlers/midi-input.svelte';
    import example from '../example-recordings/sub-division-linear/sub-division-linear.json';
    import exampleFillImprecise from '../example-recordings/sub-division-linear/sub-division-linear-drums-fill-imprecise.json';
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
    import PageResizeHandler from '../common/input-handlers/page-resize-handler.svelte';
    import SubDivisionSimulator from '../common/testing/sub-division-simulator.svelte';

    /**
     * contains the app meta information defined in App.js
     */
    export let appInfo;

    let windowWidth = window.innerWidth;
    $: width = windowWidth < 1200 ? 900 : Math.floor(windowWidth - 200);
    let container;
    // settings
    let tempo = 120;
    let grid = GRIDS[0].divisions;
    let bars = 1;
    let binNote = 64;
    let adjustTime = 0;
    let pastBars = 8;
    let showLoudness = false;
    let showBarScores = true;
    let combineBars = false;
    let showTolerance = true;
    // data
    let firstTimeStamp = 0;
    let notes = [];
    let okScore = '';
    // app state
    let isPlaying;
    let isDataLoaded = false;

    const noteOn = (e) => {
        if (notes.length === 0) {
            firstTimeStamp = e.timestamp;
        }
        const noteInSeconds = (e.timestamp - firstTimeStamp) / 1000;
        const note = {
            time: noteInSeconds,
            velocity: e.velocity,
            number: e.note.number,
        };
        notes = [...notes, note];
    };

    const draw = () => {
        let [grid1, grid2] = grid.split(':').map((d) => +d);
        const beats = grid1 * bars;
        const quarter = Utils.bpmToSecondsPerBeat(tempo);
        const notesInBeats = notes.map((d) => {
            const time = (d.time + adjustTime) / quarter;
            return { ...d, time };
        });
        const maxBar = Math.ceil((notesInBeats.at(-1)?.time ?? 0) / beats);
        const clamped = notesInBeats.map((d) => {
            return { ...d, time: d.time % beats };
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
                    extent: [0, beats],
                },
            );
            kdePoints = density1d.bandwidth(bandwidth);
        }

        const coarseGrid = d3.range(0, beats + 1, 1);
        const fineGrid = d3.range(0, beats, 1 / grid2);
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
            height: 80,
            marginTop: 0,
            marginLeft: 40,
            marginRight: 10,
            marginBottom: 10,
            padding: 0,
            x: {
                label: null,
                domain: [0, beats],
                ticks: [],
            },
            y: {
                axis: false,
            },
        };

        const labeledTicks = new Set([...coarseGrid, beats]);
        const x = {
            label: 'time in beats',
            domain: [0, beats],
            // ticks: [...coarseGrid, beats],
            // tickFormat: (d) => (d % grid1) + 1,
            ticks: [...fineGrid, beats],
            tickFormat: (d) => {
                const beatInBar = d % grid1;
                if (labeledTicks.has(d)) {
                    return beatInBar + 1;
                }
                return '';
            },
        };

        // ticks without transparency
        // TODO: delete
        const tickPlotSum2 = Plot.plot({
            ...plotOptions,
            height: 60,
            marginTop: 30,
            marginBottom: 10,
            x,
            marks: [
                Plot.axisX({
                    anchor: 'top',
                    ...x,
                }),
                // ticks
                Plot.tickX(clamped, {
                    x: 'time',
                    strokeWidth: 1.5,
                    clip: true,
                }),
            ],
        });

        // overlayed ticks with transparency
        const tickPlotSum = Plot.plot({
            ...plotOptions,
            height: 60,
            marginTop: 30,
            marginBottom: 10,
            x,
            marks: [
                Plot.axisX({
                    anchor: 'top',
                    ...x,
                }),
                // ticks
                Plot.tickX(clamped, {
                    x: 'time',
                    stroke: '#0002',
                    strokeWidth: 1.5,
                    clip: true,
                }),
            ],
        });

        // histogram
        const binSize = 4 / binNote;
        let thresholds = d3.range(0, beats + 1, binSize);
        if (combineBars) {
            // combine the bars left and right of the perfect timing, to avoid showing notes as too early/late instead of the more meaningful 'good enough'
            thresholds = thresholds.filter((d) =>
                d3.min(fineGrid, (g) => Math.abs(d - g) >= binSize * 0.9),
            );
        }
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
                            thresholds,
                            tip: true,
                        },
                    ),
                ),
                ...gridLines,
                Plot.ruleY([0]),
            ],
        });
        const kdePlot = Plot.plot({
            ...plotOptions,
            marks: [
                Plot.areaY(kdePoints, {
                    x: 'x',
                    y: 'y',
                    fill: COLORS.accent,
                    clip: true,
                }),
                ...gridLines,
                Plot.ruleY([0]),
            ],
        });

        // tick rows
        let step;
        if (pastBars < 20) {
            step = 1;
        } else if (pastBars < 50) {
            step = 5;
        } else if (pastBars < 100) {
            step = 10;
        } else {
            step = 20;
        }
        const axisTicks = d3.range(
            roundToStep(maxBar - pastBars, step) - 1,
            maxBar,
            step,
        );
        const innerWidth =
            width - plotOptions.marginLeft - plotOptions.marginRight;
        const tickPlotRows = Plot.plot({
            ...plotOptions,
            height: 180,
            marginBottom: 30,
            x,
            y: {
                label: 'recent repetitions',
                domain: d3.range(maxBar - pastBars, maxBar),
                ticks: axisTicks,
                tickFormat: (d) => d + 1,
                // pastBars < 20
                //     ? (d) => d + 1
                //     : pastBars < 50
                //       ? (d) => ((d + 1) % 5 === 0 ? d + 1 : '')
                //       : (d) => ((d + 1) % 10 === 0 ? d + 1 : ''),
            },
            marks: [
                // ticks
                Plot.tickX(notesInBeats, {
                    x: (d) => d.time % beats,
                    y: (d, i) => Math.floor(d.time / beats),
                    // stroke: '#0002',
                    strokeWidth: showLoudness ? (d) => d.velocity * 4 : 1,
                    clip: true,
                }),
                // OK areas
                showTolerance
                    ? Plot.tickX([...fineGrid, beats], {
                          x: (d) => d,
                          stroke: '#ccc',
                          opacity: 0.7,
                          clip: true,
                          strokeWidth: (innerWidth / binNote / (beats / 4)) * 2,
                      })
                    : null,
            ],
        });

        container.textContent = '';
        container.appendChild(tickPlotSum2);
        container.appendChild(tickPlotSum);
        container.appendChild(histoPlot);
        container.appendChild(kdePlot);
        container.appendChild(tickPlotRows);

        // show how many notes are within the OK areas
        okScore = '';
        if (notes.length > 0) {
            const score = computeSubdivisionOkScoreBeats(
                notesInBeats.map((d) => d.time),
                grid1,
                grid2,
                binNote,
            );
            const percent = ((score / notesInBeats.length) * 100).toFixed();
            okScore = `${percent}% of notes are within tolerance`;
        }
        // percentage over bars
        if (showBarScores) {
            const byRepetition = d3.groups(notesInBeats, (d) =>
                Math.floor(d.time / beats),
            );
            const scores = byRepetition.map(([rep, repNotes]) => {
                const score = computeSubdivisionOkScoreBeats(
                    repNotes.map((d) => d.time),
                    grid1,
                    grid2,
                    binNote,
                );
                return {
                    repetition: Math.floor(repNotes[0].time / beats),
                    score: (score / repNotes.length) * 100,
                };
            });
            let step;
            if (scores.length < 40) {
                step = 1;
            } else if (scores.length < 100) {
                step = 5;
            } else if (scores.length < 200) {
                step = 10;
            } else {
                step = 20;
            }
            const axisTicks2 = d3.range(-1, maxBar, step);
            const scorePlot = Plot.plot({
                width,
                height: 110,
                x: {
                    domain: d3.range(0, scores.length),
                    ticks: axisTicks2,
                    tickFormat: (d) => d + 1,
                },
                y: {
                    label: 'percent of notes in tolerance per repetition',
                    domain: [0, 100],
                },
                marks: [
                    Plot.rectY(scores, {
                        y: 'score',
                        x: 'repetition',
                        fill: 'var(--accent)',
                        tip: true,
                        title: (d) =>
                            `rep: ${d.repetition + 1}\nscore: ${d.score.toFixed()} %`,
                    }),
                    Plot.ruleY([0]),
                    Plot.ruleY([100]),
                ],
            });
            container.appendChild(scorePlot);
        }
    };

    afterUpdate(draw);

    /**
     * Used for exporting and for automatics saving
     */
    const getExportData = () => {
        return {
            tempo,
            grid,
            bars,
            binNote,
            adjustTime,
            pastBars,
            showLoudness,
            showBarScores,
            combineBars,
            showTolerance,
            // data
            notes,
        };
    };

    const loadData = (json) => {
        saveToStorage();
        tempo = json.tempo ?? 120;
        grid = json.grid ?? '4:4';
        bars = json.bars ?? 1;
        binNote = json.binNote ?? 96;
        adjustTime = json.adjustTime ?? 0;
        pastBars = json.pastBars ?? 8;
        showLoudness = json.showLoudness ?? false;
        showBarScores = json.showBarScores ?? false;
        combineBars = json.combineBars ?? false;
        showTolerance = json.showTolerance ?? true;
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

<FileDropTarget {loadData} disabled="{isPlaying}">
    <main class="app">
        <h2>{appInfo.title}</h2>
        <p class="explanation">
            This app helps practicing beat sub-divisions such as eighths or
            triplets. Choose your tempo and subdivision, and start playing. The
            bar and area charts will show you a summary of when you played
            notes. Use the integrated metronome. All notes will be timed
            relative to the first one, but you can adjust all notes to make them
            earlier or later in case you messed up the first. The last few bars
            you play will be shown in a row below. A percentage score tells you
            how many notes were within a tolerance zone.<br />
            <i>
                Try playing without looking and focus on the metronome. Try to
                play all notes such that they are within a gray area!
            </i>
        </p>
        <div class="control">
            <TempoInput bind:value="{tempo}" disabled="{isPlaying}" />
            <SelectScollable
                label="grid"
                title="The whole width is one bar, you can choose to divide it by 3 or 4 quarter notes and then further sub-divide it into, for example, triplets"
                bind:value="{grid}"
            >
                {#each GRIDS as g}
                    <option value="{g.divisions}">{g.label}</option>
                {/each}
            </SelectScollable>
            <NumberInput
                title="The number of bars in each repetition."
                label="bars"
                bind:value="{bars}"
                step="{1}"
                min="{1}"
                max="{4}"
                defaultValue="{1}"
            />
            <SelectScollable
                label="binning"
                title="The width of each bar in rhythmic units. For example, each bin could be a 32nd note wide."
                bind:value="{binNote}"
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
            />
            <NumberInput
                title="The number of most recent repetitions that are shown in the rows at the bottom."
                label="repetitions"
                bind:value="{pastBars}"
                step="{2}"
                min="{4}"
                max="{200}"
                defaultValue="{8}"
            />
            <ToggleButton
                label="repetition scores"
                title="Show scores (percentage of notes within gray tolerance areas) per repetition"
                bind:checked="{showBarScores}"
            />
            <ToggleButton
                label="loudness"
                title="Show loudness in the note tick width, for example to see if you set accents correctly"
                bind:checked="{showLoudness}"
            />
            <ToggleButton
                label="combine bars"
                title="Instead of showing histogram bars as either early or late, combine the bars next to correct timing into one to ignore the impossible to avoid small deviations"
                bind:checked="{combineBars}"
            />
            <ToggleButton
                label="show tolerance"
                title="Toggle for the tolerance zone indicators"
                bind:checked="{showTolerance}"
            />
        </div>
        <div class="visualization" bind:this="{container}"></div>
        <div>{okScore}</div>
        <div class="control">
            <MetronomeButton
                {tempo}
                accent="{+grid.split(':')[0]}"
                disabled="{isPlaying}"
            />
            <UndoRedoButton
                bind:data="{notes}"
                callback="{draw}"
                disabled="{isPlaying}"
            />
            <ResetNotesButton
                bind:notes
                bind:isDataLoaded
                {saveToStorage}
                callback="{draw}"
                disabled="{isPlaying}"
            />
            <button on:click="{() => loadData(example)}" disabled="{isPlaying}">
                example
            </button>
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
            <SubDivisionSimulator
                bind:notes
                {tempo}
                bind:adjustTime
                {grid}
                {bars}
                disabled="{isPlaying}"
            />
        </div>
        <ExerciseDrawer>
            <InsideTextButton
                onclick="{() => loadData(exampleFillImprecise)}"
                disabled="{isPlaying}"
            >
                drum example with fill
            </InsideTextButton>
            <p>
                1) Play triplets.
                <InsideTextButton
                    onclick="{() => loadData(example)}"
                    disabled="{isPlaying}"
                >
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
                noteOn({
                    timestamp: performance.now(),
                    velocity: 0.5,
                    note: { number: 42 },
                })}"
            disabled="{isPlaying}"
        />
        <TouchInput
            element="{container}"
            touchStart="{() =>
                noteOn({
                    timestamp: performance.now(),
                    velocity: 0.5,
                    note: { number: 42 },
                })}"
            disabled="{isPlaying}"
        />
        <MidiInput {noteOn} disabled="{isPlaying}" />
    </main>
</FileDropTarget>

<PageResizeHandler callback="{draw}" />
<svelte:window bind:innerWidth="{windowWidth}" />
