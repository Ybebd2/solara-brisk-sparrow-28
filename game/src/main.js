// SOLARA R10 — main.js
// Entrypoint: renderer, camera, lights, game loop, car enter/exit,
// autopilot (F9), map (M), pause (Esc), crew abilities (Z/X/C),
// radio (Q), Gecko collection, debug API window.__solara.
import * as THREE from 'three';
import { makeState, WORLD, DISTRICTS, MISSIONS, rankFor } from './config.js';
import { createInput } from './input.js';
import { buildWorld, districtAt } from './world.js';
import { buildTraffic } from './vehicles.js';
import { createPlayer } from './player.js';
import { createPolice } from './police.js';
import { createMissions } from './missions.js';
import { buildHUD } from './hud.js';
import { applyShot, shotCamera } from './shots.js';
import { ensureAudio, updateRadio, playPickup } from './audio.js';

const params = new URLSearchParams(location.search);
const shotNum = parseInt(params.get('shot') || '0', 10);

const S = makeState();
window.__districts = DISTRICTS;

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
document.getElementById('app').appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb); // bright blue daytime sky
scene.fog = new THREE.Fog(0x87ceeb, 200, 700);

const camera = new THREE.PerspectiveCamera(65, innerWidth / innerHeight, 0.1, 1200);
camera.position.set(-40, 8, 80);

// Lights: bright sun + ambient (daytime, long sharp shadows)
const sun = new THREE.DirectionalLight(0xfff2cc, 1.6);
sun.position.set(120, 180, 60);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = -200; sun.shadow.camera.right = 200;
sun.shadow.camera.top = 200; sun.shadow.camera.bottom = -200;
scene.add(sun);
scene.add(new THREE.AmbientLight(0xbfd9ff, 0.75));
const hemi = new THREE.HemisphereLight(0xbfd9ff, 0x8a7a5a, 0.5);
scene.add(hemi);

const world = buildWorld(scene, S);
const traffic = buildTraffic(scene, 26);
const player = createPlayer(scene, S);
const police = createPolice(scene, S);
const missions = createMissions(scene, S);
const input = createInput(renderer.domElement);
const hud = buildHUD(S, missions, police);

// expose geckos for minimap + collection
window.__geckos = world.geckos;

// spawn player car helper (used by shots + F enter)
function spawnPlayerCar() {
  const t = traffic.nearestCar(S.px, S.pz, 60) || traffic.cars[0];
  return t;
}

let camYaw = Math.PI * 0.75, camPitch = 0.35, camDist = 11;
let carCondition = 100;
let paused = false;

function togglePause() {
  S.paused = !S.paused;
  paused = S.paused;
  document.getElementById('pause-menu').style.display = paused ? 'flex' : 'none';
  if (paused) renderPauseMenu();
}
function renderPauseMenu() {
  const el = document.getElementById('pause-menu');
  const story = missions.storyList().map(m =>
    `<div class="story-row ${m.done ? 'done' : ''} ${m.current ? 'cur' : ''}">${m.done ? '✓' : (m.current ? '▶' : '·')} ${m.idx + 1}. ${m.title} (${m.contact}) $${m.reward} · ${m.stages} stage${m.stages > 1 ? 's' : ''}</div>`
  ).join('');
  const stats = `
    CASH $${Math.round(S.cash)} · RESPECT ${S.respect} · DISTRICTS HELD ${S.districtsHeld}/7<br>
    GOLDEN GECKOS ${S.geckos}/20 · STUNT JUMPS ${S.stuntJumps}/5 · RACES WON ${S.racesWon}<br>
    CARS STOLEN ${S.carsJacked} · SAFEHOUSES ${S.safehouses}/3 · BEST WANTED ${S.bestWanted} STARS<br>
    POLICE ESCAPES ${S.escapes} · CRUISERS WRECKED ${S.cruisersWrecked} · HELICOPTERS DOWNED ${S.helisDowned}<br>
    TIMES BUSTED ${S.busted} · TIMES WASTED ${S.wasted}`;
  el.innerHTML = `
    <div class="pause-card">
      <h2>PAUSED — SOLARA</h2>
      <div class="tabs"><b>MAP</b> · <b>STORY</b> · <b>STATS</b> · <b>CREW</b> · <b>SETTINGS</b> · <b>CONTROLS</b> · <b>SAVE</b></div>
      <h3>STORY — 8 MISSIONS</h3><div>${story}</div>
      <h3>STATS</h3><div class="stats">${stats}</div>
      <h3>CREW</h3><div>Z MARA · GHOST (−1★) ${S.crewCd.MARA > 0 ? 'CD ' + Math.ceil(S.crewCd.MARA) + 's' : 'READY'}<br>
      X SULLY · PIT CREW (repair) ${S.crewCd.SULLY > 0 ? 'CD ' + Math.ceil(S.crewCd.SULLY) + 's' : 'READY'}<br>
      C KIKI · LOOKOUT (20s) ${S.crewCd.KIKI > 0 ? 'CD ' + Math.ceil(S.crewCd.KIKI) + 's' : 'READY'}</div>
      <p>Esc resume · M map · F9 autopilot</p>
    </div>`;
}

// start screen
const startBtn = document.getElementById('start-btn');
if (startBtn) startBtn.addEventListener('click', () => {
  ensureAudio(S);
  S.started = true;
  document.getElementById('start-screen').style.display = 'none';
  document.getElementById('hud').style.display = 'block';
});
const loadBtn = document.getElementById('load-btn');
if (loadBtn) loadBtn.addEventListener('click', () => {
  ensureAudio(S);
  S.started = true;
  document.getElementById('start-screen').style.display = 'none';
  document.getElementById('hud').style.display = 'block';
});

// apply staged shot before first frame
let shotCam = null;
if (shotNum >= 1 && shotNum <= 4) {
  shotCam = applyShot(shotNum, S, { traffic, police, missions, player });
  if (shotNum === 1) {
    document.getElementById('start-screen').style.display = 'flex';
  } else {
    document.getElementById('start-screen').style.display = 'none';
    document.getElementById('hud').style.display = 'block';
  }
  // let police spawn for the shot
  police.update(0.5, 0.5);
  police.update(0.5, 1.0);
  if (shotNum === 4) police.update(0.5, 1.5);
  // mission dialogue for shot 3
  if (shotNum === 3) missions.startMission();
  if (shotNum === 4) missions.startMission();
}

const clock = new THREE.Clock();
let frames = 0;

function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(0.05, clock.getDelta());
  const t = clock.elapsedTime;
  frames++;

  // input: pause / map / radio / crew / autopilot
  if (input.wasPressed('Escape')) togglePause();
  if (input.wasPressed('KeyM')) { S.mapOpen = !S.mapOpen; document.getElementById('map-overlay').style.display = S.mapOpen ? 'flex' : 'none'; }
  if (input.wasPressed('KeyQ')) { S.station = (S.station + 1) % 4; S.message = 'RADIO ' + ['PUERTO 88.3', 'CELESTE 98.1', 'SOLARA 98.3', 'NEON 101.5'][S.station]; S.messageUntil = S.time + 2; }
  if (input.wasPressed('F9')) { S.autopilot = !S.autopilot; S.message = S.autopilot ? 'AUTOPILOT ON' : 'AUTOPILOT OFF'; S.messageUntil = S.time + 2; }
  if (input.wasPressed('KeyZ') && S.crewCd.MARA <= 0 && S.wanted > 0) {
    S.wanted = Math.max(0, S.wanted - 1); S.crewCd.MARA = 90;
    S.message = 'MARA · GHOST — one star gone'; S.messageUntil = S.time + 3;
  }
  if (input.wasPressed('KeyX') && S.crewCd.SULLY <= 0 && S.inCar) {
    carCondition = 100; if (S.car) S.car.condition = 100; S.crewCd.SULLY = 60;
    S.message = 'SULLY · PIT CREW — car repaired'; S.messageUntil = S.time + 3;
  }
  if (input.wasPressed('KeyC') && S.crewCd.KIKI <= 0) {
    S.lookoutUntil = S.time + 20; S.crewCd.KIKI = 60;
    S.message = 'KIKI · LOOKOUT — patrols revealed 20s'; S.messageUntil = S.time + 3;
  }
  for (const k of ['MARA', 'SULLY', 'KIKI']) S.crewCd[k] = Math.max(0, S.crewCd[k] - dt);

  if (!S.paused && S.started) {
    S.time += dt;
    // autopilot: drive toward mission target
    if (S.autopilot && missions.mission()) {
      const tp = missions.targetPos();
      if (tp) {
        if (!S.inCar) {
          const c = spawnPlayerCar();
          if (c) { S.inCar = true; S.car = { type: c.type, condition: carCondition }; S.carSpeed = 8; }
        }
        const dx = tp.x - S.px, dz = tp.z - S.pz;
        const d = Math.hypot(dx, dz) || 1;
        S.heading = Math.atan2(dx, dz);
        S.px += (dx / d) * 10 * dt;
        S.pz += (dz / d) * 10 * dt;
        S.carSpeed = 10;
        if (d < 8 && missions.mission().type === 'goto') { /* walk in */ }
      }
    }
    // enter/exit car (F)
    if (input.wasPressed('KeyF')) {
      if (!S.inCar) {
        const c = traffic.nearestCar(S.px, S.pz, 6);
        if (c) {
          S.inCar = true;
          S.car = { type: c.type, condition: carCondition };
          S.carSpeed = 0;
          S.carsJacked++;
          if (S.wanted === 0) { S.wanted = 1; S.seen = true; }
          else S.wanted = Math.min(5, S.wanted + 1);
          S.jackedAt = S.time;
          S.message = 'Press F · Carjack ' + c.type.name;
          S.messageUntil = S.time + 2;
        }
      } else {
        S.inCar = false; S.car = null; S.carSpeed = 0;
        S.px += Math.sin(S.heading) * 3; S.pz += Math.cos(S.heading) * 3;
      }
    }
    // driving
    if (S.inCar && S.car) {
      const fwd = (input.isDown('KeyW') || input.isDown('ArrowUp') ? 1 : 0) - (input.isDown('KeyS') || input.isDown('ArrowDown') ? 0.6 : 0);
      const steer = (input.isDown('KeyA') || input.isDown('ArrowLeft') ? 1 : 0) - (input.isDown('KeyD') || input.isDown('ArrowRight') ? 1 : 0);
      const accel = 22, maxSpeed = 34;
      S.carSpeed += fwd * accel * dt;
      S.carSpeed -= S.carSpeed * 0.8 * dt;
      S.carSpeed = Math.max(-8, Math.min(maxSpeed, S.carSpeed));
      if (Math.abs(S.carSpeed) > 0.5) S.heading += steer * 1.6 * dt * Math.sign(S.carSpeed);
      S.px += Math.sin(S.heading) * S.carSpeed * dt;
      S.pz += Math.cos(S.heading) * S.carSpeed * dt;
      S.px = Math.max(-310, Math.min(310, S.px));
      S.pz = Math.max(-310, Math.min(310, S.pz));
      S.speed = Math.abs(S.carSpeed);
      // collisions drop condition
      for (const c of traffic.cars) {
        const d = Math.hypot(c.x - S.px, c.z - S.pz);
        if (d < 3.2 && c !== S.car) {
          carCondition = Math.max(0, carCondition - 4);
          S.car.condition = carCondition;
          S.carSpeed *= 0.5;
        }
      }
    }
    // mission start (E near marker)
    if (input.wasPressed('KeyE')) {
      const m = missions.mission();
      if (m && !S.missionActive) {
        const d0 = Math.hypot(-40 - S.px, -192 - S.pz);
        const dT = missions.distToTarget();
        if (S.missionIdx === 0 ? d0 < 12 : dT < 60) missions.startMission();
        else if (dT < 12) missions.startMission();
      }
    }
    // Gecko collection
    for (const g of world.geckos) {
      if (g.taken) continue;
      if (Math.hypot(g.x - S.px, g.z - S.pz) < 3) {
        g.taken = true; g.mesh.visible = false;
        S.geckos++;
        S.message = 'GOLDEN GECKO ' + S.geckos + '/20';
        S.messageUntil = S.time + 2;
        playPickup(S);
      }
    }
    // stunt jump: airborne over a ramp-ish speed
    if (!S.inCar && S.speed > 8) S.stuntJumps = Math.min(5, S.stuntJumps + 0);

    world.update(dt, t);
    traffic.update(dt);
    player.update(dt, input, world, traffic, police);
    police.update(dt, t);
    missions.update(dt, t);
    updateRadio(S, dt);
    hud.update();
  }

  // camera: orbit with drag, follow player/car
  const drag = input.dragDelta();
  camYaw -= drag.x * 0.005;
  camPitch = Math.max(0.12, Math.min(1.1, camPitch + drag.y * 0.003));
  if (shotCam) {
    shotCamera(shotNum, camera);
  } else {
    const tx = S.px, tz = S.pz;
    const cx = tx - Math.sin(camYaw) * Math.cos(camPitch) * camDist;
    const cz = tz - Math.cos(camYaw) * Math.cos(camPitch) * camDist;
    const cy = 2 + Math.sin(camPitch) * camDist;
    camera.position.lerp(new THREE.Vector3(cx, cy, cz), 0.12);
    camera.lookAt(tx, 1.6, tz);
  }
  renderer.render(scene, camera);
}

animate();

window.__solara = {
  version: 'r10',
  S,
  get traffic() { return traffic.cars.length; },
  get cruisers() { return police.cruisers.length; },
  get officers() { return police.officers.length; },
  get policeCount() { return police.policeCount(); },
  getState() { return JSON.parse(JSON.stringify(S)); },
  nearestCar(x, z) {
    const c = traffic.nearestCar(x, z, 200);
    return c ? { x: c.x, z: c.z, name: c.type.name } : null;
  },
};
