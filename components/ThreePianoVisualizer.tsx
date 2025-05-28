// components/ThreePianoVisualizer.tsx
"use client";

import React, { useRef, useEffect, useMemo } from "react";
import * as THREE from "three";

export type ThreePianoVisualizerProps = {
  currentNotes: number[];
  availableSemitones: number[];
};

export default function ThreePianoVisualizer({
  currentNotes,
  availableSemitones,
}: ThreePianoVisualizerProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const whiteKeysRef = useRef<THREE.Mesh[]>([]);
  const blackKeysRef = useRef<THREE.Mesh[]>([]);
  const requestRef = useRef<number | null>(null);

  // Key dimensions
  const gap = 0.1;
  const whiteKeyWidth = 3.8;
  const whiteKeyDepth = 10.8;
  const whiteKeyHeight = 1.4;
  const blackKeyWidth = whiteKeyWidth * 0.6;
  const blackKeyDepth = whiteKeyDepth * 0.6;
  const blackKeyHeight = whiteKeyHeight * 1.8;

  // Mappings from semitone to key index
  const isWhite = (note: number) => [0, 2, 4, 5, 7, 9, 11].includes(note);
  const whiteMapping: Record<number, number> = {
    0: 0,
    2: 1,
    4: 2,
    5: 3,
    7: 4,
    9: 5,
    11: 6,
  };
  const blackMapping: Record<number, number> = {
    1: 0,
    3: 1,
    6: 2,
    8: 3,
    10: 4,
  };

  // Build the scene
  useEffect(() => {
    const scene = new THREE.Scene();
    const textureLoader = new THREE.TextureLoader();
    textureLoader.load("/textures/tablebg.jpg", (tex) => {
      scene.background = tex;
    });

    const camera = new THREE.PerspectiveCamera(50, 640 / 200, 0.1, 1000);
    camera.position.set(0, 8, 12);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(640, 280);
    renderer.shadowMap.enabled = true;
    mountRef.current!.appendChild(renderer.domElement);

    // Create white keys
    const numWhite = 7;
    const totalWhiteWidth = numWhite * whiteKeyWidth + (numWhite - 1) * gap;
    const whiteStartX = -totalWhiteWidth / 2 + whiteKeyWidth / 2;
    const whiteKeys: THREE.Mesh[] = [];
    for (let i = 0; i < numWhite; i++) {
      const geom = new THREE.BoxGeometry(
        whiteKeyWidth,
        whiteKeyHeight,
        whiteKeyDepth
      );
      const mat = new THREE.MeshPhongMaterial({
        color: 0xffffff,
        emissive: 0x444444,
      });
      const mesh = new THREE.Mesh(geom, mat);
      mesh.position.set(whiteStartX + i * (whiteKeyWidth + gap), 0, 0);
      scene.add(mesh);
      whiteKeys.push(mesh);
    }
    whiteKeysRef.current = whiteKeys;

    // Create black keys
    const blackPositions = [
      { between: [0, 1] },
      { between: [1, 2] },
      { between: [3, 4] },
      { between: [4, 5] },
      { between: [5, 6] },
    ];
    const blackKeys: THREE.Mesh[] = [];
    blackPositions.forEach(({ between }) => {
      const x =
        (whiteKeys[between[0]].position.x +
          whiteKeys[between[1]].position.x) /
        2;
      const geom = new THREE.BoxGeometry(
        blackKeyWidth,
        blackKeyHeight,
        blackKeyDepth
      );
      const mat = new THREE.MeshPhongMaterial({
        color: 0x000000,
        emissive: 0x222222,
      });
      const mesh = new THREE.Mesh(geom, mat);
      mesh.position.set(x, whiteKeyHeight * 0.3, -0.3);
      scene.add(mesh);
      blackKeys.push(mesh);
    });
    blackKeysRef.current = blackKeys;

    // Lighting
    scene.add(new THREE.AmbientLight(0xffffff, 1));
    const dir = new THREE.DirectionalLight(0xffffff, 1);
    dir.position.set(0, 8, 10);
    dir.castShadow = true;
    dir.shadow.mapSize.set(1024, 1024);
    scene.add(dir);

    // Table surface/texture
    textureLoader.load("/textures/table.jpg", (tex) => {
      const geom = new THREE.BoxGeometry(
        totalWhiteWidth + 2,
        0.2,
        whiteKeyDepth + 2
      );
      const mat = new THREE.MeshPhongMaterial({ map: tex });
      const tbl = new THREE.Mesh(geom, mat);
      tbl.position.y = -0.1;
      tbl.receiveShadow = true;
      scene.add(tbl);
    });

    const animate = () => {
      requestRef.current = requestAnimationFrame(animate);
      renderer.render(scene, camera);
    };
    animate();

    // Unmount cleanup

    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      if (mountRef.current?.contains(renderer.domElement)) {
        mountRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
    
  }, []);

  // Make a Memo of the available semitones
  const availableSet = useMemo(
    () => new Set(availableSemitones),
    [availableSemitones]
  );

  // Recolor keys whenever key signature changes
  useEffect(() => {
    // White keys (Red when not available)
    for (const [stStr, idx] of Object.entries(whiteMapping)) {
      const semitone = Number(stStr);
      const mesh = whiteKeysRef.current[idx];
      const mat = mesh.material as THREE.MeshPhongMaterial;
      if (availableSet.has(semitone)) {
        mat.color.setHex(0xffffff);
        mat.emissive.setHex(0x444444);
      } else {
        mat.color.setHex(0x888888);
        mat.emissive.setHex(0xF33C40);
      }
    }

    // Black keys (Dark when not available)
    for (const [stStr, idx] of Object.entries(blackMapping)) {
      const semitone = Number(stStr);
      const mesh = blackKeysRef.current[idx];
      const mat = mesh.material as THREE.MeshPhongMaterial;
      if (availableSet.has(semitone)) {
        mat.color.setHex(0x000000);
        mat.emissive.setHex(0x000000);
      } else {
        mat.color.setHex(0x333333);
        mat.emissive.setHex(0x5E0305);
      }
    }
  }, [availableSet]);

  // Animate key presses
  useEffect(() => {
    currentNotes.forEach((note) => {
      const isW = isWhite(note);
      const mesh = isW
        ? whiteKeysRef.current[whiteMapping[note]]
        : blackKeysRef.current[blackMapping[note]];
      if (!mesh) return;
      const originalY = mesh.position.y;
      const delta = isW ? 0.4 : 0.2;
      const duration = 200;
      const start = performance.now();
      const press = () => {
        const t = performance.now() - start;
        const p = Math.min(t / duration, 1);
        mesh.position.y = originalY - delta * Math.sin(Math.PI * p);
        if (p < 1) requestAnimationFrame(press);
        else mesh.position.y = originalY;
      };
      press();
    });
  }, [currentNotes]);

  return <div ref={mountRef} />;
}
