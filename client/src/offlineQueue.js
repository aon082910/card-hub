// Queues a scanned card image in IndexedDB when the upload fails while offline
// (e.g. scanning cards on a phone with a flaky connection), then retries
// automatically once the browser reports it's back online.
const DB_NAME = 'card-hub-offline';
const STORE = 'pending-uploads';

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE, { keyPath: 'id', autoIncrement: true });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function queueUpload(cardId, blob, side) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).add({ cardId, blob, side, createdAt: Date.now() });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function listQueued() {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function removeQueued(id) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function flushQueue(uploadFn) {
  const items = await listQueued();
  for (const item of items) {
    try {
      await uploadFn(item.cardId, item.blob, item.side);
      await removeQueued(item.id);
    } catch {
      // still offline or server unreachable - leave queued, try again next time
      break;
    }
  }
  return items.length;
}
