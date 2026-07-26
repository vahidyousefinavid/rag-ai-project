const DB_NAME = 'musicyar-local';
const DB_VERSION = 1;
const STORE = 'tracks';

export interface LocalTrackRecord {
  id: string;
  name: string;
  addedAt: number;
  blob: Blob;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE, { keyPath: 'id' });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/** Reads the picked files into IndexedDB so they survive reloads — no upload, everything stays on-device. */
export async function addLocalFiles(files: FileList | File[]): Promise<LocalTrackRecord[]> {
  const db = await openDb();
  const records: LocalTrackRecord[] = Array.from(files).map((file) => ({
    id: crypto.randomUUID(),
    name: file.name.replace(/\.[^./]+$/, ''),
    addedAt: Date.now(),
    blob: file,
  }));

  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    const store = tx.objectStore(STORE);
    records.forEach((rec) => store.put(rec));
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });

  db.close();
  return records;
}

export async function listLocalTracks(): Promise<LocalTrackRecord[]> {
  const db = await openDb();
  const records = await new Promise<LocalTrackRecord[]>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).getAll();
    req.onsuccess = () => resolve(req.result as LocalTrackRecord[]);
    req.onerror = () => reject(req.error);
  });
  db.close();
  return records.sort((a, b) => b.addedAt - a.addedAt);
}

export async function removeLocalTrack(id: string): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}
