import { World, N, HALF, SEA, SOIL } from './src/sim.js';
import { Colony } from './src/detail.js';
const w = new World(); w.fx = () => {}; w.generate(4321);
// --- Simülasyon Modu: insanı su halkasının ortasına (adacık) ve ev içine sıkıştır
w.spawnVillage(0, 0, 3);
for (let i = 0; i < 20; i++) w.update(1 / 20);
const h = w.humans[0]; h.life = 1e9;
const cx = (h.x + HALF) | 0, cz = (h.z + HALF) | 0;
// çevresini ev hücreleriyle kapat
const saved = [];
for (let dz = -2; dz <= 2; dz++) for (let dx = -2; dx <= 2; dx++) if (Math.max(Math.abs(dx), Math.abs(dz)) === 2 || (dx === 0 && dz === 0)) { const c = (cz + dz) * N + cx + dx; saved.push([c, w.houseAt[c]]); w.houseAt[c] = 999; }
h.x = cx - HALF + 0.5 + 0.2; h.z = cz - HALF + 0.5 + 0.2;
const x0 = h.x, z0 = h.z; let freed = -1;
for (let i = 0; i < 20 * 60; i++) { w.update(1 / 20); if (Math.max(Math.abs(h.x - (cx - HALF + 0.5)), Math.abs(h.z - (cz - HALF + 0.5))) > 2.6 && freed < 0) freed = i / 20; }
console.log('sim: kurtuldu (sn):', freed, h.dead, h.state, h.blk, h.x.toFixed(1), h.z.toFixed(1), 'start', x0.toFixed(1), z0.toFixed(1));
if (freed < 0 && !h.dead) throw new Error('sim insanı sıkışık kaldı ' + JSON.stringify({st: h.state, blk: h.blk, wk: h.wk, pt: h.pt, px: h.px, hp: h.hp, pos: [h.x, h.z], t: [h.tx, h.tz], start: [x0, z0]}));
// --- Detaylı Mod: kişiyi suya ve katı bina halkasına
const w2 = new World(); w2.fx = () => {}; w2.generate(777);
const c = new Colony(w2); const sp = c.start(777);
const p = c.people[0];
// suda
let wx = 0, wz = 0, ok = false; for (let i = 0; i < N * N && !ok; i++) if (w2.cellH(i % N, (i / N) | 0) < SEA - 0.5) { wx = (i % N) - HALF + 0.5; wz = ((i / N) | 0) - HALF + 0.5; ok = Math.abs(wx) < HALF - 6 && Math.abs(wz) < HALF - 6; }
p.x = wx; p.z = wz; p.act = null;
for (let i = 0; i < 20 * 5; i++) c.update(1 / 20, 10);
console.log('detay: sudan sonra yükseklik', w2.getHeight(p.x, p.z).toFixed(2), 'SEA', SEA);
if (w2.getHeight(p.x, p.z) < SEA + 0.1) throw new Error('detay kişi suda kaldı');
// katı bina halkası
c.pts = 40; c.res.wood = 999;
console.log('STUCK OK');
