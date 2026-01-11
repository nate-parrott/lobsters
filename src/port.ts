import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { Vec2 } from './types';

export function loadPortZone(): Promise<Vec2[]> {
  return new Promise((resolve) => {
    const loader = new GLTFLoader();
    loader.load(`${import.meta.env.BASE_URL}port__zone.glb`, (gltf) => {
      const model = gltf.scene;
      let polygon: Vec2[] = [];

      model.traverse((child) => {
        if (child.name === 'port__zone' && child instanceof THREE.Mesh) {
          polygon = extractPolygonFromMesh(child);
        }
      });

      resolve(polygon);
    });
  });
}

function extractPolygonFromMesh(mesh: THREE.Mesh): Vec2[] {
  mesh.updateWorldMatrix(true, false);

  const geometry = mesh.geometry;
  const position = geometry.getAttribute('position');
  const vertices: Vec2[] = [];

  const seen = new Set<string>();
  const tempVec = new THREE.Vector3();

  for (let i = 0; i < position.count; i++) {
    tempVec.fromBufferAttribute(position, i);
    tempVec.applyMatrix4(mesh.matrixWorld);

    const x = tempVec.x;
    const z = tempVec.z;
    const key = `${x.toFixed(3)},${z.toFixed(3)}`;
    if (!seen.has(key)) {
      seen.add(key);
      vertices.push({ x, z });
    }
  }

  // Sort vertices by angle from centroid
  const centroid = vertices.reduce(
    (acc, v) => ({ x: acc.x + v.x / vertices.length, z: acc.z + v.z / vertices.length }),
    { x: 0, z: 0 }
  );

  vertices.sort((a, b) => {
    const angleA = Math.atan2(a.z - centroid.z, a.x - centroid.x);
    const angleB = Math.atan2(b.z - centroid.z, b.x - centroid.x);
    return angleA - angleB;
  });

  return vertices;
}

// Point-in-polygon using ray casting algorithm
export function isAtPort(position: Vec2, portPolygon: Vec2[]): boolean {
  if (portPolygon.length < 3) return false;

  let inside = false;
  const x = position.x;
  const z = position.z;

  for (let i = 0, j = portPolygon.length - 1; i < portPolygon.length; j = i++) {
    const xi = portPolygon[i].x;
    const zi = portPolygon[i].z;
    const xj = portPolygon[j].x;
    const zj = portPolygon[j].z;

    if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) {
      inside = !inside;
    }
  }

  return inside;
}
