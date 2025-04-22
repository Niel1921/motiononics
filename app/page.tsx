"use client";

import React, { useRef, useEffect, useState, useCallback } from "react";
import * as THREE from "three";
import Link from "next/link";
import { motion } from "framer-motion";
import { FilesetResolver, GestureRecognizer } from "@mediapipe/tasks-vision";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import ThreePianoVisualizer from "../components/ThreePianoVisualizer";
import ThreeGuitarVisualizer, { ThreeGuitarVisualizerHandle } from "../components/ThreeGuitarVisualizer";
import ThreeThereminVisualizer from "../components/ThreeThereminVisualizer";
import Header from "@/components/ui/header";
import { keySignatures } from "./data/keySignatures";
import CircleOfFifths from "../components/CircleOfFifths";
import Image from "next/image";

// -------------------- Constants --------------------
const sampleURLs: Record<string, string> = {
  Closed_Fist: "/samples/fist.wav",  
  None: "/samples/guitarnew.wav",       
};

const NOTE_TO_SEMITONE: Record<string, number> = {
  // Naturals & enharmonic equivalents
  C: 0,
  "B#": 0,
  D: 2,
  E: 4,
  "Fb": 4,
  F: 5,
  "E#": 5,
  G: 7,
  A: 9,
  B: 11,
  "Cb": 11,

  // Sharps ↔ Flats
  "C#": 1,  "Db": 1,
  "D#": 3,  "Eb": 3,
  "F#": 6,  "Gb": 6,
  "G#": 8,  "Ab": 8,
  "A#": 10, "Bb": 10,
};



function snapChromaticToKey(chromatic: number, keyName: string): number {
  if (keyName === "None") return chromatic;
  const names = keySignatures[keyName]?.notes;
  if (!names) return chromatic;

  // map → filter undefined → sort
  const scale = names
    .map(n => NOTE_TO_SEMITONE[n])
    .filter((s): s is number => Number.isFinite(s))
    .sort((a, b) => a - b);

  if (!scale.length) return chromatic;

  for (const note of scale) {
    if (note >= chromatic) return note;
  }
  return scale[scale.length - 1];
}

// Tweak this value as needed (in normalized coordinates)
const MIN_SWIPE_DISTANCE = 0.07;

const guitarStringMapping = [
  { semitoneOffset: -24 },
  { semitoneOffset: -19 },
  { semitoneOffset: -14 },
  { semitoneOffset: -9 },
  { semitoneOffset: -5 },
  { semitoneOffset: 0 },
];

// -------------------- Global Debounce Object --------------------
// Tracks which guitar strings are currently playing.
let playingStrings: Record<number, boolean> = {};



// -------------------- Chord Grid Visualizer --------------------
function ChordGridVisualizer({
  chords,
  currentCell,
}: {
  chords: { name: string; roman: string }[];
  currentCell: number | null;
}) {
  return (
    <div className="absolute top-0 left-0 w-[640px] h-[480px] grid grid-cols-3 grid-rows-3 gap-0 bg-white/40">
      {chords.map((chord, index) => (
        <div
          key={index}
          className={`border border-teal-500 flex flex-col items-center justify-center ${
            currentCell === index ? "bg-teal-300" : "bg-transparent"
          }`}
        >
          <div className="text-lg text-teal-800">{chord.name}</div>
          <div className="text-sm text-teal-600">{chord.roman}</div>
        </div>
      ))}
    </div>
  );
}

// -------------------- Helper: getChordsForKey --------------------
function getChordsForKey(keyName: string) {
  if (!keySignatures[keyName] && keyName !== "None") return [];
  let chords: string[] = [];
  let roman: string[] = [];
  if (keyName === "None") keyName = "C Major";
  if (keyName.includes("Major")) {
    const sig = keySignatures[keyName];
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
    ];
    roman = ["I", "ii", "iii", "IV", "V", "vi", "vii°", "I", "V"];
  } else if (keyName.includes("Minor")) {
    const sig = keySignatures[keyName];
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
    roman = ["i", "ii°", "III", "iv", "v", "VI", "VII", "i", "v"];
  }
  return chords.map((c, i) => ({ name: c, roman: roman[i] }));
}

// -------------------- Helper: getStringIndexFromY --------------------
function getStringIndexFromY(yNorm: number, spacing: number): number {
     const regionTop = 0.25;
     const regionBottom = regionTop + 0.5 * spacing; // Increase the effective region as spacing increases.
     const clampedY = Math.min(Math.max(yNorm, regionTop), regionBottom);
     const effectiveY = (clampedY - regionTop) / (regionBottom - regionTop);
     return Math.floor(effectiveY * 6);
   }

// -------------------- Helper: isBackOfHand --------------------
function isBackOfHand(handLandmarks: { x: number; y: number; z?: number }[]) {
  if (handLandmarks.length < 18) return false;
  const wrist = handLandmarks[0];
  const indexKnuckle = handLandmarks[5];
  const pinkyKnuckle = handLandmarks[17];

  const v1 = {
    x: indexKnuckle.x - wrist.x,
    y: indexKnuckle.y - wrist.y,
    z: (indexKnuckle.z ?? 0) - (wrist.z ?? 0),
  };
  const v2 = {
    x: pinkyKnuckle.x - wrist.x,
    y: pinkyKnuckle.y - wrist.y,
    z: (pinkyKnuckle.z ?? 0) - (wrist.z ?? 0),
  };

  const cross = {
    x: v1.y * v2.z - v1.z * v2.y,
    y: v1.z * v2.x - v1.x * v2.z,
    z: v1.x * v2.y - v1.y * v2.x,
  };

  // Back of hand is detected only when cross.z is positive.
  return cross.z > 0;
}

// We'll store the starting Y position for "None" gesture swipes.
let lastNoneY: number | null = null;


// -------------------- Helper: playGuitarString --------------------
// Plays the guitar note for a given string index using the "None" sample.
// Uses a linear gain ramp to sustain the note for the duration calculated from BPM and noteLength.
// Debounces so only one note per string plays at a time.
function playGuitarString(
  stringIndex: number,
  audioContext: AudioContext,
  samples: Record<string, AudioBuffer>,
  convolver: ConvolverNode | null,
  bpm: number,
  noteLength: number
) {
  if (!samples["None"]) {
    console.warn("Guitar sample not loaded.");
    return;
  }
  
  // Debounce: if this string is already playing, return early.
  if (playingStrings[stringIndex]) {
    console.log("String", stringIndex, "is already playing. Debouncing.");
    return;
  }
  
  playingStrings[stringIndex] = true;
  
  const sampleBuffer = samples["None"];
  const source = audioContext.createBufferSource();
  source.buffer = sampleBuffer;
  
  // Get the mapping for the given string index (default to high E if out of range)
  const mapping = guitarStringMapping[stringIndex] || guitarStringMapping[guitarStringMapping.length - 1];
  // Adjust playback rate based on semitone offset: 2^(semitoneOffset/12)
  source.playbackRate.value = Math.pow(2, mapping.semitoneOffset / 12);
  
  const gainNode = audioContext.createGain();
  gainNode.gain.value = 0.5; // Initial volume
  
  source.connect(gainNode);
  if (convolver) {
    gainNode.connect(convolver);
    convolver.connect(audioContext.destination);
  } else {
    gainNode.connect(audioContext.destination);
  }
  
  // Calculate duration in seconds from BPM and noteLength.
  const duration = (60 / bpm) * noteLength;
  // Sustain the note by ramping the gain to 0 over the duration.
  gainNode.gain.setValueAtTime(0.5, audioContext.currentTime);
  gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + duration);
  
  source.start();
  source.stop(audioContext.currentTime + duration + 0.1);

  
  // Reset debounce for this string after the note finishes.
  setTimeout(() => {
    playingStrings[stringIndex] = false;
  }, (duration + 0.1) * 1000);
}

// -------------------- Page Component --------------------
export default function Page() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  // guitarRef remains for visualization if needed.
  const guitarRef = useRef<ThreeGuitarVisualizerHandle>(null);

  const [gestureRecognizer, setGestureRecognizer] = useState<GestureRecognizer | null>(null);
  const [webcamEnabled, setWebcamEnabled] = useState(false);
  const [bpm, setBpm] = useState<number>(120);
  const [noteLength, setNoteLength] = useState<number>(1);
  const [selectedKey, setSelectedKey] = useState<string>("None");
  const [instrument, setInstrument] = useState<"piano" | "guitar" | "theremin">("piano");
  const [mode, setMode] = useState<"manual" | "autoChord" | "arpeggiator" >("manual");
  const [arpeggioOctaves, setArpeggioOctaves] = useState<number>(1);
  const [arpeggioDirection, setArpeggioDirection] = useState<"up" | "down" | "upDown">("up");
  const [currentNotes, setCurrentNotes] = useState<number[]>([]);
  const [currentChordCell, setCurrentChordCell] = useState<number | null>(null);
  const [handPos, setHandPos] = useState<{ x: number; y: number } | null>(null);
  const [stringSpacing, setStringSpacing] = useState<number>(1);

  // Theremin parameters (omitted for brevity)
  const [thereminFrequency, setThereminFrequency] = useState<number>(440);
  const [thereminVolume, setThereminVolume] = useState<number>(0);
  const [thereminVibrato, setThereminVibrato] = useState<number>(2);
  const [thereminWaveform, setThereminWaveform] = useState<string>("square");

  const availableSemitones = React.useMemo(() => {
    if (selectedKey === "None") return Array.from({length:12}, (_,i)=>i);
    return keySignatures[selectedKey].notes
      .map(n => NOTE_TO_SEMITONE[n]);
  }, [selectedKey]);

  // Audio-related refs
  const audioContextRef = useRef<AudioContext | null>(null);
  const samplesRef = useRef<Record<string, AudioBuffer>>({});
  const convolverRef = useRef<ConvolverNode | null>(null);
  const notePlayingRef = useRef<boolean>(false);

  // right after your `const [instrument, …] = useState…`
  const visualizerSizes: Record<"theremin" | "guitar" | "piano", string> = {
    theremin: "w-[640px] h-[790px]", 
    guitar:   "w-[640px] h-[280px]",    
    piano:    "w-[640px] h-[280px]",    
  };


  // ---------------------------------------------------------------------
  // INIT AUDIO
  // ---------------------------------------------------------------------
  const initAudio = useCallback(async () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    const audioCtx = audioContextRef.current;
    const samples: Record<string, AudioBuffer> = {};

    // Load samples
    for (const [gesture, url] of Object.entries(sampleURLs)) {
      try {
        const response = await fetch(url);
        if (!response.ok) {
          console.error(`Failed to fetch sample for ${gesture}: ${response.statusText}`);
          continue;
        }
        const arrayBuffer = await response.arrayBuffer();
        samples[gesture] = await audioCtx.decodeAudioData(arrayBuffer);
        console.log(`Loaded sample for gesture: ${gesture}`);
      } catch (error) {
        console.error(`Error loading sample for ${gesture}:`, error);
      }
    }
    samplesRef.current = samples;

    // Load impulse response (optional)
    try {
      const irResponse = await fetch("/samples/impulse.wav");
      if (irResponse.ok) {
        const irBuffer = await irResponse.arrayBuffer();
        const convolver = audioCtx.createConvolver();
        convolver.buffer = await audioCtx.decodeAudioData(irBuffer);
        convolverRef.current = convolver;
        console.log("Loaded impulse response for reverb.");
      } else {
        console.warn("Impulse response not found or couldn't be fetched.");
      }
    } catch (err) {
      console.error("Error loading impulse response:", err);
    }

  }, []);

  // ---------------------------------------------------------------------
  // INIT GESTURE
  // ---------------------------------------------------------------------
  const initGestureRecognizer = useCallback(async () => {
    try {
      console.log("Initializing gesture recognizer...");
      const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.1/wasm"
      );
      const recognizer = await GestureRecognizer.createFromOptions(vision, {
        baseOptions: { modelAssetPath: "https://storage.googleapis.com/mediapipe-tasks/gesture_recognizer/gesture_recognizer.task" },
        numHands: 2,
        runningMode: "VIDEO",
      });
      setGestureRecognizer(recognizer);
      console.log("Gesture recognizer initialized!");
    } catch (error) {
      console.error("Error initializing gesture recognizer:", error);
    }
  }, []);

  useEffect(() => {
    initGestureRecognizer();
    initAudio();
    return () => {
      gestureRecognizer?.close();
    };
  }, []);

  // ---------------------------------------------------------------------
  // CAMERA
  // ---------------------------------------------------------------------
  useEffect(() => {
    if (!webcamEnabled) return;
    const videoEl = videoRef.current;
    if (!videoEl) return;

    let stream: MediaStream | null = null;
    navigator.mediaDevices
      .getUserMedia({ video: true })
      .then((s) => {
        stream = s;
        videoEl.srcObject = s;
        return videoEl.play();
      })
      .catch((err) => console.error("Error playing video:", err));

    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [webcamEnabled]);

  // ---------------------------------------------------------------------
  // If WebGL context is lost
  // ---------------------------------------------------------------------
  useEffect(() => {
    const canvasEl = canvasRef.current;
    if (!canvasEl) return;

    const handleContextLost = (e: Event) => {
      e.preventDefault();
      console.warn("WebGL context lost; reinit gesture recognizer...");
      gestureRecognizer?.close();
      setGestureRecognizer(null);
      setTimeout(() => {
        initGestureRecognizer();
      }, 1000);
    };
    canvasEl.addEventListener("webglcontextlost", handleContextLost, false);
    return () => {
      canvasEl.removeEventListener("webglcontextlost", handleContextLost);
    };
  }, [gestureRecognizer, initGestureRecognizer]);

  // ---------------------------------------------------------------------
  // HELPER: average hand position
  // ---------------------------------------------------------------------
  function getHandPosition(landmarks: { x: number; y: number }[]) {
    const avg = landmarks.reduce((acc, lm) => ({ x: acc.x + lm.x, y: acc.y + lm.y }), { x: 0, y: 0 });
    return { x: 1 - avg.x / landmarks.length, y: avg.y / landmarks.length };
  }

  function updateHandPos(landmarks: { x: number; y: number }[]) {
    const pos = getHandPosition(landmarks);
    setHandPos(pos);
  }

  // ---------------------------------------------------------------------
  // Audio / chord / note helper functions (unchanged except for note length handling)
  // ---------------------------------------------------------------------
  function playNoteManual(
    gestureLabel: string,
    handPosition: { x: number; y: number }
  ) {
    const audioCtx = audioContextRef.current;
    if (!audioCtx || notePlayingRef.current) return;
    const sampleBuffer = samplesRef.current[gestureLabel];
    if (!sampleBuffer) return;
  
    const x = Math.max(0, Math.min(1, handPosition.x));
    const chromatic = Math.floor(x * 12);
    const semitone = snapChromaticToKey(chromatic, selectedKey);
    if (!Number.isFinite(semitone)) return;
  
    setCurrentNotes([semitone]);
    setTimeout(() => setCurrentNotes([]), 500);
  
    const duration = (60 / bpm) * noteLength;
    const source = audioCtx.createBufferSource();
    source.buffer = sampleBuffer;
    source.playbackRate.value = Math.pow(2, semitone / 12);
    const gainNode = audioCtx.createGain();
    const y = Math.max(0, Math.min(1, handPosition.y));
    gainNode.gain.value = 0.2 + (1 - y) * 0.8;    
    source.connect(gainNode);
    if (convolverRef.current) gainNode.connect(convolverRef.current).connect(audioCtx.destination);
    else gainNode.connect(audioCtx.destination);
  
    source.start();
    source.stop(audioCtx.currentTime + duration);
  
    notePlayingRef.current = true;
    setTimeout(() => { notePlayingRef.current = false; }, duration * 1000);
  }

  function playChordFromHandPosition(gestureLabel: string, pos: { x: number; y: number }) {
    if (gestureLabel !== "Closed_Fist") return;
    if (notePlayingRef.current) return;
    const cellX = Math.floor(pos.x * 3);
    const cellY = Math.floor(pos.y * 3);
    const cellIndex = cellX + cellY * 3;
    setCurrentChordCell(cellIndex);
    setTimeout(() => setCurrentChordCell(null), 500);
    const chords = getChordsForKey(selectedKey);
    const chordObj = chords[cellIndex];
    if (chordObj) playChord(chordObj.name);
  }

  function playArpeggioFromHandPosition(gestureLabel: string, pos: { x: number; y: number }) {
    if (gestureLabel !== "Closed_Fist") return;
    if (notePlayingRef.current) return;
    const cellX = Math.floor(pos.x * 3);
    const cellY = Math.floor(pos.y * 3);
    const cellIndex = cellX + cellY * 3;
    setCurrentChordCell(cellIndex);
    setTimeout(() => setCurrentChordCell(null), 500);
    const chords = getChordsForKey(selectedKey);
    const chordObj = chords[cellIndex];
    if (chordObj)
      playArpeggio(chordObj.name, (60 / bpm) * noteLength, arpeggioOctaves, arpeggioDirection);
  }

  function playChord(chordLabel: string) {
    const audioCtx = audioContextRef.current;
    if (!audioCtx) return;
    if (notePlayingRef.current) return;
  
    const duration = (60 / bpm) * noteLength;
    const noteToSemitone: Record<string, number> = {
      C: 0, "C#": 1, D: 2, "D#": 3, E: 4, F: 5, "F#": 6,
      G: 7, "G#": 8, A: 9, "A#": 10, B: 11,
    };
    
    const match = chordLabel.match(/^[A-G]#?/);
    if (!match) return;
    const root = match[0];
    const chordType = chordLabel.replace(root, "");
    let intervals: number[] = [];
    if (chordType === "maj") intervals = [0, 4, 7];
    else if (chordType === "min") intervals = [0, 3, 7];
    else if (chordType === "dim") intervals = [0, 3, 6];
  
    // Set visualized notes
    setCurrentNotes(intervals.map(i => (noteToSemitone[root] + i) % 12));
    setTimeout(() => setCurrentNotes([]), 500);
  
    intervals.forEach((interval) => {
      const source = audioCtx.createBufferSource();
      const key = instrument === "guitar" ? "None" : "Closed_Fist";
      source.buffer = samplesRef.current[key];
      if (!source.buffer) return;
  
      let semitoneOffset = (noteToSemitone[root] ?? 0) + interval;
     // if guitar, shift sample down into C3
      if (instrument === "guitar") semitoneOffset += -16;
      source.playbackRate.value = Math.pow(2, semitoneOffset / 12);
      const gainNode = audioCtx.createGain();
      gainNode.gain.value = 0.2;
  
      source.connect(gainNode);
      if (convolverRef.current) {
        gainNode.connect(convolverRef.current);
        convolverRef.current.connect(audioCtx.destination);
      } else {
        gainNode.connect(audioCtx.destination);
      }
  
      source.start();
      source.stop(audioCtx.currentTime + duration);
    });
  
    notePlayingRef.current = true;
    setTimeout(() => {
      notePlayingRef.current = false;
    }, duration * 1000);
  }
  

  function playArpeggio(chordLabel: string, duration: number, octaves: number, direction: "up" | "down" | "upDown") {
    const audioCtx = audioContextRef.current;
    if (!audioCtx) return;
    if (notePlayingRef.current) return;
    notePlayingRef.current = true;

    const noteToSemitone: Record<string, number> = {
      C: 0,
      "C#": 1,
      D: 2,
      "D#": 3,
      E: 4,
      F: 5,
      "F#": 6,
      G: 7,
      "G#": 8,
      A: 9,
      "A#": 10,
      B: 11,
    };
    const match = chordLabel.match(/^[A-G]#?/);
    if (!match) return;
    const root = match[0];
    const chordType = chordLabel.replace(root, "");
    let intervals: number[] = [];
    if (chordType === "maj") intervals = [0, 4, 7];
    else if (chordType === "min") intervals = [0, 3, 7];
    else if (chordType === "dim") intervals = [0, 3, 6];
    let pattern: number[] = [];
    if (direction === "up") {
      pattern = [...intervals];
      if (octaves === 2) pattern = pattern.concat(intervals.map((i) => i + 12));
    } else if (direction === "down") {
      pattern = [...intervals];
      if (octaves === 2) pattern = pattern.concat(intervals.map((i) => i + 12));
      pattern.reverse();
    } else if (direction === "upDown") {
      let up = [...intervals];
      if (octaves === 2) up = up.concat(intervals.map((i) => i + 12));
      let down = up.slice(0, -1).reverse();
      pattern = up.concat(down);
    }

    const noteDuration = duration;      // seconds per note
    const totalTime = noteDuration * pattern.length;    pattern.forEach((intervalVal, i) => {
    const source = audioCtx.createBufferSource();
    const sampleKey = instrument === "guitar" ? "None" : "Closed_Fist";
    source.buffer = samplesRef.current[sampleKey];
    if (!source.buffer) return;
    const semitoneOffset = (noteToSemitone[root] ?? 0) + intervalVal;
    source.playbackRate.value = Math.pow(2, semitoneOffset / 12);
    const gainNode = audioCtx.createGain();
    gainNode.gain.value = 0.2;
    source.connect(gainNode);
    setTimeout(() => {
      setCurrentNotes([(noteToSemitone[root] + intervalVal) % 12]);
    }, i * noteDuration * 1000);
    if (convolverRef.current) {
      gainNode.connect(convolverRef.current);
      convolverRef.current.connect(audioCtx.destination);
    } else {
      gainNode.connect(audioCtx.destination);
    }
    source.start(audioCtx.currentTime + i * noteDuration);
    source.stop(audioCtx.currentTime + (i + 1) * noteDuration);
    });
    setTimeout(() => {
      setCurrentNotes([]);
      notePlayingRef.current = false;
    }, totalTime * 1000);
  }

  // ---------------------------------------------------------------------
  // THEREMIN
  // ---------------------------------------------------------------------
  const thereminOscillatorRef = useRef<OscillatorNode | null>(null);
  const thereminGainRef = useRef<GainNode | null>(null);
  const thereminFilterRef = useRef<BiquadFilterNode | null>(null);
  const thereminVibratoOscRef = useRef<OscillatorNode | null>(null);
  const thereminVibratoGainRef = useRef<GainNode | null>(null);

  useEffect(() => {
    const audioCtx = audioContextRef.current;
    if (!audioCtx) return;
  
    if (instrument === "theremin") {
      if (!thereminOscillatorRef.current) {
        console.log("Creating theremin oscillator...");
        const mainOsc = audioCtx.createOscillator();
        // Use the current waveform state:
        mainOsc.type = thereminWaveform as OscillatorType;
  
        const filter = audioCtx.createBiquadFilter();
        filter.type = "lowpass";
        filter.frequency.value = 1200;
  
        const mainGain = audioCtx.createGain();
        mainGain.gain.value = 0;
  
        if (convolverRef.current) {
          mainOsc.connect(filter);
          filter.connect(mainGain);
          mainGain.connect(convolverRef.current);
          convolverRef.current.connect(audioCtx.destination);
        } else {
          mainOsc.connect(filter);
          filter.connect(mainGain);
          mainGain.connect(audioCtx.destination);
        }
  
        mainOsc.start();
  
        const vibratoOsc = audioCtx.createOscillator();
        vibratoOsc.frequency.value = 5;
        const vibratoGain = audioCtx.createGain();
        vibratoGain.gain.value = thereminVibrato;
  
        vibratoOsc.connect(vibratoGain);
        vibratoGain.connect(mainOsc.frequency);
        vibratoOsc.start();
  
        thereminOscillatorRef.current = mainOsc;
        thereminGainRef.current = mainGain;
        thereminFilterRef.current = filter;
        thereminVibratoOscRef.current = vibratoOsc;
        thereminVibratoGainRef.current = vibratoGain;
      } else {
        // If the oscillator already exists, update its type based on the latest waveform value.
        thereminOscillatorRef.current.type = thereminWaveform as OscillatorType;
      }
    } else {
      // Tear down theremin nodes if not in theremin mode.
      if (thereminOscillatorRef.current) {
        thereminOscillatorRef.current.stop();
        thereminOscillatorRef.current = null;
      }
      if (thereminVibratoOscRef.current) {
        thereminVibratoOscRef.current.stop();
        thereminVibratoOscRef.current = null;
      }
      thereminGainRef.current = null;
      thereminFilterRef.current = null;
      thereminVibratoGainRef.current = null;
    }
  }, [instrument, thereminWaveform, thereminVibrato]);
  

  // ---------------------------------------------------------------------
  // PROCESS "NONE" GESTURE => vertical swipe for guitar mode
  // ---------------------------------------------------------------------
  function processNoneGesture(handLandmarks: { x: number; y: number }[]) {
    // Only proceed if the back of the hand is detected.
    const isBack = isBackOfHand(handLandmarks);
    if (!isBack) {
      lastNoneY = null;
      return;
    }
    const pos = getHandPosition(handLandmarks);
    console.log("pos.y =>", pos.y);
    if (lastNoneY === null) {
      lastNoneY = pos.y;
      return;
    }
    const deltaY = pos.y - lastNoneY;
    console.log("deltaY =>", deltaY);
    if (Math.abs(deltaY) > MIN_SWIPE_DISTANCE) {
      console.log("Vertical swipe from", lastNoneY, "to", pos.y);
      const oldIndex = getStringIndexFromY(lastNoneY, stringSpacing);
      const newIndex = getStringIndexFromY(pos.y, stringSpacing);
      const start = Math.min(oldIndex, newIndex);
      const end = Math.max(oldIndex, newIndex);
      if (audioContextRef.current) {
        for (let s = start; s <= end; s++) {
                 const delay = (s - start) * 50;
                 setTimeout(() => {
                   playGuitarString(
                     s,
                     audioContextRef.current!,
                     samplesRef.current,
                     convolverRef.current,
                     bpm,
                     noteLength
                   );
                   guitarRef.current?.triggerString(s);
                 }, delay);
               }
      }
      lastNoneY = null;
    }
  }

  // ---------------------------------------------------------------------
  // MAIN GESTURE LOOP
  // ---------------------------------------------------------------------
  useEffect(() => {
    if (!gestureRecognizer || !webcamEnabled) return;
    const videoEl = videoRef.current;
    const canvasEl = canvasRef.current;
    if (!videoEl || !canvasEl) return;
    let animationFrameId: number;
    const ctx = canvasEl.getContext("2d");
    const processFrame = async () => {
      if (videoEl.readyState >= videoEl.HAVE_ENOUGH_DATA && ctx) {
        ctx.save();
        ctx.translate(canvasEl.width, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(videoEl, 0, 0, canvasEl.width, canvasEl.height);
        try {
          const results = await gestureRecognizer.recognizeForVideo(videoEl, performance.now());
          
          // ------------------ Theremin Mode ------------------
          if (instrument === "theremin" && results.landmarks && results.handedness) {
            let leftHandLandmarks = null;
            let rightHandLandmarks = null;
            for (let i = 0; i < results.handedness.length; i++) {
              const handednessArray = results.handedness[i];
              if (handednessArray && handednessArray[0]) {
                const handLabel = handednessArray[0].categoryName;
                if (handLabel === "Left") leftHandLandmarks = results.landmarks[i];
                else if (handLabel === "Right") rightHandLandmarks = results.landmarks[i];
              }
            }
            if (leftHandLandmarks && rightHandLandmarks) {
              // Update main oscillator frequency using left hand position (existing behavior)
              const leftHandPos = getHandPosition(leftHandLandmarks);
              const minFreq = 200;
              const maxFreq = 600;
              const frequency = minFreq + leftHandPos.x * (maxFreq - minFreq);
            
              // Update volume using right hand overall y-position with a dead zone and reduced max gain.
              const rightHandPos = getHandPosition(rightHandLandmarks);
              const rawVolume = 1 - rightHandPos.y;
              const deadZone = 0.3;    // Below this raw volume, output is 0.
              const maxGain = 0.5;     // Maximum gain (not 1).
              let volume = 0;
              if (rawVolume > deadZone) {
                volume = ((rawVolume - deadZone) / (1 - deadZone)) * maxGain;
              }
            
              const now = audioContextRef.current!.currentTime;
              if (thereminOscillatorRef.current) {
                thereminOscillatorRef.current.frequency.setTargetAtTime(frequency, now, 0.05);
              }
              if (thereminGainRef.current) {
                thereminGainRef.current.gain.setTargetAtTime(volume, now, 0.05);
              }
            
              setThereminFrequency(frequency);
              setThereminVolume(volume);
            
              const thumbTip = rightHandLandmarks[4];
              const indexTip = rightHandLandmarks[8];
              const dx = thumbTip.x - indexTip.x;
              const dy = thumbTip.y - indexTip.y;
              const pinchDistance = Math.sqrt(dx * dx + dy * dy);
            
              const minPinch = 0.02; 
              const maxPinch = 0.4;   
            
              // Map the pinchDistance to a 0–10 Hz range for the vibrato oscillator's rate
              let lfoRate = ((pinchDistance - minPinch) / (maxPinch - minPinch)) * 10;
              lfoRate = Math.max(0, Math.min(10, lfoRate));

              if (thereminVibratoOscRef.current) {
                thereminVibratoOscRef.current.frequency.setTargetAtTime(lfoRate, now, 0.05);
              }

              setThereminVibrato(lfoRate);

            }
            
          }

          // ------------------ Other Instrument Modes ------------------
          if (instrument !== "theremin" && results?.gestures) {
            results.gestures.forEach((gestureArray, index) => {
              if (gestureArray.length === 0) return;
              const gesture = gestureArray[0];
              console.log("Detected gesture:", gesture.categoryName);
              const handLandmarks = results.landmarks[index];
              if (!handLandmarks) return;
              const pos = getHandPosition(handLandmarks);
              updateHandPos(handLandmarks);
              if (mode === "manual" && instrument === "guitar") {
                const stringIndex = getStringIndexFromY(pos.y, stringSpacing);

                if (gesture.categoryName === "None") {
                  if (isBackOfHand(handLandmarks) && audioContextRef.current){
                    playGuitarString(stringIndex, audioContextRef.current, samplesRef.current, convolverRef.current, bpm, noteLength);
                    guitarRef.current?.triggerString(stringIndex);
                  }
                }
              }
              else if (mode === "autoChord" && instrument === "guitar" && gesture.categoryName === "Closed_Fist" && !notePlayingRef.current) {
                    // exactly what piano does:
                    const cellX = Math.floor(pos.x * 3);
                    const cellY = Math.floor(pos.y * 3);
                    const cellIndex = cellX + cellY * 3;
                    setCurrentChordCell(cellIndex);
                    setTimeout(() => setCurrentChordCell(null), 500);
                    playChordFromHandPosition("Closed_Fist", pos);
                  }
              else if (mode === "arpeggiator" && instrument === "guitar" && gesture.categoryName === "Closed_Fist" && !notePlayingRef.current) {
                playArpeggioFromHandPosition("Closed_Fist", pos);
              }
              else {
                if (gesture.categoryName === "Closed_Fist") {
                  if (mode === "manual") playNoteManual("Closed_Fist", pos);
                  else if (mode === "autoChord") playChordFromHandPosition("Closed_Fist", pos);
                  else if (mode === "arpeggiator") playArpeggioFromHandPosition("Closed_Fist", pos);
                }
              }
            });
          }
          if (results?.landmarks) {
            results.landmarks.forEach((lmArr) => {
              lmArr.forEach((lm) => {
                ctx.beginPath();
                ctx.arc(lm.x * canvasEl.width, lm.y * canvasEl.height, 4, 0, 2 * Math.PI);
                ctx.fillStyle = "blue";
                ctx.fill();
              });
            });
          }
        } catch (err) {
          console.error("Error processing frame:", err);
        }
        ctx.restore();
      }
      animationFrameId = requestAnimationFrame(processFrame);
    };
    processFrame();
    return () => cancelAnimationFrame(animationFrameId);
  }, [gestureRecognizer, webcamEnabled, instrument, bpm, noteLength, selectedKey, mode, arpeggioOctaves, arpeggioDirection]);

  // ---------------------------------------------------------------------
  // Current chord cell => highlight
  // ---------------------------------------------------------------------
  const currentChordName =
    currentChordCell !== null ? getChordsForKey(selectedKey)[currentChordCell]?.name : null;

  // ---------------------------------------------------------------------
  // RENDER
  // ---------------------------------------------------------------------
  return (
    <>
      <Header />
      <div className="container mx-auto p-4">
        <div className="flex flex-row gap-4">
          {/* Left Column */}
          <div className="w-1/4">
            <Card className="p-6 rounded-2xl bg-teal-100 shadow-lg">
              <CardHeader>
                <h2 className="text-2xl font-bold text-teal-800">Tutorials</h2>
              </CardHeader>
              <CardContent>
                <p className="text-teal-700 mb-4">
                  Learn how to make the most of Motiononics with our step‑by‑step tutorials.
                </p>
                <Link href="/tutorials">
                  <Button className="bg-teal-500 hover:bg-teal-600 text-white">View Tutorials</Button>
                </Link>
              </CardContent>
            </Card>
            {/* Circle of Fifths */}
            <Card className="mt-6 rounded-xl border border-teal-100 shadow-lg bg-white overflow-hidden">
              <CardHeader className="bg-teal-50 py-3 px-4 border-b border-teal-100">
                <h2 className="text-lg font-medium text-teal-800">Circle of Fifths</h2>
                <Link href="/tutorials/chord-modes">
                    <Button className="bg-teal-500 hover:bg-teal-600 text-white">Learn more!</Button>
                </Link>
              </CardHeader>
              <CardContent className="p-4 flex justify-center">
                <div className="w-full flex flex-col items-center">
                  <CircleOfFifths
                    selectedKey={selectedKey === "None" ? "C Major" : selectedKey}
                    onSelectKey={(keyName) => setSelectedKey(keyName)}
                  />
                </div>
                <div className="mt-4">
                  
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Central Column */}
          <div className="w-1/2 flex flex-col items-center gap-4">
            <div className="relative w-[640px] h-[480px] border rounded-lg shadow-lg overflow-hidden">
              {!webcamEnabled ? (
                <Button
                  onClick={() => {
                    setWebcamEnabled(true);
                    if (audioContextRef.current?.state === "suspended") {
                      audioContextRef.current.resume();
                    }
                  }}
                  className="absolute inset-0 m-auto px-8 py-4 text-xxl z-20 bg-teal-500 hover:bg-teal-600 text-white"
                >
                  Enable Webcam
                </Button>
              ) : (
                <Button
                  onClick={() => setWebcamEnabled(false)}
                  className="absolute top-4 left-4 px-4 py-2 text-base z-20 bg-teal-500 hover:bg-teal-600 text-white"
                >
                  Stop Video
                </Button>
              )}
              <video
                ref={videoRef}
                className="w-full h-full scale-x-[-1]"
                muted
                playsInline
              />
              <canvas
                ref={canvasRef}
                width={640}
                height={480}
                className="absolute top-0 left-0"
              />

              {(instrument !== "theremin" &&
                (mode === "autoChord" || mode === "arpeggiator")) && (
                <ChordGridVisualizer
                  chords={getChordsForKey(selectedKey)}
                  currentCell={currentChordCell}
                />
              )}
            </div>

            {/* ——— universal visualizer panel ——— */}
            <div
              className={`
                ${visualizerSizes[instrument]}
                border rounded-lg shadow-lg overflow-hidden
              `}
            >
              {instrument === "theremin" ? (
                <ThreeThereminVisualizer
                  frequency={thereminFrequency}
                  volume={thereminVolume}
                  vibrato={thereminVibrato}
                  waveform={thereminWaveform}
                  onWaveformChange={setThereminWaveform}
                />
              ) : instrument === "guitar" ? (
                <ThreeGuitarVisualizer
                  ref={guitarRef}
                  currentChord={currentChordName}
                />
              ) : (
                <ThreePianoVisualizer currentNotes={currentNotes} 
                availableSemitones={availableSemitones}/>
              )}
            </div>
          </div>


          {/* Right Column: Controls Panel */}
          <div className="w-1/4">
            <Card className="max-w-md mx-auto bg-white shadow-lg">
              <CardHeader>
                <h3 className="text-lg font-semibold text-teal-800">Controls</h3>
              </CardHeader>
              <CardContent>
                
                  
                  <div className="mb-4">
                   <h3 className="text-lg font-semibold text-teal-700 mb-2">Instrument</h3>
                   <div className="flex gap-4">
                     {(["piano", "guitar", "theremin"] as const).map((inst) => (
                       <button
                         key={inst}
                         onClick={() => setInstrument(inst)}
                         className={`
                           w-1/3 flex flex-col items-center p-2
                           bg-white rounded-lg shadow
                           transition
                           ${instrument === inst
                             ? "ring-2 ring-teal-600"
                             : "hover:ring-1 hover:ring-teal-300"}
                         `}
                       >
                         <Image
                           src={`/instrumentimg/${inst}icon.png`}
                           alt={inst}
                           width={120}
                           height={120}
                           className="object-contain"
                         />
                         <span className="mt-1 text-sm font-medium text-teal-800">
                           {inst.charAt(0).toUpperCase() + inst.slice(1)}
                         </span>
                       </button>
                     ))}
                   </div>
                  </div>

                  <div className="mb-4 w-full">
                    <h3 className="text-lg font-semibold text-teal-700 mb-2">Mode</h3>
                    <div className="grid grid-cols-3 gap-2">
                      {(["manual", "autoChord", "arpeggiator"] as const).map((modeOption) => (
                        <button
                          key={modeOption}
                          onClick={() => setMode(modeOption)}
                          className={`
                            flex flex-col items-center p-2
                            bg-white rounded-lg shadow
                            transition h-full
                            ${mode === modeOption
                              ? "ring-2 ring-teal-600"
                              : "hover:ring-1 hover:ring-teal-300"}
                          `}
                        >
                          <div className="h-24 w-24 relative mb-1">
                            <Image
                              src={`/textures/${modeOption}img.jpg`}
                              alt={modeOption}
                              fill
                              className="object-cover rounded-md"
                            />
                          </div>
                          <span className="mt-1 text-sm font-medium text-teal-800">
                            {modeOption === "autoChord" ? "Auto Chord" : 
                            modeOption.charAt(0).toUpperCase() + modeOption.slice(1)}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-center gap-4 mb-4">
                
                {/* BPM */}
                <div className="mb-4">
                  <h3 className="text-lg font-semibold text-teal-700 mb-2">Tempo (BPM)</h3>
                  <div className="flex items-center space-x-4">
                    <input
                      type="range"
                      min={40}
                      max={180}
                      value={bpm}
                      onChange={(e) => setBpm(Number(e.target.value))}
                      className="w-full accent-teal-600"
                    />
                    <span className="text-teal-800 font-semibold">{bpm}</span>
                  </div>
                </div>
                  <label className="flex items-center gap-2 text-teal-700">
                    Note Length:
                    <select
                      value={noteLength}
                      onChange={(e) => setNoteLength(Number(e.target.value))}
                      className="px-2 py-1 border rounded focus:ring-teal-500"
                    >
                      <option value={0.25}>16th</option>
                      <option value={0.5}>8th</option>
                      <option value={1}>Quarter</option>
                      <option value={2}>Half</option>
                      <option value={4}>Whole</option>
                    </select>
                  </label>
                  <label className="flex items-center gap-2 text-teal-700">
                    Key:
                    <select
                      value={selectedKey}
                      onChange={(e) => setSelectedKey(e.target.value)}
                      className="px-2 py-1 border rounded focus:ring-teal-500"
                    >
                      <option value="None">None (Chromatic)</option>
                      {Object.keys(keySignatures).map((keyName) => (
                        <option key={keyName} value={keyName}>
                          {keyName}
                        </option>
                      ))}
                    </select>
                  </label>
                 
                  {mode === "arpeggiator" && (
                    <div className="space-y-3 border-t border-gray-200 pt-3">
                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">Octave Span</label>
                        <select
                          value={arpeggioOctaves}
                          onChange={(e) => setArpeggioOctaves(Number(e.target.value))}
                          className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                        >
                          <option value={1}>1 Octave</option>
                          <option value={2}>2 Octaves</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">Direction</label>
                        <div className="flex flex-col gap-2">
                          <label className="flex items-center gap-1">
                            <input type="radio" value="up" checked={arpeggioDirection === "up"} onChange={() => setArpeggioDirection("up")} className="accent-teal-600" />
                            <span className="text-sm">Up</span>
                          </label>
                          <label className="flex items-center gap-1">
                            <input type="radio" value="down" checked={arpeggioDirection === "down"} onChange={() => setArpeggioDirection("down")} className="accent-teal-600" />
                            <span className="text-sm">Down</span>
                          </label>
                          <label className="flex items-center gap-1">
                            <input type="radio" value="upDown" checked={arpeggioDirection === "upDown"} onChange={() => setArpeggioDirection("upDown")} className="accent-teal-600" />
                            <span className="text-sm">Up &amp; Down</span>
                          </label>
                        </div>
                      </div>
                    </div>
                  )}
                  {instrument === "guitar" && (
                   <div className="mt-2 flex items-center">
                    <span className="mr-2">String Spacing</span>
                    <input
                      type="range"
                      min="0.5"
                      max="2"
                      step="0.1"
                      value={stringSpacing}
                      onChange={(e) => setStringSpacing(Number(e.target.value))}
                      className="w-40"
                    />
                  </div>
                  )}
                </div>
                <Button
                  onClick={() => {
                    console.log("Test Sample button clicked.");
                    if (mode === "manual") {

                      if (audioContextRef.current)
                        playGuitarString(3, audioContextRef.current, samplesRef.current, convolverRef.current, bpm, noteLength);
                    } else if (mode === "autoChord") {
                      playChord("Cmaj");
                    } else if (mode === "arpeggiator") {
                      playArpeggio("Cmaj", (60 / bpm) * noteLength, arpeggioOctaves, arpeggioDirection);
                    }
                  }}
                  className="px-6 py-2 bg-teal-500 hover:bg-teal-600 text-white"
                >
                  Test Sample
                </Button>
              </CardContent>
            </Card>
            <Card className="mt-6 rounded-xl border border-teal-100 shadow-lg bg-white overflow-hidden">
              <div className="bg-teal-50 py-3 px-4 border-b border-teal-100">
                <h2 className="text-lg font-medium text-teal-800">How to Use</h2>
              </div>
              <CardContent className="p-4">
                <div className="prose prose-sm max-w-none">
                  <ol className="space-y-2 text-gray-700">
                    <li>Enable your webcam using the button in the video panel.</li>
                    <li>Position your hand so Mediapipe can see it (good lighting!).</li>
                    <li>In guitar mode, perform a <strong>vertical swipe</strong> (top-to-bottom or bottom-to-top) with the back of your hand to strum across multiple strings.</li>
                    <li>Or make a Closed Fist to strike just one string at your current y-position.</li>
                    <li>Use the “Test Sample” button to confirm your audio is working.</li>
                  </ol>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
}
