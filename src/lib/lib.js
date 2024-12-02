import * as d3 from 'd3'
import { Utils } from 'musicvis-lib'

/**
 * Converts seconds per beat to beats per minute (BPM)
 *
 * @param {number} seconds seconds per beat
 * @returns {number} beat per minute (BPM)
 */
export function secondsPerBeatToBpm(seconds) {
  return 60 * 1 / seconds
}

/**
 * Returns the MIDI number for all Cs between (inclusive) minMidi and maxMidi
 * @param {number} minMidi lower MIDI number
 * @param {number} maxMidi upper MIDI number
 * @returns number[]
 */
export function getCs(minMidi, maxMidi) {
  return d3.range(
    Math.ceil(minMidi / 12) * 12,
    maxMidi + 1,
    12
  )
}

/**
 * Clamps a number such that the results will always be between min and max
 * @param {number} value value
 * @param {number} min min
 * @param {number} max max
 * @returns {number}
 */
export function clamp(value, min, max) {
  if (value < min) return min
  if (value > max) return max
  return value
}

/**
 * Allows to wait for a number of seconds with async/await
 * IMPORTANT: This it not exact, it will at *least* wait for X seconds
 *
 * @param {number} seconds number of seconds to wait
 * @returns {Promise} empty Promise that will resolve after the specified amount
 *      of seconds
 */
export function delay(seconds) {
  return new Promise(resolve => {
    setTimeout(resolve, seconds * 1000)
  })
}

/**
 * Update a set by toggling the item
 * @param {Set} set a Set
 * @param {*} item an item
 * @returns {Set} updated Set
*/
export function updSet(set, item) {
  if (set.has(item)) {
    set.delete(item)
  } else {
    set.add(item)
  }
  return new Set(set)
};

/**
 * Returns true if the Set contains any of the given items
 * @param {Set} set a Set
 * @param {*} values values
 * @returns {boolean} true if Set contains any of the values
 */
export function setHasAny(set, values) {
  for (const v of values) {
    if (set.has(v)) {
      return true
    }
  }
  return false
}

/**
 * Rounds a number to a certain steps, e.g., to multiples of 5
 * @param {number} value a number
 * @param {number} step a step
 * @returns {number} rounded number
 */
export function roundToStep(value, step) {
  return Math.round(value / step) * step
}

/**
 * Floors a number to a certain step, e.g., to multiples of 5
 * @param {number} value a number
 * @param {number} step a step
 * @returns {number} rounded number
 */
export function floorToStep(value, step) {
  return Math.round(value / step) * step
}

export function getNumberOfDaysPassed(someDate) {
  const now = new Date()
  const oneDay = 1000 * 60 * 60 * 24 // One day in milliseconds

  const diffInTime = now.getTime() - someDate.getTime()
  const diffInDays = Math.round(diffInTime / oneDay)
  if (diffInDays === 0) {
    return 'today'
  }
  if (diffInDays === 1) {
    return 'yesterday'
  }
  return diffInDays + ' days ago'
}

/**
 * TODO: use notes in beats, simplifies a lot and can take already adjusted notes
 * Computes the number of notes that are within binNote of the grid.
 * @param {number[]} notes note onset times
 * @param {string} grid e.g. '3:4' will lead to 12 divisions of the bar
 * @param {number} tempo in bpm
 * @param {number} binNote e.g., 16 for a sixteenth
 * @param {number} adjustTime time in seconds to add to each note
 * @param {number} [bars=1] number of bars per repetition
 */
export function computeSubdivisionOkScore(
  notes,
  grid,
  tempo,
  binNote,
  adjustTime
) {
  if (!notes || notes.length === 0) {
    return null
  }
  let okCount = 0
  // get times of grid
  const [grid1, grid2] = grid.split(':').map((d) => +d)
  const circleSeconds = Utils.bpmToSecondsPerBeat(tempo) * grid1
  const step = circleSeconds / (grid1 * grid2)
  const gridTimes = d3.range(0, circleSeconds + step, step)
  // get allowed error
  const allowed = circleSeconds / binNote
  // calculate directed error
  for (const note of notes) {
    const time = (note + adjustTime) % circleSeconds
    let minError = Infinity
    for (const gridTime of gridTimes) {
      const error = Math.abs(gridTime - time)
      if (error < minError) {
        minError = error
      }
    }
    if (minError <= allowed) {
      okCount++
    }
  }
  return okCount
}

/**
 * Computes the number of notes that are within binNote of the grid.
 * @param {number[]} notesInBeats note onset times (in beats, time adjusted)
 * @param {number} grid1 e.g., 3 for 3:4
 * @param {number} grid2 e.g., 4 for 3:4
 * @param {number} binNote e.g., 16 for a sixteenth
 */
export function computeSubdivisionOkScoreBeats(
  notesInBeats,
  grid1,
  grid2,
  binNote,
) {
  if (!notesInBeats || notesInBeats.length === 0) {
    return null
  }
  let okCount = 0
  const beatsPerRep = grid1
  const step = beatsPerRep / (grid1 * grid2)
  const gridTimes = d3.range(0, beatsPerRep + step, step)
  // get allowed error
  const allowed = 4 / binNote
  // calculate directed error
  for (const note of notesInBeats) {
    const time = note % beatsPerRep
    let minError = Infinity
    for (const gridTime of gridTimes) {
      const error = Math.abs(gridTime - time)
      if (error < minError) {
        minError = error
      }
    }
    if (minError <= allowed) {
      okCount++
    }
  }
  return okCount
}
