/**
 * HUDGuide.js - Step-by-step HUD introduction overlay
 * Guides users through all UI elements: top-left, top-right, bottom-left, bottom-right, minimap
 * Adapted from game-gof/src/ui/guide.js
 */

function isTouchDevice() {
  return (
    'ontouchstart' in window ||
    navigator.maxTouchPoints > 0 ||
    navigator.msMaxTouchPoints > 0
  );
}

/**
 * Start the HUD instruction guide overlay
 */
export function startHUDGuide() {
  if (typeof document === 'undefined') return;
  if (window.__guideState && window.__guideState.active) return;

  const steps = [
    {
      key: 'playerStats',
      get el() {
        return document.getElementById('player-stats-container');
      },
      title: 'Player Stats (Top-Left)',
      desc: 'View your health, mana, experience, and level. Keep an eye on these bars during combat.',
    },
    {
      key: 'questLog',
      get el() {
        return document.getElementById('quest-log');
      },
      title: 'Quest Log',
      desc: 'Track your active quests and objectives here.',
    },
    {
      key: 'mapSelector',
      get el() {
        return document.getElementById('map-selector-button');
      },
      title: 'Map Selector',
      desc: 'Choose and load different maps to explore. Pick procedural or pre-made worlds.',
    },
    {
      key: 'inventory',
      get el() {
        return document.getElementById('inventory-button');
      },
      title: 'Inventory',
      desc: 'Manage your equipment and items. Equip gear to boost your stats.',
    },
    {
      key: 'skillTree',
      get el() {
        return document.getElementById('skill-tree-button');
      },
      title: 'Skill Tree',
      desc: 'Spend skill points to unlock and upgrade your monk abilities.',
    },
    {
      key: 'skillSelection',
      get el() {
        return document.getElementById('skill-selection-button');
      },
      title: 'Skill Selection',
      desc: 'Choose which skills to use in battle. Configure your loadout.',
    },
    {
      key: 'home',
      get el() {
        return document.getElementById('home-button');
      },
      title: 'Game Menu',
      desc: 'Access game menu, multiplayer, and settings.',
    },
    {
      key: 'minimap',
      get el() {
        return document.getElementById('mini-map');
      },
      title: 'Mini Map',
      desc: 'See your surroundings at a glance. Use +/− to zoom, ⌖ to center on your position.',
    },
    {
      key: 'camera',
      get el() {
        return document.getElementById('camera-control-button') || document.getElementById('camera-controls');
      },
      title: 'Camera Toggle (Bottom-Right)',
      desc: 'Switch between orbit (third-person) and free camera modes.',
    },
    {
      key: 'firstPerson',
      get el() {
        return document.getElementById('camera-mode-button');
      },
      title: 'First Person View',
      desc: 'Tap the eye button to enter first-person view. Tap again to return to orbit camera.',
    },
    {
      key: 'teleport',
      get el() {
        return (
          document.getElementById('teleport-button-slot') ||
          document.getElementById('inventory-teleport') ||
          document.getElementById('portal-button')
        );
      },
      title: 'Teleport',
      desc: 'Teleport to origin, or use the portal when near one to travel to another location.',
    },
    {
      key: 'joystick',
      get el() {
        return (
          document.getElementById('virtual-joystick-container') ||
          document.getElementById('joystick-interaction-overlay')
        );
      },
      title: 'Joystick & Jump (Bottom-Left)',
      desc: 'Drag to move your character. Tap the 🚀 button or press Space to jump (up to 3 times). On desktop, use WASD to move.',
    },
    {
      key: 'skills',
      get el() {
        return document.getElementById('skills-container');
      },
      title: 'Skills (Bottom-Right)',
      desc: 'Tap skills to use them in combat. Cooldowns show on each skill.',
    },
  ].filter((s) => s.el);

  if (!steps.length) return;

  const overlay = document.getElementById('guideOverlayRoot');
  if (!overlay) return;
  try {
    overlay.classList.remove('hidden');
  } catch (_) {}

  const blocker = overlay.querySelector('.guide-blocker');
  const focus = overlay.querySelector('.guide-focus');
  const hand = overlay.querySelector('.guide-hand');
  const tip = overlay.querySelector('.guide-tooltip');
  const tipTitle = overlay.querySelector('.guide-tooltip-title');
  const tipBody = overlay.querySelector('.guide-tooltip-body');
  const tipClose = overlay.querySelector('.guide-close');
  const btnPrev = document.getElementById('guidePrev') || overlay.querySelector('.guide-nav .secondary');
  const btnNext = document.getElementById('guideNext') || overlay.querySelector('.guide-nav .primary');

  function clamp(v, min, max) {
    return Math.max(min, Math.min(max, v));
  }

  function positionFor(el, pad = 10) {
    const r = el.getBoundingClientRect();
    const rect = {
      left: r.left - pad,
      top: r.top - pad,
      width: r.width + pad * 2,
      height: r.height + pad * 2,
    };
    rect.right = rect.left + rect.width;
    rect.bottom = rect.top + rect.height;
    return rect;
  }

  function placeFocus(rect) {
    focus.style.left = rect.left + 'px';
    focus.style.top = rect.top + 'px';
    focus.style.width = rect.width + 'px';
    focus.style.height = rect.height + 'px';
  }

  function placeHand(rect) {
    const hx = rect.right - 8;
    const hy = rect.bottom + 6;
    hand.style.left = hx + 'px';
    hand.style.top = hy + 'px';
  }

  function placeTip(rect) {
    const margin = 8;
    let tx = rect.left;
    let ty = rect.bottom + margin;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    tip.style.maxWidth = '320px';
    tip.style.visibility = 'hidden';
    tip.style.left = '0px';
    tip.style.top = '-9999px';
    tip.style.display = 'block';
    const tb = tip.getBoundingClientRect();
    const tw = tb.width || 280;
    const th = tb.height || 120;

    if (ty + th > vh - 12) {
      ty = rect.top - th - margin;
    }
    tx = clamp(tx, 12, vw - tw - 12);
    ty = clamp(ty, 12, vh - th - 12);

    tip.style.left = tx + 'px';
    tip.style.top = ty + 'px';
    tip.style.visibility = 'visible';
  }

  function setStep(idx) {
    window.__guideState.index = idx;
    const s = steps[idx];
    if (!s || !s.el) return;
    try {
      s.el.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
    } catch (_) {}
    const rect = positionFor(s.el, 10);
    placeFocus(rect);
    placeHand(rect);

    tipTitle.textContent = s.title || '';
    tipBody.textContent = s.desc || '';

    placeTip(rect);

    btnPrev.disabled = idx === 0;
    btnPrev.textContent = 'Previous';
    btnNext.textContent = idx === steps.length - 1 ? 'Done' : 'Next';
  }

  function onNext() {
    if (window.__guideState.index >= steps.length - 1) {
      close();
      return;
    }
    setStep(window.__guideState.index + 1);
  }

  function onPrev() {
    if (window.__guideState.index <= 0) return;
    setStep(window.__guideState.index - 1);
  }

  function onResize() {
    const s = steps[window.__guideState.index];
    if (!s || !s.el) return;
    const rect = positionFor(s.el, 10);
    placeFocus(rect);
    placeHand(rect);
    placeTip(rect);
  }

  function close() {
    if (!window.__guideState || !window.__guideState.active) return;
    window.__guideState.active = false;
    btnPrev.removeEventListener('click', onPrev);
    btnNext.removeEventListener('click', onNext);
    tipClose.removeEventListener('click', close);
    window.removeEventListener('resize', onResize);
    window.removeEventListener('orientationchange', onResize);
    try {
      overlay.classList.add('hidden');
    } catch (_) {}
    window.__guideState = null;
  }

  btnPrev.addEventListener('click', onPrev);
  btnNext.addEventListener('click', onNext);
  tipClose.addEventListener('click', close);
  blocker.addEventListener('click', () => {});
  window.addEventListener('resize', onResize);
  window.addEventListener('orientationchange', onResize);

  window.__guideState = { active: true, index: 0, steps, overlay, focus, hand, tip };
  setStep(0);

  try {
    window.__guideClose = close;
  } catch (_) {}
}

// Delegated click: start guide when info button is clicked
document.addEventListener('click', (ev) => {
  const t = ev.target;
  if (t && t.id === 'hud-guide-button') {
    ev.preventDefault();
    ev.stopPropagation();
    startHUDGuide();
  }
});
