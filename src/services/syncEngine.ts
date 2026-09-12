import { db, type LocalRecord, type SyncQueueItem, type QueueAction } from '../db/database.ts';

// Configurable constants
export const CLOUD_SYNC_INTERVAL = 5000; // 5 seconds when active
export const BACKGROUND_SYNC_INTERVAL = 20000; // 20 seconds when background
export const SYNC_BATCH_SIZE = 25; // Maximum items per batch request

export type CloudConnectionStatus = 'online' | 'offline' | 'syncing' | 'error';

export interface SyncStats {
  totalData: number;
  totalUang: number;
  lastInput?: string;
  source?: string;
}

export interface SyncEngineListener {
  onStatusChange?: (status: CloudConnectionStatus, details?: string) => void;
  onRecordsUpdated?: () => void;
  onNewCloudRecords?: (count: number) => void;
  onStatsUpdated?: (stats: SyncStats) => void;
}

class SyncEngine {
  private syncTimer: any = null;
  private isSyncing = false;
  private listeners: Set<SyncEngineListener> = new Set();
  private isTabActive = true;
  private isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
  private consecutiveFailures = 0;
  private backoffDelays = [2000, 5000, 10000, 30000, 60000];

  constructor() {
    this.initListeners();
  }

  public subscribe(listener: SyncEngineListener) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyStatus(status: CloudConnectionStatus, details?: string) {
    this.listeners.forEach((l) => l.onStatusChange?.(status, details));
  }

  private notifyRecordsUpdated() {
    this.listeners.forEach((l) => l.onRecordsUpdated?.());
  }

  private notifyNewCloudRecords(count: number) {
    if (count > 0) {
      this.listeners.forEach((l) => l.onNewCloudRecords?.(count));
    }
  }

  private notifyStats(stats: SyncStats) {
    this.listeners.forEach((l) => l.onStatsUpdated?.(stats));
  }

  private initListeners() {
    if (typeof window === 'undefined') return;

    window.addEventListener('online', () => {
      this.isOnline = true;
      this.consecutiveFailures = 0;
      this.notifyStatus('online', 'Internet tersambung kembali. Menjalankan sinkronisasi...');
      this.triggerSync();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
      this.notifyStatus('offline', 'Offline. Data tetap aman di perangkat.');
    });

    window.addEventListener('focus', () => {
      this.isTabActive = true;
      this.triggerSync();
    });

    document.addEventListener('visibilitychange', () => {
      this.isTabActive = document.visibilityState === 'visible';
      if (this.isTabActive) {
        this.triggerSync();
        this.startLoop(CLOUD_SYNC_INTERVAL);
      } else {
        this.startLoop(BACKGROUND_SYNC_INTERVAL);
      }
    });
  }

  public start() {
    this.startLoop(CLOUD_SYNC_INTERVAL);
    // Initial sync
    setTimeout(() => {
      this.triggerSync();
    }, 500);
  }

  private startLoop(interval: number) {
    if (this.syncTimer) clearInterval(this.syncTimer);
    this.syncTimer = setInterval(() => {
      if (this.isOnline) {
        this.triggerSync();
      }
    }, interval);
  }

  public async triggerSync(force = false) {
    if (this.isSyncing) return;
    if (!this.isOnline && !force) {
      this.notifyStatus('offline', 'Data lokal tetap aman di perangkat.');
      return;
    }

    this.isSyncing = true;
    this.notifyStatus('syncing', 'Menghubungkan ke cloud...');

    try {
      // 1. Sync pending local changes first
      await this.syncPendingLocalChanges();

      // 2. Fetch delta changes from cloud
      const newCount = await this.fetchCloudChanges();
      if (newCount > 0) {
        this.notifyNewCloudRecords(newCount);
      }

      // 3. Fetch authoritative stats
      await this.fetchServerStats();

      // 4. Update last sync time
      const nowIso = new Date().toISOString();
      await db.settings.put({ key: 'lastSuccessfulSyncAt', value: nowIso });

      this.consecutiveFailures = 0;
      this.notifyStatus('online', 'Cloud tersambung');
    } catch (err: any) {
      this.consecutiveFailures++;
      console.warn('[SyncEngine Error]', err);
      const delay = this.backoffDelays[Math.min(this.consecutiveFailures, this.backoffDelays.length - 1)];
      this.notifyStatus('error', `Cloud sementara tidak tersedia (${err.message || 'Network error'}). Data aman di perangkat.`);
    } finally {
      this.isSyncing = false;
      this.notifyRecordsUpdated();
    }
  }

  /**
   * Sync pending changes from IndexedDB to server in batches
   */
  public async syncPendingLocalChanges(): Promise<number> {
    const pendingItems = await db.syncQueue
      .filter((q) => q.status === 'pending' || q.status === 'failed')
      .toArray();

    if (pendingItems.length === 0) return 0;

    let syncedCount = 0;

    // Process in batches of SYNC_BATCH_SIZE
    for (let i = 0; i < pendingItems.length; i += SYNC_BATCH_SIZE) {
      const chunk = pendingItems.slice(i, i + SYNC_BATCH_SIZE);

      // Mark in-flight
      for (const item of chunk) {
        if (item.queueId) {
          await db.syncQueue.update(item.queueId, { status: 'in-flight', lastAttemptAt: new Date().toISOString() });
        }
      }

      try {
        const batchPayload = [];
        for (const item of chunk) {
          const rec = await db.records.get(item.recordId);
          if (rec) {
            batchPayload.push({
              action: item.action,
              record: rec,
              expectedVersion: item.action === 'UPDATE' ? rec.version : undefined,
            });
          }
        }

        if (batchPayload.length === 0) {
          // Remove orphan queue items
          for (const item of chunk) {
            if (item.queueId) await db.syncQueue.delete(item.queueId);
          }
          continue;
        }

        const res = await fetch('/api/sync/batch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ items: batchPayload }),
        });

        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }

        const data = await res.json();
        const results = data.results || [];

        // Handle each result
        for (const result of results) {
          const queueItem = chunk.find((c) => c.recordId === result.id);
          if (!queueItem || !queueItem.queueId) continue;

          if (result.success) {
            // Update local record to synced with latest sequence & timestamps
            if (result.record) {
              await db.records.update(result.id, {
                sequence: result.record.sequence,
                version: result.record.version,
                updatedAt: result.record.updatedAt,
                createdAt: result.record.createdAt,
                syncStatus: 'synced',
                deleted: result.record.deleted || false,
              });
            } else {
              await db.records.update(result.id, { syncStatus: 'synced' });
            }

            // Remove from queue
            await db.syncQueue.delete(queueItem.queueId);
            syncedCount++;
          } else if (result.conflict) {
            // 409 Conflict: Update local version with cloud data
            if (result.currentRecord) {
              await db.records.update(result.id, {
                nama: result.currentRecord.nama,
                alamat: result.currentRecord.alamat,
                jumlah: result.currentRecord.jumlah,
                version: result.currentRecord.version,
                syncStatus: 'synced',
                lastSyncError: 'Konflik: Data telah diperbarui dari server.',
              });
            }
            await db.syncQueue.delete(queueItem.queueId);
          } else {
            // Failure on single item
            await db.syncQueue.update(queueItem.queueId, {
              status: 'failed',
              attempts: (queueItem.attempts || 0) + 1,
              error: result.message || 'Gagal sinkronisasi item',
            });
            await db.records.update(result.id, {
              syncStatus: 'sync-error',
              lastSyncError: result.message,
            });
          }
        }
      } catch (err: any) {
        // Entire batch failed
        for (const item of chunk) {
          if (item.queueId) {
            await db.syncQueue.update(item.queueId, {
              status: 'failed',
              attempts: (item.attempts || 0) + 1,
              error: err.message,
            });
          }
          await db.records.update(item.recordId, {
            syncStatus: 'pending-create',
            lastSyncError: err.message,
          });
        }
        throw err;
      }
    }

    return syncedCount;
  }

  /**
   * Fetch delta changes using cursor / since timestamp
   */
  public async fetchCloudChanges(): Promise<number> {
    const cursorSetting = await db.settings.get('syncCursor');
    const sinceSetting = await db.settings.get('lastCloudSyncAt');

    const cursor = cursorSetting?.value || '';
    const since = sinceSetting?.value || '';

    const url = new URL('/api/records', window.location.origin);
    url.searchParams.set('changes', 'true');
    if (cursor) url.searchParams.set('cursor', cursor);
    if (since) url.searchParams.set('since', since);

    const res = await fetch(url.toString(), {
      headers: { 'Accept': 'application/json' },
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

    const data = await res.json();
    const records = data.records || [];
    let newOrUpdatedCount = 0;

    for (const cloudRec of records) {
      const local = await db.records.get(cloudRec.id);

      // Do NOT overwrite local record if it has pending local changes!
      if (local && (local.syncStatus === 'pending-update' || local.syncStatus === 'pending-delete')) {
        continue;
      }

      if (cloudRec.deleted) {
        // Soft-deleted in cloud
        if (local) {
          await db.records.update(cloudRec.id, {
            deleted: true,
            version: cloudRec.version,
            updatedAt: cloudRec.updatedAt,
            syncStatus: 'synced',
          });
        }
      } else {
        const isNew = !local;
        await db.records.put({
          id: cloudRec.id,
          no: cloudRec.sequence || cloudRec.no || 1,
          name: cloudRec.name || cloudRec.nama || '',
          address: cloudRec.address || cloudRec.alamat || '',
          amount: Number(cloudRec.amount || cloudRec.jumlah) || 0,
          dateInput: cloudRec.dateInput || '',
          timeInput: cloudRec.timeInput || '',
          clientRequestId: cloudRec.clientRequestId || `imported-${cloudRec.id}`,
          sequence: cloudRec.sequence,
          nama: cloudRec.nama,
          alamat: cloudRec.alamat,
          jumlah: Number(cloudRec.jumlah) || 0,
          createdAt: cloudRec.createdAt,
          updatedAt: cloudRec.updatedAt,
          version: cloudRec.version || 1,
          deleted: false,
          syncStatus: 'synced',
        });
        if (isNew) {
          newOrUpdatedCount++;
        }
      }
    }

    if (data.nextCursor) {
      await db.settings.put({ key: 'syncCursor', value: data.nextCursor });
    }
    if (data.serverTime) {
      await db.settings.put({ key: 'lastCloudSyncAt', value: data.serverTime });
    }

    return newOrUpdatedCount;
  }

  /**
   * Fetch server authoritative stats
   */
  public async fetchServerStats(): Promise<SyncStats | null> {
    try {
      const res = await fetch('/api/stats', { headers: { 'Accept': 'application/json' } });
      if (res.ok) {
        const stats = await res.json();
        this.notifyStats(stats);
        return stats;
      }
    } catch (e) {
      // Ignore stats network error
    }
    return null;
  }

  /**
   * Client-side Create Action
   * Optimistically writes to IndexedDB + queue, triggers background sync
   */
  public async createRecord(nama: string, alamat: string, jumlah: number) {
    const id = crypto.randomUUID();
    const clientRequestId = crypto.randomUUID();
    const now = new Date().toISOString();

    // Get max local sequence for temporary display until cloud assigns authoritative sequence
    const maxLocalRec = await db.records.orderBy('sequence').last();
    const tempSequence = maxLocalRec && maxLocalRec.sequence ? maxLocalRec.sequence + 1 : 1001;

    const newRec: LocalRecord = {
      id,
      no: tempSequence,
      name: nama.trim(),
      address: alamat.trim(),
      amount: jumlah,
      dateInput: new Date().toLocaleDateString('id-ID'),
      timeInput: new Date().toLocaleTimeString('id-ID'),
      clientRequestId,
      sequence: tempSequence,
      nama: nama.trim(),
      alamat: alamat.trim(),
      jumlah,
      createdAt: now,
      updatedAt: now,
      version: 1,
      deleted: false,
      syncStatus: 'pending-create',
    };

    // 1. Save to records
    await db.records.put(newRec);

    // 2. Save to syncQueue
    await db.syncQueue.add({
      recordId: id,
      requestId: clientRequestId,
      action: 'CREATE',
      attempts: 0,
      createdAt: now,
      status: 'pending',
    });

    this.notifyRecordsUpdated();

    // 3. Trigger immediate cloud sync
    this.triggerSync();

    return newRec;
  }

  /**
   * Client-side Update Action
   */
  public async updateRecord(id: string, nama: string, alamat: string, jumlah: number) {
    const existing = await db.records.get(id);
    if (!existing) throw new Error('Record not found');

    const now = new Date().toISOString();
    const clientRequestId = crypto.randomUUID();

    const updatedRec: LocalRecord = {
      ...existing,
      nama: nama.trim(),
      alamat: alamat.trim(),
      jumlah,
      updatedAt: now,
      syncStatus: 'pending-update',
    };

    await db.records.put(updatedRec);

    await db.syncQueue.add({
      recordId: id,
      requestId: clientRequestId,
      action: 'UPDATE',
      attempts: 0,
      createdAt: now,
      status: 'pending',
    });

    this.notifyRecordsUpdated();
    this.triggerSync();

    return updatedRec;
  }

  /**
   * Client-side Soft Delete Action
   */
  public async deleteRecord(id: string) {
    const existing = await db.records.get(id);
    if (!existing) return;

    const now = new Date().toISOString();
    const clientRequestId = crypto.randomUUID();

    // Mark as deleted in local database
    await db.records.update(id, {
      deleted: true,
      updatedAt: now,
      syncStatus: 'pending-delete',
    });

    await db.syncQueue.add({
      recordId: id,
      requestId: clientRequestId,
      action: 'DELETE',
      attempts: 0,
      createdAt: now,
      status: 'pending',
    });

    this.notifyRecordsUpdated();
    this.triggerSync();
  }
}

export const syncEngine = new SyncEngine();
