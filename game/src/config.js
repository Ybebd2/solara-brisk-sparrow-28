// SOLARA R10 — config: world, districts, weapons, ranks, radio, crew, shared state.
export const WORLD = { size: 640, roadGap: 64, roadWidth: 20, beachX: -268, oceanX: -300, blockSize: 50 };

export const DISTRICTS = [
  { name: 'MARINA BAY', x: -210, z: -210, r: 90, color: '#4fc3f7', grip: 55 },
  { name: 'OLD PORT', x: -210, z: 210, r: 90, color: '#ffb74d', grip: 45 },
  { name: 'DOWNTOWN', x: 0, z: 0, r: 110, color: '#ff5252', grip: 30 },
  { name: 'NEON ROW', x: 0, z: -190, r: 80, color: '#e040fb', grip: 35 },
  { name: 'PALM HEIGHTS', x: 190, z: -190, r: 90, color: '#69f0ae', grip: 50 },
  { name: 'DOCKSIDE', x: 190, z: 190, r: 90, color: '#ffd54f', grip: 40 },
  { name: 'SOLARA BEACH', x: -280, z: 0, r: 90, color: '#fff176', grip: 50 },
];

export const WEAPONS = [
  { name: 'VESPER', kind: 'pistol', mag: 12, dmg: 34, rate: 0.16, range: 90, auto: false },
  { name: 'JACKAL', kind: 'smg', mag: 30, dmg: 16, rate: 0.09, range: 70, auto: true },
  { name: 'LONGSHOT', kind: 'rifle', mag: 8, dmg: 80, rate: 0.7, range: 160, auto: false },
  { name: 'RIOT', kind: 'shotgun', mag: 6, dmg: 22, rate: 0.8, range: 40, auto: false },
  { name: 'FISTS', kind: 'melee', mag: Infinity, dmg: 12, rate: 0.35, range: 3, auto: true },
];

export const RANKS = [
  { name: 'ROOKIE', jobs: 0 }, { name: 'RUNNER', jobs: 2 },
  { name: 'HUSTLER', jobs: 5 }, { name: 'FIXER', jobs: 8 },
];

export const RADIO = [
  { name: 'PUERTO 88.3', desc: 'latin gold', songs: ['Fog over Dock 9 · Pelícano', 'Sol de Medianoche · Los Veleros', 'Calle Ocho Nights · Marisol'] },
  { name: 'CELESTE 98.1', desc: 'synthwave', songs: ['Neon Coastline · Vector Dawn', 'Midnight Palm · Chrome Suns'] },
  { name: 'SOLARA 98.3', desc: 'daytime', songs: ['Golden Hour · The Breakers', 'Salt Air Radio · Coral Club'] },
  { name: 'NEON 101.5', desc: 'night drive', songs: ['Violet Static · Nightmarket', 'Glass Avenue · Ultra Violet'] },
];

export const CREW = [
  { id: 'MARA', key: 'KeyZ', name: 'MARA', ability: 'GHOST', desc: '-1 wanted star', cd: 90 },
  { id: 'SULLY', key: 'KeyX', name: 'SULLY', ability: 'PIT CREW', desc: 'full repair in car', cd: 60 },
  { id: 'KIKI', key: 'KeyC', name: 'KIKI', ability: 'LOOKOUT', desc: 'patrols revealed 20s', cd: 60 },
];

export function rankFor(jobs) {
  if (jobs >= 8) return 'FIXER';
  if (jobs >= 5) return 'HUSTLER';
  if (jobs >= 2) return 'RUNNER';
  return 'ROOKIE';
}

export function districtAt(x, z) {
  let best = null, bestD = Infinity;
  for (const d of DISTRICTS) {
    const dd = Math.hypot(x - d.x, z - d.z);
    if (dd < d.r && dd < bestD) { best = d; bestD = dd; }
  }
  return best || DISTRICTS[2];
}

// Shared mutable state — exact fields, exact initial values (spec).
export const S = {
  time: 0, paused: false, mapOpen: false, started: false,
  px: -40, pz: 60, heading: Math.PI * 0.75, speed: 0,
  health: 100, armour: 40, cash: 250, wanted: 0, evading: 0, seen: false,
  soundOn: true, dialogueUntil: 0, autopilot: false, jackedAt: -99,
  gripBonus: 0, shotMode: false, weaponIdx: 0, ammo: 12, reserve: 48,
  inCar: false, car: null, carSpeed: 0,
  missionIdx: 0, missionActive: false, missionTime: 0, missionStage: 0,
  missionHold: 0, jobsDone: 0, rank: 'ROOKIE',
  crewCd: { MARA: 0, SULLY: 0, KIKI: 0 }, lookoutUntil: 0,
  station: 0, radioOn: true, waypoint: null,
  shotsFired: 0, hits: 0, carsJacked: 0, arrests: 0,
  message: '', messageUntil: 0, over: false,
  // R10 runtime extras:
  geckosGot: 0, stunts: 0, racesWon: 0, safehouses: 1, bestWanted: 0,
  escapes: 0, cruisersWrecked: 0, helisDowned: 0, busted: 0, wasted: 0,
};
