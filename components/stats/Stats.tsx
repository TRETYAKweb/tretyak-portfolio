"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { createScrambler } from "@/lib/scramble";
import DotIcon, { type IconName } from "./DotIcon";
import LogoVoxel from "./LogoVoxel";

gsap.registerPlugin(ScrollTrigger);

type Card =
  | { kind: "stat"; label: string; value: string; area: string }
  | { kind: "skill"; label: string; icon: IconName; note?: string; area: string };

// Below desktop the cards go in this order on two columns (stats first, like the reference);
// `area` places them on the 5×3 desktop grid
const CARDS: Card[] = [
  { kind: "stat", label: "Projects delivered", value: "100+", area: "lg:col-start-1 lg:row-start-1" },
  { kind: "stat", label: "Years of exp", value: "10+", area: "lg:col-start-2 lg:row-start-2" },
  { kind: "stat", label: "Years in-house", value: "7+", area: "lg:col-start-3 lg:row-start-3" },
  { kind: "skill", label: "Figma", icon: "figma", area: "lg:col-start-3 lg:row-start-1" },
  { kind: "skill", label: "Claude", icon: "claude", area: "lg:col-start-5 lg:row-start-1" },
  { kind: "skill", label: "Webflow", icon: "webflow", area: "lg:col-start-4 lg:row-start-2" },
  {
    kind: "skill",
    label: "AI visuals",
    icon: "ai",
    note: "Nano Banana · GPT Image · Midjourney",
    area: "lg:col-start-5 lg:row-start-3",
  },
];

// Hover (desktop only, like the reference): the card goes black, text and icon turn orange
const HOVER_TEXT = "transition-colors duration-200 lg:group-hover/card:text-accent-600";

const TINTS = ["text-black/35", "text-black", "text-accent-950", "text-white"];

export default function Stats() {
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const section = sectionRef.current!;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const scramblers = [...section.querySelectorAll<HTMLElement>("[data-scr]")].map((el) =>
      createScrambler(el, { tints: TINTS }),
    );
    const cards = section.querySelectorAll<HTMLElement>("[data-card]");
    const state = { p: reduced ? 1 : 0 };
    const render = () => scramblers.forEach((s) => s.set(state.p));
    render();
    if (reduced) return;

    gsap.set(cards, { autoAlpha: 0 });

    const tl = gsap.timeline({ paused: true });
    tl.to(cards, { autoAlpha: 1, duration: 0.45, ease: "steps(3)", stagger: { each: 0.07, from: "random" } }, 0);
    tl.to(state, { p: 1, duration: 1.3, ease: "power1.out", onUpdate: render }, 0.15);

    const st = ScrollTrigger.create({
      trigger: section,
      start: "top 55%",
      onEnter: () => tl.play(),
      onLeaveBack: () => tl.reverse(),
    });

    return () => {
      st.kill();
      tl.kill();
    };
  }, []);

  return (
    <section
      ref={sectionRef}
      id="stats"
      aria-label="Experience and tools"
      // Desktop: stays put while Selected Work slides in over it (see components/work/Work.tsx)
      className="relative bg-accent-600 text-black lg:h-svh rail:sticky rail:top-0"
    >
      {/* Work moves this sideways during the handoff */}
      <div data-handoff className="container-x grid h-full grid-cols-2 gap-4 pt-[7.3rem] pb-10 max-sm:gap-3 max-sm:pt-[5.5rem] lg:grid-cols-5 lg:grid-rows-3 lg:gap-0 lg:pb-[2.2rem]">
        {CARDS.map((card) => (
          <article
            key={card.label}
            data-card
            className={`group/card cut-card relative flex min-h-[11rem] flex-col justify-between gap-4 bg-black/[0.09] p-4 pl-6 transition-colors duration-200 max-sm:min-h-[8.5rem] max-sm:p-3 max-sm:pl-5 sm:max-lg:min-h-[14rem] lg:hover:bg-black ${card.area}`}
          >
            {/* Corner notch that shows up on hover */}
            <span
              aria-hidden
              className="absolute top-4 left-6 size-[0.9rem] bg-accent-600 opacity-0 transition-opacity duration-150 [clip-path:polygon(0_0,100%_0,0_100%)] lg:group-hover/card:opacity-100"
            />
            <h2 className={`self-end text-right text-ui font-bold tracking-[0.14em] uppercase max-sm:tracking-[0.08em] ${HOVER_TEXT}`}>
              <span data-scr data-text={card.label}>
                {card.label}
              </span>
            </h2>

            {card.kind === "stat" ? (
              <p className={`display text-[5.6rem] max-sm:text-[2.6rem] sm:max-lg:text-[3.8rem] ${HOVER_TEXT}`}>
                <span data-scr data-text={card.value}>
                  {card.value}
                </span>
              </p>
            ) : (
              // Mobile: the note goes under the icon, next to it there is no room at the 12px floor
              <div className="flex items-end justify-between gap-3 max-sm:flex-col max-sm:items-start">
                <DotIcon name={card.icon} className={`size-[5.4rem] text-black/80 max-sm:size-[3.4rem] ${HOVER_TEXT}`} />
                {card.note && (
                  <p className="max-w-[9rem] text-right text-note leading-snug font-semibold text-black/60 uppercase transition-colors duration-200 max-sm:text-left lg:group-hover/card:text-accent-600/70">
                    {card.note}
                  </p>
                )}
              </div>
            )}
          </article>
        ))}

        {/* Logo: the last empty cell below desktop, bottom-left cell on desktop */}
        <div className="grid place-items-center lg:col-start-1 lg:row-start-3">
          <LogoVoxel className="h-[11rem] w-[9rem] text-black max-sm:h-[7.5rem] max-sm:w-[6rem] sm:max-lg:h-[12rem]" />
        </div>
      </div>
    </section>
  );
}
