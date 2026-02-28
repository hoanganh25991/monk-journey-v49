import * as THREE from '../../libs/three/three.module.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { WorldManager } from '../world/WorldManager.js';
import { Player } from '../player/Player.js';
import { InputHandler } from '../InputHandler.js';
import { HUDManager } from '../hud-manager/HUDManager.js';
import { EnemyManager } from '../enemies/EnemyManager.js';
import { CollisionManager } from '../CollisionManager.js';
import { QuestManager } from '../QuestManager.js';
import { AudioManager } from '../AudioManager.js';
import { SaveManager } from '../save-manager/SaveManager.js';
// DifficultyManager removed - using DIFFICULTY_SCALING directly
import { PerformanceManager } from '../PerformanceManager.js';
import { EffectsManager } from '../EffectsManager.js';
import { GameState } from './GameState.js';
import { GameEvents } from './GameEvents.js';
import { SceneOptimizer } from './SceneOptimizer.js';
import { LoadingManager } from './LoadingManager.js';
import { RENDER_CONFIG } from '../config/render.js';
import { MenuManager } from '../menu-system/MenuManager.js';
import { InteractionSystem } from '../interaction/InteractionSystem.js';
import { MultiplayerManager } from '../multiplayer/MultiplayerManager.js';
import { ItemGenerator } from '../items/ItemGenerator.js';
import { ItemDropManager } from '../items/ItemDropManager.js';
import { STORAGE_KEYS } from '../config/storage-keys.js';
import storageService from '../save-manager/StorageService.js';
import deviceCapabilities from '../utils/DeviceCapabilities.js';
import shadowDebugger from '../debug/ShadowDebugger.js';

/**
 * Main Game class that serves as a facade to the underlying game systems
 * 
 * @class
 * @property {HTMLElement} canvas - The main game canvas element
 * @property {THREE.Clock} clock - Clock used for tracking time and calculating delta time between frames
 * @property {boolean} disableFullScreen - Flag to disable fullscreen functionality
 * @property {boolean} animationLoopStarted - Flag to prevent multiple animation loops from starting
 * @property {GameState} state - Manages the game state (running, paused, etc.)
 * @property {GameEvents} events - Event system for game-wide event handling
 * @property {THREE.LoadingManager} loadingManager - Manages asset loading and tracks loading progress
 * @property {THREE.WebGLRenderer} renderer - WebGL renderer for the game
 * @property {THREE.Scene} scene - The main 3D scene containing all game objects
 * @property {THREE.PerspectiveCamera} camera - The main camera used for rendering the scene
 * @property {OrbitControls} controls - Camera controls for development/debugging purposes
 * @property {PerformanceManager} performanceManager - Manages performance optimizations and settings
 * @property {WorldManager} world - Manages the game world, terrain, and environment
 * @property {Player} player - The player character with model, animations, and controls
 * @property {InputHandler} inputHandler - Handles user input (keyboard, mouse, touch)
 * @property {EffectsManager} effectsManager - Manages visual effects, particles, and skill effects
 * @property {HUDManager} hudManager - Manages the heads-up display and UI elements
 * @property {EnemyManager} enemyManager - Manages enemy spawning, AI, and behavior
 * @property {CollisionManager} collisionManager - Handles collision detection between game objects
 * @property {InteractionSystem} interactionSystem - Manages interactions between the player and the world
 * @property {QuestManager} questManager - Manages game quests and objectives
 * @property {AudioManager} audioManager - Manages sound effects and music
 * @property {SaveManager} saveManager - Handles saving and loading game state
 * @property {string} difficulty - Current game difficulty setting
 * @property {MenuManager} menuManager - Manages game menus and UI screens
 * @property {number} _lastMemoryLog - Timestamp of the last memory usage log
 */
export class Game {
    constructor() {
        this.canvas = document.getElementById('game-canvas');
        this.gameContainer = document.getElementById('game-container');
        this.clock = new THREE.Clock();
        this.disableFullScreen = false; // Set to true to disable fullscreen functionality
        
        // Flag to prevent multiple animation loops
        this.animationLoopStarted = false;
        
        // Initialize sub-systems
        this.state = new GameState();
        this.events = new GameEvents();
        this.loadingManager = new LoadingManager().getManager();
        this.itemGenerator = new ItemGenerator(this);
        
        /** Set to true when Space or jump button is pressed; processed in game loop */
        this.jumpRequested = false;
        
        // Default difficulty (will be updated in init)
        this.difficulty = 'medium';
        
        // WebGL state tracking
        this.webglContextLost = false;
        this.lastMaterialValidation = 0;
        this.materialValidationInterval = 2000; // Validate materials every 2 seconds (more frequent)
        this.lastItemDropTime = 0;
        this.itemDropValidationWindow = 5000; // 5 seconds after item drop for more frequent validation
    }
    
    /**
     * Load initial settings from storage service
     * @returns {Promise<void>}
     */
    async loadInitialSettings() {
        try {
            // Load difficulty from storage service
            const difficulty = await storageService.loadData(STORAGE_KEYS.DIFFICULTY);
            this.difficulty = difficulty || 'medium';
            console.debug(`Game initialized with difficulty: ${this.difficulty}`);
            
            // Load performance profile (support 4 levels: high, medium, low, minimal)
            const materialQuality = await storageService.loadData(STORAGE_KEYS.QUALITY_LEVEL);
            const validQualityLevels = ['high', 'medium', 'low', 'minimal'];
            this.materialQuality = validQualityLevels.includes(materialQuality) ? materialQuality : 'high';
            console.debug(`Game initialized with material quality: ${this.materialQuality}`);
        } catch (error) {
            console.error('Error loading initial settings:', error);
        }
    }
    
    /**
     * Initialize storage service with timeout to prevent hanging on mobile devices
     * @returns {Promise<void>}
     */
    async initStorageServiceWithTimeout() {
        const STORAGE_INIT_TIMEOUT = 10000; // 10 seconds timeout
        
        return new Promise(async (resolve, reject) => {
            // Set up timeout
            const timeoutId = setTimeout(() => {
                console.warn('Storage service initialization timed out after 10 seconds');
                reject(new Error('Storage service initialization timeout'));
            }, STORAGE_INIT_TIMEOUT);
            
            try {
                // Try to initialize storage service
                await storageService.init();
                clearTimeout(timeoutId);
                console.debug('Storage service initialized successfully');
                resolve();
            } catch (error) {
                clearTimeout(timeoutId);
                console.error('Storage service initialization failed:', error);
                reject(error);
            }
        });
    }
    
    /**
     * Add an event listener
     * @param {string} event - The event name
     * @param {Function} callback - The callback function
     */
    addEventListener(event, callback) {
        this.events.addEventListener(event, callback);
    }
    
    /**
     * Remove an event listener
     * @param {string} event - The event name
     * @param {Function} callback - The callback function to remove
     */
    removeEventListener(event, callback) {
        this.events.removeEventListener(event, callback);
    }
    
    /**
     * Check if the game is currently paused
     * @returns {boolean} True if the game is paused
     */
    get isPaused() {
        return this.state.isPaused();
    }
    
    /**
     * Check if the game is currently running
     * @returns {boolean} True if the game is running
     */
    get isRunning() {
        return this.state.isRunning();
    }
    
    /**
     * Check if the game has been started at least once
     * @returns {boolean} True if the game has been started
     */
    get hasStarted() {
        return this.state.hasStarted();
    }
    
    /**
     * Initialize the game
     * @returns {Promise<boolean>} True if initialization was successful
     */
    async init() {
        try {
            // Update loading progress (log only; loading screen UI removed)
            this.updateLoadingProgress(5, 'Initializing storage...', 'Setting up cloud sync');
            
            // Initialize storage service with timeout to prevent hanging on mobile
            try {
                await this.initStorageServiceWithTimeout();
                this.updateLoadingProgress(8, 'Storage initialized', 'Cloud sync ready');
            } catch (error) {
                console.warn('Storage service initialization failed or timed out, continuing with local storage only:', error);
                this.updateLoadingProgress(8, 'Using local storage', 'Cloud sync unavailable - you can enable it later in settings');
                // Continue with game initialization even if cloud sync fails
            }
            
            // Update loading progress
            this.updateLoadingProgress(10, 'Loading settings...', 'Retrieving game configuration');
            await this.loadInitialSettings();

            
            // Initialize renderer with device capability detection
            const profileQuality = this.materialQuality || 'medium';
            this.renderer = this.createRenderer(profileQuality);
            
            // Detect device capabilities after renderer creation
            this.deviceCapabilities = deviceCapabilities.detect(this.renderer);
            deviceCapabilities.logCapabilities();
            // Re-apply renderer settings so powerful mobile gets higher pixel ratio (sharp player/scene)
            this.applyRendererSettings(this.renderer, profileQuality);
            
            // Show helpful message about shadow settings
            this.logShadowInfo(profileQuality);
            
            // Set up shadow debugger (toggle with Ctrl+Shift+S)
            this.setupShadowDebugger();
            
            this.updateLoadingProgress(10, 'Creating game world...', 'Setting up scene');
            
            // Initialize scene
            this.scene = new THREE.Scene();
            this.scene.background = new THREE.Color(0x6B7B8C); // Darker blue-gray for atmospheric mood
            // Fog will be managed by FogManager
            
            // World origin rebasing: keep rendering near (0,0,0) to avoid float precision blur on mobile when far from origin.
            // All world content (terrain, env, enemies, etc.) goes in worldGroup; we set worldGroup.position = -playerPosition each frame.
            // Player model stays at (0,0,0) in scene; camera orbits (0,0,0). Game logic still uses logical world positions.
            this.worldGroup = new THREE.Group();
            this.worldGroup.name = 'WorldGroup';
            this.scene.add(this.worldGroup);
            
            /**
             * Root for world-positioned objects (terrain, env, enemies, items). Used for origin rebasing:
             * worldGroup.position = -playerPosition so the player stays at (0,0,0) for clean rendering on all devices.
             * @returns {THREE.Group}
             */
            this.getWorldGroup = () => this.worldGroup;
            
            // Initialize item drop manager
            this.itemDropManager = new ItemDropManager(this.scene, this);
            
            // Initialize camera (far plane large enough for origin-shifted world: worldGroup.position = -player,
            // so paths/terrain at scene position up to ~map radius away must still be within far plane)
            this.camera = new THREE.PerspectiveCamera(
                75,
                window.innerWidth / window.innerHeight,
                0.1,
                15000
            );
            this.camera.position.set(0, 10, 20);
            
            // Initialize orbit controls (for development)
            this.controls = new OrbitControls(this.camera, this.renderer.domElement);
            this.controls.enableDamping = true;
            this.controls.dampingFactor = 0.05;
            this.controls.maxPolarAngle = Math.PI / 2 - 0.1; // Prevent camera from going below ground
            
            this.updateLoadingProgress(15, 'Optimizing performance...', 'Initializing performance manager');
            
            // Initialize performance manager (before other systems)
            this.performanceManager = new PerformanceManager(this);
            await this.performanceManager.init();
            
            this.updateLoadingProgress(20, 'Building world...', 'Generating terrain and environment');
            
            // Initialize world with loading state (pass quality for performance profile)
            this.isWorldLoading = true;
            const worldQuality = this.materialQuality || profileQuality || 'high';
            this.world = new WorldManager(this.scene, this.loadingManager, this, worldQuality);
            
            // Show a more detailed loading message for terrain generation
            this.updateLoadingProgress(25, 'Generating terrain...', 'This may take a moment');
            
            // Initialize the world (includes terrain generation)
            await this.world.init();
            
            // Terrain is already pre-generated during world initialization
            this.updateLoadingProgress(30, 'Terrain generation complete', 'World chunks created');
            
            // TODO: Add functionality to save generated terrain to localStorage
            // for faster loading in the future once we're satisfied with generation
            
            this.isWorldLoading = false;
            
            this.updateLoadingProgress(40, 'Loading character...', 'Preparing player model and animations');
            
            // Initialize player
            this.player = new Player(this, this.scene, this.camera, this.loadingManager);
            await this.player.init();
            
            this.updateLoadingProgress(60, 'Setting up controls...', 'Initializing input handler');
            
            // Initialize input handler
            this.inputHandler = new InputHandler(this);
            
            this.updateLoadingProgress(65, 'Creating user interface...', 'Building HUD elements');
            
            // Initialize Effects Manager
            this.updateLoadingProgress(67, 'Loading effects...', 'Preloading skill effects and models');
            this.effectsManager = new EffectsManager(this);
            await this.effectsManager.init();
            
            // Initialize UI manager
            this.hudManager = new HUDManager(this);
            await this.hudManager.init();
            
            this.updateLoadingProgress(75, 'Spawning enemies...', 'Initializing enemy AI and models');
            
            // Initialize enemy manager
            this.enemyManager = new EnemyManager(this.scene, this.player, this.loadingManager, this, this.itemDropManager);
            await this.enemyManager.init();
            
            // Connect WorldManager with EnemyManager for enemy/boss spawning
            this.world.setEnemyManager(this.enemyManager);
            
            this.updateLoadingProgress(80, 'Setting up physics...', 'Initializing collision detection');
            
            // Initialize collision manager
            this.collisionManager = new CollisionManager(this.player, this.enemyManager, this.world);
            
            // Initialize interaction system
            this.updateLoadingProgress(83, 'Setting up interaction system...', 'Unifying interaction methods');
            this.interactionSystem = new InteractionSystem(this);
            
            this.updateLoadingProgress(85, 'Loading quests...', 'Initializing quest system');
            
            // Initialize quest manager
            this.questManager = new QuestManager(this);
            
            this.updateLoadingProgress(90, 'Loading audio...', 'Initializing sound effects and music');
            
            // Initialize audio manager
            this.audioManager = new AudioManager(this);
            await this.audioManager.init();
            
            this.updateLoadingProgress(95, 'Setting up save system...', 'Initializing game save functionality');
            
            // Initialize save manager
            this.saveManager = new SaveManager(this);
            await this.saveManager.init();
            
            this.updateLoadingProgress(98, 'Applying difficulty settings...', 'Finalizing game setup');
            
            // Initialize menu manager
            this.updateLoadingProgress(99, 'Initializing menu system...', 'Setting up game menus');
            this.menuManager = new MenuManager(this);
            
            // Initialize multiplayer manager
            this.updateLoadingProgress(99.5, 'Setting up multiplayer...', 'Initializing WebRTC connections');
            this.multiplayerManager = new MultiplayerManager(this);
            await this.multiplayerManager.init();

            // Set initial difficulty
            this.enemyManager.setDifficulty(this.difficulty);

            this.updateLoadingProgress(100, 'Game ready!', 'Initialization complete');
            
            // Apply performance optimizations to the scene (use quality for low-end tablet support)
            const initQuality = this.materialQuality || 'medium';
            SceneOptimizer.optimizeScene(this.scene, initQuality);
            if (this.world?.lightingManager?.applyQuality) {
                this.world.lightingManager.applyQuality(initQuality);
            }
            
            // Apply material quality setting once during initialization
            if (this.materialQuality) {
                console.debug(`Applying material quality from settings: ${this.materialQuality}`);
                this.applyInitialMaterialQuality(this.materialQuality);
            } else {
                // Fallback to high quality if no setting is found
                console.debug('No material quality setting found, using high as default');
                this.applyInitialMaterialQuality('high');
            }
            
            // Set up event listeners
            this.setupEventListeners();
            
            // Disable loading progress updates after init so no progress bar appears after user clicks Play
            if (this.loadingManager) {
                this.loadingManager.onProgress = () => {};
            }
            
            return true;
        } catch (error) {
            console.error('Error initializing game:', error);
            this.updateLoadingProgress(0, 'Error initializing game', error.message);
            return false;
        }
    }
    
    /**
     * Update loading progress in the loading screen
     * @param {number} percent - Progress percentage (0-100)
     * @param {string} status - Status message
     * @param {string} detail - Detailed information
     */
    updateLoadingProgress(percent, status, detail) {
        // Log progress only (loading screen UI removed)
        console.debug(`Loading progress: ${percent}% - ${status} - ${detail}`);
    }
    
    /**
     * Set up event listeners for window and document events
     */
    setupEventListeners() {
        // Persistent fullscreen change listener - resizes canvas when fullscreen is toggled (e.g. via HUD button)
        const fullscreenResizeHandler = () => {
            if (this.renderer && this.camera) {
                requestAnimationFrame(() => {
                    requestAnimationFrame(() => this.adjustRendererSize());
                });
            }
        };
        document.addEventListener('fullscreenchange', fullscreenResizeHandler);
        document.addEventListener('webkitfullscreenchange', fullscreenResizeHandler);
        document.addEventListener('mozfullscreenchange', fullscreenResizeHandler);
        document.addEventListener('MSFullscreenChange', fullscreenResizeHandler);

        if (window.location.hostname !== "localhost") {
            window.addEventListener('pagehide', () => this.pause(true));
            window.addEventListener('blur', () => this.pause(true));
        }
    }
    
    /**
     * Set up shadow debugger with keyboard shortcut
     */
    setupShadowDebugger() {
        document.addEventListener('keydown', (event) => {
            // Toggle shadow debugger with Ctrl+Shift+S
            if (event.ctrlKey && event.shiftKey && event.key === 'S') {
                event.preventDefault();
                shadowDebugger.toggle(this.renderer, this.materialQuality || 'medium');
            }
        });
    }
    
    /**
     * Log shadow configuration information
     * @param {string} qualityLevel - The quality level
     */
    logShadowInfo(qualityLevel) {
        if (!this.deviceCapabilities) return;
        
        const caps = this.deviceCapabilities;
        const shadowSize = caps.optimalShadowMapSize[qualityLevel];
        const shadowsEnabled = deviceCapabilities.shouldEnableShadows(qualityLevel);
        const shadowType = deviceCapabilities.getRecommendedShadowMapType(qualityLevel);
        
        console.group('🌟 Shadow Configuration');
        console.log(`Device: ${caps.isMobile ? '📱 Mobile' : caps.isTablet ? '📱 Tablet' : '🖥️ Desktop'}`);
        console.log(`GPU Tier: ${caps.gpuTier.toUpperCase()}`);
        console.log(`Max Texture Size: ${caps.maxTextureSize}px`);
        console.log(`Quality Level: ${qualityLevel.toUpperCase()}`);
        console.log(`Shadows: ${shadowsEnabled ? '✅ ENABLED' : '❌ DISABLED'}`);
        if (shadowsEnabled) {
            console.log(`Shadow Map Size: ${shadowSize}x${shadowSize}px`);
            console.log(`Shadow Type: ${shadowType}`);
        }
        console.log(`💡 Press Ctrl+Shift+S to toggle shadow debugger`);
        console.groupEnd();
    }

    /**
     * Request fullscreen mode for the game canvas
     * @returns {Promise} A promise that resolves when fullscreen is entered or rejects if there's an error
     */
    async requestFullscreen() {
        if (await storageService.loadData(STORAGE_KEYS.DISABLE_FULL_SCREEN)) {
            console.warn('Fullscreen request is ignored when fullscreen is disabled.');
            return Promise.resolve();
        }
        if (window.location.hostname === 'localhost') {
            console.debug('Fullscreen skipped on localhost (development)');
            return Promise.resolve();
        }
        console.debug("Requesting fullscreen mode...");
        
        // Set a flag to prevent pause on visibility change
        window.isFullscreenChange = true;
        
        // Fullscreen document (HUD is outside game-container; fullscreening game-container would hide HUD)
        const element = document.documentElement;
        
        // Create a promise to handle fullscreen request
        const fullscreenPromise = new Promise((resolve, reject) => {
            try {
                // Add event listener for fullscreen change
                const fullscreenChangeHandler = () => {
                    // Remove the event listener after it's triggered
                    document.removeEventListener('fullscreenchange', fullscreenChangeHandler);
                    document.removeEventListener('webkitfullscreenchange', fullscreenChangeHandler);
                    document.removeEventListener('mozfullscreenchange', fullscreenChangeHandler);
                    document.removeEventListener('MSFullscreenChange', fullscreenChangeHandler);
                    
                    // Reset the flag after a short delay
                    setTimeout(() => {
                        window.isFullscreenChange = false;
                    }, 100);
                    
                    if (this.isFullscreen()) {
                        // Defer resize until after browser has applied fullscreen layout (fixes white space at bottom)
                        const doResize = () => {
                            this.adjustRendererSize();
                            // Delayed second resize - canvas pre-init may have wrong size; fullscreen layout applies async
                            setTimeout(() => this.adjustRendererSize(), 100);
                        };
                        requestAnimationFrame(() => {
                            requestAnimationFrame(doResize);
                        });
                        resolve();
                    } else {
                        reject(new Error("Failed to enter fullscreen mode"));
                    }
                };
                
                // Add event listeners for fullscreen change
                document.addEventListener('fullscreenchange', fullscreenChangeHandler);
                document.addEventListener('webkitfullscreenchange', fullscreenChangeHandler);
                document.addEventListener('mozfullscreenchange', fullscreenChangeHandler);
                document.addEventListener('MSFullscreenChange', fullscreenChangeHandler);
                
                // Request fullscreen
                if (element.requestFullscreen) {
                    element.requestFullscreen();
                } else if (element.webkitRequestFullscreen) {
                    element.webkitRequestFullscreen();
                } else if (element.mozRequestFullScreen) {
                    element.mozRequestFullScreen();
                } else if (element.msRequestFullscreen) {
                    element.msRequestFullscreen();
                } else {
                    console.warn("Fullscreen API not supported in this browser");
                    window.isFullscreenChange = false;
                    resolve(); // Resolve anyway if not supported
                }
            } catch (error) {
                console.error("Error requesting fullscreen:", error);
                window.isFullscreenChange = false;
                reject(error);
            }
        });
        
        return fullscreenPromise;
    }
    
    /**
     * Adjust renderer size to match current window dimensions
     * Uses canvas container (game-container) dimensions when in fullscreen - matches actual canvas display area, fixes whitespace from pre-init
     */
    adjustRendererSize() {
        if (this.renderer && this.camera) {
            const fsEl = document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || document.msFullscreenElement;
            // In fullscreen: use game-container (canvas parent) - reflects actual canvas display size after layout
            const container = this.gameContainer || this.canvas?.parentElement;
            const w = fsEl && container ? (container.offsetWidth || container.clientWidth) : (fsEl ? (fsEl.offsetWidth || fsEl.clientWidth) : window.innerWidth);
            const h = fsEl && container ? (container.offsetHeight || container.clientHeight) : (fsEl ? (fsEl.offsetHeight || fsEl.clientHeight) : window.innerHeight);
            const width = w > 0 ? w : window.innerWidth;
            const height = h > 0 ? h : window.innerHeight;
            
            console.debug(`Adjusting renderer size to ${width}x${height}${fsEl ? ' (fullscreen)' : ''}`);
            
            // Update camera aspect ratio
            this.camera.aspect = width / height;
            this.camera.updateProjectionMatrix();
            
            // Update renderer size
            this.renderer.setSize(width, height, true);
            
            // Use same pixel ratio as current quality profile (so "high" on mobile stays sharp)
            const qualityLevel = this.materialQuality || 'high';
            const settings = RENDER_CONFIG[qualityLevel]?.settings;
            const dpr = window.devicePixelRatio || 1;
            let pixelRatio = settings?.pixelRatio ?? dpr;
            if (qualityLevel === 'high') {
                pixelRatio = Math.max(2, dpr); // Minimum 2, no upper cap
            } else if (qualityLevel === 'medium') {
                pixelRatio = Math.min(dpr, 0.85);
            } else if (this.deviceCapabilities && (this.deviceCapabilities.isMobile || this.deviceCapabilities.isTablet) &&
                (this.deviceCapabilities.gpuTier === 'high' || this.deviceCapabilities.gpuTier === 'medium')) {
                if (qualityLevel === 'low') pixelRatio = Math.min(dpr, 1.25);
                else if (qualityLevel === 'minimal') pixelRatio = Math.min(dpr, 0.75);
            }
            this.renderer.setPixelRatio(pixelRatio);
        }
    }
    
    /**
     * Exit fullscreen mode
     * @returns {Promise} A promise that resolves when fullscreen is exited or rejects if there's an error
     */
    exitFullscreen() {
        console.debug("Exiting fullscreen mode...");
        
        // Set a flag to prevent pause on visibility change
        window.isFullscreenChange = true;
        
        // Create a promise to handle fullscreen exit
        const exitFullscreenPromise = new Promise((resolve, reject) => {
            try {
                // Add event listener for fullscreen change
                const fullscreenChangeHandler = () => {
                    // Remove the event listener after it's triggered
                    document.removeEventListener('fullscreenchange', fullscreenChangeHandler);
                    document.removeEventListener('webkitfullscreenchange', fullscreenChangeHandler);
                    document.removeEventListener('mozfullscreenchange', fullscreenChangeHandler);
                    document.removeEventListener('MSFullscreenChange', fullscreenChangeHandler);
                    
                    // Reset the flag after a short delay
                    setTimeout(() => {
                        window.isFullscreenChange = false;
                    }, 100);
                    
                    // Adjust renderer size to match new dimensions
                    this.adjustRendererSize();
                    resolve();
                };
                
                // Add event listeners for fullscreen change
                document.addEventListener('fullscreenchange', fullscreenChangeHandler);
                document.addEventListener('webkitfullscreenchange', fullscreenChangeHandler);
                document.addEventListener('mozfullscreenchange', fullscreenChangeHandler);
                document.addEventListener('MSFullscreenChange', fullscreenChangeHandler);
                
                // Exit fullscreen
                if (document.exitFullscreen) {
                    document.exitFullscreen();
                } else if (document.webkitExitFullscreen) {
                    document.webkitExitFullscreen();
                } else if (document.mozCancelFullScreen) {
                    document.mozCancelFullScreen();
                } else if (document.msExitFullscreen) {
                    document.msExitFullscreen();
                } else {
                    console.warn("Fullscreen API not supported in this browser");
                    window.isFullscreenChange = false;
                    resolve(); // Resolve anyway if not supported
                }
            } catch (error) {
                console.error("Error exiting fullscreen:", error);
                window.isFullscreenChange = false;
                reject(error);
            }
        });
        
        return exitFullscreenPromise;
    }
    
    /**
     * Check if the game is currently in fullscreen mode
     * @returns {boolean} True if the game is in fullscreen mode
     */
    isFullscreen() {
        return !!(
            document.fullscreenElement ||
            document.webkitFullscreenElement ||
            document.mozFullScreenElement ||
            document.msFullscreenElement
        );
    }
    
    /**
     * Toggle fullscreen mode
     * @returns {Promise} A promise that resolves when the fullscreen state has been toggled
     */
    toggleFullscreen() {
        if (this.isFullscreen()) {
            return this.exitFullscreen();
        } else {
            return this.requestFullscreen();
        }
    }
    
    /**
     * Start the game
     * Loads selected map from localStorage first, then starts the loop (avoids in-game map swap lag).
     * @param {boolean} isLoadedGame - Whether this is a loaded game or a new game
     * @param {boolean} requestFullscreenMode - Whether to request fullscreen mode (default: true)
     */
    start(isLoadedGame = false, requestFullscreenMode = true) {
        console.debug("Game starting...");

        const path = typeof localStorage !== 'undefined'
            ? (localStorage.getItem(STORAGE_KEYS.SELECTED_MAP_PATH) || 'maps/default.json')
            : 'maps/default.json';

        // Show game container so canvas can render and warmup can complete (was display:none in CSS)
        if (this.gameContainer) {
            this.gameContainer.classList.add('game-visible');
            this.gameContainer.style.display = 'block';
        }

        // Use full-screen cream fog (play-reveal-overlay) instead of mapLoadingOverlay for consistent reveal
        const playRevealEl = document.getElementById('play-reveal-overlay');
        const playRevealTextEl = document.getElementById('play-reveal-text');
        const mapOverlayEl = document.getElementById('mapLoadingOverlay');
        if (playRevealEl) {
            playRevealEl.style.display = 'flex';
            playRevealEl.classList.remove('reveal-circle', 'fog-waiting');
            if (playRevealTextEl) playRevealTextEl.textContent = 'Loading map...';
        }
        if (mapOverlayEl) mapOverlayEl.style.display = 'none';

        this.canvas.style.display = 'block';
        this.camera.position.set(0, 10, 20);
        this.camera.lookAt(0, 0, 0);

        // Hide game container visually until warmup completes (avoids showing janky first frames)
        if (this.gameContainer) {
            this.gameContainer.style.opacity = '0';
            this.gameContainer.style.pointerEvents = 'none';
        }
        this._warmupFramesLeft = 8; // show game after 8 frames so first-frame spikes are off-screen
        this._playRevealStartTime = Date.now(); // after 3s if not stable, blur (fog-waiting) until stable
        this._revealStableFramesLeft = null; // when warmup done, count stable frames before starting 3s reveal

        const runAfterMapLoaded = (mapData) => {
            // Keep fog (play-reveal-overlay) visible with "Preparing..." until warmup ends (animate() will run circle fade).
            // Game stays PAUSED so enemies/player don't run until overlay is removed (fixes low-end devices).
            if (playRevealTextEl) playRevealTextEl.textContent = 'Preparing your adventure...';
            if (!isLoadedGame && this.player && mapData?.spawn) {
                const s = mapData.spawn;
                this.player.setPosition(s.x ?? 0, s.y ?? 1, s.z ?? -13);
            } else if (!isLoadedGame) {
                this.player.setPosition(0, 1, -13);
            }
            // Always clear pre-spawned enemies from init() so we don't have static enemies on first play or load
            if (this.enemyManager) {
                this.enemyManager.removeAllEnemies();
            }
            // Do not setRunning() or start clock here; animate() will unpause when overlay is hidden
            this.animate();
            if (requestFullscreenMode) {
                this.requestFullscreen().then(() => this.adjustRendererSize()).catch(() => this.adjustRendererSize());
            } else {
                this.adjustRendererSize();
            }
            console.debug("Game started (paused until overlay hides)");
        };

        const handleMapLoadError = (err) => {
            console.error('Failed to load map:', err);
            if (playRevealTextEl) playRevealTextEl.textContent = 'Selected map unavailable. Loading Default World...';
            if (this.hudManager?.showNotification) {
                this.hudManager.showNotification('Could not load selected map. Using Default World for this session.', 4000);
            }
            // Load default map so the game can run; do NOT overwrite localStorage so user's choice is kept for next time
            this.loadAndApplyMap('maps/default.json')
                .then((mapData) => {
                    runAfterMapLoaded(mapData);
                })
                .catch((fallbackErr) => {
                    console.error('Failed to load default map:', fallbackErr);
                    try {
                        localStorage.setItem(STORAGE_KEYS.SELECTED_MAP_PATH, 'maps/default.json');
                    } catch (e) {}
                    if (playRevealTextEl) playRevealTextEl.textContent = 'Map unavailable. Reloading...';
                    setTimeout(() => location.reload(), 2000);
                });
        };

        this.loadAndApplyMap(path).then(runAfterMapLoaded).catch(handleMapLoadError);
    }
    
    /**
     * Load map JSON and apply to world - buffers in memory, no localStorage.
     * Uses base-relative URL so the selected map loads correctly when the app is served from a subpath.
     * @param {string} path - Path to map JSON (e.g. 'maps/default.json')
     * @returns {Promise<Object>} Resolved with map data
     */
    async loadAndApplyMap(path) {
        const url = path.startsWith('http') ? path : new URL(path, window.location.href).href;
        const res = await fetch(url);
        if (!res.ok) throw new Error(`Failed to load map: ${path}`);
        const mapData = await res.json();
        if (this.world) this.world.applyMap(mapData);
        return mapData;
    }

    /**
     * Wait for world/terrain to be ready after a map load (e.g. spawn chunk generated).
     * Call after setting player position so terrain updates; then waits for initial gen to settle.
     * @returns {Promise<void>}
     */
    waitForMapReady() {
        return new Promise((resolve) => {
            let frames = 0;
            const onFrame = () => {
                frames++;
                if (frames < 3) {
                    requestAnimationFrame(onFrame);
                    return;
                }
                const tm = this.world?.terrainManager;
                if (!tm || typeof tm.waitForInitialGeneration !== 'function') {
                    resolve();
                    return;
                }
                tm.waitForInitialGeneration().then(resolve).catch(() => resolve());
            };
            requestAnimationFrame(onFrame);
        });
    }

    /**
     * Pause the game
     * Properly pauses all game systems including physics, animations, and timers
     */
    pause(emitEvent = true) {
        console.debug("Pausing game...");
        
        // Set game state to paused
        this.state.setPaused();
        
        // Pause the clock to stop delta time accumulation
        this.clock.stop();
        
        // Pause audio
        if (this.audioManager) {
            this.audioManager.pause();
        }
        
        // Pause player animations
        if (this.player && this.player.model && this.player.model.mixer) {
            this.player.model.mixer.timeScale = 0;
        }
        
        // Pause all enemy animations
        if (this.enemyManager) {
            this.enemyManager.pause();
        }
        
        // Pause particle effects
        if (this.effectsManager) {
            this.effectsManager.pause();
        }
        
        // Dispatch event that game has been paused
        emitEvent && this.events.dispatch('gameStateChanged', 'paused');
        
        console.debug("Game paused successfully");
    }
    
    /**
     * Resume the game
     * Properly resumes all game systems that were paused
     */
    resume(emitEvent = true) {
        console.debug("Resuming game...");
        
        // Set game state to running
        this.state.setRunning();
        
        // Resume the clock to continue delta time calculation
        this.clock.start();
        
        // Resume audio
        if (this.audioManager) {
            this.audioManager.resume();
        }
        
        // Resume player animations
        if (this.player && this.player.model && this.player.model.mixer) {
            this.player.model.mixer.timeScale = 1;
        }
        
        // Resume all enemy animations
        if (this.enemyManager) {
            this.enemyManager.resume();
        }
        
        // Resume particle effects
        if (this.effectsManager) {
            this.effectsManager.resume();
        }
        
        // Dispatch event that game has been resumed
        emitEvent && this.events.dispatch('gameStateChanged', 'running');
        
        console.debug("Game resumed successfully");
    }
    
    /**
     * Game animation loop
     */
    animate() {
        // Always continue the animation loop regardless of pause state
        requestAnimationFrame(() => this.animate());
        
        // Log memory usage every 5 seconds for debugging
        const now = Date.now();
        if (!this._lastMemoryLog || now - this._lastMemoryLog > 5000) {
            if (window.performance && window.performance.memory) {
                const memoryInfo = window.performance.memory;
                console.debug(`Memory usage: ${Math.round(memoryInfo.usedJSHeapSize / (1024 * 1024))}MB / ${Math.round(memoryInfo.jsHeapSizeLimit / (1024 * 1024))}MB`);
            }
            this._lastMemoryLog = now;
        }
        
        const delta = this.clock.getDelta();
        
        // Update performance manager first
        this.performanceManager.update(delta);
        
        // Update controls (only if enabled)
        if (this.controls.enabled) {
            this.controls.update();
        }
        
        // If game is paused, only render the scene but don't update game logic.
        // Still run warmup countdown so we can hide overlay and unpause together when ready.
        if (this.state.isPaused()) {
            this.jumpRequested = false; // clear so we don't jump when resuming
            this.safeRender(this.scene, this.camera);
            const playRevealEl = document.getElementById('play-reveal-overlay');
            // After 1s if not yet stable, switch to blur (fog-waiting); on low-end blur stays until loaded stable
            if (playRevealEl && this._playRevealStartTime != null) {
                const elapsed = (Date.now() - this._playRevealStartTime) / 1000;
                const stillWaiting = this._warmupFramesLeft > 0 || (this._revealStableFramesLeft != null && this._revealStableFramesLeft > 0);
                if (elapsed >= 1 && stillWaiting) {
                    playRevealEl.classList.add('fog-waiting');
                    if (this.gameContainer) {
                        this.gameContainer.style.opacity = '1';
                        this.gameContainer.style.pointerEvents = 'none';
                    }
                }
            }
            // Warmup then stable-frames: only start 3s reveal when loaded stable; 100% disappear only after reveal animation
            if (this._warmupFramesLeft > 0) {
                this._warmupFramesLeft--;
                if (this._warmupFramesLeft === 0) {
                    this._warmupFramesLeft = -1;
                    this._revealStableFramesLeft = 8; // ~90% of a short burst: need 8 stable frames before starting reveal
                }
            }
            const STABLE_FRAME_MAX_MS = 80; // count frame as stable if delta under 80ms (~12fps)
            if (this._revealStableFramesLeft != null && this._revealStableFramesLeft > 0) {
                if (delta * 1000 < STABLE_FRAME_MAX_MS) this._revealStableFramesLeft--;
                if (this._revealStableFramesLeft === 0) {
                    this._revealStableFramesLeft = -1;
                    let revealDoneCalled = false;
                    const onRevealDone = () => {
                        if (revealDoneCalled) return;
                        revealDoneCalled = true;
                        if (this._revealFallbackTimer) {
                            clearTimeout(this._revealFallbackTimer);
                            this._revealFallbackTimer = null;
                        }
                        if (playRevealEl) {
                            playRevealEl.removeEventListener('animationend', onRevealDone);
                            playRevealEl.style.display = 'none';
                            playRevealEl.classList.remove('reveal-circle', 'fog-waiting');
                        }
                        if (this.gameContainer) {
                            this.gameContainer.style.opacity = '1';
                            this.gameContainer.style.pointerEvents = '';
                        }
                        if (this.hudManager) this.hudManager.showAllUI();
                        const homeButton = document.getElementById('home-button');
                        if (homeButton) homeButton.style.display = 'block';
                        const mapOverlayEl = document.getElementById('mapLoadingOverlay');
                        if (mapOverlayEl) mapOverlayEl.style.display = 'none';
                        this.resume();
                        this.audioManager.playMusic();
                        console.debug("Game revealed and unpaused");
                    };
                    if (playRevealEl) {
                        playRevealEl.addEventListener('animationend', onRevealDone);
                        playRevealEl.classList.add('reveal-circle'); // 3s minimum fog circle reveal
                        this._revealFallbackTimer = setTimeout(onRevealDone, 3200);
                    } else {
                        onRevealDone();
                    }
                }
            }
            return;
        }
        
        // Warmup: hide map overlay for first N frames (when already running, e.g. loaded game)
        if (this._warmupFramesLeft > 0) {
            this._warmupFramesLeft--;
            if (this._warmupFramesLeft === 0) {
                const mapOverlayEl = document.getElementById('mapLoadingOverlay');
                if (mapOverlayEl) mapOverlayEl.style.display = 'none';
                const playRevealEl = document.getElementById('play-reveal-overlay');
                if (playRevealEl) playRevealEl.style.display = 'none';
                if (this.gameContainer) {
                    this.gameContainer.style.opacity = '1';
                    this.gameContainer.style.pointerEvents = '';
                }
                if (this.hudManager) this.hudManager.showAllUI();
                const homeButton = document.getElementById('home-button');
                if (homeButton) homeButton.style.display = 'block';
                this._warmupFramesLeft = -1;
            }
        }
        
        // Update input handler for continuous skill casting
        this.inputHandler.update(delta);
        
        // Update player
        this.player.update(delta);
        
        // Rebase world so player is at origin for rendering (avoids float precision blur far from 0,0,0)
        if (this.worldGroup && this.player?.movement?.getPosition) {
            this.worldGroup.position.copy(this.player.movement.getPosition()).negate();
        }
        
        // Update world based on player position
        this.world.update(this.player.getPosition(), delta);
        
        // Boundary loop: wrap player when hitting map bounds for endless feel
        const bounds = this.world.getMapBounds();
        if (bounds) {
            const pos = this.player.getPosition();
            let wrap = false;
            let nx = pos.x, nz = pos.z;
            if (pos.x < bounds.minX) { nx = bounds.maxX - (bounds.minX - pos.x); wrap = true; }
            else if (pos.x > bounds.maxX) { nx = bounds.minX + (pos.x - bounds.maxX); wrap = true; }
            if (pos.z < bounds.minZ) { nz = bounds.maxZ - (bounds.minZ - pos.z); wrap = true; }
            else if (pos.z > bounds.maxZ) { nz = bounds.minZ + (pos.z - bounds.maxZ); wrap = true; }
            if (wrap) this.player.setPosition(nx, pos.y, nz);
        }
        
        // Update enemies
        this.enemyManager.update(delta);
        
        // Update item drops
        if (this.itemDropManager) {
            this.itemDropManager.update(delta);
        }
        
        // Check collisions
        this.collisionManager.update();
        
        // Update interaction system
        if (this.interactionSystem) {
            this.interactionSystem.update(delta);
        }
        
        // Update UI
        this.hudManager.update(delta);
        
        // Update effects
        this.effectsManager.update(delta);
        
        // Update multiplayer
        if (this.multiplayerManager) {
            this.multiplayerManager.update(delta);
        }
        
        // Render scene using safe render method
        if (!this.safeRender(this.scene, this.camera)) {
            console.warn("Safe render failed, skipping frame");
        }
    }
    
    /**
     * Handle window resize event
     */
    onWindowResize() {
        // Check if this is triggered by a fullscreen change
        if (window.isFullscreenChange) {
            console.debug('Handling resize as part of fullscreen change');
            return; // The fullscreen handlers will take care of resizing
        }
        
        // For normal window resizing, adjust the renderer size
        this.adjustRendererSize();
    }
    
    /**
     * Create a WebGLRenderer with settings for the specified quality level
     * @param {string} qualityLevel - The quality level to use
     * @returns {THREE.WebGLRenderer} The configured renderer
     */
    createRenderer(qualityLevel) {
        if (!RENDER_CONFIG[qualityLevel]) {
            console.error(`Unknown quality level: ${qualityLevel}, falling back to high`);
            qualityLevel = 'high';
        }
        
        const config = RENDER_CONFIG[qualityLevel].init;
        
        try {
            // Create renderer with the specified configuration
            const renderer = new THREE.WebGLRenderer({
                canvas: this.canvas,
                antialias: config.antialias,
                powerPreference: config.powerPreference,
                precision: config.precision,
                stencil: config.stencil,
                logarithmicDepthBuffer: config.logarithmicDepthBuffer,
                depth: config.depth,
                alpha: config.alpha
            });
            
            // Add WebGL context event listeners
            this.setupWebGLContextHandlers(renderer);
            
            // Apply additional settings
            this.applyRendererSettings(renderer, qualityLevel);
            
            // Set size (this is common for all quality levels)
            renderer.setSize(window.innerWidth, window.innerHeight);
            
            // Validate WebGL context
            const gl = renderer.getContext();
            if (!gl || gl.isContextLost()) {
                throw new Error('WebGL context is not available or lost');
            }
            
            console.debug(`Renderer created successfully with ${qualityLevel} quality`);
            return renderer;
            
        } catch (error) {
            console.error('Failed to create WebGL renderer:', error);
            
            // Try to create a fallback renderer with minimal settings
            try {
                console.warn('Attempting to create fallback renderer with minimal settings');
                const fallbackRenderer = new THREE.WebGLRenderer({
                    canvas: this.canvas,
                    antialias: false,
                    powerPreference: 'default',
                    precision: 'lowp'
                });
                
                this.setupWebGLContextHandlers(fallbackRenderer);
                fallbackRenderer.setSize(window.innerWidth, window.innerHeight);
                
                console.warn('Fallback renderer created successfully');
                return fallbackRenderer;
                
            } catch (fallbackError) {
                console.error('Failed to create fallback renderer:', fallbackError);
                throw new Error('Unable to initialize WebGL renderer');
            }
        }
    }
    
    /**
     * Set up WebGL context event handlers for context loss/restoration
     * @param {THREE.WebGLRenderer} renderer - The Three.js renderer
     */
    setupWebGLContextHandlers(renderer) {
        const canvas = renderer.domElement;
        
        canvas.addEventListener('webglcontextlost', (event) => {
            console.warn('WebGL context lost');
            event.preventDefault();
            
            // Stop the animation loop
            if (this.animationId) {
                cancelAnimationFrame(this.animationId);
                this.animationId = null;
            }
            
            // Mark context as lost
            this.webglContextLost = true;
        });
        
        canvas.addEventListener('webglcontextrestored', (event) => {
            console.log('WebGL context restored');
            
            // Mark context as restored
            this.webglContextLost = false;
            
            // Reinitialize renderer settings
            try {
                const qualityLevel = this.materialQuality || localStorage.getItem('monk_journey_quality_level') || 'high';
                this.applyRendererSettings(renderer, qualityLevel);
                
                // Restart the animation loop if the game is running
                if (this.state.isRunning() && !this.animationId) {
                    this.startAnimationLoop();
                }
                
                console.log('WebGL context restoration completed');
            } catch (error) {
                console.error('Error during WebGL context restoration:', error);
            }
        });
    }
    
    /**
     * Apply renderer settings based on quality level with device capability detection.
     * Automatically adjusts shadow map sizes and types based on device capabilities.
     * Desktop: Uses full quality settings (e.g., 4096 for high)
     * Mobile: Automatically scales down to device-safe limits
     * @param {THREE.WebGLRenderer} renderer - The Three.js renderer
     * @param {string} qualityLevel - The quality level to apply ('high'|'medium'|'low'|'minimal')
     */
    applyRendererSettings(renderer, qualityLevel) {
        if (!RENDER_CONFIG[qualityLevel]) {
            console.error(`Unknown quality level: ${qualityLevel}`);
            return;
        }
        
        const settings = RENDER_CONFIG[qualityLevel].settings;
        const dpr = window.devicePixelRatio || 1;
        
        // Apply pixel ratio - always compute from current device so "high" on mobile is sharp (not baked at load time)
        let pixelRatio;
        if (qualityLevel === 'high') {
            pixelRatio = Math.max(2, dpr); // Minimum 2, no upper cap
        } else if (qualityLevel === 'medium') {
            pixelRatio = Math.min(dpr, 0.85);
        } else {
            pixelRatio = settings.pixelRatio;
            if (this.deviceCapabilities) {
                const caps = this.deviceCapabilities;
                const isMobileOrTablet = caps.isMobile || caps.isTablet;
                const isPowerful = caps.gpuTier === 'high' || caps.gpuTier === 'medium';
                if (isMobileOrTablet && isPowerful) {
                    if (qualityLevel === 'low') {
                        pixelRatio = Math.min(dpr, 1.25);
                    } else if (qualityLevel === 'minimal') {
                        pixelRatio = Math.min(dpr, 0.75);
                    }
                    console.debug(`Powerful mobile: using pixel ratio ${pixelRatio.toFixed(2)} for ${qualityLevel} (devicePixelRatio=${dpr})`);
                }
            }
        }
        renderer.setPixelRatio(pixelRatio);
        
        // Determine if shadows should be enabled based on device capabilities
        const shadowsEnabled = this.deviceCapabilities 
            ? deviceCapabilities.shouldEnableShadows(qualityLevel)
            : settings.shadowMapEnabled;
        
        renderer.shadowMap.enabled = shadowsEnabled;
        
        // Apply shadow map size if shadows are enabled
        if (shadowsEnabled && settings.shadowMapSize > 0) {
            // Get optimal shadow map size for this device
            let shadowMapSize = settings.shadowMapSize;
            
            if (this.deviceCapabilities && this.deviceCapabilities.optimalShadowMapSize) {
                const optimalSize = this.deviceCapabilities.optimalShadowMapSize[qualityLevel];
                
                // Use the smaller of the requested size and the optimal size for this device
                shadowMapSize = Math.min(settings.shadowMapSize, optimalSize);
                
                console.debug(`Shadow map size adjusted from ${settings.shadowMapSize} to ${shadowMapSize} based on device capabilities`);
            }
            
            renderer.shadowMap.mapSize = new THREE.Vector2(shadowMapSize, shadowMapSize);
            console.debug(`Shadow map size set to: ${shadowMapSize}x${shadowMapSize}`);
        } else if (!shadowsEnabled) {
            console.debug(`Shadows disabled for ${qualityLevel} quality on this device`);
        }
        
        // Apply shadow map type based on device capabilities
        let shadowMapType = settings.shadowMapType;
        
        if (this.deviceCapabilities) {
            const recommendedType = deviceCapabilities.getRecommendedShadowMapType(qualityLevel);
            
            // Use recommended type if it's more conservative than the requested type
            const typeHierarchy = {
                'BasicShadowMap': 0,
                'PCFShadowMap': 1,
                'PCFSoftShadowMap': 2
            };
            
            const requestedLevel = typeHierarchy[shadowMapType] || 1;
            const recommendedLevel = typeHierarchy[recommendedType] || 1;
            
            if (recommendedLevel < requestedLevel) {
                shadowMapType = recommendedType;
                console.debug(`Shadow map type adjusted from ${settings.shadowMapType} to ${shadowMapType} for better mobile performance`);
            }
        }
        
        switch (shadowMapType) {
            case 'PCFSoftShadowMap':
                renderer.shadowMap.type = THREE.PCFSoftShadowMap;
                break;
            case 'PCFShadowMap':
                renderer.shadowMap.type = THREE.PCFShadowMap;
                break;
            case 'BasicShadowMap':
                renderer.shadowMap.type = THREE.BasicShadowMap;
                break;
            default:
                renderer.shadowMap.type = THREE.PCFShadowMap;
        }
        
        // Apply color space
        switch (settings.outputColorSpace) {
            case 'SRGBColorSpace':
                renderer.outputColorSpace = THREE.SRGBColorSpace;
                break;
            case 'LinearSRGBColorSpace':
                renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
                break;
            default:
                renderer.outputColorSpace = THREE.SRGBColorSpace;
        }
        
        // Apply special 8-bit mode settings for minimal quality
        if (qualityLevel === 'minimal' && settings.pixelatedMode) {
            console.debug('Applying 8-bit retro mode settings');
            
            // Enable dithering for retro look
            renderer.dithering = true;
            
            // Apply pixelated rendering by setting a very low pixel ratio
            // This is already done above with setPixelRatio
            
            // Apply post-processing for 8-bit look if available
            if (this.composer && this.effectComposer) {
                console.debug('Setting up 8-bit post-processing effects');
                // This would be implemented if you have a post-processing system
            }
            
            // Apply additional optimizations for low-end devices
            renderer.sortObjects = false; // Disable object sorting for performance
        }
        
        // Apply optimized rendering for low quality
        if (qualityLevel === 'low' && settings.optimizedRendering) {
            console.debug('Applying optimized rendering for low-end devices');
            renderer.sortObjects = false; // Disable object sorting for performance
        }
        
        console.debug(`Applied ${qualityLevel} renderer settings (shadows: ${shadowsEnabled ? 'enabled' : 'disabled'})`);
    }
    
    /**
     * Apply material quality settings to all objects in the scene
     * @param {string} quality - The quality level ('high', 'medium', 'low', or 'minimal')
     * @param {boolean} updateRenderer - Whether to also update renderer settings
     */
    applyMaterialQuality(quality, updateRenderer = false) {
        if (!this.scene) {
            console.warn('Cannot apply material quality: scene not available');
            return;
        }
        
        // Store the current quality level
        this.materialQuality = quality;
        
        // Update renderer settings if requested
        if (updateRenderer && this.renderer) {
            this.applyRendererSettings(this.renderer, quality);
        }
        
        // Apply to existing scene objects
        this.applyInitialMaterialQuality(quality);
        
        // Apply scene-wide optimizations based on quality level
        if (this.scene) {
            // Import SceneOptimizer dynamically to avoid circular dependencies
            import('./SceneOptimizer.js').then(({ SceneOptimizer }) => {
                // Apply optimizations with the current quality level
                SceneOptimizer.optimizeScene(this.scene, quality);
                if (this.world?.lightingManager?.applyQuality) {
                    this.world.lightingManager.applyQuality(quality);
                }
                console.debug(`Applied scene-wide optimizations for ${quality} quality level`);
            });
        }
        
        // Update LOD settings if LOD manager exists
        if (this.world && this.world.lodManager) {
            this.world.lodManager.updateQualitySettings(quality);
        }
        
        // Update performance manager (cache quality for getCurrentQualityLevel)
        if (this.performanceManager) {
            this.performanceManager.currentQualityLevel = quality;
        }
        
        // Update shadow debugger if visible
        if (shadowDebugger.isVisible) {
            shadowDebugger.update(this.renderer, quality);
        }
        
        console.debug(`Material quality updated to: ${quality}`);
    }
    
    /**
     * Apply material quality settings to all objects in the scene once during initialization
     * @param {string} quality - The quality level ('high', 'medium', 'low', or 'minimal')
     */
    applyInitialMaterialQuality(quality) {
        if (!this.scene) {
            console.warn('Cannot apply material quality: scene not available');
            return;
        }
        
        console.debug(`Applying initial material quality: ${quality}`);
        
        // Traverse all objects in the scene
        this.scene.traverse(object => {
            // Skip objects without materials
            if (!object.material) return;
            
            // Handle arrays of materials
            const isArray = Array.isArray(object.material);
            const materials = isArray ? object.material : [object.material];
            const newMaterials = [];
            
            materials.forEach((material, index) => {
                // Skip materials that don't need modification
                if (!material || material.userData.isUI) {
                    newMaterials.push(material);
                    return;
                }
                
                let newMaterial;
                
                // Player model gets one quality level higher for smoother appearance on mobile
                const isPlayerModel = object.userData && object.userData.isPlayerModel;
                const effectiveQuality = isPlayerModel && quality !== 'high'
                    ? (quality === 'minimal' ? 'low' : quality === 'low' ? 'medium' : 'high')
                    : quality;

                // Apply quality settings based on the 4 quality levels
                switch (effectiveQuality) {
                    case 'high':
                        // Keep original material (highest quality)
                        newMaterial = material;
                        break;
                        
                    case 'medium':
                        // Create MeshPhongMaterial (good balance between quality and performance)
                        newMaterial = this.createPhongMaterial(material);
                        break;
                        
                    case 'low':
                        // Create MeshLambertMaterial (performance-focused with lighting)
                        newMaterial = this.createLambertMaterial(material, isPlayerModel);
                        break;
                        
                    case 'minimal':
                        // Create MeshBasicMaterial (maximum performance)
                        newMaterial = this.createBasicMaterial(material);
                        break;
                        
                    default:
                        console.warn(`Unknown material quality: ${quality}, using medium quality`);
                        newMaterial = this.createPhongMaterial(material);
                }
                
                // Mark the material as processed to prevent re-processing
                newMaterial.userData.qualityProcessed = true;
                newMaterial.userData.qualityLevel = quality;
                
                newMaterials.push(newMaterial);
            });
            
            // Replace materials on the object
            if (isArray) {
                object.material = newMaterials;
            } else {
                object.material = newMaterials[0];
            }
        });
        
        // Force renderer to update
        if (this.renderer) {
            this.renderer.renderLists.dispose();
        }
        
        console.debug(`Initial material quality '${quality}' applied successfully. Total objects processed: ${this.scene.children.length}`);
    }
    
    /**
     * Restore original material properties
     * @param {THREE.Material} material - The material to restore
     * @private
     */
    restoreOriginalMaterial(material) {
        if (!material.userData.originalType) return;
        
        // No need to change if already the correct type
        if (material.type === material.userData.originalType) return;
        
        // Create new material of original type
        const originalType = material.userData.originalType;
        let newMaterial;
        
        // Create appropriate material based on original type
        switch (originalType) {
            case 'MeshStandardMaterial':
                newMaterial = new THREE.MeshStandardMaterial();
                break;
            case 'MeshPhysicalMaterial':
                newMaterial = new THREE.MeshPhysicalMaterial();
                break;
            case 'MeshPhongMaterial':
                newMaterial = new THREE.MeshPhongMaterial();
                break;
            case 'MeshLambertMaterial':
                newMaterial = new THREE.MeshLambertMaterial();
                break;
            default:
                console.warn(`Unknown original material type: ${originalType}`);
                return;
        }
        
        // Copy basic properties
        newMaterial.name = material.name;
        newMaterial.transparent = material.transparent;
        newMaterial.opacity = material.opacity;
        newMaterial.side = material.side;
        
        // Restore maps
        if (material.userData.map) newMaterial.map = material.userData.map;
        if (material.userData.normalMap) newMaterial.normalMap = material.userData.normalMap;
        if (material.userData.roughnessMap) newMaterial.roughnessMap = material.userData.roughnessMap;
        if (material.userData.metalnessMap) newMaterial.metalnessMap = material.userData.metalnessMap;
        if (material.userData.emissiveMap) newMaterial.emissiveMap = material.userData.emissiveMap;
        if (material.userData.aoMap) newMaterial.aoMap = material.userData.aoMap;
        
        // Restore colors
        if (material.userData.color) newMaterial.color.copy(material.userData.color);
        if (material.userData.emissive) newMaterial.emissive.copy(material.userData.emissive);
        
        // Copy userData
        newMaterial.userData = material.userData;
        
        // Replace material
        Object.assign(material, newMaterial);
    }
    
    /**
     * Create a new MeshLambertMaterial based on an existing material (low quality with lighting)
     * @param {THREE.Material} originalMaterial - The original material to base the new one on
     * @returns {THREE.MeshLambertMaterial} - The new Lambert material
     * @private
     */
    createLambertMaterial(originalMaterial, isPlayerModel = false) {
        // Create new Lambert material (simple lighting, good performance)
        const lambertMaterial = new THREE.MeshLambertMaterial({
            fog: true // Ensure fog works properly
        });
        
        // Copy essential properties
        lambertMaterial.name = originalMaterial.name + '_lambert';
        lambertMaterial.transparent = originalMaterial.transparent;
        lambertMaterial.opacity = originalMaterial.opacity;
        lambertMaterial.side = originalMaterial.side;
        
        // Copy and optimize supported texture maps
        if (originalMaterial.map) {
            // Store original texture for potential restoration
            const originalTexture = originalMaterial.map;
            
            // Check if we need to create a downscaled version of the texture
            if (!originalTexture.userData || !originalTexture.userData.isDownscaled) {
                // Player model always keeps full-resolution texture for a crisp, non-pixelated look
                const textureQuality = isPlayerModel ? 1 : RENDER_CONFIG.low.materials.textureQuality;
                
                // Only downscale if quality is below threshold (never for player)
                if (textureQuality < 0.5) {
                    // Create a downscaled texture for low quality
                    const downscaledTexture = this.createDownscaledTexture(originalTexture, textureQuality);
                    
                    // Use the downscaled texture
                    lambertMaterial.map = downscaledTexture;
                    
                    // Store reference to original texture for potential restoration
                    lambertMaterial.userData.originalTexture = originalTexture;
                } else {
                    // Use original texture but optimize settings
                    lambertMaterial.map = originalTexture;
                    
                    // Optimize texture settings
                    originalTexture.anisotropy = 1;
                    originalTexture.minFilter = THREE.LinearFilter;
                }
            } else {
                // Use the already downscaled texture
                lambertMaterial.map = originalTexture;
            }
        }
        
        // Handle emissive map with less optimization (it's usually smaller)
        if (originalMaterial.emissiveMap) {
            lambertMaterial.emissiveMap = originalMaterial.emissiveMap;
            // Just optimize settings
            originalMaterial.emissiveMap.anisotropy = 1;
        }
        
        // Copy colors
        if (originalMaterial.color) {
            lambertMaterial.color.copy(originalMaterial.color);
        } else {
            lambertMaterial.color.set(0xffffff); // Default white
        }
        
        if (originalMaterial.emissive) {
            lambertMaterial.emissive.copy(originalMaterial.emissive);
        }
        
        // Use smooth shading for player model to avoid square-like appearance; flat for others
        lambertMaterial.flatShading = !isPlayerModel;
        
        // Copy relevant userData
        lambertMaterial.userData = { 
            ...originalMaterial.userData,
            isLowQuality: true,
            originalType: originalMaterial.type
        };
        
        return lambertMaterial;
    }

    /**
     * Create a new MeshBasicMaterial based on an existing material (minimal quality)
     * @param {THREE.Material} originalMaterial - The original material to base the new one on
     * @returns {THREE.MeshBasicMaterial} - The new basic material
     * @private
     */
    createBasicMaterial(originalMaterial) {
        // Create new basic material with fog support
        const basicMaterial = new THREE.MeshBasicMaterial({
            fog: true // Ensure fog works with basic materials
        });
        
        // Copy essential properties
        basicMaterial.name = originalMaterial.name + '_basic';
        basicMaterial.transparent = originalMaterial.transparent;
        basicMaterial.opacity = originalMaterial.opacity;
        basicMaterial.side = originalMaterial.side;
        
        // Copy texture maps (basic material only supports diffuse map) with optimization
        if (originalMaterial.map) {
            // Store original texture for potential restoration
            const originalTexture = originalMaterial.map;
            
            // Check if we need to create a downscaled version of the texture
            if (!originalTexture.userData || !originalTexture.userData.isDownscaled) {
                // Get the texture quality level from config
                const textureQuality = RENDER_CONFIG.minimal.materials.textureQuality;
                
                // Create a downscaled texture for minimal quality
                const downscaledTexture = this.createDownscaledTexture(originalTexture, textureQuality);
                
                // Use the downscaled texture
                basicMaterial.map = downscaledTexture;
                
                // Store reference to original texture for potential restoration
                basicMaterial.userData.originalTexture = originalTexture;
            } else {
                // Use the already downscaled texture
                basicMaterial.map = originalTexture;
            }
            
            // Disable mipmaps and set minimal filtering for maximum performance
            if (basicMaterial.map) {
                basicMaterial.map.generateMipmaps = false;
                basicMaterial.map.minFilter = THREE.NearestFilter;
                basicMaterial.map.magFilter = THREE.NearestFilter;
                basicMaterial.map.anisotropy = 1;
            }
        }
        
        // Handle color properly - MeshBasicMaterial shows colors as-is without lighting
        if (originalMaterial.color) {
            // Make the color moderately brighter since basic materials don't respond to lighting
            const brightColor = originalMaterial.color.clone();
            brightColor.multiplyScalar(1.5); // Brighten by 50% to compensate for no lighting
            // Clamp to prevent over-saturation
            brightColor.r = Math.min(brightColor.r, 1.0);
            brightColor.g = Math.min(brightColor.g, 1.0);
            brightColor.b = Math.min(brightColor.b, 1.0);
            basicMaterial.color.copy(brightColor);
        } else {
            // Set a default visible color if no color is present
            basicMaterial.color.set(0xcccccc); // Light gray - brighter than before
        }
        
        // Disable expensive material features
        basicMaterial.flatShading = true;
        
        // Copy relevant userData
        basicMaterial.userData = { 
            ...originalMaterial.userData,
            isMinimalQuality: true,
            originalType: originalMaterial.type
        };
        
        return basicMaterial;
    }
    
    /**
     * Create a downscaled version of a texture for better performance
     * @param {THREE.Texture} originalTexture - The original texture
     * @param {number} qualityFactor - Quality factor between 0 and 1
     * @returns {THREE.Texture} - The downscaled texture
     * @private
     */
    createDownscaledTexture(originalTexture, qualityFactor = 0.5) {
        // Skip if already downscaled or no image
        if (
            (originalTexture.userData && originalTexture.userData.isDownscaled) || 
            !originalTexture.image
        ) {
            return originalTexture;
        }
        
        // Get original image
        const originalImage = originalTexture.image;
        
        // Calculate new dimensions (ensure minimum size of 16x16)
        const newWidth = Math.max(16, Math.floor(originalImage.width * qualityFactor));
        const newHeight = Math.max(16, Math.floor(originalImage.height * qualityFactor));
        
        // Create a canvas to downscale the texture
        const canvas = document.createElement('canvas');
        canvas.width = newWidth;
        canvas.height = newHeight;
        
        // Draw the original image to the canvas with downscaling
        const ctx = canvas.getContext('2d');
        ctx.drawImage(originalImage, 0, 0, newWidth, newHeight);
        
        // Create a new texture from the downscaled canvas
        const downscaledTexture = new THREE.Texture(canvas);
        
        // Copy essential properties from original texture
        downscaledTexture.wrapS = originalTexture.wrapS;
        downscaledTexture.wrapT = originalTexture.wrapT;
        downscaledTexture.repeat = originalTexture.repeat.clone();
        downscaledTexture.offset = originalTexture.offset.clone();
        downscaledTexture.center = originalTexture.center.clone();
        downscaledTexture.rotation = originalTexture.rotation;
        
        // Set performance-optimized settings (LinearFilter for smoother look vs NearestFilter pixelation)
        downscaledTexture.generateMipmaps = false;
        downscaledTexture.minFilter = THREE.LinearFilter;
        downscaledTexture.magFilter = THREE.LinearFilter;
        downscaledTexture.anisotropy = 1;
        
        // Mark as downscaled to prevent re-processing
        downscaledTexture.userData = {
            isDownscaled: true,
            originalTextureUuid: originalTexture.uuid,
            qualityFactor: qualityFactor
        };
        
        // Update texture
        downscaledTexture.needsUpdate = true;
        
        return downscaledTexture;
    }
    
    /**
     * Create a new MeshPhongMaterial based on an existing material (medium quality)
     * @param {THREE.Material} originalMaterial - The original material to base the new one on
     * @returns {THREE.MeshPhongMaterial} - The new phong material
     * @private
     */
    createPhongMaterial(originalMaterial) {
        // Create new phong material
        const phongMaterial = new THREE.MeshPhongMaterial();
        
        // Copy essential properties
        phongMaterial.name = originalMaterial.name + '_phong';
        phongMaterial.transparent = originalMaterial.transparent;
        phongMaterial.opacity = originalMaterial.opacity;
        phongMaterial.side = originalMaterial.side;
        
        // Copy supported texture maps
        if (originalMaterial.map) phongMaterial.map = originalMaterial.map;
        if (originalMaterial.normalMap) phongMaterial.normalMap = originalMaterial.normalMap;
        if (originalMaterial.emissiveMap) phongMaterial.emissiveMap = originalMaterial.emissiveMap;
        
        // Copy colors
        if (originalMaterial.color) phongMaterial.color.copy(originalMaterial.color);
        if (originalMaterial.emissive) phongMaterial.emissive.copy(originalMaterial.emissive);
        
        // Set reasonable shininess
        phongMaterial.shininess = 30;
        
        // Copy relevant userData
        phongMaterial.userData = { 
            ...originalMaterial.userData,
            isMediumQuality: true,
            originalType: originalMaterial.type
        };
        
        return phongMaterial;
    }
    
    /**
     * Validate materials in the scene and fix potential shader issues
     * @param {THREE.Scene} scene - The scene to validate
     */
    validateSceneMaterials(scene) {
        if (!scene) return;
        
        scene.traverse((object) => {
            if (object.material) {
                const materials = Array.isArray(object.material) ? object.material : [object.material];
                
                materials.forEach((material, index) => {
                    if (!material) return;
                    
                    // Check for invalid or disposed materials
                    try {
                        // Test if material is still valid by accessing a property
                        const testColor = material.color;
                        
                        // Check if material needs to be compiled or has shader issues
                        if (material.needsUpdate || this.isMaterialProblematic(material)) {
                            try {
                                // Force material compilation
                                if (this.renderer && !this.webglContextLost) {
                                    this.renderer.compile(scene, this.camera);
                                }
                                material.needsUpdate = false;
                            } catch (error) {
                                console.warn(`Material compilation failed for object ${object.name || 'unnamed'}:`, error.message);
                                this.replaceMaterialWithFallback(object, material, index);
                            }
                        }
                    } catch (error) {
                        console.warn(`Material validation failed for object ${object.name || 'unnamed'}:`, error.message);
                        this.replaceMaterialWithFallback(object, material, index);
                    }
                });
            }
        });
    }
    
    /**
     * Check if a material is problematic and might cause WebGL errors
     * @param {THREE.Material} material - The material to check
     * @returns {boolean} - True if the material is problematic
     */
    isMaterialProblematic(material) {
        try {
            // Check for common problematic properties
            if (material.type === 'MeshBasicMaterial' && 
                (material.emissive || material.emissiveIntensity !== undefined)) {
                return true;
            }
            
            if (material.type === 'MeshLambertMaterial' && 
                (material.roughness !== undefined || material.metalness !== undefined)) {
                return true;
            }
            
            // Check if material has been disposed
            if (material.uuid === undefined || material.uuid === null) {
                return true;
            }
            
            return false;
        } catch (error) {
            return true; // If we can't check, assume it's problematic
        }
    }
    
    /**
     * Replace a problematic material with a safe fallback
     * @param {THREE.Object3D} object - The object with the material
     * @param {THREE.Material} material - The problematic material
     * @param {number} index - The material index if it's an array
     */
    replaceMaterialWithFallback(object, material, index) {
        try {
            // Create a safe fallback material
            const fallbackMaterial = new THREE.MeshBasicMaterial({ 
                color: material.color || 0x808080,
                transparent: material.transparent || false,
                opacity: material.opacity || 1,
                side: material.side || THREE.FrontSide
            });
            
            // Dispose of the old material safely
            if (material && typeof material.dispose === 'function') {
                try {
                    material.dispose();
                } catch (disposeError) {
                    console.warn('Error disposing material:', disposeError.message);
                }
            }
            
            // Replace the material
            if (Array.isArray(object.material)) {
                object.material[index] = fallbackMaterial;
            } else {
                object.material = fallbackMaterial;
            }
            
            console.warn(`Replaced problematic material with fallback for object ${object.name || 'unnamed'}`);
        } catch (error) {
            console.error('Failed to replace material with fallback:', error.message);
        }
    }
    
    /**
     * Notify the game that an item has been dropped (for more frequent material validation)
     */
    notifyItemDropped() {
        this.lastItemDropTime = Date.now();
    }
    
    /**
     * Safe render method that checks for WebGL context and renderer state
     * @param {THREE.Scene} scene - The scene to render
     * @param {THREE.Camera} camera - The camera to use for rendering
     * @returns {boolean} - True if render was successful, false otherwise
     */
    safeRender(scene, camera) {
        // Check if renderer exists
        if (!this.renderer) {
            console.warn('Renderer not available for safe render');
            return false;
        }
        
        // Check if WebGL context is lost
        if (this.webglContextLost) {
            console.warn('WebGL context is lost, skipping render');
            return false;
        }
        
        // Check if scene and camera are valid
        if (!scene || !camera) {
            console.warn('Invalid scene or camera for rendering');
            return false;
        }
        
        try {
            // Check WebGL context state
            const gl = this.renderer.getContext();
            if (!gl || gl.isContextLost()) {
                console.warn('WebGL context is lost, marking as lost');
                this.webglContextLost = true;
                return false;
            }
            
            // Validate scene materials periodically or when forced
            const now = Date.now();
            let shouldValidate = now - this.lastMaterialValidation > this.materialValidationInterval;
            
            // More frequent validation after item drops
            if (now - this.lastItemDropTime < this.itemDropValidationWindow) {
                shouldValidate = shouldValidate || (now - this.lastMaterialValidation > 500); // Every 500ms after item drop
            }
            
            if (shouldValidate) {
                this.validateSceneMaterials(scene);
                this.lastMaterialValidation = now;
            }
            
            // Perform the render
            this.renderer.render(scene, camera);
            return true;
            
        } catch (error) {
            // Handle shader/WebGL errors gracefully
            if (error.message && (
                error.message.includes("Cannot set properties of undefined") ||
                error.message.includes("Cannot read properties of undefined") ||
                error.message.includes("WebGL") ||
                error.message.includes("uniform")
            )) {
                console.warn('WebGL render error caught:', error.message);
                
                // Try to recover by clearing and recreating programs
                try {
                    if (this.renderer.state) {
                        this.renderer.state.reset();
                    }
                    if (this.renderer.info && this.renderer.info.programs) {
                        this.renderer.info.programs.forEach(program => {
                            if (program && program.destroy) {
                                program.destroy();
                            }
                        });
                    }
                    
                    // Force material validation on next render
                    this.lastMaterialValidation = 0;
                } catch (recoveryError) {
                    console.warn('Error during render recovery:', recoveryError.message);
                }
                
                return false;
            } else {
                // Re-throw non-WebGL errors
                throw error;
            }
        }
    }
}