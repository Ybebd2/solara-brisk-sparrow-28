// SOLARA R10 — vehicles.js
// Traffic cars + police cruisers. Wedge sports coupes, boxy vans,
// teal taxis with yellow roof signs, red motorcycle with rider.
// Headlights = bright white squares ON; taillights = red strip ON.
import * as THREE from 'three';
import { WORLD } from './config.js';

function mulberry(seed) {
  let t = seed >>> 0;
  return function () {
    t += 0x6D2B79F5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

const CAR_TYPES = [
  { name: 'VELOZ COMET RS', kind: 'sports', color: 0xd32f2f, len: 4.6, wedge: true },
  { name: 'TORTUGA 4X4', kind: 'suv', color: 0x00838f, len: 4.8, wedge: false },
  { name: 'TAXI SEDAN', kind: 'taxi', color: 0x00838f, len: 4.4, wedge: false, taxi: true },
  { name: 'BOXY VAN', kind: 'van', color: 0x8d6e63, len: 5.2, wedge: false },
  { name: 'WHITE VAN', kind: 'van', color: 0xeeeeee, len: 5.2, wedge: false },
  { name: 'BLACK SEDAN', kind: 'sedan', color: 0x212121, len: 4.5, wedge: false },
  { name: 'BLUE SEDAN', kind: 'sedan', color: 0x1565c0, len: 4.5, wedge: false },
  { name: 'YELLOW TAXI', kind: 'taxi', color: 0xf9a825, len: 4.4, wedge: false, taxi: true },
  { name: 'ORANGE COUPE', kind: 'sports', color: 0xef6c00, len: 4.6, wedge: true },
  { name: 'KURAMA PELO GT', kind: 'sports', color: 0xff6d00, len: 4.7, wedge: true },
];

function buildCarMesh(type) {
  const g = new THREE.Group();
  const bodyMat = new THREE.MeshLambertMaterial({ color: type.color });
  const glassMat = new THREE.MeshLambertMaterial({ color: 0x10243e });
  const tireMat = new THREE.MeshLambertMaterial({ color: 0x111111 });
  const rimMat = new THREE.MeshLambertMaterial({ color: 0xcfd8dc });
  const L = type.len, W = 2.0;
  if (type.wedge) {
    // low wedge sports coupe: long flat hood, black canopy, wheel arches
    const body = new THREE.Mesh(new THREE.BoxGeometry(L, 0.55, W), bodyMat);
    body.position.y = 0.55; g.add(body);
    const nose = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.35, W - 0.2), bodyMat);
    nose.position.set(L / 2 - 0.2, 0.45, 0); g.add(nose);
    const canopy = new THREE.Mesh(new THREE.BoxGeometry(L * 0.45, 0.5, W - 0.5), glassMat);
    canopy.position.set(-0.3, 1.0, 0); g.add(canopy);
    const spoiler = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.08, W), bodyMat);
    spoiler.position.set(-L / 2 + 0.15, 1.05, 0); g.add(spoiler);
    const skirt = new THREE.Mesh(new THREE.BoxGeometry(L * 0.8, 0.18, W + 0.1),
      new THREE.MeshLambertMaterial({ color: 0x111111 }));
    skirt.position.y = 0.32; g.add(skirt);
  } else {
    const body = new THREE.Mesh(new THREE.BoxGeometry(L, 0.9, W), bodyMat);
    body.position.y = 0.75; g.add(body);
    const cab = new THREE.Mesh(new THREE.BoxGeometry(L * 0.55, 0.7, W - 0.3), glassMat);
    cab.position.set(-0.2, 1.5, 0); g.add(cab);
    if (type.kind === 'van') {
      const roof = new THREE.Mesh(new THREE.BoxGeometry(L * 0.9, 0.25, W - 0.1), bodyMat);
      roof.position.set(0, 1.95, 0); g.add(roof);
    }
  }
  if (type.taxi) {
    const sign = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.3, 0.5),
      new THREE.MeshBasicMaterial({ color: 0xffea00 }));
    sign.position.set(0, 1.95, 0); g.add(sign);
  }
  // headlights: two bright white squares ON
  const hl = new THREE.MeshBasicMaterial({ color: 0xffffff });
  for (const s of [-1, 1]) {
    const h = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.25, 0.4), hl);
    h.position.set(L / 2 + 0.02, 0.6, s * 0.65); g.add(h);
  }
  // taillights: red strip ON with halo
  const tl = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.2, W - 0.3),
    new THREE.MeshBasicMaterial({ color: 0xff1744 }));
  tl.position.set(-L / 2 - 0.02, 0.65, 0); g.add(tl);
  // wheels with cream/silver rims
  const wheelGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.3, 10);
  for (const [wx, wz] of [[L / 2 - 0.9, W / 2], [L / 2 - 0.9, -W / 2], [-L / 2 + 0.9, W / 2], [-L / 2 + 0.9, -W / 2]]) {
    const w = new THREE.Mesh(wheelGeo, tireMat);
    w.rotation.x = Math.PI / 2;
    w.position.set(wx, 0.42, wz);
    g.add(w);
    const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.32, 8), rimMat);
    rim.rotation.x = Math.PI / 2;
    rim.position.set(wx, 0.42, wz);
    g.add(rim);
  }
  return g;
}

export function buildPoliceCarMesh() {
  const g = new THREE.Group();
  const white = new THREE.MeshLambertMaterial({ color: 0xf5f5f5 });
  const black = new THREE.MeshLambertMaterial({ color: 0x111111 });
  const gold = new THREE.MeshBasicMaterial({ color: 0xffd54f });
  const body = new THREE.Mesh(new THREE.BoxGeometry(4.6, 0.9, 2.0), white);
  body.position.y = 0.75; g.add(body);
  const hood = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.25, 1.9), black);
  hood.position.set(1.5, 1.2, 0); g.add(hood);
  const roof = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.25, 1.9), black);
  roof.position.set(-0.4, 1.2, 0); g.add(roof);
  const cab = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.7, 1.7),
    new THREE.MeshLambertMaterial({ color: 0x10243e }));
  cab.position.set(-0.3, 1.55, 0); g.add(cab);
  const stripe = new THREE.Mesh(new THREE.BoxGeometry(4.6, 0.12, 0.05), gold);
  stripe.position.set(0, 0.7, 1.02); g.add(stripe);
  const stripe2 = stripe.clone(); stripe2.position.z = -1.02; g.add(stripe2);
  // RED light bar on roof
  const bar = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.25, 1.6),
    new THREE.MeshBasicMaterial({ color: 0xff1744 }));
  bar.position.set(-0.3, 1.95, 0); g.add(bar);
  const bar2 = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.25, 0.5),
    new THREE.MeshBasicMaterial({ color: 0x1565c0 }));
  bar2.position.set(-0.3, 1.95, 0.9); g.add(bar2);
  // square white headlights
  const hl = new THREE.MeshBasicMaterial({ color: 0xffffff });
  for (const s of [-1, 1]) {
    const h = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.25, 0.4), hl);
    h.position.set(2.32, 0.6, s * 0.65); g.add(h);
  }
  const tireMat = new THREE.MeshLambertMaterial({ color: 0x111111 });
  const wheelGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.3, 10);
  for (const [wx, wz] of [[1.4, 1.0], [1.4, -1.0], [-1.4, 1.0], [-1.4, -1.0]]) {
    const w = new THREE.Mesh(wheelGeo, tireMat);
    w.rotation.x = Math.PI / 2;
    w.position.set(wx, 0.42, wz);
    g.add(w);
  }
  return g;
}

function buildMotorcycle() {
  const g = new THREE.Group();
  const red = new THREE.MeshLambertMaterial({ color: 0xd32f2f });
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.5, 0.5), red);
  body.position.y = 0.7; g.add(body);
  const seat = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.2, 0.45),
    new THREE.MeshLambertMaterial({ color: 0x111111 }));
  seat.position.set(-0.3, 1.0, 0); g.add(seat);
  const tireMat = new THREE.MeshLambertMaterial({ color: 0x111111 });
  const wg = new THREE.CylinderGeometry(0.35, 0.35, 0.2, 10);
  for (const wx of [0.7, -0.7]) {
    const w = new THREE.Mesh(wg, tireMat);
    w.rotation.x = Math.PI / 2;
    w.position.set(wx, 0.35, 0);
    g.add(w);
  }
  // rider in red
  const rider = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.7, 0.4), red);
  rider.position.set(-0.2, 1.4, 0); g.add(rider);
  const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.25, 8, 6), red);
  helmet.position.set(-0.2, 1.9, 0); g.add(helmet);
  return g;
}

export function buildTraffic(scene, count) {
  const rnd = mulberry(777);
  const group = new THREE.Group();
  scene.add(group);
  const cars = [];
  const roads = [];
  for (let c = -256; c <= 256; c += WORLD.roadGap) roads.push(c);
  for (let i = 0; i < count; i++) {
    const type = CAR_TYPES[Math.floor(rnd() * CAR_TYPES.length)];
    const mesh = buildCarMesh(type);
    const horizontal = rnd() < 0.5;
    const road = roads[Math.floor(rnd() * roads.length)];
    const lane = (rnd() < 0.5 ? -1 : 1) * (3 + rnd() * 4);
    const along = -300 + rnd() * 600;
    if (horizontal) mesh.position.set(along, 0, road + lane);
    else mesh.position.set(road + lane, 0, along);
    mesh.rotation.y = horizontal ? (lane > 0 ? 0 : Math.PI) : (lane > 0 ? -Math.PI / 2 : Math.PI / 2);
    group.add(mesh);
    cars.push({
      mesh, type, horizontal, road, lane, along,
      speed: 6 + rnd() * 8, dir: lane > 0 ? 1 : -1,
      x: mesh.position.x, z: mesh.position.z,
    });
  }
  // red motorcycle with rider
  const moto = buildMotorcycle();
  moto.position.set(20, 0, 64);
  moto.rotation.y = 0;
  group.add(moto);
  cars.push({ mesh: moto, type: { name: 'RED MOTORCYCLE', kind: 'moto' }, horizontal: true, road: 64, lane: 0, along: 20, speed: 12, dir: 1, x: 20, z: 64 });

  return {
    group, cars,
    update(dt) {
      for (const c of cars) {
        c.along += c.speed * c.dir * dt;
        if (c.along > 310) c.along = -310;
        if (c.along < -310) c.along = 310;
        if (c.horizontal) { c.x = c.along; c.z = c.road + c.lane; }
        else { c.x = c.road + c.lane; c.z = c.along; }
        c.mesh.position.set(c.x, 0, c.z);
      }
    },
    nearestCar(x, z, maxDist) {
      let best = null, bd = maxDist * maxDist;
      for (const c of cars) {
        const dx = c.x - x, dz = c.z - z, d2 = dx * dx + dz * dz;
        if (d2 < bd) { bd = d2; best = c; }
      }
      return best;
    },
  };
}
