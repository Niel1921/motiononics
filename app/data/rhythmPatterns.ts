export interface RhythmPattern {
    id: string
    name: string
    description: string
    pattern: number[]
    velocities: number[]
  }
  
// List of all rhythm patterns for Play-for-me screen

export const rhythmPatternsByGenre: Record<string, RhythmPattern[]> = {
  pop: [
    {
      id: "pop-basic",
      name: "Straight Eighths",
      description: "Basic rhythm, equal spacing.",
      pattern: [1, 1, 1, 1, 1, 1, 1, 1],
      velocities: [0.7, 0.7, 0.7, 0.7, 0.7, 0.7, 0.7, 0.7],
    },
    {
      id: "pop-syncopation",
      name: "Pop Syncopation",
      description: "Pushes on offbeats.",
      pattern: [1, 0.5, 1, 0.5, 1, 0.5, 1, 0.5],
      velocities: [0.8, 0.6, 0.7, 0.5, 0.8, 0.6, 0.7, 0.5],
    },
    {
      id: "pop-long-short",
      name: "Long-Short Groove",
      description: "Alternating durations.",
      pattern: [1.5, 0.5, 1.5, 0.5, 1.5, 0.5, 1.5, 0.5],
      velocities: [0.8, 0.6, 0.7, 0.5, 0.8, 0.6, 0.7, 0.5],
    },
    {
      id: "pop-accented-quarters",
      name: "Quarter Groove",
      description: "Heavier on every beat.",
      pattern: [1, 1, 1, 1, 1, 1, 1, 1],
      velocities: [1, 0.6, 1, 0.6, 1, 0.6, 1, 0.6],
    },
  ],
  rock: [
    {
      id: "rock-straight",
      name: "Rock Eighths",
      description: "Driving straight 8s.",
      pattern: [1, 1, 1, 1, 1, 1, 1, 1],
      velocities: [0.9, 0.5, 0.9, 0.5, 0.9, 0.5, 0.9, 0.5],
    },
    {
      id: "rock-half-time",
      name: "Half-Time Feel",
      description: "Spacey, laid back rock.",
      pattern: [2, 1, 1, 2, 1, 1, 2, 1],
      velocities: [0.8, 0.4, 0.6, 0.8, 0.4, 0.6, 0.9, 0.5],
    },
    {
      id: "rock-syncopated",
      name: "Rock Syncopation",
      description: "Accent off-beats.",
      pattern: [0.5, 1.5, 0.5, 1.5, 0.5, 1.5, 0.5, 1.5],
      velocities: [0.6, 0.9, 0.6, 0.9, 0.6, 0.9, 0.6, 0.9],
    },
    {
      id: "rock-stomp",
      name: "Stomp Groove",
      description: "Quarter stomp rhythm.",
      pattern: [1, 1, 1, 1, 1, 1, 1, 1],
      velocities: [1, 0.4, 1, 0.4, 1, 0.4, 1, 0.4],
    },
  ],
  funk: [
    {
      id: "funk-basic",
      name: "Funk Straight",
      description: "Even funk hits.",
      pattern: [1, 1, 1, 1, 1, 1, 1, 1],
      velocities: [0.8, 0.5, 0.9, 0.6, 0.8, 0.5, 0.9, 0.6],
    },
    {
      id: "funk-syncopated",
      name: "Funk Syncopation",
      description: "Heavy on offbeats.",
      pattern: [0.5, 1.5, 0.5, 1.5, 0.5, 1.5, 0.5, 1.5],
      velocities: [0.7, 1, 0.6, 0.9, 0.7, 1, 0.6, 0.9],
    },
    {
      id: "funk-triplet",
      name: "Triplet Feel",
      description: "Swung groove.",
      pattern: [0.66, 0.54, 0.66, 0.54, 0.66, 0.54, 0.66, 0.54],
      velocities: [0.8, 0.6, 0.8, 0.6, 0.8, 0.6, 0.8, 0.6],
    },
    {
      id: "funk-perc",
      name: "Percussive Funk",
      description: "Dynamic percussive hits.",
      pattern: [1, 1, 1, 1, 1, 1, 1, 1],
      velocities: [1, 0.3, 0.7, 1, 0.3, 0.7, 1, 0.5],
    },
  ],
  jazz: [
    {
      id: "jazz-straight",
      name: "Jazz Even",
      description: "Straight jazz feel.",
      pattern: [1, 1, 1, 1, 1, 1, 1, 1],
      velocities: [0.6, 0.6, 0.6, 0.6, 0.6, 0.6, 0.6, 0.6],
    },
    {
      id: "jazz-swing",
      name: "Swing Eighths",
      description: "Swung rhythm feel.",
      pattern: [0.66, 0.34, 0.66, 0.34, 0.66, 0.34, 0.66, 0.34],
      velocities: [0.9, 0.6, 0.9, 0.6, 0.9, 0.6, 0.9, 0.6],
    },
    {
      id: "jazz-backbeat",
      name: "Jazz Backbeat",
      description: "Accent on 2 & 4.",
      pattern: [1, 1, 1, 1, 1, 1, 1, 1],
      velocities: [0.3, 0.9, 0.3, 0.9, 0.3, 0.9, 0.3, 0.9],
    },
    {
      id: "jazz-sync",
      name: "Syncopated Jazz",
      description: "Pushes before the beat.",
      pattern: [1.5, 0.5, 1.5, 0.5, 1.5, 0.5, 1.5, 0.5],
      velocities: [0.8, 0.5, 0.7, 0.4, 0.8, 0.5, 0.7, 0.4],
    },
  ],
  blues: [
    {
      id: "blues-basic",
      name: "Shuffle Feel",
      description: "Classic blues shuffle.",
      pattern: [0.66, 0.34, 0.66, 0.34, 0.66, 0.34, 0.66, 0.34],
      velocities: [0.9, 0.5, 0.9, 0.5, 0.9, 0.5, 0.9, 0.5],
    },
    {
      id: "blues-slow",
      name: "Slow Blues",
      description: "Laid-back rhythm.",
      pattern: [1, 1, 1, 1, 1, 1, 1, 1],
      velocities: [0.6, 0.3, 0.6, 0.3, 0.6, 0.3, 0.6, 0.3],
    },
    {
      id: "blues-accented",
      name: "Backbeat Accents",
      description: "Snare on 2 & 4 feel.",
      pattern: [1, 1, 1, 1, 1, 1, 1, 1],
      velocities: [0.4, 0.8, 0.4, 0.9, 0.4, 0.8, 0.4, 0.9],
    },
    {
      id: "blues-stomp",
      name: "Stomp Groove",
      description: "Rhythmic stomp blues.",
      pattern: [1.5, 0.5, 1.5, 0.5, 1.5, 0.5, 1.5, 0.5],
      velocities: [0.9, 0.4, 0.8, 0.3, 0.9, 0.4, 0.8, 0.3],
    },
  ],
  latin: [
    {
      id: "latin-basic",
      name: "Clave Straight",
      description: "Even Latin hits.",
      pattern: [1, 1, 1, 1, 1, 1, 1, 1],
      velocities: [0.7, 0.7, 0.7, 0.7, 0.7, 0.7, 0.7, 0.7],
    },
    {
      id: "latin-sync",
      name: "Clave Syncopated",
      description: "3-2 clave-inspired.",
      pattern: [1, 0.5, 0.5, 1, 1, 0.5, 0.5, 1],
      velocities: [0.9, 0.6, 0.5, 0.8, 0.9, 0.6, 0.5, 0.8],
    },
    {
      id: "latin-tumbao",
      name: "Tumbao Feel",
      description: "Bass and clave combo rhythm.",
      pattern: [1.5, 0.5, 1.5, 0.5, 1.5, 0.5, 1.5, 0.5],
      velocities: [0.8, 0.6, 0.9, 0.5, 0.8, 0.6, 0.9, 0.5],
    },
    {
      id: "latin-ride",
      name: "Bossa Groove",
      description: "Light Bossa ride rhythm.",
      pattern: [1, 1, 1, 1, 1, 1, 1, 1],
      velocities: [0.5, 0.7, 0.5, 0.7, 0.5, 0.7, 0.5, 0.7],
    },
  ],
}
