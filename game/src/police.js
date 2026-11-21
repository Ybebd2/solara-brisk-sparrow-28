// SOLARA R10 — police: wanted levels, cruisers, officers, heli with a LIVE
// searchlight beam, roadblocks. CRITICAL: everything despawns at wanted 0.
import * as THREE from 'three';
import { S } from './config.js';
import { makeCarMesh } from './vehicles.js';

const ROAD_LINES = [-256, -192, -128, -64, 0, 64, 128, 192, 256];

const UNIT_NAMES = ['KITE-1', 'MARLIN-3', 'CORAL-48', 'CORAL-85', 'PELICAN-11', 'BARRACUDA-18', 'MANTA-32', 'GECKO-25'];

let scene, world;
let cruisers = [];   // {mesh, name, health, speed, status}
let officers = [];   // {mesh, name, health, status, bustT}
let heli = null;     // {group, beam, pool, lamp, name, alt}
let roadblocks = [];
let spawnCd = 0;

export function initPolice(sc, wd) {
  scene = sc; world = wd;
  cruisers = []; officers = []; heli = null; roadblocks = [];
}

function makeOfficerMesh() {
  const g = new THREE.Group();
  const navy = new THREE.MeshStandardMaterial({ color: 0x1a2a4a, roughness: 0.8 });
  const skin = new THREE.MeshStandardMaterial({ color: 0xc98d64, roughness: 0.8 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.7, 0.34), navy);
  body.position.y = 1.15; body.castShadow = true; g.add(body);
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.4, 0.36), skin);
  head.position.y = 1.72; g.add(head);
  const cap = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.12, 0.4), navy);
  cap.position.y = 1.95; g.add(cap);
  for (const sx of [-0.15, 0.15]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.75, 0.22), navy);
    leg.position.set(sx, 0.38, 0); g.add(leg);
  }
  const gun = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.1, 0.4),
    new THREE.MeshStandardMaterial({ color: 0x222222 }));
  gun.position.set(0.3, 1.1, 0.3); g.add(gun);
  return g;
}

function makeHeli() {
  const g = new THREE.Group();
  const white = new THREE.MeshStandardMaterial({ color: 0xf5f5f5, roughness: 0.4 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x14202e, roughness: 0.2, metalness: 0.4 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.4, 4.6), white);
  body.castShadow = true; g.add(body);
  const glass = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.8, 1.4), dark);
  glass.position.set(0, 0.2, 1.6); g.add(glass);
  const tail = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 3.4), white);
  tail.position.set(0, 0.3, -3.8); g.add(tail);
  const fin = new THREE.Mesh(new THREE.BoxGeometry(0.2, 1.2, 0.9), white);
  fin.position.set(0, 0.9, -5.2); g.add(fin);
  const rotor = new THREE.Mesh(new THREE.BoxGeometry(9, 0.08, 0.5), dark);
  rotor.position.y = 1.05; g.add(rotor);
  const rotor2 = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.08, 9), dark);
  rotor2.position.y = 1.05; g.add(rotor2);
  // spotlight lamp UNDER the nose
  const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.32, 10, 8),
    new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xfff6c9, emissiveIntensity: 2 }));
  lamp.position.set(0, -0.85, 1.9); g.add(lamp);
  // beam cone: apex at the lamp, opening downward (computed live)
  const beamGeo = new THREE.ConeGeometry(4.2, 1, 20, 1, true);
  beamGeo.translate(0, -0.5, 0);
  const beam = new THREE.Mesh(beamGeo,
    new THREE.MeshBasicMaterial({ color: 0xfff2b0, transparent: true, opacity: 0.22, side: THREE.DoubleSide, depthWrite: false }));
  scene.add(beam); // scene child: positioned in world space each frame
  const pool = new THREE.Mesh(new THREE.CircleGeometry(4.2, 24),
    new THREE.MeshBasicMaterial({ color: 0xfff2b0, transparent: true, opacity: 0.4, depthWrite: false }));
  pool.rotation.x = -Math.PI / 2;
  scene.add(pool);
  const spot = new THREE.SpotLight(0xfff2b0, 60, 60, 0.35, 0.5, 1);
  g.add(spot); spot.position.set(0, -0.85, 1.9);
  g.userData.rotor = rotor; g.userData.rotor2 = rotor2; g.userData.spot = spot;
  scene.add(g);
  return { group: g, beam, pool, lamp, name: 'AIR-1', alt: 26 };
}

function spawnPos() {
  // on a road, ~70-90m from the player
  const line = ROAD_LINES[Math.floor(Math.random() * ROAD_LINES.length)];
  const horiz = Math.random() < 0.5;
  const d = 70 + Math.random() * 25;
  const a = Math.random() * Math.PI * 2;
  let x = S.px + Math.cos(a) * d, z = S.pz + Math.sin(a) * d;
  if (horiz) z = line + (Math.random() < 0.5 ? 5 : -5); else x = line + (Math.random() < 0.5 ? 5 : -5);
  x = Math.max(-300, Math.min(300, x)); z = Math.max(-300, Math.min(300, z));
  return { x, z };
}

function spawnCruiser(name) {
  const p = spawnPos();
  const mesh = makeCarMesh('police');
  mesh.position.set(p.x, 0, p.z);
  scene.add(mesh);
  const c = { mesh, name, health: 100, speed: 0, status: 'SEARCHING', x: p.x, z: p.z, heading: 0 };
  cruisers.push(c);
  return c;
}
function spawnOfficer(name) {
  const p = spawnPos();
  const mesh = makeOfficerMesh();
  mesh.position.set(p.x, 0, p.z);
  scene.add(mesh);
  const o = { mesh, name, health: 60, status: 'SEARCHING', x: p.x, z: p.z, bustT: 0 };
  officers.push(o);
  return o;
}
function spawnRoadblock() {
  const p = spawnPos();
  const g = new THREE.Group();
  for (let i = 0; i < 3; i++) {
    const car = makeCarMesh('police');
    car.position.set(-3 + i * 3, 0, 0);
    car.rotation.y = Math.PI / 2;
    g.add(car);
  }
  g.position.set(p.x, 0, p.z);
  g.rotation.y = Math.random() * Math.PI;
  scene.add(g);
  roadblocks.push(g);
}

export function despawnAll() {
  for (const c of cruisers) scene.remove(c.mesh);
  for (const o of officers) scene.remove(o.mesh);
  for (const r of roadblocks) scene.remove(r);
  if (heli) { scene.remove(heli.group); scene.remove(heli.pool); scene.remove(heli.beam); }
  cruisers = []; officers = []; roadblocks = []; heli = null;
}

export function policeCount() { return cruisers.length + officers.length + (heli ? 1 : 0); }
export function getCruisers() { return cruisers; }
export function getOfficers() { return officers; }

export function policeUnits() {
  const units = [];
  for (const c of cruisers) units.push({ name: c.name, dist: Math.round(Math.hypot(c.x - S.px, c.z - S.pz)), status: c.status });
  for (const o of officers) units.push({ name: o.name, dist: Math.round(Math.hypot(o.x - S.px, o.z - S.pz)), status: o.status });
  if (heli) units.push({ name: 'AIR-1', dist: Math.round(Math.hypot(heli.group.position.x - S.px, heli.group.position.z - S.pz)), status: 'AIRBORNE' });
  return units;
}

export function setWanted(n) {
  S.wanted = Math.max(0, Math.min(5, n));
  if (S.wanted > S.bestWanted) S.bestWanted = S.wanted;
  if (S.wanted === 0) { despawnAll(); S.seen = false; S.evading = 0; }
}

export function addWanted(n) { setWanted(S.wanted + n); }

function updateHeli(dt, t) {
  if (!heli) return;
  const h = heli;
  // orbit above the player, beam apex at the lamp under the nose
  const a = t * 0.35;
  const hx = S.px + Math.cos(a) * 18, hz = S.pz + Math.sin(a) * 18;
  h.group.position.set(hx, h.alt, hz);
  h.group.rotation.y = Math.atan2(S.px - hx, S.pz - hz);
  h.group.userData.rotor.rotation.y += dt * 22;
  h.group.userData.rotor2.rotation.y += dt * 22;
  // beam: apex at the lamp under the nose, body down to the bright pool
  // at the exact ground point under the player — computed LIVE every frame.
  const lampWorld = new THREE.Vector3();
  h.lamp.getWorldPosition(lampWorld);
  const target = new THREE.Vector3(S.px, 0, S.pz);
  const dir = new THREE.Vector3().subVectors(target, lampWorld);
  const len = Math.max(0.1, dir.length());
  h.beam.position.copy(lampWorld);
  h.beam.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), dir.clone().normalize());
  h.beam.scale.set(1, len, 1);
  h.pool.position.set(S.px, 0.08, S.pz);
  const pulse = 3.8 + Math.sin(t * 6) * 0.4;
  h.pool.scale.set(pulse / 4.2, pulse / 4.2, 1);
  h.group.userData.spot.target.position.copy(h.group.worldToLocal(target.clone()));
  h.group.userData.spot.target.updateMatrixWorld();
}

export function updatePolice(dt, t) {
  spawnCd -= dt;
  if (S.wanted === 0) {
    if (cruisers.length || officers.length || heli || roadblocks.length) despawnAll();
    return;
  }
  if (S.shotMode) {
    // staged shots: spawn the FULL force at once (no game-time gating —
    // headless runs slow), then FREEZE it: police hold position and never
    // ram the player out of frame.
    const wantC = S.wanted >= 2 ? 2 : S.wanted >= 1 ? 1 : 0;
    while (cruisers.length < wantC) spawnCruiser(UNIT_NAMES[cruisers.length % UNIT_NAMES.length]);
    if (S.wanted >= 3 && !heli) heli = makeHeli();
    for (const c of cruisers) c.status = 'SEARCHING';
    for (const o of officers) o.status = 'SEARCHING';
    if (heli) updateHeli(dt, t);
    return;
  }
  // desired force by wanted level
  const wantCruisers = S.wanted >= 3 ? 4 : S.wanted === 2 ? 3 : 2;
  const wantOfficers = S.wanted >= 2 ? 2 : 0;
  const wantHeli = S.wanted >= 3;
  const wantBlocks = S.wanted >= 3 ? 1 : 0;
  if (spawnCd <= 0) {
    if (cruisers.length < wantCruisers) spawnCruiser(UNIT_NAMES[cruisers.length % UNIT_NAMES.length]);
    else if (officers.length < wantOfficers) spawnOfficer(UNIT_NAMES[(cruisers.length + officers.length) % UNIT_NAMES.length]);
    else if (wantHeli && !heli) heli = makeHeli();
    else if (roadblocks.length < wantBlocks) spawnRoadblock();
    spawnCd = 1.2;
  }
  if (wantHeli && !heli) heli = makeHeli();
  if (!wantHeli && heli) { scene.remove(heli.group); scene.remove(heli.pool); scene.remove(heli.beam); heli = null; }

  // visibility: seen if any unit is close
  let nearest = Infinity;
  for (const c of cruisers) nearest = Math.min(nearest, Math.hypot(c.x - S.px, c.z - S.pz));
  for (const o of officers) nearest = Math.min(nearest, Math.hypot(o.x - S.px, o.z - S.pz));
  const wasSeen = S.seen;
  S.seen = nearest < 45;
  if (S.seen) S.evading = Math.max(0, S.evading - dt * 30);
  else S.evading = Math.min(100, S.evading + dt * 12);
  if (!S.seen && S.evading >= 100 && S.wanted > 0) {
    S.escapes++;
    setWanted(S.wanted - 1);
    S.evading = 0;
    S.message = S.wanted === 0 ? 'YOU LOST THE COPS' : 'HEAT DROPPED — ' + S.wanted + ' STARS';
    S.messageUntil = S.time + 2.5;
  }

  // cruisers: chase + ram
  for (const c of cruisers) {
    const dx = S.px - c.x, dz = S.pz - c.z;
    const d = Math.hypot(dx, dz) || 1;
    c.status = d < 14 ? 'FIRING' : d < 45 ? 'PURSUIT' : 'SEARCHING';
    if (c.health <= 0) {
      c.status = 'WRECKED';
      continue;
    }
    const sp = c.status === 'PURSUIT' || c.status === 'FIRING' ? 20 : 12;
    c.heading = Math.atan2(dx, dz);
    c.x += Math.sin(c.heading) * sp * dt;
    c.z += Math.cos(c.heading) * sp * dt;
    const fixed = world.resolveCircle(c.x, c.z, 1.6);
    c.x = fixed.x; c.z = fixed.z;
    c.mesh.position.x = c.x; c.mesh.position.z = c.z;
    c.mesh.rotation.y = c.heading;
    if (d < 3.2) {
      // ram: damage player / car
      if (S.inCar && S.car) {
        S.car.condition = Math.max(0, S.car.condition - 12 * dt);
        if (S.car.condition <= 0) { S.message = 'YOUR RIDE IS WRECKED'; S.messageUntil = S.time + 2; }
      } else {
        hurtPlayer(14 * dt);
      }
    }
    if (c.status === 'FIRING' && !S.inCar && d < 30 && Math.random() < dt * 0.5) hurtPlayer(6);
  }
  // officers: chase on foot, bust on touch
  for (const o of officers) {
    const dx = S.px - o.x, dz = S.pz - o.z;
    const d = Math.hypot(dx, dz) || 1;
    o.status = d < 20 ? 'PURSUIT' : 'SEARCHING';
    if (o.health <= 0) { o.status = 'WRECKED'; continue; }
    const sp = 6.5;
    o.x += (dx / d) * sp * dt;
    o.z += (dz / d) * sp * dt;
    o.mesh.position.x = o.x; o.mesh.position.z = o.z;
    o.mesh.rotation.y = Math.atan2(dx, dz);
    if (d < 2.2 && !S.inCar) {
      o.bustT += dt;
      if (o.bustT > 2.5) busted();
    } else o.bustT = 0;
    if (d < 25 && !S.inCar && Math.random() < dt * 0.35) hurtPlayer(4);
  }
  if (heli) updateHeli(dt, t);
}

export function hurtPlayer(amount) {
  if (S.over || S.shotMode) return;
  let left = amount;
  if (S.armour > 0) { const a = Math.min(S.armour, left); S.armour -= a; left -= a; }
  S.health -= left;
  if (S.health <= 0) wasted();
}

export function wasted() {
  if (S.over) return;
  S.over = true; S.wasted++;
  S.cash = Math.max(0, S.cash - 500);
  S.message = 'WASTED'; S.messageUntil = S.time + 3;
  setTimeout(() => {
    S.px = 190; S.pz = -190; S.heading = Math.PI;
    S.health = 100; S.armour = 40;
    setWanted(0);
    S.inCar = false; S.car = null;
    S.over = false;
    S.message = 'Mercy Clinic patched you up · -$500';
    S.messageUntil = S.time + 3;
  }, 2600);
}

function busted() {
  if (S.over) return;
  S.over = true; S.busted++; S.arrests++;
  S.message = 'BUSTED'; S.messageUntil = S.time + 3;
  setTimeout(() => {
    S.px = 0; S.pz = -128; S.heading = 0;
    S.health = 100; S.armour = 40;
    setWanted(0);
    S.inCar = false; S.car = null;
    S.over = false;
    S.message = 'PCPD let you go with a warning';
    S.messageUntil = S.time + 3;
  }, 2600);
}

export function shootableTargets() {
  const list = [];
  for (const c of cruisers) {
    if (c.health <= 0) continue;
    const item = { x: c.x, z: c.z, health: c.health, onHit: () => {
      c.health = item.health; // caller already subtracted dmg from item.health
      if (c.health <= 0 && c.status !== 'WRECKED') {
        c.status = 'WRECKED'; S.cruisersWrecked++;
        S.message = 'CRUISER WRECKED'; S.messageUntil = S.time + 2;
      }
    } };
    list.push(item);
  }
  for (const o of officers) {
    if (o.health <= 0) continue;
    const item = { x: o.x, z: o.z, health: o.health, onHit: () => {
      o.health = item.health;
      if (o.health <= 0 && o.status !== 'WRECKED') {
        o.status = 'WRECKED';
        S.message = 'OFFICER DOWN'; S.messageUntil = S.time + 2;
      }
    } };
    list.push(item);
  }
  if (heli) {
    const item = { x: heli.group.position.x, z: heli.group.position.z, health: heli.hp ?? 200, onHit: () => {
      heli.hp = item.health;
      if (heli.hp <= 0) {
        scene.remove(heli.group); scene.remove(heli.pool); scene.remove(heli.beam); heli = null;
        S.helisDowned++;
        S.message = 'HELICOPTER DOWNED'; S.messageUntil = S.time + 2.5;
      }
    } };
    list.push(item);
  }
  return list;
}
