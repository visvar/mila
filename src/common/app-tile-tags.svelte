<script>
    import {
        drumIcon,
        guitarIcon,
        microphoneIcon2,
        pcKeyIcon,
        pianoIcon,
        touchIcon,
    } from '../lib/icons';

    export let app;
</script>

<div class="tags">
    <!-- input -->
    <span class="data-type">
        {#if app.input === 'audio'}
            <span title="works with audio">audio</span>
        {/if}
        {#if app.input === 'MIDI'}
            <span title="requires a MIDI instrument">MIDI</span>
        {/if}
    </span>
    <!-- instruments -->
    {#if app.instruments.includes('guitar/bass')}
        <span title="works with guitar/bass">{guitarIcon}</span>
    {/if}
    {#if app.instruments.includes('drum')}
        <span title="works with drum">{drumIcon}</span>
    {/if}
    {#if app.instruments.includes('keyboard')}
        <span title="works with keyboard">{pianoIcon}</span>
    {/if}
    <!-- {#if app.instruments.includes('wind')}
        <span title="works with wind instruments">🪈</span>
    {/if} -->
    {#if app.instruments.includes('singing')}
        <span title="works with singing">{microphoneIcon2}</span>
    {/if}
    <!-- {#if app.instruments.includes('strings')}
        <span title="works with string instruments">🎻</span>
    {/if} -->
    <!-- alternative inputs -->
    {#if app.instruments.includes('pc-key')}
        <span title="you can use PC keyboard if you don't have an instrument">
            {pcKeyIcon}
        </span>
    {/if}
    {#if app.instruments.includes('touch')}
        <span title="you can use touch screen if you don't have an instrument">
            {touchIcon}
        </span>
    {/if}
</div>

<style>
    .tags span {
        /* make colors pop less */
        filter: saturate(0.75);
    }
    .tags span:hover {
        filter: saturate(1);
    }

    .data-type {
        font-size: small;
    }
</style>
