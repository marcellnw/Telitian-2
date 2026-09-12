import React from 'react';
import {
  UserPlus,
  TableProperties,
  Database,
  FileSpreadsheet,
  Printer,
  TrendingUp,
  Clock,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Users,
  Wallet,
  Sparkles,
  ExternalLink,
} from 'lucide-react';
import { TelitianRecord } from '../types/record';
import { formatRupiah } from '../lib/currency';
import { Header } from './Header';
import { StatsCards } from './StatsCards';

interface DashboardViewProps {
  records: TelitianRecord[];
  totalData: number;
  totalUang: number;
  lastInputTime: string;
  isOnline: boolean;
  onNavigateTab: (tab: 'dashboard' | 'pendataan' | 'data' | 'backup') => void;
  onExportExcel: () => void;
  onPrint: () => void;
  onEditRecord?: (record: TelitianRecord) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  records,
  totalData,
  totalUang,
  lastInputTime,
  isOnline,
  onNavigateTab,
  onExportExcel,
  onPrint,
  onEditRecord,
}) => {
  // 5 most recent records
  const recentRecords = [...records].slice(-5).reverse();

  // Financial statistics
  const averageAmount = totalData > 0 ? Math.round(totalUang / totalData) : 0;
  const highestAmount = totalData > 0 ? Math.max(...records.map((r) => r.amount || 0)) : 0;

  return (
    <div className="space-y-6 sm:space-y-8 animate-fade-in w-full max-w-full">
      {/* 1. Official Event Banner (Exclusive to Dashboard) */}
      <Header
        onScrollToForm={() => onNavigateTab('pendataan')}
        onExportExcel={onExportExcel}
        onPrint={onPrint}
        isOnline={isOnline}
        totalData={totalData}
        totalUang={totalUang}
      />

      {/* 2. Key Stats Cards */}
      <StatsCards
        totalData={totalData}
        totalUang={totalUang}
        lastInputTime={lastInputTime}
        onExportExcel={onExportExcel}
        isOnline={isOnline}
      />

      {/* 3. Quick Action Navigation Hub */}
      <div>
        <div className="flex items-center justify-between mb-3.5">
          <h2 className="text-sm font-extrabold uppercase tracking-wider text-slate-700 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-violet-700" />
            <span>Pintasan Fungsi Sistem</span>
          </h2>
          <span className="text-[11px] text-slate-500 font-medium">
            Pilih menu kerja untuk memulai
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 sm:gap-4">
          {/* Tile 1: Pendataan */}
          <div
            onClick={() => onNavigateTab('pendataan')}
            className="group rounded-2xl bg-white border border-slate-200/90 p-5 shadow-xs hover:shadow-md hover:border-violet-300 transition-all cursor-pointer flex flex-col justify-between"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="w-11 h-11 rounded-xl bg-violet-50 border border-violet-200 text-violet-700 flex items-center justify-center group-hover:scale-105 group-hover:bg-violet-700 group-hover:text-white transition-all">
                <UserPlus className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-violet-100 text-violet-800 uppercase tracking-wider">
                Meja Tamu
              </span>
            </div>
            <div className="mt-4">
              <h3 className="text-base font-extrabold text-slate-900 group-hover:text-violet-700 transition-colors">
                Menu Pendataan
              </h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Formulir pendaftaran tamu masuk dan pencatatan kas amplop telitian.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-violet-700 group-hover:translate-x-1 transition-transform">
              <span>Buka Formulir Input</span>
              <ArrowRight className="w-4 h-4" />
            </div>
          </div>

          {/* Tile 2: Buku Data */}
          <div
            onClick={() => onNavigateTab('data')}
            className="group rounded-2xl bg-white border border-slate-200/90 p-5 shadow-xs hover:shadow-md hover:border-slate-400 transition-all cursor-pointer flex flex-col justify-between"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="w-11 h-11 rounded-xl bg-slate-100 border border-slate-300 text-slate-800 flex items-center justify-center group-hover:scale-105 group-hover:bg-slate-900 group-hover:text-white transition-all">
                <TableProperties className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 uppercase tracking-wider">
                {totalData} Tamu
              </span>
            </div>
            <div className="mt-4">
              <h3 className="text-base font-extrabold text-slate-900 group-hover:text-slate-800 transition-colors">
                Menu Buku Data
              </h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Tabel rekapitulasi lengkap, pencarian tamu, filter alamat, edit, dan cetak.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-slate-800 group-hover:translate-x-1 transition-transform">
              <span>Buka Buku Tamu</span>
              <ArrowRight className="w-4 h-4" />
            </div>
          </div>

          {/* Tile 3: Backup & Cloud */}
          <div
            onClick={() => onNavigateTab('backup')}
            className="group rounded-2xl bg-white border border-slate-200/90 p-5 shadow-xs hover:shadow-md hover:border-emerald-300 transition-all cursor-pointer flex flex-col justify-between"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="w-11 h-11 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center group-hover:scale-105 group-hover:bg-emerald-600 group-hover:text-white transition-all">
                <Database className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 uppercase tracking-wider">
                Cloud Sync
              </span>
            </div>
            <div className="mt-4">
              <h3 className="text-base font-extrabold text-slate-900 group-hover:text-emerald-700 transition-colors">
                Menu Backup &amp; Excel
              </h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Integrasi Google Sheets realtime, ekspor file Excel, dan cadangan database.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-emerald-700 group-hover:translate-x-1 transition-transform">
              <span>Buka Pengaturan Cloud</span>
              <ArrowRight className="w-4 h-4" />
            </div>
          </div>
        </div>
      </div>

      {/* 4. Activity & Financial Summary Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: 5 Most Recent Entries */}
        <div className="lg:col-span-2 rounded-2xl sm:rounded-3xl bg-white border border-slate-200/90 p-5 sm:p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-violet-50 text-violet-700 border border-violet-200 flex items-center justify-center">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-extrabold uppercase text-slate-900 tracking-tight">
                    Tamu Masuk Terakhir
                  </h3>
                  <p className="text-[11px] text-slate-500 font-medium">
                    5 entri pencatatan meja tamu yang baru saja terekam
                  </p>
                </div>
              </div>

              <button
                onClick={() => onNavigateTab('data')}
                className="inline-flex items-center gap-1 text-xs font-bold text-violet-700 hover:text-violet-900 transition-colors cursor-pointer"
              >
                <span>Lihat Semua ({totalData})</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* List of recent records */}
            {recentRecords.length === 0 ? (
              <div className="py-12 text-center text-slate-500 space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 mx-auto flex items-center justify-center">
                  <Users className="w-6 h-6" />
                </div>
                <p className="text-xs font-medium">
                  Belum ada data tamu yang dicatat. Sistem siap digunakan dari angka nol.
                </p>
                <button
                  onClick={() => onNavigateTab('pendataan')}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-violet-700 hover:bg-violet-800 text-white text-xs font-bold transition-all shadow-xs"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>+ Catat Tamu Pertama Sekarang</span>
                </button>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {recentRecords.map((r, idx) => (
                  <div
                    key={r.id}
                    className="py-3 flex items-center justify-between gap-3 hover:bg-slate-50/80 px-2 rounded-xl transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-7 h-7 rounded-lg bg-slate-100 border border-slate-200 text-slate-700 flex items-center justify-center text-xs font-mono font-bold shrink-0">
                        {r.no || totalData - idx}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                          {r.name}
                        </p>
                        <p className="text-[11px] text-slate-500 truncate">
                          {r.address || '-'} &bull; <span className="font-mono">{r.timeInput}</span>
                        </p>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <p className="text-xs sm:text-sm font-extrabold text-slate-900 font-mono">
                        {formatRupiah(r.amount)}
                      </p>
                      <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                        Amplop Tercatat
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {recentRecords.length > 0 && (
            <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="text-slate-500 font-medium">
                Pencatatan berjalan lancar &amp; otomatis tersimpan.
              </span>
              <button
                onClick={() => onNavigateTab('pendataan')}
                className="font-bold text-violet-700 hover:underline inline-flex items-center gap-1 cursor-pointer"
              >
                <span>+ Catat Tamu Baru</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* Right Col: Financial Overview & System Health */}
        <div className="space-y-4 sm:space-y-6">
          {/* Financial Breakdown Card */}
          <div className="rounded-2xl sm:rounded-3xl bg-white border border-slate-200/90 p-5 sm:p-6 shadow-xs">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 flex items-center gap-1.5 mb-4">
              <TrendingUp className="w-4 h-4 text-slate-700" />
              <span>Analisis Kas Masuk</span>
            </h3>

            <div className="space-y-3.5">
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
                <span className="text-[11px] text-slate-500 font-medium block">
                  Rata-rata Nominal per Tamu:
                </span>
                <span className="text-lg font-black text-slate-900 font-mono mt-0.5 block">
                  {formatRupiah(averageAmount)}
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
                <span className="text-[11px] text-slate-500 font-medium block">
                  Nominal Amplop Tertinggi:
                </span>
                <span className="text-lg font-black text-slate-900 font-mono mt-0.5 block">
                  {formatRupiah(highestAmount)}
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-200/80 flex items-start gap-2.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div className="text-[11px] text-emerald-900 leading-relaxed">
                  <span className="font-bold">Keamanan Data Terjamin:</span> Seluruh data tersimpan secara lokal dan otomatis disinkronkan ke Google Sheets.
                </div>
              </div>
            </div>
          </div>

          {/* Quick Export / Print Tools */}
          <div className="rounded-2xl sm:rounded-3xl bg-slate-900 text-white p-5 sm:p-6 shadow-xs">
            <div className="flex items-center gap-2 mb-2 text-amber-400 text-xs font-bold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Laporan &amp; Ekspor Cepat</span>
            </div>
            <p className="text-xs text-slate-300 mb-4 leading-relaxed">
              Unduh rekapitulasi data hajatan dalam format spreadsheet Excel resmi atau cetak laporan fisik.
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={onExportExcel}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-xs cursor-pointer active:scale-98"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Excel (.xlsx)</span>
              </button>
              <button
                onClick={onPrint}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-all border border-white/20 cursor-pointer active:scale-98"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Cetak Rekap</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
