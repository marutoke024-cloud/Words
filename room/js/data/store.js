import { createIndexedDbAdapter } from './indexedDbAdapter.js';
import { SEED_PHRASES } from './seed.js';
import { isCategory } from './categories.js';

/**
 * Single data-access point for the whole app.
 *
 * Everything above this file (scene + UI) only ever talks to `store`, never to
 * IndexedDB directly, so swapping `adapter` for a synced backend stays a
 * one-line change.
 */
const adapter = createIndexedDbAdapter();

const listeners = new Set();
let cache = [];
let ready = null;

function emit() {
  for (const fn of listeners) fn(cache);
}

export function onChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function uid() {
  if (crypto.randomUUID) return crypto.randomUUID();
  return 'p-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
}

export function normalizeWord(word) {
  return String(word)
    .toLowerCase()
    .replace(/[\u2019\u02bc]/g, "'")
    .replace(/[^a-z0-9'-]/g, '')
    .replace(/'s$/, '')
    .replace(/'+$/, '');
}

/** Split a phrase into tokens, keeping separators so the text can be re-rendered verbatim. */
export function tokenize(text) {
  const out = [];
  const re = /[A-Za-z][A-Za-z'’-]*/g;
  let last = 0;
  let m;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) out.push({ type: 'gap', value: text.slice(last, m.index) });
    out.push({ type: 'word', value: m[0] });
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push({ type: 'gap', value: text.slice(last) });
  return out;
}

export function findNote(phrase, word) {
  const key = normalizeWord(word);
  return (phrase.words || []).find((n) => normalizeWord(n.word) === key) || null;
}

export async function init() {
  if (ready) return ready;
  ready = (async () => {
    const existing = await adapter.count();
    if (existing === 0) {
      const now = Date.now();
      await adapter.putMany(
        SEED_PHRASES.map((s, i) => ({
          id: uid(),
          text: s.text,
          category: s.category,
          createdAt: now - (SEED_PHRASES.length - i) * 60000,
          words: s.words || []
        }))
      );
    }
    cache = await adapter.all();
    emit();
    return cache;
  })();
  return ready;
}

export function all() {
  return cache;
}

export function byCategory(category) {
  return cache.filter((p) => p.category === category);
}

export function get(id) {
  return cache.find((p) => p.id === id) || null;
}

export async function addPhrase({ text, category, words = [] }) {
  const phrase = {
    id: uid(),
    text: String(text).trim(),
    category: isCategory(category) ? category : 'tv',
    createdAt: Date.now(),
    words: words.filter((w) => w && w.word && w.meaning)
  };
  await adapter.put(phrase);
  cache = [phrase, ...cache];
  emit();
  return phrase;
}

export async function updatePhrase(id, patch) {
  const current = get(id);
  if (!current) return null;
  const next = { ...current, ...patch, id: current.id, createdAt: current.createdAt };
  await adapter.put(next);
  cache = cache.map((p) => (p.id === id ? next : p));
  emit();
  return next;
}

export async function setWordNote(id, { word, meaning, icon }) {
  const phrase = get(id);
  if (!phrase) return null;
  const key = normalizeWord(word);
  const words = (phrase.words || []).filter((n) => normalizeWord(n.word) !== key);
  if (meaning && meaning.trim()) {
    words.push({ word, meaning: meaning.trim(), icon: icon || '💬' });
  }
  return updatePhrase(id, { words });
}

export async function removePhrase(id) {
  await adapter.remove(id);
  cache = cache.filter((p) => p.id !== id);
  emit();
}

export async function moveToCategory(id, category) {
  if (!isCategory(category)) return null;
  return updatePhrase(id, { category });
}
