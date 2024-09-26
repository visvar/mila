/**
 * Detects chords by combining all notes into one chord where two neighboring notes have a time distance of less then maxNoteDistance seconds
 *
 * TODO: move to mvlib
 *
 * @param {object[]} notes notes with at least {time:number}
 * @param {number} maxNoteDistance maximum note distance in seconds
 * @returns {object[][]} notes grouped by chord
 */
export function detectChords(notes, maxNoteDistance) {
  const chords = []
  let currentChord = []
  for (const note of notes) {
    if (currentChord.length === 0) {
      // empty chord?
      currentChord.push(note)
    } else if (note.time - currentChord.at(-1).time < maxNoteDistance) {
      // add to current chord
      currentChord.push(note)
    } else {
      // start new chord
      chords.push(currentChord)
      currentChord = [note]
    }
  }
  chords.push(currentChord)
  return chords
}
