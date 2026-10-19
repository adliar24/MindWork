import React, { useEffect } from 'react';
import { Trash2, AlertTriangle, AlertCircle, X } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

export interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
  itemName?: string;
  isLoading?: boolean;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText,
  cancelText,
  variant = 'danger',
  itemName,
  isLoading = false,
}) => {
  const { language } = useLanguage();

  // Close on Escape, confirm on Enter
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const defaultConfirmText =
    confirmText ||
    (variant === 'danger'
      ? language === 'id'
        ? 'Hapus'
        : 'Delete'
      : language === 'id'
      ? 'Konfirmasi'
      : 'Confirm');

  const defaultCancelText = cancelText || (language === 'id' ? 'Batal' : 'Cancel');

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[100] bg-black/75 flex items-center justify-center p-4 animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-sm rounded-2xl bg-white dark:bg-[#161822] border border-neutral-200 dark:border-[#272b3a] shadow-2xl p-5 sm:p-6 space-y-4 animate-in zoom-in-95 duration-150 text-neutral-900 dark:text-neutral-100"
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-[#202330] transition-colors cursor-pointer"
          aria-label="Tutup"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header Icon + Title */}
        <div className="flex items-start gap-3.5 pr-6">
          {variant === 'danger' ? (
            <div className="w-11 h-11 rounded-2xl bg-red-500/10 dark:bg-red-500/15 border border-red-500/20 text-red-500 flex items-center justify-center shrink-0">
              <Trash2 className="w-5 h-5 stroke-[2.2]" />
            </div>
          ) : variant === 'warning' ? (
            <div className="w-11 h-11 rounded-2xl bg-amber-500/10 dark:bg-amber-500/15 border border-amber-500/20 text-amber-500 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5 stroke-[2.2]" />
            </div>
          ) : (
            <div className="w-11 h-11 rounded-2xl bg-blue-500/10 dark:bg-blue-500/15 border border-blue-500/20 text-blue-500 flex items-center justify-center shrink-0">
              <AlertCircle className="w-5 h-5 stroke-[2.2]" />
            </div>
          )}

          <div className="min-w-0">
            <h3 className="text-base font-bold text-neutral-900 dark:text-white leading-snug">
              {title}
            </h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 leading-relaxed">
              {message}
            </p>
          </div>
        </div>

        {/* Highlighted Item Badge (if provided) */}
        {itemName && (
          <div className="p-2.5 px-3 rounded-xl bg-neutral-100 dark:bg-[#12141a] border border-neutral-200/80 dark:border-[#242736] text-xs font-semibold text-neutral-800 dark:text-neutral-200 flex items-center gap-2">
            <span
              className={`w-2 h-2 rounded-full shrink-0 ${
                variant === 'danger'
                  ? 'bg-red-500'
                  : variant === 'warning'
                  ? 'bg-amber-500'
                  : 'bg-blue-500'
              }`}
            />
            <span className="truncate">{itemName}</span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="flex-1 py-2 px-3.5 rounded-xl border border-neutral-200 dark:border-[#272a38] bg-white hover:bg-neutral-100 dark:bg-[#1a1d27] dark:hover:bg-[#252837] text-neutral-700 dark:text-neutral-300 font-semibold text-xs sm:text-sm transition-colors cursor-pointer text-center"
          >
            {defaultCancelText}
          </button>

          <button
            type="button"
            onClick={() => {
              onConfirm();
              onClose();
            }}
            disabled={isLoading}
            className={`flex-1 py-2 px-3.5 rounded-xl font-semibold text-xs sm:text-sm transition-all shadow-md active:scale-95 cursor-pointer flex items-center justify-center gap-1.5 ${
              variant === 'danger'
                ? 'bg-red-600 hover:bg-red-700 text-white shadow-red-600/20'
                : variant === 'warning'
                ? 'bg-amber-600 hover:bg-amber-700 text-white shadow-amber-600/20'
                : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-600/20'
            }`}
          >
            {variant === 'danger' && <Trash2 className="w-3.5 h-3.5" />}
            <span>{defaultConfirmText}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
