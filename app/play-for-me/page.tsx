"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FilesetResolver, GestureRecognizer } from "@mediapipe/tasks-vision";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import Header from "@/components/ui/header";
import CircleOfFifths from "@/components/CircleOfFifths";
import Link from "next/link";
import Image from "next/image";
import { Renderer, Stave, StaveNote, Formatter, Voice, Annotation } from 'vexflow';
import { jsPDF } from 'jspdf';
import { chordPatternsByGenre } from "../data/chordPatterns"
import { rhythmPatternsByGenre } from "../data/rhythmPatterns"
import { DndProvider, useDrag, useDrop } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import {
  buildEightChordsFromCell,
  getChordsForKey,
  getNotesForChord,
  semitoneToNoteName,
} from "../hooks/musicUtils"

// Animation Variants 
const pageVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.5 } },
};

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

const MAX_CHORDS = 64;
type DragItem = { index: number; type: string };


export default function PlayForMePage() {

  // Add new state for the editable pattern
  const [editableCurrentChords, setEditableCurrentChords] = useState<string[]>([]);
  const [isEditingPattern, setIsEditingPattern] = useState(false); 
  const [editableRomanPattern, setEditableRomanPattern] = useState<string[]>([]);
  

  // All refs needed 
  const [selectedKey, setSelectedKey] = useState("C Major");

  const [selectedChordGenre, setSelectedChordGenre] =
  useState<keyof typeof chordPatternsByGenre>("pop");

  const [selectedChordPatternId, setSelectedChordPatternId] =
    useState<string>(
      chordPatternsByGenre["pop"][0].id
    );
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
  const [errorMessage, setErrorMessage] = useState("");
  const audioPreviewRef = useRef<HTMLAudioElement>(null);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);




  // Audio
  const audioContextRef = useRef<AudioContext | null>(null);
  const samplesRef = useRef<Record<string, AudioBuffer>>({});
  const notePlayingRef = useRef(false);
  const convolverRef = useRef<ConvolverNode | null>(null);
  const beatTimerRef = useRef<NodeJS.Timeout | null>(null);

  const [recording, setRecording] = useState(false);
  const [recordedChords, setRecordedChords] = useState<string[]>([]);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);

  const recorderNodeRef = useRef<ScriptProcessorNode | null>(null);
  const recordingRef = useRef(false);
  const pcmLeftRef = useRef<Float32Array[]>([]);
  const pcmRightRef = useRef<Float32Array[]>([]);

  // Visual
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Initialise Audio 
  const initAudio = useCallback(async () => {
    try {
      if (!audioContextRef.current || audioContextRef.current.state === "closed") {
        audioContextRef.current = new (window.AudioContext ||
          (window as any).webkitAudioContext)();
      }
      const audioCtx = audioContextRef.current;
      const samples: Record<string, AudioBuffer> = {};

      try {
        const pianoResponse = await fetch("/samples/fist.wav");
        if (pianoResponse.ok) {
          const arrayBuffer = await pianoResponse.arrayBuffer();
          samples["Closed_Fist_Piano"] = await audioCtx.decodeAudioData(arrayBuffer);
        }
        const guitarResponse = await fetch("/samples/guitarnew.wav");
        if (guitarResponse.ok) {
          const guitarArrayBuffer = await guitarResponse.arrayBuffer();
          samples["Closed_Fist_Guitar"] = await audioCtx.decodeAudioData(guitarArrayBuffer);
        }

        samplesRef.current = samples;
      } catch (error) {
        console.error("Error loading sample:", error);
      }

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

  // Initialise GestureRecognizer 
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

    // whenever blobUrl changes, force the audio to reload (Prevents errors)
    useEffect(() => {
      if (blobUrl && audioPreviewRef.current) {
        audioPreviewRef.current.load();
      }
    }, [blobUrl]);
  

  // Webcam Setup 
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


  useEffect(() => {
    const patterns = chordPatternsByGenre[selectedChordGenre];
    const chosen =
      patterns.find(p => p.id === selectedChordPatternId)
      ?? patterns[0];

    // if we fell back, sync the ID so the UI buttons stay in sync
    if (chosen.id !== selectedChordPatternId) {
      setSelectedChordPatternId(chosen.id);
    }

    setEditableRomanPattern([...chosen.romanArray]);
    setIsEditingPattern(false);
    setNextChordCell(null);
  }, [selectedChordGenre, selectedChordPatternId]);

  
  // Helper to reorder beats
  const moveBeat = useCallback((from: number, to: number) => {
    setEditableRomanPattern(prev => {
      const copy = [...prev];
      const [moved] = copy.splice(from, 1);
      copy.splice(to, 0, moved);
      return copy;
    });
    if (currentChordCell !== null) {
      const newChords = buildEightChordsFromCell(
        currentChordCell,
        selectedKey,
        editableRomanPattern
      );
      setEditableCurrentChords(newChords);
    }
  }, [currentChordCell, selectedKey, editableRomanPattern]);

  //  --------------------------------------------------------------------
  // | RECORDING HANDLING FUNCTIONs (START, STOP, SAVE)                   |
  //  --------------------------------------------------------------------

  function startRecording() {
    const audioCtx = audioContextRef.current;
    if (!audioCtx) return;
  
    if (!webcamEnabled) {
      setErrorMessage("Please enable the camera before recording.");
      return;
    }

    setErrorMessage("");
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
    recordingRef.current = true;
    setRecording(true);
    setRecordedChords([]);
  }
  
  
  function stopRecording() {
    const audioCtx = audioContextRef.current;
    if (!audioCtx) return;
    
    if (pcmLeftRef.current.length === 0) {
      setErrorMessage("No audio detected. Please play at least one chord before stopping the recording.");
      return;
    }  
    if (recorderNodeRef.current) {
      try {
        recorderNodeRef.current.disconnect(audioCtx.destination);
      } catch (err) {
        console.warn("Recorder node wasn't connected to destination:", err);
      }
      if (convolverRef.current) {
        try {
          convolverRef.current.disconnect(recorderNodeRef.current);
        } catch (err) {
          console.warn("Convolver wasn't connected to recorder node:", err);
        }
      }
  
      recorderNodeRef.current = null;
    }

    recordingRef.current = false;
    setRecording(false);
    setErrorMessage(""); 
  
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
  
    // interleave Left + Right
    const interleaved = new Float32Array(total * 2);
    for (let i = 0, j = 0; i < total; i++) {
      interleaved[j++] = flatL[i];
      interleaved[j++] = flatR[i];
    }
  
    // encode to WAV
    const wavBuffer = encodeWAV(interleaved, audioCtx.sampleRate);
    const blob      = new Blob([wavBuffer], { type: "audio/wav" });
    setRecordedBlob(blob);

    const url = URL.createObjectURL(blob);
    setBlobUrl(url);
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

  // Gesture logic for each frame 
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
                const position = { x: 1 - avgX, y: avgY };
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
                ctx.stroke();
              });

              // Circles for each landmark
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

        drawChordGrid(ctx, canvasEl.width, canvasEl.height);
      }

      animationFrameId = requestAnimationFrame(processFrame);
    }

    processFrame();
    return () => cancelAnimationFrame(animationFrameId);
  }, [gestureRecognizer, webcamEnabled, isPlaying, selectedKey]);


  // Start playing the Chord pattern
  function startPlayingFromCell(cellIndex: number) {
    if (isPlaying || notePlayingRef.current) return;

    // Maximum 64 chords
    if (recording && recordedChords.length >= MAX_CHORDS) {
      setErrorMessage(`You've reached the max of ${MAX_CHORDS} chords.`);
      return;
    }

    setCurrentChordCell(cellIndex);
    setIsPlaying(true);

    const chosenPattern = chordPatternsByGenre[selectedChordGenre].find(p => p.id === selectedChordPatternId)!;
    const baseRoman = isEditingPattern ? editableRomanPattern : chosenPattern.romanArray;
    const spelled = buildEightChordsFromCell(cellIndex, selectedKey, baseRoman);
    setCurrentChords(spelled);
    setEditableCurrentChords(spelled);
    setCurrentBeatIndex(0);
    playPattern(spelled);
  }

  // Play the pattern 
  function playPattern(chords: string[]) {
    if (!chords.length) {
      setIsPlaying(false);
      return;
    }

    const rList = rhythmPatternsByGenre[selectedRhythmGenre];
    const chosenRhythm =
      rList.find((r) => r.id === selectedRhythmPatternId) || rList[0];
    const beatDurations = chosenRhythm.pattern.map(
      (p) => (60 / bpm) * 1000 * p
    );
    const velocities = chosenRhythm.velocities;

    playChord(chords[0], beatDurations[0], velocities[0]);
    setCurrentBeatIndex(0);
    if (recordingRef.current) {
      setRecordedChords((prev) => [...prev, chords[0]]);
    }

    let currentBeat = 0;
    if (beatTimerRef.current) {
      clearTimeout(beatTimerRef.current);
      beatTimerRef.current = null;
    }

    const doNext = () => {
      currentBeat++;
      // stop after one 8-beat pass
      if (currentBeat >= chords.length) {
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

      if (recordingRef.current) {
        setRecordedChords((prev) => [...prev, chordToPlay]);
      }
      beatTimerRef.current = setTimeout(doNext, thisDur);
    };

    beatTimerRef.current = setTimeout(doNext, beatDurations[0]);
  }

  //  --------------------------------------------------------------------
  // | CHORD SHEET PDF HANDLING                                           |
  //  --------------------------------------------------------------------

  function downloadChordSheetPDF(chords: string[]) {

    const tonic = selectedKey.split(' ')[0];
    const isMinor = selectedKey.includes('Minor');
    const vfKey   = isMinor ? tonic + 'm' : tonic;  
    // 1) Layout settings
    const measuresPerLine = 4;
    const lines          = Math.ceil(chords.length / measuresPerLine);
    const width          = 400;
    const lineHeight     = 120;          
    const height         = lineHeight * lines + 200; 
  
    // 2) Create an HTMLCanvasElement
    const canvas = document.createElement("canvas");
    canvas.width  = width;
    canvas.height = height;
    document.body.appendChild(canvas);
  
    // 3) Render VexFlow into that canvas
    const vfRenderer = new Renderer(canvas, Renderer.Backends.CANVAS);
    vfRenderer.resize(width, height);
    const ctx = vfRenderer.getContext();
  
    let y = 40; 
    for (let line = 0; line < lines; line++) {
      const stave = new Stave(10, y, width - 20);
      if (line === 0) stave.addClef("treble").addTimeSignature("4/4").addKeySignature(vfKey);
      stave.setContext(ctx).draw();

      const slice = chords.slice(
        line * measuresPerLine,
        line * measuresPerLine + measuresPerLine
      );
      // build up to 4 VexFlow notes (pad with rests if needed)
      const notes = slice.map((chord) => {
        const semis = getNotesForChord(chord);
        const keys  = semis.map((semi) => {
          // shift down one octave
          const n = semi + 48;
          const octave = Math.floor(n / 12);
          const name   = ["c","c#","d","d#","e","f","f#","g","g#","a","a#","b"][n % 12];
          return `${name}/${octave}`;
        });
        const staveNote = new StaveNote({ keys, duration: "q" });
        const ann = new Annotation(chord)
          .setFont("Arial", 12)
          .setVerticalJustification(Annotation.VerticalJustify.TOP);
        staveNote.addModifier(ann);
        return staveNote;
      });
  
      // Pad with quarter-note rests if <4
      for (let i = slice.length; i < measuresPerLine; i++) {
        notes.push(new StaveNote({ keys: ["b/4"], duration: "qr" }));
      }
  
      // Create a 4/4 voice and draw
      const voice = new Voice({ numBeats: measuresPerLine, beatValue: 4 });
      voice.addTickables(notes);
  
      new Formatter().joinVoices([voice]).format([voice], width - 180);
      voice.draw(ctx, stave);
  
      y += lineHeight;
    }
  
    // 4) Turn canvas into PNG
    const pngData = canvas.toDataURL("image/png");
    document.body.removeChild(canvas);
  
    // 5) Build PDF
    const pdf = new jsPDF({
      unit: "px",
      format: [width + 20, height + 40],
    });
    pdf.setFontSize(16);
    pdf.text("My Chords", pdf.internal.pageSize.getWidth() / 2, 20, {
      align: "center",
    });
    pdf.addImage(pngData, "PNG", 10, 30, width, height);
    pdf.setFontSize(10);
    pdf.text(
      `Generated by Motiononics on ${new Date().toLocaleDateString()}`,
      pdf.internal.pageSize.getWidth() / 2,
      pdf.internal.pageSize.getHeight() - 10,
      { align: "center" }
    );
    pdf.save("chord-sheet-music.pdf");
  }
  

  //  Standard play chord function

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
  
      // connect the source into  gain
      source.connect(gainNode);
  
      // then go to reverb or straight to output
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
  

  //  Draw the chord grid overlay

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
            Play For Me
          </h1>
          <p className="text-xl text-purple-600 max-w-3xl mx-auto">
            Choose your chord to start the 8-chord pattern for that chord as “I!”
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
                  <div className="flex gap-4">
                    {(["piano", "guitar"] as const).map((inst) => (
                      <button
                        key={inst}
                        onClick={() => setInstrument(inst)}
                        className={`
                          w-1/2 flex flex-col items-center p-2
                          bg-white rounded-lg shadow
                          transition
                          ${instrument === inst
                            ? "ring-2 ring-purple-600"
                            : "hover:ring-1 hover:ring-purple-300"}
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

                {/* BPM */}
                <div className="mb-4">
                  <h3 className="text-lg font-semibold text-purple-700 mb-2">Tempo (BPM)</h3>
                  <div className="flex items-center space-x-4">
                    <input
                      type="range"
                      min={40}
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

                  <Link href="/tutorials/chord-modes">
                    <Button className="bg-purple-500 hover:bg-purple-600 text-white">Learn more!</Button>
                  </Link>

                  <CircleOfFifths selectedKey={selectedKey} onSelectKey={setSelectedKey} />
                </div>

                
              </CardContent>
            </Card>
  
            {/* Record-For-Me Card */}
            <motion.div
              className="bg-white shadow-md rounded-lg overflow-hidden mb-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <CardHeader className="bg-purple-50 border-b border-purple-100">
                <h2 className="text-2xl font-bold text-purple-800">Record-For-Me</h2>
              </CardHeader>
              <CardContent className="p-6">
                {/* Error banner */}
                <AnimatePresence>
                  {errorMessage && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.3 }}
                      className="mb-4 p-3 bg-red-100 text-red-800 rounded-md border border-red-200"
                    >
                      <div className="flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        {errorMessage}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="flex flex-col md:flex-row items-center justify-between mb-6">
                  <div className="w-full md:w-auto mb-4 md:mb-0">
                    <h3 className="text-lg font-semibold text-purple-700 mb-1">Record Your Chord Progression</h3>
                  </div>
                  <motion.div 
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Button
                      onClick={() => {
                        if (!webcamEnabled) {
                          setErrorMessage('Please enable your camera before recording.');
                          return;
                        }
                        setErrorMessage('');
                        recording ? stopRecording() : startRecording();
                      }}
                      className={`px-6 py-2 rounded-lg shadow-md transition-colors duration-150 font-semibold ${
                        recording
                          ? 'bg-red-500 hover:bg-red-600'
                          : 'bg-purple-600 hover:bg-purple-700'
                      } text-white flex items-center`}
                    >
                      {recording ? (
                        <>
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V8a1 1 0 00-1-1H8z" clipRule="evenodd" />
                          </svg>
                          Stop Recording
                        </>
                      ) : (
                        <>
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                          </svg>
                          Start Recording
                        </>
                      )}
                    </Button>
                  </motion.div>
                </div>

                {/* Recording indicator */}
                <AnimatePresence>
                  {recording && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.3 }}
                      className="mb-4 p-4 bg-purple-50 border border-purple-200 rounded-lg"
                    >
                      <div className="flex items-center">
                        <div className="relative mr-3">
                          <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                          <div className="w-3 h-3 bg-red-500 rounded-full absolute top-0 left-0 animate-ping opacity-75"></div>
                        </div>
                        <span className="text-purple-800 font-medium">Recording in progress...</span>
                      </div>
                      <div className="mt-2 text-sm text-purple-600">
                        Make fist gestures to trigger chords. Each chord will be recorded in sequence.
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Audio player */}
                <AnimatePresence>
                  {blobUrl && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      transition={{ duration: 0.3 }}
                      className="mb-6 p-4 bg-gray-50 border border-gray-200 rounded-lg"
                    >
                      <h4 className="text-purple-700 font-medium mb-2">
                        Your Recording
                      </h4>
                      <audio
                        key={blobUrl}
                        ref={audioPreviewRef}
                        controls
                        src={blobUrl}
                        className="w-full"
                      />
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Action buttons */}
                <div className="flex flex-wrap gap-2 mt-4">
                  <AnimatePresence>
                    {(recording || recordedBlob) && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        transition={{ duration: 0.2 }}
                      >
                        <Button
                          variant="outline"
                          className="border-gray-400 text-gray-700 hover:bg-gray-100 flex items-center"
                          onClick={() => {
                            if (recorderNodeRef.current) {
                              if (convolverRef.current) {
                                convolverRef.current.disconnect(recorderNodeRef.current);
                              }
                              recorderNodeRef.current.disconnect(audioContextRef.current!.destination);
                              recorderNodeRef.current = null;
                            }
                            pcmLeftRef.current = [];
                            pcmRightRef.current = [];
                            if (blobUrl) {
                              URL.revokeObjectURL(blobUrl);
                              setBlobUrl(null);
                            }
                            setRecording(false);
                            setRecordedChords([]);
                            setRecordedBlob(null);
                            setErrorMessage("");
                          }}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                          </svg>
                          Reset
                        </Button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                  
                  <AnimatePresence>
                    {recordedBlob && (
                      <motion.div 
                        className="flex gap-2"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        transition={{ duration: 0.2, delay: 0.1 }}
                      >
                        <motion.a
                          href={URL.createObjectURL(recordedBlob)}
                          download="play-for-me.wav"
                          className="px-4 py-2 rounded-md bg-purple-600 hover:bg-purple-700 text-white font-semibold transition-colors flex items-center shadow-md"
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                          </svg>
                          Download WAV
                        </motion.a>
                        
                        <motion.button
                          className="px-4 py-2 rounded-md bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-colors flex items-center shadow-md"
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => {
                            const txt = recordedChords.join(' ');
                            const blob = new Blob([txt], { type: 'text/plain' });
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = 'chords.txt';
                            a.click();
                            URL.revokeObjectURL(url);
                          }}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                          </svg>
                          Download Chord TXT
                        </motion.button>

                        <motion.button
                          className="px-4 py-2 rounded-md bg-green-600 hover:bg-green-700 text-white font-semibold transition-colors flex items-center shadow-md"
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => downloadChordSheetPDF(recordedChords)}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                          </svg>
                          Download Chord Sheet
                        </motion.button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </CardContent>
            </motion.div>
            </motion.div>



          {/* Right panel */}
          <motion.div className="lg:col-span-3" variants={cardVariants}>
            <Card className="bg-white shadow-md">
              <CardHeader className="bg-purple-50 border-b border-purple-100">
                <h2 className="text-2xl font-bold text-purple-800">Gesture Control</h2>
              </CardHeader>
              <CardContent className="p-6">
                {/* Camera Toggle */}
                <Button
                  onClick={() => setWebcamEnabled(!webcamEnabled)}
                  className={`w-full mb-4 ${
                    webcamEnabled ? "bg-red-500 hover:bg-red-600" : "bg-purple-600 hover:bg-purple-700"
                  } text-white`}
                >
                  {webcamEnabled ? "Disable Camera" : "Enable Camera"}
                </Button>
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
                        width={854}
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

                      
                    </>
                  )}
                </div>
                <AnimatePresence>
                  {!isEditingPattern && (
                    <motion.div
                      key="edit-button"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      transition={{ duration: 0.3 }}
                      className="mt-4 flex justify-center"
                    >
                      <Button
                        onClick={() => setIsEditingPattern(true)}
                        className="text-sm px-2 py-1 bg-purple-700 hover:bg-purple-500 rounded m-1"
                      >
                        Edit this progression
                      </Button>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* DRAG-AND-DROP EDITOR (when editing) */}
                <AnimatePresence>
                  {isEditingPattern && (
                    <motion.div
                      key="editor"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 20 }}
                      transition={{ duration: 0.4 }}
                    >
                      <DndProvider backend={HTML5Backend}>
                        <div className="mt-4 bg-purple-700 p-3 border border-purple-600 rounded mb-6">
                          <div className="flex items-center justify-between mb-2">
                            <h3 className="text-lg font-semibold text-purple-200 mb-2">
                              Make my own progression
                            </h3>
                            <Button
                              onClick={() => {

                                if (currentChordCell !== null) {
                                  const newChords = buildEightChordsFromCell(
                                    currentChordCell,
                                    selectedKey,
                                    editableRomanPattern
                                  );
                                  setCurrentChords(newChords);
                                  setEditableCurrentChords(newChords);
                                }
                                setNextChordCell(null);
                                setIsEditingPattern(false);
                                
                              }}
                              className="text-sm purple-800 px-2 py-1 mb-2 bg-purple-100 hover:bg-purple-200 text-purple-800"
                            >
                              Done (Reset Pattern)
                            </Button>
                          </div>
                          <div className="grid grid-cols-8 gap-1">
                            {editableRomanPattern.map((chord, i) => (
                              <BeatCell
                                key={i}
                                index={i}
                                chord={chord}
                                isActive={currentBeatIndex === i}
                                isEditing={true}
                                moveBeat={moveBeat}
                              />
                            ))}
                          </div>
                        </div>
                      </DndProvider>
                    </motion.div>
                  )}
                </AnimatePresence>

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
                {/* Rhythm and Chord Pattern Selection */}
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
                        className={`
                          w-full
                          flex flex-col items-start
                          px-4 py-10
                          ${
                            selectedRhythmPatternId === rp.id
                              ? "bg-purple-600 text-white"
                              : "bg-purple-100 text-purple-800"
                          }
                        `}
                      >
                        <div className="font-medium text-sm">{rp.name}</div>
                        <div className="text-s whitespace-normal break-words">
                          {rp.description}
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
                        className={`
                          w-full
                          px-2 py-10 
                          flex flex-col items-start
                          ${selectedChordPatternId === cp.id
                            ? "bg-purple-600 text-white"
                            : "bg-purple-100 text-purple-800"}
                        `}
                      >
                        <div className="font-medium text-sm">{cp.name}</div>
                        <div className="text-s whitespace-normal ">
                          {cp.description}
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
              <h3 className="text-xl font-bold mb-2">How To Use:</h3>
              <ol className="list-decimal list-inside space-y-3 ">
                  <li>Enable Camera</li>
                  <li>Pick Key, Chord Pattern, & Rhythm</li>
                  <li>Closed fist over a chord cell = base chord for the 8-chord pattern</li>
                </ol>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-b from-purple-600 to-purple-700 text-white shadow-lg">
            <CardContent className="p-6">
              <h3 className="text-xl font-bold mb-2">Rhythm and Chord Settings</h3>
              <p>
                The rhythm section allows you to choose a genre and a specific rhythm of your chords to make them sound more interesiting! 
                <br/>
                The chord section allows you to choose a genre and a range of melodies to make varied songs!
              </p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-b from-purple-700 to-purple-800 text-white shadow-lg">
            <CardContent className="p-6">
              <h3 className="text-xl font-bold mb-2">Record-For-Me</h3>
              <p>
                Select how long you want your recording to be (1-16 bars). Click the button to start recording!
                <br/>
                You can download the chords youve recorded in order as a text file, or the audio as a WAV file to listen to again!
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

  function BeatCell({
    index,
    chord,
    isActive,
    isEditing,
    moveBeat,
  }: {
    index: number;
    chord: string;
    isActive: boolean;
    isEditing: boolean;
    moveBeat: (from: number, to: number) => void;
  }) {
    const ref = useRef<HTMLDivElement>(null);
    const [, drag] = useDrag<DragItem, void, unknown>({
      type: 'BEAT',
      item: { index } as DragItem,
      canDrag: isEditing,
    });
    const [, drop] = useDrop<DragItem, void, unknown>({

      accept: 'BEAT',
      canDrop: () => isEditing,
      hover: (item: DragItem) => {
        if (item.index !== index) {
          moveBeat(item.index, index);
          item.index = index;
        }
      }
    });
    drag(drop(ref));
  
    return (
      <motion.div
        layout
        ref={ref}
        className={`relative p-2 text-center border hover:bg-purple-200 rounded ${
          isActive ? 'bg-purple-200 border-purple-400' : 'bg-white border-purple-100'
        } ${isEditing ? 'cursor-move' : ''}`}
      >
          <div className="text-sm font-mono text-purple-800">Beat {index + 1}</div>
          <div className="font-semibold text-purple-600 mt-1">{chord || '-'}</div>
          {isEditing && <span className="absolute top-1 right-1 text-xs opacity-50">☰</span>}
      </motion.div>
      );
  }
}  