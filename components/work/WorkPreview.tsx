"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { cssColor } from "@/lib/color";
import { getLenis } from "@/lib/lenis";

/*
 * WebGL cover, ported from the gallery shader on curtisdesignr.me (there it is three.js,
 * here plain WebGL — one context per card):
 * - reveal: 26px blocks pop in at half, then full opacity, sweeping in the scroll
 *   direction with a ragged edge; a solid band runs on the front;
 * - cover: hard-light gradient of the accent towards the bottom (as `.work-cover` in CSS);
 * - hover: 1.04 zoom, and the image smears along the pointer trail with a coloured fringe.
 */

/** Seconds for the reveal once the card is on screen */
const REVEAL_TIME = 0.8;
const HOVER_ZOOM = 1.04;
/** The trail is measured in units of 824 CSS px (the reference's gallery height), so the brush is the same on any card */
const TRAIL_UNIT = 824;
/** Trail buffer resolution relative to the card */
const TRAIL_SCALE = 0.35;
/** Frames a trail keeps fading after the last pointer move (it reaches zero well before) */
const TRAIL_FRAMES = 90;

const VERT = `
attribute vec2 aPos;
varying vec2 vUv;
void main() {
  vUv = aPos * 0.5 + 0.5;
  gl_Position = vec4(aPos, 0.0, 1.0);
}`;

// Hue = direction of the drag, value = strength; fades every frame
const TRAIL_FRAG = `
precision highp float;
uniform sampler2D uPrev;
uniform vec2 uMouse;
uniform vec2 uPrevMouse;
uniform vec2 uSize;
varying vec2 vUv;

vec3 hsv2rgb(vec3 c) {
  vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
  vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
  return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}

void main() {
  vec2 p = vUv * uSize;
  vec2 a = uPrevMouse * uSize;
  vec2 b = uMouse * uSize;
  vec2 d = b - a;
  float len = length(d);
  vec2 dir = len > 0.0 ? d / len : vec2(1.0, 0.0);
  // Distance to the segment, so a fast flick draws a stroke rather than separate stamps
  float t = len > 0.0 ? clamp(dot(p - a, dir) / len, 0.0, 1.0) : 0.0;
  float s = smoothstep(0.25, 0.0, distance(p, mix(a, b, t)));
  s *= s;
  float angle = atan(dir.y, dir.x);
  if (angle < 0.0) angle += 6.2831853;
  vec3 stroke = hsv2rgb(vec3(angle / 6.2831853, 1.0, 1.0));
  vec3 last = texture2D(uPrev, vUv).rgb;
  vec3 draw = mix(last, stroke, min(0.7, len * 10.0) * s * 0.5);
  // The subtraction lets an 8-bit buffer actually reach zero
  gl_FragColor = vec4(max(vec3(0.0), draw * 0.9 - 0.005882), 1.0);
}`;

const CARD_FRAG = `
precision highp float;
uniform sampler2D uTex;
uniform sampler2D uTrail;
uniform float uProgress;
uniform float uReverse;
uniform float uImgAspect;
uniform float uZoom;
uniform vec2 uSize;
uniform vec3 uCover;
uniform vec3 uBand;
uniform vec3 uFringe;
varying vec2 vUv;

float rnd(vec2 p) {
  return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
}

vec3 rgb2hsv(vec3 c) {
  vec4 K = vec4(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0);
  vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));
  vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r));
  float d = q.x - min(q.w, q.y);
  float e = 1.0e-10;
  return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x);
}

void main() {
  float p = clamp(uProgress, 0.0, 1.0);

  // object-fit: cover, zoomed from the centre
  float planeAspect = uSize.x / max(uSize.y, 1.0);
  vec2 fit = planeAspect > uImgAspect ? vec2(1.0, uImgAspect / planeAspect) : vec2(planeAspect / uImgAspect, 1.0);
  vec2 uv = (vUv - 0.5) * fit / max(uZoom, 0.0001) + 0.5;

  // Trail: sample once in place and once dragged along it; the fringe lands only where the drag changed something
  vec3 field = rgb2hsv(texture2D(uTrail, vUv).rgb);
  float angle = field.x * 6.2831853;
  float strength = field.z;
  vec2 shift = vec2(cos(angle), sin(angle)) * strength * 22.0 / max(uSize, vec2(1.0));
  vec3 plain = texture2D(uTex, uv).rgb;
  vec3 base = texture2D(uTex, uv - shift).rgb;
  base += uFringe * clamp(length(base - plain) * 2.2, 0.0, 1.0) * strength;

  // Cover: hard-light layer whose alpha ramps 0 -> 1 downwards
  vec3 hl = mix(2.0 * base * uCover, 1.0 - 2.0 * (1.0 - base) * (1.0 - uCover), step(vec3(0.5), uCover));
  vec3 col = mix(base, hl, 1.0 - vUv.y);

  // Reveal on a fixed 26px grid: threshold = column mixed with noise, two layers off one threshold
  vec2 grid = max(uSize / 26.0, vec2(1.0));
  vec2 block = floor(vUv * grid);
  float column = block.x / max(grid.x - 1.0, 1.0);
  float sweep = mix(column, 1.0 - column, uReverse);
  float threshold = mix(sweep, rnd(block), 0.4);
  // The front overshoots both ends by the band width (+ the layer offset) so nothing parks on an edge
  float front = p * (1.0 + 0.18 + 2.0 * 0.25) - 0.25;
  float imgAlpha = step(threshold, front) * mix(0.5, 1.0, step(threshold + 0.18, front));
  // Band measured against the raw column (a bar, not confetti): solid core, dithered edges
  float bandT = clamp(abs(front - sweep) / 0.25, 0.0, 1.0);
  float band = step(smoothstep(0.05, 1.0, bandT), rnd(block + 31.7));

  float a = max(imgAlpha, band);
  if (a <= 0.002) discard;
  vec3 outCol = mix(col, uBand, clamp(band / max(a, 0.001), 0.0, 1.0));
  gl_FragColor = vec4(outCol * a, a);
}`;

type Target = { tex: WebGLTexture; fbo: WebGLFramebuffer };

function createProgram(gl: WebGLRenderingContext, frag: string) {
  const shader = (type: number, src: string) => {
    const s = gl.createShader(type)!;
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) ?? "shader");
    return s;
  };
  const program = gl.createProgram()!;
  gl.attachShader(program, shader(gl.VERTEX_SHADER, VERT));
  gl.attachShader(program, shader(gl.FRAGMENT_SHADER, frag));
  gl.bindAttribLocation(program, 0, "aPos");
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program) ?? "link");
  const uniforms = new Map<string, WebGLUniformLocation | null>();
  const u = (name: string) => {
    if (!uniforms.has(name)) uniforms.set(name, gl.getUniformLocation(program, name));
    return uniforms.get(name)!;
  };
  return { program, u };
}

function createTexture(gl: WebGLRenderingContext) {
  const tex = gl.createTexture()!;
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  return tex;
}

function createTarget(gl: WebGLRenderingContext, w: number, h: number): Target {
  const tex = createTexture(gl);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
  const fbo = gl.createFramebuffer()!;
  gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
  gl.clearColor(0, 0, 0, 1);
  gl.clear(gl.COLOR_BUFFER_BIT);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  return { tex, fbo };
}

const rgb = (value: string) => cssColor(value).map((c) => c / 255) as [number, number, number];

/**
 * Canvas that replaces the cover <img> on the desktop rail. Sits inside the card's thumb link.
 * `onFail`: WebGL is unavailable or broke, show the plain image instead.
 */
export default function WorkPreview({ src, onFail }: { src: string; onFail: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const thumb = canvas.parentElement!;
    const gl = canvas.getContext("webgl", { alpha: true, premultipliedAlpha: true, antialias: false });
    if (!gl || gl.isContextLost()) return onFail();

    let card: ReturnType<typeof createProgram>;
    let trail: ReturnType<typeof createProgram>;
    try {
      card = createProgram(gl, CARD_FRAG);
      trail = createProgram(gl, TRAIL_FRAG);
    } catch {
      return onFail();
    }
    const quad = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, quad);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

    const colors = {
      cover: rgb("var(--color-accent-500)"),
      band: rgb("var(--color-black)"),
      fringe: rgb("var(--color-accent-600)"),
    };

    const state = { progress: 0, reverse: 0, zoom: 1 };
    let image: { tex: WebGLTexture; aspect: number } | null = null;
    let size = { w: 1, h: 1 };
    let trails: [Target, Target] | null = null;
    let trailFrames = 0;
    let dirty = true;
    const mouse = { x: 0.5, y: 0.5, px: 0.5, py: 0.5, seen: false };

    const img = new Image();
    img.decoding = "async";
    img.onload = () => {
      const tex = createTexture(gl);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
      image = { tex, aspect: img.naturalWidth / img.naturalHeight };
      dirty = true;
    };
    img.src = src;

    const clearTrails = () => {
      if (!trails) return;
      for (const t of trails) {
        gl.bindFramebuffer(gl.FRAMEBUFFER, t.fbo);
        gl.clearColor(0, 0, 0, 1);
        gl.clear(gl.COLOR_BUFFER_BIT);
      }
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    };

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      if (rect.width < 1 || rect.height < 1) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      size = { w: rect.width, h: rect.height };
      canvas.width = Math.round(rect.width * dpr);
      canvas.height = Math.round(rect.height * dpr);
      const tw = Math.max(16, Math.round(rect.width * TRAIL_SCALE));
      const th = Math.max(16, Math.round(rect.height * TRAIL_SCALE));
      trails?.forEach((t) => {
        gl.deleteTexture(t.tex);
        gl.deleteFramebuffer(t.fbo);
      });
      trails = [createTarget(gl, tw, th), createTarget(gl, tw, th)];
      dirty = true;
      draw();
    };

    const stepTrail = () => {
      if (!trails) return;
      const [a, b] = trails;
      gl.bindFramebuffer(gl.FRAMEBUFFER, b.fbo);
      gl.viewport(0, 0, Math.max(16, Math.round(size.w * TRAIL_SCALE)), Math.max(16, Math.round(size.h * TRAIL_SCALE)));
      gl.useProgram(trail.program);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, a.tex);
      gl.uniform1i(trail.u("uPrev"), 0);
      gl.uniform2f(trail.u("uMouse"), mouse.x, mouse.y);
      gl.uniform2f(trail.u("uPrevMouse"), mouse.px, mouse.py);
      gl.uniform2f(trail.u("uSize"), size.w / TRAIL_UNIT, size.h / TRAIL_UNIT);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      trails = [b, a];
      mouse.px = mouse.x;
      mouse.py = mouse.y;
    };

    const draw = () => {
      dirty = false;
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      if (!image || !trails || state.progress <= 0) return;
      gl.useProgram(card.program);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, image.tex);
      gl.uniform1i(card.u("uTex"), 0);
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, trails[0].tex);
      gl.uniform1i(card.u("uTrail"), 1);
      gl.uniform1f(card.u("uProgress"), state.progress);
      gl.uniform1f(card.u("uReverse"), state.reverse);
      gl.uniform1f(card.u("uImgAspect"), image.aspect);
      gl.uniform1f(card.u("uZoom"), state.zoom);
      gl.uniform2f(card.u("uSize"), size.w, size.h);
      gl.uniform3f(card.u("uCover"), ...colors.cover);
      gl.uniform3f(card.u("uBand"), ...colors.band);
      gl.uniform3f(card.u("uFringe"), ...colors.fringe);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    };

    // Runs only while the card is (partly) on screen
    const tick = (_time: number, deltaMs: number) => {
      const r = canvas.getBoundingClientRect();
      const visible = r.right > 0 && r.left < window.innerWidth * 0.95 && r.bottom > 0 && r.top < window.innerHeight;
      if (visible && image) {
        if (state.progress === 0) state.reverse = (getLenis()?.direction ?? 1) < 0 ? 1 : 0;
        if (state.progress < 1) {
          state.progress = Math.min(1, state.progress + deltaMs / 1000 / REVEAL_TIME);
          dirty = true;
        }
      } else if (!visible && state.progress !== 0) {
        state.progress = 0;
        dirty = true;
      }
      if (trailFrames > 0) {
        stepTrail();
        if (--trailFrames === 0) clearTrails();
        dirty = true;
      }
      if (dirty) draw();
    };

    let ticking = false;
    const io = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !ticking) {
        ticking = true;
        gsap.ticker.add(tick);
      } else if (!entry.isIntersecting && ticking) {
        ticking = false;
        gsap.ticker.remove(tick);
        // Hidden now, so the next entry starts from an empty card
        state.progress = 0;
        draw();
      }
    });
    io.observe(canvas);

    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    // Hover: zoom + pointer trail (fine pointers, motion allowed)
    const canHover =
      window.matchMedia("(hover: hover)").matches && !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let zoomTween: gsap.core.Tween | undefined;
    const zoomTo = (value: number) => {
      zoomTween?.kill();
      zoomTween = gsap.to(state, { zoom: value, duration: 0.6, ease: "power4.out", onUpdate: () => (dirty = true) });
    };
    const onEnter = () => zoomTo(HOVER_ZOOM);
    const onLeave = () => {
      zoomTo(1);
      mouse.seen = false;
    };
    const onMove = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width;
      const y = 1 - (e.clientY - r.top) / r.height;
      // The first move after entering starts a new stroke instead of drawing a line from the old point
      if (!mouse.seen) {
        mouse.px = x;
        mouse.py = y;
        mouse.seen = true;
      }
      mouse.x = x;
      mouse.y = y;
      trailFrames = TRAIL_FRAMES;
    };
    if (canHover) {
      thumb.addEventListener("pointerenter", onEnter);
      thumb.addEventListener("pointerleave", onLeave);
      thumb.addEventListener("pointermove", onMove);
    }

    return () => {
      io.disconnect();
      ro.disconnect();
      gsap.ticker.remove(tick);
      zoomTween?.kill();
      thumb.removeEventListener("pointerenter", onEnter);
      thumb.removeEventListener("pointerleave", onLeave);
      thumb.removeEventListener("pointermove", onMove);
      img.onload = null;
      // Free the resources but keep the context: a remount (React strict mode) gets the same one back
      if (image) gl.deleteTexture(image.tex);
      trails?.forEach((t) => {
        gl.deleteTexture(t.tex);
        gl.deleteFramebuffer(t.fbo);
      });
      gl.deleteBuffer(quad);
      gl.deleteProgram(card.program);
      gl.deleteProgram(trail.program);
    };
  }, [src, onFail]);

  return <canvas ref={canvasRef} aria-hidden className="pointer-events-none absolute inset-0 size-full" />;
}
