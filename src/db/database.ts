import Dexie, { type Table } from 'dexie';
import { TelitianRecord } from '../types/record';

export type SyncStatus = 'pending-create' | 'pending-update' | 'pending-delete' | 'synced' | 'sync-error' | 'pending';

export interface LocalRecord extends TelitianRecord {
  clientRequestId?: string;
  sequence?: number;
  version?: number;
  deleted?: boolean;
  syncStatus?: SyncStatus;
  lastSyncError?: string;
  nama?: string;
  alamat?: string;
  jumlah?: number;
}

export type QueueAction = 'CREATE' | 'UPDATE' | 'DELETE';

export interface SyncQueueItem {
  queueId?: number;
  requestId?: string;
  recordId: string;
  action: QueueAction;
  attempts: number;
  createdAt: string;
  lastAttemptAt?: string;
  status: 'pending' | 'in-flight' | 'failed';
  error?: string;
  payload?: any;
}

export interface AppSetting {
  key: string;
  value: any;
}

export class TelitianGibranDatabase extends Dexie {
  records!: Table<LocalRecord, string>;
  syncQueue!: Table<SyncQueueItem, number>;
  settings!: Table<AppSetting, string>;

  constructor() {
    super('TelitianGibranDB');
    this.version(2).stores({
      records: '&id, no, name, address, amount, dateInput, timeInput, createdAt, updatedAt, syncStatus',
      syncQueue: '++queueId, recordId, action, attempts, createdAt, status',
      settings: '&key',
    });
  }
}

export const db = new TelitianGibranDatabase();

/**
 * Simpan seluruh array records ke IndexedDB Dexie
 */
export async function saveToIndexedDB(records: TelitianRecord[]): Promise<void> {
  try {
    if (!records || records.length === 0) {
      await db.records.clear();
      return;
    }
    await db.transaction('rw', db.records, async () => {
      await db.records.clear();
      await db.records.bulkPut(records as LocalRecord[]);
    });
  } catch (err) {
    console.warn('Gagal menyimpan ke IndexedDB:', err);
  }
}

/**
 * Muat data records dari IndexedDB Dexie
 */
export async function loadFromIndexedDB(): Promise<TelitianRecord[]> {
  try {
    const list = await db.records.orderBy('no').toArray();
    return list;
  } catch (err) {
    console.warn('Gagal memuat dari IndexedDB:', err);
    return [];
  }
}

/**
 * Simpan atau perbarui 1 record di IndexedDB
 */
export async function putRecordToIndexedDB(record: TelitianRecord): Promise<void> {
  try {
    await db.records.put(record as LocalRecord);
  } catch (err) {
    console.warn('Gagal update record di IndexedDB:', err);
  }
}

/**
 * Hapus 1 record dari IndexedDB
 */
export async function deleteRecordFromIndexedDB(id: string): Promise<void> {
  try {
    await db.records.delete(id);
  } catch (err) {
    console.warn('Gagal hapus record dari IndexedDB:', err);
  }
}

/**
 * Bersihkan seluruh IndexedDB
 */
export async function clearIndexedDB(): Promise<void> {
  try {
    await db.records.clear();
    await db.syncQueue.clear();
  } catch (err) {
    console.warn('Gagal reset IndexedDB:', err);
  }
}
