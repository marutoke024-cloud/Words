import * as store from './data/store.js';
import { getCategory, CATEGORIES } from './data/categories.js';
import { createRoom } from './scene/room.js';
import { createSheet } from './ui/sheet.js';
import { createEditor } from './ui/editor.js';
import { createDetail } from './ui/detail.js';
import { createToast, pickOfTheMoment } from './ui/toast.js';
import { el, haptic } from './ui/dom.js';
import { close as closeWordPopup, isOpen as wordPopupOpen } from './ui/wordPopup.js';

const ui = document.getElementById('ui');
const canvas = document.getElementById('stage');
const loader = document.getElementById('loader');

const hint = el('div', { class: 'hint', hidden: true });
const homeBtn = el('button', { class: 'chip-btn home-btn', 'aria-label': 'Back to the room', hidden: true }, '⌂');
const listBtn = el('button', { class: 'chip-btn list-btn', 'aria-label': 'Open the list', hidden: true }, '☰');
const fab = el('button', { class: 'fab', 'aria-label': 'New phrase' }, '+');
ui.append(hint, homeBtn, listBtn, fab);

let focused = null;

const room = createRoom(canvas, {
  onPickCategory: (categoryId) => openCategory(categoryId),
  onPickPhrase: (id) => {
    const phrase = store.get(id);
    if (phrase) {
      haptic();
      detail.open(phrase);
    }
  }
});

const sheet = createSheet(ui, {
  onClose: () => {
    if (focused !== 'aquarium') backToRoom();
  },
  onAdd: (categoryId) => editor.open(categoryId),
  onSaveNote: saveNote,
  onRemoveNote: removeNote,
  onDelete: deletePhrase,
  onFavorite: async (id) => {
    await store.moveToCategory(id, 'aquarium');
    haptic(18);
    room.cheer();
  }
});

const detail = createDetail(ui, {
  onSaveNote: saveNote,
  onRemoveNote: removeNote,
  onDelete: async (id) => {
    await deletePhrase(id);
    detail.close();
  }
});

const editor = createEditor(ui, {
  onSave: async (draft) => {
    await store.addPhrase(draft);
    haptic(20);
    room.cheer();
    if (!sheet.isOpen) openCategory(draft.category);
  }
});

const toast = createToast(ui, {
  onOpen: (id) => {
    const phrase = store.get(id);
    if (phrase) detail.open(phrase);
  }
});

function showHint(text, ms = 2600) {
  hint.textContent = text;
  hint.hidden = false;
  requestAnimationFrame(() => hint.classList.add('is-in'));
  clearTimeout(showHint.timer);
  showHint.timer = setTimeout(() => {
    hint.classList.remove('is-in');
    setTimeout(() => {
      hint.hidden = true;
    }, 300);
  }, ms);
}

function openCategory(categoryId) {
  const cat = getCategory(categoryId);
  focused = categoryId;
  haptic();
  room.focusCategory(categoryId);
  room.markersVisible(false);
  homeBtn.hidden = false;

  if (cat.mode === 'swim') {
    // In the tank the fish themselves are the list.
    listBtn.hidden = false;
    showHint(`${cat.glyph}  tap a fish`);
    sheet.close();
    return;
  }
  listBtn.hidden = true;
  setTimeout(() => sheet.open(categoryId, store.byCategory(categoryId)), 420);
}

function backToRoom() {
  focused = null;
  homeBtn.hidden = true;
  listBtn.hidden = true;
  room.resetView();
  room.markersVisible(true);
}

homeBtn.onclick = () => {
  sheet.close();
  detail.close();
  backToRoom();
};

listBtn.onclick = () => sheet.open('aquarium', store.byCategory('aquarium'));

fab.onclick = () => editor.open(sheet.category || focused || CATEGORIES[0].id);

async function saveNote(phraseId, note) {
  await store.setWordNote(phraseId, note);
}

async function removeNote(phraseId, word) {
  await store.setWordNote(phraseId, { word, meaning: '' });
}

async function deletePhrase(id) {
  await store.removePhrase(id);
  haptic(24);
}

store.onChange((phrases) => {
  room.syncFavorites(phrases.filter((p) => p.category === 'aquarium'));
  if (sheet.isOpen && sheet.category) sheet.refresh(store.byCategory(sheet.category));
});

window.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  if (editor.isOpen) return;
  if (wordPopupOpen()) {
    closeWordPopup();
    return;
  }
  if (detail.isOpen) detail.close();
  else if (sheet.isOpen) sheet.close();
  else if (focused) backToRoom();
});

(async function boot() {
  await store.init();
  loader.classList.add('is-out');
  setTimeout(() => loader.remove(), 700);

  setTimeout(() => {
    const pick = pickOfTheMoment(store.all());
    if (pick) toast.show(pick);
  }, 1800);
})();

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  });
}
