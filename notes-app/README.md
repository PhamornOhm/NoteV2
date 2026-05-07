# Notes App 📝

React + Supabase Note-taking App

## ขั้นตอนการติดตั้ง

### 1. สร้างตารางใน Supabase

ไปที่ **Supabase Dashboard → SQL Editor** แล้วรันคำสั่งนี้:

```sql
-- สร้างตาราง notes
create table notes (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  title text not null default 'ไม่มีหัวข้อ',
  content text default '',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- เปิด Row Level Security (ให้แต่ละคนเห็นแค่โน้ตตัวเอง)
alter table notes enable row level security;

-- Policy: ดูได้เฉพาะโน้ตของตัวเอง
create policy "Users can view own notes"
  on notes for select
  using (auth.uid() = user_id);

-- Policy: สร้างโน้ตของตัวเอง
create policy "Users can insert own notes"
  on notes for insert
  with check (auth.uid() = user_id);

-- Policy: แก้ไขโน้ตของตัวเอง
create policy "Users can update own notes"
  on notes for update
  using (auth.uid() = user_id);

-- Policy: ลบโน้ตของตัวเอง
create policy "Users can delete own notes"
  on notes for delete
  using (auth.uid() = user_id);
```

### 2. ตั้งค่า Environment Variables

```bash
cp .env.example .env
```

แก้ไขไฟล์ `.env` ใส่ค่าจาก Supabase Dashboard → Project Settings → API:
```
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

### 3. รันในเครื่อง

```bash
npm install
npm run dev
```

---

## Deploy บน Vercel

1. Push โค้ดขึ้น GitHub
2. เข้า [vercel.com](https://vercel.com) → Import Project → เลือก repo
3. ไปที่ **Settings → Environment Variables** แล้วใส่:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. กด **Deploy** ✅

---

## เปิด Google Login (ถ้าต้องการ)

ไปที่ Supabase → **Authentication → Providers → Google**
- เปิด Enable
- ใส่ Google Client ID และ Secret (สร้างได้จาก Google Cloud Console)
- ใส่ Redirect URL: `https://yourapp.vercel.app`

---

## โครงสร้างโปรเจค

```
src/
├── lib/
│   └── supabase.js      ← เชื่อมต่อ Supabase
├── components/
│   ├── Login.jsx        ← หน้า Login
│   ├── NoteList.jsx     ← Sidebar รายการโน้ต
│   └── NoteEditor.jsx   ← แก้ไขโน้ต
├── App.jsx              ← Main app + Auth
├── main.jsx
└── index.css
```
