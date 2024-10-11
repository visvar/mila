<script>
    import { onDestroy, onMount } from 'svelte';
    import * as d3 from 'd3';
    import * as Plot from '@observablehq/plot';
    import ResetNotesButton from '../common/input-elements/reset-notes-button.svelte';
    import MidiInput from '../common/input-handlers/midi-input.svelte';
    import ImportExportButton from '../common/input-elements/import-export-share-button.svelte';
    import { localStorageAddRecording } from '../lib/localstorage';
    import HistoryButton from '../common/input-elements/history-button.svelte';
    import ExerciseDrawer from '../common/exercise-drawer.svelte';
    import RatingButton from '../common/input-elements/rating-button.svelte';
    import example from '../example-recordings/improvisation-intervals.json';
    import ToggleButton from '../common/input-elements/toggle-button.svelte';
    import FileDropTarget from '../common/file-drop-target.svelte';

    /**
     * contains the app meta information defined in App.js
     */
    export let appInfo;

    let width = 900;
    // let height = 650;
    let height = 500;
    let container;
    // settings
    let filterUnison = true;
    let useColors = true;
    // data
    let firstTimeStamp;
    let notes = [];

    // domain knowledge
    // see https://muted.io/intervals-chart/
    const intervalNames = [
        { semitones: 0, name: 'Unison', short: 'P1', type: 'perfect' },
        { semitones: 1, name: 'Minor 2nd', short: 'm2', type: 'minor' },
        { semitones: 2, name: 'Major 2nd', short: 'M2', type: 'major' },
        { semitones: 3, name: 'Minor 3rd', short: 'm3', type: 'minor' },
        { semitones: 4, name: 'Major 3rd', short: 'M3', type: 'major' },
        { semitones: 5, name: 'Perfect 4th', short: 'P4', type: 'perfect' },
        { semitones: 6, name: 'Augmented 4th', short: 'A4', type: 'tritone' },
        { semitones: 7, name: 'Perfect 5th', short: 'P5', type: 'perfect' },
        { semitones: 8, name: 'Minor 6th', short: 'm6', type: 'minor' },
        { semitones: 9, name: 'Major 6th', short: 'M6', type: 'major' },
        { semitones: 10, name: 'Minor 7th', short: 'm7', type: 'minor' },
        { semitones: 11, name: 'Major 7th', short: 'M7', type: 'major' },
        { semitones: 12, name: 'Perfect 8ve', short: 'P8', type: 'perfect' },
    ];

    const noteOn = (e) => {
        if (notes.length === 0) {
            firstTimeStamp = e.timestamp;
        }
        const noteInSeconds = (e.timestamp - firstTimeStamp) / 1000;
        const note = {
            // ...e.note,
            number: e.note.number,
            velocity: e.rawVelocity,
            time: noteInSeconds,
        };
        notes.push(note);
        draw();
    };

    const draw = () => {
        // TODO: filter notes which are too close together
        // TODO: filter notes with low velocity
        let intervals = notes.map((d, i) =>
            i === 0 ? 0 : d.number - notes[i - 1].number,
        );
        if (filterUnison) {
            intervals = intervals.filter((d) => d !== 0);
        }
        intervals = intervals.map((d) => {
            if (Math.abs(d) <= 12) {
                return d;
            } else {
                const sub = d > 0 ? 12 : -12;
                while (Math.abs(d) > 12) {
                    d -= sub;
                }
                return d;
            }
        });
        const grouped = d3
            .groups(intervals, (d) => d)
            .map(([int, grp]) => {
                return { interval: int, count: grp.length };
            });

        const plot = Plot.plot({
            width,
            height,
            marginLeft: 120,
            marginRight: 10,
            // make sure note symbols etc work
            style: 'font-family: Inter, "Noto Symbols", "Noto Symbols 2", "Noto Music", sans-serif',
            color: {
                legend: useColors,
                domain: ['minor', 'major', 'perfect', 'tritone'],
                range: ['#7da2e8', '#ed796a', 'gold', '#ccc'],
                marginLeft: 100,
            },
            x: {
                // axis: false,
            },
            y: {
                // ticks: rules,
                tickFormat: (d) =>
                    d >= 0
                        ? `${intervalNames[d].name} (${d})`
                        : `${intervalNames[-d].name} (${d})`,
                domain: d3.range(-12, 13, 1),
                label: `🡸 going down ${' '.repeat(75)} going up 🡺     `,
                reverse: true,
                // type: 'ordinal',
            },
            marks: [
                Plot.ruleY([-12, 0, 12], { stroke: '#888', strokeWidth: 1.5 }),
                Plot.waffleX(grouped, {
                    x: 'count',
                    y: 'interval',
                    // fill: '#ddd',
                    fill: useColors
                        ? (d) => intervalNames[Math.abs(d.interval)].type
                        : '#ddd',
                    dx: 0.5,
                    rx: 4,
                    inset: 1,
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
            filterUnison,
            useColors,
            // data
            notes,
        };
    };

    /**
     * Import data from file or example
     */
    const loadData = (json) => {
        saveToStorage();
        filterUnison = json.filterUnison;
        useColors = json.useColors;
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
            This app helps practicing intervals between notes in a melody. You
            can play a note, then another one some interval apart, and so on.
            The bar chart below shows how often you played each interval: when
            you go up in pitch, the bar of the played interval in the top half
            will increase. If you go down, it will show up in the bottom half.
            Colors denote the type of interval, so you can quickly see if you
            play, for example, more major or minor intervals. The intervals are
            labelled by their name and the number of semitones (negative when
            going from higher to lower notes).
        </p>
        <div class="control">
            <ToggleButton
                label="unison"
                title="Toggle filtering unison intervals"
                bind:checked="{filterUnison}"
                callback="{draw}"
            />
            <ToggleButton
                label="colors"
                title="Use colors for interval types"
                bind:checked="{useColors}"
                callback="{draw}"
            />
        </div>
        <div class="visualization" bind:this="{container}"></div>
        <div class="control">
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
            <p>
                1) Play different notes and see which intervals are between
                them.
            </p>
            <p>2) Try to play only perfect 5ths.</p>
            <p>3) Try to play only perfect 5ths and major intervals.</p>
            <p>4) Try to play only perfect 5ths and minor intervals.</p>
        </ExerciseDrawer>
        <RatingButton appId="{appInfo.id}" />
        <MidiInput {noteOn} />
    </main>
</FileDropTarget>
