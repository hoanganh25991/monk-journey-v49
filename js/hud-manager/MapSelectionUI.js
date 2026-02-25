import { UIComponent } from '../UIComponent.js';
import { MAP_MANIFEST } from '../config/maps.js';
import { STORAGE_KEYS } from '../config/storage-keys.js';
import { ZONE_ENEMIES, ENEMY_TYPES, BOSS_TYPES } from '../config/game-balance.js';

/** Relative path to manifest so app works when loaded from a subpath */
const MAP_MANIFEST_PATH = 'maps/index.json';
const DEFAULT_MAP_PATH = 'maps/default.json';

/**
 * Map Selection UI component
 * Shows pre-generated maps (list + detail), allows select and play.
 * Manifest loaded from maps/index.json; each map from maps/<id>.json (relative paths).
 */
/** Map zoneStyle (e.g. "Forest") to ZONE_ENEMIES key (e.g. "forest") */
const ZONE_STYLE_TO_KEY = {
    'forest': 'forest',
    'mountains': 'mountains',
    'swamp': 'swamp',
    'ruins': 'ruins',
    'desert': 'ruins',
    'terrant': 'forest',
    'magical': 'dark_sanctum',
    'hellfire_peaks': 'hellfire_peaks',
    'frozen_wastes': 'frozen_wastes',
    'dark_sanctum': 'dark_sanctum'
};

export class MapSelectionUI extends UIComponent {
    constructor(game) {
        super('map-selector-overlay', game);
        this.mapSelectorButton = null;
        this.overlay = null;
        this.mapListEl = null;
        this.selectedMapId = null;
        this.mapManifest = [];
        this.mapDataCache = new Map(); // path -> full map JSON
    }

    init() {
        try {
            this.mapSelectorButton = document.getElementById('map-selector-button');
            this.overlay = document.getElementById('map-selector-overlay');
            this.mapListEl = document.getElementById('map-list');

            if (!this.mapSelectorButton || !this.overlay || !this.mapListEl) {
                console.error('Map selector elements not found');
                return false;
            }

            this.setupEventListeners();
            this.loadManifest().then(() => this.populateMapList());
            this.forceHide();
            return true;
        } catch (error) {
            console.error('Error initializing MapSelectionUI:', error);
            return false;
        }
    }

    /** Load manifest from maps/index.json (relative); fallback to config MAP_MANIFEST */
    async loadManifest() {
        try {
            const res = await fetch(MAP_MANIFEST_PATH);
            if (res.ok) {
                const list = await res.json();
                this.mapManifest = Array.isArray(list) ? list : [];
            }
        } catch (e) {
            console.warn('Could not load maps/index.json, using built-in manifest:', e.message);
        }
        if (this.mapManifest.length === 0) {
            this.mapManifest = MAP_MANIFEST.map(m => ({
                id: m.id,
                path: m.path,
                name: m.name,
                description: m.description || '',
                size: '-',
                thumbnail: m.thumbnail || '',
                structures: 'NA',
                paths: 'NA',
                environment: 'NA',
            }));
        }
    }

    setupEventListeners() {
        this.mapSelectorButton.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.show();
        });

        const closeBtn = document.getElementById('closeMapSelector');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.hide());
        }

        const clearBtn = document.getElementById('clearCurrentMap');
        if (clearBtn) {
            clearBtn.addEventListener('click', () => this.clearCurrentMap());
        }

        const playBtn = document.getElementById('playMapButton');
        if (playBtn) {
            playBtn.addEventListener('click', () => this.playSelectedMap());
        }

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isVisible()) this.hide();
        });
    }

    populateMapList() {
        this.mapListEl.innerHTML = '';
        const storedPath = typeof localStorage !== 'undefined'
            ? (localStorage.getItem(STORAGE_KEYS.SELECTED_MAP_PATH) || DEFAULT_MAP_PATH)
            : DEFAULT_MAP_PATH;

        for (const map of this.mapManifest) {
            const li = document.createElement('div');
            li.className = 'map-list-item';
            li.dataset.mapId = map.id;
            li.dataset.mapPath = map.path || '';
            const thumb = map.thumbnail
                ? `<img class="map-list-thumb" src="${map.thumbnail}" alt="" />`
                : '<span class="map-icon">🗺️</span>';
            li.innerHTML = `${thumb} <span class="map-list-name">${map.name}</span>`;
            li.addEventListener('click', () => this.selectMap(map));
            this.mapListEl.appendChild(li);
        }

        const selectedEntry = this.mapManifest.find(m => (m.path || '') === storedPath) || this.mapManifest.find(m => m.id === 'default') || this.mapManifest[0];
        if (selectedEntry) {
            this.selectedMapId = selectedEntry.id;
            const selectedEl = this.mapListEl.querySelector(`[data-map-id="${this.selectedMapId}"]`);
            if (selectedEl) selectedEl.classList.add('selected');
            this.updateDetailPanel(selectedEntry);
        }
    }

    selectMap(mapEntry) {
        this.selectedMapId = mapEntry.id;
        document.querySelectorAll('.map-list-item').forEach(el => {
            el.classList.toggle('selected', el.dataset.mapId === mapEntry.id);
        });
        this.updateDetailPanel(mapEntry);
    }

    updateDetailPanel(mapEntry) {
        document.getElementById('selectedMapName').textContent = mapEntry.name;
        document.getElementById('selectedMapDescription').textContent = mapEntry.description || '';
        document.getElementById('mapSizeStat').textContent = mapEntry.size || '-';
        document.getElementById('structuresStat').textContent = mapEntry.structures ?? 'NA';
        document.getElementById('pathsStat').textContent = mapEntry.paths ?? 'NA';
        document.getElementById('environmentStat').textContent = mapEntry.environment ?? 'NA';
        document.getElementById('enemiesStat').textContent = '-';
        void this.loadMapEnemies(mapEntry);
        const previewEl = document.getElementById('map-preview-large');
        if (previewEl) {
            const placeholder = previewEl.querySelector('.map-preview-placeholder');
            let img = previewEl.querySelector('.map-preview-img');
            if (mapEntry.thumbnail) {
                if (!img) {
                    img = document.createElement('img');
                    img.className = 'map-preview-img';
                    img.alt = mapEntry.name;
                    img.onerror = () => {
                        img.style.display = 'none';
                        if (placeholder) placeholder.style.display = 'flex';
                    };
                    previewEl.appendChild(img);
                }
                img.alt = mapEntry.name;
                img.src = mapEntry.thumbnail;
                img.style.display = 'block';
                if (placeholder) placeholder.style.display = 'none';
            } else {
                if (img) img.style.display = 'none';
                if (placeholder) placeholder.style.display = 'flex';
            }
        }
    }

    /**
     * Load map JSON to get zoneStyle/enemies, then display enemy list
     * @param {Object} mapEntry - Manifest entry (id, path, name, ...)
     */
    async loadMapEnemies(mapEntry) {
        const el = document.getElementById('enemiesStat');
        if (!el) return;
        el.textContent = '…';
        let mapData = this.mapDataCache.get(mapEntry.path);
        if (!mapData && mapEntry.path) {
            try {
                const res = await fetch(mapEntry.path);
                if (res.ok) {
                    mapData = await res.json();
                    this.mapDataCache.set(mapEntry.path, mapData);
                }
            } catch (e) {
                mapData = null;
            }
        }
        const text = this.getEnemiesText(mapEntry, mapData);
        el.textContent = text;
    }

    /**
     * Derive enemy list text from map entry and full map data
     * @param {Object} mapEntry - Manifest entry
     * @param {Object|null} mapData - Full map JSON (zoneStyle, enemies)
     * @returns {string} Display text for Enemies stat
     */
    getEnemiesText(mapEntry, mapData) {
        if (mapData?.enemies === 'random') return 'Random';
        if (Array.isArray(mapData?.enemies) && mapData.enemies.length > 0) {
            const allTypes = [...ENEMY_TYPES, ...BOSS_TYPES];
            const names = mapData.enemies.map(t => {
                const e = allTypes.find(x => x.type === t) || { name: t };
                return e.name;
            });
            return names.join(', ');
        }
        const zoneStyle = mapData?.zoneStyle || mapEntry.zoneStyle;
        if (!zoneStyle) return 'Random';
        const key = (typeof zoneStyle === 'string' ? zoneStyle.toLowerCase() : '').replace(/\s+/g, '_');
        const zoneKey = ZONE_STYLE_TO_KEY[key] || ZONE_STYLE_TO_KEY[zoneStyle?.toLowerCase?.()] || null;
        if (!zoneKey || !ZONE_ENEMIES[zoneKey]) return 'Random';
        const types = ZONE_ENEMIES[zoneKey];
        const allTypes = [...ENEMY_TYPES, ...BOSS_TYPES];
        const names = types.map(t => {
            const e = allTypes.find(x => x.type === t) || { name: t };
            return e.name;
        });
        return names.join(', ');
    }

    async playSelectedMap() {
        const entry = this.mapManifest.find(m => m.id === this.selectedMapId);
        if (!entry || !this.game) return;

        try {
            localStorage.setItem(STORAGE_KEYS.SELECTED_MAP_PATH, entry.path || DEFAULT_MAP_PATH);
        } catch (e) {
            console.warn('Could not save map preference:', e);
        }

        const mapName = entry.name || entry.id || 'Map';
        if (this.game.hudManager?.showNotification) {
            this.game.hudManager.showNotification(`Map set to "${mapName}". Reloading...`, 3000);
        }
        this.hide();
        setTimeout(() => location.reload(), 800);
    }

    clearCurrentMap() {
        try {
            localStorage.setItem(STORAGE_KEYS.SELECTED_MAP_PATH, DEFAULT_MAP_PATH);
        } catch (e) {
            console.warn('Could not save map preference:', e);
        }
        if (this.game?.hudManager?.showNotification) {
            this.game.hudManager.showNotification('Returned to Default World. Reloading...', 3000);
        }
        this.hide();
        setTimeout(() => location.reload(), 800);
    }

    show() {
        if (this.overlay) {
            const currentLabel = document.getElementById('map-selector-current-label');
            if (currentLabel) {
                const currentMap = this.game?.world?.currentMap;
                currentLabel.textContent = currentMap?.name ? `Current: ${currentMap.name}` : 'Current: —';
            }
            this.overlay.style.display = 'flex';
            this.overlay.style.visibility = 'visible';
            this.overlay.style.pointerEvents = 'auto';
            this.overlay.classList.add('show');
        }
    }

    hide() {
        if (this.overlay) {
            this.overlay.classList.remove('show');
            this.overlay.style.pointerEvents = 'none';
            setTimeout(() => {
                this.overlay.style.display = 'none';
                this.overlay.style.visibility = 'hidden';
            }, 300);
        }
    }

    forceHide() {
        if (this.overlay) {
            this.overlay.classList.remove('show');
            this.overlay.style.display = 'none';
            this.overlay.style.visibility = 'hidden';
            this.overlay.style.pointerEvents = 'none';
        }
    }

    isVisible() {
        if (!this.overlay) return false;
        const s = window.getComputedStyle(this.overlay);
        return s.display !== 'none' && s.visibility !== 'hidden';
    }

    update(delta) {}

    cleanup() {
        if (this.mapSelectorButton) {
            this.mapSelectorButton.replaceWith(this.mapSelectorButton.cloneNode(true));
        }
    }
}
