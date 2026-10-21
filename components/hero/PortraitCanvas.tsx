"use client";

import { useEffect, useImperativeHandle, useRef } from "react";
import { createPortraitSmear, type PortraitSmear } from "./portraitSmear";

export type PortraitHandle = {
  /** 0 = clean RGB mask, 1 = full RGB split + slice glitch */
  setGlitch: (amount: number) => void;
};

const SRC = "/img/me.png";

/** `base` = full RGB mask; `channels` = the same mask split into its R, G and B stripes (for the glitch). */
type Caches = { base: HTMLCanvasElement; channels: HTMLCanvasElement[]; step: number };

function makeCanvas(w: number, h: number) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return c;
}

/** Tone curve. The mask lights a third of each cell, so the gain makes up for it. */
const tone = (lum: number) => Math.min(1, Math.pow(lum, 1.1) * 1.6);
/** How much a stripe also lights the other two channels: softer, less saturated colour. */
const BLEED = 0.35;

/**
 * Renders the photo as a screen close-up: every cell is three vertical
 * R/G/B subpixel stripes lit by the photo's luminance, with a dark gap
 * between rows. From a distance it reads as a soft grey image.
 */
function buildCaches(img: HTMLImageElement, w: number, h: number, dpr: number): Caches {
  const sub = Math.max(1, Math.round(dpr)); // one subpixel stripe ≈ 1 CSS px
  const step = sub * 3; // cell = R + G + B
  const gap = Math.max(1, Math.round(dpr / 2)); // dark line between rows
  // Sample at subpixel resolution: the mask only tints, the photo keeps its detail
  const cols = Math.ceil(w / sub);
  const rows = Math.ceil(h / sub);

  // Fit by height, anchored to the bottom, centred horizontally; narrower if a tall window would crop the shoulders
  const scale = Math.min((h * 1.02) / img.height, w / img.width);
  const dw = img.width * scale;
  const dh = img.height * scale;
  const dx = (w - dw) / 2;
  const dy = h - dh;

  const sample = makeCanvas(cols, rows);
  const sctx = sample.getContext("2d", { willReadFrequently: true })!;
  sctx.imageSmoothingQuality = "high";
  sctx.drawImage(img, dx / sub, dy / sub, dw / sub, dh / sub);
  const { data } = sctx.getImageData(0, 0, cols, rows);

  const channels = [0, 1, 2].map(() => makeCanvas(w, h));
  const out = channels.map((c) => c.getContext("2d")!.createImageData(w, h));

  for (let y = 0; y < h; y++) {
    if (y % step >= step - gap) continue;
    const row = Math.floor(y / sub) * cols;
    for (let x = 0; x < w; x++) {
      const i = (row + Math.floor(x / sub)) * 4;
      const a = data[i + 3] / 255;
      if (a < 0.02) continue;
      const lum = (0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]) / 255;
      // Faint glow even in the darkest areas so the silhouette reads; alpha softens the edges
      const v = Math.max(0.1, tone(lum)) * a * 255;
      const k = Math.floor((x % step) / sub);
      const o = (y * w + x) * 4;
      for (let j = 0; j < 3; j++) {
        out[j].data[o + j] = j === k ? v : v * BLEED;
        out[j].data[o + 3] = 255;
      }
    }
  }

  const base = makeCanvas(w, h);
  const bctx = base.getContext("2d")!;
  bctx.globalCompositeOperation = "lighter";
  channels.forEach((c, k) => {
    c.getContext("2d")!.putImageData(out[k], 0, 0);
    bctx.drawImage(c, 0, 0);
  });

  return { base, channels, step };
}

export default function PortraitCanvas({
  ref,
  className = "",
}: {
  ref?: React.Ref<PortraitHandle>;
  className?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const smearRef = useRef<HTMLCanvasElement>(null);
  const smear = useRef<PortraitSmear | null>(null);
  const caches = useRef<Caches | null>(null);
  const glitch = useRef(0);

  const render = () => {
    const canvas = canvasRef.current;
    const c = caches.current;
    if (!canvas || !c) return;
    const ctx = canvas.getContext("2d")!;
    const { width: w, height: h } = canvas;
    const g = glitch.current;
    smear.current?.sourceChanged();

    ctx.globalCompositeOperation = "source-over";
    ctx.clearRect(0, 0, w, h);

    if (g < 0.01) {
      ctx.drawImage(c.base, 0, 0);
      return;
    }

    const shift = g * c.step * 2.5;
    ctx.globalCompositeOperation = "lighter";
    ctx.drawImage(c.channels[0], -shift, 0);
    ctx.drawImage(c.channels[1], 0, 0);
    ctx.drawImage(c.channels[2], shift, 0);

    // Horizontal slice displacement
    ctx.globalCompositeOperation = "source-over";
    const slices = Math.round(g * 5);
    for (let s = 0; s < slices; s++) {
      const sh = Math.max(c.step, Math.random() * h * 0.06);
      const sy = Math.random() * (h - sh);
      const off = (Math.random() - 0.5) * g * c.step * 14;
      ctx.clearRect(0, sy, w, sh);
      ctx.drawImage(c.base, 0, sy, w, sh, off, sy, w, sh);
    }
  };

  useImperativeHandle(ref, () => ({
    setGlitch(amount: number) {
      glitch.current = amount;
      render();
    },
  }));

  useEffect(() => {
    const canvas = canvasRef.current!;
    const img = new Image();
    img.src = SRC;
    let disposed = false;
    smear.current = createPortraitSmear(canvas, smearRef.current!);

    const build = () => {
      if (disposed || !img.complete || !img.naturalWidth) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = canvas.getBoundingClientRect();
      canvas.width = Math.max(1, Math.round(rect.width * dpr));
      canvas.height = Math.max(1, Math.round(rect.height * dpr));
      caches.current = buildCaches(img, canvas.width, canvas.height, dpr);
      smear.current?.resize(canvas.width, canvas.height, rect.width, rect.height, caches.current.step);
      render();
      canvas.style.opacity = "1";
    };

    img.onload = build;
    const ro = new ResizeObserver(build);
    ro.observe(canvas);

    return () => {
      disposed = true;
      ro.disconnect();
      smear.current?.dispose();
      smear.current = null;
    };
  }, []);

  return (
    <div className={className}>
      <canvas
        ref={canvasRef}
        aria-label="Portrait of Yevhenii Tretyak"
        role="img"
        className="absolute inset-0 size-full opacity-0 transition-opacity duration-1000"
      />
      {/* Hover smear: covers the portrait while the pointer trail is alive (portraitSmear.ts) */}
      <canvas ref={smearRef} aria-hidden className="pointer-events-none absolute inset-0 size-full opacity-0" />
    </div>
  );
}
