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
    position: { x: -8, z: 0 },
    velocity: { x: 0, z: 0 },
    heading: Math.PI,
    angularVelocity: 0,
  };
}

export interface TrapState {
  inWater: boolean;
  position?: Vec2;       // only if inWater
  droppedAt?: number;    // timestamp when dropped (ms)
  lobsterCount: number;  // lobsters in trap (only meaningful when on boat)
}

export interface PersistentState {
  traps: TrapState[];
  depositedLobsters: number;
}

export function createInitialPersistentState(): PersistentState {
  return {
    traps: [
      { inWater: false, lobsterCount: 0 },
      { inWater: false, lobsterCount: 0 },
      { inWater: false, lobsterCount: 0 },
      { inWater: false, lobsterCount: 0 },
      { inWater: false, lobsterCount: 0 },
      { inWater: false, lobsterCount: 0 },
      { inWater: false, lobsterCount: 0 },
      { inWater: false, lobsterCount: 0 },
    ],
    depositedLobsters: 0,
  };
}
