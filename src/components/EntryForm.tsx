import React, { useState, useEffect, useRef } from 'react';
import { PlusCircle, Banknote, Smartphone, Gift, CheckCircle2, RotateCcw, Sparkles, Send, Tag, MapPin, UserCheck, MessageSquareQuote } from 'lucide-react';
import { GuestEntry, PaymentMethod, RelationshipCategory, AttendanceType } from '../types';
import { parseRupiahInput, formatRupiah } from '../utils/formatters';

interface EntryFormProps {
  onAddEntry: (entry: Omit<GuestEntry, 'id' | 'code' | 'createdAt'>) => void;
  cashierName?: string;
  editItem?: GuestEntry | null;
  onCancelEdit?: () => void;
  onUpdateEntry?: (entry: GuestEntry) => void;
}

const CATEGORIES: RelationshipCategory[] = [
  'Keluarga',
  'Besan / Kerabat',
  'Sahabat',
  'Rekan Kerja',
  'Tetangga',
  'Tamu VIP',
  'Umum',
];

const QUICK_AMOUNTS = [50000, 100000, 200000, 300000, 500000, 1000000];

const COMMON_GREETINGS = [
  'Sakinah Mawaddah Warahmah',
  'Barakallahu Lakuma',
  'Selamat Berbahagia Selalu',
  'Semoga Berkah & Sukses',
];

export const EntryForm: React.FC<EntryFormProps> = ({
  onAddEntry,
  cashierName,
  editItem,
  onCancelEdit,
  onUpdateEntry,
}) => {
  const [guestName, setGuestName] = useState('');
  const [cityOrAddress, setCityOrAddress] = useState('');
  const [relationship, setRelationship] = useState<RelationshipCategory>('Keluarga');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('tunai');
  const [amount, setAmount] = useState<number>(100000);
  const [rawAmountInput, setRawAmountInput] = useState<string>('100.000');
  const [giftDescription, setGiftDescription] = useState('');
  const [greetings, setGreetings] = useState('');
  const [attendance, setAttendance] = useState<AttendanceType>('hadir');
  const [broughtBy, setBroughtBy] = useState('');
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [lastSavedName, setLastSavedName] = useState('');

  const nameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editItem) {
      setGuestName(editItem.guestName);
      setCityOrAddress(editItem.cityOrAddress || '');
      setRelationship(editItem.relationship);
      setPaymentMethod(editItem.paymentMethod);
      setAmount(editItem.amount);
      setRawAmountInput(editItem.amount > 0 ? editItem.amount.toLocaleString('id-ID') : '0');
      setGiftDescription(editItem.giftDescription || '');
      setGreetings(editItem.greetings || '');
      setAttendance(editItem.attendance);
      setBroughtBy(editItem.broughtBy || '');
      if (nameInputRef.current) {
        nameInputRef.current.focus();
      }
    }
  }, [editItem]);

  const handleAmountInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    const num = parseRupiahInput(val);
    setAmount(num);
    setRawAmountInput(num > 0 ? num.toLocaleString('id-ID') : '');
  };

  const handleSelectQuickAmount = (val: number) => {
    setAmount(val);
    setRawAmountInput(val.toLocaleString('id-ID'));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!guestName.trim()) {
      alert('Mohon isi nama tamu atau donatur terlebih dahulu.');
      nameInputRef.current?.focus();
      return;
    }

    const finalAmount = paymentMethod === 'kado' ? (amount || 0) : amount;

    if (editItem && onUpdateEntry) {
      onUpdateEntry({
        ...editItem,
        guestName: guestName.trim(),
        cityOrAddress: cityOrAddress.trim(),
        relationship,
        paymentMethod,
        amount: finalAmount,
        giftDescription: paymentMethod === 'kado' ? giftDescription.trim() : undefined,
        greetings: greetings.trim() || undefined,
        attendance,
        broughtBy: attendance === 'titip' ? broughtBy.trim() : undefined,
      });
      if (onCancelEdit) onCancelEdit();
    } else {
      onAddEntry({
        guestName: guestName.trim(),
        cityOrAddress: cityOrAddress.trim(),
        relationship,
        paymentMethod,
        amount: finalAmount,
        giftDescription: paymentMethod === 'kado' ? giftDescription.trim() : undefined,
        greetings: greetings.trim() || undefined,
        attendance,
        broughtBy: attendance === 'titip' ? broughtBy.trim() : undefined,
        recordedBy: cashierName || 'Meja Penerima Tamu',
      });

      setLastSavedName(guestName.trim());
      setShowSuccessToast(true);
      setTimeout(() => setShowSuccessToast(false), 3000);

      // Reset form to defaults
      setGuestName('');
      setCityOrAddress('');
      setGiftDescription('');
      setGreetings('');
      setBroughtBy('');
      setAttendance('hadir');
      // Keep previous amount as practical quick default or reset to 100k
      setAmount(100000);
      setRawAmountInput('100.000');
      nameInputRef.current?.focus();
    }
  };

  const handleReset = () => {
    setGuestName('');
    setCityOrAddress('');
    setRelationship('Keluarga');
    setPaymentMethod('tunai');
    setAmount(100000);
    setRawAmountInput('100.000');
    setGiftDescription('');
    setGreetings('');
    setAttendance('hadir');
    setBroughtBy('');
    if (editItem && onCancelEdit) {
      onCancelEdit();
    }
  };

  return (
    <div id="reception-form-container" className="bg-white rounded-3xl p-6 md:p-7 shadow-sm border border-stone-200/90 mb-8 relative">
      {/* Header bar of form */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6 pb-4 border-b border-stone-100">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 text-xs font-semibold mb-1">
            <Sparkles className="w-3 h-3 text-amber-700" />
            Meja Kasir & Buku Tamu
          </div>
          <h2 className="text-xl font-bold text-stone-900 font-['Playfair_Display',serif]">
            {editItem ? 'Ubah Data Catatan Tamu' : 'Pencatatan Uang Masuk Tamu'}
          </h2>
          <p className="text-xs text-stone-500 mt-0.5">
            Input cepat amplop tunai, transfer, QRIS, atau kado dari para undangan & donatur hajatan.
          </p>
        </div>

        {showSuccessToast && (
          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-emerald-100 border border-emerald-300 text-emerald-800 text-xs font-semibold animate-fade-in shadow-xs">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Berhasil mencatat: {lastSavedName}</span>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Row 1: Nama & Alamat */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
          <div className="md:col-span-7">
            <label htmlFor="guest-name" className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1.5">
              Nama Tamu / Pengirim Amplop <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <input
                id="guest-name"
                ref={nameInputRef}
                type="text"
                required
                placeholder="Contoh: Bpk. H. Siswono & Keluarga"
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-stone-300 bg-stone-50/40 text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white text-sm font-medium transition-all"
              />
            </div>
          </div>

          <div className="md:col-span-5">
            <label htmlFor="guest-address" className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1.5">
              Asal / Alamat / Instansi
            </label>
            <div className="relative">
              <input
                id="guest-address"
                type="text"
                placeholder="Contoh: RT 03 / Bandung / Teman Kantor"
                value={cityOrAddress}
                onChange={(e) => setCityOrAddress(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-stone-300 bg-stone-50/40 text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white text-sm transition-all"
              />
              <MapPin className="w-4 h-4 text-stone-400 absolute right-3 top-3 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Row 2: Status Kehadiran & Kategori */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
          <div className="md:col-span-5">
            <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1.5">
              Status Kehadiran
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                id="btn-hadir-langsung"
                onClick={() => setAttendance('hadir')}
                className={`py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 border transition-all ${
                  attendance === 'hadir'
                    ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                    : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
                }`}
              >
                <UserCheck className="w-3.5 h-3.5" />
                <span>Hadir Langsung</span>
              </button>

              <button
                type="button"
                id="btn-titip-amplop"
                onClick={() => setAttendance('titip')}
                className={`py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 border transition-all ${
                  attendance === 'titip'
                    ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                    : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
                }`}
              >
                <Send className="w-3.5 h-3.5" />
                <span>Titip Amplop</span>
              </button>
            </div>

            {attendance === 'titip' && (
              <div className="mt-2 animate-fade-in">
                <input
                  id="brought-by-input"
                  type="text"
                  placeholder="Dibawakan oleh siapa? (misal: Titip via Pak RT)"
                  value={broughtBy}
                  onChange={(e) => setBroughtBy(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg border border-purple-200 bg-purple-50/50 text-xs text-purple-900 placeholder:text-purple-400 focus:outline-none focus:ring-1 focus:ring-purple-400"
                />
              </div>
            )}
          </div>

          <div className="md:col-span-7">
            <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1.5">
              Kategori Hubungan
            </label>
            <div className="flex flex-wrap gap-1.5">
              {CATEGORIES.map((cat) => (
                <button
                  type="button"
                  key={cat}
                  id={`cat-btn-${cat.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
                  onClick={() => setRelationship(cat)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${
                    relationship === cat
                      ? 'bg-stone-900 text-amber-300 border-stone-900 shadow-xs font-semibold'
                      : 'bg-stone-100 text-stone-700 border-stone-200/80 hover:bg-stone-200'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Row 3: Metode Sumbangan / Pembayaran */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1.5">
            Bentuk Sumbangan / Metode Pembayaran
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <button
              type="button"
              id="method-tunai"
              onClick={() => setPaymentMethod('tunai')}
              className={`p-3 rounded-2xl border text-left flex items-center gap-3 transition-all ${
                paymentMethod === 'tunai'
                  ? 'bg-emerald-50 border-emerald-500 text-emerald-950 ring-2 ring-emerald-500/20 shadow-xs'
                  : 'bg-white border-stone-200 hover:bg-stone-50 text-stone-700'
              }`}
            >
              <div className={`p-2 rounded-xl ${paymentMethod === 'tunai' ? 'bg-emerald-600 text-white' : 'bg-emerald-100 text-emerald-700'}`}>
                <Banknote className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold">Tunai / Amplop</div>
                <div className="text-[11px] text-stone-500">Uang fisik meja</div>
              </div>
            </button>

            <button
              type="button"
              id="method-transfer"
              onClick={() => setPaymentMethod('transfer')}
              className={`p-3 rounded-2xl border text-left flex items-center gap-3 transition-all ${
                paymentMethod === 'transfer'
                  ? 'bg-sky-50 border-sky-500 text-sky-950 ring-2 ring-sky-500/20 shadow-xs'
                  : 'bg-white border-stone-200 hover:bg-stone-50 text-stone-700'
              }`}
            >
              <div className={`p-2 rounded-xl ${paymentMethod === 'transfer' ? 'bg-sky-600 text-white' : 'bg-sky-100 text-sky-700'}`}>
                <Smartphone className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold">Transfer Bank</div>
                <div className="text-[11px] text-stone-500">BCA / Mandiri / BRI</div>
              </div>
            </button>

            <button
              type="button"
              id="method-qris"
              onClick={() => setPaymentMethod('qris')}
              className={`p-3 rounded-2xl border text-left flex items-center gap-3 transition-all ${
                paymentMethod === 'qris'
                  ? 'bg-indigo-50 border-indigo-500 text-indigo-950 ring-2 ring-indigo-500/20 shadow-xs'
                  : 'bg-white border-stone-200 hover:bg-stone-50 text-stone-700'
              }`}
            >
              <div className={`p-2 rounded-xl ${paymentMethod === 'qris' ? 'bg-indigo-600 text-white' : 'bg-indigo-100 text-indigo-700'}`}>
                <Smartphone className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold">QRIS / E-Wallet</div>
                <div className="text-[11px] text-stone-500">Scan barcode meja</div>
              </div>
            </button>

            <button
              type="button"
              id="method-kado"
              onClick={() => setPaymentMethod('kado')}
              className={`p-3 rounded-2xl border text-left flex items-center gap-3 transition-all ${
                paymentMethod === 'kado'
                  ? 'bg-purple-50 border-purple-500 text-purple-950 ring-2 ring-purple-500/20 shadow-xs'
                  : 'bg-white border-stone-200 hover:bg-stone-50 text-stone-700'
              }`}
            >
              <div className={`p-2 rounded-xl ${paymentMethod === 'kado' ? 'bg-purple-600 text-white' : 'bg-purple-100 text-purple-700'}`}>
                <Gift className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold">Kado / Barang</div>
                <div className="text-[11px] text-stone-500">Bingkisan fisik</div>
              </div>
            </button>
          </div>
        </div>

        {/* Row 4: Nominal or Kado details */}
        {paymentMethod !== 'kado' ? (
          <div className="bg-amber-50/50 rounded-2xl p-4 border border-amber-200/80">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
              <label htmlFor="nominal-input" className="text-xs font-bold uppercase tracking-wider text-amber-950">
                Nominal Uang Masuk (Rupiah) <span className="text-rose-500">*</span>
              </label>
              <span className="text-xs text-amber-800 font-medium">
                Terbaca: <strong className="font-bold">{formatRupiah(amount)}</strong>
              </span>
            </div>

            <div className="flex items-center gap-3">
              <div className="relative flex-1">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-stone-500 font-bold text-base">
                  Rp
                </div>
                <input
                  id="nominal-input"
                  type="text"
                  value={rawAmountInput}
                  onChange={handleAmountInputChange}
                  placeholder="0"
                  className="w-full pl-11 pr-4 py-3 rounded-xl border border-amber-300 bg-white text-stone-900 font-bold text-lg focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-inner"
                />
              </div>
            </div>

            {/* Quick Chips */}
            <div className="mt-3 flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] font-semibold text-stone-500 mr-1 flex items-center gap-1">
                <Tag className="w-3 h-3" /> Cepat:
              </span>
              {QUICK_AMOUNTS.map((val) => (
                <button
                  type="button"
                  key={val}
                  id={`quick-amt-${val}`}
                  onClick={() => handleSelectQuickAmount(val)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                    amount === val
                      ? 'bg-amber-600 text-white shadow-xs'
                      : 'bg-white text-stone-700 border border-stone-200 hover:bg-amber-100 hover:border-amber-300'
                  }`}
                >
                  {(val / 1000).toLocaleString('id-ID')}rb
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="bg-purple-50/50 rounded-2xl p-4 border border-purple-200/80 space-y-3">
            <div>
              <label htmlFor="kado-desc-input" className="block text-xs font-bold uppercase tracking-wider text-purple-950 mb-1">
                Deskripsi Kado / Barang <span className="text-rose-500">*</span>
              </label>
              <input
                id="kado-desc-input"
                type="text"
                required
                placeholder="Contoh: Set Piring Keramik Dinasty / Logam Mulia 2gr / Bedcover"
                value={giftDescription}
                onChange={(e) => setGiftDescription(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-purple-300 bg-white text-stone-900 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
              />
            </div>
            <div>
              <label htmlFor="kado-est-input" className="block text-xs font-bold uppercase tracking-wider text-purple-950 mb-1">
                Estimasi Nilai Barang (Opsional - Jika ingin dihitung dalam rekap total)
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-stone-500 font-bold text-sm">
                  Rp
                </span>
                <input
                  id="kado-est-input"
                  type="text"
                  value={rawAmountInput}
                  onChange={handleAmountInputChange}
                  placeholder="0 (kosongkan jika tidak dinilai)"
                  className="w-full pl-11 pr-4 py-2 rounded-xl border border-purple-300 bg-white text-stone-900 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
                />
              </div>
            </div>
          </div>
        )}

        {/* Row 5: Ucapan & Doa */}
        <div>
          <label htmlFor="greetings-input" className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1.5 flex items-center justify-between">
            <span>Doa Restu & Ucapan Selamat (Opsional)</span>
            <span className="text-[11px] text-stone-400 font-normal">Tercantum pada tanda terima tamu</span>
          </label>
          <div className="relative">
            <input
              id="greetings-input"
              type="text"
              placeholder="Tuliskan ucapan atau pilih dari pilihan cepat di bawah..."
              value={greetings}
              onChange={(e) => setGreetings(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-stone-300 bg-stone-50/40 text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white text-sm transition-all"
            />
            <MessageSquareQuote className="w-4 h-4 text-stone-400 absolute right-3 top-3 pointer-events-none" />
          </div>

          {/* Quick Greetings */}
          <div className="mt-2 flex flex-wrap gap-1.5">
            {COMMON_GREETINGS.map((greet) => (
              <button
                type="button"
                key={greet}
                id={`greet-btn-${greet.slice(0, 10).toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
                onClick={() => setGreetings(greet)}
                className="px-2.5 py-1 rounded-lg text-[11px] font-medium bg-stone-100 hover:bg-amber-100 text-stone-600 hover:text-amber-900 border border-stone-200 transition-colors"
              >
                + &quot;{greet}&quot;
              </button>
            ))}
          </div>
        </div>

        {/* Submit & Reset Buttons */}
        <div className="pt-3 border-t border-stone-100 flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            id="btn-reset-form"
            onClick={handleReset}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-stone-300 text-stone-600 hover:text-stone-900 hover:bg-stone-100 text-xs font-semibold transition-all"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>{editItem ? 'Batal Edit' : 'Bersihkan Form'}</span>
          </button>

          <button
            type="submit"
            id="btn-submit-entry"
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white font-bold text-sm shadow-md shadow-amber-700/20 hover:shadow-lg transition-all"
          >
            <PlusCircle className="w-4 h-4" />
            <span>{editItem ? 'Simpan Perubahan Data' : 'Simpan Masuk Kas Hajatan'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
