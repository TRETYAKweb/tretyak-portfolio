import { gsap } from "gsap";
import { cssColor } from "@/lib/color";
import { RGB2HSV, createProgram, createTrail, uniforms } from "@/lib/gl";

/*
 * The Selected Work hover (components/work/WorkPreview.tsx) on the portrait: the picture smears
 * along the pointer trail with an accent fringe. The portrait stays a 2D canvas; while a trail
 * is alive a WebGL copy of it with the smear covers it, then hands back.
 */

/** Brush radius, CSS px: the cards' 0.25 × 824 */
const BRUSH = 206;
/** Max smear, CSS px (as on the cards) */
const SHIFT = 22;
/** Trail buffer resolution relative to the portrait */
const TRAIL_SCALE = 0.35;
/** Frames a trail keeps fading after the last pointer move (it reaches zero well before) */
const TRAIL_FRAMES = 90;

const FRAG = `#version 300 es
precision highp float;
uniform sampler2D uTex;
uniform sampler2D uTrail;
uniform vec2 uRes;
uniform float uShift;
uniform float uCell;
uniform vec3 uFringe;
out vec4 fragColor;
${RGB2HSV}
void main() {
  vec2 uv = gl_FragCoord.xy / uRes;
  vec4 plain = texture(uTex, uv);
  vec3 field = rgb2hsv(texture(uTrail, uv).rgb);
  if (field.z < 0.004) {
    fragColor = plain;
    return;
  }
  float angle = field.x * 6.2831853;
  // Whole cells only: the RGB stripes stay on their grid, just the picture slides
  vec2 shift = floor(vec2(cos(angle), sin(angle)) * field.z * uShift / uCell + 0.5) * uCell;
  vec4 base = texture(uTex, (gl_FragCoord.xy - shift) / uRes);
  // The fringe lands only where the drag changed something
  float fringe = clamp(length(base.rgb - plain.rgb) * 2.2, 0.0, 1.0) * field.z;
  float a = max(base.a, fringe);
  fragColor = vec4(min(base.rgb + uFringe * fringe, vec3(a)), a);
}`;

export type PortraitSmear = {
  /** Canvas size in device px, layout size in CSS px, RGB cell in device px */
  resize: (w: number, h: number, cssW: number, cssH: number, cell: number) => void;
  /** The 2D portrait was redrawn (glitch, rebuild) */
  sourceChanged: () => void;
  dispose: () => void;
};

/** null without a fine pointer, with reduced motion or without WebGL2: the portrait just stays still */
export function createPortraitSmear(source: HTMLCanvasElement, canvas: HTMLCanvasElement): PortraitSmear | null {
  if (!window.matchMedia("(hover: hover)").matches || window.matchMedia("(prefers-reduced-motion: reduce)").matches)
    return null;
  const gl = canvas.getContext("webgl2", { alpha: true, premultipliedAlpha: true, antialias: false });
  if (!gl) return null;

  const prog = createProgram(gl, FRAG);
  const u = uniforms(gl, prog);
  const trail = createTrail(gl);
  const tex = gl.createTexture()!;
  gl.bindTexture(gl.TEXTURE_2D, tex);
  // Sampled pixel for pixel: linear filtering would blur the stripes
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  const fringe = cssColor("var(--color-accent-600)").map((c) => c / 255) as [number, number, number];

  const size = { cssW: 1, cssH: 1, tw: 16, th: 16, cell: 3, dpr: 1 };
  let mouse: [number, number] = [0.5, 0.5];
  let prev: [number, number] = [0.5, 0.5];
  let seen = false;
  let frames = 0;
  let active = false;
  let sourceDirty = true;

  const draw = () => {
    if (sourceDirty) {
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
      sourceDirty = false;
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.useProgram(prog);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.uniform1i(u.uTex, 0);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, trail.tex);
    gl.uniform1i(u.uTrail, 1);
    gl.uniform2f(u.uRes, canvas.width, canvas.height);
    gl.uniform1f(u.uShift, SHIFT * size.dpr);
    gl.uniform1f(u.uCell, size.cell);
    gl.uniform3f(u.uFringe, ...fringe);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  };

  const tick = () => {
    trail.step(mouse, prev, BRUSH / size.cssH, seen ? 1 : 0);
    prev = mouse;
    draw();
    if (--frames <= 0) setActive(false);
  };

  // The WebGL copy covers the 2D canvas only while a trail is alive. Opacity, not visibility,
  // on the copy: visibility: visible would show it through the Hero's `invisible` stage before boot
  const setActive = (on: boolean) => {
    if (on === active) return;
    active = on;
    if (on) {
      draw();
      gsap.ticker.add(tick);
    } else {
      gsap.ticker.remove(tick);
      // A fresh, empty trail for the next stroke
      trail.resize(size.tw, size.th);
    }
    canvas.style.opacity = on ? "1" : "0";
    source.style.visibility = on ? "hidden" : "";
  };

  const onMove = (e: PointerEvent) => {
    const r = canvas.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width;
    const y = 1 - (e.clientY - r.top) / r.height;
    const inside = x >= 0 && x <= 1 && y >= 0 && y <= 1 && r.bottom > 0 && r.top < window.innerHeight;
    if (!inside) {
      seen = false;
      return;
    }
    // The first move after entering starts a new stroke instead of drawing a line from the old point
    if (!seen) {
      prev = [x, y];
      seen = true;
    }
    mouse = [x, y];
    frames = TRAIL_FRAMES;
    setActive(true);
  };
  window.addEventListener("pointermove", onMove);

  return {
    resize(w, h, cssW, cssH, cell) {
      canvas.width = w;
      canvas.height = h;
      size.cssW = cssW;
      size.cssH = cssH;
      size.cell = cell;
      size.dpr = w / cssW;
      size.tw = Math.max(16, Math.round(cssW * TRAIL_SCALE));
      size.th = Math.max(16, Math.round(cssH * TRAIL_SCALE));
      trail.resize(size.tw, size.th);
      sourceDirty = true;
      if (active) draw();
    },
    sourceChanged() {
      sourceDirty = true;
    },
    dispose() {
      window.removeEventListener("pointermove", onMove);
      gsap.ticker.remove(tick);
      source.style.visibility = "";
      // Free the resources but keep the context: a remount (React strict mode) gets the same one back
      trail.dispose();
      gl.deleteTexture(tex);
      gl.deleteProgram(prog);
    },
  };
}
