import * as THREE from './node_modules/three/build/three.module.js';

// --- dev: capture page errors so the test harness can read them ---
window.__three = THREE.REVISION;
window.__errors = [];
window.addEventListener('error', (e) => window.__errors.push(e.message || String(e.error)));
window.addEventListener('unhandledrejection', (e) => window.__errors.push('rejection: ' + (e.reason && e.reason.message || e.reason)));

// --- config ---
const GRID = 20;            // cells per side
const HALF = GRID / 2;
const BASE_TICK = 130;      // ms per cell at start
const MIN_TICK = 75;        // fastest
const SPEEDUP = 1.6;        // ms faster per apple eaten
const START_LEN = 4;

const cellToWorld = (gx, gz, out = new THREE.Vector3()) =>
  out.set(gx - HALF + 0.5, 0, gz - HALF + 0.5);

// --- renderer ---
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;
document.getElementById('app').appendChild(renderer.domElement);

// --- scene & camera ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a0e1a);
scene.fog = new THREE.Fog(0x0a0e1a, 30, 70);

const camera = new THREE.PerspectiveCamera(48, window.innerWidth / window.innerHeight, 0.1, 200);
camera.position.set(0, 16.5, 17.5);
camera.lookAt(0, 0.4, 0);

// --- lights ---
scene.add(new THREE.HemisphereLight(0x8fa3ff, 0x1a2136, 0.9));
const sun = new THREE.DirectionalLight(0xffffff, 1.8);
sun.position.set(12, 20, 9);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = -15;
sun.shadow.camera.right = 15;
sun.shadow.camera.top = 15;
sun.shadow.camera.bottom = -15;
sun.shadow.camera.near = 1;
sun.shadow.camera.far = 60;
sun.shadow.bias = -0.0005;
scene.add(sun);

// --- floor ---
const floor = new THREE.Mesh(
  new THREE.BoxGeometry(GRID + 1.6, 0.6, GRID + 1.6),
  new THREE.MeshStandardMaterial({ color: 0x131a2c, roughness: 0.92, metalness: 0.05 })
);
floor.position.y = -0.3;
floor.receiveShadow = true;
scene.add(floor);

const grid = new THREE.GridHelper(GRID, GRID, 0x33406e, 0x222c4d);
grid.position.y = 0.002;
grid.material.transparent = true;
grid.material.opacity = 0.55;
scene.add(grid);

// --- border walls ---
const wallMat = new THREE.MeshStandardMaterial({
  color: 0x2a3a63, roughness: 0.65, metalness: 0.15, emissive: 0x0a1226
});
const wallGeoH = new THREE.BoxGeometry(GRID + 1.0, 0.55, 0.5);
const wallGeoV = new THREE.BoxGeometry(0.5, 0.55, GRID + 1.0);
const wallSpots = [
  [0, -(HALF + 0.25), wallGeoH],
  [0, HALF + 0.25, wallGeoH],
  [-(HALF + 0.25), 0, wallGeoV],
  [HALF + 0.25, 0, wallGeoV],
];
for (const [x, z, geo] of wallSpots) {
  const w = new THREE.Mesh(geo, wallMat);
  w.position.set(x, 0.275, z);
  w.castShadow = true;
  w.receiveShadow = true;
  scene.add(w);
}

// --- snake (mesh pool) ---
const HEAD_COLOR = 0x6cf08a;
const BODY_A = new THREE.Color(0x3ed463);
const BODY_B = new THREE.Color(0x177a3f);

const segGeo = new THREE.SphereGeometry(0.42, 24, 18);
const MAX_SEG = 200;
const snakeGroup = new THREE.Group();
scene.add(snakeGroup);

const segMeshes = [];
for (let i = 0; i < MAX_SEG; i++) {
  const m = new THREE.Mesh(segGeo, new THREE.MeshStandardMaterial({ roughness: 0.45, metalness: 0.08 }));
  m.castShadow = true;
  m.scale.set(1, 0.88, 1);
  m.visible = false;
  snakeGroup.add(m);
  segMeshes.push(m);
}

const head = new THREE.Group();
const headMesh = new THREE.Mesh(
  new THREE.SphereGeometry(0.48, 24, 18),
  new THREE.MeshStandardMaterial({ color: HEAD_COLOR, roughness: 0.35, metalness: 0.1, emissive: 0x0e3a1c })
);
headMesh.castShadow = true;
headMesh.scale.set(1, 0.9, 1.05);
head.add(headMesh);

const eyeGeo = new THREE.SphereGeometry(0.11, 12, 10);
const eyeMat = new THREE.MeshStandardMaterial({ color: 0x101418, roughness: 0.2 });
const eyeL = new THREE.Mesh(eyeGeo, eyeMat);
eyeL.position.set(-0.22, 0.24, 0.38);
const eyeR = eyeL.clone();
eyeR.position.x = 0.22;
head.add(eyeL, eyeR);
snakeGroup.add(head);

// --- apple ---
const apple = new THREE.Group();
const appleBody = new THREE.Mesh(
  new THREE.SphereGeometry(0.34, 24, 18),
  new THREE.MeshStandardMaterial({ color: 0xff5340, roughness: 0.32, metalness: 0.05, emissive: 0x300500 })
);
appleBody.castShadow = true;
appleBody.scale.set(1, 0.94, 1);
apple.add(appleBody);

const stem = new THREE.Mesh(
  new THREE.CylinderGeometry(0.025, 0.045, 0.18, 8),
  new THREE.MeshStandardMaterial({ color: 0x8a5a2b, roughness: 0.9 })
);
stem.position.y = 0.4;
stem.rotation.z = 0.25;
apple.add(stem);

const leaf = new THREE.Mesh(
  new THREE.SphereGeometry(0.09, 10, 8),
  new THREE.MeshStandardMaterial({ color: 0x58d868, roughness: 0.6 })
);
leaf.scale.set(1.5, 0.5, 0.7);
leaf.position.set(0.14, 0.44, 0);
leaf.rotation.z = -0.4;
apple.add(leaf);

const appleLight = new THREE.PointLight(0xff7755, 14, 6, 2);
appleLight.position.y = 0.55;
apple.add(appleLight);
scene.add(apple);

// --- particle burst (sparks when the apple is eaten) ---
function makeGlowTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.4, 'rgba(255,255,255,0.6)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}

class Burst {
  constructor(scene, max = 120) {
    this.max = max;
    this.geo = new THREE.BufferGeometry();
    this.pos = new Float32Array(max * 3);
    this.col = new Float32Array(max * 3);
    this.vel = new Float32Array(max * 3);
    this.geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    this.geo.setAttribute('color', new THREE.BufferAttribute(this.col, 3));
    this.mat = new THREE.PointsMaterial({
      size: 0.34, map: makeGlowTexture(), vertexColors: true,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
    });
    this.points = new THREE.Points(this.geo, this.mat);
    this.points.visible = false;
    this.points.frustumCulled = false;
    this.life = 0;
    scene.add(this.points);
  }
  spawn(x, y, z) {
    this.life = 1;
    this.points.visible = true;
    const palette = [[1, 0.75, 0.25], [1, 0.45, 0.15], [1, 0.88, 0.5], [0.85, 1, 0.35]];
    for (let i = 0; i < this.max; i++) {
      const i3 = i * 3;
      this.pos[i3] = x; this.pos[i3 + 1] = y; this.pos[i3 + 2] = z;
      let vx = Math.random() - 0.5, vy = Math.random() * 0.7 + 0.3, vz = Math.random() - 0.5;
      const len = Math.hypot(vx, vy, vz) || 1;
      const speed = 4 + Math.random() * 6;
      this.vel[i3] = vx / len * speed;
      this.vel[i3 + 1] = vy / len * speed;
      this.vel[i3 + 2] = vz / len * speed;
      const c = palette[(Math.random() * palette.length) | 0];
      this.col[i3] = c[0]; this.col[i3 + 1] = c[1]; this.col[i3 + 2] = c[2];
    }
    this.geo.attributes.position.needsUpdate = true;
    this.geo.attributes.color.needsUpdate = true;
    this.mat.opacity = 1;
  }
  update(dt) {
    if (!this.points.visible) return;
    this.life -= dt / 1.1;
    if (this.life <= 0) { this.points.visible = false; return; }
    for (let i = 0; i < this.max; i++) {
      const i3 = i * 3;
      this.vel[i3 + 1] -= 6 * dt;
      this.pos[i3] += this.vel[i3] * dt;
      this.pos[i3 + 1] += this.vel[i3 + 1] * dt;
      this.pos[i3 + 2] += this.vel[i3 + 2] * dt;
      if (this.pos[i3 + 1] < 0.06 && this.vel[i3 + 1] < 0) {
        this.pos[i3 + 1] = 0.06;
        this.vel[i3 + 1] *= -0.35;
      }
    }
    this.mat.opacity = Math.max(0, this.life);
    this.geo.attributes.position.needsUpdate = true;
  }
}
const burst = new Burst(scene);

// --- sound (tiny WebAudio synth, unlocked on first key/click) ---
let actx = null;
function ensureAudio() {
  if (!actx) {
    try { actx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { actx = null; }
  }
  if (actx && actx.state === 'suspended') actx.resume();
}
function tone(freq, dur, delay = 0, type = 'triangle', vol = 0.14) {
  if (!actx) return;
  const t0 = actx.currentTime + delay;
  const o = actx.createOscillator();
  const g = actx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t0);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(vol, t0 + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g).connect(actx.destination);
  o.start(t0);
  o.stop(t0 + dur + 0.03);
}
const sfx = {
  eat() { tone(540, 0.1, 0); tone(810, 0.14, 0.07); },
  over() { tone(320, 0.16, 0, 'sawtooth', 0.1); tone(220, 0.2, 0.14, 'sawtooth', 0.1); tone(130, 0.4, 0.3, 'sawtooth', 0.1); },
};

// --- game state ---
let cells = [];
let prevCells = [];
let dir = { x: 1, z: 0 };
let dirQueue = [];
let apples = 0;
let tickMs = BASE_TICK;
let acc = 0;
let state = 'playing';
let appleCell = null;
let headRot = Math.PI / 2;

const scoreEl = document.getElementById('score');
const bestEl = document.getElementById('best');
const overlayEl = document.getElementById('overlay');
const finalEl = document.getElementById('final');
const restartBtn = document.getElementById('restart');

let best = 0;
try { best = +(localStorage.getItem('snake3d.best') || 0); } catch (e) { /* private mode */ }
bestEl.textContent = best;

function spawnApple() {
  const occupied = new Set(cells.map(c => c.x + ',' + c.z));
  const free = [];
  for (let x = 0; x < GRID; x++)
    for (let z = 0; z < GRID; z++)
      if (!occupied.has(x + ',' + z)) free.push({ x, z });
  if (!free.length) { endGame(true); return; }
  appleCell = free[(Math.random() * free.length) | 0];
  apple.position.set(appleCell.x - HALF + 0.5, 0.42, appleCell.z - HALF + 0.5);
}

function reset() {
  cells = [];
  const hx = 9, hz = 10;
  for (let i = 0; i < START_LEN; i++) cells.push({ x: hx - i, z: hz });
  prevCells = cells.map(c => ({ ...c }));
  dir = { x: 1, z: 0 };
  dirQueue = [];
  apples = 0;
  tickMs = BASE_TICK;
  acc = 0;
  state = 'playing';
  headRot = Math.PI / 2;
  overlayEl.hidden = true;
  scoreEl.textContent = '0';
  spawnApple();
}

function endGame(won) {
  state = 'over';
  sfx.over();
  if (apples > best) {
    best = apples;
    try { localStorage.setItem('snake3d.best', String(best)); } catch (e) { /* ignore */ }
    bestEl.textContent = best;
  }
  finalEl.textContent = won
    ? `Perfect run! All ${GRID * GRID} cells filled with ${apples} apples.`
    : `You scored ${apples} ${apples === 1 ? 'apple' : 'apples'}.`;
  overlayEl.hidden = false;
}

function queueDir(d) {
  const last = dirQueue.length ? dirQueue[dirQueue.length - 1] : dir;
  if (d.x === last.x && d.z === last.z) return;
  if (d.x === -last.x && d.z === -last.z) return;
  if (dirQueue.length < 2) dirQueue.push(d);
}

function step() {
  while (dirQueue.length) {
    const d = dirQueue.shift();
    if (d.x === dir.x && d.z === dir.z) continue;
    if (d.x === -dir.x && d.z === -dir.z) continue;
    dir = d;
    break;
  }
  const h = cells[0];
  const nx = h.x + dir.x;
  const nz = h.z + dir.z;
  if (nx < 0 || nx >= GRID || nz < 0 || nz >= GRID) { endGame(false); return; }
  const eating = appleCell && nx === appleCell.x && nz === appleCell.z;
  const body = eating ? cells : cells.slice(0, -1);
  for (const c of body) if (c.x === nx && c.z === nz) { endGame(false); return; }

  prevCells = cells.map(c => ({ ...c }));
  cells.unshift({ x: nx, z: nz });
  if (eating) {
    apples++;
    tickMs = Math.max(MIN_TICK, BASE_TICK - apples * SPEEDUP);
    scoreEl.textContent = apples;
    scoreEl.classList.remove('pop');
    void scoreEl.offsetWidth; // restart the CSS animation
    scoreEl.classList.add('pop');
    const wp = cellToWorld(nx, nz);
    burst.spawn(wp.x, 0.55, wp.z);
    sfx.eat();
    spawnApple(); // calls endGame(true) if the board is full
  } else {
    cells.pop();
  }
}

// --- input ---
const DIRS = {
  ArrowUp: { x: 0, z: -1 }, KeyW: { x: 0, z: -1 },
  ArrowDown: { x: 0, z: 1 }, KeyS: { x: 0, z: 1 },
  ArrowLeft: { x: -1, z: 0 }, KeyA: { x: -1, z: 0 },
  ArrowRight: { x: 1, z: 0 }, KeyD: { x: 1, z: 0 },
};
window.addEventListener('keydown', (e) => {
  ensureAudio();
  if (e.code === 'KeyP') { paused = !paused; return; }
  if (state === 'over' && (e.code === 'KeyR' || e.code === 'Enter' || e.code === 'Space')) {
    e.preventDefault();
    reset();
    return;
  }
  const d = DIRS[e.code];
  if (d) {
    e.preventDefault();
    queueDir(d);
  }
});
restartBtn.addEventListener('click', () => { ensureAudio(); reset(); restartBtn.blur(); });

// --- debug hooks (for the test harness) ---
window.__game = {
  get state() { return state; },
  get apples() { return apples; },
  get len() { return cells.length; },
  get tickMs() { return tickMs; },
  get apple() { return appleCell ? { ...appleCell } : null; },
  get head() { return cells.length ? { ...cells[0] } : null; },
  get paused() { return paused; },
  setPaused(p) { paused = !!p; },
  setTick(ms) { tickMs = ms; },
  // test-only: advance one simulation tick / the particle system synchronously
  stepOnce() { if (state === 'playing') step(); },
  burstStep(ms) { burst.update(Math.min(ms / 1000, 0.1)); },
  get burst() { return burst; },
  restart: reset,
  // test-only: force the apple to a specific free cell
  placeApple(x, z) {
    if (x < 0 || x >= GRID || z < 0 || z >= GRID) return false;
    if (cells.some(c => c.x === x && c.z === z)) return false;
    appleCell = { x, z };
    apple.position.set(x - HALF + 0.5, 0.42, z - HALF + 0.5);
    return true;
  },
};

// --- main loop ---
function lerpAngle(a, b, t) {
  let d = (b - a) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return a + d * t;
}

let time = 0;
let last = performance.now();
let paused = false;
const camFocus = new THREE.Vector3(0, 0.4, 0);
const focusTarget = new THREE.Vector3();
document.addEventListener('visibilitychange', () => {
  paused = document.hidden;   // don't let the snake die while you're away
});

function frame(now) {
  requestAnimationFrame(frame);
  // Cap dt at 1s: rAF stops while the tab is hidden, so on return a big
  // dt arrives — simulate at most one second of catch-up, never teleport.
  let dt = Math.min((now - last) / 1000, 1.0);
  last = now;
  if (paused) dt = 0;
  time += dt;

  if (state === 'playing') {
    acc += dt * 1000;
    while (acc >= tickMs && state === 'playing') {
      acc -= tickMs;
      step();
    }
  }
  const t = state === 'playing' ? Math.min(acc / tickMs, 1) : 1;

  // snake: interpolate every segment between its previous and current cell
  const n = cells.length;
  for (let i = 0; i < n; i++) {
    const to = cells[i];
    const from = prevCells[i] || to;
    const m = i === 0 ? head : segMeshes[i - 1];
    m.position.set(
      from.x - HALF + 0.5 + (to.x - from.x) * t,
      i === 0 ? 0.42 : 0.34,
      from.z - HALF + 0.5 + (to.z - from.z) * t
    );
  }
  for (let i = 0; i < MAX_SEG; i++) {
    const m = segMeshes[i];
    m.visible = i < n - 1;
    if (m.visible) m.material.color.copy(BODY_A).lerp(BODY_B, (i + 1) / n);
  }
  headRot = lerpAngle(headRot, Math.atan2(dir.x, dir.z), Math.min(1, dt * 14));
  head.rotation.y = headRot;

  // particles
  burst.update(dt);

  // apple: spin + bob
  apple.rotation.y += dt * 1.4;
  apple.position.y = 0.42 + Math.sin(time * 2.4) * 0.1;

  // camera: subtle drift toward the head
  focusTarget.set(head.position.x * 0.12, 0.4, head.position.z * 0.12);
  camFocus.lerp(focusTarget, Math.min(1, dt * 3));
  camera.lookAt(camFocus);

  renderer.render(scene, camera);
}

reset();
requestAnimationFrame(frame);

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
