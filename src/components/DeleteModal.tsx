import React, { useState } from 'react';
import { AlertTriangle, Trash2, Loader2 } from 'lucide-react';
import { TelitianRecord } from '../types/record';
import { formatRupiah } from '../lib/currency';

interface DeleteModalProps {
  record: TelitianRecord | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirmDelete: (id: string) => Promise<boolean>;
}

export const DeleteModal: React.FC<DeleteModalProps> = ({
  record,
  isOpen,
  onClose,
  onConfirmDelete,
}) => {
  const [isDeleting, setIsDeleting] = useState(false);

  if (!isOpen || !record) return null;

  const handleConfirm = async () => {
    setIsDeleting(true);
    try {
      const success = await onConfirmDelete(record.id);
      if (success) {
        onClose();
      }
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-fade-in">
      <div className="relative w-full max-w-md bg-white rounded-3xl border border-rose-200 p-6 shadow-2xl">
        <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 mb-4 mx-auto">
          <AlertTriangle className="w-6 h-6" />
        </div>

        <h3 className="text-lg font-black uppercase text-center text-slate-900">
          Konfirmasi Hapus Data
        </h3>
        <p className="text-sm text-slate-600 text-center mt-2">
          Hapus data atas nama <strong className="text-rose-600 font-bold">{record.name}</strong>?
        </p>

        <div className="mt-4 p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-1.5">
          <div className="flex justify-between text-slate-600">
            <span>Alamat:</span>
            <span className="font-semibold text-slate-900">{record.address || '-'}</span>
          </div>
          <div className="flex justify-between text-slate-600">
            <span>Jumlah:</span>
            <span className="font-black text-violet-700">{formatRupiah(record.amount)}</span>
          </div>
        </div>

        <p className="text-[11px] text-slate-500 text-center mt-3">
          *Data akan dipindahkan ke arsip <code>DATA_TERHAPUS</code> (Soft Delete) dan total uang akan otomatis diperbarui.
        </p>

        <div className="mt-6 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="w-full py-2.5 rounded-xl border border-slate-200 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all cursor-pointer"
          >
            BATAL
          </button>
          <button
            type="button"
            id="btn-confirm-delete"
            onClick={handleConfirm}
            disabled={isDeleting}
            className="w-full py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-black shadow-xs transition-all inline-flex items-center justify-center gap-1.5 cursor-pointer"
          >
            {isDeleting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Menghapus...</span>
              </>
            ) : (
              <>
                <Trash2 className="w-3.5 h-3.5" />
                <span>HAPUS DATA</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
