"use client";

import React, { useRef, useEffect, useImperativeHandle, forwardRef } from "react";
import * as THREE from "three";

export interface ThreeGuitarVisualizerHandle {
  /** Called by parent when user triggers a particular string (0..5). */
  triggerString: (stringIndex: number) => void;
}

interface ThreeGuitarVisualizerProps {
  currentChord: string | null;
}

/**
 * A forwardRef so the parent can call methods like .triggerString(index).
 */
const ThreeGuitarVisualizer = forwardRef<ThreeGuitarVisualizerHandle, ThreeGuitarVisualizerProps>(
  function ThreeGuitarVisualizer({ currentChord }, ref) {
    const mountRef = useRef<HTMLDivElement | null>(null);
    const requestRef = useRef<number>(0);

    // We'll store references to each string line so we can animate them
    const stringLinesRef = useRef<THREE.Line[]>([]);
    // For each string, track how long it's "vibrating"
    const vibrationTimers = useRef<number[]>([0, 0, 0, 0, 0, 0]);

    useImperativeHandle(ref, () => ({
      triggerString(stringIndex: number) {
        // Start or reset the vibration timer for that string
        vibrationTimers.current[stringIndex] = 0.3; // 0.3 seconds of vibration
      },
    }));

    useEffect(() => {
      // Scene, Camera, Renderer
      const scene = new THREE.Scene();
      const textureLoader = new THREE.TextureLoader();

      const camera = new THREE.PerspectiveCamera(70, 640 / 280, 0.1, 1000);
      camera.position.set(0, 4, 0);
      camera.lookAt(0, 0, 0);

      const renderer = new THREE.WebGLRenderer({ antialias: true });
      renderer.setSize(640, 280);
      renderer.shadowMap.enabled = true;
      mountRef.current?.appendChild(renderer.domElement);

      // Basic Lights
      scene.add(new THREE.AmbientLight(0xffffff, 0.7));
      const dirLight = new THREE.DirectionalLight(0xffffff, 0.7);
      dirLight.position.set(0, 10, 10);
      dirLight.castShadow = true;
      scene.add(dirLight);

      // Create a group for the guitar
      const guitarGroup = new THREE.Group();

      // Guitar body shape
      const guitarShape = new THREE.Shape();
      guitarShape.moveTo(0, -2.8);
      guitarShape.bezierCurveTo(-1.8, -2.8, -2.1, -1.2, -1.3, -0.8);
      guitarShape.bezierCurveTo(-1.0, -0.6, -1.0, 0.6, -1.3, 0.8);
      guitarShape.bezierCurveTo(-2.1, 1.2, -1.8, 2.8, 0, 2.8);
      guitarShape.bezierCurveTo(1.8, 2.8, 2.1, 1.2, 1.3, 0.8);
      guitarShape.bezierCurveTo(1.0, 0.6, 1.0, -0.6, 1.3, -0.8);
      guitarShape.bezierCurveTo(2.1, -1.2, 1.8, -2.8, 0, -2.8);
      guitarShape.closePath();

      const extrudeSettings: THREE.ExtrudeGeometryOptions = {
        depth: 1.3,
        bevelEnabled: false,
      };
      const guitarBodyGeo = new THREE.ExtrudeGeometry(guitarShape, extrudeSettings);

      const guitarTexture = textureLoader.load("/textures/guitarwood.jpg");
      guitarTexture.wrapS = THREE.RepeatWrapping;
      guitarTexture.wrapT = THREE.RepeatWrapping;
      guitarTexture.repeat.set(1, 1);

      const guitarBodyMat = new THREE.MeshPhongMaterial({ map: guitarTexture });
      const guitarBody = new THREE.Mesh(guitarBodyGeo, guitarBodyMat);
      guitarBody.rotation.x = -Math.PI / 2;
      guitarBody.castShadow = true;
      guitarBody.receiveShadow = true;
      guitarGroup.add(guitarBody);

      // Sound Hole
      const holeGeo = new THREE.CircleGeometry(0.5, 32);
      const holeMat = new THREE.MeshPhongMaterial({ color: 0x000000 });
      const holeMesh = new THREE.Mesh(holeGeo, holeMat);
      holeMesh.rotation.x = -Math.PI / 2;
      holeMesh.position.set(0, 1.31, -0.35);
      guitarGroup.add(holeMesh);

      // Bridge
      const bridgeGeo = new THREE.BoxGeometry(0.8, 0.08, 0.2);
      const bridgeMat = new THREE.MeshPhongMaterial({ color: 0x654321 });
      const bridgeMesh = new THREE.Mesh(bridgeGeo, bridgeMat);
      bridgeMesh.rotation.x = -Math.PI / 2;
      bridgeMesh.position.set(0, 1.31, 1.2);
      bridgeMesh.castShadow = true;
      guitarGroup.add(bridgeMesh);

      //Neck 
      const neckLength = 5;
    const neckGeo = new THREE.BoxGeometry(0.9, 0.04, neckLength);
    const neckMat = new THREE.MeshPhongMaterial({ color: 0x654321 });
    const neckMesh = new THREE.Mesh(neckGeo, neckMat);
    neckMesh.rotation.x = -Math.PI ;

    // The guitar’s top is y=1.3. Place neck slightly above (1.31).
    // Move it behind the guitar shape on z axis.
    neckMesh.position.set(0, 1.31, -4);
    neckMesh.castShadow = true;
    neckMesh.receiveShadow = true;
    guitarGroup.add(neckMesh);

      // Strings
      const numStrings = 6;
      const totalWidth = 0.7;
      const startX = -totalWidth / 2;
      for (let i = 0; i < numStrings; i++) {
        const x = startX + (i * totalWidth) / (numStrings - 1);
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array([
          x, 1.35, 1.2,   // near bridge
          x, 1.35, -5.0,  // up the neck
        ]);
        geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
        const material = new THREE.LineBasicMaterial({ color: 0xffffff });
        const line = new THREE.Line(geometry, material);
        guitarGroup.add(line);
        stringLinesRef.current.push(line);
      }

      // Table plane
      const tableTexture = textureLoader.load("/textures/table.jpg");
      const tableGeo = new THREE.PlaneGeometry(100, 100);
      const tableMat = new THREE.MeshPhongMaterial({ map: tableTexture });
      const tableMesh = new THREE.Mesh(tableGeo, tableMat);
      tableMesh.rotation.x = -Math.PI / 2;
      tableMesh.position.y = -0.25;
      tableMesh.receiveShadow = true;
      scene.add(tableMesh);

      // Rotate guitar group horizontally
      guitarGroup.rotation.y = Math.PI / 2;
      scene.add(guitarGroup);

      // Animation Loop
      let prevTime = performance.now();
      const animate = () => {
        requestRef.current = requestAnimationFrame(animate);
        const now = performance.now();
        const dt = (now - prevTime) / 1000;
        prevTime = now;

        // Update any active string vibrations
        stringLinesRef.current.forEach((line, i) => {
          const timer = vibrationTimers.current[i];
          if (timer > 0) {
            // Decrement timer
            vibrationTimers.current[i] = Math.max(0, timer - dt);

            // Let's do a simple sideways offset
            const amplitude = 0.01; // how wide the wave is
            const freq = 20;       // how fast it shakes
            const phase = (timer * freq) % (2 * Math.PI);

            // We can shift the x or y positions in the geometry
            const positions = (line.geometry as THREE.BufferGeometry).attributes.position;
            // Original positions: [x,1.35,1.2, x,1.35,-5.0]
            // We'll do a small offset in x for each point
            const x0 = positions.getX(0);
            const x1 = positions.getX(1);

            const offset = amplitude * Math.sin(phase);
            positions.setX(0, x0 + offset);
            positions.setX(1, x1 + offset);
            positions.needsUpdate = true;
          }
        });

        renderer.render(scene, camera);
      };
      animate();

      // Cleanup
      return () => {
        if (requestRef.current) cancelAnimationFrame(requestRef.current);
        mountRef.current?.removeChild(renderer.domElement);
        renderer.dispose();
      };
    }, []);

    return <div ref={mountRef} />;
  }
);

export default ThreeGuitarVisualizer;
