import Accents from './apps/accents.svelte'
import ChordArpeggioTiming from './apps/chord-arpeggio-timing.svelte'
import ChordDiagrams from './apps/chord-diagrams.svelte'
import DurationPies from './apps/duration-pies.svelte'
import Dynamics from './apps/dynamics.svelte'
import FretboardHeatmap from './apps/fretboard-heatmap.svelte'
import FretboardImprovisationIntervals from './apps/fretboard-improvisation-intervals.svelte'
import FretboardJitter from './apps/fretboard-jitter.svelte'
import FretboardSpacetimeCube from './apps/fretboard-spacetime-cube.svelte'
import ImprovisationChordProgression from './apps/improvisation-chord-progression.svelte'
import ImprovisationIntervals from './apps/improvisation-intervals.svelte'
import ImprovisationScaleDegreeColors from './apps/improvisation-scale-degree-colors.svelte'
import ImprovisationScaleDegrees from './apps/improvisation-scale-degrees.svelte'
import ImprovisationScaleDegreesBar from './apps/improvisation-scale-degrees-bar.svelte'
import ImprovisationScaleSubsetColors from './apps/improvisation-scale-subset-colors.svelte'
import KeyboardHistogram from './apps/keyboard-histogram.svelte'
import PitchBendAudio from './apps/pitch-bend-audio.svelte'
import PitchOffsetCents from './apps/pitch-offset-cents.svelte'
import PitchOffsetCentsNeedle from './apps/pitch-offset-cents-needle.svelte'
import RhythmSheetMusic from './apps/rhythm-sheet-music.svelte'
import SpeedUp from './apps/speed-up.svelte'
import SpeedUpTab from './apps/speed-up-tab.svelte'
import StrummingPattern from './apps/strumming-pattern.svelte'
import SubDivision from './apps/sub-division-circular.svelte'
import SubDivisionDrums from './apps/sub-division-drums.svelte'
import SubDivisionHistory from './apps/sub-division-history.svelte'
import SubDivisionLinear from './apps/sub-division-linear.svelte'
import TempoChange from './apps/tempo-change.svelte'
import TempoDrift from './apps/tempo-drift.svelte'
import TwoHandedTiming from './apps/two-handed-timing.svelte'
import DynamicsChords from './apps/dynamics-chords.svelte'

/**
 * All apps defined here
 *
 * difficulty: beginner, intermediate, advanced
 */
export const APPS = [
  {
    id: 'accents',
    title: 'Accents',
    description: 'Practice accenting notes by playing them louder',
    input: 'MIDI',
    instruments: ['drum', 'guitar/bass', 'keyboard'],
    data: ['order', 'ioi', 'dynamics'],
    skills: ['accents'],
    patterns: ['duration/ioi as symbol', 'dynamics as size', 'time is linear', 'time encoded non-linearly', 'update after note'],
    timeScale: ['a few bars'],
    difficulty: ['intermediate', 'advanced'],
    component: Accents
  },
  {
    id: 'chord-arpeggio-timing',
    title: 'Chord and Arpeggio Timing',
    description:
      'See how spaced out the notes in a chord or arpeggio are, and how much time lies between these',
    input: 'MIDI',
    instruments: ['guitar/bass', 'keyboard'],
    data: ['order', 'onset/time', 'ioi', 'pitch', 'chords'],
    skills: ['chord-timing', 'arpeggio-timing'],
    patterns: ['onset as tick', 'compressed pitches', 'chord detection', 'time is linear', 'time encoded linearly', 'update on note'],
    timeScale: ['a few bars'],
    difficulty: ['intermediate', 'advanced'],
    component: ChordArpeggioTiming
  },
  {
    id: 'chord-diagrams',
    title: 'Chord Diagrams',
    description:
      'See what chords you play on a guitar/bass as chord diagrams',
    input: 'MIDI',
    instruments: ['guitar/bass'],
    data: ['order', 'onset/time', 'pitch', 'dynamics', 'instrument', 'chords'],
    skills: ['chord-notes'],
    patterns: ['instrument layout', 'chord detection', 'time is linear', 'time is collapsed', 'update on note'],
    timeScale: ['a few notes'],
    difficulty: ['beginner', 'intermediate', 'advanced'],
    component: ChordDiagrams
  },
  {
    id: 'dynamics',
    title: 'Dynamics',
    description: 'Practice controlling the loudness of notes',
    input: 'MIDI',
    instruments: ['drum', 'guitar/bass', 'keyboard'],
    data: ['order', 'dynamics'],
    skills: ['constant-dynamics', '(de)crescendo', 'accents'],
    patterns: ['dynamics as bar', 'baselines as grid', 'time is linear', 'time encoded linearly', 'update on note', 'musical units'],
    timeScale: ['a few notes', 'a few bars'],
    difficulty: ['beginner', 'intermediate', 'advanced'],
    component: Dynamics
  },
  {
    id: 'dynamics-chords',
    title: 'Dynamics Chords',
    description: 'Practice controlling the loudness of notes in chords',
    input: 'MIDI',
    instruments: ['drum', 'guitar/bass', 'keyboard'],
    data: ['order', 'dynamics', 'pitch', 'chords'],
    skills: ['constant-dynamics', '(de)crescendo', 'accents'],
    patterns: ['dynamics as size', 'time is linear', 'time encoded linearly', 'update on note', 'musical units'],
    timeScale: ['a few notes', 'a few bars'],
    difficulty: ['beginner', 'intermediate', 'advanced'],
    component: DynamicsChords
  },
  {
    id: 'duration-pies',
    title: 'Duration Pies',
    description: 'Practice holding notes for different durations',
    input: 'MIDI',
    instruments: ['guitar/bass', 'keyboard', 'pc-key', 'touch'],
    data: ['order', 'duration/ioi'],
    skills: ['duration'],
    patterns: ['duration as bar', 'duration as pie', 'baselines as angle', 'time is circular', 'time encoded circular', 'time encoded linearly', 'update on note', 'musical units'],
    timeScale: ['a single note', 'a few notes'],
    difficulty: ['beginner'],
    component: DurationPies
  },
  {
    id: 'fretboard-heatmap',
    title: 'Fretboard Heatmap',
    description: 'Learn improvising with a scale at different fretboard positions',
    input: 'MIDI',
    instruments: ['guitar/bass'],
    data: ['instrument', 'pitch'],
    skills: ['instrument-layout', 'scale-notes'],
    patterns: ['distribution as heatmap', 'instrument layout', 'time is collapsed', 'update on note'],
    timeScale: ['a few bars', 'a full song'],
    difficulty: ['intermediate', 'advanced'],
    component: FretboardHeatmap
  },
  {
    id: 'fretboard-improvisation-intervals',
    title: 'Fretboard Improvisation Intervals',
    description:
      'Learn jumping through a scale in intervals of different size',
    input: 'MIDI',
    instruments: ['guitar/bass'],
    data: ['order', 'pitch', 'instrument', 'pitch-interval'],
    skills: ['instrument-layout', 'pitch-intervals'],
    patterns: ['instrument layout', 'time is instant', 'update on note'],
    timeScale: ['a few notes'],
    difficulty: ['advanced'],
    component: FretboardImprovisationIntervals
  },
  {
    id: 'fretboard-jitter',
    title: 'Fretboard Jitter',
    description: 'See how you play across different fretboard positions over time',
    input: 'MIDI',
    instruments: ['guitar/bass'],
    data: ['order', 'instrument'],
    skills: ['instrument-layout'],
    patterns: ['distribution as jitter', 'instrument layout', 'time is linear', 'time encoded non-linearly', 'update on note', 'facets'],
    timeScale: ['a full song'],
    difficulty: ['intermediate', 'advanced'],
    component: FretboardJitter
  },
  {
    id: 'fretboard-spacetime-cube',
    title: 'Fretboard Spacetime Cube',
    description: 'See how you play across different fretboard positions over time (in 3D)',
    input: 'MIDI',
    instruments: ['guitar/bass'],
    data: ['onset/time', 'instrument'],
    skills: ['instrument-layout'],
    patterns: ['spacetime cube', 'instrument layout', 'time is linear', 'time encoded linearly', 'update on note'],
    timeScale: ['a few bars'],
    difficulty: ['intermediate', 'advanced'],
    component: FretboardSpacetimeCube
  },
  {
    id: 'improvisation-intervals',
    title: 'Improvisation Intervals',
    description:
      'See how often you use different intervals in improvisation',
    input: 'MIDI',
    instruments: ['guitar/bass', 'keyboard'],
    data: ['order', 'pitch', 'pitch-interval'],
    skills: ['pitch-intervals'],
    patterns: ['distribution as histogram', 'time is collapsed', 'update on note'],
    timeScale: ['a few bars'],
    difficulty: ['advanced'],
    component: ImprovisationIntervals
  },
  {
    id: 'improvisation-chord-progression',
    title: 'Improvisation Chord Progression',
    description:
      'See how much you stick to the notes of chords and scale while improvising over a chord progression',
    input: 'MIDI',
    instruments: ['guitar/bass', 'keyboard'],
    data: ['order', 'duration/ioi', 'pitch', 'chords', 'exercise'],
    skills: ['pitch-intervals', 'scale-degrees', 'scale-notes', 'chord-progression'],
    patterns: ['note role as color', 'duration/ioi as bar', 'time is circular', 'time encoded non-linearly', 'update on note', 'chords as stacked bars'],
    timeScale: ['a few bars'],
    difficulty: ['intermediate', 'advanced'],
    component: ImprovisationChordProgression
  },
  {
    id: 'improvisation-note-colors',
    title: 'Improvisation Scale Subset Colors',
    description:
      'See how you use notes in different scale subsets during improvisation',
    input: 'MIDI',
    instruments: ['guitar/bass', 'keyboard'],
    data: ['order', 'duration/ioi', 'pitch', 'chords'],
    skills: ['pitch-intervals', 'scale-degrees', 'scale-notes'],
    patterns: ['note role as color', 'duration/ioi as bar', 'time is linear', 'time encoded non-linearly', 'update on note', 'chords as stacked bars'],
    timeScale: ['a few bars'],
    difficulty: ['intermediate', 'advanced'],
    component: ImprovisationScaleSubsetColors
  },
  {
    id: 'improvisation-note-colors2',
    title: 'Improvisation Scale Degree Colors',
    description:
      'See how  you use different scale degrees in improvisation',
    input: 'MIDI',
    instruments: ['guitar/bass', 'keyboard'],
    data: ['order', 'duration/ioi', 'pitch', 'chords'],
    skills: ['pitch-intervals', 'scale-degrees', 'scale-notes'],
    patterns: ['note role as color', 'duration/ioi as bar', 'time is linear', 'time encoded non-linearly', 'update on note', 'chords as stacked bars'],
    timeScale: ['a few bars'],
    difficulty: ['intermediate', 'advanced'],
    component: ImprovisationScaleDegreeColors
  },
  {
    id: 'improvisation-scale-degrees',
    title: 'Improvisation Scale Degrees',
    description:
      'See how often you use different scale degrees in improvisation',
    input: 'MIDI',
    instruments: ['guitar/bass', 'keyboard'],
    data: ['pitch'],
    skills: ['pitch-intervals', 'scale-degrees', 'scale-notes'],
    patterns: ['note role as color', 'distribution as histogram', 'time is collapsed', 'update on note'],
    timeScale: ['a few bars', 'a full song'],
    difficulty: ['advanced'],
    component: ImprovisationScaleDegrees
  },
  {
    id: 'improvisation-scale-degrees-bar',
    title: 'Improvisation Scale Degrees (Bar)',
    description:
      'See how often you use different scale degrees in improvisation, for each played bar',
    input: 'MIDI',
    instruments: ['guitar/bass', 'keyboard'],
    data: ['pitch', 'onset/time'],
    skills: ['pitch-intervals', 'scale-degrees', 'scale-notes'],
    patterns: ['note role as color', 'distribution as histogram', 'facets', 'time segments', 'time is linear', 'time is collapsed', 'time encoded linearly', 'update on note'],
    timeScale: ['a few bars'],
    difficulty: ['advanced'],
    component: ImprovisationScaleDegreesBar
  },
  {
    id: 'keyboard-histogram',
    title: 'Keyboard Histogram',
    description: 'See how often you play different keyboard keys and if they belong to a chosen scale',
    input: 'MIDI',
    instruments: ['keyboard'],
    data: ['pitch', 'instrument'],
    skills: ['instrument-layout', 'scale-notes'],
    patterns: ['distribution as histogram', 'instrument layout', 'time is collapsed', 'update on note', 'instrument as color'],
    timeScale: ['a few bars', 'a full song'],
    difficulty: ['intermediate', 'advanced'],
    component: KeyboardHistogram
  },
  {
    id: 'pitch-bend-audio',
    title: 'Pitch Bend',
    description: 'Practice pitch bends and vibratos',
    input: 'audio',
    instruments: ['guitar/bass', 'keyboard', 'singing'],
    data: ['onset/time', 'pitch'],
    skills: ['pitch-keeping', 'bending', 'vibrato', 'on-pitch'],
    patterns: ['pitch as line', 'baselines as grid', 'time is linear', 'time encoded linearly', 'update real-time'],
    timeScale: ['a few notes'],
    difficulty: ['intermediate', 'advanced'],
    component: PitchBendAudio
  },
  {
    id: 'pitch-offset-cents',
    title: 'Pitch Offset',
    description: 'See how well you are on pitch over time',
    input: 'audio',
    instruments: ['guitar/bass', 'keyboard', 'singing'],
    data: ['onset/time', 'pitch'],
    skills: ['pitch-keeping', 'bending', 'vibrato', 'on-pitch'],
    patterns: ['pitch as line', 'baselines as grid', 'explicit difference', 'difference as color', 'time is linear', 'time encoded linearly', 'update real-time', 'dual encoding'],
    timeScale: ['a few notes'],
    difficulty: ['intermediate', 'advanced'],
    component: PitchOffsetCents
  },
  {
    id: 'pitch-offset-cents-needle',
    title: 'Pitch Offset (Tuner)',
    description: 'See how well you are on pitch at a moment',
    input: 'audio',
    instruments: ['guitar/bass', 'keyboard', 'singing'],
    data: ['onset/time', 'pitch'],
    skills: ['pitch-keeping', 'on-pitch'],
    patterns: ['pitch as angle', 'baselines as grid', 'explicit difference', 'time is instant', 'update real-time'],
    timeScale: ['a single note'],
    difficulty: ['intermediate', 'advanced'],
    component: PitchOffsetCentsNeedle
  },
  {
    id: 'rhythm-sheet-music',
    title: 'Rhythm Sheet Music',
    description:
      'Practice note timing and get feedback as staff notation and offset in percent',
    input: 'MIDI',
    instruments: ['drum', 'guitar/bass', 'keyboard', 'pc-key', 'touch'],
    data: ['order', 'duration/ioi'],
    skills: ['sub-division', 'tempo-keeping'],
    patterns: ['duration/ioi as symbol', 'time is linear', 'time encoded non-linearly', 'update after note'],
    timeScale: ['a few notes'],
    difficulty: ['intermediate', 'advanced'],
    component: RhythmSheetMusic
  },
  {
    id: 'speed-up',
    title: 'Speed-Up',
    description:
      'Record/choose a short exercise then practice it with steadily increasing tempo',
    input: 'MIDI',
    instruments: ['drum', 'guitar/bass', 'keyboard', 'pc-key', 'touch'],
    data: ['onset/time', 'exercise'],
    skills: ['sub-division', 'timing-consistency', 'swing-feel'],
    patterns: ['phrase repetition', 'facets', 'increasing difficulty', 'comparison between takes', 'time is linear', 'time encoded linearly', 'update on note'],
    timeScale: ['a few bars'],
    difficulty: ['beginner', 'intermediate', 'advanced'],
    component: SpeedUp
  },
  {
    id: 'speed-up-tab',
    title: 'Speed-Up Tab',
    description:
      'Record/choose a short guitar exercise then practice it with steadily increasing tempo',
    input: 'MIDI',
    instruments: ['guitar/bass'],
    data: ['onset/time', 'exercise', 'instrument'],
    skills: ['sub-division', 'timing-consistency', 'swing-feel'],
    patterns: ['phrase repetition', 'facets', 'increasing difficulty', 'comparison between takes', 'time is linear', 'time encoded linearly', 'update on note'],
    timeScale: ['a few bars'],
    difficulty: ['beginner', 'intermediate', 'advanced'],
    component: SpeedUpTab
  },
  {
    id: 'sub-division',
    title: 'Sub-Division (Circular)',
    description: 'Practice rhythmic playing in different sub-divisions',
    input: 'MIDI',
    instruments: ['drum', 'guitar/bass', 'keyboard', 'pc-key', 'touch'],
    data: ['onset/time'],
    skills: ['sub-division', 'timing-consistency', 'swing-feel'],
    patterns: ['time is cyclic', 'time encoded circular', 'baselines as grid', 'distribution as histogram', 'distribution as density', 'target areas', 'update on note'],
    timeScale: ['a few bars', 'a full song'],
    difficulty: ['beginner', 'intermediate', 'advanced'],
    component: SubDivision
  },
  {
    id: 'sub-division-drums',
    title: 'Sub-Division (Drums)',
    description: 'Practice rhythmic playing in different sub-divisions, separated by drum',
    input: 'MIDI',
    instruments: ['drum', 'pc-key'],
    data: ['onset/time', 'instrument'],
    skills: ['sub-division', 'timing-consistency', 'synchronized-body-parts', 'swing-feel'],
    patterns: ['time is cyclic', 'time encoded linearly', 'baselines as grid', 'distribution as histogram', 'distribution as density', 'facets', 'update on note'],
    timeScale: ['a few bars', 'a full song'],
    difficulty: ['beginner', 'intermediate', 'advanced'],
    component: SubDivisionDrums
  },
  {
    id: 'sub-division-linear',
    title: 'Sub-Division (Linear)',
    description: 'Practice rhythmic playing in different sub-divisions',
    input: 'MIDI',
    instruments: ['drum', 'guitar/bass', 'keyboard', 'pc-key', 'touch'],
    data: ['onset/time'],
    skills: ['sub-division', 'timing-consistency', 'swing-feel'],
    patterns: ['time is cyclic', 'time encoded linearly', 'baselines as grid', 'distribution as histogram', 'distribution as density', 'update on note'],
    timeScale: ['a few bars', 'a full song'],
    difficulty: ['beginner', 'intermediate', 'advanced'],
    component: SubDivisionLinear
  },
  {
    id: 'sub-division-history',
    title: 'Sub-Division (History)',
    description: 'Practice rhythmic playing in different sub-divisions, compared to previous recordings',
    input: 'MIDI',
    instruments: ['drum', 'guitar/bass', 'keyboard', 'pc-key', 'touch'],
    data: ['onset/time'],
    skills: ['sub-division', 'timing-consistency', 'swing-feel'],
    patterns: ['time is cyclic', 'time encoded circular', 'baselines as grid', 'distribution as histogram', 'distribution as density', 'facets', 'comparison between takes', 'update on note'],
    timeScale: ['a few bars', 'a full song'],
    difficulty: ['beginner', 'intermediate', 'advanced'],
    component: SubDivisionHistory
  },
  {
    id: 'strumming-pattern',
    title: 'Strumming Pattern',
    description: 'Practice up/down strumming patterns on guitar',
    input: 'MIDI',
    instruments: ['guitar/bass'],
    data: ['onset/time', 'instrument'],
    skills: ['strumming-direction', 'strumming-strings'],
    patterns: ['direction as arrow', 'direction as color', 'chord detection', 'time is linear', 'time encoded linearly', 'update on note'],
    timeScale: ['a few bars'],
    difficulty: ['beginner', 'intermediate', 'advanced'],
    component: StrummingPattern
  },
  {
    id: 'tempo-drift',
    title: 'Tempo Drift',
    description: 'Practice keeping your tempo constant over a longer stretch of playing',
    input: 'MIDI',
    instruments: ['drum', 'guitar/bass', 'keyboard', 'pc-key', 'touch'],
    data: ['order', 'duration/ioi'],
    skills: ['tempo-keeping'],
    patterns: ['duration/ioi as bar', 'baselines as grid', 'time is linear', 'time encoded non-linearly', 'update on note'],
    timeScale: ['a full song'],
    difficulty: ['beginner', 'intermediate', 'advanced'],
    component: TempoDrift
  },
  {
    id: 'tempo-change',
    title: 'Tempo Change',
    description: 'Practice changing the tempo as intended',
    input: 'MIDI',
    instruments: ['drum', 'guitar/bass', 'keyboard', 'pc-key', 'touch'],
    data: ['onset/time', 'duration/ioi'],
    skills: ['tempo-changing', 'tempo-keeping'],
    patterns: ['baselines as grid', 'time is linear', 'time encoded linearly', 'update real-time'],
    timeScale: ['a few bars', 'a full song'],
    difficulty: ['intermediate', 'advanced'],
    component: TempoChange
  },
  {
    id: 'two-handed-timing',
    title: 'Two-Handed Timing',
    description:
      'Practice playing sub-divisions with a different rhythm for each hand',
    input: 'MIDI',
    instruments: ['keyboard', 'drum', 'pc-key'],
    data: ['onset/time', 'instrument'],
    skills: ['sub-division', 'timing-consistency', 'syncopation', 'synchronized-timing', 'synchronized-body-parts'],
    patterns: ['time is cyclic', 'time encoded linearly', 'baselines as grid', 'distribution as histogram', 'distribution as density', 'facets', 'update on note'],
    timeScale: ['a few bars'],
    difficulty: ['advanced'],
    component: TwoHandedTiming
  }
]

/**
 * Allows accessing app information by app id
 * @type{Map<string,object>}
 */
export const APP_MAP = new Map(APPS.map(d => [d.id, d]))
