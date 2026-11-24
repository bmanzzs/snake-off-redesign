import * as THREE from './node_modules/three/build/three.module.js';

const CONFIG = {
    gridSize: 20,
    cellSize: 1,
    snakeSpeed: 0.15,
    colors: {
        snake: 0x00ff88,
        apple: 0xff0044,
        floor: 0x111111,
        grid: 0x222222,
        particles: 0xffff00,
        bg: 0x050505
    }
};

let scene, camera, renderer, clock;
let snake = [], apple, score = 0;
let direction = { x: 1, z: 0 };
let nextDirection = { x: 1, z: 0 };
let moveTimer = 0;
let gameActive = true;
let particles = [];
let headLight;

class Particle {
    constructor(position) {
        const geo = new THREE.SphereGeometry(0.1, 4, 4);
        const mat = new THREE.MeshBasicMaterial({ color: CONFIG.colors.particles });
        this.mesh = new THREE.Mesh(geo, mat);
        this.mesh.position.copy(position);
        this.velocity = new THREE.Vector3(
            (Math.random() - 0.5) * 0.2,
            (Math.random()) * 0.2,
            (Math.random() - 0.5) * 0.2
        );
        this.life = 1.0;
        scene.add(this.mesh);
    }
    update(delta) {
        this.mesh.position.add(this.velocity);
        this.velocity.y -= 0.01;
        this.life -= delta * 2;
        this.mesh.scale.setScalar(this.life);
        if (this.life <= 0) {
            scene.remove(this.mesh);
            return false;
        }
        return true;
    }
}

function init() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(CONFIG.colors.bg);
    scene.fog = new THREE.FogExp2(CONFIG.colors.bg, 0.02);

    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(CONFIG.gridSize / 2, 12, CONFIG.gridSize * 1.3);
    camera.lookAt(CONFIG.gridSize / 2, 0, CONFIG.gridSize / 2);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    document.body.appendChild(renderer.domElement);

    const ambientLight = new THREE.AmbientLight(0x404040, 1);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xffffff, 0.5);
    sunLight.position.set(10, 20, 10);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 1024;
    sunLight.shadow.mapSize.height = 1024;
    scene.add(sunLight);

    headLight = new THREE.PointLight(CONFIG.colors.snake, 2, 10);
    headLight.castShadow = true;
    scene.add(headLight);

    const floorGeo = new THREE.PlaneGeometry(CONFIG.gridSize * 2, CONFIG.gridSize * 2);
    const floorMat = new THREE.MeshStandardMaterial({ 
        color: CONFIG.colors.floor, 
        roughness: 0.1, 
        metalness: 0.1 
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(CONFIG.gridSize / 2 - 0.5, -0.5, CONFIG.gridSize / 2 - 0.5);
    floor.receiveShadow = true;
    scene.add(floor);

    const gridHelper = new THREE.GridHelper(CONFIG.gridSize, CONFIG.gridSize, CONFIG.colors.grid, CONFIG.colors.grid);
    gridHelper.position.set(CONFIG.gridSize / 2 - 0.5, -0.49, CONFIG.gridSize / 2 - 0.5);
    scene.add(gridHelper);

    clock = new THREE.Clock();
    window.addEventListener('resize', onWindowResize);
    window.addEventListener('keydown', handleInput);
    document.getElementById('restart-btn').addEventListener('click', restartGame);

    setupGame();
    animate();
}

function setupGame() {
    snake.forEach(seg => scene.remove(seg.mesh));
    snake = [];
    score = 0;
    direction = { x: 1, z: 0 };
    nextDirection = { x: 1, z: 0 };
    gameActive = true;
    document.getElementById('game-over').style.display = 'none';
    document.getElementById('score').innerText = '0';

    for (let i = 0; i < 3; i++) {
        addSnakeSegment(5 - i, 5);
    }

    spawnApple();
}

function addSnakeSegment(x, z) {
    const geo = new THREE.BoxGeometry(0.9, 0.9, 0.9);
    const mat = new THREE.MeshPhongMaterial({ 
        color: CONFIG.colors.snake, 
        shininess: 100, 
        emissive: CONFIG.colors.snake, 
        emissiveIntensity: 0.2 
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, 0, z);
    mesh.castShadow = true;
    scene.add(mesh);
    snake.push({
        mesh: mesh,
        targetPos: new THREE.Vector3(x, 0, z),
        currentPos: new THREE.Vector3(x, 0, z)
    });
}

function spawnApple() {
    if (apple) scene.remove(apple);
    const geo = new THREE.SphereGeometry(0.4, 16, 16);
    const mat = new THREE.MeshPhongMaterial({ 
        color: CONFIG.colors.apple, 
        shininess: 100, 
        emissive: CONFIG.colors.apple, 
        emissiveIntensity: 0.5 
    });
    apple = new THREE.Mesh(geo, mat);
    
    const x = Math.floor(Math.random() * CONFIG.gridSize);
    const z = Math.floor(Math.random() * CONFIG.gridSize);
    apple.position.set(x, 0, z);
    apple.castShadow = true;
    scene.add(apple);

    // Add a little glow light to the apple
    const appleLight = new THREE.PointLight(CONFIG.colors.apple, 1, 3);
    appleLight.position.set(0, 0, 0);
    apple.add(appleLight);
}

function createBurst(position) {
    for (let i = 0; i < 30; i++) {
        particles.push(new Particle(position));
    }
}

function handleInput(e) {
    switch(e.key) {
        case 'ArrowUp':    case 'w': case 'W':
            if (direction.z !== 1) nextDirection = { x: 0, z: -1 };
            break;
        case 'ArrowDown':  case 's': case 'S':
            if (direction.z !== -1) nextDirection = { x: 0, z: 1 };
            break;
        case 'ArrowLeft':  case 'a': case 'A':
            if (direction.x !== 1) nextDirection = { x: -1, z: 0 };
            break;
        case 'ArrowRight': case 'd': case 'D':
            if (direction.x !== -1) nextDirection = { x: 1, z: 0 };
            break;
    }
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function restartGame() {
    setupGame();
}

function update() {
    const delta = clock.getDelta();
    
    if (gameActive) {
        moveTimer += delta;
        if (moveTimer >= CONFIG.snakeSpeed) {
            moveTimer = 0;
            direction = nextDirection;

            const head = snake[0];
            const newX = head.targetPos.x + direction.x;
            const newZ = head.targetPos.z + direction.z;

            if (newX < 0 || newX >= CONFIG.gridSize || newZ < 0 || newZ >= CONFIG.gridSize) {
                gameOver();
                return;
            }

            for (let i = 1; i < snake.length; i++) {
                if (snake[i].targetPos.x === newX && snake[i].targetPos.z === newZ) {
                    gameOver();
                    return;
                }
            }

            for (let i = snake.length - 1; i > 0; i--) {
                snake[i].targetPos.copy(snake[i-1].targetPos);
            }

            head.targetPos.set(newX, 0, newZ);

            if (newX === apple.position.x && newZ === apple.position.z) {
                score++;
                document.getElementById('score').innerText = score;
                createBurst(apple.position.clone());
                const lastSeg = snake[snake.length-1];
                addSnakeSegment(lastSeg.targetPos.x, lastSeg.targetPos.z);
                spawnApple();
            }
        }
    }

    snake.forEach((seg) => {
        seg.currentPos.lerp(seg.targetPos, 0.2);
        seg.mesh.position.copy(seg.currentPos);
    });

    particles = particles.filter(p => p.update(delta));
}

function gameOver() {
    gameActive = false;
    document.getElementById('game-over').style.display = 'block';
    document.getElementById('final-score').innerText = score;
}

function animate() {
    requestAnimationFrame(animate);
    update();
    
    if (snake.length > 0) {
        headLight.position.copy(snake[0].currentPos);
    }
    
    if (apple) {
        const time = Date.now() * 0.005;
        apple.position.y = Math.sin(time) * 0.2;
        apple.rotation.y += 0.05;
    }

    renderer.render(scene, camera);
}

init();
