import * as THREE from '../../libs/three/three.module.js';
import { distanceSq2D, fastAtan2, normalize2D, tempVec2 } from '../utils/FastMath.js';

/**
 * PathManager - Creates continuous walkable paths across the terrain
 * Generates interconnected paths between points of interest for better navigation
 */
export class PathManager {
    constructor(scene, worldManager, game = null) {
        this.scene = scene;
        this.worldManager = worldManager;
        this.game = game;
        
        this.paths = [];
        this.pathNodes = new Map();
        this.pathMeshes = [];
        this.edgeStoneMeshes = [];
        
        this.config = {
            pathWidth: 12,
            pathColor: 0x3a2a18,
            pathHeight: 0.5,
            maxPathCount: 30,
            pathLength: 120,
            segmentLength: 10,
            curveAmount: 0.06,
            villageToCaveCount: 2,
            extraCaveConnections: 4
        };
    }
    
    /**
     * Initialize the path system
     * @param {Object} [mapData] - Optional map data with structures (for cave paths)
     */
    init(mapData = null) {
        console.debug('PathManager: Initializing path system');
        this.generateInitialPaths(mapData);
    }
    
    /**
     * Generate paths: connected cave network (like branching diagram) + village links
     * Caves are nodes, paths form a connected graph with random branches
     * @param {Object} [mapData] - Map data with structures (village, cave)
     */
    generateInitialPaths(mapData = null) {
        const spawn = mapData?.spawn || { x: 0, y: 1, z: -13 };
        const spawnX = spawn.x ?? 0;
        const spawnZ = spawn.z ?? -13;
        
        const villagePositions = [];
        const cavePositions = [];
        if (mapData?.structures && Array.isArray(mapData.structures)) {
            for (const s of mapData.structures) {
                if (!s.position) continue;
                const pos = { x: s.position.x, z: s.position.z };
                if (s.type === 'village') villagePositions.push(pos);
                if (s.type === 'cave') cavePositions.push(pos);
            }
        }
        
        let pathId = 0;
        
        // Build connected cave network: spanning tree + extra random connections
        if (cavePositions.length >= 2) {
            const usedPairs = new Set();
            const dist = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
            
            // Spanning tree: connect each cave to nearest in connected set
            const connected = new Set([0]);
            while (connected.size < cavePositions.length) {
                let bestA = -1, bestB = -1, bestD = Infinity;
                for (const i of connected) {
                    for (let j = 0; j < cavePositions.length; j++) {
                        if (connected.has(j)) continue;
                        const d = dist(cavePositions[i], cavePositions[j]);
                        if (d < bestD && d > 6) {
                            bestD = d;
                            bestA = i;
                            bestB = j;
                        }
                    }
                }
                if (bestA < 0) break;
                connected.add(bestB);
                const key = [bestA, bestB].sort().join(',');
                usedPairs.add(key);
                const vecA = new THREE.Vector3(cavePositions[bestA].x, 0, cavePositions[bestA].z);
                const vecB = new THREE.Vector3(cavePositions[bestB].x, 0, cavePositions[bestB].z);
                this.generatePathBetweenPoints(vecA, vecB, `cave_${pathId++}`);
            }
            
            // Extra random connections (branches) for variety
            const extra = Math.min(this.config.extraCaveConnections, cavePositions.length * 2);
            for (let i = 0; i < extra; i++) {
                const a = Math.floor(Math.random() * cavePositions.length);
                let b = Math.floor(Math.random() * cavePositions.length);
                let attempts = 0;
                while (b === a && attempts < 15) {
                    b = Math.floor(Math.random() * cavePositions.length);
                    attempts++;
                }
                if (b === a) continue;
                const key = [a, b].sort().join(',');
                if (usedPairs.has(key)) continue;
                usedPairs.add(key);
                const vecA = new THREE.Vector3(cavePositions[a].x, 0, cavePositions[a].z);
                const vecB = new THREE.Vector3(cavePositions[b].x, 0, cavePositions[b].z);
                if (vecA.distanceTo(vecB) > 8) {
                    this.generatePathBetweenPoints(vecA, vecB, `cave_${pathId++}`);
                }
            }
        }
        
        // 1-2 paths: village/spawn -> nearest cave
        let origin = { x: spawnX, z: spawnZ };
        if (villagePositions.length > 0) {
            let bestDist = Infinity;
            for (const v of villagePositions) {
                const d = (v.x - spawnX) ** 2 + (v.z - spawnZ) ** 2;
                if (d < bestDist) { bestDist = d; origin = v; }
            }
        }
        const villageVec = new THREE.Vector3(origin.x, 0, origin.z);
        const villageToCaveCount = Math.min(this.config.villageToCaveCount, cavePositions.length);
        let nearestCaves = cavePositions
            .map((c, i) => ({ i, d: villageVec.distanceTo(new THREE.Vector3(c.x, 0, c.z)) }))
            .sort((a, b) => a.d - b.d);
        for (let i = 0; i < villageToCaveCount; i++) {
            const cave = cavePositions[nearestCaves[i].i];
            const caveVec = new THREE.Vector3(cave.x, 0, cave.z);
            if (villageVec.distanceTo(caveVec) > 8) {
                this.generatePathBetweenPoints(villageVec, caveVec, `village_cave_${pathId++}`);
            }
        }
        
        console.debug(`PathManager: Generated ${this.paths.length} paths (cave network + ${villageToCaveCount} village links)`);
    }
    
    /**
     * Generate a path between two points
     */
    generatePathBetweenPoints(start, end, pathId) {
        const firstPoint = start.clone();
        if (this.worldManager?.getTerrainHeight) {
            const h = this.worldManager.getTerrainHeight(firstPoint.x, firstPoint.z);
            if (h != null && isFinite(h)) firstPoint.y = h + this.config.pathHeight;
        }
        const points = [firstPoint];
        const dx = end.x - start.x;
        const dz = end.z - start.z;
        const totalLen = Math.sqrt(dx * dx + dz * dz);
        if (totalLen < 2) return;
        
        const numSegs = Math.max(2, Math.ceil(totalLen / this.config.segmentLength));
        
        for (let i = 1; i <= numSegs; i++) {
            const t = i / numSegs;
            const x = start.x + dx * t + (Math.random() - 0.5) * 2;
            const z = start.z + dz * t + (Math.random() - 0.5) * 2;
            const p = new THREE.Vector3(x, 0, z);
            if (this.worldManager?.getTerrainHeight) {
                const h = this.worldManager.getTerrainHeight(p.x, p.z);
                if (h != null && isFinite(h)) p.y = h + this.config.pathHeight;
            }
            points.push(p);
        }
        
        if (points.length > 1) {
            this.createContinuousPathMesh(points, pathId);
            this.addEdgeStones(points);
            this.paths.push({ id: pathId, points: points });
        }
    }
    
    /**
     * Add small stones along path edges for a natural path feel
     */
    addEdgeStones(points) {
        if (points.length < 2) return;
        const halfWidth = this.config.pathWidth * 0.5;
        const stoneSpacing = 1.2;
        let totalLen = 0;
        for (let i = 1; i < points.length; i++) totalLen += points[i].distanceTo(points[i - 1]);
        const stonesPerSide = Math.max(20, Math.floor(totalLen / stoneSpacing));
        const stoneColors = [0x5a4a3a, 0x4a3a2a, 0x6a5a4a, 0x3a2a1a];
        const stoneGeometry = new THREE.DodecahedronGeometry(0.12, 0);
        const stoneMaterial = new THREE.MeshStandardMaterial({
            color: 0x5a4a3a,
            roughness: 0.9,
            metalness: 0.05
        });
        const stoneGroup = new THREE.Group();
        stoneGroup.name = 'path-edge-stones';
        for (let side = 0; side < 2; side++) {
            const sign = side === 0 ? 1 : -1;
            for (let i = 0; i <= stonesPerSide; i++) {
                const t = i / stonesPerSide;
                let idx = Math.floor(t * (points.length - 1));
                idx = Math.min(idx, points.length - 2);
                const p0 = points[idx];
                const p1 = points[idx + 1];
                const segT = (t * (points.length - 1)) - idx;
                const x = p0.x + (p1.x - p0.x) * segT;
                const y = p0.y + (p1.y - p0.y) * segT;
                const z = p0.z + (p1.z - p0.z) * segT;
                let dx = p1.x - p0.x;
                let dz = p1.z - p0.z;
                const len = Math.sqrt(dx * dx + dz * dz) || 1;
                dx /= len;
                dz /= len;
                const perpX = -dz * sign;
                const perpZ = dx * sign;
                const ox = (Math.random() - 0.5) * 0.4;
                const oz = (Math.random() - 0.5) * 0.4;
                const stoneX = x + perpX * (halfWidth + 0.15) + ox;
                const stoneZ = z + perpZ * (halfWidth + 0.15) + oz;
                let stoneY = y;
                if (this.worldManager?.getTerrainHeight) {
                    const terrainH = this.worldManager.getTerrainHeight(stoneX, stoneZ);
                    if (terrainH != null && isFinite(terrainH)) stoneY = terrainH + 0.02;
                }
                const stone = new THREE.Mesh(stoneGeometry, stoneMaterial.clone());
                stone.position.set(stoneX, stoneY, stoneZ);
                stone.rotation.set(
                    (Math.random() - 0.5) * 0.4,
                    Math.random() * Math.PI * 2,
                    (Math.random() - 0.5) * 0.3
                );
                stone.scale.setScalar(0.6 + Math.random() * 0.8);
                stone.material.color.setHex(stoneColors[Math.floor(Math.random() * stoneColors.length)]);
                stone.castShadow = true;
                stone.receiveShadow = true;
                stoneGroup.add(stone);
            }
        }
        stoneGroup.userData.sharedGeometry = stoneGeometry;
        this.scene.add(stoneGroup);
        this.edgeStoneMeshes.push(stoneGroup);
    }
    
    /**
     * Generate one continuous path in a direction (no branches, gentle curves)
     */
    generateContinuousPath(start, direction, length, pathId) {
        const firstPoint = start.clone();
        if (this.worldManager?.getTerrainHeight) {
            const h = this.worldManager.getTerrainHeight(firstPoint.x, firstPoint.z);
            if (h != null && isFinite(h)) firstPoint.y = h + this.config.pathHeight;
        }
        const points = [firstPoint];
        let currentPos = firstPoint.clone();
        let currentDir = new THREE.Vector2(direction.x, direction.z);
        let distanceTraveled = 0;
        const segLen = this.config.segmentLength;
        const curve = this.config.curveAmount;
        
        while (distanceTraveled < length) {
            const segmentLength = Math.min(segLen, length - distanceTraveled);
            if (segmentLength < 1) break;
            
            const angleVariation = (Math.random() - 0.5) * curve;
            const angle = fastAtan2(currentDir.y, currentDir.x) + angleVariation;
            currentDir.x = Math.cos(angle);
            currentDir.y = Math.sin(angle);
            
            currentPos.x += currentDir.x * segmentLength;
            currentPos.z += currentDir.y * segmentLength;
            
            if (this.worldManager && this.worldManager.getTerrainHeight) {
                const terrainHeight = this.worldManager.getTerrainHeight(currentPos.x, currentPos.z);
                if (terrainHeight != null && isFinite(terrainHeight)) {
                    currentPos.y = terrainHeight + this.config.pathHeight;
                }
            }
            
            points.push(currentPos.clone());
            distanceTraveled += segmentLength;
        }
        
        if (points.length > 1) {
            this.createContinuousPathMesh(points, pathId);
            this.addEdgeStones(points);
            this.paths.push({ id: pathId, points: points });
        }
    }
    
    /**
     * Create one continuous path mesh (single strip per path, not many segments)
     */
    createContinuousPathMesh(points, pathId) {
        if (points.length < 2) return;
        
        const halfWidth = this.config.pathWidth * 0.5;
        const vertices = [];
        const indices = [];
        
        for (let i = 0; i < points.length; i++) {
            const p = points[i];
            const prev = i > 0 ? points[i - 1] : p;
            const next = i < points.length - 1 ? points[i + 1] : p;
            
            let dx = next.x - prev.x;
            let dz = next.z - prev.z;
            const lengthSq = dx * dx + dz * dz;
            if (lengthSq > 0.0001) {
                normalize2D(tempVec2, dx, dz);
                dx = tempVec2.x;
                dz = tempVec2.z;
            } else {
                dx = 0;
                dz = 0;
            }
            
            const perpX = -dz;
            const perpZ = dx;
            
            const v0 = [p.x + perpX * halfWidth, p.y, p.z + perpZ * halfWidth];
            const v1 = [p.x - perpX * halfWidth, p.y, p.z - perpZ * halfWidth];
            vertices.push(v0, v1);
        }
        
        for (let i = 0; i < points.length - 1; i++) {
            const a = i * 2;
            const b = i * 2 + 1;
            const c = i * 2 + 2;
            const d = i * 2 + 3;
            indices.push(a, b, c, b, d, c);
        }
        
        const geometry = new THREE.BufferGeometry();
        const posArray = new Float32Array(vertices.length * 3);
        const colorArray = new Float32Array(vertices.length * 3);
        const baseR = ((this.config.pathColor >> 16) & 0xff) / 255;
        const baseG = ((this.config.pathColor >> 8) & 0xff) / 255;
        const baseB = (this.config.pathColor & 0xff) / 255;
        for (let i = 0; i < vertices.length; i++) {
            const v = vertices[i];
            posArray[i * 3] = v[0];
            posArray[i * 3 + 1] = v[1];
            posArray[i * 3 + 2] = v[2];
            colorArray[i * 3] = baseR;
            colorArray[i * 3 + 1] = baseG;
            colorArray[i * 3 + 2] = baseB;
        }
        geometry.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(colorArray, 3));
        geometry.setIndex(indices);
        geometry.computeVertexNormals();
        
        const material = new THREE.MeshStandardMaterial({
            vertexColors: true,
            roughness: 0.85,
            metalness: 0.02,
            emissive: 0x1a1208,
            emissiveIntensity: 0.35,
            fog: false,
            polygonOffset: true,
            polygonOffsetFactor: 4,
            polygonOffsetUnits: 4,
            depthTest: true,
            depthWrite: true
        });
        
        const pathMesh = new THREE.Mesh(geometry, material);
        pathMesh.receiveShadow = true;
        pathMesh.castShadow = true;
        pathMesh.renderOrder = 100;
        pathMesh.frustumCulled = false;
        pathMesh.userData = { isPath: true, pathId: pathId };
        
        this.scene.add(pathMesh);
        this.pathMeshes.push(pathMesh);
    }
    
    /**
     * Get the nearest path point to a position
     */
    getNearestPathPoint(position) {
        let nearestPoint = null;
        let nearestDistSq = Infinity;
        
        this.paths.forEach(path => {
            path.points.forEach(point => {
                const distSq = distanceSq2D(position.x, position.z, point.x, point.z);
                if (distSq < nearestDistSq) {
                    nearestDistSq = distSq;
                    nearestPoint = point;
                }
            });
        });
        
        return nearestPoint;
    }
    
    /**
     * Check if a position is on a path
     */
    isOnPath(position, threshold = 2) {
        const nearest = this.getNearestPathPoint(position);
        if (!nearest) return false;
        
        const distSq = distanceSq2D(position.x, position.z, nearest.x, nearest.z);
        return distSq <= (threshold * threshold);
    }
    
    /**
     * Get path direction at a position
     */
    getPathDirection(position) {
        let nearestSegment = null;
        let nearestDistSq = Infinity;
        
        this.paths.forEach(path => {
            for (let i = 0; i < path.points.length - 1; i++) {
                const start = path.points[i];
                const end = path.points[i + 1];
                
                const distSq = this.pointToSegmentDistanceSq(position, start, end);
                if (distSq < nearestDistSq) {
                    nearestDistSq = distSq;
                    nearestSegment = { start, end };
                }
            }
        });
        
        if (!nearestSegment) return null;

        const dx = nearestSegment.end.x - nearestSegment.start.x;
        const dz = nearestSegment.end.z - nearestSegment.start.z;
        const lengthSq = dx * dx + dz * dz;

        if (lengthSq < 0.0001) return null;

        normalize2D(tempVec2, dx, dz);
        return new THREE.Vector3(tempVec2.x, 0, tempVec2.z);
    }
    
    /**
     * Calculate squared distance from point to line segment
     */
    pointToSegmentDistanceSq(point, segStart, segEnd) {
        const dx = segEnd.x - segStart.x;
        const dz = segEnd.z - segStart.z;
        const lengthSq = dx * dx + dz * dz;
        
        if (lengthSq < 0.0001) {
            return distanceSq2D(point.x, point.z, segStart.x, segStart.z);
        }
        
        const px = point.x - segStart.x;
        const pz = point.z - segStart.z;
        const t = Math.max(0, Math.min(1, (px * dx + pz * dz) / lengthSq));
        
        const projX = segStart.x + t * dx;
        const projZ = segStart.z + t * dz;
        
        return distanceSq2D(point.x, point.z, projX, projZ);
    }
    
    /**
     * Clear all paths
     */
    clear() {
        this.pathMeshes.forEach(mesh => {
            if (mesh.geometry) mesh.geometry.dispose();
            if (mesh.material) mesh.material.dispose();
            this.scene.remove(mesh);
        });
        this.pathMeshes = [];

        this.edgeStoneMeshes.forEach(group => {
            const geom = group.userData.sharedGeometry;
            if (geom) geom.dispose();
            group.traverse(child => {
                if (child.isMesh && child.material) child.material.dispose();
            });
            this.scene.remove(group);
        });
        this.edgeStoneMeshes = [];
        
        this.paths = [];
        this.pathNodes.clear();
    }
    
    /**
     * Update paths based on player position (for dynamic path generation)
     */
    update(playerPosition) {
        // Future: Generate paths dynamically as player explores
    }
}
