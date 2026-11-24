import * as THREE from 'three';

export class Snake {
  constructor(scene, arena, options = {}) {
    this.scene = scene;
    this.arena = arena;
    this.gridSize = arena.gridSize;
    this.tileSize = arena.tileSize;

    // Movement speed settings
    this.baseSpeed = options.speed || 5.0; // grid cells per second
    this.tickInterval = 1 / this.baseSpeed;
    this.tickTimer = 0;

    // State
    this.isDead = false;
    this.growPending = 0;

    // Direction vectors
    this.currentDir = { x: 1, z: 0 }; // Moving East initially
    this.inputQueue = [];

    // Snake segments: array of { x, z, prevX, prevZ, mesh }
    this.segments = [];
    this.snakeGroup = new THREE.Group();
    this.scene.add(this.snakeGroup);

    this.initSnake();
    this.initControls();
  }

  initSnake() {
    // Clear any previous meshes
    while (this.snakeGroup.children.length > 0) {
      this.snakeGroup.remove(this.snakeGroup.children[0]);
    }
    this.segments = [];
    this.inputQueue = [];
    this.currentDir = { x: 1, z: 0 };
    this.tickTimer = 0;
    this.isDead = false;
    this.growPending = 0;

    const startX = Math.floor(this.gridSize / 2);
    const startZ = Math.floor(this.gridSize / 2);

    // Initial 3 segments: head + 2 body segments
    const initialCoords = [
      { x: startX, z: startZ },
      { x: startX - 1, z: startZ },
      { x: startX - 2, z: startZ }
    ];

    initialCoords.forEach((coord, index) => {
      const isHead = index === 0;
      const mesh = isHead ? this.createHeadMesh() : this.createBodyMesh(index, initialCoords.length);
      
      const worldPos = this.arena.gridToWorld(coord.x, coord.z);
      mesh.position.set(worldPos.x, 0.45, worldPos.z);
      this.snakeGroup.add(mesh);

      this.segments.push({
        x: coord.x,
        z: coord.z,
        prevX: coord.x,
        prevZ: coord.z,
        mesh: mesh
      });
    });

    this.updateHeadRotation(this.currentDir);
  }

  createHeadMesh() {
    const headGroup = new THREE.Group();

    // Head base: smooth rounded capsule/sphere
    const headGeo = new THREE.SphereGeometry(0.48, 24, 20);
    headGeo.scale(1.0, 0.85, 1.15); // Slightly elongated forward
    const headMat = new THREE.MeshStandardMaterial({
      color: 0x22c55e, // Vibrant Emerald
      emissive: 0x15803d,
      emissiveIntensity: 0.35,
      roughness: 0.25,
      metalness: 0.4
    });
    const headMesh = new THREE.Mesh(headGeo, headMat);
    headMesh.castShadow = true;
    headMesh.receiveShadow = true;
    headGroup.add(headMesh);

    // Expressive Eyes
    const eyeGeo = new THREE.SphereGeometry(0.12, 16, 16);
    const eyeWhiteMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.2,
      metalness: 0.1
    });

    const pupilGeo = new THREE.SphereGeometry(0.065, 12, 12);
    const pupilMat = new THREE.MeshBasicMaterial({ color: 0x09090b });

    // Left Eye
    const leftEye = new THREE.Mesh(eyeGeo, eyeWhiteMat);
    leftEye.position.set(-0.24, 0.22, 0.24);
    const leftPupil = new THREE.Mesh(pupilGeo, pupilMat);
    leftPupil.position.set(-0.25, 0.24, 0.33);
    headGroup.add(leftEye);
    headGroup.add(leftPupil);

    // Right Eye
    const rightEye = new THREE.Mesh(eyeGeo, eyeWhiteMat);
    rightEye.position.set(0.24, 0.22, 0.24);
    const rightPupil = new THREE.Mesh(pupilGeo, pupilMat);
    rightPupil.position.set(0.25, 0.24, 0.33);
    headGroup.add(rightEye);
    headGroup.add(rightPupil);

    // Cute tongue tip
    const tongueGeo = new THREE.BoxGeometry(0.1, 0.03, 0.2);
    const tongueMat = new THREE.MeshStandardMaterial({
      color: 0xf43f5e,
      roughness: 0.3
    });
    const tongue = new THREE.Mesh(tongueGeo, tongueMat);
    tongue.position.set(0, -0.05, 0.58);
    headGroup.add(tongue);

    return headGroup;
  }

  createBodyMesh(index, totalSegments) {
    const group = new THREE.Group();

    // Body segment: slightly tapered rounded sphere
    const ratio = Math.max(0.65, 1.0 - (index / Math.max(totalSegments, 15)) * 0.3);
    const radius = 0.44 * ratio;
    
    const geo = new THREE.SphereGeometry(radius, 20, 16);
    geo.scale(1.0, 0.88, 1.0);

    // Color gradient along the snake body (Green -> Emerald -> Teal -> Cyan)
    const t = Math.min(index / 20, 1.0);
    const segmentColor = new THREE.Color().lerpColors(
      new THREE.Color(0x10b981), // Emerald
      new THREE.Color(0x06b6d4), // Cyan
      t
    );

    const mat = new THREE.MeshStandardMaterial({
      color: segmentColor,
      emissive: segmentColor,
      emissiveIntensity: 0.25,
      roughness: 0.3,
      metalness: 0.35
    });

    const mesh = new THREE.Mesh(geo, mat);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);

    return group;
  }

  initControls() {
    window.addEventListener('keydown', (e) => {
      let requestedDir = null;
      switch (e.code) {
        case 'ArrowUp':
        case 'KeyW':
          requestedDir = { x: 0, z: -1 };
          break;
        case 'ArrowDown':
        case 'KeyS':
          requestedDir = { x: 0, z: 1 };
          break;
        case 'ArrowLeft':
        case 'KeyA':
          requestedDir = { x: -1, z: 0 };
          break;
        case 'ArrowRight':
        case 'KeyD':
          requestedDir = { x: 1, z: 0 };
          break;
      }

      if (requestedDir) {
        e.preventDefault();
        this.queueDirection(requestedDir);
      }
    });
  }

  queueDirection(newDir) {
    // Only queue up to 2 turns ahead to keep controls responsive and tight
    if (this.inputQueue.length >= 2) return;

    // Check against the latest intended direction (either last in queue or current)
    const baseDir = this.inputQueue.length > 0 
      ? this.inputQueue[this.inputQueue.length - 1] 
      : this.currentDir;

    // Cannot reverse directly into self (180 degree turn)
    if (baseDir.x + newDir.x === 0 && baseDir.z + newDir.z === 0) {
      return;
    }

    // Ignore identical input
    if (baseDir.x === newDir.x && baseDir.z === newDir.z) {
      return;
    }

    this.inputQueue.push(newDir);
  }

  update(delta, onEatCheck, onCollision) {
    if (this.isDead) return;

    this.tickTimer += delta;

    // Execute logical grid step when timer reaches tickInterval
    while (this.tickTimer >= this.tickInterval) {
      this.tickTimer -= this.tickInterval;
      this.step(onEatCheck, onCollision);
      if (this.isDead) return;
    }

    // Smooth visual interpolation between previous and current grid coordinates
    const progress = Math.min(this.tickTimer / this.tickInterval, 1.0);
    this.interpolate(progress);
  }

  step(onEatCheck, onCollision) {
    // Process next queued input direction
    if (this.inputQueue.length > 0) {
      this.currentDir = this.inputQueue.shift();
      this.updateHeadRotation(this.currentDir);
    }

    const head = this.segments[0];
    const newHeadX = head.x + this.currentDir.x;
    const newHeadZ = head.z + this.currentDir.z;

    // 1. Check Wall Collision
    if (
      newHeadX < 0 ||
      newHeadX >= this.gridSize ||
      newHeadZ < 0 ||
      newHeadZ >= this.gridSize
    ) {
      this.die(onCollision, 'wall');
      return;
    }

    // 2. Check Self Collision (against all segments except tail if it moves away)
    const checkSegments = this.growPending > 0 
      ? this.segments 
      : this.segments.slice(0, -1);

    for (let i = 0; i < checkSegments.length; i++) {
      if (checkSegments[i].x === newHeadX && checkSegments[i].z === newHeadZ) {
        this.die(onCollision, 'self');
        return;
      }
    }

    // Store previous coordinates for smooth interpolation
    for (let i = 0; i < this.segments.length; i++) {
      this.segments[i].prevX = this.segments[i].x;
      this.segments[i].prevZ = this.segments[i].z;
    }

    // Move body segments to follow the one ahead
    for (let i = this.segments.length - 1; i > 0; i--) {
      this.segments[i].x = this.segments[i - 1].x;
      this.segments[i].z = this.segments[i - 1].z;
    }

    // Move head to new grid location
    head.x = newHeadX;
    head.z = newHeadZ;

    // Check if apple was eaten
    if (onEatCheck && onEatCheck(newHeadX, newHeadZ)) {
      this.growPending += 1;
    }

    // Handle growth
    if (this.growPending > 0) {
      this.growPending--;
      const tail = this.segments[this.segments.length - 1];
      const newMesh = this.createBodyMesh(this.segments.length, this.segments.length + 1);
      
      const worldPos = this.arena.gridToWorld(tail.prevX, tail.prevZ);
      newMesh.position.set(worldPos.x, 0.45, worldPos.z);
      this.snakeGroup.add(newMesh);

      this.segments.push({
        x: tail.prevX,
        z: tail.prevZ,
        prevX: tail.prevX,
        prevZ: tail.prevZ,
        mesh: newMesh
      });
    }
  }

  interpolate(progress) {
    // Smooth lerp for every segment between its previous and target world positions
    for (let i = 0; i < this.segments.length; i++) {
      const seg = this.segments[i];
      const prevWorld = this.arena.gridToWorld(seg.prevX, seg.prevZ);
      const currWorld = this.arena.gridToWorld(seg.x, seg.z);

      seg.mesh.position.x = THREE.MathUtils.lerp(prevWorld.x, currWorld.x, progress);
      seg.mesh.position.z = THREE.MathUtils.lerp(prevWorld.z, currWorld.z, progress);

      // Subtle breathing wave along the snake
      const wave = Math.sin(Date.now() * 0.008 - i * 0.4) * 0.04;
      seg.mesh.position.y = 0.45 + (i === 0 ? 0 : wave);
    }
  }

  updateHeadRotation(dir) {
    if (this.segments.length === 0) return;
    const headMesh = this.segments[0].mesh;
    // Rotation angle around Y axis
    const angle = Math.atan2(dir.x, dir.z);
    headMesh.rotation.y = angle;
  }

  die(onCollision, reason) {
    this.isDead = true;
    console.log(`Snake crashed! Reason: ${reason}`);
    
    // Death visual effect: tint segments red
    this.segments.forEach((seg, idx) => {
      seg.mesh.traverse((child) => {
        if (child.isMesh && child.material && child.material.color) {
          child.material.color.setHex(0xef4444);
          if (child.material.emissive) {
            child.material.emissive.setHex(0x991b1b);
          }
        }
      });
    });

    if (onCollision) {
      onCollision(reason);
    }
  }

  getHeadGrid() {
    return this.segments.length > 0 ? { x: this.segments[0].x, z: this.segments[0].z } : null;
  }

  getAllGridCoords() {
    return this.segments.map(s => ({ x: s.x, z: s.z }));
  }
}
