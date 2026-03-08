/**
 * GDD skill tree graph view: zoomable, pannable canvas with circular nodes and edges.
 * Consumes skill-tree-graph.js; reads node levels and skill points from PlayerStats,
 * completedChapterQuestIds from QuestManager.
 */

import {
    SKILL_TREE_PATHS,
    SKILL_TREE_PATH_ORDER,
    getSkillTreeNodeById,
    isSkillTreeNodeUnlocked,
    canLevelSkillTreeNode,
} from '../config/skill-tree-graph.js';

const NODE_RADIUS = 24;
const HORIZONTAL_GAP = 56;
const VERTICAL_GAP = 56;
const PATH_COLUMNS = [SKILL_TREE_PATHS.BODY, SKILL_TREE_PATHS.MIND, SKILL_TREE_PATHS.HARMONY];

/**
 * @param {string} path
 * @returns {{ x: number, y: number }[]}
 */
function getPathPositions(path) {
    const order = SKILL_TREE_PATH_ORDER[path];
    if (!order || !order.length) return [];
    const col = PATH_COLUMNS.indexOf(path);
    const baseX = (col + 0.5) * HORIZONTAL_GAP + NODE_RADIUS;
    return order.map((_, row) => ({
        x: baseX,
        y: (row + 0.5) * VERTICAL_GAP + NODE_RADIUS,
    }));
}

/**
 * Compute bounding box for all nodes
 */
function getGraphBounds() {
    let maxX = 0, maxY = 0;
    PATH_COLUMNS.forEach(path => {
        const order = SKILL_TREE_PATH_ORDER[path];
        if (order && order.length) {
            const col = PATH_COLUMNS.indexOf(path);
            const x = (col + 1) * HORIZONTAL_GAP + NODE_RADIUS * 2;
            const y = order.length * VERTICAL_GAP + NODE_RADIUS * 2;
            maxX = Math.max(maxX, x);
            maxY = Math.max(maxY, y);
        }
    });
    return { width: maxX + 24, height: maxY + 24 };
}

export class SkillTreeGraphView {
    /**
     * @param {HTMLElement} container - Parent element (e.g. #skill-tree-view)
     * @param {import('../game/Game.js').Game} game
     * @param {{ onSelectNode: (nodeId: string|null) => void, onLevelUp: (nodeId: string) => void }} callbacks
     */
    constructor(container, game, callbacks = {}) {
        this.container = container;
        this.game = game;
        this.onSelectNode = callbacks.onSelectNode || (() => {});
        this.onLevelUp = callbacks.onLevelUp || (() => {});

        this.selectedNodeId = null;
        this.pan = { x: 0, y: 0 };
        this.scale = 0.7; // Start zoomed out to show full tree
        this.isDragging = false;
        this.lastPointer = { x: 0, y: 0 };
        this.tooltipEl = null;
        this.nodePositions = {}; // nodeId -> { x, y }

        this.wrapper = null;
        this.transformEl = null;
        this.svgEl = null;
        this.nodesEl = null;
    }

    /**
     * Get current node levels and completed chapter IDs from game
     */
    getState() {
        const stats = this.game?.player?.stats;
        const questManager = this.game?.questManager;
        const nodeLevels = (stats && stats.skillTreeNodeLevels) ? { ...stats.skillTreeNodeLevels } : {};
        const completedChapterQuestIds = (questManager && questManager.completedChapterQuestIds)
            ? new Set(questManager.completedChapterQuestIds)
            : new Set();
        const skillPoints = (stats && typeof stats.skillPoints === 'number') ? stats.skillPoints : 0;
        const playerLevel = (stats && typeof stats.level === 'number') ? stats.level : 1;
        return { nodeLevels, completedChapterQuestIds, skillPoints, playerLevel };
    }

    init() {
        this.container.innerHTML = '';
        this.container.classList.add('skill-tree-graph-container');

        const bounds = getGraphBounds();
        this.wrapper = document.createElement('div');
        this.wrapper.className = 'skill-tree-graph-wrapper';
        this.wrapper.setAttribute('tabindex', '0');

        this.transformEl = document.createElement('div');
        this.transformEl.className = 'skill-tree-graph-transform';
        this.transformEl.style.width = bounds.width + 'px';
        this.transformEl.style.height = bounds.height + 'px';

        // SVG for edges (behind nodes)
        this.svgEl = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        this.svgEl.setAttribute('class', 'skill-tree-graph-edges');
        this.svgEl.setAttribute('width', '100%');
        this.svgEl.setAttribute('height', '100%');
        this.svgEl.setAttribute('viewBox', `0 0 ${bounds.width} ${bounds.height}`);

        this.nodesEl = document.createElement('div');
        this.nodesEl.className = 'skill-tree-graph-nodes';

        this.transformEl.appendChild(this.svgEl);
        this.transformEl.appendChild(this.nodesEl);
        this.wrapper.appendChild(this.transformEl);
        this.container.appendChild(this.wrapper);

        this.tooltipEl = document.createElement('div');
        this.tooltipEl.className = 'skill-tree-graph-tooltip';
        this.tooltipEl.setAttribute('aria-hidden', 'true');
        this.container.appendChild(this.tooltipEl);

        this.renderEdges();
        this.renderNodes();
        this.applyTransform();
        this.attachPointerEvents();
    }

    renderEdges() {
        const bounds = getGraphBounds();
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        let d = '';
        PATH_COLUMNS.forEach(pathKey => {
            const order = SKILL_TREE_PATH_ORDER[pathKey];
            if (!order || order.length < 2) return;
            const positions = getPathPositions(pathKey);
            for (let i = 0; i < order.length - 1; i++) {
                const a = positions[i];
                const b = positions[i + 1];
                if (a && b) d += `M ${a.x} ${a.y} L ${b.x} ${b.y} `;
            }
        });
        path.setAttribute('d', d.trim());
        path.setAttribute('fill', 'none');
        path.setAttribute('stroke', 'rgba(255, 204, 0, 0.4)');
        path.setAttribute('stroke-width', '2');
        this.svgEl.innerHTML = '';
        this.svgEl.appendChild(path);
    }

    renderNodes() {
        const { nodeLevels, completedChapterQuestIds, playerLevel } = this.getState();
        this.nodePositions = {};
        this.nodesEl.innerHTML = '';

        PATH_COLUMNS.forEach(pathKey => {
            const order = SKILL_TREE_PATH_ORDER[pathKey];
            if (!order) return;
            const positions = getPathPositions(pathKey);
            order.forEach((nodeId, idx) => {
                const node = getSkillTreeNodeById(nodeId);
                const pos = positions[idx];
                if (!node || !pos) return;
                this.nodePositions[nodeId] = pos;

                const unlocked = isSkillTreeNodeUnlocked(node, nodeLevels, completedChapterQuestIds, playerLevel);
                const canLevel = canLevelSkillTreeNode(node, nodeLevels, completedChapterQuestIds, playerLevel);
                const currentLevel = nodeLevels[nodeId] ?? 0;
                const isMaxed = currentLevel >= node.maxLevel;
                const isLocked = !unlocked;

                const div = document.createElement('div');
                div.className = 'skill-tree-graph-node';
                if (isLocked) div.classList.add('locked');
                else if (canLevel) div.classList.add('unlockable');
                else if (isMaxed) div.classList.add('maxed');
                div.dataset.nodeId = nodeId;
                div.style.left = (pos.x - NODE_RADIUS) + 'px';
                div.style.top = (pos.y - NODE_RADIUS) + 'px';
                div.style.width = (NODE_RADIUS * 2) + 'px';
                div.style.height = (NODE_RADIUS * 2) + 'px';

                const icon = document.createElement('span');
                icon.className = 'skill-tree-graph-node-icon';
                icon.textContent = node.icon || '?';
                div.appendChild(icon);

                const levelBadge = document.createElement('span');
                levelBadge.className = 'skill-tree-graph-node-level';
                levelBadge.textContent = currentLevel + '/' + node.maxLevel;
                div.appendChild(levelBadge);

                const title = this.buildNodeTooltip(node, currentLevel, isLocked, canLevel, isMaxed);

                div.addEventListener('mouseenter', (e) => this.showTooltip(e, title, div));
                div.addEventListener('mouseleave', () => this.hideTooltip());
                div.addEventListener('click', () => {
                    this.hideTooltip();
                    this.selectedNodeId = nodeId;
                    this.updateSelectionStyles();
                    this.onSelectNode(nodeId);
                });

                this.nodesEl.appendChild(div);
            });
        });
    }

    buildNodeTooltip(node, currentLevel, isLocked, canLevel, isMaxed) {
        const lines = [
            node.name,
            node.description,
            `Level ${currentLevel}/${node.maxLevel}`,
            `Cost: ${node.costPerLevel} skill point(s) per level`,
        ];
        if ((node.requiredLevel ?? 1) > 1) lines.push(`Requires level ${node.requiredLevel}`);
        if (node.requiredNodes && node.requiredNodes.length) {
            const names = node.requiredNodes.map(id => getSkillTreeNodeById(id)?.name || id).join(', ');
            lines.push(`Requires: ${names}`);
        }
        if (node.requireChapter5) lines.push('Requires: Chapter 5 completed');
        if (isLocked) lines.push('(Locked)');
        else if (canLevel) lines.push('(Click to level up in detail panel)');
        else if (isMaxed) lines.push('(Maxed)');
        return lines.join('\n');
    }

    showTooltip(ev, text, anchor) {
        if (!this.tooltipEl) return;
        const lines = text.split('\n');
        this.tooltipEl.innerHTML = lines.map((line, i) =>
            i === 0
                ? `<div style="font-weight:bold;color:#ffcc00;margin-bottom:4px">${line}</div>`
                : `<div>${line}</div>`
        ).join('');
        this.tooltipEl.style.display = 'block';
        
        const rect = anchor.getBoundingClientRect();
        const containerRect = this.container.getBoundingClientRect();
        const tooltipWidth = 240; // max-width from CSS
        
        // Calculate initial position (centered above node)
        let left = rect.left - containerRect.left + rect.width / 2 - tooltipWidth / 2;
        let top = rect.top - containerRect.top - 8;
        
        // Prevent tooltip from going off left edge
        if (left < 8) left = 8;
        
        // Prevent tooltip from going off right edge
        const maxLeft = containerRect.width - tooltipWidth - 8;
        if (left > maxLeft) left = maxLeft;
        
        // If tooltip would go off top, show it below the node instead
        if (top < 8) {
            top = rect.bottom - containerRect.top + 8;
        }
        
        this.tooltipEl.style.left = left + 'px';
        this.tooltipEl.style.top = top + 'px';
        this.tooltipEl.style.transform = 'none'; // Remove any transform
    }

    hideTooltip() {
        if (this.tooltipEl) this.tooltipEl.style.display = 'none';
    }

    updateSelectionStyles() {
        this.nodesEl.querySelectorAll('.skill-tree-graph-node').forEach(el => {
            el.classList.toggle('selected', el.dataset.nodeId === this.selectedNodeId);
        });
    }

    applyTransform() {
        if (!this.transformEl) return;
        this.transformEl.style.transform = `translate(${this.pan.x}px, ${this.pan.y}px) scale(${this.scale})`;
    }

    attachPointerEvents() {
        if (!this.wrapper) return;
        const onDown = (e) => {
            if (e.button !== 0) return;
            this.isDragging = true;
            this.lastPointer = { x: e.clientX, y: e.clientY };
        };
        const onMove = (e) => {
            if (!this.isDragging) return;
            this.pan.x += e.clientX - this.lastPointer.x;
            this.pan.y += e.clientY - this.lastPointer.y;
            this.lastPointer = { x: e.clientX, y: e.clientY };
            this.applyTransform();
        };
        const onUp = () => { this.isDragging = false; };
        const onWheel = (e) => {
            e.preventDefault();
            const delta = e.deltaY > 0 ? -0.1 : 0.1;
            this.scale = Math.max(0.4, Math.min(2, this.scale + delta));
            this.applyTransform();
        };

        this.wrapper.addEventListener('mousedown', onDown);
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
        this.wrapper.addEventListener('wheel', onWheel, { passive: false });
    }

    refresh() {
        this.renderNodes();
        this.updateSelectionStyles();
    }

    getSelectedNodeId() {
        return this.selectedNodeId;
    }

    setSelectedNodeId(id) {
        this.selectedNodeId = id;
        this.updateSelectionStyles();
    }
}
