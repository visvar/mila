<script>
    export let value;
    export let callback = () => {};
    export let label = 'tempo';
    export let title = 'The tempo in beats per minute (bpm)';
    export let min = 30;
    export let max = 400;
    export let step = 5;
</script>

<label {title}>
    {label}
    <input
        type="number"
        bind:value
        on:change="{callback}"
        on:mousewheel="{(evt) => {
            evt.preventDefault();
            const add = evt.deltaY < 0 ? step : -step;
            value = Math.min(max, Math.max(min, value + add));
            callback();
        }}"
        {min}
        {max}
        {step}
        style="width: 53px"
    />
</label>
