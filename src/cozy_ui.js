/* ===================================================================
   Ada Modu - arayüz: HUD, kısayol çubuğu, çanta, dükkân, yapım tezgâhı, rehber, ev,
   ada panosu, köylü sohbeti ve karakter oluşturma.
   Build sırasında cozy_view.js'den sonra main.js içine eklenir.
   =================================================================== */
const czEl = $('czm'), czBox = czEl.firstElementChild;
const czBar = $('czbar'), czPromptEl = $('czprompt'), czActEl = $('czact'), czStatsEl = $('czstats');
let czKind = '', czData = null, czSel = '', czSleeping = false, czFirstRun = false, czBarSig = '', czStatSig = '';
const czTab = { shop: 'buy', cat: 'fish' };
const czFmt = (n) => Math.round(n).toLocaleString('tr-TR');
const CZ_CAM_ICON = { tp: '🎥', fp: '👁️', iso: '🔭' };
const CZ_KIND_ICON = {
  talk: '💬', shop: '🏪', home: '🏠', craft: '🔨', board: '📋', place: '📥', pull: '🤲', pickflower: '🤲', pickfurn: '🤲', pickitem: '🤲',
  shake: '🌳', chop: '🪓', swing: '🪓', hit: '⛏️', fossil: '🦴', fill: '⛏️', uproot: '⛏️', dig: '⛏️', cast: '🎣', reel: '🎣', net: '🥅', water: '💧', wave: '👋',
};
const CZ_HAIRS = ['#3a2415'].concat(D_HAIRS, ['#e8d28a', '#cfcfd6', '#c24a2b', '#7a4bd0', '#2fa7b5']);
const CZ_SHIRTS = D_SHIRTS.concat(['#ffffff', '#222a38']);
const CZ_PANTS = D_PANTS.concat(['#2f4f7a', '#6b4a2e', '#1f2024', '#c9c4b5']);
const CZ_SELL = {
  fish: (it) => it.cat === 'fish', bug: (it) => it.cat === 'bug', fos: (it) => it.cat === 'fos', flw: (it) => it.flower !== undefined,
  mat: (it) => ['wood', 'stone', 'clay', 'iron', 'weed', 'shell', 'oyster'].includes(it.id),
};
const czRank = (it) => (it.cat === 'fish' ? 3 : it.cat === 'bug' ? 4 : it.cat === 'fos' ? 5 : it.furn ? 6 : it.eat ? 1 : it.plant !== undefined || it.sap ? 2 : it.flower !== undefined ? 2.5 : 0);
const czBagIds = () => Object.keys(cozy.bag).filter((id) => Z_ITEMS[id]).sort((a, b) => czRank(Z_ITEMS[a]) - czRank(Z_ITEMS[b]) || Z_ITEMS[a].n.localeCompare(Z_ITEMS[b].n, 'tr'));

DEC.blocked = (cx, cz) => gameMode === 'cozy' && cozy.obj.has(cz * N + cx);   // eşyaların altında çim çıkmasın

/* ---------------------------------------------------------------- ipuçları (tooltip metinleri) */
const CZ_TOOL_TIPS = {
  hand: 'Gezin, ağaç salla, çiçek ve ot topla, yerdeki eşyaları al, köylülerle ve panoyla konuş.',
  axe: 'Ağaçlara vurup odun toplarsın. Meyve için ağacı Eller ile sallamak yeter.',
  shovel: 'Çukur kazar, fosil arar, kaya kırar; çiçek, fidan ve kütüğü kökünden söker.',
  rod: 'Suya yaklaşıp oltayı at; balık yem yutunca ÇEK! yazısı çıkar, tekrar bas.',
  net: 'Yakındaki böceği yakalamak için ağı salla. Kelebeklere sessizce yaklaş.',
  can: 'Ektiğin çiçek ve fidanları sular; suladığın bitki daha çabuk büyür.',
};
const CZ_USE = (it) => it.eat ? 'Yiyebilirsin.' : it.plant !== undefined ? 'Eline alıp toprağa ekersin; suladıkça büyür.' : it.sap ? 'Eline alıp toprağa dikersin; suladıkça ağaca dönüşür.' :
  it.furn ? 'Eline alıp adaya yerleştirebilirsin.' : it.flower !== undefined ? 'Köylülere hediye edebilir ya da satabilirsin.' :
  it.cat ? 'Dükkânda sat ya da bir köylüye hediye et.' : 'Yapım Tezgâhı\'nda malzeme olarak kullanılır; dükkânda satılır.';
const CZ_KIND = (it) => it.cat === 'fish' ? 'Balık' : it.cat === 'bug' ? 'Böcek' : it.cat === 'fos' ? 'Fosil' : it.furn ? 'Mobilya' : it.eat ? 'Yiyecek' :
  it.plant !== undefined ? 'Çiçek tohumu' : it.sap ? 'Fidan' : it.flower !== undefined ? 'Çiçek' : 'Malzeme';
// eşya ipucu: "Başlık|Açıklama" (özellik değeri olarak güvenle kullanılsın diye kaçışlı)
const czItemTip = (id) => {
  const it = Z_ITEMS[id], n = cozy.count(id);
  return esc(it.i + ' ' + it.n + (n ? ' ×' + n : '') + '|' + CZ_KIND(it) + ' · satış ' + czFmt(it.sell) + ' 🔔' + (it.buy ? ' · mağaza ' + czFmt(it.buy) + ' 🔔' : '') + '\n' + CZ_USE(it));
};
const czTip = (title, desc, key) => ' data-tip="' + esc(title + '|' + (desc || '') + (key ? '|' + key : '')) + '"';

/* ---------------------------------------------------------------- HUD */
function czBuildBar() {
  const p = cozy.p;
  let h = '';
  Z_TOOLS.forEach((t, i) => { h += '<button class="czt' + (p.tool === i && !p.held ? ' on' : '') + '" data-i="' + i + '"' + czTip(t.i + ' ' + t.n, CZ_TOOL_TIPS[t.id], String(i + 1)) + '><span>' + t.i + '</span><i>' + (i + 1) + '</i></button>'; });
  if (p.held) { const it = Z_ITEMS[p.held]; h += '<button class="czt on held" data-h="1"' + czTip(it.i + ' ' + it.n + ' ×' + cozy.count(p.held), 'Elinde tutuyorsun. Tıklarsan bırakırsın; imleç hedefi gösterirken Boşluk / E ile kullanırsın.', '0') + '><span>' + it.i + '</span><b>' + cozy.count(p.held) + '</b></button>'; }
  czBar.innerHTML = h;
  czBarSig = p.tool + '|' + p.held + '|' + (p.held ? cozy.count(p.held) : 0);
}
czBar.addEventListener('click', (e) => {
  const b = e.target.closest('button'); if (!b || czBlocked()) return;
  if (b.dataset.h) cozy.p.held = null; else cozy.selectTool(+b.dataset.i);
  czSyncUI();
});
function czSyncUI() {
  czBuildBar();
  $('czCamB').textContent = CZ_CAM_ICON[cv.mode];
  $('czCamB').dataset.tip = 'Kamera: ' + CAM_NAMES[cv.mode] + '|Kamera modunu değiştirir: üçüncü şahıs, birinci şahıs, izometrik.|C';
}
function czHud() {
  const p = cozy.p, sig = p.tool + '|' + p.held + '|' + (p.held ? cozy.count(p.held) : 0);
  if (sig !== czBarSig) czBuildBar();
  const hh = tod * 24, hr = Math.floor(hh), mn = Math.floor((hh - hr) * 60), night = hh < 5.8 || hh >= 19.5;
  const html = '<span' + czTip('Zil', 'Adanın para birimi. Balık, böcek ve fosil satarak kazanırsın.') + '>🔔 ' + czFmt(cozy.zil) + '</span>' +
    '<span' + czTip('Ada puanı: ' + cozy.stars + ' yıldız', 'Ağaç, çiçek, eşya, temizlik ve sakinlerle yükselir. Ayrıntı için Ada Panosu\'na bak.') + '>' + '⭐'.repeat(cozy.stars) + '</span>' +
    '<span' + czTip('Saat', 'Dükkân ' + String(Z_SHOP_OPEN[0]).padStart(2, '0') + ':00–' + Z_SHOP_OPEN[1] + ':00 arası açık. Gece böcekler ve balıklar değişir.') + '>' + (night ? '🌙 ' : '☀️ ') +
    String(hr).padStart(2, '0') + ':' + String(mn).padStart(2, '0') + '</span><span' + czTip('Gün ' + cozy.day, 'Evde uyuyunca yeni güne geçilir; bitkiler büyür, dükkân yenilenir.') + '>Gün ' + cozy.day + '</span>' +
    '<span' + czTip(SEASONS[CL.season].n + ' · ' + WEATHERS[CL.weather].n + ' · ' + Math.round(CL.temp) + '°C', 'Mevsim her 3 günde bir değişir. Yağmur ektiğin bitkileri kendiliğinden sular; kışın kar yağar.') + '>' + SEASONS[CL.season].i + WEATHERS[CL.weather].i + ' ' + Math.round(CL.temp) + '°</span>' +
    '<span' + czTip('Çanta', 'Taşıdığın farklı eşya türü sayısı (en fazla ' + Z_BAG_MAX + '). Çantayı açmak için B tuşuna bas.', 'B') + '>🎒 ' + Object.keys(cozy.bag).length + '/' + Z_BAG_MAX + '</span>';
  if (html !== czStatSig) { czStatSig = html; czStatsEl.innerHTML = html; }
}
function czPromptSet(txt, kind) {
  czPromptEl.textContent = txt; czPromptEl.classList.toggle('on', !!txt);
  czActEl.classList.toggle('dim', !txt);
  czActEl.textContent = txt ? (CZ_KIND_ICON[kind] || '✋') : '✋';
}
function czPress() {
  if (czBlocked() || !cozy) return;
  const t = cozy.press();
  if (!t) return;
  if (t.kind === 'talk') czTalk(t.v);
  else if (t.kind === 'shop') { if (cozy.shopOpen()) czOpen('shop'); else toast('🏪 Dükkân kapalı — 07:00–22:00 arası açık'); }
  else if (t.kind === 'home') czOpen('home');
  else if (t.kind === 'craft') czOpen('craft');
  else if (t.kind === 'board') czOpen('board');
}
czActEl.addEventListener('pointerdown', (e) => { e.preventDefault(); czPress(); });
$('czCamB').onclick = () => cozyCycleMode();
$('czRotL').onclick = () => cozyRotate(1);
$('czRotR').onclick = () => cozyRotate(-1);
$('czBagB').onclick = () => czOpen('bag');
$('czCatB').onclick = () => czOpen('cat');
$('czhud').addEventListener('pointerup', (e) => { const b = e.target.closest('button'); if (b) setTimeout(() => b.blur(), 0); });

// sanal joystick (dokunmatik)
const czJoy = $('czjoy'), czKnob = czJoy.firstElementChild;
let czJoyId = null;
function czJoyMove(e) {
  const r = czJoy.getBoundingClientRect(), R = r.width / 2, lim = R * 0.78;
  let dx = e.clientX - (r.left + R), dy = e.clientY - (r.top + R);
  const m = Math.hypot(dx, dy);
  if (m > lim) { dx = dx / m * lim; dy = dy / m * lim; }
  czKnob.style.transform = 'translate(' + dx.toFixed(1) + 'px,' + dy.toFixed(1) + 'px)';
  cv.joy.x = dx / lim; cv.joy.y = dy / lim;
}
function czJoyEnd(e) {
  if (e.pointerId !== czJoyId) return;
  czJoyId = null; cv.joy.x = cv.joy.y = 0; czKnob.style.transform = '';
}
czJoy.addEventListener('pointerdown', (e) => { czJoyId = e.pointerId; try { czJoy.setPointerCapture(e.pointerId); } catch (_) { /* yoksay */ } czJoyMove(e); e.preventDefault(); });
czJoy.addEventListener('pointermove', (e) => { if (e.pointerId === czJoyId) czJoyMove(e); });
czJoy.addEventListener('pointerup', czJoyEnd);
czJoy.addEventListener('pointercancel', czJoyEnd);

/* ---------------------------------------------------------------- pencere çerçevesi */
function czOpen(kind, data) {
  if (kind === czKind && !czEl.hidden) { czCloseAll(); return; }
  if (czSleeping) return;
  if (czKind === 'talk' && czData) cozy.endTalk(czData.v);
  czKind = kind; czData = data || null; czEl.hidden = false; czModalOpen = true;
  czEl.classList.toggle('side', kind === 'create');
  try { if (document.pointerLockElement) document.exitPointerLock(); } catch (_) { /* yoksay */ }
  cozy.setMove(0, 0, false); cv.joy.x = cv.joy.y = 0; czJoyId = null; czKnob.style.transform = '';
  if (kind === 'create') { cv.preview = true; cozy.p.ang = 0; czFace(0); }
  czRender();
  czBox.scrollTop = 0;
}
function czFace(ang) {   // önizleme kamerası karakterin önüne geçsin (en kısa yoldan)
  let d = ang - cv.yaw; d = Math.atan2(Math.sin(d), Math.cos(d)); cv.dyaw = cv.yaw + d;
}
function czCloseAll() {
  if (czKind === 'talk' || czKind === 'gift') { if (czData) cozy.endTalk(czData.v); }
  if (czKind === 'create') { cv.preview = false; czSaveLook(); cv.dyaw = cv.yaw = cozy.p.ang + Math.PI; czSyncUI(); }
  czKind = ''; czData = null; czEl.hidden = true; czModalOpen = false;
}
function czRefresh() { if (czKind && czKind !== 'create') czRender(); }
czEl.addEventListener('click', (e) => { if (e.target === czEl && czKind !== 'create') czCloseAll(); });
function czRender() {
  const st = czBox.scrollTop;
  const f = { bag: czRBag, shop: czRShop, craft: czRCraft, cat: czRCat, home: czRHome, board: czRBoard, talk: czRTalk, gift: czRGift, create: czRCreate }[czKind];
  if (f) f();
  czBox.scrollTop = st;
}
const czHead = (title, right) => '<div class="czh"><b>' + title + '</b><span>' + (right || '') + '</span><button class="czx" data-a="close"' + czTip('Kapat', 'Pencereyi kapatır.', 'Esc') + '>✕</button></div>';
const czMoney = () => '🔔 ' + czFmt(cozy.zil);

/* ---------------------------------------------------------------- çanta */
function czRBag() {
  const ids = czBagIds();
  if (!Z_ITEMS[czSel] || !cozy.count(czSel)) czSel = ids[0] || '';
  let h = czHead('🎒 Çanta', czMoney() + ' · ' + ids.length + '/' + Z_BAG_MAX);
  if (!ids.length) h += '<div class="czemp">Çantan boş. Ağaç salla, balık tut, böcek yakala, kürekle kaz!</div>';
  else {
    h += '<div class="czgrid">' + ids.map((id) => '<button class="czi' + (id === czSel ? ' sel' : '') + '" data-a="sel" data-id="' + id + '" data-tip="' + czItemTip(id) + '"><span>' + Z_ITEMS[id].i + '</span><b>' + cozy.count(id) + '</b></button>').join('') + '</div>';
    const it = Z_ITEMS[czSel];
    if (it) {
      h += '<div class="czinfo"><div class="czit">' + it.i + ' ' + esc(it.n) + ' <small>×' + cozy.count(czSel) + '</small></div><div class="czsub">Satış değeri: ' + czFmt(it.sell) + ' 🔔' + (it.buy ? ' · Mağaza fiyatı: ' + czFmt(it.buy) + ' 🔔' : '') + '</div><div class="czbt">';
      const hold = czTip('Eline al', 'Eşya elinde durur; hedefe bakıp Boşluk / E ile kullanırsın. Bırakmak için 0 tuşuna bas.');
      if (it.eat) h += '<button data-a="eat" data-id="' + czSel + '"' + czTip('Ye', 'Yiyeceği hemen yersin.') + '>😋 Ye</button>';
      else if (it.plant !== undefined) h += '<button data-a="hold" data-id="' + czSel + '"' + hold + '>🌱 Eline al · ek</button>';
      else if (it.sap) h += '<button data-a="hold" data-id="' + czSel + '"' + hold + '>🌳 Eline al · dik</button>';
      else if (it.furn) h += '<button data-a="hold" data-id="' + czSel + '"' + hold + '>📥 Eline al · yerleştir</button>';
      else h += '<span class="czsub">Dükkânda satabilirsin.</span>';
      h += '</div></div>';
    }
  }
  czBox.innerHTML = h;
}

/* ---------------------------------------------------------------- dükkân */
function czRShop() {
  const tab = czTab.shop, L = cozy.shopList();
  let h = czHead('🏪 Tomris\'in Dükkânı', czMoney());
  h += '<div class="czseg"><button class="' + (tab === 'buy' ? 'on' : '') + '" data-a="tab" data-t="buy"' + czTip('Satın al', 'Tohum, fidan ve bugünün mobilyalarını zil karşılığında alırsın.') + '>Satın al</button><button class="' + (tab === 'sell' ? 'on' : '') + '" data-a="tab" data-t="sell"' + czTip('Sat', 'Çantandaki eşyaları zile çevirirsin.') + '>Sat</button></div>';
  if (tab === 'buy') {
    const sec = (title, ids) => '<h5>' + title + '</h5>' + ids.map((id) => {
      const it = Z_ITEMS[id];
      return '<div class="czrow" data-tip="' + czItemTip(id) + '"><span class="ci">' + it.i + '</span><span class="cn">' + esc(it.n) + '</span><span class="cp">' + czFmt(it.buy) + ' 🔔</span><button data-a="buy" data-id="' + id + '"' + (cozy.zil < it.buy ? ' disabled' : '') +
        czTip('Satın al', cozy.zil < it.buy ? 'Yeterli zilin yok (' + czFmt(it.buy) + ' 🔔 gerekli).' : czFmt(it.buy) + ' 🔔 ödeyip çantana eklersin.') + '>Al</button></div>';
    }).join('');
    h += sec('Tohumlar', L.seeds) + sec('Fidanlar', L.saps) + sec('Bugünün eşyaları', L.furn);
  } else {
    const ids = czBagIds();
    h += '<div class="czquick">' + [['fish', '🐟 Balıklar', 'tüm balıkları'], ['bug', '🦋 Böcekler', 'tüm böcekleri'], ['fos', '🦴 Fosiller', 'tüm fosilleri'], ['flw', '🌷 Çiçekler', 'tüm çiçekleri'], ['mat', '🪵 Malzemeler', 'odun, taş, kil, demir, ot ve kabukları']]
      .map(([c, t, d]) => '<button data-a="sellcat" data-c="' + c + '"' + czTip('Sat: ' + t.replace(/^\S+\s/, ''), 'Çantandaki ' + d + ' tek seferde satar.') + '>' + t + '</button>').join('') + '</div>';
    if (!ids.length) h += '<div class="czemp">Satacak bir şeyin yok.</div>';
    h += ids.map((id) => {
      const it = Z_ITEMS[id], n = cozy.count(id);
      return '<div class="czrow" data-tip="' + czItemTip(id) + '"><span class="ci">' + it.i + '</span><span class="cn">' + esc(it.n) + ' <small>×' + n + '</small></span><span class="cp">' + czFmt(it.sell) + ' 🔔</span><button data-a="sell" data-id="' + id + '" data-n="1"' + czTip('Bir tane sat', '+' + czFmt(it.sell) + ' 🔔 kazanırsın.') + '>1</button>' +
        (n > 1 ? '<button data-a="sell" data-id="' + id + '" data-n="all"' + czTip('Hepsini sat', n + ' adet için +' + czFmt(it.sell * n) + ' 🔔 kazanırsın.') + '>Hepsi</button>' : '') + '</div>';
    }).join('');
  }
  czBox.innerHTML = h;
}

/* ---------------------------------------------------------------- yapım tezgâhı */
function czRCraft() {
  let h = czHead('🔨 Yapım Tezgâhı', '🎒 ' + Object.keys(cozy.bag).length + '/' + Z_BAG_MAX);
  h += '<div class="czsub" style="margin:2px 2px 8px">Topladığın malzemelerle kendi eşyalarını yap.</div>';
  h += Z_RECIPES.map((r, i) => {
    const it = Z_ITEMS[r.out], ok = cozy.canCraft(r);
    const need = Object.keys(r.need).map((k) => '<span class="' + (cozy.count(k) >= r.need[k] ? 'ok' : 'no') + '">' + Z_ITEMS[k].i + ' ' + cozy.count(k) + '/' + r.need[k] + '</span>').join('');
    const needTxt = Object.keys(r.need).map((k) => r.need[k] + ' ' + Z_ITEMS[k].n).join(', ');
    return '<div class="czrow rc2"' + czTip(it.i + ' ' + it.n + (r.n ? ' ×' + r.n : ''), 'Gerekenler: ' + needTxt + '. ' + CZ_USE(it)) + '><span class="ci">' + it.i + '</span><span class="cn">' + esc(it.n) + (r.n ? ' <small>×' + r.n + '</small>' : '') + '<div class="cneed">' + need + '</div></div><button data-a="craft" data-i="' + i + '"' + (ok ? '' : ' disabled') +
      czTip('Yap', ok ? 'Malzemeleri harcayıp ' + it.n.toLowerCase() + ' üretir.' : 'Malzemelerin yetmiyor: ' + needTxt + ' gerekli.') + '>Yap</button></div>';
  }).join('');
  czBox.innerHTML = h;
}

/* ---------------------------------------------------------------- rehber */
function czRCat() {
  const tab = czTab.cat, src = tab === 'fish' ? Z_FISH : tab === 'bug' ? Z_BUGS : Z_FOSSILS, book = cozy.seen[tab];
  const key = (e, k) => (tab === 'fos' ? k : e.id);
  const got = src.filter((e, k) => book[key(e, k)]).length;
  let h = czHead('📖 Rehber', got + '/' + src.length);
  h += '<div class="czseg">' + [['fish', '🐟 Balık', 'Oltayla tuttuğun balıklar.'], ['bug', '🦋 Böcek', 'Ağla yakaladığın böcekler.'], ['fos', '🦴 Fosil', 'Kürekle kazıp çıkardığın fosiller.']]
    .map(([t, n, d]) => '<button class="' + (tab === t ? 'on' : '') + '" data-a="tab" data-t="' + t + '"' + czTip(n.replace(/^\S+\s/, '') + ' rehberi', d) + '>' + n + '</button>').join('') + '</div>';
  h += '<div class="czcards">' + src.map((e, k) => {
    const n = book[key(e, k)] || 0;
    const hrs = e.h ? String(e.h[0]).padStart(2, '0') + ':00–' + String(e.h[1]).padStart(2, '0') + ':00' : 'her zaman';
    const how = tab === 'fish' ? 'Oltanı suya atarak yakala.' : tab === 'bug' ? 'Böcek ağıyla yakala.' : 'Küreğinle adada kazarak bul.';
    return n ? '<div class="czcard"' + czTip(e.i + ' ' + e.n, n + ' kez buldun · değeri ' + czFmt(e.sell) + ' 🔔' + (e.h ? ' · en çok ' + hrs + ' arası' : '') + '.') + '><span>' + e.i + '</span><b>' + esc(e.n) + '</b><small>×' + n + ' · ' + czFmt(e.sell) + ' 🔔</small>' + (e.h ? '<small>' + hrs + '</small>' : '') + '</div>'
      : '<div class="czcard off"' + czTip('Henüz bulunmadı', how + (e.h ? ' Aktif saatler: ' + hrs + '.' : '')) + '><span>❓</span><b>???</b><small>' + (e.h ? hrs : 'kazarak bul') + '</small></div>';
  }).join('') + '</div>';
  czBox.innerHTML = h;
}

/* ---------------------------------------------------------------- ev & pano */
function czRHome() {
  const hh = cozy.hour;
  czBox.innerHTML = czHead('🏠 Evin', 'Gün ' + cozy.day) +
    '<div class="czsub" style="margin:4px 2px 10px">' + (hh >= 19 || hh < 6 ? 'Gün batmış, yatma vakti.' : 'Küçük ama sıcacık bir ev.') + '</div>' +
    '<div class="czbig"><button data-a="sleep"' + czTip('Uyu', 'Yeni güne geçer: bitkiler büyür, dükkân yenilenir, tamamlanan köylü istekleri tazelenir.') + '>🛏️ Uyu — yeni güne geç</button><button data-a="look"' + czTip('Görünüm', 'Adını, saçını, kıyafetini ve renklerini değiştirirsin.') + '>👕 Görünümünü değiştir</button><button data-a="save"' + czTip('Kaydet', 'Kayıtlar penceresini açar: yuvaya kaydet, yükle ya da dosyaya aktar.') + '>💾 Kaydet</button></div>';
}
function czRBoard() {
  const r = cozy.rating(), P = r.parts, V = cozy.vill.length;
  const bar = (ico, name, v, txt, tip) => '<div class="czbar"' + czTip(ico + ' ' + name, tip) + '><span>' + ico + ' ' + name + '</span><div><i style="width:' + Math.round(Math.max(0, Math.min(1, v)) * 100) + '%"></i></div><small>' + txt + '</small></div>';
  const S = cozy.stats, nxt = [32, 52, 72, 90].find((t) => t > r.score);
  let h = czHead('📋 Ada Panosu', czMoney());
  h += '<div class="czstars">' + '⭐'.repeat(r.stars) + '<span>' + '☆'.repeat(5 - r.stars) + '</span></div><div class="czsub" style="text-align:center">Ada puanı: ' + r.score + '/100' + (nxt ? ' · sonraki yıldız: ' + nxt : ' · harika bir ada!') + '</div>';
  h += bar('🌳', 'Ağaçlar', P.trees / 140, P.trees + '/140', 'Adadaki ağaç sayısı. Fidan dikip suladıkça artar; 140 ağaç puanı doldurur.') +
    bar('🌷', 'Çiçekler', P.flowers / 30, P.flowers + '/30', 'Ektiğin çiçekler. Tohum al, ek ve sula; 30 çiçek puanı doldurur.') +
    bar('🪑', 'Eşyalar', P.furn / 14, P.furn + '/14', 'Adaya yerleştirdiğin mobilyalar. 14 eşya puanı doldurur.') +
    bar('🌿', 'Temizlik', 1 - P.weeds / 70, P.weeds + ' yabani ot', 'Ne kadar az yabani ot, o kadar yüksek puan. Otları yolup temiz tut.') +
    bar('🏠', 'Sakinler', V / 5, V + '/5', 'Adaya taşınan köylüler. Yıldız arttıkça yeni sakinler gelir.');
  h += '<div class="czsub" style="margin:10px 2px 4px">⭐⭐⭐ yıldızda Berkin, ⭐⭐⭐⭐⭐ yıldızda Selin adaya taşınır.</div>';
  h += '<div class="czstat"><span' + czTip('Yakalanan balık', 'Şimdiye kadar tuttuğun balık sayısı.') + '>🐟 ' + S.fish + '</span><span' + czTip('Yakalanan böcek', 'Şimdiye kadar yakaladığın böcek sayısı.') + '>🦋 ' + S.bugs + '</span><span' + czTip('Bulunan fosil', 'Kazıp çıkardığın fosil sayısı.') + '>🦴 ' + S.fos +
    '</span><span' + czTip('Ekilen bitki', 'Şimdiye kadar ektiğin tohum ve fidan sayısı.') + '>🌱 ' + S.planted + '</span><span' + czTip('Kesilen ağaç', 'Baltayla kestiğin ağaç sayısı.') + '>🌳 ' + S.trees + '</span><span' + czTip('Toplam kazanç', 'Satış ve isteklerden kazandığın toplam zil.') + '>💰 ' + czFmt(S.earned) + '</span></div>';
  czBox.innerHTML = h;
}

/* ---------------------------------------------------------------- köylü sohbeti */
function czTalk(v) {
  cozy.p.ang = Math.atan2(v.x - cozy.p.x, v.z - cozy.p.z);
  czOpen('talk', { v, line: cozy.talk(v) });
}
function czRTalk() {
  const v = czData.v, q = v.quest, lv = Math.min(4, Math.floor(v.friend / 25));
  let h = czHead('💬 ' + esc(v.name), esc(v.pers) + ' · ' + '💗'.repeat(lv) + '🤍'.repeat(4 - lv));
  h += '<div class="czsay">' + esc(czData.line) + '</div>';
  if (q) {
    const it = Z_ITEMS[q.id];
    h += '<div class="czquest' + (q.done ? ' done' : '') + '"><b>' + (q.done ? '✅ İstek tamamlandı' : '❗ İstek') + '</b><div>' + it.i + ' ' + esc(it.n) + ' × ' + q.n + ' <small>(sende ' + cozy.count(q.id) + ')</small></div><small>Ödül: ' + czFmt(q.reward) + ' 🔔</small></div>';
  }
  h += '<div class="czbig">' + (q && !q.done ? '<button data-a="quest"' + czTip('İsteği ver', 'İstenen eşyaları verip ' + czFmt(q.reward) + ' 🔔 ödülü alırsın.') + '>📦 İsteği ver</button>' : '') +
    '<button data-a="giftmenu"' + czTip('Hediye ver', v.gifted ? 'Bugün zaten hediye verdin; yarın tekrar dene.' : 'Çantandan bir eşya hediye et. Sevdiği şey arkadaşlığı çok artırır.') + '>🎁 Hediye ver' + (v.gifted ? ' <small>(bugün verildi)</small>' : '') + '</button><button data-a="close"' + czTip('Güle güle', 'Sohbeti bitirir.', 'Esc') + '>👋 Güle güle</button></div>';
  czBox.innerHTML = h;
}
function czRGift() {
  const v = czData.v, ids = czBagIds().filter((id) => !Z_ITEMS[id].furn || true);
  const favs = { flower: '🌷 çiçekleri', fish: '🐟 balıkları', fruit: '🍎 meyveleri', bug: '🦋 böcekleri', fos: '🦴 fosilleri' };
  let h = czHead('🎁 ' + esc(v.name) + ' için hediye', '');
  h += '<div class="czsub" style="margin:2px 2px 8px">' + esc(v.name) + ' en çok ' + favs[v.fav] + ' sever. Günde bir hediye verebilirsin.</div>';
  h += ids.length ? '<div class="czgrid">' + ids.map((id) => '<button class="czi" data-a="gift" data-id="' + id + '" data-tip="' + czItemTip(id) + '"><span>' + Z_ITEMS[id].i + '</span><b>' + cozy.count(id) + '</b></button>').join('') + '</div>' : '<div class="czemp">Çantan boş.</div>';
  h += '<div class="czbig"><button data-a="back"' + czTip('Geri', 'Hediye vermeden sohbete dönersin.') + '>← Geri</button></div>';
  czBox.innerHTML = h;
}

/* ---------------------------------------------------------------- karakter oluşturma */
function czSaveLook() {
  try { localStorage.setItem('minidunya.cozyplayer', JSON.stringify({ name: cozy.name, look: cozy.look })); czFirstRun = false; } catch (_) { /* yoksay */ }
}
function czRCreate() {
  const L = cozy.look;
  const sw = (k, list) => '<div class="czsws">' + list.map((c) => '<button class="czsw' + (L[k] === c ? ' on' : '') + '" data-a="cc" data-k="' + k + '" data-v="' + c + '" style="background:' + c + '"></button>').join('') + '</div>';
  const opt = (k, list, extra) => '<div class="czopts">' + list.map((n, i) => (extra && extra(i) ? '' : '<button class="czo' + (L[k] === i ? ' on' : '') + '" data-a="cc" data-k="' + k + '" data-v="' + i + '">' + n + '</button>')).join('') + '</div>';
  let h = czHead(czFirstRun ? '👤 Karakterini oluştur' : '👕 Görünümün', '');
  h += '<h5>İsim</h5><input id="czName" maxlength="14" value="' + esc(cozy.name) + '" spellcheck="false" autocomplete="off">';
  h += '<h5>Cinsiyet</h5><div class="czopts"><button class="czo' + (L.female ? ' on' : '') + '" data-a="cc" data-k="female" data-v="1">Kadın</button><button class="czo' + (!L.female ? ' on' : '') + '" data-a="cc" data-k="female" data-v="0">Erkek</button></div>';
  h += '<h5>Ten</h5>' + sw('skin', D_SKINS);
  h += '<h5>Saç stili</h5>' + opt('hs', D_HAIR_STYLES) + '<h5>Saç rengi</h5>' + sw('hair', CZ_HAIRS);
  h += '<h5>Kıyafet</h5>' + opt('outfit', D_OUTFITS) + '<h5>Üst rengi</h5>' + sw('shirt', CZ_SHIRTS) + '<h5>Alt rengi</h5>' + sw('pants', CZ_PANTS);
  h += '<h5>Şapka</h5>' + opt('hat', D_HATS) + (L.hat ? '<h5>Şapka rengi</h5>' + sw('hatCol', CZ_SHIRTS) : '');
  h += '<h5>Ayakkabı</h5>' + sw('shoe', D_SHOES) + '<h5>Göz rengi</h5>' + sw('eye', D_EYES);
  h += '<div class="czbig two"><button data-a="rand">🎲 Rastgele</button><button data-a="done" class="go">✔ Tamam</button></div>';
  czBox.innerHTML = h;
  const inp = $('czName');
  inp.oninput = () => { cozy.name = inp.value.trim().slice(0, 14) || 'Ada Sakini'; };
}
function czRandomLook() {
  const pick = (a) => a[(Math.random() * a.length) | 0], fem = Math.random() < 0.5;
  Object.assign(cozy.look, {
    female: fem, skin: pick(D_SKINS), hair: pick(CZ_HAIRS), hs: (Math.random() * D_HAIR_STYLES.length) | 0, outfit: fem ? (Math.random() * 4) | 0 : pick([0, 1, 3]),
    shirt: pick(CZ_SHIRTS), pants: pick(CZ_PANTS), hat: Math.random() < 0.6 ? 0 : 1 + ((Math.random() * 3) | 0), hatCol: pick(CZ_SHIRTS), shoe: pick(D_SHOES), eye: pick(D_EYES),
  });
}

/* ---------------------------------------------------------------- tıklamalar */
czBox.addEventListener('click', (e) => {
  const b = e.target.closest('[data-a]'); if (!b || b.disabled) return;
  const a = b.dataset.a, d = b.dataset;
  switch (a) {
    case 'close': case 'done': czCloseAll(); break;
    case 'tab': czTab[czKind] = d.t; czRender(); break;
    case 'sel': czSel = d.id; czRender(); break;
    case 'hold': if (cozy.hold(d.id)) { czCloseAll(); czSyncUI(); toast('Eline aldın: ' + Z_ITEMS[d.id].i + ' ' + Z_ITEMS[d.id].n); } break;
    case 'eat': cozy.hold(d.id); czRender(); break;
    case 'buy': { const r = cozy.buy(d.id); toast(r.msg); czRender(); break; }
    case 'sell': { const g = cozy.sell(d.id, d.n === 'all' ? 9999 : 1); if (g) toast('+' + czFmt(g) + ' 🔔'); czRender(); break; }
    case 'sellcat': { const g = cozy.sellAll(CZ_SELL[d.c]); toast(g ? 'Satıldı: +' + czFmt(g) + ' 🔔' : 'Satacak bir şey yok'); czRender(); break; }
    case 'craft': { const r = cozy.craft(+d.i); toast(r.msg); czRender(); break; }
    case 'sleep': {
      czCloseAll(); czSleeping = true; const f = $('czfade'); f.classList.add('on');
      setTimeout(() => cozy.sleep(), 700);
      setTimeout(() => { f.classList.remove('on'); czSleeping = false; }, 1500);
      break;
    }
    case 'look': czOpen('create'); break;
    case 'save': czCloseAll(); openSaves(); break;
    case 'quest': { const r = cozy.claimQuest(czData.v); czData.line = r.msg; czRender(); break; }
    case 'giftmenu': czKind = 'gift'; czRender(); break;
    case 'gift': { const r = cozy.gift(czData.v, d.id); czData.line = r.msg; czKind = 'talk'; czRender(); break; }
    case 'back': czKind = 'talk'; czRender(); break;
    case 'rand': czRandomLook(); cRebuildPlayer(); czRender(); break;
    case 'cc': {
      const k = d.k, num = k === 'hs' || k === 'outfit' || k === 'hat';
      cozy.look[k] = k === 'female' ? d.v === '1' : num ? +d.v : d.v;
      if (k === 'female' && !cozy.look.female && cozy.look.outfit === 2) cozy.look.outfit = 0;
      cRebuildPlayer(); czRender(); break;
    }
  }
});

/* ---------------------------------------------------------------- olay köprüsü & dünya yönetimi */
function czArrive() {
  const pd = cv.pend; cv.pend = null;
  if (!pd || czBlocked()) return;
  const p = cozy.p;
  if (pd.then === 'door') { czPress(); return; }
  p.ang = Math.atan2(pd.x - p.x, pd.z - p.z);
  czPress();
}
function cozySceneReady() {
  cBuildStatic(); cRebuildPlayer(); cSyncVillagers(); cSyncObjs(0, true);
  const p = cozy.p;
  cv.yaw = cv.dyaw = p.ang + Math.PI; cv.fpAng = p.ang; cv.fpPitch = 0; cv.pitch = 0.42; cv.dist = cv.ddist = 5.6; cv.iso = 0; cv.pend = null;
  cam.x = cam.tx = p.x; cam.z = cam.tz = p.z;
  DEC.force = true; czSyncUI(); czBarSig = ''; czStatSig = '';
}
function cozyNewWorld() {
  cResetViews(); czCloseAll();
  let look = null, name = '';
  try { const s = JSON.parse(localStorage.getItem('minidunya.cozyplayer')); if (s && s.look) { look = s.look; name = String(s.name || ''); } } catch (_) { /* yoksay */ }
  czFirstRun = !look;
  cozy.start((Math.random() * 1e6) | 0, look, name);
  tod = 8 / 24; dayCount = 1; clReset(dayCount - 1 + tod); climateUI();
  cozySceneReady();
}
function cozyLoad(data) {
  cResetViews(); czCloseAll();
  if (!cozy.fromJSON(data)) return false;
  czFirstRun = false;
  cozySceneReady();
  return true;
}
function cozyLeave() {
  cResetViews(); czCloseAll(); cozyCamReset();
}
function czStart() {
  czCloseAll(); czSyncUI();
  if (czFirstRun) setTimeout(() => { if (gameMode === 'cozy' && !inMenu) czOpen('create'); }, 350);
  else setTimeout(() => toast(coarse ? 'Joystick: yürü · Büyük düğme: eylem' : 'WASD: yürü · Boşluk/E: eylem · C: kamera · B: çanta · V: rehber'), 700);
}
