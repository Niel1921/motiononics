"use client";

import React from "react";
import Link from "next/link";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

export default function TutorialsPage() {
  return (
    <motion.div
      className="min-h-screen bg-teal-50 p-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      {/* Header */}
      <header className="mb-8 text-center">
        <h1 className="text-4xl font-bold text-teal-800">Motiononics Tutorials</h1>
        <p className="mt-2 text-lg text-teal-700">
          Learn how to use our gesture‑based musical instrument platform with our engaging tutorials.
        </p>
      </header>
      
      {/* Tutorials Grid */}
      <main className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="hover:shadow-xl transition-shadow bg-white">
          <CardHeader>
            <h2 className="text-2xl font-semibold text-teal-800">Introduction</h2>
          </CardHeader>
          <CardContent>
            <p className="text-teal-700">
              Discover the basics of Motiononics: what it is, how it works, and the technology behind our innovative instrument.
            </p>
            <Link href="/tutorials/introduction">
              <Button className="mt-4 bg-teal-500 hover:bg-teal-600 text-white">Read More</Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="hover:shadow-xl transition-shadow bg-white">
          <CardHeader>
            <h2 className="text-2xl font-semibold text-teal-800">Setup Your Environment</h2>
          </CardHeader>
          <CardContent>
            <p className="text-teal-700">
              Follow our step‑by‑step guide to setting up Next.js, Tailwind CSS, and our gesture recognition system.
            </p>
            <Link href="/tutorials/setup">
              <Button className="mt-4 bg-teal-500 hover:bg-teal-600 text-white">Read More</Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="hover:shadow-xl transition-shadow bg-white">
          <CardHeader>
            <h2 className="text-2xl font-semibold text-teal-800">Using Gesture Controls</h2>
          </CardHeader>
          <CardContent>
            <p className="text-teal-700">
              Learn how to use hand gestures to control musical notes, chords, and effects with Motiononics.
            </p>
            <Link href="/tutorials/gesture-controls">
              <Button className="mt-4 bg-teal-500 hover:bg-teal-600 text-white">Read More</Button>
            </Link>
          </CardContent>
        </Card>
      </main>

      {/* Footer */}
      <footer className="mt-8 text-center">
        <Link href="/">
          <Button variant="outline" className="border border-teal-500 text-teal-500 hover:bg-teal-500 hover:text-white">
            Back to Home
          </Button>
        </Link>
      </footer>
    </motion.div>
  );
}
