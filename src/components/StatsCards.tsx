import React from 'react';
import { Users, Wallet, Clock, FileSpreadsheet, ShieldCheck, ArrowDownToLine, CheckCircle2 } from 'lucide-react';
import { formatRupiah } from '../lib/currency';

interface StatsCardsProps {
  totalData: number;
  totalUang: number;
  lastInputTime: string;
  onExportExcel?: () => void;
  isOnline?: boolean;
}

export const StatsCards: React.FC<StatsCardsProps> = ({
  totalData,
  totalUang,
  lastInputTime,
  onExportExcel,
  isOnline = true,
}) => {
  return (
    <div className="space-y-3 mb-6">
      {/* 3 Main Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4">
        {/* 1. TOTAL DATA */}
        <div className="relative overflow-hidden rounded-2xl bg-white border border-slate-200/90 p-5 shadow-2xs hover:shadow-xs transition-all">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500">
                <Users className="w-4 h-4 text-slate-700" />
                <span>Total Data Tamu</span>
              </div>
              <div className="mt-2 text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight font-mono">
                {totalData}{' '}
                <span className="text-sm font-semibold text-slate-500 font-sans">Orang</span>
              </div>
            </div>
            <div className="w-11 h-11 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-800">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 text-xs text-slate-500 flex items-center justify-between">
            <span>Status Data</span>
            <span className="text-emerald-700 font-bold flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              {totalData === 0 ? 'Mulai dari 0' : 'Tercatat Lengkap'}
            </span>
          </div>
        </div>

        {/* 2. TOTAL UANG (Prominent Formal Card) */}
        <div className="relative overflow-hidden rounded-2xl bg-slate-900 border border-slate-800 p-5 shadow-xs text-white sm:col-span-2 lg:col-span-1">
          <div className="flex items-start justify-between relative z-10">
            <div>
              <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-300">
                <Wallet className="w-4 h-4 text-amber-400" />
                <span>Total Uang Masuk</span>
              </div>
              <div className="mt-2 text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight font-mono">
                {formatRupiah(totalUang)}
              </div>
            </div>
            <div className="w-11 h-11 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-amber-400">
              <Wallet className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-800 text-xs text-slate-300 flex items-center justify-between relative z-10">
            <span>Akumulasi Kas Meja</span>
            <span className="font-bold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded-md border border-emerald-800/60 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Realtime
            </span>
          </div>
        </div>

        {/* 3. INPUT TERAKHIR */}
        <div className="relative overflow-hidden rounded-2xl bg-white border border-slate-200/90 p-5 shadow-2xs hover:shadow-xs transition-all">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500">
                <Clock className="w-4 h-4 text-slate-700" />
                <span>Entri Terakhir</span>
              </div>
              <div className="mt-2 text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight font-mono">
                {lastInputTime || '-'}
              </div>
            </div>
            <div className="w-11 h-11 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-800">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 text-xs text-slate-500 flex items-center justify-between">
            <span>Waktu Entri Terbaru</span>
            <span className="text-slate-700 font-semibold font-mono">WIB</span>
          </div>
        </div>
      </div>

      {/* Realtime Excel & Anti-Loss Protection Strip */}
      <div className="rounded-2xl bg-emerald-50/90 border border-emerald-200 p-3 sm:px-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs shadow-2xs">
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-slate-700">
          <div className="flex items-center gap-1.5 font-bold text-emerald-800">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-600"></span>
            </span>
            <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
            <span>Excel Realtime:</span>
          </div>
          <span className="text-slate-600 font-medium">
            Setiap data otomatis terhubung ke file Excel resmi ({totalData} data tercatat)
          </span>
          <div className="hidden md:flex items-center gap-1 text-slate-600 border-l border-emerald-300 pl-3 font-medium">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
            <span>Proteksi Anti Hilang: Aman jika reload atau offline</span>
          </div>
        </div>

        {onExportExcel && (
          <button
            onClick={onExportExcel}
            className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs transition-all shrink-0 cursor-pointer shadow-2xs"
          >
            <ArrowDownToLine className="w-3.5 h-3.5" />
            <span>Unduh Excel Terkini</span>
          </button>
        )}
      </div>
    </div>
  );
};
