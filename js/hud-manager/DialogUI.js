import { UIComponent } from '../UIComponent.js';

/**
 * Dialog UI component
 * Displays dialog boxes with text and continue button
 */
export class DialogUI extends UIComponent {
    /**
     * Create a new DialogUI component
     * @param {import('../game/Game.js').Game} game - Reference to the game instance
     */
    constructor(game) {
        super('dialog-box', game);
        this.dialogText = null;
        this.dialogContinue = null;
        this.isDialogOpen = false;
        this._onContinue = null;
        this.game = game;
    }
    
    /**
     * Initialize the component
     * @returns {boolean} - True if initialization was successful
     */
    init() {
        // Store references to elements we need to update
        this.dialogText = document.getElementById('dialog-text');
        this.dialogContinue = document.getElementById('dialog-continue');
        
        // Add click event to close dialog
        this.container.addEventListener('click', () => {
            this.hideDialog();
        });
        
        // Hide initially
        this.hide();
        
        return true;
    }
    
    /**
     * Show a dialog with title and text
     * @param {string} title - Dialog title
     * @param {string} text - Dialog text
     * @param {Function} [onContinue] - Optional callback when the player continues
     */
    showDialog(title, text, onContinue) {
        this._onContinue = typeof onContinue === 'function' ? onContinue : null;
        this.dialogText.innerHTML = `<h3>${title}</h3><p>${text}</p>`;
        this.show();
        this.isDialogOpen = true;
        this.game.pause(false);
        console.debug('Dialog opened:', title);
    }

    /**
     * Hide the dialog
     */
    hideDialog() {
        const onContinue = this._onContinue;
        this._onContinue = null;
        this.hide();
        this.isDialogOpen = false;
        this.game.resume(false);
        if (onContinue) onContinue();
        console.debug('Dialog closed');
    }
}