<script>
  import { onDestroy, onMount } from 'svelte';
  import * as d3 from 'd3';
  import * as Plot from '@observablehq/plot';
  import { Scale, Chord } from '@tonaljs/tonal';
  import { clamp } from '../lib/lib';
  import { Midi } from 'musicvis-lib';
  import NoteCountInput from '../common/input-elements/note-count-input.svelte';
  import MidiInput from '../common/input-handlers/midi-input.svelte';
  import ImportExportButton from '../common/input-elements/import-export-share-button.svelte';
  import { localStorageAddRecording } from '../lib/localstorage';
  import HistoryButton from '../common/input-elements/history-button.svelte';
  import ResetNotesButton from '../common/input-elements/reset-notes-button.svelte';
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

  /**
   * contains the app meta information defined in App.js
   */
  export let appInfo;

  let height = 250;
  let container;
  // const noteNames = Midi.NOTE_NAMES_FLAT;
  const noteNames = Midi.NOTE_NAMES;
  const rootColor = '#1B5E20';
  const scale1Color = '#D4E157';
  const scale2Color = '#689F38';
  const restColor = 'lightgray';
  // settings
  let root = 'C';
  let scaleType1 = 'major';
  $: scaleType2 = `${scaleType1} pentatonic`;
  let maxNoteDistance = 0.1;
  let barCount = 50;
  let showDuration = false;
  let showLoudness = false;
  // data
  let firstTimeStamp;
  let notes = [];
  let openNoteMap = new Map();
  $: scale1 = new Set(
    Scale.get(`${root} ${scaleType1}`).notes.map(
      (d) => noteNames[NOTE_TO_CHROMA_MAP.get(d)],
    ),
  );
  $: scale2 = new Set(
    Scale.get(`${root} ${scaleType2}`).notes.map(
      (d) => noteNames[NOTE_TO_CHROMA_MAP.get(d)],
    ),
  );

  const noteOn = (e) => {
    if (notes.length === 0) {
      firstTimeStamp = e.timestamp;
    }
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

  const controlChange = (e) => {
    const clamped = clamp(e.rawValue * 2, 20, 250);
    barCount = clamped;
    draw();
  };

  const draw = () => {
    const width = window.innerWidth < 1200 ? 900 : window.innerWidth - 200;
    const colorMap = noteNames.map((note) => {
      if (note === root) {
        return rootColor;
      } else if (scale2.has(note)) {
        return scale2Color;
      } else if (scale1.has(note)) {
        return scale1Color;
      } else {
        return restColor;
      }
    });
    const limited = notes.slice(-barCount);
    const durationLimit = 1;
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
        axis: showDuration,
        domain: [0, durationLimit],
        label: 'duration in seconds',
        labelAnchor: 'center',
      },
      color: {
        domain: d3.range(12),
        range: colorMap,
        // legend: true,
        // tickFormat: (d) => Midi.NOTE_NAMES[d],
        // marginLeft: 190,
      },
      opacity: {
        domain: [0, 127],
        range: [0.3, 1],
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
            if (showDuration) {
              return d.duration > 0 ? d.duration : durationLimit;
            }
            return durationLimit;
          },
          fill: (d) => d.number % 12,
          stroke: (d) => d.number % 12,
          opacity: showLoudness ? (d) => d.velocity : 1,
          fillOpacity: (d) =>
            // if bar height is duration, show currently held notes without fill, only stroke
            showDuration && d.duration === 0 ? 0 : 1,
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
      ],
    });
    container.textContent = '';
    container.appendChild(plot);

    // chords

    const chords = detectChords(notes, maxNoteDistance)
      .slice(-barCount)
      // sort notes in chord by pitch
      .map((c) => c.sort((a, b) => a.number - b.number));
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
        domain: d3.range(12),
        range: colorMap,
      },
      marks: [
        Plot.ruleY([0], {
          stroke: '#ddd',
        }),
        Plot.rectY(chordNotes, {
          // y: 'noteIndex',
          // sort: { color: null, y: 'noteIndex' },
          y1: (d) => d.noteIndex,
          y2: (d) => d.noteIndex + 1,
          x: 'chordIndex',
          fill: (d) => d.number % 12,
          stroke: (d) => d.number % 12,
          offset: 'normalize',
          rx: 4,
          inset: 1.5,
          // fillOpacity: (d) => (d.duration === 0 ? 0 : 1),
        }),
        // chord note text labels
        Plot.text(chordNotes, {
          x: 'chordIndex',
          y: 'noteIndex',
          text: (d) => d.name.split('').join('\n'),
          fontSize: 10,
          fill: 'black',
          stroke: '#eee',
          strokeWidth: 2,
          dy: -12,
        }),
        // chord names, if detected
        Plot.text(chordNames, {
          x: (d, i) => i,
          y: 0,
          text: (d) => d.join('   '),
          fontSize: 10,
          dy: 8,
          rotate: 45,
          textAnchor: 'start',
        }),
      ],
    });
    container.appendChild(chordPlot);
  };

  onMount(draw);

  /**
   * Used for exporting and for automatics saving
   */
  const getExportData = () => {
    return {
      root,
      scaleType1,
      scaleType2,
      pastNoteCount: barCount,
      showDuration,
      showLoudness,
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
    scaleType1 = json.scaleType1;
    scaleType2 = json.scaleType2;
    barCount = json.pastNoteCount;
    showDuration = json.showDuration;
    showLoudness = json.showLoudness;
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

  onDestroy(saveToStorage);
</script>

<FileDropTarget {loadData}>
  <main class="app">
    <h2>{appInfo.title}</h2>
    <p class="explanation">
      This app helps practicing improvising in a scale that is a sub-set of
      another scale. Notes that you play are shown as bars. The color shows
      which scale subset a note belongs to. For example, when improvising in C
      major pentatonic, the note C would be the darkest, followed by the notes
      of the pentatonic in a brighter color, the rest of the major scale even
      brighter, and all remaining notes of the chromatic scale in gray. The
      bars' height encodes the notes' durations.
    </p>
    <div class="control">
      <SelectScollable
        label="scale type 1"
        bind:value="{scaleType1}"
        callback="{draw}"
        style="background-color: {scale1Color};"
      >
        {#each ['major', 'minor'] as s}
          <option value="{s}">{s}</option>
        {/each}
      </SelectScollable>
      <SelectScollable
        label="scale type 2"
        bind:value="{scaleType2}"
        callback="{draw}"
        style="background-color: {scale2Color};"
      >
        {#each ['pentatonic', 'blues'].map((d) => `${scaleType1} ${d}`) as s}
          <option value="{s}">{s}</option>
        {/each}
      </SelectScollable>
      <SelectScollable
        label="root note"
        bind:value="{root}"
        callback="{draw}"
        style="background-color: {rootColor};"
      >
        {#each Midi.NOTE_NAMES as n}
          <option value="{n}">{n}</option>
        {/each}
      </SelectScollable>
    </div>
    <div class="control">
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
        bind:checked="{showDuration}"
        label="show duration"
        title="Show duration in the bar's height?"
        callback="{draw}"
      />
      <ToggleButton
        bind:checked="{showLoudness}"
        label="show loudness"
        title="Show loudness in the bar's opacity?"
        callback="{draw}"
      />
    </div>
    <div class="legend">
      <!-- legend -->
      <div style="background: {restColor}; width: 250px">
        <div style="background: {scale1Color};">
          <div style="background: {scale2Color}; color: white">
            <div style="background: {rootColor}; color: white">
              root: {root}
            </div>
            {scaleType2}:<br />
            {[...d3.difference(scale2, [root])].join(', ')}
          </div>
          {scaleType1}:<br />
          {[...d3.difference(scale1, scale2)].join(', ')}
        </div>
        chromatic:<br />
        {[...d3.difference(Midi.NOTE_NAMES, scale1)].join(', ')}
      </div>
    </div>
    <div class="visualization" bind:this="{container}"></div>
    <div class="control">
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
        1) Improvise something in the scale of C major pentatonic. Check if you
        only used this scale's notes using the colors.
      </p>
      <p>
        2) Improvise something in A minor pentatonic. Check if you only used
        this scale's notes using the colors and how often and when you used the
        tonic A.
      </p>
      <p>
        3) Improvise in A minor blues, see how often and when you used the blue
        note (D#).
      </p>
      <p>4) Improvise in a scale you do not know yet.</p>
    </ExerciseDrawer>
    <RatingButton appId="{appInfo.id}" />
    <MidiInput {noteOn} {noteOff} {controlChange} />
  </main>
</FileDropTarget>

<style>
  .legend div {
    margin: 0 auto 5px auto;
    padding: 5px 15px;
    /* width: fit-content; */
    text-align: center;
    border-radius: 20px;
  }
</style>
