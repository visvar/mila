<script>
    import { Note } from '@tonaljs/tonal';
    import { onMount } from 'svelte';
    import MidiInput from '../common/input-handlers/midi-input.svelte';

    export let toolInfo;

    // data
    let firstTimeStamp = 0;
    let messages = [];

    const midiMessage = (e) => {
        messages = [e, ...messages];
    };

    onMount(() => {
        firstTimeStamp = performance.now();
    });
</script>

<main class="app">
    <h2>{toolInfo.title}</h2>
    <p class="explanation">
        Input anything on a MIDI device to see the incoming messages below.
    </p>
    <div class="control">
        <button
            title="Clear all messages"
            on:click="{() => {
                messages = [];
            }}"
        >
            reset
        </button>
    </div>
    <div class="visualization">
        <p>{messages.length} messages received</p>
        <table>
            <thead>
                <th>timestamp</th>
                <th>manufacturer</th>
                <th>name</th>
                <th>channel</th>
                <th>command</th>
                <th>data</th>
                <th>note</th>
                <th>velocity</th>
            </thead>
            <tbody>
                <!-- {#each messages as m (m.timestamp)} -->
                {#each messages.slice(0, 100) as m}
                    <tr>
                        <td>{m.timestamp.toFixed(1)}</td>
                        <td>{m.port.manufacturer}</td>
                        <td>{m.port.name}</td>
                        <td>{m.message.channel}</td>
                        <td>{m.message.command} {m.message.type}</td>
                        <td>{m.message.dataBytes}</td>
                        <td>
                            {['noteon', 'noteoff'].includes(m.message.type)
                                ? Note.fromMidiSharps(m.message.dataBytes[0])
                                : ''}
                        </td>
                        <td>
                            {['noteon', 'noteoff'].includes(m.message.type)
                                ? m.message.dataBytes[1]
                                : ''}
                        </td>
                    </tr>
                {/each}
            </tbody>
        </table>
    </div>
    <MidiInput {midiMessage} />
</main>

<style>
    table {
        border-collapse: collapse;
    }

    table td {
        padding: 7px;
        border: 1px solid #eee;
    }

    table tr:nth-child(even) {
        background-color: #e8e8e8;
    }
</style>
