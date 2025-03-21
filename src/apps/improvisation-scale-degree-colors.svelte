<script>
  import { afterUpdate, onDestroy } from 'svelte';
  import * as d3 from 'd3';
  import * as Plot from '@observablehq/plot';
  import { Chord, Scale } from 'tonal';
  import { Midi } from 'musicvis-lib';
  import MidiInput from '../common/input-handlers/midi-input.svelte';
  import ImportExportButton from '../common/input-elements/import-export-share-button.svelte';
  import { localStorageAddRecording } from '../lib/localstorage';
  import HistoryButton from '../common/input-elements/history-button.svelte';
  import ResetNotesButton from '../common/input-elements/reset-notes-button.svelte';
  import ExerciseDrawer from '../common/exercise-drawer.svelte';
  import RatingButton from '../common/input-elements/rating-button.svelte';
  import ToggleButton from '../common/input-elements/toggle-button.svelte';
  import {
    NOTE_TO_CHROMA_MAP,
    SCALE_DEGREES_MAJOR,
    SCALE_DEGREES_MINOR,
  } from '../lib/music';
  import example from '../example-recordings/improvisation-note-colors2.json';
  import FileDropTarget from '../common/file-drop-target.svelte';
  import MidiReplayButton from '../common/input-elements/midi-replay-button.svelte';
  import ScaleSelect from '../common/input-elements/scale-select.svelte';
  import { detectChords } from '../lib/chords';
  import NumberInput from '../common/input-elements/number-input.svelte';
  import SelectScollable from '../common/input-elements/select-scollable.svelte';

  /**
   * contains the app meta information defined in App.js
   */
  export let appInfo;

  $: width =
    window.innerWidth < 1200 ? 900 : Math.floor(window.innerWidth - 200);
  let container;
  const noteNames = Midi.NOTE_NAMES;
  // settings
  let root = 'C';
  let scaleType = 'major';
  let barCount = 50;
  let maxNoteDistance = 0.1;
  let showDuration = true;
  // data
  let firstTimeStamp;
  let notes = [];
  let openNoteMap = new Map();
  $: scaleNotes = Scale.get(`${root} ${scaleType}`).notes.map(
    (d) => noteNames[NOTE_TO_CHROMA_MAP.get(d)],
  );
  $: scaleDegrees = [
    ...(scaleType === 'major'
      ? SCALE_DEGREES_MAJOR
      : SCALE_DEGREES_MINOR
    ).values(),
  ];
  let colorMapName = 'all';
  const colorMaps = [
    {
      label: 'all',
      colors: ['#eeeeee', ...d3.schemeTableau10],
    },
    {
      label: '1 3 7',
      colors: [
        '#eeeeee',
        d3.schemeTableau10[0],
        '#dddddd',
        d3.schemeTableau10[1],
        '#dddddd',
        '#dddddd',
        '#dddddd',
        d3.schemeTableau10[2],
      ],
    },
    {
      label: '1 4 5',
      colors: [
        '#eeeeee',
        d3.schemeTableau10[0],
        '#dddddd',
        '#dddddd',
        d3.schemeTableau10[1],
        d3.schemeTableau10[2],
        '#dddddd',
        '#dddddd',
      ],
    },
    {
      label: '1 4 7',
      colors: [
        '#eeeeee',
        d3.schemeTableau10[0],
        '#dddddd',
        '#dddddd',
        d3.schemeTableau10[1],
        '#dddddd',
        '#dddddd',
        d3.schemeTableau10[2],
      ],
    },
    {
      label: '1 4 5 7',
      colors: [
        '#eeeeee',
        d3.schemeTableau10[0],
        '#dddddd',
        '#dddddd',
        d3.schemeTableau10[1],
        d3.schemeTableau10[2],
        '#dddddd',
        d3.schemeTableau10[3],
      ],
    },
  ];
  $: colorMap = colorMaps.filter((d) => d.label === colorMapName)[0];
  // app state
  let isPlaying;
  let isDataLoaded = false;

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
  };

  const noteOff = (e) => {
    if (openNoteMap.has(e.note.number)) {
      const note = openNoteMap.get(e.note.number);
      const noteInSeconds = (e.timestamp - firstTimeStamp) / 1000;
      note.end = noteInSeconds;
      note.duration = note.end - note.time;
      notes = [...notes];
    }
  };

  const draw = () => {
    const limited = notes.slice(-barCount);
    const durationLimit = 1;
    container.textContent = '';
    const plot = Plot.plot({
      width,
      height: 250,
      marginLeft: 45,
      marginRight: 10,
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
        domain: d3.range(-1, 7),
        range: colorMap.colors,
        legend: true,
        tickFormat: (d) => (d === -1 ? 'non-scale' : scaleNotes[d]),
        marginLeft: width / 2 - 150,
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
          fill: (d) => scaleNotes.indexOf(d.name),
          stroke: (d) => scaleNotes.indexOf(d.name),
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
        domain: d3.range(-1, 7),
        range: colorMap.colors,
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
          fill: (d) => scaleNotes.indexOf(d.name),
          stroke: (d) => scaleNotes.indexOf(d.name),
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

  afterUpdate(draw);

  /**
   * Used for exporting and for automatics saving
   */
  const getExportData = () => {
    return {
      root,
      scaleType,
      barCount,
      showDuration,
      colorMapName,
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
    barCount = json.barCount ?? 50;
    showDuration = json.showDuration ?? false;
    colorMapName = json.colorMapName ?? 'all';
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
      This app helps practicing improvising in a scale by coloring the different
      scale degrees to show you which you play when. Notes that you play are
      shown as bars. Optionally, the bars' height encodes the notes' durations.
      You can change the colors if you like.
    </p>
    <div class="control">
      <ScaleSelect
        bind:scaleRoot="{root}"
        bind:scaleType
        allowedScales="{['major', 'minor']}"
      />
      <NumberInput
        title="maximum distance between notes such that they still count as beloning to the same chord/arpeggio"
        label="max. note distance"
        bind:value="{maxNoteDistance}"
        min="{0.05}"
        max="{2}"
        step="{0.05}"
      />
      <NumberInput
        title="The number of played chords that is displayed"
        label="chord count"
        bind:value="{barCount}"
        min="{10}"
        max="{100}"
        step="{10}"
      />
      <ToggleButton
        bind:checked="{showDuration}"
        label="show duration"
        title="Show duration in the bar's height?"
      />
      <SelectScollable
        label="colors"
        title="Choose a color map"
        bind:value="{colorMapName}"
      >
        {#each colorMaps as cm}
          <option value="{cm.label}">{cm.label}</option>
        {/each}
      </SelectScollable>
    </div>
    <div class="legend">
      {#each scaleDegrees as degree, index}
        <label title="change color">
          <input
            on:change="{(evt) => {
              colorMap.colors[index + 1] = evt.target.value;
              colorMap = {
                ...colorMap,
                colors: [...colorMap.colors],
              };
            }}"
            type="color"
            value="{colorMap.colors?.[index + 1]}"
          />
          {degree.name}
        </label>
      {/each}
    </div>
    <div class="visualization" bind:this="{container}"></div>
    <div class="control">
      <ResetNotesButton
        bind:notes
        bind:isDataLoaded
        disabled="{isPlaying}"
        {saveToStorage}
        callback="{() => {
          openNoteMap = new Map();
        }}"
      />
      <button on:click="{() => loadData(example)}" disabled="{isPlaying}">
        example
      </button>
      <HistoryButton appId="{appInfo.id}" {loadData} disabled="{isPlaying}" />
      <MidiReplayButton bind:notes bind:isPlaying callback="{draw}" />
      <ImportExportButton
        {loadData}
        {getExportData}
        appId="{appInfo.id}"
        disabled="{isPlaying}"
      />
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
    <MidiInput
      {noteOn}
      {noteOff}
      pcKeyAllowed
      disabled="{isDataLoaded || isPlaying}"
    />
    <RatingButton appId="{appInfo.id}" />
  </main>
</FileDropTarget>

<style>
  .legend label {
    display: inline-flex;
    align-items: center;
    font-size: 11px;
    margin: 0 5px;
    padding: 0 5px;
    text-align: center;
    cursor: pointer;
  }

  .legend input[type='color'] {
    padding: 0;
    width: 20px;
    height: 22px;
    border: none;
    outline: none;
  }
</style>
