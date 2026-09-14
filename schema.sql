-- Cloudflare D1 schema for the School Management System.
-- Run once, right after creating the D1 database:
--   npx wrangler d1 execute school-db --remote --file=./schema.sql
--
-- Design: a single generic "documents" table stores every collection
-- (students, teachers, payments, results, notices, ...) as one JSON blob
-- per row. This exactly mirrors the app's existing LocalStorage adapter
-- (DB.list / get / insert / update / remove / query per "collection"),
-- so functions/api/[[path]].js can serve as a drop-in replacement with
-- no per-collection schema/migration work.

CREATE TABLE IF NOT EXISTS documents (
  collection TEXT NOT NULL,
  id TEXT NOT NULL,
  data TEXT NOT NULL,        -- full JSON record, exactly as the app sends it
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (collection, id)
);

CREATE INDEX IF NOT EXISTS idx_documents_collection ON documents (collection);
