import React, { useState, useRef, useEffect } from 'react';
import {
  MoreVertical,
  RotateCw,
  Download,
  FileText,
  Settings,
  Info,
  Lock,
  LogOut,
  Wifi,
  WifiOff,
  RefreshCw,
  FileSpreadsheet,
} from 'lucide-react';

interface HeaderProps {
  onRefreshData?: () => void;
  onGoToBackup?: () => void;
  onGoToLaporan?: () => void;
  onOpenSettings?: () => void;
  onOpenTentang?: () => void;
  onOpenGoogleDriveSheets?: () => void;
  isOnline?: boolean;
  isAdmin?: boolean;
  onOpenLogin?: () => void;
  onLogout?: () => void;
  pendingOfflineCount?: number;
  onSyncOffline?: () => void;
  // Backward compatibility props if passed
  onScrollToForm?: () => void;
  onExportExcel?: () => void;
  onPrint?: () => void;
  totalData?: number;
  totalUang?: number;
}

export const Header: React.FC<HeaderProps> = ({
  onRefreshData,
  onGoToBackup,
  onGoToLaporan,
  onOpenSettings,
  onOpenTentang,
  onOpenGoogleDriveSheets,
  isOnline = true,
  isAdmin = false,
  onOpenLogin,
  onLogout,
  pendingOfflineCount = 0,
  onSyncOffline,
}) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(event.target as Node)
      ) {
        setDropdownOpen(false);
      }
    };

    if (dropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [dropdownOpen]);

  const handleAction = (callback?: () => void) => {
    setDropdownOpen(false);
    if (callback) {
      callback();
    }
  };

  return (
    <header className="sticky top-0 z-40 h-14 sm:h-16 bg-white border-b border-slate-200 shadow-xs w-full max-w-full">
      <div className="w-full max-w-[480px] md:max-w-4xl lg:max-w-6xl mx-auto h-full px-3 sm:px-4 flex items-center justify-between">
        {/* Bagian Kiri: Identitas Aplikasi Bersih & Ringkas */}
        <div className="flex flex-col justify-center min-w-0 pr-2">
          <h1 className="text-base sm:text-lg font-bold tracking-tight text-slate-900 leading-tight truncate">
            Telitian Gibran
          </h1>
          <p className="text-[11px] sm:text-xs text-slate-500 font-medium leading-none mt-0.5 truncate">
            Khitanan Gibran Kurniawan
          </p>
        </div>

        {/* Bagian Kanan: Status Koneksi & Menu Titik Tiga Vertikal */}
        <div className="relative flex items-center gap-1 shrink-0">
          {/* Status Offline / Online Indikator Halus */}
          {pendingOfflineCount > 0 && onSyncOffline && (
            <button
              onClick={onSyncOffline}
              title="Sinkronkan data offline"
              className="flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-500 text-white text-[11px] font-bold shadow-2xs active:scale-95 transition-all mr-1 cursor-pointer"
            >
              <RefreshCw className="w-3 h-3 animate-spin" />
              <span>Sync {pendingOfflineCount}</span>
            </button>
          )}

          {!isOnline && (
            <span
              title="Koneksi terputus. Data offline disimpan aman di perangkat."
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-semibold border border-amber-300 mr-1"
            >
              <WifiOff className="w-3 h-3 text-amber-600" />
              <span className="hidden sm:inline">Offline</span>
            </span>
          )}

          {/* Tombol Titik Tiga Vertikal (Area Sentuh Min. 44 x 44 px) */}
          <button
            ref={triggerRef}
            id="btn-header-menu-dots"
            type="button"
            aria-label="Menu Opsi"
            aria-expanded={dropdownOpen}
            onClick={() => setDropdownOpen((prev) => !prev)}
            className="w-11 h-11 flex items-center justify-center rounded-xl text-slate-700 hover:text-slate-900 hover:bg-slate-100 active:bg-slate-200 transition-colors cursor-pointer"
          >
            <MoreVertical className="w-5 h-5 text-slate-700" />
          </button>

          {/* Dropdown Popover Titik Tiga */}
          {dropdownOpen && (
            <div
              ref={dropdownRef}
              className="absolute right-0 top-12 w-52 sm:w-56 bg-white rounded-xl shadow-lg border border-slate-200 p-2 z-50 animate-fade-in"
              style={{ minWidth: '200px' }}
            >
              <div className="space-y-0.5">
                {/* 1. Refresh Data */}
                <button
                  type="button"
                  onClick={() => handleAction(onRefreshData)}
                  className="w-full flex items-center gap-3 px-3 h-11 rounded-lg text-slate-700 hover:text-slate-900 hover:bg-slate-50 active:bg-slate-100 text-sm font-medium transition-colors cursor-pointer text-left"
                >
                  <RotateCw className="w-4 h-4 text-violet-600 shrink-0" />
                  <span>Refresh Data</span>
                </button>

                {/* 2. Backup & Export */}
                <button
                  type="button"
                  onClick={() => handleAction(onGoToBackup)}
                  className="w-full flex items-center gap-3 px-3 h-11 rounded-lg text-slate-700 hover:text-slate-900 hover:bg-slate-50 active:bg-slate-100 text-sm font-medium transition-colors cursor-pointer text-left"
                >
                  <Download className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Backup &amp; Export</span>
                </button>

                {/* 3. Google Drive & Sheets */}
                {onOpenGoogleDriveSheets && (
                  <button
                    type="button"
                    onClick={() => handleAction(onOpenGoogleDriveSheets)}
                    className="w-full flex items-center gap-3 px-3 h-11 rounded-lg text-slate-700 hover:text-slate-900 hover:bg-slate-50 active:bg-slate-100 text-sm font-medium transition-colors cursor-pointer text-left"
                  >
                    <FileSpreadsheet className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Google Drive &amp; Sheets</span>
                  </button>
                )}

                {/* 4. Laporan */}
                <button
                  type="button"
                  onClick={() => handleAction(onGoToLaporan)}
                  className="w-full flex items-center gap-3 px-3 h-11 rounded-lg text-slate-700 hover:text-slate-900 hover:bg-slate-50 active:bg-slate-100 text-sm font-medium transition-colors cursor-pointer text-left"
                >
                  <FileText className="w-4 h-4 text-indigo-600 shrink-0" />
                  <span>Laporan</span>
                </button>

                {/* 4. Pengaturan */}
                <button
                  type="button"
                  onClick={() => handleAction(onOpenSettings)}
                  className="w-full flex items-center gap-3 px-3 h-11 rounded-lg text-slate-700 hover:text-slate-900 hover:bg-slate-50 active:bg-slate-100 text-sm font-medium transition-colors cursor-pointer text-left"
                >
                  <Settings className="w-4 h-4 text-slate-600 shrink-0" />
                  <span>Pengaturan</span>
                </button>

                {/* 5. Tentang Aplikasi */}
                <button
                  type="button"
                  onClick={() => handleAction(onOpenTentang)}
                  className="w-full flex items-center gap-3 px-3 h-11 rounded-lg text-slate-700 hover:text-slate-900 hover:bg-slate-50 active:bg-slate-100 text-sm font-medium transition-colors cursor-pointer text-left"
                >
                  <Info className="w-4 h-4 text-blue-600 shrink-0" />
                  <span>Tentang Aplikasi</span>
                </button>

                {/* Divider */}
                <div className="my-1 border-t border-slate-100" />

                {/* Login / Keluar Admin */}
                {isAdmin ? (
                  <button
                    type="button"
                    onClick={() => handleAction(onLogout)}
                    className="w-full flex items-center gap-3 px-3 h-11 rounded-lg text-rose-600 hover:bg-rose-50 active:bg-rose-100 text-sm font-medium transition-colors cursor-pointer text-left"
                  >
                    <LogOut className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>Keluar Admin</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleAction(onOpenLogin)}
                    className="w-full flex items-center gap-3 px-3 h-11 rounded-lg text-slate-700 hover:text-slate-900 hover:bg-slate-50 active:bg-slate-100 text-sm font-medium transition-colors cursor-pointer text-left"
                  >
                    <Lock className="w-4 h-4 text-slate-500 shrink-0" />
                    <span>Login Admin</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
