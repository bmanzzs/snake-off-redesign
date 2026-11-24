import * as THREE from 'three';
import { Arena } from './arena.js';
import { Snake } from './snake.js';
import { Apple } from './apple.js';
import { ParticleSystem } from './particles.js';
import { sound } from './audio.js';

class Game {
  constructor() {
    // DOM Elements
    this.container = document.getElementById('game-container');
    this.canvas = document.getElementById('three-canvas');
    this.scoreValEl = document.getElementById('score-val');
    this.highScoreValEl = document.getElementById('high-score-val');
    this.lengthValEl = document.getElementById('length-val');
    this.gameOverScreen = document.getElementById('game-over-screen');
    this.finalScoreEl = document.getElementById('final-score');
    this.bestScoreEl = document.getElementById('best-score');
    this.restartBtn = document.getElementById('restart-btn');

    // Game Config
    this.gridSize = 20;
    this.tileSize = 1.0;
    this.state = 'PLAYING'; // 'PLAYING' | 'GAME_OVER'

    // Score State
    this.score = 0;
    this.highScore = parseInt(localStorage.getItem('snake3d_high_score') || '0', 10);
    if (this.highScoreValEl) this.highScoreValEl.textContent = this.highScore;

    // Camera shake effect
    this.cameraBasePos = new THREE.Vector3(0, 21, 19);
    this.cameraTarget = new THREE.Vector3(0, 0, 1.5);
    this.shakeIntensity = 0;

    this.initScene();
    this.initArena();
    this.initParticles();
    this.initSnake();
    this.initApple();
    this.initEvents();

    this.animate = this.animate.bind(this);
    requestAnimationFrame(this.animate);

    console.log('3D Snake with score, audio, and game-over loop initialized successfully.');
  }

  initScene() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x080a14);
    this.scene.fog = new THREE.FogExp2(0x080a14, 0.022);

    const aspect = window.innerWidth / window.innerHeight;
    this.camera = new THREE.PerspectiveCamera(45, aspect, 0.1, 100);
    this.camera.position.copy(this.cameraBasePos);
    this.camera.lookAt(this.cameraTarget);

    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    this.clock = new THREE.Clock();
  }

  initArena() {
    this.arena = new Arena(this.scene, this.gridSize, this.tileSize);
  }

  initParticles() {
    this.particles = new ParticleSystem(this.scene);
  }

  initSnake() {
    this.snake = new Snake(this.scene, this.arena, { speed: 4.8 });
  }

  initApple() {
    this.apple = new Apple(this.scene, this.arena);
    this.apple.spawn(this.snake.getAllGridCoords());
    this.updateHUD();
  }

  onEatApple(headX, headZ) {
    if (this.state !== 'PLAYING') return false;

    const applePos = this.apple.getGridPos();
    if (headX === applePos.x && headZ === applePos.z) {
      // 1. Audio chime
      sound.playEat();

      // 2. Particle burst FX at apple position
      const worldPos = this.apple.getPosition();
      this.particles.burst(worldPos.x, worldPos.y, worldPos.z, 42);

      // 3. Subtle camera impulse
      this.shakeIntensity = 0.18;

      // 4. Score increment & persistence
      this.score += 100;
      if (this.score > this.highScore) {
        this.highScore = this.score;
        localStorage.setItem('snake3d_high_score', this.highScore.toString());
      }
      this.updateHUD(true);

      // 5. Spawn new apple
      const snakeCoords = this.snake.getAllGridCoords();
      this.apple.spawn(snakeCoords);

      return true;
    }
    return false;
  }

  onGameOver(reason) {
    if (this.state === 'GAME_OVER') return;
    this.state = 'GAME_OVER';

    // Sound and camera crash impact
    sound.playCrash();
    this.shakeIntensity = 0.55;

    // Show Game Over modal with score summary
    if (this.finalScoreEl) this.finalScoreEl.textContent = this.score;
    if (this.bestScoreEl) this.bestScoreEl.textContent = this.highScore;
    if (this.gameOverScreen) {
      this.gameOverScreen.classList.add('active');
    }

    console.log(`Game Over triggered! Reason: ${reason}, Score: ${this.score}`);
  }

  restart() {
    if (this.state !== 'GAME_OVER') return;

    // Reset game state
    this.state = 'PLAYING';
    this.score = 0;
    this.shakeIntensity = 0;

    // Reset Snake
    this.snake.initSnake();

    // Reset Apple
    this.apple.spawn(this.snake.getAllGridCoords());

    // Clear burst particles
    this.particles.clear();

    // Hide Game Over Modal
    if (this.gameOverScreen) {
      this.gameOverScreen.classList.remove('active');
    }

    this.updateHUD();
    console.log('Game restarted successfully.');
  }

  updateHUD(bumpScore = false) {
    if (this.scoreValEl) {
      this.scoreValEl.textContent = this.score;
      if (bumpScore) {
        this.scoreValEl.classList.add('bump');
        setTimeout(() => this.scoreValEl.classList.remove('bump'), 180);
      }
    }
    if (this.highScoreValEl) {
      this.highScoreValEl.textContent = this.highScore;
    }
    if (this.lengthValEl && this.snake) {
      this.lengthValEl.textContent = this.snake.segments.length;
    }
  }

  initEvents() {
    // Window Resize
    window.addEventListener('resize', () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      this.camera.aspect = width / height;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(width, height);
    });

    // Restart button click
    if (this.restartBtn) {
      this.restartBtn.addEventListener('click', () => {
        this.restart();
      });
    }

    // Keyboard shortcuts for restart
    window.addEventListener('keydown', (e) => {
      if (this.state === 'GAME_OVER') {
        if (e.code === 'Space' || e.code === 'Enter' || e.code === 'KeyR') {
          e.preventDefault();
          this.restart();
        }
      }
    });
  }

  animate() {
    requestAnimationFrame(this.animate);
    const delta = this.clock.getDelta();

    // Update Arena (starfield rotation)
    if (this.arena) {
      this.arena.update(delta);
    }

    // Update Apple
    if (this.apple) {
      this.apple.update(delta);
    }

    // Update Particles
    if (this.particles) {
      this.particles.update(delta);
    }

    // Update Snake
    if (this.snake && this.state === 'PLAYING') {
      this.snake.update(
        delta,
        (headX, headZ) => this.onEatApple(headX, headZ),
        (reason) => this.onGameOver(reason)
      );
    }

    // Camera shake damping
    if (this.shakeIntensity > 0.001) {
      const offsetX = (Math.random() - 0.5) * this.shakeIntensity;
      const offsetY = (Math.random() - 0.5) * this.shakeIntensity;
      const offsetZ = (Math.random() - 0.5) * this.shakeIntensity;
      this.camera.position.set(
        this.cameraBasePos.x + offsetX,
        this.cameraBasePos.y + offsetY,
        this.cameraBasePos.z + offsetZ
      );
      this.shakeIntensity *= 0.88;
    } else {
      this.camera.position.copy(this.cameraBasePos);
    }

    this.renderer.render(this.scene, this.camera);
  }
}

// Start Game instance when DOM is ready
window.addEventListener('DOMContentLoaded', () => {
  window.game = new Game();
});
