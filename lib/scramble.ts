const GLYPHS = "#$%&+=*/<>?!ABCDEFGHJKLMNPQRSTUVWXYZ0123456789";
const TINTS = ["text-accent-600", "text-accent-600", "text-accent-900", "text-accent-400", "text-white"];

/** Share of the progress range each char spends scrambling before it settles. */
const WINDOW = 0.3;

const pick = <T,>(list: string | T[]) => list[Math.floor(Math.random() * list.length)];

const escape = (ch: string) =>
  ch === "<" ? "&lt;" : ch === ">" ? "&gt;" : ch === "&" ? "&amp;" : ch;

export type Scrambler = {
  /** 0 = hidden, (0..1) = scrambling, 1 = final text */
  set: (progress: number) => void;
};

/**
 * Progress-driven text scramble. Every char gets its own random start,
 * shows random glyphs while inside its window and settles on the real char.
 * Real chars stay in the DOM (invisible) so the layout never jumps.
 * Must be created on the client (uses Math.random).
 */
export function createScrambler(el: HTMLElement, opts: { tints?: string[] } = {}): Scrambler {
  const text = el.dataset.text ?? el.textContent ?? "";
  const chars = [...text];
  const starts = chars.map(() => Math.random() * (1 - WINDOW));
  const tints = opts.tints ?? TINTS;
  let last = -1;

  const set = (p: number) => {
    const progress = Math.min(1, Math.max(0, p));
    if (progress === last && (progress === 0 || progress === 1)) return;
    last = progress;

    if (progress >= 1) {
      el.textContent = text;
      return;
    }

    let html = "";
    for (let i = 0; i < chars.length; i++) {
      const ch = chars[i];
      if (ch === " " || ch === "\n") {
        html += ch;
        continue;
      }
      const local = (progress - starts[i]) / WINDOW;
      if (local >= 1) html += escape(ch);
      else if (local <= 0) html += `<span class="invisible">${escape(ch)}</span>`;
      else
        html += `<span class="scr"><span class="invisible">${escape(ch)}</span><span class="${pick(
          tints,
        )}">${escape(pick(GLYPHS))}</span></span>`;
    }
    el.innerHTML = html;
  };

  return { set };
}
