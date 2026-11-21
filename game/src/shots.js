// SOLARA R10 — shots.js
// Staged screenshots (?shot=1..4). Each shot STAGES the scene —
// positions Kai, traffic, police, heli, dialogue — then fixes the camera.
import * as THREE from 'three';

const SHOTS = {
  1: { camPos: [-236, 9, 84], camLook: [-40, 26, -20] },
  // shot 2: camera above the road behind the car, looking east down
  // the road (buildings next to the road are excluded in world.js)
  2: { camPos: [-72, 10, 64], camLook: [-15, 2, 64] },
  // shot 3: further back + higher so Kai is BIG and CLEAR, not blocked
  3: { camPos: [-48, 3.5, -178], camLook: [-40, 1.5, -184] },
  // shot 4: higher so palm fronds do not fill the frame
  4: { camPos: [36, 14, -224], camLook: [-12, 6, -176] },
};

export function applyShot(n, S, ctx) {
  const { traffic, police, missions, player } = ctx;
  S.shotMode = true;
  S.started = true;
  if (n === 1) {
    // start menu visible, camera over downtown looking east
    S.started = false;
    S.px = -40; S.pz = 60;
  } else if (n === 2) {
    // packed street: Kai in red sports car driving east on z=64,
    // 8 traffic cars tight ahead in both lanes + 2 police cruisers behind
    S.inCar = true;
    S.carSpeed = 12;
    S.car = { type: { name: 'VELOZ COMET RS' }, condition: 96 };
    S.px = -40; S.pz = 64; S.heading = Math.PI / 2;
    S.wanted = 1; S.seen = false; S.evading = 15;
    if (traffic && traffic.cars) {
      const ahead = traffic.cars.slice(0, 8);
      ahead.forEach((c, i) => {
        const lane = i % 2 === 0 ? 3 : -3;
        c.along = -30 + i * 6;
        c.road = 64; c.lane = lane; c.horizontal = true;
        c.x = c.along; c.z = 64 + lane;
        c.mesh.position.set(c.x, 0, c.z);
        c.mesh.rotation.y = 0;
      });
    }
  } else if (n === 3) {
    // Kai ON FOOT with VESPER pistol visible, mission 0, Lupe dialogue,
    // wanted 2, police RESPONSE panel with 2 named units
    S.inCar = false; S.car = null;
    S.px = -40; S.pz = -184; S.heading = Math.PI;
    S.weaponIdx = 1; S.ammo = 12;
    S.missionIdx = 0;
    S.missionActive = true; S.missionTime = 170;
    S.wanted = 2; S.seen = false; S.evading = 22;
    S.dialogue = "Kai. You're late. The fixer life doesn't wait — first job's yours. Meet me at MO'S.";
    S.dialogueSpeaker = "LUPE · FIXER · MO'S GARAGE";
    S.dialogueUntil = S.time + 30;
    if (police) {
      while (police.cruisers.length < 1) police.update(0.01, 0);
    }
  } else if (n === 4) {
    // neon chase: missionIdx 5, heli up, wanted 3, beam + pool at Kai's feet
    S.inCar = false; S.car = null;
    S.px = -8; S.pz = -186; S.heading = Math.PI;
    S.weaponIdx = 1; S.ammo = 10;
    S.missionIdx = 5;
    S.missionActive = true; S.missionTime = 170;
    S.wanted = 3; S.seen = true;
    if (police) police.heliAlt = 26;
  }
  return SHOTS[n];
}

export function shotCamera(n, camera) {
  const s = SHOTS[n];
  if (!s) return false;
  camera.position.set(s.camPos[0], s.camPos[1], s.camPos[2]);
  camera.lookAt(new THREE.Vector3(s.camLook[0], s.camLook[1], s.camLook[2]));
  return true;
}
