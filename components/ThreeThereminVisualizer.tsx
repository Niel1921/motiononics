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
  onVolumeChange,
  onVibratoChange,
  onWaveformChange,
}: ThreeThereminVisualizerProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const requestRef = useRef<number>(0);

  useEffect(() => {
    // Set up scene, camera, and renderer.
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x222222);

    const camera = new THREE.PerspectiveCamera(50, 640 / 360, 0.1, 1000);
    camera.position.set(0, 0, 30);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(640, 360);
    mountRef.current?.appendChild(renderer.domElement);

    // Create a sphere to represent theremin pitch.
    const sphereGeometry = new THREE.SphereGeometry(3, 32, 32);
    let sphereColor: number;
    // Set color based on waveform.
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

    // Create a line geometry to visualize vibrato modulations.
    const lineMaterial = new THREE.LineBasicMaterial({ color: 0xffff00 });
    const points: THREE.Vector3[] = [];
    for (let x = -10; x <= 10; x += 0.5) {
      points.push(new THREE.Vector3(x, Math.sin(x), 0));
    }
    const lineGeometry = new THREE.BufferGeometry().setFromPoints(points);
    const vibratoLine = new THREE.Line(lineGeometry, lineMaterial);
    vibratoLine.position.y = -10;
    scene.add(vibratoLine);

    // Add lighting.
    scene.add(new THREE.AmbientLight(0xffffff, 0.8));
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(10, 10, 10);
    scene.add(directionalLight);

    // Animation loop.
    const animate = () => {
      requestRef.current = requestAnimationFrame(animate);

      // Map frequency to horizontal position.
      const minFreq = 200;
      const maxFreq = 600;
      const xPos = ((frequency - minFreq) / (maxFreq - minFreq)) * 20 - 10;
      // Apply vibrato modulation.
      const vibratoEffect = Math.sin(performance.now() * 0.005 * vibrato) * (vibrato * 0.2);
      sphere.position.x = xPos + vibratoEffect;

      // Map volume (0 to 1) to sphere scale.
      const newScale = 0.5 + volume * 1.5;
      sphere.scale.set(newScale, newScale, newScale);

      // Update vibrato line by modulating its y values.
      const positions = (vibratoLine.geometry as THREE.BufferGeometry).attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < positions.count; i++) {
        const x = positions.getX(i);
        positions.setY(i, Math.sin(x * 2 + performance.now() * 0.005 * vibrato) * 2);
      }
      positions.needsUpdate = true;

      renderer.render(scene, camera);
    };
    animate();

    // Clean up.
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      if (mountRef.current) {
        mountRef.current.removeChild(renderer.domElement);
      }
      const gl = renderer.getContext();
      const ext = gl.getExtension("WEBGL_lose_context");
      if (ext) {
        ext.loseContext();
      }
      renderer.dispose();
    };
  }, [frequency, volume, vibrato, waveform]);

  // Helper to compute the rotation (in degrees) for a knob marker.
  // Maps the control's value from its min to max into an angle range (-135deg to +135deg).
  const computeRotation = (value: number, min: number, max: number) =>
    ((value - min) / (max - min)) * 270 - 135;

  return (
    <div>
      <div ref={mountRef} />
      {/* Knob-styled controls for theremin parameters aligned in a row */}
      <div className="flex flex-row items-center justify-center mt-4 space-x-8">
        {/* Pitch Knob */}
        <div className="knob-container flex flex-col items-center">
          <div className="knob-display relative w-20 h-20">
            {/* Static background dial */}
            <div className="knob-background bg-gray-700 rounded-full border-4 border-gray-500 w-full h-full" />
            {/* Rotating marker */}
            <div
              className="knob-marker absolute w-1 h-8 bg-white"
              style={{
                top: 4,
                left: "50%",
                transform: `translateX(-50%) rotate(${computeRotation(frequency, 200, 600)}deg)`,
                transformOrigin: "50% 100%"
              }}
            />
            {/* Invisible input to capture events */}
            <input
              type="range"
              min="200"
              max="600"
              step="1"
              value={frequency}
              onChange={(e) => onFrequencyChange && onFrequencyChange(Number(e.target.value))}
              className="knob-input absolute inset-0 opacity-0 cursor-pointer"
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
                transform: `translateX(-50%) rotate(${computeRotation(volume, 0, 1)}deg)`,
                transformOrigin: "50% 100%"
              }}
            />
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={volume}
              onChange={(e) => onVolumeChange && onVolumeChange(Number(e.target.value))}
              className="knob-input absolute inset-0 opacity-0 cursor-pointer"
            />
          </div>
          <span className="mt-2">Volume: {(volume * 100).toFixed(0)}%</span>
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
                transform: `translateX(-50%) rotate(${computeRotation(vibrato, 0, 10)}deg)`,
                transformOrigin: "50% 100%"
              }}
            />
            <input
              type="range"
              min="0"
              max="10"
              step="0.1"
              value={vibrato}
              onChange={(e) => onVibratoChange && onVibratoChange(Number(e.target.value))}
              className="knob-input absolute inset-0 opacity-0 cursor-pointer"
            />
          </div>
          <span className="mt-2">Vibrato: {vibrato.toFixed(1)} Hz</span>
        </div>
        {/* Waveform Control (Dropdown) */}
        <div className="flex flex-col items-center">
          <label className="mb-1 text-white">Waveform</label>
          <select
            value={waveform}
            onChange={(e) => onWaveformChange && onWaveformChange(e.target.value)}
            className="w-32 p-1 rounded bg-gray-700 text-white"
          >
            <option value="sine">Sine</option>
            <option value="square">Square</option>
            <option value="sawtooth">Sawtooth</option>
            <option value="triangle">Triangle</option>
          </select>
        </div>
      </div>
      {/* How to Use Graphic */}
      <div className="mt-6 p-4 bg-gray-800 text-white rounded max-w-lg mx-auto">
        <h3 className="text-xl font-bold mb-2">How to Use</h3>
        <p>
          <strong>Left Hand:</strong> Controls <em>Pitch</em>. Move your left hand horizontally to change the tone.
        </p>
        <p>
          <strong>Right Hand (Y-axis):</strong> Controls <em>Volume</em>. Raise or lower your right hand to adjust loudness.
        </p>
        <p>
          <strong>Right Hand (Pinch Gesture):</strong> Controls <em>Vibrato Rate</em>. Pinch your right hand (thumb to index) to modify vibrato speed.
        </p>
        <p>
          <strong>Waveform:</strong> Use the dropdown to select the oscillator shape.
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
