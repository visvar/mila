<script>
    import { afterUpdate, onDestroy, onMount } from 'svelte';
    import * as Plot from '@observablehq/plot';
    import ResetNotesButton from '../common/input-elements/reset-notes-button.svelte';
    import MidiInput from '../common/input-handlers/midi-input.svelte';
    import ImportExportButton from '../common/input-elements/import-export-share-button.svelte';
    import { localStorageAddRecording } from '../lib/localstorage';
    import { VELOCITIES_LOGIC, VELOCITIES_MEANING } from '../lib/music';
    import HistoryButton from '../common/input-elements/history-button.svelte';
    import example1 from '../example-recordings/dynamics-chords/dynamics-chords.json';
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
    import { detectChords } from '../lib/chords';
    import { Chord } from 'tonal';

    /**
     * contains the app meta information defined in App.js
     */
    export let appInfo;

    let windowWidth = window.innerWidth;
    $: width = windowWidth < 1200 ? 900 : Math.floor(windowWidth - 200);
    // let height = 600;
    let height = 400;
    let container;
    const velocities = VELOCITIES_LOGIC;
    const radiusFactor = 12;
    // settings
    let rounding = false;
    let maxNoteDistance = 0.1;
    let chordLimit = 16;
    let yAxis = 'note';
    let coloring = 'none';
    let filterOneNoteChords = false;
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
        const veloBinValues = [...velocities.keys()];
        let notesRoundedVelocities = notes.map((note) => {
            const minIndex = d3.minIndex(veloBinValues, (v) =>
                Math.abs(note.velocity - v),
            );
            const rounded = veloBinValues[minIndex];
            return {
                ...note,
                velocityRounded: rounded,
                velocityLabel: velocities.get(rounded),
            };
        });
        let chords = detectChords(notesRoundedVelocities, maxNoteDistance);
        if (filterOneNoteChords) {
            chords = chords.filter((chord) => chord.length > 1);
        }
        chords = chords.slice(-chordLimit);
        const notesInChords = chords.flatMap((chord, chordIndex) =>
            chord.map((n) => {
                return { ...n, chordIndex: chordIndex };
            }),
        );
        const drumLabels = [
            ...drumPitchReplacementMapMD90.values(),
            'other',
        ].map((d) => d.label);
        let colorRange;
        let colorDomain;
        let colorAccessor = (d) => d.note;

        // react to coloring setting
        if (coloring === 'sharps') {
            colorDomain = ['natural', 'sharp'];
            colorRange = ['#ddd', '#888'];
            colorAccessor = (d) => (d.isSharp ? 'sharp' : 'natural');
        } else if (coloring === 'channel') {
            colorRange = d3.schemeObservable10;
            colorDomain = d3.range(colorRange.length);
            colorAccessor = (d) => d.channel;
        } else if (coloring === 'note') {
            colorDomain = Midi.NOTE_NAMES;
            colorRange = NOTE_COLORS.noteColormapAccessible2;
            colorAccessor = (d) => d.note;
        } else if (coloring === 'drum') {
            colorDomain = [...new Set(drumLabels), 'other'];
            colorRange = d3.schemeObservable10;
            colorAccessor = (d) =>
                drumPitchReplacementMapMD90.get(d.number)?.label ?? 'other';
        } else {
            colorRange = ['#888'];
            colorDomain = ['uniform color'];
            colorAccessor = () => 'uniform color';
        }
        // react to y axis setting
        let yDomain = Midi.NOTE_NAMES;
        let yAccessor = (d) => d.note;
        let yAxisReverse = false;
        let yType = undefined;
        let yTicks = undefined;
        let yTickFormat = undefined;
        if (yAxis === 'loudness') {
            yDomain = rounding ? [...velocities.values()] : d3.range(128);
            yAccessor = rounding ? (d) => d.velocityLabel : (d) => d.velocity;
            yAxisReverse = rounding;
            if (!rounding) {
                yType = 'linear';
                yTicks = d3.range(0, 129, 16);
            }
        } else if (yAxis === 'channel') {
            yDomain = d3.range(10);
            yAccessor = (d) => d.channel;
        } else if (yAxis === 'note') {
            yDomain = Midi.NOTE_NAMES;
            yAccessor = (d) => d.note;
            yAxisReverse = true;
        } else if (yAxis === 'drum') {
            yDomain = drumLabels;
            yAccessor = (d) =>
                drumPitchReplacementMapMD90.get(d.number)?.label ?? 'other';
        } else if (yAxis === 'number') {
            yDomain = d3.range(128);
            yAccessor = (d) => d.number;
            yType = 'linear';
            yTicks = d3.range(0, 129, 12);
            yTickFormat = (d) => Midi.MIDI_NOTES[d].label;
        } else if (yAxis === 'number (adaptive)') {
            const extent = d3.extent(notesInChords, (d) => d.number);
            yDomain = d3.range(extent[0], extent[1] + 1);
            yAccessor = (d) => d.number;
            yType = 'linear';
            yTicks = d3.range(0, 129, 12);
            yTickFormat = (d) => Midi.MIDI_NOTES[d].label;
        } else if (yAxis === 'number (piano)') {
            yDomain = d3.range(21, 21 + 88 + 1);
            yAccessor = (d) => d.number;
            yType = 'linear';
            yTicks = d3.range(0, 129, 12);
            yTickFormat = (d) => Midi.MIDI_NOTES[d].label;
        }

        const xDomain = d3.range(chordLimit);
        const chordNames = chords.map((chord) =>
            Chord.detect(chord.map((d) => d.note)),
        );

        const plot = Plot.plot({
            width,
            height,
            // marginTop: 30,
            marginLeft: 50,
            marginRight: 50,
            marginBottom: 70,
            x: {
                label: 'chords',
                ticks: xDomain,
                domain: xDomain,
                tickFormat: (d) => '',
                tickSize: 0,
                padding: 1,
                grid: true,
            },
            y: {
                domain: yDomain,
                reverse: yAxisReverse,
                label: yAxis,
                type: yType,
                ticks: yTicks,
                tickFormat: yTickFormat,
                nice: false,
            },
            color: {
                legend: true,
                type: 'categorical',
                domain: colorDomain,
                range: colorRange,
            },
            r: {
                domain: [0, 127],
                range: [0, radiusFactor],
            },
            marks: [
                // note dots
                Plot.dot(notesInChords, {
                    x: 'chordIndex',
                    y: yAccessor,
                    fill: colorAccessor,
                    r: rounding ? 'velocityRounded' : 'velocity',
                    tip: true,
                    title: (d) =>
                        `${d.note} ${d.velocityLabel} (${d.velocity})`,
                }),
                // chord names
                Plot.text(chordNames, {
                    x: (d, i) => i,
                    frameAnchor: 'bottom',
                    textAnchor: 'middle',
                    lineAnchor: 'middle',
                    dy: 30,
                    text: (chord) => chord.join('\n'),
                    fill: '#000',
                    fontSize: 10,
                    rotate: -90,
                }),
                Plot.axisY({
                    anchor: 'left',
                }),
                Plot.axisY({
                    anchor: 'right',
                }),
            ],
        });

        // area legend
        const legendTicks = [...VELOCITIES_LOGIC.keys()].map((d) => d / 127);
        const legend = Plot.plot({
            width,
            height: 55,
            marginTop: 0,
            marginLeft: width * 0.35,
            marginRight: width * 0.35,
            marginBottom: 30,
            x: {
                label: 'loudness',
                labelAnchor: 'center',
                ticks: legendTicks,
                tickSize: 0,
                tickPadding: 3,
                tickFormat: (d, i) => [...VELOCITIES_LOGIC.values()][i],
            },
            y: {
                labelAnchor: 'center',
            },
            r: {
                domain: [0, 1],
                range: [0, radiusFactor],
            },
            marks: [
                Plot.dotX(legendTicks, {
                    x: (d, i) => d,
                    fill: '#888',
                    r: (d) => d,
                }),
            ],
        });
        container.textContent = '';
        container.appendChild(legend);
        container.appendChild(plot);
    };

    afterUpdate(draw);

    /**
     * Used for exporting and for automatics saving
     */
    const getExportData = () => {
        return {
            rounding,
            maxNoteDistance,
            chordLimit,
            yAxis,
            coloring,
            filterOneNoteChords,
            // data
            notes,
        };
    };

    /**
     * Import data from file or example
     */
    const loadData = (json) => {
        saveToStorage();
        rounding = json.rounding ?? false;
        maxNoteDistance = json.maxNoteDistance ?? 0.1;
        chordLimit = json.chordLimit ?? 16;
        yAxis = json.yAxis ?? 'note';
        coloring = json.coloring ?? 'none';
        filterOneNoteChords = json.filterOneNoteChords ?? false;
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
            This app helps practicing controlling the loudness of notes within
            and between chords, for example to make sure all notes in a chord
            have the same loudness. Chords are shown from left to right (newest
            on the right) and the loudness of each note is encode in the dot
            size. Sizes can be rounded can be rounded to the closest
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
                bind:checked="{rounding}"
            />
            <ToggleButton
                label="filter single notes"
                title="When playing a mixture of single notes and chords, this option allows to only show chords."
                bind:checked="{filterOneNoteChords}"
            />
            <NumberInput
                title="maximum distance between notes such that they still count as beloning to the same chord/arpeggio"
                label="max. note distance"
                bind:value="{maxNoteDistance}"
                min="{0.05}"
                max="{5}"
                step="{0.05}"
                defaultValue="{0.1}"
            />
            <NumberInput
                title="The number of most recent chords that are shown."
                label="chords"
                bind:value="{chordLimit}"
                step="{4}"
                min="{4}"
                max="{1000}"
                defaultValue="{16}"
            />
        </div>
        <div class="control">
            <SelectScollable label="Y axis" bind:value="{yAxis}">
                {#each ['note', 'drum', 'channel', 'loudness', 'number', 'number (piano)', 'number (adaptive)'] as opt}
                    <option value="{opt}">{opt}</option>
                {/each}
            </SelectScollable>
            <SelectScollable label="color" bind:value="{coloring}">
                {#each ['none', 'sharps', 'note', 'drum', 'channel'] as opt}
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
                1) Play some chords with roughly the same loudness.
                <InsideTextButton
                    onclick="{() => loadData(example1)}"
                    disabled="{isPlaying}"
                >
                    example
                </InsideTextButton>
            </p>
            <p>
                2) Play a crescendo, starting at below pp and rising until above
                ff smoothly. Make sure all notes of each chord have roughly the
                same loudness.
                <!-- <InsideTextButton
                    onclick="{() => loadData(example2)}"
                    disabled="{isPlaying}"
                >
                    example
                </InsideTextButton> -->
            </p>
            <p>
                3) Play accents, for example on each 4th chord. They should be
                loud enough to be easily distinguishable from the non-accented
                notes.
                <!-- <InsideTextButton
                    onclick="{() => loadData(example4)}"
                    disabled="{isPlaying}"
                >
                    example
                </InsideTextButton> -->
            </p>
            <p>
                4) Play chords interleaved with a melody and try to have a
                consistent loudness in all notes.
                <!-- <InsideTextButton
                    onclick="{() => loadData(example4)}"
                    disabled="{isPlaying}"
                >
                    example
                </InsideTextButton> -->
            </p>
        </ExerciseDrawer>
        <MidiInput {noteOn} disabled="{isDataLoaded || isPlaying}" />
        <RatingButton appId="{appInfo.id}" />
    </main>
</FileDropTarget>
