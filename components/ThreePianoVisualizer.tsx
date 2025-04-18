"use client";

import React, { useRef, useEffect } from "react";
import * as THREE from "three";

export type ThreePianoVisualizerProps = {
  currentNotes: number[];
};

export default function ThreePianoVisualizer({ currentNotes }: ThreePianoVisualizerProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const whiteKeysRef = useRef<THREE.Mesh[]>([]);
  const blackKeysRef = useRef<THREE.Mesh[]>([]);
  const requestRef = useRef<number>(0);

  const gap = 0.1;
  const whiteKeyWidth = 3.8;
  const whiteKeyDepth = 10.8;
  const whiteKeyHeight = 1.4;
  const blackKeyWidth = whiteKeyWidth * 0.6;
  const blackKeyDepth = whiteKeyDepth * 0.6;
  const blackKeyHeight = whiteKeyHeight * 1.8;

  const whiteKeyNotes = ["C", "D", "E", "F", "G", "A", "B"];

  useEffect(() => {
    const scene = new THREE.Scene();

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
    mountRef.current?.appendChild(renderer.domElement);

    const numWhite = whiteKeyNotes.length;
    const totalWhiteWidth = numWhite * whiteKeyWidth + (numWhite - 1) * gap;
    const whiteStartX = -totalWhiteWidth / 2 + whiteKeyWidth / 2;
    const whiteKeys: THREE.Mesh[] = [];
    for (let i = 0; i < numWhite; i++) {
      const geometry = new THREE.BoxGeometry(whiteKeyWidth, whiteKeyHeight, whiteKeyDepth);
      const material = new THREE.MeshPhongMaterial({ color: 0xffffff });
      const keyMesh = new THREE.Mesh(geometry, material);
      keyMesh.position.set(whiteStartX + i * (whiteKeyWidth + gap), 0, 0);
      scene.add(keyMesh);
      whiteKeys.push(keyMesh);
    }
    whiteKeysRef.current = whiteKeys;

    const blackPositions = [{ between: [0, 1] }, { between: [1, 2] }, { between: [3, 4] }, { between: [4, 5] }, { between: [5, 6] }];
    const blackKeys: THREE.Mesh[] = [];
    blackPositions.forEach(({ between }) => {
      const posX = (whiteKeys[between[0]].position.x + whiteKeys[between[1]].position.x) / 2;
      const geometry = new THREE.BoxGeometry(blackKeyWidth, blackKeyHeight, blackKeyDepth);
      const material = new THREE.MeshPhongMaterial({ color: 0x000000 });
      const keyMesh = new THREE.Mesh(geometry, material);
      keyMesh.position.set(posX, whiteKeyHeight * 0.3, -0.3);
      scene.add(keyMesh);
      blackKeys.push(keyMesh);
    });
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

  const isWhite = (note: number) => [0, 2, 4, 5, 7, 9, 11].includes(note);
  const whiteMapping: Record<number, number> = { 0: 0, 2: 1, 4: 2, 5: 3, 7: 4, 9: 5, 11: 6 };
  const blackMapping: Record<number, number> = { 1: 0, 3: 1, 6: 2, 8: 3, 10: 4 };

  useEffect(() => {
    currentNotes.forEach((note) => {
      const key = isWhite(note) ? whiteKeysRef.current[whiteMapping[note]] : blackKeysRef.current[blackMapping[note]];
      if (key) animateKeyPress(key, isWhite(note) ? 0.4 : 0.2);
    });
  }, [currentNotes]);

  function animateKeyPress(key: THREE.Mesh, delta: number) {
    const originalY = key.position.y;
    const duration = 200;
    const startTime = performance.now();

    const animate = () => {
      const elapsed = performance.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      key.position.y = originalY - delta * Math.sin(Math.PI * progress);
      if (progress < 1) requestAnimationFrame(animate);
      else key.position.y = originalY;
    };
    animate();
  }

  return <div ref={mountRef} />;
}
