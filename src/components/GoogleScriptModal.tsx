import React, { useState, useEffect } from 'react';
import { X, Copy, Check, ExternalLink, RefreshCw, AlertTriangle, CheckCircle2, ShieldCheck, Database, FileSpreadsheet, ArrowRight, Play } from 'lucide-react';

interface GoogleScriptModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GoogleScriptModal: React.FC<GoogleScriptModalProps> = ({ isOpen, onClose }) => {
  const [copied, setCopied] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<any>(null);
  const [gasCode, setGasCode] = useState<string>('Memuat kode skrip...');
  const [isLoadingCode, setIsLoadingCode] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsLoadingCode(true);
      fetch('/api/gas/code')
        .then((res) => res.json())
        .then((data) => {
          if (data.success && data.code) {
            setGasCode(data.code);
          } else {
            setGasCode('// Buka file Code.gs di root repository project untuk kode lengkap.');
          }
        })
        .catch(() => {
          setGasCode('// Buka file Code.gs di root repository project untuk kode lengkap.');
        })
        .finally(() => {
          setIsLoadingCode(false);
        });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(gasCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/gas/status');
      const data = await res.json();
      setTestResult(data);
    } catch (e: any) {
      setTestResult({ success: false, connected: false, message: e.message || 'Gagal menghubungi server' });
    } finally {
      setTesting(false);
    }
  };

  const handleSyncNow = async () => {
    setSyncing(true);
    setSyncResult(null);
    try {
      const res = await fetch('/api/gas/sync-now', { method: 'POST' });
      const data = await res.json();
      setSyncResult(data);
    } catch (e: any) {
      setSyncResult({ success: false, error: e.message || 'Gagal sinkronisasi' });
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-3xl max-h-[92vh] flex flex-col rounded-3xl bg-slate-900 border border-slate-700 shadow-2xl text-slate-100 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/70">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Panduan Sinkronisasi Google Sheets & Apps Script</h2>
              <p className="text-xs text-slate-400">Sinkronisasi Cloud Realtime Multi-Perangkat (HP & Laptop)</p>
            </div>
          </div>
          <button
            id="btn-close-gas-modal"
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-sm">
          {/* Quick Action Bar: Test & Sync */}
          <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Koneksi & Sinkronisasi</span>
                <div className="mt-1 flex items-center gap-2">
                  <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="font-semibold text-white">Database Lokal & Cloud Siap Terhubung</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  id="btn-test-cloud-connection"
                  onClick={handleTestConnection}
                  disabled={testing}
                  className="flex items-center gap-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 px-3.5 py-2 text-xs font-semibold text-slate-200 transition-colors cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${testing ? 'animate-spin text-amber-400' : ''}`} />
                  <span>{testing ? 'Menguji...' : 'Uji Koneksi'}</span>
                </button>
                <button
                  id="btn-sync-now-modal"
                  onClick={handleSyncNow}
                  disabled={syncing}
                  className="flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-4 py-2 text-xs font-bold text-white transition-colors cursor-pointer disabled:opacity-50 shadow-xs"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
                  <span>{syncing ? 'Menyinkronkan...' : 'Sinkron Sekarang'}</span>
                </button>
              </div>
            </div>

            {testResult && (
              <div className="mt-3 p-3.5 rounded-xl bg-slate-900 border border-slate-800 text-xs">
                <div className="flex items-center gap-2 mb-1">
                  {testResult.connected ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-amber-400" />
                  )}
                  <span className="font-semibold text-slate-200">
                    {testResult.connected ? 'Google Sheets Terhubung Normal' : 'Status Koneksi:'}
                  </span>
                </div>
                <p className="text-slate-300 mt-1">{testResult.message}</p>
                {testResult.spreadsheetName && (
                  <p className="text-emerald-400 font-mono text-[11px] mt-1">
                    Spreadsheet: {testResult.spreadsheetName} ({testResult.recordsCount ?? 0} data)
                  </p>
                )}
              </div>
            )}

            {syncResult && (
              <div className="mt-3 p-3.5 rounded-xl bg-slate-900 border border-slate-800 text-xs">
                <div className="flex items-center gap-2 mb-1">
                  {syncResult.success ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-amber-400" />
                  )}
                  <span className="font-semibold text-slate-200">
                    {syncResult.success ? 'Sinkronisasi Berhasil' : 'Pemberitahuan Sinkronisasi'}
                  </span>
                </div>
                <p className="text-slate-300 mt-1">{syncResult.message || syncResult.error}</p>
              </div>
            )}
          </div>

          {/* Langkah Setup */}
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-bold">1</span>
              Langkah Pasang Apps Script di Google Sheets:
            </h3>
            <ol className="mt-3 space-y-2.5 text-xs text-slate-300 list-decimal list-inside pl-1 leading-relaxed">
              <li>
                Buka Spreadsheet Anda:{' '}
                <a
                  href="https://docs.google.com/spreadsheets/d/1EPW6gmiZ1uqy2C9_dXB012LXldYVC838axkONsqL5Xs/edit?gid=1699924787"
                  target="_blank"
                  rel="noreferrer"
                  className="text-emerald-400 font-bold underline inline-flex items-center gap-1"
                >
                  Spreadsheet Telitian Gibran (GID: 1699924787) <ExternalLink className="w-3 h-3" />
                </a>
              </li>
              <li>Klik menu <strong>Extensions (Ekstensi) &gt; Apps Script</strong>.</li>
              <li>Hapus teks bawaan di editor Apps Script, lalu tempel seluruh kode dari kotak di bawah.</li>
              <li>
                Buka <strong>Project Settings</strong> (ikon gerigi di kiri) &gt; <strong>Script Properties</strong>, tambahkan:
                <div className="mt-1 ml-4 p-2.5 rounded-xl bg-slate-950 text-emerald-400 font-mono text-[11px] border border-slate-800">
                  Property: APPS_SCRIPT_SECRET<br />
                  Value: telitian-gibran-secret-2026
                </div>
              </li>
              <li>Pilih fungsi <strong>setupDatabase</strong> di bilah atas, lalu klik <strong>Run (Jalankan)</strong> satu kali untuk menyiapkan sheet <code>DATA_TELITIAN</code>, <code>DATA_TERHAPUS</code>, dan <code>LOG_AKTIVITAS</code>.</li>
              <li>
                Klik tombol biru <strong>Deploy (Terapkan) &gt; New deployment (Penerapan baru)</strong>:
                <ul className="list-disc list-inside pl-4 mt-1 text-slate-400 space-y-0.5">
                  <li>Tipe: <strong>Web app</strong></li>
                  <li>Execute as: <strong>Me (email Anda)</strong></li>
                  <li><strong className="text-amber-300">Who has access: Anyone (Siapa saja)</strong> &larr; <em>Wajib dipilih</em></li>
                </ul>
              </li>
              <li>Salin URL Web App (berakhiran <code>/exec</code>) lalu tempel di tab <strong>Backup & Excel</strong>.</li>
            </ol>
          </div>

          {/* Code Box with Copy */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-500/20 text-amber-400 text-xs font-bold">2</span>
                Kode Lengkap Google Apps Script (Code.gs)
              </h3>
              <button
                id="btn-copy-gas-code"
                onClick={copyToClipboard}
                className="flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-3.5 py-1.5 text-xs font-bold text-white shadow-xs transition-colors cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Tersalin ke Clipboard!' : 'Salin Seluruh Kode'}</span>
              </button>
            </div>
            <div className="relative rounded-2xl border border-slate-800 bg-slate-950 p-3.5 max-h-64 overflow-y-auto font-mono text-[11px] text-slate-300 leading-relaxed">
              <pre>{isLoadingCode ? 'Memuat kode skrip...' : gasCode}</pre>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-800 bg-slate-950/70 text-xs text-slate-400">
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            Proxy server otomatis menyinkronkan data tiap 25 detik
          </span>
          <button
            onClick={onClose}
            className="rounded-xl bg-slate-800 hover:bg-slate-700 px-4 py-2 text-xs font-bold text-white transition-colors cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
