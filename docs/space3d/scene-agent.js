// Agenttikartan 3D-kohtaus: missio (avaruusasema) keskellä, mallit taivaankappaleina.
import * as E from './engine.js';
const { THREE } = E;

export function buildAgentScene(canvas, { width, height, pixelRatio, still = false, time = 12.0 } = {}) {
  const renderer = E.createRenderer(canvas, { width, height, pixelRatio });
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(34, width / height, 0.1, 3000);
  camera.position.set(1.2, 11.5, 38);
  // pystynäytöllä (puhelin) kamera kauemmas, jotta kaikki kappaleet mahtuvat kuvaan
  const asp = width / height; if (asp < 1.3) camera.position.multiplyScalar(Math.min(1.75, 1.45 / asp));
  camera.lookAt(0.2, 2.0, 0);

  scene.add(E.createSky({ intensity: 0.75, nebula: 1.3, ...E.BRAND_NEBULA }));
  const dbg = new URLSearchParams(location.search);
  const stars = E.createStarfield({ count: 26000, seed: 21, spikes: !dbg.has('nospikes') });
  stars.userData.setViewport(width, height, renderer.getPixelRatio());
  scene.add(stars);

  // Kappaleet
  const P = {
    claude: new THREE.Vector3(-8.6, 1.4, -6),
    gpt: new THREE.Vector3(8.2, 0.4, -5),
    grok: new THREE.Vector3(4.2, -1.2, 5.2),
    mission: new THREE.Vector3(0, 0, 0),
  };
  // järjestelmän aurinko (ei malli): valaisee planeetat taustalta
  const SUN = new THREE.Vector3(-95, 30, 40);     // sivuvalo vasemmalta: planeetoilla näkyvä päiväpuoli ja terminaattori
  const star = E.createStar({ radius: 3.2, temperature: 5600, seed: 4 }); star.position.copy(SUN); scene.add(star);   // ruudun ulkopuolella vasemmalla
  // mallit ovat aina omanvärisiä planeettoja
  const claudeP = E.createModelPlanet('claude', { radius: 1.7, lightPos: SUN }); claudeP.position.copy(P.claude); scene.add(claudeP);
  const planet = E.createModelPlanet('gpt', { radius: 1.5, lightPos: SUN }); planet.position.copy(P.gpt); scene.add(planet);
  const grokP = E.createModelPlanet('grok', { radius: 1.35, lightPos: SUN }); grokP.position.copy(P.grok); scene.add(grokP);
  const pulsar = grokP;
  const station = E.createStation({ scale: 0.4 }); station.position.copy(P.mission); scene.add(station);

  // Valaistus asemalle: tähti valonlähteenä, hyvin heikko täyttövalo (avaruudessa ei ole ilmakehän hajavaloa)
  const sun = new THREE.DirectionalLight(0xfff0dd, 3.2); sun.position.copy(SUN); scene.add(sun);
  scene.add(new THREE.AmbientLight(0x8899bb, 0.06));
  const rim = new THREE.DirectionalLight(0x9fb4ff, 0.25); rim.position.set(6, -4, 10); scene.add(rim); // pulsarin heijaste

  // Kiertoradat (ohuet, himmeät)
  for (const [k, v] of Object.entries(P)) { if (k === 'mission') continue; const rr = Math.hypot(v.x, v.z); scene.add(E.orbitLine(rr, rr, { y: v.y * 0.3, opacity: 0.07 })); }
  scene.add(E.orbitLine(4.2, 4.2, { opacity: 0.05 }));

  // Viestiyhteydet
  const links = [
    E.createLink(P.claude.clone().add(new THREE.Vector3(1.9, 0, 0.8)), P.mission, { color: new THREE.Color(0.72, 0.58, 1.0), lift: 2.2, pulses: 2, speed: 0.16 }),
    E.createLink(P.mission, P.gpt.clone().add(new THREE.Vector3(-1.6, 0, 0.6)), { color: new THREE.Color(0.72, 0.58, 1.0), lift: 1.8, pulses: 1, speed: 0.2 }),
    E.createLink(P.mission, P.grok.clone().add(new THREE.Vector3(-0.6, 0.2, -0.6)), { color: new THREE.Color(0.72, 0.58, 1.0), lift: 1.2, pulses: 1, speed: 0.22 }),
    E.createLink(P.grok, P.gpt.clone().add(new THREE.Vector3(-0.8, -0.6, 1.2)), { color: new THREE.Color(0.72, 0.58, 1.0), lift: 2.5, pulses: 1, speed: 0.12, dashed: true }),
  ];
  links.forEach((l) => scene.add(l));

  const { composer, lens, bloomPass } = E.createComposer(renderer, scene, camera, { bloom: 0.55, threshold: 0.95 });
  if (dbg.has('nobloom')) bloomPass.enabled = false;
  const tickables = [star, claudeP, planet, grokP, station, ...links];
  const clock = new THREE.Clock();
  const render = (t) => { tickables.forEach((o) => o.userData.tick && o.userData.tick(t, camera)); lens.uniforms.uTime.value = t % 10; composer.render(); };

  const radii = { claude: 2.4, gpt: 1.6, grok: 1.45, mission: 1.3 };
  const setSize = (w, h) => { renderer.setSize(w, h, false); composer.setSize(w, h); camera.aspect = w / h; camera.updateProjectionMatrix(); stars.userData.setViewport(w, h, renderer.getPixelRatio()); };
  return { renderer, scene, camera, composer, P, radii, render, setSize, objects: { star, claudeP, planet, grokP, station }, clock, still, time };
}
