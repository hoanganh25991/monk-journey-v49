import { RemotePlayerManager } from './RemotePlayerManager.js';
import { MultiplayerUIManager } from './MultiplayerUIManager.js';
import { MultiplayerConnectionManager } from './MultiplayerConnectionManager.js';
import { BinarySerializer } from './BinarySerializer.js';

/**
 * Manages multiplayer functionality using WebRTC
 * Handles game state synchronization and coordinates UI and connection managers
 */
export class MultiplayerManager {
    /**
     * Initialize the multiplayer manager
     * @param {Game} game - The main game instance
     */
    constructor(game) {
        this.game = game;
        this.remotePlayerManager = null;
        this._lastBroadcast = 0; // Timestamp of last state broadcast
        this._lastUpdateLog = 0; // Timestamp of last update log
        this._lastGameStateLog = 0; // Timestamp of last game state log
        this._lastReceivedGameStateTime = 0; // Member: last time we got gameState (for gap detection)
        this._slowGapNotified = false; // Member: only notify once per gap
        
        // Player colors for multiplayer
        this.playerColors = [
            '#FF5733', // Red-Orange
            '#33FF57', // Green
            '#3357FF', // Blue
            '#FF33F5', // Pink
            '#F5FF33', // Yellow
            '#33FFF5', // Cyan
            '#FF8333', // Orange
            '#8333FF'  // Purple
        ];
        this.assignedColors = new Map(); // Map of assigned colors by peer ID
        /** localStorage key for this device's persistent Peer ID (same forever until clear storage) */
        this._storageKeyMyPeerId = 'monkJourney_myPeerId';

        // Create UI and connection managers
        this.ui = new MultiplayerUIManager(this);
        this.connection = new MultiplayerConnectionManager(this);
    }

    /**
     * Get this device's persistent Peer ID for PeerJS. Created once, used forever (host and joiner).
     * So roomId never changes when resuming host, and host recognizes same joiner on reconnect.
     * @returns {string} UUID
     */
    getMyPersistentPeerId() {
        try {
            let id = localStorage.getItem(this._storageKeyMyPeerId);
            if (!id) {
                id = typeof crypto !== 'undefined' && crypto.randomUUID
                    ? crypto.randomUUID()
                    : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
                        const r = (Math.random() * 16) | 0;
                        const v = c === 'x' ? r : (r & 0x3) | 0x8;
                        return v.toString(16);
                    });
                localStorage.setItem(this._storageKeyMyPeerId, id);
            }
            return id;
        } catch (_) {
            return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, () =>
                ((Math.random() * 16) | 0).toString(16));
        }
    }

    /**
     * Initialize the multiplayer manager
     * @returns {Promise<boolean>} True if initialization was successful
     */
    async init() {
        try {
            // Create persistent Peer ID on first load so roomID is on-hand and persistent for this device
            this.getMyPersistentPeerId();

            // Initialize RemotePlayerManager
            this.remotePlayerManager = new RemotePlayerManager(this.game);
            
            // Initialize UI manager
            await this.ui.init();
            
            // Initialize connection manager
            await this.connection.init();
            
            console.debug('Multiplayer manager initialized');
            return true;
        } catch (error) {
            console.error('Error initializing multiplayer manager:', error);
            return false;
        }
    }

    /**
     * Host a new game (or resume with previous room ID after network issue).
     * @param {string} [previousRoomId] - If set, host with this room ID so joiners can rejoin the same room.
     */
    async hostGame(previousRoomId) {
        return this.connection.hostGame(previousRoomId);
    }

    /**
     * Join an existing game
     * @param {string} roomId - The room ID to join
     */
    async joinGame(roomId) {
        return this.connection.joinGame(roomId);
    }

    /**
     * Process player input (host only)
     * @param {string} peerId - The ID of the peer
     * @param {Object} data - The input data
     */
    processPlayerInput(peerId, data) {
        // Update player state based on input
        // This will depend on your game's input system
        console.debug('Processing input from player', peerId, data);
    }
    
    /**
     * Update game state (member only)
     * @param {Object} data - The game state data
     */
    updateGameState(data) {
        this._lastReceivedGameStateTime = Date.now();
        this._slowGapNotified = false;
        const shouldLog = Math.random() < 0.01;
        if (shouldLog) {
            console.debug('[MultiplayerManager] Received game state update from host');
        }
        
        // Update player positions (with reduced logging)
        if (data.players) {
            if (shouldLog) {
                console.debug('[MultiplayerManager] Updating', Object.keys(data.players).length, 'players');
            }
            
            Object.entries(data.players).forEach(([playerId, playerData]) => {
                if (playerId !== this.connection.peer.id) {
                    // Only update remote players if we have valid position data
                    if (playerData.position && playerData.rotation) {
                        // Process position data - could be array [x,y,z] or object {x,y,z}
                        let position = playerData.position;
                        if (Array.isArray(position)) {
                            position = BinarySerializer.restoreVector(position);
                        }
                        
                        // Process rotation data - could be number (y) or object {y}
                        let rotation;
                        if (typeof playerData.rotation === 'number') {
                            rotation = BinarySerializer.restoreRotation(playerData.rotation);
                        } else {
                            // Create a complete rotation object (we only send y rotation to save bandwidth)
                            rotation = {
                                x: 0,
                                y: playerData.rotation.y || 0,
                                z: 0
                            };
                        }
                        
                        this.remotePlayerManager.updatePlayer(
                            playerId,
                            position,
                            rotation,
                            playerData.animation,
                            playerData.modelId,
                            playerData.playerColor
                        );
                    }
                }
            });
        }
        
        // Update enemies - this is the primary focus
        if (data.enemies && this.game.enemyManager) {
            if (shouldLog) {
                console.debug('[MultiplayerManager] Updating enemies from host data');
            }
            
            // Update enemy positions and states
            this.game.enemyManager.updateEnemiesFromHost(data.enemies);
        }
    }

    /**
     * Check if multiplayer is active
     * @returns {boolean} True if multiplayer is active
     */
    isActive() {
        return this.connection && 
               (this.connection.isHost || this.connection.isConnected) && 
               this.remotePlayerManager !== null;
    }

    /**
     * Get all player positions for spawn anchors (host + joiners). Used by host to spawn/cleanup
     * enemies around every player so joiners can play independently on the large map.
     * @returns {Array<{x: number, y: number, z: number}>|null} Array of positions, or null if not host
     */
    getSpawnAnchorPositions() {
        if (!this.isActive() || !this.connection.isHost || !this.game?.player) {
            return null;
        }
        const positions = [];
        const hostPos = this.game.player.getPosition?.();
        if (hostPos && !isNaN(hostPos.x)) {
            positions.push({ x: hostPos.x, y: hostPos.y ?? 0, z: hostPos.z });
        }
        this.remotePlayerManager.getPlayers().forEach((remote) => {
            if (remote?.group?.position && !isNaN(remote.group.position.x)) {
                const p = remote.group.position;
                positions.push({ x: p.x, y: p.y, z: p.z });
            }
        });
        return positions.length > 0 ? positions : null;
    }

    /**
     * Report an enemy kill to the host (member only). When a joiner kills an enemy locally,
     * this syncs the death to the host so the host can remove it and grant drops/XP.
     * @param {string} enemyId - The ID of the enemy that was killed
     */
    reportEnemyKilled(enemyId) {
        if (!this.connection || this.connection.isHost || !enemyId) return;
        this.connection.sendToHost({ type: 'enemyKilled', enemyId });
    }
    
    /**
     * Check if this client is the host
     * @returns {boolean} True if this client is the host
     */
    get isHost() {
        return this.connection && this.connection.isHost;
    }
    
    /**
     * Start multiplayer game (host only)
     */
    startMultiplayerGame() {
        if (!this.connection.isHost) return;
        
        // Notify all peers that game is starting
        this.connection.broadcast({
            type: 'startGame'
        });
        
        // Host controls enemies; tell EnemyManager so only host spawns/updates authority
        if (this.game.enemyManager) {
            this.game.enemyManager.setMultiplayerMode(true, true);
        }
        
        // Close multiplayer modal
        this.ui.closeMultiplayerModal();
        
        // Hide the Game Menu first if it's visible
        if (this.game.menuManager) {
            console.debug('[MultiplayerManager] Hiding Game Menu before starting multiplayer game');
            this.game.menuManager.hideActiveMenu();
        }
        
        // HUD and home button are shown by Game after warmup
        
        // Store current player level and stats before starting
        let currentLevel = null;
        let currentExp = null;
        if (this.game.player && this.game.player.stats) {
            console.debug('[MultiplayerManager] Preserving host player level and experience');
            currentLevel = this.game.player.getLevel();
            currentExp = this.game.player.stats.getCurrentExperience();
        }
        
        // Start the game - this will properly initialize the game state
        console.debug('[MultiplayerManager] Starting multiplayer game - calling game.start()');
        // Pass true to indicate this is a loaded game to preserve player position
        // For host, we want fullscreen mode, so pass true for requestFullscreenMode
        this.game.start(true, true);
        
        // Restore player level and experience if we had them
        if (currentLevel !== null && this.game.player && this.game.player.stats) {
            console.debug(`[MultiplayerManager] Restoring host player level (${currentLevel}) and experience (${currentExp})`);
            
            // Set level directly through stats to avoid triggering level up notifications
            this.game.player.stats.setLevel(currentLevel);
            if (currentExp !== null) {
                this.game.player.stats.setExperience(currentExp);
            }
            
            // Update HUD to reflect restored level
            if (this.game.hudManager) {
                this.game.hudManager.updatePlayerStats();
            }
        }
    }
    
    /**
     * Start the game (both host and member)
     */
    startGame() {
        console.debug('[MultiplayerManager] Starting game...');
        
        // Close multiplayer modal if it's open
        this.ui.closeMultiplayerModal();
        
        // Hide the Game Menu first if it's visible
        if (this.game.menuManager) {
            console.debug('[MultiplayerManager] Hiding Game Menu');
            this.game.menuManager.hideActiveMenu();
        }
        
        // For members, we need to ensure the game is fully started
        if (!this.connection.isHost) {
            console.debug('[MultiplayerManager] Member starting game - calling game.start()');
            
            // Members receive enemy state from host; no local spawning
            if (this.game.enemyManager) {
                this.game.enemyManager.setMultiplayerMode(true, false);
            }
            
            // HUD and home button are shown by Game after warmup
            
            // Store current player level and stats before starting
            let currentLevel = null;
            let currentExp = null;
            if (this.game.player && this.game.player.stats) {
                console.debug('[MultiplayerManager] Preserving player level and experience');
                currentLevel = this.game.player.getLevel();
                currentExp = this.game.player.stats.getCurrentExperience();
            }
            
            // Start the game - this will properly initialize the game state
            // Pass true to indicate this is a loaded game to preserve player position
            // For members, we don't want to request fullscreen mode again (host already did it)
            // so pass false for requestFullscreenMode
            console.debug('[MultiplayerManager] Member starting game without fullscreen request');
            this.game.start(true, false);
            
            // Restore player level and experience if we had them
            if (currentLevel !== null && this.game.player && this.game.player.stats) {
                console.debug(`[MultiplayerManager] Restoring player level (${currentLevel}) and experience (${currentExp})`);
                
                // Set level directly through stats to avoid triggering level up notifications
                this.game.player.stats.setLevel(currentLevel);
                if (currentExp !== null) {
                    this.game.player.stats.setExperience(currentExp);
                }
                
                // Update HUD to reflect restored level
                if (this.game.hudManager) {
                    this.game.hudManager.updatePlayerStats();
                }
            }
        } else {
            // For host, the game should already be started by startMultiplayerGame()
            console.debug('[MultiplayerManager] Host starting game - ensuring game state is running');
            
            // Just make sure the game state is set to running
            if (this.game.state) {
                this.game.state.setRunning();
            }
        }
    }
    
    /**
     * Update method called every frame
     * @param {number} deltaTime - Time elapsed since the last frame
     */
    update(deltaTime) {
        // Single-player: no connection, nothing to sync. Avoid touching connection at all.
        if (!this.isActive()) {
            if (this.remotePlayerManager) {
                this.remotePlayerManager.update(deltaTime);
            }
            return;
        }
        
        // Log update status occasionally (every 3 seconds)
        const now = Date.now();
        if (!this._lastUpdateLog || now - this._lastUpdateLog > 3000) {
            // console.debug('[MultiplayerManager] Update called - isHost:', this.connection.isHost, 'isConnected:', this.connection.isConnected, 'peers:', this.connection.peers.size, 'game state:', this.game.state ? (this.game.state.isRunning() ? 'running' : 'not running') : 'unknown');
            this._lastUpdateLog = now;
        }
        
        // Update remote players
        if (this.remotePlayerManager) {
            this.remotePlayerManager.update(deltaTime);
        }
        
        // If connected as member, send player data to host
        if (!this.connection.isHost && this.connection.isConnected) {
            // Check if game is running
            if (this.game.state && this.game.state.isRunning()) {
                this.connection.sendPlayerData();
            } else {
                // Log this issue occasionally
                if (!this._lastGameStateLog || now - this._lastGameStateLog > 3000) {
                    console.debug('[MultiplayerManager] Member not sending data because game is not running');
                    this._lastGameStateLog = now;
                }
            }
        }
        
        // If host, broadcast game state to members
        if (this.connection.isHost && this.connection.peers.size > 0) {
            if (!this._lastBroadcast || Date.now() - this._lastBroadcast > 50) {
                this.connection.broadcastGameState();
                this._lastBroadcast = Date.now();
            }
        }
        
        // Member: notify when sync gap too long (auto local when lost is already in handleHostDisconnection)
        if (!this.connection.isHost && this.connection.isConnected && this._lastReceivedGameStateTime > 0) {
            const gap = Date.now() - this._lastReceivedGameStateTime;
            if (gap > 4000 && !this._slowGapNotified) {
                this._slowGapNotified = true;
                if (this.game.hudManager) {
                    this.game.hudManager.showNotification('Connection slow…', 'info');
                }
            }
        }
    }
    
    /**
     * Leave the current multiplayer game (explicit disconnect).
     * Disconnects from all peers and cleans up resources.
     * Clears stored roomId (host or joiner) so we don't offer Resume / Join to existing host next time.
     */
    leaveGame() {
        console.debug('[MultiplayerManager] Leaving multiplayer game');
        const wasHost = this.connection.isHost;
        const hostId = this.connection.hostId; // joiner's current host (capture before dispose)

        // Notify other players if we're the host
        if (wasHost && this.connection.peers.size > 0) {
            this.connection.broadcast({
                type: 'hostLeft'
            });
        }

        // Clean up connections
        if (this.connection) {
            this.connection.dispose();
        }

        // Explicit disconnect: host clears their room ID; joiner removes this host from joined list.
        // On network/lag disconnect we do not call leaveGame(), so stored IDs stay for rejoin/resume.
        if (wasHost) this.ui.clearLastHostRoomId();
        else {
            if (hostId) this.ui.removeJoinedHostId(hostId);
            this.ui.clearReconnectRetry();
        }

        // Clean up remote players
        if (this.remotePlayerManager) {
            this.remotePlayerManager.removeAllPlayers();
        }

        // Reset game state if needed
        if (this.game.state && this.game.state.isRunning()) {
            // Return to main menu
            if (this.game.menuManager) {
                this.game.menuManager.showMainMenu();
            }
        }

        // Show notification
        if (this.game.hudManager) {
            this.game.hudManager.showNotification('Disconnected from multiplayer game', 'info');
        }
    }

    /**
     * Clean up resources
     */
    dispose() {
        // Dispose connection manager
        if (this.connection) {
            this.connection.dispose();
        }
        
        // Dispose remote player manager
        if (this.remotePlayerManager) {
            // Clean up remote players if needed
        }
    }
}