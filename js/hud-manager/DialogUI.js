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
        this.dialogCancelBtn = null;
        this.isDialogOpen = false;
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
        this.dialogAcceptBtn = document.getElementById('dialog-accept-btn');
        this.dialogCancelBtn = document.getElementById('dialog-cancel-btn');
        
        // Click on "Continue" or overlay: close (if no onAccept, or decline)
        this.container.addEventListener('click', (e) => {
            if (e.target === this.dialogAcceptBtn || e.target === this.dialogCancelBtn) return;
            this.hideDialog();
        });
        if (this.dialogContinue) {
            this.dialogContinue.addEventListener('click', (e) => { e.stopPropagation(); this.hideDialog(); });
        }
        if (this.dialogAcceptBtn) {
            this.dialogAcceptBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (this._onAccept) {
                    const cb = this._onAccept;
                    this._onAccept = null;
                    this._onDecline = null; // accepted, so do not call decline
                    cb();
                }
                this.hideDialog();
            });
        }
        if (this.dialogCancelBtn) {
            this.dialogCancelBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.hideDialog();
            });
        }
        
        // Hide initially
        this.hide();
        
        return true;
    }
    
    /**
     * Show a dialog with title and text.
     * @param {string} title - Dialog title
     * @param {string} text - Dialog text
     * @param {function} [onAccept] - Optional. If provided, show "Accept" button; clicking it calls onAccept() then closes. Otherwise "Click to continue" (click to close).
     * @param {function} [onDecline] - Optional. If provided with onAccept, called when the dialog is closed without clicking Accept (e.g. overlay click).
     */
    showDialog(title, text, onAccept, onDecline) {
        this._onAccept = typeof onAccept === 'function' ? onAccept : null;
        this._onDecline = typeof onDecline === 'function' ? onDecline : null;
        
        // Update dialog text
        this.dialogText.innerHTML = `<h3>${title}</h3><p>${text.replace(/\n/g, '<br>')}</p>`;
        
        if (this.dialogContinue) {
            this.dialogContinue.style.display = this._onAccept ? 'none' : '';
        }
        if (this.dialogAcceptBtn) {
            this.dialogAcceptBtn.style.display = this._onAccept ? 'inline-block' : 'none';
        }
        if (this.dialogCancelBtn) {
            this.dialogCancelBtn.style.display = this._onAccept ? 'inline-block' : 'none';
        }
        
        // Show dialog box
        this.show();
        this.isDialogOpen = true;
        
        // Pause game
        this.game.pause(false);

        console.debug('Dialog opened:', title, this._onAccept ? '(with Accept)' : '');
    }
    
    /**
     * Hide the dialog
     */
    hideDialog() {
        if (this._onAccept && this._onDecline) {
            try { this._onDecline(); } catch (err) { console.warn('Dialog onDecline error:', err); }
        }
        this._onAccept = null;
        this._onDecline = null;
        if (this.dialogContinue) this.dialogContinue.style.display = '';
        if (this.dialogAcceptBtn) this.dialogAcceptBtn.style.display = 'none';
        if (this.dialogCancelBtn) this.dialogCancelBtn.style.display = 'none';
        // Hide dialog box
        this.hide();
        this.isDialogOpen = false;
        
        // Resume game
        this.game.resume(false);
        
        console.debug('Dialog closed');
    }
}