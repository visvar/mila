<script>
    import { afterUpdate, onDestroy, onMount } from 'svelte';
    import { Canvas, Utils } from 'musicvis-lib';
    import * as kde from 'fast-kde';
    import * as d3 from 'd3';
    import * as Plot from '@observablehq/plot';
    import MetronomeButton from '../common/input-elements/metronome-button.svelte';
    import TempoInput from '../common/input-elements/tempo-input.svelte';
    import ResetNotesButton from '../common/input-elements/reset-notes-button.svelte';
    import { BIN_NOTES, GRIDS } from '../lib/music';
    import PcKeyboardInput from '../common/input-handlers/pc-keyboard-input.svelte';
    import MidiInput from '../common/input-handlers/midi-input.svelte';
    import {
        localSorageGetRecordings,
        localStorageAddRecording,
    } from '../lib/localstorage';
    import TouchInput from '../common/input-handlers/touch-input.svelte';
    import ExerciseDrawer from '../common/exercise-drawer.svelte';
    import { COLORS } from '../lib/colors';
    import RatingButton from '../common/input-elements/rating-button.svelte';
    import SubDivisionAdjustButton from '../common/input-elements/sub-division-adjust-button.svelte';
    import { computeSubdivisionOkScore } from '../lib/lib';
    import HistoryButton from '../common/input-elements/history-button.svelte';
    import SelectScollable from '../common/input-elements/select-scollable.svelte';

    /**
     * contains the app meta information defined in App.js
     */
    export let appInfo;

    const TWO_PI = Math.PI * 2;

    let width = 850;
    let canvas;
    let canvas2;
    let container;
    let height = width;
    // settings
    let tempo = 120;
    let grid = GRIDS[0].divisions;
    let binNote = 64;
    let adjustTime = 0;
    let circular = true;
    let showKde = true;
    // data
    let firstTimeStamp = 0;
    let notes = [];

    const noteOn = (e) => {
        if (notes.length === 0) {
            firstTimeStamp = e.timestamp;
        }
        const noteInSeconds = (e.timestamp - firstTimeStamp) / 1000;
        notes = [...notes, noteInSeconds];
    };

    const drawOneCircular = (
        canvas,
        notes,
        tempo,
        grid,
        binNote,
        adjustTime,
        showKde,
        size,
        x,
        y,
    ) => {
        const width = size;
        const height = size;
        const cx = x + width / 2;
        const cy = y + height / 2;
        const r = width * 0.4;
        const r2 = r * 0.8;
        const r3 = r * 0.9;
        const r5 = r * 0.95;
        const r6 = r * 0.68;
        // offset in radians for 0 on top
        const topOffs = Math.PI / 2;
        const ctx = canvas.getContext('2d');

        const [grid1, grid2] = grid.split(':').map((d) => +d);

        // number of seconds for a fill circle rotation
        const circleSeconds = Utils.bpmToSecondsPerBeat(tempo) * grid1;

        const adjustedNotes = notes.map((d) => d + adjustTime);

        const clamped = adjustedNotes.map((d) => d % circleSeconds);
        const noteAngles = clamped.map((d) => (d / circleSeconds) * TWO_PI);
        const maxBinHeight = width * 0.08;

        // draw histogram
        if (!showKde) {
            // for 3/4 bars there are less bins
            const binCount = (binNote * grid1) / 4;
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
        ctx.font = `${size * 0.08}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        for (const [index, g] of coarseGridAngles.entries()) {
            const dx = Math.cos(g);
            const dy = Math.sin(g);
            ctx.moveTo(cx + dx * r2, cy + dy * r2);
            ctx.lineTo(cx + dx * r5, cy + dy * r5);
            // grid labels (beat numbers)
            ctx.fillText(index + 1, cx + dx * r6, cy + dy * r6);
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

        // score of how many notes are in the OK area
        if (notes.length > 0) {
            const ok = computeSubdivisionOkScore(
                notes,
                grid,
                tempo,
                binNote,
                adjustTime,
            );
            ctx.fillText(((ok / notes.length) * 100).toFixed() + '%', cx, cy);
        }
    };

    const drawOneLinear = (
        title,
        notes,
        tempo,
        grid,
        binNote,
        adjustTime,
        showKde,
    ) => {
        const [grid1, grid2] = grid.split(':').map((d) => +d);
        const quarter = Utils.bpmToSecondsPerBeat(tempo);
        let notesHand = notes.map((d) => (d + adjustTime) / quarter);

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
            height: 80,
            marginTop: 15,
            marginLeft: 30,
            marginRight: 10,
            marginBottom: 15,
            padding: 0,
            style: { fontSize: '14px' },
            x: {
                label: 'time in beats',
                domain: [0, 4],
                ticks: [],
            },
            y: {
                label: title,
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
        drawOneCircular(
            canvas,
            notes,
            tempo,
            grid,
            binNote,
            adjustTime,
            showKde,
            width / 2,
            0,
            0,
        );
    };

    const drawLoadedCircular = () => {
        const count = 8;
        const recordings = localSorageGetRecordings(appInfo.id).slice(-count);
        // .reverse();

        //  reset canvas
        const ctx = canvas2.getContext('2d');
        // scale to DPR
        // Get the DPR and size of the canvas
        const dpr = window.devicePixelRatio;
        const rect = canvas2.getBoundingClientRect();
        // Set the "actual" size of the canvas
        canvas2.width = rect.width * dpr;
        canvas2.height = rect.height * dpr;
        // Scale the context to ensure correct drawing operations
        ctx.scale(dpr, dpr);
        // Set the "drawn" size of the canvas
        canvas2.style.width = `${rect.width}px`;
        canvas2.style.height = `${rect.height}px`;
        // fade-out old data
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, width, height);

        const columns = 4;
        for (const [index, recording] of recordings.entries()) {
            const json = recording.data;
            const tempo = json.tempo;
            const grid = json.grid;
            const adjustTime = json.adjustTime;
            // data
            const notes = json.notes;
            const size = width / columns;
            const x = (index % columns) * size;
            const y = Math.floor(index / columns) * size;
            // title
            ctx.font = `12px sans-serif`;
            ctx.textBaseline = 'top';
            ctx.textAlign = 'center';
            ctx.fillStyle = '#333';
            ctx.fillText(
                recording.date.slice(0, 16).replace('T', '  '),
                x + size / 2,
                y,
            );
            ctx.fillText(
                `tempo: ${tempo} grid: ${grid} adjust: ${adjustTime}`,
                x + size / 2,
                y + 12,
            );
            drawOneCircular(
                canvas2,
                notes,
                tempo,
                grid,
                binNote,
                adjustTime,
                showKde,
                size * 0.8,
                x + size * 0.1,
                y + 22,
            );
        }
    };

    const drawLoadedLinear = () => {
        const count = 20;
        const recordings = localSorageGetRecordings(appInfo.id).slice(-count);
        for (const recording of recordings) {
            const json = recording.data;
            const tempo = json.tempo;
            const grid = json.grid;
            const adjustTime = json.adjustTime;
            const label = `${recording.date.slice(0, 16).replace('T', '  ')} tempo: ${tempo} grid: ${grid} adjust: ${adjustTime}`;
            drawOneLinear(
                label,
                json.notes,
                tempo,
                grid,
                binNote,
                adjustTime,
                showKde,
            );
        }
    };

    const drawAll = () => {
        draw();
        container.innerHTML = '';
        circular ? drawLoadedCircular() : drawLoadedLinear();
    };

    afterUpdate(drawAll);

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
            // data
            notes,
        };
    };

    const saveToStorage = () => {
        if (notes.length > 0) {
            localStorageAddRecording(appInfo.id, getExportData());
        }
    };

    onDestroy(saveToStorage);
</script>

<main class="app">
    <h2>{appInfo.title}</h2>
    <p class="explanation">
        This app helps practicing beat sub-divisions such as eighths or
        triplets. In this version, you can compare to earlier takes below.
        Choose your tempo and subdivision, and start playing. The bar or area
        chart will show you a summary of when you played notes. Use the
        integrated metronome. All notes will be timed relative to the first one,
        but you can adjust all notes to make them earlier or later in case you
        messed up the first. Your most recent earlier takes will be shown
        smaller below (new to old, left to right and top to bottom).<br />
        <i> Try playing without looking and focus on the metronome. </i>
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
        <SubDivisionAdjustButton
            bind:adjustTime
            {tempo}
            {grid}
            {notes}
            {draw}
        />
        <button
            title="Toggle between circular and linear"
            on:click="{() => {
                circular = !circular;
            }}"
        >
            {circular ? 'circular' : 'linear'}
        </button>
        <button
            title="Toggle between bars and area"
            on:click="{() => {
                showKde = !showKde;
            }}"
        >
            {showKde ? 'area' : 'bars'}
        </button>
    </div>
    <div class="visualization">
        <canvas
            bind:this="{canvas}"
            style="width: {width / 2}px; height: {width / 2}px"
        ></canvas>
    </div>
    <div class="control">
        <MetronomeButton {tempo} accent="{+grid.split(':')[0]}" />
        <ResetNotesButton bind:notes {saveToStorage} />
        <HistoryButton appId="{appInfo.id}" loadData="{() => {}}" />
    </div>
    <div class="visualization">
        <h3>History</h3>
        <div bind:this="{container}"></div>
        <canvas
            bind:this="{canvas2}"
            style="width: {width}px; height: {height / 2}px; display: {circular
                ? 'block'
                : 'none'}"
        ></canvas>
    </div>
    <ExerciseDrawer>
        <p>1) Play triplets.</p>
        <p>
            2) Switch back and forth between a half bar of eighths and a half
            bar of triplets.
        </p>
        <p>
            3) Play a swing feel, where you shift every second note a bit late.
            Try to do this consistently!
        </p>
    </ExerciseDrawer>
    <RatingButton appId="{appInfo.id}" />
    <MidiInput {noteOn} />
    <PcKeyboardInput
        key=" "
        keyDown="{() => noteOn({ timestamp: performance.now() })}"
    />
    <TouchInput
        element="{canvas}"
        touchStart="{() => noteOn({ timestamp: performance.now() })}"
    />
</main>
