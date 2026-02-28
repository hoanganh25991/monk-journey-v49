/**
 * Skill tree configuration - FOLLOWS skills.js (source of truth).
 * Defines variants and buffs per skill. baseDescription comes from skills.js.
 */
import { NORMAL_SKILLS } from './skills.js';
import { applyBuffsToVariants } from '../utils/SkillTreeUtils.js';

const BUFF = (desc, effects, opts = {}) => ({
    description: desc,
    effects,
    cost: 5,
    maxLevel: 3,
    levelBonuses: opts.levelBonuses || [desc, desc, desc],
    requiredVariant: opts.requiredVariant ?? 'any',
    ...opts,
});

/** Variants and buffs per skill - baseDescription comes from skills.js */
const TREE_DATA = {
    'Wave of Light': {
        variants: {
            'Explosive Light': { description: 'The wave explodes on impact, dealing area damage.', effects: ['Area damage'], unlockedBy: 'Legendary item Explosive Light', cost: 5, requiredPoints: 0 },
            'Lightning Bell': { description: 'Summons a bell that strikes lightning on enemies.', effects: ['Lightning damage'], unlockedBy: 'Legendary item Lightning Bell', cost: 5, requiredPoints: 0 },
            'Pillar of the Light': { description: 'Creates a pillar of light that damages enemies.', effects: ['Pillar damage'], unlockedBy: 'Legendary item Pillar of the Light', cost: 5, requiredPoints: 0 },
            'Wall of Light': { description: 'Creates a wall of light that blocks and damages.', effects: ['Wall', 'Damage'], unlockedBy: 'Legendary item Wall of Light', cost: 5, requiredPoints: 0 },
        },
        buffs: {
            'Focused Energy': BUFF('Reduces the energy cost of Wave of Light by 20%.', ['Reduced energy cost']),
            'Amplified Power': BUFF('Increases the damage of Wave of Light by 15%.', ['Increased damage']),
            'Swift Wave': BUFF('Reduces the cooldown of Wave of Light by 1 second.', ['Cooldown reduction']),
            'Resonating Echo': BUFF('Wave of Light has a chance to echo, casting a second wave.', ['Chance for additional wave']),
        },
    },
    'Shield of Zen': {
        variants: {
            'Transcendence': { description: 'Transcend damage, absorbing and reflecting.', effects: ['Absorption', 'Reflection'], unlockedBy: 'Legendary item Transcendence', cost: 5, requiredPoints: 0 },
            'Retribution Aura': { description: 'Reflects damage back to attackers.', effects: ['Damage reflection'], unlockedBy: 'Legendary item Retribution Aura', cost: 5, requiredPoints: 0 },
            'Spiritual Protection': { description: 'Grants spiritual protection and damage reduction.', effects: ['Protection'], unlockedBy: 'Legendary item Spiritual Protection', cost: 5, requiredPoints: 0 },
            'Diamond Aura': { description: 'Diamond-hard aura that absorbs massive damage.', effects: ['Increased absorption'], unlockedBy: 'Legendary item Diamond Aura', cost: 5, requiredPoints: 0 },
        },
        buffs: {
            'Harmonious Defense': BUFF('Reduces the cooldown of Shield of Zen by 2 seconds.', ['Cooldown reduction']),
            'Empowered Shielding': BUFF('Increases the damage absorption of the shield by 25%.', ['Increased absorption']),
            'Lingering Protection': BUFF('Extends the duration of the shield by 1 second.', ['Extended duration']),
            'Resilient Guard': BUFF('Increases your defense while the shield is active.', ['Increased defense']),
        },
    },
    'Breath of Heaven': {
        variants: {
            'Circle of Life': { description: 'Increases the healing radius and amount healed.', effects: ['Increased healing', 'Extended radius'], unlockedBy: 'Legendary item Circle of Life', cost: 5, requiredPoints: 0 },
            'Infused with Light': { description: 'Grants a temporary damage boost to allies healed.', effects: ['Damage boost', 'Area of effect'], unlockedBy: 'Legendary item Infused Light', cost: 5, requiredPoints: 0 },
            'Radiant Breath': { description: 'Adds a blinding effect to enemies within the healing area.', effects: ['Blind effect', 'Area of effect'], unlockedBy: 'Legendary item Radiant Breath', cost: 5, requiredPoints: 0 },
            'Soothing Mist': { description: 'Heals over time instead of instantly.', effects: ['Healing over time', 'Area of effect'], unlockedBy: 'Legendary item Soothing Mist', cost: 5, requiredPoints: 0 },
            "Zephyr's Grace": { description: "Increases movement speed of allies healed.", effects: ['Movement speed increase', 'Area of effect'], unlockedBy: "Legendary item Zephyr's Grace", cost: 5, requiredPoints: 0 },
        },
        buffs: {
            'Empowered Healing': BUFF('Increases the healing amount by 15%.', ['Increased healing'], { levelBonuses: ['Increases healing by 15%', 'Increases healing by 30%', 'Increases healing by 45%'] }),
            'Quick Recovery': BUFF('Reduces the cooldown of Breath of Heaven by 1 second.', ['Cooldown reduction'], { levelBonuses: ['Reduces cooldown by 1 second', 'Reduces cooldown by 2 seconds', 'Reduces cooldown by 3 seconds'] }),
            'Resilient Spirit': BUFF('Grants a temporary shield to allies healed.', ['Shield', 'Damage absorption'], { levelBonuses: ['Shield absorbs 10% of max health', 'Shield absorbs 20% of max health', 'Shield absorbs 30% of max health'] }),
            'Healing Winds': BUFF('Increases the healing radius by 20%.', ['Extended radius'], { levelBonuses: ['Increases radius by 20%', 'Increases radius by 40%', 'Increases radius by 60%'] }),
        },
    },
    'Wave Strike': {
        variants: {
            'Tidal Force': { description: 'The wave travels further and deals increased damage to enemies at the end.', effects: ['Extended range', 'Increased end damage'], unlockedBy: "Legendary item Ocean's Might" },
            'Shocking Wave': { description: 'Enemies hit are electrified, taking lightning damage over time.', effects: ['Lightning damage over time'], unlockedBy: 'Legendary item Storm Surge' },
            'Freezing Wave': { description: 'The wave chills enemies, reducing movement speed.', effects: ['Chilling effect', 'Movement speed reduction'], unlockedBy: 'Legendary item Frostbite' },
        },
        buffs: {
            'Energy Efficiency': BUFF('Reduces the energy cost of Wave Strike by 20%.', ['Reduced energy cost']),
            'Power Surge': BUFF('Increases the damage of Wave Strike by 15%.', ['Increased damage']),
            'Rapid Waves': BUFF('Reduces the cooldown of Wave Strike by 1 second.', ['Cooldown reduction']),
            'Echoing Waves': BUFF('Wave Strike has a chance to cast an additional wave.', ['Chance for additional wave']),
        },
    },
    'Cyclone Strike': {
        variants: {
            'Eye of the Storm': { description: 'Increases the radius of Cyclone Strike by 20%.', effects: ['Increased radius', 'Area of effect'], unlockedBy: 'Legendary off-hand Eye of the Storm', cost: 5, requiredPoints: 0 },
            'Path of the Storm': { description: 'Cyclone Strike also temporarily decreases all damage you take by 20%.', effects: ['Damage reduction', 'Area of effect'], unlockedBy: 'Legendary legs Path of the Storm', cost: 5, requiredPoints: 0 },
            'Storm Spirit': { description: 'Generates a powerful tornado that continually damages nearby enemies.', effects: ['Continuous damage', 'Area of effect'], unlockedBy: 'Legendary chest armor Storm Spirit', cost: 5, requiredPoints: 0 },
            "Tempest's Heart": { description: 'Turns the Monk into a vortex that pulls in enemies and detonates.', effects: ['Knockback', 'Area of effect'], unlockedBy: "Legendary chest armor Tempest's Heart", cost: 5, requiredPoints: 0 },
        },
        buffs: {
            'Boundless Breath': BUFF('Cooldown reduced by 0.07 seconds or 1.6 energy recovered per yard moved.', ['Cooldown reduction', 'Energy recovery'], { levelBonuses: ['Cooldown reduced by 0.07s or 1.6 energy per yard', 'Cooldown reduced by 0.14s or 3.2 energy per yard', 'Cooldown reduced by 0.21s or 4.8 energy per yard'] }),
            'Expanded Radius': BUFF('Increases Cyclone Strike radius by 29.0%.', ['Increased radius'], { levelBonuses: ['Increases radius by 29%', 'Increases radius by 58%', 'Increases radius by 87%'] }),
            'Terminal Pace': BUFF('Damage increased by 1.9% for every 1% increase in Movement Speed, up to 57%.', ['Damage increase'], { levelBonuses: ['Damage increased by 1.9% per 1% Movement Speed', 'Damage increased by 3.8% per 1% Movement Speed', 'Damage increased by 5.7% per 1% Movement Speed'] }),
            'Awakened': BUFF('Cyclone Strike damage increased by 10%.', ['Damage increase'], { levelBonuses: ['Damage increased by 10%', 'Damage increased by 20%', 'Damage increased by 30%'] }),
        },
    },
    'Seven-Sided Strike': {
        variants: {
            'Blazing Fists': { description: 'Each strike ignites enemies, dealing fire damage over time.', effects: ['Fire damage', 'Damage over time'], unlockedBy: 'Legendary item Inferno Knuckles' },
            'Frozen Assault': { description: 'Each strike has a chance to freeze enemies.', effects: ['Freeze effect', 'Crowd control'], unlockedBy: 'Legendary item Glacial Fists' },
            'Thunderclap': { description: 'Each strike releases a shockwave, dealing area damage.', effects: ['Area damage', 'Shockwave'], unlockedBy: 'Legendary item Thunderous Grasp' },
            'Phantom Echo': { description: 'Creates an echo that repeats the strikes after a delay.', effects: ['Echo strikes', 'Delayed damage'], unlockedBy: 'Legendary item Echoing Spirit' },
            'Celestial Impact': { description: 'Increases the number of strikes and damage.', effects: ['Increased strikes', 'Increased damage'], unlockedBy: 'Legendary item Celestial Gauntlets' },
        },
        buffs: {
            'Rapid Strikes': BUFF('Reduces the cooldown of Seven-Sided Strike by 2 seconds.', ['Cooldown reduction']),
            'Empowered Blows': BUFF('Increases the damage of each strike by 20%.', ['Increased damage']),
            'Lingering Shadows': BUFF('Extends the duration of the strike sequence by 1 second.', ['Extended duration']),
            'Resilient Assault': BUFF('Increases your defense during the strike sequence.', ['Increased defense']),
        },
    },
    'Inner Sanctuary': {
        variants: {
            'Sanctified Ground': { description: 'The sanctuary also heals allies over time.', effects: ['Healing over time'], unlockedBy: 'Legendary item Healing Circle' },
            'Forbidden Palace': { description: 'Enemies within the sanctuary have reduced movement speed.', effects: ['Enemy movement speed reduction'], unlockedBy: 'Legendary item Palace of Restraint' },
            'Safe Haven': { description: 'Increases duration and provides a shield to allies when they enter.', effects: ['Increased duration', 'Shield on entry'], unlockedBy: "Legendary item Guardian's Refuge" },
            'Temple of Protection': { description: 'Increases the damage reduction effect.', effects: ['Increased damage reduction'], unlockedBy: "Legendary item Protector's Temple" },
            'Circle of Wrath': { description: 'Enemies within the sanctuary take damage over time.', effects: ['Damage over time to enemies'], unlockedBy: 'Legendary item Wrathful Circle' },
        },
        buffs: {
            'Extended Sanctuary': BUFF('Increases the radius of Inner Sanctuary by 20%.', ['Increased radius']),
            'Empowered Sanctuary': BUFF('Increases the damage reduction effect by an additional 10%.', ['Additional damage reduction']),
            'Quick Setup': BUFF('Reduces the cooldown of Inner Sanctuary by 2 seconds.', ['Cooldown reduction']),
            'Resilient Barrier': BUFF('Increases the duration of the shield provided by Safe Haven.', ['Increased shield duration']),
        },
    },
    'Mystic Allies': {
        variants: {
            'Fire Allies': { description: 'Summon fiery spirit allies that deal fire damage and burn enemies.', effects: ['Fire damage', 'Burning effect'], unlockedBy: 'Legendary item Ember Spirits' },
            'Water Allies': { description: 'Summon water spirit allies that heal you and allies over time.', effects: ['Healing effect'], unlockedBy: 'Legendary item Tidal Companions' },
        },
        buffs: {
            'Extended Duration': BUFF('Increases the duration of Mystic Allies by 20%.', ['Increased duration']),
            'Empowered Allies': BUFF('Increases the damage of Mystic Allies by 15%.', ['Increased damage']),
            'Quick Summon': BUFF('Reduces the cooldown of Mystic Allies by 1 second.', ['Cooldown reduction']),
            'Resilient Spirits': BUFF('Increases the health of Mystic Allies by 25%.', ['Increased health']),
        },
    },
    'Exploding Palm': {
        variants: {
            'Crippling Insight': { description: 'Maximum charges of Exploding Palm increased by 1.', effects: ['Additional charge', 'Area of effect'], unlockedBy: 'Legendary head Crippling Insight', cost: 5, requiredPoints: 0 },
            'Reaching Rebuke': { description: 'Launches you at a location and strikes with a giant palm.', effects: ['Movement ability', 'Area of effect'], unlockedBy: 'Legendary off-hand Reaching Rebuke', cost: 5, requiredPoints: 0 },
            'Scolding Storm': { description: 'Exploding Palm is now icy and inflicts Chill.', effects: ['Chill effect', 'Area of effect'], unlockedBy: 'Legendary off-hand Scolding Storm', cost: 5, requiredPoints: 0 },
            'Breath of Incense': { description: 'Seven-Sided Strike can trigger Exploding Palm explosion on Bleeding enemies.', effects: ['Skill synergy', 'Area of effect'], unlockedBy: 'Legendary chest Breath of Incense', cost: 5, requiredPoints: 0 },
            'Path of the Present': { description: 'Throws a giant palm in a direction, damaging and Stunning enemies.', effects: ['Stun effect', 'Area of effect'], unlockedBy: 'Legendary weapon Path of the Present', cost: 5, requiredPoints: 0 },
        },
        buffs: {
            'Enhanced Detonation': BUFF('Increases the explosion damage by 20%.', ['Increased damage'], { levelBonuses: ['Increases explosion damage by 20%', 'Increases explosion damage by 40%', 'Increases explosion damage by 60%'] }),
            'Rapid Palm': BUFF('Reduces the cooldown of Exploding Palm by 1 second.', ['Cooldown reduction'], { levelBonuses: ['Reduces cooldown by 1 second', 'Reduces cooldown by 2 seconds', 'Reduces cooldown by 3 seconds'] }),
            'Widened Blast': BUFF('Increases the explosion radius by 25%.', ['Extended radius'], { levelBonuses: ['Increases explosion radius by 25%', 'Increases explosion radius by 50%', 'Increases explosion radius by 75%'] }),
            'Lingering Pain': BUFF('Extends the duration of the bleed effect by 2 seconds.', ['Extended duration'], { levelBonuses: ['Extends bleed duration by 2 seconds', 'Extends bleed duration by 4 seconds', 'Extends bleed duration by 6 seconds'] }),
        },
    },
    'Flying Dragon': {
        variants: {
            "Dragon's Flight": { description: 'Increases the distance and speed of the flight.', effects: ['Increased distance', 'Increased speed'], unlockedBy: "Legendary item Dragon's Flight", cost: 5, requiredPoints: 0 },
            'Inferno Dragon': { description: 'Adds fire damage to each kick, burning enemies over time.', effects: ['Fire damage', 'Damage over time'], unlockedBy: 'Legendary item Inferno Dragon', cost: 5, requiredPoints: 0 },
            'Thunder Dragon': { description: 'Each kick releases a shockwave that stuns enemies.', effects: ['Stun effect', 'Area of effect'], unlockedBy: 'Legendary item Thunder Dragon', cost: 5, requiredPoints: 0 },
            'Gale Dragon': { description: 'Creates a wind barrier that deflects projectiles while flying.', effects: ['Projectile deflection', 'Increased defense'], unlockedBy: 'Legendary item Gale Dragon', cost: 5, requiredPoints: 0 },
            'Shadow Dragon': { description: 'Leaves behind a shadow that mimics your attacks.', effects: ['Shadow clone', 'Increased damage'], unlockedBy: 'Legendary item Shadow Dragon', cost: 5, requiredPoints: 0 },
        },
        buffs: {
            'Extended Flight': BUFF('Increases the duration of the flight by 2 seconds.', ['Extended duration'], { levelBonuses: ['Increases flight duration by 2 seconds', 'Increases flight duration by 4 seconds', 'Increases flight duration by 6 seconds'] }),
            'Empowered Kicks': BUFF('Increases the damage of each kick by 15%.', ['Increased damage'], { levelBonuses: ['Increases kick damage by 15%', 'Increases kick damage by 30%', 'Increases kick damage by 45%'] }),
            'Swift Descent': BUFF('Reduces the cooldown of Flying Dragon by 1 second.', ['Cooldown reduction'], { levelBonuses: ['Reduces cooldown by 1 second', 'Reduces cooldown by 2 seconds', 'Reduces cooldown by 3 seconds'] }),
            'Aerial Mastery': BUFF("Increases the Monk's evasion while airborne.", ['Increased evasion'], { levelBonuses: ['Increases evasion by 10%', 'Increases evasion by 20%', 'Increases evasion by 30%'] }),
        },
    },
    'Flying Kick': {
        variants: {
            'Mantle of the Crane': { description: 'Flying Kick range increased by 20%.', effects: ['Increased range', 'Area of effect'], unlockedBy: 'Legendary shoulder Mantle of the Crane', cost: 5, requiredPoints: 0 },
            "Tiger's Flight": { description: 'Flying Kick generates a flaming tornado that damages enemies.', effects: ['Fire damage', 'Area of effect'], unlockedBy: "Legendary legs Tiger's Flight", cost: 5, requiredPoints: 0 },
            "Grace's Bounty": { description: 'Flying Kick becomes Spinning Kick, damaging all nearby enemies.', effects: ['Area damage', 'Transformation'], unlockedBy: "Legendary legs Grace's Bounty", cost: 5, requiredPoints: 0 },
            "Momentum's Flow": { description: 'Unleashes a series of kicks with the final kick knocking enemies away.', effects: ['Multiple hits', 'Knockback'], unlockedBy: "Legendary legs Momentum's Flow", cost: 5, requiredPoints: 0 },
            'Spokes of the Wheel': { description: 'Flying Kick temporarily increases all damage you deal by 10%.', effects: ['Damage boost', 'Temporary buff'], unlockedBy: 'Legendary weapon Spokes of the Wheel', cost: 5, requiredPoints: 0 },
        },
        buffs: {
            'Extended Reach': BUFF('Increases the range of Flying Kick by 20%.', ['Increased range'], { levelBonuses: ['Increases range by 20%', 'Increases range by 40%', 'Increases range by 60%'] }),
            'Empowered Impact': BUFF('Increases the damage of Flying Kick by 15%.', ['Increased damage'], { levelBonuses: ['Increases damage by 15%', 'Increases damage by 30%', 'Increases damage by 45%'] }),
            'Swift Recovery': BUFF('Reduces the cooldown of Flying Kick by 1 second.', ['Cooldown reduction'], { levelBonuses: ['Reduces cooldown by 1 second', 'Reduces cooldown by 2 seconds', 'Reduces cooldown by 3 seconds'] }),
            'Aerial Agility': BUFF('Increases evasion while performing Flying Kick.', ['Increased evasion'], { levelBonuses: ['Increases evasion by 10%', 'Increases evasion by 20%', 'Increases evasion by 30%'] }),
        },
    },
    'Mystic Strike': {
        variants: {},
        buffs: {
            'Quickened Strikes': BUFF('Reduces the cooldown of Mystic Strike by 1 second.', ['Cooldown reduction']),
            'Empowered Spirit': BUFF('Increases the damage dealt by the returning spirit by 15%.', ['Increased damage']),
            'Lingering Presence': BUFF("Extends the duration of the spirit's presence by 3 seconds.", ['Extended duration']),
            'Resilient Dash': BUFF('Increases your defense while dashing with Mystic Strike.', ['Increased defense']),
        },
    },
    'Imprisoned Fists': {
        variants: {
            'Frozen Shackles': { description: 'Imprisoned Fists now freezes enemies, dealing cold damage over time.', effects: ['Freeze effect', 'Cold damage'], unlockedBy: 'Legendary item Frozen Shackles' },
            'Fiery Chains': { description: 'Adds fire damage to the strike, burning enemies over time.', effects: ['Fire damage', 'Damage over time'], unlockedBy: 'Legendary item Fiery Chains' },
            'Thunderous Grip': { description: 'Each strike releases a shockwave that stuns nearby enemies.', effects: ['Stun effect', 'Area of effect'], unlockedBy: 'Legendary item Thunderous Grip' },
            'Shadow Bind': { description: 'Creates shadow tendrils that immobilize enemies longer.', effects: ['Extended immobilization', 'Shadow damage'], unlockedBy: 'Legendary item Shadow Bind' },
            'Gale Chains': { description: 'Increases the range and speed of the strike.', effects: ['Increased range', 'Increased speed'], unlockedBy: 'Legendary item Gale Chains' },
        },
        buffs: {
            'Extended Lock': BUFF('Increases the duration of the immobilization effect by 20%.', ['Extended immobilization']),
            'Empowered Strike': BUFF('Increases the damage of Imprisoned Fists by 15%.', ['Increased damage']),
            'Swift Recovery': BUFF('Reduces the cooldown of Imprisoned Fists by 1 second.', ['Cooldown reduction']),
            'Aerial Agility': BUFF('Increases evasion while performing Imprisoned Fists.', ['Increased evasion']),
        },
    },
    'Bul Palm': {
        variants: {
            'Palm Rain': { description: 'Summons 10 giant palms from the sky that crash down on enemies.', effects: ['Multiple palms', 'Area of effect', 'Increased damage'], unlockedBy: 'Legendary gloves Hand of the Heavens', cost: 5, requiredPoints: 0 },
            'Palm Cross': { description: 'Summons 4 giant palms in a cross pattern with massive explosion.', effects: ['Cross pattern', 'Giant palms', 'Massive explosion'], unlockedBy: 'Legendary bracers Cross of the Heavens', cost: 5, requiredPoints: 0 },
            'Storm of Palms': { description: 'Summons a storm of giant palms that follow you.', effects: ['Follows hero', 'Increased palm count', 'Extended duration'], unlockedBy: "Legendary amulet Storm Caller's Pendant", cost: 5, requiredPoints: 0 },
        },
        buffs: {
            'Palm Mastery': BUFF('Increases the damage of Bul Palm by 15%.', ['Increased damage'], { levelBonuses: ['Increases damage by 15%', 'Increases damage by 30%', 'Increases damage by 45%'] }),
            'Swift Palms': BUFF('Reduces the cooldown of Bul Palm by 0.5 seconds.', ['Cooldown reduction'], { levelBonuses: ['Reduces cooldown by 0.5 seconds', 'Reduces cooldown by 1.0 seconds', 'Reduces cooldown by 1.5 seconds'] }),
            'Widened Impact': BUFF('Increases the explosion radius by 20%.', ['Extended radius'], { levelBonuses: ['Increases explosion radius by 20%', 'Increases explosion radius by 40%', 'Increases explosion radius by 60%'] }),
            'Empowered Palms': BUFF('Palm Rain variant summons 2 additional palms.', ['Additional palms'], { levelBonuses: ['Summons 2 additional palms', 'Summons 4 additional palms', 'Summons 6 additional palms'], requiredVariant: 'Palm Rain' }),
        },
    },
    'Bul Breath Of Heaven': { variants: {}, buffs: {} },
    'Bul Shadow Clone': { variants: {}, buffs: {} },
};

/** Build SKILL_TREES from skills.js order, merging baseDescription from skills */
function buildSkillTrees() {
    const trees = {};
    for (const skill of NORMAL_SKILLS) {
        const data = TREE_DATA[skill.name];
        if (data) {
            trees[skill.name] = {
                baseDescription: skill.description,
                variants: data.variants || {},
                buffs: data.buffs || {},
            };
        }
    }
    return trees;
}

const BASE_SKILL_TREES = buildSkillTrees();
applyBuffsToVariants(BASE_SKILL_TREES);

export const SKILL_TREES = BASE_SKILL_TREES;
