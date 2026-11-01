// Mini Dünya - mevsimler ve hava. Her üç modda da ortak, render'dan bağımsız (testlerde de çalışır).
// Mevsim gün sayısından gelir; hava ise mevsime göre ağırlıklandırılmış küçük bir durum makinesidir.
const SEASONS = [
  { id: 'spring', n: 'İlkbahar', i: '🌸', t: 14 }, { id: 'summer', n: 'Yaz', i: '☀️', t: 27 },
  { id: 'autumn', n: 'Sonbahar', i: '🍂', t: 11 }, { id: 'winter', n: 'Kış', i: '❄️', t: -3 },
];
const WEATHERS = {
  clear: { n: 'Açık', i: '☀️' }, cloudy: { n: 'Bulutlu', i: '☁️' }, rain: { n: 'Yağmur', i: '🌧️' },
  storm: { n: 'Fırtına', i: '⛈️' }, snow: { n: 'Kar', i: '❄️' }, fog: { n: 'Sis', i: '🌫️' },
};
// Her mevsimde hangi havanın ne kadar olası olduğu; [hava, ağırlık, süre aralığı (sn)]
const CL_TABLE = [
  [['clear', 3, [70, 150]], ['cloudy', 2.5, [40, 90]], ['rain', 3, [45, 100]], ['fog', 1, [30, 70]], ['storm', 0.5, [25, 50]]],
  [['clear', 5, [90, 180]], ['cloudy', 2, [40, 80]], ['rain', 1, [35, 70]], ['storm', 1.5, [25, 55]], ['fog', 0.4, [25, 50]]],
  [['clear', 2.5, [60, 120]], ['cloudy', 3, [45, 90]], ['rain', 3, [50, 110]], ['fog', 1.3, [35, 80]], ['storm', 0.4, [25, 50]]],
  [['clear', 2.5, [60, 120]], ['cloudy', 2.5, [40, 80]], ['snow', 3.5, [60, 130]], ['fog', 1, [30, 70]], ['storm', 0.5, [25, 50]]],
];
const CL = {
  days: 2, lockS: -1, lockW: '',
  pos: 0.4, season: 0, w: [1, 0, 0, 0],
  weather: 'clear', wT: 60, ext: false,
  rain: 0, snow: 0, fog: 0, storm: 0, cloud: 0.15, wind: 0.3, cover: 0, wet: 0, temp: 15, flowers: 1.3,
  boltT: 6, boltNow: false, onSeason: null, onWeather: null,
};
const clSm = (a, b, t) => { t = Math.min(1, Math.max(0, (t - a) / (b - a))); return t * t * (3 - 2 * t); };

// Gün kesri → mevsim konumu (0..4). Her mevsimin kenarında 0,2'lik yumuşak bir geçiş bölgesi var.
function clPos(dayF) { return ((dayF / CL.days + 0.2) % 4 + 4) % 4; }
function clWeights(pos, out) {
  out[0] = out[1] = out[2] = out[3] = 0;
  const s = Math.floor(pos) % 4, f = pos - Math.floor(pos);
  if (f < 0.2) { const t = clSm(0, 1, f / 0.2); out[s] = 0.5 + 0.5 * t; out[(s + 3) % 4] = 0.5 - 0.5 * t; }
  else if (f > 0.8) { const t = clSm(0, 1, (f - 0.8) / 0.2); out[s] = 1 - 0.5 * t; out[(s + 1) % 4] = 0.5 * t; }
  else out[s] = 1;
  return out;
}
function clPick(season) {
  const tb = CL_TABLE[season]; let sum = 0;
  for (const e of tb) sum += e[1];
  let r = Math.random() * sum;
  for (const e of tb) { r -= e[1]; if (r <= 0) return [e[0], e[2][0] + Math.random() * (e[2][1] - e[2][0])]; }
  return ['clear', 60];
}
function clSetWeather(w, dur) {
  if (w === CL.weather) { CL.wT = dur || CL.wT; return; }
  const old = CL.weather; CL.weather = w; CL.wT = dur || 120;
  if (CL.onWeather) CL.onWeather(old, w);
}
// Kullanıcının elle bastığı yağmur düğmesi: yağmurluysa durdurur, değilse (soğukta kar) başlatır.
function clToggleRain() {
  const wet = CL.weather === 'rain' || CL.weather === 'storm' || CL.weather === 'snow';
  if (CL.lockW) { CL.lockW = wet ? 'clear' : (CL.w[3] > 0.5 ? 'snow' : 'rain'); return; }
  clSetWeather(wet ? 'clear' : (CL.w[3] > 0.5 ? 'snow' : 'rain'), 120);
}
// dt: gerçek süre · gdt: oyun süresi (duraklatınca 0) · dayF: (gün-1)+günün kesri · hour: saat · ext: dışarıdan gelen hava (Ada: {rain, wetDay})
function clUpdate(dt, gdt, dayF, hour, ext) {
  const target = CL.lockS >= 0 ? CL.lockS + 0.5 : null;
  const wt = [0, 0, 0, 0];
  if (target !== null) clWeights(target, wt); else clWeights(clPos(dayF), wt);
  const kw = 1 - Math.exp(-dt * (target !== null ? 0.9 : 3));
  for (let i = 0; i < 4; i++) CL.w[i] += (wt[i] - CL.w[i]) * kw;
  let si = 0; for (let i = 1; i < 4; i++) if (CL.w[i] > CL.w[si]) si = i;
  if (si !== CL.season) { const old = CL.season; CL.season = si; if (CL.onSeason) CL.onSeason(old, si); }
  const cold = CL.w[3] > 0.45;
  // hava durumu: elle kilitli → sabit; Ada'da dışarıdan; değilse kendi makinesi
  if (CL.lockW) { if (CL.lockW !== CL.weather) clSetWeather(CL.lockW, 999); CL.wT = 999; }
  else if (ext) {
    CL.ext = true;
    clSetWeather(ext.rain ? (cold ? 'snow' : 'rain') : ext.wetDay ? 'cloudy' : 'clear', 999);
  } else {
    if (CL.ext) { CL.ext = false; CL.wT = 5; }
    CL.wT -= gdt;
    if (CL.wT <= 0) { const [w, d] = clPick(CL.season); clSetWeather(w, d); }
  }
  // soğuk/sıcak uyumsuzluğu: sıcakta kar yağmura, soğukta yağmur kara döner
  let wth = CL.weather;
  if (wth === 'snow' && !cold) wth = 'rain';
  const rainy = wth === 'rain' || wth === 'storm';
  const tg = {
    rain: rainy && !cold ? 1 : 0, snow: wth === 'snow' || (rainy && cold) ? 1 : 0, storm: wth === 'storm' ? 1 : 0,
    fog: wth === 'fog' ? 0.85 : 0, cloud: { clear: 0.12, cloudy: 0.6, rain: 0.8, storm: 1, snow: 0.8, fog: 0.5 }[wth],
  };
  // sabah sisi: sonbahar ve kışın en belirgin, gün doğumu civarında
  const mist = (CL.w[0] * 0.3 + CL.w[1] * 0.04 + CL.w[2] * 0.5 + CL.w[3] * 0.55) * Math.exp(-Math.pow((hour - 6.3) / 1.4, 2));
  tg.fog = Math.max(tg.fog, mist);
  const k = 1 - Math.exp(-dt * 0.7);
  CL.rain += (tg.rain - CL.rain) * k; CL.snow += (tg.snow - CL.snow) * k; CL.storm += (tg.storm - CL.storm) * k;
  CL.fog += (tg.fog - CL.fog) * k; CL.cloud += (tg.cloud - CL.cloud) * k;
  // yerdeki kar: kışın ve kar yağarken kalınlaşır, ısınınca erir
  const ct = Math.max(CL.snow > 0.5 ? 1 : 0, clSm(0.2, 0.8, CL.w[3]) * 0.85);
  CL.cover += (ct - CL.cover) * (1 - Math.exp(-dt * (ct > CL.cover ? 0.05 : 0.04)));
  const wetT = Math.max(CL.rain, CL.storm * 0.8, CL.snow * 0.35);
  CL.wet += (wetT - CL.wet) * (1 - Math.exp(-dt * (wetT > CL.wet ? 0.5 : 0.06)));   // yağmurdan sonra yer bir süre ıslak kalır
  CL.wind += ((0.25 + 0.55 * CL.storm + 0.15 * CL.rain + 0.1 * Math.sin(dayF * 9)) - CL.wind) * k;
  let base = 0; for (let i = 0; i < 4; i++) base += CL.w[i] * SEASONS[i].t;
  CL.temp = base + 5.5 * Math.sin((hour - 9) / 24 * Math.PI * 2) - CL.rain * 2 - CL.storm * 2 - CL.cloud * 1.5 - CL.fog;
  CL.flowers = CL.w[0] * 1.4 + CL.w[1] * 1 + CL.w[2] * 0.3;
  if (CL.storm > 0.6 && CL.snow < 0.5) {   // fırtınada uzaktan yıldırımlar çakar
    CL.boltT -= dt; if (CL.boltT <= 0) { CL.boltT = 3 + Math.random() * 9; CL.boltNow = true; }
  }
}
// Kayıt / yükleme (mevsim ve hava gün sayısından yeniden hesaplanır; yalnızca elle kilitler ve hava saklanır)
function clToJSON() { return { lockS: CL.lockS, lockW: CL.lockW, weather: CL.weather, wT: CL.wT, cover: CL.cover, wet: CL.wet }; }
function clFromJSON(d, dayF) {
  CL.lockS = d && typeof d.lockS === 'number' ? d.lockS : -1; CL.lockW = d && d.lockW || '';
  CL.weather = d && WEATHERS[d.weather] ? d.weather : 'clear'; CL.wT = d && d.wT > 0 ? d.wT : 40;
  CL.cover = d && d.cover || 0; CL.wet = d && d.wet || 0;
  CL.w = clWeights(CL.lockS >= 0 ? CL.lockS + 0.5 : clPos(dayF), [0, 0, 0, 0]);
  CL.season = CL.w.indexOf(Math.max(...CL.w));
  const cold = CL.w[3] > 0.45, wth = CL.weather;
  CL.rain = (wth === 'rain' || wth === 'storm') && !cold ? 1 : 0; CL.snow = wth === 'snow' || ((wth === 'rain' || wth === 'storm') && cold) ? 1 : 0;
  CL.storm = wth === 'storm' ? 1 : 0; CL.fog = wth === 'fog' ? 0.85 : 0; CL.cloud = wth === 'clear' ? 0.12 : 0.7;
}
// Yeni dünya: ilkbahar, açık hava
function clReset(dayF) { clFromJSON(null, dayF || 0.33); CL.cover = 0; CL.wet = 0; CL.wT = 70; }
function clBadge() {
  return SEASONS[CL.season].i + ' ' + SEASONS[CL.season].n + ' · ' + WEATHERS[CL.weather].i + ' ' + Math.round(CL.temp) + '°';
}
