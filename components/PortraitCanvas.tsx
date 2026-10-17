"use client";

import { useEffect, useImperativeHandle, useRef } from "react";

export type PortraitHandle = {
  /** 0 = clean halftone, 1 = full RGB split + slice glitch */
  setGlitch: (amount: number) => void;
};

const SRC = "/img/me.png";

type Caches = { white: HTMLCanvasElement; channels: HTMLCanvasElement[]; step: number };

function makeCanvas(w: number, h: number) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return c;
}

/** Turns the photo into a white dot halftone and pre-tints R/G/B copies for the glitch. */
function buildCaches(img: HTMLImageElement, w: number, h: number, dpr: number): Caches {
  const step = Math.max(4, Math.round(4 * dpr));
  const cols = Math.ceil(w / step);
  const rows = Math.ceil(h / step);

  // Fit by height, anchored to the bottom, centred horizontally
  const scale = (h * 1.02) / img.height;
  const dw = img.width * scale;
  const dh = img.height * scale;
  const dx = (w - dw) / 2;
  const dy = h - dh;

  const sample = makeCanvas(cols, rows);
  const sctx = sample.getContext("2d", { willReadFrequently: true })!;
  sctx.drawImage(img, dx / step, dy / step, dw / step, dh / step);
  const { data } = sctx.getImageData(0, 0, cols, rows);

  const white = makeCanvas(w, h);
  const wctx = white.getContext("2d")!;
  wctx.fillStyle = "#fff";
  wctx.beginPath();
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const i = (y * cols + x) * 4;
      const a = data[i + 3] / 255;
      if (a < 0.4) continue;
      const lum = (0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]) / 255;
      const v = Math.min(1, Math.pow(lum, 0.75) * 1.35);
      // Keep a faint dot even in the darkest areas so the silhouette reads
      const r = (step / 2) * Math.max(0.16 * a, v);
      const cx = x * step + step / 2;
      const cy = y * step + step / 2;
      wctx.moveTo(cx + r, cy);
      wctx.arc(cx, cy, r, 0, Math.PI * 2);
    }
  }
  wctx.fill();

  const channels = ["#f00", "#0f0", "#00f"].map((color) => {
    const c = makeCanvas(w, h);
    const ctx = c.getContext("2d")!;
    ctx.drawImage(white, 0, 0);
    ctx.globalCompositeOperation = "source-in";
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, w, h);
    return c;
  });

  return { white, channels, step };
}

export default function PortraitCanvas({
  ref,
  className = "",
}: {
  ref?: React.Ref<PortraitHandle>;
  className?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const caches = useRef<Caches | null>(null);
  const glitch = useRef(0);

  const render = () => {
    const canvas = canvasRef.current;
    const c = caches.current;
    if (!canvas || !c) return;
    const ctx = canvas.getContext("2d")!;
    const { width: w, height: h } = canvas;
    const g = glitch.current;

    ctx.globalCompositeOperation = "source-over";
    ctx.clearRect(0, 0, w, h);

    if (g < 0.01) {
      ctx.drawImage(c.white, 0, 0);
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
      ctx.drawImage(c.white, 0, sy, w, sh, off, sy, w, sh);
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

    const build = () => {
      if (disposed || !img.complete || !img.naturalWidth) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = canvas.getBoundingClientRect();
      canvas.width = Math.max(1, Math.round(rect.width * dpr));
      canvas.height = Math.max(1, Math.round(rect.height * dpr));
      caches.current = buildCaches(img, canvas.width, canvas.height, dpr);
      render();
      canvas.style.opacity = "1";
    };

    img.onload = build;
    const ro = new ResizeObserver(build);
    ro.observe(canvas);

    return () => {
      disposed = true;
      ro.disconnect();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-label="Portrait of Yevhenii Tretyak"
      role="img"
      className={`opacity-0 transition-opacity duration-1000 ${className}`}
    />
  );
}
