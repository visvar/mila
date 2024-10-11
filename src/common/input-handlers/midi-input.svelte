<script>
    /**
     * This component handles MIDI input and takes care of setting up and destroying event listeners
     */
    import { onDestroy, onMount } from 'svelte';
    import { WebMidi } from 'webmidi';

    export let midiMessage = null;
    export let noteOn = null;
    export let noteOff = null;
    export let controlChange = null;
    export let pitchBend = null;

    export let errorCallback = (err) => console.error(err);

    // allow access to MIDI device list
    export let midiDevices = [];

    const onMidiEnabled = () => {
        midiDevices = [];
        if (WebMidi.inputs.length < 1) {
            console.warn('No MIDI device detected');
        } else {
            WebMidi.inputs.forEach((device, index) => {
                console.log(`MIDI device ${index}: ${device.name}`);
                if (midiMessage) {
                    device.addListener('midimessage', midiMessage);
                }
                if (noteOn) {
                    device.addListener('noteon', noteOn);
                }
                if (noteOff) {
                    device.addListener('noteoff', noteOff);
                }
                if (controlChange) {
                    device.addListener('controlchange', controlChange);
                }
                if (pitchBend) {
                    device.addListener('pitchbend', pitchBend);
                }
            });
            midiDevices = [...WebMidi.inputs];
        }
    };

    onMount(() => {
        WebMidi.enable().then(onMidiEnabled).catch(errorCallback);
    });

    onDestroy(() => {
        // remove MIDI listeners to avoid duplicate calls and improve performance
        for (const input of WebMidi.inputs) {
            input.removeListener();
        }
    });
</script>
