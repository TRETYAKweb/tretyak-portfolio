export const BEHANCE = "https://www.behance.net/tretyak_design";

export type Work = {
  id: string;
  /** Company name, not the Behance project title */
  title: string;
  tag: string;
  href: string;
  /** Desktop rail: top-left corner inside the box, in box units */
  x: number;
  y: number;
  size: "lg" | "sm";
};

/** Covers are Behance thumbnails (808×632); `public/img/work/<id>.jpg` */
export const COVER_RATIO = 808 / 632;

/** Card width in box units. 1 box unit = 1px on a 1440 screen (shrinks on short screens) */
export const CARD_W = { lg: 440, sm: 325 } as const;
/** Gap + title row under the cover */
const LABEL_H = 37;

export const WORKS: Work[] = [
  {
    id: "noir-tattoo",
    title: "Noir Tattoo",
    tag: "Landing page",
    href: "https://www.behance.net/gallery/243370173/Landing-Page-UIUX-Website-Design-for-Tattoo-Artist",
    x: 0,
    y: 412,
    size: "lg",
  },
  {
    id: "nexlify",
    title: "Nexlify",
    tag: "Web design",
    href: "https://www.behance.net/gallery/228195153/Cloud-Server-Hosting-Platform-UIUX-Website-Design",
    x: 451,
    y: 15,
    size: "lg",
  },
  {
    id: "steel-vanguard",
    title: "Steel Vanguard",
    tag: "E-commerce",
    href: "https://www.behance.net/gallery/223528757/SteelVanguard-Tactical-Gear-E-Commerce-Design",
    x: 712,
    y: 505,
    size: "sm",
  },
  {
    id: "okhota-partners",
    title: "Okhota & Partners",
    tag: "Redesign",
    href: "https://www.behance.net/gallery/223109857/Okhota-Partners-Medical-License-Website-Redesign",
    x: 1066,
    y: 168,
    size: "sm",
  },
  {
    id: "ego-models",
    title: "Ego Models",
    tag: "Web design",
    href: "https://www.behance.net/gallery/224050543/Ego-Models-Model-Agency-Website-Design",
    x: 1492,
    y: 301,
    size: "lg",
  },
  {
    id: "redhead",
    title: "RedHead",
    tag: "Landing page",
    href: "https://www.behance.net/gallery/228731257/Landing-Page-UIUX-Design-for-SMM-Course-Website",
    x: 1974,
    y: 60,
    size: "lg",
  },
];

/** Box = the area the cards are laid out in (the reference's `--box-*`) */
export const BOX = {
  /** Left edge of the box on the rail */
  x: 372,
  w: Math.max(...WORKS.map((w) => w.x + CARD_W[w.size])),
  h: Math.max(...WORKS.map((w) => w.y + Math.round(CARD_W[w.size] / COVER_RATIO) + LABEL_H)),
};

/** Marker the traces start from; pops in during the handoff (left of the box) */
export const DIAMOND = { x: -640, y: 408, side: 50, dot: 11 };

/**
 * Circuit traces behind the cards, in box units. Every branch runs left → right
 * (x never decreases): the scroll draws each one up to a point on screen.
 */
export const TRACES = [
  // From the diamond into the first card
  `M${DIAMOND.x} ${DIAMOND.y}V600H120`,
  // Upper trace
  "M240 412V300L300 240H470",
  "M891 120H980L1040 180H1100",
  "M1391 250H1440L1500 190H1780L1840 130H2000",
  "M2414 200H2760",
  // Lower trace
  "M440 640H560L600 680H740",
  "M1037 600H1180L1240 540H1520",
  "M1932 560H2080L2160 480H2760",
];

/** Horizontal extent of the traces' SVG, in box units */
export const TRACE_BOUNDS = { x: DIAMOND.x - DIAMOND.side, w: 2760 - DIAMOND.x + DIAMOND.side };
