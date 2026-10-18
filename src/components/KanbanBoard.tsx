import React, { useState } from 'react';
import { Plus, MoreHorizontal, Eye } from 'lucide-react';
import { Column, ColumnId, ProjectRole, Task, User } from '../types';
import { KanbanCard } from './KanbanCard';
import { useLanguage } from '../context/LanguageContext';

interface KanbanBoardProps {
  columns: Column[];
  tasks: Task[];
  users: User[];
  currentUserRole?: ProjectRole;
  onTaskClick: (task: Task) => void;
  onMoveTask: (taskId: string, targetColumn: ColumnId) => void;
  onQuickAddTask: (columnId: ColumnId) => void;
}

export const KanbanBoard: React.FC<KanbanBoardProps> = ({
  columns,
  tasks,
  users,
  currentUserRole = 'member',
  onTaskClick,
  onMoveTask,
  onQuickAddTask,
}) => {
  const { language, t } = useLanguage();
  const isViewer = currentUserRole === 'viewer';
  const [draggingTaskId, setDraggingTaskId] = useState<string | null>(null);
  const [dragOverColumnId, setDragOverColumnId] = useState<ColumnId | null>(null);

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

  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    if (isViewer) return;
    e.dataTransfer.setData('text/plain', taskId);
    e.dataTransfer.effectAllowed = 'move';
    setDraggingTaskId(taskId);
  };

  const handleDragOver = (e: React.DragEvent, columnId: ColumnId) => {
    if (isViewer) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
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

  // Helper to get assignee user
  const getUser = (id: string) => users.find((u) => u.id === id);

  return (
    <div className="flex-1 flex flex-col overflow-x-auto overflow-y-hidden p-3 sm:p-4 md:p-6 bg-[#f0f2f5] dark:bg-[#090a0d] transition-colors scroll-smooth">
      {/* Viewer Notice Banner */}
      {isViewer && (
        <div className="mb-4 px-4 py-2.5 rounded-xl bg-neutral-200/70 dark:bg-[#161822] border border-[#cfd5de] dark:border-[#272a35] text-neutral-700 dark:text-neutral-300 text-xs flex items-center justify-between gap-3 shadow-xs shrink-0">
          <div className="flex items-center gap-2">
            <Eye className="w-4 h-4 text-neutral-500 shrink-0" />
            <span>
              {language === 'id' ? (
                <>
                  <strong>Mode Peninjau (Viewer):</strong> Anda memiliki akses baca untuk melihat seluruh kartu & progres proyek. Menambah atau memindahkan tugas dinonaktifkan.
                </>
              ) : (
                <>
                  <strong>Viewer Mode:</strong> You have read-only access to view all cards and project progress. Adding or moving tasks is disabled.
                </>
              )}
            </span>
          </div>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-neutral-300 dark:bg-[#252834] text-neutral-700 dark:text-neutral-300 uppercase tracking-wider shrink-0">
            Read-Only
          </span>
        </div>
      )}

      <div className="flex gap-4 sm:gap-5 h-full items-start min-w-max pb-4 flex-1">
        {columns.map((column) => {
          const columnTasks = tasks.filter((t) => t.columnId === column.id);
          const isOver = dragOverColumnId === column.id;
          const displayTitle = getColumnTitle(column.id, column.title);

          return (
            <div
              key={column.id}
              onDragOver={(e) => handleDragOver(e, column.id)}
              onDragLeave={() => handleDragLeave(column.id)}
              onDrop={(e) => handleDrop(e, column.id)}
              onDragEnd={handleDragEnd}
              className={`w-[84vw] max-w-[340px] sm:w-80 md:w-84 flex flex-col max-h-full rounded-2xl border transition-all duration-200 select-none shadow-xs dark:shadow-md animate-card-enter
                ${
                  isOver
                    ? 'border-red-500 bg-red-500/10 dark:bg-red-950/30 shadow-lg scale-[1.01]'
                    : 'border-[#cfd5de] dark:border-[#272a35] bg-[#e2e6eb] dark:bg-[#15171e]'
                }`}
            >
              {/* Column Header */}
              <div className="p-3 pb-2.5 flex items-center justify-between border-b border-[#cfd5de] dark:border-[#272a35]">
                <div className="flex items-center gap-2">
                  {/* Status Indicator */}
                  <span
                    className={`w-2 h-2 rounded-full ${
                      column.id === 'todo'
                        ? 'bg-neutral-400 dark:bg-neutral-500'
                        : column.id === 'in_progress'
                        ? 'bg-red-600 dark:bg-red-500 shadow-xs shadow-red-500/50'
                        : column.id === 'in_review'
                        ? 'bg-amber-500 shadow-xs shadow-amber-500/50'
                        : 'bg-emerald-500 shadow-xs shadow-emerald-500/50'
                    }`}
                  />
                  <h2 className="text-xs font-bold text-neutral-800 dark:text-neutral-100 uppercase tracking-wide">
                    {displayTitle}
                  </h2>
                  <span className="text-[11px] font-mono tabular-nums px-2 py-0.5 rounded-full bg-[#d3d8e2] dark:bg-[#222530] text-neutral-700 dark:text-neutral-300 font-semibold border border-[#c4cbd6] dark:border-[#2f3342]">
                    {columnTasks.length}
                  </span>
                </div>

                {/* Quick Add Button (hidden if viewer) */}
                {!isViewer && (
                  <button
                    onClick={() => onQuickAddTask(column.id)}
                    title={`+ ${displayTitle}`}
                    className="p-1 rounded-md text-neutral-500 dark:text-neutral-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-[#d5dbe4] dark:hover:bg-[#20232c] transition-colors cursor-pointer"
                  >
                    <Plus className="w-4 h-4 stroke-[2]" />
                  </button>
                )}
              </div>

              {/* Cards Container with smooth vertical scroll */}
              <div className="flex-1 overflow-y-auto p-3 space-y-3 min-h-[140px] max-h-[calc(100vh-175px)]">
                {columnTasks.length === 0 ? (
                  <div
                    onClick={() => !isViewer && onQuickAddTask(column.id)}
                    className={`h-24 rounded-xl border border-dashed border-[#c4cbd6] dark:border-[#2d313d] bg-white/40 dark:bg-[#1b1e26]/60 flex flex-col items-center justify-center p-3 text-center transition-all text-neutral-500 dark:text-neutral-400 group ${
                      isViewer
                        ? 'cursor-default'
                        : 'cursor-pointer hover:border-red-500 hover:bg-red-500/5'
                    }`}
                  >
                    {!isViewer && (
                      <Plus className="w-4 h-4 mb-1 group-hover:text-red-500 transition-colors text-neutral-400" />
                    )}
                    <span className="text-xs font-medium group-hover:text-neutral-700 dark:group-hover:text-neutral-300 transition-colors">
                      {language === 'id' ? 'Kosong' : 'Empty'}
                    </span>
                  </div>
                ) : (
                  columnTasks.map((task) => (
                    <KanbanCard
                      key={task.id}
                      task={task}
                      assignee={getUser(task.assigneeId)}
                      onClick={() => onTaskClick(task)}
                      onMoveColumn={onMoveTask}
                      isDragging={draggingTaskId === task.id}
                      onDragStart={handleDragStart}
                      isReadOnly={isViewer}
                    />
                  ))
                )}
              </div>

              {/* Column Footer Quick Add (hidden if viewer) */}
              {!isViewer && (
                <div className="p-2 border-t border-[#cfd5de] dark:border-[#272a35]">
                  <button
                    onClick={() => onQuickAddTask(column.id)}
                    className="w-full py-1.5 px-3 rounded-lg text-xs font-semibold text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white hover:bg-[#d5dbe4] dark:hover:bg-[#20232c] transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{t('addTaskInColumn')}</span>
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

