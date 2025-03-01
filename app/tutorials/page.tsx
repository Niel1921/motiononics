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
  hover: { scale: 1.05 },
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
        <h1 className="text-4xl font-bold text-teal-800">
            Tutorials
        </h1>
        <p className="mt-2 text-lg text-teal-700">
          Learn how to use our gesture‑based musical instrument platform with our engaging tutorials.
        </p>
      </div>

      {/* Tutorials Grid */}
      <main className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 mt-8">
        {[
          {
            title: "Introduction",
            description:
              "Discover the basics of Motiononics: what it is, how it works, and the technology behind our innovative instrument.",
            link: "/tutorials/introduction",
          },
          {
            title: "Setup Your Environment",
            description:
              "Follow our step‑by‑step guide to setting up Next.js, Tailwind CSS, and our gesture recognition system.",
            link: "/tutorials/setup",
          },
          {
            title: "Using Gesture Controls",
            description:
              "Learn how to use hand gestures to control musical notes, chords, and effects with Motiononics.",
            link: "/tutorials/gesture-controls",
          },
        ].map((tutorial, index) => (
          <motion.div
            key={tutorial.title}
            custom={index}
            initial="hidden"
            animate="visible"
            variants={cardVariants}
            whileHover="hover"
          >
            <Card className="bg-white hover:shadow-xl transition-shadow">
              <CardHeader>
                <h2 className="text-2xl font-semibold text-teal-800">
                  {tutorial.title}
                </h2>
              </CardHeader>
              <CardContent>
                <p className="text-teal-700">{tutorial.description}</p>
                <Link href={tutorial.link}>
                  <Button className="mt-4 bg-teal-500 hover:bg-teal-600 text-white">
                    Read More
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </main>

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
