<script>
    import { afterUpdate, onDestroy, onMount } from 'svelte';
    import * as d3 from 'd3';
    import * as Plot from '@observablehq/plot';
    import { Note } from 'tonal';
    import MidiInput from '../common/input-handlers/midi-input.svelte';
    import { localStorageAddRecording } from '../lib/localstorage';
    import { detectChords } from '../lib/chords';
    import ImportExportButton from '../common/input-elements/import-export-share-button.svelte';
    import HistoryButton from '../common/input-elements/history-button.svelte';
    import example from '../example-recordings/strumming-pattern.json';
    import ResetNotesButton from '../common/input-elements/reset-notes-button.svelte';
    import ExerciseDrawer from '../common/exercise-drawer.svelte';
    import RatingButton from '../common/input-elements/rating-button.svelte';
    import NumberInput from '../common/input-elements/number-input.svelte';
    import MidiReplayButton from '../common/input-elements/midi-replay-button.svelte';
    import FileDropTarget from '../common/file-drop-target.svelte';

    export let appInfo;
    $: width =
        window.innerWidth < 1200 ? 900 : Math.floor(window.innerWidth - 200);
    let height = 200;
    let stringCount = 6;
    // E standard tuning, strings start at high E
    let tuningPitches = [64, 59, 55, 50, 45, 40];
    const tuningNotes = tuningPitches.map(Note.fromMidiSharps);
    let container;
    // settings
    let pastSeconds = 10;
    let maxNoteDistance = 0.05;
    let minDuration = 0;
    // data
    let firstTimeStamp;
    let notes = [];
    let openNoteMap = new Map();
    // app state
    let isPlaying;
    let isDataLoaded = false;

    const noteOn = (e) => {
        if (notes.length === 0) {
            firstTimeStamp = e.timestamp;
        }
        const noteInSeconds = (e.timestamp - firstTimeStamp) / 1000;
        const string = e.message.channel - 1;
        const note = {
            // ...e.note,
            number: e.note.number,
            velocity: e.velocity,
            time: noteInSeconds,
            channel: e.message.channel,
            string,
            fret: e.note.number - tuningPitches[string],
        };
        // fix old note if its end was missed
        if (openNoteMap.has(e.note.number)) {
            const oldNote = openNoteMap.get(e.note.number);
            if (oldNote.end === undefined) {
                oldNote.end = noteInSeconds;
            }
        }
        notes = [...notes, note];
        openNoteMap.set(e.note.number, note);
    };

    const noteOff = (e) => {
        if (openNoteMap.has(e.note.number)) {
            const note = openNoteMap.get(e.note.number);
            const noteInSeconds = (e.timestamp - firstTimeStamp) / 1000;
            note.end = noteInSeconds;
            note.duration = note.end - note.time;
            notes = [...notes];
        }
    };

    const draw = () => {
        const filteredNoise = notes.filter((d) => {
            // only handle recent notes
            return (
                // filter noise
                d.duration === undefined || d.duration >= minDuration
            );
        });
        let maxTime = 0.5;
        if (filteredNoise.length > 0) {
            maxTime = notes.at(-1).time + 0.5;
        }
        const minTime = maxTime - pastSeconds;
        const filtered = notes.filter(
            (d) => d.end > minTime || d.end === undefined,
        );
        const chords = detectChords(filtered, maxNoteDistance);
        const chordInfo = chords.map((chord) => {
            const stringExtent = d3.extent(chord, (d) => d.string);
            const timeExtent = d3.extent(chord, (d) => d.time);
            const timeDelta = chord
                .slice(1)
                .map((n, i) => n.string - chord[i].string);
            let direction;
            if (stringExtent[0] === stringExtent[1]) {
                direction = 'single note';
            } else {
                direction = d3.median(timeDelta) > 0 ? 'up' : 'down';
            }
            return {
                minString: stringExtent[0],
                maxString: stringExtent[1],
                minTime: timeExtent[0],
                maxTime: timeExtent[1],
                direction,
                meanVelocity: d3.mean(chord, (d) => d.velocity),
            };
        });
        const config = {
            width,
            height,
            marginTop: 0,
            marginLeft: 45,
            marginBottom: 35,
        };
        // plot
        const plot = Plot.plot({
            ...config,
            x: {
                label: 'time in seconds',
                domain: [minTime, maxTime],
            },
            y: {
                label: 'string',
                grid: true,
                domain: d3.range(0, stringCount),
                tickFormat: (d) => tuningNotes[d],
            },
            color: {
                label: 'string',
                type: 'categorical',
                scheme: 'observable10',
                reverse: true,
                legend: true,
                marginLeft: 100,
                width: 300,
                domain: d3.range(1, stringCount + 1),
            },
            opacity: {
                domain: [0, 1],
            },
            marks: [
                Plot.tickX(filtered, {
                    clip: true,
                    x: 'time',
                    y: 'string',
                    stroke: 'channel',
                    opacity: 'velocity',
                    strokeWidth: 3,
                }),
            ],
        });
        const plot2 = Plot.plot({
            ...config,
            x: {
                label: 'time in seconds',
                domain: [minTime, maxTime],
            },
            y: {
                label: 'string',
                grid: true,
                domain: d3.range(0, stringCount),
                tickFormat: (d) => tuningNotes[d],
                padding: 0.7,
            },
            color: {
                label: 'strumming',
                type: 'categorical',
                scheme: 'observable10',
                legend: true,
                marginLeft: 100,
                width: 300,
                domain: ['up', 'down', 'single note'],
            },
            marks: [
                Plot.rect(chordInfo, {
                    clip: true,
                    x1: 'minTime',
                    x2: 'maxTime',
                    y1: 'minString',
                    y2: 'maxString',
                    fill: 'direction',
                    opacity: 'meanVelocity',
                    rx: 5,
                }),
                Plot.dot(chordInfo, {
                    clip: true,
                    x: (d) => (d.minTime + d.maxTime) / 2,
                    y: (d) =>
                        d.direction === 'down' ? d.minString : d.maxString,
                    fill: 'direction',
                    symbol: 'diamond',
                    r: 8,
                }),
            ],
        });
        container.textContent = '';
        container.appendChild(plot);
        container.appendChild(plot2);
    };

    afterUpdate(draw);

    /**
     * Used for exporting and for automatics saving
     */
    const getExportData = () => {
        return {
            pastSeconds,
            maxNoteDistance,
            // data
            notes,
        };
    };

    /**
     * Import data from file or example
     */
    const loadData = (json) => {
        saveToStorage();
        pastSeconds = json.pastSeconds;
        maxNoteDistance = json.maxNoteDistance;
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

<FileDropTarget {loadData} disabled="{isPlaying}">
    <main class="app">
        <h2>{appInfo.title}</h2>
        <p class="explanation">
            This app shows you how you strummed (up or down? which strings?), so
            you can make sure you strumm a pattern as intended. The upper chart
            shows you the when you played a note on which string. The lower
            chart shows you the time between the start of the first and last
            note of the chord (rectangle width) and which strings it spanned
            (rectangle y and height). Blue chords were strummed upward and
            orange ones downward. The strumming direction is further indicated
            by arrow heads. Due to how guitar tabs are drawn from the point of
            view of the guitarist, downward strumming will result in upward
            arrows in the lower visualization. Single notes are drawn in red.
            The opactiy encodes the notes' mean velocity (loudness).
        </p>
        <div class="control">
            <NumberInput
                title="time in seconds for past notes to be shown"
                label="time"
                bind:value="{pastSeconds}"
                min="{10}"
                max="{300}"
                step="{10}"
            />
            <NumberInput
                title="maximum distance between notes such that they still count as beloning to the same chord"
                label="max. note distance"
                bind:value="{maxNoteDistance}"
                min="{0.01}"
                max="{5}"
                step="{0.01}"
            />
            <NumberInput
                title="minimum duration of a note, used to filter noise"
                label="min. duration"
                bind:value="{minDuration}"
                min="{0}"
                max="{1}"
                step="{0.01}"
                defaultValue="{0}"
            />
        </div>
        <div class="visualization" bind:this="{container}"></div>
        <div class="control">
            <ResetNotesButton
                bind:notes
                bind:isDataLoaded
                disabled="{isPlaying}"
                {saveToStorage}
                callback="{() => {
                    openNoteMap = new Map();
                    firstTimeStamp = performance.now();
                }}"
            />
            <button on:click="{() => loadData(example)}" disabled="{isPlaying}">
                example
            </button>
            <HistoryButton
                appId="{appInfo.id}"
                {loadData}
                disabled="{isPlaying}"
            />
            <MidiReplayButton bind:isPlaying bind:notes callback="{draw}" />
            <ImportExportButton
                {loadData}
                {getExportData}
                appId="{appInfo.id}"
                disabled="{isPlaying}"
            />
        </div>
        <ExerciseDrawer>
            <p>
                1) Strum up and down alternating: <code>U D U D</code>.
            </p>
            <p>
                2) Strumming a pattern like <code>D U U D</code> or
                <code>D D U D</code>.
            </p>
            <p>
                3) Strum chords like Am, E, G, D and make sure you only strum
                the strings you intend.
            </p>
        </ExerciseDrawer>
        <MidiInput {noteOn} {noteOff} disabled="{isDataLoaded || isPlaying}" />
        <RatingButton appId="{appInfo.id}" />
    </main>
</FileDropTarget>
