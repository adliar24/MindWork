import React, { useState } from 'react';
import {
  Paperclip,
  Calendar,
  MessageSquare,
  ChevronRight,
  ChevronLeft,
  AlertCircle,
  CheckSquare,
  Link2,
  Sparkles,
  Bug,
  Zap,
  Palette,
  Lightbulb,
  Clock,
  ChevronDown,
  ChevronUp,
  Check,
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

export const KanbanCard: React.FC<KanbanCardProps> = ({
  task,
  assignee,
  onClick,
  onMoveColumn,
  isDragging,
  onDragStart,
  isReadOnly = false,
  onToggleChecklist,
  onToggleComplete,
}) => {
  const { language, t } = useLanguage();
  const [isChecklistExpanded, setIsChecklistExpanded] = useState(false);

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
    return due < now && task.columnId !== 'done' && !task.isCompleted;
  }, [task.dueDate, task.columnId, task.isCompleted]);

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
            ? 'opacity-100 scale-[1.02] border-red-500 ring-2 ring-red-500/30 shadow-2xl z-20 cursor-grabbing bg-white dark:bg-[#242732]'
            : 'hover:border-neutral-400 dark:hover:border-[#464c5e] hover:shadow-md dark:hover:shadow-[0_4px_16px_rgba(0,0,0,0.5)] dark:hover:bg-[#242732]'
        }
        bg-white dark:bg-[#20232c] border-[#d6dae2] dark:border-[#313543] shadow-[0_1px_3px_rgba(0,0,0,0.06)] dark:shadow-[0_2px_8px_rgba(0,0,0,0.4)]`}
    >
      {/* 1. Trello-style Solid Color Header Cover */}
      {task.cardColor && !coverAttachment && (
        <div
          className="w-full h-8 transition-opacity duration-200"
          style={{ backgroundColor: task.cardColor }}
        />
      )}

      {/* 2. Cover / Thumbnail image if exists */}
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
        {/* Top meta: Task Type badge, Priority icon & Tags */}
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

            {/* Trello-like Task Type Badge */}
            {typeBadge && (
              <span
                className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-md border ${typeBadge.style}`}
              >
                <typeBadge.Icon className="w-3 h-3 stroke-[2.2]" />
                <span>{typeBadge.label}</span>
              </span>
            )}

            {/* Tags / Labels */}
            {task.tags.slice(0, 2).map((tag) => (
              <span
                key={tag}
                className="text-[10px] px-2 py-0.5 rounded font-medium bg-[#f0f2f5] dark:bg-[#2a2e3a] text-neutral-700 dark:text-neutral-300 border border-[#dee2e8] dark:border-[#3a3f50]"
              >
                {tag}
              </span>
            ))}
          </div>

          {/* Quick status stepper controls */}
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
        <h3
          className={`text-xs font-semibold leading-snug line-clamp-2 ${
            task.isCompleted || task.columnId === 'done'
              ? 'line-through text-neutral-400 dark:text-neutral-500'
              : 'text-neutral-900 dark:text-white'
          }`}
        >
          {task.title}
        </h3>

        {/* Description snippet */}
        {task.description && (
          <p className="text-[11px] text-neutral-600 dark:text-neutral-300 line-clamp-2 leading-relaxed">
            {task.description}
          </p>
        )}

        {/* 3. Trello-style Expandable Subtask Checklist (Directly Checkable on Card) */}
        {totalChecklistCount > 0 && (
          <div
            onClick={(e) => e.stopPropagation()}
            className="pt-1 space-y-1.5"
          >
            {/* Header / Trigger */}
            <div
              onClick={() => setIsChecklistExpanded(!isChecklistExpanded)}
              className={`flex items-center justify-between text-[11px] p-1.5 px-2 rounded-lg cursor-pointer transition-colors border ${
                checklistPercent === 100
                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                  : 'bg-neutral-100/70 dark:bg-[#1a1c24] text-neutral-600 dark:text-neutral-300 border-neutral-200/60 dark:border-neutral-800'
              }`}
            >
              <div className="flex items-center gap-1.5">
                <CheckSquare className="w-3.5 h-3.5" />
                <span className="font-semibold text-[10px]">
                  Checklist {completedChecklistCount}/{totalChecklistCount}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-[10px] font-mono">{checklistPercent}%</span>
                {isChecklistExpanded ? (
                  <ChevronUp className="w-3 h-3 text-neutral-400" />
                ) : (
                  <ChevronDown className="w-3 h-3 text-neutral-400" />
                )}
              </div>
            </div>

            {/* Progress Bar */}
            <div className="w-full h-1 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  checklistPercent === 100 ? 'bg-emerald-500' : 'bg-red-500'
                }`}
                style={{ width: `${checklistPercent}%` }}
              />
            </div>

            {/* Expanded items list with 1-click checking */}
            {isChecklistExpanded && (
              <div className="space-y-1 pt-1 animate-in fade-in duration-150">
                {(task.checklist || []).map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => onToggleChecklist?.(task.id, item.id)}
                    className="w-full flex items-center gap-2 p-1 px-1.5 rounded-md hover:bg-neutral-100 dark:hover:bg-[#282b37] text-left text-[11px] transition-colors cursor-pointer group/item"
                  >
                    <div
                      className={`w-3.5 h-3.5 rounded flex items-center justify-center shrink-0 border transition-all ${
                        item.completed
                          ? 'bg-emerald-600 border-emerald-600 text-white'
                          : 'border-neutral-300 dark:border-neutral-600 group-hover/item:border-neutral-500'
                      }`}
                    >
                      {item.completed && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                    </div>
                    <span
                      className={`truncate flex-1 ${
                        item.completed
                          ? 'line-through text-neutral-400 dark:text-neutral-500'
                          : 'text-neutral-800 dark:text-neutral-200'
                      }`}
                    >
                      {item.title}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Card Footer: Metadata (Due date with checkbox, Estimate, Attachments, Comments) + Assignee */}
        <div className="pt-2 border-t border-neutral-100 dark:border-[#2b2f3d] flex items-center justify-between gap-2">
          {/* Left indicators */}
          <div className="flex items-center gap-2.5 text-[11px] text-neutral-500 dark:text-neutral-400 tabular-nums flex-wrap">
            {/* Trello-like Due Date with Interactive Completion Toggle */}
            {task.dueDate && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleComplete?.(task.id);
                }}
                title={
                  task.isCompleted || task.columnId === 'done'
                    ? 'Selesai! Klik untuk batalkan'
                    : 'Klik untuk menandai selesai'
                }
                className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border text-[10px] font-semibold transition-all cursor-pointer ${
                  task.isCompleted || task.columnId === 'done'
                    ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/25'
                    : isOverdue
                    ? 'bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30 hover:bg-red-500/25'
                    : isDueSoon
                    ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30 hover:bg-amber-500/25'
                    : 'bg-neutral-100 dark:bg-[#282b37] text-neutral-600 dark:text-neutral-300 border-neutral-200 dark:border-neutral-700 hover:bg-neutral-200 dark:hover:bg-[#323645]'
                }`}
              >
                <div
                  className={`w-3 h-3 rounded flex items-center justify-center border transition-all ${
                    task.isCompleted || task.columnId === 'done'
                      ? 'bg-emerald-600 border-emerald-600 text-white'
                      : 'border-neutral-400'
                  }`}
                >
                  {(task.isCompleted || task.columnId === 'done') && (
                    <Check className="w-2 h-2 stroke-[3]" />
                  )}
                </div>
                <Calendar className="w-3 h-3" />
                <span>{formatDateLocale(task.dueDate, language)}</span>
              </button>
            )}

            {/* Time Estimate Badge */}
            {task.estimate && (
              <span
                className="inline-flex items-center gap-1 text-[10px] font-medium text-neutral-500 dark:text-neutral-400 px-1.5 py-0.5 rounded bg-neutral-100 dark:bg-[#2a2e3a] border border-neutral-200/60 dark:border-neutral-700/60"
                title={`Estimasi: ${task.estimate}`}
              >
                <Clock className="w-3 h-3 text-neutral-400" />
                <span>{task.estimate}</span>
              </span>
            )}

            {/* Attachment indicator */}
            {attachmentCount > 0 && (
              <span
                className="flex items-center gap-1 text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200 transition-colors"
                title={`${attachmentCount} berkas`}
              >
                <Paperclip className="w-3 h-3" />
                <span>{attachmentCount}</span>
              </span>
            )}

            {/* External Links indicator */}
            {linkCount > 0 && (
              <span
                className="flex items-center gap-1 text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200 transition-colors"
                title={`${linkCount} tautan hasil`}
              >
                <Link2 className="w-3 h-3" />
                <span>{linkCount}</span>
              </span>
            )}

            {/* Comments indicator */}
            {commentCount > 0 && (
              <span
                className="flex items-center gap-1 text-neutral-500 dark:text-neutral-400"
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
              className="w-6 h-6 text-[10px] shadow-xs shrink-0"
              title={`Ditugaskan kepada: ${assignee.name}`}
            />
          )}
        </div>
      </div>
    </div>
  );
};
