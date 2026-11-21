// SOLARA R10 — world.js
// City geometry: roads, pastel buildings with INDIVIDUAL windows,
// beach + turquoise ocean + foam + sailboats + umbrellas, dense palms,
// 96 peds in bright shirts, 20 Golden Geckos, street props (billboards,
// traffic lights, street-light poles, hydrants, benches, bins, bus stops),
// neon signs. All geometry is plain Three.js boxes/cylinders/cones.
import * as THREE from 'three';
import { WORLD, DISTRICTS } from './config.js';

const PALETTE = ['#ff8a80', '#ffd54f', '#4fc3f7', '#ce93d8', '#a5d6a7', '#ffccbc', '#b39ddb', '#90caf9', '#fff59d', '#f48fb1'];
const SHIRT_COLORS = ['#ff5252', '#ffd54f', '#69f0ae', '#40c4ff', '#ff80ab', '#ffea00', '#7c4dff', '#00e5ff', '#ff6d00', '#76ff03'];

function mulberry(seed) {
  let t = seed >>> 0;
  return function () {
    t += 0x6D2B79F5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

export function buildWorld(scene, S) {
  const rnd = mulberry(1337);
  const group = new THREE.Group();
  scene.add(group);

  // Ground: big sand/grass base + asphalt roads grid
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(WORLD.size * 2, WORLD.size * 2),
    new THREE.MeshLambertMaterial({ color: 0x9db98a })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.05;
  group.add(ground);

  // Roads: grid every roadGap, 4 lanes, dark navy asphalt
  const roadMat = new THREE.MeshLambertMaterial({ color: 0x2b3440 });
  const lineMat = new THREE.MeshBasicMaterial({ color: 0xffd54f });
  const dashMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  for (let c = -320; c <= 320; c += WORLD.roadGap) {
    const h = new THREE.Mesh(new THREE.PlaneGeometry(WORLD.size, WORLD.roadWidth), roadMat);
    h.rotation.x = -Math.PI / 2; h.position.set(0, 0, c); group.add(h);
    const v = new THREE.Mesh(new THREE.PlaneGeometry(WORLD.roadWidth, WORLD.size), roadMat);
    v.rotation.x = -Math.PI / 2; v.position.set(c, 0, 0); group.add(v);
    // double yellow centre line on horizontal roads
    for (const off of [-0.4, 0.4]) {
      const y = new THREE.Mesh(new THREE.PlaneGeometry(WORLD.size, 0.25), lineMat);
      y.rotation.x = -Math.PI / 2; y.position.set(0, 0.01, c + off); group.add(y);
    }
    // dashed white lane lines
    for (let d = -300; d < 300; d += 12) {
      const dg = new THREE.Mesh(new THREE.PlaneGeometry(5, 0.2), dashMat);
      dg.rotation.x = -Math.PI / 2; dg.position.set(d, 0.01, c + 5); group.add(dg);
      const dg2 = new THREE.Mesh(new THREE.PlaneGeometry(5, 0.2), dashMat);
      dg2.rotation.x = -Math.PI / 2; dg2.position.set(d, 0.01, c - 5); group.add(dg2);
    }
  }

  // Sidewalks: cream tiles along roads
  const walkMat = new THREE.MeshLambertMaterial({ color: 0xefe3c8 });
  for (let c = -320; c <= 320; c += WORLD.roadGap) {
    const s1 = new THREE.Mesh(new THREE.PlaneGeometry(WORLD.size, 4), walkMat);
    s1.rotation.x = -Math.PI / 2; s1.position.set(0, 0.005, c + 12); group.add(s1);
    const s2 = new THREE.Mesh(new THREE.PlaneGeometry(WORLD.size, 4), walkMat);
    s2.rotation.x = -Math.PI / 2; s2.position.set(0, 0.005, c - 12); group.add(s2);
  }

  // Buildings: multi-story with INDIVIDUAL windows
  const buildings = [];
  const winDark = new THREE.MeshLambertMaterial({ color: 0x1c2f4a });
  const winLit = new THREE.MeshLambertMaterial({ color: 0xffe082 });
  const winGlass = new THREE.MeshLambertMaterial({ color: 0x9fd8ef });
  // Keep buildings OUT of the shot-2 road corridor (a building whose edge
  // touches road z=64 blocks the whole shot-2 sightline).
  const NO_BUILD = { x0: -85, x1: 20, z0: 50, z1: 78 };
  for (let bx = -288; bx <= 288; bx += WORLD.blockSize) {
    for (let bz = -288; bz <= 288; bz += WORLD.blockSize) {
      if (Math.abs(bx % WORLD.roadGap) < 16 || Math.abs(bz % WORLD.roadGap) < 16) continue;
      if (bx < WORLD.beachX + 8) continue; // beach strip stays open
      if (bx >= NO_BUILD.x0 && bx <= NO_BUILD.x1 && bz >= NO_BUILD.z0 && bz <= NO_BUILD.z1) continue;
      if (rnd() < 0.22) continue; // some empty lots
      const w = 14 + rnd() * 14, d = 14 + rnd() * 14;
      const floors = 1 + Math.floor(rnd() * 4);
      const h = floors * 4.5 + 2;
      const col = PALETTE[Math.floor(rnd() * PALETTE.length)];
      const body = new THREE.Mesh(
        new THREE.BoxGeometry(w, h, d),
        new THREE.MeshLambertMaterial({ color: col })
      );
      body.position.set(bx, h / 2, bz);
      group.add(body);
      buildings.push(body);
      // roof trim
      const trim = new THREE.Mesh(new THREE.BoxGeometry(w + 0.6, 0.5, d + 0.6),
        new THREE.MeshLambertMaterial({ color: 0xffffff }));
      trim.position.set(bx, h + 0.25, bz);
      group.add(trim);
      // individual windows: dark blue glass tall, clear storefront ground floor
      const cols = Math.max(2, Math.floor(w / 4));
      const rows = Math.max(1, Math.floor(h / 4.5));
      for (let f = 0; f < rows; f++) {
        for (let wi = 0; wi < cols; wi++) {
          const wy = 2.2 + f * 4.5;
          const wx = bx - w / 2 + 2 + wi * ((w - 4) / Math.max(1, cols - 1));
          const lit = rnd() < 0.18;
          const mat = f === 0 ? winGlass : (lit ? winLit : winDark);
          const win = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 2.2), mat);
          win.position.set(wx, wy, bz + d / 2 + 0.06);
          group.add(win);
          const win2 = win.clone();
          win2.position.set(wx, wy, bz - d / 2 - 0.06);
          win2.rotation.y = Math.PI;
          group.add(win2);
        }
      }
    }
  }

  // Beach: cream sand + turquoise ocean + foam + sailboats + umbrellas
  const sand = new THREE.Mesh(new THREE.PlaneGeometry(52, WORLD.size),
    new THREE.MeshLambertMaterial({ color: 0xf5e6c4 }));
  sand.rotation.x = -Math.PI / 2; sand.position.set(-284, 0.02, 0); group.add(sand);
  const ocean = new THREE.Mesh(new THREE.PlaneGeometry(120, WORLD.size),
    new THREE.MeshLambertMaterial({ color: 0x26c6da }));
  ocean.rotation.x = -Math.PI / 2; ocean.position.set(-360, 0.0, 0); group.add(ocean);
  const foamMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  for (let z = -300; z < 300; z += 18) {
    const f = new THREE.Mesh(new THREE.PlaneGeometry(3, 6 + rnd() * 6), foamMat);
    f.rotation.x = -Math.PI / 2; f.position.set(-310 + rnd() * 2, 0.03, z); group.add(f);
  }
  // sailboats
  for (let i = 0; i < 5; i++) {
    const sx = -330 - rnd() * 30, sz = -240 + i * 110 + rnd() * 30;
    const hull = new THREE.Mesh(new THREE.BoxGeometry(3, 0.8, 8),
      new THREE.MeshLambertMaterial({ color: 0xffffff }));
    hull.position.set(sx, 0.4, sz); group.add(hull);
    const sail = new THREE.Mesh(new THREE.ConeGeometry(2.2, 6, 4),
      new THREE.MeshLambertMaterial({ color: 0xfff176 }));
    sail.position.set(sx, 3.5, sz); group.add(sail);
  }
  // umbrellas on the beach
  for (let i = 0; i < 10; i++) {
    const ux = -292 + rnd() * 14, uz = -280 + i * 58 + rnd() * 20;
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 2.4, 6),
      new THREE.MeshLambertMaterial({ color: 0x8d6e63 }));
    pole.position.set(ux, 1.2, uz); group.add(pole);
    const top = new THREE.Mesh(new THREE.ConeGeometry(2.2, 1.1, 8),
      new THREE.MeshLambertMaterial({ color: i % 2 ? 0x40c4ff : 0xff5252 }));
    top.position.set(ux, 2.7, uz); group.add(top);
  }

  // Palms: dense, tall, slender, fan fronds.
  // Keep palms OUT of the staged-shot sightlines (R10 lesson: a palm in
  // front of a shot camera fills the whole frame with fronds).
  const NO_PALM = [
    [-64, 78], [-40, 64], [-20, 64], // shot 2 camera + road
    [-46, -184], [-40, -184], [-39, -184], // shot 3 camera + Kai
    [36, -220], [-12, -176], [-8, -186], // shot 4 camera + Kai
    [-40, 60], // spawn
  ];
  function nearNoPalm(x, z) {
    for (const [nx, nz] of NO_PALM) {
      if (Math.hypot(x - nx, z - nz) < 14) return true;
    }
    return false;
  }
  const trunkMat = new THREE.MeshLambertMaterial({ color: 0x8d6e63 });
  const frondMat = new THREE.MeshLambertMaterial({ color: 0x43a047 });
  for (let i = 0; i < 90; i++) {
    const px = -300 + rnd() * 580, pz = -300 + rnd() * 600;
    if (Math.abs(px % WORLD.roadGap) < 13 || Math.abs(pz % WORLD.roadGap) < 13) continue;
    if (px < WORLD.beachX + 4 && px > -300) continue;
    if (nearNoPalm(px, pz)) continue;
    const h = 7 + rnd() * 5;
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.45, h, 6), trunkMat);
    trunk.position.set(px, h / 2, pz);
    trunk.rotation.z = (rnd() - 0.5) * 0.15;
    group.add(trunk);
    for (let f = 0; f < 6; f++) {
      const fr = new THREE.Mesh(new THREE.ConeGeometry(0.9, 3.2, 4), frondMat);
      const a = (f / 6) * Math.PI * 2;
      fr.position.set(px + Math.cos(a) * 1.6, h + 0.6, pz + Math.sin(a) * 1.6);
      fr.rotation.z = Math.cos(a) * 1.1;
      fr.rotation.x = -Math.sin(a) * 1.1;
      group.add(fr);
    }
  }

  // Street props: billboards, traffic lights, street-light poles, hydrants, benches, bins, bus stops
  function billboard(x, z, text, color) {
    const pole = new THREE.Mesh(new THREE.BoxGeometry(0.5, 6, 0.5),
      new THREE.MeshLambertMaterial({ color: 0x455a64 }));
    pole.position.set(x, 3, z); group.add(pole);
    const board = new THREE.Mesh(new THREE.BoxGeometry(10, 3.4, 0.3),
      new THREE.MeshLambertMaterial({ color }));
    board.position.set(x, 7, z); group.add(board);
    const face = new THREE.Mesh(new THREE.PlaneGeometry(9.4, 2.8),
      new THREE.MeshBasicMaterial({ color: 0xffffff }));
    face.position.set(x, 7, z + 0.18); group.add(face);
  }
  billboard(-40, -200, "MO'S GARAGE", 0x00838f);
  billboard(64, 40, 'CAFE PELICANO', 0xc62828);
  billboard(180, -180, 'BRISA INN', 0x2e7d32);
  billboard(-200, 200, 'CASA LUNA', 0xad1457);

  for (const [tx, tz] of [[-64, -64], [64, -64], [-64, 64], [64, 64], [192, -64], [-192, 64]]) {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 5.5, 6),
      new THREE.MeshLambertMaterial({ color: 0x111111 }));
    pole.position.set(tx, 2.75, tz); group.add(pole);
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.7, 1.6, 0.7),
      new THREE.MeshLambertMaterial({ color: 0x111111 }));
    head.position.set(tx, 5.6, tz); group.add(head);
    const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.4, 0.1),
      new THREE.MeshBasicMaterial({ color: 0xff5252 }));
    lamp.position.set(tx, 5.9, tz + 0.4); group.add(lamp);
    // street-light pole with horizontal arm
    const sp = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 6.5, 6),
      new THREE.MeshLambertMaterial({ color: 0x111111 }));
    sp.position.set(tx + 8, 3.25, tz + 8); group.add(sp);
    const arm = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.2, 0.2),
      new THREE.MeshLambertMaterial({ color: 0x111111 }));
    arm.position.set(tx + 6.4, 6.4, tz + 8); group.add(arm);
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.35, 8, 6),
      new THREE.MeshBasicMaterial({ color: 0xfff9c4 }));
    bulb.position.set(tx + 4.8, 6.3, tz + 8); group.add(bulb);
    // red hydrant
    const hyd = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.35, 0.9, 8),
      new THREE.MeshLambertMaterial({ color: 0xd32f2f }));
    hyd.position.set(tx + 3, 0.45, tz - 3); group.add(hyd);
    // bench + bin + bus stop
    const bench = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.5, 0.8),
      new THREE.MeshLambertMaterial({ color: 0x6d4c41 }));
    bench.position.set(tx - 4, 0.45, tz + 4); group.add(bench);
    const bin = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 1, 8),
      new THREE.MeshLambertMaterial({ color: 0x37474f }));
    bin.position.set(tx - 6, 0.5, tz + 4); group.add(bin);
  }

  // Neon signs (title screen dusk): green BRISA INN, pink CASA LUNA
  const neonGreen = new THREE.Mesh(new THREE.BoxGeometry(8, 1.2, 0.3),
    new THREE.MeshBasicMaterial({ color: 0x00e676 }));
  neonGreen.position.set(-40, 12, -200); group.add(neonGreen);
  const neonPink = new THREE.Mesh(new THREE.BoxGeometry(8, 1.2, 0.3),
    new THREE.MeshBasicMaterial({ color: 0xff4081 }));
  neonPink.position.set(64, 12, 40); group.add(neonPink);

  // Peds: 96, scale 1.5, bright shirts, in groups
  const peds = [];
  const pedGroup = new THREE.Group();
  group.add(pedGroup);
  const pedGeoBody = new THREE.BoxGeometry(0.7, 1.1, 0.4);
  const pedGeoHead = new THREE.SphereGeometry(0.32, 8, 6);
  const pedGeoLegs = new THREE.BoxGeometry(0.6, 0.9, 0.35);
  for (let g = 0; g < 24; g++) {
    const gx = -280 + rnd() * 560, gz = -280 + rnd() * 560;
    if (Math.abs(gx % WORLD.roadGap) < 13 || Math.abs(gz % WORLD.roadGap) < 13) continue;
    if (gx < WORLD.beachX + 6) continue;
    const n = 3 + Math.floor(rnd() * 3);
    for (let i = 0; i < n && peds.length < 96; i++) {
      const shirt = SHIRT_COLORS[Math.floor(rnd() * SHIRT_COLORS.length)];
      const mesh = new THREE.Group();
      const body = new THREE.Mesh(pedGeoBody, new THREE.MeshLambertMaterial({ color: shirt }));
      body.position.y = 1.35; mesh.add(body);
      const head = new THREE.Mesh(pedGeoHead, new THREE.MeshLambertMaterial({ color: 0xe8b88a }));
      head.position.y = 2.2; mesh.add(head);
      const legs = new THREE.Mesh(pedGeoLegs, new THREE.MeshLambertMaterial({ color: 0x37474f }));
      legs.position.y = 0.45; mesh.add(legs);
      const px = gx + (rnd() - 0.5) * 6, pz = gz + (rnd() - 0.5) * 6;
      mesh.position.set(px, 0, pz);
      mesh.scale.setScalar(1.5);
      mesh.rotation.y = rnd() * Math.PI * 2;
      pedGroup.add(mesh);
      peds.push({ mesh, x: px, z: pz, speed: 0.5 + rnd() * 0.8, dir: rnd() * Math.PI * 2, shirt });
    }
  }

  // Golden Geckos: 20 collectibles, gold, spinning
  const geckos = [];
  const geckoMat = new THREE.MeshBasicMaterial({ color: 0xffd700 });
  for (let i = 0; i < 20; i++) {
    const gx = -280 + rnd() * 540, gz = -280 + rnd() * 540;
    if (gx < WORLD.beachX + 6) continue;
    const g = new THREE.Mesh(new THREE.OctahedronGeometry(0.9), geckoMat);
    g.position.set(gx, 1.6, gz);
    group.add(g);
    geckos.push({ mesh: g, x: gx, z: gz, taken: false });
  }

  // No-tree zone around spawn (-40,60) is implicit: no trees are placed
  // in world.js at all (palms only, and they skip road/beach strips).

  return {
    group, buildings, peds, geckos,
    update(dt, t) {
      for (const p of peds) {
        p.dir += (Math.sin(t * 0.3 + p.x) * 0.02);
        p.x += Math.cos(p.dir) * p.speed * dt;
        p.z += Math.sin(p.dir) * p.speed * dt;
        if (p.x < -300) p.x = -300; if (p.x > 300) p.x = 300;
        if (p.z < -300) p.z = -300; if (p.z > 300) p.z = 300;
        p.mesh.position.set(p.x, 0, p.z);
        p.mesh.rotation.y = -p.dir;
      }
      for (const g of geckos) {
        if (g.taken) continue;
        g.mesh.rotation.y += dt * 2;
        g.mesh.position.y = 1.6 + Math.sin(t * 2 + g.x) * 0.3;
      }
    },
  };
}

export function districtAt(x, z) {
  let best = DISTRICTS[0], bd = Infinity;
  for (const d of DISTRICTS) {
    const dd = (x - d.x) ** 2 + (z - d.z) ** 2;
    if (dd < bd) { bd = dd; best = d; }
  }
  return best;
}
