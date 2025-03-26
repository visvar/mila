# Ideas

## High priority


- increase locally stored data size
  - use https://github.com/dexie/Dexie.js
    - if no time, this could be a drop in solution https://www.npmjs.com/package/idb-keyval
- move example buttons into exercise box, more examples

## New features

- move app settings, metronome, player, etc to a sidebar?
  - or floating button that can be collapsed?
  - would be easier to access then
- backing track component/function/class
  - add to all improvisation apps


## Fixes and improvements

- all apps: record midi number, velocity, for playback
  - rhythm-sheet-music (currently only time)
  - tempo-change (currently only time)
  - tempo-drift (currently only time)

- synth: fix Tone.sampler not working in midi-input
  - see http://sites.music.columbia.edu/cmc/courses/g6611/spring2018/week6/index.html
  - see https://codesandbox.io/p/sandbox/tone-sampler-example-4pm72?file=%2Fsrc%2Findex.js
  - use sample for metronome to make it sound less annoying, maybe allow choosing the sample


- sharing: compress binary data, try base64


## App-specific

- dynamics
  - chord version
    - chord detection, sort chords by piano key, by string for guitar
    - design pattern: Mixed axis for time and instrument part
    - or facets (chroma, string)
- chord diagrams
  - list notes and intervals
- fretboard heatmap, jitter
  - show currently active notes (noteon adds to set, note off removes)
- improvisation scale degree
  - allow showing summed duration instead of count
- sub-division
  - automatically choose a binning divisible by 3 when triplets, same for 5
  - number of recent bars shown and considered for all
- speed up
  - colors for drum, string, etc
  - allow to retry current take


## Ideas for new apps

- pitch bend
  - add version with indicator for allowed notes? only bend to notes within scale while improvising (e.g., from chord progression)
- Staccato and legato app
  - task: practice different note durations (but IOIs should be the same)
  - 1D piano roll


## musicvis-lib

- copy/move data and algorithms to lib
