"use client";

import React, { useRef, useEffect, useState, useCallback } from "react";
import * as THREE from "three";
import Link from "next/link";
import { motion } from "framer-motion";
import { FilesetResolver, GestureRecognizer } from "@mediapipe/tasks-vision";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import ThreePianoVisualizer from "../components/ThreePianoVisualizer";
import Header from "@/components/ui/header"; 
import { keySignatures } from "./data/keySignatures";
import CircleOfFifths from "../components/CircleOfFifths"; // Circle component

// -------------------- Constants -------------------- 

const sampleURLs: Record<string, string> = {
  Closed_Fist: "/samples/fist.wav",
};

const defaultScale = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

// -------------------- Conductor Overlay --------------------
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

// -------------------- Main Page Component --------------------
export default function Page() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [gestureRecognizer, setGestureRecognizer] = useState<GestureRecognizer | null>(null);
  const [webcamEnabled, setWebcamEnabled] = useState(false);
  const [bpm, setBpm] = useState<number>(120);
  const [noteLength, setNoteLength] = useState<number>(1);
  const [selectedKey, setSelectedKey] = useState<string>("None");
  const [mode, setMode] = useState<"manual" | "autoChord" | "arpeggiator" | "conductor">("manual");
  const [arpeggioOctaves, setArpeggioOctaves] = useState<number>(1);
  const [arpeggioDirection, setArpeggioDirection] = useState<"up" | "down" | "upDown">("up");
  const [currentNote, setCurrentNote] = useState<number | null>(null);
  const [currentChordCell, setCurrentChordCell] = useState<number | null>(null);
  const [handPos, setHandPos] = useState<{ x: number; y: number } | null>(null);
  const [conductorProgress, setConductorProgress] = useState<number>(0);
  const [conductorStarted, setConductorStarted] = useState<boolean>(false);
  const [countdown, setCountdown] = useState<number | string | null>(null);
  const [conductorGameTime, setConductorGameTime] = useState<number>(0);
  const [conductorStartTime, setConductorStartTime] = useState<number | null>(null);
  const [expectedProgress, setExpectedProgress] = useState<number>(0);
  const [gameScore, setGameScore] = useState<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const samplesRef = useRef<Record<string, AudioBuffer>>({});
  const convolverRef = useRef<ConvolverNode | null>(null);
  const notePlayingRef = useRef<boolean>(false);
  const [backingBuffer, setBackingBuffer] = useState<AudioBuffer | null>(null);
  const backingSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const errorSumRef = useRef<number>(0);
  const errorCountRef = useRef<number>(0);

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
    setHandPos(pos);
    if (mode === "conductor") {
      const p = Math.max(0, Math.min(1, 1 - pos.y));
      setConductorProgress(p);
    }
  }

  function playNoteManual(gestureLabel: string, handPosition: { x: number; y: number }) {
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
    const duration = (60 / bpm) * noteLength;
    const noteToSemitone: Record<string, number> = {
      C: 0, "C#": 1, D: 2, "D#": 3, E: 4, F: 5, "F#": 6, G: 7, "G#": 8, A: 9, "A#": 10, B: 11,
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
    direction: "up" | "down" | "upDown"
  ) {
    const audioCtx = audioContextRef.current;
    if (!audioCtx) return;
    const noteToSemitone: Record<string, number> = {
      C: 0, "C#": 1, D: 2, "D#": 3, E: 4, F: 5, "F#": 6, G: 7, "G#": 8, A: 9, "A#": 10, B: 11,
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

  function startConductorGame() {
    setGameScore(null);
    setCountdown(3);
    const cdInterval = setInterval(() => {
      setCountdown((prev) => {
        if (prev === 1) {
          clearInterval(cdInterval);
          setCountdown("Go!");
          setTimeout(() => {
            setCountdown(null);
            setConductorStarted(true);
            setConductorStartTime(performance.now());
            setConductorGameTime(0);
            errorSumRef.current = 0;
            errorCountRef.current = 0;
            if (backingBuffer && audioContextRef.current) {
              const source = audioContextRef.current.createBufferSource();
              source.buffer = backingBuffer;
              source.loop = true;
              source.connect(audioContextRef.current.destination);
              source.start();
              backingSourceRef.current = source;
            }
          }, 1000);
          return prev;
        }
        if (typeof prev === "number") return prev - 1;
        return prev;
      });
    }, 1000);
  }

  useEffect(() => {
    const intervalId = setInterval(() => {
      if (!conductorStartTime) return;
      const elapsed = (performance.now() - conductorStartTime) / 1000;
      setConductorGameTime(elapsed);
      const measureDuration = (60 / bpm) * 4;
      const expected = (elapsed % measureDuration) / measureDuration;
      setExpectedProgress(expected);
      if (handPos) {
        const err = Math.abs(expected - conductorProgress);
        errorSumRef.current += err;
        errorCountRef.current += 1;
      }
      if (elapsed >= 30) {
        clearInterval(intervalId);
        setConductorStarted(false);
        if (backingSourceRef.current) {
          backingSourceRef.current.stop();
          backingSourceRef.current = null;
        }
        const avgError = errorCountRef.current ? errorSumRef.current / errorCountRef.current : 0;
        setGameScore(avgError);
      }
    }, 100);
    return () => clearInterval(intervalId);
  }, [conductorStarted, bpm, conductorProgress, conductorStartTime, handPos]);

  // -------------------- Main Gesture Loop --------------------
  useEffect(() => {
    if (!gestureRecognizer || !webcamEnabled) return;
    const videoEl = videoRef.current;
    const canvasEl = canvasRef.current;
    if (!videoEl || !canvasEl) return;
    let animationFrameId: number;
    let lastLogTime = 0;
    const ctx = canvasEl.getContext("2d");
    const processFrame = async () => {
      if (videoEl.readyState >= videoEl.HAVE_ENOUGH_DATA && ctx) {
        ctx.save();
        ctx.translate(canvasEl.width, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(videoEl, 0, 0, canvasEl.width, canvasEl.height);
        const timestamp = performance.now();
        try {
          const results = await gestureRecognizer.recognizeForVideo(videoEl, timestamp);
          if (timestamp - lastLogTime > 1000) {
            console.log("Gesture recognition results:", results);
            lastLogTime = timestamp;
          }
          if (results?.gestures) {
            results.gestures.forEach((gestureArray, index) => {
              if (gestureArray.length === 0) return;
              const gesture = gestureArray[0];
              const handLandmarks = results.landmarks[index];
              if (!handLandmarks) return;
              const pos = getHandPosition(handLandmarks);
              updateHandPos(handLandmarks);
              if (mode === "conductor") return;
              if (gesture.categoryName === "Closed_Fist") {
                if (mode === "manual") playNoteManual("Closed_Fist", pos);
                else if (mode === "autoChord") playChordFromHandPosition("Closed_Fist", pos);
                else if (mode === "arpeggiator") playArpeggioFromHandPosition("Closed_Fist", pos);
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
  }, [gestureRecognizer, webcamEnabled, bpm, noteLength, selectedKey, mode, arpeggioOctaves, arpeggioDirection]);

  const visualizerComponent =
    mode === "manual" ? (
      <ThreePianoVisualizer currentNote={currentNote} />
    ) : (
      <ChordGridVisualizer
        chords={getChordsForKey(selectedKey)}
        currentCell={currentChordCell}
      />
    );

  return (
    <>
      {/* Custom Header */}
      <Header />

      <div className="container mx-auto p-4">
        <div className="flex flex-row gap-4">
          {/* Left Column: Tutorials Prompt */}
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
                  <Button className="bg-teal-500 hover:bg-teal-600 text-white">
                    View Tutorials
                  </Button>
                </Link>
              </CardContent>
            </Card>

            {/* Circle of Fifths Card */}
            <Card className="mt-6 rounded-xl border border-teal-100 shadow-lg bg-white overflow-hidden">
              <CardHeader className="bg-teal-50 py-3 px-4 border-b border-teal-100">
                <h2 className="text-lg font-medium text-teal-800">Circle of Fifths</h2>
              </CardHeader>
              <CardContent className="p-4 flex justify-center">
                <CircleOfFifths
                  selectedKey={selectedKey === "None" ? "C Major" : selectedKey}
                  onSelectKey={(keyName) => {
                    setSelectedKey(keyName);
                  }}
                />
              </CardContent>
            </Card>
          </div>

          {/* Central Column: Webcam Feed & Visualizer */}
          <div className="w-1/2 flex flex-col items-center gap-4">
            {/* Webcam Viewer Box */}
            <div className="relative w-[640px] h-[480px] border rounded-lg shadow-lg overflow-hidden">
              {!webcamEnabled ? (
                <Button
                  onClick={() => {
                    setWebcamEnabled(true);
                    if (
                      audioContextRef.current &&
                      audioContextRef.current.state === "suspended"
                    ) {
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
              <video
                ref={videoRef}
                className="w-[640px] h-[480px] scale-x-[-1]"
                muted
                playsInline
              />
              <canvas
                ref={canvasRef}
                width={640}
                height={480}
                className="absolute top-0 left-0"
              />
              {(mode === "autoChord" ||
                mode === "arpeggiator" ||
                mode === "conductor") &&
                visualizerComponent}
              {mode === "conductor" && (
                <ConductorOverlay
                  progress={conductorProgress}
                  expectedProgress={expectedProgress}
                />
              )}
              {mode === "conductor" && !conductorStarted && (
                <div className="absolute top-0 left-0 w-[640px] h-[480px] flex flex-col items-center justify-center bg-black/50 text-white text-4xl z-50">
                  {countdown !== null ? (
                    <div>{countdown}</div>
                  ) : (
                    <Button
                      className="px-6 py-3 text-2xl bg-teal-500 hover:bg-teal-600 text-white"
                      onClick={startConductorGame}
                    >
                      Start Conductor Game
                    </Button>
                  )}
                </div>
              )}
              {mode === "conductor" && conductorStarted && (
                <div className="absolute bottom-0 left-0 w-[640px] h-5 bg-gray-300 z-50">
                  <div
                    className="h-full bg-green-500"
                    style={{ width: `${(conductorGameTime / 30) * 100}%` }}
                  />
                </div>
              )}
              {mode === "conductor" && gameScore !== null && (
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-black/70 text-white px-6 py-4 text-3xl z-50">
                  Your average timing error: {(gameScore * 100).toFixed(2)}%
                </div>
              )}
            </div>
            {/* If in manual mode, show the Three.js visualizer below the webcam box */}
            {mode === "manual" && (
              <div className="w-[640px] h-[280px] border rounded-lg shadow-lg">
                {visualizerComponent}
              </div>
            )}
          </div>

          {/* Right Column: Controls Panel */}
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
                    Mode:
                    <select
                      value={mode}
                      onChange={(e) =>
                        setMode(e.target.value as typeof mode)
                      }
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
                        <label className="block text-sm font-medium text-gray-700">
                          Octave Span
                        </label>
                        <select
                          value={arpeggioOctaves}
                          onChange={(e) =>
                            setArpeggioOctaves(Number(e.target.value))
                          }
                          className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                        >
                          <option value={1}>1 Octave</option>
                          <option value={2}>2 Octaves</option>
                          <option value={3}>3 Octaves</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">
                          Direction
                        </label>
                        <div className="flex flex-col gap-2">
                          <label className="flex items-center gap-1">
                            <input
                              type="radio"
                              value="up"
                              checked={arpeggioDirection === "up"}
                              onChange={() =>
                                setArpeggioDirection("up")
                              }
                              className="accent-teal-600"
                            />
                            <span className="text-sm">Up</span>
                          </label>
                          <label className="flex items-center gap-1">
                            <input
                              type="radio"
                              value="down"
                              checked={arpeggioDirection === "down"}
                              onChange={() =>
                                setArpeggioDirection("down")
                              }
                              className="accent-teal-600"
                            />
                            <span className="text-sm">Down</span>
                          </label>
                          <label className="flex items-center gap-1">
                            <input
                              type="radio"
                              value="upDown"
                              checked={arpeggioDirection === "upDown"}
                              onChange={() =>
                                setArpeggioDirection("upDown")
                              }
                              className="accent-teal-600"
                            />
                            <span className="text-sm">Up & Down</span>
                          </label>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                <Button
                  onClick={() => {
                    console.log("Test Closed_Fist Sample clicked.");
                    if (mode === "manual") {
                      playNoteManual("Closed_Fist", { x: 0.5, y: 0.5 });
                    } else if (mode === "autoChord") {
                      playChord("Cmaj");
                    } else if (mode === "arpeggiator") {
                      playArpeggio("Cmaj", (60 / bpm) * noteLength, arpeggioOctaves, arpeggioDirection);
                    }
                  }}
                  className="px-6 py-2 bg-teal-500 hover:bg-teal-600 text-white"
                >
                  Test Closed_Fist Sample
                </Button>
              </CardContent>
            </Card>

            

            {/* Instructions Card */}
            <Card className="mt-6 rounded-xl border border-teal-100 shadow-lg bg-white overflow-hidden">
              <div className="bg-teal-50 py-3 px-4 border-b border-teal-100">
                <h2 className="text-lg font-medium text-teal-800">How to Use</h2>
              </div>
              <CardContent className="p-4">
                <div className="prose prose-sm max-w-none">
                  <ol className="space-y-2 text-gray-700">
                    <li>Enable your webcam using the button in the video panel</li>
                    <li>Position your hand within the camera view</li>
                    <li>Make different hand gestures to trigger sounds:</li>
                  </ol>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-3">
                    <div className="p-3 bg-teal-50 rounded-md text-center">
                      <div className="text-xs font-semibold text-teal-800 mb-1">Open Palm</div>
                      <div className="text-xs text-gray-600">Major chord</div>
                    </div>
                    <div className="p-3 bg-teal-50 rounded-md text-center">
                      <div className="text-xs font-semibold text-teal-800 mb-1">Closed Fist</div>
                      <div className="text-xs text-gray-600">Minor chord</div>
                    </div>
                    <div className="p-3 bg-teal-50 rounded-md text-center">
                      <div className="text-xs font-semibold text-teal-800 mb-1">Victory Sign</div>
                      <div className="text-xs text-gray-600">Suspended chord</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
}
