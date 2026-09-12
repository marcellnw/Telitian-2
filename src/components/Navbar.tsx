import React, { useState } from 'react';
import {
  LayoutDashboard,
  UserPlus,
  TableProperties,
  Database,
  Lock,
  LogOut,
  Menu,
  X,
  BookOpen,
  FileSpreadsheet,
  RotateCcw,
  Wifi,
  WifiOff,
  RefreshCw,
} from 'lucide-react';

interface NavbarProps {
  activeTab: 'dashboard' | 'pendataan' | 'data' | 'backup';
  setActiveTab: (tab: 'dashboard' | 'pendataan' | 'data' | 'backup') => void;
  isAdmin: boolean;
  onOpenLogin: () => void;
  onLogout: () => void;
  isOnline: boolean;
  pendingOfflineCount: number;
  onSyncOffline: () => void;
  onOpenReset: () => void;
  onExportExcel: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  isAdmin,
  onOpenLogin,
  onLogout,
  isOnline,
  pendingOfflineCount,
  onSyncOffline,
  onOpenReset,
  onExportExcel,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'pendataan', label: 'Pendataan', icon: UserPlus },
    { id: 'data', label: 'Buku Data', icon: TableProperties },
    { id: 'backup', label: 'Backup & Excel', icon: Database },
  ] as const;

  return (
    <>
      <nav className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs w-full max-w-full overflow-hidden">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-15 sm:h-16 gap-2 sm:gap-3">
            {/* Brand with Formal Emblem */}
            <div className="flex items-center gap-2 sm:gap-3 min-w-0 shrink">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-slate-900 text-amber-400 border border-slate-800 flex items-center justify-center shrink-0 shadow-2xs">
                <BookOpen className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div className="min-w-0 overflow-hidden">
                <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap sm:flex-nowrap">
                  <span className="text-xs sm:text-sm font-extrabold uppercase tracking-wide text-slate-900 truncate">
                    Buku Telitian
                  </span>
                  <span className="text-[10px] px-1.5 sm:px-2 py-0.5 rounded-md bg-slate-100 border border-slate-300 text-slate-700 font-bold uppercase truncate">
                    Gibran K.
                  </span>
                </div>
                <p className="text-[10px] sm:text-[11px] text-slate-500 hidden xl:block font-medium truncate max-w-xs lg:max-w-sm">
                  Sistem Administrasi Tamu &amp; Pencatatan Amplop Hajatan Resmi
                </p>
              </div>
            </div>

            {/* Desktop Navigation Tabs */}
            <div className="hidden md:flex items-center gap-1 bg-slate-100/90 p-1 rounded-2xl border border-slate-200 shrink-0">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    id={`nav-${item.id}`}
                    onClick={() => setActiveTab(item.id)}
                    className={`flex items-center gap-1.5 px-2.5 lg:px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all duration-150 cursor-pointer whitespace-nowrap ${
                      isActive
                        ? 'bg-white text-slate-900 shadow-xs border border-slate-200/80'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Right Action Toolbar (Desktop) */}
            <div className="hidden md:flex items-center gap-1.5 lg:gap-2 shrink-0">
              {/* Online / Offline Status Badge */}
              {isOnline ? (
                <div
                  title="Koneksi stabil. Seluruh data tersimpan realtime."
                  className="flex items-center gap-1.5 px-2 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-semibold whitespace-nowrap"
                >
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-600"></span>
                  </span>
                  <Wifi className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="hidden lg:inline">Online</span>
                </div>
              ) : (
                <div
                  title="Koneksi terputus. Data baru tetap aman tersimpan di memori lokal."
                  className="flex items-center gap-1.5 px-2 py-1.5 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 text-[11px] font-semibold animate-pulse whitespace-nowrap"
                >
                  <WifiOff className="w-3.5 h-3.5 text-amber-600" />
                  <span>Offline</span>
                  {pendingOfflineCount > 0 && (
                    <span className="ml-0.5 px-1.5 py-0.2 bg-amber-500 text-white font-extrabold text-[10px] rounded-full">
                      {pendingOfflineCount}
                    </span>
                  )}
                </div>
              )}

              {/* Offline Sync Button if pending records exist */}
              {pendingOfflineCount > 0 && (
                <button
                  onClick={onSyncOffline}
                  title="Sinkronkan data offline ke server sekarang"
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 active:scale-95 text-white text-xs font-bold transition-all shadow-xs cursor-pointer whitespace-nowrap"
                >
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Sync ({pendingOfflineCount})</span>
                </button>
              )}

              {/* Instant Excel Download */}
              <button
                id="btn-nav-excel-realtime"
                onClick={onExportExcel}
                title="Unduh file Excel realtime terupdate (.xlsx)"
                className="flex items-center gap-1.5 px-2.5 lg:px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-bold transition-all shadow-xs cursor-pointer whitespace-nowrap"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-100" />
                <span>Excel</span>
              </button>

              {/* Reset Button (Mulai dari 0) */}
              <button
                id="btn-nav-reset-zero"
                onClick={onOpenReset}
                title="Mulai pendataan dari 0 (Reset Database)"
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 active:scale-95 border border-rose-200 text-rose-700 text-xs font-bold transition-all cursor-pointer whitespace-nowrap"
              >
                <RotateCcw className="w-3.5 h-3.5 text-rose-600" />
                <span>Mulai 0</span>
              </button>

              {/* Admin Status / Login */}
              {isAdmin ? (
                <div className="flex items-center gap-1.5 bg-slate-100 border border-slate-200 rounded-xl px-2.5 py-1.5 whitespace-nowrap">
                  <span className="text-xs text-slate-700 font-bold">Admin</span>
                  <button
                    onClick={onLogout}
                    title="Keluar Admin"
                    className="p-1 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <button
                  id="btn-login-nav"
                  onClick={onOpenLogin}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 active:scale-95 border border-slate-200 text-slate-700 hover:text-slate-900 text-xs font-semibold transition-all cursor-pointer whitespace-nowrap"
                >
                  <Lock className="w-3.5 h-3.5 text-slate-600" />
                  <span>Login</span>
                </button>
              )}
            </div>

            {/* Mobile Header Controls - Compact & touch friendly */}
            <div className="md:hidden flex items-center gap-1.5 shrink-0">
              {/* Online status indicator dot */}
              <div
                className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                  isOnline ? 'bg-emerald-500 ring-3 ring-emerald-100' : 'bg-amber-500 ring-3 ring-amber-100 animate-pulse'
                }`}
                title={isOnline ? 'Online' : 'Offline'}
              />

              {/* Quick Excel download on mobile */}
              <button
                onClick={onExportExcel}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-bold shadow-2xs active:scale-95 transition-transform shrink-0"
                title="Unduh Excel Realtime"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span className="text-[11px]">Excel</span>
              </button>

              {/* Mobile menu hamburger toggle */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 rounded-xl bg-slate-100 border border-slate-200 text-slate-700 hover:text-slate-900 active:scale-95 transition-transform shrink-0"
                aria-label="Menu Navigasi"
              >
                {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white border-b border-slate-200 px-4 pt-3 pb-5 space-y-3 animate-fade-in shadow-lg">
            {/* Status info bar */}
            <div className="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs">
              <div className="flex items-center gap-2">
                {isOnline ? (
                  <>
                    <Wifi className="w-4 h-4 text-emerald-600" />
                    <span className="text-emerald-800 font-semibold">Online (Sinkron Realtime)</span>
                  </>
                ) : (
                  <>
                    <WifiOff className="w-4 h-4 text-amber-600" />
                    <span className="text-amber-900 font-semibold">Offline (Backup Memori HP Aman)</span>
                  </>
                )}
              </div>
              {pendingOfflineCount > 0 && (
                <button
                  onClick={onSyncOffline}
                  className="px-2.5 py-1 rounded-lg bg-amber-500 text-white text-[11px] font-bold"
                >
                  Sync ({pendingOfflineCount})
                </button>
              )}
            </div>

            {/* Quick Action Buttons */}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => {
                  onExportExcel();
                  setMobileMenuOpen(false);
                }}
                className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-bold shadow-2xs"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>Unduh Excel</span>
              </button>
              <button
                onClick={() => {
                  onOpenReset();
                  setMobileMenuOpen(false);
                }}
                className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Mulai dari 0</span>
              </button>
            </div>

            {/* Navigation Tabs List */}
            <div className="space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveTab(item.id);
                      setMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                      isActive
                        ? 'bg-slate-900 text-white'
                        : 'text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Admin Footer */}
            <div className="pt-2 border-t border-slate-200">
              {isAdmin ? (
                <button
                  onClick={() => {
                    onLogout();
                    setMobileMenuOpen(false);
                  }}
                  className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200"
                >
                  <span>Keluar Akun Admin</span>
                  <LogOut className="w-4 h-4" />
                </button>
              ) : (
                <button
                  onClick={() => {
                    onOpenLogin();
                    setMobileMenuOpen(false);
                  }}
                  className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 border border-slate-200"
                >
                  <span>Login Admin Meja</span>
                  <Lock className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        )}
      </nav>

      {/* Dedicated Mobile Bottom Tab Bar (Fixed for effortless thumb navigation on smartphones) */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 shadow-lg px-2 py-1.5 flex items-center justify-around">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all cursor-pointer ${
                isActive
                  ? 'text-violet-800 font-extrabold'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <div className={`p-1 rounded-lg ${isActive ? 'bg-violet-100 text-violet-800' : ''}`}>
                <Icon className="w-5 h-5" />
              </div>
              <span className="text-[10px] mt-0.5 tracking-tight">{item.label}</span>
            </button>
          );
        })}
      </div>
    </>
  );
};
