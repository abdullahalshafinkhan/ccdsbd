# 🏫 School Website + School Management System

সম্পূর্ণ কার্যকর, রেসপন্সিভ **School Website** ও **Admin Panel** — মাত্র **দুটি ফাইলে**।
কোনো build, npm install, framework বা সার্ভার-সাইড কোড লাগে না।

| ফাইল | কী আছে |
|---|---|
| **`index.html`** | সম্পূর্ণ পাবলিক ওয়েবসাইট — ১১টি পেজ (Home, About, Principal, Academic, Teachers, Students, Notice, Events, Gallery, Result Search, Contact) |
| **`admin.html`** | সম্পূর্ণ অ্যাডমিন প্যানেল — Login + ৩৫+ স্ক্রিন + ৮টি প্রিন্টেবল ডকুমেন্ট (Attendance, Messages, Routine যুক্ত) |

দুটি ফাইলই একই ডেটাবেসে সংযুক্ত। Admin এ কিছু পরিবর্তন করলে ওয়েবসাইটে সঙ্গে সঙ্গে দেখা যাবে।

---

## 🚀 GitHub Pages এ আপলোড (৩ মিনিট)

1. GitHub এ একটি নতুন **public repository** তৈরি করুন (যেমন `my-school`)
2. **Add file → Upload files** এ ক্লিক করে `index.html` ও `admin.html` দুটি ফাইল টেনে ছেড়ে দিন → **Commit changes**
3. **Settings → Pages** → Source: **Deploy from a branch** → Branch: **main** / **`/root`** → **Save**
4. ১–২ মিনিট পর সাইট লাইভ:

```
ওয়েবসাইট  →  https://USERNAME.github.io/my-school/
অ্যাডমিন   →  https://USERNAME.github.io/my-school/admin.html
```

> 💡 ফাইল দুটি একই ফোল্ডারে রাখুন — নাহলে ওয়েবসাইট ↔ অ্যাডমিন লিংক কাজ করবে না।

---

## ☁️ Cloudflare Pages এ আপলোড (GitHub রিপো থেকে)

1. প্রথমে উপরের ধাপ অনুযায়ী কোড **GitHub**-এ পুশ করুন (repo public বা private দুটোই চলবে)।
2. [Cloudflare Dashboard](https://dash.cloudflare.com/) → **Workers & Pages** → **Create** → **Pages** → **Connect to Git**।
3. আপনার GitHub অ্যাকাউন্ট অনুমোদন করে এই repository সিলেক্ট করুন।
4. Build সেটিংস এভাবে দিন (কোনো build লাগবে না, তাই সবই ফাঁকা/ডিফল্ট রাখুন):
   - **Framework preset**: `None`
   - **Build command**: *(ফাঁকা রাখুন)*
   - **Build output directory**: `/`
5. **Save and Deploy** ক্লিক করুন। কিছুক্ষণের মধ্যে সাইট লাইভ হবে:

```
ওয়েবসাইট  →  https://YOUR-PROJECT.pages.dev/
অ্যাডমিন   →  https://YOUR-PROJECT.pages.dev/admin.html
```

> এরপর GitHub-এ যেকোনো commit পুশ করলেই Cloudflare Pages স্বয়ংক্রিয়ভাবে নতুন করে ডিপ্লয় করবে।
> নিজের ডোমেইন যুক্ত করতে চাইলে Pages প্রজেক্ট → **Custom domains** থেকে করা যাবে।

### লোকালি চালাতে চাইলে
`index.html` এ শুধু **ডাবল-ক্লিক** করুন — সরাসরি ব্রাউজারে খুলে যাবে (কোনো সার্ভার লাগবে না)।

---

## 🔑 ডিফল্ট লগইন

| | |
|---|---|
| **Email** | `admin@school.com` |
| **Password** | `admin123` |

প্রথমবার খুললেই স্কুল প্রোফাইল, ১০টি শ্রেণি, ৩০টি শাখা, বিষয়, ফি হেড, ৮ জন শিক্ষক,
২৪ জন শিক্ষার্থী, নোটিশ, ইভেন্ট ও পেমেন্ট ডেটা স্বয়ংক্রিয়ভাবে তৈরি হয়।

> ⚠️ লগইনের পরপরই **Settings → Password** থেকে পাসওয়ার্ড পরিবর্তন করুন।

---

## ✨ Features

### 🌐 Public Website (`index.html`)
Hero slider • নোটিশ বোর্ড • ইভেন্ট • প্রধান শিক্ষকের বাণী • স্কুলের বৈশিষ্ট্য •
একাডেমিক তথ্য ও গ্রেডিং • শিক্ষক প্রোফাইল (search + filter) • ফটো ও ভিডিও গ্যালারি •
**Online Result Search** (Student ID / Roll / Admission No দিয়ে) • Google Map •
Social links • সম্পূর্ণ মোবাইল রেসপন্সিভ

### 🔐 Admin Panel (`admin.html`)
| মডিউল | সুবিধা |
|---|---|
| **Dashboard** | ৮টি KPI কার্ড, ৪টি ইন্টার‌্যাক্টিভ চার্ট, সাম্প্রতিক কার্যক্রম |
| **Students** | পূর্ণ CRUD, ফটো আপলোড, class/section/session/status ফিল্টার, **CSV Import/Export**, প্রিন্ট |
| **ID Card** | একক ও বাল্ক জেনারেট, **QR কোড**, front & back, CR80 স্ট্যান্ডার্ড সাইজ (উন্নত ডিজাইন) |
| **Teachers** | পূর্ণ CRUD, **ছবিসহ**, বিভাগ ফিল্টার, CSV export |
| **Attendance** | দৈনিক উপস্থিতি নেওয়া (Present/Absent/Late/Leave), ক্লাস-শাখা ভিত্তিক, **রিপোর্ট + %** |
| **Fees** | ফি হেড সেটআপ, কালেকশন (ডিসকাউন্টসহ), হিস্ট্রি, রসিদ, বকেয়া তালিকা |
| **Results** | Exam/Subject সেটআপ, লাইভ মার্কস এন্ট্রি, **স্বয়ংক্রিয়** Total/Average/Grade/GPA/Position/Pass-Fail, Marksheet + Certificate |
| **Messages** | অভ্যন্তরীণ মেসেজ/বার্তা (All Guardians / Class wise), কম্পোজ ও হিস্ট্রি |
| **Routine** | ক্লাস রুটিন (দিন + পিরিয়ড + সময় + বিষয় + শিক্ষক + রুম), প্রিন্টযোগ্য |
| **Notices** | CRUD, PDF অ্যাটাচমেন্ট, publish/draft টগল |
| **Events** | CRUD, ছবি, আসন্ন/সম্পন্ন স্ট্যাটাস |
| **Gallery** | অ্যালবাম, একাধিক ছবি আপলোড, ক্যাপশন এডিট, ভিডিও |
| **Website** | স্কুল তথ্য, হোমপেজ ফিচার, ব্যানার স্লাইড, যোগাযোগ, সোশ্যাল লিংক |
| **Reports** | শিক্ষার্থী, ফি, বকেয়া, ফলাফল, উপস্থিতি — সবই প্রিন্টেবল |
| **Settings** | প্রোফাইল, মাল্টি-ইউজার, পাসওয়ার্ড, লোগো/favicon, **Backup / Restore** |

### 🖨️ Print & PDF (৮টি ডকুমেন্ট)
Student ID Card (CR80 54×85.6mm, QR) • Fee Receipt (Student's + Office copy, টাকা কথায়) •
Result Sheet + Class Tabulation Sheet • Student Profile • Student List •
Fee Report • Due Report • Result Report

প্রতিটি ডকুমেন্ট নতুন উইন্ডোতে খোলে, উপরে **Print** ও **Download PDF** বাটন থাকে।
`@page size:A4` ব্যবহার করায় প্রিন্ট আউটপুট নিখুঁতভাবে পেজে বসে।

### 🎯 গ্রেডিং (বাংলাদেশ GPA-5 স্কেল)
| নম্বর | গ্রেড | পয়েন্ট |
|---|---|---|
| 80–100 | A+ | 5.00 |
| 70–79 | A | 4.00 |
| 60–69 | A− | 3.50 |
| 50–59 | B | 3.00 |
| 40–49 | C | 2.00 |
| 33–39 | D | 1.00 |
| 0–32 | F | 0.00 |

যেকোনো বিষয়ে ফেল করলে সামগ্রিক ফলাফল **Fail** এবং GPA **0.00** হবে।

---

## 🔐 Security

- **পাসওয়ার্ড**: PBKDF2-SHA256, ১৫০,০০০ iterations, প্রতি-ইউজার random salt (WebCrypto) — কখনোই plain text এ সংরক্ষিত হয় না
- **Session**: মেয়াদসহ টোকেন (Remember me: ৩০ দিন, নাহলে ৮ ঘণ্টা), স্বয়ংক্রিয় expiry
- **Auth guard**: লগইন ছাড়া অ্যাডমিন স্ক্রিন দেখা যায় না
- **XSS protection**: সব ডাইনামিক আউটপুট escape করা
- **Privacy**: পাবলিক সাইটে শিক্ষার্থীর ব্যক্তিগত তথ্য বা ফি রেকর্ড দেখা যায় না; Result Search শুধু **published** ফলাফল দেখায়

---

## 💾 ডেটা কোথায় থাকে? (গুরুত্বপূর্ণ)

এই প্যাকেজটি এখন **Cloudflare D1** (production SQL database) ব্যবহারের জন্য প্রস্তুত করা
আছে, ছবি ও অতিরিক্ত ব্যাকআপের জন্য **Cloudinary** সহ। সেটআপ না করলেও অ্যাপ সাথে সাথে
কাজ করবে (স্বয়ংক্রিয়ভাবে LocalStorage/base64 fallback ব্যবহার করবে), কিন্তু তখন ডেটা
প্রতিটি ব্রাউজার/ডিভাইসে আলাদা থাকবে (অন্য কম্পিউটার থেকে দেখা যাবে না)।

**একাধিক ডিভাইস থেকে একই ডেটা দেখতে ও নিয়মিত ব্যাকআপ নিতে:**
`D1_CLOUDINARY_SETUP.md` অনুসরণ করে Cloudflare D1 ও Cloudinary কানেক্ট করুন (ধাপে ধাপে
বাংলা গাইড, ৫টি ধাপ, প্রায় ১৫-২০ মিনিট লাগবে)। এরপর থেকে সব ডিভাইস থেকে একই ডেটা দেখা
যাবে, এবং ছবি + JSON ব্যাকআপ Cloudinary তেও জমা থাকবে।

Admin → **Settings → Backup / Restore** থেকে যেকোনো সময় **Download Backup (JSON)**
অথবা **☁️ Cloudinary তে ব্যাকআপ নিন** করতে পারবেন।

<details>
<summary>Supabase / Firebase দিয়ে সংযোগ করতে চাইলে (বিকল্প)</summary>

`BACKEND.md` ফাইলে Supabase ও Firebase সংযোগের সম্পূর্ণ গাইড আছে — SQL schema,
Row Level Security policies, Firestore rules ও নিরাপদ result-search RPC সহ।
</details>

---

## 📱 Responsive

| ডিভাইস | আচরণ |
|---|---|
| Mobile (≤760px) | হ্যামবার্গার মেনু, এক-কলাম লেআউট, স্ক্রলযোগ্য টেবিল |
| Tablet (≤1260px) | স্লাইড-ইন সাইডবার, দুই-কলাম কার্ড |
| Desktop | পূর্ণ সাইডবার, চার-কলাম ড্যাশবোর্ড |

Android, iPhone, iPad, Laptop ও Desktop — সব ডিভাইসে পরীক্ষিত।

---

## 🛠️ কাস্টমাইজ করা

**স্কুলের তথ্য পরিবর্তন** (কোড না ছুঁয়ে):
Admin → **Website → School Information / Contact / Social Links**, এবং
**Settings → School Settings** থেকে লোগো ও favicon আপলোড করুন।
পরিবর্তন সঙ্গে সঙ্গে পাবলিক ওয়েবসাইটে প্রতিফলিত হবে।

**রং পরিবর্তন**: `index.html` ও `admin.html` এর শুরুতে `:root` ব্লকে —
```css
--brand:#0b6b4f;    /* মূল রং */
--brand-2:#0e8a66;  /* হালকা শেড */
--accent:#f5a623;   /* অ্যাকসেন্ট */
```

---

## 🔮 ভবিষ্যতে যা যোগ করা যাবে

Multiple School (SaaS) • Subscription • Student/Parent/Teacher Login • Online Admission •
Online Fee Payment • SMS/Email Notification • Payroll • Library •
Transport • Mobile App • Real SMS/Email gateway

আর্কিটেকচারে `DB` অ্যাডাপ্টার লেয়ার থাকায় ব্যাকএন্ড বদলানো বা নতুন মডিউল যোগ করা সহজ।

---

## 📄 License

আপনার স্কুলের জন্য স্বাধীনভাবে ব্যবহার ও পরিবর্তন করুন।
