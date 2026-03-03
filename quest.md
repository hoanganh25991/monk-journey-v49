# MONK JOURNEY - COMPLETE GAME DESIGN DOCUMENT

**Navigation:** This root document summarizes the full design. For deeper detail, follow the links below.

---

## DOCUMENT MAP — LINKS TO DETAIL

| Section | Summary (this file) | Detail document |
|--------|----------------------|------------------|
| **Story chapters** | [§6 below](#6-story-arc-5-chapters) | [Chapters index](design/README.md#chapters) |
| **Chapter 1** | The Restless Village (Anger) | [Chapter 1 — The Restless Village](design/chapters/chapter-1-restless-village.md) |
| **Chapter 2** | Forest of Doubt (Fear) | [Chapter 2 — Forest of Doubt](design/chapters/chapter-2-forest-of-doubt.md) |
| **Chapter 3** | Mountain of Desire (Greed) | [Chapter 3 — Mountain of Desire](design/chapters/chapter-3-mountain-of-desire.md) |
| **Chapter 4** | Desert of Loneliness (Isolation) | [Chapter 4 — Desert of Loneliness](design/chapters/chapter-4-desert-of-loneliness.md) |
| **Chapter 5** | Inner Temple (Self) | [Chapter 5 — Inner Temple](design/chapters/chapter-5-inner-temple.md) |
| **Progression** | XP, attributes, level-up | [Progression system](design/systems/progression.md) |
| **Skill tree** | Body / Mind / Harmony paths | [Skill tree system](design/systems/skill-tree.md) |
| **Quests** | Quest object, objectives | [Quest system](design/systems/quest-system.md) |
| **Items** | Slots, rarity, legendary | [Item system](design/systems/items.md) |
| **Music** | Offline-first, layers | [Music system](design/systems/music.md) |
| **Combat & tech** | Responsive combat, performance | [Combat & performance](design/systems/combat-and-performance.md) |
| **Reflection & end game** | Post-boss, Path of Mastery | [Reflection & end game](design/systems/reflection-and-endgame.md) |

Full design index: [design/README.md](design/README.md)

---

## 1. CORE PHILOSOPHY

A peaceful monk travels across a fragmented world restoring harmony.
Combat represents inner struggles such as anger, fear, greed, and doubt.

Emotional Goals:
- Calm
- Growth
- Reflection
- Meaningful Progression
- Relaxation

Target Audience:
- Kids
- Teenagers
- Players seeking peaceful but meaningful gameplay

---

# 2. CORE GAME LOOP

Explore Area
→ Accept Quest
→ Learn Story Context
→ Complete Objective
→ Boss Encounter
→ Reflection Screen
→ Gain XP + Skill Point
→ Unlock New Area

Every quest MUST include:
1. Narrative intro
2. Emotional theme
3. Gameplay objective
4. Boss fight (if main quest)
5. Reflection message
6. Life lesson quote
7. Rewards

---

# 3. PLAYER PROGRESSION SYSTEM

*Full detail: [Progression system](design/systems/progression.md)*

## XP Formula

xpRequired(level) = 100 * level^1.5

XP Sources:
- Small enemy: 10–25 XP
- Elite enemy: 50 XP
- Boss: 150 XP
- Quest completion: 100–300 XP

---

## Attribute Points

Each Level Up:
+3 Attribute Points
+1 Skill Point

Attributes:

Strength:
+5 HP per point

Intelligence:
+5 Mana per point

Agility:
+2% Attack Speed per point

Vitality:
+1 HP Regen/sec per point

Wisdom:
+2% Cooldown Reduction per point

Stats must recalculate in real-time after allocation.

---

# 4. SKILL TREE SYSTEM

*Full detail: [Skill tree system](design/systems/skill-tree.md)*

Skill Tree is a graph structure (not a list).

Each Skill Node:

{
  id: string,
  name: string,
  description: string,
  icon: string,
  maxLevel: number,
  currentLevel: number,
  costPerLevel: number,
  requiredNodes: string[],
  variants?: string[]
}

---

## Skill Categories

### Body Path
- Quick Strike
- Flowing Combo
- Wind Dash
- Palm Burst
- Ground Stomp

Variants:
- Increased damage
- Increased speed
- Stun chance
- Life steal

### Mind Path
- Inner Focus
- Energy Wave
- Meditation Field
- Spirit Shield
- Calm Pulse

Variants:
- Reduce cooldown
- Bigger radius
- Heal allies
- Increase duration

### Harmony Path
- Balance Aura
- Reflect Harm
- Slow Time
- Serenity Field
- Enlightenment Mode

Variants:
- Increase aura size
- Extend duration
- Add healing
- Add slow effect

---

## Skill Tree UI Requirements

- Zoomable canvas
- Draggable camera
- Circular nodes
- Connected by lines
- Locked nodes greyed out
- Unlockable nodes glow
- Tooltip shows:
  - Description
  - Current level
  - Next level bonus
  - Requirements
  - Cost

---

# 5. QUEST SYSTEM STRUCTURE

*Full detail: [Quest system](design/systems/quest-system.md)*

Quest Object:

{
  id: string,
  title: string,
  description: string,
  lesson: string,
  area: string,
  objectives: Objective[],
  boss?: BossConfig,
  rewards: {
    xp: number,
    skillPoints?: number,
    item?: string
  }
}

Objective Types:
- Kill X enemies
- Defeat boss
- Meditate at location
- Protect NPC
- Survive waves
- Collect fragments

---

# 6. STORY ARC (5 CHAPTERS)

| Chapter | Theme | Boss | Lesson | Detail |
|---------|--------|------|--------|--------|
| **1** | Anger | Rage Beast | "Anger burns the one who carries it." | [→ Chapter 1 detail](design/chapters/chapter-1-restless-village.md) |
| **2** | Fear | Doubt Serpent | "Fear grows in silence." | [→ Chapter 2 detail](design/chapters/chapter-2-forest-of-doubt.md) |
| **3** | Greed | Golden Titan | "Gratitude ends endless hunger." | [→ Chapter 3 detail](design/chapters/chapter-3-mountain-of-desire.md) |
| **4** | Isolation | Echo Phantom | "You are never truly alone." | [→ Chapter 4 detail](design/chapters/chapter-4-desert-of-loneliness.md) |
| **5** | Self | Shadow Self (mirrors player build) | "Your greatest opponent is your untrained self." | [→ Chapter 5 detail](design/chapters/chapter-5-inner-temple.md) |

**Unlock after Chapter 5:** Final skill — [Enlightenment Mode](design/chapters/chapter-5-inner-temple.md#enlightenment-mode)

---

# 7. ITEM SYSTEM

*Full detail: [Item system](design/systems/items.md)*

Item Types:
- Weapon (Staff)
- Robe
- Prayer Beads
- Talisman
- Relic

Item Structure:

{
  hpBonus?: number,
  manaBonus?: number,
  attackSpeedBonus?: number,
  cooldownReduction?: number,
  skillBoost?: {
    skillId: string,
    bonusPercent: number
  }
}

Rarity:
- Common
- Uncommon
- Rare
- Epic
- Legendary

Legendary must modify skill behavior.

Example:
Beads of Still Water:
Meditation Field heals 5% HP/sec.

---

# 8. MUSIC SYSTEM (OFFLINE FIRST)

*Full detail: [Music system](design/systems/music.md)*

Requirements:
- Instrumental only
- Loop-safe
- Preloaded before start
- Fallback system

Loading Logic:
Try load track_A.mp3
If fail → load default_track.mp3
If fail → disable music gracefully

Music Layers:
- Exploration ambient
- Combat subtle drums
- Boss intensity layer

Crossfade: 1.5 seconds

---

# 9. PERFORMANCE REQUIREMENTS

*Full detail: [Combat & performance](design/systems/combat-and-performance.md)*

- 60 FPS target
- Async loading
- Fallback textures/models/audio
- Lazy-load bosses
- Never block main thread
- Offline-first
- No waiting for network

---

# 10. FAST RESPONSIVE COMBAT

*Full detail: [Combat & performance](design/systems/combat-and-performance.md)*

- Skill cast time <150ms
- Animation cancel at 60%
- Input buffer: 100ms
- Immediate hit detection
- No artificial delay

---

# 11. REFLECTION SYSTEM

*Full detail: [Reflection & end game](design/systems/reflection-and-endgame.md)*

After each boss:
- Screen fade
- Show life lesson quote
- Soft ambient sound
- Player clicks "Continue Journey"

Creates emotional pacing.

---

# 12. END GAME

*Full detail: [Reflection & end game](design/systems/reflection-and-endgame.md)*

Unlock Path of Mastery:
- Harder bosses
- New variants
- Cosmetic rewards
- Mastery progression