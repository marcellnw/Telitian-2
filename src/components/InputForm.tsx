import React, { useState, useRef } from 'react';
import {
  UserPlus,
  MapPin,
  Send,
  AlertTriangle,
  Loader2,
  Tag,
  RefreshCw,
} from 'lucide-react';
import { TelitianRecord } from '../types/record';
import { formatRupiah, unformatRupiah } from '../lib/currency';

interface InputFormProps {
  existingRecords: TelitianRecord[];
  onSubmitRecord: (data: { name: string; address: string; amount: number }) => Promise<boolean>;
  isOnline?: boolean;
}

const QUICK_AMOUNTS = [20000, 50000, 100000, 200000, 500000, 1000000];

export const InputForm: React.FC<InputFormProps> = ({
  existingRecords,
  onSubmitRecord,
  isOnline = true,
}) => {
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [rawAmount, setRawAmount] = useState('100.000');
  const [amount, setAmount] = useState<number>(100000);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Anti-Data Ganda Modal State
  const [duplicateWarning, setDuplicateWarning] = useState<{
    show: boolean;
    existingRecord?: TelitianRecord;
  }>({ show: false });

  const nameInputRef = useRef<HTMLInputElement>(null);

  // Format currency on typing
  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const cleanNumber = unformatRupiah(e.target.value);
    setAmount(cleanNumber);
    setRawAmount(cleanNumber ? cleanNumber.toLocaleString('id-ID') : '');
  };

  const handleQuickAmount = (val: number) => {
    setAmount(val);
    setRawAmount(val.toLocaleString('id-ID'));
  };

  const executeSave = async () => {
    setDuplicateWarning({ show: false });
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const success = await onSubmitRecord({
        name: name.trim(),
        address: address.trim(),
        amount: Math.max(0, amount),
      });

      if (success) {
        // Reset form
        setName('');
        setAddress('');
        setAmount(100000);
        setRawAmount('100.000');
        // Return focus to Nama
        setTimeout(() => {
          nameInputRef.current?.focus();
        }, 50);
      } else {
        setErrorMessage('Gagal menyimpan. Periksa koneksi internet dan coba kembali.');
      }
    } catch (err) {
      setErrorMessage('Gagal menyimpan. Periksa koneksi internet dan coba kembali.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert('Nama tamu wajib diisi.');
      nameInputRef.current?.focus();
      return;
    }

    // Check anti-data ganda (duplicate check)
    const normalizedInputName = name.trim().toLowerCase();
    const existing = existingRecords.find(
      (r) => r.name.trim().toLowerCase() === normalizedInputName
    );

    if (existing) {
      setDuplicateWarning({
        show: true,
        existingRecord: existing,
      });
      return;
    }

    // No duplicate found, proceed directly
    executeSave();
  };

  return (
    <div
      id="input-telitian-section"
      className="rounded-2xl sm:rounded-3xl bg-white border border-slate-200/90 p-4 sm:p-7 lg:p-8 mb-5 sm:mb-8 shadow-xs relative w-full max-w-full overflow-hidden"
    >
      {/* Header Form */}
      <div className="flex items-center justify-between gap-3 mb-5 sm:mb-6 pb-4 border-b border-slate-100">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-slate-100 border border-slate-200 text-slate-700 text-[11px] font-bold uppercase tracking-wider mb-1.5">
            <UserPlus className="w-3.5 h-3.5 text-slate-900" />
            <span>Formulir Penerimaan Kas Telitian</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black uppercase text-slate-900 tracking-tight">
            Pencatatan Uang Amplop Tamu
          </h2>
          <p className="text-xs text-slate-500 mt-0.5 font-medium">
            Entri cepat nama tamu, alamat pengirim, dan nominal rupiah. Tekan Simpan Data atau Enter untuk merekam.
          </p>
        </div>
      </div>

      {/* Offline Mode Active Banner */}
      {!isOnline && (
        <div className="mb-5 sm:mb-6 p-4 rounded-2xl bg-amber-50 border border-amber-300 text-amber-900 text-xs sm:text-sm flex items-start gap-3 animate-fade-in shadow-2xs">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-bold text-amber-900">Mode Offline Aktif (Koneksi Terputus)</p>
            <p className="text-amber-800 text-xs">
              Pencatatan tetap berjalan normal. Seluruh data langsung dicadangkan ke memori lokal dan otomatis tersinkronisasi ke server saat online kembali.
            </p>
          </div>
        </div>
      )}

      {/* Error / Retry Banner */}
      {errorMessage && (
        <div className="mb-5 sm:mb-6 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-fade-in">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button
            type="button"
            onClick={executeSave}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-xs transition-all shrink-0 cursor-pointer"
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            <span>COBA LAGI</span>
          </button>
        </div>
      )}

      {/* Main Input Form */}
      <form onSubmit={handleFormSubmit} className="space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
          {/* Field: Nama */}
          <div className="md:col-span-6">
            <label
              htmlFor="field-nama"
              className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5"
            >
              Nama Tamu / Pengirim <span className="text-rose-600">*</span>
            </label>
            <input
              id="field-nama"
              ref={nameInputRef}
              type="text"
              required
              maxLength={100}
              placeholder="Contoh: H. Bambang Sutrisno"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3 rounded-xl sm:rounded-2xl bg-slate-50 border border-slate-300 text-slate-900 placeholder:text-slate-400 text-base font-semibold focus:outline-none focus:bg-white focus:ring-2 focus:ring-slate-900 focus:border-slate-900 transition-all shadow-2xs"
            />
          </div>

          {/* Field: Alamat */}
          <div className="md:col-span-6">
            <label
              htmlFor="field-alamat"
              className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5"
            >
              Alamat / Desa / Blok <span className="text-slate-400 text-[10px] font-normal">(Boleh kosong)</span>
            </label>
            <div className="relative">
              <input
                id="field-alamat"
                type="text"
                maxLength={200}
                placeholder="Contoh: RT 03 RW 02 Karanganyar"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full px-4 py-3 rounded-xl sm:rounded-2xl bg-slate-50 border border-slate-300 text-slate-900 placeholder:text-slate-400 text-base font-medium focus:outline-none focus:bg-white focus:ring-2 focus:ring-slate-900 focus:border-slate-900 transition-all shadow-2xs"
              />
              <MapPin className="w-4 h-4 text-slate-400 absolute right-4 top-3.5 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Field: Jumlah Uang */}
        <div className="bg-slate-50/80 rounded-2xl p-4 sm:p-5 border border-slate-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 mb-2">
            <label
              htmlFor="field-jumlah"
              className="text-xs font-bold uppercase tracking-wider text-slate-700"
            >
              Jumlah Uang (Rupiah) <span className="text-rose-600">*</span>
            </label>
            <span className="text-xs sm:text-sm font-extrabold text-violet-800">
              Terbaca: {formatRupiah(amount)}
            </span>
          </div>

          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-500 font-black text-lg">
              Rp
            </div>
            <input
              id="field-jumlah"
              type="text"
              inputMode="numeric"
              required
              value={rawAmount}
              onChange={handleAmountChange}
              placeholder="0"
              className="w-full pl-12 pr-4 py-3 sm:py-3.5 rounded-xl sm:rounded-2xl bg-white border border-slate-300 text-slate-900 text-xl sm:text-2xl font-black focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-slate-900 shadow-2xs"
            />
          </div>

          {/* Quick Amount Buttons */}
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-semibold text-slate-500 mr-1 flex items-center gap-1">
              <Tag className="w-3 h-3 text-slate-400" /> Pilihan Cepat:
            </span>
            {QUICK_AMOUNTS.map((val) => (
              <button
                type="button"
                key={val}
                id={`btn-quick-amount-${val}`}
                onClick={() => handleQuickAmount(val)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  amount === val
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                {(val / 1000).toLocaleString('id-ID')}rb
              </button>
            ))}
          </div>
        </div>

        {/* Submit Button */}
        <div className="pt-2 flex items-center justify-end">
          <button
            type="submit"
            id="btn-simpan-data"
            disabled={isLoading}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-8 py-3.5 rounded-xl sm:rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm uppercase tracking-wider shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all transform active:scale-98 cursor-pointer"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Menyimpan...</span>
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>SIMPAN DATA TELITIAN</span>
              </>
            )}
          </button>
        </div>
      </form>

      {/* Duplicate Warning Modal (Anti Data Ganda) */}
      {duplicateWarning.show && duplicateWarning.existingRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-fade-in">
          <div className="relative w-full max-w-md bg-white rounded-3xl border border-amber-300 p-6 shadow-2xl">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 mb-4 mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <h3 className="text-lg font-black uppercase text-center text-slate-900">
              Peringatan Nama Serupa
            </h3>
            <p className="text-xs text-amber-800 text-center mt-1">
              Nama ini sebelumnya sudah tercatat di dalam buku telitian.
            </p>

            <div className="mt-4 p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Nama:</span>
                <span className="font-bold text-slate-900">{duplicateWarning.existingRecord.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Alamat:</span>
                <span className="font-medium text-slate-700">
                  {duplicateWarning.existingRecord.address || '-'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Jumlah Sebelumnya:</span>
                <span className="font-extrabold text-slate-900">
                  {formatRupiah(duplicateWarning.existingRecord.amount)}
                </span>
              </div>
            </div>

            <p className="text-[11px] text-slate-500 text-center mt-3 font-medium">
              Apakah tamu ini adalah orang berbeda dengan nama yang sama, atau ingin tetap disimpan?
            </p>

            <div className="mt-6 grid grid-cols-2 gap-3">
              <button
                type="button"
                id="btn-batal-ganda"
                onClick={() => setDuplicateWarning({ show: false })}
                className="w-full py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:text-slate-900 hover:bg-slate-100 text-xs font-bold transition-all cursor-pointer"
              >
                BATAL
              </button>
              <button
                type="button"
                id="btn-tetap-simpan-ganda"
                onClick={executeSave}
                disabled={isLoading}
                className="w-full py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-black shadow-xs transition-all cursor-pointer"
              >
                TETAP SIMPAN
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
