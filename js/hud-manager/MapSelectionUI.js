import { UIComponent } from '../UIComponent.js';
import { MAP_MANIFEST } from '../config/maps.js';

/** Relative path to manifest so app works when loaded from a subpath */
const MAP_MANIFEST_PATH = 'maps/index.json';

/**
 * Map Selection UI component
 * Shows pre-generated maps (list + detail), allows select and play.
 * Manifest loaded from maps/index.json; each map from maps/<id>.json (relative paths).
 */
export class MapSelectionUI extends UIComponent {
    constructor(game) {
        super('map-selector-overlay', game);
        this.mapSelectorButton = null;
        this.overlay = null;
        this.mapListEl = null;
        this.selectedMapId = null;
        this.mapManifest = [];
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
        for (const map of this.mapManifest) {
            const li = document.createElement('div');
            li.className = 'map-list-item';
            li.dataset.mapId = map.id;
            const thumb = map.thumbnail
                ? `<img class="map-list-thumb" src="${map.thumbnail}" alt="" />`
                : '<span class="map-icon">🗺️</span>';
            li.innerHTML = `${thumb} <span class="map-list-name">${map.name}</span>`;
            li.addEventListener('click', () => this.selectMap(map));
            this.mapListEl.appendChild(li);
        }
        if (this.mapManifest.length > 0) {
            this.selectedMapId = this.mapManifest[0].id;
            const first = this.mapListEl.querySelector(`[data-map-id="${this.selectedMapId}"]`);
            if (first) first.classList.add('selected');
            this.updateDetailPanel(this.mapManifest[0]);
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

    async playSelectedMap() {
        const entry = this.mapManifest.find(m => m.id === this.selectedMapId);
        if (!entry || !this.game) return;

        const overlayEl = document.getElementById('mapLoadingOverlay');
        const loadingTextEl = overlayEl?.querySelector('.loading-text');
        const setLoadingText = (text) => {
            if (loadingTextEl) loadingTextEl.textContent = text;
        };

        if (overlayEl) overlayEl.style.display = 'flex';

        try {
            setLoadingText('Downloading map...');
            const mapData = await this.game.loadAndApplyMap(entry.path);
            if (mapData.bounds) {
                const w = (mapData.bounds.maxX - mapData.bounds.minX) || 0;
                const h = (mapData.bounds.maxZ - mapData.bounds.minZ) || 0;
                document.getElementById('mapSizeStat').textContent = `${w}x${h}`;
            }

            setLoadingText('Loading world...');
            if (this.game.player && mapData.spawn) {
                const s = mapData.spawn;
                this.game.player.setPosition(s.x ?? 0, s.y ?? 1, s.z ?? -13);
            }

            setLoadingText('Preparing...');
            await this.game.waitForMapReady();

            if (this.game.hudManager?.showNotification) {
                this.game.hudManager.showNotification(`Map loaded: ${mapData.name || entry.name}`);
            }
            this.hide();
        } catch (err) {
            console.error('Failed to load map:', err);
            if (this.game.hudManager?.showNotification) {
                this.game.hudManager.showNotification('Failed to load map', 3000);
            }
        } finally {
            if (overlayEl) overlayEl.style.display = 'none';
        }
    }

    clearCurrentMap() {
        if (this.game?.world) {
            this.game.world.applyMap(null);
            if (this.game.hudManager?.showNotification) {
                this.game.hudManager.showNotification('Returned to procedural world');
            }
        }
        this.hide();
    }

    show() {
        if (this.overlay) {
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
