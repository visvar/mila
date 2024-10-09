<script>
    import { onDestroy, onMount } from 'svelte';
    import { Utils } from 'musicvis-lib';
    import * as d3 from 'd3';
    import * as Plot from '@observablehq/plot';
    import { secondsPerBeatToBpm } from '../lib/lib';
    import ResetNotesButton from '../common/reset-notes-button.svelte';
    import PcKeyboardInput from '../common/pc-keyboard-input.svelte';
    import MidiInput from '../common/midi-input.svelte';
    import { BIN_NOTES } from '../lib/music';
    import MetronomeButton from '../common/metronome-button.svelte';
    import example from '../example-recordings/tempo-drift.json';
    import { localStorageAddRecording } from '../lib/localstorage';
    import ImportExportButton from '../common/import-export-button.svelte';
    import HistoryButton from '../common/history-button.svelte';
    import TouchInput from '../common/touch-input.svelte';
    import ExerciseDrawer from '../common/exercise-drawer.svelte';
    import RatingButton from '../common/rating-button.svelte';
    import ShareConfigButton from '../common/share-config-button.svelte';
    import TempoInput from '../common/tempo-input.svelte';
    import NumberInput from '../common/number-input.svelte';
    import SelectScollable from '../common/select-scollable.svelte';
    import MidiReplayButton from '../common/midi-replay-button.svelte';

    /**
     * contains the app meta information defined in App.js
     */
    export let appInfo;

    let width = 900;
    // let height = 600;
    let height = 500;
    let container;
    // settings
    let tempo = 120;
    let binNote = 0;
    let filterNote = 64;
    let barLimit = 50;
    // data
    let firstTimeStamp = 0;
    let notes = [];
    let estimatedTempo = 0;

    const noteOn = (e) => {
        if (notes.length === 0) {
            firstTimeStamp = e.timestamp;
        }
        const noteInSeconds = (e.timestamp - firstTimeStamp) / 1000;
        notes.push(noteInSeconds);
        draw();
    };

    const draw = () => {
        const quarter = Utils.bpmToSecondsPerBeat(tempo);
        const sixteenth = quarter / 4;
        const eighth = quarter / 2;
        const half = quarter * 2;
        const whole = quarter * 4;
        const rules = [
            0,
            sixteenth,
            eighth,
            eighth * 1.5,
            quarter,
            quarter * 1.5,
            half,
            half * 1.5,
        ];
        const rulesText = ['0', '𝅘𝅥𝅯', '𝅘𝅥𝅮', '𝅘𝅥𝅮.', '𝅘𝅥', '𝅘𝅥.', '𝅗𝅥', '𝅗𝅥.'];
        // get inter-onset intervals
        let iois = notes.map((d, i) => (i === 0 ? 0 : d - notes[i - 1]));
        if (filterNote !== 0) {
            const minSize = whole / filterNote;
            iois = iois.filter((d) => d >= minSize);
        }
        // round bars' height to make view clearer
        let binnedIois = iois;
        if (binNote !== 0) {
            const binSize = whole / binNote;
            binnedIois = iois.map((d) => Math.round(d / binSize) * binSize);
        }

        // TODO: color by distance to closest baseline
        // const colorByError = (ioi) => {
        //     return d3.min(rules, (r) => Math.abs((ioi - r) / r));
        // };
        const plot = Plot.plot({
            width,
            height,
            marginLeft: 45,
            marginRight: 1,
            // make sure note symbols etc work
            style: 'font-size: 24px; font-family: Inter, "Noto Symbols", "Noto Symbols 2", "Noto Music", sans-serif',
            x: {
                axis: false,
            },
            y: {
                ticks: rules,
                tickFormat: (d) => {
                    const index = rules.indexOf(d);
                    return rulesText[index];
                },
                domain: [0, half * 1.1],
                tickSize: 0,
            },
            // color: {
            //     scheme: 'Greys',
            //     legend: true,
            //     range: [0.2, 1],
            // },
            marks: [
                // bars
                Plot.barY(binnedIois.slice(-barLimit), {
                    x: (d, i) => i,
                    y: (d) => d,
                    fill: '#ddd',
                    // color by distance to closest baseline
                    // fill: colorByError,
                    inset: 0,
                    dx: 0.5,
                    ry1: 4,
                }),
                // reference duration lines
                Plot.ruleY(rules, {
                    stroke: '#aaa',
                }),
            ],
        });
        container.textContent = '';
        container.appendChild(plot);

        // tempo estimation
        const lastNotes = iois
            .filter((d) => d > 0.8 * sixteenth && d < 1.25 * quarter)
            .slice(-24)
            .map((d) =>
                d < 0.6 * quarter ? d * 2 : d > 1.5 * quarter ? d / 2 : d,
            );
        estimatedTempo = secondsPerBeatToBpm(d3.mean(lastNotes));

        // TODO: remove
        // demo of how it would look with ticks
        // const notesInBeats = notes.map((d) => d / quarter);
        // const plot2 = Plot.plot({
        //     width,
        //     height: 100,
        //     x: { label: 'time in beats (quarter notes)' },
        //     marks: [
        //         Plot.tickX(notesInBeats, {
        //             x: (d) => d,
        //             stroke: '#ddd',
        //         }),
        //     ],
        // });
        // container.appendChild(plot2);
    };

    /**
     * Used for exporting and for automatics saving
     */
    const getExportData = () => {
        return {
            tempo,
            binNote,
            filterNote,
            barLimit,
            notes,
        };
    };

    const loadData = (json) => {
        saveToStorage();
        tempo = json.tempo;
        binNote = json.binNote ?? 'off';
        filterNote = json.filterNote ?? 'off';
        barLimit = json.barLimit;
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
        This app helps practicing keeping a constant tempo. Choose your tempo,
        activate the metronome, and start playing. Once the metronome stops, try
        to keep a constant tempo as long as possible. The time between two note
        onsets will be shown as a bar, so you can see how well you still hit,
        for example, quarter notes after playing for some time. Bar heights are
        either exact or rounded to a certain duration precision for a clearer
        overview when monitoring live. You can filter very short inter-note
        times, which happen when playing two notes at roughly the same time, for
        example in a chord.
        <i>
            Try playing without looking, so you don't correct based on what you
            see!
        </i>
    </p>
    <ExerciseDrawer>
        <p>
            1) Choose a tempo and play only quarter notes. After the count-in,
            keep the tempo as constant as possible for a few minutes.
        </p>
        <p>
            2) Play a piece/song (that has constant tempo). After the count-in,
            keep the tempo as constant as possible for a few minutes.
        </p>
        <p>
            3) Try to play at a given tempo without count-in, just by guessing
            how fast it is supposed to be played. You can use the randomize
            tempo button (⚂) to get challenged for a random tempo.
        </p>
    </ExerciseDrawer>
    <div class="control">
        <TempoInput bind:value="{tempo}" on:change="{draw}" />
        <button
            title="randomize tempo"
            on:click="{() => {
                let newTempo = tempo;
                while (newTempo === tempo) {
                    newTempo = Math.round(Math.random() * 12 + 6) * 10;
                }
                tempo = newTempo;
            }}"
        >
            ⚂
        </button>
        <SelectScollable
            label="rounding"
            title="You can change between seeing exact bar heights and binned (rounded) heights."
            bind:value="{binNote}"
            callback="{draw}"
        >
            <option value="{0}">off</option>
            {#each BIN_NOTES as g}
                <option value="{g}">1/{g} note</option>
            {/each}
        </SelectScollable>
        <SelectScollable
            label="filtering"
            title="You can filter out notes that are shorter than a given note duration."
            bind:value="{filterNote}"
            callback="{draw}"
        >
            <option value="{0}">off</option>
            {#each BIN_NOTES as g}
                <option value="{g}">1/{g} note</option>
            {/each}
        </SelectScollable>
        <NumberInput
            title="The number of most recent notes that are shown as bars."
            label="bars"
            bind:value="{barLimit}"
            callback="{draw}"
            step="{25}"
            min="{25}"
            max="{1000}"
        />
    </div>
    <div class="visualization" bind:this="{container}"></div>
    {#if estimatedTempo}
        <div>
            estimated: {estimatedTempo.toFixed()} bpm (assuming quarter notes)
        </div>
    {/if}
    <div class="control">
        <MetronomeButton
            {tempo}
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
