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
        name: "Sunshine Doubles",
        description: "The classic pop progression repeated twice for emotional impact.",
        romanArray: ["I", "V", "vi", "IV", "I", "V", "vi", "IV"],
      },
      {
        id: "pop2",
        name: "Sentimental Journey",
        description: "A complete emotional journey across 8 total beats.",
        romanArray: ["I", "iii", "vi", "IV", "ii", "V", "I", "I"],
      },
      {
        id: "pop3",
        name: "Descending Dreams",
        description: "A step-by-step descent followed by an uplifting conclusion.",
        romanArray: ["vi", "V", "IV", "iii", "ii", "I", "IV", "V"],
      },
      {
        id: "pop4",
        name: "Eternal Carousel",
        description: "A cyclical progression that creates a feeling of perpetual motion.",
        romanArray: ["I", "vi", "ii", "V", "I", "vi", "ii", "V"],
      },
    ],
    rock: [
      {
        id: "rock1",
        name: "Thunder Road",
        description: "Driving rock energy, repeated twice for 8 powerful beats.",
        romanArray: ["I", "bVII", "IV", "I", "I", "bVII", "IV", "I"],
      },
      {
        id: "rock2",
        name: "Teenage Anthem",
        description: "Emotionally charged progression repeated for 8 beats.",
        romanArray: ["I", "V", "vi", "IV", "I", "V", "vi", "IV"],
      },
      {
        id: "rock3",
        name: "Darkside Roundabout",
        description: "A minor key circular pattern with a brooding feel.",
        romanArray: ["i", "bVII", "bVI", "bVII", "i", "bVII", "bVI", "bVII"],
      },
      {
        id: "rock4",
        name: "Southern Crossroads",
        description: "A bluesy rock pattern with a classic road-trip feel.",
        romanArray: ["I", "IV", "I", "V", "IV", "I", "V", "I"],
      },
    ],
    funk: [
      {
        id: "funk1",
        name: "Groovy Bounce",
        description: "Energetic funk vamp with a perfect balance of tension and release.",
        romanArray: ["I7", "IV7", "I7", "V7", "I7", "IV7", "V7", "I7"],
      },
      {
        id: "funk2",
        name: "Double Step",
        description: "A repeating pattern that builds tension before resolving.",
        romanArray: ["ii7", "V7", "ii7", "V7", "ii7", "V7", "I7", "I7"],
      },
      {
        id: "funk3",
        name: "Mountain Ascent",
        description: "A climbing pattern that peaks before gracefully descending home.",
        romanArray: ["I7", "ii7", "iii7", "IV7", "V7", "IV7", "ii7", "I7"],
      },
      {
        id: "funk4",
        name: "Soul Foundations",
        description: "Steady groove with small punctuated moments.",
        romanArray: ["I7", "I7", "IV7", "I7", "IV7", "I7", "V7", "I7"],
      },
    ],
    jazz: [
      {
        id: "jazz1",
        name: "Midnight Resolution",
        description: "Jazz pattern that resolves over 8 steps.",
        romanArray: ["ii", "V", "I", "vi", "ii", "V", "I", "I"],
      },
      {
        id: "jazz2",
        name: "Broadway Echoes",
        description: "Classic show tune pattern repeated for 8 steps (2 complete cycles).",
        romanArray: ["I", "VI", "ii", "V", "I", "VI", "ii", "V"],
      },
      {
        id: "jazz3",
        name: "Giant Spirals",
        description: "An unusual modal pattern with a spiral-like tonal quality.",
        romanArray: ["I", "bIII", "V", "I", "bIII", "V", "I", "I"],
      },
      {
        id: "jazz4",
        name: "Falling Leaves",
        description: "A descending pattern moving by whole steps with shifting tonality.",
        romanArray: ["ii", "V", "I", "bii", "bV", "bI", "ii", "V"],
      },
    ],
    blues: [
      {
        id: "blues1",
        name: "Roadhouse Special",
        description: "Classic blues feeling condensed into 8 expressive steps.",
        romanArray: ["I7", "IV7", "I7", "I7", "IV7", "IV7", "I7", "V7"],
      },
      {
        id: "blues2",
        name: "Whiskey Ending",
        description: "A blues pattern that emphasizes the classic ending turnaround.",
        romanArray: ["I7", "IV7", "I7", "V7", "IV7", "I7", "V7", "I7"],
      },
      {
        id: "blues3",
        name: "Dusty Boots",
        description: "A shuffled pattern with a dusty, road-worn feeling.",
        romanArray: ["I7", "I7", "IV7", "IV7", "I7", "V7", "IV7", "I7"],
      },
      {
        id: "blues4",
        name: "Mississippi Sunset",
        description: "A slow, expressive pattern with subtle embellishments.",
        romanArray: ["I7", "I7", "I7", "I7", "IV7", "IV7", "I7", "V7"],
      },
    ],
    latin: [
      {
        id: "latin1",
        name: "Tropical Waves",
        description: "A flowing pattern with repeating waves of tension and release.",
        romanArray: ["I", "IV", "V", "I", "IV", "V", "I", "V"],
      },
      {
        id: "latin2",
        name: "Rio Nights",
        description: "A sophisticated jazz-influenced Latin pattern with smooth movement.",
        romanArray: ["ii", "V", "I", "vi", "ii", "V", "I", "I"],
      },
      {
        id: "latin3",
        name: "Havana Sunset",
        description: "A vibrant, colorful four-chord pattern that repeats with flair.",
        romanArray: ["I7", "IV7", "V7", "I7", "IV7", "V7", "I7", "V7"],
      },
      {
        id: "latin4",
        name: "Carnival Rhythms",
        description: "A celebratory pattern with a distinctive rhythmic quality.",
        romanArray: ["I", "vi", "IV", "V", "I", "ii", "V", "I"],
      },
    ],
  }