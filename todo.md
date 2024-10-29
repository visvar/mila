# TODO

- features
  - wide mode, allow to toggle to a 'full screen with' mode for some vis

- refactoring
  - update to svelte 5 https://svelte.dev/docs/svelte/v5-migration-guide
    - issue with onDestroy not having access to values, maybe replace by use:? https://svelte.dev/docs/svelte/use
  - use svelte:window for registering inputs https://svelte.dev/docs/svelte/svelte-window
  - use svelte/reactivity instead of cloning Set and Map https://svelte.dev/docs/svelte/svelte-reactivity
  - use an effect instead of calling draw()
