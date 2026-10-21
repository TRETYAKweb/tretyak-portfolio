/** WebGL2 helpers shared by the fullscreen-pass effects (CRT screen, dot-matrix text). Client only. */

/** One triangle that covers the viewport; no buffers needed */
export const FULLSCREEN_VERT = `#version 300 es
void main() {
  vec2 p = vec2((gl_VertexID << 1) & 2, gl_VertexID & 2);
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`;

/**
 * Pointer trail as a feedback buffer: hue = direction of the drag, value = strength.
 * Fades every frame; the subtraction lets an 8-bit buffer actually reach zero.
 */
export const TRAIL_FRAG = `#version 300 es
precision highp float;
uniform sampler2D uPrev;
uniform vec2 uMouse;
uniform vec2 uPrevMouse;
uniform vec2 uResolution;
uniform float uRadius;
uniform float uDecay;
uniform float uActive;
out vec4 fragColor;
vec3 hsv2rgb(vec3 c) {
  vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
  vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
  return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}
void main() {
  vec2 uv = gl_FragCoord.xy / uResolution;
  vec2 av = vec2(uResolution.x / uResolution.y, 1.0);
  vec2 p = uv * av;
  vec2 a = uPrevMouse * av;
  vec2 b = uMouse * av;
  vec2 d = b - a;
  float len = length(d);
  vec2 dir = len > 0.0 ? d / len : vec2(1.0, 0.0);
  // Distance to the segment, so a fast flick draws a stroke rather than separate stamps
  float t = len > 0.0 ? clamp(dot(p - a, dir) / len, 0.0, 1.0) : 0.0;
  float s = smoothstep(uRadius, 0.0, distance(p, mix(a, b, t)));
  s *= s;
  float angle = atan(dir.y, dir.x);
  if (angle < 0.0) angle += 6.2831853;
  vec3 stroke = hsv2rgb(vec3(angle / 6.2831853, 1.0, 1.0));
  vec3 last = texture(uPrev, uv).rgb;
  vec3 draw = mix(last, stroke, min(0.7, len * 10.0) * s * 0.5 * uActive);
  fragColor = vec4(max(vec3(0.0), draw * uDecay - 0.005882), 1.0);
}`;

/** Decodes a trail texel back to (direction, strength); paste into shaders that read the trail */
export const RGB2HSV = `
vec3 rgb2hsv(vec3 c) {
  vec4 K = vec4(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0);
  vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));
  vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r));
  float d = q.x - min(q.w, q.y);
  float e = 1.0e-10;
  return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x);
}`;

export const getDpr = () => Math.min(window.devicePixelRatio || 1, 2);

function compile(gl: WebGL2RenderingContext, type: number, src: string) {
  const sh = gl.createShader(type)!;
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) console.error(gl.getShaderInfoLog(sh));
  return sh;
}

export function createProgram(gl: WebGL2RenderingContext, frag: string, vert = FULLSCREEN_VERT) {
  const prog = gl.createProgram()!;
  const vs = compile(gl, gl.VERTEX_SHADER, vert);
  const fs = compile(gl, gl.FRAGMENT_SHADER, frag);
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  gl.deleteShader(vs);
  gl.deleteShader(fs);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) console.error(gl.getProgramInfoLog(prog));
  return prog;
}

/** All active uniform locations of a program by name */
export function uniforms(gl: WebGL2RenderingContext, prog: WebGLProgram) {
  const out: Record<string, WebGLUniformLocation | null> = {};
  const n = gl.getProgramParameter(prog, gl.ACTIVE_UNIFORMS) as number;
  for (let i = 0; i < n; i++) {
    const name = gl.getActiveUniform(prog, i)!.name;
    out[name] = gl.getUniformLocation(prog, name);
  }
  return out;
}

export type Target = { tex: WebGLTexture; fbo: WebGLFramebuffer; w: number; h: number };

export function createTarget(gl: WebGL2RenderingContext, w: number, h: number): Target {
  const tex = gl.createTexture()!;
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  const fbo = gl.createFramebuffer()!;
  gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
  gl.clearColor(0, 0, 0, 1);
  gl.clear(gl.COLOR_BUFFER_BIT);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  return { tex, fbo, w, h };
}

export function deleteTarget(gl: WebGL2RenderingContext, t: Target | null) {
  if (!t) return;
  gl.deleteTexture(t.tex);
  gl.deleteFramebuffer(t.fbo);
}

/**
 * Ping-pong pair for the pointer trail. `step` draws the next frame from the previous one;
 * `tex` is the latest frame.
 */
export function createTrail(gl: WebGL2RenderingContext) {
  const prog = createProgram(gl, TRAIL_FRAG);
  const u = uniforms(gl, prog);
  let a: Target | null = null;
  let b: Target | null = null;

  return {
    resize(w: number, h: number) {
      deleteTarget(gl, a);
      deleteTarget(gl, b);
      a = createTarget(gl, w, h);
      b = createTarget(gl, w, h);
    },
    /** Mouse positions in 0..1 of the buffer (y up); radius in units of the buffer height */
    step(mouse: [number, number], prev: [number, number], radius: number, active: number) {
      if (!a || !b) return;
      gl.bindFramebuffer(gl.FRAMEBUFFER, b.fbo);
      gl.viewport(0, 0, b.w, b.h);
      gl.disable(gl.BLEND);
      gl.useProgram(prog);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, a.tex);
      gl.uniform1i(u.uPrev, 0);
      gl.uniform2f(u.uMouse, mouse[0], mouse[1]);
      gl.uniform2f(u.uPrevMouse, prev[0], prev[1]);
      gl.uniform2f(u.uResolution, b.w, b.h);
      gl.uniform1f(u.uRadius, radius);
      gl.uniform1f(u.uDecay, 0.9);
      gl.uniform1f(u.uActive, active);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      [a, b] = [b, a];
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    },
    get tex() {
      return a?.tex ?? null;
    },
    dispose() {
      deleteTarget(gl, a);
      deleteTarget(gl, b);
      gl.deleteProgram(prog);
    },
  };
}
