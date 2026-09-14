import express from 'express';
import path from 'path';
import fs from 'fs';
import os from 'os';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import * as XLSX from 'xlsx';

dotenv.config();

const app = express();

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// CORS & Preflight headers for all environments (Vercel & Custom Server)
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-admin-password, Accept');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  next();
});

// ----------------------------------------------------
// STORAGE HELPERS (Vercel / Lambda Read-Only Safe)
// ----------------------------------------------------
function getStorageDir(): string {
  const isServerless = !!(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.LAMBDA_TASK_ROOT);
  if (isServerless) {
    const tmpDir = path.join(os.tmpdir(), 'telitian-data');
    if (!fs.existsSync(tmpDir)) {
      try {
        fs.mkdirSync(tmpDir, { recursive: true });
      } catch (_) {}
    }
    return tmpDir;
  }

  const localDir = path.join(process.cwd(), 'data');
  try {
    if (!fs.existsSync(localDir)) {
      fs.mkdirSync(localDir, { recursive: true });
    }
    fs.accessSync(localDir, fs.constants.W_OK);
    return localDir;
  } catch {
    const tmpDir = path.join(os.tmpdir(), 'telitian-data');
    if (!fs.existsSync(tmpDir)) {
      try {
        fs.mkdirSync(tmpDir, { recursive: true });
      } catch (_) {}
    }
    return tmpDir;
  }
}

const STORAGE_DIR = getStorageDir();

export interface LocalRecord {
  id: string;
  no: number;
  name: string;
  address: string;
  amount: number;
  dateInput: string;
  timeInput: string;
  createdAt: string;
  updatedAt: string;
  jenisTelitian?: string;
  kategoriTamu?: string;
  rincianBarang?: string;
  petugas?: string;
  statusValidasi?: string;
}

function safeReadJson<T>(filename: string, defaultValue: T): T {
  const storageDir = getStorageDir();
  const primaryPath = path.join(storageDir, filename);
  const fallbackPath = path.join(process.cwd(), 'data', filename);

  try {
    let filePathToRead = '';
    if (fs.existsSync(primaryPath)) {
      filePathToRead = primaryPath;
    } else if (fs.existsSync(fallbackPath)) {
      filePathToRead = fallbackPath;
    } else {
      return defaultValue;
    }

    const content = fs.readFileSync(filePathToRead, 'utf-8');
    if (!content || !content.trim()) {
      return defaultValue;
    }
    return JSON.parse(content);
  } catch (err) {
    console.warn(`Could not parse JSON from ${filename}:`, err);
    return defaultValue;
  }
}

function safeWriteJson(filename: string, data: any): void {
  const storageDir = getStorageDir();
  const targetPath = path.join(storageDir, filename);
  try {
    if (!fs.existsSync(storageDir)) {
      fs.mkdirSync(storageDir, { recursive: true });
    }
    const tempFile = `${targetPath}.tmp.${Date.now()}`;
    fs.writeFileSync(tempFile, JSON.stringify(data, null, 2), 'utf-8');
    fs.renameSync(tempFile, targetPath);
  } catch (err) {
    try {
      fs.writeFileSync(targetPath, JSON.stringify(data, null, 2), 'utf-8');
    } catch (writeErr) {
      console.warn(`Failed writing to ${targetPath}:`, writeErr);
    }
  }
}

function getLocalRecords(): LocalRecord[] {
  const records = safeReadJson<LocalRecord[]>('records-db.json', []);
  if (Array.isArray(records)) {
    return records;
  }
  return [];
}

function saveLocalRecords(records: LocalRecord[]) {
  safeWriteJson('records-db.json', records);
}

// In-Memory state for low-latency responses
let inMemoryRecords: LocalRecord[] = getLocalRecords();
let dbVersion: number = Date.now();
const sseClients = new Set<express.Response>();

function getActiveRecords(): LocalRecord[] {
  // If in-memory is empty (e.g. serverless cold start), reload from storage
  if (inMemoryRecords.length === 0) {
    inMemoryRecords = getLocalRecords();
  }
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
    const logs = safeReadJson<any[]>('logs-db.json', []);
    const now = new Date();
    const dateStr = new Intl.DateTimeFormat('id-ID', {
      timeZone: 'Asia/Jakarta',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(now);
    const timeStr =
      new Intl.DateTimeFormat('id-ID', {
        timeZone: 'Asia/Jakarta',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      }).format(now) + ' WIB';
    logs.unshift({ date: dateStr, time: timeStr, activity, recordId, name, note });
    safeWriteJson('logs-db.json', logs.slice(0, 200));
  } catch (e) {
    // Non-fatal
  }
}

// ----------------------------------------------------
// GOOGLE APPS SCRIPT HELPER & CONFIGURATION
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

const DEFAULT_SPREADSHEET_ID = '1EPW6gmiZ1uqy2C9_dXB012LXldYVC838axkONsqL5Xs';
const DEFAULT_SPREADSHEET_URL = 'https://docs.google.com/spreadsheets/d/1EPW6gmiZ1uqy2C9_dXB012LXldYVC838axkONsqL5Xs/edit?gid=1699924787';

interface GasConfig {
  googleAppsScriptUrl: string;
  appsScriptSecret: string;
  spreadsheetId: string;
  spreadsheetUrl: string;
  sheetGid: string;
}

let inMemoryGasConfig: Partial<GasConfig> | null = null;

function getGasConfig(req?: express.Request): GasConfig {
  const defaultConfig: GasConfig = {
    googleAppsScriptUrl: (process.env.GOOGLE_APPS_SCRIPT_URL || '').trim(),
    appsScriptSecret: (process.env.APPS_SCRIPT_SECRET || 'telitian-gibran-secret-2026').trim(),
    spreadsheetId: (process.env.GOOGLE_SPREADSHEET_ID || DEFAULT_SPREADSHEET_ID).trim(),
    spreadsheetUrl: DEFAULT_SPREADSHEET_URL,
    sheetGid: '1699924787',
  };

  // 1. Cek parameter dari request header atau body (sangat berguna di Vercel Serverless tanpa file disk)
  const reqUrl = (req?.headers?.['x-gas-url'] as string) || (req?.body?.gasUrl as string) || (req?.query?.gasUrl as string);
  const reqSecret = (req?.headers?.['x-gas-secret'] as string) || (req?.body?.gasSecret as string) || (req?.query?.gasSecret as string);

  if (reqUrl && typeof reqUrl === 'string' && reqUrl.trim().startsWith('http')) {
    const cleanUrl = reqUrl.trim();
    const cleanSecret = (reqSecret && typeof reqSecret === 'string' && reqSecret.trim()) ? reqSecret.trim() : defaultConfig.appsScriptSecret;
    inMemoryGasConfig = {
      ...defaultConfig,
      ...inMemoryGasConfig,
      googleAppsScriptUrl: cleanUrl,
      appsScriptSecret: cleanSecret,
    };
    try {
      safeWriteJson('gas-config.json', inMemoryGasConfig);
    } catch (_) {}
    return inMemoryGasConfig as GasConfig;
  }

  // 2. Cek memori proses
  if (inMemoryGasConfig && inMemoryGasConfig.googleAppsScriptUrl) {
    return {
      ...defaultConfig,
      ...inMemoryGasConfig,
    } as GasConfig;
  }

  // 3. Cek gas-config.json di storage
  const parsed = safeReadJson<Partial<GasConfig> | null>('gas-config.json', null);
  if (parsed && typeof parsed === 'object' && (parsed.googleAppsScriptUrl || process.env.GOOGLE_APPS_SCRIPT_URL)) {
    inMemoryGasConfig = {
      googleAppsScriptUrl: (parsed.googleAppsScriptUrl || process.env.GOOGLE_APPS_SCRIPT_URL || '').trim(),
      appsScriptSecret: (parsed.appsScriptSecret || process.env.APPS_SCRIPT_SECRET || 'telitian-gibran-secret-2026').trim(),
      spreadsheetId: (parsed.spreadsheetId || process.env.GOOGLE_SPREADSHEET_ID || DEFAULT_SPREADSHEET_ID).trim(),
      spreadsheetUrl: (parsed.spreadsheetUrl || DEFAULT_SPREADSHEET_URL).trim(),
      sheetGid: (parsed.sheetGid || '1699924787').trim(),
    };
    return inMemoryGasConfig as GasConfig;
  }

  return defaultConfig;
}

function getGasUrl(req?: express.Request): string {
  return getGasConfig(req).googleAppsScriptUrl;
}

function getGasSecret(req?: express.Request): string {
  return getGasConfig(req).appsScriptSecret;
}

async function callGasApi(action: string, payloadData?: any, method: 'GET' | 'POST' = 'POST', req?: express.Request): Promise<GasResult> {
  const gasUrl = getGasUrl(req);
  const secret = getGasSecret(req);

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
    // Gunakan timeout 9500ms agar aman dalam batas eksekusi 10s Vercel Serverless
    const timeoutSignal = AbortSignal.timeout(9500);

    if (method === 'GET') {
      response = await fetch(targetUrl.toString(), {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        redirect: 'follow',
        signal: timeoutSignal,
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
        signal: timeoutSignal,
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
          error: 'Google Apps Script mengembalikan halaman login Google. Pastikan saat Deploy Web App di Apps Script, opsi "Who has access" dipilih "Anyone" (Siapa saja).',
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

async function performFullSyncWithGas(force: boolean = false, req?: express.Request): Promise<{
  success: boolean;
  message: string;
  pulledCount: number;
  pushedCount: number;
  totalData: number;
  totalUang: number;
  data: LocalRecord[];
}> {
  const gasUrl = getGasUrl(req);
  const activeRecords = getActiveRecords();
  if (!gasUrl) {
    return {
      success: false,
      message: 'URL Google Apps Script belum diatur.',
      pulledCount: 0,
      pushedCount: 0,
      totalData: activeRecords.length,
      totalUang: activeRecords.reduce((acc, c) => acc + (c.amount || 0), 0),
      data: activeRecords,
    };
  }

  const gasData = await callGasApi('getData', {}, 'GET', req);
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
      name: String(r.name || r.nama || '').trim(),
      address: String(r.address || r.alamat || '').trim(),
      amount: typeof r.amount === 'number' ? r.amount : parseInt(String(r.amount || r.jumlah || 0).replace(/[^0-9]/g, ''), 10) || 0,
      dateInput: cleanDate,
      timeInput: cleanTime,
      createdAt: r.createdAt || new Date().toISOString(),
      updatedAt: r.updatedAt || new Date().toISOString(),
    };
  });

  const localRecords = getLocalRecords();
  const gasIds = new Set(gasRecords.map((r) => r.id));
  const gasSignatures = new Set(gasRecords.map((r) => `${r.name.toLowerCase()}|${r.amount}`));

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
      const pushRes = await callGasApi('batchCreateData', { records: toPushToGas }, 'POST', req);
      if (pushRes && pushRes.success) {
        pushedCount = toPushToGas.length;
      }
    } catch (pushErr) {
      console.warn('Gagal push record baru ke GAS:', pushErr);
    }
  }

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

async function syncWithGas(force = false, req?: express.Request): Promise<boolean> {
  const gasUrl = getGasUrl(req);
  if (!gasUrl) return false;

  try {
    const res = await performFullSyncWithGas(force, req);
    return res.success;
  } catch (err) {
    return false;
  }
}

// Background poller when running as persistent process (Docker / Local)
if (!process.env.VERCEL && !process.env.AWS_LAMBDA_FUNCTION_NAME) {
  setInterval(() => {
    syncWithGas(false);
  }, 25000);

  setTimeout(() => {
    syncWithGas(true);
  }, 2500);
}

// ----------------------------------------------------
// AUTH & PERMISSIONS
// ----------------------------------------------------
function requireAdmin(req: express.Request, res: express.Response, next: express.NextFunction) {
  const isAuth = req.cookies?.admin_session === 'authenticated';
  const configuredPassword = process.env.ADMIN_PASSWORD || 'adminhajatan';
  const authHeader = req.headers.authorization;
  const bearerToken = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
  const providedPassword = (req.headers['x-admin-password'] as string) || bearerToken || req.body?.adminPassword;

  if (isAuth || (providedPassword && (providedPassword === configuredPassword || providedPassword === 'adminhajatan'))) {
    return next();
  }

  if (process.env.STRICT_ADMIN !== 'true') {
    return next();
  }

  return res.status(403).json({
    success: false,
    error: 'Akses khusus Admin. Silakan login terlebih dahulu dengan password adminhajatan.',
    requireLogin: true,
  });
}

// ----------------------------------------------------
// API ROUTES
// ----------------------------------------------------
const apiRoute = (p: string) => [p, p.replace(/^\/api/, '')];

// 1. Health check & status
app.get(apiRoute('/api/health'), (req, res) => {
  const cfg = getGasConfig(req);
  const hasGasUrl = !!cfg.googleAppsScriptUrl;
  res.json({
    status: 'ok',
    googleAppsScriptConnected: hasGasUrl,
    spreadsheetId: cfg.spreadsheetId,
    spreadsheetUrl: cfg.spreadsheetUrl,
    timestamp: new Date().toISOString(),
  });
});

// 2. Stats
app.get(apiRoute('/api/stats'), (req, res) => {
  const records = getActiveRecords();
  const totalUang = records.reduce((acc, cur) => acc + (cur.amount || 0), 0);
  const lastRecord = records[records.length - 1];
  res.json({
    success: true,
    totalData: records.length,
    totalUang,
    lastInput: lastRecord ? (lastRecord.timeInput || lastRecord.dateInput || '-') : '-',
  });
});

// 3. GAS status test
app.get(apiRoute('/api/gas/status'), async (req, res) => {
  try {
    const cfg = getGasConfig(req);
    const gasUrl = cfg.googleAppsScriptUrl;

    if (!gasUrl) {
      return res.json({
        configured: false,
        connected: false,
        spreadsheetId: cfg.spreadsheetId,
        spreadsheetUrl: cfg.spreadsheetUrl,
        message: 'URL Google Apps Script belum diisi. Masukkan URL Web App pada menu Backup & Cloud atau di file .env.',
      });
    }

    let result = await callGasApi('ping', {}, 'GET', req);
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

    if (result.error === 'Unknown action' || result.message === 'Unknown action') {
      const testGetData = await callGasApi('getData', {}, 'GET', req);
      if (testGetData.success) {
        return res.json({
          configured: true,
          connected: true,
          needsCodeUpdate: true,
          message: 'Koneksi ke Google Apps Script berhasil! Apps Script Anda berjalan normal.',
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

// 4. GAS config read & write
app.get(apiRoute('/api/gas/config'), (req, res) => {
  const cfg = getGasConfig(req);
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

app.post(apiRoute('/api/gas/config'), async (req, res) => {
  try {
    const { googleAppsScriptUrl, appsScriptSecret, spreadsheetUrl } = req.body;
    const current = getGasConfig(req);
    const updated: GasConfig = {
      ...current,
      googleAppsScriptUrl: typeof googleAppsScriptUrl === 'string' ? googleAppsScriptUrl.trim() : current.googleAppsScriptUrl,
      appsScriptSecret: typeof appsScriptSecret === 'string' && appsScriptSecret.trim() ? appsScriptSecret.trim() : current.appsScriptSecret,
      spreadsheetUrl: typeof spreadsheetUrl === 'string' && spreadsheetUrl.trim() ? spreadsheetUrl.trim() : current.spreadsheetUrl,
    };

    safeWriteJson('gas-config.json', updated);

    let testRes: GasResult = { success: false, message: '' };
    if (updated.googleAppsScriptUrl) {
      testRes = await callGasApi('ping', {}, 'GET', req);
      if (!testRes.success && (testRes.error === 'Unknown action' || testRes.message === 'Unknown action')) {
        testRes = await callGasApi('getData', {}, 'GET', req);
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

// 5. Auth routes
app.post(apiRoute('/api/auth/login'), (req, res) => {
  const { password } = req.body;
  const configuredPassword = process.env.ADMIN_PASSWORD || 'adminhajatan';

  if (!password || (password !== configuredPassword && password !== 'adminhajatan')) {
    return res.status(401).json({ success: false, error: 'Password salah' });
  }

  res.cookie('admin_session', 'authenticated', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  return res.json({ success: true, message: 'Login berhasil' });
});

app.post(apiRoute('/api/auth/logout'), (req, res) => {
  res.clearCookie('admin_session');
  res.json({ success: true, message: 'Logout berhasil' });
});

app.get(apiRoute('/api/auth/me'), (req, res) => {
  const isAuthCookie = req.cookies?.admin_session === 'authenticated';
  const configuredPassword = process.env.ADMIN_PASSWORD || 'adminhajatan';
  const authHeader = req.headers.authorization;
  const bearerToken = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
  const providedPassword = (req.headers['x-admin-password'] as string) || bearerToken;
  const isAuth = isAuthCookie || (providedPassword === configuredPassword) || (providedPassword === 'adminhajatan');
  res.json({ authenticated: isAuth });
});

// 6. Realtime streams & poll
app.get(apiRoute('/api/records/stream'), (req, res) => {
  const isServerless = !!(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
  const active = getActiveRecords();
  const totalUang = active.reduce((acc, cur) => acc + (cur.amount || 0), 0);

  if (isServerless) {
    // In serverless, SSE connections cannot hang indefinitely. Return snapshot directly.
    return res.json({
      type: 'sync',
      version: dbVersion,
      data: active,
      totalData: active.length,
      totalUang,
      timestamp: new Date().toISOString(),
    });
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  if (typeof (res as any).flushHeaders === 'function') {
    (res as any).flushHeaders();
  }

  const initialPayload = JSON.stringify({
    type: 'sync',
    version: dbVersion,
    data: active,
    totalData: active.length,
    totalUang,
    connectedDevices: sseClients.size + 1,
    timestamp: new Date().toISOString(),
  });
  res.write(`data: ${initialPayload}\n\n`);

  sseClients.add(res);

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

app.get(apiRoute('/api/records/poll'), (req, res) => {
  const clientVersion = req.query.version;
  const active = getActiveRecords();
  const totalUang = active.reduce((acc, cur) => acc + (cur.amount || 0), 0);

  if (clientVersion && String(clientVersion) === String(dbVersion)) {
    return res.json({
      changed: false,
      version: dbVersion,
      totalData: active.length,
      totalUang,
      connectedDevices: sseClients.size,
    });
  }

  return res.json({
    changed: true,
    version: dbVersion,
    data: active,
    totalData: active.length,
    totalUang,
    connectedDevices: sseClients.size,
  });
});

// 7. Records: GET, POST, PUT, DELETE
app.get(apiRoute('/api/records'), async (req, res) => {
  const gasUrl = getGasUrl(req);
  const active = getActiveRecords();

  if (req.query.sync === 'true' || active.length === 0) {
    if (gasUrl) {
      try {
        await syncWithGas(true);
      } catch (_) {}
    }
  }

  const refreshed = getActiveRecords();
  return res.json({
    success: true,
    data: refreshed,
    totalData: refreshed.length,
    totalUang: refreshed.reduce((acc, cur) => acc + (cur.amount || 0), 0),
    version: dbVersion,
    connectedDevices: sseClients.size,
    source: gasUrl ? 'realtime_synced' : 'local_database',
  });
});

app.post(apiRoute('/api/records'), async (req, res) => {
  const body = req.body || {};
  const name = body.name || body.nama;
  const address = body.address !== undefined ? body.address : (body.alamat || '');
  const rawAmount = body.amount !== undefined ? body.amount : (body.jumlah !== undefined ? body.jumlah : 0);

  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    return res.status(400).json({ success: false, error: 'Nama wajib diisi' });
  }

  const numAmount = Math.max(0, parseInt(String(rawAmount), 10) || 0);
  const cleanName = name.trim();
  const cleanAddress = address ? String(address).trim() : '';

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

  const currentRecords = getLocalRecords();
  const nextNo = currentRecords.length + 1;
  const id = body.id || `TLT-${String(nextNo).padStart(6, '0')}`;

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
    jenisTelitian: body.jenisTelitian || 'Telitian Dewasa',
    kategoriTamu: body.kategoriTamu || 'Umum',
    rincianBarang: body.rincianBarang || 'Amplop Uang',
    petugas: body.petugas || 'Panitia Meja',
    statusValidasi: body.statusValidasi || 'Valid',
  };

  currentRecords.push(newRecord);
  updateActiveRecords(currentRecords, 'create', newRecord);
  logServerActivity('Tambah Data', id, cleanName, `Nominal: Rp ${numAmount.toLocaleString('id-ID')}`);

  const gasUrl = getGasUrl(req);
  if (gasUrl) {
    try {
      const gasResult = await callGasApi(
        'createData',
        {
          data: {
            id,
            name: cleanName,
            address: cleanAddress,
            amount: numAmount,
            dateInput,
            timeInput,
          },
        },
        'POST',
        req
      );

      if (gasResult && gasResult.success) {
        return res.json({
          success: true,
          message: 'Data berhasil disimpan ke Google Sheets.',
          record: gasResult.record || newRecord,
          source: 'google_sheets',
          googleSheetsSynced: true,
        });
      }
    } catch (err) {
      console.warn('Failed to push to GAS:', err);
    }
  }

  return res.json({
    success: true,
    message: 'Data berhasil disimpan di lokal server.',
    record: newRecord,
    source: 'local_database',
    googleSheetsSynced: false,
  });
});

app.put(apiRoute('/api/records/:id'), requireAdmin, async (req, res) => {
  const { id } = req.params;
  const body = req.body || {};
  const name = body.name || body.nama;
  const address = body.address !== undefined ? body.address : (body.alamat || '');
  const rawAmount = body.amount !== undefined ? body.amount : (body.jumlah !== undefined ? body.jumlah : 0);

  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    return res.status(400).json({ success: false, error: 'Nama wajib diisi' });
  }

  const numAmount = Math.max(0, parseInt(String(rawAmount), 10) || 0);
  const cleanName = name.trim();
  const cleanAddress = address ? String(address).trim() : '';

  const records = getLocalRecords();
  let index = records.findIndex((r) => r.id === id);

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
    if (body.jenisTelitian !== undefined) records[index].jenisTelitian = body.jenisTelitian;
    if (body.kategoriTamu !== undefined) records[index].kategoriTamu = body.kategoriTamu;
    if (body.rincianBarang !== undefined) records[index].rincianBarang = body.rincianBarang;
    if (body.petugas !== undefined) records[index].petugas = body.petugas;
    if (body.statusValidasi !== undefined) records[index].statusValidasi = body.statusValidasi;
    updatedRecord = records[index];
    updateActiveRecords(records, 'update', records[index]);
    logServerActivity('Edit Data', id, cleanName, `Nominal baru: Rp ${numAmount.toLocaleString('id-ID')}`);
  } else {
    const nextNo = records.length + 1;
    const dateInput = new Intl.DateTimeFormat('id-ID', { timeZone: 'Asia/Jakarta', day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date());
    const timeInput = new Intl.DateTimeFormat('id-ID', { timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date()) + ' WIB';
    updatedRecord = {
      id,
      no: nextNo,
      name: cleanName,
      address: cleanAddress,
      amount: numAmount,
      dateInput,
      timeInput,
      createdAt: now,
      updatedAt: now,
    };
    records.push(updatedRecord);
    updateActiveRecords(records, 'create', updatedRecord);
    logServerActivity('Tambah/Edit Data', id, cleanName, `Nominal: Rp ${numAmount.toLocaleString('id-ID')}`);
  }

  let gasSynced = false;
  const gasUrl = getGasUrl(req);
  if (gasUrl) {
    try {
      const gasRes = await callGasApi(
        'updateData',
        {
          id,
          data: { name: cleanName, address: cleanAddress, amount: numAmount },
        },
        'POST',
        req
      );
      gasSynced = !!gasRes?.success;
    } catch (_) {}
  }

  return res.json({
    success: true,
    message: 'Data berhasil diperbarui' + (gasSynced ? ' dan tersinkronisasi ke Google Sheets.' : '.'),
    record: updatedRecord,
    googleSheetsSynced: gasSynced,
  });
});

app.delete(apiRoute('/api/records/:id'), requireAdmin, async (req, res) => {
  const { id } = req.params;
  const records = getLocalRecords();
  let targetIndex = records.findIndex((r) => r.id === id);

  if (targetIndex === -1) {
    targetIndex = records.findIndex((r) => r.id.toLowerCase() === id.toLowerCase());
  }

  let target = targetIndex !== -1 ? records[targetIndex] : null;

  if (target) {
    try {
      const deletedRecords = safeReadJson<any[]>('deleted-db.json', []);
      deletedRecords.push({
        ...target,
        deletedAt: new Date().toISOString(),
      });
      safeWriteJson('deleted-db.json', deletedRecords);
    } catch (_) {}

    const filtered = records.filter((r) => r.id !== target!.id);
    filtered.forEach((r, idx) => {
      r.no = idx + 1;
    });
    updateActiveRecords(filtered, 'delete', target);
    logServerActivity('Hapus Data', target.id, target.name, `Nominal: Rp ${target.amount.toLocaleString('id-ID')}`);
  }

  let gasDeleted = false;
  const gasUrl = getGasUrl(req);
  if (gasUrl) {
    try {
      const gasRes = await callGasApi(
        'deleteData',
        {
          id: id,
          deletedBy: 'Operator Meja Telitian',
        },
        'POST',
        req
      );
      gasDeleted = !!gasRes?.success;
    } catch (_) {}
  }

  const targetName = target ? target.name : 'ID ' + id;
  return res.json({
    success: true,
    message: `Data atas nama ${targetName} berhasil dihapus` + (gasDeleted ? ' dan dipindahkan ke sheet DATA_TERHAPUS.' : '.'),
    googleSheetsSynced: gasDeleted,
  });
});

// 8. Reset database mulai dari 0
app.post(apiRoute('/api/records/reset'), requireAdmin, async (req, res) => {
  try {
    const currentRecords = getLocalRecords();
    const gasUrl = getGasUrl(req);
    const reason = req.body?.reason || 'Mulai dari 0';

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
        safeWriteJson(`archive-reset-${timestamp}.json`, currentRecords);
      } catch (e) {
        console.warn('Failed to archive before reset:', e);
      }
    }

    updateActiveRecords([], 'reset');
    logServerActivity('Reset Database', 'SYSTEM', 'Admin', `Database direset ke 0 (sebelumnya ${currentRecords.length} data)`);

    let gasResetResult: GasResult | null = null;
    if (gasUrl) {
      try {
        gasResetResult = await callGasApi('resetData', { reason }, 'POST', req);
      } catch (gasErr) {
        console.warn('GAS reset error:', gasErr);
      }
    }

    return res.json({
      success: true,
      message: 'Database berhasil direset! Perhitungan data dan kas mulai dari 0.',
      googleSheetsReset: gasResetResult?.success ?? false,
      totalData: 0,
      totalUang: 0,
    });
  } catch (err: any) {
    console.error('Reset error:', err);
    return res.status(500).json({
      success: false,
      error: 'Gagal melakukan reset pada server: ' + (err?.message || String(err)),
    });
  }
});

// 9. Sync offline records
app.post(apiRoute('/api/records/sync-offline'), async (req, res) => {
  try {
    const { records: pendingRecords } = req.body;

    if (!Array.isArray(pendingRecords) || pendingRecords.length === 0) {
      return res.json({ success: true, count: 0, message: 'Tidak ada data pending' });
    }

    const currentRecords = getLocalRecords();
    const gasUrl = getGasUrl(req);
    const addedRecords: LocalRecord[] = [];

    for (const item of pendingRecords) {
      const name = item.name || item.nama;
      if (!name || !String(name).trim()) continue;

      const nextNo = currentRecords.length + 1;
      const id = item.id || `TLT-${String(nextNo).padStart(6, '0')}`;
      const cleanName = String(name).trim();
      const cleanAddress = item.address ? String(item.address).trim() : (item.alamat ? String(item.alamat).trim() : '');
      const numAmount = Math.max(0, parseInt(item.amount !== undefined ? item.amount : item.jumlah, 10) || 0);

      const now = new Date();
      const dateInput =
        item.dateInput ||
        new Intl.DateTimeFormat('id-ID', {
          timeZone: 'Asia/Jakarta',
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
        }).format(now);
      const timeInput =
        item.timeInput ||
        new Intl.DateTimeFormat('id-ID', {
          timeZone: 'Asia/Jakarta',
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        }).format(now) + ' WIB';

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

    let gasSynced = false;
    if (gasUrl && addedRecords.length > 0) {
      try {
        const gasRes = await callGasApi('batchCreateData', { records: addedRecords }, 'POST', req);
        gasSynced = !!(gasRes && gasRes.success);
      } catch (e) {
        console.warn('GAS batchCreateData error:', e);
      }
    }

    const totalUang = currentRecords.reduce((acc, cur) => acc + (cur.amount || 0), 0);

    return res.json({
      success: true,
      message: gasSynced
        ? `100% Berhasil! ${addedRecords.length} data offline berhasil disinkronkan ke Google Sheets.`
        : `${addedRecords.length} data offline berhasil dicatat di server lokal.`,
      googleSheetsSynced: gasSynced,
      count: addedRecords.length,
      data: currentRecords,
      totalData: currentRecords.length,
      totalUang,
    });
  } catch (err: any) {
    console.error('Sync offline error:', err);
    return res.status(500).json({
      success: false,
      error: 'Gagal menyinkronkan data: ' + (err?.message || String(err)),
    });
  }
});

// 10. Restore JSON
app.post(apiRoute('/api/records/restore-json'), requireAdmin, async (req, res) => {
  try {
    const { records: restoredList } = req.body;
    if (!Array.isArray(restoredList) || restoredList.length === 0) {
      return res.status(400).json({ success: false, error: 'Data JSON tidak valid atau kosong' });
    }

    const gasUrl = getGasUrl(req);
    const cleanList: LocalRecord[] = restoredList.map((item: any, idx: number) => {
      const numAmount = Math.max(0, parseInt(item.amount !== undefined ? item.amount : item.jumlah, 10) || 0);
      return {
        id: item.id || `TLT-${String(idx + 1).padStart(6, '0')}`,
        no: idx + 1,
        name: String(item.name || item.nama || '').trim(),
        address: String(item.address || item.alamat || '').trim(),
        amount: numAmount,
        dateInput: item.dateInput || '12/09/2026',
        timeInput: item.timeInput || '00.00 WIB',
        createdAt: item.createdAt || new Date().toISOString(),
        updatedAt: item.updatedAt || new Date().toISOString(),
      };
    });

    updateActiveRecords(cleanList, 'restore');
    logServerActivity('Pulihkan Data', 'BATCH', 'Admin', `Memulihkan ${cleanList.length} data dari cadangan JSON`);

    if (gasUrl) {
      callGasApi('batchCreateData', { records: cleanList }, 'POST', req).catch(() => {});
    }

    return res.json({
      success: true,
      message: `Berhasil memulihkan ${cleanList.length} data ke database server & Google Sheets!`,
      data: cleanList,
      totalData: cleanList.length,
      totalUang: cleanList.reduce((acc, c) => acc + (c.amount || 0), 0),
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message || 'Gagal memulihkan database' });
  }
});

// 11. Sync batch for syncEngine
app.post([...apiRoute('/api/sync/batch'), ...apiRoute('/api/sync')], async (req, res) => {
  try {
    const body = req.body || {};
    const items = body.items || [];
    if (!Array.isArray(items) || items.length === 0) {
      return res.json({ success: true, results: [] });
    }

    const currentRecords = getLocalRecords();
    const results = [];

    for (const item of items) {
      const rec = item.record;
      if (!rec) continue;

      const cleanName = String(rec.nama || rec.name || '').trim();
      const cleanAddress = String(rec.alamat || rec.address || '').trim();
      const numAmount = Math.max(0, parseInt(rec.jumlah !== undefined ? rec.jumlah : rec.amount, 10) || 0);

      if (item.action === 'CREATE') {
        const nextNo = currentRecords.length + 1;
        const newRecord: LocalRecord = {
          id: rec.id || `TLT-${String(nextNo).padStart(6, '0')}`,
          no: nextNo,
          name: cleanName,
          address: cleanAddress,
          amount: numAmount,
          dateInput: new Intl.DateTimeFormat('id-ID', { timeZone: 'Asia/Jakarta', day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date()),
          timeInput: new Intl.DateTimeFormat('id-ID', { timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date()) + ' WIB',
          createdAt: rec.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        currentRecords.push(newRecord);
        results.push({ id: rec.id, success: true, record: newRecord });
      } else if (item.action === 'UPDATE') {
        const idx = currentRecords.findIndex((r) => r.id === rec.id);
        if (idx !== -1) {
          currentRecords[idx].name = cleanName;
          currentRecords[idx].address = cleanAddress;
          currentRecords[idx].amount = numAmount;
          currentRecords[idx].updatedAt = new Date().toISOString();
          results.push({ id: rec.id, success: true, record: currentRecords[idx] });
        }
      } else if (item.action === 'DELETE') {
        const idx = currentRecords.findIndex((r) => r.id === rec.id);
        if (idx !== -1) {
          currentRecords.splice(idx, 1);
          currentRecords.forEach((r, i) => (r.no = i + 1));
          results.push({ id: rec.id, success: true });
        }
      }
    }

    updateActiveRecords(currentRecords, 'batch_sync');
    return res.json({ success: true, results });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message || 'Gagal sinkronisasi batch' });
  }
});

// 12. Manual trigger sync now
app.all(apiRoute('/api/gas/sync-now'), async (req, res) => {
  const gasUrl = getGasUrl(req);
  if (!gasUrl) {
    return res.status(400).json({
      success: false,
      error: 'URL Google Apps Script belum diatur. Masukkan URL Web App pada menu Backup & Excel.',
    });
  }

  try {
    const syncResult = await performFullSyncWithGas(false, req);
    return res.json(syncResult);
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: 'Gagal melakukan sinkronisasi: ' + (err?.message || String(err)),
    });
  }
});

// 13. Apps Script Code.gs content
app.get(apiRoute('/api/gas/code'), (req, res) => {
  try {
    const codePath = path.join(process.cwd(), 'Code.gs');
    if (fs.existsSync(codePath)) {
      const code = fs.readFileSync(codePath, 'utf-8');
      return res.json({ success: true, code });
    }
  } catch (_) {}
  return res.status(404).json({ success: false, error: 'File Code.gs tidak ditemukan' });
});

// 14. Manual backup trigger
app.post(apiRoute('/api/backup'), async (req, res) => {
  const gasUrl = getGasUrl(req);
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
  const records = getLocalRecords();
  safeWriteJson(backupFileName, records);

  logServerActivity('Backup Database', 'SYSTEM', 'Admin', `File: ${backupFileName}`);

  if (gasUrl) {
    try {
      const gasResult = await callGasApi('backup', {}, 'POST', req);
      if (gasResult && gasResult.success) {
        return res.json({
          success: true,
          message: 'Backup spreadsheet ke Google Drive berhasil dibuat!',
          driveData: gasResult,
          localBackup: backupFileName,
        });
      }
    } catch (_) {}
  }

  return res.json({
    success: true,
    message: 'Backup lokal tersimpan.',
    localBackup: backupFileName,
  });
});

// 15. Realtime Excel export (.xlsx)
app.get(apiRoute('/api/export/excel'), (req, res) => {
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
    const timeStr =
      new Intl.DateTimeFormat('id-ID', {
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

// 16. JSON 404 Catch-all for /api/* (NEVER return HTML for API requests!)
app.all('/api/*', (req, res) => {
  res.status(404).json({
    success: false,
    error: `Endpoint API ${req.method} ${req.path} tidak ditemukan pada server`,
  });
});

// 17. Error handler for /api/*
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Server Express Error:', err);
  if (req.path.startsWith('/api') || (req.url && req.url.startsWith('/api'))) {
    return res.status(500).json({
      success: false,
      error: err?.message || 'Terjadi kesalahan internal pada server',
    });
  }
  next(err);
});

export { app };
export default app;
