/**
 * Client-Side Google Apps Script Direct Sync & Fail-Safe Engine
 * Memastikan data tersimpan di Google Apps Script baik melalui backend Vercel
 * maupun koneksi langsung (hybrid fallback) dari HP & Laptop.
 */

const STORAGE_GAS_URL_KEY = 'telitian_gas_url';
const STORAGE_GAS_SECRET_KEY = 'telitian_gas_secret';
const DEFAULT_SECRET = 'telitian-gibran-secret-2026';

let cloudGasUrlCache = '';
let cloudGasSecretCache = '';

export interface GasDirectResult {
  success: boolean;
  message?: string;
  error?: string;
  data?: any;
  record?: any;
  count?: number;
  totalUang?: number;
  totalData?: number;
  isHtmlLogin?: boolean;
}

/**
 * Simpan cache URL Google Apps Script yang didapat dari Firestore (Sinkronisasi Antar Device)
 */
export function setCloudGasUrlCache(url: string, secret?: string): void {
  if (url && typeof url === 'string') {
    cloudGasUrlCache = url.trim();
    if (typeof window !== 'undefined' && !localStorage.getItem(STORAGE_GAS_URL_KEY)) {
      localStorage.setItem(STORAGE_GAS_URL_KEY, cloudGasUrlCache);
    }
  }
  if (secret && typeof secret === 'string') {
    cloudGasSecretCache = secret.trim();
    if (typeof window !== 'undefined' && !localStorage.getItem(STORAGE_GAS_SECRET_KEY)) {
      localStorage.setItem(STORAGE_GAS_SECRET_KEY, cloudGasSecretCache);
    }
  }
}

/**
 * Dapatkan URL Google Apps Script yang tersimpan di browser atau cloud cache
 */
export function getSavedGasUrl(): string {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem(STORAGE_GAS_URL_KEY);
    if (stored && stored.trim().startsWith('http')) {
      return stored.trim();
    }
  }
  if (cloudGasUrlCache && cloudGasUrlCache.startsWith('http')) {
    return cloudGasUrlCache;
  }
  return '';
}

/**
 * Dapatkan Secret Key Google Apps Script
 */
export function getSavedGasSecret(): string {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem(STORAGE_GAS_SECRET_KEY);
    if (stored && stored.trim()) {
      return stored.trim();
    }
  }
  if (cloudGasSecretCache) {
    return cloudGasSecretCache;
  }
  return DEFAULT_SECRET;
}

/**
 * Simpan konfigurasi Google Apps Script di browser lokal (HP/Laptop)
 */
export function saveGasConfigLocally(url: string, secret?: string): void {
  if (typeof window === 'undefined') return;
  if (url && typeof url === 'string') {
    localStorage.setItem(STORAGE_GAS_URL_KEY, url.trim());
  }
  if (secret && typeof secret === 'string') {
    localStorage.setItem(STORAGE_GAS_SECRET_KEY, secret.trim());
  }
}

export function saveGasUrl(url: string): void {
  saveGasConfigLocally(url);
}

export function saveGasSecret(secret: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_GAS_SECRET_KEY, secret.trim());
}

/**
 * Kirim aksi langsung ke Google Apps Script Web App dari browser.
 * Menggunakan Content-Type text/plain agar browser TIDAK mengirim request OPTIONS (CORS preflight),
 * yang sering ditolak atau tidak didukung oleh endpoint Google Apps Script.
 * Google Apps Script membaca isi JSON lewat e.postData.contents.
 */
export async function sendDirectToGas(
  action: string,
  payloadData: Record<string, any> = {},
  customUrl?: string,
  customSecret?: string
): Promise<GasDirectResult> {
  const gasUrl = (customUrl || getSavedGasUrl()).trim();
  const secret = (customSecret || getSavedGasSecret()).trim();

  if (!gasUrl) {
    return {
      success: false,
      error: 'URL Google Apps Script belum diisi. Masukkan URL Web App di menu Backup & Cloud.',
    };
  }

  if (gasUrl.includes('/edit')) {
    return {
      success: false,
      error: 'URL yang dimasukkan adalah URL editor (/edit). Gunakan URL Web App (/exec).',
    };
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    const bodyPayload = JSON.stringify({
      action,
      secret,
      ...payloadData,
    });

    const response = await fetch(gasUrl, {
      method: 'POST',
      redirect: 'follow',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: bodyPayload,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const text = await response.text();
    let data: any = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      if (text.includes('<!DOCTYPE') || text.includes('<html') || text.includes('accounts.google.com')) {
        return {
          success: false,
          error: 'Google Apps Script memerlukan izin login Google. Pastikan saat Deploy Web App memilih "Who has access: Anyone" (Siapa saja).',
          isHtmlLogin: true,
        };
      }
      return {
        success: false,
        error: `Respon Google Apps Script bukan JSON: ${text.slice(0, 100)}`,
      };
    }

    if (data && typeof data === 'object') {
      return data;
    }

    return {
      success: false,
      error: 'Respon kosong dari Google Apps Script.',
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.name === 'AbortError'
        ? 'Batas waktu koneksi ke Google Apps Script habis (15 detik).'
        : `Gagal menghubungi Google Apps Script: ${err.message || String(err)}`,
    };
  }
}

/**
 * Uji koneksi langsung dari browser ke Google Apps Script
 */
export async function testGasDirect(customUrl?: string, customSecret?: string): Promise<GasDirectResult> {
  return sendDirectToGas('ping', {}, customUrl, customSecret);
}

/**
 * Tarik seluruh data langsung dari Google Apps Script Web App (Google Sheets)
 * Menggunakan direct GET / POST browser fetch
 */
export async function fetchGasRecordsDirect(
  customUrl?: string,
  customSecret?: string
): Promise<{
  success: boolean;
  records: any[];
  totalUang: number;
  totalData: number;
  error?: string;
  isHtmlLogin?: boolean;
}> {
  const gasUrl = (customUrl || getSavedGasUrl()).trim();
  const secret = (customSecret || getSavedGasSecret()).trim();

  if (!gasUrl) {
    return {
      success: false,
      records: [],
      totalUang: 0,
      totalData: 0,
      error: 'URL Google Apps Script belum diisi.',
    };
  }

  // Coba via GET dengan timeout 12s
  try {
    const targetUrl = new URL(gasUrl);
    targetUrl.searchParams.set('action', 'getData');
    if (secret) targetUrl.searchParams.set('secret', secret);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);

    const res = await fetch(targetUrl.toString(), {
      method: 'GET',
      redirect: 'follow',
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    const text = await res.text();
    let parsed: any = null;
    try {
      parsed = JSON.parse(text);
    } catch {
      if (text.includes('<!DOCTYPE') || text.includes('accounts.google.com')) {
        return {
          success: false,
          records: [],
          totalUang: 0,
          totalData: 0,
          isHtmlLogin: true,
          error: 'Perlu login Google. Pastikan saat Deploy Web App memilih "Who has access: Anyone".',
        };
      }
    }

    if (parsed && parsed.success && Array.isArray(parsed.data)) {
      return {
        success: true,
        records: parsed.data,
        totalUang: parsed.totalUang || 0,
        totalData: parsed.totalData || parsed.data.length,
      };
    }
  } catch (_) {
    // Fallback ke sendDirectToGas via POST
  }

  // Fallback via POST
  const postRes = await sendDirectToGas('getData', {}, gasUrl, secret);
  if (postRes.success && Array.isArray(postRes.data)) {
    return {
      success: true,
      records: postRes.data,
      totalUang: postRes.totalUang || 0,
      totalData: postRes.totalData || postRes.data.length,
    };
  }

  return {
    success: false,
    records: [],
    totalUang: 0,
    totalData: 0,
    error: postRes.error || 'Gagal mengambil data dari Google Sheets.',
    isHtmlLogin: postRes.isHtmlLogin,
  };
}

/**
 * Kirim batch data langsung ke Google Apps Script (Google Sheets)
 */
export async function batchCreateGasRecordsDirect(
  records: any[],
  customUrl?: string,
  customSecret?: string
): Promise<GasDirectResult> {
  return sendDirectToGas('batchCreateData', { records }, customUrl, customSecret);
}

