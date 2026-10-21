"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import Image from "next/image";
import { gsap } from "gsap";
import { createScrambler, type Scrambler } from "@/lib/scramble";
import WorkPreview from "./WorkPreview";
import { CARD_W, type Work } from "./works";

const TINTS = ["text-black/35", "text-black", "text-accent-950", "text-white"];

/** "+" marks on the cover corners */
const PLUS = ["-top-1 -left-1", "-top-1 -right-1", "-right-1 -bottom-1", "-bottom-1 -left-1"];

function Arrow({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 8 8" fill="none" aria-hidden className={`absolute inset-0 size-full ${className}`}>
      <path d="M1.5 6.5 6.5 1.5M2.5 1.5h4v4" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  );
}

/**
 * Selected Work card: Behance cover with a tag, company name and "Visit".
 * On the desktop rail it is placed by --x/--y/--w (box units) and the cover is drawn by WebGL.
 */
export default function WorkCard({ work, gl: glWanted }: { work: Work; gl: boolean }) {
  const [glFailed, setGlFailed] = useState(false);
  const onGlFail = useCallback(() => setGlFailed(true), []);
  const gl = glWanted && !glFailed;
  const visit = useRef<HTMLSpanElement>(null);
  const scrambler = useRef<Scrambler | null>(null);
  const tween = useRef<gsap.core.Tween | null>(null);
  const src = `/img/work/${work.id}.jpg`;

  useEffect(() => {
    if (visit.current) scrambler.current = createScrambler(visit.current, { solid: true, tints: TINTS });
    return () => {
      tween.current?.kill();
    };
  }, []);

  // Hovering the cover or the label plays the "Visit" scramble (as on the reference)
  const onEnter = () => {
    const s = scrambler.current;
    if (!s || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const state = { p: 0 };
    tween.current?.kill();
    tween.current = gsap.to(state, { p: 1, duration: 0.45, ease: "none", onUpdate: () => s.set(state.p) });
  };
  const onLeave = () => {
    tween.current?.kill();
    scrambler.current?.set(1);
  };

  const link = { href: work.href, target: "_blank", rel: "noopener noreferrer" } as const;

  return (
    <article
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      style={{ "--x": work.x, "--y": work.y, "--w": CARD_W[work.size] } as CSSProperties}
      className="group/card pointer-events-auto flex flex-col gap-3 rail:absolute rail:top-[calc(var(--y)*var(--u))] rail:left-[calc(var(--x)*var(--u))] rail:w-[calc(var(--w)*var(--u))] rail:gap-[calc(12*var(--u))]"
    >
      <a
        {...link}
        data-card
        aria-label={`${work.title} on Behance`}
        className="relative block aspect-808/632 w-full cursor-pointer shadow-[0_1px_2px_rgb(0_0_0/0.1),0_10px_24px_rgb(0_0_0/0.02)]"
      >
        <div className="absolute inset-0 overflow-hidden">
          {/* Plain cover below desktop, with reduced motion or without WebGL; the canvas replaces it otherwise */}
          <Image
            src={src}
            alt=""
            fill
            unoptimized
            className={`object-cover transition-transform duration-600 ease-[cubic-bezier(0.16,1,0.3,1)] motion-safe:group-hover/card:scale-[1.04] ${gl ? "opacity-0" : ""}`}
          />
          <div
            className={`absolute inset-0 bg-linear-to-b from-transparent to-accent-500 mix-blend-hard-light ${gl ? "opacity-0" : ""}`}
          />
          {gl && <WorkPreview src={src} onFail={onGlFail} />}
        </div>
        <span className="absolute top-[0.95rem] left-4 bg-black px-2 py-[0.44rem] text-label leading-none font-semibold tracking-[0.13em] text-accent-600 uppercase max-sm:top-3 max-sm:left-3">
          {work.tag}
        </span>
        {PLUS.map((pos) => (
          <svg key={pos} viewBox="0 0 8 8" aria-hidden className={`absolute size-2 text-black/35 ${pos}`}>
            <path d="M4.5 3.5H7V4.5H4.5V7H3.5V4.5H1V3.5H3.5V1H4.5V3.5Z" fill="currentColor" />
          </svg>
        ))}
      </a>

      <div className="flex w-full items-baseline justify-between gap-3">
        {/* On the rail the name scales with the box, like the cards (12px floor) */}
        <h3 className="text-[1.25rem] leading-none font-medium whitespace-nowrap uppercase max-sm:text-[1.05rem] sm:max-lg:text-[max(12px,1.15rem)] rail:text-[max(12px,calc(20*var(--u)))]">
          {/* The cover is the focusable link; this one is for the mouse only */}
          <a {...link} tabIndex={-1}>
            {work.title}
          </a>
        </h3>
        <a
          {...link}
          tabIndex={-1}
          className="flex shrink-0 items-center gap-1 text-label leading-none font-semibold tracking-[0.13em] text-black/55 uppercase transition-colors duration-200 group-hover/card:text-black"
        >
          {/* Scrambled on hover: no pointer events, or the click is lost */}
          <span ref={visit} data-text="Visit" className="pointer-events-none">
            Visit
          </span>
          <span className="relative size-2 shrink-0 overflow-hidden text-black">
            <Arrow className="transition-transform duration-300 ease-out group-hover/card:translate-x-full group-hover/card:-translate-y-full" />
            <Arrow className="-translate-x-full translate-y-full transition-transform duration-300 ease-out group-hover/card:translate-0" />
          </span>
        </a>
      </div>
    </article>
  );
}
