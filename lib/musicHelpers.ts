// lib/musicHelpers.ts

import { NOTE_TO_SEMITONE } from "./constants";
import { keySignatures } from "../app/data/keySignatures";

// Snap a raw chromatic index into your selected key’s scale
export function snapChromaticToKey(chromatic:number, key:string):number {
  if (key==="None") return chromatic;
  const notes = keySignatures[key]?.notes;
  if (!notes) return chromatic;
  const scale = notes
    .map(n=>NOTE_TO_SEMITONE[n])
    .filter((v): v is number => Number.isFinite(v))
    .sort((a,b)=>a-b);
  if (!scale.length) return chromatic;
  for (const s of scale) if (s>=chromatic) return s;
  return scale[scale.length-1];
}

// Build your 3×3 chord grid for a key
export function getChordsForKey(key:string) {
  if (!keySignatures[key] && key!=="None") return [];
  if (key==="None") key="C Major";
  const sig = keySignatures[key];
  const isMajor = key.includes("Major");
  const pattern = isMajor
    ? [0,1,2,3,4,5,6,0,4]
    : [0,1,2,3,4,5,6,0,4];
  const chords = pattern.map(i=>
    sig.notes[i] + (isMajor
      ? (i===1||i===2||i===5 ? "min" : (i===6?"dim":"maj"))
      : (i===0||i===3||i===4 ? "min" : (i===1?"dim":"maj")))
  );
  const roman = isMajor
    ? ["I","ii","iii","IV","V","vi","vii°","I","V"]
    : ["i","ii°","III","iv","v","VI","VII","i","v"];
  return chords.map((c,i)=>({name:c,roman:roman[i]}));
}

// Map a normalized Y (0–1) → guitar string index (0–5)
export function getStringIndexFromY(y:number, spacing:number):number {
  const top=0.25, bottom=top+0.5*spacing;
  const c = Math.min(Math.max(y,top),bottom);
  return Math.floor(((c-top)/(bottom-top))*6);
}

// Is this the back of the hand? (cross-product z>0)
export function isBackOfHand(lm:{x:number,y:number,z?:number}[]):boolean {
  if (lm.length<18) return false;
  const wrist=lm[0], idx=lm[5], pinky=lm[17];
  const v1 = {x:idx.x-wrist.x, y:idx.y-wrist.y, z:(idx.z||0)-(wrist.z||0)};
  const v2 = {x:pinky.x-wrist.x,y:pinky.y-wrist.y,z:(pinky.z||0)-(wrist.z||0)};
  return v1.x*v2.y - v1.y*v2.x > 0;
}

// Average hand position for canvas mapping
export function getHandPosition(lm:{x:number,y:number}[]) {
  const sum = lm.reduce((a,b)=>({x:a.x+b.x,y:a.y+b.y}),{x:0,y:0});
  return { x:1 - sum.x/lm.length, y:sum.y/lm.length };
}
