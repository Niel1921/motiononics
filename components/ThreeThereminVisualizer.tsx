"use client";

import React, { useRef, useEffect } from "react";
import * as THREE from "three";

export type ThreeThereminVisualizerProps = {
  frequency: number; // e.g., between 200 and 600 Hz
  volume: number;    // normalized between 0 and 1
  vibrato: number;   // vibrato rate in Hz (e.g., 0 to 10 Hz)
  waveform: string;  // "sine", "square", "sawtooth", "triangle", etc.
  onFrequencyChange?: (value: number) => void;
  onVolumeChange?: (value: number) => void;
  onVibratoChange?: (value: number) => void;
  onWaveformChange?: (value: string) => void;
};

export default function ThreeThereminVisualizer({
  frequency,
  volume,
  vibrato,
  waveform,
  onFrequencyChange,
  onWaveformChange,
}: ThreeThereminVisualizerProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const requestRef = useRef<number>(0);

  useEffect(() => {
    // Helper to generate waveform values
    const waveformFunc = (type: string, phase: number) => {
      switch (type) {
        case "sine":
          return Math.sin(phase);
        case "square":
          return Math.sign(Math.sin(phase));
        case "sawtooth":
          // normalized sawtooth from -1 to +1
          return 2 * (phase / (2 * Math.PI) - Math.floor(phase / (2 * Math.PI) + 0.5));
        case "triangle":
          // triangle via arcsin of sine
          return (2 / Math.PI) * Math.asin(Math.sin(phase));
        default:
          return 0;
      }
    };

    // Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x222222);

    const camera = new THREE.PerspectiveCamera(50, 640 / 360, 0.1, 1000);
    camera.position.set(0, 0, 30);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(640, 360);
    mountRef.current?.appendChild(renderer.domElement);

    // Sphere representing pitch
    const sphereGeometry = new THREE.SphereGeometry(3, 32, 32);
    let sphereColor: number;
    switch (waveform) {
      case "sine":
        sphereColor = 0x00ff00;
        break;
      case "square":
        sphereColor = 0xff0000;
        break;
      case "sawtooth":
        sphereColor = 0x0000ff;
        break;
      case "triangle":
        sphereColor = 0xff00ff;
        break;
      default:
        sphereColor = 0xffffff;
    }
    const sphereMaterial = new THREE.MeshStandardMaterial({ color: sphereColor });
    const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
    scene.add(sphere);

    // Line to visualize waveform
    const lineMaterial = new THREE.LineBasicMaterial({ color: 0xffff00 });
    const points: THREE.Vector3[] = [];
    // initial sampling of waveform over x∈[-10,10]
    for (let x = -10; x <= 10; x += 0.5) {
      const phase = ((x + 10) / 20) * 2 * Math.PI;
      points.push(new THREE.Vector3(x, waveformFunc(waveform, phase), 0));
    }
    const lineGeometry = new THREE.BufferGeometry().setFromPoints(points);
    const waveformLine = new THREE.Line(lineGeometry, lineMaterial);
    waveformLine.position.y = -10;
    scene.add(waveformLine);

    // Lighting
    scene.add(new THREE.AmbientLight(0xffffff, 0.8));
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(10, 10, 10);
    scene.add(directionalLight);

    // Animation
    let scrollPhase = 0;
    const animate = () => {
      requestRef.current = requestAnimationFrame(animate);

      // Map frequency to horizontal position
      const minFreq = 200;
      const maxFreq = 600;
      const xPos = ((frequency - minFreq) / (maxFreq - minFreq)) * 20 - 10;

      // Vibrato-based wobble
      const t = performance.now() * 0.005 * vibrato;
      const vibAmt = vibrato * 0.2;
      const vibratoX = Math.sin(t) * vibAmt;
      const vibratoY = Math.cos(t) * vibAmt * 0.5; // half amplitude vertically

      // Apply to sphere
      sphere.position.x = xPos + vibratoX;
      sphere.position.y = vibratoY;

      // Map volume to sphere scale
      const newScale = 0.5 + volume * 3;
      sphere.scale.set(newScale, newScale, newScale);

      // Speed up waveform scroll
      scrollPhase += vibrato * 0.005; // faster than before

      // Update waveform line
      const positions = (waveformLine.geometry as THREE.BufferGeometry)
        .attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < positions.count; i++) {
        const x = positions.getX(i);
        const phase = ((x + 10) / 20) * 2 * Math.PI + scrollPhase;
        positions.setY(i, waveformFunc(waveform, phase) * 2);
      }
      positions.needsUpdate = true;

      renderer.render(scene, camera);
    };
    animate();

    // Cleanup
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      if (mountRef.current) mountRef.current.removeChild(renderer.domElement);
      const gl = renderer.getContext();
      const ext = gl.getExtension("WEBGL_lose_context");
      if (ext) ext.loseContext();
      renderer.dispose();
    };
  }, [frequency, volume, vibrato, waveform]);

  // Helper for knob rotation
  const computeRotation = (value: number, min: number, max: number) =>
    ((value - min) / (max - min)) * 270 - 135;

  return (
    <div>
      <div ref={mountRef} />
      <div className="flex flex-row items-center justify-center mt-4 space-x-8">
        {/* Pitch Knob */}
        <div className="knob-container flex flex-col items-center">
          <div className="knob-display relative w-20 h-20">
            <div className="knob-background bg-gray-700 rounded-full border-4 border-gray-500 w-full h-full" />
            <div
              className="knob-marker absolute w-1 h-8 bg-white"
              style={{
                top: 4,
                left: "50%",
                transform: `translateX(-50%) rotate(${computeRotation(
                  frequency,
                  200,
                  600
                )}deg)`,
                transformOrigin: "50% 100%",
              }}
            />
          </div>
          <span className="mt-2">Pitch: {frequency.toFixed(0)} Hz</span>
        </div>
        {/* Volume Knob */}
        <div className="knob-container flex flex-col items-center">
          <div className="knob-display relative w-20 h-20">
            <div className="knob-background bg-gray-700 rounded-full border-4 border-gray-500 w-full h-full" />
            <div
              className="knob-marker absolute w-1 h-8 bg-white"
              style={{
                top: 4,
                left: "50%",
                transform: `translateX(-50%) rotate(${computeRotation(
                  volume,
                  0,
                  0.5
                )}deg)`,
                transformOrigin: "50% 100%",
              }}
            />
          </div>
          <span className="mt-2">Volume: {(volume * 180).toFixed(0)}%</span>
        </div>
        {/* Vibrato Knob */}
        <div className="knob-container flex flex-col items-center">
          <div className="knob-display relative w-20 h-20">
            <div className="knob-background bg-gray-700 rounded-full border-4 border-gray-500 w-full h-full" />
            <div
              className="knob-marker absolute w-1 h-8 bg-white"
              style={{
                top: 4,
                left: "50%",
                transform: `translateX(-50%) rotate(${computeRotation(
                  vibrato,
                  0,
                  10
                )}deg)`,
                transformOrigin: "50% 100%",
              }}
            />
          </div>
          <span className="mt-2">Vibrato: {vibrato.toFixed(1)} Hz</span>
        </div>
        {/* Waveform Dropdown */}
        <div className="flex flex-col items-center">
          <label className="mb-1 text-white">Waveform</label>
          <select
            value={waveform}
            onChange={(e) =>
              onWaveformChange && onWaveformChange(e.target.value)
            }
            className="w-32 p-1 rounded bg-gray-700 text-white"
          >
            <option value="sine">Sine</option>
            <option value="square">Square</option>
            <option value="sawtooth">Sawtooth</option>
            <option value="triangle">Triangle</option>
          </select>
        </div>
      </div>
      {/* Instructions */}
      <div className="mt-6 p-4 bg-gray-800 text-white rounded max-w-lg mx-auto">
        <h3 className="text-xl font-bold mb-2">How to Use</h3>
        <p>
          <strong>Right Hand:</strong> Controls <em>Pitch</em>. Move your right
          hand horizontally to change the tone.
        </p>
        <p>
          <strong>Left Hand (Y-axis):</strong> Controls <em>Volume</em>. Raise
          or lower your left hand to adjust loudness.
        </p>
        <p>
          <strong>Left Hand (Pinch Gesture):</strong> Controls <em>Vibrato
          Rate</em>. Pinch your left hand (thumb to index) to modify vibrato
          speed.
        </p>
        <p>
          <strong>Waveform:</strong> Use the dropdown to select the oscillator
          shape.
        </p>
      </div>
      <style jsx>{`
        .knob-container {
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        .knob-display {
          position: relative;
          width: 80px;
          height: 80px;
        }
        .knob-background {
          width: 100%;
          height: 100%;
          border-radius: 50%;
        }
        .knob-marker {
          transition: transform 0.2s ease-out;
        }
        .knob-input {
          -webkit-appearance: none;
          width: 100%;
          height: 100%;
          position: absolute;
          top: 0;
          left: 0;
          cursor: pointer;
        }
      `}</style>
    </div>
  );
}
