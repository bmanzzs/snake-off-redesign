import * as THREE from 'three';

export class ParticleSystem {
  constructor(scene) {
    this.scene = scene;
    this.particles = [];
    this.shockwaves = [];

    // Reusable geometries & materials for burst particles
    this.sparkGeo = new THREE.DodecahedronGeometry(0.09);
    this.ringGeo = new THREE.RingGeometry(0.1, 0.22, 32);
    this.ringGeo.rotateX(-Math.PI / 2); // Lay flat on the ground plane

    this.palette = [
      0xef4444, // Ruby red
      0xf87171, // Bright salmon
      0xfacc15, // Golden spark
      0x4ade80, // Emerald spark
      0xffffff  // White gleam
    ];
  }

  burst(x, y, z, count = 38) {
    // 1. 3D Sparkling particle burst
    for (let i = 0; i < count; i++) {
      const color = this.palette[Math.floor(Math.random() * this.palette.length)];
      const mat = new THREE.MeshStandardMaterial({
        color: color,
        emissive: color,
        emissiveIntensity: 0.8,
        roughness: 0.2,
        metalness: 0.5,
        transparent: true,
        opacity: 1.0
      });

      const mesh = new THREE.Mesh(this.sparkGeo, mat);
      mesh.position.set(x, y, z);
      
      const scale = 0.5 + Math.random() * 0.8;
      mesh.scale.setScalar(scale);

      // Random spherical outward explosion velocity with upward bias
      const speed = 2.5 + Math.random() * 4.5;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI * 0.55; // upward hemisphere

      const vx = Math.sin(phi) * Math.cos(theta) * speed;
      const vy = Math.cos(phi) * speed + 1.2;
      const vz = Math.sin(phi) * Math.sin(theta) * speed;

      this.scene.add(mesh);

      this.particles.push({
        mesh: mesh,
        vx: vx,
        vy: vy,
        vz: vz,
        rotX: (Math.random() - 0.5) * 12,
        rotY: (Math.random() - 0.5) * 12,
        rotZ: (Math.random() - 0.5) * 12,
        life: 0,
        maxLife: 0.65 + Math.random() * 0.35,
        baseScale: scale
      });
    }

    // 2. Shockwave pulse expanding along the floor
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xef4444,
      transparent: true,
      opacity: 0.85,
      side: THREE.DoubleSide
    });
    const ring = new THREE.Mesh(this.ringGeo, ringMat);
    ring.position.set(x, 0.05, z);
    this.scene.add(ring);

    this.shockwaves.push({
      mesh: ring,
      scale: 1,
      maxScale: 9.0,
      life: 0,
      maxLife: 0.45
    });
  }

  update(delta) {
    // 1. Update burst particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life += delta;

      if (p.life >= p.maxLife) {
        this.scene.remove(p.mesh);
        p.mesh.geometry.dispose();
        p.mesh.material.dispose();
        this.particles.splice(i, 1);
        continue;
      }

      const lifeRatio = p.life / p.maxLife;

      // Physics: velocity + gravity + air drag
      p.vy -= 9.8 * delta; // Gravity
      p.vx *= 0.96;
      p.vz *= 0.96;

      p.mesh.position.x += p.vx * delta;
      p.mesh.position.y += p.vy * delta;
      p.mesh.position.z += p.vz * delta;

      // Prevent falling below floor
      if (p.mesh.position.y < 0.05) {
        p.mesh.position.y = 0.05;
        p.vy = -p.vy * 0.35; // bounce
      }

      // Rotation spin
      p.mesh.rotation.x += p.rotX * delta;
      p.mesh.rotation.y += p.rotY * delta;
      p.mesh.rotation.z += p.rotZ * delta;

      // Fade out and shrink near end of life
      const remaining = 1.0 - lifeRatio;
      p.mesh.scale.setScalar(p.baseScale * remaining);
      p.mesh.material.opacity = remaining;
    }

    // 2. Update ground shockwaves
    for (let i = this.shockwaves.length - 1; i >= 0; i--) {
      const sw = this.shockwaves[i];
      sw.life += delta;

      if (sw.life >= sw.maxLife) {
        this.scene.remove(sw.mesh);
        sw.mesh.geometry.dispose();
        sw.mesh.material.dispose();
        this.shockwaves.splice(i, 1);
        continue;
      }

      const ratio = sw.life / sw.maxLife;
      const currentScale = 1.0 + (sw.maxScale - 1.0) * ratio;
      sw.mesh.scale.set(currentScale, currentScale, currentScale);
      sw.mesh.material.opacity = (1.0 - ratio) * 0.8;
    }
  }

  clear() {
    this.particles.forEach(p => {
      this.scene.remove(p.mesh);
      p.mesh.geometry.dispose();
      p.mesh.material.dispose();
    });
    this.particles = [];

    this.shockwaves.forEach(sw => {
      this.scene.remove(sw.mesh);
      sw.mesh.geometry.dispose();
      sw.mesh.material.dispose();
    });
    this.shockwaves = [];
  }
}
