<script>
    import { onDestroy, onMount } from 'svelte';
    import * as d3 from 'd3';
    import * as Plot from '@observablehq/plot';
    import { Utils } from 'musicvis-lib';
    import { toggleOnIcon, toggleOffIcon } from '../lib/icons.js';
    import MetronomeButton from '../common/metronome-button.svelte';
    import TempoInput from '../common/tempo-input.svelte';
    import NoteCountInput from '../common/note-count-input.svelte';
    import { noteDurations } from '../lib/note-durations.js';
    import MidiInput from '../common/midi-input.svelte';
    import ResetNotesButton from '../common/reset-notes-button.svelte';
    import ImportExportButton from '../common/import-export-button.svelte';
    import { localStorageAddRecording } from '../lib/localstorage.js';
    import HistoryButton from '../common/history-button.svelte';
    import example from '../example-recordings/accents.json';
    import ExerciseDrawer from '../common/exercise-drawer.svelte';
    import { FILTER_NOTES, VELOCITIES_LOGIC } from '../lib/music.js';
    import RatingButton from '../common/rating-button.svelte';
    import ShareConfigButton from '../common/share-config-button.svelte';
    import ToggleButton from '../common/toggle-button.svelte';
    import SelectScollable from '../common/select-scollable.svelte';

    /**
     * contains the app meta information defined in App.js
     */
    export let appInfo;

    let width = 900;
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
        };
        notes.push(note);
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
            const bestIndex = d3.minIndex(possible, (d) =>
                Math.abs(delta.delta - d.beats),
            );
            const best = possible[bestIndex];
            return {
                ...best,
                beats: delta,
                velocity: delta.velocity,
                offsetPercent: ((delta.delta / best.beats) * 100).toFixed(),
            };
        });
        // plot
        const plot = Plot.plot({
            width,
            height: 100,
            marginLeft: 80,
            // make sure note symbols etc work
            style: 'font-family: Inter, "Noto Symbols", "Noto Symbols 2", "Noto Music", sans-serif',
            x: {
                label: '',
                domain: d3.range(1, pastNoteCount),
                ticks: [],
            },
            y: {},
            marks: [
                Plot.text(bestFit, {
                    text: 'symbol',
                    x: (d, i) => i,
                    fontSize:
                        velocityThreshold > 0
                            ? (d) => (d.velocity < velocityThreshold ? 35 : 70)
                            : (d) => d.velocity * 60 + 10,
                }),
            ],
        });
        container.appendChild(plot);
        // legend
        const legendTicks = [...VELOCITIES_LOGIC.keys()].map((d) => d / 127);
        const plot2 = Plot.plot({
            // subtitle: 'loudness',
            width: width,
            height: 100,
            marginTop: 20,
            marginLeft: width * 0.35,
            marginRight: width * 0.35,
            marginBottom: 35,
            // make sure note symbols etc work
            style: 'font-family: Inter, "Noto Symbols", "Noto Symbols 2", "Noto Music", sans-serif',
            x: {
                label: 'loudness',
                labelAnchor: 'center',
                ticks: legendTicks,
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
        container.appendChild(plot2);
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
        This app helps practicing accents, that is, playing some notes louder
        then others to highlight them. Set a tempo and start playing. The time
        between the notes you play will be displayed as note symbols, so you can
        see whether you play, for example, correct quarter notes. The note's
        velocity is encoded as font size, so you can see whether you accent the
        correct notes, for example the first note in each triplet, or the the
        first in each group of 4.
        <i>Note: the display is always one note behind.</i>
    </p>
    <ExerciseDrawer>
        <p>
            1) Play quarter notes and accent the first one in each group of 4.
        </p>
        <p>2) Play triplets and accent the first note in each triplet.</p>
        <p>
            3) Switch between triplets and sixteenth notes and accent the first
            note in each group of 3 and 4.
        </p>
        <p>
            4) Play triplets and accent the first note in each odd triplet and
            the second in each even triplet.
        </p>
        <p>
            5) Try different accent patterns such as:<br />
            <b>1</b> e + <b>a</b> 2 e + a 3 <b>e</b> + a <b>4</b> e + a<br />
            <span class="icon">
                <span class="acc">𝅘𝅥</span> 𝅘𝅥 𝅘𝅥 <span class="acc">𝅘𝅥</span> | 𝅘𝅥 𝅘𝅥
                𝅘𝅥 𝅘𝅥 | 𝅘𝅥
                <span class="acc">𝅘𝅥</span>
                𝅘𝅥 𝅘𝅥 |
                <span class="acc">𝅘𝅥</span>
                𝅘𝅥 𝅘𝅥 𝅘𝅥
            </span>
        </p>
    </ExerciseDrawer>
    <div class="control">
        <TempoInput bind:value="{tempo}" callback="{draw}" />
        <NoteCountInput bind:value="{pastNoteCount}" callback="{draw}" />
        <button
            title="Use dotted notes? If not, the closest non-dotted note will be taken."
            on:click="{() => {
                useDotted = !useDotted;
                draw();
            }}"
        >
            dotted notes {useDotted ? toggleOnIcon : toggleOffIcon}
        </button>
        <ToggleButton
            label="tuplets"
            title="Use tuplets? If not, the closest non-tuplet note will be taken."
            bind:checked="{useTuplets}"
            callback="{draw}"
        />
    </div>
    <div class="control">
        <SelectScollable
            title="You can filter out notes that are shorter than a given note duration."
            label="filtering"
            bind:value="{filterNote}"
            callback="{draw}"
        >
            {#each FILTER_NOTES as g}
                <option value="{g}">1/{g} note</option>
            {/each}
        </SelectScollable>
        <SelectScollable
            title="You can choose a value for loudness to only show loud and quiet notes in two different sizes instead of exactly sizing notes by loudness. Set to 0 to use smooth sizing."
            label="loudness threshold"
            bind:value="{velocityThreshold}"
            callback="{draw}"
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
        <MetronomeButton {tempo} accent="{4}" />
        <ResetNotesButton bind:notes {saveToStorage} callback="{draw}" />
        <ImportExportButton {loadData} {getExportData} appId="{appInfo.id}" />
        <button on:click="{() => loadData(example)}"> example </button>
        <HistoryButton appId="{appInfo.id}" {loadData} />
        <ShareConfigButton {getExportData} {loadData} appId="{appInfo.id}" />
    </div>
    <RatingButton appId="{appInfo.id}" />
    <MidiInput {noteOn} />
</main>

<style>
    .acc {
        font-size: 1.6em;
    }
</style>
