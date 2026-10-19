"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

/** Page scroll progress ring that follows the cursor (fine pointers only). */
export default function CursorProgress() {
  const rootRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<SVGCircleElement>(null);

  useEffect(() => {
    if (!window.matchMedia("(pointer: fine)").matches) return;
    const root = rootRef.current!;
    const ring = ringRef.current!;

    gsap.set(root, { xPercent: -50, yPercent: -50 });
    const xTo = gsap.quickTo(root, "x", { duration: 0.35, ease: "power3" });
    const yTo = gsap.quickTo(root, "y", { duration: 0.35, ease: "power3" });
    let visible = false;

    const onMove = (e: PointerEvent) => {
      if (!visible) {
        gsap.set(root, { x: e.clientX, y: e.clientY });
        root.style.opacity = "1";
        visible = true;
      }
      xTo(e.clientX);
      yTo(e.clientY);
    };
    const onLeave = () => {
      root.style.opacity = "0";
      visible = false;
    };

    const st = ScrollTrigger.create({
      start: 0,
      end: "max",
      onUpdate: (self) => (ring.style.strokeDashoffset = String(1 - self.progress)),
    });

    window.addEventListener("pointermove", onMove);
    document.documentElement.addEventListener("pointerleave", onLeave);
    return () => {
      st.kill();
      window.removeEventListener("pointermove", onMove);
      document.documentElement.removeEventListener("pointerleave", onLeave);
    };
  }, []);

  return (
    <div
      ref={rootRef}
      aria-hidden
      className="pointer-events-none fixed top-0 left-0 z-40 size-10 opacity-0 transition-opacity duration-300"
    >
      <svg viewBox="0 0 40 40" className="size-full -rotate-90">
        <circle
          cx="20"
          cy="20"
          r="18"
          fill="none"
          strokeWidth="1"
          className="stroke-white/15 transition-[stroke] duration-500 in-data-[stage=accent]:stroke-black/20"
        />
        <circle
          ref={ringRef}
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
  );
}
