import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Calendar,
  User as UserIcon,
  Tag,
  Paperclip,
  UploadCloud,
  FileText,
  FileSpreadsheet,
  Archive,
  Image as ImageIcon,
  Download,
  Trash2,
  Check,
  Send,
  MessageSquare,
  History,
  Sparkles,
  ExternalLink as ExternalLinkIcon,
  ChevronDown,
  CheckSquare,
  Square,
  Link2,
  Globe,
  Plus,
  AlertCircle,
  Eye,
  Bug,
  Zap,
  Palette,
  Lightbulb,
  Clock,
  CheckCircle2,
  Circle,
} from 'lucide-react';
import {
  Attachment,
  ChecklistItem,
  Column,
  ColumnId,
  Comment,
  ExternalLink,
  LinkType,
  Priority,
  Task,
  TaskType,
  User,
} from '../types';
import {
  formatDateIndonesian,
  formatFileSize,
  getFileTypeFromExtension,
  triggerDownload,
  compressImageFile,
  detectCloudService,
} from '../utils/fileHelpers';
import { UserAvatar } from './UserAvatar';
import { useLanguage } from '../context/LanguageContext';
import { ConfirmModal } from './ConfirmModal';

interface TaskDetailModalProps {
  task: Task;
  users: User[];
  currentUser: User;
  columns?: Column[];
  onClose: () => void;
  onUpdateTask: (updatedTask: Task) => void;
  onDeleteTask: (taskId: string) => void;
  onMoveTask?: (taskId: string, targetColumn: ColumnId) => void;
}

export const TaskDetailModal: React.FC<TaskDetailModalProps> = ({
  task,
  users,
  currentUser,
  columns = [],
  onClose,
  onUpdateTask,
  onDeleteTask,
  onMoveTask,
}) => {
  const { language, t } = useLanguage();

  // Core task state
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description);
  const [columnId, setColumnId] = useState<ColumnId>(task.columnId);
  const [priority, setPriority] = useState<Priority>(task.priority);
  const [assigneeId, setAssigneeId] = useState(task.assigneeId);
  const [dueDate, setDueDate] = useState(task.dueDate);
  const [taskType, setTaskType] = useState<TaskType>(task.taskType || 'task');
  const [cardColor, setCardColor] = useState<string>(task.cardColor || '');
  const [isCompleted, setIsCompleted] = useState<boolean>(Boolean(task.isCompleted));
  const [estimate, setEstimate] = useState<string>(task.estimate || '');

  // Sub-tasks / Checklist state
  const [newChecklistText, setNewChecklistText] = useState('');
  const [activePopover, setActivePopover] = useState<'checklist' | 'members' | 'labels' | 'dates' | 'add' | null>(null);
  const [checklistTitleInput, setChecklistTitleInput] = useState('Checklist');
  const [showDetails, setShowDetails] = useState(true);
  const [isCommentFocused, setIsCommentFocused] = useState(false);

  // Attachments filter tab
  const [attachmentTab, setAttachmentTab] = useState<'all' | 'work' | 'docs'>('all');
  const [isAddingLink, setIsAddingLink] = useState(false);
  const [newLinkTitle, setNewLinkTitle] = useState('');
  const [newLinkUrl, setNewLinkUrl] = useState('');
  const [newLinkType, setNewLinkType] = useState<LinkType>('link');

  // Drag over drop zone
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const resultFileInputRef = useRef<HTMLInputElement | null>(null);

  // Quick Action refs
  const checklistInputRef = useRef<HTMLInputElement | null>(null);
  const checklistSectionRef = useRef<HTMLDivElement | null>(null);
  const dateInputRef = useRef<HTMLInputElement | null>(null);
  const assigneeSelectRef = useRef<HTMLSelectElement | null>(null);
  const prioritySelectRef = useRef<HTMLSelectElement | null>(null);

  // Discussion & Comments state
  const [commentText, setCommentText] = useState('');
  const [selectedAuthorId, setSelectedAuthorId] = useState<string>(currentUser.id);

  // Lightbox preview modal for images
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [isClosing, setIsClosing] = useState(false);

  // Custom Confirm Modals
  const [isDeleteTaskConfirmOpen, setIsDeleteTaskConfirmOpen] = useState(false);
  const [attachmentToDelete, setAttachmentToDelete] = useState<Attachment | null>(null);
  const [linkToDelete, setLinkToDelete] = useState<ExternalLink | null>(null);

  // Sync state if task prop changes externally
  useEffect(() => {
    setTitle(task.title);
    setDescription(task.description);
    setColumnId(task.columnId);
    setPriority(task.priority);
    setAssigneeId(task.assigneeId);
    setDueDate(task.dueDate);
    setTaskType(task.taskType || 'task');
    setCardColor(task.cardColor || '');
    setIsCompleted(Boolean(task.isCompleted));
    setEstimate(task.estimate || '');
  }, [task.id]);

  // Handle closing with smooth animation
  const handleClose = () => {
    if (isClosing) return;
    setIsClosing(true);
    setTimeout(() => {
      onClose();
    }, 160);
  };

  // Keyboard shortcut: Escape to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !previewImage) {
        handleClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [previewImage]);

  // Direct persistence helpers
  const persistChanges = (partial: Partial<Task>) => {
    const updated: Task = {
      ...task,
      title,
      description,
      columnId,
      priority,
      assigneeId,
      dueDate,
      taskType,
      cardColor,
      isCompleted,
      estimate,
      ...partial,
    };
    onUpdateTask(updated);
  };

  const handleTitleBlur = () => {
    const cleanTitle = title.trim() || 'Tugas Tanpa Judul';
    setTitle(cleanTitle);
    if (cleanTitle !== task.title) {
      persistChanges({ title: cleanTitle });
    }
  };

  const handleDescBlur = () => {
    if (description !== task.description) {
      persistChanges({ description });
    }
  };

  const handleStatusChange = (newCol: ColumnId) => {
    setColumnId(newCol);
    if (onMoveTask) {
      onMoveTask(task.id, newCol);
    }
    const completedNow = newCol === 'done';
    setIsCompleted(completedNow);
    persistChanges({ columnId: newCol, isCompleted: completedNow });
  };

  const handlePriorityChange = (newPriority: Priority) => {
    setPriority(newPriority);
    persistChanges({ priority: newPriority });
  };

  const handleAssigneeChange = (newAssigneeId: string) => {
    setAssigneeId(newAssigneeId);
    persistChanges({ assigneeId: newAssigneeId });
  };

  const handleDueDateChange = (newDueDate: string) => {
    setDueDate(newDueDate);
    persistChanges({ dueDate: newDueDate });
  };

  const handleTaskTypeChange = (newType: TaskType) => {
    setTaskType(newType);
    persistChanges({ taskType: newType });
  };

  const handleCardColorChange = (newColor: string) => {
    setCardColor(newColor);
    persistChanges({ cardColor: newColor });
  };

  const handleToggleComplete = () => {
    const nextVal = !isCompleted;
    setIsCompleted(nextVal);
    persistChanges({ isCompleted: nextVal });
  };

  const handleEstimateChange = (newEst: string) => {
    setEstimate(newEst);
    persistChanges({ estimate: newEst });
  };

  // Checklist Actions
  const handleToggleChecklist = (itemId: string) => {
    const updatedChecklist = (task.checklist || []).map((item) =>
      item.id === itemId ? { ...item, completed: !item.completed } : item
    );
    onUpdateTask({ ...task, checklist: updatedChecklist });
  };

  const handleAddChecklist = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newChecklistText.trim()) return;

    const newItem: ChecklistItem = {
      id: `check-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      title: newChecklistText.trim(),
      completed: false,
    };

    onUpdateTask({
      ...task,
      checklist: [...(task.checklist || []), newItem],
    });
    setNewChecklistText('');
  };

  const handleAddChecklistFromPopover = (e: React.FormEvent) => {
    e.preventDefault();
    const titleToAdd = checklistTitleInput.trim() || 'Checklist';
    const newItem: ChecklistItem = {
      id: `check-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      title: titleToAdd,
      completed: false,
    };
    const updatedChecklist = [...(task.checklist || []), newItem];
    onUpdateTask({ ...task, checklist: updatedChecklist });
    setChecklistTitleInput('Checklist');
    setActivePopover(null);
    setTimeout(() => {
      checklistSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const handleDeleteChecklist = (itemId: string) => {
    const updatedChecklist = (task.checklist || []).filter((item) => item.id !== itemId);
    onUpdateTask({ ...task, checklist: updatedChecklist });
  };

  // Attachment Processing
  const processFiles = async (files: FileList | null, isWorkResult: boolean = false) => {
    if (!files || files.length === 0) return;

    const incomingList: Attachment[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const { type, extension } = getFileTypeFromExtension(file.name);

      if (type === 'image') {
        const hasCover = task.attachments.some((a) => a.isCover);
        try {
          const compressed = await compressImageFile(file, 1200, 0.82);
          incomingList.push({
            id: `att-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            name: file.name,
            size: compressed.size || formatFileSize(file.size),
            type: 'image',
            uploadedAt: 'Hari ini',
            url: compressed.dataUrl,
            extension,
            isWorkResult,
            isCover: !hasCover && incomingList.every((a) => !a.isCover),
          });
        } catch {
          await new Promise<void>((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => {
              incomingList.push({
                id: `att-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
                name: file.name,
                size: formatFileSize(file.size),
                type: 'image',
                uploadedAt: 'Hari ini',
                url: e.target?.result as string,
                extension,
                isWorkResult,
                isCover: !hasCover && incomingList.every((a) => !a.isCover),
              });
              resolve();
            };
            reader.onerror = () => resolve();
            reader.readAsDataURL(file);
          });
        }
      } else {
        await new Promise<void>((resolve) => {
          const reader = new FileReader();
          reader.onload = (e) => {
            incomingList.push({
              id: `att-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
              name: file.name,
              size: formatFileSize(file.size),
              type,
              uploadedAt: 'Hari ini',
              url: e.target?.result as string,
              extension,
              isWorkResult,
            });
            resolve();
          };
          reader.onerror = () => {
            incomingList.push({
              id: `att-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
              name: file.name,
              size: formatFileSize(file.size),
              type,
              uploadedAt: 'Hari ini',
              extension,
              isWorkResult,
            });
            resolve();
          };
          reader.readAsDataURL(file);
        });
      }
    }

    if (incomingList.length > 0) {
      const actor = users.find((u) => u.id === selectedAuthorId) || currentUser;
      const fileSummary = incomingList.map((a) => a.name).join(', ');
      const updated: Task = {
        ...task,
        attachments: [...task.attachments, ...incomingList],
        activities: [
          {
            id: `act-${Date.now()}`,
            authorId: actor.id,
            action: isWorkResult
              ? `mengunggah berkas hasil kerja: "${fileSummary}"`
              : `mengunggah ${incomingList.length} berkas lampiran baru`,
            timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
          },
          ...task.activities,
        ],
      };
      onUpdateTask(updated);
    }
  };

  const handleDeleteAttachment = (attId: string) => {
    const updated = {
      ...task,
      attachments: task.attachments.filter((a) => a.id !== attId),
    };
    onUpdateTask(updated);
  };

  // External Links
  const handleAddLink = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLinkTitle.trim() || !newLinkUrl.trim()) return;

    let finalUrl = newLinkUrl.trim();
    if (!/^https?:\/\//i.test(finalUrl)) {
      finalUrl = 'https://' + finalUrl;
    }

    const detected = detectCloudService(finalUrl);
    const resolvedType = newLinkType !== 'link' ? newLinkType : detected.type;

    const newLink: ExternalLink = {
      id: `link-${Date.now()}`,
      title: newLinkTitle.trim(),
      url: finalUrl,
      type: resolvedType,
      domain: detected.domain,
    };

    onUpdateTask({
      ...task,
      externalLinks: [...(task.externalLinks || []), newLink],
    });

    setNewLinkTitle('');
    setNewLinkUrl('');
    setIsAddingLink(false);
  };

  const handleDeleteLink = (linkId: string) => {
    onUpdateTask({
      ...task,
      externalLinks: (task.externalLinks || []).filter((l) => l.id !== linkId),
    });
  };

  // Discussion Comments
  const handleAddComment = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!commentText.trim()) return;

    const newComment: Comment = {
      id: `comm-${Date.now()}`,
      authorId: selectedAuthorId,
      content: commentText.trim(),
      createdAt: 'Baru saja',
    };

    onUpdateTask({
      ...task,
      comments: [...task.comments, newComment],
    });
    setCommentText('');
  };

  const handleCommentKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      handleAddComment();
    }
  };

  // Dynamic List / Status configuration details based on active project's columns
  const defaultListOptions: { id: ColumnId; label: string; dot: string; color: string }[] = [
    { id: 'todo', label: t('colTodoTitle'), dot: 'bg-neutral-400 dark:bg-neutral-500', color: 'text-neutral-700 dark:text-neutral-300' },
    { id: 'in_progress', label: t('colInProgressTitle'), dot: 'bg-red-500 shadow-xs shadow-red-500/50', color: 'text-red-600 dark:text-red-400' },
    { id: 'in_review', label: t('colInReviewTitle'), dot: 'bg-amber-500 shadow-xs shadow-amber-500/50', color: 'text-amber-600 dark:text-amber-400' },
    { id: 'done', label: t('colDoneTitle'), dot: 'bg-emerald-500 shadow-xs shadow-emerald-500/50', color: 'text-emerald-600 dark:text-emerald-400' },
  ];

  const listOptions = columns.length > 0
    ? columns.map((col) => ({
        id: col.id,
        label: col.title,
        dot: col.badgeColor || (col.id === 'done' ? 'bg-emerald-500' : 'bg-red-500'),
        color: 'text-neutral-800 dark:text-neutral-200',
      }))
    : defaultListOptions;

  const currentStatusConfig = listOptions.find((s) => s.id === columnId) || {
    id: columnId,
    label: columnId,
    dot: 'bg-neutral-400',
    color: 'text-neutral-700 dark:text-neutral-300',
  };

  // Checklist statistics
  const totalChecklist = (task.checklist || []).length;
  const completedChecklist = (task.checklist || []).filter((c) => c.completed).length;
  const checklistPercent = totalChecklist > 0 ? Math.round((completedChecklist / totalChecklist) * 100) : 0;

  // Filter attachments based on tab
  const workDeliverables = task.attachments.filter((a) => a.isWorkResult);
  const regularAttachments = task.attachments.filter((a) => !a.isWorkResult);
  const externalLinksList = task.externalLinks || [];

  const displayedAttachments =
    attachmentTab === 'work'
      ? workDeliverables
      : attachmentTab === 'docs'
      ? regularAttachments
      : task.attachments;

  const assignedUser = users.find((u) => u.id === assigneeId);

  return (
    <>
      {/* Lightbox for previewing full images */}
      {previewImage && (
        <div
          onClick={() => setPreviewImage(null)}
          className="fixed inset-0 z-60 bg-black/90 flex items-center justify-center p-4 cursor-pointer animate-in fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-4xl max-h-[90vh] rounded-2xl overflow-hidden bg-black shadow-2xl flex flex-col cursor-default"
          >
            <button
              onClick={() => setPreviewImage(null)}
              className="absolute top-3 right-3 p-2 rounded-full bg-black/60 text-white hover:bg-black/90 transition-colors z-20"
              title="Tutup (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
            <img
              src={previewImage}
              alt="Preview"
              className="w-full h-auto max-h-[85vh] object-contain"
            />
          </div>
        </div>
      )}

      {/* Main Task Detail Modal Backdrop */}
      <div
        onClick={handleClose}
        className={`fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/70 overflow-y-auto cursor-pointer ${
          isClosing ? 'animate-backdrop-out' : 'animate-in fade-in'
        }`}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          className={`w-full max-w-4xl max-h-[92vh] flex flex-col rounded-2xl bg-white dark:bg-[#12141a] border border-neutral-200/90 dark:border-[#262936] shadow-2xl text-neutral-900 dark:text-neutral-100 overflow-hidden cursor-default ${
            isClosing ? 'animate-modal-out' : 'animate-modal-in'
          }`}
        >
          {/* Subtle Color Accent Strip (if customized) */}
          {cardColor && (
            <div className="w-full h-2 shrink-0 transition-all duration-300" style={{ backgroundColor: cardColor }} />
          )}

          {/* Clean Executive Header */}
          <div className="h-14 px-5 sm:px-6 border-b border-neutral-200/80 dark:border-[#222532] flex items-center justify-between shrink-0 bg-white dark:bg-[#12141a]">
            {/* List Switcher Pill & Task Type */}
            <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
              <div className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-neutral-100/80 dark:bg-[#1a1d27] border border-neutral-200/60 dark:border-[#292d3b]">
                <span className="text-[11px] text-neutral-400 font-medium hidden sm:inline">
                  {language === 'id' ? 'dalam daftar' : 'in list'}
                </span>
                <span className={`w-2 h-2 rounded-full shrink-0 ${currentStatusConfig.dot}`} />
                <select
                  value={columnId}
                  onChange={(e) => handleStatusChange(e.target.value as ColumnId)}
                  aria-label="Pilih Daftar"
                  className={`text-xs font-semibold bg-transparent focus:outline-none cursor-pointer pr-1 ${currentStatusConfig.color}`}
                >
                  {listOptions.map((opt) => (
                    <option key={opt.id} value={opt.id} className="dark:bg-[#161822] text-neutral-900 dark:text-white">
                      {opt.label}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-3 h-3 text-neutral-400 pointer-events-none" />
              </div>

              {/* Task Type Badge */}
              <div className="hidden xs:flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-medium bg-neutral-100 dark:bg-[#1a1d27] text-neutral-600 dark:text-neutral-400 border border-neutral-200/50 dark:border-[#292d3b]">
                {taskType === 'feature' ? (
                  <Sparkles className="w-3 h-3 text-emerald-500" />
                ) : taskType === 'bug' ? (
                  <Bug className="w-3 h-3 text-rose-500" />
                ) : taskType === 'improvement' ? (
                  <Zap className="w-3 h-3 text-amber-500" />
                ) : taskType === 'design' ? (
                  <Palette className="w-3 h-3 text-purple-500" />
                ) : taskType === 'research' ? (
                  <Lightbulb className="w-3 h-3 text-cyan-500" />
                ) : (
                  <CheckSquare className="w-3 h-3 text-blue-500" />
                )}
                <span className="capitalize">{taskType}</span>
              </div>
            </div>

            {/* Right Action Icons: Mark Complete, Delete, Close */}
            <div className="flex items-center gap-1.5 sm:gap-2">
              <button
                type="button"
                onClick={handleToggleComplete}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  isCompleted
                    ? 'bg-emerald-600 text-white shadow-xs hover:bg-emerald-700'
                    : 'bg-neutral-100 dark:bg-[#1c1f2b] text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-[#252938]'
                }`}
              >
                <Check className={`w-3.5 h-3.5 ${isCompleted ? 'stroke-[3]' : 'opacity-60'}`} />
                <span className="hidden sm:inline">
                  {isCompleted
                    ? language === 'id' ? 'Selesai' : 'Completed'
                    : language === 'id' ? 'Tandai Selesai' : 'Mark Done'}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setIsDeleteTaskConfirmOpen(true)}
                title={t('deleteTask')}
                className="p-1.5 text-neutral-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={handleClose}
                title={`${t('closeBtn')} (Esc)`}
                className="p-1.5 text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-[#1e212d] rounded-lg transition-colors cursor-pointer ml-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* 2-Column Professional Workspace */}
          <div className="flex-1 flex flex-col md:flex-row overflow-y-auto md:overflow-hidden">
            {/* LEFT COLUMN: Main Task Body (Title, Description, Checklist, Attachments, Comments) */}
            <div className="flex-1 md:overflow-y-auto p-5 sm:p-7 space-y-6">
              {/* Task Title (Seamless Inline Edit) */}
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      onBlur={handleTitleBlur}
                      onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
                      placeholder="Judul Tugas..."
                      className="w-full text-lg sm:text-xl font-bold bg-transparent placeholder-neutral-400 focus:outline-none focus:ring-1 focus:ring-red-500/50 rounded-lg px-2 py-0.5 -ml-2 transition-all leading-snug text-neutral-950 dark:text-white"
                    />
                  </div>
                </div>

                {/* Trello-style Quick Action Toolstrip */}
                <div className="relative flex items-center gap-1.5 flex-wrap">
                  {/* + Add button */}
                  <button
                    type="button"
                    onClick={() => setActivePopover(activePopover === 'add' ? null : 'add')}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer border ${
                      activePopover === 'add'
                        ? 'bg-neutral-200 dark:bg-[#252837] text-neutral-900 dark:text-white border-neutral-400 dark:border-[#3a3f55]'
                        : 'bg-neutral-100 hover:bg-neutral-200 dark:bg-[#1a1d27] dark:hover:bg-[#252837] text-neutral-700 dark:text-neutral-300 border-neutral-200/60 dark:border-[#282c3c]'
                    }`}
                  >
                    <Plus className="w-3.5 h-3.5 text-neutral-500" />
                    <span>Add</span>
                  </button>

                  {/* Labels button */}
                  <button
                    type="button"
                    onClick={() => setActivePopover(activePopover === 'labels' ? null : 'labels')}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer border ${
                      activePopover === 'labels'
                        ? 'bg-neutral-200 dark:bg-[#252837] text-neutral-900 dark:text-white border-neutral-400 dark:border-[#3a3f55]'
                        : 'bg-neutral-100 hover:bg-neutral-200 dark:bg-[#1a1d27] dark:hover:bg-[#252837] text-neutral-700 dark:text-neutral-300 border-neutral-200/60 dark:border-[#282c3c]'
                    }`}
                  >
                    <Tag className="w-3.5 h-3.5 text-neutral-500" />
                    <span>Labels</span>
                  </button>

                  {/* Dates button */}
                  <button
                    type="button"
                    onClick={() => setActivePopover(activePopover === 'dates' ? null : 'dates')}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer border ${
                      activePopover === 'dates'
                        ? 'bg-neutral-200 dark:bg-[#252837] text-neutral-900 dark:text-white border-neutral-400 dark:border-[#3a3f55]'
                        : 'bg-neutral-100 hover:bg-neutral-200 dark:bg-[#1a1d27] dark:hover:bg-[#252837] text-neutral-700 dark:text-neutral-300 border-neutral-200/60 dark:border-[#282c3c]'
                    }`}
                  >
                    <Calendar className="w-3.5 h-3.5 text-neutral-500" />
                    <span>Dates</span>
                  </button>

                  {/* Checklist button */}
                  <button
                    type="button"
                    onClick={() => setActivePopover(activePopover === 'checklist' ? null : 'checklist')}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer border ${
                      activePopover === 'checklist'
                        ? 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30'
                        : 'bg-neutral-100 hover:bg-neutral-200 dark:bg-[#1a1d27] dark:hover:bg-[#252837] text-neutral-700 dark:text-neutral-300 border-neutral-200/60 dark:border-[#282c3c]'
                    }`}
                  >
                    <CheckSquare className="w-3.5 h-3.5 text-neutral-500" />
                    <span>Checklist</span>
                  </button>

                  {/* Members button */}
                  <button
                    type="button"
                    onClick={() => setActivePopover(activePopover === 'members' ? null : 'members')}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer border ${
                      activePopover === 'members'
                        ? 'bg-neutral-200 dark:bg-[#252837] text-neutral-900 dark:text-white border-neutral-400 dark:border-[#3a3f55]'
                        : 'bg-neutral-100 hover:bg-neutral-200 dark:bg-[#1a1d27] dark:hover:bg-[#252837] text-neutral-700 dark:text-neutral-300 border-neutral-200/60 dark:border-[#282c3c]'
                    }`}
                  >
                    <UserIcon className="w-3.5 h-3.5 text-neutral-500" />
                    <span>Members</span>
                  </button>

                  {/* Add Checklist Popover (Exact match to Screenshot 2) */}
                  {activePopover === 'checklist' && (
                    <div
                      onClick={(e) => e.stopPropagation()}
                      className="absolute top-9 left-28 z-40 w-72 p-3.5 rounded-2xl bg-white dark:bg-[#181a24] border border-neutral-200 dark:border-[#2b2f42] shadow-2xl text-xs space-y-3 animate-in fade-in zoom-in-95 duration-150"
                    >
                      <div className="flex items-center justify-between pb-1.5 border-b border-neutral-200/70 dark:border-[#26293a]">
                        <span className="font-bold text-neutral-900 dark:text-white">Add checklist</span>
                        <button
                          type="button"
                          onClick={() => setActivePopover(null)}
                          className="p-1 rounded-md text-neutral-400 hover:text-neutral-700 dark:hover:text-white cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <form onSubmit={handleAddChecklistFromPopover} className="space-y-2.5">
                        <div>
                          <label className="text-[11px] font-semibold text-neutral-500 dark:text-neutral-400 block mb-1">
                            Title
                          </label>
                          <input
                            type="text"
                            autoFocus
                            value={checklistTitleInput}
                            onChange={(e) => setChecklistTitleInput(e.target.value)}
                            placeholder="Checklist"
                            className="w-full px-2.5 py-1.5 rounded-xl bg-neutral-100 dark:bg-[#12141c] border border-neutral-200 dark:border-[#292d3f] text-neutral-900 dark:text-white font-medium focus:outline-none focus:border-blue-500"
                          />
                        </div>
                        <button
                          type="submit"
                          disabled={!checklistTitleInput.trim()}
                          className="w-full py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold text-xs transition-colors cursor-pointer shadow-xs"
                        >
                          Add
                        </button>
                      </form>
                    </div>
                  )}

                  {/* Members Popover */}
                  {activePopover === 'members' && (
                    <div
                      onClick={(e) => e.stopPropagation()}
                      className="absolute top-9 left-48 z-40 w-64 p-3 rounded-2xl bg-white dark:bg-[#181a24] border border-neutral-200 dark:border-[#2b2f42] shadow-2xl text-xs space-y-2 animate-in fade-in zoom-in-95 duration-150"
                    >
                      <div className="flex items-center justify-between pb-1.5 border-b border-neutral-200/70 dark:border-[#26293a]">
                        <span className="font-bold text-neutral-900 dark:text-white">Members</span>
                        <button
                          type="button"
                          onClick={() => setActivePopover(null)}
                          className="p-1 rounded-md text-neutral-400 hover:text-neutral-700 dark:hover:text-white cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div className="space-y-1 max-h-48 overflow-y-auto">
                        {users.map((u) => {
                          const isSelected = assigneeId === u.id;
                          return (
                            <button
                              key={u.id}
                              type="button"
                              onClick={() => {
                                handleAssigneeChange(isSelected ? '' : u.id);
                                setActivePopover(null);
                              }}
                              className="w-full p-1.5 px-2 rounded-xl flex items-center justify-between hover:bg-neutral-100 dark:hover:bg-[#202330] cursor-pointer transition-colors"
                            >
                              <div className="flex items-center gap-2">
                                <UserAvatar avatar={u.avatar} name={u.name} color={u.color} className="w-6 h-6 text-[10px]" />
                                <span className="font-medium text-neutral-800 dark:text-neutral-200 truncate">{u.name}</span>
                              </div>
                              {isSelected && <Check className="w-3.5 h-3.5 text-red-500 stroke-[3]" />}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Labels & Priority Popover */}
                  {activePopover === 'labels' && (
                    <div
                      onClick={(e) => e.stopPropagation()}
                      className="absolute top-9 left-16 z-40 w-72 p-3.5 rounded-2xl bg-white dark:bg-[#181a24] border border-neutral-200 dark:border-[#2b2f42] shadow-2xl text-xs space-y-3 animate-in fade-in zoom-in-95 duration-150"
                    >
                      <div className="flex items-center justify-between pb-1.5 border-b border-neutral-200/70 dark:border-[#26293a]">
                        <span className="font-bold text-neutral-900 dark:text-white">Labels & Priority</span>
                        <button
                          type="button"
                          onClick={() => setActivePopover(null)}
                          className="p-1 rounded-md text-neutral-400 hover:text-neutral-700 dark:hover:text-white cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div>
                        <label className="text-[11px] font-semibold text-neutral-400 block mb-1.5">
                          {language === 'id' ? 'Tipe Kartu' : 'Card Type'}
                        </label>
                        <select
                          value={taskType}
                          onChange={(e) => {
                            const newType = e.target.value as TaskType;
                            setTaskType(newType);
                            onUpdateTask({ ...task, taskType: newType });
                          }}
                          className="w-full px-2.5 py-1.5 rounded-lg bg-neutral-100 dark:bg-[#161822] border border-neutral-200/70 dark:border-[#272a38] text-neutral-900 dark:text-white text-xs font-medium focus:outline-none focus:border-red-500"
                        >
                          <option value="task">{language === 'id' ? '📋 Tugas Umum' : '📋 General Task'}</option>
                          <option value="concept">{language === 'id' ? '💡 Konsep / Ide' : '💡 Concept / Idea'}</option>
                          <option value="asset">{language === 'id' ? '🎨 Aset & Referensi' : '🎨 Asset & Media'}</option>
                          <option value="note">{language === 'id' ? '📝 Catatan' : '📝 Note'}</option>
                          <option value="feature">{language === 'id' ? '✨ Fitur Baru' : '✨ Feature'}</option>
                          <option value="bug">🐛 Bug</option>
                          <option value="design">{language === 'id' ? '🎨 Desain' : '🎨 Design'}</option>
                          <option value="improvement">{language === 'id' ? '⚡ Peningkatan' : '⚡ Improvement'}</option>
                          <option value="research">{language === 'id' ? '💡 Riset' : '💡 Research'}</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-[11px] font-semibold text-neutral-400 block mb-1.5">Priority</label>
                        <div className="grid grid-cols-3 gap-1.5">
                          {(['Tinggi', 'Sedang', 'Rendah'] as Priority[]).map((p) => (
                            <button
                              key={p}
                              type="button"
                              onClick={() => handlePriorityChange(p)}
                              className={`py-1 px-2 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                                priority === p
                                  ? p === 'Tinggi' ? 'bg-red-500 text-white border-red-500' : p === 'Sedang' ? 'bg-amber-500 text-white border-amber-500' : 'bg-neutral-600 text-white border-neutral-600'
                                  : 'bg-neutral-100 dark:bg-[#161822] text-neutral-700 dark:text-neutral-300 border-neutral-200/70 dark:border-[#272a38]'
                              }`}
                            >
                              {p}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <label className="text-[11px] font-semibold text-neutral-400 block mb-1.5">Card Color</label>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {[
                            { label: 'Polos', value: '', color: 'bg-neutral-200 dark:bg-neutral-700' },
                            { label: 'Red', value: '#ef4444', color: 'bg-red-500' },
                            { label: 'Emerald', value: '#10b981', color: 'bg-emerald-500' },
                            { label: 'Sky', value: '#0284c7', color: 'bg-sky-500' },
                            { label: 'Amber', value: '#d97706', color: 'bg-amber-500' },
                            { label: 'Purple', value: '#7c3aed', color: 'bg-purple-500' },
                          ].map((c) => (
                            <button
                              key={c.label}
                              type="button"
                              onClick={() => handleCardColorChange(c.value)}
                              className={`w-6 h-6 rounded-full ${c.color} transition-all flex items-center justify-center cursor-pointer ${
                                cardColor === c.value ? 'ring-2 ring-red-500 ring-offset-2 dark:ring-offset-[#181a24]' : 'opacity-80'
                              }`}
                            >
                              {cardColor === c.value && <Check className="w-3 h-3 text-white stroke-[3]" />}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Dates Popover */}
                  {activePopover === 'dates' && (
                    <div
                      onClick={(e) => e.stopPropagation()}
                      className="absolute top-9 left-20 z-40 w-72 p-3.5 rounded-2xl bg-white dark:bg-[#181a24] border border-neutral-200 dark:border-[#2b2f42] shadow-2xl text-xs space-y-3 animate-in fade-in zoom-in-95 duration-150"
                    >
                      <div className="flex items-center justify-between pb-1.5 border-b border-neutral-200/70 dark:border-[#26293a]">
                        <span className="font-bold text-neutral-900 dark:text-white">Dates & Estimate</span>
                        <button
                          type="button"
                          onClick={() => setActivePopover(null)}
                          className="p-1 rounded-md text-neutral-400 hover:text-neutral-700 dark:hover:text-white cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div className="space-y-2.5">
                        <div>
                          <label className="text-[11px] font-semibold text-neutral-400 block mb-1">Due Date</label>
                          <input
                            type="date"
                            value={dueDate}
                            onChange={(e) => handleDueDateChange(e.target.value)}
                            className="w-full px-2.5 py-1.5 rounded-xl bg-neutral-100 dark:bg-[#12141c] border border-neutral-200 dark:border-[#292d3f] text-neutral-900 dark:text-white font-medium focus:outline-none focus:border-blue-500 text-xs"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] font-semibold text-neutral-400 block mb-1">Estimate</label>
                          <input
                            type="text"
                            value={estimate}
                            onChange={(e) => handleEstimateChange(e.target.value)}
                            placeholder="e.g. 2 days, 4 hours"
                            className="w-full px-2.5 py-1.5 rounded-xl bg-neutral-100 dark:bg-[#12141c] border border-neutral-200 dark:border-[#292d3f] text-neutral-900 dark:text-white font-medium focus:outline-none focus:border-blue-500 text-xs"
                          />
                        </div>
                        {dueDate && (
                          <button
                            type="button"
                            onClick={() => {
                              handleDueDateChange('');
                              handleEstimateChange('');
                            }}
                            className="w-full py-1 text-center text-xs text-red-500 hover:text-red-600 cursor-pointer pt-1"
                          >
                            Hapus tanggal
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {/* + Add Quick Popover */}
                  {activePopover === 'add' && (
                    <div
                      onClick={(e) => e.stopPropagation()}
                      className="absolute top-9 left-2 z-40 w-48 p-2 rounded-2xl bg-white dark:bg-[#181a24] border border-neutral-200 dark:border-[#2b2f42] shadow-2xl text-xs space-y-1 animate-in fade-in zoom-in-95 duration-150"
                    >
                      <button
                        type="button"
                        onClick={() => setActivePopover('checklist')}
                        className="w-full px-2.5 py-1.5 rounded-lg flex items-center gap-2 hover:bg-neutral-100 dark:hover:bg-[#202330] text-neutral-700 dark:text-neutral-200 cursor-pointer"
                      >
                        <CheckSquare className="w-3.5 h-3.5 text-neutral-500" />
                        <span>Checklist</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setActivePopover('members')}
                        className="w-full px-2.5 py-1.5 rounded-lg flex items-center gap-2 hover:bg-neutral-100 dark:hover:bg-[#202330] text-neutral-700 dark:text-neutral-200 cursor-pointer"
                      >
                        <UserIcon className="w-3.5 h-3.5 text-neutral-500" />
                        <span>Members</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setActivePopover('labels')}
                        className="w-full px-2.5 py-1.5 rounded-lg flex items-center gap-2 hover:bg-neutral-100 dark:hover:bg-[#202330] text-neutral-700 dark:text-neutral-200 cursor-pointer"
                      >
                        <Tag className="w-3.5 h-3.5 text-neutral-500" />
                        <span>Labels</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setActivePopover('dates')}
                        className="w-full px-2.5 py-1.5 rounded-lg flex items-center gap-2 hover:bg-neutral-100 dark:hover:bg-[#202330] text-neutral-700 dark:text-neutral-200 cursor-pointer"
                      >
                        <Calendar className="w-3.5 h-3.5 text-neutral-500" />
                        <span>Dates</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setActivePopover(null);
                          fileInputRef.current?.click();
                        }}
                        className="w-full px-2.5 py-1.5 rounded-lg flex items-center gap-2 hover:bg-neutral-100 dark:hover:bg-[#202330] text-neutral-700 dark:text-neutral-200 cursor-pointer"
                      >
                        <Paperclip className="w-3.5 h-3.5 text-neutral-500" />
                        <span>Attachment</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* Active Metadata Chips (Members, Labels, Due Date) */}
                {(assignedUser || dueDate || priority || (taskType && taskType !== 'task')) && (
                  <div className="flex items-center gap-2 flex-wrap pt-1 text-xs">
                    {assignedUser && (
                      <div
                        onClick={() => setActivePopover('members')}
                        className="flex items-center gap-1.5 p-1 px-2.5 rounded-lg bg-neutral-100 hover:bg-neutral-200 dark:bg-[#1a1d27] dark:hover:bg-[#252837] border border-neutral-200/70 dark:border-[#282c3c] cursor-pointer"
                        title="Ubah member"
                      >
                        <span className="text-[10px] text-neutral-400 uppercase font-semibold">Member:</span>
                        <UserAvatar avatar={assignedUser.avatar} name={assignedUser.name} color={assignedUser.color} className="w-4 h-4 text-[9px]" />
                        <span className="font-medium text-neutral-800 dark:text-neutral-200">{assignedUser.name}</span>
                      </div>
                    )}
                    {dueDate && (
                      <div
                        onClick={() => setActivePopover('dates')}
                        className="flex items-center gap-1.5 p-1 px-2.5 rounded-lg bg-neutral-100 hover:bg-neutral-200 dark:bg-[#1a1d27] dark:hover:bg-[#252837] border border-neutral-200/70 dark:border-[#282c3c] cursor-pointer"
                        title="Ubah batas waktu"
                      >
                        <Calendar className="w-3.5 h-3.5 text-neutral-500" />
                        <span className="font-medium text-neutral-800 dark:text-neutral-200">{dueDate}</span>
                        {estimate && <span className="text-[10px] text-neutral-400 font-mono">({estimate})</span>}
                      </div>
                    )}
                    <div
                      onClick={() => setActivePopover('labels')}
                      className="flex items-center gap-1.5 p-1 px-2.5 rounded-lg bg-neutral-100 hover:bg-neutral-200 dark:bg-[#1a1d27] dark:hover:bg-[#252837] border border-neutral-200/70 dark:border-[#282c3c] cursor-pointer"
                      title="Ubah label"
                    >
                      <span
                        className={`w-2 h-2 rounded-full ${
                          priority === 'Tinggi' ? 'bg-red-500' : priority === 'Sedang' ? 'bg-amber-500' : 'bg-neutral-400'
                        }`}
                      />
                      <span className="font-semibold text-neutral-800 dark:text-neutral-200 capitalize">
                        {priority} {taskType && taskType !== 'task' ? `• ${taskType}` : ''}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Task Description (Trello style with ≡ icon) */}
              <div className="space-y-1.5 pt-2">
                <div className="flex items-center gap-2 text-xs font-bold text-neutral-900 dark:text-neutral-100">
                  <FileText className="w-4 h-4 text-neutral-400" />
                  <span>{language === 'id' ? 'Deskripsi' : 'Description'}</span>
                </div>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  onBlur={handleDescBlur}
                  rows={3}
                  placeholder={language === 'id' ? 'Tambahkan deskripsi atau catatan yang lebih rinci...' : 'Add a more detailed description...'}
                  className="w-full p-3 text-xs sm:text-sm rounded-xl bg-neutral-50/70 dark:bg-[#161822] border border-neutral-200/80 dark:border-[#272a37] text-neutral-800 dark:text-neutral-200 placeholder-neutral-400 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500/30 resize-none transition-all leading-relaxed"
                />
              </div>

              {/* Sub-tasks / Checklist Section */}
              <div ref={checklistSectionRef} className="space-y-3 pt-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-neutral-400" />
                    <span className="text-xs font-semibold text-neutral-900 dark:text-neutral-100">
                      {language === 'id' ? 'Daftar Sub-Tugas' : 'Sub-tasks / Checklist'}
                    </span>
                    {totalChecklist > 0 && (
                      <span className="text-[11px] font-mono font-medium px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-[#1a1d27] text-neutral-500 dark:text-neutral-400">
                        {completedChecklist}/{totalChecklist}
                      </span>
                    )}
                  </div>
                  {totalChecklist > 0 && (
                    <span className="text-[11px] font-mono text-neutral-400 font-semibold">
                      {checklistPercent}%
                    </span>
                  )}
                </div>

                {/* Checklist Progress Bar */}
                {totalChecklist > 0 && (
                  <div className="w-full h-1.5 bg-neutral-100 dark:bg-[#1e212d] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-red-600 dark:bg-red-500 rounded-full transition-all duration-300"
                      style={{ width: `${checklistPercent}%` }}
                    />
                  </div>
                )}

                {/* Checklist Items List */}
                <div className="space-y-1.5">
                  {(task.checklist || []).map((item) => (
                    <div
                      key={item.id}
                      className={`group flex items-center justify-between gap-2.5 p-2 px-2.5 rounded-xl border transition-colors text-xs ${
                        item.completed
                          ? 'border-emerald-500/30 bg-emerald-500/5 dark:bg-emerald-500/10'
                          : 'border-neutral-200/60 dark:border-[#222532] bg-white dark:bg-[#161822] hover:border-neutral-300 dark:hover:border-[#2e3242]'
                      }`}
                    >
                      <label className="flex items-center gap-2.5 min-w-0 flex-1 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={item.completed}
                          onChange={() => handleToggleChecklist(item.id)}
                          className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-neutral-300 dark:border-neutral-700 cursor-pointer"
                        />
                        <span
                          className={`truncate transition-all ${
                            item.completed
                              ? 'text-neutral-900 dark:text-neutral-100 font-medium'
                              : 'text-neutral-800 dark:text-neutral-200'
                          }`}
                        >
                          {item.title}
                        </span>
                        {item.completed && (
                          <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25 shrink-0 ml-1">
                            Selesai
                          </span>
                        )}
                      </label>
                      <button
                        type="button"
                        onClick={() => handleDeleteChecklist(item.id)}
                        className="opacity-0 group-hover:opacity-100 p-1 text-neutral-400 hover:text-red-500 transition-opacity rounded cursor-pointer"
                        title="Hapus sub-tugas"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}

                  {/* Add New Checklist Item Input */}
                  <form onSubmit={handleAddChecklist} className="flex items-center gap-2 pt-1">
                    <input
                      ref={checklistInputRef}
                      type="text"
                      value={newChecklistText}
                      onChange={(e) => setNewChecklistText(e.target.value)}
                      placeholder={language === 'id' ? '+ Tambah sub-tugas (Tekan Enter)...' : '+ Add a sub-task (Press Enter)...'}
                      className="flex-1 px-3 py-1.5 text-xs rounded-xl bg-neutral-50/70 dark:bg-[#161822] border border-neutral-200/80 dark:border-[#262936] text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:border-red-500"
                    />
                    <button
                      type="submit"
                      disabled={!newChecklistText.trim()}
                      className="px-3 py-1.5 rounded-xl bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 font-semibold text-xs disabled:opacity-30 cursor-pointer transition-all"
                    >
                      {t('saveChanges')}
                    </button>
                  </form>
                </div>
              </div>

              {/* Attachments & Work Deliverables Section (Clean Unified System) */}
              <div className="space-y-3 pt-3 border-t border-neutral-200/70 dark:border-[#222532]">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <div className="flex items-center gap-2">
                    <Paperclip className="w-4 h-4 text-neutral-400" />
                    <span className="text-xs font-semibold text-neutral-900 dark:text-neutral-100">
                      {language === 'id' ? 'Berkas & Hasil Kerja' : 'Files & Deliverables'}
                    </span>
                    {(task.attachments.length + externalLinksList.length) > 0 && (
                      <span className="text-[11px] font-mono font-medium px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-[#1a1d27] text-neutral-500 dark:text-neutral-400">
                        {task.attachments.length + externalLinksList.length}
                      </span>
                    )}
                  </div>

                  {/* Action Buttons: Upload File & Add Link */}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 text-xs font-semibold shadow-xs hover:opacity-90 transition-all cursor-pointer"
                    >
                      <UploadCloud className="w-3.5 h-3.5" />
                      <span>{language === 'id' ? 'Unggah Berkas' : 'Upload File'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setIsAddingLink(!isAddingLink)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-neutral-200 dark:border-[#2b2f3e] hover:bg-neutral-100 dark:hover:bg-[#1d202c] text-neutral-700 dark:text-neutral-300 text-xs font-medium transition-all cursor-pointer"
                    >
                      <Link2 className="w-3.5 h-3.5" />
                      <span>{isAddingLink ? (language === 'id' ? 'Batal' : 'Cancel') : (language === 'id' ? '+ Tautan' : '+ Link')}</span>
                    </button>
                  </div>
                </div>

                {/* Hidden File Inputs */}
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  onChange={(e) => processFiles(e.target.files, false)}
                  className="hidden"
                />
                <input
                  ref={resultFileInputRef}
                  type="file"
                  multiple
                  onChange={(e) => processFiles(e.target.files, true)}
                  className="hidden"
                />

                {/* Filter Tabs only if multiple distinct categories exist */}
                {((workDeliverables.length > 0 && regularAttachments.length > 0) || (task.attachments.length > 1 && externalLinksList.length > 0)) && (
                  <div className="flex items-center gap-1.5 text-[11px] pt-1">
                    <button
                      type="button"
                      onClick={() => setAttachmentTab('all')}
                      className={`px-2.5 py-1 rounded-lg font-medium transition-all cursor-pointer ${
                        attachmentTab === 'all'
                          ? 'bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 font-semibold'
                          : 'text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200'
                      }`}
                    >
                      {language === 'id' ? 'Semua' : 'All'} ({task.attachments.length + externalLinksList.length})
                    </button>
                    {workDeliverables.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setAttachmentTab('work')}
                        className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-medium transition-all cursor-pointer ${
                          attachmentTab === 'work'
                            ? 'bg-emerald-600 text-white font-semibold'
                            : 'text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/20'
                        }`}
                      >
                        <Sparkles className="w-3 h-3" />
                        <span>{language === 'id' ? 'Hasil Kerja' : 'Deliverables'} ({workDeliverables.length})</span>
                      </button>
                    )}
                    {regularAttachments.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setAttachmentTab('docs')}
                        className={`px-2.5 py-1 rounded-lg font-medium transition-all cursor-pointer ${
                          attachmentTab === 'docs'
                            ? 'bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 font-semibold'
                            : 'text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200'
                        }`}
                      >
                        {language === 'id' ? 'Dokumen & Lampiran' : 'Files'} ({regularAttachments.length})
                      </button>
                    )}
                  </div>
                )}

                {/* Form Add External Link (Figma, Drive, Website) */}
                {isAddingLink && (
                  <form
                    onSubmit={handleAddLink}
                    className="p-3.5 rounded-xl bg-neutral-50 dark:bg-[#161822] border border-neutral-200/90 dark:border-[#272a37] space-y-2.5 animate-in fade-in"
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                      <input
                        type="text"
                        value={newLinkTitle}
                        onChange={(e) => setNewLinkTitle(e.target.value)}
                        placeholder={language === 'id' ? 'Nama tautan (cth: Desain Figma Final)' : 'Link title (e.g. Figma Final)'}
                        className="sm:col-span-2 px-3 py-1.5 rounded-lg bg-white dark:bg-[#12141a] border border-neutral-200 dark:border-[#292d3b] text-neutral-900 dark:text-white focus:outline-none focus:border-red-500"
                      />
                      <select
                        value={newLinkType}
                        onChange={(e) => setNewLinkType(e.target.value as LinkType)}
                        className="px-2.5 py-1.5 rounded-lg bg-white dark:bg-[#12141a] border border-neutral-200 dark:border-[#292d3b] text-neutral-900 dark:text-white focus:outline-none focus:border-red-500 cursor-pointer text-xs"
                      >
                        <option value="link">Website / Link</option>
                        <option value="figma">Figma</option>
                        <option value="drive">Google Drive</option>
                        <option value="canva">Canva</option>
                        <option value="doc">Google Docs</option>
                        <option value="sheet">Google Sheets</option>
                      </select>
                    </div>

                    <input
                      type="text"
                      value={newLinkUrl}
                      onChange={(e) => setNewLinkUrl(e.target.value)}
                      placeholder="https://..."
                      className="w-full px-3 py-1.5 text-xs rounded-lg bg-white dark:bg-[#12141a] border border-neutral-200 dark:border-[#292d3b] text-neutral-900 dark:text-white focus:outline-none focus:border-red-500"
                    />

                    <div className="flex items-center justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setIsAddingLink(false)}
                        className="px-3 py-1 text-xs text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 cursor-pointer"
                      >
                        {t('cancel')}
                      </button>
                      <button
                        type="submit"
                        disabled={!newLinkTitle.trim() || !newLinkUrl.trim()}
                        className="px-3.5 py-1 text-xs font-semibold rounded-lg bg-red-600 hover:bg-red-700 text-white disabled:opacity-40 cursor-pointer transition-colors"
                      >
                        {language === 'id' ? 'Simpan Tautan' : 'Add Link'}
                      </button>
                    </div>
                  </form>
                )}

                {/* External Links List */}
                {externalLinksList.length > 0 && attachmentTab !== 'docs' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {externalLinksList.map((link) => (
                      <div
                        key={link.id}
                        className="group flex items-center justify-between gap-2 p-2.5 rounded-xl border border-blue-200/60 dark:border-blue-900/40 bg-blue-50/20 dark:bg-blue-950/10 hover:border-blue-400 transition-all text-xs"
                      >
                        <a
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 min-w-0 flex-1 hover:text-blue-600 dark:hover:text-blue-400"
                        >
                          <Globe className="w-4 h-4 text-blue-500 shrink-0" />
                          <div className="min-w-0">
                            <p className="font-semibold text-neutral-900 dark:text-white truncate">
                              {link.title}
                            </p>
                            <p className="text-[10px] text-neutral-400 truncate">
                              {link.domain || link.url}
                            </p>
                          </div>
                        </a>
                        <div className="flex items-center gap-1 shrink-0">
                          <a
                            href={link.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1 text-neutral-400 hover:text-blue-500 transition-colors"
                            title="Buka Tautan"
                          >
                            <ExternalLinkIcon className="w-3.5 h-3.5" />
                          </a>
                          <button
                            type="button"
                            onClick={() => setLinkToDelete(link)}
                            className="p-1 text-neutral-400 hover:text-red-500 transition-colors"
                            title="Hapus"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* File Attachments Grid */}
                {displayedAttachments.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {displayedAttachments.map((file) => {
                      const isImg = file.type === 'image' && file.url;
                      return (
                        <div
                          key={file.id}
                          className={`group relative rounded-xl border p-2.5 transition-all flex items-center justify-between gap-2.5 text-xs ${
                            file.isWorkResult
                              ? 'border-emerald-200/80 dark:border-emerald-900/60 bg-emerald-50/15 dark:bg-emerald-950/10'
                              : 'border-neutral-200/80 dark:border-[#222532] bg-white dark:bg-[#161822]'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0 flex-1">
                            {isImg ? (
                              <img
                                src={file.url}
                                alt={file.name}
                                onClick={() => setPreviewImage(file.url || null)}
                                className="w-10 h-10 rounded-lg object-cover border border-neutral-200/60 dark:border-[#292d3b] cursor-pointer hover:scale-105 transition-transform shrink-0"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-lg bg-neutral-100 dark:bg-[#1d202c] border border-neutral-200/60 dark:border-[#292d3b] flex items-center justify-center shrink-0">
                                {file.extension === 'pdf' ? (
                                  <FileText className="w-5 h-5 text-red-500" />
                                ) : ['xls', 'xlsx', 'csv'].includes(file.extension || '') ? (
                                  <FileSpreadsheet className="w-5 h-5 text-emerald-500" />
                                ) : (
                                  <Archive className="w-5 h-5 text-amber-500" />
                                )}
                              </div>
                            )}

                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5">
                                <p title={file.name} className="font-semibold text-neutral-900 dark:text-neutral-100 truncate">
                                  {file.name}
                                </p>
                                {file.isWorkResult && (
                                  <span className="px-1.5 py-0.2 rounded text-[9px] font-semibold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25 shrink-0 flex items-center gap-0.5">
                                    <Sparkles className="w-2.5 h-2.5" />
                                    <span>Hasil</span>
                                  </span>
                                )}
                              </div>
                              <p className="text-[10px] text-neutral-400 font-mono mt-0.5">
                                {file.size} • {file.uploadedAt}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            {file.url && (
                              <button
                                type="button"
                                onClick={() => triggerDownload(file.name, file.url)}
                                className="p-1 text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors"
                                title="Unduh berkas"
                              >
                                <Download className="w-3.5 h-3.5" />
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => setAttachmentToDelete(file)}
                              className="p-1 text-neutral-400 hover:text-red-500 transition-colors"
                              title="Hapus berkas"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  externalLinksList.length === 0 && (
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="p-4 rounded-xl border border-dashed border-neutral-200 dark:border-[#272b3a] bg-neutral-50/50 dark:bg-[#161822]/40 text-center cursor-pointer hover:border-red-500/50 transition-colors"
                    >
                      <UploadCloud className="w-5 h-5 mx-auto mb-1 text-neutral-400" />
                      <p className="text-xs text-neutral-500 dark:text-neutral-400">
                        {language === 'id' ? 'Belum ada berkas lampiran. Klik untuk mengunggah.' : 'No attachments yet. Click to upload.'}
                      </p>
                    </div>
                  )
                )}
              </div>
            </div>

            {/* RIGHT COLUMN: Comments and activity (Matching Screenshot 2) */}
            <div className="w-full md:w-[380px] md:border-l border-t md:border-t-0 border-neutral-200/80 dark:border-[#222532] bg-neutral-50/40 dark:bg-[#0f1015] p-5 space-y-4 shrink-0 md:overflow-y-auto text-xs flex flex-col justify-between">
              <div className="space-y-4">
                {/* Header: Comments and activity + Show details button */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-neutral-400" />
                    <span className="text-xs sm:text-sm font-bold text-neutral-900 dark:text-neutral-100">
                      {language === 'id' ? 'Komentar dan aktivitas' : 'Comments and activity'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowDetails(!showDetails)}
                    className="text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-neutral-200/70 hover:bg-neutral-200 dark:bg-[#1a1d27] dark:hover:bg-[#252837] text-neutral-700 dark:text-neutral-300 transition-colors cursor-pointer"
                  >
                    {showDetails ? (language === 'id' ? 'Sembunyikan detail' : 'Hide details') : (language === 'id' ? 'Tampilkan detail' : 'Show details')}
                  </button>
                </div>

                {/* Comment Input Box (Screenshot 2: Write a comment...) */}
                <form
                  onSubmit={handleAddComment}
                  className="rounded-xl border border-neutral-200/80 dark:border-[#262936] bg-white dark:bg-[#161822] shadow-xs overflow-hidden transition-all focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500/20"
                >
                  <textarea
                    value={commentText}
                    onFocus={() => setIsCommentFocused(true)}
                    onChange={(e) => setCommentText(e.target.value)}
                    onKeyDown={handleCommentKeyDown}
                    rows={isCommentFocused || commentText ? 3 : 1}
                    placeholder={language === 'id' ? 'Tulis komentar...' : 'Write a comment...'}
                    className="w-full p-3 text-xs sm:text-sm bg-transparent text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none resize-none leading-relaxed"
                  />

                  {(isCommentFocused || commentText.trim()) && (
                    <div className="flex items-center justify-between p-2 px-3 bg-neutral-50 dark:bg-[#12141a] border-t border-neutral-100 dark:border-[#222532] text-xs animate-in fade-in">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-neutral-400">Sebagai:</span>
                        <select
                          value={selectedAuthorId}
                          onChange={(e) => setSelectedAuthorId(e.target.value)}
                          className="bg-transparent font-medium text-neutral-800 dark:text-neutral-200 focus:outline-none cursor-pointer text-xs"
                        >
                          {users.map((u) => (
                            <option key={u.id} value={u.id} className="dark:bg-[#161822]">
                              {u.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setCommentText('');
                            setIsCommentFocused(false);
                          }}
                          className="px-2.5 py-1 text-xs text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 cursor-pointer"
                        >
                          Batal
                        </button>
                        <button
                          type="submit"
                          disabled={!commentText.trim()}
                          className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold disabled:opacity-40 transition-colors cursor-pointer shadow-xs"
                        >
                          <Send className="w-3 h-3" />
                          <span>Simpan</span>
                        </button>
                      </div>
                    </div>
                  )}
                </form>

                {/* Unified Activity & Comment Stream (Screenshot 2) */}
                <div className="space-y-3 pt-1">
                  {/* System activities (e.g. "Muhammad Adli Abdurrahim added this card to To Do - just now") */}
                  {showDetails && task.activities.length > 0 && (
                    <div className="space-y-2.5">
                      {task.activities.map((act) => {
                        const actUser = users.find((u) => u.id === act.authorId);
                        return (
                          <div key={act.id} className="flex items-start gap-2.5 text-xs text-neutral-600 dark:text-neutral-400">
                            <UserAvatar
                              avatar={actUser?.avatar}
                              name={actUser?.name || 'User'}
                              color={actUser?.color}
                              className="w-7 h-7 text-[10px] shrink-0 mt-0.5"
                            />
                            <div className="min-w-0 flex-1 leading-snug">
                              <p className="text-neutral-800 dark:text-neutral-200">
                                <span className="font-semibold text-neutral-900 dark:text-white">{actUser?.name || 'User'}</span>{' '}
                                <span>{act.action}</span>
                              </p>
                              <span className="text-[10px] text-blue-500 font-medium cursor-pointer hover:underline">
                                {act.timestamp || 'just now'}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Comments list */}
                  {task.comments.length > 0 ? (
                    <div className="space-y-3 pt-1">
                      {task.comments.map((comm) => {
                        const author = users.find((u) => u.id === comm.authorId);
                        return (
                          <div
                            key={comm.id}
                            className="flex items-start gap-2.5 p-3 rounded-xl border border-neutral-200/60 dark:border-[#222532] bg-white dark:bg-[#161822] text-xs"
                          >
                            <UserAvatar
                              avatar={author?.avatar}
                              name={author?.name || 'User'}
                              color={author?.color}
                              className="w-7 h-7 text-[10px] shrink-0 mt-0.5"
                            />
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between gap-2 mb-1">
                                <span className="font-semibold text-neutral-900 dark:text-white">
                                  {author?.name || 'Anggota Tim'}
                                </span>
                                <span className="text-[10px] text-neutral-400 font-mono">
                                  {comm.createdAt}
                                </span>
                              </div>
                              <p className="text-neutral-700 dark:text-neutral-300 whitespace-pre-wrap leading-relaxed">
                                {comm.content}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    task.activities.length === 0 && (
                      <p className="text-xs text-neutral-400 italic text-center py-4">
                        {language === 'id' ? 'Belum ada komentar atau aktivitas.' : 'No comments or activity yet.'}
                      </p>
                    )
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Card Confirmation Modal */}
      <ConfirmModal
        isOpen={isDeleteTaskConfirmOpen}
        onClose={() => setIsDeleteTaskConfirmOpen(false)}
        onConfirm={() => {
          onDeleteTask(task.id);
          handleClose();
        }}
        title={language === 'id' ? 'Hapus Kartu Ini?' : 'Delete This Card?'}
        message={
          language === 'id'
            ? 'Kartu ini beserta seluruh lampiran berkas, tautan referensi, checklist, dan diskusinya akan dihapus secara permanen.'
            : 'This card along with all file attachments, links, checklists, and comments will be permanently deleted.'
        }
        itemName={`Kartu: ${task.title}`}
        confirmText={language === 'id' ? 'Hapus Kartu' : 'Delete Card'}
      />

      {/* Delete Attachment Confirmation Modal */}
      <ConfirmModal
        isOpen={Boolean(attachmentToDelete)}
        onClose={() => setAttachmentToDelete(null)}
        onConfirm={() => {
          if (attachmentToDelete) {
            handleDeleteAttachment(attachmentToDelete.id);
          }
        }}
        title={language === 'id' ? 'Hapus Berkas Lampiran?' : 'Delete Attachment?'}
        message={
          language === 'id'
            ? 'Berkas ini akan dihapus dari kartu secara permanen.'
            : 'This file attachment will be permanently removed from the card.'
        }
        itemName={attachmentToDelete ? `Berkas: ${attachmentToDelete.name}` : undefined}
        confirmText={language === 'id' ? 'Hapus Berkas' : 'Delete File'}
      />

      {/* Delete External Link Confirmation Modal */}
      <ConfirmModal
        isOpen={Boolean(linkToDelete)}
        onClose={() => setLinkToDelete(null)}
        onConfirm={() => {
          if (linkToDelete) {
            handleDeleteLink(linkToDelete.id);
          }
        }}
        title={language === 'id' ? 'Hapus Tautan Referensi?' : 'Delete Reference Link?'}
        message={
          language === 'id'
            ? 'Tautan ini akan dihapus dari kartu.'
            : 'This reference link will be removed from the card.'
        }
        itemName={linkToDelete ? `Tautan: ${linkToDelete.title}` : undefined}
        confirmText={language === 'id' ? 'Hapus Tautan' : 'Delete Link'}
      />

      {/* Lightbox Preview for Image Attachments */}
      {previewImage && (
        <div
          className="fixed inset-0 z-60 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setPreviewImage(null)}
        >
          <div
            className="relative max-w-4xl max-h-[90vh] flex flex-col items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="absolute -top-12 right-0 flex items-center gap-2 z-10">
              <button
                type="button"
                onClick={() => triggerDownload('lampiran-gambar.png', previewImage)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/20 hover:bg-white/30 text-white backdrop-blur-md text-xs font-medium transition-colors cursor-pointer"
                title="Unduh Gambar"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Unduh</span>
              </button>
              <button
                type="button"
                onClick={() => setPreviewImage(null)}
                className="p-1.5 rounded-full bg-white/20 hover:bg-white/30 text-white backdrop-blur-md transition-colors cursor-pointer"
                title="Tutup"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <img
              src={previewImage}
              alt="Lampiran Gambar"
              className="max-w-full max-h-[85vh] rounded-xl object-contain shadow-2xl border border-white/10"
            />
          </div>
        </div>
      )}
    </>
  );
};
