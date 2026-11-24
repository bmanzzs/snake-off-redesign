import * as THREE from 'three';

export class Arena {
  constructor(scene, gridSize = 20, tileSize = 1) {
    this.scene = scene;
    this.gridSize = gridSize;
    this.tileSize = tileSize;
    this.halfGrid = (gridSize * tileSize) / 2;

    this.createBoard();
    this.createBoundaryRails();
    this.createLighting();
    this.createStarfield();
  }

  createBoard() {
    const boardGroup = new THREE.Group();
    
    // Checkered Floor tiles
    const tileGeo = new THREE.BoxGeometry(this.tileSize * 0.96, 0.4, this.tileSize * 0.96);
    
    const matA = new THREE.MeshStandardMaterial({
      color: 0x1e293b, // Dark slate
      roughness: 0.35,
      metalness: 0.25,
    });
    
    const matB = new THREE.MeshStandardMaterial({
      color: 0x0f172a, // Deep obsidian
      roughness: 0.45,
      metalness: 0.15,
    });

    for (let x = 0; x < this.gridSize; x++) {
      for (let z = 0; z < this.gridSize; z++) {
        const isAlternate = (x + z) % 2 === 0;
        const tileMesh = new THREE.Mesh(tileGeo, isAlternate ? matA : matB);
        
        // Position tile so grid indices (0..gridSize-1) map nicely
        const worldX = (x - this.gridSize / 2 + 0.5) * this.tileSize;
        const worldZ = (z - this.gridSize / 2 + 0.5) * this.tileSize;
        tileMesh.position.set(worldX, -0.2, worldZ);
        tileMesh.receiveShadow = true;
        boardGroup.add(tileMesh);
      }
    }

    // Base podium platform underneath
    const podiumGeo = new THREE.BoxGeometry(
      this.gridSize * this.tileSize + 1.2,
      1.0,
      this.gridSize * this.tileSize + 1.2
    );
    const podiumMat = new THREE.MeshStandardMaterial({
      color: 0x070c18,
      roughness: 0.8,
      metalness: 0.2
    });
    const podium = new THREE.Mesh(podiumGeo, podiumMat);
    podium.position.set(0, -0.7, 0);
    podium.receiveShadow = true;
    boardGroup.add(podium);

    this.scene.add(boardGroup);
  }

  createBoundaryRails() {
    const railGroup = new THREE.Group();
    const totalSpan = this.gridSize * this.tileSize;
    const railHeight = 0.5;
    const railThickness = 0.25;

    // Glowing Neon Rails along the 4 borders
    const railGeo = new THREE.BoxGeometry(totalSpan + railThickness, railHeight, railThickness);
    const railMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8, // Electric cyan
      emissive: 0x0284c7,
      emissiveIntensity: 0.6,
      roughness: 0.2,
      metalness: 0.8
    });

    // Top border (North: negative Z)
    const northRail = new THREE.Mesh(railGeo, railMat);
    northRail.position.set(0, railHeight / 2, -this.halfGrid);
    northRail.castShadow = true;
    railGroup.add(northRail);

    // Bottom border (South: positive Z)
    const southRail = new THREE.Mesh(railGeo, railMat);
    southRail.position.set(0, railHeight / 2, this.halfGrid);
    southRail.castShadow = true;
    railGroup.add(southRail);

    // Left border (West: negative X)
    const sideRailGeo = new THREE.BoxGeometry(railThickness, railHeight, totalSpan + railThickness);
    const westRail = new THREE.Mesh(sideRailGeo, railMat);
    westRail.position.set(-this.halfGrid, railHeight / 2, 0);
    westRail.castShadow = true;
    railGroup.add(westRail);

    // Right border (East: positive X)
    const eastRail = new THREE.Mesh(sideRailGeo, railMat);
    eastRail.position.set(this.halfGrid, railHeight / 2, 0);
    eastRail.castShadow = true;
    railGroup.add(eastRail);

    // Corner decorative neon pillars
    const pillarGeo = new THREE.CylinderGeometry(0.28, 0.28, railHeight * 1.5, 16);
    const pillarMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x38bdf8,
      emissiveIntensity: 1.0,
      roughness: 0.1,
      metalness: 0.9
    });

    const corners = [
      [-this.halfGrid, -this.halfGrid],
      [this.halfGrid, -this.halfGrid],
      [-this.halfGrid, this.halfGrid],
      [this.halfGrid, this.halfGrid]
    ];

    corners.forEach(([cx, cz]) => {
      const pillar = new THREE.Mesh(pillarGeo, pillarMat);
      pillar.position.set(cx, (railHeight * 1.5) / 2, cz);
      pillar.castShadow = true;
      railGroup.add(pillar);
    });

    this.scene.add(railGroup);
  }

  createLighting() {
    // Soft Ambient Light for base illumination
    const ambientLight = new THREE.AmbientLight(0xdbeafe, 0.7);
    this.scene.add(ambientLight);

    // Main Directional Sun Light with Shadows
    const dirLight = new THREE.DirectionalLight(0xffffff, 1.4);
    dirLight.position.set(12, 24, 16);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    dirLight.shadow.camera.near = 1;
    dirLight.shadow.camera.far = 60;
    const shadowDist = this.halfGrid + 4;
    dirLight.shadow.camera.left = -shadowDist;
    dirLight.shadow.camera.right = shadowDist;
    dirLight.shadow.camera.top = shadowDist;
    dirLight.shadow.camera.bottom = -shadowDist;
    dirLight.shadow.bias = -0.0005;
    this.scene.add(dirLight);

    // Subtle blue fill light from the opposite side
    const fillLight = new THREE.DirectionalLight(0x38bdf8, 0.4);
    fillLight.position.set(-15, 10, -15);
    this.scene.add(fillLight);
  }

  createStarfield() {
    // Ambient floating star/dust particles for atmospheric depth
    const starCount = 300;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(starCount * 3);

    for (let i = 0; i < starCount * 3; i += 3) {
      positions[i] = (Math.random() - 0.5) * 80;
      positions[i + 1] = Math.random() * 30 + 5;
      positions[i + 2] = (Math.random() - 0.5) * 80;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const material = new THREE.PointsMaterial({
      color: 0x93c5fd,
      size: 0.25,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending
    });

    this.stars = new THREE.Points(geometry, material);
    this.scene.add(this.stars);
  }

  update(delta) {
    if (this.stars) {
      this.stars.rotation.y += delta * 0.015;
    }
  }

  gridToWorld(gridX, gridZ) {
    return {
      x: (gridX - this.gridSize / 2 + 0.5) * this.tileSize,
      z: (gridZ - this.gridSize / 2 + 0.5) * this.tileSize
    };
  }
}
