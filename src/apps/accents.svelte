<script>
    import { afterUpdate, onDestroy } from 'svelte';
    import * as d3 from 'd3';
    import * as Plot from '@observablehq/plot';
    import { Utils } from 'musicvis-lib';
    import MetronomeButton from '../common/input-elements/metronome-button.svelte';
    import TempoInput from '../common/input-elements/tempo-input.svelte';
    import NoteCountInput from '../common/input-elements/note-count-input.svelte';
    import { noteDurations } from '../lib/note-durations.js';
    import MidiInput from '../common/input-handlers/midi-input.svelte';
    import ResetNotesButton from '../common/input-elements/reset-notes-button.svelte';
    import ImportExportButton from '../common/input-elements/import-export-share-button.svelte';
    import { localStorageAddRecording } from '../lib/localstorage.js';
    import HistoryButton from '../common/input-elements/history-button.svelte';
    import example from '../example-recordings/accents/accents.json';
    import example1 from '../example-recordings/accents/accents-e1.json';
    import example2 from '../example-recordings/accents/accents-e2.json';
    import ExerciseDrawer from '../common/exercise-drawer.svelte';
    import { FILTER_NOTES, VELOCITIES_LOGIC } from '../lib/music.js';
    import RatingButton from '../common/input-elements/rating-button.svelte';
    import ToggleButton from '../common/input-elements/toggle-button.svelte';
    import SelectScollable from '../common/input-elements/select-scollable.svelte';
    import FileDropTarget from '../common/file-drop-target.svelte';
    import InsideTextButton from '../common/input-elements/inside-text-button.svelte';

    /**
     * contains the app meta information defined in App.js
     */
    export let appInfo;

    let windowWidth = window.innerWidth;
    $: width = windowWidth < 1200 ? 900 : Math.floor(windowWidth - 200);
    let container;
    // settings
    let tempo = 90;
    let pastNoteCount = 20;
    let useDotted = false;
    let useTuplets = false;
    let filterNote = 16;
    let velocityThreshold = 0;
    // data
    $: minIOI = (Utils.bpmToSecondsPerBeat(tempo) * 4) / filterNote;
    let firstTimeStamp = 0;
    let notes = [];
    // app state
    let isPlaying;
    let isDataLoaded = false;

    const noteOn = async (e) => {
        if (notes.length === 0) {
            firstTimeStamp = e.timestamp;
        }
        const noteInSeconds = (e.timestamp - firstTimeStamp) / 1000;
        // check if note is too close to prior and skip if so
        if (notes.length > 0 && noteInSeconds - notes.at(-1).time < minIOI) {
            return;
        }
        const note = {
            time: noteInSeconds,
            velocity: e.velocity,
            number: e.note.number,
        };
        notes = [...notes, note];
    };

    /**
     * Draw visualization
     */
    const draw = () => {
        container.textContent = '';
        // legend
        const legendTicks = [...VELOCITIES_LOGIC.keys()].map((d) => d / 127);
        const legend = Plot.plot({
            // subtitle: 'loudness',
            width,
            height: 100,
            marginTop: 30,
            marginLeft: (width - 400) / 2,
            marginRight: (width - 400) / 2,
            marginBottom: 37,
            // make sure note symbols etc work
            style: 'font-family: Inter, "Noto Symbols", "Noto Symbols 2", "Noto Music", sans-serif',
            x: {
                label: 'loudness legend',
                labelArrow: 'none',
                labelAnchor: 'center',
                ticks: legendTicks,
                tickSize: 0,
                tickFormat: (d, i) => [...VELOCITIES_LOGIC.values()][i],
            },
            marks: [
                Plot.text(legendTicks, {
                    text: (d) => '𝅘𝅥',
                    x: (d, i) => d,
                    fontSize: (d) => d * 60 + 10,
                }),
            ],
        });
        container.appendChild(legend);
        if (notes.length === 0) {
            return;
        }
        let quarter = Utils.bpmToSecondsPerBeat(tempo);
        const sliced = notes.slice(-(pastNoteCount + 1));
        const deltas = sliced.map((d, i) => {
            if (i === 0) {
                return {};
            }
            const delta = d.time - sliced[i - 1].time;
            return {
                delta: delta / quarter,
                velocity: sliced[i - 1].velocity,
            };
        });

        const possible = noteDurations
            .filter((d) => useDotted || !d.dotted)
            .filter((d) => useTuplets || !d.tuplet);
        const bestFit = deltas.slice(1).map((delta) => {
            // best fitting duration
            const bestDurIndex = d3.minIndex(possible, (d) =>
                Math.abs(delta.delta - d.beats),
            );
            const bestDur = possible[bestDurIndex];
            // best fitting dynamics
            const possibleDyn = [...VELOCITIES_LOGIC.entries()];
            const bestIndex = d3.minIndex(possibleDyn, (d) =>
                Math.abs(delta.velocity * 127 - d[0]),
            );
            const bestDyn = possibleDyn[bestIndex][1];
            return {
                ...bestDur,
                beats: delta,
                velocity: delta.velocity,
                velocityLabel: bestDyn,
                offsetPercent: ((delta.delta / bestDur.beats) * 100).toFixed(),
            };
        });
        // plot
        const plot = Plot.plot({
            width,
            height: 110,
            marginTop: 50,
            marginLeft: 20,
            marginRight: 20,
            marginBottom: 10,
            // make sure note symbols etc work
            style: 'font-family: Inter, "Noto Symbols", "Noto Symbols 2", "Noto Music", sans-serif',
            x: {
                label: '',
                domain: d3.range(1, pastNoteCount),
                ticks: [],
            },
            y: {
                axis: false,
            },
            marks: [
                // note symbols
                Plot.text(bestFit, {
                    text: 'symbol',
                    x: (d, i) => i,
                    fontSize:
                        velocityThreshold > 0
                            ? (d) => (d.velocity < velocityThreshold ? 35 : 70)
                            : (d) => d.velocity * 60 + 10,
                    y: 1,
                }),
                // dynamics as text
                Plot.text(bestFit, {
                    text: 'velocityLabel',
                    x: (d, i) => i,
                    y: 0,
                    fill: '#888',
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
            tempo,
            pastNoteCount,
            useDotted,
            useTuplets,
            velocityThreshold,
            filterNote,
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
        useTuplets = json.useTuplets;
        velocityThreshold = json.velocityThreshold ?? 0;
        filterNote = json.filterNote ?? 32;
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
            This app helps practicing dynamic accents, that is, playing some
            notes louder then others to highlight them. Set a tempo and start
            playing. The time between the notes you play will be displayed as
            note symbols, so you can see whether you play, for example, correct
            quarter notes. The note's velocity is encoded as font size, so you
            can see whether you accent the correct notes, for example the first
            note in each triplet, or the the first in each group of 4.
            <i>Note: the display is always one note behind.</i>
        </p>
        <div class="control">
            <TempoInput bind:value="{tempo}" disabled="{isPlaying}" />
            <NoteCountInput bind:value="{pastNoteCount}" max="{70}" />
            <ToggleButton
                label="dotted notes"
                title="Use dotted notes? If not, the closest non-dotted note will be taken."
                bind:checked="{useDotted}"
            />
            <ToggleButton
                label="tuplets"
                title="Use tuplets? If not, the closest non-tuplet note will be taken."
                bind:checked="{useTuplets}"
            />
        </div>
        <div class="control">
            <SelectScollable
                title="You can filter out notes that are shorter than a given note duration."
                label="filtering"
                bind:value="{filterNote}"
            >
                {#each FILTER_NOTES as g}
                    <option value="{g}">1/{g} note</option>
                {/each}
            </SelectScollable>
            <SelectScollable
                title="You can choose a value for loudness to only show loud and quiet notes in two different sizes instead of exactly sizing notes by loudness. Set to 0 to use smooth sizing."
                label="loudness threshold"
                bind:value="{velocityThreshold}"
            >
                {#each VELOCITIES_LOGIC.entries() as [velocity, label]}
                    <option value="{velocity / 127}">
                        {(velocity / 127).toFixed(1)}
                        {label}
                    </option>
                {/each}
            </SelectScollable>
        </div>
        <div class="visualization" bind:this="{container}"></div>
        <div class="control">
            <MetronomeButton {tempo} accent="{4}" disabled="{isPlaying}" />
            <ResetNotesButton
                bind:notes
                bind:isDataLoaded
                disabled="{isPlaying}"
                {saveToStorage}
            />
            <button on:click="{() => loadData(example)}" disabled="{isPlaying}">
                example
            </button>
            <HistoryButton
                appId="{appInfo.id}"
                {loadData}
                disabled="{isPlaying}"
            />
            <ImportExportButton
                {loadData}
                {getExportData}
                appId="{appInfo.id}"
                disabled="{isPlaying}"
            />
        </div>
        <ExerciseDrawer>
            <p>
                1) Play quarter notes and accent the first one in each group of
                4.
                <InsideTextButton
                    onclick="{() => loadData(example1)}"
                    disabled="{isPlaying}"
                >
                    example
                </InsideTextButton>
            </p>
            <p>
                2) Play triplets and accent the first note in each triplet.
                <InsideTextButton
                    onclick="{() => loadData(example2)}"
                    disabled="{isPlaying}"
                >
                    example
                </InsideTextButton>
            </p>
            <p>
                3) Switch between triplets and sixteenth notes and accent the
                first note in each group of 3 and 4.
            </p>
            <p>
                4) Play triplets and accent the first note in each odd triplet
                and the second in each even triplet.
            </p>
            <p>
                5) Try different accent patterns such as:<br />
                <span style="margin-left: 25px">
                    <b>1</b> e + <b>a</b> 2 e + a 3 <b>e</b> + a <b>4</b> e + a<br
                    />
                </span>
                <span class="icon" style="margin-left: 25px">
                    <span class="acc">𝅘𝅥</span> 𝅘𝅥 𝅘𝅥 <span class="acc">𝅘𝅥</span> |
                    𝅘𝅥 𝅘𝅥 𝅘𝅥 𝅘𝅥 | 𝅘𝅥
                    <span class="acc">𝅘𝅥</span>
                    𝅘𝅥 𝅘𝅥 |
                    <span class="acc">𝅘𝅥</span>
                    𝅘𝅥 𝅘𝅥 𝅘𝅥
                </span>
            </p>
        </ExerciseDrawer>
        <MidiInput {noteOn} disabled="{isDataLoaded || isPlaying}" />
        <RatingButton appId="{appInfo.id}" />
    </main>
</FileDropTarget>

<style>
    .acc {
        font-size: 1.6em;
    }
</style>
