import React, { useState } from 'react';
import { X, Lock, KeyRound, Loader2 } from 'lucide-react';
import { setAdminToken } from '../lib/adminAuth';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: () => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess,
}) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();

      if (data.success) {
        setAdminToken(password.trim());
        onLoginSuccess();
        onClose();
      } else {
        setError(data.error || 'Password salah. Coba lagi.');
      }
    } catch (err) {
      // Fallback for client side if testing offline
      if (password.trim() === 'adminhajatan') {
        setAdminToken(password.trim());
        onLoginSuccess();
        onClose();
      } else {
        setError('Koneksi ke server gagal. Gunakan password default: adminhajatan');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-fade-in">
      <div className="relative w-full max-w-sm bg-white rounded-3xl border border-slate-200 p-6 shadow-2xl">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-violet-50 border border-violet-200 flex items-center justify-center text-violet-700">
              <Lock className="w-4 h-4" />
            </div>
            <h3 className="text-base font-black uppercase text-slate-900">
              Login Admin Telitian
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <p className="text-xs text-slate-600">
            Akses khusus Admin: Diperlukan untuk <strong>mengedit data</strong>, <strong>menghapus data</strong>, memulihkan cadangan, dan konfigurasi sistem.
          </p>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
              Password Admin
            </label>
            <div className="relative">
              <input
                id="input-admin-password"
                type="password"
                required
                placeholder="Masukkan password..."
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 text-sm focus:outline-none focus:bg-white focus:ring-2 focus:ring-violet-500"
              />
              <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
            </div>
            <p className="text-[10px] text-slate-500 mt-1">
              *Password admin: <code className="text-violet-700 font-semibold">adminhajatan</code>
            </p>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium">
              {error}
            </div>
          )}

          <div className="pt-2 grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="py-2.5 rounded-xl border border-slate-200 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all cursor-pointer"
            >
              BATAL
            </button>
            <button
              type="submit"
              id="btn-submit-login"
              disabled={isLoading}
              className="py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-black shadow-xs transition-all inline-flex items-center justify-center gap-1.5 cursor-pointer"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <span>MASUK ADMIN</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
