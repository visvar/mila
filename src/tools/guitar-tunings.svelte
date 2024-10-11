<script>
    import { Guitar, Midi } from 'musicvis-lib';
    import ToggleButton from '../common/input-elements/toggle-button.svelte';

    export let toolInfo;
    let stringCount = 6;
    let tune = 0;
    let drop = false;
    let showOctave = true;

    const getTuning = (stringCount, tune, drop, showOctave) => {
        // get standard tuning for stringCount
        const std = Guitar.stringedTunings
            .get(stringCount > 5 ? 'Guitar' : 'Bass')
            .get(stringCount)[0].pitches;
        let pitches = std.map((d) => d + tune);
        // apply drop tuning
        if (drop) {
            pitches[0] -= 2;
        }
        // apply down/up tuning
        if (showOctave) {
            pitches = pitches.map((d) => Midi.MIDI_NOTES[d].label);
        } else {
            pitches = pitches.map((d) => Midi.MIDI_NOTES[d].name);
        }
        return pitches.join(' ');
    };

    $: current = getTuning(stringCount, tune, drop, showOctave);
</script>

<main>
    <h2>{toolInfo.title}</h2>
    <label>
        strings
        <input
            type="number"
            bind:value="{stringCount}"
            min="4"
            max="8"
            step="1"
        />
    </label>
    <label>
        tune up/down (semitones)
        <input type="number" bind:value="{tune}" min="-12" max="12" step="1" />
    </label>
    <ToggleButton bind:checked="{drop}" label="dropped" />
    <ToggleButton bind:checked="{showOctave}" label="octave" />
    <div>
        <p>
            You selected a {stringCount} string {stringCount >= 6
                ? 'guitar'
                : 'bass guitar'}, tuned {tune === 0
                ? 'in standard tuning'
                : `${Math.abs(tune)} ${tune < 0 ? 'steps down' : 'steps up'}`}
            {drop ? 'and dropped' : ''}
        </p>
        <p>
            Resulting tuning, low to high:<br />
            <b>{current}</b>
        </p>
    </div>
</main>
