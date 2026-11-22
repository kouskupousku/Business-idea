// Päänäkymän tausta: suuri planeetta horisonttina, tähti nousemassa (kuin avaruusasemalta kuvattuna).
import * as E from './engine.js';
const { THREE } = E;
export function buildHorizonScene(canvas, { width, height, pixelRatio } = {}) {
  const renderer = E.createRenderer(canvas, { width, height, pixelRatio });
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, width / height, 0.05, 4000);
  camera.position.set(0, 0, 0); camera.lookAt(0, -0.16, -1);
  scene.add(E.createSky({ intensity: 0.9, nebula: 1.1, ...E.BRAND_NEBULA, nebDir: new THREE.Vector3(0.75, 0.32, -0.58) }));
  const stars = E.createStarfield({ count: 30000, seed: 33 }); stars.userData.setViewport(width, height, renderer.getPixelRatio()); scene.add(stars);
  const sunPos = new THREE.Vector3(-230, -84, -520);
  const sun = E.createStar({ radius: 7, temperature: 5600, seed: 2 }); sun.position.copy(sunPos); scene.add(sun);
  const R = 60;
  const planet = E.createPlanet({ radius: R, lightPos: sunPos, seed: 14, rings: false, cities: 2.2, detail: 2.0, freq: 7.0 });
  planet.position.set(0, -R - 7.5, -26); planet.rotation.set(0.35, 2.2, 0.1); scene.add(planet);
  const { composer, lens } = E.createComposer(renderer, scene, camera, { bloom: 0.6, threshold: 0.95 });
  const render = (t) => { [sun, planet].forEach((o) => o.userData.tick(t, camera)); lens.uniforms.uTime.value = t % 10; composer.render(); };
  return { renderer, scene, camera, render };
}
