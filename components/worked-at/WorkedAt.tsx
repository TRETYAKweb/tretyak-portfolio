"use client";

import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { createScrambler, type Scrambler } from "@/lib/scramble";
import CrtScreen from "./CrtScreen";
import { JOBS, type Job } from "./jobs";

gsap.registerPlugin(ScrollTrigger);

const LOGOS = JOBS.map(({ key, logo }) => ({ key, src: logo }));
const MOBILE = "(max-width: 29.99rem)";
const TINTS = ["text-accent-600", "text-accent-900", "text-white", "text-dark-700"];

const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Small "+" on the screen's corners */
function Plus({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 8 8" fill="none" aria-hidden className={`pointer-events-none absolute size-2 text-dark-700 ${className}`}>
      <path d="M4.5 3.5H7V4.5H4.5V7H3.5V4.5H1V3.5H3.5V1H4.5V3.5Z" fill="currentColor" />
    </svg>
  );
}

function Row({ job, index, selected, onSelect }: { job: Job; index: number; selected: boolean; onSelect: () => void }) {
  const fill = useRef<HTMLSpanElement>(null);

  // The fill flickers twice once the hover has kicked in (as the menu items)
  const onEnter = () => {
    const el = fill.current;
    if (!el || reducedMotion()) return;
    gsap.killTweensOf(el);
    gsap
      .timeline({ delay: 0.18 })
      .to(el, { opacity: 0.15, duration: 0.07 })
      .to(el, { opacity: 1, duration: 0.07 })
      .to(el, { opacity: 0.15, duration: 0.07 })
      .to(el, { opacity: 1, duration: 0.07 })
      .set(el, { clearProps: "opacity" });
  };
  const onLeave = () => {
    if (!fill.current) return;
    gsap.killTweensOf(fill.current);
    gsap.set(fill.current, { clearProps: "opacity" });
  };

  const text = selected ? "text-black" : "text-white group-hover/row:text-black";
  const muted = selected ? "text-dark-700" : "text-dark-700 group-hover/row:text-black";

  return (
    <div data-row className="w-full">
      <button
        type="button"
        onClick={onSelect}
        onMouseEnter={onEnter}
        onMouseLeave={onLeave}
        aria-pressed={selected}
        className="group/row relative flex h-[4.25rem] w-full cursor-pointer items-center px-[1.375rem] text-left [-webkit-tap-highlight-color:transparent] max-sm:px-4 sm:max-lg:h-[max(44px,4.25rem)]"
      >
        {/* 1px stroke: the border-coloured shape with the fill cut 1px inside */}
        <span aria-hidden className="cut-row absolute inset-0 bg-border-200">
          <span
            ref={fill}
            className={`cut-row absolute inset-px transition-colors duration-200 ease-out ${selected ? "bg-white" : "bg-black group-hover/row:bg-accent-600"}`}
          />
        </span>
        <span className={`relative right-2 w-9 shrink-0 pr-3 text-right text-label leading-none font-semibold tracking-[0.13em] tabular-nums transition-colors duration-300 ${muted}`}>
          {String(index + 1).padStart(2, "0")}
        </span>
        <span className="relative flex min-w-0 flex-1 flex-col gap-1.5">
          {/* 13px floor: at 12px the name would be no bigger than the role under it */}
          <span className={`truncate text-[max(13px,1.25rem)] leading-none font-medium uppercase transition-colors duration-300 ${text}`}>
            {job.name}
          </span>
          <span className={`truncate text-label leading-none font-semibold tracking-[0.13em] uppercase transition-colors duration-300 ${muted}`}>
            {job.role}
          </span>
        </span>
        {/* Mobile accordion mark */}
        <span aria-hidden className={`relative hidden font-mono text-[1rem] leading-none max-sm:block ${selected ? "text-black" : "text-accent-600 group-hover/row:text-black"}`}>
          {selected ? "−" : "+"}
        </span>
      </button>

      {/* Mobile: the description opens under the row */}
      <div
        className={`grid transition-[grid-template-rows] duration-300 ease-out sm:hidden ${selected ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}
      >
        <div className="overflow-hidden">
          <div className={`cut-panel border border-t-0 border-border-200 bg-black px-6 pt-[1.375rem] pb-6 ${selected ? "" : "invisible"}`}>
            <p className="label mb-2 text-accent-600">{job.years}</p>
            <p className="text-[max(12px,0.875rem)] leading-[1.6] text-dark-700">{job.description}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function WorkedAt() {
  const sectionRef = useRef<HTMLElement>(null);
  const descRef = useRef<HTMLDivElement>(null);
  const [selected, setSelected] = useState(JOBS[0].key);
  // The screen keeps the last picked logo when the mobile accordion closes
  const [shown, setShown] = useState(JOBS[0].key);
  const scramblers = useRef<Record<string, Scrambler>>({});
  const descTween = useRef<gsap.core.Tween | null>(null);
  const lastDesc = useRef(JOBS[0].key);

  const select = (key: string) => {
    const mobile = window.matchMedia(MOBILE).matches;
    setSelected((cur) => (cur === key && mobile ? "" : key));
    setShown(key);
  };

  // Heading scrambles in, the rows and the screen pop in with steps (like Stats)
  useEffect(() => {
    const section = sectionRef.current!;
    const root = document.documentElement;
    const lines = [...section.querySelectorAll<HTMLElement>("[data-scr]")].map((el) => createScrambler(el, { tints: TINTS }));
    const blocks = section.querySelectorAll<HTMLElement>("[data-row], [data-screen]");
    const reduced = reducedMotion();

    // Inner guide lines would cross the screen: only the edges stay while the section is in view
    const edges = (self: ScrollTrigger) => {
      if (self.isActive) root.dataset.gridEdges = "";
      else delete root.dataset.gridEdges;
    };
    // Black under the header while the section is there (Work hands over a black screen already)
    const stage = (self: ScrollTrigger) => {
      if (self.isActive) root.dataset.stage = "";
    };
    const triggers = [
      ScrollTrigger.create({ trigger: section, start: "top 60%", end: "bottom 40%", onToggle: edges, onRefresh: edges }),
      ScrollTrigger.create({ trigger: section, start: "top top+=40", end: "bottom top+=40", onToggle: stage, onRefresh: stage }),
    ];

    const state = { p: reduced ? 1 : 0 };
    const render = () => lines.forEach((s) => s.set(state.p));
    render();
    let tl: gsap.core.Timeline | null = null;
    if (!reduced) {
      gsap.set(blocks, { autoAlpha: 0 });
      tl = gsap
        .timeline({ paused: true })
        .to(state, { p: 1, duration: 1.1, ease: "power1.out", onUpdate: render }, 0)
        .to(blocks, { autoAlpha: 1, duration: 0.45, ease: "steps(3)", stagger: 0.08 }, 0.2);
      triggers.push(
        ScrollTrigger.create({
          trigger: section,
          start: "top 55%",
          onEnter: () => tl!.play(),
          onLeaveBack: () => tl!.reverse(),
        }),
      );
    }

    return () => {
      triggers.forEach((t) => t.kill());
      tl?.kill();
      delete root.dataset.gridEdges;
    };
  }, []);

  // The description of the picked job types itself in
  useEffect(() => {
    const el = descRef.current?.querySelector<HTMLElement>(`[data-desc="${shown}"]`);
    if (!el) return;
    const s = (scramblers.current[shown] ??= createScrambler(el, { linear: true, tints: TINTS }));
    descTween.current?.kill();
    // The first one is just there (and stays so when strict mode re-runs the effect)
    const changed = lastDesc.current !== shown;
    lastDesc.current = shown;
    if (!changed || reducedMotion()) {
      s.set(1);
      return;
    }
    const state = { p: 0 };
    descTween.current = gsap.to(state, { p: 1, duration: 1.4, ease: "none", onUpdate: () => s.set(state.p) });
    return () => {
      descTween.current?.kill();
      s.set(1);
    };
  }, [shown]);

  const column = (side: Job["side"]) => (
    <div className={`flex w-full flex-col gap-[0.5625rem] max-sm:contents ${side === "left" ? "[grid-area:left]" : "[grid-area:right]"}`}>
      {JOBS.map((job, i) =>
        job.side === side ? <Row key={job.key} job={job} index={i} selected={selected === job.key} onSelect={() => select(job.key)} /> : null,
      )}
    </div>
  );

  return (
    <section
      ref={sectionRef}
      id="experience"
      aria-label="Worked at"
      // Above the docked footer, which waits under it (components/footer/Footer.tsx)
      className="container-x relative z-[1] flex min-h-svh flex-col items-center justify-center overflow-hidden bg-black pt-24 pb-12 sm:max-lg:pt-20 lg:py-8"
    >
      <div className="mb-8 flex flex-col items-center gap-6 text-center max-sm:gap-4">
        <span className="chamfer-item bg-accent-600 px-2.5 py-[0.44rem] text-label leading-none font-semibold tracking-[0.13em] text-black uppercase">
          <span data-scr data-text="I’ve been">
            I’ve been
          </span>
        </span>
        <h2 className="display text-[5rem] leading-[0.85] uppercase max-sm:text-[2.8rem] sm:max-lg:text-[4rem]">
          <span data-scr data-text="Worked at">
            Worked at
          </span>
        </h2>
      </div>

      <div className="grid w-full max-w-[87.5rem] grid-cols-1 justify-items-center gap-[0.5625rem] [grid-template-areas:'left'_'right'] sm:max-lg:grid-cols-2 sm:max-lg:items-start sm:max-lg:gap-x-6 sm:max-lg:gap-y-7 sm:max-lg:[grid-template-areas:'stage_stage'_'desc_desc'_'left_right'] lg:grid-cols-[18rem_minmax(0,1fr)_18rem] lg:items-start lg:gap-x-14 lg:gap-y-7 lg:[grid-template-areas:'left_stage_right'_'left_desc_right']">
        {column("left")}

        {/* Screen (tablet and desktop) */}
        <div
          data-screen
          className="relative aspect-[669/415] h-[min(25.9375rem,42svh)] max-w-full [grid-area:stage] max-sm:hidden"
        >
          <CrtScreen logos={LOGOS} active={shown} />
          <span aria-hidden className="absolute inset-x-1.5 top-0 h-px bg-border-200" />
          <span aria-hidden className="absolute inset-x-1.5 bottom-0 h-px bg-border-200" />
          <span aria-hidden className="absolute inset-y-1.5 left-0 w-px bg-border-200" />
          <span aria-hidden className="absolute inset-y-1.5 right-0 w-px bg-border-200" />
          <Plus className="-top-1 -left-1" />
          <Plus className="-top-1 -right-1" />
          <Plus className="-right-1 -bottom-1" />
          <Plus className="-bottom-1 -left-1" />
        </div>

        {column("right")}

        {/* All copies share one cell, so the block keeps the height of the longest */}
        <div ref={descRef} className="grid max-w-[34.5625rem] text-center leading-[1.6] text-dark-700 [grid-area:desc] max-sm:hidden" aria-live="polite">
          {JOBS.map((job) => (
            <div key={job.key} className={`[grid-area:1/1] ${job.key === shown ? "" : "invisible"}`} aria-hidden={job.key !== shown}>
              <p className="label mb-3 text-accent-600">{job.years}</p>
              <p data-desc={job.key} data-text={job.description}>
                {job.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
