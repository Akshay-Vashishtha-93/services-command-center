// In-memory data store for local development (before Supabase is connected)
// This lets the app work immediately with seed data

import { getSeedData } from "./seed-data"

export type StoredItem = {
  id: string
  item_number: string | null
  title: string
  category_name: string
  category_slug: string
  workstream: string | null
  owner_name: string | null
  owner_secondary_name: string | null
  status: string
  priority: string | null
  eta: string | null
  actual_end_date: string | null
  source: string | null
  sprint: string | null
  remarks: string | null
  details: string | null
  expected_impact: string | null
  sheet_tab: string | null
  is_archived: boolean
  created_at: string
  updated_at: string
}

export type StoredChange = {
  id: string
  item_id: string
  item_title: string
  category_name: string
  workstream: string | null
  field_changed: string
  old_value: string | null
  new_value: string | null
  changed_at: string
}

let items: StoredItem[] = []
let initialized = false

function daysAgo(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString()
}

// Seed changes to show "What Changed This Week" UI out of the box
let changes: StoredChange[] = [
  { id: "sc1", item_id: "", item_title: "Babysitter Landing Page Redesign", category_name: "Babysitter", workstream: "design", field_changed: "status", old_value: "not_started", new_value: "in_progress", changed_at: daysAgo(1) },
  { id: "sc2", item_id: "", item_title: "Vendor Payment Link Generator", category_name: "Vendor Tools", workstream: "tech", field_changed: "status", old_value: "in_progress", new_value: "done", changed_at: daysAgo(2) },
  { id: "sc3", item_id: "", item_title: "Wallpaper SEO Audit", category_name: "Wallpaper", workstream: "brand", field_changed: "eta", old_value: "2026-04-30", new_value: "2026-05-07", changed_at: daysAgo(2) },
  { id: "sc4", item_id: "", item_title: "App Rating Push Campaign", category_name: "App", workstream: "brand", field_changed: "status", old_value: "not_started", new_value: "in_progress", changed_at: daysAgo(3) },
  { id: "sc5", item_id: "", item_title: "Gifting Service Tracker Setup", category_name: "Gifting", workstream: "strategy", field_changed: "created", old_value: null, new_value: "in_progress", changed_at: daysAgo(3) },
  { id: "sc6", item_id: "", item_title: "Homepage A/B Test — Brand Refresh", category_name: "Brand", workstream: "brand", field_changed: "status", old_value: "in_progress", new_value: "done", changed_at: daysAgo(4) },
  { id: "sc7", item_id: "", item_title: "Search Ranking Optimisation", category_name: "Tech", workstream: "tech", field_changed: "status", old_value: "blocked", new_value: "in_progress", changed_at: daysAgo(5) },
]

function generateId(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
}

function initializeData() {
  if (initialized) return
  initialized = true

  const seedData = getSeedData()
  let globalIndex = 0

  for (const category of seedData) {
    for (const item of category.items) {
      globalIndex++
      items.push({
        id: generateId(),
        item_number: item.item_number || String(globalIndex),
        title: item.title,
        category_name: category.name,
        category_slug: category.slug,
        workstream: item.workstream || null,
        owner_name: item.owners[0] || null,
        owner_secondary_name: item.owners[1] || null,
        status: item.status,
        priority: item.priority || null,
        eta: item.eta || null,
        actual_end_date: null,
        source: item.source || null,
        sprint: item.sprint || null,
        remarks: null,
        details: item.details || null,
        expected_impact: item.expected_impact || null,
        sheet_tab: item.sheet_tab,
        is_archived: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
    }
  }
}

export function getAllItems(): StoredItem[] {
  initializeData()
  return items
}

export function getItem(id: string): StoredItem | undefined {
  initializeData()
  return items.find(i => i.id === id)
}

export function updateItem(id: string, updates: Partial<StoredItem>): StoredItem | undefined {
  initializeData()
  const index = items.findIndex(i => i.id === id)
  if (index === -1) return undefined

  const prev = items[index]

  // Track changes for weekly diff
  for (const [key, value] of Object.entries(updates)) {
    const oldVal = (prev as Record<string, unknown>)[key]
    if (oldVal !== value && ['status', 'eta', 'priority', 'owner_name'].includes(key)) {
      changes.push({
        id: generateId(),
        item_id: id,
        item_title: prev.title,
        category_name: prev.category_name,
        workstream: prev.workstream,
        field_changed: key,
        old_value: oldVal != null ? String(oldVal) : null,
        new_value: value != null ? String(value) : null,
        changed_at: new Date().toISOString(),
      })
    }
  }

  items[index] = { ...prev, ...updates, updated_at: new Date().toISOString() }
  return items[index]
}

export function getChanges(days: number = 7): StoredChange[] {
  initializeData()
  const since = new Date()
  since.setDate(since.getDate() - days)
  return changes.filter(c => new Date(c.changed_at) >= since).sort((a, b) =>
    new Date(b.changed_at).getTime() - new Date(a.changed_at).getTime()
  )
}

export function getStats() {
  initializeData()
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const weekFromNow = new Date(today)
  weekFromNow.setDate(weekFromNow.getDate() + 7)

  const active = items.filter(i => !i.is_archived)
  return {
    total: active.length,
    done: active.filter(i => i.status === 'done' || i.status === 'cancelled').length,
    in_progress: active.filter(i => i.status === 'in_progress').length,
    not_started: active.filter(i => i.status === 'not_started').length,
    blocked: active.filter(i => i.status === 'blocked' || i.status === 'on_hold').length,
    overdue: active.filter(i => {
      if (!i.eta || i.status === 'done' || i.status === 'cancelled') return false
      return new Date(i.eta) < today
    }).length,
    due_this_week: active.filter(i => {
      if (!i.eta || i.status === 'done' || i.status === 'cancelled') return false
      const eta = new Date(i.eta)
      return eta >= today && eta <= weekFromNow
    }).length,
  }
}

export function addItem(item: Omit<StoredItem, 'id' | 'created_at' | 'updated_at'>): StoredItem {
  initializeData()
  const newItem: StoredItem = {
    ...item,
    id: generateId(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }
  items.push(newItem)

  // Track as new item
  changes.push({
    id: generateId(),
    item_id: newItem.id,
    item_title: newItem.title,
    category_name: newItem.category_name,
    workstream: newItem.workstream,
    field_changed: 'created',
    old_value: null,
    new_value: newItem.status,
    changed_at: new Date().toISOString(),
  })

  return newItem
}
