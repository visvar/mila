<script>
    /**
     * A slider that accepts arbitrary numbers as values and will snap to them.
     * Instead of the current value, a name can be shown if names is set.
     */

    import * as d3 from 'd3';

    /**
     * @type {number[]} values
     */
    export let values = [1, 2, 4];
    /**
     * @type {string[]|null} names
     */
    export let names = null;
    /**
     * @type {number} value - default value
     */
    export let value = 1;
    /**
     * @type {string} title
     */
    export let title = '';
    /**
     * @type {string} label
     */
    export let label = '';
    /**
     * @type {number} width of the slider part in pixels
     */
    export let sliderWidth = 200;
    /**
     * @type {number} margin of the slider part in pixels
     */
    export let sliderMargin = 10;
    /**
     * @type {number} width of the value part in pixels
     */
    export let valueWidth = 80;
    /**
     * @type {function} callback function called when value changes
     */
    export let callback = () => {};

    let dragging = false;

    $: name = names ? names[values.indexOf(value)] : value;

    $: scaleX = d3
        .scaleLinear()
        .domain(d3.extent(values))
        .range([sliderMargin, sliderWidth - sliderMargin]);

    /**
     * Snap to closest value based on mouse position
     * @param {number} x mouse X
     */
    const update = (x) => {
        const val = scaleX.invert(x);
        const closestIndex = d3.minIndex(values, (d) => Math.abs(d - val));
        const closest = values[closestIndex];
        value = closest;
        callback();
    };

    const dragStart = () => {
        dragging = true;
    };
    const drag = (evt) => {
        if (dragging) {
            update(evt.offsetX);
        }
    };
    const dragEnd = (evt) => {
        dragging = false;
        update(evt.offsetX);
    };
</script>

<main {title}>
    <div>
        {label}
    </div>
    <svg
        class="slider"
        width="{sliderWidth}"
        height="20"
        on:mousedown="{dragStart}"
        on:mouseup="{dragEnd}"
        on:mousemove="{drag}"
        role="slider"
        tabindex="-1"
        aria-valuenow="{value}"
    >
        <rect
            class="slider-line"
            x="{sliderMargin}"
            y="9"
            width="{sliderWidth - 2 * sliderMargin}"
            height="2"
        ></rect>
        {#each values as v}
            <rect x="{scaleX(v)}" y="{2}" width="0.5" height="16"></rect>
        {/each}
        <circle class="slider-knob" cx="{scaleX(value)}" cy="10" r="5"></circle>
    </svg>
    <div class="value" style="width: {valueWidth}px">{name}</div>
</main>

<style>
    main {
        display: flex;
        align-items: center;
    }

    svg.slider {
        height: 20px;
        cursor: pointer;
    }

    rect.slider-line {
        fill: #aaa;
    }

    circle.slider-knob {
        fill: var(--accent);
        stroke: #888;
        cursor: ew-resize;
    }
</style>
