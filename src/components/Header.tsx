import React, { useState } from 'react';
import {
  Search,
  Moon,
  Sun,
  UserPlus,
  Menu,
  X,
  Database,
  PanelLeftClose,
  PanelLeftOpen,
  Layers,
} from 'lucide-react';
import { Project, ProjectRole, ThemeMode, User } from '../types';
import { UserAvatar } from './UserAvatar';
import { useLanguage } from '../context/LanguageContext';

interface HeaderProps {
  project?: Project | null;
  projectMembers: User[];
  allUsers: User[];
  currentUser: User;
  currentUserRole: ProjectRole;
  selectedAssigneeId: string | null;
  onSelectAssignee: (assigneeId: string | null) => void;
  theme: ThemeMode;
  onToggleTheme: () => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onOpenNewTaskModal: () => void;
  onOpenNewProjectModal?: () => void;
  onOpenInviteModal: () => void;
  onOpenAuthModal: () => void;
  onOpenCloudModal?: () => void;
  cloudStatus?: { connected: boolean; tableReady: boolean; message?: string };
  onToggleSidebarMobile: () => void;
  isSidebarCollapsed?: boolean;
  onToggleSidebarDesktop?: () => void;
  selectedPriority?: string | null;
  onSelectPriority?: (priority: string | null) => void;
  onGoHome?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  project,
  projectMembers,
  currentUser,
  currentUserRole,
  selectedAssigneeId,
  onSelectAssignee,
  theme,
  onToggleTheme,
  searchQuery,
  onSearchChange,
  onOpenNewTaskModal,
  onOpenNewProjectModal,
  onOpenInviteModal,
  onOpenAuthModal,
  onOpenCloudModal,
  cloudStatus,
  onToggleSidebarMobile,
  isSidebarCollapsed = false,
  onToggleSidebarDesktop,
  onGoHome,
}) => {
  const { t, language } = useLanguage();
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);

  return (
    <header className="border-b border-neutral-200 dark:border-[#20232c] bg-white dark:bg-[#101116] shrink-0 transition-colors">
      {/* Primary Top Bar */}
      <div className="h-14 sm:h-16 px-3 sm:px-5 md:px-6 flex items-center justify-between gap-2 sm:gap-4">
        {/* Left: Hamburger + Desktop Sidebar Toggle + Project Name / Breadcrumbs */}
        <div className="flex items-center gap-1.5 sm:gap-3 min-w-0">
          <button
            onClick={onToggleSidebarMobile}
            className="lg:hidden p-1.5 sm:p-2 rounded-xl text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-[#1c1f28] transition-colors cursor-pointer"
            aria-label="Menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Desktop Sidebar Toggle Button (Hide / Unhide) */}
          {onToggleSidebarDesktop && (
            <button
              type="button"
              onClick={onToggleSidebarDesktop}
              className={`hidden lg:inline-flex items-center justify-center p-2 rounded-xl transition-all cursor-pointer ${
                isSidebarCollapsed
                  ? 'bg-neutral-100 dark:bg-[#1c1f28] text-red-600 dark:text-red-400 ring-1 ring-red-500/30 hover:bg-neutral-200 dark:hover:bg-[#252834]'
                  : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-[#1c1f28]'
              }`}
              title={isSidebarCollapsed ? t('showSidebar') : t('hideSidebar')}
              aria-label={isSidebarCollapsed ? t('showSidebar') : t('hideSidebar')}
            >
              {isSidebarCollapsed ? (
                <PanelLeftOpen className="w-4 h-4 sm:w-5 sm:h-5 text-red-600 dark:text-red-400" />
              ) : (
                <PanelLeftClose className="w-4 h-4 sm:w-5 sm:h-5" />
              )}
            </button>
          )}

          {/* If desktop sidebar is collapsed, show brand logo + title for quick home navigation */}
          {isSidebarCollapsed && (
            <div
              onClick={onGoHome}
              className="hidden lg:flex items-center gap-2 cursor-pointer group pr-1 select-none"
              title={t('workspaceHome')}
            >
              <div className="w-7 h-7 rounded-lg bg-red-600 flex items-center justify-center text-white shadow-xs font-bold group-hover:scale-105 transition-transform">
                <Layers className="w-3.5 h-3.5 stroke-[2.2]" />
              </div>
              <span className="font-bold tracking-tight text-neutral-950 dark:text-white text-xs">
                MINDWORK
              </span>
            </div>
          )}

          <div className="min-w-0">
            {project ? (
              <div className="flex items-center gap-1.5 sm:gap-2">
                <button
                  type="button"
                  onClick={onGoHome}
                  className="text-xs sm:text-sm font-semibold text-neutral-600 hover:text-red-600 dark:text-neutral-300 dark:hover:text-red-400 transition-colors cursor-pointer shrink-0"
                >
                  {t('home')}
                </button>
                <span className="text-neutral-400 dark:text-neutral-600 text-xs font-bold">/</span>
                <h1 className="text-sm sm:text-base font-bold text-neutral-950 dark:text-white truncate max-w-[150px] xs:max-w-[220px] sm:max-w-xs md:max-w-none">
                  {project.name}
                </h1>
              </div>
            ) : (
              <h1 className="text-sm sm:text-lg font-bold text-neutral-950 dark:text-white truncate">
                {t('workspaceHome')}
              </h1>
            )}
          </div>
        </div>

        {/* Right Zone: Actions cleanly spaced */}
        <div className="flex items-center gap-1.5 sm:gap-2 md:gap-3 shrink-0">
          {/* Desktop Team Avatars (hidden on mobile) */}
          {project && (
            <div className="hidden lg:flex items-center -space-x-1.5 shrink-0 mr-1">
              {projectMembers.slice(0, 4).map((member) => {
                const isSelected = selectedAssigneeId === member.id;
                const memberRole =
                  project.memberRoles?.[member.id] ||
                  (project.leaderId === member.id ? 'leader' : 'member');
                return (
                  <button
                    key={member.id}
                    type="button"
                    onClick={() => onSelectAssignee(isSelected ? null : member.id)}
                    title={`${member.name} • ${memberRole.toUpperCase()}${
                      isSelected ? ' (Reset)' : ''
                    }`}
                    className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-[10px] cursor-pointer transition-transform hover:scale-110 active:scale-95 ${
                      isSelected
                        ? 'ring-2 ring-red-500 scale-110 z-10 shadow-md'
                        : 'ring-2 ring-white dark:ring-neutral-950 shadow-xs opacity-90 hover:opacity-100'
                    }`}
                  >
                    <UserAvatar
                      avatar={member.avatar}
                      name={member.name}
                      color={member.color}
                      className="w-full h-full text-[10px]"
                    />
                  </button>
                );
              })}
              {projectMembers.length > 4 && (
                <div className="w-7 h-7 rounded-full flex items-center justify-center font-bold text-[10px] bg-neutral-200 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 ring-2 ring-white dark:ring-neutral-950">
                  +{projectMembers.length - 4}
                </div>
              )}
              <button
                onClick={onOpenInviteModal}
                title={t('inviteTitle')}
                className="w-7 h-7 ml-2 rounded-full flex items-center justify-center border border-dashed border-neutral-300 dark:border-neutral-700 text-neutral-500 hover:border-red-600 hover:text-red-600 dark:hover:border-red-500 dark:hover:text-red-400 hover:bg-red-600/5 transition-all cursor-pointer"
              >
                <UserPlus className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Mobile Search Toggle Button (visible only on mobile) */}
          <button
            type="button"
            onClick={() => setIsMobileSearchOpen(!isMobileSearchOpen)}
            title={t('searchPlaceholder')}
            className={`sm:hidden w-8 h-8 rounded-xl flex items-center justify-center transition-all cursor-pointer relative ${
              isMobileSearchOpen || searchQuery
                ? 'bg-red-600/10 text-red-600 dark:bg-red-500/15 dark:text-red-400 border border-red-500/30'
                : 'bg-neutral-100 dark:bg-[#181a22] border border-neutral-200 dark:border-[#272a35] text-neutral-700 dark:text-neutral-300 hover:text-neutral-950 dark:hover:text-white'
            }`}
          >
            <Search className="w-4 h-4" />
            {searchQuery && (
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-red-600 rounded-full" />
            )}
          </button>

          {/* Desktop Search Bar (hidden on mobile) */}
          <div className="hidden sm:block relative w-36 md:w-52 lg:w-64">
            <Search className="w-3.5 h-3.5 sm:w-4 sm:h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={t('searchPlaceholder')}
              className="w-full h-8 sm:h-9 pl-9 pr-7 text-xs sm:text-sm rounded-xl bg-neutral-100 dark:bg-[#181a22] border border-neutral-200 dark:border-[#272a35]
                text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 dark:placeholder-neutral-500 font-medium
                focus:outline-none focus:border-red-600 dark:focus:border-red-500 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => onSearchChange('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Cloud Database & Sync Pill */}
          {onOpenCloudModal && (
            <button
              type="button"
              onClick={onOpenCloudModal}
              title={
                cloudStatus?.connected
                  ? 'Cloud Supabase Terhubung • Klik untuk sinkronisasi'
                  : 'Koneksi Cloud Supabase • Klik untuk setup'
              }
              className={`flex items-center gap-1.5 h-8 sm:h-9 px-2 sm:px-2.5 rounded-xl border text-xs font-bold transition-all shrink-0 cursor-pointer ${
                cloudStatus?.connected
                  ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/20'
                  : 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400 hover:bg-amber-500/20'
              }`}
            >
              <Database className="w-3.5 h-3.5" />
              <span className="hidden md:inline text-xs">
                {cloudStatus?.connected ? 'Cloud Sync' : 'Cloud Setup'}
              </span>
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  cloudStatus?.connected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
                }`}
              />
            </button>
          )}

          {/* Theme Toggle Button */}
          <button
            type="button"
            onClick={onToggleTheme}
            title={theme === 'dark' ? t('themeDark') : t('themeLight')}
            className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-xl border border-neutral-200 dark:border-[#272a35] bg-neutral-100 dark:bg-[#181a22] text-neutral-700 dark:text-neutral-300 hover:text-neutral-950 dark:hover:text-white transition-all shrink-0 cursor-pointer active:scale-90"
          >
            <div className={`transition-transform duration-300 ease-out ${theme === 'dark' ? 'rotate-0' : 'rotate-90'}`}>
              {theme === 'dark' ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4 text-neutral-600" />
              )}
            </div>
          </button>

          {/* User Profile Avatar Pill */}
          <button
            type="button"
            onClick={onOpenAuthModal}
            title={`${currentUser.name} (${currentUser.email})`}
            className="flex items-center gap-1.5 h-8 sm:h-9 p-1 sm:px-2 rounded-xl border border-neutral-200 dark:border-[#272a35] bg-neutral-100 dark:bg-[#181a22] hover:border-red-500/60 transition-all shrink-0 cursor-pointer"
          >
            <UserAvatar
              avatar={currentUser.avatar}
              name={currentUser.name}
              color={currentUser.color}
              className="w-6 h-6 text-xs font-bold shadow-xs"
            />
            <span className="hidden lg:inline text-xs sm:text-sm font-bold text-neutral-900 dark:text-neutral-100 max-w-[130px] truncate">
              {currentUser.name}
            </span>
          </button>
        </div>
      </div>

      {/* Expandable Mobile Search Drawer */}
      {isMobileSearchOpen && (
        <div className="sm:hidden px-3 py-2 bg-neutral-50 dark:bg-[#0c0d12] border-t border-neutral-200 dark:border-[#20232c] flex items-center gap-2 animate-in fade-in">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              autoFocus
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={t('searchPlaceholder')}
              className="w-full h-9 pl-9 pr-7 text-xs sm:text-sm rounded-xl bg-white dark:bg-[#161821] border border-neutral-200 dark:border-[#272a35] text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 dark:placeholder-neutral-500 font-medium focus:outline-none focus:border-red-600 dark:focus:border-red-500"
            />
            {searchQuery && (
              <button
                onClick={() => onSearchChange('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 p-1 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={() => setIsMobileSearchOpen(false)}
            className="text-xs sm:text-sm font-bold text-neutral-600 hover:text-neutral-950 dark:text-neutral-400 dark:hover:text-white px-2 py-1 cursor-pointer"
          >
            {language === 'id' ? 'Tutup' : 'Close'}
          </button>
        </div>
      )}
    </header>
  );
};

