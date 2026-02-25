import { FlyingKickEffect } from './FlyingKickEffect.js';

/**
 * Mystic Strike: Dash forward and leave a spirit behind that returns to you, dealing damage.
 * Uses FlyingKickEffect as base (dash behavior) with Mystic Strike config.
 */
export class MysticStrikeEffect extends FlyingKickEffect {
    constructor(skill) {
        super(skill);
    }
}
