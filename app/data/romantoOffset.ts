
// Maps Roman numerals to their positions in the chord array

export const romanToOffsetMajor: Record<string, number> = {

  "I": 0, 
  "ii": 1,
  "iii": 2,
  "IV": 3,
  "V": 4,
  "vi": 5,
  "vii°": 6, 
  
  // Seventh chords
  "I7": 0,
  "IV7": 3,
  "V7": 4,
  "ii7": 1,
  "iii7": 2,
  "vi7": 5,
  "vii7": 6,
  
  "bVII": 6, 
  "bIII": 2,
  "bVI": 5,
  "bii": 1,
  "bV": 4,
  "bI": 0,
  
  // Alternate notation forms
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

// Minor version
export const romanToOffsetMinor: Record<string, number> = {

  "i": 0,
  "ii°": 1,
  "III": 2,
  "iv": 3,
  "v": 4,
  "VI": 5,
  "VII": 6,
  
  // Seventh chords
  "i7": 0,
  "iv7": 3,
  "v7": 4,
  "ii7": 1,
  "III7": 2,
  "VI7": 5,
  "VII7": 6,
  
  "bVII": 6,
  "bIII": 2,
  "bVI": 5,
  
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

// Get the offset position for a Roman numeral, adjusted for the chord grid

export function getOffsetFromMap(symbol: string, isMajor: boolean): number {
  const map = isMajor ? romanToOffsetMajor : romanToOffsetMinor;
    let val = map[symbol];
  if (val !== undefined) {
    return val;
  }
  
  if (symbol.startsWith("b")) {
    const baseSymbol = symbol.substring(1);
    const baseOffset = getOffsetFromMap(baseSymbol, isMajor);
    
    return (baseOffset - 1 + 7) % 7;
  }
  
  // Handle seventh chords if not in map
  if (symbol.endsWith("7") && !map[symbol]) {
    const baseSymbol = symbol.slice(0, -1);
    return getOffsetFromMap(baseSymbol, isMajor);
  }
    const alt = isMajor 
    ? symbol.toLowerCase() 
    : symbol.toUpperCase();
  val = map[alt];
  if (val !== undefined) {
    return val;
  }
  
  // Last resort: try to match by stripping decorations and using base numeral
  const baseSymbol = symbol
    .replace(/°|o|7|M|m|maj|min/g, '')
    .replace(/b|#/g, '');
    
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
      return 0;
  }
}
