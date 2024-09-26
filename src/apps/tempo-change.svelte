<script>
    import { onDestroy, onMount } from 'svelte';
    import * as Plot from '@observablehq/plot';
    import * as d3 from 'd3';
    import ResetNotesButton from '../common/reset-notes-button.svelte';
    import ImportExportButton from '../common/import-export-button.svelte';
    import MetronomeButton from '../common/metronome-button.svelte';
    import ExerciseDrawer from '../common/exercise-drawer.svelte';
    import RatingButton from '../common/rating-button.svelte';
    import MidiInput from '../common/midi-input.svelte';
    import PcKeyboardInput from '../common/pc-keyboard-input.svelte';
    import TouchInput from '../common/touch-input.svelte';
    import { secondsPerBeatToBpm } from '../lib/lib';
    import ShareConfigButton from '../common/share-config-button.svelte';
    import { localStorageAddRecording } from '../lib/localstorage';
    import HistoryButton from '../common/history-button.svelte';
    import example from '../example-recordings/tempo-change.json';
    import NumberInput from '../common/number-input.svelte';
    import MidiReplayButton from '../common/midi-replay-button.svelte';

    /**
     * contains the app meta information defined in App.js
     */
    export let appInfo;

    let width = 900;
    let height = 600;
    let container;
    let firstTimeStamp;
    // settings
    // let pastTime = 60;
    let timeBinSize = 2;
    let tempoBinSize = 5;
    // data
    let notes = [];

    const estimateTempo = (onsets) => {
        const bpmValues = [];

        // bin into 5 second time bins
        const binTime = d3
            .bin()
            .domain([0, onsets.at(-1)])
            .thresholds(d3.range(0, onsets.at(-1) + timeBinSize, timeBinSize));
        const binnedByTime = binTime(onsets);
        // handle each time bin separately
        for (const timeBin of binnedByTime) {
            // get IOIs
            const iois = timeBin.map((d, i) =>
                i === 0 ? 0 : d - timeBin[i - 1],
            );
            // filter IOIs
            const filtered = iois.filter((d) => d > 0.025 && d < 1.5);
            const bpms = filtered.map((d) => {
                // convert to bpm
                d = secondsPerBeatToBpm(d);
                // fold into assumed bpm range
                while (d > 180) {
                    d /= 2;
                }
                while (d < 60) {
                    d *= 2;
                }
                return d;
            });
            // bin into bins of 5 bpms
            const binBpms = d3
                .bin()
                .domain([60, 180])
                .thresholds(d3.range(60, 185, tempoBinSize));
            const binnedByBpm = binBpms(bpms);
            for (const bpm of binnedByBpm) {
                if (bpm.length > 0)
                    bpmValues.push({
                        time0: timeBin.x0,
                        time1: timeBin.x1,
                        tempo0: bpm.x0,
                        tempo1: bpm.x1,
                        count: bpm.length,
                        confidence: bpm.length / filtered.length,
                    });
            }
        }
        return bpmValues;
    };

    const noteOn = (e) => {
        if (notes.length === 0) {
            firstTimeStamp = e.timestamp;
        }
        const noteInSeconds = (e.timestamp - firstTimeStamp) / 1000;
        notes.push(noteInSeconds);
        draw();
    };

    const draw = () => {
        container.textContent = '';
        const bpmValues = estimateTempo(notes);
        let now = 0;
        if (bpmValues.length > 0) {
            now = bpmValues.at(-1).time1;
        }
        // const minTime = now - pastTime;

        const plot = Plot.plot({
            width,
            height,
            // marginLeft: 80,
            marginBottom: 50,
            padding: 0,
            x: {
                label: 'time in seconds',
            },
            y: {
                label: 'tempo in BPM',
                grid: true,
            },
            color: {
                label: 'confidence',
                scheme: 'Blues',
                legend: true,
                marginLeft: width * 0.3,
                width: width * 0.6,
                type: 'quantize',
                domain: [0, 1],
            },
            marks: [
                Plot.ruleY([60, 90, 120, 150, 180]),
                // workaround to have smoother time
                Plot.ruleX([notes.at(-1)], { opacity: 0 }),
                Plot.rect(bpmValues, {
                    x1: 'time0',
                    x2: 'time1',
                    y1: 'tempo0',
                    y2: 'tempo1',
                    fill: 'confidence',
                    clip: true,
                    tip: true,
                }),
            ],
        });
        container.appendChild(plot);
    };

    /**
     * Used for exporting and for automatics saving
     */
    const getExportData = () => {
        return {
            timeBinSize,
            tempoBinSize,
            // data
            notes,
        };
    };

    /**
     * Import data from file or example
     */
    const loadData = (json) => {
        timeBinSize = json.timeBinSize;
        tempoBinSize = json.tempoBinSize;
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

    onMount(draw);

    onDestroy(saveToStorage);
</script>

<main class="app">
    <h2>{appInfo.title}</h2>
    <p class="explanation">
        This app helps practicing tempo changes. Start playing at one tempo then
        change to another one as accurately as you can. The chart shows you the
        tempo over time, so can see whether you changed correctly. <i
            >This app assumes tempi between 60 and 180 bpm. Try playing without
            looking!</i
        >
    </p>
    <ExerciseDrawer>
        <p>1) Play at a contant tempo.</p>
        <p>2) Start with tempo 90 and suddenly jump to 150.</p>
        <p>3) Start with tempo 90 and smoothly increase until you reach 150.</p>
        <p>
            4) Switch back and forth between two tempi, try to always hit the
            same two BPM values.
        </p>
    </ExerciseDrawer>
    <div class="control">
        <NumberInput
            title="Size of the time bins in seconds"
            label="time step"
            bind:value="{timeBinSize}"
            callback="{draw}"
            min="{1}"
            max="{10}"
            step="{1}"
        />
        <NumberInput
            title="Size of the tempo bins in BPM"
            label="tempo step"
            bind:value="{tempoBinSize}"
            callback="{draw}"
            min="{2}"
            max="{20}"
            step="{1}"
        />
    </div>
    <div class="visualization" bind:this="{container}"></div>
    <div class="control">
        <MetronomeButton
            tempo="{120}"
            accent="{4}"
            beepCount="{8}"
            showBeepCountInput
        />
        <ResetNotesButton bind:notes {saveToStorage} callback="{draw}" />
        <ImportExportButton {loadData} {getExportData} appId="{appInfo.id}" />
        <button on:click="{() => loadData(example)}"> example </button>
        <HistoryButton appId="{appInfo.id}" {loadData} />
        <MidiReplayButton bind:notes callback="{draw}" />
        <ShareConfigButton {getExportData} {loadData} appId="{appInfo.id}" />
    </div>
    <RatingButton appId="{appInfo.id}" />
    <MidiInput {noteOn} />
    <PcKeyboardInput
        key=" "
        keyDown="{() => noteOn({ timestamp: performance.now() })}"
    />
    <TouchInput
        element="{container}"
        touchStart="{() => noteOn({ timestamp: performance.now() })}"
    />
</main>
