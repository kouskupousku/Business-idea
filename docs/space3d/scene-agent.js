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

  scene.add(E.createSky({ intensity: 0.75, nebula: 0.9 }));
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
  const star = E.createStar({ radius: 2.2, temperature: 5100, seed: 4 }); star.position.copy(P.claude); scene.add(star);
  const planet = E.createPlanet({ radius: 1.5, lightPos: P.claude, seed: 9 }); planet.position.copy(P.gpt); planet.rotation.y = 1.2; scene.add(planet);
  const pulsar = E.createPulsar({ size: 0.22, tilt: 0.55 }); pulsar.position.copy(P.grok); scene.add(pulsar);
  const station = E.createStation({ scale: 0.4 }); station.position.copy(P.mission); scene.add(station);

  // Valaistus asemalle: tähti valonlähteenä, hyvin heikko täyttövalo (avaruudessa ei ole ilmakehän hajavaloa)
  const sun = new THREE.PointLight(0xfff0dd, 260, 0, 2); sun.position.copy(P.claude); scene.add(sun);
  scene.add(new THREE.AmbientLight(0x8899bb, 0.06));
  const rim = new THREE.DirectionalLight(0x9fb4ff, 0.25); rim.position.set(6, -4, 10); scene.add(rim); // pulsarin heijaste

  // Kiertoradat (ohuet, himmeät)
  for (const [k, v] of Object.entries(P)) { if (k === 'mission') continue; const rr = Math.hypot(v.x, v.z); scene.add(E.orbitLine(rr, rr, { y: v.y * 0.3, opacity: 0.07 })); }
  scene.add(E.orbitLine(4.2, 4.2, { opacity: 0.05 }));

  // Viestiyhteydet
  const links = [
    E.createLink(P.claude.clone().add(new THREE.Vector3(2.2, 0, 1.0)), P.mission, { color: new THREE.Color(1.0, 0.62, 0.4), lift: 2.2, pulses: 2, speed: 0.16 }),
    E.createLink(P.mission, P.gpt.clone().add(new THREE.Vector3(-1.6, 0, 0.6)), { color: new THREE.Color(0.35, 0.9, 0.75), lift: 1.8, pulses: 1, speed: 0.2 }),
    E.createLink(P.mission, P.grok.clone().add(new THREE.Vector3(-0.6, 0.2, -0.6)), { color: new THREE.Color(0.6, 0.66, 1.0), lift: 1.2, pulses: 1, speed: 0.22 }),
    E.createLink(P.grok, P.gpt.clone().add(new THREE.Vector3(-0.8, -0.6, 1.2)), { color: new THREE.Color(0.6, 0.66, 1.0), lift: 2.5, pulses: 1, speed: 0.12, dashed: true }),
  ];
  links.forEach((l) => scene.add(l));

  const { composer, lens, bloomPass } = E.createComposer(renderer, scene, camera, { bloom: 0.55, threshold: 0.95 });
  if (dbg.has('nobloom')) bloomPass.enabled = false;
  const tickables = [star, planet, pulsar, station, ...links];
  const clock = new THREE.Clock();
  const render = (t) => { tickables.forEach((o) => o.userData.tick && o.userData.tick(t, camera)); lens.uniforms.uTime.value = t % 10; composer.render(); };

  const radii = { claude: 2.2, gpt: 1.5, grok: 0.5, mission: 1.3 };
  const setSize = (w, h) => { renderer.setSize(w, h, false); composer.setSize(w, h); camera.aspect = w / h; camera.updateProjectionMatrix(); stars.userData.setViewport(w, h, renderer.getPixelRatio()); };
  return { renderer, scene, camera, composer, P, radii, render, setSize, objects: { star, planet, pulsar, station }, clock, still, time };
}
