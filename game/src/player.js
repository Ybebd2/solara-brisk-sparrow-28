// SOLARA R10 — player: Kai Mercer on foot, visible weapon, shooting, sprint, jump.
import * as THREE from 'three';
import { S, WEAPONS } from './config.js';
import { isDown, mouseClicked } from './input.js';
import { playShot } from './audio.js';

let group, pistol, armR, legL, legR, bodyMesh;
let vy = 0, onGround = true, fireCd = 0, walkPhase = 0;

export function initPlayer(scene) {
  group = new THREE.Group();
  const skin = new THREE.MeshStandardMaterial({ color: 0xc98d64, roughness: 0.8 });
  const shirt = new THREE.MeshStandardMaterial({ color: 0x14b8a6, roughness: 0.8 });
  const pants = new THREE.MeshStandardMaterial({ color: 0x1a1a22, roughness: 0.9 });
  const hair = new THREE.MeshStandardMaterial({ color: 0x14100c, roughness: 1 });
  bodyMesh = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.72, 0.36), shirt);
  bodyMesh.position.y = 1.18; bodyMesh.castShadow = true; group.add(bodyMesh);
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.42, 0.38), skin);
  head.position.y = 1.78; head.castShadow = true; group.add(head);
  const hairM = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.16, 0.42), hair);
  hairM.position.y = 2.02; group.add(hairM);
  const armL = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.66, 0.2), shirt);
  armL.position.set(-0.42, 1.18, 0); group.add(armL);
  armR = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.66, 0.2), skin);
  armR.position.set(0.42, 1.18, 0.12); group.add(armR);
  legL = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.78, 0.24), pants);
  legL.position.set(-0.16, 0.39, 0); legL.castShadow = true; group.add(legL);
  legR = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.78, 0.24), pants);
  legR.position.set(0.16, 0.39, 0); legR.castShadow = true; group.add(legR);
  // VESPER pistol — VISIBLE in the right hand whenever a gun is equipped
  pistol = new THREE.Group();
  const grip = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.22, 0.12),
    new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.4, metalness: 0.5 }));
  grip.position.y = -0.05; pistol.add(grip);
  const barrel = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.11, 0.5),
    new THREE.MeshStandardMaterial({ color: 0xcccccc, roughness: 0.25, metalness: 0.85 }));
  barrel.position.set(0, 0.06, 0.24); pistol.add(barrel);
  pistol.position.set(0.42, 0.88, 0.3);
  pistol.rotation.x = -Math.PI / 2 + 0.25;
  group.add(pistol);
  group.position.set(S.px, 0, S.pz);
  group.rotation.y = S.heading;
  scene.add(group);
  updateWeaponMesh();
  return group;
}

export function updateWeaponMesh() {
  const w = WEAPONS[S.weaponIdx];
  if (pistol) pistol.visible = w.kind !== 'melee';
  if (armR) armR.rotation.x = w.kind === 'melee' ? 0 : -0.9;
}

export function playerGroup() { return group; }

export function updatePlayer(dt, world, cameraYaw, shootTargets) {
  if (S.inCar || S.over) return;
  fireCd -= dt;
  let mx = 0, mz = 0;
  if (isDown('KeyW') || isDown('ArrowUp')) mz += 1;
  if (isDown('KeyS') || isDown('ArrowDown')) mz -= 1;
  if (isDown('KeyA') || isDown('ArrowLeft')) mx -= 1;
  if (isDown('KeyD') || isDown('ArrowRight')) mx += 1;
  const sprint = isDown('ShiftLeft') || isDown('ShiftRight');
  const speed = sprint ? 10 : 5.5;
  if (mx !== 0 || mz !== 0) {
    const len = Math.hypot(mx, mz); mx /= len; mz /= len;
    // camera-relative: forward = camera yaw
    const fx = Math.sin(cameraYaw), fz = Math.cos(cameraYaw);
    const rx = Math.cos(cameraYaw), rz = -Math.sin(cameraYaw);
    const dx = fx * mz + rx * mx, dz = fz * mz + rz * mx;
    const nx = S.px + dx * speed * dt;
    const nz = S.pz + dz * speed * dt;
    const fixed = world.resolveCircle(nx, nz, 0.6);
    S.px = Math.max(-312, Math.min(312, fixed.x));
    S.pz = Math.max(-312, Math.min(312, fixed.z));
    S.heading = Math.atan2(dx, dz);
    S.speed = speed;
    walkPhase += dt * (sprint ? 13 : 9);
    legL.rotation.x = Math.sin(walkPhase) * 0.7;
    legR.rotation.x = -Math.sin(walkPhase) * 0.7;
  } else {
    S.speed = 0;
    legL.rotation.x *= 0.8; legR.rotation.x *= 0.8;
  }
  if ((isDown('Space')) && onGround) { vy = 7.5; onGround = false; }
  if (!onGround) {
    vy -= 22 * dt;
    let y = group.position.y + vy * dt;
    if (y <= 0) { y = 0; vy = 0; onGround = true; }
    group.position.y = y;
  }
  group.position.x = S.px; group.position.z = S.pz;
  group.rotation.y = S.heading;
  // shooting (mouse click or Ctrl)
  const w = WEAPONS[S.weaponIdx];
  const wantFire = (mouseClicked || isDown('ControlLeft') || isDown('ControlRight')) && fireCd <= 0;
  if (wantFire) fireWeapon(w, shootTargets);
}

function fireWeapon(w, shootTargets) {
  fireCd = w.rate;
  if (w.kind !== 'melee') {
    if (S.ammo <= 0) { S.message = 'RELOAD — press R'; S.messageUntil = S.time + 1.5; return; }
    S.ammo--;
  }
  S.shotsFired++;
  playShot();
  // muzzle flash
  const flash = new THREE.Mesh(new THREE.SphereGeometry(0.16, 6, 6),
    new THREE.MeshBasicMaterial({ color: 0xffe9a0 }));
  const fx = S.px + Math.sin(S.heading) * 0.9, fz = S.pz + Math.cos(S.heading) * 0.9;
  flash.position.set(fx, 1.1, fz);
  group.parent.add(flash);
  setTimeout(() => group.parent.remove(flash), 60);
  // tracer
  const end = new THREE.Vector3(S.px + Math.sin(S.heading) * w.range, 1.1, S.pz + Math.cos(S.heading) * w.range);
  const geo = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(fx, 1.1, fz), end,
  ]);
  const line = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: 0xffe14d, transparent: true, opacity: 0.9 }));
  group.parent.add(line);
  setTimeout(() => group.parent.remove(line), 70);
  // hit test vs shootable targets (police / peds): within range + ~12° cone
  if (shootTargets) {
    for (const t of shootTargets()) {
      const dx = t.x - S.px, dz = t.z - S.pz;
      const d = Math.hypot(dx, dz);
      if (d > w.range || d < 0.5) continue;
      const ang = Math.abs(Math.atan2(dx, dz) - S.heading);
      const a = Math.min(ang, Math.PI * 2 - ang);
      if (a < 0.22 || d < 3) {
        t.health -= w.dmg;
        S.hits++;
        if (t.onHit) t.onHit(w.dmg);
        break;
      }
    }
  }
}

export function reload() {
  const w = WEAPONS[S.weaponIdx];
  if (w.kind === 'melee' || S.ammo === w.mag || S.reserve <= 0) return;
  const need = w.mag - S.ammo;
  const take = Math.min(need, S.reserve);
  S.ammo += take; S.reserve -= take;
  S.message = w.name + ' RELOADED'; S.messageUntil = S.time + 1.2;
}

export function switchWeapon(i) {
  if (i < 0 || i >= WEAPONS.length) return;
  S.weaponIdx = i;
  const w = WEAPONS[i];
  S.ammo = w.kind === 'melee' ? Infinity : w.mag;
  if (w.kind !== 'melee' && S.reserve < w.mag) S.reserve = w.mag * 4;
  updateWeaponMesh();
}
