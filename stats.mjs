import { World, N, SEA, SOIL } from './src/sim.js';
for (const seed of [1,2,3,1234,777]) {
  const w = new World(); w.generate(seed);
  let land=0, rock=0, snow=0, sand=0, mx=-99; 
  for (let z=0;z<N;z++) for(let x=0;x<N;x++){ const c=z*N+x, h=w.cellH(x,z); if(h>SEA){land++; mx=Math.max(mx,h); if(w.soil[c]==SOIL.ROCK)rock++; if(w.soil[c]==SOIL.SNOW)snow++; if(w.soil[c]==SOIL.SAND)sand++;} }
  console.log(seed,'land%',(100*land/N/N).toFixed(0),'rock%',(100*rock/land).toFixed(0),'snow%',(100*snow/land).toFixed(0),'sand%',(100*sand/land).toFixed(0),'max',mx.toFixed(1),'trees',w.treeCount,'vill',w.tribes.length);
}
