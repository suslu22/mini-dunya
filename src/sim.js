// Mini Dünya - saf simülasyon çekirdeği (render'dan bağımsız).
// Unity'ye taşırken bu dosya C# sınıflarına neredeyse birebir çevrilebilir.

export const N = 160, VN = N + 1, HALF = N / 2, SEA = 0;
export const CH = 16, NCH = N / CH;
export const SOIL = { GRASS: 0, SAND: 1, SNOW: 2, ROCK: 3, DIRT: 4, LAVA: 5, ASH: 6 };
export const ST = { IDLE: 0, WALK: 1, CHOPWALK: 2, CHOP: 3, BUILDWALK: 4, BUILD: 5 };
export const MAXHUM = 900, MAXHOUSE = 500, MAXTREE = 7000, MAXTRIBE = 8;

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const rnd = Math.random;

// Kayıt için typed array <-> base64
function _b64enc(arr) {
  const u = new Uint8Array(arr.buffer, arr.byteOffset, arr.byteLength);
  let s = '';
  for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000));
  return btoa(s);
}
function _b64dec(str, Type) {
  const s = atob(str), u = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) u[i] = s.charCodeAt(i);
  return new Type(u.buffer, 0, Math.floor(u.length / Type.BYTES_PER_ELEMENT));
}

export function hash2(x, y, s = 0) {
  let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ Math.imul(s | 0, 1274126177);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

function mulberry(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function makePerlin(seed) {
  const r = mulberry(seed);
  const p = new Uint8Array(256);
  for (let i = 0; i < 256; i++) p[i] = i;
  for (let i = 255; i > 0; i--) { const j = Math.floor(r() * (i + 1)); const t = p[i]; p[i] = p[j]; p[j] = t; }
  const perm = new Uint8Array(512);
  for (let i = 0; i < 512; i++) perm[i] = p[i & 255];
  const grad = (h, x, y) => {
    switch (h & 7) {
      case 0: return x + y; case 1: return -x + y; case 2: return x - y; case 3: return -x - y;
      case 4: return x; case 5: return -x; case 6: return y; default: return -y;
    }
  };
  const fade = (t) => t * t * t * (t * (t * 6 - 15) + 10);
  const l = (a, b, t) => a + t * (b - a);
  return (x, y) => {
    const fx = Math.floor(x), fy = Math.floor(y);
    const X = fx & 255, Y = fy & 255;
    x -= fx; y -= fy;
    const u = fade(x), v = fade(y);
    const a = perm[X] + Y, b = perm[X + 1] + Y;
    return l(l(grad(perm[a], x, y), grad(perm[b], x - 1, y), u),
             l(grad(perm[a + 1], x, y - 1), grad(perm[b + 1], x - 1, y - 1), u), v) * 1.4;
  };
}

const ANG = [0, 0.9, -0.9, 1.8, -1.8];
const ACOS = ANG.map(Math.cos), ASIN = ANG.map(Math.sin);
const BS = 4, NB = Math.ceil(N / BS);

export class World {
  constructor() {
    this.H = new Float32Array(VN * VN);
    this.soil = new Uint8Array(N * N);
    this.auto = new Uint8Array(N * N);
    this.treeT = new Uint8Array(N * N);       // 0 yok, 1 meşe, 2 çam
    this.treeS = new Float32Array(N * N);     // temel ölçek
    this.treeBorn = new Float32Array(N * N);  // dikilme zamanı (büyüme animasyonu için)
    this.fire = new Float32Array(N * N);
    this.houseAt = new Int16Array(N * N).fill(-1);
    this.chunkDirty = new Uint8Array(NCH * NCH);
    this.waterDirty = true;
    this.treesDirty = true;
    this.houses = [];
    this.humans = [];
    this.tribes = [];
    this.burning = [];
    this.bHead = new Int32Array(NB * NB);
    this.bNext = new Int32Array(MAXHUM + 64);
    this.simTime = 0;
    this.natAcc = 0;
    this.raining = false;
    this.war = true;
    this.treeCount = 0;
    this.fx = () => {};
  }

  // ---------------------------------------------------------------- yardımcılar
  getHeight(x, z) {
    let gx = x + HALF, gz = z + HALF;
    if (gx < 0) gx = 0; else if (gx > N - 1e-4) gx = N - 1e-4;
    if (gz < 0) gz = 0; else if (gz > N - 1e-4) gz = N - 1e-4;
    const cx = gx | 0, cz = gz | 0, fx = gx - cx, fz = gz - cz;
    const i = cz * VN + cx, H = this.H;
    const ha = H[i], hb = H[i + 1], hc = H[i + VN], hd = H[i + VN + 1];
    if (((cx + cz) & 1) === 0) {
      return fz >= fx ? ha + fx * (hd - hc) + fz * (hc - ha) : ha + fz * (hd - hb) + fx * (hb - ha);
    }
    return fx + fz <= 1 ? ha + fx * (hb - ha) + fz * (hc - ha) : hd + (1 - fx) * (hc - hd) + (1 - fz) * (hb - hd);
  }
  cellH(cx, cz) {
    const i = cz * VN + cx, H = this.H;
    return (H[i] + H[i + 1] + H[i + VN] + H[i + VN + 1]) * 0.25;
  }
  cellRange(cx, cz) {
    const i = cz * VN + cx, H = this.H;
    const a = H[i], b = H[i + 1], c = H[i + VN], d = H[i + VN + 1];
    return Math.max(a, b, c, d) - Math.min(a, b, c, d);
  }
  // Hücre değişince onu çevreleyen chunk'lar da güncellenir: yumuşak (gerçekçi) arazi
  // köşe normallerini ve renklerini komşu hücrelerden hesaplar.
  markCell(cx, cz) {
    if (cx < 0 || cz < 0 || cx >= N || cz >= N) return;
    const ci = (cx / CH) | 0, cj = (cz / CH) | 0, D = this.chunkDirty;
    D[cj * NCH + ci] = 1;
    const lx = cx - ci * CH, lz = cz - cj * CH;
    const i0 = lx === 0 && ci > 0 ? ci - 1 : ci, i1 = lx === CH - 1 && ci < NCH - 1 ? ci + 1 : ci;
    const j0 = lz === 0 && cj > 0 ? cj - 1 : cj, j1 = lz === CH - 1 && cj < NCH - 1 ? cj + 1 : cj;
    if (i0 !== i1 || j0 !== j1 || i0 !== ci || j0 !== cj) {
      for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) D[j * NCH + i] = 1;
    }
  }
  markRect(x0, x1, z0, z1) {
    x0 = clamp(x0 - 1, 0, N - 1); x1 = clamp(x1 + 1, 0, N - 1); z0 = clamp(z0 - 1, 0, N - 1); z1 = clamp(z1 + 1, 0, N - 1);
    for (let j = (z0 / CH) | 0; j <= ((z1 / CH) | 0); j++)
      for (let i = (x0 / CH) | 0; i <= ((x1 / CH) | 0); i++) this.chunkDirty[j * NCH + i] = 1;
  }
  classify(cell, h) {
    if (!this.auto[cell]) return;
    let s = this.soil[cell];
    if (s === SOIL.LAVA || s === SOIL.ASH) return;
    if (h < 0.8) s = SOIL.SAND;
    else if (h > 13.5) s = SOIL.SNOW;
    else if (h > 9.5) s = SOIL.ROCK;
    else if (s === SOIL.SAND) { if (h > 1.3) s = SOIL.GRASS; }
    else s = SOIL.GRASS;
    this.soil[cell] = s;
  }

  // ---------------------------------------------------------------- dünya üretimi
  generate(seed) {
    this.simTime = 0; this.natAcc = 0;
    this.humans.length = 0; this.houses.length = 0; this.tribes.length = 0; this.burning.length = 0;
    this.houseAt.fill(-1); this.fire.fill(0); this.treeT.fill(0); this.treeCount = 0;
    this.auto.fill(1);
    const n1 = makePerlin(seed), n2 = makePerlin(seed * 7 + 13), n3 = makePerlin(seed * 3 + 5);
    const fbm = (n, x, y, o) => {
      let a = 1, f = 1, s = 0, t = 0;
      for (let i = 0; i < o; i++) { s += n(x * f, y * f) * a; t += a; a *= 0.5; f *= 2.03; }
      return s / t;
    };
    for (let vz = 0; vz < VN; vz++) {
      for (let vx = 0; vx < VN; vx++) {
        const dx = (vx - HALF) / HALF, dz = (vz - HALF) / HALF;
        const d = Math.sqrt(dx * dx + dz * dz);
        const e = fbm(n1, vx * 0.021 + 3.1, vz * 0.021 + 7.7, 5) * 0.5 + 0.5;
        const ridge = 1 - Math.abs(fbm(n2, vx * 0.028, vz * 0.028, 4) * 1.6);
        const fall = smooth(0.55, 1.0, d);
        let h = (e - 0.36) * 22;
        h += Math.pow(Math.max(0, ridge - 0.58) / 0.42, 1.7) * 11 * smooth(0.5, 0.68, e);
        h = h * (1 - fall) - fall * 11;
        h += fbm(n3, vx * 0.12, vz * 0.12, 2) * 0.5;
        this.H[vz * VN + vx] = clamp(h, -10, 24);
      }
    }
    for (let cz = 0; cz < N; cz++) for (let cx = 0; cx < N; cx++) {
      const c = cz * N + cx;
      this.soil[c] = SOIL.GRASS;
      this.classify(c, this.cellH(cx, cz));
    }
    // ormanlar
    for (let cz = 0; cz < N; cz++) for (let cx = 0; cx < N; cx++) {
      const c = cz * N + cx; const s = this.soil[c]; const h = this.cellH(cx, cz);
      if (this.treeCount >= MAXTREE) break;
      if (h < 1.0 || h > 12) continue;
      if (s !== SOIL.GRASS && s !== SOIL.SNOW) continue;
      const f = n3(cx * 0.05 + 11, cz * 0.05 + 4) * 0.5 + 0.5;
      let dens = smooth(0.40, 0.58, f) * 0.9 + 0.06;
      if (s === SOIL.SNOW) dens = 0.14;
      if (hash2(cx, cz, seed) < dens) {
        const pine = s === SOIL.SNOW || h > 6.5 || (f > 0.66 && hash2(cx, cz, 9) < 0.4);
        this.setTree(c, pine ? 2 : 1, 0.8 + hash2(cx, cz, 5) * 0.55, -1000);
      }
    }
    // başlangıç köyleri
    const sites = [];
    for (let t = 0; t < 900 && sites.length < 3; t++) {
      const cx = 12 + ((rnd() * (N - 24)) | 0), cz = 12 + ((rnd() * (N - 24)) | 0);
      const h = this.cellH(cx, cz);
      if (h < 1.6 || h > 6 || this.cellRange(cx, cz) > 0.7) continue;
      let ok = true;
      for (const s of sites) if (Math.hypot(s[0] - cx, s[1] - cz) < 38) ok = false;
      for (let k = 0; k < 8 && ok; k++) {
        const ax = cx + ((k % 3) - 1) * 3, az = cz + (((k / 3) | 0) - 1) * 3;
        if (this.cellH(ax, az) < 1.0) ok = false;
      }
      if (ok) sites.push([cx, cz]);
    }
    for (const s of sites) this.spawnVillage(s[0] - HALF + 0.5, s[1] - HALF + 0.5, 2);
    this.waterDirty = true; this.treesDirty = true;
    this.chunkDirty.fill(1);
  }

  // ---------------------------------------------------------------- ağaçlar
  setTree(cell, type, scale, born) {
    if (this.treeT[cell] === 0) this.treeCount++;
    this.treeT[cell] = type; this.treeS[cell] = scale; this.treeBorn[cell] = born;
    this.treesDirty = true;
  }
  removeTree(cell) {
    if (this.treeT[cell] === 0) return false;
    this.treeT[cell] = 0; this.treeCount--; this.treesDirty = true; return true;
  }

  // ---------------------------------------------------------------- arazi düzenleme
  editTerrain(mode, hx, hz, rad, dt, flatH) {
    const gx = hx + HALF, gz = hz + HALF;
    const x0 = Math.max(0, Math.floor(gx - rad)), x1 = Math.min(N, Math.ceil(gx + rad));
    const z0 = Math.max(0, Math.floor(gz - rad)), z1 = Math.min(N, Math.ceil(gz + rad));
    const H = this.H;
    for (let vz = z0; vz <= z1; vz++) for (let vx = x0; vx <= x1; vx++) {
      const d = Math.hypot(vx - gx, vz - gz);
      if (d > rad) continue;
      let f = 1 - d / rad; f = f * f * (3 - 2 * f);
      const i = vz * VN + vx;
      if (mode === 'up') H[i] += 7 * dt * f;
      else if (mode === 'down') H[i] -= 7 * dt * f;
      else if (mode === 'flat') H[i] += (flatH - H[i]) * Math.min(1, 9 * dt * f);
      else if (mode === 'lava') H[i] += 0.5 * dt * f;
      H[i] = clamp(H[i], -10, 24);
    }
    this.afterEdit(x0 - 1, x1, z0 - 1, z1);
  }
  afterEdit(x0, x1, z0, z1) {
    x0 = clamp(x0, 0, N - 1); x1 = clamp(x1, 0, N - 1); z0 = clamp(z0, 0, N - 1); z1 = clamp(z1, 0, N - 1);
    for (let cz = z0; cz <= z1; cz++) for (let cx = x0; cx <= x1; cx++) {
      const c = cz * N + cx, h = this.cellH(cx, cz);
      this.classify(c, h);
      if (h < SEA + 0.3) {
        if (this.treeT[c]) this.removeTree(c);
        if (this.houseAt[c] >= 0) this.destroyHouse(this.houseAt[c]);
      } else if (this.houseAt[c] >= 0) this.houses[this.houseAt[c]].y = h;   // ev araziye yapışık kalsın
    }
    this.markRect(x0, x1, z0, z1);
    this.waterDirty = true;
  }
  paintSoil(type, hx, hz, rad) {
    const gx = hx + HALF, gz = hz + HALF;
    for (let cz = Math.max(0, Math.floor(gz - rad)); cz <= Math.min(N - 1, Math.ceil(gz + rad)); cz++)
      for (let cx = Math.max(0, Math.floor(gx - rad)); cx <= Math.min(N - 1, Math.ceil(gx + rad)); cx++) {
        if (Math.hypot(cx + 0.5 - gx, cz + 0.5 - gz) > rad) continue;
        const c = cz * N + cx;
        if (this.soil[c] === type && !this.auto[c]) continue;
        this.soil[c] = type; this.auto[c] = 0; this.markCell(cx, cz);
        if (type === SOIL.SAND || type === SOIL.ROCK || type === SOIL.LAVA) this.removeTree(c);
        if (type === SOIL.SNOW && this.treeT[c] === 1) this.treeT[c] = 2;
      }
  }
  plantTrees(hx, hz, rad, p) {
    const gx = hx + HALF, gz = hz + HALF;
    for (let cz = Math.max(1, Math.floor(gz - rad)); cz <= Math.min(N - 2, Math.ceil(gz + rad)); cz++)
      for (let cx = Math.max(1, Math.floor(gx - rad)); cx <= Math.min(N - 2, Math.ceil(gx + rad)); cx++) {
        if (Math.hypot(cx + 0.5 - gx, cz + 0.5 - gz) > rad || rnd() > p) continue;
        const c = cz * N + cx, h = this.cellH(cx, cz), s = this.soil[c];
        if (this.treeT[c] || this.houseAt[c] >= 0 || this.fire[c] > 0 || this.treeCount >= MAXTREE) continue;
        if (h < 1.0 || h > 13 || s === SOIL.SAND || s === SOIL.LAVA || s === SOIL.ROCK) continue;
        this.setTree(c, s === SOIL.SNOW || h > 6.5 ? 2 : 1, 0.8 + rnd() * 0.55, this.simTime);
      }
  }
  clearTrees(hx, hz, rad) {
    const gx = hx + HALF, gz = hz + HALF;
    for (let cz = Math.max(0, Math.floor(gz - rad)); cz <= Math.min(N - 1, Math.ceil(gz + rad)); cz++)
      for (let cx = Math.max(0, Math.floor(gx - rad)); cx <= Math.min(N - 1, Math.ceil(gx + rad)); cx++) {
        if (Math.hypot(cx + 0.5 - gx, cz + 0.5 - gz) > rad) continue;
        this.removeTree(cz * N + cx);
      }
  }
  eraseAll(hx, hz, rad) {
    this.clearTrees(hx, hz, rad);
    for (const h of this.humans) if (!h.dead && Math.hypot(h.x - hx, h.z - hz) < rad) this._kill(h, 'erase');
    for (let i = this.houses.length - 1; i >= 0; i--) {
      const o = this.houses[i];
      if (Math.hypot(o.x - hx, o.z - hz) < rad) this.destroyHouse(i);
    }
  }

  // ---------------------------------------------------------------- kabileler
  _tribeFor(x, z, forceNew) {
    if (!forceNew) {
      let best = null, bd = 16;
      for (const h of this.humans) {
        if (h.dead) continue;
        const d = Math.hypot(h.x - x, h.z - z);
        if (d < bd) { bd = d; best = h.tribe; }
      }
      if (best !== null) return best;
    }
    for (let i = 0; i < this.tribes.length; i++) {
      const t = this.tribes[i];
      if (t.pop === 0 && t.houses === 0) { t.cx = x; t.cz = z; t.building = 0; return i; }
    }
    if (this.tribes.length < MAXTRIBE) {
      this.tribes.push({ id: this.tribes.length, pop: 0, houses: 0, building: 0, cx: x, cz: z });
      return this.tribes.length - 1;
    }
    // hepsi dolu: en yakın kabile
    let bi = 0, bd = 1e9;
    for (let i = 0; i < this.tribes.length; i++) {
      const d = Math.hypot(this.tribes[i].cx - x, this.tribes[i].cz - z);
      if (d < bd) { bd = d; bi = i; }
    }
    return bi;
  }
  _recenter(t) {
    let sx = 0, sz = 0, n = 0;
    for (const h of this.houses) if (h.tribe === t.id) { sx += h.x; sz += h.z; n++; }
    if (n) { t.cx = sx / n; t.cz = sz / n; }
  }

  // ---------------------------------------------------------------- insanlar & evler
  spawnHuman(x, z, tribe, age) {
    if (this.humans.length >= MAXHUM) return null;
    const h = {
      x, z, y: this.getHeight(x, z), tx: x, tz: z, state: ST.IDLE, timer: 0, tribe, age,
      life: 200 + rnd() * 120, hp: 100, wood: 0, cd: 6 + rnd() * 14, ang: rnd() * 6.28, phase: rnd() * 6.28,
      think: rnd() * 0.8, flash: 0, moving: false, skin: (rnd() * 5) | 0, dead: false,
      chopCell: -1, buildCell: -1, charge: false, fxT: 0,
    };
    this.humans.push(h); this.tribes[tribe].pop++;
    return h;
  }
  _validSpot(x, z) {
    if (Math.abs(x) > HALF - 3 || Math.abs(z) > HALF - 3) return false;
    const cx = (x + HALF) | 0, cz = (z + HALF) | 0, c = cz * N + cx;
    return this.getHeight(x, z) > SEA + 0.4 && this.soil[c] !== SOIL.LAVA && this.houseAt[c] < 0;
  }
  spawnGroup(hx, hz, n) {
    if (!this._validSpot(hx, hz)) return 0;
    const tribe = this._tribeFor(hx, hz, false);
    let made = 0;
    for (let i = 0; i < n; i++) {
      for (let t = 0; t < 6; t++) {
        const x = hx + (rnd() - 0.5) * 2.4, z = hz + (rnd() - 0.5) * 2.4;
        if (!this._validSpot(x, z)) continue;
        if (this.spawnHuman(x, z, tribe, 18 + rnd() * 30)) { made++; this.fx('puff', x, this.getHeight(x, z) + 0.3, z, 1); }
        break;
      }
    }
    return made;
  }
  spawnVillage(hx, hz, nHouses = 3) {
    if (!this._validSpot(hx, hz)) return false;
    const tribe = this._tribeFor(hx, hz, true);
    const tr = this.tribes[tribe]; tr.cx = hx; tr.cz = hz;
    let made = 0;
    for (let t = 0; t < 40 && made < nHouses; t++) {
      const cx = ((hx + HALF) | 0) + ((rnd() * 9) | 0) - 4, cz = ((hz + HALF) | 0) + ((rnd() * 9) | 0) - 4;
      if (this._buildable(cx, cz, true)) { this.removeTree(cz * N + cx); this.createHouse(cz * N + cx, tribe, true); made++; }
    }
    for (let i = 0; i < 6; i++) {
      for (let t = 0; t < 8; t++) {
        const x = hx + (rnd() - 0.5) * 7, z = hz + (rnd() - 0.5) * 7;
        if (this._validSpot(x, z)) { this.spawnHuman(x, z, tribe, 18 + rnd() * 40); break; }
      }
    }
    return made > 0;
  }
  _buildable(cx, cz, ignoreTree) {
    if (cx < 3 || cz < 3 || cx > N - 4 || cz > N - 4) return false;
    const c = cz * N + cx;
    if (this.houseAt[c] >= 0 || this.fire[c] > 0 || this.soil[c] === SOIL.LAVA) return false;
    if (!ignoreTree && this.treeT[c]) return false;
    const h = this.cellH(cx, cz);
    if (h < 1.0 || h > 11 || this.cellRange(cx, cz) > 1.1) return false;
    for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++)
      if ((dx || dz) && this.houseAt[(cz + dz) * N + cx + dx] >= 0) return false;
    return true;
  }
  createHouse(cell, tribe, instant) {
    if (this.houses.length >= MAXHOUSE || this.houseAt[cell] >= 0) return -1;
    const cx = cell % N, cz = (cell / N) | 0;
    this.removeTree(cell);
    const o = {
      x: cx - HALF + 0.5, z: cz - HALF + 0.5, y: 0, cell, tribe,
      rot: ((rnd() * 4) | 0) * Math.PI / 2 + (rnd() - 0.5) * 0.35, prog: instant ? 1 : 0,
    };
    o.y = this.cellH(cx, cz);
    this.houses.push(o);
    this.houseAt[cell] = this.houses.length - 1;
    const tr = this.tribes[tribe]; tr.houses++; this._recenter(tr);
    return this.houses.length - 1;
  }
  destroyHouse(idx) {
    const o = this.houses[idx]; if (!o) return;
    const tr = this.tribes[o.tribe]; tr.houses--;
    this.houseAt[o.cell] = -1;
    this.fx('debris', o.x, o.y + 0.4, o.z, 1);
    const last = this.houses.pop();
    if (last !== o) { this.houses[idx] = last; this.houseAt[last.cell] = idx; }
    this._recenter(tr);
  }
  _kill(h, cause) {
    if (h.dead) return;
    h.dead = true;
    const tr = this.tribes[h.tribe]; tr.pop--;
    if (h.buildCell >= 0) { tr.building = Math.max(0, tr.building - 1); h.buildCell = -1; }
    if (cause === 'drown') this.fx('splash', h.x, SEA, h.z, 1);
    else if (cause === 'burn') this.fx('smoke', h.x, h.y + 0.3, h.z, 1);
    else this.fx('puff', h.x, h.y + 0.3, h.z, 1);
  }

  // ---------------------------------------------------------------- felaketler
  ignite(cell) {
    if (this.fire[cell] > 0) return false;
    const cx = cell % N, cz = (cell / N) | 0;
    if (this.cellH(cx, cz) < SEA + 0.3 || this.soil[cell] === SOIL.LAVA) return false;
    this.fire[cell] = this.treeT[cell] ? 4.5 : this.houseAt[cell] >= 0 ? 4 : 1.8;
    this.burning.push(cell); this.markCell(cx, cz);
    return true;
  }
  igniteArea(hx, hz, rad, p) {
    const gx = hx + HALF, gz = hz + HALF;
    for (let cz = Math.max(0, Math.floor(gz - rad)); cz <= Math.min(N - 1, Math.ceil(gz + rad)); cz++)
      for (let cx = Math.max(0, Math.floor(gx - rad)); cx <= Math.min(N - 1, Math.ceil(gx + rad)); cx++)
        if (Math.hypot(cx + 0.5 - gx, cz + 0.5 - gz) <= rad && rnd() < p) this.ignite(cz * N + cx);
  }
  lightning(hx, hz) {
    const cx = clamp((hx + HALF) | 0, 0, N - 1), cz = clamp((hz + HALF) | 0, 0, N - 1);
    const y = Math.max(this.getHeight(hx, hz), SEA);
    this.fx('bolt', hx, y, hz, 1);
    for (const h of this.humans) if (!h.dead && Math.hypot(h.x - hx, h.z - hz) < 1.7) this._kill(h, 'burn');
    if (!this.raining) this.igniteArea(hx, hz, 1.2, 1);
    this.fx('spark', hx, y + 0.3, hz, 1);
  }
  meteor(hx, hz) {
    const R = 4.4, gx = hx + HALF, gz = hz + HALF, H = this.H;
    const x0 = Math.max(0, Math.floor(gx - R - 2)), x1 = Math.min(N, Math.ceil(gx + R + 2));
    const z0 = Math.max(0, Math.floor(gz - R - 2)), z1 = Math.min(N, Math.ceil(gz + R + 2));
    for (let vz = z0; vz <= z1; vz++) for (let vx = x0; vx <= x1; vx++) {
      const d = Math.hypot(vx - gx, vz - gz);
      if (d > R + 1.5) continue;
      const i = vz * VN + vx;
      const bowl = d < R ? 3.6 * (1 - (d / R) * (d / R)) : 0;
      const rim = 0.7 * Math.exp(-Math.pow((d - R * 0.92) / 0.9, 2));
      H[i] = clamp(H[i] - bowl + rim, -10, 24);
    }
    for (const h of this.humans) if (!h.dead && Math.hypot(h.x - hx, h.z - hz) < 6.5) this._kill(h, 'burn');
    for (let i = this.houses.length - 1; i >= 0; i--) {
      const o = this.houses[i]; if (Math.hypot(o.x - hx, o.z - hz) < 5) this.destroyHouse(i);
    }
    for (let cz = z0; cz < z1; cz++) for (let cx = x0; cx < x1; cx++) {
      const d = Math.hypot(cx + 0.5 - gx, cz + 0.5 - gz), c = cz * N + cx;
      if (cx < 0 || cz < 0 || cx >= N || cz >= N) continue;
      if (d < 2.4) { this.soil[c] = SOIL.LAVA; this.auto[c] = 0; this.removeTree(c); }
      else if (d < R) { this.soil[c] = SOIL.ROCK; this.auto[c] = 0; this.removeTree(c); }
      else if (d < R + 3 && this.treeT[c] && rnd() < 0.55) this.ignite(c);
    }
    this.afterEdit(x0 - 1, x1, z0 - 1, z1);
    this.fx('explode', hx, Math.max(this.getHeight(hx, hz), SEA), hz, 1);
  }
  lavaBrush(hx, hz, rad, dt) {
    this.editTerrain('lava', hx, hz, rad, dt, 0);
    const gx = hx + HALF, gz = hz + HALF;
    for (let cz = Math.max(0, Math.floor(gz - rad)); cz <= Math.min(N - 1, Math.ceil(gz + rad)); cz++)
      for (let cx = Math.max(0, Math.floor(gx - rad)); cx <= Math.min(N - 1, Math.ceil(gx + rad)); cx++) {
        if (Math.hypot(cx + 0.5 - gx, cz + 0.5 - gz) > rad * 0.85) continue;
        const c = cz * N + cx;
        if (this.cellH(cx, cz) < SEA + 0.2) continue;
        if (this.soil[c] !== SOIL.LAVA) {
          this.soil[c] = SOIL.LAVA; this.auto[c] = 0; this.removeTree(c); this.markCell(cx, cz);
          if (this.houseAt[c] >= 0) this.destroyHouse(this.houseAt[c]);
        }
      }
  }

  // ---------------------------------------------------------------- insan zekâsı
  _okPoint(x, z) {
    if (Math.abs(x) > HALF - 2 || Math.abs(z) > HALF - 2) return false;
    const c = (((z + HALF) | 0) * N) + ((x + HALF) | 0);
    return this.getHeight(x, z) > SEA + 0.3 && this.soil[c] !== SOIL.LAVA && this.houseAt[c] < 0 && this.fire[c] <= 0;
  }
  _okStep(nx, nz, y, step) {
    if (Math.abs(nx) > HALF - 1.5 || Math.abs(nz) > HALF - 1.5) return false;
    const ny = this.getHeight(nx, nz);
    if (ny < SEA + 0.2 || (ny - y) / step > 1.8) return false;
    const c = (((nz + HALF) | 0) * N) + ((nx + HALF) | 0);
    return this.soil[c] !== SOIL.LAVA && this.houseAt[c] < 0;
  }
  // (x,z) çevresinde, minR..maxR aralığında yürünebilir en yakın boş nokta (sıkışanları kurtarmak için)
  freeSpot(x, z, minR, maxR, extra) {
    for (let r = minR; r <= maxR; r += 1) {
      const n = Math.max(8, (r * 6) | 0), off = rnd() * 6.28;
      for (let i = 0; i < n; i++) {
        const a = off + (i / n) * 6.2832, nx = x + Math.cos(a) * r, nz = z + Math.sin(a) * r;
        if (this._okPoint(nx, nz) && this.getHeight(nx, nz) > SEA + 0.6 && this.cellH((nx + HALF) | 0, (nz + HALF) | 0) > SEA + 0.4 && (!extra || extra(nx, nz))) return { x: nx, z: nz };
      }
    }
    return null;
  }
  // Yürüyemeyen / geçersiz yerde (ev içi, su, lav) kalan insanı kurtarır. blk: engele toslama süresi
  _unstick(h, dt) {
    h.ut = (h.ut || 0) + dt; if (h.moving) h.wk = (h.wk || 0) + dt;
    if (h.state === ST.WALK || h.state === ST.CHOPWALK || h.state === ST.BUILDWALK) h.ws = (h.ws || 0) + dt;   // yürümeye çalışıp yerinden kıpırdayamayanlar da sayılır
    if (h.ut < 0.5) return;
    h.pt = (h.pt || 0) + h.ut; h.ut = 0;
    if (h.bx0 === undefined) { h.bx0 = h.bx1 = h.x; h.bz0 = h.bz1 = h.z; }
    h.bx0 = Math.min(h.bx0, h.x); h.bx1 = Math.max(h.bx1, h.x); h.bz0 = Math.min(h.bz0, h.z); h.bz1 = Math.max(h.bz1, h.z);
    if (h.pt >= 10) {   // 10 sn'nin çoğunu yürüyerek ama hep aynı küçük alanda geçiren (ileri-geri titreyen) sıkışmıştır
      if (((h.wk || 0) > 7 || (h.ws || 0) > 8) && Math.max(h.bx1 - h.bx0, h.bz1 - h.bz0) < 3.6) h.blk = 3;
      h.bx0 = h.bx1 = h.x; h.bz0 = h.bz1 = h.z; h.pt = 0; h.wk = 0; h.ws = 0;
    }
    const c = (((h.z + HALF) | 0) * N) + ((h.x + HALF) | 0);
    const bad = this.houseAt[c] >= 0 || this.getHeight(h.x, h.z) < SEA + 0.12 || Math.abs(h.x) > HALF - 1.4 || Math.abs(h.z) > HALF - 1.4;
    if ((h.blk || 0) < 3 && !bad) return;
    const tr = this.tribes[h.tribe];
    const s = (tr.houses && (h.blk || 0) >= 3 ? this.freeSpot(tr.cx, tr.cz, 2, 9) : null) || this.freeSpot(h.x, h.z, bad ? 1 : 3, 14) || this.freeSpot(h.x, h.z, 14, 40) || this.freeSpot(tr.cx, tr.cz, 0, 70);
    h.blk = 0; h.bx0 = undefined; h.pt = 0; h.wk = 0; h.ws = 0;
    if (!s) return;
    this.fx('puff', h.x, h.y + 0.3, h.z, 1);
    h.x = h.tx = s.x; h.z = h.tz = s.z; h.y = this.getHeight(s.x, s.z); h.state = ST.IDLE; h.think = 0.3; h.charge = false;
    this.fx('puff', h.x, h.y + 0.3, h.z, 1);
  }
  _move(h, dt) {
    const dx = h.tx - h.x, dz = h.tz - h.z, d = Math.hypot(dx, dz);
    if (d < 0.16) return 1;
    const step = Math.min((h.age < 16 ? 1.0 : 1.35) * dt, d);
    const ux = dx / d, uz = dz / d;
    for (let a = 0; a < 5; a++) {
      const vx = ux * ACOS[a] - uz * ASIN[a], vz = ux * ASIN[a] + uz * ACOS[a];
      const nx = h.x + vx * step, nz = h.z + vz * step;
      if (this._okStep(nx, nz, h.y, step)) {
        h.x = nx; h.z = nz; h.ang = Math.atan2(vx, vz); h.moving = true; if (h.blk > 0) h.blk = Math.max(0, h.blk - dt * 2); return 0;
      }
    }
    h.blk = (h.blk || 0) + Math.max(dt, 0.25);
    return -1;
  }
  _wander(h, r) {
    const tr = this.tribes[h.tribe];
    for (let t = 0; t < 5; t++) {
      let nx = h.x + (rnd() - 0.5) * 2 * r, nz = h.z + (rnd() - 0.5) * 2 * r;
      if (Math.hypot(nx - tr.cx, nz - tr.cz) > 18) { nx = tr.cx + (rnd() - 0.5) * 14; nz = tr.cz + (rnd() - 0.5) * 14; }
      if (this._okPoint(nx, nz)) { h.tx = nx; h.tz = nz; h.state = ST.WALK; h.charge = false; return; }
    }
    h.think = 0.5 + rnd();
  }
  _buildHash() {
    this.bHead.fill(-1);
    const hs = this.humans;
    for (let i = 0; i < hs.length; i++) {
      const h = hs[i]; if (h.dead) continue;
      const bx = clamp(((h.x + HALF) / BS) | 0, 0, NB - 1), bz = clamp(((h.z + HALF) / BS) | 0, 0, NB - 1);
      const b = bz * NB + bx;
      this.bNext[i] = this.bHead[b]; this.bHead[b] = i;
    }
  }
  // mode 0: düşman, mode 1: eş adayı
  _nearest(h, r, mode) {
    const bx0 = clamp(((h.x - r + HALF) / BS) | 0, 0, NB - 1), bx1 = clamp(((h.x + r + HALF) / BS) | 0, 0, NB - 1);
    const bz0 = clamp(((h.z - r + HALF) / BS) | 0, 0, NB - 1), bz1 = clamp(((h.z + r + HALF) / BS) | 0, 0, NB - 1);
    let best = null, bd = r * r;
    const hs = this.humans;
    for (let bz = bz0; bz <= bz1; bz++) for (let bx = bx0; bx <= bx1; bx++) {
      for (let i = this.bHead[bz * NB + bx]; i !== -1; i = this.bNext[i]) {
        const o = hs[i];
        if (!o || o === h || o.dead) continue;
        if (mode === 0) { if (o.tribe === h.tribe || o.age < 16) continue; }
        else if (o.tribe !== h.tribe || o.age < 20 || o.cd > 0) continue;
        const d = (o.x - h.x) * (o.x - h.x) + (o.z - h.z) * (o.z - h.z);
        if (d < bd) { bd = d; best = o; }
      }
    }
    return best;
  }
  _findTree(h, R) {
    const cx = (h.x + HALF) | 0, cz = (h.z + HALF) | 0;
    let best = -1, bd = 1e9;
    for (let z = Math.max(0, cz - R); z <= Math.min(N - 1, cz + R); z++)
      for (let x = Math.max(0, cx - R); x <= Math.min(N - 1, cx + R); x++) {
        const c = z * N + x;
        if (!this.treeT[c] || this.fire[c] > 0) continue;
        const d = (x - cx) * (x - cx) + (z - cz) * (z - cz) + rnd() * 6;
        if (d < bd) { bd = d; best = c; }
      }
    return best;
  }
  _findBuildSpot(tr, h) {
    const R = 3.5 + Math.sqrt(tr.houses) * 2.4;
    const ax = tr.houses ? tr.cx : h.x, az = tr.houses ? tr.cz : h.z;
    for (let t = 0; t < 16; t++) {
      const cx = Math.floor(ax + HALF + (rnd() - 0.5) * 2 * R), cz = Math.floor(az + HALF + (rnd() - 0.5) * 2 * R);
      if (this._buildable(cx, cz, false)) return cz * N + cx;
    }
    return -1;
  }
  _birth(a, b) {
    const x = (a.x + b.x) / 2, z = (a.z + b.z) / 2;
    if (this.spawnHuman(x, z, a.tribe, 0)) {
      a.cd = b.cd = 30 + rnd() * 25;
      this.fx('heart', x, this.getHeight(x, z) + 0.8, z, 1);
    }
  }
  _think(h) {
    const tr = this.tribes[h.tribe];
    h.think = 0.4 + rnd() * 0.5;
    if (this.war && h.age >= 16) {
      const e = this._nearest(h, 6, 0);
      if (e) {
        const d = Math.hypot(e.x - h.x, e.z - h.z);
        if (d < 1.25) {
          e.hp -= 16 + rnd() * 14; e.flash = 1; h.flash = Math.max(h.flash, 0.3);
          this.fx('spark', e.x, e.y + 0.4, e.z, 1);
          h.state = ST.IDLE; h.charge = false;
        } else {
          h.tx = e.x; h.tz = e.z; h.state = ST.WALK; h.charge = true;
        }
        return;
      }
    }
    if (h.age < 16) { this._wander(h, 6); return; }
    const cap = 4 + tr.houses * 4;
    const needHouse = tr.pop + 1 >= 3 + tr.houses * 4;
    if (h.cd <= 0 && tr.pop < cap && h.age > 20 && h.age < h.life * 0.65 && this.humans.length < MAXHUM) {
      const m = this._nearest(h, 2.6, 1);
      if (m) { this._birth(h, m); return; }
      if (rnd() < 0.35) {
        const m2 = this._nearest(h, 14, 1);
        if (m2) { h.tx = m2.x; h.tz = m2.z; h.state = ST.WALK; h.charge = false; return; }
      }
    }
    if (h.wood >= 3 && needHouse && tr.building < 1 + Math.floor(tr.pop / 6)) {
      const cell = this._findBuildSpot(tr, h);
      if (cell >= 0) {
        h.buildCell = cell; tr.building++;
        h.tx = (cell % N) - HALF + 0.5; h.tz = ((cell / N) | 0) - HALF + 0.5;
        h.state = ST.BUILDWALK; return;
      }
    }
    if (h.wood < 3 && (needHouse || rnd() < 0.2)) {
      const c = this._findTree(h, 14);
      if (c >= 0) {
        h.chopCell = c;
        h.tx = (c % N) - HALF + 0.5 + (rnd() - 0.5) * 0.5; h.tz = ((c / N) | 0) - HALF + 0.5 + (rnd() - 0.5) * 0.5;
        h.state = ST.CHOPWALK; return;
      }
    }
    this._wander(h, 8);
  }

  _updateHumans(dt) {
    const hs = this.humans;
    for (let i = 0; i < hs.length; i++) {
      const h = hs[i]; if (h.dead) continue;
      h.age += dt; h.cd -= dt; h.moving = false;
      if (h.flash > 0) h.flash = Math.max(0, h.flash - dt * 3);
      if (h.age > h.life) { this._kill(h, 'age'); continue; }
      const cell = (((h.z + HALF) | 0) * N) + ((h.x + HALF) | 0);
      if (this.soil[cell] === SOIL.LAVA) { this._kill(h, 'burn'); continue; }
      if (this.fire[cell] > 0) { h.hp -= 90 * dt; h.fxT += dt; if (h.fxT > 0.2) { h.fxT = 0; this.fx('smoke', h.x, h.y + 0.5, h.z, 1); } }
      const gh = this.getHeight(h.x, h.z);
      h.y = gh;
      if (gh < SEA - 0.15) h.hp -= 70 * dt;
      if (h.hp <= 0) { this._kill(h, gh < SEA - 0.15 ? 'drown' : 'hit'); continue; }
      h.think -= dt;
      switch (h.state) {
        case ST.IDLE:
          if (h.think <= 0) this._think(h);
          break;
        case ST.WALK: {
          if (this.war && h.think <= 0) { h.think = 0.5; if (h.age >= 16 && this._nearest(h, 3, 0)) { this._think(h); break; } }
          const r = this._move(h, dt);
          if (r !== 0) { h.state = ST.IDLE; h.think = h.charge ? 0.05 : 0.3 + rnd() * 2; }
          break;
        }
        case ST.CHOPWALK: {
          const r = this._move(h, dt);
          if (r === 1) { h.state = ST.CHOP; h.timer = 1.5 + rnd(); h.fxT = 0; }
          else if (r < 0) { h.state = ST.IDLE; h.think = 0.3; }
          break;
        }
        case ST.CHOP:
          h.timer -= dt; h.fxT += dt;
          if (h.fxT > 0.35) { h.fxT = 0; this.fx('chips', h.x, h.y + 0.4, h.z, 1); }
          if (!this.treeT[h.chopCell] || this.fire[h.chopCell] > 0) { h.state = ST.IDLE; h.think = 0.2; }
          else if (h.timer <= 0) {
            this.removeTree(h.chopCell); h.wood++; h.chopCell = -1;
            this.fx('puff', h.x, h.y + 0.4, h.z, 1);
            h.state = ST.IDLE; h.think = 0.2;
          }
          break;
        case ST.BUILDWALK: {
          const r = this._move(h, dt);
          if (r === 1) { h.state = ST.BUILD; h.timer = 2.4; h.fxT = 0; }
          else if (r < 0) { this._cancelBuild(h); }
          break;
        }
        case ST.BUILD: {
          h.timer -= dt; h.fxT += dt;
          if (h.fxT > 0.3) { h.fxT = 0; this.fx('dust', h.x, h.y + 0.2, h.z, 1); }
          const c = h.buildCell;
          if (c < 0 || this.houseAt[c] >= 0 || this.fire[c] > 0 || this.cellH(c % N, (c / N) | 0) < SEA + 0.8) { this._cancelBuild(h); break; }
          if (h.timer <= 0) {
            this.createHouse(c, h.tribe, false);
            const tr = this.tribes[h.tribe]; tr.building = Math.max(0, tr.building - 1);
            h.buildCell = -1; h.wood -= 3;
            this.fx('puff', h.x, h.y + 0.5, h.z, 1);
            h.state = ST.IDLE; h.think = 0.5;
          }
          break;
        }
      }
      this._unstick(h, dt);
    }
    // ölüleri temizle
    let w = 0;
    for (let i = 0; i < hs.length; i++) if (!hs[i].dead) hs[w++] = hs[i];
    hs.length = w;
  }
  _cancelBuild(h) {
    const tr = this.tribes[h.tribe];
    if (h.buildCell >= 0) tr.building = Math.max(0, tr.building - 1);
    h.buildCell = -1; h.state = ST.IDLE; h.think = 0.4;
  }

  // ---------------------------------------------------------------- yangın & doğa
  _updateFire(dt) {
    const b = this.burning;
    for (let k = b.length - 1; k >= 0; k--) {
      const cell = b[k]; let f = this.fire[cell] - dt * (this.raining ? 4 : 1);
      const cx = cell % N, cz = (cell / N) | 0;
      const x = cx - HALF + 0.5, z = cz - HALF + 0.5;
      const y = this.cellH(cx, cz);
      this.fx('fire', x, y, z, dt);
      if (!this.raining && f > 0) {
        const nbs = [cell - 1, cell + 1, cell - N, cell + N];
        for (let q = 0; q < 4; q++) {
          const nb = nbs[q];
          if (nb < 0 || nb >= N * N || (q < 2 && ((nb / N) | 0) !== cz)) continue;
          if ((this.treeT[nb] || this.houseAt[nb] >= 0) && this.fire[nb] <= 0 && rnd() < dt * 0.9) this.ignite(nb);
        }
      }
      if (f <= 0) {
        this.fire[cell] = 0;
        if (this.treeT[cell]) this.removeTree(cell);
        if (this.houseAt[cell] >= 0) this.destroyHouse(this.houseAt[cell]);
        if (y > SEA + 0.3 && this.soil[cell] !== SOIL.LAVA && this.soil[cell] !== SOIL.SNOW) this.soil[cell] = SOIL.ASH;
        this.markCell(cx, cz);
        b[k] = b[b.length - 1]; b.pop();
      } else this.fire[cell] = f;
    }
  }
  _natureTick() {
    const soil = this.soil;
    for (let k = 0; k < 500; k++) {
      const cell = (rnd() * N * N) | 0, s = soil[cell];
      const cx = cell % N, cz = (cell / N) | 0;
      if (s === SOIL.ASH) {
        if (rnd() < 0.35) { soil[cell] = this.cellH(cx, cz) < 0.9 ? SOIL.SAND : SOIL.GRASS; this.markCell(cx, cz); }
      } else if (s === SOIL.LAVA) {
        if (rnd() < 0.4) { soil[cell] = SOIL.ROCK; this.markCell(cx, cz); }
        else if (cx > 1 && cz > 1 && cx < N - 2 && cz < N - 2) {
          const nb = cell + [1, -1, N, -N][(rnd() * 4) | 0];
          if (this.treeT[nb] && rnd() < 0.3) this.ignite(nb);
        }
      } else if (s === SOIL.GRASS && !this.treeT[cell] && this.houseAt[cell] < 0 && this.fire[cell] <= 0 &&
                 this.treeCount < MAXTREE && cx > 1 && cz > 1 && cx < N - 2 && cz < N - 2) {
        const h = this.cellH(cx, cz);
        if (h < 1.0 || h > 10) continue;
        const nb = cell + [1, -1, N, -N, N + 1, -N - 1, N - 1, 1 - N][(rnd() * 8) | 0];
        if (this.treeT[nb] && rnd() < (this.raining ? 0.15 : 0.05)) {
          this.setTree(cell, h > 6.5 ? 2 : this.treeT[nb], 0.8 + rnd() * 0.55, this.simTime);
        }
      }
    }
  }

  // ---------------------------------------------------------------- kayıt sistemi
  // Dünya, JSON'a yazılabilir sıkıştırılmış bir nesneye çevrilir (diziler base64).
  serialize() {
    const NN = N * N, H = this.H;
    const H16 = new Int16Array(VN * VN);
    for (let i = 0; i < H16.length; i++) H16[i] = Math.round(clamp(H[i], -30, 30) * 1000);
    let nt = 0;
    for (let c = 0; c < NN; c++) if (this.treeT[c]) nt++;
    const tc = new Uint16Array(nt), tt = new Uint8Array(nt), ts = new Uint8Array(nt), tb = new Float32Array(nt);
    for (let c = 0, k = 0; c < NN; c++) if (this.treeT[c]) {
      tc[k] = c; tt[k] = this.treeT[c]; ts[k] = Math.round(clamp(this.treeS[c], 0, 2.5) * 100); tb[k] = this.treeBorn[c]; k++;
    }
    const bc = new Uint16Array(this.burning.length), bv = new Float32Array(this.burning.length);
    this.burning.forEach((c, k) => { bc[k] = c; bv[k] = this.fire[c]; });
    const r3 = v => Math.round(v * 1000) / 1000;
    const humans = [];
    for (const h of this.humans) if (!h.dead) humans.push([
      r3(h.x), r3(h.z), r3(h.tx), r3(h.tz), h.state, r3(h.timer), h.tribe, r3(h.age), r3(h.life), r3(h.hp),
      h.wood, r3(h.cd), r3(h.ang), r3(h.phase), h.skin, h.chopCell, h.buildCell, h.charge ? 1 : 0,
    ]);
    return {
      v: 1, simTime: this.simTime, raining: this.raining, war: this.war,
      H: _b64enc(H16), soil: _b64enc(this.soil), auto: _b64enc(this.auto),
      tc: _b64enc(tc), tt: _b64enc(tt), ts: _b64enc(ts), tb: _b64enc(tb), bc: _b64enc(bc), bv: _b64enc(bv),
      humans,
      houses: this.houses.map(o => [o.cell, o.tribe, r3(o.rot), r3(o.prog)]),
      tribes: this.tribes.map(t => [t.cx, t.cz]),
    };
  }
  // Başarılıysa true. Hatalı/eksik veride dünyaya dokunmadan false döner.
  deserialize(d) {
    try {
      if (!d || d.v !== 1) return false;
      const NN = N * N;
      const H16 = _b64dec(d.H, Int16Array), soil = _b64dec(d.soil, Uint8Array), auto = _b64dec(d.auto, Uint8Array);
      const tc = _b64dec(d.tc, Uint16Array), tt = _b64dec(d.tt, Uint8Array), ts = _b64dec(d.ts, Uint8Array);
      const tb = _b64dec(d.tb, Float32Array), bc = _b64dec(d.bc, Uint16Array), bv = _b64dec(d.bv, Float32Array);
      if (H16.length !== VN * VN || soil.length !== NN || auto.length !== NN) return false;
      if (tt.length !== tc.length || ts.length !== tc.length || tb.length !== tc.length || bv.length !== bc.length) return false;

      for (let i = 0; i < H16.length; i++) this.H[i] = H16[i] / 1000;
      this.soil.set(soil); this.auto.set(auto);
      this.treeT.fill(0); this.treeS.fill(0); this.treeBorn.fill(0); this.treeCount = 0;
      for (let k = 0; k < tc.length; k++) if (tc[k] < NN) {
        this.treeT[tc[k]] = tt[k]; this.treeS[tc[k]] = ts[k] / 100; this.treeBorn[tc[k]] = tb[k]; this.treeCount++;
      }
      this.fire.fill(0); this.burning.length = 0;
      for (let k = 0; k < bc.length; k++) if (bc[k] < NN) { this.fire[bc[k]] = bv[k]; this.burning.push(bc[k]); }

      this.simTime = +d.simTime || 0; this.natAcc = 0;
      this.raining = !!d.raining; this.war = d.war !== false;
      this.tribes.length = 0;
      for (let i = 0; i < d.tribes.length && i < MAXTRIBE; i++)
        this.tribes.push({ id: i, pop: 0, houses: 0, building: 0, cx: d.tribes[i][0], cz: d.tribes[i][1] });

      this.houses.length = 0; this.houseAt.fill(-1);
      for (const [cell, tribe, rot, prog] of d.houses) {
        if (cell < 0 || cell >= NN || !this.tribes[tribe] || this.houses.length >= MAXHOUSE) continue;
        const cx = cell % N, cz = (cell / N) | 0;
        this.houses.push({ x: cx - HALF + 0.5, z: cz - HALF + 0.5, y: this.cellH(cx, cz), cell, tribe, rot, prog });
        this.houseAt[cell] = this.houses.length - 1;
        this.tribes[tribe].houses++;
      }

      this.humans.length = 0;
      for (const a of d.humans) {
        if (this.humans.length >= MAXHUM || !this.tribes[a[6]]) continue;
        const h = {
          x: a[0], z: a[1], y: this.getHeight(a[0], a[1]), tx: a[2], tz: a[3], state: a[4], timer: a[5], tribe: a[6],
          age: a[7], life: a[8], hp: a[9], wood: a[10], cd: a[11], ang: a[12], phase: a[13], think: Math.random() * 0.8,
          flash: 0, moving: false, skin: a[14], dead: false, chopCell: a[15], buildCell: a[16], charge: !!a[17], fxT: 0,
        };
        this.humans.push(h);
        const tr = this.tribes[h.tribe]; tr.pop++;
        if (h.buildCell >= 0) tr.building++;
      }
      for (const t of this.tribes) this._recenter(t);

      this.bHead.fill(-1);
      this.chunkDirty.fill(1); this.treesDirty = true; this.waterDirty = true;
      return true;
    } catch (e) { console.warn('Kayıt okunamadı', e); return false; }
  }

  update(dt) {
    this.simTime += dt;
    this._buildHash();
    this._updateHumans(dt);
    for (const o of this.houses) if (o.prog < 1) o.prog = Math.min(1, o.prog + dt / 0.7);
    this._updateFire(dt);
    this.natAcc += dt;
    if (this.natAcc >= 0.5) { this.natAcc = 0; this._natureTick(); }
  }
}
