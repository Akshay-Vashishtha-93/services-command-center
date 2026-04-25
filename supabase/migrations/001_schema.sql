-- Services Command Center - Database Schema
-- Migration 001: Initial schema

-- service_categories: The service verticals
CREATE TABLE service_categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  item_count INT DEFAULT 0,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- stakeholders: People who own items
CREATE TABLE stakeholders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE,
  slack_user_id TEXT,
  role TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- service_items: The main initiatives (~100+ rows)
CREATE TABLE service_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  item_number TEXT,
  title TEXT NOT NULL,
  category_id UUID REFERENCES service_categories(id),
  workstream TEXT CHECK (workstream IN ('brand','design','tech','ops','product','strategy','all')),
  owner_id UUID REFERENCES stakeholders(id),
  owner_secondary_id UUID REFERENCES stakeholders(id),
  status TEXT NOT NULL DEFAULT 'not_started' CHECK (status IN ('not_started','in_progress','done','blocked','on_hold','cancelled','delayed')),
  priority TEXT CHECK (priority IN ('p0','p1','p2','p3')),
  eta DATE,
  actual_end_date DATE,
  source TEXT,
  sprint TEXT,
  remarks TEXT,
  details TEXT,
  expected_impact TEXT,
  sheet_row_number INT,
  sheet_tab TEXT,
  sync_hash TEXT,
  is_archived BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_items_category ON service_items(category_id);
CREATE INDEX idx_items_status ON service_items(status);
CREATE INDEX idx_items_owner ON service_items(owner_id);

-- status_changelog: Every change tracked for weekly diff
CREATE TABLE status_changelog (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  item_id UUID NOT NULL REFERENCES service_items(id) ON DELETE CASCADE,
  field_changed TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT,
  changed_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_changelog_item ON status_changelog(item_id);
CREATE INDEX idx_changelog_date ON status_changelog(changed_at);

-- weekly_snapshots: State snapshots for diff computation
CREATE TABLE weekly_snapshots (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  snapshot_date DATE NOT NULL,
  snapshot_data JSONB NOT NULL,
  items_total INT DEFAULT 0,
  items_done INT DEFAULT 0,
  items_in_progress INT DEFAULT 0,
  items_blocked INT DEFAULT 0,
  items_overdue INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- meetings: Meeting history
CREATE TABLE meetings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  meeting_date DATE NOT NULL,
  attendees TEXT[],
  summary_text TEXT,
  raw_transcript TEXT,
  source_doc_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- meeting_decisions
CREATE TABLE meeting_decisions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  meeting_id UUID NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  decision_text TEXT NOT NULL,
  alignment TEXT NOT NULL CHECK (alignment IN ('aligned','needs_discussion')),
  review_status TEXT DEFAULT 'pending' CHECK (review_status IN ('pending','agreed','skipped')),
  linked_item_id UUID REFERENCES service_items(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- meeting_action_items
CREATE TABLE meeting_action_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  meeting_id UUID NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  owner_name TEXT NOT NULL,
  action_title TEXT NOT NULL,
  action_description TEXT,
  review_status TEXT DEFAULT 'pending' CHECK (review_status IN ('pending','agreed','skipped')),
  linked_item_id UUID REFERENCES service_items(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- meeting_discussions
CREATE TABLE meeting_discussions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  meeting_id UUID NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  topic TEXT NOT NULL,
  summary TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
