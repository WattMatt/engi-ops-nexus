/**
 * Offline Message Queue Storage
 * Uses IndexedDB to persist queued messages that couldn't be sent while offline
 */

const DB_NAME = 'wm-consulting-offline';
const DB_VERSION = 1;
const STORE_NAME = 'message-queue';

export interface QueuedMessage {
  id: string;
  conversation_id: string;
  content: string;
  mentions?: string[];
  attachments?: any[];
  voice_message_url?: string;
  voice_duration_seconds?: number;
  content_type?: string;
  created_at: string;
  retry_count: number;
  last_error?: string;
  status: 'pending' | 'sending' | 'failed';
}

/**
 * Open the IndexedDB database
 */
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      console.error('Failed to open IndexedDB:', request.error);
      reject(request.error);
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      
      // Create message queue store
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('conversation_id', 'conversation_id', { unique: false });
        store.createIndex('status', 'status', { unique: false });
        store.createIndex('created_at', 'created_at', { unique: false });
      }
    };
  });
}

/**
 * Add a message to the offline queue
 */
export async function addToQueue(message: Omit<QueuedMessage, 'id' | 'created_at' | 'retry_count' | 'status'>): Promise<QueuedMessage> {
  const db = await openDB();
  
  const queuedMessage: QueuedMessage = {
    ...message,
    id: `offline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    created_at: new Date().toISOString(),
    retry_count: 0,
    status: 'pending',
  };

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.add(queuedMessage);

    request.onsuccess = () => {
      console.log('Message added to offline queue:', queuedMessage.id);
      resolve(queuedMessage);
    };

    request.onerror = () => {
      console.error('Failed to add message to queue:', request.error);
      reject(request.error);
    };

    transaction.oncomplete = () => {
      db.close();
    };
  });
}

/**
 * Get all pending messages from the queue
 */
export async function getPendingMessages(): Promise<QueuedMessage[]> {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const index = store.index('status');
    const request = index.getAll('pending');

    request.onsuccess = () => {
      resolve(request.result || []);
    };

    request.onerror = () => {
      reject(request.error);
    };

    transaction.oncomplete = () => {
      db.close();
    };
  });
}

/**
 * Get all messages for a specific conversation
 */
export async function getQueuedMessagesForConversation(conversationId: string): Promise<QueuedMessage[]> {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const index = store.index('conversation_id');
    const request = index.getAll(conversationId);

    request.onsuccess = () => {
      resolve(request.result || []);
    };

    request.onerror = () => {
      reject(request.error);
    };

    transaction.oncomplete = () => {
      db.close();
    };
  });
}

/**
 * Get total count of queued messages
 */
export async function getQueueCount(): Promise<number> {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.count();

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(request.error);
    };

    transaction.oncomplete = () => {
      db.close();
    };
  });
}

/**
 * Update a queued message status
 */
export async function updateQueuedMessage(id: string, updates: Partial<QueuedMessage>): Promise<void> {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    
    const getRequest = store.get(id);
    
    getRequest.onsuccess = () => {
      const existing = getRequest.result;
      if (!existing) {
        reject(new Error('Message not found in queue'));
        return;
      }

      const updated = { ...existing, ...updates };
      const putRequest = store.put(updated);
      
      putRequest.onsuccess = () => {
        resolve();
      };
      
      putRequest.onerror = () => {
        reject(putRequest.error);
      };
    };

    getRequest.onerror = () => {
      reject(getRequest.error);
    };

    transaction.oncomplete = () => {
      db.close();
    };
  });
}

/**
 * Remove a message from the queue (after successful send)
 */
export async function removeFromQueue(id: string): Promise<void> {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(id);

    request.onsuccess = () => {
      console.log('Message removed from offline queue:', id);
      resolve();
    };

    request.onerror = () => {
      reject(request.error);
    };

    transaction.oncomplete = () => {
      db.close();
    };
  });
}

/**
 * Clear all messages from the queue
 */
export async function clearQueue(): Promise<void> {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.clear();

    request.onsuccess = () => {
      console.log('Offline message queue cleared');
      resolve();
    };

    request.onerror = () => {
      reject(request.error);
    };

    transaction.oncomplete = () => {
      db.close();
    };
  });
}

/**
 * Check if IndexedDB is available
 */
export function isOfflineQueueSupported(): boolean {
  return 'indexedDB' in window;
}
