<script>
    import { afterUpdate } from 'svelte';
    import * as d3 from 'd3';
    import * as Plot from '@observablehq/plot';
    import { Note, Scale } from 'tonal';
    import MidiInput from '../common/input-handlers/midi-input.svelte';
    import example1 from '../example-recordings/fretboard-improvisation-intervals/fretboard-improvisation-intervals-1.json';
    import example2 from '../example-recordings/fretboard-improvisation-intervals/fretboard-improvisation-intervals-2.json';
    import ToggleButton from '../common/input-elements/toggle-button.svelte';
    import ExerciseDrawer from '../common/exercise-drawer.svelte';
    import RatingButton from '../common/input-elements/rating-button.svelte';
    import ScaleSelect from '../common/input-elements/scale-select.svelte';
    import { NOTE_TO_CHROMA_MAP } from '../lib/music';
    import MidiReplayButton from '../common/input-elements/midi-replay-button.svelte';
    import InsideTextButton from '../common/input-elements/inside-text-button.svelte';

    /**
     * contains the app meta information defined in App.js
     */
    export let appInfo;

    let width = 900;
    let container;
    // settings
    let root = 'A';
    let scale = 'minor pentatonic';
    let showNames = false;
    let limitFrets = false;
    // data
    let firstTimeStamp;
    let notes = [];
    let isPlaying = false;
    // domain knowledge
    let stringCount = 6;
    let fretCount = 24;
    // E standard tuning, strings start at high E
    let tuningPitches = [64, 59, 55, 50, 45, 40];
    const tuningNotes = tuningPitches.map(Note.fromMidiSharps);

    const noteOn = (e) => {
        if (notes.length === 0) {
            firstTimeStamp = e.timestamp;
        }
        const string = e.message.channel - 1;
        const fret = e.note.number - tuningPitches[string];
        // filter noise
        if (fret < 0 || fret > fretCount) {
            return;
        }
        const noteInSeconds = (e.timestamp - firstTimeStamp) / 1000;
        const note = {
            number: e.note.number,
            velocity: e.rawVelocity,
            time: noteInSeconds,
            channel: e.message.channel,
            string,
            fret,
        };
        notes = [...notes, note];
    };

    const draw = () => {
        const lastNote = notes.at(-1);
        console.log('draw', lastNote);
        const data = [];
        if (lastNote) {
            const lastNoteChroma = lastNote.number % 12;
            // get scale intervals
            const scaleInfo = Scale.get(`${root} ${scale}`);
            const scaleNotes = new Map(
                scaleInfo.notes.map((note, i) => {
                    // note chroma from 0 to 11 (C to B)
                    const chroma = NOTE_TO_CHROMA_MAP.get(note);
                    let offset = chroma - lastNoteChroma;
                    offset = offset >= 0 ? offset : offset + 12;
                    const info = {
                        name: note,
                        chroma,
                        interval: scaleInfo.intervals[i],
                        degree: i,
                        offset,
                    };
                    return [chroma, info];
                }),
            );
            if (!scaleNotes.has(lastNoteChroma)) {
                return;
            }
            const lastNoteDegree = scaleNotes.get(lastNoteChroma).degree;
            // if frets are limited to within reach
            let minFret = 0;
            let maxFret = fretCount;
            if (limitFrets) {
                minFret = lastNote.fret - 4;
                maxFret = lastNote.fret + 4;
            }
            // get interval positions
            for (let string = 0; string < stringCount; string++) {
                for (let fret = minFret; fret < maxFret + 1; fret++) {
                    const midi = (tuningPitches[string] + fret) % 12;
                    // only consider notes in scale
                    if (!scaleNotes.has(midi)) {
                        continue;
                    }
                    const n = scaleNotes.get(midi);
                    const degStep = n.degree - lastNoteDegree;
                    data.push({
                        ...n,
                        string,
                        fret,
                        step: n.offset,
                        degreeStep:
                            degStep >= 0 ? degStep : degStep + scaleNotes.size,
                    });
                }
            }
        }

        const cellSize = (width - 100) / 25;
        const plot = Plot.plot({
            width,
            // height,
            marginLeft: 50,
            marginBottom: 40,
            padding: 0,
            aspectRatio: 1,
            x: {
                domain: d3.range(0, fretCount + 1),
                tickSize: 0,
            },
            y: {
                domain: d3.range(0, stringCount),
                tickFormat: (d) => tuningNotes[d],
                tickSize: 0,
            },
            color: {
                legend: true,
                marginLeft: 100,
                width: 400,
                type: 'ordinal',
                scheme: 'YlGnBu',
                // domain: [0, 3, 4, 7],
                // range: ['black', 'red'],
            },
            marks: [
                // frets
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
                // last note
                lastNote
                    ? Plot.cell([lastNote], {
                          x: 'fret',
                          y: 'string',
                          fill: 'black',
                          tip: true,
                          inset: 2,
                          rx: 5,
                      })
                    : null,
                // notes
                Plot.cell(data, {
                    x: 'fret',
                    y: 'string',
                    fill: 'degreeStep',
                    inset: 6,
                    rx: 10,
                    tip: true,
                }),
                Plot.text(data, {
                    x: 'fret',
                    y: 'string',
                    fill: 'white',
                    text: showNames ? 'name' : 'degreeStep',
                    stroke: '#aaa',
                    strokeWidth: 3,
                }),
            ],
        });

        container.textContent = '';
        container.appendChild(plot);
    };

    afterUpdate(draw);

    /**
     * Import data from file or example
     */
    const loadData = (json) => {
        root = json.root;
        scale = json.scale;
        // data
        notes = json.notes;
        draw();
    };
</script>

<main class="app">
    <h2>{appInfo.title}</h2>
    <p class="explanation">
        This app helps practicing scales on a guitar. Each time you play a note,
        the fretboard below shows you how far each note of the scale is away
        from the note you just played.
    </p>
    <div class="control">
        <ScaleSelect bind:scaleRoot="{root}" bind:scaleType="{scale}" />
        <ToggleButton
            bind:checked="{showNames}"
            title="Toggle between note names and scale steps"
            label="note names"
        />
        <ToggleButton
            bind:checked="{limitFrets}"
            title="Limit frets to those that are in reach"
            label="limit frets"
        />
    </div>
    <div class="visualization" bind:this="{container}"></div>
    <div class="control">
        <MidiReplayButton bind:notes bind:isPlaying />
    </div>
    <ExerciseDrawer>
        <p>
            1) Go through the scale in steps of 1.
            <InsideTextButton
                onclick="{() => loadData(example1)}"
                disabled="{isPlaying}"
            >
                example
            </InsideTextButton>
        </p>
        <p>
            2) Go through the scale in steps of 2.
            <InsideTextButton
                onclick="{() => loadData(example2)}"
                disabled="{isPlaying}"
            >
                example
            </InsideTextButton>
        </p>
        <p>3) Go through the scale in steps of 3.</p>
        <p>4) ...</p>
    </ExerciseDrawer>
    <RatingButton appId="{appInfo.id}" />
    <MidiInput {noteOn} />
</main>
