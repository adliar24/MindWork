import React, { useState, useMemo } from 'react';
import {
  X,
  Users,
  Crown,
  Briefcase,
  Eye,
  Trash2,
  Plus,
  Check,
  UserPlus,
  Search,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { Project, ProjectRole, User } from '../types';
import { UserAvatar } from './UserAvatar';
import { findCloudUserByIdentifier } from '../lib/supabaseService';
import { useLanguage } from '../context/LanguageContext';

interface InviteModalProps {
  project: Project;
  allUsers: User[];
  currentUser: User;
  onClose: () => void;
  onUpdateProjectMembers: (
    projectId: string,
    memberIds: string[],
    memberRoles: Record<string, ProjectRole>
  ) => void;
  onRegisterUser?: (newUser: User) => void;
}

export const InviteModal: React.FC<InviteModalProps> = ({
  project,
  allUsers,
  currentUser,
  onClose,
  onUpdateProjectMembers,
  onRegisterUser,
}) => {
  const { t, language } = useLanguage();
  const currentUserRole: ProjectRole =
    project.memberRoles?.[currentUser.id] ||
    (project.leaderId === currentUser.id ? 'leader' : 'viewer');
  const isLeader = currentUserRole === 'leader';

  // Members and Roles state
  const [memberIds, setMemberIds] = useState<string[]>(project.memberIds || []);
  const [memberRoles, setMemberRoles] = useState<Record<string, ProjectRole>>(
    () => {
      const initial: Record<string, ProjectRole> = { ...(project.memberRoles || {}) };
      (project.memberIds || []).forEach((id) => {
        if (!initial[id]) {
          initial[id] = id === project.leaderId ? 'leader' : 'member';
        }
      });
      return initial;
    }
  );

  // Single unified invite search/input state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState<ProjectRole>('member');
  const [isSearching, setIsSearching] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);

  // Optional manual new user registration form toggle
  const [isNewUserFormOpen, setIsNewUserFormOpen] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserRole, setNewUserRole] = useState<ProjectRole>('member');

  // Exit animation state
  const [isClosing, setIsClosing] = useState(false);

  const handleClose = () => {
    if (isClosing) return;
    setIsClosing(true);
    setTimeout(() => {
      onClose();
    }, 180);
  };

  // Change a member's role
  const handleChangeRole = (userId: string, newRole: ProjectRole) => {
    if (!isLeader) return;
    setMemberRoles((prev) => ({
      ...prev,
      [userId]: newRole,
    }));
  };

  // Remove member from project
  const handleRemoveMember = (userId: string) => {
    if (!isLeader) return;
    if (userId === project.leaderId) {
      alert(language === 'id' ? 'Ketua utama tidak dapat dikeluarkan dari proyek.' : 'Main leader cannot be removed from the project.');
      return;
    }
    setMemberIds((prev) => prev.filter((id) => id !== userId));
    setMemberRoles((prev) => {
      const next = { ...prev };
      delete next[userId];
      return next;
    });
    setFeedback(null);
  };

  // Directly invite a user from available accounts list
  const handleDirectInvite = (userId: string, roleToAssign: ProjectRole = selectedRole) => {
    if (!isLeader) return;
    if (!memberIds.includes(userId)) {
      setMemberIds((prev) => [...prev, userId]);
      setMemberRoles((prev) => ({
        ...prev,
        [userId]: roleToAssign,
      }));
      const u = allUsers.find((x) => x.id === userId);
      setFeedback({
        type: 'success',
        message: `${u?.name || (language === 'id' ? 'Pengguna' : 'User')} ${language === 'id' ? 'berhasil ditambahkan ke proyek.' : 'successfully added to project.'}`,
      });
      setSearchQuery('');
    }
  };

  // Handle unified search & invite submission
  const handleUnifiedInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    const query = searchQuery.trim().toLowerCase().replace(/^@/, '');
    if (!query || !isLeader) return;

    setFeedback(null);
    setIsSearching(true);

    try {
      // 1. Search in local allUsers first
      const localMatch = allUsers.find(
        (u) =>
          u.email.toLowerCase() === query ||
          u.username?.toLowerCase() === query ||
          u.name.toLowerCase() === query
      );

      if (localMatch) {
        if (memberIds.includes(localMatch.id)) {
          setFeedback({
            type: 'info',
            message: `${localMatch.name} ${language === 'id' ? 'sudah menjadi anggota proyek ini.' : 'is already a member of this project.'}`,
          });
          setIsSearching(false);
          return;
        }

        handleDirectInvite(localMatch.id, selectedRole);
        setIsSearching(false);
        return;
      }

      // 2. Query Supabase cloud database
      const cloudUser = await findCloudUserByIdentifier(query);
      if (cloudUser) {
        if (memberIds.includes(cloudUser.id)) {
          setFeedback({
            type: 'info',
            message: `${cloudUser.name} ${language === 'id' ? 'sudah menjadi anggota proyek ini.' : 'is already a member of this project.'}`,
          });
          setIsSearching(false);
          return;
        }

        if (onRegisterUser) {
          onRegisterUser(cloudUser);
        }
        setMemberIds((prev) => [...prev, cloudUser.id]);
        setMemberRoles((prev) => ({
          ...prev,
          [cloudUser.id]: selectedRole,
        }));
        setFeedback({
          type: 'success',
          message: `${cloudUser.name} ${language === 'id' ? 'berhasil ditemukan dan ditambahkan ke proyek.' : 'successfully found and added to project.'}`,
        });
        setSearchQuery('');
      } else {
        setFeedback({
          type: 'error',
          message: language === 'id'
            ? `Akun "${searchQuery}" tidak ditemukan. Anda dapat mendaftarkannya lewat form di bawah.`
            : `Account "${searchQuery}" not found. You can register them via the form below.`,
        });
      }
    } catch {
      setFeedback({
        type: 'error',
        message: language === 'id' ? 'Gagal mencari akun. Silakan coba lagi.' : 'Failed to search account. Please try again.',
      });
    } finally {
      setIsSearching(false);
    }
  };

  // Handle manual creation of new user (if colleague has no account at all)
  const handleCreateAndAddUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserName.trim() || !newUserEmail.trim()) return;

    const colors = [
      'bg-red-600 text-white',
      'bg-rose-500 text-white',
      'bg-amber-600 text-white',
      'bg-indigo-600 text-white',
      'bg-emerald-600 text-white',
    ];
    const initials = newUserName
      .trim()
      .split(' ')
      .map((w) => w[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();

    const createdUser: User = {
      id: `user-${Date.now()}`,
      name: newUserName.trim(),
      avatar: initials || 'TM',
      role: '',
      color: colors[Math.floor(Math.random() * colors.length)],
      email: newUserEmail.trim(),
      isOnline: true,
    };

    if (onRegisterUser) {
      onRegisterUser(createdUser);
    }

    setMemberIds((prev) => [...prev, createdUser.id]);
    setMemberRoles((prev) => ({
      ...prev,
      [createdUser.id]: newUserRole,
    }));

    setFeedback({
      type: 'success',
      message: `Akun baru ${createdUser.name} dibuat dan ditambahkan ke proyek.`,
    });

    setNewUserName('');
    setNewUserEmail('');
    setIsNewUserFormOpen(false);
  };

  // Save changes and close
  const handleSave = () => {
    onUpdateProjectMembers(project.id, memberIds, memberRoles);
    handleClose();
  };

  // Accounts available to be invited (registered accounts not in this project)
  const availableUsers = useMemo(() => {
    const list = allUsers.filter((u) => !memberIds.includes(u.id));
    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase().replace(/^@/, '');
    return list.filter(
      (u) =>
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.username?.toLowerCase().includes(q)
    );
  }, [allUsers, memberIds, searchQuery]);

  return (
    <div
      onClick={handleClose}
      className={`fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/65 backdrop-blur-xs overflow-y-auto cursor-pointer ${
        isClosing ? 'animate-backdrop-out' : 'animate-in fade-in'
      }`}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`w-full max-w-lg rounded-2xl bg-white dark:bg-[#12141a] border border-neutral-200 dark:border-[#272a35] shadow-2xl overflow-hidden text-neutral-900 dark:text-neutral-100 flex flex-col cursor-default ${
          isClosing ? 'animate-modal-out' : 'animate-modal-in'
        }`}
      >
        {/* Modal Header */}
        <div className="p-4 px-6 border-b border-neutral-200 dark:border-[#20232c] flex items-center justify-between shrink-0 bg-white dark:bg-[#12141a]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-red-600/10 text-red-600 dark:text-red-400 flex items-center justify-center border border-red-500/20">
              <Users className="w-4 h-4 stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-neutral-950 dark:text-white">
                  {language === 'id' ? 'Anggota Proyek' : 'Project Members'}
                </h3>
                <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border border-neutral-200/60 dark:border-neutral-700/60">
                  {project.key}
                </span>
              </div>
              <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                {project.name}
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 text-neutral-400 hover:text-neutral-900 dark:hover:text-white rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 text-xs flex-1 max-h-[70vh] overflow-y-auto">
          {/* Invite Section (Leader only) */}
          {isLeader && (
            <div className="space-y-3">
              {/* Single Unified Search & Invite Bar */}
              <form onSubmit={handleUnifiedInvite} className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      if (feedback) setFeedback(null);
                    }}
                    placeholder={language === 'id' ? 'Cari nama, @username, atau email...' : 'Search name, @username, or email...'}
                    className="w-full h-9 pl-9 pr-3 rounded-xl text-xs bg-neutral-50 dark:bg-[#181a22] border border-neutral-200 dark:border-[#272a35] focus:outline-none focus:border-red-500 text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 transition-colors"
                  />
                </div>

                <select
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value as ProjectRole)}
                  className="h-9 px-2.5 rounded-xl text-xs bg-neutral-50 dark:bg-[#181a22] border border-neutral-200 dark:border-[#272a35] text-neutral-800 dark:text-neutral-200 focus:outline-none focus:border-red-500 cursor-pointer shrink-0"
                >
                  <option value="member">{t('roleMember')}</option>
                  <option value="leader">{t('roleLeader')}</option>
                  <option value="viewer">{t('roleViewer')}</option>
                </select>

                <button
                  type="submit"
                  disabled={!searchQuery.trim() || isSearching}
                  className="h-9 px-3.5 rounded-xl bg-red-600 hover:bg-red-700 active:scale-95 disabled:opacity-40 text-white font-semibold text-xs shadow-xs transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
                >
                  {isSearching ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <UserPlus className="w-3.5 h-3.5" />
                  )}
                  <span>{language === 'id' ? 'Undang' : 'Invite'}</span>
                </button>
              </form>

              {/* Feedback Alert Pill */}
              {feedback && (
                <div
                  className={`p-2.5 rounded-xl text-[11px] flex items-center gap-2 animate-in fade-in duration-150 ${
                    feedback.type === 'success'
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                      : feedback.type === 'info'
                      ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20'
                      : 'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20'
                  }`}
                >
                  {feedback.type === 'success' ? (
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  ) : (
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  )}
                  <span>{feedback.message}</span>
                </div>
              )}

              {/* Available Users Suggestions List (Clean & 1-Click Invite) */}
              {availableUsers.length > 0 && !isNewUserFormOpen && (
                <div className="rounded-xl border border-neutral-200/80 dark:border-[#272a35] bg-neutral-50/50 dark:bg-[#161822] overflow-hidden">
                  <div className="px-3 py-1.5 border-b border-neutral-200/60 dark:border-[#20232c] text-[10px] font-semibold text-neutral-400 uppercase tracking-wider">
                    {searchQuery.trim() ? (language === 'id' ? 'Hasil Pencarian' : 'Search Results') : (language === 'id' ? 'Akun Tersedia' : 'Available Accounts')}
                  </div>
                  <div className="max-h-36 overflow-y-auto divide-y divide-neutral-100 dark:divide-[#20232c]">
                    {availableUsers.map((user) => (
                      <div
                        key={user.id}
                        className="p-2 px-3 flex items-center justify-between hover:bg-neutral-100/80 dark:hover:bg-[#1e202c] transition-colors"
                      >
                        <div className="flex items-center gap-2.5 min-w-0 pr-2">
                          <UserAvatar
                            avatar={user.avatar}
                            name={user.name}
                            color={user.color}
                            className="w-6 h-6 text-[9px] shrink-0"
                          />
                          <div className="min-w-0">
                            <p className="font-semibold text-xs text-neutral-900 dark:text-neutral-100 truncate">
                              {user.name}
                            </p>
                            <p className="text-[10px] text-neutral-400 dark:text-neutral-500 truncate">
                              {user.username ? `@${user.username}` : user.email}
                            </p>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleDirectInvite(user.id)}
                          className="px-2.5 py-1 rounded-lg text-[11px] font-semibold text-red-600 dark:text-red-400 bg-red-500/10 hover:bg-red-500/20 transition-colors flex items-center gap-1 cursor-pointer shrink-0"
                        >
                          <Plus className="w-3 h-3 stroke-[2.5]" />
                          <span>{language === 'id' ? 'Pilih' : 'Select'}</span>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Toggle to register a completely new colleague */}
              <div className="flex items-center justify-between pt-0.5 text-[11px]">
                <span className="text-neutral-400">
                  {availableUsers.length === 0 && !searchQuery.trim()
                    ? (language === 'id' ? 'Semua akun terdaftar sudah tergabung dalam proyek ini.' : 'All registered accounts are already in this project.')
                    : (language === 'id' ? 'Pilih akun terdaftar di atas atau cari dengan email.' : 'Select an account above or search by email.')}
                </span>
                <button
                  type="button"
                  onClick={() => setIsNewUserFormOpen(!isNewUserFormOpen)}
                  className="font-semibold text-red-600 dark:text-red-400 hover:underline cursor-pointer ml-auto"
                >
                  {isNewUserFormOpen ? (language === 'id' ? 'Tutup Form' : 'Close Form') : (language === 'id' ? '+ Buat Akun Baru' : '+ Create New Account')}
                </button>
              </div>

              {/* Minimal inline form for brand new user registration */}
              {isNewUserFormOpen && (
                <form
                  onSubmit={handleCreateAndAddUser}
                  className="p-3.5 rounded-xl border border-neutral-200 dark:border-[#272a35] bg-neutral-50 dark:bg-[#181a22] space-y-2.5 animate-in fade-in duration-150"
                >
                  <p className="text-[11px] font-medium text-neutral-600 dark:text-neutral-300">
                    {language === 'id' ? 'Daftarkan rekan kerja yang belum memiliki akun MindWork:' : 'Register a colleague who does not have an account yet:'}
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      placeholder={t('fullNameLabel')}
                      value={newUserName}
                      onChange={(e) => setNewUserName(e.target.value)}
                      required
                      className="h-8 px-2.5 rounded-lg text-xs bg-white dark:bg-[#12141a] border border-neutral-200 dark:border-[#313543] focus:outline-none focus:border-red-500 text-neutral-900 dark:text-neutral-100"
                    />
                    <input
                      type="email"
                      placeholder={t('emailLabel')}
                      value={newUserEmail}
                      onChange={(e) => setNewUserEmail(e.target.value)}
                      required
                      className="h-8 px-2.5 rounded-lg text-xs bg-white dark:bg-[#12141a] border border-neutral-200 dark:border-[#313543] focus:outline-none focus:border-red-500 text-neutral-900 dark:text-neutral-100"
                    />
                  </div>
                  <div className="flex items-center justify-between gap-2 pt-1">
                    <select
                      value={newUserRole}
                      onChange={(e) => setNewUserRole(e.target.value as ProjectRole)}
                      className="h-8 px-2 rounded-lg text-xs bg-white dark:bg-[#12141a] border border-neutral-200 dark:border-[#313543] focus:outline-none focus:border-red-500 cursor-pointer text-neutral-800 dark:text-neutral-200"
                    >
                      <option value="member">{language === 'id' ? 'Peran: Anggota' : 'Role: Member'}</option>
                      <option value="leader">{language === 'id' ? 'Peran: Ketua' : 'Role: Leader'}</option>
                      <option value="viewer">{language === 'id' ? 'Peran: Peninjau' : 'Role: Viewer'}</option>
                    </select>

                    <button
                      type="submit"
                      className="h-8 px-3.5 rounded-lg bg-red-600 hover:bg-red-700 text-white font-semibold text-xs transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>{language === 'id' ? 'Daftarkan & Undang' : 'Register & Invite'}</span>
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* Current Project Members List */}
          <div className="space-y-2.5 pt-1">
            <div className="flex items-center justify-between text-neutral-500 dark:text-neutral-400 text-[11px] font-semibold border-b border-neutral-100 dark:border-[#20232c] pb-1.5">
              <span>{language === 'id' ? 'Anggota Proyek' : 'Project Members'} ({memberIds.length})</span>
              <span>{language === 'id' ? 'Hak Akses' : 'Access Role'}</span>
            </div>

            <div className="space-y-1.5">
              {memberIds.map((userId) => {
                const user = allUsers.find((u) => u.id === userId);
                if (!user) return null;
                const role = memberRoles[userId] || 'member';
                const isProjectCreator = userId === project.leaderId;
                const isSelf = user.id === currentUser.id;

                return (
                  <div
                    key={user.id}
                    className="flex items-center justify-between p-2.5 rounded-xl border border-neutral-200/80 dark:border-[#272a35] bg-neutral-50/40 dark:bg-[#161822] hover:border-neutral-300 dark:hover:border-[#333747] transition-colors"
                  >
                    <div className="flex items-center gap-2.5 min-w-0 pr-2">
                      <UserAvatar
                        avatar={user.avatar}
                        name={user.name}
                        color={user.color}
                        className="w-7 h-7 text-[10px] shrink-0"
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-neutral-900 dark:text-neutral-100 text-xs truncate">
                            {user.name}
                          </span>
                          {isSelf && (
                            <span className="text-[10px] text-neutral-400 font-normal">
                              {language === 'id' ? '(Anda)' : '(You)'}
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-neutral-400 dark:text-neutral-500 truncate">
                          {user.username ? `@${user.username}` : user.email}
                        </p>
                      </div>
                    </div>

                    {/* Role selector & Delete button */}
                    <div className="flex items-center gap-2 shrink-0">
                      {isLeader && !isProjectCreator ? (
                        <select
                          value={role}
                          onChange={(e) =>
                            handleChangeRole(user.id, e.target.value as ProjectRole)
                          }
                          className="h-7 px-2 text-[11px] font-semibold rounded-lg bg-white dark:bg-[#20232c] border border-neutral-200 dark:border-[#313543] text-neutral-800 dark:text-neutral-200 focus:outline-none focus:border-red-500 cursor-pointer"
                        >
                          <option value="leader">{t('roleLeader')}</option>
                          <option value="member">{t('roleMember')}</option>
                          <option value="viewer">{t('roleViewer')}</option>
                        </select>
                      ) : (
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold capitalize ${
                            role === 'leader'
                              ? 'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20'
                              : role === 'member'
                              ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20'
                              : 'bg-neutral-500/10 text-neutral-600 dark:text-neutral-400 border border-neutral-500/20'
                          }`}
                        >
                          {role === 'leader' ? (
                            <Crown className="w-2.5 h-2.5" />
                          ) : role === 'member' ? (
                            <Briefcase className="w-2.5 h-2.5" />
                          ) : (
                            <Eye className="w-2.5 h-2.5" />
                          )}
                          {isProjectCreator ? (language === 'id' ? 'Ketua Utama' : 'Main Leader') : (role === 'leader' ? t('roleLeader') : role === 'viewer' ? t('roleViewer') : t('roleMember'))}
                        </span>
                      )}

                      {isLeader && !isProjectCreator && (
                        <button
                          onClick={() => handleRemoveMember(user.id)}
                          title={language === 'id' ? 'Keluarkan dari proyek' : 'Remove from project'}
                          className="p-1 text-neutral-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-3.5 px-6 border-t border-neutral-200 dark:border-[#20232c] bg-neutral-50/50 dark:bg-[#12141a] flex items-center justify-between shrink-0">
          <span className="text-[11px] text-neutral-400">
            {language === 'id' ? 'Peran berlaku khusus untuk proyek ini.' : 'Roles apply specifically to this project.'}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleClose}
              className="px-3.5 py-1.5 rounded-xl text-xs font-medium text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors cursor-pointer"
            >
              {t('cancel')}
            </button>
            {isLeader && (
              <button
                type="button"
                onClick={handleSave}
                className="px-4 py-1.5 rounded-xl text-xs font-semibold bg-red-600 hover:bg-red-700 active:scale-95 text-white shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>{language === 'id' ? 'Simpan' : 'Save Changes'}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
