// Ada Modu mantık testi: node test_cozy.mjs
// Math.random tohumlu: aynı TEST_SEED aynı sonucu verir (varsayılan 1)
let _s = (+process.env.TEST_SEED || 1) >>> 0;
Math.random = () => { _s = (_s + 0x6D2B79F5) >>> 0; let t = _s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
import { World, N, HALF, SEA } from './src/sim.js';
import { Cozy, Z_ITEMS, Z_FISH, Z_BUGS, Z_FURN, Z_RECIPES, Z_MILE, Z_FEST } from './src/cozy.js';

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
let caught = false, hooks = 0;
for (let i = 0; i < 4000 && !caught; i++) {
  cz.update(0.02, 12);
  const fi = cz.p.fish;
  if (fi && fi.st === 'bite') cz.press();
  else if (fi && fi.st === 'fight' && fi.pos >= fi.zone + 0.04 && fi.pos <= fi.zone + fi.d.zone - 0.04) { cz.press(); hooks++; }
  if (!cz.p.fish && cz.events.some((e) => e.t === 'catch')) caught = true;
  if (!cz.p.fish && !caught && !cz.p.act) { cz.press(); }
}
ok(caught && Object.keys(cz.bag).some((k) => k.startsWith('fish_')), 'balık yakalandı (isabet ' + hooks + ')');

// balık oyunu: ıskalayınca olta kopar, isabette yakalanır, zor balık çok vuruş ister
{
  cz.p.act = null; cz.p.fish = null; cz.hour = 12; cz.season = 1;
  const bite = (id) => { cz.p.act = null; cz.p.fish = { st: 'bite', t: 0, x: wp.x, z: wp.z, wait: 0, fid: Z_FISH.find((f) => f.id === id) }; cz.press(); return cz.p.fish; };
  const aim = (hit) => { const f = cz.p.fish; f.pos = hit ? f.zone + f.d.zone / 2 : f.zone - 0.04; cz.p.act = null; cz.press(); };
  let f = bite('sazan');
  ok(f && f.st === 'fight' && f.d.need === 1, 'ısırınca balık oyunu başlar');
  aim(false); aim(false); ok(!!cz.p.fish, 'iki ıskadan sonra olta durur');
  aim(false); ok(!cz.p.fish, 'üç ıska oltayı koparır');
  const fish0 = cz.stats.fish, n0 = cz.count('fish_sazan');
  bite('sazan'); aim(true);
  ok(cz.p.fish && cz.p.fish.st === 'reel', 'isabet balığı çektirir');
  for (let i = 0; i < 20; i++) cz.update(0.05, 12);
  ok(cz.count('fish_sazan') === n0 + 1 && cz.stats.fish === fish0 + 1, 'oyun sonunda balık çantada');
  f = bite('ton'); ok(f.d.need === 3 && f.d.zone < 0.25, 'ton balığı zor (3 vuruş, dar bölge)');
  aim(true); ok(cz.p.fish.st === 'fight' && cz.p.fish.hits === 1, 'ilk vuruş sürer, bölge yenilenir');
  const z1 = cz.p.fish.zone; aim(true); aim(true); ok(cz.p.fish && cz.p.fish.st === 'reel', 'üç isabet yeter');
  for (let i = 0; i < 20; i++) cz.update(0.05, 12);
  bite('hamsi'); for (let i = 0; i < 400; i++) cz.update(0.05, 12);
  ok(!cz.p.fish, 'süre dolunca balık kurtulur');
  f = bite('cizme'); ok(f && f.st === 'reel', 'çöp için oyun yok');
  for (let i = 0; i < 20; i++) cz.update(0.05, 12);
  cz.p.fish = null; cz.p.act = null;
  // yanlış anda çekmek
  cz.p.fish = { st: 'wait', t: 0, x: wp.x, z: wp.z, wait: 9, fid: null }; cz.press();
  ok(!cz.p.fish, 'erken çekilince olta toplanır');
}

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

// mevsimler: balık, böcek, meyve
{
  const pool = (season) => { cz.season = season; const s = new Set(); for (let i = 0; i < 700; i++) { cz.hour = (i * 7) % 24; s.add(cz._pickFish().id); } return s; };
  const kis = pool(3), yaz = pool(1), sonbahar = pool(2);
  ok(kis.has('mersin') && !kis.has('ahtapot') && !kis.has('palamut') && !kis.has('ton'), 'kış balıkları: mersin var, ahtapot/ton yok');
  ok(yaz.has('ahtapot') && !yaz.has('mersin') && !yaz.has('hamsi'), 'yaz balıkları: ahtapot var, mersin/hamsi yok');
  ok(sonbahar.has('palamut') && sonbahar.has('hamsi'), 'sonbahar: palamut ve hamsi');
  for (const s of [0, 1, 2, 3]) { cz.season = s; let any = false; for (let h = 0; h < 24; h++) { cz.hour = h; if (cz._pickFish()) any = true; } ok(any, 'her saatte balık çıkar (mevsim ' + s + ')'); }
  cz.season = 3; cz.hour = 12; cz.rainDay = false; cz.bugs.length = 0;
  const types = new Set();
  for (let i = 0; i < 900; i++) { cz.update(0.1, 12); for (const b of cz.bugs) types.add(b.type); }
  ok(types.size > 0 && [...types].every((x) => ['karinca', 'kisguve'].includes(x)), 'kışın gündüz yalnızca karınca/kış güvesi: ' + [...types].join());
  const ft = [...cz.trees.entries()].find(([c, m]) => m.k === 'apple' && w.treeT[c]);
  ok(!!ft, 'elma ağacı var');
  if (ft) {
    const m = ft[1]; m.fruit = 0; m.reg = 1; cz.season = 3; cz.newDay();
    ok(m.fruit === 0, 'kışın elma yetişmez');
    cz.season = 2; cz.newDay(); ok(m.fruit === 3, 'sonbaharda elma yetişir');
  }
  cz.season = 0;
}

// takvim: şenlikler, fiyatlar, doğum günü, ışıklar
{
  cz.bag = {};
  ok(Z_FEST.length === 4 && cz.festOn(2).id === 'cicek' && cz.festOn(5).id === 'balik' && cz.festOn(8).id === 'hasat' && cz.festOn(11).id === 'kis' && !cz.festOn(3), 'şenlik takvimi');
  ok(cz.festOn(14).id === 'cicek', 'takvim 12 günde bir döner');
  cz.day = 2; cz.add('flw_0', 2);
  const base = Z_ITEMS.flw_0.sell;
  ok(cz.price('flw_0') === Math.round(base * 1.5), 'Çiçek Şenliği\'nde çiçek 1,5 kat');
  const zb = cz.zil, gs = cz.sell('flw_0', 2);
  ok(gs === Math.round(base * 1.5) * 2 && cz.zil === zb + gs, 'şenlik fiyatıyla satıldı');
  cz.day = 3; ok(cz.price('flw_0') === base, 'normal günde normal fiyat');
  cz.day = 8; ok(cz.price('apple') === Z_ITEMS.apple.sell * 2, 'Hasat Şenliği\'nde meyve 2 kat');
  const v1 = cz.vill[1];
  cz.day = 2; v1.talked = 0; v1.talking = false;
  const sd = Object.keys(cz.bag).filter((k) => k.startsWith('seed_')).length;
  const tl = cz.talk(v1);
  ok(/hediye etti/.test(tl) && Object.keys(cz.bag).filter((k) => k.startsWith('seed_')).length > sd, 'şenlikte köylü tohum armağan eder');
  cz.endTalk(v1);
  // ışıklar
  cz.hour = 19; cz.day = 3; const l0 = cz.lights().length;
  cz.day = 2; ok(cz.lights().length === l0 + 5, 'şenlikte meydan ışıkları');
  cz.day = 11; ok(cz.lights().length === l0 + 8, 'Kış Işıkları\'nda daha çok ışık');
  // doğum günü: Defne gün 1 ve 13
  cz.day = 13;
  const dv = cz.vill.find((q) => q.i === 0);
  ok(cz.isBday(dv) && cz.bdayOn().includes(dv), 'Defne\'nin doğum günü');
  ok(cz.upcoming(12).length >= 1, 'yaklaşan etkinlik listesi');
  dv.gifted = 0; dv.friend = 10; dv.bdayDone = 0; cz.add('flw_1', 1);
  ok(/doğum günü/.test(cz.talk(dv)), 'doğum günü sohbeti'); cz.endTalk(dv);
  const gr = cz.gift(dv, 'flw_1');
  ok(gr.ok && dv.friend >= 30 && /Doğum günümü/.test(gr.msg) && Object.keys(cz.bag).some((k) => k.startsWith('f_')), 'doğum günü hediyesi: büyük sevgi + karşılık');
  cz.day = 14;
  for (let i = 0; i < 40; i++) cz._restock();
  ok(!cz.stock.includes('f_trophy') && !cz.buy('f_trophy').ok, 'kupa dükkânda satılmaz');
}

// Balık Yarışması
{
  cz.bag = {}; cz.zil = 0;
  cz.day = 5; cz._announceDay();
  ok(cz.contest && !cz.contest.done && cz.contest.rv.length === cz.vill.length, 'Balık Yarışması başladı');
  cz.hour = 7; ok(!cz.contestOn(), 'yarışma 08:00\'de başlar');
  cz.hour = 12; ok(cz.contestOn(), 'yarışma sürüyor');
  cz._contestAdd(Z_FISH.find((f) => f.id === 'kilic'));
  ok(cz.contest.score === 4200, 'yarışma puanı sayılır');
  cz.contest.rv.forEach((r) => { r.goal = 100; });
  cz.hour = 18.2; cz._contestTick();
  ok(cz.contest.done && cz.contest.rank === 0 && cz.zil === 4000 && cz.count('f_trophy') === 1, 'yarışma kazanıldı: 4000 🔔 + kupa');
  cz._contestTick(); ok(cz.zil === 4000, 'ödül bir kez verilir');
  // kaybetme + gün atlayarak bitirme
  cz.day = 5; cz._announceDay(); cz.hour = 12;
  cz._contestAdd(Z_FISH.find((f) => f.id === 'hamsi'));
  cz.contest.rv.forEach((r) => { r.goal = 5000; });
  const zl = cz.zil; cz.newDay();
  ok(cz.zil === zl + 300, 'gün atlanınca yarışma biter, katılım ödülü');
  // katılmayan ödül almaz
  cz.day = 5; cz._announceDay(); cz.hour = 18.5; cz._contestTick();
  ok(cz.contest.done && cz.contest.reward === 0, 'katılmayan ödül almaz');
}

// koleksiyon ödülleri
{
  cz.bag = {}; cz.zil = 0; cz.seen = { fish: {}, bug: {}, fos: {} };
  ok(cz.milestones().length === Z_MILE.length && cz.milestones().every((m) => !m.can), 'başlangıçta koleksiyon ödülü yok');
  for (const id of ['hamsi', 'istavrit', 'sazan']) cz.seen.fish[id] = 1;
  ok(!cz.milestones('fish')[0].can && !cz.claimMile(0).ok, '3 balık yetmez');
  cz.seen.fish.kefal = 1; cz.seen.fish.cizme = 1;
  ok(cz.milestones('fish')[0].can, '4 tür ödül açar (çöp sayılmaz)');
  ok(cz.claimMile(0).ok && cz.zil === 1500, 'koleksiyon ödülü alındı');
  ok(!cz.claimMile(0).ok && cz.zil === 1500, 'ödül iki kez alınmaz');
  for (const f of Z_FISH) if (!f.junk) cz.seen.fish[f.id] = 1;
  for (const m of cz.milestones('fish')) if (m.can) ok(cz.claimMile(m.i).ok, 'balık ödülü ' + m.need);
  ok(cz.count('f_trophy') === 1 && cz.count('f_lamp') === 1, 'tüm balıklar: kupa ve lamba');
  for (const b of Z_BUGS) cz.seen.bug[b.id] = 1;
  ok(cz.milestones('bug').every((m) => m.can), 'tüm böcekler ödülleri açar');
}

// ev içi döşeme
{
  cz.bag = {}; cz.zil = 0; cz.add('f_chair', 2); cz.add('f_lamp', 1);
  const furn0 = cz.rating().parts.furn;
  ok(cz.homePut(0, 'f_chair').ok && cz.count('f_chair') === 1 && cz.home.slots[0] === 'f_chair', 'eve eşya yerleşti');
  ok(cz.homePut(0, 'f_lamp').ok && cz.count('f_chair') === 2 && cz.home.slots[0] === 'f_lamp', 'üstüne koyunca eskisi çantaya döner');
  ok(!cz.homePut(1, 'wood').ok && !cz.homePut(9, 'f_chair').ok, 'mobilya olmayan / olmayan yuva reddedilir');
  ok(cz.homePut(1, 'f_chair').ok && cz.homeCount() === 2, 'iki eşya evde');
  ok(cz.rating().parts.furn === furn0 + 2, 'ev içi eşyalar ada puanına sayılır');
  const z1 = cz.zil; ok(cz.sleepBonus() === 100 && cz.zil === z1 + 100, 'döşeli evde uyku ödülü');
  cz.homeStyle('wall', 2); cz.homeStyle('floor', 1); cz.homeStyle('wall', 99);
  ok(cz.home.wall === 2 && cz.home.floor === 1, 'duvar ve zemin seçilir');
  ok(cz.homeTake(1).ok && cz.homeCount() === 1 && !cz.homeTake(1).ok, 'eşya geri alınır');
  cz.day = 5; cz._announceDay(); cz.hour = 12; cz._contestAdd(Z_FISH.find((f) => f.id === 'ton'));   // kayıtta yarışma da dursun
}

// kayıt/yükleme
const js = JSON.parse(JSON.stringify(cz.toJSON()));
const w2 = new World(); w2.deserialize(w.serialize());
const c2 = new Cozy(w2);
ok(c2.fromJSON(js), 'yükleme başarılı');
ok(c2.zil === cz.zil && c2.day === cz.day && c2.vill.length === cz.vill.length && c2.obj.size === cz.obj.size, 'durum aynı (' + c2.obj.size + ' nesne)');
ok(c2.count('wood') === cz.count('wood'), 'çanta aynı');
ok(c2.home.slots[0] === 'f_lamp' && c2.home.wall === 2 && c2.home.floor === 1 && JSON.stringify(c2.mile) === JSON.stringify(cz.mile), 'ev ve koleksiyon kayıtta');
ok(c2.contest && c2.contest.score === cz.contest.score && c2.contest.rv.length === cz.contest.rv.length, 'yarışma kayıtta');
{   // eski kayıt (v1, yeni alanlar yok)
  const old = JSON.parse(JSON.stringify(js)); delete old.mile; delete old.home; delete old.contest;
  const c3 = new Cozy(new World());
  ok(c3.fromJSON(old) && c3.home.slots.length === 6 && !c3.homeCount() && Object.keys(c3.mile).length === 0, 'eski kayıt yüklenir');
}
for (let i = 0; i < 200; i++) c2.update(0.05, 10);
ok(true, 'yüklenen oyun çalışıyor');
ok(!new Cozy(new World()).fromJSON({ v: 9 }), 'bozuk kayıt reddedildi');

// uzun koşu: uyku, çoklu gün, hata yok
for (let d = 0; d < 20; d++) { for (let i = 0; i < 50; i++) cz.update(0.1, (d * 5 + i * 0.5) % 24); cz.newDay(); }
ok(true, '20 gün sorunsuz (puan ' + cz.rating().score + ')');
console.log(fail ? '\n' + fail + ' TEST BAŞARISIZ' : '\nTÜM TESTLER GEÇTİ');
process.exit(fail ? 1 : 0);
