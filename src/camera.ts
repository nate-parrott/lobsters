import * as THREE from 'three';
import { GameState } from './types';

const CAMERA_HEIGHT = 18;
const CAMERA_DISTANCE = 5;  // Small offset behind for ~80% top-down
const CAMERA_LOOK_AHEAD = 8;
const CAMERA_SMOOTHING = 0.05;

interface CameraState {
  currentPosition: THREE.Vector3;
  currentLookAt: THREE.Vector3;
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
  };
}

export function updateCamera(
  camera: THREE.PerspectiveCamera,
  cameraState: CameraState,
  gameState: GameState,
  dt: number
): void {
  // Calculate target position behind boat (Civ 4 style top-down offset)
  const behindX = -Math.sin(gameState.heading) * CAMERA_DISTANCE;
  const behindZ = -Math.cos(gameState.heading) * CAMERA_DISTANCE;

  const targetPosition = new THREE.Vector3(
    gameState.position.x + behindX,
    CAMERA_HEIGHT,
    gameState.position.z + behindZ
  );

  // Look ahead of the boat
  const aheadX = Math.sin(gameState.heading) * CAMERA_LOOK_AHEAD;
  const aheadZ = Math.cos(gameState.heading) * CAMERA_LOOK_AHEAD;

  const targetLookAt = new THREE.Vector3(
    gameState.position.x + aheadX,
    0,
    gameState.position.z + aheadZ
  );

  // Smooth interpolation
  const smoothFactor = 1 - Math.pow(1 - CAMERA_SMOOTHING, dt * 60);

  cameraState.currentPosition.lerp(targetPosition, smoothFactor);
  cameraState.currentLookAt.lerp(targetLookAt, smoothFactor);

  camera.position.copy(cameraState.currentPosition);
  camera.lookAt(cameraState.currentLookAt);
}

export function handleResize(camera: THREE.PerspectiveCamera): void {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
}
