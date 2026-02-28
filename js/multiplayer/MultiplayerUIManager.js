/**
 * MultiplayerUIManager.js
 * Handles all UI-related functionality for multiplayer
 * Including one-touch HOST/JOIN, NFC, QR code generation/scanning, and connection status
 */

import { isNfcSupported, startNfcScan, writeNfcInvite } from './NfcHelper.js';
import { isUltrasoundSupported, playUltrasoundInviteLoop, startUltrasoundListen } from './UltrasoundHelper.js';

export class MultiplayerUIManager {
    /**
     * Initialize the multiplayer UI manager
     * @param {MultiplayerManager} multiplayerManager - Reference to the main multiplayer manager
     */
    constructor(multiplayerManager) {
        this.multiplayerManager = multiplayerManager;
        this.qrCodeScanner = null;
        this.availableCameras = [];
        this.selectedCameraId = null;
        this.connectionInfoListenersInitialized = false;
        /** @type {{ stop: () => void } | null} */
        this.nfcScanController = null;
        /** @type {number|undefined} */
        this._nfcWriteTimeoutId = undefined;
        /** @type {{ stop: () => void } | null} */
        this.ultrasoundListenController = null;
        /** @type {{ stop: () => void } | null} */
        this.soundShareController = null;
        /** Join method status and retry counts */
        this._joinMethodState = { nfcRetries: 0, soundRetries: 0, connected: false };
        /** Max retries per join method (NFC, LAN, Sound) before stopping */
        this._maxJoinRetries = 3;
        /** @type {number|undefined} */
        this._joinNearbyPollId = undefined;
        /** @type {number|undefined} */
        this._joinSoundCycleId = undefined;
        /** Sound listen cycle duration (ms) before marking "not success" and retrying */
        this._joinSoundCycleMs = 18000;
        /** When set, primary button shows "Play" and joins this host (from NFC/Sound/QR or single LAN) */
        this._detectedHostId = null;
    }

    /** localStorage key for last joined room (joiners only); enables rejoin after network issues */
    static get STORAGE_KEY_LAST_JOINED_ROOM() { return 'monkJourney_lastJoinedRoomId'; }

    getLastJoinedRoomId() {
        try {
            return localStorage.getItem(MultiplayerUIManager.STORAGE_KEY_LAST_JOINED_ROOM) || null;
        } catch (_) { return null; }
    }

    setLastJoinedRoomId(roomId) {
        try {
            if (roomId) localStorage.setItem(MultiplayerUIManager.STORAGE_KEY_LAST_JOINED_ROOM, roomId);
            else localStorage.removeItem(MultiplayerUIManager.STORAGE_KEY_LAST_JOINED_ROOM);
        } catch (_) {}
    }

    clearLastJoinedRoomId() {
        this.setLastJoinedRoomId(null);
    }

    /**
     * Called when a join attempt fails (host not available). Show message and clear stored roomId so user can set up new connection.
     * @param {string} _roomId - The room ID that could not be joined
     */
    onJoinToHostFailed(_roomId) {
        this.updateConnectionStatus('Host is no longer available. You can set up a new connection.', 'join-connection-status');
        this.clearLastJoinedRoomId();
        this.updateRejoinHostArea();
    }

    /** Show or hide "Join to existing host" block based on stored roomId; wire button if visible. */
    updateRejoinHostArea() {
        const area = document.getElementById('join-rejoin-host-area');
        const emptyEl = document.getElementById('join-host-empty');
        const lastRoomId = this.getLastJoinedRoomId();
        if (!area) return;
        if (lastRoomId) {
            area.style.display = 'block';
            if (emptyEl) emptyEl.style.display = 'none';
            const btn = document.getElementById('join-rejoin-host-btn');
            if (btn) {
                btn.onclick = () => {
                    this.updateConnectionStatus('Connecting to host...', 'join-connection-status');
                    this.multiplayerManager.joinGame(lastRoomId);
                };
            }
        } else {
            area.style.display = 'none';
            if (emptyEl) emptyEl.style.display = '';
        }
    }

    /**
     * Initialize the UI manager
     */
    async init() {
        // Set up UI event listeners
        this.setupUIListeners();
        
        // Check URL parameters for direct join
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('join') === 'true' && urlParams.get('connect-id')) {
            // Get the connection ID from URL
            const connectId = urlParams.get('connect-id');
            console.debug('Direct join detected with connection ID:', connectId);
            
            // Show multiplayer modal and join UI
            this.showMultiplayerModal();
            await this.showJoinUI();
            
            // Show manual code section and fill connection code
            this.showJoinManualCodeSection();
            const input = document.getElementById('manual-connection-input');
            if (input) {
                input.value = connectId;
            }
            
            // Auto-connect after a short delay
            setTimeout(() => {
                this.updateConnectionStatus('Connecting...', 'join-connection-status');
                this.multiplayerManager.joinGame(connectId);
            }, 500);
        }
        
        return true;
    }

    /**
     * Set up UI event listeners for multiplayer buttons
     */
    setupUIListeners() {
        // Multiplayer button (in game menu)
        const multiplayerButton = document.getElementById('multiplayer-button');
        if (multiplayerButton) {
            multiplayerButton.addEventListener('click', () => {
                // If we're already in multiplayer mode, show connection info
                if (this.multiplayerManager.connection && this.multiplayerManager.connection.isConnected) {
                    console.debug('[MultiplayerUIManager] Showing multiplayer connection info');
                    this.showConnectionInfoScreen();
                } else {
                    // Otherwise show the multiplayer modal
                    this.showMultiplayerModal();
                }
            });
        }
        
        // One-touch HOST: start hosting, then show connection screen (NFC share optional there)
        const oneTouchHostBtn = document.getElementById('one-touch-host-btn');
        if (oneTouchHostBtn) {
            oneTouchHostBtn.addEventListener('click', async () => {
                await this.multiplayerManager.hostGame();
                this.showConnectionInfoScreen();
                this.maybeShowNfcShareOnConnectionScreen();
            });
        }
        
        // One-touch JOIN: try NFC scan first; fallback to QR/manual
        const oneTouchJoinBtn = document.getElementById('one-touch-join-btn');
        if (oneTouchJoinBtn) {
            oneTouchJoinBtn.addEventListener('click', () => this.startOneTouchJoin());
        }

        // Permission Allow buttons (Camera, Mic) – must run in same tick as click for browser prompt
        const permCameraAllow = document.getElementById('perm-camera-allow');
        if (permCameraAllow) {
            permCameraAllow.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.requestCameraPermissionFromClick();
            });
        }
        const permMicAllow = document.getElementById('perm-microphone-allow');
        if (permMicAllow) {
            permMicAllow.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.requestMicrophonePermissionFromClick();
            });
        }
        
        // Manual connect button
        const manualConnectBtn = document.getElementById('manual-connect-btn');
        if (manualConnectBtn) {
            manualConnectBtn.addEventListener('click', () => {
                const code = document.getElementById('manual-connection-input').value;
                if (code) {
                    // Update button text and disable it
                    manualConnectBtn.textContent = 'Connecting...';
                    manualConnectBtn.disabled = true;
                    
                    this.updateConnectionStatus('Connecting...', 'join-connection-status');
                    this.multiplayerManager.joinGame(code);
                } else {
                    this.updateConnectionStatus('Please enter a connection code', 'join-connection-status');
                }
            });
        }
        
        // No join option buttons anymore - removed
        
        // Start game button (for host)
        const startGameBtn = document.getElementById('start-game-btn');
        if (startGameBtn) {
            // Add click event listener (stop sound share so joiners know to stop listening)
            startGameBtn.addEventListener('click', () => {
                this.stopSoundShare();
                this.multiplayerManager.startMultiplayerGame();
            });
            
            // Hide the button if player is not the host
            if (this.multiplayerManager.connection && !this.multiplayerManager.connection.isHost) {
                startGameBtn.style.display = 'none';
            }
        }
        
        // Close multiplayer modal
        const closeMultiplayerBtn = document.getElementById('close-multiplayer-btn');
        if (closeMultiplayerBtn) {
            closeMultiplayerBtn.addEventListener('click', () => this.closeMultiplayerModal());
        }
        
        // Copy connection code button
        const connectionCode = document.getElementById('connection-code');
        if (connectionCode) {
            connectionCode.addEventListener('click', () => this.copyConnectionCode());
        }
        
        // Copy button for connection code
        const copyCodeBtn = document.getElementById('copy-code-btn');
        if (copyCodeBtn) {
            copyCodeBtn.addEventListener('click', () => this.copyConnectionCode());
        }
        
        // Paste button for connection code
        const pasteCodeBtn = document.getElementById('paste-code-btn');
        if (pasteCodeBtn) {
            pasteCodeBtn.addEventListener('click', async () => {
                try {
                    const text = await navigator.clipboard.readText();
                    const input = document.getElementById('manual-connection-input');
                    if (input) {
                        input.value = text;
                    }
                } catch (err) {
                    console.error('Failed to read clipboard contents: ', err);
                    this.updateConnectionStatus('Failed to paste from clipboard. Please enter code manually.', 'join-connection-status');
                }
            });
        }
        
        // QR Scanner toggle button
        const toggleScanBtn = document.getElementById('toggle-scan-btn');
        if (toggleScanBtn) {
            toggleScanBtn.addEventListener('click', () => {
                if (this.qrCodeScanner) {
                    this.stopQRScanner();
                } else {
                    this.startQRScanner();
                }
            });
        }
        
        // Quick connect button in QR scanner tab
        const quickConnectBtn = document.getElementById('quick-connect-btn');
        if (quickConnectBtn) {
            quickConnectBtn.addEventListener('click', () => {
                const code = document.getElementById('quick-connection-input').value;
                if (code) {
                    this.updateConnectionStatus('Connecting...', 'join-connection-status');
                    this.multiplayerManager.joinGame(code);
                } else {
                    this.updateConnectionStatus('Please enter a connection code', 'join-connection-status');
                }
            });
        }
        
        // Quick connection input field - allow Enter key to connect
        const quickConnectionInput = document.getElementById('quick-connection-input');
        if (quickConnectionInput) {
            quickConnectionInput.addEventListener('keypress', (event) => {
                if (event.key === 'Enter') {
                    event.preventDefault();
                    const code = quickConnectionInput.value;
                    if (code) {
                        this.updateConnectionStatus('Connecting...', 'join-connection-status');
                        this.multiplayerManager.joinGame(code);
                    } else {
                        this.updateConnectionStatus('Please enter a connection code', 'join-connection-status');
                    }
                }
            });
        }

        // Back buttons
        
        const backFromJoinBtn = document.getElementById('back-from-join-btn');
        if (backFromJoinBtn) {
            backFromJoinBtn.addEventListener('click', () => {
                this.stopQRScanner();
                this.showMultiplayerModal();
            });
        }
        
        const leaveGameBtn = document.getElementById('leave-game-btn');
        if (leaveGameBtn) {
            leaveGameBtn.addEventListener('click', () => {
                console.debug('[MultiplayerUIManager] Leaving multiplayer game');
                
                // Disconnect from the multiplayer game
                this.multiplayerManager.leaveGame();
                
                // Update UI: button back to "Multiplayer", status to disconnected, reset invite buttons
                this.updateMultiplayerButton(false);
                this.updateConnectionStatus('Disconnected', 'connection-info-status');
                this.updateConnectionStatus('Disconnected', 'connection-info-status-bar');
                this.resetInviteButtons();
                
                // Close the multiplayer modal
                this.closeMultiplayerModal();
                
                // Return to game menu if the game has a menu manager
                if (this.multiplayerManager.game && this.multiplayerManager.game.menuManager) {
                    this.multiplayerManager.game.menuManager.showMenu('gameMenu');
                }
            });
        }
    }

    /**
     * Show the multiplayer modal (one-touch HOST / JOIN screen)
     */
    showMultiplayerModal() {
        const modal = document.getElementById('multiplayer-menu');
        if (modal) {
            modal.style.display = 'flex';
            
            // Show initial one-touch screen, hide others
            document.getElementById('multiplayer-initial-screen').style.display = 'flex';
            document.getElementById('join-game-screen').style.display = 'none';
            const playerWaitingScreen = document.getElementById('player-waiting-screen');
            if (playerWaitingScreen) {
                playerWaitingScreen.style.display = 'none';
            }
            document.getElementById('connection-info-screen').style.display = 'none';
            
            // NFC status hint
            const nfcStatus = document.getElementById('nfc-status');
            if (nfcStatus) {
                nfcStatus.textContent = isNfcSupported() ? 'NFC ready — touch devices to connect' : '';
            }
            
            // Reset connection status
            const statusElements = document.querySelectorAll('.connection-status');
            statusElements.forEach(el => el.textContent = '');
        }
    }
    
    /**
     * Show the connection info screen
     * Displays current connection status, host info, and connected players
     */
    showConnectionInfoScreen() {
        const modal = document.getElementById('multiplayer-menu');
        if (modal) {
            modal.style.display = 'flex';
            
            // Get the connection info screen element
            const connectionInfoScreen = document.getElementById('connection-info-screen');
            
            // Set up event listeners for the buttons if not already done
            if (!this.connectionInfoListenersInitialized) {
                const disconnectBtn = document.getElementById('disconnect-btn');
                if (disconnectBtn) {
                    disconnectBtn.addEventListener('click', () => {
                        console.debug('[MultiplayerUIManager] Disconnecting from multiplayer game');
                        
                        // Disconnect from the multiplayer game
                        this.multiplayerManager.leaveGame();
                        
                        // Update UI: button back to "Multiplayer", status to disconnected, reset invite buttons
                        this.updateMultiplayerButton(false);
                        this.updateConnectionStatus('Disconnected', 'connection-info-status');
                        this.updateConnectionStatus('Disconnected', 'connection-info-status-bar');
                        this.resetInviteButtons();
                        
                        // Close the multiplayer modal
                        this.closeMultiplayerModal();
                        
                        // Return to game menu if the game has a menu manager
                        if (this.multiplayerManager.game && this.multiplayerManager.game.menuManager) {
                            this.multiplayerManager.game.menuManager.showMenu('gameMenu');
                        }
                    });
                }
                
                const closeBtn = document.getElementById('close-connection-info-btn');
                if (closeBtn) {
                    closeBtn.addEventListener('click', () => this.closeMultiplayerModal());
                }
                
                this.connectionInfoListenersInitialized = true;
            }
            
            // Hide other screens, show connection info screen
            document.getElementById('multiplayer-initial-screen').style.display = 'none';
            document.getElementById('join-game-screen').style.display = 'none';
            // Player waiting screen has been removed and merged into connection-info-screen
            const playerWaitingScreen = document.getElementById('player-waiting-screen');
            if (playerWaitingScreen) {
                playerWaitingScreen.style.display = 'none';
            }
            connectionInfoScreen.style.display = 'flex';
            
            // Update connection info
            this.updateConnectionInfoScreen();
            // Ensure Sound 📤 / NFC 📤 are shown for host/player whenever connection screen is visible
            this.maybeShowNfcShareOnConnectionScreen();
        }
    }

    /**
     * Stop sound share loop if running (and update button). Call before reset or on Disconnect/Play.
     */
    stopSoundShare() {
        if (this.soundShareController) {
            this.soundShareController.stop();
            this.soundShareController = null;
        }
        const soundBtn = document.getElementById('sound-share-invite-btn');
        if (soundBtn) {
            soundBtn.disabled = false;
            soundBtn.textContent = 'Sound 📤';
        }
    }

    /**
     * Reset invite buttons (Sound 📤, NFC 📤) to default labels.
     * Call when closing modal or on disconnect so they never stay "Playing…" or "Hold…".
     */
    resetInviteButtons() {
        this.stopSoundShare();
        const nfcBtn = document.getElementById('nfc-share-invite-btn');
        if (nfcBtn) {
            nfcBtn.disabled = false;
            nfcBtn.textContent = '📤 NFC';
        }
    }

    /**
     * Close the multiplayer modal
     */
    closeMultiplayerModal() {
        const modal = document.getElementById('multiplayer-menu');
        if (modal) {
            modal.style.display = 'none';
            
            if (this._nfcWriteTimeoutId !== undefined) {
                clearTimeout(this._nfcWriteTimeoutId);
                this._nfcWriteTimeoutId = undefined;
            }
            this.stopNfcScan();
            this.stopUltrasoundListen();
            this.stopQRScanner();
            this.resetInviteButtons();
            
            const connectionInfoScreen = document.getElementById('connection-info-screen');
            if (connectionInfoScreen) {
                connectionInfoScreen.style.display = 'none';
            }
        }
    }
    
    /**
     * Stop NFC scan if active
     */
    stopNfcScan() {
        if (this.nfcScanController) {
            this.nfcScanController.stop();
            this.nfcScanController = null;
        }
    }

    stopUltrasoundListen() {
        if (this.ultrasoundListenController) {
            this.ultrasoundListenController.stop();
            this.ultrasoundListenController = null;
        }
    }

    /**
     * Show confirmation before joining when connection ID received via NFC.
     * (HOST already exists, or PLAYER/HOST touched this device -> JOIN ask to confirm.)
     * @param {string} connectionId - Room ID from NFC
     * @param {HTMLElement} statusEl - Status element to update
     * @param {HTMLElement} useCodeQrBtn - "Use code or QR" button
     * @param {() => void} onCancelResumeScan - Called on Cancel to resume NFC scan
     */
    showNfcJoinConfirm(connectionId, statusEl, useCodeQrBtn, onCancelResumeScan) {
        const confirmEl = document.getElementById('nfc-join-confirm');
        const codeEl = confirmEl?.querySelector('.nfc-join-confirm-code');
        const joinBtn = document.getElementById('nfc-join-confirm-join-btn');
        const cancelBtn = document.getElementById('nfc-join-confirm-cancel-btn');
        if (!confirmEl || !joinBtn || !cancelBtn) return;

        if (statusEl) statusEl.textContent = '';
        if (codeEl) codeEl.textContent = `Code: ${connectionId}`;
        confirmEl.style.display = 'block';

        const cleanup = () => {
            confirmEl.style.display = 'none';
            joinBtn.onclick = null;
            cancelBtn.onclick = null;
        };

        joinBtn.onclick = () => {
            cleanup();
            if (useCodeQrBtn) useCodeQrBtn.style.display = 'none';
            if (statusEl) statusEl.textContent = 'Connecting…';
            this.multiplayerManager.joinGame(connectionId);
        };

        cancelBtn.onclick = () => {
            cleanup();
            if (useCodeQrBtn) useCodeQrBtn.style.display = 'block';
            onCancelResumeScan();
        };
    }

    /**
     * Start NFC scan for join (used from startOneTouchJoin and when user cancels NFC confirm).
     * @param {(msg: string) => void} setStatus
     * @param {HTMLElement} useCodeQrBtn
     * @returns {Promise<void>}
     */
    async startNfcScanForJoin(setStatus, useCodeQrBtn) {
        try {
            this.nfcScanController = await startNfcScan((connectionId) => {
                this.stopNfcScan();
                if (useCodeQrBtn) useCodeQrBtn.style.display = 'none';
                const statusEl = document.getElementById('join-connection-status');
                this.showNfcJoinConfirm(connectionId, statusEl, useCodeQrBtn, () => this.startNfcScanForJoin(setStatus, useCodeQrBtn));
            });
            setStatus('NFC on — touch the other device to join');
        } catch (e) {
            this.nfcScanController = null;
            setStatus('NFC failed — use code or QR');
        }
    }

    /**
     * Update the join method status panel (NFC, Sound) and optional retry counts.
     * @param {{ nfc?: string, sound?: string }} status - Text for each line; empty = leave unchanged
     * @param {{ nfcClass?: string, soundClass?: string }} classes - Optional CSS class for status (status-trying, status-fail, status-success, status-skip)
     */
    updateJoinMethodStatus(status, classes = {}) {
        const set = (id, text, cls) => {
            const el = document.getElementById(id);
            if (!el) return;
            if (text !== undefined) el.textContent = text;
            el.className = 'join-method-line' + (cls ? ' ' + cls : '');
        };
        if (status.nfc !== undefined) set('join-method-nfc', status.nfc, classes.nfcClass);
        if (status.sound !== undefined) set('join-method-sound', status.sound, classes.soundClass);
    }

    /** Stop nearby poll and sound cycle timers when leaving join screen or when connected */
    stopJoinAutoMethods() {
        if (this._joinNearbyPollId !== undefined) {
            clearInterval(this._joinNearbyPollId);
            this._joinNearbyPollId = undefined;
        }
        if (this._joinSoundCycleId !== undefined) {
            clearTimeout(this._joinSoundCycleId);
            this._joinSoundCycleId = undefined;
        }
        this.stopUltrasoundListen();
        this.stopNfcScan();
    }

    /**
     * Start NFC, LAN, and Sound join methods. Each method retries up to _maxJoinRetries (3) then stops.
     * @param {HTMLElement|null} statusEl - Element for connection status
     * @param {(msg: string) => void} setStatus - Callback to set status text
     */
    startJoinAutoMethods(statusEl, setStatus) {
        const state = this._joinMethodState;
        const max = this._maxJoinRetries;
        const emptyEl = document.getElementById('join-host-empty');
        if (emptyEl) emptyEl.textContent = 'Use QR scan or Enter Code to join.';

        // NFC
        if (isNfcSupported()) {
            this.updateJoinMethodStatus({ nfc: 'NFC: waiting — touch host' }, { nfcClass: 'status-trying' });
            startNfcScan((connectionId) => {
                this.stopJoinAutoMethods();
                this.showNfcJoinConfirm(connectionId, statusEl, null, () => this.showJoinUI());
            }).then(ctrl => {
                this.nfcScanController = ctrl;
            }).catch(() => {
                this.nfcScanController = null;
                state.nfcRetries++;
                const stopped = state.nfcRetries >= max;
                this.updateJoinMethodStatus(
                    { nfc: stopped ? `NFC: not success (stopped after ${max} retries)` : `NFC: not success (retry ${state.nfcRetries})` },
                    { nfcClass: 'status-fail' }
                );
            });
        } else {
            this.updateJoinMethodStatus({ nfc: 'NFC: not available' }, { nfcClass: 'status-skip' });
        }

        // Sound: stop after max retries
        if (isUltrasoundSupported()) {
            this.updateJoinMethodStatus({ sound: 'Sound: listening…' }, { soundClass: 'status-trying' });
            const startSoundCycle = () => {
                if (state.connected) return;
                if (state.soundRetries >= max) return;
                startUltrasoundListen((connectionId) => {
                    this.stopJoinAutoMethods();
                    state.connected = true;
                    this.updateJoinMethodStatus({ sound: 'Sound: received' }, { soundClass: 'status-success' });
                    this.showNfcJoinConfirm(connectionId, statusEl, null, () => this.showJoinUI());
                }).then(ctrl => {
                    this.ultrasoundListenController = ctrl;
                    const scheduleNextRetryTick = () => {
                        if (state.connected) return;
                        if (state.soundRetries >= max) return;
                        this._joinSoundCycleId = window.setTimeout(() => {
                            this._joinSoundCycleId = undefined;
                            if (state.connected) return;
                            state.soundRetries++;
                            const stopped = state.soundRetries >= max;
                            this.updateJoinMethodStatus(
                                { sound: stopped ? `Sound: not success (stopped after ${max} retries)` : `Sound: listening… (retry ${state.soundRetries})` },
                                { soundClass: stopped ? 'status-fail' : 'status-trying' }
                            );
                            if (!stopped) scheduleNextRetryTick();
                        }, this._joinSoundCycleMs);
                    };
                    scheduleNextRetryTick();
                }).catch(() => {
                    state.soundRetries++;
                    const stopped = state.soundRetries >= max;
                    this.updateJoinMethodStatus(
                        { sound: stopped ? `Sound: not success (stopped after ${max} retries)` : `Sound: not success (retry ${state.soundRetries})` },
                        { soundClass: 'status-fail' }
                    );
                    if (!stopped) this._joinSoundCycleId = window.setTimeout(startSoundCycle, 2000);
                });
            };
            startSoundCycle();
        } else {
            this.updateJoinMethodStatus({ sound: 'Sound: not available' }, { soundClass: 'status-skip' });
        }

        this.updateJoinPrimaryButton();
        this.updateConnectionStatus('', 'join-connection-status');
    }

    /**
     * No-op: LAN/same-device auto-discovery has been removed; join only via QR scan or Enter Code.
     */
    async refreshNearbyGames() {
        const nearbyContainer = document.getElementById('nearby-games-container');
        const nearbyList = document.getElementById('nearby-games-list');
        if (nearbyContainer) nearbyContainer.style.display = 'none';
        if (nearbyList) nearbyList.innerHTML = '';
    }

    /**
     * One-touch JOIN: go directly to single join screen (permissions row + host area + primary button).
     */
    async startOneTouchJoin() {
        await this.showJoinUI();
    }

    /**
     * Refresh permission status for NFC, Camera, Microphone and update the one-row chips.
     */
    async refreshJoinPermissions() {
        const nfcSupported = isNfcSupported();
        const nfcChip = document.getElementById('perm-nfc');
        const nfcStatusEl = document.getElementById('perm-nfc-status');
        const nfcAllowBtn = document.getElementById('perm-nfc-allow');
        if (nfcChip) {
            nfcChip.className = 'join-perm-chip ' + (nfcSupported ? 'perm-allowed' : 'perm-unsupported');
        }
        if (nfcStatusEl) nfcStatusEl.textContent = nfcSupported ? 'On' : 'Not supported';
        if (nfcAllowBtn) nfcAllowBtn.style.display = 'none';

        await this.updateCameraPermissionUI();
        await this.updateMicrophonePermissionUI();
    }

    async updateCameraPermissionUI() {
        const chip = document.getElementById('perm-camera');
        const statusEl = document.getElementById('perm-camera-status');
        const allowBtn = document.getElementById('perm-camera-allow');
        if (!chip || !statusEl) return;
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            stream.getTracks().forEach(t => t.stop());
            chip.className = 'join-perm-chip perm-allowed';
            statusEl.textContent = 'On';
            if (allowBtn) allowBtn.style.display = 'none';
        } catch (e) {
            chip.className = 'join-perm-chip perm-denied';
            statusEl.textContent = '';
            if (allowBtn) allowBtn.style.display = 'inline-block';
        }
    }

    async updateMicrophonePermissionUI() {
        const chip = document.getElementById('perm-microphone');
        const statusEl = document.getElementById('perm-microphone-status');
        const allowBtn = document.getElementById('perm-microphone-allow');
        if (!chip || !statusEl) return;
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            stream.getTracks().forEach(t => t.stop());
            chip.className = 'join-perm-chip perm-allowed';
            statusEl.textContent = 'On';
            if (allowBtn) allowBtn.style.display = 'none';
        } catch (e) {
            chip.className = 'join-perm-chip perm-denied';
            statusEl.textContent = '';
            if (allowBtn) allowBtn.style.display = 'inline-block';
        }
    }

    /**
     * Message shown when media permission was denied so the user can allow in site
     * settings and click Allow again. Browsers do not re-prompt after a denial.
     * @param {'microphone'|'camera'} mediaType
     * @returns {string}
     */
    getMediaPermissionDeniedHint(mediaType) {
        const label = mediaType === 'microphone' ? 'Microphone' : 'Camera';
        return `${label} was blocked. Allow it in your browser’s site settings (lock/info icon in the address bar), then click Allow again.`;
    }

    /**
     * Request camera permission from a click. Must call getUserMedia synchronously
     * in the click handler so the browser shows the permission prompt (user activation).
     * If the user previously denied, we still try; on failure we show how to allow and click again.
     */
    requestCameraPermissionFromClick() {
        const p = navigator.mediaDevices.getUserMedia({ video: true });
        p.then(stream => {
            stream.getTracks().forEach(t => t.stop());
            this.updateCameraPermissionUI();
            this.updateJoinPrimaryButton();
        }).catch(() => {
            this.updateCameraPermissionUI();
            this.updateJoinPrimaryButton();
            const statusEl = document.getElementById('join-connection-status');
            if (statusEl) this.updateConnectionStatus(this.getMediaPermissionDeniedHint('camera'), 'join-connection-status');
        });
    }

    /**
     * Request microphone permission from a click. Must call getUserMedia synchronously
     * in the click handler so the browser shows the permission prompt (user activation).
     * If the user previously denied, the browser won't re-prompt; we show instructions
     * so they can allow in site settings and click Allow again.
     */
    requestMicrophonePermissionFromClick() {
        this.updateConnectionStatus('Requesting microphone access…', 'join-connection-status');
        const p = navigator.mediaDevices.getUserMedia({ audio: true });
        p.then(stream => {
            stream.getTracks().forEach(t => t.stop());
            this.updateMicrophonePermissionUI();
            this.updateJoinPrimaryButton();
            this.updateConnectionStatus('', 'join-connection-status');
        }).catch(() => {
            this.updateMicrophonePermissionUI();
            this.updateJoinPrimaryButton();
            this.updateConnectionStatus(this.getMediaPermissionDeniedHint('microphone'), 'join-connection-status');
        });
    }

    /** Update primary button label: always QR scan (Enter Code is a separate button below). */
    updateJoinPrimaryButton() {
        const btn = document.getElementById('join-primary-btn');
        const manualSection = document.getElementById('join-manual-code-section');
        if (!btn) return;
        btn.textContent = 'QR scan';
        btn.dataset.action = 'qr';
        if (manualSection) manualSection.style.display = 'none';
    }

    /** Show manual code section and focus input (used e.g. from URL params or fallback) */
    showJoinManualCodeSection() {
        const section = document.getElementById('join-manual-code-section');
        const input = document.getElementById('manual-connection-input');
        if (section) section.style.display = 'block';
        if (input) input.focus();
    }

    /** Open Enter Code popup (same flow as QR Scan: input + Connect, then join and close). */
    openEnterCodePopup() {
        const popup = document.getElementById('enter-code-popup');
        const input = document.getElementById('enter-code-popup-input');
        if (!popup) return;
        if (input) {
            input.value = '';
            input.focus();
        }
        popup.style.display = 'flex';
    }

    /** Close Enter Code popup. */
    closeEnterCodePopup() {
        const popup = document.getElementById('enter-code-popup');
        if (popup) popup.style.display = 'none';
    }
    
    /**
     * If connected (HOST or PLAYER), show NFC 📤 and Sound 📤 on connection screen.
     * Auto-starts NFC write when NFC is supported.
     */
    maybeShowNfcShareOnConnectionScreen() {
        if (!this.multiplayerManager.connection?.isConnected) return;
        const hostControls = document.getElementById('host-controls');
        if (!hostControls) return;
        const roomId = this.multiplayerManager.connection.isHost
            ? this.multiplayerManager.connection.roomId
            : this.multiplayerManager.connection.hostId;
        if (!roomId) return;

        if (isUltrasoundSupported() && !document.getElementById('sound-share-invite-btn')) {
            const soundBtn = document.createElement('button');
            soundBtn.id = 'sound-share-invite-btn';
            soundBtn.className = 'settings-button';
            soundBtn.textContent = 'Sound 📤';
            soundBtn.title = 'Play inaudible sound (loops). Tap again to stop. Join device listens on Join screen.';
            soundBtn.addEventListener('click', () => this.sendInviteViaSound());
            hostControls.insertBefore(soundBtn, hostControls.firstChild);
        }

        if (isNfcSupported() && !document.getElementById('nfc-share-invite-btn')) {
            const nfcBtn = document.createElement('button');
            nfcBtn.id = 'nfc-share-invite-btn';
            nfcBtn.className = 'settings-button';
            nfcBtn.textContent = 'NFC 📤';
            nfcBtn.title = 'Hold your device to the other device to send invite (tap to retry)';
            nfcBtn.addEventListener('click', () => this.sendInviteViaNfc());
            hostControls.insertBefore(nfcBtn, hostControls.firstChild);
            this.startNfcWriteWhenReady();
        }
    }

    /**
     * Host or Player: toggle sound share. One click = loop until stop; click again or Disconnect/Play = stop.
     */
    sendInviteViaSound() {
        if (this.soundShareController) {
            this.stopSoundShare();
            if (this.multiplayerManager.game?.hudManager) {
                this.multiplayerManager.game.hudManager.showNotification('Sound invite stopped', 'info');
            }
            return;
        }
        const roomId = this.multiplayerManager.connection?.isHost
            ? this.multiplayerManager.connection?.roomId
            : this.multiplayerManager.connection?.hostId;
        if (!roomId) return;
        const btn = document.getElementById('sound-share-invite-btn');
        if (btn) {
            btn.textContent = '⏹ Stop';
            btn.disabled = false;
            btn.title = 'Stop broadcasting so joiners can stop listening';
        }
        try {
            this.soundShareController = playUltrasoundInviteLoop(roomId);
            if (this.multiplayerManager.game?.hudManager) {
                this.multiplayerManager.game.hudManager.showNotification('Broadcasting invite via sound. Tap Stop or Disconnect to stop.', 'info');
            }
        } catch (e) {
            this.soundShareController = null;
            if (btn) btn.textContent = 'Sound 📤';
            if (this.multiplayerManager.game?.hudManager) {
                this.multiplayerManager.game.hudManager.showNotification('Sound invite failed. Use code or QR.', 'error');
            }
        }
    }
    
    /**
     * Start NFC write in the background when connection screen is shown.
     * Host/Player device is then "waiting to write" so when Joiner touches, it works without tapping the button.
     */
    startNfcWriteWhenReady() {
        const roomId = this.multiplayerManager.connection?.isHost
            ? this.multiplayerManager.connection?.roomId
            : this.multiplayerManager.connection?.hostId;
        if (!roomId) return;
        const btn = document.getElementById('nfc-share-invite-btn');
        if (btn) {
            btn.disabled = true;
            btn.textContent = 'Hold…';
        }
        const resetButton = (immediate) => {
            if (this._nfcWriteTimeoutId !== undefined) {
                clearTimeout(this._nfcWriteTimeoutId);
                this._nfcWriteTimeoutId = undefined;
            }
            const b = document.getElementById('nfc-share-invite-btn');
            if (b) {
                b.disabled = false;
                b.textContent = 'NFC 📤';
            }
        };
        writeNfcInvite(roomId).then(() => {
            if (this.multiplayerManager.game?.hudManager) {
                this.multiplayerManager.game.hudManager.showNotification('Invite sent via NFC', 'info');
            }
            resetButton(true);
        }).catch(() => {
            if (this._nfcWriteTimeoutId !== undefined) {
                clearTimeout(this._nfcWriteTimeoutId);
                this._nfcWriteTimeoutId = undefined;
            }
            if (this.multiplayerManager.game?.hudManager) {
                this.multiplayerManager.game.hudManager.showNotification(
                    'NFC didn\'t connect. Tap NFC 📤 and hold devices together, or use code/QR.',
                    'error'
                );
            }
            this._resetNfcShareButtonAfterDelay(false);
        });
        // If no peer touches within 45s, re-enable button so user can tap NFC 📤 to retry
        this._nfcWriteTimeoutId = window.setTimeout(() => {
            this._nfcWriteTimeoutId = undefined;
            resetButton(true);
        }, 45000);
    }

    /**
     * Reset NFC share button after a short delay (avoids instant flip-back when write rejects).
     * @param {boolean} success - whether invite was sent
     */
    _resetNfcShareButtonAfterDelay(success) {
        const delayMs = success ? 0 : 3500;
        window.setTimeout(() => {
            const b = document.getElementById('nfc-share-invite-btn');
            if (b) {
                b.disabled = false;
                b.textContent = 'NFC 📤';
            }
        }, delayMs);
    }

    /**
     * Host or Player: write room/connection ID to NFC so the other device can join when they touch (then confirm).
     * Button stays "Hold…" for a few seconds on failure so it doesn't look like a bug.
     */
    async sendInviteViaNfc() {
        const roomId = this.multiplayerManager.connection?.isHost
            ? this.multiplayerManager.connection?.roomId
            : this.multiplayerManager.connection?.hostId;
        if (!roomId) return;
        const btn = document.getElementById('nfc-share-invite-btn');
        if (btn) {
            btn.disabled = true;
            btn.textContent = 'Hold…';
        }
        try {
            await writeNfcInvite(roomId);
            if (this.multiplayerManager.game?.hudManager) {
                this.multiplayerManager.game.hudManager.showNotification('Invite sent via NFC', 'info');
            }
            this._resetNfcShareButtonAfterDelay(true);
        } catch (e) {
            if (this.multiplayerManager.game?.hudManager) {
                this.multiplayerManager.game.hudManager.showNotification(
                    'NFC didn\'t connect. Make sure the other phone is on Join screen, then try again. Or use code/QR.',
                    'error'
                );
            }
            this._resetNfcShareButtonAfterDelay(false);
        }
    }
    
    /**
     * Update the connection info screen with current connection data
     */
    updateConnectionInfoScreen() {
        // Update connection status
        const statusElement = document.getElementById('connection-info-status');
        if (statusElement) {
            if (this.multiplayerManager.connection && this.multiplayerManager.connection.isConnected) {
                statusElement.textContent = 'Connected';
                statusElement.className = 'status-connected';
            } else {
                statusElement.textContent = 'Disconnected';
                statusElement.className = 'status-disconnected';
            }
        }
        
        // Update role info
        const roleElement = document.getElementById('connection-role-info');
        if (roleElement) {
            if (this.multiplayerManager.connection) {
                if (this.multiplayerManager.connection.isHost) {
                    roleElement.textContent = 'You are the host';
                } else {
                    roleElement.textContent = 'You are connected as a player';
                }
            } else {
                roleElement.textContent = '';
            }
        }
        
        // Update start game button visibility based on host status
        const startGameBtn = document.getElementById('start-game-btn');
        if (startGameBtn) {
            if (this.multiplayerManager.connection && this.multiplayerManager.connection.isHost) {
                startGameBtn.style.display = 'block';
            } else {
                startGameBtn.style.display = 'none';
            }
        }
        
        // Update player list
        this.updateConnectionInfoPlayerList();
        
        // Update connection code display and QR code for both host and members
        if (this.multiplayerManager.connection && this.multiplayerManager.connection.isConnected) {
            // For host, use the room ID
            // For players, use the host's ID which is the room ID
            const roomId = this.multiplayerManager.connection.isHost ? 
                this.multiplayerManager.connection.roomId : 
                this.multiplayerManager.connection.hostId;
                
            if (roomId) {
                this.displayConnectionCode(roomId);
                
                // Generate QR code for the connection info screen for both host and members
                const qrContainer = document.getElementById('connection-info-qr');
                if (qrContainer) {
                    // Make sure QR container is visible
                    qrContainer.style.display = 'block';
                    
                    // Clear any previous QR code
                    qrContainer.innerHTML = '';
                    
                    // Generate QR code
                    console.debug(`Generating QR code with room ID: ${roomId}`);
                    this.generateQRCode(roomId);
                } else {
                    console.warn('QR container element not found');
                }
            } else {
                console.warn('Room ID not available for QR code generation');
            }
        }
    }
    
    /**
     * Update the player list in the connection info screen
     */
    updateConnectionInfoPlayerList() {
        const playersList = document.getElementById('connection-info-players');
        if (!playersList) return;
        
        // Clear existing list
        playersList.innerHTML = '';
        
        // Add host entry if we're connected
        if (this.multiplayerManager.connection && this.multiplayerManager.connection.isConnected) {
            // Get host ID and color
            let hostId = this.multiplayerManager.connection.isHost ? 
                this.multiplayerManager.connection.peer.id : 
                this.multiplayerManager.connection.hostId;
            
            // Get host color
            let hostColor = '#FF5733'; // Default color
            if (this.multiplayerManager.assignedColors.has(hostId)) {
                hostColor = this.multiplayerManager.assignedColors.get(hostId);
            }
            
            // Create host entry
            const hostItem = document.createElement('div');
            hostItem.className = 'player-item host-player';
            
            // Create host color indicator
            const hostColorIndicator = document.createElement('div');
            hostColorIndicator.className = 'player-color-indicator';
            hostColorIndicator.style.backgroundColor = hostColor;
            
            // Create host name span
            const hostName = document.createElement('span');
            hostName.textContent = 'Host';
            
            // Add "You" indicator if the user is the host
            if (this.multiplayerManager.connection.isHost) {
                const youIndicator = document.createElement('span');
                youIndicator.className = 'you-indicator';
                youIndicator.textContent = '(You)';
                hostName.appendChild(youIndicator);
            }
            
            // Append elements
            hostItem.appendChild(hostColorIndicator);
            hostItem.appendChild(hostName);
            playersList.appendChild(hostItem);
            
            // Add connected players
            if (this.multiplayerManager.connection.peers) {
                this.multiplayerManager.connection.peers.forEach((conn, peerId) => {
                    // Get player color
                    let playerColor = '#33FF57'; // Default color
                    if (this.multiplayerManager.assignedColors.has(peerId)) {
                        playerColor = this.multiplayerManager.assignedColors.get(peerId);
                    }
                    
                    // Create player item
                    const playerItem = document.createElement('div');
                    playerItem.className = 'player-item';
                    
                    // Create player color indicator
                    const colorIndicator = document.createElement('div');
                    colorIndicator.className = 'player-color-indicator';
                    colorIndicator.style.backgroundColor = playerColor;
                    
                    // Create player name span
                    const playerName = document.createElement('span');
                    playerName.textContent = `Player ${peerId.substring(0, 8)}`;
                    
                    // Add "You" indicator if this is the current player
                    if (peerId === this.multiplayerManager.connection.peer.id) {
                        const youIndicator = document.createElement('span');
                        youIndicator.className = 'you-indicator';
                        youIndicator.textContent = '(You)';
                        playerName.appendChild(youIndicator);
                    }
                    
                    // Create kick button (for host only)
                    if (this.multiplayerManager.connection.isHost) {
                        const kickButton = document.createElement('button');
                        kickButton.className = 'kick-player-btn';
                        kickButton.textContent = '✕';
                        kickButton.title = 'Remove player';
                        kickButton.setAttribute('data-player-id', peerId);
                        kickButton.addEventListener('click', (event) => {
                            event.stopPropagation();
                            const playerId = event.target.getAttribute('data-player-id');
                            if (playerId && this.multiplayerManager.connection) {
                                this.multiplayerManager.connection.kickPlayer(playerId);
                                // Update the UI after kicking
                                setTimeout(() => this.updateConnectionInfoScreen(), 500);
                            }
                        });
                        
                        // Append elements
                        playerItem.appendChild(colorIndicator);
                        playerItem.appendChild(playerName);
                        playerItem.appendChild(kickButton);
                    } else {
                        // Append elements without kick button for non-hosts
                        playerItem.appendChild(colorIndicator);
                        playerItem.appendChild(playerName);
                    }
                    
                    playersList.appendChild(playerItem);
                });
            }
        } else {
            // Not connected
            const noConnectionItem = document.createElement('div');
            noConnectionItem.className = 'no-connection-message';
            noConnectionItem.textContent = 'Not connected to any multiplayer game';
            playersList.appendChild(noConnectionItem);
        }
    }

    // showHostUI method has been removed as it's no longer needed

    /**
     * Show the single join screen: permissions row, host area, auto-scan, primary button (Play / QR scan / Enter Code).
     */
    async showJoinUI() {
        document.getElementById('multiplayer-initial-screen').style.display = 'none';
        document.getElementById('join-game-screen').style.display = 'flex';
        const playerWaitingScreen = document.getElementById('player-waiting-screen');
        if (playerWaitingScreen) playerWaitingScreen.style.display = 'none';

        this._detectedHostId = null;
        const nfcConfirm = document.getElementById('nfc-join-confirm');
        if (nfcConfirm) nfcConfirm.style.display = 'none';
        document.getElementById('join-manual-code-section').style.display = 'none';
        document.getElementById('qr-scan-popup').style.display = 'none';
        document.getElementById('enter-code-popup').style.display = 'none';

        const manualInput = document.getElementById('manual-connection-input');
        if (manualInput) manualInput.value = '';
        const manualConnectBtn = document.getElementById('manual-connect-btn');
        if (manualConnectBtn) manualConnectBtn.disabled = false;

        const backButton = document.getElementById('back-from-join-btn');
        if (backButton) {
            backButton.onclick = () => {
                this.stopQRScanner();
                this.stopJoinAutoMethods();
                document.getElementById('join-game-screen').style.display = 'none';
                document.getElementById('qr-scan-popup').style.display = 'none';
                document.getElementById('enter-code-popup').style.display = 'none';
                this.showMultiplayerModal();
            };
        }

        // Permissions row: refresh status (Allow buttons wired in setupUIListeners)
        await this.refreshJoinPermissions();

        // Primary button: QR scan
        const primaryBtn = document.getElementById('join-primary-btn');
        if (primaryBtn) {
            primaryBtn.onclick = () => this.onJoinPrimaryClick();
        }

        // Enter Code button (below QR scan): show Enter Code popup (same flow as QR → Connect)
        const enterCodeBtn = document.getElementById('join-enter-code-btn');
        if (enterCodeBtn) {
            enterCodeBtn.onclick = () => this.openEnterCodePopup();
        }

        // Manual connect (when manual section is visible)
        if (manualConnectBtn) {
            manualConnectBtn.onclick = () => {
                const code = document.getElementById('manual-connection-input')?.value?.trim();
                if (code) {
                    manualConnectBtn.textContent = 'Connecting...';
                    manualConnectBtn.disabled = true;
                    this.updateConnectionStatus('Connecting...', 'join-connection-status');
                    this.multiplayerManager.joinGame(code);
                } else {
                    this.updateConnectionStatus('Please enter a connection code', 'join-connection-status');
                }
            };
        }

        // QR popup close button
        const qrPopupClose = document.getElementById('qr-scan-popup-close');
        if (qrPopupClose) {
            qrPopupClose.onclick = () => this.closeQRScanPopup();
        }

        // Enter Code popup: close, connect, paste, Enter key
        const enterCodePopupClose = document.getElementById('enter-code-popup-close');
        if (enterCodePopupClose) enterCodePopupClose.onclick = () => this.closeEnterCodePopup();
        const enterCodePopupConnect = document.getElementById('enter-code-popup-connect');
        const enterCodePopupInput = document.getElementById('enter-code-popup-input');
        if (enterCodePopupConnect && enterCodePopupInput) {
            enterCodePopupConnect.onclick = () => {
                const code = enterCodePopupInput.value.trim();
                if (code) {
                    this.updateConnectionStatus('Connecting...', 'join-connection-status');
                    this.multiplayerManager.joinGame(code);
                    this.closeEnterCodePopup();
                } else {
                    this.updateConnectionStatus('Please enter a connection code', 'join-connection-status');
                }
            };
            enterCodePopupInput.onkeydown = (e) => {
                if (e.key === 'Enter') enterCodePopupConnect.click();
            };
        }
        const enterCodePopupPaste = document.getElementById('enter-code-popup-paste');
        if (enterCodePopupPaste && enterCodePopupInput) {
            enterCodePopupPaste.onclick = async () => {
                try {
                    const text = await navigator.clipboard.readText();
                    enterCodePopupInput.value = text;
                } catch (err) {
                    this.updateConnectionStatus('Could not paste from clipboard', 'join-connection-status');
                }
            };
        }

        // Reset auto-scan state and wire Retry all
        const state = this._joinMethodState;
        state.connected = false;
        state.nfcRetries = 0;
        state.soundRetries = 0;
        this.stopJoinAutoMethods();

        const statusEl = document.getElementById('join-connection-status');
        const setStatus = (msg) => { if (statusEl) statusEl.textContent = msg; };

        const retryAllBtn = document.getElementById('join-retry-all-btn');
        if (retryAllBtn) {
            retryAllBtn.style.display = 'none'; // No auto-scan; explicit QR / Enter Code only
            retryAllBtn.onclick = () => {
                state.connected = false;
                state.nfcRetries = 0;
                state.soundRetries = 0;
                this.stopJoinAutoMethods();
                this.startJoinAutoMethods(statusEl, setStatus);
            };
        }

        this.updateRejoinHostArea();

        this.startJoinAutoMethods(statusEl, setStatus);
    }

    /** Handle primary button click: QR scan or Enter Code */
    onJoinPrimaryClick() {
        const btn = document.getElementById('join-primary-btn');
        const action = btn?.dataset?.action || '';
        if (action === 'qr') {
            this.openQRScanPopup();
            return;
        }
        if (action === 'code') {
            this.showJoinManualCodeSection();
        }
    }

    /** Open QR scan popup and start scanning; on success join immediately and show waiting screen. */
    async openQRScanPopup() {
        const popup = document.getElementById('qr-scan-popup');
        if (!popup) return;
        popup.style.display = 'flex';
        const loadingEl = document.getElementById('qr-scanner-loading');
        if (loadingEl) loadingEl.style.display = 'flex';
        const onDetected = (connectId) => {
            this.stopQRScanner();
            popup.style.display = 'none';
            if (loadingEl) loadingEl.style.display = 'none';
            this.updateConnectionStatus('Connecting...', 'join-connection-status');
            this.multiplayerManager.joinGame(connectId);
        };
        try {
            if (typeof Html5Qrcode === 'undefined') await this.loadQRScannerJS();
            await this.getAvailableCameras();
            if (loadingEl) loadingEl.style.display = 'none';
            await this.startQRScannerInPopup(onDetected);
        } catch (e) {
            if (loadingEl) loadingEl.style.display = 'none';
            popup.style.display = 'none';
            this.updateConnectionStatus('QR scanner failed. Try Enter Code.', 'join-connection-status');
        }
    }

    /** Start QR scanner inside popup; on success call onDetected(connectId) and do not join yet. */
    async startQRScannerInPopup(onDetected) {
        if (typeof Html5Qrcode === 'undefined') return;
        await this.stopQRScanner();
        const scannerEl = document.getElementById('qr-scanner-view');
        if (scannerEl) scannerEl.innerHTML = '';
        if (!this.availableCameras || this.availableCameras.length === 0) await this.getAvailableCameras();
        this.qrCodeScanner = new Html5Qrcode('qr-scanner-view');
        const cameraConfig = this.selectedCameraId
            ? { deviceId: this.selectedCameraId }
            : { facingMode: 'environment' };
        const qrboxSize = (w, h) => {
            const minSide = Math.min(w, h);
            return { width: Math.min(Math.floor(minSide * 0.85), 400), height: Math.min(Math.floor(minSide * 0.85), 400) };
        };
        await this.qrCodeScanner.start(
            cameraConfig,
            {
                fps: 20,
                qrbox: qrboxSize,
                aspectRatio: 1,
                formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
                disableFlip: false,
                videoConstraints: this.selectedCameraId ? {} : { facingMode: { ideal: 'environment' } }
            },
            (decodedText) => {
                this.stopQRScanner();
                let connectId = decodedText;
                try {
                    if (decodedText.startsWith('http') || decodedText.includes('?join=') || decodedText.includes('connect-id=')) {
                        const url = new URL(decodedText);
                        const params = new URLSearchParams(url.search);
                        if (params.get('connect-id')) connectId = params.get('connect-id');
                    }
                } catch (_) {}
                onDetected(connectId);
            },
            () => {}
        );
    }

    /** Close QR scan popup and stop scanner. */
    closeQRScanPopup() {
        this.stopQRScanner();
        const popup = document.getElementById('qr-scan-popup');
        if (popup) popup.style.display = 'none';
        const loadingEl = document.getElementById('qr-scanner-loading');
        if (loadingEl) loadingEl.style.display = 'none';
    }
    
    /**
     * Start QR scanner with loading indicator
     */
    async startQRScannerWithUI() {
        try {
            // Show loading indicator
            const qrScannerView = document.getElementById('qr-scanner-view');
            if (qrScannerView) {
                // Create and add loading overlay if it doesn't exist
                let loadingOverlay = document.getElementById('qr-scanner-loading');
                if (!loadingOverlay) {
                    loadingOverlay = document.createElement('div');
                    loadingOverlay.id = 'qr-scanner-loading';
                    loadingOverlay.className = 'loading-overlay';
                    loadingOverlay.innerHTML = `
                        <div class="loading-spinner"></div>
                        <div class="loading-text">Initializing camera...</div>
                    `;
                    qrScannerView.parentNode.appendChild(loadingOverlay);
                } else {
                    loadingOverlay.style.display = 'flex';
                }
            }
            
            this.updateConnectionStatus('Initializing camera...', 'join-connection-status');
            
            // Load HTML5-QRCode library if not already loaded - do this in parallel
            const libraryPromise = (typeof Html5Qrcode === 'undefined') ? this.loadQRScannerJS() : Promise.resolve();
            
            // Start a timeout to show manual entry if camera takes too long
            const timeoutPromise = new Promise((resolve) => {
                setTimeout(() => {
                    console.debug('Camera initialization taking longer than expected, showing manual entry option');
                    // Show manual code view alongside camera view
                    const manualCodeView = document.getElementById('manual-code-view');
                    if (manualCodeView) {
                        manualCodeView.style.display = 'flex';
                    }
                    resolve();
                }, 3000); // 3 seconds timeout
            });
            
            // Wait for library to load
            await libraryPromise;
            
            // Get available cameras and set up camera selection - prioritize back camera
            await this.getAvailableCameras();
            
            // Start scanner automatically with higher FPS for better detection
            await this.startQRScanner();
            
            // Hide loading overlay
            const loadingOverlay = document.getElementById('qr-scanner-loading');
            if (loadingOverlay) {
                loadingOverlay.style.display = 'none';
            }
            
            this.updateConnectionStatus('Camera active. Point at a QR code to connect.', 'join-connection-status');
            return true;
        } catch (error) {
            console.error('Error initializing QR scanner:', error);
            this.updateConnectionStatus('QR scanner not available. Please enter connection code manually.', 'join-connection-status');
            
            // Show manual code view if camera fails
            document.getElementById('scan-qr-view').style.display = 'none';
            document.getElementById('manual-code-view').style.display = 'flex';
            return false;
        }
    }
    
    /**
     * Show the connection info screen (after joining a game)
     * This replaces the old showPlayerWaitingScreen function
     */
    showPlayerWaitingScreen() {
        // For backward compatibility, redirect to the connection info screen
        this.showConnectionInfoScreen();
    }
    
    /**
     * Get available cameras
     * @returns {Promise<Array>} A promise that resolves with an array of camera devices
     */
    async getAvailableCameras() {
        if (typeof Html5Qrcode === 'undefined') {
            await this.loadQRScannerJS();
        }
        
        try {
            // Get available cameras using the Html5Qrcode API
            this.availableCameras = await Html5Qrcode.getCameras();
            console.debug('Available cameras:', this.availableCameras);
            
            // Populate the camera select dropdown
            const cameraSelect = document.getElementById('camera-select');
            if (cameraSelect) {
                // Clear existing options
                cameraSelect.innerHTML = '';
                
                // Add options for each camera
                this.availableCameras.forEach(camera => {
                    const option = document.createElement('option');
                    option.value = camera.id;
                    option.textContent = camera.label || `Camera ${camera.id.substring(0, 4)}`;
                    cameraSelect.appendChild(option);
                });
                
                // Show the select dropdown if we have multiple cameras
                if (this.availableCameras.length > 1) {
                    cameraSelect.style.display = 'block';
                    
                    // Set up event listener for camera selection
                    cameraSelect.onchange = (e) => {
                        this.selectedCameraId = e.target.value;
                        
                        // Restart scanner with new camera if it's currently running
                        if (this.qrCodeScanner) {
                            this.stopQRScanner();
                            this.startQRScanner();
                        }
                    };
                    
                    // Set initial selected camera: prefer back (rear) camera for QR scanning
                    const label = (camera) => (camera.label || '').toLowerCase();
                    const isBackCamera = (camera) => label(camera).includes('back') ||
                        label(camera).includes('rear') || label(camera).includes('environment') ||
                        label(camera).includes('facing back') || label(camera).includes('external');
                    const isFrontCamera = (camera) => label(camera).includes('front') ||
                        label(camera).includes('user') || label(camera).includes('facing user');
                    const backCamera = this.availableCameras.find(isBackCamera);
                    const frontCamera = this.availableCameras.find(isFrontCamera);

                    if (backCamera) {
                        this.selectedCameraId = backCamera.id;
                        cameraSelect.value = backCamera.id;
                    } else if (this.availableCameras.length === 2 && frontCamera) {
                        // Two cameras and we know which is front → use the other as back
                        this.selectedCameraId = this.availableCameras.find(c => c.id !== frontCamera.id).id;
                        cameraSelect.value = this.selectedCameraId;
                    } else if (this.availableCameras.length > 0) {
                        // Unclear which is back: use environment facing in startQRScanner
                        this.selectedCameraId = null;
                        cameraSelect.value = '';
                        const firstOpt = cameraSelect.querySelector('option');
                        if (firstOpt) {
                            firstOpt.insertAdjacentHTML('beforebegin', '<option value="">Back camera (recommended)</option>');
                            cameraSelect.selectedIndex = 0;
                        }
                    }
                } else if (this.availableCameras.length === 1) {
                    // Only one camera available
                    this.selectedCameraId = this.availableCameras[0].id;
                    cameraSelect.style.display = 'none';
                }
                // Show "Switch camera" button when multiple cameras so user can pick back camera
                const switchBtn = document.getElementById('switch-camera-btn');
                if (switchBtn) {
                    switchBtn.style.display = this.availableCameras.length > 1 ? 'inline-block' : 'none';
                }
            }
            
            return this.availableCameras;
        } catch (error) {
            console.error('Error getting cameras:', error);
            this.updateConnectionStatus('Could not access cameras. Please check permissions.', 'join-connection-status');
            return [];
        }
    }
    
    /**
     * Start the QR scanner
     */
    async startQRScanner() {
        if (typeof Html5Qrcode === 'undefined') {
            this.updateConnectionStatus('QR scanner library not loaded. Please enter code manually.', 'join-connection-status');
            return;
        }
        
        try {
            // Ensure any previous scanner is fully stopped and container is clean
            await this.stopQRScanner();
            const scannerEl = document.getElementById('qr-scanner-view');
            if (scannerEl) scannerEl.innerHTML = '';
            
            // Get available cameras if we haven't already
            if (!this.availableCameras || this.availableCameras.length === 0) {
                await this.getAvailableCameras();
            }
            
            // Create QR scanner instance
            this.qrCodeScanner = new Html5Qrcode('qr-scanner-view');
            
            // Configure camera settings
            let cameraConfig;
            
            if (this.selectedCameraId) {
                // Use selected camera ID if available
                cameraConfig = { deviceId: this.selectedCameraId };
            } else {
                // Fall back to environment facing camera (back on mobile)
                cameraConfig = { facingMode: 'environment' };
            }
            // Show "Switch camera" button when multiple cameras
            const switchCameraBtn = document.getElementById('switch-camera-btn');
            if (switchCameraBtn && this.availableCameras.length > 1) {
                switchCameraBtn.style.display = 'inline-block';
                if (!switchCameraBtn.hasAttribute('data-listener-added')) {
                    switchCameraBtn.addEventListener('click', () => this.cycleQRCamera());
                    switchCameraBtn.setAttribute('data-listener-added', 'true');
                }
            }

            // Show the "Enter Code" button overlay
            const enterCodeOverlay = document.getElementById('enter-code-overlay');
            if (enterCodeOverlay) {
                // Make the overlay visible
                enterCodeOverlay.style.display = 'flex';
                
                // Add event listener to the button if not already added
                if (!enterCodeOverlay.hasAttribute('data-listener-added')) {
                    enterCodeOverlay.addEventListener('click', () => {
                        // Stop scanner
                        this.stopQRScanner();
                        
                        // Show manual code view
                        document.getElementById('scan-qr-view').style.display = 'none';
                        document.getElementById('manual-code-view').style.display = 'flex';
                        
                        // Focus on the input field
                        const input = document.getElementById('manual-connection-input');
                        if (input) {
                            input.focus();
                        }
                        
                        this.updateConnectionStatus('Enter the connection code to join the game', 'join-connection-status');
                    });
                    
                    // Mark that we've added the listener
                    enterCodeOverlay.setAttribute('data-listener-added', 'true');
                }
            }
            
            // Start the scanner with improved settings for reliable detection
            // qrbox as function: use most of the viewfinder so QR can be detected anywhere on screen
            // (fixed 250x250 was often too small on large screens, so camera looked "static" with no scan)
            const qrboxSize = (viewfinderWidth, viewfinderHeight) => {
                const minSide = Math.min(viewfinderWidth, viewfinderHeight);
                const size = Math.min(Math.floor(minSide * 0.85), 400); // 85% of view, max 400px
                return { width: size, height: size };
            };
            const videoConstraints = {
                width: { ideal: 1280, min: 640 },
                height: { ideal: 720, min: 480 }
            };
            if (!this.selectedCameraId) {
                videoConstraints.facingMode = { ideal: 'environment' };
            }
            await this.qrCodeScanner.start(
                cameraConfig,
                { 
                    fps: 20,                // Higher FPS for more frequent scan attempts
                    qrbox: qrboxSize,
                    aspectRatio: 1,         // Square aspect ratio
                    formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
                    disableFlip: false,
                    videoConstraints,
                    experimentalFeatures: {
                        useBarCodeDetectorIfSupported: true
                    }
                },
                (decodedText) => {
                    // Stop scanning immediately when QR code is detected
                    this.stopQRScanner();
                    this.updateConnectionStatus('QR code detected! Connecting...', 'join-connection-status');
                    
                    // Check if the decoded text is a URL with our parameters
                    let connectId = decodedText;
                    
                    try {
                        // Try to parse as URL - more flexible URL detection
                        if (decodedText.startsWith('http') || decodedText.includes('?join=') || decodedText.includes('connect-id=')) {
                            console.debug('Detected possible URL in QR code:', decodedText);
                            
                            // Create URL object to parse parameters
                            const url = new URL(decodedText);
                            const params = new URLSearchParams(url.search);
                            
                            // Check for connect-id parameter
                            if (params.get('connect-id')) {
                                connectId = params.get('connect-id');
                                console.debug('Extracted connection ID from URL:', connectId);
                            }
                        }
                    } catch (e) {
                        console.debug('Not a valid URL or parsing failed:', e);
                        console.debug('Using scanned text as direct connection ID');
                    }
                    
                    // Show the extracted connection ID in the UI
                    const manualInput = document.getElementById('manual-connection-input');
                    if (manualInput) {
                        manualInput.value = connectId;
                    }
                    
                    // Auto-connect with the scanned connection ID
                    this.multiplayerManager.joinGame(connectId);
                },
                (errorMessage) => {
                    // Handle scan errors silently
                }
            ).catch(err => {
                this.updateConnectionStatus('Error starting camera: ' + err, 'join-connection-status');
                
                // Go back to initial options if camera fails
                document.getElementById('join-initial-options').style.display = 'flex';
                document.getElementById('scan-qr-view').style.display = 'none';
            });
            
            this.updateConnectionStatus('Camera active. Point at a QR code to connect.', 'join-connection-status');
        } catch (error) {
            console.error('Error starting QR scanner:', error);
            this.updateConnectionStatus('Failed to start camera. Please enter code manually.', 'join-connection-status');
            
            // Go back to initial options if camera fails
            document.getElementById('join-initial-options').style.display = 'flex';
            document.getElementById('scan-qr-view').style.display = 'none';
        }
    }
    
    /**
     * Cycle to the next camera for QR scanning (e.g. switch from front to back).
     */
    async cycleQRCamera() {
        if (!this.availableCameras || this.availableCameras.length < 2) return;
        const currentIndex = this.selectedCameraId
            ? this.availableCameras.findIndex(c => c.id === this.selectedCameraId)
            : -1;
        const nextIndex = (currentIndex + 1) % this.availableCameras.length;
        this.selectedCameraId = this.availableCameras[nextIndex].id;
        const cameraSelect = document.getElementById('camera-select');
        if (cameraSelect) {
            cameraSelect.value = this.selectedCameraId;
        }
        if (this.qrCodeScanner) {
            await this.stopQRScanner();
            await this.startQRScanner();
        }
    }

    /**
     * Stop the QR scanner. Returns a Promise that resolves when the camera is fully stopped.
     */
    async stopQRScanner() {
        if (this.qrCodeScanner) {
            const scanner = this.qrCodeScanner;
            this.qrCodeScanner = null;
            try {
                await scanner.stop();
            } catch (err) {
                console.error('Error stopping camera:', err);
            }
            
            // Keep camera select visible if we have multiple cameras
            const cameraSelect = document.getElementById('camera-select');
            if (cameraSelect && this.availableCameras && this.availableCameras.length > 1) {
                cameraSelect.style.display = 'block';
            }
            
            // Hide loading overlay if it exists
            const loadingOverlay = document.getElementById('qr-scanner-loading');
            if (loadingOverlay) {
                loadingOverlay.style.display = 'none';
            }
            
            // Hide enter code overlay if it exists
            const enterCodeOverlay = document.getElementById('enter-code-overlay');
            if (enterCodeOverlay) {
                enterCodeOverlay.style.display = 'none';
            }
        }
    }

    /**
     * Update connection status
     * @param {string} message - The status message
     * @param {string} [elementId='host-connection-status'] - The ID of the status element to update
     */
    updateConnectionStatus(message, elementId = 'host-connection-status') {
        const statusElement = document.getElementById(elementId);
        if (statusElement) {
            statusElement.textContent = message;
        }
    }

    /**
     * Generate QR code for connection
     * @param {string} data - The data to encode in the QR code
     */
    /**
     * Build a connection URL with the given connection ID
     * @param {string} connectionId - The connection ID to include in the URL
     * @returns {string} The full URL for joining the game
     */
    buildConnectionURL(connectionId) {
        return `${window.location.href.split('?')[0]}?join=true&connect-id=${connectionId}`;
    }
    
    async generateQRCode(data) {
        const qrContainer = document.getElementById('connection-info-qr');
        if (!qrContainer) return;
        
        try {
            // Load QRCode.js library if not already loaded
            if (typeof QRCode === 'undefined') {
                await this.loadQRCodeJS();
            }
            
            // Clear previous QR code
            qrContainer.innerHTML = '';
            
            // Create a complete URL with the connection ID using the helper function
            const fullUrl = this.buildConnectionURL(data);
            
            // Generate new QR code with the full URL.
            // Use explicit size smaller than container content area (256 - 2*border, or 200 - 2*border on small screens)
            // so the full QR fits inside the square and remains scannable.
            const qrSize = 220;
            new QRCode(qrContainer, {
                text: fullUrl,
                width: qrSize,
                height: qrSize,
                colorDark: '#000000',
                colorLight: '#ffffff',
                correctLevel: QRCode.CorrectLevel.H
            });
            
            // Store the full URL for copying
            qrContainer.dataset.fullUrl = fullUrl;
        } catch (error) {
            console.error('Error generating QR code:', error);
            qrContainer.textContent = `Connection code: ${data}`;
        }
    }

    /**
     * Copy connection code to clipboard
     */
    copyConnectionCode() {
        // Get the room ID from the connection manager
        const roomId = this.multiplayerManager.connection && this.multiplayerManager.connection.roomId;
        if (!roomId) {
            console.error('No room ID available to copy');
            this.updateConnectionStatus('No connection code available', 'host-connection-status');
            return;
        }
        
        // Find the active code element (either in host UI or connection info screen)
        const hostCodeElement = document.getElementById('connection-code');
        const infoCodeElement = document.getElementById('connection-info-code');
        
        // Make sure both elements have the roomId text if they exist
        if (hostCodeElement && hostCodeElement.textContent !== roomId) {
            hostCodeElement.textContent = roomId;
        }
        
        if (infoCodeElement && infoCodeElement.textContent !== roomId) {
            infoCodeElement.textContent = roomId;
        }
        
        // Copy only the connection ID (roomId) to clipboard
        try {
            // Use the Clipboard API with proper error handling
            navigator.clipboard.writeText(roomId)
                .then(() => {
                    // Show success message
                    this.updateConnectionStatus('Connection ID copied to clipboard!', 'host-connection-status');
                    
                    // Also update the connection info status if visible
                    const connectionInfoStatus = document.getElementById('connection-info-status');
                    if (connectionInfoStatus && 
                        document.getElementById('connection-info-screen').style.display === 'flex') {
                        connectionInfoStatus.textContent = 'Connection ID copied to clipboard!';
                    }
                    
                    // Highlight the code elements briefly
                    if (hostCodeElement) {
                        hostCodeElement.classList.add('copied');
                        setTimeout(() => {
                            hostCodeElement.classList.remove('copied');
                        }, 1000);
                    }
                    
                    if (infoCodeElement) {
                        infoCodeElement.classList.add('copied');
                        setTimeout(() => {
                            infoCodeElement.classList.remove('copied');
                        }, 1000);
                    }
                })
                .catch(err => {
                    console.error('Clipboard write failed:', err);
                    this.updateConnectionStatus('Failed to copy connection ID. Please copy it manually.', 'host-connection-status');
                });
        } catch (error) {
            console.error('Failed to copy connection ID:', error);
            this.updateConnectionStatus('Failed to copy connection ID. Please copy it manually.', 'host-connection-status');
        }
    }
    
    /**
     * Set player color in the waiting screen
     * @param {string} color - The color assigned to the player
     */
    setPlayerColor(color) {
        const colorIndicator = document.getElementById('player-color-indicator');
        if (colorIndicator) {
            colorIndicator.style.backgroundColor = color;
        }
    }

    /**
     * Add player to connected players list (host only)
     * @param {string} playerId - The ID of the player to add
     * @param {string} playerColor - The color assigned to the player
     */
    addPlayerToList(playerId, playerColor) {
        const playersList = document.getElementById('connected-players-list');
        if (!playersList) return;
        
        // Create player item
        const playerItem = document.createElement('div');
        playerItem.className = 'player-item';
        playerItem.id = `player-${playerId}`;
        
        // Create player color indicator
        const colorIndicator = document.createElement('div');
        colorIndicator.className = 'player-color-indicator';
        colorIndicator.style.backgroundColor = playerColor;
        
        // Create player name span
        const playerName = document.createElement('span');
        playerName.textContent = `Player ${playerId.substring(0, 8)}`;
        
        // Create kick button (for host only)
        const kickButton = document.createElement('button');
        kickButton.className = 'kick-player-btn';
        kickButton.textContent = '✕';
        kickButton.title = 'Remove player';
        kickButton.setAttribute('data-player-id', playerId);
        kickButton.addEventListener('click', (event) => {
            event.stopPropagation();
            const peerId = event.target.getAttribute('data-player-id');
            if (peerId && this.multiplayerManager.connection) {
                this.multiplayerManager.connection.kickPlayer(peerId);
            }
        });
        
        // Append elements
        playerItem.appendChild(colorIndicator);
        playerItem.appendChild(playerName);
        playerItem.appendChild(kickButton);
        playersList.appendChild(playerItem);
    }

    /**
     * Remove player from connected players list (host only)
     * @param {string} playerId - The ID of the player to remove
     */
    removePlayerFromList(playerId) {
        const playerItem = document.getElementById(`player-${playerId}`);
        if (playerItem) {
            playerItem.remove();
        }
    }

    /**
     * Update host entry in the player list
     * @param {string} hostId - The ID of the host
     * @param {string} hostColor - The color assigned to the host
     */
    updateHostEntry(hostId, hostColor) {
        const hostEntry = document.querySelector('.connected-players-list .host-player .player-color-indicator');
        if (hostEntry) {
            hostEntry.style.backgroundColor = hostColor;
        }
    }

    /**
     * Enable or disable the start game button
     * @param {boolean} enabled - Whether the button should be enabled
     */
    setStartButtonEnabled(enabled) {
        const startGameBtn = document.getElementById('start-game-btn');
        if (startGameBtn) {
            startGameBtn.disabled = !enabled;
        }
    }

    /**
     * Display the connection code
     * @param {string} code - The connection code to display
     */
    displayConnectionCode(code) {
        // Update code in host UI
        const codeElement = document.getElementById('connection-code');
        if (codeElement) {
            codeElement.textContent = code;
            
            // Make sure the copy button is visible and working
            const copyBtn = document.getElementById('copy-code-btn');
            if (copyBtn) {
                copyBtn.style.display = 'inline-block';
                copyBtn.onclick = () => this.copyConnectionCode();
            }
            
            // Also make the connection code element clickable
            codeElement.style.cursor = 'pointer';
            codeElement.onclick = () => this.copyConnectionCode();
        }
        
        // Also update code in connection info screen
        const connectionInfoCode = document.getElementById('connection-info-code');
        if (connectionInfoCode) {
            connectionInfoCode.textContent = code;
            connectionInfoCode.style.cursor = 'pointer';
            connectionInfoCode.onclick = () => this.copyConnectionCode();
            
            // Make sure the copy button is visible and working
            const copyBtn = document.getElementById('connection-copy-code-btn');
            if (copyBtn) {
                copyBtn.style.display = 'inline-block';
                copyBtn.onclick = () => this.copyConnectionCode();
            }
        }
    }

    /**
     * Load QRCode.js library
     * @returns {Promise} A promise that resolves when QRCode.js is loaded
     */
    loadQRCodeJS() {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/qrcodejs@1.0.0/qrcode.min.js';
            script.onload = () => resolve();
            script.onerror = () => reject(new Error('Failed to load QRCode.js'));
            document.head.appendChild(script);
        });
    }

    /**
     * Load HTML5-QRCode library
     * @returns {Promise} A promise that resolves when HTML5-QRCode is loaded
     */
    loadQRScannerJS() {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/html5-qrcode@2.3.8/html5-qrcode.min.js';
            script.onload = () => resolve();
            script.onerror = () => reject(new Error('Failed to load HTML5-QRCode'));
            document.head.appendChild(script);
        });
    }
    
    /**
     * Update the multiplayer button text based on connection status
     * @param {boolean} isConnected - Whether we're connected to a multiplayer game
     */
    updateMultiplayerButton(isConnected) {
        const multiplayerButton = document.getElementById('multiplayer-button');
        if (multiplayerButton) {
            if (isConnected) {
                multiplayerButton.textContent = 'Disconnect';
                multiplayerButton.classList.add('connected');
            } else {
                multiplayerButton.textContent = 'Multiplayer';
                multiplayerButton.classList.remove('connected');
            }
        }
    }
}