import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { Vec2 } from './types';

export interface IslandCollider {
  polygon: Vec2[];
}

export interface IslandData {
  group: THREE.Group;
  collider: Promise<IslandCollider>;
}

function loadIslandModel(fileName: string): IslandData {
  const group = new THREE.Group();

  const colliderPromise = new Promise<IslandCollider>((resolve) => {
    const loader = new GLTFLoader();
    loader.load(`${import.meta.env.BASE_URL}${fileName}`, (gltf) => {
      const model = gltf.scene;
      let hitPolygon: Vec2[] = [];

      model.traverse((child) => {
        if (child.name.includes('__hit')) {
          child.traverse((sub) => {
            if (sub instanceof THREE.Mesh) {
              hitPolygon = extractPolygonFromMesh(sub);
              sub.visible = false;
            }
          });
        } else if (child instanceof THREE.Mesh) {
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });

      group.add(model);
      resolve({ polygon: hitPolygon });
    });
  });

  return { group, collider: colliderPromise };
}

export function createIslands(): IslandData[] {
  return [
    loadIslandModel('island1.glb'),
    loadIslandModel('island2.glb'),
    loadIslandModel('island3.glb'),
    loadIslandModel('island4.glb'),
  ];
}

function extractPolygonFromMesh(mesh: THREE.Mesh): Vec2[] {
  // Update world matrix to get proper transforms
  mesh.updateWorldMatrix(true, false);

  const geometry = mesh.geometry;
  const position = geometry.getAttribute('position');
  const vertices: Vec2[] = [];

  // Get unique vertices, transformed to world space
  const seen = new Set<string>();
  const tempVec = new THREE.Vector3();

  for (let i = 0; i < position.count; i++) {
    tempVec.fromBufferAttribute(position, i);
    // Apply mesh's world transform
    tempVec.applyMatrix4(mesh.matrixWorld);

    // Use X and Z for the 2D polygon (Y is up)
    const x = tempVec.x;
    const z = tempVec.z;
    const key = `${x.toFixed(3)},${z.toFixed(3)}`;
    if (!seen.has(key)) {
      seen.add(key);
      vertices.push({ x, z });
    }
  }

  // Sort vertices by angle from centroid to form a proper polygon
  const centroid = vertices.reduce(
    (acc, v) => ({ x: acc.x + v.x / vertices.length, z: acc.z + v.z / vertices.length }),
    { x: 0, z: 0 }
  );

  vertices.sort((a, b) => {
    const angleA = Math.atan2(a.z - centroid.z, a.x - centroid.x);
    const angleB = Math.atan2(b.z - centroid.z, b.x - centroid.x);
    return angleA - angleB;
  });

  console.log('Extracted collision polygon:', vertices.length, 'vertices', vertices);

  return vertices;
}
