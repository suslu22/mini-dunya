// Mini Dünya - Ada Modu verileri: ekinler, atölyeler (endüstri), görevler, köylü hikâyeleri ve ipuçları.
// Saf veri; cozy.js içe aktarır. Build sırasında cozy.js'den önce birleştirilir (import/export satırları ayıklanır).

// Ekinler: days = olgunlaşmak için sulanmış gün sayısı · s = büyüdüğü mevsimler (0 ilkbahar … 3 kış) · regrow = hasattan sonra geri dönülecek aşama
export const Z_CROPS = {
  wheat: { n: 'Buğday', i: '🌾', seed: 50, sell: 90, days: 2, s: [0, 1, 2], y: [2, 3], col: '#e2c04a' },
  carrot: { n: 'Havuç', i: '🥕', seed: 60, sell: 110, days: 2, s: [0, 2, 3], y: [1, 2], col: '#ff8a2a' },
  potato: { n: 'Patates', i: '🥔', seed: 70, sell: 130, days: 2, s: [0, 2, 3], y: [2, 2], col: '#c8a468' },
  tomato: { n: 'Domates', i: '🍅', seed: 90, sell: 150, days: 3, s: [1], y: [2, 2], regrow: 1, col: '#e23b3b' },
  corn: { n: 'Mısır', i: '🌽', seed: 100, sell: 170, days: 3, s: [1, 2], y: [1, 2], col: '#f4d03f' },
  pumpkin: { n: 'Kabak', i: '🎃', seed: 140, sell: 300, days: 3, s: [2], y: [1, 1], col: '#ff8c1a' },
  strawberry: { n: 'Çilek', i: '🍓', seed: 120, sell: 200, days: 2, s: [0], y: [2, 2], regrow: 1, col: '#e8223f' },
};

// Atölyeler: şantiye olarak başlar; malzeme ve zil ile inşa edilir, sonra tarif üretir.
// pos: ada yerleşimi · hx/hz: kapladığı alan · need: inşaat malzemesi · rec: [girdi → çıktı, süre (sn)]
export const Z_MACH = {
  saw: {
    n: 'Hızar', i: '🪚', pos: [-10, 17], hx: 1.8, hz: 1.4, zil: 500, need: { wood: 15, stone: 6 }, desc: 'Odunu biçip tahtaya çevirir. Diğer atölyelerin yapımında lazım.',
    rec: [{ in: { wood: 2 }, out: 'plank', n: 1, t: 10 }, { in: { wood: 5 }, out: 'plank', n: 3, t: 20 }],
  },
  kiln: {
    n: 'Tuğla Ocağı', i: '🏭', pos: [-3, 18.5], hx: 1.5, hz: 1.4, zil: 900, need: { plank: 8, stone: 12 }, desc: 'Kili pişirip tuğla yapar, demiri eritip külçeye çevirir.',
    rec: [{ in: { clay: 3, wood: 1 }, out: 'brick', n: 2, t: 14 }, { in: { iron: 2, wood: 2 }, out: 'ingot', n: 1, t: 18 }],
  },
  mill: {
    n: 'Değirmen', i: '🌬️', pos: [5, 18.5], hx: 1.4, hz: 1.4, zil: 1500, need: { plank: 15, brick: 8, ingot: 2 }, desc: 'Buğday ve mısırı öğütüp un yapar. Kanatları rüzgârla döner.',
    rec: [{ in: { wheat: 3 }, out: 'flour', n: 2, t: 12 }, { in: { corn: 3 }, out: 'flour', n: 2, t: 12 }],
  },
  bakery: {
    n: 'Fırın', i: '🥖', pos: [13, 17.5], hx: 1.8, hz: 1.5, zil: 2000, need: { plank: 12, brick: 15 }, desc: 'Undan ekmek, turta ve tatlılar pişirir. Pahalı satılan değerli ürünler!',
    rec: [{ in: { flour: 2 }, out: 'bread', n: 1, t: 14 }, { in: { flour: 2, apple: 2 }, out: 'pie', n: 1, t: 20 }, { in: { flour: 1, strawberry: 2 }, out: 'tart', n: 1, t: 18 }, { in: { flour: 1, pumpkin: 1 }, out: 'pudding', n: 1, t: 20 }],
  },
};
export const Z_MACH_ORDER = ['saw', 'kiln', 'mill', 'bakery'];
// atölye ürünleri: [kimlik, ad, simge, satış]
export const Z_GOODS = [
  ['plank', 'Tahta', '🟫', 140], ['brick', 'Tuğla', '🟥', 230], ['ingot', 'Demir Külçe', '⛓️', 480], ['flour', 'Un', '🥣', 150],
  ['bread', 'Ekmek', '🥖', 420], ['pie', 'Elmalı Turta', '🥧', 760], ['tart', 'Çilekli Tart', '🍰', 540], ['pudding', 'Kabak Tatlısı', '🍮', 650],
];

// Görevler: sırayla açılır, en fazla 3 tanesi ekranda görünür. ty: stat | have | stars | furn | vill | friend | mach
export const Z_QUESTS = [
  { id: 'q_talk', t: 'Komşularla tanış', d: 'Bir köylüyle konuş.', ty: 'stat', k: 'talks', need: 1, zil: 150 },
  { id: 'q_wood', t: 'Odun biriktir', d: 'Baltayla ağaç kesip çantanda 8 odun topla.', ty: 'have', k: 'wood', need: 8, zil: 200 },
  { id: 'q_plant', t: 'Yeşil parmaklar', d: '3 çiçek tohumu ya da fidan ek.', ty: 'stat', k: 'planted', need: 3, zil: 250, item: 'seed_1', itemN: 3 },
  { id: 'q_fish', t: 'İlk balık', d: 'Oltayla bir balık tut.', ty: 'stat', k: 'fish', need: 1, zil: 300 },
  { id: 'q_bug', t: 'Böcek avcısı', d: 'Ağla 2 böcek yakala.', ty: 'stat', k: 'bugs', need: 2, zil: 250 },
  { id: 'q_till', t: 'Tarla açalım', d: 'Çapayla (7) 6 toprak parçasını sür.', ty: 'stat', k: 'tilled', need: 6, zil: 300, item: 'cs_wheat', itemN: 6 },
  { id: 'q_harvest', t: 'İlk hasat', d: 'Bir ekin ek, sula, büyüsün ve hasat et.', ty: 'stat', k: 'harvest', need: 1, zil: 400 },
  { id: 'q_dig', t: 'Toprak ana', d: 'Kürekle kazıp 6 parça toprak topla.', ty: 'have', k: 'dirt', need: 6, zil: 250 },
  { id: 'q_land', t: 'Adayı büyütelim', d: 'Elindeki toprağı kıyıdaki sığ suya dök: 6 hücre kara kazan.', ty: 'stat', k: 'land', need: 6, zil: 600 },
  { id: 'q_gift', t: 'Güzel bir jest', d: 'Bir köylüye hediye ver.', ty: 'stat', k: 'gifts', need: 1, zil: 300 },
  { id: 'q_craft', t: 'Usta eller', d: 'Yapım Tezgâhı\'nda bir şey üret.', ty: 'stat', k: 'crafted', need: 1, zil: 300 },
  { id: 'q_sell', t: 'Ticarete başla', d: 'Toplam 3.000 Zil kazan.', ty: 'stat', k: 'earned', need: 3000, zil: 400 },
  { id: 'q_saw', t: 'Hızar kuralım', d: 'Rüstem\'in şantiyesinde Hızar\'ı inşa et.', ty: 'mach', k: 'saw', need: 1, zil: 500 },
  { id: 'q_plank', t: 'Kereste zamanı', d: 'Hızarda 6 tahta ürettir ve topla.', ty: 'stat', k: 'made_plank', need: 6, zil: 600 },
  { id: 'q_kiln', t: 'Ocağı yakalım', d: 'Tuğla Ocağı\'nı inşa et.', ty: 'mach', k: 'kiln', need: 1, zil: 800 },
  { id: 'q_fossil', t: 'Geçmişin izleri', d: 'Bir fosil çıkar.', ty: 'stat', k: 'fos', need: 1, zil: 400 },
  { id: 'q_stars3', t: 'Güzel ada', d: 'Adanın puanını 3 yıldıza çıkar.', ty: 'stars', k: 'stars', need: 3, zil: 1000, item: 'f_fountain', itemN: 1 },
  { id: 'q_mill', t: 'Rüzgârın gücü', d: 'Değirmen\'i inşa et.', ty: 'mach', k: 'mill', need: 1, zil: 1200 },
  { id: 'q_bread', t: 'Taze ekmek', d: 'Fırın\'ı kur ve 3 ekmek pişir.', ty: 'stat', k: 'made_bread', need: 3, zil: 1500 },
  { id: 'q_friend', t: 'Can dost', d: 'Bir köylüyle arkadaşlığı 💗💗 (50) seviyesine çıkar.', ty: 'friend', k: 'friend', need: 50, zil: 800 },
  { id: 'q_fish10', t: 'Usta balıkçı', d: 'Toplam 12 balık tut.', ty: 'stat', k: 'fish', need: 12, zil: 900 },
  { id: 'q_farm', t: 'Çiftlik sahibi', d: 'Toplam 25 ürün hasat et.', ty: 'stat', k: 'harvest', need: 25, zil: 1500 },
  { id: 'q_land2', t: 'Yeni topraklar', d: 'Toplam 25 hücre kara kazan.', ty: 'stat', k: 'land', need: 25, zil: 2000 },
  { id: 'q_stars5', t: 'Cennet ada', d: 'Adanı 5 yıldıza ulaştır.', ty: 'stars', k: 'stars', need: 5, zil: 6000, item: 'f_trophy', itemN: 1 },
];

// Köylü hikâyeleri: arkadaşlık arttıkça yeni bölüm açılır (0, 20, 45, 75)
export const Z_STORY_AT = [0, 20, 45, 75];
export const Z_STORY = {
  Defne: [
    'Ben bu adada doğdum, biliyor musun? Annem bana "çiçek gibi ol" derdi. Ben de çiçek yetiştirmeye başladım.',
    'Bir keresinde sümbül tohumu ektim, tam üç gün sonra açtı. O gün gözyaşlarına boğuldum. Çiçekler güzelliğin sabrı gibi.',
    'Gizli bir sırrım var: gece yarısı bahçede çiçeklere şarkı söylerim. Daha hızlı büyüdüklerine yemin ederim!',
    'Bir gün adanın her köşesi çiçek dolsun istiyorum. Senin sayende hayalim gerçek oluyor… Teşekkür ederim, dostum. 💗',
  ],
  Kerem: [
    'Eskiden denizci olmak isterdim. Ama dalgalar beni hep hasta etti. Şimdi sadece oltayla yetiniyorum, güvenli!',
    'En büyük balığım bir ton balığıydı. Boyu benden uzundu. Kimse inanmıyor ama gerçek, yemin ederim!',
    'Balık tutmanın sırrı sabırdır. Aceleci olursan "ÇEK!" yazısını görmeden oltayı çekersin. Ben hiç acele etmem.',
    'Ben uyuşuk görünürüm ama adayı çok severim. Bu kıyıda geçirdiğim her sabah altın değerinde. Sen de bir ara otur yanıma.',
  ],
  Nermin: [
    'Torunlarım uzakta yaşıyor. Onlara ada meyvelerinden reçel gönderirim, çok severler. Sen de dene!',
    'Kiraz ağacımı kendi ellerimle diktim. Her yıl meyvesini köye dağıtırım. Paylaşınca tadı katlanır.',
    'Gençliğimde ada bambaşkaydı: yollar çamurdu, ev yoktu. Şimdi bak, mis gibi bir yer olmuş. Hepsi sizin sayenizde.',
    'Sana bir şey söyleyeyim: iyi bir komşu, altın kadar kıymetlidir. Sen benim için ailemden birisin artık. 🌸',
  ],
  Berkin: [
    'Hmph, böceklerden nefret ederim derdim. Ama bir kez bir gergedan böceği gördüm… Harikaydı, itiraf ediyorum.',
    'Koleksiyonum var: yüzlerce böcek, hepsi tek tek etiketli. Kimse görmek istemiyor, tuhaf değil mi?',
    'Aslında huysuz olduğumu biliyorum. Ama değişim zor. Sen yine de benimle konuşuyorsun, bu çok şey.',
    'Tamam, söyleyeceğim: seni seviyorum işte. Köyün en iyi komşusu sensin. Sakın kimseye söyleme! 🤫',
  ],
  Selin: [
    'Ben dünyayı gezdim: dağlar, çöller, buzullar. Ama hiçbir yerde bu adadaki huzuru bulamadım.',
    'En sevdiğim şey fosil aramak. Bir kemiğin ya da kabuğun milyonlarca yıl yaşadığını düşünmek insanı alçakgönüllü yapıyor.',
    'Kıyıdaki mavi kum tepesinin altında bir şey var, hissediyorum. Bir gün kürekle birlikte keşfe çıkalım mı?',
    'Gerçek hazine yer altında değil, yanında yürüyen dostlardadır. Sen benim en iyi maceram oldun. 🧭',
  ],
  Rüstem: [
    'Ben bu adanın ilk ustabaşısıyım! Tuğla, tahta, demir… hepsini tanırım. Bana güvenebilirsin.',
    'Yıllar önce kıtada büyük bir fabrikada çalıştım. Dumanı, gürültüsü bıktırdı. Burada ise işimizi sakin sakin yapıyoruz.',
    'Her atölye bir diğerinin kapısını açar: Hızar tahta verir, Ocak tuğla; ikisi birlikte Değirmen\'i ve Fırın\'ı kurar.',
    'Ada gelişti, atölyeler çalışıyor, köylüler mutlu. Benim için en güzel ödül bu. Sen de bu işin ustası oldun!',
  ],
  Hacer: [
    'Toprağı severim. Elime çapayı aldım mı dünya kaybolur, bir tek ben ve sıra sıra ekinler kalır.',
    'Bu adada toprak verimli ama sınırlı. Kıyıya toprak dökerek tarlayı büyütmek gerçek bir ustalık ister.',
    'Mevsime bakmadan ekilen ekin, rüzgâra atılan söz gibidir. Domates yazı, kabak sonbaharı ister.',
    'Senin tarlalarına bakınca gençliğimi hatırlıyorum. Sen bu adanın gerçek çiftçisi olacaksın, bak göreceksin! 🌾',
  ],
};

// Kısa laf atmalar: köylüler yürürken balonla söyler
export const Z_BARKS = {
  neşeli: ['Ne güzel gün! ☀️', 'La la laaa~ 🎵', 'Çiçekler açmış!'],
  tembel: ['Hmm… biraz şekerleme?', 'Of, yoruldum…', 'Balık tutsam mı?'],
  sevecen: ['Dikkat et canım!', 'Aç mısın yavrum?', 'Ne güzel ada!'],
  huysuz: ['Hmph.', 'Şu böcekler…', 'Neden herkes yolda?'],
  maceracı: ['Bir iz buldum!', 'Keşif zamanı!', 'Fosil kokusu var…'],
  çalışkan: ['İş bitmez, iş bitmez!', 'Tam vaktinde!', 'Biraz daha çalışalım.'],
};

// Genel ipuçları: koşul sağlanıyorsa bu ipucu öncelikli verilir (c = Cozy)
export const Z_HINTS = [
  { if: (c) => c.stats.fish === 0, t: 'Oltayla (4) suya yaklaş ve at. Şamandıra batınca "ÇEK!" yazısını görünce bas, sonra ibre yeşildeyken tekrar bas.' },
  { if: (c) => !c.stats.tilled, t: 'Çapayı (7) eline al, çimene vur: toprak sürülür. Sürülen yere tohum ekip sularsan ekin büyür!' },
  { if: (c) => !c.stats.land && c.count('dirt') < 3, t: 'Kürekle (3) kazdıkça toprak toplarsın. O toprağı eline alıp kıyıdaki sığ suya dök: ada büyür!' },
  { if: (c) => !c.stats.land && c.count('dirt') >= 3, t: 'Çantandaki toprağı (B) eline al ve kıyıdaki sığ suya bak: toprak dökerek yeni kara kazanırsın.' },
  { if: (c) => !c.machBuilt('saw'), t: 'Rüstem\'e uğra! Güneydeki şantiyelerde atölye kurabilirsin: önce Hızar, sonra Tuğla Ocağı.' },
  { if: (c) => c.hour >= 18 || c.hour < 6, t: 'Gece mi bastırdı? Fener\'i (8) eline al, etrafını aydınlatır.' },
  { if: (c) => c.stars < 3, t: 'Ada puanını artırmak için çiçek ek, ağaç dik, mobilya yerleştir ve yabani otları temizle.' },
  { if: (c) => c.count('apple') + c.count('orange') + c.count('cherry') === 0, t: 'Meyve ağaçlarını Eller ile sallarsan meyve düşer. Meyveler köylülerin sevdiği hediyedir.' },
  { if: (c) => !c.stats.fos, t: 'Yerde çatlak gördüysen kürekle kaz: fosil çıkabilir. Fosiller çok değerlidir.' },
  { if: (c) => c.stats.crafted === 0, t: 'Meydandaki Yapım Tezgâhı\'nda malzemelerinden mobilya yapabilirsin.' },
  { if: (c) => c.vill.length < 4, t: 'Ada puanı yükselince yeni komşular taşınır. 3 yıldızda Berkin, 5 yıldızda Selin gelir.' },
  { if: () => true, t: 'Şenlik günlerinde meydana uğra, köylülerle hediyeleşmek arkadaşlığı artırır.' },
  { if: () => true, t: 'Fotoğraf modu (G) ile adanın güzel anlarını kaydedebilirsin.' },
  { if: () => true, t: 'Bir köylüye sevdiği şeyi hediye edersen arkadaşlık çok artar; arkadaşlar mobilya hediye eder.' },
];
export const Z_HINTS_NPC = {
  rustem: [
    { if: (c) => !c.machBuilt('saw'), t: 'Güneydeki ilk şantiyede Hızar kuracağız: 500 Zil, 15 odun, 6 taş. Hazır olunca bana gel, hemen başlayalım!' },
    { if: (c) => c.machBuilt('saw') && !c.machBuilt('kiln'), t: 'Hızar çalışıyor, güzel! Şimdi Tuğla Ocağı\'nı kuralım: 8 tahta, 12 taş ve 900 Zil.' },
    { if: (c) => c.machBuilt('kiln') && !c.machBuilt('mill'), t: 'Değirmen için tahta, tuğla ve demir külçe lazım. Külçeyi ocakta demirden eritirsin.' },
    { if: (c) => c.machBuilt('mill') && !c.machBuilt('bakery'), t: 'Fırın için 12 tahta ve 15 tuğla yeter. Un elindeyse ekmek pişirmek işten bile değil!' },
    { if: () => true, t: 'Atölyelerin kapısına yaklaşıp Boşluk\'a bas: girdi koyarsın, süre dolunca ürünü toplarsın. Uyursan işler hızla biter.' },
    { if: () => true, t: 'Üretim zinciri: Hızar → tahta · Ocak → tuğla, külçe · Değirmen → un · Fırın → ekmek, turta. Her halkada değer artar.' },
  ],
  hacer: [
    { if: (c) => !c.stats.tilled, t: 'Önce çapa (7) ile toprağı sür. Sürülmüş yer koyu renkli olur, işte orası tarladır.' },
    { if: (c) => c.stats.tilled && !c.stats.harvest, t: 'Tohumu eline al, sürülmüş toprağa ek, sulama kovasıyla (6) sula. Her sulanmış gün ekin bir aşama büyür.' },
    { if: (c) => c.stats.harvest > 0 && !c.stats.land, t: 'Tarla yetmiyorsa kıyıya toprak dök: kürekle kazdığın toprağı sığ suya doğru elinde tutup bas.' },
    { if: (c) => c.season === 1, t: 'Yaz domates, mısır ve buğday zamanı. Domates hasattan sonra yeniden meyve verir!' },
    { if: (c) => c.season === 2, t: 'Sonbahar kabak mevsimi. Büyük kabaklar çok para eder; tatlısını fırında yaparsan daha da.' },
    { if: (c) => c.season === 3, t: 'Kışın çoğu ekin uyur, ama havuç ve patates soğuğa dayanır. Tohumlarını ona göre al.' },
    { if: () => true, t: 'Yağmur ekinleri kendiliğinden sular, o gün kovayla uğraşma!' },
    { if: () => true, t: 'Mevsim dışı ekin büyümez, ama ölmez de; mevsimini bekler.' },
  ],
};
// Söylenti başlıkları
export const Z_RUMORS = [
  'Duyduğuma göre kıyıda bu sabah büyük bir balık görülmüş!', 'Adanın öbür ucunda yeni bir çiçek türü açmış diyorlar.',
  'Rüstem yeni bir makine tasarlıyormuş, ama kimseye göstermiyor.', 'Hacer\'in domatesleri bu yıl çok iri olmuş.',
  'Kerem dün iki saat boyunca aynı balıkla uğraştı, sonunda balık kazandı!', 'Selin eski bir harita buldu. Hazine olabilir!',
  'Berkin gizlice kelebek koleksiyonu yapıyor, sakın söyleme.', 'Nermin\'in kirazlı turtası meşhur oldu.',
];
// Statik karakterler: konum ve görünüm
export const Z_NPCS = [
  { id: 'rustem', name: 'Rüstem', role: 'Ustabaşı', pers: 'çalışkan', fav: 'fish', x: -7.2, z: 21.6, ang: 0.3,
    look: { female: false, skin: '#c98f65', hair: '#2a1a10', hs: 4, outfit: 3, shirt: '#d98a2b', pants: '#4a4a52', hat: 3, hatCol: '#f1c232' } },
  { id: 'hacer', name: 'Hacer', role: 'Çiftçi', pers: 'çalışkan', fav: 'fruit', x: 16.2, z: 6.2, ang: -2.4,
    look: { female: true, skin: '#e8b48a', hair: '#5a3a1e', hs: 3, outfit: 1, shirt: '#7bc24a', pants: '#6b4a2e', hat: 2, hatCol: '#e8d28a' } },
];
// Başlangıç tarlası (hücre kaydırmaları); merkez
export const Z_FARM = { x: 13.5, z: 2.5, w: 4, h: 3 };
// Başlangıçta yerleştirilen süsler: [mobilya, x, z, dönüş]
export const Z_DECOR = [
  ['well', 5.2, -1.2, 0], ['bench', 0.2, 5.6, 0], ['bench', 4.2, 6.0, 0], ['flowerbed', -3.8, 1.8, 0], ['flowerbed', 7.8, 2.2, 0], ['flowerbed', 2.0, -2.4, 0],
  ['barrel', 8.5, -3.5, 0], ['crate', 9.5, -2.5, 0.3], ['mailbox', -11.5, -5.5, 0], ['mailbox', 7.5, -3.5, 0], ['scarecrow', 13.6, 5.9, 0],
  ['haybale', 17.6, 3.4, 0.4], ['haybale', 17.8, 2.0, 0], ['arch', -13, -4.9, 0], ['pot', 12.7, -3.5, 0], ['pot', 13.7, -3.5, 0],
  ['crate', -7.8, 19.4, 0.2], ['barrel', -6.6, 19.6, 0], ['stepstone', 0.5, 7.5, 0], ['stepstone', 1.5, 8.5, 0], ['stepstone', 2.5, 9.5, 0],
];
