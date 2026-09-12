import React, { useRef } from 'react';
import { X, Printer, Heart, CheckCircle2, QrCode, Sparkles } from 'lucide-react';
import { GuestEntry, HajatanEvent } from '../types';
import { formatRupiah, formatDateTime } from '../utils/formatters';

interface ReceiptModalProps {
  entry: GuestEntry | null;
  event: HajatanEvent;
  onClose: () => void;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({ entry, event, onClose }) => {
  const receiptRef = useRef<HTMLDivElement>(null);

  if (!entry) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-stone-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-100 bg-stone-50">
          <div className="flex items-center gap-2 text-xs font-bold text-amber-800 uppercase tracking-wider">
            <Sparkles className="w-4 h-4 text-amber-600" />
            Tanda Terima & Bukti Sumbangan Digital
          </div>
          <button
            onClick={onClose}
            aria-label="Tutup"
            className="p-1.5 rounded-full hover:bg-stone-200 text-stone-500 hover:text-stone-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Printable Card Area */}
        <div className="p-6 overflow-y-auto" ref={receiptRef}>
          <div className="border-2 border-amber-500/30 rounded-2xl p-6 bg-gradient-to-b from-amber-50/40 via-white to-amber-50/20 relative shadow-inner">
            {/* Top Ornamental Badge */}
            <div className="text-center pb-5 border-b border-amber-200/80">
              <div className="inline-block px-3 py-1 rounded-full bg-amber-100 text-amber-900 text-xs font-bold font-mono mb-2">
                {entry.code}
              </div>
              <h3 className="text-xl font-extrabold text-stone-900 font-['Playfair_Display',serif]">
                {event.eventName}
              </h3>
              <p className="text-xs text-stone-600 font-medium mt-1">
                {event.hostName}
              </p>
              <p className="text-[11px] text-stone-400 mt-0.5">
                {event.location} • {event.eventDate}
              </p>
            </div>

            {/* Guest & Amount details */}
            <div className="py-5 space-y-4 text-sm border-b border-amber-200/80">
              <div className="flex justify-between items-start">
                <span className="text-xs text-stone-500 font-medium uppercase tracking-wider">Telah Diterima Dari</span>
                <div className="text-right">
                  <div className="font-bold text-stone-900 text-base">{entry.guestName}</div>
                  {entry.cityOrAddress && (
                    <div className="text-xs text-stone-500">{entry.cityOrAddress}</div>
                  )}
                  <span className="inline-block px-2 py-0.5 mt-1 rounded bg-stone-100 text-[10px] font-semibold text-stone-600">
                    {entry.relationship}
                  </span>
                </div>
              </div>

              <div className="flex justify-between items-center bg-white p-3 rounded-xl border border-stone-200">
                <div>
                  <span className="text-xs text-stone-500 block">Bentuk Sumbangan</span>
                  <span className="text-xs font-bold uppercase text-stone-800">
                    {entry.paymentMethod === 'kado' ? 'Kado / Bingkisan' : `Amplop (${entry.paymentMethod})`}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-xs text-stone-500 block">Jumlah Masuk</span>
                  <span className="text-lg font-extrabold text-amber-700">
                    {entry.amount > 0 ? formatRupiah(entry.amount) : (entry.giftDescription || 'Hadiah')}
                  </span>
                </div>
              </div>

              {entry.paymentMethod === 'kado' && entry.giftDescription && (
                <div className="p-2.5 rounded-lg bg-purple-50 border border-purple-200 text-xs text-purple-900">
                  <strong>Deskripsi Hadiah:</strong> {entry.giftDescription}
                </div>
              )}

              {entry.attendance === 'titip' && (
                <div className="p-2.5 rounded-lg bg-stone-100 text-xs text-stone-700">
                  <span className="font-semibold text-purple-700">Status: Titip Amplop</span>
                  {entry.broughtBy && <span> — Dibawakan oleh: {entry.broughtBy}</span>}
                </div>
              )}

              {/* Greetings */}
              {entry.greetings && (
                <div className="bg-amber-50/70 p-3 rounded-xl border border-amber-200/60 text-xs">
                  <span className="font-bold text-amber-950 block mb-1">Doa Restu & Ucapan:</span>
                  <p className="italic text-stone-700 font-serif text-sm leading-relaxed">
                    &quot;{entry.greetings}&quot;
                  </p>
                </div>
              )}
            </div>

            {/* Footer verification */}
            <div className="pt-4 flex items-center justify-between text-xs text-stone-500">
              <div>
                <div className="flex items-center gap-1 text-emerald-700 font-bold">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Tercatat Resmi di Sistem Kas</span>
                </div>
                <div className="text-[11px] text-stone-400 mt-0.5">
                  Waktu: {formatDateTime(entry.createdAt)}
                </div>
              </div>
              <div className="text-right flex items-center gap-1.5 text-stone-400">
                <QrCode className="w-7 h-7 text-stone-700" />
              </div>
            </div>

            {/* Warm thank you message */}
            <div className="mt-4 pt-3 border-t border-dashed border-stone-200 text-center">
              <p className="text-[11px] text-stone-500 italic flex items-center justify-center gap-1">
                <Heart className="w-3 h-3 text-rose-500 fill-rose-500 inline" />
                Terima kasih yang tulus atas doa restu dan tanda kasih yang diberikan.
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2.5 px-6 py-4 border-t border-stone-100 bg-stone-50">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-stone-700 hover:bg-stone-200 transition-colors"
          >
            Tutup
          </button>
          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold shadow-sm transition-colors"
          >
            <Printer className="w-4 h-4" />
            <span>Cetak / Simpan Slip</span>
          </button>
        </div>
      </div>
    </div>
  );
};
