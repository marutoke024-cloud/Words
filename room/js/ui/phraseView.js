import { el, renderTokens } from './dom.js';
import { tokenize, findNote } from '../data/store.js';
import { getCategory } from '../data/categories.js';
import { openWordPopup } from './wordPopup.js';

/**
 * A phrase, rendered word by word. Every word is tappable: one with a saved
 * note opens the note, one without opens the tiny editor for it.
 */
export function phraseText(phrase, { onSaveNote, onRemoveNote } = {}) {
  const accent = getCategory(phrase.category).accent;
  const wrap = el('p', { class: 'phrase-text' });

  renderTokens(wrap, tokenize(phrase.text), (word) => {
    const note = findNote(phrase, word);
    const btn = el('button', {
      class: 'w' + (note ? ' has-note' : ''),
      type: 'button',
      text: word,
      style: note ? { '--accent': accent } : {}
    });
    btn.onclick = (e) => {
      e.stopPropagation();
      openWordPopup(btn, {
        word,
        note,
        accent,
        onSave: (n) => onSaveNote?.(phrase.id, n),
        onRemove: (w) => onRemoveNote?.(phrase.id, w)
      });
    };
    return btn;
  });

  return wrap;
}

export function phraseCard(phrase, handlers = {}) {
  const cat = getCategory(phrase.category);
  const card = el('article', { class: 'card', style: { '--accent': cat.accent } });

  card.append(phraseText(phrase, handlers));

  const noteCount = (phrase.words || []).length;
  const foot = el(
    'div',
    { class: 'card-foot' },
    el('span', { class: 'card-dots' }, ...Array.from({ length: Math.min(noteCount, 6) }, () => el('i'))),
    el('span', { class: 'card-spacer' })
  );

  if (phrase.category !== 'aquarium') {
    foot.append(
      el(
        'button',
        { class: 'icon-btn', 'aria-label': 'Move to favorites', onclick: () => handlers.onFavorite?.(phrase.id) },
        '🐟'
      )
    );
  }
  foot.append(
    el('button', { class: 'icon-btn', 'aria-label': 'Delete', onclick: () => handlers.onDelete?.(phrase.id) }, '🗑')
  );
  card.append(foot);
  return card;
}
