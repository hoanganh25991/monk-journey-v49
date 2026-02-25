import * as THREE from '../../../libs/three/three.module.js';

/**
 * Cave structure - enemy spawn point with zone-specific appearance
 * Forest: mossy entrance, Desert: sandstone, Mountains: ice/snow, Swamp: murky, Magical: glowing, Terrant: stone
 */
export class Cave {
    constructor(zoneType = 'Terrant') {
        this.zoneType = zoneType;
        this.entranceWidth = 6 + Math.random() * 2;
        this.entranceHeight = 4 + Math.random() * 1.5;
        this.depth = 3;
    }

    getZoneColors() {
        const colors = {
            Terrant: { rock: 0x5a4a3a, dark: 0x3a2a1a, accent: 0x4a3a2a },
            Forest: { rock: 0x4a5a3a, dark: 0x2a3a1a, accent: 0x3a4a2a },
            Desert: { rock: 0xc4a574, dark: 0x8b7355, accent: 0xa08050 },
            Mountains: { rock: 0x8a9aab, dark: 0x5a6a7b, accent: 0x6a7a8b },
            Swamp: { rock: 0x4a5a4a, dark: 0x2a3a2a, accent: 0x3a4a3a },
            Magical: { rock: 0x5a4a6a, dark: 0x3a2a4a, accent: 0x6b5b9b }
        };
        return colors[this.zoneType] || colors.Terrant;
    }

    createMesh() {
        const group = new THREE.Group();
        const colors = this.getZoneColors();
        const rockMaterial = new THREE.MeshStandardMaterial({
            color: colors.rock,
            roughness: 0.9,
            metalness: 0.1
        });
        const wallThickness = 1.2;
        const openingW = this.entranceWidth * 0.65;
        const openingH = this.entranceHeight * 0.7;
        const depth = this.depth * 1.5;

        // Hollow frame: left pillar
        const pillarGeometry = new THREE.BoxGeometry(wallThickness, this.entranceHeight + 1, depth);
        const leftPillar = new THREE.Mesh(pillarGeometry, rockMaterial);
        leftPillar.position.set(-this.entranceWidth / 2 - wallThickness / 2, this.entranceHeight / 2 + 0.5, 0);
        leftPillar.receiveShadow = true;
        leftPillar.castShadow = true;
        group.add(leftPillar);

        // Right pillar
        const rightPillar = new THREE.Mesh(pillarGeometry.clone(), rockMaterial);
        rightPillar.position.set(this.entranceWidth / 2 + wallThickness / 2, this.entranceHeight / 2 + 0.5, 0);
        rightPillar.receiveShadow = true;
        rightPillar.castShadow = true;
        group.add(rightPillar);

        // Top lintel / overhang (thick, juts out)
        const lintelGeometry = new THREE.BoxGeometry(this.entranceWidth + wallThickness * 2.5, wallThickness * 1.5, depth * 0.8);
        const lintel = new THREE.Mesh(lintelGeometry, rockMaterial);
        lintel.position.set(0, this.entranceHeight + 1.2, -0.2);
        lintel.receiveShadow = true;
        lintel.castShadow = true;
        group.add(lintel);

        // Floor sill (base of entrance)
        const sillGeometry = new THREE.BoxGeometry(this.entranceWidth + wallThickness * 2, 0.4, depth * 0.6);
        const sill = new THREE.Mesh(sillGeometry, rockMaterial);
        sill.position.set(0, 0.2, 0);
        sill.receiveShadow = true;
        sill.castShadow = true;
        group.add(sill);

        // Dark interior back wall (recessed) - suggests empty cavern depth
        const darkMaterial = new THREE.MeshStandardMaterial({
            color: colors.dark,
            roughness: 1,
            metalness: 0,
            emissive: this.zoneType === 'Magical' ? 0x220044 : 0x000000,
            emissiveIntensity: this.zoneType === 'Magical' ? 0.25 : 0
        });
        const backWallGeometry = new THREE.BoxGeometry(openingW * 1.1, openingH * 1.1, 0.3);
        const backWall = new THREE.Mesh(backWallGeometry, darkMaterial);
        backWall.position.set(0, this.entranceHeight / 2 + 0.5, depth / 2 + 0.5);
        backWall.receiveShadow = true;
        group.add(backWall);

        // Dark side walls inside (optional depth cues)
        const sideDepth = depth * 0.4;
        const leftInner = new THREE.Mesh(
            new THREE.BoxGeometry(0.4, openingH, sideDepth),
            darkMaterial
        );
        leftInner.position.set(-openingW / 2 - 0.2, this.entranceHeight / 2 + 0.5, depth / 4);
        group.add(leftInner);
        const rightInner = new THREE.Mesh(
            new THREE.BoxGeometry(0.4, openingH, sideDepth),
            darkMaterial
        );
        rightInner.position.set(openingW / 2 + 0.2, this.entranceHeight / 2 + 0.5, depth / 4);
        group.add(rightInner);

        // Zone-specific accents
        if (this.zoneType === 'Forest') {
            const mossGeometry = new THREE.BoxGeometry(this.entranceWidth + wallThickness * 2, 0.3, depth * 0.8);
            const mossMaterial = new THREE.MeshStandardMaterial({ color: 0x3a5a2a, roughness: 0.95 });
            const moss = new THREE.Mesh(mossGeometry, mossMaterial);
            moss.position.set(0, 0.2, 0);
            group.add(moss);
        } else if (this.zoneType === 'Mountains') {
            const snowGeometry = new THREE.BoxGeometry(this.entranceWidth + wallThickness * 2, 0.5, depth * 0.6);
            const snowMaterial = new THREE.MeshStandardMaterial({ color: 0xe8f4f8, roughness: 0.9 });
            const snow = new THREE.Mesh(snowGeometry, snowMaterial);
            snow.position.set(0, this.entranceHeight + 1.2, 0);
            group.add(snow);
        } else if (this.zoneType === 'Magical') {
            const glowGeometry = new THREE.RingGeometry(openingW / 2, openingW / 2 + 0.3, 16);
            const glowMaterial = new THREE.MeshBasicMaterial({
                color: 0x6644aa,
                transparent: true,
                opacity: 0.5,
                side: THREE.DoubleSide
            });
            const glow = new THREE.Mesh(glowGeometry, glowMaterial);
            glow.rotation.x = -Math.PI / 2;
            glow.position.set(0, 0.1, depth * 0.2);
            group.add(glow);
        }

        group.userData.isCave = true;
        group.userData.zoneType = this.zoneType;
        return group;
    }
}
