"use client";

import { useEffect, useRef, type ComponentProps } from "react";
import { gsap } from "gsap";
import { createScrambler, type Scrambler } from "@/lib/scramble";

/** Corner brackets; on hover each one slides out along its diagonal (as on curtisdesignr.me) */
const CORNERS = [
  "top-0 left-0 border-t border-l group-hover:-translate-x-[0.19rem] group-hover:-translate-y-[0.19rem]",
  "top-0 right-0 border-t border-r group-hover:translate-x-[0.19rem] group-hover:-translate-y-[0.19rem]",
  "right-0 bottom-0 border-r border-b group-hover:translate-x-[0.19rem] group-hover:translate-y-[0.19rem]",
  "bottom-0 left-0 border-b border-l group-hover:-translate-x-[0.19rem] group-hover:translate-y-[0.19rem]",
];

type Props = Omit<ComponentProps<"button">, "children"> & {
  children: string;
  /** Renders an external link (new tab) instead of a button */
  href?: string;
};

/**
 * Bracketed button: hover fills the background, scrambles the label into the accent
 * and pushes the corners out. Colors come from the stage vars (--btn-bg, --fg, --marker).
 */
export default function CornerButton({ children, className = "", href, ...props }: Props) {
  const label = useRef<HTMLSpanElement>(null);
  const corners = useRef<HTMLSpanElement>(null);
  const scrambler = useRef<Scrambler | null>(null);
  const tween = useRef<gsap.core.Tween | null>(null);

  useEffect(() => {
    if (label.current) scrambler.current = createScrambler(label.current, { solid: true });
    return () => {
      tween.current?.kill();
    };
  }, [children]);

  const onEnter = () => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (corners.current) gsap.fromTo(corners.current.children, { opacity: 0.3 }, { opacity: 1, duration: 0.05, ease: "none" });
    const s = scrambler.current;
    if (!s) return;
    const state = { p: 0 };
    tween.current?.kill();
    tween.current = gsap.to(state, { p: 1, duration: 0.45, ease: "none", onUpdate: () => s.set(state.p) });
  };

  const onLeave = () => {
    tween.current?.kill();
    scrambler.current?.set(1);
  };

  const classes = `group relative cursor-pointer px-5 py-2.5 text-ui font-semibold tracking-wider uppercase [-webkit-tap-highlight-color:transparent] ${className}`;
  const inner = (
    <>
      <span className="absolute inset-0 bg-(--btn-bg) backdrop-blur-sm transition-colors duration-200 group-hover:bg-(--btn-bg-hover) group-hover:duration-150" />
      {/* The scramble rewrites these nodes mid-click; Chrome drops the click if mousedown hit a removed node */}
      <span
        ref={label}
        data-label
        className="pointer-events-none relative text-(--fg) transition-colors duration-200 group-hover:text-accent-600 group-hover:duration-500 group-hover:ease-linear"
      >
        {children}
      </span>
      <span ref={corners} className="pointer-events-none absolute inset-0">
        {CORNERS.map((pos) => (
          <span
            key={pos}
            className={`absolute size-1.5 border-(--marker) transition-[translate,border-color] duration-250 ease-out group-hover:duration-200 ${pos}`}
          />
        ))}
      </span>
    </>
  );

  if (href)
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        onMouseEnter={onEnter}
        onMouseLeave={onLeave}
        className={`inline-block text-center ${classes}`}
      >
        {inner}
      </a>
    );

  return (
    <button type="button" onMouseEnter={onEnter} onMouseLeave={onLeave} className={classes} {...props}>
      {inner}
    </button>
  );
}
