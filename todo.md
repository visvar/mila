# TODO

## New features

- move app settings, metronome, player, etc to a sidebar?
  - or floating button that can be collapsed?

## Fixes and improvements

- examples: re-think auto-saving and playing input
  - loading example should disable input until reset
  - importing should also disable input until reset
  - also disable autosave
  - reset before import?
- playback: disable input during playback
- synth: fix Tone.sampler not working in improvisation-chord-progression
  - see http://sites.music.columbia.edu/cmc/courses/g6611/spring2018/week6/index.html
  - see https://codesandbox.io/p/sandbox/tone-sampler-example-4pm72?file=%2Fsrc%2Findex.js
- use sample for metronome to make it sound less annoying, maybe allow choosing the sample and loudness
- rescale automatically, like in tempo-drift
- allow/fix MIDI replay for all apps
- add default values to top of each app (for inputs)
  - give defaultValue to all number-input
- cache localstorage data, write all changes but use cache for reading
- data sharing: compress binary data

## Refactoring

- use svelte:window for registering inputs https://svelte.dev/docs/svelte/svelte-window
- remove fretboard-spacetime-cube and make it a separate repo
- replace note-count-input by a number input

### Svelte 5

- update to svelte 5 https://svelte.dev/docs/svelte/v5-migration-guide
- issue with onDestroy not having access to values, maybe replace by use:? https://svelte.dev/docs/svelte/use
- after upgrading to svelte 5
  - since object attributes are reactive, put all app settings into an object to simplify data loading and exporting, only need to pass an object to an imported function now
- use svelte/reactivity instead of cloning Set and Map https://svelte.dev/docs/svelte/svelte-reactivity

## App-specific

- tempo change
  - use softmax for values and then linear color map?
- pitch bend
  - add version with indicator for allowed notes? (e.g., from chord progression)
- dynamics
  - chord version
    - chord detection, sort chords by piano key, by string for guitar
    - design pattern: Mixed axis, time and instrument part
- chord diagrams
  - list notes and intervals
- fretboard heatmap, jitter
  - show currently active notes (noteon adds to set, note off removes)
- improvisation scale degree
  - allow showing summed duration instead of count
- sub-division
  - combine histogram bars within the tolerance zone
    - automatically choose a binning divisible by 3 when triplets, same for 5
      - or just allow multiples of 60?
  - number of recent bars for all
  - forgetting for all
- speed up
  - colors for drum, string, …
  - allow to reset current take
- tempo change
  - drum mode where only hi-hat notes are used, as they are more regular


## Examples missing for

- provide one for each exercise as well
- for freatboard, provide one for boring and one for interesting
- speed-up tab
- two handed timing (replace)

## Ideas for new apps

- Staccato and legato app
  - task: practice different note durations (but IOIs should be the same)
  - visualization: similar to duration pies, 1D piano roll, ...
