import React, { useState, useRef, useMemo, useCallback, useEffect } from 'react';
import {
  Plus,
  Eye,
  ZoomIn,
  ChevronDown,
  ChevronUp,
  Image as ImageIcon,
  MoreHorizontal,
  Edit2,
  Trash2,
  X,
  Check,
  FolderKanban,
  Download,
  Palette,
  RotateCcw,
} from 'lucide-react';
import { Column, ColumnId, Project, ProjectRole, Task, User } from '../types';
import { KanbanCard } from './KanbanCard';
import { useLanguage } from '../context/LanguageContext';
import { ConfirmModal } from './ConfirmModal';
import { triggerDownload } from '../utils/fileHelpers';

export const LIST_COLOR_PRESETS = [
  { name: 'Slate', value: '#64748b', labelId: 'Abu-abu Netral', labelEn: 'Slate Neutral' },
  { name: 'Vermilion', value: '#ef4444', labelId: 'Merah Vermilion', labelEn: 'Vermilion Red' },
  { name: 'Orange', value: '#f97316', labelId: 'Oranye Senja', labelEn: 'Sunset Orange' },
  { name: 'Amber', value: '#f59e0b', labelId: 'Kuning Amber', labelEn: 'Warm Amber' },
  { name: 'Emerald', value: '#10b981', labelId: 'Hijau Emerald', labelEn: 'Emerald Green' },
  { name: 'Teal', value: '#14b8a6', labelId: 'Teal Mint', labelEn: 'Mint Teal' },
  { name: 'Sky', value: '#0ea5e9', labelId: 'Biru Langit', labelEn: 'Sky Blue' },
  { name: 'Indigo', value: '#6366f1', labelId: 'Indigo Royal', labelEn: 'Royal Indigo' },
  { name: 'Purple', value: '#8b5cf6', labelId: 'Ungu Violet', labelEn: 'Electric Violet' },
  { name: 'Rose', value: '#ec4899', labelId: 'Merah Muda Rose', labelEn: 'Rose Pink' },
];

export const getColumnColor = (col: Column): string => {
  if (col.color && col.color.trim()) return col.color.trim();
  if (col.badgeColor && col.badgeColor.startsWith('#')) return col.badgeColor.trim();
  if (col.badgeColor) {
    if (col.badgeColor.includes('red')) return '#ef4444';
    if (col.badgeColor.includes('emerald') || col.badgeColor.includes('green')) return '#10b981';
    if (col.badgeColor.includes('amber') || col.badgeColor.includes('yellow')) return '#f59e0b';
    if (col.badgeColor.includes('blue') || col.badgeColor.includes('sky')) return '#0ea5e9';
    if (col.badgeColor.includes('purple') || col.badgeColor.includes('violet')) return '#8b5cf6';
    if (col.badgeColor.includes('neutral') || col.badgeColor.includes('slate')) return '#64748b';
  }
  if (col.id.endsWith('todo') || col.id === 'todo') return '#64748b';
  if (col.id.endsWith('doing') || col.id === 'in_progress') return '#0ea5e9';
  if (col.id.endsWith('review') || col.id === 'in_review') return '#f59e0b';
  if (col.id.endsWith('done') || col.id === 'done') return '#10b981';
  return '#64748b';
};

export const isLightColor = (hex: string): boolean => {
  if (!hex || !hex.startsWith('#')) return false;
  const clean = hex.replace('#', '');
  if (clean.length !== 6 && clean.length !== 3) return false;
  const r = parseInt(clean.length === 3 ? clean[0] + clean[0] : clean.substring(0, 2), 16);
  const g = parseInt(clean.length === 3 ? clean[1] + clean[1] : clean.substring(2, 4), 16);
  const b = parseInt(clean.length === 3 ? clean[2] + clean[2] : clean.substring(4, 6), 16);
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq >= 185;
};

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
  onInlineCreateCard?: (columnId: ColumnId, title: string) => void;
  onUpdateTask?: (updatedTask: Task) => void;
  onCreateList?: (title: string, color?: string) => void;
  onUpdateList?: (updatedList: Column) => void;
  onDeleteList?: (listId: string) => void;
  onOpenEditProjectModal?: () => void;
}

export const KanbanBoard: React.FC<KanbanBoardProps> = React.memo(({
  project,
  onUpdateProject,
  columns,
  tasks,
  users,
  currentUserRole = 'member',
  onTaskClick,
  onMoveTask,
  onQuickAddTask,
  onInlineCreateCard,
  onUpdateTask,
  onCreateList,
  onUpdateList,
  onDeleteList,
  onOpenEditProjectModal,
}) => {
  const { language, t } = useLanguage();
  const isViewer = currentUserRole?.toLowerCase() === 'viewer' || currentUserRole?.toLowerCase().includes('peninjau');
  const [draggingTaskId, setDraggingTaskId] = useState<string | null>(null);
  const [dragOverColumnId, setDragOverColumnId] = useState<ColumnId | null>(null);
  const [isBannerCollapsed, setIsBannerCollapsed] = useState(false);
  const [mobileActiveColumn, setMobileActiveColumn] = useState<ColumnId | 'all'>('all');
  const [dragPreviewWidth, setDragPreviewWidth] = useState<number>(310);

  // Lightbox / Image Zoom State for Cover and Avatar
  const [imageZoom, setImageZoom] = useState<{
    isOpen: boolean;
    src: string;
    title: string;
    subtitle?: string;
  } | null>(null);

  // Dynamic Trello-style List Creation & Renaming State
  const [isAddingList, setIsAddingList] = useState(false);
  const [newListTitle, setNewListTitle] = useState('');
  const [newListColor, setNewListColor] = useState<string>('#64748b');
  const [editingColumnId, setEditingColumnId] = useState<string | null>(null);
  const [editingColumnTitle, setEditingColumnTitle] = useState('');
  const [openMenuColumnId, setOpenMenuColumnId] = useState<string | null>(null);
  const [colorPickerColumnId, setColorPickerColumnId] = useState<string | null>(null);

  // Dynamic Trello-style Inline Card Composer State
  const [addingCardColumnId, setAddingCardColumnId] = useState<string | null>(null);
  const [newCardTitle, setNewCardTitle] = useState('');

  // Delete List Confirm Dialog State
  const [deleteColumnConfirm, setDeleteColumnConfirm] = useState<{
    isOpen: boolean;
    colId: string;
    title: string;
    taskCount: number;
  }>({
    isOpen: false,
    colId: '',
    title: '',
    taskCount: 0,
  });

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

  // Natural Kanban progress:
  // Card is done if it is in a "Done / Selesai" column, or card is marked completed, or all its checklist items are completed
  const completedTasksCount = useMemo(() => {
    return tasks.filter((t) => {
      const col = columns.find((c) => c.id === t.columnId);
      const isDoneColumn = col ? /done|selesai/i.test(col.title) || col.id === 'done' : t.columnId === 'done';
      const hasChecklist = t.checklist && t.checklist.length > 0;
      const allChecklistDone = hasChecklist && t.checklist.every((c) => c.completed);
      return isDoneColumn || Boolean(t.isCompleted) || allChecklistDone;
    }).length;
  }, [tasks, columns]);

  const doneCount = completedTasksCount;
  const totalCount = tasks.length;
  const progressPercent = totalCount > 0 ? Math.round((completedTasksCount / totalCount) * 100) : 0;

  // Handle escape key to close image zoom lightbox
  useEffect(() => {
    if (!imageZoom?.isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setImageZoom(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [imageZoom]);

  // Close popovers and menus on outside click or Escape
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target?.closest('.column-menu-container') && !target?.closest('.column-color-picker-container')) {
        setOpenMenuColumnId(null);
        setColorPickerColumnId(null);
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpenMenuColumnId(null);
        setColorPickerColumnId(null);
      }
    };
    window.addEventListener('mousedown', handleOutsideClick);
    window.addEventListener('keydown', handleEscape);
    return () => {
      window.removeEventListener('mousedown', handleOutsideClick);
      window.removeEventListener('keydown', handleEscape);
    };
  }, []);

  const submitCreateList = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newListTitle.trim() || !onCreateList) return;
    onCreateList(newListTitle.trim(), newListColor);
    setNewListTitle('');
    setNewListColor('#64748b');
    setIsAddingList(false);
  };

  const handleSelectColumnColor = (col: Column, color: string) => {
    if (!onUpdateList) return;
    onUpdateList({
      ...col,
      color: color,
      badgeColor: color,
    });
    setColorPickerColumnId(null);
    setOpenMenuColumnId(null);
  };

  const submitCreateCard = (columnId: string) => {
    if (!newCardTitle.trim()) return;
    if (onInlineCreateCard) {
      onInlineCreateCard(columnId, newCardTitle.trim());
    } else {
      onQuickAddTask(columnId);
    }
    setNewCardTitle('');
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
    const col = columns.find((c) => c.id === colId);
    const title = col ? getColumnTitle(col.id, col.title) : colId;
    const taskCount = tasks.filter((t) => t.columnId === colId).length;
    setDeleteColumnConfirm({
      isOpen: true,
      colId,
      title,
      taskCount,
    });
    setOpenMenuColumnId(null);
  };

  const getColumnTitle = (_colId: string, defaultTitle: string) => {
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
          <div className="max-w-[860px] mx-auto sm:mx-0 rounded-[36px] border border-neutral-200 dark:border-[#20232c] bg-white dark:bg-[#111217] shadow-sm relative p-3 sm:p-4 md:p-5">
            {/* Cover Banner - Strict 3:1 Aspect Ratio on All Devices */}
            {!isBannerCollapsed && (
              <div
                onClick={() => {
                  if (project.coverImage) {
                    setImageZoom({
                      isOpen: true,
                      src: project.coverImage,
                      title: language === 'id' ? 'Sampul Proyek' : 'Project Cover Banner',
                      subtitle: project.name,
                    });
                  }
                }}
                className={`relative w-full aspect-[3/1] rounded-[28px] overflow-hidden bg-gradient-to-r from-red-600 via-rose-600 to-amber-600 group shadow-xs ${
                  project.coverImage ? 'cursor-zoom-in' : ''
                }`}
                title={project.coverImage ? (language === 'id' ? 'Klik untuk memperbesar sampul' : 'Click to zoom cover') : undefined}
              >
                {project.coverImage ? (
                  <>
                    <img
                      src={project.coverImage}
                      alt="Sampul Proyek"
                      loading="lazy"
                      decoding="async"
                      className="w-full h-full object-cover object-center select-none transition-transform duration-300 group-hover:scale-[1.02]"
                    />
                    {/* Zoom Indicator on Hover */}
                    <div className="absolute bottom-2.5 right-2.5 sm:bottom-3 sm:right-3 z-10 px-3 py-1 rounded-full bg-black/75 text-white text-xs font-medium flex items-center gap-1.5 shadow-md border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                      <ZoomIn className="w-3.5 h-3.5" />
                      <span>{language === 'id' ? 'Perbesar' : 'Zoom'}</span>
                    </div>
                  </>
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-r from-red-600 via-rose-700 to-amber-600 text-white/35">
                    <span className="text-xl sm:text-3xl md:text-4xl font-black uppercase tracking-widest select-none">
                      {project.name}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Profile Avatar & Details Section */}
            <div className="px-1.5 sm:px-2.5 pb-1 sm:pb-2 pt-0">
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                {/* Left: Avatar + Title + Description */}
                <div className="flex flex-col sm:flex-row sm:items-end gap-3.5 sm:gap-4.5 min-w-0">
                  {/* Project Profile Avatar */}
                  <div className={`relative group shrink-0 ${!isBannerCollapsed ? '-mt-9 sm:-mt-11 md:-mt-12' : 'mt-3.5'} z-20`}>
                    <div
                      onClick={() => {
                        if (project.avatar) {
                          setImageZoom({
                            isOpen: true,
                            src: project.avatar,
                            title: language === 'id' ? 'Foto Profil Proyek' : 'Project Profile Photo',
                            subtitle: project.name,
                          });
                        }
                      }}
                      className={`w-18 h-18 sm:w-22 sm:h-22 md:w-24 md:h-24 rounded-[26px] overflow-hidden border-4 border-white dark:border-[#111217] shadow-xl bg-white dark:bg-[#181a24] flex items-center justify-center relative ${
                        project.avatar ? 'cursor-zoom-in' : ''
                      }`}
                      title={project.avatar ? (language === 'id' ? 'Klik untuk memperbesar foto profil' : 'Click to zoom profile photo') : undefined}
                    >
                      {project.avatar ? (
                        <>
                          <img
                            src={project.avatar}
                            alt={project.name}
                            loading="lazy"
                            decoding="async"
                            className="w-full h-full object-cover select-none transition-transform duration-300 group-hover:scale-105"
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                            <ZoomIn className="w-5 h-5 text-white drop-shadow" />
                          </div>
                        </>
                      ) : (
                        <div className={`w-full h-full ${project.iconColor || 'bg-red-600'} text-white flex items-center justify-center font-black text-xl sm:text-2xl md:text-3xl select-none`}>
                          {project.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Project Titles & Category */}
                  <div className="pt-1 sm:pt-0 sm:pb-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-lg sm:text-2xl font-black text-neutral-950 dark:text-white tracking-tight">
                        {project.name}
                      </h2>
                      <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20">
                        {project.category}
                      </span>
                      {onOpenEditProjectModal && (
                        <button
                          type="button"
                          onClick={onOpenEditProjectModal}
                          className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-neutral-100 hover:bg-neutral-200 dark:bg-[#1f2230] dark:hover:bg-[#282c3e] border border-neutral-200/80 dark:border-[#2f3346] text-neutral-700 dark:text-neutral-300 transition-colors cursor-pointer shadow-xs"
                          title={language === 'id' ? 'Edit nama & detail proyek' : 'Edit project details'}
                        >
                          <Edit2 className="w-3 h-3 text-neutral-500 dark:text-neutral-400" />
                          <span>{language === 'id' ? 'Edit Proyek' : 'Edit Project'}</span>
                        </button>
                      )}
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
                  <div
                    title={`${language === 'id' ? 'Progres penyelesaian kartu di papan ini' : 'Board cards completion progress'}: ${doneCount} dari ${totalCount} selesai`}
                    className="flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-neutral-100 dark:bg-[#181a22] border border-neutral-200 dark:border-[#272a35] text-neutral-700 dark:text-neutral-300 font-medium"
                  >
                    <span className="text-[11px] text-neutral-500 dark:text-neutral-400">{language === 'id' ? 'Progres' : 'Progress'}:</span>
                    <div className="w-16 sm:w-24 h-2 rounded-full bg-neutral-200 dark:bg-neutral-800 overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                    <span className="font-bold text-neutral-900 dark:text-white tabular-nums">
                      {doneCount}/{totalCount} ({progressPercent}%)
                    </span>
                  </div>

                  {!isViewer && onQuickAddTask && (
                    <button
                      onClick={() => onQuickAddTask(columns[0]?.id || 'todo')}
                      className="px-4 py-1.5 rounded-full bg-red-600 hover:bg-red-700 active:scale-95 text-white font-semibold flex items-center gap-1.5 shadow-xs shadow-red-600/30 transition-all cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                      <span>{t('newTask')}</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => setIsBannerCollapsed(!isBannerCollapsed)}
                    title={isBannerCollapsed ? (language === 'id' ? 'Tampilkan Sampul' : 'Show Cover') : (language === 'id' ? 'Sembunyikan Sampul' : 'Hide Cover')}
                    className="p-1.5 rounded-full border border-neutral-200 dark:border-[#272a35] text-neutral-500 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-[#181a22] transition-colors cursor-pointer"
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
          </div>
        </div>
      )}

      {/* 2. Viewer Notice Banner */}
      {isViewer && (
        <div className="mx-3 sm:mx-5 md:mx-6 mb-2 px-4 py-2.5 rounded-2xl bg-neutral-100 dark:bg-[#161822] border border-neutral-200 dark:border-[#272a35] text-neutral-700 dark:text-neutral-300 text-xs flex items-center justify-between gap-3 shadow-xs shrink-0">
          <div className="flex items-center gap-2">
            <Eye className="w-4 h-4 text-neutral-500 shrink-0" />
            <span>
              <strong>Mode Peninjau (Viewer):</strong> Anda memiliki akses baca untuk melihat seluruh kartu & progres proyek.
            </span>
          </div>
          <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-neutral-200 dark:bg-[#252834] text-neutral-700 dark:text-neutral-300 uppercase tracking-wider shrink-0">
            Read-Only
          </span>
        </div>
      )}

      {/* Mobile Column Navigation Switcher */}
      <div className="sm:hidden px-3 pt-1.5 pb-2.5 flex items-center gap-2 overflow-x-auto no-scrollbar shrink-0">
        <button
          type="button"
          onClick={() => setMobileActiveColumn('all')}
          className={`px-4 py-2 rounded-full text-xs sm:text-sm font-bold whitespace-nowrap transition-all cursor-pointer shadow-xs ${
            mobileActiveColumn === 'all'
              ? 'bg-neutral-950 text-white dark:bg-white dark:text-neutral-950 shadow-md ring-2 ring-neutral-900/30 dark:ring-white/40'
              : 'bg-neutral-200/90 text-neutral-800 dark:bg-[#1f2230] dark:text-neutral-200 hover:bg-neutral-300 dark:hover:bg-[#282c3e]'
          }`}
        >
          {language === 'id' ? 'Semua' : 'All'} ({tasks.length})
        </button>
        {columns.map((col) => {
          const colTasks = tasksByColumn[col.id] || [];
          const colColor = getColumnColor(col);
          const isActive = mobileActiveColumn === col.id;
          return (
            <button
              key={col.id}
              type="button"
              onClick={() => setMobileActiveColumn(col.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs sm:text-sm font-bold whitespace-nowrap transition-all cursor-pointer shadow-xs ${
                isActive
                  ? 'bg-neutral-950 text-white dark:bg-white dark:text-neutral-950 shadow-md ring-2'
                  : 'bg-neutral-200/90 text-neutral-800 dark:bg-[#1f2230] dark:text-neutral-200 hover:bg-neutral-300 dark:hover:bg-[#282c3e]'
              }`}
              style={{ ringColor: isActive ? colColor : undefined }}
            >
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0 shadow-xs"
                style={{ backgroundColor: colColor }}
              />
              <span>{getColumnTitle(col.id, col.title)}</span>
              <span className="font-mono text-xs opacity-90 font-bold">({colTasks.length})</span>
            </button>
          );
        })}
        {!isViewer && onCreateList && (
          <button
            type="button"
            onClick={() => setIsAddingList(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs sm:text-sm font-bold text-red-600 dark:text-red-400 bg-red-500/15 border border-red-500/30 whitespace-nowrap shrink-0 cursor-pointer shadow-xs"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>{language === 'id' ? 'Daftar' : 'List'}</span>
          </button>
        )}
      </div>

      {/* 3. Horizontal Kanban Board Lists */}
      <div className="flex-1 flex overflow-x-auto p-3 sm:p-5 md:p-6 pt-1">
        {columns.length === 0 ? (
          /* Empty Board State when no lists exist yet */
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center min-h-[360px] animate-in fade-in">
            <div className="w-16 h-16 rounded-[24px] bg-neutral-100 dark:bg-[#161822] border border-neutral-200 dark:border-[#272a38] flex items-center justify-center text-neutral-400 mb-4 shadow-xs">
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
                    className="p-3.5 rounded-[28px] bg-white dark:bg-[#151722] border border-neutral-200 dark:border-[#282b3a] shadow-lg space-y-2.5"
                  >
                    <input
                      type="text"
                      autoFocus
                      placeholder={language === 'id' ? 'Nama daftar (mis. Konsep)...' : 'List name...'}
                      value={newListTitle}
                      onChange={(e) => setNewListTitle(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-2xl text-xs bg-neutral-100 dark:bg-[#1d202d] border border-neutral-200 dark:border-[#2f3345] focus:outline-none focus:border-red-500 text-neutral-900 dark:text-white font-medium"
                    />

                    {/* Quick Color Picker Swatches */}
                    <div className="flex items-center gap-1.5 overflow-x-auto py-1 no-scrollbar">
                      <span className="text-[11px] text-neutral-400 font-medium shrink-0 mr-1">
                        {language === 'id' ? 'Warna:' : 'Color:'}
                      </span>
                      {LIST_COLOR_PRESETS.map((c) => (
                        <button
                          key={c.value}
                          type="button"
                          onClick={() => setNewListColor(c.value)}
                          title={language === 'id' ? c.labelId : c.labelEn}
                          className={`w-5 h-5 rounded-full transition-transform shrink-0 ${
                            newListColor === c.value
                              ? 'ring-2 ring-red-500 ring-offset-1 dark:ring-offset-[#151722] scale-110'
                              : 'hover:scale-110 opacity-70 hover:opacity-100'
                          }`}
                          style={{ backgroundColor: c.value }}
                        />
                      ))}
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="submit"
                        disabled={!newListTitle.trim()}
                        className="flex-1 py-2 px-3 rounded-full bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-xs font-semibold shadow-xs cursor-pointer"
                      >
                        {language === 'id' ? 'Tambah Daftar' : 'Add List'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setIsAddingList(false);
                          setNewListTitle('');
                        }}
                        className="p-2 rounded-full text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-[#1d202d] cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </form>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsAddingList(true)}
                    className="w-full py-2.5 px-4 rounded-full bg-red-600 hover:bg-red-700 active:scale-95 text-white text-xs font-semibold flex items-center justify-center gap-2 shadow-md shadow-red-600/25 transition-all cursor-pointer"
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
                const colColor = getColumnColor(column);
                const isLight = isLightColor(colColor);

                return (
                  <div
                    key={column.id}
                    onDragOver={(e) => handleDragOver(e, column.id)}
                    onDragLeave={() => handleDragLeave(column.id)}
                    onDrop={(e) => handleDrop(e, column.id)}
                    onDragEnd={handleDragEnd}
                    className={`${
                      mobileActiveColumn !== 'all' ? 'w-[calc(100vw-24px)] max-w-none' : 'w-[84vw] max-w-[320px]'
                    } sm:w-80 md:w-84 flex flex-col max-h-full rounded-[32px] border transition-all duration-150 select-none shadow-md relative overflow-visible ${
                      isOver
                        ? 'scale-[1.02] shadow-2xl ring-4 ring-white/60 brightness-105'
                        : ''
                    }`}
                    style={{
                      backgroundColor: colColor,
                      borderColor: isOver ? (isLight ? '#000000' : '#ffffff') : 'rgba(0, 0, 0, 0.12)',
                    }}
                  >
                    {/* Column Header */}
                    <div className={`px-4 pt-3.5 pb-3 flex items-center justify-between border-b ${isLight ? 'border-black/10' : 'border-white/15'}`}>
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
                            className="flex-1 px-3 py-1.5 text-xs font-semibold rounded-full bg-white dark:bg-[#1e212d] border border-neutral-300 text-neutral-900 dark:text-white focus:outline-none shadow-xs"
                          />
                          <button
                            type="button"
                            onClick={() => submitEditColumn(column)}
                            className="p-1.5 rounded-full text-emerald-600 bg-white hover:bg-white/90 shadow-xs cursor-pointer"
                          >
                            <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingColumnId(null)}
                            className="p-1.5 rounded-full text-neutral-500 bg-white hover:bg-white/90 shadow-xs cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 min-w-0">
                          {/* List Color Dot Trigger */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (!isViewer) {
                                setColorPickerColumnId(colorPickerColumnId === column.id ? null : column.id);
                                setOpenMenuColumnId(null);
                              }
                            }}
                            title={!isViewer ? (language === 'id' ? 'Klik untuk ubah warna papan daftar' : 'Click to change list color') : undefined}
                            className={`w-3.5 h-3.5 rounded-full shrink-0 transition-all duration-200 shadow-xs ${
                              isLight
                                ? 'bg-neutral-900 ring-2 ring-neutral-900/40 hover:scale-125'
                                : 'bg-white ring-2 ring-white/70 hover:ring-white hover:scale-125'
                            } ${!isViewer ? 'cursor-pointer' : ''}`}
                          />
                          <h2
                            onClick={() => !isViewer && startEditColumn(column)}
                            title={!isViewer ? (language === 'id' ? 'Klik untuk ubah nama' : 'Click to rename') : undefined}
                            className={`text-sm sm:text-base font-extrabold truncate tracking-tight ${
                              isLight ? 'text-neutral-950' : 'text-white drop-shadow-xs'
                            } ${!isViewer ? 'cursor-pointer hover:opacity-85 transition-opacity' : ''}`}
                          >
                            {displayTitle}
                          </h2>
                          <span
                            className={`text-xs font-mono tabular-nums px-2.5 py-0.5 rounded-full font-bold shadow-xs ${
                              isLight
                                ? 'bg-black/15 text-neutral-950 border border-black/20'
                                : 'bg-black/35 text-white border border-white/30'
                            }`}
                          >
                            {columnTasks.length}
                          </span>
                        </div>
                      )}

                      {/* Header Actions */}
                      {!isViewer && !isEditing && (
                        <div className="flex items-center gap-1 relative column-menu-container">
                          {/* Plus button now triggers the instant inline card creation just like the bottom button */}
                          <button
                            onClick={() => {
                              setAddingCardColumnId(addingCardColumnId === column.id ? null : column.id);
                              setNewCardTitle('');
                            }}
                            title={language === 'id' ? '+ Tambah kartu di daftar ini' : '+ Add card to this list'}
                            className={`p-1.5 rounded-full transition-colors cursor-pointer ${
                              isLight
                                ? 'text-neutral-800 hover:text-black hover:bg-black/10'
                                : 'text-white/90 hover:text-white hover:bg-white/20'
                            }`}
                          >
                            <Plus className="w-4 h-4 stroke-[2.5]" />
                          </button>

                          {/* List Menu (...) */}
                          <button
                            onClick={() => {
                              setOpenMenuColumnId(isMenuOpen ? null : column.id);
                              setColorPickerColumnId(null);
                            }}
                            title={language === 'id' ? 'Opsi daftar' : 'List options'}
                            className={`p-1.5 rounded-full transition-colors cursor-pointer ${
                              isLight
                                ? 'text-neutral-700 hover:text-neutral-950 hover:bg-black/10'
                                : 'text-white/85 hover:text-white hover:bg-white/20'
                            }`}
                          >
                            <MoreHorizontal className="w-4 h-4" />
                          </button>

                          {/* Column Popover Menu */}
                          {isMenuOpen && (
                            <div
                              onClick={(e) => e.stopPropagation()}
                              className="absolute right-0 top-9 z-30 w-48 rounded-[24px] bg-white dark:bg-[#181a24] border border-neutral-200 dark:border-[#2b2f3f] shadow-2xl p-1.5 text-xs animate-in zoom-in-95 duration-100 text-neutral-800 dark:text-neutral-200 overflow-hidden"
                            >
                              <button
                                type="button"
                                onClick={() => {
                                  setColorPickerColumnId(column.id);
                                  setOpenMenuColumnId(null);
                                }}
                                className="w-full px-3 py-2 rounded-xl text-left flex items-center gap-2 hover:bg-neutral-100 dark:hover:bg-[#202330] text-neutral-700 dark:text-neutral-200 cursor-pointer"
                              >
                                <div
                                  className="w-3.5 h-3.5 rounded-full shrink-0 ring-1 ring-black/10 dark:ring-white/20"
                                  style={{ backgroundColor: colColor }}
                                />
                                <span>{language === 'id' ? 'Ubah Warna Daftar' : 'Change List Color'}</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => startEditColumn(column)}
                                className="w-full px-3 py-2 rounded-xl text-left flex items-center gap-2 hover:bg-neutral-100 dark:hover:bg-[#202330] text-neutral-700 dark:text-neutral-200 cursor-pointer"
                              >
                                <Edit2 className="w-3.5 h-3.5 text-neutral-400" />
                                <span>{language === 'id' ? 'Ubah Nama' : 'Rename List'}</span>
                              </button>
                              {onDeleteList && (
                                <button
                                  type="button"
                                  onClick={() => handleDeleteColumn(column.id)}
                                  className="w-full px-3 py-2 rounded-xl text-left flex items-center gap-2 hover:bg-red-500/10 text-red-600 dark:text-red-400 cursor-pointer"
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

                    {/* Color Picker Popover */}
                    {colorPickerColumnId === column.id && (
                      <div
                        onClick={(e) => e.stopPropagation()}
                        className="column-color-picker-container absolute left-3 top-14 z-40 w-70 p-4 rounded-[28px] bg-white dark:bg-[#181a24] border border-neutral-200/90 dark:border-[#2b2f42] shadow-2xl text-xs space-y-3 animate-in fade-in zoom-in-95 duration-150"
                      >
                        {/* Popover Header */}
                        <div className="flex items-center justify-between pb-2 border-b border-neutral-100 dark:border-[#242738]">
                          <div className="flex items-center gap-1.5 font-bold text-neutral-900 dark:text-white">
                            <Palette className="w-4 h-4 text-red-500" />
                            <span>{language === 'id' ? 'Warna Papan Daftar' : 'List Color'}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => setColorPickerColumnId(null)}
                            className="p-1.5 rounded-full text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-[#202332] cursor-pointer transition-colors"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Live Preview Strip */}
                        <div
                          className="p-2.5 rounded-[18px] border flex items-center justify-between transition-colors duration-200"
                          style={{
                            backgroundColor: `${colColor}14`,
                            borderColor: `${colColor}35`,
                          }}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span
                              className="w-2.5 h-2.5 rounded-full shrink-0 shadow-xs"
                              style={{ backgroundColor: colColor }}
                            />
                            <span className="font-semibold text-neutral-800 dark:text-neutral-200 truncate text-[11px]">
                              {displayTitle}
                            </span>
                          </div>
                          <span
                            className="text-[10px] font-mono px-2 py-0.5 rounded-full font-bold"
                            style={{ color: colColor }}
                          >
                            {columnTasks.length} {language === 'id' ? 'tugas' : 'tasks'}
                          </span>
                        </div>

                        {/* Color Presets Grid */}
                        <div>
                          <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block mb-2">
                            {language === 'id' ? 'Pilihan Warna' : 'Preset Colors'}
                          </span>
                          <div className="grid grid-cols-5 gap-2">
                            {LIST_COLOR_PRESETS.map((preset) => {
                              const isSelected = colColor.toLowerCase() === preset.value.toLowerCase();
                              return (
                                <button
                                  key={preset.value}
                                  type="button"
                                  onClick={() => handleSelectColumnColor(column, preset.value)}
                                  title={language === 'id' ? preset.labelId : preset.labelEn}
                                  className={`w-9 h-9 rounded-[14px] transition-all duration-150 flex items-center justify-center cursor-pointer shadow-xs ${
                                    isSelected
                                      ? 'ring-2 ring-red-500 ring-offset-2 dark:ring-offset-[#181a24] scale-105'
                                      : 'hover:scale-110 hover:shadow-md opacity-90 hover:opacity-100'
                                  }`}
                                  style={{ backgroundColor: preset.value }}
                                >
                                  {isSelected && <Check className="w-4 h-4 text-white stroke-[3] drop-shadow-xs" />}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Custom Color Input & Reset Default */}
                        <div className="pt-2 border-t border-neutral-100 dark:border-[#242738] flex items-center gap-2">
                          <label
                            className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-full border border-neutral-200 dark:border-[#2b2f42] hover:bg-neutral-50 dark:hover:bg-[#202332] text-neutral-700 dark:text-neutral-300 cursor-pointer transition-colors"
                          >
                            <input
                              type="color"
                              value={colColor.startsWith('#') ? colColor : '#64748b'}
                              onChange={(e) => handleSelectColumnColor(column, e.target.value)}
                              className="sr-only"
                            />
                            <div
                              className="w-3.5 h-3.5 rounded-full border border-black/20 shrink-0"
                              style={{ backgroundColor: colColor }}
                            />
                            <span className="text-[11px] font-medium">
                              {language === 'id' ? 'Kustom...' : 'Custom...'}
                            </span>
                          </label>

                          <button
                            type="button"
                            onClick={() => handleSelectColumnColor(column, '')}
                            className="flex items-center justify-center gap-1 py-1.5 px-3 rounded-full border border-neutral-200 dark:border-[#2b2f42] hover:bg-neutral-50 dark:hover:bg-[#202332] text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white cursor-pointer transition-colors text-[11px] font-medium"
                            title={language === 'id' ? 'Reset ke warna standar' : 'Reset to default color'}
                          >
                            <RotateCcw className="w-3 h-3" />
                            <span>Reset</span>
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Cards Container with smooth vertical scroll */}
                    <div className="flex-1 overflow-y-auto p-3 space-y-2.5 min-h-[140px] max-h-[calc(100vh-175px)]">
                      {columnTasks.length === 0 && addingCardColumnId !== column.id && (
                        <div
                          onClick={() => {
                            if (!isViewer) {
                              setAddingCardColumnId(column.id);
                              setNewCardTitle('');
                            }
                          }}
                          className={`h-22 rounded-[24px] border border-dashed flex flex-col items-center justify-center p-3 text-center transition-all group ${
                            isLight
                              ? 'border-black/25 bg-black/5 hover:bg-black/10 text-neutral-800'
                              : 'border-white/30 bg-white/10 hover:bg-white/20 text-white'
                          } ${isViewer ? 'cursor-default' : 'cursor-pointer'}`}
                        >
                          {!isViewer && (
                            <Plus className={`w-4 h-4 mb-0.5 transition-transform group-hover:scale-110 ${isLight ? 'text-neutral-800' : 'text-white'}`} />
                          )}
                          <span className="text-xs sm:text-sm font-bold">
                            {language === 'id' ? '+ Tambah kartu' : '+ Add a card'}
                          </span>
                        </div>
                      )}

                      {columnTasks.map((task) => (
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
                          onImageClick={(url, title) => {
                            setImageZoom({
                              isOpen: true,
                              src: url,
                              title: title || task.title,
                              subtitle: task.title,
                            });
                          }}
                        />
                      ))}

                      {/* Inline Card Composer (Trello style) */}
                      {addingCardColumnId === column.id && (
                        <div className="p-3.5 rounded-[24px] bg-white dark:bg-[#161822] border-2 border-red-500 shadow-lg space-y-2.5 animate-in fade-in">
                          <textarea
                            autoFocus
                            rows={2}
                            value={newCardTitle}
                            onChange={(e) => setNewCardTitle(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                submitCreateCard(column.id);
                              }
                              if (e.key === 'Escape') {
                                setAddingCardColumnId(null);
                                setNewCardTitle('');
                              }
                            }}
                            placeholder={language === 'id' ? 'Masukkan judul kartu (Enter untuk simpan)...' : 'Enter card title (Press Enter to add)...'}
                            className="w-full text-sm sm:text-base bg-transparent text-neutral-950 dark:text-white placeholder-neutral-400 dark:placeholder-neutral-500 focus:outline-none resize-none font-semibold leading-relaxed px-1"
                          />
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => submitCreateCard(column.id)}
                              disabled={!newCardTitle.trim()}
                              className="py-2 px-4 rounded-full bg-red-600 hover:bg-red-700 active:scale-95 disabled:opacity-40 text-white text-xs sm:text-sm font-bold shadow-xs cursor-pointer transition-colors"
                            >
                              {language === 'id' ? 'Tambah kartu' : 'Add card'}
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setAddingCardColumnId(null);
                                setNewCardTitle('');
                              }}
                              className="p-1.5 rounded-full text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 cursor-pointer"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Column Footer: + Add a card */}
                    {!isViewer && addingCardColumnId !== column.id && (
                      <div className={`p-2.5 px-3 border-t ${isLight ? 'border-black/10' : 'border-white/15'}`}>
                        <button
                          onClick={() => {
                            setAddingCardColumnId(column.id);
                            setNewCardTitle('');
                          }}
                          className={`w-full py-2.5 px-3.5 rounded-full text-xs sm:text-sm font-bold transition-all flex items-center justify-start gap-2 cursor-pointer shadow-xs ${
                            isLight
                              ? 'text-neutral-900 hover:text-black bg-black/10 hover:bg-black/15'
                              : 'text-white hover:text-white bg-white/20 hover:bg-white/30'
                          }`}
                        >
                          <Plus className="w-4 h-4 stroke-[2.5]" />
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
                    className="p-3.5 rounded-[32px] bg-white dark:bg-[#161822] border border-neutral-200 dark:border-[#262a38] shadow-md space-y-3 animate-in fade-in"
                  >
                    <input
                      type="text"
                      autoFocus
                      placeholder={language === 'id' ? 'Judul daftar (mis. Konsep, Aset)...' : 'List title...'}
                      value={newListTitle}
                      onChange={(e) => setNewListTitle(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-2xl text-xs bg-neutral-100 dark:bg-[#12141c] border border-neutral-200 dark:border-[#2f3345] focus:outline-none focus:border-red-500 text-neutral-900 dark:text-white font-medium"
                    />

                    {/* Quick Color Picker Swatches */}
                    <div className="flex items-center gap-1.5 overflow-x-auto py-1 no-scrollbar">
                      <span className="text-[11px] text-neutral-400 font-medium shrink-0 mr-1">
                        {language === 'id' ? 'Warna:' : 'Color:'}
                      </span>
                      {LIST_COLOR_PRESETS.map((c) => (
                        <button
                          key={c.value}
                          type="button"
                          onClick={() => setNewListColor(c.value)}
                          title={language === 'id' ? c.labelId : c.labelEn}
                          className={`w-5 h-5 rounded-full transition-transform shrink-0 ${
                            newListColor === c.value
                              ? 'ring-2 ring-red-500 ring-offset-1 dark:ring-offset-[#161822] scale-110'
                              : 'hover:scale-110 opacity-70 hover:opacity-100'
                          }`}
                          style={{ backgroundColor: c.value }}
                        />
                      ))}
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="submit"
                        disabled={!newListTitle.trim()}
                        className="flex-1 py-2 px-3 rounded-full bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-xs font-semibold shadow-xs cursor-pointer"
                      >
                        {language === 'id' ? 'Tambah Daftar' : 'Add List'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setIsAddingList(false);
                          setNewListTitle('');
                        }}
                        className="p-2 rounded-full text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </form>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsAddingList(true)}
                    className="w-full py-4 px-5 rounded-[32px] border-2 border-dashed border-neutral-300 dark:border-[#272a38] hover:border-red-500/60 dark:hover:border-red-500/60 bg-neutral-100/60 dark:bg-[#12141d]/60 hover:bg-red-500/5 text-neutral-600 dark:text-neutral-400 hover:text-red-600 dark:hover:text-red-400 flex items-center justify-center gap-2 text-xs font-semibold transition-all cursor-pointer shadow-xs"
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

      {/* Delete List Confirmation Dialog */}
      <ConfirmModal
        isOpen={deleteColumnConfirm.isOpen}
        onClose={() => setDeleteColumnConfirm((prev) => ({ ...prev, isOpen: false }))}
        onConfirm={() => {
          if (deleteColumnConfirm.colId && onDeleteList) {
            onDeleteList(deleteColumnConfirm.colId);
          }
        }}
        title={language === 'id' ? 'Hapus Daftar?' : 'Delete List?'}
        message={
          language === 'id'
            ? deleteColumnConfirm.taskCount > 0
              ? `Daftar ini berisi ${deleteColumnConfirm.taskCount} kartu. Seluruh kartu di dalamnya akan dihapus secara permanen.`
              : 'Daftar ini akan dihapus dari papan proyek.'
            : deleteColumnConfirm.taskCount > 0
            ? `This list contains ${deleteColumnConfirm.taskCount} cards. All cards in it will be permanently deleted.`
            : 'This list will be removed from the project board.'
        }
        itemName={`Daftar: ${deleteColumnConfirm.title}`}
        confirmText={language === 'id' ? 'Hapus Daftar' : 'Delete List'}
      />

      {/* 4. Lightbox Modal Zoom Gambar (Sampul & Foto Profil) */}
      {imageZoom && imageZoom.isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 transition-opacity animate-in fade-in duration-200"
          onClick={() => setImageZoom(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-4xl w-full max-h-[92vh] flex flex-col items-center bg-[#111217] rounded-3xl border border-neutral-800 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
          >
            {/* Header Modal Zoom */}
            <div className="w-full px-5 py-3.5 flex items-center justify-between border-b border-neutral-800 bg-[#16181f]">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-2.5 h-2.5 rounded-full bg-red-500 shrink-0" />
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold text-white truncate">
                    {imageZoom.title}
                  </h3>
                  {imageZoom.subtitle && (
                    <p className="text-xs text-neutral-400 truncate">
                      {imageZoom.subtitle}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => triggerDownload(imageZoom.title || 'gambar.png', imageZoom.src)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-semibold shadow-xs transition-all cursor-pointer"
                  title={language === 'id' ? 'Unduh Gambar' : 'Download Image'}
                >
                  <Download className="w-3.5 h-3.5 text-neutral-300" />
                  <span>{language === 'id' ? 'Unduh Gambar' : 'Download'}</span>
                </button>
                <button
                  onClick={() => setImageZoom(null)}
                  className="p-1.5 rounded-xl hover:bg-neutral-800 text-neutral-400 hover:text-white transition-colors cursor-pointer"
                  title={language === 'id' ? 'Tutup (Esc)' : 'Close (Esc)'}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Tampilan Gambar Zoom */}
            <div className="p-3 sm:p-5 flex items-center justify-center w-full max-h-[calc(92vh-70px)] overflow-auto bg-black/40">
              <img
                src={imageZoom.src}
                alt={imageZoom.title}
                className="max-h-[75vh] w-auto max-w-full object-contain rounded-xl shadow-lg select-none"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

