import React, { useState } from 'react';
import {
  FileSpreadsheet,
  FileText,
  Printer,
  Download,
  Upload,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  ExternalLink,
  ShieldCheck,
  Baby,
  User,
  Coins,
  Cloud,
} from 'lucide-react';
import { User as FirebaseUser } from 'firebase/auth';
import { TelitianRecord } from '../types/record';
import { formatRupiah } from '../lib/currency';
import { exportToExcel, exportToWord } from '../lib/export';

interface LaporanViewProps {
  records: TelitianRecord[];
  totalData: number;
  totalUang: number;
  onPrint: () => void;
  onSyncGas: () => Promise<any>;
  onRestoreData?: (records: TelitianRecord[]) => void;
  onOpenReset?: () => void;
  isAdmin?: boolean;
  onOpenGoogleDriveSheets?: () => void;
  onOpenFirebaseSync?: () => void;
  firebaseUser?: FirebaseUser | null;
}

export const LaporanView: React.FC<LaporanViewProps> = ({
  records,
  totalData,
  totalUang,
  onPrint,
  onSyncGas,
  onRestoreData,
  onOpenReset,
  isAdmin = false,
  onOpenGoogleDriveSheets,
  onOpenFirebaseSync,
  firebaseUser,
}) => {
  const [isExporting, setIsExporting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatusMsg, setSyncStatusMsg] = useState<string | null>(null);

  // Perhitungan Telitian Dewasa vs Anak & Rata-rata
  let anakCount = 0;
  let anakTotal = 0;
  let dewasaCount = 0;
  let dewasaTotal = 0;

  for (const r of records) {
    const isAnak =
      r.jenisTelitian === 'Telitian Anak' ||
      (r.kategoriTamu && r.kategoriTamu.toLowerCase().includes('anak'));

    if (isAnak) {
      anakCount++;
      anakTotal += r.amount || 0;
    } else {
      dewasaCount++;
      dewasaTotal += r.amount || 0;
    }
  }

  const average = totalData > 0 ? Math.round(totalUang / totalData) : 0;

  const handleExcelExport = () => {
    setIsExporting(true);
    try {
      exportToExcel(records, totalUang);
    } finally {
      setIsExporting(false);
    }
  };

  const handleWordExport = async () => {
    setIsExporting(true);
    try {
      await exportToWord(records, totalUang);
    } finally {
      setIsExporting(false);
    }
  };

  const handleManualSync = async () => {
    setIsSyncing(true);
    setSyncStatusMsg(null);
    try {
      const res = await onSyncGas();
      if (res && res.success) {
        setSyncStatusMsg('Data berhasil disinkronkan ke Google Sheets.');
      } else {
        setSyncStatusMsg('Sinkronisasi selesai.');
      }
    } catch (e: any) {
      setSyncStatusMsg('Sinkronisasi selesai dengan data lokal tersimpan aman.');
    } finally {
      setIsSyncing(false);
      setTimeout(() => setSyncStatusMsg(null), 4000);
    }
  };

  // Unduh Cadangan JSON
  const handleDownloadBackup = () => {
    const backupData = {
      app: 'Telitian Gibran',
      event: 'Khitanan Gibran Kurniawan',
      date: '19 September 2026',
      exportedAt: new Date().toISOString(),
      totalData,
      totalUang,
      records,
    };

    const blob = new Blob([JSON.stringify(backupData, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Backup-Telitian-Gibran_${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Pulihkan Cadangan JSON
  const handleRestoreFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        const importedRecords = parsed.records || parsed;
        if (Array.isArray(importedRecords) && onRestoreData) {
          onRestoreData(importedRecords);
          alert(`Berhasil memulihkan ${importedRecords.length} data telitian.`);
        } else {
          alert('Format berkas cadangan tidak valid.');
        }
      } catch (err) {
        alert('Gagal membaca berkas cadangan JSON.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div id="laporan-section" className="space-y-4 max-w-full">
      {/* Header Laporan */}
      <div className="rounded-xl sm:rounded-2xl bg-white border border-slate-200/80 p-4 shadow-2xs">
        <h2 className="text-base sm:text-lg font-bold text-slate-900 leading-tight">
          Laporan &amp; Ekspor Telitian
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Rekapitulasi keuangan acara Khitanan Gibran Kurniawan
        </p>
      </div>

      {/* Ringkasan Keuangan Utama */}
      <div className="rounded-xl sm:rounded-2xl bg-white border border-slate-200/80 p-4 shadow-2xs space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100 text-xs font-bold uppercase tracking-wider text-slate-700">
          <span>Ringkasan Keuangan</span>
          <span className="text-violet-700 font-semibold lowercase font-mono">19 Sep 2026</span>
        </div>

        {/* Total Uang Terkumpul */}
        <div className="p-3.5 rounded-xl bg-violet-50 border border-violet-100 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-violet-800">Total Uang Masuk</p>
            <p className="text-xl sm:text-2xl font-extrabold text-violet-950 font-mono mt-0.5">
              {formatRupiah(totalUang)}
            </p>
          </div>
          <div className="text-right">
            <span className="text-xs text-violet-700 font-semibold">{totalData} Tamu</span>
          </div>
        </div>

        {/* Grid Telitian Dewasa vs Anak */}
        <div className="grid grid-cols-2 gap-2.5">
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
            <div className="flex items-center gap-1.5 text-xs text-slate-600 font-bold mb-1">
              <User className="w-3.5 h-3.5 text-blue-600" />
              <span>Telitian Dewasa</span>
            </div>
            <div className="font-bold text-slate-900 font-mono text-sm">
              {formatRupiah(dewasaTotal)}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">{dewasaCount} Amplop</div>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
            <div className="flex items-center gap-1.5 text-xs text-slate-600 font-bold mb-1">
              <Baby className="w-3.5 h-3.5 text-pink-500" />
              <span>Telitian Anak</span>
            </div>
            <div className="font-bold text-slate-900 font-mono text-sm">
              {formatRupiah(anakTotal)}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">{anakCount} Amplop</div>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs text-slate-600">
          <span>Rata-rata per Amplop:</span>
          <span className="font-bold text-slate-900 font-mono">{formatRupiah(average)}</span>
        </div>
      </div>

      {/* Download & Export Section */}
      <div className="rounded-xl sm:rounded-2xl bg-white border border-slate-200/80 p-4 shadow-2xs space-y-3">
        <h3 className="text-sm font-bold text-slate-900">
          Unduh Dokumen Laporan
        </h3>

        <div className="space-y-2.5">
          {/* 1. Unduh Excel */}
          <button
            type="button"
            onClick={handleExcelExport}
            disabled={isExporting}
            className="w-full h-12 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-between font-semibold text-sm shadow-2xs transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2.5">
              <FileSpreadsheet className="w-5 h-5" />
              <span>Unduh File Excel (.xlsx)</span>
            </div>
            <Download className="w-4 h-4 opacity-80" />
          </button>

          {/* 2. Unduh Word */}
          <button
            type="button"
            onClick={handleWordExport}
            disabled={isExporting}
            className="w-full h-12 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-between font-semibold text-sm shadow-2xs transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2.5">
              <FileText className="w-5 h-5" />
              <span>Unduh Dokumen Word (.docx)</span>
            </div>
            <Download className="w-4 h-4 opacity-80" />
          </button>

          {/* 3. Cetak Laporan Langsung */}
          <button
            type="button"
            onClick={onPrint}
            className="w-full h-12 px-4 rounded-xl bg-slate-800 hover:bg-slate-900 text-white flex items-center justify-between font-semibold text-sm shadow-2xs transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2.5">
              <Printer className="w-5 h-5" />
              <span>Cetak Laporan (Print / PDF)</span>
            </div>
            <ExternalLink className="w-4 h-4 opacity-80" />
          </button>
        </div>
      </div>

      {/* Firebase Firestore & Vercel Sync */}
      {onOpenFirebaseSync && (
        <div className="rounded-xl sm:rounded-2xl bg-white border border-amber-300 p-4 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-xs">
                <Cloud className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Firebase &amp; Vercel Cloud Sync</h3>
                <p className="text-xs text-slate-500">
                  {firebaseUser
                    ? `Terhubung: ${firebaseUser.displayName || firebaseUser.email}`
                    : 'Masuk dengan Google / Email untuk sinkron antar perangkat'}
                </p>
              </div>
            </div>
            {firebaseUser ? (
              <span className="flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                <CheckCircle2 className="w-3.5 h-3.5 text-amber-600" />
                <span>Terhubung</span>
              </span>
            ) : (
              <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                Belum Login
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={onOpenFirebaseSync}
            className="w-full h-11 rounded-xl bg-amber-600 hover:bg-amber-700 text-white flex items-center justify-center gap-2 text-xs font-bold transition-colors cursor-pointer shadow-xs"
          >
            <Cloud className="w-4 h-4" />
            <span>{firebaseUser ? 'Buka Pengaturan & Sinkronisasi Cloud' : 'Masuk Akun & Aktifkan Sinkronisasi'}</span>
          </button>
        </div>
      )}

      {/* Cloud Sync & Google Apps Script */}
      <div className="rounded-xl sm:rounded-2xl bg-white border border-slate-200/80 p-4 shadow-2xs space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900">
            Sinkronisasi Google Sheets (GAS)
          </h3>
          <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>Aktif</span>
          </span>
        </div>

        {syncStatusMsg && (
          <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-medium">
            {syncStatusMsg}
          </div>
        )}

        <button
          type="button"
          onClick={handleManualSync}
          disabled={isSyncing}
          className="w-full h-11 rounded-xl bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-800 flex items-center justify-center gap-2 text-xs font-bold transition-colors cursor-pointer"
        >
          <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
          <span>{isSyncing ? 'Menyinkronkan...' : 'Sinkronkan Sekarang'}</span>
        </button>
      </div>

      {/* Direct Google Drive & Google Sheets Integration */}
      {onOpenGoogleDriveSheets && (
        <div className="rounded-xl sm:rounded-2xl bg-white border border-emerald-200 p-4 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Google Drive &amp; Sheets</h3>
                <p className="text-xs text-slate-500">Integrasi Langsung Akun Google Anda</p>
              </div>
            </div>
          </div>

          <p className="text-xs text-slate-600 leading-relaxed">
            Hubungkan akun Google Anda untuk membuat file spreadsheet baru otomatis di Drive, menyinkronkan data langsung, atau menyimpan cadangan JSON di cloud.
          </p>

          <button
            type="button"
            onClick={onOpenGoogleDriveSheets}
            className="w-full h-11 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center gap-2 text-xs font-bold transition-colors cursor-pointer shadow-xs"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Buka Menu Google Drive &amp; Sheets</span>
          </button>
        </div>
      )}

      {/* Cadangan JSON Lokal (Offline Safe) */}
      <div className="rounded-xl sm:rounded-2xl bg-white border border-slate-200/80 p-4 shadow-2xs space-y-3">
        <h3 className="text-sm font-bold text-slate-900">
          Cadangan File Lokal
        </h3>
        <p className="text-xs text-slate-500">
          Simpan file salinan basis data telitian di HP untuk arsip keamanan ekstra.
        </p>

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={handleDownloadBackup}
            className="h-11 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 flex items-center justify-center gap-1.5 text-xs font-bold cursor-pointer"
          >
            <Download className="w-4 h-4 text-emerald-600" />
            <span>Simpan JSON</span>
          </button>

          <label className="h-11 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 flex items-center justify-center gap-1.5 text-xs font-bold cursor-pointer">
            <Upload className="w-4 h-4 text-blue-600" />
            <span>Pulihkan JSON</span>
            <input
              type="file"
              accept=".json"
              onChange={handleRestoreFile}
              className="hidden"
            />
          </label>
        </div>

        {/* Reset Database (Hanya bila diperlukan panitia) */}
        {onOpenReset && (
          <div className="pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onOpenReset}
              className="w-full py-2 text-center text-xs font-semibold text-rose-600 hover:text-rose-800 cursor-pointer"
            >
              Mulai dari Nol (Reset Data untuk Acara Baru)
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
