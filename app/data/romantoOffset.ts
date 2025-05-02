// romanToOffset.ts - FIXED VERSION
// Maps Roman numerals to offset positions in the chord array

export const romanToOffsetMajor: Record<string, number> = {
  // Basic major scale Roman numerals - position in the chord array
  "I": 0,    // Tonic (C in C major)
  "ii": 1,   // Supertonic (D minor in C major)
  "iii": 2,  // Mediant (E minor in C major)
  "IV": 3,   // Subdominant (F in C major)
  "V": 4,    // Dominant (G in C major)
  "vi": 5,   // Submediant (A minor in C major)
  "vii°": 6, // Leading tone (B diminished in C major)
  
  // Seventh chords
  "I7": 0,
  "IV7": 3,
  "V7": 4,
  "ii7": 1,
  "iii7": 2,
  "vi7": 5,
  "vii7": 6,
  
  // Flat chords (require special handling)
  "bVII": 6, 
  "bIII": 2, // These are approximations for now
  "bVI": 5,  // These are approximations for now
  "bii": 1,  // These are approximations for now
  "bV": 4,   // These are approximations for now
  "bI": 0,   // These are approximations for now
  
  // Alternate notation forms (for fallback)
  "i": 0,
  "II": 1,
  "III": 2,
  "iv": 3,
  "v": 4,
  "VI": 5,
  "VII": 6,
  "viio": 6,
  "vii": 6
};

export const romanToOffsetMinor: Record<string, number> = {
  // Basic minor scale Roman numerals - position in the chord array
  "i": 0,   // Tonic (A in A minor)
  "ii°": 1, // Supertonic (B diminished in A minor)
  "III": 2, // Mediant (C in A minor)
  "iv": 3,  // Subdominant (D minor in A minor)
  "v": 4,   // Dominant (E minor in A minor)
  "VI": 5,  // Submediant (F in A minor)
  "VII": 6, // Subtonic (G in A minor)
  
  // Seventh chords
  "i7": 0,
  "iv7": 3,
  "v7": 4,
  "ii7": 1,
  "III7": 2,
  "VI7": 5,
  "VII7": 6,
  
  // Flat chords (requires special handling)
  "bVII": 6, // These are approximations for now
  "bIII": 2, // These are approximations for now
  "bVI": 5,  // These are approximations for now
  
  // Alternate notation forms
  "I": 0,
  "II": 1,
  "iii": 2,
  "IV": 3,
  "V": 4,
  "vi": 5,
  "vii": 6,
  "iio": 1,
  "ii": 1
};

/**
 * Get the offset position for a Roman numeral in the chord array
 * @param symbol The Roman numeral (e.g., "I", "V", "vi")
 * @param isMajor Whether the key is major (true) or minor (false)
 * @returns The offset position in the chord array
 */
export function getOffsetFromMap(symbol: string, isMajor: boolean): number {
  // First try direct lookup in the appropriate map
  const map = isMajor ? romanToOffsetMajor : romanToOffsetMinor;
  
  // Direct lookup in the map
  let val = map[symbol];
  if (val !== undefined) {
    return val;
  }
  
  // For flat chords, we need special handling
  if (symbol.startsWith("b")) {
    const baseSymbol = symbol.substring(1);
    // Try to look up the base numeral without the flat
    const baseOffset = getOffsetFromMap(baseSymbol, isMajor);
    
    // For now, return the base offset - in a complete implementation
    // we'd calculate the proper flattened chord
    return baseOffset;
  }
  
  // Try flipping case (for minor/major ambiguity)
  const alt = isMajor 
    ? symbol.toLowerCase() 
    : symbol.toUpperCase();
  val = map[alt];
  if (val !== undefined) {
    return val;
  }
  
  // Last resort: try to match by stripping decorations and using base numeral
  const baseSymbol = symbol
    .replace(/°|o|7|M|m|maj|min/g, '') // Remove quality indicators
    .replace(/b|#/g, '');              // Remove accidentals
    
  // Match by Roman numeral value
  switch (baseSymbol.toUpperCase()) {
    case 'I': return 0;
    case 'II': return 1;
    case 'III': return 2;
    case 'IV': return 3;
    case 'V': return 4;
    case 'VI': return 5;
    case 'VII': return 6;
    default:
      console.warn(`Unknown Roman numeral: ${symbol}. Using tonic as fallback.`);
      return 0; // Default to tonic if all else fails
  }
}

// Add a debugging utility to help verify the mapping
export function debugRomanNumeral(roman: string, keyName: string) {
  const isMajor = keyName.includes("Major");
  const offset = getOffsetFromMap(roman, isMajor);
  console.log(`Roman: ${roman}, Key: ${keyName}, Offset: ${offset}`);
  return offset;
}