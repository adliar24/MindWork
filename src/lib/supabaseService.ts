import { supabase, isSupabaseConfigured } from './supabase';
import { Project, ProjectRole, Task, User } from '../types';

export interface CloudStatus {
  connected: boolean;
  tableReady: boolean;
  message?: string;
}

// Check if Supabase connection & tables are accessible
export async function checkSupabaseConnection(): Promise<CloudStatus> {
  if (!isSupabaseConfigured) {
    return {
      connected: false,
      tableReady: false,
      message: 'Supabase URL atau Anon Key belum dikonfigurasi.',
    };
  }

  try {
    const { data, error } = await supabase.from('projects').select('id').limit(1);
    if (error) {
      if (error.code === 'PGRST204' || error.code === '42P01') {
        return {
          connected: true,
          tableReady: false,
          message: 'Terkoneksi ke Supabase, namun tabel belum dibuat. Silakan jalankan supabase_schema.sql.',
        };
      }
      return {
        connected: false,
        tableReady: false,
        message: error.message,
      };
    }
    return {
      connected: true,
      tableReady: true,
      message: 'Cloud database Supabase aktif & terhubung.',
    };
  } catch (err: any) {
    return {
      connected: false,
      tableReady: false,
      message: err?.message || 'Gagal menghubungi server Supabase.',
    };
  }
}

// ----------------------------------------------------------------------
// USERS / PROFILES
// ----------------------------------------------------------------------

export async function fetchCloudUsers(): Promise<User[] | null> {
  if (!isSupabaseConfigured) return null;
  try {
    const { data, error } = await supabase.from('profiles').select('*').order('created_at', { ascending: true });
    if (error || !data || data.length === 0) return null;

    return data.map((row: any) => ({
      id: row.id,
      name: row.name,
      username: row.username || undefined,
      avatar: row.avatar,
      role: row.role || '',
      color: row.color,
      email: row.email,
      isOnline: row.is_online ?? true,
      password: row.password ?? '',
    }));
  } catch {
    return null;
  }
}

export async function findCloudUserByIdentifier(identifier: string): Promise<User | null> {
  if (!isSupabaseConfigured) return null;
  try {
    const clean = identifier.trim().toLowerCase().replace(/^@/, '');
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .or(`email.ilike.${clean},username.ilike.${clean}`)
      .limit(1)
      .maybeSingle();

    if (error || !data) return null;

    return {
      id: data.id,
      name: data.name,
      username: data.username || undefined,
      avatar: data.avatar,
      role: data.role || '',
      color: data.color,
      email: data.email,
      isOnline: data.is_online ?? true,
      password: data.password ?? '',
    };
  } catch {
    return null;
  }
}

export interface RegisterAccountParams {
  name: string;
  username?: string;
  email: string;
  password?: string;
  avatar: string;
  color?: string;
}

export interface RegisterResult {
  success: boolean;
  user?: User;
  error?: string;
  authCreated: boolean;
}

export async function registerCloudAccount(params: RegisterAccountParams): Promise<RegisterResult> {
  if (!isSupabaseConfigured) {
    return { success: false, error: 'Koneksi Supabase belum terkonfigurasi.', authCreated: false };
  }

  const cleanEmail = params.email.trim().toLowerCase();
  const cleanUsername = params.username?.trim().toLowerCase().replace(/^@/, '') || '';
  const password = params.password || 'password123';
  let userId = `user-${Date.now()}`;
  let authCreated = false;

  // 1. Daftarkan ke Supabase Auth (auth.users)
  try {
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: cleanEmail,
      password: password,
      options: {
        data: {
          name: params.name.trim(),
          username: cleanUsername,
          avatar: params.avatar,
        },
      },
    });

    if (authData?.user?.id) {
      userId = authData.user.id;
      authCreated = true;
    } else if (authError) {
      console.warn('Supabase Auth signUp note:', authError.message);
    }
  } catch (err: any) {
    console.warn('Supabase Auth exception:', err?.message);
  }

  // 2. Simpan ke tabel public.profiles di database
  try {
    const profileRow = {
      id: userId,
      name: params.name.trim(),
      username: cleanUsername,
      avatar: params.avatar,
      role: '',
      color: params.color || 'bg-red-600 text-white',
      email: cleanEmail,
      password: password,
      is_online: true,
    };

    const { error } = await supabase.from('profiles').upsert(profileRow);

    if (error) {
      console.error('Supabase profiles table upsert error:', error);
      return { success: false, error: error.message, authCreated };
    }

    const savedUser: User = {
      id: userId,
      name: params.name.trim(),
      username: cleanUsername || undefined,
      avatar: params.avatar,
      role: '',
      color: params.color || 'bg-red-600 text-white',
      email: cleanEmail,
      password: password,
      isOnline: true,
    };

    return { success: true, user: savedUser, authCreated };
  } catch (err: any) {
    console.error('Supabase profile save error:', err);
    return { success: false, error: err?.message || 'Gagal menyimpan profil', authCreated };
  }
}

export async function saveCloudUser(user: User): Promise<boolean> {
  if (!isSupabaseConfigured) return false;
  try {
    const { error } = await supabase.from('profiles').upsert({
      id: user.id,
      name: user.name,
      username: user.username || '',
      avatar: user.avatar,
      role: user.role || '',
      color: user.color,
      email: user.email.toLowerCase().trim(),
      is_online: user.isOnline,
      password: user.password ?? '',
    });
    if (error) {
      console.error('saveCloudUser error:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('saveCloudUser exception:', err);
    return false;
  }
}

export async function deleteDemoUsers(): Promise<void> {
  if (!isSupabaseConfigured) return;
  try {
    await supabase.from('profiles').delete().ilike('name', '%demo%');
    await supabase.from('profiles').delete().eq('id', 'user-1');
  } catch {}
}

// ----------------------------------------------------------------------
// PROJECTS & MEMBERS
// ----------------------------------------------------------------------

export async function fetchCloudProjects(): Promise<Project[] | null> {
  if (!isSupabaseConfigured) return null;
  try {
    const { data: projData, error: projError } = await supabase
      .from('projects')
      .select('*')
      .order('created_at', { ascending: true });

    if (projError || !projData || projData.length === 0) return null;

    const { data: memberData } = await supabase.from('project_members').select('*');

    const projects: Project[] = projData.map((p: any) => {
      const pMembers = (memberData || []).filter((m: any) => m.project_id === p.id);
      const memberIds = pMembers.map((m: any) => m.user_id);
      const memberRoles: Record<string, ProjectRole> = {};
      pMembers.forEach((m: any) => {
        memberRoles[m.user_id] = m.role as ProjectRole;
      });

      return {
        id: p.id,
        name: p.name,
        description: p.description || '',
        key: p.key,
        category: p.category || 'General',
        leaderId: p.leader_id || memberIds[0] || 'user-1',
        memberIds,
        memberRoles,
        iconColor: p.icon_color || 'bg-red-600',
        avatar: p.avatar || '',
        coverImage: p.cover_image || '',
      };
    });

    return projects;
  } catch {
    return null;
  }
}

export async function saveCloudProject(project: Project): Promise<boolean> {
  if (!isSupabaseConfigured) return false;
  try {
    // 1. Upsert project
    const row: any = {
      id: project.id,
      name: project.name,
      description: project.description,
      key: project.key,
      category: project.category,
      leader_id: project.leaderId,
      icon_color: project.iconColor,
    };
    if (project.avatar !== undefined) row.avatar = project.avatar;
    if (project.coverImage !== undefined) row.cover_image = project.coverImage;

    const { error: projError } = await supabase.from('projects').upsert(row);

    if (projError) return false;

    // 2. Upsert members
    await saveCloudProjectMembers(project.id, project.memberIds, project.memberRoles);
    return true;
  } catch {
    return false;
  }
}

export async function saveCloudProjectMembers(
  projectId: string,
  memberIds: string[],
  memberRoles: Record<string, ProjectRole>
): Promise<boolean> {
  if (!isSupabaseConfigured) return false;
  try {
    // Delete existing project members
    await supabase.from('project_members').delete().eq('project_id', projectId);

    // Insert updated members
    const rows = memberIds.map((userId) => ({
      project_id: projectId,
      user_id: userId,
      role: memberRoles[userId] || 'member',
    }));

    if (rows.length > 0) {
      await supabase.from('project_members').insert(rows);
    }
    return true;
  } catch {
    return false;
  }
}

// ----------------------------------------------------------------------
// TASKS
// ----------------------------------------------------------------------

export async function fetchCloudTasks(projectId?: string): Promise<Task[] | null> {
  if (!isSupabaseConfigured) return null;
  try {
    let query = supabase.from('tasks').select('*');
    if (projectId) {
      query = query.eq('project_id', projectId);
    }
    const { data, error } = await query.order('created_at', { ascending: false });
    if (error || !data) return null;

    return data.map((t: any) => ({
      id: t.id,
      projectId: t.project_id,
      columnId: t.column_id,
      title: t.title,
      description: t.description || '',
      priority: t.priority,
      assigneeId: t.assignee_id,
      dueDate: t.due_date || '',
      tags: Array.isArray(t.tags) ? t.tags : [],
      attachments: Array.isArray(t.attachments) ? t.attachments : [],
      comments: Array.isArray(t.comments) ? t.comments : [],
      activities: Array.isArray(t.activities) ? t.activities : [],
      checklist: Array.isArray(t.checklist) ? t.checklist : [],
      externalLinks: Array.isArray(t.external_links) ? t.external_links : [],
      createdAt: t.created_at,
    }));
  } catch {
    return null;
  }
}

export async function saveCloudTask(task: Task): Promise<boolean> {
  if (!isSupabaseConfigured) return false;
  try {
    const { error } = await supabase.from('tasks').upsert({
      id: task.id,
      project_id: task.projectId,
      column_id: task.columnId,
      title: task.title,
      description: task.description,
      priority: task.priority,
      assignee_id: task.assigneeId || null,
      due_date: task.dueDate || '',
      tags: task.tags || [],
      attachments: task.attachments || [],
      comments: task.comments || [],
      activities: task.activities || [],
      checklist: task.checklist || [],
      external_links: task.externalLinks || [],
    });
    return !error;
  } catch {
    return false;
  }
}

export async function deleteCloudTask(taskId: string): Promise<boolean> {
  if (!isSupabaseConfigured) return false;
  try {
    const { error } = await supabase.from('tasks').delete().eq('id', taskId);
    return !error;
  } catch {
    return false;
  }
}

// ----------------------------------------------------------------------
// REALTIME SUBSCRIPTION
// ----------------------------------------------------------------------

export function subscribeToCloudChanges(
  onUpdate: (payload: { table: string; eventType: string }) => void
) {
  if (!isSupabaseConfigured) return () => {};

  const channel = supabase
    .channel('vermilion-live-kanban')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'tasks' },
      (payload) => onUpdate({ table: 'tasks', eventType: payload.eventType })
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'projects' },
      (payload) => onUpdate({ table: 'projects', eventType: payload.eventType })
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'project_members' },
      (payload) => onUpdate({ table: 'project_members', eventType: payload.eventType })
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'profiles' },
      (payload) => onUpdate({ table: 'profiles', eventType: payload.eventType })
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
