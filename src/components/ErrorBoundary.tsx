import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an unhandled error:', error, errorInfo);
    this.setState({ error, errorInfo });
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleResetState = () => {
    try {
      sessionStorage.clear();
    } catch (_) {}
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen w-full bg-slate-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200 p-6 shadow-xl text-center space-y-4">
            <div className="w-14 h-14 rounded-full bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-7 h-7" />
            </div>

            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Terjadi Kendala Tampilan
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Data Anda tetap aman di memori lokal dan cloud. Silakan klik tombol di bawah untuk memuat ulang aplikasi.
              </p>
            </div>

            {this.state.error && (
              <div className="p-3 bg-slate-100 rounded-xl text-left overflow-x-auto text-[11px] font-mono text-slate-700 max-h-28">
                {this.state.error.message || String(this.state.error)}
              </div>
            )}

            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                type="button"
                onClick={this.handleReload}
                className="flex items-center justify-center gap-1.5 h-11 px-4 rounded-xl bg-[#6D4AFF] text-white text-xs font-semibold hover:bg-[#5B39EE] transition-colors cursor-pointer shadow-xs"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Muat Ulang</span>
              </button>
              <button
                type="button"
                onClick={this.handleResetState}
                className="flex items-center justify-center gap-1.5 h-11 px-4 rounded-xl border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-colors cursor-pointer"
              >
                <Home className="w-4 h-4" />
                <span>Halaman Awal</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
