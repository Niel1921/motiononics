"use client";

import React from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import Header from "@/components/ui/header";
import Link from "next/link";
import Image from "next/image";

// Animation variants
const pageVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.5 } },
};

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

const sectionVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: i * 0.1,
      duration: 0.5,
    },
  }),
};

export default function TutorialPage() {
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
            Play For Me: Tutorial Guide
          </h1>
          <p className="text-xl text-purple-600 max-w-3xl mx-auto">
            Learn how to use all features of the Play-For-Me tool to create music using hand gestures
          </p>
        </div>

        {/* Getting Started Section */}
        <motion.div
          custom={0}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={sectionVariants}
          className="mb-12"
        >
          <Card className="bg-white shadow-md overflow-hidden">
            <CardHeader className="bg-purple-50 border-b border-purple-100">
              <h2 className="text-2xl font-bold text-purple-800">Getting Started</h2>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <h3 className="text-xl font-semibold text-purple-700 mb-4">Welcome to Play For Me!</h3>
                  <p className="text-gray-700 mb-4">
                    Play For Me is an innovative tool that lets you create chord progressions with 
                    hand gestures. This tutorial will guide you through all its features, from basic 
                    setup to advanced recording options.
                  </p>
                  <p className="text-gray-700 mb-4">
                    At its core, Play For Me lets you:
                  </p>
                  <ul className="list-disc pl-5 space-y-2 text-gray-700 mb-6">
                    <li>Select chords with hand gestures through your webcam</li>
                    <li>Choose from various chord patterns and rhythms</li>
                    <li>Customize your performance with different instruments</li>
                    <li>Record your musical creations and download them</li>
                  </ul>
                  <div className="bg-purple-50 p-4 rounded-lg border border-purple-100">
                    <h4 className="font-semibold text-purple-700 mb-2">Quick Start:</h4>
                    <ol className="list-decimal pl-5 space-y-1 text-gray-700">
                      <li>Enable your camera</li>
                      <li>Select a key, chord pattern, and rhythm</li>
                      <li>Make a closed fist gesture over a chord cell</li>
                      <li>Listen to the generated 8-chord progression</li>
                    </ol>
                  </div>
                </div>
                <div className="flex items-center justify-center bg-gray-100 rounded-lg p-4">
                  <div className="text-center">
                    <div className="mb-3">
                      <Image 
                        src="/tutorialimg/overview.png" 
                        alt="Overview of the Play For Me interface" 
                        width={500} 
                        height={320} 
                        className="rounded-lg"
                      />
                    </div>
                    <p className="text-sm text-gray-600 italic">
                      An overview of the Play For Me interface
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Camera Setup Section */}
        <motion.div
          custom={1}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={sectionVariants}
          className="mb-12"
        >
          <Card className="bg-white shadow-md overflow-hidden">
            <CardHeader className="bg-purple-50 border-b border-purple-100">
              <h2 className="text-2xl font-bold text-purple-800">Camera Setup & Gesture Control</h2>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <h3 className="text-xl font-semibold text-purple-700 mb-4">Enabling Your Camera</h3>
                  <p className="text-gray-700 mb-4">
                    The camera is essential for Play For Me to detect your hand gestures. Here's how to set it up:
                  </p>
                  <ol className="list-decimal pl-5 space-y-3 mb-6 text-gray-700">
                    <li>
                      <span className="font-medium">Enable Camera:</span> Click the "Enable Camera" button in the 
                      Gesture Control section. Your browser will ask for permission to access your webcam.
                    </li>
                    <li>
                      <span className="font-medium">Position Yourself:</span> Make sure there's good lighting 
                      and your hand is clearly visible in the frame.
                    </li>
                    <li>
                      <span className="font-medium">Test Hand Detection:</span> Move your hand in the frame 
                      and you should see it being tracked with purple outlines.
                    </li>
                  </ol>                
                </div>
                <div>
                <h3 className="text-xl font-semibold text-purple-700 mb-4">Understanding Hand Gestures</h3>
                  <div className="grid grid-cols-1 gap-4 mb-6">
                    <div className="bg-purple-50 p-4 rounded-lg border border-purple-100">
                      <h4 className="font-semibold text-purple-700 mb-2">Closed Fist</h4>
                      <p className="text-gray-700 mb-2">
                        Making a closed fist over a chord cell will select it as the root chord and 
                        start playing the 8-chord progression.
                      </p>
                      <div className="rounded-lg flex items-center justify-center">
                        <Image 
                          src="/gestureimg/fistlogo.png" 
                          alt="Closed fist gesture demonstration" 
                          width={210} 
                          height={180} 
                          className="rounded-lg"
                        />
                      </div>
                    </div>

                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Chord Grid & Music Theory Section */}
        <motion.div
          custom={2}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={sectionVariants}
          className="mb-12"
        >
          <Card className="bg-white shadow-md overflow-hidden">
            <CardHeader className="bg-purple-50 border-b border-purple-100">
              <h2 className="text-2xl font-bold text-purple-800">Chord Grid & Music Basics</h2>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <h3 className="text-xl font-semibold text-purple-700 mb-4">Understanding the Chord Grid</h3>
                  <p className="text-gray-700 mb-4">
                    The chord grid displays a 3×3 matrix of chords based on your selected key. Each cell 
                    represents a different chord in the key.
                  </p>
                  <div className="bg-gray-100 rounded-lg p-4 mb-6">
                    <div className="mb-3">
                      <Image 
                        src="/tutorialimg/grid.png" 
                        alt="Chord grid with Roman numeral notation" 
                        width={480} 
                        height={320} 
                        className="rounded-lg"
                      />
                    </div>
                    <p className="text-sm text-gray-600 italic">
                      The chord grid with Roman numeral notation and chord names
                    </p>
                  </div>
                  
                  <div className="bg-purple-50 p-4 rounded-lg border border-purple-100 mb-6">
                    <h4 className="font-semibold text-purple-700 mb-2">What Happens When You Select a Chord:</h4>
                    <ol className="list-decimal pl-5 space-y-1 text-gray-700">
                      <li>The selected chord becomes the "I" chord (tonic)</li>
                      <li>An 8-chord progression is generated based on your chosen pattern</li>
                      <li>The progression plays with your selected rhythm and instrument</li>
                      <li>Each chord in the progression is highlighted as it plays</li>
                    </ol>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-xl font-semibold text-purple-700 mb-4">Selecting Musical Key</h3>
                  <p className="text-gray-700 mb-4">
                    The key determines which set of chords will be available in the grid. Different keys 
                    will create different moods and tonalities.
                  </p>
                  
                  <div className="bg-gray-100 rounded-lg p-4 mb-6">
                    <h4 className="font-semibold text-purple-700 mb-2">Circle of Fifths</h4>
                    <div className="mb-3 justifyitems-center">
                      <Image 
                        src="/tutorialimg/circleof5ths.png" 
                        alt="Circle of Fifths key selector" 
                        width={380} 
                        height={240} 
                        className="rounded-lg"
                      />
                    </div>
                    <p className="text-sm text-gray-600 italic">
                      The Circle of Fifths selector helps you choose a musical key
                    </p>
                  </div>
                  
                  <div className="bg-purple-50 p-4 rounded-lg border border-purple-100">
                    <h4 className="font-semibold text-purple-700 mb-2">Quick Music Theory:</h4>
                    <ul className="list-disc pl-5 space-y-2 text-gray-700">
                      <li>
                        <span className="font-medium">Major Keys:</span> Generally sound bright, happy, or uplifting
                      </li>
                      <li>
                        <span className="font-medium">Minor Keys:</span> Often sound more melancholic, serious, or dramatic
                      </li>
                      <li>
                        <span className="font-medium">Uppercase (I):</span> Major chord
                      </li>
                      <li>
                        <span className="font-medium">Lowercase (i):</span> Minor chord
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Instrument & Tempo Section */}
        <motion.div
          custom={3}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={sectionVariants}
          className="mb-12"
        >
          <Card className="bg-white shadow-md overflow-hidden">
            <CardHeader className="bg-purple-50 border-b border-purple-100">
              <h2 className="text-2xl font-bold text-purple-800">Instrument & Tempo Settings</h2>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <h3 className="text-xl font-semibold text-purple-700 mb-4">Choosing Your Instrument</h3>
                  <p className="text-gray-700 mb-4">
                    Play For Me offers different instrument options to change the sound of your chord progressions.
                  </p>
                  
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="bg-purple-50 p-4 rounded-lg border border-purple-100">
                      <h4 className="font-semibold text-purple-700 mb-2">Piano</h4>
                      <div className="bg-white h-44 w-full rounded-lg flex items-center justify-center">
                        <Image
                          src={`/instrumentimg/pianoicon.png`}
                          alt={"Piano Icon"}
                          width={120}
                          height={120}
                          className="object-contain"
                          />
                      </div>
                    </div>
                    <div className="bg-purple-50 p-4 rounded-lg border border-purple-100">
                      <h4 className="font-semibold text-purple-700 mb-2">Guitar</h4>
                      <div className="bg-white h-44 w-full rounded-lg flex items-center justify-center">
                        <Image
                          src={`/instrumentimg/guitaricon.png`}
                          alt={"Guitar Icon"}
                          width={120}
                          height={120}
                          className="object-contain"
                          />
                      </div>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-xl font-semibold text-purple-700 mb-4">Setting the Tempo</h3>
                  <p className="text-gray-700 mb-4">
                    The tempo (BPM - Beats Per Minute) controls how fast your progression plays. 
                    Different tempos can dramatically change the feel of the same chord progression.
                  </p>
                  
                  <div className="bg-gray-100 rounded-lg p-4 mt-10 mb-6">
                    <h4 className="font-semibold text-purple-700 mb-6">Tempo Slider</h4>
                    <div className="mb-3">
                      <Image 
                        src="/tutorialimg/bpmslider.png" 
                        alt="Tempo slider control" 
                        width={480} 
                        height={120} 
                        className="rounded-lg"
                      />
                    </div>
                    <p className="text-sm text-gray-600 italic">
                      Drag the slider to adjust the speed of your progression
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Chord & Rhythm Patterns Section */}
        <motion.div
          custom={4}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={sectionVariants}
          className="mb-12"
        >
          <Card className="bg-white shadow-md overflow-hidden">
            <CardHeader className="bg-purple-50 border-b border-purple-100">
              <h2 className="text-2xl font-bold text-purple-800">Chord & Rhythm Patterns</h2>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <h3 className="text-xl font-semibold text-purple-700 mb-4">Chord Patterns</h3>
                  <p className="text-gray-700 mb-4">
                    Chord patterns determine the sequence of chords that will play after you select a 
                    root chord. They're organized by music genre.
                  </p>
                  
                  
                  <div className="bg-gray-100 rounded-lg p-4 mb-6">
                    <h4 className="font-semibold text-purple-700 mb-2">Pattern Selection</h4>
                    <div className="mb-3">
                      <Image 
                        src="/tutorialimg/chordgenre.png" 
                        alt="Chord pattern selection interface" 
                        width={480} 
                        height={240} 
                        className="rounded-lg"
                      />
                    </div>
                    <p className="text-sm text-gray-600 italic">
                      Choose a specific 8-chord pattern within your selected genre
                    </p>
                  </div>
                  
                  <div className="bg-purple-50 p-4 rounded-lg border border-purple-100">
                    <h4 className="font-semibold text-purple-700 mb-2">Genre Examples:</h4>
                    <ul className="list-disc pl-5 space-y-2 text-gray-700">
                      <li>
                        <span className="font-medium">Pop:</span> Includes patterns like I-V-vi-IV (the "4-chord" pop progression)
                      </li>
                      <li>
                        <span className="font-medium">Rock:</span> Often uses power chord progressions and blues-influenced patterns
                      </li>
                      <li>
                        <span className="font-medium">Jazz:</span> Features ii-V-I progressions and more complex harmony
                      </li>
                      <li>
                        <span className="font-medium">Blues:</span> Includes 12-bar blues patterns and variations
                      </li>
                      <li>
                        <span className="font-medium">Latin:</span> Features distinctive rhythmic patterns and harmonic movements
                      </li>
                    </ul>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-xl font-semibold text-purple-700 mb-4">Rhythm Patterns</h3>
                  <p className="text-gray-700 mb-4">
                    Rhythm patterns control how your chords are played rhythmically - whether with 
                    even timing, syncopation, or other rhythmic features.
                  </p>
                  
                  
                  <div className="bg-gray-100 rounded-lg p-4 mb-6">
                    <h4 className="font-semibold text-purple-700 mb-2">Rhythm Pattern Selection</h4>
                    <div className="mb-3">
                      <Image 
                        src="/tutorialimg/rhythmgenre.png" 
                        alt="Rhythm pattern selection interface" 
                        width={480} 
                        height={240} 
                        className="rounded-lg"
                      />
                    </div>
                    <p className="text-sm text-gray-600 italic">
                      Choose a specific rhythm pattern within your selected genre
                    </p>
                  </div>
                  
                  <div className="bg-purple-50 p-4 rounded-lg border border-purple-100">
                    <h4 className="font-semibold text-purple-700 mb-2">Rhythm Type Examples:</h4>
                    <ul className="list-disc pl-5 space-y-2 text-gray-700">
                      <li>
                        <span className="font-medium">Straight Eighths:</span> Even, regular rhythm (common in pop)
                      </li>
                      <li>
                        <span className="font-medium">Syncopated:</span> Emphasis on unexpected beats (funk, Latin)
                      </li>
                      <li>
                        <span className="font-medium">Shuffle/Swing:</span> Uneven eighth notes (blues, jazz)
                      </li>
                      <li>
                        <span className="font-medium">Backbeat:</span> Emphasis on beats 2 and 4 (rock, R&B)
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Recording Feature Section */}
        <motion.div
          custom={5}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={sectionVariants}
          className="mb-12"
        >
          <Card className="bg-white shadow-md overflow-hidden">
            <CardHeader className="bg-purple-50 border-b border-purple-100">
              <h2 className="text-2xl font-bold text-purple-800">Recording Your Music</h2>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <h3 className="text-xl font-semibold text-purple-700 mb-4">Record-For-Me Feature</h3>
                  <p className="text-gray-700 mb-4">
                    The Record-For-Me feature allows you to capture your chord progressions as audio 
                    or text files that you can save and share.
                  </p>
                  
                  <div className="bg-gray-100 rounded-lg p-4 mb-6">
                    <h4 className="font-semibold text-purple-700 mb-2">Recording Controls</h4>
                    <div className="mb-3">
                      <Image 
                        src="/tutorialimg/recordstart.png" 
                        alt="Recording control buttons" 
                        width={480} 
                        height={120} 
                        className="rounded-lg"
                      />
                    </div>
                    <p className="text-sm text-gray-600 italic">
                      Recording controls let you start, stop, and manage your recordings
                    </p>
                  </div>
                  
                  <div className="bg-purple-50 p-4 rounded-lg border border-purple-100 mb-6">
                    <h4 className="font-semibold text-purple-700 mb-2">Recording Process:</h4>
                    <ol className="list-decimal pl-5 space-y-2 text-gray-700">
                      <li>
                        <span className="font-medium">Enable Camera:</span> Make sure your camera is enabled
                      </li>
                      <li>
                        <span className="font-medium">Start Recording:</span> Click the "Start Recording" button
                      </li>
                      <li>
                        <span className="font-medium">Play Chords:</span> Make fist gestures to play chords that will be recorded
                      </li>
                      <li>
                        <span className="font-medium">Stop Recording:</span> Click "Stop Recording" when finished
                      </li>
                      <li>
                        <span className="font-medium">Review & Download:</span> Listen to your recording and download it if desired
                      </li>
                    </ol>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-xl font-semibold text-purple-700 mb-4">Download Options</h3>
                  <p className="text-gray-700 mb-4">
                    After recording, you can download your creation in several formats.
                  </p>
                  
                  <div className="bg-purple-50 p-4 rounded-lg border border-purple-100 mb-2">
                    <h4 className="font-semibold text-purple-700 mb-2">Download Options</h4>
                    <p className="text-gray-700 mb-10">
                      Generate a PDF with musical notation of your chord progression, download the chords as a Text file, or download the audio file as a WAV file!
                    </p>
                    <div className="bg-gray-200 h-24 w-full rounded-lg flex items-center justify-center mb-6">
                    <Image 
                      src="/tutorialimg/downloadbutton.png" 
                      alt="Download Chord Sheet Button"
                      width={480} 
                      height={120} 
                      className="object-cover"
                    />
                    </div>
                    <p className="text-sm text-gray-600 italic">
                      Example of the downloading options
                    </p>
                  </div>
                  
                  <div className="bg-gray-100 rounded-lg p-4">
                    <h4 className="font-semibold text-purple-700 mb-8">Audio Player</h4>
                    <div className="bg-gray-200 h-20 w-full rounded-lg flex items-center justify-center mb-3">
                    <Image 
                      src="/tutorialimg/playback.png" 
                      alt="Audio Player Interface"
                      width={380} 
                      height={120} 
                      className="object-cover"
                    />
                    </div>
                    <p className="text-sm text-gray-600 mt-4 italic">
                      Preview your recording before downloading it
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>


        {/* Musical Examples Section */}
        <motion.div
          custom={7}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={sectionVariants}
          className="mb-12"
        >
          <Card className="bg-white shadow-md overflow-hidden">
            <CardHeader className="bg-purple-50 border-b border-purple-100">
              <h2 className="text-2xl font-bold text-purple-800">Example Chord Progressions</h2>
            </CardHeader>
            <CardContent className="p-6">
              <p className="text-gray-700 mb-6">
                Here are some example chord progressions you can try with different settings to get started.
                These examples show how the same chord pattern can sound different in various keys and with
                different rhythm patterns.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <h3 className="text-xl font-semibold text-purple-700 mb-4">Pop Examples</h3>
                  <div className="space-y-4">
                    <div className="bg-purple-50 p-4 rounded-lg border border-purple-100">
                      <h4 className="font-semibold text-purple-700 mb-2">Classic Pop Ballad</h4>
                      <div className="grid grid-cols-4 gap-1 mb-3">
                        {["C", "G", "Am", "F", "C", "G", "Am", "F"].map((chord, i) => (
                          <div key={i} className="p-2 bg-white rounded-md text-center text-purple-800 font-medium">
                            {chord}
                          </div>
                        ))}
                      </div>
                      <p className="text-sm text-gray-700">
                        <span className="font-medium">Settings:</span> C Major, Pop 8: I–V–vi–IV, Straight Eighths, 80 BPM
                      </p>
                    </div>
                  </div>
                
                  <h3 className="text-xl font-semibold text-purple-700 mt-6 mb-4">Rock Examples</h3>
                  <div className="space-y-4">
                    <div className="bg-purple-50 p-4 rounded-lg border border-purple-100">
                      <h4 className="font-semibold text-purple-700 mb-2">Classic Rock</h4>
                      <div className="grid grid-cols-4 gap-1 mb-3">
                        {["D", "C", "G", "D", "D", "C", "G", "D"].map((chord, i) => (
                          <div key={i} className="p-2 bg-white rounded-md text-center text-purple-800 font-medium">
                            {chord}
                          </div>
                        ))}
                      </div>
                      <p className="text-sm text-gray-700">
                        <span className="font-medium">Settings:</span> D Major, Rock 8: I–bVII–IV–I, Rock Eighths, 110 BPM
                      </p>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-xl font-semibold text-purple-700 mb-4">Jazz Examples</h3>
                  <div className="space-y-4">
                    <div className="bg-purple-50 p-4 rounded-lg border border-purple-100">
                      <h4 className="font-semibold text-purple-700 mb-2">Jazz Progression</h4>
                      <div className="grid grid-cols-4 gap-1 mb-3">
                        {["Dm7", "G7", "Cmaj7", "Am7", "Dm7", "G7", "Cmaj7", "Cmaj7"].map((chord, i) => (
                          <div key={i} className="p-2 bg-white rounded-md text-center text-purple-800 font-medium">
                            {chord}
                          </div>
                        ))}
                      </div>
                      <p className="text-sm text-gray-700">
                        <span className="font-medium">Settings:</span> C Major, Jazz ii–V–I Extended, Swing Eighths, 120 BPM
                      </p>
                    </div>
                  </div>
                
                  <h3 className="text-xl font-semibold text-purple-700 mt-6 mb-4">Blues & Funk Examples</h3>
                  <div className="space-y-4">
                    <div className="bg-purple-50 p-4 rounded-lg border border-purple-100">
                      <h4 className="font-semibold text-purple-700 mb-2">Blues Progression</h4>
                      <div className="grid grid-cols-4 gap-1 mb-3">
                        {["E7", "A7", "E7", "E7", "A7", "A7", "E7", "B7"].map((chord, i) => (
                          <div key={i} className="p-2 bg-white rounded-md text-center text-purple-800 font-medium">
                            {chord}
                          </div>
                        ))}
                      </div>
                      <p className="text-sm text-gray-700">
                        <span className="font-medium">Settings:</span> E Major, 12-Bar Blues Condensed, Shuffle Feel, 92 BPM
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Quick Reference Section */}
        <motion.div
          custom={8}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={sectionVariants}
          className="mb-16"
        >
          <Card className="bg-white shadow-md overflow-hidden">
            <CardHeader className="bg-purple-50 border-b border-purple-100">
              <h2 className="text-2xl font-bold text-purple-800">Quick Reference Guide</h2>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-purple-50 p-4 rounded-lg border border-purple-100">
                  <h3 className="text-lg font-semibold text-purple-700 mb-3">Setup Steps</h3>
                  <ol className="list-decimal pl-5 space-y-2 text-gray-700">
                    <li>Open the Play-For-Me page</li>
                    <li>Select your instrument (piano/guitar)</li>
                    <li>Set your desired tempo (BPM)</li>
                    <li>Select a musical key</li>
                    <li>Choose chord and rhythm patterns</li>
                    <li>Enable your camera</li>
                    <li>Make sure your hand is visible</li>
                  </ol>
                </div>
                
                <div className="bg-purple-50 p-4 rounded-lg border border-purple-100">
                  <h3 className="text-lg font-semibold text-purple-700 mb-3">Playing Steps</h3>
                  <ol className="list-decimal pl-5 space-y-2 text-gray-700">
                    <li>Position your hand over a chord cell</li>
                    <li>Make a closed fist gesture</li>
                    <li>The 8-chord pattern will play</li>
                    <li>Current chord will be highlighted</li>
                    <li>Wait for pattern to finish or try another cell</li>
                  </ol>
                </div>
                
                <div className="bg-purple-50 p-4 rounded-lg border border-purple-100">
                  <h3 className="text-lg font-semibold text-purple-700 mb-3">Recording Steps</h3>
                  <ol className="list-decimal pl-5 space-y-2 text-gray-700">
                    <li>Make sure your camera is enabled</li>
                    <li>Click "Start Recording"</li>
                    <li>Play chord progressions with gestures</li>
                    <li>Click "Stop Recording" when done</li>
                    <li>Review your recording</li>
                    <li>Download as WAV, TXT, or PDF</li>
                  </ol>
                </div>
              </div>
              
            </CardContent>
          </Card>
        </motion.div>

        {/* Footer & Navigation */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-8">
          <Link href="/">
            <Button
              variant="outline"
              className="border-purple-500 text-purple-500 hover:bg-purple-50"
            >
              ← Back to Home
            </Button>
          </Link>
          
          <div className="flex gap-4">
            <Link href="/play-for-me">
              <Button className="bg-purple-600 hover:bg-purple-700 text-white">
                Try Play For Me →
              </Button>
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  );
}