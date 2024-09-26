<script>
    import { onDestroy, onMount } from 'svelte';
    import * as d3 from 'd3';
    import { PitchDetector } from 'pitchy';
    import { Midi, Note } from '@tonaljs/tonal';
    import { Canvas } from 'musicvis-lib';
    import ExerciseDrawer from '../common/exercise-drawer.svelte';
    import RatingButton from '../common/rating-button.svelte';
    import PageResizeHandler from '../common/page-resize-handler.svelte';
    import NumberInput from '../common/number-input.svelte';

    /**
     * contains the app meta information defined in App.js
     */
    export let appInfo;

    // let width = 900;
    let width = 700;
    // let height = 500;
    let height = 360;
    let container;
    let canvas;
    let audioContext;
    let analyserNode;
    let detector;
    let timeout;
    const waitTime = 16;
    // settings
    let pastTime = 0.25;
    let minVolumeDecibels = -25;
    // data
    let firstTimeStamp = 0;
    let bendValues = [];

    function updatePitch(input, sampleRate) {
        analyserNode.getFloatTimeDomainData(input);
        const detected = detector.findPitch(input, sampleRate);
        const pitch = detected[0];
        const clarity = detected[1];
        const note = Note.fromFreq(pitch);
        const noteMidi = Note.midi(note);
        const actualMidi = Midi.freqToMidi(pitch);
        const centsOffset = (actualMidi - noteMidi) * 100;
        const noteInSeconds = (performance.now() - firstTimeStamp) / 1000;
        const bend = {
            time: noteInSeconds,
            pitch,
            note,
            noteMidi,
            actualMidi,
            actualMidiChroma: actualMidi % 12,
            centsOffset,
            clarity,
        };
        bendValues.push(bend);
        bendValues = bendValues.slice(-(1000 / waitTime) * pastTime);
        draw();
        timeout = requestAnimationFrame(() => updatePitch(input, sampleRate));
    }

    const draw = () => {
        const cx = width / 2;
        const cy = height - 10;
        const r = width * 0.45;
        const r2 = width * 0.35;
        const r3 = width * 0.4;
        const r4 = width * 0.3;
        const r5 = width * 0.1;
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

        // scales from -50 on the left to 50 on the right
        const scaleRad = d3
            .scaleLinear()
            .domain([-50, 50])
            .range([-Math.PI, 0]);

        // draw needle
        const offsetMean = d3.mean(bendValues, (d) => d.centsOffset);
        ctx.lineWidth = 10;
        ctx.lineCap = 'round';
        ctx.strokeStyle = '#aaa';
        if (offsetMean > -100) {
            const angle = scaleRad(offsetMean);
            const dx = Math.cos(angle);
            const dy = Math.sin(angle);
            ctx.beginPath();
            ctx.moveTo(cx + dx * r5, cy + dy * r5);
            ctx.lineTo(cx + dx * r, cy + dy * r);
            ctx.stroke();
        }
        ctx.fillStyle = 'white';
        Canvas.drawCircle(ctx, cx, cy, r5);
        ctx.lineWidth = 2;
        ctx.stroke();

        // grid
        ctx.lineWidth = 2;
        ctx.fill();
        ctx.stroke();
        // grid angles
        const coarseGridAngles = d3.range(-50, 51, 25).map(scaleRad);
        const fineGridAngles = d3.range(-50, 51, 5).map(scaleRad);
        // draw grid ticks
        ctx.beginPath();
        ctx.lineWidth = 2;
        for (const g of coarseGridAngles) {
            const dx = Math.cos(g);
            const dy = Math.sin(g);
            ctx.moveTo(cx + dx * r2, cy + dy * r2);
            ctx.lineTo(cx + dx * r, cy + dy * r);
        }
        ctx.stroke();
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (const g of fineGridAngles) {
            const dx = Math.cos(g);
            const dy = Math.sin(g);
            ctx.moveTo(cx + dx * r3, cy + dy * r3);
            ctx.lineTo(cx + dx * r, cy + dy * r);
        }
        ctx.stroke();
        // labels
        ctx.fillStyle = '#888';
        ctx.font = '30px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        // ctx.save();
        // ctx.translate(100, 100);
        // ctx.rotate(r);
        // ctx.fillText(word1, -word1Width / 2, 4);
        // ctx.restore();
        ctx.fillText('too low', cx - width * 0.35, height * 0.15);
        ctx.fillText('too high', cx + width * 0.35, height * 0.15);
        // ticks
        for (const tick of [-50, -25, 0, 25, 50]) {
            const g = scaleRad(tick);
            const dx = Math.cos(g);
            const dy = Math.sin(g);
            ctx.fillText(tick, cx + dx * r4, cy + dy * r4);
        }
        // note
        ctx.font = '60px Arial';
        if (bendValues.length > 0) {
            const note = d3.mode(bendValues, (d) => d.note);
            ctx.fillText(note, cx, cy - 20);
        }
    };

    onMount(() => {
        firstTimeStamp = performance.now();
        audioContext = new window.AudioContext();
        analyserNode = audioContext.createAnalyser();
        navigator.mediaDevices.getUserMedia({ audio: true }).then((stream) => {
            audioContext.createMediaStreamSource(stream).connect(analyserNode);
            detector = PitchDetector.forFloat32Array(analyserNode.fftSize);
            detector.minVolumeDecibels = minVolumeDecibels;
            const input = new Float32Array(detector.inputLength);
            updatePitch(input, audioContext.sampleRate);
        });
        draw();
    });

    onDestroy(() => {
        clearTimeout(timeout);
        cancelAnimationFrame(timeout);
    });
</script>

<main class="app">
    <h2>{appInfo.title}</h2>
    <p class="explanation">
        This app helps practicing hitting the correct pitch (for example an
        exact C) or playing/singing off-tune. Similar to a tuner, the needle
        shows you how far you are off the closest note in cents (0 is perfectly
        on the note, +/-50% is extactly between two valid notes).
    </p>
    <ExerciseDrawer>
        <p>1) Play or sing a note as accurately as possible.</p>
        <p>2) Bend/sing a note 25 cents higher (for example as a vibrato).</p>
    </ExerciseDrawer>
    <div class="control">
        <NumberInput
            label="past seconds"
            bind:value="{pastTime}"
            callback="{draw}"
            min="{0.05}"
            max="{1}"
            step="{0.05}"
        />
        <NumberInput
            title="The minimum loudness in decibels for a sound to be registered as input. Lower means fainter notes will be registered but there will be more noise such as octave errors."
            label="min. decibels"
            bind:value="{minVolumeDecibels}"
            callback="{() => (detector.minVolumeDecibels = minVolumeDecibels)}"
            min="{-40}"
            max="{-5}"
            step="{5}"
        />
        <button
            title="Press this button if your browser prevents audio access because there needs to be a user interaction first"
            on:click="{() => audioContext.resume()}"
        >
            resume
        </button>
    </div>
    <div class="visualization" bind:this="{container}">
        <canvas
            bind:this="{canvas}"
            style="width: {width}px; height: {height}px"
        ></canvas>
    </div>
    <RatingButton appId="{appInfo.id}" />
    <PageResizeHandler callback="{draw}" />
</main>
