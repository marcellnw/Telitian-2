import React from 'react';
import { Wallet, Banknote, Smartphone, Gift, Users, TrendingUp, Sparkles } from 'lucide-react';
import { KasSummary } from '../types';
import { formatRupiah } from '../utils/formatters';

interface SummaryCardsProps {
  summary: KasSummary;
  hidePrivacy: boolean;
}

export const SummaryCards: React.FC<SummaryCardsProps> = ({ summary, hidePrivacy }) => {
  const percentageTunai = summary.grandTotal > 0 ? Math.round((summary.totalTunai / summary.grandTotal) * 100) : 0;
  const percentageNonTunai = summary.grandTotal > 0 ? Math.round(((summary.totalTransfer + summary.totalQris) / summary.grandTotal) * 100) : 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {/* Grand Total Card - Focal Hero Card */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-600 via-amber-700 to-amber-800 text-white p-5 shadow-lg shadow-amber-900/15 border border-amber-500/30 flex flex-col justify-between">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-1.5 text-amber-200 text-xs font-semibold uppercase tracking-wider">
              <Wallet className="w-3.5 h-3.5" />
              <span>Total Uang Masuk</span>
            </div>
            <h2 className="mt-2 text-2xl sm:text-3xl font-extrabold tracking-tight">
              {formatRupiah(summary.grandTotal, hidePrivacy)}
            </h2>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-500/40 flex items-center justify-center text-amber-100 backdrop-blur-xs">
            <Sparkles className="w-5 h-5" />
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-amber-500/30 flex items-center justify-between text-xs text-amber-100">
          <span>{summary.totalGuests} Donatur / Tamu Terdata</span>
          <span className="font-semibold">{summary.totalHadir} Hadir • {summary.totalTitip} Titip</span>
        </div>
      </div>

      {/* Amplop Tunai */}
      <div className="rounded-2xl bg-white p-5 shadow-sm border border-stone-200/90 flex flex-col justify-between hover:border-emerald-300 transition-colors">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-1.5 text-emerald-700 text-xs font-semibold uppercase tracking-wider">
              <Banknote className="w-3.5 h-3.5" />
              <span>Amplop Uang Tunai</span>
            </div>
            <h3 className="mt-2 text-2xl font-bold text-stone-900">
              {formatRupiah(summary.totalTunai, hidePrivacy)}
            </h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
            <Banknote className="w-5 h-5" />
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-between text-xs text-stone-500">
          <span>Porsi Kas Tunai</span>
          <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
            {percentageTunai}%
          </span>
        </div>
      </div>

      {/* Non-Tunai (Transfer & QRIS) */}
      <div className="rounded-2xl bg-white p-5 shadow-sm border border-stone-200/90 flex flex-col justify-between hover:border-sky-300 transition-colors">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-1.5 text-sky-700 text-xs font-semibold uppercase tracking-wider">
              <Smartphone className="w-3.5 h-3.5" />
              <span>Transfer Bank & QRIS</span>
            </div>
            <h3 className="mt-2 text-2xl font-bold text-stone-900">
              {formatRupiah(summary.totalTransfer + summary.totalQris, hidePrivacy)}
            </h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-sky-50 flex items-center justify-center text-sky-600">
            <Smartphone className="w-5 h-5" />
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-between text-xs text-stone-500">
          <span>
            Trf: {formatRupiah(summary.totalTransfer, hidePrivacy)}
          </span>
          <span className="font-bold text-sky-700 bg-sky-50 px-2 py-0.5 rounded-full">
            {percentageNonTunai}%
          </span>
        </div>
      </div>

      {/* Kado & Rata-rata */}
      <div className="rounded-2xl bg-white p-5 shadow-sm border border-stone-200/90 flex flex-col justify-between hover:border-purple-300 transition-colors">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-1.5 text-purple-700 text-xs font-semibold uppercase tracking-wider">
              <Gift className="w-3.5 h-3.5" />
              <span>Kado Fisik & Rata-rata</span>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-stone-900">
                {summary.totalKadoCount}
              </span>
              <span className="text-xs text-stone-500 font-medium">Bingkisan Kado</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600">
            <Gift className="w-5 h-5" />
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-between text-xs text-stone-500">
          <span className="flex items-center gap-1">
            <TrendingUp className="w-3 h-3 text-stone-400" />
            Rerata Amplop
          </span>
          <span className="font-bold text-stone-700">
            {formatRupiah(summary.averageAmount, hidePrivacy)}
          </span>
        </div>
      </div>
    </div>
  );
};
