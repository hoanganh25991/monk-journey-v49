import { DefaultModel } from './DefaultModel.js';
import { ENEMY_MODEL_REGISTRY } from './EnemyModelRegistry.js';

/**
 * Factory class for creating enemy models.
 * Uses dynamic import() for lazy-loading - only loads model modules when first needed.
 * Caches loaded modules to prevent flickering on subsequent spawns.
 */
export class EnemyModelFactory {
    /** Cache: module path -> loaded module (exports) */
    static _moduleCache = new Map();

    /**
     * Load a model class by path and cache it.
     * On network failure (e.g. ERR_INTERNET_DISCONNECTED or slow fetch), returns null so caller can use fallback.
     * @param {string} modulePath - Path relative to this file (e.g. './SkeletonModel.js')
     * @param {string} exportName - Name of the exported class
     * @returns {Promise<Function|null>} The model class constructor, or null if load failed
     */
    static async _loadModelClass(modulePath, exportName) {
        const cacheKey = modulePath;
        let mod = this._moduleCache.get(cacheKey);
        if (!mod) {
            try {
                mod = await import(/* webpackChunkName: "enemy-model-[request]" */ modulePath);
                this._moduleCache.set(cacheKey, mod);
            } catch (err) {
                console.warn(`EnemyModelFactory: failed to load model "${modulePath}" (network/slow?), using default model:`, err?.message || err);
                return null;
            }
        }
        return mod[exportName] ?? null;
    }

    /**
     * Create an appropriate model for the given enemy type (async - lazy-loads model module).
     * @param {Object} enemy - The enemy instance
     * @param {THREE.Group} modelGroup - The THREE.js group to add model parts to
     * @returns {Promise<EnemyModel>} The created model instance
     */
    static async createModelAsync(enemy, modelGroup) {
        const entry = ENEMY_MODEL_REGISTRY[enemy.type];
        if (entry) {
            const ModelClass = await this._loadModelClass(`./${entry.path}`, entry.exportName);
            if (ModelClass) {
                return new ModelClass(enemy, modelGroup);
            }
            // Load failed (e.g. network disconnected / slow) — use default model
            return new DefaultModel(enemy, modelGroup);
        }
        console.warn(`No model registry for enemy type: ${enemy.type}, using default model`);
        return new DefaultModel(enemy, modelGroup);
    }

    /**
     * Dispose shared resources. Called when clearing enemies.
     */
    static disposeSharedResources() {
        // Clear module cache to free memory when changing scenes
        this._moduleCache.clear();
    }
}
