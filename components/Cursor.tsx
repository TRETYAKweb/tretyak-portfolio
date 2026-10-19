"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

/**
 * Custom cursor (fine pointers only):
 * - scroll progress ring that trails the mouse, inverted against what's under it;
 * - dot-grid spotlight around the ring that lights up while the mouse moves (dark stage only).
 */
export default function Cursor() {
  const ringRef = useRef<HTMLDivElement>(null);
  const arcRef = useRef<SVGCircleElement>(null);
  const spotRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!window.matchMedia("(pointer: fine)").matches) return;
    const ring = ringRef.current!;
    const arc = arcRef.current!;
    const spot = spotRef.current!;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // Shared trailing position: ring and spotlight move together
    const pos = { x: 0, y: 0 };
    const place = () => {
      ring.style.transform = `translate(${pos.x}px, ${pos.y}px) translate(-50%, -50%)`;
      spot.style.transform = `translate(${pos.x}px, ${pos.y}px) translate(-50%, -50%)`;
      // Keep the dots anchored to the viewport while the spotlight moves
      const half = spot.offsetWidth / 2;
      spot.style.backgroundPosition = `${half - pos.x}px ${half - pos.y}px`;
    };
    const xTo = gsap.quickTo(pos, "x", { duration: 0.35, ease: "power3", onUpdate: place });
    const yTo = gsap.quickTo(pos, "y", { duration: 0.35, ease: "power3", onUpdate: place });

    let inside = false;
    const fadeSpot = gsap.delayedCall(0.5, () => gsap.to(spot, { opacity: 0, duration: 0.8 })).pause();

    const onMove = (e: PointerEvent) => {
      if (!inside) {
        pos.x = e.clientX;
        pos.y = e.clientY;
        place();
        ring.style.opacity = "1";
        inside = true;
      }
      xTo(e.clientX);
      yTo(e.clientY);
      if (!reduced) {
        gsap.to(spot, { opacity: 1, duration: 0.3, overwrite: true });
        fadeSpot.restart(true);
      }
    };
    const onLeave = () => {
      inside = false;
      ring.style.opacity = "0";
      gsap.to(spot, { opacity: 0, duration: 0.3, overwrite: true });
    };

    const st = ScrollTrigger.create({
      start: 0,
      end: "max",
      onUpdate: (self) => (arc.style.strokeDashoffset = String(1 - self.progress)),
    });

    window.addEventListener("pointermove", onMove);
    document.documentElement.addEventListener("pointerleave", onLeave);
    return () => {
      st.kill();
      fadeSpot.kill();
      window.removeEventListener("pointermove", onMove);
      document.documentElement.removeEventListener("pointerleave", onLeave);
    };
  }, []);

  return (
    <>
      {/* Dot-grid spotlight, dark stage only */}
      <div
        ref={spotRef}
        aria-hidden
        className="pointer-events-none fixed top-0 left-0 z-20 size-[18rem] bg-size-[1.6rem_1.6rem] opacity-0 mask-[radial-gradient(circle_closest-side,black,transparent)] in-data-[stage=accent]:hidden"
        style={{ backgroundImage: "radial-gradient(circle, var(--dot) 1px, transparent 1.5px)" }}
      />

      {/* Scroll progress ring */}
      <div
        ref={ringRef}
        aria-hidden
        className="pointer-events-none fixed top-0 left-0 z-40 size-10 opacity-0 mix-blend-difference transition-opacity duration-300 in-data-[stage=accent]:mix-blend-normal"
      >
        <svg viewBox="0 0 40 40" className="size-full -rotate-90">
          <circle
            cx="20"
            cy="20"
            r="18"
            fill="none"
            strokeWidth="1"
            className="stroke-white/25 transition-[stroke] duration-500 in-data-[stage=accent]:stroke-black/20"
          />
          <circle
            ref={arcRef}
            cx="20"
            cy="20"
            r="18"
            fill="none"
            strokeWidth="1"
            pathLength={1}
            strokeDasharray="1"
            strokeDashoffset="1"
            className="stroke-accent-600 transition-[stroke] duration-500 in-data-[stage=accent]:stroke-black"
          />
        </svg>
      </div>
    </>
  );
}
