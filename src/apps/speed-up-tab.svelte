<script>
    import { onDestroy, onMount } from 'svelte';
    import * as d3 from 'd3';
    import * as Plot from '@observablehq/plot';
    import { Utils } from 'musicvis-lib';
    import Metronome from '../lib/Metronome.js';
    import { delay } from '../lib/lib.js';
    import { Note } from '@tonaljs/tonal';
    import TempoInput from '../common/tempo-input.svelte';
    import MidiInput from '../common/midi-input.svelte';
    import ImportExportButton from '../common/import-export-button.svelte';
    import { localStorageAddRecording } from '../lib/localstorage.js';
    import HistoryButton from '../common/history-button.svelte';
    import ResetNotesButton from '../common/reset-notes-button.svelte';
    import ExerciseDrawer from '../common/exercise-drawer.svelte';
    import RatingButton from '../common/rating-button.svelte';
    import ShareConfigButton from '../common/share-config-button.svelte';
    import { replacer } from '../lib/json.js';
    import NumberInput from '../common/number-input.svelte';
    import SelectScollable from '../common/select-scollable.svelte';

    /**
     * contains the app meta information defined in App.js
     */
    export let appInfo;

    let width = 900;
    let height = 150;
    let container;
    let metro = new Metronome();
    let ready = true;
    let tempoStepWatcher;
    // settings
    let initialTempo = 60;
    let targetTempo = 120;
    let tempoIncrease = 10;
    let quantize = 'off';
    // data
    let currentStep = '';
    let currentTempo = targetTempo;
    let firstTimeStamp = performance.now();
    let exerciseNotes = [];
    let exerciseBeatCount;
    // Map bpm->notes
    let practiceRecordings = new Map();
    // domain knowledge
    let stringCount = 6;
    // E standard tuning, strings start at high E
    let tuningPitches = [64, 59, 55, 50, 45, 40];
    const tuningNotes = tuningPitches.map(Note.fromMidiSharps);

    const noteOn = async (e) => {
        const noteInSeconds = (e.timestamp - firstTimeStamp) / 1000;
        const string = e.message.channel - 1;
        const note = {
            time: noteInSeconds,
            string,
            fret: e.note.number - tuningPitches[string],
            velocity: e.rawVelocity,
        };
        if (currentStep === 'input exercise') {
            // currently inputting the exercise
            exerciseNotes = [...exerciseNotes, note];
        } else if (currentStep === 'practice') {
            // currently practicing
            if (!practiceRecordings.has(currentTempo)) {
                practiceRecordings.set(currentTempo, []);
            }
            const notes = practiceRecordings.get(currentTempo);
            // only save note if recorder is ready (short delay after metronome stop)
            if (ready) {
                notes.push(note);
            }
        }
        draw();
    };

    /**
     * Regularly check if the tempo should be increased now
     *
     */
    const checkIfTempoIncrease = async () => {
        // check if current tempo is complete
        const notes = practiceRecordings.get(currentTempo);
        if (!notes || !notes.length) {
            return;
        }
        const minTime = d3.min(notes, (d) => d.time);
        const now = (performance.now() - firstTimeStamp) / 1000;
        const currentDuration = now - minTime;
        let quarter = Utils.bpmToSecondsPerBeat(currentTempo);
        const currentBeats = currentDuration / quarter;
        if (currentBeats >= exerciseBeatCount) {
            console.log(`increasing bpm`);
            // go to next step
            metro.stop();
            if (currentTempo <= targetTempo) {
                currentTempo += tempoIncrease;
                ready = false;
                await delay(1);
                metro.start(currentTempo, 4);
                // make sure we have a clean start, ie reset current recording
                if (practiceRecordings.has(currentTempo)) {
                    practiceRecordings.set(currentTempo, []);
                }
                ready = true;
            } else {
                stopPractice();
            }
        }
    };

    const inputExercise = () => {
        currentStep = 'input exercise';
        // reset practice
        exerciseNotes = [];
        practiceRecordings = new Map();
        metro.start(initialTempo, 4);
        draw();
    };

    const saveExercise = () => {
        currentStep = '';
        metro.stop();
        if (exerciseNotes.length > 0) {
            // get exercise duration in beats
            const exerciseDuration =
                d3.max(exerciseNotes, (d) => d.time) -
                d3.min(exerciseNotes, (d) => d.time);
            let quarter = Utils.bpmToSecondsPerBeat(initialTempo);
            exerciseBeatCount = Math.ceil(exerciseDuration / quarter);
        }
    };

    const startPractice = async () => {
        if (exerciseNotes.length === 0) {
            alert('You need to input an exercise first');
            return;
        }
        currentStep = 'practice';
        currentTempo = initialTempo;
        practiceRecordings = new Map();
        metro.start(currentTempo, 4);
        tempoStepWatcher = setInterval(checkIfTempoIncrease, 100);
    };

    const stopPractice = () => {
        currentStep = '';
        currentTempo = targetTempo;
        clearInterval(tempoStepWatcher);
        metro.stop();
    };

    /**
     * Draw visualization
     */
    const draw = () => {
        container.textContent = '';
        if (exerciseNotes.length === 0) {
            return;
        }
        // quantize exercise notes and convert time to beats
        let quarter = Utils.bpmToSecondsPerBeat(initialTempo);
        const quantized = quantizeAndScaleNotes(
            exerciseNotes,
            quantize,
            quarter,
        );
        let maxBeat =
            Math.ceil((d3.max(quantized, (d) => d.time) / 4) * 4) + 0.5;
        // plot
        const plot = Plot.plot({
            width,
            height,
            marginLeft: 40,
            x: {
                label: 'time in beats',
                domain: [0, maxBeat],
            },
            y: {
                domain: d3.range(0, stringCount),
                tickFormat: (d) => tuningNotes[d],
                tickSize: 0,
            },
            marks: [
                // strings
                Plot.ruleY(d3.range(0, stringCount), {
                    stroke: '#eee',
                    strokeDasharray: '6 6',
                }),
                // beat marks
                Plot.ruleX(d3.range(0, maxBeat, 1), {
                    stroke: '#ccc',
                }),
                // bar marks
                Plot.ruleX(d3.range(0, maxBeat, 4), {
                    stroke: '#aaa',
                }),
                // notes
                Plot.tickX(quantized, {
                    // symbol: 'times',
                    stroke: '#333',
                    x: (d) => d.time,
                    y: (d) => d.string,
                    strokeWidth: 2,
                }),
                Plot.text(quantized, {
                    text: 'fret',
                    fill: 'velocity',
                    x: (d) => d.time,
                    y: (d) => d.string,
                    textAnchor: 'middle',
                    dy: -10,
                }),
            ],
        });
        container.appendChild(plot);

        // plot practice notes, one plot per tempo
        for (const [tempo, notes] of practiceRecordings) {
            if (notes.length === 0) {
                continue;
            }
            const firstNoteTime = notes[0].time;
            quarter = Utils.bpmToSecondsPerBeat(tempo);
            const inBeats = notes.map((d) => {
                return {
                    ...d,
                    time: (d.time - firstNoteTime) / quarter,
                };
            });
            const plot = Plot.plot({
                width,
                height,
                marginLeft: 40,
                x: {
                    label: 'time in beats',
                    domain: [0, maxBeat],
                },
                y: {
                    label: `${tempo} BPM`,
                    domain: d3.range(0, stringCount),
                    tickFormat: (d) => tuningNotes[d],
                    tickSize: 0,
                },
                color: {
                    // legend: true,
                    domain: [0, 100], // no need for differentiating loud notes
                    scheme: 'Greys',
                },
                marks: [
                    // strings
                    Plot.ruleY(d3.range(0, stringCount), {
                        stroke: '#eee',
                        strokeDasharray: '6 6',
                    }),
                    // beat marks
                    Plot.ruleX(d3.range(0, maxBeat, 1), {
                        stroke: '#ccc',
                    }),
                    // bar marks
                    Plot.ruleX(d3.range(0, maxBeat, 4), {
                        stroke: '#aaa',
                    }),
                    // notes
                    Plot.tickX(inBeats, {
                        // symbol: 'times',
                        stroke: 'velocity',
                        x: (d) => d.time,
                        y: (d) => d.string,
                        strokeWidth: 1.2,
                    }),
                    Plot.text(inBeats, {
                        text: 'fret',
                        fill: 'velocity',
                        x: (d) => d.time,
                        y: (d) => d.string,
                        textAnchor: 'middle',
                        dy: -10,
                    }),
                ],
            });
            container.appendChild(plot);
        }
    };

    onMount(draw);

    function quantizeAndScaleNotes(notes, quantize, quarter) {
        const firstNoteTime = notes[0].time;
        const quantized = notes.map((d) => {
            // time relative to first note
            let time = d.time - firstNoteTime;
            // quantize to 16th note or so
            if (quantize !== 'off') {
                let q;
                if (quantize === '8th') {
                    q = quarter / 2;
                }
                if (quantize === '16th') {
                    q = quarter / 4;
                }
                if (quantize === '32nd') {
                    q = quarter / 8;
                }
                time = Math.round(time / q) * q;
            }
            const newTime = time / quarter;
            return {
                ...d,
                time: newTime,
            };
        });
        return quantized;
    }

    const predefinedExercise = (e) => {
        const ex = e.target.value;
        const exercises = new Map([
            ['quarter', d3.range(0, 8, 1)],
            ['eighth', d3.range(0, 8, 0.5)],
            ['triplets', d3.range(0, 8, 1 / 3)],
            [
                'swing',
                d3.range(0, 8, 0.5).map((d, i) => (i % 2 === 0 ? d : d + 0.2)),
            ],
        ]);
        const quarter = Utils.bpmToSecondsPerBeat(initialTempo);
        quantize = 'off';
        const beats = exercises.get(ex);
        exerciseNotes = beats.map((d) => d * quarter);
        exerciseBeatCount = Math.ceil(d3.max(beats) + 1);
        // make into a tab
        exerciseNotes = exerciseNotes.map((d) => {
            return { time: d, string: 5, fret: 0 };
        });
        draw();
    };

    /**
     * Used for exporting and for automatics saving
     */
    const getExportData = () => {
        return {
            // settings
            initialTempo,
            targetTempo,
            tempoIncrease,
            quantize,
            // data
            currentStep,
            currentTempo,
            firstTimeStamp,
            exerciseNotes,
            exerciseBeatCount,
            practiceRecordings,
        };
    };

    /**
     * Import data from file or example
     */
    const loadData = (json) => {
        saveToStorage();
        // settings
        initialTempo = json.initialTempo;
        targetTempo = json.targetTempo;
        tempoIncrease = json.tempoIncrease;
        quantize = json.quantize;
        // data
        currentStep = json.currentStep;
        currentTempo = json.currentTempo;
        firstTimeStamp = json.firstTimeStamp;
        exerciseNotes = json.exerciseNotes;
        exerciseBeatCount = json.exerciseBeatCount;
        practiceRecordings = json.practiceRecordings;
        if (practiceRecordings.dataType) {
            practiceRecordings = new Map(practiceRecordings.value);
        }
        draw();
    };

    const saveToStorage = () => {
        if (
            exerciseNotes.length > 0
            // && JSON.stringify(practiceRecordings, replacer) !== JSON.stringify(example.practiceRecordings, replacer)
        ) {
            localStorageAddRecording(appInfo.id, getExportData());
        }
    };

    onDestroy(() => {
        clearInterval(tempoStepWatcher);
        metro.stop();
        saveToStorage();
    });
</script>

<main class="app">
    <h2>{appInfo.title}</h2>
    <p class="explanation">
        This app helps practicing playing faster on guitar. Adjust the initial
        and target tempo, record an exercise at the inital tempo, and then
        practice it with increasing speed until you reach your target tempo. All
        repetitions will be shown time-aligned, so you can see at which tempo
        you start to struggle keeping up. The notes you play are displayed in a
        tablature-like visualization with crosses, numbers above notes indicate
        the fret. The darkness (white to black) encodes the notes' velocities,
        so eventual noise (unintended notes) is less distracting.
    </p>
    <ExerciseDrawer>
        <p>1) Select a pre-defined below and play it from 60 to 120 bpm.</p>
        <p>
            2) Input your own exercise, optionally quantize it, and practice it.
        </p>
    </ExerciseDrawer>
    <div class="control">
        <TempoInput
            label="initial tempo"
            title="Set a tempo at which you are able to input the exercise precisely (in BPM)"
            bind:value="{initialTempo}"
            callback="{draw}"
        />
        <TempoInput
            label="target tempo"
            title="Set the tempo you want to be able to play the exercise at (in BPM)"
            bind:value="{targetTempo}"
            callback="{draw}"
        />
        <NumberInput
            title="Set the tempo increase between practice runs (in BPM)"
            label="step"
            bind:value="{tempoIncrease}"
            min="{1}"
            max="{20}"
            step="{1}"
        />
        <SelectScollable
            label="quantize exercise"
            bind:value="{quantize}"
            callback="{draw}"
        >
            {#each ['off', '32nd', '16th', '8th', 'triplet', 'quintuplet'] as d}
                <option value="{d}">{d}</option>
            {/each}
        </SelectScollable>
    </div>
    <div class="control">
        <label>
            exercise
            <select on:change="{predefinedExercise}">
                <option selected disabled></option>
                {#each ['quarter', 'eighth', 'triplets', 'swing'] as d}
                    <option>{d}</option>
                {/each}
            </select>
        </label>
        <button
            title="Start recording the exercise."
            on:click="{inputExercise}"
            disabled="{currentStep === 'input exercise' ||
                currentStep === 'practice'}"
        >
            input exercise
        </button>
        <button
            title="Stop recording the exercise."
            on:click="{saveExercise}"
            disabled="{currentStep !== 'input exercise'}"
        >
            save exercise
        </button>
        <button
            title="Start recording the practice with speed-up."
            on:click="{startPractice}"
            disabled="{exerciseNotes.length === 0}"
        >
            start practice
        </button>
        <button
            title="Stop recording the practice with speed-up."
            on:click="{stopPractice}"
            disabled="{currentStep !== 'practice'}"
        >
            stop practice
        </button>
    </div>
    <div>
        current step: <b>{currentStep}</b> current tempo: <b>{currentTempo}</b> BPM
    </div>
    <div class="visualization" bind:this="{container}"></div>
    <div class="control">
        <ResetNotesButton
            {saveToStorage}
            title="Clear practice but not exercise"
            disabled="{currentStep !== ''}"
            callback="{() => {
                practiceRecordings = new Map();
                firstTimeStamp = performance.now();
                draw();
            }}"
        />
        <ImportExportButton {loadData} {getExportData} appId="{appInfo.id}" />
        <HistoryButton appId="{appInfo.id}" {loadData} />
        <ShareConfigButton {getExportData} {loadData} appId="{appInfo.id}" />
    </div>
    <RatingButton appId="{appInfo.id}" />
    <MidiInput {noteOn} />
</main>
