// ============================================================================
//  MUISTIGALAKSI: kaikkien mallien muistit yhdessä galaksissa.
//  Sijainti ja ulkonäkö kertovat muistin ominaisuudet (sama kieli kuin oikeissa galakseissa):
//   - aihe       → sektori / haara (lasketaan oikeassa sovelluksessa upotusten klusteroinnista)
//   - ikä        → etäisyys ytimestä + tähden väri: tuore = sininen nuori tähti ulkohaaroilla,
//                  vakiintunut ("uni"-konsolidaation jälkeen) = kultainen tähti lähellä ydintä
//   - tärkeys    → kirkkaus ja koko (tärkeimmillä diffraktiopiikit)
//   - arkistoitu → himmeä, pölykaistojen sisällä
//   - ydin       → pysyvä perusmuisti (käyttäjän mieltymykset, tärkeimmät päätökset)
//  Mallit ovat omanvärisiä planeettoja galaksin yllä: Claude (meripihka), ChatGPT (turkoosi), Grok (jäänsininen).
// ============================================================================
import * as E from './engine.js';
const { THREE } = E;

export const TOPICS = [
  { id: 'biz', name: 'Business-idea', ang: 0.15 },
  { id: 'mkt', name: 'Markkinointi', ang: 1.35 },
  { id: 'cust', name: 'Asiakkaat', ang: 2.6 },
  { id: 'fin', name: 'Talous ja sopimukset', ang: 3.85 },
  { id: 'tech', name: 'Tekniikka', ang: 5.05 },
];
// Esimerkkimuistit: summary = lyhyt ihmiselle näytettävä tiivistelmä, machine = mallien oma tiivis muoto
export const NAMED = [
  { id: 'm-0427', topic: 'biz', age: 0.35, imp: 1.0, type: 'Päätös', owner: 'shared', title: 'Korttimaksut',
    summary: 'Kahvila siirtyy korttimaksuihin. Käteinen sallitaan varalla.',
    machine: ['D|kahvila.maksutapa=kortti_ensisij;kateinen=sallittu|conf=.92', 'R|+jono_nopeus +kirjanpito|-iakkaat_kanta-asiakkaat(grok)', 'C|3/3 @2026-11-20|68%→86%', 'L|[[m-0391]] [[m-0412]] [[m-0430]] [[m-0102]]'],
    created: '12.11.2026', used: '23× · tänään 09:12', conf: '0,92', links: 4, readers: { claude: 9, gpt: 4, grok: 3 } },
  { id: 'm-0391', topic: 'cust', age: 0.55, imp: 0.7, type: 'Fakta', owner: 'claude', title: 'Asiakasprofiili',
    summary: 'Arkiaamujen asiakkaista suurin osa on lähitoimistojen työntekijöitä.',
    machine: ['F|asiakkaat.aamu.segmentti=toimisto_lahi|share≈.5|src=kassadata_10/2026', 'L|[[m-0427]] [[m-0233]]'], created: '28.10.2026', used: '11×', conf: '0,80', links: 2, readers: { claude: 7, gpt: 3, grok: 1 } },
  { id: 'm-0412', topic: 'cust', age: 0.12, imp: 0.75, type: 'Lähde', owner: 'grok', title: 'Käteinen ja iäkkäät',
    summary: 'Kolme lähdettä: osa kahviloista palasi ottamaan käteistä iäkkäiden asiakkaiden vuoksi.',
    machine: ['S|n=3|aihe=kahvilat_kateinen_paluu|seg=iakkaat', 'X|ristiriita?[[m-0427]]→ratkaistu:kateinen_sallittu'], created: '20.11.2026', used: '3×', conf: '0,71', links: 1, readers: { claude: 2, gpt: 1, grok: 3 } },
  { id: 'm-0430', topic: 'biz', age: 0.05, imp: 0.6, type: 'Konsensus', owner: 'shared', title: 'Yksimielisyys 86 %',
    summary: 'Ristiintarkistuksen jälkeen kaikki kolme mallia päätyivät samaan suositukseen.',
    machine: ['C|kysymys=[[m-0427]]|claude=ok gpt=ok grok=ok_ehdoin|86%'], created: '20.11.2026', used: '1×', conf: '0,86', links: 1, readers: { claude: 1, gpt: 1, grok: 1 } },
  { id: 'm-0102', topic: 'core', age: 0.97, imp: 0.95, type: 'Mieltymys', owner: 'shared', title: 'Vastaustyyli',
    summary: 'Käyttäjä haluaa vastaukset suomeksi, lyhyesti ja selkeästi.',
    machine: ['P|kieli=fi;pituus=lyhyt;tyyli=suora|pysyvä'], created: '3.9.2026', used: '412×', conf: '0,99', links: 18, readers: { claude: 160, gpt: 140, grok: 112 } },
  { id: 'm-0233', topic: 'mkt', age: 0.4, imp: 0.65, type: 'Projekti', owner: 'gpt', title: 'Kevätkampanja',
    summary: 'Kevätkampanja: leimakortti ja "Tuo kollega" -tiistait.',
    machine: ['J|kampanja.kevät=leimakortti+tuo_kollega_ti|tila=suunniteltu', 'L|[[m-0391]] [[m-0510]]'], created: '5.11.2026', used: '6×', conf: '0,88', links: 2, readers: { claude: 2, gpt: 6, grok: 0 } },
  { id: 'm-0315', topic: 'mkt', age: 0.18, imp: 0.5, type: 'Havainto', owner: 'grok', title: 'Kauramaitolatte',
    summary: 'Kauramaitolatteja kysytään somessa aiempaa enemmän.',
    machine: ['O|trendi=kaura_latte↑|lähde=some|aika=11/2026'], created: '18.11.2026', used: '2×', conf: '0,64', links: 0, readers: { claude: 0, gpt: 1, grok: 2 } },
  { id: 'm-0510', topic: 'fin', age: 0.45, imp: 0.7, type: 'Päätös', owner: 'claude', title: 'Markkinointibudjetti',
    summary: 'Markkinointibudjetti 600 € kuukaudessa: some 300, painotuotteet 150, tapahtumat 150.',
    machine: ['D|budjetti.mark.kk=600€|some=300 paino=150 tapaht=150'], created: '9.11.2026', used: '8×', conf: '0,95', links: 1, readers: { claude: 5, gpt: 3, grok: 0 } },
];

export function buildMemoryScene(canvas, { width, height, pixelRatio } = {}) {
  const renderer = E.createRenderer(canvas, { width, height, pixelRatio });
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(36, width / height, 0.1, 4000);
  camera.position.set(0, 42, 54);
  const asp = width / height; if (asp < 1.3) camera.position.multiplyScalar(Math.min(1.8, 1.45 / asp));
  camera.lookAt(0, -4, 2);
  scene.add(E.createSky({ intensity: 0.3, nebula: 0.8, ...E.BRAND_NEBULA }));
  const stars = E.createStarfield({ count: 12000, seed: 81 }); scene.add(stars);
  const R = 30;
  const galaxy = E.createFlocculentGalaxy({ radius: R, seed: 4 }); galaxy.rotation.y = 0.0; scene.add(galaxy);
  const sprites = [stars, ...galaxy.userData.sprites];

  // ---- muistitähdet
  const rnd = E.rng(77); const mem = [];
  // mallien planeetat ja niiden kotisektorit: sektorin kulma johdetaan planeetan sijainnista
  const PPOS = { claude: new THREE.Vector3(-13, 7, -10), gpt: new THREE.Vector3(14, 7, -6), grok: new THREE.Vector3(6, 7, 16) };
  const off = (r) => Math.log(1 + r / (R * 0.05)) * 0.3;               // muistit kaartuvat spiraalin mukaan
  const angOf = (v) => { const r = Math.hypot(v.x, v.z); return Math.atan2(v.z, v.x) - off(r); };
  TOPICS.find((t) => t.id === 'biz').ang = angOf(PPOS.claude);
  TOPICS.find((t) => t.id === 'mkt').ang = angOf(PPOS.gpt);
  TOPICS.find((t) => t.id === 'cust').ang = angOf(PPOS.grok);
  TOPICS.find((t) => t.id === 'fin').ang = angOf(new THREE.Vector3(-5, 0, 15));
  TOPICS.find((t) => t.id === 'tech').ang = angOf(new THREE.Vector3(2, 0, -18));
  const place = (topicAng, age, jitter) => { const r = R * (0.88 - 0.74 * age) + jitter * 1.2; const a = topicAng + off(r) + jitter * 0.25; return new THREE.Vector3(Math.cos(a) * r, (rnd() - 0.5) * 0.4, Math.sin(a) * r); };
  const topicPos = (t, f = 0.66) => { const r = R * f; const a = t.ang + off(r); return new THREE.Vector3(Math.cos(a) * r, 0, Math.sin(a) * r); };
  TOPICS.forEach((t) => { for (let i = 0; i < 150; i++) { const age = Math.pow(rnd(), 1.1); const imp = Math.pow(rnd(), 3); const arch = rnd() < 0.12; mem.push({ pos: place(t.ang, age, (rnd() - 0.5) * 2), age, imp: arch ? imp * 0.25 : imp, topic: t.id }); } });
  for (let i = 0; i < 90; i++) { const r = Math.pow(rnd(), 1.5) * R * 0.14; const a = rnd() * 6.283; mem.push({ pos: new THREE.Vector3(Math.cos(a) * r, (rnd() - 0.5) * 0.6, Math.sin(a) * r), age: 0.9 + rnd() * 0.1, imp: Math.pow(rnd(), 2), topic: 'core' }); }
  NAMED.forEach((m) => { const t = TOPICS.find((x) => x.id === m.topic); m.pos = m.topic === 'core' ? new THREE.Vector3(1.6, 0.2, 1.1) : place(t.ang, m.age, (rnd() - 0.5) * 0.6); mem.push({ ...m, named: true }); });
  const kelvinForAge = (a) => 22000 * Math.pow(3600 / 22000, a);        // tuore sininen → vakiintunut kultainen
  const mk = (list, sizeF, spikes) => { const pos = new Float32Array(list.length * 3), col = new Float32Array(list.length * 3), sz = new Float32Array(list.length);
    list.forEach((m, i) => { pos.set([m.pos.x, m.pos.y, m.pos.z], i * 3); const c = E.kelvinToRGB(kelvinForAge(m.age)).lerp(new THREE.Color(1, 1, 1), 0.25); const L = 0.6 + m.imp * 4.5; col.set([c.r * L, c.g * L, c.b * L], i * 3); sz[i] = sizeF(m); });
    return E.createSprites(pos, col, sz, { mode: 'screen', falloff: spikes ? 260 : 11, halo: 0.06, spikes }); };
  const memStars = mk(mem, (m) => 1.1 + m.imp * 2.6 + (m.named ? 1.2 : 0), false); scene.add(memStars); sprites.push(memStars);
  const top = mem.filter((m) => m.imp > 0.93 || m.named);
  const memSpikes = mk(top, (m) => 6 + m.imp * 11, true); scene.add(memSpikes); sprites.push(memSpikes);

  // ---- mallien planeetat galaksin yllä, kukin "kotisektorinsa" kohdalla
  const light = new THREE.Vector3(-30, 70, 60); // avainvalo ylhäältä edestä, jotta kaikki planeetat näkyvät valaistuina
  const P = {}; const planets = {};
  Object.entries(PPOS).forEach(([k, pos]) => {
    const pl = E.createModelPlanet(k, { radius: 1.6, lightPos: light }); pl.position.copy(pos); scene.add(pl); planets[k] = pl; P[k] = pos;
    // pystysuora ohut viiva kotisektoriin (kuin karttanuppi)
    const g = new THREE.BufferGeometry().setFromPoints([pos.clone().add(new THREE.Vector3(0, -2.1, 0)), new THREE.Vector3(pos.x, 0, pos.z)]);
    const ln = new THREE.Line(g, new THREE.LineDashedMaterial({ color: 0xb69cff, dashSize: 0.3, gapSize: 0.3, transparent: true, opacity: 0.45, depthWrite: false })); ln.computeLineDistances(); scene.add(ln);
  });
  scene.add(new THREE.AmbientLight(0x8899bb, 0.04));

  // ---- valitun muistin yhteydet (tähtikuvio) + lukusäde mallille
  const sel = mem.find((m) => m.id === 'm-0427');
  const linked = ['m-0391', 'm-0412', 'm-0430', 'm-0102'].map((id) => mem.find((m) => m.id === id));
  const lineMat = new THREE.LineBasicMaterial({ color: 0xb69cff, transparent: true, opacity: 0.55, depthWrite: false });
  linked.forEach((m) => scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([sel.pos, m.pos]), lineMat)));
  const read = E.createLink(P.claude.clone().add(new THREE.Vector3(0, -1.8, 0)), sel.pos, { color: new THREE.Color(0.72, 0.58, 1.0), lift: 2.0, pulses: 2, speed: 0.25 }); scene.add(read);
  const read2 = E.createLink(P.grok.clone().add(new THREE.Vector3(0, -1.8, 0)), linked[1].pos, { color: new THREE.Color(0.72, 0.58, 1.0), lift: 1.4, pulses: 1, speed: 0.2 }); scene.add(read2);

  sprites.forEach((s) => s.userData.setViewport && s.userData.setViewport(width, height, renderer.getPixelRatio()));
  const { composer, lens } = E.createComposer(renderer, scene, camera, { bloom: 0.5, threshold: 0.95 });
  const ticks = [...Object.values(planets), read, read2];
  const render = (t) => { ticks.forEach((o) => o.userData.tick && o.userData.tick(t, camera)); lens.uniforms.uTime.value = t % 10; composer.render(); };
  return { renderer, scene, camera, render, mem, sel, P, galaxy, R, topicPos };
}
