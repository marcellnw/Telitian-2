import React, { useState, useRef } from 'react';
import {
  UserPlus,
  Send,
  AlertTriangle,
  Loader2,
  CheckCircle2,
  Baby,
  User,
} from 'lucide-react';
import { TelitianRecord } from '../types/record';
import { formatRupiah, unformatRupiah } from '../lib/currency';
import { getErrorMessage } from '../lib/errorHelper';

export interface SubmitRecordPayload {
  name: string;
  address: string;
  amount: number;
  jenisTelitian?: string;
  kategoriTamu?: string;
  rincianBarang?: string;
  petugas?: string;
  statusValidasi?: string;
}

interface InputFormProps {
  existingRecords: TelitianRecord[];
  onSubmitRecord: (data: SubmitRecordPayload) => Promise<boolean>;
  isOnline?: boolean;
  onSuccessNavigateToData?: () => void;
}

const QUICK_AMOUNTS = [20000, 50000, 100000, 200000, 500000, 1000000];
const KATEGORI_OPTIONS = ['Umum', 'Keluarga', 'Tetangga', 'Teman', 'Kolega'];
const PETUGAS_PRESETS = ['Panitia Meja', 'Operator 1', 'Operator 2'];

export const InputForm: React.FC<InputFormProps> = ({
  existingRecords,
  onSubmitRecord,
  isOnline = true,
  onSuccessNavigateToData,
}) => {
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [jenisTelitian, setJenisTelitian] = useState<'Telitian Dewasa' | 'Telitian Anak'>('Telitian Dewasa');
  const [rawAmount, setRawAmount] = useState('100.000');
  const [amount, setAmount] = useState<number>(100000);
  const [kategoriTamu, setKategoriTamu] = useState('Umum');
  const [rincianBarang, setRincianBarang] = useState('Amplop Uang');
  const [petugas, setPetugas] = useState('Panitia Meja');
  const [statusValidasi, setStatusValidasi] = useState<'Valid' | 'Perlu Dicek'>('Valid');

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  // Anti-Data Ganda Modal State
  const [duplicateWarning, setDuplicateWarning] = useState<{
    show: boolean;
    existingRecord?: TelitianRecord;
  }>({ show: false });

  const nameInputRef = useRef<HTMLInputElement>(null);

  // Handle format nominal rupiah
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
    setSuccessNotice(null);

    try {
      const payload: SubmitRecordPayload = {
        name: name.trim(),
        address: address.trim(),
        amount: Math.max(0, amount),
        jenisTelitian,
        kategoriTamu,
        rincianBarang: rincianBarang.trim() || 'Amplop Uang',
        petugas: petugas.trim() || 'Panitia Meja',
        statusValidasi,
      };

      const success = await onSubmitRecord(payload);

      if (success) {
        setSuccessNotice(`Data ${name.trim()} berhasil disimpan`);
        // Reset form input utama
        setName('');
        setAddress('');
        setAmount(100000);
        setRawAmount('100.000');
        setRincianBarang('Amplop Uang');

        // Kembalikan fokus ke nama untuk entri berikutnya
        setTimeout(() => {
          nameInputRef.current?.focus();
        }, 100);

        // Hapus notice setelah 3 detik
        setTimeout(() => {
          setSuccessNotice(null);
        }, 3500);
      } else {
        setErrorMessage('Gagal menyimpan. Silakan coba kembali.');
      }
    } catch (err) {
      setErrorMessage('Terjadi kesalahan saat menyimpan data.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMessage('Nama tamu wajib diisi.');
      nameInputRef.current?.focus();
      return;
    }

    // Pengecekan Anti-Data Ganda
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

    executeSave();
  };

  return (
    <div id="input-telitian-section" className="space-y-4 max-w-full">
      {/* Header Form */}
      <div className="rounded-xl sm:rounded-2xl bg-white border border-slate-200/80 p-4 shadow-2xs">
        <h2 className="text-base sm:text-lg font-bold text-slate-900 leading-tight">
          Form Tambah Telitian
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Masukkan rincian amplop tamu hajatan Khitanan Gibran.
        </p>
      </div>

      {/* Success Notification Banner */}
      {successNotice && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs sm:text-sm flex items-center gap-2.5 animate-fade-in shadow-2xs">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span className="font-semibold">{successNotice}</span>
        </div>
      )}

      {/* Offline Info Banner */}
      {!isOnline && (
        <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 text-xs flex items-center gap-2.5 shadow-2xs">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
          <span>Mode Offline aktif. Data tetap tersimpan aman di memori HP.</span>
        </div>
      )}

      {/* Error Message */}
      {errorMessage && (
        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs sm:text-sm flex items-center gap-2.5 animate-fade-in">
          <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
          <span>{getErrorMessage(errorMessage)}</span>
        </div>
      )}

      {/* Main Single Column Mobile-First Form */}
      <form onSubmit={handleFormSubmit} className="space-y-3.5 sm:space-y-4">
        <div className="rounded-xl sm:rounded-2xl bg-white border border-slate-200/80 p-4 shadow-2xs space-y-3.5">
          {/* 1. Nama * */}
          <div>
            <label htmlFor="field-nama" className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1.5">
              Nama <span className="text-rose-600">*</span>
            </label>
            <input
              id="field-nama"
              ref={nameInputRef}
              type="text"
              required
              maxLength={100}
              placeholder="Contoh: Budi Santoso"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full h-12 px-4 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 placeholder:text-slate-400 text-base focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#6D4AFF] focus:border-[#6D4AFF] transition-all"
              style={{ fontSize: '16px' }}
            />
          </div>

          {/* 2. Alamat */}
          <div>
            <label htmlFor="field-alamat" className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1.5">
              Alamat <span className="text-slate-400 font-normal text-xs">(Desa / Blok)</span>
            </label>
            <input
              id="field-alamat"
              type="text"
              maxLength={120}
              placeholder="Contoh: Gabuskulon RT 02/01"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full h-12 px-4 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 placeholder:text-slate-400 text-base focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#6D4AFF] focus:border-[#6D4AFF] transition-all"
              style={{ fontSize: '16px' }}
            />
          </div>

          {/* 3. Jenis Telitian * */}
          <div>
            <label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1.5">
              Jenis Telitian <span className="text-rose-600">*</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setJenisTelitian('Telitian Dewasa')}
                className={`h-12 px-3 rounded-xl flex items-center justify-center gap-2 text-sm font-bold border transition-all cursor-pointer ${
                  jenisTelitian === 'Telitian Dewasa'
                    ? 'bg-violet-50 text-[#6D4AFF] border-[#6D4AFF] ring-1 ring-[#6D4AFF]'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <User className="w-4 h-4" />
                <span>Telitian Dewasa</span>
              </button>

              <button
                type="button"
                onClick={() => setJenisTelitian('Telitian Anak')}
                className={`h-12 px-3 rounded-xl flex items-center justify-center gap-2 text-sm font-bold border transition-all cursor-pointer ${
                  jenisTelitian === 'Telitian Anak'
                    ? 'bg-violet-50 text-[#6D4AFF] border-[#6D4AFF] ring-1 ring-[#6D4AFF]'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <Baby className="w-4 h-4" />
                <span>Telitian Anak</span>
              </button>
            </div>
          </div>

          {/* 4. Nominal * */}
          <div>
            <label htmlFor="field-nominal" className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1.5">
              Nominal <span className="text-rose-600">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-500 font-bold text-base">
                Rp
              </div>
              <input
                id="field-nominal"
                type="text"
                inputMode="numeric"
                required
                placeholder="100.000"
                value={rawAmount}
                onChange={handleAmountChange}
                className="w-full h-12 pl-12 pr-4 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 font-mono text-base font-bold focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#6D4AFF] focus:border-[#6D4AFF] transition-all"
                style={{ fontSize: '16px' }}
              />
            </div>

            {/* Quick Amounts Pills */}
            <div className="flex flex-wrap gap-1.5 mt-2">
              {QUICK_AMOUNTS.map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => handleQuickAmount(val)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
                    amount === val
                      ? 'bg-[#6D4AFF] text-white border-[#6D4AFF]'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {val >= 1000000
                    ? `${val / 1000000} Jt`
                    : `${val / 1000} Rb`}
                </button>
              ))}
            </div>
          </div>

          {/* 5. Kategori Tamu */}
          <div>
            <label htmlFor="field-kategori" className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1.5">
              Kategori
            </label>
            <select
              id="field-kategori"
              value={kategoriTamu}
              onChange={(e) => setKategoriTamu(e.target.value)}
              className="w-full h-12 px-4 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 text-base focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#6D4AFF] focus:border-[#6D4AFF] transition-all"
              style={{ fontSize: '16px' }}
            >
              {KATEGORI_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>

          {/* 6. Rincian Barang */}
          <div>
            <label htmlFor="field-rincian" className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1.5">
              Rincian Barang
            </label>
            <input
              id="field-rincian"
              type="text"
              placeholder="Amplop Uang / Kado / Rokok"
              value={rincianBarang}
              onChange={(e) => setRincianBarang(e.target.value)}
              className="w-full h-12 px-4 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 text-base focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#6D4AFF] focus:border-[#6D4AFF] transition-all"
              style={{ fontSize: '16px' }}
            />
          </div>

          {/* 7. Petugas * */}
          <div>
            <label htmlFor="field-petugas" className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1.5">
              Petugas <span className="text-rose-600">*</span>
            </label>
            <div className="flex gap-2">
              <input
                id="field-petugas"
                type="text"
                required
                placeholder="Nama Petugas Meja"
                value={petugas}
                onChange={(e) => setPetugas(e.target.value)}
                className="flex-1 h-12 px-4 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 text-base focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#6D4AFF] focus:border-[#6D4AFF] transition-all"
                style={{ fontSize: '16px' }}
              />
              <select
                aria-label="Preset Petugas"
                onChange={(e) => e.target.value && setPetugas(e.target.value)}
                className="h-12 px-2.5 rounded-xl bg-slate-100 border border-slate-300 text-xs text-slate-700 cursor-pointer"
                defaultValue=""
              >
                <option value="" disabled>Pilih</option>
                {PETUGAS_PRESETS.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
          </div>

          {/* 8. Status */}
          <div>
            <label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1.5">
              Status
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setStatusValidasi('Valid')}
                className={`h-12 px-3 rounded-xl flex items-center justify-center gap-1.5 text-xs sm:text-sm font-bold border transition-all cursor-pointer ${
                  statusValidasi === 'Valid'
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300 ring-1 ring-emerald-300'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span>Valid</span>
              </button>

              <button
                type="button"
                onClick={() => setStatusValidasi('Perlu Dicek')}
                className={`h-12 px-3 rounded-xl flex items-center justify-center gap-1.5 text-xs sm:text-sm font-bold border transition-all cursor-pointer ${
                  statusValidasi === 'Perlu Dicek'
                    ? 'bg-amber-50 text-amber-800 border-amber-300 ring-1 ring-amber-300'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                <span>Perlu Dicek</span>
              </button>
            </div>
          </div>
        </div>

        {/* Tombol Simpan Telitian (Width 100%, Height 50–52 px, Font 16px, font-weight 600, Border-radius 12px) */}
        <div>
          <button
            id="btn-simpan-telitian"
            type="submit"
            disabled={isLoading}
            className="w-full h-13 flex items-center justify-center gap-2 text-white font-semibold text-base rounded-xl shadow-xs transition-all active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
            style={{
              backgroundColor: '#6D4AFF',
              borderRadius: '12px',
              height: '52px',
              fontSize: '16px',
            }}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Menyimpan...</span>
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>Simpan Telitian</span>
              </>
            )}
          </button>
        </div>
      </form>

      {/* Dialog Peringatan Data Ganda */}
      {duplicateWarning.show && duplicateWarning.existingRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-2xs animate-fade-in">
          <div className="relative w-full max-w-sm bg-white rounded-2xl border border-amber-300 p-5 shadow-xl">
            <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center mx-auto mb-3">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <h3 className="text-base font-bold text-center text-slate-900">
              Nama Sudah Pernah Ada
            </h3>
            <p className="text-xs text-slate-600 text-center mt-1.5 leading-relaxed">
              Tamu atas nama <strong className="text-slate-900 font-bold">{duplicateWarning.existingRecord.name}</strong> sudah tercatat sebelumnya ({formatRupiah(duplicateWarning.existingRecord.amount)}).
            </p>

            <p className="text-[11px] text-amber-800 bg-amber-50 p-2.5 rounded-lg border border-amber-200 text-center mt-3 font-medium">
              Apakah ini amplop susulan atau orang yang berbeda dengan nama yang sama?
            </p>

            <div className="grid grid-cols-2 gap-2 mt-4">
              <button
                type="button"
                onClick={() => setDuplicateWarning({ show: false })}
                className="w-full h-11 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Cek Kembali
              </button>
              <button
                type="button"
                onClick={executeSave}
                className="w-full h-11 rounded-xl bg-[#6D4AFF] text-white text-xs font-semibold hover:bg-[#5B39EE] cursor-pointer"
              >
                Tetap Simpan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
