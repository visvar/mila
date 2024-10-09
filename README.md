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

## Used Libraries

- Obersable Plot
- D3
- https://www.npmjs.com/package/fflate for compression of share links
- @tonaljs/tonal music theory such as scales
