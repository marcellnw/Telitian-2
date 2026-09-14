import React, { useState, useEffect } from 'react';
import { X, Save, AlertCircle } from 'lucide-react';
import type { LocalRecord } from '../db/database.ts';
import { getErrorMessage } from '../lib/errorHelper';

interface EditRecordModalProps {
  record: LocalRecord | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (id: string, nama: string, alamat: string, jumlah: number) => Promise<void>;
}

export const EditRecordModal: React.FC<EditRecordModalProps> = ({
  record,
  isOpen,
  onClose,
  onSave,
}) => {
  const [nama, setNama] = useState('');
  const [alamat, setAlamat] = useState('');
  const [jumlah, setJumlah] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (record) {
      setNama(record.nama || '');
      setAlamat(record.alamat || '');
      setJumlah(record.jumlah ? String(record.jumlah) : '');
      setError('');
    }
  }, [record]);

  if (!isOpen || !record) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nama.trim()) {
      setError('Nama wajib diisi');
      return;
    }
    const num = parseInt(jumlah.replace(/[^0-9]/g, ''), 10);
    if (isNaN(num) || num <= 0) {
      setError('Jumlah uang harus valid (lebih dari 0)');
      return;
    }

    setLoading(true);
    setError('');
    try {
      await onSave(record.id, nama.trim(), alamat.trim(), num);
      onClose();
    } catch (err: any) {
      setError(getErrorMessage(err, 'Gagal menyimpan perubahan'));
    } finally {
      setLoading(false);
    }
  };

  const formatRupiah = (val: string) => {
    const clean = val.replace(/[^0-9]/g, '');
    if (!clean) return '';
    return new Intl.NumberFormat('id-ID').format(parseInt(clean, 10));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs">
      <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl p-6 text-slate-100">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div>
            <h3 className="text-base font-bold text-white">Edit Data Telitian</h3>
            <p className="text-xs text-slate-400">
              No #{record.sequence} • Versi {record.version}
            </p>
          </div>
          <button
            id="btn-close-edit-modal"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mt-4 flex items-center gap-2 p-3 rounded-lg bg-red-950/50 border border-red-800 text-xs text-red-300">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
            <span>{getErrorMessage(error)}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-300 mb-1">Nama Tamu / Penyumbang</label>
            <input
              id="edit-input-nama"
              type="text"
              value={nama}
              onChange={(e) => setNama(e.target.value)}
              className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
              required
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-300 mb-1">Alamat / Asal Dusun</label>
            <input
              id="edit-input-alamat"
              type="text"
              value={alamat}
              onChange={(e) => setAlamat(e.target.value)}
              className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-300 mb-1">Jumlah Uang (Rp)</label>
            <div className="relative">
              <span className="absolute left-3.5 top-2.5 text-slate-400 font-medium text-sm">Rp</span>
              <input
                id="edit-input-jumlah"
                type="text"
                value={formatRupiah(jumlah)}
                onChange={(e) => setJumlah(e.target.value)}
                className="w-full rounded-xl bg-slate-950 border border-slate-700 pl-11 pr-3.5 py-2.5 text-sm font-semibold text-amber-400 placeholder-slate-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                required
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl bg-slate-800 hover:bg-slate-700 px-4 py-2.5 text-xs font-semibold text-slate-300 transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button
              id="btn-save-edit-record"
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 rounded-xl bg-amber-600 hover:bg-amber-700 px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition-colors cursor-pointer disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{loading ? 'Menyimpan...' : 'Simpan Perubahan'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
