# Sound Implementation Plan

## Goals

1. **Fix missing sounds** – Ensure every `playSound(id)` call has a defined sound (e.g. `questComplete`, `lightning`, `explosion`).
2. **Real audio files** – When files exist in `assets/audio/`, use them; otherwise keep simulated fallback (offline-first).
3. **Auto-download from public sources** – Provide a script + manifest to download CC0/public/free sounds into `assets/audio/` so all skills and UI have real SFX.

## Current State

- **Config**: `js/config/sounds.js` defines all sound ids, files, volumes, and simulated fallbacks.
- **Loader**: `js/AudioManager.js` loads from `assets/audio/<file>`. If `checkAudioFilesExist()` fails (e.g. no `main_theme.mp3`), the game uses **simulated** sounds only.
- **Assets**: No `assets/audio/` folder yet; no real MP3s in repo.
- **Fixed in code**: `questComplete` added to `UI_SOUNDS`; `lightning` and `explosion` added to `SKILL_SOUNDS` (reusing `thunder_strike.mp3` and `massive_explosion.mp3`).

## Sound Inventory (Unique Files)

All filenames the game expects under `assets/audio/`:

| Category   | Files |
|-----------|--------|
| Player    | `attack.mp3`, `player_hit.mp3`, `player_death.mp3`, `level_up.mp3` |
| Skills    | `wave_strike.mp3`, `water_impact.mp3`, `water_dissipate.mp3`, `cyclone_strike.mp3`, `wind_pull.mp3`, `wind_dissipate.mp3`, `seven_sided_strike.mp3`, `rapid_strike.mp3`, `strike_complete.mp3`, `inner_sanctuary.mp3`, `barrier_form.mp3`, `barrier_dissipate.mp3`, `fist_of_thunder.mp3`, `thunder_strike.mp3`, `thunder_echo.mp3`, `mystic_ally.mp3`, `ally_summon.mp3`, `ally_dismiss.mp3`, `wave_of_light.mp3`, `bell_ring.mp3`, `bell_fade.mp3`, `exploding_palm.mp3`, `mark_applied.mp3`, `massive_explosion.mp3`, `breath_of_heaven.mp3`, `healing_pulse.mp3`, `divine_echo.mp3`, `deadly_reach_cast.mp3`, `deadly_reach_impact.mp3`, `deadly_reach_end.mp3`, `flying_dragon.mp3`, `dragon_strike.mp3`, `dragon_land.mp3`, `flying_kick.mp3`, `kick_impact.mp3`, `kick_land.mp3`, `imprisoned_fists.mp3`, `chain_impact.mp3`, `chains_break.mp3` |
| Enemies   | `enemy_attack.mp3`, `enemy_hit.mp3`, `enemy_death.mp3`, `boss_death.mp3`, `boss_spawn.mp3` |
| Effects   | `effect_defense_boost.mp3`, `effect_speed_boost.mp3`, `effect_damage_boost.mp3`, `effect_regeneration.mp3`, `effect_invulnerability.mp3`, `effect_invulnerable.mp3`, `effect_slow.mp3` |
| UI        | `button_click.mp3`, `inventory_open.mp3`, `item_pickup.mp3`, `danger_warning.mp3`, `quest_complete.mp3` |
| Environment | `chest_open.mp3`, `door_open.mp3`, `teleport.mp3` |
| Music     | `main_theme.mp3`, `battle_theme.mp3`, `boss_theme.mp3` |

**Total unique files**: 62 SFX + 3 music = 65 files.

## Public / Free Sound Sources

Use only **royalty-free / CC0 / public domain** or **licensed-for-game** assets.

| Source        | Notes |
|---------------|--------|
| **Pixabay**   | [pixabay.com/sound-effects](https://pixabay.com/sound-effects/) – CC0, no API key; download manually or use direct MP3 URLs in manifest. |
| **Freesound**| [freesound.org](https://freesound.org) – Filter by “Creative Commons 0”; API key for auto-download (see script below). |
| **OpenGameArt** | [opengameart.org](https://opengameart.org) – Game-oriented; check license per asset. |
| **Mixkit**    | [mixkit.co/free-sound-effects](https://mixkit.co/free-sound-effects/) – Free for use; direct download links. |
| **ZapSplat / Sonniss** | Various free packs; respect license and attribution if required. |

## Implementation Approach

### 1. Manifest-based download (recommended)

- **Manifest file**: JSON mapping `expected_filename → download_url` (e.g. `quest_complete.mp3` → a Pixabay or self-hosted URL).
- **Script**: Node.js script that:
  - Reads the manifest.
  - Ensures `assets/audio/` exists.
  - For each entry, fetches the URL and writes to `assets/audio/<expected_filename>`.
  - Skips or overwrites per option (e.g. `--skip-existing`).

You (or a contributor) fill the manifest with direct MP3 URLs from Pixabay, Mixkit, or Freesound (download link). No API key required if using direct URLs.

### 2. Freesound API (optional, semi-auto)

- Register at [Freesound API](https://freesound.org/apiv2/apply).
- Script: for each expected filename, run a search query (e.g. `quest_complete` → search “success jingle”), filter by CC0, pick first result, download via API to `assets/audio/quest_complete.mp3`.
- Requires mapping `filename → search query` and handling rate limits/attribution.

### 3. Manual

- Create `assets/audio/` and drop in MP3s that match the filenames above. Game will use them automatically when present.

## Script: Download Sounds from Manifest

Location: `scripts/download-sounds.js` (or `tools/download-sounds.js`).

- **Input**: `scripts/sound-manifest.json` (or similar) with shape:
  ```json
  {
    "quest_complete.mp3": "https://example.com/path/to/quest_complete.mp3",
    "attack.mp3": "https://..."
  }
  ```
- **Behavior**:
  - `mkdir -p assets/audio`
  - For each key in manifest, `fetch(url)` and write to `assets/audio/<key>`.
  - Optional: `--skip-existing` to not overwrite, `--list` to print missing files.
- **Run**: `node scripts/download-sounds.js` (or `npm run download-sounds` if wired in package.json).

## Implementation Steps (Checklist)

- [x] Add missing sound ids: `questComplete`, `lightning`, `explosion` in `js/config/sounds.js`.
- [x] Add `scripts/sound-manifest.json` (template with all filenames; fill in URLs from Pixabay/Freesound/Mixkit).
- [x] Add `scripts/download-sounds.js` (Node) to fetch from manifest and save into `assets/audio/`.
- [x] Add `npm run download-sounds` in `package.json`.
- [ ] Create `assets/audio/` (script creates it on first run).
- [ ] Fill `scripts/sound-manifest.json` with direct MP3 URLs; run `npm run download-sounds` to populate `assets/audio/`.
- [ ] Verify in game: no “Sound not found”, skills/UI play real SFX when files exist.
- [ ] (Optional) Document in README: “To use real sounds, run `npm run download-sounds` after adding URLs to `scripts/sound-manifest.json`.”

## Verification

1. **No missing sound id**: Search codebase for `playSound('...')` and ensure each string exists as `id` in `ALL_SOUNDS` (or music).
2. **Files present**: After running the download script, list `assets/audio/*.mp3` and compare to the sound inventory table.
3. **In-game**: Enable audio, complete a quest (questComplete), use Wave of Light lightning/explosion variants (lightning, explosion), and trigger other skills; confirm no console “Sound not found” and that cast/impact sounds play where expected.

## Summary

- **Immediate**: `questComplete`, `lightning`, and `explosion` are now in `sounds.js`; with no files, they use simulated audio so the “Sound not found” warning goes away.
- **Full solution**: Add `assets/audio/`, a **manifest** of public MP3 URLs, and a **download script** to pull those files so all skills and UI can use real sounds while keeping the existing offline-first simulated fallback when a file is missing.
