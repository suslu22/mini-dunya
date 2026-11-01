import { World, N, HALF, SEA, SOIL } from './src/sim.js';
const w = new World();
const fxc = {};
w.fx = (t)=>{ fxc[t]=(fxc[t]||0)+1; };
let t0=performance.now();
w.generate(1234);
console.log('generate ms', (performance.now()-t0).toFixed(1));
let land=0, mn=1e9, mx=-1e9;
for (let i=0;i<w.H.length;i++){ if(w.H[i]>SEA) land++; mn=Math.min(mn,w.H[i]); mx=Math.max(mx,w.H[i]); }
console.log('land%', (100*land/w.H.length).toFixed(1), 'min',mn.toFixed(1),'max',mx.toFixed(1));
console.log('trees', w.treeCount, 'tribes', w.tribes.length, 'houses', w.houses.length, 'humans', w.humans.length);
// ascii map 80x40
const chars = ' .:-=+*#%@';
let out='';
for (let z=0; z<N; z+=4){ let row=''; for(let x=0;x<N;x+=2){ const c=z*N+x; const h=w.cellH(x,z);
  let ch = h<SEA?'~': w.houseAt[c]>=0?'H': w.treeT[c]?(w.treeT[c]==2?'^':'t'): w.soil[c]==SOIL.SAND?'.': w.soil[c]==SOIL.SNOW?'*': w.soil[c]==SOIL.ROCK?'#': ' ';
  row+=ch;} out+=row+'\n'; }
console.log(out);
// simulate 5 minutes sim time at 30fps
t0=performance.now();
for (let i=0;i<30*300;i++){ w.update(1/30); if (i%1500===0) console.log('t',(i/30)|0,'pop',w.humans.length,'houses',w.houses.length,'trees',w.treeCount,'tribes',w.tribes.map(t=>t.pop+'/'+t.houses).join(' ')); }
console.log('sim ms per update', ((performance.now()-t0)/9000).toFixed(3));
// NaN check
for (const h of w.humans){ if(!isFinite(h.x)||!isFinite(h.z)||!isFinite(h.y)) throw new Error('NaN human'); }
// tools
w.spawnGroup(0,0,5); w.spawnVillage(20,20,3);
w.editTerrain('up',10,10,5,0.1,0); w.editTerrain('flat',10,10,5,0.1,2); w.paintSoil(SOIL.SNOW,0,0,4);
w.plantTrees(-20,-20,6,0.7); w.clearTrees(-20,-20,3); w.eraseAll(20,20,4);
w.lightning(5,5); w.meteor(-30,30); w.lavaBrush(30,-30,3,0.1); w.igniteArea(-20,-20,4,1);
w.raining=true;
for (let i=0;i<30*60;i++) w.update(1/30);
console.log('after tools: pop',w.humans.length,'houses',w.houses.length,'trees',w.treeCount,'burning',w.burning.length);
console.log('fx counts', JSON.stringify(fxc));
// consistency checks
for (let i=0;i<w.houses.length;i++){ if (w.houseAt[w.houses[i].cell]!==i) throw new Error('houseAt mismatch'); }
let tc=0; for (let i=0;i<N*N;i++) if (w.treeT[i]) tc++; if (tc!==w.treeCount) throw new Error('treeCount mismatch '+tc+' vs '+w.treeCount);
let pop=0; for (const t of w.tribes) pop+=t.pop; if (pop!==w.humans.length) throw new Error('pop mismatch '+pop+' vs '+w.humans.length);
console.log('OK');

// ---- kayıt/yükleme turu
{
  const json = JSON.stringify(w.serialize());
  console.log('kayıt boyutu KB', (json.length / 1024).toFixed(0));
  const w2 = new World(); w2.fx = () => {};
  if (!w2.deserialize(JSON.parse(json))) throw new Error('deserialize başarısız');
  const live = w.humans.filter(h => !h.dead);
  if (w2.humans.length !== live.length) throw new Error('human sayısı');
  if (w2.houses.length !== w.houses.length) throw new Error('ev sayısı');
  if (w2.treeCount !== w.treeCount) throw new Error('ağaç sayısı');
  if (w2.burning.length !== w.burning.length) throw new Error('yangın');
  if (w2.raining !== w.raining || Math.abs(w2.simTime - w.simTime) > 1e-6) throw new Error('durum');
  for (let i = 0; i < w.H.length; i++) if (Math.abs(w.H[i] - w2.H[i]) > 0.0006) throw new Error('yükseklik ' + i);
  for (let i = 0; i < N * N; i++) if (w.soil[i] !== w2.soil[i] || w.treeT[i] !== w2.treeT[i]) throw new Error('hücre ' + i);
  for (let i = 0; i < w2.houses.length; i++) if (w2.houseAt[w2.houses[i].cell] !== i) throw new Error('houseAt');
  let pop2 = 0; for (const t of w2.tribes) pop2 += t.pop;
  if (pop2 !== w2.humans.length) throw new Error('kabile pop');
  for (let i = 0; i < 30 * 30; i++) w2.update(1 / 30);
  if (w2.deserialize({ v: 9 }) !== false) throw new Error('bozuk veri kabul edildi');
  console.log('KAYIT OK  humans', w2.humans.length, 'houses', w2.houses.length);
}
