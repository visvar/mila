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
  import exampleDurations from '../example-recordings/improvisation-chord-progression/improvisation-chord-progression.json';
  import exampleSlow from '../example-recordings/improvisation-chord-progression/improvisation-chord-progression-playing-slow.json';
  import exampleFast from '../example-recordings/improvisation-chord-progression/improvisation-chord-progression-playing-fast.json';
  import FileDropTarget from '../common/file-drop-target.svelte';
  import SelectScollable from '../common/input-elements/select-scollable.svelte';
  import MidiReplayButton from '../common/input-elements/midi-replay-button.svelte';
  import { detectChords } from '../lib/chords.js';
  import NumberInput from '../common/input-elements/number-input.svelte';
  import TempoInput from '../common/input-elements/tempo-input.svelte';
  import Player from '../lib/Player';
  import { noteEighth, noteHalf, noteQuarter, upArrowIcon } from '../lib/icons';
  import ToggleButton from '../common/input-elements/toggle-button.svelte';
  import PageResizeHandler from '../common/input-handlers/page-resize-handler.svelte';
  import {
    noteDurationsNormal,
    quantizeNoteDuration,
  } from '../lib/note-durations';
  import { chordProgressions } from '../lib/chord-progressions';
  import InsideTextButton from '../common/input-elements/inside-text-button.svelte';
  import { delay } from '../lib/lib';

  /**
   * contains the app meta information defined in App.js
   */
  export let appInfo;

  let windowWidth = window.innerWidth;
  $: width = windowWidth < 1200 ? 900 : Math.floor(windowWidth - 200);
  let container;
  let midiReplaySpeed;
  const minIOI = 0.001;
  // colors
  const scaleColor = 'orange';
  const chordColor = '#689F38';
  const restColor = 'lightgray';
  const color = {
    domain: ['chord', 'scale', 'rest'],
    range: [chordColor, scaleColor, restColor],
  };
  const noteNames = Midi.NOTE_NAMES;
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
  let backingTrackMode = 'quarters';
  const backingTrackPlayer = new Player();
  $: backingTrackPlayer?.setVolume(backingTrackVolume);
  backingTrackPlayer.preloadInstrument('acoustic_grand_piano');
  // settings
  let root = 'C';
  let scaleType = 'major';
  let tempo = 90;
  let maxNoteDistance = 0.1;
  let minDuration = 0;
  let barCount = 50;
  let showNoteTypePlot = true;
  let showRhythmPlot = true;
  let showChromaPlot = true;
  let showChordPlot = false;
  let showDurationPlot = false;
  let showPianoRoll = false;
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
  // stop backing track when settings change
  $: {
    tempo;
    root;
    chordProg;
    scaleType;
    backingTrackMode;
    stopBackingTrack();
  }
  // app state
  let isPlaying;
  let isDataLoaded = false;

  const noteOn = (e) => {
    const noteInSeconds = (e.timestamp - firstTimeStamp) / 1000;
    // note too close to prior one?
    if (notes.length > 0 && noteInSeconds - notes.at(-1) < minIOI) {
      return;
    }
    const note = {
      name: e.note.name + (e.note.accidental ?? ''),
      number: e.note.number,
      velocity: e.velocity,
      time: noteInSeconds,
      channel: e.message.channel,
      duration: 0,
    };
    // fix old note if its end was missed
    const key = `${e.note.number} ${e.message.channel}`;
    if (openNoteMap.has(key)) {
      const oldNote = openNoteMap.get(key);
      if (oldNote.end === undefined) {
        oldNote.end = noteInSeconds;
      }
    }
    notes = [...notes, note];
    openNoteMap.set(key, note);
    draw();
  };

  const noteOff = (e) => {
    const key = `${e.note.number} ${e.message.channel}`;
    if (openNoteMap.has(key)) {
      const note = openNoteMap.get(key);
      const noteInSeconds = (e.timestamp - firstTimeStamp) / 1000;
      note.end = noteInSeconds;
      note.duration = note.end - note.time;
    }
    draw();
  };

  const draw = () => {
    container.textContent = '';
    if (notes.length === 0) {
      return;
    }
    const quarter = Utils.bpmToSecondsPerBeat(tempo);
    const barsPerRep = chordProg.chords.length;
    const notes2 = notes
      .filter(
        (note) => note.duration === 0 || note.duration / quarter >= minDuration,
      )
      .map((note) => {
        // is this note in bar 1, 2, 3, 4?
        const bar = Math.floor(note.time / barDuration);
        const chordIndex = bar % barsPerRep;
        const currentChordNotes = chordProg.chordNotes[chordIndex];
        // assign color
        let colorType = 'rest';
        if (currentChordNotes.has(note.name)) {
          colorType = 'chord';
        } else if (scaleNotes.has(note.name)) {
          colorType = 'scale';
        }
        return {
          ...note,
          time: note.time / quarter,
          duration: note.duration / quarter,
          colorType,
          bar,
          chordIndex,
          chord: chordProg.chords[chordIndex],
          chordShort: chordProg.chordsShort[chordIndex],
        };
      });

    if (showNoteTypePlot) {
      // plot that counts color types per bar as stacked bars
      const colorCountsPerBar = d3
        .groups(notes2, (d) => d.bar)
        .flatMap(([bar, notes]) =>
          d3
            .groups(notes, (d) => d.colorType)
            .map(([colorType, notes]) => {
              return {
                bar,
                colorType,
                count: notes.length,
                notes: notes
                  .sort((a, b) => (a.number % 12) - (b.number % 12))
                  .map((d) => d.name)
                  .join(' '),
              };
            }),
        );
      const noteTypePlot = Plot.plot({
        subtitle: 'Note Type Counts Per Bar',
        caption: `${upArrowIcon} See how many notes of each type (matching chord, scale, none) you played in each bar`,
        width,
        height: 120,
        marginLeft: 35,
        marginTop: 30,
        marginBottom: 5,
        x: {
          axis: false,
        },
        y: {
          domain: d3.range(barsPerRep),
          tickFormat: (d) => chordProg.chordsShort[d],
          label: 'bar / chord',
        },
        fx: {
          label: 'repetition',
        },
        color: { ...color, legend: true },
        marks: [
          Plot.frame({
            stroke: '#eee',
            strokeWidth: 3,
            rx: 3,
          }),
          Plot.waffleX(colorCountsPerBar, {
            y: (d) => d.bar % barsPerRep,
            x: 'count',
            fx: (d) => Math.floor(d.bar / barsPerRep) + 1,
            fill: 'colorType',
            rx: 3,
            order: ['chord', 'scale', 'rest'],
            tip: true,
            title: (d) => `${d.count} notes fit ${d.colorType}\n${d.notes}`,
          }),
        ],
      });
      container.appendChild(noteTypePlot);

      // const boxPlot = Plot.plot({
      //   width: 500,
      //   x: {
      //     grid: true,
      //     inset: 6,
      //   },
      //   y: {
      //     domain: d3.range(4),
      //     tickFormat: (d) => chordProg.chordsShort[d],
      //   },
      //   color,
      //   marks: [
      //     Plot.boxX(colorCountsPerBar, {
      //       x: 'count',
      //       y: (d) => d.bar % 4,
      //       fx: 'colorType',
      //       fill: 'colorType',
      //     }),
      //   ],
      // });
      // container.appendChild(boxPlot);

      // const histoPlot = Plot.plot({
      //   width: 500,
      //   height: 200,
      //   x: {
      //     grid: true,
      //     inset: 6,
      //   },
      //   y: {},
      //   fy: {
      //     domain: d3.range(4),
      //     tickFormat: (d) => chordProg.chordsShort[d],
      //   },
      //   color,
      //   marks: [
      //     Plot.rectY(
      //       colorCountsPerBar,
      //       Plot.binX(
      //         { y: 'sum' },
      //         {
      //           x: (d) => d.count,
      //           fx: 'colorType',
      //           fy: (d) => d.bar % 4,
      //           fill: 'colorType',
      //         },
      //       ),
      //     ),
      //     Plot.ruleY([0]),
      //   ],
      // });
      // container.appendChild(histoPlot);

      // const barPlot = Plot.plot({
      //   width: 500,
      //   height: 200,
      //   x: {
      //     grid: true,
      //     inset: 6,
      //     label: 'repetition',
      //   },
      //   y: {},
      //   fy: {
      //     domain: d3.range(4),
      //     tickFormat: (d) => chordProg.chordsShort[d],
      //   },
      //   color,
      //   marks: [
      //     Plot.rectY(colorCountsPerBar, {
      //       x: (d) => Math.floor(d.bar / 4),
      //       y: 'count',
      //       // fx: 'colorType',
      //       fy: (d) => d.bar % 4,
      //       fill: 'colorType',
      //       order: color.domain,
      //     }),
      //     Plot.ruleY([0]),
      //   ],
      // });
      // container.appendChild(barPlot);
    }

    if (showRhythmPlot) {
      // plot that counts note durations
      const useDotted = false;
      const useTuplets = false;
      // quantize notes, i.e., round to closest note duration (quarter, eighth, ...)
      const notesQuantized = notes2.map((d) => {
        return {
          ...d,
          duration: quantizeNoteDuration(d.duration, useDotted, useTuplets),
        };
      });
      const durationsPerBar = d3
        .groups(notesQuantized, (d) => d.bar)
        .flatMap(([bar, notes]) =>
          d3
            .groups(notes, (d) => d.duration.name)
            .map(([durationType, notes]) => {
              return {
                bar,
                durationType,
                count: notes.length,
              };
            }),
        );
      const colorDomain = noteDurationsNormal.map((d) => d.name);
      // plot
      const noteDurationPlot = Plot.plot({
        subtitle: 'Note Durations Per Bar',
        caption: `${upArrowIcon} See how many notes of each duration you played in each bar`,
        width,
        height: 120,
        marginLeft: 35,
        marginTop: 30,
        marginBottom: 5,
        x: {
          axis: false,
        },
        y: {
          domain: d3.range(barsPerRep),
          tickFormat: (d) => chordProg.chordsShort[d],
          label: 'bar / chord',
        },
        fx: {
          label: 'repetition',
        },
        color: {
          legend: true,
          domain: colorDomain,
        },
        marks: [
          Plot.frame({
            stroke: '#eee',
            strokeWidth: 3,
            rx: 3,
          }),
          Plot.waffleX(durationsPerBar, {
            y: (d) => d.bar % barsPerRep,
            x: 'count',
            fx: (d) => Math.floor(d.bar / barsPerRep) + 1,
            fill: 'durationType',
            rx: 3,
            order: colorDomain,
            tip: true,
            title: (d) => `${d.durationType}\n${d.count} times`,
          }),
        ],
      });
      container.appendChild(noteDurationPlot);
    }

    if (showChromaPlot) {
      // taken from improvisation-scale-degrees-bar
      const chromaCountPerBar = d3
        .groups(notes2, (d) => d.bar)
        .flatMap(([bar, notes]) =>
          d3
            .groups(notes, (d) => d.number % 12)
            .map(([chroma, notes]) => {
              return {
                bar,
                chroma,
                note: notes[0].name,
                count: notes.length,
                colorType: notes[0].colorType,
              };
            }),
        );
      const chromaOccurencePlot = Plot.plot({
        subtitle: 'Note Chroma Counts Per Bar',
        caption: `${upArrowIcon} See how often you played each note in each bar`,
        width,
        height: 200,
        marginLeft: 50,
        marginRight: 50,
        marginTop: 20,
        // make sure note symbols etc work
        color,
        x: {
          axis: false,
        },
        y: {
          domain: d3.range(0, 12, 1),
          reverse: true,
          // grid: true,
        },
        fx: {
          label: null,
          tickFormat: (d) => chordProg.chordsShort[d % barsPerRep],
        },
        marks: [
          Plot.ruleY(MIDI_SHARPS, {
            stroke: '#eee',
            strokeWidth: 10,
          }),
          Plot.axisY({
            tickFormat: (d) => noteNames[d],
            anchor: 'left',
          }),
          Plot.axisY({
            anchor: 'right',
            tickFormat: (d) => noteNames[d],
          }),
          // bar line
          Plot.ruleX([0], { strokeWidth: 1, stroke: 'darkgray' }),
          Plot.waffleX(chromaCountPerBar, {
            x: 'count',
            y: 'chroma',
            fx: 'bar',
            fill: 'colorType',
            dx: 0.5,
            rx: 3,
            tip: true,
            title: (d) => `${d.note}\nfits ${d.colorType}`,
          }),
        ],
      });
      container.appendChild(chromaOccurencePlot);
    }

    if (showDurationPlot) {
      // plot with notes sorted by time, bar height is note duration
      const limited = notes2.slice(-barCount);
      // duration limit for the duration chart, in beats
      const durationLimit = 2;
      // plot
      const yTicks = [0, 0.5, 1, 2];
      const notePlot = Plot.plot({
        subtitle: 'Note Durations',
        caption: `${upArrowIcon} this chart shows note durations, so you can see whether notes that do not fit chord or scale are shorter, which could mean quickly passing through, e.g., while bending or sliding`,
        width,
        style:
          'font-family: Inter, "Noto Symbols", "Noto Symbols 2", "Noto Music", sans-serif',
        height: 150,
        marginLeft: 50,
        marginBottom: 50,
        padding: 0,
        x: {
          axis: false,
        },
        y: {
          label: 'duration in beats',
          labelAnchor: 'center',
          axis: true,
          domain: [0, durationLimit],
          ticks: yTicks,
          tickFormat: (d) =>
            [0, noteEighth, noteQuarter, noteHalf][yTicks.indexOf(d)],
          grid: true,
        },
        color,
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
            inset: limited.length > width / 10 ? 0 : 1.5,
            rx: 4,
          }),
          Plot.text(limited, {
            x: (d, i) => i,
            y: 0,
            text:
              limited.length > width / 10
                ? null
                : (d) => d.name.split('').join('\n'),
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
    }

    let chords;
    let chordNames;
    let chordNotes;
    if (showChordPlot || showPianoRoll) {
      // chords as arrays of notes
      chords = detectChords(notes2, maxNoteDistance)
        // sort notes in chord by pitch
        .map((notes) => notes.sort((a, b) => a.number - b.number));
      // musical name of each chord (if found)
      chordNames = chords.map((chord) =>
        Chord.detect(chord.map((d) => d.name)),
      );
      chordNotes = chords.flatMap((chord, chordIndex) =>
        chord.map((n, noteIndex) => {
          return { ...n, chordIndex, noteIndex };
        }),
      );
    }

    if (showChordPlot) {
      /**
       * Plot with chords as stacked bars
       */
      const chordPlot = Plot.plot({
        subtitle: 'Chords',
        caption: `${upArrowIcon} This chart shows you the chords you played`,
        width,
        height: 300,
        marginLeft: 30,
        marginRight: 50,
        marginTop: 0,
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
        color,
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
            tip: true,
            title: 'name',
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
            pointerEvents: 'none',
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
    }

    if (showPianoRoll) {
      const minBeat = Math.floor((chordNotes.at(0)?.time ?? 0) / 16) * 16;
      const maxBeat = chordNotes.at(-1)?.time ?? 4;
      const minBar = minBeat / 4;

      // const yDomain = [...scaleNotes]
      //   .map((d) => Midi.NOTE_NAMES.indexOf(d))
      //   .sort();
      // console.log(yDomain);
      const yDomain = d3.range(12);

      // quantized notes
      // TODO: make a quantized function and move it to lib or mvlib
      // const notes3 = notes.map((note) => {
      //   // convert to beats
      //   let time = note.time / quarter;
      //   let duration = note.duration / quarter;
      //   //  quantize
      //   time = Math.round(time * 2) / 2;
      //   duration = Math.floor(duration * 2) / 2 + 0.5;
      //   // is this note in bar 1, 2, 3, 4?
      //   const bar = Math.floor(note.time / barDuration);
      //   const chordIndex = bar % barsPerRep;
      //   const currentChordNotes = chordProg.chordNotes[chordIndex];
      //   // assign color
      //   let colorType = 'rest';
      //   if (currentChordNotes.has(note.name)) {
      //     colorType = 'chord';
      //   } else if (scaleNotes.has(note.name)) {
      //     colorType = 'scale';
      //   }
      //   return {
      //     ...note,
      //     time,
      //     duration,
      //     colorType,
      //     bar: bar - minBar,
      //     chordIndex,
      //     chord: chordProg.chords[chordIndex],
      //     chordShort: chordProg.chordsShort[chordIndex],
      //   };
      // });

      // // chords as arrays of notes
      // const chordsQuantized = detectChords(notes3, maxNoteDistance)
      //   // sort notes in chord by pitch
      //   .map((notes) => notes.sort((a, b) => a.number - b.number));
      // // musical name of each chord (if found)
      // const chordNotesQuantized = chordsQuantized.flatMap((chord, chordIndex) =>
      //   chord.map((n, noteIndex) => {
      //     return { ...n, chordIndex, noteIndex };
      //   }),
      // );
      const chordNotesQuantized = chordNotes;
      const pianoRoll = Plot.plot({
        subtitle: 'Piano Roll',
        caption: `${upArrowIcon} See your playing in more detail with quantized notes`,
        width,
        height: 280,
        marginLeft: 50,
        marginRight: 50,
        marginTop: 20,
        marginBottom: 100,
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
          label: 'chroma',
          labelAnchor: 'center',
          reverse: true,
        },
        color,
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
          Plot.ruleX(d3.range(minBeat, maxBeat + 5, barsPerRep), {
            stroke: '#ccc',
            strokeWidth: 2,
          }),
          // chord repetitions
          Plot.ruleX(d3.range(minBeat, maxBeat + 5, 16), {
            stroke: '#666',
            strokeWidth: 2,
          }),
          // chord progression chord
          Plot.text(d3.range(minBeat, maxBeat, barsPerRep), {
            x: (d) => d + 2,
            y: 11,
            text: (d) =>
              chordProg.chordsShort[(d / barsPerRep) % chordProg.chords.length],
            fontSize: 12,
            dy: -20,
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
          Plot.rectX(chordNotesQuantized, {
            // fy: (d) => Math.floor(d.time / 16),
            // x1: (d) => d.time % 16,
            // x2: (d) => (d.time + d.duration) % 16,
            x1: 'time',
            x2: (d) => d.time + d.duration,
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
            dy: 30,
            rotate: 90,
            textAnchor: 'start',
          }),
        ],
      });
      container.appendChild(pianoRoll);
    }
  };

  onMount(draw);

  /**
   * Used for exporting and for automatics saving
   */
  const getExportData = () => {
    return {
      root,
      scaleType,
      chordProgLabel,
      barCount,
      maxNoteDistance,
      minDuration,
      showNoteTypePlot,
      showRhythmPlot,
      showChromaPlot,
      showChordPlot,
      showDurationPlot,
      showPianoRoll,
      // data
      notes,
    };
  };

  /**
   * Import data from file or example
   */
  const loadData = (json) => {
    saveToStorage();
    root = json.root ?? 'C';
    scaleType = json.scaleType ?? 'major';
    chordProgLabel = json.chordProgLabel;
    barCount = json.barCount ?? 50;
    maxNoteDistance = json.maxNoteDistance ?? 0.1;
    minDuration = json.minDuration ?? 0;
    showNoteTypePlot = json.showNoteTypePlot ?? true;
    showRhythmPlot = json.showRhythmPlot ?? true;
    showChromaPlot = json.showChromaPlot ?? true;
    showChordPlot = json.showChordPlot ?? true;
    showDurationPlot = json.showDurationPlot ?? true;
    showPianoRoll = json.showPianoRoll ?? true;
    // data
    notes = json.notes;
    // app state
    isDataLoaded = true;
    draw();
  };

  const saveToStorage = () => {
    if (!isDataLoaded && !isPlaying && notes.length > 0) {
      localStorageAddRecording(appInfo.id, getExportData());
    }
  };

  /***
   * plays a synthesized backing track based on the chord progression and tempo settings
   *
   * @param {number} speedFactor modifies speed, needed for playback
   * @param {'quarters'|'whole'} [mode='quarter'] quarter: 4 quarter note chords, whole: one whole note chord
   */
  const toggleBackingTrack = (speedFactor = 1, mode = 'quarters') => {
    // if not started, start playing
    if (!backingTrackPlayer.isPlaying()) {
      // on first start, reset notes
      // notes = [];
      draw();
      firstTimeStamp = performance.now();
      const octave = 4;
      const chords = chordProg.chordNotes;
      const quarter = Utils.bpmToSecondsPerBeat(tempo) / speedFactor;
      // each chord is played for one one bar, with 1 whole or 4 quarters
      const beats = mode === 'quarters' ? 4 : 1;
      const duration = mode === 'quarters' ? quarter : quarter * 4;
      const backingNotes = chords.flatMap((cNotes, bar) => {
        return d3.range(beats).flatMap((beat) => {
          const time = quarter * (beat + 4 * bar);
          return [...cNotes].map((note) => {
            // ... and each beat has the notes of the current chord
            const number = NOTE_TO_CHROMA_MAP.get(note) + octave * 12;
            return Note2.from({
              pitch: number,
              start: time,
              end: time + duration,
              duration,
              velocity: beat === 0 ? 0.7 : 0.5,
              channel: 0,
            });
          });
        });
      });
      backingTrackPlayer.playNotes(
        backingNotes,
        'acoustic_grand_piano',
        0,
        undefined,
        1,
        true,
      );
      backingTrackPlayer.onTimeChange(() => {
        const currentSecond = (performance.now() - firstTimeStamp) / 1000;
        currentChordIndex =
          Math.floor(currentSecond / barDuration) % chordProg.chords.length;
      });
    } else {
      // otherwise just toggle mute
      // player.isMuted() ? player.unMute() : player.mute();
      stopBackingTrack();
    }
  };

  const stopBackingTrack = () => {
    backingTrackPlayer.stop();
    currentChordIndex = 0;
  };

  onDestroy(() => {
    saveToStorage();
    backingTrackPlayer.stop();
  });
</script>

<FileDropTarget {loadData} disabled="{isPlaying}">
  <main class="app">
    <h2>{appInfo.title}</h2>
    <p class="explanation">
      This app helps practicing improvising in a scale over a chord progression.
      Notes that you play are colored to show whether a note belongs to the
      current chord, the scale, or neither. For example, when improvising in C
      Major over ii-V-I, the notes that fit the currently active chord will be
      dark green, notes that fit C Major will be light green, and all others
      will be gray. The bars' height encodes the notes' durations.
    </p>
    <p class="explanation">Start the backing track before you play!</p>
    <p class="explanation">
      <b>Note type summary:</b> This visualization shows how many notes of each
      type (chord, scale, rest) you played in each bar.
      <b>Note chroma summary:</b> In the second visualization, you can see how
      often you played each note.
      <b>Note durations:</b> This bar chart displays notes sorted by time
      (ignoring chords) and encodes the duration in the bar's height.
      <b>Chords:</b> To see where you played chords, you can look at the chord
      visualization that stacks the notes of each chord on top of each other.
      <b>Piano roll:</b> This visualization shows time on the X axis and chroma (pitch
      without octave) on the Y axis for full detail.
    </p>
    <div class="control">
      <NoteCountInput bind:value="{barCount}" callback="{draw}" />
      <NumberInput
        title="Maximum time distance in beats between notes such that they still count as beloning to the same chord/arpeggio"
        label="max. distance"
        bind:value="{maxNoteDistance}"
        callback="{draw}"
        min="{0.05}"
        max="{2}"
        step="{0.05}"
        defaultValue="{0.1}"
      />
      <NumberInput
        title="Minimum note duration in beats. Shorter notes will be filtered out to reduce noise"
        label="min. duration"
        bind:value="{minDuration}"
        callback="{draw}"
        min="{0}"
        max="{0.5}"
        step="{0.01}"
        defaultValue="{0}"
      />
    </div>
    <div class="control">
      <ToggleButton
        label="note type chart"
        bind:checked="{showNoteTypePlot}"
        callback="{draw}"
      />
      <ToggleButton
        label="rhythm chart"
        bind:checked="{showRhythmPlot}"
        callback="{draw}"
      />
      <ToggleButton
        label="note chroma chart"
        bind:checked="{showChromaPlot}"
        callback="{draw}"
      />
      <ToggleButton
        label="duration chart"
        bind:checked="{showDurationPlot}"
        callback="{draw}"
      />
      <ToggleButton
        label="chord chart"
        bind:checked="{showChordPlot}"
        callback="{draw}"
      />
      <ToggleButton
        label="piano roll"
        bind:checked="{showPianoRoll}"
        callback="{draw}"
      />
    </div>
    <div class="control">
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
      <SelectScollable label="root note" bind:value="{root}" callback="{draw}">
        {#each Midi.NOTE_NAMES as n}
          <option value="{n}">{n}</option>
        {/each}
      </SelectScollable>
      <!-- TODO: enable once chords can be converted to minor -->
      <SelectScollable
        label="scale type"
        bind:value="{scaleType}"
        callback="{draw}"
        style="background-color: {scaleColor};"
        disabled
      >
        {#each ['major', 'minor'] as s}
          <option value="{s}">{s}</option>
        {/each}
      </SelectScollable>
    </div>
    <div class="control">
      <button
        on:click="{async () => {
          toggleBackingTrack(1, backingTrackMode);
        }}"
        class="primary"
      >
        play/stop backing track
      </button>

      <TempoInput bind:value="{tempo}" callback="{draw}" />
      <NumberInput
        title="backing track volume"
        label="volume"
        bind:value="{backingTrackVolume}"
        min="{0.1}"
        max="{3}"
        step="{0.1}"
      />
      <button
        title="Toggle whole notes and quarters for the backing track"
        style="width: 100px"
        on:click="{() => {
          backingTrackMode =
            backingTrackMode === 'quarters' ? 'whole' : 'quarters';
        }}"
      >
        {backingTrackMode}
      </button>
    </div>
    <div>
      <!-- legend -->
      <div class="legend">
        {#each chordProg.chordsShort as chord, index}
          <div
            style="background: {chordColor}; border-color: {index ===
            currentChordIndex
              ? '#555'
              : 'transparent'}"
          >
            {chord}<br />
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
          bind:isDataLoaded
          disabled="{isPlaying}"
          {saveToStorage}
          callback="{() => {
            openNoteMap = new Map();
            stopBackingTrack();
            draw();
          }}"
        />
        <HistoryButton appId="{appInfo.id}" {loadData} disabled="{isPlaying}" />
        <MidiReplayButton
          bind:notes
          bind:isPlaying
          callback="{draw}"
          bind:speed="{midiReplaySpeed}"
          onStart="{() => {
            stopBackingTrack();
            // await delay(0.1);
            toggleBackingTrack(midiReplaySpeed, backingTrackMode);
          }}"
          onStop="{stopBackingTrack}"
          startAtFirstNote="{false}"
          sound="acoustic_grand_piano"
        />
        <ImportExportButton
          {loadData}
          {getExportData}
          appId="{appInfo.id}"
          disabled="{isPlaying}"
        />
      </div>
      <ExerciseDrawer>
        <InsideTextButton
          onclick="{() => loadData(exampleSlow)}"
          disabled="{isPlaying}"
        >
          example slow
        </InsideTextButton>
        <InsideTextButton
          onclick="{() => loadData(exampleFast)}"
          disabled="{isPlaying}"
        >
          example fast
        </InsideTextButton>
        <InsideTextButton
          onclick="{() => loadData(exampleDurations)}"
          disabled="{isPlaying}"
        >
          example varying durations
        </InsideTextButton>
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
      <MidiInput
        {noteOn}
        {noteOff}
        pcKeyAllowed
        disabled="{isDataLoaded || isPlaying}"
      />
      <RatingButton appId="{appInfo.id}" />
    </div>
  </main>
</FileDropTarget>

<PageResizeHandler callback="{draw}" />
<svelte:window bind:innerWidth="{windowWidth}" />

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
