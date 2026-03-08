/**
 * Handles serialization and deserialization of player data
 */
export class PlayerSerializer {
    /**
     * Serialize player data for saving
     * @param {Object} player - The player object
     * @returns {Object} Serialized player data
     */
    static serialize(player) {
        if (!player) {
            console.warn('Player object is null or undefined');
            return {};
        }
        const { x, y, z } = player.getPosition()
        return {
            stats: {
                ...player.stats,
                skillTreeNodeLevels: player.stats.skillTreeNodeLevels
                    ? { ...player.stats.skillTreeNodeLevels }
                    : {},
                enlightenmentModeRemaining: player.stats.enlightenmentModeRemaining ?? 0,
                enlightenmentModeCooldownRemaining: player.stats.enlightenmentModeCooldownRemaining ?? 0,
            },
            position: { x, y, z },
            level: player.stats.level,
            experience: player.stats.experience,
            skills: player.skills.getSkills().map(skill => ({
                name: skill.name,
                cooldown: skill.cooldown,
                currentCooldown: skill.currentCooldown
            }))
        };
    }
    
    /**
     * Deserialize player data from save
     * @param {Object} player - The player object to update
     * @param {Object} playerData - The saved player data
     */
    static deserialize(player, playerData) {
        if (!player || !playerData) {
            console.error('Player or player data is null or undefined');
            return;
        }
        
        console.debug('Loading player data:', Object.keys(playerData));
        
        // Load stats (GDD: map legacy dexterity → agility; do not set dexterity)
        if (playerData.stats) {
            console.debug('Loading player stats');
            Object.keys(playerData.stats).forEach(key => {
                if (key === 'dexterity') {
                    player.stats.agility = playerData.stats[key];
                } else if (key === 'skillTreeNodeLevels') {
                    const raw = playerData.stats.skillTreeNodeLevels;
                    player.stats.skillTreeNodeLevels = (raw && typeof raw === 'object') ? { ...raw } : {};
                } else {
                    player.stats[key] = playerData.stats[key];
                }
            });
            if (typeof player.stats._recalcDerivedStats === 'function') {
                player.stats._recalcDerivedStats();
            }
        }
        
        // Load position
        if (playerData.position) {
            console.debug('Loading player position');
            player.setPosition(
                playerData.position.x || 0,
                playerData.position.y || 0,
                playerData.position.z || 0
            );
        }
        
        // Load additional player data if available
        
        if (playerData.level !== undefined) {
            player.stats.level = playerData.level;
        }
        
        if (playerData.experience !== undefined) {
            player.stats.experience = playerData.experience;
        }
        
        // Load skills if available
        if (playerData.skills && Array.isArray(playerData.skills) && player.skills) {
            player.skills.loadSkills(playerData.skills);
        }
        
        console.debug('Player data loaded successfully');
    }
}