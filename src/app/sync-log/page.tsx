"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import Link from "next/link"
import {
  ArrowLeft,
  RefreshCw,
  Sheet,
  MessageSquare,
  Mail,
  Users,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Loader2,
  Clock,
} from "lucide-react"

type SyncLogEntry = {
  id: string
  source: string
  action: string
  details: string
  items_affected: number
  status: string
  synced_at: string
}

const SOURCE_CONFIG: Record<string, { label: string; icon: typeof Sheet; color: string }> = {
  google_sheets: { label: "Google Sheets", icon: Sheet, color: "bg-emerald-100 text-emerald-700" },
  slack: { label: "Slack", icon: MessageSquare, color: "bg-purple-100 text-purple-700" },
  email: { label: "Email", icon: Mail, color: "bg-blue-100 text-blue-700" },
  meetings: { label: "Meetings", icon: Users, color: "bg-[var(--mw-teal-light)] text-[var(--mw-teal)]" },
  manual: { label: "Manual", icon: RefreshCw, color: "bg-gray-100 text-gray-600" },
}

function formatTime(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleString("en-US", {
    month: "short", day: "numeric", hour: "numeric", minute: "2-digit", hour12: true,
  })
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

export default function SyncLogPage() {
  const [logs, setLogs] = useState<SyncLogEntry[]>([])
  const [lastSync, setLastSync] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    fetch("/api/sync")
      .then(r => r.json())
      .then(data => {
        setLogs(data.logs)
        setLastSync(data.last_sync)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  async function handleRefresh() {
    setRefreshing(true)
    try {
      const res = await fetch("/api/sync", { method: "POST" })
      const data = await res.json()
      setLastSync(data.last_sync)
      // Re-fetch all logs
      const logsRes = await fetch("/api/sync")
      const logsData = await logsRes.json()
      setLogs(logsData.logs)
    } finally {
      setRefreshing(false)
    }
  }

  const successCount = logs.filter(l => l.status === 'success').length
  const totalAffected = logs.reduce((sum, l) => sum + l.items_affected, 0)

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-sm text-[var(--mw-text-secondary)] hover:text-[var(--mw-navy)] mb-4">
          <ArrowLeft className="h-4 w-4" /> Back to Dashboard
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[var(--mw-navy)]">Sync Log</h1>
            <p className="text-sm text-[var(--mw-text-secondary)] mt-1">
              History of data syncs from Google Sheets, Slack, email, and meetings
            </p>
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-[var(--mw-pink)] text-white rounded-xl text-sm font-medium hover:bg-[var(--mw-pink-hover)] transition disabled:opacity-50"
          >
            {refreshing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            Refresh Now
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="py-4 px-5 flex items-center gap-3">
            <div className="p-2 rounded-xl bg-[var(--mw-teal-light)]">
              <CheckCircle2 className="w-5 h-5 text-[var(--mw-teal)]" />
            </div>
            <div>
              <p className="text-2xl font-bold text-[var(--mw-text-primary)]">{successCount}</p>
              <p className="text-xs text-[var(--mw-text-secondary)]">Successful Syncs</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4 px-5 flex items-center gap-3">
            <div className="p-2 rounded-xl bg-blue-100">
              <RefreshCw className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-[var(--mw-text-primary)]">{totalAffected}</p>
              <p className="text-xs text-[var(--mw-text-secondary)]">Items Processed</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4 px-5 flex items-center gap-3">
            <div className="p-2 rounded-xl bg-[var(--mw-amber-light)]">
              <Clock className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-sm font-bold text-[var(--mw-text-primary)]">
                {lastSync ? timeAgo(lastSync) : "Never"}
              </p>
              <p className="text-xs text-[var(--mw-text-secondary)]">Last Sync</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Data Feed Status */}
      <Card>
        <CardContent className="p-5">
          <h3 className="text-xs font-semibold text-[var(--mw-text-secondary)] uppercase tracking-wide mb-3">Active Data Feeds</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { source: "google_sheets", schedule: "Daily + On Refresh", active: true },
              { source: "slack", schedule: "Daily scan", active: true },
              { source: "email", schedule: "Daily scan", active: true },
              { source: "meetings", schedule: "On upload", active: true },
            ].map(feed => {
              const cfg = SOURCE_CONFIG[feed.source]
              return (
                <div key={feed.source} className="flex items-center gap-2.5 p-3 rounded-xl border border-[var(--mw-card-border)]">
                  <div className={cn("p-1.5 rounded-lg", cfg.color.split(' ')[0])}>
                    <cfg.icon className={cn("w-4 h-4", cfg.color.split(' ')[1])} />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-[var(--mw-text-primary)]">{cfg.label}</p>
                    <p className="text-[10px] text-[var(--mw-text-secondary)]">{feed.schedule}</p>
                  </div>
                  <span className="ml-auto w-2 h-2 rounded-full bg-emerald-500" title="Active" />
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Log Entries */}
      {loading ? (
        <div className="text-center py-12 text-[var(--mw-text-secondary)]">
          <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
          Loading sync history...
        </div>
      ) : (
        <div className="space-y-2">
          {logs.map(log => {
            const cfg = SOURCE_CONFIG[log.source] || SOURCE_CONFIG.manual
            return (
              <Card key={log.id} className={cn(
                "border-l-4",
                log.status === 'success' ? "border-l-emerald-500" :
                log.status === 'error' ? "border-l-red-500" :
                "border-l-amber-500"
              )}>
                <CardContent className="py-3 px-5">
                  <div className="flex items-start gap-3">
                    <div className={cn("p-1.5 rounded-lg mt-0.5 shrink-0", cfg.color.split(' ')[0])}>
                      <cfg.icon className={cn("w-4 h-4", cfg.color.split(' ')[1])} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-[var(--mw-text-primary)]">{log.action}</p>
                        {log.status === 'success' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />}
                        {log.status === 'error' && <XCircle className="w-3.5 h-3.5 text-red-500 shrink-0" />}
                        {log.status === 'partial' && <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />}
                      </div>
                      <p className="text-xs text-[var(--mw-text-secondary)] mt-0.5">{log.details}</p>
                      <div className="flex items-center gap-3 mt-1.5">
                        <Badge className={cfg.color}>{cfg.label}</Badge>
                        {log.items_affected > 0 && (
                          <span className="text-xs text-[var(--mw-text-secondary)]">{log.items_affected} items</span>
                        )}
                        <span className="text-xs text-[var(--mw-text-secondary)]">{formatTime(log.synced_at)}</span>
                      </div>
                    </div>
                    <span className="text-xs text-[var(--mw-text-secondary)] shrink-0">{timeAgo(log.synced_at)}</span>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
