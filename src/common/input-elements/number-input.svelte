<script>
    /**
     * value
     */
    export let value;
    export let defaultValue = undefined;
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
    export let max = Infinity;
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
        on:wheel="{(evt) => {
            // allow to scroll to change value
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
        on:mousedown="{(evt) => {
            // allow to reset with middle click
            if (evt.button === 1 && defaultValue !== undefined) {
                evt.preventDefault();
                value = defaultValue;
                callback();
            }
        }}"
        {step}
        {min}
        {max}
        {disabled}
        style="width: {width}; {style}"
    />
</label>
