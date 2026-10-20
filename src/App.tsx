import React, { useState, useEffect, useMemo } from 'react';
import { FolderKanban, Plus } from 'lucide-react';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { KanbanBoard } from './components/KanbanBoard';
import { TaskDetailModal } from './components/TaskDetailModal';
import { NewTaskModal } from './components/NewTaskModal';
import { NewProjectModal } from './components/NewProjectModal';
import { EditProjectModal } from './components/EditProjectModal';
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
  fetchCloudLists,
  saveCloudProject,
  deleteCloudProject,
  saveCloudProjectMembers,
  saveCloudTask,
  deleteCloudTask,
  saveCloudList,
  deleteCloudList,
  saveCloudUser,
  deleteDemoUsers,
  subscribeToCloudChanges,
  syncProjectListsFallback,
  syncAllLocalDataToCloud,
  CloudStatus,
} from './lib/supabaseService';
import {
  INITIAL_COLUMNS,
  INITIAL_PROJECTS,
  INITIAL_TASKS,
  INITIAL_USERS,
} from './mockData';
import { Column, ColumnId, Project, ProjectRole, Task, ThemeMode, User } from './types';

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

  // Always start on Home (Beranda) upon initial entry/reload
  const [activeProjectId, setActiveProjectId] = useState<string>('');

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

  // Trello-style dynamic board lists per project
  const [boardLists, setBoardLists] = useState<Column[]>(() => {
    const saved = localStorage.getItem('vermilion_board_lists');
    if (!saved) return [];
    try {
      return JSON.parse(saved);
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
  const [isEditProjectOpen, setIsEditProjectOpen] = useState(false);
  const [projectToEdit, setProjectToEdit] = useState<Project | null>(null);
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
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

      const [cloudUsers, cloudProjects, cloudTasks, cloudLists] = await Promise.all([
        fetchCloudUsers(),
        fetchCloudProjects(),
        fetchCloudTasks(),
        fetchCloudLists(),
      ]);

      const safeCloudUsers = cloudUsers || [];
      const safeCloudProjects = cloudProjects || [];
      const safeCloudTasks = cloudTasks || [];
      const safeCloudLists = cloudLists || [];

      // 1. Process & Sync Users
      const cleanCloudUsers = safeCloudUsers.filter(
        (u) =>
          u.id !== 'user-1' &&
          !u.name.toLowerCase().includes('demo') &&
          !u.username?.toLowerCase().includes('demo') &&
          !u.email?.toLowerCase().includes('demo')
      );

      setUsers((prevUsers) => {
        const mergedUsers = cleanCloudUsers.map((cu) => {
          const local = prevUsers.find((u) => u.id === cu.id);
          if (!local) return cu;
          const isLocalCustom = local.avatar && (local.avatar.startsWith('data:image/') || local.avatar.startsWith('http'));
          const isCloudCustom = cu.avatar && (cu.avatar.startsWith('data:image/') || cu.avatar.startsWith('http'));
          const finalAvatar = isLocalCustom && !isCloudCustom ? local.avatar : (cu.avatar || local.avatar);
          if (isLocalCustom && !isCloudCustom) {
            saveCloudUser({ ...cu, avatar: finalAvatar }).catch(() => {});
          }
          return {
            ...cu,
            avatar: finalAvatar,
            role: cu.role || local.role || '',
          };
        });

        const missingLocals = prevUsers.filter(
          (lu) => !cleanCloudUsers.some((cu) => cu.id === lu.id) && lu.id !== 'user-1'
        );
        missingLocals.forEach((lu) => {
          saveCloudUser(lu).catch(() => {});
        });

        const finalUsers = [...mergedUsers, ...missingLocals];
        try {
          localStorage.setItem('vermilion_users', JSON.stringify(finalUsers));
        } catch (e) {
          console.warn('LocalStorage users quota warning:', e);
        }
        return finalUsers;
      });

      // 2. Process & Sync Projects
      const cleanCloudProjects = safeCloudProjects.filter(
        (p) => p.id !== 'proj-1' && p.id !== 'proj-2' && p.id !== 'proj-3'
      );

      setProjects((prevProjects) => {
        const merged = cleanCloudProjects.map((cp) => {
          const local = prevProjects.find((p) => p.id === cp.id);
          if (!local) return cp;
          const finalCover = cp.coverImage || local.coverImage || '';
          const finalAvatar = cp.avatar || local.avatar || '';

          if ((!cp.coverImage && local.coverImage) || (!cp.avatar && local.avatar)) {
            saveCloudProject({
              ...cp,
              coverImage: finalCover,
              avatar: finalAvatar,
            }).catch(() => {});
          }

          return {
            ...cp,
            avatar: finalAvatar,
            coverImage: finalCover,
            memberRoles: {
              ...(local.memberRoles || {}),
              ...(cp.memberRoles || {}),
            },
          };
        });

        const missingLocals = prevProjects.filter(
          (lp) => !cleanCloudProjects.some((cp) => cp.id === lp.id) && !['proj-1', 'proj-2', 'proj-3'].includes(lp.id)
        );
        missingLocals.forEach((lp) => {
          saveCloudProject(lp).catch(() => {});
        });

        const finalProjects = [...merged, ...missingLocals];
        try {
          localStorage.setItem('vermilion_projects', JSON.stringify(finalProjects));
        } catch (e) {
          console.warn('LocalStorage quota warning:', e);
        }
        return finalProjects;
      });

      // 3. Process & Sync Board Lists
      setBoardLists((prev) => {
        const merged = safeCloudLists.map((cl) => {
          const local = prev.find((l) => l.id === cl.id);
          return local ? { ...cl, ...local, title: cl.title || local.title } : cl;
        });
        const missingLocals = prev.filter((pl) => !safeCloudLists.some((cl) => cl.id === pl.id));
        missingLocals.forEach((ml) => saveCloudList(ml).catch(() => {}));
        const finalLists = [...merged, ...missingLocals];

        // Backup lists to project metadata
        const projectIdsWithLists = Array.from(new Set(finalLists.map((l) => l.projectId).filter(Boolean)));
        projectIdsWithLists.forEach((pId) => {
          if (pId) {
            syncProjectListsFallback(pId, finalLists.filter((l) => l.projectId === pId)).catch(() => {});
          }
        });

        try {
          localStorage.setItem('vermilion_board_lists', JSON.stringify(finalLists));
        } catch (e) {
          console.warn('LocalStorage board lists warning:', e);
        }
        return finalLists;
      });

      // 4. Process & Sync Tasks
      const cleanCloudTasks = safeCloudTasks.filter(
        (t) => t.projectId !== 'proj-1' && t.projectId !== 'proj-2' && t.projectId !== 'proj-3'
      );

      setTasks((prevTasks) => {
        const merged = cleanCloudTasks.map((ct) => {
          const lt = prevTasks.find((x) => x.id === ct.id);
          return {
            ...ct,
            cardColor: ct.cardColor || lt?.cardColor || '',
            taskType: ct.taskType || lt?.taskType || 'task',
            estimate: ct.estimate || lt?.estimate || '',
            isCompleted: ct.isCompleted ?? lt?.isCompleted ?? false,
            creatorId: ct.creatorId || lt?.creatorId || '',
          };
        });

        const missingLocals = prevTasks.filter(
          (lt) => !cleanCloudTasks.some((ct) => ct.id === lt.id) && !['proj-1', 'proj-2', 'proj-3'].includes(lt.projectId)
        );

        // Push any local tasks up to Supabase
        missingLocals.forEach((lt) => {
          saveCloudTask(lt).catch((err) => console.warn('Push local task error:', err));
        });

        const finalTasks = [...merged, ...missingLocals];
        try {
          localStorage.setItem('vermilion_tasks', JSON.stringify(finalTasks));
        } catch (e) {
          console.warn('LocalStorage tasks quota warning:', e);
        }
        return finalTasks;
      });

      // 5. Automatic safety net: if Supabase has 0 tasks but localStorage has tasks, trigger full sync
      try {
        const localTasksRaw = localStorage.getItem('vermilion_tasks');
        if (localTasksRaw) {
          const parsedLocal = JSON.parse(localTasksRaw);
          if (Array.isArray(parsedLocal) && parsedLocal.length > 0 && safeCloudTasks.length === 0) {
            syncAllLocalDataToCloud().catch(() => {});
          }
        }
      } catch {}
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
        if (updatedTasks) {
          const clean = updatedTasks.filter(
            (t) => t.projectId !== 'proj-1' && t.projectId !== 'proj-2' && t.projectId !== 'proj-3'
          );
          setTasks((prevTasks) => {
            const merged = clean.map((ct) => {
              const lt = prevTasks.find((x) => x.id === ct.id);
              return {
                ...ct,
                cardColor: ct.cardColor || lt?.cardColor || '',
                taskType: ct.taskType || lt?.taskType || 'task',
                estimate: ct.estimate || lt?.estimate || '',
                isCompleted: ct.isCompleted ?? lt?.isCompleted ?? false,
                creatorId: ct.creatorId || lt?.creatorId || '',
              };
            });
            const missingLocals = prevTasks.filter(
              (lt) => !clean.some((ct) => ct.id === lt.id) && !['proj-1', 'proj-2', 'proj-3'].includes(lt.projectId)
            );
            const finalTasks = [...merged, ...missingLocals];
            try {
              localStorage.setItem('vermilion_tasks', JSON.stringify(finalTasks));
            } catch (e) {
              console.warn('LocalStorage quota warning:', e);
            }
            return finalTasks;
          });
        }
      } else if (table === 'projects' || table === 'project_members') {
        const updatedProjects = await fetchCloudProjects();
        if (updatedProjects) {
          setProjects((prev) => {
            return updatedProjects.map((up) => {
              const local = prev.find((p) => p.id === up.id);
              if (!local) return up;
              return {
                ...up,
                avatar: up.avatar || local.avatar || '',
                coverImage: up.coverImage || local.coverImage || '',
                memberRoles: {
                  ...(local.memberRoles || {}),
                  ...(up.memberRoles || {}),
                },
              };
            });
          });
        }
        // Also sync board lists when project updates in realtime
        const freshLists = await fetchCloudLists();
        if (freshLists) {
          setBoardLists(freshLists);
          try {
            localStorage.setItem('vermilion_board_lists', JSON.stringify(freshLists));
          } catch {}
        }
      } else if (table === 'profiles') {
        const updatedUsers = await fetchCloudUsers();
        if (updatedUsers) setUsers(updatedUsers);
      } else if (table === 'board_lists') {
        const updatedLists = await fetchCloudLists();
        if (updatedLists) {
          setBoardLists(updatedLists);
          try {
            localStorage.setItem('vermilion_board_lists', JSON.stringify(updatedLists));
          } catch {}
        }
      }
    });

    return () => {
      unsubscribe();
    };
  }, [cloudStatus.tableReady]);

  // Persist state updates
  useEffect(() => {
    try {
      localStorage.setItem('vermilion_tasks', JSON.stringify(tasks));
    } catch (e) {
      console.warn('LocalStorage tasks quota warning:', e);
    }
  }, [tasks]);

  useEffect(() => {
    try {
      localStorage.setItem('vermilion_projects', JSON.stringify(projects));
    } catch (e) {
      console.warn('LocalStorage projects quota warning:', e);
    }
  }, [projects]);

  useEffect(() => {
    try {
      localStorage.setItem('vermilion_users', JSON.stringify(users));
    } catch (e) {
      console.warn('LocalStorage users quota warning:', e);
    }
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

  // Dynamic lists/columns for current active project
  const activeProjectColumns = useMemo<Column[]>(() => {
    if (!activeProject) return [];
    return boardLists
      .filter((col) => col.projectId === activeProject.id)
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  }, [boardLists, activeProject]);

  // Dynamic lists/columns for current active project: automatically ensure default starter lists (To Do, Doing, Done)
  useEffect(() => {
    if (!activeProject) return;
    const projectLists = boardLists.filter((l) => l.projectId === activeProject.id);
    if (projectLists.length === 0) {
      const defaultCols: Column[] = [
        { id: `list-${activeProject.id}-todo`, projectId: activeProject.id, title: 'To Do', order: 0 },
        { id: `list-${activeProject.id}-doing`, projectId: activeProject.id, title: 'Doing', order: 1 },
        { id: `list-${activeProject.id}-done`, projectId: activeProject.id, title: 'Done', order: 2 },
      ];
      setBoardLists((prev) => [...prev, ...defaultCols]);
      defaultCols.forEach((c) => saveCloudList(c).catch(() => {}));
      syncProjectListsFallback(activeProject.id, defaultCols).catch(() => {});
    }
  }, [activeProject?.id, boardLists]);

  // Task detail modal data
  const selectedTask = useMemo(() => {
    return tasks.find((t) => t.id === selectedTaskId) || null;
  }, [tasks, selectedTaskId]);

  // List Management Handlers (Trello-style)
  const handleCreateList = (title: string) => {
    if (!activeProject || !title.trim()) return;
    const currentLists = boardLists.filter((l) => l.projectId === activeProject.id);
    const newList: Column = {
      id: `list-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      projectId: activeProject.id,
      title: title.trim(),
      order: currentLists.length,
      badgeColor: '',
    };
    const nextLists = [...boardLists, newList];
    setBoardLists(nextLists);
    if (cloudStatus.tableReady) {
      saveCloudList(newList);
      syncProjectListsFallback(
        activeProject.id,
        nextLists.filter((l) => l.projectId === activeProject.id)
      ).catch(() => {});
    }
  };

  const handleUpdateList = (updatedList: Column) => {
    const nextLists = boardLists.map((l) => (l.id === updatedList.id ? updatedList : l));
    setBoardLists(nextLists);
    if (cloudStatus.tableReady && activeProject) {
      saveCloudList(updatedList);
      syncProjectListsFallback(
        activeProject.id,
        nextLists.filter((l) => l.projectId === activeProject.id)
      ).catch(() => {});
    }
  };

  const handleDeleteList = (listId: string) => {
    const nextLists = boardLists.filter((l) => l.id !== listId);
    setBoardLists(nextLists);
    setTasks((prev) => prev.filter((t) => t.columnId !== listId));
    if (cloudStatus.tableReady && activeProject) {
      deleteCloudList(listId);
      syncProjectListsFallback(
        activeProject.id,
        nextLists.filter((l) => l.projectId === activeProject.id)
      ).catch(() => {});
    }
  };

  // Task Handlers with Optimistic Local Update & Background Cloud Sync
  const handleMoveTask = (taskId: string, targetColumn: ColumnId) => {
    let movedTask: Task | null = null;
    setTasks((prev) => {
      const next = prev.map((t) => {
        if (t.id === taskId && t.columnId !== targetColumn) {
          const targetCol = boardLists.find((l) => l.id === targetColumn);
          const colTitle = targetCol ? targetCol.title : targetColumn;
          const newActivity = {
            id: `act-${Date.now()}`,
            authorId: currentUser.id,
            action: `memindahkan tugas ke "${colTitle}"`,
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
      });
      try {
        localStorage.setItem('vermilion_tasks', JSON.stringify(next));
      } catch (e) {
        console.warn('LocalStorage move task warning:', e);
      }
      return next;
    });

    if (movedTask && cloudStatus.tableReady) {
      saveCloudTask(movedTask);
    }
  };

  const handleUpdateTask = (updatedTask: Task) => {
    setTasks((prev) => {
      const next = prev.map((t) => (t.id === updatedTask.id ? updatedTask : t));
      try {
        localStorage.setItem('vermilion_tasks', JSON.stringify(next));
      } catch (e) {
        console.warn('LocalStorage update task warning:', e);
      }
      return next;
    });
    if (cloudStatus.tableReady) {
      saveCloudTask(updatedTask);
    }
  };

  const handleDeleteTask = (taskId: string) => {
    setTasks((prev) => {
      const next = prev.filter((t) => t.id !== taskId);
      try {
        localStorage.setItem('vermilion_tasks', JSON.stringify(next));
      } catch (e) {
        console.warn('LocalStorage delete task warning:', e);
      }
      return next;
    });
    setSelectedTaskId(null);
    if (cloudStatus.tableReady) {
      deleteCloudTask(taskId);
    }
  };

  const handleCreateTask = (newTask: Task) => {
    setTasks((prev) => {
      const next = [newTask, ...prev];
      try {
        localStorage.setItem('vermilion_tasks', JSON.stringify(next));
      } catch (e) {
        console.warn('LocalStorage create task warning:', e);
      }
      return next;
    });
    if (cloudStatus.tableReady) {
      saveCloudTask(newTask);
    }
  };

  const handleQuickAddTask = (colId: ColumnId) => {
    setQuickAddColumnId(colId);
    setIsNewTaskOpen(true);
  };

  const handleInlineCreateCard = (columnId: ColumnId, title: string) => {
    if (!activeProject || !title.trim()) return;
    const projectTaskCount = tasks.filter((t) => t.projectId === activeProject.id).length;
    const targetCol = boardLists.find((l) => l.id === columnId);
    const colName = targetCol ? targetCol.title : 'daftar';

    const newTask: Task = {
      id: `task-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      key: `${activeProject.key}-${projectTaskCount + 1}`,
      title: title.trim(),
      description: '',
      columnId,
      projectId: activeProject.id,
      priority: 'Sedang',
      assigneeId: currentUser.id || '',
      creatorId: currentUser.id || '',
      dueDate: '',
      tags: [],
      attachments: [],
      comments: [],
      activities: [
        {
          id: `act-${Date.now()}`,
          authorId: currentUser.id || 'user',
          action: `menambahkan kartu ini ke ${colName}`,
          timestamp: 'Baru saja',
        },
      ],
      checklist: [],
      externalLinks: [],
      isCompleted: false,
      createdAt: new Date().toISOString(),
    };
    handleCreateTask(newTask);
  };

  const handleCreateProject = (newProject: Project) => {
    // Current user is the leader of this newly created project
    const projectWithCreator: Project = {
      ...newProject,
      leaderId: currentUser.id || newProject.leaderId,
      memberIds: currentUser.id ? [currentUser.id] : [],
      memberRoles: currentUser.id ? { [currentUser.id]: 'leader' as const } : {},
    };
    setProjects((prev) => {
      const next = [...prev, projectWithCreator];
      try {
        localStorage.setItem('vermilion_projects', JSON.stringify(next));
      } catch (err) {
        console.warn('LocalStorage save project error:', err);
      }
      return next;
    });

    // Automatically create default starter lists: To Do, Doing, Done (matching Trello)
    const defaultStarterLists: Column[] = [
      { id: `list-${projectWithCreator.id}-todo`, projectId: projectWithCreator.id, title: 'To Do', order: 0 },
      { id: `list-${projectWithCreator.id}-doing`, projectId: projectWithCreator.id, title: 'Doing', order: 1 },
      { id: `list-${projectWithCreator.id}-done`, projectId: projectWithCreator.id, title: 'Done', order: 2 },
    ];
    setBoardLists((prev) => [...prev, ...defaultStarterLists]);
    defaultStarterLists.forEach((c) => saveCloudList(c).catch(() => {}));

    setActiveProjectId(projectWithCreator.id);
    saveCloudProject(projectWithCreator).catch((err) => {
      console.warn('Save project to Supabase error:', err);
    });
    if (currentUser.id) {
      saveCloudProjectMembers(projectWithCreator.id, [currentUser.id], { [currentUser.id]: 'leader' }).catch(() => {});
    }
  };

  const handleUpdateProject = (updatedProject: Project) => {
    setProjects((prev) => {
      const next = prev.map((p) => (p.id === updatedProject.id ? updatedProject : p));
      try {
        localStorage.setItem('vermilion_projects', JSON.stringify(next));
      } catch (err) {
        console.warn('LocalStorage save project error:', err);
      }
      return next;
    });
    // Unconditionally sync to Supabase so covers & avatars are immediately persistent
    saveCloudProject(updatedProject).catch((err) => {
      console.warn('Update project to Supabase error:', err);
    });
  };

  const handleOpenEditProject = (proj?: Project | null) => {
    const target = proj || activeProject;
    if (target) {
      setProjectToEdit(target);
      setIsEditProjectOpen(true);
    }
  };

  const handleDeleteProject = (projectId: string) => {
    setProjects((prev) => {
      const next = prev.filter((p) => p.id !== projectId);
      try {
        localStorage.setItem('vermilion_projects', JSON.stringify(next));
      } catch (err) {
        console.warn('LocalStorage save project error:', err);
      }
      return next;
    });
    setBoardLists((prev) => prev.filter((l) => l.projectId !== projectId));
    setTasks((prev) => prev.filter((t) => t.projectId !== projectId));
    if (activeProjectId === projectId) {
      setActiveProjectId('');
    }
    setIsEditProjectOpen(false);
    setProjectToEdit(null);
    deleteCloudProject(projectId).catch(() => {});
  };

  const handleRegisterUser = (newUser: User) => {
    setUsers((prev) => {
      const filtered = prev.filter(
        (u) => u.id !== newUser.id && u.email.toLowerCase() !== newUser.email.toLowerCase()
      );
      const updated = [...filtered, newUser];
      try {
        localStorage.setItem('vermilion_users', JSON.stringify(updated));
      } catch (e) {
        console.warn('LocalStorage save user error:', e);
      }
      return updated;
    });
    setCurrentUserId(newUser.id);
    localStorage.setItem('vermilion_current_user', newUser.id);
    setIsAuthOpen(false);

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
      try {
        localStorage.setItem('vermilion_users', JSON.stringify(next));
      } catch (e) {
        console.warn('LocalStorage save user error:', e);
      }
      return next;
    });
    // Unconditionally sync to Supabase so profile photo changes replicate to all devices
    saveCloudUser(updatedUser).catch((err) => {
      console.warn('Update user to Supabase error:', err);
    });
  };

  const handleUpdateProjectMembers = (
    projId: string,
    memberIds: string[],
    memberRoles: Record<string, ProjectRole>
  ) => {
    setProjects((prev) => {
      const next = prev.map((p) => (p.id === projId ? { ...p, memberIds, memberRoles } : p));
      try {
        localStorage.setItem('vermilion_projects', JSON.stringify(next));
      } catch (e) {
        console.warn('LocalStorage save project members error:', e);
      }
      return next;
    });

    // Also update role in users list for consistency across the entire app
    setUsers((prevUsers) => {
      let changed = false;
      const updated = prevUsers.map((u) => {
        if (memberRoles[u.id] && memberRoles[u.id] !== u.role) {
          changed = true;
          return { ...u, role: memberRoles[u.id] };
        }
        return u;
      });
      if (changed) {
        try {
          localStorage.setItem('vermilion_users', JSON.stringify(updated));
        } catch (e) {
          console.warn('LocalStorage save users error:', e);
        }
      }
      return updated;
    });

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
            setIsAuthOpen(false);
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
                  onOpenEditProjectModal={(proj) => handleOpenEditProject(proj)}
                />
              </div>
            ) : (
              <div key={activeProject.id} className="flex-1 flex overflow-hidden animate-view-fade">
                <KanbanBoard
                  project={activeProject}
                  onUpdateProject={handleUpdateProject}
                  onOpenEditProjectModal={() => handleOpenEditProject(activeProject)}
                  columns={activeProjectColumns}
                  tasks={filteredTasks}
                  users={users}
                  currentUserRole={currentUserRole}
                  onTaskClick={(task) => setSelectedTaskId(task.id)}
                  onMoveTask={handleMoveTask}
                  onQuickAddTask={handleQuickAddTask}
                  onInlineCreateCard={handleInlineCreateCard}
                  onUpdateTask={handleUpdateTask}
                  onCreateList={handleCreateList}
                  onUpdateList={handleUpdateList}
                  onDeleteList={handleDeleteList}
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
          columns={activeProjectColumns}
          users={users}
          currentUser={currentUser}
          onClose={() => setSelectedTaskId(null)}
          onUpdateTask={handleUpdateTask}
          onDeleteTask={handleDeleteTask}
          onMoveTask={handleMoveTask}
        />
      )}

      {/* 5. Modal Buat Tugas Baru */}
      {isNewTaskOpen && activeProject && (
        <NewTaskModal
          columns={activeProjectColumns.length > 0 ? activeProjectColumns : [{ id: 'general', title: 'Tugas' }]}
          users={users}
          currentUser={currentUser}
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

      {/* 10. Modal Edit Proyek */}
      {isEditProjectOpen && (projectToEdit || activeProject) && (
        <EditProjectModal
          project={projectToEdit || activeProject!}
          isOpen={isEditProjectOpen}
          onClose={() => {
            setIsEditProjectOpen(false);
            setProjectToEdit(null);
          }}
          onUpdateProject={handleUpdateProject}
          onDeleteProject={handleDeleteProject}
          currentUserRole={currentUserRole}
        />
      )}
    </div>
  );
}
