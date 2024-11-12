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
  import { MIDI_SHARPS, NOTE_TO_CHROMA_MAP } from '../lib/music';
  import example from '../example-recordings/improvisation-chord-progression.json';
  import FileDropTarget from '../common/file-drop-target.svelte';
  import SelectScollable from '../common/input-elements/select-scollable.svelte';
  import MidiReplayButton from '../common/input-elements/midi-replay-button.svelte';
  import { detectChords } from '../lib/chords.js';
  import NumberInput from '../common/input-elements/number-input.svelte';
  import TempoInput from '../common/input-elements/tempo-input.svelte';
  import Player from '../lib/Player';

  /**
   * contains the app meta information defined in App.js
   */
  export let appInfo;

  $: width = window.innerWidth < 1200 ? 900 : window.innerWidth - 200;
  let container;
  let midiReplaySpeed;
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
  let backingTrackVolume = 1;
  const player = new Player();
  $: player?.setVolume(backingTrackVolume);
  player.preloadInstrument('acoustic_grand_piano');
  // settings
  let root = 'C';
  let scaleType = 'major';
  let tempo = 90;
  let maxNoteDistance = 0.1;
  let barCount = 50;
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
    draw();
  };

  const noteOff = (e) => {
    if (openNoteMap.has(e.note.number)) {
      const note = openNoteMap.get(e.note.number);
      const noteInSeconds = (e.timestamp - firstTimeStamp) / 1000;
      note.end = noteInSeconds;
      note.duration = note.end - note.time;
    }
    draw();
  };

  const draw = () => {
    const quarter = Utils.bpmToSecondsPerBeat(tempo);
    const notes2 = notes.map((note) => {
      // is this note in bar 1, 2, 3, 4?
      const currentBar = Math.floor(note.time / barDuration) % 4;
      const currentChordNotes = chordProg.chordNotes[currentBar];
      // assign color
      let colorType = 'rest';
      if (currentChordNotes.has(note.name)) {
        colorType = 'chord';
      } else if (scaleNotes.has(note.name)) colorType = 'scale';
      return {
        ...note,
        time: note.time / quarter,
        colorType,
        chord: chordProg.chords[currentBar],
        chordShort: chordProg.chordsShort[currentBar],
      };
    });

    const limited = notes2.slice(-barCount);
    container.textContent = '';
    const notePlot = Plot.plot({
      width,
      height: 200,
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
    container.appendChild(notePlot);

    // chords as arrays of notes
    const chords = detectChords(notes2, maxNoteDistance)
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
        domain: d3.range(
          Math.max(chords.length - barCount, 0),
          chords.length - 1,
        ),
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

    if (chordNotes.length === 0) {
      return;
    }

    const minBeat = Math.floor((chordNotes.at(0)?.time ?? 0) / 16) * 16;
    const maxBeat = chordNotes.at(-1)?.time ?? 4;

    // const yDomain = [...scaleNotes]
    //   .map((d) => Midi.NOTE_NAMES.indexOf(d))
    //   .sort();
    // console.log(yDomain);
    const yDomain = d3.range(12);

    const rowPlot = Plot.plot({
      width,
      height: 300,
      marginLeft: 50,
      marginRight: 50,
      marginTop: 30,
      marginBottom: 120,
      padding: 0,
      x: {
        // axis: false,
        label: 'time in beats',
        // tick format as bar : beat
        tickFormat: (d) => {
          const beat = d - minBeat;
          const bar = beat / 4;
          return `${Math.floor(bar) + 1} : ${Math.floor(beat % 4) + 1}`;
        },
      },
      y: {
        domain: yDomain,
        ticks: yDomain,
        tickFormat: (d) => Midi.NOTE_NAMES[d],
        label: 'notes',
        labelAnchor: 'center',
        reverse: true,
      },
      color: {
        domain: ['chord', 'scale', 'rest'],
        range: [chordColor, scaleColor, restColor],
      },
      fy: {
        // padding: 5,
      },
      marks: [
        // sharps
        Plot.ruleY(MIDI_SHARPS, {
          stroke: '#eee',
          strokeWidth: 10,
        }),
        // beats
        Plot.ruleX(d3.range(minBeat, maxBeat + 2, 1), {
          stroke: '#e8e8e8',
          strokeWidth: 1,
        }),
        // bars
        Plot.ruleX(d3.range(minBeat, maxBeat + 5, 4), {
          stroke: '#ccc',
          strokeWidth: 2,
        }),
        // chord repetitions
        Plot.ruleX(d3.range(minBeat, maxBeat + 5, 16), {
          stroke: '#666',
          strokeWidth: 2,
        }),
        // chord progression chord
        Plot.text(d3.range(minBeat, maxBeat, 4), {
          x: (d) => d + 2,
          y: 11,
          text: (d) => chordProg.chordsShort[(d / 4) % chordProg.chords.length],
          fontSize: 12,
          dy: -30,
          textAnchor: 'middle',
        }),
        // axis for bars
        Plot.axisX({
          ticks: d3.range(minBeat, maxBeat, 4),
          // tickSize: 28,
          tickSize: 16,
          tickPadding: -11,
          tickFormat: (d) => ` ${(d - minBeat) / 4 + 1}`,
          textAnchor: 'start',
          color: '#ccc',
          strokeWidth: 2,
        }),
        // chord notes
        Plot.rectX(chordNotes, {
          // fy: (d) => Math.floor(d.time / 16),
          // x1: (d) => d.time % 16,
          // x2: (d) => (d.time + d.duration) % 16,
          x1: (d) => Math.round(d.time * 2) / 2,
          x2: (d) =>
            Math.round(d.time * 2) / 2 + Math.floor(d.duration * 2) / 2 + 0.5,
          y: (d) => d.number % 12,
          fill: 'colorType',
          stroke: '#eee',
          rx: 4,
        }),
        // chord names, if detected
        Plot.text(chordNames, {
          x: (d, i) => chords[i][0]?.time ?? 0,
          y: 0,
          text: (d) => d.join('   '),
          fontSize: 11,
          dy: 70,
          rotate: 90,
          textAnchor: 'start',
        }),
      ],
    });
    container.appendChild(rowPlot);
  };

  onMount(() => {
    draw();
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
    scaleType = json.scaleType;
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
  const toggleBackingTrack = (speedFactor = 1) => {
    // if not started, start playing
    if (!player.isPlaying()) {
      firstTimeStamp = performance.now();
      const octave = 4;
      const chords = chordProg.chordNotes;
      const quarter = Utils.bpmToSecondsPerBeat(tempo) / speedFactor;
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

  const killBackingtrack = () => {
    player.stop();
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
        label="max. note distance (beats)"
        bind:value="{maxNoteDistance}"
        callback="{draw}"
        min="{0.05}"
        max="{2}"
        step="{0.05}"
      />
    </div>
    <div class="control">
      <button on:click="{() => toggleBackingTrack()}">
        play/mute backing track
      </button>
      <NumberInput
        title="backing track volume"
        label="volume"
        bind:value="{backingTrackVolume}"
        min="{0.1}"
        max="{3}"
        step="{0.1}"
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
        <ResetNotesButton
          bind:notes
          {saveToStorage}
          callback="{() => {
            openNoteMap = new Map();
            player.stop();
            draw();
          }}"
        />
        <button on:click="{() => loadData(example)}"> example </button>
        <HistoryButton appId="{appInfo.id}" {loadData} />
        <MidiReplayButton
          bind:notes
          callback="{draw}"
          bind:speed="{midiReplaySpeed}"
          onStart="{() => toggleBackingTrack(midiReplaySpeed)}"
          onStop="{killBackingtrack}"
        />
        <ImportExportButton {loadData} {getExportData} appId="{appInfo.id}" />
      </div>
      <ExerciseDrawer>
        <p>
          1) Improvise using only the {root} pentatonic scale.
        </p>
        <p>
          2) Improvise using only the {root} major scale.
        </p>
        <p>
          3) Improvise using only the notes of the current chord similar to an
          arpeggio.
        </p>
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
    user-select: none;
  }
</style>
