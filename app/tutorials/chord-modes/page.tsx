"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { FilesetResolver, GestureRecognizer } from "@mediapipe/tasks-vision";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import Header from "@/components/ui/header";
import CircleOfFifths from "@/components/CircleOfFifths";
import { keySignatures } from "../../data/keySignatures";

// Animation variants
const pageVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.5 } },
};

const sectionVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.5 },
  },
};

// Sample progressions
const sampleProgressions: Record<string, Array<{ name: string, chords: string, description: string }>> = {
  "C Major": [
    { name: "I-IV-V", chords: "C - F - G", description: "The most common progression in pop and rock" },
    { name: "I-V-vi-IV", chords: "C - G - Am - F", description: "Used in countless pop hits" },
    { name: "ii-V-I", chords: "Dm - G - C", description: "The quintessential jazz progression" }
  ],
  "G Major": [
    { name: "I-IV-V", chords: "G - C - D", description: "The most common progression in pop and rock" },
    { name: "I-V-vi-IV", chords: "G - D - Em - C", description: "Used in countless pop hits" },
    { name: "ii-V-I", chords: "Am - D - G", description: "The quintessential jazz progression" }
  ],
  "D Major": [
    { name: "I-IV-V", chords: "D - G - A", description: "The most common progression in pop and rock" },
    { name: "I-V-vi-IV", chords: "D - A - Bm - G", description: "Used in countless pop hits" },
    { name: "ii-V-I", chords: "Em - A - D", description: "The quintessential jazz progression" }
  ],
  "A Major": [
    { name: "I-IV-V", chords: "A - D - E", description: "The most common progression in pop and rock" },
    { name: "I-V-vi-IV", chords: "A - E - F#m - D", description: "Used in countless pop hits" },
    { name: "ii-V-I", chords: "Bm - E - A", description: "The quintessential jazz progression" }
  ],
  "E Major": [
    { name: "I-IV-V", chords: "E - A - B", description: "The most common progression in pop and rock" },
    { name: "I-V-vi-IV", chords: "E - B - C#m - A", description: "Used in countless pop hits" },
    { name: "ii-V-I", chords: "F#m - B - E", description: "The quintessential jazz progression" }
  ],
  "B Major": [
    { name: "I-IV-V", chords: "B - E - F#", description: "The most common progression in pop and rock" },
    { name: "I-V-vi-IV", chords: "B - F# - G#m - E", description: "Used in countless pop hits" },
    { name: "ii-V-I", chords: "C#m - F# - B", description: "The quintessential jazz progression" }
  ],
  "F# Major": [
    { name: "I-IV-V", chords: "F# - B - C#", description: "The most common progression in pop and rock" },
    { name: "I-V-vi-IV", chords: "F# - C# - D#m - B", description: "Used in countless pop hits" },
    { name: "ii-V-I", chords: "G#m - C# - F#", description: "The quintessential jazz progression" }
  ],
  "F Major": [
    { name: "I-IV-V", chords: "F - Bb - C", description: "The most common progression in pop and rock" },
    { name: "I-V-vi-IV", chords: "F - C - Dm - Bb", description: "Used in countless pop hits" },
    { name: "ii-V-I", chords: "Gm - C - F", description: "The quintessential jazz progression" }
  ],
  "Bb Major": [
    { name: "I-IV-V", chords: "Bb - Eb - F", description: "The most common progression in pop and rock" },
    { name: "I-V-vi-IV", chords: "Bb - F - Gm - Eb", description: "Used in countless pop hits" },
    { name: "ii-V-I", chords: "Cm - F - Bb", description: "The quintessential jazz progression" }
  ],
  "Eb Major": [
    { name: "I-IV-V", chords: "Eb - Ab - Bb", description: "The most common progression in pop and rock" },
    { name: "I-V-vi-IV", chords: "Eb - Bb - Cm - Ab", description: "Used in countless pop hits" },
    { name: "ii-V-I", chords: "Fm - Bb - Eb", description: "The quintessential jazz progression" }
  ],
  "Ab Major": [
    { name: "I-IV-V", chords: "Ab - Db - Eb", description: "The most common progression in pop and rock" },
    { name: "I-V-vi-IV", chords: "Ab - Eb - Fm - Db", description: "Used in countless pop hits" },
    { name: "ii-V-I", chords: "Bbm - Eb - Ab", description: "The quintessential jazz progression" }
  ],
  "Db Major": [
    { name: "I-IV-V", chords: "Db - Gb - Ab", description: "The most common progression in pop and rock" },
    { name: "I-V-vi-IV", chords: "Db - Ab - Bbm - Gb", description: "Used in countless pop hits" },
    { name: "ii-V-I", chords: "Ebm - Ab - Db", description: "The quintessential jazz progression" }
  ],
  "A Minor": [
    { name: "i-iv-v", chords: "Am - Dm - Em", description: "Natural minor progression" },
    { name: "i-VI-VII", chords: "Am - F - G", description: "Common in rock ballads" },
    { name: "i-iv-V", chords: "Am - Dm - E", description: "Using harmonic minor's V chord" }
  ],
  "E Minor": [
    { name: "i-iv-v", chords: "Em - Am - Bm", description: "Natural minor progression" },
    { name: "i-VI-VII", chords: "Em - C - D", description: "Common in rock ballads" },
    { name: "i-iv-V", chords: "Em - Am - B", description: "Using harmonic minor's V chord" }
  ],
  "B Minor": [
    { name: "i-iv-v", chords: "Bm - Em - F#m", description: "Natural minor progression" },
    { name: "i-VI-VII", chords: "Bm - G - A", description: "Common in rock ballads" },
    { name: "i-iv-V", chords: "Bm - Em - F#", description: "Using harmonic minor's V chord" }
  ],
  "F# Minor": [
    { name: "i-iv-v", chords: "F#m - Bm - C#m", description: "Natural minor progression" },
    { name: "i-VI-VII", chords: "F#m - D - E", description: "Common in rock ballads" },
    { name: "i-iv-V", chords: "F#m - Bm - C#", description: "Using harmonic minor's V chord" }
  ],
  "C# Minor": [
    { name: "i-iv-v", chords: "C#m - F#m - G#m", description: "Natural minor progression" },
    { name: "i-VI-VII", chords: "C#m - A - B", description: "Common in rock ballads" },
    { name: "i-iv-V", chords: "C#m - F#m - G#", description: "Using harmonic minor's V chord" }
  ],
  "G# Minor": [
    { name: "i-iv-v", chords: "G#m - C#m - D#m", description: "Natural minor progression" },
    { name: "i-VI-VII", chords: "G#m - E - F#", description: "Common in rock ballads" },
    { name: "i-iv-V", chords: "G#m - C#m - D#", description: "Using harmonic minor's V chord" }
  ],
  "D# Minor": [
    { name: "i-iv-v", chords: "D#m - G#m - A#m", description: "Natural minor progression" },
    { name: "i-VI-VII", chords: "D#m - B - C#", description: "Common in rock ballads" },
    { name: "i-iv-V", chords: "D#m - G#m - A#", description: "Using harmonic minor's V chord" }
  ],
  "D Minor": [
    { name: "i-iv-v", chords: "Dm - Gm - Am", description: "Natural minor progression" },
    { name: "i-VI-VII", chords: "Dm - Bb - C", description: "Common in rock ballads" },
    { name: "i-iv-V", chords: "Dm - Gm - A", description: "Using harmonic minor's V chord" }
  ],
  "G Minor": [
    { name: "i-iv-v", chords: "Gm - Cm - Dm", description: "Natural minor progression" },
    { name: "i-VI-VII", chords: "Gm - Eb - F", description: "Common in rock ballads" },
    { name: "i-iv-V", chords: "Gm - Cm - D", description: "Using harmonic minor's V chord" }
  ],
  "C Minor": [
    { name: "i-iv-v", chords: "Cm - Fm - Gm", description: "Natural minor progression" },
    { name: "i-VI-VII", chords: "Cm - Ab - Bb", description: "Common in rock ballads" },
    { name: "i-iv-V", chords: "Cm - Fm - G", description: "Using harmonic minor's V chord" }
  ],
  "F Minor": [
    { name: "i-iv-v", chords: "Fm - Bbm - Cm", description: "Natural minor progression" },
    { name: "i-VI-VII", chords: "Fm - Db - Eb", description: "Common in rock ballads" },
    { name: "i-iv-V", chords: "Fm - Bbm - C", description: "Using harmonic minor's V chord" }
  ],
  "Bb Minor": [
    { name: "i-iv-v", chords: "Bbm - Ebm - Fm", description: "Natural minor progression" },
    { name: "i-VI-VII", chords: "Bbm - Gb - Ab", description: "Common in rock ballads" },
    { name: "i-iv-V", chords: "Bbm - Ebm - F", description: "Using harmonic minor's V chord" }
  ],
};

const defaultProgressions = [
  { name: "I-IV-V", chords: "I - IV - V", description: "The most common progression in pop and rock" },
  { name: "I-V-vi-IV", chords: "I - V - vi - IV", description: "Used in countless pop hits" },
  { name: "ii-V-I", chords: "ii - V - I", description: "The quintessential jazz progression" },
];

const romanNumerals = [
  { numeral: "I", description: "Major chord built on the 1st scale degree", examples: "C in C Major" },
  { numeral: "ii", description: "Minor chord built on the 2nd scale degree", examples: "Dm in C Major" },
  { numeral: "iii", description: "Minor chord built on the 3rd scale degree", examples: "Em in C Major" },
  { numeral: "IV", description: "Major chord built on the 4th scale degree", examples: "F in C Major" },
  { numeral: "V", description: "Major chord built on the 5th scale degree", examples: "G in C Major" },
  { numeral: "vi", description: "Minor chord built on the 6th scale degree", examples: "Am in C Major" },
  { numeral: "vii°", description: "Diminished chord built on the 7th scale degree", examples: "Bdim in C Major" },
];

function getChordsForKey(keyName: string) {
  if (!keySignatures[keyName] && keyName !== "None") {
    return [
      { name: "C", roman: "I" },
      { name: "Dm", roman: "ii" },
      { name: "F", roman: "IV" },
      { name: "Em", roman: "iii" },
      { name: "G", roman: "V" },
      { name: "Am", roman: "vi" },
      { name: "Bdim", roman: "vii°" },
      { name: "E", roman: "I" },
      { name: "D", roman: "V" },
    ];
  }
  
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
      sig.notes[2] + "maj", 
      sig.notes[1] + "maj",
    ];
    roman = ["I", "ii", "iii", "IV", "V", "vi", "vii°", "I", "V"];
  } else if (keyName.includes("Minor")) {
    const sig = keySignatures[keyName];
    chords = [
      sig.notes[2] + "maj",
      sig.notes[4] + "min",
      sig.notes[5] + "maj", 
      sig.notes[1] + "dim",
      sig.notes[0] + "min",
      sig.notes[4] + "maj",
      sig.notes[6] + "dim",
      sig.notes[2] + "maj",
      sig.notes[1] + "maj",
    ];
    roman = ["III", "v", "VI", "ii°", "i", "V", "vii°", "V/VI", "V/v"];
  }
  
  return chords.map((c, i) => ({ name: c, roman: roman[i] }));
}

export default function ChordModesPage() {

  const [selectedKey, setSelectedKey] = useState("C Major");
  const [activeSection, setActiveSection] = useState<string | null>(null);
  
  // Floating Circle of Fifths state
  const [showFloatingCircle, setShowFloatingCircle] = useState(false);
  
  // MediaPipe states
  const [gestureRecognizer, setGestureRecognizer] = useState<GestureRecognizer | null>(null);
  const [webcamEnabled, setWebcamEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [recognizedGesture, setRecognizedGesture] = useState<string>("");
  const [handPosition, setHandPosition] = useState<{ x: number, y: number } | null>(null);
  const [handVisible, setHandVisible] = useState(false);
  
  // Audio refs
  const audioContextRef = useRef<AudioContext | null>(null);
  const samplesRef = useRef<Record<string, AudioBuffer>>({});
  const notePlayingRef = useRef<boolean>(false);
  const convolverRef = useRef<ConvolverNode | null>(null);
  
  // Visual refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [currentChordCell, setCurrentChordCell] = useState<number | null>(null);
  const [currentChordName, setCurrentChordName] = useState<string | null>(null);
  
  // Key selection handler
  const handleKeyChange = (key: string) => {
    const newKey = sampleProgressions[key] ? key : "C Major";
    setSelectedKey(newKey);
  };
  
  // Scroll listener to show/hide floating Circle of Fifths halfway through
  useEffect(() => {
    const handleScroll = () => {
      const circleSection = document.getElementById("circle");
      if (circleSection) {
        const circleSectionBottom = circleSection.getBoundingClientRect().bottom;
        setShowFloatingCircle(circleSectionBottom < 100);
      }
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);
  
  // Initialise audio context
  const initAudio = useCallback(async () => {
    try {
      if (!audioContextRef.current || audioContextRef.current.state === "closed") {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      
      const audioCtx = audioContextRef.current;
      const samples: Record<string, AudioBuffer> = {};
      
      // Load sample for piano
      try {
        const response = await fetch("/samples/fist.wav");
        if (!response.ok) {
          console.error(`Failed to fetch piano sample: ${response.statusText}`);
        } else {
          const arrayBuffer = await response.arrayBuffer();
          samples["piano"] = await audioCtx.decodeAudioData(arrayBuffer);
        }
      } catch (error) {
        console.error("Error loading piano sample:", error);
      }
      
      samplesRef.current = samples;
      
      // Load reverb response
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
  
  // Initialise gesture recognizer
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
  
  // Initialise on component mount
  useEffect(() => {
    initGestureRecognizer();
    initAudio();
    
    return () => {
      if (gestureRecognizer) {
        gestureRecognizer.close();
      }
      if (audioContextRef.current && audioContextRef.current.state !== "closed") {
        try {
          audioContextRef.current.close();
        } catch (err) {
          console.error("Error closing AudioContext:", err);
        }
      }
    };
  }, [initGestureRecognizer, initAudio]);
  
  // Handle webcam setup/teardown
  useEffect(() => {
    const videoEl = videoRef.current;
    if (!webcamEnabled || !videoEl) return;
    
    let stream: MediaStream | null = null;
    navigator.mediaDevices
      .getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 560 },
          facingMode: "user"
        }
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
  
  // Process webcam frames and recognize gestures
  useEffect(() => {
    if (!gestureRecognizer || !webcamEnabled) return;
    const videoEl = videoRef.current;
    const canvasEl = canvasRef.current;
    if (!videoEl || !canvasEl) return;
    let animationFrameId: number;
    const ctx = canvasEl.getContext("2d");
    if (!ctx) return;
    
    async function processFrame() {
      if (videoEl!.readyState >= videoEl!.HAVE_ENOUGH_DATA && ctx) {
        ctx.save();
        ctx.clearRect(0, 0, canvasEl!.width, canvasEl!.height);
        ctx.translate(canvasEl!.width, 0);
        ctx.scale(-1, 1);
        
        // Draw video frame 
        ctx.drawImage(videoEl!, 0, 0, canvasEl!.width, canvasEl!.height);
        
        const timestamp = performance.now();
        try {
          const results = await gestureRecognizer!.recognizeForVideo(videoEl!, timestamp);
          
          // Update hand visibility
          const isHandVisible = results?.landmarks && results.landmarks.length > 0;
          setHandVisible(isHandVisible);
          
          if (results?.gestures && results.gestures.length > 0) {
            const [firstHandGestures] = results.gestures;
            if (firstHandGestures && firstHandGestures.length > 0) {
              const topGesture = firstHandGestures[0];
              setRecognizedGesture(topGesture.categoryName);
              
              // Get hand position if landmarks are available
              if (results.landmarks && results.landmarks.length > 0) {
                const landmarks = results.landmarks[0];
                const avgX = landmarks.reduce((sum, lm) => sum + lm.x, 0) / landmarks.length;
                const avgY = landmarks.reduce((sum, lm) => sum + lm.y, 0) / landmarks.length;
                const position = { x: 1-avgX, y: avgY };
                setHandPosition(position);
                
                // Play chord based on gesture and position
                if (topGesture.categoryName === "Closed_Fist") {
                  playChordFromHandPosition(position);
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
            
            const currentColor = "#14b8a6"; 
            
            results.landmarks.forEach((lmArr) => {
              // Draw connections between landmarks
              ctx.strokeStyle = currentColor;
              ctx.lineWidth = 3;
              
              // Finger connections
              const connections = [
                [0, 1, 2, 3, 4], 
                [0, 5, 6, 7, 8],
                [9, 10, 11, 12],
                [13, 14, 15, 16],
                [17, 18, 19, 20],
                [0, 5, 9, 13, 17]
              ];
              
              connections.forEach(conn => {
                ctx.beginPath();
                for (let i = 0; i < conn.length; i++) {
                  const lm = lmArr[conn[i]];
                  if (i === 0) {
                    ctx.moveTo(lm.x * canvasEl!.width, lm.y * canvasEl!.height);
                  } else {
                    ctx.lineTo(lm.x * canvasEl!.width, lm.y * canvasEl!.height);
                  }
                }
                ctx.stroke();
              });
              
              // Draw landmarks
              lmArr.forEach((lm) => {
                ctx.beginPath();
                ctx.arc(lm.x * canvasEl!.width, lm.y * canvasEl!.height, 6, 0, 2 * Math.PI);
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
        if (ctx) {
          drawChordGrid(ctx, canvasEl!.width, canvasEl!.height);
        }
      }
      
      animationFrameId = requestAnimationFrame(processFrame);
    }
    
    processFrame();
    return () => cancelAnimationFrame(animationFrameId);
  }, [gestureRecognizer, webcamEnabled]);
  
  // Draw the chord grid overlay
  const drawChordGrid = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    const cellWidth = width / 3;
    const cellHeight = height / 3;
    const chords = getChordsForKey(selectedKey);
    
    ctx.save();
    
    // Draw grid lines
    ctx.strokeStyle = "rgba(20, 184, 166, 0.5)";
    ctx.lineWidth = 2;
    for (let i = 1; i < 3; i++) {
      ctx.beginPath();
      ctx.moveTo(i * cellWidth, 0);
      ctx.lineTo(i * cellWidth, height);
      ctx.stroke();
    }
    for (let i = 1; i < 3; i++) {
      ctx.beginPath();
      ctx.moveTo(0, i * cellHeight);
      ctx.lineTo(width, i * cellHeight);
      ctx.stroke();
    }
    
    // Draw chord names in each cell
    ctx.font = "bold 24px Arial";
    ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    
    for (let y = 0; y < 3; y++) {
      for (let x = 0; x < 3; x++) {
        const index = y * 3 + x;
        const chord = chords[index];
        if (chord) {
          // Highlight the current chord cell if active
          if (currentChordCell === index) {
            ctx.fillStyle = "rgba(20, 184, 166, 0.5)";
            ctx.fillRect(x * cellWidth, y * cellHeight, cellWidth, cellHeight);
            ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
          }
          
          // Chord name
          ctx.fillText(
            chord.name,
            x * cellWidth + cellWidth / 2,
            y * cellHeight + cellHeight / 2 - 12
          );
          ctx.font = "16px Arial";
          ctx.fillText(
            chord.roman,
            x * cellWidth + cellWidth / 2,
            y * cellHeight + cellHeight / 2 + 12
          );
          ctx.font = "bold 24px Arial";
        }
      }
    }
    
    ctx.restore();
  };
  
  // Play chord based on hand position in the grid
  const playChordFromHandPosition = (pos: { x: number; y: number }) => {
    if (notePlayingRef.current) return;

    const cellX = Math.floor(pos.x * 3);
    const cellY = Math.floor(pos.y * 3);
    const cellIndex = cellX + cellY * 3;
    
    setCurrentChordCell(cellIndex);
    setTimeout(() => setCurrentChordCell(null), 500);
    
    const chords = getChordsForKey(selectedKey);
    const chordObj = chords[cellIndex];
    
    if (chordObj) {
      setCurrentChordName(chordObj.name);
      playChord(chordObj.name);
      setTimeout(() => setCurrentChordName(null), 1000);
    }
  };
  
  // Play chord audio
  const playChord = (chordName: string) => {
    const audioCtx = audioContextRef.current;
    if (!audioCtx || notePlayingRef.current) return;
    notePlayingRef.current = true;
    setTimeout(() => {
      notePlayingRef.current = false;
    }, 300);
    
    const sampleBuffer = samplesRef.current["piano"];
    if (!sampleBuffer) return;
    
    const notes = getNotesForChord(chordName);
    
    // Play each note in the chord
    notes.forEach((semitones, i) => {
      const source = audioCtx.createBufferSource();
      source.buffer = sampleBuffer;
      source.playbackRate.value = Math.pow(2, semitones / 12);
      
      const gainNode = audioCtx.createGain();
      gainNode.gain.value = 0.5 / notes.length;
      const startTime = audioCtx.currentTime + (i * 0.02);
      
      source.connect(gainNode);
      if (convolverRef.current) {
        gainNode.connect(convolverRef.current);
        convolverRef.current.connect(audioCtx.destination);
      } else {
        gainNode.connect(audioCtx.destination);
      }
      
      source.start(startTime);
      source.stop(startTime + 1.0);
    });
  };
  
  // Calculate semitone offsets for a chord
  const getNotesForChord = (chordName: string): number[] => {

    const root = chordName.charAt(0);
    const isMinor = chordName.includes("m") && !chordName.includes("maj");
    const hasSeventh = chordName.includes("7");
    
    // Root note positions
    const rootOffsets: Record<string, number> = {
      'C': 0, 'C#': 1, 'Db': 1, 'D': 2, 'D#': 3, 'Eb': 3,
      'E': 4, 'F': 5, 'F#': 6, 'Gb': 6, 'G': 7, 'G#': 8, 
      'Ab': 8, 'A': 9, 'A#': 10, 'Bb': 10, 'B': 11
    };
    
    const rootOffset = rootOffsets[root] || 0;
    
    // Build chord based on quality
    let notes = [0]; 
    notes.push(isMinor ? 3 : 4); 
    notes.push(7); 
    
    if (hasSeventh) {
      notes.push(isMinor ? 10 : 11);
    }
    return notes.map(note => note + rootOffset);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-teal-50 to-white relative">
      <Header />
      
      <motion.div
        className="container mx-auto px-4 py-8 max-w-5xl"
        initial="hidden"
        animate="visible"
        variants={pageVariants}
      >
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-teal-800 mb-3">
            Understanding Chord Modes
          </h1>
          <p className="text-xl text-teal-600 max-w-3xl mx-auto">
            Learn how chord progressions work, how to use our chord grid,
            and how the Circle of Fifths helps you create musical harmony
          </p>
        </div>

        {/* Table of Contents */}
        <Card className="mb-12 bg-white shadow-md">
          <CardHeader className="bg-teal-50 border-b border-teal-100">
            <h2 className="text-2xl font-bold text-teal-800">Contents</h2>
          </CardHeader>
          <CardContent className="py-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { id: "intro", title: "Introduction to Chord Modes" },
                { id: "circle", title: "The Circle of Fifths" },
                { id: "roman", title: "Understanding Roman Numerals" },
                { id: "grid", title: "The Chord Grid Interface" },
                { id: "interactive", title: "Interactive Chord Grid" },
                { id: "progressions", title: "Common Chord Progressions" },
                { id: "practice", title: "Practice Exercises" }
              ].map((section) => (
                <Button
                  key={section.id}
                  variant="ghost"
                  className="justify-start text-left border border-teal-100 hover:bg-teal-50 text-teal-700 hover:text-teal-800"
                  onClick={() => {
                    document.getElementById(section.id)?.scrollIntoView({ behavior: 'smooth' });
                    setActiveSection(section.id);
                  }}
                >
                  {section.title}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Introduction Section */}
        <motion.section 
          id="intro"
          className="mb-16"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={sectionVariants}
        >
          <Card className="bg-white shadow-md">
            <CardHeader className="bg-teal-50 border-b border-teal-100">
              <h2 className="text-2xl font-bold text-teal-800">Introduction to Chords</h2>
            </CardHeader>
            <CardContent className="p-6">
              <div className="prose prose-teal max-w-none">
                <p>
                  When creating music, the way chords are linked together forms the foundation of a song. 
                  In Motiononics, we've designed our chord mode systems to help you create 
                  chord progressions using hand gestures, even if you're new to music theory.
                </p>
                
                <h3 className="text-xl font-semibold text-teal-700 mt-6">What are our Chord Modes?</h3>
                <p>
                  In our application, "Chord Modes" refer to different ways you can play and interact with 
                  chord progressions:
                </p>
                <ul className="list-disc pl-6">
                  <li><strong>Auto Chord Mode:</strong> Play complete chords with a single gesture</li>
                  <li><strong>Arpeggiator Mode:</strong> Play the notes of a chord sequentially as a pattern</li>
                  <li><strong>Play-for-me Mode:</strong> Plays full chord progressions with one simple interaction</li>
                </ul>
                <br></br>
                <p>
                  These different modes allow you to explore harmonies and expressiveness regardless of your 
                  musical background. The chord grid system organises chords that sound good together, 
                  based on music theory principles.
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.section>

        {/* Circle of Fifths Section */}
        <motion.section 
          id="circle"
          className="mb-16"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={sectionVariants}
        >
          <Card className="bg-white shadow-md">
            <CardHeader className="bg-teal-50 border-b border-teal-100">
              <h2 className="text-2xl font-bold text-teal-800">The Circle of Fifths</h2>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="prose prose-teal max-w-none">
                  <p>
                    The Circle of Fifths is a music theory tool that shows the relationships
                    between the 12 different major and minor key signatures in Western music. It's arranged in a circle 
                    where each key is a perfect fifth (or 7 steps/semitones) apart from its nearest 2 neighbors.
                  </p>
                  
                  <h3 className="text-xl font-semibold text-teal-700 mt-6">Why is it useful?</h3>
                  <ul className="list-disc pl-6">
                    <li><strong>Finding related keys:</strong> Keys next to each other on the circle share many notes and chords</li>
                    <li><strong>Chord progressions:</strong> Movement around the circle often creates nice chord changes that you will have heard lots of times before</li>
                    <li><strong>Modulation:</strong> The circle shows good keys to transition to during a piece</li>
                    <li><strong>Understanding key signatures:</strong> The circle visually organises the number of sharps and flats in each key</li>
                  </ul>
                  
                  <br></br>
                  <p>
                    In motiononics, the Circle of Fifths helps you select keys and understand the relationship
                    between different chords in your current key. <strong> Try it out by selecting a key to the right!</strong>
                  </p>
                </div>
                
                <div className="flex justify-center items-center">
                  <div className="w-full max-w-md">
                    <CircleOfFifths selectedKey={selectedKey} onSelectKey={handleKeyChange} />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.section>
        
        {/* Roman Numerals Section */}
        <motion.section 
          id="roman"
          className="mb-16"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={sectionVariants}
        >
          <Card className="bg-white shadow-md">
            <CardHeader className="bg-teal-50 border-b border-teal-100">
              <h2 className="text-2xl font-bold text-teal-800">Understanding Roman Numerals</h2>
            </CardHeader>
            <CardContent className="p-6">
              <div className="prose prose-teal max-w-none mb-6">
                <p>
                  Roman numerals are used in music theory to indicate the position of a chord within a key,
                  regardless of what specific key you're in. This makes it easy to learn chord progressions
                  between different keys.
                </p>
                <p>
                  Upper-case numerals (I, IV, V) represent major chords (happier sounding), while lower-case numerals (ii, iii, vi)
                  represent minor chords (less bright and happy). The diminished chord is indicated with a small circle (vii°).
                </p>
              </div>
              
              <div className="overflow-x-auto">
                <table className="min-w-full bg-white border border-teal-200 rounded-md">
                  <thead>
                    <tr className="bg-teal-50">
                      <th className="py-3 px-4 border-b border-teal-200 text-left text-teal-700">Roman Numeral</th>
                      <th className="py-3 px-4 border-b border-teal-200 text-left text-teal-700">Chord Type</th>
                      <th className="py-3 px-4 border-b border-teal-200 text-left text-teal-700">Example in C Major</th>
                    </tr>
                  </thead>
                  <tbody>
                    {romanNumerals.map((item, index) => (
                      <tr key={index} className={index % 2 === 0 ? "bg-white" : "bg-teal-50"}>
                        <td className="py-3 px-4 border-b border-teal-200 font-bold">{item.numeral}</td>
                        <td className="py-3 px-4 border-b border-teal-200">{item.description}</td>
                        <td className="py-3 px-4 border-b border-teal-200">{item.examples}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              <div className="mt-6 prose prose-teal max-w-none">
                <p>
                  In our chord grid visualiser, these Roman numerals help you identify how each chord will sound
                  within your selected key, making it easier to understand and create nice sounding progressions.
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.section>

        {/* Chord Grid Interface Section */}
        <motion.section 
          id="grid"
          className="mb-16"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={sectionVariants}
        >
          <Card className="bg-white shadow-md">
            <CardHeader className="bg-teal-50 border-b border-teal-100">
              <h2 className="text-2xl font-bold text-teal-800">The Chord Grid</h2>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="prose prose-teal max-w-none">
                  <p>
                    Motiononics uses a 3x3 chord grid interface to organise chords by their 
                    function and relationship within a key. This allows you to create nice sounding 
                    progressions with your hand gestures.
                  </p>
                  
                  <h3 className="text-xl font-semibold text-teal-700 mt-6">How the Grid Works</h3>
                  <p>
                    The grid organizes the most commonly used chords in any key:
                  </p>
                  <ul className="list-disc pl-6">
                    <li><strong>Center:</strong> The tonic (I) chord, your "home base"</li>
                    <li><strong>Top Row:</strong> Predominant chords (ii, IV, vi) that lead toward dominant chords</li>
                    <li><strong>Bottom Row:</strong> Dominant chords (V, vii°) that create tension and resolution</li>
                    <li><strong>Sides:</strong> Additional chords including borrowed chords and variations</li>
                  </ul>
                  
                  <p>
                    By moving your hand through this grid, you can create chord progressions that follow
                    established patterns of tension and resolution in music theory.
                  </p>
                </div>
                
                <div className="flex flex-col items-center">
                  <div className="p-4 border border-teal-200 rounded-lg bg-teal-50 shadow-sm">
                    <div className="w-full aspect-square max-w-md grid grid-cols-3 grid-rows-3 gap-1">
                      {[
                        { name: "I", roman: "I", highlight: false },
                        { name: "ii", roman: "ii", highlight: false },
                        { name: "iii", roman: "iii", highlight: false },
                        { name: "IV", roman: "IV", highlight: false },
                        { name: "V", roman: "V", highlight: true },
                        { name: "vi", roman: "vi", highlight: false },
                        { name: "vii°", roman: "vii°", highlight: false },
                        { name: "I", roman: "I", highlight: false },
                        { name: "V", roman: "V", highlight: false },
                      ].map((chord, index) => (
                        <div
                          key={index}
                          className={`flex flex-col items-center justify-center p-2 border ${chord.highlight ? 'bg-teal-200 border-teal-500' : 'bg-white border-teal-200'}`}
                        >
                          <div className="text-lg text-teal-800 font-semibold">{chord.name}</div>
                          <div className="text-sm text-teal-600">{chord.roman}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <p className="text-center mt-4 text-sm text-teal-600 italic">Example chord grid layout</p>
                </div>
              </div>

              <div className="mt-8 prose prose-teal max-w-none">                
                <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded mt-6">
                  <p className="text-sm">
                    <strong>Tip:</strong> Try moving your hand in a clockwise pattern around the grid to create a
                    progression with natural tension and resolution (e.g., I → IV → V → I).
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.section>

        {/* Interactive Chord Grid Section */}
        <motion.section 
          id="interactive"
          className="mb-16"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={sectionVariants}
        >
          <Card className="bg-white shadow-md">
            <CardHeader className="bg-teal-50 border-b border-teal-100">
              <h2 className="text-2xl font-bold text-teal-800">Interactive Chord Grid</h2>
            </CardHeader>
            <CardContent className="p-6">
              <div className="prose prose-teal max-w-none mb-6">
                <p>
                  Try the interactive chord grid below using hand gestures! Enable your camera and use a 
                  closed fist gesture at different positions to play chords in the key of {selectedKey}.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                <div className="flex flex-col space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xl font-semibold text-teal-700">Current Key: {selectedKey}</h3>
                    <Button
                      onClick={() => setWebcamEnabled(!webcamEnabled)}
                      className={`${webcamEnabled ? 'bg-red-500 hover:bg-red-600' : 'bg-teal-500 hover:bg-teal-600'} text-white`}
                    >
                      {webcamEnabled ? 'Disable Camera' : 'Enable Camera'}
                    </Button>
                  </div>
                  
                  <div className="relative aspect-video bg-gray-900 rounded-lg overflow-hidden">
                    {!webcamEnabled ? (
                      <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center bg-gray-800">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M12 18.75H4.5a2.25 2.25 0 01-2.25-2.25V9a2.25 2.25 0 012.25-2.25H12" />
                        </svg>
                        <h3 className="text-xl font-medium text-gray-300 mb-2">Enable Camera to Play Chords</h3>
                        <p className="text-gray-400">
                          Use a closed fist gesture at different positions on the grid to play chords.
                          Your camera feed is processed locally and never uploaded.
                        </p>
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
                          height={560}
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
                      </>
                    )}
                  </div>
                  
                  {/* Current chord display */}
                  <AnimatePresence>
                    { (
                      <div
                        className="bg-teal-500 text-white text-center p-3 rounded-lg"
                      >
                        <p className="text-2xl font-bold">Chord: {currentChordName}</p>
                      </div>
                    )}
                  </AnimatePresence>
                </div>
                
                <div className="bg-teal-50 p-6 rounded-lg">
                  <h3 className="text-xl font-semibold text-teal-700 mb-4">How to Use</h3>
                  <ol className="list-decimal list-inside space-y-3 text-teal-700">
                    <li>Click "Enable Camera" to start your webcam</li>
                    <li>Position your hand in front of the camera</li>
                    <li>Make a <span className="font-bold">closed fist</span> gesture</li>
                    <li>Move your hand to different positions on the grid:</li>
                  </ol>
                  <div className="mt-4 p-4 bg-white rounded-lg">
                    <div className="grid grid-cols-3 grid-rows-3 gap-1">
                      {getChordsForKey(selectedKey).map((chord, idx) => (
                        <div key={idx} className="bg-teal-100/50 p-2 text-center rounded">
                          <p className="text-sm font-semibold text-teal-800">{chord?.name || "-"}</p>
                          <p className="text-xs text-teal-600">{chord?.roman || ""}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="mt-4">
                    <p className="text-sm text-teal-600">
                      Try to play the I-IV-V progression by moving between center, top-right, and middle-right positions.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.section>

        {/* Common Progressions Section */}
        <motion.section 
          id="progressions"
          className="mb-16"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={sectionVariants}
        >
          <Card className="bg-white shadow-md">
            <CardHeader className="bg-teal-50 border-b border-teal-100 flex justify-between">
              <h2 className="text-2xl font-bold text-teal-800">Common Chord Progressions</h2>
            </CardHeader>
            <CardContent className="p-6">
              <div className="prose prose-teal max-w-none mb-6">
                <p>
                  Understanding common chord progressions helps you create music that sounds familiar and
                  satisfying. Here are some popular progressions in {selectedKey} that you can try 
                  with our chord grid interface.
                </p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {(sampleProgressions[selectedKey] || defaultProgressions).map((prog, index) => (
                  <div key={index} className="bg-white border border-teal-100 rounded-lg p-5 shadow-sm hover:shadow-md transition-shadow">
                    <h3 className="text-xl font-bold text-teal-800 mb-2">{prog.name}</h3>
                    <div className="bg-teal-50 p-3 rounded-md mb-3">
                      <p className="text-2xl text-center font-mono text-teal-700">{prog.chords}</p>
                    </div>
                    <p className="text-teal-600">{prog.description}</p>
                  </div>
                ))}
                
                <div className="bg-teal-500 text-white border rounded-lg p-5 shadow-sm md:col-span-2">
                  <h3 className="text-xl font-bold mb-2">Try This!</h3>
                  <p>
                    Select the chord mode in Motiononics, choose {selectedKey} as your key, and try moving your hand 
                    to different positions to create these progressions. Notice how they create different emotional qualities 
                    and how they resolve back to the tonic (I or i) chord.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.section>

        {/* Practice Exercises Section */}
        <motion.section 
          id="practice"
          className="mb-16"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={sectionVariants}
        >
          <Card className="bg-white shadow-md">
            <CardHeader className="bg-teal-50 border-b border-teal-100">
              <h2 className="text-2xl font-bold text-teal-800">Practice Exercises</h2>
            </CardHeader>
            <CardContent className="p-6">
              <div className="prose prose-teal max-w-none mb-6">
                <p>
                  The best way to understand chord progressions is to practice with them. Here are some 
                  exercises you can try using our chord mode interfaces:
                </p>
              </div>
              
              <div className="space-y-6">
                <div className="bg-white border border-teal-100 rounded-lg p-5 shadow-sm">
                  <h3 className="text-xl font-semibold text-teal-700 mb-2">1. Basic Chord Progression</h3>
                  <p className="mb-4">Practice the I-IV-V-I progression in any key. This forms the basis for countless songs.</p>
                  <div className="bg-teal-50 p-4 rounded-md">
                    <ol className="list-decimal list-inside space-y-2">
                      <li>Select Auto Chord Mode and choose a key</li>
                      <li>Position your hand in the top left of the grid (I chord)</li>
                      <li>Move to the middle-left (IV chord)</li>
                      <li>Move to the center (V chord)</li>
                      <li>Return to the top left (I chord)</li>
                    </ol>
                  </div>
                </div>
                
                <div className="bg-white border border-teal-100 rounded-lg p-5 shadow-sm">
                  <h3 className="text-xl font-semibold text-teal-700 mb-2">2. Arpeggiator Exploration</h3>
                  <p className="mb-4">Use the arpeggiator mode to explore how chord notes create different patterns.</p>
                  <div className="bg-teal-50 p-4 rounded-md">
                    <ol className="list-decimal list-inside space-y-2">
                      <li>Switch to Arpeggiator Mode</li>
                      <li>Make an closed fist gesture at different grid positions</li>
                      <li>Try changing the arpeggio direction (up, down, up-down) and octave span</li>
                      <li>Notice how arpeggios outline the chord qualities</li>
                    </ol>
                  </div>
                </div>
                
                <div className="bg-white border border-teal-100 rounded-lg p-5 shadow-sm">
                  <h3 className="text-xl font-semibold text-teal-700 mb-2">3. Play-for-me Mode</h3>
                  <p className="mb-4">Try out some of our pre made progressions on the Play-for-me Page!</p>
                  <div className="bg-teal-50 p-4 rounded-md">
                    <ol className="list-decimal list-inside space-y-2">
                      <li>Head to the Play-for-me page in the header at the top</li>
                      <li>Pick your favourite genre for the chord progression</li>
                      <li>Test out different 'root' chords with different rhythms and progressions</li>
                      <li>Record your favourite progressions you find to listen to or use elsewhere!</li>
                      
                    </ol>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.section>
        

        {/* Footer Navigation */}
        <div className="flex justify-between mt-12">
          <Link href="/tutorials">
            <Button variant="outline" className="border-teal-500 text-teal-500 hover:bg-teal-50">
              ← Back to Tutorials
            </Button>
          </Link>
          <Link href="/">
            <Button variant="outline" className="border-teal-500 text-teal-500 hover:bg-teal-50">
              Home
            </Button>
          </Link>
        </div>
      </motion.div>
      
      {/* Floating Circle of Fifths */}
      <AnimatePresence>
        {showFloatingCircle && (
          <motion.div
            className="fixed top-1/2 right-4 transform -translate-y-1/2 z-100
                      bg-white rounded-lg shadow-xl p-2 border border-teal-200
                      flex flex-col items-center"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
          >
            {/* Inner container for the circle, with extra padding and centering */}
            <div className="prose prose-teal max-w-none mb-6">
              <h2 className="text-xl font-bold text-teal-800">Try Picking a key</h2>
            </div>
            <div className="flex items-center justify-center w-64 h-64">
              <CircleOfFifths selectedKey={selectedKey} onSelectKey={handleKeyChange} />
            </div>
            
            <div className="mt-4">
              <Button
                variant="outline"
                size="sm"
                className="text-xs bg-teal-50 border-teal-200"
                onClick={() => document.getElementById("circle")?.scrollIntoView({ behavior: 'smooth' })}
              >
                Back to Full View
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}