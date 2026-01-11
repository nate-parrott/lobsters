import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { PersistentState } from './types';

// Trap positions on boat (easy to tweak)
const TRAP_CENTER_Z = -1.0;      // behind boat center (local Z)
const TRAP_X_SPACING = 0.5;     // spacing between traps
const TRAP_Z_SPACING = 1.5;
const TRAP_Y_OFFSET = 0.3;       // height above deck

const TRAP_COUNT = 8;

interface TrapLocalPos {
  x: number;
  z: number;
}

// Get local positions for traps on boat (2 rows of 4)
function getTrapLocalPositions(): TrapLocalPos[] {
  return [
    // First row (closest to cab)
    { x: -1.5 * TRAP_X_SPACING, z: TRAP_CENTER_Z },
    { x: -0.5 * TRAP_X_SPACING, z: TRAP_CENTER_Z },
    { x: 0.5 * TRAP_X_SPACING, z: TRAP_CENTER_Z },
    { x: 1.5 * TRAP_X_SPACING, z: TRAP_CENTER_Z },
    // Second row (behind first row)
    { x: -1.5 * TRAP_X_SPACING, z: TRAP_CENTER_Z - TRAP_Z_SPACING },
    { x: -0.5 * TRAP_X_SPACING, z: TRAP_CENTER_Z - TRAP_Z_SPACING },
    { x: 0.5 * TRAP_X_SPACING, z: TRAP_CENTER_Z - TRAP_Z_SPACING },
    { x: 1.5 * TRAP_X_SPACING, z: TRAP_CENTER_Z - TRAP_Z_SPACING },
  ];
}

interface TrapMeshSet {
  trap: THREE.Group;
  lobsters: THREE.Group;
  buoy: THREE.Group;
}

export class TrapManager {
  private scene: THREE.Scene;
  private boatMesh: THREE.Group;
  private trapTemplate: THREE.Group | null = null;
  private lobstersTemplate: THREE.Group | null = null;
  private buoyTemplate: THREE.Group | null = null;
  private meshes: TrapMeshSet[] = [];
  private loaded = false;

  constructor(scene: THREE.Scene, boatMesh: THREE.Group) {
    this.scene = scene;
    this.boatMesh = boatMesh;
    this.loadAssets();
  }

  private loadAssets(): void {
    const loader = new GLTFLoader();
    let loadedCount = 0;
    const onLoaded = () => {
      loadedCount++;
      if (loadedCount === 3) {
        this.createMeshes();
        this.loaded = true;
      }
    };

    loader.load(`${import.meta.env.BASE_URL}trap.glb`, (gltf) => {
      this.trapTemplate = gltf.scene;
      this.trapTemplate.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });
      onLoaded();
    });

    loader.load(`${import.meta.env.BASE_URL}lobsters-in-trap.glb`, (gltf) => {
      this.lobstersTemplate = gltf.scene;
      this.lobstersTemplate.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });
      onLoaded();
    });

    loader.load(`${import.meta.env.BASE_URL}buoy.glb`, (gltf) => {
      this.buoyTemplate = gltf.scene;
      this.buoyTemplate.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });
      onLoaded();
    });
  }

  private createMeshes(): void {
    if (!this.trapTemplate || !this.lobstersTemplate || !this.buoyTemplate) return;

    const localPositions = getTrapLocalPositions();

    for (let i = 0; i < TRAP_COUNT; i++) {
      const trap = this.trapTemplate.clone();
      const lobsters = this.lobstersTemplate.clone();
      const buoy = this.buoyTemplate.clone();
      buoy.scale.set(1.5, 1.5, 1.5);

      // Traps and lobsters are children of boat (local coords)
      const pos = localPositions[i];
      trap.position.set(pos.x, TRAP_Y_OFFSET, pos.z);
      lobsters.position.set(pos.x, TRAP_Y_OFFSET, pos.z);
      this.boatMesh.add(trap);
      this.boatMesh.add(lobsters);

      // Buoys are in world space (scene children)
      this.scene.add(buoy);

      this.meshes.push({ trap, lobsters, buoy });
    }
  }

  update(state: PersistentState, time: number): void {
    if (!this.loaded) return;

    for (let i = 0; i < TRAP_COUNT; i++) {
      const trapState = state.traps[i];
      const meshSet = this.meshes[i];
      if (!meshSet) continue;

      if (trapState.inWater && trapState.position) {
        // Trap is in water - show buoy, hide trap/lobsters
        meshSet.trap.visible = false;
        meshSet.lobsters.visible = false;
        meshSet.buoy.visible = true;

        // Animate buoy with phase offset per trap
        const phase = i * 1.7;
        const bobY = Math.sin(time * 2 + phase) * 0.1 - 0.08;
        const rotZ = Math.sin(time * 1.5 + phase * 0.8) * (20 * Math.PI / 180);

        meshSet.buoy.position.set(trapState.position.x, bobY, trapState.position.z);
        meshSet.buoy.rotation.set(0, 0, rotZ);
      } else {
        // Trap is on boat - show trap (and lobsters if any), hide buoy
        // Position is already set in local boat coords, just toggle visibility
        meshSet.buoy.visible = false;
        meshSet.trap.visible = true;
        meshSet.lobsters.visible = trapState.lobsterCount > 0;
      }
    }
  }
}
