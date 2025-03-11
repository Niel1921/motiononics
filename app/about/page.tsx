"use client";

import React from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import Header from "@/components/ui/header";

// Animation variants
const fadeIn = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-white to-teal-50">
      <Header />
      
      <div className="container mx-auto px-4 py-12 max-w-5xl">
        <motion.div 
          className="text-center mb-14"
          initial="hidden"
          animate="visible"
          variants={fadeIn}
          transition={{ duration: 0.5 }}
        >
          <h1 className="text-4xl font-bold text-teal-800 mb-4">About Motiononics</h1>
          <p className="text-xl text-teal-600 max-w-3xl mx-auto">
            Making expression accessible
          </p>
        </motion.div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mb-16">
          <motion.div 
            initial="hidden"
            animate="visible"
            variants={fadeIn}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <h2 className="text-2xl font-bold text-teal-700 mb-6">Why Motiononics?</h2>
            <div className="prose prose-teal max-w-none">
              <p>
                Motiononics is a gesture control platform to create and teach music! 
                With a wide range of options and instruments you can express your vision and creativity with only your webcam.
              </p>
              <p>
                With only your hand movements, you can create music in real-time. 
                Our platform is designed alongside Google MediaPipe to provide reliable gesture detection.
              </p>
            </div>
          </motion.div>
          
          <motion.div 
            className="relative rounded-xl overflow-hidden shadow-lg h-[300px] md:h-auto"
            initial="hidden"
            animate="visible"
            variants={fadeIn}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <Image 
              src="/images/about-hero.jpg" 
              alt="Person controlling music through gestures" 
              fill
              className="object-cover"
            />
          </motion.div>
        </div>
        
        <motion.h2 
          className="text-2xl font-bold text-teal-700 mb-8 text-center"
          initial="hidden"
          animate="visible"
          variants={fadeIn}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          How It Works
        </motion.h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-16">
          {[
            {
              title: "Gesture Recognition",
              description: "Advanced computer vision algorithms can detect and classify hand gestures in real-time, translating movements into music!"
            },
            {
              title: "Musical Mapping",
              description: "Each gesture is mapped to specific musical elements, allowing close control of notes, chords, rhythms, and effects."
            }
            
          ].map((item, index) => (
            <motion.div 
              key={index}
              initial="hidden"
              animate="visible"
              variants={fadeIn}
              transition={{ duration: 0.5, delay: 0.5 + (index * 0.1) }}
            >
              <Card className="h-full border-teal-100 shadow-md hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="text-4xl mb-4"></div>
                  <h3 className="text-xl font-semibold text-teal-700 mb-2">{item.title}</h3>
                  <p className="text-gray-600">{item.description}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
        
        <motion.div 
          className="bg-gradient-to-r from-teal-500 to-blue-500 rounded-xl p-8 text-white shadow-xl mb-16"
          initial="hidden"
          animate="visible"
          variants={fadeIn}
          transition={{ duration: 0.5, delay: 0.8 }}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            <div>
              <h2 className="text-2xl font-bold mb-4">Try it yourself</h2>
              <p className="mb-6">
                Try the interactive gesture tutorial and start learning how to make music youself!
              </p>
              <Link href="/tutorials/gesture-walkthrough">
                <Button className="bg-white text-teal-600 hover:bg-teal-50">
                  Start the Tutorial
                </Button>
              </Link>
            </div>
            <div className="hidden md:flex justify-center">
              <div className="relative h-40 w-40">
                <Image 
                  src="/gestureimg/fistlogo.png" 
                  alt="Hand gesture illustration" 
                  fill
                  className="object-contain"
                />
              </div>
            </div>
          </div>
        </motion.div>
        
        <motion.h2 
          className="text-2xl font-bold text-teal-700 mb-8 text-center"
          initial="hidden"
          animate="visible"
          variants={fadeIn}
          transition={{ duration: 0.5, delay: 0.9 }}
        >
          About the Developer
        </motion.h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          {[
            {
              name: "Owen Read",
              role: "Founder & Lead Developer",
              bio: "Computer vision specialist with a passion for making technology more intuitive and accessible.",
              image: "/images/team-1.jpg"
            },
            {
              name: "Alwyn George",
              role: "Music Director",
              bio: "Classically trained musician who bridges the gap between traditional music theory and digital innovation.",
              image: "/images/team-2.jpg"
            },
            {
              name: "Niel GOAT",
              role: "UX Designer",
              bio: "Creates seamless, intuitive interfaces that make complex technology feel natural and approachable.",
              image: "/images/team-3.jpg"
            }
          ].map((member, index) => (
            <motion.div 
              key={index}
              initial="hidden"
              animate="visible"
              variants={fadeIn}
              transition={{ duration: 0.5, delay: 1 + (index * 0.1) }}
              className="text-center"
            >
              <div className="w-32 h-32 rounded-full overflow-hidden mx-auto mb-4 bg-teal-100">
                {/* Uncomment when you have actual team photos */}
                {/* <Image 
                  src={member.image} 
                  alt={member.name} 
                  width={128}
                  height={128}
                  className="object-cover"
                /> */}
                <div className="w-full h-full flex items-center justify-center text-3xl">
                  {member.name.charAt(0)}
                </div>
              </div>
              <h3 className="text-lg font-semibold text-teal-700">{member.name}</h3>
              <p className="text-teal-600 text-sm mb-2">{member.role}</p>
              <p className="text-gray-600 text-sm">{member.bio}</p>
            </motion.div>
          ))}
        </div>
        
        <motion.div 
          className="text-center"
          initial="hidden"
          animate="visible"
          variants={fadeIn}
          transition={{ duration: 0.5, delay: 1.3 }}
        >
          <h2 className="text-2xl font-bold text-teal-700 mb-4">Connect With Us</h2>
          <p className="text-gray-600 mb-6">
            Have questions or feedback? We'd love to hear from you!
          </p>
          <div className="flex justify-center space-x-4">
            <Button variant="outline" className="border-teal-500 text-teal-500 hover:bg-teal-50">
              Contact Us
            </Button>
            <Link href="/">
              <Button className="bg-teal-500 hover:bg-teal-600 text-white">
                Back to Home
              </Button>
            </Link>
          </div>
        </motion.div>
      </div>
      
      <footer className="bg-teal-800 text-white py-8 mt-20">
        <div className="container mx-auto px-4 text-center">
          <p>© {new Date().getFullYear()} Motiononics. All rights reserved.</p>
          <div className="mt-4 space-x-6">
            <Link href="/terms" className="text-teal-200 hover:text-white">Terms</Link>
            <Link href="/privacy" className="text-teal-200 hover:text-white">Privacy</Link>
            <Link href="/about" className="text-teal-200 hover:text-white">About</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}