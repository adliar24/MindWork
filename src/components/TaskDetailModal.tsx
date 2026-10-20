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
  fileToAttachment,
  createExternalLink,
  getItemAttachments,
  getItemLinks,
} from '../utils/fileHelpers';
import { UserAvatar } from './UserAvatar';
import { useLanguage } from '../context/LanguageContext';
import { ConfirmModal } from './ConfirmModal';
import { SplitPillBadge } from './SplitPillBadge';

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

  // Checklist Item attachment & link state
  const [activeLinkInputItemId, setActiveLinkInputItemId] = useState<string | null>(null);
  const [tempChecklistLinkUrl, setTempChecklistLinkUrl] = useState('');
  const [tempChecklistLinkTitle, setTempChecklistLinkTitle] = useState('');
  const [targetChecklistItemIdForFile, setTargetChecklistItemIdForFile] = useState<string | null>(null);
  const checklistFileInputRef = useRef<HTMLInputElement | null>(null);

  // Pending attachment/link for new checklist item input
  const [pendingNewItemFile, setPendingNewItemFile] = useState<Attachment | null>(null);
  const [pendingNewItemLink, setPendingNewItemLink] = useState<ExternalLink | null>(null);
  const [isAddingNewItemLink, setIsAddingNewItemLink] = useState(false);
  const [newSubtaskLinkUrl, setNewSubtaskLinkUrl] = useState('');
  const [newSubtaskLinkTitle, setNewSubtaskLinkTitle] = useState('');
  const newChecklistFileInputRef = useRef<HTMLInputElement | null>(null);

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

  // Handle closing immediately without artificial lag
  const handleClose = () => {
    onClose();
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
      attachment: pendingNewItemFile || undefined,
      attachments: pendingNewItemFile ? [pendingNewItemFile] : [],
      externalLink: pendingNewItemLink || undefined,
      externalLinks: pendingNewItemLink ? [pendingNewItemLink] : [],
    };

    onUpdateTask({
      ...task,
      checklist: [...(task.checklist || []), newItem],
    });
    setNewChecklistText('');
    setPendingNewItemFile(null);
    setPendingNewItemLink(null);
    setIsAddingNewItemLink(false);
    setNewSubtaskLinkUrl('');
    setNewSubtaskLinkTitle('');
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

  // Handle attaching file directly to an existing checklist item
  const handleAttachFileToChecklist = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !targetChecklistItemIdForFile) return;
    try {
      const att = await fileToAttachment(file);
      const updatedChecklist = (task.checklist || []).map((item) => {
        if (item.id === targetChecklistItemIdForFile) {
          const currentAtts = getItemAttachments(item);
          return {
            ...item,
            attachment: att,
            attachments: [...currentAtts, att],
          };
        }
        return item;
      });
      onUpdateTask({ ...task, checklist: updatedChecklist });
    } finally {
      setTargetChecklistItemIdForFile(null);
      if (checklistFileInputRef.current) checklistFileInputRef.current.value = '';
    }
  };

  // Handle attaching link to an existing checklist item
  const handleSaveLinkToChecklistItem = (itemId: string) => {
    if (!tempChecklistLinkUrl.trim()) return;
    const link = createExternalLink(tempChecklistLinkUrl, tempChecklistLinkTitle);
    const updatedChecklist = (task.checklist || []).map((item) => {
      if (item.id === itemId) {
        const currentLinks = getItemLinks(item);
        return {
          ...item,
          externalLink: link,
          externalLinks: [...currentLinks, link],
        };
      }
      return item;
    });
    onUpdateTask({ ...task, checklist: updatedChecklist });
    setActiveLinkInputItemId(null);
    setTempChecklistLinkUrl('');
    setTempChecklistLinkTitle('');
  };

  // Handle removing attachment from a checklist item
  const handleRemoveChecklistAttachment = (itemId: string, attachmentId: string) => {
    const updatedChecklist = (task.checklist || []).map((item) => {
      if (item.id === itemId) {
        const currentAtts = getItemAttachments(item);
        const remaining = currentAtts.filter((a) => a.id !== attachmentId);
        return {
          ...item,
          attachment: remaining.length > 0 ? remaining[0] : undefined,
          attachments: remaining,
        };
      }
      return item;
    });
    onUpdateTask({ ...task, checklist: updatedChecklist });
  };

  // Handle removing link from a checklist item
  const handleRemoveChecklistLink = (itemId: string, linkId: string) => {
    const updatedChecklist = (task.checklist || []).map((item) => {
      if (item.id === itemId) {
        const currentLinks = getItemLinks(item);
        const remaining = currentLinks.filter((l) => l.id !== linkId);
        return {
          ...item,
          externalLink: remaining.length > 0 ? remaining[0] : undefined,
          externalLinks: remaining,
        };
      }
      return item;
    });
    onUpdateTask({ ...task, checklist: updatedChecklist });
  };

  // Handle attaching file for new checklist item composer
  const handleAttachFileForNewItem = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const att = await fileToAttachment(file);
      setPendingNewItemFile(att);
    } finally {
      if (newChecklistFileInputRef.current) newChecklistFileInputRef.current.value = '';
    }
  };

  const handleSaveLinkForNewItem = () => {
    if (!newSubtaskLinkUrl.trim()) return;
    const link = createExternalLink(newSubtaskLinkUrl, newSubtaskLinkTitle);
    setPendingNewItemLink(link);
    setIsAddingNewItemLink(false);
    setNewSubtaskLinkUrl('');
    setNewSubtaskLinkTitle('');
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
    ? columns.map((col) => {
        const hex = col.color || (col.badgeColor?.startsWith('#') ? col.badgeColor : undefined);
        return {
          id: col.id,
          label: col.title,
          dotColor: hex,
          dot: !hex ? (col.badgeColor || (col.id === 'done' ? 'bg-emerald-500' : 'bg-red-500')) : '',
          color: 'text-neutral-800 dark:text-neutral-200',
        };
      })
    : defaultListOptions.map((opt) => ({ ...opt, dotColor: undefined }));

  const currentStatusConfig = listOptions.find((s) => s.id === columnId) || {
    id: columnId,
    label: columnId,
    dotColor: undefined,
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


      {/* Main Task Detail Modal Backdrop */}
      <div
        onClick={handleClose}
        className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/70 overflow-y-auto cursor-pointer animate-in fade-in"
      >
        <div
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-4xl max-h-[92vh] flex flex-col rounded-[36px] bg-white dark:bg-[#12141a] border border-neutral-200/90 dark:border-[#262936] shadow-2xl text-neutral-900 dark:text-neutral-100 overflow-hidden cursor-default animate-modal-in"
        >
          {/* Subtle Color Accent Strip (if customized) */}
          {cardColor && (
            <div className="w-full h-2 shrink-0 transition-all duration-300" style={{ backgroundColor: cardColor }} />
          )}

          {/* Clean Executive Header */}
          <div className="h-14 px-5 sm:px-6 border-b border-neutral-200/80 dark:border-[#222532] flex items-center justify-between shrink-0 bg-white dark:bg-[#12141a]">
            {/* List Switcher Pill & Task Type */}
            <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
              <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-neutral-100/80 dark:bg-[#1a1d27] border border-neutral-200/60 dark:border-[#292d3b]">
                <span className="text-[11px] text-neutral-400 font-medium hidden sm:inline">
                  {language === 'id' ? 'dalam daftar' : 'in list'}
                </span>
                <span
                  className={`w-2 h-2 rounded-full shrink-0 ${currentStatusConfig.dot || ''}`}
                  style={currentStatusConfig.dotColor ? { backgroundColor: currentStatusConfig.dotColor } : undefined}
                />
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
              <div className="hidden xs:flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-neutral-100 dark:bg-[#1a1d27] text-neutral-600 dark:text-neutral-400 border border-neutral-200/50 dark:border-[#292d3b]">
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
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
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
                className="p-1.5 text-neutral-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-full transition-colors cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={handleClose}
                title={`${t('closeBtn')} (Esc)`}
                className="p-1.5 text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-[#1e212d] rounded-full transition-colors cursor-pointer ml-1"
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
                      className="w-full text-xl sm:text-2xl font-extrabold bg-transparent placeholder-neutral-400 focus:outline-none focus:ring-1 focus:ring-red-500/50 rounded-xl px-2 py-0.5 -ml-2 transition-all leading-snug text-neutral-950 dark:text-white"
                    />
                  </div>
                </div>

                {/* Trello-style Quick Action Toolstrip */}
                <div className="relative flex items-center gap-1.5 flex-wrap">
                  {/* + Add button */}
                  <button
                    type="button"
                    onClick={() => setActivePopover(activePopover === 'add' ? null : 'add')}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-colors cursor-pointer border ${
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
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-colors cursor-pointer border ${
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
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-colors cursor-pointer border ${
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
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-colors cursor-pointer border ${
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
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-colors cursor-pointer border ${
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
                <div className="flex items-center gap-2 text-sm sm:text-base font-bold text-neutral-950 dark:text-white">
                  <FileText className="w-4 h-4 text-neutral-600 dark:text-neutral-400" />
                  <span>{language === 'id' ? 'Deskripsi' : 'Description'}</span>
                </div>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  onBlur={handleDescBlur}
                  rows={3}
                  placeholder={language === 'id' ? 'Tambahkan deskripsi atau catatan yang lebih rinci...' : 'Add a more detailed description...'}
                  className="w-full p-3 text-xs sm:text-sm rounded-xl bg-neutral-50/70 dark:bg-[#161822] border border-neutral-300 dark:border-[#272a37] text-neutral-950 dark:text-neutral-100 font-medium placeholder-neutral-400 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500/30 resize-none transition-all leading-relaxed"
                />
              </div>

              {/* Sub-tasks / Checklist Section */}
              <div ref={checklistSectionRef} className="space-y-3 pt-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-neutral-600 dark:text-neutral-400" />
                    <span className="text-sm sm:text-base font-bold text-neutral-950 dark:text-white">
                      {language === 'id' ? 'Daftar Sub-Tugas' : 'Sub-tasks / Checklist'}
                    </span>
                    {totalChecklist > 0 && (
                      <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-full bg-neutral-200 dark:bg-[#1a1d27] text-neutral-700 dark:text-neutral-200">
                        {completedChecklist}/{totalChecklist}
                      </span>
                    )}
                  </div>
                  {totalChecklist > 0 && (
                    <span className="text-xs font-mono text-neutral-700 dark:text-neutral-300 font-bold">
                      {checklistPercent}%
                    </span>
                  )}
                </div>

                {/* Checklist Progress Bar */}
                {totalChecklist > 0 && (
                  <div className="w-full h-2 bg-neutral-200 dark:bg-[#1e212d] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-red-600 dark:bg-red-500 rounded-full transition-all duration-300"
                      style={{ width: `${checklistPercent}%` }}
                    />
                  </div>
                )}

                {/* Hidden File Inputs for Subtasks */}
                <input
                  type="file"
                  ref={checklistFileInputRef}
                  onChange={handleAttachFileToChecklist}
                  className="hidden"
                />
                <input
                  type="file"
                  ref={newChecklistFileInputRef}
                  onChange={handleAttachFileForNewItem}
                  className="hidden"
                />

                {/* Checklist Items List */}
                <div className="space-y-2">
                  {(task.checklist || []).map((item) => {
                    const itemAtts = getItemAttachments(item);
                    const itemLinks = getItemLinks(item);
                    const hasMedia = itemAtts.length > 0 || itemLinks.length > 0;
                    const isLinkInputOpen = activeLinkInputItemId === item.id;

                    return (
                      <div
                        key={item.id}
                        className={`group p-2.5 px-3 rounded-2xl border transition-all text-xs sm:text-sm ${
                          item.completed
                            ? 'border-emerald-500/30 bg-emerald-500/5 dark:bg-emerald-500/10'
                            : 'border-neutral-200 dark:border-[#222532] bg-white dark:bg-[#161822] hover:border-neutral-300 dark:hover:border-[#2e3242]'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2.5">
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
                                  ? 'text-neutral-400 dark:text-neutral-500 line-through font-medium'
                                  : 'text-neutral-900 dark:text-neutral-100 font-semibold'
                              }`}
                            >
                              {item.title}
                            </span>
                            {item.completed && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25 shrink-0 ml-1">
                                {language === 'id' ? 'Selesai' : 'Completed'}
                              </span>
                            )}
                          </label>

                          {/* Action Buttons for this Subtask: Attach File, Attach Link, Delete */}
                          <div className="flex items-center gap-1 opacity-70 group-hover:opacity-100 transition-opacity">
                            {/* Attach File Button */}
                            <button
                              type="button"
                              onClick={() => {
                                setTargetChecklistItemIdForFile(item.id);
                                checklistFileInputRef.current?.click();
                              }}
                              className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-[#202330] transition-colors cursor-pointer"
                              title={language === 'id' ? 'Sematkan berkas / dokumen / zip' : 'Attach file'}
                            >
                              <Paperclip className="w-3.5 h-3.5" />
                            </button>

                            {/* Attach Link Button */}
                            <button
                              type="button"
                              onClick={() => {
                                if (isLinkInputOpen) {
                                  setActiveLinkInputItemId(null);
                                } else {
                                  setActiveLinkInputItemId(item.id);
                                  setTempChecklistLinkUrl('');
                                  setTempChecklistLinkTitle('');
                                }
                              }}
                              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                                isLinkInputOpen
                                  ? 'text-blue-600 bg-blue-100/80 dark:bg-blue-900/40'
                                  : 'text-neutral-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950/40'
                              }`}
                              title={language === 'id' ? 'Sematkan tautan web' : 'Attach link'}
                            >
                              <Link2 className="w-3.5 h-3.5" />
                            </button>

                            {/* Delete Checklist Item */}
                            <button
                              type="button"
                              onClick={() => handleDeleteChecklist(item.id)}
                              className="p-1.5 rounded-lg text-neutral-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors cursor-pointer"
                              title={language === 'id' ? 'Hapus sub-tugas' : 'Delete subtask'}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Inline Link Input Popover if opened */}
                        {isLinkInputOpen && (
                          <div className="mt-2.5 p-2.5 rounded-xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/60 space-y-2 animate-in fade-in">
                            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                              <input
                                type="url"
                                value={tempChecklistLinkUrl}
                                onChange={(e) => setTempChecklistLinkUrl(e.target.value)}
                                placeholder="https://drive.google.com/... atau https://figma.com/..."
                                className="flex-1 px-2.5 py-1 text-xs rounded-lg bg-white dark:bg-[#12141c] border border-blue-200 dark:border-blue-800 text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:border-blue-500"
                                autoFocus
                              />
                              <input
                                type="text"
                                value={tempChecklistLinkTitle}
                                onChange={(e) => setTempChecklistLinkTitle(e.target.value)}
                                placeholder={language === 'id' ? 'Nama tautan (opsional)' : 'Link title (optional)'}
                                className="w-full sm:w-44 px-2.5 py-1 text-xs rounded-lg bg-white dark:bg-[#12141c] border border-blue-200 dark:border-blue-800 text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:border-blue-500"
                              />
                            </div>
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => setActiveLinkInputItemId(null)}
                                className="px-2.5 py-1 text-xs text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 cursor-pointer"
                              >
                                {language === 'id' ? 'Batal' : 'Cancel'}
                              </button>
                              <button
                                type="button"
                                onClick={() => handleSaveLinkToChecklistItem(item.id)}
                                disabled={!tempChecklistLinkUrl.trim()}
                                className="px-3 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold disabled:opacity-40 cursor-pointer transition-colors"
                              >
                                {language === 'id' ? 'Sematkan' : 'Attach'}
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Split-Pill Badges for attached files & links */}
                        {hasMedia && (
                          <div className="flex flex-wrap gap-1.5 pt-2 border-t border-neutral-100 dark:border-[#212433] mt-2">
                            {itemLinks.map((link) => (
                              <SplitPillBadge
                                key={link.id}
                                link={link}
                                size="xs"
                                onRemove={() => handleRemoveChecklistLink(item.id, link.id)}
                              />
                            ))}
                            {itemAtts.map((att) => (
                              <SplitPillBadge
                                key={att.id}
                                attachment={att}
                                size="xs"
                                onRemove={() => handleRemoveChecklistAttachment(item.id, att.id)}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {/* Add New Checklist Item Input Form */}
                  <form onSubmit={handleAddChecklist} className="space-y-2 pt-1">
                    <div className="flex items-center gap-1.5 p-1 px-1.5 rounded-2xl bg-neutral-50 dark:bg-[#161822] border border-neutral-200 dark:border-[#262936] focus-within:border-red-500 transition-colors">
                      <input
                        ref={checklistInputRef}
                        type="text"
                        value={newChecklistText}
                        onChange={(e) => setNewChecklistText(e.target.value)}
                        placeholder={
                          language === 'id'
                            ? '+ Tambah sub-tugas (Tekan Enter)...'
                            : '+ Add a sub-task (Press Enter)...'
                        }
                        className="flex-1 px-2.5 py-1 text-xs bg-transparent text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none"
                      />

                      {/* Quick Attach File to pending item */}
                      <button
                        type="button"
                        onClick={() => newChecklistFileInputRef.current?.click()}
                        className="p-1.5 rounded-lg text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-100 hover:bg-neutral-200/60 dark:hover:bg-[#202330] transition-colors cursor-pointer"
                        title={language === 'id' ? 'Sematkan berkas ke sub-tugas ini' : 'Attach file to this subtask'}
                      >
                        <Paperclip className="w-3.5 h-3.5" />
                      </button>

                      {/* Quick Attach Link to pending item */}
                      <button
                        type="button"
                        onClick={() => setIsAddingNewItemLink(!isAddingNewItemLink)}
                        className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                          isAddingNewItemLink || pendingNewItemLink
                            ? 'text-blue-600 bg-blue-100/80 dark:bg-blue-900/40'
                            : 'text-neutral-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40'
                        }`}
                        title={language === 'id' ? 'Sematkan tautan web' : 'Attach link'}
                      >
                        <Link2 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="submit"
                        disabled={!newChecklistText.trim()}
                        className="px-3 py-1 rounded-xl bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 font-bold text-xs disabled:opacity-30 cursor-pointer transition-all shrink-0"
                      >
                        {language === 'id' ? 'Tambah' : 'Add'}
                      </button>
                    </div>

                    {/* Pending Attachments Preview for new item */}
                    {(pendingNewItemFile || pendingNewItemLink) && (
                      <div className="flex flex-wrap gap-1.5 px-1 animate-in fade-in">
                        {pendingNewItemLink && (
                          <SplitPillBadge
                            link={pendingNewItemLink}
                            size="xs"
                            onRemove={() => setPendingNewItemLink(null)}
                          />
                        )}
                        {pendingNewItemFile && (
                          <SplitPillBadge
                            attachment={pendingNewItemFile}
                            size="xs"
                            onRemove={() => setPendingNewItemFile(null)}
                          />
                        )}
                      </div>
                    )}

                    {/* Pending Link Input Dialog for new item */}
                    {isAddingNewItemLink && (
                      <div className="p-2.5 rounded-xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/60 space-y-2 animate-in fade-in">
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                          <input
                            type="url"
                            value={newSubtaskLinkUrl}
                            onChange={(e) => setNewSubtaskLinkUrl(e.target.value)}
                            placeholder="https://drive.google.com/... atau https://figma.com/..."
                            className="flex-1 px-2.5 py-1 text-xs rounded-lg bg-white dark:bg-[#12141c] border border-blue-200 dark:border-blue-800 text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:border-blue-500"
                            autoFocus
                          />
                          <input
                            type="text"
                            value={newSubtaskLinkTitle}
                            onChange={(e) => setNewSubtaskLinkTitle(e.target.value)}
                            placeholder={language === 'id' ? 'Nama tautan (opsional)' : 'Link title (optional)'}
                            className="w-full sm:w-44 px-2.5 py-1 text-xs rounded-lg bg-white dark:bg-[#12141c] border border-blue-200 dark:border-blue-800 text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:border-blue-500"
                          />
                        </div>
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => setIsAddingNewItemLink(false)}
                            className="px-2.5 py-1 text-xs text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 cursor-pointer"
                          >
                            {language === 'id' ? 'Batal' : 'Cancel'}
                          </button>
                          <button
                            type="button"
                            onClick={handleSaveLinkForNewItem}
                            disabled={!newSubtaskLinkUrl.trim()}
                            className="px-3 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold disabled:opacity-40 cursor-pointer transition-colors"
                          >
                            {language === 'id' ? 'Sematkan' : 'Attach'}
                          </button>
                        </div>
                      </div>
                    )}
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

                {/* External Links List (Split-Pill: [ Icon | Title & Actions ]) */}
                {externalLinksList.length > 0 && attachmentTab !== 'docs' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {externalLinksList.map((link) => (
                      <div
                        key={link.id}
                        className="group inline-flex items-stretch rounded-full border border-blue-300/80 dark:border-blue-800/70 bg-blue-50/50 dark:bg-blue-950/20 hover:border-blue-400 dark:hover:border-blue-600 transition-all text-xs overflow-hidden shadow-2xs"
                      >
                        {/* Left Compartment: Link Icon with vertical divider */}
                        <div className="px-3.5 py-2 bg-blue-100/80 dark:bg-blue-900/40 border-r border-blue-300/80 dark:border-blue-800/70 flex items-center justify-center shrink-0">
                          <Link2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        </div>

                        {/* Right Compartment: Link Details & Actions */}
                        <div className="px-3 py-1.5 flex items-center justify-between gap-2 min-w-0 flex-1">
                          <a
                            href={link.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="min-w-0 flex-1 hover:text-blue-600 dark:hover:text-blue-400"
                          >
                            <p className="font-bold text-neutral-950 dark:text-white truncate">
                              {link.title}
                            </p>
                            <p className="text-[10px] text-neutral-500 dark:text-neutral-400 truncate font-mono">
                              {link.domain || link.url}
                            </p>
                          </a>
                          <div className="flex items-center gap-1 shrink-0">
                            <a
                              href={link.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 text-neutral-400 hover:text-blue-600 dark:hover:text-blue-400 rounded-full hover:bg-blue-100/60 dark:hover:bg-blue-900/30 transition-colors"
                              title="Buka Tautan"
                            >
                              <ExternalLinkIcon className="w-3.5 h-3.5" />
                            </a>
                            <button
                              type="button"
                              onClick={() => setLinkToDelete(link)}
                              className="p-1.5 text-neutral-400 hover:text-red-500 rounded-full hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                              title="Hapus"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
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
                      if (!isImg) {
                        const ext = (file.extension || '').toLowerCase();
                        const isZip = file.type === 'archive' || ['zip', 'rar', '7z', 'tar', 'gz'].includes(ext);
                        const isSheet = file.type === 'spreadsheet' || ['xls', 'xlsx', 'csv'].includes(ext);
                        const isAudio = file.type === 'audio' || ['mp3', 'wav', 'ogg', 'm4a'].includes(ext);

                        return (
                          <div
                            key={file.id}
                            className={`group relative rounded-full border transition-all flex items-stretch justify-between text-xs overflow-hidden shadow-2xs ${
                              file.isWorkResult
                                ? 'border-emerald-300 dark:border-emerald-800/70 bg-emerald-50/50 dark:bg-emerald-950/20'
                                : isZip
                                ? 'border-amber-300 dark:border-amber-800/70 bg-amber-50/50 dark:bg-amber-950/20'
                                : isSheet
                                ? 'border-emerald-300 dark:border-emerald-800/70 bg-emerald-50/50 dark:bg-emerald-950/20'
                                : 'border-neutral-300 dark:border-[#2f3346] bg-neutral-50/70 dark:bg-[#181a25]'
                            }`}
                          >
                            {/* Left Compartment: File Icon with vertical dividing border */}
                            <div
                              className={`px-3.5 py-2 border-r flex items-center justify-center shrink-0 ${
                                isZip
                                  ? 'bg-amber-100/80 dark:bg-amber-900/40 border-amber-300 dark:border-amber-800/70 text-amber-700 dark:text-amber-300'
                                  : isSheet
                                  ? 'bg-emerald-100/80 dark:bg-emerald-900/40 border-emerald-300 dark:border-emerald-800/70 text-emerald-700 dark:text-emerald-300'
                                  : isAudio
                                  ? 'bg-purple-100/80 dark:bg-purple-900/40 border-purple-300 dark:border-purple-800/70 text-purple-700 dark:text-purple-300'
                                  : 'bg-neutral-200/80 dark:bg-[#252838] border-neutral-300 dark:border-[#2f3346] text-neutral-700 dark:text-neutral-300'
                              }`}
                            >
                              {isZip ? (
                                <Archive className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                              ) : isSheet ? (
                                <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                              ) : isAudio ? (
                                <Headphones className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                              ) : file.extension === 'pdf' ? (
                                <FileText className="w-4 h-4 text-rose-500" />
                              ) : (
                                <FileText className="w-4 h-4 text-neutral-600 dark:text-neutral-400" />
                              )}
                            </div>

                            {/* Right Compartment: File Info & Download/Delete */}
                            <div className="px-3.5 py-1.5 flex-1 flex items-center justify-between gap-2 min-w-0">
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-1.5">
                                  <p title={file.name} className="font-bold text-neutral-950 dark:text-neutral-100 truncate">
                                    {file.name}
                                  </p>
                                  {file.isWorkResult && (
                                    <span className="px-1.5 py-0.2 rounded-full text-[9px] font-semibold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25 shrink-0 flex items-center gap-0.5">
                                      <Sparkles className="w-2.5 h-2.5" />
                                      <span>Hasil</span>
                                    </span>
                                  )}
                                </div>
                                <p className="text-[10px] text-neutral-500 dark:text-neutral-400 font-mono">
                                  {file.size} • {file.uploadedAt}
                                </p>
                              </div>

                              <div className="flex items-center gap-1 shrink-0">
                                {file.url && (
                                  <button
                                    type="button"
                                    onClick={() => triggerDownload(file.name, file.url)}
                                    className="p-1.5 text-neutral-500 hover:text-neutral-950 dark:text-neutral-400 dark:hover:text-white rounded-full hover:bg-neutral-200/60 dark:hover:bg-[#252837] transition-colors cursor-pointer"
                                    title="Unduh berkas"
                                  >
                                    <Download className="w-3.5 h-3.5" />
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => setAttachmentToDelete(file)}
                                  className="p-1.5 text-neutral-400 hover:text-red-500 rounded-full hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors cursor-pointer"
                                  title="Hapus berkas"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      }

                      // Images maintain thumbnail card
                      return (
                        <div
                          key={file.id}
                          className={`group relative rounded-2xl border p-2.5 transition-all flex items-center justify-between gap-2.5 text-xs ${
                            file.isWorkResult
                              ? 'border-emerald-200/80 dark:border-emerald-900/60 bg-emerald-50/15 dark:bg-emerald-950/10'
                              : 'border-neutral-200/80 dark:border-[#222532] bg-white dark:bg-[#161822]'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0 flex-1">
                            <img
                              src={file.url}
                              alt={file.name}
                              onClick={() => setPreviewImage(file.url || null)}
                              className="w-10 h-10 rounded-xl object-cover border border-neutral-200/60 dark:border-[#292d3b] cursor-pointer hover:scale-105 transition-transform shrink-0"
                            />
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5">
                                <p title={file.name} className="font-bold text-neutral-900 dark:text-neutral-100 truncate">
                                  {file.name}
                                </p>
                                {file.isWorkResult && (
                                  <span className="px-1.5 py-0.2 rounded-full text-[9px] font-semibold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25 shrink-0 flex items-center gap-0.5">
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
