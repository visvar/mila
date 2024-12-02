/**
 * Maps a note with any (up to two) accidentals to its chroma from 0 to 11
 *
 * Example:
 * A## -> 11
 * Cbb -> 10
 *
 * TODO: move to mvlib
 * @type {Map<string,number>}
 */
export const NOTE_TO_CHROMA_MAP = new Map([
  ['A', 9],
  ['A#', 10],
  ['A##', 11],
  ['Ab', 8],
  ['Abb', 7],
  ['B', 11],
  ['B#', 0],
  ['B##', 1],
  ['Bb', 10],
  ['Bbb', 9],
  ['C', 0],
  ['C#', 1],
  ['C##', 2],
  ['Cb', 11],
  ['Cbb', 10],
  ['D', 2],
  ['D#', 3],
  ['D##', 4],
  ['Db', 1],
  ['Dbb', 0],
  ['E', 4],
  ['E#', 5],
  ['E##', 6],
  ['Eb', 3],
  ['Ebb', 2],
  ['F', 5],
  ['F#', 6],
  ['F##', 7],
  ['Fb', 4],
  ['Fbb', 3],
  ['G', 7],
  ['G#', 8],
  ['G##', 9],
  ['Gb', 6],
  ['Gbb', 5]
])


/**
 * MIDI note number % 12 that represents a sharp/flat note
 *
 * @type {Array<1|3|6|8|10>}
 */
export const MIDI_SHARPS = [
  1, 3, 6, 8, 10
]

/**
 * MIDI note number % 12 that represents a natural (not sharp/flat) note
 *
 * @type {Array<0|2|4|5|7|9|11>}
 */
export const MIDI_NATURALS = [
  0, 2, 4, 5, 7, 9, 11
]

/**
 * Musical grids for sub-division
 * TODO: move to mvlib
 *
 * @type {object[]}
 */
export const GRIDS = [
  { divisions: '4:1', label: '⁴⁄₄ quarters' },
  { divisions: '4:2', label: '⁴⁄₄ eighths' },
  { divisions: '4:3', label: '⁴⁄₄ triplets' },
  { divisions: '4:4', label: '⁴⁄₄ sixteenths' },
  { divisions: '4:5', label: '⁴⁄₄ quintuplets' },
  { divisions: '4:6', label: '⁴⁄₄ sixtuplets' },
  { divisions: '3:1', label: '³⁄₄ quarters' },
  { divisions: '3:2', label: '³⁄₄ eighths' },
  { divisions: '3:3', label: '³⁄₄ triplets' },
  { divisions: '3:4', label: '³⁄₄ sixteenths' },
  { divisions: '3:5', label: '³⁄₄ quintuplets' },
  { divisions: '3:6', label: '³⁄₄ sixtuplets' },
  { divisions: '2:1', label: '²⁄₄ quarters' },
  { divisions: '2:2', label: '²⁄₄ eighths' },
  { divisions: '2:3', label: '²⁄₄ triplets' },
  { divisions: '2:4', label: '²⁄₄ sixteenths' },
  { divisions: '2:5', label: '²⁄₄ quintuplets' },
  { divisions: '2:6', label: '²⁄₄ sixtuplets' },
]

/**
 * Note values to bin by
 *
 * @type {number[]}
 */
export const BIN_NOTES = [8, 16, 32, 64, 128, 24, 48, 96, 192]


/**
 * Note values to bin by. Divisible by 2, 3, 4, 5
 *
 * @type {number[]}
*/
export const BIN_NOTES2 = [60, 120, 180, 240]

/**
 * Note values to filter by
*
* @type { number[]}
*/

export const FILTER_NOTES = [4, 8, 16, 32, 64, 128]



// TODO: move to mvlib
/**
 *
 * @see https://muted.io/intervals-chart/
 * @type {object[]}
 */
export const INTERVALS = [
  { semitones: 0, name: 'Unison', short: 'P1', type: 'perfect' },
  { semitones: 1, name: 'Minor 2nd', short: 'm2', type: 'minor' },
  { semitones: 2, name: 'Major 2nd', short: 'M2', type: 'major' },
  { semitones: 3, name: 'Minor 3rd', short: 'm3', type: 'minor' },
  { semitones: 4, name: 'Major 3rd', short: 'M3', type: 'major' },
  { semitones: 5, name: 'Perfect 4th', short: 'P4', type: 'perfect' },
  { semitones: 6, name: 'Augmented 4th', short: 'A4', type: 'tritone' },
  { semitones: 7, name: 'Perfect 5th', short: 'P5', type: 'perfect' },
  { semitones: 8, name: 'Minor 6th', short: 'm6', type: 'minor' },
  { semitones: 9, name: 'Major 6th', short: 'M6', type: 'major' },
  { semitones: 10, name: 'Minor 7th', short: 'm7', type: 'minor' },
  { semitones: 11, name: 'Major 7th', short: 'M7', type: 'major' },
  { semitones: 12, name: 'Perfect 8ve', short: 'P8', type: 'perfect' },
]



// see https://en.wikipedia.org/wiki/Dynamics_(music)
// TODO: move to mvlib
/**
 * @type {Map<number,string>}
 */
export const VELOCITIES_LOGIC = new Map([
  [0, 'silent'],
  [16, 'ppp'],
  [32, 'pp'],
  [48, 'p'],
  [64, 'mp'],
  [80, 'mf'],
  [96, 'f'],
  [112, 'ff'],
  [127, 'fff']
])
/**
 * @type {Map<number,string>}
 */
export const VELOCITIES_FINALE = new Map([
  [0, 'silent'],
  [10, 'pppp'],
  [23, 'ppp'],
  [36, 'pp'],
  [49, 'p'],
  [62, 'mp'],
  [75, 'mf'],
  [88, 'f'],
  [101, 'ff'],
  [114, 'fff'],
  [127, 'ffff']
])
/**
 * @type {Map<number,string>}
 */
export const VELOCITIES_MUSESCORE = new Map([
  [0, 'silent'],
  [5, 'ppppp'],
  [10, 'pppp'],
  [16, 'ppp'],
  [33, 'pp'],
  [49, 'p'],
  [64, 'mp'],
  [80, 'mf'],
  [96, 'f'],
  [112, 'ff'],
  [126, 'fff'],
  [127, 'ffff']
])

/**
 * @see https://en.wikipedia.org/wiki/Dynamics_(music)
 * TODO: move to mvlib
 * @type {Map<string,string>}
*/
export const VELOCITIES_MEANING = new Map([
  ['silent', 'silent'],
  ['ppppp', 'almost silent'],
  ['pppp', 'soft whispering'],
  ['ppp', 'whispering'],
  ['pp', 'almost a whisper'],
  ['p', 'softer than speaking'],
  ['mp', 'speaking voice'],
  ['mf', 'speaking voice'],
  ['f', 'louder than speaking'],
  ['ff', 'loud speaking'],
  ['fff', 'yelling'],
  ['ffff', 'loud yelling']
])

/**
// @see https://en.wikipedia.org/wiki/Tempo
 * Each given as upper end of the BPM range
 * TODO: move to mvlib
 * @type {Map<string,number>}
 */
export const TEMPO_NAMES = new Map([
  ['Larghissimo', 24],
  ['Adagissimo', 40],
  ['Largo', 66],
  ['Marcia moderato', 80],
  ['Andante moderato', 108],
  ['Moderato', 120],
  ['Allegro', 156],
  ['Vivace', 176],
  ['Presto', 200],
  ['Prestissimo', 400]
])

/**
 * @see https://en.wikipedia.org/wiki/Degree_(music)
 * @type {Map<number,object>}
 */
export const SCALE_DEGREES_MAJOR = new Map([
  [1, { degree: 1, semitones: 0, short: 'Ton', name: 'Tonic', meaning: 'Tonal center, note of final resolution' }],
  [2, { degree: 2, semitones: 2, short: 'SpT', name: 'Supertonic', meaning: 'One whole step above the tonic' }],
  [3, { degree: 3, semitones: 4, short: 'Med', name: 'Mediant', meaning: 'Midway between tonic and dominant, (in minor key) tonic of relative major key' }],
  [4, { degree: 4, semitones: 5, short: 'SbD', name: 'Subdominant', meaning: 'Lower dominant, happens to have the same interval below tonic as dominant is above tonic' }],
  [5, { degree: 5, semitones: 7, short: 'Dom', name: 'Dominant', meaning: 'Second in importance to the tonic' }],
  [6, { degree: 6, semitones: 9, short: 'SbM', name: 'Submediant', meaning: 'Lower mediant, midway between tonic and subdominant, (in major key) tonic of relative minor key' }],
  [7, { degree: 7, semitones: 11, short: 'Lea', name: 'Leading tone', meaning: 'One whole step below tonic in natural minor scale' }],
])

/**
 * @see https://en.wikipedia.org/wiki/Degree_(music)
 * @type {Map<number,object>}
 */
export const SCALE_DEGREES_MINOR = new Map([
  [1, { degree: 1, semitones: 0, short: 'Ton', name: 'Tonic', meaning: 'Tonal center, note of final resolution' }],
  [2, { degree: 2, semitones: 2, short: 'SpT', name: 'Supertonic', meaning: 'One whole step above the tonic' }],
  [3, { degree: 3, semitones: 3, short: 'Med', name: 'Mediant', meaning: 'Midway between tonic and dominant, (in minor key) tonic of relative major key' }],
  [4, { degree: 4, semitones: 5, short: 'SbD', name: 'Subdominant', meaning: 'Lower dominant, happens to have the same interval below tonic as dominant is above tonic' }],
  [5, { degree: 5, semitones: 7, short: 'Dom', name: 'Dominant', meaning: 'Second in importance to the tonic' }],
  [6, { degree: 6, semitones: 8, short: 'SbM', name: 'Submediant', meaning: 'Lower mediant, midway between tonic and subdominant, (in major key) tonic of relative minor key' }],
  [7, { degree: 7, semitones: 10, short: 'SbT', name: 'Subtonic', meaning: 'One whole step below tonic in natural minor scale' }],
])
