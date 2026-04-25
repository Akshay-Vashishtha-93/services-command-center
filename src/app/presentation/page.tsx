"use client"

import { useEffect, useState, useRef, useCallback, useMemo } from "react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import {
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  ArrowRight,
  Clock,
  XCircle,
  Plus,
  Minus,
  Image,
  Upload,
  Edit3,
  ChevronRight,
  Loader2,
  Calendar,
  Users,
  Target,
  BarChart3,
  Layers,
  MessageSquare,
  ListChecks,
  Camera,
  StickyNote,
  ArrowUpRight,
} from "lucide-react"

// ─── Types ───────────────────────────────────────────────────────────────────

type Stats = {
  total: number
  done: number
  in_progress: number
  not_started: number
  blocked: number
  overdue: number
  due_this_week: number
}

type StoredItem = {
  id: string
  title: string
  category_name: string
  status: string
  owner_name: string | null
  eta: string | null
  workstream: string | null
  details: string | null
  sheet_tab: string
}

type StoredChange = {
  id: string
  item_title: string
  category_name: string
  field_changed: string
  old_value: string
  new_value: string
  changed_at: string
}

type MeetingDecision = {
  id: string
  meeting_id: string
  text: string
  status: "aligned" | "needs_discussion"
}

type MeetingActionItem = {
  id: string
  meeting_id: string
  title: string
  description: string
  owner: string
  status: "pending" | "accepted" | "skipped" | "added_to_tracker"
  category_suggestion: string | null
}

type Meeting = {
  id: string
  title: string
  date: string
  transcript: string
  attendees: string[]
  created_at: string
}

type MeetingDetail = Meeting & {
  action_items: MeetingActionItem[]
  decisions: MeetingDecision[]
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getDateRange(): string {
  const now = new Date()
  const weekStart = new Date(now)
  weekStart.setDate(now.getDate() - now.getDay() + 1)
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekStart.getDate() + 4)
  const fmt = (d: Date) =>
    d.toLocaleDateString("en-GB", { day: "numeric", month: "short" })
  return `${fmt(weekStart)} - ${fmt(weekEnd)}, ${now.getFullYear()}`
}

function formatDateShort(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" })
}

// ─── SVG Ring Chart ──────────────────────────────────────────────────────────

function RingChart({
  value,
  total,
  color,
  size = 80,
  strokeWidth = 8,
}: {
  value: number
  total: number
  color: string
  size?: number
  strokeWidth?: number
}) {
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const pct = total > 0 ? value / total : 0
  const offset = circumference * (1 - pct)

  return (
    <svg width={size} height={size} className="transform -rotate-90">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="var(--mw-card-border)"
        strokeWidth={strokeWidth}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        className="transition-all duration-700 ease-out"
      />
    </svg>
  )
}

// ─── Slide Wrapper ───────────────────────────────────────────────────────────

function Slide({
  id,
  number,
  children,
  className,
  style,
}: {
  id: string
  number: number
  children: React.ReactNode
  className?: string
  style?: React.CSSProperties
}) {
  return (
    <section
      id={id}
      className={cn(
        "min-h-[calc(100vh-6rem)] w-full flex flex-col snap-start relative px-6 py-10 lg:px-12 lg:py-14",
        className
      )}
      style={style}
    >
      <span
        className="absolute top-4 right-4 text-xs font-bold opacity-30 select-none"
        style={{ color: "var(--mw-text-secondary)" }}
      >
        {String(number).padStart(2, "0")}
      </span>
      {children}
    </section>
  )
}

// ─── Service Gradient Placeholder ────────────────────────────────────────────

const SERVICE_GRADIENTS: Record<string, string> = {
  default: "linear-gradient(135deg, #003d6e 0%, #00897b 100%)",
  Brand: "linear-gradient(135deg, #e91e63 0%, #ff6f61 100%)",
  Tech: "linear-gradient(135deg, #003d6e 0%, #7c4dff 100%)",
  Design: "linear-gradient(135deg, #7c4dff 0%, #e91e63 100%)",
  Operations: "linear-gradient(135deg, #00897b 0%, #f59e0b 100%)",
  Marketing: "linear-gradient(135deg, #ff6f61 0%, #f59e0b 100%)",
  Content: "linear-gradient(135deg, #00897b 0%, #003d6e 100%)",
}

function getGradient(name: string): string {
  for (const key of Object.keys(SERVICE_GRADIENTS)) {
    if (name.toLowerCase().includes(key.toLowerCase())) return SERVICE_GRADIENTS[key]
  }
  return SERVICE_GRADIENTS.default
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function PresentationPage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [items, setItems] = useState<StoredItem[]>([])
  const [changes, setChanges] = useState<StoredChange[]>([])
  const [latestMeeting, setLatestMeeting] = useState<MeetingDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeSlide, setActiveSlide] = useState(0)

  // Manual notes (localStorage)
  const [massiNotes, setMassiNotes] = useState("")
  const [serviceNotes, setServiceNotes] = useState("")
  const [meetingType, setMeetingType] = useState<"ceo" | "internal">("ceo")

  // Screenshot uploads stored as data URLs keyed by service name
  const [screenshots, setScreenshots] = useState<Record<string, string>>({})

  const scrollRef = useRef<HTMLDivElement>(null)
  const slideRefs = useRef<(HTMLElement | null)[]>([])

  const SLIDE_COUNT = 7
  const SLIDE_IDS = useMemo(
    () => [
      "title",
      "recap",
      "progress",
      "changes",
      "services",
      "visuals",
      "next-steps",
    ],
    []
  )
  const SLIDE_LABELS = [
    "Title",
    "Recap",
    "Progress",
    "Changes",
    "Services",
    "Visuals",
    "Next Steps",
  ]

  // ── Data fetching ──────────────────────────────────────────────────────────

  useEffect(() => {
    async function load() {
      try {
        const [statsRes, itemsRes, changesRes, meetingsRes] = await Promise.all([
          fetch("/api/items/stats?tab=Services+Enhancement"),
          fetch("/api/items?tab=Services+Enhancement"),
          fetch("/api/items/changes?days=7"),
          fetch("/api/meetings"),
        ])

        if (statsRes.ok) setStats(await statsRes.json())
        if (itemsRes.ok) setItems(await itemsRes.json())
        if (changesRes.ok) setChanges(await changesRes.json())

        if (meetingsRes.ok) {
          const meetings: Meeting[] = await meetingsRes.json()
          if (meetings.length > 0) {
            const sorted = [...meetings].sort(
              (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
            )
            const detailRes = await fetch(`/api/meetings/${sorted[0].id}`)
            if (detailRes.ok) setLatestMeeting(await detailRes.json())
          }
        }
      } catch (e) {
        console.error("Failed to load presentation data:", e)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  // ── localStorage persistence ───────────────────────────────────────────────

  useEffect(() => {
    setMassiNotes(localStorage.getItem("pres-massi-notes") || "")
    setServiceNotes(localStorage.getItem("pres-service-notes") || "")
    setMeetingType(
      (localStorage.getItem("pres-meeting-type") as "ceo" | "internal") || "ceo"
    )
    try {
      const stored = localStorage.getItem("pres-screenshots")
      if (stored) setScreenshots(JSON.parse(stored))
    } catch {}
  }, [])

  useEffect(() => {
    localStorage.setItem("pres-massi-notes", massiNotes)
  }, [massiNotes])

  useEffect(() => {
    localStorage.setItem("pres-service-notes", serviceNotes)
  }, [serviceNotes])

  useEffect(() => {
    localStorage.setItem("pres-meeting-type", meetingType)
  }, [meetingType])

  useEffect(() => {
    localStorage.setItem("pres-screenshots", JSON.stringify(screenshots))
  }, [screenshots])

  // ── Scroll observer ────────────────────────────────────────────────────────

  useEffect(() => {
    const container = scrollRef.current
    if (!container) return

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const idx = SLIDE_IDS.indexOf(entry.target.id)
            if (idx !== -1) setActiveSlide(idx)
          }
        }
      },
      { root: container, threshold: 0.5 }
    )

    const sections = container.querySelectorAll("section[id]")
    sections.forEach((s) => observer.observe(s))
    return () => observer.disconnect()
  }, [loading, SLIDE_IDS])

  const scrollToSlide = useCallback((idx: number) => {
    const el = document.getElementById(
      ["title", "recap", "progress", "changes", "services", "visuals", "next-steps"][idx]
    )
    el?.scrollIntoView({ behavior: "smooth" })
  }, [])

  // ── Derived data ───────────────────────────────────────────────────────────

  const onTrackPct = useMemo(() => {
    if (!stats || stats.total === 0) return 0
    return Math.round(((stats.done + stats.in_progress) / stats.total) * 100)
  }, [stats])

  const changeGroups = useMemo(() => {
    const completions = changes.filter(
      (c) => c.field_changed === "status" && c.new_value === "done"
    )
    const newBlocks = changes.filter(
      (c) => c.field_changed === "status" && c.new_value === "blocked"
    )
    const etaChanges = changes.filter((c) => c.field_changed === "eta")
    const newItems = changes.filter((c) => c.field_changed === "status" && !c.old_value)
    return { completions, newBlocks, etaChanges, newItems }
  }, [changes])

  const categoryGroups = useMemo(() => {
    const map = new Map<string, StoredItem[]>()
    for (const item of items) {
      const list = map.get(item.category_name) || []
      list.push(item)
      map.set(item.category_name, list)
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]))
  }, [items])

  const activeServices = useMemo(() => {
    const names = new Set<string>()
    for (const c of changes) {
      names.add(c.category_name)
    }
    return Array.from(names).slice(0, 6)
  }, [changes])

  const dueNextWeek = useMemo(() => {
    const now = new Date()
    const nextWeek = new Date(now)
    nextWeek.setDate(now.getDate() + 7)
    return items.filter((item) => {
      if (!item.eta || item.status === "done") return false
      const eta = new Date(item.eta)
      return eta >= now && eta <= nextWeek
    })
  }, [items])

  // ── Screenshot upload handler ──────────────────────────────────────────────

  const handleImageUpload = useCallback(
    (serviceName: string) => {
      const input = document.createElement("input")
      input.type = "file"
      input.accept = "image/*"
      input.onchange = (e) => {
        const file = (e.target as HTMLInputElement).files?.[0]
        if (!file) return
        const reader = new FileReader()
        reader.onload = () => {
          setScreenshots((prev) => ({
            ...prev,
            [serviceName]: reader.result as string,
          }))
        }
        reader.readAsDataURL(file)
      }
      input.click()
    },
    []
  )

  // ── Loading state ──────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-6rem)]">
        <div className="flex flex-col items-center gap-4">
          <Loader2
            className="h-8 w-8 animate-spin"
            style={{ color: "var(--mw-pink)" }}
          />
          <span
            className="text-sm font-medium"
            style={{ color: "var(--mw-text-secondary)" }}
          >
            Preparing presentation...
          </span>
        </div>
      </div>
    )
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="relative h-[calc(100vh-3.5rem)] lg:h-screen">
      {/* Floating slide navigator */}
      <nav className="fixed right-4 top-1/2 -translate-y-1/2 z-50 hidden lg:flex flex-col items-center gap-2">
        {SLIDE_LABELS.map((label, idx) => (
          <button
            key={idx}
            onClick={() => scrollToSlide(idx)}
            className={cn(
              "group relative flex items-center justify-center transition-all duration-200",
              activeSlide === idx
                ? "w-3.5 h-3.5 rounded-full"
                : "w-2.5 h-2.5 rounded-full hover:w-3 hover:h-3"
            )}
            style={{
              backgroundColor:
                activeSlide === idx ? "var(--mw-pink)" : "var(--mw-card-border)",
            }}
            title={label}
          >
            <span className="absolute right-6 whitespace-nowrap text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity px-2 py-1 rounded-md bg-[var(--mw-navy)] text-white pointer-events-none">
              {label}
            </span>
          </button>
        ))}
      </nav>

      {/* Scrollable slide deck */}
      <div
        ref={scrollRef}
        className="h-full overflow-y-auto scroll-smooth"
        style={{ scrollSnapType: "y mandatory" }}
      >
        {/* ════════════════════════════════════════════════════════════════════
            SLIDE 1: Title
        ════════════════════════════════════════════════════════════════════ */}
        <Slide
          id="title"
          number={1}
          className="items-center justify-center text-center"
          style={{
            background:
              "linear-gradient(135deg, var(--mw-navy) 0%, #002a4e 60%, #001a33 100%)",
          }}
        >
          <div className="max-w-2xl mx-auto space-y-6">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 border border-white/10 text-white/70 text-xs font-medium tracking-wider uppercase">
              <Calendar className="h-3.5 w-3.5" />
              Week of {getDateRange()}
            </div>

            <h1 className="text-4xl lg:text-5xl font-extrabold text-white tracking-tight leading-tight">
              Services Weekly
              <br />
              <span style={{ color: "var(--mw-pink)" }}>Update</span>
            </h1>

            <div className="w-20 h-1 mx-auto rounded-full" style={{ backgroundColor: "var(--mw-pink)" }} />

            <p className="text-lg text-white/60 font-medium">
              Services Vertical — Weekly Briefing
            </p>

            <div className="flex items-center justify-center gap-6 pt-4 text-white/40 text-sm">
              {stats && (
                <>
                  <span className="flex items-center gap-1.5">
                    <Target className="h-4 w-4" />
                    {stats.total} Items
                  </span>
                  <span className="flex items-center gap-1.5">
                    <TrendingUp className="h-4 w-4" />
                    {onTrackPct}% On Track
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Layers className="h-4 w-4" />
                    {categoryGroups.length} Services
                  </span>
                </>
              )}
            </div>

            <button
              onClick={() => scrollToSlide(1)}
              className="inline-flex items-center gap-2 mt-8 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:gap-3"
              style={{ backgroundColor: "var(--mw-pink)" }}
            >
              View Presentation
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>

          {/* Decorative elements */}
          <div
            className="absolute bottom-0 left-0 right-0 h-px opacity-20"
            style={{ background: "linear-gradient(90deg, transparent, var(--mw-pink), transparent)" }}
          />
        </Slide>

        {/* ════════════════════════════════════════════════════════════════════
            SLIDE 2: Recap - Last Week's Discussion
        ════════════════════════════════════════════════════════════════════ */}
        <Slide id="recap" number={2} style={{ backgroundColor: "var(--mw-bg)" }}>
          <div className="max-w-5xl mx-auto w-full space-y-8">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <div
                  className="h-10 w-10 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: "var(--mw-purple-light)" }}
                >
                  <MessageSquare className="h-5 w-5" style={{ color: "var(--mw-purple)" }} />
                </div>
                <div>
                  <h2
                    className="text-2xl font-bold"
                    style={{ color: "var(--mw-text-primary)" }}
                  >
                    What We Discussed Last Time
                  </h2>
                  {latestMeeting && (
                    <p
                      className="text-sm mt-0.5"
                      style={{ color: "var(--mw-text-secondary)" }}
                    >
                      From: {latestMeeting.title} ({formatDateShort(latestMeeting.date)})
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Leadership Meeting Notes override */}
            {massiNotes && (
              <Card className="border-l-4" style={{ borderLeftColor: "var(--mw-pink)" }}>
                <CardContent className="py-4">
                  <div className="flex items-center gap-2 mb-2">
                    <StickyNote className="h-4 w-4" style={{ color: "var(--mw-pink)" }} />
                    <span className="text-sm font-semibold" style={{ color: "var(--mw-pink)" }}>
                      Leadership Meeting Notes
                    </span>
                  </div>
                  <p className="text-sm whitespace-pre-wrap" style={{ color: "var(--mw-text-primary)" }}>
                    {massiNotes}
                  </p>
                </CardContent>
              </Card>
            )}

            {latestMeeting ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Decisions */}
                <Card>
                  <CardHeader className="py-3">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-sm" style={{ color: "var(--mw-text-primary)" }}>
                        Key Decisions
                      </span>
                      <div className="flex gap-1.5">
                        <Badge className="bg-emerald-100 text-emerald-700">
                          {latestMeeting.decisions.filter((d) => d.status === "aligned").length} aligned
                        </Badge>
                        <Badge style={{ backgroundColor: "var(--mw-amber-light)", color: "#92400e" }}>
                          {latestMeeting.decisions.filter((d) => d.status === "needs_discussion").length} open
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3 max-h-80 overflow-y-auto">
                    {latestMeeting.decisions.length === 0 ? (
                      <p className="text-sm py-4 text-center" style={{ color: "var(--mw-text-secondary)" }}>
                        No decisions recorded
                      </p>
                    ) : (
                      latestMeeting.decisions.map((d) => (
                        <div
                          key={d.id}
                          className="rounded-lg p-3 flex items-start gap-2.5"
                          style={{
                            borderLeft: `3px solid ${d.status === "aligned" ? "var(--mw-teal)" : "var(--mw-amber)"}`,
                            backgroundColor: d.status === "aligned" ? "var(--mw-teal-light)" : "var(--mw-amber-light)",
                          }}
                        >
                          {d.status === "aligned" ? (
                            <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" style={{ color: "var(--mw-teal)" }} />
                          ) : (
                            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" style={{ color: "var(--mw-amber)" }} />
                          )}
                          <div>
                            <Badge
                              className={cn(
                                "mb-1 text-[10px]",
                                d.status === "aligned"
                                  ? "bg-emerald-200/60 text-emerald-800"
                                  : "bg-amber-200/60 text-amber-800"
                              )}
                            >
                              {d.status === "aligned" ? "Aligned" : "Needs Discussion"}
                            </Badge>
                            <p className="text-xs" style={{ color: "var(--mw-text-primary)" }}>
                              {d.text}
                            </p>
                          </div>
                        </div>
                      ))
                    )}
                  </CardContent>
                </Card>

                {/* Action Items */}
                <Card>
                  <CardHeader className="py-3">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-sm" style={{ color: "var(--mw-text-primary)" }}>
                        Action Items Assigned
                      </span>
                      <Badge style={{ backgroundColor: "var(--mw-teal-light)", color: "var(--mw-teal)" }}>
                        {latestMeeting.action_items.length} items
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2.5 max-h-80 overflow-y-auto">
                    {latestMeeting.action_items.length === 0 ? (
                      <p className="text-sm py-4 text-center" style={{ color: "var(--mw-text-secondary)" }}>
                        No action items recorded
                      </p>
                    ) : (
                      latestMeeting.action_items.map((a) => (
                        <div
                          key={a.id}
                          className="rounded-lg p-3 flex items-start gap-2.5 border"
                          style={{ borderColor: "var(--mw-card-border)" }}
                        >
                          <div
                            className={cn(
                              "h-5 w-5 rounded-full flex items-center justify-center shrink-0 mt-0.5",
                              a.status === "added_to_tracker"
                                ? "bg-emerald-100"
                                : a.status === "skipped"
                                  ? "bg-gray-100"
                                  : "bg-amber-100"
                            )}
                          >
                            {a.status === "added_to_tracker" ? (
                              <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                            ) : a.status === "skipped" ? (
                              <Minus className="h-3 w-3 text-gray-400" />
                            ) : (
                              <Clock className="h-3 w-3 text-amber-600" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-medium" style={{ color: "var(--mw-text-primary)" }}>
                              {a.title}
                            </p>
                            {a.owner && (
                              <p className="text-[10px] mt-0.5" style={{ color: "var(--mw-text-secondary)" }}>
                                Owner: {a.owner}
                              </p>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </CardContent>
                </Card>
              </div>
            ) : (
              <Card>
                <CardContent className="py-12 text-center">
                  <MessageSquare
                    className="h-10 w-10 mx-auto mb-3 opacity-30"
                    style={{ color: "var(--mw-text-secondary)" }}
                  />
                  <p className="text-sm" style={{ color: "var(--mw-text-secondary)" }}>
                    No previous meeting data available
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </Slide>

        {/* ════════════════════════════════════════════════════════════════════
            SLIDE 3: This Week's Progress
        ════════════════════════════════════════════════════════════════════ */}
        <Slide id="progress" number={3} className="bg-white">
          <div className="max-w-5xl mx-auto w-full space-y-10">
            <div className="flex items-center gap-3">
              <div
                className="h-10 w-10 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: "var(--mw-teal-light)" }}
              >
                <BarChart3 className="h-5 w-5" style={{ color: "var(--mw-teal)" }} />
              </div>
              <h2 className="text-2xl font-bold" style={{ color: "var(--mw-text-primary)" }}>
                This Week&apos;s Progress
              </h2>
            </div>

            {stats ? (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Completed */}
                <Card className="text-center p-6">
                  <div className="flex justify-center mb-4 relative">
                    <RingChart
                      value={stats.done}
                      total={stats.total}
                      color="var(--mw-teal)"
                    />
                    <span
                      className="absolute inset-0 flex items-center justify-center text-xl font-bold"
                      style={{ color: "var(--mw-teal)" }}
                    >
                      {stats.done}
                    </span>
                  </div>
                  <p className="text-sm font-semibold" style={{ color: "var(--mw-text-primary)" }}>
                    Completed
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: "var(--mw-text-secondary)" }}>
                    of {stats.total} total
                  </p>
                </Card>

                {/* In Progress */}
                <Card className="text-center p-6">
                  <div className="flex justify-center mb-4 relative">
                    <RingChart
                      value={stats.in_progress}
                      total={stats.total}
                      color="var(--mw-navy)"
                    />
                    <span
                      className="absolute inset-0 flex items-center justify-center text-xl font-bold"
                      style={{ color: "var(--mw-navy)" }}
                    >
                      {stats.in_progress}
                    </span>
                  </div>
                  <p className="text-sm font-semibold" style={{ color: "var(--mw-text-primary)" }}>
                    In Progress
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: "var(--mw-text-secondary)" }}>
                    actively worked on
                  </p>
                </Card>

                {/* Blocked */}
                <Card className="text-center p-6">
                  <div className="flex justify-center mb-4 relative">
                    <RingChart
                      value={stats.blocked}
                      total={stats.total}
                      color="var(--mw-coral)"
                    />
                    <span
                      className="absolute inset-0 flex items-center justify-center text-xl font-bold"
                      style={{ color: "var(--mw-coral)" }}
                    >
                      {stats.blocked}
                    </span>
                  </div>
                  <p className="text-sm font-semibold" style={{ color: "var(--mw-text-primary)" }}>
                    Blocked
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: "var(--mw-text-secondary)" }}>
                    need attention
                  </p>
                </Card>

                {/* On Track % */}
                <Card className="text-center p-6">
                  <div className="flex justify-center mb-4 relative">
                    <RingChart
                      value={onTrackPct}
                      total={100}
                      color="var(--mw-purple)"
                    />
                    <span
                      className="absolute inset-0 flex items-center justify-center text-xl font-bold"
                      style={{ color: "var(--mw-purple)" }}
                    >
                      {onTrackPct}%
                    </span>
                  </div>
                  <p className="text-sm font-semibold" style={{ color: "var(--mw-text-primary)" }}>
                    On Track
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: "var(--mw-text-secondary)" }}>
                    done + in progress
                  </p>
                </Card>
              </div>
            ) : (
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-sm" style={{ color: "var(--mw-text-secondary)" }}>
                    Stats unavailable
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Additional detail row */}
            {stats && (
              <div className="grid grid-cols-3 gap-4">
                <Card className="p-4 flex items-center gap-3">
                  <div
                    className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0"
                    style={{ backgroundColor: "var(--mw-coral-light)" }}
                  >
                    <AlertTriangle className="h-5 w-5" style={{ color: "var(--mw-coral)" }} />
                  </div>
                  <div>
                    <p className="text-lg font-bold" style={{ color: "var(--mw-coral)" }}>
                      {stats.overdue}
                    </p>
                    <p className="text-xs" style={{ color: "var(--mw-text-secondary)" }}>
                      Overdue Items
                    </p>
                  </div>
                </Card>
                <Card className="p-4 flex items-center gap-3">
                  <div
                    className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0"
                    style={{ backgroundColor: "var(--mw-amber-light)" }}
                  >
                    <Clock className="h-5 w-5" style={{ color: "var(--mw-amber)" }} />
                  </div>
                  <div>
                    <p className="text-lg font-bold" style={{ color: "var(--mw-amber)" }}>
                      {stats.due_this_week}
                    </p>
                    <p className="text-xs" style={{ color: "var(--mw-text-secondary)" }}>
                      Due This Week
                    </p>
                  </div>
                </Card>
                <Card className="p-4 flex items-center gap-3">
                  <div
                    className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0"
                    style={{ backgroundColor: "rgba(0,61,110,0.08)" }}
                  >
                    <Target className="h-5 w-5" style={{ color: "var(--mw-navy)" }} />
                  </div>
                  <div>
                    <p className="text-lg font-bold" style={{ color: "var(--mw-navy)" }}>
                      {stats.not_started}
                    </p>
                    <p className="text-xs" style={{ color: "var(--mw-text-secondary)" }}>
                      Not Started
                    </p>
                  </div>
                </Card>
              </div>
            )}
          </div>
        </Slide>

        {/* ════════════════════════════════════════════════════════════════════
            SLIDE 4: What Changed This Week
        ════════════════════════════════════════════════════════════════════ */}
        <Slide id="changes" number={4} style={{ backgroundColor: "var(--mw-bg)" }}>
          <div className="max-w-5xl mx-auto w-full space-y-8">
            <div className="flex items-center gap-3">
              <div
                className="h-10 w-10 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: "var(--mw-coral-light)" }}
              >
                <TrendingUp className="h-5 w-5" style={{ color: "var(--mw-coral)" }} />
              </div>
              <h2 className="text-2xl font-bold" style={{ color: "var(--mw-text-primary)" }}>
                What Changed This Week
              </h2>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Completions */}
              <Card>
                <CardHeader className="py-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4" style={{ color: "var(--mw-teal)" }} />
                    <span className="font-semibold text-sm" style={{ color: "var(--mw-text-primary)" }}>
                      Completions
                    </span>
                    <Badge className="ml-auto bg-emerald-100 text-emerald-700">
                      {changeGroups.completions.length}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2 max-h-52 overflow-y-auto">
                  {changeGroups.completions.length === 0 ? (
                    <p className="text-xs py-2 text-center" style={{ color: "var(--mw-text-secondary)" }}>
                      No completions this week
                    </p>
                  ) : (
                    changeGroups.completions.map((c) => (
                      <div
                        key={c.id}
                        className="rounded-lg p-2.5 flex items-center gap-2"
                        style={{ backgroundColor: "var(--mw-teal-light)" }}
                      >
                        <CheckCircle2 className="h-3.5 w-3.5 shrink-0" style={{ color: "var(--mw-teal)" }} />
                        <span className="text-xs font-medium truncate" style={{ color: "var(--mw-text-primary)" }}>
                          {c.item_title}
                        </span>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>

              {/* New Blocks */}
              <Card>
                <CardHeader className="py-3">
                  <div className="flex items-center gap-2">
                    <XCircle className="h-4 w-4" style={{ color: "var(--mw-coral)" }} />
                    <span className="font-semibold text-sm" style={{ color: "var(--mw-text-primary)" }}>
                      New Blocks
                    </span>
                    <Badge className="ml-auto" style={{ backgroundColor: "var(--mw-coral-light)", color: "var(--mw-coral)" }}>
                      {changeGroups.newBlocks.length}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2 max-h-52 overflow-y-auto">
                  {changeGroups.newBlocks.length === 0 ? (
                    <p className="text-xs py-2 text-center" style={{ color: "var(--mw-text-secondary)" }}>
                      No new blockers
                    </p>
                  ) : (
                    changeGroups.newBlocks.map((c) => (
                      <div
                        key={c.id}
                        className="rounded-lg p-2.5 flex items-center gap-2"
                        style={{ backgroundColor: "var(--mw-coral-light)" }}
                      >
                        <XCircle className="h-3.5 w-3.5 shrink-0" style={{ color: "var(--mw-coral)" }} />
                        <span className="text-xs font-medium truncate" style={{ color: "var(--mw-text-primary)" }}>
                          {c.item_title}
                        </span>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>

              {/* ETA Changes */}
              <Card>
                <CardHeader className="py-3">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4" style={{ color: "var(--mw-amber)" }} />
                    <span className="font-semibold text-sm" style={{ color: "var(--mw-text-primary)" }}>
                      ETA Changes
                    </span>
                    <Badge className="ml-auto" style={{ backgroundColor: "var(--mw-amber-light)", color: "#92400e" }}>
                      {changeGroups.etaChanges.length}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2 max-h-52 overflow-y-auto">
                  {changeGroups.etaChanges.length === 0 ? (
                    <p className="text-xs py-2 text-center" style={{ color: "var(--mw-text-secondary)" }}>
                      No ETA changes
                    </p>
                  ) : (
                    changeGroups.etaChanges.map((c) => (
                      <div
                        key={c.id}
                        className="rounded-lg p-2.5"
                        style={{ backgroundColor: "var(--mw-amber-light)" }}
                      >
                        <p className="text-xs font-medium truncate" style={{ color: "var(--mw-text-primary)" }}>
                          {c.item_title}
                        </p>
                        <div className="flex items-center gap-1.5 mt-1">
                          <span className="text-[10px] line-through" style={{ color: "var(--mw-text-secondary)" }}>
                            {c.old_value || "No date"}
                          </span>
                          <ArrowRight className="h-3 w-3" style={{ color: "var(--mw-amber)" }} />
                          <span className="text-[10px] font-semibold" style={{ color: "#92400e" }}>
                            {c.new_value || "No date"}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>

              {/* New Items */}
              <Card>
                <CardHeader className="py-3">
                  <div className="flex items-center gap-2">
                    <Plus className="h-4 w-4" style={{ color: "var(--mw-purple)" }} />
                    <span className="font-semibold text-sm" style={{ color: "var(--mw-text-primary)" }}>
                      New Items
                    </span>
                    <Badge className="ml-auto" style={{ backgroundColor: "var(--mw-purple-light)", color: "var(--mw-purple)" }}>
                      {changeGroups.newItems.length}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2 max-h-52 overflow-y-auto">
                  {changeGroups.newItems.length === 0 ? (
                    <p className="text-xs py-2 text-center" style={{ color: "var(--mw-text-secondary)" }}>
                      No new items added
                    </p>
                  ) : (
                    changeGroups.newItems.map((c) => (
                      <div
                        key={c.id}
                        className="rounded-lg p-2.5 flex items-center gap-2"
                        style={{ backgroundColor: "var(--mw-purple-light)" }}
                      >
                        <Plus className="h-3.5 w-3.5 shrink-0" style={{ color: "var(--mw-purple)" }} />
                        <div className="min-w-0">
                          <span className="text-xs font-medium truncate block" style={{ color: "var(--mw-text-primary)" }}>
                            {c.item_title}
                          </span>
                          <span className="text-[10px]" style={{ color: "var(--mw-text-secondary)" }}>
                            {c.category_name}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </Slide>

        {/* ════════════════════════════════════════════════════════════════════
            SLIDE 5: Service-wise Update
        ════════════════════════════════════════════════════════════════════ */}
        <Slide id="services" number={5} className="bg-white">
          <div className="max-w-5xl mx-auto w-full space-y-8">
            <div className="flex items-center gap-3">
              <div
                className="h-10 w-10 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: "rgba(0,61,110,0.08)" }}
              >
                <Layers className="h-5 w-5" style={{ color: "var(--mw-navy)" }} />
              </div>
              <h2 className="text-2xl font-bold" style={{ color: "var(--mw-text-primary)" }}>
                Service-wise Update
              </h2>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {categoryGroups.map(([catName, catItems]) => {
                const done = catItems.filter((i) => i.status === "done").length
                const total = catItems.length
                const pct = total > 0 ? Math.round((done / total) * 100) : 0

                // Group by workstream
                const workstreams = new Map<string, StoredItem[]>()
                for (const item of catItems) {
                  const ws = item.workstream || "General"
                  const list = workstreams.get(ws) || []
                  list.push(item)
                  workstreams.set(ws, list)
                }

                return (
                  <Card key={catName} className="overflow-hidden">
                    <CardHeader className="py-3">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-sm" style={{ color: "var(--mw-text-primary)" }}>
                          {catName}
                        </h3>
                        <span className="text-xs font-medium" style={{ color: "var(--mw-text-secondary)" }}>
                          {done}/{total} done
                        </span>
                      </div>
                      {/* Progress bar */}
                      <div className="mt-2 h-2 rounded-full overflow-hidden" style={{ backgroundColor: "var(--mw-card-border)" }}>
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${pct}%`,
                            backgroundColor: pct === 100 ? "var(--mw-teal)" : "var(--mw-navy)",
                          }}
                        />
                      </div>
                    </CardHeader>
                    <CardContent className="py-3 space-y-3 max-h-56 overflow-y-auto">
                      {Array.from(workstreams.entries()).map(([wsName, wsItems]) => (
                        <div key={wsName}>
                          <p
                            className="text-[10px] font-bold uppercase tracking-wider mb-1.5"
                            style={{ color: "var(--mw-text-secondary)" }}
                          >
                            {wsName}
                          </p>
                          <div className="space-y-1">
                            {wsItems.slice(0, 4).map((item) => (
                              <div
                                key={item.id}
                                className="flex items-center gap-2 text-xs"
                              >
                                <span
                                  className={cn(
                                    "h-1.5 w-1.5 rounded-full shrink-0",
                                    item.status === "done"
                                      ? "bg-emerald-500"
                                      : item.status === "in_progress"
                                        ? "bg-blue-500"
                                        : item.status === "blocked"
                                          ? "bg-red-500"
                                          : "bg-gray-300"
                                  )}
                                />
                                <span
                                  className="truncate"
                                  style={{ color: "var(--mw-text-primary)" }}
                                >
                                  {item.title}
                                </span>
                                {item.owner_name && (
                                  <span className="ml-auto text-[10px] shrink-0" style={{ color: "var(--mw-text-secondary)" }}>
                                    {item.owner_name}
                                  </span>
                                )}
                              </div>
                            ))}
                            {wsItems.length > 4 && (
                              <p className="text-[10px]" style={{ color: "var(--mw-text-secondary)" }}>
                                +{wsItems.length - 4} more
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )
              })}
            </div>

            {categoryGroups.length === 0 && (
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-sm" style={{ color: "var(--mw-text-secondary)" }}>
                    No service items found
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </Slide>

        {/* ════════════════════════════════════════════════════════════════════
            SLIDE 6: Feature Screenshots / Visuals
        ════════════════════════════════════════════════════════════════════ */}
        <Slide id="visuals" number={6} style={{ backgroundColor: "var(--mw-bg)" }}>
          <div className="max-w-5xl mx-auto w-full space-y-8">
            <div className="flex items-center gap-3">
              <div
                className="h-10 w-10 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: "var(--mw-pink-light)" }}
              >
                <Camera className="h-5 w-5" style={{ color: "var(--mw-pink)" }} />
              </div>
              <div>
                <h2 className="text-2xl font-bold" style={{ color: "var(--mw-text-primary)" }}>
                  Feature Screenshots
                </h2>
                <p className="text-sm" style={{ color: "var(--mw-text-secondary)" }}>
                  Services actively discussed this week
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {(activeServices.length > 0 ? activeServices : ["No active services"]).map(
                (serviceName) => {
                  const hasScreenshot = screenshots[serviceName]
                  if (serviceName === "No active services") {
                    return (
                      <Card key={serviceName} className="col-span-full">
                        <CardContent className="py-12 text-center">
                          <Camera className="h-10 w-10 mx-auto mb-3 opacity-30" style={{ color: "var(--mw-text-secondary)" }} />
                          <p className="text-sm" style={{ color: "var(--mw-text-secondary)" }}>
                            No services had changes this week. Screenshots will appear here once there is activity.
                          </p>
                        </CardContent>
                      </Card>
                    )
                  }

                  return (
                    <Card key={serviceName} className="overflow-hidden group">
                      {/* Image area */}
                      <div
                        className="relative h-40 flex items-center justify-center"
                        style={{
                          background: hasScreenshot ? undefined : getGradient(serviceName),
                        }}
                      >
                        {hasScreenshot ? (
                          <img
                            src={hasScreenshot}
                            alt={serviceName}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="text-center text-white/80">
                            <Image className="h-8 w-8 mx-auto mb-2 opacity-60" />
                            <p className="text-xs font-medium opacity-80">Preview</p>
                          </div>
                        )}

                        {/* Upload overlay */}
                        <button
                          onClick={() => handleImageUpload(serviceName)}
                          className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                        >
                          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/90 text-xs font-semibold" style={{ color: "var(--mw-navy)" }}>
                            <Upload className="h-3.5 w-3.5" />
                            Update Image
                          </div>
                        </button>
                      </div>

                      <CardContent className="py-3">
                        <p className="text-sm font-semibold" style={{ color: "var(--mw-text-primary)" }}>
                          {serviceName}
                        </p>
                        <p className="text-xs mt-0.5" style={{ color: "var(--mw-text-secondary)" }}>
                          {changes.filter((c) => c.category_name === serviceName).length} changes this week
                        </p>
                      </CardContent>
                    </Card>
                  )
                }
              )}
            </div>
          </div>
        </Slide>

        {/* ════════════════════════════════════════════════════════════════════
            SLIDE 7: Next Steps / Action Items
        ════════════════════════════════════════════════════════════════════ */}
        <Slide id="next-steps" number={7} style={{ backgroundColor: "var(--mw-bg)" }}>
          <div className="max-w-5xl mx-auto w-full space-y-8">
            <div className="flex items-center gap-3">
              <div
                className="h-10 w-10 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: "var(--mw-teal-light)" }}
              >
                <ListChecks className="h-5 w-5" style={{ color: "var(--mw-teal)" }} />
              </div>
              <h2 className="text-2xl font-bold" style={{ color: "var(--mw-text-primary)" }}>
                Next Steps &amp; Action Items
              </h2>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Due Next Week */}
              <Card>
                <CardHeader className="py-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4" style={{ color: "var(--mw-amber)" }} />
                      <span className="font-semibold text-sm" style={{ color: "var(--mw-text-primary)" }}>
                        Due in the Next 7 Days
                      </span>
                    </div>
                    <Badge style={{ backgroundColor: "var(--mw-amber-light)", color: "#92400e" }}>
                      {dueNextWeek.length}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2 max-h-72 overflow-y-auto">
                  {dueNextWeek.length === 0 ? (
                    <p className="text-xs py-4 text-center" style={{ color: "var(--mw-text-secondary)" }}>
                      No items due in the next week
                    </p>
                  ) : (
                    dueNextWeek.map((item) => (
                      <div
                        key={item.id}
                        className="rounded-lg p-3 flex items-center justify-between border"
                        style={{ borderColor: "var(--mw-card-border)" }}
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-medium truncate" style={{ color: "var(--mw-text-primary)" }}>
                            {item.title}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[10px]" style={{ color: "var(--mw-text-secondary)" }}>
                              {item.category_name}
                            </span>
                            {item.owner_name && (
                              <>
                                <span className="text-[10px]" style={{ color: "var(--mw-card-border)" }}>|</span>
                                <span className="text-[10px]" style={{ color: "var(--mw-text-secondary)" }}>
                                  {item.owner_name}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                        <Badge
                          className="shrink-0 ml-2"
                          style={{ backgroundColor: "var(--mw-amber-light)", color: "#92400e" }}
                        >
                          {item.eta ? formatDateShort(item.eta) : "No ETA"}
                        </Badge>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>

              {/* New Action Items from Meeting */}
              <Card>
                <CardHeader className="py-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ArrowUpRight className="h-4 w-4" style={{ color: "var(--mw-purple)" }} />
                      <span className="font-semibold text-sm" style={{ color: "var(--mw-text-primary)" }}>
                        New Action Items
                      </span>
                    </div>
                    <Badge style={{ backgroundColor: "var(--mw-purple-light)", color: "var(--mw-purple)" }}>
                      {latestMeeting?.action_items.filter((a) => a.status === "pending" || a.status === "added_to_tracker").length ?? 0}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2 max-h-72 overflow-y-auto">
                  {!latestMeeting || latestMeeting.action_items.length === 0 ? (
                    <p className="text-xs py-4 text-center" style={{ color: "var(--mw-text-secondary)" }}>
                      No new action items from the latest meeting
                    </p>
                  ) : (
                    latestMeeting.action_items
                      .filter((a) => a.status === "pending" || a.status === "added_to_tracker")
                      .map((a) => (
                        <div
                          key={a.id}
                          className="rounded-lg p-3 flex items-start gap-2.5 border"
                          style={{ borderColor: "var(--mw-card-border)" }}
                        >
                          <div
                            className={cn(
                              "h-5 w-5 rounded-full flex items-center justify-center shrink-0 mt-0.5",
                              a.status === "added_to_tracker" ? "bg-emerald-100" : "bg-amber-100"
                            )}
                          >
                            {a.status === "added_to_tracker" ? (
                              <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                            ) : (
                              <ChevronRight className="h-3 w-3 text-amber-600" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-medium" style={{ color: "var(--mw-text-primary)" }}>
                              {a.title}
                            </p>
                            {a.description && (
                              <p className="text-[10px] mt-0.5 line-clamp-2" style={{ color: "var(--mw-text-secondary)" }}>
                                {a.description}
                              </p>
                            )}
                            <div className="flex items-center gap-2 mt-1">
                              {a.owner && (
                                <Badge
                                  className="text-[10px]"
                                  style={{
                                    backgroundColor: "rgba(0,61,110,0.08)",
                                    color: "var(--mw-navy)",
                                  }}
                                >
                                  {a.owner}
                                </Badge>
                              )}
                              {a.category_suggestion && (
                                <Badge
                                  className="text-[10px]"
                                  style={{
                                    backgroundColor: "var(--mw-purple-light)",
                                    color: "var(--mw-purple)",
                                  }}
                                >
                                  {a.category_suggestion}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      ))
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Footer branding */}
            <div className="pt-8 text-center">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border" style={{ borderColor: "var(--mw-card-border)" }}>
                <span className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: "var(--mw-pink)" }} />
                <span className="text-xs font-medium" style={{ color: "var(--mw-text-secondary)" }}>
                  Mumzworld Services Command Center
                </span>
              </div>
            </div>
          </div>
        </Slide>
      </div>
    </div>
  )
}
