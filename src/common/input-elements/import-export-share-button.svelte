<script>
    /**
     * This component allows to import and export data from/to a .json file.
     * It also allows to copy a link to the clipboard that contains the current settings of the app.
     * When mounted (i.e., the app is opened) detects whether such a link has been opened and loads the settings
     */
    import { parseJsonFile } from '../../lib/json';
    import { downloadJsonFile } from '../../lib/json';
    import { version } from '../../../package.json';
    // import * as fflate from 'fflate';
    import { onDestroy, onMount } from 'svelte';
    import { replacer } from '../../lib/json';
    import { getUrlParam, setUrlParam } from '../../lib/url';

    export let appId;
    export let loadData;
    export let getExportData;

    let fileInput;
    // const lengthLimit = 2000  for older browsers
    const lengthLimit = 8_000;
    let button;

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

    const getLink = (data) => {
        const json = JSON.stringify(data, replacer, 0);
        console.log('json length', json.length);
        // zip
        // const buf = fflate.strToU8(json);
        // const compressed = fflate.compressSync(buf, { level: 9, mem: 6 });
        // const serialized = compressed.toString();
        // console.log('zip length', serialized.length);
        // URL encoding
        // const encoded = encodeURI(serialized);
        const encoded = encodeURI(json);
        const link = `${location.href.replace('&json=', '')}&json=${encoded}`;
        return link;
    };

    const shareLink = () => {
        const data = getExportData();
        // add meta data
        data._appId = appId;
        data._softwareVersion = version;
        data._date = new Date().toISOString();
        // get link
        let link = getLink(data);
        if (link.length > lengthLimit) {
            // if link is too long, try to remove recorded notes/bendValues and notify user
            if (data.notes) {
                data.notes = [];
            }
            if (data.bendValues) {
                data.bendValues = [];
            }
            // try again
            link = getLink(data);
            if (link.length > lengthLimit) {
                alert(
                    `Link is too long. Limit: ${lengthLimit}, length: ${link.length}`,
                );
                return;
            } else {
                alert(
                    `Link was too long, so played data was removed and you can only send app settings`,
                );
            }
        }
        navigator.clipboard.writeText(link);
        // visual feedback
        button.style = 'background: lightblue';
        button.innerText = 'copied';
        setTimeout(() => {
            button.style = '';
            // button.innerText = '🔗 share';
            button.innerText = 'share';
        }, 500);
    };

    // when mounted, check if URL contains settings and load them
    onMount(() => {
        const param = getUrlParam(window, 'json');
        if (param && param !== '') {
            try {
                const decoded = decodeURI(param);
                // const deserialized = new Uint8Array(
                //     decoded.split(',').map((d) => +d),
                // );
                // const decompressed = fflate.decompressSync(deserialized);
                // const origText = fflate.strFromU8(decompressed);
                // const json = JSON.parse(origText);
                const json = JSON.parse(decoded);
                loadData(json);
            } catch (e) {
                console.error(`Error: Cannot open shared app settings`);
                console.error(e);
            }
        }
    });

    // when destroyed, clear the current URL, so other apps do not get this data
    onDestroy(() => {
        setUrlParam(window, 'json', '');
    });
</script>

<main>
    <button
        title="Import current app data and settings"
        on:click="{() => fileInput.click()}"
        class="left"
    >
        import
    </button>
    <button
        title="Export current app data and settings"
        on:click="{exportData}"
        class="middle"
    >
        export
    </button>
    <button
        title="Get a link that contains the current app configuration. It will also contain recorded data if it fits into the link"
        on:click="{shareLink}"
        bind:this="{button}"
        class="right"
    >
        share
    </button>
</main>

<!-- invisible file input -->
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

    button.middle {
        border-radius: 0;
        margin-left: -8px;
        margin-right: -8px;
    }

    button.right {
        width: 85px;
        border-radius: 0 8px 8px 0;
    }
</style>
