import * as THREE from 'three';
import { GameState } from './types';

const CAMERA_HEIGHT = 18;
const CAMERA_DISTANCE = 5;  // Small offset behind for ~80% top-down
const CAMERA_LOOK_AHEAD = 8;
const CAMERA_SMOOTHING = 0.05;

// Cab view constants
const CAB_HEIGHT = 2.5;
const CAB_FORWARD_OFFSET = -1.0; // Slightly back from center
const CAB_LOOK_DISTANCE = 20;

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

  if (cameraState.viewMode === 'cab') {
    // Cab view: inside the boat looking forward
    const forwardX = Math.sin(gameState.heading);
    const forwardZ = Math.cos(gameState.heading);

    targetPosition = new THREE.Vector3(
      gameState.position.x + forwardX * CAB_FORWARD_OFFSET,
      boatY + CAB_HEIGHT,
      gameState.position.z + forwardZ * CAB_FORWARD_OFFSET
    );

    targetLookAt = new THREE.Vector3(
      gameState.position.x + forwardX * CAB_LOOK_DISTANCE,
      boatY + 1,
      gameState.position.z + forwardZ * CAB_LOOK_DISTANCE
    );
  } else {
    // Overhead view: behind and above the boat
    const behindX = -Math.sin(gameState.heading) * CAMERA_DISTANCE;
    const behindZ = -Math.cos(gameState.heading) * CAMERA_DISTANCE;

    targetPosition = new THREE.Vector3(
      gameState.position.x + behindX,
      CAMERA_HEIGHT,
      gameState.position.z + behindZ
    );

    const aheadX = Math.sin(gameState.heading) * CAMERA_LOOK_AHEAD;
    const aheadZ = Math.cos(gameState.heading) * CAMERA_LOOK_AHEAD;

    targetLookAt = new THREE.Vector3(
      gameState.position.x + aheadX,
      0,
      gameState.position.z + aheadZ
    );
  }

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
