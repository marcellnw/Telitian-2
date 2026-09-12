import { TelitianRecord } from '../types/record';
import { formatDateTimeJakarta } from './currency';
import {
  saveToIndexedDB,
  loadFromIndexedDB,
  clearIndexedDB,
  putRecordToIndexedDB,
  deleteRecordFromIndexedDB,
} from '../db/database';

const STORAGE_KEY_BACKUP = 'telitian_offline_backup';
const STORAGE_KEY_QUEUE = 'telitian_pending_queue';
const STORAGE_KEY_LAST_SYNC = 'telitian_last_sync_timestamp';

/**
 * Load backup records directly from localStorage synchronously.
 * Guarantees zero-data loss during page refresh even if offline.
 */
export function getLocalBackupRecords(): TelitianRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_BACKUP);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn('Error reading local offline backup:', err);
  }
  return [];
}

export const loadOfflineBackup = getLocalBackupRecords;

/**
 * Muat backup dengan fallback cerdas ke IndexedDB
 */
export async function loadOfflineBackupWithIndexedDB(): Promise<TelitianRecord[]> {
  const syncRecords = getLocalBackupRecords();
  if (syncRecords.length > 0) {
    // Sinkronkan juga ke IndexedDB di latar belakang
    saveToIndexedDB(syncRecords).catch(() => {});
    return syncRecords;
  }

  try {
    const fromIdb = await loadFromIndexedDB();
    if (fromIdb && fromIdb.length > 0) {
      // Pulihkan ke localStorage
      saveLocalBackupRecords(fromIdb);
      return fromIdb;
    }
  } catch (e) {
    console.warn('Error checking IndexedDB:', e);
  }

  return [];
}

/**
 * Save entire records database to localStorage snapshot and IndexedDB.
 */
export function saveLocalBackupRecords(records: TelitianRecord[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_BACKUP, JSON.stringify(records));
    localStorage.setItem(STORAGE_KEY_LAST_SYNC, new Date().toISOString());
    // Simpan ke IndexedDB (Dexie) untuk ketahanan data ekstra
    saveToIndexedDB(records).catch((e) => console.warn('IndexedDB sync error:', e));
  } catch (err) {
    console.warn('Error saving local offline backup:', err);
  }
}

export const saveOfflineBackup = saveLocalBackupRecords;

/**
 * Clear local backup (used upon manual reset to 0)
 */
export function clearLocalBackup(): void {
  try {
    localStorage.removeItem(STORAGE_KEY_BACKUP);
    localStorage.removeItem(STORAGE_KEY_QUEUE);
    localStorage.removeItem('telitian_backup_cache');
    clearIndexedDB().catch(() => {});
  } catch (e) {
    // Ignored
  }
}

export const clearOfflineBackup = clearLocalBackup;

/**
 * Get items waiting in offline queue
 */
export function getPendingQueue(): TelitianRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_QUEUE);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    // Ignored
  }
  return [];
}

export const getPendingOfflineRecords = getPendingQueue;

/**
 * Add a record to offline queue
 */
export function enqueueOfflineRecord(record: TelitianRecord): void {
  try {
    const queue = getPendingQueue();
    queue.push(record);
    localStorage.setItem(STORAGE_KEY_QUEUE, JSON.stringify(queue));
    putRecordToIndexedDB(record).catch(() => {});
  } catch (e) {
    // Ignored
  }
}

export const queueOfflineRecord = enqueueOfflineRecord;

/**
 * Clear offline queue
 */
export function clearPendingQueue(): void {
  try {
    localStorage.removeItem(STORAGE_KEY_QUEUE);
  } catch (e) {
    // Ignored
  }
}

/**
 * Create an emergency offline record when network fails
 */
export function createOfflineRecord(
  data: { name: string; address: string; amount: number },
  currentCount: number
): TelitianRecord {
  const { date, time } = formatDateTimeJakarta();
  const tempId = `TLT-OFFLINE-${Date.now()}`;
  return {
    id: tempId,
    no: currentCount + 1,
    name: data.name.trim(),
    address: (data.address || '').trim(),
    amount: data.amount,
    dateInput: date,
    timeInput: `${time} WIB`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    syncStatus: 'pending',
    isOffline: true,
  };
}

/**
 * Synchronize offline records to server batch endpoint
 */
export async function syncPendingRecordsToServer(): Promise<{
  success: boolean;
  message?: string;
  count?: number;
}> {
  const queue = getPendingQueue();
  if (queue.length === 0) {
    return { success: true, count: 0, message: 'Tidak ada data offline yang tertunda.' };
  }

  try {
    const res = await fetch('/api/records/sync-offline', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        records: queue.map((r) => ({
          name: r.name,
          address: r.address,
          amount: r.amount,
          dateInput: r.dateInput,
          timeInput: r.timeInput,
          createdAt: r.createdAt,
        })),
      }),
    });

    const data = await res.json();
    if (data.success) {
      clearPendingQueue();
      return {
        success: true,
        count: data.count || queue.length,
        message: data.message || `Berhasil menyinkronkan ${data.count || queue.length} data ke server!`,
      };
    } else {
      return { success: false, message: data.error || 'Server menolak sinkronisasi data.' };
    }
  } catch (err: any) {
    return { success: false, message: err.message || 'Koneksi ke server gagal.' };
  }
}
