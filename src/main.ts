import * as THREE from 'three';
import { createInitialGameState } from './types';
import { createBoatMesh, updateBoatPhysics, updateBoatMesh } from './boat';
import { createCamera, createCameraState, updateCamera, handleResize } from './camera';
import { createOcean, updateOceanUV, createSkyAndLighting, createBoatSpotlight, updateBoatSpotlight } from './ocean';
import { createIsland, IslandCollider } from './islands';
import { handleIslandCollision } from './collision';
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
  private islandCollider: IslandCollider | null = null;
  private spotlight: THREE.SpotLight;

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

    const island = createIsland();
    this.scene.add(island.group);
    island.collider.then((collider) => {
      this.islandCollider = collider;
    });

    // Create boat spotlight
    this.spotlight = createBoatSpotlight();
    this.scene.add(this.spotlight);
    this.scene.add(this.spotlight.target);

    // Setup input
    this.inputManager = new InputManager();

    // Handle resize
    window.addEventListener('resize', () => {
      this.renderer.setSize(window.innerWidth, window.innerHeight);
      handleResize(this.camera);
    });

    // Start game loop
    this.lastTime = performance.now();
    this.loop();
  }

  private loop = (): void => {
    requestAnimationFrame(this.loop);

    const now = performance.now();
    const dt = Math.min((now - this.lastTime) / 1000, 0.1); // Cap dt to avoid spiral of death
    this.lastTime = now;

    this.update(dt);
    this.render();
  };

  private update(dt: number): void {
    const input = this.inputManager.getInput();

    // Update physics
    updateBoatPhysics(this.gameState, input, dt);

    // Handle collisions
    if (this.islandCollider) {
      handleIslandCollision(this.gameState, this.islandCollider);
    }

    // Update visuals
    const time = performance.now() / 1000;
    updateBoatMesh(this.boatMesh, this.gameState, time);
    updateOceanUV(this.ocean, time);
    updateCamera(this.camera, this.cameraState, this.gameState, dt);
    updateBoatSpotlight(
      this.spotlight,
      this.gameState.position.x,
      this.gameState.position.z,
      this.gameState.heading
    );
  }

  private render(): void {
    this.renderer.render(this.scene, this.camera);
  }
}

// Start game
new Game();
