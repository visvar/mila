<script>
    import { onDestroy, onMount } from 'svelte';
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
    import ImportExportButton from '../common/input-elements/import-export-share-button.svelte';
    import { localStorageAddRecording } from '../lib/localstorage';
    import HistoryButton from '../common/input-elements/history-button.svelte';
    import ExerciseDrawer from '../common/exercise-drawer.svelte';
    import { drumPitchReplacementMapMD90 } from '../lib/drums';
    import { COLORS } from '../lib/colors';
    import RatingButton from '../common/input-elements/rating-button.svelte';
    import SubDivisionAdjustButton from '../common/input-elements/sub-division-adjust-button.svelte';
    import UndoRedoButton from '../common/input-elements/undo-redo-button.svelte';
    import example from '../example-recordings/sub-division-drums.json';
    import example1 from '../example-recordings/sub-division-drums-e1.json';
    import example2 from '../example-recordings/sub-division-drums-e2.json';
    import example4 from '../example-recordings/sub-division-drums-e4.json';
    import NumberInput from '../common/input-elements/number-input.svelte';
    import SelectScollable from '../common/input-elements/select-scollable.svelte';
    import FileDropTarget from '../common/file-drop-target.svelte';
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
    let grid = GRIDS[0].divisions;
    let binNote = 64;
    let adjustTime = 0;
    let showKde = true;
    let pastBars = 4;
    // data
    let firstTimeStamp = 0;
    let notes = [];

    const noteOn = (e) => {
        if (notes.length === 0) {
            firstTimeStamp = e.timestamp;
        }
        const noteInSeconds = (e.timestamp - firstTimeStamp) / 1000;
        const note = {
            time: noteInSeconds,
            number: e.note.number,
            drum:
                drumPitchReplacementMapMD90.get(e.note.number)?.label ??
                e.note.number,
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
            // binning
            binNote =
                BIN_NOTES[
                    clamp(Math.floor(e.rawValue / 5), 0, BIN_NOTES.length - 1)
                ];
        } else if (c === 16) {
            // adjust
            adjustTime = (clamp(e.rawValue, 0, 100) - 50) / 100;
        } else if (c === 17) {
            pastBars = clamp(e.rawValue, 0, 99) + 1;
        } else if (c === 18) {
        }
        draw();
    };

    const drawDrum = (drum = 'KD', label = 'Kick Drum', xLabel = null) => {
        const [grid1, grid2] = grid.split(':').map((d) => +d);
        const quarter = Utils.bpmToSecondsPerBeat(tempo);
        // only look at one drum part
        let clamped = notes.filter((d) => d.drum === drum);

        clamped = clamped.map((d) => (d.time + adjustTime) / quarter);
        if (pastBars > 0 && clamped.length > 0) {
            // only show most recent bars
            const maxBar = Math.floor(clamped.at(-1) / grid1);
            clamped = clamped.filter((d) => d / grid1 >= maxBar - pastBars);
        }
        clamped = clamped.map((d) => d % grid1);

        // KDE
        let kdePoints = [];
        if (clamped.length > 0) {
            let bandwidth = 4 / binNote;
            let pad = 1;
            let bins = width / 2;
            const density1d = kde.density1d(clamped, {
                bandwidth,
                pad,
                bins,
                extent: [0, grid1],
            });
            kdePoints = density1d.bandwidth(bandwidth);
        }

        const coarseGrid = d3.range(0, grid1 + 1, 1);
        const fineGrid = d3.range(0, grid1, 1 / grid2);

        const plot = Plot.plot({
            width,
            height: xLabel ? 120 : 110,
            marginLeft: 20,
            marginBottom: xLabel ? 30 : 20,
            padding: 0,
            x: {
                label: xLabel,
                domain: [0, 4],
                ticks: coarseGrid.slice(0, -1),
                round: true,
                tickFormat: (d) => (d + 1).toFixed(),
            },
            y: {
                axis: false,
            },
            marks: [
                showKde
                    ? Plot.areaY(kdePoints, {
                          x: 'x',
                          y: 'y',
                          fill: (d) => COLORS.accent,
                          clip: true,
                      })
                    : Plot.rectY(
                          clamped,
                          Plot.binX(
                              { y: 'count' },
                              {
                                  x: (d) => d,
                                  fill: '#ccc',
                                  thresholds: d3.range(
                                      0,
                                      grid1 + 1,
                                      4 / binNote,
                                  ),
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

        const title = document.createElement('span');
        title.innerText = label;
        container.appendChild(title);
        container.appendChild(plot);
    };

    const draw = () => {
        container.textContent = '';
        drawDrum('HH', 'Hi-Hat');
        drawDrum('SN', 'Snare');
        drawDrum('TO', 'Toms');
        drawDrum('KD', 'Kick Drum', 'beats');
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
            showKde,
            notes,
        };
    };

    /**
     * Import data from file or example
     */
    const loadData = (json) => {
        saveToStorage();
        tempo = json.tempo;
        grid = json.grid;
        binNote = json.binNote;
        adjustTime = json.adjustTime;
        pastBars = json.pastBars ?? 100;
        showKde = json.showKde ?? false;
        // data
        notes = json.notes;
        draw();
    };

    const saveToStorage = () => {
        const json = JSON.stringify(notes);
        if (
            notes.length > 0 &&
            json !== JSON.stringify(example.notes) &&
            json !== JSON.stringify(example1.notes) &&
            json !== JSON.stringify(example2.notes) &&
            json !== JSON.stringify(example4.notes)
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
            triplets on drums. Connect a MIDI drum kit and start playing to the
            metronome. The chart will show you how a summary of where your notes
            started, one for each type of drum. If you do not have a MIDI drum
            kit, you can press keys:
            <code>h</code>, <code>s</code>, <code>t</code>, and <code>k</code>
            for hi-hat, snare, tom, and kick drum.
            <i> Try playing without looking, focus on the metronome. </i>
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
                title="The number of past bars to be shown. Allows to 'forget' mistakes in the beginning."
                label="last bars"
                bind:value="{pastBars}"
                callback="{draw}"
                min="{1}"
                max="{100}"
                step="{4}"
            />
            <button
                title="Toggle between an area chart and a histogram of the note density"
                on:click="{() => {
                    showKde = !showKde;
                    draw();
                }}"
                style="width: 120px"
            >
                {showKde ? 'density area' : 'histogram'}
            </button>
        </div>
        <div class="visualization" bind:this="{container}"></div>
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
                1) Play the kick on beat 1 and 3 and the snare on 2 and 4.
                <InsideTextButton onclick="{() => loadData(example1)}">
                    example
                </InsideTextButton>
            </p>
            <p>
                2) Play 1) and add the hi-hat on beat 1, 2, 3, 4. <InsideTextButton
                    onclick="{() => loadData(example2)}"
                >
                    example
                </InsideTextButton>
            </p>
            <p>3) Play 2) and sometimes add a fill on the toms.</p>
            <p>
                4) Play a swing feel, where you shift every second note a bit
                late. Try to do this consistently!
                <InsideTextButton onclick="{() => loadData(example4)}">
                    example
                </InsideTextButton>
            </p>
        </ExerciseDrawer>
        <RatingButton appId="{appInfo.id}" />
        <PcKeyboardInput
            key="s"
            keyDown="{() =>
                noteOn({ timestamp: performance.now(), note: { number: 38 } })}"
        />
        <PcKeyboardInput
            key="h"
            keyDown="{() =>
                noteOn({ timestamp: performance.now(), note: { number: 46 } })}"
        />
        <PcKeyboardInput
            key="t"
            keyDown="{() =>
                noteOn({ timestamp: performance.now(), note: { number: 48 } })}"
        />
        <PcKeyboardInput
            key="k"
            keyDown="{() =>
                noteOn({ timestamp: performance.now(), note: { number: 36 } })}"
        />
        <MidiInput {noteOn} {controlChange} />
    </main>
</FileDropTarget>
