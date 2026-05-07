# NoteV2 — Premium Note-Taking Experience 📝✨

![NoteV2 Hero](file:///home/ubuntu-ai/.gemini/antigravity/brain/e3be687f-0907-439f-91e0-6fd7d02ef22b/notes_app_hero_1778135875376.png)

แอปพลิเคชันจดบันทึกยุคใหม่ที่รวมพลังของ **React**, **Supabase** และ **AI** เข้าด้วยกัน เพื่อมอบประสบการณ์การทำงานที่ไหลลื่น สวยงาม และทรงพลัง

## ✨ ฟีเจอร์เด่น (Key Features)

*   **🎨 Drawing Mode:** ไม่ใช่แค่พิมพ์ แต่คุณสามารถวาดไอเดียลงบนผืนผ้าใบดิจิทัลได้โดยตรง
*   **🤖 AI Assistant:** สรุปเนื้อหาโน้ตที่ยาวเหยียดให้สั้นกระชับด้วยพลังของ Groq AI
*   **🕒 Version History:** ไม่ต้องกลัวพลาด! ระบบบันทึกประวัติการแก้ไขย้อนหลังได้ถึง 20 เวอร์ชัน
*   **📌 Organization:** ระบบปักหมุด (Pin) และการติดแท็ก (Tags) ช่วยให้คุณจัดระเบียบความคิดได้ง่ายขึ้น
*   **☁️ Real-time Sync:** ซิงค์ข้อมูลข้ามอุปกรณ์ทันทีด้วย Supabase Backend
*   **📱 Responsive Design:** ใช้งานได้สมบูรณ์แบบทั้งบน Desktop และ Mobile

---

## 🛠 Tech Stack

*   **Frontend:** React 18, Vite
*   **Styling:** Vanilla CSS (Custom Design System)
*   **Backend & Auth:** Supabase
*   **AI Engine:** Groq (Llama 3)
*   **Editor:** Markdown Support

---

## 🚀 เริ่มต้นใช้งาน (Getting Started)

### 1. เตรียมฐานข้อมูล (Supabase Setup)
ไปที่ **Supabase SQL Editor** และรันสคริปต์เพื่อสร้างตาราง `notes` และ `note_versions`:

```sql
-- สร้างตารางหลัก
create table notes (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  title text not null default 'ไม่มีหัวข้อ',
  content text default '',
  tags text[] default array[]::text[],
  is_pinned boolean default false,
  is_deleted boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- สร้างตารางประวัติ
create table note_versions (
  id uuid default gen_random_uuid() primary key,
  note_id uuid references notes(id) on delete cascade,
  title text,
  content text,
  saved_at timestamptz default now()
);

-- ตั้งค่า Security (RLS)
alter table notes enable row level security;
create policy "Users can manage own notes" on notes for all using (auth.uid() = user_id);
```

### 2. ตั้งค่า Environment Variables
สร้างไฟล์ `.env` ในโฟลเดอร์ `notes-app/` และระบุค่าดังนี้:

```env
VITE_SUPABASE_URL=YOUR_SUPABASE_URL
VITE_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
VITE_GROQ_API_KEY=YOUR_GROQ_API_KEY
```

### 3. ติดตั้งและรัน
```bash
cd notes-app
npm install
npm run dev
```

---

## 📂 โครงสร้างโปรเจค (Project Structure)

```text
notes-app/
├── src/
│   ├── components/
│   │   ├── NoteList.jsx      # รายการโน้ตและแถบค้นหา
│   │   ├── NoteEditor.jsx    # ตัวแก้ไขข้อความ/วาดรูป และ AI
│   │   └── DrawingCanvas.jsx # ระบบวาดรูป
│   ├── lib/
│   │   ├── supabase.js       # เชื่อมต่อฐานข้อมูล
│   │   └── groq.js           # เชื่อมต่อ AI Service
│   ├── App.jsx               # หัวใจหลักและระบบ Login
│   └── index.css             # งานดีไซน์ระดับ Premium
└── ...
```

---

## 🎨 Design Philosophy
เราเน้นความ **Minimal** แต่ **Functional** ด้วยการเลือกใช้สีโทน Dark ที่ถนอมสายตา (Deep Charcoal) ผสมผสานกับสีทอง Amber ที่ให้ความรู้สึกพรีเมียม และการตอบสนองที่ลื่นไหล (Micro-interactions) ในทุกการคลิก

---
พัฒนาด้วย ❤️ โดย Antigravity
