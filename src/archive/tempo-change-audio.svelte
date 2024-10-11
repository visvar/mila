<script>
    import { onDestroy, onMount } from 'svelte';
    import * as Plot from '@observablehq/plot';
    import {
        createRealTimeBpmProcessor,
        getBiquadFilter,
    } from 'realtime-bpm-analyzer';
    import ResetNotesButton from '../common/input-elements/reset-notes-button.svelte';
    import ExportButton2 from '../common/export-button2.svelte';
    import ImportExportButton from '../common/input-elements/import-export-share-button.svelte';
    import MetronomeButton from '../common/input-elements/metronome-button.svelte';
    import ExerciseDrawer from '../common/exercise-drawer.svelte';
    import RatingButton from '../common/input-elements/rating-button.svelte';

    /**
     * TODO: try https://github.com/chrvadala/music-beat-detector
     */

    /**
     * contains the app meta information defined in App.js
     */
    export let appInfo;

    let width = 1000;
    let height = 600;
    let container;
    let timeout;
    let paused = false;
    let firstTimeStamp = performance.now();
    let audioContext = new window.AudioContext();
    let source;
    // settings
    let pastTime = 10;
    // data
    let bpmValues = [];

    const draw = () => {
        if (!container) {
            return;
        }
        container.textContent = '';
        let now;
        if (bpmValues.length > 0) {
            now = bpmValues.at(-1).time;
        } else {
            now = (performance.now() - firstTimeStamp) / 1000;
        }
        const minTime = now - pastTime;

        const plot2 = Plot.plot({
            width,
            height,
            // marginLeft: 80,
            marginBottom: 50,
            padding: 0,
            x: {
                domain: [minTime, now],
                label: 'time in seconds',
            },
            y: {
                label: 'tempo in BPM',
                grid: true,
            },
            marks: [
                Plot.ruleY([60, 90, 120, 150]),
                Plot.dot(bpmValues, {
                    x: 'time',
                    y: 'tempo',
                    r: 'count',
                    clip: true,
                }),
            ],
        });
        container.appendChild(plot2);
    };

    const startStream = () => {
        // analyserNode = audioContext.createAnalyser();
        navigator.mediaDevices
            .getUserMedia({ audio: true })
            .then(async (stream) => {
                const realtimeAnalyzerNode = await createRealTimeBpmProcessor(
                    audioContext,
                    {
                        continuousAnalysis: true,
                        // Default value is 20_000ms after what the library will automatically delete all collected data and restart analyzing BPM
                        stabilizationTime: 5_000,
                    },
                );

                source = audioContext.createMediaStreamSource(stream);
                const lowpass = getBiquadFilter(audioContext);
                // Connect nodes together
                source.connect(lowpass).connect(realtimeAnalyzerNode);
                // source.connect(audioContext.destination);
                realtimeAnalyzerNode.port.onmessage = (event) => {
                    if (event.data.message === 'BPM') {
                        console.log('BPM', event.data.data.bpm);
                    }
                    if (event.data.message === 'BPM_STABLE') {
                        console.log('BPM_STABLE', event.data.data.bpm);
                    }
                    if (
                        event.data.message === 'BPM' ||
                        event.data.message === 'BPM_STABLE'
                    ) {
                        if (bpmValues.length === 0) {
                            firstTimeStamp = performance.now();
                        }
                        const time =
                            (performance.now() - firstTimeStamp) / 1000;
                        for (const bpm of event.data.data.bpm) {
                            bpmValues.push({
                                time,
                                tempo: bpm.tempo,
                                count: bpm.count,
                            });
                        }
                        draw();
                    }
                };
            });
        draw();
    };

    onMount(startStream);

    /**
     * Used for exporting and for automatics saving
     */
    const getExportData = () => {
        return {
            pastTime,
            firstTimeStamp,
            bpmValues,
        };
    };

    /**
     * Import data from file or example
     */
    const loadData = (json) => {
        if (
            bpmValues.length === 0 ||
            confirm('Import data and overwrite currently unsaved data?')
        ) {
            // pause first
            paused = true;
            cancelAnimationFrame(timeout);
            // load
            pastTime = json.pastTime;
            firstTimeStamp = json.firstTimeStamp;
            bpmValues = json.bpmValues;
            draw();
        }
    };

    onDestroy(() => {
        source.disconnect();
    });
</script>

<main class="app">
    <h2>{appInfo.title}</h2>
    <p class="explanation">
        Allow microphone access and play first at one tempo then change to
        another one. The chart shows you the tempo over time, so can see whether
        you changed correctly.
    </p>
    <ExerciseDrawer>
        <p>1) Play at a contant tempo.</p>
        <p>2) Suddenly double your tempo.</p>
        <p>
            3) Smoothly increase your tempo until you reach about double your
            initial one.
        </p>
        <p>
            4) Switch back and forth between two tempi, try to always hit the
            same two BPM values.
        </p>
    </ExerciseDrawer>
    <div class="control">
        <button
            style="width: 75px"
            on:click="{() => {
                paused = !paused;
                if (!paused) {
                    startStream();
                } else {
                    source.disconnect();
                }
            }}"
        >
            {paused ? 'play' : 'pause'}
        </button>
        <label>
            past seconds
            <input
                type="number"
                bind:value="{pastTime}"
                on:change="{draw}"
                min="5"
                max="60"
                step="5"
            />
        </label>
        <button
            title="Press this button if your browser prevents audio access because there needs to be a user interaction first"
            on:click="{() => {
                audioContext.resume();
                startStream();
            }}"
        >
            resume
        </button>
    </div>
    <div class="visualization" bind:this="{container}"></div>
    <div class="control">
        <MetronomeButton
            tempo="{120}"
            accent="{4}"
            beepCount="{8}"
            showBeepCountInput
        />
        <ResetNotesButton
            bind:notes="{bpmValues}"
            saveToStorage="{// otherwise too much data
            () => {}}"
            callback="{() => {
                firstTimeStamp = performance.now();
                draw();
            }}"
        />
        <ExportButton2 {getExportData} appId="{appInfo.id}" />
        <ImportExportButton {loadData} />
    </div>
    <RatingButton appId="{appInfo.id}" />
</main>
