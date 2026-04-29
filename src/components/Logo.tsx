// ProWo brand mark — geometric purple "P" rendered as inline SVG so it
// stays crisp at any size and ships with the bundle (no asset hosting).
//
// To swap for the pixel-perfect logo PNG later:
//   1. Drop the file in /public as e.g. /public/logo.png
//   2. Replace this component's body with <img src="/logo.png" ... />

import * as React from "react";

interface Props {
  size?: number;
  className?: string;
  /** When true, renders just the icon. When false, also shows the wordmark. */
  iconOnly?: boolean;
}

export function Logo({ size = 28, className, iconOnly = false }: Props) {
  return (
    <span className={`inline-flex items-center gap-2 ${className ?? ""}`}>
      <PowoMark size={size} />
      {!iconOnly && (
        <span className="font-bold tracking-tight text-ink">
          Pro<span className="text-accent">W</span>o
        </span>
      )}
    </span>
  );
}

function PowoMark({ size }: { size: number }) {
  // Faceted purple "P" inspired by the brand asset. Two-tone gradient gives
  // the folded-paper feel without needing the full rasterised file.
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="ProWo"
      role="img"
    >
      <defs>
        <linearGradient id="powo-stem" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#A78BFA" />
          <stop offset="100%" stopColor="#7C3AED" />
        </linearGradient>
        <linearGradient id="powo-bowl" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#8B5CF6" />
          <stop offset="100%" stopColor="#5B21B6" />
        </linearGradient>
        <linearGradient id="powo-fold" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#C4B5FD" />
          <stop offset="100%" stopColor="#8B5CF6" />
        </linearGradient>
      </defs>
      {/* stem */}
      <path d="M14 6 H30 L26 58 H14 Z" fill="url(#powo-stem)" />
      {/* upper bowl */}
      <path d="M30 6 H50 L58 18 L48 30 H30 Z" fill="url(#powo-bowl)" />
      {/* lower bowl fold (inner highlight) */}
      <path d="M30 30 H48 L42 42 H26 Z" fill="url(#powo-fold)" />
    </svg>
  );
}
