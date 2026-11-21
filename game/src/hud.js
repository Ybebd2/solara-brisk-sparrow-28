// SOLARA R10 — hud.js
// Dense HUD (Karimbu + Golden Hour Kings): mission panel with STAGE x/y
// + segmented progress bar, POLICE RESPONSE panel (named units + distance
// + status), HIDDEN/IN SIGHT badge + evading %, 5 gold wanted stars,
// vehicle HUD (name, CONDITION, KM/H, gear, radio), district standing on
// minimap, career stats, WASTED screen, two-way dialogue.
import { WEAPONS, RADIO, MISSIONS, rankFor } from './config.js';
import { districtAt } from './world.js';
import { currentSong } from './audio.js';

function el(id) { return document.getElementById(id); }

export function buildHUD(S, missions, police) {
  const hud = el('hud');
  hud.innerHTML = `
    <div id="mission-panel" class="panel">
      <div id="mission-title">NEXT: —</div>
      <div id="mission-stage"></div>
      <div id="mission-progress"></div>
      <div id="mission-dist"></div>
      <div id="mission-timer"></div>
    </div>
    <div id="stats-top">
      <div id="cash">$250</div>
      <div id="clock">14:00</div>
      <div id="rank">ROOKIE</div>
      <div id="stars"></div>
    </div>
    <div id="police-panel" class="panel" style="display:none">
      <div id="police-head"></div>
      <div id="police-units"></div>
      <div id="air-unit" style="display:none">AIR UNIT DEPLOYED</div>
    </div>
    <div id="stealth-badge" style="display:none"></div>
    <div id="bars">
      <div class="bar-row"><span>HEALTH</span><div class="bar"><div id="health-bar"></div></div><span id="health-num"></span></div>
      <div class="bar-row"><span>ARMOUR</span><div class="bar"><div id="armour-bar"></div></div><span id="armour-num"></span></div>
    </div>
    <div id="weapon-slots"></div>
    <div id="vehicle-hud" style="display:none">
      <div id="car-name"></div>
      <div id="car-cond-wrap"><span>CONDITION</span><div class="bar"><div id="car-cond"></div></div></div>
      <div id="car-speed"></div>
      <div id="car-gear"></div>
      <div id="car-radio"></div>
    </div>
    <div id="minimap-wrap"><canvas id="minimap" width="180" height="180"></canvas><div id="district-label"></div></div>
    <div id="message"></div>
    <div id="dialogue" style="display:none"><div id="dialogue-speaker"></div><div id="dialogue-text"></div><div id="dialogue-reply"></div></div>
    <div id="wasted" style="display:none">WASTED<span id="wasted-sub"></span></div>
    <div id="gecko-counter"></div>
    <div id="crosshair">·</div>
  `;
  const mm = el('minimap');
  const mctx = mm.getContext('2d');

  function starsHTML() {
    let h = '';
    for (let i = 0; i < 5; i++) {
      h += `<span class="star ${i < S.wanted ? 'lit' : ''}">★</span>`;
    }
    return h;
  }
  function slotsHTML() {
    return WEAPONS.map((w, i) => {
      const sel = i === S.weaponIdx ? 'sel' : '';
      const ammo = w.mag === Infinity ? '∞' : (i === S.weaponIdx ? S.ammo : w.mag);
      return `<div class="slot ${sel}"><b>${i + 1}</b> ${w.label} <span>${ammo}</span></div>`;
    }).join('');
  }
  function update() {
    const m = missions.mission();
    // mission panel
    if (m) {
      el('mission-title').textContent = 'NEXT: ' + m.title.toUpperCase() + ' — ' + m.brief;
      el('mission-stage').textContent = missions.stageLabel();
      const segs = m.stages;
      let bars = '';
      for (let i = 0; i < segs; i++) {
        const filled = S.missionActive && (i < S.missionStage || (i === S.missionStage && m.type !== 'finale')) ? 'filled' : '';
        bars += `<span class="seg ${filled}"></span>`;
      }
      el('mission-progress').innerHTML = bars;
      el('mission-dist').textContent = S.missionActive ? ('DIST ' + Math.round(missions.distToTarget()) + ' m') : 'Press E at the yellow marker to start';
      el('mission-timer').textContent = S.missionActive ? ('TIME ' + Math.max(0, Math.ceil(S.missionTime)) + 's') : '';
    }
    // top stats
    el('cash').textContent = '$' + Math.round(S.cash);
    const hrs = 14 + Math.floor(S.time / 3600 * 3);
    const mins = Math.floor((S.time / 60 * 3) % 60);
    el('clock').textContent = String(hrs % 24).padStart(2, '0') + ':' + String(mins).padStart(2, '0');
    el('rank').textContent = S.rank + ' · ' + S.jobsDone + '/8';
    el('stars').innerHTML = starsHTML();
    // police response panel
    const units = police.responseUnits();
    const pp = el('police-panel');
    if (S.wanted > 0 && units.length) {
      pp.style.display = 'block';
      el('police-head').textContent = 'PCPD RESPONSE — ' + units.length + ' UNITS · CODE ' + S.wanted;
      el('police-units').innerHTML = units.map(u => {
        const cls = u.status === 'PURSUIT' ? 'pursuit' : u.status === 'FIRING' ? 'firing' : u.status === 'WRECKED' ? 'wrecked' : '';
        return `<div class="unit ${cls}">${u.name} ${u.dist} m ${u.status}</div>`;
      }).join('');
      el('air-unit').style.display = S.airDeployed ? 'block' : 'none';
    } else pp.style.display = 'none';
    // HIDDEN / IN SIGHT
    const badge = el('stealth-badge');
    if (S.wanted > 0) {
      badge.style.display = 'block';
      if (S.seen) {
        badge.className = 'in-sight';
        badge.textContent = 'IN SIGHT';
      } else {
        badge.className = 'hidden';
        badge.textContent = 'HIDDEN · evading ' + Math.round(S.evading) + '%';
      }
    } else badge.style.display = 'none';
    // health/armour
    el('health-bar').style.width = Math.max(0, S.health) + '%';
    el('health-num').textContent = Math.round(Math.max(0, S.health));
    el('armour-bar').style.width = Math.max(0, S.armour) + '%';
    el('armour-num').textContent = Math.round(Math.max(0, S.armour));
    el('weapon-slots').innerHTML = slotsHTML();
    // vehicle HUD
    const vh = el('vehicle-hud');
    if (S.inCar && S.car) {
      vh.style.display = 'block';
      el('car-name').textContent = S.car.type.name;
      el('car-cond').style.width = Math.round(S.car.condition || 100) + '%';
      el('car-speed').textContent = Math.round(Math.abs(S.carSpeed) * 3.6) + ' KM/H';
      const gear = Math.min(5, 1 + Math.floor(Math.abs(S.carSpeed) / 8));
      el('car-gear').textContent = 'G' + gear;
      el('car-radio').textContent = '♪ ' + RADIO[S.station % RADIO.length].name + ' / ' + currentSong(S);
    } else vh.style.display = 'none';
    // minimap + district
    const d = districtAt(S.px, S.pz);
    el('district-label').textContent = d.name + ' · NEUTRAL ' + d.grip;
    drawMinimap(mctx, S, missions);
    // message
    el('message').textContent = S.time < S.messageUntil ? S.message : '';
    // dialogue (two-way: speaker + Kai reply)
    const dg = el('dialogue');
    if (S.dialogue && S.time < S.dialogueUntil) {
      dg.style.display = 'block';
      el('dialogue-speaker').textContent = S.dialogueSpeaker || '';
      el('dialogue-text').textContent = S.dialogue;
      const m2 = missions.mission();
      el('dialogue-reply').textContent = m2 ? ('Kai: ' + (m2 ? replyFor(S.missionIdx) : '')) : '';
    } else dg.style.display = 'none';
    // WASTED
    const w = el('wasted');
    if (S.message === 'WASTED' && S.time < S.messageUntil) {
      w.style.display = 'flex';
      el('wasted-sub').textContent = 'Mercy Clinic patched you up · -$500';
    } else w.style.display = 'none';
    // geckos
    el('gecko-counter').textContent = '◈ Golden Geckos ' + S.geckos + '/20';
    // crosshair only when aiming with a gun
    el('crosshair').style.display = (!S.inCar && S.weaponIdx > 0) ? 'block' : 'none';
  }
  function replyFor(idx) {
    const replies = [
      "On my way, Lupe. First fix, no mistakes.",
      'Consider it moved. Keys stay with me.',
      'Old Port. Quiet roads. Got it.',
      'Five seconds. Then the ledger walks out with me.',
      "I'm listening, Aurora. The beach is quiet tonight.",
      'Fresh ride, coming up. Neon Row it is.',
      'They will not catch me. Palm Heights, soon.',
      'The Solara Job. We finish this tonight.',
    ];
    return replies[idx] || '';
  }
  function drawMinimap(ctx, S, missions) {
    ctx.clearRect(0, 0, 180, 180);
    ctx.fillStyle = 'rgba(10,20,30,0.85)';
    ctx.fillRect(0, 0, 180, 180);
    // districts
    ctx.strokeStyle = 'rgba(255,255,255,0.25)';
    for (const d of __districts()) {
      const x = 90 + d.x * 0.28, y = 90 + d.z * 0.28;
      ctx.beginPath(); ctx.arc(x, y, d.r * 0.28, 0, Math.PI * 2); ctx.stroke();
    }
    // roads
    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    for (let c = -256; c <= 256; c += 64) {
      ctx.beginPath(); ctx.moveTo(90 + c * 0.28, 0); ctx.lineTo(90 + c * 0.28, 180); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, 90 + c * 0.28); ctx.lineTo(180, 90 + c * 0.28); ctx.stroke();
    }
    // gecko dots
    ctx.fillStyle = '#ffd700';
    if (window.__geckos) for (const g of window.__geckos) {
      if (g.taken) continue;
      ctx.beginPath(); ctx.arc(90 + g.x * 0.28, 90 + g.z * 0.28, 2, 0, Math.PI * 2); ctx.fill();
    }
    // mission target (gold)
    const t = missions.targetPos();
    if (t) {
      ctx.fillStyle = '#ffea00';
      ctx.beginPath(); ctx.arc(90 + t.x * 0.28, 90 + t.z * 0.28, 4, 0, Math.PI * 2); ctx.fill();
    }
    // player (cyan arrow)
    const px = 90 + S.px * 0.28, py = 90 + S.pz * 0.28;
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(-S.heading);
    ctx.fillStyle = '#00e5ff';
    ctx.beginPath(); ctx.moveTo(0, -7); ctx.lineTo(5, 6); ctx.lineTo(-5, 6); ctx.closePath(); ctx.fill();
    ctx.restore();
  }
  function __districts() {
    return window.__districts || [];
  }
  return { update };
}
