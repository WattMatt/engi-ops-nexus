/**
 * Tests for IndexedDB-based Offline Storage Layer
 * Tests core storage operations and sync queue functionality
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { 
  getDatabase, 
  getRecord, 
  getAllRecords, 
  getRecordsByIndex,
  putRecord, 
  deleteRecord, 
  getSyncQueue, 
  removeSyncQueueItem,
  updateSyncQueueItem,
  markRecordSynced,
  cacheData,
  getCachedData,
  clearExpiredCache,
  clearStore,
  getStorageStats,
  STORES,
  type StoreName
} from '@/lib/offlineStorage';

// Mock IndexedDB using fake-indexeddb
import 'fake-indexeddb/auto';

describe('Offline Storage Layer', () => {
  beforeEach(async () => {
    // Clear all stores before each test
    const db = await getDatabase();
    const storeNames = Object.values(STORES);
    
    for (const storeName of storeNames) {
      try {
        await clearStore(storeName);
      } catch (e) {
        // Store may not exist yet, ignore
      }
    }
  });

  describe('Database Initialization', () => {
    it('should successfully open the database', async () => {
      const db = await getDatabase();
      expect(db).toBeDefined();
      expect(db.name).toBe('wm-consulting-offline');
    });

    it('should create all required object stores', async () => {
      const db = await getDatabase();
      
      expect(db.objectStoreNames.contains(STORES.SITE_DIARY_ENTRIES)).toBe(true);
      expect(db.objectStoreNames.contains(STORES.SITE_DIARY_TASKS)).toBe(true);
      expect(db.objectStoreNames.contains(STORES.HANDOVER_DOCUMENTS)).toBe(true);
      expect(db.objectStoreNames.contains(STORES.HANDOVER_FOLDERS)).toBe(true);
      expect(db.objectStoreNames.contains(STORES.PENDING_UPLOADS)).toBe(true);
      expect(db.objectStoreNames.contains(STORES.SYNC_QUEUE)).toBe(true);
      expect(db.objectStoreNames.contains(STORES.CACHED_DATA)).toBe(true);
    });
  });

  describe('CRUD Operations', () => {
    const testRecord = {
      id: 'test-record-1',
      project_id: 'project-1',
      entry_date: '2024-01-15',
      notes: 'Test diary entry',
    };

    it('should create and retrieve a record', async () => {
      await putRecord(STORES.SITE_DIARY_ENTRIES, testRecord, false);
      
      const retrieved = await getRecord<typeof testRecord>(STORES.SITE_DIARY_ENTRIES, testRecord.id);
      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(testRecord.id);
      expect(retrieved?.notes).toBe(testRecord.notes);
    });

    it('should mark record as unsynced with metadata', async () => {
      await putRecord(STORES.SITE_DIARY_ENTRIES, testRecord, false);
      
      const retrieved = await getRecord<any>(STORES.SITE_DIARY_ENTRIES, testRecord.id);
      expect(retrieved?.synced).toBe(false);
      expect(retrieved?.localUpdatedAt).toBeDefined();
    });

    it('should update an existing record', async () => {
      await putRecord(STORES.SITE_DIARY_ENTRIES, testRecord, false);
      
      const updatedRecord = { ...testRecord, notes: 'Updated notes' };
      await putRecord(STORES.SITE_DIARY_ENTRIES, updatedRecord, false);
      
      const retrieved = await getRecord<typeof testRecord>(STORES.SITE_DIARY_ENTRIES, testRecord.id);
      expect(retrieved?.notes).toBe('Updated notes');
    });

    it('should delete a record', async () => {
      await putRecord(STORES.SITE_DIARY_ENTRIES, testRecord, false);
      await deleteRecord(STORES.SITE_DIARY_ENTRIES, testRecord.id, false);
      
      const retrieved = await getRecord(STORES.SITE_DIARY_ENTRIES, testRecord.id);
      expect(retrieved).toBeUndefined();
    });

    it('should retrieve all records from a store', async () => {
      const records = [
        { id: 'record-1', notes: 'Note 1' },
        { id: 'record-2', notes: 'Note 2' },
        { id: 'record-3', notes: 'Note 3' },
      ];

      for (const record of records) {
        await putRecord(STORES.SITE_DIARY_ENTRIES, record, false);
      }

      const allRecords = await getAllRecords(STORES.SITE_DIARY_ENTRIES);
      expect(allRecords).toHaveLength(3);
    });

    it('should retrieve records by index', async () => {
      const records = [
        { id: 'record-1', project_id: 'project-A', notes: 'Note 1' },
        { id: 'record-2', project_id: 'project-A', notes: 'Note 2' },
        { id: 'record-3', project_id: 'project-B', notes: 'Note 3' },
      ];

      for (const record of records) {
        await putRecord(STORES.SITE_DIARY_ENTRIES, record, false);
      }

      const projectARecords = await getRecordsByIndex(
        STORES.SITE_DIARY_ENTRIES, 
        'project_id', 
        'project-A'
      );
      expect(projectARecords).toHaveLength(2);
    });
  });

  describe('Sync Queue', () => {
    it('should add to sync queue when creating a record', async () => {
      const record = { id: 'sync-test-1', notes: 'Sync test' };
      await putRecord(STORES.SITE_DIARY_ENTRIES, record, true);

      const queue = await getSyncQueue();
      expect(queue.length).toBeGreaterThan(0);
      
      const queueItem = queue.find(item => item.recordId === record.id);
      expect(queueItem).toBeDefined();
      expect(queueItem?.action).toBe('create');
    });

    it('should add update action to sync queue for existing record', async () => {
      const record = { id: 'sync-update-1', notes: 'Original' };
      await putRecord(STORES.SITE_DIARY_ENTRIES, record, false);
      
      // Now update with sync queue enabled
      const updatedRecord = { ...record, notes: 'Updated' };
      await putRecord(STORES.SITE_DIARY_ENTRIES, updatedRecord, true);

      const queue = await getSyncQueue();
      const queueItem = queue.find(item => item.recordId === record.id);
      expect(queueItem?.action).toBe('update');
    });

    it('should add delete action to sync queue', async () => {
      const record = { id: 'sync-delete-1', notes: 'To be deleted' };
      await putRecord(STORES.SITE_DIARY_ENTRIES, record, false);
      await deleteRecord(STORES.SITE_DIARY_ENTRIES, record.id, true);

      const queue = await getSyncQueue();
      const queueItem = queue.find(item => item.recordId === record.id);
      expect(queueItem).toBeDefined();
      expect(queueItem?.action).toBe('delete');
    });

    it('should remove item from sync queue', async () => {
      const record = { id: 'remove-queue-1', notes: 'Test' };
      await putRecord(STORES.SITE_DIARY_ENTRIES, record, true);

      let queue = await getSyncQueue();
      const queueItem = queue.find(item => item.recordId === record.id);
      expect(queueItem).toBeDefined();

      await removeSyncQueueItem(queueItem!.id);
      
      queue = await getSyncQueue();
      const removed = queue.find(item => item.id === queueItem!.id);
      expect(removed).toBeUndefined();
    });

    it('should update sync queue item retry count', async () => {
      const record = { id: 'retry-test-1', notes: 'Test' };
      await putRecord(STORES.SITE_DIARY_ENTRIES, record, true);

      let queue = await getSyncQueue();
      const queueItem = queue.find(item => item.recordId === record.id)!;
      expect(queueItem.retryCount).toBe(0);

      await updateSyncQueueItem({
        ...queueItem,
        retryCount: 2,
        lastError: 'Network error',
      });

      queue = await getSyncQueue();
      const updated = queue.find(item => item.id === queueItem.id);
      expect(updated?.retryCount).toBe(2);
      expect(updated?.lastError).toBe('Network error');
    });

    it('should mark record as synced', async () => {
      const record = { id: 'mark-synced-1', notes: 'Test' };
      await putRecord(STORES.SITE_DIARY_ENTRIES, record, false);

      let retrieved = await getRecord<any>(STORES.SITE_DIARY_ENTRIES, record.id);
      expect(retrieved?.synced).toBe(false);

      await markRecordSynced(STORES.SITE_DIARY_ENTRIES, record.id);

      retrieved = await getRecord<any>(STORES.SITE_DIARY_ENTRIES, record.id);
      expect(retrieved?.synced).toBe(true);
      expect(retrieved?.syncedAt).toBeDefined();
    });
  });

  describe('Cache Operations', () => {
    it('should cache and retrieve data', async () => {
      const testData = { value: 'cached content', items: [1, 2, 3] };
      await cacheData('test-cache-key', testData, 60000);

      const retrieved = await getCachedData('test-cache-key');
      expect(retrieved).toEqual(testData);
    });

    it('should return undefined for expired cache', async () => {
      const testData = { value: 'will expire' };
      // Cache with 1ms TTL (effectively immediate expiration)
      await cacheData('expire-key', testData, 1);
      
      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 10));

      const retrieved = await getCachedData('expire-key');
      expect(retrieved).toBeUndefined();
    });

    it('should clear expired cache entries', async () => {
      // Create an expired entry manually
      const expiredData = { value: 'expired' };
      await cacheData('expired-key', expiredData, 1);
      
      await new Promise(resolve => setTimeout(resolve, 10));
      await clearExpiredCache();

      const all = await getAllRecords(STORES.CACHED_DATA);
      const found = all.find((item: any) => item.key === 'expired-key');
      expect(found).toBeUndefined();
    });
  });

  describe('Storage Statistics', () => {
    it('should return storage stats', async () => {
      const record1 = { id: 'stat-1', notes: 'Test 1' };
      const record2 = { id: 'stat-2', notes: 'Test 2' };
      
      await putRecord(STORES.SITE_DIARY_ENTRIES, record1, true);
      await putRecord(STORES.SITE_DIARY_ENTRIES, record2, true);

      const stats = await getStorageStats();
      
      expect(stats.totalRecords).toBeGreaterThan(0);
      expect(stats.syncQueueSize).toBe(2);
      expect(stats.storeStats[STORES.SITE_DIARY_ENTRIES]).toBe(2);
    });
  });

  describe('Store Clearing', () => {
    it('should clear all records from a store', async () => {
      const records = [
        { id: 'clear-1', notes: 'Test 1' },
        { id: 'clear-2', notes: 'Test 2' },
      ];

      for (const record of records) {
        await putRecord(STORES.SITE_DIARY_ENTRIES, record, false);
      }

      let allRecords = await getAllRecords(STORES.SITE_DIARY_ENTRIES);
      expect(allRecords).toHaveLength(2);

      await clearStore(STORES.SITE_DIARY_ENTRIES);

      allRecords = await getAllRecords(STORES.SITE_DIARY_ENTRIES);
      expect(allRecords).toHaveLength(0);
    });
  });
});
