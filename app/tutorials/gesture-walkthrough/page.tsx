"use client";

import React, { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import Header from "@/components/ui/header";

// Import Mediapipe tasks
import { FilesetResolver, GestureRecognizer } from "@mediapipe/tasks-vision";

// Example gestures for the tutorial. Adjust `name` to match exactly how Mediapipe classifies them.
const gestureList = [
  {
    name: "Closed_Fist", // must match gesture.categoryName from Mediapipe
    displayName: "Closed Fist",
    image: "/gestureimg/fistlogo.png",
    description: "Make a closed fist with your hand.",
  },
  {
    name: "Open_Palm",
    displayName: "Open Hand",
    image: "/gestureimg/openhandlogo.jpg",
    description: "Hold your hand wide open, with fingers spread.",
  },
  {
    name: "Thumb_Up",
    displayName: "Thumbs Up",
    image: "/gestureimg/thumbuplogo.png",
    description: "Show a thumbs up gesture with your hand.",
  },
  {
    name: "Victory",
    displayName: "Victory (V)",
    image: "/gestureimg/victorylogo.jpg",
    description: "Make a V shape with your index and middle fingers.",
  },
];

// Basic fade‑in animation for the page.
const pageVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
};

export default function GestureWalkthroughWithMediapipe() {
  // Track the gesture recognized by Mediapipe.
  const [recognizedGesture, setRecognizedGesture] = useState<string>("");
  // Track which gesture index the user is on.
  const [currentIndex, setCurrentIndex] = useState(0);
  // Track how many consecutive seconds the correct gesture has been held.
  const [heldTime, setHeldTime] = useState(0);
  // When all gestures are complete.
  const isComplete = currentIndex >= gestureList.length;

  // References for the webcam and canvas.
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // Reference for the Mediapipe gesture recognizer.
  const [gestureRecognizer, setGestureRecognizer] = useState<GestureRecognizer | null>(null);
  // Track whether the webcam is enabled.
  const [webcamEnabled, setWebcamEnabled] = useState(false);

  // 1) Initialize Mediapipe.
  useEffect(() => {
    (async () => {
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
    })();
  }, []);

  // 2) Handle enabling/disabling the webcam.
  useEffect(() => {
    const videoEl = videoRef.current;
    if (!webcamEnabled || !videoEl) return;
    let stream: MediaStream | null = null;
    navigator.mediaDevices
      .getUserMedia({ video: true })
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

  // 3) Main Mediapipe loop: analyze frames and update the recognized gesture.
  useEffect(() => {
    if (!gestureRecognizer || !webcamEnabled) return;
    const videoEl = videoRef.current;
    const canvasEl = canvasRef.current;
    if (!videoEl || !canvasEl) return;
    const ctx = canvasEl.getContext("2d");
    if (!ctx) return;
    let lastLogTime = 0;
    let animationFrameId: number;
    async function processFrame() {
      if (videoEl.readyState >= videoEl.HAVE_ENOUGH_DATA) {
        ctx.save();
        ctx.translate(canvasEl.width, 0);
        ctx.scale(-1, 1);
        // Use non-null assertion (!) since we've already checked videoEl and canvasEl.
        ctx.drawImage(videoEl!, 0, 0, canvasEl.width, canvasEl.height);
        const timestamp = performance.now();
        try {
          const results = await gestureRecognizer!.recognizeForVideo(videoEl!, timestamp);
          if (timestamp - lastLogTime > 1000) {
            console.log("Gesture results:", results);
            lastLogTime = timestamp;
          }
          if (results?.gestures && results.gestures.length > 0) {
            const [firstHandGestures] = results.gestures;
            if (firstHandGestures && firstHandGestures.length > 0) {
              const topGesture = firstHandGestures[0];
              setRecognizedGesture(topGesture.categoryName);
            }
          }
          if (results?.landmarks) {
            results.landmarks.forEach((lmArr) => {
              lmArr.forEach((lm) => {
                ctx.beginPath();
                ctx.arc(lm.x * canvasEl.width, lm.y * canvasEl.height, 5, 0, 2 * Math.PI);
                ctx.fillStyle = "red";
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
    }
    processFrame();
    return () => cancelAnimationFrame(animationFrameId);
  }, [gestureRecognizer, webcamEnabled]);

  // 4) 3‑second hold logic: poll the recognized gesture every second.
  useEffect(() => {
    const intervalId = window.setInterval(() => {
      if (isComplete) return;
      const neededName = gestureList[currentIndex].name;
      if (recognizedGesture === neededName) {
        setHeldTime((prev) => prev + 1);
      } else {
        setHeldTime(0);
      }
    }, 1000);
    return () => {
      clearInterval(intervalId);
    };
  }, [recognizedGesture, currentIndex, isComplete]);

  // 5) If the correct gesture has been held for 3 seconds, move to the next gesture.
  useEffect(() => {
    if (heldTime >= 3) {
      setHeldTime(0);
      setCurrentIndex((prev) => prev + 1);
    }
  }, [heldTime]);

  return (
    <>
      <Header />
      <motion.div
        className="min-h-screen bg-teal-50 p-6"
        variants={pageVariants}
        initial="hidden"
        animate="visible"
        transition={{ duration: 0.5 }}
      >
        <div className="max-w-2xl mx-auto text-center mb-8">
          <h1 className="text-4xl font-bold text-teal-800">Gesture Tutorial</h1>
          <p className="mt-2 text-lg text-teal-700">
            Hold each gesture for 3 consecutive seconds to move on!
          </p>
        </div>

        <div className="flex justify-center mb-4">
          {!webcamEnabled ? (
            <Button
              onClick={() => setWebcamEnabled(true)}
              className="bg-teal-500 hover:bg-teal-600 text-white"
            >
              Enable Webcam
            </Button>
          ) : (
            <Button
              onClick={() => setWebcamEnabled(false)}
              className="bg-teal-500 hover:bg-teal-600 text-white"
            >
              Disable Webcam
            </Button>
          )}
        </div>

        {/* Webcam + Canvas */}
        <div className="flex justify-center">
          <div className="relative border border-teal-300">
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
          </div>
        </div>

        {/* Gesture info card */}
        <div className="max-w-xl mx-auto mt-8 text-center">
          {isComplete ? (
            <Card className="bg-white shadow-xl">
              <CardHeader>
                <h2 className="text-2xl font-semibold text-teal-800">
                  All Gestures Complete!
                </h2>
              </CardHeader>
              <CardContent>
                <p className="text-teal-700 mb-4">
                  You’ve successfully held each gesture for 3 seconds.
                </p>
                <Button
                  className="bg-teal-500 hover:bg-teal-600 text-white"
                  onClick={() => {
                    setCurrentIndex(0);
                    setHeldTime(0);
                  }}
                >
                  Restart
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card className="bg-white shadow-xl">
              <CardHeader>
                <h2 className="text-2xl font-semibold text-teal-800">
                  {gestureList[currentIndex].displayName}
                </h2>
              </CardHeader>
              <CardContent>
                <img
                  src={gestureList[currentIndex].image}
                  alt={gestureList[currentIndex].displayName}
                  className="w-40 h-40 object-contain mx-auto mb-4"
                />
                <p className="text-teal-700 mb-4">
                  {gestureList[currentIndex].description}
                </p>
                <p className="text-teal-800 font-semibold">
                  Time Held: {heldTime} / 3 seconds
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Debug info */}
        <div className="mt-8 max-w-lg mx-auto text-center text-sm text-gray-500">
          <p>Currently recognized: {recognizedGesture || "None"}</p>
          <p className="mt-2">
            (Hold the correct gesture in front of the webcam for 3 seconds!)
          </p>
          <div className="mt-4">
            <Link href="/">
              <Button
                variant="outline"
                className="border-teal-500 text-teal-500 hover:bg-teal-500 hover:text-white"
              >
                Back Home
              </Button>
            </Link>
          </div>
        </div>
      </motion.div>
    </>
  );
}
