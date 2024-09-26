<script>
    import { onDestroy, onMount } from 'svelte';
    import { Canvas, Utils } from 'musicvis-lib';
    import * as kde from 'fast-kde';
    import * as d3 from 'd3';
    import MetronomeButton from '../common/metronome-button.svelte';
    import TempoInput from '../common/tempo-input.svelte';
    import ResetNotesButton from '../common/reset-notes-button.svelte';
    import { clamp, computeSubdivisionOkScore } from '../lib/lib';
    import { BIN_NOTES, GRIDS } from '../lib/music';
    import PcKeyboardInput from '../common/pc-keyboard-input.svelte';
    import MidiInput from '../common/midi-input.svelte';
    import example from '../example-recordings/sub-division.json';
    import ImportExportButton from '../common/import-export-button.svelte';
    import { localStorageAddRecording } from '../lib/localstorage';
    import HistoryButton from '../common/history-button.svelte';
    import TouchInput from '../common/touch-input.svelte';
    import ExerciseDrawer from '../common/exercise-drawer.svelte';
    import { COLORS } from '../lib/colors';
    import RatingButton from '../common/rating-button.svelte';
    import SubDivisionAdjustButton from '../common/sub-division-adjust-button.svelte';
    import ShareConfigButton from '../common/share-config-button.svelte';
    import UndoRedoButton from '../common/undo-redo-button.svelte';
    import PageResizeHandler from '../common/page-resize-handler.svelte';
    import SelectScollable from '../common/select-scollable.svelte';
    import MidiReplayButton from '../common/midi-replay-button.svelte';

    /**
     * contains the app meta information defined in App.js
     */
    export let appInfo;

    const TWO_PI = Math.PI * 2;

    let canvas;
    let width = 900;
    let height = 800;
    // settings
    let tempo = 120;
    let grid = GRIDS[0].divisions;
    let binNote = 64;
    let adjustTime = 0;
    let showKde = false;
    // data
    let firstTimeStamp = 0;
    let notes = [];

    const noteOn = (e) => {
        if (notes.length === 0) {
            firstTimeStamp = e.timestamp;
        }
        const noteInSeconds = (e.timestamp - firstTimeStamp) / 1000;
        notes = [...notes, noteInSeconds];
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

        const adjustedNotes = notes.map((d) => d + adjustTime);

        const clamped = adjustedNotes.map((d) => d % circleSeconds);
        const noteAngles = clamped.map((d) => (d / circleSeconds) * TWO_PI);
        const maxBinHeight = r * 0.2;

        // for 3/4 bars there are less bins
        const binCount = (binNote * grid1) / 4;

        // draw wegdes for 'good enough' (OK area)
        ctx.fillStyle = '#f8f8f8';
        const wedgeSize = TWO_PI / binCount;
        const wedges = d3
            .range(grid1 * grid2)
            .map((d) => (TWO_PI / (grid1 * grid2)) * d - topOffs);
        const rWedge = height / 2;
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
            let pad = 0.1;
            let bins = 360;
            const density1d = kde.density1d(noteAngles, {
                bandwidth,
                pad,
                bins,
            });
            const points = density1d.bandwidth(bandwidth);
            const maxValue = d3.max([...points], (d) => d.y);
            // smooth around first and last point
            // console.log([...points]);
            ctx.beginPath();
            for (const p of points) {
                const angle = p.x - topOffs;
                const rp = r + (p.y / maxValue) * maxBinHeight;
                const dx = Math.cos(angle);
                const dy = Math.sin(angle);
                ctx.lineTo(cx + dx * rp, cy + dy * rp);
            }
            ctx.closePath();
            ctx.fillStyle = COLORS.accent;
            ctx.fill();
            ctx.strokeStyle = '#aaa';
            ctx.stroke();
        }

        // draw notes
        if (adjustedNotes.length > 0) {
            ctx.lineWidth = 2;
            ctx.strokeStyle = '#888';
            const lastNotes = adjustedNotes;
            const layerCount =
                Math.floor(adjustedNotes.at(-1) / circleSeconds) + 1;
            const layerSize = (height / 2 - r - maxBinHeight - 10) / layerCount;
            for (const [i, n] of lastNotes.entries()) {
                const angle = (n / circleSeconds) * TWO_PI - topOffs;
                const dx = Math.cos(angle);
                const dy = Math.sin(angle);
                const layer = Math.max(0, Math.floor(n / circleSeconds));
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
            for (let i = 0; i < layerCount; i++) {
                const layerR = r + maxBinHeight + i * layerSize + 5;
                Canvas.drawCircle(ctx, cx, cy, layerR);
            }
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

        // score of how many notes are in the OK area
        if (notes.length > 0) {
            const ok = computeSubdivisionOkScore(
                notes,
                grid,
                tempo,
                binNote,
                adjustTime,
            );
            ctx.fillText(
                ((ok / notes.length) * 100).toFixed() + '%',
                cx,
                cy + 7,
            );
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
        showKde = json.showKde ?? false;
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

<main class="app">
    <h2>{appInfo.title}</h2>
    <p class="explanation">
        Choose your tempo and subdivision, and start playing. The bar or area
        chart will show you a summary of when you played notes. Use the
        integrated metronome. All notes will be timed relative to the first one,
        but you can adjust all notes to make them earlier or later in case you
        messed up the first. Each bar you play will be shown its own layer
        around the circle. The lightgray areas show where a note would have to
        be to be timed well (depending on the binning setting), the score in the
        center shows the percentage of notes that are inside these areas.<br />
        <i>
            Try playing without looking and focus on the metronome. Try to play
            all notes such that they are within a gray area!
        </i>
    </p>
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
    <div class="control">
        <TempoInput bind:value="{tempo}" callback="{draw}" />
        <SelectScollable
            label="grid"
            title="The whole circle is one bar, you can choose to divide it by 3 or 4 quarter notes and then further sub-divide it into, for example, triplets"
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
        <SubDivisionAdjustButton
            bind:adjustTime
            {tempo}
            {grid}
            {notes}
            {draw}
        />
        <button
            title="Toggle between bars and area"
            on:click="{() => {
                showKde = !showKde;
                draw();
            }}"
        >
            {showKde ? 'area' : 'bars'}
        </button>
    </div>
    <div class="visualization">
        <canvas
            bind:this="{canvas}"
            style="width: {width}px; height: {height}px"
        ></canvas>
    </div>
    <div class="control">
        <MetronomeButton {tempo} accent="{+grid.split(':')[0]}" />
        <UndoRedoButton bind:data="{notes}" callback="{draw}" />
        <ResetNotesButton bind:notes {saveToStorage} callback="{draw}" />
        <ImportExportButton {loadData} {getExportData} appId="{appInfo.id}" />
        <button on:click="{() => loadData(example)}"> example </button>
        <HistoryButton appId="{appInfo.id}" {loadData} />
        <MidiReplayButton bind:notes callback="{draw}" />
        <ShareConfigButton {getExportData} {loadData} appId="{appInfo.id}" />
    </div>
    <RatingButton appId="{appInfo.id}" />
    <MidiInput {noteOn} {controlChange} />
    <PcKeyboardInput
        key=" "
        keyDown="{() => noteOn({ timestamp: performance.now() })}"
    />
    <PageResizeHandler callback="{draw}" />
    <TouchInput
        element="{canvas}"
        touchStart="{() => noteOn({ timestamp: performance.now() })}"
    />
</main>
