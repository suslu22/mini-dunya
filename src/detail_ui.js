/* ===================================================================
   Detaylı Mod - arayüz: mod seçimi, kaynak çubuğu, insan/bina paneli,
   beceri ağacı, olay penceresi. detail_view.js'ten sonra eklenir.
   =================================================================== */
const D_ACTNAME = {
  sleep: 'Uyuyor', eat: 'Yemek yiyor', chop: 'Odun kesiyor', build: 'İnşaat yapıyor', herd: 'Hayvanlara bakıyor', fish: 'Balık tutuyor',
  craft: 'Üretimde çalışıyor', teach: 'Ders veriyor', study: 'Ders çalışıyor', talk: 'Sohbet ediyor', fun: 'Eğleniyor', play: 'Oynuyor',
  wash: 'Yıkanıyor', forage: 'Yemiş topluyor', wander: 'Geziyor',
};
const D_REST = [['wood', '🪵', 'Odun'], ['berry', '🫐', 'Yemiş'], ['wheat', '🌾', 'Buğday'], ['milk', '🥛', 'Süt'], ['egg', '🥚', 'Yumurta'], ['fish', '🐟', 'Balık'], ['goods', '📦', 'Eşya (dokun: sat)'], ['gold', '🪙', 'Altın']];
let dModalOpen = false;   // olay/ağaç/günlük penceresi açıkken zaman durur
const dLv = (x) => Math.min(10, Math.floor(Math.sqrt(x / 6)));
const dActText = (p) => {
  const a = p.act; if (!a) return p.sick ? 'Hasta, dinleniyor' : 'Boşta';
  let t = a.type === 'farm' ? (a.mode === 'sow' ? 'Tohum ekiyor' : 'Hasat yapıyor') : (D_ACTNAME[a.type] || 'Meşgul');
  if (a.phase === 'go') t = '🚶 Gidiyor: ' + t.toLowerCase();
  return t;
};
const dAgeTxt = (p) => (p.age < 2 ? 'Bebek' : p.age < D_ADULT ? 'Çocuk' : p.age > 58 ? 'Yaşlı' : 'Yetişkin');

/* ---------------------------------------------------------------- dock araçları */
const DETAIL_CATS = [{ n: 'Yapılar', i: '🏗️' }, { n: 'İnsan', i: '🧑' }, { n: 'Arazi', i: '🌍' }, { n: 'Doğa', i: '🌿' }, { n: 'Felaket', i: '💥' }];
const pickT = (ids, c) => TOOLS.filter((t) => ids.includes(t.id)).map((t) => Object.assign({}, t, { c }));
const DETAIL_TOOLS = [
  ...Object.keys(D_BUILD).map((k) => ({ id: 'd:' + k, i: D_BUILD[k].i, n: D_BUILD[k].n, c: 0, bld: k })),
  { id: 'd:dem', i: '🧹', n: 'Yık', c: 0 },
  { id: 'd:pm', i: '👨', n: 'Erkek', c: 1 }, { id: 'd:pf', i: '👩', n: 'Kadın', c: 1 },
  { id: 'd:pbm', i: '👦', n: 'Oğlan', c: 1 }, { id: 'd:pbf', i: '👧', n: 'Kız', c: 1 },
  ...pickT(['up', 'down', 'flat', 'grass', 'sand'], 2),
  ...pickT(['forest', 'clear', 'rain', 'time'], 3),
  ...pickT(['bolt', 'meteor', 'fire', 'lava'], 4),
];
const curCats = () => (gameMode === 'detail' ? DETAIL_CATS : CATS);
const curTools = () => (gameMode === 'detail' ? DETAIL_TOOLS : TOOLS);
const dBuildTool = () => gameMode === 'detail' && typeof tool === 'string' && tool.startsWith('d:') && !!D_BUILD[tool.slice(2)];
function dToolBadge(t) {
  if (!t.bld) return '';
  const B = D_BUILD[t.bld];
  if (B.tech && !colony.has(B.tech)) return '<small>🔒 beceri</small>';
  return '<small>' + B.wood + '🪵' + (B.gold ? ' ' + B.gold + '🪙' : '') + '</small>';
}
function dToolClick(t) {
  if (t.bld) {
    const B = D_BUILD[t.bld];
    if (B.tech && !colony.has(B.tech)) { toast('🔒 ' + B.n + ' için beceri ağacından "' + (D_TECH.find((x) => x.id === B.tech) || {}).n + '" aç'); return true; }
    toast(B.n + ': ' + B.d + ' (' + B.wood + ' odun) — haritaya dokun');
  }
  return false;
}

/* ---------------------------------------------------------------- kaynak çubuğu */
const dbarEl = $('dbar'), dpplEl = $('dppl'), dpanelEl = $('dpanel'), dbpanelEl = $('dbpanel');
dbarEl.innerHTML = D_REST.map(([k, i, n]) => '<span class="rc" data-k="' + k + '" title="' + n + '">' + i + ' <b>0</b></span>').join('') +
  '<span class="rc mood" id="dMood" title="Köyün mutluluğu">🙂 <b>70</b></span>' +
  '<button class="rc star" id="dStar" title="Beceri ağacı">⭐ <b>2</b><i><u id="dXp"></u></i></button>' +
  '<button class="rc" id="dLogB" title="Olay günlüğü">📜</button>';
const dRes = {}; dbarEl.querySelectorAll('[data-k]').forEach((e) => { dRes[e.dataset.k] = e; });
dbarEl.onclick = (e) => {
  const t = e.target.closest('[data-k]');
  if (t && t.dataset.k === 'goods') {
    const g = colony.sell('goods', colony.res.goods);
    toast(g > 0 ? '📦 Eşyalar satıldı: +' + g.toFixed(1) + ' 🪙' : 'Satılacak eşya yok (Atölye/Fabrika üretir)');
  } else if (t && t.dataset.k === 'wood') {
    const g = colony.sell('wood', Math.floor(colony.res.wood / 2));
    if (g > 0) toast('🪵 Yarım odun satıldı: +' + g.toFixed(1) + ' 🪙');
  }
};
function detailHud() {
  $('pop').textContent = '👥 ' + colony.people.length;
  $('houses').textContent = '🏠 ' + colony.buildings.filter((b) => b.type === 'house' && b.prog >= 1).length;
  for (const [k] of D_REST) {
    const el = dRes[k], v = colony.res[k], shown = v >= 0.5 || k === 'wood' || k === 'berry' || k === 'gold' || el.dataset.seen;
    if (v >= 0.5) el.dataset.seen = 1;
    el.style.display = shown ? '' : 'none';
    el.firstElementChild.textContent = k === 'gold' ? v.toFixed(1) : String(Math.floor(v));
    el.classList.toggle('low', (k === 'berry' || k === 'wood') && v < 3);
  }
  const m = Math.round(colony.mood);
  $('dMood').innerHTML = dFace(m, false) + ' <b>' + m + '</b>';
  $('dStar').firstElementChild.textContent = colony.pts;
  $('dStar').title = 'Beceri ağacı · Seviye ' + colony.lvl;
  $('dXp').style.width = Math.min(100, colony.xp / (12 + 8 * colony.lvl) * 100) + '%';
  $('dStar').classList.toggle('pulse', colony.pts > 0 && Object.values(D_TECH).some((t) => colony.canUnlock(t.id)));
  renderPeopleChips();
  if (dSel) updatePanel();
  if (dSelB) updateBPanel();
}
let chipSig = '';
function renderPeopleChips() {
  const sig = colony.people.map((p) => p.id + p.name + dFace(p.mood, p.sick) + (dSel === p ? '*' : '')).join('|');
  if (sig === chipSig) return;
  chipSig = sig;
  dpplEl.innerHTML = colony.people.map((p) => '<button class="chip' + (dSel === p ? ' sel' : '') + '" data-id="' + p.id + '">' + dFace(p.mood, p.sick) + ' ' + p.name.replace(/</g, '&lt;') + '</button>').join('') +
    '<button class="chip add" data-add="1" title="İnsan yarat">＋</button>';
  dpplEl.style.display = '';
}
dpplEl.onclick = (e) => {
  const c = e.target.closest('button'); if (!c) return;
  if (c.dataset.add) { cat = 1; tool = 'd:pm'; buildDock(); toast('Haritaya dokunarak yeni insan yarat'); return; }
  const p = colony.getPerson(+c.dataset.id); if (p) { dSelect(p); cam.tx = p.x; cam.tz = p.z; cam.ddist = Math.min(cam.ddist, 24); chipSig = ''; }
};

/* ---------------------------------------------------------------- insan paneli */
const esc = (s) => String(s).replace(/[<>&"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[c]));
let dPanelP = null, delAsk = 0;
function showPersonPanel(p) {
  dPanelP = p; delAsk = 0;
  if (!p) { dpanelEl.hidden = true; chipSig = ''; return; }
  dpanelEl.hidden = false; dbpanelEl.hidden = true;
  dpanelEl.innerHTML =
    '<div class="ph"><input id="pName" maxlength="14" spellcheck="false" title="İsmi değiştir"><button id="pFollow" title="Kamera takip etsin">🎥</button><button id="pClose">✕</button></div>' +
    '<div class="psub" id="pSub"></div>' +
    '<div class="pmood"><span id="pFace"></span><div class="bar"><i id="pMoodBar"></i></div><b id="pMoodN"></b></div>' +
    '<div class="pact" id="pAct"></div><div class="pth" id="pTh"></div>' +
    '<h5>İhtiyaçlar</h5>' + D_NEEDS.map((n) => '<div class="nr"><span>' + n.i + ' ' + n.n + '</span><div class="bar"><i data-n="' + n.id + '"></i></div></div>').join('') +
    '<h5>İstatistikler <small>(+ / − ile düzenle)</small></h5>' + D_STATS.map((s) => '<div class="sr"><span>' + s.i + ' ' + s.n + '</span><button data-s="' + s.id + '" data-d="-1">−</button><div class="bar sb"><i data-sv="' + s.id + '"></i></div><button data-s="' + s.id + '" data-d="1">＋</button><b data-sn="' + s.id + '"></b></div>').join('') +
    '<h5>Meslek</h5><div class="jobs" id="pJobs">' + D_JOBS.map((j) => '<button data-j="' + j.id + '">' + j.i + ' ' + j.n + '</button>').join('') + '</div>' +
    '<h5>Yetenekler <small id="pEdu"></small></h5>' + D_SKILLS.map((s) => '<div class="nr"><span>' + s.i + ' ' + s.n + ' <em data-kl="' + s.id + '"></em></span><div class="bar"><i data-k="' + s.id + '"></i></div></div>').join('') +
    '<h5>İlişkiler</h5><div id="pRel" class="prel"></div>' +
    '<div class="pbtn"><button id="pLook">🎨 Görünüm</button><button id="pDel">Köyden çıkar</button></div>';
  dpanelEl.querySelector('#pName').value = p.name;
  updatePanel(true);
}
dpanelEl.addEventListener('input', (e) => {
  if (e.target.id === 'pName' && dPanelP) { dPanelP.name = e.target.value.slice(0, 14); chipSig = ''; }
});
dpanelEl.addEventListener('click', (e) => {
  const p = dPanelP; if (!p) return;
  const b = e.target.closest('button'); if (!b) return;
  if (b.id === 'pClose') dSelect(null);
  else if (b.id === 'pFollow') { dFollow = !dFollow; b.classList.toggle('on', dFollow); toast(dFollow ? 'Kamera ' + p.name + ' kişisini takip ediyor' : 'Takip kapandı'); }
  else if (b.dataset.s) { p.stats[b.dataset.s] = Math.max(1, Math.min(10, p.stats[b.dataset.s] + (+b.dataset.d))); p.life = Math.max(p.life, 55 + p.stats.sta * 3); updatePanel(); }
  else if (b.dataset.j) { if (p.age < D_ADULT) toast('Çocuklar önce büyümeli, okula gitsin'); else { p.job = b.dataset.j; if (p.act && p.act.phase === 'go') colony._abort(p); updatePanel(); } }
  else if (b.id === 'pLook') {
    p.skin = (Math.random() * 5) | 0; p.hair = (Math.random() * 6) | 0; p.shirt = (Math.random() * 8) | 0; p.style = (Math.random() * 3) | 0;
    const v = dViews.get(p.id); if (v) { dRoot.remove(v.root); dViews.delete(p.id); }
  } else if (b.id === 'pDel') {
    if (delAsk) { colony._die(p); colony.queue.pop(); colony.log.shift(); dSelect(null); }
    else { delAsk = 1; b.textContent = 'Emin misin?'; b.classList.add('ask'); setTimeout(() => { delAsk = 0; if (b.isConnected) { b.textContent = 'Köyden çıkar'; b.classList.remove('ask'); } }, 2500); }
  }
});
function updatePanel(force) {
  const p = dPanelP; if (!p || dpanelEl.hidden) return;
  const q = (s) => dpanelEl.querySelector(s);
  const nm = q('#pName'); if (document.activeElement !== nm && nm.value !== p.name) nm.value = p.name;
  q('#pSub').textContent = (p.female ? '♀ Kadın' : '♂ Erkek') + ' · ' + Math.floor(p.age) + ' yaş · ' + dAgeTxt(p) + (p.partner >= 0 ? ' · 💞 ' + ((colony.getPerson(p.partner) || {}).name || '') : '');
  q('#pFace').textContent = dFace(p.mood, p.sick);
  const m = Math.round(p.mood);
  const mb = q('#pMoodBar'); mb.style.width = m + '%'; mb.style.background = m > 66 ? '#7fe0b0' : m > 38 ? '#f2c14e' : '#ef6a5a';
  q('#pMoodN').textContent = m;
  q('#pAct').textContent = '▸ ' + dActText(p);
  const th = p.thoughts.slice().sort((a, b) => Math.abs(b.v) - Math.abs(a.v)).slice(0, 6);
  q('#pTh').innerHTML = th.length ? th.map((t) => '<span class="' + (t.v >= 0 ? 'pos' : 'neg') + '">' + (t.v >= 0 ? '+' : '') + Math.round(t.v) + ' ' + esc(t.txt) + '</span>').join('') : '<span>Sakin…</span>';
  for (const n of D_NEEDS) {
    const el = q('[data-n="' + n.id + '"]'), v = p.need[n.id];
    el.style.width = v + '%'; el.style.background = v > 55 ? '#7fe0b0' : v > 25 ? '#f2c14e' : '#ef6a5a';
  }
  for (const s of D_STATS) { q('[data-sv="' + s.id + '"]').style.width = p.stats[s.id] * 10 + '%'; q('[data-sn="' + s.id + '"]').textContent = p.stats[s.id]; }
  dpanelEl.querySelectorAll('[data-j]').forEach((b) => b.classList.toggle('on', b.dataset.j === p.job));
  for (const s of D_SKILLS) {
    const lv = dLv(p.skill[s.id]), nxt = (lv + 1) * (lv + 1) * 6, cur = lv * lv * 6;
    q('[data-kl="' + s.id + '"]').textContent = 'Sv ' + lv;
    q('[data-k="' + s.id + '"]').style.width = lv >= 10 ? '100%' : Math.min(100, (p.skill[s.id] - cur) / (nxt - cur) * 100) + '%';
  }
  q('#pEdu').textContent = '· 🎓 Eğitim %' + Math.floor(p.edu);
  const rels = Object.keys(p.rel).map((id) => [colony.getPerson(+id), p.rel[id]]).filter(([o, r]) => o && (r.f > 12 || r.f < -12 || r.l > 12)).sort((a, b) => Math.abs(b[1].f) - Math.abs(a[1].f)).slice(0, 4);
  q('#pRel').innerHTML = rels.length ? rels.map(([o, r]) => '<span class="' + (r.f >= 0 ? 'pos' : 'neg') + '">' + (r.l > 25 ? '💗 ' : r.f >= 0 ? '🙂 ' : '😠 ') + esc(o.name) + '</span>').join('') : '<span>Henüz yakın bağı yok.</span>';
}

/* ---------------------------------------------------------------- bina paneli */
let dBP = null, bdelAsk = 0;
function showBuildPanel(b) {
  dBP = b; bdelAsk = 0;
  if (!b) { dbpanelEl.hidden = true; return; }
  dpanelEl.hidden = true; dbpanelEl.hidden = false;
  const B = D_BUILD[b.type];
  dbpanelEl.innerHTML = '<div class="ph"><b class="bt">' + B.i + ' ' + B.n + '</b><button id="bClose">✕</button></div><div class="psub">' + B.d + '</div><div id="bInfo" class="binfo"></div><div class="pbtn"><button id="bDem">🧹 Yık (%40 odun iade)</button></div>';
  updateBPanel();
}
dbpanelEl.addEventListener('click', (e) => {
  const b = e.target.closest('button'); if (!b || !dBP) return;
  if (b.id === 'bClose') dSelectB(null);
  else if (b.id === 'bDem') {
    if (bdelAsk) { colony.removeBuilding(dBP.id); dSelectB(null); }
    else { bdelAsk = 1; b.textContent = 'Emin misin?'; b.classList.add('ask'); setTimeout(() => { bdelAsk = 0; if (b.isConnected) { b.textContent = '🧹 Yık (%40 odun iade)'; b.classList.remove('ask'); } }, 2500); }
  }
});
function updateBPanel() {
  const b = dBP; if (!b || dbpanelEl.hidden) return;
  const L = [];
  if (b.prog < 1) L.push('🔨 İnşaat: %' + Math.floor(b.prog * 100));
  else if (b.type === 'house') { const r = colony.people.filter((p) => p.home === b.id); L.push('Sakinler (' + r.length + '/' + colony.houseCap() + '): ' + (r.map((p) => esc(p.name)).join(', ') || 'boş')); }
  else if (b.type === 'field') L.push(b.stage === 0 ? 'Ekilmeyi bekliyor' : b.stage === 1 ? '🌱 Büyüyor: %' + Math.floor((1 - b.timer / Math.max(1, b.total || 40)) * 100) : '🌾 Hasada hazır!');
  else if (b.type === 'pen') L.push((b.kind === 'chicken' ? '🐔 Tavuk' : b.kind === 'sheep' ? '🐑 Koyun' : '🐄 İnek') + ': ' + b.animals + ' hayvan', 'Ürün birikimi: ' + b.prod.toFixed(1));
  else if (b.type === 'dock') L.push(colony.has('balik3') ? '⛵ Tekneyle avlanılır' : '🎣 Oltayla avlanılır');
  else if (b.type === 'school') L.push('Çocuklar burada eğitilir. Öğretmen: ' + (colony.people.filter((p) => p.act && p.act.type === 'teach').map((p) => esc(p.name)).join(', ') || 'yok'));
  else if (b.type === 'workshop' || b.type === 'factory') L.push('Odun → 📦 Eşya üretir' + (b.type === 'factory' && colony.has('sanayi3') ? ' · otomasyon açık' : ''));
  else if (b.type === 'fire') L.push('Akşamları insanlar burada toplanır.');
  else if (b.type === 'well') L.push('Temizlik için su.');
  dbpanelEl.querySelector('#bInfo').innerHTML = L.map((t) => '<div>' + t + '</div>').join('');
}

/* ---------------------------------------------------------------- beceri ağacı */
const treeEl = $('tree'), NW = 92, NH = 74, GX = 30, GY = 30, PADX = 22, PADY = 34;
let treeSel = null;
function treePos(t) {
  const x = PADX + t.col * (NW + GX);
  const y = t.col === 0 ? PADY + (D_BRANCHES.length - 1) * (NH + GY) / 2 : PADY + t.row * (NH + GY);
  return { x, y };
}
function renderTree() {
  const W = PADX * 2 + 5 * NW + 4 * GX, H = PADY * 2 + D_BRANCHES.length * NH + (D_BRANCHES.length - 1) * GY;
  let svg = '<svg width="' + W + '" height="' + H + '">', nodes = '', labels = '';
  for (const t of D_TECH) {
    const p = treePos(t);
    for (const r of t.req) {
      const q = D_TECH.find((x) => x.id === r), a = treePos(q);
      const x1 = a.x + NW, y1 = a.y + NH / 2, x2 = p.x, y2 = p.y + NH / 2, mx = (x1 + x2) / 2;
      const done = colony.tech[t.id], open = colony.tech[r];
      svg += '<path d="M' + x1 + ' ' + y1 + ' C' + mx + ' ' + y1 + ' ' + mx + ' ' + y2 + ' ' + x2 + ' ' + y2 + '" fill="none" stroke="' + (done ? D_BRANCHES[t.row].c : open ? 'rgba(255,255,255,.45)' : 'rgba(255,255,255,.15)') + '" stroke-width="' + (done ? 4 : 3) + '" ' + (open ? '' : 'stroke-dasharray="5 5"') + '/>';
    }
    const br = D_BRANCHES[t.row], got = colony.tech[t.id], can = colony.canUnlock(t.id), reqOk = t.req.every((r) => colony.tech[r]);
    nodes += '<button class="tn ' + (got ? 'got' : can ? 'can' : reqOk ? 'cost' : 'lock') + (treeSel === t.id ? ' sel' : '') + '" data-t="' + t.id + '" style="left:' + p.x + 'px;top:' + p.y + 'px;--bc:' + br.c + '"><span>' + (got || reqOk ? t.i : '🔒') + '</span><b>' + t.n + '</b>' + (got ? '<i>✓</i>' : '<i>⭐ ' + t.cost + '</i>') + '</button>';
  }
  D_BRANCHES.forEach((br, r) => { labels += '<div class="tl" style="left:' + (PADX + NW + GX) + 'px;top:' + (PADY + r * (NH + GY) - 20) + 'px;color:' + br.c + '">' + br.n + '</div>'; });
  svg += '</svg>';
  treeEl.querySelector('#treeCanvas').style.cssText = 'width:' + W + 'px;height:' + H + 'px';
  treeEl.querySelector('#treeCanvas').innerHTML = svg + labels + nodes;
  treeEl.querySelector('#treePts').textContent = colony.pts;
  treeEl.querySelector('#treeLv').textContent = 'Seviye ' + colony.lvl;
  const t = D_TECH.find((x) => x.id === treeSel), info = treeEl.querySelector('#treeInfo');
  if (!t) { info.innerHTML = '<span>Bir beceriye dokun. İnsanlar çalıştıkça deneyim kazanır, her seviye ⭐ +1 puan verir.</span>'; return; }
  const got = colony.tech[t.id], can = colony.canUnlock(t.id), miss = t.req.filter((r) => !colony.tech[r]).map((r) => D_TECH.find((x) => x.id === r).n);
  info.innerHTML = '<div><b>' + t.i + ' ' + t.n + '</b> <small>· ' + D_BRANCHES[t.row].n + '</small><br><span>' + t.d + '</span></div>' +
    (got ? '<em>Açıldı ✓</em>' : can ? '<button id="treeBuy">⭐ ' + t.cost + ' puanla aç</button>' : '<em>' + (miss.length ? 'Önce: ' + miss.join(', ') : 'Yetersiz puan (⭐ ' + t.cost + ')') + '</em>');
}
function openTree() { treeEl.hidden = false; dModalOpen = true; renderTree(); }
function closeTree() { treeEl.hidden = true; dModalOpen = !!dCurEv; maybeEvent(); }
treeEl.addEventListener('click', (e) => {
  if (e.target.id === 'treeClose' || e.target === treeEl) { closeTree(); return; }
  const n = e.target.closest('[data-t]');
  if (n) { treeSel = n.dataset.t; renderTree(); return; }
  if (e.target.id === 'treeBuy' && treeSel) {
    if (colony.unlock(treeSel)) {
      const t = D_TECH.find((x) => x.id === treeSel);
      const unl = Object.keys(D_BUILD).filter((k) => D_BUILD[k].tech === t.id).map((k) => D_BUILD[k].n);
      toast('⭐ ' + t.n + ' açıldı' + (unl.length ? ' — yeni yapı: ' + unl.join(', ') : ''));
      buildDock(); renderTree(); detailHud();
    }
  }
});
$('dStar').onclick = openTree;

/* ---------------------------------------------------------------- olay penceresi */
const evEl = $('evm'), evBox = evEl.firstElementChild;
let dCurEv = null, dEvDone = false;
function maybeEvent() {
  if (gameMode !== 'detail' || inMenu || dCurEv || !treeEl.hidden || !$('dlog').hidden) return;
  if (!colony.queue.length) { dModalOpen = false; return; }
  dCurEv = colony.queue.shift(); dEvDone = false; dModalOpen = true;
  const ev = dCurEv;
  const faces = (ev.ids || []).map((id) => colony.getPerson(id)).filter(Boolean).map((p) =>
    '<div class="evp"><div class="evf" style="background:' + D_SHIRTS[p.shirt % 8] + '">' + dFace(p.mood, p.sick) + '</div><small>' + esc(p.name) + '</small></div>').join('');
  evBox.innerHTML = '<div class="evt">' + esc(ev.title) + '</div>' + (faces ? '<div class="evpp">' + faces + '</div>' : '') +
    '<div class="evx">' + esc(ev.text) + '</div>' +
    (ev.input !== undefined ? '<input id="evIn" maxlength="14" value="' + esc(ev.input) + '" spellcheck="false">' : '') +
    '<div class="evc">' + ev.choices.map((c, i) => '<button data-i="' + i + '">' + esc(c.t) + '</button>').join('') + '</div>';
  evEl.hidden = false;
}
evEl.addEventListener('click', (e) => {
  const b = e.target.closest('button'); if (!b || !dCurEv) return;
  if (b.id === 'evOk') { evEl.hidden = true; dCurEv = null; dModalOpen = false; chipSig = ''; buildDock(); maybeEvent(); return; }
  if (b.dataset.i === undefined || dEvDone) return;
  dEvDone = true;
  const inp = $('evIn'), res = colony.answer(dCurEv, +b.dataset.i, inp ? inp.value : undefined);
  colony.addLog((dCurEv.title || '') + ' → ' + res);
  evBox.querySelector('.evc').innerHTML = '';
  if (inp) inp.remove();
  evBox.querySelector('.evx').innerHTML += '<div class="evr">' + esc(res || 'Karar verildi.') + '</div>';
  evBox.querySelector('.evc').innerHTML = '<button id="evOk" class="ok">Devam</button>';
  chipSig = '';
});

/* ---------------------------------------------------------------- günlük */
const logEl = $('dlog');
$('dLogB').onclick = () => {
  $('dlogList').innerHTML = colony.log.length ? colony.log.map((l) => '<div>' + esc(l.t) + '</div>').join('') : '<div>Henüz bir şey olmadı.</div>';
  logEl.hidden = false; dModalOpen = true;
};
logEl.addEventListener('click', (e) => { if (e.target.id === 'logClose' || e.target === logEl) { logEl.hidden = true; dModalOpen = !!dCurEv || !treeEl.hidden; maybeEvent(); } });
colony.onLevel = (l) => { toast('⭐ Köy seviye ' + l + ' oldu! +1 beceri puanı'); };

/* ---------------------------------------------------------------- mod seçimi & geçiş */
let selMode = 'sim';
function syncModeCards() {
  selMode = gameMode;
  document.querySelectorAll('.mode').forEach((b) => b.classList.toggle('on', b.dataset.m === selMode));
}
document.querySelectorAll('.mode').forEach((b) => { b.onclick = () => { selMode = b.dataset.m; document.querySelectorAll('.mode').forEach((x) => x.classList.toggle('on', x === b)); }; });
function dResetViews() {
  for (const v of dViews.values()) dRoot.remove(v.root);
  for (const v of dBViews.values()) dRoot.remove(v.g);
  dViews.clear(); dBViews.clear();
  for (const l of dLabels.values()) l.remove();
  dLabels.clear();
  dSel = null; dSelB = null; dFollow = false; dRing.visible = false; chipSig = '';
  dpanelEl.hidden = true; dbpanelEl.hidden = true;
  dCurEv = null; evEl.hidden = true; treeEl.hidden = true; logEl.hidden = true; dModalOpen = false;
}
function enterMode(m, fresh) {
  const was = gameMode;
  gameMode = m;
  document.body.classList.toggle('dmode', m === 'detail');
  document.body.classList.toggle('cmode', m === 'cozy');
  dRoot.visible = m === 'detail';
  cRoot.visible = m === 'cozy';
  dResetViews();
  if (was === 'cozy' && m !== 'cozy') cozyLeave();
  tool = 'hand'; cat = 0; buildDock();
  if (fresh) newWorld();
  syncModeCards();
}
$('mPlay').onclick = () => {
  if (selMode !== gameMode) { enterMode(selMode, true); startGame(); } else startGame(gameMode === 'detail');
};
$('mNew').onclick = () => {
  if (selMode !== gameMode) enterMode(selMode, true); else newWorld();
  startGame();
};
function detailNewWorld() {
  dResetViews();
  const s = colony.start((Math.random() * 1e6) | 0);
  cam.tx = s.x; cam.tz = s.z; cam.x = s.x; cam.z = s.z; cam.ddist = 26;
  syncPeopleViews(); dSelect(colony.people[0]);
  chipSig = ''; treeSel = null;
  detailHud();
}
function detailLoad(data) {
  dResetViews();
  if (!colony.fromJSON(data)) return false;
  syncPeopleViews(); chipSig = ''; treeSel = null;
  detailHud();
  return true;
}
