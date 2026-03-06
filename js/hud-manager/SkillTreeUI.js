import { UIComponent } from "../UIComponent.js";
import { SKILLS, PRIMARY_ATTACKS, NORMAL_SKILLS, SKILL_BY_NAME } from "../config/skills.js";
import { getSkillIcon, getBuffIcon } from "../config/skill-icons.js";
import { SKILL_TREES } from "../config/skill-tree.js";
import { applyBuffsToVariants } from "../utils/SkillTreeUtils.js";
import { STORAGE_KEYS } from "../config/storage-keys.js";
import storageService from "../save-manager/StorageService.js";
import { SkillTreeGraphView } from "./SkillTreeGraphView.js";
import { getSkillTreeNodeById, canLevelSkillTreeNode } from "../config/skill-tree-graph.js";
import { getUnlockedSkillNames } from "../config/skill-unlocks.js";

/**
 * Skill Tree UI component
 * Displays the monk skill tree and allows skill customization with variants and buffs
 * Based on the SKILL_TREES data structure
 * Uses DOM elements defined in index.html
 */
export class SkillTreeUI extends UIComponent {
  /**
   * Create a new SkillTreeUI component
   * @param {Object} game - Reference to the game instance
   */
  constructor(game) {
    super("skill-tree", game);
    this.isSkillTreeOpen = false;
    this.selectedSkill = null;
    this.selectedVariant = null;
    this.selectedBuff = null;
    this.skillPoints = 10_000_000; // Will be loaded from player data
    this.selectionMode = 'variants'; // 'variants' or 'buffs'

    // All skills (including custom) are always enabled

    // Get the skill trees and apply buffs to variants
    this.skillTrees = JSON.parse(JSON.stringify(SKILL_TREES)); // Create a deep copy
    applyBuffsToVariants(this.skillTrees);

    // Initialize player skills data structure
    this.playerSkills = {};
    
    // GDD graph view (skill-tree-graph.js)
    this.graphView = null;

    // 8-slot battle bar (combined with skill pick): slot 0 = primary (h), slots 1–7 = normal (1–7)
    this.slotPrimary = null;
    this.slotNormal = Array(7).fill(null);
    this.orderedSkills = null;
    this.pickerSlotIndex = null;

    // DOM elements
    this.elements = {
      skillPointsValue: null,
      skillTreeSkills: null,
      skillDetailName: null,
      skillDetailDescription: null,
      skillVariants: null,
      skillBuffs: null,
      saveButton: null,
      continueButton: null,
      backButton: null,
      nodeDetailPanel: null,
      nodeLevelLine: null,
      nodeRequirements: null,
      levelUpButton: null,
    };
  }
  
  /**
   * Filter skills based on the custom skills flag
   * @param {Object} skills - Object containing skill configurations
   * @returns {Object} - Filtered object of skill configurations
   */
  filterCustomSkills(skills) {
    // All skills always enabled
    return skills;
  }

  /**
   * Get skills ordered by SKILL_TREES (for slot bar picker).
   * @returns {{ primaryAttacks: import('../config/skills.js').SkillConfig[], normalSkills: import('../config/skills.js').SkillConfig[] }}
   */
  getOrderedSkills() {
    const skillTreeNames = Object.keys(SKILL_TREES);
    const orderedPrimaryAttacks = PRIMARY_ATTACKS.slice().sort((a, b) => {
      const aIndex = skillTreeNames.indexOf(a.name);
      const bIndex = skillTreeNames.indexOf(b.name);
      if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
      if (aIndex !== -1) return -1;
      if (bIndex !== -1) return 1;
      return 0;
    });
    const orderedNormalSkills = NORMAL_SKILLS.slice().sort((a, b) => {
      const aIndex = skillTreeNames.indexOf(a.name);
      const bIndex = skillTreeNames.indexOf(b.name);
      if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
      if (aIndex !== -1) return -1;
      if (bIndex !== -1) return 1;
      return 0;
    });
    return { primaryAttacks: orderedPrimaryAttacks, normalSkills: orderedNormalSkills };
  }

  /** @returns {Set<string>} Unlocked skill names by story progress. */
  getUnlockedSet() {
    const completed = this.game?.questManager?.completedChapterQuestIds;
    return getUnlockedSkillNames(completed || new Set());
  }

  /** Load slot assignment from localStorage (SELECTED_SKILLS). */
  loadSlotSelectionFromStorage() {
    const unlocked = this.getUnlockedSet();
    this.slotPrimary = null;
    this.slotNormal = Array(7).fill(null);
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.SELECTED_SKILLS);
      if (!raw) {
        const primary = this.orderedSkills.primaryAttacks.find(s => unlocked.has(s.name));
        this.slotPrimary = primary ? primary.name : (this.orderedSkills.primaryAttacks[0]?.name || null);
        this.slotNormal = this.orderedSkills.normalSkills
          .filter(s => unlocked.has(s.name))
          .map(s => s.name)
          .slice(0, 7);
        return;
      }
      const saved = JSON.parse(raw);
      if (saved.length > 0 && saved[0].id) {
        const primary = saved.find(s => s.isPrimary);
        this.slotPrimary = (primary && unlocked.has(primary.id)) ? primary.id : null;
        saved.filter(s => !s.isPrimary && unlocked.has(s.id)).forEach((s, i) => {
          if (i < 7) this.slotNormal[i] = s.id;
        });
      } else {
        const primary = saved.find(s => s.primaryAttack);
        this.slotPrimary = (primary && unlocked.has(primary.name)) ? primary.name : null;
        saved.filter(s => !s.primaryAttack && unlocked.has(s.name)).forEach((s, i) => {
          if (i < 7) this.slotNormal[i] = s.name;
        });
      }
      if (!this.slotPrimary) {
        const primary = this.orderedSkills.primaryAttacks.find(s => unlocked.has(s.name));
        this.slotPrimary = primary ? primary.name : null;
      }
    } catch (e) {
      console.warn('SkillTreeUI: loadSlotSelectionFromStorage failed', e);
    }
  }

  /**
   * Render the 8-slot battle bar (h + 1–7). Same visual as SkillsUI / skill selection preview.
   */
  renderSlotBar() {
    const container = this.elements.slotBar;
    if (!container) return;
    const keys = ['h', '1', '2', '3', '4', '5', '6', '7'];
    const battleSkills = [];
    if (this.slotPrimary) {
      const skill = this.orderedSkills.primaryAttacks.find(s => s.name === this.slotPrimary);
      if (skill) {
        const iconData = getSkillIcon(skill.name);
        battleSkills.push({ name: skill.name, keyDisplay: 'h', iconData, isEmpty: false, isPrimary: true });
      }
    } else {
      battleSkills.push({ name: 'Empty', keyDisplay: 'h', iconData: {}, isEmpty: true, isPrimary: true });
    }
    for (let i = 0; i < 7; i++) {
      const name = this.slotNormal[i];
      if (name) {
        const skill = this.orderedSkills.normalSkills.find(s => s.name === name);
        if (skill) {
          const iconData = getSkillIcon(skill.name);
          battleSkills.push({ name: skill.name, keyDisplay: String(i + 1), iconData, isEmpty: false, isPrimary: false });
        } else {
          battleSkills.push({ name: 'Empty', keyDisplay: String(i + 1), iconData: {}, isEmpty: true, isPrimary: false });
        }
      } else {
        battleSkills.push({ name: 'Empty', keyDisplay: String(i + 1), iconData: {}, isEmpty: true, isPrimary: false });
      }
    }
    const html = battleSkills.map((s, idx) => {
      const color = s.isEmpty ? '#555555' : (s.iconData.color || '#ffffff');
      const icon = s.isEmpty ? '+' : (s.iconData.emoji || '✨');
      const cssClass = s.isEmpty ? '' : (s.iconData.cssClass || '');
      const boxShadow = s.isEmpty ? '' : `box-shadow: 0 0 10px ${color}40;`;
      const nameDiv = s.isEmpty ? '' : `<div class="skill-name">${s.name}</div>`;
      const extraClass = s.isEmpty ? 'empty-slot ' : '';
      return `<div class="skill-button skill-tree-slot ${extraClass}" data-slot-index="${idx}" style="border-color: ${color}; ${boxShadow}">
        ${nameDiv}<div class="skill-icon ${cssClass}">${icon}</div><div class="skill-key">${s.keyDisplay}</div>
      </div>`;
    }).join('');
    container.innerHTML = html;
  }

  /** Show picker for slot (0 = primary, 1–7 = normal). */
  showPickerForSlot(slotIndex) {
    this.pickerSlotIndex = slotIndex;
    const picker = this.elements.slotPicker;
    const titleEl = this.elements.slotPickerTitle;
    const listEl = this.elements.slotPickerList;
    if (!picker || !listEl) return;
    const unlocked = this.getUnlockedSet();
    if (slotIndex === 0) {
      titleEl.textContent = 'Primary attack (key: h)';
      const skills = this.orderedSkills.primaryAttacks.filter(s => unlocked.has(s.name));
      listEl.innerHTML = skills.map(s => {
        const iconData = getSkillIcon(s.name);
        return `<div class="skill-tree-picker-item" data-skill-name="${s.name}">${iconData.emoji || '✨'} ${s.name}</div>`;
      }).join('');
    } else {
      titleEl.textContent = `Normal skill (key: ${slotIndex})`;
      const skills = this.orderedSkills.normalSkills.filter(s => unlocked.has(s.name));
      listEl.innerHTML = skills.map(s => {
        const iconData = getSkillIcon(s.name);
        return `<div class="skill-tree-picker-item" data-skill-name="${s.name}">${iconData.emoji || '✨'} ${s.name}</div>`;
      }).join('');
    }
    listEl.querySelectorAll('.skill-tree-picker-item').forEach(el => {
      el.addEventListener('click', () => {
        this.applySkillToSlot(slotIndex, el.getAttribute('data-skill-name'));
        this.hideSlotPicker();
        this.renderSlotBar();
      });
    });
    if (this.elements.slotPickerClear) {
      this.elements.slotPickerClear.onclick = () => {
        this.clearSlot(slotIndex);
        this.hideSlotPicker();
        this.renderSlotBar();
      };
    }
    if (this.elements.slotPickerBackdrop) {
      this.elements.slotPickerBackdrop.onclick = () => this.hideSlotPicker();
    }
    picker.style.display = 'flex';
  }

  hideSlotPicker() {
    this.pickerSlotIndex = null;
    if (this.elements.slotPicker) this.elements.slotPicker.style.display = 'none';
  }

  applySkillToSlot(slotIndex, skillName) {
    if (slotIndex === 0) {
      this.slotPrimary = skillName;
    } else if (slotIndex >= 1 && slotIndex <= 7) {
      this.slotNormal[slotIndex - 1] = skillName;
    }
  }

  clearSlot(slotIndex) {
    if (slotIndex === 0) this.slotPrimary = null;
    else if (slotIndex >= 1 && slotIndex <= 7) this.slotNormal[slotIndex - 1] = null;
  }

  /** Persist slot selection to localStorage and refresh player skills UI. */
  saveSlotSelection() {
    if (!this.slotPrimary) return;
    const selectedSkillIds = [
      { id: this.slotPrimary, isPrimary: true },
      ...this.slotNormal.filter(Boolean).map(name => ({ id: name, isPrimary: false }))
    ];
    try {
      localStorage.setItem(STORAGE_KEYS.SELECTED_SKILLS, JSON.stringify(selectedSkillIds));
    } catch (e) {
      console.warn('SkillTreeUI: saveSlotSelection failed', e);
      return;
    }
    if (this.game?.player) {
      this.game.player.skills.skills = [];
      this.game.player.skills.loadSkillsFromIds(selectedSkillIds);
      if (this.game.hudManager?.components.skillsUI) this.game.hudManager.components.skillsUI.init();
    }
  }
  
  /**
   * Refresh the skill tree when custom skills setting changes
   */
  async refreshSkillTree() {
    this.renderSkillTree();
    if (this.graphView) this.graphView.refresh();
  }

  /**
   * When skill tree is shown, sync points and graph from player/quest state.
   */
  show() {
    super.show();
    this.loadSlotSelectionFromStorage();
    this.renderSlotBar();
    this.syncSkillPointsFromPlayer();
    this.updateNodeDetailPanel(this.graphView ? this.graphView.getSelectedNodeId() : null);
  }

  /**
   * Initialize the component
   * @returns {boolean} - True if initialization was successful
   */
  async init() {
    // Initialize storage service
    await storageService.init();
    
    // Check if the container exists in the DOM
    if (!this.container) {
      console.error(`Container element with ID "skill-tree" not found. Creating it dynamically.`);
      this.container = document.createElement('div');
      this.container.id = 'skill-tree';
      
      // Add to UI container
      document.body.appendChild(this.container);
    }

    // Initialize DOM element references
    this.initDOMElements();

    // 8-slot bar: ordered skills and slot state from storage
    this.orderedSkills = this.getOrderedSkills();
    this.loadSlotSelectionFromStorage();
    this.renderSlotBar();
    if (this.elements.slotBar) {
      this.elements.slotBar.addEventListener('click', (e) => {
        const slot = e.target.closest('.skill-tree-slot');
        if (slot) {
          const idx = parseInt(slot.getAttribute('data-slot-index'), 10);
          if (!isNaN(idx) && idx >= 0 && idx <= 7) this.showPickerForSlot(idx);
        }
      });
    }

    // Hide initially
    this.hide();
    
    // Make sure the container has pointer-events set to auto when visible
    this.container.style.pointerEvents = 'auto';

    // Initialize player skills data structure
    await this.initPlayerSkills();

    // GDD graph view: mount and init
    const graphMount = document.getElementById('skill-tree-graph-mount');
    if (graphMount && this.game) {
      this.graphView = new SkillTreeGraphView(graphMount, this.game, {
        onSelectNode: (nodeId) => this.updateNodeDetailPanel(nodeId),
        onLevelUp: () => {}, // level-up is done via button in detail panel
      });
      this.graphView.init();
    }

    // Render the skill tree (legacy list; kept for possible future use)
    this.renderSkillTree();

    // Initialize with no skill selected
    this.updateNodeDetailPanel(null);

    // Add event listener for save button
    if (this.elements.saveButton) {
      this.elements.saveButton.addEventListener('click', () => {
        this.saveSkillTree();
      });
    }
    if (this.elements.levelUpButton) {
      this.elements.levelUpButton.addEventListener('click', () => this.doGraphLevelUp());
    }

    // Sync skill points from player (GDD)
    this.syncSkillPointsFromPlayer();

    return true;
  }

  /**
   * Sync skill points display from game.player.stats (GDD).
   */
  syncSkillPointsFromPlayer() {
    const stats = this.game?.player?.stats;
    const points = (stats && typeof stats.skillPoints === 'number') ? stats.skillPoints : 0;
    if (this.elements.skillPointsValue) this.elements.skillPointsValue.textContent = points;
    if (this.graphView) this.graphView.refresh();
  }

  /**
   * Update the node detail panel (and Level Up button) when a graph node is selected.
   * Also shows story lore, linked skill stats (damage/mana/range/duration/cooldown),
   * and the variants+buffs configuration panel when a skillRef exists.
   * @param {string|null} nodeId
   */
  updateNodeDetailPanel(nodeId) {
    if (!this.elements.skillDetailName || !this.elements.skillDetailDescription) return;
    if (!this.elements.nodeLevelLine || !this.elements.nodeRequirements || !this.elements.levelUpButton) return;

    // Hide extra panels when nothing is selected
    if (!nodeId) {
      this.elements.skillDetailName.textContent = 'Select a node';
      this.elements.skillDetailDescription.textContent = 'Click a node on the graph to view details and spend skill points.';
      this.elements.nodeLevelLine.textContent = '';
      this.elements.nodeRequirements.textContent = '';
      this.elements.levelUpButton.style.display = 'none';
      this._hideStoryStatsVariants();
      return;
    }

    const node = getSkillTreeNodeById(nodeId);
    const stats = this.game?.player?.stats;
    const questManager = this.game?.questManager;
    const nodeLevels = (stats && stats.skillTreeNodeLevels) ? { ...stats.skillTreeNodeLevels } : {};
    const completedChapterQuestIds = (questManager && questManager.completedChapterQuestIds)
      ? new Set(questManager.completedChapterQuestIds)
      : new Set();
    const currentLevel = nodeLevels[nodeId] ?? 0;

    this.elements.skillDetailName.textContent = node ? node.name : nodeId;
    this.elements.skillDetailDescription.textContent = node ? node.description : '';

    this.elements.nodeLevelLine.textContent = `Level ${currentLevel} / ${node ? node.maxLevel : '?'} • Cost: ${node ? node.costPerLevel : 1} skill point(s) per level`;
    const reqParts = [];
    if (node && (node.requiredLevel ?? 1) > 1) {
      reqParts.push(`Requires level ${node.requiredLevel}`);
    }
    if (node && node.requiredNodes && node.requiredNodes.length) {
      reqParts.push('Requires: ' + node.requiredNodes.map(id => getSkillTreeNodeById(id)?.name || id).join(', '));
    }
    if (node && node.requireChapter5) reqParts.push('Requires: Chapter 5 completed');
    this.elements.nodeRequirements.textContent = reqParts.join(' • ') || '';

    const playerLevel = stats?.level ?? 1;
    const canLevel = node && stats && canLevelSkillTreeNode(node, nodeLevels, completedChapterQuestIds, playerLevel)
      && (stats.skillPoints ?? 0) >= (node.costPerLevel ?? 1);
    this.elements.levelUpButton.style.display = canLevel ? 'block' : 'none';

    // — Story block —
    if (this.elements.skillStoryBlock && this.elements.skillStoryText) {
      if (node && node.story) {
        this.elements.skillStoryText.textContent = node.story;
        this.elements.skillStoryBlock.style.display = 'block';
      } else {
        this.elements.skillStoryBlock.style.display = 'none';
      }
    }

    // — Skill stats block + variants panel —
    const skillName = node?.skillRef || null;
    const skillConfig = skillName ? SKILL_BY_NAME[skillName] : null;

    if (this.elements.skillStatsBlock && this.elements.skillStatsName && this.elements.skillStatsGrid) {
      if (skillConfig) {
        this.elements.skillStatsName.textContent = skillConfig.name;
        this.elements.skillStatsGrid.innerHTML = this._buildStatsGridHTML(skillConfig);
        this.elements.skillStatsBlock.style.display = 'block';
      } else {
        this.elements.skillStatsBlock.style.display = 'none';
      }
    }

    // — Variants + Buffs panel —
    if (this.elements.skillCustomizationContainer) {
      if (skillName && this.skillTrees[skillName]) {
        this.elements.skillCustomizationContainer.style.display = 'flex';
        this.selectSkill(skillName);
      } else {
        this.elements.skillCustomizationContainer.style.display = 'none';
      }
    }
  }

  /** Hide all three extra panels (story, stats, variants). */
  _hideStoryStatsVariants() {
    if (this.elements.skillStoryBlock) this.elements.skillStoryBlock.style.display = 'none';
    if (this.elements.skillStatsBlock) this.elements.skillStatsBlock.style.display = 'none';
    if (this.elements.skillCustomizationContainer) this.elements.skillCustomizationContainer.style.display = 'none';
  }

  /**
   * Build an HTML string for the stat grid from a SkillConfig.
   * @param {import('../config/skills.js').SkillConfig} skill
   * @returns {string}
   */
  _buildStatsGridHTML(skill) {
    const fmt = (v, unit = '') => (v !== undefined && v !== null) ? `${v}${unit}` : '—';
    const rows = [
      { label: 'Damage',   value: fmt(skill.damage), icon: '⚔️', stat: 'damage' },
      { label: 'Mana',     value: fmt(skill.manaCost), icon: '💧', stat: 'mana' },
      { label: 'Cooldown', value: fmt(skill.cooldown, 's'), icon: '⏱️', stat: 'cooldown' },
      { label: 'Range',    value: fmt(skill.range), icon: '📏', stat: 'range' },
      { label: 'Radius',   value: fmt(skill.radius), icon: '🔵', stat: 'radius' },
      { label: 'Duration', value: fmt(skill.duration, 's'), icon: '⌛', stat: 'duration' },
    ];
    if (skill.healing !== undefined) {
      rows.splice(1, 0, { label: 'Healing', value: fmt(skill.healing), icon: '💚', stat: 'healing' });
    }
    return rows.map(r => `
      <div class="skill-stat-item" data-stat="${r.stat || ''}">
        <span class="skill-stat-icon">${r.icon}</span>
        <span class="skill-stat-label">${r.label}</span>
        <span class="skill-stat-value">${r.value}</span>
      </div>`).join('');
  }

  /**
   * Spend one skill point on the currently selected graph node (GDD).
   */
  doGraphLevelUp() {
    const nodeId = this.graphView ? this.graphView.getSelectedNodeId() : null;
    if (!nodeId || !this.game || !this.game.player || !this.game.player.stats) return;
    const questManager = this.game.questManager;
    const completedChapterQuestIds = (questManager && questManager.completedChapterQuestIds)
      ? questManager.completedChapterQuestIds
      : new Set();
    const spent = this.game.player.stats.spendSkillPointOnNode(nodeId, completedChapterQuestIds);
    if (spent) {
      this.syncSkillPointsFromPlayer();
      this.updateNodeDetailPanel(nodeId);
      if (this.game.saveManager && typeof this.game.saveManager.saveGame === 'function') {
        this.game.saveManager.saveGame(false, true).catch(() => {});
      }
      if (this.game.hudManager && typeof this.game.hudManager.showNotification === 'function') {
        this.game.hudManager.showNotification('Skill upgraded!');
      }
    }
  }
  
  /**
   * Initialize DOM element references
   * Stores references to DOM elements defined in index.html
   */
  initDOMElements() {
    // Get references to DOM elements
    this.elements.skillPointsValue = document.getElementById('skill-points-value');
    this.elements.skillTreeSkills = document.getElementById('skill-tree-skills');
    this.elements.skillDetailName = document.getElementById('skill-detail-name');
    this.elements.skillDetailDescription = document.getElementById('skill-detail-description');
    this.elements.skillVariants = document.getElementById('skill-variants');
    this.elements.skillBuffs = document.getElementById('skill-buffs');
    this.elements.saveButton = document.getElementById('skill-tree-save-btn');
    this.elements.nodeDetailPanel = document.getElementById('skill-tree-node-detail');
    this.elements.nodeLevelLine = document.getElementById('skill-node-level-line');
    this.elements.nodeRequirements = document.getElementById('skill-node-requirements');
    this.elements.levelUpButton = document.getElementById('skill-tree-level-up-btn');
    this.elements.slotBar = document.getElementById('skill-tree-slots');
    this.elements.slotPicker = document.getElementById('skill-tree-slot-picker');
    this.elements.slotPickerList = document.getElementById('skill-tree-slot-picker-list');
    this.elements.slotPickerTitle = this.elements.slotPicker?.querySelector('.skill-tree-slot-picker-title');
    this.elements.slotPickerClear = this.elements.slotPicker?.querySelector('.skill-tree-slot-picker-clear');
    this.elements.slotPickerBackdrop = this.elements.slotPicker?.querySelector('.skill-tree-slot-picker-backdrop');
    // Skill story + stats panels (new)
    this.elements.skillStoryBlock = document.getElementById('skill-story-block');
    this.elements.skillStoryText = document.getElementById('skill-story-text');
    this.elements.skillStatsBlock = document.getElementById('skill-stats-block');
    this.elements.skillStatsName = document.getElementById('skill-stats-name');
    this.elements.skillStatsGrid = document.getElementById('skill-stats-grid');
    this.elements.skillCustomizationContainer = document.getElementById('skill-customization-container');
    
    // Create continue button for mobile optimization
    this.elements.continueButton = document.createElement('button');
    this.elements.continueButton.id = 'skill-tree-continue-btn';
    this.elements.continueButton.className = 'skill-tree-nav-btn';
    this.elements.continueButton.textContent = 'Continue to Buffs';
    this.elements.continueButton.style.display = 'none';
    this.elements.continueButton.addEventListener('click', () => this.switchToBuffSelection());
    
    // Create back button for mobile optimization
    this.elements.backButton = document.createElement('button');
    this.elements.backButton.id = 'skill-tree-back-btn';
    this.elements.backButton.className = 'skill-tree-nav-btn';
    this.elements.backButton.textContent = 'Back to Variants';
    this.elements.backButton.style.display = 'none';
    this.elements.backButton.addEventListener('click', () => this.switchToVariantSelection());
    
    // Add buttons to the DOM
    const variantsContainer = document.getElementById('skill-variants-container');
    const buffsContainer = document.getElementById('skill-buffs-container');
    
    // Create instruction elements for variants and buffs
    this.elements.variantsInstruction = document.createElement('div');
    this.elements.variantsInstruction.className = 'skill-tree-instruction';
    this.elements.variantsInstruction.innerHTML = '<p>Select a variant for your skill</p>';
    
    this.elements.buffsInstruction = document.createElement('div');
    this.elements.buffsInstruction.className = 'skill-tree-instruction';
    this.elements.buffsInstruction.innerHTML = '<p>Select buffs for your variant</p>';
    
    if (variantsContainer) {
      // Add instruction and continue button at the top
      variantsContainer.insertBefore(this.elements.variantsInstruction, variantsContainer.firstChild);
      variantsContainer.insertBefore(this.elements.continueButton, variantsContainer.firstChild.nextSibling);
    } else {
      console.error("Variants container not found in the DOM");
    }
    
    if (buffsContainer) {
      // Add instruction and back button at the top
      buffsContainer.insertBefore(this.elements.buffsInstruction, buffsContainer.firstChild);
      buffsContainer.insertBefore(this.elements.backButton, buffsContainer.firstChild.nextSibling);
    } else {
      console.error("Buffs container not found in the DOM");
    }
    
    // Update skill points display
    if (this.elements.skillPointsValue) {
      this.elements.skillPointsValue.textContent = this.skillPoints;
    } else {
      console.error("Skill points value element not found in the DOM");
    }
    
    // Log any missing elements
    Object.entries(this.elements).forEach(([key, element]) => {
      if (!element && key !== 'continueButton' && key !== 'backButton') {
        console.error(`DOM element "${key}" not found in the skill tree UI`);
      }
    });
    
    // Add CSS for mobile optimization
    this.addMobileOptimizationStyles();
  }
  
  /**
   * Add CSS styles for mobile optimization
   */
  addMobileOptimizationStyles() {
    const styleElement = document.createElement('style');
    styleElement.textContent = `
      /* Global styles for skill tree */
      .skill-tree-instruction {
        padding: 10px;
        margin-bottom: 15px;
        background-color: rgba(0, 0, 0, 0.5);
        border-radius: 5px;
        text-align: center;
        font-size: 16px;
        color: #fff;
      }
      
      .skill-tree-nav-btn {
        display: block;
        width: 100%;
        padding: 10px;
        margin: 10px 0 20px 0;
        background-color: #3a3a3a;
        color: white;
        border: 2px solid #555;
        border-radius: 5px;
        font-size: 16px;
        cursor: pointer;
        text-align: center;
      }
      
      .skill-tree-nav-btn:hover {
        background-color: #4a4a4a;
      }
      
      /* Single column layout for variants and buffs */
      .skill-variant, .skill-buff {
        width: 100%;
        margin-bottom: 15px;
        display: block;
        border-radius: 5px;
        overflow: hidden;
      }
      
      .variant-header, .buff-header {
        display: flex;
        align-items: center;
        width: 100%;
        padding: 8px;
      }
      
      .variant-name, .buff-name {
        flex-grow: 1;
        font-size: 16px;
      }
      
      .variant-cost, .buff-cost {
        font-size: 14px;
        white-space: nowrap;
        margin-left: 10px;
      }
      
      .variant-icon, .buff-icon {
        margin-right: 10px;
      }
      
      /* Section titles outside of options */
      .section-title {
        margin-bottom: 15px;
        padding: 5px;
        background-color: rgba(0, 0, 0, 0.3);
        border-radius: 5px;
      }
      
      /* Mobile optimization styles */
      @media (max-width: 1024px), (orientation: landscape) and (max-height: 768px) {
        #skill-variants-container, #skill-buffs-container {
          width: 100%;
          max-width: 100%;
        }
      }
    `;
    document.head.appendChild(styleElement);
  }

  /**
   * Initialize player skills data structure
   */
  async initPlayerSkills() {
    // Create a structure to track player's skill allocations
    this.playerSkills = {};

    // Filter skill trees based on custom skills flag
    const filteredSkillTrees = this.filterCustomSkills(this.skillTrees);

    // Initialize for each skill in the filtered skill trees
    if (filteredSkillTrees) {
      Object.keys(filteredSkillTrees).forEach((skillName) => {
        this.playerSkills[skillName] = {
          activeVariant: null,
          buffs: {},
          points: 0,
        };
      });
    }

    // Also initialize for skills from SKILLS array that might not be in skillTrees (all skills enabled)
    SKILLS.forEach((skill) => {
      if (!this.playerSkills[skill.name]) {
        this.playerSkills[skill.name] = {
          activeVariant: null,
          buffs: {},
          points: 0,
        };
      }
    });
    
    // Load saved skill tree data from storage service if available
    try {
      const savedSkillTreeData = await storageService.loadData(STORAGE_KEYS.SKILL_TREE_DATA);
      if (savedSkillTreeData) {
        console.debug('Loaded skill tree data from storage in SkillTreeUI:', savedSkillTreeData);
        
        // Merge saved data with initialized data structure
        Object.keys(savedSkillTreeData).forEach(skillName => {
          if (this.playerSkills[skillName]) {
            this.playerSkills[skillName] = savedSkillTreeData[skillName];
          }
        });
      }
    } catch (error) {
      console.error('Error loading skill tree data from storage in SkillTreeUI:', error);
    }
  }

  /**
   * Render the skill tree
   */
  renderSkillTree() {
    // Check if the skill tree container exists
    if (!this.elements.skillTreeSkills) {
      console.error("Skill tree skills container not found in the DOM");
      return;
    }

    // Clear the container
    this.elements.skillTreeSkills.innerHTML = "";

    // Create the skill tree structure
    const skillsHtml = [];

    // Filter skills based on custom skills flag
    const filteredSkillTrees = this.filterCustomSkills(this.skillTrees);

    // Add skills from the filtered skill tree
    Object.keys(filteredSkillTrees).forEach((skillName) => {
      const skill = filteredSkillTrees[skillName];
      const iconData = getSkillIcon(skillName);

      // Create the skill node
      const skillNode = `
<div class="skill-node" data-skill="${skillName}">
<div class="skill-icon ${iconData.cssClass}" style="background-color: rgba(0, 0, 0, 0.7); border: 2px solid ${iconData.color}; box-shadow: 0 0 10px ${iconData.color}40;">
${iconData.emoji}
</div>
<div class="skill-info">
  <div class="skill-name">${skillName}</div>
  <div class="skill-description">${this.truncateDescription(skill.baseDescription) || "No description available."}</div>
</div>
</div>
`;

      skillsHtml.push(skillNode);
    });

    // Add the skills to the container
    this.elements.skillTreeSkills.innerHTML = skillsHtml.join("");

    // Add click event to skill nodes
    document.querySelectorAll(".skill-node").forEach((node) => {
      node.addEventListener("click", () => {
        const skillName = node.dataset.skill;
        this.selectSkill(skillName);
      });
    });
  }

  /**
   * Select a skill and show its details
   * @param {string} skillName - Name of the skill to select
   */
  selectSkill(skillName) {
    // Update selected skill
    this.selectedSkill = skillName;

    // Update UI to show the selected skill
    document.querySelectorAll(".skill-node").forEach((node) => {
      node.classList.toggle("selected", node.dataset.skill === skillName);
    });

    // Update skill details
    this.updateSkillDetails(skillName);

    // Reset selection mode to variants first
    this.switchToVariantSelection();
  }
  
  /**
   * Switch to variant selection mode
   */
  switchToVariantSelection() {
    // Set selection mode
    this.selectionMode = 'variants';
    
    // Show variants for the selected skill
    this.showSkillVariants(this.selectedSkill);
    
    // Hide buffs container
    if (this.elements.skillBuffs) {
      const buffsContainer = document.getElementById('skill-buffs-container');
      if (buffsContainer) {
        buffsContainer.style.display = 'none';
      }
    }
    
    // Show variants container
    const variantsContainer = document.getElementById('skill-variants-container');
    if (variantsContainer) {
      variantsContainer.style.display = 'block';
    }
    
    // Show continue button if a variant is selected
    const playerSkillData = this.playerSkills[this.selectedSkill];
    if (playerSkillData && (playerSkillData.activeVariant || playerSkillData.activeVariant === null)) {
      this.elements.continueButton.style.display = 'block';
    } else {
      this.elements.continueButton.style.display = 'none';
    }
    
    // Hide back button
    this.elements.backButton.style.display = 'none';
  }
  
  /**
   * Switch to buff selection mode
   */
  switchToBuffSelection() {
    // Set selection mode
    this.selectionMode = 'buffs';
    
    // Hide variants container
    const variantsContainer = document.getElementById('skill-variants-container');
    if (variantsContainer) {
      variantsContainer.style.display = 'none';
    }
    
    // Show buffs container
    const buffsContainer = document.getElementById('skill-buffs-container');
    if (buffsContainer) {
      buffsContainer.style.display = 'block';
    }
    
    // Show back button
    this.elements.backButton.style.display = 'block';
    
    // Hide continue button
    this.elements.continueButton.style.display = 'none';
    
    // Check if there's an active variant for this skill
    const playerSkillData = this.playerSkills[this.selectedSkill];
    if (playerSkillData && playerSkillData.activeVariant) {
      // Show buffs for the active variant
      this.showVariantBuffs(this.selectedSkill, playerSkillData.activeVariant);
    } else {
      // Show buffs for the base skill
      this.showBaseSkillBuffs(this.selectedSkill);
    }
    
    // Add selected variant info at the top of buffs container
    this.showSelectedVariantInfo();
  }
  
  /**
   * Show selected variant info at the top of buffs container
   */
  showSelectedVariantInfo() {
    const playerSkillData = this.playerSkills[this.selectedSkill];
    if (!playerSkillData) return;
    
    const variantName = playerSkillData.activeVariant || 'base';
    const skillData = this.skillTrees[this.selectedSkill];
    
    if (!skillData) return;
    
    // Create variant info element
    const variantInfoElement = document.createElement('div');
    variantInfoElement.className = 'selected-variant-info';
    
    // Get variant data and icon
    let variantData, iconData;
    if (variantName === 'base') {
      variantData = {
        description: skillData.baseDescription || "No description available."
      };
      iconData = getSkillIcon(this.selectedSkill);
    } else {
      variantData = skillData.variants[variantName];
      iconData = getSkillIcon(variantName);
    }
    
    if (!variantData) return;
    
    // Create HTML for variant info
    variantInfoElement.innerHTML = `
      <div class="selected-variant-header">
        <div class="variant-icon ${iconData.cssClass}" style="background-color: rgba(0, 0, 0, 0.7); border: 2px solid ${iconData.color}; box-shadow: 0 0 10px ${iconData.color}40;">
          ${iconData.emoji}
        </div>
        <div class="variant-name">${variantName === 'base' ? `Base ${this.selectedSkill}` : variantName}</div>
      </div>
      <div class="selected-variant-description">${variantData.description || "No description available."}</div>
    `;
    
    // Add to buffs container
    const buffsContainer = document.getElementById('skill-buffs-container');
    if (buffsContainer) {
      // Remove any existing variant info
      const existingInfo = buffsContainer.querySelector('.selected-variant-info');
      if (existingInfo) {
        existingInfo.remove();
      }
      
      // Insert at the beginning
      buffsContainer.insertBefore(variantInfoElement, buffsContainer.firstChild);
    }
  }

  /**
   * Update the skill details section
   * @param {string} skillName - Name of the skill
   */
  updateSkillDetails(skillName) {
    // Check if the DOM elements exist
    if (!this.elements.skillDetailName || !this.elements.skillDetailDescription) {
      console.error("Skill detail elements not found in the DOM");
      return;
    }

    // Check if we have data for this skill
    if (!this.skillTrees || !this.skillTrees[skillName]) {
      this.elements.skillDetailName.textContent = "Unknown Skill";
      this.elements.skillDetailDescription.textContent =
        "No information available for this skill.";
      return;
    }

    const skillData = this.skillTrees[skillName];

    // Update skill name
    this.elements.skillDetailName.textContent = skillName;

    // Update skill description
    this.elements.skillDetailDescription.textContent =
      skillData.baseDescription || "No description available.";
  }

  /**
   * Show variants for a skill
   * @param {string} skillName - Name of the skill
   */
  showSkillVariants(skillName) {
    // Check if the variants container exists
    if (!this.elements.skillVariants) {
      console.error("Skill variants container not found in the DOM");
      return;
    }

    // Clear container
    this.elements.skillVariants.innerHTML = "";
    
    // If no skill is selected, don't show any variants
    if (!skillName) {
      // Update instruction text
      this.elements.variantsInstruction.innerHTML = '<p>Select a skill from the tree to view its variants</p>';
      // Hide continue button
      this.elements.continueButton.style.display = 'none';
      return;
    }
    
    // Update instruction text for selected skill
    this.elements.variantsInstruction.innerHTML = `<p>Select a variant for your <strong>${skillName}</strong> skill</p>`;

    // Check if we have data for this skill
    if (
      !this.skillTrees ||
      !this.skillTrees[skillName] ||
      !this.skillTrees[skillName].variants
    ) {
      this.elements.skillVariants.innerHTML =
        '<div class="no-variants">No variants available for this skill.</div>';
      return;
    }

    const skillData = this.skillTrees[skillName];
    const playerSkillData = this.playerSkills[skillName];
    const variants = skillData.variants;
    
    // Determine if base skill is active (no variant selected)
    const isBaseSkillActive = playerSkillData && playerSkillData.activeVariant === null;
    
    // Create HTML for variants
    const variantsHtml = [];
    
    // Add base skill as the first option
    const baseSkillIconData = getSkillIcon(skillName);
    const baseSkillHtml = `
      <div class="skill-variant ${isBaseSkillActive ? "active" : ""}" data-variant="base">
        <div class="variant-header">
          <div class="variant-icon ${baseSkillIconData.cssClass}" style="background-color: rgba(0, 0, 0, 0.7); border: 2px solid ${baseSkillIconData.color}; box-shadow: 0 0 10px ${baseSkillIconData.color}40;">
            ${baseSkillIconData.emoji}
          </div>
          <div class="variant-name">Base ${skillName}</div>
          <div class="variant-cost">0 points</div>
        </div>
        <div class="variant-description">${skillData.baseDescription || "No description available."}</div>
        <div class="variant-effects">
          <span class="effect-tag">Base Skill</span>
        </div>
      </div>
    `;
    
    variantsHtml.push(baseSkillHtml);

    // For each variant
    Object.entries(variants).forEach(([variantName, variantData]) => {
      // Determine if this variant is active
      const isActive =
        playerSkillData && playerSkillData.activeVariant === variantName;

      // Get variant cost and requirements
      const cost = variantData.cost || 5;
      const requiredPoints = variantData.requiredPoints || 0;

      // Get icon for the variant
      const iconData = getSkillIcon(variantName);

      // Create the variant element
      const variantHtml = `
        <div class="skill-variant ${isActive ? "active" : ""}" data-variant="${variantName}">
          <div class="variant-header">
            <div class="variant-icon ${iconData.cssClass}" style="background-color: rgba(0, 0, 0, 0.7); border: 2px solid ${iconData.color}; box-shadow: 0 0 10px ${iconData.color}40;">
              ${iconData.emoji}
            </div>
            <div class="variant-name">${variantName}</div>
            <div class="variant-cost">${cost} points</div>
          </div>
          <div class="variant-description">${variantData.description || "No description available."}</div>
          <div class="variant-effects">
            ${
              variantData.effects
                ? variantData.effects
                    .map((effect) => `<span class="effect-tag">${effect}</span>`)
                    .join("")
                : ""
            }
          </div>
        </div>
      `;

      variantsHtml.push(variantHtml);
    });

    // Add the variants to the container
    this.elements.skillVariants.innerHTML = variantsHtml.join("");

    // Add click event to variant containers
    document.querySelectorAll(".skill-variant").forEach((variant) => {
      variant.addEventListener("click", () => {
        const variantName = variant.dataset.variant;
        if (variantName === "base") {
          // Handle base skill selection
          this.selectBaseSkill(skillName);
        } else {
          // Handle variant selection
          this.selectVariant(skillName, variantName);
        }
      });
    });
    
    // Show continue button if a variant is already selected
    if (playerSkillData && (playerSkillData.activeVariant || playerSkillData.activeVariant === null)) {
      this.elements.continueButton.style.display = 'block';
    } else {
      this.elements.continueButton.style.display = 'none';
    }
  }

  /**
   * Unselect all variants for a skill and revert to base skill
   * @param {string} skillName - Name of the skill
   */
  unselectAllVariants(skillName) {
    // Clear all active variants in UI
    document.querySelectorAll(".skill-variant").forEach((variant) => {
      variant.classList.remove("active");
    });

    // We've removed the variant buttons and base skill status from the UI

    // Unselect the variant in data
    if (this.playerSkills[skillName]) {
      this.playerSkills[skillName].activeVariant = null;
      // Clear any selected buffs for this skill
      this.playerSkills[skillName].buffs = {};
    }
    
    // Clear the buffs display
    if (this.elements.skillBuffs) {
      this.elements.skillBuffs.innerHTML = "";
    } else {
      console.error("Skill buffs container not found in the DOM");
    }
    
    // Save to localStorage
    try {
      localStorage.setItem(STORAGE_KEYS.SKILL_TREE_DATA, JSON.stringify(this.playerSkills));
      console.debug('Skill tree data saved to localStorage after unselecting all variants');
    } catch (error) {
      console.error('Error saving skill tree data to localStorage:', error);
    }
    
    // Update the game with the new skills
    if (this.game && this.game.player) {
      // Reload the player skills to apply the changes
      this.game.player.loadSkillTreeData();
      console.debug("Player skills updated after unselecting all variants");
    }
    
    // Update available points display
    this.updateAvailablePoints();
  }

  /**
   * Select the base skill for a skill
   * @param {string} skillName - Name of the skill
   */
  selectBaseSkill(skillName) {
    // Check if base skill is already active
    const isAlreadyActive = 
      this.playerSkills[skillName] && 
      this.playerSkills[skillName].activeVariant === null;
      
    // Clear all active variants first
    document.querySelectorAll(".skill-variant").forEach((variant) => {
      variant.classList.remove("active");
    });
    
    // Mark base skill as active
    const baseSkillElement = document.querySelector(
      `.skill-variant[data-variant="base"]`
    );
    if (baseSkillElement) {
      baseSkillElement.classList.add("active");
    }
    
    // Set the active variant to null (base skill)
    if (this.playerSkills[skillName]) {
      this.playerSkills[skillName].activeVariant = null;
    }
    
    // Show continue button if in variant selection mode
    if (this.selectionMode === 'variants') {
      this.elements.continueButton.style.display = 'block';
    }
    
    // If in buffs mode, update the selected variant info and show buffs
    if (this.selectionMode === 'buffs') {
      this.showSelectedVariantInfo();
      this.showBaseSkillBuffs(skillName);
    }
    
    // Save to localStorage
    try {
      localStorage.setItem(STORAGE_KEYS.SKILL_TREE_DATA, JSON.stringify(this.playerSkills));
      console.debug('Skill tree data saved to localStorage after selecting base skill');
    } catch (error) {
      console.error('Error saving skill tree data to localStorage:', error);
    }
    
    // Update the game with the new skills
    if (this.game && this.game.player) {
      // Reload the player skills to apply the changes
      this.game.player.loadSkillTreeData();
      console.debug("Player skills updated after selecting base skill");
    }
    
    // Update available points display
    this.updateAvailablePoints();
  }
  
  /**
   * Show buffs for the base skill
   * @param {string} skillName - Name of the skill
   */
  showBaseSkillBuffs(skillName) {
    // Check if the buffs container exists
    if (!this.elements.skillBuffs) {
      console.error("Skill buffs container not found in the DOM");
      return;
    }

    // Clear container
    this.elements.skillBuffs.innerHTML = "";
    
    // Update instruction text for base skill
    this.elements.buffsInstruction.innerHTML = `<p>Choose buffs for your <strong>Base ${skillName}</strong> skill</p>`;

    // Check if we have data for this skill and it has buffs
    if (
      !this.skillTrees ||
      !this.skillTrees[skillName] ||
      !this.skillTrees[skillName].buffs
    ) {
      this.elements.skillBuffs.innerHTML =
        '<div class="no-buffs">No buffs available for the base skill.</div>';
      return;
    }

    const skillData = this.skillTrees[skillName];
    const playerSkillData = this.playerSkills[skillName];
    const buffs = skillData.buffs;

    // Create HTML for buffs
    const buffsHtml = [];

    // For each buff
    Object.entries(buffs).forEach(([buffName, buffData]) => {
      // Skip buffs that require specific variants
      if (buffData.requiredVariant && buffData.requiredVariant !== "any") {
        return;
      }
      
      // Determine if this buff is active
      const isActive =
        playerSkillData &&
        playerSkillData.buffs &&
        playerSkillData.buffs[buffName];

      // Get buff cost
      const cost = buffData.cost || 5;

      // Get icon for the buff
      const iconData = getBuffIcon(
        buffData.effects && buffData.effects.length > 0
          ? buffData.effects[0]
          : ""
      );

      // Create the buff element
      const buffHtml = `
        <div class="skill-buff ${isActive ? "active" : ""}" data-buff="${buffName}">
          <div class="buff-header">
            <div class="buff-icon ${iconData.cssClass}" 
                style="background-color: rgba(0, 0, 0, 0.7); 
                        border: 2px solid ${iconData.color}; 
                        box-shadow: 0 0 10px ${iconData.color}40;">
              ${iconData.emoji}
            </div>
            <div class="buff-name">${buffName}</div>
            <div class="buff-cost">${cost} points</div>
          </div>
          <div class="buff-description">
            ${buffData.description || "No description available."}
          </div>
          <div class="buff-effects">
            ${buffData.effects
              ? buffData.effects
                  .map((effect) => `<span class="effect-tag">${effect}</span>`)
                  .join("")
              : ""
            }
          </div>
        </div>
      `;

      buffsHtml.push(buffHtml);
    });

    // If no buffs are available for the base skill
    if (buffsHtml.length === 0) {
      this.elements.skillBuffs.innerHTML =
        '<div class="no-buffs">No buffs available for the base skill.</div>';
      return;
    }

    // Add the buffs to the container
    this.elements.skillBuffs.innerHTML = buffsHtml.join("");

    // Add click event to buff containers
    document.querySelectorAll(".skill-buff").forEach((buffContainer) => {
      buffContainer.addEventListener("click", () => {
        const buffName = buffContainer.dataset.buff;
        this.selectBuff(skillName, buffName);
      });
    });
  }
  
  /**
   * Select or unselect a variant for a skill
   * @param {string} skillName - Name of the skill
   * @param {string} variantName - Name of the variant
   */
  selectVariant(skillName, variantName) {
    // Check if this variant is already active (for toggling)
    const isAlreadyActive = 
      this.playerSkills[skillName] && 
      this.playerSkills[skillName].activeVariant === variantName;

    // Clear all active variants first
    document.querySelectorAll(".skill-variant").forEach((variant) => {
      variant.classList.remove("active");
    });

    // We've removed the variant buttons and base skill status from the UI
    
    // Handle unselection if the variant is already active
    if (isAlreadyActive) {
      // Unselect the variant
      if (this.playerSkills[skillName]) {
        this.playerSkills[skillName].activeVariant = null;
        // Clear any selected buffs for this skill
        this.playerSkills[skillName].buffs = {};
      }
      
      // Clear the buffs display
      if (this.elements.skillBuffs) {
        this.elements.skillBuffs.innerHTML = "";
      }
      
      // Save to localStorage
      try {
        localStorage.setItem(STORAGE_KEYS.SKILL_TREE_DATA, JSON.stringify(this.playerSkills));
        console.debug('Skill tree data saved to localStorage after unselecting variant');
      } catch (error) {
        console.error('Error saving skill tree data to localStorage:', error);
      }
      
      // Update the game with the new skills
      if (this.game && this.game.player) {
        // Reload the player skills to apply the changes
        this.game.player.loadSkillTreeData();
        console.debug("Player skills updated after unselecting variant");
      }
      
      // Update available points display
      this.updateAvailablePoints();
      
      // Show continue button since base variant is selected
      if (this.selectionMode === 'variants') {
        this.elements.continueButton.style.display = 'block';
      }
      
      return;
    }

    // Otherwise, select the new variant
    if (this.playerSkills[skillName]) {
      // If there was a previous variant selected, clear its buffs
      if (this.playerSkills[skillName].activeVariant && this.playerSkills[skillName].activeVariant !== variantName) {
        this.playerSkills[skillName].buffs = {};
      }
      
      this.playerSkills[skillName].activeVariant = variantName;
    }

    // Update UI for the selected variant
    const selectedVariant = document.querySelector(
      `.skill-variant[data-variant="${variantName}"]`
    );
    if (selectedVariant) {
      selectedVariant.classList.add("active");
    }

    // Show continue button if in variant selection mode
    if (this.selectionMode === 'variants') {
      this.elements.continueButton.style.display = 'block';
    }

    // If in buffs mode, update the selected variant info
    if (this.selectionMode === 'buffs') {
      this.showSelectedVariantInfo();
      
      // Show buffs for the selected variant
      this.showVariantBuffs(skillName, variantName);
    }
    
    // Update available points display
    this.updateAvailablePoints();
  }

  /**
   * Show buffs for a variant
   * @param {string} skillName - Name of the skill
   * @param {string} variantName - Name of the variant
   */
  showVariantBuffs(skillName, variantName) {
    // Check if the buffs container exists
    if (!this.elements.skillBuffs) {
      console.error("Skill buffs container not found in the DOM");
      return;
    }

    // Clear container
    this.elements.skillBuffs.innerHTML = "";
    
    // Update instruction text for selected variant
    const displayName = variantName === null ? `Base ${skillName}` : variantName;
    this.elements.buffsInstruction.innerHTML = `<p>Choose buffs for your <strong>${displayName}</strong> variant</p>`;

    // Check if we have data for this skill and variant
    if (
      !this.skillTrees ||
      !this.skillTrees[skillName] ||
      !this.skillTrees[skillName].variants ||
      !this.skillTrees[skillName].variants[variantName]
    ) {
      this.elements.skillBuffs.innerHTML =
        '<div class="no-buffs">No buffs available for this variant.</div>';
      return;
    }

    // Get the skill data and buffs
    const skillData = this.skillTrees[skillName];
    const variantData = this.skillTrees[skillName].variants[variantName];
    
    // Check if there are any buffs for this skill
    if (!skillData.buffs || Object.keys(skillData.buffs).length === 0) {
      this.elements.skillBuffs.innerHTML =
        '<div class="no-buffs">No buffs available for this variant.</div>';
      return;
    }
    const playerSkillData = this.playerSkills[skillName];
    
    // Create HTML for buffs
    const buffsHtml = [];
    
    // Filter buffs that are applicable to this variant
    Object.entries(skillData.buffs).forEach(([buffName, buffData]) => {
      // Check if this buff is applicable to this variant
      const requiredVariant = buffData.requiredVariant || "any";
      if (requiredVariant !== "any" && requiredVariant !== variantName) {
        return; // Skip buffs that don't apply to this variant
      }
      
      // Determine if this buff is active
      const isActive =
        playerSkillData &&
        playerSkillData.buffs &&
        playerSkillData.buffs[buffName];

      // Get buff cost
      const cost = buffData.cost || 5;

      // Get icon for the buff
      const iconData = getBuffIcon(
        buffData.effects && buffData.effects.length > 0
          ? buffData.effects[0]
          : ""
      );

      // Create the buff element
      const buffHtml = `
        <div class="skill-buff ${isActive ? "active" : ""}" data-buff="${buffName}">
          <div class="buff-header">
            <div class="buff-icon ${iconData.cssClass}" 
                style="background-color: rgba(0, 0, 0, 0.7); 
                        border: 2px solid ${iconData.color}; 
                        box-shadow: 0 0 10px ${iconData.color}40;">
              ${iconData.emoji}
            </div>
            <div class="buff-name">${buffName}</div>
            <div class="buff-cost">${cost} points</div>
          </div>
          <div class="buff-description">
            ${buffData.description || "No description available."}
          </div>
          <div class="buff-effects">
            ${buffData.effects
              ? buffData.effects
                  .map((effect) => `<span class="effect-tag">${effect}</span>`)
                  .join("")
              : ""
            }
          </div>
        </div>
      `;

      buffsHtml.push(buffHtml);
    });

    // Add the buffs to the container
    this.elements.skillBuffs.innerHTML = buffsHtml.join("");

    // Add click event to buff containers
    document.querySelectorAll(".skill-buff").forEach((buffContainer) => {
      buffContainer.addEventListener("click", () => {
        const buffName = buffContainer.dataset.buff;
        this.selectBuff(skillName, buffName);
      });
    });
  }

  /**
   * Select a buff for a skill
   * @param {string} skillName - Name of the skill
   * @param {string} buffName - Name of the buff
   */
  selectBuff(skillName, buffName) {
    // Update player skills data
    if (this.playerSkills[skillName]) {
      if (!this.playerSkills[skillName].buffs) {
        this.playerSkills[skillName].buffs = {};
      }
      
      // Toggle buff selection
      const isAlreadyActive = this.playerSkills[skillName].buffs[buffName];
      
      if (isAlreadyActive) {
        // Unselect the buff
        delete this.playerSkills[skillName].buffs[buffName];
        
        // Update UI
        const selectedBuff = document.querySelector(
          `.skill-buff[data-buff="${buffName}"]`
        );
        if (selectedBuff) {
          selectedBuff.classList.remove("active");
        }
        
        // Update button
        const button = document.querySelector(
          `.buff-select-btn[data-buff="${buffName}"]`
        );
        if (button) {
          button.disabled = false;
          button.textContent = "Select Buff";
        }
      } else {
        // Select the buff
        this.playerSkills[skillName].buffs[buffName] = true;
        
        // Update UI
        const selectedBuff = document.querySelector(
          `.skill-buff[data-buff="${buffName}"]`
        );
        if (selectedBuff) {
          selectedBuff.classList.add("active");
        }
        
        // Update button
        const button = document.querySelector(
          `.buff-select-btn[data-buff="${buffName}"]`
        );
        if (button) {
          button.disabled = true;
          button.textContent = "Selected";
        }
      }
      
      // Update available points display
      this.updateAvailablePoints();
    }
  }

  /**
   * Truncate a description to a maximum length and add ellipsis
   * @param {string} description - The description to truncate
   * @param {number} maxLength - Maximum length before truncation (default: 60)
   * @returns {string} - Truncated description with ellipsis if needed
   */
  truncateDescription(description, maxLength = 60) {
    if (!description) return "";
    
    if (description.length <= maxLength) {
      return description;
    }
    
    return description.substring(0, maxLength) + "...";
  }
  
  /**
   * Save the skill tree configuration
   * This method will save the player's skill selections and close the skill tree
   */
  async saveSkillTree() {
    // Calculate total points spent
    let totalPointsSpent = 0;
    
    // Count points spent on variants and buffs
    Object.values(this.playerSkills).forEach(skill => {
      if (skill.activeVariant) {
        // Get the variant cost
        const variantCost = this.getVariantCost(skill.activeVariant);
        totalPointsSpent += variantCost;
        
        // Add costs of selected buffs
        if (skill.buffs) {
          Object.keys(skill.buffs).forEach(buffName => {
            if (skill.buffs[buffName]) {
              const buffCost = this.getBuffCost(skill.activeVariant, buffName);
              totalPointsSpent += buffCost;
            }
          });
        }
      }
    });
    
    // Check if player has enough points
    const remainingPoints = this.skillPoints - totalPointsSpent;
    if (remainingPoints < 0) {
      // Show error message - not enough points
      this.game && this.game.hudManager.showNotification("You don't have enough skill points! Please remove some skills or buffs.");
      return;
    }
    
    // Save the configuration to storage service
    console.debug("Saving skill tree configuration:", this.playerSkills);
    
    try {
      const success = await storageService.saveData(STORAGE_KEYS.SKILL_TREE_DATA, this.playerSkills);
      if (success) {
        console.debug('Skill tree data saved successfully');
      } else {
        throw new Error('Storage service returned false');
      }
    } catch (error) {
      console.error('Error saving skill tree data:', error);
      // Show error notification
      if (this.game && this.game.hudManager) {
        this.game.hudManager.showNotification('Failed to save skill tree data. Please try again.');
        return;
      }
    }
    
    // Update the game with the new skills (variants/buffs)
    if (this.game && this.game.player) {
      this.game.player.loadSkillTreeData();
      console.debug("Player skills updated with new variants");
    }
    // Persist 8-slot selection and refresh battle bar
    this.saveSlotSelection();
    // Show success message
    this.game && this.game.hudManager.showNotification("Skill tree saved successfully!");
    // Close the skill tree
    this.hide();
    this.game.resume(false);
  }
  
  /**
   * Get the cost of a variant
   * @param {string} variantName - Name of the variant
   * @returns {number} - Cost of the variant
   */
  getVariantCost(variantName) {
    // Search for the variant in all skills
    for (const skillName in this.skillTrees) {
      const skill = this.skillTrees[skillName];
      if (skill.variants && skill.variants[variantName]) {
        return skill.variants[variantName].cost || 5; // Default cost is 5
      }
    }
    return 5; // Default cost if not found
  }
  
  /**
   * Get the cost of a buff
   * @param {string} variantName - Name of the variant
   * @param {string} buffName - Name of the buff
   * @returns {number} - Cost of the buff
   */
  getBuffCost(variantName, buffName) {
    // Search for the buff in all skills
    for (const skillName in this.skillTrees) {
      const skill = this.skillTrees[skillName];
      if (skill.variants && 
          skill.variants[variantName] && 
          skill.variants[variantName].buffs && 
          skill.variants[variantName].buffs[buffName]) {
        return skill.variants[variantName].buffs[buffName].cost || 3; // Default cost is 3
      }
    }
    return 3; // Default cost if not found
  }
  
  /**
   * Update the available points display
   * Calculates points spent and updates the UI
   */
  updateAvailablePoints() {
    // Check if the points element exists
    if (!this.elements.skillPointsValue) {
      console.error("Skill points value element not found in the DOM");
      return;
    }
    
    // Calculate total points spent
    let totalPointsSpent = 0;
    
    // Count points spent on variants and buffs
    Object.values(this.playerSkills).forEach(skill => {
      if (skill.activeVariant) {
        // Get the variant cost
        const variantCost = this.getVariantCost(skill.activeVariant);
        totalPointsSpent += variantCost;
        
        // Add costs of selected buffs
        if (skill.buffs) {
          Object.keys(skill.buffs).forEach(buffName => {
            if (skill.buffs[buffName]) {
              const buffCost = this.getBuffCost(skill.activeVariant, buffName);
              totalPointsSpent += buffCost;
            }
          });
        }
      }
    });
    
    // Calculate remaining points
    const remainingPoints = this.skillPoints - totalPointsSpent;
    
    // Update the UI
    this.elements.skillPointsValue.textContent = remainingPoints;
    
    // Add visual indicator if points are low or negative
    if (remainingPoints < 0) {
      this.elements.skillPointsValue.style.color = "#ff3333"; // Red for negative
    } else if (remainingPoints < 5) {
      this.elements.skillPointsValue.style.color = "#ffaa33"; // Orange for low
    } else {
      this.elements.skillPointsValue.style.color = "var(--theme-gold)"; // Default theme gold
    }
  }
}
