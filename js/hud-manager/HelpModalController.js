/**
 * HelpModalController.js
 * Opens the "How to Play" modal when the Info (hud-guide) button is clicked.
 * First screen shows all help info in one view; Next starts the HUD button tour (HUDGuide steps).
 * Controls section is different for mobile vs desktop.
 */

import { startHUDGuide } from './HUDGuide.js';

function isDesktop() {
  return typeof window !== 'undefined' && window.matchMedia('(hover: hover) and (pointer: fine)').matches;
}

/** Single combined "How to Play" page; Next then launches the button-by-button Info steps. */
function getHelpPages() {
  const mobile = !isDesktop();
  const controlsContent = mobile
    ? [
        '<p class="help-control-line">🕹️ <strong>Joystick</strong> — Move.</p>',
        '<p class="help-control-line">👆 <strong>Touch</strong> — Use skills.</p>',
        '<p class="help-control-line">👀 <strong>Drag</strong> — Change view.</p>',
      ].join('')
    : [
        '<p class="help-control-line">⌨️ <strong>WASD</strong> — Move.</p>',
        '<p class="help-control-line">🖱️ <strong>Drag mouse</strong> — Change view.</p>',
        '<p class="help-control-line">🔢 <strong>Number keys</strong> — Use skills.</p>',
        '<p class="help-control-line">👆 <strong>Click</strong> — Select.</p>',
      ].join('');

  const html =
    '<p class="help-intro">A peaceful monk travels a fragmented world, facing inner struggles—anger, fear, greed, loneliness—to restore harmony and find peace.</p>' +
    '<h3>Controls</h3>' +
    controlsContent +
    '<h3>Quests</h3>' +
    '<p>Accept the <strong>story quest</strong> when it is offered at the start of a new or loaded game. You can also find <strong>interactive objects</strong> in the world that give quests.</p>' +
    '<h3>Quest log</h3>' +
    '<p>The <strong>quest log</strong> on the left shows your current objectives. Complete them, then face the <strong>chapter boss</strong>. Sometimes the path offers more than one way; your choices still lead to the lesson.</p>' +
    '<h3>After each chapter</h3>' +
    '<p>Defeat the chapter boss, then read the <strong>life lesson</strong> and tap <strong>Continue Journey</strong> to move on.</p>';

  return [{ title: 'How to Play', html }];
}

let currentPageIndex = 0;
let pages = [];

function showPage(index) {
  const content = document.getElementById('help-modal-content');
  const titleEl = document.querySelector('#help-modal .help-modal-title');
  const nextBtn = document.getElementById('help-modal-next-btn');
  if (!content || !pages.length) return;
  currentPageIndex = Math.max(0, Math.min(index, pages.length - 1));
  const page = pages[currentPageIndex];
  if (titleEl) titleEl.textContent = page.title;
  if (content) content.innerHTML = page.html;
  if (nextBtn) nextBtn.textContent = currentPageIndex === pages.length - 1 ? 'Show me the buttons' : 'Next';
}

function openHelpModal() {
  pages = getHelpPages();
  currentPageIndex = 0;
  showPage(0);
  const el = document.getElementById('help-modal');
  if (el) el.style.display = 'flex';
}

function closeHelpModal() {
  const el = document.getElementById('help-modal');
  if (el) el.style.display = 'none';
}

function onNext() {
  if (currentPageIndex >= pages.length - 1) {
    closeHelpModal();
    startHUDGuide();
    return;
  }
  showPage(currentPageIndex + 1);
}

function initHelpModal() {
  const nextBtn = document.getElementById('help-modal-next-btn');
  const closeBtn = document.getElementById('help-modal-close-btn');
  const backdrop = document.querySelector('#help-modal .help-modal-backdrop');
  if (nextBtn) nextBtn.addEventListener('click', onNext);
  if (closeBtn) closeBtn.addEventListener('click', closeHelpModal);
  if (backdrop) backdrop.addEventListener('click', closeHelpModal);
}

function init() {
  initHelpModal();
  document.addEventListener('click', (ev) => {
    if (ev.target && ev.target.id === 'hud-guide-button') {
      ev.preventDefault();
      ev.stopPropagation();
      openHelpModal();
    }
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

export { openHelpModal, closeHelpModal, getHelpPages };
