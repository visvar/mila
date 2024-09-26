export const noteDurations = [
  // normal
  {
    name: 'whole',
    beats: 4,
    symbol: '𝅝'
  },
  {
    name: 'half',
    beats: 2,
    symbol: '𝅗𝅥'
  },
  {
    name: 'quarter',
    beats: 1,
    symbol: '𝅘𝅥'
  },
  {
    name: 'eighth',
    beats: 0.5,
    symbol: '𝅘𝅥𝅮'
  },
  {
    name: 'sixteenth',
    beats: 0.25,
    symbol: '𝅘𝅥𝅯'
  },
  {
    name: 'thirtysecond',
    beats: 0.125,
    symbol: '𝅘𝅥𝅰'
  },
  {
    name: 'sixtyfourth',
    beats: 0.0625,
    symbol: '𝅘𝅥𝅱'
  },
  // dotted
  {
    name: 'dotted-half',
    beats: 3,
    symbol: '𝅗𝅥.',
    dotted: true
  },
  {
    name: 'dotted-quarter',
    beats: 1.5,
    symbol: '𝅘𝅥.',
    dotted: true
  },
  {
    name: 'dotted-eighth',
    beats: 0.75,
    symbol: '𝅘𝅥𝅮.',
    dotted: true
  },
  {
    name: 'dotted-sixteenth',
    beats: 0.375,
    symbol: '𝅘𝅥𝅯.',
    dotted: true
  },
  // tuplets
  {
    name: 'eighth-triplet',
    beats: 1 / 3,
    symbol: '𝅘𝅥³',
    tuplet: true
  },
  {
    name: 'eighth-quintuplet',
    beats: 1 / 5,
    symbol: '𝅘𝅥⁵',
    tuplet: true
  },
  {
    name: 'eighth-sixtuplet',
    beats: 1 / 6,
    symbol: '𝅘𝅥⁶',
    tuplet: true
  }
]
