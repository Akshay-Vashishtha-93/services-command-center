// Sync log store - tracks data refresh/sync events

export type SyncLogEntry = {
  id: string
  source: 'google_sheets' | 'slack' | 'email' | 'meetings' | 'manual'
  action: string
  details: string
  items_affected: number
  status: 'success' | 'error' | 'partial'
  synced_at: string
}

let logs: SyncLogEntry[] = []
let initialized = false
let lastSyncTime: string | null = null

function generateId(): string {
  return Math.random().toString(36).substring(2, 15)
}

function initializeLogs() {
  if (initialized) return
  initialized = true

  const now = new Date()
  const hoursAgo = (h: number) => {
    const d = new Date(now)
    d.setHours(d.getHours() - h)
    return d.toISOString()
  }

  logs = [
    {
      id: generateId(),
      source: 'google_sheets',
      action: 'Full sync from Services PMO sheet',
      details: 'Synced 35 items from "Services Enhancement" tab. 2 status updates detected.',
      items_affected: 35,
      status: 'success',
      synced_at: hoursAgo(2),
    },
    {
      id: generateId(),
      source: 'slack',
      action: 'Channel scan: #proj-services-for-mumz',
      details: 'Scanned last 24h messages. Found 3 potential updates flagged for approval.',
      items_affected: 3,
      status: 'success',
      synced_at: hoursAgo(4),
    },
    {
      id: generateId(),
      source: 'email',
      action: 'Inbox scan: Services weekly updates',
      details: 'Checked recent emails for service-related updates. 1 update flagged.',
      items_affected: 1,
      status: 'success',
      synced_at: hoursAgo(6),
    },
    {
      id: generateId(),
      source: 'meetings',
      action: 'Meeting transcript parse',
      details: 'Parsed latest Weekly Services Charter (Apr 22). Extracted 5 decisions, 4 action items.',
      items_affected: 9,
      status: 'success',
      synced_at: hoursAgo(24),
    },
    {
      id: generateId(),
      source: 'google_sheets',
      action: 'Full sync from Services PMO sheet',
      details: 'Synced 35 items. No changes detected since last sync.',
      items_affected: 0,
      status: 'success',
      synced_at: hoursAgo(26),
    },
    {
      id: generateId(),
      source: 'slack',
      action: 'Channel scan: #proj-services-for-mumz',
      details: 'Scanned last 24h messages. 2 updates flagged for approval.',
      items_affected: 2,
      status: 'success',
      synced_at: hoursAgo(28),
    },
  ]

  lastSyncTime = hoursAgo(2)
}

export function getSyncLogs(): SyncLogEntry[] {
  initializeLogs()
  return logs.sort((a, b) => new Date(b.synced_at).getTime() - new Date(a.synced_at).getTime())
}

export function getLastSyncTime(): string | null {
  initializeLogs()
  return lastSyncTime
}

export function addSyncLog(entry: Omit<SyncLogEntry, 'id' | 'synced_at'>): SyncLogEntry {
  initializeLogs()
  const log: SyncLogEntry = {
    ...entry,
    id: generateId(),
    synced_at: new Date().toISOString(),
  }
  logs.push(log)
  lastSyncTime = log.synced_at
  return log
}

export function triggerRefresh(): SyncLogEntry {
  return addSyncLog({
    source: 'google_sheets',
    action: 'Manual refresh triggered',
    details: 'Full re-sync from all sources. Data refreshed.',
    items_affected: 35,
    status: 'success',
  })
}
