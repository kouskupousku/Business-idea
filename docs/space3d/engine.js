// ============================================================================
//  DEEP FIELD: realistinen avaruusmoottori (three.js r170)
//  --------------------------------------------------------------------------
//  Rakennuspalikat sovelluksen 3D-näkymille: agenttikartta ja tiedostogalaksi.
//  Realismin periaatteet:
//   - Tähtien värit lasketaan mustan kappaleen lämpötilasta (Kelvin), ei valita käsin.
//   - Kirkkaus noudattaa potenssijakaumaa: paljon himmeitä, vähän kirkkaita.
//   - Kirkkaimmilla tähdillä JWST-tyyppiset diffraktiopiikit (6 + 2).
//   - Tähti: granulaatio + reunatummuminen (limb darkening, u = 0.6) + korona.
//   - Planeetta: pehmeä terminaattori, meren heijastus, pilvet, ilmakehän reuna
//     (Rayleigh-tyyppinen sininen sironta), rengas + planeetan varjo renkaassa.
//   - Kaikki säteily HDR-arvoina → bloom → filminen sävytys (ACES).
//  Kohinafunktio: Ashima Arts / Stefan Gustavson, "webgl-noise" (MIT-lisenssi).
// ============================================================================
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { Pass, FullScreenQuad } from 'three/addons/postprocessing/Pass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

// ---------------------------------------------------------------- apufunktiot
export function rng(seed = 1) {           // toistettava satunnaisluku
  let s = seed >>> 0 || 1;
  return () => ((s = Math.imul(s ^ (s >>> 15), 2246822507) ^ Math.imul(s ^ (s >>> 13), 3266489909), (s ^= s >>> 16) >>> 0) / 4294967296);
}

// Mustan kappaleen väri (lineaarinen RGB, normalisoitu). Tanner Hellandin approksimaatio.
export function kelvinToRGB(k) {
  const t = k / 100; let r, g, b;
  if (t <= 66) { r = 255; g = 99.4708025861 * Math.log(t) - 161.1195681661; }
  else { r = 329.698727446 * Math.pow(t - 60, -0.1332047592); g = 288.1221695283 * Math.pow(t - 60, -0.0755148492); }
  if (t >= 66) b = 255; else if (t <= 19) b = 0; else b = 138.5177312231 * Math.log(t - 10) - 305.0447927307;
  const c = (v) => Math.min(255, Math.max(0, v)) / 255;
  const col = new THREE.Color(c(r), c(g), c(b));
  return col.convertSRGBToLinear();
}

const NOISE = /* glsl */`
vec3 mod289(vec3 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 mod289(vec4 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 permute(vec4 x){return mod289(((x*34.0)+10.0)*x);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-0.85373472095314*r;}
float snoise(vec3 v){
  const vec2 C=vec2(1.0/6.0,1.0/3.0); const vec4 D=vec4(0.0,0.5,1.0,2.0);
  vec3 i=floor(v+dot(v,C.yyy)); vec3 x0=v-i+dot(i,C.xxx);
  vec3 g=step(x0.yzx,x0.xyz); vec3 l=1.0-g; vec3 i1=min(g.xyz,l.zxy); vec3 i2=max(g.xyz,l.zxy);
  vec3 x1=x0-i1+C.xxx; vec3 x2=x0-i2+C.yyy; vec3 x3=x0-D.yyy;
  i=mod289(i);
  vec4 p=permute(permute(permute(i.z+vec4(0.0,i1.z,i2.z,1.0))+i.y+vec4(0.0,i1.y,i2.y,1.0))+i.x+vec4(0.0,i1.x,i2.x,1.0));
  float n_=0.142857142857; vec3 ns=n_*D.wyz-D.xzx;
  vec4 j=p-49.0*floor(p*ns.z*ns.z); vec4 x_=floor(j*ns.z); vec4 y_=floor(j-7.0*x_);
  vec4 x=x_*ns.x+ns.yyyy; vec4 y=y_*ns.x+ns.yyyy; vec4 h=1.0-abs(x)-abs(y);
  vec4 b0=vec4(x.xy,y.xy); vec4 b1=vec4(x.zw,y.zw);
  vec4 s0=floor(b0)*2.0+1.0; vec4 s1=floor(b1)*2.0+1.0; vec4 sh=-step(h,vec4(0.0));
  vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy; vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
  vec3 p0=vec3(a0.xy,h.x); vec3 p1=vec3(a0.zw,h.y); vec3 p2=vec3(a1.xy,h.z); vec3 p3=vec3(a1.zw,h.w);
  vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
  p0*=norm.x; p1*=norm.y; p2*=norm.z; p3*=norm.w;
  vec4 m=max(0.5-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.0); m=m*m;
  return 105.0*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
}
float fbm(vec3 p,int oct){float a=0.5,s=0.0;for(int i=0;i<8;i++){if(i>=oct)break;s+=a*snoise(p);p=p*2.03+vec3(1.7,9.2,3.1);a*=0.5;}return s;}
float ridged(vec3 p,int oct){float a=0.5,s=0.0;for(int i=0;i<8;i++){if(i>=oct)break;s+=a*(1.0-abs(snoise(p)));p=p*2.05+vec3(3.1,1.3,7.7);a*=0.5;}return s;}
`;

// ---------------------------------------------------------------- renderöijä
export function createRenderer(canvas, { width, height, pixelRatio = Math.min(window.devicePixelRatio, 2) } = {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance', preserveDrawingBuffer: true });
  renderer.setPixelRatio(pixelRatio);
  renderer.setSize(width, height, false);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  return renderer;
}

// ---------------------------------------------------------------- oma bloom
// Deterministinen bloom: alasskaalaus, gaussinen sumennus ja ylösskaalaus tehdään täsmällisillä
// texelFetch-hauilla. Ei riipu laitteiston tekstuurisuodatuksesta → sama tulos kaikilla laitteilla
// (myös ohjelmistorenderöijillä, joilla UnrealBloomPass tuottaa neliöartefakteja).
const FSV = `varying vec2 vUv; void main(){ vUv=uv; gl_Position=vec4(position.xy,0.0,1.0); }`;
const BILERP = /* glsl */`
  vec4 bl(sampler2D t, vec2 uv){ ivec2 sz=textureSize(t,0); vec2 p=uv*vec2(sz)-0.5; ivec2 i=ivec2(floor(p)); vec2 f=fract(p); ivec2 m=sz-1;
    vec4 a=texelFetch(t,clamp(i,ivec2(0),m),0), b=texelFetch(t,clamp(i+ivec2(1,0),ivec2(0),m),0), c=texelFetch(t,clamp(i+ivec2(0,1),ivec2(0),m),0), d=texelFetch(t,clamp(i+ivec2(1,1),ivec2(0),m),0);
    return mix(mix(a,b,f.x),mix(c,d,f.x),f.y); }`;
export class SoftBloomPass extends Pass {
  constructor({ strength = 0.5, threshold = 1.0, knee = 0.6, levels = [4, 8, 16, 32], weights = [0.55, 0.45, 0.35, 0.3] } = {}) {
    super();
    this.strength = strength; this.levels = levels; this.weights = weights; this.rts = [];
    this.down = new THREE.ShaderMaterial({ uniforms: { tSrc: { value: null }, uF: { value: 2 }, uT: { value: threshold }, uK: { value: knee }, uFirst: { value: 1 } }, vertexShader: FSV,
      fragmentShader: /* glsl */`uniform sampler2D tSrc; uniform int uF; uniform float uT,uK; uniform int uFirst; varying vec2 vUv;
        void main(){ ivec2 o=ivec2(gl_FragCoord.xy)*uF; vec3 s=vec3(0.0); ivec2 m=textureSize(tSrc,0)-1;
          for(int y=0;y<8;y++){ if(y>=uF)break; for(int x=0;x<8;x++){ if(x>=uF)break; s+=texelFetch(tSrc,clamp(o+ivec2(x,y),ivec2(0),m),0).rgb; } }
          s/=float(uF*uF);
          if(uFirst==1){ float l=dot(s,vec3(0.2126,0.7152,0.0722)); s*=smoothstep(uT,uT+uK,l); }
          gl_FragColor=vec4(s,1.0); }` });
    this.blur = new THREE.ShaderMaterial({ uniforms: { tSrc: { value: null }, uDir: { value: new THREE.Vector2(1, 0) } }, vertexShader: FSV,
      fragmentShader: /* glsl */`uniform sampler2D tSrc; uniform vec2 uDir; varying vec2 vUv;
        void main(){ ivec2 p=ivec2(gl_FragCoord.xy); ivec2 m=textureSize(tSrc,0)-1; ivec2 d=ivec2(uDir); vec3 s=vec3(0.0); float w=0.0;
          for(int i=-8;i<=8;i++){ float g=exp(-float(i*i)/(2.0*4.0*4.0)); s+=g*texelFetch(tSrc,clamp(p+d*i,ivec2(0),m),0).rgb; w+=g; }
          gl_FragColor=vec4(s/w,1.0); }` });
    this.comp = new THREE.ShaderMaterial({ uniforms: { tBase: { value: null }, t0: { value: null }, t1: { value: null }, t2: { value: null }, t3: { value: null }, uW: { value: new THREE.Vector4() }, uS: { value: strength } }, vertexShader: FSV,
      fragmentShader: /* glsl */`uniform sampler2D tBase,t0,t1,t2,t3; uniform vec4 uW; uniform float uS; varying vec2 vUv;` + BILERP + `
        void main(){ vec4 b=texture2D(tBase,vUv); vec3 g=uW.x*bl(t0,vUv).rgb+uW.y*bl(t1,vUv).rgb+uW.z*bl(t2,vUv).rgb+uW.w*bl(t3,vUv).rgb;
          gl_FragColor=vec4(b.rgb+g*uS,b.a); }` });
    this.quad = new FullScreenQuad(null);
  }
  setSize(w, h) {
    this.rts.forEach((r) => { r.a.dispose(); r.b.dispose(); });
    this.rts = this.levels.map((f) => { const W = Math.max(1, Math.floor(w / f)), H = Math.max(1, Math.floor(h / f)); const o = { type: THREE.HalfFloatType, minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter, depthBuffer: false };
      return { a: new THREE.WebGLRenderTarget(W, H, o), b: new THREE.WebGLRenderTarget(W, H, o) }; });
  }
  render(renderer, writeBuffer, readBuffer) {
    if (!this.rts.length) this.setSize(readBuffer.width, readBuffer.height);
    let src = readBuffer.texture;
    this.rts.forEach((rt, i) => {
      this.down.uniforms.tSrc.value = src; this.down.uniforms.uF.value = i === 0 ? this.levels[0] : this.levels[i] / this.levels[i - 1]; this.down.uniforms.uFirst.value = i === 0 ? 1 : 0;
      this.quad.material = this.down; renderer.setRenderTarget(rt.a); this.quad.render(renderer);
      this.blur.uniforms.tSrc.value = rt.a.texture; this.blur.uniforms.uDir.value.set(1, 0); this.quad.material = this.blur; renderer.setRenderTarget(rt.b); this.quad.render(renderer);
      this.blur.uniforms.tSrc.value = rt.b.texture; this.blur.uniforms.uDir.value.set(0, 1); renderer.setRenderTarget(rt.a); this.quad.render(renderer);
      src = rt.a.texture;
    });
    const u = this.comp.uniforms; u.tBase.value = readBuffer.texture; u.uS.value = this.strength;
    [u.t0, u.t1, u.t2, u.t3].forEach((t, i) => (t.value = this.rts[Math.min(i, this.rts.length - 1)].a.texture));
    u.uW.value.set(...[0, 1, 2, 3].map((i) => (i < this.rts.length ? this.weights[i] : 0)));
    this.quad.material = this.comp; renderer.setRenderTarget(this.renderToScreen ? null : writeBuffer); this.quad.render(renderer);
  }
}

// Jälkikäsittely: bloom → filmirae + vinjetti + hienovarainen kromaattinen aberraatio → sävytys
export function createComposer(renderer, scene, camera, { bloom = 0.5, threshold = 1.0 } = {}) {
  const size = renderer.getSize(new THREE.Vector2());
  const composer = new EffectComposer(renderer, new THREE.WebGLRenderTarget(size.x * renderer.getPixelRatio(), size.y * renderer.getPixelRatio(), { type: THREE.HalfFloatType, samples: 4 }));
  composer.addPass(new RenderPass(scene, camera));
  const bloomPass = new SoftBloomPass({ strength: bloom, threshold });
  composer.addPass(bloomPass);
  const lens = new ShaderPass({
    uniforms: { tDiffuse: { value: null }, uTime: { value: 0 }, uGrain: { value: 0.018 }, uVignette: { value: 0.55 }, uCA: { value: 0.0012 } },
    vertexShader: `varying vec2 vUv; void main(){vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
    fragmentShader: /* glsl */`
      uniform sampler2D tDiffuse; uniform float uTime,uGrain,uVignette,uCA; varying vec2 vUv;
      float h(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233))+uTime)*43758.5453);}
      void main(){
        vec2 d=vUv-0.5; float r2=dot(d,d);
        vec3 c; c.r=texture2D(tDiffuse,vUv+d*uCA*r2*4.0).r; c.g=texture2D(tDiffuse,vUv).g; c.b=texture2D(tDiffuse,vUv-d*uCA*r2*4.0).b;
        c*=1.0-uVignette*smoothstep(0.15,0.75,r2*1.6);
        c+= (h(vUv*1000.0)-0.5)*uGrain*(0.35+c);   // rae näkyy enemmän valoisissa kohdissa, kuten filmillä
        gl_FragColor=vec4(max(c,0.0),1.0);
      }`
  });
  composer.addPass(lens);
  composer.addPass(new OutputPass());
  return { composer, bloomPass, lens };
}


// ---------------------------------------------------------------- instansoidut "pistesprittet"
// Luotettavampi kuin gl_PointCoord: toimii samoin kaikilla näytönohjaimilla eikä
// kärsi pistekoon ylärajoista. mode 'screen' = koko pikseleinä, 'world' = koko pienenee etäisyyden mukaan.
export function createSprites(positions, colors, sizes, { mode = 'screen', falloff = 14.0, halo = 0.05, gain = 1.0, worldK = 60.0, spikes = false } = {}) {
  const base = new THREE.PlaneGeometry(1, 1);
  const g = new THREE.InstancedBufferGeometry();
  g.index = base.index; g.setAttribute('position', base.getAttribute('position')); g.setAttribute('uv', base.getAttribute('uv'));
  g.setAttribute('iPos', new THREE.InstancedBufferAttribute(positions, 3));
  g.setAttribute('iCol', new THREE.InstancedBufferAttribute(colors, 3));
  g.setAttribute('iSize', new THREE.InstancedBufferAttribute(sizes, 1));
  g.instanceCount = sizes.length;
  const mat = new THREE.ShaderMaterial({
    uniforms: { uRes: { value: new THREE.Vector2(1, 1) }, uPR: { value: 1 }, uFall: { value: falloff }, uHalo: { value: halo }, uGain: { value: gain }, uK: { value: worldK } },
    defines: { WORLD: mode === 'world' ? 1 : 0, SPIKES: spikes ? 1 : 0 },
    vertexShader: /* glsl */`
      attribute vec3 iPos; attribute vec3 iCol; attribute float iSize;
      uniform vec2 uRes; uniform float uPR,uK; varying vec2 vUv; varying vec3 vC;
      void main(){
        vUv=uv*2.0-1.0; vC=iCol;
        vec4 mv=modelViewMatrix*vec4(iPos,1.0); vec4 cp=projectionMatrix*mv;
        float px=iSize*uPR*2.0;
        #if WORLD
          px=min(iSize*uPR*(uK/max(-mv.z,0.1)), 7.0*uPR);
        #endif
        cp.xy+=position.xy*px*2.0/uRes*cp.w;
        gl_Position=cp;
      }`,
    fragmentShader: /* glsl */`
      uniform float uFall,uHalo,uGain; varying vec2 vUv; varying vec3 vC;
      float spike(vec2 p,vec2 d,float w,float fall){ float al=dot(p,d); if(al<0.0)return 0.0; float pe=length(p-d*al); return exp(-pe*pe*w)*exp(-al*fall); }
      void main(){ float r=length(vUv); if(r>1.0)discard;
        float a=exp(-r*r*uFall)+uHalo*exp(-r*4.0);
        #if SPIKES
          // JWST: 6 pääpiikkiä 60° välein + 2 heikompaa vaakapiikkiä (kuvatason ilmiö → ruudun suuntainen)
          float sp=0.0;
          for(int i=0;i<6;i++){ float an=1.5707963+float(i)*1.0471976; sp+=spike(vUv,vec2(cos(an),sin(an)),1400.0,3.0); }
          sp+=0.4*spike(vUv,vec2(1.0,0.0),2200.0,5.0)+0.4*spike(vUv,vec2(-1.0,0.0),2200.0,5.0);
          a=exp(-r*r*uFall)*1.0+exp(-r*r*9.0)*0.10+sp*0.55;
        #endif
        a*=smoothstep(1.0,0.7,r);
        gl_FragColor=vec4(vC*a*uGain,1.0); }`,
    blending: THREE.AdditiveBlending, depthWrite: false, transparent: true
  });
  const mesh = new THREE.Mesh(g, mat); mesh.frustumCulled = false;
  mesh.userData.setViewport = (w, h, pr) => { mat.uniforms.uRes.value.set(w * pr, h * pr); mat.uniforms.uPR.value = pr; };
  return mesh;
}

// ---------------------------------------------------------------- tähtitaivas
// Linnunradan taso on kallistettu; tähtiä on enemmän sen lähellä.
export const GALACTIC_NORMAL = new THREE.Vector3(0.18, 0.92, -0.35).normalize();
export const GALACTIC_CENTER = new THREE.Vector3(-0.85, 0.05, -0.52).normalize();

function sampleTemperature(r) {
  const x = r();                         // karkea pääsarjan jakauma silmin nähtävillä tähdillä
  if (x < 0.08) return 2900 + r() * 700;    // M
  if (x < 0.38) return 3700 + r() * 1500;   // K
  if (x < 0.66) return 5200 + r() * 900;    // G
  if (x < 0.86) return 6100 + r() * 1300;   // F
  if (x < 0.97) return 7400 + r() * 2600;   // A
  return 10500 + r() * 18000;               // B
}

export function createStarfield({ count = 26000, radius = 900, seed = 7, spikes = true } = {}) {
  const r = rng(seed);
  const pos = new Float32Array(count * 3), col = new Float32Array(count * 3), size = new Float32Array(count);
  const n = GALACTIC_NORMAL; const tmp = new THREE.Vector3();
  const bright = [];
  for (let i = 0; i < count; i++) {
    // painotettu näytteistys: hyväksy/hylkää galaktisen leveyden mukaan
    let v;
    for (;;) {
      tmp.set(r() * 2 - 1, r() * 2 - 1, r() * 2 - 1); const l = tmp.length(); if (l > 1 || l < 1e-3) continue;
      tmp.divideScalar(l); const b = Math.asin(Math.abs(tmp.dot(n)));
      const w = 0.25 + 1.9 * Math.exp(-Math.pow(b / 0.22, 2));
      if (r() * 2.2 < w) { v = tmp.clone(); break; }
    }
    pos.set([v.x * radius, v.y * radius, v.z * radius], i * 3);
    const T = sampleTemperature(r);
    const c = kelvinToRGB(T);
    // himmeät tähdet näyttävät silmälle vähemmän värikkäiltä → sekoita valkoiseen
    const m = Math.pow(r(), 9.5);                 // kirkkausjakauma: paljon himmeitä
    const sat = 0.35 + 0.5 * Math.min(1, m * 6);
    c.lerp(new THREE.Color(1, 1, 1), 1 - sat);
    const lum = 0.12 + m * 3.2;                   // HDR-kirkkaus
    col.set([c.r * lum, c.g * lum, c.b * lum], i * 3);
    size[i] = 0.9 + Math.sqrt(m) * 2.2;
    if (m > 0.55) bright.push({ v, c: kelvinToRGB(T), m });
  }
  const points = createSprites(pos, col, size, { mode: 'screen', falloff: 9.0, halo: 0.04 });
  points.userData.setPixelRatio = () => {};

  // Diffraktiopiikit kirkkaimmille (JWST: 6 pääpiikkiä 60° välein + 2 heikkoa vaakapiikkiä)
  const group = new THREE.Group(); group.add(points);
  if (spikes) {
    const top = bright.sort((a, b) => b.m - a.m).slice(0, 320);   // ~1 % kirkkaimmista → piikkejä näkyy joka suunnassa
    const sp = new Float32Array(top.length * 3), sc = new Float32Array(top.length * 3), ss = new Float32Array(top.length);
    top.forEach((s, i) => { sp.set([s.v.x * radius * 0.99, s.v.y * radius * 0.99, s.v.z * radius * 0.99], i * 3);
      const k = 1 - i / top.length; const c = s.c.clone().lerp(new THREE.Color(1, 1, 1), 0.4).multiplyScalar(0.45 + 1.6 * k * k); sc.set([c.r, c.g, c.b], i * 3); ss[i] = 9 + 30 * k * k * k; });
    const spikeMesh = createSprites(sp, sc, ss, { mode: 'screen', falloff: 220.0, spikes: true });
    group.add(spikeMesh); group.userData.spikeMesh = spikeMesh;
  }
  group.userData.setViewport = (w, h, pr) => { points.userData.setViewport(w, h, pr); group.userData.spikeMesh && group.userData.spikeMesh.userData.setViewport(w, h, pr); };
  return group;
}

export function makeSpikeTexture(size = 256) {
  const c = document.createElement('canvas'); c.width = c.height = size; const x = c.getContext('2d');
  const h = size / 2; x.translate(h, h); x.globalCompositeOperation = 'lighter';
  const spike = (ang, len, w, a) => { x.save(); x.rotate(ang); const g = x.createLinearGradient(0, 0, len, 0); g.addColorStop(0, `rgba(255,255,255,${a})`); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.beginPath(); x.moveTo(0, -w); x.lineTo(len, 0); x.lineTo(0, w); x.fill(); x.restore(); };
  for (let i = 0; i < 6; i++) spike(Math.PI / 2 + i * Math.PI / 3, h * 0.98, 1.6, 0.9);
  spike(0, h * 0.55, 0.9, 0.35); spike(Math.PI, h * 0.55, 0.9, 0.35);
  const g = x.createRadialGradient(0, 0, 0, 0, 0, h * 0.22); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.25, 'rgba(255,255,255,.45)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = g; x.beginPath(); x.arc(0, 0, h * 0.22, 0, 7); x.fill();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

// Mysteriousin brändisumu: H-alfa (punainen) + heijastussumu (sininen) → luonnollinen violetti
export const BRAND_NEBULA = { nebColA: new THREE.Color(0.62, 0.22, 0.78), nebColB: new THREE.Color(0.42, 0.34, 0.95) };
// Linnunrata + heikot sumut taustapallolla (proseduraalinen, kevyt)
export function createSky({ radius = 1000, intensity = 1.0, nebula = 1.0, nebColA = new THREE.Color(0.85, 0.20, 0.22), nebColB = new THREE.Color(0.25, 0.55, 0.60), nebDir = new THREE.Vector3(0.55, 0.25, -0.80) } = {}) {
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false,
    uniforms: { uN: { value: GALACTIC_NORMAL }, uGC: { value: GALACTIC_CENTER }, uI: { value: intensity }, uNeb: { value: nebula }, uNA: { value: nebColA }, uNB: { value: nebColB }, uND: { value: nebDir.clone().normalize() } },
    vertexShader: `varying vec3 vDir; void main(){ vDir=normalize(position); gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);} `,
    fragmentShader: NOISE + /* glsl */`
      uniform vec3 uN,uGC,uNA,uNB,uND; uniform float uI,uNeb; varying vec3 vDir;
      void main(){
        vec3 d=normalize(vDir);
        float b=asin(clamp(dot(d,uN),-1.0,1.0));
        float toC=0.5+0.5*dot(d,uGC);
        float width=0.16+0.10*toC;
        float band=exp(-pow(b/width,2.0));
        float cloud=0.55+0.45*fbm(d*3.2,6);
        float fine=0.6+0.4*fbm(d*14.0,4);
        float dust=smoothstep(0.05,0.55,ridged(d*5.5+vec3(2.0),5)-0.55)*exp(-pow(b/(width*0.45),2.0));
        float bulge=exp(-pow(acos(clamp(dot(d,uGC),-1.0,1.0))/0.45,2.0));
        vec3 warm=vec3(1.0,0.82,0.62), cool=vec3(0.70,0.80,1.0);
        vec3 col=mix(cool,warm,smoothstep(0.35,1.0,toC));
        float L=band*cloud*fine*(0.05+0.09*toC)+bulge*0.10*cloud;
        L*=1.0-0.85*dust;
        vec3 c=col*L;
        // heikko H-alfa -emissiosumu (punertava) ja OIII (sinivihreä) yhdessä suunnassa
        vec3 nd=uND;
        float nm=exp(-pow(acos(clamp(dot(d,nd),-1.0,1.0))/0.20,2.0));
        float neb=max(0.0,fbm(d*9.0+vec3(5.0),6)+0.15)*nm;
        float filaments=pow(max(0.0,ridged(d*16.0,5)-0.62),2.0)*nm*3.0;
        c+=uNeb*(uNA*neb*0.10+uNB*filaments*0.08);
        // syvä tausta ei ole täysin musta: hyvin heikko ilmanhehku/hajavalo
        c+=vec3(0.0025,0.0030,0.0045);
        gl_FragColor=vec4(c*uI,1.0);
      }`
  });
  return new THREE.Mesh(new THREE.SphereGeometry(radius, 64, 32), mat);
}

// ---------------------------------------------------------------- tähti (Claude)
export function createStar({ radius = 3, temperature = 5200, seed = 1 } = {}) {
  const base = kelvinToRGB(temperature);
  const group = new THREE.Group();
  const surf = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uCol: { value: base }, uSeed: { value: seed } },
    vertexShader: `varying vec3 vN,vP,vV; void main(){ vP=position; vN=normalize(normalMatrix*normal); vec4 mv=modelViewMatrix*vec4(position,1.0); vV=normalize(-mv.xyz); gl_Position=projectionMatrix*mv; }`,
    fragmentShader: NOISE + /* glsl */`
      uniform float uTime,uSeed; uniform vec3 uCol; varying vec3 vN,vP,vV;
      void main(){
        vec3 p=normalize(vP);
        // granulaatio: solumainen rakenne (konvektiosolujen kirkkaat keskustat, tummat rajat)
        float cells=1.0-abs(snoise(p*34.0+vec3(uTime*0.03,uSeed,0.0)));
        float gran=0.6*cells*cells+0.4*(0.5+0.5*fbm(p*70.0+vec3(uSeed),3));
        float sup=0.5+0.5*fbm(p*7.0+vec3(0.0,uTime*0.01,uSeed),4);          // supergranulaatio
        float spots=smoothstep(0.58,0.74,fbm(p*3.2+vec3(uSeed*3.0),5));       // auringonpilkut
        float mu=clamp(dot(normalize(vN),normalize(vV)),0.0,1.0);
        float limb=1.0-0.62*(1.0-mu)-0.18*(1.0-mu)*(1.0-mu);                  // reunatummuminen (kvadraattinen laki)
        float fac=smoothstep(0.55,0.95,fbm(p*18.0+vec3(7.0),4))*(1.0-mu)*0.5;  // fakulat: kirkkaita alueita reunalla
        float I=(0.78+0.30*gran+0.12*sup+fac)*limb*(1.0-0.7*spots);
        vec3 hot=uCol*vec3(1.0,0.93,0.82), cool=uCol*vec3(1.0,0.55,0.25);
        vec3 c=mix(cool,hot,smoothstep(0.15,1.0,mu*I))*I*1.7;
        gl_FragColor=vec4(c,1.0);
      }`
  });
  const sphere = new THREE.Mesh(new THREE.SphereGeometry(radius, 96, 64), surf);
  group.add(sphere);
  // korona: kameraa kohti kääntyvä taso, säteittäiset virtausjuovat
  const corona = new THREE.ShaderMaterial({
    uniforms: { uCol: { value: base.clone().lerp(new THREE.Color(1, 1, 1), 0.3) }, uTime: { value: 0 } },
    vertexShader: `varying vec2 vUv; void main(){ vUv=uv*2.0-1.0; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);} `,
    fragmentShader: NOISE + /* glsl */`
      uniform vec3 uCol; uniform float uTime; varying vec2 vUv;
      void main(){ float r=length(vUv); float a=atan(vUv.y,vUv.x);
        float R=0.25; if(r<R*0.98)discard;
        float fall=(exp(-(r-R)*16.0)*0.9+exp(-(r-R)*4.0)*0.07)*smoothstep(1.0,0.55,r);
        float streak=0.65+0.35*fbm(vec3(cos(a)*3.0,sin(a)*3.0,r*1.5-uTime*0.02),5);
        gl_FragColor=vec4(uCol*fall*streak*1.6,1.0); }`,
    blending: THREE.AdditiveBlending, depthWrite: false, transparent: true
  });
  const plane = new THREE.Mesh(new THREE.PlaneGeometry(radius * 8, radius * 8), corona);
  plane.userData.billboard = true;
  group.add(plane);
  group.userData.tick = (t, camera) => { surf.uniforms.uTime.value = t; corona.uniforms.uTime.value = t; plane.quaternion.copy(camera.quaternion); };
  group.userData.color = base;
  return group;
}

// ---------------------------------------------------------------- planeetta (ChatGPT)
export function createPlanet({ radius = 2, lightPos = new THREE.Vector3(), seed = 3, ocean = new THREE.Color(0.02, 0.16, 0.15), land = new THREE.Color(0.20, 0.17, 0.12), rings = true, cities = 0.0, detail = 1.0, freq = 1.0 } = {}) {
  const group = new THREE.Group();
  const uniforms = { uL: { value: lightPos.clone() }, uSeed: { value: seed }, uOcean: { value: ocean }, uLand: { value: land }, uTime: { value: 0 }, uC: { value: new THREE.Vector3() }, uR: { value: radius }, uCity: { value: cities }, uDet: { value: detail }, uFreq: { value: freq } };
  const mat = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: `varying vec3 vN,vP,vW; void main(){ vP=position; vN=normalize(mat3(modelMatrix)*normal); vec4 w=modelMatrix*vec4(position,1.0); vW=w.xyz; gl_Position=projectionMatrix*viewMatrix*w; }`,
    fragmentShader: NOISE + /* glsl */`
      uniform vec3 uL,uOcean,uLand; uniform float uSeed,uTime,uCity,uDet,uFreq; varying vec3 vN,vP,vW;
      void main(){
        vec3 p=normalize(vP); vec3 N=normalize(vN); vec3 L=normalize(uL-vW); vec3 V=normalize(cameraPosition-vW);
        // domain warping → luonnollisemmat mantereet ja rannikot
        vec3 pf=p*uFreq;   // suurella planeetalla läheltä katsottuna maasto tarvitsee korkeamman taajuuden
        vec3 w=vec3(fbm(pf*1.6+vec3(uSeed),4),fbm(pf*1.6+vec3(5.2,uSeed,1.3),4),fbm(pf*1.6+vec3(1.7,9.2,uSeed),4));
        vec3 q=pf+0.38*w;
        float h=fbm(q*2.1+vec3(uSeed),7);
        float landMask=smoothstep(0.06,0.11,h);
        float depth=smoothstep(-0.35,0.08,h);
        vec3 deep=uOcean*0.45, shallow=uOcean*1.5+vec3(0.0,0.03,0.03);
        vec3 sea=mix(deep,shallow,depth*depth);
        float veg=smoothstep(-0.15,0.35,fbm(q*5.0+vec3(3.0),5));
        float mtn=smoothstep(0.32,0.6,h)*0.6;
        vec3 desert=uLand*1.35, forest=vec3(0.045,0.075,0.04);
        vec3 ground=mix(desert,forest,veg*(1.0-smoothstep(0.55,0.75,abs(p.y)))) * (0.75+0.5*fbm(q*22.0,4));
        ground=mix(ground,vec3(0.42,0.40,0.37),mtn);
        if(uDet>1.0) ground*=0.8+0.4*fbm(q*90.0,4);   // lähikuvassa lisää pintayksityiskohtaa
        float lat=abs(p.y); float ice=smoothstep(0.80,0.9,lat+0.07*fbm(p*9.0,3));
        vec3 surf=mix(sea,ground,landMask);
        surf=mix(surf,vec3(0.80,0.84,0.88),ice);
        // pilvet: venytetty leveyspiirien suuntaan, ohuita hattaroita + rintamia
        vec3 cp=vec3(q.x*2.6,q.y*5.5,q.z*2.6)+vec3(uTime*0.004,0.0,uSeed+4.0);
        float cden=fbm(cp+0.6*w,7)*0.65+0.35*(ridged(cp*1.7,5)-0.55);
        float clouds=smoothstep(0.02,0.42,cden);
        float NL=dot(N,L);
        float day=smoothstep(-0.08,0.25,NL);                      // pehmeä terminaattori
        vec3 H=normalize(L+V); float spec=pow(max(dot(N,H),0.0),80.0)*(1.0-landMask)*(1.0-clouds)*0.9;
        vec3 lit=surf*max(NL,0.0)*1.6+vec3(1.0,0.95,0.85)*spec;
        vec3 cl=vec3(1.0)*clouds*max(NL+0.05,0.0)*1.5;
        vec3 c=mix(lit,cl,clouds*0.9);
        // terminaattorin lämmin sävy (valo kulkee ilmakehän läpi)
        c+=vec3(0.9,0.35,0.15)*exp(-pow(NL/0.08,2.0))*0.10;
        c*=day*0.98+0.02;
        // yöpuolen kaupunkivalot (vain maalla, pilvet himmentävät)
        if(uCity>0.0){ float cityN=fbm(q*9.0+vec3(2.0),5); float cityM=fbm(q*1.3+vec3(9.0),3);
          float lights=pow(smoothstep(0.15,0.7,cityN),2.0)*smoothstep(-0.05,0.35,cityM)*landMask*(1.0-ice);
          c+=vec3(1.0,0.66,0.32)*lights*uCity*(1.0-smoothstep(-0.12,0.05,NL))*(1.0-clouds*0.8); }
        gl_FragColor=vec4(c,1.0);
      }`
  });
  const body = new THREE.Mesh(new THREE.SphereGeometry(radius, 128, 96), mat);
  group.add(body);
  // Ilmakehä: säteenkulku kuoren läpi (8 näytettä), eksponentiaalinen tiheys korkeuden mukaan,
  // Rayleigh-sironta (sininen, aallonpituusriippuvainen) + Mie (lämmin halo vastavalossa).
  // Toimii samalla tavalla kaukaa (ohut sininen reuna) ja läheltä (horisontin ilmakehäkerros).
  const Ra = radius * 1.035;
  const atm = new THREE.ShaderMaterial({
    uniforms: { uL: uniforms.uL, uC: uniforms.uC, uR: { value: radius }, uRa: { value: Ra } },
    vertexShader: `varying vec3 vW; void main(){ vec4 w=modelMatrix*vec4(position,1.0); vW=w.xyz; gl_Position=projectionMatrix*viewMatrix*w; }`,
    fragmentShader: /* glsl */`
      uniform vec3 uL,uC; uniform float uR,uRa; varying vec3 vW;
      vec2 rs(vec3 o,vec3 d,float r){ vec3 oc=o-uC; float b=dot(oc,d); float c=dot(oc,oc)-r*r; float h=b*b-c; if(h<0.0)return vec2(1e9,-1e9); h=sqrt(h); return vec2(-b-h,-b+h); }
      void main(){
        vec3 ro=cameraPosition; vec3 rd=normalize(vW-ro);
        vec2 ta=rs(ro,rd,uRa); vec2 tp=rs(ro,rd,uR);
        float t0=max(ta.x,0.0), t1=ta.y; if(tp.x>0.0) t1=min(t1,tp.x);
        if(t1<=t0) discard;
        vec3 L=normalize(uL-uC); float H=(uRa-uR)*0.25; float seg=(t1-t0)/8.0;
        const vec3 beta=vec3(0.18,0.42,1.0);
        vec3 sumR=vec3(0.0); float sumM=0.0; float od=0.0;
        for(int i=0;i<8;i++){
          vec3 P=ro+rd*(t0+seg*(float(i)+0.5)); vec3 up=normalize(P-uC); float h=max(length(P-uC)-uR,0.0);
          float d=exp(-h/H)*seg/H; od+=d;
          float mu=dot(up,L); float sunVis=smoothstep(-0.18,0.25,mu);
          vec3 sunCol=mix(vec3(1.0,0.45,0.18),vec3(1.0),smoothstep(-0.05,0.35,mu));   // auringonnousun punertuma
          vec3 att=exp(-beta*od*0.045);
          sumR+=d*sunVis*att*sunCol; sumM+=d*sunVis*att.g;
        }
        float ct=dot(rd,L); float phR=0.75*(1.0+ct*ct);
        float g=0.8; float phM=(1.0-g*g)/pow(1.0+g*g-2.0*g*ct,1.5)*0.08;
        vec3 col=sumR*beta*phR*0.055+vec3(1.0,0.78,0.55)*sumM*phM*0.06;
        gl_FragColor=vec4(col,1.0);
      }`,
    blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, side: THREE.FrontSide
  });
  const shell = new THREE.Mesh(new THREE.SphereGeometry(Ra, 128, 96), atm);
  group.add(shell);
  if (rings) {
    const rIn = radius * 1.45, rOut = radius * 2.35;
    const rg = new THREE.RingGeometry(rIn, rOut, 256, 1);
    const ringMat = new THREE.ShaderMaterial({
      uniforms: { uL: uniforms.uL, uIn: { value: rIn }, uOut: { value: rOut }, uC: uniforms.uC, uR: uniforms.uR },
      vertexShader: `varying vec3 vW; varying vec3 vLoc; void main(){ vLoc=position; vec4 w=modelMatrix*vec4(position,1.0); vW=w.xyz; gl_Position=projectionMatrix*viewMatrix*w; }`,
      fragmentShader: NOISE + /* glsl */`
        uniform vec3 uL,uC; uniform float uIn,uOut,uR; varying vec3 vW,vLoc;
        void main(){ float r=length(vLoc.xy); float t=(r-uIn)/(uOut-uIn);
          float bands=0.55+0.45*snoise(vec3(r*6.0,0.0,0.0))*0.6+0.25*snoise(vec3(r*31.0,1.0,0.0));
          float gap=smoothstep(0.02,0.0,abs(t-0.62)-0.015);
          float edge=smoothstep(0.0,0.06,t)*smoothstep(1.0,0.9,t);
          float a=clamp(bands,0.0,1.0)*edge*(1.0-gap*0.9)*0.75;
          // planeetan varjo renkaassa: osuuko säde kohti valoa planeettaan?
          vec3 L=normalize(uL-vW); vec3 oc=vW-uC; float b=dot(oc,L); float c=dot(oc,oc)-uR*uR; float h=b*b-c;
          float shadow=(h>0.0&&b<0.0)?0.08:1.0;
          vec3 col=vec3(0.78,0.74,0.66)*a*shadow*1.3;
          gl_FragColor=vec4(col,a); }`,
      transparent: true, side: THREE.DoubleSide, depthWrite: false
    });
    const ring = new THREE.Mesh(rg, ringMat);
    ring.rotation.x = -Math.PI / 2 + 0.38; ring.rotation.y = 0.25;
    group.add(ring);
  }
  group.userData.tick = (t) => { uniforms.uTime.value = t; group.getWorldPosition(uniforms.uC.value); };
  group.userData.setLight = (v) => uniforms.uL.value.copy(v);
  return group;
}

// ---------------------------------------------------------------- pulsari (Grok)
export function createPulsar({ size = 0.35, tilt = 0.5, color = new THREE.Color(0.56, 0.78, 1.0) } = {}) {
  const group = new THREE.Group();
  const core = new THREE.Mesh(new THREE.SphereGeometry(size, 48, 32), new THREE.MeshBasicMaterial({ color: color.clone().lerp(new THREE.Color(1, 1, 1), 0.6).multiplyScalar(5) }));
  group.add(core);
  // hehku (billboard)
  const glowMat = new THREE.ShaderMaterial({
    uniforms: { uCol: { value: color } },
    vertexShader: `varying vec2 vUv; void main(){ vUv=uv*2.0-1.0; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);} `,
    fragmentShader: `uniform vec3 uCol; varying vec2 vUv; void main(){ float r=length(vUv); float g=(exp(-r*r*60.0)*1.4+exp(-r*5.0)*0.10)*smoothstep(1.0,0.6,r); gl_FragColor=vec4(uCol*g*1.6,1.0);} `,
    blending: THREE.AdditiveBlending, depthWrite: false, transparent: true
  });
  const glow = new THREE.Mesh(new THREE.PlaneGeometry(size * 26, size * 26), glowMat); group.add(glow);
  // magneettiakseli on kallistettu pyörimisakselista → säteet pyyhkivät avaruutta
  const axis = new THREE.Group(); axis.rotation.z = tilt; group.add(axis);
  const beamMat = new THREE.ShaderMaterial({
    uniforms: { uCol: { value: color } },
    vertexShader: `varying vec2 vUv; varying vec3 vN,vW; void main(){ vUv=uv; vN=normalize(mat3(modelMatrix)*normal); vec4 w=modelMatrix*vec4(position,1.0); vW=w.xyz; gl_Position=projectionMatrix*viewMatrix*w; }`,
    fragmentShader: `uniform vec3 uCol; varying vec2 vUv; varying vec3 vN,vW;
      void main(){ vec3 V=normalize(cameraPosition-vW); float side=pow(abs(dot(normalize(vN),V)),1.5);
        float along=pow(vUv.y,3.0); float a=side*along; gl_FragColor=vec4(uCol*a*0.4,1.0);} `,
    blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, side: THREE.DoubleSide
  });
  const len = size * 30;
  for (const s of [1, -1]) {
    const cone = new THREE.Mesh(new THREE.ConeGeometry(size * 1.5, len, 48, 1, true), beamMat);
    cone.position.y = s * len / 2; if (s > 0) cone.rotation.x = Math.PI; axis.add(cone);
  }
  // magnetosfääri: heikot dipolikenttäviivat
  const lineMat = new THREE.LineBasicMaterial({ color: color.clone().multiplyScalar(0.55), transparent: true, opacity: 0.16, blending: THREE.AdditiveBlending, depthWrite: false });
  for (let k = 0; k < 10; k++) {
    const phi = (k / 10) * Math.PI * 2, L = size * (4 + (k % 3) * 2.2); const pts = [];
    for (let i = 0; i <= 80; i++) { const th = 0.12 + (i / 80) * (Math.PI - 0.24); const r = L * Math.sin(th) ** 2; pts.push(new THREE.Vector3(r * Math.sin(th) * Math.cos(phi), r * Math.cos(th), r * Math.sin(th) * Math.sin(phi))); }
    axis.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), lineMat));
  }
  // tuulisumu (pulsar wind nebula) – hyvin heikko torus
  group.userData.tick = (t, camera) => { group.rotation.y = t * 0.9; glow.quaternion.copy(camera.quaternion); glow.quaternion.premultiply(group.quaternion.clone().invert()); };
  return group;
}

// ---------------------------------------------------------------- avaruusasema (missio)
export function createStation({ scale = 1 } = {}) {
  const g = new THREE.Group();
  // Materiaalit: valkoinen eristepeite (MLI), harjattu metalli, kultakalvo, aurinkokennot
  const mliTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 256; const x = c.getContext('2d');
    x.fillStyle = '#d9d8d3'; x.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 1400; i++) { x.fillStyle = `rgba(${150 + Math.random() * 60},${150 + Math.random() * 60},${150 + Math.random() * 60},.08)`; x.fillRect(Math.random() * 256, Math.random() * 256, 2 + Math.random() * 18, 1 + Math.random() * 3); }
    x.strokeStyle = 'rgba(90,90,90,.35)'; x.lineWidth = 2; for (let k = 0; k <= 256; k += 64) { x.beginPath(); x.moveTo(0, k); x.lineTo(256, k); x.stroke(); }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(3, 1); return t; })();
  const white = new THREE.MeshStandardMaterial({ map: mliTex, metalness: 0.0, roughness: 0.82 });
  const metal = new THREE.MeshStandardMaterial({ color: 0x9da2aa, metalness: 0.9, roughness: 0.35 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x2a2d33, metalness: 0.6, roughness: 0.5 });
  const gold = new THREE.MeshStandardMaterial({ color: 0xd4a84f, metalness: 1.0, roughness: 0.28 });
  const cellsTex = (() => { const c = document.createElement('canvas'); c.width = 128; c.height = 512; const x = c.getContext('2d');
    x.fillStyle = '#05070c'; x.fillRect(0, 0, 128, 512);
    for (let i = 0; i < 4; i++) for (let j = 0; j < 32; j++) { x.fillStyle = `rgb(${18 + (i * 7 + j * 3) % 9},${26 + (i * 5 + j) % 10},${52 + (i * 3 + j * 7) % 16})`; x.fillRect(i * 32 + 1.5, j * 16 + 1, 29, 14); }
    x.fillStyle = '#7d6a3a'; x.fillRect(62, 0, 4, 512); x.fillRect(0, 254, 128, 4);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; })();
  const cells = new THREE.MeshStandardMaterial({ map: cellsTex, metalness: 0.55, roughness: 0.22, side: THREE.DoubleSide });
  const cyl = (r, l, m, seg = 40) => new THREE.Mesh(new THREE.CylinderGeometry(r, r, l, seg), m);
  // paineistetut moduulit ristikkona
  const hub = cyl(0.42, 3.2, white); hub.rotation.z = Math.PI / 2; g.add(hub);
  for (const x of [-1.6, 0, 1.6]) { const n = new THREE.Mesh(new THREE.SphereGeometry(0.5, 32, 20), white); n.position.x = x; n.scale.set(1, 0.95, 0.95); g.add(n); }
  const m2 = cyl(0.38, 2.2, white); m2.rotation.x = Math.PI / 2; m2.position.set(0, 0, 1.3); g.add(m2);
  const m3 = cyl(0.34, 1.4, white); m3.rotation.x = Math.PI / 2; m3.position.set(0, 0, -1.0); g.add(m3);
  const lab = cyl(0.36, 1.2, gold); lab.rotation.x = Math.PI / 2; lab.position.set(1.6, 0, 0.95); g.add(lab);
  for (const x of [-1.6, 0, 1.6]) { const ring = new THREE.Mesh(new THREE.TorusGeometry(0.43, 0.025, 8, 48), metal); ring.rotation.y = Math.PI / 2; ring.position.x = x + 0.55; g.add(ring); }
  // pääristikko (truss) segmentteineen
  const truss = new THREE.Group(); g.add(truss); truss.position.y = 0.75;
  const beam = (l, x, y, z, rx = 0, ry = 0, rz = 0) => { const b = new THREE.Mesh(new THREE.BoxGeometry(l, 0.04, 0.04), metal); b.position.set(x, y, z); b.rotation.set(rx, ry, rz); truss.add(b); };
  for (const y of [-0.12, 0.12]) for (const z of [-0.12, 0.12]) beam(12, 0, y, z);
  for (let i = -6; i <= 6; i += 0.5) { beam(0.34, i, 0, 0.12, 0, 0, Math.PI / 4); beam(0.34, i, 0, -0.12, 0, 0, -Math.PI / 4); }
  const strut = cyl(0.06, 0.6, metal, 12); strut.position.set(0, 0.42, 0); g.add(strut);
  // aurinkopaneelisiivet (4 kpl), kääntyvät kohti tähteä
  g.userData.wings = [];
  for (const sx of [-1, 1]) for (const k of [0, 1]) {
    const wing = new THREE.Group(); wing.position.set(sx * (3.4 + k * 2.2), 0.75, 0); truss.parent.add(wing);
    const mast = cyl(0.025, 4.6, metal, 8); wing.add(mast);
    for (const s of [-1, 1]) { const pnl = new THREE.Mesh(new THREE.PlaneGeometry(0.95, 2.1), cells); pnl.position.set(0, s * 1.2, 0); wing.add(pnl); }
    wing.rotation.x = 0.0; g.userData.wings.push(wing);
  }
  // radiaattorit (valkoiset, kohtisuorassa)
  for (const sx of [-1, 1]) { const r = new THREE.Mesh(new THREE.BoxGeometry(0.02, 1.0, 2.2), new THREE.MeshStandardMaterial({ color: 0xf2f2ee, roughness: 0.4 })); r.position.set(sx * 1.4, 0.75, -1.25); g.add(r); }
  // viestintäantenni
  const dish = new THREE.Mesh(new THREE.SphereGeometry(0.42, 32, 12, 0, Math.PI * 2, 0, Math.PI / 2.6), new THREE.MeshStandardMaterial({ color: 0xe6e6e1, metalness: 0.2, roughness: 0.5, side: THREE.DoubleSide }));
  dish.position.set(-0.4, -0.75, 0.4); dish.rotation.set(Math.PI * 0.85, 0, 0.3); g.add(dish);
  const boom = cyl(0.02, 0.6, dark, 8); boom.position.set(-0.4, -0.5, 0.4); g.add(boom);
  // navigointivalot
  const lamp = (col, pos) => { const m = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(col).multiplyScalar(10) })); m.position.copy(pos); g.add(m); return m; };
  const l1 = lamp(0xff2a2a, new THREE.Vector3(-6, 0.75, 0)), l2 = lamp(0x2aff5a, new THREE.Vector3(6, 0.75, 0)), l3 = lamp(0xffffff, new THREE.Vector3(0, 0, 2.45));
  g.scale.setScalar(scale);
  g.userData.tick = (t) => { const on = (t % 1.6) < 0.14; l1.visible = l2.visible = on; l3.visible = ((t + 0.8) % 1.6) < 0.08; g.rotation.y = 0.35 + t * 0.02; };
  return g;
}

// ---------------------------------------------------------------- reitit ja datapulssit
export function orbitLine(rx, rz, { y = 0, opacity = 0.09, segments = 256, color = 0xffffff, tiltX = 0 } = {}) {
  const pts = []; for (let i = 0; i <= segments; i++) { const a = (i / segments) * Math.PI * 2; pts.push(new THREE.Vector3(Math.cos(a) * rx, y, Math.sin(a) * rz)); }
  const l = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color, transparent: true, opacity, depthWrite: false }));
  l.rotation.x = tiltX; return l;
}

// Kaari kahden pisteen välillä (laser-tiedonsiirto) + liikkuvat pulssit
export function createLink(a, b, { color = new THREE.Color(1, 1, 1), lift = 1.5, pulses = 2, speed = 0.18, dashed = false } = {}) {
  const mid = a.clone().add(b).multiplyScalar(0.5); mid.y += lift;
  const curve = new THREE.QuadraticBezierCurve3(a.clone(), mid, b.clone());
  const pts = curve.getPoints(120);
  const geo = new THREE.BufferGeometry().setFromPoints(pts);
  const line = dashed
    ? new THREE.Line(geo, new THREE.LineDashedMaterial({ color, dashSize: 0.25, gapSize: 0.35, transparent: true, opacity: 0.35, depthWrite: false }))
    : new THREE.Line(geo, new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.22, depthWrite: false, blending: THREE.AdditiveBlending }));
  if (dashed) line.computeLineDistances();
  const group = new THREE.Group(); group.add(line);
  const pulseMat = new THREE.ShaderMaterial({
    uniforms: { uCol: { value: color } },
    vertexShader: `varying vec2 vUv; void main(){ vUv=uv*2.0-1.0; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);} `,
    fragmentShader: `uniform vec3 uCol; varying vec2 vUv; void main(){ float r=length(vUv); float g=(exp(-r*r*40.0)*3.0+exp(-r*5.0)*0.18)*smoothstep(1.0,0.6,r); gl_FragColor=vec4(mix(uCol,vec3(1.0),0.5)*g,1.0);} `,
    blending: THREE.AdditiveBlending, depthWrite: false, transparent: true
  });
  const ps = [];
  for (let i = 0; i < pulses; i++) { const m = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.9), pulseMat); m.userData.off = i / pulses; group.add(m); ps.push(m); }
  // perävana: muutama himmenevä piste pulssin takana
  group.userData.tick = (t, camera) => { ps.forEach((m) => { const u = (t * speed + m.userData.off) % 1; m.position.copy(curve.getPointAt(u)); m.quaternion.copy(camera.quaternion); }); };
  group.userData.curve = curve;
  return group;
}

// ---------------------------------------------------------------- galaksi (tiedostokartta)
export function createGalaxy({ count = 90000, radius = 30, arms = 2, seed = 11 } = {}) {
  const r = rng(seed);
  const pos = new Float32Array(count * 3), col = new Float32Array(count * 3), size = new Float32Array(count);
  const gauss = () => { let u = 0, v = 0; while (u === 0) u = r(); while (v === 0) v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
  for (let i = 0; i < count; i++) {
    const inBulge = r() < 0.08;
    let x, y, z, T, lum;
    if (inBulge) {
      const rr = Math.abs(gauss()) * radius * 0.12; const th = r() * Math.PI * 2, ph = Math.acos(2 * r() - 1);
      x = rr * Math.sin(ph) * Math.cos(th); y = rr * Math.cos(ph) * 0.55; z = rr * Math.sin(ph) * Math.sin(th);
      T = 3600 + r() * 2200; lum = 0.5 + r() * 0.8;
    } else {
      const d = Math.pow(r(), 0.75) * radius; const arm = Math.floor(r() * arms);
      const spiral = Math.log(1 + d / (radius * 0.08)) * 2.15; // logaritminen spiraali
      const spread = (0.07 + 0.16 * (1 - d / radius)) * gauss() * 0.9;
      const a = arm * (Math.PI * 2 / arms) + spiral + spread;
      const jitter = gauss() * radius * 0.025 * (1 + d / radius);
      x = Math.cos(a) * d + jitter; z = Math.sin(a) * d + gauss() * radius * 0.025; y = gauss() * radius * 0.012 * (1.2 - d / radius);
      const young = Math.abs(spread) < 0.1 ? 0.75 : 0.25; // spiraalihaarojen harjanteilla nuoria sinisiä tähtiä
      T = r() < young ? 8000 + r() * 16000 : 3800 + r() * 3000; lum = 0.35 + r() * 0.6;
    }
    pos.set([x, y, z], i * 3);
    const c = kelvinToRGB(T).lerp(new THREE.Color(1, 1, 1), 0.35); const m = Math.pow(r(), 6);
    const L = lum * (0.25 + m * 3.5);
    col.set([c.r * L, c.g * L, c.b * L], i * 3); size[i] = 1.0 + m * 3.0;
  }
  const pts = createSprites(pos, col, size, { mode: 'world', falloff: 7.0, halo: 0.0, gain: 0.22, worldK: 38.0 });
  const group = new THREE.Group(); group.add(pts);
  // Levyn diffuusi valo: logaritminen spiraali, pölykaistat haarojen sisäreunalla, H II -alueet haaroilla
  const disk = new THREE.ShaderMaterial({
    uniforms: { uR: { value: radius }, uArms: { value: arms } },
    vertexShader: `varying vec2 vP; void main(){ vP=position.xy; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);} `,
    fragmentShader: NOISE + /* glsl */`
      uniform float uR,uArms; varying vec2 vP;
      void main(){ vec2 p=vP/uR; float d=length(p); float a=atan(p.y,p.x);
        float sp=log(1.0+d/0.08)*2.15;
        float n=fbm(vec3(p*5.0,1.0),6); float n2=fbm(vec3(p*18.0,4.0),4);
        float ph=uArms*(a-sp)+n*1.3;
        float arm=pow(0.5+0.5*cos(ph),3.0);
        float lane=pow(0.5+0.5*cos(ph-0.85),14.0)*smoothstep(0.06,0.2,d);       // pöly haaran sisäreunalla
        float disc=exp(-d*3.4);
        float bulge=exp(-d*d*140.0)*2.2+exp(-d*14.0)*0.35;
        float knots=smoothstep(0.55,0.8,n2)*arm*smoothstep(0.12,0.3,d)*exp(-d*2.0);
        vec3 armCol=vec3(0.52,0.68,1.0), discCol=vec3(0.95,0.86,0.76), coreCol=vec3(1.0,0.82,0.58);
        vec3 c=discCol*disc*0.06 + armCol*arm*disc*(0.5+0.5*n)*0.70 + coreCol*bulge*0.55 + vec3(1.0,0.32,0.48)*knots*1.1;
        c*=1.0-0.75*lane;
        c*=smoothstep(1.05,0.75,d);
        gl_FragColor=vec4(c,1.0);} `,
    blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, side: THREE.DoubleSide
  });
  const dmesh = new THREE.Mesh(new THREE.CircleGeometry(radius * 1.1, 160), disk); dmesh.rotation.x = -Math.PI / 2; group.add(dmesh);
  group.userData.sprites = [pts];
  return group;
}

// Tähtijoukko + H II -alue (projekti galaksissa)
export function createCluster({ center, kind = 'hii', count = 260, spread = 1.4, seed = 5 } = {}) {
  const r = rng(seed); const group = new THREE.Group(); group.position.copy(center);
  const pos = new Float32Array(count * 3), col = new Float32Array(count * 3), size = new Float32Array(count);
  const T0 = kind === 'globular' ? [3800, 5200] : kind === 'young' ? [9000, 26000] : [7000, 20000];
  for (let i = 0; i < count; i++) {
    const rr = Math.pow(r(), kind === 'globular' ? 2.2 : 1.2) * spread; const th = r() * Math.PI * 2, ph = Math.acos(2 * r() - 1);
    pos.set([rr * Math.sin(ph) * Math.cos(th), rr * Math.cos(ph) * 0.6, rr * Math.sin(ph) * Math.sin(th)], i * 3);
    const c = kelvinToRGB(T0[0] + r() * (T0[1] - T0[0])); const m = Math.pow(r(), 5); const L = 0.6 + m * 5;
    col.set([c.r * L, c.g * L, c.b * L], i * 3); size[i] = 1.2 + m * 3;
  }
  const p = createSprites(pos, col, size, { mode: 'world', falloff: 8.0, halo: 0.0, worldK: 70.0 }); group.add(p);
  // emissiosumu: H II (vaaleanpunainen H-alfa), nuori (sinertävä heijastussumu), pallomainen (kellertävä hehku)
  const nebCol = kind === 'hii' ? new THREE.Color(0.95, 0.32, 0.45) : kind === 'young' ? new THREE.Color(0.35, 0.55, 1.0) : new THREE.Color(1.0, 0.78, 0.45);
  const nm = new THREE.ShaderMaterial({
    uniforms: { uCol: { value: nebCol }, uSeed: { value: seed } },
    vertexShader: `varying vec2 vUv; void main(){ vUv=uv*2.0-1.0; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);} `,
    fragmentShader: NOISE + /* glsl */`
      uniform vec3 uCol; uniform float uSeed; varying vec2 vUv;
      void main(){ float r=length(vUv); float n=fbm(vec3(vUv*2.2,uSeed),6); float m=smoothstep(1.0,0.15,r+n*0.35);
        float fil=pow(max(0.0,ridged(vec3(vUv*3.0,uSeed+2.0),4)-0.55),2.0)*3.0;
        gl_FragColor=vec4(uCol*(m*m*0.12+fil*m*0.25),1.0);} `,
    blending: THREE.AdditiveBlending, depthWrite: false, transparent: true
  });
  const neb = new THREE.Mesh(new THREE.PlaneGeometry(spread * 4.2, spread * 4.2), nm); group.add(neb);
  group.userData.tick = (t, camera) => neb.quaternion.copy(camera.quaternion);
  group.userData.sprites = [p];
  return group;
}

// ---------------------------------------------------------------- 3D → ruutu (HTML-tunnisteille)
export function project(v, camera, w, h) {
  const p = v.clone().project(camera); return { x: (p.x * 0.5 + 0.5) * w, y: (-p.y * 0.5 + 0.5) * h, behind: p.z > 1 };
}
export { THREE };
