// A slow, deep aurora drawn with WebGL: midnight navy, deep blue, and emerald
// folding over each other, leaning gently toward the pointer.
// Renders at reduced resolution for performance, pauses when the tab is hidden,
// and draws a single still frame when the user prefers reduced motion.

const VERT = `
attribute vec2 p;
void main() { gl_Position = vec4(p, 0.0, 1.0); }
`

const FRAG = `
precision mediump float;
uniform vec2 uRes;
uniform float uTime;
uniform vec2 uPointer;

vec2 hash(vec2 p) {
  p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
  return -1.0 + 2.0 * fract(sin(p) * 43758.5453123);
}

float noise(vec2 p) {
  const float K1 = 0.366025404;
  const float K2 = 0.211324865;
  vec2 i = floor(p + (p.x + p.y) * K1);
  vec2 a = p - i + (i.x + i.y) * K2;
  float m = step(a.y, a.x);
  vec2 o = vec2(m, 1.0 - m);
  vec2 b = a - o + K2;
  vec2 c = a - 1.0 + 2.0 * K2;
  vec3 h = max(0.5 - vec3(dot(a, a), dot(b, b), dot(c, c)), 0.0);
  vec3 n = h * h * h * h * vec3(dot(a, hash(i)), dot(b, hash(i + o)), dot(c, hash(i + 1.0)));
  return dot(n, vec3(70.0));
}

float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 4; i++) {
    v += a * noise(p);
    p *= 2.02;
    a *= 0.5;
  }
  return v;
}

void main() {
  vec2 uv = gl_FragCoord.xy / uRes.xy;
  vec2 p = uv;
  p.x *= uRes.x / uRes.y;

  float t = uTime * 0.035;
  vec2 lean = (uPointer - 0.5) * 0.18;

  vec2 q = vec2(fbm(p * 0.8 + vec2(0.0, t) + lean), fbm(p * 0.8 + vec2(5.2, -t * 0.8)));
  float f = fbm(p * 1.05 + 1.4 * q + vec2(t * 0.6, -t * 0.3));

  vec3 night   = vec3(0.020, 0.043, 0.086);
  vec3 navy    = vec3(0.039, 0.102, 0.200);
  vec3 royal   = vec3(0.055, 0.149, 0.329);
  vec3 emerald = vec3(0.039, 0.290, 0.263);

  vec3 col = mix(night, navy, smoothstep(-0.6, 0.6, f));
  col = mix(col, royal, smoothstep(0.1, 0.9, q.x) * 0.55);
  col = mix(col, emerald, smoothstep(0.15, 0.85, f + q.y * 0.4) * 0.6);

  // Soft light near the pointer, and darker edges to frame the page
  float glow = smoothstep(0.65, 0.0, distance(uv, uPointer));
  col += vec3(0.055, 0.075, 0.07) * glow * 0.6;
  float vig = smoothstep(1.25, 0.25, distance(uv, vec2(0.5, 0.45)));
  col *= mix(0.55, 1.0, vig);

  gl_FragColor = vec4(col, 1.0);
}
`

export function startAurora(canvas: HTMLCanvasElement): void {
  const gl = canvas.getContext("webgl", { antialias: false, premultipliedAlpha: false, powerPreference: "low-power" })
  if (!gl) return // CSS gradient on <body> remains as the fallback

  const compile = (type: number, src: string): WebGLShader | null => {
    const s = gl.createShader(type)
    if (!s) return null
    gl.shaderSource(s, src)
    gl.compileShader(s)
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      console.warn(gl.getShaderInfoLog(s))
      return null
    }
    return s
  }

  const vs = compile(gl.VERTEX_SHADER, VERT)
  const fs = compile(gl.FRAGMENT_SHADER, FRAG)
  if (!vs || !fs) return
  const prog = gl.createProgram()
  if (!prog) return
  gl.attachShader(prog, vs)
  gl.attachShader(prog, fs)
  gl.linkProgram(prog)
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return
  gl.useProgram(prog)

  const buf = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, buf)
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW)
  const loc = gl.getAttribLocation(prog, "p")
  gl.enableVertexAttribArray(loc)
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0)

  const uRes = gl.getUniformLocation(prog, "uRes")
  const uTime = gl.getUniformLocation(prog, "uTime")
  const uPointer = gl.getUniformLocation(prog, "uPointer")

  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)")
  const scale = 0.5 // render at half resolution; the image is soft by design
  const pointer = { x: 0.3, y: 0.7, tx: 0.3, ty: 0.7 }

  const resize = () => {
    const w = Math.max(1, Math.floor(window.innerWidth * scale))
    const h = Math.max(1, Math.floor(window.innerHeight * scale))
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w
      canvas.height = h
      gl.viewport(0, 0, w, h)
    }
  }

  const draw = (time: number) => {
    resize()
    pointer.x += (pointer.tx - pointer.x) * 0.03
    pointer.y += (pointer.ty - pointer.y) * 0.03
    gl.uniform2f(uRes, canvas.width, canvas.height)
    gl.uniform1f(uTime, time / 1000)
    gl.uniform2f(uPointer, pointer.x, pointer.y)
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
  }

  let raf = 0
  const loop = (time: number) => {
    draw(time)
    raf = requestAnimationFrame(loop)
  }

  const start = () => {
    cancelAnimationFrame(raf)
    if (reduce.matches) draw(12000) // one still frame
    else raf = requestAnimationFrame(loop)
  }

  window.addEventListener("pointermove", (e) => {
    pointer.tx = e.clientX / window.innerWidth
    pointer.ty = 1 - e.clientY / window.innerHeight
  }, { passive: true })
  window.addEventListener("resize", () => { if (reduce.matches) draw(12000) })
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) cancelAnimationFrame(raf)
    else start()
  })
  reduce.addEventListener("change", start)

  start()
}
