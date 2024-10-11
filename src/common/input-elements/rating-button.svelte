<script>
    import { onMount } from 'svelte';
    import * as d3 from 'd3';
    import { starIcon } from '../../lib/icons.js';
    import {
        localStorageGetUsageData,
        localStorageSetUsageData,
    } from '../../lib/localstorage.js';

    export let appId;

    let shown = false;
    let rating;

    const defaultRating = [
        {
            id: 'makesSense',
            label: 'What this app tries to do makes sense to me',
            value: 0,
        },
        {
            id: 'good',
            label: 'This app is good at what is does',
            value: 0,
        },
        {
            id: 'useful',
            label: 'This app is useful for me personally',
            value: 0,
        },
        {
            id: 'usable',
            label: 'This app is easy to use',
            value: 0,
        },
        {
            id: 'learneable',
            label: 'This app is quick and easy to learn',
            value: 0,
        },
        {
            id: 'fun',
            label: 'The app is fun to use',
            value: 0,
        },
        {
            id: 'useRegular',
            label: 'I would use this app regularly',
            value: 0,
        },
        {
            id: 'useSpecific',
            label: 'I would use this app for specific cases',
            value: 0,
        },
    ];

    const getRating = () => {
        const usage = localStorageGetUsageData();
        if (!usage.ratings) {
            usage.ratings = {};
        }
        if (usage.ratings[appId]) {
            rating = usage.ratings[appId];
        } else {
            rating = structuredClone(defaultRating);
        }
    };

    const updateRating = (id, stars) => {
        rating.filter((d) => d.id === id)[0].value = stars;
        rating = [...rating];
        const usage = localStorageGetUsageData();
        usage.ratings = usage.ratings ?? {};
        usage.ratings[appId] = rating;
        localStorageSetUsageData(usage);
    };

    const resetRating = () => {
        rating = structuredClone(defaultRating);
        const usage = localStorageGetUsageData();
        usage.ratings = usage.ratings ?? {};
        usage.ratings[appId] = rating;
        localStorageSetUsageData(usage);
    };
</script>

<main class="rating-button">
    <button
        on:click="{() => {
            shown = !shown;
            if (shown) {
                getRating();
            }
        }}"
    >
        {starIcon} rate this app
    </button>
    {#if shown}
        <p>
            How much do you agree with these statements? 1 {starIcon}:
            completely disagree, 5 {starIcon}: completely agree
        </p>
        <div class="grid">
            {#if rating}
                {#each rating as r}
                    <div class="label">{r.label}</div>
                    <div>
                        {#each [1, 2, 3, 4, 5] as stars}
                            <button
                                class="star {stars <= r.value ? '' : 'rest'}"
                                on:click="{() => updateRating(r.id, stars)}"
                            >
                                {starIcon}
                            </button>
                        {/each}
                    </div>
                {/each}
                <div class="label">mean:</div>
                <div>
                    {d3.mean(rating, (d) => d.value).toFixed(1)}
                    {starIcon}
                </div>
            {/if}
        </div>
        <button on:click="{resetRating}">reset</button>
    {/if}
</main>

<style>
    .grid {
        margin: 10px auto;
        width: min-content;
        display: grid;
        grid-template-columns: max-content 280px;
        align-items: center;
        gap: 0;
    }

    .label {
        text-align: end;
    }

    button.star {
        margin: 0;
        background: none;
        cursor: pointer;
    }

    .rest {
        opacity: 0.5;
        filter: grayscale();
    }
</style>
