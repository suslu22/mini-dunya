// Mini Dünya - ses ve müzik. Tamamen prosedürel WebAudio: dosya indirmez, hepsi koddan üretilir.
// Katmanlar: ses efektleri (sfx), ortam sesleri (rüzgâr, yağmur, dalga, kuş, cırcır böceği) ve üretken (generative) müzik.
// Tarayıcılar sesi ancak kullanıcı bir şeye dokununca açar; auUnlock() ilk dokunuşta çağrılır.
const AU_KEY = 'minidunya.ses.v1';
const AU = {
  ctx: null, ready: false, out: null, an: null, sfxBus: null, ambBus: null, musBus: null, verb: null, noiseBuf: null,
  on: { sfx: true, amb: true, mus: true }, vol: 0.7,
  layer: {}, last: {}, ambT: 0, birdT: 0, cricketT: 0, owlT: 0,
  sc: { mode: 'menu', hour: 12, season: 0, rain: 0, snow: 0, storm: 0, water: 0, wind: 0.3, night: 0 },
  mNext: 0, mStep: 0, mBar: 0, mPrev: 2, mRest: false, busy: 0,
};
try { const s = JSON.parse(localStorage.getItem(AU_KEY) || 'null'); if (s) { Object.assign(AU.on, s.on || {}); if (typeof s.vol === 'number') AU.vol = Math.min(1, Math.max(0, s.vol)); } } catch (_) { /* yoksay */ }
function auSave() { try { localStorage.setItem(AU_KEY, JSON.stringify({ on: AU.on, vol: AU.vol })); } catch (_) { /* yoksay */ } }

function auUnlock() {
  if (!AU.ctx) {
    const C = window.AudioContext || window.webkitAudioContext; if (!C) return;
    try { AU.ctx = new C({ latencyHint: 'interactive' }); } catch (_) { return; }
    auBuild();
  }
  if (AU.ctx.state === 'suspended') AU.ctx.resume().catch(() => {});
}
function auBuild() {
  const c = AU.ctx;
  const comp = c.createDynamicsCompressor();
  comp.threshold.value = -16; comp.knee.value = 18; comp.ratio.value = 4; comp.attack.value = 0.01; comp.release.value = 0.25;
  const master = c.createGain(); master.gain.value = AU.vol;
  comp.connect(master); master.connect(c.destination);
  AU.master = master;
  AU.an = c.createAnalyser(); AU.an.fftSize = 512; master.connect(AU.an);
  AU.sfxBus = c.createGain(); AU.sfxBus.gain.value = 0.9; AU.sfxBus.connect(comp);
  AU.ambBus = c.createGain(); AU.ambBus.gain.value = 1; AU.ambBus.connect(comp);
  AU.musBus = c.createGain(); AU.musBus.gain.value = 0; AU.musBus.connect(comp);
  // yankı: üstel sönümlü gürültüden üretilmiş kısa bir oda
  const len = (c.sampleRate * 1.8) | 0, ir = c.createBuffer(2, len, c.sampleRate);
  for (let ch = 0; ch < 2; ch++) { const d = ir.getChannelData(ch); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6); }
  AU.verb = c.createConvolver(); AU.verb.buffer = ir;
  const vg = c.createGain(); vg.gain.value = 0.55; AU.verb.connect(vg); vg.connect(comp);
  AU.musSend = c.createGain(); AU.musSend.gain.value = 0.5; AU.musSend.connect(AU.verb);
  const nl = c.sampleRate * 3, nb = c.createBuffer(1, nl, c.sampleRate), nd = nb.getChannelData(0);
  let b0 = 0, b1 = 0, b2 = 0;   // pembe gürültü: beyaz gürültü, hafif alçak geçirgen
  for (let i = 0; i < nl; i++) { const w = Math.random() * 2 - 1; b0 = 0.99765 * b0 + w * 0.099046; b1 = 0.963 * b1 + w * 0.2965; b2 = 0.57 * b2 + w * 1.0526; nd[i] = (b0 + b1 + b2 + w * 0.1848) * 0.22; }
  AU.noiseBuf = nb;
  // süreklikli ortam katmanları: rüzgâr, yağmur, dalga
  AU.layer.wind = auLoop(AU.ambBus, 'bandpass', 420, 0.7);
  AU.layer.rain = auLoop(AU.ambBus, 'highpass', 1500, 0.5);
  AU.layer.surf = auLoop(AU.ambBus, 'lowpass', 650, 0.4);
  AU.layer.snow = auLoop(AU.ambBus, 'lowpass', 260, 0.5);
  // dalga ve rüzgâr yavaşça kabarıp alçalsın
  for (const [k, hz, depth] of [['wind', 0.09, 0.5], ['surf', 0.11, 0.7]]) {
    const o = c.createOscillator(); o.frequency.value = hz; const g = c.createGain(); g.gain.value = depth; o.connect(g); g.connect(AU.layer[k].mod); o.start();
  }
  AU.ready = true;
  document.addEventListener('visibilitychange', () => { if (!AU.ctx) return; if (document.hidden) AU.ctx.suspend().catch(() => {}); else AU.ctx.resume().catch(() => {}); });
}
// Sonsuz döngüde çalan filtreli gürültü katmanı; "mod" girişi gücü yavaşça dalgalandırır.
function auLoop(dest, type, freq, q) {
  const c = AU.ctx, src = c.createBufferSource(); src.buffer = AU.noiseBuf; src.loop = true; src.start(0, Math.random() * 2);
  const f = c.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
  const g = c.createGain(); g.gain.value = 0;
  const mod = c.createGain(); mod.gain.value = 1;   // 1 → 0..2 arası çarpan değil; LFO doğrudan g.gain'e eklenir
  mod.connect(g.gain);
  src.connect(f); f.connect(g); g.connect(dest);
  return { g, f, mod };
}
function auSet(layer, v, freq) {
  if (!AU.ready) return; const t = AU.ctx.currentTime;
  layer.g.gain.setTargetAtTime(v, t, 0.6);
  if (freq) layer.f.frequency.setTargetAtTime(freq, t, 0.6);
  layer.mod.gain.setTargetAtTime(v * 0.45, t, 0.6);   // salınımın derinliği ses seviyesiyle orantılı
}

/* ------------------------------------------------------------ yardımcı ses üreticiler */
function auTone(dest, t, f, dur, o = {}) {
  const c = AU.ctx, os = c.createOscillator(), g = c.createGain();
  os.type = o.type || 'sine'; os.frequency.setValueAtTime(f, t);
  if (o.f2) os.frequency.exponentialRampToValueAtTime(o.f2, t + dur);
  const a = o.attack || 0.008, peak = o.gain === undefined ? 0.2 : o.gain;
  g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(peak, t + a);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  let n = os;
  if (o.lp) { const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = o.lp; n.connect(lp); n = lp; }
  n.connect(g); g.connect(dest);
  if (o.send) g.connect(o.send);
  os.start(t); os.stop(t + dur + 0.05);
}
function auNoise(dest, t, dur, o = {}) {
  const c = AU.ctx, s = c.createBufferSource(); s.buffer = AU.noiseBuf; s.start(t, Math.random() * 2, dur + 0.1);
  const f = c.createBiquadFilter(); f.type = o.type || 'bandpass'; f.frequency.setValueAtTime(o.f || 1000, t); f.Q.value = o.q || 0.8;
  if (o.f2) f.frequency.exponentialRampToValueAtTime(o.f2, t + dur);
  const g = c.createGain(), a = o.attack || 0.005;
  g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(o.gain === undefined ? 0.3 : o.gain, t + a);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(f); f.connect(g); g.connect(dest);
}
const AU_N = (m) => 440 * Math.pow(2, (m - 69) / 12);   // MIDI → Hz

/* ------------------------------------------------------------ ses efektleri */
const AU_MIN = { click: 0.05, tick: 0.04, pop: 0.08, notify: 0.5, splash: 0.12, chop: 0.1, chips: 0.1, heart: 0.5, spark: 0.1, dust: 0.3, debris: 0.2, step: 0.12, coin: 0.1, plant: 0.12, water: 0.15 };
function auSfx(name, vol = 1) {
  if (!AU.ready || !AU.on.sfx || AU.ctx.state !== 'running' || vol <= 0.02) return;
  const c = AU.ctx, t = c.currentTime + 0.005, d = AU.sfxBus, V = vol;
  const gap = AU_MIN[name] || 0.03;
  if (t - (AU.last[name] || -9) < gap) return; AU.last[name] = t;
  switch (name) {
    case 'click': auTone(d, t, 1250, 0.05, { gain: 0.11 * V, type: 'triangle' }); break;
    case 'tick': auTone(d, t, 1700, 0.03, { gain: 0.06 * V }); break;
    case 'pop': auTone(d, t, 480, 0.11, { f2: 820, gain: 0.16 * V, type: 'triangle' }); break;
    case 'back': auTone(d, t, 700, 0.1, { f2: 420, gain: 0.12 * V, type: 'triangle' }); break;
    case 'notify': auTone(d, t, 880, 0.18, { gain: 0.1 * V }); auTone(d, t + 0.09, 1175, 0.28, { gain: 0.09 * V }); break;
    case 'error': auTone(d, t, 200, 0.16, { type: 'square', gain: 0.07 * V, lp: 700 }); auTone(d, t + 0.1, 150, 0.2, { type: 'square', gain: 0.07 * V, lp: 600 }); break;
    case 'coin': auTone(d, t, 988, 0.1, { gain: 0.14 * V, type: 'triangle' }); auTone(d, t + 0.07, 1319, 0.34, { gain: 0.14 * V, type: 'triangle' }); break;
    case 'good': [523, 659, 784, 1047].forEach((f, i) => auTone(d, t + i * 0.08, f, 0.34, { gain: 0.12 * V, type: 'triangle', send: AU.verb })); break;
    case 'fanfare':
      [[392, 0], [523, 0.14], [659, 0.28], [784, 0.42], [1047, 0.6]].forEach(([f, o]) => auTone(d, t + o, f, 0.7, { type: 'sawtooth', gain: 0.07 * V, lp: 2400, attack: 0.02, send: AU.verb }));
      auTone(d, t + 0.6, 523, 1.1, { type: 'triangle', gain: 0.1 * V, send: AU.verb }); break;
    case 'chop': auNoise(d, t, 0.07, { f: 1300, q: 1.2, gain: 0.33 * V }); auTone(d, t, 150, 0.1, { f2: 70, gain: 0.25 * V }); break;
    case 'chips': auNoise(d, t, 0.09, { f: 2200, q: 0.9, gain: 0.18 * V }); break;
    case 'build': auTone(d, t, 210, 0.07, { f2: 110, type: 'square', gain: 0.1 * V, lp: 1200 }); auNoise(d, t, 0.05, { f: 1800, gain: 0.15 * V }); auTone(d, t + 0.16, 230, 0.07, { f2: 120, type: 'square', gain: 0.1 * V, lp: 1200 }); break;
    case 'splash': auNoise(d, t, 0.26, { type: 'lowpass', f: 2600, f2: 380, q: 0.6, gain: 0.3 * V, attack: 0.02 }); break;
    case 'water': auNoise(d, t, 0.4, { type: 'bandpass', f: 800, f2: 2200, q: 0.9, gain: 0.14 * V, attack: 0.1 }); break;
    case 'plant': auTone(d, t, 330, 0.12, { f2: 660, gain: 0.1 * V, type: 'triangle' }); auNoise(d, t, 0.06, { f: 700, gain: 0.1 * V }); break;
    case 'dig': auNoise(d, t, 0.14, { type: 'lowpass', f: 900, q: 0.5, gain: 0.3 * V }); break;
    case 'cast': auNoise(d, t, 0.32, { type: 'bandpass', f: 500, f2: 3000, q: 1, gain: 0.2 * V, attack: 0.08 }); break;
    case 'bite': auTone(d, t, 1040, 0.09, { gain: 0.16 * V }); auTone(d, t + 0.1, 1040, 0.12, { gain: 0.16 * V }); break;
    case 'reel': auNoise(d, t, 0.16, { type: 'highpass', f: 3000, q: 0.7, gain: 0.1 * V }); break;
    case 'catch': [660, 880, 1320].forEach((f, i) => auTone(d, t + i * 0.07, f, 0.3, { gain: 0.13 * V, type: 'triangle', send: AU.verb })); break;
    case 'step': auNoise(d, t, 0.05, { type: 'lowpass', f: 520 + Math.random() * 160, q: 0.4, gain: 0.1 * V }); break;
    case 'door': auTone(d, t, 140, 0.18, { f2: 90, gain: 0.2 * V, type: 'triangle' }); auNoise(d, t, 0.1, { type: 'lowpass', f: 500, gain: 0.12 * V }); break;
    case 'bell': [880, 1760, 2349].forEach((f, i) => auTone(d, t, f, 1.6 - i * 0.3, { gain: (0.1 - i * 0.025) * V, send: AU.verb })); break;
    case 'heart': auTone(d, t, 784, 0.18, { gain: 0.07 * V, send: AU.verb }); auTone(d, t + 0.1, 988, 0.24, { gain: 0.06 * V, send: AU.verb }); break;
    case 'spark': auTone(d, t, 1800 + Math.random() * 900, 0.1, { f2: 900, gain: 0.05 * V }); break;
    case 'dust': auNoise(d, t, 0.18, { type: 'lowpass', f: 600, gain: 0.08 * V }); break;
    case 'debris': auNoise(d, t, 0.3, { type: 'lowpass', f: 1400, f2: 250, gain: 0.3 * V }); auTone(d, t, 90, 0.25, { f2: 45, gain: 0.25 * V }); break;
    case 'bolt': auNoise(d, t, 0.18, { type: 'highpass', f: 2500, gain: 0.35 * V }); auNoise(d, t + 0.1, 1.6, { type: 'lowpass', f: 380, f2: 70, q: 0.7, gain: 0.6 * V, attack: 0.05 }); break;
    case 'thunder': auNoise(d, t, 2.4, { type: 'lowpass', f: 260, f2: 55, q: 0.8, gain: 0.5 * V, attack: 0.25 }); break;
    case 'explode': auNoise(d, t, 1.3, { type: 'lowpass', f: 1800, f2: 80, q: 0.6, gain: 0.7 * V, attack: 0.01 }); auTone(d, t, 110, 0.9, { f2: 28, gain: 0.55 * V }); break;
    case 'meteor': auNoise(d, t, 1.1, { type: 'bandpass', f: 3500, f2: 300, q: 0.9, gain: 0.3 * V, attack: 0.4 }); break;
    case 'fire': auNoise(d, t, 0.25, { type: 'bandpass', f: 1500, q: 0.7, gain: 0.08 * V, attack: 0.06 }); break;
    case 'snap': auNoise(d, t, 0.05, { type: 'highpass', f: 1800, gain: 0.28 * V }); auTone(d, t, 900, 0.04, { type: 'square', gain: 0.05 * V }); break;   // fotoğraf makinesi
    case 'owl': auTone(d, t, 390, 0.4, { f2: 340, gain: 0.07 * V, attack: 0.08 }); auTone(d, t + 0.55, 390, 0.5, { f2: 330, gain: 0.07 * V, attack: 0.08 }); break;
    default: break;
  }
}

/* ------------------------------------------------------------ ortam sesleri */
function auBird(vol) {
  const c = AU.ctx, t = c.currentTime + 0.02, base = 2200 + Math.random() * 2200, n = 2 + ((Math.random() * 3) | 0), dir = Math.random() < 0.5 ? 1 : -1;
  for (let i = 0; i < n; i++) auTone(AU.ambBus, t + i * 0.11, base * (1 + 0.1 * i * dir), 0.09, { f2: base * (1.35 + 0.1 * i * dir), gain: 0.05 * vol, attack: 0.012 });
}
function auCricket(vol) {
  const c = AU.ctx, t = c.currentTime + 0.02, f = 4300 + Math.random() * 500;
  for (let i = 0; i < 3; i++) auTone(AU.ambBus, t + i * 0.055, f, 0.035, { gain: 0.022 * vol, attack: 0.004 });
}
function auAmbience(dt) {
  if (!AU.ready) return;
  AU.ambT -= dt; AU.birdT -= dt; AU.cricketT -= dt; AU.owlT -= dt;
  const s = AU.sc, c = AU.ctx, on = AU.on.amb && AU.ctx.state === 'running' && s.mode !== 'menu';
  const day = s.hour > 5.6 && s.hour < 19.6, season = s.season;
  if (AU.ambT <= 0) {
    AU.ambT = 0.35;
    const w = on ? 0.03 + 0.06 * s.wind + s.storm * 0.12 + s.snow * 0.04 : 0;
    auSet(AU.layer.wind, w, 300 + 700 * (s.wind + s.storm * 0.8));
    auSet(AU.layer.rain, on ? s.rain * (0.1 + s.storm * 0.12) : 0, 1300 + s.storm * 500);
    auSet(AU.layer.surf, on ? s.water * (0.1 + 0.05 * s.wind) : 0);
    auSet(AU.layer.snow, on ? s.snow * 0.05 : 0);
  }
  if (!on) return;
  const calm = (1 - s.rain) * (1 - s.snow) * (1 - s.storm);
  if (day && calm > 0.5 && AU.birdT <= 0) {
    const rate = [0.9, 0.55, 0.28, 0.04][season] || 0.2;   // saniyedeki kuş cıvıltısı sıklığı
    AU.birdT = (0.8 + Math.random() * 2.6) / rate; auBird(0.7 + Math.random() * 0.6);
  }
  if (!day && s.rain < 0.3 && AU.cricketT <= 0) {
    const rate = [0.45, 1, 0.5, 0][season] || 0;
    AU.cricketT = rate > 0 ? (0.25 + Math.random() * 0.5) / rate : 3; if (rate > 0) auCricket(0.8 + Math.random() * 0.4);
  }
  if (!day && season >= 2 && s.rain < 0.3 && AU.owlT <= 0) { AU.owlT = 14 + Math.random() * 24; auSfx('owl', 0.7); }
}

/* ------------------------------------------------------------ üretken müzik */
const AU_TEMPO = { menu: 64, sim: 70, detail: 78, cozy: 86 };
const AU_ROOT = { menu: 48, sim: 50, detail: 55, cozy: 53 };   // MIDI kök notaları
// Her mevsimin renk paleti: gam (pentatonik) ve dört akorluk döngü [kök, akor aralıkları]
const AU_PAL = [
  { scale: [0, 2, 4, 7, 9], prog: [[0, [0, 4, 7, 11]], [9, [0, 3, 7, 10]], [5, [0, 4, 7, 11]], [7, [0, 4, 7, 10]]] },     // ilkbahar: ışıklı
  { scale: [0, 2, 4, 7, 9], prog: [[0, [0, 4, 7, 9]], [5, [0, 4, 7, 11]], [7, [0, 4, 7, 10]], [5, [0, 4, 7, 11]]] },        // yaz: sıcak
  { scale: [0, 3, 5, 7, 10], prog: [[0, [0, 3, 7, 10]], [8, [0, 4, 7, 11]], [3, [0, 4, 7, 11]], [10, [0, 4, 7, 10]]] },     // sonbahar: hüzünlü
  { scale: [0, 2, 7, 9, 12], prog: [[0, [0, 7, 11, 14]], [2, [0, 7, 9, 14]], [5, [0, 4, 7, 11]], [0, [0, 7, 11, 14]]] },    // kış: ferah, seyrek
];
function auPluck(t, midi, dur, gain, bright) {
  const d = AU.musBus, f = AU_N(midi);
  auTone(d, t, f, dur, { type: 'triangle', gain: gain, attack: 0.006, lp: 1800 + bright * 2400, send: AU.musSend });
  if (bright > 0.4) auTone(d, t, f * 4, dur * 0.25, { gain: gain * 0.22, attack: 0.003, send: AU.musSend });
}
function auBell(t, midi, dur, gain) {
  const f = AU_N(midi + 12);
  auTone(AU.musBus, t, f, dur, { gain: gain, attack: 0.004, send: AU.musSend });
  auTone(AU.musBus, t, f * 2.76, dur * 0.4, { gain: gain * 0.25, attack: 0.003, send: AU.musSend });
}
function auPad(t, notes, dur, gain, lp) {
  const c = AU.ctx;
  for (const m of notes) {
    const os = c.createOscillator(), g = c.createGain(), f = c.createBiquadFilter();
    os.type = 'triangle'; os.frequency.value = AU_N(m) * (1 + (Math.random() - 0.5) * 0.004);
    f.type = 'lowpass'; f.frequency.value = lp;
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(gain, t + dur * 0.35); g.gain.linearRampToValueAtTime(0.0001, t + dur * 1.15);
    os.connect(f); f.connect(g); g.connect(AU.musBus); g.connect(AU.musSend);
    os.start(t); os.stop(t + dur * 1.2);
  }
}
function auMusic() {
  if (!AU.ready) return;
  const c = AU.ctx, s = AU.sc, want = AU.on.mus && c.state === 'running';
  AU.musBus.gain.setTargetAtTime(want ? 0.55 : 0, c.currentTime, 0.8);
  if (!want) { AU.mNext = 0; return; }
  const mode = s.mode in AU_TEMPO ? s.mode : 'sim', night = s.hour < 5.6 || s.hour >= 19.6;
  const wet = s.rain > 0.4 || s.snow > 0.4;
  const bpm = AU_TEMPO[mode] * (night ? 0.82 : 1) * (wet ? 0.9 : 1), eighth = 60 / bpm / 2;
  if (AU.mNext < c.currentTime) AU.mNext = c.currentTime + 0.1;
  while (AU.mNext < c.currentTime + 0.35) {
    const t = AU.mNext, step = AU.mStep, pal = AU_PAL[s.season] || AU_PAL[0], root = AU_ROOT[mode];
    const ch = pal.prog[AU.mBar % 4], chordRoot = root + ch[0];
    const bright = night || wet ? 0.1 : mode === 'cozy' ? 0.9 : 0.5;
    if (step === 0) {
      AU.mRest = Math.random() < (night ? 0.4 : 0.22);   // bazı ölçüler yalnızca pedle geçer: müzik nefes alır
      const voices = ch[1].slice(0, night ? 3 : 4).map((iv, i) => chordRoot + 12 + iv - (i === 0 ? 12 : 0));
      auPad(t, voices, eighth * 8, night ? 0.025 : 0.04, night ? 700 : 1100);
      if (mode !== 'menu') auTone(AU.musBus, t, AU_N(chordRoot - 12), eighth * 5, { gain: night ? 0.09 : 0.13, attack: 0.02, lp: 300 });
    }
    if (step === 4 && mode === 'cozy' && !night) auTone(AU.musBus, t, AU_N(chordRoot - 12 + 7), eighth * 3, { gain: 0.07, attack: 0.02, lp: 300 });
    // melodi: pentatonik gam üzerinde komşu notalara kayan rastgele yürüyüş
    const p = AU.mRest ? 0 : (night ? 0.2 : mode === 'cozy' ? 0.5 : 0.34) * (step % 2 === 0 ? 1.15 : 0.8) * (s.season === 3 ? 0.7 : 1);
    if (Math.random() < p) {
      const sc = pal.scale;
      AU.mPrev = Math.max(0, Math.min(sc.length * 2 - 1, AU.mPrev + ((Math.random() * 5) | 0) - 2));
      const m = root + 24 + sc[AU.mPrev % sc.length] + 12 * ((AU.mPrev / sc.length) | 0) - (night ? 12 : 0);
      const dur = eighth * (1.5 + Math.random() * 2.5), g = night ? 0.055 : 0.085;
      if (s.season === 3 || wet) auBell(t, m, dur * 1.6, g * 0.9); else auPluck(t, m, dur, g, bright);
    }
    AU.mNext += eighth; AU.mStep = (step + 1) % 8; if (AU.mStep === 0) AU.mBar++;
  }
}

/* ------------------------------------------------------------ dışarıya açılan kısım */
// Her karede çağrılır: sahne durumunu ve süreyi verir.
function auFrame(dt, sc) {
  if (!AU.ready) return;
  Object.assign(AU.sc, sc);
  auAmbience(dt);
  AU.busy += dt; if (AU.busy > 0.12) { AU.busy = 0; auMusic(); }
}
function auSetOpt(key, val) {
  if (key === 'vol') { AU.vol = val; if (AU.master) AU.master.gain.setTargetAtTime(val, AU.ctx.currentTime, 0.05); }
  else AU.on[key] = !!val;
  auSave();
}
// Hata ayıklama: çıkıştaki anlık ses düzeyi (0..1)
function auLevel() {
  if (!AU.an) return 0;
  const a = new Float32Array(AU.an.fftSize); AU.an.getFloatTimeDomainData(a);
  let s = 0; for (let i = 0; i < a.length; i++) s += a[i] * a[i];
  return Math.sqrt(s / a.length);
}
