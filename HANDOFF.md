# Mini Dünya — Handoff (Claude Code için)

Kullanıcı Türkçe konuşuyor; yanıtları ve arayüz metinlerini Türkçe tut.

## Hedef
WorldBox benzeri, **low-poly 3D** sandbox oyun. Güzel grafik/shader, takılmayan optimizasyon. Kullanıcı bir Instagram reel'indeki görünümü referans aldı (insanlar ve dünya videodaki gibi olsun); reel'e erişilemedi, referans görsel gelmedi. Plan: önce Three.js (tarayıcı), sonra **Unity** sürümü.

## Durum
- Çalışan prototip artifact olarak yayınlandı: https://claude.ai/artifact/BfmExAsuiPBb9pWb2zcToj
- **Simülasyon (`src/sim.js`) node'da test edildi** ve sorunsuz: dünya üretimi, insanlar, ev yapma, doğum, savaş, yangın, meteor, yıldırım, lav, ağaç büyümesi. Update başına ~0.03 ms.
- **Render (`src/main.js`) hiç gerçek tarayıcıda görülmedi.** O ortamda npm/CDN kapalıydı. Sadece sahte (stub) THREE ile çalıştırılıp tüm araçların hata fırlatmadığı doğrulandı. Shader'lar, ışık şiddetleri, renkler, tilt-shift ve performans **doğrulanmadı**; ilk iş bunlara bakmak.

## Dosyalar
- `src/sim.js` — saf JS simülasyon, render'dan bağımsız (`World` sınıfı). Unity'ye C# olarak taşınacak kısım bu.
- `src/main.js` — Three.js render, girdi, UI. `sim.js` build sırasında önüne eklenir (`export` kelimeleri silinir).
- `build.mjs` — HTML şablonu + CSS + importmap; `dist/index.html` üretir. Three.js 0.170.0 jsdelivr CDN'den yükleniyor.
- `test_sim.mjs`, `stats.mjs` — sim testi, harita istatistiği. (`harness.mjs` kaldırıldı: render artık gerçek tarayıcıda test ediliyor.)
- Çalıştırma: `node build.mjs` → `dist/index.html`; `.claude/launch.json` ile `dist` klasörü http sunucusunda açılır.

## Mimari
- Dünya 160×160 hücre, 16×16'lık 100 chunk; her chunk ayrı non-indexed mesh. Sadece değişen chunk yeniden doldurulur (`world.chunkDirty`).
- Çapraz yön hücre paritesine göre dönüşümlü; `getHeight` aynı kuralı kullanır. Render ve sim bu kuralda uyuşmalı.
- Su: tek mesh, vertex başına `depth` attribute, facet'li (dFdx) shader, kıyı köpüğü. Dışarıya devasa halka quad var.
- Gökyüzü shader küresi, gün/gece, yıldız ve ay, bulutlar (instanced).
- Ağaç/ev/insan/parçacık hepsi `InstancedMesh`; gövde-kafa ve gövde-çatı aynı `instanceMatrix`'i paylaşır.
- Kalite: `LEVELS` 0–5 (pixel ratio, gölge haritası, ağaç gölgesi, tilt-shift). "Oto" modu FPS'e göre seviye değiştirir (6 sn ısınma sonrası; düşürme >24 ms, yükseltme <18.5 ms ve 4 pencere).
- Tilt-shift: sahne HalfFloat render target'a çizilir, tek geçişli blur + tonemap + sRGB.
- `window.__game` debug kancası var.

## Bilinen riskler / ilk kontrol listesi
1. Işık şiddetleri (güneş 3.0, hemi ~1.7) ve Neutral tonemapping gözle ayarlanmadı; parlak/soluk olabilir.
2. Su shader'ında `fog_*` include'ları ve `UniformsUtils.merge` sonrası `uTime` paylaşımı (`waterU.uTime = U.uTime`) doğrulanmadı.
3. Gölge kamerası kamerayı izliyor ama texel snap'i yaklaşık; titreme olabilir.
4. Mobilde 100 chunk + ~7k ağaç; gerçek cihazda FPS ölçülmedi.
5. Dokunmatik: ✋ dışındaki araçta tek parmak araçtır, kaydırma/yakınlaştırma/döndürme iki parmakla.
6. Hata olursa sayfa altında kırmızı bir kutuda mesaj çıkar (`#err`).

## Önerilen sıra
1. Kendi makinede `npm i three esbuild`; CDN yerine esbuild ile paketle. Playwright'la headless ekran görüntüsü alıp görünümü doğrula.
2. Referans reel'den kare alınırsa renk paleti (`COL`, gökyüzü/su renkleri), insan modeli ve ışık buna göre ayarlanacak.
3. Görsel onaylanınca **Unity portu**: `sim.js` → C# (`World`, `Human`, `House`); arazi chunk mesh'leri, su için URP shader graph/HLSL, ağaç/ev/insanlar için GPU instancing (`Graphics.DrawMeshInstanced` veya DOTS), SRP batcher, Rigidbody yok (sim kendi hareketini yapıyor).
4. Sonra: kaydet/yükle, kabile sınırları/krallıklar, hayvanlar, ses, daha fazla felaket.

## Güncelleme: gerçekçi grafik + ana menü
- Render artık gerçek tarayıcıda doğrulandı (arazi, su, gece, yağmur, felaketler, mobil düzen).
- İki grafik stili: **gerçekçi** (varsayılan) ve **Low-Poly** (menüdeki anahtar). `isReal` bayrağı + `UREAL` shader uniform'u. Geçişte palet, ışık, tonlama (ACES/Neutral), su rengi, model seti (`buildSet`) ve arazi yeniden kurulur.
- Gerçekçi arazi: köşe başına yumuşak normal, komşu hücrelerle harmanlanan renk, sahte AO, shader'da gürültüyle renk/bump (`fillChunkSmooth`). Sim tarafında `markCell` komşu chunk'ları da işaretler.
- Kalite: Düşük / Orta / Yüksek / Ultra (+ oyun içi ayarlarda Oto). Ultra: 4096 gölge, mipmap'ten parlama (bloom), daha detaylı meşe. Tilt-shift ayrı anahtar (Yüksek/Ultra'da çalışır).
- Ana menü: arka planda dönen ada, "Grafikler:" kutusu, Low-Poly anahtarı. Ayarlar `localStorage`'da (`minidunya.ayarlar.v1`).
- Not: FPS sayacı artık kırpılmamış kare süresiyle ölçüyor. Gömülü önizleme paneli odakta değilken ~1 FPS'e kısıtlanıyor; performansı odaklı pencerede ya da gerçek tarayıcıda ölç.

## Güncelleme: kayıt sistemi
- `World.serialize()` / `deserialize(d)` (src/sim.js): yükseklik Int16 (×1000), zemin/auto Uint8, ağaç/yangın seyrek typed array'ler, hepsi base64; insanlar/evler/kabileler kısa diziler. Yüklemede `houseAt`, `treeCount`, kabile `pop/houses/building` yeniden hesaplanır, chunk/ağaç/su kirli işaretlenir. Bozuk veride dünyaya dokunmadan `false` döner. Kayıt ≈ 200 KB.
- main.js "kayıt sistemi" bölümü: `saveGame(id)`, `loadGame(id)`, Kayıtlar paneli (`#saves`; oto-kayıt + 3 slot, silme iki tıklamalı). localStorage anahtarları: `minidunya.kayit.v1.<auto|1|2|3>` ve `.meta`. Oyun durumu: `tod, dayCount, timeSpeed, speed, cam`.
- Oto-kayıt: gerçek zamanla her 5 dk (`AUTOSAVE_MS`), ana menüdeyken çalışmaz. Her kayıtta sağ üstte mor disket (`#floppy`, 2 sn) çıkar.
- Giriş noktaları: sağ üst 💾 düğmesi ve ana menüdeki "Kayıtlar". Menüdeyken Kaydet kapalı, Yükle oyunu başlatır (kamera korunur).
- `test_sim.mjs` sonunda kayıt/yükleme turu testi var. Konsoldan: `__game.saveGame('1')`, `__game.loadGame('1')`.

## Güncelleme: Detaylı Mod (Simülasyon Modu = eski mod, dokunulmadı)
- Ana menüde iki mod kartı: **Simülasyon Modu** (eski oyun) ve **Detaylı Mod** (yeni). `gameMode` = 'sim' | 'detail'. Menüde seçilen mod mevcut moddan farklıysa "Oyna/Yeni Dünya" yeni dünya kurar.
- `src/detail.js`: render'dan bağımsız mantık (`Colony`): 1 başlangıç insanı, ihtiyaçlar→mutluluk (Sims tarzı düşünceler), meslekler/beceriler, binalar (ev, ateş, kuyu, tarla, ağıl, iskele, okul, atölye, fabrika), 25 düğümlü beceri ağacı (Forager tarzı, puanla açılır), olay kuyruğu (BitLife tarzı seçenekler), doğum/bebek isimlendirme, okul/eğitim, ölüm. `toJSON/fromJSON`. Test: `node test_detail.mjs`.
- `src/detail_view.js`: eklemli büyük insan modelleri (yürüme/iş pozları, alet mesh'leri), bina modelleri (inşaat iskelesi, ekin aşamaları, hayvanlar, tekne, duman), isim etiketleri, seçim halkası, yerleştirme gölgesi, `detailTap` ile insan/bina seçme.
- `src/detail_ui.js`: kaynak çubuğu, insan chip'leri, insan paneli (isim düzenleme, ihtiyaç/istatistik +/-, meslek, yetenek, ilişkiler, görünüm), bina paneli, beceri ağacı penceresi, olay penceresi (isim giriş alanı dahil), günlük, mod geçişi (`enterMode`).
- `build.mjs`: `sim.js` + `detail.js` (export/import satırları sıyrılır) + `main.js`; main.js içindeki `//@@DETAIL@@` işaretine `detail_view.js` + `detail_ui.js` gömülür.
- Detaylı Mod araç ID'leri `d:` ile başlar (`d:house`, `d:pm`...). Olay/ağaç/günlük penceresi açıkken zaman durur (`dModalOpen`).
- Kayıtlar mod bilgisi taşır (`mode`, `colony`); yükleme modu otomatik değiştirir. Oto-kayıt iki modda da çalışır.
- Modeller prosedürel (dış model indirilmedi, tek dosya/çevrimdışı yapı korunsun diye). CC0 paketleri (Kenney/Quaternius) istenirse glTF olarak eklenebilir.
- **İş verme kutusu**: insan seçiliyken (el aracı) ağaca/binaya/kişiye/zemine dokununca küçük `#dcmd` kutusu açılır ("Buse → Ağaç" + "🪓 Ağaç kes" vb.). Seçenekler `Colony.commandOptions(p, hedef)` içinde, uygulama `_cmd` ile (`_release` + `_startX`, `act.cmd=1`). Emirli iş tek seferliktir, bitince normal yapay zekâ döner; çocuklar sınırlı iş yapar. Görünüm: `detail_view.js` (`dCmdShow/dCmdClose/dMark/detailTap`). Test: `node test_cmd.mjs`.
- **Sıkışma kurtarma** (iki modda): `World.freeSpot` + `World._unstick` (sim) / `Colony._unstick` (detay). Engele toslama süresi (`blk`), suda/lavda/ev içinde olma ve "10 sn yürüyor ama hep aynı 3.6 birimlik alanda" (`bx0..`, `wk`) tespitinde kişi yakındaki boş bir noktaya (sim: kabile merkezi, detay: evin kapısı) ışınlanır (`puff` efekti). Test: `node test_stuck.mjs`.
- **Gece ışıkları**: `main.js` içinde `flLights` (8 PointLight havuzu, `gatherLights/updateFireLights`): detayda kamp ateşi (güçlü) + ev pencereleri (zayıf), simde evler, yanan hücreler, lav. Gündüz sönük, gece güçlü; titreşir. Gece hemi/ay ışığı biraz yükseltildi. `window.__game.setTod(0..1)` ile saat ayarlanır (0.97 ≈ 23:20).
- **Araziye yapışık yapılar**: detayda `Colony._followTerrain` (0.2 sn'de bir) bina ayak izindeki köşe yüksekliklerini ortalamaya hizalar ve `b.y`'yi günceller (deniz+0.55'in altına inmez); görünüm `syncBuildingViews` içinde `g.position.y = b.y`. Simde `World.afterEdit` evlerin `y`'sini hücre yüksekliğine eşitler. Test: `node test_terrain.mjs`.
- Balon 🎈 = eğlence ihtiyacı / oynama–eğlenme işi (isim etiketindeki küçük işaret `D_ACTICON`).
- Dengeleme kaba: 2 kişilik erken oyunda yemek bitebilir; `D_FOOD`, doğum aralıkları ve olay ağırlıkları `detail.js` içinde.

## Güncelleme: Ada Modu (sakin ada hayatı) + Ultra+ + HD dokular + yeni insanlar
Ana menüde artık **üç mod kartı**: Simülasyon Modu · Detaylı Mod · **🏝️ Ada Modu**. `gameMode` = 'sim' | 'detail' | 'cozy'. `enterMode(m)` (detail_ui.js) `body.dmode/cmode`, `dRoot/cRoot` görünürlüğü ve moddan çıkarken `cozyLeave()` (kamera FOV/near/tilt sıfırlanır, işaretçi kilidi bırakılır) işini yapar.

### Ada Modu
- Oyuncu **insan**; küçük bir ada (kıyılar, göl, ağaçlar, kaya/ot/fosil/kabuk), 3 köylü (+ üretilen evler), kendi evin, dükkân (Tomris), yapım tezgâhı, Ada Panosu, sokak lambaları. Gün = 8 dk (`C_DAYLEN`), `tod` oyuncu saatini sürer (modallar açıkken zaman durur: `czBlocked`).
- Yapılabilenler: balta (ağaç kes, kütük kalır, dal/odun), kürek (çukur, fosil, ağaç sök/dik), olta (balık), kepçe ağı (böcek), kova (sulama; yağmur günü kendiliğinden sular), meyve/ağaç sallama, çiçek/fidan dikme (aşamalı büyür, gün atlayınca), mobilya yerleştirme/toplama, yeme, hediye verme, köylü sohbeti + istek (ödül zil 🔔), uyuma (yeni gün), tezgâhta eşya yapma, dükkânda alma/satma (hızlı satış kategorileri), Rehber (balık/böcek/fosil kataloğu), Ada Panosu (puan → yıldız; 5 yıldızda yeni köylü).
- Kameralar (`cv.mode`, `C` tuşu / 🎥 düğmesi, seçim `minidunya.cozycam` anahtarında saklanır): **üçüncü şahıs** (fare/sürükle ile dön, tekerlek yakınlaştır), **birinci şahıs** (işaretçi kilidi, fare ile bak; FOV 72), **izometrik** (Tomodachi tarzı, yüksek açı + hafif tilt-shift, 90° Q/R döndürme, **tıkla-yürü**: `cozyTapIso`, eşyaya/köylüye dokununca yaklaşıp etkileşir: `cv.pend` + `arrive` olayı).
- Kontroller: WASD/ok tuşları (Shift koş), Boşluk/E/F eylem, 1–6 alet, 0 el, B/Tab çanta, V rehber, P duraklat, Esc kapat. Mobilde sanal joystick (`#czjoy`) + büyük eylem düğmesi; HUD dar ekranda sığar.
- Karakter oluşturucu (ilk açılışta ve evde "Görünümünü değiştir"): isim, cinsiyet, ten, saç stili/rengi, kıyafet, gömlek/pantolon rengi, şapka, ayakkabı, göz, rastgele; canlı önizleme. Görünüm `minidunya.cozyplayer` anahtarında.
- Kayıt: `data.cozy = cozy.toJSON()` (+ meta `mode:'cozy'`); Kayıtlar listesinde "🏝️ Ada · 👥 · ⭐ · 🔔 · Gün". Oto-kayıt Ada Modu'nda da çalışır.
- Dosyalar:
  - `src/cozy.js` — render'dan bağımsız mantık (`Cozy` sınıfı): ada üretimi, çanta/ekonomi/tarif, köylüler (eve dönüş, yol bulma, 70 sn'de takılırsa kapıya ışınlanma güvenlik ağı), balık/böcek, bitki/ağaç büyümesi, yağmur, puan, `toJSON/fromJSON`. Rastgelelik `Math.random` (`zrnd`) — testte tohumlanır. Sabitler: `Z_TOOLS, Z_FLOWERS, Z_TREES, Z_FISH, Z_BUGS, Z_FOSSILS, Z_FURN, Z_RECIPES, Z_ITEMS`.
  - `src/cozy_view.js` — 3B: birleştirilmiş geometrili `InstancedMesh` havuzları (eşyalar), binalar (`cMerge`: ExtrudeGeometry indekssiz olduğu için tüm parçalar `toNonIndexed` yapılır), karakter/köylü (human.js), böcek, olta/şamandıra, isim etiketleri, kamera rigleri, girdi (`cozyDown/Move/Up/Wheel/Key`), `cozyFrame(dt, t)`.
  - `src/cozy_ui.js` — HUD (hotbar, ipucu, eylem düğmesi, joystick), tek `#czm` modal çerçevesi (çanta, dükkân, tezgâh, rehber, ev, pano, sohbet/hediye, karakter oluşturucu), dünya yönetimi (`cozyNewWorld/cozyLoad/cozyLeave`, `czStart`). `DEC.blocked` ile eşyaların altına çim serpilmez.
  - `build.mjs`: `detailLogic = strip(detail.js) + strip(cozy.js)`; `detailParts` = detail_view, human, detail_ui, cozy_view, cozy_ui. Hepsi tek modül kapsamında → ortak adlar için önek kullan (`z…` mantık, `c…/cz…` görünüm/arayüz). Ada arayüzü `body:not(.cmode)` iken CSS ile gizlenir.
  - Hata ayıklama: `__game.cozy, cv, czOpen(kind[,data]), czCloseAll, cozySetMode('tp'|'fp'|'iso'), cozyTapIso(x,y), cozyNewWorld`. Köylü sohbeti: `czOpen('talk', {v, line: cozy.talk(v)})`. Saat: `__game.setTod(saat/24)`.
- Test: `node test_cozy.mjs` (tohumlu; `TEST_SEED=7 node test_cozy.mjs` ile başka tohum). 17 tohumda geçiyor.

### Ultra+ ve HD dokular (`src/hd.js`)
- Kalite basamakları: Düşük · Orta · Yüksek · Ultra · **Ultra+** (`LEVELS` 0 çok düşük/yalnız Oto … 5 Ultra+). Menüde ve ayarlarda Ultra+ düğmesi var.
- GPU'da üretilen, dikişsiz (tileable) prosedürel dokular: arazi (`ter`: çim/kum/kaya/toprak) ve model malzemeleri (`m1`: ahşap/kumaş/sıva/yaprak, `m2`: çatı/tuğla/metal/ten; `HDK` tablosu), shader'da bump ile. Çözünürlük: Yüksek 512 · Ultra 1024 · Ultra+ 2048. Yalnız gerçekçi stilde; Low-Poly'de kapalı. Dış doku indirilmedi (tek dosya/çevrimdışı yapı).
- `hdPatch(material, 'stucco', {...})` ile malzemelere doku/bump eklenir. `src/decor.js`: Yüksek ve üzeri için çim tutamları + kır çiçekleri (Ada Modu'nda yabani çiçek kapalı).
- Bilinen GLSL tuzağı: `patch` ayrılmış kelime (kullanma). Çift taraflı yapraklarda `upNormalFix` ile normal hep yukarı.

### İnsan modelleri (`src/human.js`)
- `buildHuman(L)` / `poseHuman(v, {...}, dt)`: yüz (göz, kaş, burun, ağız, yanak), 8 saç stili, 4 kıyafet (tişört, kapüşonlu, elbise, tulum), 4 şapka, ayakkabı, eklemli kol/bacak, 9 alet. Detaylı Mod halkı ve Ada Modu oyuncusu/köylüleri aynı oluşturucuyu kullanır.

### Bu oturumda yapılan düzeltmeler
- `World._unstick`: yürümeye çalışıp kıpırdayamayan (ör. 5×5 ev halkası içinde CHOPWALK) kişi için `h.ws` sayacı eklendi; `test_stuck.mjs` artık 12/12 geçiyor (önceden ~%15 başarısız).
- Mobil Ada HUD'u: durum çubuğu `width:max-content` + `flex-wrap` ile iki satıra sığar.
- Doğrulama: `node build.mjs && node --check dist/game.mjs`; tarayıcıda menü, Ada Modu (3 kamera, ağaç kesme, dükkân, çanta/tezgâh/rehber/ev/pano, sohbet+hediye, uyku, kayıt/yükleme, gece ışıkları, mobil 375×812), Simülasyon ve Detaylı mod geçişleri konsol hatasız. Gömülü önizleme paneli gizliyken ~2 FPS çalışır; gerçek hız için gerçek tarayıcıda dene.
- **Ada yürüme animasyonu** (`cPosePlayer`, cozy_view.js): bacak fazı artık birikimli (`cv.wph += dt*(6+hız*1.5)`), hız `cv.as` ile yumuşatılır, "yürüyor" durumu histerezisli (`cv.mv`: 0.55 üstü başlar, 0.3 altı biter). Eskiden faz `t*(6+hız*1.5)` idi; fare ile dönerken / çapraz (W+A, W+D) giderken hız her karede değiştiği için faz mutlak zamanla çarpılıp sıçrıyordu (animasyon "başa sarıyordu"). `Cozy._player` karakterin yönünü artık hızdan değil istenen yürüyüş yönünden alır (duvara sürtünürken eksen sıfırlanınca dönmesin).
- **Ada Panosu**: tabela 2:1 (512×256 dokulu), direkler levhanın dışında; `cSign` yazıyı çerçeveye sığana kadar küçültür (`measureText`). Pano çarpışma yarıçapı `hx 1.1`.
- **FPS göstergesi**: ayar artık `body.showfps` sınıfını açar (`#fps` Simülasyon/Detaylı, `#czfps` Ada Modu — `#czleft` içinde istatistik hapının altında); metin `frame()` içinde ikisine de yazılır.
- **Tooltip sistemi** (main.js, "tooltip" bölümü + `#tip` CSS): `data-tip="Başlık|Açıklama|Kısayol"` taşıyan her öğenin üstüne gelince (yalnız fare; dokunmatikte kapalı) yuvarlatılmış kutu çıkar. Eski `title` özellikleri üstüne gelince otomatik `data-tip`'e çevrilir. Ada arayüzünde `czTip(başlık, açıklama, kısayol)` ve `czItemTip(id)` (cozy_ui.js) yardımcıları; hotbar, HUD düğmeleri, istatistik hapı, çanta/dükkân/tezgâh/rehber/hediye/ev/pano ögeleri ve Kayıtlar düğmeleri ipucu taşır. Yeni arayüz öğesi eklerken `data-tip` eklemeyi unutma.
- Henüz gerçek cihazda/odaklı pencerede ölçülmedi: Ada Modu FPS'i (ada 160×160, ~300–450 ağaç), izometrik görünümde evlerin kamerayı kapatması (Q/R ile dön), dokunmatik joystick hissi.

## Güncelleme: ses, mevsim/hava, Simülasyon modunda çağlar-tarla-günlük
Ortak kural: `build.mjs` `src/detail.js, cozy.js, climate.js, audio.js` dosyalarını `strip()` edip (import/export silinir) `sim.js`'ten sonra tek kapsama yapıştırır; **üst düzey isimler benzersiz olmalı** (önekler: `AU` ses, `CL` iklim, `z`/`c`/`cz` Ada, `d` Detaylı, `v`/`V` köy günlüğü). Mantık dosyalarının üst düzeyinde `main.js`'te tanımlanan `const`'lara dokunma (TDZ).

### Ses ve müzik (`src/audio.js`)
- Prosedürel WebAudio: sfx (`auSfx(ad, ses)`, konumlu `auAt(ad, x, z, ses)`), ortam sesleri (rüzgâr, yağmur, dalga, kuş, cırcır), üretken müzik. Ayarlar panelinde ana/müzik/efekt ses seviyeleri. Ses bağlamı ilk kullanıcı etkileşiminde açılır.

### Mevsim ve hava (`src/climate.js`, `CL`)
- 4 mevsim (ilkbahar/yaz/sonbahar/kış) × hava (açık, yağmur, kar, fırtına, sis); tüm modlarda ortak. `CL.season/weather/temp`, `CL.lockS` / `CL.lockW` mevsimi/havayı sabitler (ayar düğmeleri `#segS`, `#segX`), kayıtta `game.cl`. Renk, gökyüzü, ağaç yaprağı, kar örtüsü shader uniform'ları (`SEAS…`) ile verilir. `CL.onSeason/onWeather` toast + ses + (Simülasyon modunda) köy günlüğüne yazar.
- Ada: yağmur ekinleri sular, kışın kar. Detaylı mod: mevsim etkileri kendi dosyasında (`detail.js`).

### Simülasyon (klasik) modu: çağlar, tarla, günlük (`sim.js`, `village.js`)
- **Çağlar** `ERAS`: Taş → Tarım → Demir → Sanayi → Modern, eşikler bilgi (`kn`) + nüfus/ev/tarla. Bilgi `_tribeTick`te birikir (`kn += dt*(0.4+√pop*0.55)*(1+min(tarla,8)*0.06+…)`); yaklaşık Tarım 0:30–1 dk, Demir ~3 dk, Sanayi ~6 dk, Modern ~9–12 dk oyun süresi. Eşikleri değiştirirsen `test_era.mjs` (12 dk'da çağ ≥3 bekler) ve `era_try` benzeri bir betikle hızı yeniden ölç: taban nüfus ~10 dk'da 900'e (MAXHUM) patlıyor.
- Köy adı `tribeTitle(t)` (Kırmızı Köy → Kasaba (çağ ≥2) → Şehir (çağ ≥3)). Köy alanları: `{era,kn,farms,fbuild,fact,food,age,harv,hAll,gone,mH,mP,mF}` (`_mkTribe`). Evler `era` ve `kind` (1 = fabrika) taşır; `_eraTick` yarım saniyede en çok 2 evi yükseltir, bacalardan duman çıkarır.
- **Tarla** `farms[]` + `farmAt` (Int16Array, `SOIL.FARM=7` sanal toprak): durum 0 boş / 1 büyüyor / 2 olgun; büyüme `SEASON_GROW` (ilkbahar 1.0, yaz 1.35, sonbahar 0.55, kış 0) × `GROW_T`. İnsan durumları `ST.FARMWALK/ST.FARM`, iş `job` 1 yeni tarla / 2 ekim / 3 hasat. Kışın ekim durur, kış başında genç ekinler donar; yangın ekinli tarlalara yayılır. Üst sınır `MAXFARM=320`; yiyecek `tr.food` doğum hızını (×0.65 bekleme) ve nüfus tavanını artırır.
- **Günlük** `world.log` (bellekte son 300, kayıtta son 150): `{id,t,day,tod,tribe,who,ico,msg,key,n}`; `key` taşıyan satırlar 12 sn içinde birleşir (`#` yer tutucu sayıdır: "# tarla açtı"). `world.onNote(e, merged)` arayüze bildirir; `world.day/tod/season` ana döngüde (`main.js` frame) yazılır.
- Arayüz (`src/village.js`, `detailParts` içinde ham eklenir): solda canlı akış `#vfeed` (en çok 5 satır, çağ atlamaları büyük), 📜 düğmesi / **J** tuşu günlük penceresi `#vlog` (köy kartları: çağ, nüfus/ev/tarla/fabrika/yiyecek, ilerleme çubuğu, "Sonraki: … Bilgi x/y"; karta dokununca filtre, 📍 köye git). Yalnızca Simülasyon modunda görünür.
- Görünüm: tarla toprağı kahverengi (`PALS` + `SOIL_CH[7]`), ekinler `cropM` (tarla başına 9 bitki, yeşil → altın), ev çağına göre duvar rengi/boyu (`ERA_*`), Modern evler düz çatılı, fabrikalar gri/geniş (kışın çatıda kar). Çağ atlayınca `fx 'era'` (altın parçacıklar + fanfar).
- Kayıt: evler `[cell,tribe,rot,prog,era,kind]`, köyler `[cx,cz,era,kn,food,age,hAll,harv,mH,mP,mF,gone]`, `farms`, `log`, `logId`. Eski kayıtlar (`[cx,cz]` köyler, çağsız evler) yüklenir. **Kayıt dosyalarını depoya koyma.**
- Test: `node test_era.mjs` (çağ, tarla tutarlılığı, günlük, kayıt turu + eski biçim, kış donu).

## Yayın (GitHub)
- Depo: https://github.com/suslu22/mini-dunya (herkese açık, dal: `main`). Oyun adresi: **https://suslu22.github.io/mini-dunya/**
- `main`'e her push'ta `.github/workflows/pages.yml` çalışır: `node build.mjs` → `dist/` GitHub Pages'e yüklenir (~1 dk). `dist/` git'te yok (`.gitignore`), yerelde `node build.mjs` ile üretilir.
- Güncelleme akışı: `src/…` düzenle → `node build.mjs` + testler → `git add -A && git commit -m "…" && git push`.
- Commit kimliği (yalnız bu depo): `suslu22` + GitHub noreply e-postası; gerçek e-posta herkese açık geçmişe girmesin diye.
- Bilgisayarda iki GitHub hesabı var (`suslu22` etkin, `idkalem`); `gh auth status` ile bak, yanlış hesapla push'lama.
- **Kayıt taşıma (dışa/içe aktarma):** kayıtlar `localStorage`'da adres başına ayrı olduğu için localhost ile github.io birbirinin kaydını görmez. Kayıtlar panelinde her slotta ⬇ (JSON dosyası indir: `{app:'minidunya-kayit', v:1, meta, data}`) ve ⬆ (dosyadan içe aktar; dolu slotta ikinci tıkla "Üstüne yaz?") var; Oto-kayıt yalnızca dışa aktarılır. Kod: `exportSave`/`saveFileIn.onchange` (main.js, kayıt sistemi bölümü). Dosya şekli doğrulanır, geçersizse slot değişmez. **Kayıt dosyalarını depoya koyma** (depo herkese açık).
