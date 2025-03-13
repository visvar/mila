<script>
    export let checked = true;
    /**
     * Function that will be called with the updated state of checked
     * @type {function}
     * @param {boolean} checked
     */
    export let callback = (checked) => {};
    export let label = '';
    export let title = '';
    export let disabled = false;

    const w = 30;
    const h = 20;
    const m = 2;
    const r = 5;
</script>

<button
    {title}
    on:click="{() => {
        checked = !checked;
        callback(checked);
    }}"
    {disabled}
>
    <div>
        {label}
    </div>
    <svg class="indicator" width="{w}" height="{h}">
        <rect
            x="{m}"
            y="{m}"
            width="{w - 2 * m}"
            height="{h - 2 * m}"
            rx="{8}"
            fill="{checked ? 'var(--accentDark)' : '#aaa'}"
        ></rect>
        <circle
            cx="{!checked ? m + r + 2 : w - m - r - 2}"
            cy="{h / 2}"
            {r}
            fill="white"
        ></circle>
    </svg>
</button>

<style>
    button {
        display: inline-flex;
        align-items: center;
        gap: 5px;
    }

    circle,
    rect {
        transition: all 300ms;
    }
</style>
