"use client";

import React from "react";
import { motion } from "framer-motion";

// Helper: Convert polar coordinates to Cartesian coordinates.
function polarToCartesian(
  centerX: number,
  centerY: number,
  radius: number,
  angleInDegrees: number
) {
  const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0;
  return {
    x: centerX + radius * Math.cos(angleInRadians),
    y: centerY + radius * Math.sin(angleInRadians),
  };
}

// Helper: Build an SVG path for a wedge (arc) from startAngle to endAngle.
function describeArc(
  centerX: number,
  centerY: number,
  radius: number,
  startAngle: number,
  endAngle: number
) {
  const start = polarToCartesian(centerX, centerY, radius, endAngle);
  const end = polarToCartesian(centerX, centerY, radius, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? 0 : 1;
  return [
    `M ${start.x} ${start.y}`,
    `A ${radius} ${radius} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`,
    `L ${centerX} ${centerY}`,
    "Z",
  ].join(" ");
}

// Array of 12 major keys in circle-of-fifths order.
const majorKeys = [
  "C Major",
  "G Major",
  "D Major",
  "A Major",
  "E Major",
  "B Major",
  "F# Major",
  "C# Major",
  "Ab Major",
  "Eb Major",
  "Bb Major",
  "F Major",
];

interface CircleOfFifthsProps {
  selectedKey: string;
  onSelectKey: (keyName: string) => void;
}

export default function CircleOfFifths({
  selectedKey,
  onSelectKey,
}: CircleOfFifthsProps) {
  // Dimensions and geometry.
  const width = 400;
  const height = 400;
  const centerX = width / 2;
  const centerY = height / 2;
  const radius = 140;
  const wedgeAngle = 360 / majorKeys.length;

  // Determine the selected key's index (default to 0 if not found).
  const selectedIndex = majorKeys.indexOf(selectedKey);
  const safeIndex = selectedIndex >= 0 ? selectedIndex : 0;

  // Calculate rotation needed so that the selected wedge's midpoint is at the top.
  // Midpoint of wedge i is at (i + 0.5) * wedgeAngle.
  const groupRotation = -((safeIndex + 0.5) * wedgeAngle);

  // Static chord function labels.
  // You can customize these labels and angles as desired.
  const staticChordLabels = ["IV", "I", "V"];
  const staticLabelRadius = radius + 30; // Place these a bit outside the wheel.
  const staticLabelAngleIncrement = 90 / staticChordLabels.length;

  return (
    <svg width={width} height={height} viewBox="0 0 400 400">
      {/* The rotating group for wedges and key labels */}
      <motion.g
        style={{ transformOrigin: "200px 200px" }}
        animate={{ rotate: groupRotation }}
        transition={{ duration: 0.8, ease: "easeInOut" }}
      >
        {/* Wedges */}
        {majorKeys.map((keyName, i) => {
          const startAngle = i * wedgeAngle;
          const endAngle = (i + 1) * wedgeAngle;
          const pathData = describeArc(centerX, centerY, radius, startAngle, endAngle);
          const isSelected = selectedKey === keyName;
          const fillColor = isSelected ? "#FFD700" : "#4FD1C5";
          return (
            <path
              key={keyName}
              d={pathData}
              fill={fillColor}
              stroke="#fff"
              strokeWidth={2}
              style={{ cursor: "pointer" }}
              onClick={() => onSelectKey(keyName)}
            />
          );
        })}

        {/* Key Labels: Counter-rotate each text element so it remains horizontal */}
        {majorKeys.map((keyName, i) => {
          // Calculate the wedge's midpoint angle in the unrotated space.
          const labelAngle = (i + 0.5) * wedgeAngle;
          const labelRadius = radius * 0.65;
          const pos = polarToCartesian(centerX, centerY, labelRadius, labelAngle);
          // Cancel out the group's rotation so the text stays horizontal.
          return (
            <text
              key={`${keyName}-label`}
              x={pos.x}
              y={pos.y}
              fill="#fff"
              fontSize="14"
              fontWeight="bold"
              textAnchor="middle"
              alignmentBaseline="middle"
              style={{ pointerEvents: "none" }}
              transform={`rotate(${-groupRotation} ${pos.x} ${pos.y})`}
            >
              {keyName.replace(" Major", "")}
            </text>
          );
        })}
      </motion.g>

      {/* Static Chord Function Labels: Remain fixed in position as the wheel rotates */}
      {staticChordLabels.map((label, i) => {
        // Evenly distribute the static labels around the circle.
        const angle = (i - 1) * staticLabelAngleIncrement;
        const pos = polarToCartesian(centerX, centerY, staticLabelRadius, angle);
        return (
          <text
            key={`static-${label}`}
            x={pos.x}
            y={pos.y}
            fill="#000"
            fontSize="16"
            fontWeight="bold"
            textAnchor="middle"
            alignmentBaseline="middle"
            // No rotation transform needed so they remain horizontal.
          >
            {label}
          </text>
        );
      })}
    </svg>
  );
}
