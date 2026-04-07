import { openDB, DBSchema } from 'idb';

export interface SavedResource {
  id: string;
  title: string;
  type: string;
  source: string;
  url: string;
  description: string;
  subject: string;
  topic: string;
  savedAt: string;
}

interface ResourceDB extends DBSchema {
  savedResources: {
    key: string;
    value: SavedResource;
  };
}

async function getResourceDB() {
  return openDB<ResourceDB>('syllabix-resources', 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('savedResources')) {
        db.createObjectStore('savedResources', { keyPath: 'id' });
      }
    },
  });
}

export async function getAllSavedResources(): Promise<SavedResource[]> {
  const db = await getResourceDB();
  return db.getAll('savedResources');
}

export async function saveResource(resource: SavedResource): Promise<void> {
  const db = await getResourceDB();
  await db.put('savedResources', resource);
}

export async function deleteResource(id: string): Promise<void> {
  const db = await getResourceDB();
  await db.delete('savedResources', id);
}
