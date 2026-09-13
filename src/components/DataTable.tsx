import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Search,
  SlidersHorizontal,
  MoreVertical,
  Eye,
  Edit2,
  Trash2,
  X,
  FileSpreadsheet,
  Printer,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Clock,
  User,
  Plus,
} from 'lucide-react';
import { TelitianRecord } from '../types/record';
import { formatRupiah } from '../lib/currency';

interface DataTableProps {
  records: TelitianRecord[];
  allRecordsCount: number;
  allRecordsTotalUang: number;
  isAdmin?: boolean;
  onOpenLogin?: () => void;
  onEdit: (record: TelitianRecord) => void;
  onDelete: (record: TelitianRecord) => void;
  onScrollToForm: () => void;
  onExportExcel: () => void;
  onExportWord?: () => void;
  onPrint?: () => void;
  onGoToBackup?: () => void;
  onOpenReset?: () => void;
}

export const DataTable: React.FC<DataTableProps> = ({
  records,
  onEdit,
  onDelete,
  onScrollToForm,
  onExportExcel,
  onPrint,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // Filter state
  const [filterJenis, setFilterJenis] = useState<string>('Semua');
  const [filterKategori, setFilterKategori] = useState<string>('Semua');
  const [filterStatus, setFilterStatus] = useState<string>('Semua');
  const [filterSort, setFilterSort] = useState<'terbaru' | 'terlama' | 'terbesar' | 'terkecil'>('terbaru');

  // Detail Modal state
  const [selectedRecordForDetail, setSelectedRecordForDetail] = useState<TelitianRecord | null>(null);

  // Card 3-dot dropdown active ID
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  // Close card menu on outside click
  useEffect(() => {
    const handleDocumentClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.card-action-menu-container')) {
        setActiveMenuId(null);
      }
    };
    document.addEventListener('mousedown', handleDocumentClick);
    return () => document.removeEventListener('mousedown', handleDocumentClick);
  }, []);

  // Filter & Sort Logic
  const filteredRecords = useMemo(() => {
    let list = [...records];

    // Search query
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase().trim();
      list = list.filter(
        (r) =>
          r.name.toLowerCase().includes(q) ||
          (r.address && r.address.toLowerCase().includes(q)) ||
          r.id.toLowerCase().includes(q)
      );
    }

    // Filter Jenis Telitian
    if (filterJenis !== 'Semua') {
      list = list.filter((r) => {
        const jenis = r.jenisTelitian || 'Telitian Dewasa';
        return jenis === filterJenis;
      });
    }

    // Filter Kategori
    if (filterKategori !== 'Semua') {
      list = list.filter((r) => (r.kategoriTamu || 'Umum') === filterKategori);
    }

    // Filter Status
    if (filterStatus !== 'Semua') {
      list = list.filter((r) => (r.statusValidasi || 'Valid') === filterStatus);
    }

    // Sorting
    switch (filterSort) {
      case 'terlama':
        list.sort((a, b) => a.no - b.no);
        break;
      case 'terbesar':
        list.sort((a, b) => (b.amount || 0) - (a.amount || 0));
        break;
      case 'terkecil':
        list.sort((a, b) => (a.amount || 0) - (b.amount || 0));
        break;
      case 'terbaru':
      default:
        list.sort((a, b) => b.no - a.no);
        break;
    }

    return list;
  }, [records, searchTerm, filterJenis, filterKategori, filterStatus, filterSort]);

  const activeFilterCount =
    (filterJenis !== 'Semua' ? 1 : 0) +
    (filterKategori !== 'Semua' ? 1 : 0) +
    (filterStatus !== 'Semua' ? 1 : 0) +
    (filterSort !== 'terbaru' ? 1 : 0);

  const resetFilters = () => {
    setFilterJenis('Semua');
    setFilterKategori('Semua');
    setFilterStatus('Semua');
    setFilterSort('terbaru');
    setIsFilterOpen(false);
  };

  return (
    <div id="data-telitian-section" className="space-y-3.5 max-w-full">
      {/* Header Halaman Data */}
      <div className="rounded-xl sm:rounded-2xl bg-white border border-slate-200/80 p-4 shadow-2xs flex items-center justify-between">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-slate-900 leading-tight">
            Data Telitian
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {records.length} data tercatat • Khitanan Gibran
          </p>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={onExportExcel}
            className="flex items-center gap-1 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-2xs active:scale-95 transition-all cursor-pointer"
            title="Unduh Excel Realtime"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span className="hidden sm:inline">Excel</span>
          </button>

          <button
            type="button"
            onClick={onScrollToForm}
            className="flex items-center gap-1 px-3 py-2 rounded-xl bg-[#6D4AFF] hover:bg-[#5B39EE] text-white text-xs font-semibold shadow-2xs active:scale-95 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah</span>
          </button>
        </div>
      </div>

      {/* SEARCH BAR & FILTER BUTTON (Tinggi 46–48 px, Search icon di kiri, Filter di kanan) */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <Search className="w-4 h-4" />
          </div>
          <input
            id="search-input-telitian"
            type="text"
            placeholder="Cari nama atau alamat..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full h-12 pl-10 pr-9 rounded-xl bg-white border border-slate-300 text-slate-900 placeholder:text-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-[#6D4AFF] focus:border-[#6D4AFF] shadow-2xs transition-all"
            style={{ fontSize: '16px' }}
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Filter Button */}
        <button
          id="btn-filter-telitian"
          type="button"
          onClick={() => setIsFilterOpen(true)}
          className={`h-12 px-3.5 rounded-xl border flex items-center gap-1.5 text-xs sm:text-sm font-semibold transition-colors cursor-pointer shrink-0 shadow-2xs ${
            activeFilterCount > 0
              ? 'bg-violet-50 border-[#6D4AFF] text-[#6D4AFF]'
              : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
          }`}
        >
          <SlidersHorizontal className="w-4 h-4" />
          <span>Filter</span>
          {activeFilterCount > 0 && (
            <span className="w-5 h-5 rounded-full bg-[#6D4AFF] text-white text-[11px] font-bold flex items-center justify-center">
              {activeFilterCount}
            </span>
          )}
        </button>
      </div>

      {/* HASIL FILTER STATUS BAR (jika ada filter aktif) */}
      {activeFilterCount > 0 && (
        <div className="flex items-center justify-between px-3.5 py-2 bg-violet-50 border border-violet-200 rounded-xl text-xs text-violet-900">
          <span>Menampilkan {filteredRecords.length} dari {records.length} data</span>
          <button
            type="button"
            onClick={resetFilters}
            className="text-xs font-bold text-violet-700 hover:underline cursor-pointer"
          >
            Reset Filter
          </button>
        </div>
      )}

      {/* MOBILE: CARD LIST (Tablet/Desktop: Responsive Table or Cards) */}
      {filteredRecords.length === 0 ? (
        /* EMPTY STATE */
        <div className="rounded-2xl bg-white border border-slate-200/80 p-8 text-center shadow-2xs my-4">
          <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
            <User className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-800">
            {searchTerm ? 'Data tidak ditemukan' : 'Belum ada data telitian'}
          </h3>
          <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
            {searchTerm
              ? `Tidak ada catatan yang cocok dengan "${searchTerm}".`
              : 'Data yang sudah dimasukkan akan tampil di sini.'}
          </p>
          <button
            type="button"
            onClick={onScrollToForm}
            className="mt-4 inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#6D4AFF] text-white text-xs font-semibold hover:bg-[#5B39EE] cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>+ Tambah Telitian</span>
          </button>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filteredRecords.map((r) => {
            const entryCode = r.id.startsWith('TLT-')
              ? `TL-${String(r.no).padStart(4, '0')}`
              : r.id;
            const jenis = r.jenisTelitian || 'Telitian Dewasa';
            const status = r.statusValidasi || 'Valid';
            const isValid = status === 'Valid';
            const isMenuOpen = activeMenuId === r.id;

            return (
              <div
                key={r.id}
                className="bg-white border border-slate-200 rounded-[14px] p-3.5 sm:p-4 shadow-2xs hover:border-slate-300 transition-all relative"
                style={{
                  padding: '14px 16px',
                  borderRadius: '14px',
                  marginBottom: '10px',
                  border: '1px solid #E5E7EB',
                }}
              >
                {/* Baris Atas: Kode Entri & Status Badge */}
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] font-bold text-slate-400 tracking-wide font-mono">
                    {entryCode}
                  </span>

                  {/* Badge Status Kecil */}
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold tracking-wide uppercase border ${
                      isValid
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        : 'bg-amber-50 text-amber-800 border-amber-200'
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        isValid ? 'bg-emerald-600' : 'bg-amber-500'
                      }`}
                    />
                    <span>{status}</span>
                  </span>
                </div>

                {/* 1. Nama (Paling Penting) */}
                <h3 className="text-base font-bold text-slate-900 leading-tight">
                  {r.name}
                </h3>

                {/* 4. Alamat */}
                <p className="text-xs text-slate-500 mt-0.5">
                  {r.address || 'Alamat tidak dicantumkan'}
                </p>

                {/* 3. Jenis Telitian Tag */}
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-[11px] font-semibold text-violet-700 bg-violet-50 px-2 py-0.5 rounded-md border border-violet-100">
                    {jenis}
                  </span>
                  {r.kategoriTamu && r.kategoriTamu !== 'Umum' && (
                    <span className="text-[11px] font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                      {r.kategoriTamu}
                    </span>
                  )}
                </div>

                {/* 2. Nominal & 5. Jam Tanggal & Titik Tiga Aksi */}
                <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between">
                  <div>
                    {/* Nominal: 18–20 px font-weight 600–700 */}
                    <div
                      className="font-mono text-slate-900 font-extrabold tracking-tight"
                      style={{ fontSize: '19px', fontWeight: 700 }}
                    >
                      {formatRupiah(r.amount)}
                    </div>
                    {/* Jam & Tanggal */}
                    <div className="text-[11px] text-slate-400 font-medium mt-0.5 flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-400" />
                      <span>
                        {r.timeInput ? r.timeInput.replace(' WIB', '') : ''} • {r.dateInput || '19/09/2026'}
                      </span>
                    </div>
                  </div>

                  {/* Menu Titik Tiga Card Action (Lihat, Edit, Hapus) */}
                  <div className="relative card-action-menu-container">
                    <button
                      type="button"
                      aria-label="Aksi Data"
                      onClick={() => setActiveMenuId(isMenuOpen ? null : r.id)}
                      className="w-10 h-10 flex items-center justify-center rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 active:bg-slate-200 transition-colors cursor-pointer"
                    >
                      <MoreVertical className="w-5 h-5 text-slate-600" />
                    </button>

                    {/* Popover Menu Card */}
                    {isMenuOpen && (
                      <div className="absolute right-0 bottom-11 w-36 bg-white rounded-xl shadow-lg border border-slate-200 p-1.5 z-30 animate-fade-in">
                        <button
                          type="button"
                          onClick={() => {
                            setActiveMenuId(null);
                            setSelectedRecordForDetail(r);
                          }}
                          className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-100 cursor-pointer text-left"
                        >
                          <Eye className="w-3.5 h-3.5 text-blue-600" />
                          <span>Lihat Detail</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setActiveMenuId(null);
                            onEdit(r);
                          }}
                          className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-100 cursor-pointer text-left"
                        >
                          <Edit2 className="w-3.5 h-3.5 text-amber-600" />
                          <span>Edit</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setActiveMenuId(null);
                            onDelete(r);
                          }}
                          className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-medium text-rose-600 hover:bg-rose-50 cursor-pointer text-left"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                          <span>Hapus</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* FILTER BOTTOM SHEET (border-radius bagian atas: 20px, max-height 85vh, handle di atas) */}
      {isFilterOpen && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end bg-slate-900/40 backdrop-blur-2xs animate-fade-in">
          {/* Backdrop click to close */}
          <div className="flex-1" onClick={() => setIsFilterOpen(false)} />

          <div
            className="w-full max-w-[480px] md:max-w-md mx-auto bg-white shadow-2xl p-5 overflow-y-auto space-y-4 animate-slide-up"
            style={{
              borderTopLeftRadius: '20px',
              borderTopRightRadius: '20px',
              maxHeight: '85vh',
            }}
          >
            {/* Handle kecil di bagian atas */}
            <div className="w-12 h-1.5 bg-slate-300 rounded-full mx-auto -mt-1 mb-3" />

            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Filter &amp; Urutan Data</h3>
              <button
                type="button"
                onClick={() => setIsFilterOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* 1. Jenis Telitian */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Jenis Telitian
              </label>
              <div className="grid grid-cols-3 gap-2">
                {['Semua', 'Telitian Dewasa', 'Telitian Anak'].map((j) => (
                  <button
                    key={j}
                    type="button"
                    onClick={() => setFilterJenis(j)}
                    className={`py-2 px-2 rounded-xl text-xs font-semibold border transition-colors cursor-pointer ${
                      filterJenis === j
                        ? 'bg-[#6D4AFF] text-white border-[#6D4AFF]'
                        : 'bg-slate-50 text-slate-700 border-slate-200'
                    }`}
                  >
                    {j === 'Semua' ? 'Semua' : j.replace('Telitian ', '')}
                  </button>
                ))}
              </div>
            </div>

            {/* 2. Status Data */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Status Data
              </label>
              <div className="grid grid-cols-3 gap-2">
                {['Semua', 'Valid', 'Perlu Dicek'].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setFilterStatus(s)}
                    className={`py-2 px-2 rounded-xl text-xs font-semibold border transition-colors cursor-pointer ${
                      filterStatus === s
                        ? 'bg-[#6D4AFF] text-white border-[#6D4AFF]'
                        : 'bg-slate-50 text-slate-700 border-slate-200'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* 3. Kategori Tamu */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Kategori Tamu
              </label>
              <select
                value={filterKategori}
                onChange={(e) => setFilterKategori(e.target.value)}
                className="w-full h-11 px-3 rounded-xl bg-slate-50 border border-slate-300 text-sm text-slate-800"
              >
                <option value="Semua">Semua Kategori</option>
                <option value="Umum">Umum</option>
                <option value="Keluarga">Keluarga</option>
                <option value="Tetangga">Tetangga</option>
                <option value="Teman">Teman</option>
                <option value="Kolega">Kolega</option>
              </select>
            </div>

            {/* 4. Urutan Data */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Urutan Nominal / Waktu
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'terbaru', label: 'Waktu Terbaru' },
                  { id: 'terlama', label: 'Waktu Terlama' },
                  { id: 'terbesar', label: 'Nominal Terbesar' },
                  { id: 'terkecil', label: 'Nominal Terkecil' },
                ].map((st) => (
                  <button
                    key={st.id}
                    type="button"
                    onClick={() => setFilterSort(st.id as any)}
                    className={`py-2 px-2 rounded-xl text-xs font-semibold border transition-colors cursor-pointer ${
                      filterSort === st.id
                        ? 'bg-[#6D4AFF] text-white border-[#6D4AFF]'
                        : 'bg-slate-50 text-slate-700 border-slate-200'
                    }`}
                  >
                    {st.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Tombol Terapkan & Reset */}
            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                type="button"
                onClick={resetFilters}
                className="w-full h-11 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                Reset
              </button>
              <button
                type="button"
                onClick={() => setIsFilterOpen(false)}
                className="w-full h-11 rounded-xl bg-[#6D4AFF] text-white text-xs font-semibold hover:bg-[#5B39EE] cursor-pointer"
              >
                Terapkan Filter
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DETAIL RECORD MODAL */}
      {selectedRecordForDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-2xs animate-fade-in">
          <div className="relative w-full max-w-sm bg-white rounded-2xl border border-slate-200 p-5 shadow-2xl space-y-3.5">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">
                  {selectedRecordForDetail.id}
                </span>
                <h3 className="text-base font-bold text-slate-900">
                  Rincian Data Telitian
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedRecordForDetail(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Nominal Utama */}
            <div className="p-3.5 rounded-xl bg-violet-50 border border-violet-100 text-center">
              <span className="text-[11px] font-semibold text-violet-700 uppercase">
                Nominal Uang Telitian
              </span>
              <div className="text-2xl font-extrabold text-violet-900 font-mono mt-0.5">
                {formatRupiah(selectedRecordForDetail.amount)}
              </div>
            </div>

            {/* List Detail 12 Urutan */}
            <div className="divide-y divide-slate-100 text-xs">
              <div className="py-1.5 flex justify-between">
                <span className="text-slate-500">Nama Tamu</span>
                <span className="font-bold text-slate-900">{selectedRecordForDetail.name}</span>
              </div>
              <div className="py-1.5 flex justify-between">
                <span className="text-slate-500">Alamat</span>
                <span className="font-semibold text-slate-800">{selectedRecordForDetail.address || '-'}</span>
              </div>
              <div className="py-1.5 flex justify-between">
                <span className="text-slate-500">Jenis Telitian</span>
                <span className="font-semibold text-violet-700">{selectedRecordForDetail.jenisTelitian || 'Telitian Dewasa'}</span>
              </div>
              <div className="py-1.5 flex justify-between">
                <span className="text-slate-500">Kategori Tamu</span>
                <span className="font-medium text-slate-800">{selectedRecordForDetail.kategoriTamu || 'Umum'}</span>
              </div>
              <div className="py-1.5 flex justify-between">
                <span className="text-slate-500">Rincian Barang</span>
                <span className="font-medium text-slate-800">{selectedRecordForDetail.rincianBarang || 'Amplop Uang'}</span>
              </div>
              <div className="py-1.5 flex justify-between">
                <span className="text-slate-500">Petugas Meja</span>
                <span className="font-medium text-slate-800">{selectedRecordForDetail.petugas || 'Panitia Meja'}</span>
              </div>
              <div className="py-1.5 flex justify-between">
                <span className="text-slate-500">Waktu &amp; Tanggal</span>
                <span className="font-medium text-slate-800 font-mono">
                  {selectedRecordForDetail.timeInput || '-'} • {selectedRecordForDetail.dateInput || '19/09/2026'}
                </span>
              </div>
              <div className="py-1.5 flex justify-between">
                <span className="text-slate-500">Status Validasi</span>
                <span className="font-bold text-emerald-700">{selectedRecordForDetail.statusValidasi || 'Valid'}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  const target = selectedRecordForDetail;
                  setSelectedRecordForDetail(null);
                  onEdit(target);
                }}
                className="w-full h-10 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Edit Data
              </button>
              <button
                type="button"
                onClick={() => setSelectedRecordForDetail(null)}
                className="w-full h-10 rounded-xl bg-[#6D4AFF] text-white text-xs font-semibold hover:bg-[#5B39EE] cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
