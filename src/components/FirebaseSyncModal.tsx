import React, { useState, useEffect } from 'react';
import {
  X,
  Cloud,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  LogIn,
  LogOut,
  UploadCloud,
  DownloadCloud,
  ShieldCheck,
  Globe,
  Copy,
  Check,
  Radio,
  User as UserIcon,
  Loader2,
  Mail,
  KeyRound,
  ExternalLink,
  FileSpreadsheet,
} from 'lucide-react';
import { User } from 'firebase/auth';
import {
  getCurrentFirebaseUser,
  signInGooglePopup,
  signInEmailPassword,
  registerEmailPassword,
  signOutFirebase,
  syncTwoWayWithFirestore,
  fetchFirestoreRecords,
  syncSpreadsheetWithFirestore,
  fetchCloudSheetsConfig,
  saveCloudSheetsConfig,
} from '../lib/firebaseSync';
import { getSavedGasUrl } from '../lib/gasClient';
import { firebaseConfig } from '../lib/firebaseClient';
import { TelitianRecord } from '../types/record';
import { getErrorMessage } from '../lib/errorHelper';

interface FirebaseSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  localRecords: TelitianRecord[];
  onRecordsUpdated: (newRecords: TelitianRecord[]) => void;
  isRealtimeActive: boolean;
  onToggleRealtime: (enabled: boolean) => void;
  currentUser: User | null;
  onUserChanged: (user: User | null) => void;
}

export const FirebaseSyncModal: React.FC<FirebaseSyncModalProps> = ({
  isOpen,
  onClose,
  localRecords,
  onRecordsUpdated,
  isRealtimeActive,
  onToggleRealtime,
  currentUser,
  onUserChanged,
}) => {
  const [authMode, setAuthMode] = useState<'google' | 'email_login' | 'email_register'>('google');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoadingAuth, setIsLoadingAuth] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isSyncingSheets, setIsSyncingSheets] = useState(false);
  const [gasUrlInput, setGasUrlInput] = useState(() => getSavedGasUrl());
  const [isSavingGasUrl, setIsSavingGasUrl] = useState(false);
  const [cloudRecordCount, setCloudRecordCount] = useState<number | null>(null);
  const [statusMessage, setStatusMessage] = useState<{
    type: 'success' | 'error' | 'info';
    text: string;
  } | null>(null);
  const [copiedDomain, setCopiedDomain] = useState(false);

  // Check cloud record count & sheets config when opened
  useEffect(() => {
    if (isOpen) {
      loadCloudCount();
      fetchCloudSheetsConfig().then((cfg) => {
        if (cfg?.googleAppsScriptUrl && !gasUrlInput) {
          setGasUrlInput(cfg.googleAppsScriptUrl);
        }
      });
    }
  }, [isOpen]);

  const loadCloudCount = async () => {
    try {
      const items = await fetchFirestoreRecords();
      setCloudRecordCount(items.length);
    } catch (e) {
      // Ignored if permissions not yet granted
    }
  };

  if (!isOpen) return null;

  const currentDomain = typeof window !== 'undefined' ? window.location.hostname : 'localhost';

  const handleCopyDomain = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(currentDomain);
      setCopiedDomain(true);
      setTimeout(() => setCopiedDomain(false), 2000);
    }
  };

  const handleGoogleLogin = async () => {
    setIsLoadingAuth(true);
    setStatusMessage(null);
    try {
      const res = await signInGooglePopup();
      onUserChanged(res.user);
      setStatusMessage({ type: 'success', text: res.message });
      // Trigger count check
      setTimeout(() => loadCloudCount(), 500);
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: getErrorMessage(err) });
    } finally {
      setIsLoadingAuth(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setStatusMessage({ type: 'error', text: 'Email dan password harus diisi.' });
      return;
    }

    setIsLoadingAuth(true);
    setStatusMessage(null);
    try {
      if (authMode === 'email_login') {
        const res = await signInEmailPassword(email, password);
        onUserChanged(res.user);
        setStatusMessage({ type: 'success', text: res.message });
      } else {
        const res = await registerEmailPassword(email, password);
        onUserChanged(res.user);
        setStatusMessage({ type: 'success', text: res.message });
      }
      setTimeout(() => loadCloudCount(), 500);
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: getErrorMessage(err) });
    } finally {
      setIsLoadingAuth(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOutFirebase();
      onUserChanged(null);
      setCloudRecordCount(null);
      setStatusMessage({ type: 'info', text: 'Berhasil keluar dari akun Firebase.' });
    } catch (err) {
      setStatusMessage({ type: 'error', text: getErrorMessage(err) });
    }
  };

  const handleSyncNow = async () => {
    setIsSyncing(true);
    setStatusMessage(null);
    try {
      const res = await syncTwoWayWithFirestore(localRecords);
      if (res.success) {
        onRecordsUpdated(res.mergedRecords);
        setCloudRecordCount(res.mergedRecords.length);
        setStatusMessage({
          type: 'success',
          text: res.message,
        });
      } else {
        setStatusMessage({
          type: 'error',
          text: res.message,
        });
      }
    } catch (err) {
      setStatusMessage({ type: 'error', text: getErrorMessage(err) });
    } finally {
      setIsSyncing(false);
    }
  };

  const handlePullCloudOnly = async () => {
    setIsSyncing(true);
    setStatusMessage(null);
    try {
      const items = await fetchFirestoreRecords();
      if (items && items.length > 0) {
        onRecordsUpdated(items);
        setCloudRecordCount(items.length);
        setStatusMessage({
          type: 'success',
          text: `Berhasil mengunduh ${items.length} data dari Firebase Cloud.`,
        });
      } else {
        setStatusMessage({
          type: 'info',
          text: 'Database Firebase Cloud masih kosong. Lakukan sinkronisasi untuk mengunggah data lokal.',
        });
      }
    } catch (err) {
      setStatusMessage({ type: 'error', text: getErrorMessage(err) });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSyncSpreadsheetNow = async () => {
    setIsSyncingSheets(true);
    setStatusMessage(null);
    try {
      const res = await syncSpreadsheetWithFirestore(gasUrlInput);
      if (res.success) {
        setStatusMessage({
          type: 'success',
          text: res.message,
        });
        loadCloudCount();
      } else {
        setStatusMessage({
          type: 'error',
          text: res.error || 'Gagal menyinkronkan dengan Google Sheets.',
        });
      }
    } catch (err) {
      setStatusMessage({ type: 'error', text: getErrorMessage(err) });
    } finally {
      setIsSyncingSheets(false);
    }
  };

  const handleSaveGasUrl = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingGasUrl(true);
    try {
      const cleanUrl = gasUrlInput.trim();
      await saveCloudSheetsConfig({ googleAppsScriptUrl: cleanUrl });
      setStatusMessage({
        type: 'success',
        text: 'URL Web App tersimpan di Cloud dan otomatis aktif di semua perangkat!',
      });
    } catch (err) {
      setStatusMessage({ type: 'error', text: getErrorMessage(err) });
    } finally {
      setIsSavingGasUrl(false);
    }
  };

  return (
    <div
      id="firebase-sync-modal-backdrop"
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        id="firebase-sync-modal-card"
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl max-h-[92vh] overflow-y-auto flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-gradient-to-r from-amber-500/10 via-amber-600/5 to-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-md shadow-amber-500/20">
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
                Firebase & Vercel Cloud Sync
                <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300">
                  Online Sync
                </span>
              </h3>
              <p className="text-xs text-slate-500">
                Penyimpanan cloud Firestore & sinkronisasi multi-perangkat
              </p>
            </div>
          </div>
          <button
            id="close-firebase-sync-modal-btn"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-5 space-y-5">
          {/* Status Message Alert */}
          {statusMessage && (
            <div
              className={`p-3.5 rounded-xl border text-xs sm:text-sm flex items-start gap-2.5 transition animate-fade-in ${
                statusMessage.type === 'success'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : statusMessage.type === 'error'
                  ? 'bg-rose-50 border-rose-200 text-rose-800'
                  : 'bg-sky-50 border-sky-200 text-sky-800'
              }`}
            >
              {statusMessage.type === 'success' ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              ) : statusMessage.type === 'error' ? (
                <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
              ) : (
                <Radio className="w-5 h-5 text-sky-600 shrink-0" />
              )}
              <span className="font-medium break-words leading-relaxed">{statusMessage.text}</span>
            </div>
          )}

          {/* User Account / Login Section */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/80">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Status Akun & Izin Operator
              </span>
              {currentUser ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  Terotentikasi
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-300">
                  <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                  Belum Login
                </span>
              )}
            </div>

            {currentUser ? (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-white rounded-xl border border-slate-200">
                <div className="flex items-center gap-3">
                  {currentUser.photoURL ? (
                    <img
                      src={currentUser.photoURL}
                      alt="User avatar"
                      className="w-10 h-10 rounded-full border border-slate-200 object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-amber-500 text-white flex items-center justify-center font-bold">
                      {(currentUser.displayName || currentUser.email || 'U')[0].toUpperCase()}
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-bold text-slate-800">
                      {currentUser.displayName || 'Operator Telitian'}
                    </p>
                    <p className="text-xs text-slate-500 font-mono">{currentUser.email}</p>
                  </div>
                </div>
                <button
                  id="firebase-logout-btn"
                  onClick={handleLogout}
                  className="flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 rounded-lg transition"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Keluar
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex gap-2 border-b border-slate-200 pb-2">
                  <button
                    type="button"
                    onClick={() => setAuthMode('google')}
                    className={`text-xs font-medium pb-1 transition border-b-2 ${
                      authMode === 'google'
                        ? 'border-amber-500 text-amber-700 font-bold'
                        : 'border-transparent text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    Google Sign-In
                  </button>
                  <button
                    type="button"
                    onClick={() => setAuthMode('email_login')}
                    className={`text-xs font-medium pb-1 transition border-b-2 ${
                      authMode === 'email_login'
                        ? 'border-amber-500 text-amber-700 font-bold'
                        : 'border-transparent text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    Login Email
                  </button>
                  <button
                    type="button"
                    onClick={() => setAuthMode('email_register')}
                    className={`text-xs font-medium pb-1 transition border-b-2 ${
                      authMode === 'email_register'
                        ? 'border-amber-500 text-amber-700 font-bold'
                        : 'border-transparent text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    Daftar Akun Baru
                  </button>
                </div>

                {authMode === 'google' ? (
                  <div className="space-y-2">
                    <p className="text-xs text-slate-600">
                      Masuk dengan Akun Google untuk mengaktifkan sinkronisasi otomatis ke Firebase Firestore Cloud.
                    </p>
                    <button
                      id="google-signin-btn"
                      onClick={handleGoogleLogin}
                      disabled={isLoadingAuth}
                      className="w-full flex items-center justify-center gap-3 py-2.5 px-4 bg-white border border-slate-300 hover:border-amber-500 hover:bg-amber-50/50 text-slate-700 font-semibold text-xs sm:text-sm rounded-xl shadow-xs transition disabled:opacity-50"
                    >
                      {isLoadingAuth ? (
                        <Loader2 className="w-4 h-4 animate-spin text-amber-600" />
                      ) : (
                        <svg className="w-4 h-4" viewBox="0 0 24 24">
                          <path
                            fill="#4285F4"
                            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                          />
                          <path
                            fill="#34A853"
                            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                          />
                          <path
                            fill="#FBBC05"
                            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                          />
                          <path
                            fill="#EA4335"
                            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                          />
                        </svg>
                      )}
                      <span>Masuk dengan Google</span>
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleEmailAuth} className="space-y-2.5">
                    <div>
                      <label className="block text-[11px] font-medium text-slate-600 mb-1">
                        Alamat Email
                      </label>
                      <div className="relative">
                        <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="operator@telitian.com"
                          className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white"
                          required
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-slate-600 mb-1">
                        Kata Sandi
                      </label>
                      <div className="relative">
                        <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="Minimal 6 karakter"
                          className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white"
                          required
                        />
                      </div>
                    </div>
                    <button
                      type="submit"
                      disabled={isLoadingAuth}
                      className="w-full py-2 px-4 bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs rounded-lg shadow-sm transition flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {isLoadingAuth && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                      <span>
                        {authMode === 'email_login' ? 'Masuk Sekarang' : 'Daftar & Masuk'}
                      </span>
                    </button>
                  </form>
                )}
              </div>
            )}
          </div>

          {/* Synchronization Actions */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Operasi Sinkronisasi
              </h4>
              <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
                <span>Lokal: <strong className="text-slate-800">{localRecords.length}</strong></span>
                <span>•</span>
                <span>
                  Cloud: <strong className="text-amber-700">{cloudRecordCount !== null ? cloudRecordCount : '-'}</strong>
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <button
                id="btn-sync-two-way"
                onClick={handleSyncNow}
                disabled={isSyncing}
                className="flex items-center justify-center gap-2 p-3 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-700 hover:to-amber-600 text-white font-semibold text-xs sm:text-sm rounded-xl shadow-md shadow-amber-500/10 transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {isSyncing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4" />
                )}
                <span>Sinkronisasi Dua Arah</span>
              </button>

              <button
                id="btn-pull-cloud"
                onClick={handlePullCloudOnly}
                disabled={isSyncing}
                className="flex items-center justify-center gap-2 p-3 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs sm:text-sm border border-slate-300 rounded-xl transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                <DownloadCloud className="w-4 h-4 text-amber-600" />
                <span>Tarik Data Cloud</span>
              </button>
            </div>

            {/* Realtime Switch */}
            <div className="flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-white">
              <div className="flex items-center gap-2.5">
                <Radio className={`w-4 h-4 ${isRealtimeActive ? 'text-emerald-500 animate-pulse' : 'text-slate-400'}`} />
                <div>
                  <p className="text-xs font-bold text-slate-800">
                    Real-Time Live Sinkronisasi Multi-Device
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Pembaruan dari HP / perangkat dan domain manapun langsung muncul otomatis
                  </p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={isRealtimeActive}
                  onChange={(e) => onToggleRealtime(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500 peer-disabled:opacity-40"></div>
              </label>
            </div>
          </div>

          {/* Section: Google Spreadsheet Real-Time Synchronization */}
          <div className="p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-200 text-xs space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-emerald-900 font-bold">
                <FileSpreadsheet className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Sinkronisasi Realtime Google Spreadsheet</span>
              </div>
              <a
                href="https://docs.google.com/spreadsheets/d/1EPW6gmiZ1uqy2C9_dXB012LXldYVC838axkONsqL5Xs/edit?gid=1699924787"
                target="_blank"
                rel="noreferrer"
                className="text-[11px] font-semibold text-emerald-700 hover:text-emerald-800 underline inline-flex items-center gap-1"
              >
                <span>Buka Sheet</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            <p className="text-slate-600 text-[11px] leading-relaxed">
              Data di semua HP/Laptop dan domain akan disamakan secara realtime dengan isi Google Spreadsheet (ID Sheet: <code>...sqL5Xs</code>).
            </p>

            <form onSubmit={handleSaveGasUrl} className="space-y-1.5 pt-1">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-semibold text-slate-700">
                  URL Google Apps Script Web App (Tersimpan di Cloud)
                </label>
              </div>
              <div className="flex gap-1.5">
                <input
                  type="url"
                  value={gasUrlInput}
                  onChange={(e) => setGasUrlInput(e.target.value)}
                  placeholder="https://script.google.com/macros/s/.../exec"
                  className="flex-1 px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs font-mono bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
                <button
                  type="submit"
                  disabled={isSavingGasUrl}
                  className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs rounded-lg transition disabled:opacity-50 shrink-0 cursor-pointer"
                >
                  {isSavingGasUrl ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Simpan'}
                </button>
              </div>
            </form>

            <button
              id="btn-sync-spreadsheet"
              type="button"
              onClick={handleSyncSpreadsheetNow}
              disabled={isSyncingSheets}
              className="w-full mt-2 flex items-center justify-center gap-2 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition disabled:opacity-50 cursor-pointer"
            >
              {isSyncingSheets ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
              <span>Sinkronkan Data Antar Device &amp; Google Spreadsheet Sekarang</span>
            </button>
          </div>

          {/* Vercel & Firebase Domain Info Box */}
          <div className="p-3.5 rounded-xl bg-amber-50/50 border border-amber-200 text-xs space-y-2">
            <div className="flex items-center gap-2 text-amber-800 font-semibold">
              <Globe className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Konektivitas Vercel & Firebase</span>
            </div>
            <p className="text-slate-600 leading-relaxed">
              Saat aplikasi di-deploy ke Vercel (misal <code>https://aplikasi-anda.vercel.app</code>), data tetap tersimpan abadi di Firebase Firestore.
            </p>
            <div className="flex items-center justify-between bg-white px-3 py-2 rounded-lg border border-amber-200 font-mono text-[11px] text-slate-700">
              <span className="truncate">Domain saat ini: <strong>{currentDomain}</strong></span>
              <button
                type="button"
                onClick={handleCopyDomain}
                className="flex items-center gap-1 text-amber-700 hover:text-amber-800 font-sans font-semibold ml-2 shrink-0"
              >
                {copiedDomain ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedDomain ? 'Tersalin' : 'Salin'}</span>
              </button>
            </div>
            <p className="text-[11px] text-slate-500">
              Tips: Jika menggunakan Google Sign-In di domain Vercel baru, tambahkan domain di{' '}
              <a
                href={`https://console.firebase.google.com/project/${firebaseConfig.projectId}/authentication/settings`}
                target="_blank"
                rel="noreferrer"
                className="text-amber-700 underline font-semibold inline-flex items-center gap-0.5"
              >
                Firebase Authorized Domains <ExternalLink className="w-2.5 h-2.5 inline" />
              </a>
              . Atau gunakan Login Email yang bekerja di semua domain tanpa konfigurasi tambahan.
            </p>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 border-t border-slate-100 bg-slate-50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-200/60 rounded-xl transition"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
