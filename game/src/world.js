// SOLARA R10 — world: bright daytime city, beach + ocean, individual-window
// buildings, palms, props, billboards, geckos, markers. Deterministic layout.
import * as THREE from 'three';
import { WORLD, DISTRICTS } from './config.js';

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const ROAD_LINES = [-256, -192, -128, -64, 0, 64, 128, 192, 256];
const BLOCKS = [-224, -160, -96, -32, 32, 96, 160, 224];
// Keep these corridors clear so staged shots are never blocked.
const EXCLUDE = [
  { x0: -84, x1: -4, z0: 52, z1: 96 },    // shot-2 camera corridor
  { x0: -64, x1: -16, z0: -204, z1: -164 }, // shot-3 Kai + camera
  { x0: -20, x1: 44, z0: -228, z1: -168 },  // shot-4 camera corridor
];
function inExclude(x, z, m = 0) {
  return EXCLUDE.some((r) => x > r.x0 - m && x < r.x1 + m && z > r.z0 - m && z < r.z1 + m);
}

const PASTELS = ['#ffd9a0', '#ffb3c1', '#a5d8ff', '#c8f7c5', '#fff3b0', '#e6ccff', '#ffc4a3', '#b2f2e8', '#f7c6d9'];

function facadeTexture(base, floors, cols, shop) {
  const c = document.createElement('canvas');
  c.width = 128; c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = base; g.fillRect(0, 0, 128, 256);
  g.fillStyle = 'rgba(255,255,255,0.16)'; g.fillRect(0, 0, 128, 10);
  const wh = 236 / floors, ww = 112 / cols;
  for (let f = 0; f < floors; f++) {
    for (let col = 0; col < cols; col++) {
      const x = 8 + col * ww, y = 14 + f * wh;
      g.fillStyle = '#16324a';
      g.fillRect(x, y, ww * 0.62, wh * 0.55);
      g.fillStyle = 'rgba(140,200,240,0.85)';
      g.fillRect(x + 1, y + 1, ww * 0.62 - 2, wh * 0.55 - 2);
      g.fillStyle = 'rgba(255,255,255,0.5)';
      g.fillRect(x + 1, y + 1, ww * 0.2, wh * 0.55 - 2);
    }
  }
  if (shop) {
    g.fillStyle = '#20242e'; g.fillRect(0, 232, 128, 24);
    g.fillStyle = '#bfe9ff'; g.fillRect(6, 236, 52, 16); g.fillRect(70, 236, 52, 16);
    g.fillStyle = shop; g.fillRect(0, 226, 128, 6);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function textTexture(lines, bg, fg, w = 512, h = 160) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d');
  g.fillStyle = bg; g.fillRect(0, 0, w, h);
  g.fillStyle = fg; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = 'bold 54px Arial';
  g.fillText(lines[0], w / 2, lines.length > 1 ? h / 2 - 28 : h / 2);
  if (lines.length > 1) { g.font = 'bold 34px Arial'; g.fillText(lines[1], w / 2, h / 2 + 34); }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function initWorld(scene) {
  const rng = mulberry32(1337);
  const colliders = [];
  const geckos = [];
  const animated = { geckoSpin: [], foam: [], neon: [] };

  scene.background = new THREE.Color(0x7ec8f7);
  scene.fog = new THREE.Fog(0x9fd4f0, 220, 720);

  const hemi = new THREE.HemisphereLight(0xbfd9ff, 0x8a7f6a, 1.0);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xfff2d0, 2.4);
  sun.position.set(140, 190, 70);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.camera.left = -280; sun.shadow.camera.right = 280;
  sun.shadow.camera.top = 280; sun.shadow.camera.bottom = -280;
  sun.shadow.camera.far = 700; sun.shadow.bias = -0.0004;
  scene.add(sun);

  // Ground base
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(640, 640),
    new THREE.MeshStandardMaterial({ color: 0xa9b18c, roughness: 1 }),
  );
  ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true;
  scene.add(ground);

  // Beach sand + ocean (visual extension past the west edge)
  const sand = new THREE.Mesh(
    new THREE.PlaneGeometry(34, 640),
    new THREE.MeshStandardMaterial({ color: 0xf2e3b3, roughness: 1 }),
  );
  sand.rotation.x = -Math.PI / 2; sand.position.set(-284, 0.02, 0); sand.receiveShadow = true;
  scene.add(sand);
  const ocean = new THREE.Mesh(
    new THREE.PlaneGeometry(170, 640),
    new THREE.MeshStandardMaterial({ color: 0x1fb6cf, roughness: 0.35, metalness: 0.1 }),
  );
  ocean.rotation.x = -Math.PI / 2; ocean.position.set(-385, 0.01, 0);
  scene.add(ocean);
  for (let i = 0; i < 14; i++) {
    const foam = new THREE.Mesh(
      new THREE.PlaneGeometry(3, 26),
      new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.6, transparent: true, opacity: 0.85 }),
    );
    foam.rotation.x = -Math.PI / 2;
    foam.position.set(-301 + rng() * 2, 0.03, -300 + i * 46 + rng() * 20);
    scene.add(foam); animated.foam.push(foam);
  }
  // Sailboats on the water
  for (let i = 0; i < 5; i++) {
    const boat = new THREE.Group();
    const hull = new THREE.Mesh(new THREE.BoxGeometry(7, 1.2, 2.4), new THREE.MeshStandardMaterial({ color: 0xffffff }));
    hull.position.y = 0.6; boat.add(hull);
    const sail = new THREE.Mesh(new THREE.ConeGeometry(2.2, 7, 4), new THREE.MeshStandardMaterial({ color: i % 2 ? 0xff6b6b : 0xffd93d }));
    sail.position.set(0, 4.6, 0); sail.scale.z = 0.4; boat.add(sail);
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 8), new THREE.MeshStandardMaterial({ color: 0x5b4636 }));
    mast.position.y = 4.4; boat.add(mast);
    boat.position.set(-312 - rng() * 30, 0, -260 + i * 120 + rng() * 40);
    boat.rotation.y = rng() * Math.PI;
    scene.add(boat);
  }
  // Beach umbrellas
  const umbGeo = new THREE.ConeGeometry(3.2, 1.6, 8);
  const umbCols = [0x2e9bff, 0xff5d8f, 0xffd93d, 0x7CFC98];
  for (let i = 0; i < 10; i++) {
    const u = new THREE.Mesh(umbGeo, new THREE.MeshStandardMaterial({ color: umbCols[i % 4] }));
    const x = -292 + rng() * 16, z = -280 + i * 58 + rng() * 20;
    u.position.set(x, 2.4, z); u.castShadow = true;
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 2.6), new THREE.MeshStandardMaterial({ color: 0xdddddd }));
    pole.position.set(x, 1.3, z); scene.add(pole);
    scene.add(u);
  }

  // Roads: asphalt strips + yellow centre + dashed white lanes + sidewalks
  const asphalt = new THREE.MeshStandardMaterial({ color: 0x232838, roughness: 0.95 });
  const yellow = new THREE.MeshStandardMaterial({ color: 0xffd21f, roughness: 0.8 });
  const white = new THREE.MeshStandardMaterial({ color: 0xf2f2f2, roughness: 0.8 });
  const walkMat = new THREE.MeshStandardMaterial({ color: 0xefe6cf, roughness: 1 });
  for (const c of ROAD_LINES) {
    for (const horiz of [true, false]) {
      const strip = new THREE.Mesh(new THREE.PlaneGeometry(640, 20), asphalt);
      strip.rotation.x = -Math.PI / 2;
      strip.position.set(horiz ? 0 : c, 0.04, horiz ? c : 0);
      if (!horiz) strip.rotation.z = Math.PI / 2;
      strip.receiveShadow = true; scene.add(strip);
      // double yellow centre line
      for (const off of [-0.7, 0.7]) {
        const line = new THREE.Mesh(new THREE.PlaneGeometry(640, 0.5), yellow);
        line.rotation.x = -Math.PI / 2;
        line.position.set(horiz ? 0 : c + off, 0.05, horiz ? c + off : 0);
        if (!horiz) line.rotation.z = Math.PI / 2;
        scene.add(line);
      }
      // dashed white lane lines — ONE InstancedMesh for all dashes
      {
        const dashGeo = new THREE.PlaneGeometry(7, 0.35);
        const positions = [];
        for (const off of [-5, 5]) {
          for (let d = -300; d < 300; d += 16) {
            positions.push(horiz ? [d, c + off, 0] : [c + off, d, 1]);
          }
        }
        const dashes = new THREE.InstancedMesh(dashGeo, white, positions.length);
        const dm = new THREE.Matrix4(), dq = new THREE.Quaternion(), de = new THREE.Euler(), dv = new THREE.Vector3(), ds = new THREE.Vector3(1, 1, 1);
        positions.forEach(([x, z, vert], i) => {
          de.set(-Math.PI / 2, 0, vert ? Math.PI / 2 : 0); dq.setFromEuler(de);
          dm.compose(dv.set(x, 0.05, z), dq, ds);
          dashes.setMatrixAt(i, dm);
        });
        scene.add(dashes);
      }
      // sidewalks
      for (const off of [-12, 12]) {
        const walk = new THREE.Mesh(new THREE.PlaneGeometry(640, 4), walkMat);
        walk.rotation.x = -Math.PI / 2;
        walk.position.set(horiz ? 0 : c + off, 0.045, horiz ? c + off : 0);
        if (!horiz) walk.rotation.z = Math.PI / 2;
        walk.receiveShadow = true; scene.add(walk);
      }
    }
  }
  // Zebra crossings at a few intersections
  for (const [ix, iz] of [[-64, 64], [0, -192], [64, 64], [-192, -192], [192, 192]]) {
    for (let s = -8; s <= 8; s += 4) {
      const stripe = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 9), white);
      stripe.rotation.x = -Math.PI / 2; stripe.position.set(ix + s, 0.06, iz);
      scene.add(stripe);
    }
  }

  // Buildings with individual windows (canvas facades)
  const facadeCache = {};
  function facade(base, floors, cols, shop) {
    const key = base + floors + cols + shop;
    if (!facadeCache[key]) facadeCache[key] = facadeTexture(base, floors, cols, shop);
    return facadeCache[key];
  }
  const boxGeo = new THREE.BoxGeometry(1, 1, 1);
  for (const bx of BLOCKS) {
    for (const bz of BLOCKS) {
      if (bx <= -224) continue;
      const n = 1 + Math.floor(rng() * 2);
      for (let k = 0; k < n; k++) {
        const cx = bx + (n === 2 ? (k === 0 ? -13 : 13) : 0) + (rng() - 0.5) * 4;
        const cz = bz + (rng() - 0.5) * 6;
        const w = 18 + rng() * 14, d = 16 + rng() * 12;
        const downtown = Math.hypot(cx, cz) < 120;
        const h = downtown ? 20 + rng() * 26 : 8 + rng() * 14;
        if (inExclude(cx, cz, Math.max(w, d) / 2 + 4)) continue;
        const base = PASTELS[Math.floor(rng() * PASTELS.length)];
        const floors = Math.max(2, Math.round(h / 4.5));
        const cols = Math.max(3, Math.round(w / 4));
        const shop = rng() < 0.5 ? ['#ff5d8f', '#2ec4d8', '#ffd93d'][Math.floor(rng() * 3)] : null;
        const mat = new THREE.MeshStandardMaterial({ map: facade(base, floors, cols, shop), roughness: 0.9 });
        const side = new THREE.MeshStandardMaterial({ color: new THREE.Color(base).multiplyScalar(0.82), roughness: 0.95 });
        const roof = new THREE.MeshStandardMaterial({ color: 0x6b5d4f, roughness: 1 });
        const b = new THREE.Mesh(boxGeo, [side, side, roof, roof, mat, mat]);
        b.scale.set(w, h, d);
        b.position.set(cx, h / 2, cz);
        b.castShadow = true; b.receiveShadow = true;
        scene.add(b);
        colliders.push({ minX: cx - w / 2, maxX: cx + w / 2, minZ: cz - d / 2, maxZ: cz + d / 2 });
        // rooftop box (AC unit / parapet) for silhouette variety
        if (rng() < 0.6) {
          const rt = new THREE.Mesh(boxGeo, new THREE.MeshStandardMaterial({ color: 0x8a8378 }));
          rt.scale.set(3 + rng() * 4, 1.6, 3 + rng() * 4);
          rt.position.set(cx + (rng() - 0.5) * w * 0.4, h + 0.8, cz + (rng() - 0.5) * d * 0.4);
          scene.add(rt);
        }
      }
    }
  }

  // Palms (instanced trunks + fronds)
  const palmSpots = [];
  for (const c of ROAD_LINES) {
    for (let d = -300; d <= 300; d += 26) {
      for (const off of [-13.5, 13.5]) {
        if (rng() < 0.55) palmSpots.push([c + off, d + (rng() - 0.5) * 8]);
        if (rng() < 0.55) palmSpots.push([d + (rng() - 0.5) * 8, c + off]);
      }
    }
  }
  for (let z = -300; z <= 300; z += 18) palmSpots.push([-274 + rng() * 4, z]);
  const palms = palmSpots.filter(([x, z]) => {
    if (x < -300 || x > 310 || z < -310 || z > 310) return false;
    if (inExclude(x, z, 3)) return false;
    if (Math.hypot(x + 40, z + 184) < 10) return false; // keep shot-3 Kai clear
    return true;
  });
  const trunkGeo = new THREE.CylinderGeometry(0.28, 0.42, 7, 6);
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x8a6a48, roughness: 1 });
  const trunks = new THREE.InstancedMesh(trunkGeo, trunkMat, palms.length);
  const frondGeo = new THREE.ConeGeometry(1.5, 5.5, 4);
  frondGeo.scale(1, 1, 0.28);
  const frondMat = new THREE.MeshStandardMaterial({ color: 0x2fae5f, roughness: 1 });
  const fronds = new THREE.InstancedMesh(frondGeo, frondMat, palms.length * 6);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), v = new THREE.Vector3(), sc = new THREE.Vector3(1, 1, 1);
  palms.forEach(([x, z], i) => {
    const lean = (rng() - 0.5) * 0.12;
    e.set(lean, rng() * Math.PI, (rng() - 0.5) * 0.12); q.setFromEuler(e);
    m4.compose(v.set(x, 3.5, z), q, sc); trunks.setMatrixAt(i, m4);
    for (let f = 0; f < 6; f++) {
      const a = (f / 6) * Math.PI * 2 + rng() * 0.5;
      e.set(Math.PI / 2.6, a, 0, 'YXZ'); q.setFromEuler(e);
      m4.compose(v.set(x + Math.cos(a) * 1.6, 7.2, z + Math.sin(a) * 1.6), q, sc);
      fronds.setMatrixAt(i * 6 + f, m4);
    }
  });
  trunks.castShadow = true; fronds.castShadow = true;
  scene.add(trunks); scene.add(fronds);

  // Street props: traffic lights, street lamps, hydrants, benches, bins, bus stops
  const black = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.7 });
  const lampGlow = new THREE.MeshStandardMaterial({ color: 0xfff6c9, emissive: 0xffe9a0, emissiveIntensity: 0.9 });
  for (const [ix, iz] of [[-256, -256], [-128, -128], [0, 0], [128, 128], [256, 256], [-256, 0], [0, -256], [256, 0], [0, 256], [-128, 128], [128, -128], [-192, 64], [64, -192], [192, -64], [-64, 192], [64, 192]]) {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 5.4), black);
    pole.position.set(ix + 11.5, 2.7, iz + 11.5); pole.castShadow = true; scene.add(pole);
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.7, 1.6, 0.7), black);
    head.position.set(ix + 11.5, 5.6, iz + 11.5); scene.add(head);
    for (let li = 0; li < 3; li++) {
      const lamp = new THREE.Mesh(new THREE.CircleGeometry(0.2, 8),
        new THREE.MeshStandardMaterial({ color: li === 2 ? 0x33ff66 : 0x552222, emissive: li === 2 ? 0x22cc44 : 0x000000 }));
      lamp.position.set(ix + 11.5, 6.1 - li * 0.5, iz + 11.85); scene.add(lamp);
    }
  }
  for (let i = 0; i < 32; i++) {
    const c = ROAD_LINES[i % ROAD_LINES.length];
    const d = -280 + Math.floor(i / ROAD_LINES.length) * 140 + (i % 4) * 35;
    const horiz = i % 2 === 0;
    const x = horiz ? d : c + 12.5, z = horiz ? c + 12.5 : d;
    if (inExclude(x, z, 2)) continue;
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 6.5), black);
    pole.position.set(x, 3.25, z); scene.add(pole);
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.18, 2.6), black);
    arm.position.set(x, 6.4, z + (horiz ? 1.2 : 0)); arm.rotation.y = horiz ? 0 : Math.PI / 2; scene.add(arm);
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.32, 8, 6), lampGlow);
    bulb.position.set(x, 6.3, z + (horiz ? 2.4 : 0)); scene.add(bulb);
  }
  const hydMat = new THREE.MeshStandardMaterial({ color: 0xd21f1f, roughness: 0.6 });
  for (let i = 0; i < 20; i++) {
    const x = -280 + rng() * 560, z = -280 + rng() * 560;
    if (inExclude(x, z, 2)) continue;
    const hy = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.4, 0.9, 8), hydMat);
    hy.position.set(x, 0.45, z); scene.add(hy);
  }
  const benchMat = new THREE.MeshStandardMaterial({ color: 0x7a5c3e, roughness: 1 });
  const binMat = new THREE.MeshStandardMaterial({ color: 0x3a6ea5, roughness: 0.8 });
  for (let i = 0; i < 24; i++) {
    const x = -280 + rng() * 560, z = -280 + rng() * 560;
    if (inExclude(x, z, 2)) continue;
    const bench = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.5, 0.9), benchMat);
    bench.position.set(x, 0.55, z); bench.rotation.y = rng() * Math.PI; scene.add(bench);
    const bin = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.45, 1.1, 8), binMat);
    bin.position.set(x + 1.8, 0.55, z + 0.6); scene.add(bin);
  }

  // Billboards with real text
  function billboard(lines, bg, fg, x, z, ry, w = 16, h = 5) {
    const g = new THREE.Group();
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 7), black);
    pole.position.y = 3.5; g.add(pole);
    const panel = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.5),
      new THREE.MeshStandardMaterial({ map: textTexture(lines, bg, fg), roughness: 0.7 }));
    panel.position.y = 9; panel.castShadow = true; g.add(panel);
    g.position.set(x, 0, z); g.rotation.y = ry;
    scene.add(g);
    return g;
  }
  billboard(["MO'S GARAGE", 'SAFEHOUSE'], '#0e7c86', '#ffffff', -48, -196, 0.4);
  billboard(['CAFE PELICANO'], '#c0392b', '#ffe9a8', 96, -60, -Math.PI / 2);
  const neon1 = billboard(['BRISA INN'], '#0d3b2e', '#39ff88', -120, 120, Math.PI / 4);
  const neon2 = billboard(['CASA LUNA'], '#3b0d2e', '#ff6ec7', 160, -120, -Math.PI / 4);
  animated.neon.push(neon1, neon2);

  // Golden Geckos (20 collectibles)
  const geckoGeo = new THREE.BoxGeometry(0.9, 0.25, 0.5);
  const geckoMat = new THREE.MeshStandardMaterial({ color: 0xffd21f, emissive: 0xaa7700, emissiveIntensity: 0.7, metalness: 0.6, roughness: 0.3 });
  const discGeo = new THREE.CylinderGeometry(0.8, 0.8, 0.08, 16);
  const discMat = new THREE.MeshStandardMaterial({ color: 0xffd21f, emissive: 0xcc9900, emissiveIntensity: 0.5 });
  const geckoSpots = [];
  for (let i = 0; i < 20; i++) {
    const d = DISTRICTS[i % DISTRICTS.length];
    const a = (i / 20) * Math.PI * 2 + rng();
    geckoSpots.push([d.x + Math.cos(a) * d.r * 0.55, d.z + Math.sin(a) * d.r * 0.55]);
  }
  geckoSpots.forEach(([x, z], i) => {
    const grp = new THREE.Group();
    const body = new THREE.Mesh(geckoGeo, geckoMat);
    body.position.y = 1.0; grp.add(body);
    const tail = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.14, 0.18), geckoMat);
    tail.position.set(-0.85, 1.0, 0); grp.add(tail);
    const disc = new THREE.Mesh(discGeo, discMat);
    disc.position.y = 0.06; grp.add(disc);
    grp.position.set(x, 0, z);
    scene.add(grp);
    geckos.push({ mesh: grp, x, z, got: false, phase: i });
    animated.geckoSpin.push(grp);
  });

  // Safehouse pink cylinder (MO'S) — hidden in shotMode (it blocked shot-3)
  const safehouse = new THREE.Group();
  const shCyl = new THREE.Mesh(new THREE.CylinderGeometry(6, 6, 0.35, 24),
    new THREE.MeshStandardMaterial({ color: 0xff6ec7, transparent: true, opacity: 0.45, emissive: 0xff6ec7, emissiveIntensity: 0.3 }));
  shCyl.position.y = 0.18; safehouse.add(shCyl);
  const shRing = new THREE.Mesh(new THREE.TorusGeometry(6, 0.18, 8, 32),
    new THREE.MeshStandardMaterial({ color: 0xff6ec7, emissive: 0xff6ec7, emissiveIntensity: 0.6 }));
  shRing.rotation.x = Math.PI / 2; shRing.position.y = 0.2; safehouse.add(shRing);
  safehouse.position.set(-40, 0, -192);
  scene.add(safehouse);

  // Mission start marker (big yellow cylinder) + target beacon
  const marker = new THREE.Mesh(new THREE.CylinderGeometry(5, 5, 0.4, 24),
    new THREE.MeshStandardMaterial({ color: 0xffd21f, transparent: true, opacity: 0.55, emissive: 0xffd21f, emissiveIntensity: 0.5 }));
  marker.position.set(-40, 0.2, -192);
  scene.add(marker);
  const beacon = new THREE.Group();
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.7, 70, 12, 1, true),
    new THREE.MeshBasicMaterial({ color: 0xffd21f, transparent: true, opacity: 0.35, side: THREE.DoubleSide, depthWrite: false }));
  beam.position.y = 35; beacon.add(beam);
  const ring = new THREE.Mesh(new THREE.RingGeometry(2.2, 3.4, 32),
    new THREE.MeshBasicMaterial({ color: 0xffd21f, transparent: true, opacity: 0.9, side: THREE.DoubleSide, depthWrite: false }));
  ring.rotation.x = -Math.PI / 2; ring.position.y = 0.12; beacon.add(ring);
  beacon.position.set(-40, 0, -192);
  scene.add(beacon);

  // Clouds
  const cloudMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, transparent: true, opacity: 0.9 });
  for (let i = 0; i < 9; i++) {
    const cl = new THREE.Mesh(new THREE.SphereGeometry(14 + rng() * 14, 8, 6), cloudMat);
    cl.scale.y = 0.35;
    cl.position.set(-280 + rng() * 560, 95 + rng() * 35, -280 + rng() * 560);
    scene.add(cl);
  }

  function resolveCircle(x, z, r) {
    for (const c of colliders) {
      const nx = Math.max(c.minX, Math.min(x, c.maxX));
      const nz = Math.max(c.minZ, Math.min(z, c.maxZ));
      const dx = x - nx, dz = z - nz;
      const d2 = dx * dx + dz * dz;
      if (d2 < r * r) {
        if (d2 < 1e-6) { x = c.maxX + r; continue; }
        const d = Math.sqrt(d2);
        x = nx + (dx / d) * r; z = nz + (dz / d) * r;
      }
    }
    return { x, z };
  }
  function isOnRoad(x, z) {
    for (const c of ROAD_LINES) {
      if (Math.abs(x - c) < 10 || Math.abs(z - c) < 10) return true;
    }
    return false;
  }
  function collectGeckos(px, pz) {
    let got = 0;
    for (const gk of geckos) {
      if (!gk.got && Math.hypot(px - gk.x, pz - gk.z) < 2.6) {
        gk.got = true; gk.mesh.visible = false; got++;
      }
    }
    return got;
  }

  function update(dt, t) {
    for (let i = 0; i < animated.geckoSpin.length; i++) {
      const g = animated.geckoSpin[i];
      if (!g.visible) continue;
      g.rotation.y += dt * 1.2;
      g.children[0].position.y = 1.0 + Math.sin(t * 2 + i) * 0.25;
    }
    for (const f of animated.foam) f.position.x = -301 + Math.sin(t * 0.5 + f.position.z) * 1.2;
    const pulse = 1 + Math.sin(t * 3) * 0.25;
    ring.scale.set(pulse, pulse, 1);
    beam.material.opacity = 0.28 + Math.sin(t * 3) * 0.1;
  }

  return { colliders, geckos, marker, beacon, safehouse, resolveCircle, isOnRoad, collectGeckos, update };
}
