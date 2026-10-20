export type FileType = 'image' | 'document' | 'spreadsheet' | 'archive' | 'audio' | 'other';

export interface Attachment {
  id: string;
  name: string;
  size: string;
  type: FileType;
  uploadedAt: string;
  url?: string;
  isCover?: boolean;
  extension: string;
  dimensions?: string;
  isCloudLink?: boolean;
  cloudProvider?: string;
  isWorkResult?: boolean;
}

export interface User {
  id: string;
  name: string;
  avatar: string;
  role?: string;
  color: string;
  email: string;
  username?: string;
  isOnline: boolean;
  password?: string;
}

export interface Comment {
  id: string;
  authorId: string;
  content: string;
  createdAt: string;
  attachmentName?: string;
}

export interface Activity {
  id: string;
  authorId: string;
  action: string;
  timestamp: string;
}

export type Priority = 'Tinggi' | 'Sedang' | 'Rendah';

export type ColumnId = string;

export interface Column {
  id: ColumnId;
  projectId?: string;
  title: string;
  description?: string;
  badgeColor?: string;
  color?: string;
  order?: number;
}

export interface ChecklistItem {
  id: string;
  title: string;
  completed: boolean;
}

export type LinkType = 'drive' | 'figma' | 'canva' | 'doc' | 'sheet' | 'link';

export interface ExternalLink {
  id: string;
  title: string;
  url: string;
  type: LinkType;
  domain?: string;
}

export type TaskType = 'task' | 'feature' | 'bug' | 'improvement' | 'design' | 'research' | 'concept' | 'asset' | 'note';

export interface Task {
  id: string;
  key?: string;
  projectId: string;
  columnId: ColumnId;
  title: string;
  description: string;
  priority: Priority;
  taskType?: TaskType;
  cardColor?: string;
  isCompleted?: boolean;
  estimate?: string;
  assigneeId: string;
  creatorId?: string;
  dueDate: string;
  tags: string[];
  attachments: Attachment[];
  comments: Comment[];
  activities: Activity[];
  checklist: ChecklistItem[];
  externalLinks: ExternalLink[];
  createdAt: string;
}

export type ProjectRole = 'leader' | 'member' | 'viewer' | string;

export interface Project {
  id: string;
  name: string;
  description: string;
  key: string;
  category: string;
  leaderId: string;
  memberIds: string[];
  memberRoles: Record<string, ProjectRole>;
  iconColor: string;
  avatar?: string;
  coverImage?: string;
}

export type ThemeMode = 'dark' | 'light';
export type Language = 'id' | 'en';
