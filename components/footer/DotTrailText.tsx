"use client";

import { useEffect, useRef } from "react";
import { cssColor } from "@/lib/color";
import { RGB2HSV, createProgram, createTrail, getDpr, uniforms } from "@/lib/gl";

/*
 * Text drawn as a grid of square dots, ported from the footer wordmark on curtisdesignr.me.
 * The pointer leaves a trail that drags the dots along and lights them up.
 * Without WebGL2 the plain text stays visible.
 */

/** Dot pitch as a share of the font size */
const CELL = 1 / 30;
/** Trail brush radius, in units of the element's height */
const RADIUS = 0.45;
/** How far the trail drags the dots, in units of the element's height */
const DISPLACE = 0.5;

const DOTS_FRAG = `#version 300 es
precision highp float;
uniform sampler2D uText;
uniform sampler2D uTrail;
uniform vec2 uResolution;
uniform float uCell;
uniform float uLod;
uniform vec3 uColor;
uniform vec3 uHighlight;
uniform float uDisplace;
out vec4 fragColor;
${RGB2HSV}
void main() {
  vec2 uv = gl_FragCoord.xy / uResolution;
  vec3 field = rgb2hsv(texture(uTrail, uv).rgb);
  float angle = field.x * 6.2831853;
  float strength = field.z;
  vec2 dir = vec2(cos(angle), sin(angle));
  // Drag in units of the height on both axes (the element is very wide)
  vec2 aspect = vec2(uResolution.x / uResolution.y, 1.0);
  vec2 src = uv - (dir * strength * uDisplace) / aspect;

  // Square cells in pixel space, one area-averaged sample per cell (mip level just under a cell)
  vec2 px = src * uResolution;
  vec2 center = (floor(px / uCell) + 0.5) * uCell;
  vec2 rel = fract(px / uCell) - 0.5;
  float dist = max(abs(rel.x), abs(rel.y));
  float ink = textureLod(uText, center / uResolution, uLod).a;
  float alpha = ink * (1.0 - smoothstep(0.34, 0.4, dist));

  // The trail also lifts the dot toward the highlight
  vec3 col = mix(uColor, uHighlight, clamp(strength * 1.6, 0.0, 1.0));
  fragColor = vec4(col * alpha, alpha);
}`;

export default function DotTrailText({ text, className = "" }: { text: string; className?: string }) {
  const rootRef = useRef<HTMLSpanElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const root = rootRef.current!;
    const label = textRef.current!;
    const canvas = canvasRef.current!;
    const gl = canvas.getContext("webgl2", { alpha: true, premultipliedAlpha: true, antialias: false });
    if (!gl) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const prog = createProgram(gl, DOTS_FRAG);
    const u = uniforms(gl, prog);
    const trail = createTrail(gl);
    const vao = gl.createVertexArray();
    const color = cssColor(getComputedStyle(root).color).map((v) => v / 255) as [number, number, number];
    const highlight = cssColor("var(--color-white)").map((v) => v / 255) as [number, number, number];

    const textTex = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, textTex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    const source = document.createElement("canvas");

    let W = 0;
    let H = 0;
    let cell = 3;
    // Size the buffers and redraw the text texture (on resize and once the font is in)
    const build = () => {
      const dpr = getDpr();
      const rect = root.getBoundingClientRect();
      W = Math.max(1, Math.round(rect.width * dpr));
      H = Math.max(1, Math.round(rect.height * dpr));
      canvas.width = W;
      canvas.height = H;
      const k = Math.min(1, 1024 / Math.max(W, H));
      trail.resize(Math.max(1, Math.round(W * k)), Math.max(1, Math.round(H * k)));

      const cs = getComputedStyle(label);
      const lr = label.getBoundingClientRect();
      source.width = W;
      source.height = H;
      const ctx = source.getContext("2d")!;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, rect.width, rect.height);
      ctx.font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
      ctx.letterSpacing = cs.letterSpacing;
      ctx.textAlign = "center";
      ctx.textBaseline = "alphabetic";
      ctx.fillStyle = "#fff";
      const str = cs.textTransform === "uppercase" ? text.toUpperCase() : text;
      const m = ctx.measureText(str);
      // Centred on the label's box, by the ink of the caps
      const x = lr.left - rect.left + lr.width / 2;
      const y = lr.top - rect.top + lr.height / 2 + (m.actualBoundingBoxAscent - m.actualBoundingBoxDescent) / 2;
      ctx.fillText(str, x, y);
      gl.bindTexture(gl.TEXTURE_2D, textTex);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE, source);
      gl.generateMipmap(gl.TEXTURE_2D);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
      cell = Math.max(3, parseFloat(cs.fontSize) * CELL) * dpr;
    };
    build();
    label.style.color = "transparent";

    const ro = new ResizeObserver(build);
    ro.observe(root);
    let disposed = false;
    document.fonts?.ready.then(() => !disposed && build());

    // Trail positions in 0..1 of the element (y up), from pointer moves only:
    // scrolling under a still pointer draws nothing
    const mouse: [number, number] = [0.5, 0.5];
    const prev: [number, number] = [0.5, 0.5];
    let tracked = false;
    let active = 0;
    const onMove = (e: PointerEvent) => {
      if (reduced) return;
      const r = root.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width;
      const y = 1 - (e.clientY - r.top) / r.height;
      if (!tracked || Math.abs(x - mouse[0]) > 1.8 || Math.abs(y - mouse[1]) > 1.8) {
        prev[0] = x;
        prev[1] = y;
        tracked = true;
      }
      mouse[0] = x;
      mouse[1] = y;
      active = 1;
    };
    window.addEventListener("pointermove", onMove, { passive: true });

    let raf = 0;
    const frame = () => {
      raf = requestAnimationFrame(frame);
      gl.bindVertexArray(vao);
      trail.step(mouse, prev, RADIUS, active);
      prev[0] = mouse[0];
      prev[1] = mouse[1];

      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, W, H);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
      gl.useProgram(prog);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, textTex);
      gl.uniform1i(u.uText, 0);
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, trail.tex);
      gl.uniform1i(u.uTrail, 1);
      gl.uniform2f(u.uResolution, W, H);
      gl.uniform1f(u.uCell, cell);
      gl.uniform1f(u.uLod, Math.max(0, Math.log2(Math.max(1, 0.7 * cell))));
      gl.uniform3f(u.uColor, ...color);
      gl.uniform3f(u.uHighlight, ...highlight);
      gl.uniform1f(u.uDisplace, DISPLACE);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };

    // Runs only while on screen
    const io = new IntersectionObserver(([entry]) => {
      cancelAnimationFrame(raf);
      if (entry.isIntersecting) raf = requestAnimationFrame(frame);
    });
    io.observe(root);

    return () => {
      disposed = true;
      io.disconnect();
      ro.disconnect();
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
      label.style.color = "";
      trail.dispose();
      gl.deleteTexture(textTex);
      gl.deleteVertexArray(vao);
      gl.deleteProgram(prog);
    };
  }, [text]);

  return (
    <span ref={rootRef} className={`block select-none ${className}`}>
      <span ref={textRef}>{text}</span>
      <canvas ref={canvasRef} aria-hidden className="pointer-events-none absolute inset-0 size-full" />
    </span>
  );
}
