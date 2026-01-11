import * as THREE from 'three';
import Stats from 'stats.js';
import { createInitialGameState } from './types';
import { createBoatMesh, updateBoatPhysics, updateBoatMesh, getBoatBob } from './boat';
import { createCamera, createCameraState, updateCamera, handleResize, toggleViewMode } from './camera';
import { createOcean, updateOceanUV, createSkyAndLighting, createBoatSpotlight, updateBoatSpotlight } from './ocean';
import { createIslands, IslandCollider } from './islands';
import { handleIslandCollisions } from './collision';
import { InputManager } from './input';

class Game {
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private cameraState: ReturnType<typeof createCameraState>;

  private gameState = createInitialGameState();
  private inputManager: InputManager;

  private boatMesh: THREE.Group;
  private ocean: THREE.Mesh;
  private islandColliders: IslandCollider[] = [];
  private spotlight: THREE.SpotLight;
  private stats: Stats;

  private lastTime = 0;

  constructor() {
    // Setup renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    const app = document.getElementById('app');
    if (app) {
      app.appendChild(this.renderer.domElement);
    }

    // Setup scene
    this.scene = new THREE.Scene();
    createSkyAndLighting(this.scene);

    // Setup camera
    this.camera = createCamera();
    this.cameraState = createCameraState();

    // Create entities
    this.boatMesh = createBoatMesh();
    this.scene.add(this.boatMesh);

    this.ocean = createOcean();
    this.scene.add(this.ocean);

    const islands = createIslands();
    for (const island of islands) {
      this.scene.add(island.group);
      island.collider.then((collider) => {
        this.islandColliders.push(collider);
      });
    }

    // Create boat spotlight
    this.spotlight = createBoatSpotlight();
    this.scene.add(this.spotlight);
    this.scene.add(this.spotlight.target);

    // Setup stats
    this.stats = new Stats();
    this.stats.showPanel(0); // 0: fps, 1: ms, 2: mb
    document.body.appendChild(this.stats.dom);

    // Setup input
    this.inputManager = new InputManager();

    // Handle resize
    window.addEventListener('resize', () => {
      this.renderer.setSize(window.innerWidth, window.innerHeight);
      handleResize(this.camera);
    });

    // Handle view toggle
    window.addEventListener('keydown', (e) => {
      if (e.code === 'KeyV') {
        toggleViewMode(this.cameraState);
      }
    });

    // Start game loop
    this.lastTime = performance.now();
    this.loop();
  }

  private loop = (): void => {
    this.stats.begin();
    requestAnimationFrame(this.loop);

    const now = performance.now();
    const dt = Math.min((now - this.lastTime) / 1000, 0.1); // Cap dt to avoid spiral of death
    this.lastTime = now;

    this.update(dt);
    this.render();
    this.stats.end();
  };

  private update(dt: number): void {
    const input = this.inputManager.getInput();

    // Update physics
    updateBoatPhysics(this.gameState, input, dt);

    // Handle collisions
    if (this.islandColliders.length > 0) {
      handleIslandCollisions(this.gameState, this.islandColliders);
    }

    // Update visuals
    const time = performance.now() / 1000;
    updateBoatMesh(this.boatMesh, this.gameState, time);
    updateOceanUV(this.ocean, time);
    const boatY = getBoatBob(time, this.gameState.velocity);
    updateCamera(this.camera, this.cameraState, this.gameState, boatY, dt);
    updateBoatSpotlight(
      this.spotlight,
      this.gameState.position.x,
      this.gameState.position.z,
      this.gameState.heading
    );
  }

  private render(): void {
    this.renderer.render(this.scene, this.camera);
    // console.log(this.renderer.info);
  }
}

// Start game
new Game();
