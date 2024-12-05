<script>
    import { afterUpdate, onDestroy, onMount } from 'svelte';
    import * as Plot from '@observablehq/plot';
    import * as d3 from 'd3';
    import ResetNotesButton from '../common/input-elements/reset-notes-button.svelte';
    import ImportExportButton from '../common/input-elements/import-export-share-button.svelte';
    import MetronomeButton from '../common/input-elements/metronome-button.svelte';
    import ExerciseDrawer from '../common/exercise-drawer.svelte';
    import RatingButton from '../common/input-elements/rating-button.svelte';
    import MidiInput from '../common/input-handlers/midi-input.svelte';
    import PcKeyboardInput from '../common/input-handlers/pc-keyboard-input.svelte';
    import TouchInput from '../common/input-handlers/touch-input.svelte';
    import { secondsPerBeatToBpm } from '../lib/lib';
    import { localStorageAddRecording } from '../lib/localstorage';
    import HistoryButton from '../common/input-elements/history-button.svelte';
    import example1 from '../example-recordings/tempo-change/tempo-change-e1.json';
    import example2 from '../example-recordings/tempo-change/tempo-change-e2.json';
    import example3 from '../example-recordings/tempo-change/tempo-change-e3.json';
    import example4 from '../example-recordings/tempo-change/tempo-change-e4.json';
    import NumberInput from '../common/input-elements/number-input.svelte';
    import MidiReplayButton from '../common/input-elements/midi-replay-button.svelte';
    import FileDropTarget from '../common/file-drop-target.svelte';
    import InsideTextButton from '../common/input-elements/inside-text-button.svelte';

    /**
     * contains the app meta information defined in App.js
     */
    export let appInfo;

    let width = 900;
    let height = 600;
    let container;
    let firstTimeStamp;
    const minDist = 0.025;
    const minTempo = 90;
    // settings
    let timeBinSize = 5;
    let tempoBinSize = 10;
    let topK = 10;

    // data
    let notes = [];
    // app state
    let isPlaying;
    let isDataLoaded = false;

    const noteOn = (e) => {
        if (notes.length === 0) {
            firstTimeStamp = e.timestamp;
        }
        const noteInSeconds = (e.timestamp - firstTimeStamp) / 1000;
        // ignore note if it comes too early after the previous, as in a chord or due to noise
        if (
            notes.length === 0 ||
            Math.abs(noteInSeconds - notes.at(-1)) > minDist
        ) {
            notes = [...notes, noteInSeconds];
        }
    };

    const estimateTempo = (onsets) => {
        let bpmValues = [];

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
            const filtered = iois.filter((d) => d > minDist && d < 1.5);
            const bpms = filtered.map((d) => {
                // convert to bpm
                d = secondsPerBeatToBpm(d);
                // fold into assumed bpm range
                while (d > 180) {
                    d /= 2;
                }
                while (d < minTempo) {
                    d *= 2;
                }
                d = Math.round(d);
                return d;
            });
            // bin into bins of 5 bpms
            const binBpms = d3
                .bin()
                .domain([minTempo, 180])
                .thresholds(d3.range(minTempo, 181, tempoBinSize));
            const binnedByBpm = binBpms(bpms);
            let currentBpmValues = [];
            for (const bpm of binnedByBpm) {
                if (bpm.length > 0)
                    currentBpmValues.push({
                        time0: timeBin.x0,
                        time1: timeBin.x1,
                        tempo0: bpm.x0,
                        tempo1: bpm.x1,
                        count: bpm.length,
                        // confidence is based on number of notes that vote for this bpm divided by total number of notes in this time bin
                        confidence: bpm.length / filtered.length,
                        max: false,
                    });
            }
            // sort
            currentBpmValues.sort((a, b) => b.confidence - a.confidence);
            currentBpmValues = currentBpmValues.slice(0, topK);
            // mark maximum
            if (currentBpmValues.length > 0) {
                currentBpmValues[0].max = true;
            }
            bpmValues = [...bpmValues, ...currentBpmValues];
        }
        return bpmValues;
    };

    const draw = () => {
        container.textContent = '';
        const bpmValues = estimateTempo(notes);
        let now = 0;
        if (bpmValues.length > 0) {
            now = bpmValues.at(-1).time1;
        }

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
                // type: 'quantize',
                type: 'sqrt',
                domain: [0, 1],
            },
            marks: [
                Plot.rect(bpmValues, {
                    x1: 'time0',
                    x2: 'time1',
                    y1: 'tempo0',
                    y2: 'tempo1',
                    fill: 'confidence',
                    clip: true,
                    tip: true,
                    stroke: 'max',
                    strokeWidth: 1,
                    rx: 3,
                    inset: 1,
                }),
                Plot.ruleY(d3.range(minTempo, 185, 30)),
                // workaround to have smoother time
                Plot.ruleX([notes.at(-1)], { opacity: 0 }),
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
        // app state
        isDataLoaded = true;
    };

    const saveToStorage = () => {
        if (!isDataLoaded && !isPlaying && notes.length > 0) {
            localStorageAddRecording(appInfo.id, getExportData());
        }
    };

    afterUpdate(draw);

    onDestroy(saveToStorage);
</script>

<FileDropTarget {loadData} disabled="{isPlaying}">
    <main class="app">
        <h2>{appInfo.title}</h2>
        <p class="explanation">
            This app helps practicing tempo changes. Start playing at one tempo
            then change to another one as accurately as you can. The chart shows
            you the tempo over time, so can see whether you changed correctly. <i
                >This app assumes tempi between 60 and 180 bpm. Try playing
                without looking!</i
            >
        </p>
        <div class="control">
            <NumberInput
                title="Size of the time bins in seconds"
                label="time step"
                bind:value="{timeBinSize}"
                min="{1}"
                max="{30}"
                step="{1}"
                defaultValue="{5}"
            />
            <NumberInput
                title="Size of the tempo bins in BPM"
                label="tempo step"
                bind:value="{tempoBinSize}"
                min="{5}"
                max="{20}"
                step="{5}"
                defaultValue="{10}"
            />
            <NumberInput
                title="How many tempo values per time to display (the k most probable ones)"
                label="top k"
                bind:value="{topK}"
                min="{1}"
                max="{20}"
                step="{1}"
                defaultValue="{10}"
            />
        </div>
        <div class="visualization" bind:this="{container}"></div>
        <div class="control">
            <MetronomeButton
                tempo="{120}"
                accent="{4}"
                beepCount="{8}"
                showBeepCountInput
                disabled="{isPlaying}"
            />
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
            <MidiReplayButton bind:notes bind:isPlaying callback="{draw}" />
            <ImportExportButton
                {loadData}
                {getExportData}
                appId="{appInfo.id}"
                disabled="{isPlaying}"
            />
        </div>
        <ExerciseDrawer>
            <p>
                1) Play at a contant tempo.
                <InsideTextButton
                    onclick="{() => loadData(example1)}"
                    disabled="{isPlaying}"
                >
                    example
                </InsideTextButton>
            </p>
            <p>
                2) Increase your tempo as linear as possible
                <InsideTextButton
                    onclick="{() => loadData(example2)}"
                    disabled="{isPlaying}"
                >
                    example
                </InsideTextButton>
            </p>
            <p>
                3) Start with tempo 110 and suddenly jump to 150.

                <InsideTextButton
                    onclick="{() => loadData(example3)}"
                    disabled="{isPlaying}"
                >
                    example
                </InsideTextButton>
            </p>
            <p>
                4) Switch back and forth between two tempi, try to always hit
                the same two BPM values.
                <InsideTextButton
                    onclick="{() => loadData(example4)}"
                    disabled="{isPlaying}"
                >
                    example
                </InsideTextButton>
            </p>
        </ExerciseDrawer>
        <MidiInput
            {noteOn}
            pcKeyAllowed
            disabled="{isDataLoaded || isPlaying}"
        />
        <RatingButton appId="{appInfo.id}" />
        <PcKeyboardInput
            key=" "
            disabled="{isDataLoaded || isPlaying}"
            keyDown="{() => noteOn({ timestamp: performance.now() })}"
        />
        <TouchInput
            element="{container}"
            disabled="{isDataLoaded || isPlaying}"
            touchStart="{() => noteOn({ timestamp: performance.now() })}"
        />
    </main>
</FileDropTarget>
