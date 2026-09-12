import React, { useState, useMemo } from 'react';
import {
  Search,
  Plus,
  FileSpreadsheet,
  FileText,
  Printer,
  Edit2,
  Trash2,
  Users,
  ChevronDown,
  RotateCcw,
  Database,
  Wallet,
  BookOpen,
  Lock,
} from 'lucide-react';
import { TelitianRecord } from '../types/record';
import { formatRupiah, formatDateTimeJakarta } from '../lib/currency';

interface DataTableProps {
  records: TelitianRecord[];
  allRecordsCount: number;
  allRecordsTotalUang: number;
  isAdmin: boolean;
  onOpenLogin: () => void;
  onEdit: (record: TelitianRecord) => void;
  onDelete: (record: TelitianRecord) => void;
  onScrollToForm: () => void;
  onExportExcel: () => void;
  onExportWord: () => void;
  onPrint: () => void;
  onGoToBackup: () => void;
  onOpenReset?: () => void;
}

type SortFilter = 'terbaru' | 'terlama' | 'terbesar' | 'terkecil' | 'semua';

export const DataTable: React.FC<DataTableProps> = ({
  records,
  allRecordsCount,
  allRecordsTotalUang,
  isAdmin,
  onOpenLogin,
  onEdit,
  onDelete,
  onScrollToForm,
  onExportExcel,
  onExportWord,
  onPrint,
  onGoToBackup,
  onOpenReset,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSort, setFilterSort] = useState<SortFilter>('terbaru');

  // Filtered and Sorted Records
  const displayRecords = useMemo(() => {
    let result = [...records];

    // Realtime Search (by Name or Address)
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase().trim();
      result = result.filter(
        (r) =>
          r.name.toLowerCase().includes(q) ||
          r.address.toLowerCase().includes(q) ||
          r.id.toLowerCase().includes(q)
      );
    }

    // Sorting
    switch (filterSort) {
      case 'terlama':
        result.sort((a, b) => a.no - b.no);
        break;
      case 'terbesar':
        result.sort((a, b) => b.amount - a.amount);
        break;
      case 'terkecil':
        result.sort((a, b) => a.amount - b.amount);
        break;
      case 'terbaru':
      case 'semua':
      default:
        result.sort((a, b) => b.no - a.no);
        break;
    }

    return result;
  }, [records, searchTerm, filterSort]);

  const { date, time } = formatDateTimeJakarta();

  return (
    <div id="data-table-container" className="rounded-2xl sm:rounded-3xl bg-white border border-slate-200/90 p-4 sm:p-7 lg:p-8 shadow-xs w-full max-w-full overflow-hidden">
      {/* Top Toolbar */}
      <div id="action-buttons-bar" className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-5 sm:mb-6 pb-4 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-lg sm:text-xl font-extrabold uppercase text-slate-900 tracking-tight">
              Buku Catatan Telitian
            </h3>
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-300">
              {records.length} Tamu
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5 font-medium">
            Daftar resmi tamu dan uang masuk telitian hajatan Gibran Kurniawan.
          </p>
        </div>

        {/* Action Buttons Toolbar - Flexible grid on mobile, inline on desktop */}
        <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2 w-full lg:w-auto">
          <button
            id="btn-tambah-data"
            onClick={onScrollToForm}
            className="col-span-2 sm:col-span-1 inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-xs transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>+ Tambah Data</span>
          </button>

          {/* Excel Realtime Button */}
          <button
            id="btn-export-excel"
            onClick={onExportExcel}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
            title="Download Spreadsheet Excel Terkini"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-300 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-200"></span>
            </span>
            <FileSpreadsheet className="w-4 h-4" />
            <span>Excel</span>
          </button>

          <button
            id="btn-export-word"
            onClick={onExportWord}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 text-xs font-bold transition-all cursor-pointer"
            title="Export Dokumen Word (.docx)"
          >
            <FileText className="w-4 h-4 text-sky-600" />
            <span>Word</span>
          </button>

          <button
            id="btn-print"
            onClick={onPrint}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 text-xs font-bold transition-all cursor-pointer"
            title="Cetak Buku Telitian"
          >
            <Printer className="w-4 h-4 text-slate-600" />
            <span>Print</span>
          </button>

          <button
            id="btn-backup-data-tab"
            onClick={onGoToBackup}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 text-xs font-bold transition-all cursor-pointer"
            title="Pusat Sinkronisasi & Backup"
          >
            <Database className="w-4 h-4 text-slate-600" />
            <span>Backup</span>
          </button>

          {onOpenReset && (
            <button
              id="btn-reset-zero-table"
              onClick={onOpenReset}
              className="col-span-2 sm:col-span-1 inline-flex items-center justify-center gap-1 px-3 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 text-xs font-bold transition-all cursor-pointer"
              title="Mulai pendataan dari 0"
            >
              <RotateCcw className="w-3.5 h-3.5 text-rose-600" />
              <span>Mulai 0</span>
            </button>
          )}
        </div>
      </div>

      {/* Search & Filter Controls */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 mb-4">
        {/* Realtime Search Input */}
        <div className="sm:col-span-8 relative">
          <input
            id="input-cari-telitian"
            type="text"
            placeholder="Cari nama tamu, alamat, atau ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-11 pr-4 py-2.5 sm:py-3 rounded-xl sm:rounded-2xl bg-slate-50 border border-slate-300 text-slate-900 placeholder:text-slate-400 text-sm font-medium focus:outline-none focus:bg-white focus:ring-2 focus:ring-slate-900 focus:border-slate-900 shadow-2xs"
          />
          <Search className="w-4 h-4 sm:w-5 sm:h-5 text-slate-400 absolute left-3.5 top-3 sm:top-3.5 pointer-events-none" />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3.5 top-2.5 sm:top-3 text-xs text-slate-500 hover:text-slate-900 px-2 py-0.5 rounded bg-slate-200 cursor-pointer"
            >
              Hapus
            </button>
          )}
        </div>

        {/* Filter Dropdown */}
        <div className="sm:col-span-4 relative">
          <select
            id="select-filter-telitian"
            value={filterSort}
            onChange={(e) => setFilterSort(e.target.value as SortFilter)}
            className="w-full appearance-none px-4 py-2.5 sm:py-3 rounded-xl sm:rounded-2xl bg-slate-50 border border-slate-300 text-slate-800 text-sm font-semibold focus:outline-none focus:bg-white focus:ring-2 focus:ring-slate-900 cursor-pointer shadow-2xs"
          >
            <option value="terbaru">Urutan: Terbaru</option>
            <option value="terlama">Urutan: Terlama</option>
            <option value="terbesar">Urutan: Nominal Terbesar</option>
            <option value="terkecil">Urutan: Nominal Terkecil</option>
            <option value="semua">Urutan: Semua Data</option>
          </select>
          <ChevronDown className="w-4 h-4 text-slate-400 absolute right-4 top-3 sm:top-3.5 pointer-events-none" />
        </div>
      </div>

      {/* Operasional Status Badge */}
      <div className="mb-4 flex items-center justify-between text-xs py-2.5 px-3 rounded-xl bg-slate-50 border border-slate-200">
        <div className="flex items-center gap-2">
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span className="font-medium text-slate-700">
            Pencatatan Aktif: Klik tombol <strong className="text-amber-800 font-bold">Edit</strong> untuk merubah data tamu, atau <strong className="text-rose-700 font-bold">Hapus</strong> untuk membatalkan entri.
          </span>
        </div>
        {!isAdmin && onOpenLogin && (
          <button
            onClick={onOpenLogin}
            className="font-bold text-slate-700 hover:text-slate-900 hover:underline cursor-pointer ml-2 shrink-0 flex items-center gap-1 text-[11px] bg-white px-2 py-1 rounded-lg border border-slate-200"
          >
            <Lock className="w-3 h-3 text-slate-500" />
            <span>Kunci Admin</span>
          </button>
        )}
      </div>

      {/* Print-Only Document Header (Clean A4 portrait) */}
      <div className="hidden print:block mb-6 text-center border-b-2 border-black pb-4">
        <h1 className="text-2xl font-black uppercase tracking-wider">
          BUKU CATATAN TELITIAN HAJATAN
        </h1>
        <h2 className="text-xl font-bold mt-1">GIBRAN KURNIAWAN</h2>
        <p className="text-xs text-gray-600 mt-1">
          Tanggal Cetak: {date} pukul {time}
        </p>
      </div>

      {/* Table / Card List View */}
      {records.length === 0 ? (
        /* Empty State */
        <div className="text-center py-12 sm:py-16 px-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50/70">
          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-white border border-slate-200 flex items-center justify-center mx-auto mb-3 text-slate-700 shadow-2xs">
            <BookOpen className="w-7 h-7 sm:w-8 sm:h-8 text-slate-600" />
          </div>
          <h4 className="text-base sm:text-lg font-bold uppercase text-slate-900">
            Buku Catatan Telitian Masih Kosong
          </h4>
          <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
            Gunakan formulir entri di atas untuk memasukkan data tamu pertama. Seluruh data akan otomatis tercatat dan tersinkronisasi.
          </p>
          <div className="mt-5 flex items-center justify-center gap-6 text-xs text-slate-600">
            <div>
              Total Data: <strong className="text-slate-900 font-bold">0 Tamu</strong>
            </div>
            <div>
              Total Uang: <strong className="text-slate-900 font-bold">Rp0</strong>
            </div>
          </div>
        </div>
      ) : displayRecords.length === 0 ? (
        /* Search Not Found State */
        <div className="text-center py-12 px-4 rounded-2xl border border-slate-200 bg-slate-50">
          <p className="text-sm font-bold text-slate-700">
            Tidak ditemukan data dengan kata kunci &quot;{searchTerm}&quot;
          </p>
          <button
            onClick={() => setSearchTerm('')}
            className="mt-3 px-3.5 py-1.5 rounded-xl bg-white border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
          >
            Reset Pencarian
          </button>
        </div>
      ) : (
        <>
          {/* Desktop Table View */}
          <div id="printable-table-area" className="hidden md:block overflow-x-auto rounded-2xl border border-slate-200 shadow-xs">
            <table className="w-full text-left text-sm text-slate-700 border-collapse">
              <thead className="bg-slate-50 text-slate-700 font-bold uppercase tracking-wider text-xs border-b border-slate-200">
                <tr>
                  <th className="py-3.5 px-4 w-16 text-center">No.</th>
                  <th className="py-3.5 px-5">Nama Tamu</th>
                  <th className="py-3.5 px-5">Alamat / Asal</th>
                  <th className="py-3.5 px-5 text-right">Jumlah Uang</th>
                  <th className="py-3.5 px-4 text-center w-36 action-col print:hidden">
                    <span className="text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">Aksi</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {displayRecords.map((record, index) => (
                  <tr
                    key={record.id}
                    className="hover:bg-slate-50 transition-colors group"
                  >
                    <td className="py-3.5 px-4 text-center font-bold text-slate-500">
                      {index + 1}
                    </td>
                    <td className="py-3.5 px-5">
                      <div className="font-bold text-slate-900 text-base">
                        {record.name}
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono">
                        {record.id} • {record.timeInput}
                      </div>
                    </td>
                    <td className="py-3.5 px-5 text-slate-600">
                      {record.address || '-'}
                    </td>
                    <td className="py-3.5 px-5 text-right font-black text-slate-900 text-base whitespace-nowrap">
                      {formatRupiah(record.amount)}
                    </td>
                    <td className="py-3.5 px-4 text-center action-col print:hidden">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          id={`btn-edit-row-${record.id}`}
                          onClick={() => onEdit(record)}
                          title="Edit / Rubah Data"
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 border border-amber-200 text-xs font-semibold text-amber-800 transition-colors cursor-pointer"
                        >
                          <Edit2 className="w-3.5 h-3.5 text-amber-700" />
                          <span>Edit</span>
                        </button>
                        <button
                          id={`btn-delete-row-${record.id}`}
                          onClick={() => onDelete(record)}
                          title="Hapus Data"
                          className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-xs font-semibold transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                          <span>Hapus</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Card / List View */}
          <div className="md:hidden space-y-3">
            {displayRecords.map((record, index) => (
              <div
                key={record.id}
                className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs flex flex-col gap-2.5"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2.5">
                    <span className="w-7 h-7 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-xs font-black text-slate-700 shrink-0 mt-0.5">
                      {index + 1}
                    </span>
                    <div>
                      <div className="font-bold text-slate-900 text-base leading-snug">
                        {record.name}
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        {record.address || 'Alamat tidak dicatat'}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                        {record.id} • {record.timeInput}
                      </div>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-black text-slate-900 text-lg">
                      {formatRupiah(record.amount)}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    onClick={() => onEdit(record)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-200 text-xs font-bold text-amber-800 hover:bg-amber-100 cursor-pointer"
                  >
                    <Edit2 className="w-3.5 h-3.5 text-amber-700" />
                    <span>Edit Data</span>
                  </button>
                  <button
                    onClick={() => onDelete(record)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-50 border border-rose-200 text-xs font-bold text-rose-700 hover:bg-rose-100 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                    <span>Hapus</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Prominent Formal Bottom Summary Panel */}
      <div className="mt-6 sm:mt-8 rounded-2xl sm:rounded-3xl bg-slate-900 text-white p-5 sm:p-7 border border-slate-800 shadow-sm relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5 relative z-10">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-white/10 border border-white/20 text-slate-200 text-[11px] font-bold uppercase tracking-wider mb-2">
              <BookOpen className="w-3.5 h-3.5 text-amber-400" />
              <span>Rekapitulasi Kas Telitian Resmi</span>
            </div>
            <div className="flex items-center gap-2 text-xs sm:text-sm text-slate-300">
              <Users className="w-4 h-4 text-slate-400" />
              <span>
                Total Tamu Tercatat: <strong className="text-white text-sm sm:text-base font-bold">{allRecordsCount} Orang</strong>
              </span>
            </div>
          </div>

          <div className="text-left sm:text-right border-t sm:border-t-0 border-white/10 pt-3 sm:pt-0">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Total Uang Masuk
            </div>
            <div className="mt-0.5 text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight font-mono">
              {formatRupiah(allRecordsTotalUang)}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              *Diakumulasi dari seluruh data buku telitian hajatan
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
