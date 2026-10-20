import React, { useState } from 'react';
import {
  Paperclip,
  Calendar,
  MessageSquare,
  AlertCircle,
  CheckSquare,
  Link2,
  Sparkles,
  Bug,
  Zap,
  Palette,
  Lightbulb,
  Clock,
  CheckCircle2,
  Circle,
  ExternalLink as ExternalLinkIcon,
  Headphones,
  FileText,
  FileSpreadsheet,
  Archive,
  Bookmark,
  FolderGit2,
  ZoomIn,
  ChevronDown,
} from 'lucide-react';
import { Task, User, ColumnId, TaskType } from '../types';
import {
  formatDateLocale,
  detectCloudService,
  isImageAttachment,
  isAudioAttachment,
  triggerDownload,
  getItemAttachments,
  getItemLinks,
} from '../utils/fileHelpers';
import { UserAvatar } from './UserAvatar';
import { useLanguage } from '../context/LanguageContext';
import { SplitPillBadge } from './SplitPillBadge';

interface KanbanCardProps {
  task: Task;
  assignee?: User;
  onClick: () => void;
  onMoveColumn?: (taskId: string, targetColumn: ColumnId) => void;
  isDragging?: boolean;
  onDragStart?: (e: React.DragEvent, taskId: string) => void;
  isReadOnly?: boolean;
  onToggleChecklist?: (taskId: string, itemId: string) => void;
  onToggleComplete?: (taskId: string) => void;
  onImageClick?: (url: string, title: string) => void;
}

export const KanbanCard: React.FC<KanbanCardProps> = React.memo(({
  task,
  assignee,
  onClick,
  isDragging,
  onDragStart,
  isReadOnly = false,
  onToggleChecklist,
  onToggleComplete,
  onImageClick,
}) => {
  const { language } = useLanguage();
  const [isChecklistExpanded, setIsChecklistExpanded] = useState(false);

  // Find cover image attachment if any
  const coverAttachment = task.attachments.find(
    (att) => isImageAttachment(att) && att.url
  );

  // Non-image attachments (documents, zip, pdf, sheets, audio, etc.)
  const nonImageAttachments = React.useMemo(() => {
    return task.attachments.filter((att) => !isImageAttachment(att));
  }, [task.attachments]);

  const isNonTask =
    task.taskType === 'concept' ||
    task.taskType === 'asset' ||
    task.taskType === 'note';

  const attachmentCount = task.attachments.length;
  const commentCount = task.comments.length;
  const linkCount = (task.externalLinks || []).length;

  const totalChecklistCount = (task.checklist || []).length;
  const completedChecklistCount = (task.checklist || []).filter((item) => item.completed).length;
  const checklistPercent =
    totalChecklistCount > 0
      ? Math.round((completedChecklistCount / totalChecklistCount) * 100)
      : 0;

  // Due date status calculation
  const isOverdue = React.useMemo(() => {
    if (!task.dueDate) return false;
    const due = new Date(task.dueDate).getTime();
    const now = new Date().setHours(0, 0, 0, 0);
    return due < now && task.columnId !== 'done' && !task.isCompleted;
  }, [task.dueDate, task.columnId, task.isCompleted]);

  const isDueSoon = React.useMemo(() => {
    if (!task.dueDate) return false;
    const due = new Date(task.dueDate).getTime();
    const now = new Date().setHours(0, 0, 0, 0);
    const diffDays = (due - now) / (1000 * 3600 * 24);
    return diffDays >= 0 && diffDays <= 3 && task.columnId !== 'done' && !task.isCompleted;
  }, [task.dueDate, task.columnId, task.isCompleted]);

  // Task Type Badge details
  const getTaskTypeBadge = (type?: TaskType) => {
    switch (type) {
      case 'concept':
        return {
          label: language === 'id' ? 'Ide / Konsep' : 'Idea & Concept',
          Icon: Lightbulb,
          style: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/25',
        };
      case 'asset':
        return {
          label: language === 'id' ? 'Aset & Media' : 'Asset & Media',
          Icon: FolderGit2,
          style: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/25',
        };
      case 'note':
        return {
          label: language === 'id' ? 'Catatan' : 'Note',
          Icon: Bookmark,
          style: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/25',
        };
      case 'feature':
        return {
          label: language === 'id' ? 'Fitur' : 'Feature',
          Icon: Sparkles,
          style: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
        };
      case 'bug':
        return {
          label: 'Bug',
          Icon: Bug,
          style: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
        };
      case 'improvement':
        return {
          label: language === 'id' ? 'Peningkatan' : 'Improvement',
          Icon: Zap,
          style: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
        };
      case 'design':
        return {
          label: language === 'id' ? 'Desain' : 'Design',
          Icon: Palette,
          style: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20',
        };
      case 'research':
        return {
          label: language === 'id' ? 'Riset' : 'Research',
          Icon: Lightbulb,
          style: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20',
        };
      default:
        return null;
    }
  };

  const typeBadge = getTaskTypeBadge(task.taskType);

  return (
    <div
      draggable={!isReadOnly}
      onDragStart={(e) => !isReadOnly && onDragStart && onDragStart(e, task.id)}
      onClick={onClick}
      className={`group relative rounded-[22px] border kanban-card-item ${
        isReadOnly ? 'cursor-pointer' : 'cursor-grab active:cursor-grabbing'
      } select-none overflow-hidden transition-all duration-200
        ${
          isDragging
            ? 'opacity-100 border-2 border-dashed border-red-500/70 bg-red-500/10 dark:bg-red-950/30 shadow-none'
            : 'hover:border-neutral-300 dark:hover:border-[#383c4e] hover:shadow-md dark:hover:bg-[#1a1c27]'
        }
        bg-white dark:bg-[#161822] border-neutral-200/90 dark:border-[#262937] shadow-xs`}
    >
      {/* 1. Subtle Color Header Strip */}
      {task.cardColor && !coverAttachment && (
        <div
          className="w-full h-1.5 transition-opacity duration-200"
          style={{ backgroundColor: task.cardColor }}
        />
      )}

      {/* 2. Cover / Thumbnail image if exists */}
      {coverAttachment && coverAttachment.url && (
        <div
          onClick={(e) => {
            e.stopPropagation();
            if (onImageClick) {
              onImageClick(coverAttachment.url!, coverAttachment.name || task.title);
            }
          }}
          title={language === 'id' ? 'Klik untuk melihat & unduh gambar penuh' : 'Click to view & download full image'}
          className="group/img relative w-full h-32 sm:h-36 bg-neutral-100 dark:bg-[#12141a] overflow-hidden border-b border-neutral-200/80 dark:border-[#262937] cursor-pointer"
        >
          <img
            src={coverAttachment.url}
            alt={coverAttachment.name}
            loading="lazy"
            decoding="async"
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover transition-transform duration-300 group-hover/img:scale-105"
          />
          <div className="absolute inset-0 bg-black/0 group-hover/img:bg-black/30 transition-all flex items-center justify-center opacity-0 group-hover/img:opacity-100">
            <span className="bg-black/75 text-white text-[10px] font-semibold px-2.5 py-1 rounded-full shadow-md backdrop-blur-xs flex items-center gap-1.5">
              <ZoomIn className="w-3.5 h-3.5" />
              <span>{language === 'id' ? 'Lihat Penuh' : 'View Full'}</span>
            </span>
          </div>
        </div>
      )}

      {/* Card Body */}
      <div className="p-2.5 sm:p-3.5 space-y-1.5 sm:space-y-2">
        {/* Top row: Priority & Type badge & Tags (Ultra-clean on mobile) */}
        <div className="flex items-center justify-between gap-1.5">
          <div className="flex items-center gap-1.5 flex-wrap">
            {/* Priority Indicator */}
            {task.priority === 'Tinggi' ? (
              <>
                {/* Mobile: Minimal crisp red dot */}
                <span
                  title="Prioritas: Tinggi"
                  className="sm:hidden w-2 h-2 rounded-full bg-red-500 ring-2 ring-red-500/30 shrink-0"
                />
                {/* Desktop: Compact text badge */}
                <span
                  title="Prioritas: Tinggi"
                  className="hidden sm:flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-red-500/15 text-red-600 dark:text-red-400 border border-red-500/25"
                >
                  <AlertCircle className="w-3 h-3 stroke-[2.2]" />
                  <span>Tinggi</span>
                </span>
              </>
            ) : task.priority === 'Sedang' ? (
              <span
                title="Prioritas: Sedang"
                className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0"
              />
            ) : (
              <span
                title="Prioritas: Rendah"
                className="w-2.5 h-2.5 rounded-full bg-neutral-300 dark:bg-neutral-600 shrink-0"
              />
            )}

            {/* Task Type Badge */}
            {typeBadge && (
              <>
                {/* Mobile: Subtle icon only */}
                <span
                  title={typeBadge.label}
                  className="sm:hidden text-neutral-500 dark:text-neutral-400 shrink-0"
                >
                  <typeBadge.Icon className="w-3.5 h-3.5 stroke-[2.2]" />
                </span>
                {/* Desktop: Full styled badge */}
                <span
                  className={`hidden sm:inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${typeBadge.style}`}
                >
                  <typeBadge.Icon className="w-3.5 h-3.5 stroke-[2.2]" />
                  <span>{typeBadge.label}</span>
                </span>
              </>
            )}

            {/* Tags (Desktop only - hidden on mobile to eliminate clutter) */}
            {task.tags.slice(0, 2).map((tag) => (
              <span
                key={tag}
                className="hidden sm:inline-flex text-[10px] px-2.5 py-0.5 rounded-full font-bold bg-neutral-100 dark:bg-[#202330] text-neutral-800 dark:text-neutral-200 border border-neutral-300 dark:border-[#2f3346]"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>

        {/* Card Title (Clearer, larger, high-contrast) */}
        <div>
          <h3 className="text-sm sm:text-[15px] font-bold leading-snug line-clamp-2 text-neutral-950 dark:text-neutral-50 tracking-tight">
            {task.title}
          </h3>
        </div>

        {/* Description excerpt (Clearer, high-contrast) */}
        {task.description && (
          <p className="hidden sm:block text-xs sm:text-[13px] text-neutral-600 dark:text-neutral-300 line-clamp-1 leading-normal font-normal">
            {task.description}
          </p>
        )}

        {/* Split-Pill Chips for Links, Documents, Zip, and Non-image Files (Ref Match) */}
        {((task.externalLinks && task.externalLinks.length > 0) || nonImageAttachments.length > 0) && (
          <div className="flex flex-wrap gap-1.5 pt-0.5">
            {/* 1. External & Cloud Links (Split-Pill: [ Icon | Title ]) */}
            {(task.externalLinks || []).slice(0, 2).map((link) => (
              <SplitPillBadge key={link.id} link={link} size="sm" />
            ))}

            {/* 2. Uploaded Non-Image Files (Documents, Zip, Spreadsheets, Audio, etc.) */}
            {nonImageAttachments.slice(0, 2).map((file) => (
              <SplitPillBadge key={file.id} attachment={file} size="sm" />
            ))}

            {/* Overflow Count */}
            {((task.externalLinks?.length || 0) + nonImageAttachments.length > 4) && (
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-neutral-200 dark:bg-[#202330] text-neutral-700 dark:text-neutral-300 self-center">
                +{((task.externalLinks?.length || 0) + nonImageAttachments.length) - 4}
              </span>
            )}
          </div>
        )}

        {/* Expandable Checklist / Subtasks Section */}
        {isChecklistExpanded && totalChecklistCount > 0 && (
          <div
            onClick={(e) => e.stopPropagation()}
            className="pt-2 pb-1 space-y-2 border-t border-dashed border-neutral-200 dark:border-[#2a2e40] animate-in fade-in slide-in-from-top-1 duration-150"
          >
            <div className="flex items-center justify-between text-[11px] font-bold text-neutral-600 dark:text-neutral-400">
              <span className="flex items-center gap-1.5">
                <CheckSquare className="w-3.5 h-3.5 text-red-500" />
                <span>{language === 'id' ? 'Sub-tugas' : 'Subtasks'}</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-neutral-200 dark:bg-[#202330] font-mono text-neutral-700 dark:text-neutral-300">
                  {completedChecklistCount}/{totalChecklistCount}
                </span>
              </span>
              <span className="font-mono text-[10px] font-bold text-neutral-500 dark:text-neutral-400">
                {checklistPercent}%
              </span>
            </div>

            {/* Micro Progress Bar */}
            <div className="w-full h-1.5 bg-neutral-200 dark:bg-[#1f2230] rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  checklistPercent === 100 ? 'bg-emerald-500' : 'bg-red-500'
                }`}
                style={{ width: `${checklistPercent}%` }}
              />
            </div>

            {/* Checklist Items List */}
            <div className="space-y-1.5 max-h-56 overflow-y-auto pr-0.5">
              {(task.checklist || []).map((item) => {
                const itemAtts = getItemAttachments(item);
                const itemLinks = getItemLinks(item);
                const hasMedia = itemAtts.length > 0 || itemLinks.length > 0;

                return (
                  <div
                    key={item.id}
                    className={`p-2 rounded-2xl border transition-all ${
                      item.completed
                        ? 'border-emerald-500/30 bg-emerald-500/5 dark:bg-emerald-500/10'
                        : 'border-neutral-200/90 dark:border-[#272b3b] bg-neutral-50/70 dark:bg-[#171924] hover:border-neutral-300 dark:hover:border-[#383d54]'
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleChecklist?.(task.id, item.id);
                        }}
                        className="mt-0.5 shrink-0 text-neutral-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors cursor-pointer"
                        title={item.completed ? 'Batal selesai' : 'Tandai selesai'}
                      >
                        {item.completed ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 fill-emerald-100 dark:fill-emerald-950/40" />
                        ) : (
                          <Circle className="w-4 h-4 text-neutral-400 dark:text-neutral-500" />
                        )}
                      </button>
                      <div className="flex-1 min-w-0">
                        <p
                          onClick={(e) => {
                            e.stopPropagation();
                            onToggleChecklist?.(task.id, item.id);
                          }}
                          className={`text-xs select-none cursor-pointer leading-snug break-words ${
                            item.completed
                              ? 'line-through text-neutral-400 dark:text-neutral-500'
                              : 'text-neutral-900 dark:text-neutral-100 font-medium'
                          }`}
                        >
                          {item.title}
                        </p>

                        {/* Attached Files & Links for this Checkbox (Split-Pill Badge!) */}
                        {hasMedia && (
                          <div className="flex flex-wrap gap-1.5 pt-1.5">
                            {itemLinks.map((link) => (
                              <SplitPillBadge
                                key={link.id}
                                link={link}
                                size="xs"
                                maxTitleWidth="max-w-[130px] sm:max-w-[170px]"
                              />
                            ))}
                            {itemAtts.map((att) => (
                              <SplitPillBadge
                                key={att.id}
                                attachment={att}
                                size="xs"
                                maxTitleWidth="max-w-[120px] sm:max-w-[160px]"
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Card Footer: Metadata Indicators (Date, Checklist count, Attachments, Comments) + Assignee */}
        <div className="pt-2 sm:pt-2.5 border-t border-neutral-100 dark:border-[#232635] flex items-center justify-between gap-1.5 text-xs">
          {/* Left indicators */}
          <div className="flex items-center gap-2 text-neutral-600 dark:text-neutral-300 tabular-nums flex-wrap">
            {/* Due Date Indicator */}
            {task.dueDate && (
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] sm:text-xs font-bold border ${
                  task.isCompleted || task.columnId === 'done'
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                    : isOverdue
                    ? 'bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30 font-bold'
                    : isDueSoon
                    ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30'
                    : 'bg-neutral-100 dark:bg-[#202330] text-neutral-700 dark:text-neutral-200 border-neutral-200/80 dark:border-neutral-700/60'
                }`}
                title={`Jatuh tempo: ${formatDateLocale(task.dueDate, language)}`}
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>{formatDateLocale(task.dueDate, language)}</span>
              </span>
            )}

            {/* Checklist Count Pill - Interactive Toggle */}
            {totalChecklistCount > 0 && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsChecklistExpanded((prev) => !prev);
                }}
                className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] sm:text-xs font-bold border transition-all cursor-pointer ${
                  isChecklistExpanded
                    ? 'ring-2 ring-red-500/40 bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/40'
                    : checklistPercent === 100
                    ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/25'
                    : 'bg-neutral-100 dark:bg-[#202330] text-neutral-800 dark:text-neutral-200 border-neutral-300 dark:border-neutral-700 hover:border-neutral-400 dark:hover:border-neutral-500'
                }`}
                title={`Sub-tugas: ${completedChecklistCount}/${totalChecklistCount} • Klik untuk ${
                  isChecklistExpanded ? 'tutup' : 'buka & centang sub-tugas'
                }`}
              >
                <CheckSquare className="w-3.5 h-3.5" />
                <span>{completedChecklistCount}/{totalChecklistCount}</span>
                <ChevronDown
                  className={`w-3 h-3 text-neutral-500 transition-transform duration-200 ${
                    isChecklistExpanded ? 'rotate-180' : ''
                  }`}
                />
              </button>
            )}

            {/* Time Estimate (Desktop only) */}
            {task.estimate && (
              <span
                className="hidden sm:inline-flex items-center gap-1.5 text-[11px] sm:text-xs font-semibold text-neutral-600 dark:text-neutral-300 px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-[#202330] border border-neutral-200/80 dark:border-neutral-700/60"
                title={`Estimasi: ${task.estimate}`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>{task.estimate}</span>
              </span>
            )}

            {/* Attachment indicator */}
            {attachmentCount > 0 && (
              <span
                className="flex items-center gap-1 text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white transition-colors font-medium text-xs"
                title={`${attachmentCount} berkas`}
              >
                <Paperclip className="w-3.5 h-3.5" />
                <span>{attachmentCount}</span>
              </span>
            )}

            {/* External Links indicator (Desktop only) */}
            {linkCount > 0 && (
              <span
                className="hidden sm:inline-flex items-center gap-1 text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white transition-colors font-medium text-xs"
                title={`${linkCount} tautan`}
              >
                <Link2 className="w-3.5 h-3.5" />
                <span>{linkCount}</span>
              </span>
            )}

            {/* Comments indicator */}
            {commentCount > 0 && (
              <span
                className="flex items-center gap-1 text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white transition-colors font-medium text-xs"
                title={`${commentCount} komentar`}
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>{commentCount}</span>
              </span>
            )}
          </div>

          {/* Right: Assignee Avatar */}
          {assignee && (
            <UserAvatar
              avatar={assignee.avatar}
              name={assignee.name}
              color={assignee.color}
              className="w-5 h-5 sm:w-6 sm:h-6 text-[10px] shadow-xs shrink-0"
              title={`Ditugaskan: ${assignee.name}`}
            />
          )}
        </div>
      </div>
    </div>
  );
});
