import * as THREE from 'three';

export class Apple {
  constructor(scene, arena) {
    this.scene = scene;
    this.arena = arena;
    this.gridSize = arena.gridSize;

    this.gridPos = { x: 0, z: 0 };
    this.baseY = 0.45;
    this.time = 0;
    this.spawnScale = 0;

    this.appleGroup = new THREE.Group();
    this.createAppleMesh();
    this.scene.add(this.appleGroup);
  }

  createAppleMesh() {
    // 1. Apple Body: juicy, slightly squashed sphere
    const bodyGeo = new THREE.SphereGeometry(0.38, 24, 20);
    bodyGeo.scale(1.05, 0.95, 1.05);

    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0xef4444, // Vibrant ruby red
      emissive: 0x991b1b,
      emissiveIntensity: 0.35,
      roughness: 0.15,
      metalness: 0.25
    });

    this.bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
    this.bodyMesh.castShadow = true;
    this.bodyMesh.receiveShadow = true;
    this.appleGroup.add(this.bodyMesh);

    // 2. Stem: small curved brown cylinder
    const stemGeo = new THREE.CylinderGeometry(0.03, 0.04, 0.22, 8);
    const stemMat = new THREE.MeshStandardMaterial({
      color: 0x78350f,
      roughness: 0.8
    });
    const stem = new THREE.Mesh(stemGeo, stemMat);
    stem.position.set(0.02, 0.42, 0);
    stem.rotation.z = -0.18;
    stem.castShadow = true;
    this.appleGroup.add(stem);

    // 3. Leaf: tiny vibrant emerald green leaf
    const leafGeo = new THREE.ConeGeometry(0.09, 0.24, 5);
    leafGeo.scale(1.0, 0.2, 0.8);
    const leafMat = new THREE.MeshStandardMaterial({
      color: 0x22c55e,
      emissive: 0x15803d,
      emissiveIntensity: 0.3,
      roughness: 0.3
    });
    const leaf = new THREE.Mesh(leafGeo, leafMat);
    leaf.position.set(0.12, 0.48, 0.05);
    leaf.rotation.set(0.3, 0.2, -0.9);
    this.appleGroup.add(leaf);

    // 4. Warm Point Light for apple aura glow
    this.pointLight = new THREE.PointLight(0xff3333, 1.4, 2.5);
    this.pointLight.position.set(0, 0.3, 0);
    this.appleGroup.add(this.pointLight);
  }

  spawn(occupiedCoords = []) {
    const occupiedSet = new Set(occupiedCoords.map(c => `${c.x},${c.z}`));
    const available = [];

    for (let x = 0; x < this.gridSize; x++) {
      for (let z = 0; z < this.gridSize; z++) {
        if (!occupiedSet.has(`${x},${z}`)) {
          available.push({ x, z });
        }
      }
    }

    if (available.length === 0) {
      // Victory condition / board full!
      return false;
    }

    const chosen = available[Math.floor(Math.random() * available.length)];
    this.gridPos = chosen;

    const worldPos = this.arena.gridToWorld(chosen.x, chosen.z);
    this.appleGroup.position.set(worldPos.x, this.baseY, worldPos.z);

    // Pop-in bounce animation
    this.spawnScale = 0.01;
    this.appleGroup.scale.setScalar(this.spawnScale);

    return true;
  }

  update(delta) {
    this.time += delta;

    // Pop-in scaling animation
    if (this.spawnScale < 1.0) {
      this.spawnScale += delta * 4.5;
      if (this.spawnScale > 1.0) this.spawnScale = 1.0;
    }

    // Continuous spinning & bobbing
    this.appleGroup.rotation.y += delta * 2.2;
    const bobOffset = Math.sin(this.time * 3.8) * 0.12;
    this.appleGroup.position.y = this.baseY + bobOffset;

    // Subtle gentle breathing pulse
    const pulse = 1.0 + Math.sin(this.time * 6.0) * 0.04;
    this.appleGroup.scale.setScalar(this.spawnScale * pulse);

    // Pulsing light intensity
    if (this.pointLight) {
      this.pointLight.intensity = 1.2 + Math.sin(this.time * 4.0) * 0.4;
    }
  }

  getPosition() {
    return {
      x: this.appleGroup.position.x,
      y: this.appleGroup.position.y,
      z: this.appleGroup.position.z
    };
  }

  getGridPos() {
    return { x: this.gridPos.x, z: this.gridPos.z };
  }
}
