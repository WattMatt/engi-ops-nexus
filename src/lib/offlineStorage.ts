/**
 * IndexedDB-based Offline Storage Layer
 * Provides persistent offline data storage for construction site tools
 */

const DB_NAME = 'wm-consulting-offline';
const DB_VERSION = 4; // Incremented for project contacts store

// Store names
export const STORES = {
  SITE_DIARY_ENTRIES: 'site_diary_entries',
  SITE_DIARY_TASKS: 'site_diary_tasks',
  HANDOVER_DOCUMENTS: 'handover_documents',
  HANDOVER_FOLDERS: 'handover_folders',
  PENDING_UPLOADS: 'pending_uploads',
  SYNC_QUEUE: 'sync_queue',
  CACHED_DATA: 'cached_data',
  // Cable schedules and budgets
  CABLE_ENTRIES: 'cable_entries',
  CABLE_SCHEDULES: 'cable_schedules',
  BUDGET_SECTIONS: 'budget_sections',
  BUDGET_LINE_ITEMS: 'budget_line_items',
  // Drawing register
  PROJECT_DRAWINGS: 'project_drawings',
  PENDING_DRAWING_UPLOADS: 'pending_drawing_uploads',
  // Project contacts for offline access
  PROJECT_CONTACTS: 'project_contacts',
} as const;

export type StoreName = typeof STORES[keyof typeof STORES];

interface SyncQueueItem {
  id: string;
  storeName: StoreName;
  recordId: string;
  action: 'create' | 'update' | 'delete';
  data: unknown;
  timestamp: number;
  retryCount: number;
  lastError?: string;
}

interface CachedDataEntry {
  key: string;
  data: unknown;
  timestamp: number;
  expiresAt: number;
}

let dbInstance: IDBDatabase | null = null;

/**
 * Initialize and get the IndexedDB database instance
 */
export async function getDatabase(): Promise<IDBDatabase> {
  if (dbInstance) return dbInstance;

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      console.error('Failed to open IndexedDB:', request.error);
      reject(request.error);
    };

    request.onsuccess = () => {
      dbInstance = request.result;
      
      // Handle connection closing
      dbInstance.onclose = () => {
        dbInstance = null;
      };
      
      resolve(dbInstance);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Site Diary stores
      if (!db.objectStoreNames.contains(STORES.SITE_DIARY_ENTRIES)) {
        const entryStore = db.createObjectStore(STORES.SITE_DIARY_ENTRIES, { keyPath: 'id' });
        entryStore.createIndex('project_id', 'project_id', { unique: false });
        entryStore.createIndex('entry_date', 'entry_date', { unique: false });
        entryStore.createIndex('synced', 'synced', { unique: false });
      }

      if (!db.objectStoreNames.contains(STORES.SITE_DIARY_TASKS)) {
        const taskStore = db.createObjectStore(STORES.SITE_DIARY_TASKS, { keyPath: 'id' });
        taskStore.createIndex('entry_id', 'entry_id', { unique: false });
        taskStore.createIndex('project_id', 'project_id', { unique: false });
        taskStore.createIndex('synced', 'synced', { unique: false });
      }

      // Handover stores
      if (!db.objectStoreNames.contains(STORES.HANDOVER_DOCUMENTS)) {
        const docStore = db.createObjectStore(STORES.HANDOVER_DOCUMENTS, { keyPath: 'id' });
        docStore.createIndex('project_id', 'project_id', { unique: false });
        docStore.createIndex('tenant_id', 'tenant_id', { unique: false });
        docStore.createIndex('folder_id', 'folder_id', { unique: false });
        docStore.createIndex('synced', 'synced', { unique: false });
      }

      if (!db.objectStoreNames.contains(STORES.HANDOVER_FOLDERS)) {
        const folderStore = db.createObjectStore(STORES.HANDOVER_FOLDERS, { keyPath: 'id' });
        folderStore.createIndex('project_id', 'project_id', { unique: false });
        folderStore.createIndex('parent_id', 'parent_id', { unique: false });
      }

      // Pending file uploads
      if (!db.objectStoreNames.contains(STORES.PENDING_UPLOADS)) {
        const uploadStore = db.createObjectStore(STORES.PENDING_UPLOADS, { keyPath: 'id' });
        uploadStore.createIndex('storeName', 'storeName', { unique: false });
        uploadStore.createIndex('recordId', 'recordId', { unique: false });
      }

      // Sync queue for tracking changes
      if (!db.objectStoreNames.contains(STORES.SYNC_QUEUE)) {
        const syncStore = db.createObjectStore(STORES.SYNC_QUEUE, { keyPath: 'id' });
        syncStore.createIndex('storeName', 'storeName', { unique: false });
        syncStore.createIndex('timestamp', 'timestamp', { unique: false });
      }

      // Generic cached data store
      if (!db.objectStoreNames.contains(STORES.CACHED_DATA)) {
        const cacheStore = db.createObjectStore(STORES.CACHED_DATA, { keyPath: 'key' });
        cacheStore.createIndex('expiresAt', 'expiresAt', { unique: false });
      }

      // Cable Schedule stores
      if (!db.objectStoreNames.contains(STORES.CABLE_ENTRIES)) {
        const cableEntryStore = db.createObjectStore(STORES.CABLE_ENTRIES, { keyPath: 'id' });
        // Index matches the schedule_id field (used as 'cable_schedule_id' locally for clarity)
        cableEntryStore.createIndex('cable_schedule_id', 'schedule_id', { unique: false });
        cableEntryStore.createIndex('floor_plan_id', 'floor_plan_id', { unique: false });
        cableEntryStore.createIndex('synced', 'synced', { unique: false });
      }

      if (!db.objectStoreNames.contains(STORES.CABLE_SCHEDULES)) {
        const cableScheduleStore = db.createObjectStore(STORES.CABLE_SCHEDULES, { keyPath: 'id' });
        cableScheduleStore.createIndex('project_id', 'project_id', { unique: false });
        cableScheduleStore.createIndex('synced', 'synced', { unique: false });
      }

      // Budget stores
      if (!db.objectStoreNames.contains(STORES.BUDGET_SECTIONS)) {
        const budgetSectionStore = db.createObjectStore(STORES.BUDGET_SECTIONS, { keyPath: 'id' });
        budgetSectionStore.createIndex('budget_id', 'budget_id', { unique: false });
        budgetSectionStore.createIndex('synced', 'synced', { unique: false });
      }

      if (!db.objectStoreNames.contains(STORES.BUDGET_LINE_ITEMS)) {
        const budgetLineStore = db.createObjectStore(STORES.BUDGET_LINE_ITEMS, { keyPath: 'id' });
        budgetLineStore.createIndex('section_id', 'section_id', { unique: false });
        budgetLineStore.createIndex('synced', 'synced', { unique: false });
      }

      // Project Drawings store
      if (!db.objectStoreNames.contains(STORES.PROJECT_DRAWINGS)) {
        const drawingStore = db.createObjectStore(STORES.PROJECT_DRAWINGS, { keyPath: 'id' });
        drawingStore.createIndex('project_id', 'project_id', { unique: false });
        drawingStore.createIndex('category', 'category', { unique: false });
        drawingStore.createIndex('status', 'status', { unique: false });
        drawingStore.createIndex('synced', 'synced', { unique: false });
      }

      // Pending drawing file uploads (for offline file queueing)
      if (!db.objectStoreNames.contains(STORES.PENDING_DRAWING_UPLOADS)) {
        const pendingStore = db.createObjectStore(STORES.PENDING_DRAWING_UPLOADS, { keyPath: 'id' });
        pendingStore.createIndex('drawing_id', 'drawing_id', { unique: false });
        pendingStore.createIndex('created_at', 'created_at', { unique: false });
      }

      // Project contacts store for offline client check
      if (!db.objectStoreNames.contains(STORES.PROJECT_CONTACTS)) {
        const contactsStore = db.createObjectStore(STORES.PROJECT_CONTACTS, { keyPath: 'id' });
        contactsStore.createIndex('project_id', 'project_id', { unique: false });
        contactsStore.createIndex('contact_type', 'contact_type', { unique: false });
        contactsStore.createIndex('synced', 'synced', { unique: false });
      }
    };
  });
}

/**
 * Get a single record by ID from a store
 */
export async function getRecord<T>(storeName: StoreName, id: string): Promise<T | undefined> {
  const db = await getDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readonly');
    const store = transaction.objectStore(storeName);
    const request = store.get(id);

    request.onsuccess = () => resolve(request.result as T | undefined);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Get all records from a store
 */
export async function getAllRecords<T>(storeName: StoreName): Promise<T[]> {
  const db = await getDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readonly');
    const store = transaction.objectStore(storeName);
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result as T[]);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Get records by index
 */
export async function getRecordsByIndex<T>(
  storeName: StoreName,
  indexName: string,
  value: IDBValidKey
): Promise<T[]> {
  const db = await getDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readonly');
    const store = transaction.objectStore(storeName);
    const index = store.index(indexName);
    const request = index.getAll(value);

    request.onsuccess = () => resolve(request.result as T[]);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Put (create or update) a record
 */
export async function putRecord<T extends { id: string }>(
  storeName: StoreName,
  record: T,
  addToSyncQueue = true
): Promise<void> {
  const db = await getDatabase();
  
  // Determine if this is a create or update
  const existing = await getRecord(storeName, record.id);
  const action = existing ? 'update' : 'create';
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(
      addToSyncQueue ? [storeName, STORES.SYNC_QUEUE] : [storeName],
      'readwrite'
    );
    
    const store = transaction.objectStore(storeName);
    const recordWithMeta = { ...record, synced: false, localUpdatedAt: Date.now() };
    store.put(recordWithMeta);

    if (addToSyncQueue) {
      const syncStore = transaction.objectStore(STORES.SYNC_QUEUE);
      const syncItem: SyncQueueItem = {
        id: crypto.randomUUID(),
        storeName,
        recordId: record.id,
        action,
        data: record,
        timestamp: Date.now(),
        retryCount: 0,
      };
      syncStore.put(syncItem);
    }

    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}

/**
 * Delete a record
 */
export async function deleteRecord(
  storeName: StoreName,
  id: string,
  addToSyncQueue = true
): Promise<void> {
  const db = await getDatabase();
  
  // Get the record before deletion for sync
  const existing = await getRecord(storeName, id);
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(
      addToSyncQueue ? [storeName, STORES.SYNC_QUEUE] : [storeName],
      'readwrite'
    );
    
    const store = transaction.objectStore(storeName);
    store.delete(id);

    if (addToSyncQueue && existing) {
      const syncStore = transaction.objectStore(STORES.SYNC_QUEUE);
      const syncItem: SyncQueueItem = {
        id: crypto.randomUUID(),
        storeName,
        recordId: id,
        action: 'delete',
        data: existing,
        timestamp: Date.now(),
        retryCount: 0,
      };
      syncStore.put(syncItem);
    }

    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}

/**
 * Get all pending sync items
 */
export async function getSyncQueue(): Promise<SyncQueueItem[]> {
  return getAllRecords<SyncQueueItem>(STORES.SYNC_QUEUE);
}

/**
 * Remove item from sync queue (after successful sync)
 */
export async function removeSyncQueueItem(id: string): Promise<void> {
  const db = await getDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORES.SYNC_QUEUE, 'readwrite');
    const store = transaction.objectStore(STORES.SYNC_QUEUE);
    store.delete(id);

    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}

/**
 * Update sync queue item (e.g., after failed retry)
 */
export async function updateSyncQueueItem(item: SyncQueueItem): Promise<void> {
  const db = await getDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORES.SYNC_QUEUE, 'readwrite');
    const store = transaction.objectStore(STORES.SYNC_QUEUE);
    store.put(item);

    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}

/**
 * Mark a record as synced
 */
export async function markRecordSynced(storeName: StoreName, id: string): Promise<void> {
  const record = await getRecord<Record<string, unknown>>(storeName, id);
  if (record) {
    const db = await getDatabase();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      store.put({ ...record, synced: true, syncedAt: Date.now() });

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }
}

/**
 * Cache data with expiration
 */
export async function cacheData(
  key: string,
  data: unknown,
  ttlMs: number = 1000 * 60 * 60 // 1 hour default
): Promise<void> {
  const db = await getDatabase();
  const entry: CachedDataEntry = {
    key,
    data,
    timestamp: Date.now(),
    expiresAt: Date.now() + ttlMs,
  };

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORES.CACHED_DATA, 'readwrite');
    const store = transaction.objectStore(STORES.CACHED_DATA);
    store.put(entry);

    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}

/**
 * Get cached data (returns undefined if expired)
 */
export async function getCachedData<T>(key: string): Promise<T | undefined> {
  const entry = await getRecord<CachedDataEntry>(STORES.CACHED_DATA, key);
  if (!entry) return undefined;
  
  if (Date.now() > entry.expiresAt) {
    // Clean up expired entry
    await deleteRecord(STORES.CACHED_DATA, key, false);
    return undefined;
  }
  
  return entry.data as T;
}

/**
 * Clear all expired cache entries
 */
export async function clearExpiredCache(): Promise<void> {
  const db = await getDatabase();
  const now = Date.now();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORES.CACHED_DATA, 'readwrite');
    const store = transaction.objectStore(STORES.CACHED_DATA);
    const index = store.index('expiresAt');
    const range = IDBKeyRange.upperBound(now);
    
    const request = index.openCursor(range);
    request.onsuccess = (event) => {
      const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
      if (cursor) {
        cursor.delete();
        cursor.continue();
      }
    };

    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}

/**
 * Clear all data from a store
 */
export async function clearStore(storeName: StoreName): Promise<void> {
  const db = await getDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    store.clear();

    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}

/**
 * Get storage usage stats
 */
export async function getStorageStats(): Promise<{
  totalRecords: number;
  syncQueueSize: number;
  storeStats: Record<string, number>;
}> {
  const db = await getDatabase();
  const storeStats: Record<string, number> = {};
  let totalRecords = 0;

  for (const storeName of Object.values(STORES)) {
    const records = await getAllRecords(storeName);
    storeStats[storeName] = records.length;
    totalRecords += records.length;
  }

  const syncQueue = await getSyncQueue();

  return {
    totalRecords,
    syncQueueSize: syncQueue.length,
    storeStats,
  };
}
