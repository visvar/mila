<script>
    import ToggleButton from './common/input-elements/toggle-button.svelte';
    import { updSet } from './lib/lib';
    import * as d3 from 'd3';
    import { SKILL_TREE, SKILL_TREE_LEAFS } from './lib/skills';

    export let finishWelcome;
    export let allInstruments = new Set();
    export let allDifficulties = ['beginner', 'intermediate', 'advanced'];

    let currentQuestionId = 'start';

    let instruments = new Set();
    let skills = new Set();
    let difficulties = new Set();

    const questions = [
        {
            id: 'start',
            text: 'This website contains a colelction of small apps that help you practice you instrument by giving you visual feedback. To make it easier for you to get started, please answer the following few questions, so we can pick appropriate settings for you. You can repeat this process or adapt settings anytime.',
            options: [
                {
                    text: 'sure!',
                    action: () => {
                        currentQuestionId = 'instrument';
                    },
                },
                {
                    text: 'no thanks, take me to the full website now',
                    action: finishWelcome,
                },
            ],
        },
        {
            id: 'instrument',
            text: 'Please select all instruments that you have:',
            selection: [...allInstruments].map((d) => {
                return {
                    text: d,
                    action: () => {
                        instruments = updSet(instruments, d);
                    },
                };
            }),
            options: [
                {
                    text: 'continue',
                    action: () => {
                        currentQuestionId = 'difficulty';
                    },
                },
                {
                    text: 'back',
                    action: () => {
                        currentQuestionId = 'start';
                    },
                },
            ],
        },
        {
            id: 'difficulty',
            text: 'Please select you current levels of experience for which you want to see apps:',
            selection: allDifficulties.map((d) => {
                return {
                    text: d,
                    action: () => {
                        difficulties = updSet(difficulties, d);
                    },
                };
            }),
            options: [
                {
                    text: 'continue',
                    action: () => {
                        currentQuestionId = 'skills';
                    },
                },
                {
                    text: 'back',
                    action: () => {
                        currentQuestionId = 'instrument';
                    },
                },
            ],
        },
        {
            id: 'skills',
            text: 'Please select a skill you want to practise:',
            selection: SKILL_TREE_LEAFS.map((d) => {
                return {
                    text: d.title,
                    title: d.description,
                    action: () => {
                        skills = new Set([d.id]);
                    },
                };
            }),
            options: [
                {
                    text: 'continue',
                    action: () => {
                        currentQuestionId = 'end';
                    },
                },
                {
                    text: 'back',
                    action: () => {
                        currentQuestionId = 'difficulty';
                    },
                },
            ],
        },
        {
            id: 'end',
            text: 'All done! Remember that you can repeat this process and adapt settings anytime.',
            options: [
                {
                    text: 'show me the apps now!',
                    action: () => {
                        finishWelcome({ skills, instruments, difficulties });
                    },
                },
                {
                    text: 'back',
                    action: () => {
                        currentQuestionId = 'skills';
                    },
                },
            ],
        },
    ];

    $: current = questions.filter((d) => d.id === currentQuestionId)[0];
    $: step = questions.indexOf(current);
</script>

<main>
    <h2>Welcome!</h2>
    <div>step {step + 1} of {questions.length}</div>
    <div class="progress">
        {#each d3.range(questions.length) as s}
            <div
                style="background-color: {s <= step
                    ? 'var(--accent)'
                    : '#eee'};"
            ></div>
        {/each}
    </div>
    <div>
        <p class="explanation">{current.text}</p>
    </div>

    {#if current.selection}
        <div>
            {#each current.selection as selectOption}
                <ToggleButton
                    label="{selectOption.text}"
                    title="{selectOption.title}"
                    checked="{false}"
                    callback="{selectOption.action}"
                />
            {/each}
        </div>
    {/if}
    <div>
        {#each current.options as option, index}
            <button
                on:click="{option.action}"
                style="{index === 0 ? 'background: var(--accent)' : ''}"
                >{option.text}</button
            >
        {/each}
    </div>
</main>

<style>
    div {
        margin-bottom: 20px;
    }

    .progress {
        margin: auto;
        width: 600px;
        display: flex;
        flex-direction: row;
        gap: 16px;
    }

    .progress div {
        height: 6px;
        border-radius: 3px;
        width: 100%;
    }
</style>
