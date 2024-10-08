<script>
    import { onDestroy, onMount } from 'svelte';
    import * as d3 from 'd3';
    import * as Plot from '@observablehq/plot';
    import { Scale } from '@tonaljs/tonal';
    import { Midi, Utils } from 'musicvis-lib';
    import { toggleOffIcon, toggleOnIcon } from '../lib/icons';
    import MetronomeButton from '../common/metronome-button.svelte';
    import TempoInput from '../common/tempo-input.svelte';
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
    import example from '../example-recordings/improvisation-scale-degrees-bar.json';
    import ToggleButton from '../common/toggle-button.svelte';

    /**
     * contains the app meta information defined in App.js
     */
    export let appInfo;

    let width = 900;
    let height = 500;
    let container;
    // settings
    let root = 'A';
    let scale = 'minor pentatonic';
    let useColors = true;
    let showOutsideScale = true;
    let tempo = 120;
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
        if (notes.length === 0) {
            return;
        }
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

        // group by bar
        const barDuration = Utils.bpmToSecondsPerBeat(tempo) * 4;
        const byBar = d3.groups(notes, (d) => Math.floor(d.time / barDuration));

        let data = [];
        // create one histogram per bar
        for (const [barId, notes] of byBar) {
            // note chroma from 0 to 11 (C to B)
            const rootOffsets = notes.map((d) => {
                const chroma = d.number % 12;
                const offset = chroma - rootNr;
                return offset >= 0 ? offset : offset + 12;
            });
            const counted = d3
                .groups(rootOffsets, (d) => d)
                .map(([key, grp]) => {
                    return {
                        value: key,
                        count: grp.length,
                        barId,
                    };
                });
            data = data.concat(counted);
        }

        // TODO: allow setting
        const maxBar = Math.floor(notes.at(-1).time / barDuration);
        const minBar = maxBar - 7;
        data = data.filter((d) => d.barId >= minBar);

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
                range: ['#666', '#aaa', '#ddd'],
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
            fx: {
                label: null,
                axis: false,
            },
            marks: [
                // bar line
                Plot.ruleX([0], { strokeWidth: 2, stroke: 'darkgray' }),
                // Plot.barX(data, {
                Plot.waffleX(data, {
                    x: 'count',
                    y: 'value',
                    fx: 'barId',
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
        container.textContent = '';
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
            tempo,
            // data
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
        tempo = json.tempo;
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

<main class="app">
    <h2>{appInfo.title}</h2>
    <p class="explanation">
        This app helps practicing how to use the different degrees of a scale.
        The bar chart below shows how often you played each scale degree.
    </p>
    <ExerciseDrawer>
        <p>1) Improvise in A minor pentatonic.</p>
        <p>2) Improvise in a scale you did not know before.</p>
        <p>3) Try to change the key, for example in every fourth bar.</p>
    </ExerciseDrawer>
    <div class="control">
        <ScaleSelect
            bind:scaleRoot="{root}"
            bind:scaleType="{scale}"
            callback="{draw}"
        />
    </div>
    <div class="control">
        <TempoInput bind:value="{tempo}" callback="{draw}" />
        <ToggleButton
            label="colors"
            title="Use colors for root, in-scale, outside-scale"
            bind:checked="{useColors}"
            callback="{draw}"
        />
        <ToggleButton
            label="non-scale notes"
            title="Show notes outside the scale"
            bind:checked="{showOutsideScale}"
            callback="{draw}"
        />
        <!-- <label
            title="You can filter out bars that are shorter than a given note duration."
        >
            filtering
            <select bind:value="{filterNote}" on:change="{draw}">
                <option value="{0}">off</option>
                {#each [16, 32, 64, 128] as g}
                    <option value="{g}">1/{g} note</option>
                {/each}
            </select>
        </label> -->
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
