# 📐 PANDUAN DESAIN UI & UX (DESIGN SYSTEM & GUIDELINES)
### MindWork Kanban & Team Collaboration Workspace

> **Visi Desain:**  
> Menghadirkan antarmuka kerja tim yang **Selaras (Harmonious)**, **Simpel (Minimalist)**, **Profesional (Executive-grade)**, dan **Clean (Bebas dari visual clutter)**. Setiap elemen visual harus memiliki tujuan jelas, tidak membingungkan pengguna, dan nyaman digunakan berjam-jam baik dalam mode terang (*Light Mode*) maupun gelap (*Dark Mode*).

---

## 1. Filosofi & Prinsip Utama Desain

1. **Clean & Uncluttered (Bebas Kebisingan Visual)**
   - Hilangkan ornamen dekoratif berlebih, tombol bertumpuk, atau badge yang berulang.
   - Berikan ruang bernapas (*whitespace / padding*) yang proporsional agar mata fokus pada konten tugas dan hasil kerja tim.

2. **Simpel & Intuitif (Zero Learning Curve)**
   - Informasi penting harus langsung terbaca tanpa memerlukan banyak klik.
   - Hierarki visual jelas: Judul Tugas > Status & Prioritas > Detail/Checklist > Metadata Pendukung.

3. **Profesional & Elegan (Executive Quality)**
   - Menggunakan palet warna netral yang tenang dengan aksen merah *Vermilion/Crimson* yang tegas dan terukur.
   - Tipografi modern (*Plus Jakarta Sans / Inter*) dengan kontras rasio yang memenuhi standar aksesibilitas WCAG AA.

4. **Selaras & Konsisten (Design Consistency)**
   - Semua modal (*dialog*), kartu (*kanban cards*), dropdown, dan form harus mematuhi token desain, sudut lengkung (*border-radius*), dan pola interaksi yang seragam di seluruh aplikasi.

5. **Sinkronisasi Data Multi-Device Tanpa Hambatan**
   - Data visual seperti **Foto Profil Akun** dan **Gambar Sampul Proyek** bukan hanya tersimpan di browser lokal (*localStorage*), melainkan wajib tersinkronisasi dua arah ke database Supabase Cloud sehingga identik di semua perangkat (laptop, tablet, HP, komputer kantor).

---

## 2. Sistem Warna (Color Palette & Semantic Tokens)

### 2.1 Warna Aksen & Brand (Primary Accent)
- **Primary Red:** `#dc2626` (Tailwind `red-600`) / Hover: `#b91c1c` (`red-700`)
- **Accent Soft:** `rgba(220, 38, 38, 0.08)` (Light) / `rgba(220, 38, 38, 0.15)` (Dark)
- **Border Focus Ring:** `#ef4444` (`red-500`)

### 2.2 Warna Netral & Permukaan (Surfaces & Backgrounds)
| Elemen UI | Mode Terang (Light Mode) | Mode Gelap (Dark Mode) |
| :--- | :--- | :--- |
| **App Background** | `#f8fafc` (Slate 50) / `#f1f5f9` (Slate 100) | `#090a0f` (Deep Obsidian) |
| **Sidebar / Header** | `#ffffff` (Pure White) | `#0f1117` (Dark Charcoal) |
| **Kanban Column** | `#f1f4f8` / `#f3f4f6` (Airy Gray) | `#14161f` (Soft Navy Charcoal) |
| **Card / Modal Surface** | `#ffffff` (White, shadow-xs) | `#181a24` (Elevated Surface) |
| **Border Utama** | `#e2e8f0` (Neutral 200) | `#262936` (Neutral 800) |
| **Border Halus** | `#f1f5f9` (Neutral 100) | `#1e212b` (Neutral 850) |

### 2.3 Status Tugas Kanban (Semantic Statuses)
- **To Do (Rencana):**  
  Titik Status: `#94a3b8` (Slate 400) | Teks: `text-neutral-600 dark:text-neutral-400`
- **In Progress (Sedang Dikerjakan):**  
  Titik Status: `#dc2626` (Red 600) | Teks: `text-red-600 dark:text-red-400` | Badge: `bg-red-500/10 text-red-600`
- **In Review (Pemeriksaan):**  
  Titik Status: `#f59e0b` (Amber 500) | Teks: `text-amber-600 dark:text-amber-400` | Badge: `bg-amber-500/10 text-amber-600`
- **Done (Selesai):**  
  Titik Status: `#10b981` (Emerald 500) | Teks: `text-emerald-600 dark:text-emerald-400` | Badge: `bg-emerald-500/10 text-emerald-600`

### 2.4 Prioritas Tugas (Priority Levels)
- **Tinggi (High):** `#ef4444` (Merah cerah) dengan ikon peringatan halus.
- **Sedang (Medium):** `#f59e0b` (Kuning amber) dengan indikator baris seimbang.
- **Rendah (Low):** `#64748b` (Slate netral) dengan indikator ringkas.

---

## 3. Tipografi & Hierarki Teks (Typography Hierarchy)

Font utama: `'Plus Jakarta Sans', system-ui, -apple-system, sans-serif`.

| Kategori | Ukuran | Ketebalan (*Weight*) | Penggunaan |
| :--- | :--- | :--- | :--- |
| **Heading 1 (Page / Modal Title)** | `1.25rem` (20px) | `700` (Bold) | Judul Tugas Utama di Modal, Nama Proyek |
| **Heading 2 (Section Title)** | `0.875rem` (14px) | `600` (Semi-bold) | Judul Bagian (Lampiran, Checklist, Diskusi) |
| **Column Header** | `0.75rem` (12px) | `700` (Bold, Uppercase) | Header Kolom Kanban (TO DO, IN PROGRESS, dll) |
| **Body Primary** | `0.875rem` (14px) | `400` (Regular) / `500` (Medium) | Judul Kartu Kanban, Isi Deskripsi, Komentar |
| **Body Secondary** | `0.75rem` (12px) | `400` (Regular) | Teks bantuan, status form, nama pengunggah |
| **Metadata / Badge** | `0.6875rem` (11px) | `600` (Semi-bold) | Kode Proyek (`#KEY`), Tanggal, Ukuran File |

---

## 4. Standar Tampilan Papan Kanban (Kanban Board UI/UX)

### 4.1 Header Proyek (Project Banner & Identity)
- **Ringkas & Fungsional:** Jangan biarkan banner raksasa menghabiskan layar vertikal.
- **Tinggi Banner:** Maksimal `110px - 140px` dengan sudut membulat `rounded-2xl`, dilengkapi *gradient overlay* halus agar teks dan aksi tetap kontras.
- **Fitur Collapse/Expand:** Pengguna dapat memperkecil banner kapan saja jika ingin fokus penuh pada kartu tugas.
- **Integrasi Identitas Proyek:** Avatar proyek, nama proyek, key proyek, dan daftar avatar tim diletakkan secara elegan di satu baris yang teratur.

### 4.2 Kolom Kanban (Board Columns)
- Lebar kolom: `320px` (desktop), responsif `85vw` (mobile).
- Latar belakang kolom harus lembut (*soft airy*), bukan gelap pekat atau terlalu kontras.
- Sudut membulat: `rounded-2xl border border-neutral-200/80 dark:border-neutral-800/80`.
- Indikator status kolom menggunakan titik warna (*status dot*) + nama kolom huruf kapital + pill jumlah tugas.
- Tombol `+ Tambah Tugas` ada di header kolom dan footer kolom untuk kemudahan akses cepat.

### 4.3 Kartu Tugas (Kanban Card UI)
- Kartu tugas harus tampak bersih (*clean surface*), tidak bertumpuk ikon yang tidak perlu.
- **Informasi Kartu Terstruktur:**
  1. *Stripe Warna Opsional:* Garis warna aksen tipis (3px) di bagian atas jika dipilih.
  2. *Badge Tipe & Prioritas:* Ikon tipe tugas (Fitur, Bug, Tugas) + Prioritas.
  3. *Judul Tugas:* Font ukuran 13px/14px tebal sedang, maksimum 2 baris truncate.
  4. *Footer Kartu:* 
     - Sisi Kiri: Indikator Checklist (`✓ 2/4`), Lampiran (`📎 3`), Komentar (`💬 2`), Tanggal Jatuh Tempo.
     - Sisi Kanan: Avatar Penerima Tugas (*Assignee*).
- **Efek Interaksi Mikro:** Saat di-hover, kartu naik secara halus (`translate-y(-2px)`) dengan bayangan lembut (`shadow-md`).

---

## 5. Standar Tampilan Buka Tugas (Task Detail Modal UI/UX)

Tampilan saat membuka tugas adalah pusat perhatian utama alur kerja. Modal ini dirancang dengan gaya **Linear & Modern Notion**:

### 5.1 Struktur & Layout (2-Column Focused Layout)
- **Modal Container:** Maksimal lebar `980px`, tinggi `90vh`, sudut membulat `rounded-2xl`, dengan latar belakang bersih dan pembatas tipis.
- **Header Modal:**
  - Status Tugas (Dropdown pill interaktif: *To Do*, *In Progress*, *In Review*, *Done*).
  - Tipe Tugas & Key Tugas (`#KEY-123`).
  - Aksi Kanan: Tombol checklist "Tandai Selesai", Tombol Hapus (ikon tempat sampah dengan konfirmasi), Tombol Tutup [X] atau tekan `Esc`.

### 5.2 Kolom Kiri: Konten Utama Tugas (68% Lebar)
1. **Judul Tugas:**
   - Input judul tanpa border yang menyatu dengan latar belakang (*seamless inline edit*).
   - Ukuran teks besar (`text-xl font-bold`), otomatis tersimpan saat fokus berpindah (*auto-save on blur*).
2. **Deskripsi Tugas:**
   - Area teks luas dengan placeholder bersih: *"Tulis detail atau instruksi tugas di sini..."*.
   - Otomatis menyimpan perubahan.
3. **Sub-tugas / Checklist:**
   - Progress bar elegan (*X dari Y selesai • %*).
   - Checkbox minimalis dengan efek coret teks (*strikethrough*) saat dicentang.
   - Form penambahan sub-tugas ringkas dengan tombol `Enter`.
4. **Hasil Kerja & Lampiran Berkas (Unified Deliverables):**
   - Disatukan dalam satu komponen yang teratur dengan filter tab:
     - `Semua` | `Hasil Kerja ⭐` | `Dokumen & Gambar`.
     - Setiap berkas ditampilkan sebagai kartu rapi dengan thumbnail/ikon, ukuran berkas, tombol unduh (*download*), dan tombol hapus.
     - Tombol unggah jelas: `+ Unggah Berkas` dan `+ Tautan Eksternal (Drive, Figma, dll)`.
5. **Diskusi & Komentar Tim:**
   - Riwayat percakapan bersih dengan avatar, nama anggota, waktu relatif, dan balon pesan rapi.
   - Kotak komentar intuitif dengan tombol kirim dan pintasan keyboard (`Ctrl+Enter`).

### 5.3 Kolom Kanan: Metadata & Properti Tugas (32% Lebar)
Dikelompokkan dalam daftar properti terpadu:
- **Penerima Tugas (*Assignee*):** Pemilih akun dengan foto profil/avatar.
- **Status Kolom:** Pemilih status langsung.
- **Prioritas:** Dropdown Tinggi, Sedang, Rendah dengan titik warna.
- **Jenis Tugas:** Tugas Umum, Fitur, Bug, Peningkatan, Desain UI-UX, Riset.
- **Batas Waktu (*Due Date*):** Pemilih tanggal dengan penanda otomatis jika mendekati / terlambat (*overdue*).
- **Estimasi Waktu:** Input ringkas (cth: "2 hari", "4 jam").
- **Warna Sampul:** Palet titik warna minimalis untuk aksen kartu.
- **Log Aktivitas:** Riwayat perubahan terbaru dalam format ringkas.

---

## 6. Standar Sinkronisasi Multi-Device & Supabase Cloud

Agar masalah foto profil dan sampul hilang di perangkat lain tidak terjadi lagi:

1. **Dual Storage Architecture (Cloud First, Local Fallback):**
   - Setiap kali pengguna mengubah **Foto Profil** (*user avatar*) atau **Sampul Proyek** (*cover image*), aplikasi wajib:
     1. Memperbarui *state* React secara instan untuk responsivitas UI.
     2. Menyimpan cadangan ke `localStorage` untuk kecepatan *offline*.
     3. Mengunggah dan melakukan *upsert* langsung ke tabel database Supabase (`profiles.avatar` dan `projects.cover_image`).
2. **Bidirectional Reconciliation saat Startup:**
   - Saat aplikasi dibuka di perangkat baru:
     - Ambil data terbaru langsung dari tabel `profiles` dan `projects` di Supabase.
   - Jika perangkat lokal memiliki foto profil/sampul kustom namun database cloud masih kosong:
     - Lakukan sinkronisasi otomatis (*auto-sync back to cloud*) agar perangkat lain segera mendapatkan datanya.
3. **Supabase Realtime Synchronization:**
   - Perubahan profil atau sampul proyek di satu perangkat akan langsung disiarkan (*broadcast*) melalui channel realtime Supabase ke seluruh perangkat aktif tanpa perlu me-refresh halaman.

---

## 7. Rangkuman Checklist Kepatuhan UI/UX

- [x] Tidak ada teks atau tombol yang bertabrakan (*no collision*).
- [x] Spacing konsisten menggunakan kelipatan 4px / 8px (p-2, p-3, p-4, p-6).
- [x] Warna kontras dan nyaman di mata untuk mode terang maupun gelap.
- [x] Banner proyek proporsional dan tidak menelan ruang kerja papan kanban.
- [x] Modal buka tugas simpel, bersih, profesional, dan mudah dinavigasi.
- [x] Foto profil dan sampul proyek tersinkron penuh ke Supabase Cloud.
