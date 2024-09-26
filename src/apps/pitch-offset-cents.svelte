<script>
    import { onDestroy, onMount } from 'svelte';
    import * as Plot from '@observablehq/plot';
    import * as d3 from 'd3';
    import { PitchDetector } from 'pitchy';
    import { Midi, Note } from '@tonaljs/tonal';
    import ResetNotesButton from '../common/reset-notes-button.svelte';
    import ImportExportButton from '../common/import-export-button.svelte';
    import { toggleOffIcon, toggleOnIcon } from '../lib/icons';
    import example from '../example-recordings/pitch-offset-cents.json';
    import ExerciseDrawer from '../common/exercise-drawer.svelte';
    import RatingButton from '../common/rating-button.svelte';
    import ShareConfigButton from '../common/share-config-button.svelte';
    import PcKeyboardInput from '../common/pc-keyboard-input.svelte';
    import NumberInput from '../common/number-input.svelte';

    /**
     * contains the app meta information defined in App.js
     */
    export let appInfo;

    let width = 900;
    let height = 500;
    let container;
    let analyserNode;
    let detector;
    let timeout;
    let paused = false;
    let firstTimeStamp = performance.now();
    let audioContext = new window.AudioContext();
    let closestNote;
    // settings
    let pastTime = 10;
    let minVolumeDecibels = -25;
    let colorArea = false;
    // data
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
            note,
            pitch,
            noteMidi,
            actualMidi,
            actualMidiChroma: actualMidi % 12,
            centsOffset,
            clarity,
        };
        bendValues.push(bend);
        draw();
        timeout = requestAnimationFrame(() => updatePitch(input, sampleRate));
    }

    const draw = () => {
        if (!container) {
            return;
        }
        closestNote = d3.mode(bendValues.slice(-30), (d) => d.note);
        container.textContent = '';
        let now;
        if (bendValues.length > 0) {
            now = bendValues.at(-1).time;
        } else {
            now = (performance.now() - firstTimeStamp) / 1000;
        }
        const minTime = now - pastTime;
        const plot2 = Plot.plot({
            width,
            height,
            marginBottom: 50,
            padding: 0,
            x: {
                domain: [minTime, now],
                label: 'time in seconds',
            },
            y: {
                domain: [-50, 50],
                label: 'offset in cents',
                grid: true,
            },
            marks: [
                Plot.axisY({ anchor: 'left', tickSize: 0 }),
                Plot.axisY({ anchor: 'right', tickSize: 0 }),
                Plot.ruleY([0]),
                Plot.line(bendValues, {
                    x: 'time',
                    y: 'centsOffset',
                    clip: true,
                    // smooth a bit
                    curve: 'basis',
                }),
                colorArea
                    ? Plot.differenceY(bendValues, {
                          // Plot.windowY(10, {
                          x: 'time',
                          y1: 'centsOffset',
                          y2: 0,
                          clip: true,
                          curve: 'basis',
                          positiveFill: 'var(--accent)',
                          negativeFill: '#eeccbb',
                          // tip: true,
                      })
                    : null,
            ],
        });
        container.appendChild(plot2);
    };

    const getPitchFromAudio = () => {
        analyserNode = audioContext.createAnalyser();
        navigator.mediaDevices.getUserMedia({ audio: true }).then((stream) => {
            audioContext.createMediaStreamSource(stream).connect(analyserNode);
            detector = PitchDetector.forFloat32Array(analyserNode.fftSize);
            detector.minVolumeDecibels = minVolumeDecibels;
            const input = new Float32Array(detector.inputLength);
            updatePitch(input, audioContext.sampleRate);
        });
        draw();
    };

    onMount(getPitchFromAudio);

    /**
     * Used for exporting and for automatics saving
     */
    const getExportData = () => {
        return {
            pastTime,
            firstTimeStamp,
            minVolumeDecibels,
            colorArea,
            bendValues,
        };
    };

    /**
     * Import data from file or example
     */
    const loadData = (json) => {
        // pause first
        paused = true;
        cancelAnimationFrame(timeout);
        // load
        pastTime = json.pastTime;
        firstTimeStamp = json.firstTimeStamp;
        minVolumeDecibels = json.minVolumeDecibels;
        colorArea = json.colorArea ?? false;
        bendValues = json.bendValues;
        draw();
    };

    onDestroy(() => {
        clearTimeout(timeout);
        cancelAnimationFrame(timeout);
    });

    const pause = () => {
        paused = !paused;
        if (!paused) {
            getPitchFromAudio();
        } else {
            cancelAnimationFrame(timeout);
        }
    };
</script>

<main class="app">
    <h2>{appInfo.title}</h2>
    <p class="explanation">
        Allow microphone access and play pitch bends or vibratos. The line chart
        below shows how far you bend up and down over time.
    </p>
    <ExerciseDrawer>
        <p>1) Play or sing a note as accurately as possible.</p>
        <p>2) Bend/sing a note 25 cents higher (for example as a vibrato).</p>
    </ExerciseDrawer>
    {#if bendValues.length > 0}
        <p>
            Current closest note: {closestNote}
        </p>
    {/if}
    <div class="control">
        <button
            title="Pause the moving visualization (shortcut: space)"
            style="width: 75px"
            on:click="{pause}"
        >
            {paused ? 'play' : 'pause'}
        </button>
        <NumberInput
            label="past seconds"
            bind:value="{pastTime}"
            callback="{draw}"
            min="{5}"
            max="{60}"
            step="{5}"
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
            title="Use blue for low and red for high"
            on:click="{() => {
                colorArea = !colorArea;
                draw();
            }}"
        >
            colors {colorArea ? toggleOnIcon : toggleOffIcon}
        </button>
        <button
            title="Press this button if your browser prevents audio access because there needs to be a user interaction first"
            on:click="{() => {
                audioContext.resume();
                getPitchFromAudio();
            }}"
        >
            resume
        </button>
    </div>
    <div class="visualization" bind:this="{container}"></div>
    <div class="control">
        <ResetNotesButton
            bind:notes="{bendValues}"
            saveToStorage="{// too much data
            () => {}}"
            callback="{() => {
                firstTimeStamp = performance.now();
                draw();
            }}"
        />>
        <ImportExportButton {loadData} {getExportData} appId="{appInfo.id}" />
        <button on:click="{() => loadData(example)}"> example </button>
        <!-- <HistoryButton appId="{appInfo.id}" {loadData} /> -->
        <ShareConfigButton {getExportData} {loadData} appId="{appInfo.id}" />
    </div>
    <RatingButton appId="{appInfo.id}" />
    <PcKeyboardInput key=" " keyDown="{pause}" />
</main>
