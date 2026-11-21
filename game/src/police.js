// SOLARA R10 — police.js
// Wanted system + police response: cruisers, officers, white helicopter
// with a searchlight beam computed LIVE from the heli lamp (apex at the
// spotlight under the nose, beam to the ground, bright pool at the exact
// hit point). Response panel data: named units + live distance + status
// (SEARCHING / PURSUIT / FIRING / WRECKED). HIDDEN / IN SIGHT badge +
// evading %. Roadblocks at 3+ stars. WASTED on death.
import * as THREE from 'three';
import { POLICE_NAMES } from './config.js';
import { buildPoliceCarMesh } from './vehicles.js';
import { playSiren } from './audio.js';

function mulberry(seed) {
  let t = seed >>> 0;
  return function () {
    t += 0x6D2B79F5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

export function createPolice(scene, S) {
  const rnd = mulberry(4242);
  const group = new THREE.Group();
  scene.add(group);
  const cruisers = [];
  const officers = [];
  const roadblocks = [];

  // Helicopter: detailed white heli, rotor, spotlight under nose
  const heli = new THREE.Group();
  const heliBody = new THREE.Mesh(new THREE.BoxGeometry(4.5, 1.6, 2.2),
    new THREE.MeshLambertMaterial({ color: 0xf5f5f5 }));
  heli.add(heliBody);
  const heliNose = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.2, 2.0),
    new THREE.MeshLambertMaterial({ color: 0xe3f2fd }));
  heliNose.position.set(2.6, -0.1, 0); heli.add(heliNose);
  const heliTail = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.5, 0.5),
    new THREE.MeshLambertMaterial({ color: 0xf5f5f5 }));
  heliTail.position.set(-3.4, 0.3, 0); heli.add(heliTail);
  const tailFin = new THREE.Mesh(new THREE.BoxGeometry(0.3, 1.4, 0.9),
    new THREE.MeshLambertMaterial({ color: 0xd32f2f }));
  tailFin.position.set(-4.8, 0.8, 0); heli.add(tailFin);
  const skids = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.15, 0.3),
    new THREE.MeshLambertMaterial({ color: 0x222222 }));
  skids.position.set(0, -1.1, 0.9); heli.add(skids);
  const skids2 = skids.clone(); skids2.position.z = -0.9; heli.add(skids2);
  // spotlight lamp under the nose (beam apex)
  const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.3, 8, 6),
    new THREE.MeshBasicMaterial({ color: 0xfffde7 }));
  lamp.position.set(2.6, -0.9, 0);
  lamp.name = 'lamp';
  heli.add(lamp);
  // rotor
  const rotor = new THREE.Group();
  const blade = new THREE.Mesh(new THREE.BoxGeometry(11, 0.08, 0.5),
    new THREE.MeshLambertMaterial({ color: 0x222222 }));
  rotor.add(blade);
  const blade2 = blade.clone(); blade2.rotation.y = Math.PI / 2; rotor.add(blade2);
  rotor.position.y = 1.1;
  rotor.name = 'rotor';
  heli.add(rotor);
  heli.position.set(0, 30, 0);
  heli.visible = false;
  group.add(heli);

  // Beam: cone from lamp to ground pool, computed LIVE each frame
  const beamMat = new THREE.MeshBasicMaterial({ color: 0xfff9c4, transparent: true, opacity: 0.28, side: THREE.DoubleSide, depthWrite: false });
  const beam = new THREE.Mesh(new THREE.ConeGeometry(1, 1, 16, 1, true), beamMat);
  beam.visible = false;
  group.add(beam);
  const poolMat = new THREE.MeshBasicMaterial({ color: 0xfffde7, transparent: true, opacity: 0.5, depthWrite: false });
  const pool = new THREE.Mesh(new THREE.CircleGeometry(1, 24), poolMat);
  pool.rotation.x = -Math.PI / 2;
  pool.visible = false;
  group.add(pool);

  let heliAlt = 26;
  let heliAngle = 0;
  let sirenTimer = 0;

  function spawnCruiser(name) {
    const mesh = buildPoliceCarMesh();
    const a = rnd() * Math.PI * 2;
    mesh.position.set(S.px + Math.cos(a) * 40, 0, S.pz + Math.sin(a) * 40);
    group.add(mesh);
    const c = { name, mesh, x: mesh.position.x, z: mesh.position.z, hp: 100, status: 'SEARCHING', speed: 10 + rnd() * 4 };
    cruisers.push(c);
    return c;
  }
  function spawnOfficer(name) {
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.7, 1.1, 0.4),
      new THREE.MeshLambertMaterial({ color: 0x0d47a1 }));
    body.position.y = 1.35; g.add(body);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.32, 8, 6),
      new THREE.MeshLambertMaterial({ color: 0xe8b88a }));
    head.position.y = 2.2; g.add(head);
    const legs = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.9, 0.35),
      new THREE.MeshLambertMaterial({ color: 0x111111 }));
    legs.position.y = 0.45; g.add(legs);
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.15, 8),
      new THREE.MeshLambertMaterial({ color: 0x0d47a1 }));
    cap.position.y = 2.5; g.add(cap);
    g.scale.setScalar(1.5);
    const a = rnd() * Math.PI * 2;
    g.position.set(S.px + Math.cos(a) * 15, 0, S.pz + Math.sin(a) * 15);
    group.add(g);
    const o = { name, mesh: g, x: g.position.x, z: g.position.z, hp: 50, status: 'SEARCHING', speed: 4 + rnd() * 1.5 };
    officers.push(o);
    return o;
  }
  function spawnRoadblock() {
    const g = new THREE.Group();
    for (let i = -1; i <= 1; i++) {
      const c = buildPoliceCarMesh();
      c.position.set(i * 5, 0, 0);
      c.rotation.y = Math.PI / 2;
      g.add(c);
    }
    const barrier = new THREE.Mesh(new THREE.BoxGeometry(14, 0.8, 0.4),
      new THREE.MeshLambertMaterial({ color: 0xff8f00 }));
    barrier.position.y = 1.2; g.add(barrier);
    const a = rnd() * Math.PI * 2;
    g.position.set(S.px + Math.cos(a) * 30, 0, S.pz + Math.sin(a) * 30);
    group.add(g);
    roadblocks.push({ mesh: g, x: g.position.x, z: g.position.z });
  }

  function wantedTarget() {
    return Math.min(5, Math.max(0, S.wanted));
  }

  return {
    group, cruisers, officers, heli, beam, pool,
    get heliAlt() { return heliAlt; },
    set heliAlt(v) { heliAlt = v; },
    update(dt, t) {
      const w = wantedTarget();
      S.bestWanted = Math.max(S.bestWanted, w);
      // desired units by wanted level
      const wantCruisers = w === 0 ? 0 : Math.min(2 + w, 6);
      const wantOfficers = w === 0 ? 0 : Math.min(1 + w, 5);
      // despawn when wanted drops to 0 (units drive off)
      if (w === 0) {
        for (const c of cruisers) group.remove(c.mesh);
        cruisers.length = 0;
        for (const o of officers) group.remove(o.mesh);
        officers.length = 0;
      }
      while (cruisers.length < wantCruisers) spawnCruiser(POLICE_NAMES[cruisers.length % POLICE_NAMES.length]);
      while (officers.length < wantOfficers) spawnOfficer(POLICE_NAMES[(officers.length + 2) % POLICE_NAMES.length]);
      // heli at wanted >= 3
      const heliWant = w >= 3;
      S.heliUp = heliWant;
      S.airDeployed = heliWant;
      heli.visible = heliWant;
      beam.visible = heliWant;
      pool.visible = heliWant;
      // roadblocks at 3+ stars
      if (w >= 3 && roadblocks.length < 2) spawnRoadblock();
      if (w < 3) {
        for (const r of roadblocks) group.remove(r.mesh);
        roadblocks.length = 0;
      }
      // HIDDEN / IN SIGHT + evading %
      const distToNearest = this.nearestDist();
      const seenNow = w > 0 && distToNearest < 45 && !S.shotMode;
      // if player is in a car moving fast or far, police lose sight
      S.seen = seenNow || (w > 0 && distToNearest < 18);
      if (w > 0) {
        if (S.seen) S.evading = Math.max(0, S.evading - dt * 30);
        else S.evading = Math.min(100, S.evading + dt * 8);
        if (S.evading >= 100) {
          // escaped: wanted drops by 1
          S.wanted = Math.max(0, w - 1);
          S.evading = 0;
          S.escapes++;
        }
      } else {
        S.evading = 0;
      }
      // move cruisers toward player (pursuit) or wander (searching)
      // in shotMode, freeze them in place so they never block the player
      for (const c of cruisers) {
        const dx = S.px - c.x, dz = S.pz - c.z;
        const d = Math.hypot(dx, dz) || 1;
        const pursuing = d < 60 || S.seen;
        c.status = c.hp <= 0 ? 'WRECKED' : (pursuing ? 'PURSUIT' : 'SEARCHING');
        if (c.hp > 0 && !S.shotMode) {
          const sp = pursuing ? c.speed * 1.6 : c.speed * 0.5;
          c.x += (dx / d) * sp * dt;
          c.z += (dz / d) * sp * dt;
          c.mesh.position.set(c.x, 0, c.z);
          c.mesh.rotation.y = Math.atan2(dx, dz);
          // ram damage when very close and not in shotMode
          if (d < 3.5 && S.health > 0) {
            S.health -= 12 * dt;
            S.armour = Math.max(0, S.armour - 6 * dt);
          }
          // wrecked cruiser: falls behind
          if (c.hp <= 0) c.mesh.rotation.z = 0.4;
        }
      }
      // officers walk toward player, shoot when close (frozen in shotMode)
      for (const o of officers) {
        const dx = S.px - o.x, dz = S.pz - o.z;
        const d = Math.hypot(dx, dz) || 1;
        const pursuing = d < 40 || S.seen;
        o.status = o.hp <= 0 ? 'WRECKED' : (d < 25 ? 'FIRING' : (pursuing ? 'PURSUIT' : 'SEARCHING'));
        if (o.hp > 0 && !S.shotMode) {
          o.x += (dx / d) * o.speed * dt;
          o.z += (dz / d) * o.speed * dt;
          o.mesh.position.set(o.x, 0, o.z);
          o.mesh.rotation.y = Math.atan2(dx, dz);
          if (d < 25 && S.health > 0) {
            S.health -= 6 * dt;
            S.armour = Math.max(0, S.armour - 3 * dt);
          }
        }
      }
      // heli: circle above player, beam from lamp to ground pool
      // (frozen in shotMode so the beam stays framed)
      if (heliWant) {
        if (!S.shotMode) heliAngle += dt * 0.5;
        const hx = S.px + Math.cos(heliAngle) * 18;
        const hz = S.pz + Math.sin(heliAngle) * 18;
        heli.position.set(hx, heliAlt, hz);
        heli.rotation.y = Math.atan2(S.px - hx, S.pz - hz);
        const rotor = heli.getObjectByName('rotor');
        if (rotor) rotor.rotation.y += dt * 25;
        // beam: apex at lamp (under nose), base pool at exact ground hit point below lamp
        const lampWorld = new THREE.Vector3();
        const lampObj = heli.getObjectByName('lamp');
        if (lampObj) lampObj.getWorldPosition(lampWorld);
        else lampWorld.set(hx, heliAlt - 1, hz);
        // beam points straight down from lamp to the ground point under it
        const groundY = 0.05;
        const beamLen = lampWorld.y - groundY;
        const midY = (lampWorld.y + groundY) / 2;
        beam.position.set(lampWorld.x, midY, lampWorld.z);
        beam.scale.set(3.2, beamLen, 3.2);
        beam.rotation.x = Math.PI; // cone apex up (at lamp), base down
        // bright pool at exact hit point
        pool.position.set(lampWorld.x, 0.06, lampWorld.z);
        const poolR = 2.5 + Math.sin(t * 3) * 0.3;
        pool.scale.set(poolR, poolR, 1);
      }
      // siren blips while wanted
      if (w > 0) {
        sirenTimer -= dt;
        if (sirenTimer <= 0) { sirenTimer = 2.2; playSiren(S); }
      }
      // death -> WASTED
      if (S.health <= 0 && !S.over) {
        S.over = true;
        S.wasted++;
        S.cash = Math.max(0, S.cash - 500);
        S.wanted = 0;
        S.health = 100;
        S.armour = 40;
        S.px = 190; S.pz = -190; // Mercy Clinic, Palm Heights
        S.inCar = false; S.car = null;
        S.message = 'WASTED';
        S.messageUntil = S.time + 4;
        S.over = false; // respawn immediately, WASTED overlay shows via message
      }
    },
    nearestDist() {
      let best = Infinity;
      for (const c of cruisers) {
        const d = Math.hypot(c.x - S.px, c.z - S.pz);
        if (d < best) best = d;
      }
      for (const o of officers) {
        const d = Math.hypot(o.x - S.px, o.z - S.pz);
        if (d < best) best = d;
      }
      return best;
    },
    // response panel data: named units + live distance + status
    responseUnits() {
      const units = [];
      for (const c of cruisers) {
        units.push({ name: c.name, dist: Math.round(Math.hypot(c.x - S.px, c.z - S.pz)), status: c.status });
      }
      for (const o of officers) {
        units.push({ name: o.name, dist: Math.round(Math.hypot(o.x - S.px, o.z - S.pz)), status: o.status });
      }
      if (S.heliUp) units.push({ name: 'AIR-1', dist: Math.round(heliAlt), status: 'SEARCHING' });
      return units.slice(0, 6);
    },
    tryHit(px, pz, heading, range, dmg) {
      // hit the nearest police unit inside range + 30-degree cone
      let best = null, bd = range * range;
      const fx = Math.sin(heading), fz = Math.cos(heading);
      for (const u of [...cruisers, ...officers]) {
        if (u.hp <= 0) continue;
        const dx = u.x - px, dz = u.z - pz;
        const d2 = dx * dx + dz * dz;
        if (d2 > bd) continue;
        const d = Math.sqrt(d2) || 1;
        const dot = (dx / d) * fx + (dz / d) * fz;
        if (dot < 0.5) continue;
        if (d2 < bd) { bd = d2; best = u; }
      }
      if (!best) return false;
      best.hp -= dmg;
      if (best.hp <= 0) {
        if (cruisers.includes(best)) S.cruisersWrecked++;
        if (S.wanted > 0) S.wanted = Math.min(5, S.wanted + 1);
      }
      return true;
    },
    policeCount() {
      return cruisers.length + officers.length + (S.heliUp ? 1 : 0);
    },
  };
}
