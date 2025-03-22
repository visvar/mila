<script>
  import { afterUpdate, onDestroy } from 'svelte';
  import * as d3 from 'd3';
  import { Canvas, Utils } from 'musicvis-lib';
  import NoteCountInput from '../common/input-elements/note-count-input.svelte';
  import MidiInput from '../common/input-handlers/midi-input.svelte';
  import ImportExportButton from '../common/input-elements/import-export-share-button.svelte';
  import { localStorageAddRecording } from '../lib/localstorage';
  import HistoryButton from '../common/input-elements/history-button.svelte';
  import MetronomeButton from '../common/input-elements/metronome-button.svelte';
  import TempoInput from '../common/input-elements/tempo-input.svelte';
  import {
    noteDurationsDotted,
    noteDurationsNormal,
  } from '../lib/note-durations';
  import example from '../example-recordings/duration-pies/duration-pies.json';
  import examplePerfect from '../example-recordings/duration-pies/duration-pies-perfect.json';
  import examplePerfect2 from '../example-recordings/duration-pies/duration-pies-perfect2.json';
  import PcKeyboardInput from '../common/input-handlers/pc-keyboard-input.svelte';
  import TouchInput from '../common/input-handlers/touch-input.svelte';
  import { noteHalf, noteQuarter, noteEighth, noteWhole } from '../lib/icons';
  import ResetNotesButton from '../common/input-elements/reset-notes-button.svelte';
  import ExerciseDrawer from '../common/exercise-drawer.svelte';
  import ToggleButton from '../common/input-elements/toggle-button.svelte';
  import { COLORS } from '../lib/colors';
  import RatingButton from '../common/input-elements/rating-button.svelte';
  import UndoRedoButton from '../common/input-elements/undo-redo-button.svelte';
  import PageResizeHandler from '../common/input-handlers/page-resize-handler.svelte';
  import FileDropTarget from '../common/file-drop-target.svelte';
  import InsideTextButton from '../common/input-elements/inside-text-button.svelte';

  /**
   * contains the app meta information defined in App.js
   */
  export let appInfo;

  let width = 900;
  let height = 400;
  let canvas;
  const TWO_PI = 2 * Math.PI;
  // settings
  let tempo = 60;
  let pastNoteCount = 4;
  let usePies = true;
  let showClosestDuration = false;
  // data
  let isKeyDown = false;
  $: wholeDuration = Utils.bpmToSecondsPerBeat(tempo) * 4;
  $: durations = [...noteDurationsNormal, ...noteDurationsDotted].map((d) => {
    return { ...d, seconds: d.beats * (wholeDuration / 4) };
  });
  let firstTimeStamp;
  let notes = [];
  let openNoteMap = new Map();
  // app state
  let isPlaying;
  let isDataLoaded = false;

  const noteOn = (e) => {
    if (notes.length === 0) {
      firstTimeStamp = e.timestamp;
    }
    const noteInSeconds = (e.timestamp - firstTimeStamp) / 1000;
    const note = {
      number: e.note.number,
      time: noteInSeconds,
      velocity: e.velocity,
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

  /**
   * Pie-chart-like encoding
   */
  const drawPies = () => {
    const cy = (height - 50) / 2;
    const xStep = (width - 30) / pastNoteCount;
    const r = Math.min(xStep * 0.4, height * 0.3);
    const r2 = r * 0.5;
    const r3 = r * 0.75;
    const labelRadius = r + 20;
    const ctx = canvas.getContext('2d');
    // scale to DPR
    // Get the DPR and size of the canvas
    const dpr = window.devicePixelRatio;
    const rect = canvas.getBoundingClientRect();
    // Set the "actual" size of the canvas
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    // Scale the context to ensure correct drawing operations
    ctx.scale(dpr, dpr);
    // Set the "drawn" size of the canvas
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;
    // fade-out old data
    ctx.clearRect(0, 0, width, height);

    for (const [index, note] of notes.slice(-pastNoteCount).entries()) {
      // one pie chart per note
      const cx = xStep * (index + 0.5) + 15;
      // data part
      ctx.fillStyle = COLORS.accent;
      const ratio = Math.min(note.duration / wholeDuration, 1);
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, r, -Math.PI / 2, ratio * TWO_PI - Math.PI / 2);
      ctx.closePath();
      ctx.fill();
      // get duration of closest note
      let bestFitDuration = null;
      if (note.duration > 0) {
        const bestFit = d3.minIndex(durations, (d) =>
          Math.abs(note.duration - d.seconds),
        );
        bestFitDuration = durations[bestFit];
        if (showClosestDuration) {
          // draw closest note
          ctx.fillStyle = COLORS.accentDark;
          const ratio = Math.min(bestFitDuration.seconds / wholeDuration, 1);
          ctx.beginPath();
          ctx.moveTo(cx, cy);
          ctx.arc(cx, cy, r3, -Math.PI / 2, ratio * TWO_PI - Math.PI / 2);
          ctx.closePath();
          ctx.fill();
        }
      }
      //  if longer than a whole, show in red how much too long
      if (note.duration > wholeDuration) {
        ctx.fillStyle = COLORS.accentDarker;
        const ratio2 = Math.min(
          (note.duration - wholeDuration) / wholeDuration,
          1,
        );
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.arc(cx, cy, r, -Math.PI / 2, ratio2 * TWO_PI - Math.PI / 2);
        ctx.closePath();
        ctx.fill();
      }
      // frame
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#aaa';
      Canvas.drawCircle(ctx, cx, cy, r);
      // grid
      const coarseGridAngles = d3.range(4).map((d) => (d * TWO_PI) / 4);
      const fineGridAngles = d3.range(8).map((d) => (d * TWO_PI) / 8);
      ctx.beginPath();
      for (const g of coarseGridAngles) {
        const dx = Math.cos(g);
        const dy = Math.sin(g);
        ctx.moveTo(cx + dx * r2, cy + dy * r2);
        ctx.lineTo(cx + dx * r, cy + dy * r);
      }
      ctx.lineWidth = 1;
      for (const g of fineGridAngles) {
        const dx = Math.cos(g);
        const dy = Math.sin(g);
        ctx.moveTo(cx + dx * r3, cy + dy * r3);
        ctx.lineTo(cx + dx * r, cy + dy * r);
      }
      ctx.stroke();
      // labels
      ctx.fillStyle = '#666';
      ctx.font = '20px "Noto Music", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.textBaseline = 'middle';
      if (index === 0 && pastNoteCount <= 8) {
        ctx.fillText(noteWhole, cx, cy - labelRadius);
        ctx.fillText(noteQuarter, cx + labelRadius, cy);
        ctx.fillText(noteHalf, cx, cy + labelRadius);
        ctx.fillText(noteHalf + '.', cx - labelRadius, cy);
      }
      // text
      ctx.font = '16px "Noto Music", sans-serif';
      if (note.duration > 0) {
        ctx.fillText(`closest: ${bestFitDuration.symbol}`, cx, height - 50);
        const percent = (note.duration / bestFitDuration.seconds) * 100;
        ctx.fillText(`${percent.toFixed()}%`, cx, height - 30);
        let rating = '';
        if (percent < 80) {
          rating = 'too short';
        } else if (percent < 90) {
          rating = 'short';
        } else if (percent < 110) {
          rating = 'good!';
        } else if (percent < 120) {
          rating = 'long';
        } else {
          rating = 'too long';
        }
        ctx.fillText(`${rating}`, cx, height - 10);
      }
    }
  };

  /**
   * Bar-chart-like encoding
   */
  const drawBars = () => {
    const xStep = (width - 10) / pastNoteCount;
    const w = xStep * 0.8;
    const h = height * 0.7;
    const top = 10;
    const bottom = top + h;
    const ctx = canvas.getContext('2d');
    // scale to DPR
    // Get the DPR and size of the canvas
    const dpr = window.devicePixelRatio;
    const rect = canvas.getBoundingClientRect();
    // Set the "actual" size of the canvas
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    // Scale the context to ensure correct drawing operations
    ctx.scale(dpr, dpr);
    // Set the "drawn" size of the canvas
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;
    // fade-out old data
    ctx.clearRect(0, 0, width, height);
    ctx.textBaseline = 'middle';

    for (const [index, note] of notes.slice(-pastNoteCount).entries()) {
      // one pie chart per note
      const x = xStep * (index + 0.1) + 10;
      // data part
      ctx.fillStyle = COLORS.accent;
      const ratio = Math.min(note.duration / wholeDuration, 1);
      const filled = h * ratio;
      ctx.fillRect(x, bottom - filled, w, filled);
      // get closest duration
      let bestFitDuration = null;
      if (note.duration > 0) {
        const bestFit = d3.minIndex(durations, (d) =>
          Math.abs(note.duration - d.seconds),
        );
        bestFitDuration = durations[bestFit];
        if (showClosestDuration) {
          ctx.fillStyle = COLORS.accentDark;
          const ratio = Math.min(bestFitDuration.seconds / wholeDuration, 1);
          const filled = h * ratio;
          ctx.fillRect(x, bottom - filled, w / 2, filled);
        }
      }
      //  if longer than a whole, show in red how much too long
      if (note.duration > wholeDuration) {
        ctx.fillStyle = COLORS.accentDarker;
        const ratio2 = Math.min(
          (note.duration - wholeDuration) / wholeDuration,
          1,
        );
        const filled2 = h * ratio2;
        ctx.fillRect(x, bottom - filled2, w, filled2);
      }
      // frame
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#aaa';
      ctx.fillStyle = '#aaa';
      ctx.strokeRect(x, top, w, h);
      // grid
      ctx.fillRect(x, top + h / 2, w * 0.4, 1);
      for (const g of d3.range(top, top + h, h / 4)) {
        ctx.fillRect(x, g, w * 0.2, 1);
      }
      for (const g of d3.range(top, top + h, h / 8)) {
        ctx.fillRect(x, g, w * 0.1, 1);
      }
      // text
      ctx.font = '16px "Noto Music", sans-serif';
      ctx.fillStyle = '#666';
      if (note.duration > 0) {
        const bestFit = d3.minIndex(durations, (d) =>
          Math.abs(note.duration - d.seconds),
        );
        const bestFitDuration = durations[bestFit];
        ctx.textAlign = 'center';
        const cx = x + w / 2;
        ctx.fillText(`closest: ${bestFitDuration.symbol}`, cx, height - 50);
        const percent = (note.duration / bestFitDuration.seconds) * 100;
        ctx.fillText(`${percent.toFixed()}%`, cx, height - 30);
        let rating = '';
        if (percent < 80) {
          rating = 'too short';
        } else if (percent < 90) {
          rating = 'short';
        } else if (percent < 110) {
          rating = 'good!';
        } else if (percent < 120) {
          rating = 'long';
        } else {
          rating = 'too long';
        }
        ctx.fillText(`${rating}`, cx, height - 10);
      }
      // labels
      ctx.font = '20px "Noto Music", sans-serif';
      if (index === 0) {
        ctx.textAlign = 'right';
        ctx.fillText(noteWhole, x - 5, top);
        ctx.fillText(noteHalf + '.', x - 5, top + h * 0.25);
        ctx.fillText(noteHalf, x - 5, top + h * 0.5);
        ctx.fillText(noteQuarter, x - 5, top + h * 0.75);
        ctx.fillText(noteEighth, x - 5, top + h * 0.875);
      }
    }
  };

  const draw = () => {
    usePies ? drawPies() : drawBars();
  };

  afterUpdate(draw);

  /**
   * Used for exporting and for automatics saving
   */
  const getExportData = () => {
    return {
      tempo,
      pastNoteCount,
      usePies,
      showClosestDuration,
      // data
      notes,
    };
  };

  /**
   * Import data from file or example
   */
  const loadData = (json) => {
    saveToStorage();
    tempo = json.tempo;
    pastNoteCount = json.pastNoteCount;
    usePies = json.usePies ?? true;
    showClosestDuration = json.showClosestDuration;
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

<PageResizeHandler callback="{draw}" />

<FileDropTarget {loadData} disabled="{isPlaying}">
  <main class="app">
    <h2>{appInfo.title}</h2>
    <p class="explanation">
      This app helps practicing how long you hold notes. Set a tempo, start the
      metronome, and try to play different note durations (whole, half, quarter,
      eighth). You can also try dotted notes. Each note will be shown as a pie
      chart, that shows how much of a whole note you played. For example, if you
      tried to play a half note, the pie chart should be half full. If you play
      longer than a whole note, the addtional time will be shown in dark blue.
      You can also switch to a bar ('test tube') encoding.
    </p>
    <div class="control">
      <TempoInput bind:value="{tempo}" disabled="{isPlaying}" />
      <NoteCountInput
        bind:value="{pastNoteCount}"
        step="{1}"
        min="{1}"
        max="{12}"
      />
      <ToggleButton
        bind:checked="{usePies}"
        label="pies"
        title="Toggles between pie and bar chart encoding"
      />
      <ToggleButton
        bind:checked="{showClosestDuration}"
        label="show closest duration"
        title="Show the closest note duration as an inner piece"
      />
    </div>
    <div class="visualization">
      <canvas bind:this="{canvas}" style="width: {width}px; height: {height}px"
      ></canvas>
    </div>
    <div class="control">
      <MetronomeButton {tempo} accent="{4}" disabled="{isPlaying}" />
      <UndoRedoButton bind:data="{notes}" />
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
      <HistoryButton appId="{appInfo.id}" {loadData} />
      <ImportExportButton
        {loadData}
        {getExportData}
        appId="{appInfo.id}"
        disabled="{isPlaying}"
      />
    </div>
    <ExerciseDrawer>
      <p>
        1) Play a quarter note <span class="icon">𝅘𝅥 ◔</span>, a half note
        <span class="icon">𝅗𝅥 ◑</span>, a dotted half note
        <span class="icon">𝅗𝅥. ◕</span>
        , and a whole note <span class="icon">𝅝</span>
        <span class="icon" style="font-size: 14px">⬤</span>.
        <InsideTextButton
          onclick="{() => loadData(examplePerfect)}"
          disabled="{isPlaying}"
        >
          example with perfect notes
        </InsideTextButton>
      </p>
      <p>
        2) Play a quarter, a dotted quarter, a half, and a dotted half, a whole,
        and a dotted whole note.
        <InsideTextButton
          onclick="{() => loadData(examplePerfect2)}"
          disabled="{isPlaying}"
        >
          example with perfect notes
        </InsideTextButton>
      </p>
    </ExerciseDrawer>
    <MidiInput
      {noteOn}
      {noteOff}
      pcKeyAllowed
      disabled="{isDataLoaded || isPlaying}"
    />
    <RatingButton appId="{appInfo.id}" />
    <PcKeyboardInput
      key=" "
      disabled="{isDataLoaded || isPlaying}"
      keyDown="{() => {
        if (isKeyDown) {
          return;
        }
        isKeyDown = true;
        noteOn({
          note: { number: 0 },
          timestamp: performance.now(),
        });
      }}"
      keyUp="{() => {
        isKeyDown = false;
        noteOff({
          note: { number: 0 },
          timestamp: performance.now(),
        });
      }}"
    />
    <TouchInput
      element="{canvas}"
      disabled="{isDataLoaded || isPlaying}"
      touchStart="{() => {
        noteOn({
          note: { number: 0 },
          timestamp: performance.now(),
        });
      }}"
      touchEnd="{() => {
        noteOff({
          note: { number: 0 },
          timestamp: performance.now(),
        });
      }}"
    />
  </main>
</FileDropTarget>
