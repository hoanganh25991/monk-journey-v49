/**
 * Manages the game state (running, paused, etc.)
 */
export class GameState {
    constructor() {
        this._isPaused = true; // Game starts in paused state
        this._hasStarted = false; // Track if game has been started at least once
        this._hitPauseRemaining = 0; // ms remaining for hit-pause (enemies frozen)
    }
    
    /**
     * Check if the game is currently paused
     * @returns {boolean} True if the game is paused
     */
    isPaused() {
        return this._isPaused;
    }
    
    /**
     * Check if the game is currently running
     * @returns {boolean} True if the game is running
     */
    isRunning() {
        return !this._isPaused;
    }
    
    /**
     * Check if the game has been started at least once
     * @returns {boolean} True if the game has been started
     */
    hasStarted() {
        return this._hasStarted;
    }
    
    /**
     * Set the game to paused state
     */
    setPaused() {
        this._isPaused = true;
    }
    
    /**
     * Set the game to running state
     */
    setRunning() {
        this._isPaused = false;
        this._hasStarted = true; // Mark that game has been started
    }
    
    /**
     * Toggle the game's pause state
     * @returns {boolean} The new pause state (true if paused)
     */
    togglePause() {
        this._isPaused = !this._isPaused;
        return this._isPaused;
    }

    /**
     * Freeze enemies for a short moment on a significant hit (hitstop).
     * @param {number} ms - Duration in milliseconds (default 70)
     */
    triggerHitPause(ms = 70) {
        this._hitPauseRemaining = Math.max(this._hitPauseRemaining, ms);
    }

    /** @returns {boolean} True while hit-pause is active */
    isHitPaused() {
        return this._hitPauseRemaining > 0;
    }

    /**
     * Advance the hit-pause timer. Call once per frame with delta in ms.
     * @param {number} deltaMs
     */
    tickHitPause(deltaMs) {
        if (this._hitPauseRemaining > 0) {
            this._hitPauseRemaining = Math.max(0, this._hitPauseRemaining - deltaMs);
        }
    }
}