// lib/constants.ts
export const SAMPLE_URLS = {
    Closed_Fist: "/samples/fist.wav",
    None:       "/samples/guitarnew.wav",
  };
  
export const NOTE_TO_SEMITONE: { [k:string]: number } = {
    C:0, "B#":0, D:2, E:4, "Fb":4, F:5, "E#":5, G:7, A:9, B:11, "Cb":11,
    "C#":1, "Db":1, "D#":3, "Eb":3, "F#":6, "Gb":6, "G#":8, "Ab":8, "A#":10, "Bb":10,
  };
  
  
  export const MIN_SWIPE_DISTANCE = 0.07;
  
  export const GUITAR_STRING_MAPPING = [
    { semitoneOffset: -24 }, { semitoneOffset: -19 },
    { semitoneOffset: -14 }, { semitoneOffset: -9  },
    { semitoneOffset: -5  }, { semitoneOffset:  0  },
  ];
  