import { Column, Project, Task, User } from './types';

export const INITIAL_USERS: User[] = [];

export const INITIAL_PROJECTS: Project[] = [];

export const INITIAL_COLUMNS: Column[] = [
  {
    id: 'todo',
    title: 'To Do',
    description: 'Tugas yang direncanakan dan siap dikerjakan',
    badgeColor: 'border-neutral-500/30 text-neutral-400',
  },
  {
    id: 'in_progress',
    title: 'In Progress',
    description: 'Sedang aktif dikerjakan oleh anggota tim',
    badgeColor: 'border-red-500/40 text-red-500',
  },
  {
    id: 'in_review',
    title: 'In Review',
    description: 'Pengecekan hasil kerja, revisi, atau approval ketua/klien',
    badgeColor: 'border-amber-500/40 text-amber-500',
  },
  {
    id: 'done',
    title: 'Done',
    description: 'Selesai, terverifikasi, dan file sudah diserahkan / siap',
    badgeColor: 'border-emerald-500/40 text-emerald-500',
  },
];

export const INITIAL_TASKS: Task[] = [];
