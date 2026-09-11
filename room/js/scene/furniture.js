import * as THREE from '../../vendor/three.module.js';
import { PALETTE } from './palette.js';
import { box, cyl, mat, glowMat, glowSprite, posterMesh, group, ROOM } from './build.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);

/* ------------------------------------------------------------------ */
/* Interactive furniture — each one is bound to a category by id only. */
/* ------------------------------------------------------------------ */

function makeTv() {
  const g = new THREE.Group();
  g.position.set(3.1, 0, -4.9);

  const stand = box(3.6, 0.9, 1.1, PALETTE.woodDark, 0, 0.45, 0.15);
  const shelfGap = box(3.2, 0.1, 0.9, PALETTE.metal, 0, 0.62, 0.2);
  g.add(stand, shelfGap);

  const consoleBox = box(1.5, 0.34, 0.8, 0x3a3455, -0.85, 0.79, 0.2);
  const consoleLed = box(0.1, 0.06, 0.02, PALETTE.screen, -0.2, 0.79, 0.61, {
    material: glowMat(PALETTE.screen, 1.4)
  });
  g.add(consoleBox, consoleLed);

  const frame = box(3.5, 2.1, 0.22, 0x2a2440, 0, 2.05, 0.1);
  g.add(frame);

  const screen = new THREE.Mesh(
    new THREE.PlaneGeometry(3.2, 1.82),
    new THREE.MeshBasicMaterial({
      map: screenTexture(),
      toneMapped: false
    })
  );
  screen.position.set(0, 2.05, 0.23);
  g.add(screen);

  const glow = glowSprite(PALETTE.screen, 5.2, 0.3);
  glow.position.set(0, 2.05, 0.6);
  g.add(glow);

  const light = new THREE.PointLight(PALETTE.screen, 9, 9, 2);
  light.position.set(0, 2.1, 1.1);
  g.add(light);

  return { g, hit: [frame, screen, stand], focus: { target: V(3.1, 2.0, -4.6), dir: V(0.1, 0.32, 1), dist: 5.6 } };
}

function screenTexture() {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 144;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#1d4f74';
  ctx.fillRect(0, 0, 256, 144);
  ctx.fillStyle = '#3f9dc9';
  ctx.fillRect(0, 96, 256, 48);
  const blocks = [
    ['#8fe3ff', 24, 40, 40, 40],
    ['#ffd08a', 92, 24, 56, 56],
    ['#b6f2c8', 168, 48, 44, 32],
    ['#ff9ec4', 200, 92, 36, 20]
  ];
  blocks.forEach(([col, x, y, w, h]) => {
    ctx.fillStyle = col;
    ctx.fillRect(x, y, w, h);
  });
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.magFilter = THREE.NearestFilter;
  return t;
}

function makeBookshelf() {
  const g = new THREE.Group();
  g.position.set(-4.9, 0, -1.2);
  g.rotation.y = Math.PI / 2;

  const shellW = 3.4;
  const shellH = 4.3;
  const depth = 0.9;

  const backPanel = box(shellW, shellH, 0.12, PALETTE.woodDark, 0, shellH / 2, -depth / 2);
  const sideL = box(0.16, shellH, depth, PALETTE.wood, -shellW / 2, shellH / 2, 0);
  const sideR = box(0.16, shellH, depth, PALETTE.wood, shellW / 2, shellH / 2, 0);
  const top = box(shellW + 0.2, 0.18, depth + 0.1, PALETTE.wood, 0, shellH, 0);
  g.add(backPanel, sideL, sideR, top);

  const bookColors = [0x8f6bd8, 0xd8776b, 0x6bb8d8, 0xd8b96b, 0x7fd89a, 0xd86ba4];
  let seed = 7;
  const rnd = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);

  for (let row = 0; row < 4; row += 1) {
    const y = 0.5 + row * 1.0;
    g.add(box(shellW - 0.2, 0.12, depth, PALETTE.wood, 0, y - 0.06, 0));
    let x = -shellW / 2 + 0.35;
    while (x < shellW / 2 - 0.3) {
      const w = 0.14 + rnd() * 0.16;
      const h = 0.55 + rnd() * 0.3;
      const b = box(w, h, 0.55, bookColors[Math.floor(rnd() * bookColors.length)], x, y + h / 2, 0.05);
      b.rotation.z = rnd() > 0.9 ? 0.18 : 0;
      g.add(b);
      x += w + 0.035;
    }
  }

  // A warm reading lamp clipped to the top shelf.
  const lampArm = cyl(0.04, 0.04, 0.5, 6, PALETTE.metal, shellW / 2 - 0.5, shellH + 0.25, 0);
  const lampHead = cyl(0.16, 0.26, 0.28, 6, PALETTE.lampWarm, shellW / 2 - 0.5, shellH + 0.5, 0);
  lampHead.material = glowMat(PALETTE.lampWarm, 1.1);
  const lampLight = new THREE.PointLight(PALETTE.lampWarm, 6, 6, 2);
  lampLight.position.set(shellW / 2 - 0.5, shellH + 0.3, 0.4);
  g.add(lampArm, lampHead, lampLight, glowSprite(PALETTE.lampWarm, 2.4, 0.4).translateX(shellW / 2 - 0.5).translateY(shellH + 0.5));

  return {
    g,
    hit: [backPanel, sideL, sideR, top],
    focus: { target: V(-4.2, 2.3, -1.2), dir: V(1, 0.3, 0.35), dist: 5.6 }
  };
}

function makeAquarium() {
  const g = new THREE.Group();
  g.position.set(-0.6, 0, -4.8);

  const w = 3.4;
  const h = 1.7;
  const d = 1.3;
  const baseY = 2.0;

  // Stand
  const legMat = PALETTE.metal;
  [[-w / 2 + 0.2, -d / 2 + 0.25], [w / 2 - 0.2, -d / 2 + 0.25], [-w / 2 + 0.2, d / 2 - 0.25], [w / 2 - 0.2, d / 2 - 0.25]].forEach(
    ([x, z]) => g.add(box(0.14, baseY, 0.14, legMat, x, baseY / 2, z))
  );
  const tableTop = box(w + 0.25, 0.16, d + 0.2, PALETTE.woodDark, 0, baseY + 0.08, 0);
  g.add(tableTop);

  // Tank glass
  const glass = new THREE.Mesh(
    new THREE.BoxGeometry(w, h, d),
    new THREE.MeshPhongMaterial({
      color: PALETTE.glass,
      transparent: true,
      opacity: 0.22,
      shininess: 90,
      specular: 0xffffff
    })
  );
  glass.position.set(0, baseY + 0.16 + h / 2, 0);
  g.add(glass);

  const water = new THREE.Mesh(
    new THREE.BoxGeometry(w - 0.12, h - 0.34, d - 0.12),
    new THREE.MeshLambertMaterial({
      color: PALETTE.water,
      transparent: true,
      opacity: 0.2,
      emissive: PALETTE.water,
      emissiveIntensity: 0.3
    })
  );
  water.position.set(0, baseY + 0.16 + h / 2 - 0.1, 0);
  g.add(water);

  const sand = box(w - 0.14, 0.18, d - 0.14, 0xd9c48f, 0, baseY + 0.3, 0);
  g.add(sand);

  // Weeds + rocks
  let seed = 21;
  const rnd = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
  for (let i = 0; i < 9; i += 1) {
    const x = -w / 2 + 0.3 + rnd() * (w - 0.6);
    const z = -d / 2 + 0.25 + rnd() * (d - 0.5);
    const hh = 0.3 + rnd() * 0.5;
    const weed = box(0.12, hh, 0.12, rnd() > 0.5 ? PALETTE.plant : PALETTE.plantDark, x, baseY + 0.36 + hh / 2, z);
    weed.rotation.y = rnd() * Math.PI;
    weed.rotation.z = (rnd() - 0.5) * 0.35;
    g.add(weed);
  }
  for (let i = 0; i < 4; i += 1) {
    g.add(box(0.3, 0.22, 0.28, 0x8f86a8, -w / 2 + 0.5 + rnd() * (w - 1), baseY + 0.44, -d / 2 + 0.3 + rnd() * (d - 0.6)));
  }

  const hood = box(w + 0.1, 0.16, d + 0.06, 0x3a3455, 0, baseY + 0.16 + h + 0.06, 0);
  g.add(hood);

  const tankLight = new THREE.PointLight(PALETTE.glowFav, 3.4, 7, 2);
  tankLight.position.set(0, baseY + h, 0.6);
  g.add(tankLight);
  const glow = glowSprite(PALETTE.glowFav, 4.6, 0.26);
  glow.position.set(0, baseY + 1.0, 0.7);
  g.add(glow);

  const swimBounds = {
    min: V(-w / 2 + 0.35, baseY + 0.55, -d / 2 + 0.3),
    max: V(w / 2 - 0.35, baseY + 0.16 + h - 0.3, d / 2 - 0.3),
    origin: g.position.clone()
  };

  return {
    g,
    hit: [glass, tableTop, hood],
    swimBounds,
    focus: { target: V(-0.6, baseY + 0.9, -4.4), dir: V(0.05, 0.22, 1), dist: 6.2 }
  };
}

export function buildInteractive(scene) {
  const tv = makeTv();
  const shelf = makeBookshelf();
  const tank = makeAquarium();

  const items = [
    { id: 'tv', categoryId: 'tv', ...tv },
    { id: 'bookshelf', categoryId: 'bookshelf', ...shelf },
    { id: 'aquarium', categoryId: 'aquarium', ...tank }
  ];

  items.forEach((item) => {
    // Tagging the whole group means any part of the furniture answers a tap —
    // the tank's water and gravel included.
    item.g.userData.categoryId = item.categoryId;
    scene.add(item.g);
  });

  return items;
}

/* ------------------------------------------------------------------ */
/* Non-interactive props — pure set dressing.                          */
/* ------------------------------------------------------------------ */

export function buildProps(scene) {
  const props = new THREE.Group();

  // Rug in front of the TV
  const rug = box(4.6, 0.06, 3.4, PALETTE.rug, 2.4, 0.03, -2.1);
  const rugTrim = box(4.1, 0.07, 2.9, PALETTE.rugTrim, 2.4, 0.035, -2.1);
  const rugInner = box(3.6, 0.08, 2.4, PALETTE.rug, 2.4, 0.04, -2.1);
  props.add(rug, rugTrim, rugInner);

  // Sofa facing the TV
  const sofa = group(
    box(2.9, 0.55, 1.5, PALETTE.fabric, 0, 0.55, 0),
    box(2.9, 0.9, 0.35, PALETTE.fabricDark, 0, 0.9, 0.68),
    box(0.35, 0.75, 1.5, PALETTE.fabric, -1.3, 0.8, 0),
    box(0.35, 0.75, 1.5, PALETTE.fabric, 1.3, 0.8, 0),
    box(0.22, 0.3, 0.22, PALETTE.woodDark, -1.25, 0.15, -0.6),
    box(0.22, 0.3, 0.22, PALETTE.woodDark, 1.25, 0.15, -0.6)
  );
  sofa.position.set(2.4, 0, -0.9);
  sofa.rotation.y = Math.PI;
  props.add(sofa);

  // Low table with a warm lantern
  const table = group(
    box(1.5, 0.14, 0.8, PALETTE.rug, 0, 0.55, 0),
    box(0.12, 0.55, 0.12, PALETTE.woodDark, -0.6, 0.28, -0.28),
    box(0.12, 0.55, 0.12, PALETTE.woodDark, 0.6, 0.28, -0.28)
  );
  table.position.set(0.5, 0, -2.4);
  props.add(table);

  const lantern = group(
    box(0.3, 0.4, 0.3, PALETTE.lampWarm, 0, 0.25, 0, { material: glowMat(PALETTE.lampWarm, 1.3) }),
    box(0.36, 0.08, 0.36, PALETTE.metal, 0, 0.5, 0)
  );
  lantern.position.set(0.4, 0, -1.2);
  const lanternLight = new THREE.PointLight(PALETTE.lampWarm, 6, 5.5, 2);
  lanternLight.position.set(0.4, 0.5, -1.2);
  props.add(lantern, lanternLight, glowSprite(PALETTE.lampWarm, 2.2, 0.42).translateX(0.4).translateY(0.35).translateZ(-1.2));

  // Desk + green screen corner (the streaming nook from the reference)
  const desk = group(
    box(3.4, 0.18, 1.5, PALETTE.rug, 0, 1.05, 0),
    box(3.2, 1.0, 1.3, 0xa8546a, 0, 0.5, 0)
  );
  desk.position.set(-2.6, 0, -2.4);
  props.add(desk);

  // A painting of the room-mate, propped where the green screen used to be.
  const canvasFrame = box(3.56, 2.76, 0.12, 0x8a6a4a, -3.4, 2.4, -4.42);
  const painting = posterMesh(3.3, 2.5, drawDino);
  painting.position.set(-3.4, 2.4, -4.34);
  props.add(canvasFrame, painting);

  const monitor = group(
    box(1.1, 0.75, 0.1, 0x2a2440, 0, 0.38, 0),
    box(0.3, 0.2, 0.25, PALETTE.metal, 0, 0.05, 0.05)
  );
  monitor.position.set(-1.7, 1.14, -2.4);
  monitor.rotation.y = -0.5;
  props.add(monitor);

  // Fishbowl on the desk (nod to the reference image)
  const bowl = new THREE.Mesh(
    new THREE.SphereGeometry(0.34, 10, 8),
    new THREE.MeshPhongMaterial({ color: 0xc07de8, transparent: true, opacity: 0.42, shininess: 80 })
  );
  bowl.position.set(-3.4, 1.42, -1.9);
  props.add(bowl, glowSprite(0xc07de8, 1.6, 0.4).translateX(-3.4).translateY(1.42).translateZ(-1.9));

  // Studio light on a tripod
  const tripod = group(
    cyl(0.05, 0.05, 2.2, 6, PALETTE.metal, 0, 1.1, 0),
    box(0.55, 0.55, 0.18, PALETTE.lampWarm, 0, 2.35, 0, { material: glowMat(PALETTE.lampWarm, 1.2) }),
    cyl(0.05, 0.05, 0.9, 6, PALETTE.metal, 0.3, 0.45, 0.2),
    cyl(0.05, 0.05, 0.9, 6, PALETTE.metal, -0.3, 0.45, 0.2)
  );
  tripod.children[2].rotation.z = 0.5;
  tripod.children[3].rotation.z = -0.5;
  tripod.position.set(-3.2, 0, -5.0);
  const studioLight = new THREE.PointLight(PALETTE.lampWarm, 8, 8, 2);
  studioLight.position.set(-3.2, 2.5, -4.6);
  props.add(tripod, studioLight);

  // Plants
  props.add(makePlant(5.2, -2.2, 1.0), makePlant(5.0, 3.4, 1.35), makePlant(-5.1, 2.4, 1.15));

  // Drum kit, front-left
  const drums = group(
    cyl(0.75, 0.75, 0.9, 10, 0xb9b3d6, 0, 0.5, 0),
    cyl(0.34, 0.34, 0.42, 8, 0xd8d2f0, -0.85, 1.0, -0.4),
    cyl(0.3, 0.3, 0.38, 8, 0xd8d2f0, -0.1, 1.15, -0.7),
    cyl(0.42, 0.42, 0.02, 10, PALETTE.lampWarm, -1.2, 1.55, 0.1),
    cyl(0.36, 0.36, 0.02, 10, PALETTE.lampWarm, 0.55, 1.7, -0.2),
    cyl(0.4, 0.4, 0.02, 10, PALETTE.lampWarm, 0.9, 1.3, 0.5)
  );
  drums.children.slice(3).forEach((c) => {
    c.material = glowMat(PALETTE.lampWarm, 0.7);
    c.rotation.z = 0.18;
  });
  drums.position.set(-2.4, 0, 3.3);
  props.add(drums);

  // Keyboard on a stand, front-right
  const keys = group(
    box(2.3, 0.16, 0.62, 0x2f2a4d, 0, 1.15, 0),
    box(2.1, 0.06, 0.42, 0xe8e3ff, 0, 1.25, 0.05),
    cyl(0.05, 0.05, 1.15, 6, PALETTE.metal, -0.8, 0.57, 0),
    cyl(0.05, 0.05, 1.15, 6, PALETTE.metal, 0.8, 0.57, 0),
    box(0.9, 0.6, 0.1, PALETTE.lampWarm, 0.1, 1.85, -0.25, { material: glowMat(PALETTE.lampWarm, 0.9) })
  );
  keys.position.set(3.0, 0, 3.2);
  keys.rotation.y = -0.5;
  props.add(keys);

  // Bin of crumpled ideas
  props.add(cyl(0.36, 0.28, 0.7, 8, 0x5fa8c4, -4.6, 0.35, -0.1));
  for (let i = 0; i < 5; i += 1) {
    const p = box(0.2, 0.2, 0.2, 0xcfd8ff, -4.6 + Math.sin(i * 2.1) * 0.9, 0.12, -0.1 + Math.cos(i * 1.7) * 0.8);
    p.rotation.set(i, i * 0.7, i * 0.3);
    props.add(p);
  }

  // Wall art
  const posters = [
    { draw: drawEye, w: 2.0, h: 1.4, x: -3.9, y: 4.6, z: -5.82, ry: 0 },
    { draw: drawLogo, w: 2.2, h: 1.5, x: -1.1, y: 4.9, z: -5.82, ry: 0 },
    { draw: drawFishArt, w: 1.9, h: 2.3, x: 1.5, y: 4.4, z: -5.82, ry: 0 },
    { draw: drawUfo, w: 1.9, h: 2.3, x: 3.7, y: 4.2, z: -5.82, ry: 0 }
  ];
  posters.forEach((p) => {
    const m = posterMesh(p.w, p.h, p.draw);
    m.position.set(p.x, p.y, p.z);
    m.rotation.y = p.ry;
    props.add(m);
  });

  // Window on the back wall, right end
  const windowFrame = box(1.7, 1.5, 0.1, 0xc98f6b, 5.0, 4.3, -5.85);
  const windowGlass = box(1.5, 1.3, 0.06, 0x8aa6e8, 5.0, 4.3, -5.78, {
    material: glowMat(0x8aa6e8, 0.3)
  });
  props.add(windowFrame, windowGlass, glowSprite(0xa9c4ff, 3.0, 0.2).translateX(5.0).translateY(4.3).translateZ(-5.4));

  // Toy blocks scattered on the floor
  [[1.6, 3.9, 0xd8776b], [1.95, 3.75, 0x6bb8d8], [2.3, 3.95, 0x7fd89a]].forEach(([x, z, c]) =>
    props.add(box(0.34, 0.3, 0.34, c, x, 0.15, z))
  );

  scene.add(props);
  return props;
}

function makePlant(x, z, scale = 1) {
  const g = group(
    cyl(0.3, 0.38, 0.5, 6, 0xb06a52, 0, 0.25, 0),
    box(0.16, 0.9, 0.16, PALETTE.plantDark, 0, 0.85, 0)
  );
  for (let i = 0; i < 5; i += 1) {
    const leaf = box(0.55, 0.16, 0.3, i % 2 ? PALETTE.plant : PALETTE.plantDark, 0, 1.05 + i * 0.18, 0);
    leaf.rotation.y = i * 1.25;
    leaf.rotation.z = 0.35;
    leaf.position.x = Math.cos(i * 1.25) * 0.28;
    leaf.position.z = Math.sin(i * 1.25) * 0.28;
    g.add(leaf);
  }
  g.position.set(x, 0, z);
  g.scale.setScalar(scale);
  return g;
}

/* ---- procedural poster art ---- */
function base(ctx, w, h, color) {
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, w, h);
}

function drawEye(ctx, w, h) {
  base(ctx, w, h, '#2b2350');
  ctx.fillStyle = '#8f7fe0';
  ctx.beginPath();
  ctx.moveTo(w / 2, h * 0.2);
  ctx.lineTo(w * 0.82, h * 0.78);
  ctx.lineTo(w * 0.18, h * 0.78);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#f2ecff';
  ctx.beginPath();
  ctx.ellipse(w / 2, h * 0.56, w * 0.13, h * 0.09, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#3a2f6b';
  ctx.beginPath();
  ctx.arc(w / 2, h * 0.56, w * 0.05, 0, Math.PI * 2);
  ctx.fill();
}

function drawLogo(ctx, w, h) {
  base(ctx, w, h, '#181240');
  ctx.fillStyle = '#e8e2ff';
  ctx.beginPath();
  ctx.arc(w / 2, h * 0.42, h * 0.22, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#181240';
  ctx.beginPath();
  ctx.arc(w * 0.44, h * 0.38, h * 0.035, 0, Math.PI * 2);
  ctx.arc(w * 0.56, h * 0.38, h * 0.035, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#181240';
  ctx.lineWidth = h * 0.03;
  ctx.beginPath();
  ctx.arc(w / 2, h * 0.46, h * 0.09, 0.2, Math.PI - 0.2);
  ctx.stroke();
  ctx.fillStyle = '#b7aee8';
  ctx.font = `${Math.round(h * 0.1)}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillText('KNOWLEDGE ROOM', w / 2, h * 0.82);
}

function drawFishArt(ctx, w, h) {
  base(ctx, w, h, '#1d5c6b');
  ctx.fillStyle = '#2f8fa3';
  ctx.fillRect(0, h * 0.62, w, h * 0.38);
  ctx.fillStyle = '#7fe6d8';
  ctx.beginPath();
  ctx.ellipse(w * 0.48, h * 0.4, w * 0.26, h * 0.13, -0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(w * 0.2, h * 0.4);
  ctx.lineTo(w * 0.06, h * 0.28);
  ctx.lineTo(w * 0.08, h * 0.52);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#123f4c';
  ctx.beginPath();
  ctx.arc(w * 0.64, h * 0.37, w * 0.03, 0, Math.PI * 2);
  ctx.fill();
}

/** Low-poly portrait of the mascot, painted on the studio canvas. */
function drawDino(ctx, w, h) {
  const sky = ctx.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, '#2b2a63');
  sky.addColorStop(0.62, '#3d3a72');
  sky.addColorStop(1, '#4a3f6b');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);

  const poly = (color, pts) => {
    ctx.fillStyle = color;
    ctx.beginPath();
    pts.forEach(([x, y], i) => (i ? ctx.lineTo(x * w, y * h) : ctx.moveTo(x * w, y * h)));
    ctx.closePath();
    ctx.fill();
  };

  // Moon
  ctx.fillStyle = '#f3edd2';
  ctx.beginPath();
  ctx.arc(w * 0.8, h * 0.22, h * 0.09, 0, Math.PI * 2);
  ctx.fill();

  // Ground, in two facets
  poly('#3a5a52', [[0, 0.74], [0.42, 0.68], [1, 0.76], [1, 1], [0, 1]]);
  poly('#2e4a45', [[0, 0.86], [0.5, 0.8], [1, 0.88], [1, 1], [0, 1]]);

  const LIGHT = '#84cf63';
  const MID = '#5da34c';
  const DARK = '#3f7a3c';

  // Tail
  poly(MID, [[0.78, 0.56], [0.99, 0.46], [0.99, 0.54], [0.82, 0.68]]);
  // Body
  poly(MID, [[0.34, 0.54], [0.58, 0.48], [0.8, 0.55], [0.84, 0.67], [0.6, 0.75], [0.37, 0.7]]);
  // Belly facet
  poly(LIGHT, [[0.4, 0.66], [0.62, 0.72], [0.78, 0.66], [0.6, 0.75], [0.42, 0.72]]);
  // Legs
  poly(DARK, [[0.44, 0.72], [0.54, 0.71], [0.55, 0.9], [0.43, 0.9]]);
  poly(DARK, [[0.64, 0.7], [0.73, 0.68], [0.74, 0.87], [0.63, 0.88]]);
  poly(DARK, [[0.38, 0.9], [0.58, 0.9], [0.58, 0.94], [0.36, 0.94]]);
  poly(DARK, [[0.6, 0.87], [0.78, 0.87], [0.78, 0.91], [0.58, 0.91]]);
  // Neck + head
  poly(MID, [[0.32, 0.56], [0.26, 0.36], [0.4, 0.32], [0.44, 0.52]]);
  poly(LIGHT, [[0.3, 0.38], [0.16, 0.3], [0.18, 0.2], [0.34, 0.18], [0.43, 0.28], [0.4, 0.36]]);
  poly(DARK, [[0.16, 0.3], [0.06, 0.29], [0.07, 0.22], [0.18, 0.21]]);
  // Back spikes
  [[0.42, 0.3], [0.5, 0.44], [0.6, 0.47], [0.7, 0.5]].forEach(([x, y]) => {
    poly('#c9e6a4', [[x, y], [x + 0.05, y - 0.07], [x + 0.08, y + 0.01]]);
  });
  // Eye
  ctx.fillStyle = '#1d2a1c';
  ctx.beginPath();
  ctx.arc(w * 0.26, h * 0.27, h * 0.022, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(w * 0.252, h * 0.262, h * 0.008, 0, Math.PI * 2);
  ctx.fill();

  // Foliage in the foreground corners
  poly('#2c4a3e', [[0, 0.82], [0.08, 0.62], [0.17, 0.84]]);
  poly('#356152', [[0.86, 0.9], [0.94, 0.7], [1, 0.92]]);
}

function drawUfo(ctx, w, h) {
  base(ctx, w, h, '#241a52');
  ctx.fillStyle = 'rgba(126,232,168,0.35)';
  ctx.beginPath();
  ctx.moveTo(w * 0.42, h * 0.36);
  ctx.lineTo(w * 0.58, h * 0.36);
  ctx.lineTo(w * 0.82, h * 0.84);
  ctx.lineTo(w * 0.18, h * 0.84);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#cfc7ff';
  ctx.beginPath();
  ctx.ellipse(w * 0.5, h * 0.32, w * 0.24, h * 0.06, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#8fe8ff';
  ctx.beginPath();
  ctx.ellipse(w * 0.5, h * 0.26, w * 0.11, h * 0.05, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#f4f0ff';
  ctx.fillRect(w * 0.44, h * 0.7, w * 0.12, h * 0.08);
  ctx.fillRect(w * 0.41, h * 0.78, w * 0.05, h * 0.06);
  ctx.fillRect(w * 0.54, h * 0.78, w * 0.05, h * 0.06);
}

export { ROOM };
