<script>
    import { afterUpdate, onDestroy } from 'svelte';
    import { Utils } from 'musicvis-lib';
    import * as Plot from '@observablehq/plot';
    import ResetNotesButton from '../common/input-elements/reset-notes-button.svelte';
    import PcKeyboardInput from '../common/input-handlers/pc-keyboard-input.svelte';
    import MidiInput from '../common/input-handlers/midi-input.svelte';
    import MetronomeButton from '../common/input-elements/metronome-button.svelte';
    import example from '../example-recordings/tempo-drift.json';
    import { localStorageAddRecording } from '../lib/localstorage';
    import ImportExportButton from '../common/input-elements/import-export-share-button.svelte';
    import HistoryButton from '../common/input-elements/history-button.svelte';
    import TouchInput from '../common/input-handlers/touch-input.svelte';
    import ExerciseDrawer from '../common/exercise-drawer.svelte';
    import RatingButton from '../common/input-elements/rating-button.svelte';
    import TempoInput from '../common/input-elements/tempo-input.svelte';
    import NumberInput from '../common/input-elements/number-input.svelte';
    import SelectScollable from '../common/input-elements/select-scollable.svelte';
    import MidiReplayButton from '../common/input-elements/midi-replay-button.svelte';
    import FileDropTarget from '../common/file-drop-target.svelte';
    import { secondsPerBeatToBpm } from '../lib/lib';
    import InsideTextButton from '../common/input-elements/inside-text-button.svelte';

    /**
     * contains the app meta information defined in App.js
     */
    export let appInfo;

    let windowWidth = window.innerWidth;
    $: width = windowWidth < 1200 ? 900 : Math.floor(windowWidth - 200);
    let container;
    // settings
    let tempo = 120;
    let binNote = 0;
    let filterNote = 32;
    let barLimit = 500;
    let windowSize = 50;
    // data
    let firstTimeStamp = 0;
    let notes = [];
    // app state
    let isPlaying;
    let isDataLoaded = false;

    const noteOn = (e) => {
        if (notes.length === 0) {
            firstTimeStamp = e.timestamp;
        }
        const noteInSeconds = (e.timestamp - firstTimeStamp) / 1000;
        notes = [...notes, noteInSeconds];
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
        const slicedIois = iois.slice(-barLimit);
        // round bars' height to make view clearer
        let binnedIois = slicedIois;
        if (binNote !== 0) {
            const binSize = whole / binNote;
            binnedIois = slicedIois.map(
                (d) => Math.round(d / binSize) * binSize,
            );
        }

        const barPlot = Plot.plot({
            width,
            height: 350,
            marginLeft: 45,
            marginRight: 1,
            // make sure note symbols etc work
            style: 'font-size: 24px; font-family: Inter, "Noto Symbols", "Noto Symbols 2", "Noto Music", sans-serif',
            x: {
                axis: false,
            },
            y: {
                label: null,
                ticks: rules,
                tickFormat: (d) => {
                    const index = rules.indexOf(d);
                    return rulesText[index];
                },
                domain: [0, half * 1.1],
                tickSize: 0,
            },
            marks: [
                // bars
                Plot.barY(binnedIois, {
                    x: (d, i) => i,
                    y: (d) => d,
                    fill: '#ddd',
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
        container.appendChild(barPlot);

        // tempo estimation
        const indexedIois = slicedIois.map((d, i) => {
            return {
                index: i,
                duration: d,
                tempo: null,
            };
        });
        const lower = quarter * 0.75;
        const upper = quarter * 1.25;
        const lineNotes = indexedIois
            .filter(
                // remove very short and long notes
                (d) =>
                    // d.duration > 0.75 * sixteenth && d.duration < 1.25 * half,
                    d.duration > 0.5 * sixteenth && d.duration < 1.25 * quarter,
            )
            .map((d) => {
                // fold to quarter
                while (d.duration > upper) {
                    d.duration /= 2;
                }
                while (d.duration < lower) {
                    d.duration *= 2;
                }
                d.tempo = secondsPerBeatToBpm(d.duration);
                return d;
            });
        const linePlot = Plot.plot({
            width,
            height: 200,
            marginLeft: 45,
            marginTop: 25,
            marginBottom: 35,
            marginRight: 1,
            x: {
                label: 'IOI index',
                labelAnchor: 'center',
            },
            y: {
                label: 'estimated tempo',
                labelAnchor: 'center',
                grid: true,
                domain: [tempo * 0.75, tempo * 1.25],
            },
            marks: [
                Plot.ruleY([tempo]),
                Plot.lineY(
                    lineNotes,
                    Plot.windowY(
                        { k: windowSize, anchor: 'middle', reduce: 'median' },
                        {
                            x: 'index',
                            y: 'tempo',
                            strokeWidth: 2,
                            stroke: '#888',
                            curve: 'basis',
                            clip: true,
                        },
                    ),
                ),
            ],
        });
        container.appendChild(linePlot);
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
            windowSize,
            // data
            notes,
        };
    };

    const loadData = (json) => {
        saveToStorage();
        tempo = json.tempo;
        binNote = json.binNote ?? 'off';
        filterNote = json.filterNote ?? 'off';
        barLimit = json.barLimit ?? 500;
        windowSize = json.windowSize ?? 50;
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

<svelte:window bind:innerWidth="{windowWidth}" />

<FileDropTarget {loadData} disabled="{isPlaying}">
    <main class="app">
        <h2>{appInfo.title}</h2>
        <p class="explanation">
            This app helps practicing keeping a constant tempo. Choose your
            tempo, activate the metronome, and start playing. Once the metronome
            stops, try to keep a constant tempo as long as possible.
            <i>
                Try playing without looking, so you don't correct based on what
                you see!
            </i>
        </p>
        <p class="explanation">
            The time between two note onsets (inter-onset interval or IOI) will
            be shown as a bar, so you can see how well you still hit, for
            example, quarter notes after playing for some time. Bar heights are
            either exact or rounded to a certain duration precision for a
            clearer overview when monitoring live. You can filter very short
            inter-note times, which happen when playing two notes at roughly the
            same time, for example in a chord.
        </p>
        <p class="explanation">
            A line chart below shows the estimated tempo. It assumes you drift
            no farther than 20% up or down and is less robust than the bar
            chart, but helps see trends more clearly.
        </p>
        <div class="control">
            <TempoInput bind:value="{tempo}" />
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
            >
                <option value="{0}">off</option>
                {#each [32, 46, 64, 96] as g}
                    <option value="{g}">1/{g} note</option>
                {/each}
            </SelectScollable>
            <SelectScollable
                label="filtering"
                title="You can filter out notes that are shorter than a given note duration."
                bind:value="{filterNote}"
            >
                <option value="{0}">off</option>
                {#each [16, 32, 64, 128] as g}
                    <option value="{g}">1/{g} note</option>
                {/each}
            </SelectScollable>
        </div>
        <div class="control">
            <NumberInput
                title="The number of most recent notes that are shown as bars."
                label="bars"
                bind:value="{barLimit}"
                step="{25}"
                min="{25}"
                max="{1000}"
            />
            <NumberInput
                title="Running average window for the tempo estimation line chart."
                label="window"
                bind:value="{windowSize}"
                step="{10}"
                min="{5}"
                max="{1000}"
                defaultValue="{50}"
            />
        </div>
        <div class="visualization" bind:this="{container}"></div>
        <div class="control">
            <MetronomeButton
                {tempo}
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
            <HistoryButton appId="{appInfo.id}" {loadData} />
            <MidiReplayButton
                bind:notes
                bind:isPlaying
                callback="{draw}"
                allowSound="{false}"
            />
            <ImportExportButton
                {loadData}
                {getExportData}
                appId="{appInfo.id}"
                disabled="{isPlaying}"
            />
        </div>
        <ExerciseDrawer>
            <InsideTextButton
                onclick="{() => loadData(example)}"
                disabled="{isPlaying}"
            >
                example
            </InsideTextButton>
            <p>
                1) Choose a tempo and play only quarter notes. After the
                count-in, keep the tempo as constant as possible for a few
                minutes.
            </p>
            <p>
                2) Play a piece/song (that has constant tempo). After the
                count-in, keep the tempo as constant as possible for a few
                minutes.
            </p>
            <p>
                3) Try to play at a given tempo without count-in, just by
                guessing how fast it is supposed to be played. You can use the
                randomize tempo button (⚂) to get challenged for a random tempo.
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
