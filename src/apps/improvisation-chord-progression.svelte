<script>
  import { onDestroy, onMount } from 'svelte';
  import * as d3 from 'd3';
  import * as Plot from '@observablehq/plot';
  import { Scale, Chord, Progression } from 'tonal';
  import { Midi, Note as Note2 } from 'musicvis-lib';
  import NoteCountInput from '../common/input-elements/note-count-input.svelte';
  import MidiInput from '../common/input-handlers/midi-input.svelte';
  import ImportExportButton from '../common/input-elements/import-export-share-button.svelte';
  import { localStorageAddRecording } from '../lib/localstorage';
  import HistoryButton from '../common/input-elements/history-button.svelte';
  import ResetNotesButton from '../common/input-elements/reset-notes-button.svelte';
  import { Utils } from 'musicvis-lib';
  import ExerciseDrawer from '../common/exercise-drawer.svelte';
  import RatingButton from '../common/input-elements/rating-button.svelte';
  import ToggleButton from '../common/input-elements/toggle-button.svelte';
  import { NOTE_TO_CHROMA_MAP } from '../lib/music';
  import example from '../example-recordings/improvisation-note-colors.json';
  import FileDropTarget from '../common/file-drop-target.svelte';
  import SelectScollable from '../common/input-elements/select-scollable.svelte';
  import MidiReplayButton from '../common/input-elements/midi-replay-button.svelte';
  import { detectChords } from '../lib/chords.js';
  import NumberInput from '../common/input-elements/number-input.svelte';
  import TempoInput from '../common/input-elements/tempo-input.svelte';
  import Player from '../lib/Player';
  import * as Tone from 'tone';

  /**
   * contains the app meta information defined in App.js
   */
  export let appInfo;

  $: width = window.innerWidth < 1200 ? 900 : window.innerWidth - 200;
  let height = 250;
  let container;
  // colors
  const scaleColor = '#D4E157';
  const chordColor = '#689F38';
  const restColor = 'lightgray';
  const durationLimit = 1;
  // const noteNames = Midi.NOTE_NAMES_FLAT;
  const noteNames = Midi.NOTE_NAMES;
  const chordProgressions = [
    {
      label: 'ii V I (2-5-1) 7th',
      chords: ['IIm7', 'V7', 'IMaj7', 'IMaj7'],
      chordsShort: ['ii', 'V', 'I', 'I'],
    },
    {
      label: 'ii V I (2-5-1)',
      chords: ['IIm', 'V', 'I', 'I'],
      chordsShort: ['ii', 'V', 'I', 'I'],
    },
    {
      label: 'I ii V (1-2-7)',
      chords: ['IMaj7', 'IIm7', 'V7', 'V7'],
      chordsShort: ['I', 'ii', 'V', 'V'],
    },
  ];
  $: chordProgressionsNotes = chordProgressions.map((p) => {
    const chords = Progression.fromRomanNumerals(root, p.chords);
    const chordNotes = chords.map((c) => new Set(Chord.get(c).notes));
    return { ...p, chordNotes };
  });
  let chordProgLabel = chordProgressions[0].label;
  $: chordProg = chordProgressionsNotes.filter(
    (d) => d.label === chordProgLabel,
  )[0];
  // player for 'backing track'
  const player = new Player().setVolume(3);
  player.preloadInstrument('acoustic_grand_piano');
  // synth for played notes
  let synth;
  // settings
  let root = 'C';
  let scaleType = 'major';
  let tempo = 90;
  let maxNoteDistance = 0.1;
  let barCount = 50;
  let useSynth = true;
  // data
  let firstTimeStamp = 0;
  let notes = [];
  let openNoteMap = new Map();
  $: scaleNotes = new Set(
    Scale.get(`${root} ${scaleType}`).notes.map(
      (d) => noteNames[NOTE_TO_CHROMA_MAP.get(d)],
    ),
  );
  $: barDuration = Utils.bpmToSecondsPerBeat(tempo) * 4;
  let currentChordIndex = 0;

  const noteOn = (e) => {
    // if (notes.length === 0) {
    //   firstTimeStamp = e.timestamp;
    // }
    const noteInSeconds = (e.timestamp - firstTimeStamp) / 1000;
    const note = {
      name: e.note.name + (e.note.accidental ?? ''),
      number: e.note.number,
      velocity: e.velocity,
      time: noteInSeconds,
      channel: e.message.channel,
      duration: 0,
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
    if (useSynth) {
      synth.triggerAttack(
        `${note.name}${Math.floor(note.number / 12)}`,
        Tone.now(),
        note.velocity,
      );
    }
    draw();
  };

  const noteOff = (e) => {
    if (openNoteMap.has(e.note.number)) {
      const note = openNoteMap.get(e.note.number);
      const noteInSeconds = (e.timestamp - firstTimeStamp) / 1000;
      note.end = noteInSeconds;
      note.duration = note.end - note.time;
      if (useSynth) {
        synth.triggerRelease(
          `${note.name}${Math.floor(note.number / 12)}`,
          Tone.now(),
        );
      }
    }
    draw();
  };

  const draw = () => {
    const notes2 = notes.map((note) => {
      // is this note in bar 1, 2, 3, 4?
      const currentBar = Math.floor(note.time / barDuration) % 4;
      const currentChordNotes = chordProg.chordNotes[currentBar];
      // assign color
      let colorType = 'rest';
      // if (note.name === root) {
      //   colorType = 'root';
      // } else
      if (currentChordNotes.has(note.name)) {
        colorType = 'chord';
      } else if (scaleNotes.has(note.name)) colorType = 'scale';
      return {
        ...note,
        colorType,
        chord: chordProg.chords[currentBar],
        chordShort: chordProg.chordsShort[currentBar],
      };
    });

    container.textContent = '';
    const limited = notes2.slice(-barCount);
    const plot = Plot.plot({
      width,
      height,
      marginLeft: 50,
      marginBottom: 50,
      padding: 0,
      x: {
        axis: false,
      },
      y: {
        axis: true,
        domain: [0, durationLimit],
        label: 'duration in seconds',
        labelAnchor: 'center',
      },
      color: {
        domain: ['chord', 'scale', 'rest'],
        range: [chordColor, scaleColor, restColor],
        // legend: true,
        // marginLeft: width / 2 - 100,
      },
      marks: [
        Plot.ruleY([0], {
          stroke: '#ddd',
        }),
        // data
        Plot.barY(limited, {
          x: (d, i) => i,
          y: (d) => {
            // if bar height is duration, show currently held notes in full height
            return d.duration > 0 ? d.duration : durationLimit;
          },
          fill: 'colorType',
          stroke: 'colorType',
          fillOpacity: (d) =>
            // if bar height is duration, show currently held notes without fill, only stroke
            d.duration === 0 ? 0 : 1,
          inset: 1.5,
          rx: 4,
          // tip: true,
        }),
        Plot.text(limited, {
          x: (d, i) => i,
          y: 0,
          text: (d) => d.name.split('').join('\n'),
          fontSize: 12,
          dy: 16,
        }),
        // chord progression chord
        Plot.text(limited, {
          x: (d, i) => i,
          y: 0,
          // text: 'chordShort',
          text: (d, i, array) => {
            // only print name when it changed
            if (i === 0) {
              return d.chordShort;
            }
            if (d.chordShort !== array[i - 1].chordShort) {
              return d.chordShort;
            }
          },
          fontSize: 12,
          dy: 36,
        }),
      ],
    });
    container.appendChild(plot);

    // chords as arrays of notes
    const chords = detectChords(notes2, maxNoteDistance)
      .slice(-barCount)
      // sort notes in chord by pitch
      .map((notes) => notes.sort((a, b) => a.number - b.number));
    // musical name of each chord (if found)
    const chordNames = chords.map((chord) =>
      Chord.detect(chord.map((d) => d.name)),
    );
    const chordNotes = chords.flatMap((chord, chordIndex) =>
      chord.map((n, noteIndex) => {
        return { ...n, chordIndex, noteIndex };
      }),
    );

    const chordPlot = Plot.plot({
      width,
      height: 300,
      marginLeft: 30,
      marginRight: 50,
      marginTop: 60,
      marginBottom: 120,
      padding: 0,
      x: {
        axis: false,
      },
      y: {
        ticks: [],
        label: 'chord notes sorted by pitch',
        labelAnchor: 'center',
      },
      color: {
        domain: ['chord', 'scale', 'rest'],
        range: [chordColor, scaleColor, restColor],
      },
      marks: [
        // chord notes
        Plot.rectY(chordNotes, {
          y1: (d) => d.noteIndex,
          y2: (d) => d.noteIndex + 1,
          x: 'chordIndex',
          fill: 'colorType',
          stroke: 'colorType',
          offset: 'normalize',
          rx: 4,
          inset: 1.5,
        }),
        // chord note text labels
        Plot.text(chordNotes, {
          x: 'chordIndex',
          y: 'noteIndex',
          text: (d) => d.name.split('').join('\n'),
          fontSize: 10,
          fill: 'black',
          stroke: '#eee',
          strokeWidth: 3,
          dy: -12,
        }),
        // chord progression chord
        Plot.text(chords, {
          x: (d, i) => i,
          y: 0,
          text: (d, i, array) => {
            // only print name when it changed
            if (i === 0) {
              return d[0]?.chordShort;
            }
            if (d[0].chordShort !== array[i - 1][0].chordShort) {
              return d[0]?.chordShort;
            }
          },
          fontSize: 12,
          dy: 8,
          textAnchor: 'middle',
        }),
        // chord names, if detected
        Plot.text(chordNames, {
          x: (d, i) => i,
          y: 0,
          text: (d) => d.join('   '),
          fontSize: 11,
          dy: 28,
          rotate: 90,
          textAnchor: 'start',
        }),
      ],
    });
    container.appendChild(chordPlot);
  };

  onMount(() => {
    draw();
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

  /**
   * Used for exporting and for automatics saving
   */
  const getExportData = () => {
    return {
      root,
      scaleType,
      chordProgLabel,
      barCount,
      // data
      notes,
    };
  };

  /**
   * Import data from file or example
   */
  const loadData = (json) => {
    saveToStorage();
    root = json.root;
    scaleType = json.scaleType1;
    chordProgLabel = json.chordProgLabel;
    barCount = json.barCount;
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

  /**
   * plays a synthesized backing track based on the chord progression and tempo settings
   */
  const toggleBackingTrack = () => {
    // if not started, start playing
    if (!player.isPlaying()) {
      firstTimeStamp = performance.now();
      const octave = 4;
      const chords = chordProg.chordNotes;
      const quarter = Utils.bpmToSecondsPerBeat(tempo);
      const notes = chords.flatMap((cNotes, bar) => {
        // each chord is one bar
        return d3.range(4).flatMap((beat) => {
          // ... with 4 beats
          const time = quarter * (beat + 4 * bar);
          return [...cNotes].map((note) => {
            // ... and each beat has the notes of the current chord
            const number = NOTE_TO_CHROMA_MAP.get(note) + octave * 12;
            return Note2.from({
              pitch: number,
              start: time,
              end: time + quarter,
              duration: quarter,
              velocity: beat === 0 ? 0.7 : 0.5,
              channel: 0,
            });
          });
        });
      });
      player.playNotes(notes, 'acoustic_grand_piano', 0, undefined, 1, true);
      player.onTimeChange(() => {
        currentChordIndex =
          Math.floor(
            (performance.now() - firstTimeStamp) / 1000 / barDuration,
          ) % 4;
      });
    } else {
      // otherwise just toggle mute
      player.isMuted() ? player.unMute() : player.mute();
    }
  };

  onDestroy(() => {
    saveToStorage();
    player.stop();
  });
</script>

<FileDropTarget {loadData}>
  <main class="app">
    <h2>{appInfo.title}</h2>
    <p class="explanation">
      This app helps practicing improvising in a scale over a chord progression.
      Notes that you play are shown as bars. The color shows whether a note
      belongs to the current chord, the scale, or neither. For example, when
      improvising in C Major over ii-V-I, the notes that fit the currently
      active chord will be dark green, notes that fit C Major will be light
      green, and all others will be gray. The bars' height encodes the notes'
      durations.
    </p>
    <div class="control">
      <SelectScollable label="root note" bind:value="{root}" callback="{draw}">
        {#each Midi.NOTE_NAMES as n}
          <option value="{n}">{n}</option>
        {/each}
      </SelectScollable>
      <SelectScollable
        label="progression"
        bind:value="{chordProgLabel}"
        callback="{draw}"
        style="background-color: {chordColor};"
      >
        {#each chordProgressions as prog}
          <option value="{prog.label}">{prog.label}</option>
        {/each}
      </SelectScollable>
      <SelectScollable
        label="scale type"
        bind:value="{scaleType}"
        callback="{draw}"
        style="background-color: {scaleColor};"
      >
        {#each ['major', 'minor'] as s}
          <option value="{s}">{s}</option>
        {/each}
      </SelectScollable>
    </div>
    <div class="control">
      <TempoInput bind:value="{tempo}" callback="{draw}" />
      <NoteCountInput bind:value="{barCount}" callback="{draw}" />
      <NumberInput
        title="maximum distance between notes such that they still count as beloning to the same chord/arpeggio"
        label="max. note distance"
        bind:value="{maxNoteDistance}"
        callback="{draw}"
        min="{0.05}"
        max="{2}"
        step="{0.05}"
      />
      <ToggleButton
        label="synth"
        title="Use built-in synth while playing?"
        bind:checked="{useSynth}"
        callback="{draw}"
      />
    </div>
    <div>
      <!-- legend -->
      <div class="legend">
        {#each chordProg.chords as chord, index}
          <div
            style="background: {chordColor}; border-color: {index ===
            currentChordIndex
              ? '#555'
              : 'transparent'}"
          >
            {chord}:<br />
            {[...chordProg.chordNotes[index]].join(', ')}
          </div>
        {/each}
        <div style="background: {scaleColor};">
          {scaleType}:<br />
          {[...scaleNotes].join(', ')}
        </div>
        <div style="background: {restColor};">
          chromatic:<br />
          {[...d3.difference(Midi.NOTE_NAMES, scaleNotes)].join(', ')}
        </div>
      </div>
      <div class="visualization" bind:this="{container}"></div>
      <div class="control">
        <button on:click="{toggleBackingTrack}"> play backing track </button>
        <ResetNotesButton
          bind:notes
          {saveToStorage}
          callback="{() => {
            openNoteMap = new Map();
            draw();
          }}"
        />
        <button on:click="{() => loadData(example)}"> example </button>
        <HistoryButton appId="{appInfo.id}" {loadData} />
        <MidiReplayButton bind:notes callback="{draw}" />
        <ImportExportButton {loadData} {getExportData} appId="{appInfo.id}" />
      </div>
      <ExerciseDrawer>
        <p>
          1) Improvise something only using the notes of the pentatonic scale.
        </p>
        <p>2) Improvise something only using the notes of the current chord.</p>
      </ExerciseDrawer>
      <MidiInput {noteOn} {noteOff} pcKeyAllowed />
      <RatingButton appId="{appInfo.id}" />
    </div>
  </main>
</FileDropTarget>

<style>
  .legend div {
    display: inline-block;
    margin: 3px;
    padding: 5px 10px;
    border-radius: 8px;
    border: 4px solid transparent;
  }
</style>
