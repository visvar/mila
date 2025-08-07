<script>
    import HelpTextDrawer from '../common/help-text-drawer.svelte';

    import saveAs from 'file-saver';
    import {
        localStorageDeleteAllRecordings,
        localStorageReport,
    } from '../lib/localstorage';
    const localStorageRep = localStorageReport();
    let fileInput;
    /**
     * import previously exported JSON file
     * @param {InputEvent} e file input event
     */
    const importData = async (e) => {
        if (
            confirm(
                'Import and overwrite current usage statistics? Cannot be undone. Export current usage first!',
            )
        ) {
            const text = await e.target.files[0].text();
            localStorage.setItem('usage', text);
        }
    };
</script>

<main>
    <h2>Help</h2>

    <HelpTextDrawer heading="What is this website?">
        <p>
            This website contains a collection of small apps for learning
            musical instruments. They are each tailored to specific musical
            skills and sometimes also specific kind of musical data or
            instrument.
        </p>
    </HelpTextDrawer>

    <HelpTextDrawer heading="What do I need to use the apps?">
        <p>
            Many apps require a MIDI instrument, such as a keyboard or
            electronic drum kit. Other MIDI instruments will work too, just try
            it! A few apps work with audio and should therefore supported any
            (pitched) instrument and singing. Some apps can also be used with a
            PC keyboard (spacebar if not explained otherwise) or a touch screen.
        </p>

        <h4>What if I only have a MIDI keyboard without sound/synthesizer?</h4>
        <p>
            You can use a built-in synth that needs to be turned on with a
            toggle below each app. If you want better or different sounds, you
            can also open a web synth in another tab! For example,
            <a
                href="https://midi.city/"
                target="_blank"
                referrerpolicy="no-referrer">midi.city</a
            >.
        </p>

        <h4>What if I have a guitar (or another non-MIDI instrument)?</h4>
        <p>
            Many apps work with any instrument as long as you can convert the
            played notes to MIDI. This can be done through hardware MIDI
            converters or a software like
            <a
                href="https://www.jamorigin.com/"
                target="_blank"
                referrerpolicy="no-referrer">MIDI Guitar</a
            >. To make the output of MIDI software visible to the webbrowser,
            you might need to use a MIDI loopback like
            <a
                href="https://www.tobias-erichsen.de/software/loopmidi.html"
                target="_blank"
                referrerpolicy="no-referrer">loopMIDI</a
            >. The most tricky apps to use are the fretboard apps. They require
            are MIDI guitar or a guitar with an added MIDI pickup that outpits
            notes on a different channel for each string.
        </p>
    </HelpTextDrawer>

    <HelpTextDrawer heading="How do I use this website?">
        <p>
            <b>App Menu (☰).</b>
            The app menu lists all apps with a short description and icons that indicate
            the supported instruments. You can filter and sort apps by different
            aspects with the sidebar on the left. Apps that you never used before
            are marked with a ✨.
        </p>

        <p>
            <b>Tools (🛠️).</b>
            The tools page contains smaller, but sometimes helpful tools. For example,
            you can see which MIDI messages your instrument sends.
        </p>

        <p>
            <b>Settings (⚙️).</b>
            Global settings that apply to multiple (but not all) apps. Here you can
            export and delete all locally stored data.
        </p>

        <p>
            <b>Data and Saving.</b>
            You can export and import a take in most apps. Whenever you leave an
            app, reset, or load from the history, your current take will be auto-saved
            and added to the history. Use the history button too see the modal with
            the auto-saved takes where you can load or delete them.
            <i>
                No data is sent anywhere, it all is saved in your browser. You
                can export or reset it in the settings.
            </i>
            <span class="warning">Warning:</span> Auto-save only works when you reset
            or exit the app by returning to the home screen. If you refresh the page
            or close the tab while in an app, its current data will be lost.
        </p>

        <p>
            <b>Importing.</b>
            Import a recorded take from a file through the import button or by dragging
            and dropping a file on the app (a blue background indicates that you
            can drop it).
        </p>
    </HelpTextDrawer>

    <HelpTextDrawer heading="Keyboard Shortcuts">
        <h4>General</h4>
        <ul>
            <li>
                <code>CTRL</code>+<code>F</code> focuses the search bar in the app
                menu
            </li>
            <li>
                <code>CTRL</code>+<code>+</code> and <code>CTRL</code>+<code
                    >-</code
                > zooms in and out
            </li>
            <li>
                <code>F11</code> toggles fullscreen.
            </li>
        </ul>

        <h4>App</h4>
        <ul>
            <li>
                <code>m</code> toggles the metronome
            </li>
            <li>
                <code>r</code> resets the played data
            </li>
            <li>
                (history modal) <code>Escape</code> closes the modal
            </li>
            <li>
                (some apps) <code>CTRL</code>+<code>Z</code> un-does the last note
            </li>
            <li>
                (some apps) <code>CTRL</code>+<code>Y</code> re-does the last undone
                note
            </li>
        </ul>

        <h4>Input Elements</h4>
        <p>
            Inputs such as number inputs and dropdowns allow you to scroll to
            change values. Some can be reset with a middle click.
        </p>
    </HelpTextDrawer>

    <HelpTextDrawer heading="Troubleshooting">
        <h4>MIDI</h4>
        <p>
            If MIDI input does not work, make sure that the device is connected
            and works. The browser can also see MIDI devices that are <i
                >not in use in other software</i
            >, such as other browsers that you have opened this website in. Some
            MIDI software requires a MIDI loopback that simulates a hardware
            MIDI device. We recommend
            <a
                href="https://www.tobias-erichsen.de/software/loopmidi.html"
                target="_blank"
                referrerpolicy="no-referrer"
            >
                loopMIDI
            </a> for Windows.
        </p>

        <h4>I still have issues!</h4>
        <p>
            Please create a GitHub issue <a
                href="https://github.com/visvar/mila/issues"
                target="_blank"
                referrerpolicy="no-referrer"
            >
                here</a
            >.
        </p>
    </HelpTextDrawer>

    <HelpTextDrawer heading="Data Import/Export">
        <h3>Usage Data</h3>
        <p class="explanation">
            The website tracks usage data locally in your browser, but does not
            send it anywhere. You can import, export, or reset this data here.
            <br />
            <b>
                Data currently uses {localStorageRep.percentFull.toFixed(1)}% of
                the available space.
            </b>
        </p>
        <button
            title="Export usage statistics"
            on:click="{() => {
                const usage = localStorage.getItem('usage');
                const blob = new Blob([usage], {
                    type: 'text/plain;charset=utf-8',
                });
                saveAs(blob, 'usage.json');
            }}"
        >
            export usage
        </button>
        <button
            title="Import all data and settings"
            on:click="{() => fileInput.click()}"
        >
            import usage
        </button>
        <input
            bind:this="{fileInput}"
            type="file"
            on:input="{importData}"
            id="file-input"
            style="display: none"
        />
        <button
            title="Reset usage statistics"
            on:click="{() => {
                if (
                    confirm(
                        'Please only do this after exporting usage data! Do you really want to delete now?',
                    )
                ) {
                    localStorage.removeItem('usage');
                }
            }}"
        >
            delete usage
        </button>
        <button
            title="Reset usage statistics"
            on:click="{() => {
                if (
                    confirm(
                        'Please only do this after exporting usage data! Do you really want to delete now?',
                    )
                ) {
                    localStorageDeleteAllRecordings();
                }
            }}"
        >
            delete only recordings
        </button>
    </HelpTextDrawer>
</main>

<style>
    p {
        width: 500px;
        margin: 0 auto;
        text-align: justify;
    }

    ul {
        margin: auto;
        width: max-content;
        text-align: left;
    }

    ul li {
        margin-bottom: 2px;
    }
</style>
