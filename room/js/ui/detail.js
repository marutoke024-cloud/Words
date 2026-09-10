import { el, clear } from './dom.js';
import { getCategory } from '../data/categories.js';
import { phraseText } from './phraseView.js';
import { close as closeWordPopup } from './wordPopup.js';

/** A single phrase, opened straight from a fish or from the daily pick. */
export function createDetail(root, { onSaveNote, onRemoveNote, onClose, onDelete }) {
  const inner = el('div', { class: 'detail-card' });
  const node = el('div', { class: 'detail', hidden: true }, inner);
  node.addEventListener('pointerdown', (e) => {
    if (e.target === node) close();
  });
  root.append(node);

  function close() {
    if (node.hidden) return;
    closeWordPopup();
    node.classList.remove('is-in');
    setTimeout(() => {
      node.hidden = true;
    }, 300);
    onClose?.();
  }

  return {
    open(phrase) {
      const cat = getCategory(phrase.category);
      inner.style.setProperty('--accent', cat.accent);
      clear(inner).append(
        el(
          'div',
          { class: 'detail-head' },
          el('span', { class: 'detail-glyph', text: cat.glyph }),
          el('span', { class: 'card-spacer' }),
          el('button', { class: 'icon-btn', 'aria-label': 'Delete', onclick: () => onDelete?.(phrase.id) }, '🗑'),
          el('button', { class: 'icon-btn', 'aria-label': 'Close', onclick: close }, '✕')
        ),
        phraseText(phrase, { onSaveNote, onRemoveNote })
      );
      node.hidden = false;
      requestAnimationFrame(() => node.classList.add('is-in'));
    },
    close,
    get isOpen() {
      return !node.hidden;
    }
  };
}
