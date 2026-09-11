import * as THREE from '../../vendor/three.module.js';
import { PALETTE } from './palette.js';

/** Low-poly helpers: everything in the room is boxes, cylinders and cones. */
const matCache = new Map();

/**
 * A single colour grade applied to every surface as it is built, so the room's
 * own paint shifts with the hour instead of only its lighting. Set once, before
 * anything is built.
 */
let grade = null;
const scratch = new THREE.Color();
const tint = new THREE.Color();

export function setColorGrade(g) {
  grade = g || null;
  matCache.clear();
}

function graded(color) {
  if (!grade) return color;
  scratch.set(color);
  tint.set(grade.tint);
  scratch.lerp(tint, grade.amount);
  const hsl = { h: 0, s: 0, l: 0 };
  scratch.getHSL(hsl);
  scratch.setHSL(hsl.h, Math.min(1, hsl.s * grade.saturation), Math.min(1, hsl.l * grade.lightness));
  return scratch.getHex();
}

export function mat(color, opts = {}) {
  const key = `${color}|${JSON.stringify(opts)}`;
  if (matCache.has(key)) return matCache.get(key);
  const shaded = graded(color);
  const m = new THREE.MeshLambertMaterial({
    color: shaded,
    flatShading: true,
    ...opts,
    ...(opts.emissive !== undefined ? { emissive: graded(opts.emissive) } : {})
  });
  matCache.set(key, m);
  return m;
}

export function glowMat(color, intensity = 0.9) {
  return mat(color, { emissive: color, emissiveIntensity: intensity });
}

export function box(w, h, d, color, x = 0, y = 0, z = 0, opts) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), opts?.material || mat(color, opts));
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

export function cyl(rt, rb, h, seg, color, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat(color));
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

export function group(...children) {
  const g = new THREE.Group();
  children.forEach((c) => c && g.add(c));
  return g;
}

/** Soft radial sprite used as a cheap stand-in for bloom. */
let glowTexture = null;
export function glowSprite(color, size = 2, opacity = 0.55) {
  if (!glowTexture) {
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    const ctx = c.getContext('2d');
    const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.35, 'rgba(255,255,255,0.45)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 128, 128);
    glowTexture = new THREE.CanvasTexture(c);
  }
  const s = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: glowTexture,
      color,
      transparent: true,
      opacity,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    })
  );
  s.scale.set(size, size, 1);
  s.raycast = () => {}; // decoration only — never blocks a tap
  return s;
}

/** Poster / screen art drawn procedurally — keeps the repo asset-free. */
export function artTexture(draw, w = 256, h = 256) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');
  draw(ctx, w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function posterMesh(w, h, draw) {
  const tex = artTexture(draw, 256, Math.round((256 * h) / w));
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(w, h),
    new THREE.MeshLambertMaterial({ map: tex, emissive: 0x2a2350, emissiveIntensity: 0.35 })
  );
  return m;
}

export const ROOM = {
  size: 12,
  wallH: 6.4,
  get half() {
    return this.size / 2;
  }
};

export function buildShell() {
  const g = new THREE.Group();

  const floor = new THREE.Mesh(
    new THREE.BoxGeometry(ROOM.size, 0.5, ROOM.size),
    mat(PALETTE.floor)
  );
  floor.position.y = -0.25;
  floor.receiveShadow = true;
  g.add(floor);

  // Tile seams: thin darker strips, cheap and reads as low-poly flooring.
  const seam = mat(PALETTE.floorEdge);
  for (let i = -ROOM.half + 2; i < ROOM.half; i += 2) {
    const a = new THREE.Mesh(new THREE.BoxGeometry(ROOM.size, 0.02, 0.06), seam);
    a.position.set(0, 0.005, i);
    g.add(a);
    const b = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.02, ROOM.size), seam);
    b.position.set(i, 0.005, 0);
    g.add(b);
  }

  // Plinth under the floor so the room reads as a floating diorama.
  const plinth = box(ROOM.size + 0.9, 0.7, ROOM.size + 0.9, PALETTE.baseboard, 0, -0.85, 0);
  g.add(plinth);

  const back = box(ROOM.size, ROOM.wallH, 0.3, PALETTE.wall, 0, ROOM.wallH / 2, -ROOM.half);
  const left = box(0.3, ROOM.wallH, ROOM.size, PALETTE.wallDark, -ROOM.half, ROOM.wallH / 2, 0);
  g.add(back, left);

  // Vertical panelling
  for (let i = -ROOM.half + 0.75; i < ROOM.half; i += 1.5) {
    const p = box(0.08, ROOM.wallH - 0.4, 0.08, PALETTE.woodDark, i, ROOM.wallH / 2, -ROOM.half + 0.18);
    g.add(p);
    const q = box(0.08, ROOM.wallH - 0.4, 0.08, PALETTE.woodDark, -ROOM.half + 0.18, ROOM.wallH / 2, i);
    g.add(q);
  }

  return g;
}
