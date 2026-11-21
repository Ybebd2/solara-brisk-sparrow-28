// SOLARA R10 — HUD: dense Karimbu-style panels, minimap, dialogue, pause menu.
import { S, WEAPONS, RADIO, CREW, districtAt, rankFor } from './config.js';
import { MISSIONS, currentMission, missionProgress, missionTargetPos } from './missions.js';
import { policeUnits } from './police.js';
import { currentSong } from './audio.js';

let el = {};
let minimapCtx, mapCtx;
let dialogueTimer = null;
let hudDensity = 'Full';

export function initHUD() {
  el = {
    root: document.getElementById('hud'),
    cash: document.getElementById('cash'),
    rank: document.getElementById('rank'),
    clock: document.getElementById('clock'),
    missionTitle: document.getElementById('mission-title'),
    missionBrief: document.getElementById('mission-brief'),
    missionStage: document.getElementById('mission-stage'),
    missionBar: document.getElementById('mission-bar'),
    missionDist: document.getElementById('mission-dist'),
    missionTimer: document.getElementById('mission-timer'),
    stars: document.getElementById('stars'),
    health: document.getElementById('health-fill'),
    armour: document.getElementById('armour-fill'),
    healthNum: document.getElementById('health-num'),
    ammo: document.getElementById('ammo'),
    slots: document.getElementById('slots'),
    minimap: document.getElementById('minimap'),
    district: document.getElementById('district-label'),
    message: document.getElementById('message'),
    dialogue: document.getElementById('dialogue'),
    dlgSpeaker: document.getElementById('dlg-speaker'),
    dlgRole: document.getElementById('dlg-role'),
    dlgText: document.getElementById('dlg-text'),
    dlgReply: document.getElementById('dlg-reply'),
    policePanel: document.getElementById('police-panel'),
    policeTitle: document.getElementById('police-title'),
    policeUnits: document.getElementById('police-units'),
    airUnit: document.getElementById('air-unit'),
    badge: document.getElementById('stealth-badge'),
    vehicleHud: document.getElementById('vehicle-hud'),
    carName: document.getElementById('car-name'),
    carCond: document.getElementById('car-cond'),
    carSpeed: document.getElementById('car-speed'),
    carGear: document.getElementById('car-gear'),
    radio: document.getElementById('radio'),
    wasted: document.getElementById('wasted'),
    wastedSub: document.getElementById('wasted-sub'),
    start: document.getElementById('start-screen'),
    pause: document.getElementById('pause-menu'),
    geckos: document.getElementById('geckos'),
    hint: document.getElementById('hint'),
  };
  minimapCtx = el.minimap.getContext('2d');
  const mc = document.getElementById('map-canvas');
  if (mc) mapCtx = mc.getContext('2d');
  buildSlots();
  buildPauseTabs();
  document.getElementById('start-btn').addEventListener('click', () => startGame());
  const loadBtn = document.getElementById('load-btn');
  if (loadBtn) loadBtn.addEventListener('click', () => { loadSave(); startGame(); });
  document.querySelectorAll('.pause-tab').forEach((b) => {
    b.addEventListener('click', () => showTab(b.dataset.tab));
  });
  const saveBtn = document.getElementById('save-btn');
  if (saveBtn) saveBtn.addEventListener('click', saveGame);
  const loadBtn2 = document.getElementById('load-btn2');
  if (loadBtn2) loadBtn2.addEventListener('click', loadSave);
  const soundBtn = document.getElementById('sound-btn');
  if (soundBtn) soundBtn.addEventListener('click', () => { S.soundOn = !S.soundOn; soundBtn.textContent = S.soundOn ? 'SOUND: ON' : 'SOUND: OFF'; });
  const densBtn = document.getElementById('density-btn');
  if (densBtn) densBtn.addEventListener('click', () => {
    hudDensity = hudDensity === 'Full' ? 'Compact' : 'Full';
    densBtn.textContent = 'HUD DENSITY: ' + hudDensity.toUpperCase();
    el.policePanel.classList.toggle('compact', hudDensity === 'Compact');
  });
}

export function startGame() {
  S.started = true;
  el.start.style.display = 'none';
  el.root.style.display = 'block';
  S.message = 'Welcome to SOLARA — meet Lupe at MO\'S';
  S.messageUntil = S.time + 4;
}

function buildSlots() {
  el.slots.innerHTML = '';
  WEAPONS.forEach((w, i) => {
    const d = document.createElement('div');
    d.className = 'slot';
    d.id = 'slot-' + i;
    d.innerHTML = '<span class="slot-num">' + (i + 1) + '</span><span class="slot-name">' + w.name + '</span><span class="slot-ammo" id="slot-ammo-' + i + '"></span>';
    el.slots.appendChild(d);
  });
}

export function showDialogue(speaker, role, text, reply) {
  el.dlgSpeaker.textContent = speaker;
  el.dlgRole.textContent = role;
  el.dlgText.textContent = '"' + text + '"';
  el.dlgReply.textContent = reply ? 'KAI: "' + reply + '"' : '';
  el.dialogue.style.display = 'block';
  S.dialogueUntil = S.time + 6;
  // no real-time timeout: updateHUD hides it on game time (S.dialogueUntil),
  // so staged shots keep the dialogue visible while headless runs slowly.
}

export function showWasted(kind) {
  el.wasted.style.display = 'flex';
  el.wasted.querySelector('.wasted-big').textContent = kind;
  el.wastedSub.textContent = kind === 'WASTED' ? 'Mercy Clinic patched you up · -$500' : 'PCPD let you go with a warning';
  setTimeout(() => { el.wasted.style.display = 'none'; }, 2600);
}

function buildPauseTabs() {
  const story = document.getElementById('tab-story');
  if (!story) return;
  story.innerHTML = '<h2>STORY — 8 JOBS</h2>' + MISSIONS.map((m, i) => {
    const done = i < S.jobsDone;
    const cur = i === S.missionIdx && S.missionIdx < MISSIONS.length;
    return '<div class="story-row' + (done ? ' done' : '') + (cur ? ' current' : '') + '">' +
      '<span class="story-check">' + (done ? '✓' : (cur ? '▶' : '·')) + '</span>' +
      '<span class="story-title">' + (i + 1) + '. ' + m.title.toUpperCase() + '</span>' +
      '<span class="story-contact">' + m.contact + '</span>' +
      '<span class="story-reward">$' + m.reward + '</span>' +
      '<span class="story-stages">' + m.stages + ' stage' + (m.stages > 1 ? 's' : '') + '</span></div>';
  }).join('');
}

export function showTab(name) {
  document.querySelectorAll('.pause-tab').forEach((b) => b.classList.toggle('active', b.dataset.tab === name));
  document.querySelectorAll('.pause-page').forEach((p) => p.style.display = p.id === 'tab-' + name ? 'block' : 'none');
  if (name === 'stats') renderStats();
  if (name === 'crew') renderCrew();
  if (name === 'story') buildPauseTabs();
}

function renderStats() {
  const t = document.getElementById('tab-stats');
  if (!t) return;
  const rows = [
    ['CASH', '$' + S.cash], ['RESPECT', S.rank + ' · ' + S.jobsDone + '/8 jobs'],
    ['DISTRICTS HELD', S.jobsDone >= 8 ? '7/7' : Math.min(7, 1 + Math.floor(S.jobsDone / 2)) + '/7'],
    ['GOLDEN GECKOS', S.geckosGot + '/20'], ['STUNT JUMPS', S.stunts + '/5'],
    ['RACES WON', S.racesWon], ['CARS STOLEN', S.carsJacked], ['SAFEHOUSES', S.safehouses + '/3'],
    ['BEST WANTED LEVEL', S.bestWanted + ' STARS'], ['POLICE ESCAPES', S.escapes],
    ['CRUISERS WRECKED', S.cruisersWrecked], ['HELICOPTERS DOWNED', S.helisDowned],
    ['TIMES BUSTED', S.busted], ['TIMES WASTED', S.wasted],
  ];
  t.innerHTML = '<h2>CAREER STATS</h2>' + rows.map(([k, v]) => '<div class="stat-row"><span>' + k + '</span><b>' + v + '</b></div>').join('');
}

function renderCrew() {
  const t = document.getElementById('tab-crew');
  if (!t) return;
  t.innerHTML = '<h2>CREW</h2>' + CREW.map((c) => {
    const cd = Math.ceil(S.crewCd[c.id] || 0);
    return '<div class="crew-row"><b>' + c.name + ' · ' + c.ability + '</b><span>' + c.desc + '</span>' +
      '<span class="crew-key">[' + c.key.replace('Key', '') + '] ' + (cd > 0 ? cd + 's cooldown' : 'READY') + '</span></div>';
  }).join('');
}

function saveGame() {
  try {
    localStorage.setItem('solara-r10-save', JSON.stringify({
      cash: S.cash, jobsDone: S.jobsDone, missionIdx: S.missionIdx, rank: S.rank,
      px: S.px, pz: S.pz, health: S.health, armour: S.armour, geckosGot: S.geckosGot,
    }));
    S.message = 'GAME SAVED'; S.messageUntil = S.time + 2;
  } catch {}
}
function loadSave() {
  try {
    const d = JSON.parse(localStorage.getItem('solara-r10-save') || 'null');
    if (!d) return;
    S.cash = d.cash; S.jobsDone = d.jobsDone; S.missionIdx = d.missionIdx; S.rank = d.rank;
    S.px = d.px; S.pz = d.pz; S.health = d.health; S.armour = d.armour; S.geckosGot = d.geckosGot || 0;
    S.message = 'SAVE LOADED'; S.messageUntil = S.time + 2;
  } catch {}
}

export function togglePause() {
  S.paused = !S.paused;
  el.pause.style.display = S.paused ? 'flex' : 'none';
  if (S.paused) { showTab('map'); renderStats(); renderCrew(); }
}

export function updateHUD(dt) {
  if (!S.started) return;
  const m = currentMission();
  el.cash.textContent = '$' + S.cash;
  el.rank.textContent = S.rank + ' · ' + S.jobsDone + '/8';
  const hrs = 14 + Math.floor(S.time / 120);
  const mins = Math.floor((S.time % 120) / 2);
  el.clock.textContent = String(hrs % 24).padStart(2, '0') + ':' + String(mins).padStart(2, '0');
  // mission panel
  if (S.missionIdx < MISSIONS.length) {
    el.missionTitle.textContent = 'NEXT: ' + m.title.toUpperCase() + ' — ' + m.contact;
    el.missionBrief.textContent = m.brief;
    const prog = missionProgress();
    el.missionStage.textContent = 'STAGE ' + (prog.stage + (S.missionActive ? 1 : 0)) + '/' + prog.total;
    el.missionBar.style.width = Math.round((S.missionActive ? (prog.frac * 100) : 0)) + '%';
    const [tx, tz] = missionTargetPos();
    el.missionDist.textContent = Math.round(Math.hypot(S.px - tx, S.pz - tz)) + ' m';
    el.missionTimer.textContent = S.missionActive ? Math.ceil(S.missionTime) + 's' : '';
  } else {
    el.missionTitle.textContent = 'ALL JOBS DONE — FIXER OF SOLARA';
    el.missionBrief.textContent = 'Solara is yours.';
    el.missionStage.textContent = '8/8';
    el.missionBar.style.width = '100%';
    el.missionDist.textContent = ''; el.missionTimer.textContent = '';
  }
  // stars
  let starsHtml = '';
  for (let i = 0; i < 5; i++) starsHtml += '<span class="star' + (i < S.wanted ? ' lit' : '') + '">★</span>';
  el.stars.innerHTML = starsHtml;
  // health / armour
  el.health.style.width = Math.max(0, S.health) + '%';
  el.armour.style.width = Math.max(0, S.armour) + '%';
  el.healthNum.textContent = Math.ceil(S.health) + ' / ' + Math.ceil(S.armour);
  // ammo + slots
  const w = WEAPONS[S.weaponIdx];
  el.ammo.textContent = w.kind === 'melee' ? '∞' : S.ammo + ' / ' + S.reserve;
  WEAPONS.forEach((ww, i) => {
    const s = document.getElementById('slot-' + i);
    if (s) s.classList.toggle('active', i === S.weaponIdx);
    const a = document.getElementById('slot-ammo-' + i);
    if (a) a.textContent = ww.kind === 'melee' ? '∞' : (i === S.weaponIdx ? S.ammo : ww.mag);
  });
  // geckos
  el.geckos.textContent = '🦎 ' + S.geckosGot + '/20';
  // message
  if (S.time < S.messageUntil && S.message) {
    el.message.textContent = S.message;
    el.message.style.opacity = '1';
  } else el.message.style.opacity = '0';
  if (S.time > S.dialogueUntil) el.dialogue.style.display = 'none';
  // police response panel
  const units = policeUnits();
  if (S.wanted > 0 && units.length) {
    el.policePanel.style.display = 'block';
    el.policeTitle.textContent = 'PCPD RESPONSE — ' + units.length + ' UNITS · CODE ' + S.wanted;
    el.policeUnits.innerHTML = units.map((u) =>
      '<div class="unit"><span class="unit-name">' + u.name + '</span><span>' + u.dist + ' m</span><span class="unit-' + u.status.toLowerCase() + '">' + u.status + '</span></div>'
    ).join('');
    el.airUnit.style.display = units.some((u) => u.name === 'AIR-1') ? 'block' : 'none';
    // HIDDEN / IN SIGHT badge
    if (S.seen) {
      el.badge.style.display = 'block';
      el.badge.className = 'badge sight';
      el.badge.textContent = 'IN SIGHT';
    } else {
      el.badge.style.display = 'block';
      el.badge.className = 'badge hidden';
      el.badge.textContent = 'HIDDEN · evading ' + Math.round(S.evading) + '%';
    }
  } else {
    el.policePanel.style.display = 'none';
    el.badge.style.display = 'none';
  }
  // vehicle HUD
  if (S.inCar && S.car) {
    el.vehicleHud.style.display = 'block';
    el.carName.textContent = S.car.mesh.userData.def.name;
    el.carCond.style.width = Math.max(0, S.car.condition) + '%';
    el.carSpeed.textContent = Math.round(Math.abs(S.carSpeed) * 3.6) + ' KM/H';
    const a = Math.abs(S.carSpeed);
    el.carGear.textContent = a < 6 ? 'G1' : a < 12 ? 'G2' : a < 19 ? 'G3' : a < 26 ? 'G4' : 'G5';
    const st = RADIO[S.station % RADIO.length];
    el.radio.textContent = '♪ ' + st.name + ' / ' + currentSong();
  } else {
    el.vehicleHud.style.display = 'none';
    const st = RADIO[S.station % RADIO.length];
    el.radio.textContent = S.radioOn ? '♪ ' + st.name + ' · ' + currentSong() : 'RADIO OFF';
  }
  // district label
  const d = districtAt(S.px, S.pz);
  const standing = d.grip >= 50 ? 'NEUTRAL' : 'WARY';
  el.district.textContent = d.name + ' · ' + standing + ' ' + d.grip;
  el.hint.textContent = S.inCar ? 'W/S drive · A/D steer · F exit · Q radio · M map' : 'WASD move · F enter car · E start job · click shoot · R reload';
  drawMinimap();
  if (S.mapOpen) drawMap();
  if (S.over && el.wasted.style.display !== 'flex') showWasted(S.message === 'BUSTED' ? 'BUSTED' : 'WASTED');
}

function drawMinimap() {
  const c = minimapCtx, W = 168, H = 168;
  c.clearRect(0, 0, W, H);
  c.save();
  c.beginPath(); c.arc(W / 2, H / 2, W / 2 - 2, 0, Math.PI * 2); c.clip();
  c.fillStyle = '#0e1a24'; c.fillRect(0, 0, W, H);
  const scale = W / 640;
  const px = (x) => (x + 320) * scale, py = (z) => (z + 320) * scale;
  // roads
  c.strokeStyle = 'rgba(255,255,255,0.25)'; c.lineWidth = 2;
  for (const line of [-256, -192, -128, -64, 0, 64, 128, 192, 256]) {
    c.beginPath(); c.moveTo(px(line), 0); c.lineTo(px(line), H); c.stroke();
    c.beginPath(); c.moveTo(0, py(line)); c.lineTo(W, py(line)); c.stroke();
  }
  // ocean
  c.fillStyle = '#1fb6cf'; c.fillRect(0, 0, px(-300), H);
  c.fillStyle = '#f2e3b3'; c.fillRect(px(-300), 0, px(-268) - px(-300), H);
  // districts
  c.font = '7px Arial'; c.textAlign = 'center';
  for (const d of [{ name: 'MARINA', x: -210, z: -210 }, { name: 'OLD PORT', x: -210, z: 210 }, { name: 'DOWNTOWN', x: 0, z: 0 }, { name: 'NEON ROW', x: 0, z: -190 }, { name: 'PALM HTS', x: 190, z: -190 }, { name: 'DOCKSIDE', x: 190, z: 190 }]) {
    c.fillStyle = 'rgba(255,255,255,0.55)';
    c.fillText(d.name, px(d.x), py(d.z));
  }
  // gecko dots
  c.fillStyle = '#ffd21f';
  if (window.__solara && window.__solara.geckos) {
    for (const g of window.__solara.geckos) {
      if (!g.got) { c.beginPath(); c.arc(px(g.x), py(g.z), 2, 0, Math.PI * 2); c.fill(); }
    }
  }
  // waypoint / mission target
  if (S.missionIdx < MISSIONS.length) {
    const [tx, tz] = missionTargetPos();
    c.fillStyle = '#ffd21f';
    c.beginPath(); c.arc(px(tx), py(tz), 4, 0, Math.PI * 2); c.fill();
    c.strokeStyle = '#ffd21f'; c.lineWidth = 1.5;
    c.beginPath(); c.moveTo(px(S.px), py(S.pz)); c.lineTo(px(tx), py(tz)); c.stroke();
  }
  // police dots
  c.fillStyle = '#ff4444';
  for (const u of policeUnits()) {
    // approximate: red dots near player at unit distance (direction unknown here — use stored positions)
  }
  if (window.__solara && window.__solara.policeDots) {
    for (const p of window.__solara.policeDots) {
      c.beginPath(); c.arc(px(p.x), py(p.z), 3, 0, Math.PI * 2); c.fill();
    }
  }
  // player arrow
  c.save();
  c.translate(px(S.px), py(S.pz));
  c.rotate(-S.heading);
  c.fillStyle = '#ffffff';
  c.beginPath(); c.moveTo(0, -7); c.lineTo(5, 6); c.lineTo(-5, 6); c.closePath(); c.fill();
  c.restore();
  c.restore();
  // ring
  c.strokeStyle = 'rgba(255,255,255,0.7)'; c.lineWidth = 2;
  c.beginPath(); c.arc(W / 2, H / 2, W / 2 - 2, 0, Math.PI * 2); c.stroke();
}

function drawMap() {
  if (!mapCtx) return;
  const c = mapCtx, W = 560, H = 420;
  c.clearRect(0, 0, W, H);
  c.fillStyle = '#0e1a24'; c.fillRect(0, 0, W, H);
  const scale = W / 640;
  const px = (x) => (x + 320) * scale, py = (z) => (z + 320) * (H / 640);
  c.fillStyle = '#1fb6cf'; c.fillRect(0, 0, px(-300), H);
  c.fillStyle = '#f2e3b3'; c.fillRect(px(-300), 0, px(-268) - px(-300), H);
  c.strokeStyle = 'rgba(255,255,255,0.3)'; c.lineWidth = 3;
  for (const line of [-256, -192, -128, -64, 0, 64, 128, 192, 256]) {
    c.beginPath(); c.moveTo(px(line), 0); c.lineTo(px(line), H); c.stroke();
    c.beginPath(); c.moveTo(0, py(line)); c.lineTo(W, py(line)); c.stroke();
  }
  c.font = 'bold 13px Arial'; c.textAlign = 'center';
  const { DISTRICTS } = { DISTRICTS: null };
  // district labels (imported list via window to avoid a second import cycle)
  const list = window.__solaraDistricts || [];
  for (const d of list) {
    c.fillStyle = d.color;
    c.beginPath(); c.arc(px(d.x), py(d.z), d.r * scale, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#0e1a24';
    c.fillText(d.name, px(d.x), py(d.z));
  }
  c.fillStyle = '#ffffff';
  c.beginPath(); c.arc(px(S.px), py(S.pz), 6, 0, Math.PI * 2); c.fill();
  if (S.missionIdx < MISSIONS.length) {
    const [tx, tz] = missionTargetPos();
    c.fillStyle = '#ffd21f';
    c.beginPath(); c.arc(px(tx), py(tz), 8, 0, Math.PI * 2); c.fill();
  }
}
