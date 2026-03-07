/**
 * Chapter quests — GDD-aligned (quest.md §5, §6; design/systems/quest-system.md).
 * Each main story quest: narrative, emotional theme, objectives, boss, reflection quote, rewards.
 *
 * Tone (Phase 7.6): Quests are one-time help—the monk helps a place once, learns a lesson, moves on.
 * Lessons and quest text are kid/teen-friendly: life lessons about growth, harmony, and being better
 * (anger, fear, gratitude, connection, self-mastery) without heavy or scary content.
 *
 * Naming: Each quest has an `area` (e.g. "Mountain of Desire"). When this chapter's map is shown
 * in the map selector, the UI uses this area as the single display name (localized via
 * chapter-quests-locales.js) so players see one clear name per map, not both map name and area.
 */

import { getEnemyTypesForChapterIndex } from './chapter-maps-zones.js';

/** Default map bounds (typical playable area); quest markers stay inside this range. */
const QUEST_MAP_RADIUS = 280;

/**
 * Quest marker position for a chapter so markers are spread around the map instead of one spot.
 * @param {number} chapterIndex - 0-based index in CHAPTER_QUESTS (chapter 1 → 0, chapter 2 → 1, …)
 * @returns {{ x: number, z: number }}
 */
export function getQuestMarkerPositionForChapter(chapterIndex) {
    const n = 18; // number of directions; matches map count for variety
    const angle = (chapterIndex % n) * (2 * Math.PI / n);
    const ring = Math.floor(chapterIndex / n) % 4; // 0..3 = inner to outer
    const radius = 55 + ring * 75 + (chapterIndex % 3) * 15; // 55–220, varied
    const r = Math.min(radius, QUEST_MAP_RADIUS);
    return {
        x: Math.round(r * Math.cos(angle)),
        z: Math.round(r * Math.sin(angle)),
    };
}

/** @typedef {{ type: string, target?: string, count: number, progress?: number, group?: string, label?: string }} ChapterObjective */
// Optional `group`: objectives with the same group form a "choice group". Completion when requireChoiceGroupsAtLeast groups are fully complete (and all objectives without group are complete).
// Optional `label`: short narrative label for UI (e.g. "Clear the outskirts").

/**
 * Whether this chapter quest has choice groups (objectives with .group); used for UI callouts.
 * @param {{ objectives?: Array<{ group?: string }> }} quest - Chapter quest (template or active)
 * @returns {boolean}
 */
export function chapterQuestHasChoiceGroups(quest) {
    const objectives = quest?.objectives || [];
    return objectives.some(o => o && o.group);
}

/**
 * @typedef {Object} ChapterQuest
 * @property {string} id
 * @property {string} title
 * @property {string} description
 * @property {string} lesson - Life lesson quote (reflection screen)
 * @property {string} area
 * @property {{ x: number, z: number }} position - World position of quest marker (first quest near 0,0,0)
 * @property {ChapterObjective[]} objectives
 * @property {number} [requireChoiceGroupsAtLeast] - When objectives use `group`, need at least this many groups complete (default 1)
 * @property {{ enemyType: string, name: string }} boss
 * @property {{ xp: number, skillPoints?: number, item?: string }} rewards
 * @property {string|null} nextQuestId
 * @property {string[]} [nextQuestIds] - Optional: multiple possible next chapters (open flow)
 * @property {string[]} [reflectionRewards] - Optional: 3 item template IDs; reflection choice gives that item (makes chapter more interesting)
 * @property {boolean} [replayable] - If true, chapter can be replayed after completion to pick a different reflection reward
 */

/** @type {ChapterQuest[]} */
export const CHAPTER_QUESTS = [
    {
        id: 'chapter_1_restless_village',
        title: 'The Restless Village',
        description: 'A village consumed by anger—disputes over land, old grudges. A Rage Beast has taken root and feeds on their anger. Calm the conflicts and face the beast so the village can find peace.',
        lesson: 'Anger burns the one who carries it.',
        area: 'The Restless Village',
        position: getQuestMarkerPositionForChapter(0),
        objectives: [
            { type: 'kill', target: 'skeleton', count: 3, progress: 0, group: 'clear', label: 'Clear the outskirts' },
            { type: 'kill', target: 'shadow_beast', count: 2, progress: 0, group: 'silence', label: "Silence the beast's call" },
            { type: 'defeat_boss', target: 'skeleton_king', count: 1, progress: 0 },
        ],
        requireChoiceGroupsAtLeast: 1,
        boss: { enemyType: 'skeleton_king', name: 'Rage Beast' },
        rewards: { xp: 250, skillPoints: 1 },
        reflectionRewards: ['basicRing', 'basicAmulet', 'basicTalisman'],
        replayable: true,
        nextQuestId: 'chapter_2_forest_of_doubt',
    },
    {
        id: 'chapter_2_forest_of_doubt',
        title: 'Forest of Doubt',
        description: 'A dense, misty forest where travelers lose their way and their courage. Something whispers in the dark. Face the Doubt Serpent so the forest can be free of paralyzing fear.',
        lesson: 'Fear grows in silence.',
        area: 'Forest of Doubt',
        position: getQuestMarkerPositionForChapter(1),
        objectives: [
            { type: 'kill', target: 'zombie', count: 2, progress: 0, group: 'mist', label: 'Calm the mist' },
            { type: 'kill', target: 'corrupted_treant', count: 1, progress: 0, group: 'mist' },
            { type: 'kill', target: 'feral_wolf', count: 3, progress: 0, group: 'pack', label: "Face the serpent's pack" },
            { type: 'defeat_boss', target: 'demon_lord', count: 1, progress: 0 },
        ],
        requireChoiceGroupsAtLeast: 1,
        boss: { enemyType: 'demon_lord', name: 'Doubt Serpent' },
        rewards: { xp: 250, skillPoints: 1 },
        reflectionRewards: ['elementalRing', 'enlightenedAmulet', 'chakraTalisman'],
        replayable: true,
        nextQuestId: 'chapter_3_mountain_of_desire',
    },
    {
        id: 'chapter_3_mountain_of_desire',
        title: 'Mountain of Desire',
        description: 'A mountain where treasure hunters are obsessed with gold and power. A Golden Titan guards the peak. Navigate temptations and face the Titan to learn that gratitude—not accumulation—brings peace.',
        lesson: 'Gratitude ends endless hunger.',
        area: 'Mountain of Desire',
        position: getQuestMarkerPositionForChapter(2),
        objectives: [
            { type: 'kill', target: 'forest_spider', count: 3, progress: 0, group: 'path', label: 'Clear the path' },
            { type: 'kill', target: 'feral_wolf', count: 2, progress: 0, group: 'path' },
            { type: 'kill', target: 'corrupted_treant', count: 1, progress: 0, group: 'sentinels', label: "Break the titan's sentinels" },
            { type: 'kill', target: 'shadow_beast', count: 2, progress: 0, group: 'sentinels' },
            { type: 'defeat_boss', target: 'golden_titan', count: 1, progress: 0 },
        ],
        requireChoiceGroupsAtLeast: 1,
        boss: { enemyType: 'golden_titan', name: 'Golden Titan' },
        rewards: { xp: 250, skillPoints: 1 },
        reflectionRewards: ['crescentMoonRing', 'spiritCoreAmulet', 'dragonscaleTalisman'],
        replayable: true,
        nextQuestId: 'chapter_4_desert_of_loneliness',
    },
    {
        id: 'chapter_4_desert_of_loneliness',
        title: 'Desert of Loneliness',
        description: 'A vast desert where travelers feel cut off—no landmarks, no companions. An Echo Phantom amplifies loneliness. Endure the emptiness, find connection, then face the Phantom.',
        lesson: 'You are never truly alone.',
        area: 'Desert of Loneliness',
        position: getQuestMarkerPositionForChapter(3),
        objectives: [
            { type: 'kill', target: 'skeleton', count: 2, progress: 0, group: 'echoes', label: 'Silence the echoes' },
            { type: 'kill', target: 'necromancer', count: 2, progress: 0, group: 'echoes' },
            { type: 'kill', target: 'ruin_crawler', count: 3, progress: 0, group: 'shadows', label: "Face the phantom's shadows" },
            { type: 'kill', target: 'cursed_spirit', count: 1, progress: 0, group: 'shadows' },
            { type: 'defeat_boss', target: 'echo_phantom', count: 1, progress: 0 },
        ],
        requireChoiceGroupsAtLeast: 1,
        boss: { enemyType: 'echo_phantom', name: 'Echo Phantom' },
        rewards: { xp: 250, skillPoints: 1 },
        reflectionRewards: ['infinityBand', 'celestialHeart', 'cosmicNexus'],
        replayable: true,
        nextQuestId: 'chapter_5_inner_temple',
    },
    {
        id: 'chapter_5_inner_temple',
        title: 'Inner Temple',
        description: 'The final trial. Here the test is not an external monster but the self. A Shadow Self mirrors your skills and choices. Face this reflection and transcend the untrained self to earn Enlightenment Mode.',
        lesson: 'Your greatest opponent is your untrained self.',
        area: 'Inner Temple',
        position: getQuestMarkerPositionForChapter(4),
        objectives: [
            { type: 'defeat_boss', target: 'shadow_self', count: 1, progress: 0 },
        ],
        boss: { enemyType: 'shadow_self', name: 'Shadow Self' },
        rewards: { xp: 300, skillPoints: 1 },
        reflectionRewards: ['eternityLoop', 'soulNexus', 'cosmicNexus'],
        replayable: true,
        nextQuestId: 'chapter_6_valley_of_patience',
    },
];

// Buddha-inspired life lessons and story content for chapters 6–100 (built below)
const BOSS_CYCLE = [
    { enemyType: 'skeleton_king', name: 'Guardian of Strife' },
    { enemyType: 'demon_lord', name: 'Shadow of Doubt' },
    { enemyType: 'golden_titan', name: 'Avatar of Greed' },
    { enemyType: 'echo_phantom', name: 'Spirit of Loneliness' },
    { enemyType: 'shadow_self', name: 'Mirror of the Self' },
    { enemyType: 'swamp_horror', name: 'Bog of Regret' },
    { enemyType: 'frost_titan', name: 'Frozen Heart' },
    { enemyType: 'necromancer_lord', name: 'Lord of Illusion' },
];

/** @type {{ lesson: string, title: string, area: string, description: string }[]} */
const CHAPTERS_6_100_CONTENT = [
    { lesson: 'A jug fills drop by drop.', title: 'Valley of Patience', area: 'Valley of Patience', description: 'A valley where farmers have forgotten that growth takes time. A Guardian of Strife feeds on their impatience. Help them wait with kindness and face the guardian.' },
    { lesson: 'Do not dwell in the past; concentrate on the present.', title: 'Meadow of the Present', area: 'Meadow of the Present', description: 'A meadow where spirits are trapped in yesterday. A Shadow of Doubt keeps them from seeing today. Free them by facing the shadow and living in the now.' },
    { lesson: 'Happiness never decreases by being shared.', title: 'Village of Open Hands', area: 'Village of Open Hands', description: 'A village that hoards its harvest. An Avatar of Greed guards the granary. Teach sharing by example and defeat the avatar so all may eat.' },
    { lesson: 'You are never truly alone.', title: 'Hollow of Echoes', area: 'Hollow of Echoes', description: 'A hollow where travelers hear only their own echoes. A Spirit of Loneliness amplifies isolation. Find connection and face the spirit so the hollow can sing again.' },
    { lesson: 'Conquer yourself rather than a thousand battles.', title: 'Shrine of Self', area: 'Shrine of Self', description: 'A shrine where monks are tested by their own reflection. A Mirror of the Self blocks the path. Master your impulses and face the mirror.' },
    { lesson: 'Peace comes from within.', title: 'Bog of Restlessness', area: 'Bog of Restlessness', description: 'A bog where no one can sit still. A Bog of Regret stirs the waters. Bring calm and face the creature so the bog may find stillness.' },
    { lesson: 'The mind is everything; what you think, you become.', title: 'Frost Garden', area: 'Frost Garden', description: 'A garden frozen by negative thoughts. A Frozen Heart guards the gate. Warm the minds of the gardeners and melt the heart.' },
    { lesson: 'Hatred does not cease by hatred; only by love.', title: 'Ruin of Grudges', area: 'Ruin of Grudges', description: 'Ruins where old hatreds still burn. A Lord of Illusion feeds on revenge. Break the cycle with compassion and face the lord.' },
    { lesson: 'As you walk and eat and travel, be where you are.', title: 'Path of Wanderers', area: 'Path of Wanderers', description: 'A path where travelers rush and miss the journey. A Guardian of Strife pushes them onward. Teach mindfulness and calm the guardian.' },
    { lesson: 'Cultivate an unbounded heart toward all beings.', title: 'Garden of Compassion', area: 'Garden of Compassion', description: 'A garden where kindness has withered. A Shadow of Doubt whispers that others are unworthy. Restore compassion and face the shadow.' },
    { lesson: 'Let go of what no longer serves you.', title: 'Cliff of Clinging', area: 'Cliff of Clinging', description: 'A cliff where people cling to broken things. An Avatar of Greed hoards the past. Help them release and defeat the avatar.' },
    { lesson: 'Words have the power to heal or harm.', title: 'Vale of Whispers', area: 'Vale of Whispers', description: 'A vale where harsh words have left scars. A Spirit of Loneliness echoes every insult. Speak with care and silence the spirit.' },
    { lesson: 'Small acts of kindness change the world.', title: 'Hamlet of Small Gifts', area: 'Hamlet of Small Gifts', description: 'A hamlet that believes only big deeds matter. A Mirror of the Self shows their neglect. Prove that small steps count and face the mirror.' },
    { lesson: 'Patience is the greatest virtue.', title: 'Marsh of Impatience', area: 'Marsh of Impatience', description: 'A marsh where everyone hurries and stumbles. A Bog of Regret thrives on haste. Slow down, help others slow down, and calm the bog.' },
    { lesson: 'See the light in others.', title: 'Cave of Judgement', area: 'Cave of Judgement', description: 'A cave where people see only faults. A Frozen Heart freezes every glance. Learn to see goodness and melt the heart.' },
    { lesson: 'Illusion fades when you look with clear eyes.', title: 'Mirage Desert', area: 'Mirage Desert', description: 'A desert of mirages and false hopes. A Lord of Illusion rules the dunes. See through the lies and defeat the lord.' },
    { lesson: 'Steady effort wins the race.', title: 'Slope of Haste', area: 'Slope of Haste', description: 'A slope where runners fall from rushing. A Guardian of Strife rewards speed over care. Show that steady steps reach the top and face the guardian.' },
    { lesson: 'The present moment is the only moment.', title: 'Clock Tower Ruins', area: 'Clock Tower Ruins', description: 'Ruins where everyone lives in past or future. A Shadow of Doubt lives in the clock. Bring them to the now and silence the shadow.' },
    { lesson: 'Generosity multiplies what you have.', title: 'Granary of the Miser', area: 'Granary of the Miser', description: 'A granary full of grain that no one shares. An Avatar of Greed guards the door. Open the granary with generosity and defeat the avatar.' },
    { lesson: 'Connection heals the soul.', title: 'Lonely Lighthouse', area: 'Lonely Lighthouse', description: 'A lighthouse where the keeper has forgotten others. A Spirit of Loneliness dims the light. Reconnect the keeper to the world and face the spirit.' },
    { lesson: 'Your choices shape who you become.', title: 'Crossroads of Fate', area: 'Crossroads of Fate', description: 'A crossroads where choices were made in fear. A Mirror of the Self shows the cost. Choose with wisdom and face the mirror.' },
    { lesson: 'Still water reflects the sky.', title: 'Restless Pond', area: 'Restless Pond', description: 'A pond that never stills; no one sees their reflection. A Bog of Regret churns the water. Bring stillness and calm the bog.' },
    { lesson: 'Warmth melts the coldest heart.', title: 'Ice Temple', area: 'Ice Temple', description: 'A temple frozen by indifference. A Frozen Heart sits on the altar. Bring warmth and compassion to melt the heart.' },
    { lesson: 'Reality is kinder than illusion.', title: 'Hall of Mirrors', area: 'Hall of Mirrors', description: 'A hall where illusions flatter and deceive. A Lord of Illusion rules. See the truth and shatter the lord.' },
    { lesson: 'One step at a time reaches the mountain.', title: 'Summit of Impatience', area: 'Summit of Impatience', description: 'A mountain where climbers quit too soon. A Guardian of Strife mocks their effort. Persist step by step and face the guardian.' },
    { lesson: 'Today is the day that matters.', title: 'Yesterday\'s Garden', area: 'Yesterday\'s Garden', description: 'A garden stuck in memory. A Shadow of Doubt lives in the past. Plant seeds for today and quiet the shadow.' },
    { lesson: 'Sharing fills both hands.', title: 'Market of Closed Fists', area: 'Market of Closed Fists', description: 'A market where no one trades. An Avatar of Greed keeps the stalls locked. Open hands open hearts; defeat the avatar.' },
    { lesson: 'Together we are stronger.', title: 'Divided Valley', area: 'Divided Valley', description: 'A valley split by old disputes. A Spirit of Loneliness keeps the sides apart. Bridge the divide and face the spirit.' },
    { lesson: 'Master the self before mastering others.', title: 'Dojo of Ego', area: 'Dojo of Ego', description: 'A dojo where students fight for glory. A Mirror of the Self shows their pride. Humble the ego and face the mirror.' },
    { lesson: 'Calm waters run deep.', title: 'Rapids of Anger', area: 'Rapids of Anger', description: 'Rapids where anger churns the water. A Bog of Regret feeds on rage. Bring calm and still the bog.' },
    { lesson: 'Kindness is never wasted.', title: 'Wasteland of Scorn', area: 'Wasteland of Scorn', description: 'A wasteland where kindness was mocked. A Frozen Heart rules. Sow kindness and melt the heart.' },
    { lesson: 'Truth is the first step to freedom.', title: 'Labyrinth of Lies', area: 'Labyrinth of Lies', description: 'A labyrinth built on lies. A Lord of Illusion guards the center. Speak truth and defeat the lord.' },
    { lesson: 'Patience turns sand into pearl.', title: 'Beach of Hurry', area: 'Beach of Hurry', description: 'A beach where no one waits for the tide. A Guardian of Strife rushes everyone. Teach patience and face the guardian.' },
    { lesson: 'The now is your only home.', title: 'Inn of Tomorrow', area: 'Inn of Tomorrow', description: 'An inn where guests only plan for tomorrow. A Shadow of Doubt lives in their plans. Live in the now and quiet the shadow.' },
    { lesson: 'Give without expecting return.', title: 'Temple of Tithes', area: 'Temple of Tithes', description: 'A temple that demands payment for every blessing. An Avatar of Greed counts every coin. Give freely and defeat the avatar.' },
    { lesson: 'A friend in need is a friend indeed.', title: 'Isle of Indifference', area: 'Isle of Indifference', description: 'An isle where no one helps another. A Spirit of Loneliness thrives. Extend a hand and face the spirit.' },
    { lesson: 'The unexamined life is not worth living.', title: 'Shrine of Sleep', area: 'Shrine of Sleep', description: 'A shrine where no one looks inward. A Mirror of the Self waits. Examine yourself and face the mirror.' },
    { lesson: 'Stillness reveals what noise hides.', title: 'Bazaar of Noise', area: 'Bazaar of Noise', description: 'A bazaar so loud no one hears themselves. A Bog of Regret adds to the din. Find stillness and calm the bog.' },
    { lesson: 'Love thaws the coldest winter.', title: 'Snowfield of Solitude', area: 'Snowfield of Solitude', description: 'A snowfield where everyone is alone. A Frozen Heart keeps the cold. Bring love and melt the heart.' },
    { lesson: 'See through the veil of fear.', title: 'Fog of Dread', area: 'Fog of Dread', description: 'A fog that fear makes thick. A Lord of Illusion feeds on dread. Walk with courage and disperse the lord.' },
    { lesson: 'Slow and steady wins.', title: 'Race of Haste', area: 'Race of Haste', description: 'A race where everyone trips from speed. A Guardian of Strife cheers the reckless. Run with care and face the guardian.' },
    { lesson: 'Let the past rest.', title: 'Graveyard of Grudges', area: 'Graveyard of Grudges', description: 'A graveyard where grudges are still tended. A Shadow of Doubt tends the plots. Let the dead rest and quiet the shadow.' },
    { lesson: 'Wealth shared is wealth doubled.', title: 'Vault of the Hoarder', area: 'Vault of the Hoarder', description: 'A vault full of gold no one uses. An Avatar of Greed sleeps on the pile. Share the wealth and defeat the avatar.' },
    { lesson: 'No one is an island.', title: 'Archipelago of Pride', area: 'Archipelago of Pride', description: 'Islands that refuse to build bridges. A Spirit of Loneliness rules the straits. Connect the islands and face the spirit.' },
    { lesson: 'True strength is self-control.', title: 'Arena of Rage', area: 'Arena of Rage', description: 'An arena where fighters lose themselves to anger. A Mirror of the Self reflects their fury. Find control and face the mirror.' },
    { lesson: 'Quiet the mind to hear the heart.', title: 'Cacophony Canyon', area: 'Cacophony Canyon', description: 'A canyon of endless noise. A Bog of Regret amplifies every sound. Find silence and calm the bog.' },
    { lesson: 'Compassion is courage.', title: 'Fortress of Fear', area: 'Fortress of Fear', description: 'A fortress built by fear. A Frozen Heart guards the gate. Approach with compassion and melt the heart.' },
    { lesson: 'Reality needs no disguise.', title: 'Masquerade Hall', area: 'Masquerade Hall', description: 'A hall where everyone wears masks. A Lord of Illusion loves the disguise. Remove the masks and defeat the lord.' },
    { lesson: 'Every journey begins with one step.', title: 'Threshold of Doubt', area: 'Threshold of Doubt', description: 'A threshold no one dares to cross. A Guardian of Strife blocks the way. Take the first step and face the guardian.' },
    { lesson: 'Today\'s breath is today\'s gift.', title: 'Asthma of Anxiety', area: 'Asthma of Anxiety', description: 'A place where worry steals every breath. A Shadow of Doubt whispers what-ifs. Breathe in the now and quiet the shadow.' },
    { lesson: 'The more you give, the more you have.', title: 'Well of Want', area: 'Well of Want', description: 'A well that runs dry from hoarding. An Avatar of Greed guards the bucket. Give first and defeat the avatar.' },
    { lesson: 'Unity makes light.', title: 'Darkness of Division', area: 'Darkness of Division', description: 'A place divided by suspicion. A Spirit of Loneliness darkens every corner. Unite and light the way; face the spirit.' },
    { lesson: 'Know thyself.', title: 'Maze of Mirrors', area: 'Maze of Mirrors', description: 'A maze of reflections. A Mirror of the Self hides the exit. Know who you are and face the mirror.' },
    { lesson: 'Peace is a practice.', title: 'War Camp', area: 'War Camp', description: 'A camp where war never ends. A Bog of Regret fuels the fights. Practice peace and calm the bog.' },
    { lesson: 'Kindness costs nothing.', title: 'Toll Bridge', area: 'Toll Bridge', description: 'A bridge where every crossing has a price. A Frozen Heart collects the toll. Offer kindness instead and melt the heart.' },
    { lesson: 'Truth sets you free.', title: 'Prison of Pretense', area: 'Prison of Pretense', description: 'A prison built on pretense. A Lord of Illusion is the warden. Speak truth and break free; defeat the lord.' },
    { lesson: 'Wait for the right moment.', title: 'Harvest of Haste', area: 'Harvest of Haste', description: 'A harvest ruined by picking too soon. A Guardian of Strife urges speed. Wait for ripeness and face the guardian.' },
    { lesson: 'The past is a teacher, not a prison.', title: 'Dungeon of Memory', area: 'Dungeon of Memory', description: 'A dungeon where the past chains the present. A Shadow of Doubt holds the keys. Learn and let go; quiet the shadow.' },
    { lesson: 'Give from the heart.', title: 'Counting House', area: 'Counting House', description: 'A house where every gift is counted. An Avatar of Greed keeps the ledger. Give without counting and defeat the avatar.' },
    { lesson: 'We need each other.', title: 'Hermit\'s Peak', area: 'Hermit\'s Peak', description: 'A peak where a hermit has forgotten others. A Spirit of Loneliness lives in the cave. Remind the hermit of connection and face the spirit.' },
    { lesson: 'Humility opens doors.', title: 'Gate of Arrogance', area: 'Gate of Arrogance', description: 'A gate that pride has locked. A Mirror of the Self guards it. Approach with humility and face the mirror.' },
    { lesson: 'Silence speaks.', title: 'Tower of Tongues', area: 'Tower of Tongues', description: 'A tower where no one stops talking. A Bog of Regret adds to the noise. Embrace silence and calm the bog.' },
    { lesson: 'Love your neighbor as yourself.', title: 'Wall of Strangers', area: 'Wall of Strangers', description: 'A wall that separates neighbors. A Frozen Heart built it. Tear it down with love and melt the heart.' },
    { lesson: 'Illusion cannot feed the hungry.', title: 'Feast of Phantoms', area: 'Feast of Phantoms', description: 'A feast that looks real but leaves everyone hungry. A Lord of Illusion serves the plates. Seek real nourishment and defeat the lord.' },
    { lesson: 'Perseverance moves mountains.', title: 'Quarry of Quitters', area: 'Quarry of Quitters', description: 'A quarry abandoned too soon. A Guardian of Strife mocks the workers. Return and persevere; face the guardian.' },
    { lesson: 'Now is the time.', title: 'Waiting Room', area: 'Waiting Room', description: 'A room where everyone waits for someday. A Shadow of Doubt says "not yet." Act now and quiet the shadow.' },
    { lesson: 'Abundance flows when shared.', title: 'Dam of Greed', area: 'Dam of Greed', description: 'A dam that holds back the river of plenty. An Avatar of Greed controls the gates. Open the gates and defeat the avatar.' },
    { lesson: 'Together we rise.', title: 'Pit of Division', area: 'Pit of Division', description: 'A pit where divided people fall. A Spirit of Loneliness deepens the pit. Unite and climb; face the spirit.' },
    { lesson: 'The wise rule themselves.', title: 'Throne of Impulse', area: 'Throne of Impulse', description: 'A throne where impulse rules. A Mirror of the Self sits there. Rule yourself and face the mirror.' },
    { lesson: 'Inner peace, outer peace.', title: 'Battlefield of Nerves', area: 'Battlefield of Nerves', description: 'A battlefield of anxious thoughts. A Bog of Regret fuels the war. Find inner peace and calm the bog.' },
    { lesson: 'Warmth begets warmth.', title: 'Frostbite Fields', area: 'Frostbite Fields', description: 'Fields where cold has spread from cold hearts. A Frozen Heart rules. Bring warmth and melt the heart.' },
    { lesson: 'Face what is real.', title: 'Dream Palace', area: 'Dream Palace', description: 'A palace built on dreams that ignore reality. A Lord of Illusion decorates the halls. Wake up and defeat the lord.' },
    { lesson: 'One breath, one step.', title: 'Panting Peak', area: 'Panting Peak', description: 'A peak where climbers gasp and give up. A Guardian of Strife pushes too hard. Breathe, step, and face the guardian.' },
    { lesson: 'Release what you cannot change.', title: 'River of Regret', area: 'River of Regret', description: 'A river that runs backward into the past. A Shadow of Doubt swims in it. Let the river flow forward and quiet the shadow.' },
    { lesson: 'Generosity is freedom.', title: 'Chain of Possession', area: 'Chain of Possession', description: 'A chain of attachments. An Avatar of Greed forges the links. Release and give; defeat the avatar.' },
    { lesson: 'We are all connected.', title: 'Web of Strangers', area: 'Web of Strangers', description: 'A web where each thread is alone. A Spirit of Loneliness weaves it. Connect the threads and face the spirit.' },
    { lesson: 'Master the mind.', title: 'Chaos Monastery', area: 'Chaos Monastery', description: 'A monastery where minds run wild. A Mirror of the Self multiplies the chaos. Master your mind and face the mirror.' },
    { lesson: 'Stillness in motion.', title: 'Whirlwind Plaza', area: 'Whirlwind Plaza', description: 'A plaza of constant motion. A Bog of Regret spins in the center. Find stillness within and calm the bog.' },
    { lesson: 'Compassion conquers fear.', title: 'Den of Dread', area: 'Den of Dread', description: 'A den where fear has made its home. A Frozen Heart feeds the dread. Enter with compassion and melt the heart.' },
    { lesson: 'Strip away the false.', title: 'Gilded Cave', area: 'Gilded Cave', description: 'A cave covered in false gold. A Lord of Illusion paints the walls. See the real and defeat the lord.' },
    { lesson: 'Endurance wins.', title: 'Marathon of Despair', area: 'Marathon of Despair', description: 'A marathon that breaks the spirit. A Guardian of Strife runs beside you. Endure and finish; face the guardian.' },
    { lesson: 'This moment is enough.', title: 'Palace of More', area: 'Palace of More', description: 'A palace where more is never enough. A Shadow of Doubt lives in the vaults. Find enough in the now and quiet the shadow.' },
    { lesson: 'Share the journey.', title: 'Solo Path', area: 'Solo Path', description: 'A path meant for many, walked by one. An Avatar of Greed took the rest. Share the path and defeat the avatar.' },
    { lesson: 'No one heals alone.', title: 'Sickbed Isle', area: 'Sickbed Isle', description: 'An isle of the sick who refuse help. A Spirit of Loneliness tends them. Offer healing and face the spirit.' },
    { lesson: 'Ego is the only enemy.', title: 'Victory Arch', area: 'Victory Arch', description: 'An arch that celebrates the self. A Mirror of the Self stands under it. Lay down the crown and face the mirror.' },
    { lesson: 'Quiet mind, clear path.', title: 'Noise Tower', area: 'Noise Tower', description: 'A tower where thoughts never stop. A Bog of Regret adds to the clamor. Quiet the mind and calm the bog.' },
    { lesson: 'Love crosses every border.', title: 'Border Fort', area: 'Border Fort', description: 'A fort that keeps others out. A Frozen Heart holds the keys. Open the gate with love and melt the heart.' },
    { lesson: 'Truth needs no armor.', title: 'Armory of Lies', area: 'Armory of Lies', description: 'An armory that arms with lies. A Lord of Illusion polishes the weapons. Disarm with truth and defeat the lord.' },
    { lesson: 'Patience is strength.', title: 'Sprint Valley', area: 'Sprint Valley', description: 'A valley where everyone sprints and falls. A Guardian of Strife rewards the fastest. Walk with patience and face the guardian.' },
    { lesson: 'The future is unwritten.', title: 'Scriptorium of Fate', area: 'Scriptorium of Fate', description: 'A scriptorium where fate is written in stone. A Shadow of Doubt holds the quill. Rewrite with hope and quiet the shadow.' },
    { lesson: 'Open hands receive more.', title: 'Fist Treasury', area: 'Fist Treasury', description: 'A treasury held in closed fists. An Avatar of Greed pries them open. Open your hands and defeat the avatar.' },
    { lesson: 'Community is shelter.', title: 'Storm of Solitude', area: 'Storm of Solitude', description: 'A storm that isolates everyone. A Spirit of Loneliness rides the wind. Build shelter together and face the spirit.' },
    { lesson: 'The greatest victory is over oneself.', title: 'Colosseum of Conquest', area: 'Colosseum of Conquest', description: 'A colosseum that glorifies conquest. A Mirror of the Self awards the crown. Conquer yourself and face the mirror.' },
    { lesson: 'Breathe and begin again.', title: 'Ash of Defeat', area: 'Ash of Defeat', description: 'Ashes of past failures. A Bog of Regret stirs them. Breathe and begin again; calm the bog.' },
    { lesson: 'Kindness is the first step.', title: 'Stairway of Scorn', area: 'Stairway of Scorn', description: 'Stairs where every step is scorn. A Frozen Heart built them. Climb with kindness and melt the heart.' },
    { lesson: 'Reality is enough.', title: 'Mirage Oasis', area: 'Mirage Oasis', description: 'An oasis that is only a mirage. A Lord of Illusion tends the illusion. Seek real water and defeat the lord.' },
    { lesson: 'Step by step, the path is walked.', title: 'Leap Canyon', area: 'Leap Canyon', description: 'A canyon no one can leap. A Guardian of Strife dares them to try. Cross step by step and face the guardian.' },
    { lesson: 'Today is the gift.', title: 'Tomorrow\'s Store', area: 'Tomorrow\'s Store', description: 'A store that only sells tomorrow. A Shadow of Doubt runs the counter. Accept today\'s gift and quiet the shadow.' },
    { lesson: 'We rise by lifting others.', title: 'Pit of Competition', area: 'Pit of Competition', description: 'A pit where everyone climbs over others. An Avatar of Greed stands at the top. Lift each other and defeat the avatar.' },
    { lesson: 'Healing is mutual.', title: 'Hospital of Walls', area: 'Hospital of Walls', description: 'A hospital where no one visits. A Spirit of Loneliness walks the halls. Visit and heal together; face the spirit.' },
    { lesson: 'True power is self-knowledge.', title: 'Throne of Blame', area: 'Throne of Blame', description: 'A throne from which everyone blames others. A Mirror of the Self reflects the finger. Know yourself and face the mirror.' },
    { lesson: 'In silence, wisdom speaks.', title: 'Parliament of Noise', area: 'Parliament of Noise', description: 'A parliament where no one listens. A Bog of Regret shouts the loudest. Listen in silence and calm the bog.' },
    { lesson: 'Compassion is the bridge.', title: 'Chasm of Contempt', area: 'Chasm of Contempt', description: 'A chasm between us and them. A Frozen Heart widens it. Build a bridge of compassion and melt the heart.' },
    { lesson: 'Illusion fades; truth remains.', title: 'Stage of Illusion', area: 'Stage of Illusion', description: 'A stage where illusion is the show. A Lord of Illusion takes the bow. Let the curtain fall and defeat the lord.' },
    { lesson: 'The path is walked one step at a time.', title: 'Mountain of Overwhelm', area: 'Mountain of Overwhelm', description: 'A mountain that overwhelms every climber. A Guardian of Strife points at the peak. Take one step and face the guardian.' },
    { lesson: 'The present is your home.', title: 'Nomad Camp', area: 'Nomad Camp', description: 'A camp of nomads who never rest in the now. A Shadow of Doubt keeps them moving. Rest in the present and quiet the shadow.' },
    { lesson: 'To have enough, share.', title: 'Famine of Hoarding', area: 'Famine of Hoarding', description: 'A land of famine beside full storehouses. An Avatar of Greed locks the doors. Share and defeat the avatar.' },
    { lesson: 'We are one family.', title: 'Tribe of Enemies', area: 'Tribe of Enemies', description: 'A tribe split into enemies. A Spirit of Loneliness sharpens the knives. Remember you are family and face the spirit.' },
    { lesson: 'The untrained self is the only foe.', title: 'Final Gate', area: 'Final Gate', description: 'The final gate before mastery. A Mirror of the Self is the last guardian. Transcend the untrained self and face the mirror to earn the Path of Mastery.' },
];

function slug(s) {
    return s.toLowerCase().replace(/\s+/g, '_').replace(/['']/g, '');
}

// Build chapters 6–100 and append to CHAPTER_QUESTS (mutate the exported array so CHAPTER_LESSONS etc. stay correct).
// Kill objectives use enemy types that spawn on this chapter's map so the player must seek different (and sometimes rarer) types.
(function () {
    const list = CHAPTER_QUESTS;
    const start = 6;
    const end = 100;
    for (let i = start; i <= end; i++) {
        const content = CHAPTERS_6_100_CONTENT[i - start];
        if (!content) break;
        const chapterIndex = list.length; // 0-based index of this chapter in CHAPTER_QUESTS
        const enemyTypes = getEnemyTypesForChapterIndex(chapterIndex);
        const boss = BOSS_CYCLE[(i - 1) % BOSS_CYCLE.length];
        const nextContent = CHAPTERS_6_100_CONTENT[i - start + 1];
        const nextId = i < end && nextContent ? `chapter_${i + 1}_${slug(nextContent.area)}` : null;
        const id = `chapter_${i}_${slug(content.area)}`;

        // Build kill objectives from map enemies: 2–3 common types + 1 rarer (later in list = harder to find on map)
        const killObjectives = [];
        if (enemyTypes.length >= 2) {
            const mid = Math.max(1, Math.floor(enemyTypes.length / 2));
            const common = enemyTypes.slice(0, mid);
            const rarer = enemyTypes.slice(mid);
            const type1 = common[(chapterIndex + 0) % common.length];
            const type2 = common[(chapterIndex + 1) % common.length];
            const count1 = 2 + (i % 2);
            const count2 = 1 + (i % 2);
            killObjectives.push({ type: 'kill', target: type1, count: count1, progress: 0 });
            if (type2 !== type1) killObjectives.push({ type: 'kill', target: type2, count: count2, progress: 0 });
            if (rarer.length > 0) {
                const rareType = rarer[(chapterIndex + i) % rarer.length];
                killObjectives.push({ type: 'kill', target: rareType, count: 1, progress: 0 });
            }
        } else if (enemyTypes.length === 1) {
            killObjectives.push({ type: 'kill', target: enemyTypes[0], count: 3 + (i % 3), progress: 0 });
        }
        killObjectives.push({ type: 'defeat_boss', target: boss.enemyType, count: 1, progress: 0 });

        list.push({
            id,
            title: content.title,
            description: content.description,
            lesson: content.lesson,
            area: content.area,
            position: getQuestMarkerPositionForChapter(chapterIndex),
            objectives: killObjectives,
            boss: { enemyType: boss.enemyType, name: boss.name },
            rewards: { xp: 250 + (i % 3) * 25, skillPoints: i % 5 === 0 ? 1 : 0 },
            nextQuestId: nextId,
        });
    }
    // Fix nextQuestId for last chapter (100) to null
    const last = list[list.length - 1];
    if (last && last.id.startsWith('chapter_100_')) last.nextQuestId = null;
})();

/**
 * Life lessons by chapter (for reflection screen).
 * @type {Record<string, string>}
 */
export const CHAPTER_LESSONS = Object.fromEntries(
    CHAPTER_QUESTS.map((q) => [q.id, q.lesson])
);

/**
 * Get chapter quest by id.
 * @param {string} id
 * @returns {ChapterQuest|undefined}
 */
export function getChapterQuestById(id) {
    return CHAPTER_QUESTS.find((q) => q.id === id);
}

/**
 * Get the first chapter quest (story start).
 * @returns {ChapterQuest}
 */
export function getFirstChapterQuest() {
    return CHAPTER_QUESTS[0];
}
