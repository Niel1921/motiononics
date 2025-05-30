"use client";

import React, { useRef, useEffect, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useGesture } from "./hooks/useGesture";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import ThreePianoVisualizer from "../components/ThreePianoVisualizer";
import ThreeGuitarVisualizer, { ThreeGuitarVisualizerHandle } from "../components/ThreeGuitarVisualizer";
import ThreeThereminVisualizer from "../components/ThreeThereminVisualizer";
import Header from "@/components/ui/header";
import { keySignatures } from "./data/keySignatures";
import CircleOfFifths from "@/components/CircleOfFifths";
import Image from "next/image";
import {
    NOTE_TO_SEMITONE,
  } from "@/lib/constants";
import {
  snapChromaticToKey,
  getChordsForKey,
  getStringIndexFromY,
  isBackOfHand,
  getHandPosition,
} from "@/lib/musicHelpers";
import { useAudio } from "./hooks/useAudio";
import { GoogleTagManager } from '@next/third-parties/google'


//  --------------------------------------------------------------------
// | 3*3 Chord Grid Visuals                                             |
//  --------------------------------------------------------------------
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
let lastNoneY: number | null = null;



export default function Page() {


  //  --------------------------------------------------------------------
  // | Constants Defenitions for all states                               |
  //  --------------------------------------------------------------------
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [webcamEnabled, setWebcamEnabled] = useState(false);

  const gestureRecognizer = useGesture();
  const [handPos, setHandPos] = useState<{ x: number; y: number } | null>(null);
  const notePlayingRef  = useRef<boolean>(false);  

  const [bpm, setBpm] = useState<number>(120);
  const [noteLength, setNoteLength] = useState<number>(1);
  const [selectedKey, setSelectedKey] = useState<string>("None");

  const [instrument, setInstrument] = useState<"piano" | "guitar" | "theremin">("piano");
  const [mode, setMode] = useState<"manual" | "autoChord" | "arpeggiator" >("manual");

  const [arpeggioOctaves, setArpeggioOctaves] = useState<number>(1);
  const [arpeggioDirection, setArpeggioDirection] = useState<"up" | "down" | "upDown">("up");

  const [pianoInput, setPianoInput] = useState<"fist"|"finger">("fist");
  const fingerPressedRef = useRef<Record<number, boolean>>({});

  const guitarRef = useRef<ThreeGuitarVisualizerHandle>(null); //Guitar visualiser handing
  const [currentNotes, setCurrentNotes] = useState<number[]>([]);
  const [currentChordCell, setCurrentChordCell] = useState<number | null>(null);

  const [thereminFrequency, setThereminFrequency] = useState<number>(440);
  const [thereminVolume, setThereminVolume] = useState<number>(0);
  const [thereminVibrato, setThereminVibrato] = useState<number>(2);
  const [thereminWaveform, setThereminWaveform] = useState<string>("square");

  const [frameProcessingTimes, setFrameProcessingTimes] = useState<number[]>([]);

  const averageProcessingTime =
    frameProcessingTimes.length > 0
      ? frameProcessingTimes.reduce((sum, time) => sum + time, 0) / frameProcessingTimes.length
      : 0;

  // Calculate which semitones are available based on the selected key
  const availableSemitones = React.useMemo(() => {
    if (selectedKey === "None") return Array.from({length:12}, (_,i)=>i);
    return keySignatures[selectedKey].notes
      .map(n => NOTE_TO_SEMITONE[n]);
  }, [selectedKey]);

  // Initialise audio context and samples form audio helper
  const {
    initAudio,
    playGuitarString,
    audioCtxRef,
    samplesRef,
    convolverRef
  } = useAudio();

  useEffect(() => {
    initAudio();
  }, [initAudio]);


  // Theremin needs bigger size due to "how to" box below
  const visualizerSizes: Record<"theremin" | "guitar" | "piano", string> = {
    theremin: "w-[640px] h-[790px]", 
    guitar:   "w-[640px] h-[280px]",    
    piano:    "w-[640px] h-[280px]",    
  };

  //  --------------------------------------------------------------------
  // | WEBCAM RECOGNITION SETUP                                           |
  //  --------------------------------------------------------------------
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

  function updateHandPos(landmarks: { x: number; y: number }[]) {
    const pos = getHandPosition(landmarks);
    setHandPos(pos);
  }

  //  --------------------------------------------------------------------
  // |  FUNCTION TO PLAY SINGULAR NOTE (USED FOR ALL GUITAR/PIANO MODES)  |
  //  --------------------------------------------------------------------
  function playNoteManual(
    gestureLabel: string,
    handPosition: { x: number; y: number }
  ) {
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
  
  //  --------------------------------------------------------------------
  // | CHORD RECOGNITION FUNCTION FOR PIANO/GUITAR                        |
  //  --------------------------------------------------------------------  
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

  //  --------------------------------------------------------------------
  // | ARPEGGIO RECOGNITION FUNCTION FOR PIANO/GUITAR                     |
  //  --------------------------------------------------------------------
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

  //  --------------------------------------------------------------------
  // | CHORD PLAYBACK FUNCTION FOR PIANO/GUITAR                           |
  //  --------------------------------------------------------------------

  function playChord(chordLabel: string) {
    const audioCtx = audioCtxRef.current;
    if (!audioCtx) return;
    if (notePlayingRef.current) return;
  
    const duration = (60 / bpm) * noteLength;
    const noteToSemitone: Record<string, number> = {C: 0, "C#": 1, D: 2, "D#": 3, E: 4, F: 5, "F#": 6, G: 7, "G#": 8, A: 9, "A#": 10, B: 11,};
    
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

  
  //  --------------------------------------------------------------------
  // | ARPEGGIO PLAYBACK FUNCTION FOR PIANO/GUITAR                        |
  //  --------------------------------------------------------------------
  function playArpeggio(chordLabel: string, duration: number, octaves: number, direction: "up" | "down" | "upDown") {
    const audioCtx = audioCtxRef.current;
    if (!audioCtx) return;
    if (notePlayingRef.current) return;
    notePlayingRef.current = true;

    const noteToSemitone: Record<string, number> = {C: 0, "C#": 1, D: 2, "D#": 3, E: 4, F: 5, "F#": 6, G: 7, "G#": 8, A: 9, "A#": 10, B: 11,};
    const match = chordLabel.match(/^[A-G]#?/);

    if (!match) return;
    const root = match[0];
    const chordType = chordLabel.replace(root, "");
    let intervals: number[] = [];
    if (chordType === "maj") intervals = [0, 4, 7];
    else if (chordType === "min") intervals = [0, 3, 7];
    else if (chordType === "dim") intervals = [0, 3, 6];
    let pattern: number[] = [];

    //Set and define Direction of the arpeggio
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

    const noteDuration = duration; // seconds per note
    const totalTime = noteDuration * pattern.length;    pattern.forEach((intervalVal, i) => {
    const source = audioCtx.createBufferSource();
    const sampleKey = instrument === "guitar" ? "None" : "Closed_Fist";
    source.buffer = samplesRef.current[sampleKey];
    if (!source.buffer) return;
    let semitoneOffset = (noteToSemitone[root] ?? 0) + intervalVal;
    if (instrument === "guitar") semitoneOffset += -16;

    source.playbackRate.value = Math.pow(2, semitoneOffset / 12);
    const gainNode = audioCtx.createGain();
    gainNode.gain.value = 0.2;
    source.connect(gainNode);

    //Play notes and set the visualiser notes
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

  //  --------------------------------------------------------------------
  // | THEREMIN                                                           |
  //  --------------------------------------------------------------------
  const thereminOscillatorRef = useRef<OscillatorNode | null>(null);
  const thereminGainRef = useRef<GainNode | null>(null);
  const thereminFilterRef = useRef<BiquadFilterNode | null>(null);
  const thereminVibratoOscRef = useRef<OscillatorNode | null>(null);
  const thereminVibratoGainRef = useRef<GainNode | null>(null);

  useEffect(() => {
    const audioCtx = audioCtxRef.current;
    if (!audioCtx) return;
  
    if (instrument === "theremin") {
      if (!thereminOscillatorRef.current) {
        console.log("Creating theremin oscillator...");
        const mainOsc = audioCtx.createOscillator();
        // Set Waveform and Filter
        mainOsc.type = thereminWaveform as OscillatorType;
        const filter = audioCtx.createBiquadFilter();
        filter.type = "lowpass";
        filter.frequency.value = 1200;
        const mainGain = audioCtx.createGain();
        mainGain.gain.value = 0;
  
        if (convolverRef.current) {
          //Add Reverb
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
        thereminOscillatorRef.current.type = thereminWaveform as OscillatorType;
      }
    } else {
      //Stop theremin if switching to another instrument
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
  

  //  --------------------------------------------------------------------
  // |  MAIN GESTURE LOOP                                                 |
  //  --------------------------------------------------------------------
  useEffect(() => {
    if (!gestureRecognizer || !webcamEnabled) return;
    const videoEl = videoRef.current;
    const canvasEl = canvasRef.current;
    if (!videoEl || !canvasEl) return;
  
    const ctx = canvasEl.getContext("2d");
    let animationFrameId: number;
  
    // --- handle one video frame ---
    const processFrame = async () => {

      const start = performance.now();

      if (videoEl.readyState < videoEl.HAVE_ENOUGH_DATA || !ctx) {
        animationFrameId = requestAnimationFrame(processFrame);
        return;
      }

  
      // mirror & draw
      ctx.save();
      ctx.translate(canvasEl.width, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(videoEl, 0, 0, canvasEl.width, canvasEl.height);
  
      try {
        const results = await gestureRecognizer.recognizeForVideo(
          videoEl,
          performance.now()
        );
  
        switch (instrument) {
          case "theremin":
            handleThereminFrame(results);
            break;
          default:
            handleInstrumentFrame(results);
        }
  
        drawLandmarks(results.landmarks);
      } catch (err) {
        console.error("Error processing frame:", err);
      }
  
      ctx.restore();

      const end = performance.now();
      const duration = end - start;

      setFrameProcessingTimes((prev) => {
        const newTimes = [...prev, duration];
        if (newTimes.length > 100) { // Keep only the last 100 samples
          newTimes.shift();
        }
        return newTimes;
      });
    
      animationFrameId = requestAnimationFrame(processFrame);
    };
  
    // Theremin
    const handleThereminFrame = (results: any) => {
      const { landmarks, handedness } = results;
      if (!landmarks || !handedness) return;
  
      let leftLM: any[]|null = null, rightLM: any[]|null = null;
      handedness.forEach((hArr: any[], i: number) => {
        const label = hArr?.[0]?.categoryName;
        if (label === "Left")  leftLM = landmarks[i];
        if (label === "Right") rightLM = landmarks[i];
      });
      if (!leftLM || !rightLM) return;
  
      // frequency
      const leftPos = getHandPosition(leftLM);
      const freq = 200 + leftPos.x * 400;
      // volume
      const rightPos = getHandPosition(rightLM);
      const rawVol = 1 - rightPos.y;
      const vol = rawVol > 0.3
        ? ((rawVol - 0.3) / 0.7) * 0.5
        : 0;
      // vibrato
      const { x: tx, y: ty } = rightLM[4];
      const { x: ix, y: iy } = rightLM[8];
      const pinch = Math.hypot(tx - ix, ty - iy);
      const vib = Math.min(10, Math.max(0, ((pinch - 0.02) / 0.38) * 10));
  
      const now = audioCtxRef.current!.currentTime;
      thereminOscillatorRef.current?.frequency.setTargetAtTime(freq, now, 0.05);
      thereminGainRef.current?.gain.setTargetAtTime(vol, now, 0.05);
      thereminVibratoOscRef.current?.frequency.setTargetAtTime(vib, now, 0.05);
  
      setThereminFrequency(freq);
      setThereminVolume(vol);
      setThereminVibrato(vib);
    };
  

    const handleInstrumentFrame = (results: any) => {
      if (!results?.gestures || !results.landmarks) return;
  
      results.gestures.forEach((gestureArr: any[], i: number) => {
        const gesture = gestureArr[0];
        if (!gesture) return;
  
        const landmarks = results.landmarks[i];
        const handedLabel = results.handedness[i]?.[0]?.categoryName as "Left" | "Right";
        const pos = getHandPosition(landmarks);
        updateHandPos(landmarks);
  
        // Mode checking for audio (non theremin ones)
        if (instrument === "guitar") {
          if (mode === "manual" && gesture.categoryName === "None" && isBackOfHand(landmarks, handedLabel)
          ) {
            const idx = getStringIndexFromY(pos.y);
            playGuitarString(idx, bpm, noteLength);
            guitarRef.current?.triggerString(idx);
          }
          else if (mode === "autoChord" && gesture.categoryName === "Closed_Fist" && !notePlayingRef.current) {
            playChordFromHandPosition("Closed_Fist", pos);
          }
          else if (mode === "arpeggiator" && gesture.categoryName === "Closed_Fist" && !notePlayingRef.current) {
            playArpeggioFromHandPosition("Closed_Fist", pos);
          }
        }
        else if (instrument === "piano") {
          if (mode === "manual") {
            if (pianoInput === "fist" && gesture.categoryName === "Closed_Fist") {
              playNoteManual("Closed_Fist", pos);
            }
            else if (pianoInput === "finger" && gesture.categoryName === "None") {
              detectFingerTap(landmarks);
            }
          }
          else if (mode === "autoChord" && gesture.categoryName === "Closed_Fist" && !notePlayingRef.current) {
            playChordFromHandPosition("Closed_Fist", pos);
          }
          else if (mode === "arpeggiator" && gesture.categoryName === "Closed_Fist" && !notePlayingRef.current) {
            playArpeggioFromHandPosition("Closed_Fist", pos);
          }
        }
      });
    };
  
    // Draw blue dots on hands
    const drawLandmarks = (allLandmarks: any[][] | null) => {
      if (!allLandmarks) return;
      allLandmarks.forEach(arr =>
        arr.forEach(lm => {
          ctx!.beginPath();
          ctx!.arc(lm.x * canvasEl.width, lm.y * canvasEl.height, 4, 0, 2 * Math.PI);
          ctx!.fillStyle = "blue";
          ctx!.fill();
        })
      );
    };
  
    // Finger Tap Gesture detection
    const detectFingerTap = (lms: any[]) => {
      [4,8,12,16,20].forEach((idx, fi) => {
        const y = lms[idx].y;
        const avg = [4,8,12,16,20]
          .filter(j => j!==idx)
          .reduce((s,j)=>s + lms[j].y, 0) / 4;
        const pressed = y - avg > 0.06;
        if (pressed && !fingerPressedRef.current[idx]) {
          fingerPressedRef.current[idx] = true;
          playNoteManual("Closed_Fist", { x: fi/4, y: 0.5 });
        } else if (!pressed) {
          fingerPressedRef.current[idx] = false;
        }
      });
    };
  
    processFrame();
    return () => cancelAnimationFrame(animationFrameId);
  
  }, [
    gestureRecognizer,
    webcamEnabled,
    instrument,
    mode,
    bpm,
    noteLength,
    selectedKey,
    pianoInput,
    arpeggioOctaves,
    arpeggioDirection,
  ]);
  
  //Value to highlight current chord cell
  const currentChordName =
    currentChordCell !== null ? getChordsForKey(selectedKey)[currentChordCell]?.name : null;

  return (
    <>
      <GoogleTagManager gtmId="G-HEBMK5ZZYG" />
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
              <CardContent className="p-4 flex flex-col items-center">
                {/* the wheel */}
                <div className="w-full flex justify-center">
                  <CircleOfFifths
                    selectedKey={selectedKey === "None" ? "C Major" : selectedKey}
                    onSelectKey={(keyName) => setSelectedKey(keyName)}
                  />
                </div>

                {/* dropdown + reset, below the wheel */}
                <motion.div
                  className="mt-4 w-full bg-teal-50 rounded-lg p-3 border border-teal-100"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.2 }}
                >
                  <h4 className="text-teal-800 font-medium mb-2">Key</h4>
                  <div className="flex items-center space-x-2">
                    <div className="relative flex-1">
                      <select
                        value={selectedKey}
                        onChange={(e) => setSelectedKey(e.target.value)}
                        className="w-full p-2 pl-3 pr-10 bg-white border border-teal-200 rounded-md text-teal-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
                      >
                        <option value="None">None (Chromatic)</option>
                        {Object.keys(keySignatures).map((keyName) => (
                          <option key={keyName} value={keyName}>
                            {keyName}
                          </option>
                        ))}
                      </select>
                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-teal-700">
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                          <path
                            fillRule="evenodd"
                            clipRule="evenodd"
                            d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                          />
                        </svg>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      className="whitespace-nowrap"
                      onClick={() => setSelectedKey("None")}
                    >
                      Reset (Chromatic)
                    </Button>
                  </div>
                </motion.div>
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
                    initAudio().then(() => {
                      if (audioCtxRef.current?.state === "suspended") {
                        audioCtxRef.current.resume();
                        }
                      });
                  }}
                  className="absolute inset-0 mx-20 my-auto px-15 py-4 text-xxl z-20 bg-teal-500 hover:bg-teal-600 text-white"
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
                  {(instrument !== "theremin" &&
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
                    )}
                
                {/* Controls Section */}
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold text-teal-700 mb-3">Playback Settings</h3>
                    
                    {/* BPM Control */}
                    <AnimatePresence>
                      {instrument!='theremin' && (
                        <motion.div 
                          className="mb-4 bg-teal-50 rounded-lg p-3 border border-teal-100"
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.3 }}
                        >
                          <h4 className="text-teal-800 font-medium mb-2">Tempo (BPM)</h4>
                          <div className="flex items-center space-x-3">
                            <input
                              type="range"
                              min={40}
                              max={180}
                              value={bpm}
                              onChange={(e) => setBpm(Number(e.target.value))}
                              className="w-full accent-teal-600"
                            />
                            <span className="text-teal-800 font-semibold bg-white px-3 py-1 rounded-md border border-teal-200 min-w-[3rem] text-center">
                              {bpm}
                            </span>
                          </div>
                        </motion.div>
                        )}
                      </AnimatePresence>

                    {/* Note Length */}
                    <AnimatePresence>
                      {instrument!='theremin' && (
                    <motion.div 
                      className="mb-4 bg-teal-50 rounded-lg p-3 border border-teal-100"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: 0.1 }}
                    >
                      <h4 className="text-teal-800 font-medium mb-2">Note Length</h4>
                      <div className="grid grid-cols-5 gap-1">
                        {[
                          { value: 0.25, label: "16th" },
                          { value: 0.5, label: "8th" },
                          { value: 1, label: "1/4" },
                          { value: 2, label: "1/2" },
                          { value: 4, label: "Whole" }
                        ].map((option, index) => (
                          <motion.button
                            key={option.value}
                            onClick={() => setNoteLength(option.value)}
                            className={`
                              py-2 px-1 text-sm rounded-md transition-all
                              ${noteLength === option.value 
                                ? "bg-teal-600 text-white font-medium shadow-sm" 
                                : "bg-white text-teal-700 border border-teal-200 hover:bg-teal-100"}
                            `}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            initial={{ opacity: 0, y: 5 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.2, delay: 0.1 + index * 0.05 }}
                          >
                            {option.label}
                          </motion.button>
                        ))}
                      </div>
                    </motion.div>
                      )}
                    </AnimatePresence>


                    {/* Arpeggiator Settings */}
                    <AnimatePresence>
                      {mode === "arpeggiator" && instrument!='theremin' && (
                        <motion.div 
                          className="space-y-4"
                          initial={{ opacity: 0, height: 0, overflow: "hidden" }}
                          animate={{ opacity: 1, height: "auto", overflow: "visible" }}
                          exit={{ opacity: 0, height: 0, overflow: "hidden" }}
                          transition={{ duration: 0.3 }}
                        >
                          <motion.div 
                            className="bg-teal-50 rounded-lg p-3 border border-teal-100"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.3, delay: 0.1 }}
                          >
                            <h4 className="text-teal-800 font-medium mb-2">Octave Span</h4>
                            <div className="grid grid-cols-2 gap-2">
                              {[1, 2].map((octave, index) => (
                                <motion.button
                                  key={octave}
                                  onClick={() => setArpeggioOctaves(octave)}
                                  className={`
                                    py-2 px-4 rounded-md transition-all
                                    ${arpeggioOctaves === octave 
                                      ? "bg-teal-600 text-white font-medium shadow-sm" 
                                      : "bg-white text-teal-700 border border-teal-200 hover:bg-teal-100"}
                                  `}
                                  whileHover={{ scale: 1.05 }}
                                  whileTap={{ scale: 0.95 }}
                                  initial={{ opacity: 0, y: 5 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  transition={{ duration: 0.2, delay: 0.2 + index * 0.1 }}
                                >
                                  {octave} {octave === 1 ? "Octave" : "Octaves"}
                                </motion.button>
                              ))}
                            </div>
                          </motion.div>

                          {/* Arpeggio Direction */}
                          <motion.div 
                            className="bg-teal-50 rounded-lg p-3 border border-teal-100"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.3, delay: 0.2 }}
                          >
                            <h4 className="text-teal-800 font-medium mb-2">Direction</h4>
                            <div className="grid grid-cols-3 gap-2">
                              {[
                                { value: "up", label: "Up", icon: "↑" },
                                { value: "down", label: "Down", icon: "↓" },
                                { value: "upDown", label: "Up & Down", icon: "↕" }
                              ].map((option, index) => (
                                <motion.button
                                  key={option.value}
                                  onClick={() => setArpeggioDirection(option.value as "up" | "down" | "upDown")}
                                  className={`
                                    py-2 px-1 rounded-md transition-all flex flex-col items-center
                                    ${arpeggioDirection === option.value 
                                      ? "bg-teal-600 text-white font-medium shadow-sm" 
                                      : "bg-white text-teal-700 border border-teal-200 hover:bg-teal-100"}
                                  `}
                                  whileHover={{ scale: 1.05 }}
                                  whileTap={{ scale: 0.95 }}
                                  initial={{ opacity: 0, y: 5 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  transition={{ duration: 0.2, delay: 0.3 + index * 0.1 }}
                                >
                                  <span className="text-lg mb-1">{option.icon}</span>
                                  <span className="text-xs">{option.label}</span>
                                </motion.button>
                              ))}
                            </div>
                          </motion.div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                  </div>

                  {/* Test Sample Button */}
                  <motion.div 
                    className="flex justify-center"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: 0.3 }}
                  >
                    <motion.button
                      onClick={() => {
                        console.log("Test Sample button clicked.");
                        if (mode === "manual") {
                          if (audioCtxRef.current)
                            playGuitarString(3, bpm, noteLength);
                          } 
                          else if (mode === "autoChord") {
                          playChord("Cmaj");
                        } else if (mode === "arpeggiator") {
                          playArpeggio("Cmaj", (60 / bpm) * noteLength, arpeggioOctaves, arpeggioDirection);
                        }
                      }}
                      className="w-full px-6 py-3 bg-teal-500 hover:bg-teal-600 text-white font-medium rounded-lg shadow-md transition-colors flex items-center justify-center"
                      whileHover={{ scale: 1.03, backgroundColor: "#0d9488" }}
                      whileTap={{ scale: 0.97 }}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                      </svg>
                      Test Sample
                    </motion.button>
                  </motion.div>

                  {instrument==="piano" && mode==="manual" && (
                  <div className="mb-4">
                    <h3 className="text-lg font-semibold text-teal-700 mb-2">Piano Input</h3>
                    <div className="flex gap-2">
                      {(["fist","finger"] as const).map(m => (
                        <button key={m} onClick={()=>setPianoInput(m)}
                          className={`flex-1 py-2 rounded-md border ${
                            pianoInput===m 
                              ? "bg-teal-600 text-white" 
                              : "bg-white text-teal-700 hover:bg-teal-100"
                          }`}
                        >
                          {m==="fist" ? "Closed Fist" : "Finger Tap"}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
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

            {/* TEST FOR FRAME PROCESSING TIME, TO TEST UNCOMMENT THIS
            <Card className="bg-white shadow-md mb-6">
              <CardHeader className="bg-purple-50 border-b border-purple-100">
                <h2 className="text-2xl font-bold text-purple-800">Performance</h2>
              </CardHeader>
              <CardContent className="p-6">
                <div className="mb-4">
                  <h3 className="text-lg font-semibold text-purple-700 mb-2">Frame Processing Time</h3>
                  <p className="text-gray-700">
                    Average: {averageProcessingTime.toFixed(2)} ms
                  </p>
                </div>
              </CardContent>
            </Card>
            */}
          </div>
        </div>
      </div>
    </>
  );
}
