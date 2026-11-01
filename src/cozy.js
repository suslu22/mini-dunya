// Mini Dünya - Ada Modu mantığı (render'dan bağımsız).
// Adayı üretir; oyuncu, araçlar, balık/böcek/fosil, dükkân, yapım, köylüler ve ada puanı burada.
import { N, HALF, SEA, SOIL, hash2 } from './sim.js';
import { Z_CROPS, Z_MACH, Z_MACH_ORDER, Z_GOODS, Z_QUESTS, Z_STORY_AT, Z_STORY, Z_BARKS, Z_HINTS, Z_HINTS_NPC, Z_RUMORS, Z_NPCS, Z_FARM, Z_DECOR } from './ada_data.js';

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
export const Z_BAG_MAX = 40;
export const Z_TOOLS = [
  { id: 'hand', n: 'Eller', i: '✋', m: '' },
  { id: 'axe', n: 'Balta', i: '🪓', m: 'axe' },
  { id: 'shovel', n: 'Kürek', i: '⛏️', m: 'shovel' },
  { id: 'rod', n: 'Olta', i: '🎣', m: 'rod' },
  { id: 'net', n: 'Böcek Ağı', i: '🥅', m: 'net' },
  { id: 'can', n: 'Sulama Kovası', i: '💧', m: 'can' },
  { id: 'hoe', n: 'Çapa', i: '⚒️', m: 'hoe' },
  { id: 'lantern', n: 'Fener', i: '🪔', m: 'lantern' },
];
export const Z_FLOWERS = [
  { n: 'Lale', col: '#ff4f6d' }, { n: 'Papatya', col: '#ffffff' }, { n: 'Nergis', col: '#ffd93b' },
  { n: 'Sümbül', col: '#b58cff' }, { n: 'Gül', col: '#e8222f' }, { n: 'Unutmabeni', col: '#6aa8ff' },
];
export const Z_TREES = {
  oak: { n: 'Meşe', t: 1 }, pine: { n: 'Çam', t: 2 },
  apple: { n: 'Elma Ağacı', t: 1, fruit: 'apple', col: '#e23b3b', s: [1, 2] },
  orange: { n: 'Portakal Ağacı', t: 1, fruit: 'orange', col: '#ff9a1f', s: [3, 0] },
  cherry: { n: 'Kiraz Ağacı', t: 1, fruit: 'cherry', col: '#c4122f', s: [0, 1] },
};
export const Z_SEAS = ['İlkbahar', 'Yaz', 'Sonbahar', 'Kış'];
export const Z_FISH = [
  { id: 'hamsi', n: 'Hamsi', i: '🐟', sell: 120, w: 10, h: [0, 24], s: [2, 3] },
  { id: 'istavrit', n: 'İstavrit', i: '🐟', sell: 160, w: 8, h: [5, 22] },
  { id: 'sazan', n: 'Sazan', i: '🐠', sell: 220, w: 7, h: [4, 21], s: [0, 1, 2] },
  { id: 'kefal', n: 'Kefal', i: '🐟', sell: 280, w: 6, h: [8, 20] },
  { id: 'cipura', n: 'Çipura', i: '🐠', sell: 520, w: 4, h: [9, 17], s: [0, 1, 2] },
  { id: 'levrek', n: 'Levrek', i: '🐟', sell: 480, w: 4, h: [16, 6], s: [2, 3, 0] },
  { id: 'lufer', n: 'Lüfer', i: '🐡', sell: 700, w: 3, h: [18, 5], s: [2, 3] },
  { id: 'mercan', n: 'Mercan', i: '🐠', sell: 900, w: 2, h: [6, 12], s: [0, 1] },
  { id: 'ton', n: 'Ton Balığı', i: '🐟', sell: 2800, w: 1, h: [4, 9], s: [1, 2] },
  { id: 'kilic', n: 'Kılıç Balığı', i: '🐡', sell: 4200, w: 0.6, h: [16, 4], s: [2, 3] },
  { id: 'alabalik', n: 'Alabalık', i: '🐟', sell: 650, w: 3, h: [5, 20], s: [0, 3] },
  { id: 'palamut', n: 'Palamut', i: '🐟', sell: 750, w: 3, h: [6, 18], s: [2] },
  { id: 'ahtapot', n: 'Ahtapot', i: '🐙', sell: 1500, w: 1.5, h: [18, 6], s: [1] },
  { id: 'mersin', n: 'Mersin Balığı', i: '🐠', sell: 3600, w: 0.7, h: [0, 24], s: [3] },
  { id: 'cizme', n: 'Eski Çizme', i: '🥾', sell: 10, w: 2.5, h: [0, 24], junk: 1 },
  { id: 'teneke', n: 'Teneke Kutu', i: '🥫', sell: 5, w: 2.5, h: [0, 24], junk: 1 },
];
export const Z_BUGS = [
  { id: 'kelebek', n: 'Kelebek', i: '🦋', sell: 160, w: 8, h: [6, 19], fly: 1, s: [0, 1, 2] },
  { id: 'ugur', n: 'Uğur Böceği', i: '🐞', sell: 200, w: 5, h: [6, 18], s: [0, 1, 2] },
  { id: 'cekirge', n: 'Çekirge', i: '🦗', sell: 160, w: 6, h: [6, 19], hop: 1, s: [1, 2] },
  { id: 'karinca', n: 'Karınca', i: '🐜', sell: 80, w: 6, h: [0, 24] },
  { id: 'gece', n: 'Gece Kelebeği', i: '🦋', sell: 130, w: 6, h: [19, 4], fly: 1, s: [1, 2] },
  { id: 'atesboc', n: 'Ateş Böceği', i: '✨', sell: 300, w: 5, h: [19, 4], fly: 1, glow: 1, s: [1] },
  { id: 'circir', n: 'Cırcır Böceği', i: '🦗', sell: 130, w: 5, h: [18, 8], hop: 1, s: [1, 2] },
  { id: 'gergedan', n: 'Gergedan Böceği', i: '🪲', sell: 800, w: 1.5, h: [8, 18], s: [1] },
  { id: 'ari', n: 'Arı', i: '🐝', sell: 220, w: 6, h: [8, 18], fly: 1, s: [0, 1] },
  { id: 'tirtil', n: 'Tırtıl', i: '🐛', sell: 140, w: 5, h: [6, 19], s: [0, 2] },
  { id: 'orumcek', n: 'Örümcek', i: '🕷️', sell: 350, w: 3, h: [18, 6], s: [2, 3] },
  { id: 'kisguve', n: 'Kış Güvesi', i: '❄️', sell: 450, w: 4, h: [0, 24], fly: 1, s: [3] },
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
  trophy: { n: 'Altın Kupa', i: '🏆', buy: 0, r: 0.3 },   // yalnızca ödül
  well: { n: 'Kuyu', i: '🪣', buy: 1800, r: 0.85 },
  scarecrow: { n: 'Korkuluk', i: '🧑‍🌾', buy: 700, r: 0.3 },
  mailbox: { n: 'Posta Kutusu', i: '📮', buy: 350, r: 0.25 },
  haybale: { n: 'Saman Balyası', i: '🟨', buy: 250, r: 0.55 },
  barrel: { n: 'Fıçı', i: '🛢️', buy: 250, r: 0.4 },
  crate: { n: 'Sandık', i: '📦', buy: 250, r: 0.42 },
  arch: { n: 'Gül Kemeri', i: '🌹', buy: 1500, r: 0 },
  flowerbed: { n: 'Çiçek Tarhı', i: '💐', buy: 600, r: 0 },
  stepstone: { n: 'Basamak Taşı', i: '⚪', buy: 100, r: 0, flat: 1 },
};
export const Z_RECIPES = [
  { out: 'f_chair', need: { wood: 3 } }, { out: 'f_bench', need: { wood: 5 } }, { out: 'f_table', need: { wood: 6 } },
  { out: 'f_fence', n: 2, need: { wood: 2 } }, { out: 'f_campfire', need: { wood: 3, stone: 2 } }, { out: 'f_pot', need: { clay: 4 } },
  { out: 'f_lamp', need: { iron: 2, wood: 2 } }, { out: 'f_rug', need: { weed: 10 } }, { out: 'f_umbrella', need: { wood: 3, weed: 5 } },
  { out: 'f_fountain', need: { stone: 10, clay: 5 } },
  { out: 'f_barrel', need: { plank: 3 } }, { out: 'f_crate', need: { plank: 4 } }, { out: 'f_mailbox', need: { plank: 2, iron: 1 } },
  { out: 'f_scarecrow', need: { plank: 2, weed: 8 } }, { out: 'f_haybale', need: { weed: 15 } }, { out: 'f_arch', need: { plank: 6, weed: 8 } },
  { out: 'f_flowerbed', need: { plank: 4, clay: 2 } }, { out: 'f_stepstone', n: 4, need: { stone: 3 } }, { out: 'f_well', need: { brick: 12, plank: 4 } },
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
Z_ITEMS.f_trophy.sell = 2000;
zit('dirt', 'Toprak', '🟤', 4, { land: 1 });
for (const k of Object.keys(Z_CROPS)) {
  const C = Z_CROPS[k];
  zit('cs_' + k, C.n + ' Tohumu', '🌱', Math.round(C.seed / 3), { buy: C.seed, crop: k });
  zit(k, C.n, C.i, C.sell, { harvest: 1, eat: ['tomato', 'carrot', 'strawberry'].includes(k) ? 1 : 0 });
}
for (const [id, n, i, sell] of Z_GOODS) zit(id, n, i, sell, { good: 1, eat: ['bread', 'pie', 'tart', 'pudding'].includes(id) ? 1 : 0 });

const Z_VILL = [
  { name: 'Defne', bday: 0, female: true, pers: 'neşeli', fav: 'flower', look: { skin: '#f1c8a0', hair: '#6b3a1e', hs: 3, outfit: 2, shirt: '#ff8fb1', pants: '#4d5b8c', hat: 0 } },
  { name: 'Kerem', bday: 5, female: false, pers: 'tembel', fav: 'fish', look: { skin: '#e0ac80', hair: '#2a1a10', hs: 0, outfit: 0, shirt: '#5aa86a', pants: '#3a3f55', hat: 1, hatCol: '#c9503c' } },
  { name: 'Nermin', bday: 6, female: true, pers: 'sevecen', fav: 'fruit', look: { skin: '#e8b48a', hair: '#cfcfd6', hs: 3, outfit: 1, shirt: '#a77bd6', pants: '#5a4632', hat: 0 } },
  { name: 'Berkin', bday: 8, female: false, pers: 'huysuz', fav: 'bug', look: { skin: '#c98f65', hair: '#1c1410', hs: 4, outfit: 3, shirt: '#e8a23c', pants: '#2f4f7a', hat: 3, hatCol: '#3b6ea8' } },
  { name: 'Selin', bday: 11, female: true, pers: 'maceracı', fav: 'fos', look: { skin: '#8f5c3b', hair: '#241812', hs: 6, outfit: 0, shirt: '#3fb8c0', pants: '#6b4a2e', hat: 2, hatCol: '#e8d28a' } },
];
const Z_TALK = {
  neşeli: ['Bugün hava ne kadar güzel! Adada her gün tatil gibi.', 'Çiçekleri çok seviyorum! Sen de dikiyorsun, duydum.', 'Bir ara pikniğe çıkalım mı? Ben yemişleri getiririm!'],
  tembel: ['Hımm… Bugün çok yoruldum. Aslında hiçbir şey yapmadım.', 'Balık tutmak gibisi yok. Sadece otur, bekle…', 'Uykum geldi. Ama önce bir şeyler atıştırsam…'],
  sevecen: ['Hoş geldin canım! Aç mısın? Bir şeyler hazırlayayım mı?', 'Adayı ne kadar güzelleştirdin, gurur duydum!', 'Bahçende yeni çiçekler gördüm, çok sevindim.'],
  huysuz: ['Hmph. Yine mi sen? Neyse… selam.', 'Şu böcekler beni deli ediyor. Hiçbir faydaları yok!', 'Çit yok, yol yok… Bu adaya biraz düzen lazım.'],
  maceracı: ['Dün kıyıda garip bir iz gördüm. Fosil olabilir, kürek al!', 'Haritada hâlâ keşfedilmemiş yerler var, hissediyorum.', 'Seninle ada turu atmaya ne dersin?'],
  çalışkan: ['İş var, güç var! Konuşurken bile elim boş durmuyor.', 'Çalışmak insanı genç tutar derler, doğru mu bilmiyorum ama ben böyle severim.', 'Ada güzelleştikçe işimiz de artıyor, hiç şikâyetçi değilim!'],
};
export const Z_SHOP_OPEN = [7, 22];
const zPoss = (n) => n + (/[aeıioöuü]$/i.test(n) ? '\'nin' : '\'in');
export const Z_FEST = [
  { id: 'cicek', n: 'Çiçek Şenliği', i: '🌸', d: 'Çiçekler bugün 1,5 kat değerinde. Köylüler tohum dağıtıyor, herkes meydanda.' },
  { id: 'balik', n: 'Balık Yarışması', i: '🎣', d: '08:00–18:00 arası en değerli balıkları tutan kazanır. Zil ve Altın Kupa ödülü var!' },
  { id: 'hasat', n: 'Hasat Şenliği', i: '🍎', d: 'Meyveler bugün 2 kat değerinde. Köylüler meyve takasına çıkıyor.' },
  { id: 'kis', n: 'Kış Işıkları Gecesi', i: '🏮', d: 'Meydan ışıklarla süsleniyor. Hediyeler bugün iki kat sevdirir.' },
];
const Z_FEST_TALK = {
  cicek: 'Şenlikte çiçekler çok değerli, tohumları ihmal etme!', balik: 'Yarışmaya hazır mısın? Bu kez seni yenerim!',
  hasat: 'Bu yıl meyveler çok bereketli, değil mi?', kis: 'Meydandaki ışıklar ne güzel parlıyor!',
};
// koleksiyon ödülleri: türleri keşfettikçe (Rehber)
export const Z_MILE = [
  { cat: 'fish', n: 4, zil: 1500 }, { cat: 'fish', n: 8, zil: 4000, item: 'f_lamp' }, { cat: 'fish', n: 'all', zil: 10000, item: 'f_trophy' },
  { cat: 'bug', n: 4, zil: 1000 }, { cat: 'bug', n: 8, zil: 3000, item: 'f_umbrella' }, { cat: 'bug', n: 'all', zil: 9000, item: 'f_trophy' },
  { cat: 'fos', n: 2, zil: 2000 }, { cat: 'fos', n: 4, zil: 5000, item: 'f_fountain' }, { cat: 'fos', n: 'all', zil: 9000, item: 'f_trophy' },
];
export const Z_WALLS = [['#f1e3c6', 'Krem'], ['#f4d6e0', 'Pembe'], ['#d6e8f4', 'Mavi'], ['#dcefd2', 'Yeşil'], ['#3b3f5c', 'Gece']];
export const Z_FLOORS = [['#b98a5b', 'Ahşap'], ['#8d9aa3', 'Taş'], ['#e8d9b0', 'Hasır'], ['#5b4636', 'Koyu']];
export const Z_HOME_SLOTS = 6;
export const Z_LAND_COST = 3, Z_LAND_H = 1.5;   // bir kara hücresi için toprak parçası, yeni karanın yüksekliği

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
    this.p = { x: 0, z: 8, y: 0, ang: 0, vx: 0, vz: 0, tool: 0, held: null, moving: false, speed: 0, act: null, fish: null, stuck: 0, lit: true, inT: 0 };
    this.bag = {}; this.obj = new Map(); this.trees = new Map(); this.bugs = []; this.vill = []; this.builds = [];
    this.seen = { fish: {}, bug: {}, fos: {} };
    this.stats = { fish: 0, bugs: 0, fos: 0, trees: 0, planted: 0, earned: 0, talks: 0, gifts: 0, harvest: 0, tilled: 0, land: 0, crafted: 0, built: 0 };
    this.qdone = {}; this.npcs = []; this._qT = 0; this.mach = {};
    for (const id of Z_MACH_ORDER) this.mach[id] = { built: false, q: [], out: {} };
    this.stock = []; this.rainDay = false; this.rainSpan = [0, 0]; this.rainNow = false; this.rainWet = false;
    this.season = 0; this.mile = {}; this.home = Cozy.defaultHome(); this.contest = null;
    this.reserved = new Set(); this.path = []; this.pathAct = false; this.stars = 1; this.score = 0; this._tick = 0; this._bugT = 0; this._sleepReq = false; this._id = 1;
  }
  static defaultHome() { return { wall: 0, floor: 0, slots: new Array(Z_HOME_SLOTS).fill(null) }; }
  static fixHome(h) {
    const o = Cozy.defaultHome(); if (!h) return o;
    o.wall = zclamp(h.wall | 0, 0, Z_WALLS.length - 1); o.floor = zclamp(h.floor | 0, 0, Z_FLOORS.length - 1);
    for (let i = 0; i < Z_HOME_SLOTS; i++) { const id = h.slots && h.slots[i]; o.slots[i] = id && Z_ITEMS[id] && Z_ITEMS[id].furn ? id : null; }
    return o;
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
      b('board', 'board', 0, 1, 1.1, 0.25, { door: { x: 0, z: 2.2 } }),
      b('craft', 'craft', 5, 3.5, 0.9, 0.5, { door: { x: 5, z: 5 } }),
      b('vhome', 'v0', -28, 4, 1.6, 1.5, { vi: 0, wall: '#f4d6e0', roof: '#7a5ac7' }),
      b('vhome', 'v1', 24, 9, 1.6, 1.5, { vi: 1, wall: '#d6e8f4', roof: '#3f8a5a' }),
      b('vhome', 'v2', 3, 25, 1.6, 1.5, { vi: 2, wall: '#f6ecc8', roof: '#c25a3c' }),
      b('vhome', 'v3', -8, -26, 1.6, 1.5, { vi: 3, wall: '#e0d4c0', roof: '#3a5f9c' }),
      b('vhome', 'v4', -30, -18, 1.6, 1.5, { vi: 4, wall: '#cfeaf0', roof: '#d19b2a' }),
    ];
    for (const id of Z_MACH_ORDER) { const M = Z_MACH[id]; this.builds.push(b('mach', 'm_' + id, M.pos[0], M.pos[1], M.hx, M.hz, { m: id })); }
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
    this._flatten(Z_FARM.x, Z_FARM.z, 5, 9, zclamp(W.getHeight(Z_FARM.x, Z_FARM.z), 1.6, 3.0));
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
    this._addNpcs(); this._settle(true);
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
    this.add('cs_wheat', 5); this.add('cs_carrot', 4);
    this.rating();
    this.say('Adana hoş geldin, ' + this.name + '! 🏝️');
    this._announceDay();
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
    if (o && (o.t === 'rock' || o.t === 'stump' || (o.t === 'furn' && Z_FURN[o.id].r > 0))) return false;
    // büyük eşyalar (kuyu, çeşme) komşu hücreye de taşar: oraya yol çizme, oyuncu orada takılır
    for (let j = cz - 1; j <= cz + 1; j++) for (let i = cx - 1; i <= cx + 1; i++) {
      const n = (i !== cx || j !== cz) && this.obj.get(j * N + i);
      if (!n) continue;
      const rad = n.t === 'rock' ? 0.62 : n.t === 'stump' ? 0.3 : n.t === 'furn' ? Z_FURN[n.id].r : 0;
      if (rad > 0) { const q = this.cellPos(j * N + i); if (Math.hypot(p.x - q.x, p.z - q.z) < rad + 0.3) return false; }
    }
    return true;
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
    return { seeds, saps, crops: Object.keys(Z_CROPS).map((k) => 'cs_' + k), furn: this.stock };
  }
  _restock() {
    const all = Object.keys(Z_FURN).filter((k) => Z_FURN[k].buy > 0).map((k) => 'f_' + k);
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
  // şenlik günlerinde bazı eşyalar daha değerli
  price(id) {
    const it = Z_ITEMS[id]; if (!it) return 0;
    const f = this.festOn();
    return Math.round(it.sell * (f && f.id === 'cicek' && it.flower !== undefined ? 1.5 : f && f.id === 'hasat' && it.eat ? 2 : 1));
  }
  sell(id, n = 1) {
    const it = Z_ITEMS[id]; n = Math.min(n, this.count(id));
    if (!it || n <= 0) return 0;
    const g = this.price(id) * n;
    this.take(id, n); this.earn(g); return g;
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
    this.add(r.out, r.n || 1); this.stats.crafted++;
    return { ok: true, msg: Z_ITEMS[r.out].i + ' ' + Z_ITEMS[r.out].n + ' yapıldı!' };
  }
  selectTool(i) { const p = this.p; if (p.fish) return; p.tool = zclamp(i | 0, 0, Z_TOOLS.length - 1); p.held = null; }
  hold(id) {
    if (!this.count(id)) return false;
    const it = Z_ITEMS[id];
    if (it.eat) { this.take(id, 1); this.say('Mmm, ' + it.n + ' çok lezzetliydi! 😋'); this.ev({ t: 'eat' }); return true; }
    if (!(it.plant !== undefined || it.sap || it.furn || it.land || it.crop)) { this.say(it.i + ' ' + it.n + ' — dükkânda satabilirsin.'); return false; }
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
  _plantable(o) { return o.t === 'flower' || o.t === 'sap' || (o.t === 'till' && !!o.crop); }
  _ripe(o) { return o.t === 'till' && !!o.crop && o.stage >= Z_CROPS[o.crop].days; }
  _tillable(c) {
    if (c < 0) return false;
    const cx = c % N, cz = (c / N) | 0, W = this.world;
    if (cx < 5 || cz < 5 || cx >= N - 5 || cz >= N - 5 || W.treeT[c] || this.reserved.has(c)) return false;
    const o = this.obj.get(c);
    if (o && o.t !== 'weed' && o.t !== 'hole') return false;
    if (W.cellH(cx, cz) < 1.0 || W.cellRange(cx, cz) > 0.9 || (W.soil[c] !== SOIL.GRASS && W.soil[c] !== SOIL.DIRT)) return false;
    const q = this.cellPos(c);
    return !this.inBuild(q.x, q.z, 0.4);
  }
  _till(c) {   // toprağı sür: koyu bir tarla hücresi olur
    const q = this.cellPos(c);
    this.obj.set(c, { t: 'till', crop: null, stage: 0, wet: false });
    this.world.paintSoil(SOIL.DIRT, q.x, q.z, 0.5);
  }
  _untill(c) {
    const W = this.world, cx = c % N, cz = (c / N) | 0;
    this.obj.delete(c);
    W.soil[c] = SOIL.GRASS; W.auto[c] = 1; W.classify(c, W.cellH(cx, cz)); W.markCell(cx, cz);
  }
  _sow(c, it) {
    const p = this.p, o = this.obj.get(c), C = Z_CROPS[it.crop];
    if (!o || o.t !== 'till') { this.say('Tohum çapayla sürülmüş toprağa ekilir. Önce çapayı (7) seçip toprağı sür!'); return; }
    if (o.crop) { this.say('Burada zaten bir ekin var.'); return; }
    o.crop = it.crop; o.stage = 0; o.wet = false;
    this.stats.planted++; this.take(it.id, 1); p.act = { type: 'dig', t: 0, dur: 0.5 };
    const q = this.cellPos(c); this.ev({ t: 'dig', x: q.x, z: q.z });
    if (!this._inSeason(C)) this.say('⚠️ ' + C.n + ' şu an mevsiminde değil; ' + C.s.map((i) => Z_SEAS[i]).join(' / ') + ' gelince büyür.');
  }
  _harvest(n) {
    const o = n.o, C = Z_CROPS[o.crop], cnt = C.y[0] + ((zrnd() * (C.y[1] - C.y[0] + 1)) | 0);
    this.give(o.crop, cnt, n.x, n.z); this.stats.harvest += cnt;
    if (zrnd() < 0.15) this.give('cs_' + o.crop, 1, n.x, n.z);
    if (C.regrow) o.stage = C.days - C.regrow; else { o.crop = null; o.stage = 0; }
    o.wet = false; this.ev({ t: 'puff', x: n.x, z: n.z });
    this.say(C.i + ' ' + C.n + ' ×' + cnt + ' hasat ettin!');
  }
  // arazi genişletme: kıyıdaki sığ suya toprak dök
  _fillable(c) {
    if (c < 0) return false;
    const W = this.world, cx = c % N, cz = (c / N) | 0;
    if (cx < 12 || cz < 12 || cx >= N - 12 || cz >= N - 12) return false;
    const h = W.cellH(cx, cz);
    if (h > SEA + 0.25 || h < SEA - 3.2) return false;
    return this._landNb(cx, cz) > SEA + 0.35;
  }
  // bir hücrenin komşuları arasındaki en yüksek kara yüksekliği
  _landNb(cx, cz) {
    let m = -9;
    for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) if (dx || dz) m = Math.max(m, this.world.cellH(cx + dx, cz + dz));
    return m;
  }
  _landSpot() {
    const p = this.p;
    for (let d = 0.9; d <= 3.4; d += 0.4) { const c = this.cellOf(p.x + Math.sin(p.ang) * d, p.z + Math.cos(p.ang) * d); if (this._fillable(c)) return c; }
    return -1;
  }
  _fillLand(c) {
    const p = this.p, W = this.world;
    if (!this._fillable(c)) { this.say('Toprak yalnızca kıyıdaki sığ suya dökülür.'); return; }
    if (this.count('dirt') < Z_LAND_COST) { this.say('Toprak yetmiyor: ' + Z_LAND_COST + ' parça lazım (sende ' + this.count('dirt') + '). Kürekle kazarak topla!'); return; }
    const cx = c % N, cz = (c / N) | 0, H = W.H, VN = N + 1;
    const hh = Math.max(1.05, Math.min(Z_LAND_H, this._landNb(cx, cz) + 0.3));   // tarla olabilecek kadar yüksek, komşu karaya yakın
    // yeni kara + iki halka yumuşak yamaç (dik kayalık görünmesin)
    for (let vz = cz - 2; vz <= cz + 3; vz++) for (let vx = cx - 2; vx <= cx + 3; vx++) {
      if (vx < 0 || vz < 0 || vx > N || vz > N) continue;
      const d = Math.max(vx < cx ? cx - vx : vx > cx + 1 ? vx - cx - 1 : 0, vz < cz ? cz - vz : vz > cz + 1 ? vz - cz - 1 : 0);
      const i = vz * VN + vx, t = hh - 0.95 * d;
      if (H[i] < t) H[i] = t;
    }
    W.afterEdit(cx - 3, cx + 3, cz - 3, cz + 3); W.waterDirty = true;
    const q = this.cellPos(c); W.paintSoil(SOIL.GRASS, q.x, q.z, 0.5);   // yeni kara çimen olsun, çapayla sürülebilsin
    this.take('dirt', Z_LAND_COST); this.stats.land++;
    p.act = { type: 'dig', t: 0, dur: 0.6 };
    this.ev({ t: 'dig', x: q.x, z: q.z }); this.ev({ t: 'splash', x: q.x, z: q.z });
    if (this.stats.land === 1) this.say('🏝️ Ada büyüyor! Yeni kara parçasını tarla ya da bahçe yapabilirsin.');
  }


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
    for (const v of this.folk()) {
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
    if (p.fish) return { kind: 'reel', text: p.fish.st === 'bite' ? 'ÇEK!' : p.fish.st === 'fight' ? 'ŞİMDİ!' : 'Oltayı çek' };
    if (p.held) {
      const it = Z_ITEMS[p.held];
      if (it.land) {
        const w = this._landSpot();
        return w >= 0 ? { kind: 'place', c: w, text: '🟤 Toprak dök · kara kazan (' + Math.min(this.count('dirt'), Z_LAND_COST) + '/' + Z_LAND_COST + ')' } : { kind: 'nothing', text: 'Dökmek için kıyıdaki sığ suya bak' };
      }
      if (it.crop) return { kind: 'place', c: fc, text: it.i + ' Ek (sürülmüş toprağa)' };
      return { kind: 'place', c: fc, text: it.i + ' ' + (it.furn ? 'Yerleştir' : 'Ek') };
    }
    const v = this._facingVillager();
    if (v) return { kind: 'talk', v, text: v.name + ' ile konuş' };
    for (const b of this.builds) {
      if (b.t === 'vhome') continue;
      if (Math.hypot(p.x - b.door.x, p.z - b.door.z) < 1.5 + (b.t === 'board' ? 0.4 : 0)) {
        return { kind: b.t, b, text: b.t === 'mach' ? (this.machBuilt(b.m) ? Z_MACH[b.m].i + ' ' + Z_MACH[b.m].n : '🏗️ Şantiye: ' + Z_MACH[b.m].n + ' inşa et') : b.t === 'shop' ? 'Dükkâna gir' : b.t === 'home' ? 'Evine gir (uyu / görünüm)' : b.t === 'craft' ? 'Yapım tezgâhı' : 'Ada panosu' };
      }
    }
    const near = this._nearObj(f.x, f.z, 1.15, () => true);
    if (T === 'hand') {
      if (near && this._ripe(near.o)) return { kind: 'harvest', near, text: Z_CROPS[near.o.crop].i + ' ' + Z_CROPS[near.o.crop].n + ' hasat et' };
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
      const fo = this.obj.get(fc);
      if (fo && fo.t === 'till') return { kind: 'untill', near: { c: fc, o: fo, ...this.cellPos(fc) }, text: fo.crop ? 'Ekini sök' : 'Tarlayı düzle' };
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
    if (T === 'hoe') {
      const fo = this.obj.get(fc);
      if (fo && fo.t === 'till') {
        if (this._ripe(fo)) return { kind: 'harvest', near: { c: fc, o: fo, ...this.cellPos(fc) }, text: Z_CROPS[fo.crop].i + ' ' + Z_CROPS[fo.crop].n + ' hasat et' };
        return { kind: 'nothing', text: fo.crop ? Z_CROPS[fo.crop].i + ' büyüyor (' + fo.stage + '/' + Z_CROPS[fo.crop].days + ')' : 'Sürülmüş toprak — tohum ek' };
      }
      if (this._tillable(fc)) return { kind: 'till', c: fc, text: 'Toprağı sür' };
      return { kind: 'nothing', text: fc >= 0 && this.reserved.has(fc) ? 'Yol ve yapı çevresi sürülmez' : 'Burası sürülemez' };
    }
    if (T === 'lantern') return { kind: 'lamp', text: p.lit ? 'Feneri söndür' : 'Feneri yak' };
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
      case 'shop': case 'home': case 'craft': case 'board': case 'mach': return t;
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
        this.give('dirt', 1, q.x, q.z);
        if (zrnd() < 0.08) this.give('clay', 1, q.x, q.z);
        break;
      }
      case 'cast': this._cast(t.w); break;
      case 'net': act('net', 0.55); this._net(); break;
      case 'water': this._water(t.near); act('water', 0.8); break;
      case 'till': {
        const q = this.cellPos(t.c), o = this.obj.get(t.c);
        if (o && o.t === 'weed') this.give('weed', 1, q.x, q.z);
        this._till(t.c); this.stats.tilled++; act('dig', 0.55); this.ev({ t: 'dig', x: q.x, z: q.z });
        if (this.stats.tilled === 1) this.say('⚒️ Toprak sürüldü! Şimdi tohum eline al, ek ve sula.');
        break;
      }
      case 'untill': {
        const n = t.near; if (n.o.crop) this.give('cs_' + n.o.crop, 1, n.x, n.z);
        this._untill(n.c); act('dig', 0.55); this.ev({ t: 'dig', x: n.x, z: n.z }); break;
      }
      case 'harvest': this._harvest(t.near); act('pick', 0.6); break;
      case 'lamp': p.lit = !p.lit; this.say(p.lit ? '🪔 Fener yandı' : '🪔 Fener söndü'); break;
      default: break;
    }
    return null;
  }

  _place(c) {
    const p = this.p, id = p.held, it = Z_ITEMS[id], W = this.world;
    if (!it || !this.count(id) || c < 0) { p.held = null; return; }
    const cx = c % N, cz = (c / N) | 0, pos = this.cellPos(c);
    const o = this.obj.get(c);
    if (it.land) { this._fillLand(c); return; }
    if (it.crop) { this._sow(c, it); return; }
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
    const list = Z_FISH.filter((f) => zhours(this.hour, f.h) && this._inSeason(f));
    let tot = 0; for (const f of list) tot += f.w;
    let r = zrnd() * tot;
    for (const f of list) { r -= f.w; if (r <= 0) return f; }
    return list[0];
  }
  // zorluk: pahalı balık = dar bölge, hızlı ibre, daha çok vuruş
  _fightOf(F) {
    if (F.junk) return null;
    return F.sell <= 300 ? { need: 1, zone: 0.34, speed: 0.85, time: 6 } : F.sell <= 900 ? { need: 2, zone: 0.27, speed: 1.2, time: 7 } : { need: 3, zone: 0.22, speed: 1.55, time: 8 };
  }
  _reel() {
    const f = this.p.fish; if (!f) return;
    if (f.st === 'bite') {
      const d = this._fightOf(f.fid);
      if (!d) { f.st = 'reel'; f.t = 0; this.p.act = { type: 'reel', t: 0, dur: 0.8 }; }
      else {
        Object.assign(f, { st: 'fight', t: 0, d, hits: 0, miss: 0, pos: 0, dir: 1, zone: zrange(0.05, 0.95 - d.zone) });
        this.p.act = { type: 'reel', t: 0, dur: 0.5 }; this.ev({ t: 'fight' });
      }
    } else if (f.st === 'fight') {
      const hit = f.pos >= f.zone && f.pos <= f.zone + f.d.zone;
      this.ev({ t: 'hook', ok: hit ? 1 : 0 });
      this.p.act = { type: 'reel', t: 0, dur: 0.3 };
      if (hit) {
        f.hits++;
        if (f.hits >= f.d.need) { f.st = 'reel'; f.t = 0; this.p.act = { type: 'reel', t: 0, dur: 0.8 }; }
        else f.zone = zrange(0.05, 0.95 - f.d.zone);
      } else if (++f.miss >= 3) { this.say('Olta koptu, balık kaçtı… 😢'); this.p.fish = null; }
    } else if (f.st === 'wait' || f.st === 'cast') { this.say('Çok erken çektin! 🎣'); this.p.fish = null; this.p.act = { type: 'reel', t: 0, dur: 0.4 }; }
  }
  _fishing(dt) {
    const p = this.p, f = p.fish; if (!f) return;
    f.t += dt;
    if (f.st === 'cast') { if (f.t > 0.65) { f.st = 'wait'; f.t = 0; f.wait = zrange(1.6, 5.2); this.ev({ t: 'splash', x: f.x, z: f.z }); } }
    else if (f.st === 'wait') { if (f.t > f.wait) { f.st = 'bite'; f.t = 0; f.fid = this._pickFish(); this.ev({ t: 'splash', x: f.x, z: f.z }); this.ev({ t: 'bite' }); } }
    else if (f.st === 'bite') { if (f.t > 1.15) { this.say('Balık kaçtı… 😢'); p.fish = null; } }
    else if (f.st === 'fight') {
      f.pos += f.dir * f.d.speed * dt;
      if (f.pos >= 1) { f.pos = 1; f.dir = -1; } else if (f.pos <= 0) { f.pos = 0; f.dir = 1; }
      if (f.t > f.d.time) { this.say('Balık kurtuldu… 😢'); p.fish = null; }
    }
    else if (f.st === 'reel' && f.t > 0.75) {
      const F = f.fid; p.fish = null;
      this.give('fish_' + F.id, 1, p.x, p.z);
      if (!F.junk) { this.stats.fish++; this._contestAdd(F); }
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
      const list = Z_BUGS.filter((b) => zhours(this.hour, b.h) && this._inSeason(b));
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
      if (b.life <= 0 || dp > 34 || !zhours(this.hour, B.h) || !this._inSeason(B)) { this.bugs.splice(i, 1); continue; }
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
      inside: false, path: [], repath: 0, talking: false, friend: 0, talked: 0, gifted: 0, quest: null, rew: 0, phase: zrnd() * 6.28, td: {}, sr: 0, tn: 0, say: '', sayT: 0,
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
    const g = this.hour < 11 ? 'Günaydın' : this.hour < 18 ? 'Merhaba' : 'İyi akşamlar', f = this.festOn(), first = !v.talked;
    if (first) { v.talked = 1; v.friend = Math.min(100, v.friend + 3); this.stats.talks++; }
    v.sayT = 0;
    let line = g + ' ' + this.name + '! ';
    if (this.isBday(v)) line += 'Bugün benim doğum günüm! 🎂 Bir hediye getirdin mi acaba?';
    else if (f && zrnd() < 0.5) line += Z_FEST_TALK[f.id];
    else line += zpick(Z_TALK[v.pers]);
    return line + (first ? this._festGift(v) : '');
  }
  _festGift(v) {   // şenlik günü ilk sohbette köylüden küçük bir armağan
    const f = this.festOn(); if (!f) return '';
    if (f.id === 'cicek') { const k = (zrnd() * Z_FLOWERS.length) | 0; this.give('seed_' + k, 3, v.x, v.z); return ' (🌱 ' + Z_FLOWERS[k].n + ' tohumu ×3 hediye etti)'; }
    if (f.id === 'hasat') { const fr = zpick(['apple', 'orange', 'cherry']); this.give(fr, 2, v.x, v.z); return ' (' + Z_ITEMS[fr].i + ' ' + Z_ITEMS[fr].n + ' ×2 hediye etti)'; }
    if (f.id === 'kis') { v.friend = Math.min(100, v.friend + 5); return ' (💗 Işıkların altında arkadaşlığınız güçlendi)'; }
    return '';
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
    const bd = this.isBday(v), f = this.festOn();
    v.gifted = 1; v.friend = Math.min(100, v.friend + (bd ? 20 : love ? 9 : 4) * (f && f.id === 'kis' ? 2 : 1)); this.stats.gifts++;
    this._friendRewards(v);
    let msg = love ? 'Vay, çok sevdim bunu! 💖' : 'Teşekkürler, ne düşüncelisin!';
    if (bd && !v.bdayDone) {
      v.bdayDone = 1;
      const fk = zpick(Object.keys(Z_FURN).filter((k) => k !== 'fountain' && Z_FURN[k].buy > 0));
      this.give('f_' + fk, 1, v.x, v.z);
      msg = 'Doğum günümü unutmadın! 🎂 Karşılığında sana ' + Z_FURN[fk].n + ' veriyorum.';
      this.say('🎂 ' + zPoss(v.name) + ' doğum gününü kutladın!');
    }
    return { ok: true, msg };
  }
  _friendRewards(v) {
    const lv = Math.floor(v.friend / 25);
    while (v.rew < lv) {
      v.rew++;
      const f = zpick(Object.keys(Z_FURN).filter((k) => k !== 'fountain' && Z_FURN[k].buy > 0));
      if (this.add('f_' + f, 1)) this.say('🎁 ' + v.name + ' sana ' + Z_FURN[f].n + ' hediye etti!');
    }
  }
  _villagers(dt) {
    const night = this.hour >= 22.5 || this.hour < 6.2, party = !!this.festOn() && this.hour >= 10 && this.hour < 21;
    for (const v of this.vill) {
      const home = this.builds.find((b) => b.id === v.home);
      v.y = this.world.getHeight(v.x, v.z); v.sayT = Math.max(0, v.sayT - dt);
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
          const gather = party && zrnd() < 0.85, around = gather || zrnd() < 0.55 ? { x: 2, z: 3 } : { x: v.x, z: v.z };
          for (let k = 0; k < 8; k++) {
            const a = zrnd() * 6.283, d = gather ? zrange(1.5, 5.5) : zrange(3, 12), x = around.x + Math.cos(a) * d, z = around.z + Math.sin(a) * d;
            if (this.blocked(x, z, 0.4) || this.world.getHeight(x, z) < 0.9) continue;
            const pth = this.findPath(v.x, v.z, x, z);
            if (pth && pth.length) { v.path = pth; break; }
          }
          v.wait = zrange(2, 7);
          if (zrnd() < 0.22 && Math.hypot(v.x - this.p.x, v.z - this.p.z) < 14) { v.say = zpick(Z_BARKS[v.pers] || Z_BARKS.neşeli); v.sayT = 4.5; }
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
      // yön: istenen yürüyüş yönü (duvara sürtünürken bir eksen sıfırlansa da dönmesin)
      if (!this.lockAng && sp2 > 0.3) p.ang = zang(p.ang, (tx || tz) ? Math.atan2(tx, tz) : Math.atan2(p.vx, p.vz), Math.min(1, dt * 14));
      if (this.path.length && sp2 < 0.2 && mag > 0.05) { p.stuck += dt; if (p.stuck > 0.7) { this.path = []; p.stuck = 0; } } else p.stuck = 0;
    }
    p.moving = sp2 > 0.3; p.speed = sp2;
    p.y = Math.max(W.getHeight(p.x, p.z), SEA - 0.28);
    // bir şeyin içine hapsolduysa (ör. üstüne mobilya ya da kara yükselmesi) birkaç saniye sonra kendiliğinden kurtar
    if (!this.freeze && this.blocked(p.x, p.z, 0.1)) {
      p.inT += dt;
      if (p.inT > 1.5) { this.unstuck('near'); this.say('🆘 Sıkıştığını fark ettim, seni yakındaki boş bir yere taşıdım.'); }
    } else p.inT = 0;
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
    this._player(dt); this._fishing(dt); this._villagers(dt); this._npcs(dt); this._machs(dt); this._bugs(dt); this._pickups(); this._contestTick(); this._questTick(dt);
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
    if (this.contest && !this.contest.done) this._contestEnd();
    this.day++;
    const W = this.world;
    for (const v of this.vill) { v.talked = 0; v.gifted = 0; v.bdayDone = 0; v.talking = false; v.td = {}; if (v.quest && v.quest.done) this._newQuest(v); }
    for (const v of this.npcs) { v.talked = 0; v.gifted = 0; v.talking = false; v.td = {}; }
    for (const id of Z_MACH_ORDER) { const m = this.mach[id]; while (m.built && m.q.length) this._machFinish(id, Z_MACH[id], m); }   // uyurken atölyeler işini bitirir
    // büyüme
    for (const [c, o] of [...this.obj.entries()]) {
      if (o.t === 'hole') this.obj.delete(c);
      else if (o.t === 'flower') { if (o.wet && o.stage < 3) o.stage++; o.wet = false; }
      else if (o.t === 'till') { if (o.crop && o.wet) { const C = Z_CROPS[o.crop]; if (o.stage < C.days && this._inSeason(C)) o.stage++; } o.wet = false; }
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
      if (K && K.fruit && m.fruit === 0 && this._inSeason(K)) { m.reg--; if (m.reg <= 0) m.fruit = 3; }
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
    this._announceDay();
  }
  _arrivals() {
    if (this.stars >= 3 && this.vill.length < 4) this._addVillager(3);
    else if (this.stars >= 5 && this.vill.length < 5) this._addVillager(4);
  }

  /* ---------------------------------------------------------------- mevsim, takvim, şenlik */
  setSeason(s) { this.season = s | 0; }
  _inSeason(e) { return !e.s || e.s.includes(this.season); }
  yearDay(d = this.day) { return ((((d | 0) - 1) % 12) + 12) % 12; }   // yıl 12 gün: her mevsim 3 gün
  festOn(d = this.day) { const y = this.yearDay(d); return y % 3 === 1 ? Z_FEST[(y - 1) / 3] : null; }
  bdayOn(d = this.day) { const y = this.yearDay(d); return this.vill.filter((v) => Z_VILL[v.i].bday === y); }
  isBday(v) { const d = Z_VILL[v.i]; return !!d && d.bday === this.yearDay(); }
  upcoming(span = 12) {
    const out = [];
    for (let k = 0; k < span; k++) {
      const f = this.festOn(this.day + k);
      if (f) out.push({ in: k, text: f.i + ' ' + f.n });
      for (const v of this.bdayOn(this.day + k)) out.push({ in: k, text: '🎂 ' + zPoss(v.name) + ' doğum günü' });
    }
    return out;
  }
  _announceDay() {
    this.contest = null;
    const f = this.festOn();
    if (f) { this.say(f.i + ' Bugün ' + f.n + '! Meydana uğra.'); if (f.id === 'balik') this._contestInit(); }
    for (const v of this.bdayOn()) this.say('🎂 Bugün ' + zPoss(v.name) + ' doğum günü!');
  }
  _contestInit() {
    const rv = this.vill.map((v) => ({ i: v.i, name: v.name, score: 0, goal: Math.round(zrange(500, 2600) * (v.fav === 'fish' ? 1.5 : v.pers === 'tembel' ? 0.7 : 1) / 10) * 10 }));
    this.contest = { score: 0, fish: 0, done: false, rv, rank: -1, reward: 0 };
  }
  contestOn() { const c = this.contest; return !!c && !c.done && this.hour >= 8 && this.hour < 18; }
  _contestAdd(F) {
    if (!this.contestOn()) return;
    this.contest.score += F.sell; this.contest.fish++;
    this.say('🏁 Yarışma puanın: ' + this.contest.score);
  }
  _contestTick() {
    const c = this.contest; if (!c || c.done) return;
    const k = zclamp((this.hour - 8) / 10, 0, 1);
    for (const r of c.rv) r.score = Math.round(r.goal * k);
    if (this.hour >= 18) this._contestEnd();
  }
  contestBoard() {   // canlı sıralama
    const c = this.contest; if (!c) return [];
    return [{ you: 1, name: this.name, score: c.score }].concat(c.rv.map((r) => ({ name: r.name, score: r.score }))).sort((a, b) => b.score - a.score);
  }
  _contestEnd() {
    const c = this.contest; if (!c || c.done) return;
    for (const r of c.rv) r.score = r.goal;
    c.done = true;
    const all = this.contestBoard();
    c.rank = all.findIndex((x) => x.you);
    if (c.score <= 0) { this.say('🏁 Balık Yarışması bitti — katılmadın.'); return; }
    c.reward = [4000, 2000, 1000][c.rank] || 300; this.earn(c.reward);
    if (c.rank === 0) { this.give('f_trophy', 1, this.p.x, this.p.z); this.say('🏆 Balık Yarışması\'nı kazandın! +' + c.reward + ' 🔔 ve Altın Kupa'); }
    else this.say('🏁 Yarışma bitti: ' + (c.rank + 1) + '. oldun, +' + c.reward + ' 🔔');
    this.ev({ t: 'fanfare' });
  }

  /* ---------------------------------------------------------------- koleksiyon ödülleri (Rehber) */
  catTotal(cat) { return cat === 'fos' ? Z_FOSSILS.length : (cat === 'fish' ? Z_FISH : Z_BUGS).filter((e) => !e.junk).length; }
  seenCount(cat) {
    const book = this.seen[cat];
    return cat === 'fos' ? Z_FOSSILS.filter((e, k) => book[k]).length : (cat === 'fish' ? Z_FISH : Z_BUGS).filter((e) => !e.junk && book[e.id]).length;
  }
  milestones(cat) {
    const out = [];
    Z_MILE.forEach((m, i) => {
      if (cat && m.cat !== cat) return;
      const need = m.n === 'all' ? this.catTotal(m.cat) : m.n, have = this.seenCount(m.cat), done = !!this.mile[i];
      out.push({ i, cat: m.cat, need, have: Math.min(have, need), zil: m.zil, item: m.item, done, can: !done && have >= need });
    });
    return out;
  }
  claimMile(i) {
    const m = Z_MILE[i], st = m && this.milestones().find((x) => x.i === i);
    if (!st || st.done) return { ok: false, msg: 'Bu ödülü zaten aldın.' };
    if (!st.can) return { ok: false, msg: 'Henüz yeterince tür keşfetmedin.' };
    if (m.item && !this.canAdd(m.item)) return { ok: false, msg: 'Çantan dolu!' };
    this.mile[i] = 1; this.earn(m.zil); if (m.item) this.add(m.item, 1);
    const msg = '🏅 Koleksiyon ödülü: +' + m.zil + ' 🔔' + (m.item ? ' ve ' + Z_ITEMS[m.item].i + ' ' + Z_ITEMS[m.item].n : '');
    this.ev({ t: 'fanfare' });
    return { ok: true, msg };
  }

  /* ---------------------------------------------------------------- ev içi döşeme */
  homeCount() { return this.home.slots.filter(Boolean).length; }
  homePut(slot, id) {
    const H = this.home, it = Z_ITEMS[id];
    if (!(slot >= 0 && slot < H.slots.length) || !it || !it.furn || this.count(id) < 1) return { ok: false, msg: 'Bu eşya yerleştirilemez.' };
    const old = H.slots[slot];
    this.take(id, 1);
    if (old && !this.add(old, 1)) { this.add(id, 1); return { ok: false, msg: 'Çantan dolu!' }; }
    H.slots[slot] = id;
    return { ok: true, msg: it.i + ' ' + it.n + ' evine yerleşti.' };
  }
  homeTake(slot) {
    const H = this.home, id = H.slots[slot];
    if (!id) return { ok: false, msg: 'Burası boş.' };
    if (!this.add(id, 1)) return { ok: false, msg: 'Çantan dolu!' };
    H.slots[slot] = null;
    return { ok: true, msg: Z_ITEMS[id].i + ' ' + Z_ITEMS[id].n + ' çantana alındı.' };
  }
  homeStyle(kind, i) { const L = kind === 'wall' ? Z_WALLS : Z_FLOORS; if (L[i]) this.home[kind] = i; }
  sleepBonus() {   // döşeli evde uyumak ödüllendirilir
    const n = this.homeCount(); if (n < 2) return 0;
    const g = n * 50; this.earn(g); this.say('🛋️ Döşeli evde rahat bir uyku: +' + g + ' 🔔'); return g;
  }

  /* ---------------------------------------------------------------- ada puanı */
  rating() {
    let flowers = 0, furn = 0, weeds = 0, saps = 0;
    for (const o of this.obj.values()) {
      if (o.t === 'flower' && o.stage >= 3) { if (!o.wild) flowers++; } else if (o.t === 'furn') { if (!o.deco) furn++; } else if (o.t === 'weed') weeds++; else if (o.t === 'sap') saps++;
    }
    furn += this.homeCount();
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
    const fest = this.festOn();
    if (fest) for (let k = 0, n = fest.id === 'kis' ? 8 : 5; k < n; k++) { const a = k / n * 6.283; L.push({ x: 2 + Math.cos(a) * 4.2, z: 3 + Math.sin(a) * 4.2, up: 1.8, s: fest.id === 'kis' ? 0.75 : 0.55 }); }
    for (const b of this.builds) if (b.t === 'home' || b.t === 'shop' || (b.t === 'vhome' && this.vill.some((v) => v.home === b.id))) L.push({ x: b.x, z: b.z + b.hz + 0.4, up: 1.4, s: 0.45 });
    for (const b of this.builds) if (b.t === 'mach' && this.machBuilt(b.m)) L.push({ x: b.x, z: b.z + b.hz + 0.5, up: 1.4, s: this.machWorking(b.m) ? 0.85 : 0.4 });
    for (const [c, o] of this.obj) if (o.t === 'furn' && Z_FURN[o.id].light) { const q = this.cellPos(c); L.push({ x: q.x, z: q.z, up: o.id === 'lamp' ? 2.0 : 0.5, s: Z_FURN[o.id].light * 0.8 }); }
    return L;
  }

  /* ---------------------------------------------------------------- sıkıştım & fener */
  _safeAt(x, z) { return !this.blocked(x, z, 0.3) && this.world.getHeight(x, z) > 0.8 && !this.inBuild(x, z, 0.35); }
  _nearSafe(x, z, maxR = 14) {
    if (this._safeAt(x, z)) return { x, z };
    for (let r = 0.8; r <= maxR; r += 0.6) {
      const n = Math.max(8, Math.round(r * 9));
      for (let k = 0; k < n; k++) { const a = (k / n) * 6.283 + r, qx = x + Math.cos(a) * r, qz = z + Math.sin(a) * r; if (this._safeAt(qx, qz)) return { x: qx, z: qz }; }
    }
    return null;
  }
  // mode: near (bulunduğun yerin yakınındaki boş nokta) | home (evin önü) | plaza (meydan)
  unstuck(mode = 'near') {
    const p = this.p, home = this.builds[0];
    const from = mode === 'home' ? { x: home.door.x + 1.5, z: home.door.z + 2.5 } : mode === 'plaza' ? { x: 2, z: 4.5 } : { x: p.x, z: p.z };
    const s = this._nearSafe(from.x, from.z, mode === 'near' ? 14 : 8) || this._nearSafe(2, 4.5, 20);
    if (!s) return { ok: false, msg: 'Güvenli bir yer bulunamadı!' };
    p.x = s.x; p.z = s.z; p.y = Math.max(this.world.getHeight(s.x, s.z), SEA - 0.28); p.vx = p.vz = 0; p.act = null; p.fish = null; p.stuck = 0; p.inT = 0;
    this.path = []; this.pathAct = false; this.ev({ t: 'tele', x: s.x, z: s.z });
    return { ok: true, msg: mode === 'home' ? '🏠 Evinin önüne geldin.' : mode === 'plaza' ? '⛲ Meydana geldin.' : '🆘 Yakındaki boş bir yere taşındın.' };
  }
  lanternOn() { const p = this.p; return Z_TOOLS[p.tool].id === 'lantern' && p.lit && !p.held; }

  /* ---------------------------------------------------------------- kalabalık: köylüler + sabit karakterler */
  folk() { return this.npcs.length ? this.vill.concat(this.npcs) : this.vill; }
  _addNpcs() {
    this.npcs = Z_NPCS.map((D, k) => ({
      id: 900 + k, i: 100 + k, npc: D.id, name: D.name, role: D.role, female: !!D.look.female, pers: D.pers, fav: D.fav, look: Object.assign(Cozy.defaultLook(), D.look), home: null,
      x: D.x, z: D.z, y: this.world.getHeight(D.x, D.z), ang: D.ang, moving: false, stuck: 0, inside: false, path: [], phase: k * 2.1,
      friend: 0, talked: 0, gifted: 0, quest: null, rew: 0, talking: false, st: 1, td: {}, sr: 0, tn: 0, say: '', sayT: 0,
    }));
  }
  _npcs(dt) {
    const night = this.hour >= 22.5 || this.hour < 6.2, p = this.p;
    for (const v of this.npcs) {
      v.y = this.world.getHeight(v.x, v.z); v.inside = night; v.sayT = Math.max(0, v.sayT - dt);
      const d = Math.hypot(p.x - v.x, p.z - v.z);
      if (v.talking || d < 4.5) v.ang = zang(v.ang, Math.atan2(p.x - v.x, p.z - v.z), Math.min(1, dt * 5));
      if (!v.sayT && d < 7 && zrnd() < dt * 0.05) { v.say = zpick(Z_BARKS[v.pers]); v.sayT = 4.5; }
    }
  }
  topics(v) {
    const st = Z_STORY[v.name] || [];
    return [
      { k: 'chat', l: '💬 Sohbet et', tip: 'Gündelik şeylerden konuşursunuz. Günde bir kez arkadaşlığı biraz artırır.' },
      { k: 'story', l: '📖 Hikâyeni anlat', tip: v.name + ' hakkında ' + Math.min(v.sr, st.length) + '/' + st.length + ' bölüm dinledin. Arkadaşlık arttıkça yeni bölüm açılır.' },
      { k: 'tip', l: '💡 Tavsiye iste', tip: 'Oyunda ne yapabileceğin hakkında ipucu verir. Günde bir kez arkadaşlığı artırır.' },
      { k: 'news', l: '📰 Haberler', tip: 'Hava durumu, şenlikler ve adadan söylentiler.' },
    ];
  }
  chat(v, k) {
    v.td = v.td || {};
    const first = !v.td[k]; v.td[k] = 1;
    const bump = (n) => { if (first) { v.friend = Math.min(100, v.friend + n); this._friendRewards(v); } };
    if (k === 'chat') { bump(2); return zpick(Z_TALK[v.pers] || Z_TALK.neşeli); }
    if (k === 'story') {
      const st = Z_STORY[v.name] || [], open = Math.min(st.length, Z_STORY_AT.filter((a) => v.friend >= a).length);
      if (v.sr < open) { const s = st[v.sr++]; v.friend = Math.min(100, v.friend + 3); this._friendRewards(v); return s; }
      if (v.sr >= st.length) return 'Hikâyemin hepsini anlattım artık. Ama seninle konuşmak hep güzel.';
      return 'Bunu anlatacak kadar yakın değiliz henüz… Biraz daha dost olalım, sonra anlatırım. (arkadaşlık ' + Z_STORY_AT[v.sr] + ' gerekli)';
    }
    if (k === 'tip') {
      bump(1);
      const L = (Z_HINTS_NPC[v.npc] || Z_HINTS).filter((h) => h.if(this));
      return L[(v.tn++) % L.length].t;
    }
    bump(1);
    const out = [!this.rainDay ? 'Bugün hava açık görünüyor.' : this.rainNow ? 'Şu an yağmur yağıyor; ekinler kendiliğinden sulanır.' : this.hour >= this.rainSpan[1] ? 'Bugün yağmur yağdı; ekinler sulandı.' : 'Bugün saat ' + Math.floor(this.rainSpan[0]) + ':00 civarı yağmur bekleniyor; ekinler kendiliğinden sulanır.'];
    const up = this.upcoming(6).filter((e) => e.in > 0);
    if (up.length) out.push('Yaklaşan: ' + up[0].text + ' (' + (up[0].in === 1 ? 'yarın' : up[0].in + ' gün sonra') + ').');
    out.push(zpick(Z_RUMORS));
    return out.join(' ');
  }

  /* ---------------------------------------------------------------- görevler */
  questProg(q) {
    switch (q.ty) {
      case 'stat': return this.stats[q.k] || 0;
      case 'have': return this.count(q.k);
      case 'stars': return this.stars;
      case 'friend': return Math.max(0, ...this.folk().map((v) => v.friend));
      case 'mach': return this.machBuilt(q.k) ? 1 : 0;
      default: return 0;
    }
  }
  questState() { return Z_QUESTS.map((q) => ({ q, have: Math.min(this.questProg(q), q.need), done: !!this.qdone[q.id] })); }
  questsActive(n = 3) { return this.questState().filter((s) => !s.done).slice(0, n); }
  _questTick(dt) {
    this._qT -= dt; if (this._qT > 0) return;
    this._qT = 0.6;
    let k = 0;
    for (const q of Z_QUESTS) {
      if (this.qdone[q.id] || this.questProg(q) < q.need) continue;
      this.qdone[q.id] = 1; this.earn(q.zil);
      if (q.item) this.give(q.item, q.itemN || 1, this.p.x, this.p.z);
      this.say('📜 Görev tamamlandı: ' + q.t + ' · +' + q.zil + ' 🔔' + (q.item ? ' · ' + Z_ITEMS[q.item].i + ' ' + Z_ITEMS[q.item].n + (q.itemN > 1 ? ' ×' + q.itemN : '') : ''));
      this.ev({ t: 'fanfare' });
      if (++k >= 2) break;
    }
  }

  /* ---------------------------------------------------------------- atölyeler (endüstri) */
  machBuilt(id) { const m = this.mach[id]; return !!m && m.built; }
  machWorking(id) { const m = this.mach[id]; return !!m && m.built && m.q.length > 0; }
  machNeed(id) {   // inşaat gereksinimleri: [{id, have, need}], zil dahil
    const M = Z_MACH[id];
    return { zil: M.zil, haveZil: this.zil, items: Object.keys(M.need).map((k) => ({ id: k, have: this.count(k), need: M.need[k] })) };
  }
  machBuild(id) {
    const M = Z_MACH[id], m = this.mach[id];
    if (!M || m.built) return { ok: false, msg: 'Bu atölye zaten kurulu.' };
    if (this.zil < M.zil) return { ok: false, msg: 'Yeterli Zil yok (' + M.zil + ' 🔔 gerekli).' };
    for (const k of Object.keys(M.need)) if (this.count(k) < M.need[k]) return { ok: false, msg: 'Malzeme yetersiz: ' + Z_ITEMS[k].i + ' ' + Z_ITEMS[k].n + ' ' + this.count(k) + '/' + M.need[k] };
    this.zil -= M.zil; for (const k of Object.keys(M.need)) this.take(k, M.need[k]);
    m.built = true; m.q = []; m.out = {}; this.stats.built++;
    this.ev({ t: 'fanfare' }); this.ev({ t: 'build', id });
    this.say('🏗️ ' + M.n + ' inşa edildi!');
    return { ok: true, msg: M.i + ' ' + M.n + ' hazır!' };
  }
  machCan(id, ri) {
    const r = Z_MACH[id].rec[ri]; if (!r) return false;
    for (const k of Object.keys(r.in)) if (this.count(k) < r.in[k]) return false;
    return true;
  }
  machStart(id, ri) {
    const M = Z_MACH[id], m = this.mach[id], r = M && M.rec[ri];
    if (!r || !m.built) return { ok: false, msg: 'Atölye hazır değil.' };
    if (m.q.length >= 5) return { ok: false, msg: 'Üretim sırası dolu (en fazla 5).' };
    if (!this.machCan(id, ri)) return { ok: false, msg: 'Malzeme yetersiz!' };
    for (const k of Object.keys(r.in)) this.take(k, r.in[k]);
    m.q.push({ r: ri, left: r.t, t: r.t });
    return { ok: true, msg: 'Üretim başladı: ' + Z_ITEMS[r.out].i + ' ' + Z_ITEMS[r.out].n };
  }
  machCollect(id) {
    const m = this.mach[id]; let k = 0;
    for (const it of Object.keys(m.out)) {
      const n = m.out[it]; if (!n) continue;
      if (!this.canAdd(it)) { this.say('Çantan dolu!'); break; }
      this.add(it, n); k += n; delete m.out[it];
    }
    return k ? { ok: true, msg: 'Ürünler çantana alındı (' + k + ' adet).' } : { ok: false, msg: 'Toplanacak ürün yok.' };
  }
  _machFinish(id, M, m) {
    const q = m.q.shift(), r = M.rec[q.r];
    m.out[r.out] = (m.out[r.out] || 0) + r.n;
    this.stats['made_' + r.out] = (this.stats['made_' + r.out] || 0) + r.n;
    return r;
  }
  _machs(dt) {
    for (const id of Z_MACH_ORDER) {
      const m = this.mach[id]; if (!m.built || !m.q.length) continue;
      const M = Z_MACH[id]; m.q[0].left -= dt;
      if (m.q[0].left <= 0) {
        const r = this._machFinish(id, M, m), b = this.builds.find((x) => x.m === id);
        this.ev({ t: 'ding', x: b.x, z: b.z + b.hz + 0.6 });
        this.say('🔔 ' + M.n + ': ' + Z_ITEMS[r.out].i + ' ' + Z_ITEMS[r.out].n + ' hazır! Kapısına gidip topla.');
      }
    }
  }

  /* ---------------------------------------------------------------- ada düzeni: başlangıç tarlası, süsler, sabit karakterler */
  _clearRect(x0, x1, z0, z1) {
    const W = this.world;
    for (let cz = Math.floor(z0 + HALF); cz <= Math.floor(z1 + HALF); cz++) for (let cx = Math.floor(x0 + HALF); cx <= Math.floor(x1 + HALF); cx++) {
      if (cx < 0 || cz < 0 || cx >= N || cz >= N) continue;
      const c = cz * N + cx, o = this.obj.get(c);
      if (W.treeT[c]) { W.removeTree(c); this.trees.delete(c); }
      if (o) { if (o.t === 'furn') this.add('f_' + o.id, 1); this.obj.delete(c); }
    }
  }
  _settle(fresh) {
    const W = this.world;
    if (!fresh) {   // eski kayıt: atölye alanları ve tarla düzleştirilir, yollar boyanır
      for (const b of this.builds) if (b.t === 'mach') this._flatten(b.x, b.z, Math.max(b.hx, b.hz) + 2.4, Math.max(b.hx, b.hz) + 6, zclamp(W.getHeight(b.x, b.z), 1.5, 3.4));
      this._flatten(Z_FARM.x, Z_FARM.z, 5, 9, zclamp(W.getHeight(Z_FARM.x, Z_FARM.z), 1.6, 3.0));
      W.afterEdit(0, N - 1, 0, N - 1); W.chunkDirty.fill(1); W.waterDirty = true;
      for (const b of this.builds) b.y = W.getHeight(b.x, b.z);
      this._reserve(true);
    }
    for (const b of this.builds) if (b.t === 'mach') this._clearRect(b.x - b.hx - 1.4, b.x + b.hx + 1.4, b.z - b.hz - 1.2, b.z + b.hz + 2.4);
    this._clearRect(Z_FARM.x - Z_FARM.w / 2 - 1.5, Z_FARM.x + Z_FARM.w / 2 + 1.5, Z_FARM.z - Z_FARM.h / 2 - 1.5, Z_FARM.z + Z_FARM.h / 2 + 2.5);
    this._populate();
    W.treesDirty = true; W.waterDirty = true;
  }
  _freeNear(x, z) {
    const W = this.world;
    for (let r = 0; r <= 2.5; r += 0.5) for (let k = 0; k < (r ? 10 : 1); k++) {
      const a = k * 0.63 + r, c = this.cellOf(x + Math.cos(a) * r, z + Math.sin(a) * r);
      if (c < 0 || this.obj.has(c) || W.treeT[c]) continue;
      const q = this.cellPos(c), cx = c % N, cz = (c / N) | 0;
      if (W.cellH(cx, cz) < 1.0 || W.cellRange(cx, cz) > 1.0 || this.inBuild(q.x, q.z, 0.55)) continue;
      return c;
    }
    return -1;
  }
  _populate() {
    const W = this.world, F = Z_FARM, x0 = Math.floor(F.x + HALF - F.w / 2), z0 = Math.floor(F.z + HALF - F.h / 2);
    for (let j = 0; j < F.h; j++) for (let i = 0; i < F.w; i++) {
      const cx = x0 + i, cz = z0 + j, c = cz * N + cx;
      if (W.cellH(cx, cz) < 1.0) continue;
      this._till(c);
      const o = this.obj.get(c);
      if (j === 0) { o.crop = 'wheat'; o.stage = 1; } else if (j === 1 && i < 3) { o.crop = 'carrot'; o.stage = 0; }
    }
    for (const [id, x, z, rot] of Z_DECOR) {
      const c = this._freeNear(x, z);
      if (c >= 0) this.obj.set(c, { t: 'furn', id, rot, deco: 1 });
    }
    for (let k = 0, made = 0; k < 120 && made < 14; k++) {   // meydan çevresine yabani çiçekler
      const a = zrnd() * 6.283, d = zrange(5, 17), c = this.cellOf(2 + Math.cos(a) * d, 3 + Math.sin(a) * d);
      if (c < 0 || this.obj.has(c) || W.treeT[c] || W.soil[c] !== SOIL.GRASS) continue;
      const cx = c % N, cz = (c / N) | 0, q = this.cellPos(c);
      if (W.cellH(cx, cz) < 1.2 || W.cellRange(cx, cz) > 0.8 || this.inBuild(q.x, q.z, 0.6)) continue;
      this.obj.set(c, { t: 'flower', k: (zrnd() * 6) | 0, stage: 3, wet: false, wild: 1 }); made++;
    }
    W.markRect(x0 - 2, x0 + F.w + 2, z0 - 2, z0 + F.h + 2);
  }

  /* ---------------------------------------------------------------- kayıt */
  toJSON() {
    const p = this.p;
    return {
      v: 1, seed: this.seed, day: this.day, zil: this.zil, name: this.name, look: this.look, hour: this.hour,
      p: { x: p.x, z: p.z, ang: p.ang, tool: p.tool, held: p.held, lit: p.lit },
      qdone: this.qdone, mach: this.mach, u2: 1,
      npc: this.npcs.map((n) => ({ id: n.npc, friend: n.friend, sr: n.sr, tn: n.tn, rew: n.rew })),
      bag: this.bag, seen: this.seen, stats: this.stats, stock: this.stock, rainDay: this.rainDay, rainSpan: this.rainSpan, rainWet: this.rainWet, id: this._id, mile: this.mile, home: this.home, contest: this.contest,
      obj: [...this.obj.entries()], trees: [...this.trees.entries()],
      vill: this.vill.map((v) => ({ i: v.i, x: v.x, z: v.z, ang: v.ang, friend: v.friend, talked: v.talked, gifted: v.gifted, quest: v.quest, rew: v.rew, inside: v.inside, id: v.id, sr: v.sr, tn: v.tn })),
    };
  }
  fromJSON(d) {
    if (!d || d.v !== 1) return false;
    try {
      this._reset();
      this.seed = d.seed | 0; this.day = d.day | 0 || 1; this.zil = +d.zil || 0; this.name = String(d.name || 'Ada Sakini').slice(0, 14);
      this.look = Object.assign(Cozy.defaultLook(), d.look); this.hour = +d.hour || 8;
      Object.assign(this.p, { x: +d.p.x, z: +d.p.z, ang: +d.p.ang || 0, tool: zclamp(d.p.tool | 0, 0, Z_TOOLS.length - 1), held: d.p.held || null, lit: d.p.lit !== false });
      this.p.y = this.world.getHeight(this.p.x, this.p.z);
      this.bag = d.bag || {}; this.seen = Object.assign({ fish: {}, bug: {}, fos: {} }, d.seen); this.stats = Object.assign(this.stats, d.stats);
      this.stock = d.stock || []; this.rainDay = !!d.rainDay; this.rainSpan = d.rainSpan || [0, 0]; this.rainWet = !!d.rainWet; this._id = d.id | 0 || 100;
      this.mile = d.mile || {}; this.home = Cozy.fixHome(d.home); this.contest = d.contest || null;
      if (d.mach) for (const id of Z_MACH_ORDER) {
        const s = d.mach[id];
        if (s) this.mach[id] = { built: !!s.built, q: (Array.isArray(s.q) ? s.q : []).filter((x) => Z_MACH[id].rec[x.r]).map((x) => ({ r: x.r | 0, left: +x.left || 1, t: +x.t || 1 })), out: s.out && typeof s.out === 'object' ? s.out : {} };
      }
      this.obj = new Map(d.obj); this.trees = new Map(d.trees);
      this._layout();
      for (const b of this.builds) b.y = this.world.getHeight(b.x, b.z);
      this._reserve(false);
      for (const sv of d.vill || []) {
        const v = this._addVillager(sv.i, true);
        Object.assign(v, { x: sv.x, z: sv.z, ang: sv.ang, friend: sv.friend, talked: sv.talked, gifted: sv.gifted, quest: sv.quest, rew: sv.rew, inside: !!sv.inside, id: sv.id, sr: sv.sr | 0, tn: sv.tn | 0 });
      }
      this._addNpcs();
      for (const sn of d.npc || []) { const n = this.npcs.find((x) => x.npc === sn.id); if (n) Object.assign(n, { friend: sn.friend | 0, sr: sn.sr | 0, tn: sn.tn | 0, rew: sn.rew | 0 }); }
      if (!d.u2) this._settle(false);   // eski kayıt: yeni alanlar (atölyeler, tarla, süsler) bir kez eklenir
      if (!this.stock.length) this._restock();
      const fs = this.festOn();
      if (!this.contest && fs && fs.id === 'balik' && this.hour < 18) this._contestInit();
      this.rating();
      if (d.qdone) this.qdone = d.qdone;
      else for (const q of Z_QUESTS) if (this.questProg(q) >= q.need) this.qdone[q.id] = 1;   // eski kayıt: ödülsüz, sessizce tamam say
      return true;
    } catch (e) { return false; }
  }
}
