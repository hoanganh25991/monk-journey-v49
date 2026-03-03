# Item system

**Root GDD:** [quest.md](../../quest.md#7-item-system)

---

## Item types (slots)

| Slot | Description |
|------|-------------|
| **Weapon** | Staff (primary weapon) |
| **Robe** | Body armor |
| **Prayer Beads** | Accessory |
| **Talisman** | Accessory |
| **Relic** | Special slot |

---

## Item structure (stats)

Items can provide:

```json
{
  "hpBonus": "number (optional)",
  "manaBonus": "number (optional)",
  "attackSpeedBonus": "number (optional)",
  "cooldownReduction": "number (optional)",
  "skillBoost": {
    "skillId": "string",
    "bonusPercent": "number"
  }
}
```

- **skillBoost:** Modifies a specific skill (e.g. damage, radius, duration). **Legendary** items must modify skill **behavior** (not only numbers).

---

## Rarity

- Common  
- Uncommon  
- Rare  
- Epic  
- **Legendary** — must include unique skill behavior change  

---

## Example: Legendary

**Beads of Still Water**

- Slot: Prayer Beads  
- Effect: **Meditation Field** heals 5% HP/sec (behavior change, not just +heal stat).  

---

## Design rules

- Stats from items stack with [Progression](progression.md) (base + attributes + gear).
- Legendary effects should be readable in UI (e.g. “Meditation Field now heals 5% HP/sec”).
- Balance with [Skill tree](skill-tree.md) so one legendary doesn’t trivialize a path.

---

## Links

- [Progression](progression.md) — base stats
- [Skill tree](skill-tree.md) — skill IDs for skillBoost
- [Chapter 3](../chapters/chapter-3-mountain-of-desire.md) — greed vs. gratitude and loot
