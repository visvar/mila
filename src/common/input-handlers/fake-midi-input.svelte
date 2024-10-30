<script>
  import { Midi } from 'musicvis-lib';
  import ToggleButton from '../input-elements/toggle-button.svelte';

  /**
   * This component allows to use a PC keyboard for MIDI input
   */

  export let noteOn = (note) => {};
  export let noteOff = (note) => {};

  let enabled = false;
  const currentNotes = new Map();
  let octave = 4;

  const keyToNoteNumberMap = new Map([
    ['a', 0],
    ['w', 1],
    ['s', 2],
    ['e', 3],
    ['d', 4],
    ['f', 5],
    ['t', 6],
    ['g', 7],
    ['y', 8], // QUERTY
    ['z', 8], // QUERTZ
    ['h', 9],
    ['u', 10],
    ['j', 11],
    ['k', 12],
    ['o', 13],
    ['l', 14],
    ['p', 15],
  ]);

  const handleKeydown = (evt) => {
    const key = evt.key.toLowerCase();
    if (!enabled || !keyToNoteNumberMap.has(key) || evt.repeat) {
      return;
    }
    evt.preventDefault();
    const number = keyToNoteNumberMap.get(key) + octave * 12;
    const midi = Midi.MIDI_NOTES[number];
    const note = {
      number,
      name: midi.name.replace('#', ''),
      // name: midi.name,
      accidental: midi.name.endsWith('#') ? '#' : null,
    };
    const message = {
      note,
      message: { channel: 0 },
      timestamp: performance.now(),
      velocity: 1,
      rawVelocity: 127,
    };
    currentNotes.set(key, message);
    noteOn(message);
  };
  const handleKeyup = (evt) => {
    const key = evt.key.toLowerCase();
    if (!enabled || !keyToNoteNumberMap.has(key)) {
      return;
    }
    evt.preventDefault();
    const message = currentNotes.get(key);
    message.timestamp = performance.now();
    noteOff(message);
  };
</script>

<svelte:window on:keydown="{handleKeydown}" on:keyup="{handleKeyup}" />

<main>
  <div>
    <ToggleButton bind:checked="{enabled}" label="use keyboard" />
    octave {octave}
    <button on:click="{() => (octave = Math.min(octave + 1, 8))}" class="left"
      >+</button
    >
    <button on:click="{() => (octave = Math.max(octave - 1, 1))}" class="right"
      >-</button
    >
  </div>
  <div>Use your PC keyboard as a MIDI keyboard:</div>
  <div>a = C, w = C#, s = B, ...</div>
</main>

<style>
  main {
    width: fit-content;
    margin: 20px auto;
    padding: 5px 20px;
    border: 3px solid #f4f4f4;
    border-radius: 8px;
  }

  button.left {
    border-radius: 8px 0 0 8px;
    margin-right: -1px;
  }
  button.right {
    border-radius: 0 8px 8px 0;
    margin-left: -1px;
  }
</style>
