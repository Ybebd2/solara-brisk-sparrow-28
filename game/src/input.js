// SOLARA R10 — input.js
// Keyboard + mouse input. Tracks keys, mouse drag (orbit camera),
// mouse buttons (shoot), and one-shot key presses.
export function createInput(canvas) {
  const keys = {};
  const pressed = {};
  let mouseDown = false;
  let mouseX = 0, mouseY = 0, lastX = 0, lastY = 0;
  let dragDX = 0, dragDY = 0;
  let mouseClicked = false;
  let shootHeld = false;

  function onKeyDown(e) {
    if (e.repeat) return;
    keys[e.code] = true;
    pressed[e.code] = true;
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
  }
  function onKeyUp(e) { keys[e.code] = false; }
  function onMouseDown(e) {
    mouseDown = true; mouseClicked = true;
    lastX = e.clientX; lastY = e.clientY;
    if (e.button === 0) shootHeld = true;
  }
  function onMouseUp(e) {
    mouseDown = false;
    if (e.button === 0) shootHeld = false;
  }
  function onMouseMove(e) {
    mouseX = e.clientX; mouseY = e.clientY;
    if (mouseDown) {
      dragDX += e.clientX - lastX;
      dragDY += e.clientY - lastY;
      lastX = e.clientX; lastY = e.clientY;
    }
  }
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  canvas.addEventListener('mousedown', onMouseDown);
  window.addEventListener('mouseup', onMouseUp);
  window.addEventListener('mousemove', onMouseMove);
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());

  return {
    keys, pressed,
    isDown(code) { return !!keys[code]; },
    wasPressed(code) {
      const v = !!pressed[code];
      if (v) pressed[code] = false;
      return v;
    },
    consumeClick() {
      const v = mouseClicked;
      mouseClicked = false;
      return v;
    },
    shootHeld() { return shootHeld; },
    dragDelta() {
      const d = { x: dragDX, y: dragDY };
      dragDX = 0; dragDY = 0;
      return d;
    },
    clearPressed() { for (const k in pressed) pressed[k] = false; },
  };
}
