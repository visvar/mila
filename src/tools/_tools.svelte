<script>
    import ChordDetection from './chord-detection.svelte';
    import GuitarTab from './guitar-tab.svelte';
    import GuitarTunings from './guitar-tunings.svelte';
    import MidiLogger from './midi-logger.svelte';
    import NoteColors from './note-colors.svelte';
    import PianoRoll from './piano-roll.svelte';
    import PitchDetection from './tuner.svelte';
    import ScaleSets from './scale-sets.svelte';
    import ScaleNotes from './scale-notes.svelte';
    import ActivityTracker from './activity-tracker.svelte';
    import MidiNotes from './midi-notes.svelte';
    import { getUrlParam, setUrlParam } from '../lib/url';
    import { onDestroy } from 'svelte';

    let TOOLS = [
        {
            id: 'activity-tracker',
            title: 'Activity Tracker',
            description: 'Shows your activity on this website.',
            component: ActivityTracker,
        },
        {
            id: 'midi-logger',
            title: 'MIDI Logger',
            description:
                'Logs all incoming MIDI messages. Useful for getting to know a device or debugging MIDI issues.',
            component: MidiLogger,
        },
        {
            id: 'midi-notes',
            title: 'MIDI Notes',
            description: 'Information on the MIDI standard note numbers.',
            component: MidiNotes,
        },
        {
            id: 'piano-roll',
            title: 'Piano Roll',
            description: 'Shows MIDI input as a piano roll.',
            component: PianoRoll,
        },
        {
            id: 'guitar-tab',
            title: 'Guitar Tab',
            description: 'Shows MIDI input as guitar tab.',
            component: GuitarTab,
        },
        {
            id: 'guitar-tunings',
            title: 'Guitar Tunings',
            description:
                'Small tool that computes the notes for a guitar tuning based on parameters. Open tunings are not included.',
            component: GuitarTunings,
        },
        {
            id: 'chord-detection',
            title: 'Chord Detection',
            description: "Play a chord and see what it's named.",
            component: ChordDetection,
        },
        {
            id: 'note-colors',
            title: 'Note Colors',
            description: 'Different note color schemes.',
            component: NoteColors,
        },
        {
            id: 'scale-sets',
            title: 'Scale Sets',
            description:
                'See how different musical scales relate to each other.',
            component: ScaleSets,
        },
        {
            id: 'scale-notes',
            title: 'Scale Notes',
            description: 'See which notes are in each scale.',
            component: ScaleNotes,
        },
        {
            id: 'tuner',
            title: 'Tuner',
            description:
                'Tries to detect the currently most prominent pitch from microphone audio. Useful for tuning instruments.',
            component: PitchDetection,
        },
    ];

    export let currentTool = null;
    export let rows;

    const param = getUrlParam(window, 'tool');
    if (param && param !== '') {
        currentTool = TOOLS.filter((d) => d.id === param)[0];
    }

    onDestroy(() => {
        setUrlParam(window, 'tool', undefined);
    });
</script>

<main>
    {#if !currentTool}
        <div class="grid {rows ? 'rows' : ''}">
            {#each TOOLS as tool}
                <!-- svelte-ignore a11y-click-events-have-key-events -->
                <!-- svelte-ignore a11y-no-static-element-interactions -->
                <div
                    class="card"
                    on:click="{() => {
                        currentTool = tool;
                        setUrlParam(window, 'tool', tool.id);
                    }}"
                >
                    <h2>{tool.title}</h2>
                    <div class="description">
                        {tool.description}
                    </div>
                </div>
            {/each}
        </div>
    {:else}
        <div>
            <button
                on:click="{() => {
                    currentTool = null;
                    setUrlParam(window, 'tool', undefined);
                }}"
            >
                back to tools
            </button>
        </div>
        <div>
            <svelte:component
                this="{currentTool.component}"
                toolInfo="{currentTool}"
            />
        </div>
    {/if}
</main>
