import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { GameState, InputState, Vec2 } from './types';

const ACCELERATION = 8;
const MAX_SPEED = 12;
const DRAG = 0.98;
const TURN_SPEED = 2.5;
const TURN_DRAG = 0.92;

export function createBoatMesh(): THREE.Group {
  const group = new THREE.Group();

  const loader = new GLTFLoader();
  loader.load('/boat.glb', (gltf) => {
    const model = gltf.scene;
    model.rotation.y = Math.PI; // Flip 180 degrees
    model.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
    group.add(model);
  });

  return group;
}

export function updateBoatPhysics(
  state: GameState,
  input: InputState,
  dt: number
): void {
  // Apply turning
  state.angularVelocity += input.turn * TURN_SPEED * dt;
  state.angularVelocity *= TURN_DRAG;
  state.heading += state.angularVelocity * dt;

  // Calculate forward direction
  const forwardX = Math.sin(state.heading);
  const forwardZ = Math.cos(state.heading);

  // Apply thrust in forward direction
  const thrust = input.forward * ACCELERATION * dt;
  state.velocity.x += forwardX * thrust;
  state.velocity.z += forwardZ * thrust;

  // Clamp speed
  const speed = Math.sqrt(state.velocity.x ** 2 + state.velocity.z ** 2);
  if (speed > MAX_SPEED) {
    state.velocity.x = (state.velocity.x / speed) * MAX_SPEED;
    state.velocity.z = (state.velocity.z / speed) * MAX_SPEED;
  }

  // Apply drag
  state.velocity.x *= DRAG;
  state.velocity.z *= DRAG;

  // Update position
  state.position.x += state.velocity.x * dt;
  state.position.z += state.velocity.z * dt;
}

export function getBoatBob(time: number, velocity: Vec2): number {
  const speed = Math.sqrt(velocity.x ** 2 + velocity.z ** 2);
  const baseWave = Math.sin(time * 2) * 0.15;
  const speedWave = Math.sin(time * 4) * 0.05 * Math.min(speed / MAX_SPEED, 1);
  return 0.3 + baseWave + speedWave; // Lift boat slightly higher
}

export function getBoatRoll(time: number, angularVelocity: number): number {
  const baseRoll = Math.sin(time * 1.5) * 0.03;
  const turnRoll = -angularVelocity * 0.3;
  return baseRoll + turnRoll;
}

export function getBoatPitch(velocity: Vec2): number {
  const speed = Math.sqrt(velocity.x ** 2 + velocity.z ** 2);
  return -speed * 0.02;
}

export function updateBoatMesh(
  mesh: THREE.Group,
  state: GameState,
  time: number
): void {
  mesh.position.x = state.position.x;
  mesh.position.z = state.position.z;
  mesh.position.y = getBoatBob(time, state.velocity);

  mesh.rotation.y = state.heading;
  mesh.rotation.z = getBoatRoll(time, state.angularVelocity);
  mesh.rotation.x = getBoatPitch(state.velocity);
}
