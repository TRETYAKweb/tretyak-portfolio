/** Experience from the CV (info/), oldest first; `side` is the desktop column */
export type Job = {
  key: string;
  name: string;
  role: string;
  years: string;
  description: string;
  logo: string;
  side: "left" | "right";
};

export const JOBS: Job[] = [
  {
    key: "estet",
    name: "Estet Design Group",
    role: "UI/UX Designer",
    years: "2016 — 2019",
    description:
      "Designed landing pages, corporate sites, e-commerce and mobile apps — from competitive analysis, personas and user flows to UI kits and prototypes checked in corridor tests.",
    logo: "/img/logo-1.svg",
    side: "left",
  },
  {
    key: "artdock",
    name: "ArtDock",
    role: "UI/UX Designer",
    years: "2019 — 2021",
    description:
      "Designed news portals, landing pages and corporate sites, crafted their interface animations and worked side by side with developers until every build matched the design.",
    logo: "/img/logo-2.svg",
    side: "left",
  },
  {
    key: "freelance",
    name: "Freelance",
    role: "UI/UX · Webflow",
    years: "2014 — 2016 · 2021 — now",
    description:
      // TODO: content — check the wording with Zhenya
      "Product and marketing sites for direct clients: research, UX and UI in Figma, then responsive builds with motion in Webflow — one person from the first sketch to launch.",
    logo: "/img/logo-icon.svg",
    side: "right",
  },
];
