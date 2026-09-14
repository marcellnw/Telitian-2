import React, { useState, useEffect } from 'react';
import {
  X,
  FileSpreadsheet,
  HardDrive,
  CheckCircle2,
  Loader2,
  ExternalLink,
  RefreshCw,
  Plus,
  CloudUpload,
  User as UserIcon,
  LogOut,
  AlertTriangle,
} from 'lucide-react';
import { User } from 'firebase/auth';
import { getErrorMessage } from '../lib/errorHelper';
import {
  signInWithGoogle,
  googleSignOut,
  initGoogleAuth,
  getGoogleAccessToken,
  getCurrentGoogleUser,
} from '../lib/googleAuth';
import {
  listDriveSpreadsheets,
  createSpreadsheetInDrive,
  syncRecordsToGoogleSheet,
  uploadBackupToDrive,
  getSpreadsheetDetails,
  DriveSpreadsheetFile,
} from '../lib/googleWorkspace';
import { TelitianRecord } from '../types/record';
import { formatRupiah } from '../lib/currency';

interface GoogleDriveSheetsModalProps {
  isOpen: boolean;
  onClose: () => void;
  records: TelitianRecord[];
  totalUang: number;
}

export const GoogleDriveSheetsModal: React.FC<GoogleDriveSheetsModalProps> = ({
  isOpen,
  onClose,
  records,
  totalUang,
}) => {
  const [googleUser, setGoogleUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isSigningIn, setIsSigningIn] = useState(false);

  // Drive files
  const [spreadsheets, setSpreadsheets] = useState<DriveSpreadsheetFile[]>([]);
  const [isLoadingDriveFiles, setIsLoadingDriveFiles] = useState(false);
  const [selectedSpreadsheetId, setSelectedSpreadsheetId] = useState<string>('');

  // Active operation status
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{
    type: 'success' | 'error';
    text: string;
    link?: string;
  } | null>(null);

  // Confirmation dialog state for mutating Workspace operations (Mandatory per Skill)
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    actionLabel: string;
    onConfirm: () => void;
  } | null>(null);

  useEffect(() => {
    const unsubscribe = initGoogleAuth(
      (user, token) => {
        setGoogleUser(user);
        if (token) setAccessToken(token);
      },
      () => {
        setGoogleUser(null);
        setAccessToken(null);
      }
    );
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (isOpen && accessToken) {
      loadDriveSpreadsheets(accessToken);
    }
  }, [isOpen, accessToken]);

  if (!isOpen) return null;

  const loadDriveSpreadsheets = async (token: string) => {
    setIsLoadingDriveFiles(true);
    try {
      const files = await listDriveSpreadsheets(token);
      setSpreadsheets(files);
      if (files.length > 0 && !selectedSpreadsheetId) {
        setSelectedSpreadsheetId(files[0].id);
      }
    } catch (err: any) {
      console.error('Error listing drive spreadsheets:', err);
    } finally {
      setIsLoadingDriveFiles(false);
    }
  };

  const handleLogin = async () => {
    setIsSigningIn(true);
    setStatusMessage(null);
    try {
      const result = await signInWithGoogle();
      if (result) {
        setGoogleUser(result.user);
        setAccessToken(result.accessToken);
        loadDriveSpreadsheets(result.accessToken);
        setStatusMessage({
          type: 'success',
          text: `Berhasil terhubung dengan akun Google: ${result.user.email}`,
        });
      }
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: getErrorMessage(err, 'Gagal login dengan akun Google.'),
      });
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleLogout = async () => {
    await googleSignOut();
    setGoogleUser(null);
    setAccessToken(null);
    setSpreadsheets([]);
    setStatusMessage(null);
  };

  // 1. Create New Spreadsheet in Drive
  const handleCreateNewSpreadsheet = async () => {
    if (!accessToken) return;

    setConfirmDialog({
      isOpen: true,
      title: 'Buat Spreadsheet Baru di Google Drive?',
      description: `Sistem akan membuat file Google Sheet baru di Google Drive Anda berjudul "Telitian Khitanan Gibran Kurniawan" dan menyalin ${records.length} entri (${formatRupiah(totalUang)}).`,
      actionLabel: 'Buat Spreadsheet',
      onConfirm: async () => {
        setConfirmDialog(null);
        setIsProcessing(true);
        setStatusMessage(null);
        try {
          const dateStr = new Date().toLocaleDateString('id-ID', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
          });
          const title = `Telitian Khitanan Gibran Kurniawan (${dateStr})`;
          const result = await createSpreadsheetInDrive(accessToken, title, records);
          setStatusMessage({
            type: 'success',
            text: `Spreadsheet baru berhasil dibuat di Google Drive!`,
            link: result.url,
          });
          loadDriveSpreadsheets(accessToken);
        } catch (err: any) {
          setStatusMessage({
            type: 'error',
            text: getErrorMessage(err, 'Gagal membuat spreadsheet di Google Drive.'),
          });
        } finally {
          setIsProcessing(false);
        }
      },
    });
  };

  // 2. Sync to Selected Existing Spreadsheet
  const handleSyncToSelectedSpreadsheet = async () => {
    if (!accessToken || !selectedSpreadsheetId) return;

    const selectedFile = spreadsheets.find((s) => s.id === selectedSpreadsheetId);
    const fileName = selectedFile ? selectedFile.name : 'Google Sheet';

    setConfirmDialog({
      isOpen: true,
      title: `Sinkronkan ke "${fileName}"?`,
      description: `Perbarui tab sheet dengan ${records.length} entri data telitian saat ini (${formatRupiah(totalUang)}). Data lama pada tab akan diperbarui.`,
      actionLabel: 'Mulai Sinkronisasi',
      onConfirm: async () => {
        setConfirmDialog(null);
        setIsProcessing(true);
        setStatusMessage(null);
        try {
          // Get tab name
          const details = await getSpreadsheetDetails(accessToken, selectedSpreadsheetId);
          const tabName = details.sheetNames[0] || 'Data Telitian';

          await syncRecordsToGoogleSheet(accessToken, selectedSpreadsheetId, tabName, records);
          setStatusMessage({
            type: 'success',
            text: `Berhasil menyinkronkan ${records.length} data ke Google Sheet: ${details.title}`,
            link: `https://docs.google.com/spreadsheets/d/${selectedSpreadsheetId}/edit`,
          });
        } catch (err: any) {
          setStatusMessage({
            type: 'error',
            text: getErrorMessage(err, 'Gagal menyinkronkan data ke Google Sheet.'),
          });
        } finally {
          setIsProcessing(false);
        }
      },
    });
  };

  // 3. Upload Backup JSON to Drive
  const handleUploadBackupToDrive = async () => {
    if (!accessToken) return;

    setConfirmDialog({
      isOpen: true,
      title: 'Unggah Cadangan ke Google Drive?',
      description: `File cadangan database JSON berisi ${records.length} data telitian akan disimpan di Google Drive Anda.`,
      actionLabel: 'Unggah File',
      onConfirm: async () => {
        setConfirmDialog(null);
        setIsProcessing(true);
        setStatusMessage(null);
        try {
          const nowStr = new Date().toISOString().slice(0, 10);
          const fileName = `Backup_Telitian_Gibran_${nowStr}.json`;
          const result = await uploadBackupToDrive(accessToken, fileName, records);
          setStatusMessage({
            type: 'success',
            text: `File cadangan berhasil disimpan di Google Drive!`,
            link: result.webViewLink,
          });
        } catch (err: any) {
          setStatusMessage({
            type: 'error',
            text: getErrorMessage(err, 'Gagal mengunggah cadangan ke Google Drive.'),
          });
        } finally {
          setIsProcessing(false);
        }
      },
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/40 backdrop-blur-2xs animate-fade-in">
      <div className="relative w-full max-w-md bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Google Drive &amp; Sheets</h3>
              <p className="text-xs text-slate-500">Integrasi Akun Google Panitia</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status Message / Notification */}
        {statusMessage && (
          <div
            className={`p-3 rounded-xl text-xs font-medium space-y-1 ${
              statusMessage.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : 'bg-rose-50 text-rose-800 border border-rose-200'
            }`}
          >
            <p className="font-semibold">{getErrorMessage(statusMessage.text)}</p>
            {statusMessage.link && (
              <a
                href={statusMessage.link}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 font-bold underline hover:opacity-80"
              >
                <span>Buka di Google Spreadsheet / Drive</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
        )}

        {/* Auth Section */}
        {!googleUser ? (
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-center space-y-3">
            <div className="w-12 h-12 mx-auto rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-600 shadow-xs">
              <HardDrive className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900">Hubungkan Akun Google</h4>
              <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                Masuk dengan akun Google untuk menyimpan langsung ke Google Sheets dan Google Drive Anda tanpa perantara.
              </p>
            </div>

            {/* Official GSI Google Sign-in Button */}
            <div className="flex justify-center pt-1">
              <button
                type="button"
                onClick={handleLogin}
                disabled={isSigningIn}
                className="inline-flex items-center justify-center gap-2.5 px-4 h-11 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 cursor-pointer transition-colors disabled:opacity-50"
              >
                {isSigningIn ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-slate-600" />
                    <span>Menghubungkan...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" viewBox="0 0 48 48">
                      <path
                        fill="#EA4335"
                        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                      />
                      <path
                        fill="#4285F4"
                        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                      />
                      <path
                        fill="#34A853"
                        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                      />
                    </svg>
                    <span>Masuk dengan Akun Google</span>
                  </>
                )}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3.5">
            {/* User Profile Card */}
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2.5 overflow-hidden">
                {googleUser.photoURL ? (
                  <img
                    src={googleUser.photoURL}
                    alt={googleUser.displayName || 'Google User'}
                    className="w-8 h-8 rounded-full border border-slate-200"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-violet-100 text-[#6D4AFF] flex items-center justify-center">
                    <UserIcon className="w-4 h-4" />
                  </div>
                )}
                <div className="truncate">
                  <p className="text-xs font-bold text-slate-900 truncate">
                    {googleUser.displayName || 'Pengguna Google'}
                  </p>
                  <p className="text-[11px] text-slate-500 truncate">{googleUser.email}</p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleLogout}
                className="px-2.5 py-1 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 text-xs font-semibold cursor-pointer flex items-center gap-1 shrink-0"
              >
                <LogOut className="w-3 h-3" />
                <span>Keluar</span>
              </button>
            </div>

            {/* Actions for Google Sheets & Drive */}
            <div className="space-y-2.5">
              <label className="block text-xs font-bold text-slate-700">
                Fitur Google Drive &amp; Sheets
              </label>

              {/* Action 1: Create new spreadsheet */}
              <button
                type="button"
                disabled={isProcessing}
                onClick={handleCreateNewSpreadsheet}
                className="w-full p-3 rounded-xl border border-emerald-200 bg-emerald-50/60 hover:bg-emerald-50 text-emerald-800 flex items-start gap-2.5 text-left transition-colors cursor-pointer disabled:opacity-50"
              >
                <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0 mt-0.5">
                  <Plus className="w-4 h-4" />
                </div>
                <div>
                  <strong className="block text-xs font-bold text-emerald-950">
                    Buat Spreadsheet Baru di Google Drive
                  </strong>
                  <span className="text-[11px] text-emerald-700 block mt-0.5">
                    Membuat file Google Sheet otomatis di Drive Anda lengkap dengan {records.length} entri data dan rumus total.
                  </span>
                </div>
              </button>

              {/* Action 2: Sync with existing sheet in Drive */}
              <div className="p-3 rounded-xl border border-slate-200 bg-white space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800">
                    Pilih Spreadsheet di Google Drive
                  </span>
                  <button
                    type="button"
                    disabled={isLoadingDriveFiles}
                    onClick={() => accessToken && loadDriveSpreadsheets(accessToken)}
                    className="text-[11px] text-[#6D4AFF] hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <RefreshCw className={`w-3 h-3 ${isLoadingDriveFiles ? 'animate-spin' : ''}`} />
                    <span>Muat Ulang</span>
                  </button>
                </div>

                {isLoadingDriveFiles ? (
                  <div className="py-2 text-center text-xs text-slate-400">
                    Memuat daftar spreadsheet Google Drive...
                  </div>
                ) : spreadsheets.length > 0 ? (
                  <div className="space-y-2">
                    <select
                      value={selectedSpreadsheetId}
                      onChange={(e) => setSelectedSpreadsheetId(e.target.value)}
                      className="w-full h-10 px-3 rounded-lg border border-slate-300 text-xs bg-slate-50 text-slate-900"
                    >
                      {spreadsheets.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>

                    <button
                      type="button"
                      disabled={isProcessing || !selectedSpreadsheetId}
                      onClick={handleSyncToSelectedSpreadsheet}
                      className="w-full h-10 rounded-lg bg-[#6D4AFF] text-white text-xs font-semibold hover:bg-[#5B39EE] flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      {isProcessing ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Menyinkronkan...</span>
                        </>
                      ) : (
                        <>
                          <FileSpreadsheet className="w-3.5 h-3.5" />
                          <span>Sinkronkan ke Spreadsheet Terpilih</span>
                        </>
                      )}
                    </button>
                  </div>
                ) : (
                  <div className="text-xs text-slate-500 py-1">
                    Belum ditemukan spreadsheet di akun Drive Anda. Gunakan tombol "Buat Spreadsheet Baru" di atas.
                  </div>
                )}
              </div>

              {/* Action 3: Save Backup JSON to Drive */}
              <button
                type="button"
                disabled={isProcessing}
                onClick={handleUploadBackupToDrive}
                className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 flex items-center gap-2 text-xs font-semibold cursor-pointer transition-colors disabled:opacity-50"
              >
                <CloudUpload className="w-4 h-4 text-violet-600 shrink-0" />
                <span>Simpan File Cadangan Database ke Google Drive</span>
              </button>
            </div>
          </div>
        )}

        {/* Confirmation Modal for Destructive/Mutating Workspace actions */}
        {confirmDialog && confirmDialog.isOpen && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-2xs animate-fade-in">
            <div className="relative w-full max-w-sm bg-white rounded-2xl border border-slate-200 p-5 shadow-2xl space-y-3 text-center">
              <div className="w-10 h-10 mx-auto rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <h4 className="text-base font-bold text-slate-900">{confirmDialog.title}</h4>
              <p className="text-xs text-slate-600 leading-relaxed">{confirmDialog.description}</p>
              <div className="grid grid-cols-2 gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setConfirmDialog(null)}
                  className="w-full h-10 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={confirmDialog.onConfirm}
                  className="w-full h-10 rounded-xl bg-[#6D4AFF] text-white text-xs font-semibold hover:bg-[#5B39EE] cursor-pointer"
                >
                  {confirmDialog.actionLabel}
                </button>
              </div>
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={onClose}
          className="w-full h-11 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold cursor-pointer transition-colors"
        >
          Tutup
        </button>
      </div>
    </div>
  );
};
