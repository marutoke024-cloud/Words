import { el, clear, renderTokens } from './dom.js';
import { CATEGORIES, getCategory } from '../data/categories.js';
import { tokenize, normalizeWord } from '../data/store.js';
import { openWordPopup, close as closeWordPopup } from './wordPopup.js';

/**
 * Capture screen. One field for the phrase, one row of furniture glyphs for
 * the category, and the phrase itself doubles as the word-note editor.
 */
export function createEditor(root, { onSave }) {
  const input = el('textarea', {
    class: 'ed-input',
    rows: '3',
    placeholder: 'A phrase you want to use one day…',
    enterkeyhint: 'done'
  });
  const chips = el('div', { class: 'ed-chips' });
  const preview = el('div', { class: 'ed-preview' });
  const saveBtn = el('button', { class: 'ed-save', disabled: true }, '✓');
  const node = el(
    'section',
    { class: 'editor', hidden: true },
    el(
      'div',
      { class: 'ed-panel' },
      el(
        'div',
        { class: 'ed-head' },
        el('span', { class: 'ed-title', text: 'New phrase' }),
        el('button', { class: 'icon-btn', 'aria-label': 'Close', onclick: () => close() }, '✕')
      ),
      input,
      chips,
      preview,
      saveBtn
    )
  );
  root.append(node);

  let category = CATEGORIES[0].id;
  let pending = [];

  function renderChips() {
    clear(chips);
    CATEGORIES.forEach((c) => {
      const b = el(
        'button',
        {
          class: 'ed-chip' + (c.id === category ? ' is-on' : ''),
          style: { '--accent': c.accent },
          onclick: () => {
            category = c.id;
            renderChips();
            renderPreview();
          }
        },
        el('span', { class: 'ed-chip-glyph', text: c.glyph }),
        el('span', { class: 'ed-chip-label', text: c.label })
      );
      chips.append(b);
    });
  }

  function renderPreview() {
    const text = input.value.trim();
    saveBtn.disabled = text.length === 0;
    clear(preview);
    if (!text) {
      preview.append(el('span', { class: 'ed-hint', text: 'tap a word below to attach a meaning' }));
      return;
    }
    const accent = getCategory(category).accent;
    renderTokens(preview, tokenize(text), (word) => {
      const note = pending.find((n) => normalizeWord(n.word) === normalizeWord(word));
      const btn = el('button', {
        class: 'w' + (note ? ' has-note' : ''),
        type: 'button',
        text: word,
        style: note ? { '--accent': accent } : {}
      });
      btn.onclick = () => {
        openWordPopup(btn, {
          word,
          note,
          accent,
          onSave: (n) => {
            pending = pending.filter((x) => normalizeWord(x.word) !== normalizeWord(n.word));
            pending.push(n);
            renderPreview();
          },
          onRemove: (w) => {
            pending = pending.filter((x) => normalizeWord(x.word) !== normalizeWord(w));
            renderPreview();
          }
        });
      };
      return btn;
    });
  }

  input.addEventListener('input', renderPreview);

  saveBtn.onclick = async () => {
    const text = input.value.trim();
    if (!text) return;
    const words = pending.filter((n) => tokenize(text).some((t) => t.type === 'word' && normalizeWord(t.value) === normalizeWord(n.word)));
    await onSave?.({ text, category, words });
    close();
  };

  function close() {
    closeWordPopup();
    node.classList.remove('is-in');
    setTimeout(() => {
      node.hidden = true;
    }, 300);
  }

  return {
    open(categoryId) {
      category = categoryId || CATEGORIES[0].id;
      pending = [];
      input.value = '';
      renderChips();
      renderPreview();
      node.hidden = false;
      requestAnimationFrame(() => node.classList.add('is-in'));
      setTimeout(() => input.focus(), 220);
    },
    close,
    get isOpen() {
      return !node.hidden;
    }
  };
}
