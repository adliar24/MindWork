import React, { useState, useRef, useMemo, useCallback } from 'react';
import { Plus, Eye, Camera, ChevronDown, ChevronUp, Image as ImageIcon } from 'lucide-react';
import { Column, ColumnId, Project, ProjectRole, Task, User } from '../types';
import { KanbanCard } from './KanbanCard';
import { useLanguage } from '../context/LanguageContext';
import { compressCoverBannerFile, compressImageFile } from '../utils/imageCompressor';

interface KanbanBoardProps {
  project?: Project | null;
  onUpdateProject?: (updatedProject: Project) => void;
  columns: Column[];
  tasks: Task[];
  users: User[];
  currentUserRole?: ProjectRole;
  onTaskClick: (task: Task) => void;
  onMoveTask: (taskId: string, targetColumn: ColumnId) => void;
  onQuickAddTask: (columnId: ColumnId) => void;
  onUpdateTask?: (updatedTask: Task) => void;
}

export const KanbanBoard: React.FC<KanbanBoardProps> = ({
  project,
  onUpdateProject,
  columns,
  tasks,
  users,
  currentUserRole = 'member',
  onTaskClick,
  onMoveTask,
  onQuickAddTask,
  onUpdateTask,
}) => {
  const { language, t } = useLanguage();
  const isViewer = currentUserRole === 'viewer';
  const [draggingTaskId, setDraggingTaskId] = useState<string | null>(null);
  const [dragOverColumnId, setDragOverColumnId] = useState<ColumnId | null>(null);
  const [isBannerCollapsed, setIsBannerCollapsed] = useState(false);
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  const coverInputRef = useRef<HTMLInputElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const dragPreviewRef = useRef<HTMLDivElement>(null);
  const dragOffsetRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const draggedTask = useMemo(() => {
    return tasks.find((t) => t.id === draggingTaskId) || null;
  }, [tasks, draggingTaskId]);

  const userMap = useMemo(() => {
    const map = new Map<string, User>();
    for (const u of users) {
      map.set(u.id, u);
    }
    return map;
  }, [users]);

  const handleToggleChecklist = useCallback((taskId: string, itemId: string) => {
    if (!onUpdateTask) return;
    const tsk = tasks.find((t) => t.id === taskId);
    if (!tsk) return;
    const nextChecklist = (tsk.checklist || []).map((item) =>
      item.id === itemId ? { ...item, completed: !item.completed } : item
    );
    onUpdateTask({ ...tsk, checklist: nextChecklist });
  }, [tasks, onUpdateTask]);

  const handleToggleComplete = useCallback((taskId: string) => {
    if (!onUpdateTask) return;
    const tsk = tasks.find((t) => t.id === taskId);
    if (!tsk) return;
    onUpdateTask({ ...tsk, isCompleted: !tsk.isCompleted });
  }, [tasks, onUpdateTask]);

  const tasksByColumn = useMemo(() => {
    const map: Record<ColumnId, Task[]> = {
      todo: [],
      in_progress: [],
      in_review: [],
      done: [],
    };
    tasks.forEach((t) => {
      if (map[t.columnId]) {
        map[t.columnId].push(t);
      } else {
        map.todo.push(t);
      }
    });
    return map;
  }, [tasks]);

  const doneCount = tasksByColumn.done.length;
  const totalCount = tasks.length;
  const progressPercent = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;

  const handleCoverFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !project || !onUpdateProject) return;

    // Validasi agar hanya berkas gambar yang diproses saat pengguna memilih lewat File Manager / Folder
    const isImage = file.type.startsWith('image/') || /\.(jpe?g|png|webp|gif|bmp|svg|heic|heif)$/i.test(file.name);
    if (!isImage) {
      alert(language === 'id' ? 'Silakan pilih berkas gambar (JPG, PNG, WebP, dsb).' : 'Please select an image file (JPG, PNG, WebP, etc).');
      if (e.target) e.target.value = '';
      return;
    }

    try {
      setIsUploadingCover(true);
      const compressed = await compressCoverBannerFile(file, 1200, 400);
      onUpdateProject({
        ...project,
        coverImage: compressed,
      });
    } catch (err) {
      console.error('Gagal mengupload sampul proyek:', err);
    } finally {
      setIsUploadingCover(false);
      if (e.target) e.target.value = '';
    }
  };

  const handleAvatarFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !project || !onUpdateProject) return;

    // Validasi agar hanya berkas gambar yang diproses saat pengguna memilih lewat File Manager / Folder
    const isImage = file.type.startsWith('image/') || /\.(jpe?g|png|webp|gif|bmp|svg|heic|heif)$/i.test(file.name);
    if (!isImage) {
      alert(language === 'id' ? 'Silakan pilih berkas gambar (JPG, PNG, WebP, dsb).' : 'Please select an image file (JPG, PNG, WebP, etc).');
      if (e.target) e.target.value = '';
      return;
    }

    try {
      setIsUploadingAvatar(true);
      const compressed = await compressImageFile(file, 240);
      onUpdateProject({
        ...project,
        avatar: compressed,
      });
    } catch (err) {
      console.error('Gagal mengupload avatar proyek:', err);
    } finally {
      setIsUploadingAvatar(false);
      if (e.target) e.target.value = '';
    }
  };

  const getColumnTitle = (colId: ColumnId, defaultTitle: string) => {
    switch (colId) {
      case 'todo':
        return t('colTodoTitle');
      case 'in_progress':
        return t('colInProgressTitle');
      case 'in_review':
        return t('colInReviewTitle');
      case 'done':
        return t('colDoneTitle');
      default:
        return defaultTitle;
    }
  };

  const updateDragPreviewPos = (e: React.DragEvent) => {
    if (dragPreviewRef.current && e.clientX && e.clientY) {
      const x = e.clientX - dragOffsetRef.current.x;
      const y = e.clientY - dragOffsetRef.current.y;
      dragPreviewRef.current.style.transform = `translate3d(${x}px, ${y}px, 0) rotate(1.5deg)`;
    }
  };

  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    if (isViewer) return;
    const target = e.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    dragOffsetRef.current = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };

    e.dataTransfer.setData('text/plain', taskId);
    e.dataTransfer.effectAllowed = 'move';

    // Suppress browser default semi-transparent drag preview
    const emptyImg = new Image();
    emptyImg.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
    try {
      e.dataTransfer.setDragImage(emptyImg, 0, 0);
    } catch {}

    setDraggingTaskId(taskId);
  };

  const handleDragOver = (e: React.DragEvent, columnId: ColumnId) => {
    if (isViewer) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    updateDragPreviewPos(e);
    if (dragOverColumnId !== columnId) {
      setDragOverColumnId(columnId);
    }
  };

  const handleDragLeave = (columnId: ColumnId) => {
    if (dragOverColumnId === columnId) {
      setDragOverColumnId(null);
    }
  };

  const handleDrop = (e: React.DragEvent, targetColumnId: ColumnId) => {
    if (isViewer) return;
    e.preventDefault();
    const taskId = e.dataTransfer.getData('text/plain') || draggingTaskId;
    if (taskId) {
      onMoveTask(taskId, targetColumnId);
    }
    setDraggingTaskId(null);
    setDragOverColumnId(null);
  };

  const handleDragEnd = () => {
    setDraggingTaskId(null);
    setDragOverColumnId(null);
  };

  return (
    <div
      onDragOver={updateDragPreviewPos}
      className="flex-1 flex flex-col overflow-y-auto bg-[#f0f2f5] dark:bg-[#090a0d] transition-colors scroll-smooth relative"
    >
      {/* 1. Facebook Fanpage-style Project Header (Cover + Profile Picture) */}
      {project && (
        <div className="p-3 sm:p-5 md:p-6 pb-2 shrink-0">
          <div className="max-w-[860px] mx-auto sm:mx-0 rounded-3xl border border-neutral-200 dark:border-[#20232c] bg-white dark:bg-[#111217] shadow-xs relative p-2.5 sm:p-3.5 md:p-4">
            {/* Cover Banner - Strict 3:1 Aspect Ratio on All Devices */}
            {!isBannerCollapsed && (
              <div className="relative w-full aspect-[3/1] rounded-2xl overflow-hidden bg-gradient-to-r from-red-600 via-rose-600 to-amber-600 group shadow-xs">
                {project.coverImage ? (
                  <img
                    src={project.coverImage}
                    alt="Sampul Proyek"
                    className="w-full h-full object-cover object-center select-none"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-r from-red-600 via-rose-700 to-amber-600 text-white/35">
                    <span className="text-xl sm:text-3xl md:text-4xl font-black uppercase tracking-widest select-none">
                      {project.name}
                    </span>
                  </div>
                )}

                {/* Cover Action Button - with z-30 to guarantee it is always clickable */}
                {!isViewer && onUpdateProject && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      coverInputRef.current?.click();
                    }}
                    disabled={isUploadingCover}
                    className="absolute bottom-2.5 right-2.5 sm:bottom-3 sm:right-3 z-30 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-xl bg-black/65 hover:bg-black/85 backdrop-blur-md text-white text-xs font-semibold flex items-center gap-1.5 shadow-lg border border-white/10 transition-all cursor-pointer hover:scale-105 active:scale-95"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span className="inline">
                      {isUploadingCover
                        ? (language === 'id' ? 'Memproses...' : 'Processing...')
                        : (language === 'id' ? 'Ubah Sampul' : 'Change Cover')}
                    </span>
                  </button>
                )}
              </div>
            )}

            {/* Profile Avatar & Details Section - in normal flow below cover banner to prevent text collision */}
            <div className="px-1.5 sm:px-2.5 pb-1 sm:pb-2 pt-0">
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                {/* Left: Avatar + Title + Description */}
                <div className="flex flex-col sm:flex-row sm:items-end gap-3.5 sm:gap-4.5 min-w-0">
                  {/* Project Profile Avatar - only the avatar overlaps into the banner */}
                  <div className={`relative group shrink-0 ${!isBannerCollapsed ? '-mt-9 sm:-mt-11 md:-mt-12' : 'mt-3.5'} z-20`}>
                    <div className="w-18 h-18 sm:w-22 sm:h-22 md:w-24 md:h-24 rounded-2xl overflow-hidden border-4 border-white dark:border-[#111217] shadow-xl bg-white dark:bg-[#181a24] flex items-center justify-center">
                      {project.avatar ? (
                        <img
                          src={project.avatar}
                          alt={project.name}
                          className="w-full h-full object-cover select-none"
                        />
                      ) : (
                        <div className={`w-full h-full ${project.iconColor || 'bg-red-600'} text-white flex items-center justify-center font-black text-xl sm:text-2xl md:text-3xl select-none`}>
                          {project.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>

                    {/* Change Profile Avatar Overlay Button */}
                    {!isViewer && onUpdateProject && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          avatarInputRef.current?.click();
                        }}
                        disabled={isUploadingAvatar}
                        className="absolute inset-0 rounded-2xl bg-black/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-white text-[10px] font-semibold transition-opacity cursor-pointer border-4 border-transparent"
                        title={language === 'id' ? 'Ubah Foto Profil Proyek' : 'Change Project Photo'}
                      >
                        <Camera className="w-5 h-5 mb-0.5" />
                        <span>
                          {isUploadingAvatar ? '...' : (language === 'id' ? 'Ubah' : 'Edit')}
                        </span>
                      </button>
                    )}
                  </div>

                  {/* Project Titles & Category - Clean normal flow, never hits cover or photo */}
                  <div className="pt-1 sm:pt-0 sm:pb-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-lg sm:text-2xl font-black text-neutral-950 dark:text-white tracking-tight">
                        {project.name}
                      </h2>
                      <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-md bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700">
                        {project.key}
                      </span>
                      <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20">
                        {project.category}
                      </span>
                    </div>
                    {project.description && (
                      <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-1 max-w-xl line-clamp-2">
                        {project.description}
                      </p>
                    )}
                  </div>
                </div>

                {/* Right: Stats & Collapse Toggle */}
                <div className="flex items-center gap-2.5 shrink-0 self-start md:self-end pt-2 md:pt-0 pb-1 text-xs">
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-neutral-100 dark:bg-[#181a22] border border-neutral-200 dark:border-[#272a35] text-neutral-700 dark:text-neutral-300 font-medium">
                    <span>{language === 'id' ? 'Progres' : 'Progress'}:</span>
                    <span className="font-bold text-neutral-900 dark:text-white">
                      {doneCount}/{totalCount} ({progressPercent}%)
                    </span>
                  </div>

                  {!isViewer && onQuickAddTask && (
                    <button
                      onClick={() => onQuickAddTask('todo')}
                      className="px-3.5 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 active:scale-95 text-white font-semibold flex items-center gap-1.5 shadow-xs shadow-red-600/30 transition-all cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                      <span>{t('newTask')}</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => setIsBannerCollapsed(!isBannerCollapsed)}
                    title={isBannerCollapsed ? (language === 'id' ? 'Tampilkan Sampul' : 'Show Cover') : (language === 'id' ? 'Sembunyikan Sampul' : 'Hide Cover')}
                    className="p-1.5 rounded-xl border border-neutral-200 dark:border-[#272a35] text-neutral-500 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-[#181a22] transition-colors cursor-pointer"
                  >
                    {isBannerCollapsed ? (
                      <ChevronDown className="w-4 h-4" />
                    ) : (
                      <ChevronUp className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Hidden file inputs - allow flexible browsing (Photos, Gallery & File Manager/Folder) */}
            <input
              ref={coverInputRef}
              type="file"
              accept="image/*,.png,.jpg,.jpeg,.webp,.gif,.heic,*/*"
              className="hidden"
              onChange={handleCoverFileChange}
            />
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/*,.png,.jpg,.jpeg,.webp,.gif,.heic,*/*"
              className="hidden"
              onChange={handleAvatarFileChange}
            />
          </div>
        </div>
      )}

      {/* 2. Viewer Notice Banner */}
      {isViewer && (
        <div className="mx-3 sm:mx-5 md:mx-6 mb-3 px-4 py-2.5 rounded-xl bg-neutral-200/70 dark:bg-[#161822] border border-[#cfd5de] dark:border-[#272a35] text-neutral-700 dark:text-neutral-300 text-xs flex items-center justify-between gap-3 shadow-xs shrink-0">
          <div className="flex items-center gap-2">
            <Eye className="w-4 h-4 text-neutral-500 shrink-0" />
            <span>
              {language === 'id' ? (
                <>
                  <strong>Mode Peninjau (Viewer):</strong> Anda memiliki akses baca untuk melihat seluruh kartu & progres proyek. Menambah atau memindahkan tugas dinonaktifkan.
                </>
              ) : (
                <>
                  <strong>Viewer Mode:</strong> You have read-only access to view all cards and project progress. Adding or moving tasks is disabled.
                </>
              )}
            </span>
          </div>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-neutral-300 dark:bg-[#252834] text-neutral-700 dark:text-neutral-300 uppercase tracking-wider shrink-0">
            Read-Only
          </span>
        </div>
      )}

      {/* 3. Horizontal Kanban Columns */}
      <div className="flex-1 flex overflow-x-auto p-3 sm:p-5 md:p-6 pt-1">
        <div className="flex gap-4 sm:gap-5 h-full items-start min-w-max pb-4 flex-1">
        {columns.map((column) => {
          const columnTasks = tasksByColumn[column.id] || [];
          const isOver = dragOverColumnId === column.id;
          const displayTitle = getColumnTitle(column.id, column.title);

          return (
            <div
              key={column.id}
              onDragOver={(e) => handleDragOver(e, column.id)}
              onDragLeave={() => handleDragLeave(column.id)}
              onDrop={(e) => handleDrop(e, column.id)}
              onDragEnd={handleDragEnd}
              className={`w-[84vw] max-w-[340px] sm:w-80 md:w-84 flex flex-col max-h-full rounded-2xl border transition-all duration-200 select-none shadow-xs dark:shadow-md animate-card-enter
                ${
                  isOver
                    ? 'border-red-500 bg-red-500/10 dark:bg-red-950/30 shadow-lg scale-[1.01]'
                    : 'border-[#cfd5de] dark:border-[#272a35] bg-[#e2e6eb] dark:bg-[#15171e]'
                }`}
            >
              {/* Column Header */}
              <div className="p-3 pb-2.5 flex items-center justify-between border-b border-[#cfd5de] dark:border-[#272a35]">
                <div className="flex items-center gap-2">
                  {/* Status Indicator */}
                  <span
                    className={`w-2 h-2 rounded-full ${
                      column.id === 'todo'
                        ? 'bg-neutral-400 dark:bg-neutral-500'
                        : column.id === 'in_progress'
                        ? 'bg-red-600 dark:bg-red-500 shadow-xs shadow-red-500/50'
                        : column.id === 'in_review'
                        ? 'bg-amber-500 shadow-xs shadow-amber-500/50'
                        : 'bg-emerald-500 shadow-xs shadow-emerald-500/50'
                    }`}
                  />
                  <h2 className="text-xs font-bold text-neutral-800 dark:text-neutral-100 uppercase tracking-wide">
                    {displayTitle}
                  </h2>
                  <span className="text-[11px] font-mono tabular-nums px-2 py-0.5 rounded-full bg-[#d3d8e2] dark:bg-[#222530] text-neutral-700 dark:text-neutral-300 font-semibold border border-[#c4cbd6] dark:border-[#2f3342]">
                    {columnTasks.length}
                  </span>
                </div>

                {/* Quick Add Button (hidden if viewer) */}
                {!isViewer && (
                  <button
                    onClick={() => onQuickAddTask(column.id)}
                    title={`+ ${displayTitle}`}
                    className="p-1 rounded-md text-neutral-500 dark:text-neutral-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-[#d5dbe4] dark:hover:bg-[#20232c] transition-colors cursor-pointer"
                  >
                    <Plus className="w-4 h-4 stroke-[2]" />
                  </button>
                )}
              </div>

              {/* Cards Container with smooth vertical scroll */}
              <div className="flex-1 overflow-y-auto p-3 space-y-3 min-h-[140px] max-h-[calc(100vh-175px)]">
                {columnTasks.length === 0 ? (
                  <div
                    onClick={() => !isViewer && onQuickAddTask(column.id)}
                    className={`h-24 rounded-xl border border-dashed border-[#c4cbd6] dark:border-[#2d313d] bg-white/40 dark:bg-[#1b1e26]/60 flex flex-col items-center justify-center p-3 text-center transition-all text-neutral-500 dark:text-neutral-400 group ${
                      isViewer
                        ? 'cursor-default'
                        : 'cursor-pointer hover:border-red-500 hover:bg-red-500/5'
                    }`}
                  >
                    {!isViewer && (
                      <Plus className="w-4 h-4 mb-1 group-hover:text-red-500 transition-colors text-neutral-400" />
                    )}
                    <span className="text-xs font-medium group-hover:text-neutral-700 dark:group-hover:text-neutral-300 transition-colors">
                      {language === 'id' ? 'Kosong' : 'Empty'}
                    </span>
                  </div>
                ) : (
                  columnTasks.map((task) => (
                    <KanbanCard
                      key={task.id}
                      task={task}
                      assignee={userMap.get(task.assigneeId)}
                      onClick={() => onTaskClick(task)}
                      onMoveColumn={onMoveTask}
                      isDragging={draggingTaskId === task.id}
                      onDragStart={handleDragStart}
                      isReadOnly={isViewer}
                      onToggleChecklist={handleToggleChecklist}
                      onToggleComplete={handleToggleComplete}
                    />
                  ))
                )}
              </div>

              {/* Column Footer Quick Add (hidden if viewer) */}
              {!isViewer && (
                <div className="p-2 border-t border-[#cfd5de] dark:border-[#272a35]">
                  <button
                    onClick={() => onQuickAddTask(column.id)}
                    className="w-full py-1.5 px-3 rounded-lg text-xs font-semibold text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white hover:bg-[#d5dbe4] dark:hover:bg-[#20232c] transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{t('addTaskInColumn')}</span>
                  </button>
                </div>
              )}
            </div>
          );
        })}
        </div>
      </div>

      {/* 100% Solid Floating Drag Preview (Zero Transparency) */}
      {draggedTask && (
        <div
          ref={dragPreviewRef}
          className="fixed top-0 left-0 pointer-events-none z-[9999] opacity-100 will-change-transform"
          style={{
            width: 310,
            transform: 'translate3d(-9999px, -9999px, 0)',
          }}
        >
          <div className="rounded-xl border-2 border-red-500 ring-4 ring-red-500/25 bg-white dark:bg-[#20232c] shadow-[0_25px_50px_-12px_rgba(0,0,0,0.55)] overflow-hidden opacity-100 select-none">
            {draggedTask.cardColor && (
              <div
                className="w-full h-8 opacity-100"
                style={{ backgroundColor: draggedTask.cardColor }}
              />
            )}
            <div className="p-3.5 space-y-2 bg-white dark:bg-[#20232c] opacity-100">
              <h3 className="text-sm font-bold text-neutral-900 dark:text-white line-clamp-2 leading-snug">
                {draggedTask.title}
              </h3>
              {draggedTask.description && (
                <p className="text-xs text-neutral-500 dark:text-neutral-400 line-clamp-1">
                  {draggedTask.description}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

