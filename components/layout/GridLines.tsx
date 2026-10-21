"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

/** Line index → markers: start position and drift (px per px of scroll, sign = direction). */
const MARKERS: Record<number, { top: string; speed: number }[]> = {
  0: [{ top: "24%", speed: 0.03 }],
  2: [{ top: "52%", speed: -0.035 }],
  4: [{ top: "31%", speed: 0.025 }],
  5: [{ top: "68%", speed: -0.03 }],
};

/** Fixed 5-column guide grid with small markers, shared by every section. */
export default function GridLines() {
  const rootRef = useRef<HTMLDivElement>(null);

  // Markers drift along their lines with the scroll, neighbours in opposite directions
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const markers = [...rootRef.current!.querySelectorAll<HTMLElement>("[data-speed]")].map((el) => ({
      el,
      speed: Number(el.dataset.speed),
    }));
    const st = ScrollTrigger.create({
      start: 0,
      end: "max",
      onUpdate: (self) => {
        const y = self.scroll();
        markers.forEach(({ el, speed }) => (el.style.transform = `translateY(${y * speed}px)`));
      },
    });
    return () => st.kill();
  }, []);

  return (
    // Slides out with Stats during Selected Work's handoff (`data-guides`),
    // then stays hidden while the traces are on screen (`data-grid="off"` on <html>)
    <div
      ref={rootRef}
      aria-hidden
      data-guides
      className="container-x pointer-events-none fixed inset-0 z-30 transition-opacity duration-500 in-data-[grid=off]:opacity-0"
    >
      <div className="relative h-full">
        {/* Desktop: 5 columns */}
        {Array.from({ length: 6 }, (_, i) => (
          <span
            key={i}
            className="absolute top-0 h-full w-px bg-(--line) transition-colors duration-500 max-md:hidden"
            style={{ left: `${i * 20}%` }}
          >
            {MARKERS[i]?.map(({ top, speed }) => (
              <i
                key={top}
                data-speed={speed}
                className="absolute -left-px h-1.5 w-[3px] bg-(--marker) transition-colors duration-500"
                style={{ top }}
              />
            ))}
          </span>
        ))}
        {/* Mobile: 2 columns */}
        {[0, 50, 100].map((left) => (
          <span
            key={left}
            className="absolute top-0 h-full w-px bg-(--line) transition-colors duration-500 md:hidden"
            style={{ left: `${left}%` }}
          />
        ))}
      </div>
    </div>
  );
}
