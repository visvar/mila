<script>
  import { afterUpdate, onDestroy, onMount } from 'svelte';
  import * as d3 from 'd3';
  import * as Plot from '@observablehq/plot';
  import { Scale } from 'tonal';
  import { Midi, Utils } from 'musicvis-lib';
  import MetronomeButton from '../common/input-elements/metronome-button.svelte';
  import TempoInput from '../common/input-elements/tempo-input.svelte';
  import ResetNotesButton from '../common/input-elements/reset-notes-button.svelte';
  import MidiInput from '../common/input-handlers/midi-input.svelte';
  import ImportExportButton from '../common/input-elements/import-export-share-button.svelte';
  import { localStorageAddRecording } from '../lib/localstorage';
  import HistoryButton from '../common/input-elements/history-button.svelte';
  import ExerciseDrawer from '../common/exercise-drawer.svelte';
  import RatingButton from '../common/input-elements/rating-button.svelte';
  import ScaleSelect from '../common/input-elements/scale-select.svelte';
  import { MIDI_SHARPS, NOTE_TO_CHROMA_MAP } from '../lib/music';
  import example from '../example-recordings/improvisation-scale-degrees-bar.json';
  import ToggleButton from '../common/input-elements/toggle-button.svelte';
  import FileDropTarget from '../common/file-drop-target.svelte';

  /**
   * contains the app meta information defined in App.js
   */
  export let appInfo;

  $: width =
    window.innerWidth < 1200 ? 900 : Math.floor(window.innerWidth - 200);
  let height = 350;
  let container;
  const rootColor = '#1B5E20';
  const scaleColor = '#689F38';
  const restColor = 'lightgray';
  // settings
  let root = 'C';
  let scale = 'major pentatonic';
  let useColors = true;
  let showOutsideScale = true;
  let tempo = 120;
  // data
  let firstTimeStamp;
  let notes = [];
  // domain knowledge
  // const noteNames = Midi.NOTE_NAMES_FLAT;
  const noteNames = Midi.NOTE_NAMES;

  const noteOn = (e) => {
    if (notes.length === 0) {
      firstTimeStamp = e.timestamp;
    }
    const noteInSeconds = (e.timestamp - firstTimeStamp) / 1000;
    const note = {
      name: e.note.name + (e.note.accidental ?? ''),
      number: e.note.number,
      velocity: e.rawVelocity,
      time: noteInSeconds,
    };
    notes = [...notes, note];
  };

  const draw = () => {
    if (notes.length === 0) {
      return;
    }
    // MIDI nr (0 to 11) of the scale root
    const rootNr = noteNames.indexOf(root);
    const scaleInfo = Scale.get(`${root} ${scale}`);
    const scaleNotes = scaleInfo.notes.map((note, i) => {
      // note chroma from 0 to 11 (C to B)
      const chroma = NOTE_TO_CHROMA_MAP.get(note);
      let offset = chroma - rootNr;
      offset = offset >= 0 ? offset : offset + 12;
      return {
        name: note,
        chroma,
        interval: scaleInfo.intervals[i],
        degree: i,
        offset,
      };
    });
    const scaleOffsets = new Set(scaleNotes.map((d) => d.offset));

    // group by bar
    const barDuration = Utils.bpmToSecondsPerBeat(tempo) * 4;
    const byBar = d3.groups(notes, (d) => Math.floor(d.time / barDuration));

    let data = [];
    // create one histogram per bar
    for (const [barId, notes] of byBar) {
      // note chroma from 0 to 11 (C to B)
      const rootOffsets = notes.map((d) => {
        const chroma = d.number % 12;
        const offset = chroma - rootNr;
        return offset >= 0 ? offset : offset + 12;
      });
      const counted = d3
        .groups(rootOffsets, (d) => d)
        .map(([key, grp]) => {
          return {
            value: key,
            count: grp.length,
            barId,
          };
        });
      data = data.concat(counted);
    }

    // TODO: allow setting
    const maxBar = Math.floor(notes.at(-1).time / barDuration);
    const minBar = maxBar - 7;
    data = data.filter((d) => d.barId >= minBar);

    const plot = Plot.plot({
      width,
      height,
      marginLeft: 50,
      marginRight: 50,
      // make sure note symbols etc work
      style:
        'font-family: Inter, "Noto Symbols", "Noto Symbols 2", "Noto Music", sans-serif',
      color: {
        legend: useColors,
        domain: ['root', 'scale', 'outside scale'],
        range: [rootColor, scaleColor, restColor],
        marginLeft: 100,
      },
      y: {
        domain: showOutsideScale ? d3.range(0, 12, 1) : [...scaleOffsets],
        reverse: true,
        label: 'notes, increasing from tonic 🡺',
        // grid: true,
      },
      fx: {
        label: null,
        axis: false,
      },
      marks: [
        Plot.axisY({
          tickFormat: (d) => noteNames[(d + rootNr) % 12],
          anchor: 'left',
        }),
        Plot.axisY({
          anchor: 'right',
          tickFormat: (d) => noteNames[(d + rootNr) % 12],
        }),
        Plot.ruleY(
          MIDI_SHARPS.map((d) => (d - rootNr + 12) % 12),
          {
            stroke: '#eee',
            strokeWidth: 20,
          },
        ),
        // bar line
        Plot.ruleX([0], { strokeWidth: 2, stroke: 'darkgray' }),
        Plot.waffleX(data, {
          x: 'count',
          y: 'value',
          fx: 'barId',
          fill: (d) => {
            // colors off?
            if (!useColors) {
              return '#ddd';
            }
            // root?
            if (d.value === 0) {
              return 'root';
            }
            //  in scale?
            if (scaleOffsets.has(d.value)) {
              return 'scale';
            }
            // out of scale
            return 'outside scale';
          },
          dx: 0.5,
          rx: 4,
        }),
      ],
    });
    container.textContent = '';
    container.appendChild(plot);
  };

  afterUpdate(draw);

  /**
   * Used for exporting and for automatics saving
   */
  const getExportData = () => {
    return {
      root,
      scale,
      useColors,
      showOutsideScale,
      tempo,
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
    scale = json.scale;
    useColors = json.useColors ?? true;
    showOutsideScale = json.showOutsideScale ?? true;
    tempo = json.tempo ?? 120;
    // data
    notes = json.notes;
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
      This app helps practicing how to use the different degrees of a scale. The
      bar chart below shows how often you played each scale degree.
    </p>
    <div class="control">
      <ScaleSelect bind:scaleRoot="{root}" bind:scaleType="{scale}" />
    </div>
    <div class="control">
      <TempoInput bind:value="{tempo}" />
      <ToggleButton
        label="colors"
        title="Use colors for root, in-scale, outside-scale"
        bind:checked="{useColors}"
      />
      <ToggleButton
        label="non-scale notes"
        title="Show notes outside the scale"
        bind:checked="{showOutsideScale}"
      />
    </div>
    <div class="visualization" bind:this="{container}"></div>
    <div class="control">
      <MetronomeButton {tempo} accent="{4}" />
      <ResetNotesButton bind:notes {saveToStorage} />
      <button on:click="{() => loadData(example)}"> example </button>
      <HistoryButton appId="{appInfo.id}" {loadData} />
      <ImportExportButton {loadData} {getExportData} appId="{appInfo.id}" />
    </div>
    <ExerciseDrawer>
      <p>1) Improvise in A minor pentatonic.</p>
      <p>2) Improvise in a scale you did not know before.</p>
      <p>3) Try to change the key, for example in every fourth bar.</p>
    </ExerciseDrawer>
    <MidiInput {noteOn} pcKeyAllowed />
    <RatingButton appId="{appInfo.id}" />
  </main>
</FileDropTarget>
