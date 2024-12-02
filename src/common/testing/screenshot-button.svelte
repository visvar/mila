<script>
    /**
     * allows taking a screenshot consistently
     */
    import html2canvas from 'html2canvas';
    import saveAs from 'file-saver';
    import { APPS } from '../../apps.js';
    import { delay } from '../../lib/lib.js';

    /**
     * @type {string|object}
     */
    export let currentApp;

    const shoot = async (loadExample = false) => {
        try {
            // load example
            if (loadExample) {
                const exampleBtn = [
                    ...document.querySelectorAll('button'),
                ].filter((d) => d.innerText === 'example');
                if (exampleBtn.length > 0) {
                    exampleBtn[0].click();
                }
            }
            // either take the app or the whole document
            const appMain = document.querySelectorAll('.app')[0];
            const targetElement = appMain ?? document.body;
            html2canvas(targetElement).then((canvas) => {
                // save
                canvas.toBlob((blob) => {
                    saveAs(blob, `${currentApp?.id ?? 'shot'}.png`);
                });
            });
        } catch (e) {
            alert(e.message);
        }
    };

    const shootAll = async () => {
        if (!confirm('Are you sure you want to screenshot all apps?')) {
            return;
        }
        for (const app of APPS) {
            if (app.id === 'fretboard-spacetime-cube') {
                continue;
            }

            // select app
            currentApp = app;
            await delay(0.2);
            // load example
            const exampleBtn = [...document.querySelectorAll('button')].filter(
                (d) => d.innerText === 'example',
            );
            if (exampleBtn.length > 0) {
                exampleBtn[0].click();
            }
            // hide title, description, exercise, rating
            [
                document.querySelector('.app > h2'),
                ...document.querySelectorAll('.explanation'),
                ...document.querySelectorAll('.rating-button'),
                ...document.querySelectorAll('.exercise-grid'),
                // hide lower controls?
                [...document.querySelectorAll('.control')].at(-1),
            ].forEach((d) => (d.style = 'display:none'));

            await delay(0.1);
            // either take the app or the whole document
            const appMain = document.querySelectorAll('.app')[0];
            const targetElement = appMain ?? document.body;
            html2canvas(targetElement).then((canvas) => {
                // save
                canvas.toBlob((blob) => {
                    saveAs(blob, `${app.id ?? 'shot'}.png`);
                });
            });
        }
    };
</script>

<div>
    screenshot
    <button on:click="{() => shoot(false)}"> app </button>
    <button on:click="{() => shoot(true)}"> app with example </button>
    <button on:click="{shootAll}"> all apps </button>
</div>
