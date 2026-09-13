import React, { useMemo } from 'react';
import {
  Calendar,
  Plus,
  ArrowRight,
  UserCheck,
  AlertCircle,
  Clock,
  Coins,
  Baby,
  User,
} from 'lucide-react';
import { TelitianRecord } from '../types/record';
import { formatRupiah } from '../lib/currency';

interface DashboardViewProps {
  records: TelitianRecord[];
  totalData: number;
  totalUang: number;
  onGoToInput: () => void;
  onGoToData: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  records,
  totalData,
  totalUang,
  onGoToInput,
  onGoToData,
}) => {
  // 5 Data Terbaru
  const latestFiveRecords = useMemo(() => {
    return [...records].slice(-5).reverse();
  }, [records]);

  // Perhitungan Statistik Telitian Anak & Dewasa serta Status Validasi
  const { anakCount, anakTotal, dewasaCount, dewasaTotal, validCount, checkCount } = useMemo(() => {
    let aCount = 0;
    let aTotal = 0;
    let dCount = 0;
    let dTotal = 0;
    let vCount = 0;
    let cCount = 0;

    for (const r of records) {
      const isAnak =
        r.jenisTelitian === 'Telitian Anak' ||
        (r.kategoriTamu && r.kategoriTamu.toLowerCase().includes('anak'));

      if (isAnak) {
        aCount++;
        aTotal += r.amount || 0;
      } else {
        dCount++;
        dTotal += r.amount || 0;
      }

      if (r.statusValidasi === 'Perlu Dicek' || r.statusValidasi === 'Belum Valid') {
        cCount++;
      } else {
        vCount++;
      }
    }

    return {
      anakCount: aCount,
      anakTotal: aTotal,
      dewasaCount: dCount,
      dewasaTotal: dTotal,
      validCount: vCount,
      checkCount: cCount,
    };
  }, [records]);

  return (
    <div className="space-y-3.5 sm:space-y-4 max-w-full">
      {/* 1. Sapaan / Informasi Ringkas (Card Kecil) */}
      <div className="rounded-xl sm:rounded-2xl bg-white border border-slate-200/80 px-4 py-3 shadow-2xs">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h2 className="text-sm sm:text-base font-bold text-slate-900 leading-tight">
              Pendataan Telitian
            </h2>
            <p className="text-xs text-slate-500 font-medium">
              Khitanan Gibran Kurniawan
            </p>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-violet-700 font-semibold bg-violet-50 px-2.5 py-1 rounded-lg border border-violet-100 shrink-0">
            <Calendar className="w-3.5 h-3.5 text-violet-600" />
            <span>19 September 2026</span>
          </div>
        </div>
      </div>

      {/* 2. Card Utama: Total Uang Terkumpul (Paling Menonjol, Warna Ungu Lembut) */}
      <div
        className="rounded-2xl p-5 text-white shadow-xs relative overflow-hidden"
        style={{
          backgroundColor: '#6D4AFF',
          borderRadius: '16px',
          padding: '20px',
        }}
      >
        <div className="relative z-10 flex flex-col justify-between min-h-[90px]">
          <div className="flex items-center justify-between text-violet-100 text-xs font-semibold tracking-wide uppercase">
            <span>Total Uang Terkumpul</span>
            <span className="flex items-center gap-1 bg-white/20 px-2 py-0.5 rounded-full text-[11px] font-bold text-white backdrop-blur-xs">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Realtime
            </span>
          </div>

          <div className="mt-2 text-2xl sm:text-3xl font-extrabold tracking-tight text-white font-mono">
            {formatRupiah(totalUang)}
          </div>

          <div className="mt-2 text-xs text-violet-100 flex items-center justify-between border-t border-white/15 pt-2">
            <span>Akumulasi Amplop Masuk</span>
            <span className="font-semibold">{totalData} Tamu Tercatat</span>
          </div>
        </div>
      </div>

      {/* 3. Statistik Telitian: Telitian Anak & Telitian Dewasa (Grid 2 Kolom) */}
      <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
        {/* Card 1: Telitian Anak */}
        <div className="rounded-xl sm:rounded-2xl bg-white border border-slate-200/80 p-3.5 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-1 text-slate-500 text-xs font-bold uppercase tracking-wider">
              <Baby className="w-3.5 h-3.5 text-pink-500" />
              <span className="truncate">Telitian Anak</span>
            </div>
            <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded-md">
              {anakCount} Entri
            </span>
          </div>
          <div className="text-sm sm:text-base font-extrabold text-slate-900 font-mono tracking-tight">
            {formatRupiah(anakTotal)}
          </div>
        </div>

        {/* Card 2: Telitian Dewasa */}
        <div className="rounded-xl sm:rounded-2xl bg-white border border-slate-200/80 p-3.5 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-1 text-slate-500 text-xs font-bold uppercase tracking-wider">
              <User className="w-3.5 h-3.5 text-blue-500" />
              <span className="truncate">Telitian Dewasa</span>
            </div>
            <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded-md">
              {dewasaCount} Entri
            </span>
          </div>
          <div className="text-sm sm:text-base font-extrabold text-slate-900 font-mono tracking-tight">
            {formatRupiah(dewasaTotal)}
          </div>
        </div>
      </div>

      {/* 4. Statistik Tambahan: Compact Statistics (Satu Card dengan Beberapa Baris) */}
      <div className="rounded-xl sm:rounded-2xl bg-white border border-slate-200/80 p-3.5 shadow-2xs">
        <div className="divide-y divide-slate-100 text-xs">
          <div className="flex items-center justify-between py-1.5">
            <span className="text-slate-600 font-medium">Total Entri</span>
            <span className="font-bold text-slate-900 font-mono text-sm">{totalData}</span>
          </div>
          <div className="flex items-center justify-between py-1.5">
            <span className="text-slate-600 font-medium flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              Data Valid
            </span>
            <span className="font-bold text-emerald-700 font-mono text-sm">{validCount}</span>
          </div>
          <div className="flex items-center justify-between py-1.5">
            <span className="text-slate-600 font-medium flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              Perlu Dicek
            </span>
            <span className="font-bold text-amber-700 font-mono text-sm">{checkCount}</span>
          </div>
        </div>
      </div>

      {/* 5. Tombol Cepat: + Tambah Telitian (Lebar 100%, Tinggi 48–52 px, Border Radius 12px) */}
      <div>
        <button
          id="btn-quick-add-telitian"
          type="button"
          onClick={onGoToInput}
          className="w-full flex items-center justify-center gap-2 h-12 text-white font-semibold text-base rounded-xl shadow-xs hover:brightness-105 active:scale-[0.99] transition-all cursor-pointer"
          style={{
            backgroundColor: '#6D4AFF',
            borderRadius: '12px',
          }}
        >
          <Plus className="w-5 h-5 stroke-[2.5]" />
          <span>+ Tambah Telitian</span>
        </button>
      </div>

      {/* 6. Data Terbaru (Maksimal 5 data terbaru di Dashboard) */}
      <div className="rounded-xl sm:rounded-2xl bg-white border border-slate-200/80 p-4 shadow-2xs">
        <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100">
          <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-800">
            <Clock className="w-3.5 h-3.5 text-violet-600" />
            <span>5 Data Terbaru</span>
          </div>
          {records.length > 5 && (
            <button
              type="button"
              onClick={onGoToData}
              className="text-xs font-semibold text-violet-700 hover:text-violet-900 cursor-pointer flex items-center gap-0.5"
            >
              <span>Lihat Semua</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {latestFiveRecords.length === 0 ? (
          <div className="py-6 text-center text-slate-400 text-xs">
            Belum ada catatan telitian. Tekan tombol di atas untuk mulai mencatat.
          </div>
        ) : (
          <div className="space-y-2.5">
            {latestFiveRecords.map((item) => {
              const jenis = item.jenisTelitian || 'Telitian Dewasa';
              return (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-100 text-xs"
                >
                  <div className="min-w-0 pr-2">
                    <p className="font-bold text-slate-900 text-sm truncate">
                      {item.name}
                    </p>
                    <div className="flex items-center gap-2 text-slate-500 text-[11px] mt-0.5">
                      <span className="text-violet-700 font-medium">{jenis}</span>
                      <span>•</span>
                      <span>{item.timeInput || '-'}</span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-bold text-slate-900 text-sm font-mono">
                      {formatRupiah(item.amount)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {records.length > 0 && (
          <div className="mt-3.5 pt-2 text-center">
            <button
              type="button"
              onClick={onGoToData}
              className="w-full py-2.5 px-3 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 active:bg-slate-100 transition-colors cursor-pointer"
            >
              Lihat Semua Data ({records.length})
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
