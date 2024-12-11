<script>
    import { onDestroy, onMount } from 'svelte';
    import * as d3 from 'd3';
    import { Note } from 'tonal';
    import 'aframe';
    import 'aframe-svelte';
    import { Midi } from 'musicvis-lib';
    import { roundToStep } from '../lib/lib';
    import MidiInput from '../common/input-handlers/midi-input.svelte';
    import * as AFRAME from 'aframe';
    import PcKeyboardInput from '../common/input-handlers/pc-keyboard-input.svelte';
    import exampleStaying from '../example-recordings/fretboard-jitter/fretboard-jitter-staying-in-default.json';
    import exampleHopping from '../example-recordings/fretboard-jitter/fretboard-jitter-hopping-between-positions.json';
    import exampleVaried from '../example-recordings/fretboard-jitter/fretboard-jitter-strongly-varied.json';

    /**
     * TODO:
     * - opacity for velocity to hide noise
     */

    /**
     * contains the app meta information defined in App.js
     */
    export let appInfo;

    let stringCount = 6;
    let fretCount = 24;
    // E standard tuning, strings start at high E
    let tuningPitches = [64, 59, 55, 50, 45, 40];
    const tuningNotes = tuningPitches.map(Note.fromMidiSharps);
    // const stringColors = tuningNotes.map(()=>'#aaa')
    const stringColors = d3.schemeObservable10;
    // settings
    let timeFactor = 1;
    let pastSeconds = 60;
    // data
    let firstTimeStamp = 0;
    let lastTimeSeconds = 60;
    $: firstTimeSeconds = lastTimeSeconds - pastSeconds;
    $: scaleTime = d3
        .scaleLinear()
        .domain([lastTimeSeconds, firstTimeSeconds])
        .range([0.5, pastSeconds * timeFactor]);
    let notes = [];
    // create random data until MIDI input is received
    const randomNote = (time) => {
        const string = Math.floor(Math.random() * 6);
        const fret = Math.round(Math.random() * 24);
        const velocity = Math.round(Math.random() * 127);
        const midiNr = tuningPitches[string] + fret;
        time = time ?? Math.round(Math.random() * 60);
        lastTimeSeconds = time;
        return {
            string,
            fret,
            time,
            note: Midi.NOTE_NAMES[midiNr % 12],
            velocity,
        };
    };
    let testInterval = setInterval(
        () => (notes = [...notes, randomNote(performance.now() / 1000)]),
        500,
    );
    $: lastNotes = notes.filter(
        (d) =>
            d.time > lastTimeSeconds - pastSeconds && d.time < lastTimeSeconds,
        11,
    );
    let binnedNotes;
    let maxValue = 1;

    let debugMsg = '';

    const noteOn = (e) => {
        if (testInterval) {
            clearInterval(testInterval);
            testInterval = null;
            notes = [];
        }
        if (notes.length === 0) {
            firstTimeStamp = e.timestamp;
        }
        const string = e.message.channel - 1;
        const fret = e.note.number - tuningPitches[string];
        // filter noise
        if (fret < 0 || fret > fretCount) {
            return;
        }
        const noteInSeconds = (e.timestamp - firstTimeStamp) / 1000;
        const note = {
            number: e.note.number,
            note: Midi.NOTE_NAMES[e.note.number % 12],
            velocity: e.rawVelocity,
            time: noteInSeconds,
            channel: e.message.channel,
            string,
            fret,
        };
        notes = [...notes, note];
        lastTimeSeconds = noteInSeconds;
    };

    const binNotes = (notes) => {
        binnedNotes = d3.groups(
            notes,
            (d) => d.string,
            (d) => d.fret,
        );
        maxValue = d3.max(binnedNotes, ([string, data]) =>
            d3.max(data, ([fret, notes]) => notes.length),
        );
    };

    $: binNotes(lastNotes);

    onMount(() => {
        // https://github.com/aframevr/aframe/blob/master/docs/components/oculus-touch-controls.md#events
        // console.log(AFRAME);
        AFRAME.registerComponent('thumbstick-logging', {
            init: function () {
                this.el.addEventListener('thumbstickmoved', this.logThumbstick);
            },
            logThumbstick: function (evt) {
                if (evt.detail.y > 0.95) {
                    console.log('DOWN');
                }
                if (evt.detail.y < -0.95) {
                    console.log('UP');
                }
                if (evt.detail.x < -0.95) {
                    console.log('LEFT');
                }
                if (evt.detail.x > 0.95) {
                    console.log('RIGHT');
                }
                debugMsg = `x ${evt.detail.x} y ${evt.detail.y}`;
            },
        });
    });

    onDestroy(() => {
        clearInterval(testInterval);
        window.location.reload();
    });

    /**
     * Used for exporting and for automatics saving
     */
    const getExportData = () => {
        return {
            timeFactor,
            pastSeconds,
            // data
            notes,
        };
    };

    /**
     * Import data from file or example
     */
    const loadData = (json) => {
        clearInterval(testInterval);
        timeFactor = json.timeFactor ?? 1;
        pastSeconds = json.pastSeconds ?? 60;
        // data
        notes = json.notes.map((d) => {
            return { ...d, note: Midi.NOTE_NAMES[d.number % 12] };
        });
        // app state
        lastTimeSeconds = notes.at(-1).time ?? 0;
        // isDataLoaded = true;
    };

    $: opacityMap = d3.scaleLinear().domain([0, maxValue]).range([0.2, 1]);
</script>

<!-- examples -->
<PcKeyboardInput
    key="1"
    keyDown="{() => {
        loadData(exampleStaying);
    }}"
/>
<PcKeyboardInput
    key="2"
    keyDown="{() => {
        loadData(exampleHopping);
    }}"
/>
<PcKeyboardInput
    key="3"
    keyDown="{() => {
        loadData(exampleVaried);
    }}"
/>
<!-- actions -->
<PcKeyboardInput
    key="+"
    keyDown="{() => {
        timeFactor += 0.1;
    }}"
/>
<PcKeyboardInput
    key="-"
    keyDown="{() => {
        timeFactor -= 0.1;
    }}"
/>
<PcKeyboardInput
    key="PageUp"
    keyDown="{() => {
        lastTimeSeconds += 1;
    }}"
/>
<PcKeyboardInput
    key="PageDown"
    keyDown="{() => {
        lastTimeSeconds -= 1;
    }}"
/>

<main class="app">
    <!-- x is right, y is up, z is toward camera -->
    <a-scene renderer="colorManagement: true; antialias: true;">
        <!-- controllers -->
        <a-entity oculus-touch-controls="hand: left"></a-entity>
        <a-entity oculus-touch-controls="hand: right"></a-entity>
        <!-- hand tracking -->
        <a-entity id="leftHand" hand-tracking-controls="hand: left;"></a-entity>
        <a-entity id="rightHand" hand-tracking-controls="hand: right;"
        ></a-entity>
        <!-- skybox -->
        <a-sky color="white"></a-sky>
        <!-- text with explanation -->
        <a-entity
            text="value: {appInfo.title}; color: #666; width: 5"
            position="-1.75 1.85 -3"
            scale=".35 .35 .35"
        ></a-entity>
        <a-entity
            text="value: Connect a MIDI guitar and start playing. Notes are positioned based on their string (forward), fret (right), and time (up). They are colored by string and labelled with note name and fret number.\n\nRandom notes are shown until you play.\n\nPress 1, 2, 3 for examples, +/- to change the time scale,page up/down to scroll throguh time.\n\nGo back in your browser to return to the main page.; color: #666; width: 5"
            position="-2 1.2 -3"
            scale=".25 .25 .25"
        ></a-entity>
        <!-- text for debugging -->
        <a-entity
            text="value: {debugMsg}; color: #666; width: 5"
            position="-2 1 -3"
            scale=".25 .25 .25"
        ></a-entity>
        <!-- visualization container -->
        <a-box
            position="-1 0 -3"
            rotation="0 0 0"
            scale=".1 .1 .1"
            visible="true"
            opacity="0"
        >
            <!-- fretboard -->
            {#each d3.range(stringCount) as string}
                <!-- strings -->
                <a-cylinder
                    position="{`${fretCount / 2} 0 ${string - 5}`}"
                    radius="{0.02 * (string / 6 + 1)}"
                    height="26"
                    rotation="0 0 90"
                    color="{stringColors[stringCount - string - 1]}"
                ></a-cylinder>
                <!-- string notes -->
                <a-entity
                    text="value: {tuningNotes[string]}; color: #666"
                    position="{`2.5 0 ${string - 5}`}"
                    scale="10 10 10"
                ></a-entity>
            {/each}
            {#each d3.range(fretCount + 1) as fret}
                <!-- frets -->
                <a-cylinder
                    position="{`${fret} 0 -2.5`}"
                    radius="{0.02}"
                    height="5"
                    rotation="90 0 0"
                    color="#ddd"
                ></a-cylinder>
                <!-- fret numbers -->
                <a-entity
                    text="value: {fret}; color: #666"
                    position="{`${fret + 4.5} 0 1`}"
                    scale="10 10 10"
                ></a-entity>
            {/each}
            <!-- inlays -->
            {#each [3, 5, 7, 9, 15, 17, 19, 21] as dot}
                <a-sphere
                    position="{dot - 0.5} 0 -2.5"
                    color="silver"
                    scale="0.25 0.1 0.25"
                ></a-sphere>
            {/each}
            {#each [12, 24] as dot}
                <a-sphere
                    position="{dot - 0.5} 0 -1.5"
                    color="silver"
                    scale="0.25 0.1 0.25"
                ></a-sphere>
                <a-sphere
                    position="{dot - 0.5} 0 -3.5"
                    color="silver"
                    scale="0.25 0.1 0.25"
                ></a-sphere>
            {/each}
            {#each d3.range(roundToStep(firstTimeSeconds, 5), lastTimeSeconds + 1, 5) as time}
                <!-- time axis -->
                <a-cylinder
                    position="{`${fretCount / 2} ${scaleTime(time)} -6`}"
                    radius="0.02"
                    height="26"
                    rotation="0 0 90"
                    color="#ccc"
                ></a-cylinder>
                <a-entity
                    text="value: {time.toFixed()}s; color: #666"
                    position="{`2.5 ${scaleTime(time)} -6 `}"
                    scale="10 10 10"
                ></a-entity>
            {/each}
            <!-- notes -->
            {#each lastNotes as note}
                <a-box
                    position="{`${note.fret - 0.3} ${scaleTime(note.time)} ${note.string - 5}`}"
                    color="{stringColors[stringCount - note.string - 1]}"
                    opacity="{note.velocity / 127}"
                    width="0.3"
                    height="0.3"
                    depth="0.3"
                >
                    <a-entity
                        text="value: {note.note}\n{note.fret}; color: #666"
                        position="2.35 0 0.25"
                        scale="5 5 5"
                        opacity="{note.velocity / 127}"
                    ></a-entity>
                </a-box>
            {/each}
            <!-- heatmap -->
            {#each binnedNotes as [stringPos, stringNotes]}
                {#each stringNotes as [fretPos, notes]}
                    <a-box
                        position="{`${fretPos - 0.3} 0 ${stringPos - 5}`}"
                        color="{stringColors[stringCount - stringPos - 1]}"
                        width="0.4"
                        height="0.1"
                        depth="0.4"
                        opacity="{opacityMap(notes.length)}"
                    ></a-box>
                {/each}
            {/each}
        </a-box>
    </a-scene>
    <MidiInput {noteOn} />
</main>
