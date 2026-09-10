import * as THREE from '../../vendor/three.module.js';
import { box, mat, glowMat } from './build.js';

/**
 * One fish per favorite phrase. The school is rebuilt from the store whenever
 * the favorites change, and each fish carries its phrase id so a tap on the
 * fish opens exactly that phrase.
 */
const PALETTE_FISH = [0xff9ec4, 0xffd08a, 0x8fe3ff, 0xb6f2c8, 0xc9a8ff, 0xffbd8a, 0x9affd1, 0xffa8a8];

function makeFish(color) {
  const g = new THREE.Group();
  const skin = mat(color, { emissive: color, emissiveIntensity: 0.18 });
  const body = box(0.38, 0.24, 0.2, color, 0, 0, 0, { material: skin });
  const nose = box(0.12, 0.14, 0.13, color, 0.22, 0, 0, { material: skin });
  const tail = box(0.16, 0.22, 0.06, color, -0.26, 0.02, 0, { material: skin });
  const fin = box(0.1, 0.08, 0.18, color, 0.02, 0.11, 0, { material: skin });
  const eye = box(0.05, 0.05, 0.05, 0xfff6d8, 0.18, 0.05, 0.09, { material: glowMat(0xfff6d8, 0.9) });
  g.add(body, nose, tail, fin, eye);
  g.userData.tail = tail;
  return g;
}

export function createSchool(parent, bounds) {
  const school = new THREE.Group();
  parent.add(school);
  const fishes = [];

  function layout(phrases) {
    // Reuse existing fish where possible so the tank does not visibly reshuffle.
    while (fishes.length > phrases.length) {
      const f = fishes.pop();
      school.remove(f.object);
    }
    while (fishes.length < phrases.length) {
      const i = fishes.length;
      const object = makeFish(PALETTE_FISH[i % PALETTE_FISH.length]);
      school.add(object);
      fishes.push({
        object,
        phase: Math.random() * Math.PI * 2,
        speed: 0.35 + Math.random() * 0.35,
        radiusX: 0.55 + Math.random() * 0.4,
        radiusZ: 0.18 + Math.random() * 0.2,
        yBase: 0,
        bob: 0.06 + Math.random() * 0.1,
        dir: Math.random() > 0.5 ? 1 : -1
      });
    }

    const midY = (bounds.min.y + bounds.max.y) / 2;
    const spanY = Math.max(0.15, (bounds.max.y - bounds.min.y) / 2 - 0.12);
    fishes.forEach((f, i) => {
      const phrase = phrases[i];
      f.phraseId = phrase.id;
      f.object.userData.phraseId = phrase.id;
      f.object.children.forEach((c) => {
        c.userData.phraseId = phrase.id;
      });
      f.yBase = midY + (phrases.length > 1 ? ((i % 3) - 1) * spanY * 0.55 : 0);
      f.centerX = (bounds.min.x + bounds.max.x) / 2;
      f.centerZ = (bounds.min.z + bounds.max.z) / 2 + ((i % 2) - 0.5) * 0.25;
      f.phase = (i / Math.max(1, phrases.length)) * Math.PI * 2;
    });
  }

  function update(dt, time) {
    fishes.forEach((f) => {
      f.phase += dt * f.speed * f.dir;
      const x = f.centerX + Math.cos(f.phase) * f.radiusX;
      const z = f.centerZ + Math.sin(f.phase * 1.6) * f.radiusZ;
      const y = f.yBase + Math.sin(time * 1.2 + f.phase) * f.bob;
      f.object.position.set(
        THREE.MathUtils.clamp(x, bounds.min.x, bounds.max.x),
        THREE.MathUtils.clamp(y, bounds.min.y, bounds.max.y),
        THREE.MathUtils.clamp(z, bounds.min.z, bounds.max.z)
      );
      const heading = -Math.sin(f.phase) * f.radiusX * f.dir;
      f.object.rotation.y = heading >= 0 ? 0 : Math.PI;
      f.object.position.y += 0;
      f.object.userData.tail.rotation.y = Math.sin(time * 9 + f.phase) * 0.6;
    });
  }

  /** Bring one fish to the front of the tank so the tapped phrase is readable. */
  function highlight(phraseId) {
    const f = fishes.find((x) => x.phraseId === phraseId);
    if (!f) return;
    f.object.scale.setScalar(1);
    const start = performance.now();
    const pulse = () => {
      const t = (performance.now() - start) / 600;
      if (t >= 1) {
        f.object.scale.setScalar(1);
        return;
      }
      f.object.scale.setScalar(1 + Math.sin(t * Math.PI) * 0.45);
      requestAnimationFrame(pulse);
    };
    pulse();
  }

  return { layout, update, highlight, group: school };
}
