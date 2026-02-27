import * as THREE from '../../../libs/three/three.module.js';
import { Tree } from './Tree.js';
import { Rock } from './Rock.js';
import { Bush } from './Bush.js';
import { Flower } from './Flower.js';
import { TallGrass } from './TallGrass.js';
import { AncientTree } from './AncientTree.js';
import { TreeCluster } from './TreeCluster.js';
import { EnvironmentFactory } from './EnvironmentFactory.js';
import { ENVIRONMENT_OBJECTS } from '../../config/environment.js';
import { getPerformanceProfile } from '../../config/performance-profile.js';

/**
 * Manages environment objects like trees, rocks, bushes, etc.
 * Simplified to focus only on loading environment objects from map data
 */
export class EnvironmentManager {
    constructor(scene, worldManager, game = null, qualityLevel = 'high') {
        this.scene = scene;
        this.worldManager = worldManager;
        this.game = game;
        this.qualityLevel = ['high', 'medium', 'low', 'minimal'].includes(qualityLevel) ? qualityLevel : 'high';
        this.performanceProfile = getPerformanceProfile(this.qualityLevel);
        
        // Initialize the environment factory
        this.environmentFactory = new EnvironmentFactory(scene, worldManager);
        
        // Environment object collections
        this.environmentObjects = []; // Global list of all environment objects
        this.environmentObjectsByChunk = {}; // Objects organized by chunk
        
        // Environment generation settings (quality-aware for low-end tablets)
        const densityMultiplier = this.performanceProfile?.environmentDensity ?? 1.0;
        this.environmentDensity = densityMultiplier;
        this.visibleChunks = {}; // Track which chunks are currently visible
        
        // Get environment object types from factory and add traditional types
        const factoryTypes = this.environmentFactory.getRegisteredTypes ? 
            this.environmentFactory.getRegisteredTypes() : [];
        
        // Get all environment object types from the constants
        const configTypes = Object.values(ENVIRONMENT_OBJECTS);
        
        // Combine both sets of types, removing duplicates
        this.environmentObjectTypes = [...new Set([...configTypes, ...factoryTypes])];
        // Throttle visibility updates: process a slice per frame to avoid 120->80 FPS drop
        this._visibilityUpdateIndex = 0;
        this._visibilityBatchSize = 60;
    }

    /**
     * Initialize the environment manager
     */
    init() {
        console.debug('Environment manager initialized');
    }

    /**
     * Load environment objects from map data
     * @param {Array} environmentData - Array of environment object data from map
     */
    loadFromMapData(environmentData) {
        if (!environmentData || !Array.isArray(environmentData)) {
            console.warn('No environment data provided to load');
            return;
        }

        console.debug(`Loading ${environmentData.length} environment objects from map data`);

        // Clear existing environment objects
        this.clear();

        environmentData.forEach(envData => {
            if (envData.position && envData.type) {
                const object = this.createEnvironmentObject(
                    envData.type, 
                    envData.position.x, 
                    envData.position.z,
                    envData.scale || 1.0
                );

                if (object) {
                    // Apply rotation if specified
                    if (envData.rotation !== undefined) {
                        object.rotation.y = envData.rotation;
                    }
                    
                    // Add to environment objects
                    this.environmentObjects.push({
                        type: envData.type,
                        object: object,
                        position: new THREE.Vector3(
                            envData.position.x, 
                            envData.position.y || 0, 
                            envData.position.z
                        ),
                        scale: envData.scale || 1.0,
                        id: envData.id,
                        groupId: envData.groupId
                    });
                    
                    // Add to type-specific collections for minimap
                    this.addToTypeCollection(envData.type, object);
                }
            }
        });

        console.debug(`Successfully loaded ${this.environmentObjects.length} environment objects`);
    }

    /**
     * Add a chunk of environment objects from map data without clearing (for deferred loading).
     * Call clear() once before the first chunk, then call this with slices of the full array.
     * @param {Array} environmentDataSlice - Slice of environment object data from map
     */
    addEnvironmentFromMapDataChunk(environmentDataSlice) {
        if (!environmentDataSlice || !Array.isArray(environmentDataSlice) || environmentDataSlice.length === 0) return;
        environmentDataSlice.forEach(envData => {
            if (envData.position && envData.type) {
                const object = this.createEnvironmentObject(
                    envData.type,
                    envData.position.x,
                    envData.position.z,
                    envData.scale || 1.0
                );
                if (object) {
                    if (envData.rotation !== undefined) object.rotation.y = envData.rotation;
                    this.environmentObjects.push({
                        type: envData.type,
                        object: object,
                        position: new THREE.Vector3(
                            envData.position.x,
                            envData.position.y || 0,
                            envData.position.z
                        ),
                        scale: envData.scale || 1.0,
                        id: envData.id,
                        groupId: envData.groupId
                    });
                    this.addToTypeCollection(envData.type, object);
                }
            }
        });
    }
    
    /**
     * Add object to the appropriate type-specific collection
     * This method is kept for backward compatibility but no longer stores objects in type-specific arrays
     * @param {string} type - Type of environment object
     * @param {THREE.Object3D} object - The object to add
     */
    addToTypeCollection(type, object) {
        // No-op - we no longer track objects by type in separate arrays
        // All objects are stored in the main environmentObjects array with their type
    }
    
    /**
     * Create an environment object using the factory
     * @param {string} type - Type of environment object
     * @param {number} x - X coordinate
     * @param {number} z - Z coordinate
     * @param {number|object} scaleOrOptions - Scale factor or options object {size, variant, glow, canCluster}
     * @returns {THREE.Object3D} - The created object
     */
    createEnvironmentObject(type, x, z, scaleOrOptions = 1.0) {
        // Handle backward compatibility and validate input
        let scale = 1.0;
        let options = {};
        
        if (typeof scaleOrOptions === 'number') {
            scale = isFinite(scaleOrOptions) && scaleOrOptions > 0 ? scaleOrOptions : 1.0;
        } else if (typeof scaleOrOptions === 'object' && scaleOrOptions !== null) {
            scale = scaleOrOptions.size || 1.0;
            scale = isFinite(scale) && scale > 0 ? scale : 1.0;
            options = scaleOrOptions;
        }
        
        // Validate coordinates
        if (!isFinite(x) || !isFinite(z)) {
            console.warn(`Invalid coordinates for environment object: x=${x}, z=${z}`);
            return null;
        }
        console.debug(`🌳 EnvironmentManager: Creating ${type} at (${x.toFixed(1)}, ${z.toFixed(1)}) with options:`, { scale, ...options });
        
        let object = null;
        
        // Check if type is valid
        if (!type) {
            console.warn('Invalid environment object type: undefined or null');
            return null;
        }
        
        // Use the terrain height at this position
        const y = this.worldManager.terrainManager ? this.worldManager.terrainManager.getHeightAt(x, z) : 0;
        
        // Create a position object with the correct terrain height
        const position = new THREE.Vector3(x, y, z);
        
        try {
            // Special handling for tree_cluster
            if (type === ENVIRONMENT_OBJECTS.TREE_CLUSTER) {
                // Create a data object for the tree cluster
                const clusterData = {
                    position: { x, y, z },
                    centerPosition: { x, y, z },
                    // For a single tree cluster, we'll just use the position as the only tree
                    positions: [{ x, y, z }],
                    options: {
                        minSize: scale * 0.8,
                        maxSize: scale * 1.2
                    }
                };
                
                // Create the tree cluster using the factory
                object = this.environmentFactory.create(type, position, scale, clusterData);
            }
            // Try to create the object using the factory first
            else if (this.environmentFactory.canCreate(type)) {
                object = this.environmentFactory.create(type, position, scale);
            } else {
                // Fall back to direct creation for traditional types
                switch (type) {
                    case ENVIRONMENT_OBJECTS.TREE:
                        const tree = new Tree('Forest'); // Pass zone type
                        object = tree.createMesh();
                        break;
                    case ENVIRONMENT_OBJECTS.ROCK:
                        const rock = new Rock('Forest'); // Pass zone type
                        object = rock.createMesh();
                        break;
                    case ENVIRONMENT_OBJECTS.BUSH:
                        const bush = new Bush();
                        object = bush.createMesh();
                        break;
                    case ENVIRONMENT_OBJECTS.FLOWER:
                        const flower = new Flower();
                        object = flower.createMesh();
                        break;
                    case ENVIRONMENT_OBJECTS.TALL_GRASS:
                        // Fallback to bush for now
                        const tallGrass = new Bush();
                        object = tallGrass.createMesh();
                        object.scale.multiplyScalar(0.5); // Make it smaller like grass
                        break;
                    case ENVIRONMENT_OBJECTS.ANCIENT_TREE:
                        // Fallback to regular tree but bigger
                        const ancientTree = new Tree();
                        object = ancientTree.createMesh();
                        object.scale.multiplyScalar(1.5); // Make it bigger
                        break;
                    case ENVIRONMENT_OBJECTS.SMALL_PLANT:
                        // Fallback to small flower
                        const smallPlant = new Flower();
                        object = smallPlant.createMesh();
                        object.scale.multiplyScalar(0.7); // Make it smaller
                        break;
                    default:
                        console.warn(`Unknown environment object type: ${type}, creating fallback rock`);
                        // Create a fallback rock as default
                        const fallbackRock = new Rock();
                        object = fallbackRock.createMesh();
                        break;
                }
            }
        } catch (error) {
            console.error(`Error creating environment object of type ${type}:`, error);
            return null;
        }
        
        if (object) {
            // Position the object on the terrain (only for traditional objects)
            // Factory-created objects already have their position set
            if (!this.environmentFactory.canCreate(type)) {
                object.position.set(x, y, z);
            }
            
            // Apply scale (only if not already applied by factory)
            if (!this.environmentFactory.canCreate(type)) {
                object.scale.set(scale, scale, scale);
            }
            
            // Apply LOD if available and LOD enabled for this quality level (disabled on minimal)
            const skipLodTypes = [
                ENVIRONMENT_OBJECTS.FLOWER, 
                ENVIRONMENT_OBJECTS.TALL_GRASS, 
                ENVIRONMENT_OBJECTS.SMALL_MUSHROOM, 
                ENVIRONMENT_OBJECTS.SMALL_PLANT
            ];
            const lodEnabled = this.performanceProfile?.lodEnabled !== false;
            if (lodEnabled && this.worldManager.lodManager && !skipLodTypes.includes(type) && scale > 0.5) {
                object = this.worldManager.lodManager.applyLOD(object, type, position);
            }
            
            // Add to world group for origin rebasing (only if not already added by factory)
            if (object.parent === null) {
                (this.game?.getWorldGroup?.() || this.scene).add(object);
                console.debug(`🌳 EnvironmentManager: Added ${type} to scene at (${x.toFixed(1)}, ${y.toFixed(1)}, ${z.toFixed(1)})`);
            } else {
                console.debug(`🌳 EnvironmentManager: ${type} already had parent, not adding to scene`);
            }
            
            console.debug(`🌳 EnvironmentManager: Successfully created ${type} object`, object);
        } else {
            console.warn(`🌳 EnvironmentManager: Failed to create ${type} object`);
        }
        
        return object;
    }
    
    /**
     * Clear all environment objects
     */
    clear() {
        // Remove all environment objects from the scene
        this.environmentObjects.forEach(info => {
            if (info.object && info.object.parent) {
                this.scene.remove(info.object);
            }
            
            // Dispose of geometries and materials to free memory
            if (info.object) {
                if (info.object.traverse) {
                    info.object.traverse(obj => {
                        if (obj.geometry) {
                            obj.geometry.dispose();
                        }
                        if (obj.material) {
                            if (Array.isArray(obj.material)) {
                                obj.material.forEach(mat => mat.dispose());
                            } else {
                                obj.material.dispose();
                            }
                        }
                    });
                }
            }
        });
        
        // Reset environment collections
        this.environmentObjects = [];
        this.trees = [];
        this.rocks = [];
        this.bushes = [];
        this.flowers = [];
        this.tallGrass = [];
        this.ancientTrees = [];
        this.smallPlants = [];
        this.fallenLogs = [];
        this.mushrooms = [];
        this.rockFormations = [];
        this.shrines = [];
        this.stumps = [];
        this.waterfalls = [];
        this.crystalFormations = [];
        this.mosses = [];
        
        console.debug("All environment objects cleared");
    }
    
    // Save and load methods have been removed as they are no longer needed
    // World is generated in-memory and not saved/loaded
    
    /**
     * Remove environment objects for a specific chunk
     * @param {string} chunkKey - The chunk key
     * @param {boolean} disposeResources - Whether to dispose of geometries and materials
     */
    removeChunkObjects(chunkKey, disposeResources = false) {
        // Remove environment objects from scene
        if (this.environmentObjectsByChunk[chunkKey]) {
            this.environmentObjectsByChunk[chunkKey].forEach(item => {
                if (item.object) {
                    // Remove from scene if it's in the scene
                    if (item.object.parent) {
                        this.scene.remove(item.object);
                    }
                    
                    // Remove from global tracking array
                    const index = this.environmentObjects.findIndex(obj => obj.object === item.object);
                    if (index !== -1) {
                        this.environmentObjects.splice(index, 1);
                    }
                    
                    // Remove from type-specific collections
                    this.removeFromTypeCollections(item.object);
                    
                    // Dispose of geometries and materials if requested
                    if (disposeResources) {
                        if (item.object.geometry) {
                            item.object.geometry.dispose();
                        }
                        
                        if (item.object.material) {
                            // Handle both single materials and material arrays
                            if (Array.isArray(item.object.material)) {
                                item.object.material.forEach(material => {
                                    if (material.map) material.map.dispose();
                                    material.dispose();
                                });
                            } else {
                                if (item.object.material.map) item.object.material.map.dispose();
                                item.object.material.dispose();
                            }
                        }
                        
                        // Handle child objects if any
                        if (item.object.children && item.object.children.length > 0) {
                            item.object.children.forEach(child => {
                                if (child.geometry) child.geometry.dispose();
                                if (child.material) {
                                    if (Array.isArray(child.material)) {
                                        child.material.forEach(material => {
                                            if (material.map) material.map.dispose();
                                            material.dispose();
                                        });
                                    } else {
                                        if (child.material.map) child.material.map.dispose();
                                        child.material.dispose();
                                    }
                                }
                            });
                        }
                    }
                }
            });
            
            // If disposing resources, remove the chunk data completely
            if (disposeResources) {
                delete this.environmentObjectsByChunk[chunkKey];
                console.debug(`Disposed environment objects for chunk ${chunkKey}`);
            }
        }
        
        // Remove the chunk from the visible chunks
        delete this.visibleChunks[chunkKey];
    }
    
    /**
     * Remove an object from all type-specific collections
     * This method is kept for backward compatibility but no longer does anything
     * @param {THREE.Object3D} object - The object to remove
     */
    removeFromTypeCollections(object) {
        // No-op - we no longer track objects by type in separate arrays
    }
    
    /**
     * Load environment objects for a chunk from saved data
     * @param {number} chunkX - X chunk coordinate
     * @param {number} chunkZ - Z chunk coordinate
     * @param {Array} environmentObjects - Array of environment object data
     */
    loadEnvironmentObjectsForChunk(chunkX, chunkZ, environmentObjects) {
        const chunkKey = `${chunkX},${chunkZ}`;
        
        // Skip if already loaded
        if (this.environmentObjects[chunkKey]) {
            return;
        }
        
        // Create objects from saved data
        const objects = [];
        
        for (const objData of environmentObjects) {
            // Create the object based on saved type and position
            let object;
            const x = objData.position.x;
            const z = objData.position.z;
            const size = objData.size || 1;
            
            // Create the object using the factory
            object = this.createEnvironmentObject(objData.type, x, z, size, objData.data);
            
            if (object) {
                // Store object with its type and position for persistence
                objects.push({
                    type: objData.type,
                    object: object,
                    position: new THREE.Vector3(x, this.worldManager.terrainManager ? this.worldManager.terrainManager.getHeightAt(x, z) : 0, z)
                });
            }
        }
        
        // Store environment objects for this chunk
        this.environmentObjects[chunkKey] = objects;
    }
    
    /**
     * Get the zone type at a specific position
     * @param {number} x - X coordinate
     * @param {number} z - Z coordinate
     * @returns {string} - The zone type (Forest, Desert, etc.)
     */
    getZoneTypeAt(x, z) {
        // Use the world manager to get the zone at this position
        if (this.worldManager && this.worldManager.getZoneAt) {
            const position = new THREE.Vector3(x, 0, z);
            const zone = this.worldManager.getZoneAt(position);
            if (zone) {
                return zone.name;
            }
        }
        
        // Default to Forest if no zone found
        return 'Forest';
    }
    
    /**
     * Create an environment object using the factory
     * @param {string} type - The type of environment object to create
     * @param {number} x - X coordinate
     * @param {number} z - Z coordinate
     * @param {number} size - Size of the object (optional)
     * @param {boolean} offscreenCreation - Whether this is being created offscreen (don't add to scene yet)
     * @param {Object} data - Additional data for complex objects (optional)
     * @returns {THREE.Object3D} - The created environment object
     */
    createEnvironmentObject(type, x, z, size = 1, offscreenCreation = false, data = null) {
        // Create position object with terrain height
        const position = new THREE.Vector3(
            x, 
            this.worldManager.terrainManager ? this.worldManager.terrainManager.getHeightAt(x, z) : 0, 
            z
        );
        
        // Check if the factory supports this type
        if (!this.environmentFactory.hasType(type)) {
            console.warn(`Environment type ${type} not registered in factory`);
            return null;
        }
        
        // Create the object using the factory
        const object = this.environmentFactory.create(type, position, size, data);
        
        if (object) {
            // If this is an offscreen creation, don't add to tracking arrays or scene
            if (offscreenCreation) {
                // Just set the position and return the object
                object.position.copy(position);
                return object;
            }
            
            // We no longer track objects in type-specific arrays
            
            return object;
        }
        
        return null;
    }
    
    // The getTrackingArrayName method has been removed as we no longer track objects in type-specific arrays

    /**
     * Update environment objects based on player position
     * Uses player "space" radius when given so env matches terrain/structures (zone-agnostic bubble)
     * @param {THREE.Vector3} playerPosition - The player's current position
     * @param {number} drawDistanceMultiplier - Multiplier for draw distance (0.0 to 1.0)
     * @param {number} [spaceRadius] - Chunk radius of player space; if set, only chunks within this are kept
     */
    updateForPlayer(playerPosition, drawDistanceMultiplier = 1.0, spaceRadius = null) {
        if (!playerPosition) return;
        const chunkSize = this.worldManager.terrainManager.terrainChunkSize || 64;
        const playerChunkX = Math.floor(playerPosition.x / chunkSize);
        const playerChunkZ = Math.floor(playerPosition.z / chunkSize);
        const effectiveViewDistance = spaceRadius != null
            ? spaceRadius
            : Math.max(2, Math.floor(5 * drawDistanceMultiplier));
        
        const currentChunks = new Set();
        for (let x = playerChunkX - effectiveViewDistance; x <= playerChunkX + effectiveViewDistance; x++) {
            for (let z = playerChunkZ - effectiveViewDistance; z <= playerChunkZ + effectiveViewDistance; z++) {
                currentChunks.add(`${x},${z}`);
            }
        }
        
        const chunksToRemove = [];
        for (const chunkKey in this.visibleChunks) {
            if (!currentChunks.has(chunkKey)) chunksToRemove.push(chunkKey);
        }
        chunksToRemove.forEach(chunkKey => this.removeChunkObjects(chunkKey, true));
        currentChunks.forEach(k => { this.visibleChunks[k] = true; });
        
        this.updateObjectVisibility(playerPosition, drawDistanceMultiplier);
    }
    
    /**
     * Update visibility of environment objects based on player distance
     * @param {THREE.Vector3} playerPosition - The player's current position
     * @param {number} drawDistanceMultiplier - Multiplier for draw distance
     */
    updateObjectVisibility(playerPosition, drawDistanceMultiplier = 1.0) {
        const total = this.environmentObjects.length;
        if (total === 0) return;
        const maxDistance = 100 * drawDistanceMultiplier;
        const maxDistanceSquared = maxDistance * maxDistance;
        const batch = this._visibilityBatchSize;
        const start = this._visibilityUpdateIndex % total;
        this._visibilityUpdateIndex = (start + batch) % total;
        for (let i = 0; i < batch; i++) {
            const idx = (start + i) % total;
            const envObj = this.environmentObjects[idx];
            if (!envObj?.object || !envObj?.position) continue;
            const distanceSquared = playerPosition.distanceToSquared(envObj.position);
            const shouldBeVisible = distanceSquared <= maxDistanceSquared;
            if (envObj.object.visible !== shouldBeVisible) {
                envObj.object.visible = shouldBeVisible;
            }
        }
    }

    /**
     * Set the density of environment objects
     * @param {number} density - Density factor (0.0 to 1.0)
     */
    setDensity(density) {
        // Clamp density between 0 and 1
        this.environmentDensity = Math.max(0, Math.min(1, density));
        console.debug(`Environment density set to ${this.environmentDensity}`);
    }
    
    /**
     * Generate environment objects for a chunk
     * @param {number} chunkX - Chunk X coordinate
     * @param {number} chunkZ - Chunk Z coordinate
     * @param {string|boolean} zoneType - Type of zone (Forest, Desert, etc.) or boolean flag for data-only generation
     * @param {object} zoneDensity - Density configuration for the zone
     */
    generateEnvironmentForChunk(chunkX, chunkZ, zoneType, zoneDensity) {
        // Handle the case when zoneType is a boolean (data-only flag)
        const dataOnly = typeof zoneType === 'boolean' ? zoneType : false;
        
        // If zoneType is not provided or is a boolean, get it from world coords
        if (!zoneType || typeof zoneType === 'boolean') {
            const chunkSize = this.worldManager.terrainManager.terrainChunkSize;
            const worldX = chunkX * chunkSize + chunkSize / 2;
            const worldZ = chunkZ * chunkSize + chunkSize / 2;
            zoneType = this.worldManager?.getZoneTypeAt?.(worldX, worldZ) ?? 'Terrant';
            
            // Get zone density from the world manager
            if (this.worldManager && this.worldManager.zoneDensities) {
                zoneDensity = this.worldManager.zoneDensities[zoneType];
            }
        }
        
        // Use default zone density if none is provided
        if (!zoneDensity) {
            zoneDensity = {
                environment: 1.0,
                environmentTypes: ['tree', 'rock', 'bush', 'flower']
            };
            console.debug(`Using default zone density for zone type: ${zoneType}`);
        }
        
        // Calculate world coordinates for this chunk
        const chunkSize = this.worldManager.terrainManager.terrainChunkSize;
        const worldX = chunkX * chunkSize;
        const worldZ = chunkZ * chunkSize;
        
        // Create a unique key for this chunk
        const chunkKey = `${chunkX},${chunkZ}`;
        
        // Skip if we've already generated objects for this chunk
        if (this.environmentObjectsByChunk[chunkKey]) {
            console.warn(`⚠️ DUPLICATE PREVENTION: Environment objects already exist for chunk ${chunkKey}, skipping generation`);
            console.trace('Environment generation call stack:');
            return;
        }
        
        // If this is a data-only call, just mark the chunk as processed and return
        if (dataOnly) {
            this.environmentObjectsByChunk[chunkKey] = [];
            return;
        }
        
        
        // Initialize array for this chunk
        this.environmentObjectsByChunk[chunkKey] = [];
        
        // Get environment types for this zone
        const environmentTypes = zoneDensity.environmentTypes || [];
        if (environmentTypes.length === 0) {
            console.warn(`No environment types defined for zone: ${zoneType}`);
            return;
        }
        
        // Calculate number of objects to create (quality-aware for low-end tablets)
        const baseCount = 10;
        const densityFactor = zoneDensity.environment || 1.0;
        const count = Math.max(1, Math.floor(baseCount * densityFactor * this.environmentDensity * this.worldManager.worldScale));
        
        // Generate random environment objects
        for (let i = 0; i < count; i++) {
            // Choose a random position within the chunk
            const offsetX = Math.random() * chunkSize;
            const offsetZ = Math.random() * chunkSize;
            const x = worldX + offsetX;
            const z = worldZ + offsetZ;
            
            // Choose a random environment type for this zone
            const typeIndex = Math.floor(Math.random() * environmentTypes.length);
            const type = environmentTypes[typeIndex];
            
            // Random scale variation
            const scale = 0.7 + Math.random() * 0.6;
            
            // Create the environment object
            const object = this.createEnvironmentObject(type, x, z, scale);
            
            if (object) {
                // Create object info
                const objectInfo = {
                    type: type,
                    object: object,
                    position: new THREE.Vector3(x, this.worldManager.terrainManager ? this.worldManager.terrainManager.getHeightAt(x, z) : 0, z),
                    scale: scale,
                    chunkKey: chunkKey
                };
                
                // Add to environment objects for this chunk
                this.environmentObjectsByChunk[chunkKey].push(objectInfo);
                
                // Add to global environment objects array for tracking
                this.environmentObjects.push(objectInfo);
                
                // Add to type-specific collections for minimap
                this.addToTypeCollection(type, object);
            }
        }
        
        console.debug(`🌳 Created ${this.environmentObjectsByChunk[chunkKey].length} env objects for ${chunkKey}`);
    }
    
    /**
     * Generate environment object at a specific position - ADDED FOR SAMPLE COMPATIBILITY
     * @param {THREE.Vector3} position - Position to generate environment object at
     */
    generateEnvironmentAtPosition(position) {
        // Simple environment generation for random world generation
        const environmentTypes = ['tree', 'rock', 'bush', 'flower'];
        const randomType = environmentTypes[Math.floor(Math.random() * environmentTypes.length)];
        
        // Random scale variation
        const scale = 0.7 + Math.random() * 0.6;
        
        // Create the environment object
        const object = this.createEnvironmentObject(randomType, position.x, position.z, scale);
        
        if (object) {
            // Create object info
            const objectInfo = {
                type: randomType,
                object: object,
                position: position.clone(),
                scale: scale,
                id: `random_${Date.now()}_${Math.random()}`
            };
            
            // Add to global environment objects array
            this.environmentObjects.push(objectInfo);
            
            // Add to type-specific collections for minimap
            this.addToTypeCollection(randomType, object);
            
            console.debug(`Generated random ${randomType} at (${position.x.toFixed(1)}, ${position.z.toFixed(1)})`);
        }
    }
    
    /**
     * Clean up distant environment objects - ADDED FOR SAMPLE COMPATIBILITY
     * @param {THREE.Vector3} playerPosition - Player position
     * @param {number} maxDistance - Maximum distance to keep objects
     */
    cleanupDistantObjects(playerPosition, maxDistance) {
        const objectsToRemove = [];
        
        // Find objects that are too far away
        this.environmentObjects.forEach((objectInfo, index) => {
            if (objectInfo.position && playerPosition) {
                const dx = objectInfo.position.x - playerPosition.x;
                const dz = objectInfo.position.z - playerPosition.z;
                const distanceSq = dx * dx + dz * dz;
                if (distanceSq > maxDistance * maxDistance) {
                    objectsToRemove.push(index);
                }
            }
        });
        
        // Remove distant objects
        objectsToRemove.reverse().forEach(index => {
            const objectInfo = this.environmentObjects[index];
            
            // Remove from scene
            if (objectInfo.object && objectInfo.object.parent) {
                this.scene.remove(objectInfo.object);
            }
            
            // Dispose of resources
            if (objectInfo.object) {
                if (objectInfo.object.traverse) {
                    objectInfo.object.traverse(obj => {
                        if (obj.geometry) obj.geometry.dispose();
                        if (obj.material) {
                            if (Array.isArray(obj.material)) {
                                obj.material.forEach(mat => mat.dispose());
                            } else {
                                obj.material.dispose();
                            }
                        }
                    });
                }
            }
            
            // Remove from array
            this.environmentObjects.splice(index, 1);
        });
        
        // Also clean up from chunk-based collections
        for (const chunkKey in this.environmentObjectsByChunk) {
            const chunkObjects = this.environmentObjectsByChunk[chunkKey];
            const chunkObjectsToRemove = [];
            
            const maxDistSq = maxDistance * maxDistance;
            chunkObjects.forEach((objectInfo, index) => {
                if (objectInfo.position && playerPosition) {
                    const dx = objectInfo.position.x - playerPosition.x;
                    const dz = objectInfo.position.z - playerPosition.z;
                    if ((dx * dx + dz * dz) > maxDistSq) {
                        chunkObjectsToRemove.push(index);
                    }
                }
            });
            
            // Remove distant objects from chunk
            chunkObjectsToRemove.reverse().forEach(index => {
                chunkObjects.splice(index, 1);
            });
            
            // Remove empty chunks
            if (chunkObjects.length === 0) {
                delete this.environmentObjectsByChunk[chunkKey];
            }
        }
        
        if (objectsToRemove.length > 0) {
            console.debug(`Cleaned up ${objectsToRemove.length} distant environment objects`);
        }
    }
    
    /**
     * Clear all environment objects
     */
    clear() {
        // Remove all environment objects from the scene
        this.environmentObjects.forEach(item => {
            if (item.object && item.object.parent) {
                this.scene.remove(item.object);
            }
        });
        
        // Reset collections
        this.environmentObjects = [];
        this.environmentObjectsByChunk = {};
        this.visibleChunks = {};
        
        console.debug("All environment objects cleared");
    }
}