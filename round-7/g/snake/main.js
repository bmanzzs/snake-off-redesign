import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

/* =====================================================================
   Snake 3D
   Grid is N x N cells, 1 world unit each, centred on the origin.
   Cell (x, z) -> world (x - N/2 + 0.5, 0, z - N/2 + 0.5)
   ===================================================================== */

const N = 20;
const HALF = N / 2;
const cellToWorld = (c) => c - HALF + 0.5;

const COLORS = {
  bg: 0x0a0f1f,
  tileA: '#3b5a8f',
  tileB: '#324d7f',
  wall: 0x5470a8,
  wallGlow: 0x5fa8ff,
};

/* ---------- renderer / scene / camera ---------- */
const canvas = document.getElementById('game');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;

const scene = new THREE.Scene();
scene.background = new THREE.Color(COLORS.bg);
scene.fog = new THREE.Fog(COLORS.bg, 28, 60);

const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 200);
const camBase = new THREE.Vector3(0, 21, 15.5);
camera.position.copy(camBase);
camera.lookAt(0, 0, 0.6);

/* ---------- lights ---------- */
scene.add(new THREE.HemisphereLight(0xbcd4ff, 0x101830, 1.1));

const sun = new THREE.DirectionalLight(0xfff2dc, 2.6);
sun.position.set(-9, 18, 8);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = -HALF - 2;
sun.shadow.camera.right = HALF + 2;
sun.shadow.camera.top = HALF + 2;
sun.shadow.camera.bottom = -HALF - 2;
sun.shadow.camera.near = 1;
sun.shadow.camera.far = 50;
sun.shadow.bias = -0.0004;
sun.shadow.normalBias = 0.03;
scene.add(sun);

const rim = new THREE.DirectionalLight(0x6a8cff, 0.9);
rim.position.set(10, 8, -12);
scene.add(rim);

/* ---------- board ---------- */
function makeCheckerTexture() {
  const px = 64;
  const c = document.createElement('canvas');
  c.width = c.height = px * 2;
  const g = c.getContext('2d');
  for (let y = 0; y < 2; y++) {
    for (let x = 0; x < 2; x++) {
      g.fillStyle = (x + y) % 2 === 0 ? COLORS.tileA : COLORS.tileB;
      g.fillRect(x * px, y * px, px, px);
    }
  }
  // soft inner edge so every tile reads as a tile
  g.strokeStyle = 'rgba(255,255,255,0.045)';
  g.lineWidth = 2;
  for (let y = 0; y < 2; y++) for (let x = 0; x < 2; x++) g.strokeRect(x * px + 1, y * px + 1, px - 2, px - 2);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(N / 2, N / 2);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = renderer.capabilities.getMaxAnisotropy();
  return t;
}

const board = new THREE.Group();
scene.add(board);

const floor = new THREE.Mesh(
  new THREE.PlaneGeometry(N, N),
  new THREE.MeshStandardMaterial({ map: makeCheckerTexture(), roughness: 0.85, metalness: 0.05 })
);
floor.rotation.x = -Math.PI / 2;
floor.receiveShadow = true;
board.add(floor);

// slab underneath the playfield
const slab = new THREE.Mesh(
  new RoundedBoxGeometry(N + 1.6, 1.2, N + 1.6, 4, 0.25),
  new THREE.MeshStandardMaterial({ color: 0x131c36, roughness: 0.7, metalness: 0.2 })
);
slab.position.y = -0.62;
slab.receiveShadow = true;
board.add(slab);

// walls
const wallMat = new THREE.MeshStandardMaterial({ color: COLORS.wall, roughness: 0.45, metalness: 0.25 });
const glowMat = new THREE.MeshStandardMaterial({
  color: COLORS.wallGlow, emissive: COLORS.wallGlow, emissiveIntensity: 1.6, roughness: 0.3,
});
const WT = 0.8; // wall thickness
const WH = 0.55; // wall height
function addWall(w, d, x, z) {
  const m = new THREE.Mesh(new RoundedBoxGeometry(w, WH, d, 3, 0.16), wallMat);
  m.position.set(x, WH / 2 - 0.02, z);
  m.castShadow = m.receiveShadow = true;
  board.add(m);
  // glowing inlay strip on top
  const strip = new THREE.Mesh(
    new THREE.BoxGeometry(w > d ? w - 0.5 : 0.1, 0.04, w > d ? 0.1 : d - 0.5),
    glowMat
  );
  strip.position.set(x, WH - 0.01, z);
  board.add(strip);
}
const L = N + WT * 2;
addWall(L, WT, 0, -HALF - WT / 2);
addWall(L, WT, 0, HALF + WT / 2);
addWall(WT, N, -HALF - WT / 2, 0);
addWall(WT, N, HALF + WT / 2, 0);

// corner pylons
for (const sx of [-1, 1]) {
  for (const sz of [-1, 1]) {
    const p = new THREE.Mesh(new RoundedBoxGeometry(1.05, 0.9, 1.05, 3, 0.2), wallMat);
    p.position.set(sx * (HALF + WT / 2), 0.43, sz * (HALF + WT / 2));
    p.castShadow = true;
    board.add(p);
    const orb = new THREE.Mesh(new THREE.SphereGeometry(0.2, 16, 12), glowMat);
    orb.position.set(p.position.x, 0.98, p.position.z);
    board.add(orb);
  }
}

// large soft ground far below, so the board floats in space
const ground = new THREE.Mesh(
  new THREE.CircleGeometry(60, 64),
  new THREE.MeshBasicMaterial({ color: 0x0d1530 })
);
ground.rotation.x = -Math.PI / 2;
ground.position.y = -6;
scene.add(ground);

// drifting dust motes for atmosphere
const MOTES = 140;
const moteGeo = new THREE.BufferGeometry();
const motePos = new Float32Array(MOTES * 3);
for (let i = 0; i < MOTES; i++) {
  motePos[i * 3] = (Math.random() - 0.5) * 50;
  motePos[i * 3 + 1] = Math.random() * 14 - 2;
  motePos[i * 3 + 2] = (Math.random() - 0.5) * 50;
}
moteGeo.setAttribute('position', new THREE.BufferAttribute(motePos, 3));
const motes = new THREE.Points(
  moteGeo,
  new THREE.PointsMaterial({ color: 0x9db8ff, size: 0.09, transparent: true, opacity: 0.55, depthWrite: false })
);
scene.add(motes);

/* ---------- camera rig: gentle sway, leans toward the snake, shakes on impact ---------- */
const camFit = new THREE.Vector3().copy(camBase);
const camLook = new THREE.Vector3(0, 0, 0.6);
function updateCamera(dt, t, fx, fz) {
  shake = Math.max(0, shake - dt * 0.9);
  const sh = shake * shake * 2.4;
  const k = 1 - Math.exp(-3 * dt);
  const wantX = fx * 0.16, wantZ = 0.6 + fz * 0.12;
  camLook.x += (wantX - camLook.x) * k;
  camLook.z += (wantZ - camLook.z) * k;
  camera.position.set(
    camFit.x + camLook.x + Math.sin(t * 0.37) * 0.45 + (Math.random() - 0.5) * sh,
    camFit.y + Math.sin(t * 0.29) * 0.2 + (Math.random() - 0.5) * sh,
    camFit.z + Math.cos(t * 0.31) * 0.3 + (Math.random() - 0.5) * sh
  );
  camera.lookAt(camLook);
}

/* ---------- resize ---------- */
function resize() {
  const w = window.innerWidth, h = window.innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  // pull the camera back along its viewing direction until the whole board fits
  const tanV = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
  const distV = 12.6 / tanV;
  const distH = 15.2 / (tanV * camera.aspect);
  camFit.copy(camBase).setLength(Math.max(distV, distH));
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize);
resize();

/* =====================================================================
   SNAKE: logic is tick based on the grid, rendering is interpolated
   ===================================================================== */
const START_LEN = 5;
const BODY_R = 0.43;      // body radius (before tail taper)
const SAMPLES = 5;        // curve samples per body segment
const RING = 16;          // vertices per tube ring
const MAX_SEGS = N * N;

const state = {
  mode: 'ready',          // 'ready' | 'playing' | 'over'
  segs: [],               // current cells, head first
  prev: [],               // cells one tick ago (aligned by index) used for interpolation
  dir: { x: 1, z: 0 },
  queue: [],              // buffered turns
  acc: 0,                 // time accumulated towards the next tick
  stepTime: 0.14,         // seconds per tick
  score: 0,
  apples: 0,              // apples eaten this run
  apple: null,            // {x, z} cell of the current apple
  bulges: [],             // times at which a swallowed apple started travelling down the body
};

let clockT = 0;           // simulation clock in seconds
let headYaw = 0;
let headPulse = -99;      // time of the last bite (head squash)
let shake = 0;            // camera shake amount, decays

function resetGame() {
  const cx = N / 2, cz = N / 2;
  state.segs = [];
  for (let i = 0; i < START_LEN; i++) state.segs.push({ x: cx - i, z: cz });
  state.prev = state.segs.slice();
  state.dir = { x: 1, z: 0 };
  state.queue.length = 0;
  state.acc = 0;
  state.apples = 0;
  state.bulges.length = 0;
  state.stepTime = 0.14;
  headYaw = 0;
  tube.material.color.setRGB(1, 1, 1);
  setScore(0, false);
  spawnApple();
}

/* ---------- snake body: one smooth tapered tube rebuilt every frame ---------- */
const tubeGeo = new THREE.BufferGeometry();
const maxRings = MAX_SEGS * SAMPLES + 2;
const tubePos = new Float32Array(maxRings * RING * 3);
const tubeNor = new Float32Array(maxRings * RING * 3);
const tubeCol = new Float32Array(maxRings * RING * 3);
{
  const idx = new Uint32Array((maxRings - 1) * RING * 6);
  let k = 0;
  for (let r = 0; r < maxRings - 1; r++) {
    for (let j = 0; j < RING; j++) {
      const a = r * RING + j, b = r * RING + (j + 1) % RING;
      const c = (r + 1) * RING + j, d = (r + 1) * RING + (j + 1) % RING;
      idx[k++] = a; idx[k++] = b; idx[k++] = c;
      idx[k++] = b; idx[k++] = d; idx[k++] = c;
    }
  }
  tubeGeo.setIndex(new THREE.BufferAttribute(idx, 1));
}
tubeGeo.setAttribute('position', new THREE.BufferAttribute(tubePos, 3).setUsage(THREE.DynamicDrawUsage));
tubeGeo.setAttribute('normal', new THREE.BufferAttribute(tubeNor, 3).setUsage(THREE.DynamicDrawUsage));
tubeGeo.setAttribute('color', new THREE.BufferAttribute(tubeCol, 3).setUsage(THREE.DynamicDrawUsage));
const tube = new THREE.Mesh(
  tubeGeo,
  new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.38, metalness: 0.05 })
);
tube.frustumCulled = false;
tube.castShadow = true;
tube.receiveShadow = true;
scene.add(tube);

const C_HEAD = new THREE.Color('#8cf03a');
const C_TAIL = new THREE.Color('#12a36a');
const C_BELLY = new THREE.Color('#e8f78a');
const C_SPOT = new THREE.Color('#0d7d4a');
const tmpC = new THREE.Color();
const tmpC2 = new THREE.Color();
const ringCos = [], ringSin = [];
for (let j = 0; j < RING; j++) {
  ringCos.push(Math.cos((j / RING) * Math.PI * 2));
  ringSin.push(Math.sin((j / RING) * Math.PI * 2));
}

const smoothstep = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

// scratch path buffers (world xz of every sample on the centre line)
const pathX = new Float32Array(maxRings), pathZ = new Float32Array(maxRings), pathD = new Float32Array(maxRings);

function catmull(p0, p1, p2, p3, t) {
  const t2 = t * t, t3 = t2 * t;
  return 0.5 * (2 * p1 + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3);
}

// interpolated segment positions (world space) for progress a in [0,1]
const ptsX = new Float32Array(MAX_SEGS + 2), ptsZ = new Float32Array(MAX_SEGS + 2);
function gatherPoints(a) {
  const n = state.segs.length;
  for (let i = 0; i < n; i++) {
    const c = state.segs[i], p = state.prev[i] || c;
    ptsX[i] = cellToWorld(p.x + (c.x - p.x) * a);
    ptsZ[i] = cellToWorld(p.z + (c.z - p.z) * a);
  }
  return n;
}

const BULGE_SPEED = 9; // world units per second down the body
function rebuildTube(n, t) {
  // 1. smooth centre line through the segment points
  let m = 0;
  const get = (arr, i) => {
    if (i < 0) return 2 * arr[0] - arr[1];
    if (i >= n) return 2 * arr[n - 1] - arr[n - 2];
    return arr[i];
  };
  for (let i = 0; i < n - 1; i++) {
    for (let s = 0; s < SAMPLES; s++) {
      const t = s / SAMPLES;
      pathX[m] = catmull(get(ptsX, i - 1), ptsX[i], ptsX[i + 1], get(ptsX, i + 2), t);
      pathZ[m] = catmull(get(ptsZ, i - 1), ptsZ[i], ptsZ[i + 1], get(ptsZ, i + 2), t);
      m++;
    }
  }
  pathX[m] = ptsX[n - 1]; pathZ[m] = ptsZ[n - 1]; m++;

  // 2. arc length from the head
  pathD[0] = 0;
  for (let i = 1; i < m; i++) pathD[i] = pathD[i - 1] + Math.hypot(pathX[i] - pathX[i - 1], pathZ[i] - pathZ[i - 1]);
  const total = pathD[m - 1];

  // 3. rings
  for (let i = 0; i < m; i++) {
    const i0 = Math.max(0, i - 1), i1 = Math.min(m - 1, i + 1);
    let tx = pathX[i1] - pathX[i0], tz = pathZ[i1] - pathZ[i0];
    const tl = Math.hypot(tx, tz) || 1;
    tx /= tl; tz /= tl;
    // side vector = up x tangent  (the path is horizontal so rings are exactly side/up)
    const sx = tz, sz = -tx;

    const dTail = total - pathD[i];
    const taper = 0.3 + 0.7 * smoothstep(0, Math.min(3.5, total * 0.6), dTail);
    const neck = 1 - 0.1 * smoothstep(0, 1.5, pathD[i]) * (1 - smoothstep(1.5, 3, pathD[i]));
    let bulge = 1 + 0.045 * Math.sin(pathD[i] * 2.4);
    for (let b = 0; b < state.bulges.length; b++) {
      const u = (pathD[i] - (t - state.bulges[b]) * BULGE_SPEED) / 0.55; // swallowed apple lump
      bulge += 0.42 * Math.exp(-u * u);
    }
    const r = BODY_R * taper * neck * bulge;
    const cy = r + 0.02;

    tmpC.copy(C_HEAD).lerp(C_TAIL, Math.min(1, pathD[i] / Math.max(8, total)));
    const stripe = smoothstep(0.35, 0.65, Math.abs(((pathD[i] * 0.9) % 1) * 2 - 1)); // soft bands along the body

    for (let j = 0; j < RING; j++) {
      const c = ringCos[j], s = ringSin[j];
      const nx = sx * c, ny = s, nz = sz * c;
      const o = (i * RING + j) * 3;
      tubePos[o] = pathX[i] + nx * r;
      tubePos[o + 1] = cy + ny * r;
      tubePos[o + 2] = pathZ[i] + nz * r;
      tubeNor[o] = nx; tubeNor[o + 1] = ny; tubeNor[o + 2] = nz;
      // belly is pale, back is the body colour with darker saddle spots
      const back = smoothstep(-0.25, 0.55, s);
      const spot = back * stripe * smoothstep(0.5, 0.95, s) * 0.5;
      tmpC2.copy(tmpC).lerp(C_BELLY, 1 - back).lerp(C_SPOT, spot);
      tubeCol[o] = tmpC2.r; tubeCol[o + 1] = tmpC2.g; tubeCol[o + 2] = tmpC2.b;
    }
  }
  tubeGeo.setDrawRange(0, (m - 1) * RING * 6);
  tubeGeo.attributes.position.needsUpdate = true;
  tubeGeo.attributes.normal.needsUpdate = true;
  tubeGeo.attributes.color.needsUpdate = true;
}

/* ---------- head: skull, eyes, tongue ---------- */
const head = new THREE.Group();
head.scale.setScalar(1.08);
scene.add(head);
{
  const skinMat = new THREE.MeshStandardMaterial({ color: 0x9af544, roughness: 0.35 });
  const skull = new THREE.Mesh(new THREE.SphereGeometry(0.5, 32, 24), skinMat);
  skull.scale.set(1.12, 0.86, 1.0);
  skull.position.set(0.04, 0.05, 0);
  skull.castShadow = true;
  head.add(skull);

  const snout = new THREE.Mesh(new THREE.SphereGeometry(0.3, 24, 16), skinMat);
  snout.scale.set(1.1, 0.75, 1.05);
  snout.position.set(0.36, -0.06, 0);
  snout.castShadow = true;
  head.add(snout);

  const white = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.2 });
  const black = new THREE.MeshStandardMaterial({ color: 0x0b0f1a, roughness: 0.15, metalness: 0.2 });
  for (const side of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.17, 20, 16), white);
    eye.position.set(0.2, 0.22, side * 0.3);
    head.add(eye);
    const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.095, 16, 12), black);
    pupil.position.set(0.3, 0.24, side * 0.32);
    head.add(pupil);
    const glint = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 6), white);
    glint.position.set(0.37, 0.29, side * 0.3);
    head.add(glint);
    const nostril = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 6), black);
    nostril.position.set(0.62, 0.0, side * 0.1);
    head.add(nostril);
  }
}
const tongue = new THREE.Group();
{
  const red = new THREE.MeshStandardMaterial({ color: 0xff3d5a, roughness: 0.5 });
  const stem = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.04, 0.05), red);
  stem.position.set(0.25, 0, 0);
  tongue.add(stem);
  for (const s of [-1, 1]) {
    const prong = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.04, 0.045), red);
    prong.position.set(0.58, 0, s * 0.05);
    prong.rotation.y = s * 0.45;
    tongue.add(prong);
  }
  tongue.position.set(0.62, -0.1, 0);
  head.add(tongue);
}

function updateSnake(dt, t) {
  const a = state.mode === 'playing' || state.mode === 'paused' ? state.acc / state.stepTime : 1;
  const n = gatherPoints(Math.min(1, a));
  while (state.bulges.length && (t - state.bulges[0]) * BULGE_SPEED > n + 3) state.bulges.shift();
  rebuildTube(n, t);

  // head follows the front of the body, turns smoothly toward the travel direction
  const target = Math.atan2(-state.dir.z, state.dir.x);
  let d = target - headYaw;
  d = Math.atan2(Math.sin(d), Math.cos(d));
  headYaw += d * (1 - Math.exp(-16 * dt));
  head.position.set(ptsX[0], 0.52, ptsZ[0]);
  head.rotation.y = headYaw;
  const chomp = Math.max(0, 1 - (t - headPulse) / 0.3);
  head.scale.set(1.08 * (1 + 0.22 * Math.sin(chomp * Math.PI)), 1.08 * (1 - 0.1 * Math.sin(chomp * Math.PI)), 1.08 * (1 + 0.12 * Math.sin(chomp * Math.PI)));

  // tongue flicks in and out
  const cycle = (t * 0.9) % 1;
  const flick = cycle < 0.28 ? Math.sin((cycle / 0.28) * Math.PI) : 0;
  tongue.scale.x = Math.max(0.001, flick);
  tongue.visible = flick > 0.02;
}

/* ---------- apple: spinning, bobbing, glowing ---------- */
const apple = new THREE.Group();     // positioned on its cell
const appleBody = new THREE.Group(); // spins, bobs and pops in
apple.add(appleBody);
scene.add(apple);
{
  const prof = new THREE.SplineCurve([
    [0, 0], [0.16, 0.01], [0.32, 0.07], [0.41, 0.21], [0.42, 0.39],
    [0.37, 0.56], [0.25, 0.67], [0.11, 0.66], [0.0, 0.58],
  ].map(([x, y]) => new THREE.Vector2(x, y))).getPoints(28);
  const geo = new THREE.LatheGeometry(prof, 40);
  geo.translate(0, -0.34, 0);
  const body = new THREE.Mesh(geo, new THREE.MeshPhysicalMaterial({
    color: 0xff2a3c, roughness: 0.22, metalness: 0.0, clearcoat: 1, clearcoatRoughness: 0.12,
    emissive: 0x3a0008, emissiveIntensity: 0.6,
  }));
  body.castShadow = true;
  appleBody.add(body);

  const stem = new THREE.Mesh(
    new THREE.CylinderGeometry(0.025, 0.035, 0.22, 8),
    new THREE.MeshStandardMaterial({ color: 0x6b3f1d, roughness: 0.7 })
  );
  stem.position.set(0.02, 0.36, 0);
  stem.rotation.z = -0.25;
  appleBody.add(stem);

  const leaf = new THREE.Mesh(
    new THREE.SphereGeometry(0.14, 16, 8),
    new THREE.MeshStandardMaterial({ color: 0x4fd04a, roughness: 0.5, side: THREE.DoubleSide })
  );
  leaf.scale.set(1.5, 0.12, 0.8);
  leaf.position.set(0.17, 0.43, 0.02);
  leaf.rotation.z = 0.35;
  leaf.rotation.y = -0.4;
  leaf.castShadow = true;
  appleBody.add(leaf);
}
// soft glow on the floor under the apple + a red point light
const halo = new THREE.Mesh(
  new THREE.CircleGeometry(0.75, 40),
  new THREE.MeshBasicMaterial({
    color: 0xff3b4d, transparent: true, opacity: 0.3, depthWrite: false, blending: THREE.AdditiveBlending,
  })
);
halo.rotation.x = -Math.PI / 2;
halo.position.y = 0.012;
apple.add(halo);
const appleLight = new THREE.PointLight(0xff4455, 6, 5, 2);
appleLight.position.y = 0.9;
apple.add(appleLight);

let appleBorn = 0; // timer time at which the current apple spawned
let appleVisible = false;

function spawnApple(t) {
  const taken = new Set(state.segs.map((s) => s.x + ',' + s.z));
  const free = [];
  for (let x = 0; x < N; x++) for (let z = 0; z < N; z++) if (!taken.has(x + ',' + z)) free.push({ x, z });
  if (!free.length) { state.apple = null; appleVisible = false; apple.visible = false; return false; }
  state.apple = free[Math.floor(Math.random() * free.length)];
  apple.position.set(cellToWorld(state.apple.x), 0, cellToWorld(state.apple.z));
  appleBorn = t ?? clockT;
  appleVisible = true;
  apple.visible = true;
  return true;
}

const easeOutBack = (x) => { const c1 = 1.9, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); };

function updateApple(t) {
  if (!appleVisible) return;
  const born = Math.min(1, (t - appleBorn) / 0.55);
  const pop = born <= 0 ? 0 : easeOutBack(born);
  appleBody.scale.setScalar(Math.max(0.0001, pop) * 1.3);
  appleBody.rotation.y = t * 1.7;
  appleBody.rotation.z = Math.sin(t * 2.1) * 0.06;
  appleBody.position.y = 0.62 + Math.sin(t * 2.6) * 0.1;
  halo.scale.setScalar((0.85 + Math.sin(t * 2.6) * 0.12) * Math.max(0.0001, born));
  halo.material.opacity = 0.22 + Math.sin(t * 2.6) * 0.08;
  appleLight.intensity = 5 + Math.sin(t * 2.6) * 1.5;
}

/* ---------- particles: burst when an apple is eaten ---------- */
const MAXP = 320;
const pGeo = new THREE.IcosahedronGeometry(0.17, 0);
const pMesh = new THREE.InstancedMesh(pGeo, new THREE.MeshBasicMaterial({ color: 0xffffff }), MAXP);
pMesh.frustumCulled = false;
pMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
scene.add(pMesh);
const P = {
  x: new Float32Array(MAXP), y: new Float32Array(MAXP), z: new Float32Array(MAXP),
  vx: new Float32Array(MAXP), vy: new Float32Array(MAXP), vz: new Float32Array(MAXP),
  life: new Float32Array(MAXP), max: new Float32Array(MAXP), size: new Float32Array(MAXP),
  spin: new Float32Array(MAXP),
};
let pNext = 0;
const pDummy = new THREE.Object3D();
const PALETTE = [0xff2a3c, 0xff5468, 0xff8a97, 0xffd9dd, 0xffe066, 0x7dff6a].map((c) => new THREE.Color(c));
const DEATH_PALETTE = [0xffffff, 0xb8f23c, 0x4fd04a, 0xffe066, 0xff5468].map((c) => new THREE.Color(c));
for (let i = 0; i < MAXP; i++) {
  pDummy.scale.setScalar(0);
  pDummy.updateMatrix();
  pMesh.setMatrixAt(i, pDummy.matrix);
  pMesh.setColorAt(i, PALETTE[0]);
}

function burst(x, y, z, count = 60, palette = PALETTE) {
  for (let n = 0; n < count; n++) {
    const i = pNext; pNext = (pNext + 1) % MAXP;
    const ang = Math.random() * Math.PI * 2;
    const up = Math.random();                       // 0 = sideways, 1 = straight up
    const sp = 2.2 + Math.random() * 4.2;
    P.x[i] = x; P.y[i] = y; P.z[i] = z;
    P.vx[i] = Math.cos(ang) * sp * (1 - up * 0.5);
    P.vz[i] = Math.sin(ang) * sp * (1 - up * 0.5);
    P.vy[i] = 2.5 + up * 5.5;
    P.max[i] = P.life[i] = 0.55 + Math.random() * 0.6;
    P.size[i] = 0.5 + Math.random() * 1.1;
    P.spin[i] = Math.random() * 6;
    pMesh.setColorAt(i, palette[(Math.random() * palette.length) | 0]);
  }
  pMesh.instanceColor.needsUpdate = true;
}

function updateParticles(dt) {
  let any = false;
  for (let i = 0; i < MAXP; i++) {
    if (P.life[i] <= 0) continue;
    any = true;
    P.life[i] -= dt;
    if (P.life[i] <= 0) {
      pDummy.scale.setScalar(0);
    } else {
      P.vy[i] -= 15 * dt;
      P.x[i] += P.vx[i] * dt; P.y[i] += P.vy[i] * dt; P.z[i] += P.vz[i] * dt;
      if (P.y[i] < 0.06) { P.y[i] = 0.06; P.vy[i] *= -0.45; P.vx[i] *= 0.7; P.vz[i] *= 0.7; }
      const k = P.life[i] / P.max[i];
      pDummy.position.set(P.x[i], P.y[i], P.z[i]);
      pDummy.rotation.set(P.spin[i] + k * 6, P.spin[i] * 0.7 + k * 4, 0);
      pDummy.scale.setScalar(P.size[i] * Math.sqrt(k));
    }
    pDummy.updateMatrix();
    pMesh.setMatrixAt(i, pDummy.matrix);
  }
  if (any) pMesh.instanceMatrix.needsUpdate = true;
}

// expanding shock ring + short light flash at the bite
const ringMat = new THREE.MeshBasicMaterial({
  color: 0xff8a97, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
});
const shock = new THREE.Mesh(new THREE.RingGeometry(0.42, 0.5, 56), ringMat);
shock.rotation.x = -Math.PI / 2;
shock.position.y = 0.04;
scene.add(shock);
const flash = new THREE.PointLight(0xff6070, 0, 9, 2);
scene.add(flash);
let fxT = 99;

function triggerFx(x, z) {
  fxT = 0;
  shock.position.set(x, 0.04, z);
  flash.position.set(x, 1.2, z);
}
function updateFx(dt) {
  fxT += dt;
  const k = Math.min(1, fxT / 0.55);
  shock.scale.setScalar(1 + k * 5.5);
  ringMat.opacity = (1 - k) * (1 - k) * 0.9;
  shock.visible = k < 1;
  flash.intensity = Math.max(0, 1 - fxT / 0.3) * 40;
}

// "+10" that floats up from the apple
const floatLayer = document.createElement('div');
floatLayer.style.cssText = 'position:fixed;inset:0;pointer-events:none;overflow:hidden';
document.body.appendChild(floatLayer);
const projV = new THREE.Vector3();
function floatText(text, wx, wy, wz) {
  camera.updateMatrixWorld();
  projV.set(wx, wy, wz).project(camera);
  const el = document.createElement('div');
  el.className = 'float';
  el.textContent = text;
  el.style.left = ((projV.x * 0.5 + 0.5) * window.innerWidth) + 'px';
  el.style.top = ((-projV.y * 0.5 + 0.5) * window.innerHeight) + 'px';
  floatLayer.appendChild(el);
  setTimeout(() => el.remove(), 1000);
}

/* ---------- score ---------- */
const scoreEl = document.getElementById('score');
const bestEl = document.getElementById('best');
const newBestEl = document.getElementById('new-best');
let best = 0;
try { best = parseInt(localStorage.getItem('snake3d-best') || '0', 10) || 0; } catch (e) { /* storage unavailable */ }
bestEl.textContent = best;

function setScore(v, pop = true) {
  state.score = v;
  scoreEl.textContent = v;
  if (pop) {
    scoreEl.classList.remove('pop');
    void scoreEl.offsetWidth; // restart the CSS animation
    scoreEl.classList.add('pop');
  }
}

/* ---------- game flow ---------- */
function onEat() {
  const t = clockT;
  const ax = cellToWorld(state.apple.x), az = cellToWorld(state.apple.z);
  burst(ax, 0.7, az);
  triggerFx(ax, az);
  floatText('+10', ax, 1.3, az);
  state.bulges.push(t);
  headPulse = t;
  shake = Math.max(shake, 0.12);
  state.apples++;
  setScore(state.score + 10);
  state.stepTime = Math.max(0.075, 0.14 - state.apples * 0.002);
  if (!spawnApple()) gameOver(true); // board is full: you win
}

function tick() {
  if (state.queue.length) state.dir = state.queue.shift();
  const h = state.segs[0];
  const nx = h.x + state.dir.x, nz = h.z + state.dir.z;
  const grow = !!state.apple && state.apple.x === nx && state.apple.z === nz;

  const hitWall = nx < 0 || nx >= N || nz < 0 || nz >= N;
  let hitSelf = false;
  const limit = grow ? state.segs.length : state.segs.length - 1; // the tail cell is free if it moves away
  for (let i = 0; i < limit; i++) if (state.segs[i].x === nx && state.segs[i].z === nz) { hitSelf = true; break; }
  if (hitWall || hitSelf) { gameOver(); return; }

  const old = state.segs;
  state.segs = [{ x: nx, z: nz }, ...old];
  if (!grow) state.segs.pop();
  state.prev = state.segs.map((_, i) => old[Math.min(i, old.length - 1)]);
  if (grow) onEat();
}

const overlay = document.getElementById('overlay');
const overlayTitle = document.getElementById('overlay-title');
const overlaySub = document.getElementById('overlay-sub');
const overlayScore = document.getElementById('overlay-score');
const finalScoreEl = document.getElementById('final-score');
const startBtn = document.getElementById('start-btn');
let overlayTimer = 0;

function showOverlay({ title, sub, button, over = false, final = null, newBest = false, delay = 0 }) {
  overlayTitle.textContent = title;
  overlayTitle.classList.toggle('over', over);
  overlaySub.textContent = sub;
  overlayScore.hidden = final === null;
  if (final !== null) finalScoreEl.textContent = final;
  newBestEl.hidden = !newBest;
  startBtn.textContent = button;
  clearTimeout(overlayTimer);
  overlayTimer = setTimeout(() => overlay.classList.add('visible'), delay);
}
function hideOverlay() {
  clearTimeout(overlayTimer);
  overlay.classList.remove('visible');
}

function startGame() {
  resetGame();
  state.mode = 'playing';
  hideOverlay();
}

function setPaused(p) {
  if (p && state.mode === 'playing') {
    state.mode = 'paused';
    showOverlay({ title: 'PAUSED', sub: 'Take a breather. The apple will wait.', button: 'Resume' });
  } else if (!p && state.mode === 'paused') {
    state.mode = 'playing';
    hideOverlay();
  }
}

function gameOver(win = false) {
  state.mode = 'over';
  state.acc = state.stepTime; // rest exactly on the last cell
  const hx = cellToWorld(state.segs[0].x), hz = cellToWorld(state.segs[0].z);
  if (!win) {
    // crash: debris, shake, the snake flushes red
    burst(hx, 0.6, hz, 46, DEATH_PALETTE);
    triggerFx(hx, hz);
    shake = 0.55;
    headPulse = clockT;
    tube.material.color.setRGB(1, 0.5, 0.5);
  }
  const isBest = state.score > best;
  if (isBest) {
    best = state.score;
    bestEl.textContent = best;
    try { localStorage.setItem('snake3d-best', String(best)); } catch (e) { /* storage unavailable */ }
  }
  showOverlay({
    title: win ? 'YOU WIN!' : 'GAME OVER',
    sub: win ? 'The whole board is yours. Perfect!' : 'Ouch! You crashed. Try again?',
    button: 'Play again',
    over: !win,
    final: state.score,
    newBest: isBest && state.score > 0,
    delay: win ? 600 : 800,
  });
}

/* ---------- input ---------- */
const KEYMAP = {
  ArrowUp: 'up', KeyW: 'up',
  ArrowDown: 'down', KeyS: 'down',
  ArrowLeft: 'left', KeyA: 'left',
  ArrowRight: 'right', KeyD: 'right',
};
const DIRS = { up: { x: 0, z: -1 }, down: { x: 0, z: 1 }, left: { x: -1, z: 0 }, right: { x: 1, z: 0 } };

function steer(name) {
  const nd = DIRS[name];
  const last = state.queue.length ? state.queue[state.queue.length - 1] : state.dir;
  if (nd.x === last.x && nd.z === last.z) return;       // same direction
  if (nd.x + last.x === 0 && nd.z + last.z === 0) return; // no instant U-turns
  if (state.queue.length < 3) state.queue.push(nd);
}

function primaryAction() {
  if (state.mode === 'paused') setPaused(false);
  else if (overlay.classList.contains('visible')) startGame();
}

window.addEventListener('keydown', (e) => {
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  const dirName = KEYMAP[e.code];
  if (dirName) {
    e.preventDefault();
    if (state.mode === 'playing') steer(dirName);
    else if (state.mode === 'ready' && !e.repeat) { startGame(); steer(dirName); }
    return;
  }
  if (e.code === 'Escape' || e.code === 'KeyP') {
    if (!e.repeat) setPaused(state.mode === 'playing');
    return;
  }
  if ((e.code === 'Enter' || e.code === 'Space') && state.mode !== 'playing') {
    e.preventDefault();
    if (!e.repeat) primaryAction();
  }
});
startBtn.addEventListener('click', () => { startBtn.blur(); primaryAction(); });
window.addEventListener('blur', () => setPaused(true));
document.addEventListener('visibilitychange', () => { if (document.hidden) setPaused(true); });

/* ---------- main loop ---------- */
const timer = new THREE.Timer();

// advances the whole simulation by dt seconds and draws one frame
function step(dt) {
  clockT += dt;
  const t = clockT;

  if (state.mode === 'playing') {
    state.acc += dt;
    while (state.acc >= state.stepTime && state.mode === 'playing') {
      state.acc -= state.stepTime;
      tick();
    }
  }
  updateSnake(dt, t);
  updateApple(t);
  updateParticles(dt);
  updateFx(dt);
  updateCamera(dt, t, ptsX[0], ptsZ[0]);

  motes.rotation.y = t * 0.01;
  renderer.render(scene, camera);
}

function frame(now) {
  timer.update(now);
  step(Math.min(timer.getDelta(), 0.05));
  requestAnimationFrame(frame);
}

resetGame();
requestAnimationFrame(frame);

// small handle for debugging / automated checks
window.__game = { THREE, scene, camera, renderer, N, state, startGame, steer, tick, step, gameOver, setPaused, spawnApple, burst };
