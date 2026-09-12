import React from 'react';
import { X, Printer, Download, CheckCircle2 } from 'lucide-react';
import { GuestEntry, HajatanEvent, KasSummary } from '../types';
import { formatRupiah, formatDateTime } from '../utils/formatters';

interface PrintReportModalProps {
  event: HajatanEvent;
  entries: GuestEntry[];
  summary: KasSummary;
  onClose: () => void;
  onExportCsv: () => void;
}

export const PrintReportModal: React.FC<PrintReportModalProps> = ({
  event,
  entries,
  summary,
  onClose,
  onExportCsv,
}) => {
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-xs animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl border border-stone-200 overflow-hidden flex flex-col my-auto max-h-[95vh]">
        {/* Modal Top Bar (hidden on print) */}
        <div className="print:hidden flex items-center justify-between px-6 py-4 border-b border-stone-200 bg-stone-50">
          <div>
            <h3 className="text-base font-bold text-stone-900">
              Pratinjau Laporan Rekapitulasi Kas Hajatan
            </h3>
            <p className="text-xs text-stone-500">
              Dokumen resmi pembukuan uang amplop & sumbangan para tamu
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onExportCsv}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-stone-300 text-xs font-semibold text-stone-700 hover:bg-stone-100"
            >
              <Download className="w-3.5 h-3.5 text-emerald-600" />
              Download CSV
            </button>
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold shadow-xs"
            >
              <Printer className="w-3.5 h-3.5" />
              Cetak Dokumen
            </button>
            <button
              onClick={onClose}
              aria-label="Tutup"
              className="p-1.5 rounded-xl text-stone-500 hover:bg-stone-200"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Document Body */}
        <div id="printable-report" className="p-8 sm:p-10 overflow-y-auto font-sans text-stone-900 text-xs leading-normal">
          {/* Official Letterhead */}
          <div className="text-center pb-6 border-b-2 border-stone-800">
            <h1 className="text-xl sm:text-2xl font-black uppercase tracking-wider text-stone-950 font-serif">
              BERITA ACARA REKAPITULASI KEUANGAN HAJATAN
            </h1>
            <h2 className="text-lg font-bold text-amber-900 mt-1 font-serif">
              {event.eventName}
            </h2>
            <p className="text-xs text-stone-600 mt-1">
              Penyelenggara / Tuan Rumah: <strong>{event.hostName}</strong>
            </p>
            <p className="text-xs text-stone-500">
              Tanggal Acara: {event.eventDate} | Lokasi: {event.location}
            </p>
          </div>

          {/* Financial Summary Grid */}
          <div className="my-6">
            <h3 className="font-bold text-xs uppercase tracking-wider text-stone-700 mb-2.5">
              I. Ringkasan Total Keuangan Masuk
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-stone-50 p-4 rounded-xl border border-stone-200">
              <div>
                <div className="text-[10px] uppercase font-bold text-stone-500">Grand Total Masuk</div>
                <div className="text-base font-black text-amber-900">{formatRupiah(summary.grandTotal)}</div>
                <div className="text-[10px] text-stone-500">{summary.totalGuests} Donatur</div>
              </div>
              <div>
                <div className="text-[10px] uppercase font-bold text-stone-500">Amplop Tunai</div>
                <div className="text-sm font-bold text-emerald-800">{formatRupiah(summary.totalTunai)}</div>
                <div className="text-[10px] text-stone-500">Uang fisik meja</div>
              </div>
              <div>
                <div className="text-[10px] uppercase font-bold text-stone-500">Transfer & QRIS</div>
                <div className="text-sm font-bold text-sky-800">{formatRupiah(summary.totalTransfer + summary.totalQris)}</div>
                <div className="text-[10px] text-stone-500">Non-tunai digital</div>
              </div>
              <div>
                <div className="text-[10px] uppercase font-bold text-stone-500">Bingkisan Kado</div>
                <div className="text-sm font-bold text-purple-800">{summary.totalKadoCount} Hadiah Fisik</div>
                <div className="text-[10px] text-stone-500">Rerata: {formatRupiah(summary.averageAmount)}</div>
              </div>
            </div>
          </div>

          {/* Detailed Entries Table */}
          <div className="my-6">
            <h3 className="font-bold text-xs uppercase tracking-wider text-stone-700 mb-2.5">
              II. Daftar Catatan Amplop & Sumbangan Tamu Undangan
            </h3>
            <div className="overflow-x-auto border border-stone-300 rounded-lg">
              <table className="w-full text-left text-[11px] border-collapse">
                <thead className="bg-stone-100 text-stone-700 font-bold border-b border-stone-300">
                  <tr>
                    <th className="p-2 border-r border-stone-200 w-12 text-center">No</th>
                    <th className="p-2 border-r border-stone-200">Nama Tamu / Donatur</th>
                    <th className="p-2 border-r border-stone-200">Asal / Instansi</th>
                    <th className="p-2 border-r border-stone-200">Hubungan</th>
                    <th className="p-2 border-r border-stone-200">Status</th>
                    <th className="p-2 border-r border-stone-200">Metode</th>
                    <th className="p-2 border-r border-stone-200 text-right">Nominal (Rp)</th>
                    <th className="p-2">Keterangan / Kado / Doa</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-200">
                  {entries.map((entry, idx) => (
                    <tr key={entry.id} className="hover:bg-stone-50">
                      <td className="p-2 border-r border-stone-200 text-center font-mono text-[10px]">
                        {idx + 1}
                      </td>
                      <td className="p-2 border-r border-stone-200 font-bold text-stone-900">
                        {entry.guestName}
                      </td>
                      <td className="p-2 border-r border-stone-200 text-stone-600">
                        {entry.cityOrAddress || '-'}
                      </td>
                      <td className="p-2 border-r border-stone-200 text-stone-700">
                        {entry.relationship}
                      </td>
                      <td className="p-2 border-r border-stone-200 text-stone-600">
                        {entry.attendance === 'hadir' ? 'Hadir' : `Titip (${entry.broughtBy || '-'})`}
                      </td>
                      <td className="p-2 border-r border-stone-200 uppercase font-semibold text-stone-700">
                        {entry.paymentMethod}
                      </td>
                      <td className="p-2 border-r border-stone-200 text-right font-mono font-bold text-stone-900">
                        {entry.amount > 0 ? formatRupiah(entry.amount) : '-'}
                      </td>
                      <td className="p-2 text-stone-600 text-[10px]">
                        {entry.giftDescription && (
                          <div className="font-semibold text-purple-800">Kado: {entry.giftDescription}</div>
                        )}
                        {entry.greetings && <div className="italic">&quot;{entry.greetings}&quot;</div>}
                      </td>
                    </tr>
                  ))}
                  {/* Total row */}
                  <tr className="bg-stone-100 font-bold border-t-2 border-stone-400">
                    <td colSpan={6} className="p-2 text-right uppercase tracking-wider text-stone-800">
                      TOTAL KAS MASUK HAJATAN:
                    </td>
                    <td className="p-2 text-right font-mono text-sm font-black text-amber-950 border-r border-stone-200">
                      {formatRupiah(summary.grandTotal)}
                    </td>
                    <td className="p-2 text-stone-600 text-[10px]">
                      {entries.length} data tercatat
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Signature / Validation Block */}
          <div className="mt-10 pt-6 border-t border-stone-300 grid grid-cols-2 gap-8 text-center text-xs">
            <div>
              <p className="text-stone-500 mb-14">
                Petugas Penerima Meja Tamu:
              </p>
              <div className="font-bold underline text-stone-900">
                ( {event.cashierName || 'Panitia Penerima Tamu'} )
              </div>
              <div className="text-[10px] text-stone-400 mt-1">Dicetak pada: {formatDateTime(new Date().toISOString())}</div>
            </div>

            <div>
              <p className="text-stone-500 mb-14">
                Penyelenggara / Tuan Rumah:
              </p>
              <div className="font-bold underline text-stone-900">
                ( {event.hostName} )
              </div>
              <div className="text-[10px] text-stone-400 mt-1">Dokumen Sah Pembukuan Hajatan</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
