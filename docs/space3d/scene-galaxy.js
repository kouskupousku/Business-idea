// Tiedostokartta: spiraaligalaksi. Projektit = tähtijoukot, tiedostot = kirkkaat tähdet, yhteydet = tähtikuviot.
import * as E from './engine.js';
const { THREE } = E;

export const PROJECTS = [
  { id: 'biz', name: 'Business-idea', kind: 'hii', at: [9.5, 0.3, -5.5], seed: 3,
    files: [['Liiketoimintasuunnitelma_v3.pdf', 0, 0, 0], ['Kilpailija-analyysi.pdf', 1.4, 0.3, 0.9], ['SWOT_muistio.md', -1.2, 0.2, 0.7], ['Hinnoittelu.xlsx', 0.6, -0.2, -1.3], ['Asiakashaastattelut', -0.9, 0.4, -1.0]] },
  { id: 'mkt', name: 'Markkinointi', kind: 'young', at: [-10.5, 0.2, 6.5], seed: 8,
    files: [['Kampanjasuunnitelma.docx', 0, 0, 0], ['Brändiopas.pdf', 1.1, 0.2, -0.8], ['Somekalenteri.xlsx', -1.2, -0.1, 0.6], ['Instagram-kuvat', 0.4, 0.3, 1.2]] },
  { id: 'fin', name: 'Sopimukset & talous', kind: 'globular', at: [-6.5, 3.2, -9.5], seed: 12,
    files: [['Budjetti_2027.xlsx', 0, 0, 0], ['Vuokrasopimus.pdf', 0.9, 0.5, 0.6], ['Kassavirta.xlsx', -0.8, -0.4, 0.5], ['Toimittajasopimus.pdf', 0.3, 0.7, -0.9]] },
];

export function buildGalaxyScene(canvas, { width, height, pixelRatio } = {}) {
  const renderer = E.createRenderer(canvas, { width, height, pixelRatio });
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(36, width / height, 0.1, 4000);
  camera.position.set(6, 32, 44);
  const asp = width / height; if (asp < 1.3) camera.position.multiplyScalar(Math.min(1.7, 1.4 / asp));
  camera.lookAt(1.8, -3.5, 0);
  scene.add(E.createSky({ intensity: 0.35, nebula: 0.6, ...E.BRAND_NEBULA }));
  const stars = E.createStarfield({ count: 14000, seed: 61 }); stars.userData.setViewport(width, height, renderer.getPixelRatio()); scene.add(stars);
  const galaxy = E.createGalaxy({ count: 60000, radius: 30, seed: 17 });
  galaxy.rotation.y = 0.4; scene.add(galaxy);
  const sprites = [...galaxy.userData.sprites];
  const clusters = [], files = [];
  PROJECTS.forEach((p) => {
    const c = E.createCluster({ center: new THREE.Vector3(...p.at), kind: p.kind, seed: p.seed, spread: 1.6, count: 300 });
    scene.add(c); clusters.push(c); sprites.push(...c.userData.sprites);
    p.files.forEach(([name, x, y, z], i) => files.push({ project: p.id, name, pos: new THREE.Vector3(p.at[0] + x, p.at[1] + y, p.at[2] + z), main: i === 0 }));
  });
  // tiedostotähdet: kirkkaat pisteet (ruudun kokoisina, jotta ne erottuvat joukosta)
  const fp = new Float32Array(files.length * 3), fc = new Float32Array(files.length * 3), fs = new Float32Array(files.length);
  files.forEach((f, i) => { fp.set([f.pos.x, f.pos.y, f.pos.z], i * 3); const c = new THREE.Color(1, 0.97, 0.92).multiplyScalar(f.main ? 5 : 2.6); fc.set([c.r, c.g, c.b], i * 3); fs[i] = f.main ? 4.2 : 2.8; });
  const fileStars = E.createSprites(fp, fc, fs, { mode: 'screen', falloff: 10, halo: 0.08 }); scene.add(fileStars); sprites.push(fileStars);
  // tähtikuviot: ohuet viivat saman projektin tiedostojen välillä + kaksi projektien välistä yhteyttä
  const lineMat = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.28, depthWrite: false });
  PROJECTS.forEach((p) => { const pts = files.filter((f) => f.project === p.id).map((f) => f.pos); const order = [0, 1, 3, 2, 4].filter((k) => k < pts.length); scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(order.map((k) => pts[k])), lineMat)); });
  const cross = new THREE.LineDashedMaterial({ color: 0xffffff, transparent: true, opacity: 0.18, dashSize: 0.5, gapSize: 0.7, depthWrite: false });
  [['biz', 'mkt'], ['biz', 'fin']].forEach(([a, b]) => { const A = files.find((f) => f.project === a && f.main).pos, B = files.find((f) => f.project === b && f.main).pos; const l = new THREE.Line(new THREE.BufferGeometry().setFromPoints([A, B]), cross); l.computeLineDistances(); scene.add(l); });
  sprites.forEach((m) => m.userData.setViewport(width, height, renderer.getPixelRatio()));
  const { composer, lens } = E.createComposer(renderer, scene, camera, { bloom: 0.5, threshold: 0.9 });
  const render = (t) => { clusters.forEach((c) => c.userData.tick(t, camera)); galaxy.rotation.y = 0.4 + t * 0.002; lens.uniforms.uTime.value = t % 10; composer.render(); };
  return { renderer, scene, camera, render, files, projects: PROJECTS };
}
