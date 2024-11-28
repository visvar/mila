# TODO

## New features

- move app settings, metronome, player, etc to a sidebar?
  - or floating button that can be collapsed?
  - would be easier to access then
- backing track component/function/class
  - add to all improvisation apps

## Fixes and improvements

- examples: re-think auto-saving and playing input
  - see fretboard-jitter
  - when isPlaying
    - disable all inputs for data loading, exporting
    - disable MIDI input
    - disable autosave
  - when isData loaded
    - disable input until reset
    - disable autosave
    - reset before import?
- synth: fix Tone.sampler not working in improvisation-chord-progression
  - see http://sites.music.columbia.edu/cmc/courses/g6611/spring2018/week6/index.html
  - see https://codesandbox.io/p/sandbox/tone-sampler-example-4pm72?file=%2Fsrc%2Findex.js
- use sample for metronome to make it sound less annoying, maybe allow choosing the sample and loudness
- allow/fix MIDI replay for all apps
- add default values to top of each app (for inputs)
  - give defaultValue to all number-input
- cache localstorage data, write all changes but use cache for reading
- data size
  - sharing: compress binary data, try base64
  - use https://github.com/dexie/Dexie.js
    - if no time, this could be a drop in solution https://www.npmjs.com/package/idb-keyval
- all apps: record midi number, velocity, for playback

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
  - colors for drum, string, etc
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
