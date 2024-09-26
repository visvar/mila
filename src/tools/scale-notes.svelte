<script>
    import { Chord, Scale } from '@tonaljs/tonal';
    import { Midi } from 'musicvis-lib';
    import * as d3 from 'd3';
    import { onMount } from 'svelte';
    import { NOTE_COLORS } from '../lib/colors';
    import { toggleOffIcon, toggleOnIcon } from '../lib/icons';
    import { downloadJsonFile } from '../lib/json';

    export let toolInfo;
    const w = 400;
    const h = 1200;
    let container;
    let canvas;
    // settings
    let root = 'C';
    let ordering = 'default';
    let useColors = true;
    // domain knowledge
    const noteNames = Midi.NOTE_NAMES;
    const scaleNames = Scale.names();
    // data
    $: allScales = scaleNames
        .map((d) => Scale.get(`${root} ${d}`))
        .filter((d) => !d.empty)
        .map((d) => {
            d.notes = d.notes.map((note) => Midi.flatToSharp.get(note) ?? note);
            return d;
        });

    const sort = (ordering, allScales) => {
        if (ordering === 'default') {
            return [...allScales];
        }
        if (ordering === 'name') {
            return [...allScales].sort((a, b) => (a.name < b.name ? -1 : 1));
        }
        if (ordering === 'notes') {
            return [...allScales].sort((a, b) =>
                a.notes.join(' ') < b.notes.join(' ') ? -1 : 1,
            );
        }
        if (ordering === 'number of notes') {
            return [...allScales].sort((a, b) =>
                a.notes.length > b.notes.length ? -1 : 1,
            );
        }
    };

    $: allScalesSorted = sort(ordering, allScales);
    $: if (allScalesSorted) {
        draw();
    }

    const draw = () => {
        if (!canvas) {
            return;
        }
        const ctx = canvas.getContext('2d');
        // scale to DPR
        // Get the DPR and size of the canvas
        const dpr = window.devicePixelRatio;
        const rect = canvas.getBoundingClientRect();
        // Set the "actual" size of the canvas
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        // Scale the ctx to ensure correct drawing operations
        ctx.scale(dpr, dpr);
        // Set the "drawn" size of the canvas
        canvas.style.width = `${rect.width}px`;
        canvas.style.height = `${rect.height}px`;
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, w, h);

        const labelWidth = 130;
        const sWidth = (w - labelWidth) / 12;
        const sWidthInner = sWidth * 0.9;
        const sHeight = (h - 30) / allScales.length;
        const sHeightInner = sHeight * 0.9;

        // Draw notes
        ctx.textAlign = 'center';
        ctx.fillStyle = 'black';
        for (const [index, note] of noteNames.entries()) {
            const x = labelWidth + (index + 0.5) * sWidth;
            ctx.fillText(note, x, 10);
            ctx.fillText(note, x, h - 3);
        }

        const noteNameToIndexMap = new Map(noteNames.map((d, i) => [d, i]));

        // Draw scales
        for (const [index, scale] of allScalesSorted.entries()) {
            const y = 15 + index * sHeight;
            // Scale name
            ctx.fillStyle = 'black';
            ctx.textAlign = 'right';
            ctx.fillText(scale.type, labelWidth - 5, y + sHeight - 2.5);
            // Note blocks
            ctx.fillStyle = '#666';
            for (const note of scale.notes) {
                const chIndex = noteNameToIndexMap.get(note);
                if (useColors) {
                    ctx.fillStyle = NOTE_COLORS.noteColormap[chIndex];
                } else {
                    ctx.fillStyle = note === root ? '#777' : '#bbb';
                }
                const x = labelWidth + chIndex * sWidth + sWidth * 0.05;
                ctx.fillRect(x, y, sWidthInner, sHeightInner);
                // Note names
                ctx.fillStyle = 'white';
                ctx.textAlign = 'center';
                const nx = labelWidth + (chIndex + 0.5) * sWidth;
                ctx.fillText(note, nx, y + sHeight - 3.5);
            }
        }
    };

    onMount(draw);
</script>

<main class="app">
    <h2>{toolInfo.title}</h2>
    <p class="explanation">
        Select a root note and see all scales with this root and their notes.
        Using <a
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
        </label>
        <label>
            ordering
            <select bind:value="{ordering}">
                {#each ['default', 'name', 'notes', 'number of notes'] as d}
                    <option value="{d}">{d}</option>
                {/each}
            </select>
        </label>
        <button
            title="Use dotted notes? If not, the closest non-dotted note will be taken."
            on:click="{() => {
                useColors = !useColors;
                draw();
            }}"
        >
            colors {useColors ? toggleOnIcon : toggleOffIcon}
        </button>
    </div>
    <div class="visualization" bind:this="{container}">
        <canvas bind:this="{canvas}" style="width: {w}px; height: {h}px"
        ></canvas>
    </div>
    <button
        on:click="{() => {
            let scales = [];
            for (const root of noteNames) {
                const allScales = scaleNames
                    .map((d) => Scale.get(`${root} ${d}`))
                    .filter((d) => !d.empty)
                    .map((d) => {
                        d.notes = d.notes.map(
                            (note) => Midi.flatToSharp.get(note) ?? note,
                        );
                        return d;
                    });
                scales = scales.concat(allScales);
            }
            const data = scales.map((d) => {
                return {
                    tonic: d.tonic,
                    type: d.type,
                    chroma: d.chroma,
                    notes: d.notes,
                };
            });
            downloadJsonFile('musical-scales', data);
        }}">export JSON</button
    >
</main>
