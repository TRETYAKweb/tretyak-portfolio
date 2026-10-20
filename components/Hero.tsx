"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { createScrambler, type Scrambler } from "@/lib/scramble";
import PortraitCanvas, { type PortraitHandle } from "./PortraitCanvas";
import PixelTransition, { type PixelHandle } from "./PixelTransition";

gsap.registerPlugin(ScrollTrigger);

type Group = "intro" | "manifesto" | "quote";

/** Scramble-able text chunk. */
function S({
  children,
  group,
  className = "",
  tint,
}: {
  children: string;
  group: Group;
  className?: string;
  tint?: "dark";
}) {
  return (
    <span data-scr={group} data-text={children} data-tint={tint} className={className}>
      {children}
    </span>
  );
}

const MANIFESTO: { words: string[]; indent?: boolean }[] = [
  { words: ["Good", "design", "is"] },
  { words: ["never", "an"] },
  { words: ["accident.", "It's"] },
  { words: ["built", "on", "research,"] },
  { words: ["prototypes,"], indent: true },
  { words: ["Webflow", "builds,"], indent: true },
  { words: ["&", "one", "too", "many"] },
];

const DARK_TINTS = ["text-black/40", "text-black", "text-accent-950"];

/** Idle portrait glitch: a short burst every ~GLITCH_EVERY seconds (± GLITCH_JITTER). */
const GLITCH_EVERY = 8;
const GLITCH_JITTER = 1.5;
const GLITCH_FIRST = 3;

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const range = (p: number, from: number, to: number) => clamp01((p - from) / (to - from));

function PixelArrow({ className = "" }: { className?: string }) {
  // 7x5 dot-matrix arrow
  const cells = [
    [4, 0],
    [5, 1],
    [0, 2], [1, 2], [2, 2], [3, 2], [4, 2], [5, 2], [6, 2],
    [5, 3],
    [4, 4],
  ];
  return (
    <svg viewBox="0 0 7 5" className={className} aria-hidden>
      {cells.map(([x, y]) => (
        <rect key={`${x}-${y}`} x={x + 0.08} y={y + 0.08} width={0.84} height={0.84} fill="currentColor" />
      ))}
    </svg>
  );
}

export default function Hero() {
  const sectionRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const portrait = useRef<PortraitHandle>(null);
  const pixels = useRef<PixelHandle>(null);
  const portraitWrap = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const section = sectionRef.current!;
    const stage = stageRef.current!;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const groups: Record<Group, Scrambler[]> = { intro: [], manifesto: [], quote: [] };
    section.querySelectorAll<HTMLElement>("[data-scr]").forEach((el) => {
      const tints = el.dataset.tint === "dark" ? DARK_TINTS : undefined;
      groups[el.dataset.scr as Group].push(createScrambler(el, { tints }));
    });

    const arrow = section.querySelector<HTMLElement>("[data-quote-arrow]");
    const fades = section.querySelectorAll<HTMLElement>("[data-fade]");
    const hint = section.querySelector<HTMLElement>("[data-scroll-hint]");
    const narrow = window.matchMedia("(max-width: 991px)");
    const state = { intro: reduced ? 1 : 0, scroll: 0 };

    const render = () => {
      const p = state.scroll;
      const out = range(p, 0.02, 0.17);
      const stagger = (list: Scrambler[], from: number, spread: number, width: number, v: number) =>
        list.forEach((s, i) => {
          const start = from + (i / list.length) * spread;
          s.set(range(v, start, start + width));
        });

      groups.intro.forEach((s, i) => {
        const start = (i / groups.intro.length) * 0.3;
        s.set(Math.min(state.intro, 1 - range(out, start, start + 0.7)));
      });
      const introVisible = clamp01(Math.min(state.intro, 1 - out) * 2.5);
      fades.forEach((el) => (el.style.opacity = String(introVisible)));
      // Scroll hint leaves first: fades and slides down on the very first scroll
      const hintOut = range(p, 0.003, 0.04);
      if (hint) {
        hint.style.opacity = String(Math.min(introVisible, 1 - hintOut));
        hint.style.transform = `translateY(${hintOut * 1.5}rem)`;
      }
      stagger(groups.manifesto, 0.15, 0.14, 0.12, p);
      stagger(groups.quote, 0.42, 0.12, 0.1, p);
      if (arrow) arrow.style.opacity = p > 0.47 ? "1" : "0";

      // Below desktop the manifesto sits on top of the face — dim the photo behind it
      if (portraitWrap.current && narrow.matches)
        portraitWrap.current.style.opacity = String(1 - 0.65 * range(p, 0.1, 0.18));
      pixels.current?.setProgress(range(p, 0.7, 0.97));

      document.documentElement.dataset.stage = p > 0.9 ? "accent" : "";
    };

    render();
    stage.style.visibility = "visible";

    const intro = gsap.to(state, {
      intro: 1,
      duration: reduced ? 0 : 1.6,
      delay: 0.2,
      ease: "power2.out",
      onUpdate: render,
    });

    const bob = gsap.to(section.querySelector("[data-scroll-arrow]"), {
      y: 6,
      duration: 0.6,
      ease: "steps(3)",
      repeat: -1,
      yoyo: true,
      paused: reduced,
    });

    // Looping glitch burst on the portrait, independent of scroll
    const glitch = { v: 0 };
    const applyGlitch = () => portrait.current?.setGlitch(glitch.v);
    let burst: gsap.core.Timeline | undefined;
    const nextDelay = () => gsap.utils.random(GLITCH_EVERY - GLITCH_JITTER, GLITCH_EVERY + GLITCH_JITTER);
    const scheduleBurst = (delay: number) => {
      burst = gsap
        .timeline({ delay, onComplete: () => scheduleBurst(nextDelay()) })
        .to(glitch, { v: 0.5, duration: 0.12, ease: "steps(3)", onUpdate: applyGlitch })
        // Hold with flicker: random strength every frame
        .to(glitch, {
          v: 0.4,
          duration: 0.6,
          ease: "none",
          onUpdate: () => portrait.current?.setGlitch(glitch.v * gsap.utils.random(0.5, 1.2)),
        })
        .to(glitch, { v: 0, duration: 0.18, ease: "steps(3)", onUpdate: applyGlitch });
    };
    if (!reduced) scheduleBurst(GLITCH_FIRST);

    const st = ScrollTrigger.create({
      trigger: section,
      start: "top top",
      end: "bottom bottom",
      onUpdate: (self) => {
        state.scroll = self.progress;
        render();
      },
    });

    return () => {
      intro.kill();
      bob.kill();
      burst?.kill();
      st.kill();
      delete document.documentElement.dataset.stage;
    };
  }, []);

  return (
    <section id="top" ref={sectionRef} className="relative h-[520vh] bg-black max-md:h-[440vh]">
      <div ref={stageRef} className="invisible sticky top-0 h-svh overflow-hidden">
        <div ref={portraitWrap} className="absolute inset-0">
          <PortraitCanvas
            ref={portrait}
            className="absolute bottom-0 left-[24%] h-[86%] w-[76%] mask-[linear-gradient(to_bottom,black_70%,transparent_98%)] max-sm:left-0 max-sm:h-[70%] max-sm:w-full max-sm:opacity-70 sm:max-lg:left-[22%] sm:max-lg:h-[78%] sm:max-lg:w-[78%]"
          />
        </div>

        <div className="container-x absolute inset-0 grid grid-cols-2 content-start lg:grid-cols-5">
          {/* Contacts */}
          <div data-fade className="col-span-2 mt-[6.9rem] self-start border-l-2 border-accent-600 pl-4 max-sm:mt-[5.5rem] sm:max-lg:col-span-1 sm:max-lg:whitespace-nowrap">
            <a href="mailto:tretyakbro@gmail.com" className="label block text-dark-800 transition-colors hover:text-white">
              <S group="intro">tretyakbro@gmail.com</S>
            </a>
            <a
              href="https://t.me/tretyak_bro"
              target="_blank"
              rel="noreferrer"
              className="label block text-dark-800 transition-colors hover:text-white"
            >
              <S group="intro">Telegram — @tretyak_bro</S>
            </a>
          </div>

          {/* From UA */}
          <div className="col-start-5 mt-[6.9rem] flex items-start justify-between max-sm:hidden sm:max-lg:col-start-2 sm:max-lg:justify-end sm:max-lg:gap-8">
            <span className="label text-dark-800">
              <S group="intro">From</S>
            </span>
            <span className="display -mt-2 text-[5.2rem] sm:max-lg:text-[4.5rem]">
              <S group="intro">UA</S>
            </span>
          </div>

          {/* Bio */}
          <p className="col-span-2 row-start-2 mt-[5rem] indent-[50%] text-[1.15rem] leading-[1.45] text-dark-800 max-sm:mt-8 max-sm:indent-0 max-sm:text-base sm:max-lg:mt-12 sm:max-lg:w-[75%] sm:max-lg:indent-[33%] sm:max-lg:text-[1.35rem]">
            <S group="intro">I design interfaces people </S>
            <S group="intro" className="text-accent-600 italic">
              enjoy
            </S>
            <S group="intro"> and build them in </S>
            <S group="intro" className="text-accent-400">
              {"<Webflow/>"}
            </S>
            <S group="intro">. 10+ years turning ideas into pixel-perfect, responsive products.</S>
          </p>
        </div>

        {/* Name */}
        <div className="container-x absolute inset-x-0 bottom-[5vh] grid grid-cols-2 lg:grid-cols-5">
          {/* Tag: top edge = top of "Yevhenii", left edge = left of "Tretyak".
              Below 1350 the 12px floor no longer fits it in one column with a gap, so it moves above "Yevhenii" */}
          <div className="col-span-1 self-start max-[1349px]:col-span-full max-[1349px]:pb-4 min-[1350px]:mt-[0.75rem]">
            <span data-fade className="tag inline-block bg-accent-600 px-2.5 py-1.5 text-label font-bold tracking-[0.1em] whitespace-nowrap text-black uppercase">
              <S group="intro" tint="dark">
                UI/UX Designer & Webflow Dev
              </S>
            </span>
          </div>
          <h1 className="sr-only">Yevhenii Tretyak — UI/UX Designer & Webflow Developer</h1>
          {/* Desktop: "Yevhenii" always starts on the second grid line, even when the tag sits above it */}
          <div className="col-span-4 max-lg:col-span-2 lg:col-start-2">
            {/* Label: right edge = right of "Yevhenii", baseline = baseline of "Tretyak" (one line below) */}
            <span aria-hidden className="display relative block w-fit text-[7.2rem] uppercase max-sm:text-[3.9rem] sm:max-lg:text-[8rem]">
              <S group="intro">Yevhenii</S>
              <span className="label absolute right-0 -bottom-[6.18rem] text-dark-800 max-lg:hidden">
                <S group="intro">Who ships in Webflow</S>
              </span>
            </span>
          </div>
          <span aria-hidden className="display col-span-3 self-baseline text-[7.2rem] uppercase max-lg:col-span-2 max-sm:text-[3.9rem] sm:max-lg:text-[8rem]">
            <S group="intro">Tretyak</S>
          </span>
          {/* Year: left edge = grid line under "Kyiv, UA", baseline = baseline of "Tretyak" */}
          <span aria-hidden className="display col-start-4 self-baseline text-[2.4rem] max-lg:hidden">
            <S group="intro">96’</S>
          </span>
        </div>

        {/* Manifesto */}
        <div className="container-x pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 max-sm:top-[42%] sm:max-lg:top-[45%]">
          <p className="display w-[calc(40%+1px)] text-[3.45rem] uppercase max-sm:w-full max-sm:text-[1.95rem] sm:max-lg:w-[76%] sm:max-lg:text-[3.6rem]">
            {MANIFESTO.map((line, i) => (
              <span key={i} className={`flex justify-between gap-[0.3em] ${line.indent ? "pl-[18%]" : ""}`}>
                {line.words.map((word) => (
                  <S key={word} group="manifesto">
                    {word}
                  </S>
                ))}
              </span>
            ))}
          </p>
        </div>

        {/* Quote */}
        <div className="container-x pointer-events-none absolute inset-x-0 bottom-[6vh] flex justify-end max-sm:bottom-[8vh] sm:max-lg:bottom-[7vh]">
          <p className="display flex items-end gap-[0.25em] text-[3.45rem] whitespace-nowrap uppercase max-sm:text-[1.75rem] sm:max-lg:text-[3rem]">
            <S group="quote">“Just one</S>
            <span data-quote-arrow className="mb-[0.08em] opacity-0">
              <S group="quote" className="sr-only">
                →
              </S>
              <PixelArrow className="h-[0.5em] w-[0.7em] text-accent-600" />
            </span>
            <S group="quote" className="mb-[0.9em]">
              more
            </S>
            <S group="quote" className="mb-[1.8em] text-accent-600">
              pixel”
            </S>
          </p>
        </div>

        {/* Scroll hint */}
        <div data-scroll-hint className="container-x pointer-events-none absolute right-0 bottom-[5vh] flex flex-col items-center gap-3 max-sm:hidden">
          <span className="label text-dark-700 [writing-mode:vertical-rl]">
            <S group="intro">Scroll down</S>
          </span>
          <span data-scroll-arrow className="flex flex-col text-accent-600">
            <PixelArrow className="h-2 w-3 rotate-90" />
          </span>
        </div>

        <PixelTransition ref={pixels} />
      </div>
    </section>
  );
}
