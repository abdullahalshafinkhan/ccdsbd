/**
 * Cloudflare Pages Function — generic D1-backed document store for the
 * School Management System (admin.html + index.html both talk to this).
 *
 * Requires, on the Cloudflare Pages project:
 *   - a D1 database binding named  DB
 *   - an environment variable / secret named  ADMIN_API_KEY
 *     (must match the `adminKey` set in admin.html's APP_CONFIG)
 *   - (optional, only needed for the SMS feature) secrets  BULKSMS_API_KEY
 *     and  BULKSMS_SENDER_ID  from a bulksmsbd.net account — see NEW_FEATURES.md
 *
 * URL shape (mounted at /api/* by the [[path]] filename):
 *   GET    /api/:collection                → list rows
 *   GET    /api/:collection/:id            → get one row
 *   POST   /api/:collection                → insert one row
 *   POST   /api/:collection/bulk           → insert many rows
 *   POST   /api/:collection/replace-all    → replace every row in a collection
 *   PATCH  /api/:collection/:id            → partial update
 *   DELETE /api/:collection/:id            → delete one row
 *   GET    /api/_dump                      → export the whole database (admin only)
 *   POST   /api/_restore                   → replace the whole database (admin only)
 *   POST   /api/_wipe                      → delete everything (admin only)
 *   POST   /api/_send-sms                  → send SMS via bulksmsbd.net (admin only)
 *   GET    /api/parent-portal               → guardian login (studentId + phone), returns
 *                                              that one student's attendance/fees/results/notices
 *
 * Access control:
 *   - Requests with a correct X-Admin-Key header can read/write anything.
 *   - Without that header, only PUBLIC_READ collections are readable (and some
 *     of those are row-filtered — e.g. only published notices/results, only
 *     active teachers). `syllabus` (class-wise PDF syllabus) is fully public-read
 *     since it has no per-row draft/publish state. Only PUBLIC_WRITE collections accept inserts
 *     (the public admission-apply form, and the sequence counters it uses).
 *   - Everything else (students' individual PII stays inside PUBLIC_READ
 *     because the public "find my result"/print flow already needs it —
 *     see BACKEND.md for the exact trade-off) requires the admin key.
 */

const PUBLIC_READ = new Set([
  'school', 'teachers', 'classes', 'sections', 'subjects', 'notices',
  'events', 'albums', 'photos', 'videos', 'banners', 'results', 'exams',
  'students', 'counters', 'syllabus', 'routines'
]);

// rows in these collections are filtered before being sent to a non-admin reader
const PUBLIC_READ_FILTERS = {
  teachers: (row) => row.status !== 'Inactive',
  notices: (row) => !!row.published,
  results: (row) => !!row.published
};

// a visitor with no admin key may INSERT/UPDATE into these (never DELETE, never read others)
const PUBLIC_WRITE = new Set(['admissions', 'counters']);

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,PATCH,DELETE,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-Admin-Key'
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...CORS_HEADERS }
  });
}
function err(message, status = 400) {
  return json({ error: message }, status);
}

function isAdmin(request, env) {
  const key = request.headers.get('X-Admin-Key') || '';
  return !!env.ADMIN_API_KEY && key === env.ADMIN_API_KEY;
}

/* বাংলাদেশি ফোন নম্বর normalize করে bulksmsbd.net এর প্রত্যাশিত 880XXXXXXXXXX ফরম্যাটে আনে।
   ইনপুট আসতে পারে: 01712345678 / 1712345678 / 8801712345678 / +8801712345678 / স্পেস-ড্যাশসহ */
function normalizeBdPhone(raw) {
  let n = String(raw || '').replace(/[^\d]/g, '');
  if (n.startsWith('880')) return n;
  if (n.startsWith('0')) return '880' + n.slice(1);
  if (n.length === 10) return '880' + n;
  return n;
}

/* SMS পাঠায় bulksmsbd.net গেটওয়ে দিয়ে (server-side, তাই API key কখনো ব্রাউজারে যায় না)।
   Cloudflare Pages → Settings → Environment variables এ BULKSMS_API_KEY ও BULKSMS_SENDER_ID
   সেট করা না থাকলে স্পষ্ট এরর ফেরত দেয়। প্রতিটি নম্বরের জন্য আলাদা রিকোয়েস্ট পাঠানো হয় যাতে
   একটা নম্বর ব্যর্থ হলেও বাকিগুলো চলতে থাকে; ফলাফল প্রতিটির জন্য আলাদা করে ফেরত দেওয়া হয়। */
async function sendSms(request, env) {
  if (!env.BULKSMS_API_KEY || !env.BULKSMS_SENDER_ID) {
    return err('SMS গেটওয়ে কনফিগার করা নেই। Cloudflare Pages → Settings → Environment variables এ BULKSMS_API_KEY ও BULKSMS_SENDER_ID যোগ করুন।', 500);
  }
  let body;
  try { body = await request.json(); } catch (_) { return err('Invalid JSON body', 400); }
  const numbers = Array.isArray(body.numbers) ? body.numbers : [];
  const message = String(body.message || '').trim();
  if (!numbers.length) return err('numbers অ্যারে খালি — অন্তত একটি ফোন নম্বর দিন', 400);
  if (!message) return err('message খালি রাখা যাবে না', 400);
  if (numbers.length > 500) return err('একবারে সর্বোচ্চ ৫০০টি নম্বরে পাঠানো যাবে', 400);

  const results = [];
  for (const raw of numbers) {
    const number = normalizeBdPhone(raw);
    if (!/^880\d{10}$/.test(number)) { results.push({ number: raw, ok: false, error: 'অবৈধ ফোন নম্বর' }); continue; }
    const url = 'https://bulksmsbd.net/api/smsapi'
      + '?api_key=' + encodeURIComponent(env.BULKSMS_API_KEY)
      + '&type=text'
      + '&number=' + encodeURIComponent(number)
      + '&senderid=' + encodeURIComponent(env.BULKSMS_SENDER_ID)
      + '&message=' + encodeURIComponent(message);
    try {
      const res = await fetch(url);
      const text = (await res.text()).trim();
      // bulksmsbd.net সফল হলে responseCode 202 (numeric) ফেরত দেয়, ব্যর্থ হলে অন্য কোড/মেসেজ
      const ok = res.ok && /^202\b/.test(text);
      results.push({ number, ok, response: text });
    } catch (e) {
      results.push({ number, ok: false, error: e.message || 'নেটওয়ার্ক এরর' });
    }
  }
  const sent = results.filter(r => r.ok).length;
  return json({ sent, failed: results.length - sent, results });
}

async function readAll(env, collection) {
  const { results } = await env.DB
    .prepare('SELECT data FROM documents WHERE collection = ?')
    .bind(collection)
    .all();
  return (results || []).map((r) => JSON.parse(r.data));
}
async function readOne(env, collection, id) {
  const row = await env.DB
    .prepare('SELECT data FROM documents WHERE collection = ? AND id = ?')
    .bind(collection, id)
    .first();
  return row ? JSON.parse(row.data) : null;
}
function upsertStmt(env, collection, row, now) {
  return env.DB
    .prepare(
      `INSERT INTO documents (collection, id, data, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(collection, id) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at`
    )
    .bind(collection, row.id, JSON.stringify(row), row.createdAt || now, now);
}

export async function onRequest(context) {
  const { request, env } = context;

  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: CORS_HEADERS });
  }
  if (!env.DB) {
    return err(
      'D1 ডেটাবেস বাইন্ড করা নেই। Cloudflare Pages → Settings → Functions → D1 database bindings এ "DB" নামে বাইন্ড করুন।',
      500
    );
  }

  const parts = context.params.path || [];
  const admin = isAdmin(request, env);

  try {
    // ---------- whole-database routes ----------
    if (parts[0] === '_dump') {
      if (request.method !== 'GET') return err('Method not allowed', 405);
      if (!admin) return err('Unauthorized', 401);
      const { results } = await env.DB.prepare('SELECT collection, data FROM documents').all();
      const out = {};
      for (const r of results || []) {
        (out[r.collection] ||= []).push(JSON.parse(r.data));
      }
      return json(out);
    }
    if (parts[0] === '_restore') {
      if (request.method !== 'POST') return err('Method not allowed', 405);
      if (!admin) return err('Unauthorized', 401);
      const obj = await request.json();
      const now = new Date().toISOString();
      const stmts = [];
      for (const [collection, rows] of Object.entries(obj || {})) {
        stmts.push(env.DB.prepare('DELETE FROM documents WHERE collection = ?').bind(collection));
        for (const row of rows || []) stmts.push(upsertStmt(env, collection, row, now));
      }
      if (stmts.length) await env.DB.batch(stmts);
      return json({ ok: true });
    }
    if (parts[0] === '_wipe') {
      if (request.method !== 'POST') return err('Method not allowed', 405);
      if (!admin) return err('Unauthorized', 401);
      await env.DB.prepare('DELETE FROM documents').run();
      return json({ ok: true });
    }
    if (parts[0] === '_send-sms') {
      if (request.method !== 'POST') return err('Method not allowed', 405);
      if (!admin) return err('Unauthorized', 401);
      return sendSms(request, env);
    }

    /* ---------- Guardian/Parent portal ----------
       GET /api/parent-portal?studentId=STD1001&phone=01712345678
       No admin key needed — access is gated by matching BOTH the student's
       Student ID and their guardian's phone number against the students
       table. Only that one student's records (attendance, fee payments,
       published results, special messages) are returned — never the whole
       collection — so a guardian never sees another family's data. */
    if (parts[0] === 'parent-portal') {
      if (request.method !== 'GET') return err('Method not allowed', 405);
      const url = new URL(request.url);
      const wantId = (url.searchParams.get('studentId') || '').trim().toLowerCase();
      const rawPhone = (url.searchParams.get('phone') || '').trim();
      const last10 = (v) => String(v || '').replace(/\D/g, '').slice(-10);
      const wantPhone = last10(rawPhone);
      if (!wantId || !wantPhone) return err('Student ID ও Guardian Phone নম্বর দিন', 400);
      if (wantPhone.length !== 10) return err('সঠিক ফোন নম্বর দিন', 400);

      const students = await readAll(env, 'students');
      const student = students.find((s) =>
        String(s.studentId || '').toLowerCase() === wantId &&
        (last10(s.guardianPhone) === wantPhone || last10(s.phone) === wantPhone)
      );
      if (!student) return err('Student ID অথবা Guardian Phone সঠিক নয়', 401);

      const [attendance, payments, results, notices] = await Promise.all([
        readAll(env, 'attendance'),
        readAll(env, 'payments'),
        readAll(env, 'results'),
        readAll(env, 'studentNotices')
      ]);
      return json({
        student,
        attendance: attendance.filter((a) => a.studentId === student.id),
        payments: payments.filter((p) => p.studentId === student.id),
        results: results.filter((r) => r.studentId === student.id && !!r.published),
        notices: notices
          .filter((n) => n.studentId === student.id)
          .sort((a, b) => String(b.date || b.createdAt || '').localeCompare(String(a.date || a.createdAt || '')))
      });
    }

    /* ---------- Biometric attendance device punch (future-ready stub) ----------
       POST /api/attendance/punch
       Header: X-Device-Key: <school.biometricDeviceKey>
       Body:   { studentId: "STD1001", method: "fingerprint"|"face", status?: "Present", date?: "YYYY-MM-DD", timestamp?: ISOString }
       This lets a fingerprint/face-punch attendance device push records directly,
       alongside (not instead of) manual "Take Attendance" — nothing changes for
       manual entry until a school configures a Device Key in Settings and points
       their device at this endpoint. */
    if (parts[0] === 'attendance' && parts[1] === 'punch') {
      if (request.method !== 'POST') return err('Method not allowed', 405);
      const body = await request.json().catch(() => null);
      if (!body) return err('Invalid JSON body', 400);
      const schoolRows = await readAll(env, 'school');
      const school = schoolRows[0] || {};
      const deviceKey = request.headers.get('X-Device-Key') || '';
      if (!school.biometricDeviceKey) return err('Biometric device সেটআপ করা নেই। Settings এ Device Key যোগ করুন।', 400);
      if (deviceKey !== school.biometricDeviceKey) return err('Unauthorized device', 401);

      const wantId = String(body.studentId || '').trim().toLowerCase();
      if (!wantId) return err('studentId প্রয়োজন', 400);
      const students = await readAll(env, 'students');
      const student = students.find((s) => String(s.studentId || '').toLowerCase() === wantId);
      if (!student) return err('Student পাওয়া যায়নি', 404);

      const date = (body.date || new Date().toISOString().slice(0, 10));
      const now = new Date().toISOString();
      const method = body.method === 'face' ? 'Face Punch' : 'Fingerprint Punch';
      const row = {
        id: `att_${student.id}_${date}`, studentId: student.id, date,
        classId: student.classId || '', sectionId: student.sectionId || '',
        status: body.status || 'Present', method, punchedAt: body.timestamp || now
      };
      await upsertStmt(env, 'attendance', row, now).run();
      return json({ ok: true, attendance: row }, 201);
    }

    const collection = parts[0];
    if (!collection) return err('Not found', 404);

    // ---------- /:collection ----------
    if (parts.length === 1) {
      if (request.method === 'GET') {
        if (!admin && !PUBLIC_READ.has(collection)) return err('Unauthorized', 401);
        let rows = await readAll(env, collection);
        const filter = PUBLIC_READ_FILTERS[collection];
        if (!admin && filter) rows = rows.filter(filter);
        return json(rows);
      }
      if (request.method === 'POST') {
        if (!admin && !PUBLIC_WRITE.has(collection)) return err('Unauthorized', 401);
        const row = await request.json();
        if (!row || !row.id) return err('id প্রয়োজন', 400);
        await upsertStmt(env, collection, row, new Date().toISOString()).run();
        return json(row, 201);
      }
      return err('Method not allowed', 405);
    }

    // ---------- /:collection/bulk , /:collection/replace-all , /:collection/:id ----------
    if (parts.length === 2) {
      const sub = parts[1];

      if (sub === 'bulk') {
        if (request.method !== 'POST') return err('Method not allowed', 405);
        if (!admin) return err('Unauthorized', 401);
        const rows = await request.json();
        if (!Array.isArray(rows)) return err('Array প্রয়োজন', 400);
        const now = new Date().toISOString();
        const stmts = rows.map((row) => upsertStmt(env, collection, row, now));
        if (stmts.length) await env.DB.batch(stmts);
        return json(rows, 201);
      }

      if (sub === 'replace-all') {
        if (request.method !== 'POST') return err('Method not allowed', 405);
        if (!admin) return err('Unauthorized', 401);
        const rows = await request.json();
        if (!Array.isArray(rows)) return err('Array প্রয়োজন', 400);
        const now = new Date().toISOString();
        const stmts = [env.DB.prepare('DELETE FROM documents WHERE collection = ?').bind(collection)];
        for (const row of rows) stmts.push(upsertStmt(env, collection, row, now));
        await env.DB.batch(stmts);
        return json({ ok: true });
      }

      const id = sub;
      if (request.method === 'GET') {
        if (!admin && !PUBLIC_READ.has(collection)) return err('Unauthorized', 401);
        const row = await readOne(env, collection, id);
        if (!row) return err('Not found', 404);
        const filter = PUBLIC_READ_FILTERS[collection];
        if (!admin && filter && !filter(row)) return err('Not found', 404);
        return json(row);
      }
      if (request.method === 'PATCH') {
        if (!admin && !PUBLIC_WRITE.has(collection)) return err('Unauthorized', 401);
        const patch = await request.json();
        const existing = await readOne(env, collection, id);
        if (!existing) return err('Record not found', 404);
        const merged = { ...existing, ...patch, id, updatedAt: new Date().toISOString() };
        await upsertStmt(env, collection, merged, new Date().toISOString()).run();
        return json(merged);
      }
      if (request.method === 'DELETE') {
        if (!admin) return err('Unauthorized', 401);
        await env.DB.prepare('DELETE FROM documents WHERE collection = ? AND id = ?').bind(collection, id).run();
        return json({ ok: true });
      }
      return err('Method not allowed', 405);
    }

    return err('Not found', 404);
  } catch (e) {
    return err(e.message || 'Server error', 500);
  }
}
