import React from 'react';
import {
  FolderKanban,
  CheckCircle2,
  Clock,
  Layers,
  Plus,
  ArrowRight,
  Crown,
  Briefcase,
  Eye,
  Users,
  Edit2,
} from 'lucide-react';
import { Project, ProjectRole, Task, User } from '../types';
import { UserAvatar } from './UserAvatar';
import { useLanguage } from '../context/LanguageContext';

interface HomeDashboardProps {
  currentUser: User;
  projects: Project[];
  tasks: Task[];
  users: User[];
  onSelectProject: (projectId: string) => void;
  onOpenNewProject: () => void;
  onOpenEditProjectModal?: (project: Project) => void;
}

export const HomeDashboard: React.FC<HomeDashboardProps> = React.memo(({
  currentUser,
  projects,
  tasks,
  users,
  onSelectProject,
  onOpenNewProject,
  onOpenEditProjectModal,
}) => {
  const { language, t } = useLanguage();

  const totalTasks = tasks.length;
  const doneTasks = React.useMemo(() => tasks.filter((t) => t.columnId === 'done').length, [tasks]);
  const inProgressTasks = React.useMemo(() => tasks.filter((t) => t.columnId === 'in_progress').length, [tasks]);

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-[#f8f9fa] dark:bg-[#090a0d] text-neutral-900 dark:text-neutral-100 transition-colors">
      <div className="max-w-6xl mx-auto space-y-6 sm:space-y-8">
        {/* Welcome Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-neutral-200 dark:border-neutral-800/80">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-950 dark:text-white">
              {t('greeting')}, {currentUser.name}
            </h1>
            <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-1">
              {t('welcomeSubtitle')}
            </p>
          </div>

          <button
            type="button"
            onClick={onOpenNewProject}
            className="self-start sm:self-auto flex items-center gap-2 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 active:scale-95 text-white text-xs font-semibold shadow-xs transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>{t('createNewProject')}</span>
          </button>
        </div>

        {/* Quick Stats Overview */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <div className="p-4 rounded-2xl bg-white dark:bg-[#12141a] border border-neutral-200/80 dark:border-[#272a35] shadow-xs project-card-item">
            <div className="flex items-center gap-2 text-neutral-500 dark:text-neutral-400 text-xs font-medium mb-1">
              <FolderKanban className="w-3.5 h-3.5 text-red-600 dark:text-red-400" />
              <span>{t('totalProjects')}</span>
            </div>
            <p className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-950 dark:text-white tabular-nums">
              {projects.length}
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-white dark:bg-[#12141a] border border-neutral-200/80 dark:border-[#272a35] shadow-xs project-card-item">
            <div className="flex items-center gap-2 text-neutral-500 dark:text-neutral-400 text-xs font-medium mb-1">
              <Layers className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              <span>{t('totalTasks')}</span>
            </div>
            <p className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-950 dark:text-white tabular-nums">
              {totalTasks}
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-white dark:bg-[#12141a] border border-neutral-200/80 dark:border-[#272a35] shadow-xs project-card-item">
            <div className="flex items-center gap-2 text-neutral-500 dark:text-neutral-400 text-xs font-medium mb-1">
              <Clock className="w-3.5 h-3.5 text-amber-500" />
              <span>{t('inProgress')}</span>
            </div>
            <p className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-950 dark:text-white tabular-nums">
              {inProgressTasks}
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-white dark:bg-[#12141a] border border-neutral-200/80 dark:border-[#272a35] shadow-xs project-card-item">
            <div className="flex items-center gap-2 text-neutral-500 dark:text-neutral-400 text-xs font-medium mb-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              <span>{t('completed')}</span>
            </div>
            <p className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-950 dark:text-white tabular-nums">
              {doneTasks}
            </p>
          </div>
        </div>

        {/* Projects Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-neutral-900 dark:text-white">
                {t('projectBoards')}
              </h2>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-neutral-200 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 tabular-nums">
                {projects.length}
              </span>
            </div>
          </div>

          {projects.length === 0 ? (
            /* Empty State when 0 projects */
            <div className="rounded-2xl border-2 border-dashed border-neutral-200 dark:border-[#272a35] bg-white/60 dark:bg-[#12141a]/60 p-8 sm:p-12 text-center flex flex-col items-center justify-center">
              <div className="w-14 h-14 rounded-2xl bg-neutral-100 dark:bg-[#1a1c24] border border-neutral-200 dark:border-[#272a35] flex items-center justify-center text-neutral-400 mb-4 shadow-xs">
                <FolderKanban className="w-7 h-7 stroke-[1.6]" />
              </div>
              <h3 className="text-base font-bold text-neutral-900 dark:text-white mb-1">
                {t('noProjectsTitle')}
              </h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 max-w-sm mb-5 leading-relaxed">
                {t('noProjectsDesc')}
              </p>
              <button
                type="button"
                onClick={onOpenNewProject}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 active:scale-95 text-white text-xs font-semibold shadow-xs transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4 stroke-[2.5]" />
                <span>{t('createFirstProject')}</span>
              </button>
            </div>
          ) : (
            /* Grid of Project Cards */
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {projects.map((project) => {
                const projTasks = tasks.filter((t) => t.projectId === project.id);
                const projDone = projTasks.filter(
                  (t) => t.columnId === 'done' || Boolean(t.isCompleted) || (t.checklist && t.checklist.length > 0 && t.checklist.every((c) => c.completed))
                ).length;
                const progressPercent =
                  projTasks.length > 0 ? Math.round((projDone / projTasks.length) * 100) : 0;

                const userRole: ProjectRole =
                  project.memberRoles?.[currentUser.id] ||
                  (project.leaderId === currentUser.id ? 'leader' : 'member');
                const isUserLeader =
                  userRole === 'leader' ||
                  userRole.toLowerCase() === 'ketua' ||
                  userRole.toLowerCase().includes('leader') ||
                  project.leaderId === currentUser.id;

                const projectMembers = users.filter((u) =>
                  project.memberIds?.includes(u.id)
                );

                return (
                  <div
                    key={project.id}
                    onClick={() => onSelectProject(project.id)}
                    className="group relative flex flex-col justify-between p-5 rounded-2xl bg-white dark:bg-[#12141a] border border-neutral-200/80 dark:border-[#272a35] hover:border-red-500/60 dark:hover:border-red-500/60 hover:shadow-xl hover:shadow-red-500/10 dark:hover:shadow-red-500/10 cursor-pointer text-left project-card-item overflow-hidden"
                  >
                    <div>
                      {/* Project Card Cover Banner */}
                      <div className="relative -mx-5 -mt-5 mb-5">
                        <div className="w-full aspect-[3/1] bg-gradient-to-r from-red-600 via-rose-600 to-amber-600 overflow-hidden">
                          {project.coverImage ? (
                            <img
                              src={project.coverImage}
                              alt={project.name}
                              loading="lazy"
                              decoding="async"
                              className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-300"
                            />
                          ) : (
                            <div className="w-full h-full bg-gradient-to-r from-red-600 via-rose-700 to-amber-600 flex items-center justify-end pr-4 text-white/20 font-black text-2xl select-none">
                              {project.name.charAt(0).toUpperCase()}
                            </div>
                          )}
                        </div>

                        {/* Avatar Overlapping Cover - Placed outside banner overflow-hidden to prevent clipping */}
                        <div className="absolute -bottom-3.5 left-4 w-12 h-12 rounded-xl overflow-hidden border-2 border-white dark:border-[#12141a] shadow-md bg-white dark:bg-[#181a24] flex items-center justify-center z-10">
                          {project.avatar ? (
                            <img
                              src={project.avatar}
                              alt={project.name}
                              loading="lazy"
                              decoding="async"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className={`w-full h-full ${project.iconColor || 'bg-red-600'} text-white flex items-center justify-center font-bold text-base select-none`}>
                              {project.name.charAt(0).toUpperCase()}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Category & Actions */}
                      <div className="flex items-center justify-between gap-2 mb-2 pt-1 pl-1">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20 truncate">
                            {project.category || 'Umum'}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          {onOpenEditProjectModal && (isUserLeader || userRole === 'member') && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onOpenEditProjectModal(project);
                              }}
                              className="p-1 rounded-md text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-[#202330] transition-colors cursor-pointer"
                              title={language === 'id' ? 'Edit Proyek' : 'Edit Project'}
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                              isUserLeader
                                ? 'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20'
                                : userRole === 'viewer' || userRole.toLowerCase().includes('peninjau')
                                ? 'bg-neutral-500/10 text-neutral-600 dark:text-neutral-400 border border-neutral-500/20'
                                : 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20'
                            }`}
                          >
                            {isUserLeader && <Crown className="w-2.5 h-2.5" />}
                            <span>
                              {isUserLeader
                                ? userRole === 'leader'
                                  ? t('roleLeader')
                                  : userRole
                                : userRole === 'member'
                                ? t('roleMember')
                                : userRole === 'viewer'
                                ? t('roleViewer')
                                : userRole}
                            </span>
                          </span>
                        </div>
                      </div>

                      {/* Project Name */}
                      <h3 className="text-base font-bold text-neutral-900 dark:text-white group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors line-clamp-1 mb-1.5">
                        {project.name}
                      </h3>

                      {/* Project Description */}
                      <p className="text-xs text-neutral-500 dark:text-neutral-400 line-clamp-2 min-h-[32px] leading-relaxed mb-4">
                        {project.description || '-'}
                      </p>
                    </div>

                    {/* Progress Bar & Footer */}
                    <div className="pt-3 border-t border-neutral-100 dark:border-[#1d202a] space-y-3">
                      <div>
                        <div className="flex items-center justify-between text-[11px] mb-1.5">
                          <span className="text-neutral-500 dark:text-neutral-400">{t('projectProgress')}</span>
                          <span className="font-semibold text-neutral-800 dark:text-neutral-200 tabular-nums">
                            {projDone}/{projTasks.length} ({progressPercent}%)
                          </span>
                        </div>
                        <div className="w-full h-1.5 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-red-600 rounded-full transition-all duration-300"
                            style={{ width: `${progressPercent}%` }}
                          />
                        </div>
                      </div>

                      {/* Bottom Row: Member Avatars & Open Action */}
                      <div className="flex items-center justify-between pt-1">
                        <div className="flex items-center -space-x-1.5">
                          {projectMembers.slice(0, 4).map((member) => (
                            <UserAvatar
                              key={member.id}
                              avatar={member.avatar}
                              name={member.name}
                              color={member.color}
                              className="w-6 h-6 text-[9px] ring-2 ring-white dark:ring-[#12141a]"
                            />
                          ))}
                          {projectMembers.length > 4 && (
                            <div className="w-6 h-6 rounded-full flex items-center justify-center font-bold text-[9px] bg-neutral-200 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 ring-2 ring-white dark:ring-[#12141a]">
                              +{projectMembers.length - 4}
                            </div>
                          )}
                        </div>

                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-600 dark:text-red-400 group-hover:translate-x-1.5 transition-transform duration-200">
                          <span>{t('openBoard')}</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Add Project Card at end of grid */}
              <div
                onClick={onOpenNewProject}
                className="flex flex-col items-center justify-center p-6 rounded-2xl border-2 border-dashed border-neutral-200 dark:border-[#272a35] hover:border-red-500/60 dark:hover:border-red-500/60 bg-transparent hover:bg-neutral-50/50 dark:hover:bg-[#14161f]/50 cursor-pointer text-center min-h-[220px] project-card-item animate-card-enter"
              >
                <div className="w-10 h-10 rounded-xl bg-neutral-100 dark:bg-[#1a1c24] text-neutral-500 dark:text-neutral-400 flex items-center justify-center mb-2.5 transition-transform group-hover:scale-110">
                  <Plus className="w-5 h-5" />
                </div>
                <h4 className="text-xs font-bold text-neutral-900 dark:text-white mb-0.5">
                  {t('createNewProject')}
                </h4>
                <p className="text-[11px] text-neutral-400 dark:text-neutral-500 max-w-[200px]">
                  {t('newProjectModalSubtitle')}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});
