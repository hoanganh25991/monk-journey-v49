import { UIComponent } from '../UIComponent.js';
import { DEATH_SCREEN_ACTIONS, REVIVE_GOLD_COST, RESPAWN_BUFF_INVULN_SECONDS } from '../config/death-screen-actions.js';

/**
 * Death Screen UI component
 * Displays death screen with configurable action buttons (see death-screen-actions.js).
 * Buttons are built from config so you can select which to show and wire logic here.
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
     * Execute logic for the given death-screen action.
     * @param {string} actionId - One of: respawn, respawn_buff, revive_gold, quit
     */
    runAction(actionId) {
        switch (actionId) {
            case 'respawn':
                this.game.player.revive();
                break;
            case 'respawn_buff': {
                this.game.player.revive();
                if (this.game?.player?.statusEffects) {
                    this.game.player.statusEffects.applyEffect('invulnerable', RESPAWN_BUFF_INVULN_SECONDS, 1.0);
                    if (this.game?.hudManager) {
                        this.game.hudManager.showNotification(`Spirit's blessing: ${RESPAWN_BUFF_INVULN_SECONDS}s invulnerability`);
                    }
                }
                break;
            }
            case 'revive_gold': {
                const gold = this.game.player.getGold ? this.game.player.getGold() : 0;
                if (gold < REVIVE_GOLD_COST) return;
                if (this.game.player.removeGold(REVIVE_GOLD_COST)) {
                    this.game.player.revive();
                    this.game.player.stats.setHealth(this.game.player.stats.getMaxHealth());
                    this.game.player.stats.setMana(this.game.player.stats.getMaxMana());
                    if (this.game?.player?.statusEffects) {
                        this.game.player.statusEffects.applyEffect('invulnerable', 5.0, 1.0);
                    }
                    if (this.game?.hudManager) {
                        this.game.hudManager.showNotification(`Revived! (-${REVIVE_GOLD_COST} Gold)`);
                    }
                }
                break;
            }
            case 'quit':
                window.location.reload();
                break;
            default:
                console.warn('DeathScreenUI: unknown action', actionId);
        }
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
                <div class="death-message">
                    Your journey has come to an end, but your spirit lives on.
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
        // Update statistics and action button states (e.g. Revive Gold disabled when poor)
        this.updateDeathStats();
        this.updateActionButtons();
        
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
        const playerLevel = this.game.player.level || 1;
        
        // Update UI elements (session recap = small win, encourages "one more try")
        const timeEl = document.getElementById('time-survived');
        const enemiesEl = document.getElementById('enemies-defeated');
        const levelEl = document.getElementById('level-reached');
        if (timeEl) timeEl.textContent = timeString;
        if (enemiesEl) enemiesEl.textContent = enemiesDefeated.toString();
        if (levelEl) levelEl.textContent = playerLevel.toString();
    }

    /**
     * Update death action button state (e.g. disable "Revive (50 Gold)" when not enough gold).
     */
    updateActionButtons() {
        const gold = this.game?.player?.getGold ? this.game.player.getGold() : 0;
        this.container?.querySelectorAll('.death-action-btn[data-action-id="revive_gold"]').forEach((btn) => {
            const enough = gold >= REVIVE_GOLD_COST;
            btn.disabled = !enough;
            btn.title = enough ? '' : `Requires ${REVIVE_GOLD_COST} Gold`;
        });
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