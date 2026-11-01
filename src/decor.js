/* ===================================================================
   Çim tutamları & kır çiçekleri (Yüksek ve üzeri, gerçekçi stil).
   Kameranın çevresindeki çimenli hücrelere deterministik olarak serpilir.
   Build sırasında main.js içine (//@@DECOR@@ işaretine) eklenir.
   =================================================================== */
const DEC = { R: 0, dens: 0, cx: 1e9, cz: 1e9, last: 0, scale: 1, flowers: 1, blocked: null, force: true, n: 0, nf: 0 };
const DEC_MAX = 26000, FLW_MAX = 3200;
const FLW_COLS = ['#ffffff', '#ffd93b', '#ff6b8b', '#b58cff', '#ff9a3c', '#7fc8ff'].map(hexRGB);

function tuftGeometry() {
  const P = [], Cc = [], Nn = [], I = [];
  const blade = (ox, oz, ang, h, w, bend) => {
    const c = Math.cos(ang), s = Math.sin(ang), base = P.length / 3;
    for (let k = 0; k <= 3; k++) {
      const t = k / 3, ww = w * (1 - t * 0.9) * 0.5, y = h * t, b = bend * t * t;
      for (const sx of [-1, 1]) {
        P.push(ox + c * sx * ww - s * b, y, oz + s * sx * ww + c * b);
        const g = 0.52 + 0.5 * t; Cc.push(g, g, g); Nn.push(0, 1, 0);
      }
    }
    for (let k = 0; k < 3; k++) { const a = base + k * 2; I.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  };
  for (let i = 0; i < 7; i++) {
    const a = i * 2.4 + 0.3, r = 0.03 + 0.08 * hash2(i, 1, 4);
    blade(Math.cos(a) * r, Math.sin(a) * r, a * 1.7, 0.22 + 0.18 * hash2(i, 2, 4), 0.05, 0.05 + 0.08 * hash2(i, 3, 4));
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(Cc, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(Nn, 3));
  g.setIndex(I);
  return g;
}
function flowerGeometry() {
  const P = [], Cc = [], Nn = [], I = [];
  const v = (x, y, z, r, g, b) => { P.push(x, y, z); Cc.push(r, g, b); Nn.push(0, 1, 0); return P.length / 3 - 1; };
  for (let k = 0; k < 2; k++) {   // sap: çapraz iki ince şerit
    const a = k * Math.PI / 2, c = Math.cos(a) * 0.012, s = Math.sin(a) * 0.012;
    const i0 = v(-c, 0, -s, 0.2, 0.5, 0.15), i1 = v(c, 0, s, 0.2, 0.5, 0.15), i2 = v(-c * 0.6, 0.2, -s * 0.6, 0.25, 0.55, 0.18), i3 = v(c * 0.6, 0.2, s * 0.6, 0.25, 0.55, 0.18);
    I.push(i0, i1, i2, i1, i3, i2);
  }
  const ctr = v(0, 0.215, 0, 0.55, 0.55, 0.55);
  for (let p = 0; p < 6; p++) {   // taç yapraklar (yelpaze)
    const a = p * Math.PI / 3, a2 = a + 0.5, a3 = a - 0.5;
    const t0 = v(Math.cos(a) * 0.1, 0.235, Math.sin(a) * 0.1, 1, 1, 1);
    const t1 = v(Math.cos(a2) * 0.06, 0.222, Math.sin(a2) * 0.06, 1, 1, 1), t2 = v(Math.cos(a3) * 0.06, 0.222, Math.sin(a3) * 0.06, 1, 1, 1);
    I.push(ctr, t1, t0, ctr, t0, t2);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(Cc, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(Nn, 3));
  g.setIndex(I);
  return g;
}
const tuftMat = new THREE.MeshLambertMaterial({ color: 0xffffff, vertexColors: true, side: THREE.DoubleSide });
tuftMat.onBeforeCompile = (sh) => {
  sh.uniforms.uTime = U.uTime; sh.uniforms.uGrass = SEAS.uGrass;
  sh.vertexShader = sh.vertexShader
    .replace('#include <common>', '#include <common>\nuniform float uTime; uniform vec3 uGrass;')
    .replace('#include <color_vertex>', '#include <color_vertex>\nvColor.xyz *= uGrass;')
    .replace('#include <begin_vertex>', `#include <begin_vertex>
      vec3 ip = vec3(instanceMatrix[3]);
      float sw = position.y * position.y * 0.55;
      transformed.x += sin(uTime * 2.1 + ip.x * 0.9 + ip.z * 0.6) * sw;
      transformed.z += cos(uTime * 1.7 + ip.z * 0.8 + ip.x * 0.4) * sw * 0.7;`);
};
// çift taraflı ince yapraklarda arka yüz normali ters dönüp kapkara olmasın: normal hep yukarı
const upNormalFix = (sh) => {
  sh.fragmentShader = sh.fragmentShader.replace('#include <normal_fragment_begin>', '#include <normal_fragment_begin>\n  normal = normalize((viewMatrix * vec4(0.0, 1.0, 0.0, 0.0)).xyz);');
};
const tuftBase = tuftMat.onBeforeCompile;
tuftMat.onBeforeCompile = (sh) => { tuftBase(sh); upNormalFix(sh); };
tuftMat.customProgramCacheKey = () => 'tuft';
const flowerMat = new THREE.MeshLambertMaterial({ color: 0xffffff, vertexColors: true, side: THREE.DoubleSide });
flowerMat.onBeforeCompile = (sh) => {
  sh.vertexShader = sh.vertexShader.replace('vColor.xyz *= instanceColor.xyz;', 'vColor.xyz *= mix(vec3(1.0), instanceColor.xyz, step(0.1, position.y));');
};
const flowerBase = flowerMat.onBeforeCompile;
flowerMat.onBeforeCompile = (sh) => { flowerBase(sh); upNormalFix(sh); };
flowerMat.customProgramCacheKey = () => 'flower';
const tuftM = makeInst(tuftGeometry(), tuftMat, DEC_MAX, true);
const flowerM = makeInst(flowerGeometry(), flowerMat, FLW_MAX, true);
tuftM.receiveShadow = flowerM.receiveShadow = true;
tuftM.visible = flowerM.visible = false;
scene.add(tuftM, flowerM);

function decorBuild() {
  const R = DEC.R, k = DEC.dens, tx = cam.x, tz = cam.z;
  const TA = tuftM.instanceMatrix.array, TC = tuftM.instanceColor.array, FA = flowerM.instanceMatrix.array, FC = flowerM.instanceColor.array;
  let n = 0, nf = 0;
  const x0 = Math.max(1, Math.floor(tx + HALF - R)), x1 = Math.min(N - 2, Math.ceil(tx + HALF + R));
  const z0 = Math.max(1, Math.floor(tz + HALF - R)), z1 = Math.min(N - 2, Math.ceil(tz + HALF + R));
  const base = Math.floor(k), frac = k - base, sc = DEC.scale;
  for (let cz = z0; cz <= z1; cz++) for (let cx = x0; cx <= x1; cx++) {
    const wx = cx - HALF + 0.5, wz = cz - HALF + 0.5, d = Math.hypot(wx - tx, wz - tz);
    if (d > R) continue;
    const cell = cz * N + cx;
    if (world.soil[cell] !== SOIL.GRASS || world.treeT[cell] || world.houseAt[cell] >= 0 || world.farmAt[cell] >= 0 || world.fire[cell] > 0) continue;
    const h = world.cellH(cx, cz);
    if (h < SEA + 0.55 || h > 11 || world.cellRange(cx, cz) > 1.1) continue;
    if (DEC.blocked && DEC.blocked(cx, cz)) continue;
    const fade = 1 - smooth(R * 0.72, R, d);
    const cnt = base + (hash2(cx, cz, 33) < frac ? 1 : 0);
    triColor(SOIL.GRASS, 1, h, 0.5);
    for (let i = 0; i < cnt && n < DEC_MAX; i++) {
      const j1 = hash2(cx, cz, 40 + i * 7), j2 = hash2(cx, cz, 41 + i * 7), j3 = hash2(cx, cz, 42 + i * 7), j4 = hash2(cx, cz, 43 + i * 7);
      const x = cx - HALF + j1, z = cz - HALF + j2, y = world.getHeight(x, z) - 0.02;
      const s = (0.7 + 0.7 * j3) * fade * sc * (1 - 0.8 * CL.cover) + 1e-4, ang = j4 * 6.2832, c = Math.cos(ang) * s, sn = Math.sin(ang) * s, o = n * 16, q = n * 3;
      TA[o] = c; TA[o + 1] = 0; TA[o + 2] = -sn; TA[o + 3] = 0; TA[o + 4] = 0; TA[o + 5] = s * (0.85 + 0.5 * j1); TA[o + 6] = 0; TA[o + 7] = 0;
      TA[o + 8] = sn; TA[o + 9] = 0; TA[o + 10] = c; TA[o + 11] = 0; TA[o + 12] = x; TA[o + 13] = y; TA[o + 14] = z; TA[o + 15] = 1;
      const m = 1.12 + 0.35 * (j2 - 0.5);
      TC[q] = _r * m; TC[q + 1] = _g * m * 1.04; TC[q + 2] = _b * m * 0.9;
      n++;
    }
    if (DEC.flowers && gameMode !== 'cozy' && nf < FLW_MAX &&hash2(cx, cz, 77) < 0.045 * (0.4 + k * 0.35) * CL.flowers * (1 - CL.cover)) {
      const j1 = hash2(cx, cz, 78), j2 = hash2(cx, cz, 79), x = cx - HALF + j1, z = cz - HALF + j2, y = world.getHeight(x, z) - 0.02;
      const s = (0.85 + 0.5 * hash2(cx, cz, 80)) * fade * sc + 1e-4, o = nf * 16, q = nf * 3, col = FLW_COLS[(hash2(cx, cz, 81) * FLW_COLS.length) | 0];
      FA[o] = s; FA[o + 1] = 0; FA[o + 2] = 0; FA[o + 3] = 0; FA[o + 4] = 0; FA[o + 5] = s; FA[o + 6] = 0; FA[o + 7] = 0;
      FA[o + 8] = 0; FA[o + 9] = 0; FA[o + 10] = s; FA[o + 11] = 0; FA[o + 12] = x; FA[o + 13] = y; FA[o + 14] = z; FA[o + 15] = 1;
      FC[q] = col[0]; FC[q + 1] = col[1]; FC[q + 2] = col[2];
      nf++;
    }
  }
  tuftM.count = n; flowerM.count = nf; DEC.n = n; DEC.nf = nf;
  tuftM.instanceMatrix.needsUpdate = tuftM.instanceColor.needsUpdate = true;
  flowerM.instanceMatrix.needsUpdate = flowerM.instanceColor.needsUpdate = true;
  DEC.cx = tx; DEC.cz = tz;
}
// kalite/stil değişince çağrılır: [yarıçap, yoğunluk] ya da null
function decorConfig(cfg) {
  const on = !!cfg && isReal;
  DEC.R = on ? cfg[0] : 0; DEC.dens = on ? cfg[1] : 0; DEC.force = true;
  if (!on) { tuftM.visible = flowerM.visible = false; tuftM.count = flowerM.count = 0; }
}
function decorUpdate(dt) {
  if (!DEC.R || inMenu) { tuftM.visible = flowerM.visible = false; return; }
  const far = gameMode === 'cozy' ? 0 : cam.dist;
  if (far > 78) { tuftM.visible = flowerM.visible = false; DEC.force = true; return; }
  const R0 = DEC.R;
  if (far) DEC.R = Math.min(R0, Math.max(10, far * 0.9 + 6));
  DEC.last += dt;
  const moved = Math.hypot(cam.x - DEC.cx, cam.z - DEC.cz);
  if (DEC.force || moved > Math.max(2.2, DEC.R * 0.08) || DEC.last > 1.6) { decorBuild(); DEC.force = false; DEC.last = 0; }
  DEC.R = R0;
  tuftM.visible = flowerM.visible = true;
}
