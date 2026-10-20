import React, { useState, useRef, useEffect } from 'react';
import { X, Camera, Image as ImageIcon, Trash2, Check, AlertTriangle, Sparkles, FolderEdit } from 'lucide-react';
import { Project, ProjectRole } from '../types';
import { useLanguage } from '../context/LanguageContext';
import { compressCoverBannerFile, compressImageFile } from '../utils/imageCompressor';
import { UNIVERSAL_CATEGORIES } from './NewProjectModal';
import { ConfirmModal } from './ConfirmModal';

interface EditProjectModalProps {
  project: Project;
  isOpen: boolean;
  onClose: () => void;
  onUpdateProject: (updatedProject: Project) => void;
  onDeleteProject?: (projectId: string) => void;
  currentUserRole?: ProjectRole;
}

export const EditProjectModal: React.FC<EditProjectModalProps> = ({
  project,
  isOpen,
  onClose,
  onUpdateProject,
  onDeleteProject,
  currentUserRole = 'leader',
}) => {
  const { t, language } = useLanguage();

  const [name, setName] = useState(project.name);
  const [description, setDescription] = useState(project.description || '');
  const [category, setCategory] = useState(
    UNIVERSAL_CATEGORIES.includes(project.category)
      ? project.category
      : 'Lainnya (Kustom)'
  );
  const [customCategory, setCustomCategory] = useState(
    UNIVERSAL_CATEGORIES.includes(project.category) ? '' : project.category
  );
  const [avatar, setAvatar] = useState(project.avatar || '');
  const [coverImage, setCoverImage] = useState(project.coverImage || '');
  const [isDeletingProject, setIsDeletingProject] = useState(false);
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  const coverInputRef = useRef<HTMLInputElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  // Sync state when project changes or modal opens
  useEffect(() => {
    if (isOpen) {
      setName(project.name);
      setDescription(project.description || '');
      const isKnownCategory = UNIVERSAL_CATEGORIES.includes(project.category);
      setCategory(isKnownCategory ? project.category : 'Lainnya (Kustom)');
      setCustomCategory(isKnownCategory ? '' : project.category);
      setAvatar(project.avatar || '');
      setCoverImage(project.coverImage || '');
      setIsDeletingProject(false);
    }
  }, [project, isOpen]);

  if (!isOpen) return null;

  const isLeader = currentUserRole === 'leader' || !project.leaderId;

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert(language === 'id' ? 'Silakan pilih berkas gambar.' : 'Please select an image file.');
      return;
    }

    try {
      setIsUploadingCover(true);
      const compressed = await compressCoverBannerFile(file);
      setCoverImage(compressed);
    } catch (err) {
      console.error('Error compressing banner:', err);
    } finally {
      setIsUploadingCover(false);
      if (e.target) e.target.value = '';
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert(language === 'id' ? 'Silakan pilih berkas gambar.' : 'Please select an image file.');
      return;
    }

    try {
      setIsUploadingAvatar(true);
      const compressed = await compressImageFile(file, 200);
      setAvatar(compressed);
    } catch (err) {
      console.error('Error compressing avatar:', err);
    } finally {
      setIsUploadingAvatar(false);
      if (e.target) e.target.value = '';
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const resolvedCategory =
      category === 'Lainnya (Kustom)' && customCategory.trim()
        ? customCategory.trim()
        : category;

    const updated: Project = {
      ...project,
      name: name.trim(),
      description: description.trim(),
      category: resolvedCategory,
      avatar: avatar || undefined,
      coverImage: coverImage || undefined,
    };

    onUpdateProject(updated);
    onClose();
  };

  return (
    <>
      <div
        onClick={onClose}
        className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in cursor-pointer select-none"
        role="dialog"
        aria-modal="true"
      >
        <div
          onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-lg rounded-[36px] bg-white dark:bg-[#151722] border border-neutral-200 dark:border-[#272b3a] shadow-2xl overflow-hidden my-auto cursor-default text-neutral-900 dark:text-neutral-100"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 px-6 border-b border-neutral-200/80 dark:border-[#252837] bg-neutral-50/70 dark:bg-[#12141c]">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-red-600/10 text-red-600 flex items-center justify-center">
                <FolderEdit className="w-4 h-4 stroke-[2.2]" />
              </div>
              <div>
                <h2 className="text-sm sm:text-base font-bold text-neutral-900 dark:text-white leading-tight">
                  {language === 'id' ? 'Edit Proyek' : 'Edit Project'}
                </h2>
                <p className="text-[11px] text-neutral-400">
                  {language === 'id' ? 'Perbarui informasi dan tampilan proyek' : 'Update project information and appearance'}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-full text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-[#202330] transition-colors cursor-pointer"
              aria-label="Tutup"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-5 space-y-4 max-h-[calc(88vh-120px)] overflow-y-auto text-xs">
            {/* 1. Project Banner Cover */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-semibold text-neutral-500 dark:text-neutral-400">
                {language === 'id' ? 'Sampul Proyek' : 'Project Cover Banner'}
              </label>
              <div className="relative w-full h-28 sm:h-32 rounded-xl overflow-hidden border border-neutral-200/80 dark:border-[#2b2f42] bg-neutral-100 dark:bg-[#12141c] group">
                {coverImage ? (
                  <img
                    src={coverImage}
                    alt="Cover preview"
                    className="w-full h-full object-cover object-center"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-r from-red-600/20 via-rose-600/20 to-amber-600/20 flex items-center justify-center text-neutral-400">
                    <ImageIcon className="w-8 h-8 opacity-40" />
                  </div>
                )}

                {/* Banner Action Buttons */}
                <div className="absolute bottom-2 right-2 flex items-center gap-1.5 z-10">
                  <button
                    type="button"
                    onClick={() => coverInputRef.current?.click()}
                    disabled={isUploadingCover}
                    className="px-2.5 py-1 rounded-lg bg-black/80 hover:bg-black text-white text-[11px] font-semibold flex items-center gap-1 shadow-md border border-white/10 transition-colors cursor-pointer"
                  >
                    <Camera className="w-3 h-3" />
                    <span>{isUploadingCover ? '...' : language === 'id' ? 'Ganti Sampul' : 'Change Cover'}</span>
                  </button>
                  {coverImage && (
                    <button
                      type="button"
                      onClick={() => setCoverImage('')}
                      title={language === 'id' ? 'Hapus Sampul' : 'Remove Cover'}
                      className="p-1 rounded-lg bg-black/80 hover:bg-red-600 text-white text-[11px] shadow-md border border-white/10 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>

                <input
                  ref={coverInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleCoverUpload}
                />
              </div>
            </div>

            {/* 2. Project Profile Photo / Avatar */}
            <div className="flex items-center gap-3.5 pt-1">
              <div className="relative w-16 h-16 rounded-2xl overflow-hidden border-2 border-white dark:border-[#151722] shadow-md bg-neutral-100 dark:bg-[#1e212f] shrink-0">
                {avatar ? (
                  <img src={avatar} alt="Project Avatar" className="w-full h-full object-cover" />
                ) : (
                  <div className={`w-full h-full ${project.iconColor || 'bg-red-600'} text-white flex items-center justify-center font-bold text-xl`}>
                    {name.trim() ? name.charAt(0).toUpperCase() : 'P'}
                  </div>
                )}
                {isUploadingAvatar && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-white text-[10px]">
                    ...
                  </div>
                )}
              </div>

              <div className="space-y-1">
                <span className="text-[11px] font-semibold text-neutral-700 dark:text-neutral-300 block">
                  {language === 'id' ? 'Foto Profil Proyek' : 'Project Avatar'}
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => avatarInputRef.current?.click()}
                    disabled={isUploadingAvatar}
                    className="px-2.5 py-1 rounded-lg bg-neutral-100 hover:bg-neutral-200 dark:bg-[#1e212f] dark:hover:bg-[#272b3c] border border-neutral-200 dark:border-[#2f3346] text-neutral-700 dark:text-neutral-300 font-semibold text-[11px] transition-colors cursor-pointer flex items-center gap-1"
                  >
                    <Camera className="w-3 h-3" />
                    <span>{language === 'id' ? 'Ganti Foto' : 'Change Photo'}</span>
                  </button>
                  {avatar && (
                    <button
                      type="button"
                      onClick={() => setAvatar('')}
                      className="px-2 py-1 rounded-lg text-red-500 hover:bg-red-500/10 font-semibold text-[11px] transition-colors cursor-pointer"
                    >
                      {language === 'id' ? 'Hapus' : 'Remove'}
                    </button>
                  )}
                </div>
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarUpload}
                />
              </div>
            </div>

            {/* 3. Project Name */}
            <div className="space-y-1 pt-1">
              <label className="block font-semibold text-neutral-700 dark:text-neutral-300">
                {language === 'id' ? 'Nama Proyek' : 'Project Name'} <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={language === 'id' ? 'Nama proyek...' : 'Project name...'}
                className="w-full h-9 px-3 rounded-xl bg-neutral-50 dark:bg-[#11131a] border border-neutral-200 dark:border-[#2a2d3d] focus:outline-none focus:border-red-500 text-neutral-900 dark:text-white font-medium text-xs sm:text-sm transition-colors"
              />
            </div>

            {/* 4. Project Category */}
            <div className="space-y-1">
              <label className="block font-semibold text-neutral-700 dark:text-neutral-300">
                {language === 'id' ? 'Kategori / Bidang' : 'Category / Field'}
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full h-9 px-2.5 rounded-xl bg-neutral-50 dark:bg-[#11131a] border border-neutral-200 dark:border-[#2a2d3d] focus:outline-none focus:border-red-500 text-neutral-900 dark:text-white font-medium text-xs cursor-pointer"
              >
                {UNIVERSAL_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat} className="dark:bg-[#151722]">
                    {cat}
                  </option>
                ))}
              </select>

              {category === 'Lainnya (Kustom)' && (
                <input
                  type="text"
                  value={customCategory}
                  onChange={(e) => setCustomCategory(e.target.value)}
                  placeholder={language === 'id' ? 'Tuliskan kategori kustom...' : 'Custom category name...'}
                  className="w-full h-9 px-3 rounded-xl bg-neutral-50 dark:bg-[#11131a] border border-neutral-200 dark:border-[#2a2d3d] focus:outline-none focus:border-red-500 text-neutral-900 dark:text-white text-xs mt-1.5"
                />
              )}
            </div>

            {/* 5. Project Description */}
            <div className="space-y-1">
              <label className="block font-semibold text-neutral-700 dark:text-neutral-300">
                {language === 'id' ? 'Deskripsi Proyek' : 'Project Description'}
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                placeholder={language === 'id' ? 'Tuliskan tujuan atau gambaran singkat proyek ini...' : 'Write project goals or brief summary...'}
                className="w-full p-2.5 rounded-xl bg-neutral-50 dark:bg-[#11131a] border border-neutral-200 dark:border-[#2a2d3d] focus:outline-none focus:border-red-500 text-neutral-900 dark:text-white text-xs leading-relaxed resize-none"
              />
            </div>

            {/* 6. Danger Zone: Delete Project (Leaders only) */}
            {isLeader && onDeleteProject && (
              <div className="pt-3 border-t border-neutral-200/70 dark:border-[#252837]">
                <div className="p-3 rounded-xl border border-red-500/20 bg-red-500/5 flex items-center justify-between gap-3">
                  <div>
                    <span className="font-bold text-red-600 dark:text-red-400 block text-xs">
                      {language === 'id' ? 'Hapus Proyek Ini' : 'Delete This Project'}
                    </span>
                    <span className="text-[10px] text-neutral-500 dark:text-neutral-400 leading-tight">
                      {language === 'id'
                        ? 'Menghapus proyek akan menghapus semua daftar dan kartu di dalamnya.'
                        : 'Deleting the project will permanently remove all its lists and cards.'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsDeletingProject(true)}
                    className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 active:scale-95 text-white font-semibold text-xs transition-colors shrink-0 cursor-pointer flex items-center gap-1 shadow-xs"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>{language === 'id' ? 'Hapus' : 'Delete'}</span>
                  </button>
                </div>
              </div>
            )}

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-neutral-200/80 dark:border-[#252837]">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-full text-xs font-semibold text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-[#1e212f] transition-colors cursor-pointer"
              >
                {t('cancel')}
              </button>
              <button
                type="submit"
                disabled={!name.trim()}
                className="px-5 py-2 rounded-full bg-red-600 hover:bg-red-700 active:scale-95 disabled:opacity-50 text-white text-xs font-semibold shadow-md shadow-red-600/25 transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>{language === 'id' ? 'Simpan Perubahan' : 'Save Changes'}</span>
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Delete Project Confirmation Dialog */}
      <ConfirmModal
        isOpen={isDeletingProject}
        onClose={() => setIsDeletingProject(false)}
        onConfirm={() => {
          if (onDeleteProject) {
            onDeleteProject(project.id);
            onClose();
          }
        }}
        title={language === 'id' ? 'Hapus Proyek Secara Permanen?' : 'Permanently Delete Project?'}
        message={
          language === 'id'
            ? 'Seluruh daftar, kartu, berkas, dan aktivitas di dalam proyek ini akan dihapus secara permanen dan tidak dapat dipulihkan.'
            : 'All lists, cards, attachments, and activities in this project will be permanently deleted and cannot be recovered.'
        }
        itemName={`Proyek: ${project.name}`}
        confirmText={language === 'id' ? 'Hapus Proyek' : 'Delete Project'}
      />
    </>
  );
};
