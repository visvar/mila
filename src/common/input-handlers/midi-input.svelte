<script>
  /**
   * This component handles MIDI input and takes care of setting up and destroying event listeners
   */
  import { onDestroy, onMount } from 'svelte';
  import { WebMidi } from 'webmidi';
  import { Midi } from 'musicvis-lib';
  import ToggleButton from '../input-elements/toggle-button.svelte';

  export let midiMessage = (message) => {};
  export let noteOn = (message) => {};
  export let noteOff = (message) => {};
  export let controlChange = (message) => {};
  export let pitchBend = (message) => {};

  export let errorCallback = (err) => console.error(err);
  export let pcKeyAllowed = false;

  // allow access to MIDI device list
  export let midiDevices = [];

  let midiWorks = true;

  /**
   * Set all required MIDI listeners
   */
  const onMidiEnabled = () => {
    midiDevices = [];
    if (WebMidi.inputs.length < 1) {
      console.warn('No MIDI device detected');
    } else {
      WebMidi.inputs.forEach((device, index) => {
        console.log(`MIDI device ${index}: ${device.name}`);
        device.addListener('midimessage', midiMessage);
        device.addListener('noteon', noteOn);
        device.addListener('noteoff', noteOff);
        device.addListener('controlchange', controlChange);
        device.addListener('pitchbend', pitchBend);
      });
      midiDevices = [...WebMidi.inputs];
    }
  };

  onMount(() => {
    WebMidi.enable()
      .then(onMidiEnabled)
      .catch(() => {
        midiWorks = false;
        errorCallback();
      });
  });

  onDestroy(() => {
    // remove MIDI listeners to avoid duplicate calls and improve performance
    for (const input of WebMidi.inputs) {
      input.removeListener();
    }
  });

  /**
   * fallback to PC keyboard in case there is no MIDI device
   */
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

{#if pcKeyAllowed}
  <main>
    <div>
      If you have no MIDI device, you can use a PC keyboard as a MIDI keyboard:
    </div>
    <div>
      <ToggleButton bind:checked="{enabled}" label="use keyboard" />
      octave {octave}
      <button on:click="{() => (octave = Math.min(octave + 1, 8))}" class="left"
        >+</button
      >
      <button
        on:click="{() => (octave = Math.max(octave - 1, 1))}"
        class="right">-</button
      >
    </div>
    <div>Notes: a = C, w = C#, s = B, ...</div>
  </main>
{/if}

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
