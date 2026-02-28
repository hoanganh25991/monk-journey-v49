/**
 * MultiplayerConnectionManager.js
 * Handles WebRTC connections, peer management, and data transfer.
 *
 * PeerJS does not provide a client API to list room IDs / active peers. The Join screen
 * uses Enter Code, Sound Invite, QR, NFC, and same-device discovery (BroadcastChannel).
 * To show a list of rooms from a server you would need to run your own PeerServer and
 * add a custom HTTP endpoint that returns peer IDs (tracked via server 'connection'/'disconnect' events).
 */

import { DEFAULT_CHARACTER_MODEL } from '../config/player-models.js';
import { BinarySerializer } from './BinarySerializer.js';

export class MultiplayerConnectionManager {
    /**
     * Initialize the multiplayer connection manager
     * @param {MultiplayerManager} multiplayerManager - Reference to the main multiplayer manager
     */
    constructor(multiplayerManager) {
        this.multiplayerManager = multiplayerManager;
        this.peer = null; // PeerJS instance
        this.peers = new Map(); // Map of connected peers
        this.isHost = false;
        this.isConnected = false;
        this.hostId = null; // ID of the host (if member)
        this.roomId = null; // Room ID (if host)
        /** Host: persistentId (joiner device) -> current peerId (connection). One player per persistentId. */
        this.persistentIdToPeerId = new Map();
        /** Host: peerId -> persistentId (for snap and reconnect dedupe). */
        this.peerIdToPersistentId = new Map();
        /** Joiner: set when host sends hostLeft so we don't auto-retry reconnecting. */
        this._hostLeftIntentional = false;
        /** Member: send position only once on first sync, then only input. */
        this._initialPositionSent = false;
        /** Member: throttle input send to ~30 Hz to match host tick and reduce load. */
        this._lastInputSend = 0;
        /** Host: tick count for full-sync every N ticks (delta sync). */
        this._hostTickCount = 0;
        this.serializer = new BinarySerializer(); // Binary serializer for efficient data transfer
        this.useBinaryFormat = false; // Flag to indicate if binary format is enabled
        /** Joiner: Peer used on Join screen to receive inviteFromHost from Host. Destroyed when leaving Join screen or when joining. */
        this._joinListenerPeer = null;
    }

    /**
     * Initialize the connection manager
     */
    async init() {
        try {
            // Initialize binary serializer
            const serializerInitialized = await this.serializer.init();
            if (serializerInitialized) {
                this.useBinaryFormat = true;
                console.debug('[MultiplayerConnectionManager] Binary serialization enabled');
            } else {
                console.warn('[MultiplayerConnectionManager] Binary serialization failed to initialize, falling back to JSON');
                this.useBinaryFormat = false;
            }
            return true;
        } catch (error) {
            console.error('[MultiplayerConnectionManager] Initialization error:', error);
            this.useBinaryFormat = false;
            return true; // Still return true to allow connection without binary format
        }
    }

    /**
     * Host a new game. Always uses this device's persistent Peer ID so roomId never changes (resume = same room).
     * @param {string} [_unused] - Ignored; we always use getMyPersistentPeerId()
     */
    async hostGame(_unused) {
        this.stopJoinListener();
        const myId = this.multiplayerManager.getMyPersistentPeerId();
        try {
            this.multiplayerManager.ui.updateConnectionStatus('Initializing host...');
            this.peer = new Peer(myId);
            
            // Wait for peer to open
            await new Promise((resolve, reject) => {
                this.peer.on('open', id => {
                    this.roomId = id;
                    this.multiplayerManager.ui.setLastHostRoomId(id);
                    this.multiplayerManager.ui.setLastRole('host');
                    resolve();
                });
                this.peer.on('error', err => reject(err));
            });
            
            // Set host flag
            this.isHost = true;
            this.isConnected = true;
            
            // Update multiplayer button to show "Disconnect"
            this.multiplayerManager.ui.updateMultiplayerButton(true);

            // Assign a color to the host
            const hostColor = this.multiplayerManager.playerColors[0]; // First color for host
            this.multiplayerManager.assignedColors.set(this.roomId, hostColor);
            
            // Update host entry in the player list
            this.multiplayerManager.ui.updateHostEntry(this.roomId, hostColor);
            
            // Set up connection handler
            this.peer.on('connection', conn => {
                this.handleNewConnection(conn);
                // Only show connection info screen when still in lobby (game never started). Once game has started (running or paused e.g. You Died), host stays on current screen — rejoiner gets startGame and drops in.
                if (!this.multiplayerManager.game?.state?.hasStarted?.()) {
                    this.multiplayerManager.ui.showConnectionInfoScreen();
                }
            });
            
            // Show connection info screen immediately
            this.multiplayerManager.ui.showConnectionInfoScreen();
            
            // Update connection status
            this.multiplayerManager.ui.updateConnectionStatus('Waiting for players to join...');
            
            // Allow host to start with or without joiners (joiner can come at start or later)
            this.multiplayerManager.ui.setStartButtonEnabled(true);
            
            return true;
        } catch (error) {
            console.error('Error hosting game:', error);
            this.multiplayerManager.ui.updateConnectionStatus('Error hosting game: ' + error.message);
            return false;
        }
    }

    /**
     * Join an existing game
     * @param {string} roomId - The room ID to join
     */
    async joinGame(roomId) {
        this.stopJoinListener();
        this._joinAttemptRoomId = roomId; // track so we can detect host-unavailable on error/close
        try {
            this.multiplayerManager.ui.updateConnectionStatus('Connecting to host...');
            // Joiner uses a new random Peer so we never get "ID is taken" (e.g. after hosting or reconnect on same device).
            // Host keeps persistent room ID; joiners get a new connection ID each time.
            this.peer = new Peer();
            
            // Wait for peer to open
            await new Promise((resolve, reject) => {
                this.peer.on('open', id => resolve());
                this.peer.on('error', err => reject(err));
            });
            
            // Connect to host
            this.hostId = roomId;
            const conn = this.peer.connect(roomId, {
                reliable: true
            });
            
            // Set up connection
            conn.on('open', () => {
                this._joinAttemptRoomId = null; // join succeeded
                this.multiplayerManager.ui.clearReconnectRetry();
                // Attach data handler first so we don't miss startGame (host sends it immediately on rejoin)
                conn.on('data', data => this.handleDataFromHost(this.processReceivedData(data)));
                conn.on('close', () => this.handleDisconnect(roomId));

                // Auto-store host roomID into Contacts so joiner can rejoin or use Contacts list
                this.multiplayerManager.ui.addJoinedHostId(roomId);
                this.multiplayerManager.ui.clearPendingInviteFromHost();
                this.multiplayerManager.ui.setLastRole('joiner');
                this.multiplayerManager.ui.setHostStatus(roomId, 'online');
                // Add to peers map
                this.peers.set(roomId, conn);
                
                // Set connected flag
                this.isConnected = true;
                
                // Update multiplayer button to show "Disconnect"
                this.multiplayerManager.ui.updateMultiplayerButton(true);
                
                // Update connection status
                this.multiplayerManager.ui.updateConnectionStatus('Connected to host! Waiting for game to start...', 'connection-info-status-bar');
                
                // Show the connection info screen (or rejoin overlay if silent rejoin)
                this.multiplayerManager.ui.showConnectionInfoScreen();
                // Ask host for startGame now that we're ready to receive (avoids race where host sent startGame before we attached handler)
                // Send persistentId so host can dedupe one player per device (off->on->off->on = same slot)
                this.sendToHost({
                    type: 'requestStartGame',
                    persistentId: this.multiplayerManager.getMyPersistentPeerId()
                });
            });
            
            conn.on('error', (err) => {
                console.error('Connection error:', err);
                if (this._joinAttemptRoomId === roomId) {
                    this._joinAttemptRoomId = null;
                    this.multiplayerManager.ui.onJoinToHostFailed(roomId);
                } else {
                    this.multiplayerManager.ui.updateConnectionStatus('Connection error: ' + err.message);
                }
            });
            
            conn.on('close', () => {
                if (this._joinAttemptRoomId === roomId) {
                    this._joinAttemptRoomId = null;
                    this.multiplayerManager.ui.onJoinToHostFailed(roomId);
                }
            });
            
            return true;
        } catch (error) {
            console.error('Error joining game:', error);
            this._joinAttemptRoomId = null;
            this.multiplayerManager.ui.updateConnectionStatus('Error joining game: ' + error.message);
            return false;
        }
    }

    /**
     * Start listening for inviteFromHost (Host tapped Request). Use persistent peer id so Host can reach us. Call when Join screen is shown.
     */
    startJoinListener() {
        if (this._joinListenerPeer || this.isHost || this.isConnected) return;
        const persistentId = this.multiplayerManager.getMyPersistentPeerId();
        try {
            this._joinListenerPeer = new Peer(persistentId);
            this._joinListenerPeer.on('connection', (conn) => this._handleInviteFromHostConnection(conn));
            this._joinListenerPeer.on('error', () => { /* e.g. ID taken; ignore */ });
        } catch (_) {
            this._joinListenerPeer = null;
        }
    }

    /** Stop the Join-screen listener (when leaving Join screen or when joining a host). */
    stopJoinListener() {
        if (this._joinListenerPeer) {
            try { this._joinListenerPeer.destroy(); } catch (_) {}
            this._joinListenerPeer = null;
        }
    }

    /**
     * Handle incoming connection on Join screen: if first message is inviteFromHost, notify UI and close.
     * @param {DataConnection} conn - Incoming connection from Host who tapped Request
     */
    _handleInviteFromHostConnection(conn) {
        conn.once('data', (data) => {
            let raw = data;
            if (typeof raw === 'string') {
                try { raw = JSON.parse(raw); } catch (_) {}
            }
            const d = raw && typeof raw === 'object' ? raw : {};
            if (d.type === 'inviteFromHost' && d.hostRoomId) {
                this.multiplayerManager.ui.showInviteFromHostNotification(d.hostRoomId);
            }
            try { conn.close(); } catch (_) {}
        });
    }

    /**
     * Handle new connection from a member (host only).
     * First message may be statusRequest (ping for rejoin UI) or inviteRequest; otherwise add as game player.
     * @param {DataConnection} conn - The PeerJS connection
     */
    handleNewConnection(conn) {
        conn.once('data', (data) => {
            let raw = data;
            if (typeof raw === 'string') {
                try { raw = JSON.parse(raw); } catch (_) {}
            }
            const d = this.processReceivedData(raw);
            if (d?.type === 'statusRequest') {
                conn.send({ type: 'status', status: this._getHostStatusForPing() });
                conn.close();
                return;
            }
            if (d?.type === 'inviteRequest') {
                this.multiplayerManager.ui.showInviteNotification(conn.peer);
                conn.close();
                return;
            }
            this._addJoinerAsPlayer(conn, d);
            this.handleDataFromMember(conn.peer, d);
        });
    }

    /** Host status for status channel: 'ingame' when playing (game started), else 'hosting' (in lobby). No response = gray (offline/menu). */
    _getHostStatusForPing() {
        return this.multiplayerManager.game?.state?.hasStarted?.() ? 'ingame' : 'hosting';
    }

    /**
     * Add connection as a game player (host only); used after we know it's not an inviteRequest.
     * Same persistentId (joiner device) reconnecting = one slot only; replace old connection.
     * @param {DataConnection} conn - The PeerJS connection
     * @param {Object} [firstMessage] - First message from joiner (may contain persistentId)
     */
    _addJoinerAsPlayer(conn, firstMessage) {
        const persistentId = firstMessage?.persistentId || null;
        const roomId = this.roomId;

        // Reconnect: same device (persistentId) already had a slot — replace old connection
        if (persistentId && this.persistentIdToPeerId.has(persistentId)) {
            const oldPeerId = this.persistentIdToPeerId.get(persistentId);
            const oldConn = this.peers.get(oldPeerId);
            const existingColor = this.multiplayerManager.assignedColors.get(oldPeerId);
            if (oldConn && oldConn !== conn) {
                oldConn.removeAllListeners('close');
                oldConn.close();
            }
            this.peers.delete(oldPeerId);
            this.multiplayerManager.ui.removePlayerFromList(oldPeerId);
            this.multiplayerManager.remotePlayerManager.removePlayer(oldPeerId);
            this.multiplayerManager.assignedColors.delete(oldPeerId);
            this.peerIdToPersistentId.delete(oldPeerId);
            this.persistentIdToPeerId.delete(persistentId);
            this.peers.forEach(peerConn => {
                peerConn.send({ type: 'playerLeft', playerId: oldPeerId });
            });
            // Assign same color to new peerId
            if (existingColor) {
                this.multiplayerManager.assignedColors.set(conn.peer, existingColor);
            }
        }

        conn.removeAllListeners('data');
        this.peers.set(conn.peer, conn);
        const peerId = conn.peer;
        if (persistentId) {
            this.persistentIdToPeerId.set(persistentId, peerId);
            this.peerIdToPersistentId.set(peerId, persistentId);
        }
        const isReconnect = !!persistentId && this.multiplayerManager.ui.getStoredJoiners(roomId)?.some(j => j.persistentId === persistentId);

        // Assign a color only if new (reconnect keeps existing from above or from stored list)
        if (!this.multiplayerManager.assignedColors.has(peerId)) {
            const stored = this.multiplayerManager.ui.getStoredJoiners(roomId);
            const fromStored = stored && persistentId && stored.find(j => j.persistentId === persistentId);
            if (fromStored?.color) {
                this.multiplayerManager.assignedColors.set(peerId, fromStored.color);
            } else {
                const usedColors = Array.from(this.multiplayerManager.assignedColors.values());
                const availableColor = this.multiplayerManager.playerColors.find(color => !usedColors.includes(color)) ||
                                      this.multiplayerManager.playerColors[Math.floor(Math.random() * this.multiplayerManager.playerColors.length)];
                this.multiplayerManager.assignedColors.set(peerId, availableColor);
            }
        }
        const playerColor = this.multiplayerManager.assignedColors.get(peerId);

        this.multiplayerManager.ui.addPlayerToList(peerId, playerColor);
        this.multiplayerManager.ui.setStartButtonEnabled(true);
        this.multiplayerManager.ui.addJoinerContact(peerId, persistentId);
        // Refresh host's Connected Players list so host sees self + all joiners
        this.multiplayerManager.ui.updateConnectionInfoPlayerList();
        conn.on('data', data => this.handleDataFromMember(peerId, this.processReceivedData(data)));
        conn.on('close', () => this.handleDisconnect(peerId));

        conn.send({ type: 'welcome', message: isReconnect ? 'Reconnected to host' : 'Connected to host' });
        const colors = {};
        this.multiplayerManager.assignedColors.forEach((color, id) => { colors[id] = color; });
        conn.send({ type: 'playerColors', colors });

        this.peers.forEach((peerConn, id) => {
            if (id !== peerId) {
                peerConn.send({ type: 'playerJoined', playerId: peerId, playerColor });
            }
        });

        if (!this.multiplayerManager.remotePlayerManager.getPlayer(peerId)) {
            this.multiplayerManager.remotePlayerManager.createRemotePlayer(peerId, playerColor);
        }

        this._snapHostJoinersList();

        const totalCount = 1 + this.peers.size;
        const partyMsg = { type: 'partyBonusUpdate', playerCount: totalCount };
        this.peers.forEach(peerConn => peerConn.send(partyMsg));
        if (this.multiplayerManager.game?.hudManager) {
            this.multiplayerManager.game.hudManager.showNotification(
                isReconnect ? 'Player reconnected!' : `Player joined! Extra EXP active (${totalCount} players).`,
                'info'
            );
        }
        // If game has already been started (running or paused e.g. You Died), send startGame so rejoiner drops in without waiting for host to click Start again
        if (this.multiplayerManager.game?.state?.hasStarted?.()) {
            this.sendToPeer(peerId, { type: 'startGame' });
        }
    }

    /** Host: persist list of joiners (by roomId) to localStorage; call on add/remove. */
    _snapHostJoinersList() {
        if (!this.isHost || !this.roomId) return;
        const list = [];
        this.peers.forEach((_, peerId) => {
            const persistentId = this.peerIdToPersistentId.get(peerId);
            const color = this.multiplayerManager.assignedColors.get(peerId);
            if (persistentId && color) list.push({ persistentId, color });
        });
        this.multiplayerManager.ui.setStoredJoiners(this.roomId, list);
    }

    /**
     * Remove a connection that turned out to be invite-only (host only). Use when we receive inviteRequest from an already-added peer.
     * @param {string} peerId - The peer ID to remove
     */
    _removeJoinerAsInvite(peerId) {
        const conn = this.peers.get(peerId);
        if (conn) conn.close();
        this.peers.delete(peerId);
        this.multiplayerManager.ui.removePlayerFromList(peerId);
        this.multiplayerManager.assignedColors.delete(peerId);
        this.multiplayerManager.remotePlayerManager.removePlayer(peerId);
        this.multiplayerManager.ui.showInviteNotification(peerId);
        this.multiplayerManager.ui.updateConnectionInfoPlayerList();
        // Host can still start without joiners; do not disable Start when last joiner leaves
    }

    /**
     * Handle data received from host (member only)
     * @param {Object} data - The data received from the host
     */
    handleDataFromHost(data) {
        if (!data || !data.type) return;
        
        switch (data.type) {
            case 'welcome':
                console.debug('Received welcome from host:', data.message);
                // Ensure host roomID is in Contacts when joiner is connected to host
                if (this.hostId) this.multiplayerManager.ui.addJoinedHostId(this.hostId);
                break;
            case 'enemiesRemoved':
                if (data.ids && data.ids.length && this.multiplayerManager.game?.enemyManager) {
                    this.multiplayerManager.game.enemyManager.removeEnemiesByIds(data.ids);
                }
                break;
            case 'gameState':
                this.multiplayerManager.updateGameState(data);
                break;
            case 'startGame':
                this.multiplayerManager.startGame();
                break;
            case 'playerJoined':
                // Store the player color
                if (data.playerColor) {
                    this.multiplayerManager.assignedColors.set(data.playerId, data.playerColor);
                }
                
                // Create remote player with the assigned color
                this.multiplayerManager.remotePlayerManager.createRemotePlayer(data.playerId, data.playerColor);
                // Keep joiner's Connected Players list in sync with host
                this.multiplayerManager.ui.updateConnectionInfoPlayerList();
                break;
            case 'playerLeft':
                this.multiplayerManager.remotePlayerManager.removePlayer(data.playerId);
                
                // Remove color assignment
                this.multiplayerManager.assignedColors.delete(data.playerId);
                // Keep joiner's Connected Players list in sync with host
                this.multiplayerManager.ui.updateConnectionInfoPlayerList();
                break;
            case 'playerColors':
                // Update all player colors (full list from host so joiner sees same list as host)
                if (data.colors) {
                    Object.entries(data.colors).forEach(([playerId, color]) => {
                        this.multiplayerManager.assignedColors.set(playerId, color);
                        
                        // Update remote player color if it exists
                        const remotePlayer = this.multiplayerManager.remotePlayerManager.getPlayer(playerId);
                        if (remotePlayer) {
                            remotePlayer.setPlayerColor(color);
                        }
                    });
                }
                // Refresh Connected Players list so joiner sees full list (host + all joiners)
                this.multiplayerManager.ui.updateConnectionInfoPlayerList();
                break;
            case 'skillCast':
                // Handle skill cast from host or forwarded from another member
                if (!data.skillName) {
                    console.error('Received incomplete skill cast data from host');
                    return;
                }
                
                // Get the player ID who cast the skill
                const casterId = data.playerId || this.hostId;
                
                console.debug(`[MultiplayerConnectionManager] Player ${casterId} cast skill: ${data.skillName}`);
                
                // Get the remote player
                const remotePlayer = this.multiplayerManager.remotePlayerManager.getPlayer(casterId);
                
                // If position and rotation are provided, update the remote player first
                if (data.position && remotePlayer) {
                    remotePlayer.updatePosition(data.position);
                }
                
                if (data.rotation && remotePlayer) {
                    remotePlayer.updateRotation(data.rotation);
                }
                
                // Trigger skill cast animation on remote player
                this.multiplayerManager.remotePlayerManager.handleSkillCast(casterId, data.skillName, data.variant, data.targetEnemyId);
                break;
            case 'kicked':
                // Handle being kicked by the host
                console.debug('[MultiplayerConnectionManager] Kicked from game by host:', data.message);
                
                // Show notification
                if (this.multiplayerManager.game.hudManager) {
                    this.multiplayerManager.game.hudManager.showNotification('You have been removed from the game by the host', 'error');
                }
                
                // Clean up connection
                this.dispose();
                
                // Return to main menu
                if (this.multiplayerManager.game.state) {
                    this.multiplayerManager.game.state.setPaused();
                }
                if (this.multiplayerManager.game.menuManager) {
                    this.multiplayerManager.game.menuManager.showMenu('gameMenu');
                }
                break;
            case 'hostLeft':
                this._hostLeftIntentional = true;
                this.handleHostDisconnection();
                break;
            case 'playerDamage':
                // Handle damage to the local player from an enemy (skip when game is paused - e.g. menu/multiplayer modal open)
                if (data.amount && this.multiplayerManager.game.player) {
                    if (this.multiplayerManager.game.isPaused) {
                        console.debug(`[MultiplayerConnectionManager] Ignoring player damage while game is paused`);
                        break;
                    }
                    console.debug(`[MultiplayerConnectionManager] Player taking damage: ${data.amount} from enemy ID: ${data.enemyId}`);
                    this.multiplayerManager.game.player.takeDamage(data.amount);
                }
                break;
            case 'partyBonusUpdate':
                if (data.playerCount != null && this.multiplayerManager.game?.hudManager) {
                    const n = data.playerCount;
                    this.multiplayerManager.game.hudManager.showNotification(
                        n >= 2 ? `Extra experience with ${n} players!` : 'Extra EXP active.',
                        'info'
                    );
                }
                break;
            case 'shareExperience':
                // Handle experience shared from killing an enemy + 3D notification + random bonus
                if (data.amount && this.multiplayerManager.game.player) {
                    const game = this.multiplayerManager.game;
                    const player = game.player;
                    let totalExp = data.amount;
                    const effectsManager = game.effectsManager;
                    const pos = player.getPosition ? player.getPosition() : (game.camera?.position ? game.camera.position.clone() : { x: 0, y: 1, z: 0 });
                    const posVec = pos && typeof pos.x === 'number' ? { x: pos.x, y: pos.y ?? 1, z: pos.z } : { x: 0, y: 1, z: 0 };
                    void effectsManager?.createExperienceNumberSprite(data.amount, posVec, { isBonus: false });
                    const bonusChance = 0.15;
                    if (Math.random() < bonusChance && effectsManager) {
                        const bonusAmount = Math.max(1, Math.floor(data.amount * (0.25 + Math.random() * 0.25)));
                        totalExp += bonusAmount;
                        void effectsManager.createExperienceNumberSprite(bonusAmount, posVec, { isBonus: true });
                    }
                    player.addExperience(totalExp);
                }
                break;
            default:
                console.error('Unknown data type from host:', data.type);
        }
    }

    /**
     * Handle data received from member (host only)
     * @param {string} peerId - The ID of the peer
     * @param {Object} data - The data received from the member
     */
    handleDataFromMember(peerId, data) {
        if (!data || !data.type) {
            console.error('[MultiplayerConnectionManager] Received invalid data from member:', peerId);
            return;
        }
        if (data.type === 'inviteRequest') {
            this._removeJoinerAsInvite(peerId);
            return;
        }
        if (data.type === 'requestStartGame') {
            if (this.multiplayerManager.game?.state?.hasStarted?.()) {
                this.sendToPeer(peerId, { type: 'startGame' });
            }
            return;
        }
        try {
            switch (data.type) {
                case 'playerInput':
                    // Process player input
                    this.multiplayerManager.processPlayerInput(peerId, data);
                    break;
                case 'playerPosition':
                    // Initial position sync from member (once, or on resume after pause); host uses this to reconcile
                    if (!data.position || !data.rotation) {
                        console.error('[MultiplayerConnectionManager] Received incomplete position data from member:', peerId);
                        return;
                    }
                    this.multiplayerManager.remotePlayerManager.updatePlayer(
                        peerId,
                        data.position,
                        data.rotation,
                        data.animation || 'idle',
                        data.modelId,
                        undefined
                    );
                    // Clear movement input so remote doesn't drift with stale input until next input packet
                    const rp = this.multiplayerManager.remotePlayerManager.getPlayer(peerId);
                    if (rp && rp.setMovementInput) rp.setMovementInput(0, 0);
                    break;
                case 'skillCast':
                    // Handle skill cast from member
                    if (!data.skillName) {
                        console.error('[MultiplayerConnectionManager] Received incomplete skill cast data from member:', peerId);
                        return;
                    }
                    
                    console.debug(`[MultiplayerConnectionManager] Member ${peerId} cast skill: ${data.skillName}`);
                    
                    const remotePlayer = this.multiplayerManager.remotePlayerManager.getPlayer(peerId);
                    if (data.position && remotePlayer) remotePlayer.updatePosition(data.position);
                    if (data.rotation && remotePlayer) remotePlayer.updateRotation(data.rotation);
                    this.multiplayerManager.remotePlayerManager.handleSkillCast(peerId, data.skillName, data.variant, data.targetEnemyId);
                    // Forward skill cast to other members (no position/rotation; remote position comes from host simulation)
                    this.peers.forEach((conn, id) => {
                        if (id !== peerId) {
                            conn.send({
                                type: 'skillCast',
                                skillName: data.skillName,
                                playerId: peerId,
                                variant: data.variant,
                                targetEnemyId: data.targetEnemyId
                            });
                        }
                    });
                    break;
                case 'playerDamage':
                    // Handle damage to a remote player from an enemy (host only)
                    if (data.amount && data.enemyId) {
                        console.debug(`[MultiplayerConnectionManager] Remote player ${peerId} taking damage: ${data.amount} from enemy ID: ${data.enemyId}`);
                        
                        // Apply damage to the remote player if we have a player manager
                        const remotePlayer = this.multiplayerManager.remotePlayerManager.getPlayer(peerId);
                        if (remotePlayer && typeof remotePlayer.takeDamage === 'function') {
                            remotePlayer.takeDamage(data.amount);
                        }
                        
                        // Forward damage to other members so they can see the effects
                        this.peers.forEach((conn, id) => {
                            if (id !== peerId) {
                                conn.send({
                                    type: 'playerDamage',
                                    amount: data.amount,
                                    enemyId: data.enemyId,
                                    playerId: peerId // Add the player ID so other clients know who was damaged
                                });
                            }
                        });
                    }
                    break;
                case 'enemyKilled':
                    // Member killed an enemy locally; host removes it and grants drops/XP to the killer
                    if (data.enemyId && this.multiplayerManager.game?.enemyManager) {
                        const enemyManager = this.multiplayerManager.game.enemyManager;
                        const enemy = enemyManager.getEnemyById(data.enemyId);
                        if (enemy) {
                            const expAmount = enemy.experienceValue ?? 0;
                            enemyManager.removeEnemyById(data.enemyId, { runDropAndQuest: true });
                            if (expAmount > 0) {
                                this.sendToPeer(peerId, { type: 'shareExperience', amount: expAmount });
                            }
                        }
                    }
                    break;
                default:
                    console.error('[MultiplayerConnectionManager] Unknown data type from member:', data.type);
            }
        } catch (error) {
            console.error('[MultiplayerConnectionManager] Error handling data from member:', error);
        }
    }

    /**
     * Handle host disconnection (for members)
     * This is a unified method to handle host disconnection, called from both
     * the 'hostLeft' message handler and the handleDisconnect method
     */
    handleHostDisconnection() {
        const intentional = this._hostLeftIntentional;
        this._hostLeftIntentional = false;

        console.debug('[MultiplayerConnectionManager] Host disconnected from game', intentional ? '(host left)' : '(reconnecting…)');

        this.isConnected = false;
        this.multiplayerManager.ui.updateMultiplayerButton(false);

        if (intentional) {
            this.multiplayerManager.ui.updateConnectionStatus('Disconnected from host');
            if (this.multiplayerManager.game.hudManager) {
                this.multiplayerManager.game.hudManager.showNotification('The host has left the game', 'error');
            }
        } else {
            this.multiplayerManager.ui.showReconnectingAndRetryJoin();
        }

        this._initialPositionSent = false;
        this._lastInputSend = 0;

        // Remove all remote players
        if (this.multiplayerManager.remotePlayerManager) {
            this.multiplayerManager.remotePlayerManager.removeAllPlayers();
        }

        if (this.multiplayerManager.game.enemyManager) {
            this.multiplayerManager.game.enemyManager.removeAllEnemies();
            this.multiplayerManager.game.enemyManager.enableLocalSpawning();
        }

        this.dispose();

        if (intentional && this.multiplayerManager.game.state) {
            console.debug('[MultiplayerConnectionManager] Continuing game in local mode after host left');
        }
    }

    /**
     * Handle disconnection of a peer
     * @param {string} peerId - The ID of the peer that disconnected
     */
    handleDisconnect(peerId) {
        // Remove from peers map
        this.peers.delete(peerId);
        
        if (this.isHost) {
            const persistentId = this.peerIdToPersistentId.get(peerId);
            if (persistentId) {
                this.persistentIdToPeerId.delete(persistentId);
                this.peerIdToPersistentId.delete(peerId);
            }
            this.multiplayerManager.ui.removePlayerFromList(peerId);
            this.peers.forEach(conn => {
                conn.send({ type: 'playerLeft', playerId: peerId });
            });
            this.multiplayerManager.remotePlayerManager.removePlayer(peerId);
            this._snapHostJoinersList();
            // Refresh host's Connected Players list so it stays in sync
            this.multiplayerManager.ui.updateConnectionInfoPlayerList();
            // Host can play alone; do not disable Start when last joiner disconnects
        } else {
            // If host disconnected, handle it with the unified method
            if (peerId === this.hostId) {
                this.handleHostDisconnection();
            }
        }
    }

    /**
     * Kick a player from the game (host only)
     * @param {string} peerId - The ID of the peer to kick
     */
    kickPlayer(peerId) {
        if (!this.isHost) {
            console.error('[MultiplayerConnectionManager] Only the host can kick players');
            return;
        }
        
        const conn = this.peers.get(peerId);
        if (conn) {
            // Send kick message to the player
            conn.send({
                type: 'kicked',
                message: 'You have been removed from the game by the host'
            });
            
            // Close the connection
            conn.close();
            
            // Handle the disconnection (this will clean up UI and notify other players)
            this.handleDisconnect(peerId);
            
            console.debug(`[MultiplayerConnectionManager] Player ${peerId} has been kicked by the host`);
            
            // Show notification
            if (this.multiplayerManager.game.hudManager) {
                this.multiplayerManager.game.hudManager.showNotification('Player has been removed', 'info');
            }
        }
    }
    
    /**
     * Send data to a specific peer
     * @param {string} peerId - The ID of the peer to send data to
     * @param {Object} data - The data to send
     */
    sendToPeer(peerId, data) {
        const conn = this.peers.get(peerId);
        if (conn) {
            if (this.useBinaryFormat) {
                // Serialize to binary format
                const binaryData = this.serializer.serialize(data);
                if (binaryData) {
                    conn.send(binaryData);
                } else {
                    // Fallback to JSON if serialization fails
                    conn.send(data);
                }
            } else {
                // Use JSON format
                conn.send(data);
            }
        }
    }

    /**
     * Broadcast data to all peers
     * @param {Object} data - The data to broadcast
     */
    broadcast(data) {
        if (this.useBinaryFormat) {
            // Serialize once for all peers
            const binaryData = this.serializer.serialize(data);
            if (binaryData) {
                this.peers.forEach(conn => {
                    conn.send(binaryData);
                });
            } else {
                // Fallback to JSON if serialization fails
                this.peers.forEach(conn => {
                    conn.send(data);
                });
            }
        } else {
            // Use JSON format
            this.peers.forEach(conn => {
                conn.send(data);
            });
        }
    }
    
    /**
     * Process received data - handles both binary and JSON formats
     * @param {*} data - The received data
     * @returns {Object} The processed data object
     */
    processReceivedData(data) {
        try {
            // Check if data is binary (Uint8Array or ArrayBuffer)
            if (this.useBinaryFormat && (data instanceof Uint8Array || data instanceof ArrayBuffer)) {
                // Convert ArrayBuffer to Uint8Array if needed
                const binaryData = data instanceof ArrayBuffer ? new Uint8Array(data) : data;
                // Deserialize binary data
                const result = this.serializer.deserialize(binaryData);
                
                // Validate the result has a type property
                if (result && result.type) {
                    return result;
                } else {
                    console.warn('[MultiplayerConnectionManager] Deserialized data is missing type property, using original data');
                    return data;
                }
            }
            
            // Already in JSON format
            return data;
        } catch (error) {
            console.error('[MultiplayerConnectionManager] Error processing received data:', error);
            
            // Add more detailed error information
            if (data instanceof Uint8Array || data instanceof ArrayBuffer) {
                const dataSize = data instanceof ArrayBuffer ? data.byteLength : data.length;
                console.error(`[MultiplayerConnectionManager] Failed to process binary data of size: ${dataSize} bytes`);
            } else if (typeof data === 'object') {
                console.error('[MultiplayerConnectionManager] Failed to process object data with keys:', Object.keys(data));
            } else {
                console.error(`[MultiplayerConnectionManager] Failed to process data of type: ${typeof data}`);
            }
            
            // Return original data as fallback
            return data;
        }
    }

    /**
     * Send data to host (member only). Used for enemy kills and other member->host messages.
     * @param {Object} data - The data to send (e.g. { type: 'enemyKilled', enemyId: '...' })
     */
    sendToHost(data) {
        if (this.isHost || !this.isConnected || !this.hostId) return;
        const hostConn = this.peers.get(this.hostId);
        if (!hostConn) return;
        try {
            if (this.useBinaryFormat) {
                const binaryData = this.serializer.serialize(data);
                if (binaryData) hostConn.send(binaryData);
                else hostConn.send(data);
            } else {
                hostConn.send(data);
            }
        } catch (error) {
            console.error('[MultiplayerConnectionManager] Error sending to host:', error);
        }
    }

    /**
     * Reset so member will re-send position on next resume. Call when game pauses (menu, death, etc.) so host can reconcile after unpause.
     */
    resetPositionSyncForResume() {
        if (!this.isHost && this.isConnected) {
            this._initialPositionSent = false;
        }
    }

    /**
     * Send initial position to host once (member only). Called on first sync so host can start input-driven simulation from correct place.
     */
    sendInitialPosition() {
        if (this.isHost || !this.isConnected || this._initialPositionSent) return;
        if (!this.multiplayerManager.game?.player) return;
        const hostConn = this.peers.get(this.hostId);
        if (!hostConn) return;
        try {
            let position = null;
            let rotation = null;
            if (this.multiplayerManager.game.player.movement?.getPosition) {
                const validPos = this.multiplayerManager.game.player.movement.getPosition();
                if (validPos && !isNaN(validPos.x) && !isNaN(validPos.y) && !isNaN(validPos.z)) {
                    position = { x: validPos.x, y: validPos.y, z: validPos.z };
                }
                if (this.multiplayerManager.game.player.movement.getRotation) {
                    const validRot = this.multiplayerManager.game.player.movement.getRotation();
                    if (validRot && !isNaN(validRot.y)) rotation = { y: validRot.y };
                }
            }
            if (!position && this.multiplayerManager.game.player.model?.position) {
                const p = this.multiplayerManager.game.player.model.position;
                if (!isNaN(p.x) && !isNaN(p.y) && !isNaN(p.z)) position = { x: p.x, y: p.y, z: p.z };
            }
            if (!rotation && this.multiplayerManager.game.player.model?.rotation) {
                if (!isNaN(this.multiplayerManager.game.player.model.rotation.y)) rotation = { y: this.multiplayerManager.game.player.model.rotation.y };
            }
            if (!position || !rotation) return;
            const animation = this.multiplayerManager.game.player.currentAnimation || 'idle';
            let modelId = DEFAULT_CHARACTER_MODEL;
            if (this.multiplayerManager.game.player.model?.currentModelId) modelId = this.multiplayerManager.game.player.model.currentModelId;
            const playerData = { type: 'playerPosition', position, rotation, animation, modelId };
            if (this.useBinaryFormat) {
                const binaryData = this.serializer.serialize(playerData);
                if (binaryData) hostConn.send(binaryData);
                else hostConn.send(playerData);
            } else {
                hostConn.send(playerData);
            }
            this._initialPositionSent = true;
            console.debug('[MultiplayerConnectionManager] Member sent initial position to host');
        } catch (error) {
            console.error('[MultiplayerConnectionManager] Error sending initial position:', error);
        }
    }

    /**
     * Send player input (joystick + jump) to host (member only). Throttled to ~30 Hz to match host and reduce bottleneck.
     */
    sendPlayerInput() {
        if (this.isHost || !this.isConnected) return;
        const now = Date.now();
        if (now - this._lastInputSend < 33) return;
        this._lastInputSend = now;
        if (!this.multiplayerManager.game?.player) return;
        const hostConn = this.peers.get(this.hostId);
        if (!hostConn) return;
        try {
            const dir = this.multiplayerManager.game.inputHandler?.getMovementDirection?.();
            const moveX = dir && !isNaN(dir.x) ? dir.x : 0;
            const moveZ = dir && !isNaN(dir.z) ? dir.z : 0;
            const jumpPressed = !!this.multiplayerManager.game.jumpRequested;
            if (jumpPressed) this.multiplayerManager.game.jumpRequested = false;
            const inputData = { type: 'playerInput', moveX, moveZ, jumpPressed };
            if (this.useBinaryFormat) {
                const binaryData = this.serializer.serialize(inputData);
                if (binaryData) hostConn.send(binaryData);
                else hostConn.send(inputData);
            } else {
                hostConn.send(inputData);
            }
        } catch (error) {
            console.error('[MultiplayerConnectionManager] Error sending player input:', error);
        }
    }

    /**
     * Broadcast enemy removals immediately (host only). Called when host removes an enemy so members get instant confirm.
     */
    broadcastEnemyRemovalsIfAny() {
        if (!this.isHost || this.peers.size === 0) return;
        const em = this.multiplayerManager.game?.enemyManager;
        const ids = em?.getRecentlyRemovedEnemyIds?.() ?? [];
        if (ids.length === 0) return;
        em.clearRecentlyRemovedEnemyIds();
        this.broadcast({ type: 'enemiesRemoved', ids });
    }

    /**
     * Broadcast game state to all members (host only).
     * Delta sync: only changed enemies; full sync every 90 ticks. LOD: coarse position for far enemies.
     */
    broadcastGameState() {
        if (!this.isHost) return;
        const em = this.multiplayerManager.game?.enemyManager;
        const removedIds = em?.getRecentlyRemovedEnemyIds?.() ?? [];
        if (removedIds.length > 0) em.clearRecentlyRemovedEnemyIds();
        this._hostTickCount = (this._hostTickCount || 0) + 1;
        const fullSync = this._hostTickCount % 90 === 0;
        const playerPositions = [];
        const players = {};
        const pl = this.multiplayerManager.game?.player;
        if (pl) {
            let pos = null;
            let rotY = null;
            if (pl.movement?.getPosition) {
                const p = pl.movement.getPosition();
                if (p && !isNaN(p.x) && !isNaN(p.y) && !isNaN(p.z)) pos = [p.x, p.y, p.z];
            }
            if (pl.movement?.getRotation) {
                const r = pl.movement.getRotation();
                if (r && !isNaN(r.y)) rotY = r.y;
            }
            if (!pos && pl.model?.position) {
                const p = pl.model.position;
                if (!isNaN(p.x) && !isNaN(p.y) && !isNaN(p.z)) pos = [p.x, p.y, p.z];
            }
            if (rotY == null && pl.model?.rotation != null) rotY = pl.model.rotation.y;
            if (pos && rotY != null) {
                players[this.peer.id] = {
                    position: pos,
                    rotation: rotY,
                    animation: pl.currentAnimation || 'idle',
                    modelId: pl.model?.currentModelId || DEFAULT_CHARACTER_MODEL,
                    playerColor: this.multiplayerManager.assignedColors.get(this.peer.id) || null
                };
                playerPositions.push({ x: pos[0], z: pos[2] });
            }
        }
        this.multiplayerManager.remotePlayerManager.getPlayers().forEach((player, peerId) => {
            if (!player?.group) return;
            const p = player.group.position;
            if (isNaN(p.x) || isNaN(p.y) || isNaN(p.z)) return;
            const ry = player.model ? player.model.rotation.y : 0;
            players[peerId] = {
                position: [p.x, p.y, p.z],
                rotation: ry,
                animation: player.currentAnimation || 'idle',
                modelId: player.modelId || DEFAULT_CHARACTER_MODEL,
                playerColor: this.multiplayerManager.assignedColors.get(peerId) || null
            };
            playerPositions.push({ x: p.x, z: p.z });
        });
        let enemies = {};
        if (em && typeof em.getSerializableEnemyData === 'function') {
            const result = em.getSerializableEnemyData({ fullSync, playerPositions });
            enemies = result.data;
        }
        const gameState = { type: 'gameState', players, enemies };
        if (removedIds.length > 0) gameState.removedIds = removedIds;
        if (fullSync) gameState.fullSync = true;
        this.broadcast(gameState);
    }


    /**
     * Clean up resources
     */
    dispose() {
        const wasHost = this.isHost;
        // Close all connections
        if (this.peers) {
            this.peers.forEach(conn => conn.close());
            this.peers.clear();
        }
        if (this.persistentIdToPeerId) this.persistentIdToPeerId.clear();
        if (this.peerIdToPersistentId) this.peerIdToPersistentId.clear();
        if (this.peer) {
            this.peer.destroy();
            this.peer = null;
        }
        this.isHost = false;
        this.isConnected = false;
        this.hostId = null;
        this.roomId = null;
    }
}