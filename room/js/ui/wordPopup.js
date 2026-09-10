import { el, clear, haptic } from './dom.js';

import { iconEl } from './icons.js';

const ICONS = ['💬', '🤝', '💡', '📌', '⏱️', '📈', '🔁', '🎯', '⚖️', '🚢', '😈', '👂', '🅿️', '📊', '🧱', '🌍'];

let layer = null;
let current = null;

function ensureLayer() {
  if (!layer) {
    layer = el('div', { class: 'popup-layer', hidden: true });
    layer.addEventListener('pointerdown', (e) => {
      if (e.target === layer) close();
    });
    document.body.append(layer);
  }
  return layer;
}

export function isOpen() {
  return current !== null;
}

export function close() {
  if (!current) return;
  current.node.classList.remove('is-in');
  const node = current.node;
  current = null;
  setTimeout(() => {
    node.remove();
    if (layer && !layer.firstChild) layer.hidden = true;
  }, 220);
}

function place(node, anchor) {
  const r = anchor.getBoundingClientRect();
  const w = Math.min(300, window.innerWidth - 32);
  node.style.width = `${w}px`;
  const left = Math.min(Math.max(12, r.left + r.width / 2 - w / 2), window.innerWidth - w - 12);
  node.style.left = `${left}px`;
  // Prefer above the word; flip below when there is no room.
  requestAnimationFrame(() => {
    const h = node.offsetHeight;
    const above = r.top - h - 14;
    node.style.top = above > 12 ? `${above}px` : `${Math.min(r.bottom + 14, window.innerHeight - h - 12)}px`;
    node.classList.add('is-in');
  });
}

/**
 * Word dictionary popup. Shows the saved meaning with its icon, and doubles as
 * the editor for words that have no note yet.
 */
export function openWordPopup(anchor, { word, note, accent = '#c9b6ff', onSave, onRemove }) {
  close();
  const l = ensureLayer();
  l.hidden = false;
  haptic();

  const node = el('div', { class: 'word-popup', style: { '--accent': accent } });

  function renderRead() {
    clear(node);
    node.append(
      el('div', { class: 'wp-head' }, el('span', { class: 'wp-icon', text: note.icon || '💬' }), el('span', { class: 'wp-word', text: word })),
      el('p', { class: 'wp-meaning', text: note.meaning }),
      el(
        'div',
        { class: 'wp-actions' },
        el('button', { class: 'wp-btn', onclick: () => renderEdit() }, '✎'),
        el(
          'button',
          {
            class: 'wp-btn',
            onclick: async () => {
              await onRemove?.(word);
              close();
            }
          },
          iconEl('trash')
        )
      )
    );
  }

  function renderEdit() {
    clear(node);
    let icon = note?.icon || '💬';
    const input = el('input', {
      class: 'wp-input',
      type: 'text',
      value: note?.meaning || '',
      placeholder: 'what it means to you',
      enterkeyhint: 'done'
    });

    const iconRow = el('div', { class: 'wp-icons' });
    ICONS.forEach((emoji) => {
      const b = el('button', { class: 'wp-emoji' + (emoji === icon ? ' is-on' : ''), text: emoji });
      b.onclick = () => {
        icon = emoji;
        iconRow.querySelectorAll('.wp-emoji').forEach((x) => x.classList.remove('is-on'));
        b.classList.add('is-on');
      };
      iconRow.append(b);
    });

    const save = async () => {
      const meaning = input.value.trim();
      if (!meaning) {
        close();
        return;
      }
      await onSave?.({ word, meaning, icon });
      close();
    };

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') save();
    });

    node.append(
      el('div', { class: 'wp-head' }, el('span', { class: 'wp-icon', text: icon }), el('span', { class: 'wp-word', text: word })),
      input,
      iconRow,
      el('div', { class: 'wp-actions' }, el('button', { class: 'wp-btn is-primary', onclick: save }, '✓'))
    );
    setTimeout(() => input.focus(), 60);
  }

  l.append(node);
  current = { node };
  if (note && note.meaning) renderRead();
  else renderEdit();
  place(node, anchor);
}
