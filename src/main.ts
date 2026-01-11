import * as THREE from 'three';
import Stats from 'stats.js';
import { createInitialGameState, PersistentState, Vec2 } from './types';
import { createBoatMesh, updateBoatPhysics, updateBoatMesh, getBoatBob } from './boat';
import { createCamera, createCameraState, updateCamera, handleResize, toggleViewMode } from './camera';
import { createOcean, updateOceanUV, createSkyAndLighting, updateSunPosition, createBoatSpotlight, updateBoatSpotlight } from './ocean';
import { createIslands, IslandCollider } from './islands';
import { handleIslandCollisions } from './collision';
import { InputManager } from './input';
import { GameUI, ReelButtonMode } from './ui';
import { loadPersistentState, savePersistentState } from './persistence';
import { loadPortZone, isAtPort } from './port';
import { TrapManager } from './traps';

const PICKUP_RADIUS = 4;
const TRAP_MATURE_TIME = 10 * 60 * 1000; // 10 minutes in ms
const MAX_LOBSTERS = 6;
const MAX_RENDER_DIMENSION = 1300;
const TARGET_FPS = 45;
const FRAME_INTERVAL = 1000 / TARGET_FPS;

function getClampedSize(width: number, height: number): { width: number; height: number } {
  const maxDim = Math.max(width, height);
  if (maxDim <= MAX_RENDER_DIMENSION) {
    return { width, height };
  }
  const scale = MAX_RENDER_DIMENSION / maxDim;
  return { width: Math.floor(width * scale), height: Math.floor(height * scale) };
}

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
  private sun: THREE.DirectionalLight;
  private stats: Stats;
  private ui: GameUI;
  private trapManager: TrapManager;
  private persistentState: PersistentState;
  private portPolygon: Vec2[] = [];
  private atPort = false;
  private nearTrapIndex: number | null = null;

  private lastTime = 0;
  private lastFrameTime = 0;

  constructor() {
    // Setup renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    const initialSize = getClampedSize(window.innerWidth, window.innerHeight);
    this.renderer.setSize(initialSize.width, initialSize.height, false);
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    const app = document.getElementById('app');
    if (app) {
      app.appendChild(this.renderer.domElement);
    }

    // Setup scene
    this.scene = new THREE.Scene();
    this.sun = createSkyAndLighting(this.scene);

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

    // Load persistent state
    this.persistentState = loadPersistentState();

    // Load port zone
    loadPortZone().then((polygon) => {
      this.portPolygon = polygon;
    });

    // Setup trap manager
    this.trapManager = new TrapManager(this.scene, this.boatMesh);

    // Setup UI
    this.ui = new GameUI({
      onToggleView: () => toggleViewMode(this.cameraState),
      onReelToggle: () => this.handleReelToggle(),
    });

    // Update initial lobster count
    this.updateLobsterCount();

    // Setup input
    this.inputManager = new InputManager(this.ui.getJoystickZone());

    // Handle resize
    window.addEventListener('resize', () => {
      const size = getClampedSize(window.innerWidth, window.innerHeight);
      this.renderer.setSize(size.width, size.height, false);
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
    requestAnimationFrame(this.loop);

    const now = performance.now();
    const elapsed = now - this.lastFrameTime;
    if (elapsed < FRAME_INTERVAL) {
      return;
    }
    this.lastFrameTime = now - (elapsed % FRAME_INTERVAL);

    this.stats.begin();
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
    updateSunPosition(this.sun, this.gameState.position.x, this.gameState.position.z);

    // Update trap visuals
    this.trapManager.update(this.persistentState, time);

    // Update port/trap state for UI
    this.updateTrapState();
  }

  private updateTrapState(): void {
    // Check if at port
    this.atPort = this.portPolygon.length > 0 && isAtPort(this.gameState.position, this.portPolygon);

    // Find nearest trap in water
    this.nearTrapIndex = null;
    let nearestDist = PICKUP_RADIUS;

    for (let i = 0; i < this.persistentState.traps.length; i++) {
      const trap = this.persistentState.traps[i];
      if (trap.inWater && trap.position) {
        const dx = trap.position.x - this.gameState.position.x;
        const dz = trap.position.z - this.gameState.position.z;
        const dist = Math.sqrt(dx * dx + dz * dz);
        if (dist < nearestDist) {
          nearestDist = dist;
          this.nearTrapIndex = i;
        }
      }
    }

    // Update UI button mode
    const hasTrapsOnBoat = this.persistentState.traps.some((t) => !t.inWater);
    const hasLobstersOnBoat = this.persistentState.traps.some((t) => !t.inWater && t.lobsterCount > 0);

    let mode: ReelButtonMode;
    if (this.atPort && hasLobstersOnBoat) {
      mode = 'deposit';
    } else if (this.nearTrapIndex !== null) {
      mode = 'pickup';
    } else if (hasTrapsOnBoat) {
      mode = 'drop';
    } else {
      mode = 'disabled';
    }
    this.ui.setReelButtonMode(mode);
  }

  private handleReelToggle(): void {
    const hasLobstersOnBoat = this.persistentState.traps.some((t) => !t.inWater && t.lobsterCount > 0);

    if (this.atPort && hasLobstersOnBoat) {
      this.depositLobsters();
    } else if (this.nearTrapIndex !== null) {
      this.pickupTrap(this.nearTrapIndex);
    } else {
      this.dropTrap();
    }
  }

  private dropTrap(): void {
    // Find first trap on boat
    const trapIndex = this.persistentState.traps.findIndex((t) => !t.inWater);
    if (trapIndex === -1) return;

    // Drop to the left and forward of the boat
    // Forward is (sin(heading), cos(heading)), left is (-cos(heading), sin(heading))
    const leftOffset = 3;
    const forwardOffset = 2;
    const forwardX = Math.sin(this.gameState.heading);
    const forwardZ = Math.cos(this.gameState.heading);
    const leftX = -Math.cos(this.gameState.heading);
    const leftZ = Math.sin(this.gameState.heading);
    const dropX = this.gameState.position.x + leftX * leftOffset + forwardX * forwardOffset;
    const dropZ = this.gameState.position.z + leftZ * leftOffset + forwardZ * forwardOffset;

    const trap = this.persistentState.traps[trapIndex];
    trap.inWater = true;
    trap.position = { x: dropX, z: dropZ };
    trap.droppedAt = Date.now();
    trap.lobsterCount = 0;

    savePersistentState(this.persistentState);
    this.ui.showOverlay('Dropped trap; return in 10m');
  }

  private pickupTrap(index: number): void {
    const trap = this.persistentState.traps[index];
    if (!trap.inWater) return;

    // Calculate lobster count based on time elapsed
    const elapsed = Date.now() - (trap.droppedAt || 0);
    let lobsterCount: number;

    if (elapsed >= TRAP_MATURE_TIME) {
      lobsterCount = Math.floor(Math.random() * (MAX_LOBSTERS + 1));
    } else {
      const fraction = elapsed / TRAP_MATURE_TIME;
      const maxForTime = Math.floor(MAX_LOBSTERS * fraction);
      lobsterCount = Math.floor(Math.random() * (maxForTime + 1));
    }

    trap.inWater = false;
    trap.position = undefined;
    trap.droppedAt = undefined;
    trap.lobsterCount = lobsterCount;

    savePersistentState(this.persistentState);
    this.updateLobsterCount();

    if (lobsterCount > 0) {
      this.ui.showOverlay(`Caught ${lobsterCount} lobster${lobsterCount > 1 ? 's' : ''}!`);
    } else {
      this.ui.showOverlay('Trap was empty');
    }
  }

  private depositLobsters(): void {
    let totalDeposited = 0;

    for (const trap of this.persistentState.traps) {
      if (!trap.inWater && trap.lobsterCount > 0) {
        totalDeposited += trap.lobsterCount;
        trap.lobsterCount = 0;
      }
    }

    if (totalDeposited > 0) {
      this.persistentState.depositedLobsters += totalDeposited;
      savePersistentState(this.persistentState);
      this.updateLobsterCount();
      this.ui.showOverlay(`Deposited ${totalDeposited} lobster${totalDeposited > 1 ? 's' : ''}!`);
    }
  }

  private updateLobsterCount(): void {
    const onBoat = this.persistentState.traps
      .filter((t) => !t.inWater)
      .reduce((sum, t) => sum + t.lobsterCount, 0);
    const total = this.persistentState.depositedLobsters + onBoat;
    this.ui.setLobsterCount(total);
  }

  private render(): void {
    this.renderer.render(this.scene, this.camera);
    // console.log(this.renderer.info);
  }
}

// Start game
new Game();
