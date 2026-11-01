/* ===================================================================
   HD doku sistemi: GPU'da üretilen, kusursuz döşenen (tileable) prosedürel dokular.
   Yüksek 512 · Ultra 1024 · Ultra+ 2048 px. Yalnız gerçekçi (low-poly olmayan) stilde çalışır.
   Build sırasında main.js içine (//@@HD@@ işaretine) eklenir.
   =================================================================== */
const HDU = {
  tTer: { value: null }, tM1: { value: null }, tM2: { value: null }, tWat: { value: null },
  uHD: { value: 0 }, uTexel: { value: 1 / 512 },
};
const HD = { size: 0, rts: [], ms: 0 };

/* ---- doku üretici shader'ları (periyodik gürültü: kenarlar dikişsiz birleşir) ---- */
const HD_LIB = `
#define TAU 6.28318530718
float h21(vec2 p){ vec3 q = fract(vec3(p.xyx) * .1031); q += dot(q, q.yzx + 33.33); return fract((q.x + q.y) * q.z); }
vec2 h22(vec2 p){ vec3 q = fract(vec3(p.xyx) * vec3(.1031, .1030, .0973)); q += dot(q, q.yzx + 33.33); return fract((q.xx + q.yz) * q.zy); }
float vnp(vec2 p, vec2 per){
  vec2 i = floor(p), f = fract(p); f = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
  return mix(mix(h21(mod(i, per)), h21(mod(i + vec2(1.0, 0.0), per)), f.x),
             mix(h21(mod(i + vec2(0.0, 1.0), per)), h21(mod(i + vec2(1.0, 1.0), per)), f.x), f.y);
}
float fbp(vec2 p, vec2 per, int oct){
  float s = 0.0, a = 0.5, t = 0.0;
  for (int i = 0; i < 6; i++) { if (i >= oct) break; s += a * vnp(p, per); t += a; p *= 2.0; per *= 2.0; a *= 0.5; }
  return s / t;
}
vec3 vor(vec2 p, vec2 per){
  vec2 i = floor(p), f = fract(p); float d1 = 9.0, d2 = 9.0, id = 0.0;
  for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) {
    vec2 g = vec2(float(x), float(y)); vec2 c = mod(i + g, per); vec2 o = h22(c); vec2 r = g + o - f; float d = dot(r, r);
    if (d < d1) { d2 = d1; d1 = d; id = h21(c + 7.7); } else if (d < d2) d2 = d;
  }
  return vec3(sqrt(d1), sqrt(d2), id);
}
float grass(vec2 uv){
  float pch = fbp(uv * 6.0, vec2(6.0), 4);
  float b1 = vnp(vec2(uv.x * 96.0, uv.y * 24.0), vec2(96.0, 24.0));
  float b2 = vnp(vec2(uv.x * 24.0, uv.y * 96.0), vec2(24.0, 96.0));
  float bl = mix(b1, b2, smoothstep(0.4, 0.6, vnp(uv * 5.0, vec2(5.0))));
  float fine = vnp(uv * 256.0, vec2(256.0));
  float clump = vor(uv * 14.0, vec2(14.0)).x;
  return clamp(0.5 + (pch - 0.5) * 0.55 + (bl - 0.5) * 0.46 + (fine - 0.5) * 0.24 + (0.38 - clump) * 0.34, 0.0, 1.0);
}
float sand(vec2 uv){
  float w = fbp(uv * 8.0, vec2(8.0), 3);
  float rip = 0.5 + 0.5 * sin(TAU * (uv.x * 18.0 + w * 1.6 + uv.y * 4.0));
  float grain = vnp(uv * 320.0, vec2(320.0));
  vec3 v = vor(uv * 22.0, vec2(22.0));
  float peb = smoothstep(0.16, 0.06, v.x) * (0.4 + 0.6 * v.z);
  return clamp(0.52 + (rip - 0.5) * 0.2 + (grain - 0.5) * 0.36 + (w - 0.5) * 0.26 - peb * 0.16, 0.0, 1.0);
}
float rock(vec2 uv){
  vec3 v = vor(uv * 7.0, vec2(7.0));
  float crack = smoothstep(0.0, 0.1, v.y - v.x);
  float strata = fbp(vec2(uv.x * 5.0, uv.y * 28.0), vec2(5.0, 28.0), 3);
  float rough = fbp(uv * 40.0, vec2(40.0), 4);
  float val = 0.5 + (v.z - 0.5) * 0.34 + (strata - 0.5) * 0.3 + (rough - 0.5) * 0.42;
  return clamp(val * (0.42 + 0.58 * crack), 0.0, 1.0);
}
float dirt(vec2 uv){
  float c = fbp(uv * 10.0, vec2(10.0), 5);
  vec3 v = vor(uv * 18.0, vec2(18.0));
  float fine = vnp(uv * 220.0, vec2(220.0));
  return clamp(0.48 + (c - 0.5) * 0.62 + (fine - 0.5) * 0.32 + (v.z - 0.5) * 0.22 - (1.0 - smoothstep(0.0, 0.5, v.x)) * 0.1, 0.0, 1.0);
}
float wood(vec2 uv){
  float warp = fbp(vec2(uv.x * 6.0, uv.y * 2.0), vec2(6.0, 2.0), 3);
  float ring = 0.5 + 0.5 * sin(TAU * (uv.x * 10.0 + warp * 2.2));
  float streak = vnp(vec2(uv.x * 64.0, uv.y * 3.0), vec2(64.0, 3.0));
  float pore = vnp(vec2(uv.x * 180.0, uv.y * 14.0), vec2(180.0, 14.0));
  return clamp(0.5 + (ring - 0.5) * 0.36 + (streak - 0.5) * 0.42 + (pore - 0.5) * 0.22, 0.0, 1.0);
}
float cloth(vec2 uv){
  vec2 p = uv * 64.0;
  float wv = sin(TAU * p.x) * sin(TAU * p.y);
  float tw = 0.5 + 0.5 * sin(TAU * (p.x + p.y) * 2.0);
  float slub = vnp(uv * vec2(16.0, 320.0), vec2(16.0, 320.0)) * 0.5 + vnp(uv * vec2(320.0, 16.0), vec2(320.0, 16.0)) * 0.5;
  return clamp(0.52 + wv * 0.17 + (tw - 0.5) * 0.1 + (slub - 0.5) * 0.3, 0.0, 1.0);
}
float stucco(vec2 uv){
  float a = fbp(uv * 12.0, vec2(12.0), 5), b = vnp(uv * 300.0, vec2(300.0));
  vec3 v = vor(uv * 30.0, vec2(30.0));
  return clamp(0.5 + (a - 0.5) * 0.52 + (b - 0.5) * 0.32 + (v.z - 0.5) * 0.12, 0.0, 1.0);
}
float leaf(vec2 uv){
  vec3 v = vor(uv * 24.0, vec2(24.0));
  float vein = smoothstep(0.0, 0.12, v.y - v.x);
  float fb = fbp(uv * 40.0, vec2(40.0), 4);
  return clamp(0.5 + (v.z - 0.5) * 0.46 + (fb - 0.5) * 0.36 + (vein - 0.5) * 0.3, 0.0, 1.0);
}
float shingle(vec2 uv){
  vec2 p = vec2(uv.x * 8.0, uv.y * 10.0);
  float row = floor(p.y), off = mod(row, 2.0) * 0.5;
  vec2 q = vec2(fract(p.x + off), fract(p.y));
  float id = h21(vec2(mod(floor(p.x + off), 8.0), mod(row, 10.0)));
  float gap = smoothstep(0.0, 0.1, q.y) * smoothstep(0.0, 0.07, q.x) * smoothstep(1.0, 0.93, q.x);
  float wear = vnp(uv * vec2(64.0, 80.0), vec2(64.0, 80.0));
  return clamp((0.5 + (id - 0.5) * 0.36 + q.y * 0.3 - 0.12 + (wear - 0.5) * 0.26) * (0.45 + 0.55 * gap), 0.0, 1.0);
}
float brick(vec2 uv){
  vec2 p = vec2(uv.x * 6.0, uv.y * 12.0);
  float row = floor(p.y), off = mod(row, 2.0) * 0.5;
  vec2 q = vec2(fract(p.x + off), fract(p.y));
  float id = h21(vec2(mod(floor(p.x + off), 6.0), mod(row, 12.0)));
  float mort = smoothstep(0.0, 0.06, q.x) * smoothstep(1.0, 0.94, q.x) * smoothstep(0.0, 0.1, q.y) * smoothstep(1.0, 0.9, q.y);
  float tex = fbp(uv * 48.0, vec2(48.0), 4);
  return clamp((0.55 + (id - 0.5) * 0.3 + (tex - 0.5) * 0.4) * (0.35 + 0.65 * mort), 0.0, 1.0);
}
float brushed(vec2 uv){
  float s = vnp(vec2(uv.x * 4.0, uv.y * 400.0), vec2(4.0, 400.0)), t = vnp(vec2(uv.x * 2.0, uv.y * 90.0), vec2(2.0, 90.0));
  return clamp(0.55 + (s - 0.5) * 0.3 + (t - 0.5) * 0.26, 0.0, 1.0);
}
float skin(vec2 uv){
  float pore = vnp(uv * 180.0, vec2(180.0)), blot = fbp(uv * 6.0, vec2(6.0), 3);
  return clamp(0.55 + (pore - 0.5) * 0.22 + (blot - 0.5) * 0.36, 0.0, 1.0);
}
float rip1(vec2 uv){
  float a = (1.0 - abs(vnp(uv * 16.0, vec2(16.0)) * 2.0 - 1.0)) * 0.5;
  a += (1.0 - abs(vnp(uv * 37.0, vec2(37.0)) * 2.0 - 1.0)) * 0.3;
  return a + fbp(uv * 64.0, vec2(64.0), 3) * 0.2;
}
float rip2(vec2 uv){
  float a = (1.0 - abs(vnp(vec2(uv.x * 24.0, uv.y * 11.0), vec2(24.0, 11.0)) * 2.0 - 1.0)) * 0.55;
  a += (1.0 - abs(vnp(vec2(uv.x * 71.0, uv.y * 53.0), vec2(71.0, 53.0)) * 2.0 - 1.0)) * 0.3;
  return a + fbp(uv * 96.0, vec2(96.0), 3) * 0.15;
}
`;
const HD_PATS = {
  ter: 'vec4 pat(vec2 uv){ return vec4(grass(uv), sand(uv), rock(uv), dirt(uv)); }',
  m1: 'vec4 pat(vec2 uv){ return vec4(wood(uv), cloth(uv), stucco(uv), leaf(uv)); }',
  m2: 'vec4 pat(vec2 uv){ return vec4(shingle(uv), brick(uv), brushed(uv), skin(uv)); }',
  wat: `uniform float uSize;
    vec2 gA(vec2 uv){ float e = 2.0 / uSize; return vec2(rip1(uv + vec2(e, 0.0)) - rip1(uv - vec2(e, 0.0)), rip1(uv + vec2(0.0, e)) - rip1(uv - vec2(0.0, e))) / (2.0 * e) * 0.022; }
    vec2 gB(vec2 uv){ float e = 2.0 / uSize; return vec2(rip2(uv + vec2(e, 0.0)) - rip2(uv - vec2(e, 0.0)), rip2(uv + vec2(0.0, e)) - rip2(uv - vec2(0.0, e))) / (2.0 * e) * 0.012; }
    vec4 pat(vec2 uv){ return vec4(0.5 + clamp(gA(uv), -0.5, 0.5), 0.5 + clamp(gB(uv), -0.5, 0.5)); }`,
};
const hdScene = new THREE.Scene(), hdCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
const hdQuad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.MeshBasicMaterial());
hdQuad.frustumCulled = false; hdScene.add(hdQuad);

function hdMake(size, pat) {
  const rt = new THREE.WebGLRenderTarget(size, size, {
    type: THREE.UnsignedByteType, format: THREE.RGBAFormat, depthBuffer: false, stencilBuffer: false, generateMipmaps: true,
    minFilter: THREE.LinearMipmapLinearFilter, magFilter: THREE.LinearFilter, wrapS: THREE.RepeatWrapping, wrapT: THREE.RepeatWrapping,
    anisotropy: renderer.capabilities.getMaxAnisotropy(),
  });
  const mat = new THREE.ShaderMaterial({
    uniforms: { uSize: { value: size } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
    fragmentShader: 'varying vec2 vUv;\n' + HD_LIB + pat + '\nvoid main(){ gl_FragColor = pat(vUv); }',
    depthTest: false, depthWrite: false,
  });
  hdQuad.material = mat;
  renderer.setRenderTarget(rt);
  renderer.render(hdScene, hdCam);
  mat.dispose();
  return rt;
}
function hdFree() {
  for (const r of HD.rts) r.dispose();
  HD.rts = []; HD.size = 0;
  HDU.tTer.value = HDU.tM1.value = HDU.tM2.value = HDU.tWat.value = null;
}
// size: istenen doku çözünürlüğü (0 = HD kapalı). Gerçekçi stil dışında HD kapanır.
function hdApply(size) {
  const cap = Math.min(size, renderer.capabilities.maxTextureSize, coarse ? 1024 : 4096);
  if (!isReal || cap < 256) { hdFree(); HDU.uHD.value = 0; return; }
  if (HD.size === cap && HD.rts.length === 4) { HDU.uHD.value = 1; return; }
  hdFree();
  const prevRT = renderer.getRenderTarget(), t0 = performance.now();
  try {
    HD.rts = [hdMake(cap, HD_PATS.ter), hdMake(cap, HD_PATS.m1), hdMake(cap, HD_PATS.m2), hdMake(cap, HD_PATS.wat)];
    HD.size = cap;
    HDU.tTer.value = HD.rts[0].texture; HDU.tM1.value = HD.rts[1].texture; HDU.tM2.value = HD.rts[2].texture; HDU.tWat.value = HD.rts[3].texture;
    HDU.uTexel.value = 1 / cap; HDU.uHD.value = 1;
  } catch (e) {
    console.warn('HD doku üretilemedi', e);
    hdFree(); HDU.uHD.value = 0;
  }
  renderer.setRenderTarget(prevRT);
  HD.ms = performance.now() - t0;
}

/* ---- mesh materyallerine HD detay ekleyen yama (üç eksenli = triplanar, nesne uzayı) ---- */
const HDK = { wood: [1, 0], cloth: [1, 1], stucco: [1, 2], leaf: [1, 3], roof: [2, 0], brick: [2, 1], metal: [2, 2], skin: [2, 3] };
const HD_MASK = ['vec4(1.0,0.0,0.0,0.0)', 'vec4(0.0,1.0,0.0,0.0)', 'vec4(0.0,0.0,1.0,0.0)', 'vec4(0.0,0.0,0.0,1.0)'];
const HD_PARS = `
uniform sampler2D tM1, tM2; uniform float uHD; varying vec3 vOP; varying vec3 vON;
float hdTri(sampler2D t, vec4 m, vec3 p, vec3 n) {
  vec3 w = abs(n); w = w * w; w = w * w; w /= (w.x + w.y + w.z + 1e-5);
  return dot(texture2D(t, p.zy), m) * w.x + dot(texture2D(t, p.xz), m) * w.y + dot(texture2D(t, p.xy), m) * w.z;
}
vec3 hdBump(vec3 sp, vec3 sn, vec2 dh, float fd) {
  vec3 sx = normalize(dFdx(sp)), sy = normalize(dFdy(sp));
  vec3 r1 = cross(sy, sn), r2 = cross(sn, sx);
  float det = dot(sx, r1) * fd;
  return normalize(abs(det) * sn - sign(det) * (dh.x * r1 + dh.y * r2));
}`;
// kind: HDK anahtarı · o.sc: nesne birimi başına doku tekrarı (sayı ya da [x,y,z]) · o.amt: renk etkisi · o.bump: kabartma gücü
function hdPatch(mat, kind, o) {
  o = o || {};
  const [tx, ch] = HDK[kind];
  const sc = Array.isArray(o.sc) ? o.sc : [o.sc || 3, o.sc || 3, o.sc || 3];
  const amt = o.amt === undefined ? 0.8 : o.amt, bump = o.bump === undefined ? 1.2 : o.bump;
  const f = (n) => Number(n).toFixed(3), tn = tx === 2 ? 'tM2' : 'tM1';
  const key = 'hd:' + kind + sc.join(',') + amt + bump + (o.id || '');
  const prev = mat.onBeforeCompile;
  mat.onBeforeCompile = (sh, rd) => {
    if (prev) prev(sh, rd);
    sh.uniforms.tM1 = HDU.tM1; sh.uniforms.tM2 = HDU.tM2; sh.uniforms.uHD = HDU.uHD;
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vOP; varying vec3 vON;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvOP = position; vON = normal;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\n' + HD_PARS)
      .replace('#include <color_fragment>', `#include <color_fragment>
        float hdL = 0.5;
        if (uHD > 0.5) {
          hdL = hdTri(${tn}, ${HD_MASK[ch]}, vOP * vec3(${sc.map(f).join(',')}), vON);
          diffuseColor.rgb *= mix(1.0, 0.4 + 1.2 * hdL, ${f(amt)});
        }`)
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
        if (uHD > 0.5) normal = hdBump(-vViewPosition, normal, clamp(vec2(dFdx(hdL), dFdy(hdL)) * ${f(bump)}, -0.5, 0.5), faceDirection);`);
  };
  mat.customProgramCacheKey = () => key;
  mat.needsUpdate = true;
  return mat;
}
