<script>
    import { onDestroy, onMount } from 'svelte';
    import * as d3 from 'd3';
    import * as Plot from '@observablehq/plot';
    import { Scale } from '@tonaljs/tonal';
    import { Midi } from 'musicvis-lib';
    import { toggleOffIcon, toggleOnIcon } from '../lib/icons';
    import ResetNotesButton from '../common/reset-notes-button.svelte';
    import MidiInput from '../common/midi-input.svelte';
    import ImportExportButton from '../common/import-export-button.svelte';
    import { localStorageAddRecording } from '../lib/localstorage';
    import HistoryButton from '../common/history-button.svelte';
    import ExerciseDrawer from '../common/exercise-drawer.svelte';
    import RatingButton from '../common/rating-button.svelte';
    import ScaleSelect from '../common/scale-select.svelte';
    import { NOTE_TO_CHROMA_MAP } from '../lib/music';
    import ShareConfigButton from '../common/share-config-button.svelte';
    import example from '../example-recordings/improvisation-scale-degrees.json';

    /**
     * contains the app meta information defined in App.js
     */
    export let appInfo;

    let width = 900;
    // let height = 500;
    let height = 300;
    let container;
    // settings
    let root = 'A';
    let scale = 'minor pentatonic';
    let useColors = true;
    let showOutsideScale = true;
    // data
    let firstTimeStamp;
    let notes = [];
    // domain knowledge
    const noteNames = Midi.NOTE_NAMES_FLAT;

    const noteOn = (e) => {
        if (notes.length === 0) {
            firstTimeStamp = e.timestamp;
        }
        const noteInSeconds = (e.timestamp - firstTimeStamp) / 1000;
        const note = {
            number: e.note.number,
            velocity: e.rawVelocity,
            time: noteInSeconds,
        };
        notes.push(note);
        draw();
    };

    const draw = () => {
        container.textContent = '';
        if (notes.length === 0) {
            return;
        }
        // TODO: filter notes which are too close together
        // TODO: filter notes with low velocity
        // MIDI nr (0 to 11) of the scale root
        const rootNr = noteNames.indexOf(root);
        const scaleInfo = Scale.get(`${root} ${scale}`);
        const scaleNotes = scaleInfo.notes.map((note, i) => {
            // note chroma from 0 to 11 (C to B)
            const chroma = NOTE_TO_CHROMA_MAP.get(note);
            let offset = chroma - rootNr;
            offset = offset >= 0 ? offset : offset + 12;
            return {
                name: note,
                chroma,
                interval: scaleInfo.intervals[i],
                degree: i,
                offset,
            };
        });
        const scaleOffsets = new Set(scaleNotes.map((d) => d.offset));
        // note chroma from 0 to 11 (C to B)
        const chroma = notes.map((d) => d.number % 12);
        // steps from root to note
        const rootOffsets = chroma.map((d) => {
            const offset = d - rootNr;
            return offset >= 0 ? offset : offset + 12;
        });
        const grouped = d3
            .groups(rootOffsets, (d) => d)
            .map(([key, grp]) => {
                return { value: key, count: grp.length };
            });
        const plot = Plot.plot({
            width,
            height,
            marginLeft: 70,
            marginRight: 10,
            // make sure note symbols etc work
            style: 'font-family: Inter, "Noto Symbols", "Noto Symbols 2", "Noto Music", sans-serif',
            color: {
                legend: useColors,
                domain: ['root', 'scale', 'outside scale'],
                range: ['#444', '#888', '#bbb'],
                marginLeft: 100,
            },
            y: {
                tickFormat: (d) => noteNames[(d + rootNr) % 12],
                domain: showOutsideScale
                    ? d3.range(0, 12, 1)
                    : [...scaleOffsets],
                reverse: true,
                label: 'notes, increasing from tonic 🡺',
            },
            marks: [
                // Plot.barX(grouped, {
                Plot.waffleX(grouped, {
                    x: 'count',
                    y: 'value',
                    fill: (d) => {
                        // colors off?
                        if (!useColors) {
                            return '#ddd';
                        }
                        // root?
                        if (d.value === 0) {
                            return '#666';
                        }
                        //  in scale?
                        if (scaleOffsets.has(d.value)) {
                            return '#aaa';
                        }
                        // out of scale
                        return '#eee';
                    },
                    dx: 0.5,
                    rx: 4,
                }),
            ],
        });
        container.appendChild(plot);
    };

    onMount(draw);

    /**
     * Used for exporting and for automatics saving
     */
    const getExportData = () => {
        return {
            root,
            scale,
            useColors,
            showOutsideScale,
            notes,
        };
    };

    /**
     * Import data from file or example
     */
    const loadData = (json) => {
        saveToStorage();
        root = json.root;
        scale = json.scale;
        useColors = json.useColors;
        showOutsideScale = json.showOutsideScale;
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

<main class="app">
    <h2>{appInfo.title}</h2>
    <p class="explanation">
        This app helps practicing how to use the different degrees of a scale.
        The bar chart below shows how often you played each scale degree.
    </p>
    <ExerciseDrawer>
        <p>1) Improvise in A minor pentatonic.</p>
        <p>2) Improvise in a scale you did not know before.</p>
    </ExerciseDrawer>
    <div class="control">
        <ScaleSelect
            bind:scaleRoot="{root}"
            bind:scaleType="{scale}"
            callback="{draw}"
        />
    </div>
    <div class="control">
        <button
            title="Use colors for root, in-scale, outside-scale"
            on:click="{() => {
                useColors = !useColors;
                draw();
            }}"
        >
            colors {useColors ? toggleOnIcon : toggleOffIcon}
        </button>
        <button
            title="Show notes outside the scale"
            on:click="{() => {
                showOutsideScale = !showOutsideScale;
                draw();
            }}"
        >
            non-scale notes {showOutsideScale ? toggleOnIcon : toggleOffIcon}
        </button>
    </div>
    <div class="visualization" bind:this="{container}"></div>
    <div class="control">
        <ResetNotesButton bind:notes {saveToStorage} callback="{draw}" />
        <ImportExportButton {loadData} {getExportData} appId="{appInfo.id}" />
        <button on:click="{() => loadData(example)}"> example </button>
        <HistoryButton appId="{appInfo.id}" {loadData} />
        <ShareConfigButton {getExportData} {loadData} appId="{appInfo.id}" />
    </div>
    <RatingButton appId="{appInfo.id}" />
    <MidiInput {noteOn} />
</main>
