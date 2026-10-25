# Sector 07 — Extraction Protocol

A dependency-free WebGL extraction shooter in an industrial reactor facility. Explore a 29×27-tile sector, recover three reactor cores, fight autonomous security and reach extraction alive. Defaults to first-person on every new run; press V for the optional over-the-shoulder third-person view.

## Run
Requires Node.js 18+ and a browser with WebGL enabled.
From the repository root (or `neon-escape/` in the lab workspace):
```sh
npm start
# Open http://localhost:3000
npm test
```
No installation or downloads needed. `PORT` overrides 3000.

## Controls
- WASD: move. Mouse: look after clicking Deploy / Resume.
- Shift: sprint; stamina recharges when not sprinting.
- Left mouse / F: fire; right mouse / Q: hold aim.
- R: reload a 12-round magazine from reserve ammunition.
- E: use a nearby health station, ammo cache or security terminal.
- V: toggle third-person / first-person camera.
- N: restart. Escape / Pause: pause.
- Arrow Up/Down: move; Left/Right: turn without pointer lock.
- Touch: on-screen movement, turning, sprint, fire, aim, reload, interact and view controls.

Collect every core before reaching extraction. Drones patrol, pursue visible players and damage on close contact; steel walls block sight and gunfire. Destroy drones with three hits. Supply stations are single-use; health stations wait until you need healing. Security terminals temporarily disable drone attacks. Watch ammunition, integrity and stamina; the minimap shows objectives, stations, live security and extraction. Pause freezes the simulation.

## Architecture
- `game.mjs`: lifecycle and animation orchestration.
- `simulation.mjs`: movement, stamina, perception/pursuit and session updates.
- `world.mjs`: expanded map, collision, stations and extraction mechanics.
- `combat.mjs`: camera-aligned hitscan, reload and station interactions.
- `camera.mjs`: shared collision-aware shoulder / eye camera used for rendering and shooting.
- `renderer.mjs`: native WebGL batches, procedural industrial facility, operative with rifle, drones, station lights and muzzle/tracer effects.
- `input.mjs`: keyboard, pointer-lock fallback and touch controls with held-state cleanup.
- `hud.mjs`: ammunition, kills, station hints and scale-to-fit minimap.
- `style.css` / `index.html`: responsive interface and accessible buttons.

## Verification
`npm test` runs node:test checks for combat in both camera modes, cooldown/reload, station use, camera collision, renderer batching/lifecycle, reachable objectives, movement, drones, win/loss/reset and timestep bounds. Independent QA scratch scripts are separate from production modules. `qa-browser.py` is an optional dependency-free macOS Firefox Marionette smoke test (hard-coded Firefox application path and isolated profile); it checks WebGL, deploy, rendered frames and pause and writes screenshots.

## Scope and limitations
A single-player vertical slice, not a full commercial game or photorealistic production. Procedural geometry/materials use no external assets or engine. No saves, audio, multiplayer or backend. Combat is hitscan rather than simulated projectiles. Drones use patrol and direct line-of-sight pursuit, not navigation-mesh pathfinding. The shoulder camera shortens near walls. Pointer lock depends on browser policy; keyboard fallback is available. Mobile controls have not been validated on physical devices. Browser/GPU performance varies. WebGL failure disables deployment with an explanation. Static files can be hosted with an ordinary HTTP server. The supplied server binds to 0.0.0.0 for local preview and is not hardened for production.

## Social sharing
`og-image.png` is the 1200×630 social card. Open Graph and Twitter large-image metadata are in `index.html`. The image uses the public raw GitHub URL so it is absolute without assuming a game deployment domain. After hosting, point both image URLs to your hosted `/og-image.png` and add `og:url` with the canonical game URL. Sharing the GitHub repository itself uses GitHub's own metadata; optionally upload this PNG in repository Settings → Social preview. Social platforms may cache cards or restrict remote image hosts.

The PNG is prebuilt: no build is needed to play or deploy. Its optional artwork generator is `og-image.swift` (macOS AppKit): run `swift og-image.swift` from this directory to regenerate it. Serve/deploy `og-image.png` alongside the game files.
