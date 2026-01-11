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

export function createSkyAndLighting(scene: THREE.Scene): THREE.DirectionalLight {
  // Darker sky color
  scene.background = new THREE.Color(0x112949); // #2e3e46ff color

  // Darker fog
  scene.fog = new THREE.FogExp2(0x112949, 0.02);

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
  const shadowSize = 50;
  sun.shadow.camera.left = -shadowSize / 2;
  sun.shadow.camera.right = shadowSize / 2;
  sun.shadow.camera.top = shadowSize / 2;
  sun.shadow.camera.bottom = -shadowSize / 2;
  scene.add(sun);
  scene.add(sun.target);

  return sun;
}

export function updateSunPosition(sun: THREE.DirectionalLight, targetX: number, targetZ: number): void {
  // Move both sun and its target to follow the boat
  sun.position.x = targetX + 50;
  sun.position.z = targetZ + 50;
  sun.target.position.x = targetX;
  sun.target.position.z = targetZ;
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
    4,
    boatZ + forwardZ * 2
  );

  // Point forward
  spotlight.target.position.set(
    boatX + forwardX * 20,
    0,
    boatZ + forwardZ * 20
  );
}
