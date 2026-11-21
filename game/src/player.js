// SOLARA R10 — player.js
// Kai Mercer: third-person character, WASD move, Shift sprint, Space
// jump, F enter/exit car, R reload, 1-5 weapons, shooting with visible
// VESPER pistol in hand when on foot. Character is a grouped mesh so
// screenshots show Kai BIG and CLEAR.
import * as THREE from 'three';
import { WEAPONS } from './config.js';
import { playShot } from './audio.js';

export function buildPlayerMesh() {
  const g = new THREE.Group();
  // Kai: teal short-sleeve shirt, black pants, white shoes (GHK Nico style)
  const shirt = new THREE.MeshLambertMaterial({ color: 0x00838f });
  const pants = new THREE.MeshLambertMaterial({ color: 0x111111 });
  const skin = new THREE.MeshLambertMaterial({ color: 0xc98a5e });
  const shoe = new THREE.MeshLambertMaterial({ color: 0xffffff });
  const hair = new THREE.MeshLambertMaterial({ color: 0x111111 });

  const legs = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.9, 0.35), pants);
  legs.position.y = 0.45; g.add(legs);
  const shoeL = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.15, 0.45), shoe);
  shoeL.position.set(-0.15, 0.08, 0.05); g.add(shoeL);
  const shoeR = shoeL.clone(); shoeR.position.x = 0.15; g.add(shoeR);
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.75, 1.0, 0.4), shirt);
  torso.position.y = 1.4; g.add(torso);
  const armL = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.9, 0.22), shirt);
  armL.position.set(-0.5, 1.4, 0); g.add(armL);
  const armR = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.9, 0.22), shirt);
  armR.position.set(0.5, 1.4, 0); g.add(armR);
  const handL = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 6), skin);
  handL.position.set(-0.5, 0.9, 0); g.add(handL);
  const handR = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 6), skin);
  handR.position.set(0.5, 0.9, 0); g.add(handR);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.32, 10, 8), skin);
  head.position.y = 2.2; g.add(head);
  const hairM = new THREE.Mesh(new THREE.SphereGeometry(0.33, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.55), hair);
  hairM.position.y = 2.28; g.add(hairM);
  // VESPER pistol visible in right hand (on foot, weaponIdx 1)
  const gun = new THREE.Group();
  const gunBody = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.12, 0.45),
    new THREE.MeshLambertMaterial({ color: 0x222222 }));
  gun.add(gunBody);
  const gunGrip = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.22, 0.1),
    new THREE.MeshLambertMaterial({ color: 0x222222 }));
  gunGrip.position.set(0, -0.14, -0.12); gun.add(gunGrip);
  gun.position.set(0.5, 0.95, 0.35);
  gun.name = 'pistol';
  g.add(gun);
  // rifle on back when weaponIdx 3
  const rifle = new THREE.Group();
  const rBody = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.1, 1.1),
    new THREE.MeshLambertMaterial({ color: 0x333333 }));
  rifle.add(rBody);
  rifle.position.set(0, 1.6, -0.3);
  rifle.rotation.x = 0.5;
  rifle.name = 'rifle';
  rifle.visible = false;
  g.add(rifle);
  g.scale.setScalar(1.5);
  return g;
}

export function createPlayer(scene, S) {
  const mesh = buildPlayerMesh();
  scene.add(mesh);
  let vy = 0;
  let grounded = true;
  let shootCd = 0;
  let lastShotAt = -99;

  return {
    mesh,
    update(dt, input, world, traffic, police) {
      shootCd -= dt;
      const w = WEAPONS[S.weaponIdx];
      // weapon switching 1-5
      for (let i = 0; i < 5; i++) {
        if (input.wasPressed('Digit' + (i + 1))) {
          S.weaponIdx = i;
          const nw = WEAPONS[i];
          S.ammo = nw.mag === Infinity ? Infinity : nw.mag;
          S.reserve = nw.mag === Infinity ? Infinity : nw.mag * 4;
        }
      }
      // reload
      if (input.wasPressed('KeyR') && S.ammo !== Infinity && S.reserve > 0) {
        const need = w.mag - S.ammo;
        const take = Math.min(need, S.reserve);
        S.ammo += take; S.reserve -= take;
      }
      // movement
      let mx = 0, mz = 0;
      if (input.isDown('KeyW') || input.isDown('ArrowUp')) mz -= 1;
      if (input.isDown('KeyS') || input.isDown('ArrowDown')) mz += 1;
      if (input.isDown('KeyA') || input.isDown('ArrowLeft')) mx -= 1;
      if (input.isDown('KeyD') || input.isDown('ArrowRight')) mx += 1;
      const sprint = input.isDown('ShiftLeft') || input.isDown('ShiftRight');
      const speed = sprint ? 9 : 5.5;
      if (!S.inCar) {
        const len = Math.hypot(mx, mz) || 1;
        const nx = mx / len, nz = mz / len;
        // camera-relative: heading rotates with drag; move in heading frame
        const sin = Math.sin(S.heading), cos = Math.cos(S.heading);
        const wx = nx * cos - nz * sin;
        const wz = nx * sin + nz * cos;
        S.px += wx * speed * dt;
        S.pz += wz * speed * dt;
        S.px = Math.max(-310, Math.min(310, S.px));
        S.pz = Math.max(-310, Math.min(310, S.pz));
        S.speed = (mx || mz) ? speed : 0;
        if (mx || mz) S.heading = Math.atan2(wx, wz);
        // jump
        if (input.wasPressed('Space') && grounded) { vy = 7; grounded = false; }
        if (!grounded) {
          vy -= 22 * dt;
          mesh.position.y += vy * dt;
          if (mesh.position.y <= 0) { mesh.position.y = 0; vy = 0; grounded = true; }
        }
        // shooting
        const wantShoot = input.shootHeld() || input.isDown('MouseLeft');
        if (wantShoot && shootCd <= 0 && S.ammo !== 0) {
          shootCd = w.rate;
          if (S.ammo !== Infinity) S.ammo--;
          S.shotsFired++;
          lastShotAt = S.time;
          playShot(S);
          // hit check vs nearest police officer/cruiser in range + cone
          if (police && police.tryHit) {
            if (police.tryHit(S.px, S.pz, S.heading, w.range, w.dmg)) S.hits++;
          }
          if (S.wanted === 0) { S.wanted = 1; S.seen = true; }
        }
      }
      // show/hide pistol + rifle by weapon
      const pistol = mesh.getObjectByName('pistol');
      const rifle = mesh.getObjectByName('rifle');
      if (pistol) pistol.visible = !S.inCar && S.weaponIdx === 1;
      if (rifle) rifle.visible = !S.inCar && S.weaponIdx === 3;
      mesh.visible = !S.inCar;
      mesh.position.set(S.px, mesh.position.y, S.pz);
      mesh.rotation.y = S.heading;
      // walk bob
      if (S.speed > 0 && !S.inCar) {
        mesh.position.y = Math.abs(Math.sin(S.time * 10)) * 0.08;
      }
    },
  };
}
