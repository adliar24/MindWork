import React, { useState } from 'react';
import { X, FolderPlus, Layers, Users } from 'lucide-react';
import { Project, ProjectRole, User } from '../types';
import { UserAvatar } from './UserAvatar';
import { useLanguage } from '../context/LanguageContext';

interface NewProjectModalProps {
  users: User[];
  currentUser?: User;
  onClose: () => void;
  onCreateProject: (project: Project) => void;
}

export const UNIVERSAL_CATEGORIES = [
  'Umum & Kolaborasi',
  'Teknologi & IT',
  'Desain & Kreatif',
  'Pemasaran & Bisnis',
  'Operasional & Acara',
  'Produk & Riset',
  'Pendidikan & Akademik',
  'Keuangan & Finansial',
  'Pribadi & Produktivitas',
  'Lainnya (Kustom)',
];

export const NewProjectModal: React.FC<NewProjectModalProps> = ({
  users,
  currentUser,
  onClose,
  onCreateProject,
}) => {
  const { t } = useLanguage();
  const [name, setName] = useState('');
  const [key, setKey] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState(UNIVERSAL_CATEGORIES[0]);
  const [customCategory, setCustomCategory] = useState('');
  const [selectedMembers, setSelectedMembers] = useState<string[]>(
    currentUser?.id ? [currentUser.id] : []
  );

  const toggleMember = (id: string) => {
    setSelectedMembers((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]
    );
  };

  // Exit animation state
  const [isClosing, setIsClosing] = useState(false);

  const handleClose = () => {
    if (isClosing) return;
    setIsClosing(true);
    setTimeout(() => {
      onClose();
    }, 180);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const creatorId = currentUser?.id || users[0]?.id || 'user-1';
    const finalMemberIds = selectedMembers.includes(creatorId)
      ? selectedMembers
      : [creatorId, ...selectedMembers];

    const initialRoles: Record<string, ProjectRole> = {};
    finalMemberIds.forEach((mId) => {
      initialRoles[mId] = mId === creatorId ? 'leader' : 'member';
    });

    const projectKey = key.trim() || name.substring(0, 4).toUpperCase();
    const resolvedCategory =
      category === 'Lainnya (Kustom)' && customCategory.trim()
        ? customCategory.trim()
        : category;

    const newProject: Project = {
      id: `proj-${Date.now()}`,
      name: name.trim(),
      description: description.trim(),
      key: projectKey,
      category: resolvedCategory,
      leaderId: creatorId,
      memberIds: finalMemberIds,
      memberRoles: initialRoles,
      iconColor: 'bg-red-600',
    };

    onCreateProject(newProject);
    handleClose();
  };

  return (
    <div
      onClick={handleClose}
      className={`fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-sm overflow-y-auto cursor-pointer ${
        isClosing ? 'animate-backdrop-out' : 'animate-in fade-in'
      }`}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`w-full max-w-md max-h-[92vh] flex flex-col rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-2xl overflow-hidden text-neutral-900 dark:text-neutral-100 cursor-default ${
          isClosing ? 'animate-modal-out' : 'animate-modal-in'
        }`}
      >
        <div className="p-4 px-5 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-red-600 text-white flex items-center justify-center font-bold">
              <FolderPlus className="w-4 h-4 stroke-[2.2]" />
            </div>
            <h3 className="text-sm font-bold text-neutral-900 dark:text-white">
              {t('newProjectModalTitle')}
            </h3>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 text-neutral-400 hover:text-neutral-900 dark:hover:text-white rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-4 text-xs overflow-y-auto flex-1">
          <div>
            <label className="block font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
              {t('projectNameLabel')} <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (!key) {
                  setKey(e.target.value.substring(0, 4).toUpperCase());
                }
              }}
              placeholder={t('projectNamePlaceholder')}
              className="w-full h-9 px-3 rounded-lg bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 focus:outline-none focus:border-red-500 text-neutral-900 dark:text-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                {t('projectKeyLabel')}
              </label>
              <input
                type="text"
                value={key}
                onChange={(e) => setKey(e.target.value.toUpperCase())}
                placeholder={t('projectKeyPlaceholder')}
                maxLength={6}
                className="w-full h-9 px-3 rounded-lg bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 focus:outline-none focus:border-red-500 text-neutral-900 dark:text-white font-mono uppercase"
              />
            </div>
            <div>
              <label className="block font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                {t('categoryLabel')}
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full h-9 px-2.5 rounded-lg bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 focus:outline-none focus:border-red-500 text-neutral-900 dark:text-white cursor-pointer"
              >
                {UNIVERSAL_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {category === 'Lainnya (Kustom)' && (
            <div>
              <label className="block font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                {t('customCategoryPlaceholder')}
              </label>
              <input
                type="text"
                required
                value={customCategory}
                onChange={(e) => setCustomCategory(e.target.value)}
                placeholder="Contoh: Riset AI, Proyek Pribadi, Agensi"
                className="w-full h-9 px-3 rounded-lg bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 focus:outline-none focus:border-red-500 text-neutral-900 dark:text-white"
              />
            </div>
          )}

          <div>
            <label className="block font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
              {t('descLabel')}
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t('descPlaceholder')}
              className="w-full p-2.5 rounded-lg bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 focus:outline-none focus:border-red-500 text-neutral-900 dark:text-white resize-none"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block font-semibold text-neutral-700 dark:text-neutral-300">
                {t('teamMembersLabel')}
              </label>
            </div>
            <div className="max-h-36 overflow-y-auto space-y-1 p-2 rounded-lg bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700">
              {users.map((u) => {
                const isSelected = selectedMembers.includes(u.id);
                const isSelf = u.id === currentUser?.id;
                return (
                  <label
                    key={u.id}
                    className="flex items-center justify-between p-1.5 rounded hover:bg-neutral-200/50 dark:hover:bg-neutral-700/50 cursor-pointer"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <UserAvatar
                        avatar={u.avatar}
                        name={u.name}
                        color={u.color}
                        className="w-5 h-5 text-[9px]"
                      />
                      <span className="font-medium text-neutral-800 dark:text-neutral-200 truncate">
                        {u.name} {isSelf && <span className="text-neutral-400 text-[10px] font-normal">({t('roleLeader')})</span>}
                      </span>
                    </div>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      disabled={isSelf}
                      onChange={() => toggleMember(u.id)}
                      className="accent-red-600 w-3.5 h-3.5 cursor-pointer disabled:opacity-60"
                    />
                  </label>
                );
              })}
            </div>
          </div>

          <div className="pt-2 flex items-center justify-end gap-2 border-t border-neutral-200 dark:border-neutral-800">
            <button
              type="button"
              onClick={handleClose}
              className="px-3.5 py-1.5 rounded-lg font-medium text-neutral-500 hover:text-neutral-800 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
            >
              {t('cancel')}
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 rounded-lg font-semibold bg-red-600 hover:bg-red-700 text-white shadow-xs shadow-red-600/30 flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <span>{t('createProjectBtn')}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
