import React, { useState } from 'react';
import {
  X,
  Database,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  ExternalLink,
  RefreshCw,
  Sparkles,
  UploadCloud,
} from 'lucide-react';
import { SUPABASE_URL } from '../lib/supabase';
import { CloudStatus, syncAllLocalDataToCloud, FullSyncResult } from '../lib/supabaseService';

interface CloudSetupModalProps {
  status: CloudStatus;
  onRefresh: () => void;
  onClose: () => void;
}

export const CloudSetupModal: React.FC<CloudSetupModalProps> = ({
  status,
  onRefresh,
  onClose,
}) => {
  const [copied, setCopied] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSyncingLocal, setIsSyncingLocal] = useState(false);
  const [syncResult, setSyncResult] = useState<FullSyncResult | null>(null);

  // Local data counts
  const localProjectCount = (() => {
    try {
      const saved = localStorage.getItem('vermilion_projects');
      if (!saved) return 0;
      const parsed = JSON.parse(saved);
      return Array.isArray(parsed) ? parsed.filter((p) => !['proj-1', 'proj-2', 'proj-3'].includes(p.id)).length : 0;
    } catch {
      return 0;
    }
  })();

  const localListCount = (() => {
    try {
      const saved = localStorage.getItem('vermilion_board_lists');
      if (!saved) return 0;
      const parsed = JSON.parse(saved);
      return Array.isArray(parsed) ? parsed.length : 0;
    } catch {
      return 0;
    }
  })();

  const localTaskCount = (() => {
    try {
      const saved = localStorage.getItem('vermilion_tasks');
      if (!saved) return 0;
      const parsed = JSON.parse(saved);
      return Array.isArray(parsed) ? parsed.filter((t) => !['proj-1', 'proj-2', 'proj-3'].includes(t.projectId)).length : 0;
    } catch {
      return 0;
    }
  })();

  const [isClosing, setIsClosing] = useState(false);

  const handleClose = () => {
    onClose();
  };

  const handleSyncAllLocal = async () => {
    setIsSyncingLocal(true);
    setSyncResult(null);
    try {
      const res = await syncAllLocalDataToCloud();
      setSyncResult(res);
      await onRefresh();
    } catch {
      // ignore
    } finally {
      setIsSyncingLocal(false);
    }
  };

  const handleCopySql = () => {
    fetch('/supabase_schema.sql')
      .then((res) => {
        if (!res.ok) throw new Error();
        return res.text();
      })
      .catch(() => {
        return `-- Silakan buka file supabase_schema.sql di folder root proyek dan jalankan di SQL Editor Supabase.`;
      })
      .then((sqlText) => {
        navigator.clipboard.writeText(sqlText);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      });
  };

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    await onRefresh();
    setTimeout(() => setIsRefreshing(false), 600);
  };

  return (
    <div
      onClick={handleClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 overflow-y-auto cursor-pointer animate-in fade-in"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg rounded-[36px] bg-white dark:bg-[#12141a] border border-neutral-200 dark:border-[#272a35] shadow-2xl overflow-hidden text-neutral-900 dark:text-neutral-100 flex flex-col max-h-[92vh] cursor-default animate-modal-in"
      >
        {/* Modal Header */}
        <div className="p-4 px-6 border-b border-neutral-200 dark:border-[#272a35] flex items-center justify-between bg-neutral-50 dark:bg-[#161820] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-[14px] bg-emerald-600 text-white flex items-center justify-center font-bold shadow-xs">
              <Database className="w-4 h-4 stroke-[2.2]" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-neutral-900 dark:text-white">
                Integrasi Cloud Supabase
              </h3>
              <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                Database realtime & sinkronisasi multi-pengguna
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 text-neutral-400 hover:text-neutral-900 dark:hover:text-white rounded-full transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-4 text-xs">
          {/* Status Alert Banner */}
          {status.tableReady ? (
            <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 dark:text-emerald-300 flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-500 mt-0.5" />
              <div>
                <p className="font-bold text-xs">Database Cloud Aktif & Siap</p>
                <p className="text-[11px] leading-relaxed mt-0.5">
                  Aplikasi telah terhubung ke Supabase dengan tabel & realtime sync. Seluruh perubahan kartu tugas, proyek, dan anggota akan tersinkronisasi secara otomatis.
                </p>
              </div>
            </div>
          ) : status.connected ? (
            <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-300 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 shrink-0 text-amber-500 mt-0.5" />
              <div>
                <p className="font-bold text-xs">Terkoneksi ke Supabase (Tabel Belum Dibuat)</p>
                <p className="text-[11px] leading-relaxed mt-0.5">
                  Koneksi ke endpoint Supabase berhasil! Namun tabel database (`projects`, `tasks`, `profiles`) belum dieksekusi di database cloud Anda.
                </p>
              </div>
            </div>
          ) : (
            <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-800 dark:text-red-300 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 shrink-0 text-red-500 mt-0.5" />
              <div>
                <p className="font-bold text-xs">Belum Terhubung</p>
                <p className="text-[11px] leading-relaxed mt-0.5">
                  {status.message || 'Gagal menghubungi Supabase.'}
                </p>
              </div>
            </div>
          )}

          {/* Connection Details */}
          <div className="p-3 rounded-xl border border-neutral-200 dark:border-[#272a35] bg-neutral-50/70 dark:bg-[#181a22] space-y-2">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-neutral-500 dark:text-neutral-400">Endpoint URL:</span>
              <span className="font-mono text-neutral-800 dark:text-neutral-200 font-semibold truncate max-w-[260px]">
                {SUPABASE_URL}
              </span>
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-neutral-500 dark:text-neutral-400">Realtime Engine:</span>
              <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">
                <Sparkles className="w-3 h-3" />
                Aktif (PostgreSQL replication)
              </span>
            </div>
          </div>

          {/* Sync Local Data to Cloud Card */}
          <div className="p-3.5 rounded-xl border border-red-200 dark:border-red-900/40 bg-red-50/30 dark:bg-red-950/20 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h4 className="font-bold text-xs text-neutral-900 dark:text-white flex items-center gap-1.5">
                  <UploadCloud className="w-4 h-4 text-red-600 dark:text-red-400" />
                  <span>Sinkronisasi Data Perangkat Ini ke Cloud</span>
                </h4>
                <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5 leading-relaxed">
                  Jika Anda telah membuat daftar tugas, proyek, atau kolom di perangkat ini dan belum muncul di perangkat lain, klik tombol di bawah untuk mengunggah semuanya ke database Supabase.
                </p>
              </div>
            </div>

            {/* Counts Pill */}
            <div className="grid grid-cols-3 gap-2 py-1">
              <div className="p-2 rounded-lg bg-white dark:bg-[#181a22] border border-neutral-200 dark:border-[#272a35] text-center">
                <span className="text-[10px] text-neutral-400 block font-medium">Proyek Lokal</span>
                <span className="font-bold text-sm text-neutral-900 dark:text-white">{localProjectCount}</span>
              </div>
              <div className="p-2 rounded-lg bg-white dark:bg-[#181a22] border border-neutral-200 dark:border-[#272a35] text-center">
                <span className="text-[10px] text-neutral-400 block font-medium">Daftar Kolom</span>
                <span className="font-bold text-sm text-neutral-900 dark:text-white">{localListCount}</span>
              </div>
              <div className="p-2 rounded-lg bg-white dark:bg-[#181a22] border border-neutral-200 dark:border-[#272a35] text-center">
                <span className="text-[10px] text-neutral-400 block font-medium">Kartu Tugas</span>
                <span className="font-bold text-sm text-red-600 dark:text-red-400">{localTaskCount}</span>
              </div>
            </div>

            {syncResult && (
              <div className={`p-2.5 rounded-lg text-[11px] ${
                syncResult.success 
                  ? 'bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 border border-emerald-500/20' 
                  : 'bg-amber-500/10 text-amber-800 dark:text-amber-300 border border-amber-500/20'
              }`}>
                {syncResult.success ? (
                  <p className="flex items-center gap-1.5 font-semibold">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>Sinkronisasi Berhasil! {syncResult.projectsSynced} proyek, {syncResult.listsSynced} daftar, dan {syncResult.tasksSynced} tugas tersinkron ke cloud. Buka perangkat lain sekarang untuk melihatnya.</span>
                  </p>
                ) : (
                  <div>
                    <p className="font-semibold text-amber-800 dark:text-amber-300">Hasil Sinkronisasi:</p>
                    <p>{syncResult.tasksSynced} tugas terunggah.</p>
                    {syncResult.errors.map((e, idx) => (
                      <p key={idx} className="text-[10px] text-red-500 mt-0.5">• {e}</p>
                    ))}
                  </div>
                )}
              </div>
            )}

            <button
              type="button"
              onClick={handleSyncAllLocal}
              disabled={isSyncingLocal}
              className="w-full h-9 rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold text-xs shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncingLocal ? 'animate-spin' : ''}`} />
              <span>{isSyncingLocal ? 'Sedang Mengunggah ke Cloud...' : 'Unggah & Sinkronkan Semua Data Lokal ke Cloud'}</span>
            </button>
          </div>

          {/* Instructions for Setup if tables not ready */}
          {!status.tableReady && (
            <div className="space-y-3 pt-2">
              <h4 className="font-bold text-xs text-neutral-900 dark:text-white flex items-center justify-between">
                <span>Langkah 1x Setup Database di Supabase:</span>
                <span className="text-[10px] text-neutral-500 font-normal">Hanya butuh 30 detik</span>
              </h4>

              <div className="p-3 rounded-xl bg-neutral-100 dark:bg-[#1a1c25] border border-neutral-200 dark:border-[#2b2f3d] space-y-2.5">
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-red-600 text-white font-bold flex items-center justify-center text-[10px] shrink-0 mt-0.5">
                    1
                  </span>
                  <p className="text-[11px] text-neutral-700 dark:text-neutral-300">
                    Buka project Anda di{' '}
                    <a
                      href="https://supabase.com/dashboard"
                      target="_blank"
                      rel="noreferrer"
                      className="text-red-600 dark:text-red-400 font-semibold underline inline-flex items-center gap-0.5"
                    >
                      Supabase Dashboard <ExternalLink className="w-3 h-3" />
                    </a>
                  </p>
                </div>

                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-red-600 text-white font-bold flex items-center justify-center text-[10px] shrink-0 mt-0.5">
                    2
                  </span>
                  <p className="text-[11px] text-neutral-700 dark:text-neutral-300">
                    Masuk ke menu <strong>SQL Editor</strong> di bilah navigasi kiri, lalu buat <strong>New Query</strong>.
                  </p>
                </div>

                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-red-600 text-white font-bold flex items-center justify-center text-[10px] shrink-0 mt-0.5">
                    3
                  </span>
                  <p className="text-[11px] text-neutral-700 dark:text-neutral-300">
                    Buka file <code className="px-1.5 py-0.5 rounded bg-neutral-200 dark:bg-[#252834] font-mono text-[10px]">supabase_schema.sql</code> di proyek ini, salin seluruh kodenya, tempel di SQL Editor, lalu tekan <strong>Run</strong>.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleCopySql}
                className="w-full h-9 rounded-xl bg-neutral-900 hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-200 text-white dark:text-neutral-900 font-semibold text-xs shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-500 stroke-[3]" />
                    <span>Skrip SQL Berhasil Disalin!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>Salin Seluruh Skrip SQL Schema</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 px-5 sm:px-6 border-t border-neutral-200 dark:border-[#272a35] bg-neutral-50 dark:bg-[#161820] flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={handleManualRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 text-xs font-medium text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>Cek Ulang Koneksi</span>
          </button>

          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-neutral-200 dark:bg-[#222530] hover:bg-neutral-300 dark:hover:bg-[#2c303e] text-neutral-800 dark:text-neutral-200 transition-colors cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
