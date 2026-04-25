"use client"

import { useState, useEffect } from "react"
import { Card, CardHeader, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { getStatusColor, getStatusLabel, cn } from "@/lib/utils"
import { ArrowRight, CheckCircle2, AlertTriangle, Clock, Plus, RefreshCw, FileText, Palette, Code, PenTool } from "lucide-react"
import Link from "next/link"

type Change = {
  id: string
  item_id: string
  item_title: string
  category_name: string
  field_changed: string
  old_value: string | null
  new_value: string | null
  changed_at: string
}

type Item = {
  id: string
  title: string
  workstream: string | null
}

const WORKSTREAM_CONFIG: Record<string, { label: string; color: string; icon: typeof Palette }> = {
  brand: { label: "Brand", color: "bg-[var(--mw-pink-light)] text-[var(--mw-pink)]", icon: Palette },
  tech: { label: "Tech", color: "bg-blue-50 text-[var(--mw-navy)]", icon: Code },
  design: { label: "Design", color: "bg-[var(--mw-purple-light)] text-[var(--mw-purple)]", icon: PenTool },
  strategy: { label: "Strategy", color: "bg-amber-50 text-amber-700", icon: FileText },
}

export function WeeklyChanges() {
  const [changes, setChanges] = useState<Change[]>([])
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [lastSync, setLastSync] = useState<string | null>(null)
  const [wsFilter, setWsFilter] = useState<string>("")

  useEffect(() => {
    Promise.all([
      fetch("/api/items/changes?days=7").then(r => r.json()),
      fetch("/api/items?tab=Services+Enhancement").then(r => r.json()),
      fetch("/api/sync").then(r => r.json()),
    ]).then(([changesData, itemsData, syncData]) => {
      setChanges(changesData)
      setItems(itemsData)
      setLastSync(syncData.last_sync)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  // Build workstream lookup from items
  const workstreamByTitle: Record<string, string> = {}
  items.forEach(item => {
    if (item.workstream) workstreamByTitle[item.title] = item.workstream
  })

  // Filter changes by workstream
  const filteredChanges = wsFilter
    ? changes.filter(c => workstreamByTitle[c.item_title] === wsFilter)
    : changes

  const completions = filteredChanges.filter(c => c.field_changed === 'status' && c.new_value === 'done')
  const statusChanges = filteredChanges.filter(c => c.field_changed === 'status' && c.new_value !== 'done')
  const etaChanges = filteredChanges.filter(c => c.field_changed === 'eta')
  const newItems = filteredChanges.filter(c => c.field_changed === 'created')

  async function handleRefresh() {
    setRefreshing(true)
    try {
      const res = await fetch("/api/sync", { method: "POST" })
      const data = await res.json()
      setLastSync(data.last_sync)
      // Re-fetch changes
      const changesRes = await fetch("/api/items/changes?days=7")
      const changesData = await changesRes.json()
      setChanges(changesData)
    } finally {
      setRefreshing(false)
    }
  }

  function timeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return "Just now"
    if (mins < 60) return `${mins}m ago`
    const hours = Math.floor(mins / 60)
    if (hours < 24) return `${hours}h ago`
    return `${Math.floor(hours / 24)}d ago`
  }

  const getChangeIcon = (change: Change) => {
    if (change.field_changed === 'status' && change.new_value === 'done') return <CheckCircle2 className="w-4 h-4 text-[var(--mw-teal)]" />
    if (change.field_changed === 'status' && (change.new_value === 'blocked' || change.new_value === 'delayed')) return <AlertTriangle className="w-4 h-4 text-[var(--mw-coral)]" />
    if (change.field_changed === 'eta') return <Clock className="w-4 h-4 text-[var(--mw-amber)]" />
    if (change.field_changed === 'created') return <Plus className="w-4 h-4 text-[var(--mw-navy)]" />
    return <ArrowRight className="w-4 h-4 text-[var(--mw-text-secondary)]" />
  }

  const getWorkstreamBadge = (title: string) => {
    const ws = workstreamByTitle[title]
    if (!ws || !WORKSTREAM_CONFIG[ws]) return null
    const cfg = WORKSTREAM_CONFIG[ws]
    return <Badge className={cn("text-[10px] px-1.5 py-0", cfg.color)}>{cfg.label}</Badge>
  }

  return (
    <Card>
      <CardHeader>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-[var(--mw-text-primary)]">This Week</h2>
            <div className="flex items-center gap-2">
              <Badge className="bg-[var(--mw-navy)]/10 text-[var(--mw-navy)]">{filteredChanges.length} changes</Badge>
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="p-1.5 rounded-lg hover:bg-gray-100 transition disabled:opacity-50"
                title="Refresh data"
              >
                <RefreshCw className={cn("w-4 h-4 text-[var(--mw-text-secondary)]", refreshing && "animate-spin")} />
              </button>
            </div>
          </div>

          {/* Last sync + Log link */}
          <div className="flex items-center justify-between text-xs text-[var(--mw-text-secondary)]">
            <span>
              {lastSync ? `Last sync: ${timeAgo(lastSync)}` : "Not synced yet"}
            </span>
            <Link href="/sync-log" className="text-[var(--mw-pink)] hover:underline font-medium">
              View Log
            </Link>
          </div>

          {/* Workstream filter pills */}
          <div className="flex items-center gap-1">
            <button onClick={() => setWsFilter("")}
              className={cn("px-2 py-1 rounded-lg text-[10px] font-medium transition",
                !wsFilter ? "bg-[var(--mw-navy)] text-white" : "bg-gray-100 text-[var(--mw-text-secondary)] hover:bg-gray-200")}>
              All
            </button>
            {Object.entries(WORKSTREAM_CONFIG).map(([key, cfg]) => (
              <button key={key} onClick={() => setWsFilter(wsFilter === key ? "" : key)}
                className={cn("px-2 py-1 rounded-lg text-[10px] font-medium transition",
                  wsFilter === key ? cn(cfg.color, "ring-1 ring-current") : "bg-gray-100 text-[var(--mw-text-secondary)] hover:bg-gray-200")}>
                {cfg.label}
              </button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-1 max-h-[600px] overflow-y-auto">
        {loading ? (
          <p className="text-[var(--mw-text-secondary)] text-sm">Loading changes...</p>
        ) : filteredChanges.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-[var(--mw-text-secondary)] text-sm">No changes this week yet.</p>
            <p className="text-[var(--mw-text-secondary)]/60 text-xs mt-1">Changes are tracked when you update item statuses.</p>
          </div>
        ) : (
          <>
            {completions.length > 0 && (
              <div className="mb-4">
                <p className="text-xs font-semibold text-[var(--mw-teal)] uppercase tracking-wide mb-2 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Completed ({completions.length})
                </p>
                {completions.map(c => (
                  <div key={c.id} className="flex items-start gap-2 py-1.5 text-sm">
                    {getChangeIcon(c)}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-[var(--mw-text-primary)] truncate">{c.item_title}</p>
                        {getWorkstreamBadge(c.item_title)}
                      </div>
                      <p className="text-xs text-[var(--mw-text-secondary)]">{c.category_name}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {statusChanges.length > 0 && (
              <div className="mb-4">
                <p className="text-xs font-semibold text-[var(--mw-navy)] uppercase tracking-wide mb-2 flex items-center gap-1">
                  <ArrowRight className="w-3.5 h-3.5" /> Status Changes ({statusChanges.length})
                </p>
                {statusChanges.map(c => (
                  <div key={c.id} className="flex items-start gap-2 py-1.5 text-sm">
                    {getChangeIcon(c)}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-[var(--mw-text-primary)] truncate">{c.item_title}</p>
                        {getWorkstreamBadge(c.item_title)}
                      </div>
                      <div className="flex items-center gap-1 mt-0.5">
                        <Badge className={getStatusColor(c.old_value || '')}>{getStatusLabel(c.old_value || '')}</Badge>
                        <ArrowRight className="w-3 h-3 text-[var(--mw-text-secondary)]" />
                        <Badge className={getStatusColor(c.new_value || '')}>{getStatusLabel(c.new_value || '')}</Badge>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {etaChanges.length > 0 && (
              <div className="mb-4">
                <p className="text-xs font-semibold text-[var(--mw-amber)] uppercase tracking-wide mb-2 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" /> ETA Changes ({etaChanges.length})
                </p>
                {etaChanges.map(c => (
                  <div key={c.id} className="flex items-start gap-2 py-1.5 text-sm">
                    {getChangeIcon(c)}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-[var(--mw-text-primary)] truncate">{c.item_title}</p>
                        {getWorkstreamBadge(c.item_title)}
                      </div>
                      <p className="text-xs text-[var(--mw-text-secondary)]">{c.old_value || '\u2014'} &rarr; {c.new_value || '\u2014'}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {newItems.length > 0 && (
              <div className="mb-4">
                <p className="text-xs font-semibold text-[var(--mw-purple)] uppercase tracking-wide mb-2 flex items-center gap-1">
                  <Plus className="w-3.5 h-3.5" /> New Items ({newItems.length})
                </p>
                {newItems.map(c => (
                  <div key={c.id} className="flex items-start gap-2 py-1.5 text-sm">
                    {getChangeIcon(c)}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-[var(--mw-text-primary)] truncate">{c.item_title}</p>
                        {getWorkstreamBadge(c.item_title)}
                      </div>
                      <p className="text-xs text-[var(--mw-text-secondary)]">{c.category_name}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}
