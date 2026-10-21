"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { whenBooted } from "@/lib/boot";
import { createScrambler } from "@/lib/scramble";
import ArrowLink from "@/components/ui/ArrowLink";
import CornerButton from "@/components/ui/CornerButton";
import { CV_HREF, MAIL_HREF, SOCIALS } from "@/content/socials";
import DotTrailText from "./DotTrailText";

gsap.registerPlugin(ScrollTrigger);

const RAIL = "(min-width: 62rem) and (prefers-reduced-motion: no-preference)";
const HEADLINE = "Let’s create\ngood stuff\ntogether";
const WORDMARK = "Portfolio/tretyak";
const TINTS = ["text-black/35", "text-black", "text-accent-950", "text-white"];
/** Stacked: the two share the width. On a phone the label only fits one line with less padding and tracking */
const BUTTON = "min-w-[9.875rem] whitespace-nowrap max-[767px]:min-w-0 max-[767px]:flex-1 max-sm:px-3 max-sm:tracking-normal";

const GROUPS = [...new Set(SOCIALS.map((s) => s.group))].map((group) => ({
  group,
  links: SOCIALS.filter((s) => s.group === group),
}));

function DownloadIcon() {
  return (
    <svg viewBox="0 0 11 11" fill="none" aria-hidden className="block size-[0.6875rem]">
      <path d="M5.5 1V7.5M2.5 4.5L5.5 7.5L8.5 4.5M1.5 10H9.5" stroke="currentColor" strokeLinecap="square" />
    </svg>
  );
}

/**
 * Footer docked under Worked At, as on curtisdesignr.me: it sticks to the bottom of the screen
 * underneath and shows up as the section scrolls off; each block plays its reveal once uncovered.
 * On desktop it also rises the last 4rem with the scroll.
 */
export default function Footer() {
  const dockRef = useRef<HTMLDivElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);

  // The wordmark fills the width between the guide lines
  useEffect(() => {
    const box = boxRef.current!;
    const label = box.querySelector<HTMLElement>("span > span")!;
    const ctx = document.createElement("canvas").getContext("2d")!;
    const fit = () => {
      const cs = getComputedStyle(label);
      ctx.font = `${cs.fontWeight} 100px ${cs.fontFamily}`;
      ctx.letterSpacing = "-3px";
      const m = ctx.measureText(WORDMARK.toUpperCase());
      const ink = m.actualBoundingBoxLeft + m.actualBoundingBoxRight;
      const bs = getComputedStyle(box);
      const room = box.clientWidth - parseFloat(bs.paddingLeft) - parseFloat(bs.paddingRight);
      if (ink > 0 && room > 0) box.style.fontSize = `${(100 * room) / ink}px`;
    };
    fit();
    let disposed = false;
    document.fonts?.ready.then(() => !disposed && fit());
    const ro = new ResizeObserver(fit);
    ro.observe(box);
    return () => {
      disposed = true;
      ro.disconnect();
      box.style.fontSize = "";
    };
  }, []);

  useEffect(() => {
    const dock = dockRef.current!;
    const cover = dock.previousElementSibling as HTMLElement | null;
    const root = document.documentElement;
    if (!cover) return;

    // A footer taller than the screen can't wait underneath: its top would never show
    const dockIfFits = () => (dock.style.position = dock.offsetHeight <= window.innerHeight ? "" : "relative");
    dockIfFits();
    window.addEventListener("resize", dockIfFits);

    // Orange under the header once the footer reaches it (short screens). Checked by geometry:
    // a "bottom top+=40" start lies past the end of the page here, and ScrollTrigger would clamp it to the end
    const stage = () => {
      if (cover.getBoundingClientRect().bottom <= 40) root.dataset.stage = "accent";
    };
    const stageSt = ScrollTrigger.create({ trigger: cover, start: "bottom bottom", end: "max", onUpdate: stage, onRefresh: stage });

    // Desktop: the dock rises the last 4rem as the page ends
    const mm = gsap.matchMedia();
    mm.add(RAIL, () => {
      const st = ScrollTrigger.create({
        start: () => ScrollTrigger.maxScroll(window) - dock.offsetHeight,
        end: () => ScrollTrigger.maxScroll(window),
        scrub: true,
        invalidateOnRefresh: true,
        onUpdate: (self) => {
          const sink = parseFloat(getComputedStyle(root).fontSize) * 4 * (1 - self.progress);
          dock.style.transform = sink > 0.01 && dock.style.position !== "relative" ? `translate3d(0, ${sink.toFixed(2)}px, 0)` : "";
        },
      });
      return () => {
        st.kill();
        dock.style.transform = "";
      };
    });

    // Reveals
    const links = dock.querySelectorAll<HTMLElement>("[data-reveal]");
    const word = boxRef.current!.firstElementChild as HTMLElement;
    const headline = dock.querySelector<HTMLElement>("[data-scr]")!;
    const buttons = dock.querySelector<HTMLElement>("[data-buttons]")!;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let revealSt: ScrollTrigger | null = null;
    let unwait = () => {};
    const tweens: gsap.core.Animation[] = [];

    if (!reduced) {
      const head = createScrambler(headline, { tints: TINTS });
      const labels = [...buttons.querySelectorAll<HTMLElement>("[data-label]")].map((el) => createScrambler(el, { tints: TINTS }));
      head.set(0);
      labels.forEach((s) => s.set(0));
      gsap.set(links, { opacity: 0, y: 20 });
      gsap.set(word, { yPercent: 100 });
      gsap.set(buttons.children, { autoAlpha: 0 });

      const scramble = (s: { set: (p: number) => void }, duration: number, delay = 0) => {
        const p = { v: 0 };
        tweens.push(gsap.to(p, { v: 1, duration, delay, ease: "none", onUpdate: () => s.set(p.v) }));
      };
      let pending = [
        // The box, not the wordmark: that one sits a full height below it until it plays
        { el: boxRef.current!, play: () => tweens.push(gsap.to(word, { yPercent: 0, duration: 0.9, ease: "power3.out" })) },
        {
          el: buttons,
          play: () => {
            tweens.push(gsap.to(buttons.children, { autoAlpha: 1, duration: 0.3, ease: "steps(3)", stagger: 0.15 }));
            labels.forEach((s, i) => scramble(s, 0.6, 0.15 * i));
          },
        },
        { el: headline, play: () => scramble(head, 1) },
        { el: dock.querySelector<HTMLElement>("[data-links]")!, play:() => tweens.push(gsap.to(links, { opacity: 1, y: 0, duration: 0.6, ease: "power2.out", stagger: 0.06 })) },
      ];
      // A block plays once Worked At has slid off it
      const check = () => {
        const edge = cover.getBoundingClientRect().bottom;
        pending = pending.filter(({ el, play }) => {
          const r = el.getBoundingClientRect();
          if (r.bottom < edge || r.top > window.innerHeight) return true;
          play();
          return false;
        });
        if (!pending.length) revealSt?.kill();
      };
      unwait = whenBooted(() => {
        revealSt = ScrollTrigger.create({ trigger: cover, start: "bottom bottom", end: "max", onUpdate: check, onRefresh: check });
        check();
      });
    }

    return () => {
      window.removeEventListener("resize", dockIfFits);
      stageSt.kill();
      mm.revert();
      unwait();
      revealSt?.kill();
      tweens.forEach((t) => t.kill());
      gsap.set(links, { clearProps: "opacity,transform" });
      gsap.set(word, { clearProps: "transform" });
      gsap.set(buttons.children, { clearProps: "opacity,visibility" });
      dock.style.position = "";
    };
  }, []);

  return (
    <div ref={dockRef} className="sticky bottom-0">
      <footer id="contact" data-scroll-end className="theme-accent bg-accent-600 text-black">
        {/* Below 768 two halves don't fit the buttons at the 12px floor: stacked */}
        <div className="flex max-[767px]:flex-col">
          <div className="flex min-h-[14.875rem] w-1/2 flex-col border-r border-accent-700 p-8 max-[767px]:w-full max-[767px]:border-r-0 max-[767px]:border-b sm:max-lg:min-h-[12.875rem] sm:max-lg:p-4 max-sm:min-h-[13.125rem] max-sm:p-4">
            <h2 className="text-[2.5rem] leading-[0.85] font-semibold tracking-[-0.04em] whitespace-pre-line uppercase">
              <span data-scr data-text={HEADLINE}>
                {HEADLINE}
              </span>
            </h2>
            <div data-buttons className="mt-8 flex gap-6 max-[767px]:mt-auto max-[767px]:pt-8 max-sm:gap-4">
              <CornerButton href={MAIL_HREF} className={BUTTON}>
                Shoot a message
              </CornerButton>
              <CornerButton href={CV_HREF} trailing={<DownloadIcon />} className={BUTTON}>
                Download CV
              </CornerButton>
            </div>
          </div>

          <div className="w-1/2 p-8 max-[767px]:w-full sm:max-lg:p-4 max-sm:p-4">
            <div data-links className="grid grid-cols-[auto_max-content_max-content] items-center justify-end gap-x-[3.125rem] gap-y-5 text-label leading-none font-semibold tracking-[0.1em] uppercase max-lg:grid-cols-[1fr_max-content_max-content] max-lg:justify-stretch sm:max-lg:gap-x-[1.65625rem] max-sm:gap-x-6">
              {GROUPS.map(({ group, links }) => (
                <div key={group} className="contents">
                  <span data-reveal className="text-accent-950/70">
                    {group}
                  </span>
                  {links.map((s) => (
                    <div key={s.href} data-reveal>
                      <ArrowLink label={s.label} href={s.href} className="text-black hover:text-white" />
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Wordmark; its font size is fitted to the width in JS */}
        <div ref={boxRef} className="container-x relative h-[0.96em] overflow-clip border-t border-accent-700 text-[8.6vw]">
          <DotTrailText
            text={WORDMARK}
            className="absolute inset-x-0 bottom-[0.07em] text-center leading-[0.8] font-medium tracking-[-0.03em] whitespace-nowrap uppercase"
          />
        </div>
      </footer>
    </div>
  );
}
