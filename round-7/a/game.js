import * as THREE from './node_modules/three/build/three.module.js';

const canvas = document.querySelector('#game-canvas');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.25;

const scene = new THREE.Scene();
scene.background = new THREE.Color('#030b08');
scene.fog = new THREE.Fog('#030b08', 12, 29);

const camera = new THREE.PerspectiveCamera(47, 1, .1, 100);
camera.position.set(0, 13.8, 14.8);
camera.lookAt(0, 0, 0);

scene.add(new THREE.HemisphereLight('#b8ffe0', '#07140d', 1.8));
const key = new THREE.DirectionalLight('#b9ffd8', 3.2);
key.position.set(5, 11, 7); key.castShadow = true; key.shadow.mapSize.set(2048, 2048); scene.add(key);
const rim = new THREE.PointLight('#24ef94', 22, 18, 2); rim.position.set(-7, 3, -4); scene.add(rim);

const board = new THREE.Group(); scene.add(board);
const floor = new THREE.Mesh(new THREE.BoxGeometry(16.6, .55, 16.6), new THREE.MeshStandardMaterial({ color:'#0a2419', roughness:.5, metalness:.25 }));
floor.position.y = -.42; floor.receiveShadow = true; board.add(floor);
const grid = new THREE.GridHelper(16, 16, '#4bd27d', '#174c31');
grid.position.y = -.125; grid.material.transparent = true; grid.material.opacity = .38; board.add(grid);
const edge = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(16.65, .56, 16.65)), new THREE.LineBasicMaterial({ color:'#62ff9d', transparent:true, opacity:.65 }));
edge.position.y = -.42; board.add(edge);

const starGeometry = new THREE.SphereGeometry(.025, 5, 5);
const stars = new THREE.Group(); scene.add(stars);
for (let i=0; i<180; i++) { const s = new THREE.Mesh(starGeometry, new THREE.MeshBasicMaterial({color: i%5 ? '#68ffa8' : '#ffffff'})); s.position.set((Math.random()-.5)*34, Math.random()*10+1, (Math.random()-.5)*30-7); stars.add(s); }

// Game pieces ---------------------------------------------------------------
const CELL = 1, LIMIT = 7;
const snake = new THREE.Group(); scene.add(snake);
const segmentGeometry = new THREE.SphereGeometry(.43, 18, 14);
const segmentMaterial = new THREE.MeshStandardMaterial({ color:'#28d673', roughness:.26, metalness:.2, emissive:'#0b5c2e', emissiveIntensity:.55 });
const headMaterial = new THREE.MeshStandardMaterial({ color:'#7affaa', roughness:.2, metalness:.15, emissive:'#167c42', emissiveIntensity:.75 });
const segments = [];
const logical = [{x:0,z:0},{x:-1,z:0},{x:-2,z:0},{x:-3,z:0}];
const shown = logical.map(p => new THREE.Vector3(p.x,.38,p.z));
for (let i=0; i<26; i++) {
  const body = new THREE.Mesh(segmentGeometry, i === 0 ? headMaterial : segmentMaterial);
  body.castShadow = true; body.receiveShadow = true; body.visible = i < logical.length;
  snake.add(body); segments.push(body);
}
const eyeGeometry = new THREE.SphereGeometry(.075, 10, 8);
const eyeMaterial = new THREE.MeshBasicMaterial({color:'#07140b'});
const eyes = new THREE.Group();
for (const x of [-.16,.16]) { const eye = new THREE.Mesh(eyeGeometry, eyeMaterial); eye.position.set(x,.12,.38); eyes.add(eye); }
segments[0].add(eyes);

const apple = new THREE.Group(); scene.add(apple);
const appleBody = new THREE.Mesh(new THREE.SphereGeometry(.38, 20, 16), new THREE.MeshStandardMaterial({color:'#ff3f4d', roughness:.28, metalness:.08, emissive:'#8f1422', emissiveIntensity:.8}));
appleBody.scale.set(1, .92, 1); appleBody.castShadow = true; apple.add(appleBody);
const stem = new THREE.Mesh(new THREE.CylinderGeometry(.035,.045,.23,8), new THREE.MeshStandardMaterial({color:'#74492b', roughness:.9})); stem.position.y=.37; stem.rotation.z=.25; apple.add(stem);
const leaf = new THREE.Mesh(new THREE.SphereGeometry(.13,10,8), new THREE.MeshStandardMaterial({color:'#45e876', emissive:'#0d6d2d', emissiveIntensity:.5})); leaf.position.set(.13,.48,0); leaf.scale.set(1.45,.28,.65); leaf.rotation.z=-.3; apple.add(leaf);
const appleLight = new THREE.PointLight('#ff4556', 5, 3.8, 2); apple.add(appleLight);

const particles = [];
const particleGroup = new THREE.Group(); scene.add(particleGroup);
const particleGeometry = new THREE.IcosahedronGeometry(.08, 1);
const particleMaterials = ['#ff4662','#ffcf5c','#fff1ba','#7affaa'].map(color => new THREE.MeshBasicMaterial({color, transparent:true}));
function burst(position) {
  for (let i=0; i<30; i++) {
    const particle = new THREE.Mesh(particleGeometry, particleMaterials[i % particleMaterials.length]);
    particle.position.copy(position); particle.position.y += .1;
    particle.userData.velocity = new THREE.Vector3((Math.random()-.5)*5, Math.random()*3.5+1.2, (Math.random()-.5)*5);
    particle.userData.life = 1; particle.userData.spin = (Math.random()-.5)*14;
    particleGroup.add(particle); particles.push(particle);
  }
}

let appleCell = {x:5,z:0}, direction = {x:1,z:0}, queuedDirection = {...direction};
let elapsed = 0, score = 0, playing = true;
const scoreEl = document.querySelector('#score');
const gameOverEl = document.querySelector('#game-over');
const finalScoreEl = document.querySelector('#final-score');
const cellToWorld = ({x,z}) => new THREE.Vector3(x, .38, z);
function setApple(cell) { appleCell = cell; apple.position.copy(cellToWorld(cell)); }
setApple(appleCell);
function randomApple() {
  let next;
  do next = {x: Math.floor(Math.random()*(LIMIT*2+1))-LIMIT, z: Math.floor(Math.random()*(LIMIT*2+1))-LIMIT};
  while (logical.some(p => p.x === next.x && p.z === next.z));
  setApple(next);
}
function die() { playing = false; finalScoreEl.textContent = String(score).padStart(3,'0'); gameOverEl.classList.add('is-visible'); gameOverEl.setAttribute('aria-hidden','false'); }
function restart() {
  logical.splice(0, logical.length, {x:0,z:0},{x:-1,z:0},{x:-2,z:0},{x:-3,z:0});
  shown.splice(0, shown.length, ...logical.map(cellToWorld));
  direction={x:1,z:0}; queuedDirection={...direction}; score=0; elapsed=0; playing=true;
  scoreEl.textContent='000'; setApple({x:5,z:0});
  segments.forEach((mesh, i) => { mesh.visible=i<logical.length; mesh.position.copy(shown[Math.min(i,shown.length-1)]); });
  gameOverEl.classList.remove('is-visible'); gameOverEl.setAttribute('aria-hidden','true');
}
function advance() {
  direction = queuedDirection;
  const next = {x: logical[0].x + direction.x, z: logical[0].z + direction.z};
  const ate = next.x === appleCell.x && next.z === appleCell.z;
  const bodyToCheck = ate ? logical : logical.slice(0,-1);
  if (Math.abs(next.x)>LIMIT || Math.abs(next.z)>LIMIT || bodyToCheck.some(p => p.x===next.x && p.z===next.z)) return die();
  logical.unshift(next);
  if (ate) { score += 10; scoreEl.textContent = String(score).padStart(3,'0'); burst(cellToWorld(next)); randomApple(); }
  else logical.pop();
  while (shown.length < logical.length) shown.push(cellToWorld(logical[logical.length-1]));
  segments.forEach((mesh, i) => mesh.visible = i < logical.length);
}
addEventListener('keydown', event => {
  const map = {ArrowUp:{x:0,z:-1},w:{x:0,z:-1},W:{x:0,z:-1},ArrowDown:{x:0,z:1},s:{x:0,z:1},S:{x:0,z:1},ArrowLeft:{x:-1,z:0},a:{x:-1,z:0},A:{x:-1,z:0},ArrowRight:{x:1,z:0},d:{x:1,z:0},D:{x:1,z:0}};
  if (event.code === 'Space' && !playing) { restart(); return; }
  const next = map[event.key]; if (!next || !playing) return;
  event.preventDefault();
  if (next.x !== -direction.x || next.z !== -direction.z) queuedDirection = next;
});
document.querySelector('#restart').addEventListener('click', restart);

function resize() { const {innerWidth:w, innerHeight:h} = window; renderer.setSize(w,h,false); camera.aspect=w/h; camera.updateProjectionMatrix(); }
addEventListener('resize', resize); resize();
const clock = new THREE.Clock();
function animate() {
  const delta = Math.min(clock.getDelta(), .05), t=clock.getElapsedTime();
  if (playing) { elapsed += delta; while (elapsed >= .16) { elapsed -= .16; advance(); } }
  logical.forEach((point, i) => { const target = cellToWorld(point); shown[i].lerp(target, 1-Math.exp(-delta*16)); segments[i].position.copy(shown[i]); segments[i].scale.setScalar(i===0 ? 1.08 : 1); });
  if (logical.length > 1) { const p=shown[0], n=shown[1]; segments[0].rotation.y=Math.atan2(n.x-p.x,n.z-p.z)+Math.PI; }
  apple.rotation.y = t*2.1; apple.position.y = .48 + Math.sin(t*3.6)*.11;
  for (let i=particles.length-1; i>=0; i--) { const p=particles[i]; p.userData.life-=delta*1.6; p.userData.velocity.y-=delta*7.2; p.position.addScaledVector(p.userData.velocity,delta); p.rotation.x+=p.userData.spin*delta; p.rotation.y+=p.userData.spin*.7*delta; p.scale.setScalar(Math.max(0,p.userData.life)); if (p.userData.life<=0) { particleGroup.remove(p); particles.splice(i,1); } }
  stars.rotation.y=t*.015; rim.intensity=19+Math.sin(t*2)*4; renderer.render(scene,camera); requestAnimationFrame(animate);
}
animate();
