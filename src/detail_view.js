/* ===================================================================
   Detaylı Mod - 3B görünüm: büyük insan modelleri, binalar, yerleştirme.
   Build sırasında main.js içine (//@@DETAIL@@ işaretine) eklenir.
   =================================================================== */
let gameMode = 'sim';                       // 'sim' | 'detail' | 'cozy'
const colony = new Colony(world);
const dRoot = new THREE.Group(); dRoot.visible = false; scene.add(dRoot);
let dSel = null, dSelB = null, dFollow = false;
const dViews = new Map(), dBViews = new Map(), dLabels = new Map();

const D_SKINS = ['#f6d3b3', '#e8b48a', '#c98f65', '#8f5c3b', '#f0c8a0'];
const D_HAIRS = ['#2b1d12', '#5a3a1e', '#a56b2f', '#d9b25a', '#8a2f1b', '#2a2a2e'];
const D_SHIRTS = ['#e8453c', '#3b82f6', '#f2b01e', '#a463f2', '#27c4b0', '#f15bb5', '#8ac926', '#ff8c42'];
const D_PANTS = ['#3f4a63', '#5b4a35', '#2f3b2f', '#4a3f5e'];

/* ---------------------------------------------------------------- malzeme & geometri önbelleği */
const dMats = new Map(), dGeos = new Map();
const D_HD_DEFAULT = ['stucco', { sc: 2.4, amt: 0.4, bump: 0.7 }];   // dmat: açıkça belirtilmeyen her şeye hafif HD yüzey detayı
function dmat(hex, o) {
  const k = hex + (o ? JSON.stringify(o) : '');
  let m = dMats.get(k);
  if (!m) {
    const { hd, ...rest } = o || {};
    m = new THREE.MeshStandardMaterial(Object.assign({ color: hex, roughness: 0.82, metalness: 0.02, flatShading: !isReal }, rest));
    const h = hd === undefined ? D_HD_DEFAULT : hd;   // hd: null → HD yaması yok
    if (h) hdPatch(m, h[0], Object.assign({ id: 'd' }, h[1]));
    dMats.set(k, m);
  }
  return m;
}
const dgeo = (k, f) => { let g = dGeos.get(k); if (!g) { g = f(); dGeos.set(k, g); } return g; };
function dmesh(geo, mat, parent, x, y, z, cast = true) {
  const m = new THREE.Mesh(geo, mat); m.position.set(x || 0, y || 0, z || 0);
  m.castShadow = cast; m.receiveShadow = true; if (parent) parent.add(m); return m;
}
const dbox = (w, h, d, col, p, x, y, z, o) => dmesh(dgeo('b' + w + '_' + h + '_' + d, () => new THREE.BoxGeometry(w, h, d)), dmat(col, o), p, x, y, z);
const dcyl = (r1, r2, h, col, p, x, y, z, seg = 10, o) => dmesh(dgeo('c' + r1 + '_' + r2 + '_' + h + '_' + seg, () => new THREE.CylinderGeometry(r1, r2, h, seg)), dmat(col, o), p, x, y, z);
const dsph = (r, col, p, x, y, z, o) => dmesh(dgeo('s' + r, () => new THREE.SphereGeometry(r, 12, 9)), dmat(col, o), p, x, y, z);
const dcap = (r, l, col, p, x, y, z) => dmesh(dgeo('p' + r + '_' + l, () => new THREE.CapsuleGeometry(r, l, 4, 8)), dmat(col), p, x, y, z);
const dcone = (r, h, col, p, x, y, z, seg = 8, o) => dmesh(dgeo('n' + r + '_' + h + '_' + seg, () => new THREE.ConeGeometry(r, h, seg)), dmat(col, o), p, x, y, z);
// üçgen kesitli çatı: genişlik w, yükseklik h, uzunluk l (z ekseni boyunca)
function dprism(w, h, l, col, p, x, y, z) {
  const g = dgeo('r' + w + '_' + h + '_' + l, () => {
    const s = new THREE.Shape(); s.moveTo(-w / 2, 0); s.lineTo(w / 2, 0); s.lineTo(0, h); s.closePath();
    const e = new THREE.ExtrudeGeometry(s, { depth: l, bevelEnabled: false }); e.translate(0, 0, -l / 2); return e;
  });
  return dmesh(g, dmat(col), p, x, y, z);
}
const winMat = new THREE.MeshStandardMaterial({ color: '#9ec8e8', roughness: 0.3, emissive: new THREE.Color('#ffcf70'), emissiveIntensity: 0 });
const flameMat = new THREE.MeshBasicMaterial({ color: '#ff9a2e' });
const flameMat2 = new THREE.MeshBasicMaterial({ color: '#ffe27a' });

/* insan modeli: src/human.js (build sırasında bu dosyadan sonra eklenir) */
function syncPeopleViews() {
  for (const p of colony.people) if (!dViews.has(p.id)) { const v = makePersonView(p); dRoot.add(v.root); dViews.set(p.id, v); }
  for (const [id, v] of dViews) if (!colony.getPerson(id)) { dRoot.remove(v.root); dViews.delete(id); const l = dLabels.get(id); if (l) { l.remove(); dLabels.delete(id); } if (dSel && dSel.id === id) dSelect(null); }
}
const D_ACTICON = { sleep: '💤', eat: '🍽️', chop: '🪓', build: '🔨', farm: '🌾', herd: '🐑', fish: '🎣', craft: '🏭', teach: '📚', study: '📖', talk: '💬', fun: '🎈', play: '🎈', wash: '🧼', forage: '🫐', wander: '', '': '' };

/* ---------------------------------------------------------------- etiketler (isim + ruh hali) */
const dLabelRoot = document.createElement('div'); dLabelRoot.id = 'dlabels'; document.body.appendChild(dLabelRoot);
const _pv = new THREE.Vector3();
const dFace = (m, sick) => (sick ? '🤒' : m >= 80 ? '😄' : m >= 60 ? '🙂' : m >= 40 ? '😐' : m >= 20 ? '🙁' : '😭');
function updateLabels() {
  const W = window.innerWidth, H = window.innerHeight, far = cam.dist > 120;
  for (const p of colony.people) {
    let l = dLabels.get(p.id);
    if (!l) { l = document.createElement('div'); l.className = 'dlabel'; dLabelRoot.appendChild(l); dLabels.set(p.id, l); l.onclick = () => dSelect(p); }
    const v = dViews.get(p.id);
    if (!v || p.hidden || far) { l.style.display = 'none'; continue; }
    _pv.set(p.x, p.y + 1.45 * (p.age < D_ADULT ? 0.65 : 1), p.z).project(camera);
    if (_pv.z > 1 || Math.abs(_pv.x) > 1.1 || Math.abs(_pv.y) > 1.1) { l.style.display = 'none'; continue; }
    const ic = p.act ? D_ACTICON[p.act.phase === 'do' ? p.act.type : ''] : '';
    const html = '<span>' + dFace(p.mood, p.sick) + '</span>' + p.name + (ic ? ' <i>' + ic + '</i>' : '');
    if (l._h !== html) { l.innerHTML = html; l._h = html; }
    l.classList.toggle('sel', dSel === p);
    l.style.display = 'block';
    l.style.transform = 'translate(' + ((_pv.x * 0.5 + 0.5) * W).toFixed(1) + 'px,' + ((-_pv.y * 0.5 + 0.5) * H).toFixed(1) + 'px) translate(-50%,-100%)';
  }
}
const dRing = new THREE.Mesh(new THREE.RingGeometry(0.42, 0.55, 28).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x7fe0b0, transparent: true, opacity: 0.9, depthWrite: false, side: THREE.DoubleSide }));
dRing.visible = false; dRing.renderOrder = 5; dRoot.add(dRing);

/* ---------------------------------------------------------------- bina modelleri */
function makeBuildingView(b) {
  const g = new THREE.Group(), main = new THREE.Group(); g.add(main);
  const U2 = { upd: null };
  const T = b.type;
  if (T === 'house') {
    dbox(1.85, 0.18, 1.85, '#8d8a82', main, 0, 0.09, 0);
    dbox(1.7, 1.0, 1.7, has('ev2') ? '#d9b48f' : '#ecdcb8', main, 0, 0.68, 0);
    dprism(2.05, 0.95, 2.0, '#b5533c', main, 0, 1.18, 0);
    dbox(0.28, 0.55, 0.28, '#7d7a75', main, 0.55, 1.75, -0.35);
    dbox(0.36, 0.62, 0.05, '#6a4426', main, 0, 0.5, 0.86);
    const w1 = dmesh(dgeo('win', () => new THREE.BoxGeometry(0.3, 0.3, 0.05)), winMat, main, -0.55, 0.78, 0.86), w2 = w1.clone(); w2.position.x = 0.55; main.add(w2);
    dbox(0.4, 0.06, 0.2, '#8d8a82', main, 0, 0.2, 1.0);
  } else if (T === 'fire') {
    for (let i = 0; i < 7; i++) { const a = i / 7 * 6.283; dmesh(dgeo('st', () => new THREE.DodecahedronGeometry(0.1, 0)), dmat('#8a8a86'), main, Math.cos(a) * 0.3, 0.07, Math.sin(a) * 0.3); }
    for (let i = 0; i < 3; i++) { const l = dcyl(0.04, 0.04, 0.5, '#5a3b22', main, 0, 0.1, 0, 6); l.rotation.z = Math.PI / 2; l.rotation.y = i * 1.05; }
    const f1 = dmesh(dgeo('fl1', () => new THREE.ConeGeometry(0.15, 0.5, 6)), flameMat, main, 0, 0.35, 0, false);
    const f2 = dmesh(dgeo('fl2', () => new THREE.ConeGeometry(0.08, 0.34, 6)), flameMat2, main, 0, 0.3, 0, false);
    U2.upd = (t) => { const s = 1 + Math.sin(t * 17 + b.id) * 0.18 + Math.sin(t * 29) * 0.1; f1.scale.set(1 / s, s, 1 / s); f2.scale.set(1, 1.1 - (s - 1), 1); };
  } else if (T === 'well') {
    dcyl(0.4, 0.42, 0.5, '#8d8a82', main, 0, 0.25, 0, 12);
    dcyl(0.3, 0.3, 0.02, '#4e86b8', main, 0, 0.5, 0, 12, { roughness: 0.2 });
    dbox(0.07, 0.9, 0.07, '#6b4a2e', main, -0.4, 0.7, 0); dbox(0.07, 0.9, 0.07, '#6b4a2e', main, 0.4, 0.7, 0);
    dcone(0.62, 0.35, '#a0522d', main, 0, 1.3, 0, 4).rotation.y = Math.PI / 4;
    dcyl(0.015, 0.015, 0.8, '#6b4a2e', main, 0, 1.0, 0, 6).rotation.z = Math.PI / 2;
    dcyl(0.07, 0.06, 0.12, '#8b6a3d', main, 0.1, 0.78, 0, 8);
  } else if (T === 'field') {
    dbox(2.9, 0.07, 2.9, '#6b4a2e', main, 0, 0.035, 0);
    const rows = [], cropMat = new THREE.MeshStandardMaterial({ color: '#6aa84f', roughness: 0.8, flatShading: !isReal });
    for (let r = 0; r < 4; r++) {
      dbox(2.6, 0.04, 0.12, '#4e3520', main, 0, 0.08, -1.05 + r * 0.7, undefined);
      for (let k = 0; k < 7; k++) {
        const c = new THREE.Group(); c.position.set(-1.2 + k * 0.4, 0.07, -1.05 + r * 0.7); main.add(c);
        const st = dmesh(dgeo('crop', () => new THREE.ConeGeometry(0.07, 0.45, 5)), cropMat, c, 0, 0.22, 0);
        const ear = dmesh(dgeo('ear', () => new THREE.CapsuleGeometry(0.035, 0.1, 3, 5)), new THREE.MeshStandardMaterial({ color: '#d8b24a', roughness: 0.7 }), c, 0, 0.46, 0);
        rows.push([c, ear]);
      }
    }
    U2.upd = () => {
      const gr = b.stage === 1 ? 1 - b.timer / Math.max(1, b.total || 40) : b.stage === 2 ? 1 : 0;
      for (const [c, ear] of rows) { c.visible = b.stage > 0; c.scale.setScalar(0.25 + 0.75 * Math.min(1, gr * 1.1)); ear.visible = gr > 0.8; }
      cropMat.color.set(b.stage === 2 ? '#c9b24a' : '#6aa84f');
    };
  } else if (T === 'pen') {
    for (let i = -4; i <= 4; i++) {
      for (const [x, z] of [[i * 0.36, -1.4], [i * 0.36, 1.4], [-1.4, i * 0.36], [1.4, i * 0.36]]) dbox(0.07, 0.5, 0.07, '#7a5230', main, x, 0.25, z);
    }
    for (const y of [0.18, 0.38]) { dbox(2.9, 0.05, 0.05, '#8b6a3d', main, 0, y, -1.4); dbox(2.9, 0.05, 0.05, '#8b6a3d', main, 0, y, 1.4); dbox(0.05, 0.05, 2.9, '#8b6a3d', main, -1.4, y, 0); dbox(0.05, 0.05, 2.9, '#8b6a3d', main, 1.4, y, 0); }
    dbox(2.9, 0.04, 2.9, '#7a8f4a', main, 0, 0.02, 0);
    dbox(0.9, 0.7, 0.7, '#a0763f', main, -0.85, 0.35, -0.95); dprism(1.05, 0.4, 0.85, '#7a3b2a', main, -0.85, 0.7, -0.95);
    dcyl(0.28, 0.28, 0.3, '#d9b94a', main, 0.9, 0.15, -0.95, 9);
    const animals = new THREE.Group(); main.add(animals);
    let built = '';
    const mk = (kind) => {
      const a = new THREE.Group();
      if (kind === 'chicken') { dsph(0.12, '#f4f0e6', a, 0, 0.17, 0); dsph(0.07, '#f4f0e6', a, 0, 0.3, 0.1); dbox(0.03, 0.05, 0.05, '#e03c2c', a, 0, 0.37, 0.1); dcone(0.025, 0.06, '#f0a020', a, 0, 0.29, 0.18, 4).rotation.x = Math.PI / 2; a.userData.s = 0.8; }
      else if (kind === 'sheep') { dsph(0.2, '#f1ede4', a, 0, 0.3, 0); dsph(0.09, '#3a3430', a, 0, 0.34, 0.22); for (const [x, z] of [[-0.09, -0.1], [0.09, -0.1], [-0.09, 0.1], [0.09, 0.1]]) dbox(0.04, 0.16, 0.04, '#3a3430', a, x, 0.08, z); a.userData.s = 0.8; }
      else { dbox(0.3, 0.26, 0.55, '#f2eee6', a, 0, 0.4, 0); dbox(0.12, 0.1, 0.1, '#5a3b26', a, 0.08, 0.45, 0.08); dbox(0.2, 0.2, 0.22, '#e8e2d6', a, 0, 0.46, 0.34); dbox(0.08, 0.08, 0.1, '#e9b7a8', a, 0, 0.42, 0.47); for (const [x, z] of [[-0.11, -0.2], [0.11, -0.2], [-0.11, 0.2], [0.11, 0.2]]) dbox(0.06, 0.28, 0.06, '#e8e2d6', a, x, 0.14, z); a.userData.s = 0.9; }
      a.userData.tx = (Math.random() - 0.5) * 2; a.userData.tz = (Math.random() - 0.5) * 2; a.userData.wait = Math.random() * 3;
      a.position.set(a.userData.tx, 0.05, a.userData.tz);
      return a;
    };
    U2.upd = (t, dt) => {
      const key = b.kind + b.animals;
      if (key !== built) { built = key; while (animals.children.length) animals.remove(animals.children[0]); for (let i = 0; i < b.animals; i++) animals.add(mk(b.kind)); }
      for (const a of animals.children) {
        const u = a.userData; u.wait -= dt;
        const dx = u.tx - a.position.x, dz = u.tz - a.position.z, d = Math.hypot(dx, dz);
        if (d < 0.08 || u.wait > 0) { if (u.wait <= 0 && d < 0.08) { u.wait = 1 + Math.random() * 3; u.tx = (Math.random() - 0.5) * 2.1; u.tz = (Math.random() - 0.5) * 2.1; } a.position.y = 0.05; }
        else { const sp = Math.min(d, 0.5 * dt); a.position.x += dx / d * sp; a.position.z += dz / d * sp; a.rotation.y = Math.atan2(dx, dz); a.position.y = 0.05 + Math.abs(Math.sin(t * 9 + a.id)) * 0.03; }
      }
    };
  } else if (T === 'dock') {
    const dir = [[0, 1], [1, 0], [0, -1], [-1, 0]][b.rot], ang = Math.atan2(dir[0], dir[1]);
    const pier = new THREE.Group(); main.add(pier); pier.rotation.y = ang;
    const py = SEA + 0.28 - b.y;
    dbox(1.0, 0.09, 4.8, '#9a7646', pier, 0, py, 3.0);
    for (let i = 0; i < 5; i++) { dbox(0.1, 0.9, 0.1, '#5e4529', pier, -0.45, py - 0.4, 1.0 + i * 1.0); dbox(0.1, 0.9, 0.1, '#5e4529', pier, 0.45, py - 0.4, 1.0 + i * 1.0); }
    dbox(0.12, 0.45, 0.12, '#5e4529', pier, 0.5, py + 0.25, 5.2); dbox(0.12, 0.45, 0.12, '#5e4529', pier, -0.5, py + 0.25, 5.2);
    // kulübe
    const hut = new THREE.Group(); main.add(hut);
    dbox(1.1, 0.8, 1.0, '#a07a4a', hut, 0, 0.45, -0.1); dprism(1.4, 0.55, 1.2, '#6b4a2e', hut, 0, 0.85, -0.1); dbox(0.28, 0.5, 0.05, '#4a3220', hut, 0, 0.35, 0.41);
    dcyl(0.18, 0.15, 0.2, '#b8935a', hut, 0.75, 0.1, 0.4, 8);
    const net = dbox(0.9, 0.55, 0.04, '#cfc7a8', hut, -0.75, 0.55, 0.0, { transparent: true, opacity: 0.55 });
    const boat = new THREE.Group(); boat.position.set(0.9, SEA + 0.02 - b.y, 3.8); pier.add(boat);
    const hull = dmesh(dgeo('hull', () => new THREE.CapsuleGeometry(0.22, 0.9, 4, 8)), dmat('#a85a32'), boat, 0, 0.12, 0); hull.rotation.x = Math.PI / 2; hull.scale.set(1, 1, 0.55);
    dbox(0.04, 0.8, 0.04, '#5e4529', boat, 0, 0.55, 0.05); dbox(0.02, 0.6, 0.5, '#f1ece0', boat, 0, 0.6, 0.3);
    U2.upd = (t) => { boat.visible = has('balik3'); boat.position.y = SEA + 0.02 - b.y + Math.sin(t * 1.4 + b.id) * 0.03; boat.rotation.z = Math.sin(t * 1.1) * 0.05; };
  } else if (T === 'school') {
    dbox(2.8, 0.16, 2.0, '#8d8a82', main, 0, 0.08, 0.1);
    dbox(2.6, 1.15, 1.8, '#f2dea0', main, 0, 0.73, 0.1);
    dprism(2.1, 0.9, 2.8, '#a8432f', main, 0, 1.3, 0.1).rotation.y = Math.PI / 2;
    dbox(0.7, 1.9, 0.7, '#e4d090', main, 1.0, 1.2, -0.75); dcone(0.62, 0.55, '#a8432f', main, 1.0, 2.4, -0.75, 4).rotation.y = Math.PI / 4;
    dsph(0.1, '#d6a93a', main, 1.0, 2.0, -0.4);
    dbox(0.6, 0.75, 0.06, '#5e3b22', main, 0, 0.55, 1.02);
    for (const x of [-1.0, -0.55, 0.55, 1.0]) dmesh(dgeo('win', () => new THREE.BoxGeometry(0.3, 0.3, 0.05)), winMat, main, x, 0.85, 1.01);
    dcyl(0.02, 0.02, 1.7, '#cfcfcf', main, -1.35, 0.95, 1.2, 6);
    const flag = dbox(0.4, 0.25, 0.02, '#e8453c', main, -1.15, 1.65, 1.2);
    U2.upd = (t) => { flag.rotation.y = Math.sin(t * 3) * 0.3; };
    dbox(0.9, 0.12, 0.3, '#8d8a82', main, 0, 0.2, 1.2);
  } else if (T === 'workshop') {
    dbox(1.7, 0.9, 1.4, '#9a7347', main, 0, 0.45, 0);
    dprism(1.95, 0.7, 1.7, '#5a4632', main, 0, 0.9, 0);
    dbox(0.55, 0.65, 0.05, '#4a3220', main, 0, 0.35, 0.71);
    dbox(0.25, 0.9, 0.25, '#7d7a75', main, 0.55, 1.3, -0.35);
    dbox(0.3, 0.25, 0.2, '#555a62', main, -1.1, 0.13, 0.5); dbox(0.18, 0.08, 0.4, '#555a62', main, -1.1, 0.3, 0.5);
    for (let i = 0; i < 3; i++) dcyl(0.1, 0.1, 0.6, '#7a5230', main, 1.1, 0.1 + (i > 1 ? 0.17 : 0), -0.5 + (i % 2) * 0.22, 7).rotation.z = Math.PI / 2;
  } else if (T === 'factory') {
    dbox(2.9, 0.15, 2.4, '#7d7a75', main, 0, 0.07, 0);
    dbox(2.7, 1.4, 2.2, '#a8523f', main, 0, 0.85, 0);
    for (let i = 0; i < 3; i++) { const r = dprism(0.95, 0.5, 2.3, '#6e6c68', main, -0.9 + i * 0.9, 1.55, 0); r.scale.x = 0.95; }
    for (const x of [-0.9, 0.9]) { dcyl(0.17, 0.2, 2.5, '#7d7a75', main, x, 2.4, -0.7, 9); dcyl(0.19, 0.19, 0.12, '#2f2f33', main, x, 3.7, -0.7, 9); }
    dbox(0.9, 0.9, 0.06, '#4a4f58', main, 0, 0.6, 1.11);
    for (const x of [-1.0, 1.0]) dmesh(dgeo('win', () => new THREE.BoxGeometry(0.3, 0.3, 0.05)), winMat, main, x, 1.0, 1.11);
    dcyl(0.35, 0.35, 0.9, '#b8bec6', main, 1.55, 0.5, 0.9, 12, { metalness: 0.5, roughness: 0.4 });
    dbox(1.2, 0.12, 0.35, '#3d424a', main, -1.5, 0.3, 1.05);
  }
  const site = new THREE.Group(); g.add(site);
  for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) dbox(0.08, 1.1, 0.08, '#8b6a3d', site, x * (b.w / 2 - 0.1), 0.55, z * (b.h / 2 - 0.1));
  dbox(b.w - 0.2, 0.05, 0.05, '#8b6a3d', site, 0, 1.05, -(b.h / 2 - 0.1)); dbox(b.w - 0.2, 0.05, 0.05, '#8b6a3d', site, 0, 1.05, b.h / 2 - 0.1);
  for (let i = 0; i < 3; i++) dcyl(0.08, 0.08, 0.7, '#7a5230', site, b.w / 2 - 0.3 + i * 0.05, 0.1 + i * 0.15, b.h / 2 + 0.2, 7).rotation.z = Math.PI / 2;
  g.position.set(b.x, b.y, b.z);
  return { g, main, site, upd: U2.upd };
}
const has = (t) => colony.has(t);
function syncBuildingViews(t, dt) {
  for (const b of colony.buildings) if (!dBViews.has(b.id)) { const v = makeBuildingView(b); dRoot.add(v.g); dBViews.set(b.id, v); }
  for (const [id, v] of dBViews) if (!colony.getBuilding(id)) { dRoot.remove(v.g); dBViews.delete(id); if (dSelB && dSelB.id === id) dSelectB(null); }
  for (const b of colony.buildings) {
    const v = dBViews.get(b.id);
    v.g.position.y = b.y;
    v.main.visible = b.prog > 0.04; v.site.visible = b.prog < 1;
    v.main.scale.set(1, 0.12 + 0.88 * Math.min(1, b.prog), 1);
    if (v.upd && b.prog >= 1) v.upd(t, dt);
  }
}

/* ---------------------------------------------------------------- yerleştirme gölgesi */
const dGhost = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ color: 0x7fe0b0, transparent: true, opacity: 0.4, depthWrite: false }));
dGhost.visible = false; dGhost.renderOrder = 6; scene.add(dGhost);
function ghostCell(bt) {
  const B = D_BUILD[bt];
  return { cx: Math.round(hit.x + HALF - B.w / 2), cz: Math.round(hit.z + HALF - B.h / 2), B };
}
function updateGhost() {
  const bt = dBuildTool() ? tool.slice(2) : '';
  if (gameMode !== 'detail' || !bt || !hit.ok || !(hoverPt || toolDown)) { dGhost.visible = false; return; }
  const { cx, cz, B } = ghostCell(bt);
  const why = colony.canPlace(bt, cx, cz);
  dGhost.visible = true;
  dGhost.scale.set(B.w, 1.2, B.h);
  dGhost.position.set(cx - HALF + B.w / 2, Math.max(world.getHeight(cx - HALF + B.w / 2, cz - HALF + B.h / 2), SEA) + 0.6, cz - HALF + B.h / 2);
  dGhost.material.color.set(why ? 0xff5a4a : 0x7fe0b0);
}

/* ---------------------------------------------------------------- araç kullanımı (detaylı mod) */
function detailTool(tid, first) {
  if (!first) return;
  const id = tid.slice(2);
  if (D_BUILD[id]) {
    const { cx, cz } = ghostCell(id);
    const r = colony.place(id, cx, cz);
    if (typeof r === 'string') toast('⚠️ ' + r);
    else { toast(D_BUILD[r.type].n + ' için yer ayrıldı — işçiler yapacak'); buildDock(); }
    return;
  }
  if (id === 'dem') {
    const b = colony.buildingAtCell((hit.x + HALF) | 0, (hit.z + HALF) | 0);
    if (b) { colony.removeBuilding(b.id); toast(D_BUILD[b.type].n + ' yıkıldı (%40 odun iade)'); } else toast('Yıkılacak yapı yok');
    return;
  }
  const kinds = { pm: [false, 24], pf: [true, 24], pbm: [false, 5], pbf: [true, 5] };
  if (kinds[id]) {
    if (!world._okPoint(hit.x, hit.z)) { toast('⚠️ Buraya insan konamaz'); return; }
    const p = colony.addPerson(hit.x, hit.z, { female: kinds[id][0], age: kinds[id][1] });
    if (!p) { toast('⚠️ Köy dolu (en fazla ' + D_MAXPEOPLE + ' kişi)'); return; }
    world.fx('puff', p.x, p.y + 0.5, p.z, 1);
    syncPeopleViews(); dSelect(p);
    toast('🧑 ' + p.name + ' yaratıldı — ismini ve özelliklerini düzenleyebilirsin');
  }
}

/* ---------------------------------------------------------------- seçim */
let dHinted = false;
function dSelect(p) {
  dCmdClose();
  if (p && !dHinted && !inMenu) { dHinted = true; setTimeout(() => toast('İpucu: ' + p.name + ' seçiliyken bir ağaca, binaya ya da yere dokun — iş ver'), 900); }
  dSel = p; if (p) dSelB = null; dFollow = false;
  dRing.visible = !!p;
  if (typeof showPersonPanel === 'function') showPersonPanel(p);
  if (p && typeof showBuildPanel === 'function') showBuildPanel(null);
}
function dSelectB(b) {
  dSelB = b; if (b) { dSel = null; dRing.visible = false; if (typeof showPersonPanel === 'function') showPersonPanel(null); }
  if (typeof showBuildPanel === 'function') showBuildPanel(b);
}
/* ---- hedef bulma (ekran uzayında): insan, bina, ağaç */
function dPersonAt(x, y) {
  const W = window.innerWidth, H = window.innerHeight, lim = coarse ? 54 : 38;
  let best = null, bd = lim * lim;
  for (const p of colony.people) {
    if (p.hidden) continue;
    _pv.set(p.x, p.y + 0.6, p.z).project(camera);
    if (_pv.z > 1) continue;
    const dx = (_pv.x * 0.5 + 0.5) * W - x, dy = (-_pv.y * 0.5 + 0.5) * H - y, d = dx * dx + dy * dy;
    if (d < bd) { bd = d; best = p; }
  }
  return best;
}
function dBuildingAt(x, y) {
  const W = window.innerWidth, H = window.innerHeight;
  const ppu = H / (2 * cam.dist * Math.tan(camera.fov * Math.PI / 360));
  let best = null, bd = 1e9;
  for (const b of colony.buildings) {
    const hg = b.type === 'factory' ? 2.2 : b.type === 'school' ? 1.5 : b.type === 'house' ? 1.2 : b.type === 'well' ? 0.8 : 0.4;
    _pv.set(b.x, b.y + hg * 0.6, b.z).project(camera);
    if (_pv.z > 1) continue;
    const d = Math.hypot((_pv.x * 0.5 + 0.5) * W - x, (-_pv.y * 0.5 + 0.5) * H - y);
    if (d < Math.max(b.w, b.h) * 0.55 * ppu + 10 && d < bd) { bd = d; best = b; }
  }
  if (!best && hit.ok) best = colony.buildingAtCell((hit.x + HALF) | 0, (hit.z + HALF) | 0);
  return best;
}
function dTreeAt(x, y) {
  if (!hit.ok) return -1;
  const W = window.innerWidth, H = window.innerHeight, lim = coarse ? 40 : 28;
  const cx = (hit.x + HALF) | 0, cz = (hit.z + HALF) | 0;
  let best = -1, bd = lim * lim;
  for (let z = Math.max(0, cz - 7); z <= Math.min(N - 1, cz + 7); z++) for (let xx = Math.max(0, cx - 7); xx <= Math.min(N - 1, cx + 7); xx++) {
    const c = z * N + xx; if (!world.treeT[c]) continue;
    const wx = xx - HALF + 0.5, wz = z - HALF + 0.5, gy = world.getHeight(wx, wz);
    for (const hy of [0.4, 1.7, 3.0]) {
      _pv.set(wx, gy + hy, wz).project(camera);
      if (_pv.z > 1) continue;
      const dx = (_pv.x * 0.5 + 0.5) * W - x, dy = (-_pv.y * 0.5 + 0.5) * H - y, d = dx * dx + dy * dy;
      if (d < bd) { bd = d; best = c; }
    }
  }
  return best;
}

/* ---- komut kutusu: seçili insana hedefe göre iş ver */
const dCmdEl = document.createElement('div'); dCmdEl.id = 'dcmd'; dCmdEl.className = 'glass'; dCmdEl.style.display = 'none'; document.body.appendChild(dCmdEl);
const dMark = new THREE.Mesh(new THREE.RingGeometry(0.5, 0.68, 28).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xffd35a, transparent: true, opacity: 0.95, depthWrite: false, side: THREE.DoubleSide }));
dMark.visible = false; dMark.renderOrder = 5; dRoot.add(dMark);
function dCmdClose() { dCmdEl.style.display = 'none'; dMark.visible = false; }
document.addEventListener('pointerdown', (e) => { if (dCmdEl.style.display !== 'none' && !dCmdEl.contains(e.target)) dCmdClose(); }, true);
addEventListener('keydown', (e) => { if (e.key === 'Escape') dCmdClose(); });
function dCmdShow(x, y, title, opts, mx, my, mz, ms) {
  dCmdEl.innerHTML = '<div class="ct">' + title + '</div>';
  opts.forEach((o) => {
    const b = document.createElement('button'); b.textContent = o.t;
    b.onclick = () => { dCmdClose(); const m = o.f(); if (m) toast(m); };
    dCmdEl.appendChild(b);
  });
  dCmdEl.style.left = '0px'; dCmdEl.style.top = '0px'; dCmdEl.style.display = 'flex';
  const W = window.innerWidth, H = window.innerHeight, w = dCmdEl.offsetWidth, h = dCmdEl.offsetHeight;
  dCmdEl.style.left = Math.max(6, Math.min(W - w - 6, x + 10)) + 'px';
  dCmdEl.style.top = Math.max(60, Math.min(H - h - 6, y - h / 2)) + 'px';
  dMark.position.set(mx, my + 0.08, mz); dMark.scale.setScalar(ms || 1); dMark.visible = true;
}
function detailTap(x, y) {
  dCmdClose();
  const person = dPersonAt(x, y);
  if (person && (person === dSel || !dSel)) { dSelect(person); return; }
  const pk = pick(x, y);
  if (!dSel) {
    const b = dBuildingAt(x, y);
    if (b) { dSelectB(b); return; }
    dSelect(null); dSelectB(null); return;
  }
  const p = dSel, nm = '<b>' + p.name.replace(/</g, '&lt;') + '</b> → ';
  let opts, title, mk;
  if (person) {
    opts = colony.commandOptions(p, { kind: 'person', q: person });
    opts.push({ t: '👤 Seç', f: () => { dSelect(person); return ''; } });
    title = nm + person.name.replace(/</g, '&lt;'); mk = [person.x, person.y, person.z, 0.8];
  } else {
    const b = dBuildingAt(x, y);
    if (b) {
      opts = colony.commandOptions(p, { kind: 'building', b });
      opts.push({ t: '🔍 İncele', f: () => { dSelectB(b); return ''; } });
      title = nm + D_BUILD[b.type].n + (b.prog < 1 ? ' (inşaat)' : '');
      mk = [b.x, b.y, b.z, Math.max(b.w, b.h) * 0.8];
    } else {
      const c = dTreeAt(x, y);
      if (c >= 0) {
        opts = colony.commandOptions(p, { kind: 'tree', cell: c });
        title = nm + 'Ağaç'; mk = [(c % N) - HALF + 0.5, world.getHeight((c % N) - HALF + 0.5, ((c / N) | 0) - HALF + 0.5), ((c / N) | 0) - HALF + 0.5, 0.9];
        if (!opts.length) { toast('Çocuklar ağaç kesemez'); return; }
      } else if (pk) {
        const water = world.getHeight(hit.x, hit.z) < SEA - 0.05;
        opts = colony.commandOptions(p, { kind: 'ground', x: hit.x, z: hit.z, water });
        title = nm + (water ? 'Su' : 'Yer'); mk = [hit.x, hit.y, hit.z, 0.7];
        if (!opts.length) { toast(water ? 'Balık tutmak için balıkçılık becerisini aç' : 'Oraya gidilemez'); return; }
      } else return;
    }
  }
  dCmdShow(x, y, title, opts, mk[0], mk[1], mk[2], mk[3]);
}

/* ---------------------------------------------------------------- kare güncellemesi */
let dLastReal = isReal;
function detailFrame(dt, t) {
  if (dLastReal !== isReal) { dLastReal = isReal; for (const m of dMats.values()) { m.flatShading = !isReal; m.needsUpdate = true; } }
  winMat.emissiveIntensity = colony.night || (colony.hour > 19 || colony.hour < 6.5) ? 1.4 : 0;
  syncPeopleViews();
  for (const p of colony.people) { const v = dViews.get(p.id); if (v) animatePerson(v, p, t, dt); }
  syncBuildingViews(t, dt);
  updateLabels();
  if (dSel) {
    dRing.position.set(dSel.x, dSel.y + 0.06, dSel.z);
    dRing.scale.setScalar(1 + Math.sin(t * 4) * 0.06);
    if (dFollow) { cam.tx = dSel.x; cam.tz = dSel.z; }
  }
  if (dSelB) { /* seçili bina bilgisi arayüzde güncellenir */ }
  updateGhost();
  if (dBuildTool()) cursor.visible = false;
}
