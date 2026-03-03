# Music system (offline first)

**Root GDD:** [quest.md](../../quest.md#8-music-system-offline-first)

---

## Requirements

- **Instrumental only** (no lyrics).
- **Loop-safe** (seamless or short crossfade at loop point).
- **Preloaded** before gameplay starts (no mid-game load stalls).
- **Fallback** so missing or failed tracks don’t break the game.

---

## Loading logic

1. Try load **track_A.mp3** (e.g. area or mood track).
2. If fail → load **default_track.mp3**.
3. If fail → **disable music gracefully** (no error spam, option to retry in settings).

All loading should be **async** and non-blocking ([Performance](combat-and-performance.md)).

---

## Music layers

| Layer | Use case |
|-------|----------|
| **Exploration ambient** | Default overworld / village / forest |
| **Combat subtle drums** | Combat active, low intensity |
| **Boss intensity** | Boss fight active |

Layers can crossfade or stack (e.g. ambient + combat layer) depending on implementation.

---

## Crossfade

- **Duration:** 1.5 seconds when switching tracks or layers.
- Prevents hard cuts; keeps mood consistent with [Reflection](reflection-and-endgame.md) and calm pacing.

---

## Offline

- No network required; all tracks bundled or cached (e.g. PWA cache).
- Aligns with root GDD: “Offline-first,” “No waiting for network.”

---

## Links

- [Combat & performance](combat-and-performance.md) — async loading, no main-thread block
- [Reflection & end game](reflection-and-endgame.md) — soft ambient during reflection
