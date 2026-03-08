/**
 * GameMenu.js
 * Manages the main game menu UI component
 */

import { IMenu } from './IMenu.js';
import { CHAPTER_QUESTS } from '../config/chapter-quests.js';
import { getChapterQuestDisplay } from '../config/chapter-quests-locales.js';

export class GameMenu extends IMenu {
    /**
     * Create a game menu
     * @param {Game} game - The game instance
     */
    constructor(game) {
        super('game-menu', game);
        this.loadGameButton = document.getElementById('load-game-button');
        this.settingsMenuButton = document.getElementById('settings-menu-button');
        this.helpMenuButton = document.getElementById('help-menu-button');
        this.storyMenuButton = document.getElementById('story-menu-button');
        this.googleSignInButton = document.getElementById('google-signin-button');
        this.multiplayerButton = document.getElementById('multiplayer-button');
        this.setupEventListeners();
        
        // Listen for Google sign-in/sign-out events
        window.addEventListener('google-signin-success', () => this.updateGoogleSignInButton(true));
        window.addEventListener('google-signout', () => this.updateGoogleSignInButton(false));
    }
    


    /**
     * Update the Google Sign-In button text based on sign-in state
     * @param {boolean} isSignedIn - Whether the user is signed in
     */
    updateGoogleSignInButton(isSignedIn) {
        if (this.googleSignInButton) {
            this.googleSignInButton.textContent = isSignedIn 
                ? "Sign out from Google" 
                : "Sign in with Google";
            this.googleSignInButton.disabled = false;
        }
    }

    /**
     * Set up event listeners for menu buttons
     * @private
     */
    setupEventListeners() {
        // Play Game button - show only if save data exists
        if (this.loadGameButton) {
            this.loadGameButton.addEventListener('click', async () => {
                console.debug("Continue Game button clicked - attempting to load saved game...");
                if (this.game.hasStarted) {
                    // Game has been started but is currently paused
                    console.debug("Resume Game button clicked - resuming game...");
                    this.hide();
                    
                    // Hide the main background when resuming the game


                    // Resume the game
                    this.game.resume(false);
                    
                    // Show all HUD elements
                    if (this.game.hudManager) {
                        this.game.hudManager.showAllUI();
                    }
                    
                    console.debug("Game resumed - enemies and player are now active");
                } else  if (this.game.saveManager && this.game.saveManager.hasSaveData()) {
                    try {
                        const loadResult = await this.game.saveManager.loadGame();
                        
                        if (loadResult) {
                            console.debug("Game data loaded successfully");
                            this.hide();
                            
                            // Start the game with loaded data - HUD is shown by Game after warmup
                            this.game.start(true);
                            
                            console.debug("Game started with loaded data - enemies and player are now active");
                        } else {
                            console.debug("No save data found or failed to load, starting new game instead");
                            
                            this.hide();
                            this.game.start(false);
                        }
                    } catch (error) {
                        console.error("Error loading game data:", error);
                        alert('An error occurred while loading the game. Starting a new game instead.');
                        
                        this.hide();
                        this.game.start(false);
                    }
                } else {
                    // Game has never been started - start a new game (HUD shown by Game after warmup)
                    console.debug("New Game button clicked - starting new game...");
                    this.hide();
                    this.game.start(false);
                    console.debug("New game started - enemies and player are now active");
                }
            })
        }

        // Help button
        if (this.helpMenuButton) {
            this.helpMenuButton.addEventListener('click', () => this.showHelpModal());
        }
        const helpModalClose = document.getElementById('help-modal-close-btn');
        if (helpModalClose) {
            helpModalClose.addEventListener('click', () => this.hideHelpModal());
        }
        const helpBackdrop = document.querySelector('#help-modal .help-modal-backdrop');
        if (helpBackdrop) {
            helpBackdrop.addEventListener('click', () => this.hideHelpModal());
        }

        if (this.storyMenuButton) {
            this.storyMenuButton.addEventListener('click', () => this.showStoryModal());
        }
        const storyModalClose = document.getElementById('story-modal-close-btn');
        if (storyModalClose) {
            storyModalClose.addEventListener('click', () => this.hideStoryModal());
        }
        const storyBackdrop = document.querySelector('#story-modal .help-modal-backdrop');
        if (storyBackdrop) {
            storyBackdrop.addEventListener('click', () => this.hideStoryModal());
        }

        // Settings button
        if (this.settingsMenuButton) {
            this.settingsMenuButton.addEventListener('click', () => {
                // Use the menu manager to show the settings menu
                if (this.game.menuManager) {
                    this.game.menuManager.showMenu('settingsMenu');
                }
            });
        }
        
        // Google Sign-In button
        if (this.googleSignInButton) {
            this.googleSignInButton.addEventListener('click', async () => {
                console.debug("Google Sign-In button clicked");
                
                if (this.game.saveManager) {
                    if (this.game.saveManager.isSignedInToGoogle()) {
                        // Sign out
                        this.game.saveManager.signOutFromGoogle();
                        this.googleSignInButton.textContent = "Sign in with Google";
                    } else {
                        // Sign in
                        this.googleSignInButton.textContent = "Signing in...";
                        this.googleSignInButton.disabled = true;
                        
                        const success = await this.game.saveManager.signInToGoogle();
                        
                        if (success) {
                            this.googleSignInButton.textContent = "Sign out from Google";
                        } else {
                            this.googleSignInButton.textContent = "Sign in with Google";
                        }
                        
                        this.googleSignInButton.disabled = false;
                    }
                }
            });
            
            // Update button text based on current sign-in state
            if (this.game.saveManager && this.game.saveManager.isSignedInToGoogle()) {
                this.googleSignInButton.textContent = "Sign out from Google";
            }
        }
        

    }

    showHelpModal() {
        const el = document.getElementById('help-modal');
        if (el) el.style.display = 'flex';
    }

    hideHelpModal() {
        const el = document.getElementById('help-modal');
        if (el) el.style.display = 'none';
    }

    showStoryModal() {
        const content = document.getElementById('story-modal-content');
        const completedEl = document.getElementById('story-completed-list');
        const nextEl = document.getElementById('story-next-chapter');
        if (!content || !completedEl || !nextEl) return;

        const qm = this.game.questManager;
        if (!qm) {
            completedEl.innerHTML = '<p>Start or load a game to track your journey.</p>';
            nextEl.innerHTML = '';
        } else {
            const locale = (this.game && this.game.questStoryLocale) ? this.game.questStoryLocale : 'en';
            const completed = [];
            for (const q of CHAPTER_QUESTS) {
                if (qm.completedChapterQuestIds && qm.completedChapterQuestIds.has(q.id)) {
                    const d = getChapterQuestDisplay(q, locale);
                    completed.push({ area: d.area, lesson: d.lesson });
                }
            }
            if (completed.length > 0) {
                completedEl.innerHTML = '<h3>Completed</h3><ul class="story-journal-list">' +
                    completed.map(c => `<li><strong>${c.area}</strong> — ${c.lesson}</li>`).join('') +
                    '</ul>';
            } else {
                completedEl.innerHTML = '<p>Complete chapter quests to fill your journal.</p>';
            }
            const activeChapter = qm.getActiveChapterQuest && qm.getActiveChapterQuest();
            const nextChapter = activeChapter
                ? CHAPTER_QUESTS.find(q => q.id === activeChapter.id)
                : (completed.length < CHAPTER_QUESTS.length ? CHAPTER_QUESTS[completed.length] : null);
            if (nextChapter) {
                const nextDisplay = getChapterQuestDisplay(nextChapter, locale);
                nextEl.innerHTML = `<p><strong>Next:</strong> ${nextDisplay.area} — ${nextDisplay.title}</p>`;
            } else {
                nextEl.innerHTML = completed.length >= CHAPTER_QUESTS.length ? '<p>You have completed the main journey. Enter the Path of Mastery for more.</p>' : '';
            }
        }

        const el = document.getElementById('story-modal');
        if (el) el.style.display = 'flex';
    }

    hideStoryModal() {
        const el = document.getElementById('story-modal');
        if (el) el.style.display = 'none';
    }

    /**
     * Get the menu type/name
     * @returns {string} The menu type/name
     */
    getType() {
        return 'gameMenu';
    }

    /**
     * Show the game menu
     */
    show() {
        if (this.element) {
            // Hide all HUD UI elements using the HUDManager
            if (this.game.hudManager) {
                this.game.hudManager.hideAllUI();
            }
            // Clear invite notification (host saw the menu)
            if (this.game.multiplayerManager?.ui) {
                this.game.multiplayerManager.ui.clearInviteNotification();
            }
            // Make sure the menu is visible
            this.element.style.display = 'flex';
        }
    }

    /**
     * Hide the game menu
     */
    hide() {
        if (this.element) {
            this.element.style.display = 'none';
        }
    }

    /**
     * Clean up resources
     */
    dispose() {
        // We don't remove the element since it's defined in the HTML
        // Just hide it
        if (this.element) {
            this.element.style.display = 'none';
        }
        
        if (this.settingsMenu) {
            this.settingsMenu.dispose();
        }
        
        this.settingsMenu = null;
    }
}