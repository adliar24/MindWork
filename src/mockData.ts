import { Column, Project, Task, User } from './types';

export const INITIAL_USERS: User[] = [];

export const INITIAL_PROJECTS: Project[] = [];

export const INITIAL_COLUMNS: Column[] = [
  {
    id: 'todo',
    title: 'To Do',
    description: 'Tugas yang direncanakan dan siap dikerjakan',
    badgeColor: '#64748b',
    color: '#64748b',
  },
  {
    id: 'in_progress',
    title: 'In Progress',
    description: 'Sedang aktif dikerjakan oleh anggota tim',
    badgeColor: '#0ea5e9',
    color: '#0ea5e9',
  },
  {
    id: 'in_review',
    title: 'In Review',
    description: 'Pengecekan hasil kerja, revisi, atau approval ketua/klien',
    badgeColor: '#f59e0b',
    color: '#f59e0b',
  },
  {
    id: 'done',
    title: 'Done',
    description: 'Selesai, terverifikasi, dan file sudah diserahkan / siap',
    badgeColor: '#10b981',
    color: '#10b981',
  },
];

export const INITIAL_TASKS: Task[] = [];
