import React from 'react';
import { motion } from 'framer-motion';

// Helper for cubic Bézier interpolation
function cubicBezier(t, p0, p1, p2, p3) {
  const mt = 1 - t;
  const mt2 = mt * mt;
  const t2 = t * t;
  // x or y
  return (mt2 * mt) * p0 +
         3 * mt2 * t * p1 +
         3 * mt * t2 * p2 +
         (t2 * t) * p3;
}

// Return x,y on the baton path for progress in [0,1].
function getConductorPoint(progress) {
  // Example control points (p0..p3) for a cubic Bézier
  // You can tweak these for the shape you want:
  const p0 = { x: 320, y: 380 };
  const p1 = { x: 100, y: 250 };
  const p2 = { x: 540, y: 150 };
  const p3 = { x: 320, y: 50 };

  const x = cubicBezier(progress, p0.x, p1.x, p2.x, p3.x);
  const y = cubicBezier(progress, p0.y, p1.y, p2.y, p3.y);
  return { x, y };
}

// This draws an SVG path plus an animated circle that moves along the path.
export default function ConductorOverlay({ progress }) {
  // Convert progress into x,y
  const { x, y } = getConductorPoint(progress);

  return (
    <svg
      width={640}
      height={480}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        pointerEvents: 'none',
        zIndex: 40
      }}
    >
      {/* The baton path (just a visual reference) */}
      <path
        d="M320,380 C100,250 540,150 320,50"
        stroke="white"
        strokeWidth={2}
        fill="none"
      />
      {/* Animated baton tip */}
      <motion.circle
        r={10}
        fill="red"
        // Animate to the new x,y
        animate={{ cx: x, cy: y }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      />
    </svg>
  );
}
