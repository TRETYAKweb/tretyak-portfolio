"use client";

import { useEffect, useRef } from "react";

/**
 * The logo as a dot-matrix voxel model spinning around the vertical axis (like the reference's stats logo).
 * Shape comes from public/img/logo-icon.svg: its paths are sampled on a COLS×ROWS grid and extruded DEPTH layers.
 */

// Paths of public/img/logo-icon.svg (viewBox 572×1006)
const VIEW_W = 572;
const VIEW_H = 1006;
const PATHS = [
  "M347.724 0C587.905 7.45585 571.774 197.58 571.774 197.58H0V0H347.724Z",
  "M347.724 1005.33C587.905 998.022 571.774 809.754 571.774 809.754V389.349H381.78V809.754H191.786V389.349H0V1003.51L347.724 1005.33Z",
];

const COLS = 14;
const ROWS = 25;
/** One layer reads cleanest: thicker models overlap into stripes mid-turn. */
const DEPTH = 1;
/** Seconds per full turn. */
const PERIOD = 6;
/** Dot size relative to the cell. */
const DOT = 0.62;

type Voxel = [x: number, y: number, z: number];

/** Surface voxels only: front and back faces everywhere, the layers in between only on the outline (side walls). */
function buildVoxels(): Voxel[] {
  const ctx = document.createElement("canvas").getContext("2d")!;
  const paths = PATHS.map((d) => new Path2D(d));
  const filled = (i: number, j: number) =>
    i >= 0 && j >= 0 && i < COLS && j < ROWS &&
    paths.some((p) => ctx.isPointInPath(p, ((i + 0.5) / COLS) * VIEW_W, ((j + 0.5) / ROWS) * VIEW_H));
  const voxels: Voxel[] = [];
  for (let j = 0; j < ROWS; j++)
    for (let i = 0; i < COLS; i++) {
      if (!filled(i, j)) continue;
      const edge = !filled(i - 1, j) || !filled(i + 1, j) || !filled(i, j - 1) || !filled(i, j + 1);
      for (let k = 0; k < DEPTH; k++)
        if (edge || k === 0 || k === DEPTH - 1) voxels.push([i - (COLS - 1) / 2, j - (ROWS - 1) / 2, k - (DEPTH - 1) / 2]);
    }
  return voxels;
}

export default function LogoVoxel({ className = "" }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const voxels = buildVoxels();
    const projected = voxels.map(() => ({ x: 0, y: 0, z: 0 }));
    let w = 0;
    let h = 0;
    let angle = 0;
    // Near colour from the text-* class, far one from the accent-900 token
    const colors = {
      near: getComputedStyle(canvas).color,
      far: getComputedStyle(document.documentElement).getPropertyValue("--color-accent-900").trim(),
    };

    const draw = (angle: number) => {
      ctx.clearRect(0, 0, w, h);
      const cell = Math.min((h * 0.92) / ROWS, (w * 0.92) / COLS);
      const focal = h * 3; // mild perspective
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      voxels.forEach(([x, y, z], n) => {
        const X = (x * cos + z * sin) * cell;
        const Z = (-x * sin + z * cos) * cell;
        const k = focal / (focal - Z);
        const p = projected[n];
        p.x = w / 2 + X * k;
        p.y = h / 2 + y * cell * k;
        p.z = Z;
      });
      const order = projected.map((_, n) => n).sort((a, b) => projected[a].z - projected[b].z);
      const size = Math.max(1, Math.round(cell * DOT));
      // Dots foreshorten with the turn, otherwise they merge into stripes mid-turn
      const width = Math.max(1, Math.round(cell * DOT * Math.abs(cos)));
      // Facing side in the main colour, the back darker. Snapped to whole px: no blur
      ctx.fillStyle = cos >= 0 ? colors.near : colors.far;
      for (const n of order) {
        const p = projected[n];
        ctx.fillRect(Math.round(p.x - width / 2), Math.round(p.y - size / 2), width, size);
      }
    };

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      draw(angle);
    };

    let raf = 0;
    let last = 0;
    const tick = (now: number) => {
      if (last) angle += ((now - last) / 1000) * ((Math.PI * 2) / PERIOD);
      last = now;
      draw(angle);
      raf = requestAnimationFrame(tick);
    };
    const start = () => {
      if (reduced || raf) return;
      last = 0;
      raf = requestAnimationFrame(tick);
    };
    const stop = () => {
      cancelAnimationFrame(raf);
      raf = 0;
    };

    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    // Spin only while on screen
    const io = new IntersectionObserver(([entry]) => (entry.isIntersecting ? start() : stop()));
    io.observe(canvas);

    return () => {
      stop();
      ro.disconnect();
      io.disconnect();
    };
  }, []);

  return <canvas ref={canvasRef} role="img" aria-label="Yevhenii Tretyak logo" className={className} />;
}
