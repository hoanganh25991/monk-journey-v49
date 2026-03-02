import * as THREE from '../../libs/three/three.module.js';
import { distanceSq2D, distanceApprox2D, fastAtan2, fastCos, fastSin, fastInvSqrt, normalize2D, tempVec2 } from 'utils/FastMath.js';

/**
 * PathManager - Chunk-based continuous walkable paths across the terrain
 * Paths are stored as logical "from A to B" definitions; mesh and edge stones are built
 * per chunk so path lifecycle matches terrain chunks (no path drop/re-add when chunks re-render).
 */
export class PathManager {
    constructor(scene, worldManager, game = null) {
        this.scene = scene;
        this.worldManager = worldManager;
        this.game = game;

        /** Logical path definitions (id + points) - used for queries and for building chunk meshes */
        this.paths = [];
        this.pathNodes = new Map();

        /** Chunk-keyed path meshes and edge stones: chunkKey -> { pathMeshes: [], edgeStoneGroups: [] } */
        this.pathChunks = new Map();
        /** When true, reparent loop is skipped (all chunks already in pathRoot); reset when pathChunks change. */
        this._reparentDone = false;
        /** Single group for all path meshes and edge stones; kept last in worldGroup so path renders on top of terrain. */
        this.pathRoot = new THREE.Group();
        this.pathRoot.name = 'PathRoot';
        this.pathRoot.renderOrder = 100;
        this.pathRoot.visible = true;

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

        /** Chunk size and view distance - synced from TerrainManager for consistent lifecycle */
        this.chunkSize = 64;
        this.viewDistance = 3;
        /** Spawn chunk coords from last init (so we ensure path at spawn when player starts far) */
        this._spawnChunk = null;
    }

    /**
     * Get chunk config from TerrainManager so path chunks align with terrain
     */
    _syncChunkConfig() {
        const tm = this.worldManager?.terrainManager;
        if (tm?.config) {
            this.chunkSize = tm.config.chunkSize ?? 64;
            this.viewDistance = tm.config.viewDistance ?? 3;
        }
    }

    /**
     * Initialize the path system. Prefer explicit paths from mapData.paths (load and render);
     * otherwise compute from structures. Chunk meshes built on demand in update().
     * @param {Object} [mapData] - Map data with paths[] (explicit) or structures[] (compute fallback)
     */
    init(mapData = null) {
        console.debug('PathManager: Initializing chunk-based path system');
        this._syncChunkConfig();

        if (mapData?.paths && Array.isArray(mapData.paths) && mapData.paths.length > 0) {
            this.paths = mapData.paths.map(p => ({
                id: p.id,
                points: (p.points || []).map(pt => {
                    const v = new THREE.Vector3(
                        typeof pt.x === 'number' ? pt.x : 0,
                        typeof pt.y === 'number' ? pt.y : 0,
                        typeof pt.z === 'number' ? pt.z : 0
                    );
                    if (this.worldManager?.getTerrainHeight && (v.y === 0 || !isFinite(v.y))) {
                        const h = this.worldManager.getTerrainHeight(v.x, v.z);
                        if (h != null && isFinite(h)) v.y = h + this.config.pathHeight;
                    }
                    return v;
                })
            })).filter(p => p.points.length >= 2);
            console.debug(`PathManager: Loaded ${this.paths.length} explicit paths from map`);
        } else {
            this.generateInitialPaths(mapData);
        }

        this.pathChunks.clear();
        this._reparentDone = false;
        // Remember spawn chunk so we ensure path there when player starts at far spawn (e.g. 200,0,-200)
        const spawn = mapData?.spawn ?? { x: 0, y: 1, z: -13 };
        const sx = spawn.x != null ? spawn.x : 0;
        const sz = spawn.z != null ? spawn.z : -13;
        this._spawnChunk = {
            x: Math.floor(sx / this.chunkSize),
            z: Math.floor(sz / this.chunkSize)
        };
        // Ensure pathRoot is in world so path is visible; add to worldGroup when available
        const worldParent = this.game?.getWorldGroup?.() || this.scene;
        if (this.pathRoot.parent !== worldParent) {
            if (this.pathRoot.parent) this.pathRoot.parent.remove(this.pathRoot);
            worldParent.add(this.pathRoot);
        }
        this.pathRoot.visible = true;
        this._ensureAllPathChunksOnce();
    }

    /**
     * Create path chunks for every chunk the path passes through, so the path is fully
     * visible from the start and does not disappear when moving away from origin.
     */
    _ensureAllPathChunksOnce() {
        this._syncChunkConfig();
        const cs = this.chunkSize;
        const chunkKeys = new Set();
        for (const path of this.paths) {
            for (let i = 0; i < path.points.length - 1; i++) {
                const p0 = path.points[i], p1 = path.points[i + 1];
                const cx0 = Math.floor(p0.x / cs), cz0 = Math.floor(p0.z / cs);
                const cx1 = Math.floor(p1.x / cs), cz1 = Math.floor(p1.z / cs);
                const minCx = Math.min(cx0, cx1), maxCx = Math.max(cx0, cx1);
                const minCz = Math.min(cz0, cz1), maxCz = Math.max(cz0, cz1);
                for (let cx = minCx; cx <= maxCx; cx++) {
                    for (let cz = minCz; cz <= maxCz; cz++) {
                        chunkKeys.add(`${cx},${cz}`);
                    }
                }
            }
        }
        for (const key of chunkKeys) {
            const [x, z] = key.split(',').map(Number);
            this._ensurePathChunk(x, z);
        }
    }

    /**
     * Generate logical paths from structures (fallback when map has no explicit paths)
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

        const minDistSq = 36;
        const maxDistSq = 64;
        if (cavePositions.length >= 2) {
            const usedPairs = new Set();
            const connected = new Set([0]);
            while (connected.size < cavePositions.length) {
                let bestA = -1, bestB = -1, bestDSq = Infinity;
                for (const i of connected) {
                    for (let j = 0; j < cavePositions.length; j++) {
                        if (connected.has(j)) continue;
                        const dSq = distanceSq2D(cavePositions[i].x, cavePositions[i].z, cavePositions[j].x, cavePositions[j].z);
                        if (dSq < bestDSq && dSq > minDistSq) {
                            bestDSq = dSq;
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
                this._addLogicalPathBetweenPoints(vecA, vecB, `cave_${pathId++}`);
            }

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
                const dSq = distanceSq2D(cavePositions[a].x, cavePositions[a].z, cavePositions[b].x, cavePositions[b].z);
                if (dSq > maxDistSq) {
                    const vecA = new THREE.Vector3(cavePositions[a].x, 0, cavePositions[a].z);
                    const vecB = new THREE.Vector3(cavePositions[b].x, 0, cavePositions[b].z);
                    this._addLogicalPathBetweenPoints(vecA, vecB, `cave_${pathId++}`);
                }
            }
        }

        let origin = { x: spawnX, z: spawnZ };
        if (villagePositions.length > 0) {
            let bestDistSq = Infinity;
            for (const v of villagePositions) {
                const dSq = (v.x - spawnX) ** 2 + (v.z - spawnZ) ** 2;
                if (dSq < bestDistSq) { bestDistSq = dSq; origin = v; }
            }
        }
        const villageVec = new THREE.Vector3(origin.x, 0, origin.z);
        const villageToCaveCount = Math.min(this.config.villageToCaveCount, cavePositions.length);
        let nearestCaves = cavePositions
            .map((c, i) => ({ i, dSq: distanceSq2D(origin.x, origin.z, c.x, c.z) }))
            .sort((a, b) => a.dSq - b.dSq);
        for (let i = 0; i < villageToCaveCount; i++) {
            const cave = cavePositions[nearestCaves[i].i];
            if (nearestCaves[i].dSq <= maxDistSq) continue;
            const caveVec = new THREE.Vector3(cave.x, 0, cave.z);
            this._addLogicalPathBetweenPoints(villageVec, caveVec, `village_cave_${pathId++}`);
        }

        console.debug(`PathManager: Generated ${this.paths.length} logical paths (chunk meshes built on demand)`);
    }

    /**
     * Add a logical path between two points (points only; no meshes)
     */
    _addLogicalPathBetweenPoints(start, end, pathId) {
        const firstPoint = start.clone();
        if (this.worldManager?.getTerrainHeight) {
            const h = this.worldManager.getTerrainHeight(firstPoint.x, firstPoint.z);
            if (h != null && isFinite(h)) firstPoint.y = h + this.config.pathHeight;
        }
        const points = [firstPoint];
        const dx = end.x - start.x;
        const dz = end.z - start.z;
        const totalLen = distanceApprox2D(start.x, start.z, end.x, end.z);
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
            this.paths.push({ id: pathId, points: points });
        }
    }

    /**
     * Clip a line segment to an axis-aligned rectangle. Returns [pStart, pEnd] or null if fully outside.
     */
    _clipSegmentToAABB(p0, p1, minX, minZ, maxX, maxZ) {
        let t0 = 0, t1 = 1;
        const dx = p1.x - p0.x, dz = p1.z - p0.z;

        const clip = (pMin, pMax, p, d) => {
            if (Math.abs(d) < 1e-9) {
                if (p < pMin || p > pMax) return false;
                return true;
            }
            const tMin = (pMin - p) / d, tMax = (pMax - p) / d;
            const tLo = d > 0 ? tMin : tMax, tHi = d > 0 ? tMax : tMin;
            t0 = Math.max(t0, tLo);
            t1 = Math.min(t1, tHi);
            return t0 <= t1;
        };

        if (!clip(minX, maxX, p0.x, dx)) return null;
        if (!clip(minZ, maxZ, p0.z, dz)) return null;

        const q0 = new THREE.Vector3(
            p0.x + t0 * dx,
            p0.y + t0 * (p1.y - p0.y),
            p0.z + t0 * dz
        );
        const q1 = new THREE.Vector3(
            p0.x + t1 * dx,
            p0.y + t1 * (p1.y - p0.y),
            p0.z + t1 * dz
        );
        return [q0, q1];
    }

    /**
     * Clip a polyline to chunk AABB. Returns array of polylines (each with at least 2 points).
     */
    _clipPolylineToChunk(points, chunkX, chunkZ) {
        const cs = this.chunkSize;
        const minX = chunkX * cs;
        const minZ = chunkZ * cs;
        const maxX = minX + cs;
        const maxZ = minZ + cs;

        const result = [];
        let current = [];

        for (let i = 0; i < points.length - 1; i++) {
            const p0 = points[i];
            const p1 = points[i + 1];
            const clipped = this._clipSegmentToAABB(p0, p1, minX, minZ, maxX, maxZ);
            if (!clipped) {
                if (current.length >= 2) {
                    result.push(current);
                    current = [];
                }
                continue;
            }
            const [q0, q1] = clipped;
            if (current.length === 0) {
                current.push(q0.clone());
            }
            current.push(q1.clone());
        }

        if (current.length >= 2) {
            result.push(current);
        }
        return result;
    }

    /**
     * Ensure path meshes and edge stones for a chunk exist; create if missing.
     */
    _ensurePathChunk(chunkX, chunkZ) {
        const chunkKey = `${chunkX},${chunkZ}`;
        if (this.pathChunks.has(chunkKey)) return;

        this._syncChunkConfig();
        const cs = this.chunkSize;
        const minX = chunkX * cs;
        const minZ = chunkZ * cs;
        const maxX = minX + cs;
        const maxZ = minZ + cs;

        const pathMeshes = [];
        const edgeStoneGroups = [];
        const parent = this.pathRoot;

        for (const path of this.paths) {
            const polylines = this._clipPolylineToChunk(path.points, chunkX, chunkZ);
            for (let pl = 0; pl < polylines.length; pl++) {
                const segmentId = `${path.id}_${chunkKey}_${pl}`;
                const mesh = this._createPathMeshForSegment(polylines[pl], segmentId);
                if (mesh) {
                    parent.add(mesh);
                    pathMeshes.push(mesh);
                }
                const stoneGroup = this._addEdgeStonesForSegment(polylines[pl]);
                if (stoneGroup) {
                    parent.add(stoneGroup);
                    edgeStoneGroups.push(stoneGroup);
                }
            }
        }

        this.pathChunks.set(chunkKey, { pathMeshes, edgeStoneGroups });
    }

    /**
     * Create a single path mesh for a segment (does not add to scene).
     */
    _createPathMeshForSegment(points, pathId) {
        if (!points || points.length < 2) return null;

        const halfWidth = this.config.pathWidth * 0.5;
        const pathHeight = this.config.pathHeight;
        const getY = (x, z, fallbackY) => {
            if (this.worldManager?.getTerrainHeight) {
                const h = this.worldManager.getTerrainHeight(x, z);
                if (h != null && isFinite(h)) return h + pathHeight;
            }
            return fallbackY;
        };

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

            const x0 = p.x + perpX * halfWidth, z0 = p.z + perpZ * halfWidth;
            const x1 = p.x - perpX * halfWidth, z1 = p.z - perpZ * halfWidth;
            let y0 = getY(x0, z0, p.y);
            let y1 = getY(x1, z1, p.y);
            if (!isFinite(y0)) y0 = (p.y != null && isFinite(p.y)) ? p.y + pathHeight : pathHeight;
            if (!isFinite(y1)) y1 = (p.y != null && isFinite(p.y)) ? p.y + pathHeight : pathHeight;
            vertices.push([x0, y0, z0], [x1, y1, z1]);
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
            posArray[i * 3] = isFinite(v[0]) ? v[0] : 0;
            posArray[i * 3 + 1] = isFinite(v[1]) ? v[1] : pathHeight;
            posArray[i * 3 + 2] = isFinite(v[2]) ? v[2] : 0;
            colorArray[i * 3] = baseR;
            colorArray[i * 3 + 1] = baseG;
            colorArray[i * 3 + 2] = baseB;
        }
        geometry.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(colorArray, 3));
        geometry.setIndex(indices);
        geometry.computeVertexNormals();
        geometry.computeBoundingSphere();

        // MeshBasicMaterial: same visible color at any distance; lighting can make Standard material
        // too dark or invisible when path is far from camera/origin, so Basic guarantees the grey strip shows.
        const material = new THREE.MeshBasicMaterial({
            vertexColors: true,
            fog: false,
            side: THREE.DoubleSide,
            polygonOffset: true,
            polygonOffsetFactor: 12,
            polygonOffsetUnits: 12,
            depthTest: false,
            depthWrite: false
        });

        const pathMesh = new THREE.Mesh(geometry, material);
        pathMesh.visible = true;
        pathMesh.renderOrder = 100;
        pathMesh.frustumCulled = false;
        pathMesh.userData = { isPath: true, pathId };

        return pathMesh;
    }

    /**
     * Add edge stones for a path segment; returns the group (does not add to scene).
     */
    _addEdgeStonesForSegment(points) {
        if (!points || points.length < 2) return null;

        const halfWidth = this.config.pathWidth * 0.5;
        const stoneSpacing = 2.0;
        let totalLen = 0;
        for (let i = 1; i < points.length; i++) {
            const p0 = points[i - 1], p1 = points[i];
            totalLen += distanceApprox2D(p0.x, p0.z, p1.x, p1.z);
        }
        const stonesPerSide = Math.max(8, Math.min(24, Math.floor(totalLen / stoneSpacing)));
        const stoneGeometry = new THREE.DodecahedronGeometry(0.12, 0);
        const stoneMaterial = new THREE.MeshStandardMaterial({
            color: 0x5a4a3a,
            roughness: 0.9,
            metalness: 0.05
        });
        const stoneGroup = new THREE.Group();
        stoneGroup.name = 'path-edge-stones';
        stoneGroup.frustumCulled = false;

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
                const lenSq = dx * dx + dz * dz;
                const invLen = lenSq > 0 ? fastInvSqrt(lenSq) : 1;
                dx *= invLen;
                dz *= invLen;
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
                const stone = new THREE.Mesh(stoneGeometry, stoneMaterial);
                stone.position.set(stoneX, stoneY, stoneZ);
                stone.rotation.set(
                    (Math.random() - 0.5) * 0.4,
                    Math.random() * Math.PI * 2,
                    (Math.random() - 0.5) * 0.3
                );
                stone.scale.setScalar(0.6 + Math.random() * 0.8);
                stone.castShadow = true;
                stone.receiveShadow = true;
                stoneGroup.add(stone);
            }
        }
        stoneGroup.userData.sharedGeometry = stoneGeometry;
        stoneGroup.userData.sharedMaterial = stoneMaterial;
        return stoneGroup;
    }

    /**
     * Remove and dispose path meshes for a chunk.
     */
    _removePathChunk(chunkKey) {
        const data = this.pathChunks.get(chunkKey);
        if (!data) return;
        const parent = this.pathRoot;
        for (const mesh of data.pathMeshes) {
            parent.remove(mesh);
            if (mesh.geometry) mesh.geometry.dispose();
            if (mesh.material) mesh.material.dispose();
        }
        for (const group of data.edgeStoneGroups) {
            if (group.parent) group.parent.remove(group);
            const geom = group.userData.sharedGeometry;
            if (geom) geom.dispose();
            const mat = group.userData.sharedMaterial;
            if (mat) mat.dispose();
        }
        this.pathChunks.delete(chunkKey);
    }

    /**
     * Get the path root group (so WorldManager can keep it last in worldGroup for render order).
     */
    getPathRoot() {
        return this.pathRoot;
    }

    /**
     * Get the nearest path point to a position (uses logical paths)
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
     * Clear all paths and chunk meshes
     */
    clear() {
        for (const chunkKey of Array.from(this.pathChunks.keys())) {
            this._removePathChunk(chunkKey);
        }
        this.paths = [];
        this.pathNodes.clear();
    }

    /**
     * Update: sync path chunks with player position (same view distance as terrain).
     * Ensures path is only rendered for chunks that exist, so no overlap/drop when chunks re-render.
     */
    update(playerPosition) {
        if (!playerPosition) return;

        this._syncChunkConfig();
        this.pathRoot.visible = true;

        const cx = Math.floor(playerPosition.x / this.chunkSize);
        const cz = Math.floor(playerPosition.z / this.chunkSize);
        const vd = this.viewDistance;

        // Ensure path meshes exist for all chunks in view (covers "first play at far position" e.g. 200,0,-200)
        for (let x = cx - vd; x <= cx + vd; x++) {
            for (let z = cz - vd; z <= cz + vd; z++) {
                this._ensurePathChunk(x, z);
            }
        }

        // Spawn chunk: when player starts at far spawn, path at spawn must be ensured
        if (this._spawnChunk) {
            this._ensurePathChunk(this._spawnChunk.x, this._spawnChunk.z);
            this._ensurePathChunk(this._spawnChunk.x, this._spawnChunk.z - 1);
            this._ensurePathChunk(this._spawnChunk.x - 1, this._spawnChunk.z);
        }

        // Always ensure path chunks containing world origin (0,0) so the path behind the player
        // (bottom of screen when far away) has grey fill
        const originChunks = [[0, 0], [0, -1], [-1, 0], [-1, -1]];
        for (const [ox, oz] of originChunks) {
            this._ensurePathChunk(ox, oz);
        }

        // Reparent path meshes/edge stones into pathRoot only until all are correct (then skip every frame).
        if (!this._reparentDone) {
            const parent = this.pathRoot;
            let anyWrong = false;
            for (const data of this.pathChunks.values()) {
                for (const mesh of data.pathMeshes) {
                    if (mesh.parent && mesh.parent !== parent) {
                        mesh.parent.remove(mesh);
                        parent.add(mesh);
                        anyWrong = true;
                    }
                }
                for (const group of data.edgeStoneGroups) {
                    if (group.parent && group.parent !== parent) {
                        group.parent.remove(group);
                        parent.add(group);
                        anyWrong = true;
                    }
                }
            }
            if (!anyWrong && this.pathChunks.size > 0) this._reparentDone = true;
        }

        // Ensure pathRoot is in world and will be moved to end of worldGroup by WorldManager so path renders on top.
        const worldParent = this.game?.getWorldGroup?.() || this.scene;
        if (this.pathRoot.parent !== worldParent) {
            if (this.pathRoot.parent) this.pathRoot.parent.remove(this.pathRoot);
            worldParent.add(this.pathRoot);
        }

        // Do NOT unload path chunks: the path is a small fixed set of chunks (village–cave network).
        // Unloading caused the path (gray mesh) to disappear when moving ~500 away and only reappear
        // when returning to origin. Keeping all path chunks loaded ensures the path stays visible
        // when returning and avoids recreate/flicker. Bounded by path length (~10–50 chunks).
    }
}
