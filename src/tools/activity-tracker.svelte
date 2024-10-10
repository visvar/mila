<script>
    import * as Plot from '@observablehq/plot';
    import * as d3 from 'd3';
    import { localStorageGetUsageData } from '../lib/localstorage';
    import { onMount } from 'svelte';
    import { starIcon } from '../lib/icons';
    import { COLORS } from '../lib/colors';

    /**
     * TODO: show number of played notes
     */

    export let toolInfo;
    let width = 900;
    let height = 500;
    let container;
    const usage = localStorageGetUsageData();

    let appUsage = [];
    let daysUsed = new Set();
    for (const key in usage.appClicks) {
        if (Object.hasOwnProperty.call(usage.appClicks, key)) {
            if (key !== 'undefined') {
                const dates = usage.appClicks[key];
                appUsage.push({
                    id: key,
                    dates: dates.map((d) => new Date(d.substring(0, 10))),
                    useCount: dates.length,
                    // only use day
                    // dates: element.map((d) => new Date(d.slice(0, 10))),
                });
                // keep track of days any app was used
                for (const date of dates) {
                    daysUsed.add(date.substring(0, 10));
                }
            }
        }
    }
    // TODO: also show unused apps?
    appUsage = appUsage.sort((a, b) => b.useCount - a.useCount);

    const dotData = appUsage.flatMap((app) =>
        app.dates.map((d) => {
            return { app: app.id, date: d };
        }),
    );

    let appRatings = [];
    let appRatingsDetail = [];
    for (const key in usage.ratings) {
        if (Object.hasOwnProperty.call(usage.ratings, key)) {
            if (key !== 'undefined') {
                const element = usage.ratings[key];
                appRatings.push({
                    id: key,
                    meanRating: d3.mean(element, (d) => d.value),
                });
                appRatingsDetail.push({
                    id: key,
                    subRating: ' mean over all',
                    value: d3.mean(element, (d) => d.value),
                });
                for (const rating of element) {
                    appRatingsDetail.push({
                        id: key,
                        subRating: rating.id,
                        value: rating.value,
                    });
                }
            }
        }
    }
    // TODO: also show unrated apps?
    appRatings = appRatings.sort((a, b) => b.meanRating - a.meanRating);

    /**
     * Draw visualization
     */
    const draw = () => {
        container.textContent = '';
        // usage count plot
        const usageCountPlot = Plot.plot({
            title: 'Usage Count',
            width,
            marginLeft: 200,
            marginRight: 60,
            x: {
                label: 'times used',
            },
            y: {
                label: 'app',
                grid: true,
                domain: appUsage.map((d) => d.id),
            },
            marks: [
                Plot.waffleX(appUsage, {
                    x: 'useCount',
                    y: 'id',
                    tip: true,
                    rx: 4,
                    fill: (d) => COLORS.accent,
                }),
                Plot.text(appUsage, {
                    x: 'useCount',
                    y: 'id',
                    text: 'useCount',
                    textAnchor: 'start',
                    dx: 7,
                    paintOrder: 'stroke',
                    fill: '#333',
                    stroke: 'white',
                    strokeWidth: 10,
                }),
            ],
        });
        container.appendChild(usageCountPlot);
        // calendar
        //   let daysUsed2 = new Set([...daysUsed].map((d) => new Date(d)));
        // console.log(daysUsed2);
        // const [minDay, maxDay] = d3.extent(daysUsed)
        // const allDays = []

        // const calendarPlot = Plot.plot({
        //     padding: 0,
        //     x: { axis: null },
        //     y: { tickFormat: Plot.formatWeekday('en', 'narrow'), tickSize: 0 },
        //     fy: {
        //         // data: daysUsed,
        //         tickFormat: '',
        //     },
        //     marks: [
        //         Plot.cell(daysUsed2, {
        //             x: (d) => d3.utcWeek.count(d3.utcYear(d), d),
        //             y: (d) => d.getUTCDay(),
        //             fy: (d) => d.getUTCFullYear(),
        //             fill: '#ccc',
        //             title: (d, i) => d,
        //             inset: 0.5,
        //         }),
        //     ],
        // });
        // container.appendChild(calendarPlot);
        // usage dates plot
        const plot2 = Plot.plot({
            title: 'Usage Dates',
            width,
            height,
            marginLeft: 200,
            x: {
                label: 'time of usage',
            },
            y: {
                grid: true,
                domain: appUsage.map((d) => d.id),
            },
            marks: [
                Plot.dot(dotData, {
                    x: 'date',
                    y: 'app',
                    tip: true,
                }),
            ],
        });
        container.appendChild(plot2);
        // app rating plot
        const plot3 = Plot.plot({
            title: 'App Ratings',
            width,
            marginLeft: 200,
            marginRight: 40,
            x: {
                label: 'mean of partial ratings',
                domain: [0, 5],
            },
            y: {
                label: 'app',
                grid: true,
                domain: appRatings.map((d) => d.id),
            },
            marks: [
                Plot.waffleX(appRatings, {
                    x: 'meanRating',
                    y: 'id',
                    tip: true,
                    rx: 8,
                    fill: 'gold',
                }),
                Plot.text(appRatings, {
                    x: 'meanRating',
                    y: 'id',
                    text: (d) => `${d.meanRating.toFixed(1)} ${starIcon}`,
                    textAnchor: 'start',
                    dx: 7,
                    paintOrder: 'stroke',
                    fill: '#333',
                    stroke: 'white',
                    strokeWidth: 10,
                }),
            ],
        });
        container.appendChild(plot3);
        // app sub-rating plot
        const plot4 = Plot.plot({
            title: 'App Sub-Ratings',
            width,
            marginLeft: 200,
            marginRight: 40,
            x: { axis: false, domain: [0, 5] },
            y: {
                label: 'app',
                domain: appRatings.map((d) => d.id),
            },
            facet: {
                data: appRatingsDetail,
                x: 'subRating',
                label: 'sub-rating',
            },
            marks: [
                Plot.waffleX(appRatingsDetail, {
                    x: 5,
                    y: 'id',
                    rx: 6,
                    // fill: '#eee',
                    stroke: '#eee',
                }),
                Plot.waffleX(appRatingsDetail, {
                    x: 'value',
                    y: 'id',
                    tip: true,
                    rx: 6,
                    fill: 'gold',
                }),
            ],
        });
        container.appendChild(plot4);
    };

    onMount(draw);
</script>

<main class="app">
    <h2>{toolInfo.title}</h2>
    <p class="explanation">
        Here, you can see how often and when you used each app. This data is
        only saved locally and can be reset in settings.
    </p>
    <div class="visualization" bind:this="{container}"></div>
</main>
