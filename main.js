import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import Stats from 'three/examples/jsm/libs/stats.module.js';

import { World } from './world.js';
import { createUI } from './ui.js';
import { Player } from './player.js';
import { Physics } from './physics.js';
import { blocks } from './blocks.js';
import { Gun } from './Gun.js';

// Debug Info
console.log("Three.js version:", THREE.REVISION);

// === Setup Stats ===
const stats = new Stats();
document.body.appendChild(stats.dom);

// === Renderer ===
const renderer = new THREE.WebGLRenderer();
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0x80a0e0);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.BasicShadowMap;
document.body.appendChild(renderer.domElement);

// === Cameras ===
const orbitCamera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
orbitCamera.position.set(64, 64, 64);
const controls = new OrbitControls(orbitCamera, renderer.domElement);
controls.target.set(16, 8, 16);
controls.update();

// === Scene, World, Player ===
const scene = new THREE.Scene();
const world = new World({ width: 32, height: 16, depth: 32 });
world.generate();
scene.add(world);

const player = new Player(scene);
const physics = new Physics(scene);

// === Lights ===
function setupLights() {
  const sun = new THREE.DirectionalLight();
  sun.position.set(50, 50, 50);
  sun.castShadow = true;
  sun.shadow.camera.left = -50;
  sun.shadow.camera.right = 50;
  sun.shadow.camera.bottom = -50;
  sun.shadow.camera.top = 50;
  sun.shadow.camera.near = 0.1;
  sun.shadow.camera.far = 100;
  sun.shadow.bias = -0.0005;
  sun.shadow.mapSize = new THREE.Vector2(256, 256);
  scene.add(sun);

  const shadowHelper = new THREE.CameraHelper(sun.shadow.camera);
  scene.add(shadowHelper);

  const ambient = new THREE.AmbientLight(0xffffff, 0.1);
  scene.add(ambient);
}
setupLights();

// === Gun ===
const gun = new Gun(scene, player, world);

// === Input & UI ===
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
let selectedTool = 'block'; // or 'gun'
let selectedBlockId = blocks.building.id;

// === Mouse Controls ===
window.addEventListener('mousedown', onMouseDown);
window.addEventListener('contextmenu', e => e.preventDefault());

function onMouseDown(event) {
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
  raycaster.setFromCamera(mouse, selectedTool === 'gun' ? player.camera : orbitCamera);

  const intersects = raycaster.intersectObject(world, true);

  if (event.button === 0) {
    if (selectedTool === 'gun') {
      gun.fire();
    } else if (intersects.length > 0) {
      const point = intersects[0].point.clone().floor();
      world.removeBlock(point.x, point.y, point.z);
    }
  } else if (event.button === 2 && intersects.length > 0 && selectedTool === 'block') {
    const point = intersects[0].point.clone().floor();
    point.y += 1;
    world.addBlock(point.x, point.y, point.z, selectedBlockId);
  }
}

// === Toolbar ===
const toolbar = document.getElementById('toolbar');

// Gun button
const gunButton = document.createElement('button');
gunButton.textContent = 'Gun';
gunButton.style.background = '#444';
gunButton.style.color = '#fff';
gunButton.onclick = () => {
  selectedTool = 'gun';
  console.log('Selected: Gun');
};
toolbar.appendChild(gunButton);

// Block buttons
Object.entries(blocks).forEach(([key, block]) => {
  if (block.id === 0) return;
  const button = document.createElement('button');
  button.textContent = key;
  button.style.background = '#' + block.color.toString(16).padStart(6, '0');
  button.style.color = '#000';
  button.onclick = () => {
    selectedTool = 'block';
    selectedBlockId = block.id;
    console.log('Selected block:', key);
  };
  toolbar.appendChild(button);
});

// === Resize Handling ===
window.addEventListener('resize', () => {
  orbitCamera.aspect = window.innerWidth / window.innerHeight;
  orbitCamera.updateProjectionMatrix();

  player.camera.aspect = window.innerWidth / window.innerHeight;
  player.camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
});

// === Animate Loop ===
let previousTime = performance.now();

function animate() {
  const currentTime = performance.now();
  const dt = (currentTime - previousTime) / 1000;
  previousTime = currentTime;

  requestAnimationFrame(animate);
  player.applyInputs(dt);
  player.updateBoundsHelper();
  physics.update(dt, player, world);

  if (selectedTool === 'gun') {
    renderer.render(scene, player.camera);
  } else {
    renderer.render(scene, orbitCamera);
  }

  stats.update();

  if (gun && typeof gun.update === 'function') {
    gun.update(dt);
  }
}

//tracer
function clearGunVisuals(scene) {
  const toRemove = [];

  scene.traverse((obj) => {
    if (obj.userData.isTracer || obj.userData.isHitMarker) {
      toRemove.push(obj);
    }
  });

  toRemove.forEach(obj => {
    scene.remove(obj);
    if (obj.geometry) obj.geometry.dispose();
    if (obj.material) obj.material.dispose();
  });
}
window.addEventListener('keydown', (event) => {
  if (event.key.toLowerCase() === 'l') {
    clearGunVisuals(scene);
    console.log('Cleared all gun visuals');
  }
});


// === Launch UI & Game Loop ===
createUI(world, player); // Optional GUI
animate();


