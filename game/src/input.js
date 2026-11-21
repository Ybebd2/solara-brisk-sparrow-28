// SOLARA R10 — input: keyboard + mouse-drag orbit, edge-triggered presses.
export const keys = {};
export const pressed = new Set();
export let mouseDX = 0;
export let mouseDY = 0;
export let mouseDown = false;
export let mouseClicked = false;
let lastX = 0, lastY = 0;

export function isDown(code) { return !!keys[code]; }
export function wasPressed(code) { return pressed.has(code); }

export function consumeMouse() {
  const d = { dx: mouseDX, dy: mouseDY };
  mouseDX = 0; mouseDY = 0;
  return d;
}
export function consumeClick() {
  const c = mouseClicked;
  mouseClicked = false;
  return c;
}
export function endFrame() { pressed.clear(); }

export function initInput(canvas) {
  window.addEventListener('keydown', (e) => {
    if (e.repeat) return;
    keys[e.code] = true;
    pressed.add(e.code);
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
  });
  window.addEventListener('keyup', (e) => { keys[e.code] = false; });
  window.addEventListener('blur', () => {
    for (const k of Object.keys(keys)) keys[k] = false;
    mouseDown = false;
  });
  canvas.addEventListener('mousedown', (e) => {
    mouseDown = true; lastX = e.clientX; lastY = e.clientY;
    if (e.button === 0) mouseClicked = true;
  });
  window.addEventListener('mouseup', () => { mouseDown = false; });
  window.addEventListener('mousemove', (e) => {
    if (!mouseDown) return;
    mouseDX += e.clientX - lastX;
    mouseDY += e.clientY - lastY;
    lastX = e.clientX; lastY = e.clientY;
  });
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());
}
