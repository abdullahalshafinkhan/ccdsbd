# Backend Guide — Supabase / Firebase সংযোগ

সিস্টেমটি ডিফল্টভাবে **LocalStorageAdapter** ব্যবহার করে (কোনো সেটআপ ছাড়াই সম্পূর্ণ কার্যকর)।
সব মডিউল শুধুমাত্র `DB.list / get / insert / update / remove / query` কল করে — তাই
`assets/js/core/db.js` এ adapter বদলালেই পুরো সিস্টেম ক্লাউড ডেটাবেসে চলে যাবে।

---

## ১. Supabase সংযোগ

### ধাপ ১ — SDK যুক্ত করুন
প্রতিটি HTML এর `<head>` এ:
```html
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.js"></script>
```

### ধাপ ২ — db.js এ adapter সক্রিয় করুন
```js
const sb = window.supabase.createClient('https://YOUR-PROJECT.supabase.co', 'YOUR-ANON-KEY');

class SupabaseAdapter {
  constructor(c){ this.c = c; }
  async list(t){ const {data,error}=await this.c.from(t).select('*'); if(error) throw error; return data; }
  async get(t,id){ const {data}=await this.c.from(t).select('*').eq('id',id).single(); return data; }
  async insert(t,d){ const {data,error}=await this.c.from(t).insert(d).select().single(); if(error) throw error; return data; }
  async update(t,id,p){ const {data,error}=await this.c.from(t).update(p).eq('id',id).select().single(); if(error) throw error; return data; }
  async remove(t,id){ const {error}=await this.c.from(t).delete().eq('id',id); if(error) throw error; return true; }
  async query(t,pred){ return (await this.list(t)).filter(pred); }
  async bulkInsert(t,docs){ const {data,error}=await this.c.from(t).insert(docs).select(); if(error) throw error; return data; }
  async dump(){ const o={}; for(const t of COLLECTIONS) o[t]=await this.list(t); return o; }
  async restore(obj){ for(const t of COLLECTIONS) if(obj[t]?.length) await this.c.from(t).upsert(obj[t]); }
}

export const DB = new SupabaseAdapter(sb);   // ← LocalStorageAdapter এর পরিবর্তে
```

### ধাপ ৩ — টেবিল তৈরি (SQL Editor এ চালান)

```sql
-- School (single row, or multi-row for multi-school SaaS)
create table school (
  id text primary key default gen_random_uuid()::text,
  name text not null, short_name text, eiin text, established text, session text,
  address text, phone text, alt_phone text, email text, website text,
  principal_name text, principal_photo text, principal_message text,
  about text, history text, vision text, mission text,
  objectives jsonb default '[]', rules jsonb default '[]', features jsonb default '[]',
  map_embed text, facebook text, youtube text, twitter text, linkedin text,
  logo text, favicon text,
  created_at timestamptz default now()
);

create table classes (
  id text primary key default gen_random_uuid()::text,
  school_id text references school(id) on delete cascade,
  name text not null, numeric int
);

create table sections (
  id text primary key default gen_random_uuid()::text,
  class_id text references classes(id) on delete cascade,
  name text not null
);

create table subjects (
  id text primary key default gen_random_uuid()::text,
  class_id text references classes(id) on delete cascade,
  name text not null, "fullMarks" int default 100, "passMarks" int default 33,
  "hasMcq" bool default false, "hasPractical" bool default false
);

create table students (
  id text primary key default gen_random_uuid()::text,
  school_id text references school(id) on delete cascade,
  "studentId" text unique not null, "admissionNo" text unique,
  name text not null, "fatherName" text, "motherName" text,
  dob date, gender text, religion text, "bloodGroup" text,
  class_id text references classes(id), section_id text references sections(id),
  roll text, session text, phone text, "guardianPhone" text,
  address text, "admissionDate" date, photo text, status text default 'Active',
  created_at timestamptz default now()
);
create index on students (class_id, section_id, session);

create table teachers (
  id text primary key default gen_random_uuid()::text,
  school_id text references school(id) on delete cascade,
  name text not null, designation text, subject text, department text,
  qualification text, "joiningDate" date, phone text, email text, nid text,
  address text, photo text, status text default 'Active'
);

create table "feeHeads" (
  id text primary key default gen_random_uuid()::text,
  school_id text references school(id) on delete cascade,
  name text not null, type text, amount numeric default 0,
  class_id text references classes(id), note text
);

create table payments (
  id text primary key default gen_random_uuid()::text,
  "receiptNo" text unique not null,
  student_id text references students(id) on delete cascade,
  "feeHeadId" text references "feeHeads"(id),
  "feeType" text, month text, session text,
  total numeric default 0, paid numeric default 0,
  discount numeric default 0, due numeric default 0,
  method text, date date, note text, "collectedBy" text,
  created_at timestamptz default now()
);
create index on payments (student_id, date);

create table exams (
  id text primary key default gen_random_uuid()::text,
  school_id text references school(id) on delete cascade,
  name text not null, session text, "startDate" date, "endDate" date
);

create table results (
  id text primary key default gen_random_uuid()::text,
  exam_id text references exams(id) on delete cascade,
  student_id text references students(id) on delete cascade,
  class_id text references classes(id), section_id text references sections(id),
  session text, marks jsonb default '[]',
  "totalMarks" numeric, average numeric, gpa numeric,
  grade text, position int, status text, remarks text,
  published bool default false,
  unique (exam_id, student_id)
);
create index on results (exam_id, class_id);

create table notices (
  id text primary key default gen_random_uuid()::text,
  school_id text references school(id) on delete cascade,
  title text not null, description text, category text, date date,
  attachment text, "attachmentName" text, published bool default false
);

create table events (
  id text primary key default gen_random_uuid()::text,
  school_id text references school(id) on delete cascade,
  title text not null, date date, time text, location text,
  organizer text, description text, image text
);

create table albums (
  id text primary key default gen_random_uuid()::text,
  school_id text references school(id) on delete cascade,
  name text not null, description text, date date, cover text
);

create table photos (
  id text primary key default gen_random_uuid()::text,
  album_id text references albums(id) on delete cascade,
  image text not null, caption text
);

create table videos (
  id text primary key default gen_random_uuid()::text,
  school_id text references school(id) on delete cascade,
  title text not null, url text not null
);

create table banners (
  id text primary key default gen_random_uuid()::text,
  school_id text references school(id) on delete cascade,
  title text, sub text, image text, sort int default 0
);
```

### ধাপ ৪ — Row Level Security (গুরুত্বপূর্ণ!)

```sql
-- সব টেবিলে RLS চালু করুন
alter table school      enable row level security;
alter table students    enable row level security;
alter table teachers    enable row level security;
alter table classes     enable row level security;
alter table sections    enable row level security;
alter table subjects    enable row level security;
alter table "feeHeads"  enable row level security;
alter table payments    enable row level security;
alter table exams       enable row level security;
alter table results     enable row level security;
alter table notices     enable row level security;
alter table events      enable row level security;
alter table albums      enable row level security;
alter table photos      enable row level security;
alter table videos      enable row level security;
alter table banners     enable row level security;

-- Public (anon) শুধু ওয়েবসাইটের জন্য প্রয়োজনীয় ডেটা পড়তে পারবে
create policy "public read school"   on school   for select to anon using (true);
create policy "public read teachers" on teachers for select to anon using (status = 'Active');
create policy "public read classes"  on classes  for select to anon using (true);
create policy "public read sections" on sections for select to anon using (true);
create policy "public read subjects" on subjects for select to anon using (true);
create policy "public read notices"  on notices  for select to anon using (published = true);
create policy "public read events"   on events   for select to anon using (true);
create policy "public read albums"   on albums   for select to anon using (true);
create policy "public read photos"   on photos   for select to anon using (true);
create policy "public read videos"   on videos   for select to anon using (true);
create policy "public read banners"  on banners  for select to anon using (true);

-- প্রকাশিত ফলাফল পাবলিক পড়তে পারবে (শুধু published)
create policy "public read results" on results for select to anon using (published = true);

-- ⚠️ students / payments পাবলিক পড়তে পারবে না।
--    Result Search এর জন্য নিরাপদ RPC ব্যবহার করুন (নিচে দেখুন)।

-- Authenticated admin: সব টেবিলে পূর্ণ অধিকার
do $$ declare t text;
begin
  foreach t in array array['school','students','teachers','classes','sections','subjects',
                           'feeHeads','payments','exams','results','notices','events',
                           'albums','photos','videos','banners']
  loop
    execute format('create policy "admin all %1$s" on %I for all to authenticated using (true) with check (true);', t);
  end loop;
end $$;
```

### ধাপ ৫ — নিরাপদ Public Result Search (RPC)

পাবলিক যেন পুরো `students` টেবিল না পড়তে পারে, তাই একটি SECURITY DEFINER ফাংশন:

```sql
create or replace function public_result_search(p_query text, p_exam text default null)
returns table (
  student_name text, student_code text, class_name text, section_name text,
  roll text, session text, exam_name text, marks jsonb,
  total numeric, gpa numeric, grade text, position int, status text
)
language sql security definer set search_path = public as $$
  select s.name, s."studentId", c.name, sec.name, s.roll, r.session,
         e.name, r.marks, r."totalMarks", r.gpa, r.grade, r.position, r.status
  from results r
  join students s on s.id = r.student_id
  left join classes c   on c.id = r.class_id
  left join sections sec on sec.id = r.section_id
  left join exams e     on e.id = r.exam_id
  where r.published = true
    and (p_exam is null or r.exam_id = p_exam)
    and (lower(s."studentId") = lower(p_query)
      or lower(s."admissionNo") = lower(p_query)
      or s.roll = p_query);
$$;

revoke all on function public_result_search(text,text) from public;
grant execute on function public_result_search(text,text) to anon, authenticated;
```

ফ্রন্টএন্ডে `site.js` এর `publicResultSearch()` প্রতিস্থাপন করুন:
```js
const { data, error } = await sb.rpc('public_result_search', { p_query: query, p_exam: examId || null });
if (error || !data.length) throw new Error('ফলাফল পাওয়া যায়নি');
```

### ধাপ ৬ — Authentication

`assets/js/core/auth.js` এ `Auth` অবজেক্টটি প্রতিস্থাপন করুন:
```js
export const Auth = {
  async login(email, password, remember) {
    const { data, error } = await sb.auth.signInWithPassword({ email, password });
    if (error) throw new Error('Invalid credentials');
    return data.session;
  },
  session(){ return sb.auth.getSession(); },       // async — route guard এ await করুন
  async isLoggedIn(){ return !!(await sb.auth.getSession()).data.session; },
  logout(){ return sb.auth.signOut(); },
  requestReset(email){ return sb.auth.resetPasswordForEmail(email, { redirectTo: location.origin + '/reset.html' }); },
  changePassword(_id, _old, newPw){ return sb.auth.updateUser({ password: newPw }); }
};
```
Supabase Dashboard → Authentication → Users থেকে admin ইউজার তৈরি করুন,
এবং Email provider ও SMTP কনফিগার করুন (Forgot Password ই-মেইলের জন্য)।

### ধাপ ৭ — ছবি সংরক্ষণ (Storage)
বর্তমানে ছবি base64 হিসেবে সংরক্ষিত হয়। বড় স্কেলে Supabase Storage ব্যবহার করুন:
```js
const path = `students/${studentId}.jpg`;
await sb.storage.from('media').upload(path, file, { upsert: true });
const { data } = sb.storage.from('media').getPublicUrl(path);
doc.photo = data.publicUrl;
```
Bucket `media` তৈরি করে public read policy দিন।

---

## ২. Firebase সংযোগ (বিকল্প)

```js
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import { getFirestore, collection, getDocs, doc, getDoc, addDoc, updateDoc, deleteDoc }
  from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

const app = initializeApp({ apiKey:'…', authDomain:'…', projectId:'…' });
const fs  = getFirestore(app);

class FirebaseAdapter {
  async list(c){ const s=await getDocs(collection(fs,c)); return s.docs.map(d=>({id:d.id,...d.data()})); }
  async get(c,id){ const d=await getDoc(doc(fs,c,id)); return d.exists()?{id:d.id,...d.data()}:null; }
  async insert(c,d){ const r=await addDoc(collection(fs,c),d); return {id:r.id,...d}; }
  async update(c,id,p){ await updateDoc(doc(fs,c,id),p); return this.get(c,id); }
  async remove(c,id){ await deleteDoc(doc(fs,c,id)); return true; }
  async query(c,pred){ return (await this.list(c)).filter(pred); }
}
export const DB = new FirebaseAdapter();
```

### Firestore Security Rules
```js
rules_version = '2';
service cloud.firestore {
  match /databases/{db}/documents {
    function isAdmin() {
      return request.auth != null &&
             get(/databases/$(db)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }

    // পাবলিক ওয়েবসাইটের জন্য read-only
    match /school/{d}   { allow read: if true;  allow write: if isAdmin(); }
    match /teachers/{d} { allow read: if true;  allow write: if isAdmin(); }
    match /classes/{d}  { allow read: if true;  allow write: if isAdmin(); }
    match /sections/{d} { allow read: if true;  allow write: if isAdmin(); }
    match /subjects/{d} { allow read: if true;  allow write: if isAdmin(); }
    match /events/{d}   { allow read: if true;  allow write: if isAdmin(); }
    match /albums/{d}   { allow read: if true;  allow write: if isAdmin(); }
    match /photos/{d}   { allow read: if true;  allow write: if isAdmin(); }
    match /videos/{d}   { allow read: if true;  allow write: if isAdmin(); }
    match /banners/{d}  { allow read: if true;  allow write: if isAdmin(); }

    match /notices/{d}  { allow read: if resource.data.published == true || isAdmin();
                          allow write: if isAdmin(); }
    match /results/{d}  { allow read: if resource.data.published == true || isAdmin();
                          allow write: if isAdmin(); }

    // ⚠️ ব্যক্তিগত তথ্য — শুধুমাত্র admin
    match /students/{d} { allow read, write: if isAdmin(); }
    match /payments/{d} { allow read, write: if isAdmin(); }
    match /users/{d}    { allow read: if request.auth != null && request.auth.uid == d;
                          allow write: if isAdmin(); }

    match /{document=**} { allow read, write: if false; }
  }
}
```

---

## ৩. Multi-School (SaaS) এ রূপান্তর

সব টেবিলে ইতিমধ্যে `school_id` কলাম রয়েছে। শুধু RLS policy তে টেন্যান্ট ফিল্টার যোগ করুন:

```sql
create policy "tenant isolation" on students for all to authenticated
using (school_id = (auth.jwt() -> 'app_metadata' ->> 'school_id'))
with check (school_id = (auth.jwt() -> 'app_metadata' ->> 'school_id'));
```
ইউজার তৈরির সময় `app_metadata.school_id` সেট করুন — তাহলে প্রতিটি স্কুল শুধু নিজের ডেটা দেখবে।
