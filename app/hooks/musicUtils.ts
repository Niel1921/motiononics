// musicUtils.ts

import { keySignatures } from "../data/keySignatures"
import { getOffsetFromMap } from "../data/romantoOffset"

export interface ChordInfo {
  name: string
  roman: string
}

/**
 * Given a cell index (0–8), a key name ("C Major", "A Minor", etc.)
 * and a Roman pattern array, build the 8-chord sequence.
 * Now supports seventh chords and flattened chords.
 */
export function buildEightChordsFromCell(
  cellIndex: number,
  keyName: string,
  romanPattern: string[]
): string[] {
  const chordsInKey = getChordsForKey(keyName);
  if (chordsInKey.length < 9) return [];

  const isMajor = keyName.includes("Major");
  
  // Fix for the bottom middle Cmaj cell
  if (cellIndex === 7) { 
    cellIndex = 0; // Treat it as the top left cell (tonic)
  }
  
  return romanPattern.map((symbol) => {
    // Get the offset for this Roman numeral
    const offset = getOffsetFromMap(symbol, isMajor);
    
    // Calculate the target chord index (wrapping around if needed)
    const targetIndex = (cellIndex + offset) % chordsInKey.length;
    
    // Get the base chord name at that position
    let chordName = chordsInKey[targetIndex]?.name || chordsInKey[cellIndex].name;
    
    // Check if we need to modify the chord name for 7th chords
    if (symbol.includes("7")) {
      // Remove any existing quality suffix
      chordName = chordName.replace(/maj|min|dim/g, "");
      // Add "7" to the chord name
      chordName += "7";
    }
    
    // Check if we need to flatten the chord (for bVII, bIII, etc.)
    if (symbol.startsWith("b")) {
      // Extract the root note from the chord
      const rootNote = chordName.charAt(0);
      const hasAccidental = chordName.charAt(1) === '#' || chordName.charAt(1) === 'b';
      const accidental = hasAccidental ? chordName.charAt(1) : '';
      const restOfChord = hasAccidental ? chordName.substring(2) : chordName.substring(1);
      
      // Create a flatted version of the chord
      let newRoot;
      if (accidental === '#') {
        // A flattened sharp is just the natural note
        newRoot = rootNote;
      } else if (accidental === 'b') {
        // A double-flattened note (rare, but possible)
        // Using a simplification here - this would need a proper accidental system for full correctness
        newRoot = getFlattenedNote(rootNote + 'b');
      } else {
        // Flatten a natural note
        newRoot = getFlattenedNote(rootNote);
      }
      
      chordName = newRoot + restOfChord;
    }
    
    return chordName;
  });
}

/**
 * Helper function to flatten a note
 */
function getFlattenedNote(note: string): string {
  // This is a simplified flattening - a complete implementation would consider
  // proper enharmonic equivalents based on key signature
  const notes = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
  
  // Handle notes with accidentals
  if (note.length > 1 && note[1] === 'b') {
    // Already has a flat, so we're adding another flat (double flat)
    return note + 'b';
  }
  
  const noteIndex = notes.indexOf(note[0]);
  if (noteIndex === -1) return note; // Unknown note
  
  // Special cases: B→Bb, E→Eb
  if (note === 'E') return 'Eb';
  if (note === 'B') return 'Bb';
  
  // For other notes, return the previous note with a sharp
  const prevNoteIndex = (noteIndex - 1 + notes.length) % notes.length;
  return notes[prevNoteIndex] + '#';
}


export function getChordsForKey(keyName: string): ChordInfo[] {
  let k = keyName;
  if (k === "None") k = "C Major";
  const sig = keySignatures[k];
  if (!sig) return [];

  let chords: string[], romans: string[];
  let seventhChords: string[], seventhRomans: string[];
  let flatChords: string[], flatRomans: string[];

  if (k.includes("Major")) {
    // Standard diatonic chords in major keys
    chords = [
      sig.notes[0] + "maj", // I
      sig.notes[1] + "min", // ii
      sig.notes[2] + "min", // iii
      sig.notes[3] + "maj", // IV
      sig.notes[4] + "maj", // V
      sig.notes[5] + "min", // vi
      sig.notes[6] + "dim", // vii°
      sig.notes[0] + "maj", // I (repeat)
      sig.notes[4] + "maj", // V (repeat)
    ];
    romans = ["I", "ii", "iii", "IV", "V", "vi", "vii°", "I", "V"];

    // Seventh chords in major keys
    seventhChords = [
      sig.notes[0] + "maj7", // Imaj7
      sig.notes[1] + "min7", // ii7
      sig.notes[2] + "min7", // iii7
      sig.notes[3] + "maj7", // IVmaj7
      sig.notes[4] + "7",    // V7 (dominant)
      sig.notes[5] + "min7", // vi7
      sig.notes[6] + "min7b5", // vii7 (half-diminished)
    ];
    seventhRomans = ["Imaj7", "ii7", "iii7", "IVmaj7", "V7", "vi7", "vii7"];

    // Flat chords commonly used in major keys
    flatChords = [
      flattenNote(sig.notes[2]) + "maj", // bIII
      flattenNote(sig.notes[5]) + "maj", // bVI
      flattenNote(sig.notes[6]) + "maj", // bVII
    ];
    flatRomans = ["bIII", "bVI", "bVII"];
  } else {
    // assume minor
    // Standard diatonic chords in minor keys
    chords = [
      sig.notes[0] + "min",
      sig.notes[1] + "dim",
      sig.notes[2] + "maj",
      sig.notes[3] + "min",
      sig.notes[4] + "min",
      sig.notes[5] + "maj",
      sig.notes[6] + "maj",
      sig.notes[0] + "min",
      sig.notes[4] + "min",
    ];
    romans = ["i", "ii°", "III", "iv", "v", "VI", "VII", "i", "v"];

    // Seventh chords in minor keys
    seventhChords = [
      sig.notes[0] + "min7", // i7
      sig.notes[1] + "min7b5", // ii7 (half-diminished)
      sig.notes[2] + "maj7", // IIImaj7
      sig.notes[3] + "min7", // iv7
      sig.notes[4] + "min7", // v7
      sig.notes[5] + "maj7", // VImaj7
      sig.notes[6] + "7",    // VII7 (dominant)
    ];
    seventhRomans = ["i7", "ii7", "III7", "iv7", "v7", "VI7", "VII7"];

    // Flat chords commonly used in minor keys
    flatChords = [
      flattenNote(sig.notes[2]) + "maj", // bIII
      flattenNote(sig.notes[5]) + "maj", // bVI
      flattenNote(sig.notes[6]) + "maj", // bVII
    ];
    flatRomans = ["bIII", "bVI", "bVII"];
  }

  // Return the base chords - the other specialized chords will be constructed as needed
  return chords.map((c, i) => ({ name: c, roman: romans[i] }));
}

/**
 * Helper function to flatten a note
 */
function flattenNote(note: string): string {
  if (note.includes('#')) {
    // A flattened sharp is just the natural note
    return note.replace('#', '');
  }
  
  // For natural notes
  const noteMap: Record<string, string> = {
    'C': 'B',
    'D': 'Db',
    'E': 'Eb',
    'F': 'E',
    'G': 'Gb',
    'A': 'Ab',
    'B': 'Bb'
  };
  
  return noteMap[note] || note;
}

/**
 * Given a chord name like "C#min", "Ebmaj", "G7", or "Dbdim", return an array of semitone offsets.
 * Handles major, minor, diminished, and seventh chords including flattened roots.
 */
export function getNotesForChord(chordName: string): number[] {
  // Parse root note and accidental
  const root = chordName.charAt(0);
  let accidental = "";
  let idx = 1;
  
  if (chordName[idx] === "#" || chordName[idx] === "b") {
    accidental = chordName[idx];
    idx++;
  }
  
  const rootKey = root + accidental;
  const tail = chordName.slice(idx);

  // Determine chord type
  const isMinor = tail.startsWith("min");
  const isDim = tail.startsWith("dim");
  const isSeventh = tail.includes("7");
  
  // Root note semitone mapping
  const rootOffsets: Record<string, number> = {
    C: 0, "C#": 1, Db: 1,
    D: 2, "D#": 3, Eb: 3,
    E: 4, F: 5, "F#": 6, Gb: 6,
    G: 7, "G#": 8, Ab: 8,
    A: 9, "A#": 10, Bb: 10,
    B: 11,
  };
  
  const base = rootOffsets[rootKey] ?? 0;
  const intervals: number[] = [0]; // Root note
  
  // Add appropriate intervals based on chord type
  if (isDim) {
    intervals.push(3, 6); // Minor third and diminished fifth
    if (isSeventh) {
      intervals.push(9); // Diminished seventh (double flat 7th)
    }
  } else if (isMinor) {
    intervals.push(3, 7); // Minor third and perfect fifth
    if (isSeventh) {
      intervals.push(10); // Minor seventh
    }
  } else {
    intervals.push(4, 7); // Major third and perfect fifth
    if (isSeventh) {
      intervals.push(10); // Dominant seventh (minor 7th over major triad)
    }
  }

  return intervals.map((i) => base + i);
}

/**
 * Convert a semitone number (0 = C) into a note+octave like "G#4".
 */
export function semitoneToNoteName(semitone: number): string {
  const names = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]
  const octave = Math.floor(semitone / 12) + 4
  const note = names[semitone % 12]
  return `${note}${octave}`
}
