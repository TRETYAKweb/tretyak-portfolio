"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { range } from "@/lib/progress";
import { createScrambler } from "@/lib/scramble";
import CornerButton from "@/components/ui/CornerButton";
import PixelTransition, { type PixelHandle } from "@/components/ui/PixelTransition";
import WorkCard from "./WorkCard";
import { BEHANCE, BOX, DIAMOND, TRACES, TRACE_BOUNDS, WORKS } from "./works";

gsap.registerPlugin(ScrollTrigger);

/** Desktop horizontal rail; the same query as the `rail` variant in globals.css */
const RAIL = "(min-width: 62rem) and (prefers-reduced-motion: no-preference)";

// Timing measured on curtisdesignr.me (all in viewport widths)
/** The work enters from this far right while Stats (with the guide lines) leaves by the same distance */
const HANDOFF = 1.34;
/** The exit (and the black cells) starts once the box's right edge reaches this point */
const EXIT_AT = 0.75;
/** Traces are drawn up to this point of the screen */
const TIP_AT = 0.8;
/** The diamond pops in once it passes this point */
const DIAMOND_AT = 0.75;

const TINTS = ["text-black/35", "text-black", "text-accent-950", "text-white"];

const easeInOutQuad = (t: number) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);

export default function Work() {
  const sectionRef = useRef<HTMLElement>(null);
  const railRef = useRef<HTMLDivElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLDivElement>(null);
  const diamondRef = useRef<HTMLSpanElement>(null);
  const tracesRef = useRef<SVGSVGElement>(null);
  const pixels = useRef<PixelHandle>(null);
  const [gl, setGl] = useState(false);

  // WebGL covers only on the rail (the reference does the same)
  useEffect(() => {
    const mq = window.matchMedia(RAIL);
    const probe = document.createElement("canvas").getContext("webgl");
    probe?.getExtension("WEBGL_lose_context")?.loseContext();
    const update = () => setGl(mq.matches && !!probe);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    const section = sectionRef.current!;
    const root = document.documentElement;
    const heading = headingRef.current!;

    // Heading: badge, title, description and the button label scramble in one after another
    const lines = [...heading.querySelectorAll<HTMLElement>("[data-scr], [data-label]")];
    const scramblers = lines.map((el) => createScrambler(el, { tints: TINTS }));
    const cta = heading.querySelector("[data-cta]");
    const intro = gsap.timeline({ paused: true });
    scramblers.forEach((s, i) => {
      const p = { v: 0 };
      intro.to(p, { v: 1, duration: 0.7, ease: "none", onUpdate: () => s.set(p.v) }, 0.18 * i);
    });
    intro.fromTo(cta, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.3, ease: "steps(3)" }, 0.18 * (lines.length - 1));
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) intro.progress(1);
    else {
      scramblers.forEach((s) => s.set(0));
      gsap.set(cta, { autoAlpha: 0 });
    }

    const mm = gsap.matchMedia();

    // Below desktop (or with reduced motion): a plain stacked section
    mm.add(`not all and ${RAIL}`, () => {
      const play = ScrollTrigger.create({ trigger: section, start: "top 70%", once: true, onEnter: () => intro.play() });
      // Stats + Work (accent) under the header → accent stage, the black next section → dark.
      // Synced on refresh too: landing mid-way (resize from desktop, reload) crosses no edge.
      // Before the wrapper the stage belongs to Hero.
      const sync = (self: ScrollTrigger) => {
        if (self.progress >= 1) root.dataset.stage = "";
        else if (self.progress > 0) root.dataset.stage = "accent";
      };
      const stage = ScrollTrigger.create({
        trigger: section.parentElement,
        start: "top top",
        endTrigger: section,
        end: "bottom top+=40",
        onToggle: sync,
        onRefresh: sync,
      });
      return () => {
        play.kill();
        stage.kill();
      };
    });

    // Desktop: Stats hands over sideways, the rail pans, black cells close the section
    mm.add(RAIL, () => {
      const rail = railRef.current!;
      const box = boxRef.current!;
      const diamond = diamondRef.current!;
      const stats = document.querySelector<HTMLElement>("[data-handoff]");
      const guides = document.querySelector<HTMLElement>("[data-guides]");
      const paths = [...tracesRef.current!.querySelectorAll("path")].map((el) => {
        const len = el.getTotalLength();
        // x along the path (it never goes left), to find how much of it lies left of the tip
        const xs = new Float64Array(721);
        for (let i = 0; i <= 720; i++) xs[i] = el.getPointAtLength((i / 720) * len).x;
        el.style.strokeDasharray = String(len);
        el.style.strokeDashoffset = String(len);
        return { el, len, xs };
      });

      // Scroll distances of the phases, px
      const d = { handoff: 0, pan: 0, approach: 0, exit: 0, total: 0, unit: 1, boxLeft: 0 };
      const measure = () => {
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        d.unit = box.offsetWidth / BOX.w;
        d.boxLeft = box.offsetLeft;
        // Right grid line = the gutter in from the edge (the heading sits on the left one)
        const rightLine = vw - heading.offsetLeft;
        d.handoff = (vw * HANDOFF) / 0.94;
        d.pan = Math.max(0, d.boxLeft + box.offsetWidth - rightLine);
        d.approach = Math.max(0, rightLine - EXIT_AT * vw);
        d.exit = Math.max(vh, EXIT_AT * vw);
        d.total = d.handoff + d.pan + d.approach + d.exit + 0.6 * vh;
        section.style.height = `${vh + d.total}px`;
      };
      measure();
      ScrollTrigger.addEventListener("refreshInit", measure);

      let introPlayed = false;
      let diamondShown = false;
      const render = (p: number) => {
        const vw = window.innerWidth;
        const { handoff, pan, approach, exit, total, unit } = d;
        const t1 = handoff / total;
        const t2 = (handoff + pan) / total;
        const t3 = (handoff + pan + approach) / total;
        const t4 = (handoff + pan + approach + exit) / total;

        // Handoff: Stats leaves and the work comes in at the same speed, by 1.34 viewports (eased, after a 6% pause)
        const h = easeInOutQuad(Math.max(0, (range(p, 0, t1) - 0.06) / 0.94));
        if (h >= 0.3 && !introPlayed) {
          introPlayed = true;
          intro.play(0);
        }
        const enter = Math.round((1 - h) * vw * HANDOFF);
        const out = range(p, t3, t4);
        const shift = -(pan * range(p, t1, t2) + approach * range(p, t2, t3) + EXIT_AT * vw * out);
        const x = enter + shift;
        rail.style.transform = `translate3d(${x}px, 0, 0)`;
        const leave = h ? `translate3d(${-Math.round(h * vw * HANDOFF)}px, 0, 0)` : "";
        if (stats) stats.style.transform = leave;
        // The guide lines belong to Stats here (as on the reference); they come back on the black
        if (guides) guides.style.transform = out < 0.5 ? leave : "";

        // Traces grow up to TIP_AT of the screen
        const boxX = d.boxLeft + x;
        const tip = (TIP_AT * vw - boxX) / unit;
        for (const path of paths) {
          let lo = 0;
          let hi = 720;
          while (lo < hi) {
            const mid = (lo + hi) >> 1;
            if (path.xs[mid] >= tip) hi = mid;
            else lo = mid + 1;
          }
          path.el.style.strokeDashoffset = String(path.len - (lo / 720) * path.len);
        }
        if (!diamondShown && boxX + DIAMOND.x * unit <= DIAMOND_AT * vw) {
          diamondShown = true;
          gsap.fromTo(diamond, { scale: 0 }, { scale: 1, duration: 0.35, ease: "power2.out" });
        }

        pixels.current?.setProgress(out);
        // Once the guide lines are off screen they stay hidden: the traces replace them
        if (h >= 1 && out < 0.5) root.dataset.grid = "off";
        else delete root.dataset.grid;
        // Before the pin the stage belongs to Hero / Stats
        if (p > 0) root.dataset.stage = out >= 0.5 ? "" : "accent";
      };

      const state = { p: 0 };
      const tween = gsap.to(state, { p: 1, ease: "none", paused: true, onUpdate: () => render(state.p) });
      const st = ScrollTrigger.create({
        trigger: section,
        start: "top top",
        end: "bottom bottom",
        scrub: 1,
        animation: tween,
        invalidateOnRefresh: true,
        onRefresh: () => render(state.p),
      });
      ScrollTrigger.refresh();

      return () => {
        st.kill();
        tween.kill();
        ScrollTrigger.removeEventListener("refreshInit", measure);
        section.style.height = "";
        rail.style.transform = "";
        if (stats) stats.style.transform = "";
        if (guides) guides.style.transform = "";
        gsap.set(diamond, { clearProps: "transform" });
        paths.forEach(({ el }) => {
          el.style.strokeDasharray = "";
          el.style.strokeDashoffset = "";
        });
        pixels.current?.setProgress(0);
        delete root.dataset.grid;
      };
    });

    return () => {
      mm.revert();
      intro.kill();
    };
  }, []);

  return (
    <section
      ref={sectionRef}
      id="work"
      aria-label="Selected work"
      className="relative z-10 bg-accent-600 text-black max-sm:pt-12 max-sm:pb-16 sm:max-lg:pt-16 sm:max-lg:pb-28 lg:pt-28 lg:pb-32 rail:-mt-[100svh] rail:bg-transparent rail:p-0"
    >
      {/* Desktop: a pinned viewport that lets Stats show through until the rail covers it */}
      <div
        style={{ "--box-x": BOX.x, "--box-w": BOX.w, "--box-h": BOX.h } as CSSProperties}
        className="rail:pointer-events-none rail:sticky rail:top-0 rail:h-svh rail:overflow-hidden rail:[--u:min(0.0625rem,calc((100svh-8.75rem)/var(--box-h)))]"
      >
        <div ref={railRef} className="container-x rail:absolute rail:inset-0 rail:px-0">
          {/* Heading + button */}
          <div
            ref={headingRef}
            className="flex flex-col items-start gap-6 rail:pointer-events-auto rail:absolute rail:top-[7.3rem] rail:left-(--spacing-gutter) rail:z-10 rail:w-[calc(451*var(--u))] rail:gap-10"
          >
            <div className="flex flex-col items-start gap-4 rail:gap-8">
              <span className="chamfer-item bg-black px-2.5 py-[0.44rem] text-label leading-none font-semibold tracking-[0.13em] text-accent-600 uppercase">
                <span data-scr data-text="Keep scrolling">
                  Keep scrolling
                </span>
              </span>
              <h2 className="display text-[5rem] leading-[0.85] uppercase max-sm:text-[2.6rem] sm:max-lg:text-[3.6rem]">
                <span data-scr data-text="Selected Work">
                  Selected Work
                </span>
              </h2>
              {/* TODO: content */}
              <p className="text-black/60">
                <span data-scr data-text="Sites I designed and shipped.">
                  Sites I designed and shipped.
                </span>
              </p>
            </div>
            <div data-cta>
              <CornerButton href={BEHANCE} className="min-w-[10rem]">
                Explore More
              </CornerButton>
            </div>
          </div>

          {/* Cards (+ traces and the diamond on the rail) */}
          <div
            ref={boxRef}
            className="mt-12 grid gap-x-6 gap-y-10 max-sm:mt-10 max-sm:gap-y-8 sm:grid-cols-2 lg:mt-16 lg:grid-cols-3 lg:gap-x-8 lg:gap-y-14 rail:absolute rail:top-[calc(4.75rem+(100svh-4.75rem-var(--box-h)*var(--u))/2)] rail:left-[calc(var(--box-x)*var(--u))] rail:mt-0 rail:block rail:h-[calc(var(--box-h)*var(--u))] rail:w-[calc(var(--box-w)*var(--u))]"
          >
            <svg
              ref={tracesRef}
              aria-hidden
              viewBox={`${TRACE_BOUNDS.x} 0 ${TRACE_BOUNDS.w} ${BOX.h}`}
              style={{ "--tx": TRACE_BOUNDS.x, "--tw": TRACE_BOUNDS.w } as CSSProperties}
              className="pointer-events-none absolute top-0 left-[calc(var(--tx)*var(--u))] hidden h-full w-[calc(var(--tw)*var(--u))] overflow-visible rail:block"
            >
              {TRACES.map((d) => (
                <path key={d} d={d} fill="none" strokeWidth={2} strokeLinecap="square" className="stroke-accent-700" />
              ))}
            </svg>
            <span
              aria-hidden
              style={{ "--dx": DIAMOND.x, "--dy": DIAMOND.y, "--ds": DIAMOND.side, "--dd": DIAMOND.dot } as CSSProperties}
              className="absolute top-[calc(var(--dy)*var(--u))] left-[calc(var(--dx)*var(--u))] hidden rail:block"
            >
              {/* Scaled by GSAP: the start state is inline, not a Tailwind scale class */}
              <span ref={diamondRef} style={{ transform: "scale(0)" }} className="absolute top-0 left-0 block">
                <span className="absolute size-[calc(var(--ds)*var(--u))] -translate-1/2 rotate-45 border border-black" />
                <span className="absolute size-[calc(var(--dd)*var(--u))] -translate-1/2 rotate-45 bg-black" />
              </span>
            </span>
            {WORKS.map((work) => (
              <WorkCard key={work.id} work={work} gl={gl} />
            ))}
          </div>
        </div>

        {/* Exit: black cells close the section (desktop) */}
        <div className="hidden rail:block">
          <PixelTransition ref={pixels} fill="var(--color-black)" flash="var(--color-accent-950)" />
        </div>
      </div>
    </section>
  );
}
