import { SkillEffect } from './SkillEffect.js';
import { BASE_EFFECT_REGISTRY, VARIANT_EFFECT_REGISTRY } from './SkillEffectRegistry.js';

/**
 * Factory class for creating skill effects.
 * Uses dynamic import() for lazy-loading - only loads effect modules when first needed.
 * Caches loaded modules to prevent flickering on subsequent uses.
 */
export class SkillEffectFactory {
    static initialized = false;

    /** Cache: module path -> loaded module (exports) */
    static _moduleCache = new Map();

    /**
     * Initialize the factory by preloading models for effects that need them.
     * Called during game initialization.
     */
    static async initialize() {
        if (this.initialized) {
            console.debug('SkillEffectFactory already initialized');
            return;
        }

        console.debug('Initializing SkillEffectFactory...');

        try {
            // Preload models only for effects that need them (lazy load these too)
            const { ShieldOfZenEffect } = await import(this._resolveEffectPath('ShieldOfZenEffect.js'));
            await ShieldOfZenEffect.preloadModel();

            const { FlyingDragonEffect } = await import(this._resolveEffectPath('FlyingDragonEffect.js'));
            await FlyingDragonEffect.preloadModel();

            this.initialized = true;
            console.debug('SkillEffectFactory initialization complete');
        } catch (error) {
            console.error('Error initializing SkillEffectFactory:', error);
        }
    }

    /**
     * Resolve a path relative to this module (js/skills/) for reliable dynamic import.
     * Uses import.meta.url so resolution works regardless of document base or server root.
     */
    static _resolveEffectPath(relativePath) {
        const base = new URL('./', import.meta.url);
        return new URL(relativePath.startsWith('./') ? relativePath : `./${relativePath}`, base).href;
    }

    /**
     * Load a module by path and cache it. Returns the export with the given name.
     * @param {string} modulePath - Path relative to js/skills (e.g. 'WaveStrikeEffect.js' or 'variants/WaveStrike/TidalWaveEffect.js')
     * @param {string} exportName - Name of the exported class
     * @returns {Promise<Function>} The effect class constructor
     */
    static async _loadEffectClass(modulePath, exportName) {
        const fullUrl = this._resolveEffectPath(modulePath);
        const cacheKey = fullUrl;
        let mod = this._moduleCache.get(cacheKey);
        if (!mod) {
            mod = await import(/* webpackChunkName: "skill-effect-[request]" */ fullUrl);
            this._moduleCache.set(cacheKey, mod);
        }
        return mod[exportName];
    }

    /**
     * Create a variant-specific effect (lazy-loaded).
     * @param {Skill} skill
     * @returns {Promise<SkillEffect|null>}
     */
    static async _createVariantEffectAsync(skill) {
        const skillName = skill.name;
        const variantName = skill.variant;

        if (!skillName || !variantName) return null;

        const key = `${skillName}|${variantName}`;
        const entry = VARIANT_EFFECT_REGISTRY[key];
        if (!entry) {
            console.debug(`No variant registry for ${skillName} (${variantName})`);
            return null;
        }

        const EffectClass = await this._loadEffectClass(entry.path, entry.exportName);
        return new EffectClass(skill);
    }

    /**
     * Create a base effect (lazy-loaded).
     * @param {Skill} skill
     * @returns {Promise<SkillEffect>}
     */
    static async _createBaseEffectAsync(skill) {
        const entry = BASE_EFFECT_REGISTRY[skill.name];
        if (entry) {
            const EffectClass = await this._loadEffectClass(entry.path, entry.exportName);
            return new EffectClass(skill);
        }
        return new SkillEffect(skill);
    }

    /**
     * Preload effect module for a single skill (variant if present, else base). Only loads into cache; does not create instances.
     * @param {Skill} skill
     * @returns {Promise<void>}
     */
    static async _preloadEffectForSkill(skill) {
        const skillName = skill.name;
        if (!skillName) return;

        if (skill.variant) {
            const key = `${skillName}|${skill.variant}`;
            const entry = VARIANT_EFFECT_REGISTRY[key];
            if (entry) {
                await this._loadEffectClass(entry.path, entry.exportName);
                return;
            }
        }

        const baseEntry = BASE_EFFECT_REGISTRY[skillName];
        if (baseEntry) {
            await this._loadEffectClass(baseEntry.path, baseEntry.exportName);
        }
    }

    /**
     * Preload effect modules for all skills in the given array (e.g. the set selected for the HUD).
     * Ensures those effects are imported and cached before the player uses them.
     * @param {Array<Skill>} skills - Array of Skill instances (e.g. from player.getSkills())
     * @returns {Promise<void>}
     */
    static async preloadEffectsForSkills(skills) {
        if (!skills || skills.length === 0) return;
        await Promise.all(skills.map(skill => this._preloadEffectForSkill(skill)));
        console.debug('SkillEffectFactory: preloaded effect modules for', skills.length, 'HUD skills');
    }

    /**
     * Create a skill effect (async). Loads effect modules on first use, caches for subsequent calls.
     * @param {Skill} skill
     * @returns {Promise<SkillEffect>}
     */
    static async createEffectAsync(skill) {
        if (!skill.game) {
            console.warn(`Skill ${skill.name} created without game reference`);
        }

        let effect;

        if (skill.variant) {
            effect = await this._createVariantEffectAsync(skill);
            if (effect) {
                console.debug(`Created variant effect for ${skill.name} (${skill.variant})`);
                return effect;
            }
            console.debug(`No variant for ${skill.name} (${skill.variant}), using base`);
        }

        effect = await this._createBaseEffectAsync(skill);
        console.debug(`Effect created: ${effect.constructor.name}`);
        return effect;
    }

    /**
     * Synchronous createEffect - DEPRECATED. Returns null and logs warning.
     * Callers should use createEffectAsync instead.
     * @deprecated Use createEffectAsync
     */
    static createEffect(skill) {
        console.warn('SkillEffectFactory.createEffect is deprecated. Use createEffectAsync and await it.');
        return null;
    }
}
