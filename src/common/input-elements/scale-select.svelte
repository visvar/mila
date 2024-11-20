<script>
    import { Scale } from 'tonal';
    import { Midi } from 'musicvis-lib';

    export let scaleRoot = 'C';
    export let scaleType = 'major';
    export let scaleInfo = null;
    export let callback = () => {};
    export let disabled = false;
    /**
     * @type {string[]}
     */
    export let allowedScales = null;

    const noteNames = Midi.NOTE_NAMES_FLAT;
    // TODO: use sharps? but this will break apps and recorded data...
    // const noteNames = Midi.NOTE_NAMES;
    $: scales = allowedScales ?? Scale.names().sort();

    const update = (r, t) => {
        scaleInfo = Scale.get(`${r} ${t}`);
    };

    $: update(scaleRoot, scaleType);

    const scrollRoot = (evt) => {
        evt.preventDefault();
        if (disabled) {
            return;
        }
        let currentIndex = noteNames.indexOf(scaleRoot);
        if (currentIndex === -1) {
            return;
        }
        // scroll up or down?
        let index;
        if (evt.deltaY < 0) {
            index = currentIndex > 0 ? currentIndex - 1 : noteNames.length - 1;
        } else {
            index = currentIndex < noteNames.length - 1 ? currentIndex + 1 : 0;
        }
        scaleRoot = noteNames[index];
        callback();
    };

    const scrollScale = (evt) => {
        evt.preventDefault();
        if (disabled) {
            return;
        }
        let currentIndex = scales.indexOf(scaleType);
        if (currentIndex === -1) {
            return;
        }
        // scroll up or down?
        let index;
        if (evt.deltaY < 0) {
            index = currentIndex > 0 ? currentIndex - 1 : scales.length - 1;
        } else {
            index = currentIndex < scales.length - 1 ? currentIndex + 1 : 0;
        }
        scaleType = scales[index];
        callback();
    };
</script>

<label>
    scale
    <select
        bind:value="{scaleRoot}"
        on:change="{callback}"
        on:wheel="{scrollRoot}"
        class="select1"
        {disabled}
    >
        {#each noteNames as n}
            <option value="{n}">{n}</option>
        {/each}
    </select>
    <select
        bind:value="{scaleType}"
        on:change="{callback}"
        on:wheel="{scrollScale}"
        class="select2"
        {disabled}
    >
        {#each scales as s}
            <option value="{s}">{s}</option>
        {/each}
    </select>
</label>

<style>
    .select1 {
        border-radius: 8px 0 0 8px;
        margin-right: -8px;
    }
    .select2 {
        border-radius: 0 8px 8px 0;
    }
</style>
