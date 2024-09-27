<script>
    import { pencilIcon, saveIcon } from '../lib/icons';
    import { localStorageUpdateRecording } from '../lib/localstorage';

    export let appId;
    export let recording;
    export let loadRecordings = () => {};

    let shown = false;
    let annotation = recording.annotation ?? '';

    const doNothing = (evt) => {
        evt.stopPropagation();
    };
</script>

<main>
    <button
        on:click="{() => {
            shown = !shown;
            if (!shown) {
                // save annotation if not empty (if it was non-empty before, still save)
                const text = annotation.trim();
                if (text.length > 0 || recording.annotation.length > 0) {
                    recording.annotation = text;
                    localStorageUpdateRecording(appId, recording);
                    loadRecordings();
                }
            }
        }}"
    >
        {!shown ? pencilIcon : saveIcon}
    </button>
    {#if shown}
        <textarea
            bind:value="{annotation}"
            on:keydown="{doNothing}"
            on:keyup="{doNothing}"
            on:keypress="{doNothing}"
        ></textarea>
    {/if}
</main>

<style>
    textarea {
        position: absolute;
        background: white;
        border: none;
        border-radius: 8px;
    }
</style>
