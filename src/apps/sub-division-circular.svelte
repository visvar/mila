<script>
    import { afterUpdate, onDestroy, onMount } from 'svelte';
    import { Canvas, Utils } from 'musicvis-lib';
    import * as kde from 'fast-kde';
    import * as d3 from 'd3';
    import * as Plot from '@observablehq/plot';
    import MetronomeButton from '../common/input-elements/metronome-button.svelte';
    import TempoInput from '../common/input-elements/tempo-input.svelte';
    import ResetNotesButton from '../common/input-elements/reset-notes-button.svelte';
    import {
        clamp,
        computeSubdivisionOkScore,
        computeSubdivisionOkScoreBeats,
    } from '../lib/lib';
    import { BIN_NOTES, GRIDS } from '../lib/music';
    import PcKeyboardInput from '../common/input-handlers/pc-keyboard-input.svelte';
    import MidiInput from '../common/input-handlers/midi-input.svelte';
    import example from '../example-recordings/sub-division-linear/sub-division-linear.json';
    import ImportExportButton from '../common/input-elements/import-export-share-button.svelte';
    import { localStorageAddRecording } from '../lib/localstorage';
    import HistoryButton from '../common/input-elements/history-button.svelte';
    import TouchInput from '../common/input-handlers/touch-input.svelte';
    import ExerciseDrawer from '../common/exercise-drawer.svelte';
    import { COLORS } from '../lib/colors';
    import RatingButton from '../common/input-elements/rating-button.svelte';
    import SubDivisionAdjustButton from '../common/input-elements/sub-division-adjust-button.svelte';
    import UndoRedoButton from '../common/input-elements/undo-redo-button.svelte';
    import PageResizeHandler from '../common/input-handlers/page-resize-handler.svelte';
    import SelectScollable from '../common/input-elements/select-scollable.svelte';
    import MidiReplayButton from '../common/input-elements/midi-replay-button.svelte';
    import ToggleButton from '../common/input-elements/toggle-button.svelte';
    import FileDropTarget from '../common/file-drop-target.svelte';
    import InsideTextButton from '../common/input-elements/inside-text-button.svelte';

    /**
     * contains the app meta information defined in App.js
     */
    export let appInfo;

    const TWO_PI = Math.PI * 2;

    let canvas;
    let container;
    let width = 900;
    let height = 800;
    // settings
    let tempo = 120;
    let grid = GRIDS[0].divisions;
    let binNote = 64;
    let adjustTime = 0;
    let showKde = false;
    let showLoudness = false;
    let showBarScores = false;
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
            velocity: e.velocity,
            number: e.note.number,
        };
        notes = [...notes, note];
    };

    const draw = () => {
        const cx = width / 2;
        const cy = height / 2;
        const r = width * 0.18;
        const r2 = r * 0.8;
        const r3 = r * 0.9;
        const r5 = r * 0.95;
        const r6 = r * 0.68;
        // offset in radians for 0 on top
        const topOffs = Math.PI / 2;
        const ctx = canvas.getContext('2d');
        // scale to DPR
        // Get the DPR and size of the canvas
        const dpr = window.devicePixelRatio;
        const rect = canvas.getBoundingClientRect();
        // Set the "actual" size of the canvas
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        // Scale the context to ensure correct drawing operations
        ctx.scale(dpr, dpr);
        // Set the "drawn" size of the canvas
        canvas.style.width = `${rect.width}px`;
        canvas.style.height = `${rect.height}px`;
        // fade-out old data
        ctx.clearRect(0, 0, width, height);
        // ctx.fillRect(0, 0, width, height);

        const [grid1, grid2] = grid.split(':').map((d) => +d);

        // number of seconds for a fill circle rotation
        const circleSeconds = Utils.bpmToSecondsPerBeat(tempo) * grid1;

        const adjustedNotes = notes.map((d) => {
            return { ...d, time: d.time + adjustTime };
        });

        const clamped = adjustedNotes.map((d) => d.time % circleSeconds);
        const noteAngles = clamped.map((d) => (d / circleSeconds) * TWO_PI);
        const maxBinHeight = r * 0.2;

        // for 3/4 bars there are less bins
        const binCount = (binNote * grid1) / 4;

        // draw notes
        if (adjustedNotes.length > 0) {
            ctx.lineWidth = 2;
            ctx.strokeStyle = '#888';
            const layerCount =
                Math.floor(adjustedNotes.at(-1).time / circleSeconds) + 1;
            const layerSize = (height / 2 - r - maxBinHeight - 10) / layerCount;
            for (const [i, n] of adjustedNotes.entries()) {
                // loudness
                if (showLoudness) {
                    ctx.lineWidth = n.velocity * 4;
                }
                // draw tick
                const angle = (n.time / circleSeconds) * TWO_PI - topOffs;
                const dx = Math.cos(angle);
                const dy = Math.sin(angle);
                const layer = Math.max(0, Math.floor(n.time / circleSeconds));
                const layerR1 = r + maxBinHeight + layer * layerSize + 5;
                const layerR2 = layerR1 + layerSize;
                ctx.beginPath();
                ctx.moveTo(cx + dx * layerR1, cy + dy * layerR1);
                ctx.lineTo(cx + dx * layerR2, cy + dy * layerR2);
                ctx.stroke();
            }
            // draw rings
            ctx.lineWidth = 1;
            ctx.strokeStyle = '#eee';
            ctx.fillStyle = 'transparent';
            for (let i = 0; i < layerCount; i++) {
                const layerR = r + maxBinHeight + i * layerSize + 5;
                ctx.beginPath();
                ctx.arc(cx, cy, layerR, 0, 2 * Math.PI);
                ctx.closePath();
                ctx.stroke();
            }
        }

        // draw wegdes for 'good enough' (OK area)
        ctx.fillStyle = '#f8f8f8aa';
        const wedgeSize = TWO_PI / binCount;
        const wedges = d3
            .range(grid1 * grid2)
            .map((d) => (TWO_PI / (grid1 * grid2)) * d - topOffs);
        const rWedge = height / 2;
        ctx.beginPath();
        for (const g of wedges) {
            const dx1 = Math.cos(g - wedgeSize);
            const dy1 = Math.sin(g - wedgeSize);
            const dx2 = Math.cos(g + wedgeSize);
            const dy2 = Math.sin(g + wedgeSize);
            ctx.moveTo(cx, cy);
            ctx.lineTo(cx + dx1 * rWedge, cy + dy1 * rWedge);
            ctx.lineTo(cx + dx2 * rWedge, cy + dy2 * rWedge);
            ctx.closePath();
        }
        ctx.fill();

        // draw histogram
        if (!showKde) {
            ctx.fillStyle = '#f8f8f8';
            ctx.strokeStyle = '#aaa';
            const bin = d3
                .bin()
                .domain([0, TWO_PI])
                .thresholds(
                    d3.range(binCount).map((d) => (d / binCount) * TWO_PI),
                );
            const binned = bin(noteAngles);
            const maxBin = d3.max(binned, (d) => d.length);
            for (const b of binned) {
                if (b.length === 0) {
                    continue;
                }
                const binHeight = (b.length / maxBin) * maxBinHeight;
                const binR = r + binHeight;
                const angle1 = b.x0 - topOffs;
                const dx = Math.cos(angle1);
                const dy = Math.sin(angle1);
                const angle2 = b.x1 - topOffs;
                const dx2 = Math.cos(angle2);
                const dy2 = Math.sin(angle2);
                ctx.beginPath();
                ctx.moveTo(cx + dx * r, cy + dy * r);
                ctx.lineTo(cx + dx * binR, cy + dy * binR);
                ctx.arc(cx, cy, binR, angle1, angle2);
                ctx.lineTo(cx + dx2 * r, cy + dy2 * r);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();
            }
        }

        // draw KDE
        if (showKde && noteAngles.length > 1) {
            let bandwidth = 4 / binNote;
            let pad = 0;
            let bins = 360;
            const density1d = kde.density1d(noteAngles, {
                bandwidth,
                pad,
                bins,
                extent: [0, TWO_PI],
            });
            let points = density1d.bandwidth(bandwidth);
            const maxValue = d3.max([...points], (d) => d.y);
            // fix issue with negative angle when adjusting
            points = [...points].map((d) => {
                return { ...d, x: d.x < 0 ? d.x + TWO_PI : d.x };
            });
            points.sort((a, b) => a.x - b.x);

            ctx.beginPath();
            for (const [index, p] of points.entries()) {
                const angle = p.x - topOffs;
                // interpolate first and last
                let y = p.y;
                if (index === 0 || index === points.length - 1) {
                    y = (points.at(0).y + points.at(-1).y) / 2;
                }
                const rp = r + (y / maxValue) * maxBinHeight;
                const dx = Math.cos(angle);
                const dy = Math.sin(angle);
                if (index === 0) {
                    ctx.moveTo(cx + dx * rp, cy + dy * rp);
                } else {
                    ctx.lineTo(cx + dx * rp, cy + dy * rp);
                }
            }
            ctx.closePath();
            ctx.fillStyle = COLORS.accent;
            ctx.fill();
            ctx.strokeStyle = '#aaa';
            ctx.stroke();
        }

        // grid
        ctx.strokeStyle = '#aaa';
        ctx.fillStyle = 'white';
        Canvas.drawCircle(ctx, cx, cy, r);
        ctx.lineWidth = 2;
        ctx.fill();
        ctx.stroke();
        // grid angles
        const coarseGridAngles = d3
            .range(grid1)
            .map((d) => (TWO_PI / grid1) * d - topOffs);
        const fineGridAngles = d3
            .range(grid1 * grid2)
            .map((d) => (TWO_PI / (grid1 * grid2)) * d - topOffs);
        // draw grid ticks
        ctx.beginPath();
        ctx.lineWidth = 2;
        ctx.fillStyle = '#ccc';
        ctx.font = '18px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'center';
        for (const [index, g] of coarseGridAngles.entries()) {
            const dx = Math.cos(g);
            const dy = Math.sin(g);
            ctx.moveTo(cx + dx * r2, cy + dy * r2);
            ctx.lineTo(cx + dx * r5, cy + dy * r5);
            // grid labels (beat numbers)
            ctx.fillText(index + 1, cx + dx * r6, cy + dy * r6 + 7);
        }
        ctx.stroke();
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (const g of fineGridAngles) {
            const dx = Math.cos(g);
            const dy = Math.sin(g);
            ctx.moveTo(cx + dx * r3, cy + dy * r3);
            ctx.lineTo(cx + dx * r5, cy + dy * r5);
        }
        ctx.stroke();

        // show how many notes are within the OK areas
        const quarter = Utils.bpmToSecondsPerBeat(tempo);
        const notesInBeats = notes.map((d) => {
            const time = (d.time + adjustTime) / quarter;
            return { ...d, time };
        });
        if (notes.length > 0) {
            const score = computeSubdivisionOkScoreBeats(
                notesInBeats.map((d) => d.time),
                grid1,
                grid2,
                binNote,
            );
            const percent = ((score / notesInBeats.length) * 100).toFixed();
            ctx.fillText(`${percent} %`, cx, cy + 7);
        }

        // percentage over bars
        if (showBarScores) {
            const byRepetition = d3.groups(notesInBeats, (d) =>
                Math.floor(d.time / grid1),
            );
            const scores = byRepetition.map(([rep, repNotes]) => {
                const score = computeSubdivisionOkScoreBeats(
                    repNotes.map((d) => d.time),
                    grid1,
                    grid2,
                    binNote,
                );
                return {
                    repetition: Math.floor(repNotes[0].time / grid1),
                    score: (score / repNotes.length) * 100,
                };
            });
            const scorePlot = Plot.plot({
                width,
                height: 110,
                x: {
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
            container.textContent = '';
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
            binNote,
            adjustTime,
            showKde,
            showLoudness,
            showBarScores,
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
        grid = json.grid;
        binNote = json.binNote;
        adjustTime = json.adjustTime;
        showKde = json.showKde ?? false;
        showLoudness = json.showLoudness ?? false;
        showBarScores = json.showBarScores ?? false;
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
            bar or area chart will show you a summary of when you played notes.
            Use the integrated metronome. All notes will be timed relative to
            the first one, but you can adjust all notes to make them earlier or
            later in case you messed up the first. Each bar you play will be
            shown its own layer around the circle. The lightgray areas show th
            tolerance zone where a note is considered to be timed well
            (depending on the binning setting), the score in the center shows
            the percentage of notes that are inside these areas.<br />
            <i>
                Try playing without looking and focus on the metronome. Try to
                play all notes such that they are within a gray area!
            </i>
        </p>
        <div class="control">
            <TempoInput bind:value="{tempo}" />
            <SelectScollable
                label="grid"
                title="The whole circle is one bar, you can choose to divide it by 3 or 4 quarter notes and then further sub-divide it into, for example, triplets"
                bind:value="{grid}"
            >
                {#each GRIDS as g}
                    <option value="{g.divisions}">{g.label}</option>
                {/each}
            </SelectScollable>
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
            <button
                title="Toggle between bars and area"
                on:click="{() => {
                    showKde = !showKde;
                }}"
            >
                {showKde ? 'area' : 'bars'}
            </button>
            <ToggleButton
                label="bar scores"
                title="Show scores (percentage of notes within gray areas) per bar"
                bind:checked="{showBarScores}"
            />
            <ToggleButton
                label="loudness"
                title="Show loudness in the note tick width, for example to see if you set accents correctly"
                bind:checked="{showLoudness}"
            />
        </div>
        <div class="visualization">
            <canvas
                bind:this="{canvas}"
                style="width: {width}px; height: {height}px"
            ></canvas>
        </div>
        <div bind:this="{container}"></div>
        <div class="control">
            <MetronomeButton
                {tempo}
                accent="{+grid.split(':')[0]}"
                disabled="{isPlaying}"
            />
            <UndoRedoButton bind:data="{notes}" disabled="{isPlaying}" />
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
            <MidiReplayButton bind:isPlaying bind:notes callback="{draw}" />
            <ImportExportButton
                {loadData}
                {getExportData}
                appId="{appInfo.id}"
                disabled="{isPlaying}"
            />
        </div>
        <ExerciseDrawer>
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
        <MidiInput {noteOn} disabled="{isDataLoaded || isPlaying}" />
        <RatingButton appId="{appInfo.id}" />
        <PcKeyboardInput
            key=" "
            disabled="{isDataLoaded || isPlaying}"
            keyDown="{() =>
                noteOn({ timestamp: performance.now(), velocity: 0.5 })}"
        />
        <TouchInput
            element="{canvas}"
            disabled="{isDataLoaded || isPlaying}"
            touchStart="{() =>
                noteOn({ timestamp: performance.now(), velocity: 0.5 })}"
        />
        <PageResizeHandler callback="{draw}" />
    </main>
</FileDropTarget>
