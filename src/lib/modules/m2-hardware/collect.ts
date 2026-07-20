// ============================================================
// M2 — Hardware layer (stable across browsers on same PC)
// ============================================================

import { fnv1aHash, sha256Hash } from '@/lib/utils/helpers';
import type { Module2Hardware } from '../types';

function canvasHash(draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void): string {
  try {
    const c = document.createElement('canvas');
    c.width = 320;
    c.height = 120;
    const ctx = c.getContext('2d', { willReadFrequently: true });
    if (!ctx) return 'no_ctx';
    draw(ctx, c.width, c.height);
    const data = ctx.getImageData(0, 0, c.width, c.height).data;
    let acc = 0;
    for (let i = 0; i < data.length; i += 31) acc = (acc + data[i]!) >>> 0;
    return fnv1aHash(`${c.toDataURL()}|${acc}`);
  } catch {
    return 'error';
  }
}

function collectCanvas() {
  const text = canvasHash((ctx) => {
    ctx.fillStyle = '#f4f4f4';
    ctx.fillRect(0, 0, 320, 120);
    ctx.fillStyle = '#1a1a2e';
    ctx.font = '16px Arial';
    ctx.textBaseline = 'top';
    ctx.fillText('EchoPrint M2 abc 012345', 4, 8);
    ctx.font = 'bold 14px Times New Roman';
    ctx.fillStyle = '#e94560';
    ctx.fillText('Cwm fjordbank glyphs vext quiz', 4, 32);
  });

  const emoji = canvasHash((ctx) => {
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, 320, 120);
    ctx.font = '28px Arial';
    ctx.fillText('😀🎨🚀🌐💻🔒🎯⚡🌈🦊', 8, 40);
  });

  const curves = canvasHash((ctx) => {
    ctx.fillStyle = '#0f0f23';
    ctx.fillRect(0, 0, 320, 120);
    ctx.strokeStyle = '#00d9ff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(10, 60);
    ctx.bezierCurveTo(80, 10, 160, 110, 240, 40);
    ctx.bezierCurveTo(280, 10, 300, 90, 310, 60);
    ctx.stroke();
    ctx.fillStyle = 'rgba(255, 100, 50, 0.5)';
    ctx.beginPath();
    ctx.arc(160, 60, 35, 0, Math.PI * 1.7);
    ctx.fill();
  });

  const combined = fnv1aHash(`${text}|${emoji}|${curves}`);
  return { text, emoji, curves, combined };
}

function collectWebGL() {
  const empty = {
    vendor: 'none',
    renderer: 'none',
    extensions: [] as string[],
    extensionCount: 0,
    triangleHash: 'none',
    parametersHash: 'none',
  };
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 128;
    const gl =
      (canvas.getContext('webgl') as WebGLRenderingContext | null) ||
      (canvas.getContext('experimental-webgl') as WebGLRenderingContext | null);
    if (!gl) return empty;

    const dbg = gl.getExtension('WEBGL_debug_renderer_info');
    const vendor = dbg
      ? String(gl.getParameter(dbg.UNMASKED_VENDOR_WEBGL) || 'unknown')
      : String(gl.getParameter(gl.VENDOR) || 'unknown');
    const renderer = dbg
      ? String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) || 'unknown')
      : String(gl.getParameter(gl.RENDERER) || 'unknown');
    const extensions = gl.getSupportedExtensions() || [];

    // triangle render hash
    const vs = gl.createShader(gl.VERTEX_SHADER)!;
    gl.shaderSource(
      vs,
      'attribute vec2 p;void main(){gl_Position=vec4(p,0.0,1.0);}'
    );
    gl.compileShader(vs);
    const fs = gl.createShader(gl.FRAGMENT_SHADER)!;
    gl.shaderSource(fs, 'precision mediump float;void main(){gl_FragColor=vec4(0.2,0.6,0.9,1.0);}');
    gl.compileShader(fs);
    const prog = gl.createProgram()!;
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    gl.useProgram(prog);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0, 0.8, -0.8, -0.6, 0.8, -0.6]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, 'p');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    gl.clearColor(0.05, 0.05, 0.08, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    const pixels = new Uint8Array(64 * 32 * 4);
    gl.readPixels(0, 0, 64, 32, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
    let sum = 0;
    for (let i = 0; i < pixels.length; i += 7) sum = (sum + pixels[i]!) >>> 0;
    const triangleHash = fnv1aHash(`${sum}|${canvas.toDataURL().slice(0, 200)}`);

    const params = [
      gl.getParameter(gl.MAX_TEXTURE_SIZE),
      gl.getParameter(gl.MAX_RENDERBUFFER_SIZE),
      gl.getParameter(gl.MAX_VERTEX_ATTRIBS),
      gl.getParameter(gl.MAX_VIEWPORT_DIMS),
      gl.getParameter(gl.ALIASED_LINE_WIDTH_RANGE),
    ];
    const parametersHash = fnv1aHash(JSON.stringify(params));

    return {
      vendor,
      renderer,
      extensions: extensions.slice(0, 80),
      extensionCount: extensions.length,
      triangleHash,
      parametersHash,
    };
  } catch {
    return empty;
  }
}

async function collectWebGPU() {
  try {
    const nav = navigator as Navigator & {
      gpu?: {
        requestAdapter: () => Promise<{
          requestAdapterInfo?: () => Promise<Record<string, string>>;
          features?: Set<string>;
          limits?: Record<string, number>;
        } | null>;
      };
    };
    if (!nav.gpu) {
      return { supported: false, adapterInfo: null, featuresHash: null };
    }
    const adapter = await nav.gpu.requestAdapter();
    if (!adapter) {
      return { supported: true, adapterInfo: 'no_adapter', featuresHash: null };
    }
    let info = 'adapter';
    try {
      if (adapter.requestAdapterInfo) {
        const i = await adapter.requestAdapterInfo();
        info = JSON.stringify(i);
      }
    } catch {
      info = 'info_denied';
    }
    const features = adapter.features ? Array.from(adapter.features).sort().join(',') : '';
    return {
      supported: true,
      adapterInfo: info.slice(0, 400),
      featuresHash: features ? fnv1aHash(features) : null,
    };
  } catch {
    return { supported: false, adapterInfo: null, featuresHash: null };
  }
}

async function collectAudio() {
  try {
    const Offline =
      window.OfflineAudioContext ||
      (window as unknown as { webkitOfflineAudioContext?: typeof OfflineAudioContext })
        .webkitOfflineAudioContext;
    if (!Offline) return { hash: 'unsupported', sampleRate: 0 };
    const ctx = new Offline(1, 44100, 44100);
    const osc = ctx.createOscillator();
    const comp = ctx.createDynamicsCompressor();
    osc.type = 'triangle';
    osc.frequency.value = 10000;
    comp.threshold.value = -50;
    comp.knee.value = 40;
    comp.ratio.value = 12;
    comp.attack.value = 0;
    comp.release.value = 0.25;
    osc.connect(comp);
    comp.connect(ctx.destination);
    osc.start(0);
    const buf = await ctx.startRendering();
    const ch = buf.getChannelData(0);
    let h = 0;
    for (let i = 4500; i < 5000; i++) h = (h + Math.floor(Math.abs(ch[i]!) * 1e9)) >>> 0;
    return { hash: h.toString(16), sampleRate: ctx.sampleRate };
  } catch {
    return { hash: 'error', sampleRate: 0 };
  }
}

const FONT_LIST = [
  'Arial', 'Arial Black', 'Calibri', 'Cambria', 'Candara', 'Comic Sans MS', 'Consolas',
  'Courier', 'Courier New', 'Georgia', 'Helvetica', 'Impact', 'Lucida Console',
  'Lucida Sans Unicode', 'Microsoft Sans Serif', 'Palatino Linotype', 'Segoe UI',
  'Tahoma', 'Times', 'Times New Roman', 'Trebuchet MS', 'Verdana', 'Wingdings',
  'Symbol', 'MS Gothic', 'MS Mincho', 'Yu Gothic', 'Meiryo', 'Malgun Gothic',
  'Microsoft YaHei', 'SimSun', 'Noto Sans', 'Noto Serif', 'Roboto', 'Ubuntu',
  'DejaVu Sans', 'Liberation Sans', 'FreeSans', 'Cantarell', 'Fira Sans',
  'Helvetica Neue', 'Menlo', 'Monaco', 'SF Pro Text', 'Avenir', 'Futura',
  'Gill Sans', 'Optima', 'American Typewriter', 'Andale Mono', 'Papyrus',
  'Brush Script MT', 'Garamond', 'Bookman', 'Avant Garde', 'Century Gothic',
  'Franklin Gothic Medium', 'Copperplate', 'Didot', 'Rockwell', 'Perpetua',
  'Geneva', 'Chalkboard', 'Noteworthy', 'Marker Felt', 'Zapfino',
  'Nirmala UI', 'Gabriola', 'Ink Free', 'Javanese Text', 'Leelawadee UI',
  'Myanmar Text', 'Sitka Text', 'Bahnschrift', 'Cascadia Code', 'Segoe UI Emoji',
  'Apple Color Emoji', 'Noto Color Emoji', 'Twemoji Mozilla',
];

function collectFonts() {
  const base = ['monospace', 'sans-serif', 'serif'];
  const testStr = 'mmmmmmmmmmlli';
  const size = '72px';
  const span = document.createElement('span');
  span.style.position = 'absolute';
  span.style.left = '-9999px';
  span.style.fontSize = size;
  span.textContent = testStr;
  document.body.appendChild(span);

  const baseW: Record<string, number> = {};
  for (const b of base) {
    span.style.fontFamily = b;
    baseW[b] = span.offsetWidth;
  }

  const detected: string[] = [];
  for (const font of FONT_LIST) {
    let found = false;
    for (const b of base) {
      span.style.fontFamily = `'${font}',${b}`;
      if (span.offsetWidth !== baseW[b]) {
        found = true;
        break;
      }
    }
    if (found) detected.push(font);
  }
  document.body.removeChild(span);

  let osGuess = 'unknown';
  if (detected.some((f) => f.includes('Segoe') || f === 'Cascadia Code')) osGuess = 'windows';
  else if (detected.some((f) => f.includes('SF Pro') || f === 'Menlo' || f === 'Helvetica Neue'))
    osGuess = 'macos';
  else if (detected.some((f) => f === 'Ubuntu' || f === 'Cantarell' || f === 'DejaVu Sans'))
    osGuess = 'linux';

  return {
    detected,
    count: detected.length,
    osGuess,
    hash: fnv1aHash(detected.join(',')),
  };
}

function collectScreen() {
  const s = {
    width: screen.width,
    height: screen.height,
    availWidth: screen.availWidth,
    availHeight: screen.availHeight,
    screenX: window.screenX ?? (window as unknown as { screenLeft?: number }).screenLeft ?? 0,
    screenY: window.screenY ?? (window as unknown as { screenTop?: number }).screenTop ?? 0,
    devicePixelRatio: window.devicePixelRatio || 1,
    colorDepth: screen.colorDepth,
    orientation: screen.orientation?.type ?? null,
  };
  return {
    ...s,
    hash: fnv1aHash(JSON.stringify(s)),
  };
}

function collectMath() {
  const vals = [
    Math.cos(Math.PI / 7),
    Math.sin(Math.E),
    Math.tan(0.333),
    Math.exp(0.5),
    Math.log(Math.PI),
    Math.sqrt(2),
    Math.acos(0.123),
    Math.asin(0.123),
    Math.atan2(1, 3),
  ].map((v) => v.toPrecision(21));
  return { hash: fnv1aHash(vals.join('|')) };
}

export async function collectModule2(): Promise<Module2Hardware> {
  const canvas = collectCanvas();
  const webgl = collectWebGL();
  const webgpu = await collectWebGPU();
  const audio = await collectAudio();
  const fonts = collectFonts();
  const screen = collectScreen();
  const math = collectMath();

  const raw = [
    canvas.combined,
    webgl.renderer,
    webgl.triangleHash,
    webgl.parametersHash,
    webgpu.featuresHash || '',
    audio.hash,
    fonts.hash,
    screen.hash,
    math.hash,
  ].join('||');

  const stableId = await sha256Hash(raw);

  // rough entropy: GPU heavy + canvas + fonts
  let bits = 12;
  if (webgl.renderer !== 'none' && webgl.renderer !== 'unknown') bits += 14;
  if (canvas.combined !== 'error') bits += 12;
  if (audio.hash !== 'unsupported') bits += 10;
  bits += Math.min(12, Math.log2(Math.max(2, fonts.count)));
  bits += 6; // screen
  if (webgpu.supported) bits += 4;

  return {
    canvas,
    webgl,
    webgpu,
    audio,
    fonts,
    screen,
    math,
    stableId: stableId.slice(0, 32),
    entropyBitsEstimate: Math.round(bits * 10) / 10,
  };
}
