import React, { useState } from 'react';
import { X, Save, Database, Upload, Download, RotateCcw, AlertTriangle, Sparkles } from 'lucide-react';
import { HajatanEvent, GuestEntry } from '../types';

interface EventSettingsModalProps {
  event: HajatanEvent;
  entries: GuestEntry[];
  onSaveEvent: (event: HajatanEvent) => void;
  onRestoreData: (entries: GuestEntry[], event: HajatanEvent) => void;
  onResetData: () => void;
  onLoadSampleData: () => void;
  onClose: () => void;
}

export const EventSettingsModal: React.FC<EventSettingsModalProps> = ({
  event,
  entries,
  onSaveEvent,
  onRestoreData,
  onResetData,
  onLoadSampleData,
  onClose,
}) => {
  const [formData, setFormData] = useState<HajatanEvent>({ ...event });
  const [confirmResetText, setConfirmResetText] = useState('');
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveEvent(formData);
    onClose();
  };

  const handleBackup = () => {
    const dataObj = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      event: formData,
      entries,
    };
    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
      JSON.stringify(dataObj, null, 2)
    )}`;
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', jsonString);
    downloadAnchor.setAttribute(
      'download',
      `Backup_Kas_Hajatan_${formData.eventName.replace(/[^a-zA-Z0-9]/g, '_')}.json`
    );
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (eventReader) => {
      try {
        const parsed = JSON.parse(eventReader.target?.result as string);
        if (parsed && Array.isArray(parsed.entries) && parsed.event) {
          onRestoreData(parsed.entries, parsed.event);
          alert(`Berhasil memulihkan ${parsed.entries.length} data catatan kas hajatan!`);
          onClose();
        } else {
          alert('Format file JSON tidak sesuai dengan struktur backup buku kas hajatan.');
        }
      } catch (err) {
        alert('Gagal membaca file backup JSON. Pastikan file valid.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-stone-200 overflow-hidden flex flex-col my-auto max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-100 bg-stone-50">
          <div className="flex items-center gap-2 text-stone-900 font-bold text-base">
            <Sparkles className="w-5 h-5 text-amber-600" />
            <span>Pengaturan Acara & Manajemen Data</span>
          </div>
          <button
            onClick={onClose}
            aria-label="Tutup"
            className="p-1.5 rounded-xl text-stone-400 hover:bg-stone-200 hover:text-stone-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-6">
          {/* Form Event Details */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-stone-500">
              Informasi Acara Hajatan
            </h4>

            <div>
              <label htmlFor="event-name-input" className="block text-xs font-semibold text-stone-700 mb-1">
                Nama Acara / Hajatan
              </label>
              <input
                id="event-name-input"
                type="text"
                required
                value={formData.eventName}
                onChange={(e) => setFormData({ ...formData, eventName: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl border border-stone-300 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="host-name-input" className="block text-xs font-semibold text-stone-700 mb-1">
                  Nama Tuan Rumah / Keluarga
                </label>
                <input
                  id="host-name-input"
                  type="text"
                  required
                  value={formData.hostName}
                  onChange={(e) => setFormData({ ...formData, hostName: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-stone-300 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label htmlFor="event-date-input" className="block text-xs font-semibold text-stone-700 mb-1">
                  Tanggal Acara
                </label>
                <input
                  id="event-date-input"
                  type="text"
                  value={formData.eventDate}
                  onChange={(e) => setFormData({ ...formData, eventDate: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-stone-300 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="event-location-input" className="block text-xs font-semibold text-stone-700 mb-1">
                  Lokasi / Gedung / Kediaman
                </label>
                <input
                  id="event-location-input"
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-stone-300 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label htmlFor="cashier-name-input" className="block text-xs font-semibold text-stone-700 mb-1">
                  Nama Petugas Meja Penerima Tamu
                </label>
                <input
                  id="cashier-name-input"
                  type="text"
                  placeholder="Contoh: Meja 1 (Sarah & Budi)"
                  value={formData.cashierName || ''}
                  onChange={(e) => setFormData({ ...formData, cashierName: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-stone-300 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                id="btn-save-event-settings"
                className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold transition-colors"
              >
                <Save className="w-4 h-4" />
                <span>Simpan Info Acara</span>
              </button>
            </div>
          </form>

          {/* Backup & Restore Section */}
          <div className="pt-4 border-t border-stone-200 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-stone-500">
              Backup & Pemulihan Data
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={handleBackup}
                id="btn-backup-data"
                className="flex items-center justify-center gap-2 p-3 rounded-xl border border-stone-300 bg-stone-50 hover:bg-stone-100 text-stone-800 text-xs font-semibold transition-colors"
              >
                <Download className="w-4 h-4 text-emerald-600" />
                <span>Download Backup JSON</span>
              </button>

              <label
                htmlFor="restore-file-input"
                className="flex items-center justify-center gap-2 p-3 rounded-xl border border-stone-300 bg-stone-50 hover:bg-stone-100 text-stone-800 text-xs font-semibold transition-colors cursor-pointer"
              >
                <Upload className="w-4 h-4 text-sky-600" />
                <span>Upload & Pulihkan JSON</span>
                <input
                  id="restore-file-input"
                  type="file"
                  accept=".json"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {/* Sample Data & Reset Section */}
          <div className="pt-4 border-t border-stone-200 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-stone-500">
              Kelola Database
            </h4>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  if (window.confirm('Muat ulang data simulasi contoh?')) {
                    onLoadSampleData();
                    onClose();
                  }
                }}
                className="px-3.5 py-2 rounded-xl border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-900 text-xs font-semibold"
              >
                Muat Data Contoh Simulasi
              </button>

              {!showResetConfirm ? (
                <button
                  type="button"
                  onClick={() => setShowResetConfirm(true)}
                  className="px-3.5 py-2 rounded-xl border border-rose-300 bg-rose-50 hover:bg-rose-100 text-rose-800 text-xs font-semibold ml-auto"
                >
                  Kosongkan Seluruh Data
                </button>
              ) : (
                <div className="w-full mt-2 p-3 rounded-xl bg-rose-50 border border-rose-300 text-xs space-y-2">
                  <div className="flex items-center gap-1.5 text-rose-800 font-bold">
                    <AlertTriangle className="w-4 h-4" />
                    <span>Peringatan: Tindakan ini menghapus semua catatan tamu!</span>
                  </div>
                  <p className="text-stone-600 text-[11px]">
                    Ketik kata <strong>RESET</strong> di bawah untuk mengonfirmasi pengosongan buku kas hajatan:
                  </p>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="Ketik RESET"
                      value={confirmResetText}
                      onChange={(e) => setConfirmResetText(e.target.value)}
                      className="px-3 py-1.5 rounded-lg border border-rose-300 text-xs uppercase"
                    />
                    <button
                      type="button"
                      disabled={confirmResetText !== 'RESET'}
                      onClick={() => {
                        onResetData();
                        setShowResetConfirm(false);
                        onClose();
                      }}
                      className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 disabled:opacity-40 text-white font-bold text-xs"
                    >
                      Konfirmasi Hapus
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowResetConfirm(false)}
                      className="px-2 py-1.5 text-stone-600 text-xs"
                    >
                      Batal
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
