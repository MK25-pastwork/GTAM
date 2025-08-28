import { GUI } from 'three/addons/libs/lil-gui.module.min.js';

export function createUI(world, player) {
  const gui = new GUI();

  const playerFolder = gui.addFolder('Player');
  playerFolder.add(player, 'maxSpeed', 1, 20).name('Max Speed');
  playerFolder.add(player.cameraHelper, 'visible').name('Show Camera Helper');
  
  gui.add(world.size, 'width', 8, 128, 1).name('Width').onChange(() => world.generate());
  gui.add(world.size, 'height', 2, 64, 1).name('Height').onChange(() => world.generate());
  gui.add(world.size, 'depth', 8, 128, 1).name('Depth').onChange(() => world.generate());

  const terrainFolder = gui.addFolder('Terrain');//most of the terrain functions are for testing other maps otherside of the city block model, it wont do much even the settings are turn to the max
  terrainFolder.add(world.params, 'seed', 0, 10000).name('Seed');
  terrainFolder.add(world.params.terrain, 'scale', 1, 100).name('Scale');//desert, forest, and iceberg terrain were made during testing phase
  terrainFolder.add(world.params.terrain, 'magnitude', 0, 10).name('Magnitude');//Mag and offset10 and 100 for test cased was used, and can be further explored
  terrainFolder.add(world.params.terrain, 'offset', 0, 1).name('Offset');

  gui.onChange(()=>{
    world.generate();
  });
}
