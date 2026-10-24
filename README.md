# Sector 07 — Extraction Protocol

A dependency-free, first-person WebGL extraction game set in an abandoned industrial reactor facility. Recover three reactor cores, evade autonomous security, and reach extraction with suit integrity remaining.

## Run
Requires Node.js 18+ and a modern browser with WebGL enabled.
```sh
git clone https://github.com/Hydralerne/sector.git
cd sector
npm start
# Open http://localhost:3000
npm test
```
No installation or downloads needed. `PORT` overrides 3000.

## Controls
- WASD: move; mouse: look after clicking Deploy / Resume.
- Shift: sprint while reserve lasts; reserve recharges when not sprinting.
- Arrow Up/Down: move; Left/Right: turn without pointer lock.
- Escape or Pause: pause. R: restart.
- Touch: on-screen movement/turn controls and sprint button.

Collect every core before approaching the extraction pad. Drones patrol, investigate a visible nearby player, and lose tracking behind walls. Close contact drains integrity; walls prevent contact damage. The minimap shows the player, cores, security and exit. Pausing freezes the timer and simulation.

## Architecture
- `game.mjs`: browser lifecycle, pause/resume/restart and animation orchestration.
- `simulation.mjs`: pure, substepped movement, normalized input, stamina, drone perception/pursuit and session updates.
- `world.mjs`: map, collision, objectives and base mechanics.
- `renderer.mjs`: native WebGL geometry, procedural materials, industrial wall panels, overhead conduits/lights, fog, flashlight, cores and drones. Static facility mesh is uploaded once.
- `input.mjs`: keyboard, pointer-lock fallback and touch input, with held-state cleanup.
- `hud.mjs`: DOM presentation and minimap.
- `style.css` / `index.html`: responsive interface and accessibility labels.
- `simulation.test.mjs` / `world.test.mjs`: 13 node:test checks.

## Verification
`npm test` covers collision, reachable objectives, stamina, normalized diagonal speed, line of sight, safe drone motion, win/loss/reset, time-step bounds and state isolation. Independent QA scratch scripts are separate from the production modules. `qa-browser.py` is an optional dependency-free macOS Firefox Marionette smoke test (hard-coded Firefox application path and isolated local profile); it verifies WebGL initialization, deploy, rendered frames and pause freeze, and writes preview screenshots.

## Scope and limitations
This is a polished small vertical slice, not a full commercial game or photorealistic production. Procedural geometry/materials use no external assets or game engine. Single-player sessions are in memory: no saved progress, audio, multiplayer, combat or backend. Drones use patrol and direct line-of-sight pursuit, not full navigation-mesh pathfinding. Pointer lock depends on browser policy; arrows remain available. Mobile controls are implemented but have not been validated on physical devices. Performance depends on browser/GPU. WebGL initialization failure disables deployment with an explanation. Static files can be hosted by an ordinary HTTP server. The supplied server binds to 0.0.0.0 for local preview and is not hardened for production.
