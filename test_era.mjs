import { World, ERAS, tribeTitle, MAXFARM } from './src/sim.js';

const w = new World();
const fxc = {};
w.fx = (t) => { fxc[t] = (fxc[t] || 0) + 1; };
w.generate(1234);
w.war = false;

// 12 dakikalık oyun: gün/mevsim dışarıdan (main.js gibi) sürülür
const dt = 1 / 20;
let t = 0;
for (let i = 0; i < 20 * 60 * 12; i++) {
  w.update(dt); t += dt;
  w.day = 1 + Math.floor(t / 150); w.tod = (t % 150) / 150;
  w.setSeason(Math.floor(t / 300) % 4);
}

const fail = (m) => { throw new Error(m); };
const maxEra = Math.max(...w.tribes.map((x) => x.era));
if (maxEra < 3) fail('12 dakikada Sanayi çağına ulaşan köy yok: ' + maxEra);
if (!w.farms.some((f) => !f.dead)) fail('hiç tarla yok');
if (!w.tribes.some((x) => x.farms >= 3)) fail('3+ tarlalı köy yok');
if (!w.houses.some((h) => h.era >= 2)) fail('gelişmiş ev yok');
if (w.farms.length > MAXFARM) fail('tarla sınırı aşıldı');

// tarla tutarlılığı
for (let i = 0; i < w.farms.length; i++) {
  const f = w.farms[i];
  if (f.dead) continue;
  if (w.farmAt[f.cell] !== i) fail('farmAt uyuşmuyor ' + i);
  if (w.houseAt[f.cell] >= 0) fail('evin üstünde tarla');
}
for (const tr of w.tribes) {
  const n = w.farms.filter((f) => !f.dead && f.tribe === tr.id).length;
  if (n !== tr.farms) fail('köy ' + tr.id + ' tarla sayısı ' + tr.farms + ' ≠ ' + n);
  const nh = w.houses.filter((h) => h.tribe === tr.id).length;
  if (nh !== tr.houses) fail('köy ' + tr.id + ' ev sayısı');
}
if (!isFinite(fxc.era) || fxc.era < 1) fail('çağ efekti yok');

// günlük
const L = w.log;
if (L.length < 10) fail('günlük çok kısa: ' + L.length);
const has = (re) => L.some((e) => re.test(e.msg));
if (!has(/kuruldu/)) fail('kuruluş kaydı yok');
if (!has(/tarla/i)) fail('tarla kaydı yok');
if (!has(/geçti/)) fail('çağ atlama kaydı yok');
if (!has(/hasat/i)) fail('hasat kaydı yok');
for (const e of L) {
  if (typeof e.msg !== 'string' || !e.msg || /undefined|NaN/.test(e.msg + (e.who || ''))) fail('bozuk günlük satırı: ' + JSON.stringify(e));
  if (!(e.day >= 1) || !(e.tod >= 0 && e.tod <= 1)) fail('günlük zamanı bozuk');
}
for (let i = 1; i < L.length; i++) if (L[i].id <= L[i - 1].id) fail('günlük sırası bozuk');

// köy kartı için çağ ihtiyaçları
for (const tr of w.tribes) {
  if (tribeTitle(tr).includes('undefined')) fail('köy adı');
  const need = w.eraNeeds(tr);
  if (tr.era >= ERAS.length - 1 ? need !== null : !Array.isArray(need)) fail('eraNeeds');
}

// kayıt/yükleme turu
{
  const json = JSON.stringify(w.serialize());
  const w2 = new World(); w2.fx = () => {};
  if (!w2.deserialize(JSON.parse(json))) fail('deserialize');
  if (w2.farms.length !== w.farms.length) fail('tarla sayısı kayıtta');
  if (w2.log.length !== Math.min(w.log.length, 150)) fail('günlük kayıtta');   // kayıt son 150 satırı tutar
  if (w2.log.length && w2.log[w2.log.length - 1].msg !== w.log[w.log.length - 1].msg) fail('günlüğün sonu kayıtta');
  for (let i = 1; i < w2.log.length; i++) if (w2.log[i].id <= w2.log[i - 1].id) fail('yüklenen günlük sırası');
  for (let i = 0; i < w.tribes.length; i++) {
    const a = w.tribes[i], b = w2.tribes[i];
    if (a.era !== b.era || a.farms !== b.farms || a.houses !== b.houses || a.pop !== b.pop) fail('köy durumu kayıtta ' + i);
    if (Math.abs(a.kn - b.kn) > 0.01) fail('bilgi kayıtta');
  }
  for (let i = 0; i < w2.houses.length; i++) if (w2.houses[i].era !== w.houses[i].era || w2.houses[i].kind !== w.houses[i].kind) fail('ev çağı kayıtta');
  w2.setSeason(1);
  for (let i = 0; i < 20 * 120; i++) w2.update(dt);
  // eski biçim: çağsız evler ve [cx,cz] köyler yüklenebilmeli
  const old = JSON.parse(json);
  old.tribes = old.tribes.map((a) => [a[0], a[1]]);
  old.houses = old.houses.map((a) => a.slice(0, 4));
  delete old.farms; delete old.log; delete old.logId;
  const w3 = new World(); w3.fx = () => {};
  if (!w3.deserialize(old)) fail('eski biçim yüklenemedi');
  for (let i = 0; i < 20 * 60; i++) w3.update(dt);
  if (w3.tribes.some((x) => x.era !== 0 && x.kn < ERAS[x.era].kn - 1)) fail('eski kayıtta çağ bilgi uyumsuz');
}

// kışın ekim yok, yaz yağmuru yok sayılsın: kış başlangıcında genç ekinler donar
{
  const w4 = new World(); w4.fx = () => {};
  w4.generate(99); w4.war = false;
  let tt = 0;
  for (let i = 0; i < 20 * 60 * 5; i++) {
    w4.update(dt); tt += dt; w4.day = 1 + Math.floor(tt / 150); w4.tod = (tt % 150) / 150; w4.setSeason(1);
  }
  const before = w4.farms.filter((f) => !f.dead && f.st === 1).length;
  w4.setSeason(3);
  const after = w4.farms.filter((f) => !f.dead && f.st === 1).length;
  if (after > before) fail('kışta ekin arttı');
  if (before > 0 && !w4.log.some((e) => /don|kış/i.test(e.msg))) fail('kış kaydı yok');
}

console.log('ERA OK  era', maxEra, 'farms', w.farms.filter((f) => !f.dead).length, 'log', L.length, JSON.stringify(fxc));
