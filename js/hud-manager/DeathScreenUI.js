import { UIComponent } from '../UIComponent.js';
import { DEATH_SCREEN_ACTIONS, getRespawnExpLoss } from '../config/death-screen-actions.js';

/**
 * Death Screen UI component
 * Single option: respawn (lose XP scaling with level). Message: "Your journey... Lose XXX XP to respawn."
 */
export class DeathScreenUI extends UIComponent {
    /**
     * Create a new DeathScreenUI component
     * @param {Object} game - Reference to the game instance
     */
    constructor(game) {
        super('death-screen', game);
        this.isDeathScreenOpen = false;
    }

    /**
     * Execute logic for the given death-screen action (only respawn).
     * Deducts XP (scaling with level) then revives the player.
     * @param {string} actionId - 'respawn'
     */
    runAction(actionId) {
        if (actionId !== 'respawn') return;
        const level = this.game.player.getLevel ? this.game.player.getLevel() : 1;
        const expLoss = getRespawnExpLoss(level);
        const currentExp = this.game.player.getExperience ? this.game.player.getExperience() : 0;
        const newExp = Math.max(0, currentExp - expLoss);
        this.game.player.stats.setExperience(newExp);
        this.game.player.revive();
    }
    
    /**
     * Initialize the component
     * @returns {boolean} - True if initialization was successful
     */
    init() {
        const buttonPlaceholder = DEATH_SCREEN_ACTIONS.filter(a => a.enabled)
            .map(a => `<button class="menu-button death-action-btn" data-action-id="${a.id}" type="button">${a.label}</button>`)
            .join('');
        const template = `
            <div id="death-screen-content">
                <h1>You Died</h1>
                <div class="death-message" id="death-message">
                    Your journey has come to an end. Lose <span id="respawn-exp-loss">200</span> XP to respawn.
                </div>

                <div class="death-stats" id="death-stats">
                    <div class="death-stats-title">This run</div>
                    <div class="death-stats-item">
                        <span class="death-stats-label">Time survived</span>
                        <span class="death-stats-value" id="time-survived">--:--</span>
                    </div>
                    <div class="death-stats-item">
                        <span class="death-stats-label">Enemies defeated</span>
                        <span class="death-stats-value" id="enemies-defeated">0</span>
                    </div>
                    <div class="death-stats-item">
                        <span class="death-stats-label">Level reached</span>
                        <span class="death-stats-value" id="level-reached">1</span>
                    </div>
                </div>

                <div class="menu-button-container">
                    ${buttonPlaceholder}
                </div>
            </div>
        `;
        
        this.render(template);
        this.boundClickHandler = (e) => {
            const btn = e.target.closest('.death-action-btn');
            if (!btn || btn.disabled) return;
            const actionId = btn.getAttribute('data-action-id');
            if (actionId) this.runAction(actionId);
        };
        const container = this.container?.querySelector('.menu-button-container');
        if (container) container.addEventListener('click', this.boundClickHandler);
        this.hide();
        return true;
    }
    
    /**
     * Show the death screen
     */
    showDeathScreen() {
        // Idempotent: avoid showing again if already open (e.g. duplicate events)
        if (this.isDeathScreenOpen) {
            return;
        }
        // Update statistics and respawn XP loss text
        this.updateDeathStats();
        
        // Show death screen
        this.show();
        this.isDeathScreenOpen = true;
        
        // In multiplayer (host or member), do not pause: world keeps running, others keep playing, dead player is a tomb until respawn.
        // In single player, pause so the player focuses on respawn/quit.
        const inMultiplayer = this.game.multiplayerManager?.connection && (this.game.multiplayerManager.connection.isHost || this.game.multiplayerManager.connection.isConnected);
        if (!inMultiplayer) {
            this.game.pause(false);
        }
    }
    
    /**
     * Update death statistics
     */
    updateDeathStats() {
        // Get player statistics
        const gameTime = this.game.gameTime || 0;
        const minutes = Math.floor(gameTime / 60);
        const seconds = Math.floor(gameTime % 60);
        const timeString = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        
        // Get enemies defeated (if available)
        const enemiesDefeated = this.game.player.enemiesDefeated || 0;
        
        // Get player level
        const playerLevel = this.game.player.level ?? this.game.player.getLevel?.() ?? 1;
        
        // Update UI elements (session recap and respawn XP cost)
        const timeEl = document.getElementById('time-survived');
        const enemiesEl = document.getElementById('enemies-defeated');
        const levelEl = document.getElementById('level-reached');
        const expLossEl = document.getElementById('respawn-exp-loss');
        if (timeEl) timeEl.textContent = timeString;
        if (enemiesEl) enemiesEl.textContent = enemiesDefeated.toString();
        if (levelEl) levelEl.textContent = playerLevel.toString();
        if (expLossEl) expLossEl.textContent = getRespawnExpLoss(playerLevel).toString();
    }
    
    /**
     * Hide the death screen
     */
    hideDeathScreen() {
        // Hide death screen
        this.hide();
        this.isDeathScreenOpen = false;
        
        // Resume game (no-op if we didn't pause, e.g. in multiplayer)
        this.game.resume(false);
    }
    
    /**
     * Remove event listeners when component is disposed
     * Overrides the base class method
     */
    removeEventListeners() {
        const container = this.container?.querySelector('.menu-button-container');
        if (container && this.boundClickHandler) {
            container.removeEventListener('click', this.boundClickHandler);
        }
    }
}