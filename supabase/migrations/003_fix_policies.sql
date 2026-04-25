-- Drop existing policies if any, then recreate cleanly
-- Paste this entire block into Supabase SQL Editor and Run

DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['items','changes','meetings','meeting_decisions','meeting_action_items','approvals','sync_logs']
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS "public_all" ON %I', t);
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('CREATE POLICY "public_all" ON %I FOR ALL USING (true) WITH CHECK (true)', t);
  END LOOP;
END $$;

-- Also ensure the new tables exist (safe to re-run)
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

CREATE TABLE IF NOT EXISTS meetings (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  title TEXT NOT NULL,
  date TEXT NOT NULL,
  transcript TEXT DEFAULT '',
  attendees TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS meeting_decisions (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  meeting_id TEXT NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'aligned' CHECK (status IN ('aligned','needs_discussion'))
);

CREATE TABLE IF NOT EXISTS meeting_action_items (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  meeting_id TEXT NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  owner TEXT DEFAULT '',
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','accepted','skipped','added_to_tracker')),
  category_suggestion TEXT
);

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

CREATE TABLE IF NOT EXISTS sync_logs (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  source TEXT NOT NULL,
  action TEXT NOT NULL,
  details TEXT,
  items_affected INT DEFAULT 0,
  status TEXT DEFAULT 'success',
  synced_at TIMESTAMPTZ DEFAULT now()
);
