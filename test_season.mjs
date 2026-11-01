import { World, HALF } from './src/sim.js';
import { Colony, D_SEASON, D_ERAS } from './src/detail.js';

const fail = (m) => { throw new Error(m); };
const w = new World(); w.fx = () => {};
const c = new Colony(w);
const sp = c.start(777);
const cell = (x, z) => [Math.floor(x + HALF), Math.floor(z + HALF)];
function tryPlace(type, ox, oz) {
  for (let r = 0; r < 14; r++) for (let k = 0; k < 40; k++) {
    const [cx, cz] = cell(sp.x + ox + (Math.random() - 0.5) * 2 * r, sp.z + oz + (Math.random() - 0.5) * 2 * r);
    if (!c.canPlace(type, cx, cz)) { const b = c.place(type, cx, cz); if (typeof b === 'object') return b; }
  }
  return null;
}
const eras = [];
c.onEra = (e) => eras.push(e);
if (c.era !== 0 || D_ERAS.length !== 5 || D_SEASON.length !== 4) fail('başlangıç çağı');

// çağ ilerlemesi: beceri açtıkça
c.pts = 50;
for (const id of ['kuyu', 'tarim1']) c.unlock(id);
if (c.era !== 1) fail('Tarım Çağı bekleniyordu: ' + c.era);
for (const id of ['balta', 'ev2']) c.unlock(id);
if (c.era !== 2) fail('Demir Çağı bekleniyordu: ' + c.era);
for (const id of ['sanayi1', 'sanayi2']) c.unlock(id);
if (c.era !== 3) fail('Sanayi Çağı bekleniyordu: ' + c.era);
for (const id of ['sanayi3', 'egitim1', 'egitim2', 'egitim3', 'bilim']) c.unlock(id);
if (c.era !== 4) fail('Modern Çağ bekleniyordu: ' + c.era);
if (eras.join() !== '1,2,3,4') fail('çağ geri çağrıları: ' + eras.join());
if (!c.log.some((l) => /çağ atladı/.test(l.t))) fail('çağ günlüğü yok');
for (const id of ['hayvan1', 'balik1', 'sulama', 'tohum']) c.unlock(id);

c.res.wood = 150; c.res.gold = 50; c.res.wheat = 8;
tryPlace('house', 3, 0); tryPlace('house', 5, -2); tryPlace('fire', 0, 3); tryPlace('field', -4, 2); tryPlace('field', -4, -4); tryPlace('well', 2, -3);
c.addPerson(sp.x + 1, sp.z + 1, { female: false, age: 25 }); c.addPerson(sp.x - 1, sp.z, { female: true, age: 23 });

// 8 mevsim × 100 sn (800 sn: yaşlanma yüzünden kimse ölmez); mevsim dışarıdan sürülür (main.js gibi)
const dt = 1 / 20, seasonsSeen = [], evTitles = [];
const answer = () => { while (c.queue.length) { const e = c.queue.shift(); evTitles.push(e.title); c.answer(e, (Math.random() * e.choices.length) | 0, e.input); } };
let woodBefore = 0, woodAfter = 0, stallChecked = false, t = 0;
for (let i = 0; i < 20 * 800; i++) {
  t = i * dt;
  const season = Math.floor(t / 100) % 4;
  c.setEnv(season, season === 3 ? 'snow' : 'clear', season === 3 ? -2 : 18);
  if (!seasonsSeen.length || seasonsSeen[seasonsSeen.length - 1] !== season) seasonsSeen.push(season);
  c.update(dt, (8 + t / 150 * 24) % 24); w.update(dt); answer();
  for (const p of c.people) if (!isFinite(p.x) || !isFinite(p.need.food) || !isFinite(p.mood)) fail('NaN ' + p.name);
  // kışın ekinler durmalı: kış ortasında bir tarlayı ekili duruma getirip ilerlemesini ölç
  if (season === 3 && !stallChecked && t % 400 > 320) {
    const f = c.buildings.find((b) => b.type === 'field' && b.prog >= 1 && b.worker < 0);
    if (f) {
      const a = f.stage = 1; f.timer = 40; f.total = 40;
      for (let k = 0; k < 20 * 10; k++) c.update(dt, 12);
      const lost = 40 - f.timer;
      if (f.stage === 1 && lost > 40 * 0.3 * 0.25 + 3) fail('kışın ekin çok hızlı büyüdü: ' + lost.toFixed(1) + ' sn ilerledi (10 sn\'de)');
      stallChecked = true;
    }
  }
}
if (seasonsSeen.length < 8) fail('mevsim geçişleri: ' + seasonsSeen.join());
if (!stallChecked) fail('kış büyüme testi çalışmadı');
const texts = c.log.map((l) => l.t).join('\n');
if (!/Kış başladı/.test(texts) && !/başladı/.test(texts)) fail('mevsim günlüğü yok');
if (!evTitles.some((x) => /Şenliği|Panayır|Sert kış/.test(x))) fail('mevsim olayı çıkmadı: ' + [...new Set(evTitles)].join(' | '));
if (c.people.length === 0) fail('koloni yok oldu');

// kayıt turu çağı korur
{
  const w2 = new World(); w2.fx = () => {}; const c2 = new Colony(w2);
  if (!c2.fromJSON(JSON.parse(JSON.stringify(c.toJSON())))) fail('fromJSON');
  if (c2.era !== c.era) fail('çağ kayıtta');
  c2.setEnv(2, 'rain', 8); c2.update(dt, 12);
}
// ısıtma: kışın ev varken odun azalır, odun yoksa evler soğur
{
  const w3 = new World(); w3.fx = () => {}; const c3 = new Colony(w3); const s3 = c3.start(31);
  c3.res.wood = 50; c3.setEnv(3, 'snow', -3);
  const b = c3.place; // ev kur: ham oluşturma yerine toplu dene
  let house = null;
  for (let r = 1; r < 14 && !house; r++) for (let k = 0; k < 40 && !house; k++) {
    const [cx, cz] = [Math.floor(s3.x + HALF + 3 + (Math.random() - 0.5) * 2 * r), Math.floor(s3.z + HALF + (Math.random() - 0.5) * 2 * r)];
    if (!c3.canPlace('house', cx, cz)) { const h = c3.place('house', cx, cz, true); if (typeof h === 'object') house = h; }
  }
  if (!house) fail('ev kurulamadı');
  house.prog = 1;
  const w0 = c3.res.wood; c3._seasonal(10.1); c3._seasonal(10.1);
  if (!(c3.res.wood < w0)) fail('kışın odun yakılmadı');
  c3.res.wood = 0; c3.heatT = 0; c3._seasonal(0.1);
  if (c3.warm) fail('odunsuz ev ısınmamalı');
  if (!c3.log.some((l) => /Odun bitti/.test(l.t))) fail('soğuk günlüğü yok');
}
console.log('SEZON OK  nüfus', c.people.length, 'çağ', c.era, 'olaylar', [...new Set(evTitles)].length);
