
export const SKILL_TREE = [
  {
    title: 'timing',
    description: 'Performing actions at the itended time',
    children: [
      {
        id: 'duration',
        title: 'duration',
        description: 'Notes should be played according to the intended duration'
      },
      {
        id: 'sub-division',
        title: 'sub-division',
        description: 'Note onsets should follow a sub-division of beats consistently, for example, playing straight eighths or triplets'
      },
      {
        id: 'tempo-keeping',
        title: 'tempo keeping',
        description: 'The tempo should be kept constant over a longer stretch of time without the help of a metronome'
      },
      // TODO: not supported for now
      // {
      //   id: 'tempo-changing',
      //   title: 'tempo changing',
      //   description: 'The tempo should be changed as intended'
      // },
      {
        id: 'swing-feel',
        title: 'swing feel',
        description: 'Playing a swing feel, meaning that every even (sub)beat is shifted in time consistently by the intended amount'
      },
      {
        id: 'timing-consistency',
        title: 'timing consistency',
        description: 'When playing the same musical pattern multiple times, the timing should be similar'
      },
      // TODO: not supported for now
      // {
      //   id: 'rests',
      //   title: 'rests',
      //   description: 'Notes should stop in time for a rest'
      // },
      {
        id: 'syncopation',
        title: 'syncopation',
        description: 'When playing different rhythms together, the timing should be on grid'
      },
      {
        id: 'synchronized-body-parts',
        title: 'synchronized body parts',
        description: 'Notes played with different body parts (e.g., hands) should be played synchronized'
      }
    ]
  },
  {
    title: 'pitch',
    description: 'Playing or modulating notes at the intended pitch (frequency in Hertz)',
    children: [
      {
        id: 'on-pitch',
        title: 'on pitch',
        description: 'When playing a melody, the notes\' pitches should be hit correctly'
      },
      {
        id: 'pitch-keeping',
        title: 'pitch keeping',
        description: 'The pitch should start and stay at the intended note'
      },
      {
        id: 'bending',
        title: 'bending',
        description: 'Bends should reach and stay at the intended semitone; the bend should start and end as quickly as intended'
      },
      {
        id: 'vibrato',
        title: 'vibrato',
        description: 'Vibratos should have the intended shift in pitch and the intended frequency of modulation'
      }
    ]
  },
  {
    title: 'dynamics',
    description: 'Playing notes at the intended loudness and changing or varying this loudness as intended',
    children: [
      {
        id: 'constant-dynamics',
        title: 'constant dynamics',
        description: 'Notes should have the same loudness'
      },
      {
        id: 'accents',
        title: 'accents',
        description: 'Important notes should be louder than others, for example, to highlight the first of a group of 3 or 4 notes'
      },
      {
        id: '(de)crescendo',
        title: '(de)crescendo',
        description: 'When getting louder/quieter, the loudness should in- or decrease smoothly'
      }
    ]
  },
  {
    title: 'chords',
    description: 'Playing chord or arpeggios',
    children: [
      {
        id: 'chord-timing',
        title: 'chord timing',
        description: 'Notes in a chord should start at the same time and the time between chords should be consistent'
      },
      {
        id: 'arpeggio-timing',
        title: 'arpeggio timing',
        description: 'Notes in an arpeggio should be spaced out evenly and the time between arpeggios should be consistent'
      },
      {
        id: 'chord-notes',
        title: 'chord notes',
        description: 'The notes in a chord should be played as planned or chosen to match the intended harmony or dissonance'
      },

    ]
  },
  {
    title: 'improvisation',
    description: 'Improvisation',
    children: [
      {
        id: 'pitch-intervals',
        title: 'intervals',
        description: 'In improvisation, the intervals between consecutive notes should match the intended harmony or dissonance'
      },
      {
        id: 'scale-notes',
        title: 'scale notes',
        description: 'The musicians should know which notes belong to a scale'
      },
      {
        id: 'scale-degrees',
        title: 'scale degrees',
        description: 'In improvisation, scale degrees should be used to appropriate amounts'
      },
      {
        id: 'chord-progression',
        title: 'chord progression',
        description: 'When improvising over a chord progression, notes should be picked appropriately'
      },
    ]
  },
  {
    title: 'instrument',
    description: 'Knowing and correctly using the instrument and all its part',
    children: [
      {
        id: 'instrument-layout',
        title: 'instrument layout',
        description: 'The musician should know where notes are played on the instrument and use different parts of it appropriately'
      },
      {
        id: 'strumming-direction',
        title: 'strumming direction',
        description: 'Chords should be strummed in the intended direction'
      },
      {
        id: 'strumming-strings',
        title: 'strumming strings',
        description: 'Only the intended strings should be strummed'
      },
    ]
  },
  // TODO: ensemble is out of scope for now
  // {
  //   title: 'ensemble',
  //   description: 'Playing together with other musicians that use the same or a different type of instrument',
  //   children: [
  //     {
  //       id: 'synchronized-timing',
  //       title: 'synchronized timing',
  //       description: 'Multiple musicians playing together should play to the same timing grid'
  //     },
  //     {
  //       id: 'entrance-pause',
  //       title: 'entrance and pause',
  //       description: 'Everyone should start and stop playing at the same time'
  //     },
  //     {
  //       id: 'same-key',
  //       title: 'same key',
  //       description: 'Multiple musicians playing together should play in the same key and change it at the same time'
  //     }
  //   ]
  // }
]

// assign numbering
for (const group of SKILL_TREE) {
  for (const [index, skill] of group.children.entries()) {
    skill.label = `${group.title.at(0).toUpperCase()}${index + 1}`
  }
}

function getLeafs(children) {
  let leafs = []
  for (const child of children) {
    if (child.id) {
      // is leaf
      leafs.push(child)
    } else {
      // is inner node
      leafs = [...leafs, ...getLeafs(child.children)]
    }
  }
  return leafs
}

export const SKILL_TREE_LEAFS = getLeafs(SKILL_TREE)
