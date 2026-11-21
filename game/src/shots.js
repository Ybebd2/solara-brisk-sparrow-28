// SOLARA R10 — shots: STAGE each scene (?shot=1..4), don't just move the camera.
import * as THREE from 'three';
import { S } from './config.js';
import { createPlayerCar, makeCarMesh } from './vehicles.js';
import { setWanted } from './police.js';
import { showDialogue } from './hud.js';

export function shotNumber() {
  const q = new URLSearchParams(location.search).get('shot');
  const n = parseInt(q || '', 10);
  return (n >= 1 && n <= 4) ? n : 0;
}

// Stage the scene for a fixed camera. ctx: {scene, camera, world, startMission0}
export function applyShot(n, ctx) {
  const { scene, camera, world } = ctx;
  S.shotMode = true;
  S.started = true;
  S.paused = false;
  world.safehouse.visible = false; // pink cylinder blocked shot-3 before
  const setCam = (pos, look) => {
    camera.position.set(pos[0], pos[1], pos[2]);
    camera.lookAt(new THREE.Vector3(look[0], look[1], look[2]));
  };
  if (n === 1) {
    // start menu visible, camera over downtown looking east at the skyline
    S.started = false;
    S.shotMode = false;
    setCam([-236, 9, 84], [-40, 26, -20]);
    return;
  }
  if (n === 2) {
    // packed street: Kai in a red sports car driving east on road z=64,
    // 8 traffic cars tight ahead in both lanes + 2 police cruisers behind
    const car = createPlayerCar(scene, 'sports', -46, 64, Math.PI / 2);
    car.speed = 12;
    S.inCar = true; S.car = car;
    S.px = -46; S.pz = 64; S.heading = Math.PI / 2;
    setWanted(1);
    const spots = [
      [-36, 59], [-30, 59], [-24, 59], [-18, 59],
      [-36, 69], [-30, 69], [-24, 69], [-18, 69],
    ];
    for (const [x, z] of spots) {
      const m = makeCarMesh(x % 2 ? 'sedan' : 'coupe');
      m.position.set(x, 0, z);
      m.rotation.y = Math.PI / 2;
      scene.add(m);
    }
    for (const [x, z] of [[-50, 62], [-56, 68]]) {
      const p = makeCarMesh('police');
      p.position.set(x, 0, z);
      p.rotation.y = Math.PI / 2;
      scene.add(p);
    }
    // narrower lens for the packed-street shot so the cars read BIG
    camera.fov = 42;
    camera.updateProjectionMatrix();
    setCam([-64, 6, 78], [-20, 2, 64]);
    return;
  }
  if (n === 3) {
    // Kai ON FOOT, big in frame, VESPER pistol visible, Lupe dialogue, wanted 2
    S.px = -40; S.pz = -184; S.heading = Math.PI;
    S.weaponIdx = 0; S.ammo = 12;
    S.missionIdx = 0; S.missionActive = true; S.missionTime = 180; S.missionStage = 0;
    setWanted(2);
    showDialogue('LUPE', 'FIXER · MO\'S GARAGE', "Kai. You made it. First job is simple — walk over here and we talk.", "I'm here, Lupe. What's the job?");
    // drop the dialogue box low so Kai (and his pistol) stay fully visible
    document.getElementById('dialogue').style.bottom = '110px';
    setCam([-46, 2.0, -184], [-39, 1.0, -184]);
    return;
  }
  if (n === 4) {
    // neon chase: heli overhead, live beam + bright pool at Kai's feet, wanted 3
    S.px = -8; S.pz = -186; S.heading = Math.PI;
    S.missionIdx = 5; S.missionActive = true; S.missionTime = 180; S.missionStage = 0;
    setWanted(3);
    setCam([36, 10, -220], [-12, 10, -176]);
    return;
  }
}
