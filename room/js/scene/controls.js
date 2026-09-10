import * as THREE from '../../vendor/three.module.js';

/**
 * Touch-first orbit controls: one finger drags the room around, two fingers
 * pinch to move closer. Camera state is always (target, yaw, pitch, distance)
 * so flying to a piece of furniture is just a tween of four numbers.
 */
const clamp = THREE.MathUtils.clamp;

export const HOME = { yaw: 0.79, pitch: 0.6, distance: 18.5, target: new THREE.Vector3(0, 2.2, -0.4) };

export function createControls(camera, dom, { onTap }) {
  const state = {
    yaw: HOME.yaw,
    pitch: HOME.pitch,
    /** Tall, narrow screens need to stand further back to frame the same room. */
    fit: 1,
    distance: HOME.distance,
    target: HOME.target.clone(),
    vYaw: 0,
    vPitch: 0,
    enabled: true,
    tween: null
  };

  const pointers = new Map();
  let dragStart = null;
  let pinchStart = null;

  function apply() {
    const cosP = Math.cos(state.pitch);
    camera.position.set(
      state.target.x + Math.sin(state.yaw) * cosP * state.distance,
      state.target.y + Math.sin(state.pitch) * state.distance,
      state.target.z + Math.cos(state.yaw) * cosP * state.distance
    );
    camera.lookAt(state.target);
  }

  function onDown(e) {
    dom.setPointerCapture?.(e.pointerId);
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.size === 1) {
      dragStart = { x: e.clientX, y: e.clientY, t: performance.now(), moved: 0 };
      state.vYaw = 0;
      state.vPitch = 0;
    } else if (pointers.size === 2) {
      pinchStart = { dist: pointerDistance(), distance: state.distance };
    }
  }

  function pointerDistance() {
    const [a, b] = [...pointers.values()];
    return Math.hypot(a.x - b.x, a.y - b.y);
  }

  function onMove(e) {
    if (!pointers.has(e.pointerId)) return;
    const prev = pointers.get(e.pointerId);
    const dx = e.clientX - prev.x;
    const dy = e.clientY - prev.y;
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (dragStart) dragStart.moved += Math.abs(dx) + Math.abs(dy);
    if (!state.enabled) return;

    if (pointers.size === 2 && pinchStart) {
      const ratio = pinchStart.dist / Math.max(1, pointerDistance());
      state.distance = clamp(pinchStart.distance * ratio, 3.5, 70);
      apply();
      return;
    }

    if (pointers.size === 1) {
      state.tween = null;
      state.vYaw = -dx * 0.005;
      state.vPitch = -dy * 0.004;
      state.yaw = clamp(state.yaw + state.vYaw, -0.25, 1.85);
      state.pitch = clamp(state.pitch + state.vPitch, 0.14, 1.18);
      apply();
    }
  }

  function onUp(e) {
    pointers.delete(e.pointerId);
    if (pointers.size < 2) pinchStart = null;
    if (pointers.size === 0 && dragStart) {
      const dt = performance.now() - dragStart.t;
      if (dragStart.moved < 12 && dt < 450) {
        onTap?.(dragStart.x, dragStart.y);
        state.vYaw = 0;
        state.vPitch = 0;
      }
      dragStart = null;
    }
  }

  dom.addEventListener('pointerdown', onDown);
  dom.addEventListener('pointermove', onMove);
  dom.addEventListener('pointerup', onUp);
  dom.addEventListener('pointercancel', onUp);
  dom.addEventListener('pointerleave', onUp);
  dom.addEventListener('wheel', (e) => {
    if (!state.enabled) return;
    e.preventDefault();
    state.tween = null;
    state.distance = clamp(state.distance + e.deltaY * 0.03, 3.5, 70);
    apply();
  }, { passive: false });

  function flyTo({ target, dir, dist }, duration = 900) {
    const d = dir.clone().normalize();
    const yaw = Math.atan2(d.x, d.z);
    const pitch = clamp(Math.asin(d.y), 0.14, 1.18);
    tweenTo({ yaw, pitch, distance: dist * state.fit, target: target.clone() }, duration);
  }

  function flyHome(duration = 950) {
    tweenTo({ ...HOME, distance: HOME.distance * state.fit, target: HOME.target.clone() }, duration);
  }

  /** Called on resize: keeps the framing constant across aspect ratios. */
  function setFit(fit) {
    if (Math.abs(fit - state.fit) < 0.001) return;
    const ratio = fit / state.fit;
    state.fit = fit;
    state.distance = clamp(state.distance * ratio, 3.5, 70);
    if (state.tween) {
      state.tween.from.distance *= ratio;
      state.tween.to.distance *= ratio;
    }
    apply();
  }

  function tweenTo(to, duration) {
    // Take the shorter way around the room.
    let toYaw = to.yaw;
    while (toYaw - state.yaw > Math.PI) toYaw -= Math.PI * 2;
    while (toYaw - state.yaw < -Math.PI) toYaw += Math.PI * 2;
    state.tween = {
      from: { yaw: state.yaw, pitch: state.pitch, distance: state.distance, target: state.target.clone() },
      to: { ...to, yaw: toYaw },
      start: performance.now(),
      duration
    };
  }

  const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

  function update() {
    if (state.tween) {
      const t = clamp((performance.now() - state.tween.start) / state.tween.duration, 0, 1);
      const e = easeInOut(t);
      const { from, to } = state.tween;
      state.yaw = from.yaw + (to.yaw - from.yaw) * e;
      state.pitch = from.pitch + (to.pitch - from.pitch) * e;
      state.distance = from.distance + (to.distance - from.distance) * e;
      state.target.lerpVectors(from.target, to.target, e);
      apply();
      if (t >= 1) state.tween = null;
      return;
    }
    if (pointers.size === 0 && (Math.abs(state.vYaw) > 0.0001 || Math.abs(state.vPitch) > 0.0001)) {
      state.vYaw *= 0.93;
      state.vPitch *= 0.93;
      state.yaw = clamp(state.yaw + state.vYaw, -0.25, 1.85);
      state.pitch = clamp(state.pitch + state.vPitch, 0.14, 1.18);
      apply();
    }
  }

  apply();

  return {
    update,
    flyTo,
    flyHome,
    setFit,
    get enabled() {
      return state.enabled;
    },
    set enabled(v) {
      state.enabled = v;
    },
    state
  };
}
