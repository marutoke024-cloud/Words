import { el, clear } from './dom.js';
import { getCategory } from '../data/categories.js';
import { phraseCard } from './phraseView.js';
import { iconEl } from './icons.js';
import { close as closeWordPopup } from './wordPopup.js';

/**
 * Bottom sheet used for every category. Text is kept to a glyph and a short
 * label — the room is what carries the meaning.
 */
export function createSheet(root, { onClose, onAdd, onSaveNote, onRemoveNote, onDelete, onFavorite }) {
  const head = el('div', { class: 'sheet-head' });
  const body = el('div', { class: 'sheet-body' });
  const node = el('section', { class: 'sheet', hidden: true }, head, body);
  root.append(node);

  let openCategory = null;

  function close() {
    if (node.hidden) return;
    closeWordPopup();
    node.classList.remove('is-in');
    openCategory = null;
    setTimeout(() => {
      node.hidden = true;
    }, 340);
    onClose?.();
  }

  function render(categoryId, phrases) {
    const cat = getCategory(categoryId);
    node.style.setProperty('--accent', cat.accent);

    clear(head).append(
      iconEl(cat.icon, 'sheet-glyph'),
      el('div', { class: 'sheet-titles' }, el('h2', { text: cat.label }), el('span', { class: 'sheet-hint', text: cat.hint })),
      el('span', { class: 'sheet-count', text: String(phrases.length) }),
      el('button', { class: 'icon-btn', 'aria-label': 'Close', onclick: close }, '✕')
    );

    clear(body);
    if (!phrases.length) {
      body.append(
        el('button', { class: 'empty', onclick: () => onAdd?.(categoryId) }, el('span', { text: '+' }))
      );
    } else {
      phrases.forEach((p, i) => {
        const card = phraseCard(p, { onSaveNote, onRemoveNote, onDelete, onFavorite });
        card.style.animationDelay = `${Math.min(i, 8) * 45}ms`;
        body.append(card);
      });
      body.append(el('button', { class: 'add-row', onclick: () => onAdd?.(categoryId) }, '+'));
    }
  }

  return {
    open(categoryId, phrases) {
      openCategory = categoryId;
      render(categoryId, phrases);
      node.hidden = false;
      requestAnimationFrame(() => node.classList.add('is-in'));
    },
    refresh(phrases) {
      if (openCategory) render(openCategory, phrases);
    },
    close,
    get category() {
      return openCategory;
    },
    get isOpen() {
      return !node.hidden;
    }
  };
}
