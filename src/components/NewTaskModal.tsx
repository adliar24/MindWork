import React, { useState, useRef } from 'react';
import {
  X,
  Plus,
  UploadCloud,
  Calendar,
  Tag,
  User as UserIcon,
  Paperclip,
  Cloud,
  Globe,
  ExternalLink as ExternalLinkIcon,
  Sparkles,
  Bug,
  Zap,
  Palette,
  Lightbulb,
  CheckSquare,
  Clock,
  Check,
  Trash2,
} from 'lucide-react';
import { Column, ColumnId, Priority, Task, TaskType, User, Attachment } from '../types';
import { formatFileSize, getFileTypeFromExtension, compressImageFile, detectCloudService } from '../utils/fileHelpers';
import { useLanguage } from '../context/LanguageContext';

interface NewTaskModalProps {
  columns: Column[];
  users: User[];
  currentUser?: User;
  defaultColumnId?: ColumnId;
  projectId: string;
  onClose: () => void;
  onCreateTask: (task: Task) => void;
}

export const NewTaskModal: React.FC<NewTaskModalProps> = ({
  columns,
  users,
  currentUser,
  defaultColumnId = 'todo',
  projectId,
  onClose,
  onCreateTask,
}) => {
  const { t, language } = useLanguage();

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

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [columnId, setColumnId] = useState<ColumnId>(defaultColumnId);
  const [priority, setPriority] = useState<Priority>('Sedang');
  const [taskType, setTaskType] = useState<TaskType>('task');
  const [cardColor, setCardColor] = useState<string>('');
  const [estimate, setEstimate] = useState<string>('');
  const [assigneeId, setAssigneeId] = useState<string>(
    currentUser?.id || users[0]?.id || ''
  );
  const [dueDate, setDueDate] = useState<string>(
    new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString().split('T')[0]
  );
  const [tagsInput, setTagsInput] = useState('Desain, Sprint-1');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Subtasks/Checklist state
  const [checklistItems, setChecklistItems] = useState<{ id: string; title: string; completed: boolean }[]>([]);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');

  const handleAddSubtask = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newSubtaskTitle.trim()) return;
    setChecklistItems((prev) => [
      ...prev,
      { id: `chk-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`, title: newSubtaskTitle.trim(), completed: false },
    ]);
    setNewSubtaskTitle('');
  };

  const handleRemoveSubtask = (id: string) => {
    setChecklistItems((prev) => prev.filter((item) => item.id !== id));
  };

  // Cloud Link state in NewTaskModal
  const [isAddingCloudLink, setIsAddingCloudLink] = useState(false);
  const [cloudUrl, setCloudUrl] = useState('');
  const [cloudName, setCloudName] = useState('');

  const handleAddCloudLink = () => {
    const rawUrl = cloudUrl.trim();
    if (!rawUrl) return;
    const cloudInfo = detectCloudService(rawUrl);
    const finalName = cloudName.trim() || `${cloudInfo.name} File`;

    const newAtt: Attachment = {
      id: `att-cloud-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name: finalName,
      size: 'Cloud Link',
      type: 'other',
      uploadedAt: 'Hari ini',
      url: rawUrl.startsWith('http') ? rawUrl : `https://${rawUrl}`,
      extension: cloudInfo.provider.toUpperCase(),
      isCloudLink: true,
      cloudProvider: cloudInfo.name,
    };

    setAttachments((prev) => [...prev, newAtt]);
    setCloudUrl('');
    setCloudName('');
    setIsAddingCloudLink(false);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newAtts: Attachment[] = [];
    const fileArray = Array.from(files);

    for (const file of fileArray) {
      const { type, extension } = getFileTypeFromExtension(file.name);

      if (type === 'image') {
        try {
          // Kompresi gambar client-side (HD tajam, ukuran hemat ~150KB)
          const compressed = await compressImageFile(file);
          const hasCover = attachments.some((a) => a.isCover);
          newAtts.push({
            id: `att-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            name: file.name,
            size: compressed.size,
            type,
            uploadedAt: 'Hari ini',
            extension,
            url: compressed.dataUrl,
            isCover: !hasCover,
          });
        } catch {
          await new Promise<void>((resolve) => {
            const reader = new FileReader();
            reader.onload = (loadEvt) => {
              newAtts.push({
                id: `att-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
                name: file.name,
                size: formatFileSize(file.size),
                type,
                uploadedAt: 'Hari ini',
                extension,
                url: loadEvt.target?.result as string,
                isCover: !attachments.some((a) => a.isCover),
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
          reader.onload = (loadEvt) => {
            newAtts.push({
              id: `att-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
              name: file.name,
              size: formatFileSize(file.size),
              type,
              uploadedAt: 'Hari ini',
              extension,
              url: loadEvt.target?.result as string,
            });
            resolve();
          };
          reader.onerror = () => resolve();
          reader.readAsDataURL(file);
        });
      }
    }

    setAttachments((prev) => [...prev, ...newAtts]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleClose = () => {
    onClose();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const tags = tagsInput
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    const creatorId = currentUser?.id || assigneeId;
    const assignedUser = users.find((u) => u.id === assigneeId);

    const actionText =
      assigneeId && creatorId && assigneeId !== creatorId && assignedUser
        ? (language === 'id'
            ? `membuat tugas ini dan menugaskannya ke ${assignedUser.name}`
            : `created this task and assigned it to ${assignedUser.name}`)
        : (language === 'id' ? 'membuat tugas baru ini' : 'created this new task');

    const newTask: Task = {
      id: `task-${Date.now()}`,
      projectId,
      columnId,
      title: title.trim(),
      description: description.trim(),
      priority,
      taskType,
      cardColor,
      estimate: estimate.trim(),
      assigneeId,
      creatorId,
      dueDate,
      tags,
      attachments,
      comments: [],
      activities: [
        {
          id: `act-${Date.now()}`,
          authorId: creatorId,
          action: actionText,
          timestamp: 'Baru saja',
        },
      ],
      checklist: checklistItems,
      externalLinks: [],
      createdAt: 'Baru saja',
    };

    onCreateTask(newTask);
    handleClose();
  };

  return (
    <div
      onClick={handleClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 overflow-y-auto cursor-pointer animate-in fade-in"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg max-h-[92vh] flex flex-col rounded-[36px] bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-2xl overflow-hidden text-neutral-900 dark:text-neutral-100 cursor-default animate-modal-in"
      >
        {/* Trello-like Top Color Banner */}
        {cardColor && (
          <div className="w-full h-2.5 shrink-0 transition-all duration-300" style={{ backgroundColor: cardColor }} />
        )}

        {/* Header */}
        {/* Header */}
        <div className="p-4 px-5 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-[14px] bg-red-600 text-white flex items-center justify-center font-bold">
              <Plus className="w-4 h-4 stroke-[2.5]" />
            </div>
            <h3 className="text-sm sm:text-base font-bold text-neutral-950 dark:text-white">
              {t('newTaskModalTitle')}
            </h3>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 text-neutral-500 hover:text-neutral-950 dark:text-neutral-400 dark:hover:text-white rounded-full transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1">
          {/* Judul Tugas */}
          <div>
            <label className="block text-xs sm:text-sm font-bold text-neutral-800 dark:text-neutral-200 mb-1.5">
              {t('titleLabel')} <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t('titlePlaceholder')}
              className="w-full h-10 px-3.5 text-xs sm:text-sm rounded-xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 focus:outline-none focus:border-red-500 text-neutral-950 dark:text-white font-medium transition-colors"
            />
          </div>

          {/* Deskripsi */}
          <div>
            <label className="block text-xs sm:text-sm font-bold text-neutral-800 dark:text-neutral-200 mb-1.5">
              {t('descLabel')}
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t('descPlaceholder')}
              className="w-full p-3 text-xs sm:text-sm rounded-xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 focus:outline-none focus:border-red-500 text-neutral-950 dark:text-white font-medium resize-none transition-colors"
            />
          </div>

          {/* Status & Prioritas */}
          <div className="grid grid-cols-2 gap-3 text-xs sm:text-sm">
            <div>
              <label className="block text-xs sm:text-sm font-bold text-neutral-800 dark:text-neutral-200 mb-1.5">
                {t('statusLabel')}
              </label>
              <select
                value={columnId}
                onChange={(e) => setColumnId(e.target.value as ColumnId)}
                className="w-full h-10 px-3 rounded-xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 focus:outline-none focus:border-red-500 text-neutral-950 dark:text-white font-medium text-xs sm:text-sm"
              >
                {columns.map((col) => (
                  <option key={col.id} value={col.id}>
                    {getColumnTitle(col.id, col.title)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-bold text-neutral-800 dark:text-neutral-200 mb-1.5">
                {t('priorityLabel')}
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as Priority)}
                className="w-full h-10 px-3 rounded-xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 focus:outline-none focus:border-red-500 text-neutral-950 dark:text-white font-medium text-xs sm:text-sm"
              >
                <option value="Tinggi">{t('priorityHigh')}</option>
                <option value="Sedang">{t('priorityMedium')}</option>
                <option value="Rendah">{t('priorityLow')}</option>
              </select>
            </div>
          </div>

          {/* Jenis Tugas & Estimasi Waktu (Trello style) */}
          <div className="grid grid-cols-2 gap-3 text-xs sm:text-sm">
            <div>
              <label className="block text-xs sm:text-sm font-bold text-neutral-800 dark:text-neutral-200 mb-1.5">
                {language === 'id' ? 'Jenis Tugas' : 'Task Type'}
              </label>
              <select
                value={taskType}
                onChange={(e) => setTaskType(e.target.value as TaskType)}
                className="w-full h-10 px-3 rounded-xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 focus:outline-none focus:border-red-500 text-neutral-950 dark:text-white font-medium text-xs sm:text-sm"
              >
                <option value="task">{language === 'id' ? '📋 Tugas Umum' : '📋 General Task'}</option>
                <option value="concept">{language === 'id' ? '💡 Konsep / Ide' : '💡 Concept / Idea'}</option>
                <option value="asset">{language === 'id' ? '🎨 Aset & Referensi' : '🎨 Asset & Media'}</option>
                <option value="note">{language === 'id' ? '📝 Catatan' : '📝 Note'}</option>
                <option value="feature">{language === 'id' ? '✨ Fitur Baru' : '✨ Feature'}</option>
                <option value="bug">🐛 Bug / Issue</option>
                <option value="improvement">{language === 'id' ? '⚡ Peningkatan' : '⚡ Improvement'}</option>
                <option value="design">{language === 'id' ? '🎨 Desain / UI-UX' : '🎨 Design'}</option>
                <option value="research">{language === 'id' ? '💡 Riset' : '💡 Research'}</option>
              </select>
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-bold text-neutral-800 dark:text-neutral-200 mb-1.5">
                {language === 'id' ? 'Estimasi Waktu' : 'Time Estimate'}
              </label>
              <div className="relative">
                <Clock className="w-4 h-4 text-neutral-500 dark:text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={estimate}
                  onChange={(e) => setEstimate(e.target.value)}
                  placeholder={language === 'id' ? 'misal: 2 hari, 4 jam' : 'e.g. 2d, 4h'}
                  className="w-full h-10 pl-9 pr-3 rounded-xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 focus:outline-none focus:border-red-500 text-neutral-950 dark:text-white font-medium text-xs sm:text-sm placeholder:text-neutral-400 dark:placeholder:text-neutral-500"
                />
              </div>
            </div>
          </div>

          {/* Warna Sampul Kartu (Trello Card Color) */}
          <div>
            <label className="block text-xs sm:text-sm font-bold text-neutral-800 dark:text-neutral-200 mb-1.5">
              {language === 'id' ? 'Warna Sampul Kartu (Opsional)' : 'Card Cover Color (Optional)'}
            </label>
            <div className="grid grid-cols-5 sm:grid-cols-9 gap-2 p-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700">
              {[
                { label: 'Polos', value: '', bg: 'bg-neutral-300 dark:bg-neutral-600' },
                { label: 'Emerald', value: '#10b981', bg: 'bg-emerald-500' },
                { label: 'Sky', value: '#0284c7', bg: 'bg-sky-500' },
                { label: 'Rose', value: '#e11d48', bg: 'bg-rose-500' },
                { label: 'Amber', value: '#d97706', bg: 'bg-amber-500' },
                { label: 'Purple', value: '#7c3aed', bg: 'bg-purple-500' },
                { label: 'Indigo', value: '#4f46e5', bg: 'bg-indigo-500' },
                { label: 'Pink', value: '#db2777', bg: 'bg-pink-500' },
                { label: 'Slate', value: '#475569', bg: 'bg-slate-600' },
              ].map((c) => (
                <button
                  key={c.label}
                  type="button"
                  onClick={() => setCardColor(c.value)}
                  title={c.label}
                  className={`h-7 rounded-lg ${c.bg} transition-all flex items-center justify-center cursor-pointer hover:scale-105 active:scale-95 ${
                    cardColor === c.value ? 'ring-2 ring-red-500 ring-offset-1 dark:ring-offset-neutral-900' : 'opacity-85 hover:opacity-100'
                  }`}
                >
                  {cardColor === c.value && (
                    <Check className="w-4 h-4 text-white stroke-[3] drop-shadow" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Assignee & Tenggat */}
          <div className="grid grid-cols-2 gap-3 text-xs sm:text-sm">
            <div>
              <label className="block text-xs sm:text-sm font-bold text-neutral-800 dark:text-neutral-200 mb-1.5">
                {t('assigneeLabel')}
              </label>
              <select
                value={assigneeId}
                onChange={(e) => setAssigneeId(e.target.value)}
                className="w-full h-10 px-3 rounded-xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 focus:outline-none focus:border-red-500 text-neutral-950 dark:text-white font-medium text-xs sm:text-sm truncate"
              >
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-bold text-neutral-800 dark:text-neutral-200 mb-1.5">
                {t('dueDateLabel')}
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full h-10 px-3 rounded-xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 focus:outline-none focus:border-red-500 text-neutral-950 dark:text-white font-medium text-xs sm:text-sm"
              />
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="block text-xs sm:text-sm font-bold text-neutral-800 dark:text-neutral-200 mb-1.5">
              {t('tagsLabel')}
            </label>
            <input
              type="text"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder={t('tagsPlaceholder')}
              className="w-full h-10 px-3.5 text-xs sm:text-sm rounded-xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 focus:outline-none focus:border-red-500 text-neutral-950 dark:text-white font-medium"
            />
          </div>

          {/* Checklist / Subtugas (Opsional) */}
          <div className="space-y-2 pt-1 border-t border-neutral-200 dark:border-neutral-800">
            <div className="flex items-center justify-between text-xs sm:text-sm font-bold text-neutral-800 dark:text-neutral-200">
              <span className="flex items-center gap-1.5">
                <CheckSquare className="w-4 h-4 text-neutral-600 dark:text-neutral-400" />
                <span>{language === 'id' ? 'Checklist / Subtugas (Opsional)' : 'Subtasks / Checklist (Optional)'}</span>
              </span>
              {checklistItems.length > 0 && (
                <span className="text-xs font-mono text-neutral-600 dark:text-neutral-400 font-bold">
                  {checklistItems.length} {language === 'id' ? 'subtugas' : 'subtasks'}
                </span>
              )}
            </div>
            <p className="text-xs text-neutral-600 dark:text-neutral-400 font-medium">
              {language === 'id'
                ? 'Checklist bersifat opsional. Kosongkan jika kartu berupa ide, konsep, aset, atau catatan.'
                : 'Checklist is optional. Leave empty if this card is an idea, concept, asset, or note.'}
            </p>

            {checklistItems.length > 0 && (
              <div className="space-y-1.5 max-h-36 overflow-y-auto">
                {checklistItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-2 px-3 rounded-xl bg-neutral-50 dark:bg-neutral-800/80 border border-neutral-200 dark:border-neutral-700 text-xs sm:text-sm"
                  >
                    <span className="truncate text-neutral-900 dark:text-neutral-100 font-medium">{item.title}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveSubtask(item.id)}
                      className="p-1 text-neutral-400 hover:text-red-500 rounded cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-center gap-2">
              <input
                type="text"
                value={newSubtaskTitle}
                onChange={(e) => setNewSubtaskTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddSubtask();
                  }
                }}
                placeholder={language === 'id' ? 'Tambah subtugas (misal: Buat storyboard)...' : 'Add subtask...'}
                className="flex-1 px-3.5 py-2 text-xs sm:text-sm rounded-xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 focus:outline-none focus:border-red-500 text-neutral-950 dark:text-white font-medium placeholder-neutral-400 dark:placeholder-neutral-500"
              />
              <button
                type="button"
                onClick={() => handleAddSubtask()}
                disabled={!newSubtaskTitle.trim()}
                className="px-3.5 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-200 text-white dark:text-neutral-900 text-xs sm:text-sm font-bold disabled:opacity-40 transition-colors cursor-pointer shrink-0"
              >
                {language === 'id' ? '+ Tambah' : '+ Add'}
              </button>
            </div>
          </div>

          {/* Lampiran */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs sm:text-sm font-bold text-neutral-800 dark:text-neutral-200">
                {t('attachments')}
              </label>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setIsAddingCloudLink(!isAddingCloudLink)}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                    isAddingCloudLink
                      ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border-blue-300 dark:border-blue-800'
                      : 'text-neutral-700 dark:text-neutral-300 border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                  }`}
                >
                  <Cloud className="w-3.5 h-3.5 text-blue-500" />
                  <span>+ {t('embedCloudLink')}</span>
                </button>
              </div>
            </div>

            {/* Cloud Link Input Form */}
            {isAddingCloudLink && (
              <div className="p-3 rounded-xl border border-blue-200 dark:border-blue-900/60 bg-blue-50/30 dark:bg-blue-950/20 space-y-2.5">
                <div className="flex items-center justify-between text-xs font-bold text-blue-800 dark:text-blue-300">
                  <span>{t('embedCloudTitle')}</span>
                  {cloudUrl && (
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-900/80 font-bold">
                      {detectCloudService(cloudUrl).name}
                    </span>
                  )}
                </div>
                <input
                  type="text"
                  value={cloudUrl}
                  onChange={(e) => setCloudUrl(e.target.value)}
                  placeholder={t('cloudUrlPlaceholder')}
                  className="w-full px-3 py-1.5 text-xs sm:text-sm rounded-xl bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:border-blue-500 font-medium"
                />
                <input
                  type="text"
                  value={cloudName}
                  onChange={(e) => setCloudName(e.target.value)}
                  placeholder={t('cloudNamePlaceholder')}
                  className="w-full px-3 py-1.5 text-xs sm:text-sm rounded-xl bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:border-blue-500 font-medium"
                />
                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setIsAddingCloudLink(false);
                      setCloudUrl('');
                      setCloudName('');
                    }}
                    className="px-3 py-1 text-xs font-semibold text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white cursor-pointer"
                  >
                    {t('cancel')}
                  </button>
                  <button
                    type="button"
                    onClick={handleAddCloudLink}
                    disabled={!cloudUrl.trim()}
                    className="px-3.5 py-1 text-xs font-bold rounded-lg bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 cursor-pointer"
                  >
                    {t('embedAction')}
                  </button>
                </div>
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={handleFileChange}
              className="hidden"
              accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.csv,.zip,.rar"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full py-2.5 px-3 border border-dashed border-neutral-300 dark:border-neutral-700 rounded-xl text-xs sm:text-sm font-semibold text-neutral-600 dark:text-neutral-400 hover:text-red-600 hover:border-red-500/50 flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <UploadCloud className="w-4 h-4 text-neutral-500 dark:text-neutral-400" />
              <span>
                {attachments.length > 0
                  ? `+ (${attachments.length})`
                  : t('dropzoneText')}
              </span>
            </button>

            {attachments.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-1.5">
                {attachments.map((att) => (
                  <span
                    key={att.id}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs border ${
                      att.isCloudLink
                        ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800'
                        : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 border-neutral-200 dark:border-neutral-700'
                    }`}
                  >
                    {att.isCloudLink ? (
                      <Cloud className="w-3.5 h-3.5 text-blue-500" />
                    ) : (
                      <Paperclip className="w-3.5 h-3.5 text-neutral-400" />
                    )}
                    <span className="truncate max-w-[140px] font-semibold">{att.name}</span>
                    <span className="text-[10px] opacity-75 font-mono">
                      {att.isCloudLink ? `(${att.cloudProvider || 'Cloud'})` : `(${att.size})`}
                    </span>
                    <button
                      type="button"
                      onClick={() => setAttachments((prev) => prev.filter((a) => a.id !== att.id))}
                      className="text-neutral-400 hover:text-red-500 cursor-pointer ml-0.5"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Form Actions */}
          <div className="pt-3 flex items-center justify-end gap-3 border-t border-neutral-200 dark:border-neutral-800">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 rounded-full text-xs sm:text-sm font-semibold text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
            >
              {t('cancel')}
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-full text-xs sm:text-sm font-bold bg-red-600 hover:bg-red-700 active:scale-95 text-white shadow-md shadow-red-600/30 transition-all flex items-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>{t('saveTaskBtn')}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

