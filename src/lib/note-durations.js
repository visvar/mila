import * as d3 from 'd3'

/**
 * Note duration definitions with name, amount of beats (1 beat == 1 quarter), and symbol
 *
 * @type {object[]}
 */
export const noteDurationsNormal = [
  // normal
  {
    name: 'whole',
    beats: 4,
    symbol: '𝅝',
    normal: true
  },
  {
    name: 'half',
    beats: 2,
    symbol: '𝅗𝅥',
    normal: true
  },
  {
    name: 'quarter',
    beats: 1,
    symbol: '𝅘𝅥',
    normal: true
  },
  {
    name: 'eighth',
    beats: 0.5,
    symbol: '𝅘𝅥𝅮',
    normal: true
  },
  {
    name: 'sixteenth',
    beats: 0.25,
    symbol: '𝅘𝅥𝅯',
    normal: true
  },
  {
    name: 'thirtysecond',
    beats: 0.125,
    symbol: '𝅘𝅥𝅰',
    normal: true
  },
  {
    name: 'sixtyfourth',
    beats: 0.0625,
    symbol: '𝅘𝅥𝅱',
    normal: true
  }
]



/**
 * Note duration definitions with name, amount of beats (1 beat == 1 quarter), and symbol
 *
 * @type {object[]}
 */
export const noteDurationsDotted = [
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
  }
]


/**
 * Note duration definitions with name, amount of beats (1 beat == 1 quarter), and symbol
 *
 * @type {object[]}
 */
export const noteDurationsDoubleDotted = [
  // double dotted
  {
    name: 'double-dotted-half',
    beats: 2 + 1 + 0.5,
    symbol: '𝅗𝅥..',
    doubleDotted: true
  },
  {
    name: 'double-dotted-quarter',
    beats: 1 + 0.5 + 0.25,
    symbol: '𝅘𝅥..',
    doubleDotted: true
  },
  {
    name: 'double-dotted-eighth',
    beats: 0.5 + 0.25 + 0.125,
    symbol: '𝅘𝅥𝅮..',
    doubleDotted: true
  },
  {
    name: 'double-dotted-sixteenth',
    beats: 0.25 + 0.125 + 0.0625,
    symbol: '𝅘𝅥𝅯..',
    doubleDotted: true
  },
]

/**
 * Note duration definitions with name, amount of beats (1 beat == 1 quarter), and symbol
 *
 * @type {object[]}
 */
export const noteDurationsTied = [
  // double dotted
  {
    name: 'half-plus-eighth',
    beats: 2 + 0.5,
    symbol: '𝅗𝅥𝆣𝅘𝅥𝅮',
    doubleDotted: true
  },
  {
    name: 'quarter-plus-sixteenth',
    beats: 1 + 0.25,
    symbol: '𝅘𝅥𝆣𝅘𝅥𝅯',
    doubleDotted: true
  },
  {
    name: 'eighth-plus-thirtysecond',
    beats: 0.5 + 0.125,
    symbol: '𝅘𝅥𝅮𝆣𝅘𝅥𝅰',
    doubleDotted: true
  }
]


/**
 * Note duration definitions with name, amount of beats (1 beat == 1 quarter), and symbol
 *
 * @type {object[]}
 */
export const noteDurationsTuplets = [
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


/**
 * Note duration definitions with name, amount of beats (1 beat == 1 quarter), and symbol
 *
 * @type {object[]}
 */
export const noteDurations = [
  ...noteDurationsNormal,
  ...noteDurationsDotted,
  ...noteDurationsDoubleDotted,
  ...noteDurationsTied,
  ...noteDurationsTuplets
]

export const noteDurationsNormalAndDotted = [
  ...noteDurationsNormal,
  ...noteDurationsDotted,
]
export const noteDurationsNormalAndTuplet = [
  ...noteDurationsNormal,
  ...noteDurationsTuplets,
]

export const noteDurationBeatMap = new Map(noteDurations.map((d) => [d.beats, d]))

/**
 * Determines the best fitting entry of noteDurations for a given duration in beats
 * @param {number} durationInBeats duration as multiple of a quarter note, e.g., 1.5 for a dotted quarter
 * @param {boolean} useDotted allow dotted notes in output
 * @param {boolean} useTuplets allow tuplet notes in output
 * @returns {object} entry of @link noteDurations
 */
export function quantizeNoteDuration(durationInBeats, useDotted, useTuplets) {
  let possible = noteDurationsNormal
  if (useDotted && useTuplets) {
    possible = noteDurations
  } else if (useDotted) {
    possible = noteDurationsNormalAndDotted
  } else if (useTuplets) {
    possible = noteDurationsNormalAndTuplet
  }
  // best fitting duration
  const bestDurIndex = d3.minIndex(possible, (d) =>
    Math.abs(durationInBeats - d.beats),
  )
  const bestDur = possible[bestDurIndex]
  return bestDur
}
