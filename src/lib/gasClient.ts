/**
 * Client-Side Google Apps Script Direct Sync & Fail-Safe Engine
 * Memastikan data tersimpan di Google Apps Script baik melalui backend Vercel
 * maupun koneksi langsung (hybrid fallback) dari HP & Laptop.
 */

const STORAGE_GAS_URL_KEY = 'telitian_gas_url';
const STORAGE_GAS_SECRET_KEY = 'telitian_gas_secret';
const DEFAULT_SECRET = 'telitian-gibran-secret-2026';

export interface GasDirectResult {
  success: boolean;
  message?: string;
  error?: string;
  data?: any;
  record?: any;
  count?: number;
  isHtmlLogin?: boolean;
}

/**
 * Dapatkan URL Google Apps Script yang tersimpan di browser
 */
export function getSavedGasUrl(): string {
  if (typeof window === 'undefined') return '';
  const stored = localStorage.getItem(STORAGE_GAS_URL_KEY);
  if (stored && stored.trim().startsWith('http')) {
    return stored.trim();
  }
  return '';
}

/**
 * Dapatkan Secret Key Google Apps Script
 */
export function getSavedGasSecret(): string {
  if (typeof window === 'undefined') return DEFAULT_SECRET;
  const stored = localStorage.getItem(STORAGE_GAS_SECRET_KEY);
  return (stored && stored.trim()) ? stored.trim() : DEFAULT_SECRET;
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
