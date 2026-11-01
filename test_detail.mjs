import { World, N, HALF, SEA } from './src/sim.js';
import { Colony, D_BUILD, D_TECH, D_EVENTS } from './src/detail.js';
const w = new World(); w.fx = () => {};
const c = new Colony(w);
const sp = c.start(777);
console.log('başlangıç', sp, 'insan', c.people.length, 'ağaç', w.treeCount);
const cell = (x, z) => [Math.floor(x + HALF), Math.floor(z + HALF)];
function tryPlace(type, ox, oz) {
  for (let r = 0; r < 14; r++) for (let k = 0; k < 40; k++) {
    const [cx, cz] = cell(sp.x + ox + (Math.random() - 0.5) * 2 * r, sp.z + oz + (Math.random() - 0.5) * 2 * r);
    if (!c.canPlace(type, cx, cz)) { const b = c.place(type, cx, cz); if (typeof b === 'object') return b; }
  }
  return null;
}
const log = [];
const ev = [];
const autoAnswer = () => { while (c.queue.length) { const e = c.queue.shift(); const i = (Math.random() * e.choices.length) | 0; ev.push(e.title + ' -> ' + c.answer(e, i, e.input)); } };
let t = 0;
console.log('ev', tryPlace('house', 3, 0) ? 'ok' : 'FAIL', 'ateş', tryPlace('fire', 0, 3) ? 'ok' : 'FAIL');
c.pts = 30; // her şeyi aç
for (const id of ['kuyu','tarim1','hayvan1','hayvan2','hayvan3','balik1','balik2','balik3','egitim1','egitim2','sanayi1','sanayi2','sanayi3','balta','ev2','sulama','tohum','ticaret']) if (!c.unlock(id)) console.log('açılamadı', id);
c.res.wood = 200; c.res.gold = 100;
console.log('tarla', !!tryPlace('field', -4, 2), 'ağıl', !!tryPlace('pen', 6, 4), 'iskele', !!tryPlace('dock', 0, 0), 'okul', !!tryPlace('school', -6, -6), 'atölye', !!tryPlace('workshop', 8, -4), 'fabrika', !!tryPlace('factory', -9, 8), 'kuyu', !!tryPlace('well', 2, -3), 'ev2', !!tryPlace('house', 5, -2));
// 2 yetişkin daha ve bir çocuk
c.addPerson(sp.x + 1, sp.z + 1, { female: false, age: 25 }); c.addPerson(sp.x - 1, sp.z, { female: true, age: 23 }); c.addPerson(sp.x, sp.z - 1, { age: 6, edu: 0 });
const dt = 1 / 20;
for (let i = 0; i < 20 * 900; i++) {
  c.update(dt, ((8 + i * dt / 150 * 24) % 24));
  w.update(dt);
  autoAnswer();
  if (i % (20 * 60) === 0) {
    const r = c.res; log.push(`t${(i / 20) | 0} nüfus ${c.people.length} odun ${r.wood.toFixed(0)} yem ${c.foodStock().toFixed(0)} eşya ${r.goods.toFixed(0)} altın ${r.gold.toFixed(0)} mutluluk ${c.mood.toFixed(0)} puan ${c.pts} lvl ${c.lvl}`);
  }
  for (const p of c.people) if (!isFinite(p.x) || !isFinite(p.z) || !isFinite(p.need.food)) throw new Error('NaN ' + p.name);
}
console.log(log.join('\n'));
console.log('olaylar', ev.length); console.log(ev.slice(0, 12).join('\n'));
const acts = {}; for (const p of c.people) { const k = p.act ? p.act.type : 'yok'; acts[k] = (acts[k] || 0) + 1; }
console.log('etkinlikler', JSON.stringify(acts));
for (const p of c.people) console.log(p.name, Math.floor(p.age), 'mood', p.mood.toFixed(0), 'edu', p.edu.toFixed(0), JSON.stringify(Object.fromEntries(Object.entries(p.skill).map(([k, v]) => [k, +v.toFixed(0)]))), 'ev', p.home);
// kayıt turu
const json = JSON.parse(JSON.stringify(c.toJSON()));
const c2 = new Colony(w); if (!c2.fromJSON(json)) throw new Error('fromJSON'); 
if (c2.people.length !== c.people.length || c2.buildings.length !== c.buildings.length) throw new Error('sayı');
for (let i = 0; i < 20 * 30; i++) c2.update(dt, 10);
console.log('DETAY OK');
