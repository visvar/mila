<script>
    import { NOTE_COLORS } from '../lib/colors';
    import { Midi, Utils } from 'musicvis-lib';
    import * as d3 from 'd3';

    export let toolInfo;
    const colorSchemes = [];
    for (const key in NOTE_COLORS) {
        if (NOTE_COLORS.hasOwnProperty(key)) {
            colorSchemes.push({
                name: key,
                colors: NOTE_COLORS[key].map((d) => d3.color(d).formatHex()),
            });
        }
    }
</script>

<main class="app">
    <h2>{toolInfo.title}</h2>
    <p class="explanation">
        See <a
            href="https://github.com/fheyen/musicvis-lib/blob/905edbdc8280e8ca76a329ffc83a160f3cda674a/src/utils/NoteColorUtils.js"
            target="_blank">here</a
        >
        for literature references and color string arrays. Most schemes are found
        in:
        <i
            >Schmidt, Kathryn L. (2019) Meaningful Music Visualizations. Purdue
            University Graduate School. <a
                href="https://doi.org/10.25394/PGS.7498700.v1"
                target="_blank">DOI</a
            >
            (page 13)</i
        >
    </p>
    <div class="visualization">
        <table>
            <thead>
                <th>name</th>
                {#each Midi.NOTE_NAMES as note}
                    <th>{note}</th>
                {/each}
            </thead>
            <tbody>
                {#each colorSchemes as scheme}
                    <tr>
                        <td>{scheme.name} </td>
                        {#each scheme.colors as color, i}
                            <td
                                title="{Midi.NOTE_NAMES[i]}"
                                style="
                                background-color: {color}; color: {Utils.getColorLightness(
                                    color,
                                ) > 50
                                    ? 'black'
                                    : 'white'};
                                font-size: 12px"
                                >{color}
                            </td>
                        {/each}
                    </tr>
                {/each}
            </tbody>
        </table>
    </div>
</main>

<style>
    table td {
        padding: 7px;
        border: 2px solid white;
        border-radius: 6px;
    }

    table tr:nth-child(even) {
        background-color: #e8e8e8;
    }
</style>
