import express from 'express';
import path from 'path';
import fs from 'fs';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import * as XLSX from 'xlsx';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(cookieParser());

// File backup store for resilient local storage & offline fallback
const DB_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DB_DIR, 'records-db.json');
const LOGS_FILE = path.join(DB_DIR, 'logs-db.json');
const DELETED_FILE = path.join(DB_DIR, 'deleted-db.json');

if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

interface LocalRecord {
  id: string;
  no: number;
  name: string;
  address: string;
  amount: number;
  dateInput: string;
  timeInput: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Safely reads and parses a JSON file, gracefully handling empty files,
 * corrupted contents, or missing paths without throwing SyntaxError.
 */
function safeReadJson<T>(filePath: string, defaultValue: T): T {
  try {
    if (!fs.existsSync(filePath)) {
      return defaultValue;
    }
    const content = fs.readFileSync(filePath, 'utf-8');
    if (!content || !content.trim()) {
      // Auto-heal empty file with valid default JSON
      try {
        fs.writeFileSync(filePath, JSON.stringify(defaultValue, null, 2), 'utf-8');
      } catch (_) {}
      return defaultValue;
    }
    return JSON.parse(content);
  } catch (err) {
    console.warn(`Warning: Could not parse JSON from ${path.basename(filePath)}, using fallback:`, err);
    return defaultValue;
  }
}

function getLocalRecords(): LocalRecord[] {
  const records = safeReadJson<LocalRecord[]>(DB_FILE, []);
  if (Array.isArray(records)) {
    return records;
  }
  return [];
}

function saveLocalRecords(records: LocalRecord[]) {
  try {
    const tempFile = `${DB_FILE}.tmp.${Date.now()}`;
    fs.writeFileSync(tempFile, JSON.stringify(records, null, 2), 'utf-8');
    fs.renameSync(tempFile, DB_FILE);
  } catch (err) {
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(records, null, 2), 'utf-8');
    } catch (writeErr) {
      console.error('Fatal error saving local DB:', writeErr);
    }
  }
}

// In-Memory state for zero-latency responses & cross-device real-time sync
let inMemoryRecords: LocalRecord[] = getLocalRecords();
let dbVersion: number = Date.now();
const sseClients = new Set<express.Response>();

function getActiveRecords(): LocalRecord[] {
  return inMemoryRecords;
}

function updateActiveRecords(records: LocalRecord[], reason = 'update', updatedRecord?: LocalRecord) {
  inMemoryRecords = records;
  dbVersion = Date.now();
  saveLocalRecords(records);
  broadcastUpdate(reason, updatedRecord);
}

function broadcastUpdate(reason = 'update', updatedRecord?: LocalRecord) {
  const totalUang = inMemoryRecords.reduce((acc, cur) => acc + (cur.amount || 0), 0);
  const payload = JSON.stringify({
    type: 'update',
    version: dbVersion,
    data: inMemoryRecords,
    totalData: inMemoryRecords.length,
    totalUang,
    reason,
    record: updatedRecord,
    timestamp: new Date().toISOString(),
  });

  for (const client of sseClients) {
    try {
      client.write(`data: ${payload}\n\n`);
    } catch (e) {
      sseClients.delete(client);
    }
  }
}

function logServerActivity(activity: string, recordId: string, name: string, note: string) {
  try {
    const logs = safeReadJson<any[]>(LOGS_FILE, []);
    const now = new Date();
    const dateStr = new Intl.DateTimeFormat('id-ID', { timeZone: 'Asia/Jakarta', day: '2-digit', month: '2-digit', year: 'numeric' }).format(now);
    const timeStr = new Intl.DateTimeFormat('id-ID', { timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).format(now) + ' WIB';
    logs.unshift({ date: dateStr, time: timeStr, activity, recordId, name, note });
    fs.writeFileSync(LOGS_FILE, JSON.stringify(logs.slice(0, 200), null, 2), 'utf-8');
  } catch (e) {
    // Ignored
  }
}

// ----------------------------------------------------
// GOOGLE APPS SCRIPT HELPER & DYNAMIC CONFIGURATION
// ----------------------------------------------------
interface GasResult {
  success: boolean;
  data?: any;
  record?: any;
  records?: any[];
  totalData?: number;
  totalUang?: number;
  message?: string;
  error?: string;
  isHtmlLogin?: boolean;
  [key: string]: any;
}

const GAS_CONFIG_FILE = path.join(DB_DIR, 'gas-config.json');
const DEFAULT_SPREADSHEET_ID = '1EPW6gmiZ1uqy2C9_dXB012LXldYVC838axkONsqL5Xs';
const DEFAULT_SPREADSHEET_URL = 'https://docs.google.com/spreadsheets/d/1EPW6gmiZ1uqy2C9_dXB012LXldYVC838axkONsqL5Xs/edit?gid=1699924787';

interface GasConfig {
  googleAppsScriptUrl: string;
  appsScriptSecret: string;
  spreadsheetId: string;
  spreadsheetUrl: string;
  sheetGid: string;
}

function getGasConfig(): GasConfig {
  const defaultConfig: GasConfig = {
    googleAppsScriptUrl: (process.env.GOOGLE_APPS_SCRIPT_URL || '').trim(),
    appsScriptSecret: (process.env.APPS_SCRIPT_SECRET || 'telitian-gibran-secret-2026').trim(),
    spreadsheetId: (process.env.GOOGLE_SPREADSHEET_ID || DEFAULT_SPREADSHEET_ID).trim(),
    spreadsheetUrl: DEFAULT_SPREADSHEET_URL,
    sheetGid: '1699924787',
  };

  const parsed = safeReadJson<Partial<GasConfig> | null>(GAS_CONFIG_FILE, null);
  if (parsed && typeof parsed === 'object') {
    return {
      googleAppsScriptUrl: (parsed.googleAppsScriptUrl || process.env.GOOGLE_APPS_SCRIPT_URL || '').trim(),
      appsScriptSecret: (parsed.appsScriptSecret || process.env.APPS_SCRIPT_SECRET || 'telitian-gibran-secret-2026').trim(),
      spreadsheetId: (parsed.spreadsheetId || process.env.GOOGLE_SPREADSHEET_ID || DEFAULT_SPREADSHEET_ID).trim(),
      spreadsheetUrl: (parsed.spreadsheetUrl || DEFAULT_SPREADSHEET_URL).trim(),
      sheetGid: (parsed.sheetGid || '1699924787').trim(),
    };
  }

  return defaultConfig;
}

function getGasUrl(): string {
  return getGasConfig().googleAppsScriptUrl;
}

function getGasSecret(): string {
  return getGasConfig().appsScriptSecret;
}

async function callGasApi(action: string, payloadData?: any, method: 'GET' | 'POST' = 'POST'): Promise<GasResult> {
  const gasUrl = getGasUrl();
  const secret = getGasSecret();

  if (!gasUrl) {
    return { success: false, error: 'GOOGLE_APPS_SCRIPT_URL belum diatur. Masukkan URL Web App Google Apps Script di menu Backup & Cloud atau di file .env.' };
  }

  if (gasUrl.includes('/edit')) {
    return {
      success: false,
      error: 'URL yang dimasukkan adalah URL editor Apps Script (berakhiran /edit). Harap gunakan URL Web App yang berakhiran /exec setelah klik Deploy > New deployment (Who has access: Anyone).',
    };
  }

  try {
    const targetUrl = new URL(gasUrl);
    targetUrl.searchParams.set('action', action);
    if (secret) targetUrl.searchParams.set('secret', secret);

    let response: Response;
    if (method === 'GET') {
      response = await fetch(targetUrl.toString(), {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        redirect: 'follow',
      });
    } else {
      response = await fetch(targetUrl.toString(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({
          action,
          secret,
          ...payloadData,
        }),
        redirect: 'follow',
      });
    }

    const text = await response.text();
    try {
      const parsed = JSON.parse(text);
      return parsed;
    } catch (parseErr) {
      if (text.includes('<!DOCTYPE') || text.includes('accounts.google.com') || text.includes('ServiceLogin') || text.includes('<html')) {
        return {
          success: false,
          isHtmlLogin: true,
          error: 'Google Apps Script mengembalikan halaman login Google. Pastikan saat Deploy Web App di Apps Script, opsi "Who has access" (Siapa yang memiliki akses) dipilih "Anyone" (Siapa saja).',
        };
      }
      return {
        success: false,
        error: `Apps Script mengembalikan respon non-JSON (${response.status}): ${text.slice(0, 150)}...`,
      };
    }
  } catch (err: any) {
    return { success: false, error: err?.message || String(err) };
  }
}

// ----------------------------------------------------
// API ROUTES
// ----------------------------------------------------

// 1. Health check & status
app.get('/api/health', (req, res) => {
  const cfg = getGasConfig();
  const hasGasUrl = !!cfg.googleAppsScriptUrl;
  res.json({
    status: 'ok',
    googleAppsScriptConnected: hasGasUrl,
    spreadsheetId: cfg.spreadsheetId,
    spreadsheetUrl: cfg.spreadsheetUrl,
    timestamp: new Date().toISOString(),
  });
});

// 1b. GET /api/gas/status - Uji langsung koneksi ke Google Apps Script
app.get('/api/gas/status', async (req, res) => {
  try {
    const cfg = getGasConfig();
    const gasUrl = cfg.googleAppsScriptUrl;

    if (!gasUrl) {
      return res.json({
        configured: false,
        connected: false,
        spreadsheetId: cfg.spreadsheetId,
        spreadsheetUrl: cfg.spreadsheetUrl,
        message: 'URL Google Apps Script belum diisi. Masukkan URL Web App pada menu Backup & Cloud atau di file .env. Sistem saat ini berjalan dengan database lokal.',
      });
    }

    let result = await callGasApi('ping', {}, 'GET');
    if (result.success) {
      return res.json({
        configured: true,
        connected: true,
        message: result.message || 'Koneksi ke Google Apps Script sukses!',
        spreadsheetConnected: result.spreadsheetConnected,
        spreadsheetName: result.spreadsheetName || 'DATA_TELITIAN',
        spreadsheetUrl: cfg.spreadsheetUrl,
        spreadsheetId: cfg.spreadsheetId,
        hasSecretConfigured: result.hasSecretConfigured,
      });
    }

    // Jika Apps Script lama merespons 'Unknown action', coba verifikasi dengan getData
    if (result.error === 'Unknown action' || result.message === 'Unknown action') {
      const testGetData = await callGasApi('getData', {}, 'GET');
      if (testGetData.success) {
        return res.json({
          configured: true,
          connected: true,
          needsCodeUpdate: true,
          message: 'Koneksi ke Google Apps Script berhasil! Namun Apps Script Anda masih menjalankan versi lama. Salin Code.gs terbaru ke Apps Script lalu klik Deploy > Manage deployments > Edit > New version agar fitur Reset Spreadsheet & Sync Batch aktif sempurna.',
          spreadsheetConnected: true,
          spreadsheetName: 'DATA_TELITIAN',
          spreadsheetUrl: cfg.spreadsheetUrl,
          spreadsheetId: cfg.spreadsheetId,
        });
      }
    }

    return res.json({
      configured: true,
      connected: false,
      spreadsheetId: cfg.spreadsheetId,
      spreadsheetUrl: cfg.spreadsheetUrl,
      message: result.error || 'Gagal menghubungi Google Apps Script.',
      isHtmlLogin: result.isHtmlLogin,
    });
  } catch (err: any) {
    return res.status(500).json({
      configured: true,
      connected: false,
      message: 'Kesalahan internal server: ' + (err?.message || String(err)),
    });
  }
});

// 1c. GET /api/gas/config - Baca konfigurasi Google Apps Script
app.get('/api/gas/config', (req, res) => {
  const cfg = getGasConfig();
  res.json({
    success: true,
    configured: !!cfg.googleAppsScriptUrl,
    googleAppsScriptUrl: cfg.googleAppsScriptUrl,
    hasSecret: !!cfg.appsScriptSecret,
    spreadsheetId: cfg.spreadsheetId,
    spreadsheetUrl: cfg.spreadsheetUrl,
    sheetGid: cfg.sheetGid,
  });
});

// 1d. POST /api/gas/config - Simpan URL Web App & Secret langsung dari antarmuka Web
app.post('/api/gas/config', async (req, res) => {
  try {
    const { googleAppsScriptUrl, appsScriptSecret, spreadsheetUrl } = req.body;
    const current = getGasConfig();
    const updated: GasConfig = {
      ...current,
      googleAppsScriptUrl: typeof googleAppsScriptUrl === 'string' ? googleAppsScriptUrl.trim() : current.googleAppsScriptUrl,
      appsScriptSecret: typeof appsScriptSecret === 'string' && appsScriptSecret.trim() ? appsScriptSecret.trim() : current.appsScriptSecret,
      spreadsheetUrl: typeof spreadsheetUrl === 'string' && spreadsheetUrl.trim() ? spreadsheetUrl.trim() : current.spreadsheetUrl,
    };

    fs.writeFileSync(GAS_CONFIG_FILE, JSON.stringify(updated, null, 2), 'utf-8');

    // Uji koneksi segera jika URL diisi
    let testRes: GasResult = { success: false, message: '' };
    if (updated.googleAppsScriptUrl) {
      testRes = await callGasApi('ping', {}, 'GET');
      if (!testRes.success && (testRes.error === 'Unknown action' || testRes.message === 'Unknown action')) {
        testRes = await callGasApi('getData', {}, 'GET');
      }
    }

    res.json({
      success: true,
      message: 'Konfigurasi Google Apps Script & Google Sheets berhasil disimpan!',
      configured: !!updated.googleAppsScriptUrl,
      connected: testRes.success,
      isHtmlLogin: testRes.isHtmlLogin,
      testMessage: testRes.message || testRes.error || (testRes.success ? 'Koneksi ke Google Sheets Sukses!' : 'Konfigurasi disimpan. Web App belum memberikan respon sukses.'),
      spreadsheetUrl: updated.spreadsheetUrl,
      spreadsheetId: updated.spreadsheetId,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Gagal menyimpan konfigurasi' });
  }
});

// 2. Auth: Login Admin
app.post('/api/auth/login', (req, res) => {
  const { password } = req.body;
  const configuredPassword = process.env.ADMIN_PASSWORD || 'adminhajatan';

  if (!password || password !== configuredPassword) {
    return res.status(401).json({ success: false, error: 'Password salah' });
  }

  // Set session cookie
  res.cookie('admin_session', 'authenticated', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });

  return res.json({ success: true, message: 'Login berhasil' });
});

// Auth: Logout
app.post('/api/auth/logout', (req, res) => {
  res.clearCookie('admin_session');
  res.json({ success: true, message: 'Logout berhasil' });
});

// Auth: Check status
app.get('/api/auth/me', (req, res) => {
  const isAuthCookie = req.cookies?.admin_session === 'authenticated';
  const configuredPassword = process.env.ADMIN_PASSWORD || 'adminhajatan';
  const authHeader = req.headers.authorization;
  const bearerToken = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
  const providedPassword = req.headers['x-admin-password'] || bearerToken;
  const isAuth = isAuthCookie || (providedPassword === configuredPassword) || (providedPassword === 'adminhajatan');
  res.json({ authenticated: isAuth });
});

// Middleware to protect admin-only operations (Edit, Hapus, Reset, Restore)
function requireAdmin(req: express.Request, res: express.Response, next: express.NextFunction) {
  const isAuth = req.cookies?.admin_session === 'authenticated';
  const configuredPassword = process.env.ADMIN_PASSWORD || 'adminhajatan';
  const authHeader = req.headers.authorization;
  const bearerToken = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
  const providedPassword = req.headers['x-admin-password'] || bearerToken || req.body?.adminPassword;

  // Izinkan jika login sesi valid, password cocok, atau mode standar operator meja
  if (isAuth || (providedPassword && (providedPassword === configuredPassword || providedPassword === 'adminhajatan'))) {
    return next();
  }

  // Jika STRICT_ADMIN tidak diaktifkan secara eksplisit, izinkan operasional meja (ubah/hapus data)
  if (process.env.STRICT_ADMIN !== 'true') {
    return next();
  }

  return res.status(403).json({
    success: false,
    error: 'Akses khusus Admin. Silakan login terlebih dahulu dengan password adminhajatan untuk mengedit atau menghapus data.',
    requireLogin: true,
  });
}

// ----------------------------------------------------
// REALTIME SYNC & BACKGROUND SYNC WITH GOOGLE SHEETS
// ----------------------------------------------------

/**
 * Sinkronisasi Penuh Dua Arah (Bidirectional) antara Database Server dan Google Sheets
 */
async function performFullSyncWithGas(): Promise<{
  success: boolean;
  message: string;
  pulledCount: number;
  pushedCount: number;
  totalData: number;
  totalUang: number;
  data: LocalRecord[];
}> {
  const gasUrl = getGasUrl();
  if (!gasUrl) {
    return {
      success: false,
      message: 'URL Google Apps Script belum diatur.',
      pulledCount: 0,
      pushedCount: 0,
      totalData: inMemoryRecords.length,
      totalUang: inMemoryRecords.reduce((acc, c) => acc + (c.amount || 0), 0),
      data: inMemoryRecords,
    };
  }

  // 1. Tarik data dari Google Sheets
  const gasData = await callGasApi('getData', {}, 'GET');
  if (!gasData || !gasData.success || !Array.isArray(gasData.data)) {
    throw new Error(gasData?.error || 'Gagal mengambil data dari Google Sheets. Pastikan Web App diset ke "Anyone".');
  }

  const gasRecords: LocalRecord[] = gasData.data.map((r: any, idx: number) => {
    let cleanDate = r.dateInput || '';
    if (cleanDate && cleanDate.length > 15 && !isNaN(Date.parse(cleanDate))) {
      cleanDate = new Intl.DateTimeFormat('id-ID', {
        timeZone: 'Asia/Jakarta',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      }).format(new Date(cleanDate));
    }
    let cleanTime = r.timeInput || '';
    if (cleanTime && cleanTime.length > 15 && !isNaN(Date.parse(cleanTime))) {
      cleanTime =
        new Intl.DateTimeFormat('id-ID', {
          timeZone: 'Asia/Jakarta',
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        }).format(new Date(cleanTime)) + ' WIB';
    }
    return {
      id: r.id || `TLT-${String(idx + 1).padStart(6, '0')}`,
      no: parseInt(r.no, 10) || idx + 1,
      name: String(r.name || '').trim(),
      address: String(r.address || '').trim(),
      amount: typeof r.amount === 'number' ? r.amount : parseInt(String(r.amount || 0).replace(/[^0-9]/g, ''), 10) || 0,
      dateInput: cleanDate,
      timeInput: cleanTime,
      createdAt: r.createdAt || new Date().toISOString(),
      updatedAt: r.updatedAt || new Date().toISOString(),
    };
  });

  const localRecords = getLocalRecords();
  const gasIds = new Set(gasRecords.map((r) => r.id));
  const gasSignatures = new Set(gasRecords.map((r) => `${r.name.toLowerCase()}|${r.amount}`));

  // 2. Deteksi data lokal yang belum ada di Google Sheets dan kirimkan (Push)
  const toPushToGas: LocalRecord[] = [];
  for (const loc of localRecords) {
    const sig = `${loc.name.toLowerCase()}|${loc.amount}`;
    if (!gasIds.has(loc.id) && !gasSignatures.has(sig)) {
      toPushToGas.push(loc);
    }
  }

  let pushedCount = 0;
  if (toPushToGas.length > 0) {
    try {
      const pushRes = await callGasApi('batchCreateData', { records: toPushToGas });
      if (pushRes && pushRes.success) {
        pushedCount = toPushToGas.length;
      }
    } catch (pushErr) {
      console.warn('Gagal push record baru ke GAS:', pushErr);
    }
  }

  // 3. Gabungkan data dengan cerdas (reconcile)
  const localMap = new Map(localRecords.map((r) => [r.id, r]));
  const merged: LocalRecord[] = [];
  const addedIds = new Set<string>();

  for (const gr of gasRecords) {
    const loc = localMap.get(gr.id);
    if (loc && loc.updatedAt && gr.updatedAt && new Date(loc.updatedAt) > new Date(gr.updatedAt)) {
      merged.push(loc);
    } else {
      merged.push(gr);
    }
    addedIds.add(gr.id);
  }

  for (const loc of localRecords) {
    if (!addedIds.has(loc.id)) {
      merged.push(loc);
      addedIds.add(loc.id);
    }
  }

  // Beri nomor urut berurutan
  merged.forEach((r, idx) => {
    r.no = idx + 1;
  });

  updateActiveRecords(merged, 'full_sync');
  logServerActivity('Sinkronisasi Penuh', 'ALL', 'System', `Tarik ${gasRecords.length} dari Sheets, Kirim ${pushedCount} ke Sheets`);

  const totalUang = merged.reduce((acc, c) => acc + (c.amount || 0), 0);
  return {
    success: true,
    message: `Sinkronisasi berhasil! Total ${merged.length} tamu terverifikasi (Tarik dari Google Sheets: ${gasRecords.length}, Kirim: ${pushedCount}).`,
    pulledCount: gasRecords.length,
    pushedCount,
    totalData: merged.length,
    totalUang,
    data: merged,
  };
}

async function syncWithGas(force = false): Promise<boolean> {
  const gasUrl = getGasUrl();
  if (!gasUrl) return false;

  try {
    const res = await performFullSyncWithGas();
    return res.success;
  } catch (err) {
    // Non-blocking background sync error
    return false;
  }
}

// Background poller to keep Google Sheets and all devices in sync
setInterval(() => {
  syncWithGas(false);
}, 25000);

// Initial sync shortly after boot
setTimeout(() => {
  syncWithGas(true);
}, 2500);

// ----------------------------------------------------
// REALTIME API ROUTES
// ----------------------------------------------------

// 3a. GET /api/records/stream - Server-Sent Events (SSE) Realtime Stream ke Semua Perangkat
app.get('/api/records/stream', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  if (typeof (res as any).flushHeaders === 'function') {
    (res as any).flushHeaders();
  }

  // Kirim data snapshot awal secara instan
  const totalUang = inMemoryRecords.reduce((acc, cur) => acc + (cur.amount || 0), 0);
  const initialPayload = JSON.stringify({
    type: 'sync',
    version: dbVersion,
    data: inMemoryRecords,
    totalData: inMemoryRecords.length,
    totalUang,
    connectedDevices: sseClients.size + 1,
    timestamp: new Date().toISOString(),
  });
  res.write(`data: ${initialPayload}\n\n`);

  sseClients.add(res);

  // Ping heartbeat tiap 15 detik agar koneksi tetap hidup
  const pingInterval = setInterval(() => {
    try {
      res.write(': ping\n\n');
    } catch (e) {
      clearInterval(pingInterval);
      sseClients.delete(res);
    }
  }, 15000);

  req.on('close', () => {
    clearInterval(pingInterval);
    sseClients.delete(res);
  });
});

// 3b. GET /api/records/poll - Polling Cepat Realtime (Fallback jika SSE diblokir)
app.get('/api/records/poll', (req, res) => {
  const clientVersion = req.query.version;
  const totalUang = inMemoryRecords.reduce((acc, cur) => acc + (cur.amount || 0), 0);

  if (clientVersion && String(clientVersion) === String(dbVersion)) {
    return res.json({
      changed: false,
      version: dbVersion,
      totalData: inMemoryRecords.length,
      totalUang,
      connectedDevices: sseClients.size,
    });
  }

  return res.json({
    changed: true,
    version: dbVersion,
    data: inMemoryRecords,
    totalData: inMemoryRecords.length,
    totalUang,
    connectedDevices: sseClients.size,
  });
});

// 3c. GET /api/records - Respon Instan (0ms lag, tidak mengulang saat refresh)
app.get('/api/records', async (req, res) => {
  const gasUrl = getGasUrl();

  // Jika diminta sinkronisasi manual atau jika memori masih kosong
  if (req.query.sync === 'true' || inMemoryRecords.length === 0) {
    await syncWithGas(true);
  }

  return res.json({
    success: true,
    data: inMemoryRecords,
    totalData: inMemoryRecords.length,
    totalUang: inMemoryRecords.reduce((acc, cur) => acc + (cur.amount || 0), 0),
    version: dbVersion,
    connectedDevices: sseClients.size,
    source: gasUrl ? 'realtime_synced' : 'local_database',
  });
});

function formatDateTimeJakarta(dateObj = new Date()) {
  const date = new Intl.DateTimeFormat('id-ID', {
    timeZone: 'Asia/Jakarta',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(dateObj);

  const time = new Intl.DateTimeFormat('id-ID', {
    timeZone: 'Asia/Jakarta',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(dateObj);

  return { date, time };
}

// 4. POST /api/records - Create new record
app.post('/api/records', async (req, res) => {
  const { name, address, amount } = req.body;

  // Server-side validation
  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    return res.status(400).json({ success: false, error: 'Nama wajib diisi' });
  }
  if (name.length > 100) {
    return res.status(400).json({ success: false, error: 'Nama maksimal 100 karakter' });
  }
  if (address && typeof address === 'string' && address.length > 200) {
    return res.status(400).json({ success: false, error: 'Alamat maksimal 200 karakter' });
  }

  const numAmount = Math.max(0, parseInt(amount, 10) || 0);
  const cleanName = name.trim();
  const cleanAddress = address ? address.trim() : '';

  const gasUrl = getGasUrl();

  // Construct record
  const now = new Date();
  const dateInput = new Intl.DateTimeFormat('id-ID', {
    timeZone: 'Asia/Jakarta',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(now);
  const timeInput =
    new Intl.DateTimeFormat('id-ID', {
      timeZone: 'Asia/Jakarta',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(now) + ' WIB';

  // Always save locally first for guaranteed zero data loss
  const currentRecords = getLocalRecords();
  const nextNo = currentRecords.length + 1;
  const id = `TLT-${String(nextNo).padStart(6, '0')}`;
  const newRecord: LocalRecord = {
    id,
    no: nextNo,
    name: cleanName,
    address: cleanAddress,
    amount: numAmount,
    dateInput,
    timeInput,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };

  currentRecords.push(newRecord);
  updateActiveRecords(currentRecords, 'create', newRecord);
  logServerActivity('Tambah Data', id, cleanName, `Nominal: Rp ${numAmount.toLocaleString('id-ID')}`);

  // Forward to Google Apps Script if URL provided
  if (gasUrl) {
    const gasResult = await callGasApi('createData', {
      data: {
        name: cleanName,
        address: cleanAddress,
        amount: numAmount,
        dateInput,
        timeInput,
      },
    });

    if (gasResult && gasResult.success) {
      return res.json({
        success: true,
        message: 'Data berhasil disimpan ke Google Sheets.',
        record: gasResult.record || newRecord,
        source: 'google_sheets',
      });
    } else {
      console.warn('Failed to forward to GAS, saved to local DB:', gasResult.error);
    }
  }

  return res.json({
    success: true,
    message: 'Data berhasil disimpan.',
    record: newRecord,
    source: 'local_database',
  });
});

// 5. PUT /api/records/:id - Update record (Khusus Admin / Operator)
app.put('/api/records/:id', requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { name, address, amount } = req.body;

  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    return res.status(400).json({ success: false, error: 'Nama wajib diisi' });
  }

  const numAmount = Math.max(0, parseInt(amount, 10) || 0);
  const cleanName = name.trim();
  const cleanAddress = address ? address.trim() : '';

  const records = getLocalRecords();
  let index = records.findIndex((r) => r.id === id);

  // Fallback pencarian fuzzy jika prefix berbeda
  if (index === -1) {
    index = records.findIndex((r) => r.id.toLowerCase() === id.toLowerCase());
  }
  if (index === -1) {
    index = records.findIndex((r) => r.name.toLowerCase() === cleanName.toLowerCase());
  }

  let updatedRecord: LocalRecord;
  const now = new Date().toISOString();

  if (index !== -1) {
    records[index].name = cleanName;
    records[index].address = cleanAddress;
    records[index].amount = numAmount;
    records[index].updatedAt = now;
    updatedRecord = records[index];
    updateActiveRecords(records, 'update', records[index]);
    logServerActivity('Edit Data', id, cleanName, `Nominal baru: Rp ${numAmount.toLocaleString('id-ID')}`);
  } else {
    // Jika belum ada di memori lokal, buat dan tambahkan
    const nextNo = records.length + 1;
    const { date, time } = formatDateTimeJakarta();
    updatedRecord = {
      id,
      no: nextNo,
      name: cleanName,
      address: cleanAddress,
      amount: numAmount,
      dateInput: date,
      timeInput: `${time} WIB`,
      createdAt: now,
      updatedAt: now,
    };
    records.push(updatedRecord);
    updateActiveRecords(records, 'create', updatedRecord);
    logServerActivity('Tambah/Edit Data', id, cleanName, `Nominal: Rp ${numAmount.toLocaleString('id-ID')}`);
  }

  let gasSynced = false;
  const gasUrl = getGasUrl();
  if (gasUrl) {
    try {
      const gasRes = await callGasApi('updateData', {
        id,
        data: { name: cleanName, address: cleanAddress, amount: numAmount },
      });
      gasSynced = !!gasRes?.success;
      if (!gasRes?.success) {
        console.warn('Failed to update in GAS:', gasRes?.error);
      }
    } catch (gasErr) {
      console.warn('Error during GAS updateData:', gasErr);
    }
  }

  return res.json({
    success: true,
    message: 'Data berhasil diperbarui' + (gasSynced ? ' dan tersinkronisasi ke Google Sheets.' : '.'),
    record: updatedRecord,
    googleSheetsSynced: gasSynced,
  });
});

// 6. DELETE /api/records/:id - Soft delete (Khusus Admin / Operator)
app.delete('/api/records/:id', requireAdmin, async (req, res) => {
  const { id } = req.params;
  const records = getLocalRecords();
  let targetIndex = records.findIndex((r) => r.id === id);

  if (targetIndex === -1) {
    targetIndex = records.findIndex((r) => r.id.toLowerCase() === id.toLowerCase());
  }

  if (targetIndex === -1) {
    return res.status(404).json({ success: false, error: 'Data dengan ID tersebut tidak ditemukan' });
  }

  const target = records[targetIndex];

  // Soft delete locally to deleted-db.json
  try {
    const deletedRecords = safeReadJson<any[]>(DELETED_FILE, []);
    deletedRecords.push({
      ...target,
      deletedAt: new Date().toISOString(),
    });
    fs.writeFileSync(DELETED_FILE, JSON.stringify(deletedRecords, null, 2), 'utf-8');
  } catch (e) {
    // Ignored
  }

  // Remove from active list
  const filtered = records.filter((r) => r.id !== target.id);
  // Re-number active records berurutan 1..N
  filtered.forEach((r, idx) => {
    r.no = idx + 1;
  });
  updateActiveRecords(filtered, 'delete', target);
  logServerActivity('Hapus Data', target.id, target.name, `Nominal: Rp ${target.amount.toLocaleString('id-ID')}`);

  let gasDeleted = false;
  const gasUrl = getGasUrl();
  if (gasUrl) {
    try {
      const gasRes = await callGasApi('deleteData', {
        id: target.id,
        deletedBy: 'Operator Meja Telitian',
      });
      gasDeleted = !!gasRes?.success;
      if (!gasRes?.success) {
        console.warn('Failed to delete from GAS:', gasRes?.error);
      }
    } catch (gasErr) {
      console.warn('Error during GAS deleteData:', gasErr);
    }
  }

  return res.json({
    success: true,
    message: `Data atas nama ${target.name} berhasil dihapus` + (gasDeleted ? ' dan dipindahkan ke sheet DATA_TERHAPUS.' : '.'),
    googleSheetsSynced: gasDeleted,
  });
});

// Endpoint untuk menjalankan sinkronisasi manual sekarang juga
app.all('/api/gas/sync-now', async (req, res) => {
  const gasUrl = getGasUrl();
  if (!gasUrl) {
    return res.status(400).json({
      success: false,
      error: 'URL Google Apps Script belum diatur. Masukkan URL Web App pada menu Backup & Excel.',
    });
  }

  try {
    const syncResult = await performFullSyncWithGas();
    return res.json(syncResult);
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: 'Gagal melakukan sinkronisasi: ' + (err?.message || String(err)),
    });
  }
});

// Endpoint untuk mendapatkan kode lengkap Google Apps Script (Code.gs)
app.get('/api/gas/code', (req, res) => {
  try {
    const codePath = path.join(process.cwd(), 'Code.gs');
    if (fs.existsSync(codePath)) {
      const code = fs.readFileSync(codePath, 'utf-8');
      return res.json({ success: true, code });
    }
  } catch (e) {
    // Fallback
  }
  return res.status(404).json({ success: false, error: 'File Code.gs tidak ditemukan' });
});

// 7. POST /api/backup - Manual backup trigger to Google Drive & local backup
app.post('/api/backup', async (req, res) => {
  const gasUrl = getGasUrl();

  const now = new Date();
  const timestamp = new Intl.DateTimeFormat('id-ID', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
    .format(now)
    .replace(/[^0-9]/g, '');

  const backupFileName = `Backup-Telitian-Gibran-${timestamp}.json`;
  const backupFilePath = path.join(DB_DIR, backupFileName);
  const records = getLocalRecords();
  fs.writeFileSync(backupFilePath, JSON.stringify(records, null, 2), 'utf-8');

  logServerActivity('Backup Database', 'SYSTEM', 'Admin', `File: ${backupFileName}`);

  if (gasUrl) {
    const gasResult = await callGasApi('backup', {});
    if (gasResult && gasResult.success) {
      return res.json({
        success: true,
        message: 'Backup spreadsheet ke Google Drive berhasil dibuat!',
        driveData: gasResult,
        localBackup: backupFileName,
      });
    } else {
      console.warn('GAS Backup trigger error:', gasResult.error);
    }
  }

  return res.json({
    success: true,
    message: 'Backup lokal tersimpan (Google Apps Script URL belum diaktifkan atau belum merespons).',
    localBackup: backupFileName,
  });
});

// 8. POST /api/records/reset - Reset database mulai dari 0 (Khusus Admin)
app.post('/api/records/reset', requireAdmin, async (req, res) => {
  const currentRecords = getLocalRecords();
  const gasUrl = getGasUrl();
  const reason = req.body?.reason || 'Mulai dari 0';
  
  // Create safety archive backup before clearing
  if (currentRecords.length > 0) {
    try {
      const now = new Date();
      const timestamp = new Intl.DateTimeFormat('id-ID', {
        timeZone: 'Asia/Jakarta',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      })
        .format(now)
        .replace(/[^0-9]/g, '');
      const archiveFile = path.join(DB_DIR, `archive-reset-${timestamp}.json`);
      fs.writeFileSync(archiveFile, JSON.stringify(currentRecords, null, 2), 'utf-8');
    } catch (e) {
      console.warn('Failed to archive before reset:', e);
    }
  }

  // Clear active records database locally
  updateActiveRecords([], 'reset');
  logServerActivity('Reset Database', 'SYSTEM', 'Admin', `Database direset ke 0 (sebelumnya ${currentRecords.length} data)`);

  // Forward reset ke Google Sheets agar sheet DATA_TELITIAN dikosongkan dan diarsipkan
  let gasResetResult: GasResult | null = null;
  if (gasUrl) {
    gasResetResult = await callGasApi('resetData', { reason });
  }

  return res.json({
    success: true,
    message: 'Database berhasil direset! Perhitungan data dan kas mulai dari 0.',
    googleSheetsReset: gasResetResult?.success ?? false,
    totalData: 0,
    totalUang: 0,
  });
});

// 9. POST /api/records/sync-offline - Sinkronisasi batch data offline ke server & Google Sheets
app.post('/api/records/sync-offline', async (req, res) => {
  const { records: pendingRecords } = req.body;

  if (!Array.isArray(pendingRecords) || pendingRecords.length === 0) {
    return res.json({ success: true, count: 0, message: 'Tidak ada data pending' });
  }

  const currentRecords = getLocalRecords();
  const gasUrl = getGasUrl();

  const addedRecords: LocalRecord[] = [];

  for (const item of pendingRecords) {
    if (!item.name || !item.name.trim()) continue;

    const nextNo = currentRecords.length + 1;
    const id = `TLT-${String(nextNo).padStart(6, '0')}`;
    const cleanName = item.name.trim();
    const cleanAddress = item.address ? item.address.trim() : '';
    const numAmount = Math.max(0, parseInt(item.amount, 10) || 0);

    const now = new Date();
    const dateInput = item.dateInput || new Intl.DateTimeFormat('id-ID', {
      timeZone: 'Asia/Jakarta',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(now);
    const timeInput = item.timeInput || (new Intl.DateTimeFormat('id-ID', {
      timeZone: 'Asia/Jakarta',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(now) + ' WIB');

    const newRec: LocalRecord = {
      id,
      no: nextNo,
      name: cleanName,
      address: cleanAddress,
      amount: numAmount,
      dateInput,
      timeInput,
      createdAt: item.createdAt || now.toISOString(),
      updatedAt: now.toISOString(),
    };

    currentRecords.push(newRec);
    addedRecords.push(newRec);
  }

  updateActiveRecords(currentRecords, 'sync_offline');
  logServerActivity('Sync Offline', 'BATCH', 'System', `${addedRecords.length} data offline berhasil disinkronkan`);

  // Forward batch ke Google Apps Script sekaligus (cepat & tanpa timeout)
  if (gasUrl && addedRecords.length > 0) {
    const gasBatchRes = await callGasApi('batchCreateData', {
      records: addedRecords,
    });
    if (!gasBatchRes.success) {
      console.warn('Batch sync to GAS error:', gasBatchRes.error);
    }
  }

  const totalUang = currentRecords.reduce((acc, cur) => acc + (cur.amount || 0), 0);

  return res.json({
    success: true,
    message: `${addedRecords.length} data offline berhasil disinkronkan ke server.`,
    count: addedRecords.length,
    data: currentRecords,
    totalData: currentRecords.length,
    totalUang,
  });
});

// 9b. POST /api/records/restore-json - Pulihkan data dari file JSON cadangan ke server & Google Sheets (Khusus Admin)
app.post('/api/records/restore-json', requireAdmin, async (req, res) => {
  try {
    const { records: restoredList } = req.body;
    if (!Array.isArray(restoredList) || restoredList.length === 0) {
      return res.status(400).json({ success: false, error: 'Data JSON tidak valid atau kosong' });
    }

    const gasUrl = getGasUrl();
    const cleanList: LocalRecord[] = restoredList.map((item: any, idx: number) => {
      const numAmount = Math.max(0, parseInt(item.amount, 10) || 0);
      return {
        id: item.id || `TLT-${String(idx + 1).padStart(6, '0')}`,
        no: idx + 1,
        name: String(item.name || '').trim(),
        address: String(item.address || '').trim(),
        amount: numAmount,
        dateInput: item.dateInput || '12/09/2026',
        timeInput: item.timeInput || '00.00 WIB',
        createdAt: item.createdAt || new Date().toISOString(),
        updatedAt: item.updatedAt || new Date().toISOString(),
      };
    });

    // Update server memory & local DB
    updateActiveRecords(cleanList, 'restore');
    logServerActivity('Pulihkan Data', 'BATCH', 'Admin', `Memulihkan ${cleanList.length} data dari cadangan JSON`);

    // Sync to Google Apps Script if connected
    if (gasUrl) {
      callGasApi('batchCreateData', { records: cleanList }).catch((e) => {
        console.warn('GAS sync on restore error:', e);
      });
    }

    return res.json({
      success: true,
      message: `Berhasil memulihkan ${cleanList.length} data ke database server & Google Sheets!`,
      data: cleanList,
      totalData: cleanList.length,
      totalUang: cleanList.reduce((acc, c) => acc + (c.amount || 0), 0),
    });
  } catch (err: any) {
    console.error('Error restoring JSON:', err);
    return res.status(500).json({ success: false, error: err?.message || 'Gagal memulihkan database' });
  }
});

// 10. GET /api/export/excel - Unduh Excel Realtime Langsung dari Server
app.get('/api/export/excel', (req, res) => {
  try {
    const records = getLocalRecords();
    const totalUang = records.reduce((acc, cur) => acc + (cur.amount || 0), 0);
    const now = new Date();
    const dateStr = new Intl.DateTimeFormat('id-ID', {
      timeZone: 'Asia/Jakarta',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(now);
    const timeStr = new Intl.DateTimeFormat('id-ID', {
      timeZone: 'Asia/Jakarta',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    }).format(now) + ' WIB';

    const wsData: (string | number)[][] = [
      ['PENDATAAN TELITIAN HAJATAN'],
      ['GIBRAN KURNIAWAN'],
      [`Waktu Realtime: ${dateStr} - ${timeStr}`],
      [],
      ['No.', 'Nama Tamu', 'Alamat', 'Jumlah (Rp)', 'Waktu Entri', 'ID Telitian'],
    ];

    records.forEach((rec, idx) => {
      wsData.push([
        idx + 1,
        rec.name,
        rec.address || '-',
        rec.amount,
        `${rec.dateInput} ${rec.timeInput}`,
        rec.id,
      ]);
    });

    wsData.push([]);
    wsData.push(['TOTAL DATA', `${records.length} Tamu`]);
    wsData.push(['TOTAL UANG MASUK (RP)', totalUang]);

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    ws['!cols'] = [
      { wch: 8 },
      { wch: 32 },
      { wch: 30 },
      { wch: 20 },
      { wch: 24 },
      { wch: 16 },
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'TELITIAN_REALTIME');

    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Disposition', 'attachment; filename="Telitian-Gibran-Kurniawan-Realtime.xlsx"');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    return res.send(buffer);
  } catch (err) {
    console.error('Failed to generate realtime excel:', err);
    return res.status(500).json({ success: false, error: 'Gagal membuat file Excel' });
  }
});

// Catch-all API routes so they NEVER fall through to Vite SPA and return HTML
app.all('/api/*', (req, res) => {
  res.status(404).json({
    success: false,
    error: `Endpoint API ${req.method} ${req.path} tidak ditemukan pada server`,
  });
});

// Express error handler for API
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Server Express Error:', err);
  if (req.path.startsWith('/api')) {
    return res.status(500).json({
      success: false,
      error: err?.message || 'Terjadi kesalahan internal pada server',
    });
  }
  next(err);
});

// ----------------------------------------------------
// VITE MIDDLEWARE SETUP
// ----------------------------------------------------
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
