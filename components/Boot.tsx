"use client";

import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { markBooted } from "@/lib/boot";

const FILL = "#fd4100"; // accent-600
const FLASH = "#ffab6d"; // accent-300

/** Counter: 0 → START while the frame slides in, then stops with holds; 100 waits for window `load` */
const START = 25;
const STOPS = [
  { at: 78, hold: 0.5 },
  { at: 95, hold: 0.5 },
  { at: 100, hold: 0.2 },
];
const LOAD_TIMEOUT = 6000;
/** Reveal length; the page intro starts once this share of it has played */
const REVEAL = 1.3;
const RELEASE_AT = 0.2;

/** Cells of ≈2.25rem, an even count per axis so the screen centre falls on a cell corner */
function cellGrid(w: number, h: number, rem: number) {
  const target = 2.25 * rem;
  const cols = Math.max(2, Math.round(w / target / 2) * 2);
  const rows = Math.max(2, Math.round(h / target / 2) * 2);
  return { cols, rows, w: w / cols, h: h / rows };
}

/** Bevelled notch in the middle of each screen edge (45° like `.chamfer`) */
function Notch({ className }: { className: string }) {
  return (
    <svg viewBox="-0.5 -0.5 141 21" fill="none" aria-hidden className={`absolute h-[1.3125rem] w-[8.8rem] text-accent-700 ${className}`}>
      <path d="M0 0L20 20H120L140 0" stroke="currentColor" />
    </svg>
  );
}

function Plus({ corner, style }: { corner: string; style: React.CSSProperties }) {
  return (
    <svg data-plus={corner} viewBox="0 0 8 8" fill="none" aria-hidden className="absolute -m-[0.3125rem] size-[0.625rem] text-black" style={style}>
      <path d="M4.5 3.5H7V4.5H4.5V7H3.5V4.5H1V3.5H3.5V1H4.5V3.5Z" fill="currentColor" />
    </svg>
  );
}

/** Starting offset for the frame: just off-screen, so the first paint never shows it in place */
const OFF = "calc(2rem + 2px)";

/**
 * First visit of the session: accent preloader (frame closes in on a percent counter).
 * Every visit: the accent cover breaks into cells from the centre and uncovers the page.
 * Reduced motion: neither (the cover is hidden in CSS), the page starts at once.
 */
export default function Boot() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const preRef = useRef<HTMLDivElement>(null);
  const percentRef = useRef<HTMLSpanElement>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const html = document.documentElement;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      html.removeAttribute("data-preload");
      html.setAttribute("data-booted", "");
      markBooted();
      return;
    }

    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const W = window.innerWidth;
    const H = window.innerHeight;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const rem = parseFloat(getComputedStyle(html).fontSize);
    const grid = cellGrid(W, H, rem);

    // Each cell leaves at its own moment: nearer the centre goes first, with noise
    const maxDist = Math.hypot(W / 2, H / 2);
    const cells: { x: number; y: number; t: number }[] = [];
    for (let r = 0; r < grid.rows; r++) {
      for (let c = 0; c < grid.cols; c++) {
        const x = c * grid.w;
        const y = r * grid.h;
        const d = Math.hypot(x + grid.w / 2 - W / 2, y + grid.h / 2 - H / 2) / maxDist;
        cells.push({ x, y, t: 0.06 + (d * 0.7 + Math.random() * 0.3) * 0.94 });
      }
    }

    const reveal = { p: 0 };
    const inset = Math.min(grid.w, grid.h) * 0.3;
    const draw = () => {
      ctx.clearRect(0, 0, W, H);
      for (const cell of cells) {
        if (reveal.p >= cell.t) continue;
        // Last moment before leaving: a smaller, lighter square (same flicker as PixelTransition)
        if (reveal.p > cell.t - 0.06) {
          ctx.fillStyle = FLASH;
          ctx.fillRect(cell.x + inset, cell.y + inset, grid.w - inset * 2, grid.h - inset * 2);
        } else {
          ctx.fillStyle = FILL;
          ctx.fillRect(cell.x - 0.5, cell.y - 0.5, grid.w + 1, grid.h + 1);
        }
      }
    };
    // The canvas now paints the cover, so the static one can go. Scroll stays locked here:
    // lenis.stop() doesn't block the wheel, and the page would move under the cover
    draw();
    html.style.overflow = "hidden";
    html.setAttribute("data-booted", "");
    const unlock = () => (html.style.overflow = "");

    const tweens: { kill: () => void }[] = [];
    const startReveal = () => {
      let released = false;
      const tween = gsap.to(reveal, {
        p: 1,
        duration: REVEAL,
        ease: "power2.out",
        onUpdate() {
          draw();
          if (!released && this.progress() >= RELEASE_AT) {
            released = true;
            canvas.style.pointerEvents = "none";
            unlock();
            markBooted();
          }
        },
        onComplete: () => {
          unlock();
          markBooted();
          setDone(true);
        },
      });
      tweens.push(tween);
    };

    if (!html.hasAttribute("data-preload")) {
      startReveal();
      return () => {
        unlock();
        tweens.forEach((t) => t.kill());
      };
    }

    // --- Preloader ---
    let loaded = document.readyState === "complete";
    const onLoad = () => (loaded = true);
    window.addEventListener("load", onLoad);
    const loadTimeout = window.setTimeout(onLoad, LOAD_TIMEOUT);

    const root = preRef.current!;
    const percent = percentRef.current!;
    const q = (sel: string) => root.querySelector<SVGElement | HTMLElement>(sel)!;
    const [lineL, lineR, lineT, lineB] = ["left", "right", "top", "bottom"].map((s) => q(`[data-line=${s}]`));
    const [tl, tr, bl, br] = ["tl", "tr", "bl", "br"].map((s) => q(`[data-plus=${s}]`));

    // Frame edges travel with their corner crosses
    const left = [lineL, tl, bl];
    const right = [lineR, tr, br];
    const top = [lineT, tl, tr];
    const bottom = [lineB, bl, br];
    const edge = 2 * rem;
    const off = edge + 2;
    gsap.set(left, { x: -off });
    gsap.set(right, { x: off });
    gsap.set(top, { y: -off });
    gsap.set(bottom, { y: off });

    // At 100% the frame hugs a 4×4-cell box around the counter
    const moves = [
      { els: left, prop: "x", to: W / 2 - 2 * grid.w - edge },
      { els: right, prop: "x", to: -(W / 2 - 2 * grid.w - edge) },
      { els: top, prop: "y", to: H / 2 - 2 * grid.h - edge },
      { els: bottom, prop: "y", to: -(H / 2 - 2 * grid.h - edge) },
    ];

    const counter = { v: 0 };
    const writeCounter = () => {
      percent.textContent = `${Math.min(Math.round(counter.v), loaded ? 100 : 99)}%`;
    };

    const timeline = gsap.timeline({ paused: true });
    timeline
      .to([left, right].flat(), { x: 0, duration: 0.4, ease: "power2.out" }, 0)
      .to([top, bottom].flat(), { y: 0, duration: 0.4, ease: "power2.out" }, 0)
      .to(percent, { opacity: 1, duration: 0.2 }, 0)
      .to(counter, { v: START, duration: 0.4, ease: "none", onUpdate: writeCounter }, 0);

    let at = 0.4;
    let from = START;
    let poll = 0;
    STOPS.forEach((stop, i) => {
      // The last stretch only runs once the page has actually loaded
      if (stop.at === 100) {
        timeline.addPause(at, () => {
          const go = () => {
            window.clearInterval(poll);
            writeCounter();
            timeline.resume();
          };
          if (loaded) return go();
          poll = window.setInterval(() => loaded && go(), 50);
        });
      }
      const duration = Math.max(0.35, ((stop.at - from) / (100 - START)) * 1.2);
      const share = (stop.at - START) / (100 - START);
      timeline.to(counter, { v: stop.at, duration, ease: "none", onUpdate: writeCounter }, at);
      moves.forEach((m) =>
        timeline.to(m.els, { [m.prop]: m.to * share, duration, ease: i === 0 ? "power2.out" : "power2.inOut" }, at),
      );
      at += duration + stop.hold;
      from = stop.at;
    });
    timeline.add(() => {
      html.removeAttribute("data-preload");
      startReveal();
    }, at);

    // Start once frames come steadily (hydration is done), or after 2s regardless
    let raf = 0;
    let last = performance.now();
    let smooth = 0;
    const deadline = last + 2000;
    const waitForSmooth = () => {
      const now = performance.now();
      smooth = now - last < 50 ? smooth + 1 : 0;
      last = now;
      if (smooth >= 2 || now >= deadline) timeline.play(0);
      else raf = requestAnimationFrame(waitForSmooth);
    };
    raf = requestAnimationFrame(waitForSmooth);

    return () => {
      cancelAnimationFrame(raf);
      window.clearInterval(poll);
      window.clearTimeout(loadTimeout);
      window.removeEventListener("load", onLoad);
      unlock();
      timeline.kill();
      tweens.forEach((t) => t.kill());
    };
  }, []);

  if (done) return null;

  return (
    <>
      {/* Both swallow taps and swipes: Lenis doesn't stop touch scrolling, the page would move underneath */}
      <canvas ref={canvasRef} aria-hidden className="boot-canvas fixed inset-0 z-[9999] size-full touch-none" />

      <div ref={preRef} aria-hidden className="preloader fixed inset-0 z-[10000] touch-none overflow-hidden bg-accent-600">
        {/* GSAP owns these transforms: start offsets are inline, never Tailwind translate-* */}
        <span data-line="left" className="absolute top-0 bottom-0 left-8 w-px bg-accent-700" style={{ transform: `translateX(calc(-1 * ${OFF}))` }} />
        <span data-line="right" className="absolute top-0 right-8 bottom-0 w-px bg-accent-700" style={{ transform: `translateX(${OFF})` }} />
        <span data-line="top" className="absolute top-8 right-0 left-0 h-px bg-accent-700" style={{ transform: `translateY(calc(-1 * ${OFF}))` }} />
        <span data-line="bottom" className="absolute right-0 bottom-8 left-0 h-px bg-accent-700" style={{ transform: `translateY(${OFF})` }} />

        <span ref={percentRef} className="display absolute top-1/2 left-1/2 -translate-1/2 text-[2.4rem] text-black tabular-nums opacity-0">
          0%
        </span>

        <Notch className="top-[-1px] left-1/2 -translate-x-1/2" />
        <Notch className="bottom-[-1px] left-1/2 -translate-x-1/2 rotate-180" />
        <Notch className="top-1/2 left-[calc(-3.74rem-1px)] -translate-y-1/2 -rotate-90" />
        <Notch className="top-1/2 right-[calc(-3.74rem-1px)] -translate-y-1/2 rotate-90" />

        <Plus corner="tl" style={{ top: "2rem", left: "2rem", transform: `translate(calc(-1 * ${OFF}), calc(-1 * ${OFF}))` }} />
        <Plus corner="tr" style={{ top: "2rem", right: "2rem", transform: `translate(${OFF}, calc(-1 * ${OFF}))` }} />
        <Plus corner="bl" style={{ bottom: "2rem", left: "2rem", transform: `translate(calc(-1 * ${OFF}), ${OFF})` }} />
        <Plus corner="br" style={{ bottom: "2rem", right: "2rem", transform: `translate(${OFF}, ${OFF})` }} />
      </div>
    </>
  );
}
