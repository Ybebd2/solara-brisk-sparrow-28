// SOLARA R10 — audio: WebAudio synth radio (4 stations) + SFX. Never throws.
import { S, RADIO } from './config.js';

let ctx = null, master = null, radioGain = null, radioTimer = null;
let sirenOsc = null, sirenGain = null, engineOsc = null, engineGain = null;
let step = 0;

const SCALES = [
  [220, 261.6, 329.6, 392, 440, 523.3],   // PUERTO latin gold
  [196, 233.1, 293.7, 349.2, 392, 466.2], // CELESTE synthwave
  [246.9, 293.7, 329.6, 392, 440, 493.9], // SOLARA daytime
  [174.6, 207.7, 261.6, 311.1, 349.2, 415.3], // NEON night drive
];
const TEMPO = [340, 260, 300, 220];

function ensure() {
  if (ctx) return true;
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    ctx = new AC();
    master = ctx.createGain(); master.gain.value = 0.5; master.connect(ctx.destination);
    radioGain = ctx.createGain(); radioGain.gain.value = 0.16; radioGain.connect(master);
    engineOsc = ctx.createOscillator(); engineOsc.type = 'sawtooth'; engineOsc.frequency.value = 50;
    engineGain = ctx.createGain(); engineGain.gain.value = 0; engineOsc.connect(engineGain); engineGain.connect(master);
    engineOsc.start();
    sirenOsc = ctx.createOscillator(); sirenOsc.type = 'sine'; sirenOsc.frequency.value = 700;
    sirenGain = ctx.createGain(); sirenGain.gain.value = 0; sirenOsc.connect(sirenGain); sirenGain.connect(master);
    sirenOsc.start();
    return true;
  } catch { return false; }
}

export function initAudio() {
  if (!ensure()) return;
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  startRadio();
}

function startRadio() {
  if (radioTimer || !ctx) return;
  const beat = () => {
    if (!ctx) return;
    try {
      const scale = SCALES[S.station % SCALES.length];
      const tempo = TEMPO[S.station % TEMPO.length];
      if (S.radioOn && S.soundOn && S.started) {
        const note = scale[step % scale.length];
        const bass = scale[(step * 5 + 2) % scale.length] / 2;
        blip(note, tempo * 0.0016, 'triangle', 0.5);
        if (step % 2 === 0) blip(bass, tempo * 0.0022, 'sine', 0.7);
        if (step % 4 === 3) blip(note * 2, tempo * 0.001, 'square', 0.18);
      }
      step++;
      radioTimer = setTimeout(beat, tempo);
    } catch { radioTimer = null; }
  };
  beat();
}

function blip(freq, dur, type, vol) {
  if (!ctx || !radioGain) return;
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type; o.frequency.value = freq;
  g.gain.setValueAtTime(vol, ctx.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
  o.connect(g); g.connect(radioGain);
  o.start(); o.stop(ctx.currentTime + dur + 0.02);
}

export function playShot() {
  if (!ensure() || !S.soundOn) return;
  try {
    const dur = 0.12, buf = ctx.createBuffer(1, ctx.sampleRate * dur, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
    const src = ctx.createBufferSource(); src.buffer = buf;
    const g = ctx.createGain(); g.gain.value = 0.5;
    src.connect(g); g.connect(master); src.start();
  } catch {}
}

export function playPickup() {
  if (!ensure() || !S.soundOn) return;
  try { blip(880, 0.12, 'sine', 0.6); setTimeout(() => blip(1320, 0.16, 'sine', 0.6), 90); } catch {}
}

export function playJobDone() {
  if (!ensure() || !S.soundOn) return;
  try { [523, 659, 784].forEach((f, i) => setTimeout(() => blip(f, 0.2, 'triangle', 0.6), i * 110)); } catch {}
}

export function updateAudio() {
  if (!ctx) return;
  try {
    const now = ctx.currentTime;
    if (engineGain) {
      const target = (S.inCar && S.started) ? 0.03 + Math.min(0.06, Math.abs(S.carSpeed) * 0.002) : 0;
      engineGain.gain.setTargetAtTime(S.soundOn ? target : 0, now, 0.1);
      if (engineOsc) engineOsc.frequency.setTargetAtTime(45 + Math.abs(S.carSpeed) * 2.2, now, 0.1);
    }
    if (sirenGain && sirenOsc) {
      const on = S.wanted > 0 && S.soundOn && S.started;
      sirenGain.gain.setTargetAtTime(on ? 0.035 : 0, now, 0.2);
      if (on) sirenOsc.frequency.setTargetAtTime(650 + 250 * Math.sin(now * 2.4), now, 0.05);
    }
  } catch {}
}

export function currentSong() {
  const st = RADIO[S.station % RADIO.length];
  return st.songs[Math.floor(S.time / 24) % st.songs.length];
}
