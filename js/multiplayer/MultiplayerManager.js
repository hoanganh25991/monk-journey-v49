import { RemotePlayerManager } from './RemotePlayerManager.js';
import { MultiplayerUIManager } from './MultiplayerUIManager.js';
import { MultiplayerConnectionManager } from './MultiplayerConnectionManager.js';
import { BinarySerializer } from './BinarySerializer.js';

/** Set to true to log game state updates (debug). */
const shouldLog = false;

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
        this._lastBroadcast = 0;
        /** Host: fixed 33ms interval for broadcast (tick-aligned). */
        this._broadcastIntervalId = null;
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
            // Start join listener so we can receive "Request" from Host even when not in Multiplayer screen (playing, menu, etc.)
            if (this.connection.startJoinListener) {
                this.connection.startJoinListener();
            }
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
     * Process player input (host only). Applies joystick/movement and jump to remote player simulation.
     * @param {string} peerId - The ID of the peer
     * @param {Object} data - The input data { moveX, moveZ, jumpPressed }
     */
    processPlayerInput(peerId, data) {
        const remotePlayer = this.remotePlayerManager.getPlayer(peerId);
        if (!remotePlayer) return;
        const moveX = typeof data.moveX === 'number' ? data.moveX : 0;
        const moveZ = typeof data.moveZ === 'number' ? data.moveZ : 0;
        remotePlayer.setMovementInput(moveX, moveZ);
        if (data.jumpPressed) {
            remotePlayer.requestJump();
        }
    }
    
    /**
     * Reconcile joiner's local position with host-authoritative position so host and joiner stay in sync.
     * Prevents "joiner sees only himself" (host avatar off-screen) when positions diverge from input/network.
     * @param {Object} hostPos - { x, y, z } from gameState.players[self]
     * @param {Object} hostRot - rotation from gameState
     * @param {boolean} fullSync - true on fullSync tick; snap immediately for big correction
     */
    _reconcileLocalPosition(hostPos, hostRot, fullSync) {
        if (!this.game?.player?.movement || !hostPos || typeof hostPos.x !== 'number') return;
        const pos = this.game.player.getPosition();
        const dx = hostPos.x - pos.x, dy = (hostPos.y ?? 0) - pos.y, dz = hostPos.z - pos.z;
        const distSq = dx * dx + dy * dy + dz * dz;
        const snapThresholdSq = 9; // 3 units: snap if desync is large
        const doSnap = fullSync || distSq > snapThresholdSq;
        const x = doSnap ? hostPos.x : pos.x + dx * 0.2;
        const y = doSnap ? (hostPos.y ?? pos.y) : pos.y + dy * 0.2;
        const z = doSnap ? hostPos.z : pos.z + dz * 0.2;
        if (isNaN(x) || isNaN(y) || isNaN(z)) return;
        this.game.player.setPosition(x, y, z);
        this.game.player.movement.targetPosition.set(x, y, z);
        if (hostRot && typeof hostRot.y === 'number' && !isNaN(hostRot.y)) {
            this.game.player.movement.rotation.y = hostRot.y;
            if (this.game.player.movement.modelGroup) {
                this.game.player.movement.modelGroup.rotation.y = hostRot.y;
            }
        }
    }

    /**
     * Update game state (member only)
     * @param {Object} data - The game state data
     */
    updateGameState(data) {
        this._lastReceivedGameStateTime = Date.now();
        this._slowGapNotified = false;
        if (data.removedIds?.length && this.game.enemyManager) {
            this.game.enemyManager.removeEnemiesByIds(data.removedIds);
        }
        if (data.players) {
            if (shouldLog) {
                console.debug('[MultiplayerManager] Updating', Object.keys(data.players).length, 'players');
            }
            
            const myId = this.connection.peer.id;
            for (const playerId in data.players) {
                const playerData = data.players[playerId];
                if (!playerData?.position || playerData.rotation === undefined) continue;
                let position = playerData.position;
                if (Array.isArray(position)) position = BinarySerializer.restoreVector(position);
                const rotation = typeof playerData.rotation === 'number'
                    ? BinarySerializer.restoreRotation(playerData.rotation)
                    : { x: 0, y: playerData.rotation?.y ?? 0, z: 0 };

                // Joiner: reconcile our own position from host authority so we don't diverge (host sees us together, we see host)
                if (playerId === myId) {
                    this._reconcileLocalPosition(position, rotation, !!data.fullSync);
                    continue;
                }
                this.remotePlayerManager.updatePlayer(
                    playerId, position, rotation,
                    playerData.animation, playerData.modelId, playerData.playerColor
                );
            }
        }
        if (data.enemies && this.game.enemyManager) {
            this.game.enemyManager.updateEnemiesFromHost(data.enemies, !!data.fullSync);
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
     * Host only: clear all enemies locally and broadcast so all joiners get a clean state.
     * Call when you need to force-clean (e.g. cheat Ctrl+Shift+E or after clearing).
     */
    requestEnemiesClearAll() {
        if (!this.connection?.isHost) return;
        this.connection.broadcastEnemiesClearAll();
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
            
            // Joiner: clear all enemies so we start from host state only (avoids stale enemies until first fullSync)
            if (this.game.enemyManager && typeof this.game.enemyManager.removeAllEnemies === 'function') {
                this.game.enemyManager.removeAllEnemies();
            }
            
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
        
        // (Pending game state is drained in Game.animate() at frame start so sync never blocks; goal 120 FPS)
        
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
        
        // If connected as member, send initial position once then input every frame (action sync instead of position sync)
        if (!this.connection.isHost && this.connection.isConnected) {
            if (this.game.state && this.game.state.isRunning()) {
                if (!this.connection._initialPositionSent) {
                    this.connection.sendInitialPosition();
                }
                this.connection.sendPlayerInput();
            } else {
                if (!this._lastGameStateLog || now - this._lastGameStateLog > 3000) {
                    this._lastGameStateLog = now;
                }
            }
        }
        
        // Host: run broadcast on fixed 33ms interval (tick-aligned, not tied to rAF)
        if (this.connection.isHost && this.connection.peers.size > 0) {
            if (!this._broadcastIntervalId) {
                this._broadcastIntervalId = setInterval(() => {
                    if (!this.connection?.isHost || this.connection.peers.size === 0) {
                        if (this._broadcastIntervalId) clearInterval(this._broadcastIntervalId);
                        this._broadcastIntervalId = null;
                        return;
                    }
                    this.connection.broadcastGameState();
                }, 33);
            }
        } else {
            if (this._broadcastIntervalId) {
                clearInterval(this._broadcastIntervalId);
                this._broadcastIntervalId = null;
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

        if (this._broadcastIntervalId) {
            clearInterval(this._broadcastIntervalId);
            this._broadcastIntervalId = null;
        }
        if (this.connection) {
            this.connection.dispose();
        }

        // Explicit disconnect: host clears their room ID. Joiner keeps host in contacts (remove only via Manage > Remove).
        // On network/lag disconnect we do not call leaveGame(), so stored IDs stay for rejoin/resume.
        if (wasHost) this.ui.clearLastHostRoomId();
        else this.ui.clearReconnectRetry();

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

        // Start join listener again so we can receive "Request" from Host (playing, menu, etc.)
        if (this.connection && this.connection.startJoinListener) {
            this.connection.startJoinListener();
        }
    }

    /**
     * Clean up resources
     */
    dispose() {
        if (this._broadcastIntervalId) {
            clearInterval(this._broadcastIntervalId);
            this._broadcastIntervalId = null;
        }
        if (this.connection) {
            this.connection.dispose();
        }
        
        // Dispose remote player manager
        if (this.remotePlayerManager) {
            // Clean up remote players if needed
        }
    }
}