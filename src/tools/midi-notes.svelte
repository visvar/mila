<script>
    import { Midi } from 'musicvis-lib';
    import { drumPitchReplacementMapMD90 } from '../lib/drums';

    export let toolInfo;
</script>

<main class="app">
    <h2>{toolInfo.title}</h2>
    <p class="explanation">Information on MIDI and MIDI drum notes.</p>
    <div class="grid">
        <div>
            <h3>MIDI Notes</h3>
            <table>
                <tbody>
                    <tr>
                        <th>number</th>
                        <th>name</th>
                        <th>octave</th>
                        <th>frequency (Hz)</th>
                    </tr>
                    {#each Midi.MIDI_NOTES as note}
                        <tr>
                            <td>{note.pitch}</td>
                            <td>{note.name}</td>
                            <td>{note.octave}</td>
                            <td>{note.frequency.toFixed(2)}</td>
                        </tr>
                    {/each}
                </tbody>
            </table>
        </div>

        <div>
            <h3>Drum Notes</h3>
            <table>
                <tbody>
                    <tr>
                        <th>number</th>
                        <th>name</th>
                        <th>label</th>
                        <th>MIDI note</th>
                    </tr>
                    {#each [...drumPitchReplacementMapMD90.entries()].map( ([key, value]) => {
                            return { pitch: key, ...value };
                        }, ) as note}
                        <tr>
                            <td>{note.pitch}</td>
                            <td>{note.name}</td>
                            <td>{note.label}</td>
                            <td>{Midi.MIDI_NOTES[note.pitch].label}</td>
                        </tr>
                    {/each}
                </tbody>
            </table>
        </div>
    </div>
</main>

<style>
    div.grid {
        margin: auto;
        width: fit-content;
        display: grid;
        grid-template-columns: repeat(2, max-content);
        gap: 50px;
    }

    table tr:nth-child(odd) {
        background-color: #f8f8f8;
    }

    table th,
    table td {
        padding: 5px 15px;
    }
</style>
