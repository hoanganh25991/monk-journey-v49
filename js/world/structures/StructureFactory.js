import * as THREE from '../../../libs/three/three.module.js';

// Import structure configuration
import { STRUCTURE_OBJECTS, STRUCTURE_PROPERTIES } from '../../config/structure.js';

// Import structure classes
import { Building } from './Building.js';
import { Tower } from './Tower.js';
import { Ruins } from './Ruins.js';
import { DarkSanctum } from './DarkSanctum.js';
import { Mountain } from './Mountain.js';
import { Bridge } from './Bridge.js';
import { Village } from './Village.js';
import { Cave } from './Cave.js';

/**
 * Structure Factory - Creates structure objects based on type
 * Centralizes structure object creation and provides a registry for all types
 */
export class StructureFactory {
    constructor(scene, worldManager, game = null) {
        this.scene = scene;
        this.worldManager = worldManager;
        this.game = game;
        this.registry = new Map();
        
        // Register all structure creators
        this.registerStructures();
    }
    
    /**
     * Get terrain height at position
     * @param {number} x - X coordinate
     * @param {number} z - Z coordinate
     * @returns {number} - Height at position
     */
    getTerrainHeight(x, z) {
        if (this.worldManager && this.worldManager.terrainManager) {
            return this.worldManager.terrainManager.getHeightAt(x, z);
        }
        return 0;
    }
    
    /**
     * Get the zone type at the specified position
     * @param {number} x - X coordinate
     * @param {number} z - Z coordinate
     * @returns {string} - The zone type
     */
    getZoneTypeAt(x, z) {
        return this.worldManager?.getZoneTypeAt?.(x, z) ?? 'Terrant';
    }
    
    /**
     * Register all structure creators
     */
    registerStructures() {
        // Register building structures
        this.register(STRUCTURE_OBJECTS.HOUSE, (x, z, width = 5, depth = 5, height = 3, style = 'house') => {
            const zoneType = this.getZoneTypeAt(x, z);
            const building = new Building(zoneType, width, depth, height, style);
            const buildingGroup = building.createMesh();
            
            // Position building on terrain
            buildingGroup.position.set(x, this.getTerrainHeight(x, z), z);
            
            // Add to scene
            (this.game?.getWorldGroup?.() || this.scene).add(buildingGroup);
            
            return buildingGroup;
        });
        
        // Register tower structures
        this.register(STRUCTURE_OBJECTS.TOWER, (x, z) => {
            const zoneType = this.getZoneTypeAt(x, z);
            const tower = new Tower(zoneType);
            const towerGroup = tower.createMesh();
            
            // Position tower on terrain
            towerGroup.position.set(x, this.getTerrainHeight(x, z), z);
            
            // Add to scene
            (this.game?.getWorldGroup?.() || this.scene).add(towerGroup);
            
            return towerGroup;
        });
        
        // Register ruins structures
        this.register(STRUCTURE_OBJECTS.RUINS, (x, z) => {
            const ruins = new Ruins();
            const ruinsGroup = ruins.createMesh();
            
            // Position ruins on terrain
            ruinsGroup.position.set(x, this.getTerrainHeight(x, z), z);
            
            // Add to scene
            (this.game?.getWorldGroup?.() || this.scene).add(ruinsGroup);
            
            return ruinsGroup;
        });
        
        // Register dark sanctum structures
        this.register(STRUCTURE_OBJECTS.DARK_SANCTUM, (x, z) => {
            const darkSanctum = new DarkSanctum();
            const sanctumGroup = darkSanctum.createMesh();
            
            // Position sanctum on terrain
            sanctumGroup.position.set(x, this.getTerrainHeight(x, z), z);
            
            // Add to scene
            (this.game?.getWorldGroup?.() || this.scene).add(sanctumGroup);
            
            // Add a boss spawn point
            if (this.worldManager && this.worldManager.interactiveManager) {
                this.worldManager.interactiveManager.createBossSpawnPoint(x, z, 'necromancer_lord');
            }
            
            return sanctumGroup;
        });
        
        // Register mountain structures
        this.register(STRUCTURE_OBJECTS.MOUNTAIN, (x, z, scale = 1) => {
            const zoneType = this.getZoneTypeAt(x, z);
            const mountain = new Mountain(zoneType);
            const mountainGroup = mountain.createMesh();
            
            // Apply scale factor for natural variation
            if (scale !== 1.0) {
                mountainGroup.scale.set(scale, scale * 0.8, scale);
            }
            
            // Add some random rotation for natural look
            mountainGroup.rotation.y = Math.random() * Math.PI * 2;
            
            // Position mountain on terrain
            mountainGroup.position.set(x, this.getTerrainHeight(x, z), z);
            
            // Add to scene
            (this.game?.getWorldGroup?.() || this.scene).add(mountainGroup);
            
            return mountainGroup;
        });
        
        // Register bridge structures - height-aware for slopes (one end low, one end high)
        this.register(STRUCTURE_OBJECTS.BRIDGE, (x, z, rotationY = null) => {
            const zoneType = this.getZoneTypeAt(x, z);
            const bridge = new Bridge(zoneType);
            const bridgeGroup = bridge.createMesh();
            const length = bridge.options.length;
            
            // Use provided rotation (from map) or random for procedural placement
            const rotY = rotationY !== null && rotationY !== undefined
                ? rotationY
                : Math.random() * Math.PI;
            bridgeGroup.rotation.y = rotY;
            
            // Bridge extends along local Z; in world, direction = (sin(rot), 0, cos(rot))
            const halfLen = length / 2;
            const startX = x - halfLen * Math.sin(rotY);
            const startZ = z - halfLen * Math.cos(rotY);
            const endX = x + halfLen * Math.sin(rotY);
            const endZ = z + halfLen * Math.cos(rotY);
            
            const startHeight = this.getTerrainHeight(startX, startZ);
            const endHeight = this.getTerrainHeight(endX, endZ);
            const avgHeight = (startHeight + endHeight) / 2;
            
            // Tilt bridge to match slope (rotation.x = pitch)
            const heightDiff = endHeight - startHeight;
            const tiltAngle = Math.atan2(heightDiff, length);
            bridgeGroup.rotation.x = -tiltAngle;
            
            bridgeGroup.position.set(x, avgHeight, z);
            
            // Add to scene
            (this.game?.getWorldGroup?.() || this.scene).add(bridgeGroup);
            
            return bridgeGroup;
        });
        
        // Register village structures
        this.register(STRUCTURE_OBJECTS.VILLAGE, (x, z, options = {}) => {
            const zoneType = this.getZoneTypeAt(x, z);
            const village = new Village(zoneType, options);
            const villageGroup = village.createMesh();
            
            // Position village on terrain
            villageGroup.position.set(x, this.getTerrainHeight(x, z), z);
            
            // Add to scene
            (this.game?.getWorldGroup?.() || this.scene).add(villageGroup);
            
            // Add interactive objects like NPCs and treasure chests (no deprecated quest marker — quests use chapter/UI system)
            if (this.worldManager && this.worldManager.interactiveManager) {
                // Add a treasure chest
                const chestX = x + (Math.random() * 10 - 5);
                const chestZ = z + (Math.random() * 10 - 5);
                this.worldManager.interactiveManager.createTreasureChest(chestX, chestZ);
            }
            
            return villageGroup;
        });
        
        // Register building variants as building types with different styles
        this.register(STRUCTURE_OBJECTS.TAVERN, (x, z) => {
            const props = STRUCTURE_PROPERTIES[STRUCTURE_OBJECTS.TAVERN];
            const zoneType = this.getZoneTypeAt(x, z);
            const building = new Building(zoneType, props.width, props.depth, props.height, 'tavern');
            const buildingGroup = building.createMesh();
            
            // Position building on terrain
            buildingGroup.position.set(x, this.getTerrainHeight(x, z), z);
            
            // Add to scene
            (this.game?.getWorldGroup?.() || this.scene).add(buildingGroup);
            
            return buildingGroup;
        });
        
        this.register(STRUCTURE_OBJECTS.TEMPLE, (x, z) => {
            const props = STRUCTURE_PROPERTIES[STRUCTURE_OBJECTS.TEMPLE];
            const zoneType = this.getZoneTypeAt(x, z);
            const building = new Building(zoneType, props.width, props.depth, props.height, 'temple');
            const buildingGroup = building.createMesh();
            
            // Position building on terrain
            buildingGroup.position.set(x, this.getTerrainHeight(x, z), z);
            
            // Add to scene
            (this.game?.getWorldGroup?.() || this.scene).add(buildingGroup);
            
            return buildingGroup;
        });
        
        this.register(STRUCTURE_OBJECTS.SHOP, (x, z) => {
            const props = STRUCTURE_PROPERTIES[STRUCTURE_OBJECTS.SHOP];
            const zoneType = this.getZoneTypeAt(x, z);
            const building = new Building(zoneType, props.width, props.depth, props.height, 'shop');
            const buildingGroup = building.createMesh();
            
            // Position building on terrain
            buildingGroup.position.set(x, this.getTerrainHeight(x, z), z);
            
            // Add to scene
            (this.game?.getWorldGroup?.() || this.scene).add(buildingGroup);
            
            return buildingGroup;
        });
        
        this.register(STRUCTURE_OBJECTS.FORTRESS, (x, z) => {
            const props = STRUCTURE_PROPERTIES[STRUCTURE_OBJECTS.FORTRESS];
            const zoneType = this.getZoneTypeAt(x, z);
            const building = new Building(zoneType, props.width, props.depth, props.height, 'fortress');
            const buildingGroup = building.createMesh();
            
            // Position building on terrain
            buildingGroup.position.set(x, this.getTerrainHeight(x, z), z);
            
            // Add to scene
            (this.game?.getWorldGroup?.() || this.scene).add(buildingGroup);
            
            return buildingGroup;
        });
        
        this.register(STRUCTURE_OBJECTS.ALTAR, (x, z) => {
            const props = STRUCTURE_PROPERTIES[STRUCTURE_OBJECTS.ALTAR];
            const zoneType = this.getZoneTypeAt(x, z);
            const building = new Building(zoneType, props.width, props.depth, props.height, 'altar');
            const buildingGroup = building.createMesh();
            
            // Position building on terrain
            buildingGroup.position.set(x, this.getTerrainHeight(x, z), z);
            
            // Add to scene
            (this.game?.getWorldGroup?.() || this.scene).add(buildingGroup);
            
            return buildingGroup;
        });
        
        // Register cave structures (enemy spawn hubs, zone-specific appearance)
        this.register(STRUCTURE_OBJECTS.CAVE, (x, z) => {
            const zoneType = this.getZoneTypeAt(x, z);
            const cave = new Cave(zoneType);
            const caveGroup = cave.createMesh();
            
            // Position cave on terrain
            caveGroup.position.set(x, this.getTerrainHeight(x, z), z);
            
            // Add to scene
            (this.game?.getWorldGroup?.() || this.scene).add(caveGroup);
            
            return caveGroup;
        });

        // Village fence segment (simple post + rail); rotationY orients segment along perimeter
        this.register(STRUCTURE_OBJECTS.VILLAGE_FENCE, (x, z, rotationY = 0) => {
            const group = new THREE.Group();
            const y = this.getTerrainHeight(x, z);
            const woodColor = 0x8B7355;
            const mat = new THREE.MeshLambertMaterial({ color: woodColor });
            const postGeo = new THREE.BoxGeometry(0.4, 1.8, 0.4);
            const post = new THREE.Mesh(postGeo, mat);
            post.position.set(0, 0.9, 0);
            post.castShadow = true;
            group.add(post);
            const railGeo = new THREE.BoxGeometry(1.6, 0.2, 0.2);
            const rail = new THREE.Mesh(railGeo, mat);
            rail.position.set(0, 1.7, 0);
            rail.castShadow = true;
            group.add(rail);
            group.rotation.y = rotationY;
            group.position.set(x, y, z);
            (this.game?.getWorldGroup?.() || this.scene).add(group);
            return group;
        });

        // Village fence run: dynamic loop of posts + continuous horizontal rail(s) connecting them
        this.register(STRUCTURE_OBJECTS.VILLAGE_FENCE_RUN, (params) => {
            const { positions, rotation: rotationY = 0 } = params;
            if (!positions || positions.length === 0) return null;
            const group = new THREE.Group();
            const woodColor = 0x8B7355;
            const mat = new THREE.MeshLambertMaterial({ color: woodColor });
            const postGeo = new THREE.BoxGeometry(0.4, 1.8, 0.4);
            const first = positions[0];
            const firstY = this.getTerrainHeight(first.x, first.z);
            group.position.set(first.x, firstY, first.z);
            group.rotation.y = rotationY;
            // Build posts in local space (relative to first position)
            const localPoints = [];
            for (let i = 0; i < positions.length; i++) {
                const p = positions[i];
                const py = this.getTerrainHeight(p.x, p.z);
                const lx = p.x - first.x;
                const lz = p.z - first.z;
                localPoints.push({ x: lx, y: py - firstY, z: lz });
                const post = new THREE.Mesh(postGeo, mat);
                post.position.set(lx, 0.9 + (py - firstY), lz);
                post.castShadow = true;
                group.add(post);
            }
            // Rail segments between consecutive posts so the rail follows terrain height
            for (let i = 0; i < localPoints.length - 1; i++) {
                const a = localPoints[i];
                const b = localPoints[i + 1];
                const dx = b.x - a.x;
                const dz = b.z - a.z;
                const length = Math.sqrt(dx * dx + dz * dz) || 1;
                const railGeo = new THREE.BoxGeometry(length, 0.2, 0.2);
                const rail = new THREE.Mesh(railGeo, mat);
                rail.position.set((a.x + b.x) / 2, 1.7 + (a.y + b.y) / 2, (a.z + b.z) / 2);
                rail.rotation.y = Math.atan2(dz, dx);
                rail.castShadow = true;
                group.add(rail);
            }
            (this.game?.getWorldGroup?.() || this.scene).add(group);
            return group;
        });

        // Village gate — monk/temple theme: three openings, layered beams, stone base, roof
        this.register(STRUCTURE_OBJECTS.VILLAGE_GATE, (x, z, rotationY = 0) => {
            const group = new THREE.Group();
            const y = this.getTerrainHeight(x, z);

            // Scale: gate 3x — ~18 wide, ~19.5 tall; fence gap must match HOME_VILLAGE_GATE_GAP_HALF_EXTENT (9)
            const S = 3;          // scale factor (3x)
            const W = 3 * S;      // half-width (total span 18)
            const H_CENTRAL = 5 * S;
            const H_SIDE = 3 * S;
            const D = 0.8 * S;

            // Materials — monk/temple palette
            const woodDark = 0x4A3728;
            const woodMain = 0x5C4033;
            const stoneColor = 0x5A5A5A;
            const accentGold = 0xB8860B;
            const roofColor = 0x3D2817;
            const matWood = new THREE.MeshLambertMaterial({ color: woodMain });
            const matWoodDark = new THREE.MeshLambertMaterial({ color: woodDark });
            const matStone = new THREE.MeshLambertMaterial({ color: stoneColor });
            const matAccent = new THREE.MeshLambertMaterial({ color: accentGold });
            const matRoof = new THREE.MeshLambertMaterial({ color: roofColor });

            const addBox = (g, w, h, d, mat, px, py, pz) => {
                const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
                mesh.position.set(px, py, pz);
                mesh.castShadow = true;
                g.add(mesh);
            };

            // —— Stone base (platform under entire gate)
            const baseW = W * 2.4, baseD = D * 2.5, baseH = 0.35 * S;
            addBox(group, baseW, baseH, baseD, matStone, 0, baseH / 2, 0);

            // —— Five pillars: left outer, left inner, center, right inner, right outer
            const pillarW = 0.5 * S, pillarD = 0.5 * S;
            const positions = [-W, -W * 0.5, 0, W * 0.5, W];
            const heights = [H_SIDE, H_CENTRAL, H_CENTRAL, H_CENTRAL, H_SIDE];
            const pillars = [];
            for (let i = 0; i < 5; i++) {
                const h = heights[i];
                const pillar = new THREE.Mesh(
                    new THREE.BoxGeometry(pillarW, h, pillarD),
                    matWoodDark
                );
                pillar.position.set(positions[i], baseH + h / 2, 0);
                pillar.castShadow = true;
                group.add(pillar);
                pillars.push({ mesh: pillar, h, x: positions[i] });
            }

            // —— Pillar caps (lotus-style — tapered top)
            pillars.forEach(({ mesh, h, x }) => {
                const capGeo = new THREE.CylinderGeometry(pillarW * 0.6, pillarW * 0.85, 0.25 * S, 8);
                const cap = new THREE.Mesh(capGeo, matAccent);
                cap.position.set(x, baseH + h + 0.125 * S, 0);
                cap.castShadow = true;
                group.add(cap);
            });

            // —— Main horizontal beams (three tiers: top lintel, middle, lower)
            const beamDepth = D * 1.1;
            const fullSpan = W * 2 + pillarW;
            addBox(group, fullSpan, 0.4 * S, beamDepth, matWoodDark, 0, baseH + H_CENTRAL + 0.2 * S, 0);
            addBox(group, fullSpan, 0.35 * S, beamDepth * 0.95, matWood, 0, baseH + H_CENTRAL - 0.4 * S, 0);
            const sideBeamW = W * 0.5;
            addBox(group, sideBeamW, 0.3 * S, beamDepth * 0.9, matWood, -W * 0.75, baseH + H_SIDE + 0.15 * S, 0);
            addBox(group, sideBeamW, 0.3 * S, beamDepth * 0.9, matWood, W * 0.75, baseH + H_SIDE + 0.15 * S, 0);

            // —— Central inscription panel (between middle and top beam)
            const panelW = W * 0.7, panelH = 0.9 * S, panelD = 0.08 * S;
            const panel = new THREE.Mesh(
                new THREE.BoxGeometry(panelW, panelH, panelD),
                matWoodDark
            );
            panel.position.set(0, baseH + H_CENTRAL - 0.15 * S, D * 0.55);
            panel.castShadow = true;
            group.add(panel);
            // Simple “glyph” strip (gold accent)
            const strip = new THREE.Mesh(
                new THREE.PlaneGeometry(panelW * 0.85, panelH * 0.25),
                matAccent
            );
            strip.position.set(0, 0, panelD / 2 + 0.01 * S);
            strip.rotation.x = 0;
            panel.add(strip);

            // —— Temple roof (tiered over central opening)
            const roofW = W * 1.4, roofD = D * 1.8, roofH = 0.5 * S;
            const roof = new THREE.Mesh(new THREE.BoxGeometry(roofW, roofH, roofD), matRoof);
            roof.position.set(0, baseH + H_CENTRAL + 0.45 * S + roofH / 2, 0);
            roof.castShadow = true;
            group.add(roof);
            // Roof peak (narrower second tier)
            const peakW = W * 1.0, peakD = D * 1.2, peakH = 0.35 * S;
            const peak = new THREE.Mesh(new THREE.BoxGeometry(peakW, peakH, peakD), matWoodDark);
            peak.position.set(0, baseH + H_CENTRAL + 0.45 * S + roofH + peakH / 2, 0);
            peak.castShadow = true;
            group.add(peak);

            // —— Side “eaves” (short overhangs on left/right of central roof)
            const eaveW = 0.6, eaveD = roofD * 0.6, eaveH = 0.2;
            addBox(group, eaveW, eaveH, eaveD, matRoof, -W * 0.85, baseH + H_SIDE + 0.5, 0);
            addBox(group, eaveW, eaveH, eaveD, matRoof, W * 0.85, baseH + H_SIDE + 0.5, 0);

            // —— Lantern-style blocks (small accents at sides)
            const lampW = 0.35 * S, lampH = 0.5 * S, lampD = 0.35 * S;
            addBox(group, lampW, lampH, lampD, matAccent, -W * 0.95, baseH + H_SIDE * 0.6, D * 0.6);
            addBox(group, lampW, lampH, lampD, matAccent, W * 0.95, baseH + H_SIDE * 0.6, D * 0.6);

            group.rotation.y = rotationY;
            group.position.set(x, y, z);
            (this.game?.getWorldGroup?.() || this.scene).add(group);
            return group;
        });
    }
    
    /**
     * Register a structure creator function
     * @param {string} type - The structure type
     * @param {Function} creatorFn - The function that creates the structure
     */
    register(type, creatorFn) {
        this.registry.set(type, creatorFn);
    }
    
    /**
     * Create a structure of the specified type
     * @param {string} type - The structure type
     * @param {Object} params - Parameters for structure creation
     * @returns {Object} - The created structure
     */
    createStructure(type, params = {}) {
        console.debug(`🏗️ StructureFactory: Creating ${type} with params:`, params);
        
        const creator = this.registry.get(type);
        
        if (!creator) {
            console.warn(`No creator registered for structure type: ${type}`);
            return null;
        }
        
        // Extract common parameters
        const { x, z, width, depth, height, style, scale, rotation, size, hasTower, hasWell, hasMarket, layout, buildingCount, radius, minSpacing } = params;
        
        // Call the creator function with appropriate parameters
        let result;
        if (type === STRUCTURE_OBJECTS.HOUSE || 
            type === STRUCTURE_OBJECTS.TAVERN || 
            type === STRUCTURE_OBJECTS.TEMPLE || 
            type === STRUCTURE_OBJECTS.SHOP || 
            type === STRUCTURE_OBJECTS.FORTRESS || 
            type === STRUCTURE_OBJECTS.ALTAR) {
            result = creator(x, z, width, depth, height, style);
        } else if (type === STRUCTURE_OBJECTS.MOUNTAIN) {
            result = creator(x, z, scale);
        } else if (type === STRUCTURE_OBJECTS.BRIDGE) {
            result = creator(x, z, rotation);
        } else if (type === STRUCTURE_OBJECTS.VILLAGE) {
            result = creator(x, z, { size, hasTower, hasWell, hasMarket, layout, buildingCount, radius, minSpacing });
        } else if (type === STRUCTURE_OBJECTS.VILLAGE_FENCE || type === STRUCTURE_OBJECTS.VILLAGE_GATE) {
            result = creator(x, z, rotation);
        } else if (type === STRUCTURE_OBJECTS.VILLAGE_FENCE_RUN) {
            result = creator(params);
        } else {
            result = creator(x, z);
        }
        
        console.debug(`🏗️ StructureFactory: Creation result for ${type}:`, result ? 'SUCCESS' : 'FAILED');
        return result;
    }
    
    /**
     * Get default properties for a structure type
     * @param {string} type - The structure type
     * @returns {Object} - The default properties
     */
    getDefaultProperties(type) {
        return STRUCTURE_PROPERTIES[type] || {};
    }
}