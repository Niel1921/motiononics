"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import Header from "@/components/ui/header";
import ThreePianoVisualizer from "@/components/ThreePianoVisualizer";
import ThreeGuitarVisualizer, { ThreeGuitarVisualizerHandle } from "@/components/ThreeGuitarVisualizer";
import ThreeThereminVisualizer from "@/components/ThreeThereminVisualizer";
import CircleOfFifths from "@/components/CircleOfFifths";
import { useGesture } from "../../hooks/useGesture";
import { useAudio } from "../../hooks/useAudio";

import {
  snapChromaticToKey,
  getChordsForKey,
  getStringIndexFromY,
  isBackOfHand,
  getHandPosition,
} from "@/lib/musicHelpers";

const normalize = (s: string) => 
  s.toLowerCase().replace(/[\s\-]+/g, "_");


interface TutorialStep {
  id: string;
  title: string;
  description: string;
  gesture: string;
  image: string;
  targetPosition: { x: number; y: number };
  tip: string;
  mode?: "manual" | "autoChord" | "arpeggiator";
  pianoInput?: "fist" | "finger";
  waveform?: string;
}

const sfxPaths = {
  step: "/sounds/step-complete.wav",
  tutorial: "/sounds/tutorial-complete.wav",
};

// Tutorial step definitions for each instrument
const tutorialSteps: Record<"piano" | "guitar" | "theremin", TutorialStep[]> = {
  piano: [
    {
      id: "piano-1",
      title: "Play Notes with a Closed Fist",
      description: "Make a closed fist gesture and move your hand horizontally. Left side plays low notes, right side plays high notes. Try covering the entire octave by moving from left to right.",
      gesture: "Closed_Fist",
      image: "/gestureimg/fistlogo.png",
      targetPosition: { x: 0, y: 0},
      tip: "Play the note corresponding to the marker!",
      mode: "manual",
      pianoInput: "fist"
    },
    {
      id: "piano-2",
      title: "Play Chords with Grid",
      description: "In chord mode, the screen is divided into a 3x3 grid of common chords. Position your closed fist in different cells to trigger those chords. Try playing in the top-left cell.",
      gesture: "Closed_Fist",
      image: "/textures/autoChordimg.jpg",
      targetPosition: { x: 0.17, y: 0.17 },
      tip: "Common chord progressions can be played by moving between grid positions (e.g., positions 1, 4, 5 for I-IV-V)",
      mode: "autoChord"
    },
    {
      id: "piano-3",
      title: "Create Arpeggios",
      description: "Arpeggios play the notes of a chord in sequence. In arpeggiator mode, use the grid to trigger different arpeggios. Try the middle cell (position 4).",
      gesture: "Closed_Fist",
      image: "/textures/arpeggiatorimg.jpg",
      targetPosition: { x: 0.85, y: 0.85 },
      tip: "You can change arpeggio direction (up, down, up & down) and octave span in the controls panel.",
      mode: "arpeggiator"
    }
  ],
  guitar: [
    {
      id: "guitar-2",
      title: "Strum Multiple Strings",
      description: "Hold your hand with palm facing away (back of hand toward camera) and make a vertical swipe to strum multiple strings at once. Try a downward strum.",
      gesture: "None",
      image: "/gestureimg/backofhand.png",
      targetPosition: { x: 0.5, y: 0.5 },
      tip: "The speed of your strum affects how quickly the strings are played in sequence.",
      mode: "manual"
    },
    {
      id: "guitar-3",
      title: "Play Guitar Chords",
      description: "Like with piano, the chord grid lets you play common guitar chord shapes. Position your fist in different grid cells to play those chords. Try the top-right cell.",
      gesture: "Closed_Fist",
      image: "/textures/autoChordimg.jpg",
      targetPosition: { x: 0.83, y: 0.17 },
      tip: "The chord grid adapts to your selected key signature on the Circle of Fifths.",
      mode: "autoChord"
    },
    {
      id: "guitar-4",
      title: "Guitar Arpeggios",
      description: "Guitar arpeggios have a distinctive sound. In arpeggiator mode, position your fist in grid cells to trigger different arpeggiated patterns. Try the bottom-right cell.",
      gesture: "Closed_Fist",
      image: "/textures/arpeggiatorimg.jpg",
      targetPosition: { x: 0.83, y: 0.83 },
      tip: "For more complex patterns, try setting the arpeggio direction to 'up & down' with 2 octaves.",
      mode: "arpeggiator"
    }
  ],
  theremin: [
    {
      id: "theremin-1",
      title: "Control Theremin Pitch",
      description: "The theremin is played without touching it. Move your right hand horizontally to control pitch: left = lower tones, right = higher tones. Try playing a slow glissando from left to right.",
      gesture: "Open_Palm",
      image: "/tutorialimg/horizontalhand.png",
      targetPosition: { x: 0.25, y: 0.5 },
      tip: "The theremin is known for its eerie, continuous gliding tones. Try slow, controlled movements.",
      waveform: "sine"
    },
    {
      id: "theremin-2",
      title: "Control Theremin Volume",
      description: "With theremin, your left hand controls volume through vertical movement. Hand at the top = maximum volume, bottom = silence. Try a crescendo by moving from bottom to top.",
      gesture: "Open_Palm",
      image: "/tutorialimg/verticalhand.png",
      targetPosition: { x: 0.5, y: 0.25 },
      tip: "Combined with pitch control, you can create expressive phrases with dynamic changes.",
      waveform: "sine"
    },
    {
      id: "theremin-3",
      title: "Add Vibrato Effect",
      description: "Create vibrato by adjusting the distance between your thumb and index finger. A pinching gesture controls the intensity of the vibrato effect. Try creating a narrow pinch.",
      gesture: "None",
      image: "/gestureimg/pinchlogo.png",
      targetPosition: { x: 0.5, y: 0.5 },
      tip: "Vibrato adds expressiveness to theremin playing. Experiment with different vibrato rates for various moods.",
      waveform: "sine"
    }
  ]
};


// Animations
const pageVariants = { hidden: { opacity: 0 }, visible: { opacity: 1 } };
const cardVariants = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } };
const successVariants = {
  hidden: { scale: 0.8, opacity: 0 },
  visible: { scale: 1, opacity: 1, transition: { type: "spring", stiffness: 300, damping: 15 } },
};

export default function InstrumentTutorialPage() {
  // References
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const guitarRef = useRef<ThreeGuitarVisualizerHandle>(null);
  const notePlayingRef = useRef<boolean>(false);
  const lastNoneY = useRef<number | null>(null);
  const fingerPressedRef = useRef<Record<number, boolean>>({});
  const gestureRecognizer = useGesture();

  // Audio setup
  const {
    initAudio,
    playGuitarString,
    audioCtxRef,
    samplesRef,
    convolverRef
  } = useAudio();

  // State for selected instrument and its steps
  const [selectedInstrument, setSelectedInstrument] = useState<"piano" | "guitar" | "theremin">("piano");
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);
  const [allCompleted, setAllCompleted] = useState(false);

  // Webcam and visualisation state
  const [webcamEnabled, setWebcamEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [recognizedGesture, setRecognizedGesture] = useState<string>("");
  const [handPosition, setHandPosition] = useState<{ x: number; y: number } | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [handVisible, setHandVisible] = useState(false);


  // Instrument state
  const [currentNotes, setCurrentNotes] = useState<number[]>([]);
  const [currentChordCell, setCurrentChordCell] = useState<number | null>(null);
  const [bpm, setBpm] = useState<number>(120);
  const [noteLength] = useState<number>(1);
  const [selectedKey] = useState<string>("C Major");
  const [mode, setMode] = useState<"manual" | "autoChord" | "arpeggiator">("manual");
  const [pianoInput, setPianoInput] = useState<"fist" | "finger">("fist");
  const [arpeggioOctaves] = useState<number>(1);
  const [arpeggioDirection] = useState<"up" | "down" | "upDown">("up");

  const [lastPlayedChordCell, setLastPlayedChordCell] = useState<number | null>(null);
  const [shownModeModals, setShownModeModals] = useState<Set<"piano" | "guitar" | "theremin">>(new Set());
  const [modeCompleted, setModeCompleted] = useState<null | "piano" | "guitar" | "theremin">(null);
  const [stringsPlayed, setStringsPlayed] = useState<boolean[]>([false, false, false, false, false, false]);

  // Theremin state
  const [thereminFrequency, setThereminFrequency] = useState<number>(440);
  const [thereminVolume, setThereminVolume] = useState<number>(0);
  const [thereminVibrato, setThereminVibrato] = useState<number>(2);
  const [thereminWaveform, setThereminWaveform] = useState<string>("sine");


  // --- Theremin audio node refs ---
  const thereminOscillatorRef = useRef<OscillatorNode | null>(null);
  const thereminGainRef = useRef<GainNode | null>(null);
  const thereminVibratoOscRef = useRef<OscillatorNode | null>(null);
  const thereminVibratoGainRef = useRef<GainNode | null>(null);

  const strummedAllStringsRef = useRef(false);
  const [strummedAllStrings, setStrummedAllStrings] = useState(false);

  // At the top of your file (inside the component or above it)
  const stepSfxPath = "/samples/success.wav";
  const stepAudioRef = typeof window !== "undefined" ? new Audio(stepSfxPath) : null;

  // Progress tracking
  const [overallProgress, setOverallProgress] = useState(0);

  // Computed properties
  const currentSteps = tutorialSteps[selectedInstrument];
  const currentStep = currentSteps[currentStepIndex];
  
  const availableSemitones = React.useMemo(() => {
    if (selectedKey === "None") return Array.from({length:12}, (_,i)=>i);
    return Array.from({length:12}, (_,i)=>i);
  }, [selectedKey]);

  // Initialise audio
  useEffect(() => {
    initAudio();
    setLoading(false);
  }, [initAudio]);

    // Update overall progress function
    useEffect(() => {
      const allStepIds = [
        ...tutorialSteps.piano.map(s => s.id),
        ...tutorialSteps.guitar.map(s => s.id),
        ...tutorialSteps.theremin.map(s => s.id)
      ];
      const pct = (completedSteps.length / allStepIds.length) * 100;
      setOverallProgress(pct);
  
      // Mark tutorial as completed
      if (completedSteps.length === allStepIds.length && allStepIds.length > 0) {
        setAllCompleted(true);
      } else {
        setAllCompleted(false);
      }
    }, [completedSteps]);
  

  // Update mode and settings when changing steps
  useEffect(() => {
    if (currentStep) {
      if (currentStep.mode) {
        setMode(currentStep.mode);
      }
      if (currentStep.pianoInput && selectedInstrument === "piano") {
        setPianoInput(currentStep.pianoInput);
      }

    }
  }, [currentStep, selectedInstrument]);

  // Set Theremin waveform
  useEffect(() => {
    if (
      selectedInstrument === "theremin" &&
      currentStepIndex === 0 &&
      currentStep.waveform
    ) {
      setThereminWaveform(currentStep.waveform);
    }
  }, [selectedInstrument, currentStepIndex, currentStep]);

  useEffect(() => {
    if (selectedInstrument === "theremin") {
      setupThereminNodes(thereminWaveform as OscillatorType);
    } else {
      // When switching away, stop theremin sound
      thereminOscillatorRef.current?.stop();
      thereminOscillatorRef.current = null;
      thereminGainRef.current = null;
      thereminVibratoOscRef.current?.stop();
      thereminVibratoOscRef.current = null;
      thereminVibratoGainRef.current = null;
    }
    // Cleanup when component unmounts
    return () => {
      thereminOscillatorRef.current?.stop();
      thereminOscillatorRef.current = null;
      thereminGainRef.current = null;
      thereminVibratoOscRef.current?.stop();
      thereminVibratoOscRef.current = null;
      thereminVibratoGainRef.current = null;
    };
  }, [selectedInstrument, thereminWaveform]);
  

  // Handle webcam setup/teardown
  useEffect(() => {
    const videoEl = videoRef.current;
    if (!webcamEnabled || !videoEl) return;
    
    let stream: MediaStream | null = null;
    navigator.mediaDevices
      .getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "user" },
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


  // Handle mode completion

  useEffect(() => {
    const modeSteps = tutorialSteps[selectedInstrument];
    const completedCount = completedSteps.filter(id => id.startsWith(selectedInstrument)).length;
  
    if (
      completedCount === modeSteps.length &&
      modeSteps.length > 0 &&
      !shownModeModals.has(selectedInstrument)
    ) {
      setModeCompleted(selectedInstrument);
      setShownModeModals(prev => new Set([...Array.from(prev), selectedInstrument]));
    }
  }, [completedSteps, selectedInstrument, shownModeModals]);

  // Process webcam frames and recognise gestures
  useEffect(() => {
    if (!gestureRecognizer || !webcamEnabled) return;
    
    const videoEl = videoRef.current;
    const canvasEl = canvasRef.current;
    if (!videoEl || !canvasEl) return;
    
    const ctx = canvasEl.getContext("2d");
    if (!ctx) return;
    
    let animationFrameId: number;
    
    async function processFrame() {
      if (videoEl!.readyState < videoEl!.HAVE_ENOUGH_DATA) {
        animationFrameId = requestAnimationFrame(processFrame);
        return;
      }
      
      ctx!.save();
      ctx!.clearRect(0, 0, canvasEl!.width, canvasEl!.height);
      ctx!.translate(canvasEl!.width, 0);
      ctx!.scale(-1, 1);
      ctx!.drawImage(videoEl!, 0, 0, canvasEl!.width, canvasEl!.height);
      
      try {
        const results = await gestureRecognizer!.recognizeForVideo(
          videoEl!,
          performance.now()
        );
        
        // Check if hand is visible
        const isHandVisible = results?.landmarks && results.landmarks.length > 0;
        setHandVisible(isHandVisible);
        
        if (results?.gestures && results.gestures.length > 0 && results.landmarks) {
          const [firstHandGestures] = results.gestures;
          if (firstHandGestures && firstHandGestures.length > 0) {
            const topGesture = firstHandGestures[0];
            setRecognizedGesture(normalize(topGesture.categoryName));
            
            if (results.landmarks && results.landmarks.length > 0) {
              const landmarks = results.landmarks[0];
              const position = getHandPosition(landmarks);
              setHandPosition(position);
              
              // Process gesture based on current instrument and mode
              handleGestureBasedOnInstrument(topGesture.categoryName, position, landmarks);
              
              // Check if gesture matches target for tutorial
              if (!completedSteps.includes(currentStep.id)) {
                checkStepCompletion(topGesture.categoryName, position, landmarks);
              }
            }
          }
        } else {
          setRecognizedGesture("");
          setHandPosition(null);
        }
        
        // Draw hand landmarks
        if (results?.landmarks) {
          const currentColor = "#14b8a6"; 
          
          results.landmarks.forEach(landmarks => {
            // Draw connections between landmarks
            const connections = [
              [0, 1, 2, 3, 4],
              [0, 5, 6, 7, 8],
              [9, 10, 11, 12],
              [13, 14, 15, 16],
              [17, 18, 19, 20],
              [0, 5, 9, 13, 17]
            ];
            
            connections.forEach(conn => {
              if(ctx && canvasEl){
                ctx.beginPath();
                for (let i = 0; i < conn.length; i++) {
                  const lm = landmarks[conn[i]];
                  if (i === 0) {
                    ctx.moveTo(lm.x * canvasEl.width, lm.y * canvasEl.height);
                  } else {
                    ctx.lineTo(lm.x * canvasEl.width, lm.y * canvasEl.height);
                  }
                }
                ctx.strokeStyle = currentColor;
                ctx.lineWidth = 3;
                ctx.stroke();
              }
            });
            
            // Draw points
            landmarks.forEach(lm => {
              if(ctx && canvasEl){
              ctx.beginPath();
              ctx.arc(lm.x * canvasEl.width, lm.y * canvasEl.height, 6, 0, 2 * Math.PI);
              ctx.fillStyle = currentColor;
              ctx.fill();
              ctx.strokeStyle = "white";
              ctx.lineWidth = 2;
              ctx.stroke();
              }
            });
          });
        }
        
        // Draw hand target for the current step
        if (!completedSteps.includes(currentStep.id) && ctx && canvasEl) {
          const targetX = (1 - currentStep.targetPosition.x) * canvasEl.width; 
          const targetY = currentStep.targetPosition.y * canvasEl.height;
          
          ctx.beginPath();
          ctx.arc(targetX, targetY, 40, 0, 2 * Math.PI);
          ctx.strokeStyle = "rgba(20, 184, 166, 0.5)";
          ctx.lineWidth = 4;
          ctx.stroke();
          
          ctx.beginPath();
          ctx.arc(targetX, targetY, 15, 0, 2 * Math.PI);
          ctx.fillStyle = "rgba(20, 184, 166, 0.5)";
          ctx.fill();
          
          if (currentStep.image && currentStep.image.includes("overlay")) {
            const img = new window.Image();
            img.src = currentStep.image;
            
            ctx.save();
            ctx.globalAlpha = 0.4;
            ctx.drawImage(
              img,
              targetX - 150,
              targetY - 150,
              300,
              300
            );
            ctx.restore();
          }
        }
      } catch (err) {
        console.error("Error processing frame:", err);
      }
      
      ctx!.restore();
      animationFrameId = requestAnimationFrame(processFrame);
    }
    
    processFrame();
    return () => cancelAnimationFrame(animationFrameId);
  }, [
    gestureRecognizer,
    webcamEnabled,
    currentStep,
    completedSteps,
    selectedInstrument,
    mode,
    
  ]);

  // Handle different gestures based on current instrument and mode
  const handleGestureBasedOnInstrument = (
    gesture: string,
    position: { x: number; y: number },
    landmarks: { x: number; y: number }[]
  ) => {
    switch (selectedInstrument) {
      case "piano":
        handlePianoGesture(gesture, position, landmarks);
        break;
      case "guitar":
        handleGuitarGesture(gesture, position, landmarks);
        break;
      case "theremin":
        handleThereminGesture(position, landmarks);
        break;
    }
  };

  // Piano-specific gesture handling
  const handlePianoGesture = (
    gesture: string,
    position: { x: number; y: number },
    landmarks: { x: number; y: number }[]
  ) => {
    if (mode === "manual") {
      if (pianoInput === "fist" && gesture === "Closed_Fist" && !notePlayingRef.current) {
        playNoteManual(gesture, position);
      } else if (pianoInput === "finger" && gesture === "None") {

      }
    } else if (mode === "autoChord" && gesture === "Closed_Fist" && !notePlayingRef.current) {
      playChordFromHandPosition(gesture, position);
    } else if (mode === "arpeggiator" && gesture === "Closed_Fist" && !notePlayingRef.current) {
      playArpeggioFromHandPosition(gesture, position);
    }
  };

  
  // Guitar-specific gesture handling
  const handleGuitarGesture = (
    gesture: string,
    position: { x: number; y: number },
    landmarks: { x: number; y: number }[]
  ) => {
    if (mode === "manual") {
      if (gesture === "None" && !notePlayingRef.current) {
        const stringIndex = getStringIndexFromY(position.y);
        playGuitarString(stringIndex, bpm, noteLength);
        guitarRef.current?.triggerString(stringIndex);
        // Mark string as played
        setStringsPlayed(prev => {
          if (prev[stringIndex]) return prev; 
          const updated = [...prev];
          updated[stringIndex] = true;
          return updated;
        });
      }
    } else if (mode === "autoChord" && gesture === "Closed_Fist" && !notePlayingRef.current) {
      playChordFromHandPosition(gesture, position);
    } else if (mode === "arpeggiator" && gesture === "Closed_Fist" && !notePlayingRef.current) {
      playArpeggioFromHandPosition(gesture, position);
    }
  };

  // Guitar-specific gesture handling

  const handleThereminGesture = (
    position: { x: number; y: number },
    landmarks: { x: number; y: number }[]
  ) => {
    const frequency = 220 + position.x * 440;
    const volume = 0.5*(Math.max(0, Math.min(0.8, 0.5 - position.y*0.6)));
    const thumbPos = landmarks[4];
    const indexPos = landmarks[8];
    const pinchDistance = Math.hypot(thumbPos.x - indexPos.x, thumbPos.y - indexPos.y);
    const vibrato = Math.max(1, Math.min(10, (pinchDistance - 1) * 10));
  
    setThereminFrequency(frequency);
    setThereminVolume(volume);
    setThereminVibrato(vibrato);
  
    const ctx = audioCtxRef.current;
    if (ctx && thereminOscillatorRef.current && thereminGainRef.current && thereminVibratoOscRef.current && thereminVibratoGainRef.current) {
      const now = ctx.currentTime;
      thereminOscillatorRef.current.frequency.setTargetAtTime(frequency, now, 0.03);
      thereminGainRef.current.gain.setTargetAtTime(volume, now, 0.03);
      thereminVibratoOscRef.current.frequency.setTargetAtTime(vibrato, now, 0.03);
      thereminVibratoGainRef.current.gain.setTargetAtTime(10, now, 0.03); 
    }
  };

  const checkStepCompletion = (
    gesture: string,
    position: { x: number; y: number },
    landmarks: { x: number; y: number }[]
  ) => {
    if (!currentStep) return;
    if (completedSteps.includes(currentStep.id)) return;
  
    // SPECIAL CASE: Theremin steps work differently so are handled here too
    if (selectedInstrument === "theremin") {  
      // THEREMIN 3: Vibrato by pinching
      if (currentStep.id === "theremin-3" && landmarks.length > 8) {
        const thumb = landmarks[4];
        const index = landmarks[8];
        const pinchDist = Math.hypot(thumb.x - index.x, thumb.y - index.y);
        if (pinchDist < 0.06) {
          setShowSuccess(true);
          setTimeout(() => {
            setShowSuccess(false);
            setCompletedSteps((prev) =>
              prev.includes(currentStep.id) ? prev : [...prev, currentStep.id]
            );
          }, 1200);
        }
        return;
      }
  
      // THEREMIN 1 & 2: Position check (horizontal/vertical target)
      if (
        (currentStep.id === "theremin-1" || currentStep.id === "theremin-2") &&
        gesture.toLowerCase().includes("open")
      ) {
        const dx = position.x - currentStep.targetPosition.x;
        const dy = position.y - currentStep.targetPosition.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const threshold = 0.09;
  
        if (dist < threshold) {
          setShowSuccess(true);
          setTimeout(() => {
            setShowSuccess(false);
            setCompletedSteps((prev) =>
              prev.includes(currentStep.id) ? prev : [...prev, currentStep.id]
            );
          }, 1200);
        }
        return;
      }
    }
  };

  // Audio functions from main implementation
  function playNoteManual(gestureLabel: string, handPosition: { x: number; y: number }) {
    const audioCtx = audioCtxRef.current;
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

  function setupThereminNodes(waveform: OscillatorType = "sine") {
    const ctx = audioCtxRef.current;
    if (!ctx) return;
  
    thereminOscillatorRef.current?.disconnect();
    thereminGainRef.current?.disconnect();
    thereminVibratoOscRef.current?.disconnect();
    thereminVibratoGainRef.current?.disconnect();
  
    // Create nodes
    const osc = ctx.createOscillator();
    osc.type = waveform;
    osc.frequency.value = 440; 
  
    const gain = ctx.createGain();
    gain.gain.value = 0;
  
    // Vibrato: LFO modulates pitch
    const vibratoOsc = ctx.createOscillator();
    vibratoOsc.type = "sine";
    vibratoOsc.frequency.value = 2;
  
    const vibratoGain = ctx.createGain();
    vibratoGain.gain.value = 10;
  
    vibratoOsc.connect(vibratoGain);
    vibratoGain.connect(osc.frequency);
  
    // Connect main chain and start oscillators
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    vibratoOsc.start();
  
    thereminOscillatorRef.current = osc;
    thereminGainRef.current = gain;
    thereminVibratoOscRef.current = vibratoOsc;
    thereminVibratoGainRef.current = vibratoGain;
  }


  //  --------------------------------------------------------------------
  // | PLAYBACK/ANIMATION FUNCTIONS REUSED FROM MAIN PAGE                 |
  //  --------------------------------------------------------------------
  

  function playChordFromHandPosition(gestureLabel: string, pos: { x: number; y: number }) {
    if (gestureLabel !== "Closed_Fist") return;
    if (notePlayingRef.current) return;
    const cellX = Math.floor(pos.x * 3);
    const cellY = Math.floor(pos.y * 3);
    const cellIndex = cellX + cellY * 3;
    setCurrentChordCell(cellIndex);
    setLastPlayedChordCell(cellIndex); 
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
    setLastPlayedChordCell(cellIndex); 
    setTimeout(() => setCurrentChordCell(null), 500);
    const chords = getChordsForKey(selectedKey);
    const chordObj = chords[cellIndex];
    if (chordObj)
      playArpeggio(chordObj.name, (60 / bpm) * noteLength, arpeggioOctaves, arpeggioDirection);
  }

  function playChord(chordLabel: string) {
    const audioCtx = audioCtxRef.current;
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
  
    // Set visualised notes
    setCurrentNotes(intervals.map(i => (noteToSemitone[root] + i) % 12));
    setTimeout(() => setCurrentNotes([]), 500);
  
    intervals.forEach((interval) => {
      const source = audioCtx.createBufferSource();
      const key = selectedInstrument === "guitar" ? "None" : "Closed_Fist";
      source.buffer = samplesRef.current[key];
      if (!source.buffer) return;
  
      let semitoneOffset = (noteToSemitone[root] ?? 0) + interval;
      // if guitar, shift sample down to C3
      if (selectedInstrument === "guitar") semitoneOffset += -16;
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
    const audioCtx = audioCtxRef.current;
    if (!audioCtx) return;
    if (notePlayingRef.current) return;
    notePlayingRef.current = true;

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

    const noteDuration = duration;
    const totalTime = noteDuration * pattern.length;
    
    pattern.forEach((intervalVal, i) => {
      const source = audioCtx.createBufferSource();
      const sampleKey = selectedInstrument === "guitar" ? "None" : "Closed_Fist";
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


  // Handle instrument change
  const handleInstrumentChange = (instrument: "piano" | "guitar" | "theremin") => {
    setSelectedInstrument(instrument);
    setCurrentStepIndex(0);
    
    // Update mode based on first step of the selected instrument
    const firstStep = tutorialSteps[instrument][0];
    if (firstStep) {
      setMode(firstStep.mode || "manual");
      if (firstStep.pianoInput && instrument === "piano") {
        setPianoInput(firstStep.pianoInput);
      }
    }
  };

  // Reset progress
  const handleResetProgress = () => {
    setCompletedSteps([]);
    setCurrentStepIndex(0);
    setAllCompleted(false);
  };

  useEffect(() => {
    if (
      selectedInstrument === "guitar" &&
      currentStep.id === "guitar-2" &&
      stringsPlayed.every(Boolean) &&
      !completedSteps.includes(currentStep.id)
    ) {
      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        setCompletedSteps(prev => [...prev, currentStep.id]);
        setStringsPlayed([false, false, false, false, false, false]);
      }, 3000);
    }
  }, [stringsPlayed, selectedInstrument, currentStep, completedSteps, currentSteps.length]);
  

  useEffect(() => {
    if (!webcamEnabled || !currentStep || completedSteps.includes(currentStep.id)) return;
  
    if (
      (currentStep.mode === "autoChord" || currentStep.mode === "arpeggiator")
      && selectedInstrument !== "theremin"
    ) {
      // Calculate the required cell index for this step
      const targetX = Math.floor(currentStep.targetPosition.x * 3);
      const targetY = Math.floor(currentStep.targetPosition.y * 3);
      const targetCellIndex = targetX + targetY * 3;
      if (lastPlayedChordCell !== targetCellIndex) return;
    } else {
      if (currentNotes.length === 0) return;
    }
    
  
    setShowSuccess(true);
    setTimeout(() => {
      setShowSuccess(false);
      setCompletedSteps(prev => prev.includes(currentStep.id) ? prev : [...prev, currentStep.id]);
      strummedAllStringsRef.current = false;
      setStrummedAllStrings(false);
    }, 1500);
    
  }, [
    currentNotes, webcamEnabled, currentStep, completedSteps,
    lastPlayedChordCell, selectedInstrument, currentStepIndex, currentSteps,
    strummedAllStrings 
  ]);
  
  const currentChordName = 
    currentChordCell !== null ? getChordsForKey(selectedKey)[currentChordCell]?.name : null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-teal-50 to-white">
      <Header />
      <motion.div
        className="container mx-auto px-4 py-8 max-w-6xl"
        variants={pageVariants}
        initial="hidden"
        animate="visible"
        transition={{ duration: 0.5 }}
      >
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-teal-800 mb-2">
            Instrument Tutorial
          </h1>
          <p className="text-lg text-teal-600 max-w-2xl mx-auto">
            Learn to play virtual instruments using hand gestures. Complete the steps to become a motion-controlled musician!
          </p>
          
          {/* Overall progress bar */}
          <div className="mt-6 max-w-md mx-auto">
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div
                className="bg-teal-600 h-2.5 rounded-full transition-all duration-300"
                style={{ width: `${overallProgress}%` }}
              />
            </div>
            <p className="text-sm text-teal-600 mt-2">
              {Math.round(overallProgress)}% Complete
            </p>
          </div>
        </div>
        
        {/* Instrument Selection Tabs */}
        <div className="flex flex-col items-center mb-8">
          <div className="bg-white rounded-lg shadow-sm mb-4">
            <div className="flex border-b">
              {["piano", "guitar", "theremin"].map((instrument) => (
                <button
                  key={instrument}
                  onClick={() => handleInstrumentChange(instrument as "piano" | "guitar" | "theremin")}
                  className={`px-6 py-3 text-center text-sm font-medium transition-colors ${
                    selectedInstrument === instrument
                      ? "bg-teal-100 text-teal-800 border-b-2 border-teal-500"
                      : "text-gray-600 hover:bg-teal-50"
                  }`}
                >
                  {instrument.charAt(0).toUpperCase() + instrument.slice(1)}
                </button>
              ))}
            </div>
          </div>
          
          {/* Progress Status */}
          <div className="flex space-x-4 text-center">
            {["piano", "guitar", "theremin"].map((instrument) => (
              <div
                key={instrument}
                className={`text-sm ${selectedInstrument === instrument ? "text-teal-700 font-medium" : "text-gray-500"}`}
              >
                {completedSteps.filter((s) => s.startsWith(instrument)).length}/{tutorialSteps[instrument as "piano" | "guitar" | "theremin"].length} Steps
              </div>
            ))}
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Left Column: Instructions & Gesture Info */}
          <div className="md:col-span-1">
            <Card className="bg-white shadow-lg rounded-xl overflow-hidden border border-teal-100 h-full">
              <CardHeader className="bg-teal-50 border-b border-teal-100">
                <h2 className="text-xl font-semibold text-teal-800">
                  {allCompleted ? "All Steps Complete!" : `Step ${currentStepIndex + 1}: ${currentStep?.title}`}
                </h2>
              </CardHeader>
              
              <CardContent className="p-6">
                {loading ? (
                  <div className="flex flex-col items-center justify-center h-64">
                    <div className="w-12 h-12 border-4 border-teal-500 border-t-transparent rounded-full animate-spin"></div>
                    <p className="mt-4 text-teal-600">Loading tutorial...</p>
                  </div>
                ) : allCompleted ? (
                  <motion.div
                    className="text-center"
                    variants={cardVariants}
                    initial="hidden"
                    animate="visible"
                  >
                    <div className="mb-6">
                      <div className="w-24 h-24 bg-teal-100 rounded-full mx-auto flex items-center justify-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <h3 className="text-xl font-bold text-teal-800 mt-4">Great Job!</h3>
                      <p className="text-teal-600 mt-2">
                        You've mastered all the instrument tutorials!
                      </p>
                    </div>
                    
                    <div className="space-y-4">
                      <Button 
                        className="w-full bg-teal-600 hover:bg-teal-700 text-white"
                        onClick={handleResetProgress}
                      >
                        Restart Tutorial
                      </Button>
                      
                      <Link href="/" passHref>
                        <Button className="w-full bg-teal-700 hover:bg-teal-800 text-white">
                          Go To Main App
                        </Button>
                      </Link>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key={currentStepIndex}
                    variants={cardVariants}
                    initial="hidden"
                    animate="visible"
                    className="space-y-6"
                  >
                    {/* Step Progress */}
                    <div>
                      <div className="flex justify-between text-sm text-teal-700 mb-1">
                        <span>Step {currentStepIndex + 1} of {currentSteps.length}</span>
                        <span>{completedSteps.filter(id => id.startsWith(selectedInstrument)).length}/{currentSteps.length} Completed</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="h-2 rounded-full bg-teal-500 transition-all duration-300"
                          style={{
                            width: `${(completedSteps.filter(id => id.startsWith(selectedInstrument)).length / currentSteps.length) * 100}%`
                          }}
                        />
                      </div>
                    </div>
                    
                    {/* Gesture Image */}
                    <div className="aspect-square w-full max-w-[240px] mx-auto bg-gray-50 rounded-lg flex items-center justify-center overflow-hidden">
                      {currentStep?.image ? (
                        <div className="relative w-full h-full">
                          <Image
                            src={currentStep.image}
                            alt={currentStep.title}
                            fill
                            className="object-contain"
                          />
                        </div>
                      ) : (
                        <div className="text-gray-400 text-5xl">✋</div>
                      )}
                    </div>
                    
                    {/* Instructions */}
                    <div>
                      <h3 className="text-lg font-medium text-teal-700 mb-2">Instructions:</h3>
                      <p className="text-gray-600">{currentStep?.description}</p>
                    </div>
                    
                    
                    {/* Tip */}
                    {currentStep?.tip && (
                      <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded">
                        <div className="flex">
                          <div className="flex-shrink-0">
                            <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                            </svg>
                          </div>
                          <div className="ml-3">
                            <p className="text-sm text-yellow-700">
                              {currentStep.tip}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    
                    {/* Navigation Buttons */}
                    <div className="pt-4 flex justify-between">
                      <Button
                        variant="outline"
                        disabled={currentStepIndex === 0}
                        onClick={() => setCurrentStepIndex((prev) => Math.max(0, prev - 1))}
                        className="text-teal-600 border-teal-200"
                      >
                        Previous
                      </Button>

                      {/* Show Next button after step is completed */}
                      {completedSteps.includes(currentStep.id) ? (
                        <Button
                          variant="default"
                          onClick={() => {
                            // ---- PLAY SOUND HERE ----
                            if (stepAudioRef) {
                              stepAudioRef.currentTime = 0;
                              stepAudioRef.volume = 0.4;
                              stepAudioRef.play().catch(() => {});
                            }
                            if (currentStepIndex < currentSteps.length - 1) {
                              setCurrentStepIndex((prev) => prev + 1);
                            }
                          }}
                          className="bg-teal-600 text-white"
                        >
                          Next
                        </Button>
                      ) : (
                        // Optionally, show nothing, or a disabled Next button
                        <div style={{ width: 88 }} />
                      )}
                    </div>

                  </motion.div>
                )}

                <AnimatePresence>
                  {modeCompleted && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
                    >
                      <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.9, opacity: 0 }}
                        className="bg-white rounded-xl p-8 max-w-md mx-4 shadow-2xl"
                      >
                        <div className="text-center">
                          <div className="mx-auto w-16 h-16 bg-teal-100 rounded-full flex items-center justify-center mb-3">
                            <svg className="w-8 h-8 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                          <h2 className="text-xl font-bold text-teal-800 mb-2">
                            {modeCompleted.charAt(0).toUpperCase() + modeCompleted.slice(1)} Tutorial Complete!
                          </h2>
                          <p className="text-gray-600 mb-6">
                            You've finished all {modeCompleted} steps. Try another instrument!
                          </p>
                          <Button
                            className="bg-teal-600 hover:bg-teal-700 text-white w-full"
                            onClick={() => setModeCompleted(null)}
                          >
                            Continue
                          </Button>
                        </div>
                      </motion.div>
                    </motion.div>
                  )}
                </AnimatePresence>

              </CardContent>
            </Card>
          </div>
          
          {/* Right panel: Webcam Feed and Canvas */}
          <div className="md:col-span-2">
            <Card className="bg-white shadow-lg rounded-xl overflow-hidden border border-teal-100">
              <CardHeader className="bg-teal-50 border-b border-teal-100 flex flex-row justify-between items-center">
                <h2 className="text-xl font-semibold text-teal-800">Practice Area</h2>
                <Button
                  onClick={() => {
                    setWebcamEnabled(!webcamEnabled);
                    if (!webcamEnabled) {
                      initAudio().then(() => {
                        if (audioCtxRef.current?.state === "suspended") {
                          audioCtxRef.current.resume();
                        }
                      });
                    }
                  }}
                  className={`${webcamEnabled ? "bg-red-500 hover:bg-red-600" : "bg-teal-500 hover:bg-teal-600"} text-white`}
                  size="sm"
                >
                  {webcamEnabled ? "Disable Camera" : "Enable Camera"}
                </Button>
              </CardHeader>
              
              <CardContent className="p-0 relative">
                {/* Camera placeholder when not enabled */}
                {!webcamEnabled ? (
                  <div className="aspect-video bg-gray-100 flex flex-col items-center justify-center p-8 text-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M12 18.75H4.5a2.25 2.25 0 01-2.25-2.25V9a2.25 2.25 0 012.25-2.25H12" />
                    </svg>
                    <h3 className="text-xl font-medium text-gray-600 mb-2">Camera Access Required</h3>
                    <p className="text-gray-500 max-w-md">
                      Enable the camera to start the interactive tutorial. Your camera feed is processed locally and never uploaded or stored.
                    </p>
                  </div>
                ) : (
                  <div className="relative aspect-video">
                    <video
                      ref={videoRef}
                      className="w-full h-full"
                      muted
                      playsInline
                    />
                    <canvas
                      ref={canvasRef}
                      width={1280}
                      height={720}
                      className="absolute top-0 left-0 w-full h-full"
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
                    
                    {/* Success animation */}
                    <AnimatePresence>
                      {showSuccess && (
                        <motion.div
                          className="absolute inset-0 flex items-center justify-center"
                          variants={successVariants}
                          initial="hidden"
                          animate="visible"
                          exit={{ opacity: 0, scale: 1.2, transition: { duration: 0.3 } }}
                        >
                          <div className="bg-white/80 backdrop-blur-sm rounded-full p-10">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-24 w-24 text-teal-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                    
                    {/* Current gesture label */}
                    {webcamEnabled && recognizedGesture && (
                      <div className="absolute top-4 right-4 bg-black/60 text-white px-3 py-1.5 rounded text-sm">
                        {recognizedGesture}
                      </div>
                    )}
                    
                    {/* Chord Grid (shown in chord and arpeggiator modes) */}
                    {(selectedInstrument !== "theremin" &&
                      (mode === "autoChord" || mode === "arpeggiator")) && (
                      <div className="absolute top-0 left-0 w-full h-full grid grid-cols-3 grid-rows-3 gap-0 pointer-events-none">
                        {getChordsForKey(selectedKey).map((chord, index) => (
                          <div
                            key={index}
                            className={`border border-teal-500/50 flex flex-col items-center justify-center ${
                              currentChordCell === index ? "bg-teal-300/50" : "bg-transparent"
                            }`}
                          >
                            <div className="text-lg text-teal-800 font-bold bg-white/80 px-2 rounded">
                              {chord.name}
                            </div>
                            <div className="text-sm text-teal-700 bg-white/80 px-1 rounded">
                              {chord.roman}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {/* Guitar String Indicators */}
                    {selectedInstrument === "guitar" && mode === "manual" && (
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
                  </div>
                )}
              </CardContent>
              
              {/* Instrument Visualizer */}
              <div className="bg-gray-800 h-[280px] relative">
                {selectedInstrument === "piano" && (
                  <ThreePianoVisualizer 
                    currentNotes={currentNotes} 
                    availableSemitones={availableSemitones}
                  />
                )}
                {selectedInstrument === "guitar" && (
                  <ThreeGuitarVisualizer 
                    ref={guitarRef} 
                    currentChord={currentChordName} 
                  />
                )}
                {selectedInstrument === "theremin" && (
                  <ThreeThereminVisualizer
                    frequency={thereminFrequency}
                    volume={thereminVolume}
                    vibrato={thereminVibrato}
                    waveform={thereminWaveform}
                    onWaveformChange={setThereminWaveform}
                  />
                )}

              </div>
            </Card>
          </div>
        </div>
        
        {/* Navigation */}
        <div className="mt-8 flex justify-between">
          <Link href="/" passHref>
            <Button variant="outline" className="border-teal-500 text-teal-500 hover:bg-teal-50">
              Back to Main App
            </Button>
          </Link>
          
          <Button
            onClick={handleResetProgress}
            variant="outline"
            className="border-red-500 text-red-500 hover:bg-red-50"
          >
            Reset Progress
          </Button>
        </div>
        
        {/* Completion Modal */}
        <AnimatePresence>
          {allCompleted && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-white rounded-xl p-8 max-w-md mx-4 shadow-2xl"
              >
                <div className="text-center">
                  <div className="mx-auto w-20 h-20 bg-teal-100 rounded-full flex items-center justify-center mb-4">
                    <svg className="w-10 h-10 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h2 className="text-2xl font-bold text-teal-800 mb-2">Congratulations!</h2>
                  <p className="text-gray-600 mb-6">
                    You've completed all the instrument tutorials. You're now ready to create music with hand gestures!
                  </p>
                  <div className="flex flex-col md:flex-row gap-4 justify-center">
                    <Button 
                      onClick={handleResetProgress} 
                      variant="outline" 
                      className="border-teal-500 text-teal-500"
                    >
                      Start Over
                    </Button>
                    <Link href="/" className="w-full md:w-auto">
                      <Button className="bg-teal-600 hover:bg-teal-700 text-white w-full">
                        Go to Main App
                      </Button>
                    </Link>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}