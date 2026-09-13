import React, { useState } from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-2xs animate-fade-in">
      <div className="relative w-full max-w-sm bg-white rounded-2xl border border-slate-200 p-5 shadow-2xl space-y-4">
        <div className="w-11 h-11 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 mx-auto">
          <AlertTriangle className="w-6 h-6" />
        </div>

        <div className="text-center">
          <h3 className="text-base font-bold text-slate-900">
            Hapus Data?
          </h3>
          <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
            Data telitian atas nama <strong className="text-slate-900 font-bold">{record.name}</strong> ({formatRupiah(record.amount)}) akan dihapus.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2 pt-1">
          <button
            type="button"
            disabled={isDeleting}
            onClick={onClose}
            className="w-full h-11 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer disabled:opacity-50"
          >
            Batal
          </button>
          <button
            type="button"
            disabled={isDeleting}
            onClick={handleConfirm}
            className="w-full h-11 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
          >
            {isDeleting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Menghapus...</span>
              </>
            ) : (
              <span>Hapus</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
