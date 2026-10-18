import React, { useState } from 'react';
import {
  X,
  User,
  LogOut,
  Mail,
  Camera,
  Globe,
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
        <div className="p-5 sm:p-6 space-y-4 text-xs">
          {/* User Profile Card */}
          <div className="p-4 rounded-2xl border border-neutral-200/90 dark:border-[#272a35] bg-neutral-50/70 dark:bg-[#161822]">
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
          </div>

          {/* Compact Language Preference Row */}
          <div className="flex items-center justify-between p-3 px-3.5 rounded-xl border border-neutral-200/80 dark:border-[#272a35] bg-white dark:bg-[#161822]">
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-neutral-500 dark:text-neutral-400" />
              <span className="text-xs font-semibold text-neutral-800 dark:text-neutral-200">
                {t('appLanguage')}
              </span>
            </div>

            <div className="flex items-center p-0.5 rounded-lg bg-neutral-100 dark:bg-[#20232c] text-xs">
              <button
                type="button"
                onClick={() => setLanguage('id')}
                className={`px-3 py-1 rounded-md font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                  language === 'id'
                    ? 'bg-white dark:bg-[#2b2f3d] text-red-600 dark:text-red-400 shadow-xs'
                    : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
                }`}
              >
                <span>🇮🇩</span>
                <span>ID</span>
              </button>
              <button
                type="button"
                onClick={() => setLanguage('en')}
                className={`px-3 py-1 rounded-md font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                  language === 'en'
                    ? 'bg-white dark:bg-[#2b2f3d] text-red-600 dark:text-red-400 shadow-xs'
                    : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
                }`}
              >
                <span>🇬🇧</span>
                <span>EN</span>
              </button>
            </div>
          </div>

          {/* Clean Logout Button */}
          <button
            type="button"
            onClick={handleLogoutClick}
            disabled={isLoggingOut}
            className="w-full h-10 rounded-xl border border-red-500/30 text-red-600 dark:text-red-400 hover:bg-red-500/10 active:scale-98 font-semibold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs"
          >
            <LogOut className="w-4 h-4" />
            <span>{t('logoutBtn')}</span>
          </button>
        </div>

        {/* Footer */}
        <div className="p-3 px-6 border-t border-neutral-200 dark:border-[#20232c] bg-neutral-50/50 dark:bg-[#12141a] flex items-center justify-end">
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
