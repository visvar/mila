import * as d3 from 'd3'

/**
 * Note duration definitions with name, amount of beats (1 beat == 1 quarter), and symbol
 *
 * @type {object[]}
 */
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

// mostly as cache for quantizeNoteDuration() below
export const noteDurationsNormal = noteDurations.filter((d) => !d.dotted && !d.tuplet)
export const noteDurationsNormalAndDotted = noteDurations.filter((d) => !d.tuplet)
export const noteDurationsNormalAndTuplet = noteDurations.filter((d) => !d.dotted)


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
