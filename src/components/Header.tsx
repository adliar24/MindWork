import React from 'react';
import {
  Search,
  Moon,
  Sun,
  Plus,
  UserPlus,
  Menu,
  X,
  SlidersHorizontal,
  UserCheck,
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
  onGoHome,
}) => {
  const { t } = useLanguage();

  return (
    <header className="h-14 sm:h-16 border-b border-neutral-200 dark:border-[#20232c] bg-white dark:bg-[#101116] px-2.5 sm:px-4 md:px-6 flex items-center justify-between gap-2 sm:gap-4 shrink-0 transition-colors">
      {/* Left Zone: Hamburger + Active Project Info */}
      <div className="flex items-center gap-1.5 sm:gap-3 min-w-0">
        <button
          onClick={onToggleSidebarMobile}
          className="lg:hidden p-1.5 sm:p-2 rounded-lg text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-900 transition-colors cursor-pointer"
          aria-label="Menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="min-w-0">
          <div className="flex items-center gap-1.5 sm:gap-2">
            {project ? (
              <div className="flex items-center gap-1.5 sm:gap-2">
                <button
                  type="button"
                  onClick={onGoHome}
                  className="text-xs sm:text-sm font-medium text-neutral-500 hover:text-red-600 dark:hover:text-red-400 transition-colors cursor-pointer"
                >
                  {t('home')}
                </button>
                <span className="text-neutral-300 dark:text-neutral-700 text-xs">/</span>
                <h1 className="text-sm sm:text-base font-bold text-neutral-950 dark:text-white truncate max-w-[120px] xs:max-w-[180px] sm:max-w-none">
                  {project.name}
                </h1>
                <span className="hidden sm:inline-flex text-[11px] font-mono font-medium px-2 py-0.5 rounded bg-neutral-100 dark:bg-neutral-900 text-neutral-600 dark:text-neutral-400 border border-neutral-200 dark:border-neutral-800">
                  {project.key}
                </span>
              </div>
            ) : (
              <h1 className="text-sm sm:text-base font-bold text-neutral-950 dark:text-white truncate">
                {t('workspaceHome')}
              </h1>
            )}
          </div>
        </div>
      </div>

      {/* Middle Zone: Team Avatars & Search */}
      <div className="flex items-center gap-1.5 sm:gap-2.5 md:gap-4 flex-1 justify-end max-w-2xl min-w-0">
        {/* Team Avatars with access & click to filter (Only if project exists) */}
        {project && (
          <div className="hidden sm:flex items-center -space-x-1.5 shrink-0">
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
              <div className="w-7 h-7 rounded-full flex items-center justify-center font-bold text-[10px] bg-neutral-200 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 ring-2 ring-white dark:ring-neutral-950">
                +{projectMembers.length - 4}
              </div>
            )}
            <button
              onClick={onOpenInviteModal}
              title={t('inviteTitle')}
              className="w-7 h-7 ml-2.5 rounded-full flex items-center justify-center border border-dashed border-neutral-300 dark:border-neutral-700 text-neutral-500 hover:border-red-600 hover:text-red-600 dark:hover:border-red-500 dark:hover:text-red-400 hover:bg-red-600/5 transition-all cursor-pointer"
            >
              <UserPlus className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Quick Filter: "Tugas Saya" */}
        <button
          type="button"
          onClick={() =>
            onSelectAssignee(selectedAssigneeId === currentUser.id ? null : currentUser.id)
          }
          title={t('myTasks')}
          className={`flex items-center gap-1.5 h-8 sm:h-9 px-2 sm:px-3 rounded-lg text-xs font-semibold transition-all shrink-0 cursor-pointer ${
            selectedAssigneeId === currentUser.id
              ? 'bg-red-600 text-white shadow-xs shadow-red-600/30 ring-2 ring-red-500/50'
              : 'bg-neutral-100 dark:bg-[#181a22] border border-neutral-200 dark:border-[#272a35] text-neutral-700 dark:text-neutral-300 hover:border-red-500/50 hover:text-red-600 dark:hover:text-red-400'
          }`}
        >
          <UserCheck className="w-3.5 h-3.5" />
          <span className="hidden md:inline">{t('myTasks')}</span>
        </button>

        {/* Global Search Bar */}
        <div className="relative w-24 sm:w-40 md:w-56 shrink">
          <Search className="w-3.5 h-3.5 sm:w-4 sm:h-4 absolute left-2.5 sm:left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={t('searchPlaceholder')}
            className="w-full h-8 sm:h-9 pl-8 sm:pl-9 pr-6 sm:pr-8 text-xs rounded-lg bg-neutral-100 dark:bg-[#181a22] border border-neutral-200 dark:border-[#272a35]
              text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 dark:placeholder-neutral-500
              focus:outline-none focus:border-red-600 dark:focus:border-red-500 transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Theme Toggle (Dark / Light) */}
        <button
          onClick={onToggleTheme}
          title={theme === 'dark' ? t('themeDark') : t('themeLight')}
          className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-lg border border-neutral-200 dark:border-[#272a35] bg-neutral-100 dark:bg-[#181a22] text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white transition-all shrink-0 cursor-pointer"
        >
          {theme === 'dark' ? (
            <Sun className="w-4 h-4 text-amber-400" />
          ) : (
            <Moon className="w-4 h-4 text-neutral-600" />
          )}
        </button>

        {/* Active Logged-in User Profile Pill (Opens Auth / Account Modal) */}
        <button
          onClick={onOpenAuthModal}
          title={`${currentUser.name} (${currentUser.email})`}
          className="flex items-center gap-1.5 sm:gap-2 h-8 sm:h-9 px-1.5 sm:px-2.5 rounded-lg border border-neutral-200 dark:border-[#272a35] bg-neutral-100 dark:bg-[#181a22] hover:border-red-500/60 transition-all shrink-0 cursor-pointer group"
        >
          <UserAvatar
            avatar={currentUser.avatar}
            name={currentUser.name}
            color={currentUser.color}
            className="w-5 h-5 sm:w-6 sm:h-6 text-[9px] sm:text-[10px] shadow-xs"
          />
          <span className="hidden md:inline text-xs font-semibold text-neutral-800 dark:text-neutral-200 max-w-[200px] truncate">
            {currentUser.name}
          </span>
        </button>

        {/* Primary Action Button: + Tugas or + Proyek */}
        {project ? (
          <button
            disabled={currentUserRole === 'viewer'}
            onClick={onOpenNewTaskModal}
            className={`flex items-center gap-1 sm:gap-1.5 h-8 sm:h-9 px-2.5 sm:px-3 rounded-lg text-xs font-semibold shadow-xs transition-all shrink-0 ${
              currentUserRole === 'viewer'
                ? 'bg-neutral-300 dark:bg-neutral-800 text-neutral-500 cursor-not-allowed opacity-60'
                : 'bg-red-600 hover:bg-red-700 active:scale-98 text-white shadow-red-600/30 cursor-pointer'
            }`}
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span className="hidden xs:inline">{t('newTask')}</span>
          </button>
        ) : (
          <button
            onClick={onOpenNewProjectModal}
            title={t('createNewProject')}
            className="flex items-center gap-1 sm:gap-1.5 h-8 sm:h-9 px-3 rounded-lg text-xs font-semibold shadow-xs transition-all shrink-0 bg-red-600 hover:bg-red-700 active:scale-98 text-white shadow-red-600/30 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span className="hidden xs:inline">{t('newProject')}</span>
          </button>
        )}
      </div>
    </header>
  );
};

