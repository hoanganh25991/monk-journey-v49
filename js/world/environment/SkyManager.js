import * as THREE from '../../../libs/three/three.module.js';

/**
 * Manages sky dome with horizon gradient + optional sun disc.
 */
export class SkyManager {
    constructor(scene) {
        this.scene = scene;
        this.skyDome = null;
        this.sunDisc = null;
        this.timeOfDay = 'day';
        this.weather = 'clear';
        this.horizonTop = 0x8eb4d4;
        this.horizonBottom = 0xc8a86e;

        this.skyColors = {
            day: { top: 0x8eb4d4, bottom: 0xc8a86e },
            dawn: { top: 0xc87878, bottom: 0xf0c090 },
            dusk: { top: 0x604878, bottom: 0xd87848 },
            night: { top: 0x0a1028, bottom: 0x1a2040 }
        };

        this.weatherModifiers = {
            clear: 1.0,
            rain: 0.75,
            fog: 0.85,
            storm: 0.55
        };

        this.initSky();
    }

    initSky() {
        const geo = new THREE.SphereGeometry(800, 32, 16);
        const pos = geo.attributes.position;
        const colors = new Float32Array(pos.count * 3);
        geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

        const mat = new THREE.MeshBasicMaterial({
            vertexColors: true,
            side: THREE.BackSide,
            fog: false,
            depthWrite: false
        });

        this.skyDome = new THREE.Mesh(geo, mat);
        this.skyDome.renderOrder = -1000;
        this.scene.add(this.skyDome);

        const sunGeo = new THREE.CircleGeometry(18, 24);
        const sunMat = new THREE.MeshBasicMaterial({
            color: 0xfff0c0,
            transparent: true,
            opacity: 0.85,
            fog: false,
            depthWrite: false
        });
        this.sunDisc = new THREE.Mesh(sunGeo, sunMat);
        this.sunDisc.position.set(120, 180, -200);
        this.sunDisc.lookAt(0, 0, 0);
        this.scene.add(this.sunDisc);

        this.applyGradient(this.horizonTop, this.horizonBottom);
    }

    applyGradient(topHex, bottomHex) {
        if (!this.skyDome) return;
        const top = new THREE.Color(topHex);
        const bottom = new THREE.Color(bottomHex);
        const weather = this.weatherModifiers[this.weather] ?? 1;
        top.multiplyScalar(weather);
        bottom.multiplyScalar(weather);

        const pos = this.skyDome.geometry.attributes.position;
        const col = this.skyDome.geometry.attributes.color;
        for (let i = 0; i < pos.count; i++) {
            const y = pos.getY(i);
            const t = Math.max(0, Math.min(1, (y + 800) / 1600));
            const c = bottom.clone().lerp(top, t);
            col.setXYZ(i, c.r, c.g, c.b);
        }
        col.needsUpdate = true;

        if (this.scene) {
            this.scene.background = bottom.clone().lerp(top, 0.5);
        }
    }

    /**
     * Apply sensory sky profile from map JSON.
     * @param {{ timeOfDay?: string, weather?: string, horizonTop?: number, horizonBottom?: number }} profile
     */
    applySensoryProfile(profile = {}) {
        if (profile.timeOfDay) this.timeOfDay = profile.timeOfDay;
        if (profile.weather) this.weather = profile.weather;
        const preset = this.skyColors[this.timeOfDay] || this.skyColors.day;
        const top = profile.horizonTop ?? preset.top;
        const bottom = profile.horizonBottom ?? preset.bottom;
        this.horizonTop = top;
        this.horizonBottom = bottom;
        this.applyGradient(top, bottom);

        if (this.sunDisc) {
            const isNight = this.timeOfDay === 'night';
            this.sunDisc.visible = !isNight && this.weather !== 'storm';
            this.sunDisc.material.opacity = this.weather === 'fog' ? 0.4 : 0.85;
        }
    }

    setTimeOfDay(timeOfDay) {
        this.applySensoryProfile({ timeOfDay });
    }

    setWeather(weather) {
        this.applySensoryProfile({ weather });
    }

    update(_deltaTime) {
        // Sun billboard toward origin (camera orbits near origin with world rebasing)
        if (this.sunDisc?.visible) {
            this.sunDisc.lookAt(0, 0, 0);
        }
    }
}
