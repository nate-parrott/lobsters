import * as THREE from 'three';
import { GameState } from './types';
import { inverseLerp, lerp, smoothstep } from 'three/src/math/MathUtils.js';
import { MAX_SPEED } from './boat';

const CAMERA_HEIGHT = 20;
const CAMERA_DISTANCE = 4  // Small offset behind for ~80% top-down
const CAMERA_LOOK_AHEAD = 10;
const CAMERA_SMOOTHING = 0.05;

// Cab view constants
// const CAB_HEIGHT = 2.5;
// const CAB_FORWARD_OFFSET = -3; // Slightly back from center
// const CAB_LOOK_DISTANCE = 20;
// const CAB_VIEW_SMOOTHING = 0.05;

export type ViewMode = 'overhead' | 'cab';

interface CameraState {
  currentPosition: THREE.Vector3;
  currentLookAt: THREE.Vector3;
  viewMode: ViewMode;
}

export function createCamera(): THREE.PerspectiveCamera {
  const camera = new THREE.PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );
  return camera;
}

export function createCameraState(): CameraState {
  return {
    currentPosition: new THREE.Vector3(0, CAMERA_HEIGHT, -CAMERA_DISTANCE),
    currentLookAt: new THREE.Vector3(0, 0, 0),
    viewMode: 'overhead',
  };
}

export function toggleViewMode(cameraState: CameraState): void {
  cameraState.viewMode = cameraState.viewMode === 'overhead' ? 'cab' : 'overhead';
}

export function updateCamera(
  camera: THREE.PerspectiveCamera,
  cameraState: CameraState,
  gameState: GameState,
  boatY: number,
  dt: number
): void {
  let targetPosition: THREE.Vector3;
  let targetLookAt: THREE.Vector3;

  const speed = Math.sqrt(gameState.velocity.x ** 2 + gameState.velocity.z ** 2);
  const lookFwd = inverseLerp(0, MAX_SPEED * 0.7, speed);

  const camDist = lerp(CAMERA_DISTANCE, 8, lookFwd);
  const camHeight = lerp(CAMERA_HEIGHT, CAMERA_HEIGHT * 0.4, lookFwd);
  const lookAhead = lerp(CAMERA_LOOK_AHEAD, CAMERA_LOOK_AHEAD + 10, lookFwd);

  // Overhead view: behind and above the boat
  const behindX = -Math.sin(gameState.heading) * camDist;
  const behindZ = -Math.cos(gameState.heading) * camDist;

  targetPosition = new THREE.Vector3(
    gameState.position.x + behindX,
    camHeight,
    gameState.position.z + behindZ
  );

  const aheadX = Math.sin(gameState.heading) * lookAhead;
  const aheadZ = Math.cos(gameState.heading) * lookAhead;

  targetLookAt = new THREE.Vector3(
    gameState.position.x + aheadX,
    0,
    gameState.position.z + aheadZ
  );

  // Smooth interpolation
  const smoothingFactor = CAMERA_SMOOTHING;
  const smoothFactor = 1 - Math.pow(1 - smoothingFactor, dt * 60);

  cameraState.currentPosition.lerp(targetPosition, smoothFactor);
  cameraState.currentLookAt.lerp(targetLookAt, smoothFactor);

  camera.position.copy(cameraState.currentPosition);
  camera.lookAt(cameraState.currentLookAt);
}

export function handleResize(camera: THREE.PerspectiveCamera): void {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
}
