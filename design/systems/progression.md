# Progression system

**Root GDD:** [quest.md](../../quest.md#3-player-progression-system)

---

## XP formula

```
xpRequired(level) = 100 * level^1.5
```

Example: Level 1→2 = 100; Level 2→3 ≈ 283; Level 5→6 ≈ 1118.

---

## XP sources

| Source | XP range |
|--------|----------|
| Small enemy | 10–25 XP |
| Elite enemy | 50 XP |
| Boss | 150 XP |
| Quest completion | 100–300 XP |

---

## Level up

Each level up grants:

- **+3 Attribute points** (free to allocate)
- **+1 Skill point** (for [Skill tree](skill-tree.md))

Stats must **recalculate in real time** after allocation (no “confirm” lag).

---

## Attributes

| Attribute | Effect per point |
|-----------|-------------------|
| **Strength** | +5 HP |
| **Intelligence** | +5 Mana |
| **Agility** | +2% Attack speed |
| **Vitality** | +1 HP Regen/sec |
| **Wisdom** | +2% Cooldown reduction |

---

## Implementation notes

- Persist: level, current XP, attribute allocation, skill point count.
- UI: level bar, “+3 points” indicator on level up, attribute panel with +/- or drag.
- Link to [Quest system](quest-system.md) for quest XP and [Items](items.md) for gear bonuses that stack with base stats.

---

## Links

- [Skill tree](skill-tree.md) — skill points
- [Quest system](quest-system.md) — quest XP and rewards
- [Items](items.md) — stat bonuses from equipment
