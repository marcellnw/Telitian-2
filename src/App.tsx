import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Navbar } from './components/Navbar';
import { Header } from './components/Header';
import { StatsCards } from './components/StatsCards';
import { InputForm } from './components/InputForm';
import { DataTable } from './components/DataTable';
import { EditModal } from './components/EditModal';
import { DeleteModal } from './components/DeleteModal';
import { LoginModal } from './components/LoginModal';
import { ResetModal } from './components/ResetModal';
import { BackupView } from './components/BackupView';
import { TelitianRecord } from './types/record';
import { exportToExcel, exportToWord } from './lib/export';
import {
  saveOfflineBackup,
  loadOfflineBackup,
  loadOfflineBackupWithIndexedDB,
  queueOfflineRecord,
  getPendingOfflineRecords,
  clearPendingQueue,
  syncPendingRecordsToServer,
  clearOfflineBackup,
  createOfflineRecord,
} from './lib/offlineSync';
import { getAdminHeaders } from './lib/adminAuth';
import { CheckCircle2, AlertCircle } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'pendataan' | 'data' | 'backup'>('dashboard');
  const [records, setRecords] = useState<TelitianRecord[]>([]);
  const [isLoadingRecords, setIsLoadingRecords] = useState(true);

  // Connection & Offline State
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [pendingOfflineCount, setPendingOfflineCount] = useState<number>(() => {
    return getPendingOfflineRecords().length;
  });

  // Modals state
  const [editingRecord, setEditingRecord] = useState<TelitianRecord | null>(null);
  const [deletingRecord, setDeletingRecord] = useState<TelitianRecord | null>(null);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  // Toast notification state
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  // Synchronize pending offline records to server
  const handleSyncOffline = useCallback(async () => {
    const pending = getPendingOfflineRecords();
    if (pending.length === 0) {
      showToast('Semua data sudah tersinkronisasi.', 'success');
      return;
    }

    try {
      const result = await syncPendingRecordsToServer();
      if (result.success) {
        clearPendingQueue();
        setPendingOfflineCount(0);
        showToast(result.message || 'Data offline berhasil disinkronkan!', 'success');
        // Refresh full record list from server
        fetchRecords();
      } else {
        showToast('Gagal menyinkronkan: ' + (result.message || 'Periksa koneksi'), 'error');
      }
    } catch (e) {
      showToast('Gagal menyinkronkan data offline ke server.', 'error');
    }
  }, []);

  // 1. Fetch records from backend with IndexedDB & localStorage offline fallback
  const fetchRecords = async () => {
    try {
      const res = await fetch('/api/records');
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setRecords(data.data);
        saveOfflineBackup(data.data);
        return;
      }
    } catch (err) {
      console.warn('Network error, loading from local offline backup:', err);
    } finally {
      setIsLoadingRecords(false);
    }

    try {
      const cached = await loadOfflineBackupWithIndexedDB();
      if (cached && cached.length > 0) {
        setRecords(cached);
      }
    } catch (dbErr) {
      const localCached = loadOfflineBackup();
      if (localCached && localCached.length > 0) {
        setRecords(localCached);
      }
    }
  };

  // 2. Check admin auth status
  const checkAuth = async () => {
    try {
      const res = await fetch('/api/auth/me');
      const data = await res.json();
      setIsAdmin(!!data.authenticated);
    } catch (e) {
      // Ignored
    }
  };

  // Online / Offline event listeners
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      showToast('Koneksi internet terhubung kembali.', 'success');
      // Auto-sync if there are pending offline records
      const pending = getPendingOfflineRecords();
      if (pending.length > 0) {
        handleSyncOffline();
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
      showToast('Koneksi terputus. Mode offline aktif (Data tetap tersimpan aman).', 'error');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [handleSyncOffline]);

  useEffect(() => {
    fetchRecords();
    checkAuth();
  }, []);

  // Continuously save to offline backup whenever records update
  useEffect(() => {
    if (records.length > 0) {
      saveOfflineBackup(records);
    }
  }, [records]);

  // Overall Statistics calculated from ENTIRE database
  const stats = useMemo(() => {
    const totalData = records.length;
    let totalUang = 0;
    let lastInputTime = '-';

    for (const r of records) {
      totalUang += r.amount || 0;
    }

    if (records.length > 0) {
      const latest = records[records.length - 1];
      lastInputTime = latest.timeInput || latest.dateInput || '-';
    }

    return {
      totalData,
      totalUang,
      lastInputTime,
    };
  }, [records]);

  // Create new record with offline resilience
  const handleCreateRecord = async (data: { name: string; address: string; amount: number }): Promise<boolean> => {
    // If online, try server POST
    if (navigator.onLine) {
      try {
        const res = await fetch('/api/records', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
        const result = await res.json();

        if (result.success && result.record) {
          const updated = [...records, result.record];
          setRecords(updated);
          saveOfflineBackup(updated);
          showToast('Data berhasil disimpan dan masuk ke Excel realtime.', 'success');
          return true;
        }
      } catch (err) {
        console.warn('Server unreachable, saving to offline queue instead:', err);
      }
    }

    // Offline fallback: save locally immediately so user data is NEVER lost
    const offlineRecord = createOfflineRecord(data, records.length);

    queueOfflineRecord(offlineRecord);
    const updated = [...records, offlineRecord];
    setRecords(updated);
    saveOfflineBackup(updated);
    setPendingOfflineCount(getPendingOfflineRecords().length);
    showToast('Offline: Data tersimpan aman di HP/Laptop & siap disinkronkan!', 'success');
    return true;
  };

  // Update existing record (Rubah Data)
  const handleUpdateRecord = async (
    id: string,
    updatedData: { name: string; address: string; amount: number }
  ): Promise<boolean> => {
    try {
      const res = await fetch(`/api/records/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...getAdminHeaders(),
        },
        credentials: 'include',
        body: JSON.stringify(updatedData),
      });
      const result = await res.json();

      if (res.status === 401 || res.status === 403 || result.requireLogin) {
        setIsAdmin(false);
        setIsLoginModalOpen(true);
        showToast(result.error || 'Akses ditolak: Silakan masukkan sandi admin.', 'error');
        return false;
      }

      if (result.success) {
        const updated = records.map((r) =>
          r.id === id
            ? {
                ...r,
                name: updatedData.name,
                address: updatedData.address,
                amount: updatedData.amount,
                updatedAt: new Date().toISOString(),
              }
            : r
        );
        setRecords(updated);
        saveOfflineBackup(updated);
        showToast(result.message || 'Data berhasil diperbarui.', 'success');
        return true;
      }
      showToast(result.error || 'Gagal memperbarui data.', 'error');
      return false;
    } catch (err) {
      // Offline fallback: langsung perbarui di memori lokal agar tugas operator tidak terhambat
      const updated = records.map((r) =>
        r.id === id
          ? {
              ...r,
              name: updatedData.name,
              address: updatedData.address,
              amount: updatedData.amount,
              updatedAt: new Date().toISOString(),
            }
          : r
      );
      setRecords(updated);
      saveOfflineBackup(updated);
      showToast('Perubahan tersimpan di perangkat (Mode Offline).', 'success');
      return true;
    }
  };

  // Delete record (Soft delete / Hapus Data)
  const handleDeleteRecord = async (id: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/records/${id}`, {
        method: 'DELETE',
        headers: {
          ...getAdminHeaders(),
        },
        credentials: 'include',
      });
      const result = await res.json();

      if (res.status === 401 || res.status === 403 || result.requireLogin) {
        setIsAdmin(false);
        setIsLoginModalOpen(true);
        showToast(result.error || 'Akses ditolak: Silakan masukkan sandi admin.', 'error');
        return false;
      }

      if (result.success) {
        const filtered = records.filter((r) => r.id !== id);
        const reindexed = filtered.map((r, idx) => ({ ...r, no: idx + 1 }));
        setRecords(reindexed);
        saveOfflineBackup(reindexed);
        showToast(result.message || 'Data berhasil dihapus.', 'success');
        return true;
      }
      showToast(result.error || 'Gagal menghapus data.', 'error');
      return false;
    } catch (err) {
      // Offline fallback: hapus dari memori lokal
      const filtered = records.filter((r) => r.id !== id);
      const reindexed = filtered.map((r, idx) => ({ ...r, no: idx + 1 }));
      setRecords(reindexed);
      saveOfflineBackup(reindexed);
      showToast('Data dihapus dari memori perangkat (Mode Offline).', 'success');
      return true;
    }
  };

  // Realtime Excel Export (.xlsx) - Reliable client-side direct download
  const handleExportExcel = () => {
    if (records.length === 0) {
      showToast('Belum ada data untuk diexport. Data saat ini masih 0.', 'error');
      return;
    }

    try {
      exportToExcel(records, stats.totalUang);
      showToast('File Excel (.xlsx) berhasil diunduh!', 'success');
    } catch (err: any) {
      console.error('Export Excel failed:', err);
      showToast('Gagal mengunduh Excel: ' + (err?.message || 'Terjadi kesalahan'), 'error');
    }
  };

  // Export Word (.docx)
  const handleExportWord = () => {
    if (records.length === 0) {
      alert('Belum ada data untuk diexport. Data saat ini masih 0.');
      return;
    }
    exportToWord(records, stats.totalUang);
  };

  // Print
  const handlePrint = () => {
    window.print();
  };

  // Restore JSON (Khusus Admin)
  const handleRestoreLocalJson = async (restored: TelitianRecord[]) => {
    if (!isAdmin) {
      setIsLoginModalOpen(true);
      showToast('Akses ditolak: Login admin terlebih dahulu untuk memulihkan database.', 'error');
      return;
    }

    showToast(`Memulihkan ${restored.length} data...`, 'success');

    try {
      const res = await fetch('/api/records/restore-json', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ records: restored }),
      });
      const resData = await res.json();
      if (res.status === 401 || res.status === 403 || resData.requireLogin) {
        setIsAdmin(false);
        setIsLoginModalOpen(true);
        showToast(resData.error || 'Akses ditolak: Silakan login admin.', 'error');
        return;
      }

      if (resData.success) {
        setRecords(restored);
        saveOfflineBackup(restored);
        showToast(resData.message || `Berhasil memulihkan ${restored.length} data ke database & Sheets!`, 'success');
        fetchRecords();
      } else {
        showToast('Gagal memulihkan database: ' + (resData.error || ''), 'error');
      }
    } catch (err) {
      showToast('Gagal terhubung ke server saat memulihkan database.', 'error');
    }
  };

  // Reset database callback
  const handleResetComplete = () => {
    setRecords([]);
    clearPendingQueue();
    clearOfflineBackup();
    setPendingOfflineCount(0);
    showToast('Database berhasil direset ke 0. File arsip telah diamankan di server.', 'success');
  };

  // Logout Admin
  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      setIsAdmin(false);
      showToast('Berhasil keluar admin.', 'success');
    } catch (e) {
      setIsAdmin(false);
    }
  };

  const handleScrollToForm = () => {
    setActiveTab('pendataan');
    setTimeout(() => {
      const el = document.getElementById('input-telitian-section');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
        document.getElementById('field-nama')?.focus();
      }
    }, 100);
  };

  return (
    <div className="min-h-screen w-full max-w-full overflow-x-hidden bg-slate-50 text-slate-900 selection:bg-violet-800 selection:text-white pb-24 md:pb-16">
      {/* Formal Top Accent Line */}
      <div className="h-1 w-full bg-gradient-to-r from-slate-900 via-violet-800 to-indigo-900" />

      {/* Navigation Bar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isAdmin={isAdmin}
        onOpenLogin={() => setIsLoginModalOpen(true)}
        onLogout={handleLogout}
        isOnline={isOnline}
        pendingOfflineCount={pendingOfflineCount}
        onSyncOffline={handleSyncOffline}
        onOpenReset={() => setIsResetModalOpen(true)}
        onExportExcel={handleExportExcel}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        {/* Event Header Banner */}
        <Header
          onScrollToForm={handleScrollToForm}
          onExportExcel={handleExportExcel}
          onPrint={handlePrint}
          isOnline={isOnline}
          totalData={stats.totalData}
          totalUang={stats.totalUang}
        />

        {/* 3 Stats Cards: Total Data, Total Uang, Input Terakhir */}
        <StatsCards
          totalData={stats.totalData}
          totalUang={stats.totalUang}
          lastInputTime={stats.lastInputTime}
          onExportExcel={handleExportExcel}
          isOnline={isOnline}
        />

        {/* View Selection */}
        {activeTab === 'dashboard' && (
          <div className="space-y-8 animate-fade-in">
            {/* Input Form */}
            <InputForm
              existingRecords={records}
              onSubmitRecord={handleCreateRecord}
              isOnline={isOnline}
            />

            {/* Data Table */}
            <DataTable
              records={records}
              allRecordsTotalUang={stats.totalUang}
              allRecordsCount={stats.totalData}
              onEdit={(r) => setEditingRecord(r)}
              onDelete={(r) => setDeletingRecord(r)}
              onExportExcel={handleExportExcel}
              onExportWord={handleExportWord}
              onPrint={handlePrint}
              onGoToBackup={() => setActiveTab('backup')}
              onScrollToForm={handleScrollToForm}
              onOpenReset={() => setIsResetModalOpen(true)}
            />
          </div>
        )}

        {activeTab === 'pendataan' && (
          <div className="animate-fade-in">
            <InputForm
              existingRecords={records}
              onSubmitRecord={handleCreateRecord}
              isOnline={isOnline}
            />
          </div>
        )}

        {activeTab === 'data' && (
          <div className="animate-fade-in">
            <DataTable
              records={records}
              allRecordsTotalUang={stats.totalUang}
              allRecordsCount={stats.totalData}
              isAdmin={isAdmin}
              onOpenLogin={() => setIsLoginModalOpen(true)}
              onEdit={(r) => setEditingRecord(r)}
              onDelete={(r) => setDeletingRecord(r)}
              onExportExcel={handleExportExcel}
              onExportWord={handleExportWord}
              onPrint={handlePrint}
              onGoToBackup={() => setActiveTab('backup')}
              onScrollToForm={handleScrollToForm}
              onOpenReset={() => setIsResetModalOpen(true)}
            />
          </div>
        )}

        {activeTab === 'backup' && (
          <div className="animate-fade-in">
            <BackupView
              records={records}
              totalUang={stats.totalUang}
              isAdmin={isAdmin}
              onOpenLogin={() => setIsLoginModalOpen(true)}
              onRestoreLocalJson={handleRestoreLocalJson}
              onExportExcel={handleExportExcel}
              onOpenReset={() => setIsResetModalOpen(true)}
              isOnline={isOnline}
              pendingOfflineCount={pendingOfflineCount}
              onSyncOffline={handleSyncOffline}
            />
          </div>
        )}
      </main>

      {/* Floating Toast Notification */}
      {toast && (
        <div className="fixed bottom-20 md:bottom-6 left-4 right-4 sm:left-auto sm:right-6 max-w-sm z-50 flex items-center gap-2.5 px-4 sm:px-5 py-2.5 sm:py-3 rounded-2xl bg-white border border-slate-300 text-slate-900 shadow-xl animate-fade-in toast-container">
          {toast.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          )}
          <span className="text-xs sm:text-sm font-bold tracking-wide break-words">{toast.message}</span>
        </div>
      )}

      {/* Modals */}
      <EditModal
        record={editingRecord}
        isOpen={!!editingRecord}
        onClose={() => setEditingRecord(null)}
        onSave={handleUpdateRecord}
      />

      <DeleteModal
        record={deletingRecord}
        isOpen={!!deletingRecord}
        onClose={() => setDeletingRecord(null)}
        onConfirmDelete={handleDeleteRecord}
      />

      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        onLoginSuccess={() => {
          setIsAdmin(true);
          showToast('Login admin berhasil!', 'success');
        }}
      />

      {/* Reset Confirmation Modal */}
      <ResetModal
        isOpen={isResetModalOpen}
        onClose={() => setIsResetModalOpen(false)}
        onResetSuccess={handleResetComplete}
        currentTotalData={stats.totalData}
      />
    </div>
  );
}
