import * as THREE from '../../vendor/three.module.js';
import { PALETTE } from './palette.js';
import { buildShell, glowSprite } from './build.js';
import { buildInteractive, buildProps } from './furniture.js';
import { createMascot } from './mascot.js';
import { createSchool } from './fish.js';
import { createControls } from './controls.js';

/**
 * The room itself: scene graph, render loop and hit testing.
 * It knows nothing about phrases beyond "here is a fish id" — everything else
 * is handed back through the callbacks.
 */
export function createRoom(canvas, { onPickCategory, onPickPhrase } = {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(PALETTE.fog, 34, 110);

  const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 220);

  scene.add(new THREE.AmbientLight(0x5a4a94, 0.75));
  const hemi = new THREE.HemisphereLight(0x9a86e8, 0x2a1f4a, 0.85);
  scene.add(hemi);

  const moon = new THREE.DirectionalLight(0xbfaeff, 1.0);
  moon.position.set(9, 15, 8);
  moon.castShadow = true;
  moon.shadow.mapSize.set(1024, 1024);
  moon.shadow.camera.left = -12;
  moon.shadow.camera.right = 12;
  moon.shadow.camera.top = 14;
  moon.shadow.camera.bottom = -8;
  moon.shadow.camera.far = 45;
  moon.shadow.bias = -0.0012;
  scene.add(moon);

  scene.add(buildShell());
  buildProps(scene);
  const items = buildInteractive(scene);
  const byCategory = new Map(items.map((i) => [i.categoryId, i]));

  const mascot = createMascot(scene);

  const tank = byCategory.get('aquarium');
  const school = createSchool(tank.g, tank.swimBounds);
  const tankCentre = new THREE.Box3().setFromObject(tank.g).getCenter(new THREE.Vector3());

  // A soft pulse over every tappable object, in place of on-screen labels.
  const markers = items.map((item) => {
    const bboxTop = new THREE.Box3().setFromObject(item.g).max.y;
    const centre = new THREE.Box3().setFromObject(item.g).getCenter(new THREE.Vector3());
    const s = glowSprite(0xd8c9ff, 0.7, 0.5);
    s.position.set(centre.x, bboxTop + 0.55, centre.z);
    scene.add(s);
    return { sprite: s, item };
  });

  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();

  const controls = createControls(camera, canvas, {
    onTap: (clientX, clientY) => {
      const rect = canvas.getBoundingClientRect();
      ndc.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      ndc.y = -((clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(ndc, camera);
      const hits = raycaster.intersectObjects(scene.children, true);

      // Close to the tank a fish wins over the glass it swims behind; from
      // across the room the tank itself is the target, so a stray tap flies
      // there instead of opening a random phrase.
      if (camera.position.distanceTo(tankCentre) < 11) {
        for (const hit of hits) {
          const id = lookup(hit.object, 'phraseId');
          if (id) {
            school.highlight(id);
            onPickPhrase?.(id);
            return;
          }
        }
      }
      for (const hit of hits) {
        const cat = lookup(hit.object, 'categoryId');
        if (cat) {
          onPickCategory?.(cat);
          return;
        }
      }
    }
  });

  function lookup(object, key) {
    let o = object;
    while (o) {
      if (o.userData && o.userData[key]) return o.userData[key];
      o = o.parent;
    }
    return null;
  }

  function resize() {
    const w = canvas.clientWidth || window.innerWidth;
    const h = canvas.clientHeight || window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    // A phone held upright is much narrower than it is tall: back the camera off
    // so the whole diorama still fits across the screen.
    controls?.setFit(THREE.MathUtils.clamp(1.12 / camera.aspect, 1, 2.7));
  }
  window.addEventListener('resize', resize);
  window.addEventListener('orientationchange', () => setTimeout(resize, 120));
  resize();

  let last = performance.now();
  let running = true;
  const clock = { t: 0 };

  function frame(now) {
    if (!running) return;
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    clock.t += dt;

    controls.update();
    mascot.update(dt);
    school.update(dt, clock.t);
    markers.forEach((m, i) => {
      m.sprite.material.opacity = 0.28 + Math.sin(clock.t * 1.8 + i * 2) * 0.22;
      m.sprite.position.y += Math.sin(clock.t * 1.4 + i) * 0.0015;
    });

    renderer.render(scene, camera);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      running = false;
    } else if (!running) {
      running = true;
      last = performance.now();
      requestAnimationFrame(frame);
    }
  });

  return {
    focusCategory(id) {
      const item = byCategory.get(id);
      if (!item) return;
      controls.flyTo(item.focus);
    },
    resetView() {
      controls.flyHome();
    },
    syncFavorites(phrases) {
      school.layout(phrases);
    },
    cheer: mascot.cheer,
    setInteractive(v) {
      controls.enabled = v;
    },
    markersVisible(v) {
      markers.forEach((m) => {
        m.sprite.visible = v;
      });
    }
  };
}
