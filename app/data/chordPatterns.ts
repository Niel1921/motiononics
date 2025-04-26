// chordPatterns.ts

export interface ChordPattern {
    id: string
    name: string
    description: string
    romanArray: string[]
  }
  
  export const chordPatternsByGenre: Record<string, ChordPattern[]> = {
    pop: [
      {
        id: "pop1",
        name: "Pop 8: I–V–vi–IV (x2)",
        description: "8-step cycle: I, V, vi, IV repeated twice.",
        romanArray: ["I", "V", "vi", "IV", "I", "V", "vi", "IV"],
      },
      {
        id: "pop2",
        name: "Pop Ballad Extended",
        description: "I–iii–vi–IV–ii–V–I–I, 8 total beats.",
        romanArray: ["I", "iii", "vi", "IV", "ii", "V", "I", "I"],
      },
      {
        id: "pop3",
        name: "Pop Walkdown",
        description: "vi–V–IV–iii–ii–I–IV–V",
        romanArray: ["vi", "V", "IV", "iii", "ii", "I", "IV", "V"],
      },
      {
        id: "pop4",
        name: "Pop Circle",
        description: "I–vi–ii–V progression loop",
        romanArray: ["I", "vi", "ii", "V", "I", "vi", "ii", "V"],
      },
    ],
    rock: [
      {
        id: "rock1",
        name: "Rock 8: I–bVII–IV–I (x2)",
        description: "Driving rock, repeated twice for 8 beats.",
        romanArray: ["I", "bVII", "IV", "I", "I", "bVII", "IV", "I"],
      },
      {
        id: "rock2",
        name: "Pop Punk 8",
        description: "I–V–vi–IV repeated for 8 beats.",
        romanArray: ["I", "V", "vi", "IV", "I", "V", "vi", "IV"],
      },
      {
        id: "rock3",
        name: "Minor Rock Turnaround",
        description: "i–bVII–bVI–bVII, repeat",
        romanArray: ["i", "bVII", "bVI", "bVII", "i", "bVII", "bVI", "bVII"],
      },
      {
        id: "rock4",
        name: "Bluesy Rock I–IV–V",
        description: "I–IV–I–V–IV–I–V–I",
        romanArray: ["I", "IV", "I", "V", "IV", "I", "V", "I"],
      },
    ],
    funk: [
      {
        id: "funk1",
        name: "Funk Vamp (8 beats)",
        description: "I7–IV7–I7–V7–I7–IV7–V7–I7",
        romanArray: ["I7", "IV7", "I7", "V7", "I7", "IV7", "V7", "I7"],
      },
      {
        id: "funk2",
        name: "Funk II-V vamp",
        description: "ii7–V7 repeated, then I7, for 8 beats",
        romanArray: ["ii7", "V7", "ii7", "V7", "ii7", "V7", "I7", "I7"],
      },
      {
        id: "funk3",
        name: "Funk Climb",
        description: "I7–ii7–iii7–IV7–V7–IV7–ii7–I7",
        romanArray: ["I7", "ii7", "iii7", "IV7", "V7", "IV7", "ii7", "I7"],
      },
      {
        id: "funk4",
        name: "James Brown Style",
        description: "I7-based with IV7 stabs",
        romanArray: ["I7", "I7", "IV7", "I7", "IV7", "I7", "V7", "I7"],
      },
    ],
    jazz: [
      {
        id: "jazz1",
        name: "Jazz ii–V–I Extended",
        description: "ii–V–I–vi–ii–V–I–I (8 steps)",
        romanArray: ["ii", "V", "I", "vi", "ii", "V", "I", "I"],
      },
      {
        id: "jazz2",
        name: "Rhythm Changes Lite",
        description: "I–VI–ii–V repeated for 8 steps (2 cycles).",
        romanArray: ["I", "VI", "ii", "V", "I", "VI", "ii", "V"],
      },
      {
        id: "jazz3",
        name: "Coltrane Circle",
        description: "I–bIII–V–I–bIII–V–I–I",
        romanArray: ["I", "bIII", "V", "I", "bIII", "V", "I", "I"],
      },
      {
        id: "jazz4",
        name: "Descending ii–V",
        description: "ii–V–I moving by whole steps",
        romanArray: ["ii", "V", "I", "bii", "bV", "bI", "ii", "V"],
      },
    ],
    blues: [
      {
        id: "blues1",
        name: "12-Bar Blues Condensed",
        description: "Classic blues form in 8 steps.",
        romanArray: ["I7", "IV7", "I7", "I7", "IV7", "IV7", "I7", "V7"],
      },
      {
        id: "blues2",
        name: "Turnaround Focus",
        description: "I7–IV7–I7–V7–IV7–I7–V7–I7",
        romanArray: ["I7", "IV7", "I7", "V7", "IV7", "I7", "V7", "I7"],
      },
      {
        id: "blues3",
        name: "Shuffled Blues",
        description: "I7–I7–IV7–IV7–I7–V7–IV7–I7",
        romanArray: ["I7", "I7", "IV7", "IV7", "I7", "V7", "IV7", "I7"],
      },
      {
        id: "blues4",
        name: "Slow Blues Feel",
        description: "I7 vamp with embellishment",
        romanArray: ["I7", "I7", "I7", "I7", "IV7", "IV7", "I7", "V7"],
      },
    ],
    latin: [
      {
        id: "latin1",
        name: "Latin I–IV–V",
        description: "I–IV–V progression with repeats",
        romanArray: ["I", "IV", "V", "I", "IV", "V", "I", "V"],
      },
      {
        id: "latin2",
        name: "Bossa Nova",
        description: "ii–V–I style jazz Latin progression",
        romanArray: ["ii", "V", "I", "vi", "ii", "V", "I", "I"],
      },
      {
        id: "latin3",
        name: "Salsa Feel",
        description: "Imaj7–IV7–V7–Imaj7 loop",
        romanArray: ["I7", "IV7", "V7", "I7", "IV7", "V7", "I7", "V7"],
      },
      {
        id: "latin4",
        name: "Son Clave Inspired",
        description: "I–vi–IV–V–I–ii–V–I",
        romanArray: ["I", "vi", "IV", "V", "I", "ii", "V", "I"],
      },
    ],
  }
  