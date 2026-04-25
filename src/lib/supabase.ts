import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Types
export type ServiceCategory = {
  id: string
  name: string
  slug: string
  item_count: number
  sort_order: number
}

export type Stakeholder = {
  id: string
  name: string
  email: string | null
  slack_user_id: string | null
  role: string | null
}

export type ServiceItem = {
  id: string
  item_number: string | null
  title: string
  category_id: string
  category?: ServiceCategory
  workstream: string | null
  owner_id: string | null
  owner?: Stakeholder
  owner_secondary_id: string | null
  owner_secondary?: Stakeholder
  status: string
  priority: string | null
  eta: string | null
  actual_end_date: string | null
  source: string | null
  sprint: string | null
  remarks: string | null
  details: string | null
  expected_impact: string | null
  sheet_row_number: number | null
  sheet_tab: string | null
  is_archived: boolean
  created_at: string
  updated_at: string
}

export type StatusChange = {
  id: string
  item_id: string
  field_changed: string
  old_value: string | null
  new_value: string | null
  changed_at: string
}

export type Meeting = {
  id: string
  title: string
  meeting_date: string
  attendees: string[]
  summary_text: string | null
  raw_transcript: string | null
  source_doc_id: string | null
  created_at: string
  decisions?: MeetingDecision[]
  action_items?: MeetingActionItem[]
  discussions?: MeetingDiscussion[]
}

export type MeetingDecision = {
  id: string
  meeting_id: string
  decision_text: string
  alignment: 'aligned' | 'needs_discussion'
  review_status: 'pending' | 'agreed' | 'skipped'
  linked_item_id: string | null
}

export type MeetingActionItem = {
  id: string
  meeting_id: string
  owner_name: string
  action_title: string
  action_description: string | null
  review_status: 'pending' | 'agreed' | 'skipped'
  linked_item_id: string | null
}

export type MeetingDiscussion = {
  id: string
  meeting_id: string
  topic: string
  summary: string | null
}

export type WeeklySnapshot = {
  id: string
  snapshot_date: string
  snapshot_data: Record<string, unknown>
  items_total: number
  items_done: number
  items_in_progress: number
  items_blocked: number
  items_overdue: number
}
