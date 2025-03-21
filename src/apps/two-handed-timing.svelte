<script>
    import { afterUpdate, onDestroy } from 'svelte';
    import { Utils } from 'musicvis-lib';
    import * as Plot from '@observablehq/plot';
    import * as kde from 'fast-kde';
    import * as d3 from 'd3';
    import MetronomeButton from '../common/input-elements/metronome-button.svelte';
    import TempoInput from '../common/input-elements/tempo-input.svelte';
    import ResetNotesButton from '../common/input-elements/reset-notes-button.svelte';
    import { BIN_NOTES, GRIDS } from '../lib/music';
    import PcKeyboardInput from '../common/input-handlers/pc-keyboard-input.svelte';
    import MidiInput from '../common/input-handlers/midi-input.svelte';
    import { clamp } from '../lib/lib';
    import RhythmPlayerButton from '../common/input-elements/rhythm-player-button.svelte';
    import { localStorageAddRecording } from '../lib/localstorage';
    import ImportExportButton from '../common/input-elements/import-export-share-button.svelte';
    import HistoryButton from '../common/input-elements/history-button.svelte';
    import example from '../example-recordings/two-handed-timing.json';
    import ExerciseDrawer from '../common/exercise-drawer.svelte';
    import ToggleButton from '../common/input-elements/toggle-button.svelte';
    import RatingButton from '../common/input-elements/rating-button.svelte';
    import NumberInput from '../common/input-elements/number-input.svelte';
    import SelectScollable from '../common/input-elements/select-scollable.svelte';
    import FileDropTarget from '../common/file-drop-target.svelte';
    import SubDivisionAdjustButton from '../common/input-elements/sub-division-adjust-button.svelte';
    import MidiReplayButton from '../common/input-elements/midi-replay-button.svelte';
    import InsideTextButton from '../common/input-elements/inside-text-button.svelte';

    /**
     * contains the app meta information defined in App.js
     */
    export let appInfo;

    let width = 900;
    let container;
    // settings
    let tempo = 60;
    let gridLeft = GRIDS[0].divisions;
    let gridRight = GRIDS[1].divisions;
    let binNote = 96;
    let adjustTime = 0;
    let drumMode = false;
    // keyboard middle A
    let middleNote = 69;
    // snare is left
    const leftDrumNumbers = new Set([38, 40]);
    let showKde = true;
    let pastBars = 4;
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
        const noteInSeconds = (e.timestamp - firstTimeStamp) / 1000;
        const note = {
            time: noteInSeconds,
            number: e.note.number,
            velocity: e.rawVelocity,
        };
        notes = [...notes, note];
    };

    const drawHand = (left = true) => {
        const grid = left ? gridLeft : gridRight;
        const [grid1, grid2] = grid.split(':').map((d) => +d);
        const quarter = Utils.bpmToSecondsPerBeat(tempo);
        // only look at left OR right hand
        let notesHand;
        if (!drumMode) {
            // keyboard mode: left is left of middle note
            notesHand = notes.filter(
                (d) =>
                    (left && d.number < middleNote) ||
                    (!left && d.number >= middleNote),
            );
        } else {
            // drum mode: some drums are left, others are right
            notesHand = notes.filter(
                (d) =>
                    (left && leftDrumNumbers.has(d.number)) ||
                    (!left && !leftDrumNumbers.has(d.number)),
            );
        }

        notesHand = notesHand.map((d) => (d.time + adjustTime) / quarter);
        if (pastBars > 0 && notesHand.length > 0) {
            // only show most recent bars
            const lastBeat = (notes.at(-1).time + adjustTime) / quarter;
            const maxBar = Math.ceil(lastBeat / grid1);
            notesHand = notesHand.filter((d) => d / grid1 >= maxBar - pastBars);
        }
        notesHand = notesHand.map((d) => d % grid1);

        // KDE
        let kdePoints = [];
        if (notesHand.length > 0) {
            let bandwidth = 4 / binNote;
            let pad = 1;
            let bins = Math.floor(width / 2);
            const density1d = kde.density1d(notesHand, {
                bandwidth,
                pad,
                bins,
                extent: [0, grid1],
            });
            kdePoints = density1d.bandwidth(bandwidth);
        }

        const coarseGrid = d3.range(0, grid1 + 1, 1);
        const fineGrid = d3.range(0, grid1 * grid2, 1 / grid2);

        const plot = Plot.plot({
            width,
            height: left ? 120 : 120 + 13,
            marginTop: 15,
            marginLeft: 30,
            marginRight: 10,
            marginBottom: 15,
            padding: 0,
            x: {
                label: 'time in beats',
                domain: [0, 4],
                ticks: [],
            },
            y: {
                label: left ? 'left hand' : 'right hand',
                // axis: false,
                reverse: left,
                ticks: [],
                labelOffset: -10,
                labelAnchor: 'top',
                labelArrow: null,
            },
            marks: [
                showKde
                    ? Plot.areaY(kdePoints, {
                          x: 'x',
                          y: 'y',
                          fill: (d) => '#e4f0fa',
                          clip: true,
                      })
                    : Plot.rectY(
                          notesHand,
                          Plot.binX(
                              { y: 'count' },
                              {
                                  x: (d) => d,
                                  fill: '#eee',
                                  thresholds: d3.range(
                                      0,
                                      grid1 + 1,
                                      4 / binNote,
                                  ),
                                  ry2: 4,
                              },
                          ),
                      ),
                Plot.ruleY([0]),
                // beat grid
                Plot.tickX(fineGrid, {
                    stroke: '#888',
                }),
                Plot.tickX(coarseGrid, {
                    stroke: '#888',
                    strokeWidth: 3,
                }),
            ],
        });

        container.appendChild(plot);
    };

    const draw = () => {
        container.textContent = '';
        drawHand(false);
        drawHand(true);
    };

    /**
     * Used for exporting and for automatics saving
     */
    const getExportData = () => {
        return {
            tempo,
            gridLeft,
            gridRight,
            binNote,
            adjustTime,
            pastBars,
            // data
            notes,
        };
    };

    /**
     * Import data from file or example
     */
    const loadData = (json) => {
        saveToStorage();
        tempo = json.tempo;
        gridLeft = json.gridLeft;
        gridRight = json.gridRight;
        binNote = json.binNote;
        adjustTime = json.adjustTime ?? 0;
        pastBars = json.pastBars;
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

    afterUpdate(draw);

    onDestroy(saveToStorage);

    const getRhythmNotes = (gridLeft, gridRight, tempo) => {
        if (!gridLeft) {
            return [];
        }
        const quarter = Utils.bpmToSecondsPerBeat(tempo);
        let beats = [gridLeft, gridRight].flatMap((grid, isRight) => {
            const [grid1, grid2] = grid.split(':').map((d) => +d);
            const fineGrid = d3.range(0, grid1, 1 / grid2);
            return fineGrid.map((d) => {
                return {
                    time: d * quarter,
                    // number: isRight ? 62 : 69,
                    number: 69,
                };
            });
        });
        beats.sort((a, b) => a.time - b.time);
        return beats;
    };
</script>

<FileDropTarget {loadData} disabled="{isPlaying}">
    <main class="app">
        <h2>{appInfo.title}</h2>
        <p class="explanation">
            This app helps practicing beat sub-divisions such as eighths or
            triplets on a piano or drum. You can choose a different sub-division
            for each hand. The chart will show you how a summary of where your
            notes started, the top one is for your right hand and the bottom one
            for your left hand.
        </p>
        <p class="explanation">
            <b>Keyboard mode:</b> Left hand plays keys left of the middle A,
            right hand others.
            <b>Drum mode:</b> Left hand plays snare, right hand any other drum.
            <b>PC keyboard:</b> <code>f</code>
            for left and <code>j</code> for right.
        </p>
        <div class="control">
            <TempoInput bind:value="{tempo}" disabled="{isPlaying}" />
            <ToggleButton
                bind:checked="{drumMode}"
                label="drum mode"
                title="Toggle between piano keyboard and drum mode"
            />
            <SelectScollable
                label="grid left"
                title="The whole width is one bar, you can choose to divide it by 3 or 4 quarter notes and then further sub-divide it into, for example, triplets"
                bind:value="{gridLeft}"
            >
                {#each GRIDS as g}
                    <option value="{g.divisions}">{g.label}</option>
                {/each}
            </SelectScollable>
            <SelectScollable
                label="right"
                title="The whole width is one bar, you can choose to divide it by 3 or 4 quarter notes and then further sub-divide it into, for example, triplets"
                bind:value="{gridRight}"
            >
                {#each GRIDS as g}
                    <option value="{g.divisions}">{g.label}</option>
                {/each}
            </SelectScollable>
        </div>
        <div class="control">
            <SelectScollable
                label="binning"
                title="The width of each bar in rhythmic units. For example, each bin could be a 32nd note wide."
                bind:value="{binNote}"
            >
                {#each BIN_NOTES as g}
                    <option value="{g}">1/{g} note</option>
                {/each}
            </SelectScollable>
            <SubDivisionAdjustButton
                bind:adjustTime
                {tempo}
                grid="{gridLeft}"
                notes="{notes.map((d) => d.time)}"
            />
            <NumberInput
                title="The number of past bars to be shown. Allows to 'forget' mistakes in the beginning."
                label="bars"
                bind:value="{pastBars}"
                min="{1}"
                max="{100}"
            />
            <button
                title="Toggle between an area chart and a histogram of the note density"
                on:click="{() => {
                    showKde = !showKde;
                }}"
                style="width: 120px"
            >
                {showKde ? 'density area' : 'histogram'}
            </button>
        </div>
        <div class="visualization" bind:this="{container}"></div>
        <div class="control">
            <MetronomeButton
                {tempo}
                accent="{+gridLeft.split(':')[0]}"
                disabled="{isPlaying}"
            />
            <RhythmPlayerButton
                notes="{getRhythmNotes(gridLeft, gridRight, tempo)}"
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
                1) Only single notes. Play triplets with your left and eighths
                with your right hand.
                <i> Try playing without looking, focus on the metronome. </i>
                <InsideTextButton
                    onclick="{() => loadData(example)}"
                    disabled="{isPlaying}"
                >
                    example
                </InsideTextButton>
            </p>
            <p>
                2) Play the same rhythm as in 1) but using different notes, to
                form a melody.
            </p>
        </ExerciseDrawer>
        <MidiInput {noteOn} disabled="{isDataLoaded || isPlaying}" />
        <RatingButton appId="{appInfo.id}" />
        <PcKeyboardInput
            key="f"
            disabled="{isDataLoaded || isPlaying}"
            keyDown="{() =>
                noteOn({ timestamp: performance.now(), note: { number: 0 } })}"
        />
        <PcKeyboardInput
            key="j"
            disabled="{isDataLoaded || isPlaying}"
            keyDown="{() =>
                noteOn({
                    timestamp: performance.now(),
                    note: { number: 127 },
                })}"
        />
    </main>
</FileDropTarget>
