import { World, N, HALF } from './src/sim.js';
import { Colony } from './src/detail.js';
const w = new World(); w.fx = () => {}; w.generate(777);
const c = new Colony(w); const sp = c.start(777);
c.res.wood = 999; c.res.gold = 99; c.pts = 40; for (const id of ['tarim1', 'kuyu']) c.unlock(id);
let f = null;
for (let r = 0; r < 14 && !f; r++) for (let k = 0; k < 40 && !f; k++) {
  const r2 = c.place('field', Math.floor(sp.x + 4 + (Math.random() - .5) * 2 * r + HALF), Math.floor(sp.z + 1 + (Math.random() - .5) * 2 * r + HALF));
  if (typeof r2 === 'object') f = r2;
}
if (!f) throw new Error('tarla yerleşmedi');
const y0 = f.y; const gx = f.x, gz = f.z;
// araziyi yükselt
for (let i = 0; i < 40; i++) { w.editTerrain('up', gx, gz, 4, 1 / 20, 0); c.update(1 / 20, 10); }
for (let i = 0; i < 20; i++) c.update(1 / 20, 10);
const ground = w.getHeight(gx, gz);
console.log('yükseltme: tarla y', y0.toFixed(2), '->', f.y.toFixed(2), 'zemin', ground.toFixed(2));
if (f.y <= y0 + 0.3) throw new Error('bina yükselmedi');
if (Math.abs(f.y - ground) > 0.08) throw new Error('bina zeminden ayrık (yükselt)');
// alçalt
for (let i = 0; i < 60; i++) { w.editTerrain('down', gx, gz, 4, 1 / 20, 0); c.update(1 / 20, 10); }
for (let i = 0; i < 20; i++) c.update(1 / 20, 10);
const g2 = w.getHeight(gx, gz);
console.log('alçaltma: tarla y', f.y.toFixed(2), 'zemin', g2.toFixed(2));
if (Math.abs(f.y - g2) > 0.08) throw new Error('bina zeminden ayrık (alçalt)');
// düzleştir
for (let i = 0; i < 40; i++) { w.editTerrain('flat', gx, gz, 4, 1 / 20, 6); c.update(1 / 20, 10); }
for (let i = 0; i < 20; i++) c.update(1 / 20, 10);
const g3 = w.getHeight(gx, gz);
console.log('düzleştirme: tarla y', f.y.toFixed(2), 'zemin', g3.toFixed(2));
if (Math.abs(f.y - g3) > 0.08) throw new Error('bina zeminden ayrık (düzleştir)');
// sim evi
const w2 = new World(); w2.fx = () => {}; w2.generate(5); w2.spawnVillage(0, 0, 3);
const h = w2.houses[0]; if (h) { for (let i = 0; i < 30; i++) w2.editTerrain('up', h.x, h.z, 3, 1 / 20, 0); const cy = w2.cellH(h.cell % N, (h.cell / N) | 0); console.log('sim ev y', h.y.toFixed(2), 'hücre', cy.toFixed(2)); if (w2.houses.includes(h) && Math.abs(h.y - cy) > 0.01) throw new Error('sim evi zeminden ayrık'); }
console.log('ARAZI OK');
