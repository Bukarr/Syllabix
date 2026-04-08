import { openDB, type DBSchema } from 'idb';

export interface SyncOperation {
  id: string;
  table: 'shared_schemes' | 'scheme_comments' | 'profiles';
  action: 'insert' | 'update' | 'delete';
  payload: Record<string, unknown>;
  /** For update/delete — match criteria */
  matchColumn?: string;
  matchValue?: string;
  /** Timestamp used for conflict resolution (last-write-wins) */
  createdAt: string;
  /** Number of retry attempts */
retries: number;
  /** Last error message */
  lastError?: string;
}

interface SyncQueueDB extends DBSchema {
  syncQueue: {
    key: string;
    value: SyncOperation;
    indexes: {
      'by-created': string;
    };
  };
}

const SYNC_DB = 'syllabix-sync-queue';
const SYNC_VERSION = 1;

async function getSyncDB() {
  return openDB<SyncQueueDB>(SYNC_DB, SYNC_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('syncQueue')) {
        const store = db.createObjectStore('syncQueue', { keyPath: 'id' });
        store.createIndex('by-created', 'createdAt');
      }
    },
  });
}

/** Enqueue an operation for later sync */
export async function enqueueSync(op: Omit<SyncOperation, 'id' | 'createdAt' | 'retries'>): Promise<void> {
  const db = await getSyncDB();
  await db.put('syncQueue', {
    ...op,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    retries: 0,
  });
}

/** Get all pending operations (oldest first) */
export async function getPendingOps(): Promise<SyncOperation[]> {
  const db = await getSyncDB();
  return db.getAllFromIndex('syncQueue', 'by-created');
}

/** Remove a successfully synced operation */
export async function removeSyncOp(id: string): Promise<void> {
  const db = await getSyncDB();
  await db.delete('syncQueue', id);
}

/** Update a failed operation (increment retries, store error) */
export async function markSyncFailed(id: string, error: string): Promise<void> {
  const db = await getSyncDB();
  const op = await db.get('syncQueue', id);
  if (op) {
    op.retries += 1;
    op.lastError = error;
    await db.put('syncQueue', op);
  }
}

/** Get count of pending operations */
export async function getPendingCount(): Promise<number> {
  const db = await getSyncDB();
  return db.count('syncQueue');
}

/** Clear all queued operations */
export async function clearSyncQueue(): Promise<void> {
  const db = await getSyncDB();
  await db.clear('syncQueue');
}
