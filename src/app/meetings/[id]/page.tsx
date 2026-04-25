"use client"

import { useEffect, useState, use, useMemo } from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  ArrowLeft,
  Calendar,
  Users,
  CheckCircle2,
  XCircle,
  ChevronDown,
  ChevronRight,
  ListChecks,
  MessageSquare,
  Plus,
  SkipForward,
  AlertTriangle,
  FileText,
  Hash,
  Loader2,
} from "lucide-react"
import { cn } from "@/lib/utils"

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

type MeetingDetail = {
  id: string
  title: string
  date: string
  transcript: string
  attendees: string[]
  created_at: string
  action_items: MeetingActionItem[]
  decisions: MeetingDecision[]
}

const AVATAR_COLORS = [
  "var(--mw-pink)",
  "var(--mw-teal)",
  "var(--mw-purple)",
  "var(--mw-coral)",
  "var(--mw-amber)",
  "var(--mw-navy)",
]

function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)
}

function getAvatarColor(name: string): string {
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

function Avatar({ name, size = "md" }: { name: string; size?: "sm" | "md" }) {
  const initials = getInitials(name)
  const color = getAvatarColor(name)
  const dims = size === "sm" ? "h-7 w-7 text-[10px]" : "h-9 w-9 text-xs"

  return (
    <div
      className={cn(
        "rounded-full flex items-center justify-center font-semibold text-white shrink-0",
        dims
      )}
      style={{ backgroundColor: color }}
      title={name}
    >
      {initials}
    </div>
  )
}

function TranscriptContent({ transcript }: { transcript: string }) {
  const lines = transcript.split("\n")

  return (
    <div className="text-sm leading-relaxed space-y-1">
      {lines.map((line, i) => {
        const trimmed = line.trim()
        if (!trimmed) return <div key={i} className="h-3" />

        if (trimmed.startsWith("###")) {
          return (
            <h4
              key={i}
              className="font-semibold text-sm pt-3 pb-1"
              style={{ color: "var(--mw-navy)" }}
            >
              {trimmed.replace(/^#{1,4}\s*/, "")}
            </h4>
          )
        }
        if (trimmed.startsWith("##")) {
          return (
            <h3
              key={i}
              className="font-bold text-base pt-4 pb-1"
              style={{ color: "var(--mw-navy)" }}
            >
              {trimmed.replace(/^#{1,4}\s*/, "")}
            </h3>
          )
        }
        if (trimmed.startsWith("#")) {
          return (
            <h2
              key={i}
              className="font-bold text-lg pt-4 pb-2"
              style={{ color: "var(--mw-navy)" }}
            >
              {trimmed.replace(/^#{1,4}\s*/, "")}
            </h2>
          )
        }

        if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
          return (
            <div key={i} className="flex gap-2 pl-4" style={{ color: "var(--mw-text-secondary)" }}>
              <span className="shrink-0" style={{ color: "var(--mw-teal)" }}>
                &bull;
              </span>
              <span>{trimmed.slice(2)}</span>
            </div>
          )
        }

        return (
          <p key={i} style={{ color: "var(--mw-text-secondary)" }}>
            {trimmed}
          </p>
        )
      })}
    </div>
  )
}

export default function MeetingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const [meeting, setMeeting] = useState<MeetingDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [transcriptOpen, setTranscriptOpen] = useState(false)
  const [processingItems, setProcessingItems] = useState<Set<string>>(new Set())

  useEffect(() => {
    fetch(`/api/meetings/${id}`)
      .then((res) => {
        if (!res.ok) throw new Error("Not found")
        return res.json()
      })
      .then((data) => {
        setMeeting(data)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [id])

  const transcriptStats = useMemo(() => {
    if (!meeting?.transcript) return { chars: 0, sections: 0 }
    const chars = meeting.transcript.length
    const sections = (meeting.transcript.match(/^#{1,4}\s+/gm) || []).length
    return { chars, sections }
  }, [meeting?.transcript])

  async function handleAccept(item: MeetingActionItem) {
    setProcessingItems((prev) => new Set(prev).add(item.id))

    try {
      const res = await fetch(`/api/meetings/${id}/actions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: item.title,
          category_name: item.category_suggestion || "Uncategorized",
          category_slug: item.category_suggestion || "uncategorized",
          owner_name: item.owner,
          priority: null,
          eta: null,
          details: item.description,
          meeting_id: id,
          action_item_id: item.id,
        }),
      })

      if (res.ok) {
        setMeeting((prev) => {
          if (!prev) return prev
          return {
            ...prev,
            action_items: prev.action_items.map((a) =>
              a.id === item.id ? { ...a, status: "added_to_tracker" as const } : a
            ),
          }
        })
      }
    } finally {
      setProcessingItems((prev) => {
        const next = new Set(prev)
        next.delete(item.id)
        return next
      })
    }
  }

  async function handleSkip(item: MeetingActionItem) {
    setProcessingItems((prev) => new Set(prev).add(item.id))

    try {
      const res = await fetch(`/api/meetings/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action_item_id: item.id,
          status: "skipped",
        }),
      })

      if (res.ok) {
        setMeeting((prev) => {
          if (!prev) return prev
          return {
            ...prev,
            action_items: prev.action_items.map((a) =>
              a.id === item.id ? { ...a, status: "skipped" as const } : a
            ),
          }
        })
      }
    } finally {
      setProcessingItems((prev) => {
        const next = new Set(prev)
        next.delete(item.id)
        return next
      })
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin" style={{ color: "var(--mw-pink)" }} />
        <span className="ml-3 text-sm" style={{ color: "var(--mw-text-secondary)" }}>
          Loading meeting...
        </span>
      </div>
    )
  }

  if (!meeting) {
    return (
      <div className="text-center py-20 max-w-4xl mx-auto">
        <div
          className="inline-flex items-center justify-center h-16 w-16 rounded-full mb-4"
          style={{ backgroundColor: "var(--mw-pink-light)" }}
        >
          <FileText className="h-8 w-8" style={{ color: "var(--mw-pink)" }} />
        </div>
        <p className="text-lg font-medium" style={{ color: "var(--mw-text-primary)" }}>
          Meeting not found
        </p>
        <p className="text-sm mt-1" style={{ color: "var(--mw-text-secondary)" }}>
          This meeting may have been removed or the link may be invalid.
        </p>
        <Link
          href="/meetings"
          className="inline-flex items-center gap-1.5 mt-6 text-sm font-medium transition hover:opacity-80"
          style={{ color: "var(--mw-pink)" }}
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Meetings
        </Link>
      </div>
    )
  }

  const pendingItems = meeting.action_items.filter(
    (a) => a.status === "pending"
  )
  const processedItems = meeting.action_items.filter(
    (a) => a.status !== "pending"
  )
  const alignedCount = meeting.decisions.filter((d) => d.status === "aligned").length
  const discussionCount = meeting.decisions.filter((d) => d.status === "needs_discussion").length

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto space-y-8">
      {/* Back Link */}
      <Link
        href="/meetings"
        className="inline-flex items-center gap-1.5 text-sm font-medium transition hover:opacity-80"
        style={{ color: "var(--mw-text-secondary)" }}
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Meetings
      </Link>

      {/* Meeting Header */}
      <Card className="overflow-hidden">
        <div
          className="px-6 py-5"
          style={{
            background: "linear-gradient(135deg, var(--mw-navy) 0%, var(--mw-navy-light) 100%)",
          }}
        >
          <h1 className="text-2xl font-bold text-white">{meeting.title}</h1>

          <div className="flex flex-wrap items-center gap-4 mt-3">
            <span className="inline-flex items-center gap-1.5 text-sm text-white/80">
              <Calendar className="h-4 w-4" />
              {meeting.date}
            </span>
          </div>

          {/* Attendee Avatars */}
          {meeting.attendees.length > 0 && (
            <div className="flex items-center gap-2 mt-4">
              <div className="flex -space-x-2">
                {meeting.attendees.map((name) => (
                  <div
                    key={name}
                    className="ring-2 ring-[var(--mw-navy)] rounded-full"
                  >
                    <Avatar name={name} />
                  </div>
                ))}
              </div>
              <span className="text-sm text-white/70 ml-2">
                {meeting.attendees.length} attendee{meeting.attendees.length !== 1 ? "s" : ""}
              </span>
            </div>
          )}
        </div>

        {/* Stats Row */}
        <div className="px-6 py-3 flex flex-wrap items-center gap-6 text-sm" style={{ borderTop: "1px solid var(--mw-card-border)" }}>
          <div className="flex items-center gap-2">
            <div
              className="h-8 w-8 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: "var(--mw-purple-light)" }}
            >
              <MessageSquare className="h-4 w-4" style={{ color: "var(--mw-purple)" }} />
            </div>
            <div>
              <span className="font-semibold" style={{ color: "var(--mw-text-primary)" }}>
                {meeting.decisions.length}
              </span>
              <span className="ml-1" style={{ color: "var(--mw-text-secondary)" }}>
                decision{meeting.decisions.length !== 1 ? "s" : ""}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div
              className="h-8 w-8 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: "var(--mw-teal-light)" }}
            >
              <ListChecks className="h-4 w-4" style={{ color: "var(--mw-teal)" }} />
            </div>
            <div>
              <span className="font-semibold" style={{ color: "var(--mw-text-primary)" }}>
                {meeting.action_items.length}
              </span>
              <span className="ml-1" style={{ color: "var(--mw-text-secondary)" }}>
                action item{meeting.action_items.length !== 1 ? "s" : ""}
              </span>
            </div>
          </div>

          {pendingItems.length > 0 && (
            <div className="flex items-center gap-2">
              <div
                className="h-8 w-8 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: "var(--mw-amber-light)" }}
              >
                <AlertTriangle className="h-4 w-4" style={{ color: "var(--mw-amber)" }} />
              </div>
              <div>
                <span className="font-semibold" style={{ color: "var(--mw-text-primary)" }}>
                  {pendingItems.length}
                </span>
                <span className="ml-1" style={{ color: "var(--mw-text-secondary)" }}>
                  pending
                </span>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Decisions Section */}
      <Card className="rounded-xl">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div
                className="h-8 w-8 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: "var(--mw-purple-light)" }}
              >
                <MessageSquare className="h-4 w-4" style={{ color: "var(--mw-purple)" }} />
              </div>
              <h2 className="text-lg font-semibold" style={{ color: "var(--mw-text-primary)" }}>
                Decisions
              </h2>
            </div>
            <div className="flex items-center gap-2">
              {alignedCount > 0 && (
                <Badge className="bg-emerald-100 text-emerald-700">
                  {alignedCount} aligned
                </Badge>
              )}
              {discussionCount > 0 && (
                <Badge style={{ backgroundColor: "var(--mw-amber-light)", color: "#92400e" }}>
                  {discussionCount} needs discussion
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {meeting.decisions.length === 0 ? (
            <div className="text-center py-6">
              <div
                className="inline-flex items-center justify-center h-12 w-12 rounded-full mb-3"
                style={{ backgroundColor: "var(--mw-purple-light)" }}
              >
                <MessageSquare className="h-5 w-5" style={{ color: "var(--mw-purple)" }} />
              </div>
              <p className="text-sm font-medium" style={{ color: "var(--mw-text-primary)" }}>
                No decisions extracted
              </p>
              <p className="text-xs mt-1 max-w-sm mx-auto" style={{ color: "var(--mw-text-secondary)" }}>
                Decisions are extracted from transcript sections marked with ### headers.
                Ensure the transcript uses markdown-style headings for best results.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {meeting.decisions.map((decision) => {
                const isAligned = decision.status === "aligned"
                return (
                  <div
                    key={decision.id}
                    className="rounded-xl p-4 flex items-start gap-3"
                    style={{
                      borderLeft: `4px solid ${isAligned ? "var(--mw-teal)" : "var(--mw-amber)"}`,
                      backgroundColor: isAligned ? "var(--mw-teal-light)" : "var(--mw-amber-light)",
                    }}
                  >
                    {isAligned ? (
                      <CheckCircle2
                        className="h-5 w-5 shrink-0 mt-0.5"
                        style={{ color: "var(--mw-teal)" }}
                      />
                    ) : (
                      <AlertTriangle
                        className="h-5 w-5 shrink-0 mt-0.5"
                        style={{ color: "var(--mw-amber)" }}
                      />
                    )}
                    <div className="min-w-0">
                      <Badge
                        className={cn(
                          "mb-1.5",
                          isAligned
                            ? "bg-emerald-200/60 text-emerald-800"
                            : "bg-amber-200/60 text-amber-800"
                        )}
                      >
                        {isAligned ? "Aligned" : "Needs Discussion"}
                      </Badge>
                      <p className="text-sm" style={{ color: "var(--mw-text-primary)" }}>
                        {decision.text}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Action Items Section */}
      <Card className="rounded-xl">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div
                className="h-8 w-8 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: "var(--mw-teal-light)" }}
              >
                <ListChecks className="h-4 w-4" style={{ color: "var(--mw-teal)" }} />
              </div>
              <h2 className="text-lg font-semibold" style={{ color: "var(--mw-text-primary)" }}>
                Action Items
              </h2>
            </div>
            <Badge style={{ backgroundColor: "var(--mw-teal-light)", color: "var(--mw-teal)" }}>
              {meeting.action_items.length} total
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {meeting.action_items.length === 0 ? (
            <div className="text-center py-6">
              <div
                className="inline-flex items-center justify-center h-12 w-12 rounded-full mb-3"
                style={{ backgroundColor: "var(--mw-teal-light)" }}
              >
                <ListChecks className="h-5 w-5" style={{ color: "var(--mw-teal)" }} />
              </div>
              <p className="text-sm font-medium" style={{ color: "var(--mw-text-primary)" }}>
                No action items extracted
              </p>
              <p className="text-xs mt-1" style={{ color: "var(--mw-text-secondary)" }}>
                Action items will appear here once extracted from the transcript.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Pending items */}
              {pendingItems.length > 0 && (
                <div className="space-y-3">
                  {pendingItems.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-xl border p-4 space-y-3 transition-shadow hover:shadow-md"
                      style={{ borderColor: "var(--mw-card-border)" }}
                    >
                      <div className="flex items-start gap-3">
                        {item.owner && <Avatar name={item.owner} />}
                        <div className="space-y-1.5 min-w-0 flex-1">
                          <h4 className="font-medium" style={{ color: "var(--mw-text-primary)" }}>
                            {item.title}
                          </h4>
                          <p className="text-sm" style={{ color: "var(--mw-text-secondary)" }}>
                            {item.description}
                          </p>
                          <div className="flex flex-wrap items-center gap-2 pt-1">
                            {item.owner && (
                              <span
                                className="text-xs font-medium"
                                style={{ color: "var(--mw-text-secondary)" }}
                              >
                                {item.owner}
                              </span>
                            )}
                            {item.category_suggestion && (
                              <Badge
                                style={{
                                  backgroundColor: "var(--mw-purple-light)",
                                  color: "var(--mw-purple)",
                                }}
                              >
                                {item.category_suggestion}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 pl-12">
                        <button
                          onClick={() => handleAccept(item)}
                          disabled={processingItems.has(item.id)}
                          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white transition disabled:opacity-50 hover:opacity-90"
                          style={{ backgroundColor: "var(--mw-pink)" }}
                        >
                          {processingItems.has(item.id) ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Plus className="h-3.5 w-3.5" />
                          )}
                          Accept & Add to Tracker
                        </button>
                        <button
                          onClick={() => handleSkip(item)}
                          disabled={processingItems.has(item.id)}
                          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition disabled:opacity-50 hover:opacity-80"
                          style={{
                            backgroundColor: "var(--mw-bg)",
                            color: "var(--mw-text-secondary)",
                            border: "1px solid var(--mw-card-border)",
                          }}
                        >
                          <SkipForward className="h-3.5 w-3.5" />
                          Skip
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Visual Separator */}
              {pendingItems.length > 0 && processedItems.length > 0 && (
                <div className="flex items-center gap-3 pt-2">
                  <div className="flex-1 h-px" style={{ backgroundColor: "var(--mw-card-border)" }} />
                  <span
                    className="text-xs font-semibold uppercase tracking-wider"
                    style={{ color: "var(--mw-text-secondary)" }}
                  >
                    Processed
                  </span>
                  <div className="flex-1 h-px" style={{ backgroundColor: "var(--mw-card-border)" }} />
                </div>
              )}

              {/* Processed items */}
              {processedItems.length > 0 && (
                <div className="space-y-2">
                  {processedItems.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-xl px-4 py-3 flex items-center justify-between gap-4"
                      style={{ backgroundColor: "var(--mw-bg)" }}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {item.status === "added_to_tracker" ? (
                          <CheckCircle2
                            className="h-5 w-5 shrink-0"
                            style={{ color: "var(--mw-teal)" }}
                          />
                        ) : (
                          <XCircle
                            className="h-5 w-5 shrink-0"
                            style={{ color: "var(--mw-text-secondary)" }}
                          />
                        )}
                        <span
                          className="text-sm truncate"
                          style={{ color: "var(--mw-text-secondary)" }}
                        >
                          {item.title}
                        </span>
                      </div>
                      <Badge
                        className="shrink-0"
                        style={
                          item.status === "added_to_tracker"
                            ? {
                                backgroundColor: "var(--mw-teal-light)",
                                color: "var(--mw-teal)",
                              }
                            : {
                                backgroundColor: "var(--mw-bg)",
                                color: "var(--mw-text-secondary)",
                                border: "1px solid var(--mw-card-border)",
                              }
                        }
                      >
                        {item.status === "added_to_tracker"
                          ? "Added to Tracker"
                          : "Skipped"}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Full Transcript Section */}
      {meeting.transcript && (
        <Card className="rounded-xl overflow-hidden">
          <div
            className="px-6 py-4 cursor-pointer select-none transition-colors hover:bg-[var(--mw-bg)]"
            style={{ borderBottom: transcriptOpen ? "1px solid var(--mw-card-border)" : "none" }}
            onClick={() => setTranscriptOpen(!transcriptOpen)}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div
                  className="h-8 w-8 rounded-lg flex items-center justify-center relative"
                  style={{ backgroundColor: "rgba(0,61,110,0.1)" }}
                >
                  <FileText className="h-4 w-4" style={{ color: "var(--mw-navy)" }} />
                </div>
                <h2 className="text-lg font-semibold" style={{ color: "var(--mw-text-primary)" }}>
                  Full Transcript
                </h2>
              </div>
              <div className="flex items-center gap-3">
                <div className="hidden sm:flex items-center gap-3 text-xs" style={{ color: "var(--mw-text-secondary)" }}>
                  <span className="inline-flex items-center gap-1">
                    <Hash className="h-3 w-3" />
                    {transcriptStats.sections} section{transcriptStats.sections !== 1 ? "s" : ""} detected
                  </span>
                  <span>
                    {transcriptStats.chars.toLocaleString()} chars
                  </span>
                </div>
                <div
                  className="h-7 w-7 rounded-lg flex items-center justify-center transition-transform"
                  style={{ backgroundColor: "var(--mw-bg)" }}
                >
                  {transcriptOpen ? (
                    <ChevronDown className="h-4 w-4" style={{ color: "var(--mw-text-secondary)" }} />
                  ) : (
                    <ChevronRight className="h-4 w-4" style={{ color: "var(--mw-text-secondary)" }} />
                  )}
                </div>
              </div>
            </div>
          </div>
          <div
            className={cn(
              "transition-all duration-300 ease-in-out overflow-hidden",
              transcriptOpen ? "max-h-[5000px] opacity-100" : "max-h-0 opacity-0"
            )}
          >
            <CardContent className="py-6">
              <TranscriptContent transcript={meeting.transcript} />
            </CardContent>
          </div>
        </Card>
      )}
    </div>
  )
}
