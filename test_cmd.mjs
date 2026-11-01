import { World, N, HALF } from './src/sim.js';
import { Colony, D_BUILD } from './src/detail.js';
const w = new World(); w.fx = () => {};
const c = new Colony(w); const sp = c.start(777);
c.pts = 40; for (const id of ['kuyu','tarim1','hayvan1','balik1','egitim1','sanayi1','sanayi2','balta']) c.unlock(id);
c.res.wood = 300; c.res.gold = 50; c.res.berry = 40;
const place = (type, ox, oz) => { for (let r = 0; r < 14; r++) for (let k = 0; k < 40; k++) { const cx = Math.floor(sp.x + ox + (Math.random() - .5) * 2 * r + HALF), cz = Math.floor(sp.z + oz + (Math.random() - .5) * 2 * r + HALF); if (!c.canPlace(type, cx, cz)) { const b = c.place(type, cx, cz); if (typeof b === 'object') return b; } } return null; };
const house = place('house', 3, 0), field = place('field', -4, 2), school = place('school', -7, -6);
house.prog = 1; field.prog = 1; school.prog = 1;
let site;
const p = c.people[0];
const run = (sec) => { for (let i = 0; i < 20 * sec; i++) { c.update(1 / 20, 10); w.update(1 / 20); } };
const kinds = (t) => c.commandOptions(p, t).map((o) => o.t);

console.log('tarla:', kinds({ kind: 'building', b: field }));
console.log('okul:', kinds({ kind: 'building', b: school }));
console.log('ev:', kinds({ kind: 'building', b: house }));
// ağaç
let tc = -1; const lone = (i) => { for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 3; dz++) if ((dx || dz) && w.treeT[i + dx + dz * N]) return false; return true; }; for (let i = N * 4; i < N * (N - 4); i++) if (w.treeT[i] && lone(i) && Math.hypot((i % N) - HALF - p.x, ((i / N) | 0) - HALF - p.z) < 40) { tc = i; break; } if (tc < 0) throw new Error('yalnız ağaç yok');
const before = c.res.wood;
p.x = (tc % N) - HALF + 0.5; p.z = ((tc / N) | 0) - HALF + 2.5; const chop = c.commandOptions(p, { kind: 'tree', cell: tc })[0];
console.log('ağaç:', chop.t, '→', chop.f());
if (!p.act || p.act.type !== 'chop' || !p.act.cmd) throw new Error('chop komutu başlamadı');
run(40);
if (w.treeT[tc]) throw new Error('ağaç kesilmedi ' + JSON.stringify({act: p.act, pos: [p.x, p.z], tc: [(tc % N) - HALF, ((tc / N) | 0) - HALF], need: p.need})); if (c.res.wood <= before) throw new Error('odun artmadı');
for (const k in p.need) p.need[k] = 90; site = place('house', 5, 4); p.x = site.x + 1.5; p.z = site.z + 3; // inşaat halinde
const build = c.commandOptions(p, { kind: 'building', b: site })[0]; console.log(build.f());
if (p.act.type !== 'build') throw new Error('inşa başlamadı');
run(60); if (site.prog < 1) throw new Error('inşa bitmedi ' + JSON.stringify({prog: site.prog, act: p.act, wood: c.res.wood, pos: [p.x, p.z], site: [site.x, site.z, site.door]}));
// tarla
for (const k in p.need) p.need[k] = 90; p.x = field.x + 2; p.z = field.z + 2; field.stage = 2; field.worker = -1; const farm = c.commandOptions(p, { kind: 'building', b: field })[0]; console.log(farm.f()); if (p.act.type !== 'farm' || !p.act.cmd) throw new Error('tarla komutu yok'); const wh = c.res.wheat; run(45);
if (field.stage === 2 && c.res.wheat <= wh) throw new Error('hasat olmadı ' + JSON.stringify({act: p.act, worker: field.worker, stage: field.stage, need: p.need, pos: [p.x, p.z], f: [field.x, field.z], age: p.age}));
// çocuk iş yapamaz
const kid = c.addPerson(p.x, p.z, { age: 6 });
console.log('çocuk ağaç:', c.commandOptions(kid, { kind: 'tree', cell: tc }).length, 'okul:', c.commandOptions(kid, { kind: 'building', b: school }).map((o) => o.t));
// yere git + kıyı
const g = c.commandOptions(p, { kind: 'ground', x: p.x + 3, z: p.z, water: false }); console.log('yer:', g.map((o) => o.t));
console.log('KOMUT OK');
