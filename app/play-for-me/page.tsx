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

// -------------------- Chord Pattern Definitions --------------------
const chordPatterns = [
  { id: 1, name: "Basic Progression", description: "A simple 4-chord progression (I-IV-V-I)", patternBeats: 4 },
  { id: 2, name: "Pop Ballad", description: "A classic pop chord sequence (I-V-vi-IV)", patternBeats: 4 },
  { id: 3, name: "Jazz Progression", description: "A ii-V-I jazz pattern with extensions", patternBeats: 4 },
  { id: 4, name: "Blues Pattern", description: "A 12-bar blues inspired pattern", patternBeats: 4 },
];

// Add this near the top with your other constants
const rhythmPatterns = [
    {
      id: 1,
      name: "Basic",
      pattern: [2, 2, 1, 1], // Longer beats followed by shorter beats
      velocities: [0.7, 0.5, 0.6, 0.5], // Simple dynamics
      description: "Simple even rhythm"
    },
    {
      id: 2,
      name: "Waltz",
      pattern: [1.2, 0.4, 0.4, 1], // ONE-two-three-four
      velocities: [0.8, 0.4, 0.5, 0.6], 
      description: "Emphasized first beat"
    },
    {
      id: 3,
      name: "Backbeat", 
      pattern: [0.8, 1.2, 0.8, 1.2], // Emphasis on beats 2 and 4
      velocities: [0.6, 0.8, 0.5, 0.7],
      description: "Emphasis on off-beats"
    },
    {
      id: 4,
      name: "Syncopated",
      pattern: [0.7, 1, 0.5, 0.8], // Complex rhythm
      velocities: [0.6, 0.9, 0.5, 0.8],
      description: "Complex rhythm pattern"
    }
  ];

// -------------------- getChordsForKey --------------------
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

// -------------------- getChordPatternForCell --------------------
function getChordPatternForCell(cellIndex: number, selectedKey: string, patternId: number) {
  const chords = getChordsForKey(selectedKey);
  const rootChord = chords[cellIndex]?.name || "";
  if (!rootChord) return [];

  const rootIndex = chords.findIndex((ch) => ch.name === rootChord);
  if (rootIndex === -1) return [];

  switch (patternId) {
    case 1: // Basic
      return [
        rootChord,
        chords[(rootIndex + 3) % chords.length]?.name || rootChord,
        chords[(rootIndex + 4) % chords.length]?.name || rootChord,
        rootChord
      ];
    case 2: // Pop Ballad
      return [
        rootChord,
        chords[(rootIndex + 4) % chords.length]?.name || rootChord,
        chords[(rootIndex + 5) % chords.length]?.name || rootChord,
        chords[(rootIndex + 3) % chords.length]?.name || rootChord
      ];
    case 3: // Jazz
      return [
        chords[(rootIndex + 1) % chords.length]?.name || rootChord,
        chords[(rootIndex + 4) % chords.length]?.name || rootChord,
        rootChord,
        rootChord
      ];
    case 4: // Blues
      return [
        rootChord,
        rootChord,
        chords[(rootIndex + 3) % chords.length]?.name || rootChord,
        chords[(rootIndex + 4) % chords.length]?.name || rootChord
      ];
    default:
      return [rootChord, rootChord, rootChord, rootChord];
  }
}

// -------------------- Main --------------------
export default function PlayForMePage() {
  const [selectedKey, setSelectedKey] = useState("C Major");
  const [selectedPattern, setSelectedPattern] = useState(1);
  const [selectedRhythm, setSelectedRhythm] = useState<number>(1);

  // MediaPipe
  const [gestureRecognizer, setGestureRecognizer] = useState<GestureRecognizer | null>(null);
  const [webcamEnabled, setWebcamEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [recognizedGesture, setRecognizedGesture] = useState("");
  const [handPosition, setHandPosition] = useState<{ x: number; y: number } | null>(null);
  const [handVisible, setHandVisible] = useState(false);

  // Performance
  const [instrument, setInstrument] = useState<"piano" | "guitar">("piano");
  const [bpm, setBpm] = useState(90);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentChordCell, setCurrentChordCell] = useState<number | null>(null);
  const [nextChordCell, setNextChordCell] = useState<number | null>(null);
  const [currentPattern, setCurrentPattern] = useState<string[]>([]);
  const [currentBeatIndex, setCurrentBeatIndex] = useState(0);
  const [visualizerNotes, setVisualizerNotes] = useState<string[]>([]);

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
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const audioCtx = audioContextRef.current;
      const samples: Record<string, AudioBuffer> = {};

      // Load piano sample
      try {
        const response = await fetch("/samples/fist.wav");
        if (!response.ok) {
          console.error(`Failed to fetch sample: ${response.statusText}`);
        } else {
          const arrayBuffer = await response.arrayBuffer();
          samples["Closed_Fist"] = await audioCtx.decodeAudioData(arrayBuffer);
        }
      } catch (error) {
        console.error("Error loading sample:", error);
      }
      samplesRef.current = samples;

      // Load impulse response
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
          modelAssetPath: "https://storage.googleapis.com/mediapipe-tasks/gesture_recognizer/gesture_recognizer.task",
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

  // -------------------- On mount --------------------
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

  // -------------------- Webcam setup --------------------
  useEffect(() => {
    const videoEl = videoRef.current;
    if (!webcamEnabled || !videoEl) return;

    let stream: MediaStream | null = null;
    navigator.mediaDevices
      .getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: "user" },
      })
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

  // -------------------- Gesture logic each frame --------------------
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
          if (videoEl! && ctx! && canvasEl! && videoEl.readyState >= videoEl.HAVE_ENOUGH_DATA) {
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
    
                    // Always update the next chord cell with the current hand position
                    setNextChordCell(cellIndex);
    
                    // If the Closed_Fist gesture is made and we're not playing,
                    // start playing the pattern from this cell
                    if (topGesture.categoryName === "Closed_Fist" && !isPlaying && !notePlayingRef.current) {
                      startPlayingPatternFromCell(cellIndex);
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
                const currentColor = "#8b5cf6"; // Purple
                results.landmarks.forEach((lmArr) => {
                  ctx.strokeStyle = currentColor;
                  ctx.lineWidth = 3;
                  const connections = [
                    [0, 1, 2, 3, 4], // thumb
                    [0, 5, 6, 7, 8], // index
                    [9, 10, 11, 12], // middle
                    [13, 14, 15, 16], // ring
                    [17, 18, 19, 20], // pinky
                    [0, 5, 9, 13, 17] // palm
                  ];
                  
                  connections.forEach(conn => {
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
                  
                  // Draw landmarks
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
            
            // Draw chord grid overlay
            drawChordGrid(ctx, canvasEl.width, canvasEl.height);
          }
          
          animationFrameId = requestAnimationFrame(processFrame);
        }
        
        processFrame();
        return () => cancelAnimationFrame(animationFrameId);
      }, [gestureRecognizer, webcamEnabled, isPlaying, selectedKey]);
      
      // Start playing a pattern from a specific cell
      const startPlayingPatternFromCell = (cellIndex: number) => {
        if (isPlaying || notePlayingRef.current) return;
        
        // Set the current chord cell and start playing
        setCurrentChordCell(cellIndex);
        setIsPlaying(true);
        
        // Generate the chord pattern based on the selected pattern id
        const pattern = getChordPatternForCell(cellIndex, selectedKey, selectedPattern);
        setCurrentPattern(pattern);
        
        // Start at the first beat
        setCurrentBeatIndex(0);
        
        // Start the pattern playback
        playPattern(pattern);
      };
      
      // Play through the entire pattern
const playPattern = (pattern: string[]) => {
    if (!pattern || pattern.length === 0) {
      setIsPlaying(false);
      return;
    }
    
    // Get the rhythm pattern details
    const rhythmPattern = rhythmPatterns.find(r => r.id === selectedRhythm) || rhythmPatterns[0];
    const beatDurations = rhythmPattern.pattern.map(p => (60 / bpm * 1000) * p); // Adjust beat durations
    const velocities = rhythmPattern.velocities;
    
    // Play the first chord immediately
    playChord(pattern[0], beatDurations[0], velocities[0]);
    setCurrentBeatIndex(0);
    
    // Set up the beat counter and chord progression
    let currentBeat = 0;
    
    // Clear any existing timers to prevent overlaps
    if (beatTimerRef.current) {
      clearTimeout(beatTimerRef.current);
      beatTimerRef.current = null;
    }
    
    const progressPattern = () => {
      currentBeat++;
      
      // If we've played all beats, end or repeat based on next position
      if (currentBeat >= pattern.length) {
        // If there's a next chord cell queued up, play that next
        if (nextChordCell !== null && nextChordCell !== currentChordCell) {
          const nextPattern = getChordPatternForCell(nextChordCell, selectedKey, selectedPattern);
          
          // Important: Set current cell to the next cell
          setCurrentChordCell(nextChordCell);
          setCurrentPattern(nextPattern);
          setCurrentBeatIndex(0);
          
          // Reset the isPlaying state briefly to allow new input
          setIsPlaying(false);
          
          // Start the new pattern after a brief pause
          setTimeout(() => {
            playPattern(nextPattern);
          }, 50);
        } else {
          // Otherwise finish playing
          setIsPlaying(false);
          setCurrentBeatIndex(-1);
          setCurrentChordCell(null);
          // Reset nextChordCell to ensure it doesn't get stuck
          setNextChordCell(null);
        }
        return;
      }
      
      // Otherwise play the next beat in the current pattern
      setCurrentBeatIndex(currentBeat);
      playChord(
        pattern[currentBeat], 
        beatDurations[currentBeat % beatDurations.length],
        velocities[currentBeat % velocities.length]
      );
      
      // Schedule the next beat with the appropriate duration
      beatTimerRef.current = setTimeout(
        progressPattern, 
        beatDurations[currentBeat % beatDurations.length]
      );
    };
    
    // Schedule the next beat
    beatTimerRef.current = setTimeout(progressPattern, beatDurations[0]);
  };

  // -------------------- drawChordGrid --------------------
  function drawChordGrid(ctx: CanvasRenderingContext2D, width: number, height: number) {
    const cellWidth = width / 3;
    const cellHeight = height / 3;
    const chords = getChordsForKey(selectedKey);

    ctx.save();
    // Grid lines
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

    // Chord names
    ctx.font = "bold 24px Arial";
    ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 3; col++) {
        const index = row * 3 + col;
        const chordObj = chords[index];
        if (!chordObj) continue;

        if (currentChordCell === index) {
          // highlight current
          ctx.fillStyle = "rgba(139, 92, 246, 0.5)";
          ctx.fillRect(col * cellWidth, row * cellHeight, cellWidth, cellHeight);
          ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
        } else if (nextChordCell === index) {
          // highlight next
          ctx.fillStyle = "rgba(139, 92, 246, 0.2)";
          ctx.fillRect(col * cellWidth, row * cellHeight, cellWidth, cellHeight);
          ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
        }
        
        ctx.fillText(
          chordObj.name,
          col * cellWidth + cellWidth / 2,
          row * cellHeight + cellHeight / 2 - 12
        );

        ctx.font = "16px Arial";
        ctx.fillText(
          chordObj.roman,
          col * cellWidth + cellWidth / 2,
          row * cellHeight + cellHeight / 2 + 12
        );
        ctx.font = "bold 24px Arial";
      }
    }
    ctx.restore();
  }



  // -------------------- playChord --------------------
  function playChord(chordName: string, beatDurationMs: number, velocity: number = 0.7) {
    const audioCtx = audioContextRef.current;
    if (!audioCtx || notePlayingRef.current) return;
  
    // Prevent rapid triggering
    notePlayingRef.current = true;
    setTimeout(() => {
      notePlayingRef.current = false;
    }, 300);
  
    if (instrument === "piano") {
      const sampleBuffer = samplesRef.current["Closed_Fist"];
      if (!sampleBuffer) return;
  
      const notes = getNotesForChord(chordName);
      setVisualizerNotes(notes.map(semitone => semitoneToNoteName(semitone)));
  
      const chordLengthSec = beatDurationMs / 1000;
      
      // Apply velocity variations to make it sound more natural
      notes.forEach((semitones, i) => {
        const source = audioCtx.createBufferSource();
        source.buffer = sampleBuffer;
        source.playbackRate.value = Math.pow(2, semitones / 12);
        
        const gainNode = audioCtx.createGain();
        // Use velocity to adjust volume - more natural dynamics
        const noteVelocity = velocity * (1 - (i * 0.05)); // Slightly quieter for higher notes
        gainNode.gain.value = noteVelocity / notes.length;
        
        // Add slight delay to notes after the first for arpeggiated feel
        const startTime = audioCtx.currentTime + (i * 0.02);
        
        source.connect(gainNode);
        if (convolverRef.current) {
          gainNode.connect(convolverRef.current);
          convolverRef.current.connect(audioCtx.destination);
        } else {
          gainNode.connect(audioCtx.destination);
        }
        
        source.start(startTime);
        source.stop(startTime + chordLengthSec);
      });
    } else if (instrument === "guitar") {
      if (guitarRef.current) {
        // If your ThreeGuitarVisualizer implements a playChord method:
        // guitarRef.current.playChord(chordName, velocity);
      }
    }
  }

  // -------------------- getNotesForChord --------------------
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
    const intervals: number[] = [0]; // root

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

  // -------------------- semitoneToNoteName --------------------
  function semitoneToNoteName(semitone: number): string {
    const noteNames = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
    const octave = Math.floor(semitone / 12) + 4;
    const noteName = noteNames[semitone % 12];
    return `${noteName}${octave}`;
  }

  // -------------------- handleKeyChange --------------------
  const handleKeyChange = (key: string) => {
    setSelectedKey(key);
  };

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
          <h1 className="text-4xl font-bold text-purple-800 mb-3">Play For Me</h1>
          <p className="text-xl text-purple-600 max-w-3xl mx-auto">
            Let the app play chord progressions for you based on your gestures.
            Select a starting chord with a closed fist, and watch the magic happen!
          </p>
        </div>

        {/* Main grid layout */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Left panel: Controls */}
          <motion.div className="lg:col-span-2" variants={cardVariants}>
            <Card className="bg-white shadow-md mb-6">
              <CardHeader className="bg-purple-50 border-b border-purple-100">
                <h2 className="text-2xl font-bold text-purple-800">Controls</h2>
              </CardHeader>
              <CardContent className="p-6">
                {/* Instrument Selection */}
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-purple-700 mb-3">Choose Instrument</h3>
                  <div className="flex space-x-2">
                    <Button
                      className={`px-6 py-2 ${instrument === "piano"
                        ? "bg-purple-600 text-white"
                        : "bg-purple-100 text-purple-800"
                      }`}
                      onClick={() => setInstrument("piano")}
                    >
                      Piano
                    </Button>
                    <Button
                      className={`px-6 py-2 ${instrument === "guitar"
                        ? "bg-purple-600 text-white"
                        : "bg-purple-100 text-purple-800"
                      }`}
                      onClick={() => setInstrument("guitar")}
                    >
                      Guitar
                    </Button>
                  </div>
                </div>

                {/* Tempo Control */}
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-purple-700 mb-2">Tempo (BPM)</h3>
                  <div className="flex items-center space-x-4">
                    <input
                      type="range"
                      min="60"
                      max="180"
                      value={bpm}
                      onChange={(e) => setBpm(Number(e.target.value))}
                      className="w-full accent-purple-600"
                    />
                    <span className="text-purple-800 font-semibold">{bpm}</span>
                  </div>
                </div>

                

                {/* Key Selection */}
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-purple-700 mb-3">Select Key</h3>
                  <CircleOfFifths selectedKey={selectedKey} onSelectKey={handleKeyChange} />
                </div>

                {/* Camera Toggle */}
                <div className="mt-8">
                  <Button
                    onClick={() => setWebcamEnabled(!webcamEnabled)}
                    className={`w-full ${
                      webcamEnabled
                        ? "bg-red-500 hover:bg-red-600"
                        : "bg-purple-600 hover:bg-purple-700"
                    } text-white`}
                  >
                    {webcamEnabled ? "Disable Camera" : "Enable Camera"}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Instructions Card */}
            <Card className="bg-white shadow-md">
              <CardHeader className="bg-purple-50 border-b border-purple-100">
                <h2 className="text-2xl font-bold text-purple-800">How to Use</h2>
              </CardHeader>
              <CardContent className="p-6">
                <ol className="list-decimal list-inside space-y-3 text-purple-700">
                  <li>Click "Enable Camera" to start your webcam</li>
                  <li>Position your hand in front of the camera</li>
                  <li>Make a <span className="font-bold">closed fist</span> gesture over a chord cell to start a pattern</li>
                  <li>Move your hand to hover over another chord cell to queue the next pattern</li>
                  <li>The app will automatically play through the pattern and transition to the next one</li>
                </ol>

                <div className="mt-6 bg-purple-50 p-4 rounded-lg border border-purple-200">
                  <h3 className="text-lg font-semibold text-purple-700 mb-2">Current Pattern</h3>

                  <div className="grid grid-cols-4 gap-1">
                    {[0, 1, 2, 3].map((beatIndex) => (
                      <div
                        key={beatIndex}
                        className={`p-2 border rounded text-center ${
                          currentBeatIndex === beatIndex
                            ? "bg-purple-200 border-purple-400"
                            : "bg-white border-purple-100"
                        }`}
                      >
                        <div className="text-sm font-mono text-purple-800">
                          Beat {beatIndex + 1}
                        </div>
                        <div className="font-semibold text-purple-600 mt-1">
                          {currentPattern[beatIndex] || "-"}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Right panel: Camera View & Visualization */}
          <motion.div className="lg:col-span-3" variants={cardVariants}>
            <Card className="bg-white shadow-md">
              <CardHeader className="bg-purple-50 border-b border-purple-100">
                <h2 className="text-2xl font-bold text-purple-800">Gesture Control</h2>
              </CardHeader>
              <CardContent className="p-6">
                <div className="mb-6">
                  <div className="relative aspect-video bg-gray-900 rounded-lg overflow-hidden">
                    {!webcamEnabled ? (
                      <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center bg-gray-800">
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
                          Enable Camera to Start
                        </h3>
                        <p className="text-gray-400">
                          Use a closed fist gesture at different positions on the grid to
                          control chord progressions. Your camera feed is processed locally
                          and never uploaded.
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

                        {/* Hand not visible alert */}
                        <AnimatePresence>
                          {webcamEnabled && !handVisible && (
                            <motion.div
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0 }}
                              className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black/70 text-white px-4 py-2 rounded-lg"
                            >
                              Please show your hand in the camera
                            </motion.div>
                          )}
                        </AnimatePresence>

                        {/* Current gesture label */}
                        {webcamEnabled && recognizedGesture && (
                          <div className="absolute top-4 right-4 bg-black/60 text-white px-3 py-1.5 rounded text-sm">
                            {recognizedGesture}
                          </div>
                        )}

                        {/* Current chord display */}
                        <AnimatePresence>
                          {currentChordCell !== null && (
                            <motion.div
                              initial={{ opacity: 0, scale: 0.9 }}
                              animate={{ opacity: 1, scale: 1 }}
                              exit={{ opacity: 0, scale: 0.9 }}
                              className="absolute left-4 top-4 bg-purple-600/80 backdrop-blur-sm text-white px-4 py-2 rounded-lg shadow-lg"
                            >
                              <p className="font-semibold">
                                Now Playing: {currentPattern[currentBeatIndex]}
                              </p>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </>
                    )}
                  </div>
                </div>

                {/* Visualization area */}
                <div className="mt-8">
                  <h3 className="text-lg font-semibold text-purple-700 mb-3">
                    Instrument Visualization
                  </h3>
                  {/* If you have 3D piano/guitar visuals, place them here */}
                </div>

                {/* Rhythm Selection - add this after the Pattern Selection section in your UI */}
                <div className="mb-6">
                <h3 className="text-lg font-semibold text-purple-700 mb-3">Rhythm Pattern</h3>
                <div className="grid grid-cols-2 gap-2">
                    {rhythmPatterns.map((rhythm) => (
                    <Button
                        key={rhythm.id}
                        className={`px-4 py-2 text-left justify-start ${
                        selectedRhythm === rhythm.id ? "bg-purple-600 text-white" : "bg-purple-100 text-purple-800"
                        }`}
                        onClick={() => setSelectedRhythm(rhythm.id)}
                    >
                        <div className="text-left">
                        <div className="font-medium">{rhythm.name}</div>
                        <div className="text-xs opacity-80">{rhythm.description}</div>
                        </div>
                    </Button>
                    ))}

                    <div className="mt-2">
                    <div className="text-xs text-purple-600 mb-1">Current Rhythm Pattern:</div>
                    <div className="flex space-x-1">
                        {(rhythmPatterns.find(r => r.id === selectedRhythm)?.pattern || []).map((beat, idx) => (
                        <div 
                            key={idx}
                            className="flex-1 bg-purple-100 rounded" 
                            style={{ 
                            height: `${beat * 30}px`,
                            backgroundColor: currentBeatIndex === idx ? 'rgb(192, 132, 252)' : 'rgb(233, 213, 255)'
                            }}
                        />
                        ))}
                    </div>
                    </div>
                </div>
                </div>

                {/* Pattern Selection */}
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-purple-700 mb-3">Chord Pattern</h3>
                  <div className="grid grid-cols-2 gap-2">
                    {chordPatterns.map((pattern) => (
                      <Button
                        key={pattern.id}
                        className={`px-4 py-2 text-left justify-start ${
                          selectedPattern === pattern.id
                            ? "bg-purple-600 text-white"
                            : "bg-purple-100 text-purple-800"
                        }`}
                        onClick={() => setSelectedPattern(pattern.id)}
                      >
                        <div className="text-left">
                          <div className="font-medium">{pattern.name}</div>
                          <div className="text-xs opacity-80">{pattern.description}</div>
                        </div>
                      </Button>
                      
                    ))}
                    {/* Add this visualization in the Current Pattern section */}
                    
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Feature Highlights */}
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
                Focus on musical expression without needing to manually play each chord.
                Perfect for practicing chord progressions or improvising melodies
                over automated backing.
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-b from-purple-600 to-purple-700 text-white shadow-lg">
            <CardContent className="p-6">
              <h3 className="text-xl font-bold mb-2">Dynamic Patterns</h3>
              <p>
                Explore different musical styles with our chord pattern options.
                From simple progressions to complex jazz patterns,
                find the right foundation for your creativity.
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-b from-purple-700 to-purple-800 text-white shadow-lg">
            <CardContent className="p-6">
              <h3 className="text-xl font-bold mb-2">Seamless Transitions</h3>
              <p>
                Move between different chord progressions naturally with our queuing system.
                The music continues flowing as you explore different harmonic territories.
              </p>
            </CardContent>
          </Card>
        </motion.div>

        {/* Footer Navigation */}
        <div className="flex justify-between mt-12">
          <Link href="/">
            <Button variant="outline" className="border-purple-500 text-purple-500 hover:bg-purple-50">
              ← Back to Home
            </Button>
          </Link>
          <Link href="/tutorials">
            <Button variant="outline" className="border-purple-500 text-purple-500 hover:bg-purple-50">
              Tutorials
            </Button>
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
