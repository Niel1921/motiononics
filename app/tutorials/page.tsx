"use client";

import React from "react";
import Link from "next/link";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import Header from "@/components/ui/header"; // Our custom header with logo

// Define animation variants for the cards.
const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (custom: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, delay: custom * 0.2 },
  }),
  hover: { scale: 1.0 },
};

export default function TutorialsPage() {
  return (
    <motion.div
      className="min-h-screen bg-teal-50 p-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      {/* Use our custom header at the top */}
      <Header />

      {/* Page Title */}
      <div className="mt-8 text-center">
        <h1 className="text-4xl font-bold text-teal-800">Tutorials</h1>
        <p className="mt-2 text-lg text-teal-700">
          Learn how to use our gesture‑based musical instrument platform with
          our engaging tutorials.
        </p>
      </div>

      {/* Tutorials Grid */}
      {/*
        * We set `auto-rows-[1fr]` on the grid so every row shares the height of
        * the tallest card in that row. Then we ensure each card stretches to
        * fill that space with `h-full` while preserving a tidy column layout
        * using Flexbox.
      */}
      <main className="grid grid-cols-1 gap-6 md:grid-cols-1 lg:grid-cols-2 mt-8 auto-rows-[1fr]">
        {[
          {
            title: "Introduction",
            description:
              "Discover the basics of Motiononics: what it is, how it works, and the technology behind our innovative instrument.",
            link: "/tutorials/gesture-walkthrough",
          },
          {
            title: "Learn the Instruments",
            description:
              "Follow our step‑by‑step guide to using gestures to play the Piano, Guitar, or Theremin!",
            link: "/tutorials/setup",
          },
          {
            title: "Chords and the circle of fifths",
            description:
              "Learn how to write songs with chords, and how the circle of fifths can help you!",
            link: "/tutorials/chord-modes",
          },
          {
            title: "Play for Me",
            description: "Learn how to use the Play-for-me page!",
            link: "/tutorials/play-for-me",
          },
        ].map((tutorial, index) => (
          <motion.div
            key={tutorial.title}
            custom={index}
            initial="hidden"
            animate="visible"
            variants={cardVariants}
            whileHover="hover"
            className="h-full"
          >
            {/* Ensure the card stretches to fill the grid cell */}
            <Card className="bg-white hover:shadow-xl transition-shadow flex flex-col h-full">
              <CardHeader>
                <h2 className="text-2xl font-semibold text-teal-800">
                  {tutorial.title}
                </h2>
              </CardHeader>
              {/* Flex‑grow content so the CTA sits at the bottom */}
              <CardContent className="flex-1 flex flex-col">
                <p className="text-teal-700 flex-1">{tutorial.description}</p>
                <Link href={tutorial.link} className="self-start">
                  <Button className="mt-4 bg-teal-500 hover:bg-teal-600 text-white">
                    Read More
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </main>

      {/* Supplemental video tutorials */}
      <motion.div
        custom={3}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        variants={cardVariants}
        className="mb-12 text-center"
      >
        <h2 className="text-2xl font-bold text-teal-800 m-4">
          Here are some other helpful Music tutorials!
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {[
            {
              title: "Learn more about the circle of fifths.",
              videoId: "Hh-gwatl2sc",
            },
            {
              title: "How do chord progressions work?",
              videoId: "rJSA0T848ns",
            },
          ].map((vid) => (
            <div
              key={vid.videoId}
              className="bg-white rounded-lg shadow-md overflow-hidden border border-purple-100 hover:shadow-lg hover:border-purple-300 transition-all"
            >
              <div className="aspect-video w-full">
                <iframe
                  className="w-full h-full"
                  src={`https://www.youtube.com/embed/${vid.videoId}`}
                  title={vid.title}
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                ></iframe>
              </div>
              <div className="p-4">
                <h3 className="font-semibold text-teal-700">{vid.title}</h3>
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Footer */}
      <footer className="mt-8 text-center">
        <Link href="/">
          <Button
            variant="outline"
            className="border border-teal-500 text-teal-500 hover:bg-teal-500 hover:text-white"
          >
            Back to Home
          </Button>
        </Link>
      </footer>
    </motion.div>
  );
}
