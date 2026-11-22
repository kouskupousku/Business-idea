// ============================================================================
//  YHTEYSKANAVA: näkyy aina päänäkymän oikealla puolella.
//  Näyttää reaaliajassa, kun mallit puhuvat toisilleen:
//   1) pieni 3D-näkymä: kolme omanväristä planeettaa, valopulssi kulkee
//      lähettäjältä vastaanottajalle, puhuja saa liilan tähtäimen
//   2) "nyt puhuu" -rivi: lähettäjä → vastaanottaja, viestin tyyppi, äänenaaltomittari
//   3) viestivirta: uusin viesti liukuu sisään, kirjoitusindikaattori ennen saapumista
//  Kaikki tila lasketaan ajasta t (setTime), joten animaatio on toistettava ja
//  sen voi renderöidä kuva kerrallaan videoksi. Oikeassa sovelluksessa
//  SCRIPT korvataan mallien todellisilla tapahtumilla (events[]).
// ============================================================================
import * as E from './engine.js';
const { THREE } = E;

export const MODELS = {
  claude: { name: 'Claude', role: 'Kirjoittaja', cls: 'claude' },
  gpt: { name: 'ChatGPT', role: 'Tarkistaja', cls: 'gpt' },
  grok: { name: 'Grok', role: 'Tiedustelija', cls: 'grok' },
  all: { name: 'Kaikki', role: '', cls: '' },
};
// Esimerkkikeskustelu (ristiintarkistus). Tyypit: LUONNOS, TARKISTUS, VASTAVÄITE, KYSYMYS, LÄHDE, HYVÄKSYNTÄ, SYNTEESI
export const SCRIPT = [
  { from: 'claude', to: 'gpt', type: 'Luonnos', text: 'Luonnos valmis: suosittelen korttimaksuja ja kuukauden kokeilua.', tok: 1240 },
  { from: 'gpt', to: 'claude', type: 'Tarkistus', text: 'Pääosin samaa mieltä. Lisäisin lähi- ja mobiilimaksun.', tok: 310 },
  { from: 'grok', to: 'claude', type: 'Vastaväite', text: 'Osa kahviloista on palannut ottamaan käteistä. Löysin 3 lähdettä.', tok: 420 },
  { from: 'claude', to: 'grok', type: 'Kysymys', text: 'Mitkä asiakasryhmät jäivät pois? Liitä lähteet.', tok: 120 },
  { from: 'grok', to: 'claude', type: 'Lähde', text: 'Erityisesti iäkkäät kanta-asiakkaat. 3 linkkiä liitteenä.', tok: 380 },
  { from: 'gpt', to: 'grok', type: 'Hyväksyntä', text: 'Hyvä huomio. Lisätään vaihtoehto: kortti ensisijaisesti, käteinen sallittu.', tok: 260 },
  { from: 'claude', to: 'all', type: 'Synteesi', text: 'Päivitetty suositus valmis. Yksimielisyys nousi 68 % → 86 %.', tok: 540 },
];
export const SLOT = 3.2;        // sekuntia per viesti
const TRAVEL = 0.42;            // osuus slotista, jonka pulssi lentää
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const ease = (x) => 1 - Math.pow(1 - clamp(x), 3);

export function createComms(root, { pixelRatio = Math.min(devicePixelRatio, 2) } = {}) {
  root.innerHTML = `
    <div class="cm-head"><span class="lbl" style="color:var(--tx)">Yhteyskanava</span><span class="cm-live"><i></i>LIVE</span><span class="num cm-stats" data-k="stats"></span></div>
    <div class="cm-orbit"><canvas></canvas><div class="cm-tags"></div></div>
    <div class="cm-now">
      <div class="cm-pair"><i class="av" data-k="fromAv"></i><span class="cm-arrow"><i></i></span><i class="av" data-k="toAv"></i>
        <div class="cm-who"><b data-k="who"></b><span class="cm-type" data-k="type"></span></div></div>
      <div class="cm-wave" data-k="wave"></div>
      <div class="cm-status" data-k="status"></div>
    </div>
    <div class="cm-feed" data-k="feed"></div>
    <div class="cm-foot"><span class="cm-input">Puutu keskusteluun…</span><span class="btn" style="padding:6px 10px">❚❚</span></div>`;
  const $ = (k) => root.querySelector(`[data-k="${k}"]`);
  const wave = $('wave'); const bars = [];
  for (let i = 0; i < 34; i++) { const b = document.createElement('i'); wave.appendChild(b); bars.push(b); }

  // ---- mini-3D
  const cv = root.querySelector('.cm-orbit canvas');
  const W = cv.parentElement.clientWidth || 340, H = cv.parentElement.clientHeight || 210;
  const renderer = E.createRenderer(cv, { width: W, height: H, pixelRatio });
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, W / H, 0.1, 3000);
  camera.position.set(0, 9.5, 21); camera.lookAt(0, -0.4, 0);
  scene.add(E.createSky({ intensity: 0.45, nebula: 1.8, ...E.BRAND_NEBULA, nebDir: new THREE.Vector3(0.1, 0.35, -1) }));
  const stars = E.createStarfield({ count: 7000, seed: 71, spikes: false }); stars.userData.setViewport(W, H, renderer.getPixelRatio()); scene.add(stars);
  const P = { claude: new THREE.Vector3(-5.2, 0.4, -1.2), gpt: new THREE.Vector3(5.2, 0.2, -1.0), grok: new THREE.Vector3(0.2, -0.6, 3.6) };
  const SUN = new THREE.Vector3(-40, 30, 30);    // valo ylhäältä vasemmalta edestä
  const star = E.createModelPlanet('claude', { radius: 1.0, lightPos: SUN }); star.position.copy(P.claude); scene.add(star);
  const planet = E.createModelPlanet('gpt', { radius: 0.95, lightPos: SUN }); planet.position.copy(P.gpt); scene.add(planet);
  const pulsar = E.createModelPlanet('grok', { radius: 0.85, lightPos: SUN }); pulsar.position.copy(P.grok); scene.add(pulsar);
  scene.add(new THREE.AmbientLight(0x8899bb, 0.05));
  const lilac = new THREE.Color(0.72, 0.58, 1.0);
  // kaikki parit: himmeät kaaret; aktiivinen kaari kirkastuu
  const pairKey = (a, b) => [a, b].sort().join('-');
  const arcs = {};
  [['claude', 'gpt'], ['claude', 'grok'], ['gpt', 'grok']].forEach(([a, b]) => {
    const mid = P[a].clone().add(P[b]).multiplyScalar(0.5); mid.y += 1.6;
    const curve = new THREE.QuadraticBezierCurve3(P[a].clone(), mid, P[b].clone());
    const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(curve.getPoints(90)), new THREE.LineBasicMaterial({ color: lilac, transparent: true, opacity: 0.14, depthWrite: false, blending: THREE.AdditiveBlending }));
    scene.add(line); arcs[pairKey(a, b)] = { curve, line, a };
  });
  // pulssi + perävana (5 himmenevää pistettä)
  const pulseMat = (k) => new THREE.ShaderMaterial({
    uniforms: { uCol: { value: lilac }, uK: { value: k } },
    vertexShader: `varying vec2 vUv; void main(){ vUv=uv*2.0-1.0; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);} `,
    fragmentShader: `uniform vec3 uCol; uniform float uK; varying vec2 vUv; void main(){ float r=length(vUv); float g=(exp(-r*r*36.0)*3.2+exp(-r*5.0)*0.25)*smoothstep(1.0,0.6,r)*uK; gl_FragColor=vec4(mix(uCol,vec3(1.0),0.45)*g,1.0);} `,
    blending: THREE.AdditiveBlending, depthWrite: false, transparent: true });
  // kirkas kärki + 18 osan yhtenäinen häntä (komeetta)
  const TRAIL = 18;
  const pulses = Array.from({ length: TRAIL + 1 }, (_, i) => { const k = i ? 0.55 * Math.pow(1 - i / (TRAIL + 1), 1.6) : 1.6; const sz = i ? 0.42 * (1 - i / (TRAIL + 2)) + 0.12 : 1.25;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(sz, sz), pulseMat(k)); scene.add(m); return m; });
  // saapumisvälähdys vastaanottajalla
  const flash = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), pulseMat(1)); scene.add(flash);
  const { composer, lens } = E.createComposer(renderer, scene, camera, { bloom: 0.55, threshold: 0.95 });
  lens.uniforms.uVignette.value = 0.35;

  // ---- HTML-tunnisteet kappaleille
  const tagsEl = root.querySelector('.cm-tags');
  const tags = {};
  Object.keys(P).forEach((k) => { const d = document.createElement('div'); d.className = 'cm-tag'; d.innerHTML = `<span class="cm-ret"></span><b>${MODELS[k].name}</b>`; tagsEl.appendChild(d); tags[k] = d; });
  const R = { claude: 1.75, gpt: 1.2, grok: 1.1 };   // renkaan säde maailmayksiköissä (planeetta + rengas)
  const right = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 0);
  const placeTags = (speaker, listener) => {
    for (const k in P) { const p = E.project(P[k], camera, W, H); const e = E.project(P[k].clone().addScaledVector(right, R[k]), camera, W, H);
      const r = Math.round(Math.hypot(e.x - p.x, e.y - p.y)); const d = tags[k]; const ret = d.firstChild;
      Object.assign(ret.style, { width: 2 * r + 'px', height: 2 * r + 'px', marginLeft: -r + 'px', top: -r + 'px' });
      d.querySelector('b').style.marginTop = r + 6 + 'px';
      d.style.left = p.x + 'px'; d.style.top = p.y + 'px'; d.classList.toggle('on', k === speaker); d.classList.toggle('to', k === listener || (listener === 'all' && k !== speaker)); }
  };

  // ---- viestivirta
  const feed = $('feed');
  const itemHTML = (m, cls = '') => `<div class="cm-item ${cls}"><div class="cm-meta"><i class="av ${MODELS[m.from].cls}"></i><b>${MODELS[m.from].name}</b><span class="cm-to">→ ${MODELS[m.to].name}</span><span class="cm-type">${m.type}</span><span class="num cm-tok">${m.tok.toLocaleString('fi-FI')} tok</span></div><div class="cm-text">${m.text}</div></div>`;

  function setTime(t) {
    const n = SCRIPT.length; const k = Math.floor(t / SLOT); const i = ((k % n) + n) % n; const p = (t - k * SLOT) / SLOT;
    const m = SCRIPT[i]; const flying = p < TRAVEL; const u = clamp(p / TRAVEL);
    // nyt puhuu -rivi
    $('fromAv').className = 'av lg ' + MODELS[m.from].cls; $('toAv').className = 'av lg ' + (m.to === 'all' ? 'all' : MODELS[m.to].cls);
    $('who').textContent = `${MODELS[m.from].name} → ${MODELS[m.to].name}`; $('type').textContent = m.type;
    $('status').innerHTML = flying ? `<span class="cm-blink">●</span> lähettää · ${Math.round(u * m.tok).toLocaleString('fi-FI')} / ${m.tok.toLocaleString('fi-FI')} tok` : `<span style="color:var(--ok)">✓</span> vastaanotettu · ${(0.4 + (i * 0.37) % 1.2).toFixed(1).replace('.', ',')} s`;
    root.querySelector('.cm-arrow i').style.transform = `scaleX(${flying ? u : 1})`;
    bars.forEach((b, j) => { const s = flying ? 0.25 + 0.75 * Math.abs(Math.sin(t * 9.1 + j * 0.7) * Math.sin(t * 3.3 + j * 1.9)) : 0.08 + 0.05 * Math.abs(Math.sin(t * 2 + j)); b.style.transform = `scaleY(${s.toFixed(3)})`; b.style.opacity = flying ? 1 : 0.4; });
    const total = SCRIPT.slice(0, i + 1).reduce((a, x) => a + x.tok, 0) + Math.floor(t / (SLOT * n)) * 3270;
    $('stats').textContent = `${k + 1} viestiä · ${total.toLocaleString('fi-FI')} tok`;
    // viestivirta: 4 edellistä + uusin (liukuu sisään kun pulssi saapuu) tai kirjoitusindikaattori
    let html = '';
    if (flying) html += `<div class="cm-item typing"><div class="cm-meta"><i class="av ${MODELS[m.from].cls}"></i><b>${MODELS[m.from].name}</b><span class="cm-to">kirjoittaa</span><span class="cm-dots">${[0, 1, 2].map((d) => `<i style="opacity:${(0.25 + 0.75 * Math.max(0, Math.sin(t * 6 - d * 0.9))).toFixed(2)}"></i>`).join('')}</span></div></div>`;
    else { const a = ease((p - TRAVEL) / 0.12); html += itemHTML(m, 'new').replace('class="cm-item new"', `class="cm-item new" style="opacity:${a.toFixed(3)};transform:translateY(${((1 - a) * -14).toFixed(1)}px)"`); }
    for (let j = 1; j <= 6; j++) { if (k - j < 0) break; html += itemHTML(SCRIPT[(((i - j) % n) + n) % n]).replace('class="cm-item "', `class="cm-item" style="opacity:${(1 - j * 0.11).toFixed(2)}"`); }
    feed.innerHTML = html;
    // 3D: aktiivinen kaari, pulssi ja välähdys
    for (const key in arcs) arcs[key].line.material.opacity = 0.14;
    const targets = m.to === 'all' ? Object.keys(P).filter((x) => x !== m.from) : [m.to];
    pulses.forEach((pm) => (pm.visible = false)); flash.visible = false;
    targets.forEach((to, ti) => {
      const arc = arcs[pairKey(m.from, to)]; arc.line.material.opacity = flying ? 0.55 : 0.3;
      const fw = arc.a === m.from;
      if (flying && ti === 0) pulses.forEach((pm, j) => { const uu = clamp(ease(u) - j * 0.011); pm.visible = uu > 0 && (j === 0 || ease(u) - j * 0.011 > 0); pm.position.copy(arc.curve.getPointAt(fw ? uu : 1 - uu)); pm.quaternion.copy(camera.quaternion); });
    });
    if (!flying && p < TRAVEL + 0.2) { const f = (p - TRAVEL) / 0.2; flash.visible = true; flash.position.copy(P[targets[0]]); flash.quaternion.copy(camera.quaternion); const s = 1.2 + f * 2.6; flash.scale.set(s, s, 1); flash.material.uniforms.uK.value = (1 - f) * 0.9; }
    [star, planet, pulsar].forEach((o) => o.userData.tick && o.userData.tick(t, camera));
    lens.uniforms.uTime.value = t % 10;
    composer.render();
    placeTags(m.from, m.to);
  }
  return { setTime };
}
