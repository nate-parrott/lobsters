import { Vec2, GameState } from './types';
import { IslandCollider } from './islands';

// Boat dimensions (rectangle bounding box)
const BOAT_LENGTH = 3;
const BOAT_WIDTH = 1.5;

// Get the 4 corners of the boat's bounding box in world space
function getBoatCorners(state: GameState): Vec2[] {
  const cos = Math.cos(state.heading);
  const sin = Math.sin(state.heading);
  const halfL = BOAT_LENGTH / 2;
  const halfW = BOAT_WIDTH / 2;

  // Local corners relative to boat center
  const localCorners = [
    { x: -halfW, z: halfL },   // front-left
    { x: halfW, z: halfL },    // front-right
    { x: halfW, z: -halfL },   // back-right
    { x: -halfW, z: -halfL },  // back-left
  ];

  // Transform to world space
  return localCorners.map(c => ({
    x: state.position.x + c.x * cos - c.z * sin,
    z: state.position.z + c.x * sin + c.z * cos,
  }));
}

// Get polygon edges as vectors
function getPolygonAxes(polygon: Vec2[]): Vec2[] {
  const axes: Vec2[] = [];
  for (let i = 0; i < polygon.length; i++) {
    const p1 = polygon[i];
    const p2 = polygon[(i + 1) % polygon.length];
    // Edge vector
    const edge = { x: p2.x - p1.x, z: p2.z - p1.z };
    // Normal (perpendicular)
    const len = Math.sqrt(edge.x * edge.x + edge.z * edge.z);
    if (len > 0) {
      axes.push({ x: -edge.z / len, z: edge.x / len });
    }
  }
  return axes;
}

// Project polygon onto axis, return min/max
function projectPolygon(polygon: Vec2[], axis: Vec2): { min: number; max: number } {
  let min = Infinity;
  let max = -Infinity;
  for (const v of polygon) {
    const proj = v.x * axis.x + v.z * axis.z;
    min = Math.min(min, proj);
    max = Math.max(max, proj);
  }
  return { min, max };
}

// Check if projections overlap and return overlap amount
function getOverlap(a: { min: number; max: number }, b: { min: number; max: number }): number {
  if (a.max < b.min || b.max < a.min) return 0;
  return Math.min(a.max - b.min, b.max - a.min);
}

// SAT collision detection between boat (rectangle) and island polygon
// Returns the minimum translation vector to push boat out, or null if no collision
function getCollisionMTV(boatCorners: Vec2[], islandPolygon: Vec2[]): Vec2 | null {
  // Collect all axes to test (boat edges + island edges)
  const boatAxes = getPolygonAxes(boatCorners);
  const islandAxes = getPolygonAxes(islandPolygon);
  const allAxes = [...boatAxes, ...islandAxes];

  let minOverlap = Infinity;
  let mtvAxis: Vec2 | null = null;

  for (const axis of allAxes) {
    const projBoat = projectPolygon(boatCorners, axis);
    const projIsland = projectPolygon(islandPolygon, axis);
    const overlap = getOverlap(projBoat, projIsland);

    if (overlap === 0) {
      // Separating axis found - no collision
      return null;
    }

    if (overlap < minOverlap) {
      minOverlap = overlap;
      mtvAxis = axis;
    }
  }

  if (!mtvAxis) return null;

  // Determine direction: push boat away from island center
  const boatCenter = boatCorners.reduce(
    (acc, v) => ({ x: acc.x + v.x / 4, z: acc.z + v.z / 4 }),
    { x: 0, z: 0 }
  );
  const islandCenter = islandPolygon.reduce(
    (acc, v) => ({ x: acc.x + v.x / islandPolygon.length, z: acc.z + v.z / islandPolygon.length }),
    { x: 0, z: 0 }
  );

  const toBoat = {
    x: boatCenter.x - islandCenter.x,
    z: boatCenter.z - islandCenter.z,
  };

  // Flip MTV if it points toward island
  const dot = toBoat.x * mtvAxis.x + toBoat.z * mtvAxis.z;
  if (dot < 0) {
    mtvAxis = { x: -mtvAxis.x, z: -mtvAxis.z };
  }

  return {
    x: mtvAxis.x * minOverlap,
    z: mtvAxis.z * minOverlap,
  };
}

export function handleIslandCollision(state: GameState, collider: IslandCollider): void {
  if (collider.polygon.length < 3) return;

  const boatCorners = getBoatCorners(state);
  const mtv = getCollisionMTV(boatCorners, collider.polygon);

  if (mtv) {
    // Push boat out of collision
    state.position.x += mtv.x;
    state.position.z += mtv.z;

    // Cancel velocity component into the island
    const mtvLen = Math.sqrt(mtv.x * mtv.x + mtv.z * mtv.z);
    if (mtvLen > 0.001) {
      const normal = { x: mtv.x / mtvLen, z: mtv.z / mtvLen };
      const velDot = state.velocity.x * normal.x + state.velocity.z * normal.z;
      if (velDot < 0) {
        state.velocity.x -= normal.x * velDot;
        state.velocity.z -= normal.z * velDot;
      }
      // Dampen on collision
      state.velocity.x *= 0.7;
      state.velocity.z *= 0.7;
    }
  }
}
