"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ItemsTable } from "@/components/dashboard/items-table"
import { StatsCards } from "@/components/dashboard/stats-cards"
import { WeeklyChanges } from "@/components/dashboard/weekly-changes"
import { getDaysUntil, formatDate, cn } from "@/lib/utils"
import Link from "next/link"
import {
  Plus,
  FileText,
  CalendarClock,
  Activity,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Loader2,
  ShieldCheck,
  ArrowRight,
  RefreshCw,
} from "lucide-react"

type Item = {
  id: string
  title: string
  category_name: string
  category_slug: string
  status: string
  eta: string | null
  owner_name: string | null
  priority: string | null
}

type CategoryHealth = {
  name: string
  total: number
  done: number
  in_progress: number
  blocked: number
  overdue: number
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
          {/* Background ring */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke="#e8edf2"
            strokeWidth={strokeWidth}
          />
          {/* Data segments */}
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
      {/* Legend */}
      <div className="grid grid-cols-2 gap-x-6 gap-y-1.5">
        {segments.map((seg) => (
          <div key={seg.status} className="flex items-center gap-2 text-sm">
            <span
              className="w-3 h-3 rounded-full flex-shrink-0"
              style={{ backgroundColor: seg.color }}
            />
            <span className="text-[var(--mw-text-secondary)]">{STATUS_LABELS[seg.status] || seg.status}</span>
            <span className="font-semibold text-[var(--mw-text-primary)] ml-auto">{seg.count}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function ProgressRing({ percent, size = 56, strokeWidth = 5, color }: { percent: number; size?: number; strokeWidth?: number; color: string }) {
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const filled = (percent / 100) * circumference
  const center = size / 2

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={center} cy={center} r={radius} fill="none" stroke="#e8edf2" strokeWidth={strokeWidth} />
      <circle
        cx={center}
        cy={center}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeDasharray={`${filled} ${circumference - filled}`}
        strokeDashoffset={circumference * 0.25}
        strokeLinecap="round"
        style={{ transition: "stroke-dasharray 0.6s ease" }}
      />
      <text
        x={center}
        y={center}
        textAnchor="middle"
        dominantBaseline="central"
        className="text-[11px] font-bold"
        fill="var(--mw-text-primary)"
      >
        {percent}%
      </text>
    </svg>
  )
}

function ServiceHealthCards({ categories }: { categories: CategoryHealth[] }) {
  const colorCycle = [
    "var(--mw-navy)",
    "var(--mw-pink)",
    "var(--mw-teal)",
    "var(--mw-purple)",
    "var(--mw-coral)",
    "var(--mw-amber)",
  ]

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
      {categories.map((cat, i) => {
        const completionPct = cat.total > 0 ? Math.round((cat.done / cat.total) * 100) : 0
        const color = colorCycle[i % colorCycle.length]

        return (
          <div
            key={cat.name}
            className="flex items-center gap-3 rounded-xl border border-[var(--mw-card-border)] bg-white p-3 shadow-sm hover:shadow-md transition-shadow"
          >
            <ProgressRing percent={completionPct} color={color} />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-[var(--mw-text-primary)] truncate">{cat.name}</p>
              <p className="text-xs text-[var(--mw-text-secondary)] mt-0.5">
                {cat.done}/{cat.total} done
              </p>
              {cat.blocked > 0 && (
                <p className="text-xs text-[var(--mw-coral)] font-medium mt-0.5">
                  {cat.blocked} blocked
                </p>
              )}
              {cat.overdue > 0 && (
                <p className="text-xs text-[var(--mw-coral)] font-medium mt-0.5">
                  {cat.overdue} overdue
                </p>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function UpcomingTimeline({ items }: { items: Item[] }) {
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

  // Group by service, find earliest deadline per service
  const byService: Record<string, Item[]> = {}
  upcoming.forEach((item) => {
    const svc = item.category_name || "General"
    if (!byService[svc]) byService[svc] = []
    byService[svc].push(item)
  })

  // Sort services by their earliest deadline
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

type ApprovalSummary = { pending: number; conflicts: number }

export default function DashboardPage() {
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)
  const [approvals, setApprovals] = useState<ApprovalSummary>({ pending: 0, conflicts: 0 })
  const [refreshing, setRefreshing] = useState(false)
  const [lastSync, setLastSync] = useState<string | null>(null)

  function fetchAll() {
    // Fetch items (only Services Enhancement tab for PMO view)
    fetch("/api/items?tab=Services+Enhancement")
      .then((r) => r.json())
      .then((data) => {
        setItems(data)
        setLoading(false)
      })
      .catch(() => setLoading(false))

    // Fetch pending approvals count
    fetch("/api/approvals?pending=true")
      .then(r => r.json())
      .then((data: Array<{ type: string }>) => {
        setApprovals({
          pending: data.length,
          conflicts: data.filter(a => a.type === 'conflict').length,
        })
      })
      .catch(() => {})

    // Fetch last sync time
    fetch("/api/sync")
      .then(r => r.json())
      .then(data => setLastSync(data.last_sync))
      .catch(() => {})
  }

  useEffect(() => { fetchAll() }, [])

  async function handleRefresh() {
    setRefreshing(true)
    try {
      await fetch("/api/sync", { method: "POST" })
      fetchAll()
    } finally {
      setTimeout(() => setRefreshing(false), 800)
    }
  }

  // Compute status distribution
  const statusDistribution: Record<string, number> = {}
  items.forEach((item) => {
    statusDistribution[item.status] = (statusDistribution[item.status] || 0) + 1
  })

  // Compute category health
  const categoryMap: Record<string, CategoryHealth> = {}
  items.forEach((item) => {
    const name = item.category_name || "Uncategorized"
    if (!categoryMap[name]) {
      categoryMap[name] = { name, total: 0, done: 0, in_progress: 0, blocked: 0, overdue: 0 }
    }
    const cat = categoryMap[name]
    cat.total++
    if (item.status === "done") cat.done++
    if (item.status === "in_progress") cat.in_progress++
    if (item.status === "blocked") cat.blocked++
    const days = getDaysUntil(item.eta)
    if (days !== null && days < 0 && item.status !== "done" && item.status !== "cancelled") cat.overdue++
  })
  const categories = Object.values(categoryMap).sort((a, b) => b.total - a.total)

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
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
            onClick={handleRefresh}
            disabled={refreshing}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all border border-[var(--mw-card-border)] bg-white text-[var(--mw-text-primary)] hover:bg-gray-50 disabled:opacity-50"
          >
            <RefreshCw className={cn("w-4 h-4", refreshing && "animate-spin")} />
            {refreshing ? "Syncing..." : "Refresh"}
          </button>
          <Link
            href="/reports"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-sm hover:shadow-md bg-[var(--mw-navy)] text-white hover:bg-[var(--mw-navy-light)]"
          >
            <FileText className="w-4 h-4" />
            CEO Summary
          </Link>
          <Link
            href="/meetings/new"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-sm hover:shadow-md bg-[var(--mw-pink)] text-white hover:bg-[var(--mw-pink-hover)]"
          >
            <Plus className="w-4 h-4" />
            Add Meeting
          </Link>
        </div>
      </div>

      {/* Approval Alert Banner */}
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

      {/* Stats Cards */}
      <StatsCards />

      {/* Visual Row: Donut + Service Health + Timeline */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Status Distribution Donut */}
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
              <DonutChart distribution={statusDistribution} total={items.length} />
            )}
          </CardContent>
        </Card>

        {/* Service Health */}
        <Card className="xl:col-span-2">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-[var(--mw-teal-light)]">
                <CheckCircle2 className="w-4 h-4 text-[var(--mw-teal)]" />
              </div>
              <h2 className="text-sm font-semibold text-[var(--mw-text-primary)]">Service Health</h2>
            </div>
          </CardHeader>
          <CardContent className="py-4">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-[var(--mw-text-secondary)]" />
              </div>
            ) : (
              <ServiceHealthCards categories={categories} />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Upcoming Deadlines Timeline */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-[var(--mw-amber-light)]">
              <CalendarClock className="w-4 h-4 text-[var(--mw-amber)]" />
            </div>
            <h2 className="text-sm font-semibold text-[var(--mw-text-primary)]">Upcoming Deadlines</h2>
            <span className="text-xs text-[var(--mw-text-secondary)] ml-1">Next 2 weeks</span>
          </div>
        </CardHeader>
        <CardContent className="py-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-[var(--mw-text-secondary)]" />
            </div>
          ) : (
            <UpcomingTimeline items={items} />
          )}
        </CardContent>
      </Card>

      {/* Main Table + Weekly Changes */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2">
          <ItemsTable />
        </div>
        <div>
          <WeeklyChanges />
        </div>
      </div>
    </div>
  )
}
