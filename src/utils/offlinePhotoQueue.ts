/**
 * Offline Photo Queue
 * Hybrid storage: Capacitor Filesystem on native, base64 blobs in IndexedDB on web.
 * Queues photos taken offline and syncs them when connectivity returns.
 */

import { isNative, isPluginAvailable } from '@/utils/platform';

const DB_NAME = 'wm-consulting-offline';
const DB_VERSION = 2; // Bump from v1 to add photo-queue store
const PHOTO_STORE = 'photo-upload-queue';
const MSG_STORE = 'message-queue'; // Existing store — preserve it

export interface QueuedPhoto {
  id: string;
  pin_id: string;
  project_id: string;
  uploader_name: string;
  file_name: string;
  file_size: number;
  /** base64 data URI (web) or capacitor filesystem URI (native) */
  local_source: string;
  /** 'base64' | 'filesystem' */
  storage_type: 'base64' | 'filesystem';
  annotation_json?: any;
  created_at: string;
  retry_count: number;
  last_error?: string;
  status: 'pending' | 'uploading' | 'failed' | 'synced';
}

// ── IndexedDB helpers ──────────────────────────────────────────────

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Preserve existing message-queue store
      if (!db.objectStoreNames.contains(MSG_STORE)) {
        const msgStore = db.createObjectStore(MSG_STORE, { keyPath: 'id' });
        msgStore.createIndex('conversation_id', 'conversation_id', { unique: false });
        msgStore.createIndex('status', 'status', { unique: false });
        msgStore.createIndex('created_at', 'created_at', { unique: false });
      }

      // Create photo queue store
      if (!db.objectStoreNames.contains(PHOTO_STORE)) {
        const store = db.createObjectStore(PHOTO_STORE, { keyPath: 'id' });
        store.createIndex('pin_id', 'pin_id', { unique: false });
        store.createIndex('project_id', 'project_id', { unique: false });
        store.createIndex('status', 'status', { unique: false });
      }
    };
  });
}

// ── Capacitor Filesystem helpers ───────────────────────────────────

async function saveToFilesystem(blob: Blob, fileName: string): Promise<string> {
  const { Filesystem, Directory } = await import('@capacitor/filesystem');
  const base64 = await blobToBase64(blob);
  const result = await Filesystem.writeFile({
    path: `offline-photos/${fileName}`,
    data: base64,
    directory: Directory.Data,
    recursive: true,
  });
  return result.uri;
}

async function readFromFilesystem(uri: string): Promise<Blob> {
  const { Filesystem } = await import('@capacitor/filesystem');
  // Extract path from URI
  const result = await Filesystem.readFile({ path: uri });
  const data = result.data as string;
  return base64ToBlob(data);
}

async function deleteFromFilesystem(uri: string): Promise<void> {
  try {
    const { Filesystem } = await import('@capacitor/filesystem');
    await Filesystem.deleteFile({ path: uri });
  } catch (err) {
    console.warn('Failed to delete offline photo file:', err);
  }
}

// ── Conversion utilities ───────────────────────────────────────────

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      // Strip data URI prefix for Capacitor, keep full for web
      resolve(result);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

function base64ToBlob(dataUri: string): Blob {
  // Handle both raw base64 and data URI format
  let base64: string;
  let mimeType = 'image/jpeg';

  if (dataUri.startsWith('data:')) {
    const parts = dataUri.split(',');
    base64 = parts[1];
    const mimeMatch = parts[0].match(/data:(.*?);/);
    if (mimeMatch) mimeType = mimeMatch[1];
  } else {
    base64 = dataUri;
  }

  const byteChars = atob(base64);
  const byteArrays: Uint8Array[] = [];

  for (let offset = 0; offset < byteChars.length; offset += 512) {
    const slice = byteChars.slice(offset, offset + 512);
    const byteNumbers = new Array(slice.length);
    for (let i = 0; i < slice.length; i++) {
      byteNumbers[i] = slice.charCodeAt(i);
    }
    byteArrays.push(new Uint8Array(byteNumbers));
  }

  return new Blob(byteArrays, { type: mimeType });
}

// ── Public API ─────────────────────────────────────────────────────

/**
 * Queue a photo for later upload. Compresses and stores locally.
 */
export async function queuePhoto(
  compressedFile: File | Blob,
  meta: {
    pinId: string;
    projectId: string;
    uploaderName: string;
    fileName: string;
    annotationJson?: any;
  }
): Promise<QueuedPhoto> {
  const id = `photo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const useFilesystem = isNative() && isPluginAvailable('Filesystem');

  let localSource: string;
  let storageType: 'base64' | 'filesystem';

  if (useFilesystem) {
    localSource = await saveToFilesystem(compressedFile, `${id}_${meta.fileName}`);
    storageType = 'filesystem';
  } else {
    localSource = await blobToBase64(compressedFile);
    storageType = 'base64';
  }

  const entry: QueuedPhoto = {
    id,
    pin_id: meta.pinId,
    project_id: meta.projectId,
    uploader_name: meta.uploaderName,
    file_name: meta.fileName,
    file_size: compressedFile.size,
    local_source: localSource,
    storage_type: storageType,
    annotation_json: meta.annotationJson,
    created_at: new Date().toISOString(),
    retry_count: 0,
    status: 'pending',
  };

  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([PHOTO_STORE], 'readwrite');
    const store = tx.objectStore(PHOTO_STORE);
    const req = store.add(entry);
    req.onsuccess = () => resolve(entry);
    req.onerror = () => reject(req.error);
    tx.oncomplete = () => db.close();
  });
}

/**
 * Get all queued photos (any status)
 */
export async function getAllQueuedPhotos(): Promise<QueuedPhoto[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([PHOTO_STORE], 'readonly');
    const store = tx.objectStore(PHOTO_STORE);
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
    tx.oncomplete = () => db.close();
  });
}

/**
 * Get queued photos for a specific pin
 */
export async function getQueuedPhotosForPin(pinId: string): Promise<QueuedPhoto[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([PHOTO_STORE], 'readonly');
    const store = tx.objectStore(PHOTO_STORE);
    const idx = store.index('pin_id');
    const req = idx.getAll(pinId);
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
    tx.oncomplete = () => db.close();
  });
}

/**
 * Get pending (unsynced) photo count
 */
export async function getPendingPhotoCount(): Promise<number> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([PHOTO_STORE], 'readonly');
    const store = tx.objectStore(PHOTO_STORE);
    const idx = store.index('status');
    const req = idx.count('pending');
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
    tx.oncomplete = () => db.close();
  });
}

/**
 * Update a queued photo's status
 */
export async function updateQueuedPhoto(id: string, updates: Partial<QueuedPhoto>): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([PHOTO_STORE], 'readwrite');
    const store = tx.objectStore(PHOTO_STORE);
    const getReq = store.get(id);

    getReq.onsuccess = () => {
      const existing = getReq.result;
      if (!existing) { reject(new Error('Photo not found in queue')); return; }
      const putReq = store.put({ ...existing, ...updates });
      putReq.onsuccess = () => resolve();
      putReq.onerror = () => reject(putReq.error);
    };
    getReq.onerror = () => reject(getReq.error);
    tx.oncomplete = () => db.close();
  });
}

/**
 * Remove a synced photo from the queue and clean up local storage
 */
export async function removeQueuedPhoto(id: string): Promise<void> {
  const db = await openDB();

  // Get the entry first so we can clean up filesystem
  const entry = await new Promise<QueuedPhoto | null>((resolve, reject) => {
    const tx = db.transaction([PHOTO_STORE], 'readonly');
    const req = tx.objectStore(PHOTO_STORE).get(id);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });

  if (entry?.storage_type === 'filesystem') {
    await deleteFromFilesystem(entry.local_source);
  }

  return new Promise((resolve, reject) => {
    const tx = db.transaction([PHOTO_STORE], 'readwrite');
    const req = tx.objectStore(PHOTO_STORE).delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
    tx.oncomplete = () => db.close();
  });
}

/**
 * Resolve a queued photo's blob for upload
 */
export async function resolveQueuedPhotoBlob(entry: QueuedPhoto): Promise<Blob> {
  if (entry.storage_type === 'filesystem') {
    return readFromFilesystem(entry.local_source);
  }
  return base64ToBlob(entry.local_source);
}

/**
 * Get local preview URL for a queued photo (for optimistic UI)
 */
export function getQueuedPhotoPreviewUrl(entry: QueuedPhoto): string {
  if (entry.storage_type === 'base64') {
    return entry.local_source; // Already a data URI
  }
  // For filesystem, Capacitor can convert to web-viewable URL
  return entry.local_source;
}
