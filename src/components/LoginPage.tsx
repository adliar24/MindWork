import React, { useState, useRef } from 'react';
import {
  Layers,
  Eye,
  EyeOff,
  AlertCircle,
  Sun,
  Moon,
  Camera,
  Loader2,
} from 'lucide-react';
import { User } from '../types';
import { AvatarPickerModal, PROFILE_ICONS } from './AvatarPickerModal';
import {
  saveCloudUser,
  findCloudUserByIdentifier,
  registerCloudAccount,
} from '../lib/supabaseService';
import { useLanguage } from '../context/LanguageContext';

interface LoginPageProps {
  users: User[];
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  onLogin: (user: User) => void;
  onRegister: (newUser: User) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({
  users,
  theme,
  onToggleTheme,
  onLogin,
  onRegister,
}) => {
  const { t, language } = useLanguage();
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');

  // Form states
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  const [regName, setRegName] = useState('');
  const [regUsername, setRegUsername] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [regError, setRegError] = useState<string | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Character Avatar selection
  const [selectedAvatar, setSelectedAvatar] = useState(PROFILE_ICONS[0]);
  const [isAvatarPickerOpen, setIsAvatarPickerOpen] = useState(false);

  const passwordInputRef = useRef<HTMLInputElement>(null);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);

    const identifier = loginEmail.trim().toLowerCase().replace(/^@/, '');
    if (!identifier) {
      setLoginError('Masukkan email atau username Anda.');
      return;
    }

    if (!loginPassword) {
      setLoginError('Masukkan kata sandi akun Anda.');
      return;
    }

    setIsSubmitting(true);

    try {
      // 1. Try local memory/localStorage users first
      let matchedUser = users.find(
        (u) =>
          u.email.toLowerCase() === identifier ||
          (u.username && u.username.toLowerCase().replace(/^@/, '') === identifier)
      );

      // 2. If not found locally, query Supabase profiles
      if (!matchedUser) {
        const cloudUser = await findCloudUserByIdentifier(identifier);
        if (cloudUser) {
          matchedUser = cloudUser;
          onRegister(cloudUser);
        }
      }

      if (!matchedUser) {
        setLoginError('Email atau username belum terdaftar. Silakan periksa kembali.');
        setIsSubmitting(false);
        return;
      }

      // Check password
      if (matchedUser.password && matchedUser.password !== loginPassword) {
        setLoginError('Kata sandi salah. Silakan coba lagi.');
        setIsSubmitting(false);
        return;
      }

      onLogin(matchedUser);
    } catch (err) {
      console.error('Login error:', err);
      setLoginError('Terjadi kesalahan saat masuk. Coba lagi.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegError(null);

    if (!regName.trim() || !regEmail.trim()) {
      setRegError('Nama dan email wajib diisi.');
      return;
    }

    const cleanUsername = regUsername.trim().toLowerCase().replace(/^@/, '');
    if (
      cleanUsername &&
      users.some(
        (u) => u.username?.toLowerCase().replace(/^@/, '') === cleanUsername
      )
    ) {
      setRegError('Username ini sudah digunakan. Silakan pilih username lain.');
      return;
    }

    if (!regPassword || regPassword.length < 6) {
      setRegError('Kata sandi minimal 6 karakter.');
      return;
    }

    const emailToCheck = regEmail.trim().toLowerCase();
    if (users.some((u) => u.email.toLowerCase() === emailToCheck)) {
      setRegError('Email sudah terdaftar. Silakan masuk.');
      return;
    }

    setIsSubmitting(true);

    try {
      // Verify against Supabase in case another device registered it
      const existingCloudEmail = await findCloudUserByIdentifier(emailToCheck);
      if (existingCloudEmail) {
        setRegError('Email sudah terdaftar di Supabase. Silakan masuk.');
        setIsSubmitting(false);
        return;
      }

      if (cleanUsername) {
        const existingCloudUser = await findCloudUserByIdentifier(cleanUsername);
        if (existingCloudUser) {
          setRegError('Username sudah terdaftar di Supabase. Silakan gunakan username lain.');
          setIsSubmitting(false);
          return;
        }
      }

      // Simpan langsung ke Supabase Auth & Tabel Profiles
      const result = await registerCloudAccount({
        name: regName.trim(),
        username: cleanUsername || undefined,
        avatar: selectedAvatar,
        email: regEmail.trim(),
        password: regPassword,
      });

      if (!result.success || !result.user) {
        setRegError(`Gagal menyimpan akun ke Supabase: ${result.error || 'Silakan coba lagi.'}`);
        setIsSubmitting(false);
        return;
      }

      // Berhasil terdaftar di Supabase -> langsung masuk ke dashboard
      onRegister(result.user);
      onLogin(result.user);
    } catch (err: any) {
      console.error('Registration error:', err);
      setRegError(`Terjadi kesalahan saat pendaftaran: ${err?.message || 'Coba lagi.'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className={`min-h-screen w-full flex flex-col justify-between transition-colors duration-200 ${
        theme === 'dark'
          ? 'bg-[#090a0d] text-neutral-100 dark'
          : 'bg-[#f4f5f8] text-neutral-900'
      }`}
    >
      {/* Minimal Top Header */}
      <header className="h-16 px-6 sm:px-10 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-red-600 text-white flex items-center justify-center font-bold shadow-xs">
            <Layers className="w-4 h-4 stroke-[2.2]" />
          </div>
          <span className="font-bold tracking-tight text-sm text-neutral-900 dark:text-white">
            MindWork
          </span>
        </div>

        <button
          onClick={onToggleTheme}
          title={theme === 'dark' ? t('themeDark') : t('themeLight')}
          className="w-8 h-8 rounded-lg flex items-center justify-center border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#14161d] text-neutral-500 hover:text-neutral-900 dark:hover:text-white transition-colors cursor-pointer"
        >
          {theme === 'dark' ? (
            <Sun className="w-3.5 h-3.5 text-amber-400" />
          ) : (
            <Moon className="w-3.5 h-3.5 text-neutral-600" />
          )}
        </button>
      </header>

      {/* Center Auth Card */}
      <main className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-[380px]">
          {/* Brand Heading */}
          <div className="text-center mb-6">
            <h1 className="text-xl font-bold tracking-tight text-neutral-900 dark:text-white">
              {activeTab === 'login' ? t('signInTitle') : t('signUpTitle')}
            </h1>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
              {activeTab === 'login'
                ? t('signInSubtitle')
                : t('signUpSubtitle')}
            </p>
          </div>

          {/* Form Card */}
          <div className="rounded-2xl border border-neutral-200 dark:border-[#242731] bg-white dark:bg-[#12141a] shadow-sm p-6 space-y-5">
            {/* Tab Buttons */}
            <div className="grid grid-cols-2 p-1 bg-neutral-100 dark:bg-[#1a1c24] rounded-xl text-xs font-semibold">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('login');
                  setLoginError(null);
                  setRegError(null);
                }}
                className={`py-1.5 rounded-lg transition-all cursor-pointer ${
                  activeTab === 'login'
                    ? 'bg-white dark:bg-[#262934] text-neutral-900 dark:text-white shadow-xs'
                    : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
                }`}
              >
                {t('signInTitle')}
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab('register');
                  setLoginError(null);
                  setRegError(null);
                }}
                className={`py-1.5 rounded-lg transition-all cursor-pointer ${
                  activeTab === 'register'
                    ? 'bg-white dark:bg-[#262934] text-neutral-900 dark:text-white shadow-xs'
                    : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
                }`}
              >
                {language === 'id' ? 'Daftar' : 'Register'}
              </button>
            </div>

            {/* TAB: LOGIN */}
            {activeTab === 'login' && (
              <div className="space-y-4 tab-transition">
                {loginError && (
                  <div className="p-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs flex items-center gap-2">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <p>{loginError}</p>
                  </div>
                )}

                <form onSubmit={handleLoginSubmit} className="space-y-3.5">
                  <div>
                    <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
                      {t('emailLabel')} / Username
                    </label>
                    <input
                      type="text"
                      required
                      value={loginEmail}
                      onChange={(e) => {
                        setLoginEmail(e.target.value);
                        if (loginError) setLoginError(null);
                      }}
                      placeholder={language === 'id' ? "nama@email.com atau @username" : "name@email.com or @username"}
                      className="w-full h-9 px-3 rounded-lg text-xs bg-neutral-50 dark:bg-[#181a22] border border-neutral-200 dark:border-[#272a35] focus:outline-none focus:border-red-500 text-neutral-900 dark:text-white transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
                      {t('passwordLabel')}
                    </label>
                    <div className="relative">
                      <input
                        ref={passwordInputRef}
                        type={showLoginPassword ? 'text' : 'password'}
                        required
                        value={loginPassword}
                        onChange={(e) => {
                          setLoginPassword(e.target.value);
                          if (loginError) setLoginError(null);
                        }}
                        placeholder={language === 'id' ? "Masukkan kata sandi" : "Enter password"}
                        className="w-full h-9 pl-3 pr-9 rounded-lg text-xs bg-neutral-50 dark:bg-[#181a22] border border-neutral-200 dark:border-[#272a35] focus:outline-none focus:border-red-500 text-neutral-900 dark:text-white transition-colors"
                      />
                      <button
                        type="button"
                        onClick={() => setShowLoginPassword(!showLoginPassword)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 cursor-pointer p-1"
                        title={showLoginPassword ? (language === 'id' ? 'Sembunyikan sandi' : 'Hide password') : (language === 'id' ? 'Lihat sandi' : 'Show password')}
                        tabIndex={-1}
                      >
                        {showLoginPassword ? (
                          <EyeOff className="w-3.5 h-3.5" />
                        ) : (
                          <Eye className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full h-9 rounded-lg bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white font-semibold text-xs transition-colors cursor-pointer flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>{language === 'id' ? 'Memverifikasi...' : 'Verifying...'}</span>
                      </>
                    ) : (
                      t('loginBtn')
                    )}
                  </button>

                  <p className="text-center text-xs text-neutral-500 dark:text-neutral-400 pt-1">
                    {language === 'id' ? 'Belum punya akun? ' : "Don't have an account? "}
                    <button
                      type="button"
                      onClick={() => {
                        setActiveTab('register');
                        setLoginError(null);
                        setRegError(null);
                      }}
                      className="text-red-600 dark:text-red-400 font-semibold hover:underline cursor-pointer"
                    >
                      {language === 'id' ? 'Daftar sekarang' : 'Register now'}
                    </button>
                  </p>
                </form>
              </div>
            )}

            {/* TAB: REGISTER */}
            {activeTab === 'register' && (
              <div className="space-y-4 tab-transition">
                {regError && (
                  <div className="p-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs flex items-center gap-2">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <p>{regError}</p>
                  </div>
                )}

                <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
                  {/* Minimalist Profile Avatar Selector */}
                  <div className="flex flex-col items-center justify-center pt-0.5 pb-1">
                    <button
                      type="button"
                      onClick={() => setIsAvatarPickerOpen(true)}
                      className="relative group cursor-pointer focus:outline-none"
                      title={t('changeAvatar')}
                    >
                      <div className="w-16 h-16 rounded-full overflow-hidden bg-neutral-100 dark:bg-[#181a22] border-2 border-neutral-200 dark:border-[#272a35] group-hover:border-red-500 transition-all p-1 shadow-xs">
                        <img
                          src={selectedAvatar}
                          alt="Avatar terpilih"
                          className="w-full h-full object-contain select-none group-hover:scale-105 transition-transform"
                        />
                      </div>
                      <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-red-600 text-white flex items-center justify-center shadow-xs group-hover:scale-110 transition-transform">
                        <Camera className="w-3 h-3" />
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsAvatarPickerOpen(true)}
                      className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400 hover:text-red-500 dark:hover:text-red-400 transition-colors mt-1.5 cursor-pointer"
                    >
                      {t('changeAvatar')}
                    </button>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                      {t('fullNameLabel')} <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={regName}
                      onChange={(e) => setRegName(e.target.value)}
                      placeholder={t('fullNamePlaceholder')}
                      className="w-full h-9 px-3 rounded-lg text-xs bg-neutral-50 dark:bg-[#181a22] border border-neutral-200 dark:border-[#272a35] focus:outline-none focus:border-red-500 text-neutral-900 dark:text-white transition-colors"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300">
                        {t('accountUsername')}
                      </label>
                      <span className="text-[10px] text-neutral-400 font-normal">{t('optionalBadge')}</span>
                    </div>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 text-xs font-semibold">
                        @
                      </span>
                      <input
                        type="text"
                        value={regUsername}
                        onChange={(e) => {
                          setRegUsername(e.target.value.replace(/\s+/g, '').toLowerCase());
                          if (regError) setRegError(null);
                        }}
                        placeholder="username"
                        className="w-full h-9 pl-7 pr-3 rounded-lg text-xs bg-neutral-50 dark:bg-[#181a22] border border-neutral-200 dark:border-[#272a35] focus:outline-none focus:border-red-500 text-neutral-900 dark:text-white transition-colors"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                      {t('emailLabel')} <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      required
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      placeholder={t('emailPlaceholder')}
                      className="w-full h-9 px-3 rounded-lg text-xs bg-neutral-50 dark:bg-[#181a22] border border-neutral-200 dark:border-[#272a35] focus:outline-none focus:border-red-500 text-neutral-900 dark:text-white transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                      {t('passwordLabel')} <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type={showRegPassword ? 'text' : 'password'}
                        required
                        value={regPassword}
                        onChange={(e) => {
                          setRegPassword(e.target.value);
                          if (regError) setRegError(null);
                        }}
                        placeholder={t('passwordPlaceholder')}
                        className="w-full h-9 pl-3 pr-9 rounded-lg text-xs bg-neutral-50 dark:bg-[#181a22] border border-neutral-200 dark:border-[#272a35] focus:outline-none focus:border-red-500 text-neutral-900 dark:text-white transition-colors"
                      />
                      <button
                        type="button"
                        onClick={() => setShowRegPassword(!showRegPassword)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 cursor-pointer p-1"
                        title={showRegPassword ? (language === 'id' ? 'Sembunyikan sandi' : 'Hide password') : (language === 'id' ? 'Lihat sandi' : 'Show password')}
                        tabIndex={-1}
                      >
                        {showRegPassword ? (
                          <EyeOff className="w-3.5 h-3.5" />
                        ) : (
                          <Eye className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full h-9 mt-1 rounded-lg bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white font-semibold text-xs transition-colors cursor-pointer flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>{language === 'id' ? 'Mendaftarkan akun...' : 'Registering account...'}</span>
                      </>
                    ) : (
                      language === 'id' ? 'Daftar Akun' : 'Create Account'
                    )}
                  </button>

                  <p className="text-center text-xs text-neutral-500 dark:text-neutral-400 pt-1">
                    {language === 'id' ? 'Sudah punya akun? ' : 'Already have an account? '}
                    <button
                      type="button"
                      onClick={() => {
                        setActiveTab('login');
                        setLoginError(null);
                        setRegError(null);
                      }}
                      className="text-red-600 dark:text-red-400 font-semibold hover:underline cursor-pointer"
                    >
                      {language === 'id' ? 'Masuk sekarang' : 'Sign in'}
                    </button>
                  </p>
                </form>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Blank clean footer space */}
      <footer className="h-10" />

      {/* Avatar Picker Modal */}
      <AvatarPickerModal
        isOpen={isAvatarPickerOpen}
        selectedAvatar={selectedAvatar}
        onSelectAvatar={setSelectedAvatar}
        onClose={() => setIsAvatarPickerOpen(false)}
      />
    </div>
  );
};
