/**
 * Cloudflare Pages Function — generic D1-backed document store for the
 * School Management System (admin.html + index.html both talk to this).
 *
 * Requires, on the Cloudflare Pages project:
 *   - a D1 database binding named  DB
 *   - an environment variable / secret named  ADMIN_API_KEY
 *     (must match the `adminKey` set in admin.html's APP_CONFIG)
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
 *
 * Access control:
 *   - Requests with a correct X-Admin-Key header can read/write anything.
 *   - Without that header, only PUBLIC_READ collections are readable (and some
 *     of those are row-filtered — e.g. only published notices/results, only
 *     active teachers), and only PUBLIC_WRITE collections accept inserts
 *     (the public admission-apply form, and the sequence counters it uses).
 *   - Everything else (students' individual PII stays inside PUBLIC_READ
 *     because the public "find my result"/print flow already needs it —
 *     see BACKEND.md for the exact trade-off) requires the admin key.
 */

const PUBLIC_READ = new Set([
  'school', 'teachers', 'classes', 'sections', 'subjects', 'notices',
  'events', 'albums', 'photos', 'videos', 'banners', 'results', 'exams',
  'students', 'counters'
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
