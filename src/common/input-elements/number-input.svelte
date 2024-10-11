<script>
    /**
     * value
     */
    export let value;
    /**
     * callback on change
     */
    export let callback = () => {};
    /**
     * text within the surounding label
     */
    export let label = '';
    /**
     * title (tooltip) of the surounding label
     */
    export let title = '';
    /**
     * minimum value
     */
    export let min = 10;
    /**
     * maximum value
     */
    export let max = 500;
    /**
     * step between values
     */
    export let step = 10;
    export let width = '55px';
    export let disabled = false;
    export let style = '';
</script>

<label {title}>
    {label}
    <input
        type="number"
        bind:value
        on:change="{callback}"
        on:mousewheel="{(evt) => {
            evt.preventDefault();
            if (disabled) {
                return;
            }
            const add = evt.deltaY < 0 ? step : -step;
            const clamped = Math.min(max, Math.max(min, value + add));
            // round to step
            value = +clamped.toFixed(12);
            callback();
        }}"
        {step}
        {min}
        {max}
        {disabled}
        style="width: {width}; {style}"
    />
</label>
