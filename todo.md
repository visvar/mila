# TODO

## New features

- wide mode, allow to toggle to a 'full screen width' mode for some vis

## Fixes and improvements

- re-think auto-saving and how to handle examples
- fix Tone.sampler not working in improvisation-chord-progression
  - see http://sites.music.columbia.edu/cmc/courses/g6611/spring2018/week6/index.html
  - see https://codesandbox.io/p/sandbox/tone-sampler-example-4pm72?file=%2Fsrc%2Findex.js
- use sample for metronome to make it sound less annoying, maybe allow choosing the sample and loudness

## Refactoring

- update to svelte 5 https://svelte.dev/docs/svelte/v5-migration-guide
  - issue with onDestroy not having access to values, maybe replace by use:? https://svelte.dev/docs/svelte/use
- use svelte:window for registering inputs https://svelte.dev/docs/svelte/svelte-window
- use svelte/reactivity instead of cloning Set and Map https://svelte.dev/docs/svelte/svelte-reactivity
- use an effect instead of calling draw()
- remove fretboard-spacetime-cube and make it a separate repo

## App-specific

- tempo change
  - use softmax for values and then linear color map?
- pitch bend
  - add version with indicator for allowed notes? (e.g., from chord progression)
    -

## Examples missing for

- improvisation chord progression
- speed-up tab
