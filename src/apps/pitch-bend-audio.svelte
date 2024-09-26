<script>
    import { onDestroy, onMount } from 'svelte';
    import * as Plot from '@observablehq/plot';
    import { PitchDetector } from 'pitchy';
    import { Midi, Note } from '@tonaljs/tonal';
    import * as d3 from 'd3';
    import { toggleOffIcon, toggleOnIcon } from '../lib/icons';
    import ResetNotesButton from '../common/reset-notes-button.svelte';
    import ImportExportButton from '../common/import-export-button.svelte';
    import example from '../example-recordings/pitch-bend-audio.json';
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
    let height = 600;
    let container;
    let analyserNode;
    let detector;
    let timeout;
    const waitTime = 16;
    let paused = false;
    let firstTimeStamp = performance.now();
    let audioContext = new window.AudioContext();
    // settings
    let pastTime = 10;
    let ignoreOctave = true;
    let minVolumeDecibels = -20;
    // data
    let bendValues = [];
    let lastValidPitch = 0;

    function updatePitch(input, sampleRate) {
        analyserNode.getFloatTimeDomainData(input);
        const detected = detector.findPitch(input, sampleRate);
        const pitch = detected[0];
        const clarity = detected[1];
        // const note = Note.fromFreq(pitch);
        // const noteMidi = Note.midi(note);
        const actualMidi = Midi.freqToMidi(pitch);
        // const centsOffset = (actualMidi - noteMidi) * 100;
        const noteInSeconds = (performance.now() - firstTimeStamp) / 1000;
        const bend = {
            time: noteInSeconds,
            pitch,
            // noteMidi,
            actualMidi,
            actualMidiChroma: actualMidi % 12,
            // centsOffset,
            clarity,
        };
        bendValues.push(bend);
        if (bendValues.length > 3) {
            // removes spikes
            const current = actualMidi;
            const oneAgo = bendValues.at(-2).actualMidi;
            const twoAgo = bendValues.at(-3).actualMidi;
            if (
                Math.abs(current - twoAgo) < 1.5 &&
                Math.abs(current - oneAgo) > 1.5
            ) {
                bendValues.splice(-2, 1);
            }
        }
        // draw
        draw();
        timeout = requestAnimationFrame(() => updatePitch(input, sampleRate));
    }

    const draw = () => {
        if (!container) {
            return;
        }
        container.textContent = '';
        let now;
        if (bendValues.length > 0) {
            now = bendValues.at(-1).time;
        } else {
            now = (performance.now() - firstTimeStamp) / 1000;
        }
        // filter TODO: move this to "remove spikes" above
        const filtered = bendValues.filter((d, i) => {
            return i === 0 || Math.abs(bendValues[i - 1].pitch - d.pitch) < 3;
        });
        const minTime = now - pastTime;
        // plot pitch as MIDI number
        const lastSecond = 1000 / waitTime;
        let medianOfLast = Math.round(
            d3.median(filtered.slice(-lastSecond), (d) => d.actualMidi),
        );
        // make sure we keep a valid number
        if (isNaN(medianOfLast)) {
            medianOfLast = lastValidPitch;
        } else {
            lastValidPitch = medianOfLast;
        }
        const tickFormat = (d) =>
            Math.floor(d) === d
                ? Midi.midiToNoteName(d, {
                      pitchClass: ignoreOctave,
                      sharps: true,
                  })
                : '';
        const plot2 = Plot.plot({
            width,
            height,
            // marginLeft: 80,
            marginBottom: 50,
            padding: 0,
            x: {
                domain: [minTime, now - waitTime / 1000],
                label: 'time in seconds',
            },
            y: {
                domain: ignoreOctave
                    ? [0, 12]
                    : [medianOfLast - 5, medianOfLast + 5],
                label: ignoreOctave ? 'chroma' : 'pitch',
                grid: true,
            },
            marks: [
                Plot.line(filtered, {
                    x: 'time',
                    y: ignoreOctave ? 'actualMidiChroma' : 'actualMidi',
                    clip: true,
                    // smooth a bit
                    curve: 'basis',
                    stroke: '#666',
                    strokeWidth: 2,
                }),
                Plot.axisY({
                    anchor: 'left',
                    tickFormat,
                }),
                Plot.axisY({
                    anchor: 'right',
                    tickFormat,
                }),
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
            ignoreOctave,
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
        ignoreOctave = json.ignoreOctave ?? false;
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
        This app helps practicing pitch bends or vibratos with any instrument
        that supports pitch modulation or with you singing voice. The line chart
        below shows how far you bend up and down over time.
    </p>
    <ExerciseDrawer>
        <p>1) Play/sing a bend by one semitone (for example, A to A#).</p>
        <p>2) Play/sing a bend by two semitones (for example, A to B).</p>
        <p>3) Play/sing a vibrato where you always bend by one semitone.</p>
        <p>
            4) Play/sing a vibrato and then a second one with twice the
            frequency of modulation.
        </p>
        <p>
            5) Slide from one note to a much higher one as smoothly as possible.
        </p>
    </ExerciseDrawer>
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
            title="When ignoring the octave, the lower visualization will only show the note's chroma from C to B"
            on:click="{() => {
                ignoreOctave = !ignoreOctave;
                draw();
            }}"
        >
            octave {!ignoreOctave ? toggleOnIcon : toggleOffIcon}
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
            saveToStorage="{// otherwise too much data
            () => {}}"
            callback="{() => {
                firstTimeStamp = performance.now();
                draw();
            }}"
        />
        <ImportExportButton {loadData} {getExportData} appId="{appInfo.id}" />
        <button on:click="{() => loadData(example)}"> example </button>
        <ShareConfigButton {getExportData} {loadData} appId="{appInfo.id}" />
    </div>
    <RatingButton appId="{appInfo.id}" />
    <PcKeyboardInput key=" " keyDown="{pause}" />
</main>
