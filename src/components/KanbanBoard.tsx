import React, { useState, useRef, useMemo, useCallback, useEffect } from 'react';
import {
  Plus,
  Eye,
  Camera,
  ChevronDown,
  ChevronUp,
  Image as ImageIcon,
  MoreHorizontal,
  Edit2,
  Trash2,
  X,
  Check,
  FolderKanban,
} from 'lucide-react';
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
  onCreateList?: (title: string) => void;
  onUpdateList?: (updatedList: Column) => void;
  onDeleteList?: (listId: string) => void;
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
  onCreateList,
  onUpdateList,
  onDeleteList,
}) => {
  const { language, t } = useLanguage();
  const isViewer = currentUserRole === 'viewer';
  const [draggingTaskId, setDraggingTaskId] = useState<string | null>(null);
  const [dragOverColumnId, setDragOverColumnId] = useState<ColumnId | null>(null);
  const [isBannerCollapsed, setIsBannerCollapsed] = useState(false);
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [mobileActiveColumn, setMobileActiveColumn] = useState<ColumnId | 'all'>('all');
  const [dragPreviewWidth, setDragPreviewWidth] = useState<number>(310);

  // Dynamic Trello-style List Creation & Renaming State
  const [isAddingList, setIsAddingList] = useState(false);
  const [newListTitle, setNewListTitle] = useState('');
  const [editingColumnId, setEditingColumnId] = useState<string | null>(null);
  const [editingColumnTitle, setEditingColumnTitle] = useState('');
  const [openMenuColumnId, setOpenMenuColumnId] = useState<string | null>(null);

  const coverInputRef = useRef<HTMLInputElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const dragPreviewRef = useRef<HTMLDivElement>(null);
  const dragOffsetRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Global smooth drag tracking across entire window to eliminate lag, freezing, or offset jumps
  useEffect(() => {
    if (!draggingTaskId) return;

    const handleGlobalDragOver = (e: DragEvent) => {
      e.preventDefault();
      if (dragPreviewRef.current && e.clientX > 0 && e.clientY > 0) {
        const x = e.clientX - dragOffsetRef.current.x;
        const y = e.clientY - dragOffsetRef.current.y;
        dragPreviewRef.current.style.transform = `translate3d(${x}px, ${y}px, 0) rotate(1.5deg)`;
      }
    };

    const handleGlobalDragEnd = () => {
      setDraggingTaskId(null);
      setDragOverColumnId(null);
    };

    window.addEventListener('dragover', handleGlobalDragOver);
    window.addEventListener('dragend', handleGlobalDragEnd);
    window.addEventListener('drop', handleGlobalDragEnd);

    return () => {
      window.removeEventListener('dragover', handleGlobalDragOver);
      window.removeEventListener('dragend', handleGlobalDragEnd);
      window.removeEventListener('drop', handleGlobalDragEnd);
    };
  }, [draggingTaskId]);

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
    const map: Record<string, Task[]> = {};
    columns.forEach((col) => {
      map[col.id] = [];
    });
    tasks.forEach((t) => {
      if (map[t.columnId]) {
        map[t.columnId].push(t);
      } else if (columns.length > 0) {
        map[columns[0].id]?.push(t);
      }
    });
    return map;
  }, [tasks, columns]);

  // Trello-style completion: card checked off or all checklist items completed
  const completedTasksCount = useMemo(() => {
    return tasks.filter(
      (t) => t.isCompleted || (t.checklist && t.checklist.length > 0 && t.checklist.every((c) => c.completed))
    ).length;
  }, [tasks]);

  const totalCount = tasks.length;
  const progressPercent = totalCount > 0 ? Math.round((completedTasksCount / totalCount) * 100) : 0;

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
      const compressed = await compressCoverBannerFile(file, 960, 320);
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

  const submitCreateList = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newListTitle.trim() || !onCreateList) return;
    onCreateList(newListTitle.trim());
    setNewListTitle('');
    setIsAddingList(false);
  };

  const startEditColumn = (col: Column) => {
    setEditingColumnId(col.id);
    setEditingColumnTitle(col.title);
    setOpenMenuColumnId(null);
  };

  const submitEditColumn = (col: Column) => {
    if (!editingColumnTitle.trim() || !onUpdateList) {
      setEditingColumnId(null);
      return;
    }
    onUpdateList({ ...col, title: editingColumnTitle.trim() });
    setEditingColumnId(null);
  };

  const handleDeleteColumn = (colId: string) => {
    if (!onDeleteList) return;
    const confirmed = window.confirm(
      language === 'id'
        ? 'Apakah Anda yakin ingin menghapus daftar ini beserta seluruh kartunya?'
        : 'Are you sure you want to delete this list and all its cards?'
    );
    if (confirmed) {
      onDeleteList(colId);
      setOpenMenuColumnId(null);
    }
  };

  const getColumnTitle = (colId: string, defaultTitle: string) => {
    if (colId === 'todo' && defaultTitle === 'To Do') return t('colTodoTitle');
    if (colId === 'in_progress' && defaultTitle === 'In Progress') return t('colInProgressTitle');
    if (colId === 'in_review' && defaultTitle === 'In Review') return t('colInReviewTitle');
    if (colId === 'done' && defaultTitle === 'Done') return t('colDoneTitle');
    return defaultTitle;
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
    const cardEl = (e.currentTarget as HTMLElement).closest('.kanban-card-item') as HTMLElement || (e.currentTarget as HTMLElement);
    const rect = cardEl ? cardEl.getBoundingClientRect() : (e.currentTarget as HTMLElement).getBoundingClientRect();
    const cardWidth = rect.width > 0 ? rect.width : 310;
    const cardHeight = rect.height > 0 ? rect.height : 90;

    setDragPreviewWidth(cardWidth);

    // Center horizontally so the card is always balanced directly under pointer/touch
    const offsetX = cardWidth / 2;
    const offsetY = Math.min(cardHeight / 2, 40);

    dragOffsetRef.current = {
      x: offsetX,
      y: offsetY,
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

    if (dragPreviewRef.current && e.clientX > 0 && e.clientY > 0) {
      dragPreviewRef.current.style.transform = `translate3d(${e.clientX - offsetX}px, ${e.clientY - offsetY}px, 0) rotate(1.5deg)`;
    }
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
      className="flex-1 flex flex-col overflow-y-auto bg-slate-50/60 dark:bg-[#090a0f] transition-colors scroll-smooth relative"
    >
      {/* 1. Project Header (Cover + Profile Picture) - Strict 3:1 Aspect Ratio on All Devices */}
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
                    className="absolute bottom-2.5 right-2.5 sm:bottom-3 sm:right-3 z-30 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-xl bg-black/80 hover:bg-black text-white text-xs font-semibold flex items-center gap-1.5 shadow-lg border border-white/10 transition-all cursor-pointer hover:scale-105 active:scale-95"
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

            {/* Hidden file inputs */}
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
        <div className="mx-3 sm:mx-5 md:mx-6 mb-2 px-3.5 py-2 rounded-xl bg-neutral-100 dark:bg-[#161822] border border-neutral-200 dark:border-[#272a35] text-neutral-700 dark:text-neutral-300 text-xs flex items-center justify-between gap-3 shadow-xs shrink-0">
          <div className="flex items-center gap-2">
            <Eye className="w-4 h-4 text-neutral-500 shrink-0" />
            <span>
              <strong>Mode Peninjau (Viewer):</strong> Anda memiliki akses baca untuk melihat seluruh kartu & progres proyek.
            </span>
          </div>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-neutral-200 dark:bg-[#252834] text-neutral-700 dark:text-neutral-300 uppercase tracking-wider shrink-0">
            Read-Only
          </span>
        </div>
      )}

      {/* Mobile Column Navigation Switcher */}
      {/* Mobile Column Navigation Switcher */}
      <div className="sm:hidden px-3 pt-1 pb-2 flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0">
        <button
          type="button"
          onClick={() => setMobileActiveColumn('all')}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
            mobileActiveColumn === 'all'
              ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 shadow-xs'
              : 'bg-neutral-200/70 text-neutral-600 dark:bg-[#181a24] dark:text-neutral-400'
          }`}
        >
          {language === 'id' ? 'Semua' : 'All'} ({tasks.length})
        </button>
        {columns.map((col) => {
          const colTasks = tasksByColumn[col.id] || [];
          return (
            <button
              key={col.id}
              type="button"
              onClick={() => setMobileActiveColumn(col.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                mobileActiveColumn === col.id
                  ? 'bg-red-600 text-white shadow-xs'
                  : 'bg-neutral-200/70 text-neutral-600 dark:bg-[#181a24] dark:text-neutral-400'
              }`}
            >
              <span>{getColumnTitle(col.id, col.title)}</span>
              <span className="font-mono text-[10px] opacity-80">({colTasks.length})</span>
            </button>
          );
        })}
        {!isViewer && onCreateList && (
          <button
            type="button"
            onClick={() => setIsAddingList(true)}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold text-red-600 dark:text-red-400 bg-red-500/10 border border-red-500/20 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{language === 'id' ? 'Daftar' : 'List'}</span>
          </button>
        )}
      </div>

      {/* 3. Horizontal Kanban Board Lists */}
      <div className="flex-1 flex overflow-x-auto p-3 sm:p-5 md:p-6 pt-1">
        {columns.length === 0 ? (
          /* Empty Board State when no lists exist yet */
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center min-h-[360px] animate-in fade-in">
            <div className="w-16 h-16 rounded-2xl bg-neutral-100 dark:bg-[#161822] border border-neutral-200 dark:border-[#272a38] flex items-center justify-center text-neutral-400 mb-4 shadow-xs">
              <FolderKanban className="w-8 h-8 text-neutral-400 dark:text-neutral-500" />
            </div>
            <h3 className="text-base sm:text-lg font-bold text-neutral-900 dark:text-white mb-1.5">
              {language === 'id' ? 'Papan ini belum memiliki daftar' : 'This board has no lists yet'}
            </h3>
            <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 max-w-md mb-6 leading-relaxed">
              {language === 'id'
                ? 'Mulai atur alur kerja proyek Anda dengan menambahkan daftar kustom seperti Konsep, Referensi, Aset, atau To-Do.'
                : 'Start organizing your workflow by adding custom lists like Concepts, References, Assets, or To-Do.'}
            </p>
            {!isViewer && onCreateList && (
              <div className="w-full max-w-xs">
                {isAddingList ? (
                  <form
                    onSubmit={submitCreateList}
                    className="p-3 rounded-2xl bg-white dark:bg-[#151722] border border-neutral-200 dark:border-[#282b3a] shadow-lg space-y-2.5"
                  >
                    <input
                      type="text"
                      autoFocus
                      placeholder={language === 'id' ? 'Nama daftar (mis. Konsep)...' : 'List name...'}
                      value={newListTitle}
                      onChange={(e) => setNewListTitle(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl text-xs bg-neutral-100 dark:bg-[#1d202d] border border-neutral-200 dark:border-[#2f3345] focus:outline-none focus:border-red-500 text-neutral-900 dark:text-white font-medium"
                    />
                    <div className="flex items-center gap-2">
                      <button
                        type="submit"
                        disabled={!newListTitle.trim()}
                        className="flex-1 py-1.5 px-3 rounded-xl bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-xs font-semibold shadow-xs cursor-pointer"
                      >
                        {language === 'id' ? 'Tambah Daftar' : 'Add List'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setIsAddingList(false);
                          setNewListTitle('');
                        }}
                        className="p-1.5 rounded-xl text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </form>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsAddingList(true)}
                    className="w-full py-2.5 px-4 rounded-xl bg-red-600 hover:bg-red-700 active:scale-95 text-white text-xs font-semibold flex items-center justify-center gap-2 shadow-md shadow-red-600/25 transition-all cursor-pointer"
                  >
                    <Plus className="w-4 h-4 stroke-[2.5]" />
                    <span>{language === 'id' ? 'Tambah Daftar Pertama' : 'Add First List'}</span>
                  </button>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="flex gap-4 sm:gap-5 h-full items-start min-w-max pb-4 flex-1">
            {columns
              .filter((col) => mobileActiveColumn === 'all' || mobileActiveColumn === col.id)
              .map((column) => {
                const columnTasks = tasksByColumn[column.id] || [];
                const isOver = dragOverColumnId === column.id;
                const displayTitle = getColumnTitle(column.id, column.title);
                const isEditing = editingColumnId === column.id;
                const isMenuOpen = openMenuColumnId === column.id;

                return (
                  <div
                    key={column.id}
                    onDragOver={(e) => handleDragOver(e, column.id)}
                    onDragLeave={() => handleDragLeave(column.id)}
                    onDrop={(e) => handleDrop(e, column.id)}
                    onDragEnd={handleDragEnd}
                    className={`${
                      mobileActiveColumn !== 'all' ? 'w-[calc(100vw-24px)] max-w-none' : 'w-[84vw] max-w-[320px]'
                    } sm:w-80 md:w-84 flex flex-col max-h-full rounded-2xl border transition-all duration-200 select-none shadow-xs animate-card-enter relative
                      ${
                        isOver
                          ? 'border-red-500 bg-red-500/8 dark:bg-red-950/20 shadow-md scale-[1.01]'
                          : 'border-neutral-200/90 dark:border-[#222533] bg-neutral-100/75 dark:bg-[#12141d]'
                      }`}
                  >
                    {/* Column Header */}
                    <div className="p-3 pb-2.5 flex items-center justify-between border-b border-neutral-200/80 dark:border-[#222533]">
                      {isEditing ? (
                        <div className="flex items-center gap-1.5 flex-1 min-w-0 mr-2">
                          <input
                            type="text"
                            autoFocus
                            value={editingColumnTitle}
                            onChange={(e) => setEditingColumnTitle(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') submitEditColumn(column);
                              if (e.key === 'Escape') setEditingColumnId(null);
                            }}
                            className="flex-1 px-2 py-1 text-xs font-semibold rounded-lg bg-white dark:bg-[#1e212d] border border-red-500 text-neutral-900 dark:text-white focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => submitEditColumn(column)}
                            className="p-1 rounded-md text-emerald-600 hover:bg-emerald-500/10 cursor-pointer"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingColumnId(null)}
                            className="p-1 rounded-md text-neutral-400 hover:bg-neutral-200 cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="w-2 h-2 rounded-full bg-red-600 dark:bg-red-500 shrink-0" />
                          <h2
                            onClick={() => !isViewer && startEditColumn(column)}
                            title={!isViewer ? 'Klik untuk ubah nama' : undefined}
                            className={`text-xs font-bold text-neutral-800 dark:text-neutral-100 uppercase tracking-wide truncate ${
                              !isViewer ? 'cursor-pointer hover:text-red-600 transition-colors' : ''
                            }`}
                          >
                            {displayTitle}
                          </h2>
                          <span className="text-[11px] font-mono tabular-nums px-2 py-0.5 rounded-full bg-white dark:bg-[#1c1f2b] text-neutral-600 dark:text-neutral-300 font-semibold border border-neutral-200/60 dark:border-neutral-800 shadow-xs">
                            {columnTasks.length}
                          </span>
                        </div>
                      )}

                      {/* Header Actions */}
                      {!isViewer && !isEditing && (
                        <div className="flex items-center gap-0.5 relative">
                          <button
                            onClick={() => onQuickAddTask(column.id)}
                            title={`+ ${displayTitle}`}
                            className="p-1 rounded-md text-neutral-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-neutral-200/70 dark:hover:bg-[#1e212d] transition-colors cursor-pointer"
                          >
                            <Plus className="w-4 h-4 stroke-[2]" />
                          </button>

                          {/* List Menu (...) */}
                          <button
                            onClick={() => setOpenMenuColumnId(isMenuOpen ? null : column.id)}
                            title="Opsi daftar"
                            className="p-1 rounded-md text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-200/70 dark:hover:bg-[#1e212d] transition-colors cursor-pointer"
                          >
                            <MoreHorizontal className="w-4 h-4" />
                          </button>

                          {/* Column Popover Menu */}
                          {isMenuOpen && (
                            <div
                              onClick={(e) => e.stopPropagation()}
                              className="absolute right-0 top-8 z-30 w-44 rounded-xl bg-white dark:bg-[#181a24] border border-neutral-200 dark:border-[#2b2f3f] shadow-xl py-1 text-xs animate-in zoom-in-95 duration-100"
                            >
                              <button
                                type="button"
                                onClick={() => startEditColumn(column)}
                                className="w-full px-3 py-2 text-left flex items-center gap-2 hover:bg-neutral-100 dark:hover:bg-[#202330] text-neutral-700 dark:text-neutral-200 cursor-pointer"
                              >
                                <Edit2 className="w-3.5 h-3.5 text-neutral-400" />
                                <span>{language === 'id' ? 'Ubah Nama' : 'Rename List'}</span>
                              </button>
                              {onDeleteList && (
                                <button
                                  type="button"
                                  onClick={() => handleDeleteColumn(column.id)}
                                  className="w-full px-3 py-2 text-left flex items-center gap-2 hover:bg-red-500/10 text-red-600 dark:text-red-400 cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                  <span>{language === 'id' ? 'Hapus Daftar' : 'Delete List'}</span>
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Cards Container with smooth vertical scroll */}
                    <div className="flex-1 overflow-y-auto p-3 space-y-3 min-h-[140px] max-h-[calc(100vh-175px)]">
                      {columnTasks.length === 0 ? (
                        <div
                          onClick={() => !isViewer && onQuickAddTask(column.id)}
                          className={`h-24 rounded-xl border border-dashed border-neutral-300 dark:border-[#2c3040] bg-white/50 dark:bg-[#161822]/60 flex flex-col items-center justify-center p-3 text-center transition-all text-neutral-400 dark:text-neutral-500 group ${
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

                    {/* Column Footer Quick Add */}
                    {!isViewer && (
                      <div className="p-2 border-t border-neutral-200/80 dark:border-[#222533]">
                        <button
                          onClick={() => onQuickAddTask(column.id)}
                          className="w-full py-1.5 px-3 rounded-lg text-xs font-semibold text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-200/60 dark:hover:bg-[#1e212d] transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>{language === 'id' ? 'Tambah kartu' : 'Add a card'}</span>
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}

            {/* Add another list button / form (Trello-style) */}
            {!isViewer && onCreateList && (
              <div className="w-72 sm:w-80 shrink-0">
                {isAddingList ? (
                  <form
                    onSubmit={submitCreateList}
                    className="p-3 rounded-2xl bg-white dark:bg-[#161822] border border-neutral-200 dark:border-[#262a38] shadow-md space-y-2.5 animate-in fade-in"
                  >
                    <input
                      type="text"
                      autoFocus
                      placeholder={language === 'id' ? 'Judul daftar (mis. Konsep, Aset)...' : 'List title...'}
                      value={newListTitle}
                      onChange={(e) => setNewListTitle(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl text-xs bg-neutral-100 dark:bg-[#12141c] border border-neutral-200 dark:border-[#2f3345] focus:outline-none focus:border-red-500 text-neutral-900 dark:text-white font-medium"
                    />
                    <div className="flex items-center gap-2">
                      <button
                        type="submit"
                        disabled={!newListTitle.trim()}
                        className="flex-1 py-1.5 px-3 rounded-xl bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-xs font-semibold shadow-xs cursor-pointer"
                      >
                        {language === 'id' ? 'Tambah Daftar' : 'Add List'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setIsAddingList(false);
                          setNewListTitle('');
                        }}
                        className="p-1.5 rounded-xl text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </form>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsAddingList(true)}
                    className="w-full py-3 px-4 rounded-2xl border-2 border-dashed border-neutral-300 dark:border-[#272a38] hover:border-red-500/60 dark:hover:border-red-500/60 bg-neutral-100/60 dark:bg-[#12141d]/60 hover:bg-red-500/5 text-neutral-600 dark:text-neutral-400 hover:text-red-600 dark:hover:text-red-400 flex items-center justify-center gap-2 text-xs font-semibold transition-all cursor-pointer shadow-xs"
                  >
                    <Plus className="w-4 h-4" />
                    <span>{language === 'id' ? '+ Tambah daftar lain' : '+ Add another list'}</span>
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 100% Solid Floating Drag Preview (Zero Transparency, Centered Under Pointer) */}
      {draggedTask && (
        <div
          ref={dragPreviewRef}
          className="fixed top-0 left-0 pointer-events-none z-[9999] opacity-100 will-change-transform"
          style={{
            width: dragPreviewWidth || 310,
            transform: 'translate3d(-9999px, -9999px, 0)',
          }}
        >
          <div className="rounded-xl border-2 border-red-500 ring-4 ring-red-500/25 bg-white dark:bg-[#161822] shadow-[0_20px_40px_-10px_rgba(0,0,0,0.45)] overflow-hidden opacity-100 select-none">
            {draggedTask.cardColor && (
              <div
                className="w-full h-1.5 opacity-100"
                style={{ backgroundColor: draggedTask.cardColor }}
              />
            )}
            <div className="p-3 space-y-1.5 bg-white dark:bg-[#161822] opacity-100">
              <div className="flex items-center gap-1.5">
                {draggedTask.priority === 'Tinggi' ? (
                  <span className="w-2 h-2 rounded-full bg-red-500 ring-2 ring-red-500/30 shrink-0" />
                ) : draggedTask.priority === 'Sedang' ? (
                  <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                ) : (
                  <span className="w-2 h-2 rounded-full bg-neutral-300 dark:bg-neutral-600 shrink-0" />
                )}
                <span className="text-[10px] font-mono text-neutral-400 font-bold uppercase">
                  {draggedTask.key || 'TASK'}
                </span>
              </div>
              <h3 className="text-xs sm:text-[13px] font-semibold text-neutral-900 dark:text-white line-clamp-2 leading-snug">
                {draggedTask.title}
              </h3>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

