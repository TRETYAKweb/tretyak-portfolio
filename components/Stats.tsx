"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { createScrambler } from "@/lib/scramble";
import DotIcon, { type IconName } from "./DotIcon";

gsap.registerPlugin(ScrollTrigger);

type Card =
  | { kind: "stat"; label: string; value: string; area: string }
  | { kind: "skill"; label: string; icon: IconName; note?: string; area: string };

// Positions on the 5×3 desktop grid: [column, row]
const CARDS: Card[] = [
  { kind: "stat", label: "Projects delivered", value: "100+", area: "md:col-start-1 md:row-start-1" },
  { kind: "skill", label: "Figma", icon: "figma", area: "md:col-start-3 md:row-start-1" },
  { kind: "skill", label: "Claude", icon: "claude", area: "md:col-start-5 md:row-start-1" },
  { kind: "stat", label: "Years of exp", value: "10+", area: "md:col-start-2 md:row-start-2" },
  { kind: "skill", label: "Webflow", icon: "webflow", area: "md:col-start-4 md:row-start-2" },
  { kind: "stat", label: "Years in-house", value: "5+", area: "md:col-start-3 md:row-start-3" },
  {
    kind: "skill",
    label: "AI visuals",
    icon: "ai",
    note: "Nano Banana · GPT Image · Midjourney",
    area: "max-md:col-span-2 md:col-start-5 md:row-start-3",
  },
];

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
      className="relative bg-accent-600 text-black md:h-svh"
    >
      <div className="container-x grid h-full grid-cols-2 gap-px pt-[7.3rem] pb-10 md:grid-cols-5 md:grid-rows-3 md:gap-0 md:pb-[2.2rem]">
        {CARDS.map((card) => (
          <article
            key={card.label}
            data-card
            className={`cut-card relative flex min-h-[11rem] flex-col justify-between bg-black/[0.09] p-4 pl-6 ${card.area}`}
          >
            <h2 className="self-end text-right text-ui font-bold tracking-[0.14em] uppercase">
              <span data-scr data-text={card.label}>
                {card.label}
              </span>
            </h2>

            {card.kind === "stat" ? (
              <p className="display text-[5.6rem] max-md:text-[3.6rem]">
                <span data-scr data-text={card.value}>
                  {card.value}
                </span>
              </p>
            ) : (
              <div className="flex items-end justify-between gap-3">
                <DotIcon name={card.icon} className="size-[5.4rem] text-black/80" />
                {card.note && (
                  <p className="max-w-[9rem] text-right text-note leading-snug font-semibold text-black/60 uppercase">
                    {card.note}
                  </p>
                )}
              </div>
            )}
          </article>
        ))}

        <div aria-hidden className="grid place-items-center max-md:hidden md:col-start-1 md:row-start-3">
          <DotIcon name="logo" resolution={30} className="size-[7rem] text-black/85" />
        </div>
      </div>
    </section>
  );
}
