<script>
    import { afterUpdate, onDestroy, onMount } from 'svelte';
    import * as Plot from '@observablehq/plot';
    import ResetNotesButton from '../common/input-elements/reset-notes-button.svelte';
    import MidiInput from '../common/input-handlers/midi-input.svelte';
    import ImportExportButton from '../common/input-elements/import-export-share-button.svelte';
    import { localStorageAddRecording } from '../lib/localstorage';
    import { VELOCITIES_LOGIC, VELOCITIES_MEANING } from '../lib/music';
    import HistoryButton from '../common/input-elements/history-button.svelte';
    import example1 from '../example-recordings/dynamics/dynamics-e1.json';
    import example2 from '../example-recordings/dynamics/dynamics-e2.json';
    import example3 from '../example-recordings/dynamics/dynamics-e3.json';
    import example4 from '../example-recordings/dynamics/dynamics-e4.json';
    import * as d3 from 'd3';
    import ExerciseDrawer from '../common/exercise-drawer.svelte';
    import RatingButton from '../common/input-elements/rating-button.svelte';
    import { drumPitchReplacementMapMD90 } from '../lib/drums';
    import { Midi } from 'musicvis-lib';
    import { NOTE_COLORS } from '../lib/colors';
    import InsideTextButton from '../common/input-elements/inside-text-button.svelte';
    import NumberInput from '../common/input-elements/number-input.svelte';
    import SelectScollable from '../common/input-elements/select-scollable.svelte';
    import ToggleButton from '../common/input-elements/toggle-button.svelte';
    import FileDropTarget from '../common/file-drop-target.svelte';
    import MidiReplayButton from '../common/input-elements/midi-replay-button.svelte';

    /**
     * contains the app meta information defined in App.js
     */
    export let appInfo;

    let windowWidth = window.innerWidth;
    $: width = windowWidth < 1200 ? 900 : Math.floor(windowWidth - 200);
    // let height = 600;
    let height = 300;
    let container;
    const velocities = VELOCITIES_LOGIC;
    // settings
    let isBinning = false;
    let barLimit = 50;
    let coloring = 'none';
    // data
    let firstTimeStamp;
    let notes = [];
    // app state
    let isPlaying;
    let isDataLoaded = false;

    const noteOn = (e) => {
        if (notes.length === 0) {
            firstTimeStamp = e.timestamp;
        }
        const noteInSeconds = (e.timestamp - firstTimeStamp) / 1000;
        const note = {
            time: noteInSeconds,
            velocity: e.rawVelocity,
            number: e.note.number,
            note: e.note.name + (e.note.accidental ?? ''),
            isSharp: e.note.accidental ? true : false,
            channel: e.message.channel,
        };
        notes = [...notes, note];
    };

    const draw = () => {
        // round bars' height to make view clearer
        let binnedVelocities = notes;
        if (isBinning) {
            const veloBinValues = [...velocities.keys()];
            binnedVelocities = notes.map((note) => {
                const minIndex = d3.minIndex(veloBinValues, (v) =>
                    Math.abs(note.velocity - v),
                );
                return { ...note, velocity: veloBinValues[minIndex] };
            });
        }
        const rules = [...velocities.keys()];
        let colorRange;
        let colorDomain;
        if (coloring === 'sharps') {
            colorDomain = ['natural', 'sharp'];
            colorRange = ['#ddd', '#888'];
        } else if (coloring === 'channel') {
            colorRange = d3.schemeObservable10;
            colorDomain = d3.range(colorRange.length);
        } else if (coloring === 'note') {
            colorDomain = Midi.NOTE_NAMES;
            colorRange = NOTE_COLORS.noteColormapAccessible2;
        } else if (coloring === 'drum') {
            const drumLabels = [...drumPitchReplacementMapMD90.values()].map(
                (d) => d.label,
            );
            colorDomain = [...new Set(drumLabels), 'other'];
            colorRange = d3.schemeObservable10;
        }
        const plot = Plot.plot({
            width,
            height,
            marginLeft: 45,
            marginRight: 120,
            x: {
                axis: false,
            },
            y: {
                domain: [0, 128],
            },
            color: {
                legend: coloring !== 'none',
                type: 'categorical',
                domain: colorDomain,
                range: colorRange,
            },
            marks: [
                Plot.barY(binnedVelocities.slice(-barLimit), {
                    x: (d, i) => i,
                    y: (d) => d.velocity,
                    fill: (d) => {
                        if (coloring === 'none') {
                            return '#ddd';
                        } else if (coloring === 'channel') {
                            return d.channel % colorDomain.length;
                        } else if (coloring === 'sharps') {
                            return d.isSharp ? 'sharp' : 'natural';
                        } else if (coloring === 'drum') {
                            return (
                                drumPitchReplacementMapMD90.get(d.number)
                                    ?.label ?? 'other'
                            );
                        } else if (coloring === 'note') {
                            return d.note;
                        }
                    },
                    // round upper corners
                    rx1y1: 4,
                    rx2y1: 4,
                    inset: 0,
                    dx: 0.5,
                }),
                Plot.ruleY(rules, { stroke: '#888' }),
                Plot.axisY({
                    anchor: 'left',
                    ticks: rules,
                    tickFormat: (d) => velocities.get(d),
                    tickSize: 0,
                }),
                Plot.axisY({
                    anchor: 'right',
                    ticks: rules,
                    tickFormat: (d) =>
                        VELOCITIES_MEANING.get(velocities.get(d)),
                    tickSize: 0,
                }),
            ],
        });
        container.textContent = '';
        container.appendChild(plot);
    };

    afterUpdate(draw);

    /**
     * Used for exporting and for automatics saving
     */
    const getExportData = () => {
        return {
            isBinning,
            barLimit,
            coloring,
            // data
            notes,
        };
    };

    /**
     * Import data from file or example
     */
    const loadData = (json) => {
        saveToStorage();
        isBinning = json.isBinning;
        barLimit = json.barLimit;
        coloring = json.coloring ?? 'none';
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

    onDestroy(saveToStorage);
</script>

<svelte:window bind:innerWidth="{windowWidth}" />

<FileDropTarget {loadData} disabled="{isPlaying}">
    <main class="app">
        <h2>{appInfo.title}</h2>
        <p class="explanation">
            This app helps practicing controlling the loudness of notes, for
            example to keep at a roughly constant loudness, play accents, or
            smoothly in- or decrease it. The loudness of each note is be shown
            as a bar in chart below. Bar heights can be rounded to the closest
            <a
                href="https://en.wikipedia.org/wiki/Dynamics_(music)"
                target="_blank"
                referrerpolicy="no-referrer"
            >
                dynamics marking
            </a>
            for a clearer overview.
        </p>
        <div class="control">
            <ToggleButton
                label="rounding"
                title="You can change between seeing exact bar heights and binned (rounded) heights."
                bind:checked="{isBinning}"
            />
            <NumberInput
                title="The number of most recent notes that are shown as bars."
                label="bars"
                bind:value="{barLimit}"
                step="{25}"
                min="{25}"
                max="{1000}"
                defaultValue="{50}"
            />
            <SelectScollable label="color" bind:value="{coloring}">
                {#each ['none', 'channel', 'sharps', 'note', 'drum'] as opt}
                    <option value="{opt}">{opt}</option>
                {/each}
            </SelectScollable>
        </div>
        <div class="visualization" bind:this="{container}"></div>
        <div class="control">
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
                1) Play all notes between a mezzo-piano (mp) and a forte (f).
                <InsideTextButton
                    onclick="{() => loadData(example1)}"
                    disabled="{isPlaying}"
                >
                    example
                </InsideTextButton>
            </p>
            <p>
                2) Play a crescendo, starting at below pp and rising until above
                ff smoothly.
                <InsideTextButton
                    onclick="{() => loadData(example2)}"
                    disabled="{isPlaying}"
                >
                    example
                </InsideTextButton>
            </p>
            <p>
                3) Play a descrescendo from above ff to below pp.
                <InsideTextButton
                    onclick="{() => loadData(example3)}"
                    disabled="{isPlaying}"
                >
                    example
                </InsideTextButton>
            </p>
            <p>
                4) Play accents, for example on each 4th note. They should be
                loud enough to be easily distinguishable from the non-accented
                notes.
                <InsideTextButton
                    onclick="{() => loadData(example4)}"
                    disabled="{isPlaying}"
                >
                    example
                </InsideTextButton>
            </p>
        </ExerciseDrawer>
        <MidiInput {noteOn} disabled="{isDataLoaded || isPlaying}" />
        <RatingButton appId="{appInfo.id}" />
    </main>
</FileDropTarget>
