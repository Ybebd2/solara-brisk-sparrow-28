// SOLARA R10 — vehicles: shaped car models, traffic, player-car physics, carjack.
import * as THREE from 'three';
import { S } from './config.js';

const ROAD_LINES = [-256, -192, -128, -64, 0, 64, 128, 192, 256];

export const CAR_DEFS = {
  sports: { name: 'VELOZ COMET RS', color: 0xe53935, top: 24, len: 4.4, wid: 2.0, h: 0.85 },
  sedan: { name: 'TORTUGA 4X4', color: 0x2e8b8b, top: 20, len: 4.6, wid: 2.0, h: 1.15 },
  taxi: { name: 'CITY TAXI', color: 0x26a69a, top: 18, len: 4.4, wid: 1.9, h: 1.1 },
  van: { name: 'CARGO VAN', color: 0x8d6e3f, top: 15, len: 5.2, wid: 2.2, h: 1.9 },
  whitevan: { name: 'WHITE VAN', color: 0xe8e8e8, top: 15, len: 5.0, wid: 2.1, h: 1.8 },
  pickup: { name: 'DESERT PICKUP', color: 0x5d8a4a, top: 17, len: 4.8, wid: 2.0, h: 1.25 },
  coupe: { name: 'KURAMA PELO GT', color: 0xff8c1a, top: 26, len: 4.3, wid: 2.0, h: 0.8 },
  police: { name: 'PCPD CRUISER', color: 0xf5f5f5, top: 22, len: 4.6, wid: 2.0, h: 1.1 },
};

const wheelGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.35, 12);
const wheelMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.9 });
const hubGeo = new THREE.CylinderGeometry(0.2, 0.2, 0.37, 8);
const hubMat = new THREE.MeshStandardMaterial({ color: 0xd8d8d8, metalness: 0.7, roughness: 0.35 });

export function makeCarMesh(type) {
  const def = CAR_DEFS[type] || CAR_DEFS.sedan;
  const g = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({ color: def.color, roughness: 0.35, metalness: 0.35 });
  const glassMat = new THREE.MeshStandardMaterial({ color: 0x14202e, roughness: 0.15, metalness: 0.6 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(def.wid, def.h, def.len), bodyMat);
  body.position.y = 0.75; body.castShadow = true; g.add(body);
  if (type === 'sports' || type === 'coupe') {
    // low wedge: sloped nose + black canopy
    const nose = new THREE.Mesh(new THREE.BoxGeometry(def.wid * 0.92, 0.42, 1.1), bodyMat);
    nose.position.set(0, 0.62, def.len / 2 - 0.3); nose.rotation.x = 0.1; g.add(nose);
    const canopy = new THREE.Mesh(new THREE.BoxGeometry(def.wid * 0.8, 0.5, 1.7), glassMat);
    canopy.position.set(0, 1.32, -0.25); canopy.castShadow = true; g.add(canopy);
    const spoiler = new THREE.Mesh(new THREE.BoxGeometry(def.wid * 0.95, 0.1, 0.5), blackMat());
    spoiler.position.set(0, 1.28, -def.len / 2 + 0.15); g.add(spoiler);
  } else if (type === 'van' || type === 'whitevan') {
    const cab = new THREE.Mesh(new THREE.BoxGeometry(def.wid * 0.9, 0.7, 1.4), glassMat);
    cab.position.set(0, 1.9, def.len / 2 - 1.0); g.add(cab);
  } else {
    const cab = new THREE.Mesh(new THREE.BoxGeometry(def.wid * 0.82, 0.62, 2.1), glassMat);
    cab.position.set(0, 1.32, -0.2); cab.castShadow = true; g.add(cab);
  }
  if (type === 'police') {
    const hood = new THREE.Mesh(new THREE.BoxGeometry(def.wid * 0.98, 0.1, 1.5), blackMat());
    hood.position.set(0, 1.22, def.len / 2 - 0.9); g.add(hood);
    const roof = new THREE.Mesh(new THREE.BoxGeometry(def.wid * 0.98, 0.1, 1.6), blackMat());
    roof.position.set(0, 1.62, -0.2); g.add(roof);
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.28, def.len * 0.9),
      new THREE.MeshStandardMaterial({ color: 0xffd21f, emissive: 0xcc9900, emissiveIntensity: 0.4 }));
    stripe.position.set(def.wid / 2 + 0.01, 0.95, 0); g.add(stripe);
    const stripe2 = stripe.clone(); stripe2.position.x = -def.wid / 2 - 0.01; g.add(stripe2);
    const bar = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.22, 0.4),
      new THREE.MeshStandardMaterial({ color: 0xd21f1f, emissive: 0xff2222, emissiveIntensity: 1.2 }));
    bar.position.set(0, 1.78, -0.2); g.add(bar);
    const bar2 = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.22, 0.4),
      new THREE.MeshStandardMaterial({ color: 0x2266ff, emissive: 0x2266ff, emissiveIntensity: 1.2 }));
    bar2.position.set(0.75, 1.78, -0.2); g.add(bar2);
  }
  if (type === 'taxi') {
    const sign = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.28, 0.4),
      new THREE.MeshStandardMaterial({ color: 0xffd21f, emissive: 0xcc9900, emissiveIntensity: 0.7 }));
    sign.position.set(0, 1.85, -0.2); g.add(sign);
  }
  // headlights (white squares ON) + taillight strip (red ON)
  const hlMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xfff8d0, emissiveIntensity: 1.4 });
  for (const sx of [-1, 1]) {
    const hl = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.24, 0.08), hlMat);
    hl.position.set(sx * (def.wid / 2 - 0.35), 0.85, def.len / 2 + 0.02); g.add(hl);
  }
  const tl = new THREE.Mesh(new THREE.BoxGeometry(def.wid * 0.85, 0.2, 0.08),
    new THREE.MeshStandardMaterial({ color: 0xd21f1f, emissive: 0xff2222, emissiveIntensity: 1.0 }));
  tl.position.set(0, 0.9, -def.len / 2 - 0.02); g.add(tl);
  // wheels + bumpers
  for (const [wx, wz] of [[-1, 1], [1, 1], [-1, -1], [1, -1]]) {
    const w = new THREE.Mesh(wheelGeo, wheelMat);
    w.rotation.z = Math.PI / 2;
    w.position.set(wx * (def.wid / 2 - 0.05), 0.42, wz * (def.len / 2 - 0.85));
    w.castShadow = true; g.add(w);
    const hub = new THREE.Mesh(hubGeo, hubMat);
    hub.rotation.z = Math.PI / 2;
    hub.position.copy(w.position); g.add(hub);
  }
  const bump = new THREE.Mesh(new THREE.BoxGeometry(def.wid, 0.3, 0.25), blackMat());
  bump.position.set(0, 0.42, def.len / 2 + 0.05); g.add(bump);
  const bump2 = bump.clone(); bump2.position.z = -def.len / 2 - 0.05; g.add(bump2);
  g.userData.def = def;
  return g;
}
function blackMat() { return new THREE.MeshStandardMaterial({ color: 0x141414, roughness: 0.6 }); }

export function makeMotorcycle() {
  const g = new THREE.Group();
  const red = new THREE.MeshStandardMaterial({ color: 0xd21f1f, roughness: 0.4, metalness: 0.3 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 2.0), red);
  body.position.y = 0.75; g.add(body);
  const seat = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.18, 0.9), blackMat());
  seat.position.set(0, 1.05, -0.4); g.add(seat);
  for (const wz of [0.75, -0.75]) {
    const w = new THREE.Mesh(new THREE.TorusGeometry(0.38, 0.12, 8, 14), wheelMat);
    w.position.set(0, 0.38, wz); g.add(w);
  }
  const rider = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.9, 0.5),
    new THREE.MeshStandardMaterial({ color: 0xff5d5d, roughness: 0.8 }));
  rider.position.set(0, 1.55, -0.35); g.add(rider);
  const helm = new THREE.Mesh(new THREE.SphereGeometry(0.28, 10, 8), red);
  helm.position.set(0, 2.15, -0.3); g.add(helm);
  g.userData.def = { name: 'RED MOTORCYCLE', color: 0xd21f1f, top: 20, len: 2.2, wid: 0.6, h: 1 };
  return g;
}

let traffic = [];
let trafficTypes = ['sedan', 'taxi', 'van', 'whitevan', 'pickup', 'sedan', 'taxi', 'coupe', 'sedan', 'van'];

export function initTraffic(scene, count = 26) {
  traffic = [];
  for (let i = 0; i < count; i++) spawnTrafficCar(scene, i);
  return traffic;
}
function spawnTrafficCar(scene, i) {
  const horiz = i % 2 === 0;
  const line = ROAD_LINES[Math.floor(i / 2) % ROAD_LINES.length];
  const dir = (i % 4 < 2) ? 1 : -1;
  const lane = (dir > 0 ? 5 : -5);
  const type = trafficTypes[i % trafficTypes.length];
  const mesh = type === 'motorcycle' ? makeMotorcycle() : makeCarMesh(type);
  const pos = -300 + ((i * 97) % 600);
  mesh.position.set(horiz ? pos : line + lane, 0, horiz ? line + lane : pos);
  mesh.rotation.y = horiz ? (dir > 0 ? Math.PI / 2 : -Math.PI / 2) : (dir > 0 ? 0 : Math.PI);
  scene.add(mesh);
  const car = { mesh, type, horiz, line, dir, lane, speed: 8 + (i % 5) * 2, x: mesh.position.x, z: mesh.position.z, player: false, condition: 100, health: 100 };
  traffic.push(car);
  return car;
}

export function updateTraffic(dt, scene) {
  for (const c of traffic) {
    if (c.player) continue;
    const sp = c.speed * dt * c.dir;
    if (c.horiz) { c.x += sp; if (c.x > 315) c.x = -315; if (c.x < -315) c.x = 315; }
    else { c.z += sp; if (c.z > 315) c.z = -315; if (c.z < -315) c.z = 315; }
    c.mesh.position.x = c.x; c.mesh.position.z = c.z;
  }
}

// Player car physics. car = { mesh, type, heading, speed, condition }
export function createPlayerCar(scene, type, x, z, heading) {
  const mesh = makeCarMesh(type);
  mesh.position.set(x, 0, z);
  mesh.rotation.y = heading;
  scene.add(mesh);
  return { mesh, type, heading, speed: 0, condition: 100, player: true };
}
export function updatePlayerCar(car, dt, world, input) {
  const accel = input.isDown('KeyW') || input.isDown('ArrowUp') ? 14 : 0;
  const brake = input.isDown('KeyS') || input.isDown('ArrowDown') ? 18 : 0;
  car.speed += (accel - brake) * dt;
  car.speed -= car.speed * 0.55 * dt;
  if (Math.abs(car.speed) < 0.05 && accel === 0) car.speed = 0;
  car.speed = Math.max(-9, Math.min(34, car.speed));
  const steer = (input.isDown('KeyA') || input.isDown('ArrowLeft') ? 1 : 0) - (input.isDown('KeyD') || input.isDown('ArrowRight') ? 1 : 0);
  if (Math.abs(car.speed) > 0.3) car.heading += steer * 1.7 * dt * Math.sign(car.speed);
  const nx = car.mesh.position.x + Math.sin(car.heading) * car.speed * dt;
  const nz = car.mesh.position.z + Math.cos(car.heading) * car.speed * dt;
  const fixed = world.resolveCircle(nx, nz, 1.6);
  const hitWall = Math.abs(fixed.x - nx) > 0.01 || Math.abs(fixed.z - nz) > 0.01;
  if (hitWall && Math.abs(car.speed) > 6) {
    car.condition = Math.max(0, car.condition - Math.abs(car.speed) * 0.35);
    car.speed *= -0.25;
  }
  car.mesh.position.x = Math.max(-312, Math.min(312, fixed.x));
  car.mesh.position.z = Math.max(-312, Math.min(312, fixed.z));
  car.mesh.rotation.y = car.heading;
  S.carSpeed = car.speed;
  return hitWall;
}
export function carGear(speed) {
  const a = Math.abs(speed);
  if (a < 6) return 'G1'; if (a < 12) return 'G2'; if (a < 19) return 'G3'; if (a < 26) return 'G4'; return 'G5';
}
export function nearestTrafficCar(px, pz, maxD = 5) {
  let best = null, bestD = maxD;
  for (const c of traffic) {
    if (c.player) continue;
    const d = Math.hypot(c.mesh.position.x - px, c.mesh.position.z - pz);
    if (d < bestD) { best = c; bestD = d; }
  }
  return best;
}
export function removeTrafficCar(scene, car) {
  scene.remove(car.mesh);
  traffic = traffic.filter((c) => c !== car);
}
export function getTraffic() { return traffic; }
