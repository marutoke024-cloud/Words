import * as THREE from '../../vendor/three.module.js';
import { PALETTE } from './palette.js';
import { box, glowMat } from './build.js';

/**
 * The green room-mate. Purely ambient: it wanders on its own, never levels up,
 * and is not something the player controls.
 */
const AREA = { minX: -1.8, maxX: 3.8, minZ: 0.1, maxZ: 2.5 };

export function createMascot(scene) {
  const g = new THREE.Group();

  const body = box(0.62, 0.5, 0.9, PALETTE.mascot, 0, 0.62, 0);
  const belly = box(0.42, 0.24, 0.72, PALETTE.mascotBelly, 0, 0.5, 0.04);
  const neck = box(0.34, 0.44, 0.34, PALETTE.mascot, 0, 0.98, -0.3);
  const head = box(0.5, 0.42, 0.56, PALETTE.mascot, 0, 1.26, -0.42);
  const snout = box(0.34, 0.24, 0.24, PALETTE.mascotDark, 0, 1.2, -0.76);

  const eyeMat = glowMat(0xfff2c9, 1.1);
  const eyeL = box(0.1, 0.1, 0.06, 0xfff2c9, -0.16, 1.34, -0.68, { material: eyeMat });
  const eyeR = box(0.1, 0.1, 0.06, 0xfff2c9, 0.16, 1.34, -0.68, { material: eyeMat });

  const armL = box(0.14, 0.28, 0.14, PALETTE.mascotDark, -0.36, 0.72, -0.18);
  const armR = box(0.14, 0.28, 0.14, PALETTE.mascotDark, 0.36, 0.72, -0.18);

  const legL = box(0.2, 0.46, 0.26, PALETTE.mascotDark, -0.2, 0.28, 0.02);
  const legR = box(0.2, 0.46, 0.26, PALETTE.mascotDark, 0.2, 0.28, 0.02);
  const footL = box(0.24, 0.12, 0.4, PALETTE.mascotDark, -0.2, 0.06, -0.04);
  const footR = box(0.24, 0.12, 0.4, PALETTE.mascotDark, 0.2, 0.06, -0.04);

  const tail = new THREE.Group();
  const t1 = box(0.34, 0.3, 0.42, PALETTE.mascot, 0, 0.66, 0.62);
  const t2 = box(0.24, 0.22, 0.4, PALETTE.mascot, 0, 0.62, 0.98);
  const t3 = box(0.14, 0.14, 0.34, PALETTE.mascotDark, 0, 0.58, 1.28);
  tail.add(t1, t2, t3);

  // Back spikes
  for (let i = 0; i < 4; i += 1) {
    const spike = box(0.08, 0.18, 0.12, PALETTE.mascotBelly, 0, 0.9 - i * 0.02, -0.16 + i * 0.24);
    spike.rotation.x = 0.2;
    g.add(spike);
  }

  g.add(body, belly, neck, head, snout, eyeL, eyeR, armL, armR, legL, legR, footL, footR, tail);
  const BASE_SCALE = 0.92;
  g.scale.setScalar(BASE_SCALE);
  g.position.set(0.6, 0, 1.4);
  g.userData.mascot = true; // so a tap anywhere on the body finds it
  scene.add(g);

  const state = {
    target: pickTarget(),
    mode: 'walk',
    timer: 0,
    phase: 0,
    speed: 0.85,
    /** Yaw to turn toward while roaring, so it addresses the viewer. */
    faceYaw: null
  };

  const ROAR_TIME = 1.25;
  const SNOUT_Y = snout.position.y;

  function pickTarget() {
    return new THREE.Vector3(
      AREA.minX + Math.random() * (AREA.maxX - AREA.minX),
      0,
      AREA.minZ + Math.random() * (AREA.maxZ - AREA.minZ)
    );
  }

  function update(dt) {
    state.timer -= dt;

    if (state.mode === 'roar') {
      const t = 1 - Math.max(0, state.timer) / ROAR_TIME;
      // One quick rear-back-and-bellow, settling as it ends.
      const pulse = Math.sin(Math.min(1, t * 1.35) * Math.PI);
      const decay = 1 - t;

      if (state.faceYaw !== null) {
        let delta = state.faceYaw - g.rotation.y;
        while (delta > Math.PI) delta -= Math.PI * 2;
        while (delta < -Math.PI) delta += Math.PI * 2;
        g.rotation.y += delta * Math.min(1, dt * 9);
      }

      neck.rotation.x = -0.3 * pulse;
      head.rotation.x = -0.6 * pulse;
      head.rotation.y = 0;
      snout.position.y = SNOUT_Y - 0.09 * pulse;
      armL.rotation.x = -0.75 * pulse;
      armR.rotation.x = -0.75 * pulse;
      tail.rotation.y = Math.sin(t * 34) * 0.34 * decay;
      g.position.y = Math.abs(Math.sin(t * Math.PI * 1.6)) * 0.16 * decay;
      g.scale.setScalar(BASE_SCALE * (1 + 0.07 * pulse));

      if (state.timer <= 0) {
        neck.rotation.x = 0;
        head.rotation.x = 0;
        snout.position.y = SNOUT_Y;
        armL.rotation.x = 0;
        armR.rotation.x = 0;
        g.scale.setScalar(BASE_SCALE);
        g.position.y = 0;
        state.mode = 'idle';
        state.timer = 0.9;
        state.faceYaw = null;
      }
      return;
    }

    if (state.mode === 'idle') {
      state.phase += dt * 1.6;
      head.rotation.y = Math.sin(state.phase * 0.9) * 0.5;
      g.position.y = Math.abs(Math.sin(state.phase * 1.4)) * 0.03;
      tail.rotation.y = Math.sin(state.phase * 1.1) * 0.12;
      if (state.timer <= 0) {
        state.mode = 'walk';
        state.target = pickTarget();
        state.speed = 0.7 + Math.random() * 0.55;
      }
      return;
    }

    const dir = state.target.clone().sub(g.position);
    dir.y = 0;
    const dist = dir.length();

    if (dist < 0.18) {
      state.mode = 'idle';
      state.timer = 1.2 + Math.random() * 2.6;
      head.rotation.y = 0;
      return;
    }

    dir.normalize();
    g.position.addScaledVector(dir, state.speed * dt);

    // Face the direction of travel (model looks down -Z).
    const wanted = Math.atan2(dir.x, dir.z) + Math.PI;
    let delta = wanted - g.rotation.y;
    while (delta > Math.PI) delta -= Math.PI * 2;
    while (delta < -Math.PI) delta += Math.PI * 2;
    g.rotation.y += delta * Math.min(1, dt * 6);

    state.phase += dt * state.speed * 7.5;
    const swing = Math.sin(state.phase) * 0.55;
    legL.rotation.x = swing;
    legR.rotation.x = -swing;
    footL.position.z = -0.04 + Math.sin(state.phase) * 0.12;
    footR.position.z = -0.04 - Math.sin(state.phase) * 0.12;
    armL.rotation.x = -swing * 0.6;
    armR.rotation.x = swing * 0.6;
    tail.rotation.y = Math.sin(state.phase * 0.5) * 0.25;
    head.rotation.z = Math.sin(state.phase * 0.5) * 0.06;
    g.position.y = Math.abs(Math.sin(state.phase)) * 0.05;
  }

  /** Rears back and bellows — used when the room-mate is tapped. */
  function roar(faceYaw = null) {
    state.mode = 'roar';
    state.timer = ROAR_TIME;
    state.faceYaw = faceYaw;
  }

  /** Little hop used when the app wants the room to react (e.g. a new phrase). */
  function cheer() {
    state.mode = 'idle';
    state.timer = 1.4;
    const start = performance.now();
    const hop = () => {
      const t = (performance.now() - start) / 700;
      if (t >= 1) {
        g.position.y = 0;
        return;
      }
      g.position.y = Math.sin(t * Math.PI * 2) * 0.28;
      g.rotation.y += 0.12;
      requestAnimationFrame(hop);
    };
    hop();
  }

  return { object: g, update, cheer, roar };
}
