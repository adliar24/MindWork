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
}

export const Sidebar: React.FC<SidebarProps> = ({
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
}) => {
  const { t } = useLanguage();

  // Task completion stats for the current project
  const projectTasks = tasks.filter((t) => t.projectId === activeProjectId);
  const doneTasks = projectTasks.filter((t) => t.columnId === 'done').length;
  const totalTasks = projectTasks.length;
  const progressPercent = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden transition-opacity cursor-pointer"
        />
      )}

      <aside
        className={`fixed lg:static top-0 bottom-0 left-0 z-50 w-72 lg:w-76 flex flex-col shrink-0 transition-transform duration-200 ease-in-out
        bg-white dark:bg-[#101116] border-r border-neutral-200 dark:border-[#20232c] text-neutral-800 dark:text-neutral-200
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
      >
        {/* Brand Header */}
        <div className="h-16 px-5 flex items-center justify-between border-b border-neutral-200 dark:border-[#20232c]">
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
              <span className="font-bold tracking-tight text-neutral-950 dark:text-white text-sm">
                MINDWORK
              </span>
              <p className="text-[10px] text-neutral-400 font-medium leading-none">
                Team Workspace
              </p>
            </div>
          </div>
          <button
            onClick={onCloseMobile}
            className="lg:hidden p-1.5 text-neutral-400 hover:text-neutral-100 rounded-md"
            aria-label="Tutup Menu"
          >
            <X className="w-5 h-5" />
          </button>
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
              className={`w-full group text-left px-3 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2.5 cursor-pointer ${
                !activeProjectId
                  ? 'bg-red-600 text-white shadow-xs font-bold'
                  : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-[#181a22] hover:text-neutral-900 dark:hover:text-white'
              }`}
            >
              <Home className="w-4 h-4 shrink-0" />
              <span>{t('home')}</span>
            </button>
          </div>

          {/* Projects Section */}
          <div>
            <div className="flex items-center justify-between px-2 mb-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-neutral-400">
                <FolderKanban className="w-3.5 h-3.5 text-neutral-400" />
                <span>{t('myProjects')}</span>
                <span className="text-[11px] font-mono tabular-nums text-neutral-400">
                  ({projects.length})
                </span>
              </div>
            </div>

            {projects.length === 0 ? (
              <div className="px-3 py-3 text-center border border-dashed border-neutral-200 dark:border-neutral-800 rounded-lg">
                <p className="text-[11px] text-neutral-400 dark:text-neutral-500">
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
                      className={`w-full group text-left px-3 py-2 rounded-lg text-xs font-medium transition-all flex items-center justify-between
                        ${
                          isActive
                            ? 'bg-red-600/10 text-red-600 dark:text-red-400 font-semibold'
                            : 'text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-900'
                        }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0 pr-2">
                        <div
                          className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                            isActive ? 'bg-red-600 dark:bg-red-500' : 'bg-neutral-400 dark:bg-neutral-600'
                          }`}
                        />
                        <span className="truncate">{project.name}</span>
                      </div>
                      <span
                        className={`text-[10px] font-mono px-1.5 py-0.5 rounded shrink-0 tabular-nums ${
                          isActive
                            ? 'bg-red-600 text-white font-semibold'
                            : 'bg-neutral-200 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400'
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
              className="mt-2 w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium
                border border-dashed border-neutral-300 dark:border-neutral-800 text-neutral-500 dark:text-neutral-400
                hover:border-red-500 hover:text-red-600 dark:hover:text-red-400 transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{t('addProject')}</span>
            </button>
          </div>

          {/* Team Members Section (Hanya tampil saat proyek aktif / diklik) */}
          {Boolean(activeProjectId) && (
            <div>
              <div className="flex items-center justify-between px-2 mb-2">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-neutral-400">
                  <Users className="w-3.5 h-3.5 text-neutral-400" />
                  <span>{t('team')}</span>
                </div>
                {selectedAssigneeId && (
                  <button
                    onClick={() => {
                      onSelectAssignee(null);
                      onCloseMobile();
                    }}
                    className="text-[11px] text-red-600 dark:text-red-400 hover:underline flex items-center gap-1 font-medium cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                    {t('resetFilter')}
                  </button>
                )}
              </div>

              <div className="space-y-1">
                {users.length === 0 ? (
                  <div className="px-2.5 py-3 text-center border border-dashed border-neutral-200 dark:border-neutral-800/80 rounded-lg">
                    <p className="text-[11px] text-neutral-400 dark:text-neutral-500">{t('noTeamMembers')}</p>
                  </div>
                ) : (
                  users.map((user) => {
                    const isFiltered = selectedAssigneeId === user.id;
                    const userTaskCount = projectTasks.filter((t) => t.assigneeId === user.id).length;
                    const activeProject = projects.find((p) => p.id === activeProjectId);
                    const isUserLeader = activeProject?.leaderId === user.id || activeProject?.memberRoles?.[user.id] === 'leader';
                    const isUserViewer = activeProject?.memberRoles?.[user.id] === 'viewer';

                    return (
                      <button
                        key={user.id}
                        onClick={() => {
                          onSelectAssignee(isFiltered ? null : user.id);
                          onCloseMobile();
                        }}
                        title={isFiltered ? 'Klik untuk reset' : user.name}
                        className={`w-full text-left px-2.5 py-2.5 rounded-xl transition-all flex items-start justify-between text-xs cursor-pointer ${
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
                              className="w-7 h-7 text-[11px]"
                            />
                            <span
                              className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white dark:border-neutral-950 ${
                                user.isOnline ? 'bg-emerald-500' : 'bg-neutral-400'
                              }`}
                            />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="font-semibold text-neutral-900 dark:text-neutral-100 text-[12px] leading-snug break-words">
                                {user.name}
                              </span>
                              {isUserLeader && (
                                <span className="text-[8px] font-bold px-1.5 py-0.5 rounded bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20 shrink-0 leading-none">
                                  {t('roleLeader')}
                                </span>
                              )}
                              {isUserViewer && (
                                <span className="text-[8px] font-medium px-1.5 py-0.5 rounded bg-neutral-500/10 text-neutral-600 dark:text-neutral-400 border border-neutral-500/20 shrink-0 leading-none">
                                  {t('roleViewer')}
                                </span>
                              )}
                            </div>
                            <p className="text-[10px] text-neutral-500 dark:text-neutral-400 truncate mt-0.5">
                              {user.username ? `@${user.username}` : user.email}
                            </p>
                          </div>
                        </div>

                        <span className="text-[10px] font-mono tabular-nums text-neutral-400 dark:text-neutral-500 mt-1 shrink-0">
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
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="text-neutral-500 dark:text-neutral-400 font-medium">{t('projectProgress')}</span>
              <span className="font-mono tabular-nums font-bold text-neutral-900 dark:text-white">
                {progressPercent}%
              </span>
            </div>
            <div className="w-full h-1.5 bg-neutral-200 dark:bg-neutral-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-red-600 transition-all duration-300 rounded-full"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[11px] text-neutral-500 dark:text-neutral-400 mt-2 font-mono tabular-nums">
              <span>{doneTasks} {t('completed').toLowerCase()}</span>
              <span>{totalTasks} total</span>
            </div>
          </div>
        )}
      </aside>
    </>
  );
};
