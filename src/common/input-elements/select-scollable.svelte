<script>
    /**
     * a <select> that can be scrolled through with the mouse wheel
     *
     * The <option> values can only be strings or numbers
     */

    /**
     * value
     */
    export let value;
    /**
     * callback on change
     */
    export let callback = (evt) => {};
    export let label = '';
    export let title = '';
    export let className = '';
    export let disabled = false;
    export let style = '';

    let select;

    const scrollOptions = (evt) => {
        evt.preventDefault();
        if (disabled) {
            return;
        }
        // get values from options
        const options = [...select.children];
        const values = options.map((d) => d.value);
        // get index o current value
        let currentIndex = values.indexOf(value);

        if (currentIndex === -1) {
            // try string
            currentIndex = values.indexOf(value.toString());
            if (currentIndex === -1) {
                return;
            }
        }
        // scroll up or down?
        let index;
        if (evt.deltaY < 0) {
            // up
            index = currentIndex > 0 ? currentIndex - 1 : values.length - 1;
        } else {
            // down
            index = currentIndex < values.length - 1 ? currentIndex + 1 : 0;
        }
        if (typeof value === 'number') {
            value = +values[index];
        } else {
            value = values[index];
        }
        callback(evt);
    };
</script>

<label {title}>
    {label}
    <select
        bind:this="{select}"
        bind:value
        on:change="{(evt) => callback(evt)}"
        on:wheel="{scrollOptions}"
        class="{className}"
        {disabled}
        {style}
    >
        <slot></slot>
    </select>
</label>
