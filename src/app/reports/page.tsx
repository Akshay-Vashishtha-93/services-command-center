"use client"

import { useState, useEffect, useMemo, useRef } from "react"
import { Card, CardHeader, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  getStatusColor,
  getStatusLabel,
  formatDate,
  cn,
  getDaysUntil,
} from "@/lib/utils"
import {
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  ArrowRight,
  CalendarDays,
  AlertOctagon,
  Printer,
  ShieldCheck,
  Zap,
  Target,
  Layers,
  ArrowDownRight,
  Flame,
  CircleDot,
  Plus,
  BarChart3,
  Activity,
  Users,
  X,
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

// ─── SVG Ring Chart ────────────────────────────────────────────────────────────
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

// ─── Mini horizontal stacked bar ────────────────────────────────────────────
function StackedBar({
  segments,
}: {
  segments: { value: number; color: string; label: string }[]
}) {
  const total = segments.reduce((s, seg) => s + seg.value, 0)
  if (total === 0) return <div className="h-3 rounded-full bg-gray-100 w-full" />
  return (
    <div className="flex h-3 rounded-full overflow-hidden w-full bg-gray-100">
      {segments.map((seg, i) =>
        seg.value > 0 ? (
          <div
            key={i}
            className="h-full transition-all duration-500"
            style={{
              width: `${(seg.value / total) * 100}%`,
              backgroundColor: seg.color,
            }}
            title={`${seg.label}: ${seg.value}`}
          />
        ) : null
      )}
    </div>
  )
}

// ─── Category icon map ──────────────────────────────────────────────────────
function getCategoryIcon(name: string) {
  const lower = name.toLowerCase()
  if (lower.includes("babysitter") || lower.includes("nanny")) return <Users className="w-4 h-4" />
  if (lower.includes("birthday") || lower.includes("party")) return <Zap className="w-4 h-4" />
  if (lower.includes("wallpaper")) return <Layers className="w-4 h-4" />
  if (lower.includes("interior") || lower.includes("design")) return <Target className="w-4 h-4" />
  if (lower.includes("telehealth") || lower.includes("health")) return <ShieldCheck className="w-4 h-4" />
  if (lower.includes("tech") || lower.includes("platform")) return <Activity className="w-4 h-4" />
  return <CircleDot className="w-4 h-4" />
}

// ─── Date helpers ───────────────────────────────────────────────────────────
function getDateRange(): string {
  const now = new Date()
  const weekAgo = new Date(now)
  weekAgo.setDate(weekAgo.getDate() - 7)
  const fmt = (d: Date) =>
    d.toLocaleDateString("en-US", { month: "short", day: "numeric" })
  return `${fmt(weekAgo)} - ${fmt(now)}, ${now.getFullYear()}`
}

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

// ─── Gantt helpers ──────────────────────────────────────────────────────────
function getItemColor(item: StoredItem): string {
  if (item.status === "done") return "#0d9488"
  if (item.status === "blocked" || item.status === "on_hold") return "#ef4444"
  if (isOverdue(item)) return "#f59e0b"
  if (item.status === "in_progress") return "#3b82f6"
  return "#94a3b8"
}

function getStatusDotColor(status: string): string {
  switch (status) {
    case "done": return "#0d9488"
    case "in_progress": return "#3b82f6"
    case "blocked": return "#ef4444"
    case "on_hold": return "#f59e0b"
    case "delayed": return "#f97316"
    case "not_started": return "#94a3b8"
    default: return "#94a3b8"
  }
}

// ─── Workstream helpers ─────────────────────────────────────────────────────
const WORKSTREAM_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  brand: { bg: "bg-[var(--mw-pink-light)]", text: "text-[var(--mw-pink)]", label: "Brand" },
  tech: { bg: "bg-blue-50", text: "text-[var(--mw-navy)]", label: "Tech" },
  design: { bg: "bg-[var(--mw-purple-light)]", text: "text-[var(--mw-purple)]", label: "Design" },
  strategy: { bg: "bg-amber-50", text: "text-amber-700", label: "Strategy" },
}

function WorkstreamBadge({ workstream }: { workstream: string | null }) {
  if (!workstream) return null
  const style = WORKSTREAM_STYLES[workstream.toLowerCase()]
  if (!style) return null
  return (
    <span className={cn(style.bg, style.text, "text-[10px] font-semibold px-1.5 py-0.5 rounded-full")}>
      {style.label}
    </span>
  )
}

function WorkstreamFilterPills({
  value,
  onChange,
}: {
  value: string
  onChange: (v: string) => void
}) {
  const pills = [
    { key: "", label: "All", bg: "bg-gray-100", activeBg: "bg-[var(--mw-navy)]", activeText: "text-white" },
    { key: "brand", label: "Brand", bg: "bg-gray-100", activeBg: "bg-[var(--mw-pink)]", activeText: "text-white" },
    { key: "tech", label: "Tech", bg: "bg-gray-100", activeBg: "bg-[var(--mw-navy)]", activeText: "text-white" },
    { key: "design", label: "Design", bg: "bg-gray-100", activeBg: "bg-[var(--mw-purple)]", activeText: "text-white" },
  ]
  return (
    <div className="flex items-center gap-1.5">
      {pills.map((p) => (
        <button
          key={p.key}
          onClick={() => onChange(p.key)}
          className={cn(
            "px-3 py-1 rounded-full text-xs font-medium transition-colors",
            value === p.key
              ? cn(p.activeBg, p.activeText)
              : cn(p.bg, "text-[var(--mw-text-secondary)] hover:bg-gray-200")
          )}
        >
          {p.label}
        </button>
      ))}
    </div>
  )
}

// ─── Main page component ───────────────────────────────────────────────────
export default function ReportsPage() {
  const [allItems, setAllItems] = useState<StoredItem[]>([])
  const [stats, setStats] = useState<Stats>({
    total: 0,
    done: 0,
    in_progress: 0,
    not_started: 0,
    blocked: 0,
    overdue: 0,
    due_this_week: 0,
  })
  const [allChanges, setAllChanges] = useState<StoredChange[]>([])
  const [loading, setLoading] = useState(true)
  const [workstreamFilter, setWorkstreamFilter] = useState<string>("")
  const [drawerCategory, setDrawerCategory] = useState<string | null>(null)
  const drawerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    Promise.all([
      fetch("/api/items?tab=Services+Enhancement").then((r) => r.json()),
      fetch("/api/items/stats?tab=Services+Enhancement").then((r) => r.json()),
      fetch("/api/items/changes?days=7").then((r) => r.json()),
    ])
      .then(([itemsData, statsData, changesData]) => {
        setAllItems(itemsData)
        setStats(statsData)
        setAllChanges(changesData)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  // Filter to Services Enhancement tab only
  const items = useMemo(
    () => allItems.filter((i) => i.sheet_tab === "Services Enhancement" && !i.is_archived),
    [allItems]
  )

  // Recompute stats from filtered items
  const filteredStats = useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const nextWeek = new Date(today)
    nextWeek.setDate(nextWeek.getDate() + 7)

    const total = items.length
    const done = items.filter((i) => i.status === "done").length
    const in_progress = items.filter((i) => i.status === "in_progress").length
    const not_started = items.filter((i) => i.status === "not_started").length
    const blocked = items.filter(
      (i) => i.status === "blocked" || i.status === "on_hold"
    ).length
    const overdue = items.filter((i) => isOverdue(i)).length
    const due_this_week = items.filter(
      (i) =>
        i.eta &&
        i.status !== "done" &&
        i.status !== "cancelled" &&
        isWithinNextDays(i.eta, 7)
    ).length

    return { total, done, in_progress, not_started, blocked, overdue, due_this_week }
  }, [items])

  // Filter changes to only Services Enhancement items
  const itemIds = useMemo(() => new Set(items.map((i) => i.id)), [items])
  const changes = useMemo(
    () => allChanges.filter((c) => itemIds.has(c.item_id)),
    [allChanges, itemIds]
  )

  // Build a map from item_title -> workstream for cross-referencing changes
  const titleToWorkstream = useMemo(() => {
    const map = new Map<string, string | null>()
    for (const item of items) {
      map.set(item.title, item.workstream)
    }
    return map
  }, [items])

  // Workstream-filtered changes
  const filteredChanges = useMemo(() => {
    if (!workstreamFilter) return changes
    return changes.filter((c) => {
      const ws = titleToWorkstream.get(c.item_title)
      return ws?.toLowerCase() === workstreamFilter
    })
  }, [changes, workstreamFilter, titleToWorkstream])

  // Close drawer on outside click
  useEffect(() => {
    if (!drawerCategory) return
    function handleClick(e: MouseEvent) {
      if (drawerRef.current && !drawerRef.current.contains(e.target as Node)) {
        setDrawerCategory(null)
      }
    }
    // Delay listener to avoid immediate close from the click that opens it
    const timer = setTimeout(() => document.addEventListener("mousedown", handleClick), 0)
    return () => {
      clearTimeout(timer)
      document.removeEventListener("mousedown", handleClick)
    }
  }, [drawerCategory])

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

  // Group changes by type (uses filteredChanges for workstream filtering)
  const completions = filteredChanges.filter(
    (c) => c.field_changed === "status" && c.new_value === "done"
  )
  const newBlocks = filteredChanges.filter(
    (c) =>
      c.field_changed === "status" &&
      (c.new_value === "blocked" || c.new_value === "on_hold")
  )
  const etaSlippages = filteredChanges.filter((c) => {
    if (c.field_changed !== "eta" || !c.old_value || !c.new_value) return false
    return new Date(c.new_value) > new Date(c.old_value)
  })
  const newItems = filteredChanges.filter((c) => c.field_changed === "created")
  const statusUpdates = filteredChanges.filter(
    (c) =>
      c.field_changed === "status" &&
      c.new_value !== "done" &&
      c.new_value !== "blocked" &&
      c.new_value !== "on_hold"
  )

  // Category breakdown (respects workstream filter)
  const categoryBreakdown = useMemo(() => {
    const filtered = workstreamFilter
      ? items.filter((i) => i.workstream?.toLowerCase() === workstreamFilter)
      : items
    const map = new Map<
      string,
      { total: number; done: number; in_progress: number; blocked: number; not_started: number; items: StoredItem[] }
    >()
    for (const item of filtered) {
      const cat = item.category_name
      const entry = map.get(cat) || {
        total: 0,
        done: 0,
        in_progress: 0,
        blocked: 0,
        not_started: 0,
        items: [],
      }
      entry.total++
      if (item.status === "done") entry.done++
      else if (item.status === "in_progress") entry.in_progress++
      else if (item.status === "blocked" || item.status === "on_hold") entry.blocked++
      else entry.not_started++
      entry.items.push(item)
      map.set(cat, entry)
    }
    return Array.from(map.entries())
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.total - a.total)
  }, [items, workstreamFilter])

  // Items due next 7 days
  const dueNextWeek = useMemo(
    () =>
      items
        .filter(
          (i) =>
            i.status !== "done" &&
            i.status !== "cancelled" &&
            isWithinNextDays(i.eta, 7)
        )
        .sort((a, b) => {
          if (!a.eta) return 1
          if (!b.eta) return -1
          return new Date(a.eta).getTime() - new Date(b.eta).getTime()
        }),
    [items]
  )

  // Gantt data: items with ETAs, grouped by category
  const ganttData = useMemo(() => {
    const withEta = items.filter((i) => i.eta && i.status !== "cancelled")
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
  }, [items])

  // Gantt timeline range
  const ganttRange = useMemo(() => {
    const now = new Date()
    const allEtas = items
      .filter((i) => i.eta && i.status !== "cancelled")
      .map((i) => new Date(i.eta!).getTime())
    if (allEtas.length === 0) return { start: now, end: now, weeks: 0 }
    const minDate = new Date(Math.min(now.getTime() - 14 * 86400000, ...allEtas))
    const maxDate = new Date(Math.max(now.getTime() + 28 * 86400000, ...allEtas))
    // Round to week boundaries
    const start = new Date(minDate)
    start.setDate(start.getDate() - start.getDay())
    start.setHours(0, 0, 0, 0)
    const end = new Date(maxDate)
    end.setDate(end.getDate() + (6 - end.getDay()))
    end.setHours(23, 59, 59, 999)
    const weeks = Math.ceil((end.getTime() - start.getTime()) / (7 * 86400000))
    return { start, end, weeks }
  }, [items])

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

  // Generate week labels for gantt
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-[var(--mw-navy)] border-t-transparent rounded-full animate-spin" />
          <p className="text-[var(--mw-text-secondary)] text-sm font-medium">
            Loading executive summary...
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-[1400px] mx-auto space-y-8 pb-16">
      {/* ─── Header ──────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--mw-navy)] tracking-tight">
            CEO Weekly Summary
          </h1>
          <p className="text-[var(--mw-text-secondary)] text-sm mt-1 flex items-center gap-2">
            <CalendarDays className="w-4 h-4" />
            Week of {getDateRange()}
          </p>
        </div>
        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 px-4 py-2 rounded-xl border border-[var(--mw-card-border)] bg-white text-[var(--mw-text-secondary)] hover:bg-gray-50 hover:text-[var(--mw-navy)] transition-colors text-sm font-medium shadow-sm"
        >
          <Printer className="w-4 h-4" />
          Print / Export
        </button>
      </div>

      {/* ─── 1. Executive Summary KPI Cards ──────────────────────────────── */}
      <section>
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
      </section>

      {/* ─── 2. What Changed This Week ───────────────────────────────────── */}
      <section>
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-[var(--mw-navy)]" />
                <h2 className="text-lg font-bold text-[var(--mw-navy)]">
                  What Changed This Week
                </h2>
                <Badge className="bg-[var(--mw-navy)] text-white ml-2">
                  {filteredChanges.length} changes
                </Badge>
              </div>
              <WorkstreamFilterPills value={workstreamFilter} onChange={setWorkstreamFilter} />
            </div>
          </CardHeader>
          <CardContent className="space-y-6 py-5">
            {/* Completions */}
            {completions.length > 0 && (
              <ChangeGroup
                title="Completions"
                icon={<CheckCircle2 className="w-4 h-4" />}
                borderColor="#0d9488"
                badgeColor="bg-teal-50 text-teal-700"
                changes={completions}
                renderChange={(c) => (
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-[var(--mw-text-primary)] text-sm">
                      {c.item_title}
                    </span>
                    <Badge className="bg-gray-100 text-gray-600 text-[10px]">
                      {c.category_name}
                    </Badge>
                    <ArrowRight className="w-3 h-3 text-gray-400" />
                    <Badge className="bg-teal-50 text-teal-700 text-[10px]">
                      Done
                    </Badge>
                  </div>
                )}
              />
            )}

            {/* New Risks / Blocks */}
            {newBlocks.length > 0 && (
              <ChangeGroup
                title="New Risks / Blocks"
                icon={<AlertOctagon className="w-4 h-4" />}
                borderColor="#ef4444"
                badgeColor="bg-red-50 text-red-700"
                changes={newBlocks}
                renderChange={(c) => (
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-[var(--mw-text-primary)] text-sm">
                      {c.item_title}
                    </span>
                    <Badge className="bg-gray-100 text-gray-600 text-[10px]">
                      {c.category_name}
                    </Badge>
                    <Badge className="bg-blue-50 text-blue-600 text-[10px]">
                      {getStatusLabel(c.old_value || "")}
                    </Badge>
                    <ArrowRight className="w-3 h-3 text-red-400" />
                    <Badge className="bg-red-50 text-red-700 text-[10px]">
                      {getStatusLabel(c.new_value || "")}
                    </Badge>
                  </div>
                )}
              />
            )}

            {/* ETA Slippages */}
            {etaSlippages.length > 0 && (
              <ChangeGroup
                title="ETA Slippages"
                icon={<AlertTriangle className="w-4 h-4" />}
                borderColor="#f59e0b"
                badgeColor="bg-amber-50 text-amber-700"
                changes={etaSlippages}
                renderChange={(c) => (
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-[var(--mw-text-primary)] text-sm">
                      {c.item_title}
                    </span>
                    <Badge className="bg-gray-100 text-gray-600 text-[10px]">
                      {c.category_name}
                    </Badge>
                    <span className="text-xs text-[var(--mw-text-secondary)]">
                      {formatDate(c.old_value)}
                    </span>
                    <ArrowRight className="w-3 h-3 text-amber-500" />
                    <span className="text-xs font-semibold text-amber-700">
                      {formatDate(c.new_value)}
                    </span>
                    <ArrowDownRight className="w-3 h-3 text-amber-500" />
                  </div>
                )}
              />
            )}

            {/* New Items */}
            {newItems.length > 0 && (
              <ChangeGroup
                title="New Items Added"
                icon={<Plus className="w-4 h-4" />}
                borderColor="var(--mw-purple)"
                badgeColor="bg-purple-50 text-purple-700"
                changes={newItems}
                renderChange={(c) => (
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-[var(--mw-text-primary)] text-sm">
                      {c.item_title}
                    </span>
                    <Badge className="bg-gray-100 text-gray-600 text-[10px]">
                      {c.category_name}
                    </Badge>
                    <Badge className="bg-purple-50 text-purple-700 text-[10px]">
                      New
                    </Badge>
                  </div>
                )}
              />
            )}

            {/* Status Updates */}
            {statusUpdates.length > 0 && (
              <ChangeGroup
                title="Status Updates"
                icon={<TrendingUp className="w-4 h-4" />}
                borderColor="#3b82f6"
                badgeColor="bg-blue-50 text-blue-700"
                changes={statusUpdates}
                renderChange={(c) => (
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-[var(--mw-text-primary)] text-sm">
                      {c.item_title}
                    </span>
                    <Badge className="bg-gray-100 text-gray-600 text-[10px]">
                      {c.category_name}
                    </Badge>
                    <Badge className="bg-gray-50 text-gray-500 text-[10px]">
                      {getStatusLabel(c.old_value || "")}
                    </Badge>
                    <ArrowRight className="w-3 h-3 text-blue-400" />
                    <Badge className="bg-blue-50 text-blue-700 text-[10px]">
                      {getStatusLabel(c.new_value || "")}
                    </Badge>
                  </div>
                )}
              />
            )}

            {filteredChanges.length === 0 && (
              <p className="text-center text-[var(--mw-text-secondary)] text-sm py-8">
                No changes recorded this week{workstreamFilter ? ` for ${workstreamFilter}` : ""}.
              </p>
            )}
          </CardContent>
        </Card>
      </section>

      {/* ─── 3. Service-wise Breakdown ───────────────────────────────────── */}
      <section>
        <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-[var(--mw-navy)]" />
            <h2 className="text-lg font-bold text-[var(--mw-navy)]">
              Service-wise Breakdown
            </h2>
          </div>
          <WorkstreamFilterPills value={workstreamFilter} onChange={setWorkstreamFilter} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {categoryBreakdown.map((cat) => {
            const pct = cat.total > 0 ? Math.round((cat.done / cat.total) * 100) : 0
            return (
              <Card key={cat.name} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => setDrawerCategory(cat.name)}>
                <CardContent className="py-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-[var(--mw-navy)]/5 flex items-center justify-center text-[var(--mw-navy)]">
                        {getCategoryIcon(cat.name)}
                      </div>
                      <h3 className="font-semibold text-[var(--mw-text-primary)] text-sm">
                        {cat.name}
                      </h3>
                    </div>
                    <span className="text-xs font-medium text-[var(--mw-text-secondary)]">
                      {pct}% done
                    </span>
                  </div>

                  <StackedBar
                    segments={[
                      { value: cat.done, color: "#0d9488", label: "Done" },
                      { value: cat.in_progress, color: "#3b82f6", label: "In Progress" },
                      { value: cat.blocked, color: "#ef4444", label: "Blocked" },
                      { value: cat.not_started, color: "#e5e7eb", label: "Not Started" },
                    ]}
                  />

                  <div className="flex gap-4 text-xs text-[var(--mw-text-secondary)]">
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-teal-500" />
                      {cat.done} done
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-blue-500" />
                      {cat.in_progress} active
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-gray-300" />
                      {cat.total} total
                    </span>
                  </div>

                  {/* Key items for this category */}
                  <div className="space-y-1.5 pt-1">
                    {cat.items
                      .filter((i) => i.status !== "done" && i.status !== "cancelled")
                      .slice(0, 4)
                      .map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center gap-2 text-xs"
                        >
                          <span
                            className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                            style={{ backgroundColor: getStatusDotColor(item.status) }}
                          />
                          <span className="text-[var(--mw-text-primary)] truncate flex-1">
                            {item.title}
                          </span>
                          <WorkstreamBadge workstream={item.workstream} />
                          <Badge
                            className={cn(
                              getStatusColor(item.status),
                              "text-[10px] px-1.5 py-0"
                            )}
                          >
                            {getStatusLabel(item.status)}
                          </Badge>
                        </div>
                      ))}
                    {cat.items.filter(
                      (i) => i.status !== "done" && i.status !== "cancelled"
                    ).length > 4 && (
                      <p className="text-[10px] text-[var(--mw-text-secondary)] pl-3">
                        +{" "}
                        {cat.items.filter(
                          (i) => i.status !== "done" && i.status !== "cancelled"
                        ).length - 4}{" "}
                        more items
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </section>

      {/* ─── 4. Visual Timeline / Gantt ──────────────────────────────────── */}
      <section>
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-[var(--mw-navy)]" />
              <h2 className="text-lg font-bold text-[var(--mw-navy)]">
                Timeline View
              </h2>
            </div>
            <div className="flex gap-4 mt-2">
              {[
                { color: "#0d9488", label: "Done" },
                { color: "#3b82f6", label: "In Progress" },
                { color: "#f59e0b", label: "Overdue" },
                { color: "#ef4444", label: "Blocked" },
                { color: "#94a3b8", label: "Not Started" },
              ].map((l) => (
                <span key={l.label} className="flex items-center gap-1.5 text-xs text-[var(--mw-text-secondary)]">
                  <span
                    className="w-3 h-2 rounded-sm"
                    style={{ backgroundColor: l.color }}
                  />
                  {l.label}
                </span>
              ))}
            </div>
          </CardHeader>
          <CardContent className="py-2 overflow-x-auto">
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
                            <div className="absolute hidden group-hover:block z-20 bg-white border border-gray-200 rounded-lg shadow-lg p-2 text-xs w-56 -top-2 pointer-events-none"
                              style={{ left: `${Math.min(pos + barWidth, 75)}%` }}>
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
          </CardContent>
        </Card>
      </section>

      {/* ─── 5. Action Items Due Next Week ───────────────────────────────── */}
      <section>
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Flame className="w-5 h-5 text-[var(--mw-coral)]" />
              <h2 className="text-lg font-bold text-[var(--mw-navy)]">
                Action Items Due Next 7 Days
              </h2>
              <Badge className="bg-[var(--mw-coral-light)] text-[var(--mw-coral)] ml-2">
                {dueNextWeek.length} items
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="py-2">
            {dueNextWeek.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="text-left py-3 px-3 text-xs font-semibold text-[var(--mw-text-secondary)] uppercase tracking-wider w-12">
                        #
                      </th>
                      <th className="text-left py-3 px-3 text-xs font-semibold text-[var(--mw-text-secondary)] uppercase tracking-wider">
                        Action Item
                      </th>
                      <th className="text-left py-3 px-3 text-xs font-semibold text-[var(--mw-text-secondary)] uppercase tracking-wider w-36">
                        Owner
                      </th>
                      <th className="text-left py-3 px-3 text-xs font-semibold text-[var(--mw-text-secondary)] uppercase tracking-wider w-28">
                        ETA
                      </th>
                      <th className="text-left py-3 px-3 text-xs font-semibold text-[var(--mw-text-secondary)] uppercase tracking-wider w-28">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {dueNextWeek.map((item, idx) => {
                      const days = getDaysUntil(item.eta)
                      const isUrgent = days !== null && days <= 2
                      return (
                        <tr
                          key={item.id}
                          className={cn(
                            "border-b border-gray-50 hover:bg-gray-50/50 transition-colors",
                            isUrgent && "bg-red-50/30"
                          )}
                        >
                          <td className="py-3 px-3 text-[var(--mw-text-secondary)] font-mono text-xs">
                            {item.item_number || idx + 1}
                          </td>
                          <td className="py-3 px-3">
                            <div>
                              <p className="font-medium text-[var(--mw-text-primary)] text-sm">
                                {item.title}
                              </p>
                              <p className="text-xs text-[var(--mw-text-secondary)] mt-0.5">
                                {item.category_name}
                              </p>
                            </div>
                          </td>
                          <td className="py-3 px-3 text-sm text-[var(--mw-text-primary)]">
                            {item.owner_name || "Unassigned"}
                          </td>
                          <td className="py-3 px-3">
                            <div className="flex items-center gap-1.5">
                              <span
                                className={cn(
                                  "text-sm",
                                  isUrgent
                                    ? "text-red-600 font-semibold"
                                    : "text-[var(--mw-text-primary)]"
                                )}
                              >
                                {formatDate(item.eta)}
                              </span>
                              {days !== null && days <= 2 && (
                                <span className="text-[10px] text-red-500 font-medium">
                                  ({days === 0 ? "today" : days === 1 ? "tomorrow" : `${days}d`})
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-3">
                            <Badge
                              className={cn(
                                getStatusColor(item.status),
                                "text-xs"
                              )}
                            >
                              {getStatusLabel(item.status)}
                            </Badge>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-center text-[var(--mw-text-secondary)] text-sm py-8">
                No items due in the next 7 days.
              </p>
            )}
          </CardContent>
        </Card>
      </section>
      {/* ─── Service Category Drawer ─────────────────────────────────── */}
      {drawerCategory !== null && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/40 z-40 transition-opacity duration-300"
            style={{ opacity: drawerCategory ? 1 : 0 }}
          />
          {/* Drawer */}
          <div
            ref={drawerRef}
            className="fixed top-0 right-0 h-full w-full max-w-[480px] bg-white z-50 shadow-2xl flex flex-col transition-transform duration-300 ease-out"
            style={{ transform: drawerCategory ? "translateX(0)" : "translateX(100%)" }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5 bg-[var(--mw-navy)] text-white flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                  {getCategoryIcon(drawerCategory)}
                </div>
                <h2 className="text-lg font-bold">{drawerCategory}</h2>
              </div>
              <button
                onClick={() => setDrawerCategory(null)}
                className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Progress */}
            {(() => {
              const cat = categoryBreakdown.find((c) => c.name === drawerCategory)
              if (!cat) return null
              const pct = cat.total > 0 ? Math.round((cat.done / cat.total) * 100) : 0
              return (
                <div className="px-6 py-4 border-b border-gray-100 flex-shrink-0">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-[var(--mw-text-primary)]">Progress</span>
                    <span className="text-sm font-bold text-[var(--mw-navy)]">{pct}%</span>
                  </div>
                  <div className="w-full h-2.5 rounded-full bg-gray-100 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-[var(--mw-teal)] transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <div className="flex gap-4 mt-2 text-xs text-[var(--mw-text-secondary)]">
                    <span>{cat.done} done</span>
                    <span>{cat.in_progress} in progress</span>
                    <span>{cat.blocked} blocked</span>
                    <span>{cat.not_started} not started</span>
                  </div>
                </div>
              )
            })()}

            {/* Items list */}
            <div className="flex-1 overflow-y-auto px-6 py-4">
              <div className="space-y-3">
                {categoryBreakdown
                  .find((c) => c.name === drawerCategory)
                  ?.items.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-xl border border-gray-100 p-3 hover:bg-gray-50/50 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-medium text-[var(--mw-text-primary)] flex-1">
                          {item.title}
                        </p>
                        <Badge
                          className={cn(getStatusColor(item.status), "text-[10px] flex-shrink-0")}
                        >
                          {getStatusLabel(item.status)}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 mt-2 flex-wrap">
                        <span className="text-xs text-[var(--mw-text-secondary)]">
                          {item.owner_name || "Unassigned"}
                        </span>
                        {item.eta && (
                          <span className="text-xs text-[var(--mw-text-secondary)] flex items-center gap-1">
                            <CalendarDays className="w-3 h-3" />
                            {formatDate(item.eta)}
                          </span>
                        )}
                        <WorkstreamBadge workstream={item.workstream} />
                      </div>
                    </div>
                  ))}
                {(!categoryBreakdown.find((c) => c.name === drawerCategory)?.items.length) && (
                  <p className="text-center text-[var(--mw-text-secondary)] text-sm py-8">
                    No items in this category.
                  </p>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

// ─── ChangeGroup sub-component ──────────────────────────────────────────────
function ChangeGroup({
  title,
  icon,
  borderColor,
  badgeColor,
  changes,
  renderChange,
}: {
  title: string
  icon: React.ReactNode
  borderColor: string
  badgeColor: string
  changes: StoredChange[]
  renderChange: (c: StoredChange) => React.ReactNode
}) {
  return (
    <div
      className="rounded-xl border border-gray-100 overflow-hidden"
      style={{ borderLeftWidth: "4px", borderLeftColor: borderColor }}
    >
      <div className="px-4 py-2.5 bg-gray-50/50 flex items-center gap-2">
        <span style={{ color: borderColor }}>{icon}</span>
        <span className="text-sm font-semibold text-[var(--mw-text-primary)]">
          {title}
        </span>
        <Badge className={cn(badgeColor, "text-[10px] ml-auto")}>
          {changes.length}
        </Badge>
      </div>
      <div className="divide-y divide-gray-50">
        {changes.map((c) => (
          <div key={c.id} className="px-4 py-2.5 hover:bg-gray-50/30 transition-colors">
            {renderChange(c)}
          </div>
        ))}
      </div>
    </div>
  )
}
