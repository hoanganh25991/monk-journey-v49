import * as THREE from '../../../libs/three/three.module.js';
import { ZONE_COLORS } from '../../config/colors.js';

const TEXTURE_SIZE = 128;
const cache = new Map();

function parseHex(hex, fallback) {
    if (typeof hex === 'number') return hex;
    if (typeof hex === 'string') return parseInt(hex.replace('#', ''), 16);
    return fallback;
}

function mulberry32(seed) {
    let t = seed >>> 0;
    return () => {
        t += 0x6D2B79F5;
        let r = Math.imul(t ^ (t >>> 15), t | 1);
        r ^= r + Math.imul(r ^ (r >>> 7), r | 61);
        return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
    };
}

function hashZone(zoneType) {
    let h = 0;
    const s = zoneType || 'Terrant';
    for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
    return h >>> 0;
}

function fillBase(ctx, w, h, color) {
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, w, h);
}

function addNoise(ctx, w, h, rng, baseRgb, accentRgb, strength = 0.12) {
    const image = ctx.getImageData(0, 0, w, h);
    const data = image.data;
    for (let i = 0; i < data.length; i += 4) {
        const n = (rng() - 0.5) * strength;
        data[i] = Math.min(255, Math.max(0, baseRgb.r + (accentRgb.r - baseRgb.r) * n + n * 40));
        data[i + 1] = Math.min(255, Math.max(0, baseRgb.g + (accentRgb.g - baseRgb.g) * n + n * 40));
        data[i + 2] = Math.min(255, Math.max(0, baseRgb.b + (accentRgb.b - baseRgb.b) * n + n * 40));
        data[i + 3] = 255;
    }
    ctx.putImageData(image, 0, 0);
}

function rgbFromHex(hex) {
    const n = parseHex(hex, 0xffffff);
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function drawSpeckles(ctx, w, h, rng, color, count, radiusMin, radiusMax) {
    ctx.fillStyle = color;
    for (let i = 0; i < count; i++) {
        const x = rng() * w;
        const y = rng() * h;
        const r = radiusMin + rng() * (radiusMax - radiusMin);
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
    }
}

function drawRipples(ctx, w, h, rng, color) {
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    const bands = 6 + Math.floor(rng() * 4);
    for (let b = 0; b < bands; b++) {
        ctx.globalAlpha = 0.08 + rng() * 0.12;
        const y0 = rng() * h;
        ctx.beginPath();
        for (let x = 0; x <= w; x += 4) {
            const y = y0 + Math.sin(x * 0.08 + b * 1.7) * (4 + rng() * 6);
            if (x === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.stroke();
    }
    ctx.globalAlpha = 1;
}

function drawCracks(ctx, w, h, rng, color) {
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    const cracks = 8 + Math.floor(rng() * 6);
    for (let c = 0; c < cracks; c++) {
        ctx.globalAlpha = 0.15 + rng() * 0.2;
        let x = rng() * w;
        let y = rng() * h;
        ctx.beginPath();
        ctx.moveTo(x, y);
        const segments = 3 + Math.floor(rng() * 4);
        for (let s = 0; s < segments; s++) {
            x += (rng() - 0.5) * 24;
            y += (rng() - 0.5) * 24;
            ctx.lineTo(x, y);
        }
        ctx.stroke();
    }
    ctx.globalAlpha = 1;
}

function buildTerrantTexture(themeColors) {
    const zone = ZONE_COLORS.Terrant;
    const base = rgbFromHex(themeColors?.soil || themeColors?.ground || zone.soil, 0xE5C09A);
    const accent = rgbFromHex(themeColors?.accent || zone.accent, 0xDAA520);
    const rock = rgbFromHex(themeColors?.rock || zone.rock, 0x696969);
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = TEXTURE_SIZE;
    const ctx = canvas.getContext('2d');
    const rng = mulberry32(hashZone('Terrant'));

    fillBase(ctx, TEXTURE_SIZE, TEXTURE_SIZE, `rgb(${base.r},${base.g},${base.b})`);
    addNoise(ctx, TEXTURE_SIZE, TEXTURE_SIZE, rng, base, accent, 0.18);
    drawSpeckles(ctx, TEXTURE_SIZE, TEXTURE_SIZE, rng, `rgb(${Math.min(255, base.r + 20)},${Math.min(255, base.g + 15)},${base.b})`, 120, 0.5, 1.5);
    drawSpeckles(ctx, TEXTURE_SIZE, TEXTURE_SIZE, rng, `rgb(${rock.r},${rock.g},${rock.b})`, 18, 0.8, 2.2);
    return canvas;
}

function buildForestTexture(themeColors) {
    const zone = ZONE_COLORS.Forest;
    const base = rgbFromHex(themeColors?.ground || themeColors?.soil || zone.ground, 0x8F9779);
    const accent = rgbFromHex(themeColors?.accent || zone.accent, 0x6B8E23);
    const foliage = rgbFromHex(zone.foliage, 0x2F4F4F);
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = TEXTURE_SIZE;
    const ctx = canvas.getContext('2d');
    const rng = mulberry32(hashZone('Forest'));

    fillBase(ctx, TEXTURE_SIZE, TEXTURE_SIZE, `rgb(${base.r},${base.g},${base.b})`);
    addNoise(ctx, TEXTURE_SIZE, TEXTURE_SIZE, rng, base, accent, 0.2);
    drawSpeckles(ctx, TEXTURE_SIZE, TEXTURE_SIZE, rng, `rgb(${foliage.r},${foliage.g},${foliage.b})`, 90, 0.4, 1.2);
    drawSpeckles(ctx, TEXTURE_SIZE, TEXTURE_SIZE, rng, `rgb(${accent.r},${accent.g},${accent.b})`, 40, 0.6, 1.8);
    return canvas;
}

function buildDesertTexture(themeColors) {
    const zone = ZONE_COLORS.Desert;
    const base = rgbFromHex(themeColors?.sand || themeColors?.ground || zone.sand, 0xF4A460);
    const rock = rgbFromHex(themeColors?.rock || zone.rock, 0xA0522D);
    const accent = rgbFromHex(themeColors?.accent || zone.accent, 0xFF4500);
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = TEXTURE_SIZE;
    const ctx = canvas.getContext('2d');
    const rng = mulberry32(hashZone('Desert'));

    fillBase(ctx, TEXTURE_SIZE, TEXTURE_SIZE, `rgb(${base.r},${base.g},${base.b})`);
    addNoise(ctx, TEXTURE_SIZE, TEXTURE_SIZE, rng, base, accent, 0.15);
    drawRipples(ctx, TEXTURE_SIZE, TEXTURE_SIZE, rng, `rgb(${Math.min(255, base.r + 30)},${Math.min(255, base.g + 20)},${base.b})`);
    drawCracks(ctx, TEXTURE_SIZE, TEXTURE_SIZE, rng, `rgb(${rock.r},${rock.g},${rock.b})`);
    drawSpeckles(ctx, TEXTURE_SIZE, TEXTURE_SIZE, rng, `rgb(${rock.r},${rock.g},${rock.b})`, 25, 0.6, 2.5);
    return canvas;
}

const BUILDERS = {
    Terrant: buildTerrantTexture,
    Forest: buildForestTexture,
    Desert: buildDesertTexture
};

/**
 * Procedural ground texture for terrain splat (Terrant / Forest / Desert).
 * Cached per zone + theme hash.
 */
export function getTerrainTexture(zoneType, themeColors = null) {
    const zone = BUILDERS[zoneType] ? zoneType : 'Terrant';
    const themeKey = themeColors
        ? `${themeColors.ground || ''}${themeColors.soil || ''}${themeColors.sand || ''}`
        : 'default';
    const cacheKey = `${zone}:${themeKey}`;
    if (cache.has(cacheKey)) return cache.get(cacheKey);

    const canvas = BUILDERS[zone](themeColors);
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(1, 1);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.needsUpdate = true;
    cache.set(cacheKey, texture);
    return texture;
}

/** @returns {boolean} */
export function supportsTerrainTexture(zoneType) {
    return zoneType in BUILDERS;
}

export function disposeTerrainTextures() {
    for (const tex of cache.values()) tex.dispose();
    cache.clear();
}
