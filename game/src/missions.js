// SOLARA R10 — missions.js
// 8 story jobs, TYPE-BASED completion. Each mission shows STAGE x/y and
// a segmented progress bar. Mission list for the pause STORY tab.
import * as THREE from 'three';
import { MISSIONS, rankFor } from './config.js';
import { playJobDone, playPickup } from './audio.js';

const DIALOGUES = {
  0: { speaker: 'LUPE', role: 'FIXER · MO\'S GARAGE', text: "Kai. You're late. The fixer life doesn't wait — first job's yours. Meet me at MO'S.", reply: 'On my way, Lupe. First fix, no mistakes.' },
  1: { speaker: 'SULLY', role: 'TOW DRIVER', text: 'That car at Dockside needs moving. Grab wheels and drive it there — no scratches.', reply: 'Consider it moved. Keys stay with me.' },
  2: { speaker: 'MARCO', role: 'COURIER', text: "Package goes to Old Port. Drive it there. If the cops sniff you, lose them first.", reply: 'Old Port. Quiet roads. Got it.' },
  3: { speaker: 'BRANDT', role: 'ACCOUNTANT', text: "My ledger's in the Downtown office. Hold the spot five seconds and it's yours.", reply: 'Five seconds. Then the ledger walks out with me.' },
  4: { speaker: 'AURORA', role: 'BOARDWALK', text: 'The boardwalk at dusk. Walk the sand, hear me out — the tide brings more than shells.', reply: "I'm listening, Aurora. The beach is quiet tonight." },
  5: { speaker: 'LUPE', role: 'FIXER · MO\'S GARAGE', text: 'I want a fresh ride. Jack any car on Neon Row and bring it to the mark.', reply: 'Fresh ride, coming up. Neon Row it is.' },
  6: { speaker: 'SULLY', role: 'TOW DRIVER', text: "Heat's on you, Kai. Lose the cops, then reach my hideout in Palm Heights.", reply: 'They will not catch me. Palm Heights, soon.' },
  7: { speaker: 'BRANDT', role: 'ACCOUNTANT', text: 'The big one. Hold the bank door five seconds, then drive the getaway to the Marina.', reply: 'The Solara Job. We finish this tonight.' },
};

export function createMissions(scene, S) {
  const group = new THREE.Group();
  scene.add(group);
  // start marker: big yellow cylinder at current mission start
  const markerMat = new THREE.MeshBasicMaterial({ color: 0xffea00, transparent: true, opacity: 0.7 });
  const marker = new THREE.Mesh(new THREE.CylinderGeometry(2.5, 2.5, 6, 16), markerMat);
  marker.position.set(-40, 3, -192);
  group.add(marker);
  // safehouse pink cylinder at MO'S
  const safeMat = new THREE.MeshBasicMaterial({ color: 0xff4081, transparent: true, opacity: 0.6 });
  const safe = new THREE.Mesh(new THREE.CylinderGeometry(3, 3, 5, 16), safeMat);
  safe.position.set(-40, 2.5, -192);
  group.add(safe);
  // beacon: pulsing yellow ring + vertical beam at current target
  const beaconRing = new THREE.Mesh(new THREE.RingGeometry(2, 3, 24),
    new THREE.MeshBasicMaterial({ color: 0xffea00, transparent: true, opacity: 0.8, side: THREE.DoubleSide }));
  beaconRing.rotation.x = -Math.PI / 2;
  group.add(beaconRing);
  const beaconBeam = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 40, 8),
    new THREE.MeshBasicMaterial({ color: 0xffea00, transparent: true, opacity: 0.35 }));
  group.add(beaconBeam);
  const completed = new Set();

  function mission() { return MISSIONS[S.missionIdx]; }
  function targetPos() {
    const m = mission();
    if (!m) return null;
    return { x: m.target[0], z: m.target[1] };
  }
  function distToTarget() {
    const t = targetPos();
    if (!t) return 0;
    return Math.hypot(t.x - S.px, t.z - S.pz);
  }
  function startMission() {
    const m = mission();
    if (!m || S.missionActive) return;
    S.missionActive = true;
    S.missionTime = m.time;
    S.missionStage = 0;
    S.missionHold = 0;
    const d = DIALOGUES[S.missionIdx];
    if (d) {
      S.dialogue = d.text;
      S.dialogueSpeaker = d.speaker + ' · ' + d.role;
      S.dialogueUntil = S.time + 6;
    }
  }
  function completeMission() {
    const m = mission();
    if (!m) return;
    S.cash += m.reward;
    S.jobsDone++;
    S.respect += 10 + S.missionIdx * 2;
    S.rank = rankFor(S.jobsDone);
    completed.add(S.missionIdx);
    S.missionActive = false;
    S.missionStage = 0;
    S.missionHold = 0;
    S.message = 'JOB DONE · +$' + m.reward;
    S.messageUntil = S.time + 4;
    playJobDone(S);
    S.missionIdx++;
    if (S.missionIdx >= MISSIONS.length) {
      S.message = 'ALL 8 JOBS DONE — YOU ARE THE FIXER OF SOLARA';
      S.messageUntil = S.time + 8;
      S.missionIdx = MISSIONS.length - 1;
    }
  }
  function failMission() {
    S.missionActive = false;
    S.missionStage = 0;
    S.missionHold = 0;
    S.message = 'MISSION FAILED — timer ran out';
    S.messageUntil = S.time + 3;
  }

  return {
    group, completed,
    mission, targetPos, distToTarget, startMission,
    update(dt, t) {
      const m = mission();
      if (!m) return;
      // marker + beacon follow current mission
      const isFirst = S.missionIdx === 0;
      marker.position.set(isFirst ? -40 : m.target[0], 3, isFirst ? -192 : m.target[1]);
      marker.rotation.y += dt;
      beaconRing.position.set(m.target[0], 0.1, m.target[1]);
      beaconBeam.position.set(m.target[0], 20, m.target[1]);
      const pulse = 1 + Math.sin(t * 3) * 0.25;
      beaconRing.scale.set(pulse, pulse, 1);
      // hide the big marker cylinders in staged shots — they dominate the frame
      marker.visible = !S.shotMode;
      safe.visible = !S.shotMode;
      if (!S.missionActive) return;
      S.missionTime -= dt;
      if (S.missionTime <= 0) { failMission(); return; }
      const d = distToTarget();
      if (m.type === 'goto') {
        if (d <= 7) completeMission();
      } else if (m.type === 'driveTo') {
        if (d <= 9 && S.inCar) completeMission();
      } else if (m.type === 'hold') {
        if (d <= 7) {
          S.missionHold += dt;
          if (S.missionHold >= 5) completeMission();
        } else S.missionHold = 0;
      } else if (m.type === 'carjack') {
        if (d <= 10 && S.inCar) completeMission();
      } else if (m.type === 'escape') {
        if (d <= 9 && S.wanted === 0) completeMission();
      } else if (m.type === 'finale') {
        if (S.missionStage === 0) {
          if (d <= 7) {
            S.missionHold += dt;
            if (S.missionHold >= 5) {
              S.missionStage = 1;
              S.missionHold = 0;
              S.message = 'GETAWAY — drive to the Marina!';
              S.messageUntil = S.time + 3;
            }
          } else S.missionHold = 0;
        } else {
          const md = Math.hypot(-192 - S.px, -192 - S.pz);
          if (md <= 9 && S.inCar) completeMission();
        }
      }
    },
    // STORY tab data: all 8 with title + contact + reward + stages
    storyList() {
      return MISSIONS.map((m, i) => ({
        idx: i, contact: m.contact, title: m.title, reward: m.reward,
        stages: m.stages, done: completed.has(i), current: i === S.missionIdx,
        brief: m.brief,
      }));
    },
    stageLabel() {
      const m = mission();
      if (!m) return '';
      if (m.type === 'finale') return 'STAGE ' + (S.missionStage + 1) + '/' + m.stages;
      return 'STAGE 1/' + m.stages;
    },
  };
}
