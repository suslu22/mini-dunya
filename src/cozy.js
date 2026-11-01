// Mini Dünya - Ada Modu mantığı (render'dan bağımsız).
// Adayı üretir; oyuncu, araçlar, balık/böcek/fosil, dükkân, yapım, köylüler ve ada puanı burada.
import { N, HALF, SEA, SOIL, hash2 } from './sim.js';

const zclamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const zsm = (a, b, x) => { const t = zclamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const zrnd = Math.random;
const zpick = (a) => a[(zrnd() * a.length) | 0];
const zrange = (a, b) => a + zrnd() * (b - a);
const zang = (a, b, k) => { let d = b - a; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; return a + d * k; };
const zhours = (h, r) => (r[0] <= r[1] ? h >= r[0] && h < r[1] : h >= r[0] || h < r[1]);

function zvn(x, y, s) {
  const x0 = Math.floor(x), y0 = Math.floor(y), fx = x - x0, fy = y - y0;
  const u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
  const a = hash2(x0, y0, s), b = hash2(x0 + 1, y0, s), c = hash2(x0, y0 + 1, s), d = hash2(x0 + 1, y0 + 1, s);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
function zfbm(x, y, s, o = 4) {
  let a = 1, f = 1, t = 0, n = 0;
  for (let i = 0; i < o; i++) { n += zvn(x * f, y * f, s + i * 17) * a; t += a; a *= 0.5; f *= 2.03; }
  return n / t;
}

export const Z_ISLE = 50;
export const Z_BAG_MAX = 30;
export const Z_TOOLS = [
  { id: 'hand', n: 'Eller', i: '✋', m: '' },
  { id: 'axe', n: 'Balta', i: '🪓', m: 'axe' },
  { id: 'shovel', n: 'Kürek', i: '⛏️', m: 'shovel' },
  { id: 'rod', n: 'Olta', i: '🎣', m: 'rod' },
  { id: 'net', n: 'Böcek Ağı', i: '🥅', m: 'net' },
  { id: 'can', n: 'Sulama Kovası', i: '💧', m: 'can' },
];
export const Z_FLOWERS = [
  { n: 'Lale', col: '#ff4f6d' }, { n: 'Papatya', col: '#ffffff' }, { n: 'Nergis', col: '#ffd93b' },
  { n: 'Sümbül', col: '#b58cff' }, { n: 'Gül', col: '#e8222f' }, { n: 'Unutmabeni', col: '#6aa8ff' },
];
export const Z_TREES = {
  oak: { n: 'Meşe', t: 1 }, pine: { n: 'Çam', t: 2 },
  apple: { n: 'Elma Ağacı', t: 1, fruit: 'apple', col: '#e23b3b' },
  orange: { n: 'Portakal Ağacı', t: 1, fruit: 'orange', col: '#ff9a1f' },
  cherry: { n: 'Kiraz Ağacı', t: 1, fruit: 'cherry', col: '#c4122f' },
};
export const Z_FISH = [
  { id: 'hamsi', n: 'Hamsi', i: '🐟', sell: 120, w: 10, h: [0, 24] },
  { id: 'istavrit', n: 'İstavrit', i: '🐟', sell: 160, w: 8, h: [5, 22] },
  { id: 'sazan', n: 'Sazan', i: '🐠', sell: 220, w: 7, h: [4, 21] },
  { id: 'kefal', n: 'Kefal', i: '🐟', sell: 280, w: 6, h: [8, 20] },
  { id: 'cipura', n: 'Çipura', i: '🐠', sell: 520, w: 4, h: [9, 17] },
  { id: 'levrek', n: 'Levrek', i: '🐟', sell: 480, w: 4, h: [16, 6] },
  { id: 'lufer', n: 'Lüfer', i: '🐡', sell: 700, w: 3, h: [18, 5] },
  { id: 'mercan', n: 'Mercan', i: '🐠', sell: 900, w: 2, h: [6, 12] },
  { id: 'ton', n: 'Ton Balığı', i: '🐟', sell: 2800, w: 1, h: [4, 9] },
  { id: 'kilic', n: 'Kılıç Balığı', i: '🐡', sell: 4200, w: 0.6, h: [16, 4] },
  { id: 'cizme', n: 'Eski Çizme', i: '🥾', sell: 10, w: 2.5, h: [0, 24], junk: 1 },
  { id: 'teneke', n: 'Teneke Kutu', i: '🥫', sell: 5, w: 2.5, h: [0, 24], junk: 1 },
];
export const Z_BUGS = [
  { id: 'kelebek', n: 'Kelebek', i: '🦋', sell: 160, w: 8, h: [6, 19], fly: 1 },
  { id: 'ugur', n: 'Uğur Böceği', i: '🐞', sell: 200, w: 5, h: [6, 18] },
  { id: 'cekirge', n: 'Çekirge', i: '🦗', sell: 160, w: 6, h: [6, 19], hop: 1 },
  { id: 'karinca', n: 'Karınca', i: '🐜', sell: 80, w: 6, h: [0, 24] },
  { id: 'gece', n: 'Gece Kelebeği', i: '🦋', sell: 130, w: 6, h: [19, 4], fly: 1 },
  { id: 'atesboc', n: 'Ateş Böceği', i: '✨', sell: 300, w: 5, h: [19, 4], fly: 1, glow: 1 },
  { id: 'circir', n: 'Cırcır Böceği', i: '🦗', sell: 130, w: 5, h: [18, 8], hop: 1 },
  { id: 'gergedan', n: 'Gergedan Böceği', i: '🪲', sell: 800, w: 1.5, h: [8, 18] },
];
export const Z_FOSSILS = [
  { n: 'Trilobit', i: '🐚', sell: 1100 }, { n: 'Ammonit', i: '🌀', sell: 1400 }, { n: 'Dev Diş', i: '🦷', sell: 1800 },
  { n: 'Kehribar', i: '🟠', sell: 1200 }, { n: 'Dinozor Kemiği', i: '🦴', sell: 2600 }, { n: 'Kafatası', i: '💀', sell: 3300 },
];
export const Z_FURN = {
  bench: { n: 'Bank', i: '🪑', buy: 800, r: 0.6 },
  table: { n: 'Masa', i: '🍽️', buy: 900, r: 0.6 },
  chair: { n: 'Sandalye', i: '💺', buy: 400, r: 0.35 },
  lamp: { n: 'Sokak Lambası', i: '🏮', buy: 1200, r: 0.25, light: 1 },
  campfire: { n: 'Kamp Ateşi', i: '🔥', buy: 600, r: 0.45, light: 1.25 },
  umbrella: { n: 'Şemsiye', i: '⛱️', buy: 700, r: 0.3 },
  fence: { n: 'Çit', i: '🚧', buy: 200, r: 0.5 },
  pot: { n: 'Saksı', i: '🪴', buy: 300, r: 0.3 },
  fountain: { n: 'Çeşme', i: '⛲', buy: 3200, r: 0.9 },
  rug: { n: 'Halı', i: '🟫', buy: 500, r: 0, flat: 1 },
};
export const Z_RECIPES = [
  { out: 'f_chair', need: { wood: 3 } }, { out: 'f_bench', need: { wood: 5 } }, { out: 'f_table', need: { wood: 6 } },
  { out: 'f_fence', n: 2, need: { wood: 2 } }, { out: 'f_campfire', need: { wood: 3, stone: 2 } }, { out: 'f_pot', need: { clay: 4 } },
  { out: 'f_lamp', need: { iron: 2, wood: 2 } }, { out: 'f_rug', need: { weed: 10 } }, { out: 'f_umbrella', need: { wood: 3, weed: 5 } },
  { out: 'f_fountain', need: { stone: 10, clay: 5 } },
];
export const Z_ITEMS = {};
const zit = (id, n, i, sell, ex) => { Z_ITEMS[id] = Object.assign({ id, n, i, sell }, ex); };
zit('wood', 'Odun', '🪵', 60); zit('stone', 'Taş', '🪨', 75); zit('clay', 'Kil', '🧱', 60); zit('iron', 'Demir', '🔩', 150);
zit('gold', 'Altın Parçası', '🥇', 2500); zit('weed', 'Yabani Ot', '🌿', 8);
zit('apple', 'Elma', '🍎', 100, { eat: 1 }); zit('orange', 'Portakal', '🍊', 100, { eat: 1 }); zit('cherry', 'Kiraz', '🍒', 100, { eat: 1 });
zit('shell', 'Deniz Kabuğu', '🐚', 90); zit('oyster', 'İstiridye', '🦪', 140);
Z_FLOWERS.forEach((f, k) => {
  zit('seed_' + k, f.n + ' Tohumu', '🌱', 20, { buy: 80, plant: k });
  zit('flw_' + k, f.n, '🌷', 120, { flower: k });
});
for (const k of Object.keys(Z_TREES)) {
  const T = Z_TREES[k], fr = !!T.fruit;
  zit('sap_' + k, T.n.replace(' Ağacı', '') + ' Fidanı', '🌳', fr ? 120 : 40, { buy: fr ? 450 : 150, sap: k });
}
Z_FISH.forEach((f) => zit('fish_' + f.id, f.n, f.i, f.sell, { cat: 'fish', fid: f.id }));
Z_BUGS.forEach((f) => zit('bug_' + f.id, f.n, f.i, f.sell, { cat: 'bug', fid: f.id }));
Z_FOSSILS.forEach((f, k) => zit('fos_' + k, f.n, f.i, f.sell, { cat: 'fos', fid: k }));
for (const k of Object.keys(Z_FURN)) zit('f_' + k, Z_FURN[k].n, Z_FURN[k].i, Math.round(Z_FURN[k].buy / 4), { buy: Z_FURN[k].buy, furn: k });

const Z_VILL = [
  { name: 'Defne', female: true, pers: 'neşeli', fav: 'flower', look: { skin: '#f1c8a0', hair: '#6b3a1e', hs: 3, outfit: 2, shirt: '#ff8fb1', pants: '#4d5b8c', hat: 0 } },
  { name: 'Kerem', female: false, pers: 'tembel', fav: 'fish', look: { skin: '#e0ac80', hair: '#2a1a10', hs: 0, outfit: 0, shirt: '#5aa86a', pants: '#3a3f55', hat: 1, hatCol: '#c9503c' } },
  { name: 'Nermin', female: true, pers: 'sevecen', fav: 'fruit', look: { skin: '#e8b48a', hair: '#cfcfd6', hs: 3, outfit: 1, shirt: '#a77bd6', pants: '#5a4632', hat: 0 } },
  { name: 'Berkin', female: false, pers: 'huysuz', fav: 'bug', look: { skin: '#c98f65', hair: '#1c1410', hs: 4, outfit: 3, shirt: '#e8a23c', pants: '#2f4f7a', hat: 3, hatCol: '#3b6ea8' } },
  { name: 'Selin', female: true, pers: 'maceracı', fav: 'fos', look: { skin: '#8f5c3b', hair: '#241812', hs: 6, outfit: 0, shirt: '#3fb8c0', pants: '#6b4a2e', hat: 2, hatCol: '#e8d28a' } },
];
const Z_TALK = {
  neşeli: ['Bugün hava ne kadar güzel! Adada her gün tatil gibi.', 'Çiçekleri çok seviyorum! Sen de dikiyorsun, duydum.', 'Bir ara pikniğe çıkalım mı? Ben yemişleri getiririm!'],
  tembel: ['Hımm… Bugün çok yoruldum. Aslında hiçbir şey yapmadım.', 'Balık tutmak gibisi yok. Sadece otur, bekle…', 'Uykum geldi. Ama önce bir şeyler atıştırsam…'],
  sevecen: ['Hoş geldin canım! Aç mısın? Bir şeyler hazırlayayım mı?', 'Adayı ne kadar güzelleştirdin, gurur duydum!', 'Bahçende yeni çiçekler gördüm, çok sevindim.'],
  huysuz: ['Hmph. Yine mi sen? Neyse… selam.', 'Şu böcekler beni deli ediyor. Hiçbir faydaları yok!', 'Çit yok, yol yok… Bu adaya biraz düzen lazım.'],
  maceracı: ['Dün kıyıda garip bir iz gördüm. Fosil olabilir, kürek al!', 'Haritada hâlâ keşfedilmemiş yerler var, hissediyorum.', 'Seninle ada turu atmaya ne dersin?'],
};
export const Z_SHOP_OPEN = [7, 22];

export class Cozy {
  constructor(world) {
    this.world = world;
    this.events = [];
    this.mv = { x: 0, z: 0 }; this.run = false; this.lockAng = false; this.freeze = false;
    this.path = []; this.pathAct = false;
    this._reset();
  }
  _reset() {
    this.seed = 1; this.day = 1; this.hour = 8; this.zil = 2000;
    this.name = 'Ada Sakini';
    this.look = Cozy.defaultLook();
    this.p = { x: 0, z: 8, y: 0, ang: 0, vx: 0, vz: 0, tool: 0, held: null, moving: false, speed: 0, act: null, fish: null, stuck: 0 };
    this.bag = {}; this.obj = new Map(); this.trees = new Map(); this.bugs = []; this.vill = []; this.builds = [];
    this.seen = { fish: {}, bug: {}, fos: {} };
    this.stats = { fish: 0, bugs: 0, fos: 0, trees: 0, planted: 0, earned: 0 };
    this.stock = []; this.rainDay = false; this.rainSpan = [0, 0]; this.rainNow = false; this.rainWet = false;
    this.reserved = new Set(); this.path = []; this.pathAct = false; this.stars = 1; this.score = 0; this._tick = 0; this._bugT = 0; this._sleepReq = false; this._id = 1;
  }
  static defaultLook() {
    return { female: false, skin: '#e8b48a', hair: '#3a2415', hs: 0, outfit: 0, shirt: '#e0553d', pants: '#3a4a6e', hat: 0, hatCol: '#c9503c', shoe: '#3b2a1c', eye: '#2a1a10' };
  }
  ev(e) { this.events.push(e); if (this.events.length > 300) this.events.shift(); }
  say(msg) { this.ev({ t: 'say', msg }); }

  /* ---------------------------------------------------------------- yerleşim */
  _layout() {
    const b = (t, id, x, z, hx, hz, extra) => Object.assign({ t, id, x, z, hx, hz, door: { x, z: z + hz + 0.9 } }, extra);
    this.builds = [
      b('home', 'home', -13, -9, 2.0, 1.7, { wall: '#f1e3c6', roof: '#d8574b' }),
      b('shop', 'shop', 11, -7, 2.6, 2.0, { wall: '#9fd4c4', roof: '#e8b13c' }),
      b('board', 'board', 0, 1, 0.5, 0.2, { door: { x: 0, z: 2.2 } }),
      b('craft', 'craft', 5, 3.5, 0.9, 0.5, { door: { x: 5, z: 5 } }),
      b('vhome', 'v0', -28, 4, 1.6, 1.5, { vi: 0, wall: '#f4d6e0', roof: '#7a5ac7' }),
      b('vhome', 'v1', 24, 9, 1.6, 1.5, { vi: 1, wall: '#d6e8f4', roof: '#3f8a5a' }),
      b('vhome', 'v2', 3, 25, 1.6, 1.5, { vi: 2, wall: '#f6ecc8', roof: '#c25a3c' }),
      b('vhome', 'v3', -8, -26, 1.6, 1.5, { vi: 3, wall: '#e0d4c0', roof: '#3a5f9c' }),
      b('vhome', 'v4', -30, -18, 1.6, 1.5, { vi: 4, wall: '#cfeaf0', roof: '#d19b2a' }),
    ];
    this.lampPosts = [[-3, 4], [6, 6], [-9, -4], [8, -2]];
  }
  _flatten(cx, cz, r1, r2, lv) {
    const H = this.world.H, VN = N + 1;
    for (let vz = Math.max(0, Math.floor(cz + HALF - r2)); vz <= Math.min(N, Math.ceil(cz + HALF + r2)); vz++)
      for (let vx = Math.max(0, Math.floor(cx + HALF - r2)); vx <= Math.min(N, Math.ceil(cx + HALF + r2)); vx++) {
        const d = Math.hypot(vx - HALF - cx, vz - HALF - cz);
        if (d >= r2) continue;
        const k = 1 - zsm(r1, r2, d), i = vz * VN + vx;
        H[i] += (lv - H[i]) * k;
      }
  }
  // bina çevresi, meydan ve yollar: ağaç/ot/ekim yapılmayan hücreler (paint: yolları toprak boya)
  _reserve(paint) {
    const W = this.world;
    this.reserved.clear();
    const res = (x, z, r) => {
      for (let cz = Math.floor(z + HALF - r); cz <= Math.ceil(z + HALF + r); cz++) for (let cx = Math.floor(x + HALF - r); cx <= Math.ceil(x + HALF + r); cx++)
        if (cx >= 0 && cz >= 0 && cx < N && cz < N && Math.hypot(cx + 0.5 - HALF - x, cz + 0.5 - HALF - z) <= r) this.reserved.add(cz * N + cx);
    };
    for (const b of this.builds) res(b.x, b.z, Math.max(b.hx, b.hz) + 2.2);
    res(2, 2, 5);
    const path = (ax, az, bx, bz) => {
      const n = Math.ceil(Math.hypot(bx - ax, bz - az) / 0.6);
      for (let i = 0; i <= n; i++) { const x = ax + (bx - ax) * i / n, z = az + (bz - az) * i / n; if (paint) W.paintSoil(SOIL.DIRT, x, z, 0.85); res(x, z, 1.4); }
    };
    for (const b of this.builds) if (b.t !== 'board' && b.t !== 'craft') path(b.door.x, b.door.z + 0.6, 2, 3);
    if (paint) W.paintSoil(SOIL.DIRT, 2, 2, 4.2);
  }
  generate(seed) {
    const W = this.world, VN = N + 1, H = W.H, s1 = seed | 0;
    W.humans.length = 0; W.houses.length = 0; W.tribes.length = 0; W.burning.length = 0;
    W.houseAt.fill(-1); W.fire.fill(0); W.treeT.fill(0); W.treeCount = 0; W.auto.fill(1); W.simTime = 0; W.raining = false;
    for (let vz = 0; vz < VN; vz++) for (let vx = 0; vx < VN; vx++) {
      const x = vx - HALF, z = vz - HALF;
      const wob = zfbm(x * 0.045 + 3.3, z * 0.045 + 1.7, s1, 3) - 0.5;
      const rr = Math.hypot(x, z) / (Z_ISLE * (1 + wob * 0.55));
      let h = 2.2 - 5.5 * zsm(0.62, 1.05, rr) - 4.5 * zsm(1.0, 1.7, rr);
      const land = 1 - zsm(0.7, 0.95, rr);
      h += (zfbm(x * 0.07, z * 0.07, s1 + 5, 3) - 0.5) * 1.1 * land;
      h += 3.2 * Math.exp(-(((x - 19) ** 2 + (z + 20) ** 2) / 90));
      h -= 3.8 * Math.exp(-(((x + 20) ** 2 + (z - 17) ** 2) / 60)) * land;
      H[vz * VN + vx] = zclamp(h, -10, 24);
    }
    this._layout();
    for (const b of this.builds) {
      if (b.t === 'board' || b.t === 'craft') continue;
      b.lv = zclamp(W.getHeight(b.x, b.z), 1.5, 3.4);
      this._flatten(b.x, b.z, Math.max(b.hx, b.hz) + 2.4, Math.max(b.hx, b.hz) + 6, b.lv);
    }
    this._flatten(2, 2, 7, 12, 2.1);
    for (const b of this.builds) b.y = W.getHeight(b.x, b.z);
    for (let c = 0; c < N * N; c++) { W.soil[c] = SOIL.GRASS; W.classify(c, W.cellH(c % N, (c / N) | 0)); }
    this._reserve(true);
    // ağaçlar
    const spots = [];
    for (let k = 0; k < 3; k++) {   // meyve koruları
      const a = zrnd() * 6.28, d = 14 + zrnd() * 12;
      spots.push({ x: Math.cos(a) * d, z: Math.sin(a) * d, kind: ['apple', 'orange', 'cherry'][k] });
    }
    for (let cz = 2; cz < N - 2; cz++) for (let cx = 2; cx < N - 2; cx++) {
      const c = cz * N + cx;
      if (W.soil[c] !== SOIL.GRASS || this.reserved.has(c)) continue;
      const h = W.cellH(cx, cz);
      if (h < 1.2 || h > 6 || W.cellRange(cx, cz) > 0.8) continue;
      const f = zfbm(cx * 0.06 + 9, cz * 0.06 + 4, s1 + 9, 3), dens = zsm(0.5, 0.68, f) * 0.3 + 0.006;
      if (hash2(cx, cz, s1) < dens) {
        const pine = h > 3.6 || (f > 0.62 && hash2(cx, cz, 9) < 0.4);
        const kind = pine ? 'pine' : 'oak';
        W.setTree(c, Z_TREES[kind].t, 0.85 + hash2(cx, cz, 5) * 0.5, -1000);
        this.trees.set(c, { k: kind, hp: 3, fruit: 0, reg: 0 });
      }
    }
    for (const g of spots) {
      let made = 0;
      for (let t = 0; t < 40 && made < 5; t++) {
        const cx = Math.floor(g.x + HALF + zrange(-4, 4)), cz = Math.floor(g.z + HALF + zrange(-4, 4)), c = cz * N + cx;
        if (cx < 2 || cz < 2 || cx >= N - 2 || cz >= N - 2 || this.reserved.has(c) || W.soil[c] !== SOIL.GRASS) continue;
        if (W.cellH(cx, cz) < 1.3 || W.cellRange(cx, cz) > 0.8) continue;
        if (W.treeT[c]) { W.removeTree(c); this.trees.delete(c); }
        W.setTree(c, 1, 0.95 + zrnd() * 0.3, -1000);
        this.trees.set(c, { k: g.kind, hp: 3, fruit: 3, reg: 0 });
        made++;
      }
    }
    W.waterDirty = true; W.treesDirty = true; W.chunkDirty.fill(1);
  }

  /* ---------------------------------------------------------------- başlangıç */
  start(seed, look, name) {
    this._reset();
    this.seed = seed | 0; this.hour = 8;
    if (look) this.look = Object.assign(Cozy.defaultLook(), look);
    if (name) this.name = name;
    this.generate(this.seed);
    const home = this.builds[0];
    this.p.x = home.door.x + 1.5; this.p.z = home.door.z + 3; this.p.ang = Math.PI; this.p.y = this.world.getHeight(this.p.x, this.p.z);
    // ilk köylüler
    for (let i = 0; i < 3; i++) this._addVillager(i, true);
    // taş, ot, kabuk, fosil
    for (let i = 0; i < 8; i++) this._spawnObj('rock');
    for (let i = 0; i < 60; i++) this._spawnObj('weed');
    this._restock();
    this._dailySpawns();
    this._rollWeather();
    this.rating();
    this.say('Adana hoş geldin, ' + this.name + '! 🏝️');
    return { x: this.p.x, z: this.p.z };
  }

  /* ---------------------------------------------------------------- hücre yardımcıları */
  cellOf(x, z) { const cx = Math.floor(x + HALF), cz = Math.floor(z + HALF); return cx < 0 || cz < 0 || cx >= N || cz >= N ? -1 : cz * N + cx; }
  cellPos(c) { return { x: (c % N) - HALF + 0.5, z: ((c / N) | 0) - HALF + 0.5 }; }
  treePos(c) { const cx = c % N, cz = (c / N) | 0; return { x: cx - HALF + 0.5 + (hash2(cx, cz, 1) - 0.5) * 0.5, z: cz - HALF + 0.5 + (hash2(cx, cz, 2) - 0.5) * 0.5 }; }
  inBuild(x, z, r) {
    for (const b of this.builds) {
      const hx = b.hx + r + (b.t === 'vhome' || b.t === 'home' || b.t === 'shop' ? 0.1 : 0), hz = b.hz + r;
      if (Math.abs(x - b.x) < hx && Math.abs(z - b.z) < hz) return b;
    }
    return null;
  }
  blocked(x, z, r = 0.28) {
    if (x < -HALF + 3 || x > HALF - 3 || z < -HALF + 3 || z > HALF - 3) return true;
    if (this.world.getHeight(x, z) < SEA - 0.3) return true;
    if (this.inBuild(x, z, r)) return true;
    const cx = Math.floor(x + HALF), cz = Math.floor(z + HALF);
    for (let j = cz - 1; j <= cz + 1; j++) for (let i = cx - 1; i <= cx + 1; i++) {
      if (i < 0 || j < 0 || i >= N || j >= N) continue;
      const c = j * N + i;
      if (this.world.treeT[c]) { const t = this.treePos(c); if (Math.hypot(x - t.x, z - t.z) < 0.42 + r) return true; }
      const o = this.obj.get(c);
      if (o) {
        let rad = 0;
        if (o.t === 'rock') rad = 0.62; else if (o.t === 'stump') rad = 0.3; else if (o.t === 'furn') rad = Z_FURN[o.id].r;
        if (rad > 0) { const p = this.cellPos(c); if (Math.hypot(x - p.x, z - p.z) < rad + r) return true; }
      }
    }
    return false;
  }
  cellFree(cx, cz) {   // yürünebilir hücre mi (yol bulma)
    if (cx < 3 || cz < 3 || cx >= N - 3 || cz >= N - 3) return false;
    const c = cz * N + cx;
    if (this.world.cellH(cx, cz) < SEA - 0.15 || this.world.treeT[c]) return false;
    const p = this.cellPos(c);
    if (this.inBuild(p.x, p.z, 0.45)) return false;
    const o = this.obj.get(c);
    return !(o && (o.t === 'rock' || o.t === 'stump' || (o.t === 'furn' && Z_FURN[o.id].r > 0)));
  }
  lineClear(ax, az, bx, bz) {
    const n = Math.ceil(Math.hypot(bx - ax, bz - az) / 0.3);
    for (let i = 1; i < n; i++) if (this.blocked(ax + (bx - ax) * i / n, az + (bz - az) * i / n, 0.3)) return false;
    return true;
  }
  findPath(sx, sz, gx, gz) {
    let sc = this.cellOf(sx, sz), gc = this.cellOf(gx, gz);
    if (sc < 0 || gc < 0) return null;
    if (!this.cellFree(gc % N, (gc / N) | 0)) {   // hedef dolu: en yakın boş komşu
      let best = -1, bd = 1e9;
      for (let dz = -2; dz <= 2; dz++) for (let dx = -2; dx <= 2; dx++) {
        const cx = (gc % N) + dx, cz = ((gc / N) | 0) + dz;
        if (!this.cellFree(cx, cz)) continue;
        const d = Math.hypot(cx + 0.5 - HALF - gx, cz + 0.5 - HALF - gz);
        if (d < bd) { bd = d; best = cz * N + cx; }
      }
      if (best < 0) return null;
      gc = best; const q = this.cellPos(gc); gx = q.x; gz = q.z;
    }
    const prev = new Map([[sc, -1]]), qu = [sc];
    let qi = 0, found = false;
    while (qi < qu.length && qu.length < 9000) {
      const c = qu[qi++];
      if (c === gc) { found = true; break; }
      const cx = c % N, cz = (c / N) | 0;
      for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) {
        if (!dx && !dz) continue;
        const nx = cx + dx, nz = cz + dz, nc = nz * N + nx;
        if (prev.has(nc) || !this.cellFree(nx, nz)) continue;
        if (dx && dz && (!this.cellFree(cx + dx, cz) || !this.cellFree(cx, cz + dz))) continue;
        prev.set(nc, c); qu.push(nc);
      }
    }
    if (!found) return null;
    const cells = [];
    for (let c = gc; c !== -1; c = prev.get(c)) cells.push(c);
    cells.reverse();
    const pts = cells.map((c) => this.cellPos(c)); pts[0] = { x: sx, z: sz }; pts[pts.length - 1] = { x: gx, z: gz };
    const out = []; let a = 0;
    while (a < pts.length - 1) {   // ip çekme: görüş hattı açık olan en uzak noktaya git
      let b = pts.length - 1;
      while (b > a + 1 && !this.lineClear(pts[a].x, pts[a].z, pts[b].x, pts[b].z)) b--;
      out.push(pts[b]); a = b;
    }
    return out;
  }
  walkTo(x, z, thenPress) {
    const pth = this.findPath(this.p.x, this.p.z, x, z);
    if (!pth || !pth.length) { this.path = []; return false; }
    this.path = pth; this.pathAct = !!thenPress; return true;
  }

  /* ---------------------------------------------------------------- çanta & ekonomi */
  count(id) { return this.bag[id] || 0; }
  canAdd(id) { return this.bag[id] > 0 || Object.keys(this.bag).length < Z_BAG_MAX; }
  add(id, n = 1) {
    if (!this.canAdd(id)) return false;
    this.bag[id] = (this.bag[id] || 0) + n;
    const it = Z_ITEMS[id];
    if (it && it.cat) {
      const book = this.seen[it.cat], first = !book[it.fid];
      book[it.fid] = (book[it.fid] || 0) + n;
      if (first) this.say('📖 Rehbere eklendi: ' + it.n);
    }
    return true;
  }
  take(id, n = 1) {
    if (this.count(id) < n) return false;
    this.bag[id] -= n; if (this.bag[id] <= 0) { delete this.bag[id]; if (this.p.held === id) this.p.held = null; }
    return true;
  }
  give(id, n, x, z) {   // çantaya koy, doluysa yere bırak
    if (this.add(id, n)) { this.ev({ t: 'pickup', id, n, x, z }); return true; }
    for (let i = 0; i < n; i++) this.dropItem(id, x, z);
    this.say('Çantan dolu! Eşya yere düştü.');
    return false;
  }
  dropItem(id, x, z) {
    const cx0 = Math.floor(x + HALF), cz0 = Math.floor(z + HALF);
    for (let r = 0; r <= 3; r++) for (let t = 0; t < 14; t++) {
      const cx = cx0 + Math.round(zrange(-r, r)), cz = cz0 + Math.round(zrange(-r, r)), c = cz * N + cx;
      if (cx < 3 || cz < 3 || cx >= N - 3 || cz >= N - 3 || this.obj.has(c) || this.world.treeT[c]) continue;
      if (this.world.cellH(cx, cz) < SEA + 0.2) continue;
      const p = this.cellPos(c);
      if (this.inBuild(p.x, p.z, 0.2)) continue;
      this.obj.set(c, { t: 'item', id, ox: zrange(-0.2, 0.2), oz: zrange(-0.2, 0.2) });
      return true;
    }
    return false;
  }
  earn(n) { this.zil += n; this.stats.earned += Math.max(0, n); }
  shopOpen() { return zhours(this.hour, Z_SHOP_OPEN); }
  shopList() {
    const seeds = Z_FLOWERS.map((f, k) => 'seed_' + k), saps = Object.keys(Z_TREES).map((k) => 'sap_' + k);
    return { seeds, saps, furn: this.stock };
  }
  _restock() {
    const all = Object.keys(Z_FURN).map((k) => 'f_' + k);
    for (let i = all.length - 1; i > 0; i--) { const j = (zrnd() * (i + 1)) | 0; [all[i], all[j]] = [all[j], all[i]]; }
    this.stock = all.slice(0, 6);
  }
  buy(id) {
    const it = Z_ITEMS[id];
    if (!it || !it.buy) return { ok: false, msg: 'Bu satılık değil.' };
    if (this.zil < it.buy) return { ok: false, msg: 'Yeterli Zil yok!' };
    if (!this.canAdd(id)) return { ok: false, msg: 'Çantan dolu!' };
    this.zil -= it.buy; this.add(id, 1);
    return { ok: true, msg: it.i + ' ' + it.n + ' alındı (−' + it.buy + ' 🔔)' };
  }
  sell(id, n = 1) {
    const it = Z_ITEMS[id]; n = Math.min(n, this.count(id));
    if (!it || n <= 0) return 0;
    this.take(id, n); const g = it.sell * n; this.earn(g); return g;
  }
  sellAll(filter) {
    let tot = 0;
    for (const id of Object.keys(this.bag)) {
      const it = Z_ITEMS[id]; if (!it || (filter && !filter(it))) continue;
      tot += this.sell(id, this.bag[id]);
    }
    return tot;
  }
  canCraft(r) { for (const k of Object.keys(r.need)) if (this.count(k) < r.need[k]) return false; return true; }
  craft(i) {
    const r = Z_RECIPES[i]; if (!r) return { ok: false, msg: '?' };
    if (!this.canCraft(r)) return { ok: false, msg: 'Malzeme yetersiz!' };
    if (!this.canAdd(r.out)) return { ok: false, msg: 'Çantan dolu!' };
    for (const k of Object.keys(r.need)) this.take(k, r.need[k]);
    this.add(r.out, r.n || 1);
    return { ok: true, msg: Z_ITEMS[r.out].i + ' ' + Z_ITEMS[r.out].n + ' yapıldı!' };
  }
  selectTool(i) { const p = this.p; if (p.fish) return; p.tool = zclamp(i | 0, 0, Z_TOOLS.length - 1); p.held = null; }
  hold(id) {
    if (!this.count(id)) return false;
    const it = Z_ITEMS[id];
    if (it.eat) { this.take(id, 1); this.say('Mmm, ' + it.n + ' çok lezzetliydi! 😋'); this.ev({ t: 'eat' }); return true; }
    if (!(it.plant !== undefined || it.sap || it.furn)) { this.say(it.i + ' ' + it.n + ' — dükkânda satabilirsin.'); return false; }
    this.p.held = id; return true;
  }

  /* ---------------------------------------------------------------- nesneler */
  _validSpot(cx, cz, soilOk) {
    if (cx < 4 || cz < 4 || cx >= N - 4 || cz >= N - 4) return false;
    const c = cz * N + cx, W = this.world;
    if (this.obj.has(c) || W.treeT[c] || this.reserved.has(c)) return false;
    if (W.cellH(cx, cz) < 1.0 || W.cellRange(cx, cz) > 0.9) return false;
    const s = W.soil[c];
    return soilOk ? soilOk.includes(s) : s === SOIL.GRASS;
  }
  _spawnObj(t) {
    for (let k = 0; k < 40; k++) {
      const cx = 6 + ((zrnd() * (N - 12)) | 0), cz = 6 + ((zrnd() * (N - 12)) | 0);
      if (!this._validSpot(cx, cz)) continue;
      const c = cz * N + cx;
      if (t === 'rock') this.obj.set(c, { t: 'rock', hp: 6, gold: 0 });
      else if (t === 'weed') this.obj.set(c, { t: 'weed' });
      return c;
    }
    return -1;
  }
  _dailySpawns() {
    // altın taşı: bir kayada
    const rocks = [...this.obj.entries()].filter(([, o]) => o.t === 'rock');
    if (rocks.length) { for (const [, o] of rocks) o.gold = 0; zpick(rocks)[1].gold = 1; }
    // fosil çatlakları
    for (const [c, o] of [...this.obj.entries()]) if (o.t === 'fossil') this.obj.delete(c);
    for (let i = 0; i < 4; i++) {
      for (let k = 0; k < 40; k++) {
        const cx = 6 + ((zrnd() * (N - 12)) | 0), cz = 6 + ((zrnd() * (N - 12)) | 0);
        if (!this._validSpot(cx, cz, [SOIL.GRASS, SOIL.DIRT, SOIL.SAND])) continue;
        this.obj.set(cz * N + cx, { t: 'fossil', f: (zrnd() * Z_FOSSILS.length) | 0 }); break;
      }
    }
    // kıyıya kabuklar
    let shells = 0;
    for (let k = 0; k < 400 && shells < 12; k++) {
      const cx = 6 + ((zrnd() * (N - 12)) | 0), cz = 6 + ((zrnd() * (N - 12)) | 0), c = cz * N + cx, h = this.world.cellH(cx, cz);
      if (this.world.soil[c] !== SOIL.SAND || h < 0.15 || h > 0.8 || this.obj.has(c) || this.world.treeT[c]) continue;
      this.obj.set(c, { t: 'item', id: zrnd() < 0.3 ? 'oyster' : 'shell', ox: zrange(-0.2, 0.2), oz: zrange(-0.2, 0.2) }); shells++;
    }
  }
  _plantable(o) { return o.t === 'flower' || o.t === 'sap'; }

  /* ---------------------------------------------------------------- hedef & eylem */
  front(d = 1.0) { const p = this.p; return { x: p.x + Math.sin(p.ang) * d, z: p.z + Math.cos(p.ang) * d }; }
  _nearObj(x, z, r, fn) {
    let best = null, bd = r;
    const cx0 = Math.floor(x + HALF), cz0 = Math.floor(z + HALF);
    for (let j = cz0 - 1; j <= cz0 + 1; j++) for (let i = cx0 - 1; i <= cx0 + 1; i++) {
      if (i < 0 || j < 0 || i >= N || j >= N) continue;
      const c = j * N + i, o = this.obj.get(c);
      if (!o || !fn(o)) continue;
      const q = this.cellPos(c), d = Math.hypot(q.x - x, q.z - z);
      if (d < bd) { bd = d; best = { c, o, x: q.x, z: q.z, d }; }
    }
    return best;
  }
  _nearTree(x, z, r) {
    let best = null, bd = r;
    const cx0 = Math.floor(x + HALF), cz0 = Math.floor(z + HALF);
    for (let j = cz0 - 1; j <= cz0 + 1; j++) for (let i = cx0 - 1; i <= cx0 + 1; i++) {
      if (i < 0 || j < 0 || i >= N || j >= N) continue;
      const c = j * N + i;
      if (!this.world.treeT[c]) continue;
      const t = this.treePos(c), d = Math.hypot(t.x - x, t.z - z);
      if (d < bd) { bd = d; best = { c, x: t.x, z: t.z, d, meta: this.treeMeta(c) }; }
    }
    return best;
  }
  treeMeta(c) {
    let m = this.trees.get(c);
    if (!m && this.world.treeT[c]) { m = { k: this.world.treeT[c] === 2 ? 'pine' : 'oak', hp: 3, fruit: 0, reg: 0 }; this.trees.set(c, m); }
    return m;
  }
  _facingVillager() {
    const p = this.p; let best = null, bd = 2.0;
    for (const v of this.vill) {
      if (v.inside) continue;
      const dx = v.x - p.x, dz = v.z - p.z, d = Math.hypot(dx, dz);
      if (d < bd && (dx * Math.sin(p.ang) + dz * Math.cos(p.ang)) / Math.max(0.01, d) > 0.15) { bd = d; best = v; }
    }
    return best;
  }
  _waterAhead() {
    const p = this.p;
    for (let d = 1.6; d <= 5.2; d += 0.3) {
      const x = p.x + Math.sin(p.ang) * d, z = p.z + Math.cos(p.ang) * d;
      if (Math.abs(x) < HALF - 3 && Math.abs(z) < HALF - 3 && this.world.getHeight(x, z) < SEA - 0.25) return { x, z };
    }
    return null;
  }
  target() {
    const p = this.p, T = Z_TOOLS[p.tool].id, f = this.front(1.0), fc = this.cellOf(f.x, f.z);
    if (p.fish) return { kind: 'reel', text: p.fish.st === 'bite' ? 'ÇEK!' : 'Oltayı çek' };
    if (p.held) {
      const it = Z_ITEMS[p.held];
      return { kind: 'place', c: fc, text: it.i + ' ' + (it.furn ? 'Yerleştir' : 'Ek') };
    }
    const v = this._facingVillager();
    if (v) return { kind: 'talk', v, text: v.name + ' ile konuş' };
    for (const b of this.builds) {
      if (b.t === 'vhome') continue;
      if (Math.hypot(p.x - b.door.x, p.z - b.door.z) < 1.5 + (b.t === 'board' ? 0.4 : 0)) {
        return { kind: b.t, b, text: b.t === 'shop' ? 'Dükkâna gir' : b.t === 'home' ? 'Evine gir (uyu / görünüm)' : b.t === 'craft' ? 'Yapım tezgâhı' : 'Ada panosu' };
      }
    }
    const near = this._nearObj(f.x, f.z, 1.15, () => true);
    if (T === 'hand') {
      const tr = this._nearTree(f.x, f.z, 1.3);
      if (tr && near && tr.d <= near.d) return { kind: 'shake', tr, text: tr.meta && tr.meta.fruit ? 'Ağacı salla 🍎' : 'Ağacı salla' };
      if (near && near.o.t === 'weed') return { kind: 'pull', near, text: 'Otu yol' };
      if (near && near.o.t === 'flower' && near.o.stage >= 3) return { kind: 'pickflower', near, text: 'Çiçeği topla' };
      if (near && near.o.t === 'furn') return { kind: 'pickfurn', near, text: Z_FURN[near.o.id].n + ' al' };
      if (near && near.o.t === 'item') return { kind: 'pickitem', near, text: 'Yerden al' };
      if (tr) return { kind: 'shake', tr, text: tr.meta && tr.meta.fruit ? 'Ağacı salla 🍎' : 'Ağacı salla' };
      return { kind: 'wave', text: 'El salla' };
    }
    if (T === 'axe') {
      const tr = this._nearTree(f.x, f.z, 1.3);
      if (tr) return { kind: 'chop', tr, text: 'Ağaca vur' };
      return { kind: 'swing', text: 'Balta salla' };
    }
    if (T === 'shovel') {
      if (near && near.o.t === 'rock') return { kind: 'hit', near, text: 'Kayayı kır' };
      if (near && near.o.t === 'fossil') return { kind: 'fossil', near, text: 'Fosil kaz!' };
      if (near && near.o.t === 'hole') return { kind: 'fill', near, text: 'Çukuru doldur' };
      if (near && (near.o.t === 'stump' || near.o.t === 'flower' || near.o.t === 'sap')) return { kind: 'uproot', near, text: 'Kökünden sök' };
      if (near && near.o.t === 'weed') return { kind: 'pull', near, text: 'Otu yol' };
      if (fc >= 0 && !this.obj.has(fc) && !this.world.treeT[fc] && this.world.cellH(fc % N, (fc / N) | 0) > SEA + 0.4 && !this.inBuild(f.x, f.z, 0.3)) return { kind: 'dig', c: fc, text: 'Çukur kaz' };
      return { kind: 'nothing', text: '' };
    }
    if (T === 'rod') {
      const w = this._waterAhead();
      return w ? { kind: 'cast', w, text: 'Oltayı at' } : { kind: 'nothing', text: 'Burada su yok' };
    }
    if (T === 'net') return { kind: 'net', text: 'Ağı salla' };
    if (T === 'can') {
      const pl = this._nearObj(f.x, f.z, 1.5, (o) => this._plantable(o));
      return pl ? { kind: 'water', near: pl, text: 'Sula' } : { kind: 'nothing', text: 'Sulanacak bitki yok' };
    }
    return { kind: 'nothing', text: '' };
  }
  press() {
    const p = this.p;
    if (p.act || this.freeze) return null;
    const t = this.target();
    const act = (type, dur = 0.7) => { p.act = { type, t: 0, dur }; };
    switch (t.kind) {
      case 'reel': this._reel(); break;
      case 'talk': return t;
      case 'shop': case 'home': case 'craft': case 'board': return t;
      case 'place': this._place(t.c); break;
      case 'wave': act('wave', 0.9); break;
      case 'pull': {
        const n = t.near; this.obj.delete(n.c); act('pick', 0.6); this.give('weed', 1, n.x, n.z); this.ev({ t: 'puff', x: n.x, z: n.z }); break;
      }
      case 'pickflower': {
        const n = t.near; this.obj.delete(n.c); act('pick', 0.6); this.give('flw_' + n.o.k, 1, n.x, n.z); break;
      }
      case 'pickfurn': {
        const n = t.near; this.obj.delete(n.c); act('pick', 0.6); this.give('f_' + n.o.id, 1, n.x, n.z); break;
      }
      case 'pickitem': {
        const n = t.near; act('pick', 0.5);
        if (this.add(n.o.id, 1)) { this.obj.delete(n.c); this.ev({ t: 'pickup', id: n.o.id, n: 1, x: n.x, z: n.z }); } else this.say('Çantan dolu!');
        break;
      }
      case 'shake': this._shake(t.tr); act('shake', 0.8); break;
      case 'chop': this._chop(t.tr); act('chop', 0.65); break;
      case 'swing': act('chop', 0.65); break;
      case 'hit': this._hitRock(t.near); act('dig', 0.55); break;
      case 'fossil': {
        const n = t.near, F = Z_FOSSILS[n.o.f]; this.obj.set(n.c, { t: 'hole' }); act('dig', 0.7);
        this.give('fos_' + n.o.f, 1, n.x, n.z); this.stats.fos++; this.ev({ t: 'dig', x: n.x, z: n.z });
        this.say('🦴 Fosil buldun: ' + F.n + '!'); break;
      }
      case 'fill': { this.obj.delete(t.near.c); act('dig', 0.55); this.ev({ t: 'dig', x: t.near.x, z: t.near.z }); break; }
      case 'uproot': {
        const n = t.near; act('dig', 0.6); this.obj.delete(n.c);
        if (n.o.t === 'sap') this.give('sap_' + n.o.kind, 1, n.x, n.z);
        else if (n.o.t === 'flower') this.give('seed_' + n.o.k, 1, n.x, n.z);
        else this.give('wood', 1, n.x, n.z);
        this.ev({ t: 'dig', x: n.x, z: n.z }); break;
      }
      case 'dig': {
        const q = this.cellPos(t.c); this.obj.set(t.c, { t: 'hole' }); act('dig', 0.6); this.ev({ t: 'dig', x: q.x, z: q.z });
        if (zrnd() < 0.05) { this.say('Hmm, yalnızca toprak…'); }
        break;
      }
      case 'cast': this._cast(t.w); break;
      case 'net': act('net', 0.55); this._net(); break;
      case 'water': this._water(t.near); act('water', 0.8); break;
      default: break;
    }
    return null;
  }

  _place(c) {
    const p = this.p, id = p.held, it = Z_ITEMS[id], W = this.world;
    if (!it || !this.count(id) || c < 0) { p.held = null; return; }
    const cx = c % N, cz = (c / N) | 0, pos = this.cellPos(c);
    const o = this.obj.get(c);
    if (it.furn) {
      const ok = !o && !W.treeT[c] && !this.inBuild(pos.x, pos.z, 0.5) && W.cellH(cx, cz) > SEA + 0.3 && W.cellRange(cx, cz) < 1.2;
      if (!ok) { this.say('Buraya yerleştirilemez.'); return; }
      this.obj.set(c, { t: 'furn', id: it.furn, rot: Math.round(p.ang / (Math.PI / 2)) * (Math.PI / 2) });
      this.take(id, 1); p.act = { type: 'pick', t: 0, dur: 0.5 }; this.ev({ t: 'puff', x: pos.x, z: pos.z }); return;
    }
    const spotOk = !W.treeT[c] && !this.reserved.has(c) && W.cellH(cx, cz) > SEA + 0.9 && W.cellRange(cx, cz) < 0.9 &&
      [SOIL.GRASS, SOIL.DIRT].includes(W.soil[c]) && (!o || o.t === 'hole');
    if (!spotOk) { this.say(this.reserved.has(c) ? 'Yol ve yapı çevresine ekilmez.' : 'Buraya ekilemez.'); return; }
    if (it.plant !== undefined) {
      this.obj.set(c, { t: 'flower', k: it.plant, stage: 0, wet: false });
    } else {
      for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) {
        const n = (cz + dz) * N + cx + dx;
        if (W.treeT[n] || (this.obj.get(n) && this.obj.get(n).t === 'sap')) { this.say('Ağaçlar birbirine çok yakın olamaz.'); return; }
      }
      this.obj.set(c, { t: 'sap', kind: it.sap, stage: 0, wet: false });
    }
    this.stats.planted++; this.take(id, 1); p.act = { type: 'dig', t: 0, dur: 0.6 };
    this.ev({ t: 'dig', x: pos.x, z: pos.z });
  }
  _chop(tr) {
    const m = tr.meta, W = this.world;
    this.ev({ t: 'chop', x: tr.x, z: tr.z });
    m.hp--;
    this.give('wood', 1, tr.x, tr.z);
    if (m.hp <= 0) {
      W.removeTree(tr.c); this.trees.delete(tr.c);
      this.obj.set(tr.c, { t: 'stump' }); this.stats.trees++;
      for (let i = 0; i < 2; i++) this.dropItem('wood', tr.x, tr.z);
      this.ev({ t: 'puff', x: tr.x, z: tr.z });
    }
  }
  _shake(tr) {
    const m = tr.meta, k = Z_TREES[m.k];
    this.ev({ t: 'shake', x: tr.x, z: tr.z, c: tr.c });
    if (k && k.fruit && m.fruit > 0) {
      for (let i = 0; i < m.fruit; i++) this.dropItem(k.fruit, tr.x, tr.z);
      m.fruit = 0; m.reg = 3; this.say('🍎 Meyveler düştü!');
    } else if (zrnd() < 0.22) { this.dropItem('wood', tr.x, tr.z); this.say('Bir dal düştü.'); }
    else if (zrnd() < 0.12) this.say('Üstünden bir şey düşmedi…');
  }
  _hitRock(n) {
    const o = n.o; o.hp--;
    this.ev({ t: 'rock', x: n.x, z: n.z });
    const r = zrnd();
    const id = o.hp === 0 && o.gold ? 'gold' : r < 0.5 ? 'stone' : r < 0.75 ? 'iron' : 'clay';
    this.give(id, 1, n.x + zrange(-0.4, 0.4), n.z + zrange(-0.4, 0.4));
    if (o.hp <= 0) { this.obj.delete(n.c); this.ev({ t: 'puff', x: n.x, z: n.z }); if (id === 'gold') this.say('✨ Altın parçası buldun!'); }
  }
  _water(n) {
    let k = 0;
    for (const [c, o] of this.obj) {
      if (!this._plantable(o)) continue;
      const q = this.cellPos(c);
      if (Math.hypot(q.x - n.x, q.z - n.z) < 1.6 && !o.wet) { o.wet = true; k++; this.ev({ t: 'water', x: q.x, z: q.z }); }
    }
    if (!k) this.say('Zaten sulanmış 💧');
  }
  _net() {
    const f = this.front(0.9); let best = null, bd = 1.9;
    for (const b of this.bugs) { const d = Math.hypot(b.x - f.x, b.z - f.z); if (d < bd) { bd = d; best = b; } }
    if (!best) { this.say('Yakalayacak böcek yok…'); return; }
    this.bugs.splice(this.bugs.indexOf(best), 1);
    const B = Z_BUGS.find((x) => x.id === best.type);
    this.give('bug_' + B.id, 1, best.x, best.z); this.stats.bugs++;
    this.ev({ t: 'catch', id: 'bug_' + B.id, x: best.x, z: best.z });
    this.say(B.i + ' ' + B.n + ' yakaladın!');
  }

  /* ---------------------------------------------------------------- balık tutma */
  _cast(w) {
    const p = this.p; p.fish = { st: 'cast', t: 0, x: w.x, z: w.z, wait: 0, fid: null };
    p.act = { type: 'cast', t: 0, dur: 0.6 };
  }
  _pickFish() {
    const list = Z_FISH.filter((f) => zhours(this.hour, f.h));
    let tot = 0; for (const f of list) tot += f.w;
    let r = zrnd() * tot;
    for (const f of list) { r -= f.w; if (r <= 0) return f; }
    return list[0];
  }
  _reel() {
    const f = this.p.fish; if (!f) return;
    if (f.st === 'bite') { f.st = 'reel'; f.t = 0; this.p.act = { type: 'reel', t: 0, dur: 0.8 }; }
    else if (f.st === 'wait' || f.st === 'cast') { this.say('Çok erken çektin! 🎣'); this.p.fish = null; this.p.act = { type: 'reel', t: 0, dur: 0.4 }; }
  }
  _fishing(dt) {
    const p = this.p, f = p.fish; if (!f) return;
    f.t += dt;
    if (f.st === 'cast') { if (f.t > 0.65) { f.st = 'wait'; f.t = 0; f.wait = zrange(1.6, 5.2); this.ev({ t: 'splash', x: f.x, z: f.z }); } }
    else if (f.st === 'wait') { if (f.t > f.wait) { f.st = 'bite'; f.t = 0; f.fid = this._pickFish(); this.ev({ t: 'splash', x: f.x, z: f.z }); this.ev({ t: 'bite' }); } }
    else if (f.st === 'bite') { if (f.t > 1.15) { this.say('Balık kaçtı… 😢'); p.fish = null; } }
    else if (f.st === 'reel' && f.t > 0.75) {
      const F = f.fid; p.fish = null;
      this.give('fish_' + F.id, 1, p.x, p.z);
      if (!F.junk) this.stats.fish++;
      this.ev({ t: 'catch', id: 'fish_' + F.id, x: p.x, z: p.z });
      this.say(F.junk ? F.i + ' ' + F.n + ' çıktı…' : F.i + ' ' + F.n + ' yakaladın!');
    }
  }

  /* ---------------------------------------------------------------- böcekler */
  _bugs(dt) {
    const p = this.p;
    this._bugT -= dt;
    if (this._bugT <= 0) {
      this._bugT = 1.6;
      const list = Z_BUGS.filter((b) => zhours(this.hour, b.h));
      if (list.length && this.bugs.length < 7 && !this.rainNow) {
        let tot = 0; for (const b of list) tot += b.w;
        let r = zrnd() * tot, pick = list[0];
        for (const b of list) { r -= b.w; if (r <= 0) { pick = b; break; } }
        const a = zrnd() * 6.283, d = zrange(7, 15), x = p.x + Math.cos(a) * d, z = p.z + Math.sin(a) * d;
        if (!this.blocked(x, z, 0.1) && this.world.getHeight(x, z) > 0.9)
          this.bugs.push({ type: pick.id, x, z, ang: zrnd() * 6.28, t: 0, life: zrange(25, 60), sp: 0 });
      }
    }
    for (let i = this.bugs.length - 1; i >= 0; i--) {
      const b = this.bugs[i], B = Z_BUGS.find((x) => x.id === b.type);
      b.t += dt; b.life -= dt;
      const dp = Math.hypot(b.x - p.x, b.z - p.z);
      if (b.life <= 0 || dp > 34 || !zhours(this.hour, B.h)) { this.bugs.splice(i, 1); continue; }
      let sp = B.fly ? 1.1 : B.hop ? 0.7 : 0.4;
      if (dp < 3 && p.speed > 3.5) { b.ang = Math.atan2(b.x - p.x, b.z - p.z); sp *= 3; }
      else if (zrnd() < dt * 0.8) b.ang += zrange(-1.2, 1.2);
      const nx = b.x + Math.sin(b.ang) * sp * dt, nz = b.z + Math.cos(b.ang) * sp * dt;
      if (this.blocked(nx, nz, 0.05)) b.ang += 2.4; else { b.x = nx; b.z = nz; }
    }
  }

  /* ---------------------------------------------------------------- köylüler */
  _addVillager(i, silent) {
    const D = Z_VILL[i], home = this.builds.find((b) => b.vi === i);
    const look = Object.assign(Cozy.defaultLook(), D.look, { female: D.female });
    const v = {
      id: this._id++, i, name: D.name, female: D.female, pers: D.pers, fav: D.fav, look, home: home.id,
      x: home.door.x, z: home.door.z + 1, y: 0, ang: 0, tx: home.door.x, tz: home.door.z + 3, wait: zrange(1, 4), moving: false, stuck: 0,
      inside: false, path: [], repath: 0, talking: false, friend: 0, talked: 0, gifted: 0, quest: null, rew: 0, phase: zrnd() * 6.28,
    };
    v.y = this.world.getHeight(v.x, v.z);
    this.vill.push(v); this._newQuest(v);
    if (!silent) this.say('🏠 ' + v.name + ' adaya taşındı!');
    return v;
  }
  _newQuest(v) {
    const r = zrnd(); let id, n = 1;
    if (r < 0.3) { id = zpick(['apple', 'orange', 'cherry']); n = 2 + ((zrnd() * 2) | 0); }
    else if (r < 0.5) { id = 'flw_' + ((zrnd() * 6) | 0); n = 2; }
    else if (r < 0.7) { id = 'wood'; n = 6; }
    else if (r < 0.88) id = 'fish_' + zpick(Z_FISH.filter((f) => !f.junk && f.sell <= 300)).id;
    else id = 'bug_' + zpick(Z_BUGS.filter((b) => b.sell <= 200)).id;
    v.quest = { id, n, reward: Math.round((Z_ITEMS[id].sell * n * 1.4 + 150) / 10) * 10, done: false };
  }
  talk(v) {
    v.talking = true;
    const g = this.hour < 11 ? 'Günaydın' : this.hour < 18 ? 'Merhaba' : 'İyi akşamlar';
    if (!v.talked) { v.talked = 1; v.friend = Math.min(100, v.friend + 3); }
    return g + ' ' + this.name + '! ' + zpick(Z_TALK[v.pers]);
  }
  endTalk(v) { if (v) v.talking = false; }
  claimQuest(v) {
    const q = v.quest; if (!q || q.done) return { ok: false, msg: 'Şu an bir isteğim yok.' };
    if (this.count(q.id) < q.n) return { ok: false, msg: 'Henüz yetmiyor: ' + Z_ITEMS[q.id].i + ' ' + Z_ITEMS[q.id].n + ' × ' + q.n };
    this.take(q.id, q.n); this.earn(q.reward); q.done = true; v.friend = Math.min(100, v.friend + 10);
    this._friendRewards(v);
    return { ok: true, msg: 'Çok teşekkürler! Al bakalım: ' + q.reward + ' 🔔' };
  }
  gift(v, id) {
    if (v.gifted) return { ok: false, msg: v.name + ' bugün zaten hediye aldı.' };
    const it = Z_ITEMS[id]; if (!it || !this.take(id, 1)) return { ok: false, msg: 'Çantanda yok.' };
    const love = (v.fav === 'flower' && it.flower !== undefined) || (v.fav === 'fish' && it.cat === 'fish') || (v.fav === 'fruit' && it.eat) ||
      (v.fav === 'bug' && it.cat === 'bug') || (v.fav === 'fos' && it.cat === 'fos');
    v.gifted = 1; v.friend = Math.min(100, v.friend + (love ? 9 : 4));
    this._friendRewards(v);
    return { ok: true, msg: love ? 'Vay, çok sevdim bunu! 💖' : 'Teşekkürler, ne düşüncelisin!' };
  }
  _friendRewards(v) {
    const lv = Math.floor(v.friend / 25);
    while (v.rew < lv) {
      v.rew++;
      const f = zpick(Object.keys(Z_FURN).filter((k) => k !== 'fountain'));
      if (this.add('f_' + f, 1)) this.say('🎁 ' + v.name + ' sana ' + Z_FURN[f].n + ' hediye etti!');
    }
  }
  _villagers(dt) {
    const night = this.hour >= 22.5 || this.hour < 6.2;
    for (const v of this.vill) {
      const home = this.builds.find((b) => b.id === v.home);
      v.y = this.world.getHeight(v.x, v.z);
      if (v.talking) { v.moving = false; v.ang = zang(v.ang, Math.atan2(this.p.x - v.x, this.p.z - v.z), Math.min(1, dt * 8)); continue; }
      v.repath = Math.max(0, (v.repath || 0) - dt);
      if (night) {
        if (v.inside) { v.moving = false; v.nt = 0; continue; }
        v.nt = (v.nt || 0) + dt;
        if (v.nt > 70) { v.x = home.door.x; v.z = home.door.z; v.nt = 0; continue; }   // yolda takılan köylü eve ışınlanır
        if (Math.hypot(v.x - home.door.x, v.z - home.door.z) < 1.3) { v.inside = true; v.moving = false; v.path = []; continue; }
        if (!v.path.length && v.repath <= 0) { v.path = this.findPath(v.x, v.z, home.door.x, home.door.z) || []; v.repath = 1.5; if (!v.path.length) { v.x = home.door.x; v.z = home.door.z; } }
      } else {
        if (v.inside) { v.inside = false; v.nt = 0; v.x = home.door.x; v.z = home.door.z + 0.8; v.wait = zrange(0.5, 3); v.path = []; }
        v.wait -= dt;
        if (v.wait <= 0 && !v.path.length) {
          const around = zrnd() < 0.55 ? { x: 2, z: 3 } : { x: v.x, z: v.z };
          for (let k = 0; k < 8; k++) {
            const a = zrnd() * 6.283, d = zrange(3, 12), x = around.x + Math.cos(a) * d, z = around.z + Math.sin(a) * d;
            if (this.blocked(x, z, 0.4) || this.world.getHeight(x, z) < 0.9) continue;
            const pth = this.findPath(v.x, v.z, x, z);
            if (pth && pth.length) { v.path = pth; break; }
          }
          v.wait = zrange(2, 7);
        }
      }
      if (v.path.length) {
        const w = v.path[0], dx = w.x - v.x, dz = w.z - v.z, d = Math.hypot(dx, dz);
        if (d < 0.3) { v.path.shift(); continue; }
        const sp = night ? 2.0 : 1.5, nx = v.x + dx / d * sp * dt, nz = v.z + dz / d * sp * dt;
        if (this.blocked(nx, nz, 0.3) && !this.inBuild(nx, nz, 0.3)) { v.stuck += dt; if (v.stuck > 0.8) { v.path = []; v.stuck = 0; v.repath = 0.3; } } else { v.x = nx; v.z = nz; v.stuck = 0; }
        v.ang = zang(v.ang, Math.atan2(dx, dz), Math.min(1, dt * 8)); v.moving = true;
      } else v.moving = false;
    }
  }

  /* ---------------------------------------------------------------- oyuncu */
  setMove(x, z, run) { this.mv.x = x; this.mv.z = z; this.run = !!run; }
  _player(dt) {
    const p = this.p, W = this.world;
    if (p.act) { p.act.t += dt; if (p.act.t >= p.act.dur) p.act = null; }
    let mx = this.mv.x, mz = this.mv.z;
    const manual = Math.hypot(mx, mz) > 0.12;
    if (manual && this.path.length) { this.path = []; this.pathAct = false; }
    if (p.fish && manual && Math.hypot(mx, mz) > 0.5) { p.fish = null; this.say('Oltayı topladın.'); }
    if (!manual && this.path.length) {
      const w = this.path[0], dx = w.x - p.x, dz = w.z - p.z, d = Math.hypot(dx, dz);
      if (d < 0.3) {
        this.path.shift();
        if (!this.path.length && this.pathAct) { this.pathAct = false; this.ev({ t: 'arrive' }); }
      } else { mx = dx / d; mz = dz / d; }
    }
    const busy = p.act || p.fish || this.freeze;
    const mag = Math.hypot(mx, mz);
    let tx = 0, tz = 0;
    if (mag > 0.05 && !busy) {
      const sp = (this.run ? 5.8 : 3.3) * Math.min(1, mag);
      tx = (mx / mag) * sp; tz = (mz / mag) * sp;
    }
    p.vx += (tx - p.vx) * Math.min(1, dt * 12); p.vz += (tz - p.vz) * Math.min(1, dt * 12);
    const sp2 = Math.hypot(p.vx, p.vz);
    if (sp2 > 0.05) {
      const nx = p.x + p.vx * dt, nz = p.z + p.vz * dt, h0 = W.getHeight(p.x, p.z);
      const step = Math.hypot(nx - p.x, nz - p.z) + 1e-6;
      if (!this.blocked(nx, p.z) && (W.getHeight(nx, p.z) - h0) / step < 1.3) p.x = nx; else p.vx = 0;
      if (!this.blocked(p.x, nz) && (W.getHeight(p.x, nz) - h0) / step < 1.3) p.z = nz; else p.vz = 0;
      if (!this.lockAng && sp2 > 0.3) p.ang = zang(p.ang, Math.atan2(p.vx, p.vz), Math.min(1, dt * 14));
      if (this.path.length && sp2 < 0.2 && mag > 0.05) { p.stuck += dt; if (p.stuck > 0.7) { this.path = []; p.stuck = 0; } } else p.stuck = 0;
    }
    p.moving = sp2 > 0.3; p.speed = sp2;
    p.y = Math.max(W.getHeight(p.x, p.z), SEA - 0.28);
  }
  _pickups() {
    const p = this.p, cx0 = Math.floor(p.x + HALF), cz0 = Math.floor(p.z + HALF);
    for (let j = cz0 - 1; j <= cz0 + 1; j++) for (let i = cx0 - 1; i <= cx0 + 1; i++) {
      if (i < 0 || j < 0 || i >= N || j >= N) continue;
      const c = j * N + i, o = this.obj.get(c);
      if (!o || o.t !== 'item') continue;
      const q = this.cellPos(c);
      if (Math.hypot(q.x + o.ox - p.x, q.z + o.oz - p.z) < 0.85 && this.canAdd(o.id)) {
        this.add(o.id, 1); this.obj.delete(c); this.ev({ t: 'pickup', id: o.id, n: 1, x: q.x, z: q.z });
      }
    }
  }

  /* ---------------------------------------------------------------- zaman */
  update(dt, hour) {
    dt = Math.min(dt, 0.1);
    this.hour = hour;
    const wasRain = this.rainNow;
    this.rainNow = this.rainDay && hour >= this.rainSpan[0] && hour < this.rainSpan[1];
    if (this.rainNow && !this.rainWet) { this.rainWet = true; for (const o of this.obj.values()) if (this._plantable(o)) o.wet = true; this.say('🌧️ Yağmur bitkileri suluyor'); }
    if (wasRain && !this.rainNow) this.say('Yağmur dindi 🌤️');
    this._player(dt); this._fishing(dt); this._villagers(dt); this._bugs(dt); this._pickups();
    this._tick += dt;
    if (this._tick > 4) { this._tick = 0; this.rating(); }
  }
  _rollWeather() {
    this.rainDay = zrnd() < 0.28; this.rainWet = false;
    const a = zrange(7, 14); this.rainSpan = [a, a + zrange(3, 7)];
  }
  consumeSleep() { const s = this._sleepReq; this._sleepReq = false; return s; }
  sleep() { this._sleepReq = true; }
  newDay() {
    this.day++;
    const W = this.world;
    for (const v of this.vill) { v.talked = 0; v.gifted = 0; v.talking = false; if (v.quest && v.quest.done) this._newQuest(v); }
    // büyüme
    for (const [c, o] of [...this.obj.entries()]) {
      if (o.t === 'hole') this.obj.delete(c);
      else if (o.t === 'flower') { if (o.wet && o.stage < 3) o.stage++; o.wet = false; }
      else if (o.t === 'sap') {
        o.stage += o.wet ? 2 : 1; o.wet = false;
        if (o.stage >= 3 && !W.treeT[c]) {
          const K = Z_TREES[o.kind];
          this.obj.delete(c);
          W.setTree(c, K.t, 0.9 + zrnd() * 0.35, W.simTime);
          this.trees.set(c, { k: o.kind, hp: 3, fruit: 0, reg: K.fruit ? 3 : 0 });
          this.ev({ t: 'grew', x: this.cellPos(c).x, z: this.cellPos(c).z });
        }
      }
    }
    for (const [c, m] of this.trees) {
      if (!W.treeT[c]) { this.trees.delete(c); continue; }
      const K = Z_TREES[m.k];
      if (K && K.fruit && m.fruit === 0) { m.reg--; if (m.reg <= 0) m.fruit = 3; }
    }
    // yabani otlar, taşlar
    let weeds = 0, rocks = 0;
    for (const o of this.obj.values()) { if (o.t === 'weed') weeds++; else if (o.t === 'rock') rocks++; }
    for (let i = 0; i < 12 && weeds < 90; i++, weeds++) this._spawnObj('weed');
    for (let i = rocks; i < 8; i++) this._spawnObj('rock');
    this._dailySpawns(); this._restock(); this._rollWeather();
    this.bugs.length = 0;
    this.rating();
    this.ev({ t: 'newday' });
    this._arrivals();
  }
  _arrivals() {
    if (this.stars >= 3 && this.vill.length < 4) this._addVillager(3);
    else if (this.stars >= 5 && this.vill.length < 5) this._addVillager(4);
  }

  /* ---------------------------------------------------------------- ada puanı */
  rating() {
    let flowers = 0, furn = 0, weeds = 0, saps = 0;
    for (const o of this.obj.values()) {
      if (o.t === 'flower' && o.stage >= 3) flowers++; else if (o.t === 'furn') furn++; else if (o.t === 'weed') weeds++; else if (o.t === 'sap') saps++;
    }
    const trees = this.world.treeCount;
    const parts = {
      trees: Math.min(trees / 140, 1) * 25, flowers: Math.min(flowers / 30, 1) * 25, furn: Math.min(furn / 14, 1) * 25,
      clean: (1 - Math.min(weeds / 70, 1)) * 15, folks: Math.min(this.vill.length / 5, 1) * 10,
    };
    const score = Math.round(parts.trees + parts.flowers + parts.furn + parts.clean + parts.folks);
    const st = score >= 90 ? 5 : score >= 72 ? 4 : score >= 52 ? 3 : score >= 32 ? 2 : 1;
    if (st > this.stars) { this.stars = st; this.say('⭐ Adan ' + st + ' yıldıza yükseldi!'); this._arrivals(); } else this.stars = Math.max(1, st);
    this.score = score; this.parts = { trees, flowers, furn, weeds, saps };
    return { score, stars: this.stars, parts: this.parts };
  }
  lights() {
    const L = [], night = this.hour >= 17.5 || this.hour < 6.5;
    if (!night) return L;
    for (const [x, z] of this.lampPosts) L.push({ x, z, up: 2.2, s: 0.7 });
    for (const b of this.builds) if (b.t === 'home' || b.t === 'shop' || (b.t === 'vhome' && this.vill.some((v) => v.home === b.id))) L.push({ x: b.x, z: b.z + b.hz + 0.4, up: 1.4, s: 0.45 });
    for (const [c, o] of this.obj) if (o.t === 'furn' && Z_FURN[o.id].light) { const q = this.cellPos(c); L.push({ x: q.x, z: q.z, up: o.id === 'lamp' ? 2.0 : 0.5, s: Z_FURN[o.id].light * 0.8 }); }
    return L;
  }

  /* ---------------------------------------------------------------- kayıt */
  toJSON() {
    const p = this.p;
    return {
      v: 1, seed: this.seed, day: this.day, zil: this.zil, name: this.name, look: this.look, hour: this.hour,
      p: { x: p.x, z: p.z, ang: p.ang, tool: p.tool, held: p.held },
      bag: this.bag, seen: this.seen, stats: this.stats, stock: this.stock, rainDay: this.rainDay, rainSpan: this.rainSpan, rainWet: this.rainWet, id: this._id,
      obj: [...this.obj.entries()], trees: [...this.trees.entries()],
      vill: this.vill.map((v) => ({ i: v.i, x: v.x, z: v.z, ang: v.ang, friend: v.friend, talked: v.talked, gifted: v.gifted, quest: v.quest, rew: v.rew, inside: v.inside, id: v.id })),
    };
  }
  fromJSON(d) {
    if (!d || d.v !== 1) return false;
    try {
      this._reset();
      this.seed = d.seed | 0; this.day = d.day | 0 || 1; this.zil = +d.zil || 0; this.name = String(d.name || 'Ada Sakini').slice(0, 14);
      this.look = Object.assign(Cozy.defaultLook(), d.look); this.hour = +d.hour || 8;
      Object.assign(this.p, { x: +d.p.x, z: +d.p.z, ang: +d.p.ang || 0, tool: d.p.tool | 0, held: d.p.held || null });
      this.p.y = this.world.getHeight(this.p.x, this.p.z);
      this.bag = d.bag || {}; this.seen = Object.assign({ fish: {}, bug: {}, fos: {} }, d.seen); this.stats = Object.assign(this.stats, d.stats);
      this.stock = d.stock || []; this.rainDay = !!d.rainDay; this.rainSpan = d.rainSpan || [0, 0]; this.rainWet = !!d.rainWet; this._id = d.id | 0 || 100;
      this.obj = new Map(d.obj); this.trees = new Map(d.trees);
      this._layout();
      for (const b of this.builds) b.y = this.world.getHeight(b.x, b.z);
      this._reserve(false);
      for (const sv of d.vill || []) {
        const v = this._addVillager(sv.i, true);
        Object.assign(v, { x: sv.x, z: sv.z, ang: sv.ang, friend: sv.friend, talked: sv.talked, gifted: sv.gifted, quest: sv.quest, rew: sv.rew, inside: !!sv.inside, id: sv.id });
      }
      if (!this.stock.length) this._restock();
      this.rating();
      return true;
    } catch (e) { return false; }
  }
}
