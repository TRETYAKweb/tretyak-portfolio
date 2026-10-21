"use client";

import { useEffect, useRef, type MouseEvent, type RefObject } from "react";
import { gsap } from "gsap";
import ArrowLink from "@/components/ui/ArrowLink";
import CornerButton from "@/components/ui/CornerButton";
import KyivClock from "@/components/header/KyivClock";
import { getLenis } from "@/lib/lenis";
import { SOCIALS } from "@/content/socials";

/** Landing anchors; sections get these ids as they're built */
const NAV = [
  { label: "About", href: "#about" },
  { label: "Work", href: "#work" },
  { label: "Contact", href: "#contact" },
];

const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Small "+" that shows in the item's corners on hover */
function Cross({ className }: { className: string }) {
  return (
    <span
      className={`pointer-events-none absolute size-1.5 opacity-0 transition-opacity delay-40 duration-150 ease-out group-hover:opacity-100 ${className}`}
    >
      <span className="absolute top-1/2 left-0 h-px w-full -translate-y-1/2 bg-black" />
      <span className="absolute top-0 left-1/2 h-full w-px -translate-x-1/2 bg-black" />
    </span>
  );
}

function NavItem({ label, href, onNavigate }: { label: string; href: string; onNavigate: (e: MouseEvent, href: string) => void }) {
  const fill = useRef<HTMLSpanElement>(null);

  // The highlight flickers twice once it has popped in
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

  return (
    <li data-reveal>
      <a
        href={href}
        onClick={(e) => onNavigate(e, href)}
        onMouseEnter={onEnter}
        onMouseLeave={onLeave}
        className="group relative inline-flex items-center justify-center pt-[0.53rem] pr-[0.78rem] pb-[0.31rem] pl-2 [-webkit-tap-highlight-color:transparent]"
      >
        <span
          ref={fill}
          className="chamfer-item absolute inset-0 origin-center scale-[0.85] bg-accent-600 opacity-0 transition-[opacity,scale] duration-180 ease-[cubic-bezier(0.34,1.56,0.64,1)] group-hover:scale-100 group-hover:opacity-100"
        />
        <Cross className="bottom-0.5 left-0.5" />
        <Cross className="top-0.5 right-0.5" />
        <span className="relative text-[2.5rem] leading-[0.86] font-medium whitespace-nowrap text-white uppercase transition-colors duration-150 ease-out group-hover:text-black md:text-[3.5rem]">
          {label}
        </span>
      </a>
    </li>
  );
}

function SocialLink({ label, href, index }: { label: string; href: string; index: number }) {
  return (
    <div className="group/row flex items-center gap-5 max-md:gap-3">
      <span className="label shrink-0 text-accent-600 tabular-nums opacity-20 transition-opacity duration-300 ease-out group-hover/row:opacity-100">
        {String(index + 1).padStart(2, "0")}
      </span>
      <ArrowLink
        label={label}
        href={href}
        className="label min-w-0 flex-1 text-dark-700 hover:text-white"
        arrowClassName="text-accent-600"
      />
    </div>
  );
}

export default function Menu({
  open,
  onClose,
  returnFocus,
}: {
  open: boolean;
  onClose: () => void;
  /** Gets focus back when the menu closes */
  returnFocus: RefObject<HTMLButtonElement | null>;
}) {
  const root = useRef<HTMLDivElement>(null);
  const backdrop = useRef<HTMLDivElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const closeBtn = useRef<HTMLButtonElement>(null);
  const wasOpen = useRef(false);

  // Freeze page scroll while open. Unfreeze only what the menu froze itself:
  // on mount it would otherwise undo the boot lock (components/Boot.tsx)
  useEffect(() => {
    const lenis = getLenis();
    const html = document.documentElement;
    if (open) {
      if (lenis) lenis.stop();
      else html.style.overflow = "hidden";
    } else if (wasOpen.current) {
      lenis?.start();
      html.style.overflow = "";
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // Open: dim the page, slide the panel in, then stagger the content up.
  // Close: slide the panel out and fade the backdrop.
  useEffect(() => {
    const bd = backdrop.current;
    const pn = panel.current;
    const items = root.current?.querySelectorAll("[data-reveal]");
    if (!bd || !pn || !items) return;

    if (open) {
      wasOpen.current = true;
      closeBtn.current?.focus({ preventScroll: true });
      if (reducedMotion()) {
        gsap.set(bd, { opacity: 0.75 });
        gsap.set(pn, { x: 0 });
        gsap.set(items, { opacity: 1, y: 0, scale: 1 });
        return;
      }
      gsap.set(bd, { opacity: 0 });
      gsap.set(pn, { x: "100vw" });
      gsap.set(items, { opacity: 0, y: 28, scale: 0.96 });
      const tl = gsap
        .timeline()
        .to(bd, { opacity: 0.75, duration: 0.4, ease: "power2.out" }, 0)
        .to(pn, { x: 0, duration: 0.175, ease: "power2.out" }, 0)
        .to(items, { opacity: 1, y: 0, scale: 1, duration: 0.7, ease: "power2.out", stagger: 0.1 }, 0.4);
      return () => {
        tl.kill();
      };
    }

    if (!wasOpen.current) return;
    returnFocus.current?.focus({ preventScroll: true });
    const fast = reducedMotion();
    gsap.to(pn, { x: "100vw", duration: fast ? 0 : 0.2, ease: "power2.in" });
    gsap.to(bd, { opacity: 0, duration: fast ? 0 : 0.3, ease: "power2.in", delay: fast ? 0 : 0.1 });
  }, [open, returnFocus]);

  const onNavigate = (e: MouseEvent, href: string) => {
    e.preventDefault();
    onClose();
    const target = document.querySelector<HTMLElement>(href);
    if (!target) return;
    // The docked footer is sticky: its box is wherever it sticks, so go to the page end instead
    const toEnd = target.hasAttribute("data-scroll-end");
    const lenis = getLenis();
    if (lenis) {
      lenis.start();
      lenis.scrollTo(toEnd ? "bottom" : target, { duration: 1.4 });
    } else {
      document.documentElement.style.overflow = "";
      const behavior = reducedMotion() ? "auto" : "smooth";
      if (toEnd) window.scrollTo({ top: document.documentElement.scrollHeight, behavior });
      else target.scrollIntoView({ behavior });
    }
  };

  return (
    <div ref={root} id="site-menu" className="theme-dark fixed inset-0 z-[90]" inert={!open} aria-hidden={!open}>
      <div ref={backdrop} onClick={onClose} className="absolute inset-0 bg-black opacity-0" />

      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-label="Menu"
        className="chamfer absolute inset-x-(--spacing-gutter) top-[3.125rem] bottom-[3.125rem] flex max-h-[47.5rem] flex-col bg-border-200 will-change-transform md:left-auto md:w-[max(23.75rem,320px)]"
        // Off-screen until opened; GSAP owns the transform from here (not Tailwind's `translate`)
        style={{ transform: "translateX(100vw)" }}
      >
        <div
          data-lenis-prevent
          className="chamfer absolute inset-px flex flex-col overflow-y-auto overscroll-contain bg-bg-secondary p-[1.375rem]"
        >
          <div data-reveal className="flex items-start justify-between">
            <p className="label text-white">/ menu</p>
            <CornerButton ref={closeBtn} onClick={onClose}>
              Close
            </CornerButton>
          </div>

          <nav aria-label="Sections" className="mt-[4.25rem] max-md:mt-12">
            <ul className="flex flex-col items-start gap-4">
              {NAV.map((item) => (
                <NavItem key={item.href} {...item} onNavigate={onNavigate} />
              ))}
            </ul>
          </nav>

          <div className="min-h-10 flex-1" />

          <div data-reveal>
            <p className="label mb-5 text-white">Connect</p>
            <div className="grid grid-cols-2 gap-x-[1.375rem] gap-y-5">
              {SOCIALS.map((s, i) => (
                <SocialLink key={s.href} {...s} index={i} />
              ))}
            </div>
          </div>

          <div data-reveal className="label mt-6 flex items-center justify-between gap-4 border-t border-border-200 pt-[1.375rem] text-dark-700">
            <p>© 2026 Yevhenii Tretyak</p>
            <p>
              Kyiv, UA · <KyivClock />
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
