"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ServiceHub } from "@/components/dashboard/service-hub"
import {
  getDaysUntil,
  formatDate,
  getStatusColor,
  getStatusLabel,
  cn,
} from "@/lib/utils"
import Link from "next/link"
import {
  Plus,
  FileText,
  CalendarClock,
  CalendarDays,
  Activity,
  Loader2,
  ShieldCheck,
  ArrowRight,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  AlertTriangle,
  Clock,
  X,
  TrendingUp,
} from "lucide-react"
import type { StoredItem, StoredChange } from "@/lib/data-store"

type Stats = {
  total: number
  done: number
  in_progress: number
  not_started: number
  blocked: number
  overdue: number
  due_this_week: number
}

const STATUS_CHART_COLORS: Record<string, string> = {
  done: "var(--mw-teal)",
  in_progress: "var(--mw-navy)",
  not_started: "#94a3b8",
  blocked: "var(--mw-coral)",
  on_hold: "var(--mw-amber)",
  delayed: "#f97316",
  cancelled: "#cbd5e1",
}

const STATUS_LABELS: Record<string, string> = {
  done: "Done",
  in_progress: "In Progress",
  not_started: "Not Started",
  blocked: "Blocked",
  on_hold: "On Hold",
  delayed: "Delayed",
  cancelled: "Cancelled",
}

// ─── SVG Ring Chart (from reports) ────────────────────────────────────────────
function RingChart({
  value,
  max,
  size = 72,
  stroke = 7,
  color,
  bgColor = "#e5e7eb",
}: {
  value: number
  max: number
  size?: number
  stroke?: number
  color: string
  bgColor?: string
}) {
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const pct = max > 0 ? value / max : 0
  const offset = circumference * (1 - pct)

  return (
    <svg width={size} height={size} className="transform -rotate-90">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={bgColor}
        strokeWidth={stroke}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={stroke}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        className="transition-all duration-700 ease-out"
      />
    </svg>
  )
}

// ─── Donut Chart ──────────────────────────────────────────────────────────────
function DonutChart({ distribution, total }: { distribution: Record<string, number>; total: number }) {
  const size = 180
  const strokeWidth = 28
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const center = size / 2

  let cumulativeOffset = 0
  const segments = Object.entries(distribution)
    .filter(([, count]) => count > 0)
    .map(([status, count]) => {
      const pct = count / total
      const dashLength = pct * circumference
      const gap = circumference - dashLength
      const offset = -cumulativeOffset
      cumulativeOffset += dashLength
      return { status, count, pct, dashLength, gap, offset, color: STATUS_CHART_COLORS[status] || "#94a3b8" }
    })

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <circle cx={center} cy={center} r={radius} fill="none" stroke="#e8edf2" strokeWidth={strokeWidth} />
          {segments.map((seg) => (
            <circle
              key={seg.status}
              cx={center}
              cy={center}
              r={radius}
              fill="none"
              stroke={seg.color}
              strokeWidth={strokeWidth}
              strokeDasharray={`${seg.dashLength} ${seg.gap}`}
              strokeDashoffset={seg.offset}
              strokeLinecap="butt"
              transform={`rotate(-90 ${center} ${center})`}
              style={{ transition: "stroke-dasharray 0.6s ease, stroke-dashoffset 0.6s ease" }}
            />
          ))}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-bold text-[var(--mw-text-primary)]">{total}</span>
          <span className="text-xs text-[var(--mw-text-secondary)]">Total</span>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-x-6 gap-y-1.5">
        {segments.map((seg) => (
          <div key={seg.status} className="flex items-center gap-2 text-sm">
            <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: seg.color }} />
            <span className="text-[var(--mw-text-secondary)]">{STATUS_LABELS[seg.status] || seg.status}</span>
            <span className="font-semibold text-[var(--mw-text-primary)] ml-auto">{seg.count}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Upcoming Timeline ────────────────────────────────────────────────────────
function UpcomingTimeline({ items }: { items: StoredItem[] }) {
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  const twoWeeks = new Date(now)
  twoWeeks.setDate(twoWeeks.getDate() + 14)

  const upcoming = items.filter((item) => {
    if (!item.eta) return false
    if (item.status === "done" || item.status === "cancelled") return false
    const etaDate = new Date(item.eta)
    etaDate.setHours(0, 0, 0, 0)
    return etaDate >= now && etaDate <= twoWeeks
  })

  if (upcoming.length === 0) {
    return (
      <div className="text-center py-8 text-[var(--mw-text-secondary)] text-sm">
        No upcoming deadlines in the next 2 weeks
      </div>
    )
  }

  const byService: Record<string, StoredItem[]> = {}
  upcoming.forEach((item) => {
    const svc = item.category_name || "General"
    if (!byService[svc]) byService[svc] = []
    byService[svc].push(item)
  })

  const sortedServices = Object.entries(byService).sort(([, a], [, b]) => {
    const minA = Math.min(...a.map(i => new Date(i.eta!).getTime()))
    const minB = Math.min(...b.map(i => new Date(i.eta!).getTime()))
    return minA - minB
  })

  return (
    <div className="flex flex-wrap gap-3">
      {sortedServices.map(([service, svcItems]) => {
        const sorted = [...svcItems].sort((a, b) => new Date(a.eta!).getTime() - new Date(b.eta!).getTime())
        const earliest = getDaysUntil(sorted[0].eta)
        const hasUrgent = earliest !== null && earliest <= 3

        return (
          <div
            key={service}
            className={cn(
              "rounded-xl border p-3 min-w-[180px] max-w-[220px] flex-shrink-0",
              hasUrgent
                ? "border-[var(--mw-coral)] bg-[var(--mw-coral-light)]/30"
                : "border-[var(--mw-card-border)] bg-white"
            )}
          >
            <p className={cn(
              "text-xs font-bold truncate mb-2",
              hasUrgent ? "text-[var(--mw-coral)]" : "text-[var(--mw-navy)]"
            )}>
              {service}
            </p>
            <div className="space-y-1.5">
              {sorted.map((item) => {
                const days = getDaysUntil(item.eta)
                const isUrgent = days !== null && days <= 3
                return (
                  <div key={item.id} className="flex items-start justify-between gap-2">
                    <p className="text-[11px] text-[var(--mw-text-primary)] leading-tight line-clamp-2 flex-1" title={item.title}>
                      {item.title}
                    </p>
                    <span className={cn(
                      "text-[10px] font-semibold whitespace-nowrap flex-shrink-0",
                      isUrgent ? "text-[var(--mw-coral)]" : "text-[var(--mw-text-secondary)]"
                    )}>
                      {days === 0 ? "Today" : `${days}d`}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── Date helpers ─────────────────────────────────────────────────────────────
function isWithinNextDays(dateStr: string | null, days: number): boolean {
  if (!dateStr) return false
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const target = new Date(dateStr)
  target.setHours(0, 0, 0, 0)
  const diff = (target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  return diff >= 0 && diff <= days
}

function isOverdue(item: StoredItem): boolean {
  if (!item.eta || item.status === "done" || item.status === "cancelled") return false
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return new Date(item.eta) < today
}

// ─── Gantt helpers ────────────────────────────────────────────────────────────
function getItemColor(item: StoredItem): string {
  if (item.status === "done") return "#0d9488"
  if (item.status === "blocked" || item.status === "on_hold") return "#ef4444"
  if (isOverdue(item)) return "#f59e0b"
  if (item.status === "in_progress") return "#3b82f6"
  return "#94a3b8"
}

type ApprovalSummary = { pending: number; conflicts: number }

export default function DashboardPage() {
  const [items, setItems] = useState<StoredItem[]>([])
  const [stats, setStats] = useState<Stats>({
    total: 0,
    done: 0,
    in_progress: 0,
    not_started: 0,
    blocked: 0,
    overdue: 0,
    due_this_week: 0,
  })
  const [changes, setChanges] = useState<StoredChange[]>([])
  const [loading, setLoading] = useState(true)
  const [approvals, setApprovals] = useState<ApprovalSummary>({ pending: 0, conflicts: 0 })
  const [refreshing, setRefreshing] = useState(false)
  const [lastSync, setLastSync] = useState<string | null>(null)
  const [timelineOpen, setTimelineOpen] = useState(false)
  const [changesDrawerOpen, setChangesDrawerOpen] = useState(false)
  const [syncDialogOpen, setSyncDialogOpen] = useState(false)
  const [meetingDate, setMeetingDate] = useState("")
  const [lastMeetingDate, setLastMeetingDate] = useState<string | null>(null)
  function fetchAll() {
    Promise.all([
      fetch("/api/items?tab=Services+Enhancement").then((r) => r.json()),
      fetch("/api/items/stats?tab=Services+Enhancement").then((r) => r.json()),
      fetch("/api/items/changes?days=7").then((r) => r.json()),
    ])
      .then(([itemsData, statsData, changesData]) => {
        setItems(itemsData)
        setStats(statsData)
        setChanges(changesData)
        setLoading(false)
      })
      .catch(() => setLoading(false))

    fetch("/api/approvals?pending=true")
      .then(r => r.json())
      .then((data: Array<{ type: string }>) => {
        setApprovals({
          pending: data.length,
          conflicts: data.filter(a => a.type === 'conflict').length,
        })
      })
      .catch(() => {})

    fetch("/api/sync")
      .then(r => r.json())
      .then(data => setLastSync(data.last_sync))
      .catch(() => {})

    fetch("/api/settings")
      .then(r => r.json())
      .then(data => setLastMeetingDate(data.last_meeting_date))
      .catch(() => {})
  }

  useEffect(() => { fetchAll() }, [])

  function openSyncDialog() {
    setMeetingDate(lastMeetingDate || "")
    setSyncDialogOpen(true)
  }

  async function handleSync() {
    setSyncDialogOpen(false)
    setRefreshing(true)
    try {
      const body: Record<string, string> = {}
      if (meetingDate) body.meeting_date = meetingDate
      await fetch("/api/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      if (meetingDate) {
        await fetch("/api/settings", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ last_meeting_date: meetingDate }),
        })
        setLastMeetingDate(meetingDate)
      }
      fetchAll()
    } finally {
      setTimeout(() => setRefreshing(false), 800)
    }
  }

  // Filter to Services Enhancement tab only
  const filteredItems = useMemo(
    () => items.filter((i) => i.sheet_tab === "Services Enhancement" && !i.is_archived),
    [items]
  )

  // Recompute stats from filtered items
  const filteredStats = useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const nextWeek = new Date(today)
    nextWeek.setDate(nextWeek.getDate() + 7)

    const total = filteredItems.length
    const done = filteredItems.filter((i) => i.status === "done").length
    const in_progress = filteredItems.filter((i) => i.status === "in_progress").length
    const not_started = filteredItems.filter((i) => i.status === "not_started").length
    const blocked = filteredItems.filter(
      (i) => i.status === "blocked" || i.status === "on_hold"
    ).length
    const overdue = filteredItems.filter((i) => isOverdue(i)).length
    const due_this_week = filteredItems.filter(
      (i) =>
        i.eta &&
        i.status !== "done" &&
        i.status !== "cancelled" &&
        isWithinNextDays(i.eta, 7)
    ).length

    return { total, done, in_progress, not_started, blocked, overdue, due_this_week }
  }, [filteredItems])

  // Derived calculations
  const active = filteredStats.total - filteredStats.done
  const onTrackPct =
    active > 0
      ? Math.round(
          ((active - filteredStats.overdue - filteredStats.blocked) / active) * 100
        )
      : 100
  const completionPct =
    filteredStats.total > 0
      ? Math.round((filteredStats.done / filteredStats.total) * 100)
      : 0

  // Compute status distribution for donut
  const statusDistribution: Record<string, number> = {}
  filteredItems.forEach((item) => {
    statusDistribution[item.status] = (statusDistribution[item.status] || 0) + 1
  })

  // Gantt data
  const ganttData = useMemo(() => {
    const withEta = filteredItems.filter((i) => i.eta && i.status !== "cancelled")
    const byCat = new Map<string, StoredItem[]>()
    for (const item of withEta) {
      const arr = byCat.get(item.category_name) || []
      arr.push(item)
      byCat.set(item.category_name, arr)
    }
    return Array.from(byCat.entries()).map(([cat, catItems]) => ({
      category: cat,
      items: catItems.sort(
        (a, b) => new Date(a.eta!).getTime() - new Date(b.eta!).getTime()
      ),
    }))
  }, [filteredItems])

  // Gantt timeline range
  const ganttRange = useMemo(() => {
    const now = new Date()
    const allEtas = filteredItems
      .filter((i) => i.eta && i.status !== "cancelled")
      .map((i) => new Date(i.eta!).getTime())
    if (allEtas.length === 0) return { start: now, end: now, weeks: 0 }
    const minDate = new Date(Math.min(now.getTime() - 14 * 86400000, ...allEtas))
    const maxDate = new Date(Math.max(now.getTime() + 28 * 86400000, ...allEtas))
    const start = new Date(minDate)
    start.setDate(start.getDate() - start.getDay())
    start.setHours(0, 0, 0, 0)
    const end = new Date(maxDate)
    end.setDate(end.getDate() + (6 - end.getDay()))
    end.setHours(23, 59, 59, 999)
    const weeks = Math.ceil((end.getTime() - start.getTime()) / (7 * 86400000))
    return { start, end, weeks }
  }, [filteredItems])

  function ganttPosition(dateStr: string): number {
    const d = new Date(dateStr).getTime()
    const range = ganttRange.end.getTime() - ganttRange.start.getTime()
    if (range === 0) return 0
    return ((d - ganttRange.start.getTime()) / range) * 100
  }

  function ganttTodayPosition(): number {
    const now = new Date().getTime()
    const range = ganttRange.end.getTime() - ganttRange.start.getTime()
    if (range === 0) return 0
    return ((now - ganttRange.start.getTime()) / range) * 100
  }

  const ganttWeekLabels = useMemo(() => {
    const labels: { label: string; position: number }[] = []
    const current = new Date(ganttRange.start)
    while (current <= ganttRange.end) {
      const pos =
        ((current.getTime() - ganttRange.start.getTime()) /
          (ganttRange.end.getTime() - ganttRange.start.getTime())) *
        100
      labels.push({
        label: current.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        }),
        position: pos,
      })
      current.setDate(current.getDate() + 7)
    }
    return labels
  }, [ganttRange])

  // Count upcoming deadlines + due items for badge
  const upcomingCount = useMemo(() => {
    const now = new Date()
    now.setHours(0, 0, 0, 0)
    const twoWeeks = new Date(now)
    twoWeeks.setDate(twoWeeks.getDate() + 14)
    return filteredItems.filter((item) => {
      if (!item.eta) return false
      if (item.status === "done" || item.status === "cancelled") return false
      const etaDate = new Date(item.eta)
      etaDate.setHours(0, 0, 0, 0)
      return etaDate >= now && etaDate <= twoWeeks
    }).length
  }, [filteredItems])

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* ─── 1. Header + Actions ─────────────────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--mw-navy)]">Services Command Center</h1>
          <div className="flex items-center gap-3 mt-1">
            <p className="text-sm text-[var(--mw-text-secondary)]">
              Track all services initiatives across verticals
            </p>
            {lastSync && (
              <span className="text-xs text-[var(--mw-text-secondary)] border-l border-[var(--mw-card-border)] pl-3">
                Last sync: {new Date(lastSync).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
              </span>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={openSyncDialog}
            disabled={refreshing}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all border border-[var(--mw-card-border)] bg-white text-[var(--mw-text-primary)] hover:bg-gray-50 disabled:opacity-50"
          >
            <RefreshCw className={cn("w-4 h-4", refreshing && "animate-spin")} />
            {refreshing ? "Syncing..." : "Sync"}
          </button>
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-sm hover:shadow-md bg-[var(--mw-navy)] text-white hover:bg-[var(--mw-navy-light)]"
          >
            <FileText className="w-4 h-4" />
            Print
          </button>
          <Link
            href="/meetings/new"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-sm hover:shadow-md bg-[var(--mw-pink)] text-white hover:bg-[var(--mw-pink-hover)]"
          >
            <Plus className="w-4 h-4" />
            Add Meeting
          </Link>
        </div>
      </div>

      {/* ─── 2. Approval Alert Banner ────────────────────────────────────── */}
      {approvals.pending > 0 && (
        <Link href="/approvals" className="block">
          <div className={cn(
            "rounded-xl p-4 flex items-center justify-between transition-all hover:shadow-md",
            approvals.conflicts > 0
              ? "bg-[var(--mw-coral-light)] border border-[var(--mw-coral)]/20"
              : "bg-[var(--mw-amber-light)] border border-amber-200"
          )}>
            <div className="flex items-center gap-3">
              <div className={cn("p-2 rounded-xl", approvals.conflicts > 0 ? "bg-[var(--mw-coral)]/10" : "bg-amber-200/50")}>
                <ShieldCheck className={cn("w-5 h-5", approvals.conflicts > 0 ? "text-[var(--mw-coral)]" : "text-amber-700")} />
              </div>
              <div>
                <p className="text-sm font-medium text-[var(--mw-text-primary)]">
                  {approvals.pending} update{approvals.pending !== 1 ? 's' : ''} flagged from Slack, email & meetings
                  {approvals.conflicts > 0 && <span className="text-[var(--mw-coral)]"> ({approvals.conflicts} conflict{approvals.conflicts !== 1 ? 's' : ''})</span>}
                </p>
                <p className="text-xs text-[var(--mw-text-secondary)]">Review and approve before they go stale</p>
              </div>
            </div>
            <ArrowRight className="w-5 h-5 text-[var(--mw-text-secondary)]" />
          </div>
        </Link>
      )}

      {/* ─── 3. Executive KPI Cards (ring charts) ────────────────────────── */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="flex items-center justify-center py-8">
                <Loader2 className="w-5 h-5 animate-spin text-[var(--mw-text-secondary)]" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {/* Total Items */}
          <Card className="relative overflow-hidden">
            <CardContent className="flex items-center gap-4 py-5">
              <div className="relative flex-shrink-0">
                <RingChart
                  value={filteredStats.total}
                  max={filteredStats.total}
                  color="var(--mw-navy)"
                  size={64}
                  stroke={6}
                />
                <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-[var(--mw-navy)]">
                  {filteredStats.total}
                </span>
              </div>
              <div>
                <p className="text-xs font-medium text-[var(--mw-text-secondary)] uppercase tracking-wider">
                  Total Items
                </p>
                <p className="text-xl font-bold text-[var(--mw-navy)]">
                  {filteredStats.total}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Completed */}
          <Card className="relative overflow-hidden">
            <CardContent className="flex items-center gap-4 py-5">
              <div className="relative flex-shrink-0">
                <RingChart
                  value={filteredStats.done}
                  max={filteredStats.total}
                  color="#0d9488"
                  size={64}
                  stroke={6}
                />
                <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-teal-700">
                  {completionPct}%
                </span>
              </div>
              <div>
                <p className="text-xs font-medium text-[var(--mw-text-secondary)] uppercase tracking-wider">
                  Completed
                </p>
                <p className="text-xl font-bold text-teal-700">
                  {filteredStats.done}
                  <span className="text-xs font-normal text-[var(--mw-text-secondary)] ml-1">
                    / {filteredStats.total}
                  </span>
                </p>
              </div>
            </CardContent>
          </Card>

          {/* In Progress */}
          <Card className="relative overflow-hidden">
            <CardContent className="flex items-center gap-4 py-5">
              <div className="relative flex-shrink-0">
                <RingChart
                  value={filteredStats.in_progress}
                  max={filteredStats.total}
                  color="#3b82f6"
                  size={64}
                  stroke={6}
                />
                <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-blue-600">
                  {filteredStats.in_progress}
                </span>
              </div>
              <div>
                <p className="text-xs font-medium text-[var(--mw-text-secondary)] uppercase tracking-wider">
                  In Progress
                </p>
                <p className="text-xl font-bold text-blue-600">
                  {filteredStats.in_progress}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Blocked / At Risk */}
          <Card className="relative overflow-hidden">
            <CardContent className="flex items-center gap-4 py-5">
              <div className="relative flex-shrink-0">
                <RingChart
                  value={filteredStats.blocked + filteredStats.overdue}
                  max={filteredStats.total}
                  color="#ef4444"
                  size={64}
                  stroke={6}
                />
                <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-red-600">
                  {filteredStats.blocked + filteredStats.overdue}
                </span>
              </div>
              <div>
                <p className="text-xs font-medium text-[var(--mw-text-secondary)] uppercase tracking-wider">
                  Blocked / Risk
                </p>
                <div className="flex items-baseline gap-2">
                  <p className="text-xl font-bold text-red-600">
                    {filteredStats.blocked}
                  </p>
                  <span className="text-xs text-[var(--mw-text-secondary)]">
                    blocked
                  </span>
                  <p className="text-xl font-bold text-amber-600">
                    {filteredStats.overdue}
                  </p>
                  <span className="text-xs text-[var(--mw-text-secondary)]">
                    overdue
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* On Track % */}
          <Card className="relative overflow-hidden">
            <CardContent className="flex items-center gap-4 py-5">
              <div className="relative flex-shrink-0">
                <RingChart
                  value={onTrackPct}
                  max={100}
                  color={onTrackPct >= 70 ? "#0d9488" : onTrackPct >= 40 ? "#f59e0b" : "#ef4444"}
                  size={64}
                  stroke={6}
                />
                <span
                  className={cn(
                    "absolute inset-0 flex items-center justify-center text-sm font-bold",
                    onTrackPct >= 70
                      ? "text-teal-700"
                      : onTrackPct >= 40
                      ? "text-amber-600"
                      : "text-red-600"
                  )}
                >
                  {onTrackPct}%
                </span>
              </div>
              <div>
                <p className="text-xs font-medium text-[var(--mw-text-secondary)] uppercase tracking-wider">
                  On Track
                </p>
                <p
                  className={cn(
                    "text-xl font-bold",
                    onTrackPct >= 70
                      ? "text-teal-700"
                      : onTrackPct >= 40
                      ? "text-amber-600"
                      : "text-red-600"
                  )}
                >
                  {onTrackPct}%
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ─── 4. Donut (1/3) + Deadlines & Due Items (2/3) ────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Left column: Donut + This Week compact card */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-[var(--mw-pink-light)]">
                  <Activity className="w-4 h-4 text-[var(--mw-pink)]" />
                </div>
                <h2 className="text-sm font-semibold text-[var(--mw-text-primary)]">Status Distribution</h2>
              </div>
            </CardHeader>
            <CardContent className="flex justify-center py-4">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-[var(--mw-text-secondary)]" />
                </div>
              ) : (
                <DonutChart distribution={statusDistribution} total={filteredItems.length} />
              )}
            </CardContent>
          </Card>

          {/* This Week — compact clickable card */}
          <Card
            className="cursor-pointer hover:shadow-md hover:border-[var(--mw-pink)]/30 transition-all"
            onClick={() => setChangesDrawerOpen(true)}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-[var(--mw-navy)]/5">
                    <TrendingUp className="w-4 h-4 text-[var(--mw-navy)]" />
                  </div>
                  <h3 className="text-sm font-semibold text-[var(--mw-text-primary)]">This Week</h3>
                </div>
                <Badge className="bg-[var(--mw-navy)]/10 text-[var(--mw-navy)] text-[10px]">{changes.length} changes</Badge>
              </div>
              {(() => {
                const completions = changes.filter(c => c.field_changed === 'status' && c.new_value === 'done').length
                const blocks = changes.filter(c => c.field_changed === 'status' && (c.new_value === 'blocked' || c.new_value === 'on_hold')).length
                const etaSlips = changes.filter(c => c.field_changed === 'eta' && c.old_value && c.new_value && new Date(c.new_value) > new Date(c.old_value)).length
                const newAdded = changes.filter(c => c.field_changed === 'created').length
                return (
                  <div className="grid grid-cols-2 gap-2">
                    {completions > 0 && (
                      <div className="flex items-center gap-2 text-xs">
                        <CheckCircle2 className="w-3.5 h-3.5 text-teal-500" />
                        <span className="text-[var(--mw-text-primary)] font-medium">{completions}</span>
                        <span className="text-[var(--mw-text-secondary)]">completed</span>
                      </div>
                    )}
                    {blocks > 0 && (
                      <div className="flex items-center gap-2 text-xs">
                        <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
                        <span className="text-[var(--mw-text-primary)] font-medium">{blocks}</span>
                        <span className="text-[var(--mw-text-secondary)]">blocked</span>
                      </div>
                    )}
                    {etaSlips > 0 && (
                      <div className="flex items-center gap-2 text-xs">
                        <Clock className="w-3.5 h-3.5 text-amber-500" />
                        <span className="text-[var(--mw-text-primary)] font-medium">{etaSlips}</span>
                        <span className="text-[var(--mw-text-secondary)]">ETA slipped</span>
                      </div>
                    )}
                    {newAdded > 0 && (
                      <div className="flex items-center gap-2 text-xs">
                        <Activity className="w-3.5 h-3.5 text-[var(--mw-purple)]" />
                        <span className="text-[var(--mw-text-primary)] font-medium">{newAdded}</span>
                        <span className="text-[var(--mw-text-secondary)]">new items</span>
                      </div>
                    )}
                  </div>
                )
              })()}
              <p className="text-[10px] text-[var(--mw-text-secondary)] mt-2">Click to view all changes</p>
            </CardContent>
          </Card>
        </div>

        {/* Deadlines & Due Items */}
        <Card className="xl:col-span-2">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-[var(--mw-amber-light)]">
                <CalendarClock className="w-4 h-4 text-[var(--mw-amber)]" />
              </div>
              <h2 className="text-sm font-semibold text-[var(--mw-text-primary)]">Deadlines & Due Items</h2>
              <Badge className="bg-[var(--mw-amber-light)] text-[var(--mw-amber)] ml-1 text-[10px]">
                {upcomingCount} items
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="py-4 space-y-5">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-[var(--mw-text-secondary)]" />
              </div>
            ) : (
              <>
                {/* Upcoming Deadlines (next 2 weeks) */}
                <div>
                  <p className="text-xs font-semibold text-[var(--mw-text-secondary)] uppercase tracking-wider mb-3 flex items-center gap-2">
                    <CalendarClock className="w-3.5 h-3.5" />
                    Upcoming Deadlines
                    <span className="text-[10px] font-normal normal-case">Next 2 weeks</span>
                  </p>
                  <UpcomingTimeline items={filteredItems} />
                </div>

              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ─── 5. Service Hub (full width) ──────────────────────────────── */}
      {loading ? (
        <Card className="rounded-xl">
          <CardContent className="py-12 text-center text-[var(--mw-text-secondary)]">
            <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
            Loading services...
          </CardContent>
        </Card>
      ) : (
        <ServiceHub items={items} onItemsChange={setItems} lastMeetingDate={lastMeetingDate} />
      )}

      {/* ─── 6. Timeline View (collapsible Gantt) ────────────────────────── */}
      <Card>
        <button
          onClick={() => setTimelineOpen(!timelineOpen)}
          className="w-full text-left"
        >
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-blue-50">
                  <CalendarDays className="w-4 h-4 text-[var(--mw-navy)]" />
                </div>
                <h2 className="text-sm font-semibold text-[var(--mw-text-primary)]">Timeline View</h2>
                <span className="text-xs text-[var(--mw-text-secondary)]">
                  {timelineOpen ? "" : "Click to expand"}
                </span>
              </div>
              <div className="flex items-center gap-3">
                {!timelineOpen && (
                  <div className="hidden sm:flex gap-3">
                    {[
                      { color: "#0d9488", label: "Done" },
                      { color: "#3b82f6", label: "Active" },
                      { color: "#ef4444", label: "Blocked" },
                    ].map((l) => (
                      <span key={l.label} className="flex items-center gap-1.5 text-[10px] text-[var(--mw-text-secondary)]">
                        <span className="w-2.5 h-1.5 rounded-sm" style={{ backgroundColor: l.color }} />
                        {l.label}
                      </span>
                    ))}
                  </div>
                )}
                {timelineOpen ? (
                  <ChevronUp className="w-4 h-4 text-[var(--mw-text-secondary)]" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-[var(--mw-text-secondary)]" />
                )}
              </div>
            </div>

            {/* Compact preview when collapsed */}
            {!timelineOpen && !loading && ganttData.length > 0 && (
              <div className="mt-3 h-8 relative overflow-hidden rounded-lg bg-gray-50">
                {ganttData.flatMap((lane) => lane.items).slice(0, 20).map((item) => {
                  const pos = ganttPosition(item.eta!)
                  return (
                    <div
                      key={item.id}
                      className="absolute top-1 h-6 w-1.5 rounded-sm"
                      style={{
                        left: `${Math.max(0, Math.min(98, pos))}%`,
                        backgroundColor: getItemColor(item),
                        opacity: 0.7,
                      }}
                    />
                  )
                })}
                {/* Today marker */}
                <div
                  className="absolute top-0 bottom-0 w-px bg-red-400"
                  style={{ left: `${ganttTodayPosition()}%` }}
                />
              </div>
            )}
          </CardHeader>
        </button>

        {/* Expanded Gantt */}
        {timelineOpen && (
          <CardContent className="py-2 overflow-x-auto">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-[var(--mw-text-secondary)]" />
              </div>
            ) : (
              <>
                <div className="flex gap-4 mb-3">
                  {[
                    { color: "#0d9488", label: "Done" },
                    { color: "#3b82f6", label: "In Progress" },
                    { color: "#f59e0b", label: "Overdue" },
                    { color: "#ef4444", label: "Blocked" },
                    { color: "#94a3b8", label: "Not Started" },
                  ].map((l) => (
                    <span key={l.label} className="flex items-center gap-1.5 text-xs text-[var(--mw-text-secondary)]">
                      <span className="w-3 h-2 rounded-sm" style={{ backgroundColor: l.color }} />
                      {l.label}
                    </span>
                  ))}
                </div>
                <div className="min-w-[800px]">
                  {/* Week labels */}
                  <div className="relative h-6 mb-2 border-b border-gray-100">
                    {ganttWeekLabels.map((wl, i) => (
                      <span
                        key={i}
                        className="absolute text-[10px] text-[var(--mw-text-secondary)] font-medium"
                        style={{ left: `${wl.position}%`, transform: "translateX(-50%)" }}
                      >
                        {wl.label}
                      </span>
                    ))}
                  </div>

                  {/* Today marker */}
                  <div className="relative">
                    <div
                      className="absolute top-0 bottom-0 w-px bg-red-400 z-10"
                      style={{ left: `${ganttTodayPosition()}%` }}
                    >
                      <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[9px] font-bold text-red-500 whitespace-nowrap bg-red-50 px-1 rounded">
                        Today
                      </span>
                    </div>

                    {/* Swim lanes by category */}
                    {ganttData.map((lane) => (
                      <div key={lane.category} className="mb-4">
                        <p className="text-xs font-semibold text-[var(--mw-text-secondary)] mb-1.5 pl-1">
                          {lane.category}
                        </p>
                        <div className="space-y-1">
                          {lane.items.map((item) => {
                            const pos = ganttPosition(item.eta!)
                            const barWidth = Math.max(4, Math.min(12, 100 / (ganttRange.weeks || 1)))
                            return (
                              <div key={item.id} className="relative h-6 group">
                                <div
                                  className="absolute h-5 rounded-md flex items-center px-2 text-[10px] text-white font-medium truncate cursor-default shadow-sm hover:shadow-md transition-shadow"
                                  style={{
                                    left: `${Math.max(0, pos - barWidth / 2)}%`,
                                    width: `${barWidth}%`,
                                    backgroundColor: getItemColor(item),
                                  }}
                                  title={`${item.title} - ETA: ${formatDate(item.eta)} - ${getStatusLabel(item.status)}`}
                                >
                                  {item.title}
                                </div>
                                {/* Tooltip on hover */}
                                <div
                                  className="absolute hidden group-hover:block z-20 bg-white border border-gray-200 rounded-lg shadow-lg p-2 text-xs w-56 -top-2 pointer-events-none"
                                  style={{ left: `${Math.min(pos + barWidth, 75)}%` }}
                                >
                                  <p className="font-semibold text-[var(--mw-text-primary)]">{item.title}</p>
                                  <p className="text-[var(--mw-text-secondary)]">
                                    Owner: {item.owner_name || "Unassigned"}
                                  </p>
                                  <p className="text-[var(--mw-text-secondary)]">
                                    ETA: {formatDate(item.eta)}
                                  </p>
                                  <Badge className={cn(getStatusColor(item.status), "text-[10px] mt-1")}>
                                    {getStatusLabel(item.status)}
                                  </Badge>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    ))}

                    {ganttData.length === 0 && (
                      <p className="text-center text-[var(--mw-text-secondary)] text-sm py-8">
                        No items with ETAs to display.
                      </p>
                    )}
                  </div>
                </div>
              </>
            )}
          </CardContent>
        )}
      </Card>

      {/* ─── Changes Side Drawer ───────────────────────────────────────── */}
      {changesDrawerOpen && (
        <div className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm" onClick={() => setChangesDrawerOpen(false)} />
      )}
      <div
        className={cn(
          "fixed top-0 right-0 bottom-0 z-50 w-full max-w-md bg-white shadow-2xl overflow-y-auto transition-transform duration-300 ease-in-out flex flex-col",
          changesDrawerOpen ? "translate-x-0" : "translate-x-full"
        )}
      >
        <div className="sticky top-0 bg-[var(--mw-navy)] text-white px-6 py-5 z-10 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold">Changes This Week</h2>
            <p className="text-white/60 text-xs mt-0.5">{changes.length} total changes</p>
          </div>
          <button onClick={() => setChangesDrawerOpen(false)} className="p-2 rounded-xl hover:bg-white/10 transition">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {(() => {
            const completions = changes.filter(c => c.field_changed === 'status' && c.new_value === 'done')
            const newBlocks = changes.filter(c => c.field_changed === 'status' && (c.new_value === 'blocked' || c.new_value === 'on_hold'))
            const etaSlips = changes.filter(c => c.field_changed === 'eta' && c.old_value && c.new_value && new Date(c.new_value) > new Date(c.old_value))
            const newItems = changes.filter(c => c.field_changed === 'created')
            const statusUpdates = changes.filter(c => c.field_changed === 'status' && c.new_value !== 'done' && c.new_value !== 'blocked' && c.new_value !== 'on_hold')

            const groups = [
              { title: "Completed", items: completions, color: "#0d9488", icon: <CheckCircle2 className="w-4 h-4" /> },
              { title: "New Blocks", items: newBlocks, color: "#ef4444", icon: <AlertTriangle className="w-4 h-4" /> },
              { title: "ETA Slippages", items: etaSlips, color: "#f59e0b", icon: <Clock className="w-4 h-4" /> },
              { title: "New Items", items: newItems, color: "var(--mw-purple)", icon: <Activity className="w-4 h-4" /> },
              { title: "Status Updates", items: statusUpdates, color: "#3b82f6", icon: <TrendingUp className="w-4 h-4" /> },
            ].filter(g => g.items.length > 0)

            if (groups.length === 0) return <p className="text-center text-[var(--mw-text-secondary)] text-sm py-8">No changes this week.</p>

            return groups.map(group => (
              <div key={group.title} className="rounded-xl border border-gray-100 overflow-hidden" style={{ borderLeftWidth: "4px", borderLeftColor: group.color }}>
                <div className="px-4 py-2.5 bg-gray-50/50 flex items-center gap-2">
                  <span style={{ color: group.color }}>{group.icon}</span>
                  <span className="text-sm font-semibold text-[var(--mw-text-primary)]">{group.title}</span>
                  <Badge className="bg-gray-100 text-[var(--mw-text-secondary)] text-[10px] ml-auto">{group.items.length}</Badge>
                </div>
                <div className="divide-y divide-gray-50">
                  {group.items.map(c => (
                    <div key={c.id} className="px-4 py-2.5">
                      <p className="text-sm font-medium text-[var(--mw-text-primary)]">{c.item_title}</p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className="text-[10px] text-[var(--mw-text-secondary)]">{c.category_name}</span>
                        {c.field_changed === 'status' && (
                          <>
                            <Badge className={cn(getStatusColor(c.old_value || ''), "text-[10px] px-1.5 py-0")}>{getStatusLabel(c.old_value || '')}</Badge>
                            <ArrowRight className="w-3 h-3 text-gray-400" />
                            <Badge className={cn(getStatusColor(c.new_value || ''), "text-[10px] px-1.5 py-0")}>{getStatusLabel(c.new_value || '')}</Badge>
                          </>
                        )}
                        {c.field_changed === 'eta' && (
                          <span className="text-[10px] text-[var(--mw-text-secondary)]">
                            {formatDate(c.old_value)} → <span className="font-semibold text-amber-700">{formatDate(c.new_value)}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          })()}
        </div>
      </div>

      {/* ─── Sync Dialog ───────────────────────────────────────────────── */}
      {syncDialogOpen && (
        <>
          <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" onClick={() => setSyncDialogOpen(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col">

              {/* Header */}
              <div className="p-6 border-b border-[var(--mw-card-border)] shrink-0">
                <h3 className="text-lg font-bold text-[var(--mw-navy)]">Sync from Google Sheets</h3>
                <p className="text-sm text-[var(--mw-text-secondary)] mt-1">Pull latest data from your Services Enhancement sheet.</p>
              </div>

              {/* Scrollable body */}
              <div className="flex-1 overflow-y-auto p-6 space-y-5">

                {/* Meeting reference date */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-semibold text-[var(--mw-text-primary)]">Meeting Reference Date</h4>
                    {lastMeetingDate && (
                      <span className="text-xs text-[var(--mw-text-secondary)] bg-[var(--mw-bg)] border border-[var(--mw-card-border)] px-2.5 py-1 rounded-full">
                        Last set: <strong>{new Date(lastMeetingDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</strong>
                      </span>
                    )}
                  </div>
                  <input
                    type="date"
                    value={meetingDate}
                    onChange={e => setMeetingDate(e.target.value)}
                    className="w-full text-sm border border-[var(--mw-card-border)] rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[var(--mw-pink)]"
                  />
                  <p className="text-xs text-[var(--mw-text-secondary)] mt-1.5">Date of the last presentation to Massi. Items updated since then will be highlighted as NEW.</p>
                </div>

                {/* Updates table since last meeting */}
                {lastMeetingDate && (() => {
                  const sinceItems = items.filter(i => i.updated_at >= lastMeetingDate)
                  if (sinceItems.length === 0) return (
                    <div className="rounded-xl border border-[var(--mw-card-border)] p-4 text-center text-sm text-[var(--mw-text-secondary)]">
                      No items updated since {new Date(lastMeetingDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </div>
                  )
                  return (
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-sm font-semibold text-[var(--mw-text-primary)]">Updates since last meeting</span>
                        <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-[var(--mw-pink-light)] text-[var(--mw-pink)]">{sinceItems.length}</span>
                        <span className="text-xs text-[var(--mw-text-secondary)] ml-auto">
                          Previous meeting: <strong>{new Date(lastMeetingDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</strong>
                        </span>
                      </div>
                      <div className="rounded-xl border border-[var(--mw-card-border)] overflow-hidden">
                        <table className="w-full text-xs">
                          <thead className="bg-[var(--mw-bg)] border-b border-[var(--mw-card-border)]">
                            <tr>
                              <th className="text-left px-3 py-2 text-[var(--mw-text-secondary)] font-semibold w-14">Item</th>
                              <th className="text-left px-3 py-2 text-[var(--mw-text-secondary)] font-semibold">Task</th>
                              <th className="text-left px-3 py-2 text-[var(--mw-text-secondary)] font-semibold w-24">Status</th>
                              <th className="text-left px-3 py-2 text-[var(--mw-text-secondary)] font-semibold w-20">Updated</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[var(--mw-card-border)]">
                            {sinceItems.map(item => (
                              <tr key={item.id} className="hover:bg-[var(--mw-bg)]/50">
                                <td className="px-3 py-2 text-[var(--mw-text-secondary)] font-mono">{item.item_number}</td>
                                <td className="px-3 py-2 text-[var(--mw-text-primary)] font-medium max-w-0">
                                  <span className="block truncate">{item.title}</span>
                                </td>
                                <td className="px-3 py-2">
                                  <span className={cn("px-1.5 py-0.5 rounded-full font-medium", getStatusColor(item.status))}>
                                    {getStatusLabel(item.status)}
                                  </span>
                                </td>
                                <td className="px-3 py-2 text-[var(--mw-text-secondary)] whitespace-nowrap">
                                  {new Date(item.updated_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )
                })()}
              </div>

              {/* Footer */}
              <div className="flex gap-3 p-6 border-t border-[var(--mw-card-border)] shrink-0">
                <button
                  onClick={handleSync}
                  className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold bg-[var(--mw-pink)] text-white hover:bg-[var(--mw-pink-hover)] transition-all shadow-sm"
                >
                  Sync Now
                </button>
                <button
                  onClick={() => setSyncDialogOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-sm font-semibold border border-[var(--mw-card-border)] text-[var(--mw-text-primary)] bg-white hover:bg-gray-50 transition-all"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
