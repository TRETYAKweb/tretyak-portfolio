"use client";

import { useEffect, useImperativeHandle, useRef } from "react";

export type PixelHandle = { setProgress: (p: number) => void };

const FILL = "#fd4100"; // accent-600
const FLASH = "#ffab6d"; // accent-300

type Grid = { size: number; cols: number; rows: number; starts: Float32Array };

/** Covers the viewport with accent squares as progress goes 0 → 1. */
export default function PixelTransition({ ref }: { ref?: React.Ref<PixelHandle> }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const grid = useRef<Grid | null>(null);
  const progress = useRef(0);

  const render = () => {
    const canvas = canvasRef.current;
    const g = grid.current;
    if (!canvas || !g) return;
    const ctx = canvas.getContext("2d")!;
    const p = progress.current;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (p <= 0) return;
    if (p >= 1) {
      ctx.fillStyle = FILL;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      return;
    }
    for (let y = 0; y < g.rows; y++) {
      for (let x = 0; x < g.cols; x++) {
        const t = g.starts[y * g.cols + x];
        if (p < t - 0.035) continue;
        ctx.fillStyle = p < t ? FLASH : FILL;
        const inset = p < t ? g.size * 0.3 : 0;
        ctx.fillRect(x * g.size + inset, y * g.size + inset, g.size - inset * 2, g.size - inset * 2);
      }
    }
  };

  useImperativeHandle(ref, () => ({
    setProgress(p: number) {
      progress.current = p;
      render();
    },
  }));

  useEffect(() => {
    const canvas = canvasRef.current!;
    const build = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = canvas.getBoundingClientRect();
      canvas.width = Math.round(rect.width * dpr);
      canvas.height = Math.round(rect.height * dpr);
      const cols = rect.width < 768 ? 8 : 16;
      const size = Math.ceil(canvas.width / cols);
      const rows = Math.ceil(canvas.height / size);
      const starts = new Float32Array(cols * rows);
      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          // Sweeps from the bottom-right corner with plenty of noise
          const bias = 1 - (x / cols) * 0.55 - (y / rows) * 0.45;
          starts[y * cols + x] = 0.04 + (Math.random() * 0.55 + bias * 0.45) * 0.9;
        }
      }
      grid.current = { size, cols, rows, starts };
      render();
    };
    build();
    const ro = new ResizeObserver(build);
    ro.observe(canvas);
    return () => ro.disconnect();
  }, []);

  return <canvas ref={canvasRef} aria-hidden className="pointer-events-none absolute inset-0 z-20 size-full" />;
}
