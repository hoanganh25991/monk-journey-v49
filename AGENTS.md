# Monk Journey - Agent Instructions

## Cursor Cloud specific instructions

### Project overview

Monk Journey is a browser-based 3D action RPG built with vanilla JavaScript (ES6 modules) and Three.js. It has **zero npm dependencies** — no `package.json`, no `node_modules`, no build step. All external libraries (Three.js, PeerJS, MessagePack) are loaded from CDNs via import maps in `index.html`.

### Running the dev server

```bash
node server.js
```

This starts a static HTTP server on **port 8080**. Open `http://localhost:8080` in Chrome.

### Important caveats

- There is no linting, no test framework, and no build system configured. The project is pure vanilla JS served as-is.
- The `scripts/` directory (map generation, version updates) is git-ignored and not present in the repo.
- Multiplayer requires internet access (PeerJS cloud signaling server). Google Drive cloud save requires a valid OAuth Client ID. Both are optional for local development.
- The game loads 3D models (GLB) and audio (MP3) from `assets/`. Initial load shows a progress bar while preloading skill effects and models.
- Game controls: WASD to move, keys 1-7 to use skills. Click "Play Game" on the main menu to enter the game world.
