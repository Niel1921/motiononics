"use client";

import React, { useRef, useEffect, useState, useCallback } from "react";
import * as THREE from "three";
import Link from "next/link";
import { motion } from "framer-motion";
import { FilesetResolver, GestureRecognizer } from "@mediapipe/tasks-vision";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import ThreePianoVisualizer from "@/components/ThreePianoVisualizer";
import ThreeGuitarVisualizer, { ThreeGuitarVisualizerHandle } from "@/components/ThreeGuitarVisualizer";
import Header from "@/components/ui/header";
import CircleOfFifths from "@/components/CircleOfFifths";
import { keySignatures } from "../data/keySignatures";

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

// -------------------- Helper: ConductorOverlay --------------------
function ConductorOverlay({
  progress,
  expectedProgress,
}: {
  progress: number;
  expectedProgress: number;
}) {
  return (
    <div className="absolute inset-0 pointer-events-none">
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-white bg-black/50 p-2 rounded">
          Conductor progress: {(progress * 100).toFixed(1)}% <br />
          Expected progress: {(expectedProgress * 100).toFixed(1)}%
        </div>
      </div>
    </div>
  );
}

// -------------------- Audio Sample URLs --------------------
const sampleURLs: Record<string, string> = {
  Closed_Fist: "/samples/fist.wav",
};

// -------------------- External Audio Playback Functions --------------------
function playNoteManual(
  gestureLabel: string,
  handPosition: { x: number; y: number },
  bpm: number,
  noteLength: number,
  audioContextRef: React.MutableRefObject<AudioContext | null>,
  samplesRef: React.MutableRefObject<Record<string, AudioBuffer>>,
  convolverRef: React.MutableRefObject<ConvolverNode | null>,
  notePlayingRef: React.MutableRefObject<boolean>,
  setCurrentNote: (n: number | null) => void
) {
  const audioCtx = audioContextRef.current;
  if (!audioCtx) return;
  const sampleBuffer = samplesRef.current[gestureLabel];
  if (!sampleBuffer) {
    console.warn(`No sample loaded for gesture: ${gestureLabel}`);
    return;
  }
  if (notePlayingRef.current) return;
  const noteIndex = Math.min(11, Math.floor(handPosition.x * 12));
  setCurrentNote(noteIndex);
  setTimeout(() => setCurrentNote(null), 500);
  const duration = (60 / bpm) * noteLength;
  const source = audioCtx.createBufferSource();
  source.buffer = sampleBuffer;
  source.playbackRate.value = Math.pow(2, noteIndex / 12);
  const gainNode = audioCtx.createGain();
  gainNode.gain.value = 0.2 + (1 - handPosition.y) * 0.8;
  source.connect(gainNode);
  if (convolverRef.current) {
    gainNode.connect(convolverRef.current);
    convolverRef.current.connect(audioCtx.destination);
  } else {
    gainNode.connect(audioCtx.destination);
  }
  source.start();
  source.stop(audioCtx.currentTime + duration);
  notePlayingRef.current = true;
  setTimeout(() => {
    notePlayingRef.current = false;
  }, duration * 1000);
}

function playChord(
  chordLabel: string,
  bpm: number,
  noteLength: number,
  audioContextRef: React.MutableRefObject<AudioContext | null>,
  samplesRef: React.MutableRefObject<Record<string, AudioBuffer>>,
  convolverRef: React.MutableRefObject<ConvolverNode | null>,
  notePlayingRef: React.MutableRefObject<boolean>
) {
  const audioCtx = audioContextRef.current;
  if (!audioCtx) return;
  const duration = (60 / bpm) * noteLength;
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
  intervals.forEach((interval) => {
    const source = audioCtx.createBufferSource();
    source.buffer = samplesRef.current["Closed_Fist"];
    const semitoneOffset = noteToSemitone[root] + interval;
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

function playArpeggio(
  chordLabel: string,
  duration: number,
  octaves: number,
  direction: "up" | "down" | "upDown",
  bpm: number,
  noteLength: number,
  audioContextRef: React.MutableRefObject<AudioContext | null>,
  samplesRef: React.MutableRefObject<Record<string, AudioBuffer>>,
  convolverRef: React.MutableRefObject<ConvolverNode | null>,
  notePlayingRef: React.MutableRefObject<boolean>
) {
  const audioCtx = audioContextRef.current;
  if (!audioCtx) return;
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
  const totalNotes = pattern.length;
  const noteDuration = duration / totalNotes;
  pattern.forEach((intervalVal, i) => {
    const source = audioCtx.createBufferSource();
    source.buffer = samplesRef.current["Closed_Fist"];
    const semitoneOffset = noteToSemitone[root] + intervalVal;
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
    source.start(audioCtx.currentTime + i * noteDuration);
    source.stop(audioCtx.currentTime + (i + 1) * noteDuration);
  });
  notePlayingRef.current = true;
  setTimeout(() => {
    notePlayingRef.current = false;
  }, duration * 1000);
}

// ==================== Sequencer Component ====================
interface SequencerProps {
  bpm: number;
  noteLength: number;
  selectedKey: string;
  arpeggioOctaves: number;
  arpeggioDirection: "up" | "down" | "upDown";
  triggerNote: (cellIndex: number, noteType: "note" | "chord" | "arpeggio") => void;
}

function Sequencer({
  bpm,
  noteLength,
  selectedKey,
  arpeggioOctaves,
  arpeggioDirection,
  triggerNote,
}: SequencerProps) {
  const NUM_BARS = 8;
  const BEATS_PER_BAR = 4;
  const SUBDIVISIONS = 2;
  const TOTAL_CELLS = NUM_BARS * BEATS_PER_BAR * SUBDIVISIONS;

  type Note = { time: number; type: "note" | "chord" | "arpeggio" };
  type Layer = { id: number; notes: Note[] };

  const createEmptyLayer = (id: number): Layer => ({ id, notes: [] });
  const [layers, setLayers] = useState<Layer[]>([createEmptyLayer(1)]);
  const [playhead, setPlayhead] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  const toggleNote = (layerId: number, cellIndex: number, noteType: "note" | "chord" | "arpeggio") => {
    setLayers(prev =>
      prev.map(layer => {
        if (layer.id !== layerId) return layer;
        const exists = layer.notes.find(n => n.time === cellIndex && n.type === noteType);
        let newNotes;
        if (exists) {
          newNotes = layer.notes.filter(n => !(n.time === cellIndex && n.type === noteType));
        } else {
          newNotes = [...layer.notes, { time: cellIndex, type: noteType }];
        }
        return { ...layer, notes: newNotes };
      })
    );
  };

  useEffect(() => {
    if (!isPlaying) return;
    const startTime = Date.now();
    const cellDuration = (60 / bpm / SUBDIVISIONS) * 1000;
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const currentCell = Math.floor((elapsed / cellDuration) % TOTAL_CELLS);
      setPlayhead(currentCell);
      layers.forEach(layer => {
        layer.notes.forEach(note => {
          if (note.time === currentCell) {
            triggerNote(currentCell, note.type);
          }
        });
      });
    }, cellDuration);
    return () => clearInterval(interval);
  }, [isPlaying, bpm, layers, triggerNote]);

  return (
    <div>
      <div className="flex justify-between mb-2">
        <Button onClick={() => setIsPlaying(!isPlaying)} className="px-4 py-2 bg-teal-500 text-white">
          {isPlaying ? "Stop Playback" : "Start Playback"}
        </Button>
        <Button onClick={() => setLayers([createEmptyLayer(1)])} className="px-4 py-2 bg-red-500 text-white">
          Clear
        </Button>
      </div>
      <div className="overflow-auto border border-gray-300">
        {layers.map(layer => (
          <div key={layer.id} className="flex">
            {Array.from({ length: TOTAL_CELLS }, (_, i) => {
              const active = layer.notes.some(n => n.time === i);
              const isActiveCell = playhead === i;
              const isBarStart = i % (BEATS_PER_BAR * SUBDIVISIONS) === 0;
              return (
                <div
                  key={i}
                  onClick={() => toggleNote(layer.id, i, "note")}
                  className={`w-6 h-6 border ${isBarStart ? "border-l-4" : "border-l"} cursor-pointer ${
                    active ? "bg-teal-300" : ""
                  } ${isActiveCell ? "bg-yellow-300" : ""}`}
                />
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

// ==================== ControlPanel Component ====================
interface ControlPanelProps {
  bpm: number;
  setBpm: (bpm: number) => void;
  noteLength: number;
  setNoteLength: (length: number) => void;
  selectedKey: string;
  setSelectedKey: (key: string) => void;
  instrument: "piano" | "guitar";
  setInstrument: (inst: "piano" | "guitar") => void;
  mode: "manual" | "autoChord" | "arpeggiator" | "conductor";
  setMode: (mode: "manual" | "autoChord" | "arpeggiator" | "conductor") => void;
  arpeggioOctaves: number;
  setArpeggioOctaves: (oct: number) => void;
  arpeggioDirection: "up" | "down" | "upDown";
  setArpeggioDirection: (dir: "up" | "down" | "upDown") => void;
}
function ControlPanel({
  bpm,
  setBpm,
  noteLength,
  setNoteLength,
  selectedKey,
  setSelectedKey,
  instrument,
  setInstrument,
  mode,
  setMode,
  arpeggioOctaves,
  setArpeggioOctaves,
  arpeggioDirection,
  setArpeggioDirection,
}: ControlPanelProps) {
  return (
    <Card className="max-w-md mx-auto bg-white shadow-lg">
      <CardHeader>
        <h3 className="text-lg font-semibold text-teal-800">Controls</h3>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap items-center justify-center gap-4 mb-4">
          <label className="flex items-center gap-2 text-teal-700">
            BPM:
            <input
              type="number"
              value={bpm}
              onChange={(e) => setBpm(Number(e.target.value))}
              className="w-16 px-2 py-1 border rounded focus:ring-teal-500"
            />
          </label>
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
          <label className="flex items-center gap-2 text-teal-700">
            Instrument:
            <select
              value={instrument}
              onChange={(e) => setInstrument(e.target.value as "piano" | "guitar")}
              className="px-2 py-1 border rounded focus:ring-teal-500"
            >
              <option value="piano">Piano</option>
              <option value="guitar">Guitar</option>
            </select>
          </label>
          <label className="flex items-center gap-2 text-teal-700">
            Mode:
            <select
              value={mode}
              onChange={(e) => setMode(e.target.value as typeof mode)}
              className="px-2 py-1 border rounded focus:ring-teal-500"
            >
              <option value="manual">Manual</option>
              <option value="autoChord">Auto Chord</option>
              <option value="arpeggiator">Arpeggiator</option>
              <option value="conductor">Conductor</option>
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
                  <option value={3}>3 Octaves</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Direction</label>
                <div className="flex flex-col gap-2">
                  <label className="flex items-center gap-1">
                    <input
                      type="radio"
                      value="up"
                      checked={arpeggioDirection === "up"}
                      onChange={() => setArpeggioDirection("up")}
                      className="accent-teal-600"
                    />
                    <span className="text-sm">Up</span>
                  </label>
                  <label className="flex items-center gap-1">
                    <input
                      type="radio"
                      value="down"
                      checked={arpeggioDirection === "down"}
                      onChange={() => setArpeggioDirection("down")}
                      className="accent-teal-600"
                    />
                    <span className="text-sm">Down</span>
                  </label>
                  <label className="flex items-center gap-1">
                    <input
                      type="radio"
                      value="upDown"
                      checked={arpeggioDirection === "upDown"}
                      onChange={() => setArpeggioDirection("upDown")}
                      className="accent-teal-600"
                    />
                    <span className="text-sm">Up & Down</span>
                  </label>
                </div>
              </div>
            </div>
          )}
        </div>
        <Card className="mt-4 rounded-xl border border-teal-100 shadow-lg bg-white overflow-hidden">
          <CardHeader className="bg-teal-50 py-3 px-4 border-b border-teal-100">
            <h2 className="text-lg font-medium text-teal-800">Circle of Fifths</h2>
          </CardHeader>
          <CardContent className="p-4 flex justify-center">
            <CircleOfFifths
              selectedKey={selectedKey === "None" ? "C Major" : selectedKey}
              onSelectKey={(keyName) => setSelectedKey(keyName)}
            />
          </CardContent>
        </Card>
        
      </CardContent>
    </Card>
  );
}

// ==================== Main Page Component ====================
export default function Page() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const guitarRef = useRef<ThreeGuitarVisualizerHandle>(null);

  // MediaPipe and webcam state
  const [gestureRecognizer, setGestureRecognizer] = useState<GestureRecognizer | null>(null);
  const [webcamEnabled, setWebcamEnabled] = useState(false);

  // Control states
  const [bpm, setBpm] = useState<number>(120);
  const [noteLength, setNoteLength] = useState<number>(1);
  const [selectedKey, setSelectedKey] = useState<string>("None");
  const [instrument, setInstrument] = useState<"piano" | "guitar">("piano");
  const [mode, setMode] = useState<"manual" | "autoChord" | "arpeggiator" | "conductor">("manual");
  const [arpeggioOctaves, setArpeggioOctaves] = useState<number>(1);
  const [arpeggioDirection, setArpeggioDirection] = useState<"up" | "down" | "upDown">("up");

  // For webcam gesture-based performance (central column)
  const [currentNote, setCurrentNote] = useState<number | null>(null);
  const [currentChordCell, setCurrentChordCell] = useState<number | null>(null);
  const currentChordName =
    currentChordCell !== null ? getChordsForKey(selectedKey)[currentChordCell]?.name : "";
  const [handPos, setHandPos] = useState<{ x: number; y: number } | null>(null);

  // Audio refs and state
  const audioContextRef = useRef<AudioContext | null>(null);
  const samplesRef = useRef<Record<string, AudioBuffer>>({});
  const convolverRef = useRef<ConvolverNode | null>(null);
  const notePlayingRef = useRef<boolean>(false);
  const [backingBuffer, setBackingBuffer] = useState<AudioBuffer | null>(null);
  const backingSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const [conductorProgress, setConductorProgress] = useState<number>(0);
  const [conductorStarted, setConductorStarted] = useState<boolean>(false);
  const [countdown, setCountdown] = useState<number | string | null>(null);
  const [conductorGameTime, setConductorGameTime] = useState<number>(0);
  const [conductorStartTime, setConductorStartTime] = useState<number | null>(null);
  const [expectedProgress, setExpectedProgress] = useState<number>(0);
  const [gameScore, setGameScore] = useState<number | null>(null);
  const errorSumRef = useRef<number>(0);
  const errorCountRef = useRef<number>(0);

  // -------------------- Audio Initialization --------------------
  const initAudio = useCallback(async () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    const audioCtx = audioContextRef.current;
    const samples: Record<string, AudioBuffer> = {};
    for (const [gesture, url] of Object.entries(sampleURLs)) {
      try {
        const response = await fetch(url);
        if (!response.ok) {
          console.error(`Failed to fetch sample for ${gesture}: ${response.statusText}`);
          continue;
        }
        const arrayBuffer = await response.arrayBuffer();
        samples[gesture] = await audioCtx.decodeAudioData(arrayBuffer);
      } catch (error) {
        console.error(`Error loading sample for ${gesture}:`, error);
      }
    }
    samplesRef.current = samples;
    try {
      const irResponse = await fetch("/samples/impulse.wav");
      if (irResponse.ok) {
        const irBuffer = await irResponse.arrayBuffer();
        const convolver = audioCtx.createConvolver();
        convolver.buffer = await audioCtx.decodeAudioData(irBuffer);
        convolverRef.current = convolver;
      } else {
        console.error("Failed to fetch impulse response:", irResponse.statusText);
      }
    } catch (err) {
      console.error("Error loading impulse response:", err);
    }
    try {
      const backingResponse = await fetch("/samples/backing.mp3");
      if (backingResponse.ok) {
        const trackBuffer = await backingResponse.arrayBuffer();
        setBackingBuffer(await audioCtx.decodeAudioData(trackBuffer));
      } else {
        console.error("Failed to fetch backing track:", backingResponse.statusText);
      }
    } catch (err) {
      console.error("Error loading backing track:", err);
    }
  }, []);

  // -------------------- Gesture Recognizer Initialization --------------------
  const initGestureRecognizer = useCallback(async () => {
    try {
      const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.1/wasm"
      );
      const recognizer = await GestureRecognizer.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath:
            "https://storage.googleapis.com/mediapipe-tasks/gesture_recognizer/gesture_recognizer.task",
        },
        numHands: 2,
        runningMode: "VIDEO",
      });
      setGestureRecognizer(recognizer);
      console.log("Gesture recognizer initialized.");
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

  // -------------------- Webcam Initialization --------------------
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

  // -------------------- Canvas Context Loss Handler --------------------
  useEffect(() => {
    const canvasEl = canvasRef.current;
    if (!canvasEl) return;
    const handleContextLost = (e: Event) => {
      e.preventDefault();
      console.warn("WebGL context lost; reinitializing gesture recognizer.");
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

  function getHandPosition(landmarks: { x: number; y: number }[]) {
    const avg = landmarks.reduce(
      (acc, lm) => ({ x: acc.x + lm.x, y: acc.y + lm.y }),
      { x: 0, y: 0 }
    );
    return { x: 1 - avg.x / landmarks.length, y: avg.y / landmarks.length };
  }

  function updateHandPos(landmarks: { x: number; y: number }[]) {
    const pos = getHandPosition(landmarks);
    if (mode === "conductor") {
      const p = Math.max(0, Math.min(1, 1 - pos.y));
      setConductorProgress(p);
    }
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
    if (chordObj) playChord(chordObj.name, bpm, noteLength, audioContextRef, samplesRef, convolverRef, notePlayingRef);
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
      playArpeggio(
        chordObj.name,
        (60 / bpm) * noteLength,
        arpeggioOctaves,
        arpeggioDirection,
        bpm,
        noteLength,
        audioContextRef,
        samplesRef,
        convolverRef,
        notePlayingRef
      );
  }

  const triggerSequencerNote = useCallback(
    (cellIndex: number, noteType: "note" | "chord" | "arpeggio") => {
      if (noteType === "note") {
        playNoteManual("Closed_Fist", { x: 0.5, y: 0.5 }, bpm, noteLength, audioContextRef, samplesRef, convolverRef, notePlayingRef, setCurrentNote);
      } else if (noteType === "chord") {
        const chords = getChordsForKey(selectedKey);
        const chord = chords[cellIndex % chords.length]?.name;
        if (chord)
          playChord(chord, bpm, noteLength, audioContextRef, samplesRef, convolverRef, notePlayingRef);
      } else if (noteType === "arpeggio") {
        const chords = getChordsForKey(selectedKey);
        const chord = chords[cellIndex % chords.length]?.name;
        if (chord)
          playArpeggio(
            chord,
            (60 / bpm) * noteLength,
            arpeggioOctaves,
            arpeggioDirection,
            bpm,
            noteLength,
            audioContextRef,
            samplesRef,
            convolverRef,
            notePlayingRef
          );
      }
    },
    [bpm, noteLength, selectedKey, arpeggioOctaves, arpeggioDirection]
  );

  return (
    <>
      <Header />
      <div className="container mx-auto p-4">
        <div className="flex flex-row gap-4">
          {/* Left Column: 8-Bar Sequencer */}
          <div className="w-1/4">
            <Card className="p-4 rounded-2xl bg-gray-50 shadow-lg">
              <CardHeader>
                <h2 className="text-xl font-bold text-teal-800">8‑Bar Recorder</h2>
              </CardHeader>
              <CardContent>
                <Sequencer
                  bpm={bpm}
                  noteLength={noteLength}
                  selectedKey={selectedKey}
                  arpeggioOctaves={arpeggioOctaves}
                  arpeggioDirection={arpeggioDirection}
                  triggerNote={triggerSequencerNote}
                />
              </CardContent>
            </Card>
          </div>
          {/* Central Column: Webcam Feed & Visualizer */}
          <div className="w-1/2 flex flex-col items-center gap-4 relative">
            <div className="relative w-[640px] h-[480px] border rounded-lg shadow-lg overflow-hidden">
              {!webcamEnabled ? (
                <Button
                  onClick={() => {
                    setWebcamEnabled(true);
                    if (audioContextRef.current && audioContextRef.current.state === "suspended") {
                      audioContextRef.current.resume();
                    }
                  }}
                  className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 px-8 py-4 text-xl z-20 bg-teal-500 hover:bg-teal-600 text-white"
                >
                  Enable Webcam
                </Button>
              ) : (
                <Button
                  onClick={() => {
                    setWebcamEnabled(false);
                    if (backingSourceRef.current) {
                      backingSourceRef.current.stop();
                      backingSourceRef.current = null;
                    }
                    setConductorStarted(false);
                  }}
                  className="absolute top-4 left-4 px-4 py-2 text-base z-20 bg-teal-500 hover:bg-teal-600 text-white"
                >
                  Stop Video
                </Button>
              )}
              <video ref={videoRef} className="w-[640px] h-[480px] scale-x-[-1]" muted playsInline />
              <canvas ref={canvasRef} width={640} height={480} className="absolute top-0 left-0" />
              {instrument === "guitar" && (
                <div className="absolute inset-0 pointer-events-none">
                  {[0, 1, 2, 3, 4, 5].map((i) => {
                    const topPercent = ((i + 0.5) / 6) * 100;
                    return (
                      <div
                        key={i}
                        style={{
                          position: "absolute",
                          top: `${topPercent}%`,
                          left: 0,
                          right: 0,
                          height: "1px",
                          background: "rgba(255,255,255,0.8)",
                        }}
                      />
                    );
                  })}
                </div>
              )}
              {(mode === "autoChord" || mode === "arpeggiator" || mode === "conductor") && (
                <div className="absolute top-0 left-0 w-[640px] h-[480px] grid grid-cols-3 grid-rows-3 gap-0 bg-white/40">
                  {getChordsForKey(selectedKey).map((chord, index) => (
                    <div
                      key={index}
                      className={`border border-teal-500 flex flex-col items-center justify-center ${
                        currentChordCell === index ? "bg-teal-300" : "bg-transparent"
                      }`}
                    >
                      <div className="text-lg text-teal-800">{chord.name}</div>
                      <div className="text-sm text-teal-600">{chord.roman}</div>
                    </div>
                  ))}
                </div>
              )}
              {mode === "conductor" && (
                <ConductorOverlay progress={conductorProgress} expectedProgress={expectedProgress} />
              )}
            </div>
            {mode === "manual" && (
              <div className="w-[640px] h-[280px] border rounded-lg shadow-lg">
                {instrument === "guitar" ? (
                  <ThreeGuitarVisualizer ref={guitarRef} currentChord={currentChordName} />
                ) : (
                  <ThreePianoVisualizer currentNote={currentNote} />
                )}
              </div>
            )}
          </div>
          {/* Right Column: Control Panel */}
          <div className="w-1/4">
            <Card className="max-w-md mx-auto bg-white shadow-lg">
              <CardHeader>
                <h3 className="text-lg font-semibold text-teal-800">Controls</h3>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap items-center justify-center gap-4 mb-4">
                  <label className="flex items-center gap-2 text-teal-700">
                    BPM:
                    <input
                      type="number"
                      value={bpm}
                      onChange={(e) => setBpm(Number(e.target.value))}
                      className="w-16 px-2 py-1 border rounded focus:ring-teal-500"
                    />
                  </label>
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
                  <label className="flex items-center gap-2 text-teal-700">
                    Instrument:
                    <select
                      value={instrument}
                      onChange={(e) => setInstrument(e.target.value as "piano" | "guitar")}
                      className="px-2 py-1 border rounded focus:ring-teal-500"
                    >
                      <option value="piano">Piano</option>
                      <option value="guitar">Guitar</option>
                    </select>
                  </label>
                  <label className="flex items-center gap-2 text-teal-700">
                    Mode:
                    <select
                      value={mode}
                      onChange={(e) => setMode(e.target.value as typeof mode)}
                      className="px-2 py-1 border rounded focus:ring-teal-500"
                    >
                      <option value="manual">Manual</option>
                      <option value="autoChord">Auto Chord</option>
                      <option value="arpeggiator">Arpeggiator</option>
                      <option value="conductor">Conductor</option>
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
                          <option value={3}>3 Octaves</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">Direction</label>
                        <div className="flex flex-col gap-2">
                          <label className="flex items-center gap-1">
                            <input
                              type="radio"
                              value="up"
                              checked={arpeggioDirection === "up"}
                              onChange={() => setArpeggioDirection("up")}
                              className="accent-teal-600"
                            />
                            <span className="text-sm">Up</span>
                          </label>
                          <label className="flex items-center gap-1">
                            <input
                              type="radio"
                              value="down"
                              checked={arpeggioDirection === "down"}
                              onChange={() => setArpeggioDirection("down")}
                              className="accent-teal-600"
                            />
                            <span className="text-sm">Down</span>
                          </label>
                          <label className="flex items-center gap-1">
                            <input
                              type="radio"
                              value="upDown"
                              checked={arpeggioDirection === "upDown"}
                              onChange={() => setArpeggioDirection("upDown")}
                              className="accent-teal-600"
                            />
                            <span className="text-sm">Up & Down</span>
                          </label>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                <Card className="mt-4 rounded-xl border border-teal-100 shadow-lg bg-white overflow-hidden">
                  <CardHeader className="bg-teal-50 py-3 px-4 border-b border-teal-100">
                    <h2 className="text-lg font-medium text-teal-800">Circle of Fifths</h2>
                  </CardHeader>
                  <CardContent className="p-4 flex justify-center">
                    <CircleOfFifths
                      selectedKey={selectedKey === "None" ? "C Major" : selectedKey}
                      onSelectKey={(keyName) => setSelectedKey(keyName)}
                    />
                  </CardContent>
                </Card>
                <Button
                  onClick={() => {
                    console.log("Test Closed_Fist Sample clicked.");
                    if (mode === "manual") {
                      playNoteManual("Closed_Fist", { x: 0.5, y: 0.5 }, bpm, noteLength, audioContextRef, samplesRef, convolverRef, notePlayingRef, setCurrentNote);
                    } else if (mode === "autoChord") {
                      const chords = getChordsForKey(selectedKey);
                      if (chords.length)
                        playChord(chords[0].name, bpm, noteLength, audioContextRef, samplesRef, convolverRef, notePlayingRef);
                    } else if (mode === "arpeggiator") {
                      const chords = getChordsForKey(selectedKey);
                      if (chords.length)
                        playArpeggio(
                          chords[0].name,
                          (60 / bpm) * noteLength,
                          arpeggioOctaves,
                          arpeggioDirection,
                          bpm,
                          noteLength,
                          audioContextRef,
                          samplesRef,
                          convolverRef,
                          notePlayingRef
                        );
                    }
                  }}
                  className="mt-4 w-full px-6 py-2 bg-teal-500 hover:bg-teal-600 text-white"
                >
                  Test Closed_Fist Sample
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
}
