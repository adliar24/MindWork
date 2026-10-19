import React from 'react';
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
} from 'lucide-react';
import { Task, User, ColumnId, TaskType } from '../types';
import { formatDateLocale } from '../utils/fileHelpers';
import { UserAvatar } from './UserAvatar';
import { useLanguage } from '../context/LanguageContext';

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
}

export const KanbanCard: React.FC<KanbanCardProps> = React.memo(({
  task,
  assignee,
  onClick,
  isDragging,
  onDragStart,
  isReadOnly = false,
  onToggleComplete,
}) => {
  const { language } = useLanguage();

  // Find cover image attachment if any
  const coverAttachment = task.attachments.find(
    (att) => (att.isCover || att.type === 'image') && att.url
  );

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
      className={`group relative rounded-xl border kanban-card-item ${
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
        <div className="relative w-full h-20 sm:h-24 bg-neutral-100 dark:bg-[#12141a] overflow-hidden border-b border-neutral-200/80 dark:border-[#262937]">
          <img
            src={coverAttachment.url}
            alt={coverAttachment.name}
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-102"
          />
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
                  className="hidden sm:flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-500/15 text-red-600 dark:text-red-400 border border-red-500/25"
                >
                  <AlertCircle className="w-3 h-3 stroke-[2.2]" />
                  <span>Tinggi</span>
                </span>
              </>
            ) : task.priority === 'Sedang' ? (
              <span
                title="Prioritas: Sedang"
                className="w-2 h-2 rounded-full bg-amber-500 shrink-0"
              />
            ) : (
              <span
                title="Prioritas: Rendah"
                className="w-2 h-2 rounded-full bg-neutral-300 dark:bg-neutral-600 shrink-0"
              />
            )}

            {/* Task Type Badge */}
            {typeBadge && (
              <>
                {/* Mobile: Subtle icon only */}
                <span
                  title={typeBadge.label}
                  className="sm:hidden text-neutral-400 dark:text-neutral-500 shrink-0"
                >
                  <typeBadge.Icon className="w-3 h-3 stroke-[2.2]" />
                </span>
                {/* Desktop: Full styled badge */}
                <span
                  className={`hidden sm:inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded border ${typeBadge.style}`}
                >
                  <typeBadge.Icon className="w-3 h-3 stroke-[2.2]" />
                  <span>{typeBadge.label}</span>
                </span>
              </>
            )}

            {/* Tags (Desktop only - hidden on mobile to eliminate clutter) */}
            {task.tags.slice(0, 2).map((tag) => (
              <span
                key={tag}
                className="hidden sm:inline-flex text-[9px] px-1.5 py-0.5 rounded font-medium bg-neutral-100 dark:bg-[#202330] text-neutral-600 dark:text-neutral-400 border border-neutral-200/60 dark:border-[#2b2f3e]"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>

        {/* Task Title with Trello-style Check-off button */}
        <div className="flex items-start gap-2">
          {!isReadOnly && onToggleComplete && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onToggleComplete(task.id);
              }}
              title={task.isCompleted ? 'Tandai belum selesai' : 'Tandai selesai'}
              className="mt-0.5 shrink-0 text-neutral-400 hover:text-emerald-500 transition-colors cursor-pointer"
            >
              {task.isCompleted ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              ) : (
                <Circle className="w-4 h-4 text-neutral-400 hover:text-emerald-500" />
              )}
            </button>
          )}
          <h3
            className={`text-xs sm:text-[13px] font-semibold leading-snug line-clamp-2 flex-1 ${
              task.isCompleted
                ? 'line-through text-neutral-400 dark:text-neutral-500'
                : 'text-neutral-900 dark:text-white'
            }`}
          >
            {task.title}
          </h3>
        </div>

        {/* Description excerpt (Desktop only - hidden on mobile for clean scannability) */}
        {task.description && (
          <p className="hidden sm:block text-[11px] text-neutral-500 dark:text-neutral-400 line-clamp-1 leading-normal">
            {task.description}
          </p>
        )}

        {/* Card Footer: Metadata Indicators (Date, Checklist count, Attachments, Comments) + Assignee */}
        <div className="pt-1.5 sm:pt-2 border-t border-neutral-100 dark:border-[#232635] flex items-center justify-between gap-1.5 text-[10px]">
          {/* Left indicators */}
          <div className="flex items-center gap-2 text-neutral-500 dark:text-neutral-400 tabular-nums flex-wrap">
            {/* Due Date Indicator */}
            {task.dueDate && (
              <span
                className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium border ${
                  task.isCompleted || task.columnId === 'done'
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                    : isOverdue
                    ? 'bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30 font-semibold'
                    : isDueSoon
                    ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30'
                    : 'bg-neutral-100 dark:bg-[#202330] text-neutral-600 dark:text-neutral-300 border-neutral-200/80 dark:border-neutral-700/60'
                }`}
                title={`Jatuh tempo: ${formatDateLocale(task.dueDate, language)}`}
              >
                <Calendar className="w-3 h-3" />
                <span>{formatDateLocale(task.dueDate, language)}</span>
              </span>
            )}

            {/* Checklist Count Pill */}
            {totalChecklistCount > 0 && (
              <span
                className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium border ${
                  checklistPercent === 100
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                    : 'bg-neutral-100 dark:bg-[#202330] text-neutral-600 dark:text-neutral-400 border-neutral-200/60 dark:border-neutral-800'
                }`}
                title={`Sub-tugas: ${completedChecklistCount}/${totalChecklistCount} selesai`}
              >
                <CheckSquare className="w-3 h-3" />
                <span>{completedChecklistCount}/{totalChecklistCount}</span>
              </span>
            )}

            {/* Time Estimate (Desktop only) */}
            {task.estimate && (
              <span
                className="hidden sm:inline-flex items-center gap-1 text-[10px] font-medium text-neutral-500 dark:text-neutral-400 px-1 py-0.5 rounded"
                title={`Estimasi: ${task.estimate}`}
              >
                <Clock className="w-3 h-3" />
                <span>{task.estimate}</span>
              </span>
            )}

            {/* Attachment indicator */}
            {attachmentCount > 0 && (
              <span
                className="flex items-center gap-1 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 transition-colors"
                title={`${attachmentCount} berkas`}
              >
                <Paperclip className="w-3 h-3" />
                <span>{attachmentCount}</span>
              </span>
            )}

            {/* External Links indicator (Desktop only) */}
            {linkCount > 0 && (
              <span
                className="hidden sm:inline-flex items-center gap-1 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 transition-colors"
                title={`${linkCount} tautan`}
              >
                <Link2 className="w-3 h-3" />
                <span>{linkCount}</span>
              </span>
            )}

            {/* Comments indicator */}
            {commentCount > 0 && (
              <span
                className="flex items-center gap-1 text-neutral-400"
                title={`${commentCount} komentar`}
              >
                <MessageSquare className="w-3 h-3" />
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
