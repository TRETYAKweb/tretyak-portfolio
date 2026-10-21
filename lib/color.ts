/**
 * Resolves a CSS color (e.g. "var(--color-accent-600)") to [r, g, b] in 0..255, so canvas
 * and WebGL code reads the theme tokens instead of copying hex values. Client only.
 */
export function cssColor(value: string): [number, number, number] {
  const probe = document.createElement("i");
  probe.style.display = "none";
  probe.style.color = value;
  document.body.appendChild(probe);
  const [r = 0, g = 0, b = 0] = (getComputedStyle(probe).color.match(/[\d.]+/g) ?? []).map(Number);
  probe.remove();
  return [r, g, b];
}

export const cssRgb = (value: string) => `rgb(${cssColor(value).join(" ")})`;
