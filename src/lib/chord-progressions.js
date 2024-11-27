/**
 * @type {object[]} each progression has {label, chords, chordsShort}
 */
export const chordProgressions = [
    {
        label: 'ii V I (2-5-1) 7th',
        chords: ['IIm7', 'V7', 'IMaj7', 'IMaj7'],
        chordsShort: ['ii7', 'V7', 'I7', 'I7'],
    },
    {
        label: 'ii V I (2-5-1)',
        chords: ['IIm', 'V', 'I', 'I'],
        chordsShort: ['ii', 'V', 'I', 'I'],
    },
    {
        label: 'I ii V (1-2-7)',
        chords: ['IMaj7', 'IIm7', 'V7', 'V7'],
        chordsShort: ['I7', 'ii', 'V', 'V'],
    },
    {
        label: 'I V vi IV (1-5-6-4)',
        chords: ['I', 'V', 'VIm', 'IV'],
        chordsShort: ['I', 'V', 'vi', 'IV'],
    },
    {
        label: 'V vi IV I (5-6-4-1)',
        chords: ['V', 'VIm', 'IV', 'I'],
        chordsShort: ['V', 'vi', 'IV', 'I'],
    },
    {
        label: 'vi IV I V (6-4-1-5)',
        chords: ['VIm', 'IV', 'I', 'V'],
        chordsShort: ['vi', 'IV', 'I', 'V'],
    },
    {
        label: 'V I V vi (4-1-5-6)',
        chords: ['IV', 'I', 'V', 'VIm'],
        chordsShort: ['IV', 'I', 'V', 'vi'],
    },
    {
        label: 'circle',
        chords: ['VIm', 'IIm', 'V', 'I'],
        chordsShort: ['vi', 'ii', 'V', 'I'],
    },
    {
        label: '8 bar blues',
        chords: ['I', 'V', 'IV', 'IV', 'I', 'V', 'I', 'V'],
        chordsShort: ['I', 'V', 'IV', 'IV', 'I', 'V', 'I', 'V'],
    },
    {
        label: '12 bar blues',
        chords: [
            'IMaj7',
            'IMaj7',
            'IMaj7',
            'IMaj7',
            'IVMaj7',
            'IVMaj7',
            'IMaj7',
            'IMaj7',
            'VMaj7',
            'IVMaj7',
            'IMaj7',
            'VMaj7',
        ],
        chordsShort: [
            'I7',
            'I7',
            'I7',
            'I7',
            'IV7',
            'IV7',
            'I7',
            'I7',
            'V7',
            'IV7',
            'I7',
            'V7',
        ],
    },
    {
        label: 'canon',
        chords: ['I', 'V', 'VIm', 'IIIm', 'IV', 'I', 'IV', 'V'],
        chordsShort: ['I', 'V', 'vi', 'iii', 'IV', 'I', 'IV', 'V'],
    },
]
