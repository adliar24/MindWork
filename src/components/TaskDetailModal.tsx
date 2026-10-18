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
  Cloud,
  HardDrive,
} from 'lucide-react';
import {
  Attachment,
  ChecklistItem,
  ColumnId,
  Comment,
  ExternalLink,
  LinkType,
  Priority,
  Task,
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

interface TaskDetailModalProps {
  task: Task;
  users: User[];
  currentUser: User;
  onClose: () => void;
  onUpdateTask: (updatedTask: Task) => void;
  onDeleteTask: (taskId: string) => void;
}

export const TaskDetailModal: React.FC<TaskDetailModalProps> = ({
  task,
  users,
  currentUser,
  onClose,
  onUpdateTask,
  onDeleteTask,
}) => {
  const { language, t } = useLanguage();
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description);
  const [columnId, setColumnId] = useState<ColumnId>(task.columnId);
  const [priority, setPriority] = useState<Priority>(task.priority);
  const [assigneeId, setAssigneeId] = useState(task.assigneeId);
  const [dueDate, setDueDate] = useState(task.dueDate);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [isEditingDesc, setIsEditingDesc] = useState(false);

  // New Comment state
  const [commentText, setCommentText] = useState('');
  const [selectedAuthorId, setSelectedAuthorId] = useState(currentUser.id);
  const [attachedRefName, setAttachedRefName] = useState<string>('');

  // Drag and drop state for files
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const resultFileInputRef = useRef<HTMLInputElement>(null);

  // Full image preview modal state
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // Exit animation state
  const [isClosing, setIsClosing] = useState(false);

  const handleClose = () => {
    if (isClosing) return;
    setIsClosing(true);
    setTimeout(() => {
      onClose();
    }, 180);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Checklist State
  const [newChecklistTitle, setNewChecklistTitle] = useState('');

  // External Links State
  const [newLinkTitle, setNewLinkTitle] = useState('');
  const [newLinkUrl, setNewLinkUrl] = useState('');
  const [newLinkType, setNewLinkType] = useState<LinkType>('drive');
  const [isAddingLink, setIsAddingLink] = useState(false);

  // Cloud Link Attachment State (Google Drive, Dropbox, OneDrive, etc.)
  const [isAddingCloudLink, setIsAddingCloudLink] = useState(false);
  const [cloudLinkUrl, setCloudLinkUrl] = useState('');
  const [cloudLinkName, setCloudLinkName] = useState('');
  const [cloudLinkError, setCloudLinkError] = useState<string | null>(null);
  const [fileWarning, setFileWarning] = useState<string | null>(null);

  const handleAddCloudLink = (e: React.FormEvent) => {
    e.preventDefault();
    setCloudLinkError(null);
    const rawUrl = cloudLinkUrl.trim();
    if (!rawUrl) {
      setCloudLinkError('Masukkan URL link berkas cloud.');
      return;
    }

    const cloudInfo = detectCloudService(rawUrl);
    const finalName = cloudLinkName.trim() || `${cloudInfo.name} File`;
    const newAtt: Attachment = {
      id: `att-cloud-${Date.now()}`,
      name: finalName,
      size: 'Cloud Link',
      type: 'other',
      uploadedAt: 'Hari ini',
      url: rawUrl.startsWith('http') ? rawUrl : `https://${rawUrl}`,
      extension: cloudInfo.provider.toUpperCase(),
      isCloudLink: true,
      cloudProvider: cloudInfo.name,
    };

    commitNewAttachments([newAtt]);
    setCloudLinkUrl('');
    setCloudLinkName('');
    setIsAddingCloudLink(false);
  };

  // Handlers for Checklist
  const handleToggleChecklist = (itemId: string) => {
    const currentList = task.checklist || [];
    const item = currentList.find((c) => c.id === itemId);
    if (!item) return;
    const nextCompleted = !item.completed;
    const updatedList = currentList.map((c) =>
      c.id === itemId ? { ...c, completed: nextCompleted } : c
    );

    const actor = users.find((u) => u.id === selectedAuthorId) || currentUser;
    const updatedTask: Task = {
      ...task,
      checklist: updatedList,
      activities: [
        {
          id: `act-${Date.now()}`,
          authorId: actor.id,
          action: `${nextCompleted ? 'menyelesaikan' : 'membatalkan centang'} subtask: "${item.title}"`,
          timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
        },
        ...task.activities,
      ],
    };
    onUpdateTask(updatedTask);
  };

  const handleAddChecklist = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newChecklistTitle.trim()) return;
    const newItem: ChecklistItem = {
      id: `cl-${Date.now()}`,
      title: newChecklistTitle.trim(),
      completed: false,
    };
    const updatedList = [...(task.checklist || []), newItem];
    const actor = users.find((u) => u.id === selectedAuthorId) || currentUser;
    const updatedTask: Task = {
      ...task,
      checklist: updatedList,
      activities: [
        {
          id: `act-${Date.now()}`,
          authorId: actor.id,
          action: `menambahkan subtask: "${newItem.title}"`,
          timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
        },
        ...task.activities,
      ],
    };
    onUpdateTask(updatedTask);
    setNewChecklistTitle('');
  };

  const handleDeleteChecklist = (itemId: string) => {
    const updatedList = (task.checklist || []).filter((c) => c.id !== itemId);
    onUpdateTask({ ...task, checklist: updatedList });
  };

  // Handlers for External Links / Deliverables
  const handleAddLink = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newLinkTitle.trim() || !newLinkUrl.trim()) return;
    let formattedUrl = newLinkUrl.trim();
    if (!formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
      formattedUrl = 'https://' + formattedUrl;
    }

    const newLink: ExternalLink = {
      id: `link-${Date.now()}`,
      title: newLinkTitle.trim(),
      url: formattedUrl,
      type: newLinkType,
    };

    const updatedLinks = [...(task.externalLinks || []), newLink];
    const actor = users.find((u) => u.id === selectedAuthorId) || currentUser;
    const updatedTask: Task = {
      ...task,
      externalLinks: updatedLinks,
      activities: [
        {
          id: `act-${Date.now()}`,
          authorId: actor.id,
          action: `menautkan hasil kerja: "${newLink.title}"`,
          timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
        },
        ...task.activities,
      ],
    };
    onUpdateTask(updatedTask);
    setNewLinkTitle('');
    setNewLinkUrl('');
    setIsAddingLink(false);
  };

  const handleDeleteLink = (linkId: string) => {
    const updatedLinks = (task.externalLinks || []).filter((l) => l.id !== linkId);
    onUpdateTask({ ...task, externalLinks: updatedLinks });
  };

  // Handle changes and propagate updates
  const handleStatusChange = (newStatus: ColumnId) => {
    setColumnId(newStatus);
    const actor = users.find((u) => u.id === selectedAuthorId) || currentUser;
    const statusTitles: Record<ColumnId, string> = {
      todo: 'To Do',
      in_progress: 'In Progress',
      in_review: 'In Review',
      done: 'Done',
    };
    const updated: Task = {
      ...task,
      columnId: newStatus,
      activities: [
        {
          id: `act-${Date.now()}`,
          authorId: actor.id,
          action: `mengubah status menjadi ${statusTitles[newStatus]}`,
          timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
        },
        ...task.activities,
      ],
    };
    onUpdateTask(updated);
  };

  const handleTitleBlur = () => {
    setIsEditingTitle(false);
    if (title.trim() && title !== task.title) {
      onUpdateTask({ ...task, title: title.trim() });
    }
  };

  const handleDescBlur = () => {
    setIsEditingDesc(false);
    if (description !== task.description) {
      onUpdateTask({ ...task, description });
    }
  };

  const handlePriorityChange = (newPriority: Priority) => {
    setPriority(newPriority);
    onUpdateTask({ ...task, priority: newPriority });
  };

  const handleAssigneeChange = (newAssigneeId: string) => {
    setAssigneeId(newAssigneeId);
    onUpdateTask({ ...task, assigneeId: newAssigneeId });
  };

  const handleDueDateChange = (newDate: string) => {
    setDueDate(newDate);
    onUpdateTask({ ...task, dueDate: newDate });
  };

  // Toggle image cover
  const handleToggleCover = (attachmentId: string) => {
    const updatedAttachments = task.attachments.map((att) => {
      if (att.id === attachmentId) {
        return { ...att, isCover: !att.isCover };
      }
      // If setting this as cover, optionally unset other covers
      return { ...att, isCover: false };
    });
    onUpdateTask({ ...task, attachments: updatedAttachments });
  };

  // Remove attachment
  const handleDeleteAttachment = (attachmentId: string) => {
    const target = task.attachments.find((a) => a.id === attachmentId);
    const updatedAttachments = task.attachments.filter((att) => att.id !== attachmentId);
    const actor = users.find((u) => u.id === selectedAuthorId) || currentUser;

    onUpdateTask({
      ...task,
      attachments: updatedAttachments,
      activities: [
        {
          id: `act-${Date.now()}`,
          authorId: actor.id,
          action: `menghapus lampiran "${target?.name || 'berkas'}"`,
          timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
        },
        ...task.activities,
      ],
    });
  };

  // File upload handler (from drag-drop or file picker)
  const processFiles = async (files: FileList | null, isWorkResult: boolean = false) => {
    if (!files || files.length === 0) return;
    setFileWarning(null);

    const newAttachments: Attachment[] = [];
    const fileArray = Array.from(files);

    for (const file of fileArray) {
      const { type, extension } = getFileTypeFromExtension(file.name);

      // If file is very large (> 5MB) and not an image, warn user to recommend cloud link
      if (file.size > 5 * 1024 * 1024 && type !== 'image') {
        setFileWarning(
          `Berkas "${file.name}" berukuran besar (${formatFileSize(file.size)}). Disarankan menyematkan tautan Google Drive / Cloud agar lebih hemat memori.`
        );
      }

      if (type === 'image') {
        try {
          // Automatic client-side image compression (HD quality, ~120-250KB)
          const compressed = await compressImageFile(file);
          const hasCover = task.attachments.some((a) => a.isCover);
          newAttachments.push({
            id: `att-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            name: file.name,
            size: compressed.size,
            type,
            uploadedAt: 'Hari ini',
            extension,
            url: compressed.dataUrl,
            isCover: !hasCover && !isWorkResult,
            isWorkResult,
          });
        } catch {
          // Fallback to direct dataURL
          await new Promise<void>((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => {
              newAttachments.push({
                id: `att-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
                name: file.name,
                size: formatFileSize(file.size),
                type,
                uploadedAt: 'Hari ini',
                extension,
                url: e.target?.result as string,
                isWorkResult,
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
            newAttachments.push({
              id: `att-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
              name: file.name,
              size: formatFileSize(file.size),
              type,
              uploadedAt: 'Hari ini',
              extension,
              url: e.target?.result as string,
              isWorkResult,
            });
            resolve();
          };
          reader.onerror = () => {
            newAttachments.push({
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

    if (newAttachments.length > 0) {
      commitNewAttachments(newAttachments, isWorkResult);
    }
  };

  const commitNewAttachments = (incoming: Attachment[], isWorkResult: boolean = false) => {
    const actor = users.find((u) => u.id === selectedAuthorId) || currentUser;
    const fileSummary = incoming.map((a) => a.name).join(', ');
    const updated: Task = {
      ...task,
      attachments: [...task.attachments, ...incoming],
      activities: [
        {
          id: `act-${Date.now()}`,
          authorId: actor.id,
          action: isWorkResult
            ? `mengunggah berkas hasil kerja: "${fileSummary}"`
            : `mengunggah ${incoming.length} berkas lampiran baru`,
          timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
        },
        ...task.activities,
      ],
    };
    onUpdateTask(updated);
  };

  // Drag over drop zone handlers
  const handleDropAreaDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDropAreaDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDropAreaDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    processFiles(e.dataTransfer.files);
  };

  // Submit comment
  const handleAddComment = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!commentText.trim()) return;

    const newComment: Comment = {
      id: `comm-${Date.now()}`,
      authorId: selectedAuthorId,
      content: commentText.trim(),
      createdAt: 'Baru saja',
      attachmentName: attachedRefName || undefined,
    };

    const updatedTask: Task = {
      ...task,
      comments: [...task.comments, newComment],
    };

    onUpdateTask(updatedTask);
    setCommentText('');
    setAttachedRefName('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      handleAddComment();
    }
  };

  const assignedUser = users.find((u) => u.id === assigneeId);

  const statusConfigs: Record<ColumnId, { label: string; dot: string; color: string }> = {
    todo: { label: t('colTodoTitle'), dot: 'bg-neutral-400 dark:bg-neutral-500', color: 'text-neutral-700 dark:text-neutral-300' },
    in_progress: { label: t('colInProgressTitle'), dot: 'bg-red-500', color: 'text-red-600 dark:text-red-400' },
    in_review: { label: t('colInReviewTitle'), dot: 'bg-amber-500', color: 'text-amber-600 dark:text-amber-400' },
    done: { label: t('colDoneTitle'), dot: 'bg-emerald-500', color: 'text-emerald-600 dark:text-emerald-400' },
  };

  const currentStatusConfig = statusConfigs[columnId] || statusConfigs.todo;

  const totalChecklist = (task.checklist || []).length;
  const completedChecklist = (task.checklist || []).filter((c) => c.completed).length;
  const checklistPercent = totalChecklist > 0 ? Math.round((completedChecklist / totalChecklist) * 100) : 0;

  const workResultAttachments = task.attachments.filter((a) => a.isWorkResult);
  const regularAttachments = task.attachments.filter((a) => !a.isWorkResult);

  return (
    <div
      onClick={handleClose}
      className={`fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/70 backdrop-blur-sm overflow-y-auto cursor-pointer ${
        isClosing ? 'animate-backdrop-out' : 'animate-in fade-in'
      }`}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`w-full max-w-5xl max-h-[92vh] flex flex-col rounded-2xl bg-white dark:bg-[#111215] border border-neutral-200 dark:border-neutral-800 shadow-2xl text-neutral-900 dark:text-neutral-100 overflow-hidden cursor-default ${
          isClosing ? 'animate-modal-out' : 'animate-modal-in'
        }`}
      >
        {/* Top Header Bar */}
        <div className="h-14 px-5 border-b border-neutral-200 dark:border-neutral-800/80 flex items-center justify-between shrink-0 bg-white dark:bg-[#111215]">
          {/* Status selector & Task Key */}
          <div className="flex items-center gap-3">
            {/* Status Dropdown Pill */}
            <div className="relative inline-flex items-center">
              <span className={`w-2 h-2 rounded-full mr-2 ${currentStatusConfig.dot}`} />
              <select
                value={columnId}
                onChange={(e) => handleStatusChange(e.target.value as ColumnId)}
                aria-label="Status Tugas"
                className={`text-xs font-semibold bg-transparent focus:outline-none cursor-pointer pr-4 ${currentStatusConfig.color}`}
              >
                <option value="todo" className="dark:bg-neutral-900 text-neutral-900 dark:text-white">{t('colTodoTitle')}</option>
                <option value="in_progress" className="dark:bg-neutral-900 text-neutral-900 dark:text-white">{t('colInProgressTitle')}</option>
                <option value="in_review" className="dark:bg-neutral-900 text-neutral-900 dark:text-white">{t('colInReviewTitle')}</option>
                <option value="done" className="dark:bg-neutral-900 text-neutral-900 dark:text-white">{t('colDoneTitle')}</option>
              </select>
              <ChevronDown className="w-3 h-3 text-neutral-400 pointer-events-none -ml-3" />
            </div>

            <span className="text-neutral-300 dark:text-neutral-700">|</span>

            {/* Task Tag pill */}
            <div className="flex items-center gap-1.5">
              {task.tags.map((tag) => (
                <span
                  key={tag}
                  className="text-[10px] font-medium px-2 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 border border-neutral-200/50 dark:border-neutral-700/50"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => {
                if (confirm(t('deleteTaskConfirm'))) {
                  onDeleteTask(task.id);
                  handleClose();
                }
              }}
              title={t('deleteTask')}
              className="p-1.5 rounded-lg text-neutral-400 hover:text-red-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button
              onClick={handleClose}
              title={`${t('closeBtn')} (Esc)`}
              className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 2-Column Main Layout: Left = Content, Right = Properties */}
        <div className="flex-1 flex flex-col lg:flex-row overflow-y-auto lg:overflow-hidden">
          {/* LEFT: Main Content (Title, Description, Links, Checklist, Attachments, Comments) */}
          <div className="flex-1 lg:overflow-y-auto p-4 sm:p-5 md:p-7 space-y-6">
            {/* Title */}
            <div>
              {isEditingTitle ? (
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  onBlur={handleTitleBlur}
                  onKeyDown={(e) => e.key === 'Enter' && handleTitleBlur()}
                  autoFocus
                  className="w-full text-lg md:text-xl font-bold bg-transparent text-neutral-950 dark:text-white border-b-2 border-red-500 focus:outline-none pb-1"
                />
              ) : (
                <h1
                  onClick={() => setIsEditingTitle(true)}
                  title="Klik untuk mengedit judul"
                  className="text-lg md:text-xl font-bold text-neutral-950 dark:text-white hover:text-neutral-600 dark:hover:text-neutral-300 cursor-pointer transition-colors leading-snug"
                >
                  {title}
                </h1>
              )}
            </div>

            {/* Description */}
            <div>
              {isEditingDesc ? (
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  onBlur={handleDescBlur}
                  rows={3}
                  autoFocus
                  placeholder="Tambah deskripsi..."
                  className="w-full p-2.5 text-xs rounded-lg bg-neutral-50 dark:bg-neutral-850/60 border border-neutral-300 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100 focus:outline-none resize-none leading-relaxed"
                />
              ) : (
                <div
                  onClick={() => setIsEditingDesc(true)}
                  className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed cursor-pointer hover:text-neutral-900 dark:hover:text-neutral-200 transition-colors"
                >
                  {description || (
                    <span className="text-neutral-400 italic">
                      + Tambah deskripsi tugas...
                    </span>
                  )}
                </div>
              )}
            </div>

            <div className="h-px bg-neutral-200/70 dark:bg-neutral-800/70" />

            {/* A. HASIL KERJA & PROGRES PENGERJAAN */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-semibold text-neutral-900 dark:text-neutral-100">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  <span>{t('workResultsTitle')}</span>
                  {(workResultAttachments.length + (task.externalLinks || []).length) > 0 && (
                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-neutral-100 dark:bg-neutral-800 text-neutral-500 font-bold">
                      {workResultAttachments.length + (task.externalLinks || []).length}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => resultFileInputRef.current?.click()}
                    title={language === 'id' ? 'Unggah berkas hasil / progres kerja' : 'Upload result / progress file'}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-red-600 hover:bg-red-700 active:scale-95 text-white text-xs font-semibold shadow-xs transition-all cursor-pointer"
                  >
                    <UploadCloud className="w-3.5 h-3.5 stroke-[2.2]" />
                    <span>{t('uploadResultBtn')}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsAddingLink(!isAddingLink)}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 text-xs font-medium transition-all cursor-pointer"
                  >
                    <Link2 className="w-3.5 h-3.5" />
                    <span>{isAddingLink ? (language === 'id' ? 'Batal' : 'Cancel') : t('linkResultBtn')}</span>
                  </button>
                </div>
              </div>

              {/* Hidden Result File Input */}
              <input
                ref={resultFileInputRef}
                type="file"
                multiple
                onChange={(e) => processFiles(e.target.files, true)}
                className="hidden"
                accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.csv,.zip,.rar"
              />

              {/* Add Link Form */}
              {isAddingLink && (
                <form
                  onSubmit={handleAddLink}
                  className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-850/60 border border-neutral-200 dark:border-neutral-800 space-y-2.5 animate-in fade-in"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                    <input
                      type="text"
                      value={newLinkTitle}
                      onChange={(e) => setNewLinkTitle(e.target.value)}
                      placeholder={language === 'id' ? 'Nama tautan hasil (cth: Final Figma Design)' : 'Link title (e.g. Final Design)'}
                      className="sm:col-span-2 px-2.5 py-1.5 rounded-lg bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-white focus:outline-none focus:border-red-500"
                    />
                    <select
                      value={newLinkType}
                      onChange={(e) => setNewLinkType(e.target.value as LinkType)}
                      className="px-2.5 py-1.5 rounded-lg bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-white focus:outline-none focus:border-red-500 cursor-pointer"
                    >
                      <option value="drive">Google Drive</option>
                      <option value="figma">Figma</option>
                      <option value="canva">Canva</option>
                      <option value="doc">Docs</option>
                      <option value="sheet">Sheets</option>
                      <option value="link">Website / Live Demo</option>
                    </select>
                  </div>

                  <input
                    type="text"
                    value={newLinkUrl}
                    onChange={(e) => setNewLinkUrl(e.target.value)}
                    placeholder="https://..."
                    className="w-full px-2.5 py-1.5 text-xs rounded-lg bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-white focus:outline-none focus:border-red-500"
                  />

                  <div className="flex items-center justify-end gap-2">
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
                      {t('saveChanges')}
                    </button>
                  </div>
                </form>
              )}

              {/* Uploaded Result Files & External Result Links List */}
              {(workResultAttachments.length > 0 || (task.externalLinks || []).length > 0) ? (
                <div className="space-y-2">
                  {/* Result Files */}
                  {workResultAttachments.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {workResultAttachments.map((file) => {
                        const isImg = file.type === 'image';
                        return (
                          <div
                            key={file.id}
                            className="group relative rounded-xl border border-emerald-200/80 dark:border-emerald-900/60 bg-emerald-50/20 dark:bg-emerald-950/10 hover:border-emerald-400 p-2.5 flex items-center justify-between gap-2.5 transition-all text-xs"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              {isImg && file.url ? (
                                <img
                                  src={file.url}
                                  alt={file.name}
                                  onClick={() => setPreviewImage(file.url || null)}
                                  className="w-10 h-10 rounded-lg object-cover border border-emerald-200 dark:border-emerald-800 cursor-pointer shrink-0"
                                />
                              ) : (
                                <div className="w-10 h-10 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center justify-center shrink-0">
                                  <FileText className="w-5 h-5" />
                                </div>
                              )}

                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="font-semibold text-neutral-900 dark:text-neutral-100 truncate max-w-[150px] sm:max-w-[180px]">
                                    {file.name}
                                  </span>
                                  <span className="px-1.5 py-0.2 rounded text-[9px] font-semibold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25 flex items-center gap-0.5 shrink-0">
                                    <Sparkles className="w-2.5 h-2.5" />
                                    {t('workResultBadge')}
                                  </span>
                                </div>
                                <span className="text-[10px] text-neutral-400 font-mono">
                                  {file.size} • {file.uploadedAt}
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center gap-1 shrink-0">
                              {file.url && (
                                <button
                                  type="button"
                                  onClick={() => triggerDownload(file.url!, file.name)}
                                  title={language === 'id' ? 'Unduh berkas' : 'Download file'}
                                  className="p-1 text-neutral-400 hover:text-emerald-600 dark:hover:text-emerald-400 rounded cursor-pointer"
                                >
                                  <Download className="w-3.5 h-3.5" />
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => handleDeleteAttachment(file.id)}
                                title={language === 'id' ? 'Hapus berkas' : 'Delete file'}
                                className="opacity-0 group-hover:opacity-100 p-1 text-neutral-400 hover:text-red-500 rounded transition-opacity cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* External Links */}
                  {(task.externalLinks || []).length > 0 && (
                    <div className="space-y-1.5">
                      {(task.externalLinks || []).map((link) => (
                        <div
                          key={link.id}
                          className="group flex items-center justify-between p-2 px-3 rounded-lg border border-neutral-200/80 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700 bg-white dark:bg-[#15161a] transition-all text-xs"
                        >
                          <div className="flex items-center gap-2.5 min-w-0 pr-2">
                            <Globe className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                            <span className="font-medium text-neutral-900 dark:text-neutral-100 truncate">
                              {link.title}
                            </span>
                            <span className="text-[10px] text-neutral-400 truncate max-w-xs font-mono">
                              {link.url}
                            </span>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            <a
                              href={link.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              title="Buka tautan"
                              className="p-1 text-neutral-400 hover:text-blue-500 rounded cursor-pointer"
                            >
                              <ExternalLinkIcon className="w-3.5 h-3.5" />
                            </a>
                            <button
                              type="button"
                              onClick={() => handleDeleteLink(link.id)}
                              title="Hapus tautan"
                              className="opacity-0 group-hover:opacity-100 p-1 text-neutral-400 hover:text-red-500 rounded transition-opacity cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Workflow suggestion: Advance to review once results are submitted */}
                  {(columnId === 'todo' || columnId === 'in_progress') && (
                    <div className="p-2.5 px-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between gap-3 text-xs animate-in fade-in">
                      <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
                        <Check className="w-4 h-4 shrink-0 stroke-[2.5]" />
                        <span className="font-medium">
                          {language === 'id'
                            ? 'Hasil kerja sudah diunggah. Mau ajukan untuk ditinjau ketua/tim?'
                            : 'Work results uploaded. Advance status for review?'}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleStatusChange('in_review')}
                        className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shrink-0 cursor-pointer transition-colors shadow-xs"
                      >
                        {language === 'id' ? 'Ajukan ke Ditinjau' : 'Submit for Review'}
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                !isAddingLink && (
                  <div
                    onClick={() => resultFileInputRef.current?.click()}
                    className="p-3.5 rounded-xl border border-dashed border-red-300 dark:border-red-900/50 bg-red-50/20 dark:bg-red-950/10 hover:bg-red-50/40 dark:hover:bg-red-950/20 transition-all cursor-pointer flex flex-col sm:flex-row items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-red-600/10 text-red-600 dark:text-red-400 flex items-center justify-center shrink-0">
                        <Sparkles className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="font-semibold text-neutral-900 dark:text-neutral-100">
                          {t('workResultsTitle')}
                        </p>
                        <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                          {t('workResultsDesc')}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          resultFileInputRef.current?.click();
                        }}
                        className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white font-semibold text-xs shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
                      >
                        <UploadCloud className="w-3.5 h-3.5" />
                        <span>{t('uploadResultBtn')}</span>
                      </button>
                    </div>
                  </div>
                )
              )}
            </div>

            <div className="h-px bg-neutral-200/70 dark:bg-neutral-800/70" />

            {/* B. CHECKLIST */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-semibold text-neutral-900 dark:text-neutral-100">
                  <CheckSquare className="w-3.5 h-3.5 text-neutral-400" />
                  <span>Checklist</span>
                  {totalChecklist > 0 && (
                    <span className="text-[10px] font-mono text-neutral-400">
                      {completedChecklist}/{totalChecklist} ({checklistPercent}%)
                    </span>
                  )}
                </div>
              </div>

              {/* Mini progress bar if subtasks exist */}
              {totalChecklist > 0 && (
                <div className="w-full h-1 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      checklistPercent === 100 ? 'bg-emerald-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${checklistPercent}%` }}
                  />
                </div>
              )}

              {/* Subtask Items */}
              <div className="space-y-1">
                {(task.checklist || []).map((item) => (
                  <div
                    key={item.id}
                    className="group flex items-center justify-between p-1.5 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-850/50 text-xs"
                  >
                    <button
                      type="button"
                      onClick={() => handleToggleChecklist(item.id)}
                      className="flex items-center gap-2.5 min-w-0 flex-1 text-left cursor-pointer"
                    >
                      <div
                        className={`w-3.5 h-3.5 rounded flex items-center justify-center shrink-0 border transition-colors ${
                          item.completed
                            ? 'bg-neutral-900 dark:bg-white border-neutral-900 dark:border-white text-white dark:text-neutral-950'
                            : 'border-neutral-300 dark:border-neutral-600 hover:border-neutral-400'
                        }`}
                      >
                        {item.completed && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                      </div>
                      <span
                        className={`transition-all ${
                          item.completed
                            ? 'line-through text-neutral-400 dark:text-neutral-500'
                            : 'text-neutral-800 dark:text-neutral-200'
                        }`}
                      >
                        {item.title}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDeleteChecklist(item.id)}
                      title="Hapus"
                      className="opacity-0 group-hover:opacity-100 p-1 text-neutral-400 hover:text-red-500 rounded transition-opacity"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Add checklist input */}
              <form onSubmit={handleAddChecklist} className="flex items-center gap-2 pt-0.5">
                <input
                  type="text"
                  value={newChecklistTitle}
                  onChange={(e) => setNewChecklistTitle(e.target.value)}
                  placeholder={t('newSubtaskPlaceholder')}
                  className="flex-1 px-2.5 py-1.5 text-xs bg-transparent border-b border-transparent hover:border-neutral-300 dark:hover:border-neutral-700 focus:border-red-500 focus:outline-none text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 transition-colors"
                />
              </form>
            </div>

            <div className="h-px bg-neutral-200/70 dark:bg-neutral-800/70" />

            {/* C. LAMPIRAN */}
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-neutral-900 dark:text-neutral-100">
                  <Paperclip className="w-3.5 h-3.5 text-neutral-400" />
                  <span>{t('attachments')}</span>
                  {task.attachments.length > 0 && (
                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-neutral-100 dark:bg-neutral-800 text-neutral-500">
                      {task.attachments.length}
                    </span>
                  )}
                  <span className="hidden sm:inline-flex text-[10px] text-emerald-600 dark:text-emerald-400 font-normal bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded border border-emerald-200 dark:border-emerald-800/60">
                    {language === 'id' ? 'HD & Ringan' : 'HD & Lightweight'}
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setIsAddingCloudLink(!isAddingCloudLink)}
                    className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg border transition-all cursor-pointer ${
                      isAddingCloudLink
                        ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border-blue-300 dark:border-blue-800'
                        : 'text-neutral-600 dark:text-neutral-300 border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                    }`}
                  >
                    <Cloud className="w-3.5 h-3.5 text-blue-500" />
                    <span>+ {t('embedCloudLink')}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 hover:opacity-90 transition-all cursor-pointer"
                  >
                    <UploadCloud className="w-3.5 h-3.5" />
                    <span>+ {t('uploadFile')}</span>
                  </button>
                </div>
              </div>

              {/* Large File Warning if detected */}
              {fileWarning && (
                <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/80 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                  <div className="flex-1 space-y-1">
                    <p className="leading-relaxed">{fileWarning}</p>
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          setIsAddingCloudLink(true);
                          setFileWarning(null);
                        }}
                        className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                      >
                        {language === 'id' ? 'Sematkan Link Cloud Sekarang →' : 'Embed Cloud Link Now →'}
                      </button>
                      <span className="text-neutral-300 dark:text-neutral-700">•</span>
                      <button
                        type="button"
                        onClick={() => setFileWarning(null)}
                        className="text-[11px] text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 cursor-pointer"
                      >
                        {t('cancel')}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Form Sematkan Link Cloud (Google Drive, OneDrive, Dropbox, dll.) */}
              {isAddingCloudLink && (
                <form
                  onSubmit={handleAddCloudLink}
                  className="p-3.5 rounded-xl border border-blue-200 dark:border-blue-900/60 bg-blue-50/40 dark:bg-blue-950/20 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-blue-900 dark:text-blue-200">
                      <Cloud className="w-4 h-4 text-blue-500" />
                      <span>{t('embedCloudTitle')}</span>
                    </div>
                    {cloudLinkUrl && (
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/80 text-blue-700 dark:text-blue-300">
                        {detectCloudService(cloudLinkUrl).name}
                      </span>
                    )}
                  </div>

                  <p className="text-[11px] text-neutral-600 dark:text-neutral-400">
                    {t('embedCloudDesc')}
                  </p>

                  <div className="space-y-2">
                    <div>
                      <input
                        type="text"
                        required
                        value={cloudLinkUrl}
                        onChange={(e) => setCloudLinkUrl(e.target.value)}
                        placeholder={t('cloudUrlPlaceholder')}
                        className="w-full px-3 py-1.5 text-xs rounded-lg bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 focus:outline-none focus:border-blue-500 text-neutral-900 dark:text-neutral-100 placeholder-neutral-400"
                      />
                    </div>
                    <div>
                      <input
                        type="text"
                        value={cloudLinkName}
                        onChange={(e) => setCloudLinkName(e.target.value)}
                        placeholder={t('cloudNamePlaceholder')}
                        className="w-full px-3 py-1.5 text-xs rounded-lg bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 focus:outline-none focus:border-blue-500 text-neutral-900 dark:text-neutral-100 placeholder-neutral-400"
                      />
                    </div>
                  </div>

                  {cloudLinkError && (
                    <p className="text-[11px] text-red-500 font-medium">{cloudLinkError}</p>
                  )}

                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setIsAddingCloudLink(false);
                        setCloudLinkError(null);
                      }}
                      className="px-3 py-1 text-xs text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white cursor-pointer"
                    >
                      {t('cancel')}
                    </button>
                    <button
                      type="submit"
                      className="px-3.5 py-1 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>{t('embedAction')}</span>
                    </button>
                  </div>
                </form>
              )}

              {/* Upload Dropzone */}
              <div
                onDragOver={handleDropAreaDragOver}
                onDragLeave={handleDropAreaDragLeave}
                onDrop={handleDropAreaDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border border-dashed rounded-xl p-3 text-center transition-all cursor-pointer select-none
                  ${
                    isDragOver
                      ? 'border-red-500 bg-red-500/5'
                      : 'border-neutral-200 dark:border-neutral-800 hover:border-neutral-400 dark:hover:border-neutral-700'
                  }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  onChange={(e) => processFiles(e.target.files)}
                  className="hidden"
                  accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.csv,.zip,.rar"
                />
                <div className="flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 text-xs text-neutral-500">
                  <div className="flex items-center gap-1.5">
                    <UploadCloud className="w-4 h-4 text-neutral-400" />
                    <span>{t('dropzoneText')}</span>
                  </div>
                  <span className="text-[11px] text-neutral-400">
                    {t('dropzoneSubtext')}
                  </span>
                </div>
              </div>

              {/* Attachments List */}
              {task.attachments.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                  {task.attachments.map((file) => {
                    const isImg = file.type === 'image';
                    const isCloud = file.isCloudLink;

                    return (
                      <div
                        key={file.id}
                        className={`group relative rounded-xl border p-2.5 transition-all flex flex-col justify-between ${
                          isCloud
                            ? 'border-blue-200/80 dark:border-blue-900/60 bg-blue-50/20 dark:bg-blue-950/10 hover:border-blue-400'
                            : 'border-neutral-200/80 dark:border-neutral-800 bg-white dark:bg-[#15161a] hover:border-neutral-300 dark:hover:border-neutral-700'
                        }`}
                      >
                        {isCloud ? (
                          /* Tampilan Berkas Cloud */
                          <div className="w-full h-24 mb-2 rounded-lg bg-gradient-to-br from-blue-500/10 to-indigo-500/10 dark:from-blue-950/30 dark:to-indigo-950/30 border border-blue-200/50 dark:border-blue-800/40 flex flex-col items-center justify-center p-2 text-center relative overflow-hidden">
                            <div className="w-8 h-8 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-1">
                              <Cloud className="w-4 h-4" />
                            </div>
                            <span className="text-[11px] font-semibold text-blue-900 dark:text-blue-200 truncate max-w-full px-2">
                              {file.cloudProvider || 'Cloud Storage'}
                            </span>
                            <span className="text-[9px] text-neutral-500 dark:text-neutral-400 font-mono">
                              {language === 'id' ? 'Tautan Eksternal' : 'External Link'}
                            </span>
                          </div>
                        ) : isImg && file.url ? (
                          /* Tampilan Gambar dengan Kompresi Ringan */
                          <div
                            onClick={() => file.url && setPreviewImage(file.url)}
                            className="w-full h-24 mb-2 rounded-lg overflow-hidden bg-neutral-100 dark:bg-neutral-900 cursor-pointer relative group/img border border-neutral-100 dark:border-neutral-800"
                          >
                            <img
                              src={file.url}
                              alt={file.name}
                              referrerPolicy="no-referrer"
                              className="w-full h-full object-cover group-hover/img:scale-105 transition-transform duration-200"
                            />
                            <div className="absolute inset-0 bg-black/0 hover:bg-black/25 flex items-center justify-center transition-colors">
                              <Eye className="w-4 h-4 text-white opacity-0 group-hover/img:opacity-100 transition-opacity drop-shadow" />
                            </div>
                          </div>
                        ) : (
                          /* Tampilan Dokumen Lokal Lainnya */
                          <div
                            onClick={() => triggerDownload(file.name, file.url)}
                            className="w-full h-24 mb-2 rounded-lg bg-neutral-100/80 dark:bg-[#181a24] border border-neutral-200/60 dark:border-[#272a35] flex flex-col items-center justify-center gap-1 cursor-pointer hover:bg-neutral-200/60 dark:hover:bg-[#202330] transition-colors"
                            title={language === 'id' ? 'Klik untuk mengunduh berkas' : 'Click to download file'}
                          >
                            {file.extension?.toLowerCase() === 'pdf' ? (
                              <FileText className="w-6 h-6 text-red-500" />
                            ) : ['xls', 'xlsx', 'csv'].includes(file.extension?.toLowerCase() || '') ? (
                              <FileSpreadsheet className="w-6 h-6 text-emerald-500" />
                            ) : ['zip', 'rar', '7z', 'tar', 'gz'].includes(file.extension?.toLowerCase() || '') ? (
                              <Archive className="w-6 h-6 text-amber-500" />
                            ) : (
                              <FileText className="w-6 h-6 text-indigo-500" />
                            )}
                            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                              .{file.extension || 'FILE'}
                            </span>
                          </div>
                        )}

                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <p title={file.name} className="text-xs font-medium text-neutral-900 dark:text-neutral-100 truncate max-w-[150px]">
                              {file.name}
                            </p>
                            {file.isWorkResult && (
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-semibold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25 flex items-center gap-0.5 shrink-0">
                                <Sparkles className="w-2.5 h-2.5" />
                                {t('workResultBadge')}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 text-[10px] text-neutral-400 font-mono mt-0.5">
                            {isCloud ? (
                              <span className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 font-medium">
                                <Globe className="w-2.5 h-2.5" />
                                <span>{file.cloudProvider || 'Cloud Link'}</span>
                              </span>
                            ) : (
                              <span>{file.size}</span>
                            )}
                            <span>•</span>
                            <span>{file.uploadedAt}</span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-2 mt-1.5 border-t border-neutral-100 dark:border-neutral-800/80 text-[10px]">
                          {isCloud ? (
                            <a
                              href={file.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors"
                            >
                              <span>{t('openFile')}</span>
                              <ExternalLinkIcon className="w-2.5 h-2.5" />
                            </a>
                          ) : isImg ? (
                            <button
                              onClick={() => handleToggleCover(file.id)}
                              className={`px-1.5 py-0.5 rounded cursor-pointer ${
                                file.isCover
                                  ? 'text-red-600 font-semibold bg-red-500/10'
                                  : 'text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200'
                              }`}
                            >
                              {file.isCover ? t('coverBadge') : t('setCover')}
                            </button>
                          ) : (
                            <div />
                          )}

                          <div className="flex items-center gap-1">
                            {!isCloud && (
                              <button
                                onClick={() => triggerDownload(file.name, file.url)}
                                title={language === 'id' ? 'Unduh berkas' : 'Download file'}
                                className="p-1 text-neutral-400 hover:text-neutral-800 dark:hover:text-white rounded cursor-pointer"
                              >
                                <Download className="w-3 h-3" />
                              </button>
                            )}
                            <button
                              onClick={() => handleDeleteAttachment(file.id)}
                              title={language === 'id' ? 'Hapus berkas' : 'Delete file'}
                              className="p-1 text-neutral-400 hover:text-red-500 rounded cursor-pointer"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="h-px bg-neutral-200/70 dark:bg-neutral-800/70" />

            {/* D. DISKUSI */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-neutral-900 dark:text-neutral-100">
                <MessageSquare className="w-3.5 h-3.5 text-neutral-400" />
                <span>{t('discussion')}</span>
                {task.comments.length > 0 && (
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-neutral-100 dark:bg-neutral-800 text-neutral-500">
                    {task.comments.length}
                  </span>
                )}
              </div>

              {/* Comment Composer */}
              <form
                onSubmit={handleAddComment}
                className="p-2.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/40 space-y-2"
              >
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] text-neutral-400">{language === 'id' ? 'Sebagai:' : 'As:'}</span>
                    <select
                      value={selectedAuthorId}
                      onChange={(e) => setSelectedAuthorId(e.target.value)}
                      aria-label={language === 'id' ? 'Komentar sebagai' : 'Comment as'}
                      className="bg-transparent font-medium text-neutral-800 dark:text-neutral-200 focus:outline-none cursor-pointer"
                    >
                      {users.map((u) => (
                        <option key={u.id} value={u.id} className="dark:bg-neutral-900">
                          {u.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <textarea
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  rows={2}
                  placeholder={t('addCommentPlaceholder')}
                  className="w-full p-2 text-xs rounded-lg bg-white dark:bg-[#15161a] border border-neutral-200 dark:border-neutral-800 text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:border-red-500 resize-none"
                />

                <div className="flex items-center justify-end">
                  <button
                    type="submit"
                    disabled={!commentText.trim()}
                    className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-semibold disabled:opacity-40 transition-colors"
                  >
                    <Send className="w-3 h-3" />
                    <span>{t('sendComment')}</span>
                  </button>
                </div>
              </form>

              {/* Comment List */}
              <div className="space-y-2.5 pt-1">
                {task.comments.map((comment) => {
                  const author = users.find((u) => u.id === comment.authorId);
                  return (
                    <div
                      key={comment.id}
                      className="p-2.5 rounded-lg border border-neutral-100 dark:border-neutral-850 bg-neutral-50/30 dark:bg-neutral-900/30 space-y-1 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <UserAvatar
                            avatar={author?.avatar}
                            name={author?.name || (language === 'id' ? 'Anggota Tim' : 'Team Member')}
                            color={author ? author.color : 'bg-neutral-600 text-white'}
                            className="w-5 h-5 text-[9px]"
                          />
                          <span className="font-semibold text-neutral-900 dark:text-neutral-100">
                            {author?.name || (language === 'id' ? 'Anggota Tim' : 'Team Member')}
                          </span>
                        </div>
                        <span className="text-[10px] text-neutral-400 font-mono">
                          {comment.createdAt}
                        </span>
                      </div>
                      <p className="text-neutral-700 dark:text-neutral-300 pl-7 leading-relaxed">
                        {comment.content}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* RIGHT SIDEBAR: Linear-style Properties Panel */}
          <div className="w-full lg:w-72 border-t lg:border-t-0 lg:border-l border-neutral-200 dark:border-neutral-800/80 p-4 sm:p-5 space-y-5 bg-neutral-50/40 dark:bg-neutral-950/30 text-xs shrink-0 lg:overflow-y-auto">
            <h3 className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
              {language === 'id' ? 'Properti' : 'Properties'}
            </h3>

            <div className="space-y-3.5">
              {/* Assignee */}
              <div>
                <span className="block text-[11px] text-neutral-400 mb-1">{t('assigneeLabel')}</span>
                <div className="flex items-center gap-2 p-1.5 rounded-lg bg-white dark:bg-[#15161a] border border-neutral-200/80 dark:border-neutral-800">
                  <UserAvatar
                    avatar={assignedUser?.avatar}
                    name={assignedUser?.name || '?'}
                    color={assignedUser ? assignedUser.color : 'bg-neutral-600 text-white'}
                    className="w-5 h-5 text-[9px] shrink-0"
                  />
                  <select
                    value={assigneeId}
                    onChange={(e) => handleAssigneeChange(e.target.value)}
                    aria-label={t('assigneeLabel')}
                    className="w-full bg-transparent font-medium text-neutral-800 dark:text-neutral-200 focus:outline-none cursor-pointer truncate text-xs"
                  >
                    {users.map((u) => (
                      <option key={u.id} value={u.id} className="dark:bg-neutral-900">
                        {u.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Quick Work Results Action */}
                <button
                  type="button"
                  onClick={() => resultFileInputRef.current?.click()}
                  className="w-full mt-2 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg bg-red-600/10 hover:bg-red-600/20 text-red-600 dark:text-red-400 font-semibold border border-red-500/20 transition-all cursor-pointer text-xs"
                >
                  <UploadCloud className="w-3.5 h-3.5" />
                  <span>{t('uploadResultBtn')}</span>
                </button>
              </div>

              {/* Priority */}
              <div>
                <span className="block text-[11px] text-neutral-400 mb-1">{t('priorityLabel')}</span>
                <div className="flex items-center gap-2 p-1.5 rounded-lg bg-white dark:bg-[#15161a] border border-neutral-200/80 dark:border-neutral-800">
                  {priority === 'Tinggi' ? (
                    <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                  ) : priority === 'Sedang' ? (
                    <span className="w-4 h-4 flex items-center justify-center">
                      <span className="w-2.5 h-0.5 bg-amber-500 rounded-full" />
                    </span>
                  ) : (
                    <span className="w-4 h-4 flex items-center justify-center">
                      <span className="w-1.5 h-0.5 bg-neutral-400 rounded-full" />
                    </span>
                  )}
                  <select
                    value={priority}
                    onChange={(e) => handlePriorityChange(e.target.value as Priority)}
                    aria-label={t('priorityLabel')}
                    className="w-full bg-transparent font-medium text-neutral-800 dark:text-neutral-200 focus:outline-none cursor-pointer text-xs"
                  >
                    <option value="Tinggi" className="dark:bg-neutral-900 text-red-500">{t('priorityHigh')}</option>
                    <option value="Sedang" className="dark:bg-neutral-900 text-amber-500">{t('priorityMedium')}</option>
                    <option value="Rendah" className="dark:bg-neutral-900 text-neutral-400">{t('priorityLow')}</option>
                  </select>
                </div>
              </div>

              {/* Due Date */}
              <div>
                <span className="block text-[11px] text-neutral-400 mb-1">{t('dueDateLabel')}</span>
                <div className="flex items-center gap-2 p-1.5 rounded-lg bg-white dark:bg-[#15161a] border border-neutral-200/80 dark:border-neutral-800">
                  <Calendar className="w-4 h-4 text-neutral-400 shrink-0" />
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => handleDueDateChange(e.target.value)}
                    aria-label={t('dueDateLabel')}
                    className="w-full bg-transparent font-medium text-neutral-800 dark:text-neutral-200 focus:outline-none cursor-pointer text-xs"
                  />
                </div>
              </div>
            </div>

            {/* Recent Activities */}
            {task.activities.length > 0 && (
              <div className="pt-4 border-t border-neutral-200 dark:border-neutral-800/80 space-y-2">
                <div className="flex items-center gap-1.5 text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
                  <History className="w-3.5 h-3.5" />
                  <span>{t('activityLog')}</span>
                </div>
                <div className="space-y-2 pl-3 border-l border-neutral-200 dark:border-neutral-800 text-[11px] text-neutral-500 dark:text-neutral-400">
                  {task.activities.slice(0, 4).map((act) => {
                    const actUser = users.find((u) => u.id === act.authorId);
                    return (
                      <div key={act.id} className="leading-tight">
                        <span className="font-semibold text-neutral-700 dark:text-neutral-300">
                          {actUser?.name || (language === 'id' ? 'Anggota' : 'Member')}
                        </span>{' '}
                        <span>{act.action}</span>
                        <div className="text-[10px] text-neutral-400 font-mono mt-0.5">
                          {act.timestamp}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Full Image Preview Modal */}
      {previewImage && (
        <div
          onClick={() => setPreviewImage(null)}
          className="fixed inset-0 z-60 bg-black/90 flex items-center justify-center p-4 animate-in fade-in"
        >
          <div className="relative max-w-4xl max-h-[90vh] overflow-hidden rounded-xl bg-neutral-950">
            <button
              onClick={() => setPreviewImage(null)}
              className="absolute top-3 right-3 p-2 rounded-full bg-black/70 text-white hover:bg-red-600 transition-colors z-10"
            >
              <X className="w-5 h-5" />
            </button>
            <img
              src={previewImage}
              alt="Preview Berkas"
              referrerPolicy="no-referrer"
              className="w-full h-auto max-h-[85vh] object-contain"
            />
          </div>
        </div>
      )}
    </div>
  );
};
