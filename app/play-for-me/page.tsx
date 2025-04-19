"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FilesetResolver, GestureRecognizer } from "@mediapipe/tasks-vision";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import Header from "@/components/ui/header";
import CircleOfFifths from "@/components/CircleOfFifths";
import { keySignatures } from "../data/keySignatures";
import Link from "next/link";
import Image from "next/image";
import ThreePianoVisualizer from "@/components/ThreePianoVisualizer";
import ThreeGuitarVisualizer, { ThreeGuitarVisualizerHandle } from "@/components/ThreeGuitarVisualizer";
import * as THREE from "three";

// -------------------- Animation Variants --------------------
const pageVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.5 } },
};

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

// ------------------------------------------------------------------
// 1) 8-Chord Patterns by Genre (in roman numerals).
//    We do NOT create separate minor versions. Instead, we'll do
//    a fallback to uppercase/lowercase at runtime if needed.
// ------------------------------------------------------------------
const chordPatternsByGenre = {
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
  ],
};

// ------------------------------------------------------------------
// 2) 8-Step Rhythms by Genre
// ------------------------------------------------------------------
const rhythmPatternsByGenre = {
  pop: [
    {
      id: "pop-basic",
      name: "Pop Straight Eighths",
      description: "Simple 8-beat pop pattern, mild accent on 1 & 5.",
      pattern: [1,1,1,1,1,1,1,1],
      velocities: [0.8, 0.4, 0.5, 0.4, 0.8, 0.4, 0.5, 0.6],
    },
    {
      id: "pop-sync",
      name: "Pop Syncopation",
      description: "Accents on off-beats, 8 steps.",
      pattern: [1,1,1,1,1,1,1,1],
      velocities: [0.6,0.8,0.5,0.7,0.6,0.8,0.5,0.9],
    },
  ],
  rock: [
    {
      id: "rock-straight",
      name: "Rock Driving",
      description: "Strong accent on 1 & 5, 8 steps.",
      pattern: [1,1,1,1,1,1,1,1],
      velocities: [0.9,0.4,0.8,0.4,0.9,0.4,0.8,0.6],
    },
    {
      id: "rock-half",
      name: "Rock Half-Time",
      description: "Heavier accent on second half, 8 steps.",
      pattern: [1,1,1,1,1,1,1,1],
      velocities: [0.7,0.3,0.7,0.3,0.9,0.3,0.7,0.6],
    },
  ],
  funk: [
    {
      id: "funk1",
      name: "Funk Off-Beat",
      description: "Syncopated off-beats, 8 steps.",
      pattern: [1,1,1,1,1,1,1,1],
      velocities: [0.4,0.8,0.3,0.9,0.4,0.8,0.3,1.0],
    },
    {
      id: "funk2",
      name: "Funky Shuffle",
      description: "Shuffle feel, 8 steps.",
      pattern: [1,1,1,1,1,1,1,1],
      velocities: [0.7,0.5,0.7,0.8,0.6,0.8,0.7,0.9],
    },
  ],
  jazz: [
    {
      id: "jazz-swing1",
      name: "Light Swing 8",
      description: "Gentle swing pattern for 8 beats.",
      pattern: [1,1,1,1,1,1,1,1],
      velocities: [0.7,0.9,0.5,0.8,0.7,0.9,0.5,0.8],
    },
    {
      id: "jazz-swing2",
      name: "Accent on 2 & 4",
      description: "Jazz backbeat accent on 2 & 4, total 8 steps.",
      pattern: [1,1,1,1,1,1,1,1],
      velocities: [0.4,0.8,0.4,0.9,0.4,0.8,0.4,0.9],
    },
  ],
};

// ------------------------------------------------------------------
// 3) Mapping from roman numerals => offset in the 9-chord array
//    We'll do a simple approach so "I" => +0, "V" => +4, "vi" => +5, etc.
//    If we can't find a direct match, we'll do a fallback to upper/lowercase
//    so that minor keys can still interpret uppercase symbols, or vice versa.
// ------------------------------------------------------------------
const romanToOffsetMajor: Record<string, number> = {
  "I": 0, "ii": 1, "iii": 2, "IV": 3, "V": 4, "vi": 5, "vii°": 6,
  "I7": 0, "IV7": 3, "V7": 4,
  "ii7": 1, "vi7": 5,
  "bVII": 6,
};

const romanToOffsetMinor: Record<string, number> = {
  "i": 0, "ii°": 1, "III": 2, "iv": 3, "v": 4, "VI": 5, "VII": 6,
  "i7": 0, "iv7": 3, "v7": 4,
  "ii7": 1, "III7": 2, "VI7": 5, "VII7": 6,
  "bVII": 6,
};

// A small helper that tries the direct lookup, and if undefined,
// tries flipping uppercase/lowercase. e.g. "I" => "i", or "i" => "I".
function getOffsetFromMap(symbol: string, isMajor: boolean) {
  const offsetMap = isMajor ? romanToOffsetMajor : romanToOffsetMinor;
  let val = offsetMap[symbol];

  if (val === undefined) {
    // fallback attempt:
    const alt = isMajor ? symbol.toLowerCase() : symbol.toUpperCase();
    val = offsetMap[alt];
  }
  return val !== undefined ? val : 0;
}

// ------------------------------------------------------------------
// 4) Utility that "spells" 8 roman numerals into actual chord names
//    based on whichever cell chord was chosen as "I," with fallback
//    logic for uppercase vs. lowercase mismatches in minor keys.
// ------------------------------------------------------------------
function buildEightChordsFromCell(
  cellIndex: number,
  keyName: string,
  romanPattern: string[]
): string[] {
  const chordsInKey = getChordsForKey(keyName);
  if (!chordsInKey || chordsInKey.length < 9) return [];

  const rootChordObj = chordsInKey[cellIndex];
  if (!rootChordObj) return [];

  const rootIndex = cellIndex;
  const isMajor = keyName.includes("Major");

  return romanPattern.map((symbol) => {
    const offset = getOffsetFromMap(symbol, isMajor);
    const targetIndex = (rootIndex + offset) % 9;
    return chordsInKey[targetIndex]?.name || rootChordObj.name;
  });
}

// getChordsForKey => returns 9 chord objects for the key
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
  } else {
    // minor
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

// getNotesForChord & semitoneToNoteName => unchanged
function getNotesForChord(chordName: string): number[] {
  const root = chordName.charAt(0);
  let accidental = "";
  let i = 1;
  if (i < chordName.length && (chordName.charAt(i) === "#" || chordName.charAt(i) === "b")) {
    accidental = chordName.charAt(i);
    i++;
  }

  const rootWithAcc = root + accidental;
  const isMinor = chordName.substring(i).startsWith("min");
  const isDiminished = chordName.substring(i).startsWith("dim");

  const rootOffsets: Record<string, number> = {
    "C": 0, "C#": 1, "Db": 1, "D": 2, "D#": 3, "Eb": 3,
    "E": 4, "F": 5, "F#": 6, "Gb": 6, "G": 7, "G#": 8,
    "Ab": 8, "A": 9, "A#": 10, "Bb": 10, "B": 11,
  };
  const rootOffset = rootOffsets[rootWithAcc] ?? 0;
  const intervals: number[] = [0];

  if (isDiminished) {
    intervals.push(3); // minor third
    intervals.push(6); // diminished fifth
  } else if (isMinor) {
    intervals.push(3); // minor third
    intervals.push(7); // perfect fifth
  } else {
    intervals.push(4); // major third
    intervals.push(7); // perfect fifth
  }
  return intervals.map((n) => n + rootOffset);
}

function semitoneToNoteName(semitone: number): string {
  const noteNames = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
  const octave = Math.floor(semitone / 12) + 4;
  const noteName = noteNames[semitone % 12];
  return `${noteName}${octave}`;
}

// -------------------- Main Page --------------------
export default function PlayForMePage() {
  // Basic state
  const [selectedKey, setSelectedKey] = useState("C Major");

  const [selectedChordGenre, setSelectedChordGenre] = useState<keyof typeof chordPatternsByGenre>("pop");
  const [selectedChordPatternId, setSelectedChordPatternId] = useState<string>("pop1");

  const [selectedRhythmGenre, setSelectedRhythmGenre] = useState<keyof typeof rhythmPatternsByGenre>("pop");
  const [selectedRhythmPatternId, setSelectedRhythmPatternId] = useState<string>("pop-basic");

  const [instrument, setInstrument] = useState<"piano" | "guitar">("piano");
  const [bpm, setBpm] = useState(90);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentChordCell, setCurrentChordCell] = useState<number | null>(null);
  const [nextChordCell, setNextChordCell] = useState<number | null>(null);
  const [currentChords, setCurrentChords] = useState<string[]>([]);
  const [currentBeatIndex, setCurrentBeatIndex] = useState(0);
  const [visualizerNotes, setVisualizerNotes] = useState<string[]>([]);

  // MediaPipe
  const [gestureRecognizer, setGestureRecognizer] = useState<GestureRecognizer | null>(null);
  const [webcamEnabled, setWebcamEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [recognizedGesture, setRecognizedGesture] = useState("");
  const [handPosition, setHandPosition] = useState<{ x: number; y: number } | null>(null);
  const [handVisible, setHandVisible] = useState(false);


  const [recording, setRecording] = useState(false);
  const [barsToRecord, setBarsToRecord] = useState(2);
  const [recordedChords, setRecordedChords] = useState<string[]>([]);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);

  const recorderNodeRef = useRef<ScriptProcessorNode | null>(null);
  const mediaDestinationRef = useRef<MediaStreamAudioDestinationNode | null>(null);
  const pcmLeftRef = useRef<Float32Array[]>([]);
  const pcmRightRef = useRef<Float32Array[]>([]);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  

  // Audio
  const audioContextRef = useRef<AudioContext | null>(null);
  const samplesRef = useRef<Record<string, AudioBuffer>>({});
  const notePlayingRef = useRef(false);
  const convolverRef = useRef<ConvolverNode | null>(null);
  const beatTimerRef = useRef<NodeJS.Timeout | null>(null);
  const guitarRef = useRef<ThreeGuitarVisualizerHandle>(null);

  // Visual
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // -------------------- Initialize Audio --------------------
  const initAudio = useCallback(async () => {
    try {
      if (!audioContextRef.current || audioContextRef.current.state === "closed") {
        audioContextRef.current = new (window.AudioContext ||
          (window as any).webkitAudioContext)();
      }
      const audioCtx = audioContextRef.current;
      const samples: Record<string, AudioBuffer> = {};

      // In initAudio():
      try {
        // Already loading the piano sample
        const pianoResponse = await fetch("/samples/fist.wav");
        if (pianoResponse.ok) {
          const arrayBuffer = await pianoResponse.arrayBuffer();
          samples["Closed_Fist_Piano"] = await audioCtx.decodeAudioData(arrayBuffer);
        }

        // Load a second sample for guitar:
        const guitarResponse = await fetch("/samples/guitarnew.wav");
        if (guitarResponse.ok) {
          const guitarArrayBuffer = await guitarResponse.arrayBuffer();
          samples["Closed_Fist_Guitar"] = await audioCtx.decodeAudioData(guitarArrayBuffer);
        }

        samplesRef.current = samples;
      } catch (error) {
        console.error("Error loading sample:", error);
      }


      // Optional IR
      try {
        const irResponse = await fetch("/samples/impulse.wav");
        if (irResponse.ok) {
          const irBuffer = await irResponse.arrayBuffer();
          const convolver = audioCtx.createConvolver();
          convolver.buffer = await audioCtx.decodeAudioData(irBuffer);
          convolverRef.current = convolver;
        }
      } catch (error) {
        console.error("Error loading impulse response:", error);
      }
    } catch (error) {
      console.error("Audio initialization error:", error);
    }
  }, []);

  // -------------------- Initialize GestureRecognizer --------------------
  const initGestureRecognizer = useCallback(async () => {
    try {
      setLoading(true);
      const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.1/wasm"
      );
      const recognizer = await GestureRecognizer.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath:
            "https://storage.googleapis.com/mediapipe-tasks/gesture_recognizer/gesture_recognizer.task",
        },
        numHands: 1,
        runningMode: "VIDEO",
      });
      setGestureRecognizer(recognizer);
      setLoading(false);
    } catch (error) {
      console.error("Error initializing gesture recognizer:", error);
      setLoading(false);
    }
  }, []);

  // -------------------- useEffect --------------------
  useEffect(() => {
    initGestureRecognizer();
    initAudio();
    return () => {
      if (beatTimerRef.current) clearTimeout(beatTimerRef.current);
      if (gestureRecognizer) gestureRecognizer.close();
      if (audioContextRef.current && audioContextRef.current.state !== "closed") {
        audioContextRef.current.close().catch(console.error);
      }
    };
  }, [initGestureRecognizer, initAudio]);

  // -------------------- Webcam Setup --------------------
  useEffect(() => {
    const videoEl = videoRef.current;
    if (!webcamEnabled || !videoEl) return;

    let stream: MediaStream | null = null;
    navigator.mediaDevices
      .getUserMedia({ video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: "user" } })
      .then((s) => {
        stream = s;
        videoEl.srcObject = s;
        return videoEl.play();
      })
      .catch((err) => console.error("Error accessing webcam:", err));

    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [webcamEnabled]);

  function startRecording() {
    const audioCtx = audioContextRef.current;
    if (!audioCtx) return;
  
    // reset buffers
    pcmLeftRef.current  = [];
    pcmRightRef.current = [];
  
    // 4096‑sample buffer, 2 inputs (L+R), 2 outputs (unused)
    const proc = audioCtx.createScriptProcessor(4096, 2, 2);
    proc.onaudioprocess = (e) => {
      // copy the data so it doesn't get overwritten
      pcmLeftRef.current.push ( new Float32Array(e.inputBuffer.getChannelData(0)) );
      pcmRightRef.current.push( new Float32Array(e.inputBuffer.getChannelData(1)) );
    };
    proc.connect(audioCtx.destination);
    recorderNodeRef.current = proc;
  
    setRecording(true);
    setRecordedChords([]);
  }
  
  
  function stopRecording() {
    const audioCtx = audioContextRef.current;
    if (!audioCtx) return;
  
    if (recorderNodeRef.current) {
      recorderNodeRef.current.disconnect();
      recorderNodeRef.current = null;
    }
  
    setRecording(false);
  
    // flatten the buffers
    const leftArrs  = pcmLeftRef.current;
    const rightArrs = pcmRightRef.current;
    const total     = leftArrs.reduce((acc, c) => acc + c.length, 0);
  
    const flatL = new Float32Array(total),
          flatR = new Float32Array(total);
  
    let offset = 0;
    for (let i = 0; i < leftArrs.length; i++) {
      flatL.set(leftArrs[i], offset);
      flatR.set(rightArrs[i], offset);
      offset += leftArrs[i].length;
    }
  
    // interleave L + R
    const interleaved = new Float32Array(total * 2);
    for (let i = 0, j = 0; i < total; i++) {
      interleaved[j++] = flatL[i];
      interleaved[j++] = flatR[i];
    }
  
    // encode to WAV
    const wavBuffer = encodeWAV(interleaved, audioCtx.sampleRate);
    const blob      = new Blob([wavBuffer], { type: "audio/wav" });
    setRecordedBlob(blob);
  }
  
  // Helper: Interleave and encode WAV (simple PCM 16-bit)
  function interleaveAndConvert(left: Float32Array, right: Float32Array) {
    const len = left.length + right.length;
    const result = new Float32Array(len);
    let idx = 0;
    for (let i = 0; i < left.length; i++) {
      result[idx++] = left[i];
      result[idx++] = right[i];
    }
    return result;
  }
  function encodeWAV(samples: Float32Array, sampleRate: number) {
    // Minimal WAV header for PCM 16-bit stereo
    const buffer = new ArrayBuffer(44 + samples.length * 2);
    const view = new DataView(buffer);
    function writeString(offset: number, str: string) {
      for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
    }
    writeString(0, "RIFF");
    view.setUint32(4, 36 + samples.length * 2, true);
    writeString(8, "WAVE");
    writeString(12, "fmt ");
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 2, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 4, true);
    view.setUint16(32, 4, true);
    view.setUint16(34, 16, true);
    writeString(36, "data");
    view.setUint32(40, samples.length * 2, true);
    // PCM samples
    let offset = 44;
    for (let i = 0; i < samples.length; i++) {
      let s = Math.max(-1, Math.min(1, samples[i]));
      view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
      offset += 2;
    }
    return buffer;
  }

  // -------------------- Gesture logic each frame --------------------
  useEffect(() => {
    if (!gestureRecognizer || !webcamEnabled) return;

    const videoEl = videoRef.current;
    const canvasEl = canvasRef.current;
    if (!videoEl || !canvasEl) return;

    const ctx = canvasEl.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;

    async function processFrame() {
      if (videoEl && ctx && canvasEl && videoEl.readyState >= videoEl.HAVE_ENOUGH_DATA) {
        ctx.save();
        ctx.clearRect(0, 0, canvasEl.width, canvasEl.height);
        ctx.translate(canvasEl.width, 0);
        ctx.scale(-1, 1);

        ctx.drawImage(videoEl, 0, 0, canvasEl.width, canvasEl.height);

        const timestamp = performance.now();
        try {
          const results = await gestureRecognizer!.recognizeForVideo(videoEl, timestamp);

          const isHand = results?.landmarks && results.landmarks.length > 0;
          setHandVisible(isHand);

          if (results?.gestures && results.gestures.length > 0) {
            const [firstHandGestures] = results.gestures;
            if (firstHandGestures && firstHandGestures.length > 0) {
              const topGesture = firstHandGestures[0];
              setRecognizedGesture(topGesture.categoryName);

              if (results.landmarks && results.landmarks.length > 0) {
                const landmarks = results.landmarks[0];
                const avgX = landmarks.reduce((sum, lm) => sum + lm.x, 0) / landmarks.length;
                const avgY = landmarks.reduce((sum, lm) => sum + lm.y, 0) / landmarks.length;
                const position = { x: avgX, y: avgY };
                setHandPosition(position);

                const cellX = Math.floor(position.x * 3);
                const cellY = Math.floor(position.y * 3);
                const cellIndex = cellY * 3 + cellX;

                // update next cell
                setNextChordCell(cellIndex);

                if (topGesture.categoryName === "Closed_Fist" && !isPlaying && !notePlayingRef.current) {
                  startPlayingFromCell(cellIndex);
                }
              }
            }
          } else {
            setRecognizedGesture("");
            setHandPosition(null);
          }

          // Draw hand landmarks
          if (results?.landmarks) {
            ctx.save();
            const currentColor = "#8b5cf6"; 
            results.landmarks.forEach((lmArr) => {
              ctx.strokeStyle = currentColor;
              ctx.lineWidth = 3;
              const connections = [
                [0, 1, 2, 3, 4], // thumb
                [0, 5, 6, 7, 8], // index
                [9, 10, 11, 12], // middle
                [13, 14, 15, 16], // ring
                [17, 18, 19, 20], // pinky
                [0, 5, 9, 13, 17], // palm
              ];

              connections.forEach((conn) => {
                ctx.beginPath();
                for (let i = 0; i < conn.length; i++) {
                  const lm = lmArr[conn[i]];
                  if (i === 0) {
                    ctx.moveTo(lm.x * canvasEl.width, lm.y * canvasEl.height);
                  } else {
                    ctx.lineTo(lm.x * canvasEl.width, lm.y * canvasEl.height);
                  }
                }
                ctx.stroke();
              });

              // Circles on each landmark
              lmArr.forEach((lm) => {
                ctx.beginPath();
                ctx.arc(lm.x * canvasEl.width, lm.y * canvasEl.height, 6, 0, 2 * Math.PI);
                ctx.fillStyle = currentColor;
                ctx.fill();
                ctx.strokeStyle = "white";
                ctx.lineWidth = 2;
                ctx.stroke();
              });
            });
            ctx.restore();
          }
        } catch (err) {
          console.error("Error processing frame:", err);
        }

        ctx.restore();

        // chord grid
        drawChordGrid(ctx, canvasEl.width, canvasEl.height);
      }

      animationFrameId = requestAnimationFrame(processFrame);
    }

    processFrame();
    return () => cancelAnimationFrame(animationFrameId);
  }, [gestureRecognizer, webcamEnabled, isPlaying, selectedKey]);

  // -------------------- startPlayingFromCell --------------------
  function startPlayingFromCell(cellIndex: number) {
    if (isPlaying || notePlayingRef.current) return;

    setCurrentChordCell(cellIndex);
    setIsPlaying(true);

    // chord pattern
    const patternList = chordPatternsByGenre[selectedChordGenre];
    const chosenChordPattern = patternList.find((p) => p.id === selectedChordPatternId) || patternList[0];

    // build 8 spelled chords
    const spelledChords = buildEightChordsFromCell(cellIndex, selectedKey, chosenChordPattern.romanArray);
    setCurrentChords(spelledChords);
    setCurrentBeatIndex(0);

    playPattern(spelledChords);
  }

  // -------------------- playPattern --------------------
  function playPattern(chords: string[]) {
    if (!chords || chords.length === 0) {
      setIsPlaying(false);
      return;
    }
    // chosen rhythm
    const rList = rhythmPatternsByGenre[selectedRhythmGenre];
    const chosenRhythm = rList.find((r) => r.id === selectedRhythmPatternId) || rList[0];

    const beatDurations = chosenRhythm.pattern.map((p) => (60 / bpm) * 1000 * p);
    const velocities = chosenRhythm.velocities;

    // immediate chord
    playChord(chords[0], beatDurations[0], velocities[0]);
    setCurrentBeatIndex(0);

    let currentBeat = 0;

    if (beatTimerRef.current) {
      clearTimeout(beatTimerRef.current);
      beatTimerRef.current = null;
    }
    

    const doNext = () => {
      currentBeat++;
      if (currentBeat >= 8) {
        setIsPlaying(false);
        setCurrentChordCell(null);
        setNextChordCell(null);
        setCurrentBeatIndex(-1);
        return;
      }
      setCurrentBeatIndex(currentBeat);

      const chordToPlay = chords[currentBeat];
      const thisDur = beatDurations[currentBeat];
      const thisVel = velocities[currentBeat];
      playChord(chordToPlay, thisDur, thisVel);
      if (recording) {
        setRecordedChords((prev) => [...prev, chordToPlay]);
      }
      beatTimerRef.current = setTimeout(doNext, thisDur);
    };

    beatTimerRef.current = setTimeout(doNext, beatDurations[0]);
  }

  // -------------------- playChord --------------------
  function playChord(chordName: string, beatDurationMs: number, velocity: number = 0.7) {
    const audioCtx = audioContextRef.current;
    if (!audioCtx || notePlayingRef.current) return;
  
    // guard
    notePlayingRef.current = true;
    setTimeout(() => { notePlayingRef.current = false; }, 300);
  
    const sampleBuffer = instrument === "guitar"
      ? samplesRef.current["Closed_Fist_Guitar"]
      : samplesRef.current["Closed_Fist_Piano"];
    if (!sampleBuffer) return;
  
    let notes = getNotesForChord(chordName);
    if (instrument === "guitar") notes = notes.map(n => n - 12);
  
    setVisualizerNotes(notes.map(semitoneToNoteName));
    const chordLengthSec = beatDurationMs / 1000;
  
    notes.forEach((semi, i) => {
      const source = audioCtx.createBufferSource();
      source.buffer = sampleBuffer;
      source.playbackRate.value = Math.pow(2, semi / 12);
  
      const gainNode = audioCtx.createGain();
      gainNode.gain.value = (velocity * (1 - i * 0.05)) / notes.length;
  
      // connect the source into your gain
      source.connect(gainNode);
  
      // then go to your reverb or straight to output
      if (convolverRef.current) {
        gainNode.connect(convolverRef.current);
        convolverRef.current.connect(audioCtx.destination);
        if (recorderNodeRef.current) {
          convolverRef.current.connect(recorderNodeRef.current);
        }
      } else {
        gainNode.connect(audioCtx.destination);
      }
  
      const startTime = audioCtx.currentTime + (i * (instrument === "guitar" ? 0.03 : 0.02));
      source.start(startTime);
      source.stop(startTime + chordLengthSec);
    });
  }
  

  // -------------------- drawChordGrid --------------------
  function drawChordGrid(ctx: CanvasRenderingContext2D, width: number, height: number) {
    const cellWidth = width / 3;
    const cellHeight = height / 3;

    const chordObjs = getChordsForKey(selectedKey);

    ctx.save();
    ctx.strokeStyle = "rgba(139, 92, 246, 0.5)";
    ctx.lineWidth = 2;
    for (let i = 1; i < 3; i++) {
      ctx.beginPath();
      ctx.moveTo(i * cellWidth, 0);
      ctx.lineTo(i * cellWidth, height);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(0, i * cellHeight);
      ctx.lineTo(width, i * cellHeight);
      ctx.stroke();
    }

    ctx.font = "bold 24px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 3; col++) {
        const index = row * 3 + col;
        const chordObj = chordObjs[index];
        if (!chordObj) continue;

        if (currentChordCell === index) {
          ctx.fillStyle = "rgba(139, 92, 246, 0.5)";
          ctx.fillRect(col * cellWidth, row * cellHeight, cellWidth, cellHeight);
          ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
        } else if (nextChordCell === index) {
          ctx.fillStyle = "rgba(139, 92, 246, 0.2)";
          ctx.fillRect(col * cellWidth, row * cellHeight, cellWidth, cellHeight);
          ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
        } else {
          ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
        }

        ctx.fillText(
          chordObj.name,
          col * cellWidth + cellWidth/2,
          row * cellHeight + cellHeight/2 - 12
        );
        ctx.font = "16px Arial";
        ctx.fillText(
          chordObj.roman,
          col * cellWidth + cellWidth/2,
          row * cellHeight + cellHeight/2 + 12
        );
        ctx.font = "bold 24px Arial";
      }
    }
    ctx.restore();
  }

  // -------------------- Render --------------------
  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 to-white relative">
      <Header />

      <motion.div
        className="container mx-auto px-4 py-8 max-w-6xl"
        initial="hidden"
        animate="visible"
        variants={pageVariants}
      >
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold text-purple-800 mb-3">
            Play For Me (8-Beats + Minor Fix)
          </h1>
          <p className="text-xl text-purple-600 max-w-3xl mx-auto">
            Now with runtime fallback for uppercase vs. lowercase numerals in minor keys.
            Choose your chord cell to transpose the 8-chord pattern to that chord as “I!”
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Left panel */}
          <motion.div className="lg:col-span-2" variants={cardVariants}>
            <Card className="bg-white shadow-md mb-6">
              <CardHeader className="bg-purple-50 border-b border-purple-100">
                <h2 className="text-2xl font-bold text-purple-800">Controls</h2>
              </CardHeader>
              <CardContent className="p-6">
                {/* Instrument */}
                <div className="mb-4">
                  <h3 className="text-lg font-semibold text-purple-700 mb-2">
                    Instrument
                  </h3>
                  <div className="flex w-full">
                    {(["piano", "guitar"] as const).map((inst) => (
                      <Button
                        key={inst}
                        onClick={() => setInstrument(inst)}
                        className={`
                          w-1/2               /* half the container width */
                          p-2                 /* some padding */
                          bg-white            /* white background */
                          rounded-lg          /* rounded corners */
                          shadow              /* subtle elevation */
                          flex items-center justify-center
                          transition
                          ${instrument === inst
                            ? "ring-2 ring-purple-600"
                            : "hover:ring-1 hover:ring-purple-300"}
                        `}
                      >
                        <img
                          src={`./instrumentimg/${inst}icon.png`}
                          alt={inst}
                          className="w-12 h-12 object-contain"
                        />
                        <span className="mt-2 text-sm font-medium text-purple-800">
                          {inst.charAt(0).toUpperCase() + inst.slice(1)}
                        </span>
                      </Button>
                    ))}
                  </div>
                </div>

                {/* BPM */}
                <div className="mb-4">
                  <h3 className="text-lg font-semibold text-purple-700 mb-2">Tempo (BPM)</h3>
                  <div className="flex items-center space-x-4">
                    <input
                      type="range"
                      min={60}
                      max={180}
                      value={bpm}
                      onChange={(e) => setBpm(Number(e.target.value))}
                      className="w-full accent-purple-600"
                    />
                    <span className="text-purple-800 font-semibold">{bpm}</span>
                  </div>
                </div>

                {/* Key */}
                <div className="mb-4">
                  <h3 className="text-lg font-semibold text-purple-700 mb-2">Key</h3>
                  <CircleOfFifths selectedKey={selectedKey} onSelectKey={setSelectedKey} />
                </div>

                {/* Camera Toggle */}
                <Button
                  onClick={() => setWebcamEnabled(!webcamEnabled)}
                  className={`w-full mt-4 ${
                    webcamEnabled ? "bg-red-500 hover:bg-red-600" : "bg-purple-600 hover:bg-purple-700"
                  } text-white`}
                >
                  {webcamEnabled ? "Disable Camera" : "Enable Camera"}
                </Button>

                <div className="mb-4">
                  <label>
                    Bars to record: 
                    <input
                      type="number"
                      min={1}
                      max={16}
                      value={barsToRecord}
                      onChange={e => setBarsToRecord(Number(e.target.value))}
                      className="ml-2 w-16"
                      disabled={recording}
                    />
                  </label>
                  <button onClick={recording ? stopRecording : startRecording} className="ml-4 px-4 py-2 bg-purple-600 text-white rounded">
                    {recording ? "Stop Recording" : "Record For Me"}
                  </button>
                  <button onClick={() => { setRecordedChords([]); setRecordedBlob(null); }} className="ml-2 px-4 py-2 bg-gray-300 rounded">
                    Retry
                  </button>
                  {recordedBlob && (
                    <>
                      <a
                        href={URL.createObjectURL(recordedBlob)}
                        download="play-for-me.wav"
                        className="ml-2 px-4 py-2 bg-green-600 text-white rounded"
                      >
                        Download WAV
                      </a>
                      <button
                        className="ml-2 px-4 py-2 bg-blue-600 text-white rounded"
                        onClick={() => {
                          const txt = recordedChords.join(" ");
                          const blob = new Blob([txt], { type: "text/plain" });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement("a");
                          a.href = url;
                          a.download = "chords.txt";
                          a.click();
                          URL.revokeObjectURL(url);
                        }}
                      >
                        Download Chord TXT
                      </button>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* How to Use */}
            <Card className="bg-white shadow-md">
              <CardHeader className="bg-purple-50 border-b border-purple-100">
                <h2 className="text-2xl font-bold text-purple-800">How to Use</h2>
              </CardHeader>
              <CardContent className="p-6">
                <ol className="list-decimal list-inside space-y-2 text-purple-700">
                  <li>Enable Camera</li>
                  <li>Pick Key, Chord Pattern, & Rhythm</li>
                  <li>Closed fist over a chord cell = base chord for the 8-chord pattern</li>
                  <li>Minor keys are automatically handled with case fallback!</li>
                </ol>

                
              </CardContent>
            </Card>
          </motion.div>

          {/* Right panel */}
          <motion.div className="lg:col-span-3" variants={cardVariants}>
            <Card className="bg-white shadow-md">
              <CardHeader className="bg-purple-50 border-b border-purple-100">
                <h2 className="text-2xl font-bold text-purple-800">Gesture Control</h2>
              </CardHeader>
              <CardContent className="p-6">
                <div className="relative aspect-video bg-gray-900 rounded-lg overflow-hidden mb-6">
                  {!webcamEnabled ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-800 text-center p-6">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-16 w-16 text-gray-400 mb-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.5}
                          d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M12 18.75H4.5a2.25 2.25 0 01-2.25-2.25V9a2.25 2.25 0 012.25-2.25H12"
                        />
                      </svg>
                      <h3 className="text-xl font-medium text-gray-300 mb-2">
                        Enable Camera
                      </h3>
                      <p className="text-gray-400">
                        Closed fist on a chord cell to pick it as “I”
                      </p>
                    </div>
                  ) : loading ? (
                    <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
                      <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-purple-500"></div>
                    </div>
                  ) : (
                    <>
                      <video
                        ref={videoRef}
                        className="absolute inset-0 w-full h-full"
                        muted
                        playsInline
                      />
                      <canvas
                        ref={canvasRef}
                        width={640}
                        height={480}
                        className="absolute inset-0 w-full h-full"
                      />

                      <AnimatePresence>
                        {webcamEnabled && !handVisible && (
                          <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            className="absolute bottom-4 left-1/2 transform -translate-x-1/2 px-4 py-2 bg-black/70 text-white rounded-lg"
                          >
                            Please show your hand in the camera
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {webcamEnabled && recognizedGesture && (
                        <div className="absolute top-4 right-4 bg-black/60 text-white px-3 py-1.5 rounded text-sm">
                          {recognizedGesture}
                        </div>
                      )}

                      <AnimatePresence>
                        {currentChordCell !== null && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            className="absolute left-4 top-4 bg-purple-600/80 backdrop-blur-sm text-white px-4 py-2 rounded-lg shadow-lg"
                          >
                            <p className="font-semibold">
                              Now Playing: {currentChords[currentBeatIndex]}
                            </p>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </>
                  )}
                </div>

                {/* Pattern & Rhythm Selections */}
                <div className="mt-4 bg-purple-50 p-3 border border-purple-200 rounded">
                  <h3 className="text-lg font-semibold text-purple-700 mb-2">Current Pattern (8 Beats)</h3>
                  <div className="grid grid-cols-8 gap-1">
                    {[0,1,2,3,4,5,6,7].map((i) => (
                      <div
                        key={i}
                        className={`p-2 text-center border rounded ${
                          currentBeatIndex === i
                            ? "bg-purple-200 border-purple-400"
                            : "bg-white border-purple-100"
                        }`}
                      >
                        <div className="text-sm font-mono text-purple-800">Beat {i+1}</div>
                        <div className="font-semibold text-purple-600 mt-1">
                          {currentChords[i] || "-"}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-purple-700 mb-2">Rhythm Genre</h3>
                  <div className="flex gap-2 mb-4">
                    {Object.keys(rhythmPatternsByGenre).map((genre) => (
                      <Button
                        key={genre}
                        onClick={() => setSelectedRhythmGenre(genre as keyof typeof rhythmPatternsByGenre)}
                        className={
                          selectedRhythmGenre === genre
                            ? "bg-purple-600 text-white"
                            : "bg-purple-100 text-purple-800"
                        }
                      >
                        {genre.toUpperCase()}
                      </Button>
                    ))}
                  </div>

                  <h3 className="text-lg font-semibold text-purple-700 mb-3">Rhythm Pattern (8 steps)</h3>
                  <div className="grid grid-cols-2 gap-2">
                    {rhythmPatternsByGenre[selectedRhythmGenre].map((rp) => (
                      <Button
                        key={rp.id}
                        onClick={() => setSelectedRhythmPatternId(rp.id)}
                        className={
                          selectedRhythmPatternId === rp.id
                            ? "bg-purple-600 text-white px-4 py-6 text-left justify-start"
                            : "bg-purple-100 text-purple-800 px-4 py-6 text-left justify-start"
                        }
                      >
                        <div>
                          <div className="font-medium">{rp.name}</div>
                          <div className="text-xs">{rp.description}</div>
                        </div>
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-purple-700 mb-2">Chord Genre</h3>
                  <div className="flex gap-2 mb-4">
                    {Object.keys(chordPatternsByGenre).map((genre) => (
                      <Button
                        key={genre}
                        onClick={() => setSelectedChordGenre(genre as keyof typeof chordPatternsByGenre)}
                        className={
                          selectedChordGenre === genre
                            ? "bg-purple-600 text-white"
                            : "bg-purple-100 text-purple-800"
                        }
                      >
                        {genre.toUpperCase()}
                      </Button>
                    ))}
                  </div>

                  <h3 className="text-lg font-semibold text-purple-700 mb-3">Chord Pattern (8 chords)</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {chordPatternsByGenre[selectedChordGenre].map((cp) => (
                      <Button
                        key={cp.id}
                        onClick={() => setSelectedChordPatternId(cp.id)}
                        className={
                          selectedChordPatternId === cp.id
                            ? "bg-purple-600 text-white px-4 py-6 text-left justify-start"
                            : "bg-purple-100 text-purple-800 px-4 py-6 text-left justify-start"
                        }
                      >
                        <div>
                          <div className="font-medium">{cp.name}</div>
                          <div className="text-xs">{cp.description}</div>
                        </div>
                      </Button>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Feature highlights */}
        <motion.div
          className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6"
          initial="hidden"
          animate="visible"
          variants={cardVariants}
        >
          <Card className="bg-gradient-to-b from-purple-500 to-purple-600 text-white shadow-lg">
            <CardContent className="p-6">
              <h3 className="text-xl font-bold mb-2">Hands-Free Playing</h3>
              <p>
                Focus on musical expression without manually fretting chords.
                Great for practicing progressions or improvising solos on top.
              </p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-b from-purple-600 to-purple-700 text-white shadow-lg">
            <CardContent className="p-6">
              <h3 className="text-xl font-bold mb-2">Dynamic Patterns</h3>
              <p>
                Choose from multiple 8-chord progressions and 8-step rhythms,
                ensuring fresh musical ideas across different genres.
              </p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-b from-purple-700 to-purple-800 text-white shadow-lg">
            <CardContent className="p-6">
              <h3 className="text-xl font-bold mb-2">Harmonic Exploration</h3>
              <p>
                Try out new chords by picking different cells.
                Each cell chord redefines “I” for the entire 8-chord sequence,
                now fixed for minor keys too!
              </p>
            </CardContent>
          </Card>
        </motion.div>

        {/* Footer */}
        <div className="flex justify-between mt-12">
          <Link href="/">
            <Button
              variant="outline"
              className="border-purple-500 text-purple-500 hover:bg-purple-50"
            >
              ← Back to Home
            </Button>
          </Link>
          <Link href="/tutorials">
            <Button
              variant="outline"
              className="border-purple-500 text-purple-500 hover:bg-purple-50"
            >
              Tutorials
            </Button>
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
