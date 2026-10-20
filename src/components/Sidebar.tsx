import React from 'react';
import {
  FolderKanban,
  Plus,
  Users,
  CheckCircle2,
  FolderOpen,
  Filter,
  X,
  Layers,
  ChevronRight,
  Home,
  PanelLeftClose,
} from 'lucide-react';
import { Project, User, Task } from '../types';
import { UserAvatar } from './UserAvatar';
import { useLanguage } from '../context/LanguageContext';

interface SidebarProps {
  projects: Project[];
  activeProjectId: string;
  currentUserId?: string;
  onSelectProject: (projectId: string) => void;
  onOpenNewProjectModal: () => void;
  users: User[];
  tasks: Task[];
  selectedAssigneeId: string | null;
  onSelectAssignee: (assigneeId: string | null) => void;
  isOpen: boolean;
  onCloseMobile: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = React.memo(({
  projects,
  activeProjectId,
  currentUserId,
  onSelectProject,
  onOpenNewProjectModal,
  users,
  tasks,
  selectedAssigneeId,
  onSelectAssignee,
  isOpen,
  onCloseMobile,
  isCollapsed = false,
  onToggleCollapse,
}) => {
  const { t } = useLanguage();

  // Task completion stats for the current project
  const projectTasks = React.useMemo(() => {
    if (!activeProjectId) return [];
    return tasks.filter((t) => t.projectId === activeProjectId);
  }, [tasks, activeProjectId]);

  const doneTasks = React.useMemo(() => {
    return projectTasks.filter(
      (t) => t.columnId === 'done' || Boolean(t.isCompleted) || (t.checklist && t.checklist.length > 0 && t.checklist.every((c) => c.completed))
    ).length;
  }, [projectTasks]);

  const totalTasks = projectTasks.length;
  const progressPercent = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 z-40 bg-black/70 lg:hidden transition-opacity cursor-pointer"
        />
      )}

      <aside
        className={`fixed lg:static top-0 bottom-0 left-0 z-50 flex flex-col shrink-0 transition-[width,transform] duration-200 ease-in-out
        bg-white dark:bg-[#101116] text-neutral-800 dark:text-neutral-200 overflow-hidden
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        ${
          isCollapsed
            ? 'w-72 lg:w-0 lg:border-r-0 lg:pointer-events-none'
            : 'w-72 lg:w-76 border-r border-neutral-200 dark:border-[#20232c]'
        }`}
      >
        <div className="w-72 lg:w-76 flex flex-col h-full shrink-0">
          {/* Brand Header */}
          <div className="h-16 px-5 flex items-center justify-between border-b border-neutral-200 dark:border-[#20232c] shrink-0">
            <div
              onClick={() => {
                onSelectProject('');
                onCloseMobile();
              }}
              className="flex items-center gap-2.5 cursor-pointer group"
            >
              <div className="w-8 h-8 rounded-lg bg-red-600 flex items-center justify-center text-white shadow-xs font-bold group-hover:scale-105 transition-transform">
                <Layers className="w-4 h-4 stroke-[2.2]" />
              </div>
              <div>
                <span className="font-extrabold tracking-tight text-neutral-950 dark:text-white text-sm sm:text-base">
                  MINDWORK
                </span>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 font-semibold leading-none">
                  Team Workspace
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {/* Desktop Hide/Collapse Button */}
              {onToggleCollapse && (
                <button
                  type="button"
                  onClick={onToggleCollapse}
                  className="hidden lg:flex items-center justify-center p-1.5 rounded-lg text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-[#181a22] transition-colors cursor-pointer"
                  title={t('hideSidebar')}
                  aria-label={t('hideSidebar')}
                >
                  <PanelLeftClose className="w-4 h-4" />
                </button>
              )}
              {/* Mobile Close Button */}
              <button
                type="button"
                onClick={onCloseMobile}
                className="lg:hidden p-1.5 text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white rounded-md cursor-pointer"
                aria-label="Tutup Menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

        {/* Scrollable navigation area */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">
          {/* Main Navigation Item: Beranda */}
          <div>
            <button
              type="button"
              onClick={() => {
                onSelectProject('');
                onCloseMobile();
              }}
              className={`w-full group text-left px-3.5 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2.5 cursor-pointer ${
                !activeProjectId
                  ? 'bg-red-600 text-white shadow-xs font-bold'
                  : 'text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-[#181a22] hover:text-neutral-950 dark:hover:text-white'
              }`}
            >
              <Home className="w-4 h-4 shrink-0" />
              <span>{t('home')}</span>
            </button>
          </div>

          {/* Projects Section */}
          <div>
            <div className="flex items-center justify-between px-2 mb-2">
              <div className="flex items-center gap-1.5 text-xs sm:text-sm font-bold text-neutral-800 dark:text-neutral-200">
                <FolderKanban className="w-4 h-4 text-red-600 dark:text-red-400" />
                <span>{t('myProjects')}</span>
                <span className="text-xs font-mono font-bold tabular-nums text-neutral-500 dark:text-neutral-400">
                  ({projects.length})
                </span>
              </div>
            </div>

            {projects.length === 0 ? (
              <div className="px-3 py-3 text-center border border-dashed border-neutral-200 dark:border-neutral-800 rounded-xl">
                <p className="text-xs text-neutral-500 dark:text-neutral-400 font-medium">
                  {t('noProjectsYet')}
                </p>
              </div>
            ) : (
              <div className="space-y-1">
                {projects.map((project) => {
                  const isActive = project.id === activeProjectId;
                  const count = tasks.filter((t) => t.projectId === project.id).length;

                  return (
                    <button
                      key={project.id}
                      onClick={() => {
                        onSelectProject(project.id);
                        onCloseMobile();
                      }}
                      className={`w-full group text-left px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center justify-between
                        ${
                          isActive
                            ? 'bg-red-600/10 text-red-600 dark:text-red-400 font-bold'
                            : 'text-neutral-800 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-900'
                        }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0 pr-2">
                        <div
                          className={`w-2 h-2 rounded-full shrink-0 ${
                            isActive ? 'bg-red-600 dark:bg-red-500' : 'bg-neutral-400 dark:bg-neutral-500'
                          }`}
                        />
                        <span className="truncate">{project.name}</span>
                      </div>
                      <span
                        className={`text-xs font-mono font-bold px-2 py-0.5 rounded-full shrink-0 tabular-nums ${
                          isActive
                            ? 'bg-red-600 text-white'
                            : 'bg-neutral-200 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200'
                        }`}
                      >
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* + Proyek Button */}
            <button
              onClick={() => {
                onOpenNewProjectModal();
                onCloseMobile();
              }}
              className="mt-2 w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs sm:text-sm font-bold
                border border-dashed border-neutral-300 dark:border-neutral-800 text-neutral-700 dark:text-neutral-300
                hover:border-red-500 hover:text-red-600 dark:hover:text-red-400 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>{t('addProject')}</span>
            </button>
          </div>

          {/* Team Members Section (Hanya tampil saat proyek aktif / diklik) */}
          {Boolean(activeProjectId) && (
            <div>
              <div className="flex items-center justify-between px-2 mb-2">
                <div className="flex items-center gap-1.5 text-xs sm:text-sm font-bold text-neutral-800 dark:text-neutral-200">
                  <Users className="w-4 h-4 text-neutral-700 dark:text-neutral-300" />
                  <span>{t('team')}</span>
                </div>
                {selectedAssigneeId && (
                  <button
                    onClick={() => {
                      onSelectAssignee(null);
                      onCloseMobile();
                    }}
                    className="text-xs text-red-600 dark:text-red-400 hover:underline flex items-center gap-1 font-bold cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                    {t('resetFilter')}
                  </button>
                )}
              </div>

              <div className="space-y-1.5">
                {users.length === 0 ? (
                  <div className="px-2.5 py-3 text-center border border-dashed border-neutral-200 dark:border-neutral-800 rounded-xl">
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 font-medium">{t('noTeamMembers')}</p>
                  </div>
                ) : (
                  users.map((user) => {
                    const isFiltered = selectedAssigneeId === user.id;
                    const userTaskCount = projectTasks.filter((t) => t.assigneeId === user.id).length;
                    const activeProject = projects.find((p) => p.id === activeProjectId);
                    const memberRole =
                      activeProject?.memberRoles?.[user.id] ||
                      user.role ||
                      (activeProject?.leaderId === user.id ? 'leader' : 'member');
                    const isUserLeader =
                      memberRole === 'leader' ||
                      memberRole.toLowerCase() === 'ketua' ||
                      memberRole.toLowerCase().includes('leader') ||
                      activeProject?.leaderId === user.id;
                    const isUserViewer =
                      memberRole === 'viewer' || memberRole.toLowerCase().includes('peninjau');

                    return (
                      <button
                        key={user.id}
                        onClick={() => {
                          onSelectAssignee(isFiltered ? null : user.id);
                          onCloseMobile();
                        }}
                        title={isFiltered ? 'Klik untuk reset' : `${user.name} • ${memberRole}`}
                        className={`w-full text-left px-2.5 py-2.5 rounded-2xl transition-all flex items-start justify-between text-xs cursor-pointer ${
                          isFiltered
                            ? 'bg-red-600/10 text-red-600 dark:text-red-400 border border-red-500/40 shadow-xs'
                            : 'hover:bg-neutral-100 dark:hover:bg-neutral-900 border border-transparent'
                        }`}
                      >
                        <div className="flex items-start gap-2.5 min-w-0 flex-1 pr-1.5">
                          <div className="relative shrink-0 mt-0.5">
                            <UserAvatar
                              avatar={user.avatar}
                              name={user.name}
                              color={user.color}
                              className="w-7 h-7 text-xs font-bold"
                            />
                            <span
                              className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white dark:border-neutral-950 ${
                                user.isOnline ? 'bg-emerald-500' : 'bg-neutral-400'
                              }`}
                            />
                          </div>
                          <div className="min-w-0 flex-1">
                            {/* Member Name */}
                            <p className="font-bold text-neutral-950 dark:text-neutral-50 text-xs sm:text-sm leading-snug truncate">
                              {user.name}
                            </p>

                            {/* Member Role (Always placed below the name) */}
                            <div className="mt-1 flex items-center">
                              <span
                                className={`text-[10px] sm:text-xs font-bold px-2 py-0.5 rounded-full leading-none ${
                                  isUserLeader
                                    ? 'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20'
                                    : isUserViewer
                                    ? 'bg-neutral-500/10 text-neutral-700 dark:text-neutral-300 border border-neutral-500/20'
                                    : 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20'
                                }`}
                              >
                                {isUserLeader
                                  ? memberRole === 'leader'
                                    ? t('roleLeader')
                                    : memberRole
                                  : memberRole === 'viewer'
                                  ? t('roleViewer')
                                  : memberRole === 'member'
                                  ? t('roleMember')
                                  : memberRole}
                              </span>
                            </div>

                            {/* Username or Email */}
                            <p className="text-xs text-neutral-600 dark:text-neutral-400 truncate mt-1 font-medium">
                              {user.username ? `@${user.username}` : user.email}
                            </p>
                          </div>
                        </div>

                        <span className="text-xs font-mono font-bold tabular-nums text-neutral-600 dark:text-neutral-300 mt-1 shrink-0 px-1.5 py-0.5 rounded-md bg-neutral-100 dark:bg-neutral-800">
                          {userTaskCount}
                        </span>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>

        {/* Project Progress Footer (Hanya tampil saat proyek aktif dan memiliki tugas) */}
        {Boolean(activeProjectId) && totalTasks > 0 && (
          <div className="p-4 border-t border-neutral-200 dark:border-neutral-800/80 bg-neutral-50/50 dark:bg-neutral-900/40">
            <div className="flex items-center justify-between text-xs sm:text-sm mb-1.5 font-semibold">
              <span className="text-neutral-700 dark:text-neutral-300">{t('projectProgress')}</span>
              <span className="font-mono tabular-nums font-bold text-neutral-950 dark:text-white">
                {progressPercent}%
              </span>
            </div>
            <div className="w-full h-2 bg-neutral-200 dark:bg-neutral-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-red-600 transition-all duration-300 rounded-full"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-xs text-neutral-600 dark:text-neutral-300 mt-2 font-mono font-medium tabular-nums">
              <span>{doneTasks} {t('completed').toLowerCase()}</span>
              <span>{totalTasks} total</span>
            </div>
          </div>
        )}
        </div>
      </aside>
    </>
  );
});
