/**
 * Google Apps Script Proxy and Cloud Sync Service
 * Handles server-side communication with Google Sheets / Google Apps Script
 * Provides atomic sequence, anti-duplication, versioning, conflict handling, and health checking.
 */

export interface CloudRecord {
  id: string;
  clientRequestId: string;
  sequence: number;
  nama: string;
  alamat: string;
  jumlah: number;
  createdAt: string;
  updatedAt: string;
  version: number;
  deleted: boolean;
}

export interface SyncBatchItem {
  action: 'CREATE' | 'UPDATE' | 'DELETE';
  record: CloudRecord;
  expectedVersion?: number;
}

// In-memory fallback database when GOOGLE_APPS_SCRIPT_URL is not yet configured,
// ensuring multi-device / multi-tab synchronization works out of the box in preview!
class LocalMemoryCloudStorage {
  private records: Map<string, CloudRecord> = new Map();
  private deletedRecords: Map<string, CloudRecord> = new Map();
  private clientRequestIds: Map<string, string> = new Map(); // clientRequestId -> recordId
  private currentSequence = 1000;

  constructor() {
    // Seed with sample initial records if desired or start clean
    const seed = [
      { nama: 'Haji Ahmad Santoso', alamat: 'Gabuskulon RT 02/01', jumlah: 150000 },
      { nama: 'Ibu Hj. Siti Aminah', alamat: 'Gabuswetan', jumlah: 100000 },
      { nama: 'Dedi Kurniawan', alamat: 'Drunten Wetan', jumlah: 200000 },
    ];
    const now = new Date().toISOString();
    seed.forEach((item, idx) => {
      const id = `seed-${idx + 1}`;
      const seq = 1001 + idx;
      this.currentSequence = Math.max(this.currentSequence, seq);
      const rec: CloudRecord = {
        id,
        clientRequestId: `req-seed-${idx + 1}`,
        sequence: seq,
        nama: item.nama,
        alamat: item.alamat,
        jumlah: item.jumlah,
        createdAt: now,
        updatedAt: now,
        version: 1,
        deleted: false,
      };
      this.records.set(id, rec);
      this.clientRequestIds.set(rec.clientRequestId, id);
    });
  }

  getStats() {
    let totalUang = 0;
    let totalData = 0;
    let lastInput = '';

    for (const r of this.records.values()) {
      if (!r.deleted) {
        totalData++;
        totalUang += Number(r.jumlah) || 0;
        if (!lastInput || r.createdAt > lastInput) {
          lastInput = r.createdAt;
        }
      }
    }
    return { totalData, totalUang, lastInput };
  }

  getRecords(limit = 100, page = 1, search = '') {
    const list: CloudRecord[] = [];
    const term = (search || '').toLowerCase().trim();

    for (const r of this.records.values()) {
      if (!r.deleted) {
        if (!term || r.nama.toLowerCase().includes(term) || r.alamat.toLowerCase().includes(term)) {
          list.push(r);
        }
      }
    }
    list.sort((a, b) => a.sequence - b.sequence);
    const total = list.length;
    const start = (page - 1) * limit;
    const paginated = list.slice(start, start + limit);
    return { records: paginated, total, page, limit };
  }

  getChanges(since?: string, cursor?: string) {
    const changed: CloudRecord[] = [];
    const sinceTime = since ? new Date(since).getTime() : 0;
    const cursorSeq = cursor ? parseInt(cursor, 10) : 0;

    for (const r of this.records.values()) {
      const updatedTime = new Date(r.updatedAt).getTime();
      const createdTime = new Date(r.createdAt).getTime();
      if (
        (sinceTime && (updatedTime > sinceTime || createdTime > sinceTime)) ||
        (cursorSeq && r.sequence > cursorSeq) ||
        (!since && !cursor)
      ) {
        changed.push(r);
      }
    }

    // Also include deleted records in delta sync
    for (const r of this.deletedRecords.values()) {
      const updatedTime = new Date(r.updatedAt).getTime();
      if ((sinceTime && updatedTime > sinceTime) || (!since && !cursor)) {
        changed.push(r);
      }
    }

    changed.sort((a, b) => a.sequence - b.sequence);
    const maxSeq = changed.length > 0 ? Math.max(...changed.map((c) => c.sequence)) : this.currentSequence;
    return {
      records: changed,
      nextCursor: String(maxSeq),
      serverTime: new Date().toISOString(),
    };
  }

  create(data: { id: string; clientRequestId: string; nama: string; alamat: string; jumlah: number }) {
    // Idempotency check
    if (this.clientRequestIds.has(data.clientRequestId)) {
      const existingId = this.clientRequestIds.get(data.clientRequestId)!;
      const existing = this.records.get(existingId) || this.deletedRecords.get(existingId);
      return { success: true, alreadyExists: true, record: existing };
    }

    this.currentSequence++;
    const now = new Date().toISOString();
    const newRecord: CloudRecord = {
      id: data.id,
      clientRequestId: data.clientRequestId,
      sequence: this.currentSequence,
      nama: data.nama,
      alamat: data.alamat,
      jumlah: Number(data.jumlah) || 0,
      createdAt: now,
      updatedAt: now,
      version: 1,
      deleted: false,
    };

    this.records.set(data.id, newRecord);
    this.clientRequestIds.set(data.clientRequestId, data.id);
    return { success: true, record: newRecord };
  }

  update(id: string, updateData: Partial<CloudRecord>, expectedVersion?: number) {
    const existing = this.records.get(id);
    if (!existing) {
      return { success: false, notFound: true, message: 'Data tidak ditemukan' };
    }

    if (expectedVersion !== undefined && existing.version !== expectedVersion) {
      return {
        success: false,
        conflict: true,
        code: 409,
        message: 'Konflik: Versi data di cloud sudah diperbarui oleh perangkat lain.',
        currentRecord: existing,
      };
    }

    const now = new Date().toISOString();
    existing.nama = updateData.nama ?? existing.nama;
    existing.alamat = updateData.alamat ?? existing.alamat;
    existing.jumlah = updateData.jumlah !== undefined ? Number(updateData.jumlah) : existing.jumlah;
    existing.updatedAt = now;
    existing.version = (existing.version || 1) + 1;

    return { success: true, record: existing };
  }

  delete(id: string) {
    const existing = this.records.get(id);
    if (!existing) {
      return { success: false, notFound: true, message: 'Data tidak ditemukan' };
    }

    const now = new Date().toISOString();
    existing.deleted = true;
    existing.updatedAt = now;
    existing.version = (existing.version || 1) + 1;

    this.records.delete(id);
    this.deletedRecords.set(id, existing);

    return { success: true, record: existing };
  }

  batchSync(items: SyncBatchItem[]) {
    const results: any[] = [];
    for (const item of items) {
      if (item.action === 'CREATE') {
        const res = this.create(item.record);
        results.push({
          id: item.record.id,
          clientRequestId: item.record.clientRequestId,
          action: 'CREATE',
          success: res.success,
          record: res.record,
          alreadyExists: (res as any).alreadyExists,
        });
      } else if (item.action === 'UPDATE') {
        const res = this.update(item.record.id, item.record, item.expectedVersion);
        results.push({
          id: item.record.id,
          action: 'UPDATE',
          success: res.success,
          conflict: (res as any).conflict,
          record: (res as any).record,
        });
      } else if (item.action === 'DELETE') {
        const res = this.delete(item.record.id);
        results.push({
          id: item.record.id,
          action: 'DELETE',
          success: res.success,
          record: (res as any).record,
        });
      }
    }
    return { success: true, results, serverTime: new Date().toISOString() };
  }
}

// Global singleton for memory storage
const memoryStore = new LocalMemoryCloudStorage();

/**
 * Forward request safely to Google Apps Script if URL is configured
 */
async function callAppsScript(action: string, method: 'GET' | 'POST', body?: any, queryParams: Record<string, string> = {}) {
  const gasUrl = process.env.GOOGLE_APPS_SCRIPT_URL;
  const gasSecret = process.env.APPS_SCRIPT_SECRET || '';

  if (!gasUrl) {
    return null; // Signals caller to use local memory cloud fallback
  }

  const url = new URL(gasUrl);
  url.searchParams.set('action', action);
  if (gasSecret) {
    url.searchParams.set('secret', gasSecret);
  }
  for (const [k, v] of Object.entries(queryParams)) {
    if (v !== undefined && v !== null) {
      url.searchParams.set(k, String(v));
    }
  }

  const options: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    // Follow redirect because Google Apps Script always responds with 302 redirect
    redirect: 'follow',
  };

  if (method === 'POST' && body) {
    options.body = JSON.stringify({
      ...body,
      secret: gasSecret,
    });
  }

  try {
    const response = await fetch(url.toString(), options);
    const raw = await response.text();

    // Guard against Apps Script returning HTML (e.g., authorization error or 404)
    if (raw.trim().startsWith('<')) {
      console.error('[Apps Script Error] Returned HTML instead of JSON:', raw.slice(0, 300));
      return {
        success: false,
        isHtmlError: true,
        message: 'Apps Script mengembalikan HTML. Periksa deployment Web App (Pastikan Who has access = Anyone).',
      };
    }

    try {
      const parsed = JSON.parse(raw);
      return parsed;
    } catch (parseErr) {
      console.error('[Apps Script JSON Parse Error]', raw);
      return {
        success: false,
        message: 'Gagal memproses respon dari Google Apps Script.',
        raw: raw.slice(0, 200),
      };
    }
  } catch (err: any) {
    console.error('[Apps Script Network Error]', err);
    return {
      success: false,
      networkError: true,
      message: err.message || 'Tidak dapat menghubungi Google Apps Script',
    };
  }
}

export const GasService = {
  async checkHealth() {
    const gasUrl = process.env.GOOGLE_APPS_SCRIPT_URL;
    if (!gasUrl) {
      return {
        success: true,
        cloud: 'local_server_ready',
        message: 'Server lokal aktif. Siap dikoneksikan ke Google Sheets & Google Apps Script.',
        configured: false,
        stats: memoryStore.getStats(),
      };
    }

    const gasRes = await callAppsScript('health', 'GET');
    if (gasRes && gasRes.success) {
      return {
        success: true,
        cloud: 'connected',
        target: 'Google Sheets (Live)',
        configured: true,
        gasResponse: gasRes,
      };
    }

    return {
      success: false,
      cloud: 'error',
      configured: true,
      error: gasRes?.message || 'Gagal menghubungi Google Apps Script',
      isHtmlError: gasRes?.isHtmlError,
    };
  },

  async getStats() {
    const gasRes = await callAppsScript('getStats', 'GET');
    if (gasRes && gasRes.success) {
      return gasRes;
    }
    return {
      success: true,
      ...memoryStore.getStats(),
      source: process.env.GOOGLE_APPS_SCRIPT_URL ? 'fallback' : 'local_cloud_server',
    };
  },

  async getRecords(params: { page?: number; limit?: number; search?: string }) {
    const gasRes = await callAppsScript('getData', 'GET', undefined, {
      page: String(params.page || 1),
      limit: String(params.limit || 50),
      search: params.search || '',
    });
    if (gasRes && gasRes.success) {
      return gasRes;
    }
    return {
      success: true,
      ...memoryStore.getRecords(params.limit, params.page, params.search),
    };
  },

  async getChanges(params: { since?: string; cursor?: string }) {
    const gasRes = await callAppsScript('getChanges', 'GET', undefined, {
      since: params.since || '',
      cursor: params.cursor || '',
    });
    if (gasRes && gasRes.success) {
      return gasRes;
    }
    return {
      success: true,
      ...memoryStore.getChanges(params.since, params.cursor),
    };
  },

  async createRecord(record: { id: string; clientRequestId: string; nama: string; alamat: string; jumlah: number }) {
    const gasRes = await callAppsScript('createData', 'POST', record);
    if (gasRes && gasRes.success) {
      return gasRes;
    }
    return memoryStore.create(record);
  },

  async updateRecord(id: string, updateData: Partial<CloudRecord>, expectedVersion?: number) {
    const gasRes = await callAppsScript('updateData', 'POST', { id, updateData, expectedVersion });
    if (gasRes) {
      return gasRes;
    }
    return memoryStore.update(id, updateData, expectedVersion);
  },

  async deleteRecord(id: string) {
    const gasRes = await callAppsScript('deleteData', 'POST', { id });
    if (gasRes) {
      return gasRes;
    }
    return memoryStore.delete(id);
  },

  async batchSync(items: SyncBatchItem[]) {
    const gasRes = await callAppsScript('batchSync', 'POST', { items });
    if (gasRes && gasRes.success) {
      return gasRes;
    }
    return memoryStore.batchSync(items);
  },
};
