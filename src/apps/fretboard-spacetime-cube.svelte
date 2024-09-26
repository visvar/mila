<script>
    import { onDestroy, onMount } from 'svelte';
    import * as d3 from 'd3';
    import { Note } from '@tonaljs/tonal';
    import 'aframe';
    import 'aframe-svelte';
    import { Midi } from 'musicvis-lib';
    import { roundToStep } from '../lib/lib';
    import MidiInput from '../common/midi-input.svelte';
    import * as AFRAME from 'aframe';

    /**
     * TODO:
     * - opacity for velocity to hide noise
     * - improve text (anchor, baseline, side, wrappixels)
     *  - https://aframe.io/docs/1.5.0/components/text.html
     * - allow interaction to reset notes and scale time
     *  - https://aframe.io/docs/1.5.0/guides/building-a-basic-scene.html#event-listener-component-intermediate
     *  - support VR controllers?
     *      - https://aframe.io/docs/1.5.0/introduction/interactions-and-controllers.html
     * - support hand tracking?
     *      - https://github.com/aframevr/aframe/blob/master/docs/components/hand-tracking-controls.md
     * - use custom geometry?
     *  - https://aframe.io/docs/1.5.0/components/geometry.html
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
    $: lastNotes = notes.filter((d) => d.time > lastTimeSeconds - pastSeconds);

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
        const noteInSeconds = (e.timestamp - firstTimeStamp) / 1000;
        const string = e.message.channel - 1;
        const fret = e.note.number - tuningPitches[string];
        if (fret < 0) {
            // happens when guitar is out of tune or not tuned to E standard
            return;
        }
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

    /**
     * Allow controlling vis with a MIDI knob
     * @param e MIDI controllchange event
     */
    /**
     * Allow controlling vis with a MIDI knob
     * @param e MIDI controllchange event
     */
    const controlChange = (e) => {
        const c = e.controller.number;
        if (c === 14) {
            // time scaling
            timeFactor = e.value;
        } else if (c === 15) {
            // past seconds
            pastSeconds = e.value * 120;
        }
    };

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
    });
</script>

<main class="app">
    <!-- x is right, y is up, z is toward camera -->
    <a-scene>
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
            position="-1.75 1.85 -1.5"
            scale=".35 .35 .35"
        ></a-entity>
        <a-entity
            text="value: Connect a MIDI guitar and start playing. Notes are positioned based on their string (forward), fret (right), and time (up). They are colored by string and labelled with note name and fret number.\n\nRandom notes are shown until you play.\n\nGo back in your browser to return to the main page.; color: #666; width: 5"
            position="-2 1.5 -1.5"
            scale=".25 .25 .25"
        ></a-entity>
        <!-- text for debugging -->
        <a-entity
            text="value: {debugMsg}; color: #666; width: 5"
            position="-2 1 -1.5"
            scale=".25 .25 .25"
        ></a-entity>
        <!-- visualization container -->
        <a-box
            position="-1 .5 -1"
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
                    opacity="0.5"
                    width="0.4"
                    height="0.4"
                    depth="0.4"
                >
                    <a-entity
                        text="value: {note.note}\n{note.fret}; color: #666"
                        position="2.35 0 0.201"
                        scale="5 5 5"
                    ></a-entity>
                </a-box>
            {/each}
        </a-box>
    </a-scene>
    <MidiInput {noteOn} {controlChange} />
</main>
