import { el, clear } from './dom.js';
import { getCategory } from '../data/categories.js';
import { iconEl } from './icons.js';

/**
 * "Phrase of the moment" — a small, non-blocking pick that changes with the
 * day and the time of day. Deliberately a toast, not a screen.
 */
const SLOTS = 4; // night / morning / afternoon / evening

function slotIndex(date = new Date()) {
  const h = date.getHours();
  if (h < 6) return 0;
  if (h < 12) return 1;
  if (h < 18) return 2;
  return 3;
}

function seededPick(list, seed) {
  if (!list.length) return null;
  let x = seed % 2147483647;
  if (x <= 0) x += 2147483646;
  x = (x * 16807) % 2147483647;
  return list[x % list.length];
}

export function pickOfTheMoment(phrases, date = new Date()) {
  const dayKey = Math.floor(date.getTime() / 86400000);
  return seededPick(phrases, dayKey * SLOTS + slotIndex(date) + 1);
}

export function createToast(root, { onOpen }) {
  const node = el('div', { class: 'toast', hidden: true });
  root.append(node);
  let hideTimer = null;

  function show(phrase) {
    if (!phrase) return;
    const cat = getCategory(phrase.category);
    clear(node);
    node.style.setProperty('--accent', cat.accent);
    node.append(
      iconEl(cat.icon, 'toast-glyph'),
      el('span', { class: 'toast-text', text: phrase.text }),
      el(
        'button',
        {
          class: 'toast-close',
          'aria-label': 'Dismiss',
          onclick: (e) => {
            e.stopPropagation();
            hide();
          }
        },
        '✕'
      )
    );
    node.onclick = () => {
      hide();
      onOpen?.(phrase.id);
    };
    node.hidden = false;
    requestAnimationFrame(() => node.classList.add('is-in'));
    clearTimeout(hideTimer);
    hideTimer = setTimeout(hide, 9000);
  }

  function hide() {
    clearTimeout(hideTimer);
    node.classList.remove('is-in');
    setTimeout(() => {
      node.hidden = true;
    }, 400);
  }

  return { show, hide };
}
