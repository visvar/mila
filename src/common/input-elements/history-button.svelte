<script>
    /**
     * A dropdown that allows loading an auto-saved recording.
     */
    import {
        localSorageGetRecordings,
        localStorageDeleteRecording,
    } from '../../lib/localstorage.js';
    import HistoryButtonAnnotation from './history-button-annotation.svelte';
    import PcKeyboardInput from '../input-handlers/pc-keyboard-input.svelte';

    export let appId;
    export let loadData = (e) => {};

    let recordings = [];
    let modalShown = false;
    let askForDelete = '';

    const loadRecordings = () => {
        recordings = localSorageGetRecordings(appId).reverse();
    };

    const toggleModal = (e) => {
        // e.preventDefault();
        modalShown = !modalShown;
    };
</script>

<button
    title="Load a previously auto-saved take"
    on:click="{() => {
        loadRecordings();
        toggleModal();
    }}"
>
    history
</button>
{#if modalShown}
    <div class="modal">
        <div class="modal-content">
            <div class="heading">
                <h2>Load From History</h2>
                <button
                    title="close (shortcut: Escape)"
                    class="close"
                    on:click="{toggleModal}"
                >
                    &times;
                </button>
            </div>
            <div class="recording">
                <div>date</div>
                <div>notes</div>
                <div>load</div>
                <div>delete</div>
                <div>annotate</div>
            </div>
            {#each recordings as r, i (r.date)}
                <div class="recording">
                    <div>
                        {r.date.substring(0, 16).replace('T', ' ')}
                    </div>
                    <div>
                        {r.data.notes?.length}
                    </div>
                    <button on:click="{(e) => loadData(r.data)}"> load </button>
                    <button
                        class="delete"
                        on:click="{(e) => {
                            e.preventDefault();
                            if (askForDelete === r.date) {
                                askForDelete = '';
                                localStorageDeleteRecording(appId, r.date);
                                loadRecordings();
                            } else {
                                askForDelete = r.date;
                            }
                        }}"
                    >
                        {askForDelete === r.date ? 'confirm' : 'delete'}
                    </button>
                    <HistoryButtonAnnotation
                        {appId}
                        recording="{r}"
                        {loadRecordings}
                    />
                    <div title="{r.annotation}" class="annotation">
                        {r.annotation ? r.annotation.substring(0, 20) : ''}
                    </div>
                </div>
            {/each}
        </div>
    </div>
    <PcKeyboardInput key="Escape" keyDown="{toggleModal}" />
{/if}

<style>
    /* The Modal (background) */
    .modal {
        position: fixed;
        z-index: 1;
        left: 0;
        top: 0;
        width: 100%;
        height: 100%;
        overflow: hidden;
        background-color: rgba(0, 0, 0, 0.4);
        backdrop-filter: blur(1px);
    }

    /* Modal Content/Box */
    .modal-content {
        background-color: #ffffffb7;
        margin: 15% auto;
        padding: 0 20px 10px 20px;
        box-shadow: #616161 0 0 8px;
        border-radius: 8px;
        width: 600px;
        max-height: 70%;
        overflow-y: auto;
    }

    .heading {
        display: grid;
        grid-template-columns: auto min-content;
        padding: 0 0 30px 30px;
    }

    button.close,
    button.close:hover,
    button.close:focus {
        margin-right: -20px;
        padding: 10px 20px;
        background: none;
        font-size: 30px;
        font-weight: bold;
        outline: none;
        border: none;
    }
    button.close:hover {
        color: #888;
    }

    .recording {
        margin-bottom: 2px;
        display: grid;
        grid-template-columns: 140px repeat(4, 90px) auto;
        align-items: center;
        justify-items: center;
        text-align: left;
    }

    .recording button {
        background: #fff8;
    }
    .recording button.delete {
        width: 90px;
    }

    .recording .annotation {
        width: 100%;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }
</style>
