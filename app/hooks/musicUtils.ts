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
 */
export function buildEightChordsFromCell(
  cellIndex: number,
  keyName: string,
  romanPattern: string[]
): string[] {
  const chordsInKey = getChordsForKey(keyName);
  if (chordsInKey.length < 9) return [];

  const isMajor = keyName.includes("Major");
  return romanPattern.map((symbol) => {
    // don’t normalize to uppercase—respect the case of “vi” vs “VI”
    const offset = getOffsetFromMap(symbol, isMajor);
    const targetIndex = (cellIndex + offset) % chordsInKey.length;
    return chordsInKey[targetIndex]?.name || chordsInKey[cellIndex].name;
  });
}

/**
 * Return the 9 chord names + Roman numerals for a given key.
 */
export function getChordsForKey(keyName: string): ChordInfo[] {
  let k = keyName
  if (k === "None") k = "C Major"
  const sig = keySignatures[k]
  if (!sig) return []

  let chords: string[], romans: string[]

  if (k.includes("Major")) {
    chords = [
      sig.notes[0] + "maj",
      sig.notes[1] + "min",
      sig.notes[2] + "min",
      sig.notes[3] + "maj",
      sig.notes[4] + "maj",
      sig.notes[5] + "min",
      sig.notes[6] + "dim",
      sig.notes[0] + "maj",
      sig.notes[4] + "maj",
    ]
    romans = ["I", "ii", "iii", "IV", "V", "vi", "vii°", "I", "V"]
  } else {
    // assume minor
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
    ]
    romans = ["i", "ii°", "III", "iv", "v", "VI", "VII", "i", "v"]
  }

  return chords.map((c, i) => ({ name: c, roman: romans[i] }))
}

/**
 * Given a chord name like "C#min" or "Ebmaj", return an array of semitone offsets.
 */
export function getNotesForChord(chordName: string): number[] {
  // parse root + accidental
  const root = chordName.charAt(0)
  let accidental = ""
  let idx = 1
  if (
    chordName[idx] === "#" ||
    chordName[idx] === "b"
  ) {
    accidental = chordName[idx]
    idx++
  }
  const rootKey = root + accidental
  const tail = chordName.slice(idx)

  const isMinor = tail.startsWith("min")
  const isDim = tail.startsWith("dim")

  const rootOffsets: Record<string, number> = {
    C: 0, "C#": 1, Db: 1,
    D: 2, "D#": 3, Eb: 3,
    E: 4, F: 5, "F#": 6, Gb: 6,
    G: 7, "G#": 8, Ab: 8,
    A: 9, "A#": 10, Bb: 10,
    B: 11,
  }
  const base = rootOffsets[rootKey] ?? 0
  const intervals = [0]

  if (isDim) {
    intervals.push(3, 6)
  } else if (isMinor) {
    intervals.push(3, 7)
  } else {
    intervals.push(4, 7)
  }

  return intervals.map((i) => base + i)
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
