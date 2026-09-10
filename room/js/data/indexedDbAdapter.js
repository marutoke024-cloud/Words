/**
 * IndexedDB implementation of the phrase store.
 *
 * Kept behind the same small async interface that `store.js` exposes, so a
 * remote adapter (Firebase etc.) can be dropped in later without touching UI
 * or scene code:
 *
 *   all(), byCategory(id), get(id), put(phrase), remove(id)
 */
const DB_NAME = 'phrase-room';
const DB_VERSION = 1;
const STORE = 'phrases';

let dbPromise = null;

function open() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: 'id' });
        store.createIndex('category', 'category', { unique: false });
        store.createIndex('createdAt', 'createdAt', { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

async function tx(mode, fn) {
  const db = await open();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE, mode);
    const store = transaction.objectStore(STORE);
    let result;
    try {
      result = fn(store);
    } catch (err) {
      reject(err);
      return;
    }
    transaction.oncomplete = () => resolve(result && result.__req ? result.__req.result : result);
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
  });
}

const wrap = (req) => ({ __req: req });

export function createIndexedDbAdapter() {
  return {
    async all() {
      const rows = await tx('readonly', (store) => wrap(store.getAll()));
      return rows.sort((a, b) => b.createdAt - a.createdAt);
    },
    async byCategory(category) {
      const rows = await tx('readonly', (store) => wrap(store.index('category').getAll(category)));
      return rows.sort((a, b) => b.createdAt - a.createdAt);
    },
    async get(id) {
      return tx('readonly', (store) => wrap(store.get(id)));
    },
    async put(phrase) {
      await tx('readwrite', (store) => wrap(store.put(phrase)));
      return phrase;
    },
    /** One transaction for the whole batch — first-run seeding stays instant. */
    async putMany(phrases) {
      await tx('readwrite', (store) => {
        phrases.forEach((p) => store.put(p));
      });
      return phrases;
    },
    async remove(id) {
      await tx('readwrite', (store) => wrap(store.delete(id)));
    },
    async count() {
      return tx('readonly', (store) => wrap(store.count()));
    }
  };
}
