<script>
    import { toggleOffIcon, toggleOnIcon } from '../lib/icons.js';

    export let checked = true;
    export let callback = () => {};
    export let label = '';
    export let title = '';
</script>

<button
    {title}
    on:click="{() => {
        checked = !checked;
        callback();
    }}"
>
    {label}
    {checked ? toggleOnIcon : toggleOffIcon}
</button>
