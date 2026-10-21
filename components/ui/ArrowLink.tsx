"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { createScrambler, type Scrambler } from "@/lib/scramble";

/** Diagonal arrow; on hover one copy flies out top-right while another flies in from bottom-left */
function Arrow({ className }: { className: string }) {
  const path = (
    <>
      <path d="M0.707107 6.875L7.08211 0.5L6.93071 0.651425" stroke="currentColor" strokeLinecap="square" />
      <path d="M3.58205 0.5H7.08205V4" stroke="currentColor" strokeLinecap="square" />
    </>
  );
  return (
    <span className={`relative inline-block size-2 shrink-0 overflow-hidden ${className}`}>
      <svg viewBox="0 0 7.58 7.58" fill="none" aria-hidden className="absolute inset-0 size-full transition-transform duration-300 ease-out group-hover:translate-x-full group-hover:-translate-y-full">
        {path}
      </svg>
      <svg viewBox="0 0 7.58 7.58" fill="none" aria-hidden className="absolute inset-0 size-full -translate-x-full translate-y-full transition-transform duration-300 ease-out group-hover:translate-0">
        {path}
      </svg>
    </span>
  );
}

/** External link (new tab): the label scrambles on hover, the arrow flies through */
export default function ArrowLink({
  label,
  href,
  className = "",
  arrowClassName = "",
}: {
  label: string;
  href: string;
  className?: string;
  arrowClassName?: string;
}) {
  const text = useRef<HTMLSpanElement>(null);
  const scrambler = useRef<Scrambler | null>(null);
  const tween = useRef<gsap.core.Tween | null>(null);

  useEffect(() => {
    if (text.current) scrambler.current = createScrambler(text.current, { solid: true });
    return () => {
      tween.current?.kill();
    };
  }, [label]);

  const onEnter = () => {
    const s = scrambler.current;
    if (!s || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const state = { p: 0 };
    tween.current?.kill();
    tween.current = gsap.to(state, { p: 1, duration: 0.35, ease: "none", onUpdate: () => s.set(state.p) });
  };
  const onLeave = () => {
    tween.current?.kill();
    scrambler.current?.set(1);
  };

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      className={`group flex items-center justify-between gap-1 transition-colors duration-300 ${className}`}
    >
      {/* Not a click target: the scramble swaps its nodes mid-click (see CornerButton) */}
      <span ref={text} className="pointer-events-none">
        {label}
      </span>
      <Arrow className={arrowClassName} />
    </a>
  );
}
