-- Services Command Center — Flat Schema (matches app types exactly)
-- Run this in Supabase SQL Editor: Dashboard > SQL Editor > New query

-- ── Items ──────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS items (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  item_number TEXT,
  title TEXT NOT NULL,
  category_name TEXT NOT NULL,
  category_slug TEXT NOT NULL DEFAULT '',
  workstream TEXT,
  owner_name TEXT,
  owner_secondary_name TEXT,
  status TEXT NOT NULL DEFAULT 'not_started',
  priority TEXT,
  eta TEXT,
  actual_end_date TEXT,
  source TEXT,
  sprint TEXT,
  remarks TEXT,
  details TEXT,
  expected_impact TEXT,
  sheet_tab TEXT,
  is_archived BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_items_status ON items(status);
CREATE INDEX IF NOT EXISTS idx_items_sheet_tab ON items(sheet_tab);
CREATE INDEX IF NOT EXISTS idx_items_category ON items(category_name);

-- ── Changes / Changelog ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS changes (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  item_id TEXT,
  item_title TEXT NOT NULL,
  category_name TEXT NOT NULL,
  workstream TEXT,
  field_changed TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT,
  changed_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_changes_changed_at ON changes(changed_at DESC);

-- ── Meetings ───────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS meetings (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  title TEXT NOT NULL,
  date TEXT NOT NULL,
  transcript TEXT DEFAULT '',
  attendees TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ── Meeting Decisions ──────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS meeting_decisions (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  meeting_id TEXT NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'aligned' CHECK (status IN ('aligned','needs_discussion'))
);

-- ── Meeting Action Items ───────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS meeting_action_items (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  meeting_id TEXT NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  owner TEXT DEFAULT '',
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','accepted','skipped','added_to_tracker')),
  category_suggestion TEXT
);

-- ── Approvals ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS approvals (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  title TEXT NOT NULL,
  description TEXT,
  source TEXT NOT NULL,
  type TEXT NOT NULL,
  item_id TEXT,
  item_title TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','approved','dismissed')),
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ── Sync Logs ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS sync_logs (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  source TEXT NOT NULL,
  action TEXT NOT NULL,
  details TEXT,
  items_affected INT DEFAULT 0,
  status TEXT DEFAULT 'success',
  synced_at TIMESTAMPTZ DEFAULT now()
);

-- ── Row Level Security (allow public read/write for now — add auth later) ──

ALTER TABLE items ENABLE ROW LEVEL SECURITY;
ALTER TABLE changes ENABLE ROW LEVEL SECURITY;
ALTER TABLE meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE meeting_decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE meeting_action_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public_all" ON items FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public_all" ON changes FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public_all" ON meetings FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public_all" ON meeting_decisions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public_all" ON meeting_action_items FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public_all" ON approvals FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public_all" ON sync_logs FOR ALL USING (true) WITH CHECK (true);
