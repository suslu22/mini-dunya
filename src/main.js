/* ===================================================================
   Mini Dünya - render, girdi ve arayüz katmanı (Three.js)
   Simülasyon kodu sim.js içinde; build sırasında bu dosyanın başına eklenir.
   =================================================================== */
const $ = (id) => document.getElementById(id);
const lerp = (a, b, t) => a + (b - a) * t;
const canvas = $('c');
const coarse = matchMedia('(pointer:coarse)').matches;

/* ---------------------------------------------------------------- ayarlar (kayıtlı) */
const SAVE_KEY = 'minidunya.ayarlar.v1';
const prefs = (() => { try { return JSON.parse(localStorage.getItem(SAVE_KEY)) || {}; } catch (_) { return {}; } })();
let isReal = !prefs.low;          // true: gerçekçi grafik, false: low-poly
let userTilt = prefs.tilt === undefined ? !isReal : !!prefs.tilt;
let tiltTouched = prefs.tilt !== undefined;
const UREAL = { value: isReal ? 1 : 0 };   // shader'lar ile paylaşılan stil anahtarı

/* ---------------------------------------------------------------- dünya */
const world = new World();
world.generate((Math.random() * 1e6) | 0);

/* ---------------------------------------------------------------- renderer / sahne */
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.toneMapping = THREE.NeutralToneMapping || THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0xcfeaff, 150, 520);
const camera = new THREE.PerspectiveCamera(36, 1, 0.5, 3000);
const U = { uTime: { value: 0 } };
// Mevsim ve hava: arazi, çatı ve çim gölgelendiricileri bu değerleri okur (iklim durumu CL, climate.js'te)
const SEAS = { uSnow: { value: 0 }, uWet: { value: 0 }, uGrass: { value: new THREE.Vector3(1, 1, 1) } };
const SEAS_GRASS = [[1.04, 1.09, 0.94], [1.0, 0.96, 0.82], [1.32, 0.9, 0.5], [0.93, 0.9, 0.82]];   // çimen rengi çarpanları: ilkbahar, yaz, sonbahar, kış
let SUNK = 3.0, HEMIK = 1.2;     // stile göre ışık çarpanları

const hemi = new THREE.HemisphereLight(0xbcd8ff, 0x8a7a55, 1.7);
scene.add(hemi);
const sun = new THREE.DirectionalLight(0xfff0d0, 3.0);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.bias = -0.0008;
sun.shadow.normalBias = 0.05;
sun.shadow.camera.near = 20;
sun.shadow.camera.far = 520;
scene.add(sun, sun.target);
//@@HD@@

/* ---------------------------------------------------------------- arazi */
const hexRGB = (h) => { const c = new THREE.Color(h); return [c.r, c.g, c.b]; };
const PALS = {
  low: {
    col: ['#79c14b', '#ecd89d', '#f3f8ff', '#8f9099', '#9c7449', '#ff6a1f', '#6e655d', '#9a5f2c'].map(hexRGB),
    hi: hexRGB('#a5ba4c'), lo: hexRGB('#4fa23c'), deep: hexRGB('#1a5778'),
  },
  real: {
    col: ['#5f8d38', '#d3c18f', '#eef3f8', '#7d7a74', '#86663f', '#ff6a1f', '#4d4540', '#7d4b22'].map(hexRGB),
    hi: hexRGB('#8c9a44'), lo: hexRGB('#3f7a2e'), deep: hexRGB('#10394f'),
  },
};
let COL = PALS.low.col, GRASS_HI = PALS.low.hi, GRASS_LO = PALS.low.lo, DEEPC = PALS.low.deep;
function setPalette() { const p = isReal ? PALS.real : PALS.low; COL = p.col; GRASS_HI = p.hi; GRASS_LO = p.lo; DEEPC = p.deep; }
let _r = 0, _g = 0, _b = 0;
function triColor(soil, ny, h, j) {
  const b = COL[soil];
  let r = b[0], g = b[1], bl = b[2];
  if (soil === SOIL.GRASS) {
    const t = clamp((h - 2.5) / 7, 0, 1) * 0.8;
    r += (GRASS_HI[0] - r) * t; g += (GRASS_HI[1] - g) * t; bl += (GRASS_HI[2] - bl) * t;
    const t2 = clamp(1 - h / 2.5, 0, 1) * 0.35;
    r += (GRASS_LO[0] - r) * t2; g += (GRASS_LO[1] - g) * t2; bl += (GRASS_LO[2] - bl) * t2;
  }
  if (soil !== SOIL.ROCK && soil !== SOIL.LAVA) {
    const k = clamp(((soil === SOIL.SNOW ? 0.62 : 0.8) - ny) / 0.2, 0, 1);
    if (k > 0) { const rc = COL[SOIL.ROCK]; r += (rc[0] - r) * k; g += (rc[1] - g) * k; bl += (rc[2] - bl) * k; }
  }
  if (h < SEA) {
    const t = clamp(-h / 6, 0, 1) * 0.85;
    r += (DEEPC[0] - r) * t; g += (DEEPC[1] - g) * t; bl += (DEEPC[2] - bl) * t;
  }
  const m = soil === SOIL.FARM ? 0.84 + 0.32 * j : 0.92 + 0.16 * j;   // sürülmüş tarla: belirgin şeritli doku
  _r = r * m; _g = g * m; _b = bl * m;
}

const terrainMat = new THREE.MeshLambertMaterial({ vertexColors: true });
terrainMat.onBeforeCompile = (sh) => {
  sh.uniforms.uTime = U.uTime;
  sh.uniforms.uReal = UREAL;
  sh.uniforms.uSnow = SEAS.uSnow; sh.uniforms.uWet = SEAS.uWet; sh.uniforms.uGrass = SEAS.uGrass;
  sh.uniforms.tTer = HDU.tTer; sh.uniforms.uHD = HDU.uHD; sh.uniforms.uTexel = HDU.uTexel;
  sh.vertexShader = sh.vertexShader
    .replace('#include <common>', '#include <common>\nattribute float glow;\nattribute vec4 soilw;\nvarying float vGlow;\nvarying vec3 vWP;\nvarying vec4 vSW;\nvarying vec3 vNO;')
    .replace('#include <begin_vertex>', '#include <begin_vertex>\nvGlow = glow; vWP = position; vSW = soilw; vNO = normal;');
  sh.fragmentShader = sh.fragmentShader
    .replace('#include <common>', `#include <common>
      uniform float uTime; uniform float uReal; uniform float uHD; uniform float uTexel; uniform sampler2D tTer; uniform float uSnow; uniform float uWet; uniform vec3 uGrass;
      varying float vGlow; varying vec3 vWP; varying vec4 vSW; varying vec3 vNO;
      float h21(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
      float vn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
        return mix(mix(h21(i), h21(i + vec2(1.0, 0.0)), f.x), mix(h21(i + vec2(0.0, 1.0)), h21(i + vec2(1.0, 1.0)), f.x), f.y); }`)
    .replace('#include <color_fragment>', `#include <color_fragment>
      vec2 tG = vec2(0.0);
      if (uReal > 0.5) {
        vec2 q = vWP.xz;
        float n1 = vn(q * 0.22), n2 = vn(q * 1.3 + 7.1), n3 = vn(q * 5.3 + 2.7);
        float nn = n1 * 0.5 + n2 * 0.32 + n3 * 0.18;
        if (uHD > 0.5) nn = n1 * 0.8 + 0.1;
        diffuseColor.rgb *= 0.8 + 0.4 * nn;
        diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * vec3(1.1, 1.03, 0.78), smoothstep(0.55, 0.85, n1) * 0.5);
        if (uHD > 0.5) {
          vec4 w = vSW; vec3 nn3 = normalize(vNO);
          vec2 uv = q * 0.2, uv2 = mat2(0.8, -0.6, 0.6, 0.8) * q * 0.043;
          float e = uTexel * 1.5;
          float h0 = dot(texture2D(tTer, uv), w);
          float hx = dot(texture2D(tTer, uv + vec2(e, 0.0)), w), hz = dot(texture2D(tTer, uv + vec2(0.0, e)), w);
          float m1 = dot(texture2D(tTer, uv2), w);
          float L = h0 * (0.6 + 0.8 * m1);
          float side = smoothstep(0.84, 0.58, nn3.y);
          if (side > 0.01) {
            vec2 sv = (abs(nn3.x) > abs(nn3.z) ? vWP.zy : vWP.xy) * 0.2;
            L = mix(L, dot(texture2D(tTer, sv), w), side);
          }
          diffuseColor.rgb *= 0.36 + 1.28 * L;
          tG = vec2(h0 - hx, h0 - hz) / (e * 5.0) * 0.11 * (1.0 - side);
        }
      }
      {   // mevsim: çimen rengi, ıslak zemin ve kar örtüsü
        float grn = clamp((diffuseColor.g - max(diffuseColor.r, diffuseColor.b)) * 7.0, 0.0, 1.0);
        diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * uGrass, grn);
        diffuseColor.rgb *= 1.0 - 0.22 * uWet;
        float up = smoothstep(0.6, 0.9, normalize(vNO).y), above = smoothstep(0.05, 0.5, vWP.y);
        float sn = uSnow * up * above * step(vGlow, 0.01) * smoothstep(0.12, 0.5, vn(vWP.xz * 0.9) * 0.55 + uSnow * 0.6);
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.88, 0.92, 1.0), clamp(sn, 0.0, 1.0));
      }`)
    .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
      if (uReal > 0.5) {
        if (uHD > 0.5) {
          float fade = 1.0 - smoothstep(34.0, 120.0, length(vViewPosition));
          normal = normalize(normal + (viewMatrix * vec4(tG.x, 0.0, tG.y, 0.0)).xyz * fade);
        } else {
          vec2 bq = vWP.xz * 2.6; float be = 0.35;
          float b0 = vn(bq), bx = vn(bq + vec2(be, 0.0)), bz = vn(bq + vec2(0.0, be));
          normal = normalize(normal + (viewMatrix * vec4((b0 - bx) * 0.5, 0.0, (b0 - bz) * 0.5, 0.0)).xyz);
        }
      }`)
    .replace('#include <emissivemap_fragment>',
      '#include <emissivemap_fragment>\n totalEmissiveRadiance += vec3(1.0, 0.36, 0.07) * vGlow * (0.8 + 0.35 * sin(uTime * 3.0 + vWP.x * 1.7 + vWP.z * 1.3));');
};
terrainMat.customProgramCacheKey = () => 'terrain-hd';

const chunks = [];
for (let cj = 0; cj < NCH; cj++) for (let ci = 0; ci < NCH; ci++) {
  const nv = CH * CH * 6;
  const geo = new THREE.BufferGeometry();
  const pos = new THREE.BufferAttribute(new Float32Array(nv * 3), 3);
  const nor = new THREE.BufferAttribute(new Float32Array(nv * 3), 3);
  const col = new THREE.BufferAttribute(new Float32Array(nv * 3), 3);
  const glw = new THREE.BufferAttribute(new Float32Array(nv), 1);
  const sw = new THREE.BufferAttribute(new Float32Array(nv * 4), 4);
  [pos, nor, col, glw, sw].forEach((a) => a.setUsage(THREE.DynamicDrawUsage));
  geo.setAttribute('position', pos); geo.setAttribute('normal', nor);
  geo.setAttribute('color', col); geo.setAttribute('glow', glw); geo.setAttribute('soilw', sw);
  geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(ci * CH + CH / 2 - HALF, 4, cj * CH + CH / 2 - HALF), 30);
  const mesh = new THREE.Mesh(geo, terrainMat);
  mesh.castShadow = true; mesh.receiveShadow = true;
  mesh.matrixAutoUpdate = false;
  scene.add(mesh);
  chunks.push({ pos, nor, col, glw, sw });
}

/* Gerçekçi mod: köşe başına yumuşak normal + komşu hücrelerle harmanlanan renk + sahte ortam kararması */
let _vr = 0, _vg = 0, _vb = 0, _nx = 0, _ny = 1, _nz = 0, _w0 = 1, _w1 = 0, _w2 = 0, _w3 = 0;
// toprak türü → HD doku kanalı: 0 çimen · 1 kum/kar · 2 kaya/lav · 3 toprak/kül
const SOIL_CH = [0, 1, 1, 2, 3, 2, 3, 3];
function vertShade(vx, vz) {
  const H = world.H, h = H[vz * VN + vx];
  const hl = H[vz * VN + (vx > 0 ? vx - 1 : vx)], hr = H[vz * VN + (vx < VN - 1 ? vx + 1 : vx)];
  const hu = H[(vz > 0 ? vz - 1 : vz) * VN + vx], hd = H[(vz < VN - 1 ? vz + 1 : vz) * VN + vx];
  let nx = hl - hr, nz = hu - hd, ny = 2;
  const l = Math.sqrt(nx * nx + ny * ny + nz * nz); nx /= l; ny /= l; nz /= l;
  _nx = nx; _ny = ny; _nz = nz;
  let r = 0, g = 0, b = 0, n = 0, w0 = 0, w1 = 0, w2 = 0, w3 = 0;
  const jit = 0.5 + (hash2(vx, vz, 5) - 0.5) * 0.5;
  for (let dz = -1; dz <= 0; dz++) for (let dx = -1; dx <= 0; dx++) {
    const cx = vx + dx, cz = vz + dz;
    if (cx < 0 || cz < 0 || cx >= N || cz >= N) continue;
    const sl = world.farmAt[cz * N + cx] >= 0 ? SOIL.FARM : world.soil[cz * N + cx];
    triColor(sl, ny, h, jit);
    r += _r; g += _g; b += _b; n++;
    const c = SOIL_CH[sl];
    if (c === 0) w0++; else if (c === 1) w1++; else if (c === 2) w2++; else w3++;
  }
  const inv = 1 / (n || 1);
  const conc = (hl + hr + hu + hd) * 0.25 - h;            // >0: çukur, <0: tepe
  const ao = clamp(1 - clamp(conc, 0, 2.5) * 0.17 + clamp(-conc, 0, 1) * 0.07, 0.62, 1.1);
  _vr = r * inv * ao; _vg = g * inv * ao; _vb = b * inv * ao;
  const rk = clamp((0.8 - ny) / 0.2, 0, 1);                // dik yamaçlar kaya dokusuna döner
  _w0 = w0 * inv * (1 - rk); _w1 = w1 * inv * (1 - rk); _w2 = w2 * inv * (1 - rk) + rk; _w3 = w3 * inv * (1 - rk);
}
const VD = new Float32Array((CH + 1) * (CH + 1) * 10);
function fillChunkSmooth(ch, ci, cj) {
  const P = ch.pos.array, Nn = ch.nor.array, C = ch.col.array, G = ch.glw.array, W = ch.sw.array, H = world.H;
  const S = CH + 1;
  for (let z = 0; z <= CH; z++) for (let x = 0; x <= CH; x++) {
    vertShade(ci * CH + x, cj * CH + z);
    const k = (z * S + x) * 10;
    VD[k] = _vr; VD[k + 1] = _vg; VD[k + 2] = _vb; VD[k + 3] = _nx; VD[k + 4] = _ny; VD[k + 5] = _nz;
    VD[k + 6] = _w0; VD[k + 7] = _w1; VD[k + 8] = _w2; VD[k + 9] = _w3;
  }
  let o = 0, g = 0, glow = 0;
  const put = (wx, wz, hi, li) => {
    P[o] = wx; P[o + 1] = H[hi]; P[o + 2] = wz;
    const k = li * 10;
    C[o] = VD[k]; C[o + 1] = VD[k + 1]; C[o + 2] = VD[k + 2];
    Nn[o] = VD[k + 3]; Nn[o + 1] = VD[k + 4]; Nn[o + 2] = VD[k + 5];
    const q = g * 4; W[q] = VD[k + 6]; W[q + 1] = VD[k + 7]; W[q + 2] = VD[k + 8]; W[q + 3] = VD[k + 9];
    G[g++] = glow; o += 3;
  };
  for (let z = 0; z < CH; z++) for (let x = 0; x < CH; x++) {
    const cx = ci * CH + x, cz = cj * CH + z, cell = cz * N + cx, i = cz * VN + cx;
    const wx = cx - HALF, wz = cz - HALF;
    glow = world.soil[cell] === SOIL.LAVA ? 1 : world.fire[cell] > 0 ? 0.55 : 0;
    const a = z * S + x, b = a + 1, c = a + S, d = c + 1;
    if (((cx + cz) & 1) === 0) {
      put(wx, wz, i, a); put(wx, wz + 1, i + VN, c); put(wx + 1, wz + 1, i + VN + 1, d);
      put(wx, wz, i, a); put(wx + 1, wz + 1, i + VN + 1, d); put(wx + 1, wz, i + 1, b);
    } else {
      put(wx, wz, i, a); put(wx, wz + 1, i + VN, c); put(wx + 1, wz, i + 1, b);
      put(wx + 1, wz, i + 1, b); put(wx, wz + 1, i + VN, c); put(wx + 1, wz + 1, i + VN + 1, d);
    }
  }
  ch.pos.needsUpdate = ch.nor.needsUpdate = ch.col.needsUpdate = ch.glw.needsUpdate = ch.sw.needsUpdate = true;
}

function fillChunk(ci, cj) {
  const ch = chunks[cj * NCH + ci];
  if (isReal) return fillChunkSmooth(ch, ci, cj);
  const P = ch.pos.array, Nn = ch.nor.array, C = ch.col.array, G = ch.glw.array;
  const H = world.H;
  let o = 0, g = 0, soil = 0, avg = 0, glow = 0, cell = 0;
  const tri = (ax, ay, az, bx, by, bz, cx, cy, cz, k) => {
    const ux = bx - ax, uy = by - ay, uz = bz - az, vx = cx - ax, vy = cy - ay, vz = cz - az;
    let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    const l = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1; nx /= l; ny /= l; nz /= l;
    triColor(soil, ny, avg, hash2(cell, k, 3));
    P[o] = ax; P[o + 1] = ay; P[o + 2] = az; P[o + 3] = bx; P[o + 4] = by; P[o + 5] = bz; P[o + 6] = cx; P[o + 7] = cy; P[o + 8] = cz;
    for (let q = 0; q < 3; q++) {
      Nn[o + q * 3] = nx; Nn[o + q * 3 + 1] = ny; Nn[o + q * 3 + 2] = nz;
      C[o + q * 3] = _r; C[o + q * 3 + 1] = _g; C[o + q * 3 + 2] = _b;
      G[g + q] = glow;
    }
    o += 9; g += 3;
  };
  for (let z = 0; z < CH; z++) for (let x = 0; x < CH; x++) {
    const cx = ci * CH + x, cz = cj * CH + z;
    cell = cz * N + cx;
    const i = cz * VN + cx;
    const ha = H[i], hb = H[i + 1], hc = H[i + VN], hd = H[i + VN + 1];
    const wx = cx - HALF, wz = cz - HALF;
    soil = world.soil[cell]; avg = (ha + hb + hc + hd) * 0.25;
    glow = soil === SOIL.LAVA ? 1 : world.fire[cell] > 0 ? 0.55 : 0;
    if (world.farmAt[cell] >= 0) soil = SOIL.FARM;
    if (((cx + cz) & 1) === 0) {
      tri(wx, ha, wz, wx, hc, wz + 1, wx + 1, hd, wz + 1, 0);
      tri(wx, ha, wz, wx + 1, hd, wz + 1, wx + 1, hb, wz, 1);
    } else {
      tri(wx, ha, wz, wx, hc, wz + 1, wx + 1, hb, wz, 0);
      tri(wx + 1, hb, wz, wx, hc, wz + 1, wx + 1, hd, wz + 1, 1);
    }
  }
  ch.pos.needsUpdate = ch.nor.needsUpdate = ch.col.needsUpdate = ch.glw.needsUpdate = true;
}

/* ---------------------------------------------------------------- su (shader) */
const WG = VN + 2;
const waterGeo = new THREE.BufferGeometry();
{
  const pos = new Float32Array(WG * WG * 3), dep = new Float32Array(WG * WG);
  const xs = new Float32Array(WG);
  xs[0] = -1500; xs[WG - 1] = 1500;
  for (let i = 1; i < WG - 1; i++) xs[i] = i - 1 - HALF;
  for (let j = 0; j < WG; j++) for (let i = 0; i < WG; i++) {
    const k = (j * WG + i) * 3;
    pos[k] = xs[i]; pos[k + 1] = SEA; pos[k + 2] = xs[j];
    dep[j * WG + i] = 12;
  }
  const idx = [];
  for (let j = 0; j < WG - 1; j++) for (let i = 0; i < WG - 1; i++) {
    const a = j * WG + i, b = a + 1, c = a + WG, d = c + 1;
    if (((i - 1 + j - 1) & 1) === 0) idx.push(a, c, d, a, d, b); else idx.push(a, c, b, b, c, d);
  }
  waterGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  waterGeo.setAttribute('depth', new THREE.BufferAttribute(dep, 1).setUsage(THREE.DynamicDrawUsage));
  waterGeo.setIndex(idx);
  waterGeo.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0, 0), 4000);
}
const waterU = THREE.UniformsUtils.merge([THREE.UniformsLib.fog, {
  uShallow: { value: new THREE.Color('#72e3d4') }, uDeep: { value: new THREE.Color('#1b62b8') },
  uFoam: { value: new THREE.Color('#ffffff') }, uSunDir: { value: new THREE.Vector3(0, 1, 0) },
  uSunCol: { value: new THREE.Color('#fff2d8') }, uDay: { value: 1 }, uSky: { value: new THREE.Color('#cfe8ff') },
  uSkyTop: { value: new THREE.Color('#3f8cff') },
}]);
waterU.uTime = U.uTime;
waterU.uReal = UREAL;
waterU.tWat = HDU.tWat; waterU.uHD = HDU.uHD;
const waterMat = new THREE.ShaderMaterial({
  uniforms: waterU, transparent: true, depthWrite: false, fog: true,
  vertexShader: `
    attribute float depth; varying float vDepth; varying vec3 vWP; uniform float uTime;
    #include <fog_pars_vertex>
    void main() {
      vec3 p = position;
      float inner = 1.0 - step(${HALF}.5, max(abs(p.x), abs(p.z)));
      float w = sin(p.x * 0.55 + uTime * 1.1) + sin(p.z * 0.63 + uTime * 0.9) + sin((p.x + p.z) * 0.37 + uTime * 1.4);
      p.y += w * 0.055 * inner * smoothstep(-0.2, 1.2, depth);
      vDepth = depth; vWP = p;
      vec4 mvPosition = modelViewMatrix * vec4(p, 1.0);
      gl_Position = projectionMatrix * mvPosition;
      #include <fog_vertex>
    }`,
  fragmentShader: `
    uniform float uTime; uniform vec3 uShallow, uDeep, uFoam, uSunDir, uSunCol, uSky, uSkyTop; uniform float uDay, uReal, uHD;
    uniform sampler2D tWat;
    varying float vDepth; varying vec3 vWP;
    #include <common>
    #include <fog_pars_fragment>
    float h21(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
    float vn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
      return mix(mix(h21(i), h21(i + vec2(1.0, 0.0)), f.x), mix(h21(i + vec2(0.0, 1.0)), h21(i + vec2(1.0, 1.0)), f.x), f.y); }
    void wv(inout vec2 g, vec2 p, vec2 dir, float f, float s, float a) {
      g += a * f * cos(f * dot(dir, p) + s * uTime) * dir;
    }
    void main() {
      float d = max(vDepth, 0.0);
      vec3 V = normalize(cameraPosition - vWP);
      vec3 col; float a;
      float edge = 1.0 - smoothstep(0.0, 0.09, d);
      if (uReal > 0.5) {
        vec2 p = vWP.xz, g = vec2(0.0);
        wv(g, p, vec2(0.98, 0.2), 0.9, 1.2, 0.05);
        wv(g, p, vec2(-0.38, 0.92), 1.6, 1.5, 0.035);
        wv(g, p, vec2(0.7, 0.71), 3.2, 2.3, 0.02);
        wv(g, p, vec2(-0.95, 0.3), 6.1, 3.0, 0.011);
        wv(g, p, vec2(0.1, -0.99), 11.0, 3.6, 0.006);
        if (uHD > 0.5) {
          float hk = 1.0 - smoothstep(60.0, 220.0, length(cameraPosition - vWP));
          vec4 ta = texture2D(tWat, p * 0.13 + vec2(uTime * 0.012, uTime * 0.007));
          vec4 tb = texture2D(tWat, p * 0.37 + vec2(-uTime * 0.021, uTime * 0.016));
          g += ((ta.rg - 0.5) * 0.5 + (tb.ba - 0.5) * 0.36 + (ta.ba - 0.5) * 0.18 + (tb.rg - 0.5) * 0.14) * hk;
        }
        vec3 fn = normalize(vec3(-g.x, 1.0, -g.y));
        vec3 R = reflect(-V, fn);
        float ndv = max(dot(V, fn), 0.0);
        float fres = 0.03 + 0.97 * pow(1.0 - ndv, 5.0);
        vec3 body = mix(uShallow, uDeep, smoothstep(0.0, 6.5, d));
        body *= (0.5 + 0.5 * clamp(dot(fn, uSunDir), 0.0, 1.0)) * uDay;
        vec3 refl = mix(uSky, uSkyTop, clamp(R.y * 1.4, 0.0, 1.0)) * uDay;
        col = mix(body, refl, clamp(fres * 1.15, 0.0, 0.92));
        float sp = pow(max(dot(R, uSunDir), 0.0), 380.0) * 2.4 + pow(max(dot(R, uSunDir), 0.0), 40.0) * 0.12;
        col += uSunCol * sp * uDay;
        float n = vn(p * 1.7 + vec2(uTime * 0.25, -uTime * 0.18));
        float band = 0.34 + 0.14 * sin(uTime * 1.1 + p.x * 0.6 + p.y * 0.5);
        float foam = 1.0 - smoothstep(band * 0.35, band, d + (n - 0.5) * 0.22);
        float rip = 0.5 + 0.5 * sin(d * 11.0 - uTime * 1.8 + n * 5.0);
        foam *= 0.5 + 0.5 * rip;
        col = mix(col, uFoam * (0.4 + 0.6 * uDay), clamp(foam * 0.8 + edge * 0.9, 0.0, 1.0));
        a = mix(0.5, 0.95, smoothstep(0.0, 3.8, d)) + fres * 0.25;
        a = clamp(a, 0.0, 1.0) * smoothstep(0.0, 0.1, vDepth);
        a = max(a, edge * 0.85 * step(0.0, vDepth));
      } else {
        vec3 fn = normalize(cross(dFdx(vWP), dFdy(vWP)));
        if (fn.y < 0.0) fn = -fn;
        col = mix(uShallow, uDeep, smoothstep(0.0, 7.0, d));
        float diff = clamp(dot(fn, uSunDir), 0.0, 1.0);
        col *= (0.55 + 0.45 * diff) * uDay;
        vec3 Hh = normalize(V + uSunDir);
        col += uSunCol * pow(max(dot(fn, Hh), 0.0), 110.0) * uDay * 0.9;
        float fres = pow(1.0 - max(dot(V, fn), 0.0), 3.0);
        col = mix(col, uSky * uDay, fres * 0.4);
        float band = 0.38 + 0.12 * sin(uTime * 1.3 + vWP.x * 0.8 + vWP.z * 0.7);
        float foam = 1.0 - smoothstep(band * 0.45, band, d);
        float rip = 0.5 + 0.5 * sin(d * 12.0 - uTime * 2.2 + sin(vWP.x * 1.3) * 1.5 + sin(vWP.z * 1.1) * 1.5);
        foam *= 0.55 + 0.45 * rip;
        col = mix(col, uFoam * (0.35 + 0.65 * uDay), clamp(foam * 0.85 + edge, 0.0, 1.0));
        a = mix(0.62, 0.97, smoothstep(0.0, 4.5, d));
        a *= smoothstep(0.0, 0.12, vDepth);
        a = max(a, edge * 0.85 * step(0.0, vDepth));
      }
      gl_FragColor = vec4(col, a);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
      #include <fog_fragment>
    }`,
});
const water = new THREE.Mesh(waterGeo, waterMat);
water.renderOrder = 2; water.frustumCulled = false;
scene.add(water);

function updateWater() {
  const dep = waterGeo.attributes.depth.array;
  for (let vz = 0; vz < VN; vz++) for (let vx = 0; vx < VN; vx++)
    dep[(vz + 1) * WG + vx + 1] = clamp(SEA - world.H[vz * VN + vx], -2, 12);
  waterGeo.attributes.depth.needsUpdate = true;
  world.waterDirty = false;
}

/* ---------------------------------------------------------------- gökyüzü */
const skyMat = new THREE.ShaderMaterial({
  side: THREE.BackSide, depthWrite: false, fog: false,
  uniforms: {
    uTop: { value: new THREE.Color('#3f8cff') }, uHor: { value: new THREE.Color('#d2ecff') },
    uSunDir: { value: new THREE.Vector3(0, 1, 0) }, uSunCol: { value: new THREE.Color('#fff2d8') }, uStars: { value: 0 },
    uCloud: { value: 0 }, uTime: U.uTime, uDay: { value: 1 },
  },
  vertexShader: 'varying vec3 vD; void main(){ vD = position; vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0); gl_Position = p.xyww; }',
  fragmentShader: `
    varying vec3 vD; uniform vec3 uTop, uHor, uSunDir, uSunCol; uniform float uStars, uCloud, uTime, uDay;
    float sh(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
    float sn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
      return mix(mix(sh(i), sh(i + vec2(1.0, 0.0)), f.x), mix(sh(i + vec2(0.0, 1.0)), sh(i + vec2(1.0, 1.0)), f.x), f.y); }
    float sfb(vec2 p){ float s = 0.0, a = 0.5; for (int i = 0; i < 5; i++) { s += a * sn(p); p = p * 2.03 + 11.7; a *= 0.5; } return s; }
    void main() {
      vec3 d = normalize(vD); float h = d.y;
      vec3 col = mix(uHor, uTop, pow(clamp(h, 0.0, 1.0), 0.5));
      float s = max(dot(d, uSunDir), 0.0);
      col += uSunCol * (pow(s, 900.0) * 6.0 + pow(s, 14.0) * 0.22);
      if (uCloud > 0.5 && h > 0.02) {
        vec2 cp = d.xz / (h + 0.22) * 1.6 + vec2(uTime * 0.012, uTime * 0.005);
        float cl = smoothstep(0.5, 0.82, sfb(cp) * 1.15 + sfb(cp * 2.7) * 0.18);
        cl *= smoothstep(0.02, 0.22, h);
        vec3 cc = mix(uHor, vec3(1.0), 0.78) * (0.25 + 0.75 * uDay) + uSunCol * pow(s, 6.0) * 0.35;
        col = mix(col, cc, cl * 0.82);
      }
      if (uStars > 0.01 && h > 0.0) {
        vec3 q = floor(d * 260.0);
        float r = fract(sin(dot(q, vec3(12.9898, 78.233, 37.719))) * 43758.5453);
        col += vec3(step(0.9972, r)) * uStars * smoothstep(0.0, 0.3, h);
        float m = dot(d, -uSunDir);
        col += vec3(0.85, 0.9, 1.0) * smoothstep(0.9994, 0.9998, m) * uStars;
      }
      gl_FragColor = vec4(col, 1.0);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`,
});
const sky = new THREE.Mesh(new THREE.SphereGeometry(1000, 24, 14), skyMat);
sky.renderOrder = -10; sky.frustumCulled = false;
scene.add(sky);

/* ---------------------------------------------------------------- geometri setleri */
// low: orijinal düz yüzeyli low-poly. real: yumuşak gölgelendirmeli, daha detaylı modeller.
// Her köşeye "color" (sahte ortam kararması) eklenir; örnek renkleriyle çarpılır.
const flat = (g) => { const n = g.index ? g.toNonIndexed() : g; n.deleteAttribute('uv'); n.computeVertexNormals(); return n; };
const paint = (g, f) => {
  const p = g.attributes.position, n = p.count, c = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const v = f(p.getX(i), p.getY(i), p.getZ(i));
    if (typeof v === 'number') { c[i * 3] = c[i * 3 + 1] = c[i * 3 + 2] = v; } else { c[i * 3] = v[0]; c[i * 3 + 1] = v[1]; c[i * 3 + 2] = v[2]; }
  }
  g.setAttribute('color', new THREE.BufferAttribute(c, 3));
  return g;
};
const white = (g) => paint(g, () => 1);
const soft = (g, disp) => {
  g.deleteAttribute('uv'); g.deleteAttribute('normal');
  if (disp) { const p = g.attributes.position; for (let i = 0; i < p.count; i++) { const o = disp(p.getX(i), p.getY(i), p.getZ(i)); p.setXYZ(i, o[0], o[1], o[2]); } }
  const m = mergeVertices(g, 1e-4); m.computeVertexNormals(); return m;
};
const pn = (x, y, z) => Math.sin(x * 5.1 + y * 3.7) * Math.cos(z * 4.3 - x * 2.9) * 0.5 + Math.sin(y * 7.3 + z * 6.1) * 0.5;
const bx = (w, h, d, x, y, z, c) => { const g = new THREE.BoxGeometry(w, h, d); g.deleteAttribute('uv'); g.translate(x, y, z); return paint(g, () => c); };

function blob(r, detail, x, y, z, amp, shade) {
  const s = soft(new THREE.IcosahedronGeometry(r, detail), (px, py, pz) => {
    const k = 1 + amp * pn(px / r * 1.3 + x * 3, py / r * 1.3 + y * 3, pz / r * 1.3 + z * 3);
    return [px * k, py * k * 0.92, pz * k];
  });
  s.translate(x, y, z);
  return paint(s, (px, py) => shade[0] + shade[1] * clamp((py - (y - r * 0.9)) / (r * 1.9), 0, 1));
}
function pineTier(R, H, y0) {
  const s = soft(new THREE.ConeGeometry(R, H, 10, 2, true), (px, py, pz) => {
    const t = (py + H / 2) / H, ang = Math.atan2(pz, px), rim = 1 - t;
    const j = 1 + 0.12 * Math.sin(ang * 3 + R * 9) * rim + 0.08 * Math.sin(ang * 7 + R * 3) * rim;
    const bl = j * (1 + 0.14 * Math.sin(t * Math.PI));
    return [px * bl, py - 0.05 * rim * rim, pz * bl];
  });
  s.translate(0, y0, 0);
  return paint(s, (px, py, pz) => 0.52 + 0.5 * clamp(Math.hypot(px, pz) / R, 0, 1));
}

function buildSet(real, ultra) {
  if (!real) {
    return {
      cloud: mergeGeometries([
        white(flat(new THREE.IcosahedronGeometry(4.2, 1))),
        white(flat(new THREE.IcosahedronGeometry(3.2, 1)).translate(4.6, -0.6, 0.8)),
        white(flat(new THREE.IcosahedronGeometry(3.4, 1)).translate(-4.4, -0.5, -0.6)),
        white(flat(new THREE.IcosahedronGeometry(2.6, 1)).translate(1.2, 0.2, 3.6)),
      ]),
      oak: mergeGeometries([
        white(flat(new THREE.IcosahedronGeometry(0.42, 0)).translate(0, 0.86, 0)),
        white(flat(new THREE.IcosahedronGeometry(0.3, 0)).translate(0.25, 0.62, 0.1)),
        white(flat(new THREE.IcosahedronGeometry(0.28, 0)).translate(-0.2, 0.66, -0.13)),
      ]),
      pine: mergeGeometries([
        white(flat(new THREE.ConeGeometry(0.5, 0.6, 6)).translate(0, 0.62, 0)),
        white(flat(new THREE.ConeGeometry(0.38, 0.52, 6)).translate(0, 0.92, 0)),
        white(flat(new THREE.ConeGeometry(0.26, 0.46, 6)).translate(0, 1.2, 0)),
      ]),
      trunk: white(flat(new THREE.CylinderGeometry(0.05, 0.085, 0.62, 5)).translate(0, 0.31, 0)),
      wall: white(flat(new THREE.BoxGeometry(0.82, 0.9, 0.82)).translate(0, 0.1, 0)),
      roof: white(flat(new THREE.ConeGeometry(0.74, 0.58, 4)).rotateY(Math.PI / 4).translate(0, 0.84, 0)),
      body: white(flat(new THREE.CylinderGeometry(0.085, 0.15, 0.42, 6)).translate(0, 0.21, 0)),
      head: white(flat(new THREE.IcosahedronGeometry(0.115, 0)).translate(0, 0.54, 0)),
      legs: null,
    };
  }
  const d = ultra ? 2 : 1;
  const cb = (r, x, y, z) => {
    const s = soft(new THREE.IcosahedronGeometry(r, 2), (px, py, pz) => {
      const k = 1 + 0.13 * pn(px * 0.5 + x, py * 0.6 + y, pz * 0.5 + z);
      return [px * k, py * k * 0.85, pz * k];
    });
    s.translate(x, y, z);
    return paint(s, (px, py) => 0.7 + 0.32 * clamp((py - (y - r * 0.8)) / (r * 1.6), 0, 1));
  };
  const legGeo = (x) => new THREE.CylinderGeometry(0.03, 0.036, 0.19, 6).translate(x, 0.095, 0);
  return {
    cloud: mergeGeometries([cb(4.2, 0, 0, 0), cb(3.2, 4.6, -0.6, 0.8), cb(3.4, -4.4, -0.5, -0.6), cb(2.6, 1.2, 0.2, 3.6), cb(2.4, -1.8, 0.8, -3)]),
    oak: mergeGeometries([
      blob(0.4, d, 0, 0.84, 0, 0.2, [0.62, 0.5]), blob(0.3, 1, 0.25, 0.6, 0.08, 0.2, [0.6, 0.5]),
      blob(0.28, 1, -0.2, 0.64, -0.12, 0.2, [0.6, 0.5]), blob(0.22, 1, 0.05, 1.12, 0.06, 0.2, [0.7, 0.4]),
    ]),
    pine: mergeGeometries([pineTier(0.52, 0.55, 0.58), pineTier(0.44, 0.5, 0.82), pineTier(0.34, 0.46, 1.05), pineTier(0.22, 0.42, 1.28)]),
    trunk: white(new THREE.CylinderGeometry(0.045, 0.085, 0.62, 8, 2).translate(0, 0.31, 0)),
    wall: mergeGeometries([
      bx(0.82, 0.9, 0.82, 0, 0.1, 0, [1, 1, 1]),
      bx(0.88, 0.16, 0.88, 0, -0.3, 0, [0.62, 0.6, 0.57]),
      bx(0.2, 0.36, 0.05, 0, -0.07, 0.41, [0.4, 0.28, 0.18]),
      bx(0.15, 0.15, 0.05, 0.24, 0.22, 0.41, [0.5, 0.68, 0.85]), bx(0.15, 0.15, 0.05, -0.24, 0.22, 0.41, [0.5, 0.68, 0.85]),
      bx(0.05, 0.15, 0.15, 0.41, 0.22, 0, [0.5, 0.68, 0.85]), bx(0.05, 0.15, 0.15, -0.41, 0.22, 0, [0.5, 0.68, 0.85]),
      bx(0.14, 0.42, 0.14, 0.22, 0.92, -0.17, [0.6, 0.57, 0.54]),
    ]),
    roof: white(flat(new THREE.ConeGeometry(0.8, 0.6, 4)).rotateY(Math.PI / 4).translate(0, 0.84, 0)),
    body: paint(new THREE.CapsuleGeometry(0.09, 0.13, 4, 10).translate(0, 0.33, 0), (x, y) => 0.78 + 0.28 * clamp((y - 0.2) / 0.3, 0, 1)),
    head: white(new THREE.IcosahedronGeometry(0.093, 2).translate(0, 0.585, 0)),
    legs: white(mergeGeometries([legGeo(-0.045), legGeo(0.045)])),
  };
}
const SETS = {};
const setKey = (real, ultra) => (real ? (ultra ? 'ultra' : 'real') : 'low');
const getSet = (real, ultra) => SETS[setKey(real, ultra)] || (SETS[setKey(real, ultra)] = buildSet(real, ultra));
const SET0 = getSet(isReal, false);

/* ---------------------------------------------------------------- bulutlar */
const cloudMat = new THREE.MeshLambertMaterial({ color: 0xffffff, emissive: 0x2a3042, vertexColors: true });
const CLOUDS = 16;
const clouds = new THREE.InstancedMesh(SET0.cloud, cloudMat, CLOUDS);
clouds.castShadow = true; clouds.frustumCulled = false;
const cloudData = [];
for (let i = 0; i < CLOUDS; i++) cloudData.push({ x: (Math.random() - 0.5) * 360, z: (Math.random() - 0.5) * 300, y: 34 + Math.random() * 14, s: 0.8 + Math.random() * 1.1, sp: 1.2 + Math.random() * 1.6 });
scene.add(clouds);
const _m4 = new THREE.Matrix4(), _q = new THREE.Quaternion(), _v3 = new THREE.Vector3(), _s3 = new THREE.Vector3();
// Kamera ile hedef arasında kalan bulutlar küçülerek kaybolur, görüşü kapatmaz.
function updateClouds(dt) {
  const D = Math.max(cam.dist, 40), cp = camera.position;
  for (let i = 0; i < CLOUDS; i++) {
    const c = cloudData[i];
    c.x += c.sp * dt; if (c.x > 190) c.x = -190;
    const d = Math.hypot(c.x - cp.x, c.y - cp.y, c.z - cp.z);
    const s = c.s * smooth(0.35 * D, 0.75 * D, d) * (i < 6 ? 1 : 0.25 + 0.95 * Math.min(1, CL.cloud * 1.3)) + 1e-4;
    _v3.set(c.x, c.y, c.z); _s3.set(s * 1.5, s * 0.75, s);
    _m4.compose(_v3, _q, _s3); clouds.setMatrixAt(i, _m4);
  }
  clouds.instanceMatrix.needsUpdate = true;
}

/* ---------------------------------------------------------------- ağaçlar */
const MAXT = 7200;
const makeInst = (geo, mat, cap, colored) => {
  const m = new THREE.InstancedMesh(geo, mat, cap);
  m.frustumCulled = false; m.count = 0;
  m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  if (colored) { m.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(cap * 3), 3); m.instanceColor.setUsage(THREE.DynamicDrawUsage); }
  return m;
};
const trunkMat = new THREE.MeshLambertMaterial({ color: new THREE.Color('#6d4b33'), vertexColors: true });
const leafMat = new THREE.MeshLambertMaterial({ color: 0xffffff, vertexColors: true });
leafMat.onBeforeCompile = (sh) => {
  sh.uniforms.uTime = U.uTime;
  sh.vertexShader = sh.vertexShader
    .replace('#include <common>', '#include <common>\nuniform float uTime;')
    .replace('#include <begin_vertex>', `#include <begin_vertex>
      float sw = max(position.y - 0.3, 0.0) * 0.07;
      vec3 ip = vec3(instanceMatrix[3]);
      transformed.x += sin(uTime * 1.7 + ip.x * 0.7 + ip.z * 0.5) * sw;
      transformed.z += cos(uTime * 1.4 + ip.z * 0.6 + ip.x * 0.3) * sw * 0.7;`);
};
hdPatch(trunkMat, 'wood', { sc: [3.2, 1.2, 3.2], amt: 0.9, bump: 1.6, id: 'trunk' });
hdPatch(leafMat, 'leaf', { sc: 3.0, amt: 0.7, bump: 0.9, id: 'leaf' });
const oakM = makeInst(SET0.oak, leafMat, MAXT, true);
const pineM = makeInst(SET0.pine, leafMat, MAXT, true);
const oakT = makeInst(SET0.trunk, trunkMat, MAXT, false);
const pineT = makeInst(SET0.trunk, trunkMat, MAXT, false);
oakT.instanceMatrix = oakM.instanceMatrix; pineT.instanceMatrix = pineM.instanceMatrix;
[oakM, pineM].forEach((m) => { m.castShadow = true; });
oakT.castShadow = pineT.castShadow = false;
scene.add(oakM, pineM, oakT, pineT);

const AUTUMN = [[0.82, 0.3, 0.03], [0.88, 0.58, 0.06], [0.55, 0.12, 0.04], [0.72, 0.66, 0.1]];   // sonbahar yaprak renkleri
function rebuildTrees() {
  const A = oakM.instanceMatrix.array, AC = oakM.instanceColor.array;
  const B = pineM.instanceMatrix.array, BC = pineM.instanceColor.array;
  const T = world.treeT, S = world.treeS, Bn = world.treeBorn, F = world.fire, simT = world.simTime;
  let no = 0, np = 0, young = 0;
  for (let cell = 0; cell < N * N; cell++) {
    const t = T[cell]; if (!t) continue;
    const cx = cell % N, cz = (cell / N) | 0;
    const j1 = hash2(cx, cz, 1), j2 = hash2(cx, cz, 2), j3 = hash2(cx, cz, 3);
    const x = cx - HALF + 0.5 + (j1 - 0.5) * 0.5, z = cz - HALF + 0.5 + (j2 - 0.5) * 0.5;
    const y = world.getHeight(x, z) - 0.04;
    const age = simT - Bn[cell]; let gs = 1;
    if (age < 40) { gs = 0.35 + 0.65 * smooth(0, 1, age / 40); young++; }
    const burning = F[cell] > 0;
    const s = S[cell] * gs * (burning ? 0.85 : 1);
    const ang = j3 * 6.2832, c = Math.cos(ang) * s, sn = Math.sin(ang) * s;
    let arr, carr, o, co;
    if (t === 1) { if (no >= MAXT) continue; arr = A; carr = AC; o = no * 16; co = no * 3; no++; }
    else { if (np >= MAXT) continue; arr = B; carr = BC; o = np * 16; co = np * 3; np++; }
    arr[o] = c; arr[o + 1] = 0; arr[o + 2] = -sn; arr[o + 3] = 0;
    arr[o + 4] = 0; arr[o + 5] = s; arr[o + 6] = 0; arr[o + 7] = 0;
    arr[o + 8] = sn; arr[o + 9] = 0; arr[o + 10] = c; arr[o + 11] = 0;
    arr[o + 12] = x; arr[o + 13] = y; arr[o + 14] = z; arr[o + 15] = 1;
    let r, g, b;
    if (burning) { r = 0.13; g = 0.09; b = 0.07; }
    else if (t === 1) {
      if (j2 < 0.07) { r = 0.7; g = 0.28 + j1 * 0.2; b = 0.03; }
      else if (isReal) { r = 0.06 + 0.08 * j1; g = 0.19 + 0.11 * j2; b = 0.035; }
      else { r = 0.05 + 0.12 * j1; g = 0.33 + 0.17 * j2; b = 0.06; }
      if (CL.w[0] > 0.02 && j1 > 0.72) { const k = CL.w[0] * 0.8; r = lerp(r, 0.8, k); g = lerp(g, 0.42, k); b = lerp(b, 0.52, k); }   // ilkbahar: çiçek açan ağaçlar
      if (CL.w[2] > 0.02) { const ac = AUTUMN[(j1 * 4) | 0], k = CL.w[2] * 0.92; r = lerp(r, ac[0], k); g = lerp(g, ac[1], k); b = lerp(b, ac[2], k); }
      if (CL.w[3] > 0.02) { const k = CL.w[3] * 0.88; r = lerp(r, 0.2 + 0.06 * j1, k); g = lerp(g, 0.15 + 0.04 * j2, k); b = lerp(b, 0.11, k); }   // kış: yapraksız dallar
      if (CL.cover > 0.02) { const k = CL.cover * 0.5; r = lerp(r, 0.62, k); g = lerp(g, 0.66, k); b = lerp(b, 0.7, k); }
    } else {
      if (isReal) { r = 0.02 + 0.025 * j1; g = 0.13 + 0.08 * j2; b = 0.07 + 0.03 * j1; }
      else { r = 0.02 + 0.03 * j1; g = 0.2 + 0.1 * j2; b = 0.1 + 0.03 * j1; }
      if (world.soil[cell] === SOIL.SNOW) { r = lerp(r, 0.6, 0.55); g = lerp(g, 0.66, 0.55); b = lerp(b, 0.68, 0.55); }
      if (CL.w[2] > 0.02) { const k = CL.w[2] * 0.22; r = lerp(r, 0.2, k); g = lerp(g, 0.22, k); b = lerp(b, 0.05, k); }
      if (CL.cover > 0.02) { const k = CL.cover * 0.62; r = lerp(r, 0.66, k); g = lerp(g, 0.72, k); b = lerp(b, 0.76, k); }   // karla kaplı çamlar
    }
    carr[co] = r; carr[co + 1] = g; carr[co + 2] = b;
  }
  oakM.count = oakT.count = no; pineM.count = pineT.count = np;
  oakM.instanceMatrix.needsUpdate = pineM.instanceMatrix.needsUpdate = true;
  oakM.instanceColor.needsUpdate = pineM.instanceColor.needsUpdate = true;
  world.treesDirty = false;
  return young;
}

/* ---------------------------------------------------------------- evler */
const wallMat = new THREE.MeshLambertMaterial({ color: 0xffffff, emissive: 0x000000, vertexColors: true });
const roofMat = new THREE.MeshLambertMaterial({ color: 0xffffff, emissive: 0x000000, vertexColors: true });
hdPatch(wallMat, 'stucco', { sc: 2.2, amt: 0.75, bump: 1.0, id: 'wall' });
hdPatch(roofMat, 'roof', { sc: 1.8, amt: 0.85, bump: 1.5, id: 'roof' });
const roofBase = roofMat.onBeforeCompile;
roofMat.onBeforeCompile = (sh, rd) => {   // çatının yukarı bakan yüzleri kar tutar
  roofBase(sh, rd);
  sh.uniforms.uSnow = SEAS.uSnow;
  sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying float vUpY;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvUpY = normal.y;');
  sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform float uSnow; varying float vUpY;')
    .replace('#include <color_fragment>', '#include <color_fragment>\ndiffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.9, 0.93, 1.0), uSnow * smoothstep(0.35, 0.75, vUpY));');
};
const wallM = makeInst(SET0.wall, wallMat, MAXHOUSE, true);
const roofM = makeInst(SET0.roof, roofMat, MAXHOUSE, true);
wallM.castShadow = roofM.castShadow = true; wallM.receiveShadow = roofM.receiveShadow = true;
scene.add(wallM, roofM);

const TRIBE_COLS = ['#e8453c', '#3b82f6', '#f2b01e', '#a463f2', '#27c4b0', '#f15bb5', '#8ac926', '#ff8c42'].map(hexRGB);
const SKINS = ['#f6d3b3', '#e8b48a', '#c98f65', '#8f5c3b', '#f0c8a0'].map(hexRGB);

// Çağa göre ev görünümü: Taş Çağı'nda alçak, sivri çatılı kulübeler → Modern Çağ'da yüksek, düz çatılı apartmanlar.
const ERA_WALL = [[0.6, 0.47, 0.32], [0.82, 0.74, 0.57], [0.64, 0.64, 0.62], [0.76, 0.4, 0.3], [0.8, 0.84, 0.9]];
const ERA_SC = [0.82, 0.92, 1.0, 1.06, 1.1], ERA_SY = [0.72, 0.95, 1.08, 1.3, 1.85], ERA_SR = [1.5, 1.0, 0.95, 0.9, 0.4];
const ERA_GRAY = [0, 0, 0.15, 0.5, 0.65];   // çatının kabile rengi yerine griye kayma oranı
function updateHouses() {
  const hs = world.houses, n = Math.min(hs.length, MAXHOUSE);
  const A = wallM.instanceMatrix.array, R = roofM.instanceMatrix.array, WC = wallM.instanceColor.array, RC = roofM.instanceColor.array;
  for (let i = 0; i < n; i++) {
    const o = hs[i], p = o.prog, fac = o.kind === 1, era = Math.min(o.era | 0, 4);
    const e = p >= 1 ? 1 : 1 - Math.pow(1 - p, 3);
    const pop = 1 + 0.22 * Math.sin(o.up * Math.PI);   // çağ atlayan ev "zıplar"
    const sc = (0.35 + 0.65 * e) * (fac ? 1.3 : ERA_SC[era]) * pop;
    const sy = (0.2 + 0.8 * e) * (fac ? 1.05 : ERA_SY[era]) * pop, sr = (0.2 + 0.8 * e) * (fac ? 0.35 : ERA_SR[era]) * pop;
    const c = Math.cos(o.rot), s = Math.sin(o.rot), k = i * 16;
    A[k] = c * sc; A[k + 1] = 0; A[k + 2] = -s * sc; A[k + 3] = 0;
    A[k + 4] = 0; A[k + 5] = sy; A[k + 6] = 0; A[k + 7] = 0;
    A[k + 8] = s * sc; A[k + 9] = 0; A[k + 10] = c * sc; A[k + 11] = 0;
    A[k + 12] = o.x; A[k + 13] = o.y; A[k + 14] = o.z; A[k + 15] = 1;
    for (let q = 0; q < 16; q++) R[k + q] = A[k + q];
    R[k + 5] = sr; R[k + 13] = o.y + 0.55 * (sy - sr);   // çatı, duvarın tepesine otursun
    const j = hash2(o.cell, 7, 1), tc = TRIBE_COLS[o.tribe % TRIBE_COLS.length], q = i * 3;
    const wc = fac ? [0.46, 0.46, 0.5] : ERA_WALL[era], gm = fac ? 0.7 : ERA_GRAY[era], jj = 0.9 + 0.2 * j;
    WC[q] = wc[0] * jj; WC[q + 1] = wc[1] * jj; WC[q + 2] = wc[2] * jj;
    RC[q] = tc[0] + (0.5 - tc[0]) * gm; RC[q + 1] = tc[1] + (0.52 - tc[1]) * gm; RC[q + 2] = tc[2] + (0.56 - tc[2]) * gm;
  }
  wallM.count = roofM.count = n;
  wallM.instanceMatrix.needsUpdate = roofM.instanceMatrix.needsUpdate = true;
  wallM.instanceColor.needsUpdate = true; roofM.instanceColor.needsUpdate = true;
}

/* ---------------------------------------------------------------- tarlalar (ekinler) */
// Tarlanın toprağı arazi rengiyle çizilir; üzerindeki ekin sıraları burada. Büyüdükçe boylanır, olgunlaşınca altın rengine döner.
const CROP_N = 9, CROP_MAX = MAXFARM * CROP_N;
const cropGeo = isReal
  ? mergeGeometries([0, 1, 2].map((q) => white(flat(new THREE.ConeGeometry(0.035, 0.4, 4)).rotateZ((q - 1) * 0.28).translate((q - 1) * 0.045, 0.2, 0)))
      .concat([white(flat(new THREE.CapsuleGeometry(0.028, 0.1, 2, 4)).translate(0, 0.43, 0))]))
  : white(flat(new THREE.ConeGeometry(0.075, 0.36, 5)).translate(0, 0.18, 0));
const cropM = makeInst(cropGeo, new THREE.MeshLambertMaterial({ color: 0xffffff, vertexColors: true }), CROP_MAX, true);
cropM.castShadow = false; cropM.receiveShadow = true;
scene.add(cropM);
function updateFarms() {
  const fs = world.farms, A = cropM.instanceMatrix.array, CC = cropM.instanceColor.array;
  let m = 0;
  for (let i = 0; i < fs.length; i++) {
    const f = fs[i];
    if (f.st === 0 && f.prog >= 1) continue;   // boş tarla: yalnızca sürülmüş toprak
    const gr = f.st === 2 ? 1 : f.st === 1 ? f.g : 0, e = Math.min(1, f.prog) * (0.2 + 0.8 * Math.min(1, gr * 1.15));
    const ripe = f.st === 2 ? 1 : Math.max(0, (gr - 0.7) / 0.3);
    const rot = hash2(f.cell, 3, 9) < 0.5 ? 0 : Math.PI / 2, c = Math.cos(rot), s = Math.sin(rot);
    for (let q = 0; q < CROP_N; q++) {
      if (m >= CROP_MAX) break;
      const lx = ((q % 3) - 1) * 0.29 + (hash2(f.cell, q, 1) - 0.5) * 0.05, lz = (((q / 3) | 0) - 1) * 0.29 + (hash2(f.cell, q, 2) - 0.5) * 0.05;
      const wx = f.x + lx * c - lz * s, wz = f.z + lx * s + lz * c;
      const k = m * 16, sw = 1 + 0.06 * Math.sin(U.uTime.value * 2 + wx * 1.7 + wz * 1.3);
      A[k] = e * sw; A[k + 1] = 0; A[k + 2] = 0; A[k + 3] = 0;
      A[k + 4] = 0; A[k + 5] = e * (0.5 + 0.7 * gr); A[k + 6] = 0; A[k + 7] = 0;
      A[k + 8] = 0; A[k + 9] = 0; A[k + 10] = e * sw; A[k + 11] = 0;
      A[k + 12] = wx; A[k + 13] = world.getHeight(wx, wz) + 0.02; A[k + 14] = wz; A[k + 15] = 1;
      const w = 0.9 + 0.2 * hash2(f.cell, q, 3), cq = m * 3;
      CC[cq] = (0.34 + 0.52 * ripe) * w; CC[cq + 1] = (0.66 + 0.04 * ripe) * w; CC[cq + 2] = (0.2 + 0.02 * ripe) * w;
      m++;
    }
  }
  cropM.count = m;
  cropM.instanceMatrix.needsUpdate = true; cropM.instanceColor.needsUpdate = true;
}

/* ---------------------------------------------------------------- insanlar */
const bodyM = makeInst(SET0.body, hdPatch(new THREE.MeshLambertMaterial({ color: 0xffffff, vertexColors: true }), 'cloth', { sc: 12, amt: 0.7, bump: 0.8, id: 'hbody' }), MAXHUM, true);
const headM = makeInst(SET0.head, hdPatch(new THREE.MeshLambertMaterial({ color: 0xffffff, vertexColors: true }), 'skin', { sc: 9, amt: 0.6, bump: 0.7, id: 'hhead' }), MAXHUM, true);
const legM = makeInst(SET0.legs || new THREE.BufferGeometry(), hdPatch(new THREE.MeshLambertMaterial({ color: 0x5a4632, vertexColors: true }), 'cloth', { sc: 12, amt: 0.7, bump: 0.8, id: 'hleg' }), MAXHUM, false);
headM.instanceMatrix = bodyM.instanceMatrix;
legM.instanceMatrix = bodyM.instanceMatrix;
legM.visible = isReal;
bodyM.castShadow = headM.castShadow = legM.castShadow = true;
scene.add(bodyM, headM, legM);

function updateHumans(t) {
  const hs = world.humans, n = Math.min(hs.length, MAXHUM);
  const A = bodyM.instanceMatrix.array, BC = bodyM.instanceColor.array, HC = headM.instanceColor.array;
  for (let i = 0; i < n; i++) {
    const h = hs[i];
    const sc = 0.62 + 0.38 * Math.min(1, h.age / 16);
    let bob = 0;
    if (h.moving) bob = Math.abs(Math.sin(t * 9 + h.phase)) * 0.06 * sc;
    else if (h.state === ST.CHOP || h.state === ST.BUILD) bob = Math.abs(Math.sin(t * 11 + h.phase)) * 0.05 * sc;
    const c = Math.cos(h.ang) * sc, s = Math.sin(h.ang) * sc, k = i * 16;
    A[k] = c; A[k + 1] = 0; A[k + 2] = -s; A[k + 3] = 0;
    A[k + 4] = 0; A[k + 5] = sc; A[k + 6] = 0; A[k + 7] = 0;
    A[k + 8] = s; A[k + 9] = 0; A[k + 10] = c; A[k + 11] = 0;
    A[k + 12] = h.x; A[k + 13] = h.y + bob; A[k + 14] = h.z; A[k + 15] = 1;
    const tc = TRIBE_COLS[h.tribe % TRIBE_COLS.length], sk = SKINS[h.skin], q = i * 3, f = h.flash;
    BC[q] = lerp(tc[0], 1, f); BC[q + 1] = lerp(tc[1], 0.15, f); BC[q + 2] = lerp(tc[2], 0.1, f);
    HC[q] = sk[0]; HC[q + 1] = sk[1]; HC[q + 2] = sk[2];
  }
  bodyM.count = headM.count = legM.count = n;
  bodyM.instanceMatrix.needsUpdate = true; bodyM.instanceColor.needsUpdate = true; headM.instanceColor.needsUpdate = true;
}

//@@DECOR@@

/* ---------------------------------------------------------------- parçacıklar & efektler */
const PMAX = 1000;
const PG = new THREE.OctahedronGeometry(0.5, 0);
const partM = makeInst(flat(PG), new THREE.MeshBasicMaterial({ color: 0xffffff }), PMAX, true);
partM.frustumCulled = false;
scene.add(partM);
const PA = {
  n: 0, x: new Float32Array(PMAX), y: new Float32Array(PMAX), z: new Float32Array(PMAX),
  vx: new Float32Array(PMAX), vy: new Float32Array(PMAX), vz: new Float32Array(PMAX),
  life: new Float32Array(PMAX), max: new Float32Array(PMAX), size: new Float32Array(PMAX), acc: new Float32Array(PMAX),
  r: new Float32Array(PMAX), g: new Float32Array(PMAX), b: new Float32Array(PMAX),
};
function emit(x, y, z, vx, vy, vz, life, size, r, g, b, acc) {
  if (PA.n >= PMAX) return;
  const i = PA.n++;
  PA.x[i] = x; PA.y[i] = y; PA.z[i] = z; PA.vx[i] = vx; PA.vy[i] = vy; PA.vz[i] = vz;
  PA.life[i] = PA.max[i] = life; PA.size[i] = size; PA.r[i] = r; PA.g[i] = g; PA.b[i] = b; PA.acc[i] = acc;
}
const R1 = () => Math.random() - 0.5;
const PKEYS = ['x', 'y', 'z', 'vx', 'vy', 'vz', 'life', 'max', 'size', 'acc', 'r', 'g', 'b'];
function updateParticles(dt) {
  let i = 0;
  while (i < PA.n) {
    PA.life[i] -= dt;
    if (PA.life[i] <= 0) {
      const l = --PA.n;
      for (let q = 0; q < PKEYS.length; q++) PA[PKEYS[q]][i] = PA[PKEYS[q]][l];
      continue;
    }
    PA.vy[i] += PA.acc[i] * dt;
    PA.x[i] += PA.vx[i] * dt; PA.y[i] += PA.vy[i] * dt; PA.z[i] += PA.vz[i] * dt;
    i++;
  }
  const A = partM.instanceMatrix.array, C = partM.instanceColor.array;
  for (let j = 0; j < PA.n; j++) {
    const s = PA.size[j] * Math.pow(PA.life[j] / PA.max[j], 0.6), k = j * 16, q = j * 3;
    A[k] = s; A[k + 1] = 0; A[k + 2] = 0; A[k + 3] = 0; A[k + 4] = 0; A[k + 5] = s; A[k + 6] = 0; A[k + 7] = 0;
    A[k + 8] = 0; A[k + 9] = 0; A[k + 10] = s; A[k + 11] = 0; A[k + 12] = PA.x[j]; A[k + 13] = PA.y[j]; A[k + 14] = PA.z[j]; A[k + 15] = 1;
    C[q] = PA.r[j]; C[q + 1] = PA.g[j]; C[q + 2] = PA.b[j];
  }
  partM.count = PA.n;
  partM.instanceMatrix.needsUpdate = true; partM.instanceColor.needsUpdate = true;
}

// şok dalgası
const shock = new THREE.Mesh(new THREE.RingGeometry(0.8, 1, 48).rotateX(-Math.PI / 2),
  new THREE.MeshBasicMaterial({ color: 0xfff0c0, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false, fog: false }));
shock.visible = false; shock.frustumCulled = false; scene.add(shock);
let shockT = -1;

// yıldırım
const boltMat = new THREE.MeshBasicMaterial({ color: 0xf4f6ff, fog: false });
const boltBoxGeo = new THREE.BoxGeometry(1, 1, 1);
const bolt = new THREE.Group(); bolt.visible = false;
const boltSegs = [];
for (let i = 0; i < 14; i++) { const m = new THREE.Mesh(boltBoxGeo, boltMat); m.frustumCulled = false; bolt.add(m); boltSegs.push(m); }
scene.add(bolt);
let boltT = -1;
const _bp = [];
function strikeBolt(x, y, z) {
  _bp.length = 0;
  const sx = x + R1() * 10, sz = z + R1() * 10, top = y + 75;
  for (let i = 0; i <= 14; i++) {
    const f = i / 14, j = (1 - f) * 3.2;
    _bp.push(new THREE.Vector3(lerp(sx, x, f) + R1() * j * (i === 14 ? 0 : 1), lerp(top, y, f), lerp(sz, z, f) + R1() * j * (i === 14 ? 0 : 1)));
  }
  const up = new THREE.Vector3(0, 1, 0), dir = new THREE.Vector3();
  for (let i = 0; i < 14; i++) {
    const a = _bp[i], b = _bp[i + 1];
    dir.subVectors(b, a); const len = dir.length(); dir.normalize();
    const m = boltSegs[i];
    m.position.copy(a).add(b).multiplyScalar(0.5);
    m.quaternion.setFromUnitVectors(up, dir);
    m.scale.set(0.22, len, 0.22);
  }
  bolt.visible = true; boltT = 0;
}

// meteorlar
const meteorMesh = new THREE.Mesh(flat(new THREE.IcosahedronGeometry(0.9, 0)), new THREE.MeshBasicMaterial({ color: 0xff7a2a, fog: false }));
meteorMesh.visible = false; meteorMesh.frustumCulled = false; scene.add(meteorMesh);
const meteors = [];
function launchMeteor(x, z) { meteors.push({ t: 0, x, z }); }
function updateMeteors(dt) {
  for (let i = meteors.length - 1; i >= 0; i--) {
    const m = meteors[i];
    m.t += dt / 1.05;
    const e = Math.min(m.t, 1), y1 = Math.max(world.getHeight(m.x, m.z), SEA);
    const px = m.x + (1 - e) * 38, py = y1 + (1 - e) * 80, pz = m.z - (1 - e) * 22;
    meteorMesh.visible = true; meteorMesh.position.set(px, py, pz); meteorMesh.rotation.x += dt * 5; meteorMesh.rotation.y += dt * 4;
    for (let k = 0; k < 3; k++) emit(px + R1() * 0.5, py + R1() * 0.5, pz + R1() * 0.5, R1(), R1(), R1(), 0.7, 0.9, 1, 0.5 + Math.random() * 0.3, 0.1, 0.5);
    if (m.t >= 1) { world.meteor(m.x, m.z); meteors.splice(i, 1); }
  }
  if (!meteors.length) meteorMesh.visible = false;
}

// Fırtınada kamera çevresinde uzaktan çakan yıldırım (yalnızca görüntü ve ses; kimseye zarar vermez)
function stormBolt() {
  const a = Math.random() * 6.283, d = 16 + Math.random() * 30, x = cam.x + Math.cos(a) * d, z = cam.z + Math.sin(a) * d;
  if (Math.abs(x) > HALF - 2 || Math.abs(z) > HALF - 2) return;
  strikeBolt(x, Math.max(world.getHeight(x, z), SEA), z); flashA = Math.max(flashA, 0.5);
  auSfx('bolt', 0.9 * (1 - d / 70)); setTimeout(() => auSfx('thunder', 0.8 * (1 - d / 70)), 500 + d * 25);
}
let shakeAmt = 0;
const flashEl = $('flash');
let flashA = 0;
const FX_SND = { splash: 'splash', chips: 'chop', spark: 'spark', debris: 'debris', explode: 'explode', bolt: 'bolt', heart: 'heart', dust: 'dust', fire: 'fire' };
// Ses kamera odağına uzaklıkla azalır (Ada Modu'nda oyuncunun konumu odak olur).
function auAt(name, x, z, vol = 1) {
  if (!AU.ready) return;
  const f = gameMode === 'cozy' ? cozy.p : cam, d = Math.hypot(x - f.x, z - f.z), r = gameMode === 'cozy' ? 34 : 26 + cam.dist * 1.3;
  auSfx(name, vol * Math.max(0, 1 - d / r));
}
world.fx = (type, x, y, z, v) => {
  if (FX_SND[type]) auAt(FX_SND[type], x, z, type === 'fire' ? 0.6 : 1);
  switch (type) {
    case 'puff':
      for (let k = 0; k < 5; k++) emit(x, y, z, R1() * 1.2, 0.4 + Math.random() * 0.8, R1() * 1.2, 0.6, 0.2, 0.9, 0.9, 0.86, -0.4);
      break;
    case 'smoke':
      for (let k = 0; k < 3; k++) emit(x + R1() * 0.3, y, z + R1() * 0.3, R1() * 0.3, 0.6, R1() * 0.3, 1.1, 0.3, 0.25, 0.25, 0.27, 0.5);
      break;
    case 'splash':
      for (let k = 0; k < 8; k++) emit(x, y, z, R1() * 1.6, 1.5 + Math.random() * 1.5, R1() * 1.6, 0.7, 0.18, 0.7, 0.88, 1, -9);
      break;
    case 'chips':
      for (let k = 0; k < 3; k++) emit(x, y, z, R1() * 1.6, 1.4 + Math.random(), R1() * 1.6, 0.55, 0.1, 0.62, 0.42, 0.2, -9);
      break;
    case 'heart':
      for (let k = 0; k < 3; k++) emit(x + R1() * 0.3, y, z + R1() * 0.3, R1() * 0.3, 0.8, R1() * 0.3, 1.3, 0.2, 1, 0.35, 0.6, 0.1);
      break;
    case 'spark':
      for (let k = 0; k < 7; k++) emit(x, y, z, R1() * 3, 1 + Math.random() * 2, R1() * 3, 0.45, 0.12, 1, 0.9, 0.4, -7);
      break;
    case 'dust':
      for (let k = 0; k < 3; k++) emit(x + R1() * 0.4, y, z + R1() * 0.4, R1() * 0.5, 0.5, R1() * 0.5, 0.7, 0.2, 0.85, 0.75, 0.55, -0.2);
      break;
    case 'debris':
      for (let k = 0; k < 10; k++) emit(x, y, z, R1() * 3, 1.5 + Math.random() * 3, R1() * 3, 0.9, 0.18 + Math.random() * 0.15, 0.6, 0.4, 0.25, -9);
      break;
    case 'fire': {
      const n = v * 14;
      for (let k = 0; k < n; k++) {
        if (Math.random() > n - k) break;
        const hot = Math.random();
        emit(x + R1() * 0.8, y + 0.15, z + R1() * 0.8, R1() * 0.3, 1.0 + Math.random() * 1.2, R1() * 0.3, 0.55 + Math.random() * 0.3, 0.3,
          1, 0.35 + hot * 0.5, 0.05, 1.2);
      }
      if (Math.random() < v * 3) emit(x + R1() * 0.5, y + 0.9, z + R1() * 0.5, R1() * 0.3, 0.9, R1() * 0.3, 1.4, 0.38, 0.2, 0.2, 0.22, 0.4);
      break;
    }
    case 'era':   // bir köy çağ atladı: altın ışık patlaması
      for (let k = 0; k < 44; k++) { const a = Math.random() * 6.283, sp = 1.5 + Math.random() * 3.5; emit(x, y + 0.8, z, Math.cos(a) * sp, 2.5 + Math.random() * 4, Math.sin(a) * sp, 1.4, 0.22, 1, 0.8 + Math.random() * 0.15, 0.25, -4); }
      auAt('fanfare', x, z, 0.9);
      break;
    case 'bolt':
      strikeBolt(x, y, z); flashA = 0.65; shakeAmt = Math.max(shakeAmt, 0.12);
      break;
    case 'explode':
      for (let k = 0; k < 45; k++) emit(x, y + 0.5, z, R1() * 9, 2 + Math.random() * 8, R1() * 9, 0.9 + Math.random() * 0.4, 0.45, 1, 0.45 + Math.random() * 0.4, 0.05, -6);
      for (let k = 0; k < 30; k++) emit(x + R1() * 2, y + 0.5, z + R1() * 2, R1() * 3, 2 + Math.random() * 3, R1() * 3, 2, 0.8, 0.22, 0.22, 0.24, 0.3);
      for (let k = 0; k < 30; k++) emit(x, y + 0.5, z, R1() * 10, 3 + Math.random() * 7, R1() * 10, 1.2, 0.25, 0.4, 0.3, 0.25, -9);
      shock.position.set(x, y + 0.4, z); shock.visible = true; shockT = 0;
      shakeAmt = Math.max(shakeAmt, 0.9); flashA = Math.max(flashA, 0.4);
      break;
  }
};

/* ---------------------------------------------------------------- yağmur */
const RAIN_N = 1400;
const rainGeo = new THREE.BufferGeometry();
const rainPos = new Float32Array(RAIN_N * 6);
const rainSeed = new Float32Array(RAIN_N * 3);
for (let i = 0; i < RAIN_N; i++) { rainSeed[i * 3] = Math.random(); rainSeed[i * 3 + 1] = Math.random(); rainSeed[i * 3 + 2] = Math.random(); }
rainGeo.setAttribute('position', new THREE.BufferAttribute(rainPos, 3).setUsage(THREE.DynamicDrawUsage));
const rainMat = new THREE.LineBasicMaterial({ color: 0xb9d0ff, transparent: true, opacity: 0, fog: false, depthWrite: false });
const rain = new THREE.LineSegments(rainGeo, rainMat);
rain.frustumCulled = false; rain.visible = false; scene.add(rain);
let rainK = 0;
function updateRain(dt, cx, cz, span) {
  rainK = CL.rain;
  rain.visible = rainK > 0.02; rainMat.opacity = (0.5 + 0.15 * CL.storm) * rainK;
  if (!rain.visible) return;
  const t = U.uTime.value, slant = 0.12 + CL.storm * 0.35;
  for (let i = 0; i < RAIN_N; i++) {
    const sx = rainSeed[i * 3], sy = rainSeed[i * 3 + 1], sz = rainSeed[i * 3 + 2];
    const x = cx + (sx - 0.5) * span, z = cz + (sz - 0.5) * span;
    const y = 40 - ((sy * 40 + t * 38) % 40);
    const k = i * 6;
    rainPos[k] = x; rainPos[k + 1] = y; rainPos[k + 2] = z;
    rainPos[k + 3] = x - slant; rainPos[k + 4] = y + 1.1; rainPos[k + 5] = z - slant * 0.4;
  }
  rainGeo.attributes.position.needsUpdate = true;
}

/* ---------------------------------------------------------------- kar, yaprak, taç yaprağı, ateş böceği */
const softTex = (() => {
  const c = document.createElement('canvas'); c.width = c.height = 32; const g = c.getContext('2d');
  const gr = g.createRadialGradient(16, 16, 0, 16, 16, 16); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.5, 'rgba(255,255,255,.65)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 32, 32); return new THREE.CanvasTexture(c);
})();
const SNOW_N = 1100, DRIFT_N = 280;
function makePts(n, size) {
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3).setUsage(THREE.DynamicDrawUsage));
  geo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(n * 3).fill(1), 3));
  const p = new THREE.Points(geo, new THREE.PointsMaterial({ size, map: softTex, vertexColors: true, transparent: true, opacity: 0, depthWrite: false, fog: false }));
  p.frustumCulled = false; p.visible = false; scene.add(p);
  return p;
}
const snowPts = makePts(SNOW_N, 0.5), driftPts = makePts(DRIFT_N, 0.55);
const pSeed = new Float32Array(SNOW_N * 4), dSeed = new Float32Array(DRIFT_N * 4);
for (let i = 0; i < pSeed.length; i++) pSeed[i] = Math.random();
for (let i = 0; i < dSeed.length; i++) dSeed[i] = Math.random();
let driftMode = -1;
function updateAir(dt, cx, cz, span) {
  const t = U.uTime.value, wind = CL.wind * 2;
  // kar
  const sk = CL.snow;
  snowPts.visible = sk > 0.02; snowPts.material.opacity = 0.95 * sk;
  if (snowPts.visible) {
    const n = level >= 3 ? SNOW_N : 520, A = snowPts.geometry.attributes.position.array;
    snowPts.geometry.setDrawRange(0, n);
    for (let i = 0; i < n; i++) {
      const sx = pSeed[i * 4], sy = pSeed[i * 4 + 1], sz = pSeed[i * 4 + 2], ph = pSeed[i * 4 + 3];
      A[i * 3] = cx + (sx - 0.5) * span + Math.sin(t * 0.8 + ph * 6.28) * 0.9;
      A[i * 3 + 1] = 32 - ((sy * 32 + t * (2.4 + ph * 1.2)) % 32);
      A[i * 3 + 2] = cz + (sz - 0.5) * span + Math.cos(t * 0.6 + ph * 6.28) * 0.9;
    }
    snowPts.geometry.attributes.position.needsUpdate = true;
  }
  // mevsime göre savrulanlar: ilkbahar taç yaprağı, yaz geceleri ateş böceği, sonbahar yaprak
  const season = CL.season, w = CL.w[season];
  let vis = season === 3 ? 0 : clamp((w - 0.5) * 2.4, 0, 1);
  if (season === 1) vis *= nightK;
  if (CL.snow > 0.3 || level < 3) vis = 0;
  driftPts.visible = vis > 0.02;
  if (!driftPts.visible) { driftMode = -1; return; }
  const mat = driftPts.material, C = driftPts.geometry.attributes.color.array;
  if (driftMode !== season) {
    driftMode = season;
    mat.blending = season === 1 ? THREE.AdditiveBlending : THREE.NormalBlending; mat.size = season === 1 ? 0.42 : season === 0 ? 0.4 : 0.6; mat.needsUpdate = true;
    for (let i = 0; i < DRIFT_N; i++) {
      const h = dSeed[i * 4 + 3];
      if (season === 0) { C[i * 3] = 1; C[i * 3 + 1] = 0.72 + 0.2 * h; C[i * 3 + 2] = 0.82; }
      else if (season === 1) { C[i * 3] = 0.75; C[i * 3 + 1] = 1; C[i * 3 + 2] = 0.3; }
      else { const ac = AUTUMN[(h * 4) | 0]; C[i * 3] = ac[0] * 1.15; C[i * 3 + 1] = ac[1] * 1.15; C[i * 3 + 2] = ac[2] * 1.15; }
    }
    driftPts.geometry.attributes.color.needsUpdate = true;
  }
  mat.opacity = (season === 1 ? 0.95 : 0.85) * vis;
  const A = driftPts.geometry.attributes.position.array, sp = span * 0.7;
  for (let i = 0; i < DRIFT_N; i++) {
    const sx = dSeed[i * 4], sy = dSeed[i * 4 + 1], sz = dSeed[i * 4 + 2], ph = dSeed[i * 4 + 3];
    const x = cx + (sx - 0.5) * sp, z = cz + (sz - 0.5) * sp, gy = Math.max(world.getHeight(x, z), SEA);
    let y;
    if (season === 1) {   // ateş böceği: yere yakın, yavaşça süzülür
      y = gy + 0.8 + (sy * 2.6) + Math.sin(t * 0.9 + ph * 20) * 0.5;
      A[i * 3] = x + Math.sin(t * 0.5 + ph * 30) * 1.4; A[i * 3 + 2] = z + Math.cos(t * 0.42 + ph * 17) * 1.4;
    } else {              // yaprak ve taç yaprağı: yavaş yavaş düşer, rüzgârla savrulur
      y = gy + 12 - ((sy * 12 + t * (0.7 + ph * 0.8)) % 12);
      A[i * 3] = x + Math.sin(t * 1.1 + ph * 20) * 1.1 + (12 - (y - gy)) * wind * 0.25; A[i * 3 + 2] = z + Math.cos(t * 0.9 + ph * 13) * 1.1;
    }
    A[i * 3 + 1] = y;
  }
  driftPts.geometry.attributes.position.needsUpdate = true;
}

/* ---------------------------------------------------------------- imleç halkası */
const CUR_SEG = 64;
const curGeo = new THREE.BufferGeometry();
const curPos = new Float32Array(CUR_SEG * 3);
curGeo.setAttribute('position', new THREE.BufferAttribute(curPos, 3).setUsage(THREE.DynamicDrawUsage));
const cursor = new THREE.LineLoop(curGeo, new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9, fog: false }));
cursor.frustumCulled = false; cursor.visible = false; scene.add(cursor);
function placeCursor(x, z, r) {
  for (let i = 0; i < CUR_SEG; i++) {
    const a = (i / CUR_SEG) * 6.2832, px = x + Math.cos(a) * r, pz = z + Math.sin(a) * r;
    curPos[i * 3] = px; curPos[i * 3 + 1] = Math.max(world.getHeight(px, pz), SEA) + 0.18; curPos[i * 3 + 2] = pz;
  }
  curGeo.attributes.position.needsUpdate = true;
}

/* ---------------------------------------------------------------- gün/gece */
let tod = 0.33, dayCount = 1, dayLen = 150, timeSpeed = 1;
const sunDir = new THREE.Vector3(), lightDir = new THREE.Vector3();
const K = (h) => new THREE.Color(h);
const C = {
  dayTop: K('#3f8cff'), dayHor: K('#d2ecff'), duskTop: K('#4a4a9c'), duskHor: K('#ff9560'), nightTop: K('#060a20'), nightHor: K('#17224d'),
  rainTop: K('#6c7787'), rainHor: K('#9aa4b2'), daySun: K('#fff1d2'), duskSun: K('#ff9d5c'), moon: K('#7d90e0'),
  hemiDaySky: K('#bcd8ff'), hemiNightSky: K('#2a3a7a'), hemiDayGnd: K('#8d7b55'), hemiNightGnd: K('#141828'),
};
const tTop = new THREE.Color(), tHor = new THREE.Color(), tTmp = new THREE.Color();
const SEAS_SKY = [[1.0, 1.02, 1.0], [1.04, 1.0, 0.93], [1.09, 0.97, 0.85], [0.93, 0.98, 1.07]];   // gökyüzü rengi çarpanları
let nightK = 0;   // 0 gündüz .. 1 gece (ateş ışıkları için)
function updateSky() {
  const a = (tod - 0.25) * Math.PI * 2;
  sunDir.set(Math.cos(a) * 0.9, Math.sin(a), 0.38).normalize();
  const sy = sunDir.y, day = smooth(-0.08, 0.28, sy), dusk = Math.max(0, 1 - Math.abs(sy) / 0.3);
  tTop.copy(C.nightTop).lerp(C.dayTop, day).lerp(C.duskTop, dusk * 0.55);
  tHor.copy(C.nightHor).lerp(C.dayHor, day).lerp(C.duskHor, dusk * 0.85);
  const gray = Math.max(rainK, CL.snow * 0.8, CL.cloud * 0.3);   // yağış ve bulut göğü soldurur
  const rk = gray * (0.35 + 0.65 * day);
  let tr = 0, tg = 0, tb = 0;   // mevsim tonu
  for (let i = 0; i < 4; i++) { const sk = SEAS_SKY[i]; tr += sk[0] * CL.w[i]; tg += sk[1] * CL.w[i]; tb += sk[2] * CL.w[i]; }
  tTop.multiply(tTmp.setRGB(tr, tg, tb)); tHor.multiply(tTmp.setRGB(tr, tg, tb));
  tTop.lerp(tTmp.copy(C.rainTop).multiplyScalar(0.25 + 0.75 * day), rk * 0.75);
  tHor.lerp(tTmp.copy(C.rainHor).multiplyScalar(0.25 + 0.75 * day), rk * 0.85);
  tHor.lerp(tTmp.setRGB(0.78, 0.8, 0.84).multiplyScalar(0.2 + 0.8 * day), CL.fog * 0.75);   // sis ufku beyazlatır
  skyMat.uniforms.uTop.value.copy(tTop); skyMat.uniforms.uHor.value.copy(tHor);
  skyMat.uniforms.uSunDir.value.copy(sunDir);
  skyMat.uniforms.uSunCol.value.copy(C.duskSun).lerp(C.daySun, smooth(0, 0.45, sy)).multiplyScalar(1 - gray * 0.8);
  skyMat.uniforms.uStars.value = (1 - day) * (1 - gray * 0.9) * (1 - CL.fog * 0.8);
  skyMat.uniforms.uDay.value = day;
  scene.fog.color.copy(tHor);
  const fd = gameMode === 'cozy' ? 30 : clamp(cam.dist, 30, 140);   // sis, kameranın uzaklığına göre koyulaşır
  scene.fog.near = lerp(lerp(150, 60, gray), fd * 0.12, CL.fog); scene.fog.far = lerp(lerp(520, 300, gray), fd * 1.25 + 12, CL.fog);
  if (sy > 0) { lightDir.copy(sunDir); sun.color.copy(C.duskSun).lerp(C.daySun, smooth(0, 0.45, sy)); sun.intensity = SUNK * smooth(0, 0.3, sy) * (1 - 0.72 * gray) * (1 - 0.35 * CL.fog); }
  else { lightDir.copy(sunDir).negate(); sun.color.copy(C.moon); sun.intensity = 1.1 * smooth(0, 0.3, -sy) * (1 - 0.4 * gray); }
  hemi.color.copy(C.hemiNightSky).lerp(C.hemiDaySky, day);
  hemi.groundColor.copy(C.hemiNightGnd).lerp(C.hemiDayGnd, day);
  hemi.intensity = 0.8 + HEMIK * day * (1 - 0.3 * gray);
  const wu = waterMat.uniforms;
  wu.uDay.value = (0.3 + 0.7 * day) * (1 - 0.3 * gray);
  wu.uSunDir.value.copy(sy > 0 ? sunDir : lightDir);
  wu.uSunCol.value.copy(sy > 0 ? C.daySun : C.moon).multiplyScalar(sy > 0 ? 1 - gray : 0.35);
  wu.uSky.value.copy(tHor); wu.uSkyTop.value.copy(tTop);
  const night = 1 - day;
  nightK = night;
  wallMat.emissive.setRGB(0.9 * night * 0.42, 0.62 * night * 0.42, 0.28 * night * 0.42);
  roofMat.emissive.setRGB(0.3 * night * 0.3, 0.2 * night * 0.3, 0.1 * night * 0.3);
  cloudMat.emissive.setRGB(0.16 * day + 0.03, 0.18 * day + 0.04, 0.24 * day + 0.07);
  cloudMat.color.setScalar(1 - 0.5 * Math.max(CL.storm, CL.rain * 0.7, CL.snow * 0.35, CL.cloud * 0.3));   // yağmur bulutları grileşir
}

/* ---------------------------------------------------------------- post-process (parlama, tilt-shift, renk) */
let rt = null, rtMips = false, usePost = false;
const postScene = new THREE.Scene();
const postCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
const postMat = new THREE.ShaderMaterial({
  depthTest: false, depthWrite: false,
  uniforms: {
    tDiffuse: { value: null }, uRes: { value: new THREE.Vector2(1, 1) }, uFocus: { value: 0.5 },
    uTilt: { value: 0 }, uBloom: { value: 0 }, uSat: { value: 1.03 }, uVig: { value: 0.2 }, uGrade: { value: 0 },
  },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
  fragmentShader: `
    uniform sampler2D tDiffuse; uniform vec2 uRes; uniform float uFocus, uTilt, uBloom, uSat, uVig, uGrade; varying vec2 vUv;
    void main() {
      vec3 c = texture2D(tDiffuse, vUv).rgb;
      if (uTilt > 0.5) {
        float dist = abs(vUv.y - uFocus);
        float amt = smoothstep(0.12, 0.6, dist);
        vec2 px = amt * 3.2 / uRes;
        float wsum = 1.0;
        for (int i = 0; i < 10; i++) {
          float a = float(i) * 2.399963;
          float r = sqrt((float(i) + 0.5) / 10.0);
          c += texture2D(tDiffuse, vUv + vec2(cos(a), sin(a)) * r * px * 6.0).rgb;
          wsum += 1.0;
        }
        c /= wsum;
      }
      if (uBloom > 0.0) {
        vec3 b = textureLod(tDiffuse, vUv, 3.0).rgb * 0.3 + textureLod(tDiffuse, vUv, 5.0).rgb * 0.4 + textureLod(tDiffuse, vUv, 7.0).rgb * 0.3;
        c += max(b - 0.85, 0.0) * uBloom * 0.9 + b * 0.04 * uBloom;
      }
      if (uGrade > 0.5) {
        float gl = dot(c, vec3(0.2126, 0.7152, 0.0722));
        c = mix(c, c * vec3(0.93, 1.0, 1.07), (1.0 - smoothstep(0.0, 0.5, gl)) * 0.55);
        c = mix(c, c * vec3(1.07, 1.02, 0.92), smoothstep(0.4, 1.2, gl) * 0.5);
        vec3 cc = clamp(c, 0.0, 1.0);
        c += (cc * cc * (3.0 - 2.0 * cc) - cc) * 0.2;
      }
      float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
      c = mix(vec3(l), c, uSat);
      float v = smoothstep(1.05, 0.3, length(vUv - 0.5) * 1.3);
      c *= mix(1.0 - uVig, 1.0, v);
      gl_FragColor = vec4(c, 1.0);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`,
});
postScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), postMat));
postScene.children[0].frustumCulled = false;

/* ---------------------------------------------------------------- kalite sistemi */
// 0 çok düşük (yalnız Oto kullanır) · 1 Düşük · 2 Orta · 3 Yüksek · 4 Ultra · 5 Ultra+
// hd: HD doku çözünürlüğü · deco: [çim/çiçek yarıçapı, yoğunluk] · ss: süper örnekleme çarpanı · grade: sinematik renk
const LEVELS = [
  { pr: 0.75, shadow: 0, treeShadow: false, post: false, bloom: 0 },
  { pr: 1.0, shadow: 0, treeShadow: false, post: false, bloom: 0 },
  { pr: 1.25, shadow: 1024, treeShadow: false, post: false, bloom: 0 },
  { pr: 1.5, shadow: 2048, treeShadow: true, post: true, bloom: 0, hd: 512, deco: [22, 1.2] },
  { pr: 2.0, shadow: 4096, treeShadow: true, post: true, bloom: 1, hd: 1024, deco: [32, 2.2] },
  { pr: 2.0, ss: 1.35, shadow: 4096, treeShadow: true, post: true, bloom: 1.6, hd: 2048, deco: [44, 3.5], grade: 1 },
];
const TIERS = { low: 1, mid: 2, high: 3, ultra: 4, uplus: 5 };
const TIER_NAMES = ['Çok düşük', 'Düşük', 'Orta', 'Yüksek', 'Ultra', 'Ultra+'];
const TIER_DESC = {
  low: 'Gölgesiz, en akıcı', mid: 'Gölgeler, orta çözünürlük', high: 'Ağaç gölgeleri, 512 px HD dokular, çim detayı',
  ultra: 'Parlama efekti, 4K gölge, 1K HD dokular, yoğun çim ve çiçek',
  uplus: 'Süper örnekleme, 2K HD dokular, en yoğun çim, sinematik renk (güçlü ekran kartı)',
  auto: 'FPS’e göre otomatik',
};
let qualityMode = prefs.q && (prefs.q === 'auto' || TIERS[prefs.q]) ? prefs.q : (coarse ? 'mid' : 'high');
let level = TIERS[qualityMode] || (coarse ? 2 : 3), levelCap = 4, curPR = 1;
const litMats = [terrainMat, trunkMat, leafMat, wallMat, roofMat, cloudMat];
function resize() {
  const w = window.innerWidth, h = window.innerHeight;
  renderer.setPixelRatio(curPR);
  renderer.setSize(w, h, false);
  camera.aspect = w / h; camera.updateProjectionMatrix();
  const db = renderer.getDrawingBufferSize(new THREE.Vector2());
  postMat.uniforms.uRes.value.copy(db);
  if (rt) rt.setSize(db.x, db.y);
}
// Render hedefi: Ultra'da parlama için mipmap'li, diğerlerinde mipmap'siz.
function ensureRT(mips) {
  if (rt && rtMips === mips) return;
  if (rt) rt.dispose();
  const ok = renderer.extensions.has('EXT_color_buffer_float') || renderer.extensions.has('EXT_color_buffer_half_float');
  rt = new THREE.WebGLRenderTarget(4, 4, { type: ok ? THREE.HalfFloatType : THREE.UnsignedByteType, samples: 4, generateMipmaps: mips });
  rt.texture.magFilter = THREE.LinearFilter;
  rt.texture.minFilter = mips ? THREE.LinearMipmapLinearFilter : THREE.LinearFilter;
  rtMips = mips;
  postMat.uniforms.tDiffuse.value = rt.texture;
  const db = renderer.getDrawingBufferSize(new THREE.Vector2());
  rt.setSize(db.x, db.y);
}
let geoKey = '';
// Stile ve kaliteye uygun model setini yerleştirir (Ultra'da meşe tepeleri daha detaylı).
function applyGeo() {
  const key = setKey(isReal, isReal && level >= 4);
  if (key === geoKey) return;
  geoKey = key;
  const S = getSet(isReal, isReal && level >= 4);
  oakM.geometry = S.oak; pineM.geometry = S.pine; oakT.geometry = S.trunk; pineT.geometry = S.trunk;
  wallM.geometry = S.wall; roofM.geometry = S.roof; bodyM.geometry = S.body; headM.geometry = S.head;
  if (S.legs) legM.geometry = S.legs;
  legM.visible = isReal;
  clouds.geometry = S.cloud;
}
function savePrefs() {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify({ q: qualityMode === 'manual' ? 'high' : qualityMode, low: !isReal, tilt: userTilt })); } catch (_) { /* yoksay */ }
}
function applyLevel() {
  const c = LEVELS[level], dpr = window.devicePixelRatio || 1;
  curPR = c.ss ? clamp(dpr * c.ss, 1.5, 2.25) : c.pr < 1 ? c.pr : Math.min(c.pr, dpr);
  hdApply(isReal && c.hd ? c.hd : 0);
  decorConfig(isReal && c.deco ? c.deco : null);
  const wasShadow = renderer.shadowMap.enabled;
  renderer.shadowMap.enabled = c.shadow > 0;
  sun.castShadow = c.shadow > 0;
  if (c.shadow > 0 && sun.shadow.mapSize.x !== c.shadow) {
    sun.shadow.mapSize.set(c.shadow, c.shadow);
    if (sun.shadow.map) { sun.shadow.map.dispose(); sun.shadow.map = null; }
  }
  oakM.castShadow = pineM.castShadow = c.treeShadow;
  usePost = c.post;
  if (usePost) ensureRT(c.bloom > 0);
  const pu = postMat.uniforms;
  pu.uTilt.value = userTilt ? 1 : 0; pu.uBloom.value = c.bloom; pu.uGrade.value = isReal && c.grade ? 1 : 0;
  skyMat.uniforms.uCloud.value = isReal && level >= 4 ? 1 : 0;
  pu.uSat.value = isReal ? 1.08 : 1.03; pu.uVig.value = isReal ? 0.14 : 0.2;
  applyGeo();
  if (wasShadow !== renderer.shadowMap.enabled) litMats.forEach((m) => { m.needsUpdate = true; });
  resize();
  $('qlabel').textContent = qualityMode === 'auto' ? 'Otomatik (şu an: ' + TIER_NAMES[level] + ')' : TIER_DESC[qualityMode] || '';
  refreshGfxUI();
}
// Gerçekçi ↔ Low-Poly geçişi: palet, ışık, tonlama, su rengi, model seti ve arazi yeniden kurulur.
function applyStyle() {
  UREAL.value = isReal ? 1 : 0;
  setPalette();
  SUNK = isReal ? 3.3 : 3.0; HEMIK = isReal ? 1.05 : 1.2;
  const wu = waterMat.uniforms;
  wu.uShallow.value.set(isReal ? '#5fc2bf' : '#72e3d4');
  wu.uDeep.value.set(isReal ? '#0f4d82' : '#1b62b8');
  renderer.toneMapping = isReal ? THREE.ACESFilmicToneMapping : (THREE.NeutralToneMapping || THREE.ACESFilmicToneMapping);
  renderer.toneMappingExposure = isReal ? 1.0 : 1.0;
  [...litMats, waterMat, skyMat, postMat].forEach((m) => { m.needsUpdate = true; });
  world.chunkDirty.fill(1); world.treesDirty = true;
  if (!tiltTouched) userTilt = !isReal;
  geoKey = '';
  if (typeof level === 'number' && rtReady) applyLevel();
}
let rtReady = false;
function refreshGfxUI() {
  document.querySelectorAll('[data-q]').forEach((b) => b.classList.toggle('on', b.dataset.q === qualityMode));
  document.querySelectorAll('[data-style]').forEach((b) => b.classList.toggle('on', (b.dataset.style === 'low') === !isReal));
  const sw = $('mLow'); if (sw) sw.checked = !isReal;
  const gd = $('gdesc'); if (gd) gd.textContent = TIER_DESC[qualityMode] || '';
  document.querySelectorAll('[data-tilt]').forEach((b) => b.classList.toggle('on', (b.dataset.tilt === 'on') === userTilt));
}

/* ---------------------------------------------------------------- kamera */
const cam = { tx: 0, tz: 0, x: 0, z: 0, dist: 85, ddist: 85, yaw: 0.6, dyaw: 0.6, pitch: 0.95, dpitch: 0.95 };
const tribeStart = world.tribes[0];
if (tribeStart) { cam.tx = cam.x = tribeStart.cx; cam.tz = cam.z = tribeStart.cz; cam.dist = cam.ddist = 48; }
let camY = 0;
function updateCamera(dt) {
  const k = 1 - Math.exp(-dt * 12);
  cam.x += (cam.tx - cam.x) * k; cam.z += (cam.tz - cam.z) * k;
  cam.dist += (cam.ddist - cam.dist) * k; cam.yaw += (cam.dyaw - cam.yaw) * k; cam.pitch += (cam.dpitch - cam.pitch) * k;
  const ty = Math.max(world.getHeight(cam.x, cam.z), SEA);
  camY += (ty - camY) * (1 - Math.exp(-dt * 4));
  const cp = Math.cos(cam.pitch);
  let px = cam.x + Math.sin(cam.yaw) * cp * cam.dist, py = camY + Math.sin(cam.pitch) * cam.dist, pz = cam.z + Math.cos(cam.yaw) * cp * cam.dist;
  const floor = Math.max(world.getHeight(px, pz), SEA) + 2.5;
  if (py < floor) py = floor;
  if (shakeAmt > 0.001) { px += R1() * shakeAmt; py += R1() * shakeAmt; pz += R1() * shakeAmt; shakeAmt *= Math.exp(-dt * 4); }
  camera.position.set(px, py, pz);
  camera.lookAt(cam.x, camY, cam.z);
  sky.position.copy(camera.position);
}
function panBy(dx, dy) {
  const wpp = (2 * cam.dist * Math.tan((camera.fov * Math.PI) / 360)) / Math.max(1, window.innerHeight);
  const rx = Math.cos(cam.yaw), rz = -Math.sin(cam.yaw), fx = -Math.sin(cam.yaw), fz = -Math.cos(cam.yaw);
  cam.tx = clamp(cam.tx - (rx * dx - fx * dy) * wpp * 1.0, -HALF + 2, HALF - 2);
  cam.tz = clamp(cam.tz - (rz * dx - fz * dy) * wpp * 1.0, -HALF + 2, HALF - 2);
}
function zoomBy(f) { cam.ddist = clamp(cam.ddist * f, 7, 200); }

/* ---------------------------------------------------------------- terrain picking */
const _ray = new THREE.Raycaster(), _ndc = new THREE.Vector2();
const hit = { x: 0, y: 0, z: 0, ok: false };
function pick(cx, cy) {
  const rc = canvas.getBoundingClientRect();
  _ndc.set(((cx - rc.left) / rc.width) * 2 - 1, -((cy - rc.top) / rc.height) * 2 + 1);
  _ray.setFromCamera(_ndc, camera);
  const o = _ray.ray.origin, d = _ray.ray.direction;
  hit.ok = false;
  if (d.y > -0.001) return false;
  let t = o.y > 26 ? (26 - o.y) / d.y : 0, prev = t, found = false;
  for (; t < 700; t += 0.5) {
    const x = o.x + d.x * t, z = o.z + d.z * t, y = o.y + d.y * t;
    if (y <= Math.max(world.getHeight(x, z), SEA)) { found = true; break; }
    prev = t;
  }
  if (!found) return false;
  let lo = prev, hi = t;
  for (let i = 0; i < 8; i++) {
    const m = (lo + hi) / 2, x = o.x + d.x * m, z = o.z + d.z * m, y = o.y + d.y * m;
    if (y <= Math.max(world.getHeight(x, z), SEA)) hi = m; else lo = m;
  }
  hit.x = o.x + d.x * hi; hit.z = o.z + d.z * hi; hit.y = Math.max(world.getHeight(hit.x, hit.z), SEA);
  hit.ok = Math.abs(hit.x) < HALF - 0.5 && Math.abs(hit.z) < HALF - 0.5;
  return hit.ok;
}

/* ---------------------------------------------------------------- araçlar */
const CATS = [
  { n: 'Arazi', i: '🌍' }, { n: 'Canlılar', i: '👥' }, { n: 'Doğa', i: '🌿' }, { n: 'Felaket', i: '💥' },
];
const TOOLS = [
  { id: 'up', i: '⛰️', n: 'Yükselt', c: 0, r: 1 }, { id: 'down', i: '🕳️', n: 'Alçalt', c: 0, r: 1 },
  { id: 'flat', i: '➖', n: 'Düzle', c: 0, r: 1 }, { id: 'grass', i: '🌱', n: 'Çimen', c: 0, r: 1 },
  { id: 'sand', i: '🏝️', n: 'Kum', c: 0, r: 1 }, { id: 'snow', i: '❄️', n: 'Kar', c: 0, r: 1 }, { id: 'rock', i: '🪨', n: 'Kaya', c: 0, r: 1 },
  { id: 'human', i: '🧑', n: 'İnsan', c: 1 }, { id: 'village', i: '🏘️', n: 'Köy', c: 1 }, { id: 'erase', i: '🧽', n: 'Sil', c: 1, r: 1 },
  { id: 'forest', i: '🌲', n: 'Orman', c: 2, r: 1 }, { id: 'clear', i: '🪓', n: 'Temizle', c: 2, r: 1 },
  { id: 'rain', i: '🌧️', n: 'Yağmur', c: 2, toggle: 1 }, { id: 'time', i: '🕒', n: 'Zaman', c: 2, toggle: 1 },
  { id: 'bolt', i: '⚡', n: 'Yıldırım', c: 3 }, { id: 'meteor', i: '☄️', n: 'Meteor', c: 3 },
  { id: 'fire', i: '🔥', n: 'Ateş', c: 3, r: 1 }, { id: 'lava', i: '🌋', n: 'Lav', c: 3, r: 1 },
];
const TOOL_TIPS = {
  up: 'Araziyi yükseltir; basılı tutup sürükleyerek tepe ve dağ yaparsın.', down: 'Araziyi alçaltır; göl ve vadi açar.', flat: 'Araziyi ilk bastığın yüksekliğe düzler.',
  grass: 'Zemini çimene çevirir; ağaçlar ve hayvanlar burada yaşar.', sand: 'Zemini kuma çevirir.', snow: 'Zemini kara çevirir.', rock: 'Zemini kayalık yapar.',
  human: 'Tıkladığın yere bir insan bırakır.', village: 'Tıkladığın yere küçük bir köy kurar.', erase: 'Fırçanın altındaki insanları, ağaçları ve yapıları siler.',
  forest: 'Fırçanın altına ağaç diker.', clear: 'Fırçanın altındaki ağaçları temizler.', rain: 'Yağmuru açar ya da kapatır.', time: 'Günü çeyrek gün ileri sarar.',
  bolt: 'Tıkladığın yere yıldırım düşürür.', meteor: 'Tıkladığın yere meteor yağdırır.', fire: 'Fırçanın altında yangın çıkarır.', lava: 'Fırçanın altında lav akıtır.',
};
let tool = 'hand', cat = 0, brushSize = 4, flatH = 0, lastSpawn = 0;
const toolsEl = $('tools'), tabsEl = $('tabs');
function toast(msg) {
  const t = $('toast'); t.textContent = msg; t.classList.add('show'); auSfx('notify', 0.7);
  clearTimeout(toast.h); toast.h = setTimeout(() => t.classList.remove('show'), 1600);
}
function buildDock() {
  tabsEl.innerHTML = '';
  const hand = document.createElement('button');
  hand.className = 'tab hand' + (tool === 'hand' ? ' on' : ''); hand.textContent = '✋'; hand.dataset.tip = 'Gezin|Araç seçili değilken dünyada gezinirsin: kamerayı sürükle, yakınlaştır.';
  hand.onclick = () => { tool = 'hand'; buildDock(); };
  tabsEl.appendChild(hand);
  const det = gameMode === 'detail';
  curCats().forEach((c, i) => {
    const b = document.createElement('button');
    b.className = 'tab' + (i === cat ? ' cur' : ''); b.innerHTML = '<span>' + c.i + '</span>' + c.n;
    b.onclick = () => { cat = i; buildDock(); };
    tabsEl.appendChild(b);
  });
  toolsEl.innerHTML = '';
  curTools().filter((t) => t.c === cat).forEach((t) => {
    const b = document.createElement('button');
    const active = t.toggle ? (t.id === 'rain' && world.raining) : tool === t.id;
    const locked = det && t.bld && D_BUILD[t.bld].tech && !colony.has(D_BUILD[t.bld].tech);
    b.className = 'tool' + (active ? ' on' : '') + (locked ? ' locked' : '');
    b.innerHTML = '<span>' + t.i + '</span>' + t.n + (det ? dToolBadge(t) : '');
    if (TOOL_TIPS[t.id]) b.dataset.tip = t.n + '|' + TOOL_TIPS[t.id];
    b.onclick = () => {
      if (t.id === 'rain') { clToggleRain(); const wet = CL.weather === 'rain' || CL.weather === 'snow'; toast(wet ? (CL.weather === 'snow' ? 'Kar başladı' : 'Yağmur başladı') : 'Hava açıyor'); }
      else if (t.id === 'time') { tod = (tod + 0.25) % 1; toast('Zaman ileri sarıldı'); }
      else if (det && dToolClick(t)) return;
      else tool = t.id;
      buildDock();
    };
    toolsEl.appendChild(b);
  });
  const cur = curTools().find((t) => t.id === tool);
  $('brush').style.display = cur && cur.r ? 'flex' : 'none';
}
$('size').oninput = (e) => { brushSize = +e.target.value; $('sizev').textContent = brushSize; };

function useTool(dt, first) {
  const x = hit.x, z = hit.z, r = brushSize, now = performance.now() / 1000;
  if (AU.ready) {
    const sn = { up: 'dig', down: 'dig', flat: 'dig', grass: 'plant', sand: 'dig', snow: 'dust', rock: 'dig', human: 'pop', village: 'build', forest: 'plant', clear: 'chop', fire: 'fire', lava: 'fire', erase: 'dust' }[tool];
    if (sn && (first || sn === 'dig' || sn === 'fire' || sn === 'plant' || sn === 'chop')) auSfx(sn, first ? 0.9 : 0.5);
    if (tool === 'meteor' && first) auSfx('meteor');
  }
  if (gameMode === 'detail' && tool.startsWith('d:')) { detailTool(tool, first); return; }
  switch (tool) {
    case 'up': case 'down': world.editTerrain(tool, x, z, r, dt, 0); break;
    case 'flat': if (first) flatH = Math.max(world.getHeight(x, z), SEA + 0.4); world.editTerrain('flat', x, z, r, dt, flatH); break;
    case 'grass': world.paintSoil(SOIL.GRASS, x, z, r); break;
    case 'sand': world.paintSoil(SOIL.SAND, x, z, r); break;
    case 'snow': world.paintSoil(SOIL.SNOW, x, z, r); break;
    case 'rock': world.paintSoil(SOIL.ROCK, x, z, r); break;
    case 'human':
      if (first) { world.spawnGroup(x, z, 5); lastSpawn = now; }
      else if (now - lastSpawn > 0.16) { world.spawnGroup(x, z, 1); lastSpawn = now; }
      break;
    case 'village': if (first && !world.spawnVillage(x, z, 3)) toast('Buraya köy kurulamaz'); break;
    case 'erase': world.eraseAll(x, z, r); break;
    case 'forest': world.plantTrees(x, z, r, Math.min(1, dt * 2.5)); break;
    case 'clear': world.clearTrees(x, z, r); break;
    case 'bolt': if (first || now - lastSpawn > 0.3) { world.lightning(x, z); lastSpawn = now; } break;
    case 'meteor': if (first) launchMeteor(x, z); break;
    case 'fire': world.igniteArea(x, z, r, Math.min(1, dt * 5)); break;
    case 'lava': world.lavaBrush(x, z, r, dt); break;
  }
}

/* ---------------------------------------------------------------- girdi */
const ptrs = new Map();
let mode = null, toolDown = false, firstPress = false, gest = null, lastPt = { x: 0, y: 0 };
canvas.addEventListener('contextmenu', (e) => e.preventDefault());
canvas.addEventListener('pointerdown', (e) => {
  try { canvas.setPointerCapture(e.pointerId); } catch (_) { /* yoksay */ }
  if (gameMode === 'cozy' && !inMenu) { cozyDown(e); return; }
  ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
  lastPt = { x: e.clientX, y: e.clientY };
  if (ptrs.size >= 2) { toolDown = false; mode = 'gesture'; startGesture(); return; }
  if (e.pointerType === 'mouse' && e.button === 2) mode = 'rot';
  else if (e.pointerType === 'mouse' && e.button === 1) mode = 'pan';
  else mode = tool === 'hand' ? 'pan' : 'tool';
  if (mode === 'tool') {
    toolDown = true; firstPress = true;
    // Detaylı Mod yerleştirme/yaratma araçları tek dokunuşluk: fare anında, dokunmatik bırakınca (önizleme görünsün)
    if (gameMode === 'detail' && tool.startsWith('d:')) {
      firstPress = false;
      if (e.pointerType === 'mouse') { if (pick(e.clientX, e.clientY)) detailTool(tool, true); toolDown = false; }
    }
  }
  tapInfo = mode === 'pan' && ptrs.size === 1 ? { x: e.clientX, y: e.clientY, t: performance.now() } : null;
});
let tapInfo = null;
canvas.addEventListener('pointerup', (e) => {
  if (gameMode === 'cozy') { cozyUp(e); return; }
  if (toolDown && gameMode === 'detail' && tool.startsWith('d:') && e.pointerType !== 'mouse' && pick(e.clientX, e.clientY)) detailTool(tool, true);
  if (tapInfo && mode === 'pan' && ptrs.size === 1 && gameMode === 'detail' && !inMenu &&
    Math.hypot(e.clientX - tapInfo.x, e.clientY - tapInfo.y) < 7 && performance.now() - tapInfo.t < 600) detailTap(e.clientX, e.clientY);
  tapInfo = null;
});
canvas.addEventListener('pointermove', (e) => {
  if (gameMode === 'cozy' && !inMenu) { cozyMove(e); return; }
  const p = ptrs.get(e.pointerId);
  lastPt = { x: e.clientX, y: e.clientY };
  if (!p) { hoverPt = e.pointerType === 'mouse' ? { x: e.clientX, y: e.clientY } : null; return; }
  const dx = e.clientX - p.x, dy = e.clientY - p.y;
  p.x = e.clientX; p.y = e.clientY;
  if (mode === 'gesture' && ptrs.size >= 2) updateGesture();
  else if (mode === 'pan') panBy(dx, dy);
  else if (mode === 'rot') { cam.dyaw -= dx * 0.006; cam.dpitch = clamp(cam.dpitch + dy * 0.005, 0.28, 1.45); }
});
const endPtr = (e) => {
  czPtrs.delete(e.pointerId);
  ptrs.delete(e.pointerId);
  if (ptrs.size === 0) { toolDown = false; mode = null; gest = null; }
  else if (ptrs.size === 1) { mode = null; toolDown = false; gest = null; }
};
canvas.addEventListener('pointerup', endPtr);
canvas.addEventListener('pointercancel', endPtr);
canvas.addEventListener('wheel', (e) => {
  e.preventDefault();
  if (gameMode === 'cozy' && !inMenu) { cozyWheel(e); return; }
  zoomBy(Math.exp(e.deltaY * 0.0011));
}, { passive: false });
let hoverPt = null;
function gestState() {
  const a = [...ptrs.values()];
  const cx = (a[0].x + a[1].x) / 2, cy = (a[0].y + a[1].y) / 2;
  return { cx, cy, d: Math.hypot(a[0].x - a[1].x, a[0].y - a[1].y) || 1, ang: Math.atan2(a[1].y - a[0].y, a[1].x - a[0].x) };
}
function startGesture() { gest = gestState(); }
function updateGesture() {
  const g = gestState();
  if (gest) {
    panBy(g.cx - gest.cx, g.cy - gest.cy);
    zoomBy(gest.d / g.d);
    let da = g.ang - gest.ang; if (da > Math.PI) da -= 2 * Math.PI; if (da < -Math.PI) da += 2 * Math.PI;
    cam.dyaw -= da;
  }
  gest = g;
}
const keys = {};
addEventListener('keydown', (e) => {
  keys[e.key.toLowerCase()] = true;
  if (gameMode === 'cozy' && !inMenu) { if (cozyKey(e)) e.preventDefault(); return; }
  if (e.key === ' ') { togglePause(); e.preventDefault(); }
});
addEventListener('keyup', (e) => { keys[e.key.toLowerCase()] = false; });
function keyCam(dt) {
  const s = cam.dist * 0.9 * dt;
  let mx = 0, mz = 0;
  if (keys.w || keys.arrowup) mz -= 1; if (keys.s || keys.arrowdown) mz += 1;
  if (keys.a || keys.arrowleft) mx -= 1; if (keys.d || keys.arrowright) mx += 1;
  if (mx || mz) {
    const c = Math.cos(cam.yaw), sn = Math.sin(cam.yaw);
    cam.tx = clamp(cam.tx + (mx * c + mz * sn) * s, -HALF + 2, HALF - 2);
    cam.tz = clamp(cam.tz + (-mx * sn + mz * c) * s, -HALF + 2, HALF - 2);
  }
  if (keys.q) cam.dyaw += dt * 1.6; if (keys.e) cam.dyaw -= dt * 1.6;
  if (keys.r) cam.dpitch = clamp(cam.dpitch + dt, 0.28, 1.45); if (keys.f) cam.dpitch = clamp(cam.dpitch - dt, 0.28, 1.45);
}

/* ---------------------------------------------------------------- arayüz */
let paused = false, speed = 1;
function togglePause() { paused = !paused; $('bPause').textContent = paused ? '▶' : '⏸'; }
$('bPause').onclick = togglePause;
$('bSpeed').onclick = () => { speed = speed === 1 ? 2 : speed === 2 ? 4 : 1; $('bSpeed').textContent = speed + '×'; };
$('bRotL').onclick = () => { cam.dyaw += 0.5; };
$('bRotR').onclick = () => { cam.dyaw -= 0.5; };
$('bTilt').onclick = () => { cam.dpitch = cam.dpitch > 1.1 ? 0.62 : cam.dpitch > 0.8 ? 1.25 : 0.95; };
$('bSet').onclick = () => { $('settings').hidden = !$('settings').hidden; };
$('closeSet').onclick = () => { $('settings').hidden = true; };

/* ---------------------------------------------------------------- tooltip (imleç üstüne gelince açıklama kutusu) */
// Biçim: data-tip="Başlık|Açıklama|Kısayol". Eski `title` özellikleri üstüne gelince otomatik buna çevrilir.
const tipEl = document.createElement('div'); tipEl.id = 'tip'; document.body.appendChild(tipEl);
let tipFor = null, tipTimer = 0;
function tipHide() { clearTimeout(tipTimer); tipTimer = 0; tipFor = null; tipEl.classList.remove('on'); }
function tipShow(el) {
  const [t, d, k] = el.dataset.tip.split('|');
  tipEl.textContent = '';
  const add = (tag, txt) => { const n = document.createElement(tag); n.textContent = txt; tipEl.appendChild(n); };
  add('b', t); if (d) add('span', d); if (k) add('kbd', k);
  const r = el.getBoundingClientRect(), tw = tipEl.offsetWidth, th = tipEl.offsetHeight, W = window.innerWidth, H = window.innerHeight;
  let x = r.left + r.width / 2 - tw / 2, y = r.top - th - 10;   // önce üstüne, sığmazsa altına
  if (y < 6) y = r.bottom + 10;
  if (r.left > W - 80) { x = r.left - tw - 10; y = r.top + r.height / 2 - th / 2; }   // sağ kenardaki düğmelerde soluna (alttakileri örtmesin)
  tipEl.style.left = Math.max(6, Math.min(W - tw - 6, x)) + 'px'; tipEl.style.top = Math.max(6, Math.min(H - th - 6, y)) + 'px';
  tipFor = el; tipEl.classList.add('on');
}
document.addEventListener('pointerover', (e) => {
  if (e.pointerType !== 'mouse') return;
  const el = e.target.closest ? e.target.closest('[data-tip],[title]') : null;
  if (el && el.getAttribute('title')) { el.dataset.tip = el.getAttribute('title'); el.removeAttribute('title'); }   // yerel ipucu yerine bizimki
  if (!el || !el.dataset.tip) { tipHide(); return; }
  if (el === tipFor) return;
  const quick = tipEl.classList.contains('on');   // bir ipucu açıkken yan düğmeye geçince beklemeden
  tipHide();
  tipTimer = setTimeout(() => { if (el.isConnected) tipShow(el); }, quick ? 0 : 180);
});
document.addEventListener('pointerdown', tipHide, true);
document.addEventListener('wheel', tipHide, { passive: true });
document.addEventListener('keydown', tipHide, true);
window.addEventListener('blur', tipHide);
document.documentElement.addEventListener('pointerleave', tipHide);
setInterval(() => { if (tipFor && (!tipFor.isConnected || tipFor.offsetParent === null && getComputedStyle(tipFor).position !== 'fixed')) tipHide(); }, 300);   // pencere yeniden çizilince eski ipucu kalmasın

function setSeg(group, val, cb) {
  document.querySelectorAll('#' + group + ' button').forEach((b) => {
    b.classList.toggle('on', b.dataset.v === val);
    b.onclick = () => { cb(b.dataset.v); setSeg(group, b.dataset.v, cb); };
  });
}
function setQuality(v) {
  qualityMode = v;
  if (TIERS[v]) level = TIERS[v]; else { level = Math.min(level, coarse ? 3 : 4); levelCap = 4; }
  applyLevel(); savePrefs();
}
function setStyle(real) { if (isReal === real) return; isReal = real; applyStyle(); savePrefs(); }
document.querySelectorAll('[data-q]').forEach((b) => { b.onclick = () => setQuality(b.dataset.q); });
document.querySelectorAll('[data-style]').forEach((b) => { b.onclick = () => setStyle(b.dataset.style !== 'low'); });
$('mLow').onchange = (e) => setStyle(!e.target.checked);
document.querySelectorAll('[data-tilt]').forEach((b) => { b.onclick = () => { userTilt = b.dataset.tilt === 'on'; tiltTouched = true; applyLevel(); savePrefs(); }; });
setSeg('segW', 'on', (v) => { world.war = v === 'on'; });
setSeg('segF', 'off', (v) => { document.body.classList.toggle('showfps', v === 'on'); });   // hem Simülasyon hem Ada Modu göstergesi
/* ---------------------------------------------------------------- ses arayüzü */
function auSyncUI() {
  $('aSfx').checked = AU.on.sfx; $('aAmb').checked = AU.on.amb; $('aMus').checked = AU.on.mus; $('aVol').value = AU.vol;
  $('mSnd').checked = AU.on.sfx || AU.on.amb; $('mMus').checked = AU.on.mus;
}
$('aSfx').onchange = (e) => { auUnlock(); auSetOpt('sfx', e.target.checked); auSyncUI(); auSfx('pop'); };
$('aAmb').onchange = (e) => { auUnlock(); auSetOpt('amb', e.target.checked); auSyncUI(); };
$('aMus').onchange = (e) => { auUnlock(); auSetOpt('mus', e.target.checked); auSyncUI(); };
$('aVol').oninput = (e) => { auUnlock(); auSetOpt('vol', +e.target.value); auSfx('tick'); };
$('mSnd').onchange = (e) => { auUnlock(); auSetOpt('sfx', e.target.checked); auSetOpt('amb', e.target.checked); auSyncUI(); auSfx('pop'); };
$('mMus').onchange = (e) => { auUnlock(); auSetOpt('mus', e.target.checked); auSyncUI(); };
auSyncUI();
// Tarayıcılar sesi ilk dokunuşa kadar kilitli tutar
for (const ev of ['pointerdown', 'click', 'touchend', 'keydown']) addEventListener(ev, auUnlock, { capture: true, passive: true });
document.addEventListener('click', (e) => { if (e.target.closest && e.target.closest('button,label.sw')) auSfx('click'); }, true);
let auWaterT = 0, auWater = 0;
function auScene(dt) {
  auWaterT -= dt;
  if (auWaterT <= 0) {   // odağın çevresindeki sahil/deniz oranı (dalga sesi için)
    auWaterT = 0.5;
    const f = gameMode === 'cozy' ? cozy.p : cam; let n = 0;
    for (let k = 0; k < 10; k++) { const a = k * 0.628, rr = 4 + (k % 2) * 9; if (world.getHeight(f.x + Math.cos(a) * rr, f.z + Math.sin(a) * rr) < SEA + 0.15) n++; }
    auWater = Math.min(1, n / 5);
  }
  return {
    mode: inMenu ? 'menu' : gameMode === 'cozy' ? 'cozy' : gameMode === 'detail' ? 'detail' : 'sim',
    hour: tod * 24, season: CL.season, rain: CL.rain, snow: CL.snow, storm: CL.storm, water: auWater, wind: CL.wind,
  };
}
/* ---------------------------------------------------------------- mevsim ve hava */
function climateUI() {
  document.querySelectorAll('#segS button').forEach((b) => b.classList.toggle('on', +b.dataset.v === CL.lockS));
  document.querySelectorAll('#segX button').forEach((b) => b.classList.toggle('on', b.dataset.v === CL.lockW));
}
setSeg('segS', '-1', (v) => { CL.lockS = +v; if (CL.lockS >= 0) toast(SEASONS[CL.lockS].i + ' ' + SEASONS[CL.lockS].n + ' sabitlendi'); });
setSeg('segX', '', (v) => { CL.lockW = v; if (v) { clSetWeather(v, 999); toast(WEATHERS[v].i + ' ' + WEATHERS[v].n); } });
CL.onSeason = (a, b) => { if (inMenu) return; toast(SEASONS[b].i + ' ' + SEASONS[b].n + ' geldi'); auSfx('bell', 0.55); worldNote(SEASONS[b].i, SEASONS[b].n + ' başladı'); };
CL.onWeather = (a, b) => { if (inMenu || CL.lockW) return; if (b === 'storm') toast('⛈️ Fırtına yaklaşıyor'); else if (b === 'snow') toast('❄️ Kar yağmaya başladı'); else if (b === 'fog') toast('🌫️ Sis çöktü'); };
climateUI();
$('timeSpd').oninput = (e) => { timeSpeed = +e.target.value; $('timeSpdV').textContent = timeSpeed === 0 ? 'duruyor' : timeSpeed + '×'; };
function newWorld() {
  if (gameMode === 'detail') detailNewWorld();
  else if (gameMode === 'cozy') cozyNewWorld();
  else {
    world.generate((Math.random() * 1e6) | 0);
    const t0 = world.tribes[0];
    if (t0) { cam.tx = t0.cx; cam.tz = t0.cz; }
    cam.ddist = 48;
  }
  tod = 0.33; dayCount = 1; clReset(dayCount - 1 + tod); climateUI();
  meteors.length = 0; PA.n = 0; lastAuto = Date.now(); villageReset();
  toast('Yeni dünya hazır');
}
$('bNew').onclick = () => { newWorld(); $('settings').hidden = true; };

/* ---------------------------------------------------------------- ana menü */
let inMenu = true, firstStart = true;
const menuEl = $('menu');
function showMenu() {
  inMenu = true; menuEl.hidden = false; document.body.classList.add('inmenu');
  $('settings').hidden = true; cam.ddist = 78; cam.dpitch = 0.62;
  syncModeCards();
}
function startGame(keepCam) {
  inMenu = false; menuEl.hidden = true; document.body.classList.remove('inmenu');
  lastAuto = Date.now();
  if (gameMode === 'cozy') czStart();
  else if (keepCam !== true && gameMode !== 'detail') {
    const t0 = world.tribes[0];
    if (t0) { cam.tx = t0.cx; cam.tz = t0.cz; }
    cam.ddist = 48; cam.dpitch = 0.95;
  } else if (gameMode === 'detail') cam.ddist = Math.min(cam.ddist, 40);
  if (gameMode === 'cozy') { /* czStart() karşılıyor */ } else if (gameMode === 'detail') {
    cam.dpitch = Math.min(cam.dpitch, 0.9);
    setTimeout(() => toast('Tek bir insanla başlıyorsun — ona dokun, ismini ve özelliklerini düzenle'), 600);
    maybeEvent();
  } else if (firstStart) {
    firstStart = false;
    setTimeout(() => toast(coarse ? 'Kaydırmak için ✋ seç, ya da iki parmak kullan' : 'Sağ tık: döndür · Tekerlek: yakınlaştır · ✋: kaydır'), 600);
  }
}
$('mPlay').onclick = () => startGame();
$('mNew').onclick = () => { newWorld(); startGame(); };
$('bMenu').onclick = showMenu;

/* ---------------------------------------------------------------- kayıt sistemi */
const SLOT_PREFIX = 'minidunya.kayit.v1.';
const SLOTS = [{ id: 'auto', name: '⏱ Oto-kayıt' }, { id: '1', name: 'Slot 1' }, { id: '2', name: 'Slot 2' }, { id: '3', name: 'Slot 3' }];
const AUTOSAVE_MS = 5 * 60 * 1000;
let lastAuto = Date.now(), floppyH = 0, askDel = null, askH = 0;

function flashFloppy() {
  const f = $('floppy');
  f.classList.remove('show'); void f.offsetWidth; f.classList.add('show');
  clearTimeout(floppyH); floppyH = setTimeout(() => f.classList.remove('show'), 2000);
}
function readMeta(id) {
  try { return JSON.parse(localStorage.getItem(SLOT_PREFIX + id + '.meta')); } catch (_) { return null; }
}
function saveGame(id) {
  try {
    const det = gameMode === 'detail', coz = gameMode === 'cozy';
    const meta = coz
      ? { ts: Date.now(), mode: 'cozy', pop: cozy.vill.length, houses: cozy.stars, day: cozy.day, zil: cozy.zil }
      : det
        ? { ts: Date.now(), mode: 'detail', pop: colony.people.length, houses: colony.buildings.filter((b) => b.type === 'house' && b.prog >= 1).length, day: dayCount }
        : { ts: Date.now(), mode: 'sim', pop: world.tribes.reduce((a, t) => a + t.pop, 0), houses: world.houses.length, day: dayCount };
    const data = {
      v: 1, mode: gameMode, colony: det ? colony.toJSON() : null, cozy: coz ? cozy.toJSON() : null, world: world.serialize(),
      game: { tod, dayCount, timeSpeed, speed, cl: clToJSON(), cam: { tx: cam.tx, tz: cam.tz, ddist: cam.ddist, dyaw: cam.dyaw, dpitch: cam.dpitch } },
    };
    localStorage.setItem(SLOT_PREFIX + id, JSON.stringify(data));
    localStorage.setItem(SLOT_PREFIX + id + '.meta', JSON.stringify(meta));
    flashFloppy();
    return true;
  } catch (e) { toast('⚠️ Kayıt başarısız (depolama dolu olabilir)'); return false; }
}
function loadGame(id) {
  let data = null;
  try { data = JSON.parse(localStorage.getItem(SLOT_PREFIX + id)); } catch (_) { /* bozuk */ }
  if (!data || !world.deserialize(data.world)) { toast('⚠️ Kayıt okunamadı'); return false; }
  const m = data.mode === 'detail' && data.colony ? 'detail' : data.mode === 'cozy' && data.cozy ? 'cozy' : 'sim';
  if (m === 'cozy') {
    if (gameMode !== 'cozy') enterMode('cozy', false);
    if (!cozyLoad(data.cozy)) { toast('⚠️ Kayıt okunamadı'); return false; }
  } else if (m === 'detail') {
    if (gameMode !== 'detail') enterMode('detail', false);
    if (!detailLoad(data.colony)) { toast('⚠️ Kayıt okunamadı'); return false; }
  } else if (gameMode !== 'sim') enterMode('sim', false);
  const g = data.game || {}, num = (v, d) => (Number.isFinite(v) ? v : d);
  tod = num(g.tod, 0.33); dayCount = Math.max(1, num(g.dayCount, 1)); timeSpeed = num(g.timeSpeed, 1);
  CL.days = m === 'cozy' ? 3 : 2; clFromJSON(g.cl, dayCount - 1 + tod); climateUI();
  speed = g.speed === 2 || g.speed === 4 ? g.speed : 1;
  $('bSpeed').textContent = speed + '×';
  $('timeSpd').value = timeSpeed; $('timeSpdV').textContent = timeSpeed === 0 ? 'duruyor' : timeSpeed + '×';
  document.querySelectorAll('#segW button').forEach((b) => b.classList.toggle('on', b.dataset.v === (world.war ? 'on' : 'off')));
  const c = g.cam || {};
  cam.tx = num(c.tx, cam.tx); cam.tz = num(c.tz, cam.tz); cam.ddist = num(c.ddist, 48);
  cam.dyaw = num(c.dyaw, cam.dyaw); cam.dpitch = num(c.dpitch, 0.95);
  meteors.length = 0; PA.n = 0;
  villageReset();
  buildDock();
  lastAuto = Date.now();
  return true;
}
// Kayıtlar tarayıcıda, adres başına ayrı saklanır (localhost ≠ github.io ≠ telefon). Taşımak için dosyaya aktarılır.
const SAVE_FILE_APP = 'minidunya-kayit';
let askImp = null, impTarget = null;
const saveFileIn = document.createElement('input');
saveFileIn.type = 'file'; saveFileIn.accept = '.json,application/json'; saveFileIn.hidden = true;
document.body.appendChild(saveFileIn);
function exportSave(id, name) {
  try {
    const raw = localStorage.getItem(SLOT_PREFIX + id), meta = readMeta(id);
    if (!raw || !meta) { toast('⚠️ Boş kayıt'); return; }
    const a = document.createElement('a'), d = new Date(meta.ts), p = (n) => String(n).padStart(2, '0');
    a.href = URL.createObjectURL(new Blob([JSON.stringify({ app: SAVE_FILE_APP, v: 1, meta, data: JSON.parse(raw) })], { type: 'application/json' }));
    a.download = 'minidunya-' + (id === 'auto' ? 'oto' : 'slot' + id) + '-' + meta.mode + '-' + d.getFullYear() + p(d.getMonth() + 1) + p(d.getDate()) + '-' + p(d.getHours()) + p(d.getMinutes()) + '.json';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    toast('Kayıt dosyası indirildi: ' + name);
  } catch (_) { toast('⚠️ Dışa aktarılamadı'); }
}
saveFileIn.onchange = async () => {
  const f = saveFileIn.files && saveFileIn.files[0], tgt = impTarget;
  impTarget = null;
  if (!f || !tgt) return;
  try {
    if (f.size > 6e6) throw new Error('büyük');
    const o = JSON.parse(await f.text()), d = o && o.data, m = (o && o.meta) || {}, num = (v, def) => (Number.isFinite(v) ? v : def);
    const mode = d && (d.mode === 'cozy' || d.mode === 'detail') ? d.mode : 'sim';
    const ok = o && o.app === SAVE_FILE_APP && d && d.v === 1 && d.world && d.world.v === 1 && typeof d.world.H === 'string' &&
      (mode === 'cozy' ? d.cozy && typeof d.cozy === 'object' : mode === 'detail' ? d.colony && typeof d.colony === 'object' : true);
    if (!ok) throw new Error('geçersiz');
    const meta = { ts: num(m.ts, Date.now()), mode, pop: num(m.pop, 0), houses: num(m.houses, 0), day: num(m.day, 1) };
    if (mode === 'cozy') meta.zil = num(m.zil, 0);
    localStorage.setItem(SLOT_PREFIX + tgt.id, JSON.stringify(d));
    localStorage.setItem(SLOT_PREFIX + tgt.id + '.meta', JSON.stringify(meta));
    toast('İçe aktarıldı: ' + tgt.name + ' · Yükle’ye basabilirsin');
  } catch (e) { toast(e && e.name === 'QuotaExceededError' ? '⚠️ Depolama dolu' : '⚠️ Geçersiz kayıt dosyası'); }
  renderSlots();
};
function renderSlots() {
  const box = $('slots'); box.innerHTML = '';
  for (const s of SLOTS) {
    const m = readMeta(s.id);
    const row = document.createElement('div'); row.className = 'slot';
    const info = document.createElement('div'); info.className = 'si';
    const t = document.createElement('b'); t.textContent = s.name;
    const d = document.createElement('small');
    d.textContent = m ? (m.mode === 'cozy' ? '🏝️ Ada · 👥 ' + m.pop + ' · ' + '⭐'.repeat(m.houses || 1) + ' · 🔔 ' + Math.round(m.zil || 0).toLocaleString('tr-TR')
      : (m.mode === 'detail' ? '🧑‍🌾 Detaylı · ' : '🏘️ Simülasyon · ') + '👥 ' + m.pop + ' · 🏠 ' + m.houses) + ' · Gün ' + m.day + ' · ' +
      new Date(m.ts).toLocaleString('tr-TR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : 'Boş';
    info.append(t, d); row.appendChild(info);
    const add = (txt, cls, fn, off) => {
      const b = document.createElement('button'); b.textContent = txt; b.className = cls; b.disabled = !!off; b.onclick = fn; row.appendChild(b); return b;
    };
    if (s.id !== 'auto') add('Kaydet', 'sv', () => { if (saveGame(s.id)) { toast('Kaydedildi: ' + s.name); renderSlots(); } }, inMenu).dataset.tip = 'Kaydet|Oyunun şu anki halini bu yuvaya yazar.';
    add('Yükle', '', () => {
      if (!loadGame(s.id)) return;
      $('saves').hidden = true;
      if (inMenu) startGame(true);
      toast('Kayıt yüklendi: ' + s.name);
    }, !m).dataset.tip = 'Yükle|Bu yuvadaki kaydı açar.';
    add('⬇', '', () => exportSave(s.id, s.name), !m).dataset.tip = 'Dosyaya aktar|Bu kaydı bilgisayarına .json dosyası olarak indirir; başka tarayıcıya taşıyabilirsin.';
    if (s.id !== 'auto') add(askImp === s.id ? 'Üstüne yaz?' : '⬆', askImp === s.id ? 'ask' : '', () => {
      if (m && askImp !== s.id) { askImp = s.id; clearTimeout(askH); askH = setTimeout(() => { askImp = null; renderSlots(); }, 3000); renderSlots(); return; }
      askImp = null; impTarget = s; saveFileIn.value = ''; saveFileIn.click();
    }).dataset.tip = 'Dosyadan içe aktar|Daha önce indirdiğin bir kayıt dosyasını bu yuvaya yükler.';
    add(askDel === s.id ? 'Emin misin?' : '🗑', askDel === s.id ? 'ask' : '', () => {
      if (askDel === s.id) {
        askDel = null;
        try { localStorage.removeItem(SLOT_PREFIX + s.id); localStorage.removeItem(SLOT_PREFIX + s.id + '.meta'); } catch (_) { /* yoksay */ }
      } else {
        askDel = s.id; clearTimeout(askH); askH = setTimeout(() => { askDel = null; renderSlots(); }, 3000);
      }
      renderSlots();
    }, !m);
    box.appendChild(row);
  }
}
function openSaves() { askDel = askImp = null; renderSlots(); $('settings').hidden = true; $('saves').hidden = false; }
$('bSave').onclick = openSaves;
$('mSaves').onclick = openSaves;
$('closeSaves').onclick = () => { $('saves').hidden = true; };

//@@DETAIL@@
/* ---------------------------------------------------------------- ateş / pencere ışıkları (gece) */
const FL_N = 8, flLights = [];
for (let i = 0; i < FL_N; i++) { const l = new THREE.PointLight(0xff9a45, 0, 26, 1.5); l.position.set(0, -50, 0); scene.add(l); flLights.push(l); }
let flSrc = [], flT = 0;
function gatherLights() {
  const out = [], cx = cam.x, cz = cam.z;
  const add = (x, z, s, up) => { const d = Math.hypot(x - cx, z - cz); if (d < 100) out.push({ x, z, y: world.getHeight(x, z) + up, s, key: d / s }); };
  if (gameMode === 'cozy') {
    for (const l of cozy.lights()) add(l.x, l.z, l.s, l.up);
  } else if (gameMode === 'detail') {
    for (const b of colony.buildings) if (b.prog >= 1 && (b.type === 'fire' || b.type === 'house')) add(b.x, b.z, b.type === 'fire' ? 1 : 0.28, b.type === 'fire' ? 1.0 : 1.6);
  } else {
    const hs = world.houses; for (let i = 0; i < hs.length; i++) if (hs[i].prog === undefined || hs[i].prog >= 1) add(hs[i].x, hs[i].z, 0.3, 1.6);
  }
  const bn = world.burning; for (let i = 0; i < bn.length && i < 400; i++) { const c = bn[i]; if (world.fire[c] > 0) add((c % N) - HALF + 0.5, ((c / N) | 0) - HALF + 0.5, 0.85, 1.0); }
  const gx = (cx + HALF) | 0, gz = (cz + HALF) | 0;
  for (let z = Math.max(0, gz - 30); z < Math.min(N, gz + 30); z += 2) for (let x = Math.max(0, gx - 30); x < Math.min(N, gx + 30); x += 2)
    if (world.soil[z * N + x] === SOIL.LAVA) add(x - HALF + 0.5, z - HALF + 0.5, 0.6, 1.0);
  out.sort((a, b) => a.key - b.key);
  // birbirine çok yakın kaynakları tek ışıkta birleştir
  const res = [];
  for (const s of out) { if (res.length >= FL_N) break; if (!res.some((r) => Math.hypot(r.x - s.x, r.z - s.z) < 3.2)) res.push(s); }
  return res;
}
function updateFireLights(dt, t) {
  flT -= dt; if (flT <= 0) { flT = 0.35; flSrc = gatherLights(); }
  const k = 0.1 + 0.9 * nightK;
  for (let i = 0; i < FL_N; i++) {
    const l = flLights[i], s = flSrc[i];
    let target = 0;
    if (s) { l.position.set(s.x, s.y, s.z); target = 60 * s.s * k * (1 + Math.sin(t * 13 + i * 3.1) * 0.09 + Math.sin(t * 31 + i) * 0.05); }
    l.intensity += (target - l.intensity) * Math.min(1, dt * 5);
  }
}
/* ---------------------------------------------------------------- ana döngü */
applyStyle();
resize();
applyLevel();
rtReady = true;
buildDock();
for (let j = 0; j < NCH; j++) for (let i = 0; i < NCH; i++) fillChunk(i, j);
world.chunkDirty.fill(0);
updateWater();
let treeTimer = 0, hudTimer = 0, frames = 0, accT = 0, goodWin = 0, lastUp = -99;
let prev = performance.now() / 1000, realT = 0;
let shadowHS = 0;

function frame() {
  const now = performance.now() / 1000;
  const rawDt = Math.min(1, now - prev);   // FPS ölçümü için kırpılmamış süre
  let dt = Math.min(0.1, now - prev); prev = now; realT += dt;
  U.uTime.value = realT;
  // sim
  const det = gameMode === 'detail', coz = gameMode === 'cozy';
  const sdt = paused || coz || (det && (inMenu || dModalOpen)) ? 0 : dt * speed;
  if (sdt > 0) {
    // büyük adımları böl (hızlı mod)
    const steps = Math.ceil(sdt / 0.05);
    for (let i = 0; i < steps; i++) {
      world.update(sdt / steps);
      if (det) { colony.setEnv(CL.season, CL.weather, CL.temp); colony.update(sdt / steps, tod * 24); }
    }
    tod += (sdt / dayLen) * timeSpeed;
    if (tod >= 1) { tod -= 1; dayCount++; }
    if (det && colony.queue.length) maybeEvent();
  }
  if (!inMenu && Date.now() - lastAuto >= AUTOSAVE_MS) { lastAuto = Date.now(); saveGame('auto'); }
  // araç kullanımı
  keyCam(dt);
  if (toolDown && pick(lastPt.x, lastPt.y)) {
    useTool(dt, firstPress); firstPress = false;
    const cur = curTools().find((t) => t.id === tool);
    cursor.visible = true; placeCursor(hit.x, hit.z, cur && cur.r ? brushSize : tool === 'meteor' ? 2.5 : 0.9);
  } else if (hoverPt && tool !== 'hand' && !toolDown && pick(hoverPt.x, hoverPt.y)) {
    const cur = curTools().find((t) => t.id === tool);
    cursor.visible = true; placeCursor(hit.x, hit.z, cur && cur.r ? brushSize : tool === 'meteor' ? 2.5 : 0.9);
  } else cursor.visible = false;
  // güncellemeler
  if (inMenu) cam.dyaw += dt * 0.07;   // menü arkasında ada yavaşça döner
  if (coz && !inMenu) cozyFrame(dt, realT);   // oyuncu, köylüler, nesneler ve kendi kamerası
  else { cozyCamReset(); updateCamera(dt); }
  CL.days = coz ? 3 : 2;
  clUpdate(dt, sdt, dayCount - 1 + tod, tod * 24, coz && !inMenu ? { rain: cozy.rainNow, wetDay: cozy.rainDay } : null);
  world.raining = CL.rain > 0.5 || CL.snow > 0.5;   // yağış yangını söndürür
  world.day = dayCount; world.tod = tod; world.setSeason(CL.season);   // ekinler ve köy günlüğü mevsime/zamana bağlı
  if (CL.boltNow) { CL.boltNow = false; stormBolt(); }
  SEAS.uSnow.value = CL.cover; SEAS.uWet.value = CL.wet;
  SEAS.uGrass.value.set(0, 0, 0);
  for (let i = 0; i < 4; i++) { SEAS.uGrass.value.x += SEAS_GRASS[i][0] * CL.w[i]; SEAS.uGrass.value.y += SEAS_GRASS[i][1] * CL.w[i]; SEAS.uGrass.value.z += SEAS_GRASS[i][2] * CL.w[i]; }
  updateRain(dt, cam.x, cam.z, 70);
  updateAir(dt, cam.x, cam.z, 70);
  updateSky();
  auFrame(dt, auScene(dt));
  updateClouds(dt);
  updateMeteors(dt);
  updateParticles(dt);
  // chunk / ağaç / su
  let budget = 40;
  for (let k = 0; k < world.chunkDirty.length && budget > 0; k++) {
    if (world.chunkDirty[k]) { fillChunk(k % NCH, (k / NCH) | 0); world.chunkDirty[k] = 0; budget--; }
  }
  if (world.waterDirty) updateWater();
  treeTimer += dt;
  if ((world.treesDirty && treeTimer > 0.08) || treeTimer > 1.5) { treeTimer = 0; rebuildTrees(); }
  updateHouses();
  updateFarms();
  updateHumans(realT);
  if (det && !inMenu) detailFrame(dt, realT);
  decorUpdate(dt);
  updateFireLights(dt, realT);
  if (shockT >= 0) {
    shockT += dt; const s = 1 + shockT * 30;
    shock.scale.set(s, 1, s); shock.material.opacity = Math.max(0, 0.75 * (1 - shockT / 0.9));
    if (shockT > 0.9) { shockT = -1; shock.visible = false; }
  }
  if (boltT >= 0) {
    boltT += dt; bolt.visible = boltT < 0.28 && ((boltT * 40) | 0) % 3 !== 2;
    if (boltT > 0.3) { boltT = -1; bolt.visible = false; }
  }
  if (flashA > 0.01) { flashA *= Math.exp(-dt * 6); flashEl.style.opacity = flashA; } else if (flashEl.style.opacity !== '0') flashEl.style.opacity = 0;
  // gölge kamerası kamerayı izler
  const hs = level >= 5 ? clamp(cam.dist * 0.8, 22, 100) : clamp(cam.dist * 0.95, 32, 112);
  if (Math.abs(hs - shadowHS) > hs * 0.06) {
    shadowHS = hs; const sc = sun.shadow.camera;
    sc.left = -hs; sc.right = hs; sc.top = hs; sc.bottom = -hs; sc.updateProjectionMatrix();
  }
  const ts = (2 * shadowHS) / sun.shadow.mapSize.x;
  sun.target.position.set(Math.round(cam.x / ts) * ts, 0, Math.round(cam.z / ts) * ts);
  sun.position.copy(sun.target.position).addScaledVector(lightDir, 240);
  // çiz
  if (usePost && rt) {
    renderer.setRenderTarget(rt); renderer.render(scene, camera);
    renderer.setRenderTarget(null); renderer.render(postScene, postCam);
  } else renderer.render(scene, camera);
  // HUD & otomatik kalite
  hudTimer += dt; frames++; accT += rawDt;
  if (hudTimer > 0.4) {
    hudTimer = 0;
    if (det) detailHud();
    else { $('pop').textContent = '👥 ' + world.humans.length; $('houses').textContent = '🏠 ' + world.houses.length; }
    const hh = tod * 24, hr = Math.floor(hh), mn = Math.floor((hh - hr) * 60);
    $('clock').textContent = (tod > 0.23 && tod < 0.77 ? '☀️ ' : '🌙 ') + String(hr).padStart(2, '0') + ':' + String(mn).padStart(2, '0') + ' · Gün ' + dayCount;
    $('rainBadge').textContent = clBadge();
  }
  if (accT > 1.5) {
    const avg = accT / frames, fps = frames / accT;
    const fpsTxt = Math.round(fps) + ' FPS · ' + world.treeCount + ' ağaç · k' + level;
    $('fps').textContent = fpsTxt; $('czfps').textContent = fpsTxt;
    if (qualityMode === 'auto' && !paused && realT > 6) {
      if (avg > 0.024 && level > 0) {
        if (realT - lastUp < 9) levelCap = Math.min(levelCap, level - 1);
        level--; goodWin = 0; applyLevel();
      } else if (avg < 0.0185) {
        goodWin++;
        if (goodWin >= 4 && level < Math.min(levelCap, 4)) { level++; goodWin = 0; lastUp = realT; applyLevel(); }
      } else goodWin = 0;
    }
    frames = 0; accT = 0;
  }
  requestAnimationFrame(frame);
}
addEventListener('resize', resize);
$('loading').style.display = 'none';
window.__started = true;
showMenu();
window.__game = { CL, clUpdate, AU, auSfx, auLevel, auUnlock, setTod: (v) => { tod = v; }, world, colony, camera, enterMode, get cozy() { return cozy; }, cv, czOpen, czCloseAll, cozySetMode, cozyTapIso, cozyNewWorld, get inMenu() { return inMenu; }, dSelect, get gameMode() { return gameMode; }, saveGame, loadGame, openSaves,setLevel: (l) => { qualityMode = 'manual'; level = l; applyLevel(); }, setStyle, setQuality, startGame, showMenu, get isReal() { return isReal; }, renderer, cam, toast, setTool: (t) => { tool = t; buildDock(); }, TOOLS, get tool() { return tool; }, HD, DEC, hdApply, get level() { return level; }, buildHuman, lookOf, poseHuman, scene };
requestAnimationFrame(frame);
