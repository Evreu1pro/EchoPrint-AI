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
    const features = adapter.features ? Array.from(adapter.features).sort().join(',') : '';
    const featureList = features ? features.split(',') : [];

    // Chrome 128+ exposes `adapter.info` synchronously; older builds had the
    // async requestAdapterInfo(). Both are usually redacted, so fall back to
    // something actually informative instead of the literal string "adapter".
    let info = '';
    try {
      const syncInfo = (adapter as { info?: Record<string, string> }).info;
      if (syncInfo && Object.keys(syncInfo).length) {
        info = JSON.stringify(syncInfo);
      } else if (adapter.requestAdapterInfo) {
        const i = await adapter.requestAdapterInfo();
        if (i && Object.keys(i).length) info = JSON.stringify(i);
      }
    } catch {
      info = 'info_denied';
    }
    if (!info) {
      const limits = adapter.limits as Record<string, number> | undefined;
      const maxTex = limits?.maxTextureDimension2D;
      const maxBuf = limits?.maxBufferSize;
      info =
        `redacted · ${featureList.length} features` +
        (maxTex ? ` · maxTex2D ${maxTex}` : '') +
        (maxBuf ? ` · maxBuf ${Math.round(Number(maxBuf) / 1024 / 1024)}MB` : '');
    }
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

  const entropy = estimateEntropy({ canvas, webgl, webgpu, audio, fonts, screen, math });

  return {
    canvas,
    webgl,
    webgpu,
    audio,
    fonts,
    screen,
    math,
    stableId: stableId.slice(0, 32),
    entropyBitsEstimate: entropy.bits,
    entropyDetail: entropy.detail,
    entropyCapBits: entropy.capBits,
    oneInN: entropy.oneInN,
  };
}

// ============================================================
// Entropy estimation
// ------------------------------------------------------------
// The old model just summed per-signal bonuses (12 + 14 + 12 + 10 + …)
// and produced ~63 bits — physically impossible: 2^63 is a billion
// times more devices than exist. Two problems were fixed:
//
//   1. Correlation. Canvas / WebGL / WebGPU / fonts all leak the same
//      GPU + OS + driver combination. Their information overlaps, so
//      each additional signal gets a diminishing weight instead of a
//      full independent addition.
//   2. No ceiling. Real-world published measurements (Panopticlick /
//      AmIUnique / CreepJS) top out around 20–24 bits for a browser
//      fingerprint, and no fingerprint can beat log2(devices online)
//      ≈ 33 bits. We cap at that population ceiling.
// ============================================================

/** log2 of the plausible device population (~8.5e9 devices) ≈ 33 bits. */
export const ENTROPY_CAP_BITS = 33;
/** Practical ceiling observed in fingerprinting research. */
export const ENTROPY_PRACTICAL_CAP_BITS = 24;

export function estimateEntropy(m2: {
  canvas: { combined: string };
  webgl: { renderer: string; extensionCount: number };
  webgpu: { supported: boolean };
  audio: { hash: string };
  fonts: { count: number };
  screen: { width: number; height: number; devicePixelRatio: number; colorDepth: number };
  math: { hash: string };
}): {
  bits: number;
  capBits: number;
  oneInN: number;
  detail: { source: string; rawBits: number; countedBits: number; note?: string }[];
} {
  const raw: { source: string; rawBits: number; note?: string }[] = [];

  // GPU renderer string: the single strongest hardware signal.
  const rendererOk =
    m2.webgl.renderer !== 'none' && m2.webgl.renderer !== 'unknown' && m2.webgl.renderer !== '';
  const rendererMasked = /generic|masked|angle \(unknown|software/i.test(m2.webgl.renderer);
  if (rendererOk) {
    raw.push({
      source: 'WebGL renderer',
      rawBits: rendererMasked ? 4 : 9,
      note: rendererMasked ? 'renderer masked/generic' : 'GPU + driver string',
    });
  }

  // Canvas rendering (text + emoji + curves): overlaps heavily with GPU.
  if (m2.canvas.combined !== 'error' && m2.canvas.combined !== 'no_ctx') {
    raw.push({ source: 'Canvas ×3', rawBits: 7, note: 'rasterizer + font stack' });
  }

  // AudioContext DSP output.
  if (m2.audio.hash !== 'unsupported' && m2.audio.hash !== 'error') {
    raw.push({ source: 'AudioContext', rawBits: 5, note: 'DSP + sample rate' });
  }

  // Installed fonts: log2 of the detected count, realistically capped.
  if (m2.fonts.count > 0) {
    raw.push({
      source: 'Fonts',
      rawBits: Math.min(6, Math.log2(Math.max(2, m2.fonts.count))),
      note: `${m2.fonts.count} detected`,
    });
  }

  // Screen geometry: common resolutions are shared by millions.
  const commonRes = new Set(['1920x1080', '1366x768', '2560x1440', '1536x864', '3840x2160']);
  const resKey = `${m2.screen.width}x${m2.screen.height}`;
  raw.push({
    source: 'Screen',
    rawBits: commonRes.has(resKey) ? 2.5 : 4.5,
    note: commonRes.has(resKey) ? `${resKey} is a very common resolution` : resKey,
  });

  // WebGL extension count — mostly determined by the GPU already.
  if (m2.webgl.extensionCount > 0) {
    raw.push({ source: 'WebGL extensions', rawBits: 2, note: `${m2.webgl.extensionCount} exts` });
  }

  if (m2.webgpu.supported) {
    raw.push({ source: 'WebGPU', rawBits: 1.5, note: 'adapter features' });
  }

  // Math/JS engine precision: nearly identical across a browser family.
  raw.push({ source: 'Math / JS engine', rawBits: 0.8 });

  // ---- Correlation discount --------------------------------------------
  // Strongest signal counts fully, each following signal counts less,
  // because it mostly re-describes the same GPU/OS/driver combination.
  const weights = [1, 0.7, 0.55, 0.45, 0.35, 0.3, 0.25, 0.2];
  const sorted = [...raw].sort((a, b) => b.rawBits - a.rawBits);
  let total = 0;
  const detail = sorted.map((entry, i) => {
    const w = weights[i] ?? 0.15;
    const counted = Math.round(entry.rawBits * w * 10) / 10;
    total += counted;
    return {
      source: entry.source,
      rawBits: Math.round(entry.rawBits * 10) / 10,
      countedBits: counted,
      note: entry.note ? `${entry.note} · ×${w} correlation weight` : `×${w} correlation weight`,
    };
  });

  const capped = Math.min(total, ENTROPY_CAP_BITS);
  const bits = Math.round(capped * 10) / 10;

  return {
    bits,
    capBits: ENTROPY_CAP_BITS,
    oneInN: Math.round(2 ** bits),
    detail,
  };
}
