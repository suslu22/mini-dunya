/* ===================================================================
   Ada Modu - 3B görünüm: ada nesneleri, binalar, karakterler, böcekler,
   olta, kamera (birinci/üçüncü şahıs + izometrik) ve girdi.
   Build sırasında main.js içine (//@@DETAIL@@ işaretine) eklenir.
   =================================================================== */
const cozy = new Cozy(world);
const C_DAYLEN = 480;                       // Ada Modu'nda bir gün 8 dakika
const cRoot = new THREE.Group(); cRoot.visible = false; scene.add(cRoot);
const CAM_NAMES = { tp: 'Üçüncü şahıs', fp: 'Birinci şahıs', iso: 'İzometrik' };
let czModalOpen = false;
const czBlocked = () => czModalOpen || czSleeping || !$('settings').hidden || !$('saves').hidden;
const cv = {
  mode: 'tp', yaw: 0.2, dyaw: 0.2, pitch: 0.42, dist: 5.6, ddist: 5.6, fpAng: 0, fpPitch: 0, iso: 0, isoDist: 17, disoDist: 17,
  joy: { x: 0, y: 0 }, fov: 36, near: 0.5, preview: false, pend: null, vw: null, shown: false,
  wph: 0, as: 0, mv: false,   // yürüme fazı, yumuşatılmış hız, yürüyor mu (histerezis)
};
try { const m = localStorage.getItem('minidunya.cozycam'); if (m === 'fp' || m === 'tp' || m === 'iso') cv.mode = m; } catch (_) { /* yoksay */ }

/* ---------------------------------------------------------------- birleştirilmiş küçük geometriler */
const cPropMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.82, metalness: 0.02 });
hdPatch(cPropMat, 'stucco', { sc: 3, amt: 0.28, bump: 0.6, id: 'cp' });
const cTmpM = new THREE.Matrix4(), cTmpQ = new THREE.Quaternion(), cTmpE = new THREE.Euler(), cTmpV = new THREE.Vector3(), cTmpS = new THREE.Vector3();
function cMerge(parts) {
  const gs = parts.map((q) => {
    let g = q.g.clone();
    if (g.index) g = g.toNonIndexed();   // ExtrudeGeometry indekssiz, diğerleri indeksli: birleşebilmeleri için hepsi indekssiz
    cTmpM.compose(cTmpV.set(...(q.p || [0, 0, 0])), cTmpQ.setFromEuler(cTmpE.set(...(q.r || [0, 0, 0]))), cTmpS.set(...(q.s || [1, 1, 1])));
    g.applyMatrix4(cTmpM);
    const col = new THREE.Color(q.c), n = g.attributes.position.count, arr = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { arr[i * 3] = col.r; arr[i * 3 + 1] = col.g; arr[i * 3 + 2] = col.b; }
    g.setAttribute('color', new THREE.BufferAttribute(arr, 3));
    for (const k of Object.keys(g.attributes)) if (k !== 'position' && k !== 'normal' && k !== 'uv' && k !== 'color') g.deleteAttribute(k);
    return g;
  });
  return mergeGeometries(gs);
}
const gB = (w, h, d, c, x, y, z, ry = 0) => ({ g: new THREE.BoxGeometry(w, h, d), c, p: [x, y, z], r: [0, ry, 0] });
const gC = (r1, r2, h, c, x, y, z, seg = 10) => ({ g: new THREE.CylinderGeometry(r1, r2, h, seg), c, p: [x, y, z] });
const gS = (r, c, x, y, z, sx = 1, sy = 1, sz = 1) => ({ g: new THREE.SphereGeometry(r, 12, 8), c, p: [x, y, z], s: [sx, sy, sz] });
const gK = (r, h, c, x, y, z, seg = 8, rx = 0, rz = 0) => ({ g: new THREE.ConeGeometry(r, h, seg), c, p: [x, y, z], r: [rx, 0, rz] });
const gRoof = (w, h, l, c, x, y, z, alongX = true) => {
  const s = new THREE.Shape(); s.moveTo(-w / 2, 0); s.lineTo(w / 2, 0); s.lineTo(0, h); s.closePath();
  const e = new THREE.ExtrudeGeometry(s, { depth: l, bevelEnabled: false }); e.translate(0, 0, -l / 2);
  return { g: e, c, p: [x, y, z], r: [0, alongX ? Math.PI / 2 : 0, 0] };
};

const C_KIND_PARTS = () => {
  const K = {};
  const leaf = '#5fa23a', leaf2 = '#7bc24a', soil = '#6b4a2e';
  K.weed = [0, 1, 2, 3, 4].map((i) => ({ g: new THREE.ConeGeometry(0.05, 0.45, 5), c: i % 2 ? '#4f9a35' : '#69b840', p: [Math.cos(i * 1.26) * 0.08, 0.2, Math.sin(i * 1.26) * 0.08], r: [Math.sin(i * 1.26) * 0.35, 0, -Math.cos(i * 1.26) * 0.35] }));
  K.fs0 = [gS(0.15, soil, 0, 0.03, 0, 1, 0.35, 1)];
  K.fs1 = [gS(0.15, soil, 0, 0.03, 0, 1, 0.35, 1), gC(0.012, 0.014, 0.18, leaf, 0, 0.12, 0, 5), gS(0.05, leaf2, 0.05, 0.2, 0, 1, 0.5, 0.7), gS(0.05, leaf2, -0.05, 0.17, 0, 1, 0.5, 0.7)];
  K.fs2 = [gC(0.014, 0.016, 0.34, leaf, 0, 0.17, 0, 5), gS(0.06, leaf2, 0.07, 0.18, 0, 1, 0.45, 0.7), gS(0.06, leaf2, -0.07, 0.14, 0, 1, 0.45, 0.7), gS(0.055, '#9ad65a', 0, 0.36, 0, 0.9, 1.2, 0.9)];
  Z_FLOWERS.forEach((f, k) => {
    const pet = [];
    for (let i = 0; i < 6; i++) pet.push(gS(0.055, f.col, Math.cos(i * 1.047) * 0.075, 0.4, Math.sin(i * 1.047) * 0.075, 1, 0.55, 1));
    K['fb' + k] = [gC(0.014, 0.016, 0.36, leaf, 0, 0.18, 0, 5), gS(0.06, leaf2, 0.07, 0.16, 0, 1, 0.45, 0.7), gS(0.06, leaf2, -0.07, 0.12, 0, 1, 0.45, 0.7), ...pet, gS(0.045, '#ffcf3a', 0, 0.42, 0, 1, 0.8, 1)];
  });
  K.sap0 = [gS(0.17, soil, 0, 0.03, 0, 1, 0.35, 1), gC(0.015, 0.02, 0.14, '#8b6a3d', 0, 0.1, 0, 5), gS(0.06, leaf2, 0.05, 0.2, 0, 1, 0.5, 0.8), gS(0.06, leaf2, -0.05, 0.18, 0, 1, 0.5, 0.8)];
  K.sap1 = [gC(0.02, 0.03, 0.5, '#8b6a3d', 0, 0.25, 0, 6), gS(0.17, leaf, 0, 0.55, 0, 1, 0.9, 1), gS(0.12, leaf2, 0.1, 0.45, 0.05)];
  K.sap2 = [gC(0.03, 0.045, 0.8, '#7a5230', 0, 0.4, 0, 6), gS(0.3, leaf, 0, 0.92, 0, 1, 0.9, 1), gS(0.2, leaf2, 0.17, 0.75, 0.08), gS(0.18, leaf, -0.15, 0.78, -0.1)];
  K.hole = [gC(0.36, 0.36, 0.04, '#7a5a3c', 0, 0.02, 0, 16), gC(0.27, 0.27, 0.05, '#2c1f14', 0, 0.03, 0, 16)];
  K.rock = [gS(0.5, '#8d9096', 0, 0.26, 0, 1, 0.72, 1), gS(0.28, '#7b7e84', 0.42, 0.14, 0.2), gS(0.22, '#9a9da3', -0.34, 0.11, -0.32), gS(0.2, '#a9abb0', 0.05, 0.5, 0.05, 1, 0.5, 1)];
  K.stump = [gC(0.24, 0.3, 0.3, '#7a5230', 0, 0.15, 0, 10), gC(0.22, 0.22, 0.02, '#d9b27a', 0, 0.3, 0, 10), gC(0.12, 0.12, 0.025, '#c49a60', 0, 0.305, 0, 10)];
  K.fossil = [gB(0.55, 0.012, 0.07, '#4a3626', 0, 0.018, 0, Math.PI / 4), gB(0.55, 0.012, 0.07, '#4a3626', 0, 0.018, 0, -Math.PI / 4), gB(0.35, 0.012, 0.05, '#5a4630', 0, 0.02, 0, 0), gB(0.05, 0.012, 0.35, '#5a4630', 0, 0.02, 0, 0)];
  const fruit = (c) => [gS(0.1, c, 0, 0.1, 0), gS(0.03, '#4f9a35', 0, 0.2, 0)];
  K.it_apple = fruit('#e23b3b'); K.it_orange = fruit('#ff9a1f'); K.it_cherry = [gS(0.07, '#c4122f', -0.05, 0.07, 0), gS(0.07, '#c4122f', 0.05, 0.07, 0.02), gC(0.006, 0.006, 0.14, '#4f7a2a', 0, 0.16, 0, 4)];
  K.it_wood = [{ g: new THREE.CylinderGeometry(0.07, 0.07, 0.5, 8), c: '#8b5a2b', p: [0, 0.08, 0.06], r: [0, 0, Math.PI / 2] }, { g: new THREE.CylinderGeometry(0.07, 0.07, 0.46, 8), c: '#9a6a36', p: [0.04, 0.2, -0.05], r: [0, 0.3, Math.PI / 2] }];
  K.it_stone = [gS(0.14, '#8d9096', 0, 0.1, 0, 1, 0.75, 1), gS(0.09, '#a3a6ac', 0.14, 0.07, 0.06)];
  K.it_clay = [gS(0.13, '#c4733f', 0, 0.09, 0, 1, 0.7, 1), gS(0.09, '#d68350', 0.12, 0.07, 0.05)];
  K.it_iron = [gB(0.18, 0.1, 0.12, '#555a66', 0, 0.06, 0, 0.4), gB(0.1, 0.07, 0.1, '#6a707c', 0.1, 0.04, 0.08, 1.1)];
  K.it_gold = [gS(0.14, '#ffd34d', 0, 0.1, 0, 1, 0.8, 1), gS(0.07, '#fff09a', 0.06, 0.17, 0.02)];
  K.it_shell = [gS(0.12, '#fff0e6', 0, 0.06, 0, 1, 0.5, 0.9), gS(0.07, '#ffb8c6', 0, 0.09, 0.03, 1, 0.6, 1)];
  K.it_oyster = [gS(0.14, '#c9c4bb', 0, 0.05, 0, 1, 0.38, 0.85), gS(0.06, '#f4efe6', 0, 0.09, 0, 1, 0.5, 1)];
  K.it_other = [gS(0.13, '#d9a94a', 0, 0.1, 0, 1, 0.9, 1), gS(0.05, '#8b5a2b', 0, 0.22, 0)];
  // mobilyalar
  const wd = '#a8743c', wd2 = '#8a5a2a';
  K.f_bench = [gB(0.95, 0.06, 0.36, wd, 0, 0.32, 0), gB(0.95, 0.34, 0.05, wd, 0, 0.56, -0.17), gB(0.07, 0.32, 0.3, wd2, -0.4, 0.16, 0), gB(0.07, 0.32, 0.3, wd2, 0.4, 0.16, 0)];
  K.f_table = [gC(0.46, 0.46, 0.05, '#b98a52', 0, 0.5, 0, 18), gC(0.07, 0.1, 0.48, wd2, 0, 0.24, 0, 8), gC(0.26, 0.28, 0.03, '#f4ecd8', 0, 0.535, 0, 14), gC(0.1, 0.1, 0.08, '#d65b5b', 0, 0.58, 0, 10)];
  K.f_chair = [gB(0.36, 0.05, 0.36, wd, 0, 0.3, 0), gB(0.36, 0.38, 0.04, wd, 0, 0.52, -0.16), gB(0.04, 0.3, 0.04, wd2, -0.15, 0.15, 0.15), gB(0.04, 0.3, 0.04, wd2, 0.15, 0.15, 0.15), gB(0.04, 0.3, 0.04, wd2, -0.15, 0.15, -0.15), gB(0.04, 0.3, 0.04, wd2, 0.15, 0.15, -0.15)];
  K.f_lamp = [gC(0.1, 0.13, 0.1, '#33353d', 0, 0.05, 0, 8), gC(0.035, 0.05, 1.9, '#3a3a42', 0, 0.98, 0, 8), gC(0.17, 0.12, 0.08, '#33353d', 0, 1.96, 0, 8), gS(0.17, '#fff1b8', 0, 2.1, 0), gK(0.22, 0.14, '#33353d', 0, 2.3, 0, 8)];
  K.f_campfire = [gS(0.14, '#8d9096', 0.4, 0.07, 0, 1, 0.7, 1), gS(0.14, '#8d9096', -0.4, 0.07, 0, 1, 0.7, 1), gS(0.14, '#8d9096', 0, 0.07, 0.4, 1, 0.7, 1), gS(0.14, '#8d9096', 0, 0.07, -0.4, 1, 0.7, 1),
    gS(0.13, '#7b7e84', 0.28, 0.07, 0.28, 1, 0.7, 1), gS(0.13, '#7b7e84', -0.28, 0.07, 0.28, 1, 0.7, 1), gS(0.13, '#7b7e84', 0.28, 0.07, -0.28, 1, 0.7, 1), gS(0.13, '#7b7e84', -0.28, 0.07, -0.28, 1, 0.7, 1),
    { g: new THREE.CylinderGeometry(0.05, 0.05, 0.6, 6), c: '#5a3a1e', p: [0, 0.1, 0], r: [0, 0.4, Math.PI / 2] }, { g: new THREE.CylinderGeometry(0.05, 0.05, 0.6, 6), c: '#6b4524', p: [0, 0.14, 0], r: [0, -0.9, Math.PI / 2] },
    gK(0.2, 0.5, '#ff8a2a', 0, 0.38, 0, 7), gK(0.11, 0.34, '#ffd34d', 0, 0.34, 0, 7)];
  K.f_umbrella = [gC(0.025, 0.03, 1.7, '#e8e0d0', 0, 0.85, 0, 6), gK(0.95, 0.4, '#e8553a', 0, 1.78, 0, 12), gK(0.5, 0.3, '#f6f0e0', 0, 1.9, 0, 12), gS(0.04, '#e8e0d0', 0, 2.1, 0)];
  K.f_fence = [gB(0.07, 0.62, 0.07, '#d9c29a', -0.46, 0.31, 0), gB(0.07, 0.62, 0.07, '#d9c29a', 0.46, 0.31, 0), gB(1.0, 0.07, 0.05, '#e8d4ac', 0, 0.5, 0), gB(1.0, 0.07, 0.05, '#e8d4ac', 0, 0.28, 0)];
  K.f_pot = [gC(0.22, 0.15, 0.3, '#c4733f', 0, 0.15, 0, 12), gC(0.23, 0.23, 0.04, '#d68350', 0, 0.3, 0, 12), gS(0.24, '#4f9a35', 0, 0.5, 0, 1, 0.9, 1), gS(0.14, '#6fc14a', 0.12, 0.62, 0.05), gS(0.06, '#ff6b8b', 0.1, 0.72, 0.1), gS(0.06, '#ffd93b', -0.1, 0.66, -0.05)];
  K.f_fountain = [gC(0.95, 1.0, 0.32, '#aab0b8', 0, 0.16, 0, 20), gC(0.8, 0.8, 0.04, '#7fc8ff', 0, 0.32, 0, 20), gC(0.14, 0.2, 0.75, '#c8ccd2', 0, 0.55, 0, 10), gC(0.42, 0.2, 0.1, '#b8bec6', 0, 0.95, 0, 14), gC(0.34, 0.34, 0.02, '#7fc8ff', 0, 1.0, 0, 14), gS(0.09, '#d8f0ff', 0, 1.15, 0)];
  K.f_rug = [gB(1.0, 0.02, 1.0, '#c9503c', 0, 0.012, 0), gB(0.82, 0.022, 0.82, '#f1d9a0', 0, 0.014, 0), gB(0.6, 0.024, 0.6, '#3f8a8a', 0, 0.016, 0)];
  return K;
};
const cKinds = {};
(function buildKinds() {
  const P = C_KIND_PARTS();
  for (const k of Object.keys(P)) {
    const m = new THREE.InstancedMesh(cMerge(P[k]), cPropMat, k === 'weed' ? 220 : 420);
    m.castShadow = !/^(hole|fossil|f_rug)$/.test(k); m.receiveShadow = true; m.count = 0; m.visible = false; m.frustumCulled = false;
    cRoot.add(m); cKinds[k] = m;
  }
  // ağaç meyveleri
  for (const f of ['apple', 'orange', 'cherry']) {
    const m = new THREE.InstancedMesh(new THREE.SphereGeometry(0.1, 8, 6), new THREE.MeshStandardMaterial({ color: Z_TREES[f].col, roughness: 0.45 }), 400);
    m.castShadow = false; m.count = 0; m.visible = false; m.frustumCulled = false; cRoot.add(m); cKinds['fr_' + f] = m;
  }
})();
const C_ITEMKIND = { wood: 'it_wood', stone: 'it_stone', clay: 'it_clay', iron: 'it_iron', gold: 'it_gold', weed: 'weed', apple: 'it_apple', orange: 'it_orange', cherry: 'it_cherry', shell: 'it_shell', oyster: 'it_oyster' };
function cKindOf(o) {
  switch (o.t) {
    case 'weed': return 'weed';
    case 'flower': return o.stage >= 3 ? 'fb' + o.k : 'fs' + o.stage;
    case 'sap': return 'sap' + Math.min(2, o.stage);
    case 'hole': return 'hole';
    case 'rock': return 'rock';
    case 'stump': return 'stump';
    case 'fossil': return 'fossil';
    case 'furn': return 'f_' + o.id;
    case 'item': return C_ITEMKIND[o.id] || 'it_other';
    default: return null;
  }
}
let cObjT = 0;
function cSyncObjs(t, force) {
  if (!force && t - cObjT < 0.12) return;
  cObjT = t;
  const cnt = {};
  for (const k in cKinds) cnt[k] = 0;
  const m4 = cTmpM, q = cTmpQ, e = cTmpE, pv = cTmpV, sv = cTmpS;
  for (const [c, o] of cozy.obj) {
    const kind = cKindOf(o); if (!kind) continue;
    const mesh = cKinds[kind]; if (!mesh) continue;
    const i = cnt[kind]; if (i >= mesh.instanceMatrix.count) continue;
    const pos = cozy.cellPos(c);
    let x = pos.x, z = pos.z, y = 0, rot = hash2(c, 3, 1) * 6.28, s = 1;
    if (o.t === 'item') { x += o.ox; z += o.oz; rot = t * 1.6 + c; y = 0.04 + Math.sin(t * 2.4 + c) * 0.03; }
    else if (o.t === 'furn') rot = o.rot || 0;
    else if (o.t === 'rock') s = 0.6 + 0.4 * (o.hp / 6);
    else if (o.t === 'flower') s = o.stage < 3 ? 1 : 1.0 + 0.1 * Math.sin(t * 1.6 + c);
    else if (o.t === 'weed') s = 0.85 + hash2(c, 9, 1) * 0.5;
    y += world.getHeight(x, z) - 0.02;
    m4.compose(pv.set(x, y, z), q.setFromEuler(e.set(0, rot, 0)), sv.set(s, s, s));
    mesh.setMatrixAt(i, m4); cnt[kind] = i + 1;
  }
  // meyveler
  const fruitMesh = (f) => cKinds['fr_' + f];
  const trees = world.treeS, born = world.treeBorn;
  for (const [c, mt] of cozy.trees) {
    const K = Z_TREES[mt.k]; if (!K || !K.fruit || mt.fruit <= 0 || !world.treeT[c]) continue;
    const mesh = fruitMesh(K.fruit), kind = 'fr_' + K.fruit;
    const tp = cozy.treePos(c), age = world.simTime - born[c], gs = age < 40 ? 0.35 + 0.65 * smooth(0, 1, age / 40) : 1, s = trees[c] * gs;
    for (let f = 0; f < mt.fruit; f++) {
      const i = cnt[kind]; if (i >= mesh.instanceMatrix.count) break;
      const a = hash2(c, f, 5) * 6.28 + f * 2.1, r = 0.34 * s;
      m4.compose(pv.set(tp.x + Math.cos(a) * r, world.getHeight(tp.x, tp.z) + (0.62 + hash2(c, f, 6) * 0.3) * s, tp.z + Math.sin(a) * r), q.identity(), sv.set(1, 1, 1));
      mesh.setMatrixAt(i, m4); cnt[kind] = i + 1;
    }
  }
  for (const k in cKinds) { const m = cKinds[k]; m.count = cnt[k]; m.visible = cnt[k] > 0; m.instanceMatrix.needsUpdate = true; }
}

/* ---------------------------------------------------------------- binalar */
const cStatic = new THREE.Group(); cRoot.add(cStatic);
const cBuildViews = new Map();
function cSign(text, bg, fg, w = 256, h = 96, sub) {
  const cv2 = document.createElement('canvas'); cv2.width = w; cv2.height = h;
  const g = cv2.getContext('2d');
  g.fillStyle = bg; g.fillRect(0, 0, w, h);
  g.strokeStyle = fg; g.lineWidth = 6; g.strokeRect(6, 6, w - 12, h - 12);
  g.fillStyle = fg; g.textAlign = 'center'; g.textBaseline = 'middle';
  // yazı çerçeveye sığana kadar küçülür (uzun başlıklar kesilmesin)
  const maxW = w - 44, fit = (s, wt, px) => { for (; px > 10; px -= 2) { g.font = wt + ' ' + px + 'px sans-serif'; if (g.measureText(s).width <= maxW) break; } };
  fit(text, 800, Math.round(sub ? h * 0.36 : h * 0.42)); g.fillText(text, w / 2, sub ? h * 0.38 : h / 2);
  if (sub) { fit(sub, 600, Math.round(h * 0.23)); g.fillText(sub, w / 2, h * 0.74); }
  const tx = new THREE.CanvasTexture(cv2); tx.colorSpace = THREE.SRGBColorSpace; tx.anisotropy = 4;
  return tx;
}
function cPlane(w, h, tex) { return new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.7 })); }
function cCottage(b, big) {
  const hx = b.hx, hz = b.hz, wh = big ? 2.5 : 2.2, P = [];
  P.push(gB(hx * 2 + 0.2, 0.7, hz * 2 + 0.2, '#8f8c86', 0, -0.25, 0));
  P.push(gB(hx * 2, wh, hz * 2, b.wall, 0, wh / 2 + 0.05, 0));
  P.push(gB(hx * 2 + 0.06, 0.12, hz * 2 + 0.06, shadeHex(b.wall, 0.82), 0, 0.12, 0));
  P.push(gRoof(hz * 2 + 1.0, 1.5, hx * 2 + 1.0, b.roof, 0, wh + 0.05, 0, true));
  P.push(gB(0.95, 1.7, 0.1, '#6b4524', big ? -hx * 0.45 : 0, 0.9, hz + 0.03));
  P.push(gS(0.05, '#e8c25a', (big ? -hx * 0.45 : 0) + 0.32, 0.9, hz + 0.12));
  P.push(gB(1.5, 0.12, 0.7, '#a7a29a', big ? -hx * 0.45 : 0, 0.0, hz + 0.45));
  P.push(gB(0.5, 0.9, 0.5, '#b25c44', hx * 0.55, wh + 0.9, -hz * 0.3));
  P.push(gB(0.62, 0.1, 0.62, '#8a4a36', hx * 0.55, wh + 1.38, -hz * 0.3));
  const m = new THREE.Mesh(cMerge(P), cPropMat); m.castShadow = true; m.receiveShadow = true;
  const g = new THREE.Group(); g.add(m);
  const WG = new THREE.BoxGeometry(0.7, 0.7, 0.08);
  const xs = big ? [hx * 0.2, hx * 0.62] : [-hx * 0.5, hx * 0.5];
  for (const x of xs) {
    const w = new THREE.Mesh(WG, winMat); w.position.set(x, 1.35, hz + 0.04); g.add(w);
    const fr = new THREE.Mesh(new THREE.BoxGeometry(0.84, 0.84, 0.05), cPropMat); // pencere çerçevesi (köşe renkleri)
    fr.geometry = cMerge([gB(0.86, 0.86, 0.05, '#f6f0e4', 0, 0, 0)]); fr.position.set(x, 1.35, hz + 0.01); g.add(fr);
    const fb = new THREE.Mesh(cMerge([gB(0.8, 0.16, 0.18, '#7a5230', 0, 0, 0), gS(0.07, '#ff6b8b', -0.25, 0.14, 0), gS(0.07, '#ffd93b', 0, 0.14, 0), gS(0.07, '#b58cff', 0.25, 0.14, 0)]), cPropMat);
    fb.position.set(x, 0.88, hz + 0.12); g.add(fb);
  }
  return g;
}
function cShop(b) {
  const hx = b.hx, hz = b.hz, P = [];
  P.push(gB(hx * 2 + 0.2, 0.7, hz * 2 + 0.2, '#8f8c86', 0, -0.25, 0));
  P.push(gB(hx * 2, 2.6, hz * 2, b.wall, 0, 1.35, 0));
  P.push(gB(hx * 2 + 0.7, 0.18, hz * 2 + 0.7, b.roof, 0, 2.72, 0));
  P.push(gRoof(hz * 2 + 0.9, 0.9, hx * 2 + 0.9, shadeHex(b.roof, 0.9), 0, 2.8, 0, true));
  P.push(gB(1.1, 1.8, 0.1, '#6b4524', 0, 0.95, hz + 0.03));
  P.push(gB(1.9, 0.12, 0.8, '#a7a29a', 0, 0.0, hz + 0.5));
  for (let i = 0; i < 8; i++) P.push({ g: new THREE.BoxGeometry(hx * 2 / 8 + 0.02, 0.07, 1.25), c: i % 2 ? '#f6f0e0' : '#e04a3a', p: [-hx + (i + 0.5) * hx * 2 / 8, 2.32 - 0.12, hz + 0.58], r: [0.34, 0, 0] });
  P.push(gB(0.12, 1.5, 0.12, '#6b4524', -hx + 0.1, 0.9, hz + 1.1), gB(0.12, 1.5, 0.12, '#6b4524', hx - 0.1, 0.9, hz + 1.1));
  P.push(gB(1.6, 0.9, 0.5, '#b98a52', hx - 0.7, 0.45, hz + 0.45), gS(0.12, '#e23b3b', hx - 1.0, 1.0, hz + 0.45), gS(0.12, '#ff9a1f', hx - 0.7, 1.0, hz + 0.45), gS(0.12, '#c4122f', hx - 0.4, 1.0, hz + 0.45));
  const g = new THREE.Group(), m = new THREE.Mesh(cMerge(P), cPropMat); m.castShadow = true; m.receiveShadow = true; g.add(m);
  for (const x of [-hx * 0.62, hx * 0.62]) { const w = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.9, 0.08), winMat); w.position.set(x, 1.5, hz + 0.04); g.add(w); }
  const sg = cPlane(2.4, 0.82, cSign('DÜKKÂN', '#2d6a4f', '#ffe8a3', 256, 96, 'Tomris'));
  sg.position.set(0, 3.15, hz + 0.06); g.add(sg);
  return g;
}
function cBoard(b) {
  // direkler tabelanın dışında; yazı levhası 2:1 oranlı, üzerine oturur
  const P = [gB(0.14, 1.8, 0.14, '#6b4524', -1.03, 0.9, 0), gB(0.14, 1.8, 0.14, '#6b4524', 1.03, 0.9, 0), gB(1.92, 1.0, 0.1, '#b98a52', 0, 1.3, 0), gRoof(2.4, 0.4, 0.42, '#7a5230', 0, 1.8, 0, false)];
  const g = new THREE.Group(), m = new THREE.Mesh(cMerge(P), cPropMat); m.castShadow = true; g.add(m);
  const pl = cPlane(1.78, 0.89, cSign('ADA PANOSU', '#f6ecd0', '#5a3a1e', 512, 256, '⭐'));
  pl.position.set(0, 1.3, 0.056); g.add(pl);
  return g;
}
function cCraft(b) {
  const P = [gB(1.7, 0.14, 0.9, '#b07f45', 0, 0.85, 0), gB(0.12, 0.85, 0.12, '#7a5230', -0.75, 0.42, -0.35), gB(0.12, 0.85, 0.12, '#7a5230', 0.75, 0.42, -0.35), gB(0.12, 0.85, 0.12, '#7a5230', -0.75, 0.42, 0.35), gB(0.12, 0.85, 0.12, '#7a5230', 0.75, 0.42, 0.35),
    gB(1.6, 0.06, 0.8, '#8a5a2a', 0, 0.3, 0), gB(0.16, 0.12, 0.3, '#6b7078', 0.5, 1.0, 0.1), gB(0.4, 0.04, 0.12, '#aab0b8', -0.3, 0.94, 0.1, 0.5), gB(0.12, 0.28, 0.12, '#8b6a3d', -0.55, 1.06, -0.1)];
  const g = new THREE.Group(), m = new THREE.Mesh(cMerge(P), cPropMat); m.castShadow = true; m.receiveShadow = true; g.add(m);
  const pl = cPlane(0.9, 0.34, cSign('YAPIM', '#f6ecd0', '#5a3a1e', 192, 72));
  pl.position.set(0, 1.45, -0.4); g.add(pl);
  return g;
}
function cBuildStatic() {
  for (const g of cBuildViews.values()) cStatic.remove(g);
  cBuildViews.clear();
  for (const b of cozy.builds) {
    const g = b.t === 'shop' ? cShop(b) : b.t === 'board' ? cBoard(b) : b.t === 'craft' ? cCraft(b) : cCottage(b, b.t === 'home');
    g.position.set(b.x, b.y, b.z);
    cStatic.add(g); cBuildViews.set(b.id, g);
  }
  // sokak lambaları
  cLampPosts.forEach((l) => cStatic.remove(l)); cLampPosts.length = 0;
  for (const [x, z] of cozy.lampPosts) {
    const l = new THREE.Mesh(cKinds.f_lamp.geometry, cPropMat); l.position.set(x, world.getHeight(x, z) - 0.02, z); l.castShadow = true; cStatic.add(l); cLampPosts.push(l);
  }
}
const cLampPosts = [];
function cUpdateBuildVis() {
  for (const b of cozy.builds) {
    const g = cBuildViews.get(b.id); if (!g) continue;
    g.visible = b.t !== 'vhome' || cozy.vill.some((v) => v.home === b.id);
  }
}

/* ---------------------------------------------------------------- karakterler */
let cPlayerV = null;
const cVillViews = new Map(), cBugViews = new Map(), cLabels = new Map();
const cLabelRoot = document.createElement('div'); cLabelRoot.id = 'clabels'; document.body.appendChild(cLabelRoot);
function cLookOf(L) { return Object.assign({}, L, { scale: (L.female ? 0.93 : 1) * 0.9 }); }
function cRebuildPlayer() {
  if (cPlayerV) cRoot.remove(cPlayerV.root);
  cPlayerV = buildHuman(cLookOf(cozy.look));
  cPlayerV.root.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  cRoot.add(cPlayerV.root);
}
function cSyncVillagers() {
  for (const v of cozy.vill) {
    if (cVillViews.has(v.id)) continue;
    const view = buildHuman(cLookOf(v.look)); cRoot.add(view.root); cVillViews.set(v.id, view);
    const l = document.createElement('div'); l.className = 'dlabel'; l.textContent = v.name; cLabelRoot.appendChild(l); cLabels.set(v.id, l);
    l.onclick = () => cTapVillager(v);
  }
}
function cPosePlayer(t, dt) {
  const v = cPlayerV; if (!v) return;
  const p = cozy.p, a = p.act, s9 = Math.sin(t * 9);
  // yürüme fazı birikimli, hız yumuşatılmış: fare ile dönerken / çapraz giderken hız dalgalansa da bacaklar başa sıçramaz
  cv.as += (p.speed - cv.as) * Math.min(1, dt * 9);
  if (!cv.mv && cv.as > 0.55) cv.mv = true; else if (cv.mv && cv.as < 0.3) cv.mv = false;
  cv.wph = (cv.wph + Math.min(dt, 0.1) * (6 + Math.min(cv.as, 6) * 1.5)) % 628.3185;
  const w = cv.wph, moving = cv.mv;
  let lL = 0, lR = 0, aL = 0, aR = 0, lean = 0, hy = 0, bob = 0, tool = Z_TOOLS[p.tool].m;
  if (p.held) tool = 'basket';
  if (moving) { const k = Math.min(1, cv.as / 3.3); lL = Math.sin(w) * 0.8 * k; lR = -lL; aL = lR * 0.8; aR = lL * 0.8; bob = Math.abs(Math.sin(w)) * 0.045 * k; if (tool) aR *= 0.4; }
  else { aL = Math.sin(t * 1.6) * 0.05; aR = -aL; }
  if (tool && !moving) aR = -0.35;
  if (a) {
    switch (a.type) {
      case 'chop': aR = -1.5 + s9 * 0.9; aL = -0.5; lean = 0.2; break;
      case 'dig': aR = -0.9 + Math.sin(t * 7) * 0.4; aL = -0.6; lean = 0.5; break;
      case 'net': aR = -1.7 + Math.sin(a.t / a.dur * 6) * 0.9; aL = -0.2; lean = 0.1; break;
      case 'water': aR = -1.2; aL = -0.5; lean = 0.2; break;
      case 'cast': aR = -1.6 + (a.t / a.dur) * 0.6; aL = -0.5; lean = 0.05; break;
      case 'reel': aR = -1.3 + Math.sin(t * 12) * 0.3; aL = -0.9; lean = -0.1; break;
      case 'pick': lean = 0.6; aR = -0.9; aL = -0.5; break;
      case 'shake': aL = aR = -2.4 + Math.sin(t * 20) * 0.3; break;
      case 'wave': aR = -2.7 + Math.sin(t * 9) * 0.4; hy = Math.sin(t * 3) * 0.2; tool = ''; break;
    }
  } else if (p.fish) { aR = -0.95 + Math.sin(t * 1.3) * 0.05; aL = -0.7; tool = 'rod'; }
  poseHuman(v, { lL, lR, aL, aR, lean, hy, tool, t, ph: 0, mood: 80 }, dt);
  v.root.position.set(p.x, p.y + bob * v.root.scale.y, p.z);
  v.root.rotation.y = p.ang;
  v.root.visible = !(cv.mode === 'fp' && !cv.preview);
}
function cPoseVillager(vl, v, t, dt) {
  const view = cVillViews.get(vl.id); if (!view) return;
  const w = t * 5.5 + vl.phase, near = Math.hypot(cozy.p.x - vl.x, cozy.p.z - vl.z) < 6;
  let lL = 0, lR = 0, aL = Math.sin(t * 1.5 + vl.phase) * 0.05, aR = -aL, bob = 0, hy = 0;
  if (vl.moving) { lL = Math.sin(w) * 0.7; lR = -lL; aL = lR * 0.7; aR = lL * 0.7; bob = Math.abs(Math.sin(w)) * 0.04; }
  else if (vl.talking) { aR = -0.7 + Math.sin(t * 3) * 0.5; aL = -0.2 + Math.sin(t * 2.3) * 0.3; hy = Math.sin(t * 2) * 0.15; }
  else if (near && !vl.inside) { aR = -2.6 + Math.sin(t * 6 + vl.phase) * 0.4; hy = Math.atan2(cozy.p.x - vl.x, cozy.p.z - vl.z) - vl.ang; hy = Math.max(-0.7, Math.min(0.7, Math.atan2(Math.sin(hy), Math.cos(hy)))); }
  poseHuman(view, { lL, lR, aL, aR, lean: 0, hy, tool: '', t, ph: vl.phase, mood: 85 }, dt);
  view.root.position.set(vl.x, vl.y + bob, vl.z); view.root.rotation.y = vl.ang;
  view.root.visible = !vl.inside;
}
/* ---------------------------------------------------------------- böcekler & olta */
const cBugMat = new THREE.MeshStandardMaterial({ color: 0xffffff, vertexColors: true, roughness: 0.6, side: THREE.DoubleSide });
function cBugMesh(B) {
  const g = new THREE.Group();
  const cols = { kelebek: '#ff9a3c', gece: '#d9cfae', ugur: '#e23b3b', cekirge: '#7bc24a', karinca: '#2a2018', atesboc: '#e8ff7a', circir: '#6b4524', gergedan: '#3a2a1c' };
  const c = cols[B.id] || '#888';
  if (B.id === 'kelebek' || B.id === 'gece') {
    const body = new THREE.Mesh(cMerge([gS(0.025, '#2a2018', 0, 0, 0, 1, 1, 3)]), cBugMat); g.add(body);
    for (const sx of [-1, 1]) {
      const wg = new THREE.Group(); const wing = new THREE.Mesh(cMerge([{ g: new THREE.CircleGeometry(0.1, 8), c, p: [sx * 0.08, 0, 0], r: [-Math.PI / 2, 0, 0], s: [1, 0.8, 1] }]), cBugMat);
      wg.add(wing); g.add(wg); g.userData['w' + (sx > 0 ? 'R' : 'L')] = wg;
    }
  } else {
    const sz = B.id === 'gergedan' ? 0.07 : B.id === 'karinca' ? 0.03 : 0.045;
    g.add(new THREE.Mesh(cMerge([gS(sz, c, 0, sz, 0, 1, 0.8, 1.5)]), B.glow ? new THREE.MeshStandardMaterial({ vertexColors: true, emissive: new THREE.Color('#e8ff7a'), emissiveIntensity: 2.2 }) : cBugMat));
  }
  if (B.glow) g.userData.glow = true;
  g.castShadow = false; cRoot.add(g);
  return g;
}
function cSyncBugs(t) {
  for (const [b, g] of cBugViews) if (!cozy.bugs.includes(b)) { cRoot.remove(g); cBugViews.delete(b); }
  for (const b of cozy.bugs) {
    const B = Z_BUGS.find((x) => x.id === b.type);
    let g = cBugViews.get(b); if (!g) { g = cBugMesh(B); cBugViews.set(b, g); }
    const gy = world.getHeight(b.x, b.z), hov = B.fly ? 0.9 + Math.sin(t * 2 + b.x) * 0.25 : B.hop ? Math.abs(Math.sin(t * 5 + b.z)) * 0.2 : 0.02;
    g.position.set(b.x, gy + hov, b.z); g.rotation.y = b.ang;
    if (g.userData.wL) { const f = Math.sin(t * 22 + b.x) * 0.9; g.userData.wL.rotation.z = f; g.userData.wR.rotation.z = -f; }
  }
}
const cBobber = new THREE.Mesh(cMerge([gS(0.07, '#f6f0e0', 0, 0, 0), gS(0.07, '#e04a3a', 0, 0.04, 0, 1, 0.55, 1)]), cBugMat);
cBobber.visible = false; cRoot.add(cBobber);
const cLineGeo = new THREE.BufferGeometry(); cLineGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(6), 3));
const cLine = new THREE.Line(cLineGeo, new THREE.LineBasicMaterial({ color: 0xf2f2f2, transparent: true, opacity: 0.85 })); cLine.visible = false; cLine.frustumCulled = false; cRoot.add(cLine);
const cRing = new THREE.Mesh(new THREE.RingGeometry(0.2, 0.26, 20), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.6, side: THREE.DoubleSide, depthWrite: false }));
cRing.rotation.x = -Math.PI / 2; cRing.visible = false; cRoot.add(cRing);
let cRingT = 9;
function cUpdateFishing(t, dt) {
  const f = cozy.p.fish;
  cBobber.visible = cLine.visible = !!f;
  if (!f) { cRing.visible = false; return; }
  const dip = f.st === 'bite' ? -0.06 - Math.abs(Math.sin(t * 22)) * 0.08 : f.st === 'cast' ? Math.max(0, 0.9 - f.t * 2) : Math.sin(t * 2.1) * 0.015;
  const bx = f.x, bz = f.z, by = SEA + 0.02 + dip;
  cBobber.position.set(bx, by, bz);
  const a = cozy.p, hx = a.x + Math.sin(a.ang) * 0.55, hz = a.z + Math.cos(a.ang) * 0.55, hy = a.y + 1.55;
  const arr = cLineGeo.attributes.position.array; arr[0] = hx; arr[1] = hy; arr[2] = hz; arr[3] = bx; arr[4] = by; arr[5] = bz; cLineGeo.attributes.position.needsUpdate = true;
  cRing.position.set(bx, SEA + 0.03, bz);
  if (f.st === 'bite') cRingT = Math.min(cRingT, 0.0);
  cRingT += dt; cRing.visible = f.st !== 'cast'; const k = (cRingT * 0.9) % 1; cRing.scale.setScalar(0.6 + k * 1.6); cRing.material.opacity = (1 - k) * (f.st === 'bite' ? 0.9 : 0.35);
}

/* ---------------------------------------------------------------- kamera */
function cSetFov(fov, near) {
  if (Math.abs(camera.fov - fov) > 0.05 || camera.near !== near) { camera.fov = fov; camera.near = near; camera.updateProjectionMatrix(); }
}
function cozyCamReset() {
  if (cv.shown) {
    cv.shown = false; cozy.lockAng = false; cSetFov(36, 0.5); camera.far = 3000; postMat.uniforms.uTilt.value = userTilt ? 1 : 0;
    if (cPlayerV) cPlayerV.root.visible = true;
    try { if (document.pointerLockElement) document.exitPointerLock(); } catch (_) { /* yoksay */ }
  }
}
const cGround = (x, z) => Math.max(world.getHeight(x, z), SEA);
function cozyCamera(dt) {
  cv.shown = true;
  const p = cozy.p, k = 1 - Math.exp(-dt * 10);
  cam.x = cam.tx = p.x; cam.z = cam.tz = p.z;
  const m = cv.preview ? 'tp' : cv.mode;
  let tfov = 50, tnear = 0.3;
  if (m === 'fp') {
    cozy.lockAng = true; cozy.p.ang = cv.fpAng;
    const eye = p.y + 1.0 + (p.moving ? Math.abs(Math.sin(performance.now() / 1000 * (6 + p.speed * 1.5))) * 0.03 : 0);
    camera.position.set(p.x, eye, p.z);
    const cp = Math.cos(cv.fpPitch);
    camera.lookAt(p.x + Math.sin(cv.fpAng) * cp, eye + Math.sin(cv.fpPitch), p.z + Math.cos(cv.fpAng) * cp);
    tfov = 72; tnear = 0.08; cam.dist = cam.ddist = 8; camY = p.y;
  } else {
    cozy.lockAng = false;
    let yaw, pitch, dist, ty;
    if (m === 'iso') {
      cv.disoDist = clamp(cv.disoDist, 9, 32);
      cv.dyaw = Math.PI / 4 + cv.iso * Math.PI / 2;
      cv.yaw = cv.yaw + (cv.dyaw - cv.yaw) * k;
      cv.isoDist += (cv.disoDist - cv.isoDist) * k;
      yaw = cv.yaw; pitch = 0.66; dist = cv.isoDist; ty = p.y + 0.5; tfov = 26; tnear = 1;
    } else if (cv.preview) {
      cv.yaw = cv.yaw + (cv.dyaw - cv.yaw) * k; yaw = cv.yaw; pitch = 0.16; dist = 3.4; ty = p.y + 0.85; tfov = 38;
    } else {
      cv.ddist = clamp(cv.ddist, 2.4, 14);
      cv.yaw += (cv.dyaw - cv.yaw) * k; cv.dist += (cv.ddist - cv.dist) * k;
      yaw = cv.yaw; pitch = cv.pitch; dist = cv.dist; ty = p.y + 0.95;
    }
    const cp = Math.cos(pitch);
    let d = dist;
    if (m === 'tp') {   // binaların içinden görünmesin: kamerayı yaklaştır
      for (let s = 1; s > 0.2; s -= 0.1) {
        const qx = p.x + Math.sin(yaw) * cp * dist * s, qz = p.z + Math.cos(yaw) * cp * dist * s;
        if (!cozy.inBuild(qx, qz, 0.15) && !(world.treeT[cozy.cellOf(qx, qz)] && s > 0.6 && false)) { d = dist * s; break; }
      }
    }
    let px = p.x + Math.sin(yaw) * cp * d, py = ty + Math.sin(pitch) * d, pz = p.z + Math.cos(yaw) * cp * d;
    const fl = cGround(px, pz) + (m === 'iso' ? 1.5 : 0.45);
    if (py < fl) py = fl;
    camera.position.set(px, py, pz);
    camera.lookAt(p.x, ty, p.z);
    cam.dist = cam.ddist = m === 'iso' ? cv.isoDist : d; camY = p.y;
  }
  if (Math.abs(camera.fov - tfov) > 0.05 || camera.near !== tnear) cSetFov(camera.fov + (tfov - camera.fov) * Math.min(1, dt * 7), tnear);
  sky.position.copy(camera.position);
  postMat.uniforms.uTilt.value = userTilt && m === 'iso' ? 1 : 0;
}
function cozySetMode(m) {
  if (m === cv.mode) return;
  const p = cozy.p;
  if (cv.mode === 'fp') { try { if (document.pointerLockElement) document.exitPointerLock(); } catch (_) { /* yoksay */ } cv.dyaw = cv.yaw = cv.fpAng + Math.PI; }
  if (m === 'fp') { cv.fpAng = p.ang; cv.fpPitch = 0; }
  else if (m === 'tp') cv.dyaw = cv.yaw = p.ang + Math.PI;
  if (m === 'iso') { cv.iso = Math.round((cv.yaw - Math.PI / 4) / (Math.PI / 2)); cv.dyaw = Math.PI / 4 + cv.iso * Math.PI / 2; }
  cv.mode = m;
  try { localStorage.setItem('minidunya.cozycam', m); } catch (_) { /* yoksay */ }
  toast('🎥 ' + CAM_NAMES[m]);
  czSyncUI();
}
function cozyCycleMode() { cozySetMode(cv.mode === 'tp' ? 'fp' : cv.mode === 'fp' ? 'iso' : 'tp'); }
function cozyRotate(dir) {
  if (cv.mode === 'iso') cv.iso += dir; else if (cv.mode === 'fp') cv.fpAng += dir * 0.5; else cv.dyaw += dir * 0.5;
}

/* ---------------------------------------------------------------- girdi */
const czPtrs = new Map();
function cozyDown(e) {
  czPtrs.set(e.pointerId, { x: e.clientX, y: e.clientY, t: performance.now(), moved: 0 });
  if (e.pointerType === 'mouse' && e.button === 0 && cv.mode === 'fp' && !czBlocked() && !document.pointerLockElement) {
    try { const r = canvas.requestPointerLock(); if (r && r.catch) r.catch(() => {}); } catch (_) { /* yoksay */ }
  }
}
function cozyMove(e) {
  if (czBlocked()) return;
  const locked = document.pointerLockElement === canvas;
  if (locked && cv.mode === 'fp') {   // fare kilitliyken basmadan da etrafa bakılır
    cv.fpAng -= e.movementX * 0.0025; cv.fpPitch = clamp(cv.fpPitch - e.movementY * 0.002, -1.25, 1.25);
    const q = czPtrs.get(e.pointerId); if (q) q.moved += Math.abs(e.movementX) + Math.abs(e.movementY);
    return;
  }
  const p = czPtrs.get(e.pointerId);
  if (!p) return;
  if (czPtrs.size >= 2 && !locked) {
    const a = [...czPtrs.values()], d0 = Math.hypot(a[0].x - a[1].x, a[0].y - a[1].y);
    p.x = e.clientX; p.y = e.clientY;
    const b = [...czPtrs.values()], d1 = Math.hypot(b[0].x - b[1].x, b[0].y - b[1].y);
    if (d0 > 0) { const f = d0 / Math.max(1, d1); if (cv.mode === 'iso') cv.disoDist *= f; else if (cv.mode === 'tp') cv.ddist *= f; }
    p.moved = 99; return;
  }
  const dx = locked ? e.movementX : e.clientX - p.x, dy = locked ? e.movementY : e.clientY - p.y;
  p.x = e.clientX; p.y = e.clientY; p.moved += Math.abs(dx) + Math.abs(dy);
  if (p.moved < 6 && !locked) return;
  if (cv.mode === 'fp') { cv.fpAng -= dx * 0.0045; cv.fpPitch = clamp(cv.fpPitch - dy * 0.0035, -1.25, 1.25); }
  else if (cv.mode === 'tp' || cv.preview) { cv.dyaw -= dx * 0.006; if (!cv.preview) cv.pitch = clamp(cv.pitch + dy * 0.004, 0.06, 1.25); }
}
function cozyUp(e) {
  const p = czPtrs.get(e.pointerId); czPtrs.delete(e.pointerId);
  if (!p || czBlocked() || cv.preview) return;
  const locked = document.pointerLockElement === canvas;
  if (p.moved < 8 && performance.now() - p.t < 450 && (e.type === 'pointerup')) {
    if (cv.mode === 'iso') cozyTapIso(e.clientX, e.clientY);
    else if (e.pointerType === 'mouse' && e.button === 0 && (locked || cv.mode === 'tp' || cv.mode === 'fp')) czPress();
  }
}
function cozyWheel(e) {
  if (czBlocked()) return;
  const f = Math.exp(e.deltaY * 0.0011);
  if (cv.mode === 'iso') cv.disoDist *= f; else if (cv.mode === 'tp') cv.ddist *= f;
}
function cozyKey(e) {
  if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return false;
  const k = e.key.toLowerCase();
  if (k === 'escape') { if (czModalOpen) { czCloseAll(); return true; } return false; }
  if (czModalOpen) {
    if ((k === 'b' || k === 'tab') && czKind === 'bag') { czCloseAll(); return true; }
    if (k === 'v' && czKind === 'cat') { czCloseAll(); return true; }
    return false;
  }
  if (czBlocked()) return false;
  if (k === 'p') { togglePause(); return true; }
  if (k === ' ' || k === 'e' || k === 'enter' || k === 'f') { if (!e.repeat) czPress(); return true; }
  if (k >= '1' && k <= '6') { cozy.selectTool(+k - 1); czSyncUI(); return true; }
  if (k === '0') { cozy.p.held = null; czSyncUI(); return true; }
  if (k === 'c') { cozyCycleMode(); return true; }
  if (k === 'q') { cozyRotate(1); return true; }
  if (k === 'r') { cozyRotate(-1); return true; }
  if (k === 'b' || k === 'tab') { czOpen('bag'); return true; }
  if (k === 'v') { czOpen('cat'); return true; }
  return false;
}
function cozyInput() {
  let f = 0, r = 0;
  const blk = czBlocked();
  if (!blk) {
    if (keys.w || keys.arrowup) f += 1; if (keys.s || keys.arrowdown) f -= 1;
    if (keys.d || keys.arrowright) r += 1; if (keys.a || keys.arrowleft) r -= 1;
  }
  const jm = Math.hypot(cv.joy.x, cv.joy.y);
  if (jm > 0.12 && !blk) { f += -cv.joy.y; r += cv.joy.x; }
  const mag = Math.hypot(f, r);
  if (mag > 1) { f /= mag; r /= mag; }
  let wx, wz;
  if (cv.mode === 'fp' && !cv.preview) {
    const a = cv.fpAng;
    wx = f * Math.sin(a) - r * Math.cos(a); wz = f * Math.cos(a) + r * Math.sin(a);
  } else {
    const sn = Math.sin(cv.yaw), c = Math.cos(cv.yaw);
    wx = r * c - f * sn; wz = -r * sn - f * c;
  }
  cozy.setMove(wx, wz, !!keys.shift || jm > 0.92);
}
// izometrik: yere/karaktere dokun → yürü veya yaklaşıp etkileş
function cApproach(x, z, then) {
  const p = cozy.p, d = Math.hypot(x - p.x, z - p.z) || 1;
  const sx = x - (x - p.x) / d * 0.95, sz = z - (z - p.z) / d * 0.95;
  const ok = cozy.walkTo(sx, sz, true);
  if (ok) cv.pend = { x, z, then }; else { cv.pend = null; toast('Oraya gidilemiyor'); }
}
function cTapVillager(v) {
  if (czBlocked()) return;
  if (Math.hypot(v.x - cozy.p.x, v.z - cozy.p.z) < 2) { cozy.p.ang = Math.atan2(v.x - cozy.p.x, v.z - cozy.p.z); czPress(); return; }
  cApproach(v.x, v.z, 'talk');
}
function cozyTapIso(sx, sy) {
  // önce köylüler (ekran mesafesi)
  let bv = null, bd = 46;
  for (const v of cozy.vill) {
    if (v.inside) continue;
    cTmpV.set(v.x, v.y + 0.7, v.z).project(camera);
    const px = (cTmpV.x * 0.5 + 0.5) * window.innerWidth, py = (-cTmpV.y * 0.5 + 0.5) * window.innerHeight, d = Math.hypot(px - sx, py - sy);
    if (cTmpV.z < 1 && d < bd) { bd = d; bv = v; }
  }
  if (bv) { cTapVillager(bv); return; }
  if (!pick(sx, sy)) return;
  const hx = hit.x, hz = hit.z;
  for (const b of cozy.builds) {
    if (b.t === 'vhome') continue;
    if (Math.hypot(hx - b.x, hz - b.z) < Math.max(b.hx, b.hz) + 1.2 || Math.hypot(hx - b.door.x, hz - b.door.z) < 1.4) {
      cv.pend = { x: b.door.x, z: b.door.z, then: 'door' };
      if (cozy.walkTo(b.door.x, b.door.z + 0.1, true)) return;
    }
  }
  const o = cozy._nearObj(hx, hz, 0.9, () => true), tr = cozy._nearTree(hx, hz, 1.1);
  if (tr && (!o || tr.d < o.d)) { cApproach(tr.x, tr.z, 'act'); return; }
  if (o && o.o.t !== 'hole') { cApproach(o.x, o.z, 'act'); return; }
  cv.pend = null; cozy.walkTo(hx, hz, false);
  cursor.visible = false;
}

/* ---------------------------------------------------------------- olaylar & efektler */
const cToastQ = []; let cToastT = 0;
const cFloatRoot = document.createElement('div'); cFloatRoot.id = 'cfloat'; document.body.appendChild(cFloatRoot);
function cFloat(txt, x, z, y) {
  cTmpV.set(x, (y === undefined ? world.getHeight(x, z) : y) + 1.2, z).project(camera);
  if (cTmpV.z >= 1) return;
  const d = document.createElement('div'); d.className = 'cfl'; d.textContent = txt;
  d.style.left = (cTmpV.x * 0.5 + 0.5) * window.innerWidth + 'px'; d.style.top = (-cTmpV.y * 0.5 + 0.5) * window.innerHeight + 'px';
  cFloatRoot.appendChild(d); setTimeout(() => d.remove(), 1500);
}
function cozyEvents() {
  const E = cozy.events;
  for (let i = 0; i < E.length; i++) {
    const e = E[i], gy = e.x !== undefined ? world.getHeight(e.x, e.z) : 0;
    switch (e.t) {
      case 'say': cToastQ.push(e.msg); break;
      case 'puff': world.fx('puff', e.x, gy + 0.3, e.z, 1); break;
      case 'chop': world.fx('chips', e.x, gy + 1.0, e.z, 1); shakeAmt = Math.max(shakeAmt, 0.02); break;
      case 'dig': world.fx('dust', e.x, gy + 0.1, e.z, 1); break;
      case 'rock': world.fx('spark', e.x, gy + 0.5, e.z, 1); break;
      case 'splash': world.fx('splash', e.x, SEA + 0.05, e.z, 1); break;
      case 'water': world.fx('splash', e.x, gy + 0.3, e.z, 1); break;
      case 'shake': world.fx('dust', e.x, gy + 1.8, e.z, 1); break;
      case 'grew': world.fx('heart', e.x, gy + 1.2, e.z, 1); cToastQ.push('🌳 Bir fidan ağaç oldu!'); break;
      case 'eat': world.fx('heart', cozy.p.x, cozy.p.y + 1.2, cozy.p.z, 1); break;
      case 'bite': cToastQ.unshift('❗ Balık yakaladı! Çek!'); cToastT = 0; auSfx('bite'); break;
      case 'pickup': { auSfx('coin', 0.6); const it = Z_ITEMS[e.id]; if (it) cFloat('+' + (e.n || 1) + ' ' + it.i, e.x === undefined ? cozy.p.x : e.x, e.z === undefined ? cozy.p.z : e.z); break; }
      case 'catch': { auSfx('catch'); const it = Z_ITEMS[e.id]; if (it) cFloat(it.i + ' ' + it.n + '!', e.x, e.z, cozy.p.y + 0.6); world.fx('heart', e.x, cozy.p.y + 1.5, e.z, 1); break; }
      case 'newday': auSfx('bell', 0.7); cToastQ.push('☀️ Yeni bir gün başladı — Gün ' + cozy.day); czRefresh(); break;
      case 'arrive': czArrive(); break;
    }
  }
  E.length = 0;
}
let cFireT = 0;
function cozyAmbient(dt, t) {
  cFireT -= dt;
  if (cFireT > 0) return;
  cFireT = 0.14;
  let n = 0;
  for (const [c, o] of cozy.obj) {
    if (o.t !== 'furn') continue;
    if (o.id !== 'campfire' && o.id !== 'fountain') continue;
    const q = cozy.cellPos(c);
    if (Math.hypot(q.x - cozy.p.x, q.z - cozy.p.z) > 24 || n++ > 6) continue;
    if (o.id === 'campfire') world.fx('fire', q.x, world.getHeight(q.x, q.z), q.z, 0.1);
    else if (Math.random() < 0.35) world.fx('splash', q.x, world.getHeight(q.x, q.z) + 1.0, q.z, 1);
  }
}

/* ---------------------------------------------------------------- etiketler */
function cUpdateLabels() {
  const W = window.innerWidth, H = window.innerHeight;
  for (const v of cozy.vill) {
    const l = cLabels.get(v.id); if (!l) continue;
    const d = Math.hypot(v.x - cozy.p.x, v.z - cozy.p.z);
    if (v.inside || d > 28 || (cv.mode === 'fp' && d > 14)) { l.style.display = 'none'; continue; }
    cTmpV.set(v.x, v.y + 1.55, v.z).project(camera);
    if (cTmpV.z >= 1 || Math.abs(cTmpV.x) > 1.1 || Math.abs(cTmpV.y) > 1.1) { l.style.display = 'none'; continue; }
    l.style.display = '';
    const hearts = Math.min(4, Math.floor(v.friend / 25));
    const html = (v.quest && !v.quest.done ? '❗ ' : '') + esc(v.name) + (hearts ? ' ' + '💗'.repeat(hearts) : '');
    if (l.dataset.h !== html) { l.innerHTML = html; l.dataset.h = html; }
    l.style.transform = 'translate(' + ((cTmpV.x * 0.5 + 0.5) * W - l.offsetWidth / 2).toFixed(0) + 'px,' + ((-cTmpV.y * 0.5 + 0.5) * H - 22).toFixed(0) + 'px)';
  }
}

/* ---------------------------------------------------------------- ana çerçeve */
let cHudT = 0, cPrompt = '';
function cozyFrame(dt, t) {
  // zaman
  const blk = czBlocked();
  cozy.freeze = blk;
  if (!paused && !blk) {
    tod += (dt / C_DAYLEN) * timeSpeed; world.simTime += dt;
    if (tod >= 1) { tod -= 1; cozy.newDay(); dayCount = cozy.day; }
  }
  world.raining = cozy.rainNow;
  if (!paused) cozyInput(); else cozy.setMove(0, 0, false);
  if (!paused) cozy.update(dt, tod * 24);
  if (cozy.consumeSleep()) {
    tod = 0.27; cozy.newDay(); dayCount = cozy.day; cozy.update(0.01, tod * 24); cozy.say('Günaydın! İyi uyudun mu? 🌞'); czCloseAll();
  }
  cozyEvents();
  cToastT -= dt;
  if (cToastQ.length && cToastT <= 0) { toast(cToastQ.shift()); cToastT = 1.35; }
  cSyncVillagers(); cUpdateBuildVis();
  if (!cPlayerV) cRebuildPlayer();
  cozyCamera(dt);
  cSyncObjs(t); cSyncBugs(t); cUpdateFishing(t, dt);
  cPosePlayer(t, dt);
  for (const v of cozy.vill) cPoseVillager(v, null, t, dt);
  cUpdateLabels();
  cozyAmbient(dt, t);
  winMat.emissiveIntensity = nightK > 0.35 ? 1.5 : 0;
  // hedef halkası
  const tg = cozy.target();
  const showTg = tg.kind !== 'nothing' && tg.kind !== 'wave' && !blk && !cv.preview;
  if (showTg) {
    let x, z;
    if (tg.near) { x = tg.near.x; z = tg.near.z; } else if (tg.tr) { x = tg.tr.x; z = tg.tr.z; } else if (tg.v) { x = tg.v.x; z = tg.v.z; } else if (tg.b) { x = tg.b.door.x; z = tg.b.door.z; }
    else if (tg.c !== undefined && tg.c >= 0) { const q = cozy.cellPos(tg.c); x = q.x; z = q.z; } else if (tg.w) { x = tg.w.x; z = tg.w.z; }
    if (x !== undefined) { cursor.visible = true; placeCursor(x, z, tg.kind === 'place' || tg.kind === 'dig' ? 0.5 : 0.7); } else cursor.visible = false;
  } else cursor.visible = false;
  cHudT += dt;
  const txt = showTg ? tg.text : '';
  if (txt !== cPrompt) { cPrompt = txt; czPromptSet(txt, tg.kind); }
  if (cHudT > 0.3) { cHudT = 0; czHud(); }
}

function cResetViews() {
  if (cPlayerV) { cRoot.remove(cPlayerV.root); cPlayerV = null; }
  for (const v of cVillViews.values()) cRoot.remove(v.root);
  cVillViews.clear();
  for (const l of cLabels.values()) l.remove();
  cLabels.clear();
  for (const g of cBugViews.values()) cRoot.remove(g);
  cBugViews.clear();
  cv.pend = null; cv.preview = false; czPtrs.clear(); cv.joy.x = cv.joy.y = 0;
  for (const k in cKinds) { cKinds[k].count = 0; cKinds[k].visible = false; }
  cFloatRoot.innerHTML = '';
}
