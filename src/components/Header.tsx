import React, { useState, useEffect } from 'react';
import {
  BookOpen,
  Calendar,
  Clock,
  MapPin,
  ShieldCheck,
  CheckCircle2,
  UserPlus,
  FileSpreadsheet,
  Printer,
  Database,
  Wifi,
  WifiOff,
  Sparkles,
} from 'lucide-react';
import { formatRupiah } from '../lib/currency';

interface HeaderProps {
  onScrollToForm?: () => void;
  onExportExcel?: () => void;
  onPrint?: () => void;
  isOnline?: boolean;
  totalData?: number;
  totalUang?: number;
}

export const Header: React.FC<HeaderProps> = ({
  onScrollToForm,
  onExportExcel,
  onPrint,
  isOnline = true,
  totalData,
  totalUang,
}) => {
  const [currentDateTime, setCurrentDateTime] = useState({
    date: '',
    time: '',
  });

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const dateStr = new Intl.DateTimeFormat('id-ID', {
        timeZone: 'Asia/Jakarta',
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }).format(now);

      const timeStr = new Intl.DateTimeFormat('id-ID', {
        timeZone: 'Asia/Jakarta',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      }).format(now) + ' WIB';

      setCurrentDateTime({ date: dateStr, time: timeStr });
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-white border border-slate-200/90 shadow-xs p-4 sm:p-6 lg:p-8 mb-5 sm:mb-6 transition-all w-full max-w-full">
      {/* Formal decorative top accent gradient */}
      <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-slate-900 via-violet-800 to-indigo-900" />
      
      {/* Faint subtle ambient background highlight */}
      <div className="absolute -top-24 -right-24 w-80 h-80 bg-violet-100/40 rounded-full blur-3xl pointer-events-none" />

      {/* TIER 1: Main Event Identity & Quick Access Actions */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5 sm:gap-6 min-w-0">
        {/* Left Side: Official Identity, Crest, and Titles */}
        <div className="flex items-start gap-3 sm:gap-5 min-w-0">
          {/* Official Registry Emblem */}
          <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-2xl bg-slate-900 text-amber-400 border border-slate-800 flex items-center justify-center shrink-0 shadow-sm">
            <BookOpen className="w-6 h-6 sm:w-8 sm:h-8" />
          </div>

          <div className="space-y-1.5 min-w-0 flex-1">
            {/* Category / Kop Resmi Badges */}
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              <span className="inline-flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-800 text-[10px] sm:text-[11px] font-bold uppercase tracking-wider border border-slate-200">
                <ShieldCheck className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-violet-700" />
                <span>Buku Catatan Telitian</span>
              </span>
              <span className="inline-flex items-center gap-1 px-2 sm:px-2.5 py-0.5 rounded-md bg-violet-50 text-violet-800 text-[10px] sm:text-[11px] font-bold uppercase tracking-wider border border-violet-200">
                <Sparkles className="w-3 h-3 text-violet-600" />
                <span>Walimatul &lsquo;Ursy</span>
              </span>
              <span className="inline-flex items-center gap-1 px-2 sm:px-2.5 py-0.5 rounded-md bg-emerald-50 text-emerald-800 text-[10px] sm:text-[11px] font-semibold border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                <span>Aktif</span>
              </span>
            </div>

            {/* Nama Acara / Shohibul Hajat */}
            <h1 className="text-xl sm:text-3xl lg:text-4xl font-extrabold text-slate-900 tracking-tight font-serif uppercase break-words">
              Gibran Kurniawan
            </h1>

            {/* Deskripsi Formal */}
            <p className="text-xs sm:text-sm text-slate-600 font-normal leading-relaxed max-w-2xl break-words">
              Registrasi Amplop &amp; Uang Masuk Meja Tamu Hajatan &bull; Realtime Sinkronisasi &amp; Arsip Excel
            </p>
          </div>
        </div>

        {/* Right Side: Quick Action Hub (Mudah untuk diakses, responsif mobile) */}
        <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2 sm:gap-3 lg:justify-end shrink-0 w-full sm:w-auto">
          {/* Quick Action: Catat Tamu Baru */}
          {onScrollToForm && (
            <button
              id="btn-header-catat-tamu"
              onClick={onScrollToForm}
              title="Langsung buka formulir pencatatan tamu"
              className="col-span-2 sm:col-span-1 inline-flex items-center justify-center gap-1.5 sm:gap-2 px-3.5 sm:px-4 py-2.5 rounded-xl bg-violet-700 hover:bg-violet-800 active:scale-98 text-white text-xs sm:text-sm font-bold shadow-xs transition-all cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              <span>+ Catat Tamu Baru</span>
            </button>
          )}

          {/* Quick Action: Unduh Excel Realtime */}
          {onExportExcel && (
            <button
              id="btn-header-unduh-excel"
              onClick={onExportExcel}
              title="Unduh seluruh data telitian ke format Excel (.xlsx)"
              className="inline-flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white text-xs sm:text-sm font-bold shadow-xs transition-all cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Unduh Excel</span>
            </button>
          )}

          {/* Quick Action: Cetak Laporan */}
          {onPrint && (
            <button
              id="btn-header-cetak"
              onClick={onPrint}
              title="Cetak dokumen rekapitulasi data telitian"
              className="inline-flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-3.5 py-2.5 rounded-xl bg-white hover:bg-slate-100 active:scale-98 border border-slate-300 text-slate-700 text-xs sm:text-sm font-bold shadow-2xs transition-all cursor-pointer"
            >
              <Printer className="w-4 h-4 text-slate-600" />
              <span>Cetak</span>
            </button>
          )}
        </div>
      </div>

      {/* TIER 2: Full-Width 4-Card Metadata Deck (Tidak Dempet & Memenuhi Header) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mt-6 pt-6 border-t border-slate-200/90">
        {/* Card 1: Tanggal Pelaksanaan */}
        <div className="flex items-center gap-3.5 p-3.5 sm:p-4 rounded-2xl bg-slate-50/90 border border-slate-200/80 transition-all hover:bg-slate-100/70">
          <div className="w-10 h-10 rounded-xl bg-violet-100 text-violet-700 border border-violet-200/50 flex items-center justify-center shrink-0 shadow-2xs">
            <Calendar className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
              Tanggal Acara
            </div>
            <div className="font-bold text-xs sm:text-sm text-slate-800 truncate">
              {currentDateTime.date || 'Memuat tanggal...'}
            </div>
            <div className="text-[10px] text-slate-500 font-medium">Jadwal Meja Hari Ini</div>
          </div>
        </div>

        {/* Card 2: Waktu Realtime Sistem */}
        <div className="flex items-center gap-3.5 p-3.5 sm:p-4 rounded-2xl bg-slate-50/90 border border-slate-200/80 transition-all hover:bg-slate-100/70">
          <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 border border-indigo-200/50 flex items-center justify-center shrink-0 shadow-2xs">
            <Clock className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
              Waktu Realtime (WIB)
            </div>
            <div className="font-bold text-xs sm:text-sm text-slate-900 font-mono flex items-center gap-1.5">
              <span>{currentDateTime.time || '00:00:00 WIB'}</span>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            </div>
            <div className="text-[10px] text-slate-500 font-medium">Sinkronisasi Jakarta</div>
          </div>
        </div>

        {/* Card 3: Posisi Administrasi Meja */}
        <div className="flex items-center gap-3.5 p-3.5 sm:p-4 rounded-2xl bg-slate-50/90 border border-slate-200/80 transition-all hover:bg-slate-100/70">
          <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-700 border border-rose-200/50 flex items-center justify-center shrink-0 shadow-2xs">
            <MapPin className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
              Pos Administrasi
            </div>
            <div className="font-bold text-xs sm:text-sm text-slate-800 truncate">
              Meja Penerimaan Tamu
            </div>
            <div className="text-[10px] text-emerald-700 font-bold flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
              <span>Petugas Terdaftar</span>
            </div>
          </div>
        </div>

        {/* Card 4: Status Database & Cloud Sync */}
        <div className="flex items-center gap-3.5 p-3.5 sm:p-4 rounded-2xl bg-slate-50/90 border border-slate-200/80 transition-all hover:bg-slate-100/70">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 border border-emerald-200/50 flex items-center justify-center shrink-0 shadow-2xs">
            <Database className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
              Sinkronisasi Data
            </div>
            <div className="font-bold text-xs sm:text-sm text-emerald-900 truncate">
              Google Sheets &amp; Cloud
            </div>
            <div className="text-[10px] text-slate-500 font-medium flex items-center gap-1">
              {isOnline ? (
                <>
                  <Wifi className="w-3 h-3 text-emerald-600" />
                  <span className="text-emerald-700 font-semibold">Tersimpan Realtime</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-3 h-3 text-amber-600" />
                  <span className="text-amber-700 font-semibold">Backup Lokal Aman</span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

