<script>
    import { onDestroy } from 'svelte';
    import Metronome from '../../lib/Metronome.js';
    import PcKeyboardInput from '../input-handlers/pc-keyboard-input.svelte';
    import NumberInput from './number-input.svelte';

    export let tempo = 120;
    export let accent = 4;
    export let beepCount = 0;
    export let volume = 1;
    export let showBeepCountInput = false;
    export let showVolumeInput = false;
    export let disabled = false;
    export let isBeeping = false;

    const metro = new Metronome();
    let button;
    let evenBeep = false;

    const toggle = () => {
        metro.toggle(tempo, accent, beepCount > 0 ? beepCount : Infinity);
        isBeeping = metro.isPlaying;
        // animate button to show toggle
        button.style = 'background: var(--accent)';
        setTimeout(() => (button.style = ''), 500);
        evenBeep = !evenBeep;
    };

    onDestroy(() => {
        // turn off metronome
        metro.stop();
        evenBeep = false;
    });

    const indicateBeep = () => {
        evenBeep = !evenBeep;
    };
    metro.onClick(indicateBeep);
    metro.onStop(() => {
        isBeeping = false;
    });

    // if metronome is running while being diabled, stop it
    $: {
        if (disabled) {
            metro.stop();
            isBeeping = false;
        }
    }

    $: metro.setVolume(volume);
</script>

<main>
    <button
        bind:this="{button}"
        title="Toggle metronome (shortcut: m)"
        on:click="{toggle}"
        style="{showBeepCountInput || showVolumeInput
            ? 'border-radius: 8px 0 0 8px;'
            : ''}"
        {disabled}
    >
        <div>
            <svg width="20" height="17">
                <path
                    d="M5,16 L15,16 L10,5 Z"
                    fill="white"
                    stroke="#888"
                    stroke-linejoin="round"
                ></path>
                <line
                    x1="10"
                    y1="13"
                    x2="{evenBeep ? 5 : 15}"
                    y2="2"
                    stroke="black"
                    stroke-width="2"
                    stroke-linecap="round"
                ></line>
            </svg>
        </div>
        <div><span>m</span>etronome</div>
    </button>
    {#if showVolumeInput}
        <NumberInput
            title="Volume, 1 is normal"
            bind:value="{volume}"
            step="{0.1}"
            min="{0}"
            defaultValue="{1}"
            {disabled}
            style="{`width: 34px;
                    margin-left: -23px;
                    border-radius: ${showBeepCountInput ? '0' : '0 8px 8px 0'};`}"
        />
    {/if}
    {#if showBeepCountInput}
        <NumberInput
            title="The number of beeps for count-in, set to 0 for infinite beeps"
            bind:value="{beepCount}"
            step="{1}"
            min="{0}"
            defaultValue="{0}"
            disabled="{disabled || isBeeping}"
            style="{`width: 34px;
                    margin-left: -23px;
                    border-radius: 0 8px 8px 0;`}"
        />
    {/if}
</main>
<PcKeyboardInput key="m" keyDown="{toggle}" {disabled} />

<style>
    main {
        display: inline-block;
    }

    button {
        transition: all 250ms;
        display: inline-flex;
        align-items: center;
        gap: 5px;
    }

    span {
        text-decoration: underline;
    }
</style>
