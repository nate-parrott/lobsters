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

function getPolygonArea(polygon: Vec2[]): number {
  let area = 0;
  for (let i = 0; i < polygon.length; i++) {
    const p1 = polygon[i];
    const p2 = polygon[(i + 1) % polygon.length];
    area += p1.x * p2.z - p2.x * p1.z;
  }
  return area / 2;
}

function isPointInTriangle(p: Vec2, a: Vec2, b: Vec2, c: Vec2): boolean {
  const v0 = { x: c.x - a.x, z: c.z - a.z };
  const v1 = { x: b.x - a.x, z: b.z - a.z };
  const v2 = { x: p.x - a.x, z: p.z - a.z };

  const dot00 = v0.x * v0.x + v0.z * v0.z;
  const dot01 = v0.x * v1.x + v0.z * v1.z;
  const dot02 = v0.x * v2.x + v0.z * v2.z;
  const dot11 = v1.x * v1.x + v1.z * v1.z;
  const dot12 = v1.x * v2.x + v1.z * v2.z;

  const denom = dot00 * dot11 - dot01 * dot01;
  if (denom === 0) return false;
  const invDenom = 1 / denom;
  const u = (dot11 * dot02 - dot01 * dot12) * invDenom;
  const v = (dot00 * dot12 - dot01 * dot02) * invDenom;
  return u >= 0 && v >= 0 && u + v <= 1;
}

function triangulatePolygon(polygon: Vec2[]): Vec2[][] {
  if (polygon.length < 3) return [];

  const triangles: Vec2[][] = [];
  const indices = polygon.map((_, i) => i);
  const isCCW = getPolygonArea(polygon) > 0;

  const isConvex = (prev: Vec2, curr: Vec2, next: Vec2): boolean => {
    const cross = (curr.x - prev.x) * (next.z - curr.z) - (curr.z - prev.z) * (next.x - curr.x);
    return isCCW ? cross > 0 : cross < 0;
  };

  while (indices.length > 3) {
    let earFound = false;
    for (let i = 0; i < indices.length; i++) {
      const prevIndex = indices[(i - 1 + indices.length) % indices.length];
      const currIndex = indices[i];
      const nextIndex = indices[(i + 1) % indices.length];
      const prev = polygon[prevIndex];
      const curr = polygon[currIndex];
      const next = polygon[nextIndex];

      if (!isConvex(prev, curr, next)) continue;

      let hasPointInside = false;
      for (let j = 0; j < indices.length; j++) {
        const idx = indices[j];
        if (idx === prevIndex || idx === currIndex || idx === nextIndex) continue;
        if (isPointInTriangle(polygon[idx], prev, curr, next)) {
          hasPointInside = true;
          break;
        }
      }
      if (hasPointInside) continue;

      triangles.push([prev, curr, next]);
      indices.splice(i, 1);
      earFound = true;
      break;
    }

    if (!earFound) {
      break;
    }
  }

  if (indices.length === 3) {
    triangles.push([polygon[indices[0]], polygon[indices[1]], polygon[indices[2]]]);
  }

  return triangles;
}

function getConcaveCollisionMTV(boatCorners: Vec2[], islandPolygon: Vec2[]): Vec2 | null {
  const triangles = triangulatePolygon(islandPolygon);
  let bestMTV: Vec2 | null = null;
  let bestLen = Infinity;

  for (const triangle of triangles) {
    const mtv = getCollisionMTV(boatCorners, triangle);
    if (!mtv) continue;
    const len = Math.sqrt(mtv.x * mtv.x + mtv.z * mtv.z);
    if (len < bestLen) {
      bestLen = len;
      bestMTV = mtv;
    }
  }

  return bestMTV;
}

export function handleIslandCollisions(state: GameState, colliders: IslandCollider[]): void {

  for (const collider of colliders) {
    if (collider.polygon.length < 3) continue;

    const boatCorners = getBoatCorners(state);
    const mtv = getConcaveCollisionMTV(boatCorners, collider.polygon);

    if (mtv) {
      console.log('Collision detected, MTV:', mtv);
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
}
