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
} from 'lucide-react';
import { Column, ColumnId, Priority, Task, TaskType, User, Attachment } from '../types';
import { formatFileSize, getFileTypeFromExtension, compressImageFile, detectCloudService } from '../utils/fileHelpers';
import { useLanguage } from '../context/LanguageContext';

interface NewTaskModalProps {
  columns: Column[];
  users: User[];
  defaultColumnId?: ColumnId;
  projectId: string;
  onClose: () => void;
  onCreateTask: (task: Task) => void;
}

export const NewTaskModal: React.FC<NewTaskModalProps> = ({
  columns,
  users,
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
  const [assigneeId, setAssigneeId] = useState<string>(users[0]?.id || '');
  const [dueDate, setDueDate] = useState<string>(
    new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString().split('T')[0]
  );
  const [tagsInput, setTagsInput] = useState('Desain, Sprint-1');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const [isClosing, setIsClosing] = useState(false);

  const handleClose = () => {
    if (isClosing) return;
    setIsClosing(true);
    setTimeout(() => {
      onClose();
    }, 180);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const tags = tagsInput
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

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
      dueDate,
      tags,
      attachments,
      comments: [],
      activities: [
        {
          id: `act-${Date.now()}`,
          authorId: assigneeId,
          action: 'membuat tugas baru ini',
          timestamp: 'Baru saja',
        },
      ],
      checklist: [],
      externalLinks: [],
      createdAt: 'Baru saja',
    };

    onCreateTask(newTask);
    handleClose();
  };

  return (
    <div
      onClick={handleClose}
      className={`fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-sm overflow-y-auto cursor-pointer ${
        isClosing ? 'animate-backdrop-out' : 'animate-in fade-in'
      }`}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`w-full max-w-lg max-h-[92vh] flex flex-col rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-2xl overflow-hidden text-neutral-900 dark:text-neutral-100 cursor-default ${
          isClosing ? 'animate-modal-out' : 'animate-modal-in'
        }`}
      >
        {/* Trello-like Top Color Banner */}
        {cardColor && (
          <div className="w-full h-2.5 shrink-0 transition-all duration-300" style={{ backgroundColor: cardColor }} />
        )}

        {/* Header */}
        <div className="p-4 px-5 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-red-600 text-white flex items-center justify-center font-bold">
              <Plus className="w-4 h-4 stroke-[2.5]" />
            </div>
            <h3 className="text-sm font-bold text-neutral-900 dark:text-white">
              {t('newTaskModalTitle')}
            </h3>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 text-neutral-400 hover:text-neutral-900 dark:hover:text-white rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1">
          {/* Judul Tugas */}
          <div>
            <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
              {t('titleLabel')} <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t('titlePlaceholder')}
              className="w-full h-9 px-3 text-xs rounded-lg bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 focus:outline-none focus:border-red-500 text-neutral-900 dark:text-white transition-colors"
            />
          </div>

          {/* Deskripsi */}
          <div>
            <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
              {t('descLabel')}
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t('descPlaceholder')}
              className="w-full p-2.5 text-xs rounded-lg bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 focus:outline-none focus:border-red-500 text-neutral-900 dark:text-white resize-none transition-colors"
            />
          </div>

          {/* Status & Prioritas */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                {t('statusLabel')}
              </label>
              <select
                value={columnId}
                onChange={(e) => setColumnId(e.target.value as ColumnId)}
                className="w-full h-9 px-2.5 rounded-lg bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 focus:outline-none focus:border-red-500 text-neutral-900 dark:text-white"
              >
                {columns.map((col) => (
                  <option key={col.id} value={col.id}>
                    {getColumnTitle(col.id, col.title)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                {t('priorityLabel')}
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as Priority)}
                className="w-full h-9 px-2.5 rounded-lg bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 focus:outline-none focus:border-red-500 text-neutral-900 dark:text-white"
              >
                <option value="Tinggi">{t('priorityHigh')}</option>
                <option value="Sedang">{t('priorityMedium')}</option>
                <option value="Rendah">{t('priorityLow')}</option>
              </select>
            </div>
          </div>

          {/* Jenis Tugas & Estimasi Waktu (Trello style) */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                {language === 'id' ? 'Jenis Tugas' : 'Task Type'}
              </label>
              <select
                value={taskType}
                onChange={(e) => setTaskType(e.target.value as TaskType)}
                className="w-full h-9 px-2.5 rounded-lg bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 focus:outline-none focus:border-red-500 text-neutral-900 dark:text-white"
              >
                <option value="task">{language === 'id' ? '📋 Tugas Umum' : '📋 General Task'}</option>
                <option value="feature">{language === 'id' ? '✨ Fitur Baru' : '✨ Feature'}</option>
                <option value="bug">🐛 Bug / Issue</option>
                <option value="improvement">{language === 'id' ? '⚡ Peningkatan' : '⚡ Improvement'}</option>
                <option value="design">{language === 'id' ? '🎨 Desain / UI-UX' : '🎨 Design'}</option>
                <option value="research">{language === 'id' ? '💡 Riset' : '💡 Research'}</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                {language === 'id' ? 'Estimasi Waktu' : 'Time Estimate'}
              </label>
              <div className="relative">
                <Clock className="w-3.5 h-3.5 text-neutral-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={estimate}
                  onChange={(e) => setEstimate(e.target.value)}
                  placeholder={language === 'id' ? 'misal: 2 hari, 4 jam' : 'e.g. 2d, 4h'}
                  className="w-full h-9 pl-8 pr-2.5 rounded-lg bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 focus:outline-none focus:border-red-500 text-neutral-900 dark:text-white text-xs placeholder:text-neutral-400"
                />
              </div>
            </div>
          </div>

          {/* Warna Sampul Kartu (Trello Card Color) */}
          <div>
            <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
              {language === 'id' ? 'Warna Sampul Kartu (Opsional)' : 'Card Cover Color (Optional)'}
            </label>
            <div className="grid grid-cols-5 sm:grid-cols-9 gap-1.5 p-2 rounded-lg bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700">
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
                  className={`h-6 rounded-md ${c.bg} transition-all flex items-center justify-center cursor-pointer hover:scale-105 active:scale-95 ${
                    cardColor === c.value ? 'ring-2 ring-red-500 ring-offset-1 dark:ring-offset-neutral-900' : 'opacity-80 hover:opacity-100'
                  }`}
                >
                  {cardColor === c.value && (
                    <Check className="w-3.5 h-3.5 text-white stroke-[3] drop-shadow" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Assignee & Tenggat */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                {t('assigneeLabel')}
              </label>
              <select
                value={assigneeId}
                onChange={(e) => setAssigneeId(e.target.value)}
                className="w-full h-9 px-2.5 rounded-lg bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 focus:outline-none focus:border-red-500 text-neutral-900 dark:text-white truncate"
              >
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                {t('dueDateLabel')}
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full h-9 px-2.5 rounded-lg bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 focus:outline-none focus:border-red-500 text-neutral-900 dark:text-white"
              />
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
              {t('tagsLabel')}
            </label>
            <input
              type="text"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder={t('tagsPlaceholder')}
              className="w-full h-9 px-3 text-xs rounded-lg bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 focus:outline-none focus:border-red-500 text-neutral-900 dark:text-white"
            />
          </div>

          {/* Lampiran */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                {t('attachments')}
              </label>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setIsAddingCloudLink(!isAddingCloudLink)}
                  className={`inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium rounded-md border transition-all cursor-pointer ${
                    isAddingCloudLink
                      ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border-blue-300 dark:border-blue-800'
                      : 'text-neutral-600 dark:text-neutral-300 border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                  }`}
                >
                  <Cloud className="w-3 h-3 text-blue-500" />
                  <span>+ {t('embedCloudLink')}</span>
                </button>
              </div>
            </div>

            {/* Cloud Link Input Form */}
            {isAddingCloudLink && (
              <div className="p-2.5 rounded-lg border border-blue-200 dark:border-blue-900/60 bg-blue-50/30 dark:bg-blue-950/20 space-y-2">
                <div className="flex items-center justify-between text-[11px] font-medium text-blue-800 dark:text-blue-300">
                  <span>{t('embedCloudTitle')}</span>
                  {cloudUrl && (
                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-blue-100 dark:bg-blue-900/80">
                      {detectCloudService(cloudUrl).name}
                    </span>
                  )}
                </div>
                <input
                  type="text"
                  value={cloudUrl}
                  onChange={(e) => setCloudUrl(e.target.value)}
                  placeholder={t('cloudUrlPlaceholder')}
                  className="w-full px-2.5 py-1 text-xs rounded bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:border-blue-500"
                />
                <input
                  type="text"
                  value={cloudName}
                  onChange={(e) => setCloudName(e.target.value)}
                  placeholder={t('cloudNamePlaceholder')}
                  className="w-full px-2.5 py-1 text-xs rounded bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:border-blue-500"
                />
                <div className="flex items-center justify-end gap-1.5 pt-0.5">
                  <button
                    type="button"
                    onClick={() => {
                      setIsAddingCloudLink(false);
                      setCloudUrl('');
                      setCloudName('');
                    }}
                    className="px-2 py-0.5 text-[11px] text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 cursor-pointer"
                  >
                    {t('cancel')}
                  </button>
                  <button
                    type="button"
                    onClick={handleAddCloudLink}
                    disabled={!cloudUrl.trim()}
                    className="px-2.5 py-0.5 text-[11px] font-medium rounded bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 cursor-pointer"
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
              className="w-full py-2 px-3 border border-dashed border-neutral-300 dark:border-neutral-700 rounded-lg text-xs text-neutral-500 hover:text-red-600 hover:border-red-500/50 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
            >
              <UploadCloud className="w-4 h-4 text-neutral-400" />
              <span>
                {attachments.length > 0
                  ? `+ (${attachments.length})`
                  : t('dropzoneText')}
              </span>
            </button>

            {attachments.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1.5">
                {attachments.map((att) => (
                  <span
                    key={att.id}
                    className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] border ${
                      att.isCloudLink
                        ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800'
                        : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border-neutral-200 dark:border-neutral-700'
                    }`}
                  >
                    {att.isCloudLink ? (
                      <Cloud className="w-3 h-3 text-blue-500" />
                    ) : (
                      <Paperclip className="w-3 h-3 text-neutral-400" />
                    )}
                    <span className="truncate max-w-[140px] font-medium">{att.name}</span>
                    <span className="text-[9px] opacity-75 font-mono">
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
          <div className="pt-2 flex items-center justify-end gap-2 border-t border-neutral-200 dark:border-neutral-800">
            <button
              type="button"
              onClick={handleClose}
              className="px-3.5 py-1.5 rounded-lg text-xs font-medium text-neutral-500 hover:text-neutral-800 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
            >
              {t('cancel')}
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-red-600 hover:bg-red-700 text-white shadow-xs shadow-red-600/30 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>{t('saveTaskBtn')}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

