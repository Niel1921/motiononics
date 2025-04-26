// romanToOffset.ts

export const romanToOffsetMajor: Record<string, number> = {
    I: 0,
    ii: 1,
    iii: 2,
    IV: 3,
    V: 4,
    vi: 5,
    "vii°": 6,
    I7: 0,
    IV7: 3,
    V7: 4,
    ii7: 1,
    vi7: 5,
    bVII: 6,
  }
  
  export const romanToOffsetMinor: Record<string, number> = {
    i: 0,
    "ii°": 1,
    III: 2,
    iv: 3,
    v: 4,
    VI: 5,
    VII: 6,
    i7: 0,
    iv7: 3,
    v7: 4,
    ii7: 1,
    III7: 2,
    VI7: 5,
    VII7: 6,
    bVII: 6,
  }
  
  /**
   * Look up a Roman numeral in the major/minor map,
   * falling back to flipped case if not found.
   */
  export function getOffsetFromMap(symbol: string, isMajor: boolean): number {
    const map = isMajor ? romanToOffsetMajor : romanToOffsetMinor
    let val = map[symbol]
    if (val === undefined) {
      const alt = isMajor ? symbol.toLowerCase() : symbol.toUpperCase()
      val = map[alt]
    }
    return val ?? 0
  }
  