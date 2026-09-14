import React, { useState, useEffect } from 'react';
import { X, Edit2, Loader2, Save, Baby, User } from 'lucide-react';
import { TelitianRecord } from '../types/record';
import { formatRupiah, unformatRupiah } from '../lib/currency';
import { getErrorMessage } from '../lib/errorHelper';

interface EditModalProps {
  record: TelitianRecord | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (
    id: string,
    updated: {
      name: string;
      address: string;
      amount: number;
      jenisTelitian?: string;
      kategoriTamu?: string;
      rincianBarang?: string;
      petugas?: string;
      statusValidasi?: string;
    }
  ) => Promise<boolean>;
}

const KATEGORI_OPTIONS = ['Umum', 'Keluarga', 'Tetangga', 'Teman', 'Kolega'];

export const EditModal: React.FC<EditModalProps> = ({
  record,
  isOpen,
  onClose,
  onSave,
}) => {
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [jenisTelitian, setJenisTelitian] = useState<'Telitian Dewasa' | 'Telitian Anak'>('Telitian Dewasa');
  const [rawAmount, setRawAmount] = useState('');
  const [amount, setAmount] = useState<number>(0);
  const [kategoriTamu, setKategoriTamu] = useState('Umum');
  const [rincianBarang, setRincianBarang] = useState('Amplop Uang');
  const [petugas, setPetugas] = useState('Panitia Meja');
  const [statusValidasi, setStatusValidasi] = useState<'Valid' | 'Perlu Dicek'>('Valid');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (record) {
      setName(record.name);
      setAddress(record.address || '');
      setAmount(record.amount || 0);
      setRawAmount(record.amount ? record.amount.toLocaleString('id-ID') : '0');
      setJenisTelitian((record.jenisTelitian as any) || 'Telitian Dewasa');
      setKategoriTamu(record.kategoriTamu || 'Umum');
      setRincianBarang(record.rincianBarang || 'Amplop Uang');
      setPetugas(record.petugas || 'Panitia Meja');
      setStatusValidasi((record.statusValidasi as any) || 'Valid');
      setError(null);
    }
  }, [record]);

  if (!isOpen || !record) return null;

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const cleanNumber = unformatRupiah(e.target.value);
    setAmount(cleanNumber);
    setRawAmount(cleanNumber ? cleanNumber.toLocaleString('id-ID') : '');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Nama tamu wajib diisi.');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      const success = await onSave(record.id, {
        name: name.trim(),
        address: address.trim(),
        amount: Math.max(0, amount),
        jenisTelitian,
        kategoriTamu,
        rincianBarang: rincianBarang.trim(),
        petugas: petugas.trim(),
        statusValidasi,
      });
      if (success) {
        onClose();
      } else {
        setError('Gagal memperbarui data.');
      }
    } catch (err) {
      setError(getErrorMessage(err, 'Terjadi kesalahan saat menyimpan perubahan.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-2xs animate-fade-in">
      <div className="relative w-full max-w-sm bg-white rounded-2xl border border-slate-200 p-5 shadow-2xl space-y-3.5 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <div>
            <h3 className="text-base font-bold text-slate-900">Edit Data Telitian</h3>
            <span className="text-[11px] font-mono text-slate-400">{record.id}</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="p-2.5 rounded-lg bg-rose-50 text-rose-800 text-xs font-semibold">
            {getErrorMessage(error)}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          {/* Nama */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Nama Tamu *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full h-11 px-3.5 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 text-base focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#6D4AFF]"
              style={{ fontSize: '16px' }}
            />
          </div>

          {/* Alamat */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Alamat
            </label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full h-11 px-3.5 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 text-base focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#6D4AFF]"
              style={{ fontSize: '16px' }}
            />
          </div>

          {/* Jenis Telitian */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Jenis Telitian
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setJenisTelitian('Telitian Dewasa')}
                className={`h-11 px-2.5 rounded-xl flex items-center justify-center gap-1.5 text-xs font-bold border transition-colors cursor-pointer ${
                  jenisTelitian === 'Telitian Dewasa'
                    ? 'bg-violet-50 text-[#6D4AFF] border-[#6D4AFF]'
                    : 'bg-slate-50 text-slate-700 border-slate-200'
                }`}
              >
                <User className="w-3.5 h-3.5" />
                <span>Telitian Dewasa</span>
              </button>
              <button
                type="button"
                onClick={() => setJenisTelitian('Telitian Anak')}
                className={`h-11 px-2.5 rounded-xl flex items-center justify-center gap-1.5 text-xs font-bold border transition-colors cursor-pointer ${
                  jenisTelitian === 'Telitian Anak'
                    ? 'bg-violet-50 text-[#6D4AFF] border-[#6D4AFF]'
                    : 'bg-slate-50 text-slate-700 border-slate-200'
                }`}
              >
                <Baby className="w-3.5 h-3.5" />
                <span>Telitian Anak</span>
              </button>
            </div>
          </div>

          {/* Nominal */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Nominal (Rp) *
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 font-bold text-sm">
                Rp
              </div>
              <input
                type="text"
                inputMode="numeric"
                required
                value={rawAmount}
                onChange={handleAmountChange}
                className="w-full h-11 pl-10 pr-3.5 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 font-mono text-base font-bold focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#6D4AFF]"
                style={{ fontSize: '16px' }}
              />
            </div>
          </div>

          {/* Kategori */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Kategori
            </label>
            <select
              value={kategoriTamu}
              onChange={(e) => setKategoriTamu(e.target.value)}
              className="w-full h-11 px-3 rounded-xl bg-slate-50 border border-slate-300 text-sm text-slate-900"
            >
              {KATEGORI_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </div>

          {/* Status Validasi */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Status Validasi
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setStatusValidasi('Valid')}
                className={`h-11 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                  statusValidasi === 'Valid'
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                    : 'bg-slate-50 text-slate-600 border-slate-200'
                }`}
              >
                Valid
              </button>
              <button
                type="button"
                onClick={() => setStatusValidasi('Perlu Dicek')}
                className={`h-11 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                  statusValidasi === 'Perlu Dicek'
                    ? 'bg-amber-50 text-amber-800 border-amber-300'
                    : 'bg-slate-50 text-slate-600 border-slate-200'
                }`}
              >
                Perlu Dicek
              </button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="w-full h-11 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-11 rounded-xl bg-[#6D4AFF] text-white text-xs font-semibold hover:bg-[#5B39EE] flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Menyimpan...</span>
                </>
              ) : (
                <span>Simpan Perubahan</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
