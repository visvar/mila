<script>
    import { onDestroy } from 'svelte';
    import Metronome from '../lib/Metronome.js';
    import PcKeyboardInput from './pc-keyboard-input.svelte';
    import { metronomeIcon } from '../lib/icons.js';

    export let tempo = 120;
    export let accent = 4;
    export let beepCount = 0;
    export let showBeepCountInput = false;

    const metro = new Metronome();
    let button;

    const toggle = () => {
        metro.toggle(tempo, accent, beepCount > 0 ? beepCount : Infinity);
        // animate button to show toggle
        button.style = 'background: var(--accent)';
        setTimeout(() => (button.style = ''), 500);
    };

    onDestroy(() => {
        // turn off metronome
        metro.stop();
    });
</script>

<main>
    <button
        bind:this="{button}"
        title="Toggle metronome (shortcut: m)"
        on:click="{toggle}"
        style="{showBeepCountInput ? 'border-radius: 8px 0 0 8px;' : ''}"
    >
        {metronomeIcon} metronome
    </button>
    {#if showBeepCountInput}
        <input
            title="The number of beeps for count-in, set to 0 for infinite beeps"
            type="number"
            step="1"
            min="0"
            bind:value="{beepCount}"
            on:mousewheel="{(evt) => {
                evt.preventDefault();
                const add = evt.deltaY < 0 ? 1 : -1;
                const clamped = Math.max(0, beepCount + add);
                // round to step
                beepCount = +clamped.toFixed();
            }}"
        />
    {/if}
</main>
<PcKeyboardInput key="m" keyDown="{toggle}" />

<style>
    main {
        display: inline-block;
    }

    button {
        transition: all 250ms;
    }

    input {
        width: 34px;
        margin-left: -10px;
        border-radius: 0 8px 8px 0;
    }
</style>
