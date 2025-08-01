<script>
    import { afterUpdate, onDestroy, onMount } from 'svelte';
    import * as d3 from 'd3';
    import * as Plot from '@observablehq/plot';
    import { Midi } from 'musicvis-lib';
    import { NOTE_COLORS } from '../lib/colors';
    import { Chord, Note } from 'tonal';
    import MidiInput from '../common/input-handlers/midi-input.svelte';
    import { detectChords } from '../lib/chords';
    import ResetNotesButton from '../common/input-elements/reset-notes-button.svelte';
    import ImportExportButton from '../common/input-elements/import-export-share-button.svelte';
    import { localStorageAddRecording } from '../lib/localstorage';
    import example from '../example-recordings/chord-diagrams.json';
    import HistoryButton from '../common/input-elements/history-button.svelte';
    import ExerciseDrawer from '../common/exercise-drawer.svelte';
    import RatingButton from '../common/input-elements/rating-button.svelte';
    import NumberInput from '../common/input-elements/number-input.svelte';
    import FileDropTarget from '../common/file-drop-target.svelte';
    import InsideTextButton from '../common/input-elements/inside-text-button.svelte';

    /**
     * contains the app meta information defined in App.js
     */
    export let appInfo;

    let height = 200;
    let container;
    // settings
    let pastChords = 5;
    let maxFretSpan = 5;
    let maxNoteDistance = 0.1;
    // domain knowledge
    let stringCount = 6;
    let fretCount = 24;
    // E standard tuning, strings start at high E
    let tuningPitches = [64, 59, 55, 50, 45, 40];
    const tuningNotes = tuningPitches.map(Note.fromMidiSharps);
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
        const string = e.message.channel - 1;
        const note = {
            time: noteInSeconds,
            number: e.note.number,
            note: e.note.name + (e.note.accidental ?? ''),
            velocity: e.rawVelocity,
            string,
            fret: e.note.number - tuningPitches[string],
            channel: e.message.channel,
        };
        notes = [...notes, note];
    };

    const draw = () => {
        // clustering to chords
        let chords = detectChords(notes, maxNoteDistance);

        chords = chords.map((cNotes) => {
            // if two notes are on the same string, take the louder one
            cNotes = d3
                .groups(cNotes, (d) => d.string)
                .map(([string, sameString]) => {
                    const loudest = d3.maxIndex(sameString, (d) => d.velocity);
                    return sameString[loudest];
                });
            // remove notes that are too far
            const nonOpen = cNotes.filter((n) => n.fret > 0);
            let minFret;
            if (nonOpen.length === 0) {
                // if all notes are open strings, wehave to take 0
                minFret = 0;
            } else {
                // else we take the lowest non-open fret
                minFret = d3.min(nonOpen, (d) => d.fret);
            }
            const maxFret = minFret + maxFretSpan;
            return cNotes.filter((d) => d.fret <= maxFret);
        });

        // limit
        chords = chords
            .filter((d) => d.length > 2)
            .slice(-pastChords)
            // newwest on top so you don't have to scroll
            .reverse();

        // assign chord ID to all notes
        for (const [index, chord] of chords.entries()) {
            for (const note of chord) {
                note.chordId = index;
            }
        }

        const chordNames = chords.map((cNotes) => {
            let chordNotes = cNotes
                //  sort from C to B
                .sort((a, b) => a.number - b.number)
                // get name
                .map((d) => Note.fromMidiSharps(d.number));
            // remove duplicates
            chordNotes = [...new Set(chordNotes)];
            return Chord.detect(chordNotes);
        });

        // plot
        const width = ((height - 35) / 3) * (maxFretSpan + 1) + 50;
        const cellSize = (width - 100) / (maxFretSpan + 2);
        container.textContent = '';
        for (const [index, chord] of chords.entries()) {
            const nonOpen = chord.filter((n) => n.fret > 0);
            let minFret = 0;
            if (nonOpen.length > 0) {
                minFret = d3.min(nonOpen, (d) => d.fret);
            }
            const maxFret = minFret + maxFretSpan;
            const plot = Plot.plot({
                width,
                height,
                marginLeft: 40,
                marginRight: 10,
                marginBottom: 25,
                padding: 0,
                figure: true,
                subtitle: chordNames[index].join(', '),
                style: { textAlign: 'center', margin: 'auto' },
                x: {
                    domain: d3.range(
                        minFret === 0 ? 0 : minFret - 1,
                        maxFret + 2,
                    ),
                    label: '',
                    tickSize: 0,
                    tickPadding: 15,
                },
                y: {
                    domain: d3.range(0, stringCount),
                    tickFormat: (d) => tuningNotes[d],
                    label: '',
                    tickSize: 0,
                    tickPadding: 15,
                },
                color: {
                    domain: d3.range(12),
                    range: NOTE_COLORS.noteColormap,
                    legend: index === 0,
                    marginLeft: 250,
                    width: 500,
                    type: 'categorical',
                    tickFormat: (d) => Midi.NOTE_NAMES[d],
                },
                r: {
                    domain: [0, 127],
                    range: [5, 10],
                },
                marks: [
                    //  frets
                    Plot.ruleX(d3.range(0, fretCount + 1), {
                        stroke: '#ddd',
                        dx: cellSize / 2,
                    }),
                    // strings
                    Plot.ruleY(d3.range(0, stringCount), {
                        stroke: '#ddd',
                        strokeWidth: (d) => Math.sqrt(d + 1),
                    }),
                    // inlay dots
                    Plot.dot([3, 5, 7, 9, 15, 17, 19, 21], {
                        x: (d) => d,
                        y: 2,
                        dy: cellSize / 2,
                        fill: '#ddd',
                        r: 8,
                    }),
                    Plot.dot([12, 12, 24, 24], {
                        x: (d) => d,
                        y: (d, i) => (i % 2 === 0 ? 1 : 3),
                        dy: cellSize / 2,
                        fill: '#ddd',
                        r: 8,
                    }),
                    // fretted notes
                    Plot.dot(
                        chord.filter((d) => d.fret > 0),
                        {
                            x: 'fret',
                            y: 'string',
                            r: 'velocity',
                            fill: (d) => d.number % 12,
                            tip: true,
                        },
                    ),
                    Plot.text(
                        chord.filter((d) => d.fret > 0),
                        {
                            x: 'fret',
                            y: 'string',
                            text: 'note',
                            fill: 'white',
                        },
                    ),
                    // open strings
                    Plot.dot(
                        chord.filter((d) => d.fret === 0),
                        {
                            x: minFret === 0 ? 0 : minFret - 1,
                            y: 'string',
                            r: 'velocity',
                            stroke: (d) => d.number % 12,
                            tip: true,
                        },
                    ),
                ],
            });
            container.appendChild(plot);
        }
    };

    afterUpdate(draw);

    /**
     * Used for exporting and for automatics saving
     */
    const getExportData = () => {
        return {
            pastChords,
            maxFretSpan,
            maxNoteDistance,
            notes,
        };
    };

    /**
     * Import data from file or example
     */
    const loadData = (json) => {
        saveToStorage();
        pastChords = json.pastChords;
        maxNoteDistance = json.maxNoteDistance;
        maxFretSpan = json.maxFretSpan;
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
            This app helps practicing different chord shapes on a guitar. Play
            chords you know (or don't know yet) and see the chord names and
            diagrams.
            <i>Only works with a MIDI pickup.</i>
        </p>
        <div class="control">
            <NumberInput
                title="maximum distance between notes such that they still count as beloning to the same chord/arpeggio"
                label="max. note distance"
                bind:value="{maxNoteDistance}"
                min="{0.05}"
                max="{5}"
                step="{0.05}"
            />
            <NumberInput
                title="maximum distance between the lowest and highest fret"
                label="max. fret span"
                bind:value="{maxFretSpan}"
                min="{5}"
                max="{25}"
                step="{1}"
            />
            <NumberInput
                title="The number of played chords that is displayed"
                label="chord count"
                bind:value="{pastChords}"
                min="{10}"
                max="{300}"
                step="{10}"
            />
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
            <ImportExportButton
                {loadData}
                {getExportData}
                appId="{appInfo.id}"
                disabled="{isPlaying}"
            />
        </div>
        <ExerciseDrawer>
            <p>
                1) Play an A minor chord and an E minor chord.
                <InsideTextButton onclick="{() => loadData(example)}">
                    example
                </InsideTextButton>
            </p>
            <p>
                2) Play chords you don't know by placing your fingers in
                different positions. If they sound good, look what they are
                called.
            </p>
            <p>3) Play an A minor chord in three different positions.</p>
        </ExerciseDrawer>
        <MidiInput {noteOn} disabled="{isDataLoaded || isPlaying}" />
        <RatingButton appId="{appInfo.id}" />
    </main>
</FileDropTarget>
