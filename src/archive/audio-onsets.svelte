<script>
    import { onDestroy, onMount } from 'svelte';
    import * as Plot from '@observablehq/plot';
    import { Essentia, EssentiaWASM } from 'essentia.js';

    /**
     * tested with essentia 2.1-beta6-dev
     */

    let essentia = new Essentia(EssentiaWASM.EssentiaWASM);
    console.log(essentia);
    console.log(essentia.version);
    console.log(essentia.algorithmNames);

    const audioCtx = new AudioContext();

    const test = async () => {
        let audioURL =
            'https://freesound.org/data/previews/328/328857_230356-lq.mp3';

        // decode audio data
        const audioBuffer = await essentia.getAudioBufferFromURL(
            audioURL,
            audioCtx,
        );

        /* OR
         * you could also decode audio from any other
         * source and pass to an essentia algorithm. */

        // convert the JS float32 typed array into std::vector<float>
        const inputSignalVector = essentia.arrayToVector(
            audioBuffer.getChannelData(0),
        );

        // Computing ReplayGain from an input audio signal vector
        // The algorithm return float type
        // check https://essentia.upf.edu/reference/std_ReplayGain.html
        let outputRG = essentia.ReplayGain(
            inputSignalVector, // input
            44100,
        ); // sampleRate (parameter optional)

        console.log(outputRG.replayGain);

        // Running PitchYinProbabilistic algorithm on an input audio signal vector
        // check https://essentia.upf.edu/reference/std_PitchYinProbabilistic.html
        let outputPyYin = essentia.PitchYinProbabilistic(
            inputSignalVector, // input
            // parameters (optional)
            4096, // frameSize
            256, // hopSize
            0.1, // lowRMSThreshold
            'zero', // outputUnvoiced,
            false, // preciseTime
            44100,
        ); //sampleRate

        let pitches = essentia.vectorToArray(outputPyYin.pitch);
        let voicedProbabilities = essentia.vectorToArray(
            outputPyYin.voicedProbabilities,
        );

        console.log(pitches);
        console.log(voicedProbabilities);

        outputPyYin.pitch.delete();
        outputPyYin.voicedProbabilities.delete();
    };
    test();

    export let toolInfo;
    let width = 1000;
    let height = 500;
    let container;
    // settings
    let pastSeconds = 30;

    // data
    let firstTimeStamp = 0;
    let notes = [];
    let currentAniFrame = null;

    const noteOn = (e) => {
        const noteInSeconds = (e.timestamp - firstTimeStamp) / 1000;
        const note = {
            number: e.note.number,
            velocity: e.rawVelocity,
            time: noteInSeconds,
            channel: e.message.channel,
        };

        notes.push(note);
    };

    const draw = () => {
        const maxTime = (performance.now() - firstTimeStamp) / 1000;
        const minTime = maxTime - pastSeconds;
        // only handle recent notes
        const filtered = notes.filter(
            (d) => d.end > minTime || d.end === undefined,
        );
        // plot
        const plot = Plot.plot({
            insetRight: 10,
            width,
            height,
            marginBottom: 40,
            padding: 0,
            x: {
                label: 'Time in seconds',
                domain: [minTime, maxTime],
            },
            y: {},
            marks: [
                // current time
                Plot.ruleX([maxTime], { stroke: '#888' }),
                Plot.tickX(filtered, {
                    clip: true,
                    x1: 'time',
                }),
            ],
        });
        container.textContent = '';
        container.appendChild(plot);
        currentAniFrame = requestAnimationFrame(draw);
    };

    onMount(() => {
        firstTimeStamp = performance.now();
        currentAniFrame = requestAnimationFrame(draw);
    });

    onDestroy(() => {
        cancelAnimationFrame(currentAniFrame);
        essentia.shutdown();
        essentia.delete();
    });
</script>

<main class="app">
    <h2>{toolInfo.title}</h2>
    <p class="explanation"></p>
    <div class="control">
        <label title="time in seconds for past notes to be shown">
            time
            <input
                type="number"
                bind:value="{pastSeconds}"
                min="10"
                max="300"
                step="10"
            />
        </label>
    </div>
    <div class="visualization" bind:this="{container}"></div>
    <div class="control">
        <button
            title="Clear all played notes"
            on:click="{() => {
                if (confirm('Reset played notes?')) {
                    notes = [];
                    firstTimeStamp = performance.now();
                }
            }}"
        >
            reset
        </button>
    </div>
</main>
