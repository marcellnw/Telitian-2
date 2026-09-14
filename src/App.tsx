import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Header } from './components/Header';
import { BottomNavigation, MainTabType } from './components/BottomNavigation';
import { DashboardView } from './components/DashboardView';
import { InputForm, SubmitRecordPayload } from './components/InputForm';
import { DataTable } from './components/DataTable';
import { LaporanView } from './components/LaporanView';
import { EditModal } from './components/EditModal';
import { DeleteModal } from './components/DeleteModal';
import { LoginModal } from './components/LoginModal';
import { ResetModal } from './components/ResetModal';
import { SettingsModal } from './components/SettingsModal';
import { TentangModal } from './components/TentangModal';
import { GoogleScriptModal } from './components/GoogleScriptModal';
import { GoogleDriveSheetsModal } from './components/GoogleDriveSheetsModal';
import { FirebaseSyncModal } from './components/FirebaseSyncModal';
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
import {
  onFirebaseAuthStateChanged,
  getCurrentFirebaseUser,
  saveRecordToFirestore,
  deleteRecordFromFirestore,
  subscribeToFirestore,
  initAnonymousAuth,
  subscribeToCloudSheetsConfig,
  syncSpreadsheetWithFirestore,
  resetFirestoreRecords,
} from './lib/firebaseSync';
import { getSavedGasUrl, sendDirectToGas, setCloudGasUrlCache } from './lib/gasClient';
import { User as FirebaseUser } from 'firebase/auth';
import { getAdminHeaders } from './lib/adminAuth';
import { CheckCircle2, AlertCircle } from 'lucide-react';
import { getErrorMessage } from './lib/errorHelper';

export default function App() {
  const [activeTab, setActiveTab] = useState<MainTabType>('dashboard');
  const [records, setRecords] = useState<TelitianRecord[]>([]);
  const [isLoadingRecords, setIsLoadingRecords] = useState(true);

  // Connection & Offline State
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [pendingOfflineCount, setPendingOfflineCount] = useState<number>(() => {
    return getPendingOfflineRecords().length;
  });

  // Firebase Cloud & Multi-Device Realtime Sync State
  const [isFirebaseSyncModalOpen, setIsFirebaseSyncModalOpen] = useState(false);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(() => getCurrentFirebaseUser());
  const [isRealtimeActive, setIsRealtimeActive] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const val = localStorage.getItem('firebase_realtime_sync');
      return val === null ? true : val === 'true';
    }
    return true;
  });

  // Modals state
  const [editingRecord, setEditingRecord] = useState<TelitianRecord | null>(null);
  const [deletingRecord, setDeletingRecord] = useState<TelitianRecord | null>(null);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isTentangModalOpen, setIsTentangModalOpen] = useState(false);
  const [isGoogleScriptModalOpen, setIsGoogleScriptModalOpen] = useState(false);
  const [isGoogleDriveSheetsModalOpen, setIsGoogleDriveSheetsModalOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  // Toast notification state
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: unknown, type: 'success' | 'error' = 'success') => {
    const safeMessage = getErrorMessage(message, 'Operasi selesai');
    setToast({ message: safeMessage, type });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  // Synchronize pending offline records to server & Google Sheets
  const handleSyncOffline = useCallback(async () => {
    const pending = getPendingOfflineRecords();
    if (pending.length === 0) {
      showToast('Semua data sudah tersinkronisasi.', 'success');
      return { success: true };
    }

    try {
      const result = await syncPendingRecordsToServer();
      if (result.success) {
        clearPendingQueue();
        setPendingOfflineCount(0);
        showToast(getErrorMessage(result.message, 'Data offline berhasil disinkronkan!'), 'success');
        fetchRecords();
        return result;
      } else {
        showToast(getErrorMessage(result.message, 'Gagal menyinkronkan data. Periksa koneksi.'), 'error');
        return result;
      }
    } catch (e) {
      showToast(getErrorMessage(e, 'Gagal menyinkronkan data offline ke server.'), 'error');
      return { success: false };
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
      const pending = getPendingOfflineRecords();
      if (pending.length > 0) {
        handleSyncOffline();
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
      showToast('Koneksi terputus. Mode offline aktif (Data aman di HP).', 'error');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [handleSyncOffline]);

  useEffect(() => {
    // 1. Authenticate anonymously in the background so all devices have immediate Firestore access
    initAnonymousAuth().catch(() => {});

    // 2. Realtime listener to shared Google Sheets Cloud Config
    const unsubCloudConfig = subscribeToCloudSheetsConfig((cfg) => {
      if (cfg?.googleAppsScriptUrl) {
        setCloudGasUrlCache(cfg.googleAppsScriptUrl);
      }
    });

    fetchRecords();
    checkAuth();

    return () => {
      unsubCloudConfig();
    };
  }, []);

  // Listen to Firebase Auth state
  useEffect(() => {
    const unsubscribe = onFirebaseAuthStateChanged((user) => {
      setFirebaseUser(user);
    });
    return () => unsubscribe();
  }, []);

  // Listen to Firebase Realtime Sync across all devices and domains
  useEffect(() => {
    if (!isRealtimeActive) return;
    const unsubscribe = subscribeToFirestore((cloudRecords) => {
      if (cloudRecords && cloudRecords.length >= 0) {
        setRecords(cloudRecords);
        saveOfflineBackup(cloudRecords);
        setIsLoadingRecords(false);
      }
    });
    return () => unsubscribe();
  }, [isRealtimeActive]);

  // Sync with Google Spreadsheet across devices
  const handleSyncGoogleSheets = useCallback(async (silent = false) => {
    const gasUrl = getSavedGasUrl();
    if (!gasUrl) {
      if (!silent) {
        showToast('URL Google Apps Script belum diatur. Buka menu Backup & Excel.', 'error');
        setIsGoogleScriptModalOpen(true);
      }
      return;
    }

    try {
      const res = await syncSpreadsheetWithFirestore(gasUrl);
      if (res.success) {
        if (!silent) {
          showToast(res.message, 'success');
        }
      } else {
        if (!silent) {
          showToast(getErrorMessage(res.error, 'Gagal menyinkronkan dengan Google Sheets'), 'error');
        }
      }
    } catch (e) {
      if (!silent) {
        showToast(getErrorMessage(e, 'Gagal menyinkronkan dengan Google Sheets'), 'error');
      }
    }
  }, []);

  // Periodic automatic sync with Google Spreadsheet (every 30s when online, plus on window focus)
  useEffect(() => {
    if (!isOnline) return;

    const startupTimer = setTimeout(() => {
      handleSyncGoogleSheets(true);
    }, 2500);

    const interval = setInterval(() => {
      handleSyncGoogleSheets(true);
    }, 30000);

    const onFocus = () => {
      handleSyncGoogleSheets(true);
    };
    window.addEventListener('focus', onFocus);

    return () => {
      clearTimeout(startupTimer);
      clearInterval(interval);
      window.removeEventListener('focus', onFocus);
    };
  }, [isOnline, handleSyncGoogleSheets]);

  const handleToggleRealtime = (enabled: boolean) => {
    setIsRealtimeActive(enabled);
    localStorage.setItem('firebase_realtime_sync', enabled ? 'true' : 'false');
    showToast(
      enabled ? 'Real-time multi-device diaktifkan.' : 'Real-time multi-device dinonaktifkan.',
      'success'
    );
  };

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
  const handleCreateRecord = async (data: SubmitRecordPayload): Promise<boolean> => {
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

          // 1. Instantly save to Firestore (broadcasts to all connected devices in realtime)
          saveRecordToFirestore(result.record).catch((e) => console.warn('Firestore sync err:', e));

          // 2. Push direct to Google Sheets Web App
          const gasUrl = getSavedGasUrl();
          if (gasUrl) {
            sendDirectToGas('createData', { data: result.record }, gasUrl).catch(() => {});
          }

          showToast('Data berhasil disimpan!', 'success');
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

    // Save to Firestore & Sheets if online channel is working
    saveRecordToFirestore(offlineRecord).catch((e) => console.warn('Firestore sync err:', e));
    const gasUrl = getSavedGasUrl();
    if (gasUrl && navigator.onLine) {
      sendDirectToGas('createData', { data: offlineRecord }, gasUrl).catch(() => {});
    }

    setPendingOfflineCount(getPendingOfflineRecords().length);
    showToast('Offline: Data tersimpan aman di HP & siap disinkronkan!', 'success');
    return true;
  };

  // Update existing record
  const handleUpdateRecord = async (
    id: string,
    updatedData: {
      name: string;
      address: string;
      amount: number;
      jenisTelitian?: string;
      kategoriTamu?: string;
      rincianBarang?: string;
      petugas?: string;
      statusValidasi?: string;
    }
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
      let result: any = null;
      try {
        result = await res.json();
      } catch (_) {
        result = null;
      }

      if (res.status === 401 || res.status === 403 || result?.requireLogin) {
        setIsAdmin(false);
        setIsLoginModalOpen(true);
        showToast(getErrorMessage(result?.error || 'Akses ditolak: Silakan masukkan sandi admin.'), 'error');
        return false;
      }

      if (result?.success) {
        const updated = records.map((r) =>
          r.id === id
            ? {
                ...r,
                ...updatedData,
                updatedAt: new Date().toISOString(),
              }
            : r
        );
        setRecords(updated);
        saveOfflineBackup(updated);

        const match = updated.find((r) => r.id === id);
        if (match) {
          saveRecordToFirestore(match).catch((e) => console.warn('Firestore err:', e));
          const gasUrl = getSavedGasUrl();
          if (gasUrl && navigator.onLine) {
            sendDirectToGas('updateData', { data: match }, gasUrl).catch(() => {});
          }
        }
        showToast(getErrorMessage(result?.message || 'Data berhasil diperbarui.'), 'success');
        return true;
      }
      showToast(getErrorMessage(result?.error || 'Gagal memperbarui data.'), 'error');
      return false;
    } catch (err) {
      // Offline fallback: update in local state
      const updated = records.map((r) =>
        r.id === id
          ? {
              ...r,
              ...updatedData,
              updatedAt: new Date().toISOString(),
            }
          : r
      );
      setRecords(updated);
      saveOfflineBackup(updated);

      const match = updated.find((r) => r.id === id);
      if (match) {
        saveRecordToFirestore(match).catch((e) => console.warn('Firestore err:', e));
        const gasUrl = getSavedGasUrl();
        if (gasUrl && navigator.onLine) {
          sendDirectToGas('updateData', { data: match }, gasUrl).catch(() => {});
        }
      }
      showToast('Perubahan tersimpan di perangkat (Mode Offline).', 'success');
      return true;
    }
  };

  // Delete record
  const handleDeleteRecord = async (id: string): Promise<boolean> => {
    const targetToDelete = records.find((r) => r.id === id);
    try {
      const res = await fetch(`/api/records/${id}`, {
        method: 'DELETE',
        headers: {
          ...getAdminHeaders(),
        },
        credentials: 'include',
      });
      let result: any = null;
      try {
        result = await res.json();
      } catch (_) {
        result = null;
      }

      if (res.status === 401 || res.status === 403 || result?.requireLogin) {
        setIsAdmin(false);
        setIsLoginModalOpen(true);
        showToast(getErrorMessage(result?.error || 'Akses ditolak: Silakan masukkan sandi admin.'), 'error');
        return false;
      }

      const filtered = records.filter((r) => r.id !== id);
      const reindexed = filtered.map((r, idx) => ({ ...r, no: idx + 1 }));
      setRecords(reindexed);
      saveOfflineBackup(reindexed);

      // Broadcast delete to Firestore (all devices sync immediately)
      deleteRecordFromFirestore(id, targetToDelete).catch((e) => console.warn('Firestore del err:', e));
      const gasUrl = getSavedGasUrl();
      if (gasUrl && navigator.onLine) {
        sendDirectToGas('deleteData', { id }, gasUrl).catch(() => {});
      }

      showToast(getErrorMessage(result?.message || 'Data berhasil dihapus.'), 'success');
      return true;
    } catch (err) {
      // Offline fallback
      const filtered = records.filter((r) => r.id !== id);
      const reindexed = filtered.map((r, idx) => ({ ...r, no: idx + 1 }));
      setRecords(reindexed);
      saveOfflineBackup(reindexed);

      deleteRecordFromFirestore(id, targetToDelete).catch((e) => console.warn('Firestore del err:', e));
      const gasUrl = getSavedGasUrl();
      if (gasUrl && navigator.onLine) {
        sendDirectToGas('deleteData', { id }, gasUrl).catch(() => {});
      }

      showToast('Data dihapus dari memori HP (Mode Offline).', 'success');
      return true;
    }
  };

  // Export Excel (.xlsx)
  const handleExportExcel = () => {
    if (records.length === 0) {
      showToast('Belum ada data untuk diexport. Data masih 0.', 'error');
      return;
    }

    try {
      exportToExcel(records, stats.totalUang);
      showToast('File Excel (.xlsx) berhasil diunduh!', 'success');
    } catch (err: any) {
      showToast('Gagal mengunduh Excel: ' + (err?.message || 'Terjadi kesalahan'), 'error');
    }
  };

  // Export Word (.docx)
  const handleExportWord = () => {
    if (records.length === 0) {
      showToast('Belum ada data untuk diexport. Data masih 0.', 'error');
      return;
    }
    exportToWord(records, stats.totalUang);
  };

  // Print
  const handlePrint = () => {
    window.print();
  };

  // Restore JSON
  const handleRestoreLocalJson = async (restored: TelitianRecord[]) => {
    if (!isAdmin) {
      setIsLoginModalOpen(true);
      showToast('Akses ditolak: Login admin terlebih dahulu.', 'error');
      return;
    }

    try {
      const res = await fetch('/api/records/restore-json', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ records: restored }),
      });
      const resData = await res.json();
      if (resData.success) {
        setRecords(restored);
        saveOfflineBackup(restored);
        showToast(`Berhasil memulihkan ${restored.length} data telitian.`, 'success');
        fetchRecords();
      } else {
        showToast('Gagal memulihkan database: ' + (resData.error || ''), 'error');
      }
    } catch (err) {
      showToast('Gagal terhubung ke server.', 'error');
    }
  };

  // Reset database callback
  const handleResetComplete = () => {
    setRecords([]);
    clearPendingQueue();
    clearOfflineBackup();
    setPendingOfflineCount(0);

    // Reset Firestore & Google Apps Script
    resetFirestoreRecords('Reset database oleh Admin').catch(() => {});
    const gasUrl = getSavedGasUrl();
    if (gasUrl && navigator.onLine) {
      sendDirectToGas('resetData', {}, gasUrl).catch(() => {});
    }

    showToast('Database berhasil direset ke 0 di semua perangkat dan cloud.', 'success');
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

  return (
    <div className="min-h-screen w-full max-w-full overflow-x-hidden bg-slate-50 text-slate-900 selection:bg-[#6D4AFF] selection:text-white flex flex-col">
      {/* 1. HEADER: Sticky di atas, Tinggi 56–64 px, Background putih, Menu titik tiga di kanan */}
      <Header
        onRefreshData={fetchRecords}
        onGoToBackup={() => setActiveTab('laporan')}
        onGoToLaporan={() => setActiveTab('laporan')}
        onOpenSettings={() => setIsSettingsModalOpen(true)}
        onOpenTentang={() => setIsTentangModalOpen(true)}
        onOpenGoogleDriveSheets={() => setIsGoogleDriveSheetsModalOpen(true)}
        onOpenFirebaseSync={() => setIsFirebaseSyncModalOpen(true)}
        onSyncGoogleSheets={() => handleSyncGoogleSheets(false)}
        firebaseUser={firebaseUser}
        isRealtimeActive={isRealtimeActive}
        isOnline={isOnline}
        isAdmin={isAdmin}
        onOpenLogin={() => setIsLoginModalOpen(true)}
        onLogout={handleLogout}
        pendingOfflineCount={pendingOfflineCount}
        onSyncOffline={handleSyncOffline}
      />

      {/* 2. MAIN CONTENT: Mobile-first container, max-w-[480px] on mobile, responsive to desktop */}
      <main className="flex-1 w-full max-w-[480px] md:max-w-2xl lg:max-w-3xl mx-auto px-3 sm:px-4 pt-3.5 pb-24 sm:pb-28">
        {activeTab === 'dashboard' && (
          <DashboardView
            records={records}
            totalData={stats.totalData}
            totalUang={stats.totalUang}
            onGoToInput={() => setActiveTab('pendataan')}
            onGoToData={() => setActiveTab('data')}
          />
        )}

        {activeTab === 'pendataan' && (
          <InputForm
            existingRecords={records}
            onSubmitRecord={handleCreateRecord}
            isOnline={isOnline}
            onSuccessNavigateToData={() => setActiveTab('data')}
          />
        )}

        {activeTab === 'data' && (
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
            onGoToBackup={() => setActiveTab('laporan')}
            onScrollToForm={() => setActiveTab('pendataan')}
            onOpenReset={() => setIsResetModalOpen(true)}
          />
        )}

        {activeTab === 'laporan' && (
          <LaporanView
            records={records}
            totalData={stats.totalData}
            totalUang={stats.totalUang}
            onPrint={handlePrint}
            onSyncGas={handleSyncOffline}
            onRestoreData={handleRestoreLocalJson}
            onOpenReset={() => setIsResetModalOpen(true)}
            isAdmin={isAdmin}
            onOpenGoogleDriveSheets={() => setIsGoogleDriveSheetsModalOpen(true)}
            onOpenFirebaseSync={() => setIsFirebaseSyncModalOpen(true)}
            firebaseUser={firebaseUser}
          />
        )}
      </main>

      {/* 3. BOTTOM NAVIGATION: Fixed di bawah, Tinggi 64–72 px, 4 menu utama (Dashboard, Data, + Tambah, Laporan) */}
      <BottomNavigation
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />

      {/* Floating Toast Notification */}
      {toast && (
        <div className="fixed bottom-20 left-4 right-4 sm:left-auto sm:right-6 max-w-sm z-50 flex items-center gap-2.5 px-4 py-2.5 rounded-2xl bg-slate-900 text-white shadow-xl animate-fade-in">
          {toast.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
          )}
          <span className="text-xs sm:text-sm font-semibold tracking-wide break-words">{getErrorMessage(toast.message)}</span>
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

      <ResetModal
        isOpen={isResetModalOpen}
        onClose={() => setIsResetModalOpen(false)}
        onResetSuccess={handleResetComplete}
        currentTotalData={stats.totalData}
      />

      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        isAdmin={isAdmin}
        onOpenLogin={() => setIsLoginModalOpen(true)}
        onLogout={handleLogout}
        onOpenReset={() => setIsResetModalOpen(true)}
        onOpenGoogleScriptHelp={() => setIsGoogleScriptModalOpen(true)}
        onOpenFirebaseSync={() => setIsFirebaseSyncModalOpen(true)}
      />

      <TentangModal
        isOpen={isTentangModalOpen}
        onClose={() => setIsTentangModalOpen(false)}
      />

      <GoogleScriptModal
        isOpen={isGoogleScriptModalOpen}
        onClose={() => setIsGoogleScriptModalOpen(false)}
      />

      <GoogleDriveSheetsModal
        isOpen={isGoogleDriveSheetsModalOpen}
        onClose={() => setIsGoogleDriveSheetsModalOpen(false)}
        records={records}
        totalUang={stats.totalUang}
      />

      <FirebaseSyncModal
        isOpen={isFirebaseSyncModalOpen}
        onClose={() => setIsFirebaseSyncModalOpen(false)}
        localRecords={records}
        onRecordsUpdated={(newRecords) => {
          setRecords(newRecords);
          saveOfflineBackup(newRecords);
        }}
        isRealtimeActive={isRealtimeActive}
        onToggleRealtime={handleToggleRealtime}
        currentUser={firebaseUser}
        onUserChanged={(user) => setFirebaseUser(user)}
      />
    </div>
  );
}
