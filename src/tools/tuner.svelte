<script>
    import { Note, Midi } from '@tonaljs/tonal';
    import { PitchDetector } from 'pitchy';
    import { onDestroy, onMount } from 'svelte';
    import * as Plot from '@observablehq/plot';
    /**
     * https://github.com/ianprime0509/pitchy
     * https://ianjohnson.dev/pitchy/
     */

    export let toolInfo;
    let width = 900;
    let height = 300;
    let container;
    let audioContext;
    let analyserNode;
    let timeout;
    // settings
    // let minVolumeDecibels = -10;
    let minVolumeDecibels = -20;
    // data
    let pitch = 0;
    let clarity = 0;
    let note = '';
    let noteMidi = 0;
    let centsOffset = 0;
    let offsetHistory = [];

    function updatePitch(analyserNode, detector, input, sampleRate) {
        analyserNode.getFloatTimeDomainData(input);
        const detected = detector.findPitch(input, sampleRate);
        pitch = detected[0];
        clarity = detected[1];
        note = Note.fromFreq(pitch);
        noteMidi = Note.midi(note);
        centsOffset = (Midi.freqToMidi(pitch) - noteMidi) * 100;
        // keep last 10 offsets
        offsetHistory = [...offsetHistory.slice(-50), centsOffset];
        draw();
        timeout = requestAnimationFrame(() =>
            updatePitch(analyserNode, detector, input, sampleRate),
        );
    }

    /**
     * Draw visualization
     */
    const draw = () => {
        container.textContent = '';
        // plot
        const plot = Plot.plot({
            width,
            height,
            marginLeft: 40,
            x: {
                label: 'offset in cents',
                domain: [-50, 50],
            },
            y: {
                reverse: true,
                ticks: [],
            },
            marks: [
                // beat marks
                Plot.ruleX([-50, 0, 50], {
                    stroke: '#ddd',
                }),
                // bar marks
                Plot.tickX(offsetHistory, {
                    stroke: '#333',
                    x: (d) => d,
                    y: (d, i) => i,
                }),
            ],
        });
        container.appendChild(plot);
    };

    onMount(() => {
        audioContext = new window.AudioContext();
        analyserNode = audioContext.createAnalyser();

        navigator.mediaDevices.getUserMedia({ audio: true }).then((stream) => {
            audioContext.createMediaStreamSource(stream).connect(analyserNode);
            const detector = PitchDetector.forFloat32Array(
                analyserNode.fftSize,
            );
            detector.minVolumeDecibels = minVolumeDecibels;
            const input = new Float32Array(detector.inputLength);
            updatePitch(analyserNode, detector, input, audioContext.sampleRate);
        });
    });

    onDestroy(() => {
        cancelAnimationFrame(timeout);
    });
</script>

<main class="app">
    <h2>{toolInfo.title}</h2>
    <p class="explanation">
        Allow microphone access and make a sound, the detected pitch will be
        displayed below together with the closest note and the offset from this
        notes in cents.
    </p>
    <div class="control"></div>
    <div>
        <div>frequency: {pitch.toFixed(1)} Hz</div>
        <div>clarity: {(clarity * 100).toFixed()} %</div>
        <div>note: <b>{note}</b></div>
        <!-- <div>+/- cents: {centsOffset.toFixed()}</div> -->
        <!-- <button on:click="{() => audioContext.resume()}"> resume </button> -->
    </div>
    <div class="visualization" bind:this="{container}"></div>
</main>
