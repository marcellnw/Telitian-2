import React, { useState, useEffect } from 'react';
import { X, Edit2, Loader2, Save } from 'lucide-react';
import { TelitianRecord } from '../types/record';
import { formatRupiah, parseRupiahInput } from '../lib/currency';

interface EditModalProps {
  record: TelitianRecord | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (id: string, updated: { name: string; address: string; amount: number }) => Promise<boolean>;
}

export const EditModal: React.FC<EditModalProps> = ({
  record,
  isOpen,
  onClose,
  onSave,
}) => {
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [rawAmount, setRawAmount] = useState('');
  const [amount, setAmount] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (record) {
      setName(record.name);
      setAddress(record.address || '');
      setAmount(record.amount);
      setRawAmount(record.amount ? record.amount.toLocaleString('id-ID') : '');
    }
  }, [record]);

  if (!isOpen || !record) return null;

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    const num = parseRupiahInput(val);
    setAmount(num);
    setRawAmount(num > 0 ? num.toLocaleString('id-ID') : '');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSubmitting(true);
    try {
      const success = await onSave(record.id, {
        name: name.trim(),
        address: address.trim(),
        amount: Math.max(0, amount),
      });
      if (success) {
        onClose();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-fade-in">
      <div className="relative w-full max-w-md bg-white rounded-3xl border border-slate-200 p-6 shadow-2xl">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-violet-50 border border-violet-200 flex items-center justify-center text-violet-700">
              <Edit2 className="w-4 h-4" />
            </div>
            <h3 className="text-lg font-black uppercase text-slate-900">
              Edit Data Telitian
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
              Nama Tamu <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              maxLength={100}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 text-sm font-semibold focus:outline-none focus:bg-white focus:ring-2 focus:ring-violet-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
              Alamat <span className="text-slate-400 text-[10px] font-normal">(Boleh kosong)</span>
            </label>
            <input
              type="text"
              maxLength={200}
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 text-sm font-medium focus:outline-none focus:bg-white focus:ring-2 focus:ring-violet-500"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Jumlah Uang <span className="text-rose-500">*</span>
              </label>
              <span className="text-xs font-extrabold text-violet-700">
                {formatRupiah(amount)}
              </span>
            </div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500 font-bold">
                Rp
              </div>
              <input
                type="text"
                required
                value={rawAmount}
                onChange={handleAmountChange}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 text-base font-bold focus:outline-none focus:bg-white focus:ring-2 focus:ring-violet-500"
              />
            </div>
          </div>

          <div className="pt-3 grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={onClose}
              className="w-full py-2.5 rounded-xl border border-slate-200 bg-slate-100 text-slate-700 hover:bg-slate-200 text-xs font-bold transition-all cursor-pointer"
            >
              BATAL
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-black shadow-xs transition-all inline-flex items-center justify-center gap-1.5 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Menyimpan...</span>
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  <span>SIMPAN PERUBAHAN</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
