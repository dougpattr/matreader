/* Acervo em IndexedDB — mesmo banco e formato da versão anterior
   (matriculasDB/matriculas), então backups antigos restauram sem perda. */
import type { Fit } from '@/domain/matricula/types';
import type { LibraryState } from '@/domain/matricula/library-key';

export interface LibraryRecord {
  id: string;
  numero: string;
  cartorio: string;
  comarca: string;
  denominacao: string;
  estado: LibraryState;
  busca: string;
  json: unknown;
  fit: Fit;
  savedAt: number;
  /** de onde veio: ia · arquivo · colagem · biblioteca */
  origem?: string;
  /** registros antigos (v2) guardavam estes campos soltos */
  anchor?: string;
  rotation?: number;
  flipX?: boolean;
  flipY?: boolean;
  geoOk?: boolean;
}

const DB_NAME = 'matriculasDB';
const STORE = 'matriculas';
let conn: Promise<IDBDatabase> | null = null;

function db(): Promise<IDBDatabase> {
  conn ??= new Promise<IDBDatabase>((resolve, reject) => {
    const r = indexedDB.open(DB_NAME, 1);
    r.onupgradeneeded = () => {
      if (!r.result.objectStoreNames.contains(STORE)) r.result.createObjectStore(STORE, { keyPath: 'id' });
    };
    r.onsuccess = () => {
      const d = r.result;
      d.onclose = () => (conn = null);
      d.onversionchange = () => {
        d.close();
        conn = null;
      };
      resolve(d);
    };
    r.onerror = () => {
      conn = null;
      reject(r.error);
    };
  });
  return conn;
}

function run<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T> | void): Promise<T | undefined> {
  return db().then(
    (d) =>
      new Promise<T | undefined>((resolve, reject) => {
        const tx = d.transaction(STORE, mode);
        const req = fn(tx.objectStore(STORE));
        tx.oncomplete = () => resolve(req ? req.result : undefined);
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error);
      }),
  );
}

export const libraryDb = {
  all: async () => ((await run<LibraryRecord[]>('readonly', (s) => s.getAll() as IDBRequest<LibraryRecord[]>)) ?? []),
  put: (rec: LibraryRecord) => run('readwrite', (s) => void s.put(rec)),
  del: (id: string) => run('readwrite', (s) => void s.delete(id)),
  clear: () => run('readwrite', (s) => void s.clear()),
};

/* ---------- pasta escolhida uma vez para gravar KMZ (File System Access) ---------- */
const HANDLES = 'fsHandlesDB';

function handleDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const r = indexedDB.open(HANDLES, 1);
    r.onupgradeneeded = () => r.result.createObjectStore('handles');
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}

export async function getSavedDirectory(): Promise<FileSystemDirectoryHandle | null> {
  try {
    const d = await handleDb();
    const h = await new Promise<FileSystemDirectoryHandle | null>((resolve) => {
      const q = d.transaction('handles', 'readonly').objectStore('handles').get('matriculasDir');
      q.onsuccess = () => resolve((q.result as FileSystemDirectoryHandle) ?? null);
      q.onerror = () => resolve(null);
    });
    if (!h) return null;
    let p = (await h.queryPermission?.({ mode: 'readwrite' })) ?? 'prompt';
    if (p !== 'granted') p = (await h.requestPermission?.({ mode: 'readwrite' })) ?? 'denied';
    return p === 'granted' ? h : null;
  } catch {
    return null;
  }
}

export async function saveDirectory(h: FileSystemDirectoryHandle): Promise<void> {
  try {
    const d = await handleDb();
    d.transaction('handles', 'readwrite').objectStore('handles').put(h, 'matriculasDir');
  } catch {}
}
