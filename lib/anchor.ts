import { getLenis } from "@/lib/lenis";

/**
 * Scroll position of a landing anchor.
 * - `data-scroll-end`: the docked footer is sticky, its box is wherever it sticks → the page end.
 * - A sticky target (Stats) is measured by its wrapper: its own box moves while it sticks.
 *   It has to be the wrapper's first child.
 * - `data-scroll-offset` (px) is added on top: Work starts under Stats and sets it to the handoff length.
 */
function anchorY(target: HTMLElement) {
  const html = document.documentElement;
  if (target.hasAttribute("data-scroll-end")) return html.scrollHeight - window.innerHeight;
  const box = getComputedStyle(target).position === "sticky" ? (target.parentElement ?? target) : target;
  const top = box.getBoundingClientRect().top + window.scrollY;
  return Math.max(0, top + (Number(target.dataset.scrollOffset) || 0));
}

/** Smooth-scrolls to `#id` through Lenis, or natively without it (reduced motion). */
export function scrollToAnchor(href: string) {
  const target = document.querySelector<HTMLElement>(href);
  if (!target) return;
  const y = anchorY(target);
  const lenis = getLenis();
  if (lenis) lenis.scrollTo(y, { duration: 1.4 });
  else window.scrollTo({ top: y, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
}
