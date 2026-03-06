import { UIComponent } from '../UIComponent.js';
import { MAP_MANIFEST } from '../config/maps.js';
import { STORAGE_KEYS } from '../config/storage-keys.js';
import { ZONE_ENEMIES, ENEMY_TYPES, BOSS_TYPES } from '../config/game-balance.js';
import { CHAPTER_QUEST_MAPS } from '../config/chapter-quest-maps.js';
import { CHAPTER_QUESTS } from '../config/chapter-quests.js';
import { getMapSelectionUiString, getChapterQuestDisplay } from '../config/chapter-quests-locales.js';
import { getMapDisplay } from '../config/map-locales.js';
import { StoryBookUI } from './StoryBookUI.js';

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
        this.storyBookUI = null;
    }

    /** @returns {'en'|'vi'} */
    getLocale() {
        return (this.game && this.game.questStoryLocale === 'vi') ? 'vi' : 'en';
    }

    /** Apply translated labels to overlay (title, stat labels, button titles, placeholders). */
    updateMapSelectorLabels() {
        const locale = this.getLocale();
        const titleEl = document.getElementById('map-selector-title');
        if (titleEl) titleEl.textContent = getMapSelectionUiString('selectMapTitle', locale);
        const labels = [
            { id: 'mapStatLabelSize', key: 'statSize' },
            { id: 'mapStatLabelStructures', key: 'statStructures' },
            { id: 'mapStatLabelPaths', key: 'statPaths' },
            { id: 'mapStatLabelEnvironment', key: 'statEnvironment' },
            { id: 'mapStatLabelEnemies', key: 'statEnemies' },
        ];
        labels.forEach(({ id, key }) => {
            const el = document.getElementById(id);
            if (el) el.textContent = getMapSelectionUiString(key, locale);
        });
        if (this.mapSelectorButton) this.mapSelectorButton.title = getMapSelectionUiString('btnMapSelector', locale);
        const closeBtn = document.getElementById('closeMapSelector');
        if (closeBtn) closeBtn.title = getMapSelectionUiString('btnSaveAndClose', locale);
        const storyBtn = document.getElementById('openStoryBookBtn');
        if (storyBtn) storyBtn.title = getMapSelectionUiString('btnStoryBook', locale);
        const playBtn = document.getElementById('playMapButton');
        if (playBtn) {
            playBtn.title = getMapSelectionUiString('btnApplyAndReloadTitle', locale);
            playBtn.textContent = getMapSelectionUiString('btnApplyAndReload', locale);
        }
        const loadingEl = document.getElementById('mapLoadingOverlayText');
        if (loadingEl) loadingEl.textContent = getMapSelectionUiString('loadingMap', locale);
        const namePlaceholder = document.getElementById('selectedMapName');
        const descPlaceholder = document.getElementById('selectedMapDescription');
        if (namePlaceholder && !namePlaceholder.dataset.filled) namePlaceholder.textContent = getMapSelectionUiString('selectMapPlaceholder', locale);
        if (descPlaceholder && !descPlaceholder.dataset.filled) descPlaceholder.textContent = getMapSelectionUiString('chooseMapPlaceholder', locale);
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

            this.storyBookUI = new StoryBookUI(this.game);
            this.storyBookUI.init();
            this.storyBookUI.onClose = () => this.show();
            this.setupEventListeners();
            this.updateMapSelectorLabels();
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

        const openStoryBtn = document.getElementById('openStoryBookBtn');
        if (openStoryBtn) {
            openStoryBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.hide();
                if (this.storyBookUI) this.storyBookUI.show();
            });
        }

        const closeBtn = document.getElementById('closeMapSelector');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.hide());
        }

        const playBtn = document.getElementById('playMapButton');
        if (playBtn) {
            playBtn.addEventListener('click', () => this.playSelectedMap());
        }

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isVisible()) this.hide();
        });
    }

    /** Get chapter area label for a map if it hosts a chapter quest, in the given locale. */
    getChapterAreaForMap(mapId, locale) {
        const entry = CHAPTER_QUEST_MAPS.find((e) => e.mapId === mapId);
        if (!entry) return null;
        const quest = CHAPTER_QUESTS.find((q) => q.id === entry.chapterQuestId);
        if (!quest) return null;
        const display = getChapterQuestDisplay(quest, locale);
        return display?.area ?? quest?.area ?? null;
    }

    /** Display name for a map entry in the current locale (from map-locales, then manifest). */
    getMapDisplayName(mapEntry) {
        const { name } = getMapDisplay(mapEntry.id, this.getLocale(), { name: mapEntry.name, description: mapEntry.description });
        return name || mapEntry.name || '';
    }

    populateMapList() {
        this.mapListEl.innerHTML = '';
        const locale = this.getLocale();
        const storedPath = typeof localStorage !== 'undefined'
            ? (localStorage.getItem(STORAGE_KEYS.SELECTED_MAP_PATH) || DEFAULT_MAP_PATH)
            : DEFAULT_MAP_PATH;

        const sorted = [...this.mapManifest].sort((a, b) =>
            (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base' })
        );

        for (const map of sorted) {
            const li = document.createElement('div');
            li.className = 'map-list-item';
            li.dataset.mapId = map.id;
            li.dataset.mapPath = map.path || '';
            const thumb = map.thumbnail
                ? `<img class="map-list-thumb" src="${map.thumbnail}" alt="" />`
                : '<span class="map-icon">🗺️</span>';
            const displayName = this.getMapDisplayName(map);
            const chapterArea = this.getChapterAreaForMap(map.id, locale);
            const subtitle = chapterArea ? `<span class="map-list-subtitle">${chapterArea}</span>` : '';
            li.innerHTML = `${thumb} <span class="map-list-text"><span class="map-list-name">${displayName}</span>${subtitle}</span>`;
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
        const nameEl = document.getElementById('selectedMapName');
        const descEl = document.getElementById('selectedMapDescription');
        const fallback = { name: mapEntry.name, description: mapEntry.description };
        const { name: displayName, description: displayDesc } = getMapDisplay(mapEntry.id, this.getLocale(), fallback);
        if (nameEl) {
            nameEl.textContent = displayName;
            nameEl.dataset.filled = '1';
        }
        if (descEl) {
            descEl.textContent = displayDesc;
            descEl.dataset.filled = '1';
        }
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
        const locale = this.getLocale();
        if (mapData?.enemies === 'random') return getMapSelectionUiString('enemiesRandom', locale);
        if (Array.isArray(mapData?.enemies) && mapData.enemies.length > 0) {
            const allTypes = [...ENEMY_TYPES, ...BOSS_TYPES];
            const names = mapData.enemies.map(t => {
                const e = allTypes.find(x => x.type === t) || { name: t };
                return e.name;
            });
            return names.join(', ');
        }
        const zoneStyle = mapData?.zoneStyle || mapEntry.zoneStyle;
        if (!zoneStyle) return getMapSelectionUiString('enemiesRandom', locale);
        const key = (typeof zoneStyle === 'string' ? zoneStyle.toLowerCase() : '').replace(/\s+/g, '_');
        const zoneKey = ZONE_STYLE_TO_KEY[key] || ZONE_STYLE_TO_KEY[zoneStyle?.toLowerCase?.()] || null;
        if (!zoneKey || !ZONE_ENEMIES[zoneKey]) return getMapSelectionUiString('enemiesRandom', locale);
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

        const locale = this.getLocale();
        const mapName = this.getMapDisplayName(entry) || entry.id || 'Map';
        const path = entry.path || DEFAULT_MAP_PATH;

        try {
            localStorage.setItem(STORAGE_KEYS.SELECTED_MAP_PATH, path);
        } catch (e) {
            console.warn('Could not save map preference:', e);
        }

        this.hide();
        await this.runTeleportEffect(locale, async () => {
            const mapData = await this.game.loadAndApplyMap(path);
            const spawn = mapData?.spawn || { x: 0, y: 1, z: -13 };
            if (this.game.player?.setPosition) {
                this.game.player.setPosition(spawn.x ?? 0, spawn.y ?? 1, spawn.z ?? -13);
            }
            if (this.game.enemyManager?.removeAllEnemies) {
                this.game.enemyManager.removeAllEnemies();
            }
            if (this.game.worldGroup && this.game.player?.movement?.getPosition) {
                const pos = this.game.player.movement.getPosition();
                this.game.worldGroup.position.copy(pos).negate();
            }
            if (this.game.hudManager?.showNotification) {
                this.game.hudManager.showNotification(getMapSelectionUiString('arrivedAtMap', locale, { mapName }), 3000);
            }
        });
    }

    /**
     * Show shared "Đang dịch chuyển" / "Teleporting…" overlay with countdown 3 → 2 → 1, then run the teleport action.
     * @param {string} locale - For label text (VI/EN)
     * @param {() => Promise<void>} doTeleport - Async function to load map, move player, etc.
     */
    async runTeleportEffect(locale, doTeleport) {
        if (this.game?.hudManager?.runTeleportOverlay) {
            await this.game.hudManager.runTeleportOverlay(locale, doTeleport);
            return;
        }
        try {
            await doTeleport();
        } catch (e) {
            console.warn('Teleport failed:', e);
            if (this.game?.hudManager?.showNotification) {
                this.game.hudManager.showNotification(getMapSelectionUiString('loadingMap', locale) + ' Failed.', 3000);
            }
        }
    }

    show() {
        if (this.overlay) {
            this.updateMapSelectorLabels();
            this.populateMapList();
            const currentLabel = document.getElementById('map-selector-current-label');
            if (currentLabel) {
                const locale = this.getLocale();
                const currentMap = this.game?.world?.currentMap;
                const entry = currentMap?.id ? this.mapManifest.find(m => m.id === currentMap.id) : null;
                const name = entry ? this.getMapDisplayName(entry) : (currentMap?.name || '');
                currentLabel.textContent = name
                    ? getMapSelectionUiString('currentMap', locale, { name })
                    : getMapSelectionUiString('currentMapNone', locale);
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
