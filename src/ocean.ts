import * as THREE from 'three';

const OCEAN_SIZE = 2000;
const TILE_REPEAT = 200; // How many times to tile the texture

export function createOcean(): THREE.Mesh {
  const geometry = new THREE.PlaneGeometry(OCEAN_SIZE, OCEAN_SIZE, 64, 64);

  const textureLoader = new THREE.TextureLoader();
  const waterTexture = textureLoader.load(`${import.meta.env.BASE_URL}watertile.jpg`);
  waterTexture.wrapS = THREE.RepeatWrapping;
  waterTexture.wrapT = THREE.RepeatWrapping;
  waterTexture.repeat.set(TILE_REPEAT, TILE_REPEAT);

  const material = new THREE.MeshStandardMaterial({
    map: waterTexture,
    color: 0x4488aa,
    roughness: 0.8,
    metalness: 0.1,
  });

  const ocean = new THREE.Mesh(geometry, material);
  ocean.rotation.x = -Math.PI / 2;
  ocean.receiveShadow = true;

  return ocean;
}

export function updateOceanUV(ocean: THREE.Mesh, time: number): void {
  const material = ocean.material as THREE.MeshStandardMaterial;
  if (material.map) {
    material.map.offset.x = time * 0.02;
    material.map.offset.y = time * 0.015;
  }
}

export function createSkyAndLighting(scene: THREE.Scene): void {
  // Darker sky color
  scene.background = new THREE.Color(0x4a6b7c);

  // Darker fog
  scene.fog = new THREE.FogExp2(0x3a5a6a, 0.01);

  // Dimmer ambient light
  const ambient = new THREE.AmbientLight(0x6688aa, 1.5);
  scene.add(ambient);

  // Directional moonlight (dimmer, bluish)
  const sun = new THREE.DirectionalLight(0x8899bb, 3);
  sun.position.set(50, 150, 50);
  sun.castShadow = true;
  sun.shadow.bias = -0.001
  sun.shadow.mapSize.width = 2048;
  sun.shadow.mapSize.height = 2048;
  sun.shadow.camera.near = 0.5;
  sun.shadow.camera.far = 500;
  sun.shadow.camera.left = -100;
  sun.shadow.camera.right = 100;
  sun.shadow.camera.top = 100;
  sun.shadow.camera.bottom = -100;
  scene.add(sun);
}

export function createBoatSpotlight(): THREE.SpotLight {
  const spotlight = new THREE.SpotLight(0xffffee, 80, 50, Math.PI / 6, 0.3, 1);
  spotlight.castShadow = true;
  spotlight.shadow.bias = -0.001;
  spotlight.shadow.camera.near = 0.5;
  spotlight.shadow.camera.far = 50;
  spotlight.shadow.mapSize.width = 1024;
  spotlight.shadow.mapSize.height = 1024;
  return spotlight;
}

export function updateBoatSpotlight(
  spotlight: THREE.SpotLight,
  boatX: number,
  boatZ: number,
  heading: number
): void {
  // Position spotlight at front of boat
  const forwardX = Math.sin(heading);
  const forwardZ = Math.cos(heading);

  spotlight.position.set(
    boatX + forwardX * 2,
    3,
    boatZ + forwardZ * 2
  );

  // Point forward
  spotlight.target.position.set(
    boatX + forwardX * 20,
    0,
    boatZ + forwardZ * 20
  );
}
