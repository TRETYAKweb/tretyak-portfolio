"use client";

import { useEffect, useRef, useState } from "react";
import { cssColor } from "@/lib/color";
import { RGB2HSV, createProgram, createTarget, createTrail, deleteTarget, getDpr, uniforms, type Target } from "@/lib/gl";

/*
 * The company logo on a CRT screen, ported from the Worked At screen on curtisdesignr.me:
 * logo pass (crossfade + tearing glitch) → bloom → CRT pass (RGB subpixel mask, curvature,
 * vignette, a rolling pulse) with the pointer trail dragging the image and an accent fringe.
 * The glitch fires for 1.4s out of every 4s, while the pointer is over the logo and on a switch.
 */

/** Logo box inside its square texture: wordmarks fit 72% of the width (as on the reference), tall marks are capped by height */
const TEX = 512;
const FIT_W = 0.72;
const FIT_H = 0.4;
/** Half the logo square as a share of the screen width */
const LOGO_HALF = 0.306;
const SWITCH_MS = 550;
/** How far the logo leans toward the pointer, as a share of its half size */
const PARALLAX = 0.12;

const LOGO_FRAG = `#version 300 es
precision highp float;
out vec4 O;
uniform float iTime;
uniform float uHover;
uniform sampler2D uLogoCurrent;
uniform sampler2D uLogoNext;
uniform float uMixT;
uniform vec2 uLogoCenter;
uniform float uLogoHalfSize;

float hash(float n) { return fract(sin(n) * 43758.5453123); }

// Occasional horizontal bands get yanked sideways; the seed steps ~9 times a second, so it reads stepped
vec2 glitchUv(vec2 uv, float hover) {
  float seed = floor(iTime * 9.0);
  float burst = step(0.78, hash(seed * 3.1 + 7.0));
  float band = floor(uv.y * 26.0);
  float bandOn = step(0.72, hash(band + seed * 2.3));
  float dir = hash(band * 1.7 + seed) - 0.5;
  return uv + vec2(dir * 0.05 * hover * burst * bandOn, 0.0);
}

void main() {
  vec2 uv = (gl_FragCoord.xy - uLogoCenter) / (uLogoHalfSize * 2.0) + 0.5;
  vec2 inside = step(vec2(0.0), uv) * step(uv, vec2(1.0));
  vec2 guv = glitchUv(uv, uHover);
  float mask = inside.x * inside.y;
  O = clamp(mix(texture(uLogoCurrent, guv), texture(uLogoNext, guv), uMixT) * mask, 0.0, 1.0);
}`;

const BLOOM_FRAG = `#version 300 es
precision highp float;
out vec4 fragColor;
uniform vec2 iResolution;
uniform sampler2D iChannel0;
#define RADIUS 10.0
#define SAMPLES 32.0
void main() {
  vec2 texel = 1.0 / iResolution;
  vec4 bloom = vec4(0.0);
  vec2 point = vec2(RADIUS, 0.0) * inversesqrt(SAMPLES);
  for (float i = 0.0; i < SAMPLES; i++) {
    point *= -mat2(0.7374, 0.6755, -0.6755, 0.7374);
    bloom += texture(iChannel0, (gl_FragCoord.xy + point * sqrt(i)) * texel) * (1.0 - i / SAMPLES);
  }
  fragColor = bloom / SAMPLES + texture(iChannel0, gl_FragCoord.xy * texel) * 0.3;
}`;

const CRT_FRAG = `#version 300 es
precision highp float;
out vec4 fragColor;
uniform vec2 iResolution;
uniform float iTime;
uniform sampler2D iChannel0;
uniform float uHover;
uniform sampler2D uTrail;
uniform float uTrailDisplace;
uniform vec3 uTrailColor;
#define MASK_INTENSITY 0.4
#define MASK_SIZE 4.0
#define MASK_BORDER 1.0
#define SCREEN_CURVATURE 0.08
#define SCREEN_VIGNETTE 0.4
#define PULSE_INTENSITY 0.03
#define PULSE_WIDTH 60.0
#define PULSE_RATE 20.0
float hash(float n) { return fract(sin(n) * 43758.5453123); }
${RGB2HSV}
void main() {
  vec2 res = iResolution;
  vec2 uv = gl_FragCoord.xy / res * 2.0 - 1.0;
  uv *= 1.0 + (dot(uv, uv) - 1.0) * SCREEN_CURVATURE;
  vec2 pixel = (uv * 0.5 + 0.5) * res;
  vec2 edge = max(1.0 - uv * uv, 0.0);
  float vignette = pow(edge.x * edge.y, SCREEN_VIGNETTE);

  // Constant CRT fringing; spikes when a tear happens (same cadence as the logo pass)
  vec2 aberration = vec2(0.6, 0.0);
  float burst = step(0.78, hash(floor(iTime * 9.0) * 3.1 + 7.0));
  aberration += vec2(16.0, 0.0) * uHover * burst;

  // Trail: hue → direction, value → strength
  vec3 field = rgb2hsv(texture(uTrail, pixel / res).rgb);
  float angle = field.x * 6.2831853;
  vec2 trailShift = vec2(cos(angle), sin(angle)) * field.z * uTrailDisplace;

  vec2 coord = pixel / MASK_SIZE;
  vec2 subcoord = coord * vec2(3.0, 1.0);
  vec2 cellOffset = vec2(0.0, fract(floor(coord.x) * 0.5));
  vec2 maskCoord = floor(coord + cellOffset) * MASK_SIZE;
  vec4 plain = texture(iChannel0, maskCoord / res);
  vec2 dragged = maskCoord - trailShift;
  vec4 color = texture(iChannel0, (dragged - aberration) / res);
  color.g = texture(iChannel0, (dragged + aberration) / res).g;
  // Accent only where the drag changed something (across the logo's edges)
  float fringe = clamp(length(color.rgb - plain.rgb) * 2.2, 0.0, 1.0);
  color.rgb += uTrailColor * fringe * field.z;
  // The silhouette stays put: dragging alpha would smear the edge outward
  color.a = plain.a;

  float ind = mod(floor(subcoord.x), 3.0);
  vec3 maskColor = vec3(ind == 0.0, ind == 1.0, ind == 2.0) * 3.0;
  vec2 cellUv = fract(subcoord + cellOffset) * 2.0 - 1.0;
  vec2 border = 1.0 - cellUv * cellUv * MASK_BORDER;
  maskColor *= border.x * border.y;
  color.rgb *= 1.0 + (maskColor - 1.0) * MASK_INTENSITY;
  color.rgb *= vignette;
  color.rgb *= 1.0 + PULSE_INTENSITY * cos(pixel.x / PULSE_WIDTH + iTime * PULSE_RATE);
  fragColor = color;
}`;

const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

function loadLogo(gl: WebGL2RenderingContext, src: string, onReady: (tex: WebGLTexture) => void) {
  const img = new Image();
  img.onload = () => {
    const c = document.createElement("canvas");
    c.width = c.height = TEX;
    const scale = Math.min((TEX * FIT_W) / img.width, (TEX * FIT_H) / img.height);
    const w = img.width * scale;
    const h = img.height * scale;
    c.getContext("2d")!.drawImage(img, (TEX - w) / 2, (TEX - h) / 2, w, h);
    const tex = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, c);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    onReady(tex);
  };
  img.src = src;
}

export default function CrtScreen({ logos, active }: { logos: { key: string; src: string }[]; active: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const switchTo = useRef<(key: string) => void>(() => {});
  const activeRef = useRef(active);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const gl = canvas.getContext("webgl2", { antialias: false });
    if (!gl) {
      setFailed(true);
      return;
    }
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const logoProg = createProgram(gl, LOGO_FRAG);
    const bloomProg = createProgram(gl, BLOOM_FRAG);
    const crtProg = createProgram(gl, CRT_FRAG);
    const uLogo = uniforms(gl, logoProg);
    const uBloom = uniforms(gl, bloomProg);
    const uCrt = uniforms(gl, crtProg);
    const trail = createTrail(gl);
    const vao = gl.createVertexArray();
    const fringe = cssColor("var(--color-accent-600)").map((v) => v / 255) as [number, number, number];

    // Transparent 1×1 until each logo loads
    const empty = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, empty);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(4));
    const textures: Record<string, WebGLTexture> = {};
    let disposed = false;
    logos.forEach(({ key, src }) =>
      loadLogo(gl, src, (tex) => {
        if (disposed) gl.deleteTexture(tex);
        else textures[key] = tex;
      }),
    );

    // Current logo, the one fading in and when it started
    let current = activeRef.current;
    let next: string | null = null;
    let switchStart = 0;
    switchTo.current = (key) => {
      if (key === current) next = null;
      else if (key !== next) {
        next = key;
        switchStart = performance.now();
      }
    };

    let W = 0;
    let H = 0;
    let logoTarget: Target | null = null;
    let bloomTarget: Target | null = null;
    const resize = () => {
      const dpr = getDpr();
      W = Math.floor(canvas.clientWidth * dpr);
      H = Math.floor(canvas.clientHeight * dpr);
      if (!W || !H) return;
      canvas.width = W;
      canvas.height = H;
      deleteTarget(gl, logoTarget);
      deleteTarget(gl, bloomTarget);
      logoTarget = createTarget(gl, W, H);
      bloomTarget = createTarget(gl, W, H);
      // The trail buffer is capped at 512px on the long side
      const k = Math.min(1, 512 / Math.max(W, H));
      trail.resize(Math.max(1, Math.round(W * k)), Math.max(1, Math.round(H * k)));
    };
    resize();
    let resizeTimer = 0;
    const ro = new ResizeObserver(() => {
      clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(resize, 100);
    });
    ro.observe(canvas);

    // Pointer in client px; trail positions in 0..1 of the canvas (y up)
    let pointer: [number, number] | null = null;
    const mouse: [number, number] = [0.5, 0.5];
    const prevMouse: [number, number] = [0.5, 0.5];
    let tracked = false;
    const onMove = (e: PointerEvent) => (pointer = [e.clientX, e.clientY]);
    const onOut = (e: PointerEvent) => {
      if (!e.relatedTarget) pointer = null;
    };
    window.addEventListener("pointermove", onMove);
    document.addEventListener("pointerout", onOut);

    const lean = [0, 0];
    let hover = 0;
    const t0 = performance.now();
    let raf = 0;
    let visible = true;

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      if (!W || !H || !logoTarget || !bloomTarget) return;
      const t = reduced ? 0 : (now - t0) / 1000;
      const half = W * LOGO_HALF;
      const cx = W / 2;
      const cy = H / 2;

      // Pointer in canvas px (y up) and the trail
      let px: [number, number] | null = null;
      if (pointer && !reduced) {
        const r = canvas.getBoundingClientRect();
        const dpr = getDpr();
        px = [(pointer[0] - r.left) * dpr, (r.height - (pointer[1] - r.top)) * dpr];
        const x = r.width ? (pointer[0] - r.left) / r.width : 0.5;
        const y = r.height ? 1 - (pointer[1] - r.top) / r.height : 0.5;
        // First move, or a jump (the page scrolled under a still pointer): no stroke across the screen
        if (!tracked || Math.abs(x - mouse[0]) > 1.6 || Math.abs(y - mouse[1]) > 1.6) {
          prevMouse[0] = x;
          prevMouse[1] = y;
          tracked = true;
        }
        mouse[0] = x;
        mouse[1] = y;
      }

      // Crossfade to the next logo
      let mix = 0;
      if (next) {
        const k = Math.min(1, (now - switchStart) / SWITCH_MS);
        mix = easeInOutCubic(k);
        if (k >= 1) {
          current = next;
          next = null;
          mix = 0;
        }
      }

      // The logo leans toward the pointer
      let lx = 0;
      let ly = 0;
      if (px && !reduced) {
        const reach = half * PARALLAX;
        lx = Math.max(-1, Math.min(1, (px[0] - cx) / (0.5 * W))) * reach;
        ly = Math.max(-1, Math.min(1, (px[1] - cy) / (0.5 * H))) * reach;
      }
      lean[0] += (lx - lean[0]) * 0.09;
      lean[1] += (ly - lean[1]) * 0.09;
      const lcx = cx + lean[0];
      const lcy = cy + lean[1];

      const near = px ? Math.hypot(px[0] - lcx, px[1] - lcy) < half : false;
      const on = reduced ? 0 : Math.max(t % 4 < 1.4 ? 1 : 0, near || next ? 1 : 0);
      hover += (on - hover) * 0.12;

      gl.bindVertexArray(vao);
      trail.step(mouse, prevMouse, 0.4, px ? 1 : 0);
      prevMouse[0] = mouse[0];
      prevMouse[1] = mouse[1];

      // Logo
      gl.bindFramebuffer(gl.FRAMEBUFFER, logoTarget.fbo);
      gl.viewport(0, 0, W, H);
      gl.useProgram(logoProg);
      gl.uniform1f(uLogo.iTime, t);
      gl.uniform1f(uLogo.uHover, hover);
      gl.uniform2f(uLogo.uLogoCenter, lcx, lcy);
      gl.uniform1f(uLogo.uLogoHalfSize, half);
      gl.uniform1f(uLogo.uMixT, mix);
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, textures[current] ?? empty);
      gl.uniform1i(uLogo.uLogoCurrent, 1);
      gl.activeTexture(gl.TEXTURE2);
      gl.bindTexture(gl.TEXTURE_2D, textures[next ?? current] ?? empty);
      gl.uniform1i(uLogo.uLogoNext, 2);
      gl.drawArrays(gl.TRIANGLES, 0, 3);

      // Bloom
      gl.bindFramebuffer(gl.FRAMEBUFFER, bloomTarget.fbo);
      gl.useProgram(bloomProg);
      gl.uniform2f(uBloom.iResolution, W, H);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, logoTarget.tex);
      gl.uniform1i(uBloom.iChannel0, 0);
      gl.drawArrays(gl.TRIANGLES, 0, 3);

      // CRT to the screen
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.useProgram(crtProg);
      gl.uniform2f(uCrt.iResolution, W, H);
      gl.uniform1f(uCrt.iTime, t);
      gl.uniform1f(uCrt.uHover, hover);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, bloomTarget.tex);
      gl.uniform1i(uCrt.iChannel0, 0);
      gl.activeTexture(gl.TEXTURE3);
      gl.bindTexture(gl.TEXTURE_2D, trail.tex);
      gl.uniform1i(uCrt.uTrail, 3);
      gl.uniform1f(uCrt.uTrailDisplace, 18 * getDpr());
      gl.uniform3f(uCrt.uTrailColor, ...fringe);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };

    // Runs only while on screen
    const io = new IntersectionObserver(([entry]) => {
      const was = visible;
      visible = entry.isIntersecting;
      if (visible && !was) raf = requestAnimationFrame(frame);
      if (!visible) cancelAnimationFrame(raf);
    });
    io.observe(canvas);
    raf = requestAnimationFrame(frame);

    return () => {
      disposed = true;
      io.disconnect();
      ro.disconnect();
      cancelAnimationFrame(raf);
      clearTimeout(resizeTimer);
      window.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerout", onOut);
      deleteTarget(gl, logoTarget);
      deleteTarget(gl, bloomTarget);
      trail.dispose();
      Object.values(textures).forEach((tex) => gl.deleteTexture(tex));
      gl.deleteTexture(empty);
      gl.deleteVertexArray(vao);
      [logoProg, bloomProg, crtProg].forEach((p) => gl.deleteProgram(p));
    };
  }, [logos]);

  useEffect(() => {
    activeRef.current = active;
    switchTo.current(active);
  }, [active]);

  if (failed) {
    const src = logos.find((l) => l.key === active)?.src;
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={src} alt="" className="absolute inset-0 m-auto max-h-[40%] max-w-[44%] object-contain" />
    );
  }
  return <canvas ref={canvasRef} aria-hidden className="absolute inset-0 block size-full" />;
}
