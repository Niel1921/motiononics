
export interface KeySignature {
    semitones: number[];
    notes: string[];
  }
  
// List of all key signatures

export const keySignatures: Record<string, KeySignature> = {
  // Major Keys (Circle of Fifths)
  "C Major": {
    semitones: [0, 2, 4, 5, 7, 9, 11, 12],
    notes: ["C", "D", "E", "F", "G", "A", "B", "C"],
  },
  "G Major": {
    semitones: [0, 2, 4, 5, 7, 9, 11, 12],
    notes: ["G", "A", "B", "C", "D", "E", "F#", "G"],
  },
  "D Major": {
    semitones: [0, 2, 4, 5, 7, 9, 11, 12],
    notes: ["D", "E", "F#", "G", "A", "B", "C#", "D"],
  },
  "A Major": {
    semitones: [0, 2, 4, 5, 7, 9, 11, 12],
    notes: ["A", "B", "C#", "D", "E", "F#", "G#", "A"],
  },
  "E Major": {
    semitones: [0, 2, 4, 5, 7, 9, 11, 12],
    notes: ["E", "F#", "G#", "A", "B", "C#", "D#", "E"],
  },
  "B Major": {
    semitones: [0, 2, 4, 5, 7, 9, 11, 12],
    notes: ["B", "C#", "D#", "E", "F#", "G#", "A#", "B"],
  },
  "F# Major": {
    semitones: [0, 2, 4, 5, 7, 9, 11, 12],
    notes: ["F#", "G#", "A#", "B", "C#", "D#", "E#", "F#"],
  },
  "C# Major": {
    semitones: [0, 2, 4, 5, 7, 9, 11, 12],
    notes: ["C#", "D#", "E#", "F#", "G#", "A#", "B#", "C#"],
  },
  "F Major": {
    semitones: [0, 2, 4, 5, 7, 9, 11, 12],
    notes: ["F", "G", "A", "Bb", "C", "D", "E", "F"],
  },
  "Bb Major": {
    semitones: [0, 2, 4, 5, 7, 9, 11, 12],
    notes: ["Bb", "C", "D", "Eb", "F", "G", "A", "Bb"],
  },
  "Eb Major": {
    semitones: [0, 2, 4, 5, 7, 9, 11, 12],
    notes: ["Eb", "F", "G", "Ab", "Bb", "C", "D", "Eb"],
  },
  "Ab Major": {
    semitones: [0, 2, 4, 5, 7, 9, 11, 12],
    notes: ["Ab", "Bb", "C", "Db", "Eb", "F", "G", "Ab"],
  },

  // Natural Minor Keys (Relative minors of the majors)
  "A Minor": {
    semitones: [0, 2, 3, 5, 7, 8, 10, 12],
    notes: ["A", "B", "C", "D", "E", "F", "G", "A"],
  },
  "E Minor": {
    semitones: [0, 2, 3, 5, 7, 8, 10, 12],
    notes: ["E", "F#", "G", "A", "B", "C", "D", "E"],
  },
  "B Minor": {
    semitones: [0, 2, 3, 5, 7, 8, 10, 12],
    notes: ["B", "C#", "D", "E", "F#", "G", "A", "B"],
  },
  "F# Minor": {
    semitones: [0, 2, 3, 5, 7, 8, 10, 12],
    notes: ["F#", "G#", "A", "B", "C#", "D", "E", "F#"],
  },
  "C# Minor": {
    semitones: [0, 2, 3, 5, 7, 8, 10, 12],
    notes: ["C#", "D#", "E", "F#", "G#", "A", "B", "C#"],
  },
  "G# Minor": {
    semitones: [0, 2, 3, 5, 7, 8, 10, 12],
    notes: ["G#", "A#", "B", "C#", "D#", "E", "F#", "G#"],
  },
  "D# Minor": {
    semitones: [0, 2, 3, 5, 7, 8, 10, 12],
    notes: ["D#", "E#", "F#", "G#", "A#", "B", "C#", "D#"],
  },
  "A# Minor": {
    semitones: [0, 2, 3, 5, 7, 8, 10, 12],
    notes: ["A#", "B#", "C#", "D#", "E#", "F#", "G#", "A#"],
  },
  "D Minor": {
    semitones: [0, 2, 3, 5, 7, 8, 10, 12],
    notes: ["D", "E", "F", "G", "A", "Bb", "C", "D"],
  },
  "G Minor": {
    semitones: [0, 2, 3, 5, 7, 8, 10, 12],
    notes: ["G", "A", "Bb", "C", "D", "Eb", "F", "G"],
  },
  "C Minor": {
    semitones: [0, 2, 3, 5, 7, 8, 10, 12],
    notes: ["C", "D", "Eb", "F", "G", "Ab", "Bb", "C"],
  },
  "F Minor": {
    semitones: [0, 2, 3, 5, 7, 8, 10, 12],
    notes: ["F", "G", "Ab", "Bb", "C", "Db", "Eb", "F"],
  },
  "Bb Minor": {
    semitones: [0, 2, 3, 5, 7, 8, 10, 12],
    notes: ["Bb", "C", "Db", "Eb", "F", "Gb", "Ab", "Bb"],
  },
  "Eb Minor": {
    semitones: [0, 2, 3, 5, 7, 8, 10, 12],
    notes: ["Eb", "F", "Gb", "Ab", "Bb", "Cb", "Db", "Eb"],
  },
  "Ab Minor": {
    semitones: [0, 2, 3, 5, 7, 8, 10, 12],
    notes: ["Ab", "Bb", "Cb", "Db", "Eb", "Fb", "Gb", "Ab"],
  },
};
