import React, { useState } from 'react';
import {
  X,
  User,
  LogOut,
  Mail,
  Camera,
  CheckCircle2,
  Lock,
  Globe,
  Check,
} from 'lucide-react';
import { ProjectRole, User as UserType } from '../types';
import { AvatarPickerModal } from './AvatarPickerModal';
import { UserAvatar } from './UserAvatar';
import { useLanguage } from '../context/LanguageContext';

interface AuthModalProps {
  currentUser: UserType;
  allUsers?: UserType[];
  currentUserRole?: ProjectRole;
  activeProjectName?: string;
  onSelectUser?: (user: UserType) => void;
  onRegisterUser?: (newUser: UserType) => void;
  onUpdateUser?: (updatedUser: UserType) => void;
  onClose: () => void;
  onLogout?: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  currentUser,
  onUpdateUser,
  onClose,
  onLogout,
}) => {
  const { language, setLanguage, t } = useLanguage();

  // Avatar selection state
  const [isAvatarPickerOpen, setIsAvatarPickerOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleClose = () => {
    if (isClosing) return;
    setIsClosing(true);
    setTimeout(() => {
      onClose();
    }, 180);
  };

  const handleAvatarChange = (newAvatar: string) => {
    if (onUpdateUser) {
      onUpdateUser({
        ...currentUser,
        avatar: newAvatar,
      });
    }
  };

  const handleLogoutClick = () => {
    setIsLoggingOut(true);
    setIsClosing(true);
    setTimeout(() => {
      if (onLogout) {
        onLogout();
      }
      onClose();
    }, 180);
  };

  return (
    <div
      onClick={handleClose}
      className={`fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-xs overflow-y-auto cursor-pointer ${
        isClosing ? 'animate-backdrop-out' : 'animate-in fade-in'
      }`}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`w-full max-w-md rounded-2xl bg-white dark:bg-[#12141a] border border-neutral-200 dark:border-[#272a35] shadow-2xl overflow-hidden text-neutral-900 dark:text-neutral-100 flex flex-col cursor-default ${
          isClosing ? 'animate-modal-out' : 'animate-modal-in'
        }`}
      >
        {/* Header */}
        <div className="p-4 px-6 border-b border-neutral-200 dark:border-[#20232c] flex items-center justify-between bg-white dark:bg-[#12141a] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-red-600/10 text-red-600 dark:text-red-400 flex items-center justify-center border border-red-500/20 font-bold">
              <User className="w-4 h-4 stroke-[2.2]" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-neutral-900 dark:text-white">
                {t('profileTitle')}
              </h3>
              <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                {t('profileSubtitle')}
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 text-neutral-400 hover:text-neutral-900 dark:hover:text-white rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body Content */}
        <div className="p-6 space-y-4 text-xs">
          {/* User Profile Card */}
          <div className="p-4 rounded-xl border border-neutral-200/90 dark:border-[#272a35] bg-neutral-50/70 dark:bg-[#161822] space-y-3.5">
            <div className="flex items-center gap-3.5">
              {/* Avatar with Camera badge */}
              <button
                type="button"
                onClick={() => setIsAvatarPickerOpen(true)}
                className="relative group shrink-0 cursor-pointer focus:outline-none"
                title={t('changeAvatar')}
              >
                <div className="w-14 h-14 rounded-full overflow-hidden bg-white dark:bg-[#1b1e28] border-2 border-neutral-200 dark:border-[#313543] group-hover:border-red-500 transition-all p-0.5 shadow-xs">
                  <UserAvatar
                    avatar={currentUser.avatar}
                    name={currentUser.name}
                    color={currentUser.color}
                    className="w-full h-full text-base"
                  />
                </div>
                <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-red-600 text-white flex items-center justify-center shadow-xs group-hover:scale-110 transition-transform">
                  <Camera className="w-2.5 h-2.5" />
                </div>
              </button>

              {/* Name, Username, Email */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h4 className="font-bold text-sm text-neutral-900 dark:text-white truncate">
                    {currentUser.name}
                  </h4>
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shrink-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    {t('activeBadge')}
                  </span>
                </div>

                <p className="text-[11px] text-neutral-500 dark:text-neutral-400 font-medium truncate mt-0.5">
                  {currentUser.username ? `@${currentUser.username}` : '-'}
                </p>

                <p className="text-[11px] text-neutral-400 dark:text-neutral-500 truncate flex items-center gap-1.5 mt-0.5">
                  <Mail className="w-3 h-3 text-neutral-400 shrink-0" />
                  <span>{currentUser.email}</span>
                </p>
              </div>
            </div>

            {/* Quick button to change avatar */}
            <div className="pt-2 border-t border-neutral-200/60 dark:border-[#20232c] flex items-center justify-between">
              <span className="text-[11px] text-neutral-500 dark:text-neutral-400">
                {t('avatarPickerTitle')}
              </span>
              <button
                type="button"
                onClick={() => setIsAvatarPickerOpen(true)}
                className="text-[11px] font-semibold text-red-600 dark:text-red-400 hover:underline cursor-pointer"
              >
                {t('changeAvatar')}
              </button>
            </div>
          </div>

          {/* Language Preference Card (Bahasa Indonesia Bawaan & English Opsional) */}
          <div className="rounded-xl border border-neutral-200/80 dark:border-[#272a35] bg-white dark:bg-[#161822] p-3.5 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                  <Globe className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h4 className="font-bold text-xs text-neutral-900 dark:text-white">
                    {t('appLanguage')}
                  </h4>
                  <p className="text-[10px] text-neutral-500 dark:text-neutral-400">
                    {t('appLanguageDesc')}
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              {/* Bahasa Indonesia Button */}
              <button
                type="button"
                onClick={() => setLanguage('id')}
                className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-1.5 ${
                  language === 'id'
                    ? 'border-red-500 bg-red-50/50 dark:bg-red-950/20 shadow-xs ring-1 ring-red-500/40'
                    : 'border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700 bg-neutral-50/50 dark:bg-neutral-900/40'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-base leading-none">🇮🇩</span>
                  {language === 'id' && (
                    <div className="w-4 h-4 rounded-full bg-red-600 text-white flex items-center justify-center">
                      <Check className="w-2.5 h-2.5 stroke-[3]" />
                    </div>
                  )}
                </div>
                <div>
                  <p className="font-bold text-xs text-neutral-900 dark:text-white">
                    {t('langIdLabel')}
                  </p>
                  <span className="inline-block text-[9px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.2 rounded mt-0.5">
                    {t('defaultBadge')}
                  </span>
                </div>
              </button>

              {/* English Button */}
              <button
                type="button"
                onClick={() => setLanguage('en')}
                className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-1.5 ${
                  language === 'en'
                    ? 'border-red-500 bg-red-50/50 dark:bg-red-950/20 shadow-xs ring-1 ring-red-500/40'
                    : 'border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700 bg-neutral-50/50 dark:bg-neutral-900/40'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-base leading-none">🇬🇧</span>
                  {language === 'en' && (
                    <div className="w-4 h-4 rounded-full bg-red-600 text-white flex items-center justify-center">
                      <Check className="w-2.5 h-2.5 stroke-[3]" />
                    </div>
                  )}
                </div>
                <div>
                  <p className="font-bold text-xs text-neutral-900 dark:text-white">
                    {t('langEnLabel')}
                  </p>
                  <span className="inline-block text-[9px] font-semibold text-neutral-500 dark:text-neutral-400 bg-neutral-200 dark:bg-neutral-800 px-1.5 py-0.2 rounded mt-0.5">
                    {t('optionalBadge')}
                  </span>
                </div>
              </button>
            </div>
          </div>

          {/* Account Security Details */}
          <div className="rounded-xl border border-neutral-200/80 dark:border-[#272a35] bg-white dark:bg-[#161822] p-3.5 space-y-2.5">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-neutral-500 dark:text-neutral-400 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-neutral-400" />
                {t('accountEmail')}:
              </span>
              <span className="font-semibold text-neutral-800 dark:text-neutral-200 truncate max-w-[200px]">
                {currentUser.email}
              </span>
            </div>

            <div className="flex items-center justify-between text-[11px] pt-1.5 border-t border-neutral-100 dark:border-[#20232c]">
              <span className="text-neutral-500 dark:text-neutral-400 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-neutral-400" />
                {t('accountUsername')}:
              </span>
              <span className="font-semibold text-neutral-800 dark:text-neutral-200">
                {currentUser.username ? `@${currentUser.username}` : '-'}
              </span>
            </div>

            <div className="flex items-center justify-between text-[11px] pt-1.5 border-t border-neutral-100 dark:border-[#20232c]">
              <span className="text-neutral-500 dark:text-neutral-400 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-neutral-400" />
                {t('authStatus')}:
              </span>
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="w-3 h-3" />
                {t('authConnected')}
              </span>
            </div>
          </div>

          {/* Logout Action Box */}
          <div className="p-3.5 rounded-xl border border-red-500/20 bg-red-500/5 dark:bg-red-950/15 flex items-center justify-between gap-3">
            <div>
              <p className="font-semibold text-xs text-neutral-900 dark:text-white">
                {t('logoutTitle')}
              </p>
              <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                {t('logoutDesc')}
              </p>
            </div>

            <button
              type="button"
              onClick={handleLogoutClick}
              disabled={isLoggingOut}
              className="px-3.5 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 active:scale-95 text-white font-semibold text-xs shadow-xs transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>{t('logoutBtn')}</span>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3.5 px-6 border-t border-neutral-200 dark:border-[#20232c] bg-neutral-50/50 dark:bg-[#12141a] flex items-center justify-end">
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-1.5 rounded-xl text-xs font-semibold bg-neutral-200 dark:bg-[#20232c] hover:bg-neutral-300 dark:hover:bg-[#2a2d38] text-neutral-800 dark:text-neutral-200 transition-colors cursor-pointer"
          >
            {t('closeBtn')}
          </button>
        </div>
      </div>

      {/* Avatar Picker Modal */}
      <AvatarPickerModal
        isOpen={isAvatarPickerOpen}
        selectedAvatar={currentUser.avatar}
        onSelectAvatar={(newAvatar) => {
          handleAvatarChange(newAvatar);
        }}
        onClose={() => setIsAvatarPickerOpen(false)}
      />
    </div>
  );
};
