<script>
    import { onMount } from 'svelte';
    import * as d3 from 'd3';
    import { Chord, Note } from 'tonal';
    import MidiInput from '../common/input-handlers/midi-input.svelte';

    export let toolInfo;

    // data
    let firstTimeStamp = 0;
    let notes = [];
    let chordNotes = [];
    let chord = [];

    const noteOn = (e) => {
        if (notes.length === 0) {
            firstTimeStamp = e.timestamp;
        }
        const noteInSeconds = (e.timestamp - firstTimeStamp) / 1000;
        const note = {
            number: e.note.number,
            velocity: e.rawVelocity,
            time: noteInSeconds,
            channel: e.message.channel,
        };
        notes.push(note);
        draw();
    };

    const draw = () => {
        const maxTime = d3.max(notes, (d) => d.time);
        // get chord
        chordNotes = notes
            // only notes from last second
            .filter((d) => d.time > maxTime - 1)
            //  sort from C to B
            .sort((a, b) => a.number - b.number)
            // get name
            .map((d) => Note.fromMidiSharps(d.number));
        // remove duplicates
        chordNotes = [...new Set(chordNotes)];
        chord = Chord.detect(chordNotes);
    };

    onMount(draw);
</script>

<main class="app">
    <h2>{toolInfo.title}</h2>
    <p class="explanation">
        Play a chord on a MIDI instrument. The notes you played and the detected
        chord will be shown below.
    </p>
    <div class="visualization">
        Notes: <b>{chordNotes.join(', ')}</b><br />
        Detected chord: <b>{chord.join(' or ')}</b>
    </div>
    <MidiInput {noteOn} />
</main>
