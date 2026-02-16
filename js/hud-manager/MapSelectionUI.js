import { UIComponent } from '../UIComponent.js';
import { MAP_MANIFEST } from '../config/maps.js';

/**
 * Map Selection UI component
 * Shows pre-generated maps, allows review and play
 * Map data is loaded from maps/ JSON files and buffered in memory - no localStorage
 */
export class MapSelectionUI extends UIComponent {
    constructor(game) {
        super('map-selector-overlay', game);
        this.mapSelectorButton = null;
        this.overlay = null;
        this.mapListEl = null;
        this.selectedMapId = null;
        this.mapManifest = MAP_MANIFEST;
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
            this.populateMapList();
            this.forceHide();
            return true;
        } catch (error) {
            console.error('Error initializing MapSelectionUI:', error);
            return false;
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
            li.innerHTML = `<span class="map-icon">🗺️</span> <span class="map-list-name">${map.name}</span>`;
            li.addEventListener('click', () => this.selectMap(map));
            this.mapListEl.appendChild(li);
        }
        if (this.mapManifest.length > 0) {
            this.selectedMapId = this.mapManifest[0].id;
            const first = this.mapListEl.querySelector(`[data-map-id="${this.selectedMapId}"]`);
            if (first) first.classList.add('selected');
            document.getElementById('selectedMapName').textContent = this.mapManifest[0].name;
            document.getElementById('selectedMapDescription').textContent = this.mapManifest[0].description || '';
        }
    }

    selectMap(mapEntry) {
        this.selectedMapId = mapEntry.id;
        document.querySelectorAll('.map-list-item').forEach(el => {
            el.classList.toggle('selected', el.dataset.mapId === mapEntry.id);
        });
        document.getElementById('selectedMapName').textContent = mapEntry.name;
        document.getElementById('selectedMapDescription').textContent = mapEntry.description || '';
        document.getElementById('mapSizeStat').textContent = '-';
        document.getElementById('structuresStat').textContent = '-';
        document.getElementById('pathsStat').textContent = '-';
        document.getElementById('environmentStat').textContent = '-';
    }

    async playSelectedMap() {
        const entry = this.mapManifest.find(m => m.id === this.selectedMapId);
        if (!entry || !this.game) return;

        const overlayEl = document.getElementById('mapLoadingOverlay');
        if (overlayEl) overlayEl.style.display = 'flex';

        try {
            const mapData = await this.game.loadAndApplyMap(entry.path);
            if (mapData.bounds) {
                const w = (mapData.bounds.maxX - mapData.bounds.minX) || 0;
                const h = (mapData.bounds.maxZ - mapData.bounds.minZ) || 0;
                document.getElementById('mapSizeStat').textContent = `${w}x${h}`;
            }
            if (this.game.player && mapData.spawn) {
                const s = mapData.spawn;
                this.game.player.setPosition(s.x ?? 0, s.y ?? 1, s.z ?? -13);
            }
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
