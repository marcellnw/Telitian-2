import React, { useState } from 'react';
import { RotateCcw, AlertTriangle, X, ShieldAlert, Check, Loader2 } from 'lucide-react';
import { getAdminHeaders } from '../lib/adminAuth';
import { getErrorMessage } from '../lib/errorHelper';

interface ResetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmReset?: () => Promise<boolean>;
  onResetSuccess?: () => void;
  currentTotalData?: number;
}

export const ResetModal: React.FC<ResetModalProps> = ({
  isOpen,
  onClose,
  onConfirmReset,
  onResetSuccess,
  currentTotalData = 0,
}) => {
  const [isResetting, setIsResetting] = useState(false);
  const [confirmationWord, setConfirmationWord] = useState('');

  if (!isOpen) return null;

  const handleReset = async () => {
    setIsResetting(true);
    try {
      if (onConfirmReset) {
        const ok = await onConfirmReset();
        if (ok) {
          setConfirmationWord('');
          onClose();
        }
      } else {
        // Direct safe call to /api/records/reset
        const res = await fetch('/api/records/reset', {
          method: 'POST',
          headers: getAdminHeaders(),
          body: JSON.stringify({ reason: 'Mulai dari 0 oleh Admin' }),
        });

        const text = await res.text();
        let data: any = null;
        try {
          data = text ? JSON.parse(text) : null;
        } catch {
          data = null;
        }

        if (res.status === 401 || res.status === 403 || data?.requireLogin) {
          alert('Akses Ditolak: Fitur Reset Data hanya untuk Admin. Silakan login terlebih dahulu dengan password adminhajatan.');
          return;
        }

        if (data && data.success) {
          if (onResetSuccess) onResetSuccess();
          setConfirmationWord('');
          onClose();
        } else {
          alert('Gagal melakukan reset: ' + getErrorMessage(data?.error || text, 'Terjadi kesalahan pada server.'));
        }
      }
    } catch (err: any) {
      alert('Gagal melakukan reset: ' + getErrorMessage(err, 'Koneksi ke server bermasalah.'));
    } finally {
      setIsResetting(false);
    }
  };

  const isConfirmed = currentTotalData === 0 || confirmationWord.trim().toUpperCase() === 'RESET';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-fade-in">
      <div className="w-full max-w-md rounded-3xl bg-white border border-rose-200 p-6 sm:p-7 shadow-2xl relative overflow-hidden">
        {/* Close Button */}
        <button
          onClick={onClose}
          disabled={isResetting}
          className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          aria-label="Tutup"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 shrink-0">
            <RotateCcw className="w-6 h-6 animate-spin-slow" />
          </div>
          <div>
            <h3 className="text-lg font-black uppercase text-slate-900 tracking-wide">
              Mulai dari 0 (Reset)
            </h3>
            <p className="text-xs text-rose-700 font-medium">
              Kosongkan data untuk sesi pencatatan baru
            </p>
          </div>
        </div>

        {/* Notice Info */}
        <div className="space-y-3 mb-5 text-xs text-slate-700 leading-relaxed bg-rose-50/80 border border-rose-200 rounded-2xl p-4">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <p>
              Saat ini terdapat <strong className="text-slate-900 font-bold">{currentTotalData} data</strong> tersimpan.
              Reset akan mengatur ulang counter Total Data menjadi <strong className="text-emerald-700 font-bold">0</strong> dan Total Uang menjadi <strong className="text-emerald-700 font-bold">Rp 0</strong>.
            </p>
          </div>
          <div className="flex items-start gap-2.5 pt-2 border-t border-rose-200 text-slate-600">
            <ShieldAlert className="w-4 h-4 text-violet-600 shrink-0 mt-0.5" />
            <p>
              <strong className="text-slate-900">Proteksi Cadangan:</strong> File salinan arsip data sebelum reset otomatis disimpan di server sebagai pengaman.
            </p>
          </div>
        </div>

        {/* Confirm Word Input if records > 0 */}
        {currentTotalData > 0 && (
          <div className="mb-5">
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Ketik kata <span className="text-rose-600 font-bold">RESET</span> untuk konfirmasi:
            </label>
            <input
              type="text"
              value={confirmationWord}
              onChange={(e) => setConfirmationWord(e.target.value)}
              placeholder="RESET"
              className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 font-mono text-center tracking-widest placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-rose-500"
            />
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isResetting}
            className="px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleReset}
            disabled={!isConfirmed || isResetting}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white transition-all shadow-xs ${
              isConfirmed && !isResetting
                ? 'bg-rose-600 hover:bg-rose-700 cursor-pointer'
                : 'bg-rose-300 text-white cursor-not-allowed'
            }`}
          >
            {isResetting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Mereset Data...</span>
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                <span>Mulai dari 0 Sekarang</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
