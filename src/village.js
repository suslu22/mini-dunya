/* ---------------------------------------------------------------- Simülasyon modu: köy günlüğü, köy kartları, canlı akış */
// Köylerin tarihi (kuruluş, tarla, çağ atlama, savaş, felaket, mevsim) sim.js'te `world.log` içinde tutulur.
// Burası onu iki şekilde gösterir: ekranın solunda kısa süre görünen canlı akış ve 📜 ile açılan günlük + köy kartları.
const vlogEl = $('vlog'), vfeedEl = $('vfeed'), vcardsEl = $('vcards'), vfltEl = $('vflt'), vlistEl = $('vlist');
const TRIBE_HEX = ['#e8453c', '#3b82f6', '#f2b01e', '#a463f2', '#27c4b0', '#f15bb5', '#8ac926', '#ff8c42'];
let vFilter = -2, vSig = '';   // -2: hepsi, -1: genel, ≥0: tek köy
const vCol = (t) => (t >= 0 ? TRIBE_HEX[t % TRIBE_HEX.length] : '#9fb0dc');
const vTime = (e) => {
  const hh = e.tod * 24, hr = Math.floor(hh), mn = Math.floor((hh - hr) * 60);
  return 'Gün ' + e.day + ' · ' + String(hr).padStart(2, '0') + ':' + String(mn).padStart(2, '0');
};
const vHTML = (e) => (e.who ? '<b>' + esc(e.who) + '</b> ' : '') + e.ico + ' ' + esc(e.msg);
const vIsEra = (e) => /geçti/.test(e.msg);

// Dünya genelindeki haber (örn. mevsim değişti); yalnızca Simülasyon modunda günlüğe yazılır.
function worldNote(ico, text) { if (gameMode === 'sim' && !inMenu) world.logGlobal(ico, text); }

function villageNote(e, merged) {
  if (gameMode !== 'sim' || inMenu) return;
  let el = merged ? vfeedEl.querySelector('[data-id="' + e.id + '"]') : null;
  if (el) { el.style.animation = 'none'; void el.offsetWidth; el.style.animation = ''; }
  else {
    el = document.createElement('div');
    el.dataset.id = e.id;
    el.addEventListener('animationend', (ev) => { if (ev.animationName === 'vfout') el.remove(); });
    vfeedEl.appendChild(el);
    while (vfeedEl.children.length > 5) vfeedEl.firstChild.remove();
  }
  el.className = 'vf' + (vIsEra(e) ? ' big' : '');
  el.style.setProperty('--tc', vCol(e.tribe));
  el.innerHTML = vHTML(e);
}
world.onNote = villageNote;

function villageReset() { vfeedEl.innerHTML = ''; vFilter = -2; vSig = ''; vlogEl.hidden = true; }

function vCard(t) {
  const e = ERAS[t.era], nx = ERAS[t.era + 1], need = world.eraNeeds(t);
  const pct = nx ? Math.max(0, Math.min(100, Math.round(((t.kn - e.kn) / (nx.kn - e.kn)) * 100))) : 100;
  const meet = (n) => (n.v >= n.need ? '✓' : Math.min(n.v, n.need) + '/' + n.need);
  return '<div class="vc' + (vFilter === t.id ? ' sel' : '') + '" data-t="' + t.id + '" style="--tc:' + vCol(t.id) + '">' +
    '<button class="vgo" data-go="' + t.id + '" title="Köye git">📍</button>' +
    '<b>' + tribeTitle(t) + '</b><span>' + e.i + ' ' + e.n + '</span>' +
    '<small>👥 ' + t.pop + ' · 🏠 ' + t.houses + ' · 🌾 ' + t.farms + (t.fact ? ' · 🏭 ' + t.fact : '') + ' · 🧺 ' + Math.floor(t.food) + '</small>' +
    '<div class="vbar"><i style="width:' + pct + '%"></i></div>' +
    '<small>' + (need ? 'Sonraki: ' + ERAS[t.era + 1].n + ' — ' + need.map((n) => n.k + ' ' + meet(n)).join(' · ') : 'En üst çağa ulaştı 🎉') + '</small></div>';
}
function vlogRender(force) {
  const ts = world.tribes.filter((t) => t.pop > 0 || t.houses > 0 || t.farms > 0);
  vcardsEl.innerHTML = ts.length ? ts.map(vCard).join('') : '<small style="color:#b9c6ea">Henüz köy yok. Araçlardan bir köy ya da insan yerleştir.</small>';
  const last = world.log[world.log.length - 1];
  const sig = vFilter + ':' + world.logId + ':' + (last ? last.n : 0);
  if (!force && sig === vSig) return;
  vSig = sig;
  vfltEl.innerHTML = '<button data-f="-2" class="' + (vFilter === -2 ? 'on' : '') + '">Tümü</button>' +
    (vFilter >= 0 ? '<button class="on" style="background:' + vCol(vFilter) + ';color:#10151f">' + tribeTitle(world.tribes[vFilter]) + ' ✕</button>' : '<small style="align-self:center;color:#8fa0cc">Bir köy kartına dokunarak yalnızca onun günlüğünü gör.</small>');
  const top = vlistEl.scrollTop;
  const rows = [];
  for (let i = world.log.length - 1; i >= 0 && rows.length < 150; i--) {
    const e = world.log[i];
    if (vFilter >= 0 && e.tribe !== vFilter && e.tribe !== -1) continue;
    rows.push('<div class="vl' + (vIsEra(e) ? ' era' : '') + '"><span class="vt">' + vTime(e) + '</span>' +
      (e.who ? '<b style="color:' + vCol(e.tribe) + '">' + esc(e.who) + '</b> ' : '') + e.ico + ' ' + esc(e.msg) + '</div>');
  }
  vlistEl.innerHTML = rows.length ? rows.join('') : '<div class="vl">Henüz kayda değer bir şey olmadı.</div>';
  vlistEl.scrollTop = top;
}
function vlogToggle(open) {
  if (gameMode !== 'sim' || inMenu) return;
  vlogEl.hidden = open === undefined ? !vlogEl.hidden : !open;
  if (!vlogEl.hidden) { vlogRender(true); auSfx('click', 0.6); }
}
$('bVlog').onclick = () => vlogToggle();
$('vlogClose').onclick = () => vlogToggle(false);
vlogEl.addEventListener('click', (e) => { if (e.target === vlogEl) vlogToggle(false); });
vcardsEl.addEventListener('click', (e) => {
  const go = e.target.closest('[data-go]');
  if (go) {
    const t = world.tribes[+go.dataset.go];
    if (t) { cam.tx = t.cx; cam.tz = t.cz; cam.ddist = Math.min(cam.ddist, 40); vlogToggle(false); }
    return;
  }
  const c = e.target.closest('[data-t]');
  if (c) { const id = +c.dataset.t; vFilter = vFilter === id ? -2 : id; vlogRender(true); }
});
vfltEl.addEventListener('click', (e) => { if (e.target.closest('button')) { vFilter = -2; vlogRender(true); } });
addEventListener('keydown', (e) => {
  if (e.target && /INPUT|TEXTAREA/.test(e.target.tagName)) return;
  if (e.key === 'Escape' && !vlogEl.hidden) vlogToggle(false);
  else if ((e.key === 'j' || e.key === 'J') && gameMode === 'sim' && !inMenu) vlogToggle();
});
setInterval(() => {
  if (vlogEl.hidden) return;
  if (gameMode !== 'sim' || inMenu) vlogEl.hidden = true; else vlogRender(false);
}, 1000);
