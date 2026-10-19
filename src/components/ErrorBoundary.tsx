import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RotateCcw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = window.location.origin;
  };

  private handleReload = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen w-full flex items-center justify-center p-4 bg-slate-900 text-white font-sans">
          <div className="max-w-md w-full p-6 sm:p-8 rounded-3xl bg-[#14161f] border border-[#272b3b] shadow-2xl text-center space-y-4">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-red-500/15 border border-red-500/30 flex items-center justify-center text-red-500">
              <AlertTriangle className="w-7 h-7" />
            </div>
            <h2 className="text-lg sm:text-xl font-bold tracking-tight">
              Terjadi Kesalahan Tampilan
            </h2>
            <p className="text-xs sm:text-sm text-neutral-400 leading-relaxed">
              Aplikasi mendeteksi kendala saat memuat halaman ini. Anda dapat menyegarkan halaman atau kembali ke Beranda utama.
            </p>
            {this.state.error?.message && (
              <div className="p-2.5 rounded-xl bg-black/40 border border-neutral-800 text-[11px] font-mono text-red-400 break-all text-left">
                {this.state.error.message}
              </div>
            )}
            <div className="flex items-center gap-2.5 pt-2">
              <button
                type="button"
                onClick={this.handleReset}
                className="flex-1 py-2.5 px-4 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer transition-colors"
              >
                <Home className="w-4 h-4" />
                <span>Ke Beranda</span>
              </button>
              <button
                type="button"
                onClick={this.handleReload}
                className="flex-1 py-2.5 px-4 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-semibold flex items-center justify-center gap-2 shadow-lg shadow-red-600/30 cursor-pointer transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Muat Ulang</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
