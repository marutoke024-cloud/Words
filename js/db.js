// IndexedDB layer — store "phrases"
const DB_NAME = 'phrase-stock';
const DB_VERSION = 1;
const STORE = 'phrases';

let dbPromise = null;

function openDB() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: 'id' });
        store.createIndex('status', 'status');
        store.createIndex('created_at', 'created_at');
        store.createIndex('next_review_at', 'next_review_at');
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

function reqAsPromise(req) {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function withStore(mode, fn) {
  const db = await openDB();
  const tx = db.transaction(STORE, mode);
  const result = await fn(tx.objectStore(STORE));
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve(result);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

/**
 * @typedef {Object} Phrase
 * @property {string} id
 * @property {string} text            フレーズ本文(唯一の必須入力)
 * @property {'youtube'|'manual'} source_type
 * @property {string=} video_title
 * @property {string=} channel
 * @property {string=} video_url
 * @property {string=} thumbnail_url
 * @property {number|null} timestamp_seconds
 * @property {string=} source_note    手動入力時の出典メモ(「会議」等)
 * @property {string[]} tags
 * @property {'未整理'|'整理済み'} status
 * @property {number} created_at      epoch ms
 * @property {number} used_count
 * @property {number|null} next_review_at  epoch ms / null = 卒業
 * @property {number} srs_step        内部: 現在の間隔段階
 */

export function newPhrase(partial) {
  const now = Date.now();
  return {
    id: (crypto.randomUUID && crypto.randomUUID()) || `p-${now}-${Math.random().toString(36).slice(2)}`,
    text: '',
    source_type: 'manual',
    video_title: '',
    channel: '',
    video_url: '',
    thumbnail_url: '',
    timestamp_seconds: null,
    source_note: '',
    tags: [],
    status: '未整理',
    created_at: now,
    used_count: 0,
    next_review_at: null,
    srs_step: 0,
    ...partial,
  };
}

export function addPhrase(phrase) {
  return withStore('readwrite', (store) => reqAsPromise(store.add(phrase)));
}

export function updatePhrase(phrase) {
  return withStore('readwrite', (store) => reqAsPromise(store.put(phrase)));
}

export function deletePhrase(id) {
  return withStore('readwrite', (store) => reqAsPromise(store.delete(id)));
}

export function getPhrase(id) {
  return withStore('readonly', (store) => reqAsPromise(store.get(id)));
}

export async function allPhrases() {
  const items = await withStore('readonly', (store) => reqAsPromise(store.getAll()));
  return items.sort((a, b) => b.created_at - a.created_at);
}

export async function unsortedPhrases() {
  const items = await allPhrases();
  return items.filter((p) => p.status === '未整理');
}

export async function duePhrases(now = Date.now()) {
  const items = await allPhrases();
  return items
    .filter((p) => p.next_review_at != null && p.next_review_at <= now)
    .sort((a, b) => a.next_review_at - b.next_review_at);
}

export async function exportAll() {
  return { app: 'phrase-stock', version: 1, exported_at: new Date().toISOString(), phrases: await allPhrases() };
}

export async function importAll(data) {
  if (!data || !Array.isArray(data.phrases)) throw new Error('不正なファイル形式です');
  let count = 0;
  await withStore('readwrite', (store) => {
    for (const p of data.phrases) {
      if (p && p.id && typeof p.text === 'string') {
        store.put(p);
        count++;
      }
    }
    return Promise.resolve();
  });
  return count;
}
