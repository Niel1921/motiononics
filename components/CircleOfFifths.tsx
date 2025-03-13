"use client";

import React from "react";
import { motion } from "framer-motion";

// --------------------- Utility Functions ---------------------
function polarToCartesian(
  centerX: number,
  centerY: number,
  radius: number,
  angleInDegrees: number
) {
  // 0° => 12 o'clock
  const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0;
  return {
    x: centerX + radius * Math.cos(angleInRadians),
    y: centerY + radius * Math.sin(angleInRadians),
  };
}

/**
 * Creates an SVG path for a "ring wedge" between innerRadius and outerRadius
 * from startAngle to endAngle. This yields a donut-slice shape.
 */
function describeRingArc(
  cx: number,
  cy: number,
  startAngle: number,
  endAngle: number,
  innerRadius: number,
  outerRadius: number
) {
  // Outer arc
  const outerStart = polarToCartesian(cx, cy, outerRadius, endAngle);
  const outerEnd = polarToCartesian(cx, cy, outerRadius, startAngle);

  // Inner arc
  const innerEnd = polarToCartesian(cx, cy, innerRadius, startAngle);
  const innerStart = polarToCartesian(cx, cy, innerRadius, endAngle);

  const largeArcFlag = endAngle - startAngle <= 180 ? 0 : 1;

  return [
    `M ${outerStart.x} ${outerStart.y}`,
    `A ${outerRadius} ${outerRadius} 0 ${largeArcFlag} 0 ${outerEnd.x} ${outerEnd.y}`,
    `L ${innerEnd.x} ${innerEnd.y}`,
    `A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 1 ${innerStart.x} ${innerStart.y}`,
    "Z",
  ].join(" ");
}

// --------------------- Circle of Fifths Data ---------------------
/**
 * 12 slices: each has a major key + its relative minor key.
 * You can reorder or rename these if you prefer a different arrangement.
 */
const circleData = [
  { major: "C Major", minor: "A Minor" },
  { major: "G Major", minor: "E Minor" },
  { major: "D Major", minor: "B Minor" },
  { major: "A Major", minor: "F# Minor" },
  { major: "E Major", minor: "C# Minor" },
  { major: "B Major", minor: "G# Minor" },
  { major: "F# Major", minor: "D# Minor" },
  { major: "C# Major", minor: "A# Minor" },
  { major: "Ab Major", minor: "F Minor" },
  { major: "Eb Major", minor: "C Minor" },
  { major: "Bb Major", minor: "G Minor" },
  { major: "F Major", minor: "D Minor" },
];

// Find which slice has the given key in either major or minor.
function findIndexByKey(keyName: string) {
  const i = circleData.findIndex(
    (slice) => slice.major === keyName || slice.minor === keyName
  );
  return i >= 0 ? i : 0;
}

// --------------------- Static Chord Labels ---------------------
// Place them at specific angles so they remain fixed on the outside/inside
// even as the wheel rotates.
const outsideChordLabels = [
  { label: "I", angle: 0 },   // top
  { label: "V", angle: 30 }, // right
  { label: "IV", angle: 330 } // left
];

const insideChordLabels = [
  { label: "vi", angle: 0 },  // top
  { label: "iii", angle: 35 }, // right
  { label: "ii", angle: 325 }  // left
];

interface CircleOfFifthsProps {
  selectedKey: string;
  onSelectKey: (keyName: string) => void;
}

// --------------------- Main Component ---------------------
export default function CircleOfFifths({
  selectedKey,
  onSelectKey,
}: CircleOfFifthsProps) {
  const width = 400;
  const height = 400;

  // Center
  const cx = width / 2;
  const cy = height / 2;

  // Outer ring for major keys
  const radiusMajorInner = 100;
  const radiusMajorOuter = 140;

  // Inner ring for minor keys
  const radiusMinorInner = 60;
  const radiusMinorOuter = 100;

  // Each slice => 360/12 = 30°
  const wedgeAngle = 360 / circleData.length;

  // Figure out which slice is selected
  const selectedIndex = findIndexByKey(selectedKey);
  // Rotate so that the midpoint of slice i is at the top
  const rotation = -((selectedIndex + 0.5) * wedgeAngle);

  // Radii for placing the static chord labels
  const outsideChordRadius = radiusMajorOuter + 25; // slightly outside the major ring
  const insideChordRadius = radiusMinorInner - 20;  // slightly inside the minor ring

  return (
    <svg width={width} height={height} viewBox="0 0 400 400">
      {/* 
        1) The rotating group for major/minor wedges and labels 
      */}
      <motion.g
        style={{ transformOrigin: "200px 200px" }}
        animate={{ rotate: rotation }}
        transition={{ duration: 0.8, ease: "easeInOut" }}
      >
        {circleData.map((slice, i) => {
          const startAngle = i * wedgeAngle;
          const endAngle = (i + 1) * wedgeAngle;

          // Outer wedge (major)
          const majorPath = describeRingArc(
            cx,
            cy,
            startAngle,
            endAngle,
            radiusMajorInner,
            radiusMajorOuter
          );
          // Inner wedge (minor)
          const minorPath = describeRingArc(
            cx,
            cy,
            startAngle,
            endAngle,
            radiusMinorInner,
            radiusMinorOuter
          );

          // Highlight whichever wedge is the selectedKey
          const majorIsSelected = slice.major === selectedKey;
          const minorIsSelected = slice.minor === selectedKey;
          const majorColor = majorIsSelected ? "#FFD700" : "#4FD1C5"; // gold vs teal
          const minorColor = minorIsSelected ? "#FFD700" : "#A78BFA"; // gold vs purple

          return (
            <React.Fragment key={i}>
              {/* Major wedge */}
              <path
                d={majorPath}
                fill={majorColor}
                stroke="#fff"
                strokeWidth={2}
                style={{ cursor: "pointer" }}
                onClick={() => onSelectKey(slice.major)}
              />
              {/* Minor wedge */}
              <path
                d={minorPath}
                fill={minorColor}
                stroke="#fff"
                strokeWidth={2}
                style={{ cursor: "pointer" }}
                onClick={() => onSelectKey(slice.minor)}
              />
            </React.Fragment>
          );
        })}

        {/* Major Key Labels */}
        {circleData.map((slice, i) => {
          const angle = (i + 0.5) * wedgeAngle;
          // Position near the center of the major ring
          const labelRadius = (radiusMajorInner + radiusMajorOuter) / 2;
          const pos = polarToCartesian(cx, cy, labelRadius, angle);

          return (
            <text
              key={`major-label-${i}`}
              x={pos.x}
              y={pos.y}
              fill="#fff"
              fontSize="14"
              fontWeight="bold"
              textAnchor="middle"
              alignmentBaseline="middle"
              style={{ pointerEvents: "none" }}
              transform={`rotate(${-rotation} ${pos.x} ${pos.y})`}
            >
              {slice.major.replace(" Major", "")}
            </text>
          );
        })}

        {/* Minor Key Labels */}
        {circleData.map((slice, i) => {
          const angle = (i + 0.5) * wedgeAngle;
          // Position near the center of the minor ring
          const labelRadius = (radiusMinorInner + radiusMinorOuter) / 2;
          const pos = polarToCartesian(cx, cy, labelRadius, angle);

          return (
            <text
              key={`minor-label-${i}`}
              x={pos.x}
              y={pos.y}
              fill="#fff"
              fontSize="14"
              fontWeight="bold"
              textAnchor="middle"
              alignmentBaseline="middle"
              style={{ pointerEvents: "none" }}
              transform={`rotate(${-rotation} ${pos.x} ${pos.y})`}
            >
              {slice.minor.replace(" Minor", "m")}
            </text>
          );
        })}
      </motion.g>

      {/* 
        2) Static chord function labels (outside ring: I, IV, V; inside ring: iii, ii, vi) 
        These do NOT rotate, so they're outside the <motion.g> 
      */}

      {/* Outside chord labels */}
      {outsideChordLabels.map(({ label, angle }) => {
        const pos = polarToCartesian(cx, cy, outsideChordRadius, angle);
        return (
          <text
            key={`outside-${label}`}
            x={pos.x}
            y={pos.y}
            fill="#000"
            fontSize="16"
            fontWeight="bold"
            textAnchor="middle"
            alignmentBaseline="middle"
          >
            {label}
          </text>
        );
      })}

      {/* Inside chord labels */}
      {insideChordLabels.map(({ label, angle }) => {
        const pos = polarToCartesian(cx, cy, insideChordRadius, angle);
        return (
          <text
            key={`inside-${label}`}
            x={pos.x}
            y={pos.y}
            fill="#000"
            fontSize="16"
            fontWeight="bold"
            textAnchor="middle"
            alignmentBaseline="middle"
          >
            {label}
          </text>
        );
      })}
    </svg>
  );
}
