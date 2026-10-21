/**
 * Dot-matrix icons: every icon is a shape test over the unit square,
 * sampled on an N×N grid and drawn as dots.
 */

type Shape = (x: number, y: number) => boolean;

/** Unit square at (ox, oy) with selected corners rounded to a quarter circle. */
const roundedCell = (ox: number, oy: number, corners: ("tl" | "tr" | "bl" | "br")[], gap = 0) => (x: number, y: number) => {
  const u = (x - ox - 0.5) / (1 - gap) + 0.5;
  const v = (y - oy - 0.5) / (1 - gap) + 0.5;
  if (u < 0 || u > 1 || v < 0 || v > 1) return false;
  const corner = `${v < 0.5 ? "t" : "b"}${u < 0.5 ? "l" : "r"}` as "tl" | "tr" | "bl" | "br";
  if (!corners.includes(corner)) return true;
  return Math.hypot(u - 0.5, v - 0.5) <= 0.5;
};

const segmentDist = (px: number, py: number, ax: number, ay: number, bx: number, by: number) => {
  const dx = bx - ax;
  const dy = by - ay;
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
};

const star4 = (cx: number, cy: number, r: number) => (x: number, y: number) =>
  Math.abs(x - cx) ** 0.65 + Math.abs(y - cy) ** 0.65 <= r ** 0.65;

const SHAPES: Record<string, Shape> = {
  figma: (x, y) => {
    // Logo is 2×3 units, centred in the unit square
    const X = (x - 0.2) * 3.3;
    const Y = (y - 0.02) * 3.1;
    return [
      roundedCell(0, 0, ["tl", "bl"], 0.12),
      roundedCell(1, 0, ["tr", "br"], 0.12),
      roundedCell(0, 1, ["tl", "bl"], 0.12),
      roundedCell(1, 1, ["tl", "tr", "bl", "br"], 0.12),
      roundedCell(0, 2, ["tl", "bl", "br"], 0.12),
    ].some((f) => f(X, Y));
  },
  claude: (x, y) => {
    const dx = x - 0.5;
    const dy = y - 0.5;
    const r = Math.hypot(dx, dy);
    if (r < 0.09) return true;
    if (r > 0.48) return false;
    const rays = 12;
    const a = Math.atan2(dy, dx);
    const step = (Math.PI * 2) / rays;
    const k = Math.round(a / step);
    const nearest = k * step;
    const len = ((k % 2) + 2) % 2 === 0 ? 0.48 : 0.36;
    return r < len && Math.abs(Math.sin(a - nearest)) * r < 0.035;
  },
  webflow: (x, y) => {
    const pts = [
      [0.04, 0.22],
      [0.27, 0.8],
      [0.5, 0.36],
      [0.73, 0.8],
      [0.96, 0.22],
    ];
    for (let i = 0; i < pts.length - 1; i++) {
      if (segmentDist(x, y, pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1]) < 0.075) return true;
    }
    return false;
  },
  ai: (x, y) => star4(0.4, 0.58, 0.38)(x, y) || star4(0.8, 0.2, 0.17)(x, y) || star4(0.8, 0.82, 0.1)(x, y),
};

export type IconName = keyof typeof SHAPES;

const cache = new Map<string, [number, number][]>();

function dotsFor(name: string, n: number) {
  const key = `${name}-${n}`;
  if (!cache.has(key)) {
    const shape = SHAPES[name];
    const dots: [number, number][] = [];
    for (let j = 0; j < n; j++)
      for (let i = 0; i < n; i++) if (shape((i + 0.5) / n, (j + 0.5) / n)) dots.push([i, j]);
    cache.set(key, dots);
  }
  return cache.get(key)!;
}

export default function DotIcon({
  name,
  resolution = 26,
  className = "",
}: {
  name: IconName;
  resolution?: number;
  className?: string;
}) {
  return (
    <svg viewBox={`0 0 ${resolution} ${resolution}`} className={className} aria-hidden>
      {dotsFor(name, resolution).map(([x, y]) => (
        <circle key={`${x}-${y}`} cx={x + 0.5} cy={y + 0.5} r={0.36} fill="currentColor" />
      ))}
    </svg>
  );
}
