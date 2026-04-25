// Database access layer — uses Supabase when env vars are set, falls back to
// in-memory stores for local dev without a database configured.

import { createClient } from "@supabase/supabase-js"
import {
  getAllItems as memGetAllItems,
  getItem as memGetItem,
  updateItem as memUpdateItem,
  addItem as memAddItem,
  getChanges as memGetChanges,
  getStats as memGetStats,
  StoredItem,
  StoredChange,
} from "./data-store"
import {
  getAllMeetings as memGetAllMeetings,
  getMeeting as memGetMeeting,
  createMeeting as memCreateMeeting,
  getMeetingDecisions as memGetMeetingDecisions,
  getMeetingActionItems as memGetMeetingActionItems,
  updateActionItemStatus as memUpdateActionItemStatus,
  Meeting,
  MeetingDecision,
  MeetingActionItem,
} from "./meetings-store"

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

const supabase = url && key ? createClient(url, key) : null

function useDB(): boolean {
  return supabase !== null
}

// ── Items ────────────────────────────────────────────────────────────────────

export async function dbGetAllItems(tab?: string | null): Promise<StoredItem[]> {
  if (!useDB()) {
    const items = memGetAllItems()
    return tab ? items.filter(i => i.sheet_tab === tab) : items
  }
  let q = supabase!.from("items").select("*").eq("is_archived", false).order("category_name")
  if (tab) q = q.eq("sheet_tab", tab)
  const { data } = await q
  return (data as StoredItem[]) || []
}

export async function dbGetItem(id: string): Promise<StoredItem | null> {
  if (!useDB()) return memGetItem(id) || null
  const { data } = await supabase!.from("items").select("*").eq("id", id).single()
  return data as StoredItem | null
}

export async function dbUpdateItem(id: string, updates: Partial<StoredItem>): Promise<StoredItem | null> {
  if (!useDB()) return memUpdateItem(id, updates) || null

  // Track changes
  const prev = await dbGetItem(id)
  if (prev) {
    const tracked = ["status", "eta", "priority", "owner_name"]
    const changeRows = tracked
      .filter(k => updates[k as keyof StoredItem] !== undefined && updates[k as keyof StoredItem] !== prev[k as keyof StoredItem])
      .map(k => ({
        id: crypto.randomUUID(),
        item_id: id,
        item_title: prev.title,
        category_name: prev.category_name,
        workstream: prev.workstream,
        field_changed: k,
        old_value: String(prev[k as keyof StoredItem] ?? ""),
        new_value: String(updates[k as keyof StoredItem] ?? ""),
        changed_at: new Date().toISOString(),
      }))
    if (changeRows.length > 0) {
      await supabase!.from("changes").insert(changeRows)
    }
  }

  const { data } = await supabase!
    .from("items")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single()
  return data as StoredItem | null
}

export async function dbAddItem(item: Omit<StoredItem, "id" | "created_at" | "updated_at">): Promise<StoredItem> {
  if (!useDB()) return memAddItem(item)
  const newItem = {
    ...item,
    id: crypto.randomUUID(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }
  await supabase!.from("items").insert(newItem)
  await supabase!.from("changes").insert({
    id: crypto.randomUUID(),
    item_id: newItem.id,
    item_title: newItem.title,
    category_name: newItem.category_name,
    workstream: newItem.workstream,
    field_changed: "created",
    old_value: null,
    new_value: newItem.status,
    changed_at: new Date().toISOString(),
  })
  return newItem as StoredItem
}

export async function dbGetStats(tab?: string | null) {
  if (!useDB()) return memGetStats()
  const items = await dbGetAllItems(tab)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const weekFromNow = new Date(today)
  weekFromNow.setDate(weekFromNow.getDate() + 7)
  const active = items.filter(i => !i.is_archived)
  return {
    total: active.length,
    done: active.filter(i => i.status === "done" || i.status === "cancelled").length,
    in_progress: active.filter(i => i.status === "in_progress").length,
    not_started: active.filter(i => i.status === "not_started").length,
    blocked: active.filter(i => i.status === "blocked" || i.status === "on_hold").length,
    overdue: active.filter(i => {
      if (!i.eta || i.status === "done" || i.status === "cancelled") return false
      return new Date(i.eta) < today
    }).length,
    due_this_week: active.filter(i => {
      if (!i.eta || i.status === "done" || i.status === "cancelled") return false
      const eta = new Date(i.eta)
      return eta >= today && eta <= weekFromNow
    }).length,
  }
}

export async function dbGetChanges(days = 7): Promise<StoredChange[]> {
  if (!useDB()) return memGetChanges(days)
  const since = new Date()
  since.setDate(since.getDate() - days)
  const { data } = await supabase!
    .from("changes")
    .select("*")
    .gte("changed_at", since.toISOString())
    .order("changed_at", { ascending: false })
  return (data as StoredChange[]) || []
}

// ── Meetings ─────────────────────────────────────────────────────────────────

export async function dbGetAllMeetings(): Promise<Meeting[]> {
  if (!useDB()) return memGetAllMeetings()
  const { data } = await supabase!
    .from("meetings")
    .select("*")
    .order("date", { ascending: false })
  return (data as Meeting[]) || []
}

export async function dbGetMeeting(id: string): Promise<Meeting | null> {
  if (!useDB()) return memGetMeeting(id) || null
  const { data } = await supabase!.from("meetings").select("*").eq("id", id).single()
  return data as Meeting | null
}

export async function dbCreateMeeting(data: {
  title: string
  date: string
  transcript: string
  attendees: string[]
}): Promise<Meeting> {
  if (!useDB()) return memCreateMeeting(data)
  const id = crypto.randomUUID()
  const meeting: Meeting = {
    id,
    ...data,
    created_at: new Date().toISOString(),
  }
  await supabase!.from("meetings").insert(meeting)
  return meeting
}

export async function dbGetMeetingDecisions(meetingId: string): Promise<MeetingDecision[]> {
  if (!useDB()) return memGetMeetingDecisions(meetingId)
  const { data } = await supabase!
    .from("meeting_decisions")
    .select("*")
    .eq("meeting_id", meetingId)
  return (data as MeetingDecision[]) || []
}

export async function dbGetMeetingActionItems(meetingId: string): Promise<MeetingActionItem[]> {
  if (!useDB()) return memGetMeetingActionItems(meetingId)
  const { data } = await supabase!
    .from("meeting_action_items")
    .select("*")
    .eq("meeting_id", meetingId)
  return (data as MeetingActionItem[]) || []
}

export async function dbSaveMeetingDecisions(meetingId: string, decisions: Omit<MeetingDecision, "id" | "meeting_id">[]): Promise<void> {
  if (!useDB()) return
  const rows = decisions.map(d => ({ id: crypto.randomUUID(), meeting_id: meetingId, ...d }))
  if (rows.length > 0) await supabase!.from("meeting_decisions").insert(rows)
}

export async function dbSaveMeetingActionItems(meetingId: string, items: Omit<MeetingActionItem, "id" | "meeting_id">[]): Promise<void> {
  if (!useDB()) return
  const rows = items.map(a => ({ id: crypto.randomUUID(), meeting_id: meetingId, ...a }))
  if (rows.length > 0) await supabase!.from("meeting_action_items").insert(rows)
}

export async function dbUpdateActionItemStatus(
  meetingId: string,
  actionItemId: string,
  status: MeetingActionItem["status"]
): Promise<MeetingActionItem | null> {
  if (!useDB()) return memUpdateActionItemStatus(meetingId, actionItemId, status) || null
  const { data } = await supabase!
    .from("meeting_action_items")
    .update({ status })
    .eq("id", actionItemId)
    .eq("meeting_id", meetingId)
    .select()
    .single()
  return data as MeetingActionItem | null
}
