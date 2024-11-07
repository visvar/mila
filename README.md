# MILA - Musical Instrument Learning Apps

A collection of web-based apps for musical instrument practice.

[Online version here](https://visvar.github.io/mila/)

![](./doc/teaser_hex.png)

## What You Need

Most apps require a MIDI instrument, though a few work with audio or allow you to use a PC keyboard or touch screen.

While several apps should work with any (MIDI) instrument, we only tested them with keyboard, e-drum, and a MIDI guitar pickup.

## Setup

This is only necessary for local testing or development.
If you just want to use the apps, go [here](https://visvar.github.io/mila/).

- Install NodeJS and npm
- Clone/download this repository
- `cd mila`
- `npm i`
- `npm start`
- Open the URL shown in the console

## Used Libraries and Packages

- [Svelte](https://svelte.dev/) components
- [Observable Plot](https://observablehq.com/plot/) visualization
- [D3](https://d3js.org/) scales, data processing
- [tonal](https://github.com/tonaljs/tonal) music theory such as scales, chords, progressions
- [musicvis-lib](https://github.com/fheyen/musicvis-lib) more technical musical functions
- [pitchy](https://github.com/ianprime0509/pitchy) pitch detection from audio
- [fflate]([fflate](https://www.npmjs.com/package/fflate)) compression of share links
- [webmidi](https://github.com/djipco/webmidi) Web MIDI API wrapper
- [fast-kde](https://github.com/uwdata/fast-kde) density estimation
- [@fontsource](https://github.com/fontsource/fontsource) noto-music, noto-sans, noto-sans-symbols, noto-sans-symbols-2 for cross-plattform note symbols and icons
- [https://github.com/danigb/soundfont-player](soundfont-player) and [midi-js-soundfonts](https://github.com/gleitz/midi-js-soundfonts) for playback
