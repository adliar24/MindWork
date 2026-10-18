-- ==============================================================================
-- MINDWORK KANBAN & TEAM COLLABORATION
-- Supabase PostgreSQL Schema & Initial Seed Data
-- ==============================================================================
-- Jalankan skrip SQL ini di Supabase Dashboard -> SQL Editor -> Run
-- ==============================================================================

-- 1. TABEL PROFILES (Akun & Profil Pengguna - Peran/Role ditentukan di Proyek)
CREATE TABLE IF NOT EXISTS public.profiles (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  username TEXT DEFAULT '',
  avatar TEXT NOT NULL,
  role TEXT DEFAULT '',
  color TEXT NOT NULL DEFAULT 'bg-red-600 text-white',
  email TEXT NOT NULL UNIQUE,
  password TEXT DEFAULT '',
  is_online BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS password TEXT DEFAULT '';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS username TEXT DEFAULT '';
ALTER TABLE public.profiles ALTER COLUMN role DROP NOT NULL;
ALTER TABLE public.profiles ALTER COLUMN role SET DEFAULT '';

-- 2. TABEL PROJECTS (Proyek Tim)
CREATE TABLE IF NOT EXISTS public.projects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  key TEXT NOT NULL,
  category TEXT DEFAULT 'Umum',
  leader_id TEXT REFERENCES public.profiles(id) ON DELETE SET NULL,
  icon_color TEXT DEFAULT 'bg-red-600',
  avatar TEXT DEFAULT '',
  cover_image TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS avatar TEXT DEFAULT '';
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS cover_image TEXT DEFAULT '';

-- 3. TABEL PROJECT_MEMBERS (Relasi Anggota & Peran Proyek: Leader / Member / Viewer)
CREATE TABLE IF NOT EXISTS public.project_members (
  id BIGSERIAL PRIMARY KEY,
  project_id TEXT REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id TEXT REFERENCES public.profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('leader', 'member', 'viewer')),
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(project_id, user_id)
);

-- 4. TABEL TASKS (Kartu Tugas Kanban)
CREATE TABLE IF NOT EXISTS public.tasks (
  id TEXT PRIMARY KEY,
  project_id TEXT REFERENCES public.projects(id) ON DELETE CASCADE,
  column_id TEXT NOT NULL CHECK (column_id IN ('todo', 'in_progress', 'in_review', 'done')),
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  priority TEXT NOT NULL CHECK (priority IN ('Tinggi', 'Sedang', 'Rendah')),
  assignee_id TEXT REFERENCES public.profiles(id) ON DELETE SET NULL,
  due_date TEXT DEFAULT '',
  tags JSONB DEFAULT '[]'::jsonb,
  attachments JSONB DEFAULT '[]'::jsonb,
  comments JSONB DEFAULT '[]'::jsonb,
  activities JSONB DEFAULT '[]'::jsonb,
  checklist JSONB DEFAULT '[]'::jsonb,
  external_links JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- Aktifkan akses baca & tulis untuk anon / authenticated
-- ==============================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- Profiles: Allow full access
DROP POLICY IF EXISTS "Public access profiles" ON public.profiles;
CREATE POLICY "Public access profiles" ON public.profiles FOR ALL USING (true) WITH CHECK (true);

-- Projects: Allow full access
DROP POLICY IF EXISTS "Public access projects" ON public.projects;
CREATE POLICY "Public access projects" ON public.projects FOR ALL USING (true) WITH CHECK (true);

-- Project Members: Allow full access
DROP POLICY IF EXISTS "Public access project_members" ON public.project_members;
CREATE POLICY "Public access project_members" ON public.project_members FOR ALL USING (true) WITH CHECK (true);

-- Tasks: Allow full access
DROP POLICY IF EXISTS "Public access tasks" ON public.tasks;
CREATE POLICY "Public access tasks" ON public.tasks FOR ALL USING (true) WITH CHECK (true);

-- ==============================================================================
-- REALTIME REPLICATION
-- Aktifkan Realtime Channel agar perubahan kartu / proyek live sync ke semua anggota
DO $$
BEGIN
  -- Pastikan publikasi realtime ada
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    CREATE PUBLICATION supabase_realtime;
  END IF;

  -- Daftarkan tabel ke publikasi realtime
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE 
      public.profiles, 
      public.projects, 
      public.project_members, 
      public.tasks;
  EXCEPTION
    WHEN duplicate_object THEN
      NULL; -- Tabel sudah terdaftar di publikasi
  END;
END $$;

-- ==============================================================================
-- PEMBERSIHAN DATA DUMMY (Memastikan database bersih & kosong untuk akun baru Anda)
-- ==============================================================================
DELETE FROM public.tasks WHERE project_id IN ('proj-1', 'proj-2', 'proj-3');
DELETE FROM public.project_members WHERE project_id IN ('proj-1', 'proj-2', 'proj-3');
DELETE FROM public.projects WHERE id IN ('proj-1', 'proj-2', 'proj-3');
DELETE FROM public.project_members WHERE user_id LIKE 'user-%';
DELETE FROM public.profiles WHERE id LIKE 'user-%';

-- Selesai! Schema database Supabase siap digunakan untuk akun & proyek baru Anda yang bersih.
