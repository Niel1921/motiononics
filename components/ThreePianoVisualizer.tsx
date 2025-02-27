"use client";

import React, { useRef, useEffect } from "react";
import * as THREE from "three";

export type ThreePianoVisualizerProps = {
  currentNote: number | null;
};

export default function ThreePianoVisualizer({ currentNote }: ThreePianoVisualizerProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  // Separate arrays for white and black key meshes.
  const whiteKeysRef = useRef<THREE.Mesh[]>([]);
  const blackKeysRef = useRef<THREE.Mesh[]>([]);
  const requestRef = useRef<number>(0);

  // Standard piano key parameters.
  const gap = 0.1; // gap between white keys
  const whiteKeyWidth = 3.8;
  const whiteKeyDepth = 10.8;
  const whiteKeyHeight = 1.4;
  const blackKeyWidth = whiteKeyWidth * 0.6;
  const blackKeyDepth = whiteKeyDepth * 0.6;
  const blackKeyHeight = whiteKeyHeight * 1.8;

  // White key order for one octave.
  const whiteKeyNotes = ["C", "D", "E", "F", "G", "A", "B"];

  useEffect(() => {
    // Set up scene, camera, and renderer.
    const scene = new THREE.Scene();

    // --- Load Background Texture ---
    const textureLoader = new THREE.TextureLoader();
    textureLoader.load("/textures/tablebg.jpg", (texture) => {
      scene.background = texture;
    });

    const camera = new THREE.PerspectiveCamera(50, 640 / 200, 0.1, 1000);
    camera.position.set(0, 8, 12);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(640, 280);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    mountRef.current?.appendChild(renderer.domElement);

    // ----- Create White Keys -----
    const numWhite = whiteKeyNotes.length; // 7 keys per octave.
    const totalWhiteWidth = numWhite * whiteKeyWidth + (numWhite - 1) * gap;
    const whiteStartX = -totalWhiteWidth / 2 + whiteKeyWidth / 2;
    const whiteKeys: THREE.Mesh[] = [];
    for (let i = 0; i < numWhite; i++) {
      const geometry = new THREE.BoxGeometry(whiteKeyWidth, whiteKeyHeight, whiteKeyDepth);
      const material = new THREE.MeshPhongMaterial({ color: 0xffffff });
      const keyMesh = new THREE.Mesh(geometry, material);
      keyMesh.position.x = whiteStartX + i * (whiteKeyWidth + gap);
      // Position keys so they rest on the table (table top will be at y = 0).
      keyMesh.position.y = 0;
      keyMesh.position.z = 0;
      keyMesh.castShadow = true;
      keyMesh.receiveShadow = true;
      scene.add(keyMesh);
      whiteKeys.push(keyMesh);
    }
    whiteKeysRef.current = whiteKeys;

    // ----- Create Black Keys -----
    const blackPositions = [
      { between: [0, 1] }, // C#
      { between: [1, 2] }, // D#
      { between: [3, 4] }, // F#
      { between: [4, 5] }, // G#
      { between: [5, 6] }, // A#
    ];
    const blackKeys: THREE.Mesh[] = [];
    for (let i = 0; i < blackPositions.length; i++) {
      const { between } = blackPositions[i];
      const posX = (whiteKeys[between[0]].position.x + whiteKeys[between[1]].position.x) / 2;
      const geometry = new THREE.BoxGeometry(blackKeyWidth, blackKeyHeight, blackKeyDepth);
      const material = new THREE.MeshPhongMaterial({ color: 0x000000 });
      const keyMesh = new THREE.Mesh(geometry, material);
      keyMesh.position.x = posX;
      keyMesh.position.y = whiteKeyHeight * 0.3;
      keyMesh.position.z = -0.3;
      keyMesh.castShadow = true;
      keyMesh.receiveShadow = true;
      scene.add(keyMesh);
      blackKeys.push(keyMesh);
    }
    blackKeysRef.current = blackKeys;

    // ----- Add Lighting -----
    scene.add(new THREE.AmbientLight(0xffffff, 1));
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(0, 8, 10);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 1024;
    directionalLight.shadow.mapSize.height = 1024;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 500;
    scene.add(directionalLight);

    // ----- Add Table (Piano Surface) -----
    // Use the white keys' total width to determine the table dimensions.
    const tableWidth = totalWhiteWidth + 2; // extra margin
    const tableDepth = whiteKeyDepth + 2;   // extra margin
    const tableHeight = 0.2; // table thickness
    const tableGeometry = new THREE.BoxGeometry(tableWidth, tableHeight, tableDepth);
    // Create a material using the table texture.
    textureLoader.load("/textures/table.jpg", (texture) => {
      const tableMaterial = new THREE.MeshPhongMaterial({ map: texture });
      const tableMesh = new THREE.Mesh(tableGeometry, tableMaterial);
      // Position the table so that its top surface is at y = 0.
      tableMesh.position.y = -tableHeight / 2;
      tableMesh.receiveShadow = true;
      scene.add(tableMesh);
    });

    // ----- Optional: Add a ground plane if desired -----
    const planeGeo = new THREE.PlaneGeometry(200, 200);
    const planeMat = new THREE.MeshPhongMaterial({ color: 0x999999, depthWrite: false });
    const ground = new THREE.Mesh(planeGeo, planeMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -tableHeight - 0.01;
    ground.receiveShadow = true;
    scene.add(ground);

    // ----- Animation Loop -----
    const animate = () => {
      requestRef.current = requestAnimationFrame(animate);
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      mountRef.current?.removeChild(renderer.domElement);
      renderer.dispose();
    };
  }, []);

  // ----- Key Press Animation -----
  // White keys (semitones): 0, 2, 4, 5, 7, 9, 11; Black keys: 1, 3, 6, 8, 10.
  const isWhite = (semitone: number) =>
    [0, 2, 4, 5, 7, 9, 11].includes(semitone);
  const whiteMapping: Record<number, number> = { 0: 0, 2: 1, 4: 2, 5: 3, 7: 4, 9: 5, 11: 6 };
  const blackMapping: Record<number, number> = { 1: 0, 3: 1, 6: 2, 8: 3, 10: 4 };

  useEffect(() => {
    if (currentNote === null) return;
    if (isWhite(currentNote)) {
      const whiteIndex = whiteMapping[currentNote];
      const key = whiteKeysRef.current[whiteIndex];
      if (!key) return;
      animateKeyPress(key, 0.4);
    } else {
      const blackIndex = blackMapping[currentNote];
      const key = blackKeysRef.current[blackIndex];
      if (!key) return;
      animateKeyPress(key, 0.2);
    }
  }, [currentNote]);

  // Helper: animate a key press.
  function animateKeyPress(key: THREE.Mesh, delta: number) {
    const originalY = key.position.y;
    const targetY = originalY - delta;
    const duration = 200; // ms
    const startTime = performance.now();

    const animateKey = () => {
      const elapsed = performance.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      if (progress < 0.5) {
        key.position.y = originalY - (originalY - targetY) * (progress * 2);
      } else {
        key.position.y = targetY + (originalY - targetY) * ((progress - 0.5) * 2);
      }
      if (progress < 1) {
        requestAnimationFrame(animateKey);
      } else {
        key.position.y = originalY;
      }
    };
    animateKey();
  }

  return <div ref={mountRef} />;
}
