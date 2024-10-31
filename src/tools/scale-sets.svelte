<script>
    import { Chord, Scale } from 'tonal';
    import { Midi } from 'musicvis-lib';
    import * as d3 from 'd3';

    export let toolInfo;
    let container;
    // settings
    let root = 'A';
    let scale = 'minor';
    // domain knowledge
    const noteNames = Midi.NOTE_NAMES_FLAT;
    const scales = Scale.names().sort();
    // data
    $: currentScale = Scale.get(`${root} ${scale}`);
    $: reducedScales = Scale.reduced(currentScale.name).map((d) =>
        Scale.get(`${root} ${d}`),
    );
    $: extendedScales = Scale.extended(currentScale.name).map((d) =>
        Scale.get(`${root} ${d}`),
    );
    $: chords = Scale.scaleChords(`${root} ${scale}`);
</script>

<main class="app">
    <h2>{toolInfo.title}</h2>
    <p class="explanation">
        Select a root note and scale and see how this scale relates to others.
        This tool is mainly a graphical interface for <a
            href="https://github.com/tonaljs/tonal/tree/main/packages/scale"
            target="_blank"
        >
            tonaljs.
        </a>
    </p>
    <div class="control">
        <label>
            scale
            <select bind:value="{root}">
                {#each noteNames as n}
                    <option value="{n}">{n}</option>
                {/each}
            </select>
            <select bind:value="{scale}">
                {#each scales as s}
                    <option value="{s}">{s}</option>
                {/each}
            </select>
        </label>
    </div>
    <div class="visualization" bind:this="{container}">
        <h2>current scale: {currentScale.name}</h2>

        <h3>notes</h3>
        {currentScale.notes.join(' ')}

        <h3>scales that are subsets</h3>
        {#each reducedScales as reduced}
            <div>
                <button on:click="{() => (scale = reduced.type)}">show</button>
                {reduced.name}:
                {reduced.notes.join(' ')}
                (no {[...d3.difference(currentScale.notes, reduced.notes)].join(
                    ' ',
                )})
            </div>
        {/each}

        <h3>scales that are supersets</h3>
        {#each extendedScales as extended}
            <div>
                <button on:click="{() => (scale = extended.type)}">show</button>
                {extended.name}:
                {extended.notes.join(' ')}
                (adds {[
                    ...d3.difference(extended.notes, currentScale.notes),
                ].join(' ')})
            </div>
        {/each}

        <h3>chords</h3>
        {#each chords as chord}
            <div>
                {root}
                {chord}:
                {Chord.get(`${root} ${chord}`).notes.join(' ')}
            </div>
        {/each}
    </div>
</main>
