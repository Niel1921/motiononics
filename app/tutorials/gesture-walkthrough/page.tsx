"use client";

import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import Image from "next/image"; // Next.js Image component
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import Header from "@/components/ui/header";
import { isBackOfHand } from "@/lib/musicHelpers";

// Import Mediapipe tasks
import { FilesetResolver, GestureRecognizer } from "@mediapipe/tasks-vision";

// Piano notes for success feedback
const pianoNotes = {
  C4: "/samples/success.wav",
  E4: "/samples/success.wav",
  G4: "/samples/success.wav",
  C5: "/samples/successfinal.mp3",
};

const gestureList = [
  {
    name: "Closed_Fist", // still recognized as a gesture by Mediapipe
    displayName: "Closed Fist",
    image: "/gestureimg/fistlogo.png",
    description: "Make a closed fist with your hand.",
    note: "C4",
    overlayImage: "/gestureimg/fist-overlay.png",
    color: "#3b82f6"
  },
  {
    name: "Open_Palm", // still recognized
    displayName: "Open Palm",
    image: "/gestureimg/openhandlogo.jpg",
    description: "Hold your hand wide open, with fingers spread.",
    note: "E4",
    overlayImage: "/gestureimg/openhand-overlay.png",
    color: "#10b981"
  },
  {
    name: "Back_Of_Hand", // **custom detection**
    displayName: "Back of Hand",
    image: "/gestureimg/backofhand.png",
    description: "Show the back of your hand to the camera (palm away).",
    note: "G4",
    overlayImage: "/gestureimg/backofhand-overlay.png",
    color: "#f59e0b"
  },
  {
    name: "Pinch", // **custom detection**
    displayName: "Pinch",
    image: "/gestureimg/pinchlogo.png",
    description: "Pinch your thumb and index finger together.",
    note: "C5",
    overlayImage: "/gestureimg/pinch-overlay.png",
    color: "#8b5cf6"
  },
];

// Animations
const pageVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
};

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

const successVariants = {
  hidden: { scale: 0.8, opacity: 0 },
  visible: { 
    scale: 1, 
    opacity: 1,
    transition: { 
      type: "spring", 
      stiffness: 300, 
      damping: 15 
    }
  },
};

export default function GestureWalkthroughWithMediapipe() {
  // Track the gesture recognized by Mediapipe
  const [recognizedGesture, setRecognizedGesture] = useState<string>("");
  // Track which gesture index the user is on
  const [currentIndex, setCurrentIndex] = useState(0);
  // Track how many consecutive seconds the correct gesture has been held
  const [heldTime, setHeldTime] = useState(0);
  // When all gestures are complete
  const isComplete = currentIndex >= gestureList.length;
  // Show overlay guide
  const [showOverlay, setShowOverlay] = useState(true);
  // Success animation
  const [showSuccess, setShowSuccess] = useState(false);
  // Loading state
  const [loading, setLoading] = useState(true);
  // Track overall progress
  const [overallProgress, setOverallProgress] = useState(0);
  // Track hand visibility
  const [handVisible, setHandVisible] = useState(false);

  // Audio context and elements
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioElementsRef = useRef<Record<string, HTMLAudioElement>>({});

  // References for the webcam and canvas
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // Reference for the Mediapipe gesture recognizer
  const [gestureRecognizer, setGestureRecognizer] = useState<GestureRecognizer | null>(null);
  // Track whether the webcam is enabled
  const [webcamEnabled, setWebcamEnabled] = useState(false);

  // Initialize audio
  useEffect(() => {
    // Create audio elements for each note
    Object.entries(pianoNotes).forEach(([note, url]) => {
      const audio = new Audio(url);
      audio.preload = "auto";
      audioElementsRef.current[note] = audio;
    });

    // Create an AudioContext for more control if needed
    audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();

    return () => {
      // Clean up audio context
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  // Play success sound when user correctly holds a gesture
  const playSuccessSound = (note: string = "C5") => {
    if (audioElementsRef.current[note]) {
      const audio = audioElementsRef.current[note];
      audio.currentTime = 0;
      audio.play().catch(err => console.error("Error playing audio:", err));
    }
  };

  // Initialize Mediapipe
  useEffect(() => {
    (async () => {
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
        console.log("Gesture recognizer initialized.");
      } catch (error) {
        console.error("Error initializing gesture recognizer:", error);
        setLoading(false);
      }
    })();
  }, []);

  // Handle enabling/disabling the webcam
  useEffect(() => {
    const videoEl = videoRef.current;
    if (!webcamEnabled || !videoEl) return;
    
    let stream: MediaStream | null = null;
    navigator.mediaDevices
      .getUserMedia({ 
        video: { 
          width: { ideal: 1280 },
          height: { ideal: 720 },
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

  useEffect(() => {
    if (!gestureRecognizer || !webcamEnabled) return;
    
    const videoEl = videoRef.current!;
    const canvasEl = canvasRef.current!;
    if (!videoEl || !canvasEl) return;
    
    const ctx = canvasEl.getContext("2d")!;
    if (!ctx) return;
    
    let lastLogTime = 0;
    let animationFrameId: number;
    
    async function processFrame() {
      if (videoEl.readyState >= videoEl.HAVE_ENOUGH_DATA) {
        ctx.save();
        ctx.clearRect(0, 0, canvasEl.width, canvasEl.height);
        ctx.translate(canvasEl.width, 0);
        ctx.scale(-1, 1);
        
        // Draw video frame
        ctx.drawImage(videoEl!, 0, 0, canvasEl.width, canvasEl.height);
        
        // Process with Mediapipe
        const timestamp = performance.now();
        try {
          const results = await gestureRecognizer!.recognizeForVideo(videoEl!, timestamp);
          
          if (timestamp - lastLogTime > 1000) {
            lastLogTime = timestamp;
          }
          
          // Update hand visibility
          setHandVisible(results?.landmarks && results.landmarks.length > 0);

          // --- Custom gesture logic below ---
          let customGesture = "";
          if (results?.landmarks && results.landmarks.length > 0) {
            const lms = results.landmarks[0];

            // Get handedness as "Right" | "Left" or fallback
            let handed: "Right" | "Left" = "Right";
            // Corrected lines:
            if (results.handedness && results.handedness[0] && 
              Array.isArray(results.handedness[0]) && 
              results.handedness[0][0] && 
              'categoryName' in results.handedness[0][0]) {
            const label = results.handedness[0][0].categoryName;
            handed = label === "Left" ? "Left" : "Right";
            }

            

            // Custom: back of hand
            if (isBackOfHand(lms, handed)) {
              customGesture = "Back_Of_Hand";
            } else {
              // Custom: pinch (thumb tip to index tip distance)
              const thumb = lms[4];
              const index = lms[8];
              if (thumb && index) {
                const pinchDist = Math.hypot(thumb.x - index.x, thumb.y - index.y);
                if (pinchDist < 0.06) {
                  customGesture = "Pinch";
                }
              }
            }
          }


          // If not custom, use Mediapipe gesture
          if (!customGesture) {
            if (results?.gestures && results.gestures.length > 0) {
              const [firstHandGestures] = results.gestures;
              if (firstHandGestures && firstHandGestures.length > 0) {
                customGesture = firstHandGestures[0].categoryName;
              }
            }
          }

          setRecognizedGesture(customGesture);

          // Draw hand landmarks with improved visualization
          if (results?.landmarks) {
            ctx.save();
            
            // Get current gesture color
            const currentColor = !isComplete && currentIndex < gestureList.length 
              ? gestureList[currentIndex].color 
              : "#14b8a6"; // Default teal color
            
            results.landmarks.forEach((lmArr) => {
              // Draw connections between landmarks for better hand visualization
              ctx.strokeStyle = currentColor;
              ctx.lineWidth = 3;
              
              // Finger connections (simplified)
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
        
        // Draw semi-transparent overlay guide if enabled and not completed
        if (showOverlay && !isComplete && currentIndex < gestureList.length) {
          const currentGesture = gestureList[currentIndex];
          const img = new window.Image();
          img.src = currentGesture.overlayImage;
          
          ctx.save();
          ctx.globalAlpha = 0.4;
          // Center the overlay on the canvas
          ctx.drawImage(
            img,
            (canvasEl.width - 300) / 2,
            (canvasEl.height - 300) / 2,
            300,
            300
          );
          ctx.restore();
        }
      }
      
      animationFrameId = requestAnimationFrame(processFrame);
    }
    
    processFrame();
    return () => cancelAnimationFrame(animationFrameId);
  }, [gestureRecognizer, webcamEnabled, currentIndex, isComplete, showOverlay]);

  // 3-second hold logic: poll the recognized gesture every second
  useEffect(() => {
    if (!webcamEnabled || isComplete || showSuccess) return;
    
    // Update overall progress when currentIndex changes
    setOverallProgress((currentIndex / gestureList.length) * 100);
    
    const intervalId = window.setInterval(() => {
      if (isComplete) return;
      
      const neededName = gestureList[currentIndex].name;
      if (recognizedGesture === neededName) {
        setHeldTime((prev) => {
          // Stop incrementing once we reach 3 seconds
          if (prev >= 3) return 3;
          return prev + 1;
        });
      } else {
        setHeldTime(0);
      }
    }, 1000);
    
    return () => {
      clearInterval(intervalId);
    };
  }, [recognizedGesture, currentIndex, isComplete, webcamEnabled, gestureList.length, showSuccess]);

  // Progress update for current gesture
  useEffect(() => {
    if (!webcamEnabled || isComplete || showSuccess) return;
    
    // If holding the correct gesture
    if (heldTime > 0 && heldTime < 3) {
      // Play a soft tick sound for feedback
      const tickSound = new Audio("/samples/tick.wav");
      tickSound.volume = 0.8;
      tickSound.play().catch(err => console.error("Error playing audio:", err));
    }
    
    // If the correct gesture has been held for 3 seconds, move to the next gesture
    if (heldTime === 3) {
      // Show success animation
      setShowSuccess(true);
      
      // Play the success sound for this gesture
      playSuccessSound(gestureList[currentIndex].note);
      
      // Reset and advance after a short delay
      setTimeout(() => {
        setHeldTime(0);
        setShowSuccess(false);
        
        // If this is the last gesture, we need to update the overall progress one last time
        if (currentIndex === gestureList.length - 1) {
          setOverallProgress(100);
        }
        
        setCurrentIndex((prev) => prev + 1);
      }, 1500);
    }
  }, [heldTime, currentIndex, isComplete, webcamEnabled, showSuccess]);

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
          <h1 className="text-4xl font-bold text-teal-800 mb-2">Gesture Piano Tutorial</h1>
          <p className="text-lg text-teal-600">
            Learn to control music with hand gestures
          </p>
          
          {/* Overall progress bar */}
          <div className="mt-6 max-w-md mx-auto">
            <p className="text-sm text-teal-600 mt-2">
              {isComplete ? "Complete!" : `${Math.round(overallProgress)}% Complete`}
            </p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Left panel: Instructions & Gesture Info */}
          <div className="md:col-span-1">
            <Card className="bg-white shadow-lg rounded-xl overflow-hidden border border-teal-100 h-full">
              <CardHeader className="bg-teal-50 border-b border-teal-100">
                <h2 className="text-xl font-semibold text-teal-800">
                  {isComplete ? "All Gestures Complete!" : `Step ${currentIndex + 1}: ${gestureList[currentIndex]?.displayName}`}
                </h2>
              </CardHeader>
              
              <CardContent className="p-6">
                {loading ? (
                  <div className="flex flex-col items-center justify-center h-64">
                    <div className="w-12 h-12 border-4 border-teal-500 border-t-transparent rounded-full animate-spin"></div>
                    <p className="mt-4 text-teal-600">Loading gesture recognizer...</p>
                  </div>
                ) : isComplete ? (
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
                        You've mastered all the gestures!
                      </p>
                    </div>
                    
                    <div className="space-y-4">
                      <Button 
                        className="w-full bg-teal-600 hover:bg-teal-700 text-white"
                        onClick={() => {
                          setCurrentIndex(0);
                          setHeldTime(0);
                          setOverallProgress(0);
                        }}
                      >
                        Restart Tutorial
                      </Button>
                      
                      <Link href="/piano" passHref>
                        <Button className="w-full bg-teal-700 hover:bg-teal-800 text-white">
                          Try the Piano App
                        </Button>
                      </Link>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key={currentIndex}
                    variants={cardVariants}
                    initial="hidden"
                    animate="visible"
                    className="space-y-6"
                  >
                    <div className="aspect-square w-full max-w-[240px] mx-auto relative">
                      <Image
                        src={gestureList[currentIndex].image}
                        alt={gestureList[currentIndex].displayName}
                        layout="fill"
                        objectFit="contain"
                        className="rounded-lg"
                      />
                    </div>
                    
                    <div>
                      <h3 className="text-lg font-medium text-teal-700 mb-2">Instructions:</h3>
                      <p className="text-gray-600">{gestureList[currentIndex].description}</p>
                    </div>
                    
                    <div>
                      <h3 className="text-lg font-medium text-teal-700 mb-2">Hold Time:</h3>
                      <div className="w-full bg-gray-200 rounded-full h-2.5">
                        <div 
                          className="h-2.5 rounded-full bg-teal-500 transition-all duration-300"
                          style={{ width: `${(heldTime / 3) * 100}%` }}
                        ></div>
                      </div>
                      <p className="text-right text-sm text-gray-500 mt-1">
                        {heldTime}/3 seconds
                      </p>
                    </div>
                    
                    <div className="pt-4">
                      <div className="flex items-center justify-between">
                        <label className="block text-sm font-medium text-gray-700">
                          Show Overlay Guide
                        </label>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input 
                            type="checkbox" 
                            checked={showOverlay}
                            onChange={() => setShowOverlay(!showOverlay)} 
                            className="sr-only peer" 
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-teal-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-600"></div>
                        </label>
                      </div>
                    </div>
                  </motion.div>
                )}
              </CardContent>
            </Card>
          </div>
          
          {/* Right panel: Webcam Feed and Canvas */}
          <div className="md:col-span-2">
            <Card className="bg-white shadow-lg rounded-xl overflow-hidden border border-teal-100">
              <CardHeader className="bg-teal-50 border-b border-teal-100 flex flex-row justify-between items-center">
                <h2 className="text-xl font-semibold text-teal-800">Camera Feed</h2>
                <Button
                  onClick={() => setWebcamEnabled(!webcamEnabled)}
                  className={`${webcamEnabled ? 'bg-red-500 hover:bg-red-600' : 'bg-teal-500 hover:bg-teal-600'} text-white`}
                  size="sm"
                >
                  {webcamEnabled ? 'Disable Camera' : 'Enable Camera'}
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
                      Enable the camera to start the gesture tutorial. Your camera feed is processed locally and never uploaded or stored.
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
                  </div>
                )}
              </CardContent>
              
              {/* Keyboard visualization at the bottom */}
              <div className="p-4 bg-gray-50 border-t border-gray-200">
                <h3 className="text-sm font-medium text-gray-600 mb-2">Piano Notes</h3>
                <div className="flex justify-center">
                  <div className="flex h-16 relative">
                    {/* White keys */}
                    {['C4', 'E4', 'G4', 'C5'].map((note, i) => {
                      const isActive = !isComplete && gestureList[currentIndex]?.note === note;
                      return (
                        <div
                          key={note}
                          className={`w-12 h-full rounded-b border border-gray-300 flex items-end justify-center pb-1 ${
                            isActive ? 'bg-teal-100 border-teal-400' : 'bg-white'
                          }`}
                        >
                          <span className="text-xs text-gray-500">{note}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </Card>
            
            {/* Tip card */}
            <Card className="mt-6 bg-white shadow-lg rounded-xl overflow-hidden border border-teal-100">
              <CardContent className="p-4">
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-teal-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-medium text-teal-800">Pro Tip</h3>
                    <p className="text-sm text-gray-600">
                      Make sure you have good lighting and keep your hand within the camera frame. 
                      Each gesture will play a unique piano note when recognized.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
        
        {/* Navigation buttons */}
        <div className="mt-8 flex justify-between">
          <Link href="/" passHref>
            <Button variant="outline" className="border-teal-500 text-teal-500 hover:bg-teal-50">
              Back to Home
            </Button>
          </Link>
          
          <div className="space-x-2">
            {!isComplete && (
              <Button 
                variant="outline"
                className="border-teal-500 text-teal-500 hover:bg-teal-50"
                onClick={() => {
                  if (currentIndex > 0) {
                    setCurrentIndex(currentIndex - 1);
                    setHeldTime(0);
                  }
                }}
                disabled={currentIndex === 0}
              >
                Previous
              </Button>
            )}
            
            <Button
              className="bg-teal-500 hover:bg-teal-600 text-white"
              onClick={() => {
                if (!isComplete) {
                  setCurrentIndex(Math.min(currentIndex + 1, gestureList.length));
                  setHeldTime(0);
                } else {
                  setCurrentIndex(0);
                  setHeldTime(0);
                  setOverallProgress(0);
                }
              }}
            >
              {isComplete ? "Restart Tutorial" : "Skip This Gesture"}
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}