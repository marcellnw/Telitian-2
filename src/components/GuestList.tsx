import React, { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  ArrowUpDown,
  FileText,
  Edit2,
  Trash2,
  Banknote,
  Smartphone,
  Gift,
  Send,
  UserCheck,
  Building2,
  Calendar,
  Layers,
} from 'lucide-react';
import { GuestEntry, RelationshipCategory, PaymentMethod, AttendanceType } from '../types';
import { formatRupiah, formatDateTime } from '../utils/formatters';

interface GuestListProps {
  entries: GuestEntry[];
  hidePrivacy: boolean;
  onViewReceipt: (entry: GuestEntry) => void;
  onEdit: (entry: GuestEntry) => void;
  onDelete: (id: string) => void;
}

type SortOption = 'newest' | 'oldest' | 'highest' | 'lowest' | 'name-asc';

export const GuestList: React.FC<GuestListProps> = ({
  entries,
  hidePrivacy,
  onViewReceipt,
  onEdit,
  onDelete,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedMethod, setSelectedMethod] = useState<string>('all');
  const [selectedAttendance, setSelectedAttendance] = useState<string>('all');
  const [sortBy, setSortBy] = useState<SortOption>('newest');

  // Filter and sort logic
  const filteredEntries = useMemo(() => {
    return entries
      .filter((entry) => {
        const matchesSearch =
          entry.guestName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (entry.cityOrAddress && entry.cityOrAddress.toLowerCase().includes(searchTerm.toLowerCase())) ||
          (entry.greetings && entry.greetings.toLowerCase().includes(searchTerm.toLowerCase())) ||
          entry.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (entry.giftDescription && entry.giftDescription.toLowerCase().includes(searchTerm.toLowerCase()));

        const matchesCat = selectedCategory === 'all' || entry.relationship === selectedCategory;
        const matchesMethod = selectedMethod === 'all' || entry.paymentMethod === selectedMethod;
        const matchesAtt = selectedAttendance === 'all' || entry.attendance === selectedAttendance;

        return matchesSearch && matchesCat && matchesMethod && matchesAtt;
      })
      .sort((a, b) => {
        if (sortBy === 'newest') {
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        }
        if (sortBy === 'oldest') {
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        }
        if (sortBy === 'highest') {
          return b.amount - a.amount;
        }
        if (sortBy === 'lowest') {
          return a.amount - b.amount;
        }
        if (sortBy === 'name-asc') {
          return a.guestName.localeCompare(b.guestName);
        }
        return 0;
      });
  }, [entries, searchTerm, selectedCategory, selectedMethod, selectedAttendance, sortBy]);

  const filteredSubtotal = useMemo(() => {
    return filteredEntries.reduce((acc, curr) => acc + curr.amount, 0);
  }, [filteredEntries]);

  const getMethodBadge = (method: PaymentMethod, giftDesc?: string) => {
    switch (method) {
      case 'tunai':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
            <Banknote className="w-3 h-3" /> Tunai
          </span>
        );
      case 'transfer':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-sky-100 text-sky-800 border border-sky-200">
            <Smartphone className="w-3 h-3" /> Transfer
          </span>
        );
      case 'qris':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-800 border border-indigo-200">
            <Smartphone className="w-3 h-3" /> QRIS
          </span>
        );
      case 'kado':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-800 border border-purple-200" title={giftDesc}>
            <Gift className="w-3 h-3" /> Kado
          </span>
        );
      default:
        return null;
    }
  };

  const getCategoryBadge = (category: RelationshipCategory) => {
    const styleMap: Record<RelationshipCategory, string> = {
      'Keluarga': 'bg-rose-50 text-rose-700 border-rose-200',
      'Besan / Kerabat': 'bg-amber-50 text-amber-800 border-amber-200',
      'Sahabat': 'bg-blue-50 text-blue-700 border-blue-200',
      'Rekan Kerja': 'bg-teal-50 text-teal-700 border-teal-200',
      'Tetangga': 'bg-orange-50 text-orange-700 border-orange-200',
      'Tamu VIP': 'bg-yellow-100 text-yellow-900 border-yellow-300 font-bold',
      'Umum': 'bg-stone-100 text-stone-700 border-stone-200',
    };
    return (
      <span className={`inline-block px-2 py-0.5 rounded-md text-[11px] font-medium border ${styleMap[category] || 'bg-stone-100 text-stone-600'}`}>
        {category}
      </span>
    );
  };

  return (
    <div className="bg-white rounded-3xl p-6 md:p-7 shadow-sm border border-stone-200/90">
      {/* Title and stats bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 pb-4 border-b border-stone-100">
        <div>
          <h3 className="text-xl font-bold text-stone-900 font-['Playfair_Display',serif] flex items-center gap-2">
            <FileText className="w-5 h-5 text-amber-600" />
            Daftar Uang Masuk & Catatan Tamu
          </h3>
          <p className="text-xs text-stone-500 mt-0.5">
            Total {entries.length} catatan tamu • Menampilkan {filteredEntries.length} data
          </p>
        </div>

        {/* Subtotal of filtered view */}
        <div className="px-4 py-2 rounded-2xl bg-amber-50/80 border border-amber-200/70 text-right">
          <div className="text-[11px] font-bold text-amber-900/80 uppercase tracking-wider">Subtotal Tampilan</div>
          <div className="text-lg font-black text-amber-950">
            {formatRupiah(filteredSubtotal, hidePrivacy)}
          </div>
        </div>
      </div>

      {/* Filter and Search Controls */}
      <div className="space-y-3 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          {/* Search Input */}
          <div className="md:col-span-5 relative">
            <input
              id="search-guest-input"
              type="text"
              placeholder="Cari nama tamu, alamat, kode, atau doa..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-stone-300 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 bg-stone-50/50"
            />
            <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-3" />
          </div>

          {/* Category Filter */}
          <div className="md:col-span-3">
            <select
              id="filter-category-select"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              aria-label="Filter berdasarkan Kategori Hubungan"
              className="w-full px-3 py-2.5 rounded-xl border border-stone-300 text-xs font-medium text-stone-700 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              <option value="all">Semua Kategori Hubungan</option>
              <option value="Keluarga">Keluarga</option>
              <option value="Besan / Kerabat">Besan / Kerabat</option>
              <option value="Sahabat">Sahabat</option>
              <option value="Rekan Kerja">Rekan Kerja</option>
              <option value="Tetangga">Tetangga</option>
              <option value="Tamu VIP">Tamu VIP</option>
              <option value="Umum">Umum</option>
            </select>
          </div>

          {/* Payment Method Filter */}
          <div className="md:col-span-2">
            <select
              id="filter-method-select"
              value={selectedMethod}
              onChange={(e) => setSelectedMethod(e.target.value)}
              aria-label="Filter berdasarkan Metode Sumbangan"
              className="w-full px-3 py-2.5 rounded-xl border border-stone-300 text-xs font-medium text-stone-700 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              <option value="all">Semua Metode</option>
              <option value="tunai">Tunai / Amplop</option>
              <option value="transfer">Transfer Bank</option>
              <option value="qris">QRIS / E-Wallet</option>
              <option value="kado">Kado / Barang</option>
            </select>
          </div>

          {/* Sort Option */}
          <div className="md:col-span-2">
            <select
              id="sort-by-select"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              aria-label="Urutkan Catatan Tamu"
              className="w-full px-3 py-2.5 rounded-xl border border-stone-300 text-xs font-medium text-stone-700 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              <option value="newest">Terbaru Masuk</option>
              <option value="oldest">Terlama Masuk</option>
              <option value="highest">Nominal Terbesar</option>
              <option value="lowest">Nominal Terkecil</option>
              <option value="name-asc">Nama Tamu A - Z</option>
            </select>
          </div>
        </div>

        {/* Quick status tabs: Hadir vs Titip */}
        <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
          <span className="text-stone-400 text-xs font-semibold mr-1 flex items-center gap-1">
            <Filter className="w-3 h-3" /> Status:
          </span>
          <button
            id="status-filter-all"
            onClick={() => setSelectedAttendance('all')}
            className={`px-3 py-1 rounded-lg font-semibold transition-all ${
              selectedAttendance === 'all'
                ? 'bg-stone-900 text-white shadow-xs'
                : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
            }`}
          >
            Semua ({entries.length})
          </button>
          <button
            id="status-filter-hadir"
            onClick={() => setSelectedAttendance('hadir')}
            className={`px-3 py-1 rounded-lg font-semibold transition-all ${
              selectedAttendance === 'hadir'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
            }`}
          >
            Hadir Langsung ({entries.filter((e) => e.attendance === 'hadir').length})
          </button>
          <button
            id="status-filter-titip"
            onClick={() => setSelectedAttendance('titip')}
            className={`px-3 py-1 rounded-lg font-semibold transition-all ${
              selectedAttendance === 'titip'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
            }`}
          >
            Titip Amplop ({entries.filter((e) => e.attendance === 'titip').length})
          </button>
        </div>
      </div>

      {/* Table / List View */}
      {filteredEntries.length === 0 ? (
        <div className="text-center py-16 px-4 bg-stone-50 rounded-2xl border border-dashed border-stone-200">
          <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center mx-auto mb-3">
            <Search className="w-6 h-6" />
          </div>
          <h4 className="text-stone-800 font-bold text-base">Tidak ada catatan tamu yang cocok</h4>
          <p className="text-xs text-stone-500 mt-1 max-w-sm mx-auto">
            Coba ubah kata kunci pencarian atau reset filter kategori / metode pembayaran di atas.
          </p>
          <button
            id="btn-reset-filter"
            onClick={() => {
              setSearchTerm('');
              setSelectedCategory('all');
              setSelectedMethod('all');
              setSelectedAttendance('all');
            }}
            className="mt-3 px-3 py-1.5 rounded-lg bg-stone-200 hover:bg-stone-300 text-stone-700 text-xs font-semibold"
          >
            Reset Semua Filter
          </button>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-stone-200 shadow-xs">
          <table className="w-full text-left text-xs text-stone-700">
            <thead className="bg-stone-100/80 text-stone-600 font-bold uppercase tracking-wider text-[11px] border-b border-stone-200">
              <tr>
                <th className="py-3.5 px-4">No. / Tamu</th>
                <th className="py-3.5 px-3">Kategori</th>
                <th className="py-3.5 px-3">Kehadiran</th>
                <th className="py-3.5 px-3">Metode</th>
                <th className="py-3.5 px-4 text-right">Nominal Masuk</th>
                <th className="py-3.5 px-4">Ucapan & Doa</th>
                <th className="py-3.5 px-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 font-normal">
              {filteredEntries.map((entry, index) => (
                <tr
                  key={entry.id}
                  className="hover:bg-amber-50/40 transition-colors group"
                >
                  {/* Guest Name & Code */}
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono font-bold text-stone-400 bg-stone-100 px-1.5 py-0.5 rounded">
                        {entry.code}
                      </span>
                      <div>
                        <div className="font-bold text-stone-900 text-sm">
                          {entry.guestName}
                        </div>
                        {entry.cityOrAddress && (
                          <div className="text-[11px] text-stone-500 flex items-center gap-1 mt-0.5">
                            <Building2 className="w-3 h-3 text-stone-400 shrink-0" />
                            <span>{entry.cityOrAddress}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Kategori */}
                  <td className="py-3.5 px-3 whitespace-nowrap">
                    {getCategoryBadge(entry.relationship)}
                  </td>

                  {/* Status Kehadiran */}
                  <td className="py-3.5 px-3 whitespace-nowrap">
                    {entry.attendance === 'hadir' ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                        <UserCheck className="w-3 h-3" /> Hadir
                      </span>
                    ) : (
                      <div className="space-y-0.5">
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-200">
                          <Send className="w-3 h-3" /> Titip Amplop
                        </span>
                        {entry.broughtBy && (
                          <div className="text-[10px] text-stone-500 italic truncate max-w-[140px]">
                            {entry.broughtBy}
                          </div>
                        )}
                      </div>
                    )}
                  </td>

                  {/* Metode */}
                  <td className="py-3.5 px-3 whitespace-nowrap">
                    <div>
                      {getMethodBadge(entry.paymentMethod, entry.giftDescription)}
                      {entry.paymentMethod === 'kado' && entry.giftDescription && (
                        <div className="text-[11px] text-purple-900 font-medium mt-1 truncate max-w-[160px]" title={entry.giftDescription}>
                          🎁 {entry.giftDescription}
                        </div>
                      )}
                    </div>
                  </td>

                  {/* Nominal Masuk */}
                  <td className="py-3.5 px-4 text-right whitespace-nowrap font-bold text-stone-900">
                    <span className={entry.amount > 0 ? 'text-stone-900 text-sm' : 'text-stone-400 text-xs italic font-normal'}>
                      {entry.amount > 0 ? formatRupiah(entry.amount, hidePrivacy) : (entry.giftDescription ? 'Barang Kado' : 'Rp 0')}
                    </span>
                  </td>

                  {/* Greetings / Doa */}
                  <td className="py-3.5 px-4 max-w-[220px]">
                    {entry.greetings ? (
                      <p className="text-[11px] text-stone-600 italic line-clamp-2" title={entry.greetings}>
                        &quot;{entry.greetings}&quot;
                      </p>
                    ) : (
                      <span className="text-[11px] text-stone-400">-</span>
                    )}
                    <div className="text-[10px] text-stone-400 mt-1 flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {formatDateTime(entry.createdAt)}
                    </div>
                  </td>

                  {/* Actions */}
                  <td className="py-3.5 px-4 whitespace-nowrap text-center">
                    <div className="flex items-center justify-center gap-1">
                      {/* Tanda Terima Digital */}
                      <button
                        id={`btn-receipt-${entry.id}`}
                        onClick={() => onViewReceipt(entry)}
                        title="Lihat Tanda Terima Digital / Slip Amplop"
                        className="p-1.5 rounded-lg text-amber-700 hover:bg-amber-100 transition-colors"
                      >
                        <FileText className="w-4 h-4" />
                      </button>

                      {/* Edit */}
                      <button
                        id={`btn-edit-${entry.id}`}
                        onClick={() => onEdit(entry)}
                        title="Ubah data"
                        className="p-1.5 rounded-lg text-stone-600 hover:bg-stone-200 transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>

                      {/* Hapus */}
                      <button
                        id={`btn-delete-${entry.id}`}
                        onClick={() => {
                          if (window.confirm(`Yakin ingin menghapus catatan tamu: "${entry.guestName}"?`)) {
                            onDelete(entry.id);
                          }
                        }}
                        title="Hapus data"
                        className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-100 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
