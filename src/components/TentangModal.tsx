import React from 'react';
import { X, Heart, CheckCircle2, ShieldCheck, Smartphone, WifiOff, FileSpreadsheet } from 'lucide-react';

interface TentangModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TentangModal: React.FC<TentangModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-2xs animate-fade-in">
      <div className="relative w-full max-w-md bg-white rounded-2xl border border-slate-200 p-5 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-base font-bold text-slate-900">Tentang Aplikasi</h3>
            <p className="text-xs text-slate-500">Telitian Gibran Mobile Admin</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Info Hajatan */}
        <div className="p-4 rounded-xl bg-violet-50 border border-violet-100 text-center space-y-1">
          <span className="text-[11px] font-bold text-violet-700 tracking-wider uppercase">
            Hajatan Khitanan
          </span>
          <h4 className="text-lg font-extrabold text-slate-900">
            Gibran Kurniawan
          </h4>
          <p className="text-xs text-slate-600 font-medium">
            Tanggal 19 September 2026 • Gabuskulon
          </p>
        </div>

        {/* Fitur Utama */}
        <div className="space-y-2.5 text-xs text-slate-700">
          <p className="font-bold text-slate-800 text-xs uppercase tracking-wider">
            Fitur Utama Aplikasi
          </p>

          <div className="space-y-2">
            <div className="flex items-start gap-2.5 p-2.5 rounded-lg bg-slate-50 border border-slate-100">
              <Smartphone className="w-4 h-4 text-[#6D4AFF] shrink-0 mt-0.5" />
              <div>
                <strong className="block text-slate-900">Desain Mobile Admin</strong>
                <span className="text-slate-500 text-[11px]">
                  Dioptimalkan untuk pengoperasian cepat dengan satu tangan oleh panitia hajatan di HP.
                </span>
              </div>
            </div>

            <div className="flex items-start gap-2.5 p-2.5 rounded-lg bg-slate-50 border border-slate-100">
              <WifiOff className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <strong className="block text-slate-900">100% Aman Offline</strong>
                <span className="text-slate-500 text-[11px]">
                  Data disimpan seketika di IndexedDB HP. Tidak akan hilang jika sinyal padam dan otomatis disinkronkan.
                </span>
              </div>
            </div>

            <div className="flex items-start gap-2.5 p-2.5 rounded-lg bg-slate-50 border border-slate-100">
              <FileSpreadsheet className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <div>
                <strong className="block text-slate-900">Google Sheets &amp; Ekspor Excel</strong>
                <span className="text-slate-500 text-[11px]">
                  Terhubung ke spreadsheet online serta dapat mengunduh berkas .xlsx dan Word .docx kapan saja.
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
          <span>Versi 2.5 (Mobile First)</span>
          <span className="font-semibold text-slate-600">Gabuskulon 2026</span>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="w-full h-11 rounded-xl bg-[#6D4AFF] text-white text-xs font-semibold hover:bg-[#5B39EE] cursor-pointer"
        >
          Tutup
        </button>
      </div>
    </div>
  );
};
