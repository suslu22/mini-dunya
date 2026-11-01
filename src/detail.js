// Mini Dünya - Detaylı Mod mantığı (render'dan bağımsız).
// Az sayıda, isimli ve kişilikli insan; ihtiyaçlar/mutluluk, meslekler, binalar, beceri ağacı, olaylar.
import { N, HALF, SEA, SOIL } from './sim.js';

const dclamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const drnd = Math.random;
const dpick = (a) => a[(drnd() * a.length) | 0];

export const D_YEAR = 20;        // 1 yıl = 20 sn oyun süresi
export const D_ADULT = 16;
export const D_MAXPEOPLE = 40;
export const D_NEEDS = [
  { id: 'food', n: 'Tokluk', i: '🍖' }, { id: 'energy', n: 'Enerji', i: '⚡' }, { id: 'fun', n: 'Eğlence', i: '🎈' },
  { id: 'social', n: 'Sosyal', i: '💬' }, { id: 'clean', n: 'Temizlik', i: '🧼' },
];
export const D_STATS = [
  { id: 'str', n: 'Güç', i: '💪' }, { id: 'int', n: 'Zeka', i: '🧠' }, { id: 'cha', n: 'Karizma', i: '😎' },
  { id: 'agi', n: 'Çeviklik', i: '🏃' }, { id: 'sta', n: 'Dayanıklılık', i: '❤️' },
];
export const D_SKILLS = [
  { id: 'wood', n: 'Oduncu', i: '🪓' }, { id: 'farm', n: 'Çiftçi', i: '🌾' }, { id: 'herd', n: 'Çoban', i: '🐑' },
  { id: 'fish', n: 'Balıkçı', i: '🎣' }, { id: 'build', n: 'İnşaatçı', i: '🔨' }, { id: 'craft', n: 'İşçi', i: '🏭' },
  { id: 'teach', n: 'Öğretmen', i: '📚' },
];
export const D_JOBS = [{ id: 'auto', n: 'Otomatik', i: '🤖' }, ...D_SKILLS];
export const D_FOOD = {
  berry: { n: 'Yemiş', i: '🫐', v: 26 }, wheat: { n: 'Buğday', i: '🌾', v: 34 }, milk: { n: 'Süt', i: '🥛', v: 30 },
  egg: { n: 'Yumurta', i: '🥚', v: 28 }, fish: { n: 'Balık', i: '🐟', v: 40 },
};
const FOOD_KEYS = Object.keys(D_FOOD);

export const D_BUILD = {
  house: { n: 'Ev', i: '🏠', w: 2, h: 2, wood: 8, gold: 0, tech: null, solid: 1, time: 14, d: 'Uyku ve barınma. 4 kişilik.' },
  fire: { n: 'Kamp Ateşi', i: '🔥', w: 1, h: 1, wood: 3, gold: 0, tech: null, solid: 0, time: 5, d: 'Eğlence ve sohbet yeri.' },
  well: { n: 'Kuyu', i: '⛲', w: 1, h: 1, wood: 4, gold: 0, tech: 'kuyu', solid: 1, time: 7, d: 'Temizlik ihtiyacını giderir.' },
  field: { n: 'Tarla', i: '🌾', w: 3, h: 3, wood: 5, gold: 0, tech: 'tarim1', solid: 0, time: 9, d: 'Buğday yetiştirir.' },
  pen: { n: 'Ağıl', i: '🐑', w: 3, h: 3, wood: 10, gold: 0, tech: 'hayvan1', solid: 0, time: 14, d: 'Hayvan besler: yumurta, süt, yün.' },
  dock: { n: 'İskele', i: '🎣', w: 2, h: 2, wood: 8, gold: 0, tech: 'balik1', solid: 0, time: 12, shore: 1, d: 'Kıyıya kurulur, balık tutulur.' },
  school: { n: 'Okul', i: '🏫', w: 3, h: 3, wood: 20, gold: 0, tech: 'egitim1', solid: 1, time: 24, d: 'Çocuklar burada eğitilir.' },
  workshop: { n: 'Atölye', i: '🔨', w: 2, h: 2, wood: 12, gold: 0, tech: 'sanayi1', solid: 1, time: 16, d: 'Odundan eşya üretir.' },
  factory: { n: 'Fabrika', i: '🏭', w: 3, h: 3, wood: 25, gold: 10, tech: 'sanayi2', solid: 1, time: 30, d: 'Seri eşya üretimi. 3 işçi.' },
};

// Beceri ağacı: satır = dal, col = kademe (Forager tarzı, kilitli düğümler puanla açılır)
export const D_BRANCHES = [
  { id: 'surv', n: 'Hayatta Kalma', c: '#7fe0b0' }, { id: 'farm', n: 'Tarım', c: '#f2c14e' },
  { id: 'herd', n: 'Hayvancılık', c: '#f29f6b' }, { id: 'fish', n: 'Balıkçılık', c: '#5ab0f2' },
  { id: 'ind', n: 'Sanayi', c: '#b7a3f2' }, { id: 'edu', n: 'Eğitim', c: '#f27fa8' },
];
export const D_TECH = [
  { id: 'koke', n: 'Başlangıç', i: '🌱', row: 0, col: 0, cost: 0, req: [], d: 'Odun kesme, yemiş toplama, ev ve kamp ateşi.' },
  { id: 'kuyu', n: 'Kuyu', i: '⛲', row: 0, col: 1, cost: 1, req: ['koke'], d: 'Kuyu yapılır; temizlik kolaylaşır.' },
  { id: 'balta', n: 'Demir Balta', i: '🪓', row: 0, col: 2, cost: 2, req: ['kuyu'], d: 'Odun kesme +%40.' },
  { id: 'ev2', n: 'Sağlam Evler', i: '🏡', row: 0, col: 3, cost: 2, req: ['balta'], d: 'Evler 6 kişilik olur, uyku daha rahat.' },
  { id: 'sifa', n: 'Şifacılık', i: '🌿', row: 0, col: 4, cost: 3, req: ['ev2'], d: 'Hastalıklar kolay iyileşir.' },
  { id: 'tarim1', n: 'Tarım', i: '🌾', row: 1, col: 1, cost: 1, req: ['koke'], d: 'Tarla yapılır, buğday yetişir.' },
  { id: 'sulama', n: 'Sulama', i: '💧', row: 1, col: 2, cost: 2, req: ['tarim1'], d: 'Tarla verimi +%40.' },
  { id: 'tohum', n: 'Seçme Tohum', i: '🌱', row: 1, col: 3, cost: 2, req: ['sulama'], d: 'Ekin daha çabuk büyür, verim +%30.' },
  { id: 'hasat', n: 'Mekanik Hasat', i: '🚜', row: 1, col: 4, cost: 3, req: ['tohum'], d: 'Ekim ve hasat 2 kat hızlı.' },
  { id: 'hayvan1', n: 'Tavukçuluk', i: '🐔', row: 2, col: 1, cost: 1, req: ['tarim1'], d: 'Ağıl yapılır; tavuk yumurta verir.' },
  { id: 'hayvan2', n: 'Koyunculuk', i: '🐑', row: 2, col: 2, cost: 2, req: ['hayvan1'], d: 'Koyun yetişir; yün eşya olur.' },
  { id: 'hayvan3', n: 'Sığırcılık', i: '🐄', row: 2, col: 3, cost: 3, req: ['hayvan2'], d: 'İnek süt verir.' },
  { id: 'yem', n: 'Kaliteli Yem', i: '🌽', row: 2, col: 4, cost: 2, req: ['hayvan2'], d: 'Hayvan ürünü +%40.' },
  { id: 'balik1', n: 'Olta ve İskele', i: '🎣', row: 3, col: 1, cost: 1, req: ['koke'], d: 'Balık tutulur, iskele yapılır.' },
  { id: 'balik2', n: 'Balık Ağı', i: '🕸️', row: 3, col: 2, cost: 2, req: ['balik1'], d: 'Avlanan balık +%60.' },
  { id: 'balik3', n: 'Tekne', i: '⛵', row: 3, col: 3, cost: 3, req: ['balik2'], d: 'İskelede tekne olur, av 2 kat.' },
  { id: 'kurut', n: 'Balık Kurutma', i: '🍤', row: 3, col: 4, cost: 2, req: ['balik2'], d: 'Balık daha doyurucu olur.' },
  { id: 'sanayi1', n: 'Atölye', i: '🔨', row: 4, col: 1, cost: 2, req: ['balta'], d: 'Atölye yapılır; odundan eşya üretir.' },
  { id: 'sanayi2', n: 'Fabrika', i: '🏭', row: 4, col: 2, cost: 3, req: ['sanayi1'], d: 'Fabrika yapılır; seri üretim.' },
  { id: 'sanayi3', n: 'Otomasyon', i: '🤖', row: 4, col: 3, cost: 4, req: ['sanayi2'], d: 'Fabrika işçisiz de üretir.' },
  { id: 'ticaret', n: 'Ticaret', i: '💰', row: 4, col: 4, cost: 2, req: ['sanayi1'], d: 'Satış +%50, tüccarlar uğrar.' },
  { id: 'egitim1', n: 'Okul', i: '🏫', row: 5, col: 1, cost: 1, req: ['koke'], d: 'Okul yapılır; çocuklar eğitilir.' },
  { id: 'egitim2', n: 'Kütüphane', i: '📖', row: 5, col: 2, cost: 2, req: ['egitim1'], d: 'Eğitim ve beceri öğrenimi +%40.' },
  { id: 'egitim3', n: 'Öğretmenlik', i: '👩‍🏫', row: 5, col: 3, cost: 2, req: ['egitim1'], d: 'Öğretmenle ders 2 kat verimli.' },
  { id: 'bilim', n: 'Bilim', i: '🔬', row: 5, col: 4, cost: 4, req: ['egitim2', 'egitim3'], d: 'Beceri puanı kazanımı +%50.' },
];
const TECH_BY_ID = Object.fromEntries(D_TECH.map((t) => [t.id, t]));

const NAMES_M = ['Ahmet', 'Mehmet', 'Ali', 'Mustafa', 'Emre', 'Burak', 'Can', 'Kerem', 'Efe', 'Berkin', 'Barış', 'Cem', 'Onur', 'Arda', 'Yusuf', 'Kaan', 'Berk', 'Tolga', 'Mert', 'Eren'];
const NAMES_F = ['Ayşe', 'Fatma', 'Elif', 'Zeynep', 'Selin', 'Defne', 'Ece', 'Merve', 'Derya', 'Naz', 'Işıl', 'Aylin', 'Buse', 'Ceren', 'Duygu', 'Gül', 'Hazal', 'İpek', 'Melis', 'Nehir'];
export const dRandomName = (female) => dpick(female ? NAMES_F : NAMES_M);
const SKIN = 5, HAIRC = 6, SHIRTC = 8;
const DANG = [0, 0.9, -0.9, 1.8, -1.8];
const DACOS = DANG.map(Math.cos), DASIN = DANG.map(Math.sin);

const levelOf = (xp) => Math.min(10, Math.floor(Math.sqrt(xp / 6)));

export class Colony {
  constructor(world) {
    this.w = world;
    this.occ = new Int16Array(N * N).fill(-1);
    this.reset();
    this.onToast = () => {};
    this.onLevel = () => {};
  }
  reset() {
    this.people = []; this.buildings = []; this.nextId = 1; this.time = 0; this.hour = 8; this.night = false;
    this.res = { wood: 22, berry: 12, wheat: 0, milk: 0, egg: 0, fish: 0, goods: 0, gold: 6 };
    this.tech = { koke: 1 }; this.pts = 2; this.xp = 0; this.lvl = 1;
    this.queue = []; this.evTimer = 55; this.log = []; this.claim = new Set(); this.bad = new Map(); this.occ.fill(-1);
    this.mood = 70; this.sellMul = 1;
  }
  // Yeni dünya + tek bir başlangıç insanı. Başlangıç noktasını döndürür.
  start(seed) {
    const w = this.w;
    w.generate(seed);
    let sx = 0, sz = 0, ok = false;
    if (w.tribes[0]) { sx = w.tribes[0].cx; sz = w.tribes[0].cz; ok = true; }
    for (let t = 0; t < 4000 && !ok; t++) {
      const cx = 20 + ((drnd() * (N - 40)) | 0), cz = 20 + ((drnd() * (N - 40)) | 0), h = w.cellH(cx, cz);
      if (h > 1.6 && h < 6 && w.cellRange(cx, cz) < 0.8 && w.soil[cz * N + cx] === SOIL.GRASS) { sx = cx - HALF + 0.5; sz = cz - HALF + 0.5; ok = true; }
    }
    w.humans.length = 0; w.houses.length = 0; w.tribes.length = 0; w.houseAt.fill(-1);
    w.war = false; w.chunkDirty.fill(1); w.treesDirty = true;
    this.reset();
    w.clearTrees(sx, sz, 5.5);   // başlangıç alanını aç
    this.addPerson(sx, sz, { age: 24 });
    return { x: sx, z: sz };
  }
  has(t) { return !!this.tech[t]; }
  getPerson(id) { return this.people.find((p) => p.id === id) || null; }
  getBuilding(id) { return this.buildings.find((b) => b.id === id) || null; }
  addLog(t) { this.log.unshift({ t, time: this.time }); if (this.log.length > 40) this.log.pop(); }
  foodStock() { let s = 0; for (const k of FOOD_KEYS) s += this.res[k] * D_FOOD[k].v / 30; return s; }

  // ---------------------------------------------------------------- insanlar
  addPerson(x, z, o = {}) {
    if (this.people.length >= D_MAXPEOPLE) return null;
    const female = o.female !== undefined ? o.female : drnd() < 0.5;
    const r = () => 3 + ((drnd() * 5) | 0);
    const p = {
      id: this.nextId++, name: o.name || dRandomName(female), female,
      age: o.age !== undefined ? o.age : 24, x, z, y: this.w.getHeight(x, z), ang: drnd() * 6.28, moving: false, hidden: false, lying: false,
      skin: (drnd() * SKIN) | 0, hair: (drnd() * HAIRC) | 0, shirt: (drnd() * SHIRTC) | 0, style: (drnd() * 3) | 0,
      stats: o.stats || { str: r(), int: r(), cha: r(), agi: r(), sta: r() },
      need: { food: 80, energy: 90, fun: 70, social: 65, clean: 85 }, health: 100, sick: false, mood: 70,
      thoughts: [], skill: { wood: 0, farm: 0, herd: 0, fish: 0, build: 0, craft: 0, teach: 0 }, edu: o.edu || 0,
      job: 'auto', act: null, think: 0.3, rel: {}, partner: -1, home: -1, lastFood: '', birth: 0, phase: drnd() * 6.28,
      life: 0, pid: o.parents || null, sleeping: false, said: '',
    };
    p.life = 62 + p.stats.sta * 3 + drnd() * 12;
    if (o.edu === undefined && p.age >= D_ADULT) p.edu = 20 + ((drnd() * 30) | 0);
    this.people.push(p);
    return p;
  }
  addThought(p, id, txt, v, ttl) {
    const t = p.thoughts.find((q) => q.id === id);
    if (t) { t.ttl = ttl; t.v = v; t.txt = txt; return; }
    p.thoughts.push({ id, txt, v, ttl });
  }
  rel(a, b) { return a.rel[b.id] || (a.rel[b.id] = { f: 0, l: 0 }); }
  bumpRel(a, b, df, dl) {
    const ra = this.rel(a, b), rb = this.rel(b, a);
    ra.f = dclamp(ra.f + df, -100, 100); rb.f = dclamp(rb.f + df, -100, 100);
    if (dl) { ra.l = dclamp(ra.l + dl, 0, 100); rb.l = dclamp(rb.l + dl, 0, 100); }
  }
  isAdult(p) { return p.age >= D_ADULT; }
  eff(p) { return (0.6 + p.mood / 100 * 0.7) * (p.sick ? 0.7 : 1); }
  skillMul(p, s) {
    const stat = s === 'wood' || s === 'build' ? p.stats.str : s === 'fish' || s === 'herd' ? p.stats.agi : s === 'teach' ? p.stats.cha : s === 'craft' ? p.stats.int : p.stats.sta;
    return (1 + 0.12 * levelOf(p.skill[s]) + 0.035 * stat + p.edu * 0.002) * this.eff(p);
  }
  gainSkill(p, s, amt = 3) {
    const k = (1 + p.edu / 100) * (this.has('egitim2') ? 1.4 : 1);
    p.skill[s] += amt * k;
    const bonus = this.has('bilim') ? 1.5 : 1;
    this.xp += 1 * bonus;
    const need = 12 + 8 * this.lvl;
    if (this.xp >= need) { this.xp -= need; this.lvl++; this.pts++; this.onLevel(this.lvl); }
  }

  // ---------------------------------------------------------------- binalar
  canPlace(type, cx, cz) {
    const B = D_BUILD[type], w = this.w;
    if (!B) return 'Bilinmeyen yapı';
    if (B.tech && !this.has(B.tech)) return 'Önce beceri ağacından aç';
    if (this.res.wood < B.wood) return 'Yetersiz odun (' + B.wood + ' gerek)';
    if (this.res.gold < B.gold) return 'Yetersiz altın (' + B.gold + ' gerek)';
    if (cx < 3 || cz < 3 || cx + B.w > N - 3 || cz + B.h > N - 3) return 'Harita kenarı';
    let sum = 0, mn = 99, mx = -99, water = 0;
    for (let z = cz; z < cz + B.h; z++) for (let x = cx; x < cx + B.w; x++) {
      const c = z * N + x;
      if (this.occ[c] >= 0) return 'Burada başka yapı var';
      if (w.soil[c] === SOIL.LAVA || w.fire[c] > 0) return 'Burası uygun değil';
      const h = w.cellH(x, z); sum += h; if (h < mn) mn = h; if (h > mx) mx = h;
      if (h < SEA + 0.45) return 'Suya çok yakın/su içinde';
    }
    if (mx - mn > 3.2) return 'Zemin çok eğimli';
    if (B.shore) {
      for (let z = cz - 3; z < cz + B.h + 3; z++) for (let x = cx - 3; x < cx + B.w + 3; x++) {
        if (x < 0 || z < 0 || x >= N || z >= N) continue;
        if (w.cellH(x, z) < SEA - 0.05) water++;
      }
      if (water < 3) return 'İskele kıyıya (suya yakın) kurulmalı';
    }
    return '';
  }
  place(type, cx, cz, instant) {
    const B = D_BUILD[type], w = this.w;
    const why = instant ? '' : this.canPlace(type, cx, cz);
    if (why) return why;
    if (!instant) { this.res.wood -= B.wood; this.res.gold -= B.gold; }
    // zemini düzleştir
    let sum = 0, n = 0;
    for (let z = cz; z < cz + B.h; z++) for (let x = cx; x < cx + B.w; x++) { sum += w.cellH(x, z); n++; }
    const avg = Math.max(SEA + 0.55, sum / n);
    for (let z = cz; z <= cz + B.h; z++) for (let x = cx; x <= cx + B.w; x++) w.H[z * (N + 1) + x] = avg;
    const b = {
      id: this.nextId++, type, cx, cz, w: B.w, h: B.h, x: cx - HALF + B.w / 2, z: cz - HALF + B.h / 2, y: avg,
      prog: instant ? 1 : 0, rot: 0, worker: -1, stage: 0, timer: 0, animals: 0, kind: '', prod: 0, breed: 0, workers: [], door: null, active: 0,
    };
    for (let z = cz; z < cz + B.h; z++) for (let x = cx; x < cx + B.w; x++) {
      const c = z * N + x;
      this.occ[c] = b.id; w.removeTree(c);
      if (type === 'field') { w.soil[c] = SOIL.DIRT; w.auto[c] = 0; }
    }
    if (type === 'pen') {
      b.kind = this.has('hayvan3') ? 'cow' : this.has('hayvan2') ? 'sheep' : 'chicken'; b.animals = 2;
    }
    if (B.shore) {
      let best = 0, bw = -1;
      for (let d = 0; d < 4; d++) {
        const dx = [0, 1, 0, -1][d], dz = [1, 0, -1, 0][d]; let wc = 0;
        for (let s = 2; s <= 7; s++) { const x = ((b.x + HALF + dx * s) | 0), z = ((b.z + HALF + dz * s) | 0); if (x >= 0 && z >= 0 && x < N && z < N && w.cellH(x, z) < SEA - 0.05) wc += 8 - s; }
        if (wc > bw) { bw = wc; best = d; }
      }
      b.rot = best;
    }
    this.buildings.push(b);
    b.door = this._door(b);
    w.afterEdit(cx - 2, cx + B.w + 1, cz - 2, cz + B.h + 1);
    return b;
  }
  // Arazi yükseltilir/alçaltılır/düzleştirilirse bina zemini de binayla birlikte hizalanır (havada ya da gömülü kalmasın)
  _followTerrain(dt) {
    this._ft = (this._ft || 0) + dt; if (this._ft < 0.2) return; this._ft = 0;
    const w = this.w, VN = N + 1;
    for (const b of this.buildings) {
      let sum = 0, n = 0, mn = 1e9, mx = -1e9;
      for (let z = b.cz; z <= b.cz + b.h; z++) for (let x = b.cx; x <= b.cx + b.w; x++) { const v = w.H[z * VN + x]; sum += v; n++; if (v < mn) mn = v; if (v > mx) mx = v; }
      const avg = Math.max(SEA + 0.55, sum / n);
      if (mx - mn < 0.04 && Math.abs(avg - b.y) < 0.04) continue;
      for (let z = b.cz; z <= b.cz + b.h; z++) for (let x = b.cx; x <= b.cx + b.w; x++) w.H[z * VN + x] = avg;
      b.y = avg;
      w.afterEdit(b.cx - 2, b.cx + b.w + 1, b.cz - 2, b.cz + b.h + 1);
    }
  }
  _door(b) {
    const w = this.w, r = [];
    const hw = b.w / 2 + 0.75, hh = b.h / 2 + 0.75;
    const order = b.type === 'dock' ? [b.rot, 0, 1, 2, 3] : [0, 1, 2, 3];
    for (const d of order) {
      const dx = [0, 1, 0, -1][d], dz = [1, 0, -1, 0][d];
      r.push([b.x + dx * hw, b.z + dz * hh]);
    }
    for (const [x, z] of r) if (w._okPoint(x, z) && this.occ[(((z + HALF) | 0) * N) + ((x + HALF) | 0)] < 0) return { x, z };
    return { x: r[0][0], z: r[0][1] };
  }
  removeBuilding(id) {
    const i = this.buildings.findIndex((b) => b.id === id); if (i < 0) return false;
    const b = this.buildings[i];
    for (let z = b.cz; z < b.cz + b.h; z++) for (let x = b.cx; x < b.cx + b.w; x++) this.occ[z * N + x] = -1;
    for (const p of this.people) {
      if (p.home === id) p.home = -1;
      if (p.act && p.act.b === id) { p.act = null; p.hidden = false; p.sleeping = false; p.lying = false; }
    }
    this.buildings.splice(i, 1);
    this.res.wood += Math.floor(D_BUILD[b.type].wood * 0.4);
    this.w.fx('debris', b.x, b.y + 0.5, b.z, 1);
    return true;
  }
  buildingAtCell(cx, cz) {
    if (cx < 0 || cz < 0 || cx >= N || cz >= N) return null;
    const id = this.occ[cz * N + cx]; return id >= 0 ? this.getBuilding(id) : null;
  }
  houseCap() { return this.has('ev2') ? 6 : 4; }
  housed(b) { let n = 0; for (const p of this.people) if (p.home === b.id) n++; return n; }

  // ---------------------------------------------------------------- tekniler
  canUnlock(id) {
    const t = TECH_BY_ID[id]; if (!t || this.tech[id]) return false;
    return this.pts >= t.cost && t.req.every((r) => this.tech[r]);
  }
  unlock(id) {
    if (!this.canUnlock(id)) return false;
    const t = TECH_BY_ID[id]; this.pts -= t.cost; this.tech[id] = 1;
    if (id === 'ticaret') this.sellMul = 1.5;
    this.addLog('⭐ Beceri açıldı: ' + t.n);
    return true;
  }

  // ---------------------------------------------------------------- hareket
  _blocked(nx, nz, exempt) {
    const c = (((nz + HALF) | 0) * N) + ((nx + HALF) | 0);
    const id = this.occ[c];
    if (id < 0 || id === exempt) return false;
    const b = this.getBuilding(id);
    return !!b && D_BUILD[b.type].solid === 1;
  }
  _step(p, a, dt) {
    const dx = a.tx - p.x, dz = a.tz - p.z, d = Math.hypot(dx, dz);
    if (d < (a.near || 0.14)) return 1;
    const sp = (p.age < D_ADULT ? 1.5 : 1.85) * (0.8 + p.stats.agi * 0.04) * (p.sick ? 0.7 : 1) * dt;
    const step = Math.min(sp, d), ux = dx / d, uz = dz / d;
    for (let k = 0; k < 5; k++) {
      const vx = ux * DACOS[k] - uz * DASIN[k], vz = ux * DASIN[k] + uz * DACOS[k];
      const nx = p.x + vx * step, nz = p.z + vz * step;
      if (this.w._okStep(nx, nz, p.y, step) && !this._blocked(nx, nz, a.b)) {
        p.x = nx; p.z = nz; p.ang = Math.atan2(vx, vz); p.moving = true; if (p.blk > 0) p.blk = Math.max(0, p.blk - dt * 2); return 0;
      }
    }
    p.blk = (p.blk || 0) + Math.max(dt, 0.25);
    return -1;
  }
  // Sıkışan (engele toslayan ya da suya/lava'ya düşen) insanı yakındaki boş bir noktaya kurtarır
  _unstick(p, dt) {
    p.ut = (p.ut || 0) + dt; if (p.moving) p.wk = (p.wk || 0) + dt;
    if (p.ut < 0.5) return;
    p.pt = (p.pt || 0) + p.ut; p.ut = 0;
    if (p.bx0 === undefined) { p.bx0 = p.bx1 = p.x; p.bz0 = p.bz1 = p.z; }
    p.bx0 = Math.min(p.bx0, p.x); p.bx1 = Math.max(p.bx1, p.x); p.bz0 = Math.min(p.bz0, p.z); p.bz1 = Math.max(p.bz1, p.z);
    if (p.pt >= 10) {   // 10 sn'nin çoğunu yürüyerek ama hep aynı küçük alanda geçiren (ileri-geri titreyen) sıkışmıştır
      if ((p.wk || 0) > 7 && Math.max(p.bx1 - p.bx0, p.bz1 - p.bz0) < 3.6) p.blk = 3;
      p.bx0 = p.bx1 = p.x; p.bz0 = p.bz1 = p.z; p.pt = 0; p.wk = 0;
    }
    if (p.hidden || p.sleeping) { p.blk = 0; return; }
    const w = this.w, c = (((p.z + HALF) | 0) * N) + ((p.x + HALF) | 0);
    const bad = w.getHeight(p.x, p.z) < SEA + 0.12 || w.soil[c] === SOIL.LAVA || Math.abs(p.x) > HALF - 1.4 || Math.abs(p.z) > HALF - 1.4;
    if ((p.blk || 0) < 3 && !bad) return;
    const free = (x, z) => !this._blocked(x, z, -1) && this.occ[(((z + HALF) | 0) * N) + ((x + HALF) | 0)] < 0;
    const hb = p.home >= 0 ? this.getBuilding(p.home) : null;
    const s = (hb && (p.blk || 0) >= 3 ? w.freeSpot(hb.door.x, hb.door.z, 1, 6, free) : null) || w.freeSpot(p.x, p.z, bad ? 1 : 3, 14, free) || w.freeSpot(p.x, p.z, 14, 40, free) || w.freeSpot(0, 0, 0, 70, free);
    p.blk = 0; p.bx0 = undefined; p.pt = 0; p.wk = 0;
    if (!s) return;
    this._release(p); p.act = null; p.think = 0.3;
    w.fx('puff', p.x, p.y + 0.3, p.z, 1);
    p.x = s.x; p.z = s.z; p.y = w.getHeight(s.x, s.z);
    w.fx('puff', p.x, p.y + 0.3, p.z, 1);
  }
  _randNear(p, r) {
    for (let t = 0; t < 8; t++) {
      const x = p.x + (drnd() - 0.5) * 2 * r, z = p.z + (drnd() - 0.5) * 2 * r;
      if (this.w._okPoint(x, z) && !this._blocked(x, z, -1)) return { x, z };
    }
    return null;
  }
  _go(p, type, tx, tz, extra) {
    p.act = Object.assign({ type, phase: 'go', tx, tz, t: 0, dur: 5, stuck: 0, b: -1 }, extra || {});
  }

  // ---------------------------------------------------------------- karar
  _homeFor(p) {
    if (p.home >= 0) { const b = this.getBuilding(p.home); if (b && b.prog >= 1) return b; p.home = -1; }
    // eşin/ailenin evi
    const cap = this.houseCap();
    const pb = p.partner >= 0 ? this.getPerson(p.partner) : null;
    if (pb && pb.home >= 0) { const b = this.getBuilding(pb.home); if (b && b.prog >= 1 && this.housed(b) < cap) { p.home = b.id; return b; } }
    let best = null, bd = 1e9;
    for (const b of this.buildings) {
      if (b.type !== 'house' || b.prog < 1 || this.housed(b) >= cap) continue;
      const d = Math.hypot(b.x - p.x, b.z - p.z); if (d < bd) { bd = d; best = b; }
    }
    if (best) p.home = best.id;
    return best;
  }
  _nearestB(p, type, filter) {
    let best = null, bd = 1e9;
    for (const b of this.buildings) {
      if (b.type !== type || b.prog < 1 || (filter && !filter(b))) continue;
      const d = Math.hypot(b.x - p.x, b.z - p.z); if (d < bd) { bd = d; best = b; }
    }
    return best;
  }
  _shoreSpot(p) {
    const w = this.w;
    for (let t = 0; t < 60; t++) {
      const x = p.x + (drnd() - 0.5) * 50, z = p.z + (drnd() - 0.5) * 50;
      if (!w._okPoint(x, z)) continue;
      const h = w.getHeight(x, z); if (h > SEA + 1.0) continue;
      for (let d = 0; d < 4; d++) if (w.getHeight(x + [1.6, -1.6, 0, 0][d], z + [0, 0, 1.6, -1.6][d]) < SEA - 0.05) return { x, z };
    }
    return null;
  }
  _findTree(p, R) {
    const w = this.w, cx = (p.x + HALF) | 0, cz = (p.z + HALF) | 0;
    let best = -1, bd = 1e9;
    for (let z = Math.max(0, cz - R); z <= Math.min(N - 1, cz + R); z++) for (let x = Math.max(0, cx - R); x <= Math.min(N - 1, cx + R); x++) {
      const c = z * N + x;
      if (!w.treeT[c] || w.fire[c] > 0 || this.claim.has(c) || (this.bad.get(c) || 0) > this.time) continue;
      const d = (x - cx) * (x - cx) + (z - cz) * (z - cz) + drnd() * 5;
      if (d < bd) { bd = d; best = c; }
    }
    return best;
  }
  _jobOptions(p) {
    // her iş için [skor, kurucu] döndürür; fonksiyon uygunsa kurar
    const o = {}, res = this.res, pop = Math.max(1, this.people.length);
    const food = this.foodStock(), wantFood = Math.max(0, 4 * pop + 2 - food);
    const sites = this.buildings.filter((b) => b.prog < 1 && b.worker < 0);
    if (sites.length) o.build = { s: 5, f: () => this._startBuild(p, sites) };
    if (this.w.treeCount > 0) o.wood = { s: Math.max(0.5, 7 - res.wood / (3 + pop)), f: () => this._startChop(p) };
    const fields = this.buildings.filter((b) => b.type === 'field' && b.prog >= 1 && b.worker < 0 && (b.stage === 0 || b.stage === 2));
    if (fields.length) o.farm = { s: 2 + wantFood * 0.5 + (fields.some((b) => b.stage === 2) ? 3 : 0), f: () => this._startFarm(p, fields) };
    const pens = this.buildings.filter((b) => b.type === 'pen' && b.prog >= 1 && b.worker < 0 && b.prod >= 1.2);
    if (pens.length) o.herd = { s: 3 + wantFood * 0.3, f: () => this._startHerd(p, pens) };
    const docks = this.buildings.filter((b) => b.type === 'dock' && b.prog >= 1 && b.workers.length < 2);
    if ((this.has('balik1') && docks.length) || this.has('balik1')) o.fish = { s: 1.5 + wantFood * 0.5 + (docks.length ? 1 : 0), f: () => this._startFish(p, docks) };
    const crafts = this.buildings.filter((b) => (b.type === 'workshop' && b.workers.length < 1 || b.type === 'factory' && b.workers.length < 3) && b.prog >= 1);
    if (crafts.length && res.wood >= 4) o.craft = { s: 1.5 + Math.min(2, res.wood / 20), f: () => this._startCraft(p, crafts) };
    const school = this._nearestB(p, 'school');
    if (school && !this.people.some((q) => q !== p && q.act && q.act.type === 'teach') && this.people.some((q) => q.age < D_ADULT)) o.teach = { s: 4, f: () => this._startTeach(p, school) };
    if (wantFood > 0 || !o.farm && !o.fish && !o.herd) o.forage = { s: 0.8 + wantFood * 0.7, f: () => this._startForage(p) };
    return o;
  }
  _decide(p) {
    p.think = 0.4 + drnd() * 0.5; p.said = '';
    const n = p.need, adult = p.age >= D_ADULT;
    // 1) acil ihtiyaçlar
    if (n.energy < 18 || (this.night && n.energy < 70)) return this._startSleep(p);
    if (n.food < 38 && this.foodStock() >= 0.3) return this._startEat(p);
    if (n.clean < 25 && this._startWash(p)) return;
    if (n.fun < 25 && this._startFun(p)) return;
    if (n.social < 25 && this._startTalk(p)) return;
    if (n.food < 40 && !this.night && adult) { const o = this._jobOptions(p); const k = o.farm ? 'farm' : o.fish ? 'fish' : o.herd ? 'herd' : 'forage'; if (o[k] && o[k].f()) return; }
    // 2) çocuk
    if (!adult) {
      const school = this._nearestB(p, 'school');
      if (school && !this.night && p.edu < 100 && p.age >= 4) { this._go(p, 'study', school.door.x + (drnd() - 0.5) * 1.6, school.door.z + (drnd() - 0.5) * 1.2, { b: school.id, dur: 18 }); return; }
      if (drnd() < 0.35 && this._startTalk(p)) return;
      return this._startPlay(p);
    }
    // 3) iş
    if (!this.night || n.energy > 55) {
      const o = this._jobOptions(p);
      if (p.job !== 'auto') {
        const j = o[p.job];
        if (j && j.f()) return;
      } else {
        let best = null, bs = 0.3;
        for (const k in o) {
          const sk = k === 'forage' ? 0 : levelOf(p.skill[k]) * 0.35;
          const s = o[k].s + sk + drnd() * 1.6;
          if (s > bs) { bs = s; best = k; }
        }
        if (best && o[best].f()) return;
      }
    }
    // 4) boş vakit
    const r = drnd();
    if (r < 0.3 && this._startTalk(p)) return;
    if (r < 0.55 && this._startFun(p)) return;
    this._startWander(p);
  }

  // ---- iş başlatıcılar
  _startSleep(p) {
    const h = this._homeFor(p);
    if (h) this._go(p, 'sleep', h.door.x, h.door.z, { b: h.id, dur: 999, near: 0.6 });
    else { const f = this._nearestB(p, 'fire'); this._go(p, 'sleep', f ? f.x + 0.9 : p.x, f ? f.z : p.z, { dur: 999, near: 0.4 }); }
  }
  _startEat(p) {
    const h = this._homeFor(p);
    if (h && Math.hypot(h.x - p.x, h.z - p.z) < 18) this._go(p, 'eat', h.door.x, h.door.z, { b: h.id, dur: 4 });
    else this._go(p, 'eat', p.x, p.z, { dur: 4 });
  }
  _startWash(p) {
    const w = this._nearestB(p, 'well');
    if (w) { this._go(p, 'wash', w.door.x, w.door.z, { b: w.id, dur: 5 }); return true; }
    const s = this._shoreSpot(p);
    if (s) { this._go(p, 'wash', s.x, s.z, { dur: 6, water: 1 }); return true; }
    return false;
  }
  _startFun(p) {
    const f = this._nearestB(p, 'fire');
    if (f) { this._go(p, 'fun', f.door.x + (drnd() - 0.5), f.door.z + (drnd() - 0.5), { b: f.id, dur: 14 }); return true; }
    this._startPlay(p); return true;
  }
  _startPlay(p) {
    const t = this._randNear(p, 7);
    if (t) this._go(p, 'play', t.x, t.z, { dur: 5, near: 0.3 });
    else p.think = 1;
  }
  _startWander(p) {
    const t = this._randNear(p, 6);
    if (t) this._go(p, 'wander', t.x, t.z, { dur: 0.5, near: 0.3 });
    else p.think = 1;
  }
  _startTalk(p) {
    let best = null, bs = -1e9;
    for (const q of this.people) {
      if (q === p || q.sleeping || (q.act && (q.act.type === 'sleep' || q.act.type === 'talk'))) continue;
      const d = Math.hypot(q.x - p.x, q.z - p.z); if (d > 40) continue;
      const s = this.rel(p, q).f * 0.3 - d * 0.4 + (q.id === p.partner ? 12 : 0) + drnd() * 4;
      if (s > bs) { bs = s; best = q; }
    }
    if (!best) return false;
    this._go(p, 'talk', best.x, best.z, { dur: 7, with: best.id, near: 1.3 });
    return true;
  }
  _startChop(p, cell) {
    const forced = cell !== undefined;
    const c = forced ? cell : this._findTree(p, 20); if (c < 0) return false;
    if (forced && (!this.w.treeT[c] || this.claim.has(c))) return false;
    this.claim.add(c);
    this._go(p, 'chop', (c % N) - HALF + 0.5 + (drnd() - 0.5) * 0.4, ((c / N) | 0) - HALF + 0.5 + 0.6, { cell: c, dur: 4.2 / this.skillMul(p, 'wood') * (this.has('balta') ? 0.8 : 1), near: 0.25 });
    return true;
  }
  _startForage(p) {
    const w = this.w;
    for (let t = 0; t < 14; t++) {
      const x = p.x + (drnd() - 0.5) * 36, z = p.z + (drnd() - 0.5) * 36;
      if (w._okPoint(x, z) && w.soil[(((z + HALF) | 0) * N) + ((x + HALF) | 0)] === SOIL.GRASS && !this._blocked(x, z, -1)) {
        this._go(p, 'forage', x, z, { dur: 5.5 / this.skillMul(p, 'farm'), near: 0.25 }); return true;
      }
    }
    return false;
  }
  _startBuild(p, sites) {
    let best = null, bd = 1e9;
    for (const b of sites) { const d = Math.hypot(b.x - p.x, b.z - p.z); if (d < bd) { bd = d; best = b; } }
    if (!best) return false;
    best.worker = p.id;
    this._go(p, 'build', best.door.x, best.door.z, { b: best.id, dur: 999 });
    return true;
  }
  _startFarm(p, fields) {
    let best = null, bd = 1e9;
    for (const b of fields) { const d = Math.hypot(b.x - p.x, b.z - p.z) - (b.stage === 2 ? 6 : 0); if (d < bd) { bd = d; best = b; } }
    if (!best) return false;
    best.worker = p.id;
    this._go(p, 'farm', best.x + (drnd() - 0.5), best.z + (drnd() - 0.5), { b: best.id, dur: (best.stage === 2 ? 5 : 4) / this.skillMul(p, 'farm') / (this.has('hasat') ? 2 : 1), mode: best.stage === 2 ? 'harvest' : 'sow', near: 0.3 });
    return true;
  }
  _startHerd(p, pens) {
    let best = null, bd = 1e9;
    for (const b of pens) { const d = Math.hypot(b.x - p.x, b.z - p.z); if (d < bd) { bd = d; best = b; } }
    if (!best) return false;
    best.worker = p.id;
    this._go(p, 'herd', best.x, best.z + 0.3, { b: best.id, dur: 5 / this.skillMul(p, 'herd'), near: 0.4 });
    return true;
  }
  _startFish(p, docks) {
    let d = null, bd = 1e9;
    for (const b of docks) { const dd = Math.hypot(b.x - p.x, b.z - p.z); if (dd < bd && b.workers.length < 2) { bd = dd; d = b; } }
    if (d) { d.workers.push(p.id); this._go(p, 'fish', d.door.x, d.door.z, { b: d.id, dur: 7 / this.skillMul(p, 'fish'), dock: 1 }); return true; }
    const s = this._shoreSpot(p);
    if (!s) return false;
    this._go(p, 'fish', s.x, s.z, { dur: 9 / this.skillMul(p, 'fish'), shore: 1, near: 0.3 });
    return true;
  }
  _startCraft(p, crafts) {
    let best = null, bd = 1e9;
    for (const b of crafts) { const d = Math.hypot(b.x - p.x, b.z - p.z); if (d < bd && (b.type === 'workshop' ? b.workers.length < 1 : b.workers.length < 3)) { bd = d; best = b; } }
    if (!best) return false;
    best.workers.push(p.id);
    this._go(p, 'craft', best.door.x, best.door.z, { b: best.id, dur: 8 / this.skillMul(p, 'craft') });
    return true;
  }
  _startTeach(p, school) {
    this._go(p, 'teach', school.door.x, school.door.z - 0.2, { b: school.id, dur: 22 });
    return true;
  }

  // ---------------------------------------------------------------- oyuncu komutları
  // Seçili insana, dokunulan hedefe göre verilebilecek işler. Hedef: {kind:'tree',cell} | {kind:'building',b}
  // | {kind:'person',q} | {kind:'ground',x,z,water}. Her seçenek {t, f}; f() oyuncuya gösterilecek mesajı döndürür.
  commandOptions(p, t) {
    const o = [], adult = p.age >= D_ADULT, w = this.w;
    const add = (txt, fn, msg, fail) => o.push({ t: txt, f: () => this._cmd(p, fn, msg, fail) });
    if (t.kind === 'tree') {
      if (adult) add('🪓 Ağaç kes', () => this._startChop(p, t.cell), p.name + ' ağaç kesmeye gidiyor', 'Bu ağacı şu an biri kesiyor');
    } else if (t.kind === 'person') {
      const q = t.q;
      if (q !== p && !q.sleeping) add('💬 Sohbet et', () => this._go(p, 'talk', q.x, q.z, { dur: 7, with: q.id, near: 1.3 }), p.name + ', ' + q.name + ' ile konuşmaya gidiyor');
    } else if (t.kind === 'building') {
      const b = t.b, B = D_BUILD[b.type];
      if (b.prog < 1) {
        if (adult) add('🔨 İnşa et', () => { b.worker = p.id; this._go(p, 'build', b.door.x, b.door.z, { b: b.id, dur: 999 }); }, p.name + ' ' + B.n + ' inşasına gidiyor');
      } else if (b.type === 'house') {
        if (p.home !== b.id && this.housed(b) < this.houseCap()) add('🛏️ Buraya yerleş', () => { p.home = b.id; }, p.name + ' artık bu evde yaşayacak');
        add('💤 Uyu', () => this._go(p, 'sleep', b.door.x, b.door.z, { b: b.id, dur: 999, near: 0.6 }), p.name + ' uyumaya gidiyor');
        if (this.foodStock() >= 0.3) add('🍽️ Yemek ye', () => this._go(p, 'eat', b.door.x, b.door.z, { b: b.id, dur: 4 }), p.name + ' yemeye gidiyor');
      } else if (b.type === 'field') {
        if (adult && b.stage === 0) add('🌱 Tohum ek', () => this._startFarm(p, [b]), p.name + ' tarlaya tohum ekmeye gidiyor');
        else if (adult && b.stage === 2) add('🌾 Hasat et', () => this._startFarm(p, [b]), p.name + ' hasada gidiyor');
      } else if (b.type === 'pen') {
        if (adult && b.prod >= 1) add(b.kind === 'chicken' ? '🥚 Yumurta topla' : b.kind === 'cow' ? '🥛 Süt sağ' : '🧶 Ürünleri topla', () => this._startHerd(p, [b]), p.name + ' hayvanlara bakmaya gidiyor');
      } else if (b.type === 'dock') {
        if (adult) add('🎣 Balık tut', () => this._startFish(p, [b]), p.name + ' balık tutmaya gidiyor');
      } else if (b.type === 'workshop' || b.type === 'factory') {
        const need = b.type === 'factory' ? 4 : 2, cap = b.type === 'factory' ? 3 : 1;
        if (adult && this.res.wood >= need && b.workers.length < cap) add('🏭 Üretimde çalış', () => this._startCraft(p, [b]), p.name + ' üretime gidiyor');
      } else if (b.type === 'school') {
        if (adult) add('📚 Ders ver', () => this._startTeach(p, b), p.name + ' ders vermeye gidiyor');
        else add('📖 Derse otur', () => this._go(p, 'study', b.door.x + (drnd() - 0.5) * 1.6, b.door.z + (drnd() - 0.5) * 1.2, { b: b.id, dur: 18 }), p.name + ' derse gidiyor');
      } else if (b.type === 'fire') {
        add('🎈 Ateşin başında eğlen', () => this._go(p, 'fun', b.door.x + (drnd() - 0.5), b.door.z + (drnd() - 0.5), { b: b.id, dur: 14 }), p.name + ' ateşin başına gidiyor');
      } else if (b.type === 'well') {
        add('🧼 Yıkan', () => this._go(p, 'wash', b.door.x, b.door.z, { b: b.id, dur: 5 }), p.name + ' yıkanmaya gidiyor');
      }
    } else if (t.kind === 'ground') {
      if (!t.water && w._okPoint(t.x, t.z) && !this._blocked(t.x, t.z, -1)) {
        add('🚶 Buraya git', () => this._go(p, 'wander', t.x, t.z, { dur: 6, near: 0.3 }), p.name + ' oraya yürüyor');
        if (adult && w.soil[(((t.z + HALF) | 0) * N) + ((t.x + HALF) | 0)] === SOIL.GRASS) add('🫐 Yemiş topla', () => this._go(p, 'forage', t.x, t.z, { dur: 5.5 / this.skillMul(p, 'farm'), near: 0.25 }), p.name + ' yemiş toplamaya gidiyor');
      }
      const s = adult && this.has('balik1') ? this._shoreNear(t.x, t.z) : null;
      if (s) add('🎣 Balık tut', () => this._go(p, 'fish', s.x, s.z, { dur: 9 / this.skillMul(p, 'fish'), shore: 1, near: 0.3 }), p.name + ' kıyıda balık tutacak');
    }
    return o;
  }
  _shoreNear(x, z) {
    const w = this.w; let best = null, bd = 1e9;
    for (let dz = -6; dz <= 6; dz += 1) for (let dx = -6; dx <= 6; dx += 1) {
      const px = x + dx, pz = z + dz;
      if (!w._okPoint(px, pz) || this._blocked(px, pz, -1) || w.getHeight(px, pz) > SEA + 1.0) continue;
      let wet = false;
      for (let d = 0; d < 4; d++) if (w.getHeight(px + [1.6, -1.6, 0, 0][d], pz + [0, 0, 1.6, -1.6][d]) < SEA - 0.05) wet = true;
      const d2 = dx * dx + dz * dz; if (wet && d2 < bd) { bd = d2; best = { x: px, z: pz }; }
    }
    return best;
  }
  _cmd(p, fn, msg, fail) {
    this._release(p);
    const r = fn();
    if (r === false) { p.think = 0.3; return fail || 'Bu iş şu an yapılamıyor'; }
    if (p.act) { p.act.cmd = 1; p.think = 0.3; this.w.fx('puff', p.x, p.y + 1.6, p.z, 1); }
    return msg || '';
  }

  // ---------------------------------------------------------------- etkinlik yürütme
  _release(p) {
    const a = p.act; if (!a) return;
    if (a.cell !== undefined) this.claim.delete(a.cell);
    const b = a.b >= 0 ? this.getBuilding(a.b) : null;
    if (b) {
      if (b.worker === p.id) b.worker = -1;
      const i = b.workers.indexOf(p.id); if (i >= 0) b.workers.splice(i, 1);
    }
    p.hidden = false; p.sleeping = false; p.lying = false;
    p.act = null;
  }
  _abort(p) {
    const a = p.act;
    if (a && a.cell !== undefined) this.bad.set(a.cell, this.time + 90);
    this._release(p); p.think = 0.6;
  }
  _begin(p, a) {
    switch (a.type) {
      case 'sleep': {
        const b = a.b >= 0 ? this.getBuilding(a.b) : null;
        p.sleeping = true; p.hidden = !!b; p.lying = !b; a.inHouse = !!b;
        break;
      }
      case 'talk': {
        const q = this.getPerson(a.with);
        if (!q || q.sleeping) return this._abort(p);
        if (!q.act || q.act.type !== 'talk' || q.act.with !== p.id) {
          this._release(q); q.act = { type: 'talk', phase: 'do', tx: q.x, tz: q.z, t: 0, dur: a.dur, stuck: 0, b: -1, with: p.id, passive: 1 };
        }
        break;
      }
      case 'build': {
        const b = this.getBuilding(a.b); if (!b) return this._abort(p);
        break;
      }
    }
  }
  _doing(p, a, dt) {
    const n = p.need, w = this.w;
    switch (a.type) {
      case 'sleep':
        n.energy = Math.min(100, n.energy + (a.inHouse ? 1.7 : 1.0) * dt);
        n.food -= 0; if (p.sick && drnd() < dt * 0.02) { p.sick = false; this.addThought(p, 'iyiles', 'Hastalığı geçti', 8, 90); }
        if (n.energy >= 96 || (!this.night && n.energy >= 78)) a.done = true;
        break;
      case 'eat': break;
      case 'fun': {
        const f = a.b >= 0 ? this.getBuilding(a.b) : null;
        let crowd = 0; for (const q of this.people) if (q !== p && q.act && q.act.type === 'fun' && q.act.phase === 'do') crowd++;
        n.fun = Math.min(100, n.fun + (f ? 2.4 : 1.2) * dt);
        n.social = Math.min(100, n.social + crowd * 0.5 * dt);
        if (crowd && drnd() < dt * 0.1) this.addThought(p, 'ates', 'Ateşin başında eğlendi', 6, 100);
        if (f && drnd() < dt * 3) w.fx('fire', f.x, f.y + 0.2, f.z, dt);
        if (n.fun >= 98) a.done = true;
        break;
      }
      case 'play':
        n.fun = Math.min(100, n.fun + 1.1 * dt); a.wobble = (a.wobble || 0) + dt;
        if (a.t > 3 && !a.moved) { const t = this._randNear(p, 4); if (t) { a.tx = t.x; a.tz = t.z; a.phase = 'go'; a.moved = 1; a.dur = 4; } }
        break;
      case 'wash': n.clean = Math.min(100, n.clean + 22 * dt); if (a.water && drnd() < dt * 2) w.fx('splash', p.x + (drnd() - 0.5), SEA, p.z + 1, 1); break;
      case 'talk': {
        const q = this.getPerson(a.with);
        if (!q) return (a.done = true);
        const gain = (1.3 + p.stats.cha * 0.08 + q.stats.cha * 0.08) * dt * 2.1;
        n.social = Math.min(100, n.social + gain); n.fun = Math.min(100, n.fun + 0.3 * dt);
        a.ang = Math.atan2(q.x - p.x, q.z - p.z); p.ang = a.ang;
        break;
      }
      case 'study': {
        if (this.night) return (a.done = true);
        const teacher = this.people.some((q) => q.act && q.act.type === 'teach' && q.act.phase === 'do');
        const k = (teacher ? (this.has('egitim3') ? 2.6 : 1.5) : 0.35) * (this.has('egitim2') ? 1.4 : 1) * (0.7 + p.stats.int * 0.06);
        p.edu = Math.min(100, p.edu + k * dt * 0.9);
        if (a.t > 2 && drnd() < dt * 0.1) this.addThought(p, 'ders', 'Okulda yeni şeyler öğrendi', 4, 120);
        break;
      }
      case 'teach': {
        let students = 0; for (const q of this.people) if (q.act && q.act.type === 'study' && q.act.phase === 'do') students++;
        if (this.night) return (a.done = true);
        if (students) this.gainSkill(p, 'teach', 0.25 * dt * students);
        break;
      }
      case 'build': {
        const b = this.getBuilding(a.b); if (!b) return (a.done = true);
        b.prog = Math.min(1, b.prog + dt * this.skillMul(p, 'build') / D_BUILD[b.type].time);
        if (drnd() < dt * 3) this.w.fx('dust', b.x + (drnd() - 0.5) * b.w * 0.7, b.y + 0.3, b.z + (drnd() - 0.5) * b.h * 0.7, 1);
        if (b.prog >= 1) { a.done = true; this.gainSkill(p, 'build', 6); this.addLog('🔨 ' + p.name + ' ' + D_BUILD[b.type].n + ' yaptı'); }
        break;
      }
      case 'chop':
        if (drnd() < dt * 3) w.fx('chips', p.x, p.y + 0.5, p.z, 1);
        if (!w.treeT[a.cell] || w.fire[a.cell] > 0) a.done = true;
        break;
      case 'farm': case 'herd': case 'craft': case 'fish': case 'forage': break;
    }
    if (a.type === 'craft') {
      const b = this.getBuilding(a.b); if (b) b.active = 1.5;
    }
  }
  _finish(p, a) {
    const n = p.need, res = this.res, w = this.w;
    switch (a.type) {
      case 'eat': {
        let best = '', bs = -1;
        for (const k of FOOD_KEYS) {
          if (res[k] < 0.99) continue;
          const s = D_FOOD[k].v + (k !== p.lastFood ? 10 : 0) + drnd() * 6 - (k === 'berry' ? 6 : 0);
          if (s > bs) { bs = s; best = k; }
        }
        if (best) {
          res[best] -= 1; let v = D_FOOD[best].v; if (best === 'fish' && this.has('kurut')) v += 14;
          n.food = Math.min(100, n.food + v);
          if (best !== p.lastFood && p.lastFood) this.addThought(p, 'cesit', 'Çeşitli ve lezzetli yemek', 5, 120);
          p.lastFood = best; this.gainSkill(p, 'farm', 0.1);
        } else this.addThought(p, 'ackal', 'Yiyecek bulamadı', -8, 60);
        break;
      }
      case 'sleep':
        this.addThought(p, 'uyku', a.inHouse ? 'Evinde rahat uyudu' : 'Açıkta uyudu', a.inHouse ? 7 : -9, 140);
        break;
      case 'talk': {
        const q = this.getPerson(a.with);
        if (q && !a.passive) {
          const comp = (p.stats.cha + q.stats.cha) / 20 + drnd() * 0.6 - 0.3;
          const adultsOpp = p.age >= D_ADULT && q.age >= D_ADULT && p.female !== q.female && p.partner < 0 && q.partner < 0;
          this.bumpRel(p, q, 3 + comp * 6, adultsOpp ? 3 + comp * 4 : 0);
          this.addThought(p, 'sohbet', 'Güzel bir sohbet etti', 5, 100); this.addThought(q, 'sohbet', 'Güzel bir sohbet etti', 5, 100);
        }
        break;
      }
      case 'wash': n.clean = 100; this.addThought(p, 'yika', 'Tertemiz', 4, 100); break;
      case 'chop': {
        if (w.treeT[a.cell] && w.fire[a.cell] <= 0) {
          w.removeTree(a.cell);
          const y = (1 + (this.has('balta') ? 0.4 : 0) + levelOf(p.skill.wood) * 0.1) * (0.8 + p.stats.str * 0.04);
          res.wood += y; w.fx('puff', p.x, p.y + 0.5, p.z, 1);
          this.gainSkill(p, 'wood');
        }
        break;
      }
      case 'forage': res.berry += 1.5 + levelOf(p.skill.farm) * 0.3; this.gainSkill(p, 'farm', 1.5); w.fx('puff', p.x, p.y + 0.3, p.z, 1); break;
      case 'farm': {
        const b = this.getBuilding(a.b); if (!b) break;
        if (a.mode === 'sow') { b.stage = 1; b.timer = 42 * (this.has('tohum') ? 0.75 : 1) * (this.has('sulama') ? 0.85 : 1); b.total = b.timer; this.gainSkill(p, 'farm', 2); }
        else if (b.stage === 2) {
          const y = 6.5 * this.skillMul(p, 'farm') * (this.has('sulama') ? 1.4 : 1) * (this.has('tohum') ? 1.3 : 1);
          res.wheat += y; b.stage = 0; this.gainSkill(p, 'farm', 6);
          for (let i = 0; i < 4; i++) w.fx('puff', b.x + (drnd() - 0.5) * 2, b.y + 0.4, b.z + (drnd() - 0.5) * 2, 1);
        }
        break;
      }
      case 'herd': {
        const b = this.getBuilding(a.b); if (!b) break;
        const m = this.skillMul(p, 'herd'), k = Math.floor(b.prod);
        if (k >= 1) {
          if (b.kind === 'chicken') res.egg += k * m; else if (b.kind === 'cow') res.milk += k * m; else res.goods += k * 0.8 * m;
          b.prod -= k; if (res.wheat >= 1) res.wheat -= 0.5;
          this.gainSkill(p, 'herd', 4);
        }
        break;
      }
      case 'fish': {
        const dock = a.dock ? 1 : 0.65;
        const y = (1 + (this.has('balik2') ? 0.6 : 0) + (this.has('balik3') && a.dock ? 1.0 : 0)) * dock * (0.7 + levelOf(p.skill.fish) * 0.12 + p.stats.agi * 0.03) * this.eff(p);
        res.fish += y; this.gainSkill(p, 'fish', 4);
        w.fx('splash', p.x + (a.dock ? 0 : 1.2), SEA, p.z + 1.2, 1);
        break;
      }
      case 'craft': {
        const b = this.getBuilding(a.b); if (!b) break;
        const need = b.type === 'factory' ? 4 : 2, make = b.type === 'factory' ? 4 : 1;
        if (res.wood >= need) { res.wood -= need; res.goods += make * this.skillMul(p, 'craft'); this.gainSkill(p, 'craft', 4); }
        break;
      }
      case 'teach': this.addThought(p, 'ogret', 'Ders vermekten gurur duydu', 6, 150); break;
    }
    this._release(p);
    p.think = 0.15 + drnd() * 0.4;
  }
  _tickAct(p, dt) {
    const a = p.act;
    if (a.phase === 'go') {
      a.gt = (a.gt || 0) + dt;
      if (a.gt > (a.cmd ? 60 : 22) || (a.type !== 'eat' && a.type !== 'sleep' && p.need.food < 12 && this.foodStock() >= 0.3)) return this._abort(p);
      if (a.type === 'talk' && !a.passive) { const q = this.getPerson(a.with); if (!q) return this._abort(p); a.tx = q.x; a.tz = q.z; }
      const r = this._step(p, a, dt);
      if (r === 1) { a.phase = 'do'; a.t = 0; this._begin(p, a); }
      else if (r < 0) { a.stuck += dt; if (a.stuck > 2.2) { if (Math.hypot(a.tx - p.x, a.tz - p.z) < 4) { p.x = a.tx; p.z = a.tz; } else this._abort(p); } }
      else a.stuck = 0;
      if (a.type === 'sleep' && !a.cmd && this.night === false && p.need.energy > 60 && a.phase === 'go') this._abort(p);
      return;
    }
    a.t += dt;
    this._doing(p, a, dt);
    if (p.act !== a) return;
    if (a.done || a.t >= a.dur) this._finish(p, a);
  }

  // ---------------------------------------------------------------- ana güncelleme
  update(dt, hour) {
    this.time += dt; this.hour = hour; this.night = hour >= 21.5 || hour < 6;
    // binalar
    for (const b of this.buildings) {
      if (b.prog < 1) continue;
      if (b.type === 'field' && b.stage === 1) { b.timer -= dt; if (b.timer <= 0) b.stage = 2; }
      if (b.type === 'pen') {
        const fed = this.res.wheat >= 1 || this.res.berry >= 1 ? 1 : 0.5;
        const rate = (b.kind === 'chicken' ? 0.035 : b.kind === 'cow' ? 0.024 : 0.028) * (this.has('yem') ? 1.4 : 1) * fed;
        b.prod = Math.min(8, b.prod + dt * rate * b.animals);
        b.breed += dt * fed;
        if (b.breed > 70 && b.animals < 6) { b.breed = 0; b.animals++; this.res.wheat = Math.max(0, this.res.wheat - 1); }
      }
      if (b.type === 'factory' && this.has('sanayi3') && this.res.wood >= 4) {
        b.auto = (b.auto || 0) + dt;
        if (b.auto >= 14) { b.auto = 0; this.res.wood -= 4; this.res.goods += 3; b.active = 1.5; }
      }
      if (b.active > 0) {
        b.active -= dt;
        if ((b.type === 'factory' || b.type === 'workshop') && drnd() < dt * 2.5) this.w.fx('smoke', b.x + (b.type === 'factory' ? 0.9 : 0.3), b.y + (b.type === 'factory' ? 3.4 : 1.8), b.z - 0.8, 1);
      }
    }
    this._followTerrain(dt);
    // insanlar
    const dead = [];
    let moodSum = 0;
    for (const p of this.people) {
      p.moving = false; p.age += dt / D_YEAR; p.y = this.w.getHeight(p.x, p.z);
      this._needs(p, dt);
      if (p.act) this._tickAct(p, dt);
      else { p.think -= dt; if (p.think <= 0) this._decide(p); }
      this._unstick(p, dt);
      if (p.health <= 0 || p.age > p.life) dead.push(p);
      moodSum += p.mood;
      // 16 yaş
      if (!p.adultSeen && p.age >= D_ADULT) {
        p.adultSeen = true;
        if (p.birth) { this._coming(p); }
      }
    }
    this.mood = this.people.length ? moodSum / this.people.length : 0;
    for (const p of dead) this._die(p);
    this._births(dt);
    this._events(dt);
  }
  _needs(p, dt) {
    const n = p.need, act = p.act ? p.act.type : '';
    const sleeping = act === 'sleep' && p.act.phase === 'do';
    const k = p.age < D_ADULT ? 0.9 : 1;
    n.food = Math.max(0, n.food - dt * 0.5 * k * (sleeping ? 0.35 : 1));
    if (!sleeping) n.energy = Math.max(0, n.energy - dt * 0.42 * (act === 'chop' || act === 'build' || act === 'farm' ? 1.5 : 1) * (this.night ? 1.3 : 1));
    n.fun = Math.max(0, n.fun - dt * 0.32 * (sleeping ? 0.3 : 1));
    n.social = Math.max(0, n.social - dt * 0.26 * (sleeping ? 0.3 : 1));
    n.clean = Math.max(0, n.clean - dt * 0.2 * (act === 'chop' || act === 'farm' || act === 'build' ? 2 : 1));
    // sağlık
    if (n.food <= 1) p.health -= dt * 0.7;
    else if (p.sick) p.health -= dt * (this.has('sifa') ? 0.04 : 0.12);
    else if (n.food > 40 && n.energy > 20) p.health = Math.min(100, p.health + dt * 0.25);
    if (n.clean < 6 && drnd() < dt * 0.002 && !p.sick) p.sick = true;
    // düşünceler
    for (let i = p.thoughts.length - 1; i >= 0; i--) { p.thoughts[i].ttl -= dt; if (p.thoughts[i].ttl <= 0) p.thoughts.splice(i, 1); }
    const h = p.home >= 0 ? this.getBuilding(p.home) : null;
    if (n.social < 20) this.addThought(p, 'yalniz', 'Yalnız hissediyor', -7, 4);
    if (n.food < 20) this.addThought(p, 'ac', 'Çok aç', -10, 4);
    if (n.clean < 20) this.addThought(p, 'kirli', 'Pis ve bakımsız', -6, 4);
    if (n.energy < 20) this.addThought(p, 'yorgun', 'Bitkin', -8, 4);
    if (p.sick) this.addThought(p, 'hasta', 'Hasta', -14, 4);
    if (p.partner >= 0) this.addThought(p, 'sevgili', 'Sevdiği biri var', 6, 4);
    if (!h && p.age >= 2) this.addThought(p, 'evsiz', 'Barınağı yok', -6, 4);
    else if (h) this.addThought(p, 'evvar', 'Evi var', 4, 4);
    const gp = this.res.goods / Math.max(1, this.people.length);
    if (gp >= 1) this.addThought(p, 'esya', 'Eşyalarla konforlu', Math.min(8, 2 + gp), 4);
    let th = 0; for (const t of p.thoughts) th += t.v;
    const base = n.food * 0.26 + n.energy * 0.2 + n.fun * 0.18 + n.social * 0.16 + n.clean * 0.1 + p.health * 0.1;
    const target = dclamp(base * 0.85 + 12 + dclamp(th, -35, 35), 0, 100);
    p.mood += (target - p.mood) * Math.min(1, dt * 0.6);
  }
  _die(p) {
    const i = this.people.indexOf(p); if (i < 0) return;
    this._release(p);
    this.people.splice(i, 1);
    if (p.partner >= 0) { const q = this.getPerson(p.partner); if (q) { q.partner = -1; this.addThought(q, 'yas', 'Eşini kaybetti', -25, 240); } }
    for (const q of this.people) if ((q.rel[p.id] && q.rel[p.id].f > 20)) this.addThought(q, 'yas' + p.id, p.name + ' öldü', -12, 200);
    const cause = p.health <= 0 ? (p.need.food <= 1 ? 'açlıktan' : 'hastalıktan') : 'yaşlılıktan';
    this.addLog('💀 ' + p.name + ' ' + cause + ' öldü (' + Math.floor(p.age) + ' yaşında)');
    this.queue.push({ title: '💀 ' + p.name + ' hayatını kaybetti', text: p.name + ', ' + Math.floor(p.age) + ' yaşında ' + cause + ' öldü. Köy onu hep hatırlayacak.', ids: [], choices: [{ t: 'Başsağlığı', f: () => 'Köy yasa büründü. ' + p.name + ' anısıyla yaşayacak.' }] });
    this.w.fx('puff', p.x, p.y + 0.5, p.z, 1);
  }

  // ---------------------------------------------------------------- doğum & olgunlaşma
  _births(dt) {
    for (const f of this.people) {
      if (!f.female || f.partner < 0 || f.age < 18 || f.age > 42) continue;
      const m = this.getPerson(f.partner); if (!m) continue;
      f.birthT = (f.birthT === undefined ? 50 + drnd() * 50 : f.birthT) - dt;
      if (f.birthT > 0) continue;
      f.birthT = 70 + drnd() * 60;
      const cap = this.buildings.filter((b) => b.type === 'house' && b.prog >= 1).length * this.houseCap();
      if (this.people.length >= Math.min(D_MAXPEOPLE, Math.max(cap, 2)) || this.foodStock() < this.people.length * 1.5) continue;
      const babyFemale = drnd() < 0.5;
      const baby = this.addPerson(f.x + 0.4, f.z + 0.4, { female: babyFemale, age: 0, edu: 0, parents: [f.id, m.id] });
      if (!baby) continue;
      baby.birth = 1; baby.adultSeen = false; baby.home = f.home;
      const mix = (k) => Math.round((f.stats[k] + m.stats[k]) / 2 + (drnd() - 0.5) * 3);
      for (const k of Object.keys(baby.stats)) baby.stats[k] = dclamp(mix(k), 1, 10);
      baby.life = 62 + baby.stats.sta * 3 + drnd() * 12;
      this.w.fx('heart', baby.x, baby.y + 1.2, baby.z, 1);
      this.addLog('👶 ' + f.name + ' ve ' + m.name + '\'in bebeği doğdu');
      const sugg = dRandomName(babyFemale);
      this.queue.push({
        title: '👶 Yeni bir bebek!', ids: [baby.id], input: sugg,
        text: f.name + ' ve ' + m.name + ' ' + (babyFemale ? 'bir kız' : 'bir erkek') + ' bebek sahibi oldu. Bebeğe bir isim ver:',
        choices: [{ t: 'İsmi onayla', f: (c, ev, val) => { baby.name = (val || sugg).trim().slice(0, 14) || sugg; return baby.name + ' ailenin yeni üyesi! Okula gidip eğitilirse harika bir yetişkin olacak.'; } }],
      });
    }
  }
  _coming(p) {
    const opts = [
      { t: '🌾 Çiftçi olsun', k: 'farm' }, { t: '🎣 Balıkçı olsun', k: 'fish' }, { t: '🪓 Oduncu olsun', k: 'wood' },
      { t: '🔨 Zanaatkâr olsun', k: 'craft' }, { t: '🤖 Kendi seçsin', k: 'auto' },
    ];
    this.queue.push({
      title: '🎓 ' + p.name + ' büyüdü!', ids: [p.id],
      text: p.name + ' artık yetişkin. Eğitim seviyesi: %' + Math.floor(p.edu) + '. Hangi yolu seçsin?',
      choices: opts.map((o) => ({
        t: o.t, f: () => {
          p.job = o.k === 'farm' ? 'farm' : o.k === 'fish' ? 'fish' : o.k === 'wood' ? 'wood' : o.k === 'craft' ? 'craft' : 'auto';
          if (o.k !== 'auto') p.skill[o.k] += 6 + p.edu / 10;
          p.stats.int = dclamp(p.stats.int + Math.floor(p.edu / 40), 1, 10);
          return p.name + (o.k === 'auto' ? ' kendi yolunu seçecek.' : ' ' + o.t.slice(2) + '. Eğitimi sayesinde beceriyle başladı.');
        },
      })),
    });
  }

  // ---------------------------------------------------------------- olaylar
  _events(dt) {
    this.evTimer -= dt;
    if (this.evTimer > 0 || this.queue.length > 2 || this.people.length === 0) return;
    this.evTimer = 55 + drnd() * 60;
    const cand = [];
    for (const e of D_EVENTS) { const ctx = e.when(this); if (ctx) cand.push([e, ctx]); }
    if (!cand.length) { this.evTimer = 20; return; }
    let tot = 0; for (const [e] of cand) tot += e.weight;
    let r = drnd() * tot;
    for (const [e, ctx] of cand) {
      r -= e.weight;
      if (r <= 0) { const ev = e.make(this, ctx); if (ev.pre) ev.pre(); this.queue.push(ev); return; }
    }
  }
  answer(ev, i, val) {
    const ch = ev.choices[i]; if (!ch) return '';
    return ch.f(this, ev, val) || '';
  }

  // ---------------------------------------------------------------- kayıt
  toJSON() {
    return {
      v: 1, people: this.people.map((p) => { const q = Object.assign({}, p); q.act = null; q.hidden = false; q.sleeping = false; q.lying = false; q.moving = false; return q; }),
      buildings: this.buildings.map((b) => Object.assign({}, b, { worker: -1, workers: [] })), res: this.res, tech: this.tech, pts: this.pts, xp: this.xp, lvl: this.lvl,
      time: this.time, nextId: this.nextId, evTimer: this.evTimer, log: this.log.slice(0, 20),
    };
  }
  fromJSON(d) {
    if (!d || d.v !== 1) return false;
    this.reset();
    this.people = d.people || []; this.buildings = d.buildings || [];
    Object.assign(this.res, d.res); this.tech = d.tech || { koke: 1 }; this.pts = d.pts | 0; this.xp = +d.xp || 0; this.lvl = d.lvl || 1;
    this.time = +d.time || 0; this.nextId = d.nextId || 1; this.evTimer = +d.evTimer || 40; this.log = d.log || [];
    this.sellMul = this.has('ticaret') ? 1.5 : 1;
    for (const b of this.buildings) for (let z = b.cz; z < b.cz + b.h; z++) for (let x = b.cx; x < b.cx + b.w; x++) this.occ[z * N + x] = b.id;
    return true;
  }
  sell(what, n) {
    if (what !== 'goods' && what !== 'wood') return 0;
    n = Math.min(n, Math.floor(this.res[what])); if (n <= 0) return 0;
    const price = (what === 'goods' ? 1.6 : 0.5) * this.sellMul;
    this.res[what] -= n; const g = n * price; this.res.gold += g; return g;
  }
}

// ---------------------------------------------------------------- olay şablonları
const adults = (c) => c.people.filter((p) => p.age >= D_ADULT);
const twoAdults = (c) => { const a = adults(c); if (a.length < 2) return null; const i = (drnd() * a.length) | 0; let j = (drnd() * a.length) | 0; if (j === i) j = (j + 1) % a.length; return [a[i], a[j]]; };
const mm = (a, b) => (a.stats.cha + b.stats.cha) / 20;

export const D_EVENTS = [
  {
    id: 'argue', weight: 3, when: (c) => twoAdults(c),
    make: (c, [a, b]) => ({
      title: '😠 Tartışma çıktı', ids: [a.id, b.id],
      text: a.name + ' ile ' + b.name + ' ortak yiyecek/iş yüzünden tartışıyor. Ne yapacaksın?',
      choices: [
        { t: '🕊️ Arabuluculuk yap', f: () => { if (drnd() < 0.35 + mm(a, b) * 0.5) { c.bumpRel(a, b, 10); c.addThought(a, 'barisma', 'Barıştılar', 8, 120); c.addThought(b, 'barisma', 'Barıştılar', 8, 120); return 'Başardın! İkisi de sakinleşip el sıkıştı.'; } c.bumpRel(a, b, -6); return 'Ne yazık ki sözün dinlenmedi; tartışma sürdü.'; } },
        { t: '👉 ' + a.name + ' haklı', f: () => { c.bumpRel(a, b, -12); c.addThought(a, 'hakli', 'Haklı çıktı', 8, 120); c.addThought(b, 'haksiz', 'Haksızlığa uğradı', -9, 150); return a.name + ' memnun, ' + b.name + ' küstü.'; } },
        { t: '👉 ' + b.name + ' haklı', f: () => { c.bumpRel(a, b, -12); c.addThought(b, 'hakli', 'Haklı çıktı', 8, 120); c.addThought(a, 'haksiz', 'Haksızlığa uğradı', -9, 150); return b.name + ' memnun, ' + a.name + ' küstü.'; } },
        { t: '🤷 Karışma', f: () => { c.bumpRel(a, b, -5); c.addThought(a, 'kavga', 'Kavga etti', -8, 120); c.addThought(b, 'kavga', 'Kavga etti', -8, 120); return 'İkisi de birbirine surat astı.'; } },
      ],
    }),
  },
  {
    id: 'love', weight: 4, when: (c) => {
      for (const a of adults(c)) { if (a.partner >= 0) continue; for (const b of adults(c)) { if (a.female !== b.female && b.partner < 0 && a.rel[b.id] && a.rel[b.id].l >= 12 && a.id < b.id) return [a, b]; } }
      return null;
    },
    make: (c, [a, b]) => ({
      title: '💘 Aşk havada', ids: [a.id, b.id],
      text: a.name + ' ile ' + b.name + ' birbirinden hoşlanıyor. Birlikte olmalarını sağlayacak mısın?',
      choices: [
        { t: '💍 Evlendir', f: () => { a.partner = b.id; b.partner = a.id; c.bumpRel(a, b, 20, 40); c.addThought(a, 'ask', 'Evlendi!', 15, 300); c.addThought(b, 'ask', 'Evlendi!', 15, 300); c.addLog('💍 ' + a.name + ' ve ' + b.name + ' evlendi'); return 'Düğün yapıldı! Artık birlikte yaşayıp bebek sahibi olabilirler.'; } },
        { t: '👫 Arkadaş kalsınlar', f: () => { c.bumpRel(a, b, 8, -10); return 'İkisi de iyi arkadaş olarak kalmayı seçti.'; } },
        { t: '✋ Ayır', f: () => { c.bumpRel(a, b, -20, -30); c.addThought(a, 'ayri', 'Aşkı engellendi', -12, 200); c.addThought(b, 'ayri', 'Aşkı engellendi', -12, 200); return 'Ayrıldılar; ikisi de çok üzgün.'; } },
      ],
    }),
  },
  {
    id: 'sick', weight: 3, when: (c) => { const l = c.people.filter((p) => !p.sick && p.need.clean < 60); return l.length ? { p: l[(drnd() * l.length) | 0] } : (c.people.length > 1 ? { p: c.people[(drnd() * c.people.length) | 0] } : null); },
    make: (c, { p }) => {
      const ch = [
        { t: '🌿 Şifalı ot ver (−2 yemek)', f: () => { if (c.res.berry >= 2) c.res.berry -= 2; else if (c.foodStock() >= 2) { for (const k of FOOD_KEYS) if (c.res[k] >= 2) { c.res[k] -= 2; break; } } p.sick = false; c.addThought(p, 'iyiles', 'Şifalı otla iyileşti', 8, 120); return p.name + ' iyileşti.'; } },
        { t: '🛏️ Dinlendir', f: () => { p.need.energy = Math.max(0, p.need.energy - 0); if (drnd() < 0.6) { p.sick = false; return p.name + ' dinlenince iyileşti.'; } p.sick = true; p.health -= 8; return 'Dinlenmek yetmedi, ' + p.name + ' hâlâ halsiz.'; } },
        { t: '🍀 Kaderine bırak', f: () => { p.sick = true; p.health -= 18; return p.name + ' daha da kötüleşti.'; } },
      ];
      if (c.has('sifa')) ch.unshift({ t: '👩‍⚕️ Şifacı çağır (−3 altın)', f: () => { c.res.gold = Math.max(0, c.res.gold - 3); p.sick = false; p.health = Math.min(100, p.health + 20); return 'Şifacı tedavi etti; ' + p.name + ' pırıl pırıl!'; } });
      return { title: '🤒 ' + p.name + ' hastalandı', ids: [p.id], text: p.name + ' ateşler içinde. Ne yapacaksın?', choices: ch, pre: () => { p.sick = true; } };
    },
  },
  {
    id: 'theft', weight: 2, when: (c) => (c.foodStock() > 4 && c.people.length > 2 && adults(c).length ? {} : null),
    make: (c) => {
      const ad = adults(c); const t = ad.reduce((a, b) => (a.stats.cha < b.stats.cha ? a : b), ad[0]);
      const take = () => { for (const k of ['wheat', 'berry', 'fish', 'egg', 'milk']) if (c.res[k] >= 3) { c.res[k] -= 3; return true; } return false; };
      take();
      return {
        title: '🕵️ Yiyecek kayboldu', ids: [t.id],
        text: 'Depodan bir miktar yiyecek eksik. Şüpheler ' + t.name + ' üzerinde.',
        choices: [
          { t: '⚖️ Cezalandır', f: () => { c.addThought(t, 'ceza', 'Cezalandırıldı', -14, 200); for (const q of c.people) if (q !== t) c.addThought(q, 'adalet', 'Adalet sağlandı', 4, 150); return t.name + ' cezalandırıldı, köy huzura erdi.'; } },
          { t: '🤝 Affet', f: () => { c.addThought(t, 'af', 'Affedildi', 10, 200); return t.name + ' pişman oldu ve teşekkür etti.'; } },
          { t: '🔍 Soruştur (Zeka)', f: () => { const a = adults(c).reduce((s, x) => (x.stats.int > s.stats.int ? x : s)); if (drnd() < 0.3 + a.stats.int * 0.06) { c.res.berry += 3; return a.name + ' soruşturup yiyeceği buldu!'; } c.addThought(t, 'suclu', 'Haksız yere suçlandı', -10, 150); return 'Kanıt bulunamadı; ' + t.name + ' haksız suçlanmaktan kırıldı.'; } },
        ],
      };
    },
  },
  {
    id: 'trader', weight: 3, when: (c) => (c.time > 120 && (c.has('ticaret') || c.res.wood > 25) ? {} : null),
    make: (c) => ({
      title: '🧳 Gezgin tüccar uğradı', ids: [],
      text: 'Yorgun bir tüccar köyün dışında mola verdi. Elinde ilginç mallar var.',
      choices: [
        { t: '🪵 10 odun sat', f: () => { if (c.res.wood < 10) return 'Yeterli odunun yok.'; c.res.wood -= 10; c.res.gold += 8 * c.sellMul; return '8 altın kazandın.'; } },
        { t: '📦 Eşyaları sat', f: () => { const g = c.sell('goods', Math.floor(c.res.goods)); return g ? Math.floor(g) + ' altın kazandın.' : 'Satacak eşyan yok.'; } },
        { t: '🌾 8 altınla 10 buğday al', f: () => { if (c.res.gold < 8) return 'Yeterli altının yok.'; c.res.gold -= 8; c.res.wheat += 10; return '10 buğday aldın.'; } },
        { t: '👋 Geç', f: () => 'Tüccar yoluna devam etti.' },
      ],
    }),
  },
  {
    id: 'talent', weight: 2, when: (c) => { const k = c.people.filter((p) => p.age < D_ADULT && p.age >= 4); return k.length ? { p: k[(drnd() * k.length) | 0] } : null; },
    make: (c, { p }) => ({
      title: '🌟 Küçük bir yetenek', ids: [p.id],
      text: p.name + ' çevresindekileri şaşırtıyor; zekâsı parlıyor. Yeteneğini geliştirmek ister misin?',
      choices: [
        { t: '📚 Özel eğitim (−4 altın)', f: () => { if (c.res.gold < 4) return 'Yeterli altının yok.'; c.res.gold -= 4; p.stats.int = dclamp(p.stats.int + 1, 1, 10); p.edu = Math.min(100, p.edu + 12); c.addThought(p, 'ozel', 'Özel ders aldı', 8, 200); return p.name + ' çok şey öğrendi: Zeka +1.'; } },
        { t: '🎈 Oynasın bırak', f: () => { p.need.fun = 100; c.addThought(p, 'oyun', 'Doyasıya oynadı', 8, 150); return p.name + ' çocukluğunu yaşadı.'; } },
      ],
    }),
  },
  {
    id: 'festival', weight: 2, when: (c) => (c.people.length >= 2 && c.mood < 62 && c.foodStock() > c.people.length * 2 ? {} : null),
    make: (c) => ({
      title: '🎉 Şenlik önerisi', ids: [],
      text: 'Köylüler biraz bunalmış. Küçük bir şenlik düzenlenmesini istiyorlar.',
      choices: [
        { t: '🍖 Şenlik yap (−3 yemek)', f: () => { for (const k of ['berry', 'wheat', 'fish', 'egg', 'milk']) if (c.res[k] >= 3) { c.res[k] -= 3; break; } for (const q of c.people) { q.need.fun = 100; q.need.social = Math.min(100, q.need.social + 30); c.addThought(q, 'senlik', 'Şenlik harikaydı!', 12, 240); } return 'Herkes eğlendi, moraller yükseldi!'; } },
        { t: '🙅 Gerek yok', f: () => { for (const q of c.people) c.addThought(q, 'senliksiz', 'Şenlik yapılmadı', -4, 120); return 'Köylüler homurdandı.'; } },
      ],
    }),
  },
  {
    id: 'migrant', weight: 2, when: (c) => {
      const cap = c.buildings.filter((b) => b.type === 'house' && b.prog >= 1).length * c.houseCap();
      return c.people.length < cap && c.people.length < D_MAXPEOPLE && c.foodStock() > c.people.length * 2 && c.time > 90 ? {} : null;
    },
    make: (c) => {
      const f = drnd() < 0.5, nm = dRandomName(f), age = 18 + ((drnd() * 18) | 0);
      return {
        title: '🚶 Bir yabancı geldi', ids: [],
        text: nm + ' (' + age + ' yaşında) köyünüzde yaşamak istiyor.',
        choices: [
          { t: '🤗 Kabul et', f: () => { const p = c.addPerson(c.people[0].x + 3, c.people[0].z + 2, { name: nm, female: f, age }); return p ? nm + ' aranıza katıldı!' : 'Köy dolu.'; } },
          { t: '🧐 Önce sına (Zeka)', f: () => { const t = adults(c).reduce((s, x) => (x.stats.int > s.stats.int ? x : s)); const p = c.addPerson(c.people[0].x + 3, c.people[0].z + 2, { name: nm, female: f, age }); if (p) { p.stats.int = dclamp(p.stats.int + 1, 1, 10); p.edu += 10; } return t.name + ' onu sınadı: ' + nm + ' kabul edildi, üstelik akıllı biri!'; } },
          { t: '🚫 Reddet', f: () => 'Yabancı sessizce uzaklaştı.' },
        ],
      };
    },
  },
  {
    id: 'lonely', weight: 3, when: (c) => { const l = c.people.filter((p) => p.need.social < 30 && p.mood < 50); return l.length ? { p: l[0] } : null; },
    make: (c, { p }) => ({
      title: '😔 ' + p.name + ' yalnız', ids: [p.id],
      text: p.name + ' kendini yalnız ve mutsuz hissediyor.',
      choices: [
        { t: '💬 Sohbet et', f: () => { p.need.social = Math.min(100, p.need.social + 45); c.addThought(p, 'dinlendi', 'Dinlendiği için rahatladı', 8, 160); return p.name + ' içini döktü, rahatladı.'; } },
        { t: '🎁 Hediye ver (−1 eşya)', f: () => { if (c.res.goods < 1) return 'Hediye edecek eşyan yok.'; c.res.goods -= 1; p.need.fun = 100; c.addThought(p, 'hediye', 'Hediye aldı', 12, 220); return p.name + ' çok mutlu oldu!'; } },
        { t: '🏖️ Bir gün izin ver', f: () => { p.need.fun = 100; p.need.energy = 100; return p.name + ' dinlenip kendine geldi.'; } },
      ],
    }),
  },
  {
    id: 'kids', weight: 2, when: (c) => { const k = c.people.filter((p) => p.age < D_ADULT && p.age >= 4); return k.length >= 2 ? { a: k[0], b: k[1] } : null; },
    make: (c, { a, b }) => ({
      title: '🧒 Çocuklar kavga etti', ids: [a.id, b.id],
      text: a.name + ' ile ' + b.name + ' oyun sırasında itişti.',
      choices: [
        { t: '😡 İkisini de azarla', f: () => { c.addThought(a, 'azar', 'Azarlandı', -7, 150); c.addThought(b, 'azar', 'Azarlandı', -7, 150); return 'Utanıp özür dilediler.'; } },
        { t: '🍪 Barıştır', f: () => { c.bumpRel(a, b, 18); c.addThought(a, 'baris', 'Barıştı', 6, 150); c.addThought(b, 'baris', 'Barıştı', 6, 150); return 'Sarılıp oyuna devam ettiler.'; } },
        { t: '👀 Kendileri çözsün', f: () => { if (drnd() < 0.5) { c.bumpRel(a, b, 10); return 'Birbirlerini affettiler.'; } c.bumpRel(a, b, -10); return 'Küs kaldılar.'; } },
      ],
    }),
  },
  {
    id: 'harvest', weight: 2, when: (c) => (c.buildings.some((b) => b.type === 'field' && b.prog >= 1) ? {} : null),
    make: (c) => ({
      title: '🌤️ Bereketli bir mevsim', ids: [],
      text: 'Bu yıl hava harika geçti; tarlalar ışıl ışıl. Fazla ürünü ne yapalım?',
      choices: [
        { t: '🏚️ Ambara kaldır', f: () => { c.res.wheat += 10; return '+10 buğday ambara girdi.'; } },
        { t: '💰 Pazarda sat', f: () => { c.res.gold += 6 * c.sellMul; return 'Fazla ürün satıldı: +' + Math.floor(6 * c.sellMul) + ' altın.'; } },
        { t: '🎉 Köylülere dağıt', f: () => { for (const q of c.people) c.addThought(q, 'bolluk', 'Bolluk yılı!', 9, 220); return 'Herkes cömertliğine hayran kaldı.'; } },
      ],
    }),
  },
];
