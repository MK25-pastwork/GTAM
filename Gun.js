import * as THREE from 'three';

export class Gun {
  constructor(scene, player, world) {
    this.scene = scene;
    this.player = player;
    this.world = world;

    this.shootCooldown = 0.25;
    this.timeSinceLastShot = 0;

    // Bind fire method for button click
    document.getElementById('gun-button')?.addEventListener('click', () => this.fire());
    window.addEventListener('mousedown', () => this.fire());
  }

  update(dt) {
    this.timeSinceLastShot += dt;
  }

fire() {
  const camera = this.player.camera;
  const scene = this.scene;

  const direction = new THREE.Vector3();
  camera.getWorldDirection(direction);

  const origin = camera.getWorldPosition(new THREE.Vector3())
    .clone().add(direction.clone().multiplyScalar(0.5)); // Offset forward

  const raycaster = new THREE.Raycaster(origin, direction);
  const intersects = raycaster.intersectObjects(
    scene.children.filter(obj => !obj.userData.ignoreRaycast),
    true
  );

  if (intersects.length > 0) {
    const hitPoint = intersects[0].point;

    // 🔴 Draw tracer from origin to hit point
    this.drawTracer(origin, hitPoint, scene);

    // 🟣 Draw purple hit sphere at impact
    const hitSphere = new THREE.Mesh(
      new THREE.SphereGeometry(0.15, 8, 8),
      new THREE.MeshBasicMaterial({ color: 0xff00ff })
    );
    hitSphere.position.copy(hitPoint);
    hitSphere.userData.isHitMarker = true;
    scene.add(hitSphere);

  } else {
    const maxDistance = 100;
    const endPoint = origin.clone().add(direction.clone().multiplyScalar(maxDistance));

    // 🔴 Draw full-length tracer
    this.drawTracer(origin, endPoint, scene);

    // 🟡 Yellow sphere at end
    const missSphere = new THREE.Mesh(
      new THREE.SphereGeometry(0.15, 8, 8),
      new THREE.MeshBasicMaterial({ color: 0xffff00 })
    );
    missSphere.position.copy(endPoint);
    missSphere.userData.isHitMarker = true;
    scene.add(missSphere);
  }
}

drawTracer(start, end, scene) {
  const dir = new THREE.Vector3().subVectors(end, start);
  const length = dir.length();
  const mid = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);

  const geometry = new THREE.CylinderGeometry(0.03, 0.03, length, 6);
  const material = new THREE.MeshBasicMaterial({ color: 0xff0000 });
  const tracer = new THREE.Mesh(geometry, material);
  tracer.userData.isTracer = true;

  const up = new THREE.Vector3(0, 1, 0);
  tracer.quaternion.setFromUnitVectors(up, dir.clone().normalize());

  tracer.position.copy(mid);
  scene.add(tracer);
}




  clearGunVisuals() {
    this.scene.children = this.scene.children.filter(obj => {
      if (obj.userData.isTracer || obj.userData.isHitMarker) {
        this.scene.remove(obj);
        return false;
      }
      return true;
    });
  }
}
