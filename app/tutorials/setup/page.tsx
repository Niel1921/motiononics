"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import { FilesetResolver, GestureRecognizer } from "@mediapipe/tasks-vision";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import Header from "@/components/ui/header";
import ThreePianoVisualizer from "@/components/ThreePianoVisualizer";
import ThreeGuitarVisualizer from "@/components/ThreeGuitarVisualizer";
import ThreeThereminVisualizer from "@/components/ThreeThereminVisualizer";

// Sample URLs for each instrument
const sampleURLs = {
  piano: {
    "Closed_Fist": "/samples/fist.wav",
    "Open_Palm": "/samples/fist.wav",
    "Thumb_Up": "/samples/fist.wav",
    "Victory": "/samples/fist.wav",
  },
  guitar: {
    "Closed_Fist": "/samples/fist.wav",
    "Open_Palm": "/samples/fist.wav",
  },
  theremin: {
    "Open_Palm": "/samples/fist.wav",
  },
};

// Tutorial steps for each instrument
const tutorialSteps = {
  piano: [
    {
      id: "piano-1",
      title: "Making Your First Note",
      description:
        "Make a fist gesture and position your hand at different horizontal positions to play different notes. Try to play a C note (leftmost position).",
      gesture: "Closed_Fist",
      targetPosition: { x: 0.1, y: 0.5 },
      tolerance: 0.2,
      image: "/tutorials/piano-gesture-1.jpg",
      tip: "The horizontal position of your hand determines the pitch of the note.",
    },
    {
      id: "piano-2",
      title: "Controlling Volume",
      description:
        "Make a fist gesture and move your hand up and down to control the volume. Try to play a loud note by positioning your hand at the top of the screen.",
      gesture: "Closed_Fist",
      targetPosition: { x: 0.5, y: 0.2 },
      tolerance: 0.2,
      image: "/tutorials/piano-gesture-2.jpg",
      tip: "The vertical position of your hand controls the volume – higher means louder.",
    },
    {
      id: "piano-3",
      title: "Playing a Chord",
      description:
        "Make an open palm gesture to play a chord. Try to play a C major chord.",
      gesture: "Open_Palm",
      targetPosition: { x: 0.1, y: 0.5 },
      tolerance: 0.2,
      image: "/tutorials/piano-gesture-3.jpg",
      tip: "Open palm gestures trigger chords instead of single notes.",
    },
  ],
  guitar: [
    {
      id: "guitar-1",
      title: "Strumming a String",
      description:
        "Make a fist gesture and position your hand at different vertical positions to select different strings. Try to play the lowest string (bottom position).",
      gesture: "Closed_Fist",
      targetPosition: { x: 0.5, y: 0.9 },
      tolerance: 0.2,
      image: "/tutorials/guitar-gesture-1.jpg",
      tip: "The vertical position determines which string you're playing.",
    },
    {
      id: "guitar-2",
      title: "Changing Frets",
      description:
        "Make a fist gesture and position your hand at different horizontal positions to change the fret position. Try to play the 3rd fret.",
      gesture: "Closed_Fist",
      targetPosition: { x: 0.3, y: 0.5 },
      tolerance: 0.2,
      image: "/tutorials/guitar-gesture-2.jpg",
      tip: "The horizontal position determines which fret you're playing.",
    },
    {
      id: "guitar-3",
      title: "Strumming Multiple Strings",
      description:
        "Make an open palm gesture and move your hand from top to bottom to strum all strings.",
      gesture: "Open_Palm",
      targetPosition: { x: 0.5, y: 0.5 },
      tolerance: 0.5,
      image: "/tutorials/guitar-gesture-3.jpg",
      tip: "This mimics a real guitar strumming motion.",
    },
  ],
  theremin: [
    {
      id: "theremin-1",
      title: "Controlling Pitch",
      description:
        "Make an open palm gesture and move your hand left and right to change the pitch. Try to produce a low pitch sound (left side).",
      gesture: "Open_Palm",
      targetPosition: { x: 0.1, y: 0.5 },
      tolerance: 0.2,
      image: "/tutorials/theremin-gesture-1.jpg",
      tip: "The theremin uses continuous pitch changes, unlike the discrete notes of a piano.",
    },
    {
      id: "theremin-2",
      title: "Controlling Volume",
      description:
        "Keep your palm open and move your hand up and down to control volume. Try to play a soft sound (bottom position).",
      gesture: "Open_Palm",
      targetPosition: { x: 0.5, y: 0.8 },
      tolerance: 0.2,
      image: "/tutorials/theremin-gesture-2.jpg",
      tip: "Think of the theremin as having two invisible antennas – one for pitch and one for volume.",
    },
    {
      id: "theremin-3",
      title: "Creating a Vibrato Effect",
      description:
        "Make an open palm gesture and slightly vibrate your hand horizontally to create a vibrato effect.",
      gesture: "Open_Palm",
      targetPosition: { x: 0.5, y: 0.5 },
      tolerance: 0.5,
      image: "/tutorials/theremin-gesture-3.jpg",
      tip: "Small, rapid movements create interesting sound modulations.",
    },
  ],
};

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
  const audioContextRef = useRef<AudioContext | null>(null);
  const samplesRef = useRef<Record<string, AudioBuffer>>({});
  const notePlayingRef = useRef<boolean>(false);
  const convolverRef = useRef<ConvolverNode | null>(null);
  const [currentChordName, setCurrentChordName] = useState<string | null>(null);


  // State for selected instrument and its steps
  const [selectedInstrument, setSelectedInstrument] = useState<"piano" | "guitar" | "theremin">("piano");
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);
  const [allCompleted, setAllCompleted] = useState(false);

  // MediaPipe and webcam state
  const [gestureRecognizer, setGestureRecognizer] = useState<GestureRecognizer | null>(null);
  const [webcamEnabled, setWebcamEnabled] = useState(false);
  const [loading, setLoading] = useState(true);

  // Gesture and visualization state
  const [recognizedGesture, setRecognizedGesture] = useState<string>("");
  const [handPosition, setHandPosition] = useState<{ x: number; y: number } | null>(null);
  const [currentNote, setCurrentNote] = useState<number | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [handVisible, setHandVisible] = useState(false);

  // Computed properties
  const currentSteps = tutorialSteps[selectedInstrument];
  const currentStep = currentSteps[currentStepIndex];
  const progress = (completedSteps.filter((step) => step.startsWith(selectedInstrument)).length / currentSteps.length) * 100;

  // Helper to resume or reinitialize AudioContext as needed
  const resumeAudioContext = () => {
    if (!audioContextRef.current || audioContextRef.current.state === "closed") {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    } else if (audioContextRef.current.state === "suspended") {
      audioContextRef.current.resume().catch((err) =>
        console.error("Error resuming AudioContext:", err)
      );
    }
  };

  // Initialize audio context and load samples
  const initAudio = useCallback(async () => {
    resumeAudioContext();
    const audioCtx = audioContextRef.current;
    const samples: Record<string, AudioBuffer> = {};

    // Load samples for the current instrument
    const currentSamples = sampleURLs[selectedInstrument];
    for (const [gesture, url] of Object.entries(currentSamples)) {
      try {
        const response = await fetch(url);
        if (!response.ok) {
          console.error(`Failed to fetch sample for ${gesture}: ${response.statusText}`);
          continue;
        }
        const arrayBuffer = await response.arrayBuffer();
        samples[gesture] = await audioCtx!.decodeAudioData(arrayBuffer);
      } catch (error) {
        console.error(`Error loading sample for ${gesture}:`, error);
      }
    }
    samplesRef.current = samples;

    // Load impulse response for reverb
    try {
      const irResponse = await fetch("/samples/impulse.wav");
      if (irResponse.ok) {
        const irBuffer = await irResponse.arrayBuffer();
        const convolver = audioCtx!.createConvolver();
        convolver.buffer = await audioCtx!.decodeAudioData(irBuffer);
        convolverRef.current = convolver;
      }
    } catch (err) {
      console.error("Error loading impulse response:", err);
    }
  }, [selectedInstrument]);

  // Initialize MediaPipe gesture recognizer
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

  // Initialize on component mount
  useEffect(() => {
    initGestureRecognizer();
    initAudio();
    return () => {
      gestureRecognizer?.close();
      if (audioContextRef.current && audioContextRef.current.state !== "closed") {
        audioContextRef.current.close();
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

  // Restart audio when changing instruments
  useEffect(() => {
    resumeAudioContext();
    initAudio();
  }, [selectedInstrument, initAudio]);

  // Process webcam frames and recognize gestures
  useEffect(() => {
    if (!gestureRecognizer || !webcamEnabled) return;
    const videoEl = videoRef.current;
    const canvasEl = canvasRef.current;
    if (!videoEl || !canvasEl) return;
    const ctx = canvasEl.getContext("2d");
    if (!ctx) return;
    let animationFrameId: number;
    async function processFrame() {
      if (videoEl!.readyState >= videoEl!.HAVE_ENOUGH_DATA && ctx &&  canvasEl && videoEl) {  
        ctx.save();
        ctx.clearRect(0, 0, canvasEl.width, canvasEl.height);
        ctx.translate(canvasEl.width, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(videoEl, 0, 0, canvasEl.width, canvasEl.height);
        const timestamp = performance.now();
        try {
          const results = await gestureRecognizer!.recognizeForVideo(videoEl, timestamp);
          const isHandVisible = results?.landmarks && results.landmarks.length > 0;
          setHandVisible(isHandVisible);
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
                checkStepCompletion(topGesture.categoryName, position);
                playSoundForGesture(topGesture.categoryName, position);
              }
            }
          } else {
            setRecognizedGesture("");
            setHandPosition(null);
          }
          if (results?.landmarks) {
            ctx.save();
            const currentColor = "#14b8a6";
            results.landmarks.forEach((lmArr) => {
              const connections = [
                [0, 1, 2, 3, 4],
                [0, 5, 6, 7, 8],
                [9, 10, 11, 12],
                [13, 14, 15, 16],
                [17, 18, 19, 20],
                [0, 5, 9, 13, 17],
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
                ctx.strokeStyle = currentColor;
                ctx.lineWidth = 3;
                ctx.stroke();
              });
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
        if (currentStep && !completedSteps.includes(currentStep.id)) {
          const targetX = (1 - currentStep.targetPosition.x) * canvasEl.width;
          const targetY = currentStep.targetPosition.y * canvasEl.height;
          ctx.beginPath();
          ctx.arc(targetX, targetY, 30, 0, 2 * Math.PI);
          ctx.strokeStyle = "rgba(255, 255, 0, 0.5)";
          ctx.lineWidth = 4;
          ctx.stroke();
          ctx.beginPath();
          ctx.arc(targetX, targetY, 10, 0, 2 * Math.PI);
          ctx.fillStyle = "rgba(255, 255, 0, 0.5)";
          ctx.fill();
        }
      }
      animationFrameId = requestAnimationFrame(processFrame);
    }
    processFrame();
    return () => cancelAnimationFrame(animationFrameId);
  }, [gestureRecognizer, webcamEnabled, currentStep, completedSteps]);

  const playSoundForGesture = useCallback(
    (gesture: string, position: { x: number; y: number }) => {
      const audioCtx = audioContextRef.current;
      if (!audioCtx || notePlayingRef.current) return;
      const sampleBuffer = samplesRef.current[gesture];
      if (!sampleBuffer) return;
      notePlayingRef.current = true;
      setTimeout(() => {
        notePlayingRef.current = false;
      }, 300);
      let noteIndex = 0;
      let volume = 0.5;
      if (selectedInstrument === "piano") {
        noteIndex = Math.min(11, Math.floor(position.x * 12));
        volume = 0.2 + (1 - position.y) * 0.8;
      } else if (selectedInstrument === "guitar") {
        const stringIndex = Math.min(5, Math.floor(position.y * 6));
        noteIndex = Math.min(11, Math.floor(position.x * 12)) + stringIndex * 5;
        volume = 0.5;
      } else if (selectedInstrument === "theremin") {
        noteIndex = position.x * 24;
        volume = 0.2 + (1 - position.y) * 0.8;
      }
      setCurrentNote(noteIndex);
      setTimeout(() => setCurrentNote(null), 500);
      const source = audioCtx.createBufferSource();
      source.buffer = sampleBuffer;
      source.playbackRate.value = Math.pow(2, noteIndex / 12);
      const gainNode = audioCtx.createGain();
      gainNode.gain.value = volume;
      source.connect(gainNode);
      if (convolverRef.current) {
        gainNode.connect(convolverRef.current);
        convolverRef.current.connect(audioCtx.destination);
      } else {
        gainNode.connect(audioCtx.destination);
      }
      source.start();
      source.stop(audioCtx.currentTime + 0.5);
    },
    [selectedInstrument]
  );

  const checkStepCompletion = useCallback(
    (gesture: string, position: { x: number; y: number }) => {
      if (!currentStep) return;
      if (completedSteps.includes(currentStep.id)) return;
      if (gesture === currentStep.gesture) {
        const xDiff = Math.abs(position.x - currentStep.targetPosition.x);
        const yDiff = Math.abs(position.y - currentStep.targetPosition.y);
        if (xDiff <= currentStep.tolerance && yDiff <= currentStep.tolerance) {
          setCompletedSteps((prev) => [...prev, currentStep.id]);
          setShowSuccess(true);
          setTimeout(() => {
            setShowSuccess(false);
            if (currentStepIndex < currentSteps.length - 1) {
              setCurrentStepIndex((prev) => prev + 1);
            } else {
              const allStepsCompleted = [
                ...tutorialSteps.piano,
                ...tutorialSteps.guitar,
                ...tutorialSteps.theremin,
              ].every((step) => [...completedSteps, currentStep.id].includes(step.id));
              setAllCompleted(allStepsCompleted);
            }
          }, 1500);
          const audio = new Audio("/samples/success.wav");
          audio.play().catch((err) => console.error("Error playing audio:", err));
        }
      }
    },
    [currentStep, currentStepIndex, currentSteps, completedSteps]
  );

  const handleInstrumentChange = (instrument: "piano" | "guitar" | "theremin") => {
    setSelectedInstrument(instrument);
    setCurrentStepIndex(0);
  };

  const handleResetProgress = () => {
    setCompletedSteps([]);
    setCurrentStepIndex(0);
    setAllCompleted(false);
  };

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
            Interactive Instrument Tutorial
          </h1>
          <p className="text-lg text-teal-600 max-w-2xl mx-auto">
            Learn to play virtual instruments using hand gestures. Complete the steps for each instrument to become a virtual musician!
          </p>
        </div>
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
          <div className="w-full max-w-md mt-4 bg-gray-200 rounded-full h-2.5 overflow-hidden">
            <div
              className="bg-teal-600 h-2.5 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="md:col-span-1">
            <Card className="bg-white shadow-lg rounded-xl overflow-hidden border border-teal-100 h-full">
              <CardHeader className="bg-teal-50 border-b border-teal-100">
                <h2 className="text-xl font-semibold text-teal-800">
                  {selectedInstrument.charAt(0).toUpperCase() + selectedInstrument.slice(1)} Tutorial
                </h2>
              </CardHeader>
              <CardContent className="p-6">
                {loading ? (
                  <div className="flex flex-col items-center justify-center h-64">
                    <div className="w-12 h-12 border-4 border-teal-500 border-t-transparent rounded-full animate-spin"></div>
                    <p className="mt-4 text-teal-600">Loading tutorial...</p>
                  </div>
                ) : (
                  <motion.div
                    key={`${selectedInstrument}-${currentStepIndex}`}
                    variants={cardVariants}
                    initial="hidden"
                    animate="visible"
                    className="space-y-6"
                  >
                    <div>
                      <div className="flex justify-between text-sm text-teal-700 mb-1">
                        <span>Step {currentStepIndex + 1} of {currentSteps.length}</span>
                        <span>{Math.round(progress)}% completed</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="h-2 rounded-full bg-teal-500 transition-all duration-300"
                          style={{ width: `${(currentStepIndex / currentSteps.length) * 100}%` }}
                        />
                      </div>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-teal-700 mb-2">
                        {currentStep?.title}
                      </h3>
                      <p className="text-gray-600 mb-4">
                        {currentStep?.description}
                      </p>
                    </div>
                    <div className="aspect-square w-full max-w-[240px] mx-auto bg-gray-100 rounded-lg flex items-center justify-center">
                      {currentStep?.image ? (
                        <div className="relative w-full h-full">
                          <Image
                            src={currentStep.image}
                            alt={currentStep.title}
                            fill
                            className="rounded-lg object-cover"
                          />
                        </div>
                      ) : (
                        <div className="text-gray-400 text-5xl">✋</div>
                      )}
                    </div>
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
                    <div className="flex justify-between">
                      <Button
                        variant="outline"
                        disabled={currentStepIndex === 0}
                        onClick={() => setCurrentStepIndex((prev) => Math.max(0, prev - 1))}
                        className="text-teal-600 border-teal-200"
                      >
                        Previous Step
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => setCurrentStepIndex((prev) => Math.min(currentSteps.length - 1, prev + 1))}
                        className="text-teal-600 border-teal-200"
                      >
                        Skip Step
                      </Button>
                    </div>
                  </motion.div>
                )}
              </CardContent>
            </Card>
          </div>
          <div className="md:col-span-2">
            <Card className="bg-white shadow-lg rounded-xl overflow-hidden border border-teal-100">
              <CardHeader className="bg-teal-50 border-b border-teal-100 flex flex-row justify-between items-center">
                <h2 className="text-xl font-semibold text-teal-800">Practice Area</h2>
                <Button
                  onClick={() => {
                    setWebcamEnabled(!webcamEnabled);
                  }}
                  className={`${webcamEnabled ? "bg-red-500 hover:bg-red-600" : "bg-teal-500 hover:bg-teal-600"} text-white`}
                  size="sm"
                >
                  {webcamEnabled ? "Disable Camera" : "Enable Camera"}
                </Button>
              </CardHeader>
              <CardContent className="p-0 relative">
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
                    <video ref={videoRef} className="w-full h-full" muted playsInline />
                    <canvas ref={canvasRef} width={1280} height={720} className="absolute top-0 left-0 w-full h-full" />
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
                    {webcamEnabled && recognizedGesture && (
                      <div className="absolute top-4 right-4 bg-black/60 text-white px-3 py-1.5 rounded text-sm">
                        {recognizedGesture}
                      </div>
                    )}
                    {selectedInstrument === "guitar" && (
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
              <div className="bg-gray-900 h-64 relative">
                {selectedInstrument === "piano" && (
                  <ThreePianoVisualizer currentNote={currentNote} />
                )}
                {selectedInstrument === "guitar" && (
                  <ThreeGuitarVisualizer currentChord={currentChordName} />
                )}
                {selectedInstrument === "theremin" && (
                  <ThreeThereminVisualizer
                    frequency={handPosition ? handPosition.x * 400 + 200 : 400}
                    volume={handPosition ? handPosition.y : 0.5}
                    vibrato={1}
                    waveform="sine"
                    onFrequencyChange={(val) => console.log("Frequency changed:", val)}
                    onVolumeChange={(val) => console.log("Volume changed:", val)}
                    onVibratoChange={(val) => console.log("Vibrato changed:", val)}
                    onWaveformChange={(val) => console.log("Waveform changed:", val)}
                  />
                )}
                <div className="absolute bottom-2 right-2 flex space-x-2">
                  <Button
                    variant="outline"
                    className="bg-white/20 hover:bg-white/30 text-white border-white/30"
                    onClick={() => {
                      resumeAudioContext();
                      const testPosition = { x: 0.5, y: 0.5 };
                      playSoundForGesture(Object.keys(sampleURLs[selectedInstrument])[0], testPosition);
                    }}
                  >
                    Test Sound
                  </Button>
                </div>
              </div>
            </Card>
            <Card className="mt-6 bg-white shadow-lg rounded-xl overflow-hidden border border-teal-100">
              <CardHeader className="bg-teal-50 border-b border-teal-100">
                <h2 className="text-lg font-semibold text-teal-800">Gesture Guide</h2>
              </CardHeader>
              <CardContent className="p-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="w-16 h-16 mx-auto bg-teal-100 rounded-full flex items-center justify-center mb-2">
                      ✊
                    </div>
                    <h3 className="font-medium text-teal-700">Closed Fist</h3>
                    <p className="text-xs text-gray-500">Play notes or trigger strings</p>
                  </div>
                  <div className="text-center">
                    <div className="w-16 h-16 mx-auto bg-teal-100 rounded-full flex items-center justify-center mb-2">
                      ✋
                    </div>
                    <h3 className="font-medium text-teal-700">Open Palm</h3>
                    <p className="text-xs text-gray-500">Play chords or control theremin</p>
                  </div>
                  <div className="text-center">
                    <div className="w-16 h-16 mx-auto bg-teal-100 rounded-full flex items-center justify-center mb-2">
                      👍
                    </div>
                    <h3 className="font-medium text-teal-700">Thumb Up</h3>
                    <p className="text-xs text-gray-500">Trigger arpeggios</p>
                  </div>
                  <div className="text-center">
                    <div className="w-16 h-16 mx-auto bg-teal-100 rounded-full flex items-center justify-center mb-2">
                      ✌️
                    </div>
                    <h3 className="font-medium text-teal-700">Victory</h3>
                    <p className="text-xs text-gray-500">Modify sound effects</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
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
                    You've completed all the tutorials for all instruments. You're now ready to create music with hand gestures!
                  </p>
                  <div className="flex flex-col md:flex-row gap-4 justify-center">
                    <Button onClick={handleResetProgress} variant="outline" className="border-teal-500 text-teal-500">
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
        <div className="mt-8 flex justify-between">
          <Link href="/" passHref>
            <Button variant="outline" className="border-teal-500 text-teal-500 hover:bg-teal-50">
              Back to Home
            </Button>
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
