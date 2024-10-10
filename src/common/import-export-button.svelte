<script>
    import { parseJsonFile } from '../lib/json';
    import { downloadJsonFile } from '../lib/json';

    export let appId;
    export let loadData;
    export let getExportData;

    let fileInput;

    /**
     * import previously exported JSON file
     * @param {InputEvent} e file input event
     */
    const importData = async (e) => {
        const file = e.target.files[0];
        const json = await parseJsonFile(file);
        loadData(json);
    };

    /**
     * import data to a JSON file
     */
    const exportData = () => {
        const data = getExportData();
        downloadJsonFile(appId, data);
    };
</script>

<button
    title="Export all data and settings"
    on:click="{exportData}"
    class="left"
>
    export
</button>
<button
    title="Import all data and settings"
    on:click="{() => fileInput.click()}"
    class="right"
>
    import
</button>
<input
    bind:this="{fileInput}"
    type="file"
    on:input="{importData}"
    id="file-input"
    style="display: none"
/>

<style>
    button.left {
        border-radius: 8px 0 0 8px;
    }

    button.right {
        border-radius: 0 8px 8px 0;
        margin-left: -10px;
    }
</style>
