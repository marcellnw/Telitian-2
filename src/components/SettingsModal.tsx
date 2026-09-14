import React, { useState, useEffect } from 'react';
import {
  X,
  Settings,
  Database,
  ExternalLink,
  ShieldCheck,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Lock,
  LogOut,
  RefreshCw,
  Cloud,
} from 'lucide-react';
import { getSavedGasUrl, saveGasUrl, getSavedGasSecret, saveGasSecret } from '../lib/gasClient';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  isAdmin: boolean;
  onOpenLogin: () => void;
  onLogout: () => void;
  onOpenReset?: () => void;
  onOpenGoogleScriptHelp?: () => void;
  onOpenFirebaseSync?: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  isAdmin,
  onOpenLogin,
  onLogout,
  onOpenReset,
  onOpenGoogleScriptHelp,
  onOpenFirebaseSync,
}) => {
  const [gasUrl, setGasUrl] = useState('');
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setGasUrl(getSavedGasUrl() || '');
      setIsSaved(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSaveGasUrl = (e: React.FormEvent) => {
    e.preventDefault();
    saveGasUrl(gasUrl.trim());
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-2xs animate-fade-in">
      <div className="relative w-full max-w-md bg-white rounded-2xl border border-slate-200 p-5 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-700">
              <Settings className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Pengaturan</h3>
              <p className="text-xs text-slate-500">Konfigurasi Sinkronisasi &amp; Akun</p>
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

        {/* 1. Status Akun Admin */}
        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isAdmin ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'}`}>
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-900">
                {isAdmin ? 'Mode Administrator Aktif' : 'Mode Panitia (Tamu/Operator)'}
              </p>
              <p className="text-[11px] text-slate-500">
                {isAdmin ? 'Akses penuh edit, hapus, dan reset' : 'Dapat input dan melihat data'}
              </p>
            </div>
          </div>

          {isAdmin ? (
            <button
              type="button"
              onClick={() => {
                onLogout();
                onClose();
              }}
              className="px-2.5 py-1.5 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-bold cursor-pointer"
            >
              Keluar
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenLogin();
              }}
              className="px-2.5 py-1.5 rounded-lg bg-[#6D4AFF] text-white text-xs font-bold cursor-pointer hover:bg-[#5B39EE]"
            >
              Login
            </button>
          )}
        </div>

        {/* 2. Firebase & Vercel Cloud Sync */}
        {onOpenFirebaseSync && (
          <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-amber-500 text-white flex items-center justify-center">
                <Cloud className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-900">
                  Firebase &amp; Vercel Cloud Sync
                </p>
                <p className="text-[11px] text-slate-500">
                  Login akun &amp; sinkron multi-perangkat
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenFirebaseSync();
              }}
              className="px-2.5 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold cursor-pointer transition-colors"
            >
              Buka
            </button>
          </div>
        )}

        {/* 3. Pengaturan Google Apps Script */}
        <form onSubmit={handleSaveGasUrl} className="space-y-2.5 pt-1">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-700">
              URL Web App Google Apps Script
            </label>
            {onOpenGoogleScriptHelp && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenGoogleScriptHelp();
                }}
                className="text-xs text-violet-700 font-semibold hover:underline cursor-pointer flex items-center gap-1"
              >
                <span>Petunjuk Skrip</span>
                <ExternalLink className="w-3 h-3" />
              </button>
            )}
          </div>

          <input
            type="url"
            placeholder="https://script.google.com/macros/s/.../exec"
            value={gasUrl}
            onChange={(e) => setGasUrl(e.target.value)}
            className="w-full h-11 px-3.5 rounded-xl bg-slate-50 border border-slate-300 text-xs text-slate-900 font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#6D4AFF]"
          />

          {isSaved && (
            <p className="text-xs text-emerald-700 font-semibold flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>URL Google Apps Script tersimpan!</span>
            </p>
          )}

          <button
            type="submit"
            className="w-full h-10 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold cursor-pointer"
          >
            Simpan URL Web App
          </button>
        </form>

        {/* 3. Reset Data (Untuk Panitia jika ingin mengosongkan sebelum acara dimulai) */}
        {onOpenReset && (
          <div className="pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenReset();
              }}
              className="w-full py-2.5 px-3 rounded-xl border border-rose-200 bg-rose-50/50 hover:bg-rose-50 text-rose-700 flex items-center justify-center gap-1.5 text-xs font-semibold cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5 text-rose-600" />
              <span>Mulai dari Nol (Reset Data Kas ke Rp0)</span>
            </button>
          </div>
        )}

        <button
          type="button"
          onClick={onClose}
          className="w-full h-11 rounded-xl bg-[#6D4AFF] text-white text-xs font-semibold hover:bg-[#5B39EE] cursor-pointer"
        >
          Tutup
        </button>
      </div>
    </div>
  );
};
