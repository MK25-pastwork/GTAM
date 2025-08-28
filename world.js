import * as THREE from 'three';
import { SimplexNoise } from 'three/examples/jsm/math/SimplexNoise.js';
import { RNG } from './rng.js';
import { blocks } from './blocks.js';

const geometry = new THREE.BoxGeometry();
const material = new THREE.MeshLambertMaterial(); // vertexColors required

export class World extends THREE.Group {
  data = [];

  params = {
    seed: 0,
    terrain: {
      scale: 30,
      magnitude: 0.5,
      offset: 0.2
    }
  };

  constructor(size = { width: 32, height: 16, depth: 32 }) {
    super();
    this.size = size;
  }

  generate() {
    //this.initializeTerrain();
    this.generateTerrain();
    this.generateMeshes();
  }

  initializeTerrain() {
    this.data = [];
    for (let x = 0; x < this.size.width; x++) {
      const slice = [];
      for (let y = 0; y < this.size.height; y++) {
        const row = [];
        for (let z = 0; z < this.size.depth; z++) {
          row.push({
            id: blocks.empty.id,
            instanceId: null
          });
        }
        slice.push(row);
      }
      this.data.push(slice);
    }
  }


generateTerrain() {//values to be increase
  this.initializeTerrain();

  const rng = new RNG(this.params.seed);

  const blockSizeMin = 5;
  const blockSizeMax = 7;
  const roadSizeMin = 2;
  const roadSizeMax = 3;

  // Pick consistent sizes for the entire map this generation
  const blockSize = blockSizeMin + Math.floor(rng.random() * (blockSizeMax - blockSizeMin + 1));
  const roadSize  = roadSizeMin  + Math.floor(rng.random() * (roadSizeMax - roadSizeMin + 1));
  const patternSize = blockSize + roadSize;

  for (let x = 0; x < this.size.width; x++) {
    for (let z = 0; z < this.size.depth; z++) {
      const inRoadX = (x % patternSize) >= blockSize;
      const inRoadZ = (z % patternSize) >= blockSize;

      // Road area
      if (inRoadX || inRoadZ) {
        this.setBlockId(x, 0, z, blocks.road.id);

        // Add lampposts or trees with spacing
        if ((x + z) % 6 === 0 && rng.random() < 0.5) {
          this.setBlockId(x, 1, z, rng.random() < 0.5 ? blocks.tree.id : blocks.lamppost.id);
        }
        continue;
      }

      // Zone detection
      const blockX = Math.floor(x / patternSize);
      const blockZ = Math.floor(z / patternSize);
      const zoneSeed = blockX * 23 + blockZ * 17; // deterministic pattern
      rng.seed(zoneSeed);
      const zoneRand = rng.random();

      if (zoneRand < 0.2) {
        // Park zone
        this.setBlockId(x, 0, z, blocks.grass.id);
        if (rng.random() < 0.15) this.setBlockId(x, 1, z, blocks.tree.id);
      } else if (zoneRand < 0.4) {
        // 🪨 Empty lot
        this.setBlockId(x, 0, z, blocks.dirt.id);
      } else {
        // Building (20% are skyscrapers)
        const isSkyscraper = rng.random() < 0.2;
        const height = isSkyscraper
          ? 20 + Math.floor(rng.random() * 20)
          : 4 + Math.floor(rng.random() * 3);

        for (let y = 1; y <= height; y++) {
          if (y === height) {
            this.setBlockId(x, y, z, blocks.roof.id);
          } else if (y >= height - 2) {
            this.setBlockId(x, y, z, blocks.window.id);
          } else {
            this.setBlockId(x, y, z, blocks.building.id);
          }
        }
        this.setBlockId(x, 0, z, blocks.dirt.id);
      }
    }
  }
}




  generateMeshes() {
  this.clear();

  const maxCount = this.size.width * this.size.height * this.size.depth;
  const mesh = new THREE.InstancedMesh(geometry, material, maxCount);
  const matrix = new THREE.Matrix4();
  let count = 0;

  mesh.castShadow = true;
  mesh.receiveShadow = true;

  for (let x = 0; x < this.size.width; x++) {
    for (let y = 0; y < this.size.height; y++) {
      for (let z = 0; z < this.size.depth; z++) {
        const block = this.getBlock(x, y, z);
        if (block && block.id !== blocks.empty.id && !this.isBlockObscured(x, y, z)) {
          const blockType = Object.values(blocks).find(b => b.id === block.id);
          matrix.setPosition(x , y , z );
          mesh.setMatrixAt(count, matrix);
          if (blockType?.color !== undefined) {
            mesh.setColorAt(count, new THREE.Color(blockType.color));
          }
          this.setBlockInstanceId(x, y, z, count);
          count++;
        }
      }
    }
  }

  mesh.count = count;
  mesh.instanceMatrix.needsUpdate = true;
  mesh.instanceColor.needsUpdate = true; // Required for color updates

  this.add(mesh);
}



  getBlock(x, y, z) {
    return this.inBounds(x, y, z) ? this.data[x][y][z] : null;
  }

  setBlockId(x, y, z, id) {
    if (this.inBounds(x, y, z)) {
      if (y === 0 && this.data[x][y][z].id === blocks.road.id) return; // Prevent overwrite
      this.data[x][y][z].id = id;
    }
  }

  setBlockInstanceId(x, y, z, instanceId) {
    if (this.inBounds(x, y, z)) {
      this.data[x][y][z].instanceId = instanceId;
    }
  }

  inBounds(x, y, z) {
    return (
      x >= 0 && x < this.size.width &&
      y >= 0 && y < this.size.height &&
      z >= 0 && z < this.size.depth
    );
  }
 isBlockObscured(x, y, z) {
  const neighbors = [
    this.getBlock(x, y + 1, z)?.id,
    this.getBlock(x, y - 1, z)?.id,
    this.getBlock(x + 1, y, z)?.id,
    this.getBlock(x - 1, y, z)?.id,
    this.getBlock(x, y, z + 1)?.id,
    this.getBlock(x, y, z - 1)?.id,
  ];

  // If any neighbor is empty, it's not obscured
  return neighbors.every(id => id !== undefined && id !== blocks.empty.id);
}
addBlock(x, y, z, blockId) {
  if (this.inBounds(x, y, z) && this.getBlock(x, y, z).id === blocks.empty.id) {
    this.setBlockId(x, y, z, blockId);
    this.generateMeshes();
  }
}

removeBlock(x, y, z) {
  if (this.inBounds(x, y, z) && y > 0 && this.getBlock(x, y, z).id !== blocks.road.id) {
    this.setBlockId(x, y, z, blocks.empty.id);
    this.generateMeshes();
  }
}


}
