// SOLARA R10 — missions: 8 type-based jobs, start marker, beacon, dialogue.
import { S, rankFor } from './config.js';
import { playJobDone, playPickup } from './audio.js';

export const MISSIONS = [
  { title: 'First Fix', contact: 'LUPE', type: 'goto', target: [-40, -192], time: 180, reward: 400, stages: 1,
    brief: "Meet Lupe at MO'S on Neon Row. She has your first job.",
    say: 'Kai. You made it. First job is simple — walk over here and we talk.',
    reply: "I'm here, Lupe. What's the job?" },
  { title: 'Tow Job', contact: 'SULLY', type: 'driveTo', target: [192, 192], time: 240, reward: 650, stages: 1,
    brief: 'Sully needs a car moved to Dockside. Grab wheels and drive it there.',
    say: 'That coupe at the yard? Drive it to Dockside. No scratches, Kai.',
    reply: 'Keys in it? Fine. Dockside, no scratches.' },
  { title: "Marco's Run", contact: 'MARCO', type: 'driveTo', target: [-192, 192], time: 210, reward: 800, stages: 1,
    brief: "Marco's package goes to Old Port. Drive it there, no scratches.",
    say: 'Package rides shotgun. Old Port, fast but smooth. You feel me?',
    reply: 'Old Port it is. Package stays in one piece.' },
  { title: 'The Ledger', contact: 'BRANDT', type: 'hold', target: [64, 64], time: 240, reward: 1100, stages: 1,
    brief: "Brandt's ledger is in the Downtown office. Hold the spot 5s to lift it.",
    say: 'The ledger sits in the Downtown office. Five seconds at the door and it is ours.',
    reply: 'Five seconds. In and out.' },
  { title: "Aurora's Light", contact: 'AURORA', type: 'goto', target: [-262, -40], time: 200, reward: 900, stages: 1,
    brief: 'Aurora waits on the beach boardwalk. Walk the sand, hear her out.',
    say: 'The tide brings things back, Kai. Come walk the sand with me.',
    reply: 'The beach at this hour? You better have a good story.' },
  { title: 'Hot Wheels', contact: 'LUPE', type: 'carjack', target: [0, -128], time: 180, reward: 1000, stages: 1,
    brief: 'Lupe wants a fresh ride. Jack any car on Neon Row and bring it to the mark.',
    say: 'I need wheels, fresh ones. Take any car on Neon Row and bring it to the mark.',
    reply: 'Any car? You got it. Neon Row, coming in hot.' },
  { title: 'Heat Wave', contact: 'SULLY', type: 'escape', target: [256, -192], time: 300, reward: 1400, stages: 1,
    brief: "The heat is on. Lose the cops, then reach Sully's hideout in Palm Heights.",
    say: 'Cops are crawling. Lose them first, then slip to my hideout in Palm Heights.',
    reply: 'Lose the heat, then Palm Heights. Copy.' },
  { title: 'The Solara Job', contact: 'BRANDT', type: 'finale', target: [-128, 0], time: 360, reward: 5000, stages: 2,
    brief: 'The big one. Hold the bank door 5s, then drive the getaway to the Marina.',
    say: 'This is the one, Kai. Hold the bank door five seconds, then drive us to the Marina.',
    reply: 'The Solara Job. Lets make history, Brandt.' },
];

const MO_S = [-40, -192];
let world, showDialogueFn;

export function initMissions(wd, showDialogue) {
  world = wd;
  showDialogueFn = showDialogue;
  setMarkerToStart();
}

export function missionStartPoint() {
  // The job board is MO'S; mission 0 starts right at its own target.
  return MISSIONS[S.missionIdx].type === 'goto' && S.missionIdx === 0 ? MISSIONS[0].target : MO_S;
}

export function setMarkerToStart() {
  const [x, z] = missionStartPoint();
  world.marker.position.set(x, 0.2, z);
  world.marker.visible = !S.missionActive;
  const t = MISSIONS[S.missionIdx].target;
  world.beacon.position.set(t[0], 0, t[1]);
  world.beacon.visible = true;
}

export function currentMission() { return MISSIONS[Math.min(S.missionIdx, MISSIONS.length - 1)]; }

export function tryStartMission() {
  if (S.missionActive || S.missionIdx >= MISSIONS.length) return false;
  const [sx, sz] = missionStartPoint();
  if (Math.hypot(S.px - sx, S.pz - sz) > 10) return false;
  const m = currentMission();
  S.missionActive = true;
  S.missionTime = m.time;
  S.missionStage = 0;
  S.missionHold = 0;
  world.marker.visible = false;
  showDialogueFn(m.contact, 'CONTACT', m.say, m.reply);
  S.message = 'JOB STARTED: ' + m.title.toUpperCase();
  S.messageUntil = S.time + 3;
  return true;
}

export function updateMissions(dt) {
  if (!S.missionActive) return;
  const m = currentMission();
  S.missionTime -= dt;
  if (S.missionTime <= 0) {
    S.missionActive = false;
    S.missionTime = 0;
    S.message = 'JOB FAILED — out of time';
    S.messageUntil = S.time + 3;
    setMarkerToStart();
    return;
  }
  const finaleTarget = S.missionStage === 1 ? [-192, -192] : m.target;
  const [tx, tz] = finaleTarget;
  const d = Math.hypot(S.px - tx, S.pz - tz);
  let done = false;
  if (m.type === 'goto') done = d < 7 && !S.inCar;
  else if (m.type === 'driveTo') done = d < 8 && S.inCar;
  else if (m.type === 'carjack') done = d < 9 && S.inCar;
  else if (m.type === 'escape') done = d < 9 && S.wanted === 0;
  else if (m.type === 'hold') {
    if (d < 7) {
      S.missionHold += dt;
      if (S.missionHold >= 5) done = true;
    } else S.missionHold = 0;
  } else if (m.type === 'finale') {
    if (S.missionStage === 0) {
      if (d < 7) {
        S.missionHold += dt;
        if (S.missionHold >= 5) { S.missionStage = 1; S.missionHold = 0; S.message = 'GETAWAY — drive to the Marina!'; S.messageUntil = S.time + 3; }
      } else S.missionHold = 0;
    } else done = d < 8 && S.inCar;
  }
  if (done) completeMission();
}

function completeMission() {
  const m = currentMission();
  S.missionActive = false;
  S.cash += m.reward;
  S.jobsDone++;
  S.rank = rankFor(S.jobsDone);
  playJobDone();
  S.message = 'JOB DONE · +$' + m.reward + ' · ' + S.rank;
  S.messageUntil = S.time + 3.5;
  S.missionIdx++;
  if (S.missionIdx >= MISSIONS.length) {
    S.message = 'ALL 8 JOBS DONE — YOU ARE THE FIXER OF SOLARA';
    S.messageUntil = S.time + 6;
    world.marker.visible = false;
    world.beacon.visible = false;
  } else {
    setMarkerToStart();
  }
}

export function missionProgress() {
  const m = currentMission();
  if (!S.missionActive) return { stage: 0, total: m.stages, frac: 0 };
  if (m.type === 'hold' || (m.type === 'finale' && S.missionStage === 0)) {
    return { stage: S.missionStage, total: m.stages, frac: Math.min(1, S.missionHold / 5) };
  }
  if (m.type === 'finale') return { stage: 1, total: 2, frac: 0.5 };
  return { stage: S.missionStage, total: m.stages, frac: 0 };
}

export function missionTargetPos() {
  const m = currentMission();
  if (m.type === 'finale' && S.missionStage === 1) return [-192, -192];
  return m.target;
}
