<script>
  import { onDestroy, onMount } from 'svelte';
  import * as d3 from 'd3';
  import * as Plot from '@observablehq/plot';
  import ResetNotesButton from '../common/input-elements/reset-notes-button.svelte';
  import MidiInput from '../common/input-handlers/midi-input.svelte';
  import ImportExportButton from '../common/input-elements/import-export-share-button.svelte';
  import { localStorageAddRecording } from '../lib/localstorage';
  import HistoryButton from '../common/input-elements/history-button.svelte';
  import ExerciseDrawer from '../common/exercise-drawer.svelte';
  import RatingButton from '../common/input-elements/rating-button.svelte';
  import example from '../example-recordings/improvisation-intervals.json';
  import ToggleButton from '../common/input-elements/toggle-button.svelte';
  import FileDropTarget from '../common/file-drop-target.svelte';
  import { INTERVALS as intervalNames } from '../lib/music';
  import NumberInput from '../common/input-elements/number-input.svelte';
  import MidiReplayButton from '../common/input-elements/midi-replay-button.svelte';

  /**
   * contains the app meta information defined in App.js
   */
  export let appInfo;

  let width = 900;
  // let height = 650;
  let height = 360;
  let container;
  // settings
  let showUnison = true;
  let intervalLimit = 40;
  // data
  let firstTimeStamp;
  let notes = [];

  const noteOn = (e) => {
    if (notes.length === 0) {
      firstTimeStamp = e.timestamp;
    }
    const noteInSeconds = (e.timestamp - firstTimeStamp) / 1000;
    const note = {
      // ...e.note,
      number: e.note.number,
      velocity: e.rawVelocity,
      time: noteInSeconds,
    };
    notes = [...notes, note];
    draw();
  };

  const draw = () => {
    let intervals = notes.map((d, i) =>
      i === 0 ? 0 : d.number - notes[i - 1].number,
    );
    if (!showUnison) {
      intervals = intervals.filter((d) => d !== 0);
    }
    intervals = intervals.map((d) => {
      if (Math.abs(d) <= 12) {
        return d;
      } else {
        const sub = d > 0 ? 12 : -12;
        while (Math.abs(d) > 12) {
          d -= sub;
        }
        return d;
      }
    });
    const grouped = d3
      .groups(intervals, (d) => d)
      .map(([int, grp]) => {
        return { interval: int, count: grp.length };
      });

    const padding = ' '.repeat(20);

    container.textContent = '';
    const plot = Plot.plot({
      width,
      height,
      marginLeft: 125,
      marginRight: 10,
      marginTop: 0,
      marginBottom: 30,
      // make sure note symbols etc work
      style:
        'font-family: Inter, "Noto Symbols", "Noto Symbols 2", "Noto Music", sans-serif',
      color: {
        // legend: true,
        domain: ['minor', 'major', 'perfect', 'tritone'],
        range: ['#7da2e8', '#ed796a', 'gold', '#ccc'],
        marginLeft: 100,
      },
      y: {
        label: `🡸 going down ${padding}|${padding} going up 🡺     `,
        reverse: true,
        domain: d3.range(-12, 13, 1),
        tickFormat: (d) =>
          d >= 0
            ? `${intervalNames[d].name} (${d})`
            : `${intervalNames[-d].name} (${d})`,
        type: 'band',
      },
      marks: [
        Plot.ruleY([-12, 0, 12], { stroke: '#888', strokeWidth: 1.5 }),
        Plot.waffleX(grouped, {
          x: 'count',
          y: 'interval',
          // fill: '#ddd',
          fill: (d) => intervalNames[Math.abs(d.interval)].type,
          dx: 0.5,
          rx: 4,
        }),
      ],
    });
    container.appendChild(plot);
    const slicedIntervals = intervals.slice(-intervalLimit);
    const plot2 = Plot.plot({
      width,
      height,
      marginLeft: 125,
      marginRight: 10,
      marginTop: 0,
      marginBottom: 10,
      color: {
        legend: true,
        domain: ['minor', 'major', 'perfect', 'tritone'],
        range: ['#7da2e8', '#ed796a', 'gold', '#ccc'],
        marginLeft: 100,
      },
      x: { nice: true, label: 'intervals sorted by time', ticks: [] },
      y: {
        label: `🡸 going down ${padding}|${padding} going up 🡺     `,
        reverse: true,
        domain: d3.range(-12, 13, 1),
        tickFormat: (d) =>
          d >= 0
            ? `${intervalNames[d].name} (${d})`
            : `${intervalNames[-d].name} (${d})`,
        type: 'band',
      },
      marks: [
        Plot.ruleY([-12, 0, 12], {
          stroke: '#888',
          strokeWidth: 1.5,
        }),
        Plot.rectY(slicedIntervals, {
          x: (d, i) => i,
          fill: (d) => intervalNames[Math.abs(d)].type,
          rx: 4,
        }),
        slicedIntervals.length <= 40
          ? Plot.textY(slicedIntervals, {
              x: (d, i) => i,
              y: (d) => (d > 0 ? d + 1 : d - 1),
              text: (d) => intervalNames[Math.abs(d)].short,
              fill: 'black',
              stroke: 'white',
              strokeWidth: 3,
            })
          : null,
      ],
    });
    container.appendChild(plot2);
  };

  onMount(draw);

  /**
   * Used for exporting and for automatics saving
   */
  const getExportData = () => {
    return {
      showUnison,
      // data
      notes,
    };
  };

  /**
   * Import data from file or example
   */
  const loadData = (json) => {
    saveToStorage();
    showUnison = json.showUnison;
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
      This app helps practicing intervals between notes in a melody. You can
      play a note, then another one some interval apart, and so on. The bar
      chart below shows how often you played each interval: when you go up in
      pitch, the bar of the played interval in the top half will increase. If
      you go down, it will show up in the bottom half. Colors denote the type of
      interval, so you can quickly see if you play, for example, more major or
      minor intervals. The intervals are labelled by their name and the number
      of semitones (negative when going from higher to lower notes). The second
      chart on the bottom shows the intervals over time with the same colors.
    </p>
    <div class="control">
      <ToggleButton
        label="unison"
        title="Toggle filtering unison intervals"
        bind:checked="{showUnison}"
        callback="{draw}"
      />
      <NumberInput
        title="The number of most recent notes that are shown as bars."
        label="bars"
        bind:value="{intervalLimit}"
        defaultValue="{40}"
        callback="{draw}"
        step="{10}"
        min="{40}"
      />
    </div>
    <div class="visualization" bind:this="{container}"></div>
    <div class="control">
      <ResetNotesButton bind:notes {saveToStorage} callback="{draw}" />
      <button on:click="{() => loadData(example)}"> example </button>
      <HistoryButton appId="{appInfo.id}" {loadData} />
      <MidiReplayButton bind:notes callback="{draw}" />
      <ImportExportButton {loadData} {getExportData} appId="{appInfo.id}" />
    </div>
    <ExerciseDrawer>
      <p>1) Play different notes and see which intervals are between them.</p>
      <p>
        2) Try to play only perfect 5ths (for example, go through the circle of
        fifths).
      </p>
      <p>3) Try to play only perfect 5ths and major intervals.</p>
      <p>4) Try to play only perfect 5ths and minor intervals.</p>
    </ExerciseDrawer>
    <MidiInput {noteOn} pcKeyAllowed />
    <RatingButton appId="{appInfo.id}" />
  </main>
</FileDropTarget>
