export const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

/** Maps p inside [from, to] to 0..1 (clamped outside). */
export const range = (p: number, from: number, to: number) => clamp01((p - from) / (to - from));
