import React, { useState, useEffect } from 'react';
import {
  Database,
  Download,
  Upload,
  Copy,
  Check,
  HardDrive,
  FileCode,
  ShieldCheck,
  Sparkles,
  FileSpreadsheet,
  RotateCcw,
  Wifi,
  WifiOff,
  CheckCircle2,
  RefreshCw,
  AlertCircle,
  ExternalLink,
  Link2,
  ChevronDown,
  ChevronUp,
  Lock,
  Cloud,
} from 'lucide-react';
import { User } from 'firebase/auth';
import { TelitianRecord } from '../types/record';
import { getErrorMessage } from '../lib/errorHelper';
import { formatRupiah, formatDateTimeJakarta } from '../lib/currency';
import { saveCloudSheetsConfig, syncSpreadsheetWithFirestore } from '../lib/firebaseSync';
import { setCloudGasUrlCache } from '../lib/gasClient';

interface BackupViewProps {
  records: TelitianRecord[];
  totalUang: number;
  isAdmin?: boolean;
  onOpenLogin?: () => void;
  onOpenFirebaseSync?: () => void;
  firebaseUser?: User | null;
  onRestoreLocalJson: (records: TelitianRecord[]) => void;
  onExportExcel: () => void;
  onOpenReset: () => void;
  isOnline: boolean;
  pendingOfflineCount: number;
  onSyncOffline: () => void;
}

export const BackupView: React.FC<BackupViewProps> = ({
  records,
  totalUang,
  isAdmin = false,
  onOpenLogin,
  onOpenFirebaseSync,
  firebaseUser,
  onRestoreLocalJson,
  onExportExcel,
  onOpenReset,
  isOnline,
  pendingOfflineCount,
  onSyncOffline,
}) => {
  const [backupStatus, setBackupStatus] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [testingGas, setTestingGas] = useState(false);
  const [savingGasConfig, setSavingGasConfig] = useState(false);
  const [webAppUrl, setWebAppUrl] = useState('');
  const targetSpreadsheetUrl = 'https://docs.google.com/spreadsheets/d/1EPW6gmiZ1uqy2C9_dXB012LXldYVC838axkONsqL5Xs/edit?gid=1699924787';

  const [gasStatusResult, setGasStatusResult] = useState<{
    tested: boolean;
    connected: boolean;
    configured: boolean;
    message: string;
    isHtmlLogin?: boolean;
    spreadsheetName?: string;
  } | null>(null);

  // Manual toggle to view setup guide if user desires, default collapsed when connected
  const [showGuideManual, setShowGuideManual] = useState<boolean | null>(null);
  const isFullyConnected = !!(gasStatusResult?.connected && !gasStatusResult?.isHtmlLogin);
  const showGuide = showGuideManual !== null ? showGuideManual : !isFullyConnected;

  // Load existing configuration on mount
  useEffect(() => {
    fetch('/api/gas/config')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.googleAppsScriptUrl) {
          setWebAppUrl(data.googleAppsScriptUrl);
          fetch('/api/gas/status', { headers: { 'Accept': 'application/json' } })
            .then((sRes) => sRes.json())
            .then((sData) => {
              setGasStatusResult({
                tested: true,
                connected: !!sData.connected,
                configured: !!sData.configured,
                message: sData.message || (sData.connected ? 'Google Apps Script Terhubung!' : 'Belum terhubung'),
                spreadsheetName: sData.spreadsheetName,
                isHtmlLogin: sData.isHtmlLogin,
              });
            })
            .catch(() => {});
        }
      })
      .catch(() => {});
  }, []);

  // Simpan konfigurasi Google Apps Script
  const handleSaveGasConfig = async () => {
    if (!webAppUrl.trim()) {
      alert('Silakan tempel URL Web App Google Apps Script (berakhiran /exec).');
      return;
    }
    setSavingGasConfig(true);
    setGasStatusResult(null);
    try {
      const res = await fetch('/api/gas/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({
          googleAppsScriptUrl: webAppUrl.trim(),
          spreadsheetUrl: targetSpreadsheetUrl,
        }),
      });
      const text = await res.text();
      let data: any;
      try {
        data = JSON.parse(text);
      } catch {
        if (text.includes('<!DOCTYPE') || text.includes('<html')) {
          setGasStatusResult({
            tested: true,
            connected: false,
            configured: true,
            message: 'Server sedang memuat. Silakan tunggu 2 detik dan klik Uji Koneksi Sekarang.',
          });
          return;
        }
        throw new Error(`Respon tidak valid (${res.status}): ${text.slice(0, 100)}`);
      }

      setGasStatusResult({
        tested: true,
        connected: !!data.connected,
        configured: !!data.configured,
        message: data.testMessage || data.message || 'Konfigurasi tersimpan.',
        isHtmlLogin: data.isHtmlLogin,
      });

      // Persist to Cloud Firestore so all other devices and domains automatically receive this URL
      saveCloudSheetsConfig({ googleAppsScriptUrl: webAppUrl }).catch(() => {});
      setCloudGasUrlCache(webAppUrl);

      if (data.connected) {
        setBackupStatus('Konfigurasi berhasil disimpan dan Google Sheets terhubung!');
      }
    } catch (err: any) {
      alert('Gagal menyimpan konfigurasi: ' + (err?.message || err));
    } finally {
      setSavingGasConfig(false);
    }
  };

  // Uji koneksi ke Google Apps Script
  const handleTestGasConnection = async () => {
    setTestingGas(true);
    setGasStatusResult(null);
    try {
      const res = await fetch('/api/gas/status', {
        headers: { 'Accept': 'application/json' },
      });
      const text = await res.text();
      let data: any;
      try {
        data = JSON.parse(text);
      } catch {
        if (text.includes('<!DOCTYPE') || text.includes('<html')) {
          setGasStatusResult({
            tested: true,
            connected: false,
            configured: true,
            message: 'Server sedang memuat. Silakan tunggu 2 detik dan klik Uji Koneksi Sekarang.',
          });
          return;
        }
        throw new Error(`Respon server tidak valid (${res.status}): ${text.slice(0, 100)}`);
      }

      setGasStatusResult({
        tested: true,
        connected: !!data.connected,
        configured: !!data.configured,
        message: data.message || 'Status diterima.',
        isHtmlLogin: data.isHtmlLogin,
        spreadsheetName: data.spreadsheetName,
      });
    } catch (err: any) {
      setGasStatusResult({
        tested: true,
        connected: false,
        configured: true,
        message: err?.message || String(err),
      });
    } finally {
      setTestingGas(false);
    }
  };

  const [syncingGas, setSyncingGas] = useState(false);
  const [syncGasResult, setSyncGasResult] = useState<any>(null);

  // Manual trigger full bidirectional sync across Firestore, Local & Google Sheets
  const handleSyncGasNow = async () => {
    setSyncingGas(true);
    setSyncGasResult(null);
    try {
      // 1. Direct browser sync with Google Sheets & Firestore (updates all domains in real-time)
      const cloudRes = await syncSpreadsheetWithFirestore(webAppUrl);

      // 2. Local server sync
      fetch('/api/gas/sync-now', { method: 'POST' }).catch(() => {});

      if (cloudRes.success) {
        setSyncGasResult({
          success: true,
          pulled: cloudRes.pulledFromSheets,
          pushed: cloudRes.pushedToSheets,
          totalSpreadsheet: cloudRes.totalRecords,
          message: cloudRes.message,
        });
        setBackupStatus(`Sinkronisasi berhasil: ${cloudRes.message}`);
      } else {
        setSyncGasResult({
          success: false,
          error: cloudRes.error || 'Gagal sinkronisasi dengan Google Spreadsheet',
        });
      }
    } catch (err: any) {
      setSyncGasResult({ success: false, error: err?.message || 'Gagal sinkronisasi' });
    } finally {
      setSyncingGas(false);
    }
  };

  // Download client-side JSON backup
  const handleDownloadJson = () => {
    const { date, time } = formatDateTimeJakarta();
    const dataStr = JSON.stringify(
      {
        appName: 'PENDATAAN TELITIAN HAJATAN',
        eventName: 'GIBRAN KURNIAWAN',
        backupDate: date,
        backupTime: time,
        totalData: records.length,
        totalUang: totalUang,
        records: records,
      },
      null,
      2
    );

    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Backup-Telitian-Gibran-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
    setBackupStatus('File cadangan JSON berhasil diunduh ke perangkat Anda.');
  };

  // Restore client-side JSON backup
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const content = evt.target?.result as string;
        const parsed = JSON.parse(content);
        const list = Array.isArray(parsed) ? parsed : parsed.records;
        if (Array.isArray(list)) {
          onRestoreLocalJson(list);
          alert(`Berhasil memulihkan ${list.length} data telitian!`);
        } else {
          alert('Format file JSON backup tidak valid.');
        }
      } catch (err) {
        alert('Gagal membaca file backup.');
      }
    };
    reader.readAsText(file);
  };

  const appsScriptCodeGuide = `// Lihat file Code.gs di root project untuk kode lengkap Google Apps Script.
// 1. Buat Spreadsheet "DATABASE TELITIAN GIBRAN KURNIAWAN"
// 2. Buka Extensions > Apps Script
// 3. Tempel seluruh isi Code.gs
// 4. Set Properti Skrip: APPS_SCRIPT_SECRET=telitian-gibran-secret-2026
// 5. Jalankan fungsi setupDatabase()
// 6. Terapkan sebagai Web App (Akses: Anyone)
// 7. Simpan Web App URL ke GOOGLE_APPS_SCRIPT_URL`;

  const copyScriptToClipboard = () => {
    navigator.clipboard.writeText(appsScriptCodeGuide);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <div className="space-y-5 sm:space-y-6 w-full max-w-full overflow-hidden">
      {/* Header Banner */}
      <div className="rounded-3xl bg-white border border-slate-200 p-6 md:p-8 shadow-xs relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold uppercase mb-2">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Sistem Proteksi Realtime & Cadangan Ganda</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black uppercase text-slate-900 tracking-tight flex items-center gap-2">
              <span>Backup & Excel Realtime</span>
              <Sparkles className="w-5 h-5 text-fuchsia-600" />
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-xl font-medium">
              Setiap data masuk otomatis terhubung ke file Excel, memori browser lokal (agar tidak hilang saat refresh atau terputus), serta sinkronisasi server & Google Drive.
            </p>
          </div>

          {/* Quick Status Panel */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs space-y-2 min-w-[240px]">
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Status Koneksi:</span>
              <span className="font-bold flex items-center gap-1 text-emerald-700">
                {isOnline ? (
                  <>
                    <Wifi className="w-3.5 h-3.5" /> Online Realtime
                  </>
                ) : (
                  <>
                    <WifiOff className="w-3.5 h-3.5 text-amber-600" /> Offline (Aman)
                  </>
                )}
              </span>
            </div>
            <div className="pt-2 border-t border-slate-200 text-slate-700 flex justify-between">
              <span>Total Data Tercatat:</span>
              <strong className="text-slate-900 font-bold">{records.length} Tamu</strong>
            </div>
            <div className="text-slate-700 flex justify-between">
              <span>Total Kas Masuk:</span>
              <strong className="text-violet-700 font-extrabold">{formatRupiah(totalUang)}</strong>
            </div>
            {pendingOfflineCount > 0 && (
              <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-amber-800">
                <span>Data Belum Sync:</span>
                <button
                  onClick={onSyncOffline}
                  className="px-2 py-0.5 rounded bg-amber-500 text-white font-bold text-[11px] hover:bg-amber-600 transition-colors cursor-pointer"
                >
                  Sync ({pendingOfflineCount})
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 3-Layer Anti-Loss Protection Summary */}
      <div className="rounded-3xl bg-white border border-slate-200 p-5 md:p-6 shadow-xs">
        <h3 className="text-sm font-black uppercase text-emerald-700 tracking-wider flex items-center gap-2 mb-3">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>Proteksi Anti Hilang (Offline & Refresh Safe)</span>
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
            <div className="font-bold text-slate-900 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>Memori Lokal Browser</span>
            </div>
            <p className="text-slate-600 text-[11px] leading-relaxed">
              Tersimpan langsung di perangkat HP/Laptop. Jika halaman di-refresh atau koneksi mati, data tetap utuh.
            </p>
          </div>
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
            <div className="font-bold text-slate-900 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>Sinkronisasi Excel Realtime</span>
            </div>
            <p className="text-slate-600 text-[11px] leading-relaxed">
              Format tabel Excel (.xlsx) selalu terbarui setiap saat dan siap diunduh kapan pun dibutuhkan.
            </p>
          </div>
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
            <div className="font-bold text-slate-900 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>Database Server & Backup</span>
            </div>
            <p className="text-slate-600 text-[11px] leading-relaxed">
              Tersimpan aman di server dengan arsip otomatis sebelum dilakukan aksi reset.
            </p>
          </div>
        </div>
      </div>

      {/* Backup Status Toast / Alert */}
      {backupStatus && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-3 animate-fade-in">
          <Check className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{backupStatus}</span>
        </div>
      )}

      {/* Firebase Firestore & Vercel Cloud Sync Card */}
      <div className="rounded-3xl bg-gradient-to-r from-amber-50 via-orange-50/40 to-white border-2 border-amber-300 p-6 md:p-8 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-500 flex items-center justify-center text-white shadow-xs">
              <Cloud className="w-6 h-6" />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-amber-100 border border-amber-300 text-amber-900 text-[10px] font-black uppercase">
                Firebase Firestore Cloud
              </div>
              <h3 className="text-lg font-black uppercase text-slate-900 mt-1">
                Sinkronisasi Multi-Perangkat (Vercel &amp; Cloud)
              </h3>
              <p className="text-xs text-slate-600">
                {firebaseUser ? (
                  <span>
                    Login sebagai: <strong className="text-amber-800">{firebaseUser.displayName || firebaseUser.email}</strong> • Data tersinkron otomatis antar HP
                  </span>
                ) : (
                  <span>
                    Masuk dengan akun Google atau email untuk mengaktifkan sinkronisasi otomatis ke cloud Firestore.
                  </span>
                )}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {onOpenFirebaseSync && (
              <button
                id="btn-open-firebase-sync-panel"
                type="button"
                onClick={onOpenFirebaseSync}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                <span>{firebaseUser ? 'Buka Sinkronisasi Cloud' : 'Login & Sinkron Cloud'}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Target Google Sheet Database Card */}
      <div className="rounded-3xl bg-gradient-to-r from-emerald-50 via-teal-50 to-white border-2 border-emerald-300 p-6 md:p-8 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-emerald-200">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-600 flex items-center justify-center text-white shadow-xs">
              <Database className="w-6 h-6" />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-emerald-100 border border-emerald-300 text-emerald-900 text-[10px] font-black uppercase">
                Database Cloud Aktif
              </div>
              <h3 className="text-lg font-black uppercase text-slate-900 mt-1">
                Google Sheets Database Terhubung
              </h3>
              <p className="text-xs text-slate-600">
                Sheet GID: <code className="text-emerald-800 font-bold">1699924787</code> | ID: <code className="text-slate-700 text-[11px]">1EPW6gmiZ1uqy2C9_dXB012LXldYVC838axkONsqL5Xs</code>
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <a
              id="btn-open-google-sheet-target"
              href={targetSpreadsheetUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
            >
              <span>Buka Google Spreadsheet</span>
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        </div>

        {/* Input Web App URL */}
        <div className="mt-5 space-y-3">
          <label className="block text-xs font-bold text-slate-800 uppercase tracking-wide">
            URL Google Apps Script Web App (Backend Sinkronisasi):
          </label>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              id="input-gas-url"
              type="text"
              placeholder="https://script.google.com/macros/s/AKfycb.../exec"
              value={webAppUrl}
              onChange={(e) => setWebAppUrl(e.target.value)}
              className="flex-1 px-4 py-2.5 rounded-xl bg-white border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono text-xs text-slate-800"
            />
            <button
              id="btn-save-gas-url"
              onClick={handleSaveGasConfig}
              disabled={savingGasConfig}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all disabled:opacity-50 cursor-pointer shadow-xs whitespace-nowrap"
            >
              <Link2 className="w-4 h-4" />
              <span>{savingGasConfig ? 'Menghubungkan...' : 'Simpan & Hubungkan'}</span>
            </button>
          </div>
          <p className="text-[11px] text-slate-500">
            Dapatkan URL ini setelah menerapkan (Deploy) file <code>Code.gs</code> di menu Extensions &gt; Apps Script pada spreadsheet Anda dengan opsi <em>Who has access: Anyone</em>.
          </p>
        </div>
      </div>

      {/* Grid Backup & Excel Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card 1: Excel Realtime (.xlsx) */}
        <div className="rounded-3xl bg-white border border-emerald-200 p-6 shadow-xs flex flex-col justify-between hover:shadow-md transition-shadow">
          <div>
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 mb-4">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-black uppercase text-slate-900">
              Excel Realtime (.xlsx)
            </h3>
            <p className="text-xs text-slate-600 mt-1 leading-relaxed">
              File Excel selalu terupdate saat data baru masuk. Unduh format spreadsheet resmi dengan tabel rapi, penomoran, dan total rupiah.
            </p>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 space-y-2">
            <button
              id="btn-backup-download-excel"
              onClick={onExportExcel}
              className="w-full py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black uppercase tracking-wider shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Unduh Excel Realtime ({records.length})</span>
            </button>
          </div>
        </div>

        {/* Card 2: JSON Backup & Restore */}
        <div className="rounded-3xl bg-white border border-slate-200 p-6 shadow-xs flex flex-col justify-between hover:shadow-md transition-shadow">
          <div>
            <div className="w-12 h-12 rounded-2xl bg-violet-50 border border-violet-200 flex items-center justify-center text-violet-600 mb-4">
              <HardDrive className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-black uppercase text-slate-900">
              Cadangan Arsip JSON
            </h3>
            <p className="text-xs text-slate-600 mt-1 leading-relaxed">
              Unduh cadangan data mentah langsung ke memori laptop/HP untuk dipulihkan kembali kapan saja di browser mana pun.
            </p>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 space-y-2">
            <button
              id="btn-download-json"
              onClick={handleDownloadJson}
              className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Download className="w-4 h-4 text-violet-600" />
              <span>Unduh JSON ({records.length} Data)</span>
            </button>

            {isAdmin ? (
              <label className="w-full py-2.5 rounded-xl border border-dashed border-slate-300 hover:border-violet-500 bg-slate-50 text-slate-700 hover:text-slate-900 text-xs font-semibold cursor-pointer transition-all flex items-center justify-center gap-2">
                <Upload className="w-4 h-4 text-violet-600" />
                <span>Pulihkan dari File JSON</span>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            ) : (
              <button
                type="button"
                onClick={onOpenLogin}
                title="Khusus Admin Meja Telitian"
                className="w-full py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-500 hover:text-slate-800 text-[11px] font-medium transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Lock className="w-3.5 h-3.5 text-slate-400" />
                <span>Pulihkan JSON (Khusus Admin)</span>
              </button>
            )}
          </div>
        </div>

        {/* Card 3: Reset Mulai Dari 0 */}
        <div className="rounded-3xl bg-white border border-rose-200 p-6 shadow-xs flex flex-col justify-between hover:shadow-md transition-shadow">
          <div>
            <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 mb-4">
              <RotateCcw className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-black uppercase text-slate-900">
              Mulai dari 0 (Reset)
            </h3>
            <p className="text-xs text-slate-600 mt-1 leading-relaxed">
              Mereset seluruh data telitian kembali ke 0. File arsip pengaman otomatis dibuat sebelum pengosongan agar tidak ada data yang musnah.
            </p>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 space-y-2">
            {isAdmin ? (
              <button
                id="btn-backup-reset-zero"
                onClick={onOpenReset}
                className="w-full py-3 rounded-2xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 text-xs font-black uppercase tracking-wider shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Reset Database ke 0</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={onOpenLogin}
                className="w-full py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-slate-500 hover:text-slate-800 text-xs font-medium transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Lock className="w-3.5 h-3.5 text-slate-400" />
                <span>Reset Database (Khusus Admin)</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Guide Section for Google Sheets & Apps Script Setup - Auto-hide when connected */}
      <div className="rounded-3xl bg-white border border-slate-200 p-6 md:p-8 shadow-xs transition-all">
        <div className="flex items-center justify-between gap-4 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${isFullyConnected ? 'bg-emerald-50 border border-emerald-200 text-emerald-600' : 'bg-violet-50 border border-violet-200 text-violet-600'}`}>
              {isFullyConnected ? <CheckCircle2 className="w-4 h-4" /> : <FileCode className="w-4 h-4" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-black uppercase text-slate-900">
                  Petunjuk Setup Google Apps Script & Sheets
                </h4>
                {isFullyConnected && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-100 border border-emerald-300 text-emerald-800 text-[10px] font-bold">
                    <Check className="w-3 h-3 text-emerald-700" />
                    Terhubung Sempurna
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-500">
                {isFullyConnected
                  ? 'Koneksi ke Google Sheets aktif dan normal. Petunjuk disembunyikan otomatis untuk kerapian tampilan.'
                  : 'File Code.gs sudah siap digunakan di root project ini untuk sinkronisasi Google Sheets realtime.'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isFullyConnected && (
              <button
                id="btn-toggle-guide"
                onClick={() => setShowGuideManual(!showGuide)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 text-xs font-bold transition-all cursor-pointer"
              >
                {showGuide ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                <span>{showGuide ? 'Sembunyikan Petunjuk' : 'Buka Petunjuk'}</span>
              </button>
            )}
            {showGuide && (
              <button
                onClick={copyScriptToClipboard}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 text-xs font-bold transition-all cursor-pointer"
              >
                {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
                <span>{copiedCode ? 'Tersalin!' : 'Salin Petunjuk'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Detailed Guide Steps - only rendered when showGuide is true */}
        {showGuide ? (
          <ol className="mt-4 list-decimal list-inside space-y-2 text-xs text-slate-700 leading-relaxed font-normal">
            <li>
              Buka <strong className="text-slate-900">Google Sheets</strong> baru, beri nama: <code className="text-violet-700 font-semibold">DATABASE TELITIAN GIBRAN KURNIAWAN</code>.
            </li>
            <li>
              Pilih menu <strong className="text-slate-900">Extensions (Ekstensi) &gt; Apps Script</strong>.
            </li>
            <li>
              Salin seluruh kode dari file <code className="text-violet-700 font-semibold">Code.gs</code> yang ada di root direktori aplikasi ini, lalu simpan (ikon disket / Ctrl+S).
            </li>
            <li>
              Buka <strong className="text-slate-900">Project Settings</strong> (ikon gerigi di bilah kiri Apps Script) &gt; bagian <strong className="text-slate-900">Script Properties</strong>, tambahkan properti:
              <div className="mt-1 ml-4 p-2.5 rounded-xl bg-slate-100 border border-slate-200 font-mono text-[11px] text-slate-800">
                Property: APPS_SCRIPT_SECRET<br />
                Value: telitian-gibran-secret-2026
              </div>
            </li>
            <li>
              Di dropdown fungsi atas, pilih <code className="text-violet-700 font-semibold">setupDatabase</code> lalu klik <strong className="text-slate-900">Run (Jalankan)</strong> sekali. Setujui izin akun Google untuk membuat lembar <code>DATA_TELITIAN</code>, <code>DATA_TERHAPUS</code>, <code>LOG_AKTIVITAS</code>, dan <code>ARCHIVE_TELITIAN</code>.
            </li>
            <li>
              Klik tombol biru <strong className="text-slate-900">Deploy &gt; New deployment</strong>:
              <ul className="list-disc list-inside ml-4 mt-1 space-y-1 text-slate-600">
                <li>Pilih tipe: <strong>Web app</strong></li>
                <li>Execute as: <strong>Me (email Google Anda)</strong></li>
                <li><strong className="text-rose-600">Who has access: Anyone (Siapa saja)</strong> &larr; <em>Wajib dipilih agar web server dapat menulis data tanpa terblokir halaman login Google!</em></li>
              </ul>
            </li>
            <li>
              Salin <strong>Web App URL</strong> (berakhiran <code>/exec</code>) ke file <code className="text-violet-700 font-semibold">.env</code> pada variabel:
              <div className="mt-1 ml-4 p-2.5 rounded-xl bg-slate-100 border border-slate-200 font-mono text-[11px] text-emerald-800 font-semibold">
                GOOGLE_APPS_SCRIPT_URL=https://script.google.com/macros/s/AKfycb.../exec
              </div>
            </li>
          </ol>
        ) : (
          <div className="mt-3 p-3 rounded-2xl bg-emerald-50/70 border border-emerald-200/80 flex items-center justify-between gap-3 text-xs text-emerald-900">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="font-medium text-[11px]">
                Google Apps Script & Google Sheets berjalan 100% normal. Petunjuk instalasi disembunyikan otomatis.
              </span>
            </div>
            <button
              onClick={() => setShowGuideManual(true)}
              className="text-[11px] font-bold text-emerald-700 hover:text-emerald-800 hover:underline shrink-0 cursor-pointer"
            >
              Lihat Detail Langkah
            </button>
          </div>
        )}

        {/* Live Test Connection Tool */}
        <div className="mt-6 pt-5 border-t border-slate-100">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
            <div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-violet-600" />
                <span className="text-xs font-bold text-slate-900">Uji Status Koneksi & Sinkronisasi Google Apps Script</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Periksa status URL Web App dan sinkronkan data antara database lokal dan Google Sheets sekarang juga.
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                id="btn-test-gas-connection"
                onClick={handleTestGasConnection}
                disabled={testingGas}
                className="inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-98 text-white text-xs font-bold transition-all disabled:opacity-50 cursor-pointer shadow-xs whitespace-nowrap"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${testingGas ? 'animate-spin' : ''}`} />
                <span>{testingGas ? 'Menguji...' : 'Uji Koneksi'}</span>
              </button>
              <button
                id="btn-sync-gas-now"
                onClick={handleSyncGasNow}
                disabled={syncingGas}
                className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white text-xs font-bold transition-all disabled:opacity-50 cursor-pointer shadow-xs whitespace-nowrap"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${syncingGas ? 'animate-spin' : ''}`} />
                <span>{syncingGas ? 'Menyinkronkan...' : 'Sinkron Sekarang'}</span>
              </button>
            </div>
          </div>

          {syncGasResult && (
            <div
              className={`mt-3 p-4 rounded-2xl border text-xs leading-relaxed transition-all ${
                syncGasResult.success
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  : 'bg-amber-50 border-amber-200 text-amber-900'
              }`}
            >
              <div className="flex items-start gap-2.5">
                {syncGasResult.success ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                )}
                <div>
                  <p className="font-bold">
                    {syncGasResult.success ? 'Sinkronisasi Berhasil!' : 'Gagal Sinkronisasi'}
                  </p>
                  <p className="mt-1 text-[11px] opacity-90">
                    {getErrorMessage(syncGasResult.message || syncGasResult.error)}
                  </p>
                  {syncGasResult.pulled !== undefined && (
                    <div className="mt-2 flex flex-wrap gap-2 text-[11px] font-mono font-semibold text-emerald-800">
                      <span className="px-2 py-0.5 rounded bg-white border border-emerald-200">
                        Ditarik dari Sheets: {syncGasResult.pulled}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-white border border-emerald-200">
                        Dikirim ke Sheets: {syncGasResult.pushed}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-white border border-emerald-200">
                        Total Sinkron: {syncGasResult.reconciledCount}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {gasStatusResult && (
            <div
              className={`mt-3 p-4 rounded-2xl border text-xs leading-relaxed transition-all ${
                gasStatusResult.connected
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  : 'bg-amber-50 border-amber-200 text-amber-900'
              }`}
            >
              <div className="flex items-start gap-2.5">
                {gasStatusResult.connected ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                )}
                <div>
                  <p className="font-bold">
                    {gasStatusResult.connected
                      ? 'Koneksi Berhasil!'
                      : gasStatusResult.configured
                      ? 'Koneksi Memerlukan Penyesuaian'
                      : 'Belum Dikonfigurasi'}
                  </p>
                  <p className="mt-1 text-[11px] opacity-90">{getErrorMessage(gasStatusResult.message)}</p>

                  {gasStatusResult.spreadsheetName && (
                    <div className="mt-2 inline-block px-2.5 py-1 rounded-lg bg-white/70 border border-emerald-300 font-semibold text-[11px] text-emerald-800">
                      Spreadsheet Terhubung: {gasStatusResult.spreadsheetName}
                    </div>
                  )}

                  {gasStatusResult.isHtmlLogin && (
                    <div className="mt-3 p-3.5 rounded-xl bg-white border border-amber-300 text-[11px] text-slate-800 shadow-xs space-y-2">
                      <div className="font-bold text-amber-900 flex items-center gap-1.5 text-xs">
                        <span>Penyebab & Solusi (1 Menit):</span>
                      </div>
                      <p className="text-slate-700">
                        Google Apps Script Web App Anda saat ini di-deploy dengan opsi <strong>"Only myself"</strong>, sehingga Google meminta otentikasi login akun Google.
                      </p>
                      <ol className="list-decimal list-inside space-y-1 text-slate-800 font-medium pl-1">
                        <li>Buka spreadsheet Anda lalu klik menu <strong>Extensions (Ekstensi) &gt; Apps Script</strong>.</li>
                        <li>Klik tombol biru <strong>Deploy (Terapkan)</strong> di kanan atas &gt; pilih <strong>Manage deployments (Kelola penerapan)</strong>.</li>
                        <li>Klik ikon pensil <strong>(Edit)</strong> pada deployment aktif Anda.</li>
                        <li>Ubah pilihan <strong>Who has access (Siapa yang memiliki akses)</strong> menjadi <strong>Anyone (Siapa saja)</strong>.</li>
                        <li>Klik <strong>Deploy</strong> untuk menyimpan perubahan.</li>
                      </ol>
                      <div className="pt-1 flex items-center gap-2">
                        <a
                          href={targetSpreadsheetUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] transition-colors"
                        >
                          <span>Buka Spreadsheet Sekarang</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
