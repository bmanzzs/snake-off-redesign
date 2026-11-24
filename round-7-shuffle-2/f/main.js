import * as THREE from './node_modules/three/build/three.module.js';

const GRID = 20;            // cells per side
const HALF = GRID / 2;
const BASE_TICK = 155;      // ms per move, shrinks as you score

// --- renderer / scene / camera ---
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0b0f1a);

const camera = new THREE.PerspectiveCamera(42, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 26, 19);
camera.lookAt(0, 0, -0.5);

// --- lights ---
const ambient = new THREE.AmbientLight(0xaabbdd, 0.65);
scene.add(ambient);
const sun = new THREE.DirectionalLight(0xffffff, 1.5);
sun.position.set(6, 12, 8);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = -14; sun.shadow.camera.right = 14;
sun.shadow.camera.top = 14; sun.shadow.camera.bottom = -14;
scene.add(sun);
const rim = new THREE.DirectionalLight(0x66aaff, 0.6);
rim.position.set(-8, 6, -6);
scene.add(rim);

// --- board ---
const boardGroup = new THREE.Group();
scene.add(boardGroup);

const floor = new THREE.Mesh(
  new THREE.BoxGeometry(GRID + 1.2, 1, GRID + 1.2),
  new THREE.MeshStandardMaterial({ color: 0x182542, roughness: 0.85, metalness: 0.1 })
);
floor.position.y = -0.5;
floor.receiveShadow = true;
boardGroup.add(floor);

const gridHelper = new THREE.GridHelper(GRID, GRID, 0x35507f, 0x24345c);
gridHelper.position.y = 0.02;
boardGroup.add(gridHelper);

// glowing border
const borderMat = new THREE.MeshBasicMaterial({ color: 0x3ce38b });
const borderGeoH = new THREE.BoxGeometry(GRID + 1.2, 0.18, 0.18);
const borderGeoV = new THREE.BoxGeometry(0.18, 0.18, GRID + 1.2);
const edges = [
  [0, 0.09, -HALF - 0.5, borderGeoH],
  [0, 0.09, HALF + 0.5, borderGeoH],
  [-HALF - 0.5, 0.09, 0, borderGeoV],
  [HALF + 0.5, 0.09, 0, borderGeoV],
];
for (const [x, y, z, geo] of edges) {
  const m = new THREE.Mesh(geo, borderMat);
  m.position.set(x, y, z);
  boardGroup.add(m);
}

// --- snake (meshes) ---
const snakeGroup = new THREE.Group();
scene.add(snakeGroup);

const bodyGeo = new THREE.SphereGeometry(0.5, 24, 18);
const bodyMat = new THREE.MeshStandardMaterial({ color: 0x34d47f, roughness: 0.3, metalness: 0.15, emissive: 0x0d3a22, emissiveIntensity: 0.55 });
const headGeo = new THREE.SphereGeometry(0.6, 24, 18);
const headMat = new THREE.MeshStandardMaterial({ color: 0x52ffb0, roughness: 0.28, metalness: 0.2, emissive: 0x0e3d24, emissiveIntensity: 0.6 });
const eyeGeo = new THREE.SphereGeometry(0.11, 12, 10);
const eyeMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.15 });
const pupilGeo = new THREE.SphereGeometry(0.055, 10, 8);
const pupilMat = new THREE.MeshStandardMaterial({ color: 0x081018 });

function makeHead() {
  const g = new THREE.Group();
  const head = new THREE.Mesh(headGeo, headMat);
  head.castShadow = true;
  g.add(head);
  for (const side of [-1, 1]) {
    const eye = new THREE.Mesh(eyeGeo, eyeMat);
    eye.position.set(side * 0.24, 0.24, 0.46);
    g.add(eye);
    const pupil = new THREE.Mesh(pupilGeo, pupilMat);
    pupil.position.set(side * 0.24, 0.24, 0.55);
    g.add(pupil);
  }
  return g;
}

function makeBody() {
  const m = new THREE.Mesh(bodyGeo, bodyMat);
  m.castShadow = true;
  return m;
}

// --- apple ---
let appleMesh = null;
let appleCell = null;

function buildApple(x, z) {
  const g = new THREE.Group();
  const fruit = new THREE.Mesh(
    new THREE.SphereGeometry(0.42, 24, 18),
    new THREE.MeshStandardMaterial({ color: 0xff3b4d, roughness: 0.22, metalness: 0.1, emissive: 0x5a0d15, emissiveIntensity: 0.75 })
  );
  fruit.scale.y = 0.92;
  fruit.castShadow = true;
  g.add(fruit);
  const stem = new THREE.Mesh(
    new THREE.CylinderGeometry(0.05, 0.07, 0.28, 8),
    new THREE.MeshStandardMaterial({ color: 0x5a3a1e, roughness: 0.8 })
  );
  stem.position.set(0.05, 0.45, 0);
  stem.rotation.z = 0.28;
  g.add(stem);
  const leaf = new THREE.Mesh(
    new THREE.SphereGeometry(0.18, 12, 8),
    new THREE.MeshStandardMaterial({ color: 0x3ce38b, roughness: 0.5, emissive: 0x0a2f18, emissiveIntensity: 0.5 })
  );
  leaf.scale.set(1.6, 0.35, 0.9);
  leaf.position.set(0.24, 0.5, 0);
  leaf.rotation.z = 0.5;
  g.add(leaf);
  const w = cellToWorld(x, z);
  g.position.set(w.x, 0.62, w.z);
  return g;
}

// --- particles ---
const MAX_PARTICLES = 80;
const particleGeo = new THREE.BufferGeometry();
const particlePos = new Float32Array(MAX_PARTICLES * 3);
const particleVel = [];
for (let i = 0; i < MAX_PARTICLES; i++) particleVel.push({ x: 0, y: 0, z: 0 });
particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePos, 3));
const particleMat = new THREE.PointsMaterial({ color: 0xff7a4d, size: 0.17, transparent: true, opacity: 1, depthWrite: false });
const particlePoints = new THREE.Points(particleGeo, particleMat);
particlePoints.visible = false;
scene.add(particlePoints);
let particleLife = 0;
const PARTICLE_LIFE = 0.9;

function burstParticles(x, z) {
  const w = cellToWorld(x, z);
  for (let i = 0; i < MAX_PARTICLES; i++) {
    particlePos[i * 3] = w.x;
    particlePos[i * 3 + 1] = 0.62;
    particlePos[i * 3 + 2] = w.z;
    const a = Math.random() * Math.PI * 2;
    const up = 2.2 + Math.random() * 3.2;
    const sp = 1.2 + Math.random() * 2.6;
    particleVel[i] = { x: Math.cos(a) * sp, y: up, z: Math.sin(a) * sp };
  }
  particleGeo.attributes.position.needsUpdate = true;
  particleLife = PARTICLE_LIFE;
  particleMat.opacity = 1;
  particlePoints.visible = true;
}

function updateParticles(dt) {
  if (particleLife <= 0) { particlePoints.visible = false; return; }
  particleLife -= dt;
  particleMat.opacity = Math.max(0, particleLife / PARTICLE_LIFE);
  for (let i = 0; i < MAX_PARTICLES; i++) {
    const v = particleVel[i];
    v.y -= 7.5 * dt;
    particlePos[i * 3] += v.x * dt;
    particlePos[i * 3 + 1] += v.y * dt;
    particlePos[i * 3 + 2] += v.z * dt;
    if (particlePos[i * 3 + 1] < 0.05) {
      particlePos[i * 3 + 1] = 0.05;
      v.y *= -0.35; v.x *= 0.75; v.z *= 0.75;
    }
  }
  particleGeo.attributes.position.needsUpdate = true;
}

// --- state ---
let snake = [];
let renderPos = [];
let dir = { x: 0, z: 1 };
let pendingDir = null;
let alive = true;
let score = 0;
let tickMs = BASE_TICK;
let lastTick = 0;
let segments = [];
let head = null;
let appleAnim = 0;

function cellToWorld(cx, cz) {
  return { x: cx - HALF + 0.5, z: cz - HALF + 0.5 };
}

function randomFreeCell() {
  const occupied = new Set(snake.map(c => c.x + ',' + c.z));
  const cells = [];
  for (let x = 0; x < GRID; x++) {
    for (let z = 0; z < GRID; z++) {
      if (!occupied.has(x + ',' + z)) cells.push({ x, z });
    }
  }
  if (cells.length === 0) return null;
  return cells[Math.floor(Math.random() * cells.length)];
}

function placeApple() {
  const cell = randomFreeCell();
  appleCell = cell;
  if (appleMesh) scene.remove(appleMesh);
  if (cell) {
    appleMesh = buildApple(cell.x, cell.z);
    scene.add(appleMesh);
  } else {
    appleMesh = null;
  }
}

function spawnSnake() {
  const cx = Math.floor(GRID / 2), cz = Math.floor(GRID / 2);
  snake = [
    { x: cx, z: cz },
    { x: cx, z: cz - 1 },
    { x: cx, z: cz - 2 },
  ];
  renderPos = snake.map(s => { const w = cellToWorld(s.x, s.z); return new THREE.Vector3(w.x, 0.55, w.z); });
  dir = { x: 0, z: 1 };
  pendingDir = null;
  alive = true;
  score = 0;
  tickMs = BASE_TICK;
  lastTick = performance.now();
  appleAnim = 0;

  for (const m of segments) snakeGroup.remove(m);
  if (head) snakeGroup.remove(head);
  segments = [];
  head = makeHead();
  snakeGroup.add(head);
  for (let i = 0; i < snake.length - 1; i++) {
    const m = makeBody();
    segments.push(m);
    snakeGroup.add(m);
  }
  placeApple();
  updateScore(0);
}

// --- input ---
window.addEventListener('keydown', (e) => {
  const k = e.key.toLowerCase();
  const map = {
    arrowup: { x: 0, z: -1 }, w: { x: 0, z: -1 },
    arrowdown: { x: 0, z: 1 }, s: { x: 0, z: 1 },
    arrowleft: { x: -1, z: 0 }, a: { x: -1, z: 0 },
    arrowright: { x: 1, z: 0 }, d: { x: 1, z: 0 },
  };
  const d = map[k];
  if (!d) return;
  e.preventDefault();
  if (!alive) {
    if (k === ' ' || k === 'enter') resetGame();
    return;
  }
  if (d.x === -dir.x && d.z === -dir.z) return;
  pendingDir = d;
});

function updateScore(v) {
  score = v;
  document.getElementById('score').textContent = `Score: ${v}`;
}

function resetGame() {
  spawnSnake();
  document.getElementById('gameover').classList.add('hidden');
}

function gameOver() {
  alive = false;
  pendingDir = null;
  document.getElementById('final-score').textContent = `Score: ${score}`;
  document.getElementById('gameover').classList.remove('hidden');
}

function step() {
  if (pendingDir) { dir = pendingDir; pendingDir = null; }
  const headCell = snake[0];
  const newHead = { x: headCell.x + dir.x, z: headCell.z + dir.z };

  if (newHead.x < 0 || newHead.x >= GRID || newHead.z < 0 || newHead.z >= GRID) return gameOver();

  const bodyToCheck = snake.slice(0, snake.length - 1);
  if (bodyToCheck.some(c => c.x === newHead.x && c.z === newHead.z)) return gameOver();

  const hitApple = appleCell && appleCell.x === newHead.x && appleCell.z === newHead.z;

  snake.unshift(newHead);
  const newRenderPos = [renderPos[0] ? renderPos[0].clone() : targetOf(snake[0])];
  for (let i = 1; i < snake.length; i++) {
    newRenderPos.push(renderPos[i - 1] ? renderPos[i - 1].clone() : targetOf(snake[i]));
  }
  if (hitApple) {
    burstParticles(newHead.x, newHead.z);
    updateScore(score + 1);
    tickMs = Math.max(85, BASE_TICK - score * 6);
    const m = makeBody();
    segments.push(m);
    snakeGroup.add(m);
    placeApple();
  } else {
    snake.pop();
    newRenderPos.pop();
  }

  renderPos = newRenderPos;
}

function targetOf(cell) {
  const w = cellToWorld(cell.x, cell.z);
  return new THREE.Vector3(w.x, 0.55, w.z);
}

document.getElementById('restart').addEventListener('click', resetGame);

// --- animation ---
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.05);
  const now = performance.now();

  if (alive && now - lastTick >= tickMs) {
    lastTick = now;
    step();
  }

  // smooth render
  const target = snake.map(s => { const w = cellToWorld(s.x, s.z); return new THREE.Vector3(w.x, 0.55, w.z); });
  for (let i = 0; i < target.length; i++) {
    if (!renderPos[i]) renderPos[i] = target[i].clone();
    const speed = i === 0 ? 0.5 : 0.42;
    renderPos[i].lerp(target[i], speed);
  }
  while (renderPos.length > target.length) renderPos.pop();

  head.position.copy(renderPos[0]);
  head.position.y = 0.55 + Math.sin(now * 0.008) * 0.05;

  const desired = Math.atan2(dir.x, dir.z);
  let cur = head.rotation.y;
  let diff = desired - cur;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  head.rotation.y = cur + diff * 0.25;

  for (let i = 0; i < segments.length; i++) {
    const rp = renderPos[i + 1];
    if (rp) {
      segments[i].position.copy(rp);
      segments[i].position.y = 0.55 + Math.sin(now * 0.008 + (i + 1) * 0.6) * 0.04;
    }
  }

  // apple spin + bob
  if (appleMesh) {
    appleAnim += dt;
    appleMesh.rotation.y += dt * 1.8;
    appleMesh.position.y = 0.62 + Math.sin(appleAnim * 2.6) * 0.16;
  }

  updateParticles(dt);

  renderer.render(scene, camera);
}

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

spawnSnake();
animate();
