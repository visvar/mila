<script>
    import { onDestroy, onMount } from 'svelte';
    import * as d3 from 'd3';
    import * as Plot from '@observablehq/plot';
    import { Utils } from 'musicvis-lib';
    import MetronomeButton from '../common/input-elements/metronome-button.svelte';
    import TempoInput from '../common/input-elements/tempo-input.svelte';
    import NoteCountInput from '../common/input-elements/note-count-input.svelte';
    import PcKeyboardInput from '../common/input-handlers/pc-keyboard-input.svelte';
    import { noteDurations } from '../lib/note-durations.js';
    import MidiInput from '../common/input-handlers/midi-input.svelte';
    import ResetNotesButton from '../common/input-elements/reset-notes-button.svelte';
    import ImportExportButton from '../common/input-elements/import-export-share-button.svelte';
    import { localStorageAddRecording } from '../lib/localstorage.js';
    import HistoryButton from '../common/input-elements/history-button.svelte';
    import example from '../example-recordings/rhythm-sheet-music.json';
    import TouchInput from '../common/input-handlers/touch-input.svelte';
    import { FILTER_NOTES } from '../lib/music.js';
    import ExerciseDrawer from '../common/exercise-drawer.svelte';
    import RatingButton from '../common/input-elements/rating-button.svelte';
    import SelectScollable from '../common/input-elements/select-scollable.svelte';
    import ToggleButton from '../common/input-elements/toggle-button.svelte';
    import FileDropTarget from '../common/file-drop-target.svelte';

    /**
     * contains the app meta information defined in App.js
     */
    export let appInfo;

    let width = 900;
    let container;
    // settings
    let tempo = 90;
    let pastNoteCount = 10;
    let useDotted = false;
    let filterNote = 16;
    let targetDuration = 'auto';
    // data
    $: minIOI = (Utils.bpmToSecondsPerBeat(tempo) * 4) / filterNote;
    let firstTimeStamp = 0;
    let notes = [];
    // colors
    const orange = d3.schemeObservable10[1];
    const blue = d3.schemeObservable10[0];
    // domain knowledge
    // 𝅝, 𝅗𝅥, 𝅘𝅥, 𝅘𝅥𝅮, 𝅘𝅥𝅯
    const possibilities = noteDurations;
    const possibilitiesNonDotted = possibilities.filter((d) => !d.dotted);

    const noteOn = async (e) => {
        if (notes.length === 0) {
            firstTimeStamp = e.timestamp;
        }
        const noteInSeconds = (e.timestamp - firstTimeStamp) / 1000;
        // check if note is too close to prior and skip if so
        if (notes.length > 0 && noteInSeconds - notes.at(-1) < minIOI) {
            return;
        }
         notes = [...notes, noteInSeconds];
        draw();
    };

    /**
     * Draw visualization
     */
    const draw = () => {
        container.textContent = '';
        if (notes.length === 0) {
            return;
        }
        let quarter = Utils.bpmToSecondsPerBeat(tempo);
        const sliced = notes.slice(-(pastNoteCount + 1));
        const deltas = sliced.map((d, i) => (i === 0 ? 0 : d - sliced[i - 1]));
        const inBeats = deltas.map((d) => d / quarter);
        // for each IOI, determine the closest duration
        let bestFit;
        if (targetDuration === 'auto') {
            // use dotted notes or not?
            const poss = useDotted ? possibilities : possibilitiesNonDotted;
            bestFit = inBeats.map((delta) => {
                const bestIndex = d3.minIndex(poss, (d) =>
                    Math.abs(delta - d.beats),
                );
                const best = poss[bestIndex];
                return {
                    ...best,
                    beats: delta,
                    offsetPercent: ((delta / best.beats) * 100).toFixed(),
                };
            });
        } else {
            // ...or, if target is set, use it for all notes
            const targetObj = noteDurations.filter(
                (d) => d.name === targetDuration,
            )[0];
            bestFit = inBeats.map((delta) => {
                return {
                    ...targetObj,
                    beats: delta,
                    offsetPercent: ((delta / targetObj.beats) * 100).toFixed(),
                };
            });
        }

        // plot
        const plot = Plot.plot({
            width,
            height: 100,
            marginTop: 10,
            marginBottom: 0,
            marginLeft: 50,
            // make sure note symbols etc work
            style: 'font-family: Inter, "Noto Symbols", "Noto Symbols 2", "Noto Music", sans-serif',
            x: {
                label: '',
                domain: d3.range(1, pastNoteCount),
                ticks: [],
            },
            y: {
                // domain: [1, 0],
                // ticks: d3.range(3),
                // tickFormat: (d) => ['note', 'percent too long'][d],
            },
            marks: [
                Plot.text(bestFit, {
                    text: 'symbol',
                    x: (d, i) => i,
                    // y: 0,
                    fontSize: 40,
                }),
                // percent deviation
                // Plot.text(bestFit, {
                //     text: (d) => d.offsetPercent - 100,
                //     x: (d, i) => i,
                //     y: 1,
                //     fontSize: 20,
                // }),
            ],
        });
        container.appendChild(plot);
        // plot
        const plot2 = Plot.plot({
            width,
            height: 180,
            marginLeft: 50,
            // make sure note symbols etc work
            style: 'font-family: Inter, "Noto Symbols", "Noto Symbols 2", "Noto Music", sans-serif',
            x: {
                // label: 'note',
                label: null,
                domain: d3.range(1, pastNoteCount),
                tickSize: 0,
                ticks: [],
            },
            y: {
                label: 'percent too long',
                domain: [-30, 30],
                ticks: d3.range(-30, 31, 10),
                grid: true,
            },
            color: {
                // diverging color gradient did not help
                // legend: true,
                // domain: [-10, 10],
                // range: [blue, '#ccc', orange],
                // interpolate: 'hsl',
                // type: 'diverging',
                // ticks: [-30, -15, 0, 15, 30],
                domain: ['short', 'long'],
                range: [blue, orange],
            },
            marks: [
                Plot.barY(bestFit, {
                    x: (d, i) => i,
                    y: (d) => d.offsetPercent - 100,
                    fill: (d) => (d.offsetPercent < 100 ? 'long' : 'short'),
                    // fill: (d) => d.offsetPercent - 100,
                    // tip: true,
                    // ry1:  (d) => d.offsetPercent < 100 ?0:4,
                    // ry2:  (d) => d.offsetPercent > 100 ?0:4,
                    ry: 4,
                }),
                Plot.textY(bestFit, {
                    x: (d, i) => i,
                    y: (d) =>
                        d.offsetPercent -
                        100 +
                        (d.offsetPercent < 100 ? -4 : 4),
                    text: (d) => d.offsetPercent - 100,
                    fill: '#666',
                    stroke: 'white',
                    strokeWidth: 8,
                }),
                Plot.ruleY([0]),
            ],
        });
        container.appendChild(plot2);
    };

    onMount(draw);

    /**
     * Used for exporting and for automatics saving
     */
    const getExportData = () => {
        return {
            // settings
            tempo,
            pastNoteCount,
            useDotted,
            // data
            notes,
        };
    };

    /**
     * Import data from file or example
     */
    const loadData = (json) => {
        saveToStorage();
        tempo = json.tempo;
        pastNoteCount = json.pastNoteCount;
        useDotted = json.useDotted;
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

    onDestroy(saveToStorage);
</script>

<FileDropTarget {loadData}>
    <main class="app">
        <h2>{appInfo.title}</h2>
        <p class="explanation">
            This app helps practicing the timing of notes. Set a tempo and start
            playing. The time between the notes you play will be displayed as
            note symbols, so you can see whether you play, for example, correct
            quarter notes. Bars and numbers show you how many percent of the
            detected note duration you played, for example a -5 means your note
            was 5% too short. <span style="color:{blue}"
                >Blue stands for notes that were too long (playing too slow)</span
            >
            and
            <span style="color:{orange}">orange for short (fast) ones</span>.
        </p>
        <div class="control">
            <TempoInput bind:value="{tempo}" callback="{draw}" />
            <NoteCountInput bind:value="{pastNoteCount}" callback="{draw}" />
            <ToggleButton
                label="dotted notes"
                title="Use dotted notes? If not, the closest non-dotted note will be taken."
                bind:checked="{useDotted}"
                callback="{draw}"
            />
        </div>
        <div class="control">
            <SelectScollable
                label="filtering"
                title="You can filter out notes that are shorter than a given note duration."
                bind:value="{filterNote}"
                callback="{draw}"
            >
                {#each FILTER_NOTES as g}
                    <option value="{g}">1/{g} note</option>
                {/each}
            </SelectScollable>
            <SelectScollable
                label="target"
                title="You can choose a single duration you want to practice and turn of automaticly guessing the closest one."
                bind:value="{targetDuration}"
                callback="{draw}"
            >
                <option value="auto">auto</option>
                {#each noteDurations as d}
                    <option value="{d.name}">{d.symbol} {d.name}</option>
                {/each}
            </SelectScollable>
        </div>
        <div class="visualization" bind:this="{container}"></div>
        <div class="control">
            <MetronomeButton {tempo} accent="{4}" />
            <ResetNotesButton bind:notes {saveToStorage} callback="{draw}" />
            <button on:click="{() => loadData(example)}"> example </button>
            <HistoryButton appId="{appInfo.id}" {loadData} />
            <ImportExportButton
                {loadData}
                {getExportData}
                appId="{appInfo.id}"
            />
        </div>
        <ExerciseDrawer>
            <p>1) Switch back and forth between quarters and eighths.</p>
            <p>2) Switch between eighths and eighth triplets.</p>
            <p>
                3) Set the target to dotted-half notes and try to play them
                accurately.
            </p>
        </ExerciseDrawer>
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
</FileDropTarget>
