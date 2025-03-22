<script>
    import { afterUpdate, onDestroy } from 'svelte';
    import * as d3 from 'd3';
    import * as Plot from '@observablehq/plot';
    import { Utils } from 'musicvis-lib';
    import MetronomeButton from '../common/input-elements/metronome-button.svelte';
    import TempoInput from '../common/input-elements/tempo-input.svelte';
    import NoteCountInput from '../common/input-elements/note-count-input.svelte';
    import {
        noteDurationBeatMap,
        noteDurations,
        noteDurationsDotted,
        noteDurationsNormal,
        noteDurationsNormalAndDotted,
        noteDurationsTuplets,
    } from '../lib/note-durations.js';
    import MidiInput from '../common/input-handlers/midi-input.svelte';
    import ResetNotesButton from '../common/input-elements/reset-notes-button.svelte';
    import ImportExportButton from '../common/input-elements/import-export-share-button.svelte';
    import { localStorageAddRecording } from '../lib/localstorage.js';
    import HistoryButton from '../common/input-elements/history-button.svelte';
    import example from '../example-recordings/accents/accents.json';
    import example1 from '../example-recordings/accents/accents-e1.json';
    import example2 from '../example-recordings/accents/accents-e2.json';
    import example3 from '../example-recordings/accents/accents-eights-triplets.json';
    import example4 from '../example-recordings/accents/accents-triplet-second-note.json';
    import ExerciseDrawer from '../common/exercise-drawer.svelte';
    import { FILTER_NOTES, VELOCITIES_LOGIC } from '../lib/music.js';
    import RatingButton from '../common/input-elements/rating-button.svelte';
    import ToggleButton from '../common/input-elements/toggle-button.svelte';
    import SelectScollable from '../common/input-elements/select-scollable.svelte';
    import FileDropTarget from '../common/file-drop-target.svelte';
    import InsideTextButton from '../common/input-elements/inside-text-button.svelte';
    import MidiReplayButton from '../common/input-elements/midi-replay-button.svelte';

    /**
     * contains the app meta information defined in App.js
     */
    export let appInfo;

    let windowWidth = window.innerWidth;
    $: width = windowWidth < 1200 ? 900 : Math.floor(windowWidth - 200);
    let container;
    // settings
    let tempo = 90;
    let pastNoteCount = 20;
    let useDotted = false;
    let useDoubleDotted = false;
    let useTuplets = false;
    let filterNote = 16;
    let velocityThreshold = 0;
    let showAlternatives = true;
    // data
    $: minIOI = (Utils.bpmToSecondsPerBeat(tempo) * 4) / filterNote;
    let firstTimeStamp = 0;
    let notes = [];
    // app state
    let isPlaying;
    let isDataLoaded = false;

    const noteOn = async (e) => {
        if (notes.length === 0) {
            firstTimeStamp = e.timestamp;
        }
        const noteInSeconds = (e.timestamp - firstTimeStamp) / 1000;
        // check if note is too close to prior and skip if so
        if (notes.length > 0 && noteInSeconds - notes.at(-1).time < minIOI) {
            return;
        }
        const note = {
            time: noteInSeconds,
            velocity: e.velocity,
            number: e.note.number,
        };
        notes = [...notes, note];
    };

    /**
     * Draw visualization
     */
    const draw = () => {
        container.textContent = '';
        // legend
        const legendTicks = [...VELOCITIES_LOGIC.keys()].map((d) => d / 127);
        const legend = Plot.plot({
            // subtitle: 'loudness',
            width,
            height: 100,
            marginTop: 30,
            marginLeft: (width - 400) / 2,
            marginRight: (width - 400) / 2,
            marginBottom: 37,
            // make sure note symbols etc work
            style: 'font-family: Inter, "Noto Symbols", "Noto Symbols 2", "Noto Music", sans-serif',
            x: {
                label: 'loudness legend',
                labelArrow: 'none',
                labelAnchor: 'center',
                ticks: legendTicks,
                tickSize: 0,
                tickFormat: (d, i) => [...VELOCITIES_LOGIC.values()][i],
            },
            marks: [
                Plot.text(legendTicks, {
                    text: (d) => '𝅘𝅥',
                    x: (d, i) => d,
                    fontSize: (d) => d * 60 + 10,
                }),
            ],
        });
        container.appendChild(legend);
        if (notes.length === 0) {
            return;
        }
        let quarter = Utils.bpmToSecondsPerBeat(tempo);
        const sliced = notes.slice(-(pastNoteCount + 1));
        const deltas = sliced.map((d, i) => {
            if (i === 0) {
                return {};
            }
            const delta = d.time - sliced[i - 1].time;
            return {
                delta: delta / quarter,
                velocity: sliced[i - 1].velocity,
            };
        });

        let possible = [...noteDurationsNormal];
        // add dotted?
        if (useDotted) {
            possible = [...possible, ...noteDurationsDotted];
            if (useDoubleDotted) {
                possible = [...possible, ...noteDurationsDotted];
            }
        }
        // add tuplets?
        if (useTuplets) {
            possible = [...possible, ...noteDurationsTuplets];
        }
        const bestFit = deltas.slice(1).map((delta) => {
            // best fitting duration
            const bestDurIndex = d3.minIndex(possible, (d) =>
                Math.abs(delta.delta - d.beats),
            );
            const bestDur = possible[bestDurIndex];
            // best fitting dynamics
            const possibleDyn = [...VELOCITIES_LOGIC.entries()];
            const bestIndex = d3.minIndex(possibleDyn, (d) =>
                Math.abs(delta.velocity * 127 - d[0]),
            );
            const bestDyn = possibleDyn[bestIndex][1];
            return {
                ...bestDur,
                beats: delta.delta,
                velocity: delta.velocity,
                velocityLabel: bestDyn,
                offsetPercent: ((delta.delta / bestDur.beats) * 100).toFixed(),
            };
        });
        // plot
        const plot = Plot.plot({
            width,
            height: 110,
            marginTop: 50,
            marginLeft: 20,
            marginRight: 20,
            marginBottom: 10,
            // make sure note symbols etc work
            style: 'font-family: Inter, "Noto Symbols", "Noto Symbols 2", "Noto Music", sans-serif',
            x: {
                label: '',
                domain: d3.range(1, pastNoteCount),
                ticks: [],
            },
            y: {
                axis: false,
            },
            marks: [
                // note symbols
                Plot.text(bestFit, {
                    text: 'symbol',
                    x: (d, i) => i,
                    fontSize:
                        velocityThreshold > 0
                            ? (d) => (d.velocity < velocityThreshold ? 35 : 70)
                            : (d) => d.velocity * 60 + 10,
                    y: 1,
                }),
                // dynamics as text

                Plot.text(bestFit, {
                    text: 'velocityLabel',
                    x: (d, i) => i,
                    y: 0,
                    fill: '#888',
                }),
            ],
        });
        container.appendChild(plot);

        if (!showAlternatives) {
            return;
        }

        // comparison with double bar chart
        const base = {
            width,
            height: 150,
            marginTop: 20,
            marginLeft: 40,
            marginRight: 20,
            marginBottom: 10,
            // make sure note symbols etc work
            style: 'font-size: 9px; font-family: Inter, "Noto Symbols", "Noto Symbols 2", "Noto Music", sans-serif',
            x: {
                label: '',
                domain: d3.range(1, pastNoteCount),
                ticks: [],
            },
        };
        // plot with loudness
        const ticks = [...VELOCITIES_LOGIC.keys()];
        const plot2 = Plot.plot({
            ...base,
            y: {
                label: 'loudness',
                ticks,
                tickFormat: (d) => VELOCITIES_LOGIC.get(d),
                domain: [0, 127],
            },
            marks: [
                Plot.ruleY(
                    ticks.filter((d, i) => i % 2 === 0),
                    { stroke: '#888', strokeWidth: 0.5 },
                ),
                Plot.barY(bestFit, {
                    x: (d, i) => i,
                    y: (d) => d.velocity * 127,
                    ry: 4,
                    fill: '#ddd',
                    tip: true,
                    title: (d) => d.velocityLabel,
                }),
                Plot.ruleY([0]),
            ],
        });
        container.appendChild(plot2);

        // plot with IOIs
        const ticks2 = noteDurationsNormalAndDotted.filter(
            (d) =>
                !d.doubleDotted &&
                d.beats >= 0.25 &&
                d.beats <= 2 &&
                d.name !== 'dotted-sixteenth',
        );
        const plot3 = Plot.plot({
            ...base,
            y: {
                label: 'IOI in beats',
                nice: false,
                domain: [0, 1.5],
                ticks: ticks2.map((d) => d.beats),
                tickFormat: (d) => noteDurationBeatMap.get(d)?.symbol,
            },
            marks: [
                Plot.ruleY([0, 0.5, 1, 1.5, 2], {
                    stroke: '#888',
                    strokeWidth: 0.5,
                }),
                Plot.barY(bestFit, {
                    x: (d, i) => i,
                    y: (d, i) => d.beats,
                    ry: 4,
                    fill: '#ddd',
                    tip: true,
                    title: (d) => `${d.symbol}\n${d.beats.toFixed(2)} beats`,
                }),
                Plot.ruleY([0]),
            ],
        });
        container.appendChild(plot3);

        // ticks
        const notesInBeats = sliced.map((d) => {
            return { ...d, beats: d.time / quarter };
        });
        const plot4 = Plot.plot({
            ...base,
            height: 100,
            marginLeft: 60,
            marginRight: 40,
            marginBottom: 30,
            x: {
                label: 'time in beats',
            },
            color: {
                legend: true,
            },
            marks: [
                Plot.tickX(notesInBeats.slice(1, -1), {
                    x: (d) => d.beats,
                    strokeWidth: (d) => d.velocity * 4,
                    // stroke: (d) => d3.interpolateViridis(1 - d.velocity),
                    stroke: '#888',
                }),
            ],
        });
        container.appendChild(plot4);

        // vis of note durations that can be represented
        const plot5 = Plot.plot({
            ...base,
            subtitle:
                'Note durations that can be represented by symbols and modifiers',
            marginBottom: 30,
            x: {
                label: 'duration in beats',
                domain: [0, 2],
            },
            y: {
                ticks: [0, 1, 2],
                tickFormat: (d) => ['normal', 'dotted/\ntied', 'tuplet'][d],
                domain: [-0.5, 2.5],
                reverse: true,
            },
            color: {
                legend: true,
            },
            marks: [
                Plot.ruleX(
                    noteDurations.filter((d) => d.normal),
                    {
                        x: (d) => d.beats,
                        stroke: '#ccc',
                        strokeWidth: 1.2,
                    },
                ),
                Plot.ruleX(
                    noteDurations.filter((d) => d.dotted || d.doubleDotted),
                    {
                        x: (d) => d.beats,
                        stroke: '#ccc',
                        strokeWidth: 1.2,
                        strokeDasharray: '2 2',
                    },
                ),
                Plot.ruleX(
                    noteDurations.filter((d) => d.tuplet),
                    {
                        x: (d) => d.beats,
                        stroke: '#ccc',
                        strokeWidth: 1.2,
                        strokeDasharray: '4 2',
                    },
                ),
                Plot.dot(noteDurations, {
                    x: (d) => d.beats,
                    y: (d) =>
                        d.dotted || d.doubleDotted ? 1 : d.tuplet ? 2 : 0,
                    fill: 'white',
                    stroke: '#eee',
                    r: 10,
                    tip: true,
                    title: (d) => `${d.symbol} = ${d.beats.toFixed(3)} beats`,
                }),
                Plot.text(noteDurations, {
                    x: (d) => d.beats,
                    y: (d) =>
                        d.dotted || d.doubleDotted ? 1 : d.tuplet ? 2 : 0,
                    text: (d) => d.symbol,
                    fontSize: 10,
                    pointerEvents: 'none',
                    dy: 2,
                }),
            ],
        });
        container.appendChild(plot5);
    };

    /**
     * Used for exporting and for automatics saving
     */
    const getExportData = () => {
        return {
            tempo,
            pastNoteCount,
            useDotted,
            useTuplets,
            velocityThreshold,
            filterNote,
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
        useDotted = json.useDotted;
        useTuplets = json.useTuplets;
        velocityThreshold = json.velocityThreshold ?? 0;
        filterNote = json.filterNote ?? 32;
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

    afterUpdate(draw);

    onDestroy(saveToStorage);
</script>

<svelte:window bind:innerWidth="{windowWidth}" />

<FileDropTarget {loadData} disabled="{isPlaying}">
    <main class="app">
        <h2>{appInfo.title}</h2>
        <p class="explanation">
            This app helps practicing dynamic accents, that is, playing some
            notes louder then others to highlight them. Set a tempo and start
            playing. The time between the notes you play will be displayed as
            note symbols, so you can see whether you play, for example, correct
            quarter notes. The note's velocity is encoded as font size, so you
            can see whether you accent the correct notes, for example the first
            note in each triplet, or the the first in each group of 4.
            <i>Note: the display is always one note behind.</i>
        </p>
        <div class="control">
            <TempoInput bind:value="{tempo}" disabled="{isPlaying}" />
            <NoteCountInput bind:value="{pastNoteCount}" max="{70}" />
            <ToggleButton
                label="dotted notes"
                title="Use dotted notes? If not, the closest non-dotted note will be taken."
                bind:checked="{useDotted}"
            />
            <ToggleButton
                label="double-dotted notes"
                title="Use double-dotted notes? If not, the closest non-dotted note will be taken."
                bind:checked="{useDoubleDotted}"
                disabled="{!useDotted}"
            />
            <ToggleButton
                label="tuplets"
                title="Use tuplets? If not, the closest non-tuplet note will be taken."
                bind:checked="{useTuplets}"
            />
        </div>
        <div class="control">
            <SelectScollable
                title="You can filter out notes that are shorter than a given note duration."
                label="filtering"
                bind:value="{filterNote}"
            >
                {#each FILTER_NOTES as g}
                    <option value="{g}">1/{g} note</option>
                {/each}
            </SelectScollable>
            <SelectScollable
                title="You can choose a value for loudness to only show loud and quiet notes in two different sizes instead of exactly sizing notes by loudness. Set to 0 to use smooth sizing."
                label="loudness threshold"
                bind:value="{velocityThreshold}"
            >
                {#each VELOCITIES_LOGIC.entries() as [velocity, label]}
                    <option value="{velocity / 127}">
                        {(velocity / 127).toFixed(1)}
                        {label}
                    </option>
                {/each}
            </SelectScollable>
            <ToggleButton
                label="alternative designs"
                title="Show alternative designs for comparison."
                bind:checked="{showAlternatives}"
            />
        </div>
        <div class="visualization" bind:this="{container}"></div>
        <div class="control">
            <MetronomeButton {tempo} accent="{4}" disabled="{isPlaying}" />
            <ResetNotesButton
                bind:notes
                bind:isDataLoaded
                disabled="{isPlaying}"
                {saveToStorage}
            />
            <HistoryButton
                appId="{appInfo.id}"
                {loadData}
                disabled="{isPlaying}"
            />
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
                1) Play quarter notes and accent the first one in each group of
                4.
                <InsideTextButton
                    onclick="{() => loadData(example1)}"
                    disabled="{isPlaying}"
                >
                    example
                </InsideTextButton>
            </p>
            <p>
                2) Play eighth notes and accent the first one in each group of
                4.
                <InsideTextButton
                    onclick="{() => loadData(example)}"
                    disabled="{isPlaying}"
                >
                    example
                </InsideTextButton>
            </p>
            <p>
                3) Play triplets and accent the first note in each triplet.
                <InsideTextButton
                    onclick="{() => loadData(example2)}"
                    disabled="{isPlaying}"
                >
                    example
                </InsideTextButton>
            </p>
            <p>
                4) Switch between eighths and triplets and accent the first note
                in each group of 4 and 3.
                <InsideTextButton
                    onclick="{() => loadData(example3)}"
                    disabled="{isPlaying}"
                >
                    example
                </InsideTextButton>
            </p>
            <p>
                5) Play triplets and accent the first note in each odd triplet
                and the second in each even triplet.
                <InsideTextButton
                    onclick="{() => loadData(example4)}"
                    disabled="{isPlaying}"
                >
                    example
                </InsideTextButton>
            </p>
            <p>
                6) Try different accent patterns such as:<br />
                <span style="margin-left: 25px">
                    <b>1</b> e + <b>a</b> 2 e + a 3 <b>e</b> + a <b>4</b> e + a<br
                    />
                </span>
                <span class="icon" style="margin-left: 25px">
                    <span class="acc">𝅘𝅥</span> 𝅘𝅥 𝅘𝅥 <span class="acc">𝅘𝅥</span> |
                    𝅘𝅥 𝅘𝅥 𝅘𝅥 𝅘𝅥 | 𝅘𝅥
                    <span class="acc">𝅘𝅥</span>
                    𝅘𝅥 𝅘𝅥 |
                    <span class="acc">𝅘𝅥</span>
                    𝅘𝅥 𝅘𝅥 𝅘𝅥
                </span>
            </p>
        </ExerciseDrawer>
        <MidiInput {noteOn} disabled="{isDataLoaded || isPlaying}" />
        <RatingButton appId="{appInfo.id}" />
    </main>
</FileDropTarget>

<style>
    .acc {
        font-size: 1.6em;
    }
</style>
