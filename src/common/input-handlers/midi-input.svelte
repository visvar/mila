<script>
  /**
   * This component handles MIDI input and takes care of setting up and destroying event listeners
   */
  import { onDestroy, onMount } from 'svelte';
  import { WebMidi } from 'webmidi';
  import { Midi } from 'musicvis-lib';
  import ToggleButton from '../input-elements/toggle-button.svelte';
  import * as Tone from 'tone';
  import { updSet } from '../../lib/lib';
  import { fade } from 'svelte/transition';
  import NumberInput from '../input-elements/number-input.svelte';

  export let midiMessage = (message) => {};
  export let noteOn = (message) => {};
  export let noteOff = (message) => {};
  export let controlChange = (message) => {};
  export let pitchBend = (message) => {};
  export let errorCallback = (err) => console.error(err);
  export let disabled = false;

  export let synthAllowed = true;
  export let pcKeyAllowed = false;
  /**
   * turn on/off synth from outside
   * @type {boolean}
   */
  export let synthActive = false;
  /**
   * allow using PC keyboard (e.g., in case there is no MIDI device)
   * @type {boolean}
   */
  export let keyboardEnabled = false;
  export let keyboardOctave = 4;

  let midiDevices = [];
  let midiWorks = true;
  let disabledDevices = new Set();
  let synth;
  let minVelocity = 0;
  let minIoi = 0;
  let lastNoteTime = 0;

  /**
   * Set all required MIDI listeners
   */
  const onMidiEnabled = () => {
    midiDevices = [];
    if (WebMidi.inputs.length < 1) {
      console.warn('No MIDI device detected');
      midiWorks = false;
    } else {
      WebMidi.inputs.forEach((device, index) => {
        device.removeListener();
        if (!disabledDevices.has(index)) {
          device.addListener('noteon', (evt) => {
            // apply noise filters
            if (
              evt.velocity >= minVelocity &&
              evt.timestamp - lastNoteTime > minIoi
            ) {
              lastNoteTime = evt.timestamp;
              noteOn(evt);
            }
          });
          device.addListener('noteoff', noteOff);
          device.addListener('controlchange', controlChange);
          device.addListener('pitchbend', pitchBend);
          device.addListener('midimessage', midiMessage);
          // synth
          device.addListener('noteon', playSynthNote);
          device.addListener('noteoff', stopSynthNote);
        }
      });
      midiDevices = [...WebMidi.inputs];
    }
  };

  onMount(() => {
    // enable Web Midi
    WebMidi.enable()
      .then(onMidiEnabled)
      .catch((err) => {
        midiWorks = false;
        errorCallback(err);
      });
    // enable synthesizer
    synth = new Tone.PolySynth().toDestination();
    // see https://tonejs.github.io/docs/15.0.4/classes/Sampler.html#constructor
    // TODO: does not work although samples are found
    // synth = new Tone.Sampler({
    //   urls: {
    //     A0: 'A0.mp3',
    //     A1: 'A1.mp3',
    //     A2: 'A2.mp3',
    //     A3: 'A3.mp3',
    //     A4: 'A4.mp3',
    //     A5: 'A5.mp3',
    //     A6: 'A6.mp3',
    //     A7: 'A7.mp3',
    //     Ab1: 'Ab1.mp3',
    //     Ab2: 'Ab2.mp3',
    //     Ab3: 'Ab3.mp3',
    //     Ab4: 'Ab4.mp3',
    //     Ab5: 'Ab5.mp3',
    //     Ab6: 'Ab6.mp3',
    //     Ab7: 'Ab7.mp3',
    //     B0: 'B0.mp3',
    //     B1: 'B1.mp3',
    //     B2: 'B2.mp3',
    //     B3: 'B3.mp3',
    //     B4: 'B4.mp3',
    //     B5: 'B5.mp3',
    //     B6: 'B6.mp3',
    //     B7: 'B7.mp3',
    //     Bb0: 'Bb0.mp3',
    //     Bb1: 'Bb1.mp3',
    //     Bb2: 'Bb2.mp3',
    //     Bb3: 'Bb3.mp3',
    //     Bb4: 'Bb4.mp3',
    //     Bb5: 'Bb5.mp3',
    //     Bb6: 'Bb6.mp3',
    //     Bb7: 'Bb7.mp3',
    //     C1: 'C1.mp3',
    //     C2: 'C2.mp3',
    //     C3: 'C3.mp3',
    //     C4: 'C4.mp3',
    //     C5: 'C5.mp3',
    //     C6: 'C6.mp3',
    //     C7: 'C7.mp3',
    //     C8: 'C8.mp3',
    //     D1: 'D1.mp3',
    //     D2: 'D2.mp3',
    //     D3: 'D3.mp3',
    //     D4: 'D4.mp3',
    //     D5: 'D5.mp3',
    //     D6: 'D6.mp3',
    //     D7: 'D7.mp3',
    //     Db1: 'Db1.mp3',
    //     Db2: 'Db2.mp3',
    //     Db3: 'Db3.mp3',
    //     Db4: 'Db4.mp3',
    //     Db5: 'Db5.mp3',
    //     Db6: 'Db6.mp3',
    //     Db7: 'Db7.mp3',
    //     E1: 'E1.mp3',
    //     E2: 'E2.mp3',
    //     E3: 'E3.mp3',
    //     E4: 'E4.mp3',
    //     E5: 'E5.mp3',
    //     E6: 'E6.mp3',
    //     E7: 'E7.mp3',
    //     Eb1: 'Eb1.mp3',
    //     Eb2: 'Eb2.mp3',
    //     Eb3: 'Eb3.mp3',
    //     Eb4: 'Eb4.mp3',
    //     Eb5: 'Eb5.mp3',
    //     Eb6: 'Eb6.mp3',
    //     Eb7: 'Eb7.mp3',
    //     F1: 'F1.mp3',
    //     F2: 'F2.mp3',
    //     F3: 'F3.mp3',
    //     F4: 'F4.mp3',
    //     F5: 'F5.mp3',
    //     F6: 'F6.mp3',
    //     F7: 'F7.mp3',
    //     G1: 'G1.mp3',
    //     G2: 'G2.mp3',
    //     G3: 'G3.mp3',
    //     G4: 'G4.mp3',
    //     G5: 'G5.mp3',
    //     G6: 'G6.mp3',
    //     G7: 'G7.mp3',
    //     Gb1: 'Gb1.mp3',
    //     Gb2: 'Gb2.mp3',
    //     Gb3: 'Gb3.mp3',
    //     Gb4: 'Gb4.mp3',
    //     Gb5: 'Gb5.mp3',
    //     Gb6: 'Gb6.mp3',
    //     Gb7: 'Gb7.mp3',
    //   },
    //   // baseUrl: `${location.origin}${location.pathname}/soundfonts/acoustic-grand-piano/`,
    //   baseUrl: `soundfonts/acoustic-grand-piano/`,
    //   onload: () => {
    //     console.log('loaded');
    //     synth.triggerAttackRelease(['C1', 'E1', 'G1', 'B1'], 0.5);
    //   },
    // }).toDestination();
  });

  onDestroy(() => {
    // remove MIDI listeners to avoid duplicate calls and improve performance
    for (const input of WebMidi.inputs) {
      input.removeListener();
    }
    // WebMidi.disable();
    synth?.dispose();
  });

  const currentNotes = new Map();
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
    [';', 16], // QUERTY
    ['ö', 16], // QUERTZ
    ["'", 17], // QUERTY
    ['ä', 17], // QUERTZ
  ]);

  /**
   * synth note start
   * @param evt
   */
  const playSynthNote = (evt) => {
    if (synthActive) {
      const name = evt.note.name + (evt.note.accidental ?? '');
      const octave = Math.floor(evt.note.number / 12);
      synth.triggerAttack(`${name}${octave}`, Tone.now(), evt.velocity);
    }
  };

  /**
   * synth note end
   * @param evt
   */
  const stopSynthNote = (evt) => {
    if (synthActive) {
      const name = evt.note.name + (evt.note.accidental ?? '');
      const octave = Math.floor(evt.note.number / 12);
      synth.triggerRelease(`${name}${octave}`, Tone.now());
    }
  };

  /**
   * PC keyboard support note start
   * @param evt
   */
  const handleKeydown = (evt) => {
    const key = evt.key.toLowerCase();
    if (!keyboardEnabled || !keyToNoteNumberMap.has(key) || evt.repeat) {
      return;
    }
    evt.preventDefault();
    const number = keyToNoteNumberMap.get(key) + keyboardOctave * 12;
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
      rawVelocity: 64,
    };
    currentNotes.set(key, message);
    noteOn(message);
    playSynthNote(message);
  };

  /**
   * PC keyboard support note end
   * @param evt
   */
  const handleKeyup = (evt) => {
    const key = evt.key.toLowerCase();
    if (!keyboardEnabled || !keyToNoteNumberMap.has(key)) {
      return;
    }
    evt.preventDefault();
    const message = currentNotes.get(key);
    if (message) {
      message.timestamp = performance.now();
      noteOff(message);
      stopSynthNote(message);
    }
  };
</script>

<svelte:window on:keydown="{handleKeydown}" on:keyup="{handleKeyup}" />

<main>
  <h4>Input Settings</h4>
  {#if disabled}
    <div>
      MIDI input is disabled when data is loaded or played back. Reset or stop
      playing to enable input.
    </div>
  {:else}
    {#if synthAllowed}
      <ToggleButton
        label="synth"
        title="Use built-in synth while playing?"
        bind:checked="{synthActive}"
        callback="{(checked) => {
          if (!checked) {
            synth?.releaseAll();
          }
        }}"
      />
    {/if}
    {#if pcKeyAllowed}
      <ToggleButton
        bind:checked="{keyboardEnabled}"
        label="use keyboard"
        title="When enabled, you can use a PC keyboard similar to a MIDI keyboard"
        callback="{(checked) => {
          if (!checked) {
            synth?.releaseAll();
          }
        }}"
      />
    {/if}
    {#if keyboardEnabled}
      <div transition:fade>
        <div>
          octave {keyboardOctave}
          <button
            on:click="{() =>
              (keyboardOctave = Math.min(keyboardOctave + 1, 8))}"
            class="left">+</button
          >
          <button
            on:click="{() =>
              (keyboardOctave = Math.max(keyboardOctave - 1, 1))}"
            class="right">-</button
          >
        </div>
        <div>
          You can use a PC keyboard as a MIDI keyboard and play note with: <br
          /><code>a</code> = C, <code>w</code> = C#,
          <code>s</code> = B, ...
        </div>
      </div>
    {/if}
    <div>
      <h5>MIDI devices</h5>
      {#if !midiWorks}
        You have no MIDI device connected or MIDI is not supported in your
        browser
      {/if}
      {#each midiDevices as device, index}
        <ToggleButton
          label="{device.name}"
          callback="{() => {
            disabledDevices = updSet(disabledDevices, index);
            onMidiEnabled();
          }}"
        />
      {/each}
    </div>
    <div>
      <h5>Filtering</h5>
      <NumberInput
        title="minimum loudness of a note, used to filter noise"
        label="minimum velocity"
        bind:value="{minVelocity}"
        min="{0}"
        max="{1}"
        step="{0.01}"
        defaultValue="{0}"
      />
      <NumberInput
        title="minimum distance in milliseconds of a note onset from the prior one"
        label="minimum IOI"
        bind:value="{minIoi}"
        min="{0}"
        max="{100}"
        step="{1}"
        defaultValue="{0}"
      />
    </div>
  {/if}
</main>

<style>
  main {
    margin: 20px auto;
    width: 700px;
    padding: 0 20px 15px 20px;
    border: 3px solid #f4f4f4;
    border-radius: 8px;
    transition: all 500ms;
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
