"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import Header from "@/components/ui/header";

// Animation variants
const pageVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

export default function ContactPage() {
  const [formState, setFormState] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });

  return (
    <main className="min-h-screen bg-gradient-to-b from-white to-teal-50">
      <Header />

      <motion.div
        className="container mx-auto px-4 py-12 max-w-5xl"
        initial="hidden"
        animate="visible"
        variants={pageVariants}
        transition={{ duration: 0.5 }}
      >
        <div className="text-center mb-12">
          <motion.h1 
            className="text-4xl font-bold text-teal-800 mb-4"
            variants={itemVariants}
            transition={{ duration: 0.6 }}
          >
            Contact Me
          </motion.h1>
          <motion.p 
            className="text-xl text-teal-600 max-w-2xl mx-auto"
            variants={itemVariants}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            If you have any ideas for future features, contact me via email!
          </motion.p>
        </div>

        <div className="grid grid-cols-1  gap-10">
          {/* Contact Information */}
          <motion.div 
            variants={itemVariants}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <Card className="h-full border-teal-100 shadow-md">
              <CardHeader>
                <h2 className="text-2xl font-semibold text-teal-700">Get in Touch</h2>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="flex items-center space-x-3">
                    <div className="bg-teal-100 p-2 rounded-full">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-teal-600" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                        <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="font-large text-teal-800">Email</h3>
                      <p className="text-teal-600">jota19269@gmail.com</p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <div className="bg-teal-100 p-2 rounded-full">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-teal-600" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="font-large text-teal-800">Address</h3>
                      <p className="text-teal-600">PLACEHOLDER<br />WHILE I WORK OUT WHAT TO DO WITH THIS PAGE</p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <div className="bg-teal-100 p-2 rounded-full">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-teal-600" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="font-large text-teal-800">Phone</h3>
                      <p className="text-teal-600">(123) 456-7890</p>
                    </div>
                  </div>

                </div>
              </CardContent>
            </Card>
          </motion.div>

      
        </div>
        
        {/* FAQ Section */}
        <motion.div
          className="mt-16"
          variants={itemVariants}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <h2 className="text-2xl font-bold text-teal-800 mb-6 text-center">Frequently Asked Questions</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              {
                question: "How can I get started with Motiononics?",
                answer: "Getting started is simple! Begin with the tutorials to learn the basic gestures, then explore our applications to create music through movement."
              },
              {
                question: "Do I need special hardware?",
                answer: "No special hardware is required. Motiononics works with your computer's webcam to detect and interpret your hand gestures."
              },
              {
                question: "Is Motiononics suitable for beginners?",
                answer: "Absolutely! Our platform is designed to be accessible to everyone, regardless of musical background or technical expertise."
              },
              {
                question: "Can I use Motiononics for live performances?",
                answer: "Yes, with enough practice! The system is responsive enough for real-time musical control on stage."
              },
            ].map((faq, index) => (
              <Card key={index} className="border-teal-100">
                <CardContent className="p-6">
                  <h3 className="text-lg font-semibold text-teal-700 mb-2">{faq.question}</h3>
                  <p className="text-teal-600">{faq.answer}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </motion.div>
      </motion.div>

      
    </main>
  );
}