import React from 'react';
import {
  Paperclip,
  Calendar,
  MessageSquare,
  ChevronRight,
  ChevronLeft,
  Image as ImageIcon,
  AlertCircle,
  CheckSquare,
  Link2,
} from 'lucide-react';
import { Task, User, ColumnId } from '../types';
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
}

export const KanbanCard: React.FC<KanbanCardProps> = ({
  task,
  assignee,
  onClick,
  onMoveColumn,
  isDragging,
  onDragStart,
  isReadOnly = false,
}) => {
  const { language, t } = useLanguage();

  // Find cover image attachment if any
  const coverAttachment = task.attachments.find(
    (att) => (att.isCover || att.type === 'image') && att.url
  );

  const attachmentCount = task.attachments.length;
  const commentCount = task.comments.length;
  const linkCount = (task.externalLinks || []).length;

  const totalChecklistCount = (task.checklist || []).length;
  const completedChecklistCount = (task.checklist || []).filter((item) => item.completed).length;
  const checklistPercent = totalChecklistCount > 0 ? Math.round((completedChecklistCount / totalChecklistCount) * 100) : 0;

  // Due date status
  const isDueSoon = React.useMemo(() => {
    if (!task.dueDate) return false;
    const due = new Date(task.dueDate).getTime();
    const now = new Date('2026-10-15').getTime();
    const diffDays = (due - now) / (1000 * 3600 * 24);
    return diffDays >= 0 && diffDays <= 3;
  }, [task.dueDate]);

  const isOverdue = React.useMemo(() => {
    if (!task.dueDate) return false;
    const due = new Date(task.dueDate).getTime();
    const now = new Date('2026-10-15').getTime();
    return due < now && task.columnId !== 'done';
  }, [task.dueDate, task.columnId]);

  // Next and prev columns for quick movement
  const nextColumnMap: Record<ColumnId, ColumnId | null> = {
    todo: 'in_progress',
    in_progress: 'in_review',
    in_review: 'done',
    done: null,
  };
  const prevColumnMap: Record<ColumnId, ColumnId | null> = {
    todo: null,
    in_progress: 'todo',
    in_review: 'in_progress',
    done: 'in_review',
  };

  const nextCol = nextColumnMap[task.columnId];
  const prevCol = prevColumnMap[task.columnId];

  return (
    <div
      draggable={!isReadOnly}
      onDragStart={(e) => !isReadOnly && onDragStart && onDragStart(e, task.id)}
      onClick={onClick}
      className={`group relative rounded-xl border kanban-card-item ${
        isReadOnly ? 'cursor-pointer' : 'cursor-grab active:cursor-grabbing'
      } select-none overflow-hidden
        ${
          isDragging
            ? 'opacity-40 scale-95 border-red-500 shadow-md'
            : 'hover:border-neutral-400 dark:hover:border-[#464c5e] hover:shadow-md dark:hover:shadow-[0_4px_16px_rgba(0,0,0,0.5)] dark:hover:bg-[#242732]'
        }
        bg-white dark:bg-[#20232c] border-[#d6dae2] dark:border-[#313543] shadow-[0_1px_3px_rgba(0,0,0,0.06)] dark:shadow-[0_2px_8px_rgba(0,0,0,0.4)]`}
    >
      {/* Cover / Thumbnail image if exists */}
      {coverAttachment && coverAttachment.url && (
        <div className="relative w-full h-28 bg-neutral-100 dark:bg-[#181a20] overflow-hidden border-b border-[#d6dae2] dark:border-[#313543]">
          <img
            src={coverAttachment.url}
            alt={coverAttachment.name}
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-102"
          />
        </div>
      )}

      {/* Card Body */}
      <div className="p-3.5 space-y-2.5">
        {/* Top meta: Priority icon & Tags */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 flex-wrap">
            {/* Minimalist Priority Icon */}
            {task.priority === 'Tinggi' ? (
              <span
                title="Prioritas: Tinggi"
                className="flex items-center justify-center w-5 h-5 rounded bg-red-500/15 text-red-600 dark:text-red-400"
              >
                <AlertCircle className="w-3.5 h-3.5 stroke-[2.2]" />
              </span>
            ) : task.priority === 'Sedang' ? (
              <span
                title="Prioritas: Sedang"
                className="flex items-center justify-center w-5 h-5 rounded bg-amber-500/15 text-amber-600 dark:text-amber-400"
              >
                <span className="block w-2.5 h-0.5 bg-amber-500 rounded-full" />
              </span>
            ) : (
              <span
                title="Prioritas: Rendah"
                className="flex items-center justify-center w-5 h-5 rounded bg-neutral-500/15 text-neutral-400"
              >
                <span className="block w-1.5 h-0.5 bg-neutral-400 rounded-full" />
              </span>
            )}

            {task.tags.slice(0, 2).map((tag) => (
              <span
                key={tag}
                className="text-[10px] px-2 py-0.5 rounded font-medium bg-[#f0f2f5] dark:bg-[#2a2e3a] text-neutral-700 dark:text-neutral-300 border border-[#dee2e8] dark:border-[#3a3f50]"
              >
                {tag}
              </span>
            ))}
          </div>

          {/* Quick status stepper controls (always visible on touch/mobile, appear on hover on desktop) */}
          {!isReadOnly && onMoveColumn && (
            <div
              onClick={(e) => e.stopPropagation()}
              className="opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity flex items-center gap-0.5 bg-neutral-100 dark:bg-[#2a2e3a] p-0.5 rounded border border-neutral-200 dark:border-[#3a3f50]"
            >
              {prevCol && (
                <button
                  onClick={() => onMoveColumn(task.id, prevCol)}
                  title="Pindah ke kolom sebelumnya"
                  className="p-1 hover:text-red-600 dark:hover:text-red-400 rounded hover:bg-neutral-200 dark:hover:bg-[#363b4a] cursor-pointer"
                >
                  <ChevronLeft className="w-3 h-3" />
                </button>
              )}
              {nextCol && (
                <button
                  onClick={() => onMoveColumn(task.id, nextCol)}
                  title="Pindah ke kolom selanjutnya"
                  className="p-1 hover:text-red-600 dark:hover:text-red-400 rounded hover:bg-neutral-200 dark:hover:bg-[#363b4a] cursor-pointer"
                >
                  <ChevronRight className="w-3 h-3" />
                </button>
              )}
            </div>
          )}
        </div>

        {/* Task Title */}
        <h3 className="text-xs font-semibold text-neutral-900 dark:text-white leading-snug line-clamp-2">
          {task.title}
        </h3>

        {/* Description snippet */}
        {task.description && (
          <p className="text-[11px] text-neutral-600 dark:text-neutral-300 line-clamp-2 leading-relaxed">
            {task.description}
          </p>
        )}

        {/* Card Footer: Metadata (Checklist, Due date, Attachments, Links, Comments) + Assignee */}
        <div className="pt-2.5 border-t border-neutral-100 dark:border-[#2b2f3d] flex items-center justify-between gap-2">
          {/* Left indicators */}
          <div className="flex items-center gap-3 text-[11px] text-neutral-500 dark:text-neutral-400 tabular-nums">
            {/* Subtask checklist indicator */}
            {totalChecklistCount > 0 && (
              <span
                className={`flex items-center gap-1 ${
                  checklistPercent === 100
                    ? 'text-emerald-600 dark:text-emerald-400 font-medium'
                    : 'text-neutral-500 dark:text-neutral-400'
                }`}
                title={`Subtask: ${completedChecklistCount}/${totalChecklistCount} (${checklistPercent}%)`}
              >
                <CheckSquare className="w-3.5 h-3.5" />
                <span>{completedChecklistCount}/{totalChecklistCount}</span>
              </span>
            )}

            {/* Attachment indicator */}
            {attachmentCount > 0 && (
              <span
                className="flex items-center gap-1 text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200 transition-colors"
                title={`${attachmentCount} berkas`}
              >
                <Paperclip className="w-3.5 h-3.5" />
                <span>{attachmentCount}</span>
              </span>
            )}

            {/* External Links indicator */}
            {linkCount > 0 && (
              <span
                className="flex items-center gap-1 text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200 transition-colors"
                title={`${linkCount} tautan hasil`}
              >
                <Link2 className="w-3.5 h-3.5" />
                <span>{linkCount}</span>
              </span>
            )}

            {/* Comments indicator */}
            {commentCount > 0 && (
              <span className="flex items-center gap-1 text-neutral-500 dark:text-neutral-400" title={`${commentCount} komentar`}>
                <MessageSquare className="w-3.5 h-3.5" />
                <span>{commentCount}</span>
              </span>
            )}

            {/* Due date */}
            {task.dueDate && (
              <span
                className={`flex items-center gap-1 ${
                  isOverdue
                    ? 'text-red-600 dark:text-red-400 font-semibold'
                    : isDueSoon
                    ? 'text-amber-600 dark:text-amber-400 font-medium'
                    : 'text-neutral-500 dark:text-neutral-400'
                }`}
                title={`${t('dueDateLabel')}: ${formatDateLocale(task.dueDate, language)}`}
              >
                <Calendar className="w-3.5 h-3.5" />
                <span className="text-[10px]">{formatDateLocale(task.dueDate, language)}</span>
              </span>
            )}
          </div>

          {/* Right: Assignee Avatar */}
          {assignee && (
            <UserAvatar
              avatar={assignee.avatar}
              name={assignee.name}
              color={assignee.color}
              className="w-6 h-6 text-[10px] shadow-xs"
              title={`Ditugaskan kepada: ${assignee.name}`}
            />
          )}
        </div>
      </div>
    </div>
  );
};
