# Monk Journey — Deep Step-by-Step Implementation Plan

This document maps **quest.md** (Complete Game Design Document) to the codebase and breaks implementation into ordered, actionable steps. Use it to complete the game design systematically.

---

## Next up (recommended order)

1. **Phase 7 — Polish & enhancements** (see below): 7.1 done (camera sensitivity), 7.3 done (skills-by-level + level/points messaging). Next: native monk model (7.2), item system (7.4), relaxation music (7.5), quest/story tone (7.6), performance (7.7), skill tree UX (7.8).
2. **Phase 6 done.** Shadow Self has Mirror Strike ability and dark visual; Path of Mastery uses flag + path_of_mastery zone, mastery completions in save, first PoM boss clear unlocks Master's Robe cosmetic.
3. **Phase 5 done.** Core combat feel and PoM unlock/entry point are in place.

---

## Gap summary (design vs. current code)

| Area | GDD (quest.md) | Current state | Priority |
|------|----------------|---------------|----------|
| **Story quests** | 5 chapters (Restless Village → Inner Temple), each with narrative, lesson, boss | Generic main quests (skeleton, zombie, demon); no chapter/area/lesson | P0 |
| **Reflection** | After each boss: screen fade, life lesson quote, "Continue Journey" | No reflection screen | P0 |
| **Progression** | `xpRequired(level) = 100 * level^1.5`; +3 attr +1 skill per level | Multiplier-based XP; no attribute/skill point allocation | P0 |
| **Attributes** | Strength, Intelligence, Agility, Vitality, Wisdom (specific effects) | Strength, Dexterity, Intelligence (different effects) | P0 |
| **Skill tree** | Graph, Body/Mind/Harmony paths, nodes like Quick Strike, Enlightenment Mode | Variant/buff per skill; different structure | P1 |
| **Quest object** | id, title, description, lesson, area, objectives[], boss?, rewards{xp, skillPoints?, item?} | name, objective (single), reward{experience, gold, items} | P0 |
| **Bosses** | Rage Beast, Doubt Serpent, Golden Titan, Echo Phantom, Shadow Self | skeleton_king, demon_lord, etc. | P1 |
| **Music** | Exploration / combat / boss layers; 1.5s crossfade; offline-first | AudioManager exists; no layered music | P1 |
| **Items** | Slots: Weapon, Robe, Prayer Beads, Talisman, Relic; legendary = skill behavior | Many slots; legendary exists but different slots | P2 |
| **End game** | Path of Mastery after Ch5 (harder bosses, cosmetics, mastery) | Done (Phase 5.2 + 6.2) | — |

---

## Phase 1 — Core loop & story (do first)

### Step 1.1 — Chapter quest data (GDD-aligned)
- [x] Add `js/config/chapter-quests.js` with 5 chapter quests.
- Each quest: `id`, `title`, `description`, `lesson`, `area`, `objectives[]`, `boss`, `rewards{xp, skillPoints}`.
- Map boss IDs: `rage_beast`, `doubt_serpent`, `golden_titan`, `echo_phantom`, `shadow_self` (for later enemy integration).

### Step 1.2 — Reflection system
- [x] Add **ReflectionUI**: fullscreen overlay, life lesson quote, "Continue Journey" button.
- [x] Add `showReflectionScreen(lesson, onContinue)` to HUDManager.
- [x] In **QuestManager**: when completing a chapter quest, show reflection first; on "Continue Journey", award rewards and offer next chapter.

### Step 1.3 — Integrate chapter quests into QuestManager
- [x] Load chapter quests from config; offer first/next chapter via `getAvailableChapterQuests()`; story drives main flow.
- [x] Support objectives array: `kill`, `defeat_boss` (target = enemy.type). Ch1/Ch2 use `skeleton_king` / `demon_lord` for testing.
- [x] **Optional — Persist chapter quest state:** In `QuestSerializer`: serialize `completedChapterQuestIds` and active quests with `objectives[]` progress; deserialize restores `completedChapterQuestIds` (Set) and active chapter quests via `getChapterQuestById()` when not in `questManager.quests`. Save payload already includes these keys.

### Step 1.4 — Boss types and spawns
- [x] **Enemy types:** In `js/config/enemy.js`, added `GOLDEN_TITAN`, `ECHO_PHANTOM`, `SHADOW_SELF` to `ENEMY_TYPES`, `ENEMY_MODEL_MAPPINGS`, `ENEMY_CATEGORIES.BOSSES`, and `ENEMY_DIFFICULTY_TIERS.BOSS`. Ch1/Ch2 use `skeleton_king` (Rage Beast) and `demon_lord` (Doubt Serpent).
- [x] **Config & models:** In `game-balance.js`, added `BOSS_TYPES` entries and health-regen for `golden_titan`, `echo_phantom`, `shadow_self`. In `EnemyModelRegistry.js`, registered: `golden_titan` → FrostTitanModel, `echo_phantom` → VoidWraithModel, `shadow_self` → SimpleEnemyModel (placeholder).
- [x] **Shadow Self:** Treat as special case: mirrors player build. See **Phase 6.1** for implementation steps.
- [x] **Spawn wiring:** `QuestManager.getActiveChapterQuest()` returns the active story quest. In `InteractionResultHandler.handleBossSpawnInteraction()`, when `result.bossType === 'chapter_boss'`, use `activeChapter.boss.enemyType` so chapter lairs spawn the correct boss. Level data can use `bossType: 'chapter_boss'` for chapter lairs.

---

## Phase 2 — Progression (GDD formula & attributes)

### Step 2.1 — XP formula
- [x] In `js/config/game-balance.js`: add or replace experience config with GDD formula, e.g. `xpRequired(level) = Math.floor(100 * Math.pow(level, 1.5))`. Expose a small helper or constant so one place defines it.
- [x] In `js/player/PlayerStats.js`: in `addExperience()` and `levelUp()`, use the GDD formula for `experienceToNextLevel` instead of the current multiplier-based logic (see `EXPERIENCE_SCALING` / `LEVEL_UP_EXPERIENCE_MULTIPLIER`). Ensure `level`, `experience` (currentXp), and `experienceToNextLevel` are the single source of truth and are persisted in save data.

### Step 2.2 — Level-up rewards
- [x] Each level up: **+3 attribute points** (unallocated), **+1 skill point** (for skill tree). In `PlayerStats.levelUp()`, add `this.unspentAttributePoints += 3` and `this.skillPoints += 1` (add these fields if missing).
- [x] In `SaveManager` / player serialization: persist `unspentAttributePoints` and `skillPoints`; restore on load so progress is kept.

### Step 2.3 — GDD attributes
- [x] **Schema:** Use five attributes: **Strength** (+5 HP), **Intelligence** (+5 Mana), **Agility** (+2% attack speed), **Vitality** (+1 HP regen/s), **Wisdom** (+2% cooldown reduction). In `PlayerStats` and `game-balance.js`, replace or map existing strength/dexterity/intelligence to these (e.g. drop dexterity, add agility/vitality/wisdom; map old int → new Intelligence).
- [x] **Derived stats:** Recompute `maxHealth`, `maxMana`, attack speed, HP regen, cooldown reduction from base + allocated attributes whenever points are spent; no "confirm" step—update immediately.

### Step 2.4 — Attribute allocation UI
- [x] In the level-up or stats panel (HUD/settings): show unspent attribute points and skill points; provide +/- or drag to allocate to Strength, Intelligence, Agility, Vitality, Wisdom. On change, call PlayerStats to apply allocation so stats recalc in real time.

---

## Phase 3 — Skill tree (graph & paths)

### Step 3.1 — Skill tree data model
- [x] Add `js/config/skill-tree-graph.js`: skill nodes as graph with `id`, `name`, `description`, `icon`, `maxLevel`, `costPerLevel`, `requiredNodes[]`, `path`, `requireChapter5?`. Expose `SKILL_TREE_GRAPH_NODES`, `SKILL_TREE_PATH_ORDER`, `isSkillTreeNodeUnlocked()`, `canLevelSkillTreeNode()`. Node levels in `PlayerStats.skillTreeNodeLevels`; persisted in save.
- [x] **Body path:** Quick Strike, Flowing Combo, Wind Dash, Palm Burst, Ground Stomp.
- [x] **Mind path:** Inner Focus, Energy Wave, Meditation Field, Spirit Shield, Calm Pulse.
- [x] **Harmony path:** Balance Aura, Reflect Harm, Slow Time, Serenity Field, **Enlightenment Mode** (unlock after Ch5). Link Enlightenment Mode’s `requiredNodes` to Serenity Field and gate availability by `completedChapterQuestIds` including chapter 5.

### Step 3.2 — Skill tree UI
- [x] Build or refactor skill tree UI: zoomable, draggable canvas (e.g. canvas or SVG); circular nodes connected by lines; locked (greyed), unlockable (glow); tooltip showing description, current level, next bonus, requirements, cost (skill points). Consume skill points from `PlayerStats.skillPoints` when spending on a node; persist node levels in save data.

### Step 3.3 — Enlightenment Mode
- [x] Unlock after Chapter 5 (defeat Shadow Self): capstone in Harmony path; implement skill effect (e.g. short buff, synergy with other skills) and hook into combat/skills system. Activation via **R** key or HUD button; applies temporary attack power and movement speed boosts; skill damage and cooldown recovery get synergy while active. State and cooldown persisted in save.

---

## Phase 4 — Music & items (GDD alignment)

### Step 4.1 — Music layers
- [x] In `js/AudioManager.js`: support layered tracks—exploration ambient, combat (subtle drums), boss (intensity). Crossfade ~1.5s when switching via `setMusicContext('exploration'|'combat'|'boss')`. Preload with fallback; on load failure try fallbackFile then disable layer gracefully. EnemyManager and game start use `setMusicContext`.

### Step 4.2 — Item slots (GDD)
- [x] **Slots:** Weapon (Staff), Robe, Prayer Beads, Talisman, Relic. In equipment/inventory code, map or migrate existing slots to these five; ensure UI and save format use the same names.
- [x] **Legendary:** Pipeline: `getLegendarySkillBehavior(skillId)`; **Beads of Still Water** (Meditation Field heals 5% max HP/s) implemented. Legendary items must modify skill **behavior** (not just stats). Document one example (e.g. Beads of Still Water: “Meditation Field heals 5% max HP/s”); implement that (or one other) so the pipeline for “item → skill behavior override” exists.

---

## Phase 5 — Combat feel & end game

### Step 5.1 — Responsive combat (design targets)
- [x] Per design/combat doc: skill cast &lt; 150 ms; animation cancel at 60%; input buffer 100 ms; immediate hit detection; no artificial delay. **Done:** input buffer in InputHandler; cancel-at-60% in PlayerState/PlayerSkills; non-blocking createEffect + preloadEffectHandlers for &lt; 150 ms first cast.

### Step 5.2 — Path of Mastery
- [x] **Done:** QuestManager.isPathOfMasteryUnlocked(); Ch5 reflection shows "Enter Path of Mastery" button; Game.enterPathOfMastery() sets PoM flag; Phase 6.2 adds area/zone, harder bosses, mastery progression, cosmetics. Design doc: [Reflection & end game](design/systems/reflection-and-endgame.md).

---

## Phase 6 — Shadow Self & Path of Mastery (optional follow-ups)

### Step 6.1 — Shadow Self (mirror player build)
- [x] **Snapshot player build:** Add a helper (e.g. in Game or PlayerStats) that returns a serializable snapshot of the current build: level, attributes (strength, intelligence, agility, vitality, wisdom), `skillTreeNodeLevels`, and optionally equipment-derived stats (attack power, max health/mana from gear). Use this only when spawning `shadow_self`. Implemented: `Game.getPlayerBuildSnapshot()`.
- [x] **Boss config override for shadow_self:** When `spawnBoss('shadow_self', position)` is called, have EnemyManager (or a small ShadowSelfBuilder) build boss stats from the player snapshot instead of from BOSS_TYPES: e.g. mirror maxHealth/maxMana/damage/speed from player’s derived stats; scale or cap so the fight is fair (e.g. 90–100% of player values, or fixed scaling by level). Implemented: 95% scale in EnemyManager.spawnBoss; spawnEnemy accepts optional configOverride and skips difficulty scaling when used.
- [x] **Skills/behavior:** If enemies can use skill-like abilities, mirror the player’s unlocked skills (from skill tree levels) for Shadow Self—e.g. same cooldowns and effects, possibly with a short delay or telegraphed cast so the player can react. If the current enemy system does not support custom skills, document the gap and implement a minimal “Shadow Self uses same attack pattern as player” (e.g. same base attack + one or two mirrored skills). *Current: Shadow Self uses default boss melee behavior with mirrored stats; skill mirroring is a future enhancement.*
- [x] **Visual (optional):** Use a dark/mirror version of the player model or keep SimpleEnemyModel with a distinct dark tint; see design: [Chapter 5 — Inner Temple](design/chapters/chapter-5-inner-temple.md). *Current: SimpleEnemyModel with color 0x333366 (dark).*

### Step 6.2 — Path of Mastery content
- [x] **PoM area or mode:** Implement a Path of Mastery “area” or mode: either a new scene/level load when the player clicks “Enter Path of Mastery”, or a dedicated world zone/flag (e.g. `isInPathOfMastery`) that changes spawns and objectives. Wire `Game.enterPathOfMastery()` to transition into this area (load scene, set flag, or open a PoM menu that then loads).
- [x] **Harder bosses:** In PoM, use harder boss variants (e.g. same bosses with higher health/damage or new “mastery” variants in BOSS_TYPES) or replay chapter bosses with a difficulty multiplier. Ensure spawn logic and quest/objective hooks support “PoM boss” vs “chapter boss” if needed.
- [x] **Mastery progression:** Add simple mastery progression: e.g. track completions per boss or per chapter in PoM (stored in save); optional difficulty tiers (normal / hard / mastery) that unlock after first clear. Expose completion counts or tiers in UI (e.g. Reflection or a PoM panel).
- [x] **Cosmetics:** Define and implement at least one cosmetic reward (e.g. robe skin or staff skin) unlockable via PoM (e.g. after first PoM boss clear or after N completions). Hook into existing equipment/visuals so the player can equip or select the cosmetic.

---

## Phase 7 — Polish & enhancements (from todo.md)

Post–core-implementation improvements. Order is flexible; pick by priority.

### Step 7.1 — Camera controls
- [x] **Drag sensitivity:** In camera rotate (drag): increase sensitivity so the same drag rotates further (e.g. ~3× current). Touch/pointer drag should allow more rotation per gesture. File: `js/hud-manager/CameraControlUI.js` (or wherever drag-to-rotate is handled). Implemented: `DRAG_SENSITIVITY_MULTIPLIER = 3` (tunable).

### Step 7.2 — Native monk model (Three.js)
- [ ] **Custom monk model:** Replace or complement current player representation with a native Three.js monk model (similar to enemy model approach). Design: young monk, shaolin-style yellow cloth; parts: head, hands, body, legs, long staff.
- [ ] **Attachment points:** Model definition should expose positions/slots for equipment (helmet, shoulder, armor, etc.) so items can be attached and swapped easily; keep native model’s unique style, use opacity/layering for gear on top.
- [ ] **Equipment visuals:** Align with `PlayerEquipmentVisuals.js` (e.g. ~96–130): support adding/swapping items on the native model while preserving the monk’s base look.

### Step 7.3 — Skills & progression clarity
- [x] **Skills by level:** Optional “skills learned = unlock at particular level” so some skills unlock over time by level in addition to (or alongside) skill tree. Implemented: requiredLevel on each node (1–5 by path); unlock checks use playerLevel; UI shows "Requires level X".
- [x] **Level/points messaging:** Ensure UI clearly communicates: level = points for attributes (health, mana, attack speed, etc.); skill points = learn/upgrade skills in tree. Implemented: stats overlay hint; level-up popup shows "+3 attribute points, +1 skill point".

### Step 7.4 — Items & content
- [ ] **Items system:** Further improvements to item system (beyond GDD slots and legendary pipeline already in place)—e.g. balance, variety, tooltips, or UX from todo.md.

### Step 7.5 — Music & atmosphere
- [ ] **Relaxation music:** Use “nhạc không lời, nhẹ nhàng thư giãn” (instrumental, gentle, relaxing) where applicable; ensure layered music (Phase 4.1) uses calm exploration/combat/boss tracks that match the intended mood.

### Step 7.6 — Quest & story tone
- [ ] **Quest as one-time help:** Reinforce that quests are single-serving “help once” experiences with clear story and lesson.
- [ ] **Kid/teen-friendly lessons:** Ensure quest text and reflection lessons align with teaching life lessons and growth (monk journey, harmony, being better/happier) for younger audiences.

### Step 7.7 — Performance & offline-first
- [ ] **Responsiveness:** Keep game fast and responsive (cast fast, no unnecessary waits); maintain fallbacks (e.g. if track X fails, load default) so nothing hangs on network; remain offline-first.

### Step 7.8 — Skill tree UX (optional)
- [ ] **Skill tree UI polish:** Further improve graph UI (circle network, main → variant visualization, clear description of what each node gives); ensure “what you can have on each” is clear to the player.

---

## File checklist (quick reference)

| Action | File(s) |
|--------|--------|
| Chapter quest definitions | `js/config/chapter-quests.js` |
| Reflection UI | `js/hud-manager/ReflectionUI.js`, `css/reflection-screen.css`, `index.html` |
| Quest flow (reflection + chapter) | `js/QuestManager.js` |
| HUD reflection API | `js/hud-manager/HUDManager.js` |
| Chapter quest save/load | `js/save-manager/serializers/QuestSerializer.js`, `js/save-manager/SaveManager.js` |
| XP formula & level-up | `js/config/game-balance.js`, `js/player/PlayerStats.js` |
| Attributes & allocation | `js/player/PlayerStats.js`, stats UI, save payload |
| Skill tree graph & UI | `js/config/skill-tree-graph.js`, `js/hud-manager/SkillTreeGraphView.js`, `js/hud-manager/SkillTreeUI.js`, `js/config/skill-tree.js` (variants/buffs), `PlayerStats.skillTreeNodeLevels` + save |
| Boss types & spawns | `js/config/enemy.js`, `js/config/game-balance.js`, `js/enemies/models/EnemyModelRegistry.js`, `js/enemies/EnemyManager.js` |
| Music layers | `js/AudioManager.js`, `js/config/sounds.js` (MUSIC_LAYERS, crossfade), `js/enemies/EnemyManager.js`, assets |
| Item slots (GDD) | `js/player/PlayerInventory.js` (GDD_EQUIPMENT_SLOTS), `js/save-manager/serializers/InventorySerializer.js`, `js/hud-manager/InventoryUI.js`, `index.html`, `js/config/items.js` (prayer beads, relic, legendary) |
| Legendary skill behavior | `js/player/PlayerInventory.js` (getLegendarySkillBehavior), `js/skills/InnerSanctuaryEffect.js` (Beads of Still Water heal) |
| Combat feel (input buffer, cancel, preload) | `js/config/input.js`, `js/InputHandler.js`, `js/player/PlayerState.js`, `js/player/PlayerSkills.js`, `js/player/Player.js` |
| Path of Mastery (Ch5 unlock, entry point) | `js/QuestManager.js`, `js/game/Game.js`, `js/hud-manager/ReflectionUI.js`, `js/hud-manager/HUDManager.js`, `css/reflection-screen.css` |
| Shadow Self (mirror build + Mirror Strike) | Phase 6.1: `js/player/PlayerStats.js` or Game snapshot, `js/enemies/EnemyManager.js` (spawnBoss override), `js/enemies/Enemy.js` (shadow_self + castMirrorStrike), `js/config/game-balance.js` (shadow_self) |
| Path of Mastery content (area, bosses, mastery, cosmetics) | Phase 6.2: `js/game/Game.js` (enterPathOfMastery, isInPathOfMastery, recordPathOfMasteryBossKill, getUnlockedCosmetics), `js/config/game-balance.js` (path_of_mastery zone), `js/enemies/EnemyManager.js` (PoM zone in spawns), `js/save-manager/serializers/SettingsSerializer.js` (pathOfMasteryCompletions, unlockedCosmetics), `js/QuestManager.js` (updateEnemyKill → recordPathOfMasteryBossKill) |
| Phase 7 (camera, monk model, skills-by-level, items, music, tone, UX) | `js/hud-manager/CameraControlUI.js`, player model code, `js/player/PlayerEquipmentVisuals.js`, `js/config/sounds.js`, `js/AudioManager.js`, quest/reflection copy, skill tree UI |

---

## How to use this plan

1. **Phase 1** first: get chapter quests, reflection, and quest flow working so the emotional loop (quest → boss → reflection → reward) is in place.
2. **Phase 2** next: progression and attributes so level-ups feel meaningful and match the GDD.
3. Then **Phase 3–5** in order, or in parallel if multiple people work on different phases.
4. **Phase 6** after 1–5: Shadow Self and Path of Mastery content.
5. **Phase 7** (optional): polish and enhancements from todo.md—camera, native monk model, skills-by-level, items, music, story tone, skill tree UX.

**Dependencies:** Phase 3 (skill tree) uses `skillPoints` and `completedChapterQuestIds` from Phase 2 and Phase 1. Phase 5.2 (Path of Mastery) assumes Ch5 and reflection are done. Phase 4 can be done largely in parallel with 2/3 once the core loop is stable. **Phase 6** (Shadow Self & PoM content) depends on Phase 1–5 being done; Shadow Self (6.1) can be implemented before or in parallel with PoM content (6.2). **Phase 7** has no hard dependency order; do steps in any order by priority.

Tick off steps as you complete them; update this file when you add new steps or change priorities.
