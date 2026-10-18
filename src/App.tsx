import React, { useState, useEffect, useMemo } from 'react';
import { FolderKanban, Plus } from 'lucide-react';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { KanbanBoard } from './components/KanbanBoard';
import { TaskDetailModal } from './components/TaskDetailModal';
import { NewTaskModal } from './components/NewTaskModal';
import { NewProjectModal } from './components/NewProjectModal';
import { InviteModal } from './components/InviteModal';
import { AuthModal } from './components/AuthModal';
import { CloudSetupModal } from './components/CloudSetupModal';
import { LoginPage } from './components/LoginPage';
import { HomeDashboard } from './components/HomeDashboard';
import {
  checkSupabaseConnection,
  fetchCloudProjects,
  fetchCloudTasks,
  fetchCloudUsers,
  saveCloudProject,
  saveCloudProjectMembers,
  saveCloudTask,
  deleteCloudTask,
  saveCloudUser,
  deleteDemoUsers,
  subscribeToCloudChanges,
  CloudStatus,
} from './lib/supabaseService';
import {
  INITIAL_COLUMNS,
  INITIAL_PROJECTS,
  INITIAL_TASKS,
  INITIAL_USERS,
} from './mockData';
import { ColumnId, Project, ProjectRole, Task, ThemeMode, User } from './types';

export default function App() {
  // Theme state: Dark mode default (Dominant Hitam dan Merah)
  const [theme, setTheme] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem('vermilion_theme');
    return (saved as ThemeMode) || 'dark';
  });

  // Sync theme with HTML class
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('vermilion_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  // State Management with LocalStorage fallback (Empty by default for clean start)
  const [projects, setProjects] = useState<Project[]>(() => {
    const saved = localStorage.getItem('vermilion_projects');
    if (!saved) return [];
    try {
      const parsed = JSON.parse(saved) as Project[];
      // Purge old mock/demo projects if present
      const clean = parsed.filter(
        (p) => p.id !== 'proj-1' && p.id !== 'proj-2' && p.id !== 'proj-3'
      );
      if (clean.length !== parsed.length) {
        localStorage.setItem('vermilion_projects', JSON.stringify(clean));
      }
      return clean;
    } catch {
      return [];
    }
  });

  const [activeProjectId, setActiveProjectId] = useState<string>(() => {
    const saved = localStorage.getItem('vermilion_active_proj');
    if (saved && saved !== 'proj-1' && saved !== 'proj-2' && saved !== 'proj-3') {
      return saved;
    }
    return '';
  });

  const [tasks, setTasks] = useState<Task[]>(() => {
    const saved = localStorage.getItem('vermilion_tasks');
    if (!saved) return [];
    try {
      const parsed = JSON.parse(saved) as Task[];
      const clean = parsed.filter(
        (t) => t.projectId !== 'proj-1' && t.projectId !== 'proj-2' && t.projectId !== 'proj-3'
      );
      if (clean.length !== parsed.length) {
        localStorage.setItem('vermilion_tasks', JSON.stringify(clean));
      }
      return clean;
    } catch {
      return [];
    }
  });

  // User Accounts & Authentication State
  const [users, setUsers] = useState<User[]>(() => {
    const saved = localStorage.getItem('vermilion_users');
    if (!saved) return [];
    try {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        // Automatically purge any dummy or demo accounts
        const filtered = parsed.filter(
          (u: User) =>
            u.id !== 'user-1' &&
            !u.email?.toLowerCase().includes('vermilion.io') &&
            !u.name.toLowerCase().includes('demo') &&
            !u.username?.toLowerCase().includes('demo') &&
            !u.email?.toLowerCase().includes('demo')
        );
        if (filtered.length !== parsed.length) {
          localStorage.setItem('vermilion_users', JSON.stringify(filtered));
          localStorage.removeItem('vermilion_current_user');
          return filtered;
        }
        return filtered;
      }
      return [];
    } catch {
      return [];
    }
  });

  const [currentUserId, setCurrentUserId] = useState<string>(() => {
    const saved = localStorage.getItem('vermilion_current_user');
    if (saved && saved !== 'user-1') {
      const savedUsers = localStorage.getItem('vermilion_users');
      if (savedUsers) {
        try {
          const parsed = JSON.parse(savedUsers) as User[];
          const user = parsed.find((u) => u.id === saved);
          if (
            !user ||
            user.name.toLowerCase().includes('demo') ||
            user.username?.toLowerCase().includes('demo')
          ) {
            localStorage.removeItem('vermilion_current_user');
            return '';
          }
          return saved;
        } catch {}
      }
    }
    return '';
  });

  const currentUser = useMemo<User>(() => {
    if (users.length > 0) {
      return users.find((u) => u.id === currentUserId) || users[0];
    }
    return {
      id: '',
      name: 'Tamu / Akun Baru',
      avatar: '👤',
      role: '',
      color: 'bg-red-600 text-white',
      email: '',
      isOnline: true,
    };
  }, [users, currentUserId]);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAssigneeId, setSelectedAssigneeId] = useState<string | null>(null);

  // Modals state
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [isNewTaskOpen, setIsNewTaskOpen] = useState(false);
  const [quickAddColumnId, setQuickAddColumnId] = useState<ColumnId>('todo');
  const [isNewProjectOpen, setIsNewProjectOpen] = useState(false);
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(() => {
    // If no users exist on startup, automatically open the registration modal
    const saved = localStorage.getItem('vermilion_users');
    return !saved || saved === '[]';
  });
  const [isCloudModalOpen, setIsCloudModalOpen] = useState(false);
  const [isSidebarMobileOpen, setIsSidebarMobileOpen] = useState(false);

  // Supabase Cloud Connection & Sync State
  const [cloudStatus, setCloudStatus] = useState<CloudStatus>({
    connected: false,
    tableReady: false,
  });

  const refreshCloudData = async () => {
    const status = await checkSupabaseConnection();
    setCloudStatus(status);

    if (status.tableReady) {
      deleteDemoUsers().catch(() => {});

      const [cloudUsers, cloudProjects, cloudTasks] = await Promise.all([
        fetchCloudUsers(),
        fetchCloudProjects(),
        fetchCloudTasks(),
      ]);

      if (cloudUsers) {
        const cleanCloudUsers = cloudUsers.filter(
          (u) =>
            u.id !== 'user-1' &&
            !u.name.toLowerCase().includes('demo') &&
            !u.username?.toLowerCase().includes('demo') &&
            !u.email?.toLowerCase().includes('demo')
        );
        setUsers(cleanCloudUsers);
        localStorage.setItem('vermilion_users', JSON.stringify(cleanCloudUsers));
      }
      if (cloudProjects) {
        const cleanCloudProjects = cloudProjects.filter(
          (p) => p.id !== 'proj-1' && p.id !== 'proj-2' && p.id !== 'proj-3'
        );
        setProjects(cleanCloudProjects);
        localStorage.setItem('vermilion_projects', JSON.stringify(cleanCloudProjects));
      }
      if (cloudTasks) {
        const cleanCloudTasks = cloudTasks.filter(
          (t) => t.projectId !== 'proj-1' && t.projectId !== 'proj-2' && t.projectId !== 'proj-3'
        );
        setTasks(cleanCloudTasks);
        localStorage.setItem('vermilion_tasks', JSON.stringify(cleanCloudTasks));
      }
    }
  };

  useEffect(() => {
    refreshCloudData();
  }, []);

  // Realtime subscription for multi-user live collaboration
  useEffect(() => {
    if (!cloudStatus.tableReady) return;

    const unsubscribe = subscribeToCloudChanges(async ({ table }) => {
      if (table === 'tasks') {
        const updatedTasks = await fetchCloudTasks();
        if (updatedTasks) setTasks(updatedTasks);
      } else if (table === 'projects' || table === 'project_members') {
        const updatedProjects = await fetchCloudProjects();
        if (updatedProjects) setProjects(updatedProjects);
      } else if (table === 'profiles') {
        const updatedUsers = await fetchCloudUsers();
        if (updatedUsers) setUsers(updatedUsers);
      }
    });

    return () => {
      unsubscribe();
    };
  }, [cloudStatus.tableReady]);

  // Persist state updates
  useEffect(() => {
    localStorage.setItem('vermilion_tasks', JSON.stringify(tasks));
  }, [tasks]);

  useEffect(() => {
    localStorage.setItem('vermilion_projects', JSON.stringify(projects));
  }, [projects]);

  useEffect(() => {
    localStorage.setItem('vermilion_users', JSON.stringify(users));
  }, [users]);

  useEffect(() => {
    localStorage.setItem('vermilion_current_user', currentUserId);
  }, [currentUserId]);

  useEffect(() => {
    localStorage.setItem('vermilion_active_proj', activeProjectId);
  }, [activeProjectId]);

  // User's accessible projects (projects where current user is creator/leader or member)
  const userProjects = useMemo<Project[]>(() => {
    if (!currentUser.id) return [];
    return projects.filter(
      (p) => p.leaderId === currentUser.id || p.memberIds?.includes(currentUser.id)
    );
  }, [projects, currentUser.id]);

  // Active Project Data (null when on Home view or no project selected)
  const activeProject = useMemo<Project | null>(() => {
    if (!activeProjectId || userProjects.length === 0) return null;
    return userProjects.find((p) => p.id === activeProjectId) || null;
  }, [userProjects, activeProjectId]);

  // Clean up activeProjectId if the selected project is no longer visible to user
  useEffect(() => {
    if (activeProjectId && !userProjects.some((p) => p.id === activeProjectId)) {
      setActiveProjectId('');
    }
  }, [userProjects, activeProjectId]);

  // Tasks belonging to user's projects
  const userTasks = useMemo(() => {
    return tasks.filter((t) => userProjects.some((p) => p.id === t.projectId));
  }, [tasks, userProjects]);

  // Sidebar team members: only members of the current active project (empty on Home)
  const sidebarMembers = useMemo(() => {
    if (activeProject) {
      return users.filter((u) => activeProject.memberIds?.includes(u.id));
    }
    return [];
  }, [activeProject, users]);

  // Current user's role in this active project
  const currentUserRole: ProjectRole = useMemo(() => {
    if (!currentUser.id || !activeProject) return 'member';
    if (!activeProject.leaderId || activeProject.leaderId === currentUser.id) return 'leader';
    return (
      activeProject.memberRoles?.[currentUser.id] ||
      (activeProject.memberIds?.includes(currentUser.id) ? 'member' : 'viewer')
    );
  }, [activeProject, currentUser]);

  const activeProjectMembers = useMemo(() => {
    if (!activeProject) return [];
    return users.filter((u) => activeProject.memberIds?.includes(u.id));
  }, [users, activeProject]);

  // Filter tasks for the active board
  const filteredTasks = useMemo(() => {
    if (!activeProject) return [];
    return tasks.filter((t) => {
      // Must match project
      if (t.projectId !== activeProject.id) return false;

      // Filter by assignee if selected
      if (selectedAssigneeId && t.assigneeId !== selectedAssigneeId) {
        return false;
      }

      // Filter by search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesTitle = t.title.toLowerCase().includes(query);
        const matchesDesc = t.description?.toLowerCase().includes(query);
        const matchesTags = t.tags.some((tag) => tag.toLowerCase().includes(query));
        const matchesAttachments = t.attachments.some((att) =>
          att.name.toLowerCase().includes(query)
        );
        const assignee = users.find((u) => u.id === t.assigneeId);
        const matchesAssignee = assignee?.name.toLowerCase().includes(query);

        return (
          matchesTitle ||
          matchesDesc ||
          matchesTags ||
          matchesAttachments ||
          matchesAssignee
        );
      }

      return true;
    });
  }, [tasks, activeProject?.id, selectedAssigneeId, searchQuery, users]);

  // Task detail modal data
  const selectedTask = useMemo(() => {
    return tasks.find((t) => t.id === selectedTaskId) || null;
  }, [tasks, selectedTaskId]);

  // Task Handlers with Optimistic Local Update & Background Cloud Sync
  const handleMoveTask = (taskId: string, targetColumn: ColumnId) => {
    let movedTask: Task | null = null;
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id === taskId && t.columnId !== targetColumn) {
          const colTitles: Record<ColumnId, string> = {
            todo: 'To Do',
            in_progress: 'In Progress',
            in_review: 'In Review',
            done: 'Done',
          };
          const newActivity = {
            id: `act-${Date.now()}`,
            authorId: currentUser.id,
            action: `memindahkan tugas ke ${colTitles[targetColumn]}`,
            timestamp: 'Baru saja',
          };
          movedTask = {
            ...t,
            columnId: targetColumn,
            activities: [newActivity, ...t.activities],
          };
          return movedTask;
        }
        return t;
      })
    );

    if (movedTask && cloudStatus.tableReady) {
      saveCloudTask(movedTask);
    }
  };

  const handleUpdateTask = (updatedTask: Task) => {
    setTasks((prev) => prev.map((t) => (t.id === updatedTask.id ? updatedTask : t)));
    if (cloudStatus.tableReady) {
      saveCloudTask(updatedTask);
    }
  };

  const handleDeleteTask = (taskId: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
    setSelectedTaskId(null);
    if (cloudStatus.tableReady) {
      deleteCloudTask(taskId);
    }
  };

  const handleCreateTask = (newTask: Task) => {
    setTasks((prev) => [newTask, ...prev]);
    if (cloudStatus.tableReady) {
      saveCloudTask(newTask);
    }
  };

  const handleQuickAddTask = (colId: ColumnId) => {
    setQuickAddColumnId(colId);
    setIsNewTaskOpen(true);
  };

  const handleCreateProject = (newProject: Project) => {
    // Current user is the leader of this newly created project
    const projectWithCreator: Project = {
      ...newProject,
      leaderId: currentUser.id || newProject.leaderId,
      memberIds: currentUser.id ? [currentUser.id] : [],
      memberRoles: currentUser.id ? { [currentUser.id]: 'leader' as const } : {},
    };
    setProjects((prev) => [...prev, projectWithCreator]);
    setActiveProjectId(projectWithCreator.id);
    if (cloudStatus.tableReady) {
      saveCloudProject(projectWithCreator);
      if (currentUser.id) {
        saveCloudProjectMembers(projectWithCreator.id, [currentUser.id], { [currentUser.id]: 'leader' });
      }
    }
  };

  const handleRegisterUser = (newUser: User) => {
    setUsers((prev) => {
      const filtered = prev.filter(
        (u) => u.id !== newUser.id && u.email.toLowerCase() !== newUser.email.toLowerCase()
      );
      const updated = [...filtered, newUser];
      localStorage.setItem('vermilion_users', JSON.stringify(updated));
      return updated;
    });
    setCurrentUserId(newUser.id);
    localStorage.setItem('vermilion_current_user', newUser.id);

    // Persist automatically to Supabase
    saveCloudUser(newUser).catch((err) => {
      console.warn('Auto sync profile to Supabase warning:', err);
    });
  };

  const handleSelectUser = (user: User) => {
    setCurrentUserId(user.id);
    localStorage.setItem('vermilion_current_user', user.id);
  };

  const handleUpdateUser = (updatedUser: User) => {
    setUsers((prev) => {
      const next = prev.map((u) => (u.id === updatedUser.id ? updatedUser : u));
      localStorage.setItem('vermilion_users', JSON.stringify(next));
      return next;
    });
    if (cloudStatus.tableReady) {
      saveCloudUser(updatedUser).catch((err) => {
        console.warn('Update user to Supabase error:', err);
      });
    }
  };

  const handleUpdateProjectMembers = (
    projId: string,
    memberIds: string[],
    memberRoles: Record<string, ProjectRole>
  ) => {
    setProjects((prev) =>
      prev.map((p) => (p.id === projId ? { ...p, memberIds, memberRoles } : p))
    );
    if (cloudStatus.tableReady) {
      saveCloudProjectMembers(projId, memberIds, memberRoles);
    }
  };

  const handleOpenInviteModal = () => {
    if (cloudStatus.tableReady) {
      fetchCloudUsers().then((fresh) => {
        if (fresh) {
          const clean = fresh.filter(
            (u) =>
              u.id !== 'user-1' &&
              !u.name.toLowerCase().includes('demo') &&
              !u.username?.toLowerCase().includes('demo') &&
              !u.email?.toLowerCase().includes('demo')
          );
          setUsers(clean);
          localStorage.setItem('vermilion_users', JSON.stringify(clean));
        }
      });
    }
    setIsInviteOpen(true);
  };

  const handleLogout = () => {
    setCurrentUserId('');
    localStorage.removeItem('vermilion_current_user');
  };

  // Check if user is authenticated with a valid registered account
  const isAuthenticated = Boolean(
    currentUserId && users.some((u) => u.id === currentUserId)
  );

  // If not authenticated, show the Login Page
  if (!isAuthenticated) {
    return (
      <>
        <LoginPage
          users={users}
          theme={theme}
          onToggleTheme={toggleTheme}
          onLogin={(user) => {
            setCurrentUserId(user.id);
            localStorage.setItem('vermilion_current_user', user.id);
          }}
          onRegister={handleRegisterUser}
        />

        {/* Cloud Setup Modal */}
        {isCloudModalOpen && (
          <CloudSetupModal
            status={cloudStatus}
            onRefresh={refreshCloudData}
            onClose={() => setIsCloudModalOpen(false)}
          />
        )}
      </>
    );
  }

  return (
    <div className={`min-h-screen flex flex-col font-sans transition-colors duration-200
      ${
        theme === 'dark'
          ? 'bg-[#090a0d] text-neutral-100 dark'
          : 'bg-[#f0f2f5] text-neutral-900'
      }`}
    >
      <div className="flex-1 flex overflow-hidden">
        {/* 1. Sidebar (Kiri) */}
        <Sidebar
          projects={userProjects}
          activeProjectId={activeProject?.id || activeProjectId}
          currentUserId={currentUser.id}
          onSelectProject={(id) => {
            setActiveProjectId(id);
            setSelectedAssigneeId(null);
            setSearchQuery('');
          }}
          onOpenNewProjectModal={() => setIsNewProjectOpen(true)}
          users={sidebarMembers}
          tasks={tasks}
          selectedAssigneeId={selectedAssigneeId}
          onSelectAssignee={setSelectedAssigneeId}
          isOpen={isSidebarMobileOpen}
          onCloseMobile={() => setIsSidebarMobileOpen(false)}
        />

        {/* Right Content Area: Header (Atas) + Main Kanban Area */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* 2. Header (Atas) */}
          <Header
            project={activeProject}
            projectMembers={activeProjectMembers}
            allUsers={users}
            currentUser={currentUser}
            currentUserRole={currentUserRole}
            selectedAssigneeId={selectedAssigneeId}
            onSelectAssignee={setSelectedAssigneeId}
            theme={theme}
            onToggleTheme={toggleTheme}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            onOpenNewTaskModal={() => {
              setQuickAddColumnId('todo');
              setIsNewTaskOpen(true);
            }}
            onOpenNewProjectModal={() => setIsNewProjectOpen(true)}
            onOpenInviteModal={handleOpenInviteModal}
            onOpenAuthModal={() => setIsAuthOpen(true)}
            onOpenCloudModal={() => setIsCloudModalOpen(true)}
            cloudStatus={cloudStatus}
            onToggleSidebarMobile={() => setIsSidebarMobileOpen((prev) => !prev)}
            onGoHome={() => setActiveProjectId('')}
          />

          {/* Active Filter Indicators Bar (Only when on a board) */}
          {activeProject && (selectedAssigneeId || searchQuery) && (
            <div className="px-6 py-1.5 bg-neutral-200/50 dark:bg-[#121318] border-b border-[#cfd5de] dark:border-[#20232c] flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 flex-wrap">
                {selectedAssigneeId && (
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-white dark:bg-[#1c1f27] text-neutral-800 dark:text-neutral-200 text-[11px] font-medium border border-neutral-200 dark:border-[#2b2f3d] shadow-xs">
                    <span>{users.find((u) => u.id === selectedAssigneeId)?.name}</span>
                    <button
                      onClick={() => setSelectedAssigneeId(null)}
                      className="hover:text-red-500 text-neutral-400"
                    >
                      ×
                    </button>
                  </span>
                )}
                {searchQuery && (
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-white dark:bg-[#1c1f27] text-neutral-800 dark:text-neutral-200 text-[11px] font-medium border border-neutral-200 dark:border-[#2b2f3d] shadow-xs">
                    <span>"{searchQuery}"</span>
                    <button
                      onClick={() => setSearchQuery('')}
                      className="hover:text-red-500 text-neutral-400"
                    >
                      ×
                    </button>
                  </span>
                )}
              </div>
              <button
                onClick={() => {
                  setSelectedAssigneeId(null);
                  setSearchQuery('');
                }}
                className="text-neutral-400 hover:text-red-500 text-[11px] font-medium transition-colors cursor-pointer"
              >
                Reset
              </button>
            </div>
          )}

          {/* 3. Main Area: Home Dashboard OR Kanban Board */}
          <main className="flex-1 flex overflow-hidden relative">
            {!activeProject ? (
              <div key="home-dashboard" className="flex-1 flex overflow-hidden animate-view-fade">
                <HomeDashboard
                  currentUser={currentUser}
                  projects={userProjects}
                  tasks={userTasks}
                  users={users}
                  onSelectProject={(projId) => setActiveProjectId(projId)}
                  onOpenNewProject={() => setIsNewProjectOpen(true)}
                />
              </div>
            ) : (
              <div key={activeProject.id} className="flex-1 flex overflow-hidden animate-view-fade">
                <KanbanBoard
                  columns={INITIAL_COLUMNS}
                  tasks={filteredTasks}
                  users={users}
                  currentUserRole={currentUserRole}
                  onTaskClick={(task) => setSelectedTaskId(task.id)}
                  onMoveTask={handleMoveTask}
                  onQuickAddTask={handleQuickAddTask}
                />
              </div>
            )}
          </main>
        </div>
      </div>

      {/* 4. Modal Detail Tugas (Pop-up saat kartu diklik) */}
      {selectedTask && (
        <TaskDetailModal
          task={selectedTask}
          users={users}
          currentUser={currentUser}
          onClose={() => setSelectedTaskId(null)}
          onUpdateTask={handleUpdateTask}
          onDeleteTask={handleDeleteTask}
        />
      )}

      {/* 5. Modal Buat Tugas Baru */}
      {isNewTaskOpen && activeProject && (
        <NewTaskModal
          columns={INITIAL_COLUMNS}
          users={users}
          defaultColumnId={quickAddColumnId}
          projectId={activeProject.id}
          onClose={() => setIsNewTaskOpen(false)}
          onCreateTask={handleCreateTask}
        />
      )}

      {/* 6. Modal Buat Proyek Baru */}
      {isNewProjectOpen && (
        <NewProjectModal
          users={users}
          currentUser={currentUser}
          onClose={() => setIsNewProjectOpen(false)}
          onCreateProject={handleCreateProject}
        />
      )}

      {/* 7. Modal Kelola Akses & Peran Tim */}
      {isInviteOpen && activeProject && (
        <InviteModal
          project={activeProject}
          allUsers={users}
          currentUser={currentUser}
          onClose={() => setIsInviteOpen(false)}
          onUpdateProjectMembers={handleUpdateProjectMembers}
          onRegisterUser={handleRegisterUser}
        />
      )}

      {/* 8. Modal Akun & Autentikasi Pengguna */}
      {isAuthOpen && (
        <AuthModal
          currentUser={currentUser}
          allUsers={users}
          currentUserRole={currentUserRole}
          activeProjectName={activeProject?.name}
          onUpdateUser={handleUpdateUser}
          onSelectUser={handleSelectUser}
          onRegisterUser={handleRegisterUser}
          onClose={() => setIsAuthOpen(false)}
          onLogout={handleLogout}
        />
      )}

      {/* 9. Modal Setup & Status Cloud Supabase */}
      {isCloudModalOpen && (
        <CloudSetupModal
          status={cloudStatus}
          onRefresh={refreshCloudData}
          onClose={() => setIsCloudModalOpen(false)}
        />
      )}
    </div>
  );
}
