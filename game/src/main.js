// SOLARA R10 — main: entrypoint, loop, camera, car enter/exit, crew, peds, debug API.
import * as THREE from 'three';
import { S, DISTRICTS, WEAPONS, RADIO } from './config.js';
import { initInput, isDown, wasPressed, consumeMouse, consumeClick, endFrame } from './input.js';
import { initWorld } from './world.js';
import { initTraffic, updateTraffic, createPlayerCar, updatePlayerCar, nearestTrafficCar, removeTrafficCar, getTraffic } from './vehicles.js';
import { initPlayer, updatePlayer, reload, switchWeapon, updateWeaponMesh, playerGroup } from './player.js';
import { initPolice, updatePolice, setWanted, addWanted, shootableTargets, policeCount, getCruisers, getOfficers, hurtPlayer } from './police.js';
import { initMissions, tryStartMission, updateMissions, missionTargetPos } from './missions.js';
import { initHUD, updateHUD, showDialogue, togglePause, startGame } from './hud.js';
import { initAudio, updateAudio, playPickup } from './audio.js';
import { shotNumber, applyShot } from './shots.js';

window.addEventListener('error', (e) => { window.__solaraError = String(e.message || e.error); });

const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
document.getElementById('game').appendChild(renderer.domElement);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.1, 1200);
camera.position.set(-60, 12, 90);

const world = initWorld(scene);
initInput(renderer.domElement);
initPlayer(scene);
initTraffic(scene, 26);
initPolice(scene, world);
initMissions(world, showDialogue);
initHUD();
window.__solaraDistricts = DISTRICTS;

// ---- peds: 96, scale 1.5, bright shirts, in groups of 4 ----
const peds = [];
const SHIRTS = [0xffd21f, 0xff5d8f, 0x2ec4d8, 0x7cfc98, 0xff8c1a, 0xe040fb, 0xffffff, 0x69f0ae, 0xff5252, 0x4fc3f7];
function initPeds() {
  for (let g = 0; g < 24; g++) {
    const line = [-256, -192, -128, -64, 0, 64, 128, 192, 256][g % 9];
    const horiz = g % 2 === 0;
    const along = -280 + ((g * 53) % 560);
    const cx = horiz ? along : line + (g % 4 < 2 ? 13.5 : -13.5);
    const cz = horiz ? line + (g % 4 < 2 ? 13.5 : -13.5) : along;
    for (let k = 0; k < 4; k++) {
      const grp = new THREE.Group();
      const shirt = new THREE.MeshStandardMaterial({ color: SHIRTS[(g * 4 + k) % SHIRTS.length], roughness: 0.85 });
      const body = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.7, 0.34), shirt);
      body.position.y = 0.78; body.castShadow = true; grp.add(body);
      const head = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.32, 0.3),
        new THREE.MeshStandardMaterial({ color: [0xc98d64, 0x8a5a3b, 0xe8b98a][(g + k) % 3], roughness: 0.8 }));
      head.position.y = 1.3; grp.add(head);
      const legs = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.5, 0.3),
        new THREE.MeshStandardMaterial({ color: 0x22222e, roughness: 0.9 }));
      legs.position.y = 0.25; grp.add(legs);
      grp.scale.setScalar(1.5);
      const x = cx + (Math.random() - 0.5) * 6, z = cz + (Math.random() - 0.5) * 6;
      grp.position.set(x, 0, z);
      grp.rotation.y = Math.random() * Math.PI * 2;
      scene.add(grp);
      peds.push({ mesh: grp, x, z, heading: Math.random() * Math.PI * 2, speed: 1.1 + Math.random() * 0.5, turnT: 0, dead: false, phase: Math.random() * 6 });
    }
  }
}
initPeds();
function updatePeds(dt) {
  for (const p of peds) {
    if (p.dead) continue;
    p.turnT -= dt;
    const dp = Math.hypot(S.px - p.x, S.pz - p.z);
    let fleeing = false;
    if ((S.wanted > 0 && dp < 16) || dp < 4) {
      p.heading = Math.atan2(p.x - S.px, p.z - S.pz);
      fleeing = true;
    } else if (p.turnT <= 0) {
      p.heading += (Math.random() - 0.5) * 1.6;
      p.turnT = 2 + Math.random() * 3;
    }
    const sp = fleeing ? 4.6 : p.speed;
    const nx = p.x + Math.sin(p.heading) * sp * dt;
    const nz = p.z + Math.cos(p.heading) * sp * dt;
    // peds stay on the sidewalks — never wander onto the road
    if (!fleeing && world.isOnRoad(nx, nz)) { p.heading += Math.PI / 2; p.turnT = 0.5; }
    else if (Math.abs(nx) < 310 && Math.abs(nz) < 310) { p.x = nx; p.z = nz; }
    else p.heading += Math.PI / 2;
    p.mesh.position.x = p.x; p.mesh.position.z = p.z;
    p.mesh.rotation.y = p.heading;
    p.mesh.position.y = Math.abs(Math.sin(S.time * 8 + p.phase)) * 0.08;
  }
}
function pedTargets() {
  return peds.filter((p) => !p.dead).map((p) => ({
    x: p.x, z: p.z, health: 30,
    onHit: () => {
      if (p.dead) return;
      p.dead = true;
      p.mesh.rotation.x = -Math.PI / 2;
      p.mesh.position.y = 0.4;
      addWanted(1);
      S.message = 'PEDESTRIAN DOWN — the cops saw that';
      S.messageUntil = S.time + 2.5;
      setTimeout(() => { scene.remove(p.mesh); }, 4000);
    },
  }));
}

// ---- camera ----
let camYaw = Math.PI * 0.75, camPitch = 0.32, camDist = 8;
let menuAngle = 0.6;
let lastCar = null; // abandoned player car, re-enterable

function updateCamera(dt) {
  if (S.shotMode) return; // staged shot cameras stay fixed
  if (!S.started) {
    menuAngle += dt * 0.05;
    camera.position.set(Math.sin(menuAngle) * 130, 42, Math.cos(menuAngle) * 130);
    camera.lookAt(0, 12, 0);
    return;
  }
  const md = consumeMouse();
  camYaw -= md.dx * 0.004;
  camPitch = Math.max(0.05, Math.min(1.1, camPitch + md.dy * 0.003));
  let tx, tz, ty;
  if (S.inCar && S.car) {
    tx = S.car.mesh.position.x; tz = S.car.mesh.position.z; ty = 2.2;
    camYaw = S.car.heading + Math.PI;
    camDist = 11;
  } else {
    tx = S.px; tz = S.pz; ty = 1.6;
    camDist = 8;
  }
  const cx = tx - Math.sin(camYaw) * Math.cos(camPitch) * camDist;
  const cz = tz - Math.cos(camYaw) * Math.cos(camPitch) * camDist;
  const cy = ty + Math.sin(camPitch) * camDist;
  camera.position.set(cx, cy, cz);
  camera.lookAt(tx, ty + 0.6, tz);
}

// ---- car enter / exit ----
function tryEnterExitCar() {
  if (S.inCar) {
    // exit: leave the car where it is, step out beside it
    const c = S.car;
    S.inCar = false;
    S.car = null;
    lastCar = c;
    S.px = c.mesh.position.x + Math.cos(c.heading) * 2.5;
    S.pz = c.mesh.position.z - Math.sin(c.heading) * 2.5;
    S.heading = c.heading;
    playerGroup().visible = true;
    S.message = 'ON FOOT'; S.messageUntil = S.time + 1.2;
    return;
  }
  if (lastCar && Math.hypot(lastCar.mesh.position.x - S.px, lastCar.mesh.position.z - S.pz) < 5) {
    S.inCar = true; S.car = lastCar;
    playerGroup().visible = false;
    S.message = lastCar.mesh.userData.def.name; S.messageUntil = S.time + 1.5;
    return;
  }
  const near = nearestTrafficCar(S.px, S.pz, 5);
  if (near) {
    const type = near.type;
    const x = near.mesh.position.x, z = near.mesh.position.z, h = near.mesh.rotation.y;
    removeTrafficCar(scene, near);
    const car = createPlayerCar(scene, type, x, z, h);
    S.inCar = true; S.car = car;
    playerGroup().visible = false;
    S.carsJacked++;
    addWanted(1);
    S.jackedAt = S.time;
    S.message = 'CARJACKED · ' + car.mesh.userData.def.name + ' · +1 STAR';
    S.messageUntil = S.time + 2.5;
  }
}

// ---- crew abilities ----
function useCrew(id) {
  if (S.crewCd[id] > 0) return;
  if (id === 'MARA') {
    if (S.wanted === 0) return;
    setWanted(S.wanted - 1);
    S.crewCd.MARA = 90;
    S.message = 'MARA · GHOST — plates swapped, -1 star';
  } else if (id === 'SULLY') {
    if (!S.inCar || !S.car) return;
    S.car.condition = 100;
    S.crewCd.SULLY = 60;
    S.message = 'SULLY · PIT CREW — ride fully repaired';
  } else if (id === 'KIKI') {
    S.lookoutUntil = S.time + 20;
    S.crewCd.KIKI = 60;
    S.message = 'KIKI · LOOKOUT — patrols revealed on the map';
  }
  S.messageUntil = S.time + 2.5;
}

// ---- autopilot (F9) ----
function updateAutopilot(dt) {
  if (!S.autopilot || !S.missionActive) return;
  const [tx, tz] = missionTargetPos();
  const dx = tx - S.px, dz = tz - S.pz;
  const want = Math.atan2(dx, dz);
  if (S.inCar && S.car) {
    let dh = want - S.car.heading;
    while (dh > Math.PI) dh -= Math.PI * 2;
    while (dh < -Math.PI) dh += Math.PI * 2;
    S.car.heading += Math.max(-1.4 * dt, Math.min(1.4 * dt, dh));
    S.car.speed = Math.min(S.car.speed + 10 * dt, 22);
    const nx = S.car.mesh.position.x + Math.sin(S.car.heading) * S.car.speed * dt;
    const nz = S.car.mesh.position.z + Math.cos(S.car.heading) * S.car.speed * dt;
    const fixed = world.resolveCircle(nx, nz, 1.6);
    S.car.mesh.position.x = fixed.x; S.car.mesh.position.z = fixed.z;
    S.car.mesh.rotation.y = S.car.heading;
    S.px = fixed.x; S.pz = fixed.z;
    S.carSpeed = S.car.speed;
  } else {
    S.heading = want;
    const nx = S.px + Math.sin(want) * 5.5 * dt;
    const nz = S.pz + Math.cos(want) * 5.5 * dt;
    const fixed = world.resolveCircle(nx, nz, 0.6);
    S.px = fixed.x; S.pz = fixed.z;
  }
}

// ---- debug API ----
window.__solara = {
  version: 'r10',
  S,
  get traffic() { return getTraffic(); },
  get policeCount() { return policeCount(); },
  get peds() { return peds; },
  get geckos() { return world.geckos; },
  get policeDots() { return policeDots(); },
  hurt: (n) => hurtPlayer(n),
  get calls() { return renderer.info.render.calls; },
  get tris() { return renderer.info.render.triangles; },
  get frames() { return frames; },
  getState() { return JSON.parse(JSON.stringify({ ...S, car: undefined, crewCd: S.crewCd })); },
};
function policeDots() {
  // positions for the minimap: derive from units list via live cruiser/officer meshes
  const dots = [];
  for (const c of getCruisers()) dots.push({ x: c.x, z: c.z });
  for (const o of getOfficers()) dots.push({ x: o.x, z: o.z });
  return dots;
}

// ---- staged shots ----
const shot = shotNumber();
if (shot > 0) {
  applyShot(shot, { scene, camera, world });
  if (shot !== 1) {
    document.getElementById('start-screen').style.display = 'none';
    document.getElementById('hud').style.display = 'block';
  }
}

// ---- main loop ----
const clock = new THREE.Clock();
let frames = 0;
function loop() {
  requestAnimationFrame(loop);
  const dt = Math.min(0.05, clock.getDelta());
  S.time += dt;
  for (const k of Object.keys(S.crewCd)) S.crewCd[k] = Math.max(0, S.crewCd[k] - dt);

  if (S.started && !S.paused && !S.over) {
    if (wasPressed('KeyF')) tryEnterExitCar();
    if (wasPressed('KeyE')) tryStartMission();
    if (wasPressed('KeyR')) reload();
    if (wasPressed('KeyQ')) { S.station = (S.station + 1) % RADIO.length; S.message = '♪ ' + RADIO[S.station].name; S.messageUntil = S.time + 2; }
    if (wasPressed('F9')) { S.autopilot = !S.autopilot; S.message = S.autopilot ? 'AUTOPILOT ON' : 'AUTOPILOT OFF'; S.messageUntil = S.time + 2; }
    if (wasPressed('KeyZ')) useCrew('MARA');
    if (wasPressed('KeyX')) useCrew('SULLY');
    if (wasPressed('KeyC')) useCrew('KIKI');
    for (let i = 0; i < 5; i++) if (wasPressed('Digit' + (i + 1))) switchWeapon(i);
    if (wasPressed('KeyM')) { S.mapOpen = !S.mapOpen; if (S.mapOpen) { S.paused = true; document.getElementById('pause-menu').style.display = 'flex'; } }
    if (S.autopilot) updateAutopilot(dt);
    else if (S.inCar && S.car) updatePlayerCar(S.car, dt, world, { isDown });
    else updatePlayer(dt, world, camYaw, () => [...shootableTargets(), ...pedTargets()]);
    // gecko pickup
    const got = world.collectGeckos(S.px, S.pz);
    if (got > 0) {
      S.geckosGot += got;
      playPickup();
      S.message = 'GOLDEN GECKO +' + got + ' · ' + S.geckosGot + '/20';
      S.messageUntil = S.time + 2;
    }
    updateTraffic(dt, scene);
    updatePolice(dt, S.time);
    updateMissions(dt);
    updatePeds(dt);
    updateAudio();
  }
  if (wasPressed('Escape') && S.started) togglePause();
  world.update(dt, S.time);
  updateCamera(dt);
  updateHUD(dt);
  if (S.started) consumeClick();
  endFrame();
  renderer.render(scene, camera);
  frames++;
  if (frames === 3) window.__solaraReady = true;
}
loop();

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
document.getElementById('start-screen').addEventListener('click', () => initAudio(), { once: true });
