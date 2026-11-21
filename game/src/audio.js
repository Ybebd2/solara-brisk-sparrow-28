// SOLARA R10 — audio.js
// Tiny WebAudio synth: radio station names, gunshot blips, pickup chimes.
// No audio files — everything is synthesized so the game has zero assets.
import { RADIO } from './config.js';

let ctx = null;
let songTimer = 0;
let songIdx = 0;

export function ensureAudio(S) {
  if (!S.soundOn) return null;
  if (!ctx) {
    try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch { return null; }
  }
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  return ctx;
}

export function playTone(freq, dur, type, gain) {
  if (!ctx) return;
  try {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type || 'square';
    o.frequency.value = freq;
    g.gain.setValueAtTime(gain || 0.06, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur);
    o.connect(g); g.connect(ctx.destination);
    o.start(); o.stop(ctx.currentTime + dur);
  } catch { /* ignore */ }
}

export function playShot(S) {
  if (!ensureAudio(S)) return;
  playTone(180 + Math.random() * 60, 0.08, 'square', 0.08);
  playTone(90, 0.12, 'sawtooth', 0.05);
}

export function playPickup(S) {
  if (!ensureAudio(S)) return;
  playTone(660, 0.1, 'sine', 0.07);
  setTimeout(() => playTone(880, 0.14, 'sine', 0.07), 90);
}

export function playJobDone(S) {
  if (!ensureAudio(S)) return;
  [523, 659, 784].forEach((f, i) => setTimeout(() => playTone(f, 0.16, 'sine', 0.08), i * 110));
}

export function playSiren(S) {
  if (!ensureAudio(S)) return;
  playTone(700, 0.18, 'sine', 0.03);
  setTimeout(() => playTone(950, 0.18, 'sine', 0.03), 180);
}

export function currentSong(S) {
  const st = RADIO[S.station % RADIO.length];
  return st.songs[songIdx % st.songs.length];
}

export function updateRadio(S, dt) {
  if (!S.radioOn) return;
  songTimer += dt;
  if (songTimer > 24) { songTimer = 0; songIdx++; }
}
