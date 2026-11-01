// Ada Modu mantık testi: node test_cozy.mjs
// Math.random tohumlu: aynı TEST_SEED aynı sonucu verir (varsayılan 1)
let _s = (+process.env.TEST_SEED || 1) >>> 0;
Math.random = () => { _s = (_s + 0x6D2B79F5) >>> 0; let t = _s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
import { World, N, HALF, SEA } from './src/sim.js';
import { Cozy, Z_ITEMS, Z_FISH, Z_FURN, Z_RECIPES } from './src/cozy.js';

let fail = 0;
const ok = (c, m) => { if (!c) { fail++; console.log('✗ ' + m); } else console.log('✓ ' + m); };

const w = new World();
const cz = new Cozy(w);
const t0 = Date.now();
const sp = cz.start(1234);
ok(Date.now() - t0 < 3000, 'ada üretimi hızlı (' + (Date.now() - t0) + ' ms)');
ok(w.getHeight(sp.x, sp.z) > 1, 'oyuncu karada doğuyor (y=' + w.getHeight(sp.x, sp.z).toFixed(2) + ')');
ok(w.humans.length === 0 && w.houses.length === 0, 'simülasyon insanı/evi yok');
ok(w.treeCount > 60, 'ağaçlar var (' + w.treeCount + ')');
let rocks = 0, weeds = 0, fos = 0, items = 0;
for (const o of cz.obj.values()) { if (o.t === 'rock') rocks++; else if (o.t === 'weed') weeds++; else if (o.t === 'fossil') fos++; else if (o.t === 'item') items++; }
ok(rocks >= 5 && weeds >= 40 && fos >= 2, 'taş/ot/fosil: ' + rocks + '/' + weeds + '/' + fos + ' kabuk:' + items);
ok(cz.vill.length === 3, 'üç köylü');
let land = 0, water = 0;
for (let c = 0; c < N * N; c++) { if (w.cellH(c % N, (c / N) | 0) > SEA + 0.3) land++; else water++; }
ok(land > 3000 && water > 3000, 'kara/su dengesi: ' + land + '/' + water);
for (const b of cz.builds) ok(!cz.blocked(b.door.x, b.door.z + 0.2, 0.28) || b.t === 'board', 'kapı önü açık: ' + b.id);

// hareket + çarpışma
let t = 0;
const step = (n, hour = 10) => { for (let i = 0; i < n; i++) { cz.update(0.05, hour); t += 0.05; } };
cz.setMove(1, 0, true); step(80);
const px = cz.p.x;
ok(Math.abs(cz.p.x - sp.x) > 3, 'oyuncu yürüyor (x ' + sp.x.toFixed(1) + ' → ' + px.toFixed(1) + ')');
// uzun süre denize doğru yürü: suya girmemeli
cz.setMove(0, 1, true); cz.lockAng = false; step(900);
ok(w.getHeight(cz.p.x, cz.p.z) >= SEA - 0.31 && Math.abs(cz.p.z) < HALF - 2, 'denize/harita dışına çıkmıyor (z=' + cz.p.z.toFixed(1) + ', h=' + w.getHeight(cz.p.x, cz.p.z).toFixed(2) + ')');
cz.setMove(0, 0);

// yol bulma
cz.p.x = sp.x; cz.p.z = sp.z; cz.p.vx = cz.p.vz = 0;
const shop = cz.builds.find((b) => b.t === 'shop');
const found = cz.walkTo(shop.door.x, shop.door.z + 0.3, true);
ok(found && cz.path.length > 0, 'yol bulundu (' + cz.path.length + ' nokta)');
step(900);
ok(Math.hypot(cz.p.x - shop.door.x, cz.p.z - shop.door.z) < 1.5, 'dükkâna varıldı (uzaklık ' + Math.hypot(cz.p.x - shop.door.x, cz.p.z - shop.door.z).toFixed(2) + ')');
ok(cz.target().kind === 'shop', 'hedef: dükkân');

// ağaç kesme
const treeCell = [...cz.trees.keys()].find((c) => w.treeT[c]);
const tp = cz.treePos(treeCell);
cz.p.x = tp.x; cz.p.z = tp.z - 1.2; cz.p.ang = 0; cz.p.tool = 1; cz.p.act = null;
ok(cz.target().kind === 'chop', 'balta ağaç görüyor');
const wood0 = cz.count('wood'), tc0 = w.treeCount;
for (let i = 0; i < 3; i++) { cz.p.act = null; cz.press(); step(2); }
ok(w.treeCount === tc0 - 1 && cz.count('wood') > wood0, 'ağaç kesildi, odun: ' + cz.count('wood'));
ok(cz.obj.get(treeCell) && cz.obj.get(treeCell).t === 'stump', 'kütük kaldı');

// kürek: çukur kaz, fosil
cz.p.tool = 2; cz.p.act = null; cz.p.ang = 0;
let fc = -1, kd = null;
for (let dz = 2; dz < 9 && !kd; dz++) for (let dx = 2; dx < 9 && !kd; dx++) {   // önü boş, kazılabilir bir çimen bul
  cz.p.x = sp.x + dx; cz.p.z = sp.z + dz;
  const c = cz.cellOf(cz.front().x, cz.front().z);
  if (cz.obj.has(c) && cz.obj.get(c).t !== 'weed') continue;
  const save = cz.obj.get(c); cz.obj.delete(c);
  const tg = cz.target();
  if (tg.kind === 'dig') { fc = c; kd = tg; } else if (save) cz.obj.set(c, save);
}
if (!kd) kd = cz.target();
ok(kd.kind === 'dig', 'kürek çukur kazar');
cz.press(); step(2);
ok(cz.obj.get(fc) && cz.obj.get(fc).t === 'hole', 'çukur oluştu');
// fosil
const fcell = [...cz.obj.entries()].find(([, o]) => o.t === 'fossil')[0], fq = cz.cellPos(fcell);
cz.p.x = fq.x; cz.p.z = fq.z - 1; cz.p.ang = 0; cz.p.act = null;
ok(cz.target().kind === 'fossil', 'fosil bulundu');
cz.press(); step(2);
ok(Object.keys(cz.bag).some((k) => k.startsWith('fos_')), 'fosil çantada');

// tohum ek, sula, gün geçir, çiçek açsın
cz.add('seed_0', 3);
let sc = [...cz.obj.entries()]; // boş bir çimen hücresi
let spot = null;
for (let c = 0; c < N * N && !spot; c++) { if (cz._validSpot(c % N, (c / N) | 0)) spot = c; }
const spp = cz.cellPos(spot);
cz.p.x = spp.x; cz.p.z = spp.z - 1; cz.p.ang = 0; cz.p.tool = 0; cz.p.act = null;
ok(cz.hold('seed_0'), 'tohum elde');
cz.press(); step(2);
ok(cz.obj.get(spot) && cz.obj.get(spot).t === 'flower', 'çiçek ekildi');
cz.p.held = null; cz.p.tool = 5; cz.p.act = null;
for (let d = 0; d < 3; d++) {
  cz.p.act = null; cz.p.x = spp.x; cz.p.z = spp.z - 1; cz.p.ang = 0; cz.rainNow = false;
  cz.press(); step(2);
  cz.newDay();
}
ok(cz.obj.get(spot) && cz.obj.get(spot).stage === 3, 'üç günde çiçek açtı (stage ' + (cz.obj.get(spot) || {}).stage + ')');
cz.p.tool = 0; cz.p.act = null; cz.p.x = spp.x; cz.p.z = spp.z - 1; cz.p.ang = 0;
ok(cz.target().kind === 'pickflower', 'çiçek toplanabilir');
cz.press(); step(2);
ok(cz.count('flw_0') === 1, 'çiçek çantada');

// fidan büyüt
cz.add('sap_apple', 1);
let spot2 = null;
for (let c = spot + 5; c < N * N && !spot2; c++) { if (cz._validSpot(c % N, (c / N) | 0)) { let nb = false; for (let d = -1; d <= 1; d++) for (let e = -1; e <= 1; e++) if (w.treeT[c + d * N + e]) nb = true; if (!nb) spot2 = c; } }
const sp2 = cz.cellPos(spot2);
cz.p.x = sp2.x; cz.p.z = sp2.z - 1; cz.p.ang = 0; cz.p.act = null; cz.hold('sap_apple'); cz.press(); step(2);
ok(cz.obj.get(spot2) && cz.obj.get(spot2).t === 'sap', 'fidan dikildi');
for (let d = 0; d < 3; d++) cz.newDay();
ok(w.treeT[spot2] === 1 && cz.trees.get(spot2).k === 'apple', 'fidan ağaç oldu');

// meyve silkeleme
const fruitCell = [...cz.trees.entries()].find(([c, m]) => m.fruit > 0 && w.treeT[c])[0], fp = cz.treePos(fruitCell);
cz.p.x = fp.x; cz.p.z = fp.z - 1.2; cz.p.ang = 0; cz.p.tool = 0; cz.p.act = null;
const k0 = Object.values(cz.obj).length;
ok(cz.target().kind === 'shake', 'ağaç sallanabilir');
cz.press(); step(40);
const dropped = [...cz.obj.values()].filter((o) => o.t === 'item' && ['apple', 'orange', 'cherry'].includes(o.id)).length;
ok(cz.trees.get(fruitCell).fruit === 0 && dropped + cz.count('apple') + cz.count('orange') + cz.count('cherry') >= 3, 'meyveler yere düştü (' + dropped + ')');

// balık tutma
let wp = null;
for (let a = 0; a < 6.28 && !wp; a += 0.1) for (let r = 20; r < 60 && !wp; r += 0.5) {
  const x = Math.cos(a) * r, z = Math.sin(a) * r;
  if (w.getHeight(x, z) < SEA - 0.3 && w.getHeight(x - Math.cos(a) * 1.5, z - Math.sin(a) * 1.5) > SEA + 0.2) wp = { x, z, a };
}
ok(!!wp, 'kıyı bulundu');
cz.p.x = wp.x - Math.cos(wp.a) * 2.2; cz.p.z = wp.z - Math.sin(wp.a) * 2.2; cz.p.ang = Math.atan2(Math.cos(wp.a), Math.sin(wp.a)); cz.p.tool = 3; cz.p.act = null;
ok(cz.target().kind === 'cast', 'olta suyu görüyor');
cz.press();
let caught = false;
for (let i = 0; i < 400 && !caught; i++) {
  cz.update(0.05, 12);
  if (cz.p.fish && cz.p.fish.st === 'bite') cz.press();
  if (!cz.p.fish && cz.events.some((e) => e.t === 'catch')) caught = true;
  if (!cz.p.fish && !caught && !cz.p.act) { cz.press(); }
}
ok(caught && Object.keys(cz.bag).some((k) => k.startsWith('fish_')), 'balık yakalandı');

// böcek
cz.hour = 12; cz.bugs.length = 0; cz.rainDay = false;   // yağmurda böcek çıkmaz
for (let i = 0; i < 1200 && !cz.bugs.length; i++) cz.update(0.1, 12);
ok(cz.bugs.length > 0, 'böcekler beliriyor (' + cz.bugs.length + ')');
const b = cz.bugs[0]; cz.p.x = b.x - Math.sin(0) * 0.9; cz.p.z = b.z - 0.9; cz.p.ang = 0; cz.p.tool = 4; cz.p.act = null; cz.p.speed = 0;
const nb0 = Object.keys(cz.bag).filter((k) => k.startsWith('bug_')).length;
cz.press();
ok(Object.keys(cz.bag).filter((k) => k.startsWith('bug_')).length === nb0 + 1, 'böcek yakalandı');

// ekonomi
const z0 = cz.zil;
const g = cz.sellAll((it) => it.cat === 'fish');
ok(cz.zil === z0 + g && g > 0, 'balık satıldı +' + g);
cz.zil = 5000;
ok(cz.buy('sap_cherry').ok && cz.count('sap_cherry') === 1, 'satın alma');
cz.zil = 10;
ok(!cz.buy('f_fountain').ok, 'para yetmeyince alınmaz');
cz.add('wood', 40); cz.add('stone', 20); cz.add('clay', 20); cz.add('iron', 5); cz.add('weed', 20);
let crafted = 0;
Z_RECIPES.forEach((r, i) => { if (cz.craft(i).ok) crafted++; });
ok(crafted === Z_RECIPES.length, 'tüm tarifler yapılabilir (' + crafted + ')');

// mobilya yerleştir
cz.p.tool = 0; cz.p.act = null;
let spot3 = null;
for (let c = spot + 30; c < N * N && !spot3; c++) if (cz._validSpot(c % N, (c / N) | 0)) spot3 = c;
const s3 = cz.cellPos(spot3);
cz.p.x = s3.x; cz.p.z = s3.z - 1; cz.p.ang = 0;
cz.hold('f_bench'); cz.press(); step(2);
ok(cz.obj.get(spot3) && cz.obj.get(spot3).t === 'furn', 'mobilya yerleşti');
cz.p.held = null; cz.p.act = null; cz.p.x = s3.x; cz.p.z = s3.z - 1; cz.p.ang = 0;
ok(cz.target().kind === 'pickfurn', 'mobilya geri alınır');

// köylü
const v = cz.vill[0];
v.x = cz.p.x + 0.9; v.z = cz.p.z; cz.p.ang = Math.PI / 2; cz.p.act = null; v.inside = false;
ok(cz.target().kind === 'talk' || cz.target().kind === 'pickfurn', 'köylü hedefi');
const line = cz.talk(v);
ok(line.length > 10 && v.friend >= 3, 'köylü konuştu: ' + line.slice(0, 40));
cz.add(v.quest.id, v.quest.n);
const zz = cz.zil; const cr = cz.claimQuest(v);
ok(cr.ok && cz.zil > zz, 'görev tamamlandı +' + (cz.zil - zz));
cz.endTalk(v);
// gece köylüler eve
for (let i = 0; i < 1500; i++) cz.update(0.1, 23.2);
ok(cz.vill.every((q) => q.inside), 'geceleri köylüler evde');
for (let i = 0; i < 100; i++) cz.update(0.1, 9);
ok(cz.vill.every((q) => !q.inside), 'sabah dışarı çıkıyorlar');
// ada puanı & yeni köylü
const r1 = cz.rating();
ok(r1.stars >= 1 && r1.score > 0, 'ada puanı ' + r1.score + ' (' + r1.stars + '★)');
cz.stars = 3; cz._arrivals();
ok(cz.vill.length === 4, 'yeni köylü taşındı');

// kayıt/yükleme
const js = JSON.parse(JSON.stringify(cz.toJSON()));
const w2 = new World(); w2.deserialize(w.serialize());
const c2 = new Cozy(w2);
ok(c2.fromJSON(js), 'yükleme başarılı');
ok(c2.zil === cz.zil && c2.day === cz.day && c2.vill.length === cz.vill.length && c2.obj.size === cz.obj.size, 'durum aynı (' + c2.obj.size + ' nesne)');
ok(c2.count('wood') === cz.count('wood'), 'çanta aynı');
for (let i = 0; i < 200; i++) c2.update(0.05, 10);
ok(true, 'yüklenen oyun çalışıyor');
ok(!new Cozy(new World()).fromJSON({ v: 9 }), 'bozuk kayıt reddedildi');

// uzun koşu: uyku, çoklu gün, hata yok
for (let d = 0; d < 20; d++) { for (let i = 0; i < 50; i++) cz.update(0.1, (d * 5 + i * 0.5) % 24); cz.newDay(); }
ok(true, '20 gün sorunsuz (puan ' + cz.rating().score + ')');
console.log(fail ? '\n' + fail + ' TEST BAŞARISIZ' : '\nTÜM TESTLER GEÇTİ');
process.exit(fail ? 1 : 0);
