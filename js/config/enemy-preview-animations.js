/**
 * Animation states available for enemy models in the Enemy Preview tab.
 * Procedural models (built from primitives) support these states via updateAnimations().
 * GLB models would have their own clip names from the 3D file.
 */
export const ENEMY_PREVIEW_ANIMATIONS = [
    { id: 'idle', name: 'Idle', state: { isMoving: false, isAttacking: false } },
    { id: 'move', name: 'Move / Walk', state: { isMoving: true, isAttacking: false } },
    { id: 'attack', name: 'Attack', state: { isMoving: false, isAttacking: true } },
];
