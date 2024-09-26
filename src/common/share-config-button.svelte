<script>
    /**
     * This component allows to copy a link to the clipboard that contains the current settings of the app. It also detects whether such a link has been opened and loads the settings
     */
    import { version } from '../../package.json';
    import * as fflate from 'fflate';
    import { onDestroy, onMount } from 'svelte';
    import { replacer } from '../lib/json';
    import { getUrlParam, setUrlParam } from '../lib/url';

    export let appId;
    export let getExportData;
    export let loadData;

    // const lengthLimit = 2000  for older browsers
    const lengthLimit = 8_000;

    let button;

    const getLink = (data) => {
        const json = JSON.stringify(data, replacer, 0);
        console.log('json length', json.length);
        // zip
        const buf = fflate.strToU8(json);
        const compressed = fflate.compressSync(buf, { level: 9, mem: 6 });
        const serialized = compressed.toString();
        console.log('zip length', serialized.length);
        // URL encoding
        const encoded = encodeURI(serialized);
        const link = `${location.href.replace('&json=', '')}&json=${encoded}`;
        return link;
    };

    const exportData = () => {
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
                const deserialized = new Uint8Array(
                    decoded.split(',').map((d) => +d),
                );
                const decompressed = fflate.decompressSync(deserialized);
                const origText = fflate.strFromU8(decompressed);
                const json = JSON.parse(origText);
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

<button
    title="Get a link that contains the current configuration. It will also contain recorded data if it fits into the link"
    on:click="{exportData}"
    bind:this="{button}"
>
    share
</button>

<style>
    button {
        width: 95px;
    }
</style>
