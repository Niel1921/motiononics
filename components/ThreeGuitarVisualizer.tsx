"use client";

import React, { useRef, useEffect } from "react";
import * as THREE from "three";

interface ThreeGuitarVisualizerProps {
  /** The chord name currently being played, e.g. "Cmaj" or "Amin". */
  currentChord: string | null;
}

export default function ThreeGuitarVisualizer({ currentChord }: ThreeGuitarVisualizerProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const requestRef = useRef<number>(0);

  useEffect(() => {
    // Create Scene, Camera, and Renderer
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

    // Create a group to hold all guitar parts
    const guitarGroup = new THREE.Group();

    // --------------------------------------------------
    // 1) Guitar Body Shape + Extrude
    // --------------------------------------------------
    const guitarShape = new THREE.Shape();
    // Roughly outline an acoustic guitar top from bottom center
    guitarShape.moveTo(0, -2.8);
    // Left half
    guitarShape.bezierCurveTo(-1.8, -2.8, -2.1, -1.2, -1.3, -0.8);
    guitarShape.bezierCurveTo(-1.0, -0.6, -1.0, 0.6, -1.3, 0.8);
    guitarShape.bezierCurveTo(-2.1, 1.2, -1.8, 2.8, 0, 2.8);
    // Right half (mirror)
    guitarShape.bezierCurveTo(1.8, 2.8, 2.1, 1.2, 1.3, 0.8);
    guitarShape.bezierCurveTo(1.0, 0.6, 1.0, -0.6, 1.3, -0.8);
    guitarShape.bezierCurveTo(2.1, -1.2, 1.8, -2.8, 0, -2.8);
    guitarShape.closePath();

    // Extrude settings for thickness
    const extrudeSettings: THREE.ExtrudeGeometryOptions = {
      depth: 1.3,
      bevelEnabled: false,
    };
    const guitarBodyGeo = new THREE.ExtrudeGeometry(guitarShape, extrudeSettings);

    // Load the wood texture from "guitarwood.jpeg"
    const guitarTexture = textureLoader.load("/textures/guitarwood.jpg");
    guitarTexture.wrapS = THREE.RepeatWrapping;
    guitarTexture.wrapT = THREE.RepeatWrapping;
    guitarTexture.repeat.set(1, 1);

    const guitarBodyMat = new THREE.MeshPhongMaterial({ map: guitarTexture });
    const guitarBody = new THREE.Mesh(guitarBodyGeo, guitarBodyMat);
    // Rotate so that the extruded dimension becomes vertical
    guitarBody.rotation.x = -Math.PI / 2;
    guitarBody.castShadow = true;
    guitarBody.receiveShadow = true;
    guitarGroup.add(guitarBody);

    // --------------------------------------------------
    // 2) Sound Hole
    // --------------------------------------------------
    const holeRadius = 0.5;
    const holeGeo = new THREE.CircleGeometry(holeRadius, 32);
    const holeMat = new THREE.MeshPhongMaterial({ color: 0x000000 });
    const holeMesh = new THREE.Mesh(holeGeo, holeMat);
    holeMesh.rotation.x = -Math.PI / 2;

    // Position the hole slightly above the top surface
    // The top of the guitar is at ~ y=1.3 after extrusion,
    // so place hole at y ~ 1.31 to avoid z-fighting
    holeMesh.position.set(0, 1.31, -0.35);
    holeMesh.castShadow = false;
    holeMesh.receiveShadow = false;
    guitarGroup.add(holeMesh); // add to the same group

    // --------------------------------------------------
    // 3) Neck
    // --------------------------------------------------
    const neckLength = 5;
    const neckGeo = new THREE.BoxGeometry(0.9, 0.04, neckLength);
    const neckMat = new THREE.MeshPhongMaterial({ color: 0x8b4513 });
    const neckMesh = new THREE.Mesh(neckGeo, neckMat);
    neckMesh.rotation.x = -Math.PI ;

    // The guitar’s top is y=1.3. Place neck slightly above (1.31).
    // Move it behind the guitar shape on z axis.
    neckMesh.position.set(0, 1.31, -4);
    neckMesh.castShadow = true;
    neckMesh.receiveShadow = true;
    guitarGroup.add(neckMesh);

    const bridgeGeo = new THREE.BoxGeometry(0.8, 0.08, 0.2);
    const bridgeMat = new THREE.MeshPhongMaterial({ color: 0x654321 });
    const bridgeMesh = new THREE.Mesh(bridgeGeo, bridgeMat);
    // Lay it flat
    bridgeMesh.rotation.x = -Math.PI / 2;
    // Place it near the top surface, at z=1.2
    bridgeMesh.position.set(0, 1.31, 1.2);
    bridgeMesh.castShadow = true;
    guitarGroup.add(bridgeMesh);

    // --------------------------------------------------
    // 4) Strings (pure white)
    // --------------------------------------------------
    const numStrings = 6;
    const totalWidth = 0.7;
    const startX = -totalWidth / 2;
    for (let i = 0; i < numStrings; i++) {
      const x = startX + (i * totalWidth) / (numStrings - 1);
      const geometry = new THREE.BufferGeometry();
      // Set y position to 0.35 so strings are above the body
      const positions = new Float32Array([
        x, 1.35, 1.2, // near bridge area
        x, 1.35, -5.0 // near top of neck
      ]);
      geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
      const material = new THREE.LineBasicMaterial({ color: 0xffffff });
      const line = new THREE.Line(geometry, material);
      guitarGroup.add(line);
    }

    // --------------------------------------------------
    // 5) Table Plane using "table.jpg"
    // --------------------------------------------------
    const tableTexture = textureLoader.load("/textures/table.jpg");
    const tableGeo = new THREE.PlaneGeometry(100, 100);
    const tableMat = new THREE.MeshPhongMaterial({ map: tableTexture });
    const tableMesh = new THREE.Mesh(tableGeo, tableMat);
    tableMesh.rotation.x = -Math.PI / 2;
    tableMesh.position.y = -0.25;
    tableMesh.receiveShadow = true;
    scene.add(tableMesh);

    // --------------------------------------------------
    // Group Rotation: Rotate the entire guitar 90° about the Y-axis
    // so that it appears horizontal.
    // --------------------------------------------------
    guitarGroup.rotation.y = Math.PI / 2;

    // Add the guitar group to the scene
    scene.add(guitarGroup);

    // Render loop
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

  return <div ref={mountRef} />;
}
