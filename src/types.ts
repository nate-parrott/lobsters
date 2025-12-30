export interface Vec2 {
  x: number;
  z: number;
}

export interface GameState {
  position: Vec2;
  velocity: Vec2;
  heading: number; // radians, 0 = positive Z
  angularVelocity: number;
}

export interface InputState {
  forward: number;  // -1 to 1
  turn: number;     // -1 to 1 (left/right)
}

export function createInitialGameState(): GameState {
  return {
    position: { x: -10, z: 0 },
    velocity: { x: 0, z: 0 },
    heading: Math.PI,
    angularVelocity: 0,
  };
}
