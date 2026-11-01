/* ===================================================================
   İnsan modeli: yüz (göz, kaş, burun, ağız), saç stilleri, kıyafetler, şapkalar,
   eklemli kol/bacak, ayakkabı ve aletler. Detaylı Mod halkı ile Ada Modu oyuncusu/köylüleri
   aynı oluşturucuyu kullanır. Build sırasında detail_view.js'den sonra eklenir.
   =================================================================== */
const D_TOOLS = ['axe', 'hammer', 'hoe', 'rod', 'book', 'basket', 'shovel', 'net', 'can'];
const D_HAIR_STYLES = ['Kısa', 'Uzun', 'Küt', 'Topuz', 'Dikenli', 'Kıvırcık', 'At kuyruğu', 'Kısa kesim'];
const D_OUTFITS = ['Tişört', 'Kapüşonlu', 'Elbise', 'Tulum'];
const D_HATS = ['Yok', 'Kasket', 'Hasır şapka', 'Bere'];
const D_SHOES = ['#3b2a1c', '#e8e4da', '#2a2f3a', '#7a4a2a'];
const D_EYES = ['#2a1a10', '#3b5a3a', '#35516e', '#4a2e1e'];

// kumaş / cilt / saç / deri için HD doku ayarları (hd.js: HDK anahtarları)
const H_SKIN = { hd: ['skin', { sc: 7, amt: 0.2, bump: 0.3 }], roughness: 0.6 };
const H_CLOTH = { hd: ['cloth', { sc: 18, amt: 0.5, bump: 1.5 }], roughness: 0.9 };
const H_DENIM = { hd: ['cloth', { sc: 26, amt: 0.6, bump: 1.8 }], roughness: 0.88 };
const H_HAIR = { hd: ['cloth', { sc: 12, amt: 0.35, bump: 0.8 }], roughness: 0.5, side: THREE.DoubleSide };
const H_SHOE = { hd: ['wood', { sc: 9, amt: 0.3, bump: 0.8 }], roughness: 0.65 };
const H_EYE = { hd: null, roughness: 0.2 };
const H_PLAIN = { hd: null };
const shadeHex = (hex, k) => '#' + new THREE.Color(hex).multiplyScalar(k).getHexString();
const dlathe = (k, pts, seg = 16) => dgeo('L' + k, () => new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), seg));
const dsphG = (r, ws = 14, hs = 10) => dgeo('S' + r + '_' + ws, () => new THREE.SphereGeometry(r, ws, hs));
const dcapG = (r, l) => dgeo('P' + r + '_' + l, () => new THREE.CapsuleGeometry(r, l, 4, 10));

// koloni kişisinden (p) görünüm özellikleri
function lookOf(p) {
  const id = p.id | 0, fem = !!p.female, st = p.style | 0;
  return {
    female: fem, scale: 1,
    skin: D_SKINS[p.skin % 5], hair: D_HAIRS[p.hair % 6], shirt: D_SHIRTS[p.shirt % 8], pants: D_PANTS[id % 4],
    shoe: D_SHOES[id % 4], eye: D_EYES[(id >> 1) % 4],
    hs: p.hs !== undefined ? p.hs : fem ? [1, 3, 2, 6][(id + st) % 4] : [0, 4, 7, 0, 5][(id + st) % 5],
    outfit: p.outfit !== undefined ? p.outfit : fem ? (id % 3 === 0 ? 2 : 0) : id % 6 === 0 ? 3 : id % 4 === 0 ? 1 : 0,
    hat: p.hat !== undefined ? p.hat : id % 7 === 3 ? 2 : 0, hatCol: '',
  };
}

function buildHair(head, L) {
  const hm = dmat(L.hair, H_HAIR), PI = Math.PI;
  // yüzün önü açık kalan kalp: r yarıçap, th kapsanan kutup açısı
  const shell = (r, th, y, open) => dmesh(dgeo('hc' + r + '_' + th + '_' + open, () => open ? new THREE.SphereGeometry(r, 20, 12, PI / 2 + 0.85, PI * 2 - 1.7, 0, th) : new THREE.SphereGeometry(r, 20, 12, 0, PI * 2, 0, th)), hm, head, 0, y, 0);
  const fringe = (r) => shell(r, PI * 0.36, 0.016, false);
  switch (L.hs) {
    case 1: { // uzun
      shell(0.178, PI * 0.62, 0.01, true); fringe(0.17);
      dmesh(dcapG(0.1, 0.24), hm, head, 0, -0.15, -0.085).scale.set(1.2, 1, 0.62);
      for (const sx of [-1, 1]) dmesh(dcapG(0.04, 0.15), hm, head, sx * 0.14, -0.08, 0.0);
      break;
    }
    case 2: shell(0.19, PI * 0.74, -0.006, true); fringe(0.172); break;                            // küt
    case 3: shell(0.172, PI * 0.55, 0.012, true); fringe(0.168); dmesh(dsphG(0.072), hm, head, 0, 0.19, -0.06); break;   // topuz
    case 4: { // dikenli
      shell(0.172, PI * 0.5, 0.012, true); fringe(0.168);
      for (let i = 0; i < 8; i++) {
        const a = i / 8 * PI * 2, ring = i % 2 ? 0.1 : 0.05, c = dmesh(dgeo('sp', () => new THREE.ConeGeometry(0.04, 0.13, 6)), hm, head, Math.cos(a) * ring, 0.16 - ring * 0.2, Math.sin(a) * ring - 0.02);
        c.rotation.set(Math.sin(a) * 0.5, 0, -Math.cos(a) * 0.5);
      }
      break;
    }
    case 5: { // kıvırcık
      for (let i = 0; i < 20; i++) {
        const t = (i + 0.5) / 20, th = Math.acos(1 - t * 0.95), ph = i * 2.399963;
        const x = Math.sin(th) * Math.cos(ph), z = Math.sin(th) * Math.sin(ph), y = Math.cos(th);
        if (z > 0.55 && y < 0.62) continue;   // yüz açık kalsın
        dmesh(dsphG(0.066), hm, head, x * 0.15, y * 0.15 + 0.02, z * 0.15 - 0.01);
      }
      dmesh(dsphG(0.15, 16, 10), hm, head, 0, 0.04, -0.03).scale.set(1.03, 0.9, 1.0);
      break;
    }
    case 6: { // at kuyruğu
      shell(0.172, PI * 0.55, 0.012, true); fringe(0.168);
      const q = dmesh(dcapG(0.04, 0.2), hm, head, 0, -0.04, -0.22); q.rotation.x = 0.45;
      dmesh(dsphG(0.03), dmat(shadeHex(L.shirt, 0.9), H_PLAIN), head, 0, 0.06, -0.17);
      break;
    }
    case 7: shell(0.164, PI * 0.5, 0.01, true); shell(0.163, PI * 0.34, 0.014, false); break;       // kısa kesim
    default: shell(0.172, PI * 0.55, 0.012, true); fringe(0.168);                                 // kısa
  }
}
function buildHat(head, L) {
  const PI = Math.PI;
  if (L.hat === 1) {         // kasket
    const col = L.hatCol || '#e8453c', m = dmat(col, H_CLOTH);
    dmesh(dgeo('hat1', () => new THREE.SphereGeometry(0.178, 18, 10, 0, PI * 2, 0, PI * 0.46)), m, head, 0, 0.075, 0);
    dmesh(dgeo('hat1b', () => new THREE.CylinderGeometry(0.1, 0.1, 0.012, 14, 1, false, -PI / 2, PI)), m, head, 0, 0.09, 0.15);
  } else if (L.hat === 2) {  // hasır şapka
    const m = dmat(L.hatCol || '#dcb865', { hd: ['wood', { sc: 10, amt: 0.4, bump: 1.2 }], roughness: 0.95 });
    dmesh(dgeo('hat2a', () => new THREE.CylinderGeometry(0.27, 0.27, 0.014, 22)), m, head, 0, 0.082, 0);
    dmesh(dgeo('hat2b', () => new THREE.SphereGeometry(0.165, 18, 10, 0, PI * 2, 0, PI * 0.5)), m, head, 0, 0.082, 0);
    dmesh(dgeo('hat2c', () => new THREE.CylinderGeometry(0.168, 0.168, 0.03, 18, 1, true)), dmat('#c4553b', H_CLOTH), head, 0, 0.1, 0);
  } else if (L.hat === 3) {  // bere
    const m = dmat(L.hatCol || '#3b82f6', H_CLOTH);
    dmesh(dgeo('hat3', () => new THREE.SphereGeometry(0.18, 18, 10, 0, PI * 2, 0, PI * 0.43)), m, head, 0, 0.055, -0.005);
    dmesh(dsphG(0.04), dmat('#ffffff', H_CLOTH), head, 0, 0.235, -0.005);
  }
}

function buildHuman(L) {
  const fem = !!L.female, root = new THREE.Group(), body = new THREE.Group(); body.position.y = 0.5; root.add(body);
  const skinM = dmat(L.skin, H_SKIN), shirtM = dmat(L.shirt, H_CLOTH), pantsM = dmat(L.pants, H_DENIM), shoeM = dmat(L.shoe, H_SHOE);
  const ofit = L.outfit | 0, longSleeve = ofit === 1;
  // gövde
  const torsoPts = fem
    ? [[0.001, -0.07], [0.125, -0.06], [0.135, 0.0], [0.105, 0.2], [0.13, 0.4], [0.12, 0.53], [0.065, 0.6], [0.001, 0.61]]
    : [[0.001, -0.07], [0.135, -0.06], [0.14, 0.0], [0.12, 0.2], [0.15, 0.42], [0.14, 0.54], [0.07, 0.6], [0.001, 0.61]];
  const torso = dmesh(dlathe('t' + fem, torsoPts), shirtM, body, 0, 0, 0); torso.scale.z = 0.8;
  dmesh(dgeo('neck', () => new THREE.CylinderGeometry(0.045, 0.05, 0.1, 10)), skinM, body, 0, 0.645, 0);
  if (ofit === 3) {            // tulum: pantolon rengi bel + önlük + askılar
    dmesh(dlathe('ov', [[0.001, -0.08], [0.142, -0.07], [0.147, 0.02], [0.125, 0.16], [0.001, 0.16]]), pantsM, body, 0, 0, 0).scale.z = 0.8;
    dmesh(dgeo('bib', () => new THREE.BoxGeometry(0.17, 0.17, 0.02)), pantsM, body, 0, 0.24, 0.1);
    for (const sx of [-1, 1]) { const s = dmesh(dgeo('strap', () => new THREE.BoxGeometry(0.03, 0.34, 0.02)), pantsM, body, sx * 0.07, 0.43, 0.065); s.rotation.x = -0.2; }
  } else if (ofit === 2) {     // elbise: etek
    const sk = dmesh(dlathe('skirt', [[0.118, 0.2], [0.16, 0.08], [0.215, -0.08], [0.25, -0.2]], 20), dmat(L.shirt, Object.assign({}, H_CLOTH, { side: THREE.DoubleSide })), body, 0, 0, 0); sk.scale.z = 0.9;
    dmesh(dgeo('hem', () => new THREE.TorusGeometry(0.25, 0.01, 6, 24)), dmat(shadeHex(L.shirt, 0.82), H_PLAIN), body, 0, -0.2, 0).rotation.x = Math.PI / 2;
  } else if (ofit === 1) {     // kapüşonlu: kapüşon + cep + bağcık
    dmesh(dsphG(0.1, 12, 8), shirtM, body, 0, 0.58, -0.09).scale.set(1.3, 0.9, 0.8);
    dmesh(dgeo('pocket', () => new THREE.BoxGeometry(0.15, 0.07, 0.02)), dmat(shadeHex(L.shirt, 0.88), H_CLOTH), body, 0, 0.1, 0.115);
    for (const sx of [-1, 1]) dmesh(dgeo('cord', () => new THREE.CylinderGeometry(0.006, 0.006, 0.1, 5)), dmat('#f4f0e6', H_PLAIN), body, sx * 0.03, 0.52, 0.115);
  } else {                     // tişört yakası
    const cl = dmesh(dgeo('collar', () => new THREE.TorusGeometry(0.058, 0.011, 6, 16)), dmat(shadeHex(L.shirt, 0.82), H_CLOTH), body, 0, 0.6, 0.0); cl.rotation.x = Math.PI / 2; cl.scale.set(1, 0.85, 1);
  }
  // baş
  const head = new THREE.Group(); head.position.set(0, 0.84, 0); body.add(head);
  const face = dmesh(dgeo('face', () => new THREE.SphereGeometry(0.158, 26, 18)), skinM, head, 0, 0, 0); face.scale.set(1, 1.05, 1);
  for (const sx of [-1, 1]) dmesh(dsphG(0.028, 10, 8), skinM, head, sx * 0.157, -0.005, -0.005).scale.set(0.45, 1, 0.9);   // kulaklar
  const eyes = [];
  for (const sx of [-1, 1]) {
    const eg = new THREE.Group(); eg.position.set(sx * 0.06, 0.012, 0.136); head.add(eg);
    dmesh(dsphG(0.034, 12, 10), dmat('#fbfbfb', H_EYE), eg, 0, 0, 0, false).scale.z = 0.55;
    dmesh(dsphG(0.022, 12, 10), dmat(L.eye, H_EYE), eg, 0, -0.002, 0.014, false).scale.z = 0.5;
    dmesh(dsphG(0.011, 8, 6), dmat('#0c0c10', H_EYE), eg, 0, -0.002, 0.021, false);
    dmesh(dsphG(0.0065, 6, 5), dmat('#ffffff', { hd: null, emissive: '#ffffff', emissiveIntensity: 0.5 }), eg, 0.008, 0.009, 0.026, false);
    eyes.push(eg);
    const brow = dmesh(dgeo('brow', () => new THREE.BoxGeometry(0.05, 0.011, 0.014)), dmat(L.hair, H_HAIR), head, sx * 0.06, 0.07, 0.143, false);
    brow.rotation.z = sx * 0.12;
  }
  dmesh(dsphG(0.018, 10, 8), dmat(shadeHex(L.skin, 0.93), H_SKIN), head, 0, -0.03, 0.156, false);              // burun
  const mouth = dmesh(dgeo('mouth', () => new THREE.TorusGeometry(0.026, 0.0055, 6, 14, Math.PI)), dmat('#8a3a3a', H_PLAIN), head, 0, -0.05, 0.148, false);
  mouth.rotation.z = Math.PI;
  for (const sx of [-1, 1]) dmesh(dsphG(0.02, 8, 6), dmat('#ff9aa0', { hd: null, transparent: true, opacity: 0.5, depthWrite: false }), head, sx * 0.093, -0.035, 0.118, false).scale.z = 0.35;
  buildHair(head, L); buildHat(head, L);
  // kollar
  const mkArm = (sx) => {
    const g = new THREE.Group(); g.position.set(sx * (fem ? 0.157 : 0.174), 0.5, 0); body.add(g);
    dmesh(dsphG(0.052, 12, 9), shirtM, g, 0, 0, 0);
    dmesh(dcapG(0.045, 0.1), shirtM, g, 0, -0.1, 0);
    const el = new THREE.Group(); el.position.set(0, -0.2, 0); g.add(el);
    dmesh(dcapG(0.038, 0.09), longSleeve ? shirtM : skinM, el, 0, -0.095, 0);
    dmesh(dsphG(0.044, 12, 9), skinM, el, 0, -0.2, 0);
    return { g, el };
  };
  const aL = mkArm(-1), aR = mkArm(1);
  const hand = new THREE.Group(); hand.position.set(0, -0.2, 0); aR.el.add(hand);
  const tools = {}, wood = '#7a5230', steel = '#aab0b8';
  const mk = (name, f) => { const t = new THREE.Group(); f(t); t.visible = false; hand.add(t); tools[name] = t; };
  mk('axe', (t) => { dcyl(0.015, 0.015, 0.5, wood, t, 0, -0.2, 0, 6); dbox(0.16, 0.1, 0.04, steel, t, 0.07, -0.42, 0); });
  mk('hammer', (t) => { dcyl(0.015, 0.015, 0.35, wood, t, 0, -0.14, 0, 6); dbox(0.12, 0.07, 0.07, '#6b7078', t, 0, -0.3, 0); });
  mk('hoe', (t) => { dcyl(0.015, 0.015, 0.6, wood, t, 0, -0.2, 0, 6); dbox(0.14, 0.05, 0.04, steel, t, 0.05, -0.5, 0); });
  mk('rod', (t) => { dcyl(0.01, 0.01, 0.9, '#8b6a3d', t, 0, -0.3, 0.1, 5).rotation.x = -0.5; });
  mk('book', (t) => { dbox(0.16, 0.03, 0.2, '#7a3b2a', t, 0, -0.02, 0.06); dbox(0.14, 0.035, 0.18, '#f4efe0', t, 0, -0.02, 0.06); });
  mk('basket', (t) => { dcyl(0.1, 0.07, 0.1, '#a8803f', t, 0, -0.06, 0.04, 10); });
  mk('shovel', (t) => { dcyl(0.014, 0.014, 0.6, wood, t, 0, -0.18, 0, 6); dbox(0.1, 0.15, 0.015, steel, t, 0, -0.53, 0); dbox(0.07, 0.025, 0.025, wood, t, 0, 0.1, 0); });
  mk('net', (t) => {
    dcyl(0.012, 0.012, 0.7, wood, t, 0, -0.25, 0, 6);
    const r = dmesh(dgeo('netring', () => new THREE.TorusGeometry(0.11, 0.009, 6, 18)), dmat('#d8d2c4', H_PLAIN), t, 0, -0.66, 0.1); r.rotation.x = Math.PI / 2 - 0.4;
    const bag = dmesh(dgeo('netbag', () => new THREE.ConeGeometry(0.11, 0.2, 12, 1, true)), dmat('#f4f4f0', { hd: null, transparent: true, opacity: 0.55, side: THREE.DoubleSide }), t, 0, -0.75, 0.13); bag.rotation.x = Math.PI + 0.55 - 0.4;
  });
  mk('can', (t) => {
    dcyl(0.07, 0.075, 0.13, '#4f8fd6', t, 0, -0.06, 0.05, 12);
    dcyl(0.012, 0.016, 0.16, '#4f8fd6', t, 0, -0.04, 0.17, 6).rotation.x = -1.0;
    dmesh(dgeo('canh', () => new THREE.TorusGeometry(0.05, 0.008, 6, 12, Math.PI)), dmat('#3b6eb0', H_PLAIN), t, 0, 0.0, 0.05);
  });
  // bacaklar
  const mkLeg = (sx) => {
    const g = new THREE.Group(); g.position.set(sx * 0.072, 0.5, 0); root.add(g);
    const lm = ofit === 2 ? skinM : pantsM;
    dmesh(dcapG(0.058, 0.13), lm, g, 0, -0.125, 0);
    const kn = new THREE.Group(); kn.position.set(0, -0.25, 0); g.add(kn);
    dmesh(dcapG(0.05, 0.1), lm, kn, 0, -0.1, 0);
    dmesh(dgeo('shoe', () => new THREE.SphereGeometry(0.06, 14, 10)), shoeM, kn, 0, -0.213, 0.03).scale.set(0.95, 0.62, 1.55);
    dmesh(dgeo('sole', () => new THREE.CylinderGeometry(0.058, 0.058, 0.014, 14)), dmat('#f4f0e6', H_PLAIN), kn, 0, -0.243, 0.03).scale.set(0.95, 1, 1.55);
    return { g, kn };
  };
  const lL = mkLeg(-1), lR = mkLeg(1);
  root.scale.setScalar(L.scale || 1);
  return { root, body, head, torso, mouth, eyes, armL: aL.g, armR: aR.g, elbL: aL.el, elbR: aR.el, legL: lL.g, legR: lR.g, kneeL: lL.kn, kneeR: lR.kn, tools, curTool: '', size: 1, look: L };
}
function makePersonView(p) { return buildHuman(lookOf(p)); }

// o: { lL, lR, aL, aR, lean, hy, tool, t, ph, sleep, mood }
function poseHuman(v, o, dt) {
  const k = Math.min(1, dt * 14), sm = (n, a, tg) => { n.rotation[a] += (tg - n.rotation[a]) * k; };
  sm(v.legL, 'x', o.lL); sm(v.legR, 'x', o.lR);
  sm(v.kneeL, 'x', Math.max(0, o.lL) * 0.95); sm(v.kneeR, 'x', Math.max(0, o.lR) * 0.95);
  sm(v.armL, 'x', o.aL); sm(v.armR, 'x', o.aR);
  sm(v.elbL, 'x', -(0.14 + Math.max(0, -o.aL) * 0.42)); sm(v.elbR, 'x', -(0.14 + Math.max(0, -o.aR) * 0.42));
  sm(v.body, 'x', o.lean); sm(v.head, 'y', o.hy);
  sm(v.head, 'x', o.hx || 0);
  if (o.t !== undefined) {
    v.torso.scale.y = 1 + Math.sin(o.t * 1.9 + (o.ph || 0)) * 0.012;
    const bl = o.sleep || ((o.t * 0.8 + (o.ph || 0)) % 4.3) < 0.11 ? 0.1 : 1;
    for (const e of v.eyes) e.scale.y = bl;
  }
  if (o.mood !== undefined) v.mouth.rotation.z = o.mood < 35 ? 0 : Math.PI;
  if (v.curTool !== o.tool) { for (const n of D_TOOLS) v.tools[n].visible = n === o.tool; v.curTool = o.tool; }
}

function animatePerson(v, p, t, dt) {
  const a = p.act, ph = a && a.phase === 'do' ? a.type : '';
  const ageK = p.age < D_ADULT ? 0.5 + 0.5 * Math.min(1, p.age / D_ADULT) : 1;
  const size = ageK * (p.female ? 0.93 : 1) * 0.88;
  v.root.visible = !p.hidden;
  v.root.scale.setScalar(size);
  v.head.scale.setScalar(1 + (1 - ageK) * 0.5);
  const w = t * 8 + p.phase, s9 = Math.sin(t * 9 + p.phase);
  let lL = 0, lR = 0, aL = 0, aR = 0, lean = 0, tool = '', bob = 0, hy = 0;
  if (p.moving) { lL = Math.sin(w) * 0.75; lR = -lL; aL = lR * 0.8; aR = lL * 0.8; bob = Math.abs(Math.sin(w)) * 0.045; if (a && a.type === 'forage') tool = 'basket'; }
  else { aL = Math.sin(t * 1.6 + p.phase) * 0.05; aR = -aL; }
  switch (ph) {
    case 'chop': aR = -1.3 + s9 * 0.9; aL = -0.5; lean = 0.2; tool = 'axe'; break;
    case 'build': aR = -1.2 + Math.sin(t * 13 + p.phase) * 0.7; aL = -0.35; lean = 0.15; tool = 'hammer'; break;
    case 'farm': lean = 0.55 + s9 * 0.08; aR = -0.9 + Math.sin(t * 5 + p.phase) * 0.45; aL = -0.7; tool = a.mode === 'sow' ? 'basket' : 'hoe'; break;
    case 'herd': lean = 0.3; aR = -0.7 + Math.sin(t * 4) * 0.3; aL = -0.5; tool = 'basket'; break;
    case 'fish': aR = -0.9 + Math.sin(t * 1.3) * 0.08; aL = -0.7; lean = 0.05; tool = 'rod'; break;
    case 'craft': aR = -1.1 + Math.sin(t * 8 + p.phase) * 0.5; aL = -1.0 - Math.sin(t * 8 + p.phase) * 0.4; lean = 0.2; tool = 'hammer'; break;
    case 'teach': aR = -1.3 + Math.sin(t * 2) * 0.3; aL = -0.2; tool = 'book'; break;
    case 'study': tool = 'book'; aR = -0.9; aL = -0.9; lean = 0.18; hy = 0.3; break;
    case 'eat': aR = -2.0 + Math.sin(t * 6) * 0.25; aL = 0.0; break;
    case 'wash': lean = 0.5; aL = aR = -0.9 + Math.sin(t * 7) * 0.4; break;
    case 'forage': lean = 0.55; aR = -0.8 + Math.sin(t * 6) * 0.3; aL = -0.5; tool = 'basket'; break;
    case 'talk': aR = -0.5 + Math.sin(t * 3.1 + p.phase) * 0.5; aL = -0.2 + Math.sin(t * 2.3) * 0.3; hy = Math.sin(t * 2) * 0.15; break;
    case 'fun': aL = aR = -2.6 + Math.sin(t * 6 + p.phase) * 0.5; bob = Math.abs(Math.sin(t * 5 + p.phase)) * 0.06; break;
    case 'play': if (!p.moving) { aL = aR = -2.4 + Math.sin(t * 7) * 0.5; bob = Math.abs(Math.sin(t * 6)) * 0.07; } break;
  }
  poseHuman(v, { lL, lR, aL, aR, lean, hy, tool, t, ph: p.phase, sleep: p.lying, mood: p.mood }, dt);
  v.root.position.set(p.x, p.y + bob * size, p.z);
  v.root.rotation.y = p.ang;
  if (p.lying) { v.root.rotation.x = -Math.PI / 2; v.root.position.y = p.y + 0.14; } else v.root.rotation.x = 0;
}
