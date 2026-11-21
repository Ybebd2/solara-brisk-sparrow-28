// SOLARA R10 — config.js
// World, districts, weapons, ranks, radio, crew, shared state S.
export const WORLD = {
  size: 640,
  roadGap: 64,
  roadWidth: 20,
  beachX: -268,
  oceanX: -300,
  blockSize: 50,
};

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
  { name: 'FISTS', mag: Infinity, dmg: 12, rate: 0.35, range: 3, auto: true, label: 'FISTS' },
  { name: 'VESPER', mag: 12, dmg: 34, rate: 0.16, range: 90, auto: false, label: 'VESPER 9' },
  { name: 'JACKAL', mag: 30, dmg: 16, rate: 0.09, range: 70, auto: true, label: 'JACKAL SMG' },
  { name: 'LONGSHOT', mag: 8, dmg: 80, rate: 0.7, range: 160, auto: false, label: 'LONGSHOT' },
  { name: 'RIOT', mag: 6, dmg: 22, rate: 0.8, range: 40, auto: false, label: 'RIOT 12G' },
];

export const RANKS = [
  { name: 'ROOKIE', jobs: 0, rp: 0 },
  { name: 'RUNNER', jobs: 2, rp: 800 },
  { name: 'HUSTLER', jobs: 5, rp: 1800 },
  { name: 'ENFORCER', jobs: 5, rp: 3200 },
  { name: 'FIXER', jobs: 8, rp: 5200 },
];

export function rankFor(jobs) {
  if (jobs >= 8) return 'FIXER';
  if (jobs >= 5) return 'HUSTLER';
  if (jobs >= 2) return 'RUNNER';
  return 'ROOKIE';
}

export const RADIO = [
  { name: 'PUERTO 88.3', genre: 'latin gold', songs: ['Fog over Dock 9 · Pelícano', 'Sol de Medianoche · Los Veleros', 'Calle Ocho Nights · Marisol'] },
  { name: 'CELESTE 98.1', genre: 'synthwave', songs: ['Neon Horizon · Vector Nine', 'Midnight Drive · Chrome Hearts', 'Sunset Protocol · Nova Rain'] },
  { name: 'SOLARA 98.3', genre: 'daytime', songs: ['Golden Hour · The Palms', 'Beachside Radio · Solara Sound', 'Island Pop · Marisol'] },
  { name: 'NEON 101.5', genre: 'night drive', songs: ['After Dark · Neon Bloom', 'City Lights · Vega', 'Electric Avenue · The Currents'] },
];

export const CREW = {
  MARA: { key: 'KeyZ', name: 'MARA', ability: 'GHOST', desc: '-1 wanted star', cd: 90 },
  SULLY: { key: 'KeyX', name: 'SULLY', ability: 'PIT CREW', desc: 'full repair in car', cd: 60 },
  KIKI: { key: 'KeyC', name: 'KIKI', ability: 'LOOKOUT', desc: 'patrols revealed 20s', cd: 60 },
};

export const MISSIONS = [
  { contact: 'LUPE', title: 'First Fix', type: 'goto', target: [-40, -192], time: 180, reward: 400, brief: "Meet Lupe at MO'S on Neon Row. She has your first job.", stages: 1 },
  { contact: 'SULLY', title: 'Tow Job', type: 'driveTo', target: [192, 192], time: 240, reward: 650, brief: 'Sully needs a car moved to Dockside. Grab wheels and drive it there.', stages: 1 },
  { contact: 'MARCO', title: "Marco's Run", type: 'driveTo', target: [-192, 192], time: 210, reward: 800, brief: "Marco's package goes to Old Port. Drive it there, no scratches.", stages: 1 },
  { contact: 'BRANDT', title: 'The Ledger', type: 'hold', target: [64, 64], time: 240, reward: 1100, brief: "Brandt's ledger is in the Downtown office. Hold the spot 5s to lift it.", stages: 1 },
  { contact: 'AURORA', title: "Aurora's Light", type: 'goto', target: [-262, -40], time: 200, reward: 900, brief: 'Aurora waits on the beach boardwalk. Walk the sand, hear her out.', stages: 1 },
  { contact: 'LUPE', title: 'Hot Wheels', type: 'carjack', target: [0, -128], time: 180, reward: 1000, brief: 'Lupe wants a fresh ride. Jack any car on Neon Row and bring it to the mark.', stages: 1 },
  { contact: 'SULLY', title: 'Heat Wave', type: 'escape', target: [256, -192], time: 300, reward: 1400, brief: "The heat is on. Lose the cops, then reach Sully's hideout in Palm Heights.", stages: 1 },
  { contact: 'BRANDT', title: 'The Solara Job', type: 'finale', target: [-128, 0], time: 360, reward: 5000, brief: 'The big one. Hold the bank door 5s, then drive the getaway to the Marina.', stages: 2 },
];

export const POLICE_NAMES = ['KITE-1', 'MARLIN-3', 'CORAL-48', 'CORAL-85', 'PELICAN-11', 'BARRACUDA-18', 'MANTA-32', 'GECKO-25'];

export function makeState() {
  return {
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
    // R10 extras
    respect: 0, geckos: 0, stuntJumps: 0, racesWon: 0, escapes: 0,
    cruisersWrecked: 0, helisDowned: 0, busted: 0, wasted: 0,
    bestWanted: 0, safehouses: 1, districtsHeld: 0,
    heliUp: false, airDeployed: false,
    dialogue: null, dialogueSpeaker: null,
  };
}
